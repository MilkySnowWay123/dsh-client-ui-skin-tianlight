import { Readable, Writable } from 'node:stream'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { fileURLToPath, pathToFileURL } from 'node:url'
import assert from 'node:assert/strict'
import { dirname, join } from 'node:path'
import { DSH_COMPAT_MUST_MATCH, DSH_COMPAT_MUST_NOT_MATCH, DSH_COMPAT_RANGE, OFFICIAL_PEER_PACKAGES, satisfies } from './compat.mjs'

const PKG = dirname(dirname(fileURLToPath(import.meta.url)))
/** Read the expected host build from package.json so a version bump cannot leave
 *  the handshake assertion pinned to an old value. */
const PKG_VERSION = JSON.parse(readFileSync(join(PKG, 'package.json'), 'utf8')).version
/** Package identity: npm name on v2.0.2+; every identity surface must agree or the
 *  profile's bundle resolution (patch insert name) and the client module id drift. */
const PKG_NAME = JSON.parse(readFileSync(join(PKG, 'package.json'), 'utf8')).name

// ---------- R7: deterministic environment + no plugin-tree writes ----------
// The host half probes `ffmpeg -version` lazily. Without pinning it, a machine that
// happens to have ffmpeg turns the "no ffmpeg" assertions red AND lets the transcode
// POST really spawn ffmpeg and write assets/derived/bg-4k.h264.mp4 into this repo.
// Pin the probe to a path that cannot exist before the host module is imported, so
// verify behaves identically on every machine (this truthfully exercises the 501
// degradation path without touching the working tree).
const ORIGINAL_FFMPEG_PATH = process.env.FFMPEG_PATH
const FORCED_FFMPEG = join(tmpdir(), 'tl-verify-no-ffmpeg-' + process.pid, 'ffmpeg-must-not-exist')
process.env.FFMPEG_PATH = FORCED_FFMPEG

/**
 * Snapshot the parts of the plugin tree a route could conceivably write
 * (defaults, user uploads, transcode derivatives). Only names/sizes/mtimes are
 * recorded: the shipped 4K videos stay untouched and this stays fast.
 */
const WATCHED_TREES = ['assets', join('assets', 'uploads'), join('assets', 'derived')]
function snapshotTree() {
  const snapshot = new Map()
  const visit = (abs, rel) => {
    let entries = []
    try {
      entries = readdirSync(abs, { withFileTypes: true })
    } catch {
      return
    }
    entries.sort((a, b) => a.name.localeCompare(b.name))
    for (const entry of entries) {
      const childAbs = join(abs, entry.name)
      const childRel = rel + '/' + entry.name
      let stat = null
      try {
        stat = statSync(childAbs)
      } catch {
        continue
      }
      snapshot.set(childRel, entry.isDirectory() ? 'dir' : String(stat.size) + ':' + String(stat.mtimeMs))
      if (entry.isDirectory()) visit(childAbs, childRel)
    }
  }
  for (const rel of WATCHED_TREES) visit(join(PKG, rel), rel)
  return snapshot
}
function diffTrees(before, after) {
  const changes = []
  for (const [path, signature] of before) {
    if (after.has(path) === false) changes.push('removed ' + path)
    else if (after.get(path) !== signature) changes.push('changed ' + path)
  }
  for (const path of after.keys()) if (before.has(path) === false) changes.push('added ' + path)
  return changes
}
const TREE_BEFORE = snapshotTree()
let failures = 0
const check = (label, fn) => {
  try {
    const r = fn()
    if (r instanceof Promise) throw new Error('async test not awaited')
    console.log('PASS  ' + label)
  } catch (error) {
    failures += 1
    console.log('FAIL  ' + label + ' :: ' + error.message)
  }
}

// ---------- host half: route behavior ----------
const host = await import(pathToFileURL(PKG + '/lib/index.js').href)
assert.equal(typeof host.apply, 'function', 'host apply must be exported')

