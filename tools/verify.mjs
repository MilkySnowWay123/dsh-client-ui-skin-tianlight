import { Readable, Writable } from 'node:stream'
import { readFileSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import assert from 'node:assert/strict'
import { dirname, join } from 'node:path'

const PKG = dirname(dirname(fileURLToPath(import.meta.url)))
/** Read the expected host build from package.json so a version bump cannot leave
 *  the handshake assertion pinned to an old value. */
const PKG_VERSION = JSON.parse(readFileSync(join(PKG, 'package.json'), 'utf8')).version
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

// assets/ is gitignored, so CI has no wallpaper videos. README.md is the one
// file that is always committed under assets/ and it exercises the same
// HEAD/Range path without writing a fixture.
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
const engines = await call('GET', '/skin-tianlight/_engines?build=' + PKG_VERSION)
check('engine status reports the vendored WebWallGL + matches the client build', () => {
  assert.equal(engines.status, 200)
  const value = JSON.parse(engines.body.toString('utf8'))
  assert.equal(value.build, PKG_VERSION)
  // The host/client handshake: a client that states the same build is not stale.
  assert.equal(value.stale, false)
  assert.equal(value.webwallgl, true)
  assert.equal(value.adapter, true)
  assert.ok(value.upload && value.upload.max >= 512 * 1024 * 1024, 'upload.max')
  assert.equal(value.upload.writable, true)
})
const staleEngines = await call('GET', '/skin-tianlight/_engines?build=0.2.1')
check('engine status flags a stale host after an update', () => {
  const value = JSON.parse(staleEngines.body.toString('utf8'))
  assert.equal(value.stale, true)
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
  assert.equal(value.ffmpeg, false, 'ffmpeg must not be assumed present')
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

const transcodeStatus = await call('GET', '/skin-tianlight/_transcode/status')
check('transcode status is available and never lies about ffmpeg', () => {
  assert.equal(transcodeStatus.status, 200)
  const value = JSON.parse(transcodeStatus.body.toString('utf8'))
  assert.equal(typeof value.ffmpeg, 'boolean')
  assert.equal(value.ffmpeg, false)
})
const transcodeNoFfmpeg = await call('POST', '/skin-tianlight/_transcode?name=bg-main.mp4', {}, '')
check('transcode POST degrades to 501 without ffmpeg', () => {
  assert.equal(transcodeNoFfmpeg.status, 501)
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
  assert.equal(loaded.id, '@dsh-external/dsh-client-ui-skin-tianlight')
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
check('skin.json passes the manager catalog rules', () => {
  const skin = JSON.parse(fs.readFileSync(PKG + '/skin.json', 'utf8'))
  assert.match(skin.id, /^[a-z0-9][a-z0-9._-]*$/)
  assert.ok(skin.name.trim() !== '')
  assert.match(skin.bodyAttr, /^data-[a-z0-9_.:-]+$/)
  assert.ok(typeof skin.wiring.id === 'string' && skin.wiring.id.length > 0)
  assert.equal(skin.package, JSON.parse(fs.readFileSync(PKG + '/package.json', 'utf8')).name)
  if (skin.dshCompatibility !== undefined) assert.match(skin.dshCompatibility, /^\d+\.\d+\.\d+rc\d+$/)
  // Multi-version support (v0.4.0+): the single value above stays what the skin manager
  // displays; the range + tested list are informational fields the manager ignores.
  if (skin.dshCompatibilityRange !== undefined) {
    assert.equal(typeof skin.dshCompatibilityRange, 'string')
    assert.match(skin.dshCompatibilityRange, /0\.2\.0/)
    assert.match(skin.dshCompatibilityRange, /0\.3\.0/)
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

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`)
process.exitCode = failures === 0 ? 0 : 1