let handler = null
const carrier = { register: (route) => { handler = route.handler; return () => {} } }
const fakeCtx = {
  get: (name) => (name === 'webServer' ? carrier : undefined),
  webServer: carrier,
  effect: (fn) => { const d = fn(); return typeof d === 'function' ? d : () => {} },
  inject: (_deps, cb) => cb(fakeCtx),
}
host.apply(fakeCtx)
assert.equal(typeof handler, 'function', 'route handler must be registered')

/**
 * Drive the prefix route with a minimal real-shaped request. `body` is optional:
 * v0.5.1 write endpoints (settings/import/frame-cache) read the stream, so the fake
 * request has to be an EventEmitter that emits data/end after the handler attached
 * its listeners.
 */
function call(method, url, headers = {}, body = null) {
  const chunks = []
  const res = new Writable({
    write(chunk, _enc, cb) { chunks.push(chunk); cb() },
  })
  res.writeHead = (status, hdrs) => { res.status = status; res.headers = hdrs ?? {} }
  res.setHeader = (name, value) => { res.headers = { ...(res.headers ?? {}), [String(name).toLowerCase()]: value } }
  // A real Readable: v0.5.1 import routes pipe the request through gunzip, and the
  // JSON write routes consume it with on('data')/on('end'). Readable.from covers
  // both shapes (it starts flowing when a data listener or pipe attaches).
  const req = Readable.from(body === null ? [] : [Buffer.isBuffer(body) ? body : Buffer.from(String(body))])
  req.method = method
  req.url = url
  req.headers = { ...headers }
  if (body !== null) req.headers['content-length'] = String(Buffer.byteLength(body))
  handler(req, res)
  return new Promise((resolve) => {
    res.on('finish', () => resolve({ status: res.status, headers: res.headers ?? {}, body: Buffer.concat(chunks) }))
    setTimeout(() => resolve({ status: res.status, headers: res.headers ?? {}, body: Buffer.concat(chunks), timeout: true }), 4000)
  })
}

const manifest = await call('GET', '/skin-tianlight/_manifest')
check('manifest 200 + asset list', () => {
  assert.equal(manifest.status, 200)
  const value = JSON.parse(manifest.body.toString('utf8'))
  assert.ok(Array.isArray(value.assets), 'assets must be an array')
})

// ---------- v2.0.1: exact build fingerprint route ----------
const fingerprintResponse = await call('GET', '/skin-tianlight/_fingerprint')
check('v2.0.1 fingerprint reports the exact installed build', () => {
  assert.equal(fingerprintResponse.status, 200)
  const value = JSON.parse(fingerprintResponse.body.toString('utf8'))
  assert.equal(value.schema, 1)
  assert.equal(value.version, PKG_VERSION, 'fingerprint version must be the packaged version')
  assert.equal(value.hostApi, '2', 'fingerprint must report the HOST_API contract')
  assert.match(value.clientSha256, /^[0-9a-f]{64}$/, 'client sha256 must be a full digest')
  assert.equal(value.clientShort, value.clientSha256.slice(0, 12))
  assert.equal(typeof value.line, 'string')
  assert.ok(value.line.includes(PKG_VERSION) && value.line.includes(value.clientShort), 'one-line form carries version + client digest')
  assert.ok(['local-link', 'tarball', 'git', 'registry', 'unknown'].includes(value.installMethod), 'install method must be classified')
  assert.ok(value.dshVersion === null || typeof value.dshVersion === 'string', 'DSH version is a string when the host exposes profileContext')
  assert.ok(JSON.stringify(value).includes('/skin-tianlight') === false, 'fingerprint must not leak absolute machine paths')
})

// ---------- R4B: Host allowlist (DNS-rebinding fence) ----------
// A malicious site rebound to 127.0.0.1 makes Origin === Host; only a loopback
// Host name is accepted. A missing Host is a non-browser caller (curl/HTTP-1.0).
const forgedHost = await call('GET', '/skin-tianlight/_manifest', { host: 'evil.example:58733' })
check('R4B: a foreign Host header is rejected', () => {
  assert.equal(forgedHost.status, 403)
})
const forgedHostSameOrigin = await call('GET', '/skin-tianlight/_manifest', {
  origin: 'http://evil.example:58733',
  host: 'evil.example:58733',
})
check('R4B: Origin === Host is not enough when the Host is not loopback', () => {
  assert.equal(forgedHostSameOrigin.status, 403)
})
// R8b (REV-R4B 2): both fences check the Host allowlist BEFORE trusting the desktop
// app scheme; a dsh-app:// Origin must not smuggle a forged Host past the fence.
const appForgedHost = await call('GET', '/skin-tianlight/_manifest', {
  origin: 'dsh-app://app',
  host: 'evil.example:58733',
})
check('R8b: dsh-app Origin cannot bypass the Host allowlist', () => {
  assert.equal(appForgedHost.status, 403)
})
const appLoopbackHost = await call('GET', '/skin-tianlight/_manifest', {
  origin: 'dsh-app://app',
  host: '127.0.0.1:58733',
})
check('R8b: desktop app Origin with a loopback Host is accepted', () => {
  assert.equal(appLoopbackHost.status, 200)
})
for (const host of ['127.0.0.1:58733', 'localhost:58733', '[::1]:58733']) {
  const allowed = await call('GET', '/skin-tianlight/_manifest', { host })
  check('R4B: loopback Host accepted: ' + host, () => {
    assert.equal(allowed.status, 200)
  })
}

// assets/README.md is always committed even when the shipped 4K media is absent
// (some distributions strip large files); it exercises the same HEAD/Range path
// without writing a fixture.
const RANGE_NAME = 'README.md'
const head = await call('HEAD', '/skin-tianlight/' + RANGE_NAME)
const headLength = Number(head.headers['content-length'])
check('HEAD asset reports full length + range support', () => {
  assert.equal(head.status, 200)
  assert.ok(headLength > 16, 'content-length')
  assert.equal(head.headers['accept-ranges'], 'bytes')
})

const ranged = await call('GET', '/skin-tianlight/' + RANGE_NAME, { range: 'bytes=0-9' })
check('Range 0-9 yields 206 + 10 bytes', () => {
  assert.equal(ranged.status, 206)
  assert.equal(ranged.body.length, 10)
  assert.equal(ranged.headers['content-range'], 'bytes 0-9/' + headLength)
})

const suffix = await call('GET', '/skin-tianlight/' + RANGE_NAME, { range: 'bytes=-8' })
check('suffix Range yields last 8 bytes', () => {
  assert.equal(suffix.status, 206)
  assert.equal(suffix.body.length, 8)
})

const bad = await call('GET', '/skin-tianlight/' + RANGE_NAME, { range: 'bytes=99999999-' })
check('unsatisfiable Range yields 416', () => {
  assert.equal(bad.status, 416)
})

const traversal = await call('GET', '/skin-tianlight/..%2Fpackage.json')
check('traversal attempt yields 404', () => {
  assert.equal(traversal.status, 404)
})

const missing = await call('GET', '/skin-tianlight/nope.mp4')
check('missing asset yields 404', () => {
  assert.equal(missing.status, 404)
})

const notAllowed = await call('POST', '/skin-tianlight/_manifest')
check('POST yields 405', () => {
  assert.equal(notAllowed.status, 405)
})

// ---------- upload sink: the rejection paths run before any file is touched ----------
const uploadNoName = await call('POST', '/skin-tianlight/_upload', { 'content-type': 'video/mp4' })
check('upload without a name yields 400', () => {
  assert.equal(uploadNoName.status, 400)
})
const uploadBadExt = await call('POST', '/skin-tianlight/_upload?name=payload.exe', { 'content-type': 'video/mp4' })
check('upload rejects a non-media extension', () => {
  assert.equal(uploadBadExt.status, 400)
})
const uploadTraversal = await call('POST', '/skin-tianlight/_upload?name=..%2F..%2Fpackage.json', { 'content-type': 'video/mp4' })
check('upload reduces traversal to a safe basename and rejects .json', () => {
  assert.equal(uploadTraversal.status, 400)
})
const uploadBadType = await call('POST', '/skin-tianlight/_upload?name=sky.mp4', { 'content-type': 'text/html' })
check('upload rejects a non-media content type', () => {
  assert.equal(uploadBadType.status, 415)
})
const uploadTooBig = await call('POST', '/skin-tianlight/_upload?name=sky.mp4', { 'content-type': 'video/mp4', 'content-length': String(1024 * 1024 * 1024) })
check('upload rejects a declared size over the cap', () => {
  assert.equal(uploadTooBig.status, 413)
})
const uploadGet = await call('GET', '/skin-tianlight/_upload')
check('GET upload yields 405', () => {
  assert.equal(uploadGet.status, 405)
})
const missingUpload = await call('GET', '/skin-tianlight/uploads/nope.mp4')
check('missing upload yields 404', () => {
  assert.equal(missingUpload.status, 404)
})

// ---------- optional WebWallGL scene channel ----------
// No handshake parameters: the host reports its identity but has nothing to compare.
const engines = await call('GET', '/skin-tianlight/_engines')
const engineState = JSON.parse(engines.body.toString('utf8'))
check('engine status reports the vendored WebWallGL + the host build/API identity', () => {
  assert.equal(engines.status, 200)
  assert.equal(engineState.build, PKG_VERSION)
  assert.equal(typeof engineState.api, 'string')
  assert.ok(engineState.api !== '', 'api marker')
  assert.equal(engineState.stale, undefined)
  assert.equal(engineState.webwallgl, true)
  assert.equal(engineState.adapter, true)
  assert.ok(engineState.upload && engineState.upload.max >= 512 * 1024 * 1024, 'upload.max')
  assert.equal(engineState.upload.writable, true)
})
// R7: the ffmpeg probe is pinned before the host module is imported, so this check
// (and the transcode ones below) answer the same on a developer machine WITH ffmpeg
// and on CI without it.
check('R7: verify pins ffmpeg to a guaranteed-absent path (deterministic on any machine)', () => {
  assert.equal(process.env.FFMPEG_PATH, FORCED_FFMPEG)
  assert.equal(engineState.ffmpeg, false, 'host probe must be the pinned absent binary')
})
// The two halves ship separately: a drifted marker must fail here, not in the page.
check('browser and host halves agree on the HOST_API route contract', () => {
  const clientSource = readFileSync(join(PKG, 'lib', 'client.js'), 'utf8')
  const match = clientSource.match(/const HOST_API = "([^"]+)"/)
  assert.ok(match !== null, 'client HOST_API constant missing from lib/client.js')
  assert.equal(match[1], engineState.api)
})
const apiEngines = await call('GET', '/skin-tianlight/_engines?api=' + encodeURIComponent(engineState.api))
check('engine status is fresh when the client speaks the same route contract', () => {
  assert.equal(JSON.parse(apiEngines.body.toString('utf8')).stale, false)
})
const apiMovedEngines = await call('GET', '/skin-tianlight/_engines?api=' + encodeURIComponent(engineState.api + '-next'))
check('engine status flags a stale host when the route contract moves', () => {
  assert.equal(JSON.parse(apiMovedEngines.body.toString('utf8')).stale, true)
})
// Legacy fallback: clients shipped before HOST_API still state their build number.
const legacyEngines = await call('GET', '/skin-tianlight/_engines?build=' + PKG_VERSION)
check('legacy build handshake still matches a same-build host', () => {
  assert.equal(JSON.parse(legacyEngines.body.toString('utf8')).stale, false)
})
const staleEngines = await call('GET', '/skin-tianlight/_engines?build=0.2.1')
check('legacy build handshake still flags a stale host after an update', () => {
  assert.equal(JSON.parse(staleEngines.body.toString('utf8')).stale, true)
})
const engineHead = await call('HEAD', '/skin-tianlight/_engine/webwallgl.js')
check('engine script is served as JavaScript with a size', () => {
  assert.equal(engineHead.status, 200)
  assert.match(String(engineHead.headers['content-type']), /javascript/)
  assert.ok(Number(engineHead.headers['content-length']) > 100000)
})
const frame = await call('GET', '/skin-tianlight/_scene-frame')
check('scene adapter is served sandboxed with a CSP', () => {
  assert.equal(frame.status, 200)
  assert.match(String(frame.headers['content-security-policy']), /sandbox allow-scripts/)
  assert.match(frame.body.toString('utf8'), /WebWallGL/)
})
const sceneTraversal = await call('GET', '/skin-tianlight/_scene-project/0/..%2F..%2Fpackage.json')
check('scene project traversal yields 404', () => {
  assert.equal(sceneTraversal.status, 404)
})
const sceneBadExt = await call('GET', '/skin-tianlight/_scene-project/0/x/evil.html')
check('scene project refuses a non-asset extension', () => {
  assert.equal(sceneBadExt.status, 404)
})

// ---------- v0.5.1 host routes (E1/D2/A5/A6/A3) ----------
// Read-only + rejection paths only: a valid settings PUT would write the real
// host configuration file and a valid bundle import would write uploads, so the
// happy-path writes are covered by tools/test.mjs temp dirs and the runtime lab.
check('engine status advertises the v0.5.1 capabilities', () => {
  const value = JSON.parse(engines.body.toString('utf8'))
  assert.equal(value.ffmpeg, false, 'ffmpeg is pinned absent by verify (see R7 check above)')
  assert.ok(value.cache && Number.isInteger(value.cache.entries) && Number.isInteger(value.cache.bytes), 'cache status')
  assert.ok(value.settings && Number.isInteger(value.settings.revision), 'settings revision')
  assert.equal(typeof value.webProjects, 'number')
  for (const capability of ['settings', 'bundle', 'frameCache', 'transcode', 'webWallpapers']) {
    assert.equal(typeof value.capabilities[capability], 'boolean', 'capability ' + capability)
  }
  assert.equal(value.capabilities.settings, true)
  assert.equal(value.capabilities.bundle, true)
  assert.equal(value.capabilities.frameCache, true)
  assert.equal(value.capabilities.webWallpapers, true)
})

const settingsGet = await call('GET', '/skin-tianlight/_settings')
check('settings GET returns a revision + settings map', () => {
  assert.equal(settingsGet.status, 200)
  const value = JSON.parse(settingsGet.body.toString('utf8'))
  assert.ok(Number.isInteger(value.revision) && value.revision >= 0)
  assert.ok(value.settings !== null && typeof value.settings === 'object' && Array.isArray(value.settings) === false)
  assert.ok(!('schemaVersion' in value) || Number.isInteger(value.schemaVersion))
})
const settingsWrongType = await call('PUT', '/skin-tianlight/_settings', { 'content-type': 'text/plain' }, '{}')
check('settings PUT requires application/json', () => {
  assert.equal(settingsWrongType.status, 415)
})
const settingsBadJson = await call('PUT', '/skin-tianlight/_settings', { 'content-type': 'application/json' }, '{oops')
check('settings PUT rejects malformed JSON', () => {
  assert.equal(settingsBadJson.status, 400)
})
const settingsBadKey = await call('PUT', '/skin-tianlight/_settings', { 'content-type': 'application/json' }, JSON.stringify({ settings: { 'not-a-tianlight-key': 'x' } }))
check('settings PUT rejects out-of-scope keys without writing', () => {
  assert.equal(settingsBadKey.status, 400)
})

// v0.6.1 optimistic concurrency (read-only probe): a deliberately stale
// expectedRevision must be answered with 409 + the authoritative state, and must
// never write. The token is far in the future so concurrent host activity cannot
// accidentally make it valid.
const settingsBeforeConflict = JSON.parse(settingsGet.body.toString('utf8'))
const staleExpectedRevision = Number(settingsBeforeConflict.revision) + 1000
const settingsConflict = await call(
  'PUT',
  '/skin-tianlight/_settings',
  { 'content-type': 'application/json' },
  JSON.stringify({ expectedRevision: staleExpectedRevision, settings: { 'tianlight.__verify_probe': 'x' } }),
)
check('settings PUT rejects a stale expectedRevision with 409 + current state', () => {
  assert.equal(settingsConflict.status, 409)
  const value = JSON.parse(settingsConflict.body.toString('utf8'))
  assert.equal(value.ok, false)
  assert.equal(value.conflict, true)
  assert.ok(Number.isInteger(value.revision) && value.revision >= 0)
  assert.ok(value.settings !== null && typeof value.settings === 'object' && Array.isArray(value.settings) === false)
  assert.equal(Object.prototype.hasOwnProperty.call(value.settings, 'tianlight.__verify_probe'), false)
})
const settingsBadExpected = await call(
  'PUT',
  '/skin-tianlight/_settings',
  { 'content-type': 'application/json' },
  JSON.stringify({ expectedRevision: 'soon', settings: {} }),
)
check('settings PUT rejects a malformed expectedRevision', () => {
  assert.equal(settingsBadExpected.status, 400)
})
const settingsAfterConflict = await call('GET', '/skin-tianlight/_settings')
check('the rejected settings conflict did not write', () => {
  const value = JSON.parse(settingsAfterConflict.body.toString('utf8'))
  assert.ok(Number.isInteger(value.revision) && value.revision >= Number(settingsBeforeConflict.revision))
  assert.equal(Object.prototype.hasOwnProperty.call(value.settings, 'tianlight.__verify_probe'), false)
})

const transcodeStatus = await call('GET', '/skin-tianlight/_transcode/status')
check('transcode status is available and never lies about ffmpeg', () => {
  assert.equal(transcodeStatus.status, 200)
  const value = JSON.parse(transcodeStatus.body.toString('utf8'))
  assert.equal(typeof value.ffmpeg, 'boolean')
  assert.equal(process.env.FFMPEG_PATH, FORCED_FFMPEG, 'the probe runs against the pinned absent binary')
  assert.equal(value.ffmpeg, false)
})
// R7/REV-R7: a stripped-media distribution keeps only assets/README.md (the big
// defaults are removed), so the source name cannot resolve and the route answers 400
// BEFORE the ffmpeg probe. Assert the correct, deterministic outcome for the tree we
// are running in — either way the route must not create a derivative.
const TRANSCODE_HAS_MEDIA = existsSync(join(PKG, 'assets', 'bg-4k.mp4'))
const transcodeNoFfmpeg = await call('POST', '/skin-tianlight/_transcode?name=bg-4k.mp4', {}, '')
check('transcode POST degrades safely without ffmpeg (repo-media independent)', () => {
  assert.equal(process.env.FFMPEG_PATH, FORCED_FFMPEG)
  if (TRANSCODE_HAS_MEDIA) assert.equal(transcodeNoFfmpeg.status, 501)
  else assert.equal(transcodeNoFfmpeg.status, 400, 'stripped media: source missing -> 400 before any transcode')
})

const cacheStatus = await call('GET', '/skin-tianlight/_frame-cache/status')
check('frame cache status exposes hit/miss counters', () => {
  assert.equal(cacheStatus.status, 200)
  const value = JSON.parse(cacheStatus.body.toString('utf8'))
  for (const key of ['entries', 'bytes', 'hits', 'misses', 'maxBytes']) assert.ok(Number.isInteger(value[key]), key)
})
const cacheMiss = await call('GET', '/skin-tianlight/_frame-cache?key=deadbeef.16x9.1080')
check('frame cache miss yields 404 (never an empty 200)', () => {
  assert.equal(cacheMiss.status, 404)
})
const cacheBadKey = await call('GET', '/skin-tianlight/_frame-cache?key=..%2F..%2Fsettings.json')
check('frame cache rejects a traversal-shaped key', () => {
  assert.equal([400, 404].includes(cacheBadKey.status), true, 'status ' + cacheBadKey.status)
})
const cacheNoKey = await call('POST', '/skin-tianlight/_frame-cache', { 'content-type': 'image/webp' }, 'x')
check('frame cache POST requires a key', () => {
  assert.equal(cacheNoKey.status, 400)
})

const bundlePost = await call('POST', '/skin-tianlight/_bundle')
check('bundle export is GET-only', () => {
  assert.equal(bundlePost.status, 405)
})
const importEmpty = await call('POST', '/skin-tianlight/_import', { 'content-type': 'application/gzip' }, '')
check('bundle import rejects an empty/invalid archive', () => {
  assert.ok([400, 415].includes(importEmpty.status), 'status ' + importEmpty.status)
})

const webTraversal = await call('GET', '/skin-tianlight/_web-project/0/..%2F..%2Fpackage.json')
check('web wallpaper route rejects traversal', () => {
  assert.equal(webTraversal.status, 404)
})
const webMissing = await call('GET', '/skin-tianlight/_web-project/0/nope/index.html')
check('web wallpaper route refuses unknown projects', () => {
  assert.equal(webMissing.status, 404)
})
const derivedMissing = await call('GET', '/skin-tianlight/derived/nope.mp4')
check('derived transcode output route refuses unknown files', () => {
  assert.equal(derivedMissing.status, 404)
})

// ---------- client half: module envelope ----------
let loaded = null
globalThis.window = { __ModuleLoader__: { load: (spec) => { loaded = spec } } }
const clientUrl = pathToFileURL(PKG + '/lib/client.js').href
await import(clientUrl)
check('client registers one module envelope', () => {
  assert.ok(loaded !== null, 'window.__ModuleLoader__.load was not called')
  assert.equal(loaded.id, PKG_NAME)
  assert.equal(typeof loaded.factory, 'function')
})
check('factory evaluates and exports apply()', () => {
  const exportsObj = loaded.factory(() => { throw new Error('no imports expected') })
  assert.equal(typeof exportsObj.apply, 'function')
  assert.equal(exportsObj.apply.length, 1)
})

// ---------- manifest files ----------
const fs = await import('node:fs')
check('package.json declares web client + bundle patch', () => {
  const pkg = JSON.parse(fs.readFileSync(PKG + '/package.json', 'utf8'))
  assert.equal(pkg.dsh.client.platform, 'web')
  assert.equal(pkg.exports['./client'], './lib/client.js')
  assert.equal(pkg.dsh.bundle.patch, './cordis.patch.yml')
})
check('package identity agrees across every registry/loader surface', () => {
  const pkg = JSON.parse(fs.readFileSync(PKG + '/package.json', 'utf8'))
  const skin = JSON.parse(fs.readFileSync(PKG + '/skin.json', 'utf8'))
  assert.equal(skin.package, PKG_NAME, 'skin.json.package must equal package.json name')
  const patch = fs.readFileSync(PKG + '/cordis.patch.yml', 'utf8')
  assert.ok(
    patch.includes("name: '" + PKG_NAME + "'") || patch.includes('name: "' + PKG_NAME + '"'),
    'cordis.patch.yml insert name must equal package.json name',
  )
  assert.equal(loaded.id, PKG_NAME, 'client module envelope id must equal package.json name')
  const npmFiles = Array.isArray(pkg.files) ? pkg.files : []
  for (const required of ['lib/index.js', 'lib/client.js', 'lib/fingerprint.js', 'lib/settings-store.js', 'lib/host-paths.js', 'cordis.patch.yml', 'skin.json', 'assets/bg-4k.mp4', 'vendor/webwallgl/webwallgl.global.min.js', 'presets/tianlight-default.json']) {
    const covered = npmFiles.some((entry) => entry === required || required.startsWith(String(entry).replace(/\/+$/, '') + '/'))
    assert.ok(covered, 'package.json files[] must cover ' + required + ' (npm installs would miss it)')
  }
})
check('skin.json passes the manager catalog rules', () => {
  const skin = JSON.parse(fs.readFileSync(PKG + '/skin.json', 'utf8'))
  const pkg = JSON.parse(fs.readFileSync(PKG + '/package.json', 'utf8'))
  assert.match(skin.id, /^[a-z0-9][a-z0-9._-]*$/)
  assert.ok(skin.name.trim() !== '')
  assert.match(skin.bodyAttr, /^data-[a-z0-9_.:-]+$/)
  assert.ok(typeof skin.wiring.id === 'string' && skin.wiring.id.length > 0)
  assert.equal(skin.package, pkg.name)
  if (skin.dshCompatibility !== undefined) assert.match(skin.dshCompatibility, /^\d+\.\d+\.\d+rc\d+$/)
  // Multi-version support (v2.0.1+): ONE canonical range, declared in three places
  // (harness gate, official peers, catalog range). The harness reads engines.dsh on
  // 0.2.1/0.2.2 and peerDependencies on 0.2.0, so both must carry it verbatim.
  assert.equal(skin.dshCompatibilityRange, DSH_COMPAT_RANGE, 'skin.json dshCompatibilityRange must equal the canonical range')
  assert.equal(pkg.engines?.dsh, DSH_COMPAT_RANGE, 'package.json engines.dsh must equal the canonical range')
  for (const name of OFFICIAL_PEER_PACKAGES) {
    assert.equal(pkg.peerDependencies?.[name], DSH_COMPAT_RANGE, `peerDependencies[${name}] must equal the canonical range`)
  }
  for (const version of DSH_COMPAT_MUST_MATCH) {
    assert.ok(satisfies(version, DSH_COMPAT_RANGE), `the declared range must match ${version}`)
  }
  for (const version of DSH_COMPAT_MUST_NOT_MATCH) {
    assert.equal(satisfies(version, DSH_COMPAT_RANGE), false, `the declared range must not match ${version}`)
  }
  if (skin.dshCompatibilityTested !== undefined) {
    assert.ok(Array.isArray(skin.dshCompatibilityTested), 'tested list must be an array')
    for (const line of ['0.2.0', '0.2.1', '0.2.2']) {
      assert.ok(
        skin.dshCompatibilityTested.some((entry) => String(entry).startsWith(line)),
        `tested list must mention the ${line} line`,
      )
    }
  }
})

// ---------- R7: the verification run itself must not mutate the plugin tree ----------
const TREE_AFTER = snapshotTree()
const TREE_CHANGES = diffTrees(TREE_BEFORE, TREE_AFTER)
check('verify did not write the plugin working tree', () => {
  assert.equal(process.env.FFMPEG_PATH, FORCED_FFMPEG, 'the pinned probe must stay in force for the whole run')
  assert.deepEqual(TREE_CHANGES, [], 'plugin tree changed during verify: ' + TREE_CHANGES.join(', '))
})
check('no transcode derivative was produced in assets/derived (force-absent ffmpeg)', () => {
  const derivative = join(PKG, 'assets', 'derived', 'bg-4k.h264.mp4')
  assert.equal(existsSync(derivative), false, derivative + ' must not be created')
  // The POST above may only reach the 501 "ffmpeg is not available" answer (or 400
  // "source missing" in a stripped-media tree); a 200 would mean a real transcode ran
  // and wrote into the repo.
  assert.equal(transcodeNoFfmpeg.status, TRANSCODE_HAS_MEDIA ? 501 : 400)
})

// Leave the caller's environment exactly as it was found (tests/other tools may
// import this script's environment in the same shell).
if (ORIGINAL_FFMPEG_PATH === undefined) delete process.env.FFMPEG_PATH
else process.env.FFMPEG_PATH = ORIGINAL_FFMPEG_PATH

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`)
process.exitCode = failures === 0 ? 0 : 1
