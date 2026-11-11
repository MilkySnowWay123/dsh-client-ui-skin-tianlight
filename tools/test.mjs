// Regression tests for the pure host-side logic. No DSH boot required.
// Run: node tools/test.mjs
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { existsSync, mkdtempSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Readable, Writable } from 'node:stream'
import { pathToFileURL } from 'node:url'
import { gunzipSync, gzipSync } from 'node:zlib'
import { __test } from '../lib/index.js'
import { apply as hostApply } from '../lib/index.js'
import { UPLOAD_DIR, UPLOAD_MAX, receiveUpload, sanitizeUploadName, uploadPath } from '../lib/upload.js'
import { listSceneProjects, sceneFilePath } from '../lib/scene-project.js'
import {
  DATA_SETTING_KEYS,
  MAX_SETTING_KEYS,
  MAX_SETTINGS_BYTES,
  SCHEMA_VERSION,
  SettingsStore,
  handleSettings,
  isDataSettingKey,
  isSettingKey,
  sanitizeSettingsState,
  stripDataSettings,
  validateSettingsPayload,
} from '../lib/settings-store.js'
import { buildTarBuffer, classifyBundleEntry, handleBundle, handleImport, isBundleBuiltinMedia, listBundleWallpapers, parseTar, validateBundleEntryName } from '../lib/bundle.js'
import { servePath } from '../lib/http-media.js'
import { SVG_MAX_BYTES, isSafeSvgBuffer } from '../lib/media-types.js'
import { TINY_MP4, TINY_PNG, makeMediaFixture } from './media-fixtures.mjs'
import { FrameCache, handleFrameCache, handleFrameCacheStatus, sniffImageType, validCacheKey } from '../lib/media-cache.js'
import {
  buildTranscodeArgs,
  derivedOutputName,
  derivedPath,
  detectFfmpeg,
  handleTranscode,
  handleTranscodeStatus,
  listDerived,
  resolveTranscodeSource,
  resolveTranscodeSourceInfo,
  sanitizeFfmpegMessage,
  transcodeKind,
} from '../lib/transcode.js'
import {
  WEB_CSP,
  WEB_FILE_EXT,
  handleWebProject,
  isWebProject,
  listWebProjects,
  resolveWebProjectDir,
  webProjectFilePath,
} from '../lib/web-project.js'
import {
  PET_CHAT_CODES,
  PET_CHAT_MAX_BODY_BYTES,
  PET_CHAT_MAX_CHARS,
  PET_CHAT_MAX_TOKENS,
  PET_CHAT_SYSTEM_PROMPT,
  PET_CHAT_TIMEOUT_MS,
  computePetLlmCapability,
  createPetChat,
  mapProviderFailureCode,
} from '../lib/pet-chat.js'

const { parseRange, listWallpapers, listAssets, VIDEO_EXT, IMAGE_EXT, SAFE_NAME, safeJoin, engineStatus } = __test
/** Read the expected build from package.json so a version bump cannot leave the
 *  host build handshake tests asserting an old value. */
const PKG_VERSION = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version
let passed = 0
const failures = []

const test = (name, fn) => {
  try {
    fn()
    passed += 1
  } catch (error) {
    failures.push(name + ': ' + (error instanceof Error ? error.message : String(error)))
  }
}

/** The archive/import helpers are async; same reporting, awaited at the end. */
const testAsync = async (name, fn) => {
  try {
    await fn()
    passed += 1
  } catch (error) {
    failures.push(name + ': ' + (error instanceof Error ? error.message : String(error)))
  }
}

const tempDir = (prefix) => mkdtempSync(join(tmpdir(), prefix))
const withTempDir = (prefix, fn) => {
  const dir = tempDir(prefix)
  try {
    return fn(dir)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}
const withTempDirAsync = async (prefix, fn) => {
  const dir = tempDir(prefix)
  try {
    return await fn(dir)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

// ---- fake req/res: the route modules only need method/url/headers + streams ----
function fakeRequest(method, url, headers = {}, body = null) {
  const req = Readable.from(body === null ? [] : [Buffer.isBuffer(body) ? body : Buffer.from(body)])
  req.method = method
  req.url = url
  req.headers = { ...headers }
  return req
}

function fakeResponse() {
  const chunks = []
  const res = new Writable({
    write(chunk, _encoding, callback) {
      chunks.push(chunk)
      callback()
    },
  })
  res.writeHead = (status, headers = {}) => {
    res.status = status
    res.headers = headers
  }
  res.body = () => Buffer.concat(chunks)
  res.bodyText = () => res.body().toString('utf8')
  res.bodyJson = () => JSON.parse(res.bodyText())
  return res
}

function waitForResponse(res, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    if (res.writableFinished === true) {
      resolve(res)
      return
    }
    const timer = setTimeout(() => reject(new Error('response did not finish')), timeoutMs)
    res.on('finish', () => {
      clearTimeout(timer)
      resolve(res)
    })
    res.on('error', (error) => {
      clearTimeout(timer)
      reject(error)
    })
  })
}

/** Invoke one host route module directly, as the prefix handler in index.js does. */
async function callRoute(mount, method, url, headers = {}, body = null) {
  const req = fakeRequest(method, url, headers, body)
  const res = fakeResponse()
  mount(req, res)
  return waitForResponse(res)
}

/**
 * The route verification harness in tools/verify.mjs drives handlers with a bare
 * EventEmitter request (no pipe/stream methods) and emits body events afterwards.
 * Keeping this shape in the tests locks the handlers' status mapping for it.
 */
async function callRoutePlain(mount, method, url, headers = {}, body = null) {
  const req = new EventEmitter()
  req.method = method
  req.url = url
  req.headers = { ...headers }
  req.resume = () => {}
  if (body !== null) req.headers['content-length'] = String(Buffer.byteLength(body))
  const res = fakeResponse()
  mount(req, res)
  if (body !== null) req.emit('data', Buffer.isBuffer(body) ? body : Buffer.from(String(body)))
  req.emit('end')
  return waitForResponse(res)
}

const urlOf = (pathWithQuery) => new URL('http://localhost' + pathWithQuery)

// ---- parseRange ----
test('no header means no range', () => {
  assert.equal(parseRange(undefined, 100), null)
  assert.equal(parseRange(null, 100), null)
  assert.equal(parseRange('', 100), null)
})

test('malformed header falls back to a full response', () => {
  for (const bad of ['bytes=', 'bytes=-', 'items=0-1', 'bytes=abc-def', 'bytes=0-1-2', '  ']) {
    assert.equal(parseRange(bad, 100), null, bad)
  }
})

test('closed range is inclusive', () => {
  assert.deepEqual(parseRange('bytes=0-9', 100), { start: 0, end: 9 })
  assert.deepEqual(parseRange('bytes=90-99', 100), { start: 90, end: 99 })
})

test('open-ended range runs to the last byte', () => {
  assert.deepEqual(parseRange('bytes=50-', 100), { start: 50, end: 99 })
})

test('suffix range keeps the tail', () => {
  assert.deepEqual(parseRange('bytes=-10', 100), { start: 90, end: 99 })
  assert.deepEqual(parseRange('bytes=-1000', 100), { start: 0, end: 99 })
})

test('end past the file is clamped', () => {
  assert.deepEqual(parseRange('bytes=90-500', 100), { start: 90, end: 99 })
})

test('start past the file is unsatisfiable', () => {
  assert.deepEqual(parseRange('bytes=200-300', 100), { unsatisfiable: true })
  assert.deepEqual(parseRange('bytes=100-', 100), { unsatisfiable: true })
})

test('inverted range is unsatisfiable', () => {
  assert.deepEqual(parseRange('bytes=20-10', 100), { unsatisfiable: true })
})

test('whitespace around the header is tolerated', () => {
  assert.deepEqual(parseRange(' bytes=0-4 ', 100), { start: 0, end: 4 })
})

// ---- SAFE_NAME / path policy ----
test('safe names accept plain asset filenames', () => {
  for (const ok of ['bg-main.mp4', 'cat.png', 'a.webp', 'x1.jpg']) assert.ok(SAFE_NAME.test(ok), ok)
})

test('safe names reject traversal and separators', () => {
  for (const bad of ['..', '../x', 'a/b', '.hidden', '', 'a b', 'a\\b', 'a%2fb']) {
    assert.equal(SAFE_NAME.test(bad), false, bad)
  }
})

// ---- safeJoin: containment for external wallpaper roots ----
test('safeJoin keeps a plain filename inside its root', () => {
  const root = process.platform === 'win32' ? 'C:\\wallpapers' : '/wallpapers'
  const joined = safeJoin(root, 'scene.mp4')
  assert.ok(joined !== null && joined.startsWith(root))
})

test('safeJoin refuses traversal, separators and unsafe names', () => {
  const root = process.platform === 'win32' ? 'C:\\wallpapers' : '/wallpapers'
  for (const bad of ['..', '../x.mp4', 'a/b', 'a\\b', '.hidden', '', 'a b']) {
    assert.equal(safeJoin(root, bad), null, bad)
  }
})

// ---- wallpaper discovery ----
test('asset listing returns only safe names', () => {
  const assets = listAssets()
  assert.ok(Array.isArray(assets))
  for (const name of assets) assert.ok(SAFE_NAME.test(name), name)
})

test('wallpapers carry id/kind/url and exclude the companion', () => {
  const items = listWallpapers()
  assert.ok(Array.isArray(items))
  for (const item of items) {
    assert.ok(typeof item.id === 'string' && item.id !== 'cat.png')
    assert.ok(item.kind === 'video' || item.kind === 'image')
    assert.ok(item.url.startsWith('/skin-tianlight/'))
    assert.ok(Number.isInteger(item.bytes) && item.bytes >= 0, item.id + ' bytes')
    const ext = item.id.slice(item.id.lastIndexOf('.')).toLowerCase()
    assert.ok(VIDEO_EXT.has(ext) || IMAGE_EXT.has(ext), item.id)
    assert.equal(item.kind, VIDEO_EXT.has(ext) ? 'video' : 'image')
  }
})

test('videos are listed before stills', () => {
  const kinds = listWallpapers().map((item) => item.kind)
  const firstImage = kinds.indexOf('image')
  if (firstImage >= 0) assert.ok(kinds.slice(firstImage).every((kind) => kind === 'image'))
})

// ---- upload sink: name policy is the security boundary ----
test('upload names accept plain media filenames', () => {
  assert.equal(sanitizeUploadName('loop.mp4'), 'loop.mp4')
  assert.equal(sanitizeUploadName('cat.PNG'), 'cat.png')
  assert.equal(sanitizeUploadName('sky-4k.webp'), 'sky-4k.webp')
  assert.equal(sanitizeUploadName('a_b.m4v'), 'a_b.m4v')
})

test('upload names reduce a path to its basename', () => {
  assert.equal(sanitizeUploadName('C:\\tmp\\sky.mp4'), 'sky.mp4')
  assert.equal(sanitizeUploadName('../../etc/sky.png'), 'sky.png')
  assert.equal(sanitizeUploadName('../x.mp4'), 'x.mp4')
  assert.equal(sanitizeUploadName('..%2F..%2Fwall.png'), 'wall.png')
  // A filename with spaces is user-friendly to KEEP, but the storage name has no
  // spaces: the sanitizer strips them instead of failing the upload.
  assert.equal(sanitizeUploadName('my sky.mp4'), 'mysky.mp4')
  assert.equal(sanitizeUploadName('4K 壁纸.mp4'), '4K.mp4')
})

test('upload names keep decodable wide-character 4K files', () => {
  // The ASCII part can vanish entirely; the extension is what decides whether the
  // file can play, so the stem is generated instead of rejecting the upload.
  const generated = sanitizeUploadName('壁纸.mp4')
  assert.match(generated, /^upload-[a-z0-9-]+\.mp4$/)
  const long = sanitizeUploadName('x'.repeat(120) + '.MP4')
  assert.ok(long !== null && long.length <= 96 && long.endsWith('.mp4'))
})

test('upload names reject non-media, empty and traversal shapes', () => {
  for (const bad of ['', '..', 'a/b', 'noext', '.exe', 'x.exe', '%2e%2e%2f%2e%2e%2fx']) {
    assert.equal(sanitizeUploadName(bad), null, bad)
  }
})

test('uploadPath stays inside the upload directory', () => {
  assert.ok(uploadPath('sky.mp4').startsWith(UPLOAD_DIR))
  for (const bad of ['..', '../x.mp4', 'a/b', 'a\\b', '.hidden']) {
    assert.equal(uploadPath(bad), null, bad)
  }
})

test('upload cap is a 4K-friendly budget', () => {
  assert.ok(Number.isInteger(UPLOAD_MAX) && UPLOAD_MAX >= 512 * 1024 * 1024)
})

await testAsync('S3: the upload sink accepts only passive SVG images', async () => {
  await withTempDirAsync('tl-upload-svg-', async (dir) => {
    const uploadDir = join(dir, 'uploads')
    const run = (rawName, payload) =>
      new Promise((resolve) => {
        const req = Readable.from([Buffer.from(payload)])
        req.headers = { 'content-type': rawName.endsWith('.svg') ? 'image/svg+xml' : 'image/png' }
        let settled = false
        receiveUpload(
          req,
          {},
          rawName,
          (_res, status, body) => {
            if (settled === true) return
            settled = true
            resolve({ status, body })
          },
          { uploadDir },
        )
      })
    const safe = await run('art.svg', '<svg xmlns="http://www.w3.org/2000/svg"><rect width="2" height="2"/></svg>')
    assert.equal(safe.status, 200, 'a passive SVG upload is accepted')
    assert.ok(existsSync(join(uploadDir, safe.body.item.id.replace('uploads/', ''))), 'accepted SVG is written')
    const unsafe = await run('bad.svg', '<svg onload="alert(1)"><script>1</script></svg>')
    assert.equal(unsafe.status, 400, 'an active SVG upload is rejected')
    assert.match(String(unsafe.body.error), /passive image/i, 'the rejection reason is readable')
    assert.equal(
      readdirSync(uploadDir).some((name) => name.startsWith('bad')),
      false,
      'a rejected SVG leaves no partial upload behind',
    )
  })
})

// ---- scene projects: catalog + per-segment containment ----
test('scene projects are discovered from project.json', () => {
  const root = mkdtempSync(join(tmpdir(), 'tl-scene-'))
  try {
    const dir = join(root, '3122339805')
    mkdirSync(dir)
    writeFileSync(join(dir, 'project.json'), JSON.stringify({ title: 'Night', type: 'scene', file: 'scene.pkg', preview: 'preview.jpg' }))
    writeFileSync(join(dir, 'scene.pkg'), 'pkg')
    writeFileSync(join(dir, 'preview.jpg'), 'jpg')
    const items = listSceneProjects([root])
    assert.equal(items.length, 1)
    assert.equal(items[0].kind, 'scene')
    assert.equal(items[0].title, 'Night')
    assert.ok(items[0].url.endsWith('/_scene-project/0/3122339805'))
    assert.ok(items[0].preview.endsWith('/preview.jpg'))
    assert.ok(items[0].bytes > 0)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('scene file paths reject traversal and executable extensions', () => {
  const root = mkdtempSync(join(tmpdir(), 'tl-scene-'))
  try {
    writeFileSync(join(root, 'scene.pkg'), 'pkg')
    mkdirSync(join(root, 'textures'))
    writeFileSync(join(root, 'textures', 'a.png'), 'png')
    assert.ok(sceneFilePath(root, ['scene.pkg']) !== null)
    assert.ok(sceneFilePath(root, ['textures', 'a.png']) !== null)
    for (const bad of [['..', 'x.json'], ['..%2Fx.json'], ['evil.html'], ['evil.js'], ['textures', '..%2F..%2Fwe-roots.json']]) {
      assert.equal(sceneFilePath(root, bad), null, bad.join('/'))
    }
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

// ---- v0.5.0 host settings store (`_settings`) ----
test('settings keys are the mirrored localStorage prefixes only', () => {
  for (const ok of ['tianlight.wallpaper', 'tianlight.font.family', 'dsh-tianlight:cat:v1']) {
    assert.ok(isSettingKey(ok), ok)
  }
  for (const bad of ['', 'tianlight', 'tianlight.', 'wallpaper', '../tianlight.x', 'tianlight.x\ny', 'tianlight.' + 'k'.repeat(200), 42, null]) {
    assert.equal(isSettingKey(bad), false, String(bad))
  }
})

test('settings payload rejects wrong shapes, prefixes, values and sizes', () => {
  assert.equal(validateSettingsPayload(null).ok, false)
  assert.equal(validateSettingsPayload([]).ok, false)
  assert.equal(validateSettingsPayload({ settings: [1] }).ok, false)
  assert.equal(validateSettingsPayload({ settings: null }).ok, false)
  assert.equal(validateSettingsPayload({ settings: { wallpaper: 'x' } }).ok, false)
  assert.equal(validateSettingsPayload({ settings: { 'tianlight.wallpaper': 42 } }).ok, false)
  assert.equal(validateSettingsPayload({ settings: {}, revision: -1 }).ok, false)
  assert.equal(validateSettingsPayload({ settings: {}, revision: 'x' }).ok, false)
  const tooMany = {}
  for (let index = 0; index <= MAX_SETTING_KEYS; index += 1) tooMany['tianlight.k' + index] = 'x'
  assert.equal(validateSettingsPayload({ settings: tooMany }).status, 413)
  const huge = { 'tianlight.wallpaper': 'x'.repeat(MAX_SETTINGS_BYTES + 1) }
  assert.equal(validateSettingsPayload({ settings: huge }).status, 413)
})

test('settings payload accepts strings and null tombstones', () => {
  const validated = validateSettingsPayload({
    revision: 4,
    settings: { 'tianlight.wallpaper': '{"kind":"video"}', 'dsh-tianlight:cat:v1': null },
  })
  assert.equal(validated.ok, true)
  assert.equal(validated.revision, 4)
  assert.deepEqual(validated.settings, {
    'tianlight.wallpaper': '{"kind":"video"}',
    'dsh-tianlight:cat:v1': null,
  })
})

test('settings store starts from empty defaults when the file is missing', () => {
  withTempDir('tl-settings-', (dir) => {
    const store = new SettingsStore(join(dir, 'state', 'settings.json'))
    const state = store.read()
    assert.equal(state.schemaVersion, SCHEMA_VERSION)
    assert.equal(state.revision, 0)
    assert.equal(state.updatedAt, null)
    assert.deepEqual(state.settings, {})
  })
})

test('settings store revisions only grow (last write wins) and patches merge', () => {
  withTempDir('tl-settings-', (dir) => {
    const store = new SettingsStore(join(dir, 'state', 'settings.json'))
    const first = store.put({ revision: 0, settings: { 'tianlight.wallpaper': 'a' } })
    assert.equal(first.ok, true)
    assert.equal(first.revision, 1)
    // A stale revision from a second window must not lower the counter: E3 is
    // last-write-wins, the host counter is monotonic.
    const second = store.put({ revision: 0, settings: { 'tianlight.fps': '60' } })
    assert.equal(second.ok, true)
    assert.equal(second.revision, 2)
    const state = store.read()
    assert.equal(state.revision, 2)
    assert.deepEqual(state.settings, { 'tianlight.wallpaper': 'a', 'tianlight.fps': '60' })
    assert.match(String(state.updatedAt), /^\d{4}-\d{2}-\d{2}T/)
  })
})

test('settings store survives a corrupt file and stays writable', () => {
  withTempDir('tl-settings-', (dir) => {
    const file = join(dir, 'state', 'settings.json')
    mkdirSync(join(dir, 'state'), { recursive: true })
    writeFileSync(file, '{not json at all', 'utf8')
    const store = new SettingsStore(file)
    assert.deepEqual(store.read().settings, {})
    const written = store.put({ settings: { 'tianlight.glass': '0.8' } })
    assert.equal(written.ok, true)
    assert.equal(store.read().settings['tianlight.glass'], '0.8')
  })
})

test('settings store writes atomically and DELETE clears with a new revision', () => {
  withTempDir('tl-settings-', (dir) => {
    const stateDir = join(dir, 'state')
    const store = new SettingsStore(join(stateDir, 'settings.json'))
    store.put({ settings: { 'tianlight.wallpaper': 'x' } })
    assert.deepEqual(readdirSync(stateDir), ['settings.json'])
    const cleared = store.clear()
    assert.equal(cleared.ok, true)
    assert.equal(cleared.revision, 2)
    assert.deepEqual(store.read().settings, {})
  })
})

test('stored settings snapshots are sanitized on load', () => {
  const sanitized = sanitizeSettingsState({
    revision: 'nope',
    updatedAt: 42,
    settings: {
      'tianlight.a': 'x',
      bad: 'y',
      'tianlight.b': 7,
      'tianlight.c': null,
      // Legacy file from before the data/settings split: per-browser data is dropped.
      'tianlight.petChats.v1': 'chat',
      'tianlight.life.v1': 'life',
    },
  })
  assert.equal(sanitized.revision, 0)
  assert.equal(sanitized.updatedAt, null)
  assert.deepEqual(sanitized.settings, { 'tianlight.a': 'x', 'tianlight.c': null })
})

// ---- v0.6.1: revision conflict detection + per-browser data isolation ----

test('per-browser data keys are excluded from the settings mirror', () => {
  for (const key of [
    'tianlight.petChats.v1',
    'tianlight.petMind.v1',
    'tianlight.life.v1',
    'tianlight.pet.agent.v1',
    'tianlight.cache.known',
  ]) {
    // Prefix-valid (old clients keep pushing their whole map) but explicitly data.
    assert.ok(isSettingKey(key), key)
    assert.equal(isDataSettingKey(key), true, key)
    assert.equal(DATA_SETTING_KEYS.includes(key), true, key)
  }
  assert.equal(isDataSettingKey('tianlight.wallpaper'), false)
  const mixed = validateSettingsPayload({
    settings: {
      'tianlight.wallpaper': '{"kind":"image"}',
      'tianlight.petChats.v1': 'huge-chat',
      'tianlight.petMind.v1': 'thought',
    },
  })
  assert.equal(mixed.ok, true)
  assert.deepEqual(mixed.settings, { 'tianlight.wallpaper': '{"kind":"image"}' })
  assert.equal(mixed.droppedDataKeys, 2)
})

test('settings store never stores/returns/keeps legacy data keys', () => {
  withTempDir('tl-settings-', (dir) => {
    const file = join(dir, 'state', 'settings.json')
    mkdirSync(join(dir, 'state'), { recursive: true })
    writeFileSync(
      file,
      JSON.stringify({
        schemaVersion: SCHEMA_VERSION,
        revision: 7,
        settings: { 'tianlight.wallpaper': 'a', 'tianlight.petChats.v1': 'chat', 'tianlight.life.v1': 'life' },
      }),
      'utf8',
    )
    const store = new SettingsStore(file)
    // A legacy host file is projected without its data keys immediately...
    assert.deepEqual(store.read().settings, { 'tianlight.wallpaper': 'a' })
    const written = store.put({ expectedRevision: 7, settings: { 'tianlight.fps': '60', 'tianlight.petChats.v1': 'chat2' } })
    assert.equal(written.ok, true)
    assert.deepEqual(written.settings, { 'tianlight.wallpaper': 'a', 'tianlight.fps': '60' })
    // ...and the next successful PUT rewrites the file without them.
    const onDisk = JSON.parse(readFileSync(file, 'utf8'))
    assert.deepEqual(onDisk.settings, { 'tianlight.wallpaper': 'a', 'tianlight.fps': '60' })
    // The read-only export projection strips data keys from any state document.
    assert.deepEqual(stripDataSettings({ revision: 1, settings: { 'tianlight.petMind.v1': 'x', 'tianlight.glass': '1' } }).settings, {
      'tianlight.glass': '1',
    })
  })
})

test('settings store 409s a stale expectedRevision and serializes the current state', () => {
  withTempDir('tl-settings-', (dir) => {
    const store = new SettingsStore(join(dir, 'state', 'settings.json'))
    const first = store.put({ expectedRevision: 0, settings: { 'tianlight.wallpaper': 'a' } })
    assert.equal(first.ok, true)
    assert.equal(first.revision, 1)
    // Another window wrote "y" in between; a stale write must not silently replace it.
    const conflict = store.put({ expectedRevision: 0, settings: { 'tianlight.fps': '60' } })
    assert.equal(conflict.ok, false)
    assert.equal(conflict.status, 409)
    assert.equal(conflict.conflict, true)
    assert.equal(conflict.revision, 1)
    assert.deepEqual(conflict.settings, { 'tianlight.wallpaper': 'a' })
    assert.deepEqual(store.read().settings, { 'tianlight.wallpaper': 'a' })
    // A client that merged the snapshot and retried with the new revision lands both.
    const retry = store.put({ expectedRevision: 1, settings: { 'tianlight.fps': '60' } })
    assert.equal(retry.ok, true)
    assert.equal(retry.revision, 2)
    assert.deepEqual(retry.settings, { 'tianlight.wallpaper': 'a', 'tianlight.fps': '60' })
    // v0.5.2 tombstone semantics survive the conflict path: explicit null still deletes.
    const tombstone = store.put({ expectedRevision: 2, settings: { 'tianlight.fps': null } })
    assert.equal(tombstone.ok, true)
    assert.deepEqual(tombstone.settings, { 'tianlight.wallpaper': 'a', 'tianlight.fps': null })
    // Compatibility: a pre-v0.6.1 client (no expectedRevision) keeps last-write-wins.
    const legacy = store.put({ revision: 0, settings: { 'tianlight.glass': '0.8' } })
    assert.equal(legacy.ok, true)
    assert.equal(legacy.revision, 4)
    // Malformed optimistic tokens are rejected, never treated as LWW.
    assert.equal(store.put({ expectedRevision: '1', settings: {} }).status, 400)
    assert.equal(store.put({ expectedRevision: -1, settings: {} }).status, 400)
  })
})

// ---- v0.5.0 bundle (tar.gz export/import) ----
const readTarEntries = async (buffer, options = {}) => {
  const collected = []
  await parseTar(Readable.from([buffer]), {
    ...options,
    onEntry: async (entry) => {
      const chunks = []
      for await (const chunk of entry.data) chunks.push(chunk)
      collected.push({ name: entry.name, size: entry.size, data: Buffer.concat(chunks).toString('utf8') })
    },
  })
  return collected
}

await testAsync('tar round trip preserves long names and bytes', async () => {
  const files = [
    { name: 'manifest.json', data: '{"format":"tianlight-bundle"}' },
    { name: 'settings.json', data: '{"settings":{}}' },
    { name: 'wallpapers/sky.mp4', data: 'video-bytes' },
    // >100 bytes total: exercises the ustar prefix/name split.
    { name: 'wallpapers/uploads/' + 'x'.repeat(85) + '.webp', data: 'webp-bytes' },
  ]
  const entries = await readTarEntries(buildTarBuffer(files))
  assert.deepEqual(entries.map((entry) => entry.name), files.map((file) => file.name))
  assert.deepEqual(entries.map((entry) => entry.data), files.map((file) => file.data))
  for (const entry of entries) assert.equal(entry.size, Buffer.byteLength(entry.data))
})

await testAsync('tar paths reject traversal, absolute names and backslashes', async () => {
  for (const bad of [
    '../evil.mp4',
    '/abs/evil.mp4',
    'wallpapers/../../evil.mp4',
    'wallpapers\\evil.mp4',
    'C:/evil.mp4',
    'wallpapers//evil.mp4',
    'wallpapers/./evil.mp4',
    '.',
    '..',
    '',
  ]) {
    assert.equal(validateBundleEntryName(bad), null, bad)
    assert.equal(classifyBundleEntry(bad).kind, 'invalid', bad)
  }
  assert.notEqual(validateBundleEntryName('wallpapers/uploads/sky.mp4'), null)
  assert.equal(classifyBundleEntry('wallpapers/uploads/sky.mp4').kind, 'wallpaper')
  // S3: export and import share one format table, so .svg/.avif round-trip instead
  // of being exported-but-skipped (the old hand-written IMPORT_EXT drifted).
  assert.equal(classifyBundleEntry('wallpapers/uploads/art.svg').kind, 'wallpaper')
  assert.equal(classifyBundleEntry('wallpapers/uploads/photo.avif').kind, 'wallpaper')
  assert.equal(classifyBundleEntry('notes.txt').kind, 'skip')
  assert.equal(classifyBundleEntry('settings.json').kind, 'settings')
  assert.equal(classifyBundleEntry('manifest.json').kind, 'manifest')
  // An archive that carries an unsafe entry skips that entry (per-item policy,
  // documented in V050-FEATURES D2) and never yields it to the importer.
  const malicious = buildTarBuffer([
    { name: '../evil.mp4', data: 'x' },
    { name: 'wallpapers/ok.png', data: 'png' },
  ])
  const seen = []
  const result = await parseTar(Readable.from([malicious]), {
    onEntry: async (entry) => {
      seen.push(entry.name)
    },
  })
  assert.deepEqual(seen, ['wallpapers/ok.png'])
  assert.deepEqual(result.skipped, ['../evil.mp4'])
})

await testAsync('tar parser enforces entry-count and per-file size caps', async () => {
  const many = buildTarBuffer([
    { name: 'wallpapers/a.mp4', data: 'x' },
    { name: 'wallpapers/b.mp4', data: 'y' },
  ])
  await assert.rejects(
    () => parseTar(Readable.from([many]), { limits: { entries: 1 }, onEntry: async () => {} }),
    (error) => error.status === 413,
  )
  const oversized = buildTarBuffer([{ name: 'wallpapers/a.mp4', data: '0123456789' }])
  await assert.rejects(
    () => parseTar(Readable.from([oversized]), { limits: { fileBytes: 4 }, onEntry: async () => {} }),
    (error) => error.status === 413,
  )
})

await testAsync('tar parser rejects truncated archives and bad checksums', async () => {
  const archive = buildTarBuffer([{ name: 'wallpapers/a.mp4', data: '0123456789' }])
  const truncated = archive.subarray(0, 520) // header + 8 of 10 data bytes
  await assert.rejects(
    () => parseTar(Readable.from([truncated]), { onEntry: async () => {} }),
    (error) => error.status === 400,
  )
  const corrupted = buildTarBuffer([{ name: 'manifest.json', data: '{}' }])
  corrupted[10] = 0x41 // rename one header byte, checksum no longer matches
  await assert.rejects(
    () => parseTar(Readable.from([corrupted]), { onEntry: async () => {} }),
    (error) => error.status === 400,
  )
})

await testAsync('tar parser skips directories and unrelated entries', async () => {
  const archive = buildTarBuffer([
    { name: 'wallpapers/', data: '', type: '5' },
    { name: 'notes.txt', data: 'hi' },
    { name: 'wallpapers/a.png', data: 'png' },
  ])
  const seen = []
  const result = await parseTar(Readable.from([archive]), {
    onEntry: async (entry) => {
      seen.push(entry.name)
    },
  })
  // Directories are consumed by the parser; regular files reach the importer,
  // which classifies unrelated names as `skip`.
  assert.deepEqual(seen, ['notes.txt', 'wallpapers/a.png'])
  assert.equal(classifyBundleEntry('notes.txt').kind, 'skip')
  assert.equal(result.entries, 3)
  assert.equal(result.bytes, 5) // 0 + 2 + 3 declared bytes
})

// ---- v0.5.0 pre-crop frame cache (`_frame-cache`) ----
test('frame cache keys are opaque tokens, not paths', () => {
  for (const ok of ['bg-main.mp4.16x9.1920', 'a.webp', 'x1-p', '.hidden']) assert.ok(validCacheKey(ok), ok)
  for (const bad of ['', '../x', 'a/b', 'a\\b', 'A', 'x'.repeat(121), null, 42]) {
    assert.equal(validCacheKey(bad), false, String(bad))
  }
})

test('frame cache reports misses then hits and clears', () => {
  withTempDir('tl-cache-', (dir) => {
    const cache = new FrameCache({ dir: join(dir, 'frame-cache'), maxBytes: 1024 * 1024 })
    assert.equal(cache.lookup('frame.1'), null)
    cache.noteMiss()
    const webp = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBP'), Buffer.alloc(8)])
    assert.notEqual(cache.writeBuffer('frame.1', webp), null)
    assert.notEqual(cache.lookup('frame.1'), null)
    cache.noteHit()
    const status = cache.status()
    assert.equal(status.entries, 1)
    assert.equal(status.bytes, webp.length)
    assert.equal(status.hits, 1)
    assert.equal(status.misses, 1)
    assert.equal(status.maxBytes, 1024 * 1024)
    const cleared = cache.clear()
    assert.equal(cleared.cleared, 1)
    assert.equal(cleared.bytes, webp.length)
    assert.equal(cache.status().entries, 0)
  })
})

test('frame cache prunes the oldest entries to stay inside its budget', () => {
  withTempDir('tl-cache-', (dir) => {
    const cache = new FrameCache({ dir: join(dir, 'frame-cache'), maxBytes: 10 })
    cache.writeBuffer('first', Buffer.alloc(8, 1))
    cache.writeBuffer('second', Buffer.alloc(8, 2))
    const status = cache.status()
    assert.equal(status.entries, 1)
    assert.equal(status.bytes, 8)
  })
})

test('frame cache sniffs webp/png/jpeg bytes and rejects junk', () => {
  assert.equal(sniffImageType(Buffer.from('RIFF\x00\x00\x00\x00WEBPVP8 ')), 'image/webp')
  assert.equal(sniffImageType(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])), 'image/png')
  assert.equal(sniffImageType(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0])), 'image/jpeg')
  assert.equal(sniffImageType(Buffer.from('not an image at all')), null)
})

// ---- v0.5.0 optional ffmpeg transcode (`_transcode`) ----
test('transcode arg builder converts video containers to H.264', () => {
  const args = buildTranscodeArgs('sky.mp4', 'sky.h264.mp4')
  for (const flag of ['-y', '-i', '-c:v', 'libx264', '-crf', '20', '-preset', 'veryfast', '-movflags', '+faststart', '-an']) {
    assert.ok(args.includes(flag), flag)
  }
  assert.equal(args[args.indexOf('-i') + 1], 'sky.mp4')
  assert.equal(args[args.length - 1], 'sky.h264.mp4')
})

test('transcode arg builder scales GIFs to even dimensions', () => {
  const args = buildTranscodeArgs('anim.gif', 'anim.h264.mp4')
  assert.equal(args[args.indexOf('-vf') + 1], 'scale=trunc(iw/2)*2:trunc(ih/2)*2')
  assert.equal(args[args.indexOf('-pix_fmt') + 1], 'yuv420p')
  assert.equal(transcodeKind('anim.gif'), 'gif')
  assert.equal(transcodeKind('clip.webm'), 'video')
  assert.equal(transcodeKind('clip.MOV'), 'video')
  assert.equal(transcodeKind('cat.png'), null)
  assert.equal(buildTranscodeArgs('cat.png', 'out.mp4'), null)
})

test('transcode output names are deterministic and safe', () => {
  assert.equal(derivedOutputName('sky.mp4'), 'sky.h264.mp4')
  assert.equal(derivedOutputName('a.b.mov'), 'a.b.h264.mp4')
  assert.equal(derivedOutputName('my sky?.gif'), 'my-sky-.h264.mp4')
  assert.equal(derivedOutputName('.hidden'), 'hidden.h264.mp4')
  // R4B: the source directory is part of the key, so assets/x.mp4 and
  // uploads/x.mp4 no longer derive the same file and overwrite each other.
  assert.equal(derivedOutputName('sky.mp4', 'assets'), 'assets-sky.h264.mp4')
  assert.equal(derivedOutputName('sky.mp4', 'uploads'), 'uploads-sky.h264.mp4')
  assert.equal(derivedOutputName('sky.mp4', 'derived'), 'derived-sky.h264.mp4')
  assert.notEqual(derivedOutputName('x.mp4', 'assets'), derivedOutputName('x.mp4', 'uploads'))
})

test('derived catalog hides in-flight temp files', () => {
  withTempDir('tl-derived-', (dir) => {
    writeFileSync(join(dir, 'sky.h264.mp4'), 'mp4')
    writeFileSync(join(dir, 'sky.h264.part-1-abc.mp4'), 'partial')
    const items = listDerived(dir)
    assert.equal(items.length, 1)
    assert.equal(items[0].id, 'derived/sky.h264.mp4')
    assert.equal(items[0].kind, 'video')
    assert.ok(items[0].url.startsWith('/skin-tianlight/derived/'))
  })
})

await testAsync('ffmpeg detection reports absent for a missing binary (async probe)', async () => {
  const pending = detectFfmpeg({ command: 'tl-ffmpeg-not-installed-' + process.pid, force: true })
  assert.equal(typeof pending.then, 'function', 'R4B: probing must be async, not spawnSync')
  const status = await pending
  assert.equal(status.ffmpeg, false)
  assert.equal(status.version, null)
})

test('ffmpeg failure text is sanitized to one path-free line', () => {
  const multiline = sanitizeFfmpegMessage(
    'ffmpeg banner\nC:\\Users\\secret\\in.mp4: Invalid data found when processing input\nerror:   broken file\n',
  )
  assert.equal(multiline, 'error: broken file')
  const withPath = sanitizeFfmpegMessage('C:\\Users\\secret\\in.mp4: Invalid data')
  assert.ok(withPath.includes('[path]'), withPath)
  assert.equal(/[A-Za-z]:\\/.test(withPath), false)
  assert.ok(sanitizeFfmpegMessage('x'.repeat(1000)).length <= 300)
  assert.equal(sanitizeFfmpegMessage(null), '')
})

// ---- v0.5.0 web wallpapers (`_web-project`) ----
test('web projects are discovered from project.json type or html entry', () => {
  withTempDir('tl-web-', (root) => {
    const web = join(root, '1001')
    mkdirSync(web)
    writeFileSync(join(web, 'project.json'), JSON.stringify({ title: 'Rain', type: 'web', file: 'index.html', preview: 'preview.jpg' }))
    writeFileSync(join(web, 'index.html'), '<html></html>')
    writeFileSync(join(web, 'preview.jpg'), 'jpg')
    const scene = join(root, '1002')
    mkdirSync(scene)
    writeFileSync(join(scene, 'project.json'), JSON.stringify({ type: 'scene', file: 'scene.pkg' }))
    writeFileSync(join(scene, 'scene.pkg'), 'pkg')
    const htmlEntry = join(root, '1003')
    mkdirSync(htmlEntry)
    writeFileSync(join(htmlEntry, 'project.json'), JSON.stringify({ file: 'wall.html' }))
    writeFileSync(join(htmlEntry, 'wall.html'), '<html></html>')
    const items = listWebProjects([root])
    assert.equal(items.length, 2)
    const rain = items.find((item) => item.id === 'web:0:1001')
    assert.ok(rain !== undefined)
    assert.equal(rain.kind, 'web')
    assert.equal(rain.title, 'Rain')
    assert.ok(rain.url.startsWith('/skin-tianlight/_web-project/0/1001'))
    assert.ok(rain.preview.endsWith('/preview.jpg'))
    assert.ok(rain.bytes > 0)
    const fallback = items.find((item) => item.id === 'web:0:1003')
    assert.ok(fallback !== undefined)
    assert.equal(fallback.file, 'wall.html')
    assert.equal(isWebProject({ type: 'scene' }), false)
    assert.equal(isWebProject({ file: 'page.html' }), true)
    assert.notEqual(resolveWebProjectDir([root], 0, '1001'), null)
    assert.equal(resolveWebProjectDir([root], 0, '1002'), null)
    assert.equal(resolveWebProjectDir([root], 0, '../x'), null)
    assert.equal(resolveWebProjectDir([root], 9, '1001'), null)
  })
})

test('web project file paths reject traversal and executables', () => {
  withTempDir('tl-web-', (dir) => {
    mkdirSync(join(dir, 'assets'))
    writeFileSync(join(dir, 'project.json'), JSON.stringify({ type: 'web', file: 'index.html' }))
    writeFileSync(join(dir, 'index.html'), '<html></html>')
    writeFileSync(join(dir, 'app.js'), 'console.log(1)')
    writeFileSync(join(dir, 'assets', 'sub.css'), 'body{}')
    writeFileSync(join(dir, 'evil.exe'), 'MZ')
    assert.ok(webProjectFilePath(dir, []).endsWith('index.html'))
    assert.ok(webProjectFilePath(dir, ['app.js']) !== null)
    assert.ok(webProjectFilePath(dir, ['assets', 'sub.css']) !== null)
    for (const bad of [
      ['..', 'x.html'],
      ['..%2F..%2Fpackage.json'],
      ['%2e%2e%2f%2e%2e%2fx.html'],
      ['evil.exe'],
      ['app.js%00.html'],
      ['assets'],
    ]) {
      assert.equal(webProjectFilePath(dir, bad), null, bad.join('/'))
    }
  })
})

test('web project CSP pins the page to an opaque origin', () => {
  assert.match(WEB_CSP, /default-src 'none'/)
  assert.match(WEB_CSP, /sandbox allow-scripts/)
  assert.match(WEB_CSP, /object-src 'none'/)
  assert.match(WEB_CSP, /base-uri 'none'/)
  assert.ok(WEB_FILE_EXT.has('.html') && WEB_FILE_EXT.has('.js') && WEB_FILE_EXT.has('.wasm') && WEB_FILE_EXT.has('.woff2'))
  assert.equal(WEB_FILE_EXT.has('.exe'), false)
  assert.equal(WEB_FILE_EXT.has('.pkg'), false)
})

// ---- v0.5.0 engine capabilities (`_engines`) ----
await testAsync('engine status advertises v0.5.0 capabilities with cache/settings shape', async () => {
  const status = await engineStatus(new URL('http://localhost/skin-tianlight/_engines'))
  assert.equal(status.build, PKG_VERSION)
  assert.equal(typeof status.api, 'string')
  assert.ok(status.api !== '', 'api marker')
  // A plain GET states no expectation, so the host makes no handshake verdict.
  assert.equal(status.stale, undefined)
  assert.equal(status.webwallgl, true)
  assert.equal(status.adapter, true)
  assert.ok(Number.isInteger(status.sceneProjects))
  assert.ok(Number.isInteger(status.webProjects))
  assert.ok(status.upload !== null && Number.isInteger(status.upload.max))
  assert.equal(typeof status.ffmpeg, 'boolean')
  for (const key of ['entries', 'bytes', 'hits', 'misses', 'maxBytes']) {
    assert.ok(Object.hasOwn(status.cache, key), key)
  }
  assert.ok(Number.isInteger(status.settings.revision))
  for (const key of ['settings', 'bundle', 'frameCache', 'transcode', 'webWallpapers']) {
    assert.ok(Object.hasOwn(status.capabilities, key), key)
  }
  assert.equal(status.capabilities.settings, true)
  assert.equal(status.capabilities.bundle, true)
  assert.equal(status.capabilities.frameCache, true)
  assert.equal(status.capabilities.webWallpapers, true)
  assert.equal(typeof status.capabilities.transcode, 'boolean')
})

// ---- HOST_API handshake: build numbers are diagnostics, the route contract is the gate.
// Only a contract mismatch forces a restart; a browser-half-only release must not.
await testAsync('engine status uses the HOST_API route contract for the handshake', async () => {
  const api = (await engineStatus(new URL('http://localhost/skin-tianlight/_engines'))).api
  assert.equal((await engineStatus(new URL('http://localhost/skin-tianlight/_engines?api=' + encodeURIComponent(api)))).stale, false)
  assert.equal((await engineStatus(new URL('http://localhost/skin-tianlight/_engines?api=' + encodeURIComponent(api + '-next')))).stale, true)
})

await testAsync('engine status keeps the legacy build handshake for old clients', async () => {
  assert.equal((await engineStatus(new URL('http://localhost/skin-tianlight/_engines?build=' + PKG_VERSION))).stale, false)
  assert.equal((await engineStatus(new URL('http://localhost/skin-tianlight/_engines?build=0.4.0'))).stale, true)
  assert.equal((await engineStatus(new URL('http://localhost/skin-tianlight/_engines'))).stale, undefined)
})

await testAsync('api takes priority over the legacy build parameter when both are sent', async () => {
  const api = (await engineStatus(new URL('http://localhost/skin-tianlight/_engines'))).api
  assert.equal((await engineStatus(new URL('http://localhost/skin-tianlight/_engines?api=' + encodeURIComponent(api) + '&build=0.4.0'))).stale, false)
  assert.equal((await engineStatus(new URL('http://localhost/skin-tianlight/_engines?api=0&build=' + PKG_VERSION))).stale, true)
})

// ---- v0.5.0 route-level behaviour (fake req/res, temp dirs only) ----
await testAsync('settings route gates content type/size/JSON before writing', async () => {
  await withTempDirAsync('tl-route-', async (dir) => {
    const store = new SettingsStore(join(dir, 'state', 'settings.json'))
    const mount = (req, res) => handleSettings(req, res, store)
    const notJson = await callRoute(mount, 'PUT', '/skin-tianlight/_settings', { 'content-type': 'text/plain' }, '{}')
    assert.equal(notJson.status, 415)
    const badJson = await callRoute(mount, 'PUT', '/skin-tianlight/_settings', { 'content-type': 'application/json' }, '{broken')
    assert.equal(badJson.status, 400)
    const noSettings = await callRoute(
      mount,
      'PUT',
      '/skin-tianlight/_settings',
      { 'content-type': 'application/json' },
      JSON.stringify({ settings: [] }),
    )
    assert.equal(noSettings.status, 400)
    const tooLarge = await callRoute(
      mount,
      'PUT',
      '/skin-tianlight/_settings',
      { 'content-type': 'application/json', 'content-length': String(MAX_SETTINGS_BYTES + 1) },
      '{}',
    )
    assert.equal(tooLarge.status, 413)
    // None of the rejected requests may have reached the file.
    assert.deepEqual(store.read().settings, {})
    assert.equal(existsSync(join(dir, 'state', 'settings.json')), false)

    const put = await callRoute(
      mount,
      'PUT',
      '/skin-tianlight/_settings',
      { 'content-type': 'application/json' },
      JSON.stringify({ revision: 0, settings: { 'tianlight.wallpaper': '{"kind":"image"}' } }),
    )
    assert.equal(put.status, 200)
    assert.equal(put.bodyJson().revision, 1)

    const get = await callRoute(mount, 'GET', '/skin-tianlight/_settings')
    assert.equal(get.status, 200)
    const payload = get.bodyJson()
    assert.equal(payload.ok, true)
    assert.equal(payload.schemaVersion, 5)
    assert.equal(payload.revision, 1)
    assert.equal(payload.settings['tianlight.wallpaper'], '{"kind":"image"}')

    // v0.6.1: a stale expectedRevision is a 409 carrying the authoritative state,
    // and the rejected patch must not have been written.
    const stale = await callRoute(
      mount,
      'PUT',
      '/skin-tianlight/_settings',
      { 'content-type': 'application/json' },
      JSON.stringify({ expectedRevision: 0, settings: { 'tianlight.fps': '60' } }),
    )
    assert.equal(stale.status, 409)
    const staleBody = stale.bodyJson()
    assert.equal(staleBody.ok, false)
    assert.equal(staleBody.conflict, true)
    assert.equal(staleBody.revision, 1)
    assert.equal(staleBody.settings['tianlight.wallpaper'], '{"kind":"image"}')
    assert.equal(Object.prototype.hasOwnProperty.call(staleBody.settings, 'tianlight.fps'), false)
    assert.equal(store.read().settings['tianlight.fps'], undefined)
    const badExpected = await callRoute(
      mount,
      'PUT',
      '/skin-tianlight/_settings',
      { 'content-type': 'application/json' },
      JSON.stringify({ expectedRevision: 'soon', settings: {} }),
    )
    assert.equal(badExpected.status, 400)

    // Old clients push their whole map (data keys included) and keep last-write-wins:
    // data keys are ignored, settings keys land, and the reply is the merged state.
    const dataPut = await callRoute(
      mount,
      'PUT',
      '/skin-tianlight/_settings',
      { 'content-type': 'application/json' },
      JSON.stringify({ revision: 0, settings: { 'tianlight.petChats.v1': 'chat', 'tianlight.glass': '0.9' } }),
    )
    assert.equal(dataPut.status, 200)
    assert.equal(dataPut.bodyJson().revision, 2)
    assert.equal('tianlight.petChats.v1' in dataPut.bodyJson().settings, false)
    assert.equal(dataPut.bodyJson().settings['tianlight.glass'], '0.9')
    assert.equal(dataPut.bodyJson().settings['tianlight.wallpaper'], '{"kind":"image"}')

    const del = await callRoute(mount, 'DELETE', '/skin-tianlight/_settings')
    assert.equal(del.status, 200)
    assert.equal(del.bodyJson().revision, 3)
    const post = await callRoute(mount, 'POST', '/skin-tianlight/_settings', { 'content-type': 'application/json' }, '{}')
    assert.equal(post.status, 405)
  })
})

await testAsync('bundle export streams a tar.gz that import round-trips', async () => {
  await withTempDirAsync('tl-bundle-', async (dir) => {
    const videoPath = join(dir, 'source.mp4')
    const imagePath = join(dir, 'still.webp')
    const svgPath = join(dir, 'art.svg')
    const avifPath = join(dir, 'photo.avif')
    writeFileSync(videoPath, 'video-payload')
    writeFileSync(imagePath, 'RIFF....WEBP')
    writeFileSync(svgPath, '<svg xmlns="http://www.w3.org/2000/svg"><rect width="4" height="4"/></svg>')
    writeFileSync(avifPath, 'avif-bytes')
    const files = [
      { name: 'wallpapers/clip.mp4', path: videoPath },
      { name: 'wallpapers/uploads/still.webp', path: imagePath },
      { name: 'wallpapers/uploads/art.svg', path: svgPath },
      { name: 'wallpapers/uploads/photo.avif', path: avifPath },
    ]
    const state = {
      schemaVersion: 5,
      revision: 3,
      updatedAt: '2026-11-09T00:00:00.000Z',
      settings: { 'tianlight.wallpaper': '{"kind":"video"}' },
    }
    const exported = await callRoute(
      (req, res) => handleBundle(req, res, { build: PKG_VERSION, state, files }),
      'GET',
      '/skin-tianlight/_bundle',
    )
    assert.equal(exported.status, 200)
    assert.match(String(exported.headers['content-type']), /gzip/)
    assert.match(String(exported.headers['content-disposition']), /tianlight-bundle-.*\.tar\.gz/)
    const archive = gunzipSync(exported.body())
    const names = []
    let manifestText = null
    let settingsText = null
    await parseTar(Readable.from([archive]), {
      onEntry: async (entry) => {
        const chunks = []
        for await (const chunk of entry.data) chunks.push(chunk)
        names.push(entry.name)
        if (entry.name === 'manifest.json') manifestText = Buffer.concat(chunks).toString('utf8')
        if (entry.name === 'settings.json') settingsText = Buffer.concat(chunks).toString('utf8')
      },
    })
    assert.ok(names.includes('manifest.json'))
    assert.ok(names.includes('settings.json'))
    assert.ok(names.includes('wallpapers/clip.mp4'))
    assert.ok(names.includes('wallpapers/uploads/still.webp'))
    assert.ok(names.includes('wallpapers/uploads/art.svg'))
    assert.ok(names.includes('wallpapers/uploads/photo.avif'))
    assert.equal(JSON.parse(manifestText).format, 'tianlight-bundle')
    assert.equal(JSON.parse(manifestText).version, PKG_VERSION)
    assert.equal(JSON.parse(manifestText).media.policy, 'user-uploads-only', 'manifest declares the uploads-only policy')
    assert.equal(JSON.parse(manifestText).media.formats.includes('.svg'), true)
    assert.equal(JSON.parse(manifestText).media.formats.includes('.avif'), true)
    assert.equal(JSON.parse(settingsText).revision, 3)

    const store = new SettingsStore(join(dir, 'imported-state', 'settings.json'))
    const imported = await callRoute(
      (req, res) =>
        handleImport(req, res, {
          store,
          stagingDir: join(dir, 'staging'),
          uploadDir: join(dir, 'uploads'),
        }),
      'POST',
      '/skin-tianlight/_import',
      { 'content-type': 'application/gzip' },
      exported.body(),
    )
    assert.equal(imported.status, 200)
    const result = imported.bodyJson()
    assert.equal(result.ok, true)
    assert.deepEqual(result.imported.slice().sort(), ['art.svg', 'clip.mp4', 'photo.avif', 'still.webp'])
    assert.equal(result.revision, 1)
    assert.equal(result.settings['tianlight.wallpaper'], '{"kind":"video"}')
    assert.equal(readFileSync(join(dir, 'uploads', 'clip.mp4'), 'utf8'), 'video-payload')
    assert.equal(readFileSync(join(dir, 'uploads', 'still.webp'), 'utf8'), 'RIFF....WEBP')
    assert.equal(readFileSync(join(dir, 'uploads', 'art.svg'), 'utf8'), readFileSync(svgPath, 'utf8'))
    assert.equal(readFileSync(join(dir, 'uploads', 'photo.avif'), 'utf8'), 'avif-bytes')
    assert.equal(existsSync(join(dir, 'staging')), false)
  })
})

await testAsync('bundle exports user uploads only and skips built-in demo media', async () => {
  await withTempDirAsync('tl-bundle-s3-', async (dir) => {
    const uploadDir = join(dir, 'uploads')
    mkdirSync(uploadDir, { recursive: true })
    writeFileSync(join(uploadDir, 'user-clip.mp4'), 'user-video')
    writeFileSync(join(uploadDir, 'art.svg'), '<svg xmlns="http://www.w3.org/2000/svg"><circle r="2"/></svg>')
    writeFileSync(join(uploadDir, 'evil.svg'), '<svg><svg:script xmlns:svg="http://www.w3.org/2000/svg">1</svg:script></svg>')
    writeFileSync(join(uploadDir, 'photo.avif'), 'avif')
    // Legacy collision: a copied built-in name must not become a duplicate upload.
    writeFileSync(join(uploadDir, 'bg-main.mp4'), 'copied-demo')
    writeFileSync(join(uploadDir, 'cat.png'), 'copied-cat')
    writeFileSync(join(uploadDir, 'notes.txt'), 'not-media')

    const listed = listBundleWallpapers({ uploadDir })
    assert.deepEqual(
      listed.map((entry) => entry.name),
      [
        'wallpapers/uploads/art.svg',
        'wallpapers/uploads/bg-main.mp4',
        'wallpapers/uploads/cat.png',
        'wallpapers/uploads/photo.avif',
        'wallpapers/uploads/user-clip.mp4',
      ],
      'uploads are user content even with a demo basename; only non-media is excluded',
    )
    assert.equal(
      listed.some((entry) => entry.name.endsWith('evil.svg')),
      false,
      'S3b: an unsafe legacy upload is never exported into a new pack',
    )
    assert.equal(isBundleBuiltinMedia('bg-main.mp4'), true)
    assert.equal(isBundleBuiltinMedia('cat.png'), true)
    assert.equal(isBundleBuiltinMedia('user-clip.mp4'), false)
    // Production defaults (real asset/upload dirs) list uploads only; the check is
    // env-independent (an empty uploads dir still passes).
    const realList = listBundleWallpapers()
    assert.ok(realList.every((entry) => entry.name.startsWith('wallpapers/uploads/')), 'production export lists uploads only')

    // An OLDER bundle still contains the shipped demo files: import must skip them
    // (they already exist on disk) without copying duplicates into uploads.
    const store = new SettingsStore(join(dir, 'state', 'settings.json'))
    const legacy = gzipSync(
      buildTarBuffer([
        { name: 'wallpapers/bg-main.mp4', data: 'demo-bytes' },
        { name: 'wallpapers/cat.png', data: 'cat-bytes' },
        { name: 'wallpapers/uploads/mine.mp4', data: 'mine-bytes' },
        { name: 'wallpapers/uploads/pet.svg', data: '<svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>' },
        // A USER upload may share a demo basename; it must still round-trip.
        { name: 'wallpapers/uploads/bg-main.mp4', data: 'user-video' },
        { name: 'wallpapers/uploads/cat.png', data: 'user-cat' },
        { name: 'wallpapers/uploads/unknown.bmp', data: 'skip-bytes' },
      ]),
    )
    const imported = await callRoute(
      (req, res) => handleImport(req, res, { store, stagingDir: join(dir, 'staging'), uploadDir: join(dir, 'pool') }),
      'POST',
      '/skin-tianlight/_import',
      { 'content-type': 'application/gzip' },
      legacy,
    )
    assert.equal(imported.status, 200)
    const result = imported.bodyJson()
    assert.deepEqual(
      result.imported.slice().sort(),
      ['bg-main.mp4', 'cat.png', 'mine.mp4', 'pet.svg'],
      'user media round-trips (even with a demo basename); legacy built-ins and unknown formats do not',
    )
    assert.equal(result.skipped.some((name) => name === 'wallpapers/bg-main.mp4 (built-in media already installed)'), true, 'legacy built-in reported as skipped')
    assert.equal(result.skipped.some((name) => name === 'wallpapers/cat.png (built-in media already installed)'), true, 'legacy companion art reported as skipped')
    assert.equal(readFileSync(join(dir, 'pool', 'bg-main.mp4'), 'utf8'), 'user-video', 'user upload keeps its own bytes (no duplicate demo)')
    assert.equal(readFileSync(join(dir, 'pool', 'cat.png'), 'utf8'), 'user-cat', 'user upload keeps its own bytes (no duplicate companion art)')
    assert.equal(readFileSync(join(dir, 'pool', 'mine.mp4'), 'utf8'), 'mine-bytes')
    assert.equal(existsSync(join(dir, 'staging')), false)

    // S3b: an active-content SVG in an OLD bundle is skipped per-item (readable
    // reason in `skipped`); the rest of the pack still imports and nothing unsafe
    // is published. (New imports into uploads are rejected at the upload sink.)
    const unsafeSvg = gzipSync(
      buildTarBuffer([
        { name: 'wallpapers/uploads/bad.svg', data: '<svg><svg:script xmlns:svg="http://www.w3.org/2000/svg">1</svg:script></svg>' },
        { name: 'wallpapers/uploads/good.svg', data: '<svg xmlns="http://www.w3.org/2000/svg"><rect width="2" height="2"/></svg>' },
      ]),
    )
    const skippedSvgImport = await callRoute(
      (req, res) => handleImport(req, res, { store, stagingDir: join(dir, 'staging2'), uploadDir: join(dir, 'pool2') }),
      'POST',
      '/skin-tianlight/_import',
      { 'content-type': 'application/gzip' },
      unsafeSvg,
    )
    assert.equal(skippedSvgImport.status, 200, 'an unsafe SVG in an old bundle does not abort the import')
    const skippedSvgResult = skippedSvgImport.bodyJson()
    assert.deepEqual(skippedSvgResult.imported, ['good.svg'], 'safe SVG still imports')
    assert.ok(
      skippedSvgResult.skipped.some((name) => name.includes('bad.svg') && name.includes('unsafe SVG')),
      'unsafe SVG skip reason is readable',
    )
    assert.equal(existsSync(join(dir, 'pool2', 'bad.svg')), false, 'unsafe SVG is never published')
    assert.ok(existsSync(join(dir, 'pool2', 'good.svg')), 'safe SVG is published')
    assert.equal(existsSync(join(dir, 'staging2')), false, 'skip path leaves no staging files')

    // Shared SVG policy (used by both the upload sink and bundle import): the
    // REV-S3 bypass cases below must all be rejected after decoding/namespace
    // normalisation, and ordinary namespace-safe SVG must still pass.
    const safeSvg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><rect width="1" height="1"/></svg>')
    assert.deepEqual(isSafeSvgBuffer(safeSvg), { ok: true, reason: null })
    const safeVariants = [
      '<svg/>',
      '<svg:svg xmlns:svg="http://www.w3.org/2000/svg"><svg:rect width="1" height="1"/></svg:svg>',
      '<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg"><use href="#a"/><defs><rect id="a"/></defs></svg>',
      '<svg xmlns="http://www.w3.org/2000/svg"><style>rect{fill:url(#grad)}</style><linearGradient id="grad"><stop offset="0"/></linearGradient></svg>',
      '<svg xmlns="http://www.w3.org/2000/svg"><style>/* local only */ rect{fill:url(#grad)}</style><linearGradient id="grad"/></svg>',
    ]
    for (const payload of safeVariants) assert.equal(isSafeSvgBuffer(Buffer.from(payload)).ok, true, 'safe SVG accepted: ' + payload.slice(0, 60))
    for (const [name, payload] of [
      ['script', '<svg><script>fetch("/x")</script></svg>'],
      ['prefixed-script', '<svg:script xmlns:svg="http://www.w3.org/2000/svg">1</svg:script>'],
      ['foreign-prefixed', '<svg:foreignObject xmlns:svg="http://www.w3.org/2000/svg"><img src="x"/></svg:foreignObject>'],
      ['handler', '<svg><rect onload="x()"/></svg>'],
      ['js-url', '<svg><a href="javascript:alert(1)">x</a></svg>'],
      ['charref-js', '<svg><a href="&#106;avascript:alert(1)">x</a></svg>'],
      ['charref-js-colon', '<svg><a href="javascript&#58;alert(1)">x</a></svg>'],
      ['charref-js-hex', '<svg><a href="&#x6a;avascript&#x3a;alert(1)">x</a></svg>'],
      ['foreign', '<svg><foreignObject><img src=x/></foreignObject></svg>'],
      ['entity', '<!DOCTYPE svg [<!ENTITY x "y">]><svg>&x;</svg>'],
      ['doctype-system', '<!DOCTYPE svg SYSTEM "https://evil.example/x.dtd"><svg/>'],
      ['pi-stylesheet', '<svg><?xml-stylesheet href="https://evil.example/x.css"?></svg>'],
      ['cdata', '<svg><![CDATA[<script>1</script>]]></svg>'],
      ['external', '<svg><image href="https://evil.example/x.png"/></svg>'],
      ['feimage-external', '<svg><feImage href="https://evil.example/x.png"/></svg>'],
      ['css-external', '<svg><style>rect{fill:url(&#104;ttps://evil.example/x)}</style></svg>'],
      ['css-import', '<svg><style>@import url(https://evil.example/x.css);</style></svg>'],
      ['css-import-comment-split', '<svg><style>@im/**/port "https://evil.example/x.css";</style></svg>'],
      ['css-url-comment-split', '<svg><style>rect{fill:u/**/rl(https://evil.example/x)}</style></svg>'],
      ['css-image-set', '<svg><style>rect{background-image:image-set("https://evil.example/x.png")}</style></svg>'],
      ['css-font-src', '<svg><style>@font-face{font-family:x;src:"https://evil.example/x.woff"}</style></svg>'],
      ['css-style-attr-comment', '<svg><rect style="fill:u/**/rl(https://evil.example/x)"/></svg>'],
      // S3d: a CSS comment is not an XML comment — tags inside `/* ... */` still parse
      // as markup in SVG, so the structural deny list must see them.
      ['wrapped-script', '<svg>/*<script>alert(1)</script>*/</svg>'],
      ['wrapped-prefixed-script', '<svg>/*<svg:script xmlns:svg="http://www.w3.org/2000/svg">1</svg:script>*/</svg>'],
      ['wrapped-foreignobject', '<svg>/*<foreignObject><img src="x"/></foreignObject>*/</svg>'],
      ['wrapped-image-external', '<svg>/*<image href="https://evil.example/x.png"/>*/</svg>'],
      ['wrapped-cdata', '<svg>/*<![CDATA[<script>1</script>]]>*/</svg>'],
      ['unquoted-href', '<svg><a href=javascript:alert(1)>x</a></svg>'],
      ['css-expression', '<svg><rect style="fill:expression(alert(1))"/></svg>'],
      ['data-svg', '<svg><a href="data:image/svg+xml;base64,PHN2Zy8+">x</a></svg>'],
      ['data-html', '<svg><a href="data:text/html,<script>1</script>">x</a></svg>'],
      ['unquoted-handler', '<svg/onload=alert(1)>'],
      ['not-svg', 'just text'],
    ]) {
      assert.equal(isSafeSvgBuffer(Buffer.from(payload)).ok, false, 'unsafe SVG rejected: ' + name)
    }
    assert.equal(isSafeSvgBuffer(Buffer.alloc(SVG_MAX_BYTES + 1, 0x20)).ok, false, 'oversized SVG rejected')
  })
})

await testAsync('S3b: SVG responses carry a sandbox CSP and nosniff', async () => {
  await withTempDirAsync('tl-svg-serve-', async (dir) => {
    const svgPath = join(dir, 'look.svg')
    writeFileSync(svgPath, '<svg xmlns="http://www.w3.org/2000/svg"><rect width="2" height="2"/></svg>')
    const capture = (file, name) => {
      const headers = {}
      const res = new Writable({
        write(_chunk, _encoding, done) {
          done()
        },
      })
      res.writeHead = (status, values) => {
        headers.status = status
        Object.assign(headers, values)
      }
      servePath({ method: 'GET', headers: {} }, res, file, name)
      return new Promise((resolve) => res.on('finish', () => resolve(headers)))
    }
    const svgHeaders = await capture(svgPath, 'look.svg')
    assert.equal(svgHeaders['content-type'], 'image/svg+xml')
    assert.match(String(svgHeaders['content-security-policy']), /sandbox/i, 'direct SVG navigation is sandboxed')
    assert.match(String(svgHeaders['content-security-policy']), /default-src 'none'/i, 'SVG documents cannot load script')
    assert.equal(svgHeaders['x-content-type-options'], 'nosniff')
    // A raster upload keeps the old streaming headers (no unnecessary CSP).
    const pngPath = join(dir, 'still.png')
    writeFileSync(pngPath, 'png')
    const pngHeaders = await capture(pngPath, 'still.png')
    assert.equal(pngHeaders['content-type'], 'image/png')
    assert.equal(pngHeaders['content-security-policy'], undefined, 'non-SVG responses are unchanged')
    // S3c: the vendored WE host's own serveFile must add the same SVG fence on every
    // writeHead path (HEAD/206/200/416), not just the skin's servePath.
    const weHostSource = readFileSync(new URL('../lib/we-wallpaper/host.mjs', import.meta.url), 'utf8')
    const weServeStart = weHostSource.indexOf('function serveFile(req, res, abs, cacheControl = "no-cache") {')
    const weServe = weHostSource.slice(weServeStart, weServeStart + 3200)
    assert.ok(weServeStart > 0, 'WE host serveFile present')
    assert.match(weServe, /const type = mimeFor\(abs\);/, 'WE host computes the MIME type once')
    assert.match(weServe, /if \(type === "image\/svg\+xml"\) \{/, 'WE host applies the SVG fence')
    assert.match(weServe, /content-security-policy[^\n]*sandbox; default-src 'none'/, 'WE host SVG CSP matches servePath')
    assert.ok((weServe.match(/\.\.\.headers/g) ?? []).length >= 4, 'every WE writeHead path carries the base headers')
  })
})

await testAsync('bundle import skips unsafe entries without writing files', async () => {
  await withTempDirAsync('tl-bundle-', async (dir) => {
    const store = new SettingsStore(join(dir, 'state', 'settings.json'))
    const options = { store, stagingDir: join(dir, 'staging'), uploadDir: join(dir, 'uploads') }
    const mount = (req, res) => handleImport(req, res, options)
    const malicious = gzipSync(buildTarBuffer([{ name: '../evil.mp4', data: 'x' }]))
    const skipped = await callRoute(mount, 'POST', '/skin-tianlight/_import', { 'content-type': 'application/gzip' }, malicious)
    assert.equal(skipped.status, 200)
    const skippedResult = skipped.bodyJson()
    assert.deepEqual(skippedResult.imported, [])
    assert.deepEqual(skippedResult.skipped, ['../evil.mp4'])
    assert.equal(existsSync(join(dir, 'uploads')), false)
    assert.equal(existsSync(join(dir, 'staging')), false)

    const wrongType = await callRoute(mount, 'POST', '/skin-tianlight/_import', { 'content-type': 'text/html' }, malicious)
    assert.equal(wrongType.status, 415)

    const garbage = await callRoute(
      mount,
      'POST',
      '/skin-tianlight/_import',
      { 'content-type': 'application/gzip' },
      Buffer.from('this is not a gzip archive'),
    )
    assert.equal(garbage.status, 400)
    assert.equal(existsSync(join(dir, 'uploads')), false)
  })
})

await testAsync('bundle export/import never carries per-browser data keys', async () => {
  await withTempDirAsync('tl-bundle-data-', async (dir) => {
    // Export: a host state that still carries legacy data keys must ship settings only.
    const legacyState = {
      schemaVersion: 5,
      revision: 4,
      updatedAt: null,
      settings: {
        'tianlight.wallpaper': 'a',
        'tianlight.petChats.v1': 'chat',
        'tianlight.life.v1': 'life',
        'tianlight.petMind.v1': 'mind',
        // R4A: session-only capability document must never ship either.
        'tianlight.pet.permissions.v1': JSON.stringify({ version: 1, granted: { agentChat: true, shell: true } }),
      },
    }
    const exported = await callRoute(
      (req, res) => handleBundle(req, res, { build: PKG_VERSION, state: legacyState, files: [] }),
      'GET',
      '/skin-tianlight/_bundle',
    )
    assert.equal(exported.status, 200)
    let settingsText = null
    await parseTar(Readable.from([gunzipSync(exported.body())]), {
      onEntry: async (entry) => {
        if (entry.name !== 'settings.json') return
        const chunks = []
        for await (const chunk of entry.data) chunks.push(chunk)
        settingsText = Buffer.concat(chunks).toString('utf8')
      },
    })
    const shipped = JSON.parse(settingsText)
    assert.deepEqual(shipped.settings, { 'tianlight.wallpaper': 'a' })
    assert.equal('tianlight.pet.permissions.v1' in shipped.settings, false)
    assert.equal(shipped.revision, 4)

    // Import: an old bundle that still contains data keys or capability grants must
    // not write them back into the host settings mirror.
    const store = new SettingsStore(join(dir, 'imported-state', 'settings.json'))
    const archive = buildTarBuffer([
      {
        name: 'settings.json',
        data: JSON.stringify({
          settings: {
            'tianlight.wallpaper': 'b',
            'tianlight.petChats.v1': 'chat',
            'tianlight.petMind.v1': 'mind',
            'tianlight.pet.permissions.v1': JSON.stringify({ version: 1, granted: { agentChat: true, shell: true } }),
          },
        }),
      },
    ])
    const imported = await callRoute(
      (req, res) => handleImport(req, res, { store, stagingDir: join(dir, 'staging'), uploadDir: join(dir, 'uploads') }),
      'POST',
      '/skin-tianlight/_import',
      { 'content-type': 'application/gzip' },
      gzipSync(archive),
    )
    assert.equal(imported.status, 200)
    const result = imported.bodyJson()
    assert.deepEqual(result.settings, { 'tianlight.wallpaper': 'b' })
    assert.deepEqual(store.read().settings, { 'tianlight.wallpaper': 'b' })
  })
})

await testAsync('frame cache route stores, serves and clears entries', async () => {
  await withTempDirAsync('tl-cache-route-', async (dir) => {
    const cache = new FrameCache({ dir: join(dir, 'frame-cache') })
    const keyPath = '/skin-tianlight/_frame-cache?key=bg-main.16x9.1920'
    const mount = (req, res) => handleFrameCache(req, res, urlOf(req.url), cache)
    const webp = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBPVP8 '), Buffer.alloc(8)])
    const posted = await callRoute(mount, 'POST', keyPath, { 'content-type': 'image/webp' }, webp)
    assert.equal(posted.status, 200)
    assert.equal(posted.bodyJson().bytes, webp.length)

    const hit = await callRoute(mount, 'GET', keyPath)
    assert.equal(hit.status, 200)
    assert.equal(hit.headers['content-type'], 'image/webp')
    assert.deepEqual(hit.body(), webp)

    const missing = await callRoute(mount, 'GET', '/skin-tianlight/_frame-cache?key=nope')
    assert.equal(missing.status, 404)
    const badKey = await callRoute(mount, 'GET', '/skin-tianlight/_frame-cache?key=../escape')
    assert.equal(badKey.status, 400)
    const junk = await callRoute(mount, 'POST', '/skin-tianlight/_frame-cache?key=junk', { 'content-type': 'image/webp' }, Buffer.from('not an image at all'))
    assert.equal(junk.status, 400)
    const wrongType = await callRoute(mount, 'POST', '/skin-tianlight/_frame-cache?key=other', { 'content-type': 'text/html' }, webp)
    assert.equal(wrongType.status, 415)

    const status = await callRoute(
      (req, res) => handleFrameCacheStatus(req, res, cache),
      'GET',
      '/skin-tianlight/_frame-cache/status',
    )
    assert.equal(status.status, 200)
    const statusPayload = status.bodyJson()
    assert.equal(statusPayload.entries, 1)
    assert.ok(statusPayload.hits >= 1)
    assert.ok(statusPayload.misses >= 1)

    const cleared = await callRoute(mount, 'DELETE', '/skin-tianlight/_frame-cache')
    assert.equal(cleared.status, 200)
    assert.equal(cleared.bodyJson().cleared, 1)
    assert.equal(cache.lookup('bg-main.16x9.1920'), null)
  })
})

await testAsync('web project route serves the entry page with the sandbox CSP', async () => {
  await withTempDirAsync('tl-web-route-', async (root) => {
    const projectDir = join(root, '2001')
    mkdirSync(projectDir)
    writeFileSync(join(projectDir, 'project.json'), JSON.stringify({ type: 'web', file: 'index.html' }))
    writeFileSync(join(projectDir, 'index.html'), '<html>rain</html>')
    writeFileSync(join(projectDir, 'app.js'), 'console.log(1)')
    writeFileSync(join(projectDir, 'evil.exe'), 'MZ')
    const mount = (req, res) => handleWebProject(req, res, req.url.split('?')[0].replace('/skin-tianlight/', ''), [root])
    const page = await callRoute(mount, 'GET', '/skin-tianlight/_web-project/0/2001')
    assert.equal(page.status, 200)
    assert.equal(page.bodyText(), '<html>rain</html>')
    assert.match(String(page.headers['content-type']), /text\/html/)
    assert.match(String(page.headers['content-security-policy']), /sandbox allow-scripts/)
    const script = await callRoute(mount, 'GET', '/skin-tianlight/_web-project/0/2001/app.js')
    assert.equal(script.status, 200)
    assert.match(String(script.headers['content-type']), /javascript/)
    const exe = await callRoute(mount, 'GET', '/skin-tianlight/_web-project/0/2001/evil.exe')
    assert.equal(exe.status, 404)
    const traversal = await callRoute(mount, 'GET', '/skin-tianlight/_web-project/0/2001/..%2F..%2Fpackage.json')
    assert.equal(traversal.status, 404)
    const missingProject = await callRoute(mount, 'GET', '/skin-tianlight/_web-project/0/9999')
    assert.equal(missingProject.status, 404)
  })
})

await testAsync('transcode route reports 501 without ffmpeg and 400 for unknown inputs', async () => {
  await withTempDirAsync('tl-transcode-', async (dir) => {
    const assets = join(dir, 'assets')
    mkdirSync(assets)
    writeFileSync(join(assets, 'clip.mp4'), 'not really a video')
    const options = {
      assetsDir: assets,
      uploadsDir: join(dir, 'uploads'),
      derivedDir: join(dir, 'derived'),
      command: 'tl-ffmpeg-not-installed-' + process.pid,
    }
    const mount = (req, res) => handleTranscode(req, res, urlOf(req.url), options)
    const unknown = await callRoute(mount, 'POST', '/skin-tianlight/_transcode?name=nope.mp4')
    assert.equal(unknown.status, 400)
    const unsupportedKind = await callRoute(mount, 'POST', '/skin-tianlight/_transcode?name=../x.mp4')
    assert.equal(unsupportedKind.status, 400)
    const noBinary = await callRoute(mount, 'POST', '/skin-tianlight/_transcode?name=clip.mp4')
    assert.equal(noBinary.status, 501)
    const getNotAllowed = await callRoute(mount, 'GET', '/skin-tianlight/_transcode?name=clip.mp4')
    assert.equal(getNotAllowed.status, 405)
    const status = await callRoute((req, res) => handleTranscodeStatus(req, res), 'GET', '/skin-tianlight/_transcode/status')
    assert.equal(status.status, 200)
    assert.equal(typeof status.bodyJson().ffmpeg, 'boolean')
    assert.equal(existsSync(join(dir, 'derived')), false)
  })
})

test('transcode input resolution stays inside the media directories', () => {
  withTempDir('tl-transcode-', (dir) => {
    const assets = join(dir, 'assets')
    const uploads = join(dir, 'uploads')
    mkdirSync(assets)
    mkdirSync(uploads)
    writeFileSync(join(assets, 'clip.mp4'), 'a')
    writeFileSync(join(uploads, 'sky.gif'), 'b')
    const options = { assetsDir: assets, uploadsDir: uploads, derivedDir: join(dir, 'derived') }
    assert.notEqual(resolveTranscodeSource('clip.mp4', options), null)
    assert.notEqual(resolveTranscodeSource('uploads/sky.gif', options), null)
    for (const bad of ['../clip.mp4', 'unknown/x.mp4', 'uploads/../clip.mp4', 'a/b/c.mp4', '', null]) {
      assert.equal(resolveTranscodeSource(bad, options), null, String(bad))
    }
  })
})

// ---- R4B: transcode route hardening (cap, abort on disconnect, distinct output keys) ----
await testAsync('R4B transcode: concurrency cap, client-disconnect kill, distinct output keys', async () => {
  await withTempDirAsync('tl-transcode-r4b-', async (dir) => {
    const assets = join(dir, 'assets')
    const uploads = join(dir, 'uploads')
    const derivedDir = join(dir, 'derived')
    mkdirSync(assets)
    mkdirSync(uploads)
    writeFileSync(join(assets, 'x.mp4'), 'asset-bytes')
    writeFileSync(join(uploads, 'x.mp4'), 'upload-bytes')
    const base = { assetsDir: assets, uploadsDir: uploads, derivedDir, assumeFfmpeg: true }
    const urlFor = (name) => '/skin-tianlight/_transcode?name=' + encodeURIComponent(name)
    const writeTemp = (args) => writeFileSync(args[args.length - 1], 'mp4')
    const runOk = async (args) => {
      writeTemp(args)
      return { ok: true, code: 0 }
    }
    const runOnce = (options) => (name) =>
      callRoute((req, res) => handleTranscode(req, res, urlOf(req.url), options), 'POST', urlFor(name))

    // 1) assets/x.mp4 and uploads/x.mp4 must not overwrite each other.
    const fromAssets = await runOnce({ ...base, runTranscodeImpl: runOk })('x.mp4')
    const fromUploads = await runOnce({ ...base, runTranscodeImpl: runOk })('uploads/x.mp4')
    assert.equal(fromAssets.status, 200)
    assert.equal(fromUploads.status, 200)
    assert.equal(fromAssets.bodyJson().output, 'derived/assets-x.h264.mp4')
    assert.equal(fromUploads.bodyJson().output, 'derived/uploads-x.h264.mp4')
    assert.ok(existsSync(join(derivedDir, 'assets-x.h264.mp4')), 'asset derivative exists')
    assert.ok(existsSync(join(derivedDir, 'uploads-x.h264.mp4')), 'upload derivative exists')

    // 2) concurrency cap: two running jobs, the third POST answers 429.
    let entered = 0
    const gates = []
    const pendingRun = (args) => {
      writeTemp(args)
      entered += 1
      return new Promise((resolveRun) => gates.push(() => resolveRun({ ok: true, code: 0 })))
    }
    const capped = { ...base, maxConcurrent: 2, runTranscodeImpl: pendingRun }
    const mount = (req, res) => handleTranscode(req, res, urlOf(req.url), capped)
    const first = callRoute(mount, 'POST', urlFor('x.mp4'))
    const second = callRoute(mount, 'POST', urlFor('uploads/x.mp4'))
    const waitStart = Date.now()
    while (entered < 2 && Date.now() - waitStart < 1500) await new Promise((resolveTick) => setTimeout(resolveTick, 10))
    assert.equal(entered, 2, 'both transcodes entered the runner')
    const third = await callRoute(mount, 'POST', urlFor('x.mp4'))
    assert.equal(third.status, 429)
    assert.equal(third.bodyJson().limit, 2)
    for (const gate of gates.splice(0)) gate()
    assert.equal((await first).status, 200)
    assert.equal((await second).status, 200)

    // 3) client disconnect aborts the running ffmpeg (AbortSignal reaches the runner).
    let seenSignal = null
    const held = []
    const abortRun = (_args, runOptions) => {
      seenSignal = runOptions.signal
      return new Promise((resolveRun) => held.push(() => resolveRun({ ok: false, code: null, reason: 'client disconnected', aborted: true })))
    }
    const req = fakeRequest('POST', urlFor('x.mp4'))
    const res = fakeResponse()
    void handleTranscode(req, res, urlOf(req.url), { ...base, runTranscodeImpl: abortRun }).catch(() => {})
    const abortStart = Date.now()
    while (seenSignal === null && Date.now() - abortStart < 1500) await new Promise((resolveTick) => setTimeout(resolveTick, 10))
    assert.ok(seenSignal !== null, 'runner received the abort signal')
    res.destroy()
    await new Promise((resolveTick) => setTimeout(resolveTick, 50))
    assert.equal(seenSignal.aborted, true, 'client close aborts the running transcode')
    for (const gate of held) gate()
    await new Promise((resolveTick) => setTimeout(resolveTick, 50))

    // 4) R8b (REV-R4B 1): a disconnect during the ffmpeg PROBE window must abort the
    // route before any transcode starts (the old code attached the close listener only
    // after the await, so a closed tab during a cache-miss probe still ran ffmpeg).
    let releaseProbe = null
    const probeGate = new Promise((resolveProbe) => {
      releaseProbe = resolveProbe
    })
    let probeCalls = 0
    const probeReq = fakeRequest('POST', urlFor('x.mp4'))
    const probeRes = fakeResponse()
    const pendingRoute = handleTranscode(probeReq, probeRes, urlOf(probeReq.url), {
      ...base,
      assumeFfmpeg: false,
      ffmpegStatusImpl: async () => {
        probeCalls += 1
        await probeGate
        return { ffmpeg: true, version: 'test' }
      },
      runTranscodeImpl: async () => {
        probeCalls += 100
        return { ok: true, code: 0 }
      },
    }).catch(() => {})
    const probeStart = Date.now()
    while (probeCalls === 0 && Date.now() - probeStart < 1500) await new Promise((resolveTick) => setTimeout(resolveTick, 10))
    assert.equal(probeCalls, 1, 'probe started')
    probeRes.destroy()
    releaseProbe()
    await pendingRoute
    await new Promise((resolveTick) => setTimeout(resolveTick, 50))
    assert.equal(probeCalls, 1, 'no transcode runner started after a probe-window disconnect')
  })
})

await testAsync('non-stream request shapes map malformed input to 400, never 500', async () => {
  await withTempDirAsync('tl-plainreq-', async (dir) => {
    const store = new SettingsStore(join(dir, 'state', 'settings.json'))
    const importMount = (req, res) =>
      handleImport(req, res, { store, stagingDir: join(dir, 'staging'), uploadDir: join(dir, 'uploads') })
    // Empty gzip body is malformed input, not a server fault.
    const emptyArchive = await callRoutePlain(importMount, 'POST', '/skin-tianlight/_import', { 'content-type': 'application/gzip' }, '')
    assert.equal(emptyArchive.status, 400)
    const notGzip = await callRoutePlain(importMount, 'POST', '/skin-tianlight/_import', { 'content-type': 'application/gzip' }, 'plain text')
    assert.equal(notGzip.status, 400)
    assert.equal(existsSync(join(dir, 'staging')), false)
    assert.equal(existsSync(join(dir, 'uploads')), false)

    const cache = new FrameCache({ dir: join(dir, 'frame-cache') })
    const cacheMount = (req, res) => handleFrameCache(req, res, urlOf(req.url), cache)
    const junk = await callRoutePlain(
      cacheMount,
      'POST',
      '/skin-tianlight/_frame-cache?key=plain.1',
      { 'content-type': 'image/webp' },
      'not-an-image',
    )
    assert.equal(junk.status, 400)
    assert.equal(cache.lookup('plain.1'), null)
    const emptyFrame = await callRoutePlain(
      cacheMount,
      'POST',
      '/skin-tianlight/_frame-cache?key=plain.2',
      { 'content-type': 'image/webp' },
      '',
    )
    assert.equal(emptyFrame.status, 400)
    const wrongType = await callRoutePlain(
      cacheMount,
      'POST',
      '/skin-tianlight/_frame-cache?key=plain.3',
      { 'content-type': 'text/html' },
      'x',
    )
    assert.equal(wrongType.status, 415)
    // Bytes that do not match the declared image type are malformed input too.
    const mismatch = await callRoutePlain(
      cacheMount,
      'POST',
      '/skin-tianlight/_frame-cache?key=plain.4',
      { 'content-type': 'image/webp' },
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]),
    )
    assert.equal(mismatch.status, 400)
    assert.equal(cache.lookup('plain.4'), null)
  })
})

// ---- index.js wiring: the prefix handler mounts every v0.5.0 route ----
await testAsync('index handler mounts the new routes and keeps the GET/HEAD gate', async () => {
  let handler = null
  const carrier = {
    register: (route) => {
      handler = route.handler
      return () => {}
    },
  }
  hostApply({
    get: (name) => (name === 'webServer' ? carrier : undefined),
    webServer: carrier,
    effect: (fn) => {
      const dispose = fn()
      return typeof dispose === 'function' ? dispose : () => {}
    },
    inject: (_deps, callback) => callback(),
  })
  assert.equal(typeof handler, 'function')
  const mount = (req, res) => handler(req, res)

  const engines = await callRoute(mount, 'GET', '/skin-tianlight/_engines?build=' + PKG_VERSION)
  assert.equal(engines.status, 200)
  assert.equal(engines.bodyJson().build, PKG_VERSION)
  assert.equal(engines.bodyJson().capabilities.settings, true)

  const settings = await callRoute(mount, 'GET', '/skin-tianlight/_settings')
  assert.equal(settings.status, 200)
  assert.equal(settings.bodyJson().ok, true)

  const cacheStatus = await callRoute(mount, 'GET', '/skin-tianlight/_frame-cache/status')
  assert.equal(cacheStatus.status, 200)
  for (const key of ['entries', 'bytes', 'hits', 'misses', 'maxBytes']) assert.ok(key in cacheStatus.bodyJson(), key)

  const transcodeStatus = await callRoute(mount, 'GET', '/skin-tianlight/_transcode/status')
  assert.equal(transcodeStatus.status, 200)
  assert.equal(typeof transcodeStatus.bodyJson().ffmpeg, 'boolean')

  const bundleHead = await callRoute(mount, 'HEAD', '/skin-tianlight/_bundle')
  assert.equal(bundleHead.status, 200)
  assert.match(String(bundleHead.headers['content-type']), /gzip/)
  assert.equal(bundleHead.body().length, 0)

  const wallpapers = await callRoute(mount, 'GET', '/skin-tianlight/_wallpapers')
  assert.equal(wallpapers.status, 200)
  assert.ok(Array.isArray(wallpapers.bodyJson().items))

  const importWrongType = await callRoute(mount, 'POST', '/skin-tianlight/_import', { 'content-type': 'text/html' }, 'x')
  assert.equal(importWrongType.status, 415)

  const missingFrame = await callRoute(mount, 'GET', '/skin-tianlight/_frame-cache')
  assert.equal(missingFrame.status, 400)

  const webProject = await callRoute(mount, 'GET', '/skin-tianlight/_web-project/0/nope')
  assert.equal(webProject.status, 404)

  // The legacy GET/HEAD gate is still in force for routes that are read-only.
  const postManifest = await callRoute(mount, 'POST', '/skin-tianlight/_manifest')
  assert.equal(postManifest.status, 405)
})

// ---- v0.6.0: Wallpaper Engine library integration (temp fixtures only) ----
// The real Steam/WE install is never touched: DSH_WE_DIR points the scanner at a
// throwaway Steam tree, TIANLIGHT_WE_HOME keeps state/cache out of the repo, and
// TIANLIGHT_WE_DISABLE_SCENE_VIDEO guarantees the recorder can never spawn.
const WE_ENV_KEYS = ['DSH_WE_DIR', 'TIANLIGHT_WE_HOME', 'TIANLIGHT_WE_DISABLE_SCENE_VIDEO', 'TIANLIGHT_REPKG_PATH', 'REPKG_PATH']

const withWeEnv = async (values, fn) => {
  const saved = new Map()
  for (const key of WE_ENV_KEYS) {
    saved.set(key, process.env[key])
    delete process.env[key]
  }
  for (const [key, value] of Object.entries(values)) process.env[key] = value
  try {
    return await fn()
  } finally {
    for (const key of WE_ENV_KEYS) {
      const value = saved.get(key)
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  }
}

const writeWeProject = (dir, project, extra = {}) => {
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'project.json'), JSON.stringify({ preview: 'preview.jpg', ...project }))
  writeFileSync(join(dir, 'preview.jpg'), 'fixture-preview-bytes')
  for (const [name, bytes] of Object.entries(extra)) writeFileSync(join(dir, name), bytes)
}

/** One throwaway WE install: 6 local projects + 3 workshop items. */
const makeWeFixture = (root) => {
  const weRoot = join(root, 'steamapps', 'common', 'wallpaper_engine')
  const workshopDir = join(root, 'steamapps', 'workshop', 'content', '431960')
  const projects = join(weRoot, 'projects', 'defaultprojects')
  writeWeProject(join(projects, '本地场景'), { title: '本地场景 静态', type: 'scene', file: 'scene.json' })
  writeWeProject(join(projects, '本地场景包'), { title: '本地场景 包', type: 'scene', file: 'scene.pkg' }, { 'scene.pkg': 'fixture-pkg' })
  writeWeProject(join(projects, '网页项目'), { title: '本地网页 壁纸', type: 'web', file: 'index.html' }, { 'index.html': '<html>local-web</html>' })
  writeWeProject(join(projects, '视频项目'), { title: '本地视频', type: 'video', file: 'wall.mp4' }, { 'wall.mp4': 'fake-mp4-bytes' })
  writeWeProject(join(projects, '音频项目'), { title: 'Audio Visualizer', type: 'audio', file: 'a.json' })
  // A project with a media file but no preview image: the panel must fall back.
  writeWeProject(join(projects, '无预览项目'), { title: '无预览 图片', type: 'image', file: 'image.png' }, { 'image.png': 'png-bytes' })
  rmSync(join(projects, '无预览项目', 'preview.jpg'), { force: true })
  writeWeProject(join(workshopDir, '1001'), { title: '工坊场景 HD', type: 'scene', file: 'scene.pkg' }, { 'scene.pkg': 'fixture-pkg' })
  writeWeProject(join(workshopDir, '2002'), { title: 'Workshop Video 4K', type: 'video', file: 'video.mp4' }, { 'video.mp4': '0123456789' })
  writeWeProject(join(workshopDir, '3003'), { title: '[中文] 工坊网页', type: 'web', file: 'index.html' }, { 'index.html': '<html>workshop-web</html>' })
  return { weRoot, workshopDir }
}

/** Mount the real host half with a carrier that records every prefix route.
 *  `services` fills the Context lookups the new write routes resolve per request
 *  (e.g. `{ llm, agentDefaultModel }` for the v2.0.0 pet chat bridge). */
const mountHostRoutes = (services = {}) => {
  const routes = []
  const carrier = {
    register: (route) => {
      routes.push(route)
      return () => {}
    },
  }
  hostApply({
    get: (name) => (name === 'webServer' ? carrier : services[name]),
    webServer: carrier,
    effect: (fn) => {
      const dispose = fn()
      return typeof dispose === 'function' ? dispose : () => {}
    },
    inject: (_deps, callback) => callback(),
  })
  return routes
}

const dispatchMounted = (routes, req, res) => {
  const pathname = String(req.url).split('?')[0]
  const route = routes.find((candidate) => pathname === candidate.path || pathname.startsWith(candidate.path + '/'))
  if (route === undefined) throw new Error('no mounted route for ' + pathname)
  return route.handler(req, res)
}

const callMounted = async (routes, method, url, headers = {}, body = null) => {
  const req = fakeRequest(method, url, headers, body)
  const res = fakeResponse()
  dispatchMounted(routes, req, res)
  return waitForResponse(res)
}

await testAsync('WE library: fixture projects map into _wallpapers with kinds/urls/titles', async () => {
  await withTempDirAsync('tl-we-', async (root) => {
    const fixture = makeWeFixture(root)
    const runtime = join(root, 'runtime')
    await withWeEnv({ DSH_WE_DIR: fixture.weRoot, TIANLIGHT_WE_HOME: runtime, TIANLIGHT_WE_DISABLE_SCENE_VIDEO: '1' }, async () => {
      const routes = mountHostRoutes()
      const response = await callMounted(routes, 'GET', '/skin-tianlight/_wallpapers')
      assert.equal(response.status, 200)
      const items = response.bodyJson().items
      const weItems = items.filter((item) => item.source === 'we')
      assert.equal(weItems.length, 9, 'fixture library size')
      assert.equal(new Set(weItems.map((item) => item.id)).size, 9, 'deduped by WE id')
      // panel counters: Steam workshop vs local projects
      for (const item of weItems) assert.ok(['workshop', 'project'].includes(item.weSource), item.id + ' weSource')
      const byId = new Map(weItems.map((item) => [item.id, item]))

      const workshopScene = byId.get('we:1001')
      assert.equal(workshopScene.kind, 'image')
      assert.equal(workshopScene.weType, 'scene')
      assert.equal(workshopScene.weSource, 'workshop')
      assert.equal(workshopScene.title, '工坊场景 HD')
      assert.equal(workshopScene.url, '/api/we-wallpaper/pkg/1001')
      assert.equal(workshopScene.preview, '/api/we-wallpaper/preview/1001')
      assert.ok(workshopScene.bytes > 0)

      const workshopVideo = byId.get('we:2002')
      assert.equal(workshopVideo.kind, 'video')
      assert.equal(workshopVideo.weType, 'video')
      assert.equal(workshopVideo.weSource, 'workshop')
      assert.equal(workshopVideo.url, '/api/we-wallpaper/media/2002')
      assert.equal(workshopVideo.bytes, 10)

      const workshopWeb = byId.get('we:3003')
      assert.equal(workshopWeb.kind, 'web')
      assert.equal(workshopWeb.weSource, 'workshop')
      assert.equal(workshopWeb.title, '[中文] 工坊网页')
      assert.equal(workshopWeb.url, '/api/we-wallpaper/web/3003/index.html')

      const local = weItems.filter((item) => item.weId.startsWith('local-'))
      assert.equal(local.length, 6, 'local projects are listed too')
      for (const item of local) assert.equal(item.weSource, 'project')
      const localPkgScene = local.find((item) => item.weType === 'scene' && item.url.includes('/pkg/'))
      const localLooseScene = local.find((item) => item.weType === 'scene' && item.url.includes('/preview/'))
      assert.ok(localPkgScene !== undefined, 'local scene with scene.pkg uses /pkg')
      assert.ok(localLooseScene !== undefined, 'local loose scene falls back to the preview image')
      assert.equal(localPkgScene.url, '/api/we-wallpaper/pkg/' + encodeURIComponent('local-本地场景包'))
      const localWeb = local.find((item) => item.weType === 'web')
      assert.equal(localWeb.kind, 'web')
      assert.ok(localWeb.url.endsWith('/index.html'))
      const unknown = local.find((item) => item.weType === 'audio')
      assert.equal(unknown.kind, 'image', 'audio/unknown types degrade to a static image')
      assert.ok(unknown.url.includes('/preview/'))
      assert.ok(weItems.some((item) => item.title === '本地场景 静态'), 'Chinese titles pass through as-is')

      // A wallpaper with no preview file omits the optional preview field.
      const noPreview = byId.get('we:local-无预览项目')
      assert.ok(noPreview !== undefined, 'no-preview project is still listed')
      assert.equal(noPreview.kind, 'image')
      assert.equal(Object.hasOwn(noPreview, 'preview'), false, 'preview field is omitted when absent')

      // R7: the repository's own media is optional on a clean clone/CI, so this test
      // asserts the structural contract (WE items appended as one trailing block,
      // non-WE items keep their shape) instead of "some local wallpaper exists".
      const firstWe = items.findIndex((item) => item.source === 'we')
      assert.ok(firstWe >= 0, 'WE items are present')
      assert.equal(items.slice(firstWe).filter((item) => item.source !== 'we').length, 0, 'WE block stays at the end')
      assert.ok(
        items.every((item) => item.source === 'we' || (typeof item.id === 'string' && typeof item.url === 'string' && typeof item.kind === 'string')),
        'non-WE catalog items keep their shape',
      )
      assert.equal(items.filter((item) => item.id === 'we:1001').length, 1)
      assert.equal(__test.listWeSkinItems().length, 9)
      assert.deepEqual(__test.weLibraryStatus(), { found: true, count: 9, root: fixture.weRoot })
    })
  })
})

await testAsync('WE library: _engines reports weLibrary additively', async () => {
  await withTempDirAsync('tl-we-', async (root) => {
    const fixture = makeWeFixture(root)
    await withWeEnv(
      { DSH_WE_DIR: fixture.weRoot, TIANLIGHT_WE_HOME: join(root, 'runtime'), TIANLIGHT_WE_DISABLE_SCENE_VIDEO: '1' },
      async () => {
        const routes = mountHostRoutes()
        const response = await callMounted(routes, 'GET', '/skin-tianlight/_engines')
        assert.equal(response.status, 200)
        const value = response.bodyJson()
        assert.deepEqual(value.weLibrary, { found: true, count: 9, root: fixture.weRoot })
        assert.equal(value.capabilities.weLibrary, true)
        // The pre-existing additive shape is unchanged.
        assert.ok(Number.isInteger(value.settings.revision))
        assert.ok(value.cache !== undefined && Number.isInteger(value.cache.entries))
        assert.ok(value.upload !== undefined)
        assert.ok(Array.isArray(Object.keys(value.capabilities)))
      },
    )
  })
})

await testAsync('WE library: absent install leaves _wallpapers/_engines unchanged', async () => {
  await withTempDirAsync('tl-we-', async (root) => {
    const emptyWe = join(root, 'no-wallpaper-engine-here')
    mkdirSync(emptyWe)
    await withWeEnv({ DSH_WE_DIR: emptyWe, TIANLIGHT_WE_HOME: join(root, 'runtime') }, async () => {
      const routes = mountHostRoutes()
      const wallpapers = await callMounted(routes, 'GET', '/skin-tianlight/_wallpapers')
      assert.equal(wallpapers.status, 200)
      const items = wallpapers.bodyJson().items
      // R7: an absent WE install must add nothing and break nothing. The catalog may
      // legitimately be empty on a clean clone (no assets/uploads/derived media), so
      // assert the contract rather than "at least one local wallpaper".
      assert.ok(Array.isArray(items), 'catalog is an array')
      assert.equal(items.filter((item) => item.source === 'we').length, 0)
      assert.ok(
        items.every((item) => typeof item.id === 'string' && typeof item.url === 'string' && (item.kind === 'video' || item.kind === 'image')),
        'non-WE catalog items keep their shape',
      )
      assert.deepEqual(__test.listWeSkinItems(), [])
      const engines = await callMounted(routes, 'GET', '/skin-tianlight/_engines')
      assert.deepEqual(engines.bodyJson().weLibrary, { found: false, count: 0, root: null })
      assert.equal(engines.bodyJson().capabilities.weLibrary, true)
    })
  })
})

await testAsync('WE route family: list, same-origin fence, state and method gates', async () => {
  await withTempDirAsync('tl-we-', async (root) => {
    const fixture = makeWeFixture(root)
    const runtime = join(root, 'runtime')
    await withWeEnv({ DSH_WE_DIR: fixture.weRoot, TIANLIGHT_WE_HOME: runtime, TIANLIGHT_WE_DISABLE_SCENE_VIDEO: '1' }, async () => {
      const routes = mountHostRoutes()
      assert.equal(routes.length, 2, 'skin + WE prefixes are both mounted')
      assert.deepEqual(routes.map((route) => route.path).sort(), ['/api/we-wallpaper', '/skin-tianlight'])

      const list = await callMounted(routes, 'GET', '/api/we-wallpaper/list', { origin: 'dsh-app://app' })
      assert.equal(list.status, 200, 'dsh-app:// origin is not fenced out')
      const body = list.bodyJson()
      assert.equal(body.ok, true)
      assert.equal(body.found, true)
      assert.equal(body.count, 9)
      assert.equal(body.root, fixture.weRoot)
      assert.equal(body.wallpapers.length, 9)
      assert.ok(body.wallpapers.some((entry) => entry.type === 'scene' && entry.title === '工坊场景 HD'))
      assert.equal(
        (await callMounted(routes, 'GET', '/api/we-wallpaper/list', { origin: 'http://127.0.0.1:51199', host: '127.0.0.1:51199' })).status,
        200,
        'same-host localhost origin is not fenced out',
      )
      // v1.6.4 security hardening: only the host that served the page may call the
      // caches/routes; another localhost app on a different port is a different origin.
      assert.equal(
        (await callMounted(routes, 'GET', '/api/we-wallpaper/list', { origin: 'http://127.0.0.1:51198', host: '127.0.0.1:51199' })).status,
        403,
        'a different localhost port is rejected',
      )
      assert.equal(
        (await callMounted(routes, 'GET', '/api/we-wallpaper/list', { origin: 'https://evil.example' })).status,
        403,
        'foreign origin is rejected',
      )
      assert.equal(
        (await callMounted(routes, 'GET', '/api/we-wallpaper/list', { 'sec-fetch-site': 'cross-site' })).status,
        403,
        'cross-site fetch metadata is rejected',
      )
      // v1.6.4: a sandboxed (opaque-origin) wallpaper frame fetches its own
      // subresources as Sec-Fetch-Site: cross-site + Origin: null; those read-only
      // GETs are the app's own wallpaper channel and must still be served, while
      // cross-site writes keep being rejected.
      assert.equal(
        (await callMounted(routes, 'GET', '/skin-tianlight/_engine/webwallgl.js', { 'sec-fetch-site': 'cross-site', origin: 'null' })).status,
        200,
        'sandboxed WebWallGL engine script is readable',
      )
      assert.equal(
        (await callMounted(routes, 'GET', '/skin-tianlight/_scene-frame', { 'sec-fetch-site': 'cross-site', origin: 'null' })).status,
        200,
        'sandboxed scene frame is readable',
      )
      const sandboxedSceneProject = await callMounted(routes, 'GET', '/skin-tianlight/_scene-project/0/missing.png', {
        'sec-fetch-site': 'cross-site',
        origin: 'null',
      })
      assert.notEqual(sandboxedSceneProject.status, 403, 'sandboxed scene-project reads are not fenced out')
      const sandboxedWebProject = await callMounted(routes, 'GET', '/skin-tianlight/_web-project/0/index.html', {
        'sec-fetch-site': 'cross-site',
        origin: 'null',
      })
      assert.notEqual(sandboxedWebProject.status, 403, 'sandboxed web-project reads are not fenced out')
      assert.equal(
        (await callMounted(routes, 'GET', '/skin-tianlight/_settings', { 'sec-fetch-site': 'cross-site' })).status,
        403,
        'cross-site reads outside the wallpaper channels are still fenced',
      )
      assert.equal(
        (await callMounted(routes, 'POST', '/skin-tianlight/_transcode', { 'sec-fetch-site': 'cross-site', origin: 'null', 'content-type': 'application/json' }, '{}')).status,
        403,
        'sandboxed/opaque-origin writes are still fenced',
      )
      const sandboxedWeWeb = await callMounted(routes, 'GET', '/api/we-wallpaper/web/3003/index.html', {
        'sec-fetch-site': 'cross-site',
        origin: 'null',
      })
      assert.notEqual(sandboxedWeWeb.status, 403, 'sandboxed WE web-project reads are not fenced out')
      // The allowlist is matched on a normalised pathname: a `..` segment must not
      // tunnel from an exempt read prefix into a different host route.
      assert.equal(
        (await callMounted(routes, 'GET', '/skin-tianlight/_scene-project/../_settings', { 'sec-fetch-site': 'cross-site', origin: 'null' })).status,
        403,
        'a dot-dot escape out of the sandboxed read prefix stays fenced',
      )
      assert.equal(
        (await callMounted(routes, 'GET', '/api/we-wallpaper/web/../state', { 'sec-fetch-site': 'cross-site', origin: 'null' })).status,
        403,
        'a dot-dot escape out of the WE web-project prefix stays fenced',
      )

      const initial = await callMounted(routes, 'GET', '/api/we-wallpaper/state')
      assert.equal(initial.status, 200)
      assert.equal(initial.bodyJson().state.sceneMode, 'animated-first')
      const saved = await callMounted(
        routes,
        'POST',
        '/api/we-wallpaper/state',
        { 'content-type': 'application/json' },
        JSON.stringify({ sceneMode: 'static-hd', scrim: 40 }),
      )
      assert.equal(saved.status, 200)
      assert.equal(saved.bodyJson().state.sceneMode, 'static-hd')
      assert.equal(saved.bodyJson().state.scrim, 40)
      assert.ok(existsSync(join(runtime, 'we-wallpaper.json')), 'state lives in the plugin runtime home')
      assert.equal(JSON.parse(readFileSync(join(runtime, 'we-wallpaper.json'), 'utf8')).sceneMode, 'static-hd')

      // ---- R4B security regression: repkgPath is config/env only, never HTTP ----
      const evilState = await callMounted(
        routes,
        'POST',
        '/api/we-wallpaper/state',
        { 'content-type': 'application/json' },
        JSON.stringify({ repkgPath: '\\\\evil.example\\share\\RePKG.exe', scrim: 33 }),
      )
      assert.equal(evilState.status, 200)
      assert.equal(evilState.bodyJson().state.repkgPath, '', 'HTTP cannot set repkgPath')
      assert.equal(evilState.bodyJson().state.scrim, 33, 'ordinary fields still write')
      const persistedState = JSON.parse(readFileSync(join(runtime, 'we-wallpaper.json'), 'utf8'))
      assert.equal(persistedState.repkgPath, '', 'the rejected path never reaches the state file')
      // A manually edited config file IS a legitimate source, but only for the
      // RePKG executable name and a local regular file.
      const repkgFile = join(runtime, 'tools', 'RePKG.exe')
      mkdirSync(join(runtime, 'tools'), { recursive: true })
      writeFileSync(repkgFile, 'fixture-binary')
      writeFileSync(
        join(runtime, 'we-wallpaper.json'),
        JSON.stringify({ ...persistedState, repkgPath: repkgFile }, null, 2),
      )
      const fromConfig = await callMounted(routes, 'GET', '/api/we-wallpaper/state')
      assert.equal(fromConfig.bodyJson().state.repkgPath, repkgFile, 'config-file value is honored')
      const unchanged = await callMounted(
        routes,
        'POST',
        '/api/we-wallpaper/state',
        { 'content-type': 'application/json' },
        JSON.stringify({ repkgPath: '\\\\evil.example\\share\\RePKG.exe', scrim: 12 }),
      )
      assert.equal(unchanged.bodyJson().state.repkgPath, repkgFile, 'HTTP cannot replace the configured path')
      // Unsafe config-file values are dropped: UNC, a directory, another executable.
      for (const bad of ['\\\\evil.example\\share\\RePKG.exe', join(runtime, 'tools'), join(runtime, 'tools', 'evil.exe')]) {
        writeFileSync(join(runtime, 'we-wallpaper.json'), JSON.stringify({ ...persistedState, repkgPath: bad }, null, 2))
        assert.equal((await callMounted(routes, 'GET', '/api/we-wallpaper/state')).bodyJson().state.repkgPath, '', bad)
      }
      // Environment override wins over the config file and is also HTTP-immutable.
      writeFileSync(join(runtime, 'we-wallpaper.json'), JSON.stringify({ ...persistedState, repkgPath: '' }, null, 2))
      // REV-R7: keep the runtime home in the nested env too, otherwise clearing the WE
      // env keys falls back to the plugin's repo state/ directory.
      await withWeEnv({ TIANLIGHT_REPKG_PATH: repkgFile, TIANLIGHT_WE_HOME: runtime }, async () => {
        assert.equal((await callMounted(routes, 'GET', '/api/we-wallpaper/state')).bodyJson().state.repkgPath, repkgFile)
        const forced = await callMounted(
          routes,
          'POST',
          '/api/we-wallpaper/state',
          { 'content-type': 'application/json' },
          JSON.stringify({ repkgPath: 'C:\\Windows\\System32\\cmd.exe' }),
        )
        assert.equal(forced.bodyJson().state.repkgPath, repkgFile, 'env-configured path ignored the HTTP patch')
      })
      // R8b (REV-R4B 3): an invalid higher-priority source must not swallow a valid
      // lower-priority one, and the rejection is reported as an additive diagnostic.
      writeFileSync(join(runtime, 'we-wallpaper.json'), JSON.stringify({ ...persistedState, repkgPath: '' }, null, 2))
      await withWeEnv(
        { TIANLIGHT_WE_HOME: runtime, TIANLIGHT_REPKG_PATH: join(runtime, 'tools', 'evil.exe'), REPKG_PATH: repkgFile },
        async () => {
          const state = (await callMounted(routes, 'GET', '/api/we-wallpaper/state')).bodyJson().state
          assert.equal(state.repkgPath, repkgFile, 'invalid TIANLIGHT_REPKG_PATH falls through to REPKG_PATH')
          assert.equal(state.repkgRejected.source, 'TIANLIGHT_REPKG_PATH')
          assert.equal(state.repkgRejected.reason, 'not-repkg-executable')
        },
      )
      await withWeEnv(
        { TIANLIGHT_WE_HOME: runtime, TIANLIGHT_REPKG_PATH: join(runtime, 'tools', 'evil.exe'), REPKG_PATH: '\\\\evil.example\\share\\RePKG.exe' },
        async () => {
          const state = (await callMounted(routes, 'GET', '/api/we-wallpaper/state')).bodyJson().state
          assert.equal(state.repkgPath, '', 'all invalid sources resolve to no extractor')
          assert.equal(state.repkgRejected.source, 'TIANLIGHT_REPKG_PATH')
          assert.equal(state.repkgRejected.reason, 'not-repkg-executable')
        },
      )

      // ---- R4B DNS-rebinding fence: Host must be loopback, Origin equality is not enough ----
      const rebound = await callMounted(routes, 'GET', '/api/we-wallpaper/list', {
        origin: 'http://evil.example:51199',
        host: 'evil.example:51199',
      })
      assert.equal(rebound.status, 403, 'a matching Origin/Host pair on a foreign name is rejected')
      const foreignHost = await callMounted(routes, 'GET', '/api/we-wallpaper/list', { host: 'evil.example' })
      assert.equal(foreignHost.status, 403, 'a foreign Host header alone is rejected')
      for (const host of ['127.0.0.1:51199', 'localhost:51199', '[::1]:51199']) {
        const originHost = host.startsWith('[::1]') ? '[::1]' : host.split(':')[0]
        const port = host.includes(']') ? host.slice(host.indexOf(']:') + 1).replace(':', '') : host.split(':')[1]
        const allowed = await callMounted(routes, 'GET', '/api/we-wallpaper/list', {
          origin: 'http://' + originHost + ':' + port,
          host,
        })
        assert.equal(allowed.status, 200, 'loopback Host form accepted: ' + host)
      }
      // Missing Host keeps working for non-browser callers (curl, in-process tests).
      assert.equal((await callMounted(routes, 'GET', '/api/we-wallpaper/list', { origin: 'http://127.0.0.1:51199' })).status, 403, 'an http Origin without Host is still rejected')

      assert.equal((await callMounted(routes, 'POST', '/api/we-wallpaper/list')).status, 405)
      assert.equal((await callMounted(routes, 'GET', '/api/we-wallpaper/scene-video/generate/1001')).status, 405)
      assert.equal((await callMounted(routes, 'GET', '/api/we-wallpaper/nope')).status, 404)
    })
  })
})

await testAsync('WE route family: media/preview/web serving and path containment', async () => {
  await withTempDirAsync('tl-we-', async (root) => {
    const fixture = makeWeFixture(root)
    await withWeEnv(
      { DSH_WE_DIR: fixture.weRoot, TIANLIGHT_WE_HOME: join(root, 'runtime'), TIANLIGHT_WE_DISABLE_SCENE_VIDEO: '1' },
      async () => {
        const routes = mountHostRoutes()

        const media = await callMounted(routes, 'GET', '/api/we-wallpaper/media/2002')
        assert.equal(media.status, 200)
        assert.equal(media.headers['content-type'], 'video/mp4')
        assert.equal(media.bodyText(), '0123456789')
        const ranged = await callMounted(routes, 'GET', '/api/we-wallpaper/media/2002', { range: 'bytes=2-5' })
        assert.equal(ranged.status, 206)
        assert.equal(ranged.bodyText(), '2345')
        assert.equal(ranged.headers['content-range'], 'bytes 2-5/10')

        const preview = await callMounted(routes, 'GET', '/api/we-wallpaper/preview/2002')
        assert.equal(preview.status, 200)
        assert.equal(preview.headers['content-type'], 'image/jpeg')
        // web and scene wallpapers serve their previews through the same route
        const webPreview = await callMounted(routes, 'GET', '/api/we-wallpaper/preview/3003')
        assert.equal(webPreview.status, 200)
        assert.equal(webPreview.headers['content-type'], 'image/jpeg')
        const scenePreview = await callMounted(routes, 'GET', '/api/we-wallpaper/preview/1001')
        assert.equal(scenePreview.status, 200)
        assert.equal(scenePreview.headers['content-type'], 'image/jpeg')

        const page = await callMounted(routes, 'GET', '/api/we-wallpaper/web/3003')
        assert.equal(page.status, 200)
        assert.match(String(page.headers['content-type']), /text\/html/)
        assert.equal(page.bodyText(), '<html>workshop-web</html>')
        assert.equal((await callMounted(routes, 'GET', '/api/we-wallpaper/web/3003/index.html')).status, 200)
        assert.equal((await callMounted(routes, 'GET', '/api/we-wallpaper/web/3003/..%2F..%2Fproject.json')).status, 403)
        assert.equal((await callMounted(routes, 'GET', '/api/we-wallpaper/media/..%2F..%2Fproject.json')).status, 400)
        assert.equal((await callMounted(routes, 'GET', '/api/we-wallpaper/preview/..%2F..%2Fproject.json')).status, 400)
        assert.equal((await callMounted(routes, 'GET', '/api/we-wallpaper/media/999999')).status, 404)

        // .pkg route: a loose local scene has no package; a corrupt fixture pkg must
        // answer a graceful 404, never a crash or a stack trace.
        assert.equal((await callMounted(routes, 'GET', '/api/we-wallpaper/pkg/' + encodeURIComponent('local-本地场景'))).status, 404)
        const corruptPkg = await callMounted(routes, 'GET', '/api/we-wallpaper/pkg/1001')
        assert.equal(corruptPkg.status, 404)
        assert.equal(corruptPkg.bodyJson().ok, false)
        const diagnostics = await callMounted(routes, 'GET', '/api/we-wallpaper/diagnostics/1001')
        assert.equal(diagnostics.status, 200)
        assert.equal(diagnostics.bodyJson().diagnostics.pkgFound, true)

        // scene-video generation is a clear 503 here (disable flag), and no WE
        // process is ever started by the test suite.
        const generate = await callMounted(routes, 'POST', '/api/we-wallpaper/scene-video/generate/1001', { origin: 'dsh-app://app' })
        assert.equal(generate.status, 503)
        assert.equal(generate.bodyJson().error, 'scene-video-unsupported')
      },
    )
  })
})

await testAsync('host dispose unregisters both prefixes and scene-video capture', async () => {
  const calls = []
  const carrier = {
    register: (route) => {
      calls.push('register:' + route.path)
      return () => calls.push('dispose:' + route.path)
    },
  }
  let disposer = null
  hostApply({
    get: (name) => (name === 'webServer' ? carrier : undefined),
    webServer: carrier,
    effect: (fn) => {
      disposer = fn()
      return disposer
    },
    inject: (_deps, callback) => callback(),
  })
  assert.deepEqual(calls, ['register:/api/we-wallpaper', 'register:/skin-tianlight'])
  assert.equal(typeof disposer, 'function')
  disposer()
  assert.ok(calls.includes('dispose:/api/we-wallpaper'))
  assert.ok(calls.includes('dispose:/skin-tianlight'))
})

// ---- R2 energy pass: shipped-product contracts (static read of lib/client.js; no DSH
// boot). These are the structural counts that replace the frame-rate baseline the
// report could not measure: every assertion below fails if the per-frame cost returns.
const CLIENT_SOURCE = readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8')

test('R2: the scene layer has no full-viewport live blur and no 22s repaint', () => {
  // The blurred rule lived between `[data-tl-scene]::after {` and its closing brace.
  const rule = /\[data-tl-scene\]::after \{([\s\S]*?)\}/.exec(CLIENT_SOURCE)
  assert.ok(rule !== null, 'scene layer ::after rule should exist')
  assert.equal(/backdrop-filter/.test(rule[1]), false, 'scene layer must not paint a backdrop-filter')
  assert.equal(CLIENT_SOURCE.includes('@keyframes tl-liquid-sheen'), false, 'the scene-sheen keyframes are gone')
  assert.equal(CLIENT_SOURCE.includes('animation: tl-liquid-sheen'), false, 'the 22s scene animation is gone')
  // ...and the static veil it was replaced with is still there.
  assert.match(rule[1], /background-image: var\(--tl-liquid-surface\)/, 'static grain/tint veil kept')
  // The product's own bounded glass keeps its blur (the depth presets still do something).
  assert.match(CLIENT_SOURCE, /\[data-tl-composer\]::before \{[\s\S]{0,400}?backdrop-filter:/)
  assert.match(CLIENT_SOURCE, /\[data-tl-liquid-fallback\] \{[\s\S]{0,500}?backdrop-filter:/)
})

test('R2: the selector bridge stamps added subtrees; full scans are >=500ms throttled', () => {
  assert.match(CLIENT_SOURCE, /const FULL_SCAN_INTERVAL_MS = 500/)
  assert.match(CLIENT_SOURCE, /Math\.max\(0, FULL_SCAN_INTERVAL_MS - \(Date\.now\(\) - lastFullAt\)\)/)
  assert.match(CLIENT_SOURCE, /for \(const node of record\.addedNodes\)/)
  assert.match(CLIENT_SOURCE, /for \(const node of root\.querySelectorAll\(SURFACE_SELECTOR\)\)/)
  assert.match(CLIENT_SOURCE, /requestAnimationFrame\(flushAdded\)/)
  // The removed per-frame cost: the full document pass is not called from an rAF.
  assert.equal(/requestAnimationFrame\(\(\) => \{[\s\S]{0,300}?stampAll\(/.test(CLIENT_SOURCE), false)
  // Dispose owns all three resources: observer, pending frame and fallback timer.
  assert.match(CLIENT_SOURCE, /observer\.disconnect\(\);[\s\S]{0,400}?globalThis\.cancelAnimationFrame\(frame\)/)
  assert.match(CLIENT_SOURCE, /globalThis\.cancelAnimationFrame\(frame\)[\s\S]{0,200}?globalThis\.clearTimeout\(fullTimer\)/)
  // Detached nodes are swept by `isConnected` in the throttled pass, not every frame.
  assert.match(CLIENT_SOURCE, /if \(node\.isConnected === false\) stamped\.delete\(node\)/)
})

test('R2: closing the wallpaper panel unmounts its React tree (partitions stop)', () => {
  const closeAt = CLIENT_SOURCE.indexOf('audioController.stop(TL_T("lib.audio.stoppedOnClose"));')
  assert.ok(closeAt > 0, 'panel close branch should exist')
  assert.match(CLIENT_SOURCE.slice(closeAt, closeAt + 400), /unmountPanel\(\);/, 'close must unmount the tree')
  assert.match(CLIENT_SOURCE, /const unmountPanel = \(\) => \{[\s\S]{0,200}?root\.render\(null\)/, 'unmountPanel renders null')
  // The reopen path reuses the same root: the tree is remounted through the React key.
  assert.match(CLIENT_SOURCE, /const renderPanel = \(\) => \{[\s\S]{0,400}?createRoot\(host\)[\s\S]{0,600}?root\.render\(/)
  // The font panel palette is one-shot now: no 4s getImageData interval.
  assert.equal(CLIENT_SOURCE.includes('setInterval(adoptWallpaperPalette'), false)
  assert.match(CLIENT_SOURCE, /const startChroma = \(\) => \{[\s\S]{0,500}?globalThis\.setTimeout\(\(\) => \{[\s\S]{0,200}?adoptWallpaperPalette\(\);/)
  assert.match(CLIENT_SOURCE, /const stopChroma = \(\) => \{[\s\S]{0,240}?globalThis\.clearTimeout\(chromaTimer\);/)
})

// ---- R3 client sync protocol: instrumented product + fake storage/fetch. The host
// contract is covered above; this exercises the browser half end-to-end (each PUT
// carries expectedRevision, data keys never leave localStorage, PUT replies are
// adopted, and a 409 merges + retries without overwriting the other window's key).
await testAsync('R3/R3-B client: conflict-aware sync keeps in-flight edits (409 merge)', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'tl-r3-client-'))
  const productSource = readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8')
  const instrumented = productSource.replace(
    'exports.apply = apply;',
    'exports.apply = apply;\n\t\texports.__r3test = { settingsBootstrap, settingsFlushMirror, settingsState, settingsMirror, installSettingsRuntime, collectLocalSettings, tl5SyncableKey, settingsOnStorage };',
  )
  assert.notEqual(instrumented, productSource, 'instrumentation point present')
  const clientFile = join(dir, 'client.mjs')
  writeFileSync(clientFile, instrumented)
  const saved = {
    window: globalThis.window,
    fetch: globalThis.fetch,
    localStorage: globalThis.localStorage,
    BroadcastChannel: globalThis.BroadcastChannel,
  }
  const local = new Map()
  const fakeStorage = {
    getItem: (key) => (local.has(String(key)) ? local.get(String(key)) : null),
    setItem: (key, value) => void local.set(String(key), String(value)),
    removeItem: (key) => void local.delete(String(key)),
    key: (index) => [...local.keys()][index] ?? null,
    get length() {
      return local.size
    },
  }
  const calls = []
  const script = []
  let loaded = null
  let disposeRuntime = null
  globalThis.localStorage = fakeStorage
  globalThis.BroadcastChannel = undefined
  globalThis.window = {
    __ModuleLoader__: { load: (spec) => { loaded = spec } },
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent: () => true,
    setTimeout: (fn, ms) => setTimeout(fn, ms),
    clearTimeout: (id) => clearTimeout(id),
    setInterval: (fn, ms) => setInterval(fn, ms),
    clearInterval: (id) => clearInterval(id),
    innerWidth: 1000,
    innerHeight: 700,
    location: { protocol: 'http:', hash: '' },
  }
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ method: String(options.method ?? 'GET').toUpperCase(), body: options.body === undefined ? null : JSON.parse(options.body) })
    const next = script.shift()
    assert.ok(next !== undefined, 'unexpected host request')
    // R8 B1 test hook: let a test hold a response open to simulate a local edit that
    // happens while the request is already in flight.
    if (next.gate !== undefined && next.gate !== null) await next.gate
    return { ok: next.status >= 200 && next.status < 300, status: next.status, json: async () => next.body }
  }
  try {
    await import(pathToFileURL(clientFile).href + '?stamp=' + Date.now())
    // `react` is optional in the product factory; returning null keeps the test
    // output free of the product's "react-missing" diagnostic (nothing renders here).
    const r3 = loaded.factory(() => null).__r3test
    assert.ok(r3 !== undefined, 'instrumented product exposes the sync hooks')
    // Local settings + per-browser data before the first sync.
    local.set('tianlight.wallpaper', '{"kind":"image"}')
    local.set('tianlight.petChats.v1', 'chat-history')
    local.set('tianlight.sync.revision', '0')
    script.push(
      { status: 200, body: { ok: true, schemaVersion: 5, revision: 0, updatedAt: null, settings: {} } },
      {
        status: 200,
        body: {
          ok: true,
          revision: 1,
          updatedAt: '2026-11-11T00:00:00.000Z',
          settings: { 'tianlight.wallpaper': '{"kind":"image"}', 'tianlight.hostkey': 'from-host' },
        },
      },
    )
    await r3.settingsBootstrap()
    assert.equal(calls.length, 2, 'bootstrap = GET + one PUT')
    assert.equal(calls[1].body.expectedRevision, 0, 'every PUT states the last seen host revision')
    assert.equal('tianlight.petChats.v1' in calls[1].body.settings, false, 'chat data is never mirrored')
    assert.equal(local.get('tianlight.petChats.v1'), 'chat-history', 'chat data stays local')
    assert.equal(local.get('tianlight.hostkey'), 'from-host', 'PUT reply map adopted locally')

    // 409: another window wrote between our read and our write.
    disposeRuntime = r3.installSettingsRuntime({ dispatchEvent: () => true })
    calls.length = 0
    fakeStorage.setItem('tianlight.glass', '0.8')
    fakeStorage.setItem('tianlight.wallpaper', '{"kind":"video"}')
    script.push(
      {
        status: 409,
        body: {
          ok: false,
          conflict: true,
          revision: 5,
          updatedAt: '2026-11-11T00:00:01.000Z',
          settings: { 'tianlight.wallpaper': '{"kind":"shader"}', 'tianlight.otherkey': 'other-window' },
        },
      },
      {
        status: 200,
        body: {
          ok: true,
          revision: 6,
          updatedAt: '2026-11-11T00:00:02.000Z',
          settings: {
            'tianlight.wallpaper': '{"kind":"shader"}',
            'tianlight.otherkey': 'other-window',
            'tianlight.hostkey': 'from-host',
            'tianlight.glass': '0.8',
          },
        },
      },
    )
    await r3.settingsFlushMirror()
    assert.equal(calls[0].body.expectedRevision, 1)
    await new Promise((resolve) => setTimeout(resolve, 500))
    assert.equal(calls.length, 2, 'the 409 is retried once')
    assert.equal(calls[1].body.expectedRevision, 5, 'retry uses the revision from the 409')
    assert.equal(calls[1].body.settings['tianlight.glass'], '0.8', 'non-conflicting local edit retried')
    assert.equal('tianlight.wallpaper' in calls[1].body.settings, false, 'stale same-key edit is not pushed over the other window')
    assert.equal(local.get('tianlight.wallpaper'), '{"kind":"shader"}', 'other window same-key value wins')
    assert.equal(local.get('tianlight.otherkey'), 'other-window', 'other window edits merged locally')

    // REV-R3 B1a: a 409 whose snapshot still carries the OLD value of a key we are
    // writing (the conflict was on a DIFFERENT key) must keep our edit and retry it.
    calls.length = 0
    fakeStorage.setItem('tianlight.glass', '0.7')
    script.push({
      status: 409,
      body: {
        ok: false,
        conflict: true,
        revision: 7,
        updatedAt: '2026-11-11T00:00:04.000Z',
        settings: {
          'tianlight.wallpaper': '{"kind":"shader"}',
          'tianlight.otherkey': 'other-window',
          'tianlight.hostkey': 'from-host',
          'tianlight.glass': '0.9',
        },
      },
    })
    await r3.settingsFlushMirror()
    await new Promise((resolve) => setTimeout(resolve, 450))
    assert.equal(calls.length, 1, 'same-key conflict needs no retry when the host won')
    assert.equal(local.get('tianlight.glass'), '0.9', 'same-key concurrent change: host value wins')
    assert.equal(r3.settingsMirror.queue.size, 0)

    // Establish a known host value for fps first (successful flush).
    calls.length = 0
    fakeStorage.setItem('tianlight.fps', '30')
    script.push({
      status: 200,
      body: {
        ok: true,
        revision: 8,
        updatedAt: '2026-11-11T00:00:05.000Z',
        settings: {
          'tianlight.wallpaper': '{"kind":"shader"}',
          'tianlight.otherkey': 'other-window',
          'tianlight.hostkey': 'from-host',
          'tianlight.glass': '0.9',
          'tianlight.fps': '30',
        },
      },
    })
    await r3.settingsFlushMirror()
    assert.equal(local.get('tianlight.fps'), '30')

    // B1: the exact review scenario — A changes fps, B changed another key; the 409
    // snapshot still has fps:"30" (unchanged). Pre-fix this rolled A's edit back.
    calls.length = 0
    fakeStorage.setItem('tianlight.fps', '60')
    script.push(
      {
        status: 409,
        body: {
          ok: false,
          conflict: true,
          revision: 9,
          updatedAt: '2026-11-11T00:00:06.000Z',
          settings: {
            'tianlight.wallpaper': '{"kind":"shader"}',
            'tianlight.otherkey': 'other-window',
            'tianlight.hostkey': 'from-host',
            'tianlight.glass': '0.9',
            'tianlight.fps': '30',
            'tianlight.otherconflict': 'x',
          },
        },
      },
      {
        status: 200,
        body: {
          ok: true,
          revision: 10,
          updatedAt: '2026-11-11T00:00:07.000Z',
          settings: {
            'tianlight.wallpaper': '{"kind":"shader"}',
            'tianlight.otherkey': 'other-window',
            'tianlight.hostkey': 'from-host',
            'tianlight.glass': '0.9',
            'tianlight.fps': '60',
            'tianlight.otherconflict': 'x',
          },
        },
      },
    )
    await r3.settingsFlushMirror()
    assert.equal(calls[0].body.expectedRevision, 8)
    assert.equal(local.get('tianlight.fps'), '60', 'our edit survives the 409 merge (B1)')
    await new Promise((resolve) => setTimeout(resolve, 450))
    assert.equal(calls.length, 2, 'the non-conflicting batch key is retried')
    assert.equal(calls[1].body.expectedRevision, 9)
    assert.equal(calls[1].body.settings['tianlight.fps'], '60', 'retry pushes our fps change')
    assert.equal('tianlight.otherconflict' in calls[1].body.settings, false)
    assert.equal(local.get('tianlight.fps'), '60', 'and it lands in the local mirror')
    assert.equal(local.get('tianlight.otherconflict'), 'x', 'other window state still merged')
    assert.equal(r3.settingsState.knownRemote['tianlight.fps'], '60', 'knownRemote advanced to the adopted snapshot')

    // B1 tombstone, different-key conflict: our deletion must survive the merge.
    calls.length = 0
    fakeStorage.removeItem('tianlight.glass')
    assert.equal(local.has('tianlight.glass'), false)
    script.push(
      {
        status: 409,
        body: {
          ok: false,
          conflict: true,
          revision: 11,
          updatedAt: '2026-11-11T00:00:08.000Z',
          settings: {
            'tianlight.wallpaper': '{"kind":"shader"}',
            'tianlight.otherkey': 'other-window',
            'tianlight.hostkey': 'from-host',
            'tianlight.glass': '0.9',
            'tianlight.fps': '60',
            'tianlight.otherconflict': 'x',
            'tianlight.newkey': 'y',
          },
        },
      },
      {
        status: 200,
        body: {
          ok: true,
          revision: 12,
          updatedAt: '2026-11-11T00:00:09.000Z',
          settings: {
            'tianlight.wallpaper': '{"kind":"shader"}',
            'tianlight.otherkey': 'other-window',
            'tianlight.hostkey': 'from-host',
            'tianlight.glass': null,
            'tianlight.fps': '60',
            'tianlight.otherconflict': 'x',
            'tianlight.newkey': 'y',
          },
        },
      },
    )
    await r3.settingsFlushMirror()
    assert.equal(calls[0].body.expectedRevision, 10)
    assert.equal(local.has('tianlight.glass'), false, 'our tombstone is not resurrected by the merge')
    await new Promise((resolve) => setTimeout(resolve, 450))
    assert.equal(calls.length, 2, 'the tombstone is retried')
    assert.equal(calls[1].body.settings['tianlight.glass'], null, 'retry pushes the null tombstone')
    assert.equal(local.has('tianlight.glass'), false, 'deletion finally applied locally')
    assert.equal(local.get('tianlight.newkey'), 'y', 'other window state merged')

    // B1 tombstone, same-key conflict: another window wrote the key while we deleted
    // it; the host value wins (we must not re-apply our tombstone over it).
    calls.length = 0
    fakeStorage.removeItem('tianlight.fps')
    script.push({
      status: 409,
      body: {
        ok: false,
        conflict: true,
        revision: 13,
        updatedAt: '2026-11-11T00:00:10.000Z',
        settings: {
          'tianlight.wallpaper': '{"kind":"shader"}',
          'tianlight.otherkey': 'other-window',
          'tianlight.hostkey': 'from-host',
          'tianlight.glass': null,
          'tianlight.fps': '61',
          'tianlight.otherconflict': 'x',
          'tianlight.newkey': 'y',
        },
      },
    })
    await r3.settingsFlushMirror()
    await new Promise((resolve) => setTimeout(resolve, 450))
    assert.equal(calls.length, 1, 'no retry when the host won the same-key conflict')
    assert.equal(local.get('tianlight.fps'), '61', 'same-key winner is applied, our tombstone dropped')

    // Push-path 409 (bootstrap): the same protection must hold for the diff push.
    calls.length = 0
    local.set('tianlight.localonly', 'mine')
    local.set('tianlight.kept', 'mine')
    script.push(
      {
        status: 200,
        body: {
          ok: true,
          revision: 5,
          updatedAt: '2026-11-11T00:00:11.000Z',
          settings: { 'tianlight.fps': '61', 'tianlight.kept': 'hostOld', 'tianlight.wallpaper': '{"kind":"shader"}' },
        },
      },
      {
        status: 409,
        body: {
          ok: false,
          conflict: true,
          revision: 6,
          updatedAt: '2026-11-11T00:00:12.000Z',
          settings: {
            'tianlight.fps': '61',
            'tianlight.kept': 'hostOld',
            'tianlight.wallpaper': '{"kind":"shader"}',
            'tianlight.otherkey': 'changed-by-other',
          },
        },
      },
      {
        status: 200,
        body: {
          ok: true,
          revision: 7,
          updatedAt: '2026-11-11T00:00:13.000Z',
          settings: {
            'tianlight.fps': '61',
            'tianlight.kept': 'mine',
            'tianlight.localonly': 'mine',
            'tianlight.wallpaper': '{"kind":"shader"}',
            'tianlight.otherkey': 'changed-by-other',
            'tianlight.hostkey': 'from-host',
            'tianlight.otherconflict': 'x',
            'tianlight.newkey': 'y',
          },
        },
      },
    )
    await r3.settingsBootstrap()
    assert.equal(calls[0].method, 'GET')
    assert.equal(calls[1].body.expectedRevision, 5, 'push uses the GET revision')
    assert.equal(calls[2].body.expectedRevision, 6, 'push conflict retry uses the 409 revision')
    assert.equal(calls[2].body.settings['tianlight.kept'], 'mine', 'unchanged host key: local push kept')
    assert.equal(calls[2].body.settings['tianlight.localonly'], 'mine', 'local-only key still pushed')
    assert.equal('tianlight.otherkey' in calls[2].body.settings, false, 'host-changed key is not overwritten')
    assert.equal(local.get('tianlight.kept'), 'mine', 'local value intact after push conflict')
    assert.equal(local.get('tianlight.otherkey'), 'changed-by-other', 'host value merged locally')

    // R8 B1 (REV-R3B M-1): a same-key edit made while the PUT is in flight must stay
    // queued and retry — the older "host wins" value must not overwrite the newest
    // local edit. The fake host holds the 409 open until the test queues that edit.
    calls.length = 0
    fakeStorage.setItem('tianlight.fps', '70')
    let releaseConflict = null
    const conflictGate = new Promise((resolveGate) => {
      releaseConflict = resolveGate
    })
    const conflictHostState = {
      'tianlight.fps': '80',
      'tianlight.kept': 'mine',
      'tianlight.localonly': 'mine',
      'tianlight.wallpaper': '{"kind":"shader"}',
      'tianlight.otherkey': 'changed-by-other',
      'tianlight.hostkey': 'from-host',
      'tianlight.otherconflict': 'x',
      'tianlight.newkey': 'y',
    }
    script.push(
      {
        status: 409,
        gate: conflictGate,
        body: { ok: false, conflict: true, revision: 8, updatedAt: '2026-11-11T00:00:15.000Z', settings: conflictHostState },
      },
      {
        status: 200,
        body: {
          ok: true,
          revision: 9,
          updatedAt: '2026-11-11T00:00:16.000Z',
          settings: { ...conflictHostState, 'tianlight.fps': '90' },
        },
      },
    )
    const inflight = r3.settingsFlushMirror()
    const inflightStart = Date.now()
    while (calls.length === 0 && Date.now() - inflightStart < 1500) await new Promise((resolveTick) => setTimeout(resolveTick, 10))
    assert.equal(calls.length, 1, 'the first PUT is in flight')
    fakeStorage.setItem('tianlight.fps', '90') // newer local edit while the request is open
    releaseConflict()
    await inflight
    await new Promise((resolveTick) => setTimeout(resolveTick, 450))
    assert.equal(calls.length, 2, 'the newer local edit is re-queued and retried')
    assert.equal(calls[1].body.settings['tianlight.fps'], '90', 'retry pushes the newest local value')
    assert.equal(local.get('tianlight.fps'), '90', 'newest local edit survived the host-wins merge')

    // Old host compatibility: revision-only PUT reply (no settings map).
    calls.length = 0
    fakeStorage.setItem('tianlight.fps', '60')
    script.push({ status: 200, body: { ok: true, revision: 10, updatedAt: '2026-11-11T00:00:16.500Z' } })
    await r3.settingsFlushMirror()
    assert.equal(calls.length, 1)
    assert.equal(r3.settingsState.hostRevision, 10, 'old-host revision adopted as the lock base')
    assert.equal(local.get('tianlight.fps'), '60')

    // MINOR M1: a storage-event revision bump also raises the optimistic-lock base.
    r3.settingsOnStorage({ key: 'tianlight.sync.revision', newValue: '99', oldValue: '13' })
    assert.equal(r3.settingsState.hostRevision, 99, 'storage fallback updates hostRevision')
    assert.equal(r3.settingsState.revision, 99)
    // MINOR M2: a fresh local edit resets the mirror conflict-retry counter.
    r3.settingsMirror.conflicts = 5
    fakeStorage.setItem('tianlight.fps', '59')
    assert.equal(r3.settingsMirror.conflicts, 0, 'new batch gets a fresh retry budget')

    for (const key of ['tianlight.petChats.v1', 'tianlight.petMind.v1', 'tianlight.life.v1', 'tianlight.pet.agent.v1', 'tianlight.cache.known']) {
      assert.equal(r3.tl5SyncableKey(key), false, key + ' is data')
      assert.equal(r3.collectLocalSettings()[key], undefined)
    }
  } finally {
    try {
      if (typeof disposeRuntime === 'function') disposeRuntime()
    } catch {
      // teardown is best effort in the test process
    }
    if (saved.window === undefined) delete globalThis.window
    else globalThis.window = saved.window
    if (saved.fetch === undefined) delete globalThis.fetch
    else globalThis.fetch = saved.fetch
    if (saved.localStorage === undefined) delete globalThis.localStorage
    else globalThis.localStorage = saved.localStorage
    if (saved.BroadcastChannel === undefined) delete globalThis.BroadcastChannel
    else globalThis.BroadcastChannel = saved.BroadcastChannel
    rmSync(dir, { recursive: true, force: true })
  }
})

// ---- R4A pet security: same-page script replacing globals must not be able to
// authorize or use the DSH Agent bridge; medium/high grants are session-memory only;
// imported/localStorage capability bits are ignored; UI-facing adapters are honest.
await testAsync('R4A client: pet privileges cannot be reached through replaceable globals', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'tl-r4a-client-'))
  const productSource = readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8')
  const instrumented = productSource.replace(
    'exports.apply = apply;',
    [
      'exports.apply = apply;',
      '\t\texports.__r4a = {',
      '\t\t\tinstallPetBrain, installPetAgent, petLoadPermissions, petPermissionRows, petGrant, petRevoke,',
      '\t\t\tpetRequestUiConsent, petAgentInternal, petAgentStatus, petBrainInternal, petAuditRead,',
      '\t\t};',
    ].join('\n'),
  )
  assert.notEqual(instrumented, productSource, 'instrumentation point present')
  const clientFile = join(dir, 'client.mjs')
  writeFileSync(clientFile, instrumented)
  const saved = {
    window: globalThis.window,
    localStorage: globalThis.localStorage,
    BroadcastChannel: globalThis.BroadcastChannel,
    tianlightPet: globalThis.tianlightPet,
    tianlightPetMind: globalThis.tianlightPetMind,
    tianlightPetAgent: globalThis.tianlightPetAgent,
  }
  const local = new Map()
  const fakeStorage = {
    getItem: (key) => (local.has(String(key)) ? local.get(String(key)) : null),
    setItem: (key, value) => void local.set(String(key), String(value)),
    removeItem: (key) => void local.delete(String(key)),
    key: (index) => [...local.keys()][index] ?? null,
    get length() {
      return local.size
    },
  }
  let loaded = null
  let disposeBrain = null
  let disposeAgent = null
  // post-2.0.0 regression: `ctx.inject()` returns a Fiber with `.dispose()` in the real
  // product; the fake below must expose that shape so a teardown TypeError cannot hide.
  const agentInjected = []
  globalThis.localStorage = fakeStorage
  globalThis.BroadcastChannel = undefined
  globalThis.window = {
    __ModuleLoader__: { load: (spec) => { loaded = spec } },
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent: () => true,
    setTimeout: (fn, ms) => setTimeout(fn, ms),
    clearTimeout: (id) => clearTimeout(id),
    setInterval: () => 1, // the 60s mind loop is irrelevant here; never actually runs
    clearInterval() {},
    innerWidth: 1000,
    innerHeight: 700,
    location: { protocol: 'http:', hash: '' },
  }
  try {
    await import(pathToFileURL(clientFile).href + '?stamp=' + Date.now())
    const r4a = loaded.factory(() => null).__r4a
    assert.ok(r4a !== undefined, 'instrumented product exposes the pet security hooks')
    // A legacy/imported document marks dangerous caps as granted; a reload must not
    // trust any of them (only the safe bit "chat" may be honored).
    local.set(
      'tianlight.pet.permissions.v1',
      JSON.stringify({ version: 1, granted: { chat: false, llm: true, agentChat: true, shell: true, network: true } }),
    )
    disposeBrain = r4a.installPetBrain()
    // R8 A2: the documented global exposes the read-only audit() but no write path;
    // the agent bridge uses the same-closure petBrainInternal.recordExternal instead.
    const publicBrain = globalThis.tianlightPet
    assert.ok(publicBrain !== null && typeof publicBrain === 'object')
    assert.equal(typeof publicBrain.recordExternal, 'undefined', 'public brain API has no audit-write path')
    assert.equal(typeof publicBrain.audit, 'function', 'read-only audit surface stays')
    assert.equal(typeof r4a.petBrainInternal.recordExternal, 'function', 'internal audit-write path stays')
    const rows = r4a.petPermissionRows()
    const row = (id) => rows.find((entry) => entry.id === id)
    assert.equal(row('chat').granted, false, 'persisted safe bit is honored')
    assert.equal(row('llm').granted, false, 'llm grant is not restored from storage')
    assert.equal(row('agentChat').granted, false, 'agentChat grant is not restored from storage')
    assert.equal(row('shell').granted, false, 'high-risk grant is not restored from storage')
    assert.equal(row('network').granted, false)
    const scrubbed = JSON.parse(local.get('tianlight.pet.permissions.v1'))
    assert.deepEqual(Object.keys(scrubbed.granted).sort(), ['chat', 'focus', 'media', 'memory', 'proactive', 'remind'])
    assert.equal('agentChat' in scrubbed.granted, false)

    // The DSH Agent bridge needs a remote.session; provide a fake one.
    const remote = {
      list: async () => ({ ok: true, value: { items: [{ sessionId: 'sess-1', title: 'Existing session', running: true }] } }),
      create: async () => ({ ok: true, value: { sessionId: 'sess-new' } }),
      prompt: async () => ({ ok: true, value: { accepted: true } }),
      follow: () => null,
    }
    const fakeCtx = {
      get: () => undefined,
      effect: (fn) => fn(),
      inject: (_deps, callback) => {
        const disposer = callback({ get: (name) => (name === 'remote.session' ? remote : undefined), remote: { session: remote } })
        let disposed = 0
        agentInjected.push({ calls: () => disposed })
        return {
          dispose() {
            disposed += 1
            if (typeof disposer === 'function') disposer()
          },
        }
      },
    }
    disposeAgent = r4a.installPetAgent(fakeCtx)
    assert.equal(r4a.petAgentStatus().permission, false)

    // Attack: replace the brain global with a permissive fake; nothing changes.
    globalThis.tianlightPet = {
      status: () => ({ paused: false, permissions: { agentChat: true } }),
      grant: () => ({ ok: true }),
      recordExternal: () => ({ ok: true }),
      audit: () => [],
      permissions: () => [],
    }
    let listed = await r4a.petAgentInternal.refreshSessions()
    assert.equal(listed.ok, false)
    assert.equal(listed.reason, 'permission', 'listing sessions requires the real grant')
    const deniedChat = await r4a.petAgentInternal.chat('hello')
    assert.equal(deniedChat.ok, false)
    assert.equal(deniedChat.reason, 'permission')
    // R8 A3: opening the connected session is gated like connect/chat/list.
    const deniedOpen = await r4a.petAgentInternal.openSession()
    assert.equal(deniedOpen.ok, false)
    assert.equal(deniedOpen.reason, 'permission', 'openSession requires the agentChat grant')

    // Attack: the published global is a frozen read-only status surface.
    const published = globalThis.tianlightPetAgent
    assert.ok(published !== null && typeof published === 'object')
    for (const method of ['connect', 'chat', 'refreshSessions', 'openSession', 'disconnect']) {
      assert.equal(typeof published[method], 'undefined', 'global must not expose ' + method)
    }
    assert.equal(typeof published.status, 'function')
    globalThis.tianlightPetAgent = { connect: async () => ({ ok: true }), chat: async () => ({ ok: true }) }
    assert.equal(r4a.petAgentStatus().permission, false, 'replacing the read-only global grants nothing')

    // Fixed-string consent is dead; the internal one-shot ticket is the only path.
    const stringConsent = r4a.petGrant('agentChat', { consent: 'user-explicit' })
    assert.equal(stringConsent.ok, false)
    assert.equal(stringConsent.reason, 'consent-required')
    const forgedShape = r4a.petGrant('agentChat', { consent: { cap: 'agentChat' } })
    assert.equal(forgedShape.ok, false, 'a lookalike object is not a ticket')
    const ticket = r4a.petRequestUiConsent('agentChat')
    const granted = r4a.petGrant('agentChat', { consent: ticket })
    assert.equal(granted.ok, true, 'the role hub can still grant through the closure ticket')
    assert.equal(r4a.petAgentStatus().permission, true)
    const replay = r4a.petGrant('agentChat', { consent: ticket })
    assert.equal(replay.ok, false, 'consent tickets are single-use')
    listed = await r4a.petAgentInternal.refreshSessions()
    assert.equal(listed.ok, true)
    assert.equal(listed.sessions.length, 1, 'after a real grant the list is available')
    const connected = await r4a.petAgentInternal.connect({ mode: 'new' })
    assert.equal(connected.ok, true, 'after a real grant the hub can connect')
    const agentChat = await r4a.petAgentInternal.chat('hello from the hub')
    assert.equal(agentChat.ok, true, 'after a real grant the hub can send')
    // R8 A3: once authorized, openSession reaches the workspace path instead of the gate.
    const opened = await r4a.petAgentInternal.openSession()
    assert.equal(opened.ok, false)
    assert.equal(opened.reason, 'workspace-unavailable', 'authorized openSession is no longer permission-blocked')

    // The retained high-risk framework still has a REAL gate: permission ->
    // adapter-missing -> adapter call, and the UI row reports the adapter honestly.
    const shellDenied = await r4a.petBrainInternal.invokeCapability('shell', 'echo hi')
    assert.equal(shellDenied.ok, false)
    assert.equal(shellDenied.reason, 'permission')
    r4a.petGrant('shell', { consent: r4a.petRequestUiConsent('shell') })
    const shellNoAdapter = await r4a.petBrainInternal.invokeCapability('shell', 'echo hi')
    assert.equal(shellNoAdapter.ok, false)
    assert.equal(shellNoAdapter.reason, 'adapter-missing')
    const shellRow = r4a.petPermissionRows().find((entry) => entry.id === 'shell')
    assert.equal(shellRow.granted, true)
    assert.equal(shellRow.adapter, false, 'granted high-risk row reports no adapter')
    r4a.petBrainInternal.setCapabilityAdapter('shell', { id: 'test-shell-adapter', run: (input) => 'ran:' + input })
    const shellRowWithAdapter = r4a.petPermissionRows().find((entry) => entry.id === 'shell')
    assert.equal(shellRowWithAdapter.adapter, true, 'row flips to adapter:true after registration')
    const shellRan = await r4a.petBrainInternal.invokeCapability('shell', 'echo hi')
    assert.equal(shellRan.ok, true)
    assert.equal(shellRan.adapterId, 'test-shell-adapter')
    assert.equal(shellRan.result, 'ran:echo hi')
    r4a.petBrainInternal.clearCapabilityAdapter('shell')

    // Session-only: nothing dangerous may be written back to localStorage.
    r4a.petGrant('shell', { consent: r4a.petRequestUiConsent('shell') })
    const afterGrants = JSON.parse(local.get('tianlight.pet.permissions.v1'))
    assert.equal('agentChat' in afterGrants.granted, false)
    assert.equal('shell' in afterGrants.granted, false)

    // Revoking drops access again, and the audit ring recorded the denials via the
    // same-closure path (a replaced global cannot suppress them).
    r4a.petRevoke('agentChat')
    listed = await r4a.petAgentInternal.refreshSessions()
    assert.equal(listed.ok, false)
    const audit = r4a.petAuditRead(60)
    assert.ok(Array.isArray(audit) && audit.some((entry) => entry.action === 'agent' && entry.ok === false))

    // post-2.0.0: older hosts return a disposer FUNCTION from ctx.inject; disposing must
    // still call it (the Fiber-shaped fake above covers the current host).
    let functionShapeCleanupCalls = 0
    const functionShapeDispose = r4a.installPetAgent({
      get: () => undefined,
      effect: (fn) => fn(),
      inject: (_deps, callback) => {
        const disposer = callback({})
        return () => {
          functionShapeCleanupCalls += 1
          if (typeof disposer === 'function') disposer()
        }
      },
    })
    functionShapeDispose()
    assert.equal(functionShapeCleanupCalls, 2, 'function-shaped ctx.inject disposers are called exactly once per injection')
  } finally {
    // Teardown must not log "pet-agent:dispose TypeError: cleanup is not a function"
    // and every Fiber captured from ctx.inject() must be disposed.
    const disposeWarnings = []
    const originalWarn = console.warn
    console.warn = (...args) => {
      disposeWarnings.push(args.map((value) => String(value)).join(' '))
    }
    try {
      if (typeof disposeAgent === 'function') disposeAgent()
    } catch {
      // best effort
    } finally {
      console.warn = originalWarn
    }
    assert.equal(
      disposeWarnings.some((line) => line.includes('pet-agent:dispose')),
      false,
      'Fiber-shaped ctx.inject scopes are disposed without a teardown TypeError',
    )
    assert.ok(agentInjected.length >= 2, 'both injected scopes were captured by the fake ctx')
    assert.ok(agentInjected.every((probe) => probe.calls() >= 1), 'every injected Fiber was disposed via .dispose()')
    try {
      if (typeof disposeBrain === 'function') disposeBrain()
    } catch {
      // best effort
    }
    const restore = (name, value) => {
      if (value === undefined) delete globalThis[name]
      else globalThis[name] = value
    }
    restore('window', saved.window)
    restore('localStorage', saved.localStorage)
    restore('BroadcastChannel', saved.BroadcastChannel)
    restore('tianlightPet', saved.tianlightPet)
    restore('tianlightPetMind', saved.tianlightPetMind)
    restore('tianlightPetAgent', saved.tianlightPetAgent)
    rmSync(dir, { recursive: true, force: true })
  }
})

// ---- R5 unified overlay stack: Esc belongs to the top layer, the Tab trap only to
// a modal top layer. Exercised through the real product code (instrumented build).
await testAsync('R5 overlay stack: Esc closes only the top layer; Tab trap only for modal', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'tl-r5-'))
  const productSource = readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8')
  const instrumented = productSource.replace(
    'exports.apply = apply;',
    [
      'exports.apply = apply;',
      '\t\texports.__r5test = {',
      '\t\t\ttl5OverlayRegister, tl5OverlayUnregister, tl5OverlayState, tl5OverlayTop, tl5OverlayOnKeyDown,',
      '\t\t\ttl5OverlayOpenAllowed, tl5OverlayModalAbove,',
      '\t\t};',
    ].join('\n'),
  )
  assert.notEqual(instrumented, productSource, 'instrumentation point present')
  const clientFile = join(dir, 'client.mjs')
  writeFileSync(clientFile, instrumented)
  const saved = { window: globalThis.window, document: globalThis.document }
  let loaded = null
  globalThis.window = {
    __ModuleLoader__: { load: (spec) => { loaded = spec } },
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent: () => true,
    setTimeout: (fn, ms) => setTimeout(fn, ms),
    clearTimeout: (id) => clearTimeout(id),
    innerWidth: 1000,
    innerHeight: 700,
    location: { protocol: 'http:', hash: '' },
  }
  try {
    await import(pathToFileURL(clientFile).href + '?stamp=' + Date.now())
    const r5 = loaded.factory(() => null).__r5test
    assert.ok(r5 !== undefined, 'instrumented product exposes the overlay stack')
    // Minimal DOM seam: only activeElement is read by the Tab trap.
    globalThis.document = { activeElement: null }
    const items = []
    for (let index = 0; index < 3; index += 1) {
      items.push({
        name: 'item-' + index,
        focused: false,
        focus() {
          this.focused = true
          globalThis.document.activeElement = this
        },
        getClientRects: () => [{}],
      })
    }
    const root = {
      isConnected: true,
      querySelectorAll: () => items,
      contains: (node) => items.includes(node),
    }
    const calls = []
    const escapes = () => ({
      key: 'Escape',
      prevented: false,
      stopped: false,
      preventDefault() {
        this.prevented = true
      },
      stopPropagation() {
        this.stopped = true
      },
    })
    const lower = r5.tl5OverlayRegister({
      id: 'wallpaper-panel',
      modal: true,
      root: () => root,
      onEscape: () => calls.push('wallpaper-panel'),
    })
    const upper = r5.tl5OverlayRegister({
      id: 'we-library-overlay',
      modal: true,
      root: () => root,
      onEscape: () => calls.push('we-library-overlay'),
    })
    assert.deepEqual(r5.tl5OverlayState().ids, ['wallpaper-panel', 'we-library-overlay'])
    assert.equal(r5.tl5OverlayTop().id, 'we-library-overlay')
    // R8b (REV-R5 F1): while the modal WE library is on top, opening the lower modal
    // wallpaper panel (Alt+W / edge handle) must be refused; opening the same top layer
    // is still allowed. This is the "no invisible layer that steals the keyboard top" rule.
    assert.equal(r5.tl5OverlayOpenAllowed('wallpaper-panel'), false, 'lower panel blocked under the modal top')
    assert.equal(r5.tl5OverlayOpenAllowed('we-library-overlay'), true, 'same layer re-open is allowed')
    assert.equal(r5.tl5OverlayModalAbove('wallpaper-panel').id, 'we-library-overlay')
    // R8b (REV-R5 5): a keyboard auto-repeat Esc must not close layer after layer.
    // R8c (REV-R8 F1): it must still be owned by the stack (prevent default AND stop
    // propagation) so the repeated key never leaks to DSH's own Esc handlers.
    const repeatedEsc = escapes()
    repeatedEsc.repeat = true
    r5.tl5OverlayOnKeyDown(repeatedEsc)
    assert.deepEqual(calls, [], 'repeat Esc is ignored by the overlay stack')
    assert.equal(repeatedEsc.prevented, true, 'repeat Esc is still default-prevented')
    assert.equal(repeatedEsc.stopped, true, 'repeat Esc does not propagate to DSH')
    const first = escapes()
    r5.tl5OverlayOnKeyDown(first)
    assert.deepEqual(calls, ['we-library-overlay'], 'Esc reaches only the top layer')
    assert.equal(first.prevented, true)
    assert.equal(calls.includes('wallpaper-panel'), false, 'the lower wallpaper panel stays open')
    upper()
    calls.length = 0
    r5.tl5OverlayOnKeyDown(escapes())
    assert.deepEqual(calls, ['wallpaper-panel'], 'after the top closes, Esc reaches the next layer')

    // Modal Tab trap: focus enters the panel and wraps from the last item.
    globalThis.document.activeElement = null
    items.forEach((item) => { item.focused = false })
    const tabIn = { key: 'Tab', shiftKey: false, prevented: false, preventDefault() { this.prevented = true } }
    r5.tl5OverlayOnKeyDown(tabIn)
    assert.equal(tabIn.prevented, true)
    assert.equal(items[0].focused, true, 'Tab from outside moves focus into the modal')
    items.forEach((item) => { item.focused = false })
    globalThis.document.activeElement = items[items.length - 1]
    const tabWrap = { key: 'Tab', shiftKey: false, prevented: false, preventDefault() { this.prevented = true } }
    r5.tl5OverlayOnKeyDown(tabWrap)
    assert.equal(tabWrap.prevented, true)
    assert.equal(items[0].focused, true, 'Tab on the last control wraps to the first')
    items.forEach((item) => { item.focused = false })
    globalThis.document.activeElement = items[0]
    const shiftWrap = { key: 'Tab', shiftKey: true, prevented: false, preventDefault() { this.prevented = true } }
    r5.tl5OverlayOnKeyDown(shiftWrap)
    assert.equal(shiftWrap.prevented, true)
    assert.equal(items[items.length - 1].focused, true, 'Shift+Tab on the first control wraps to the last')

    // Non-modal top layer (typography float / pet chat): Esc still closes it, but Tab
    // is never consumed or redirected away from the DSH composer.
    const font = r5.tl5OverlayRegister({
      id: 'font-panel',
      modal: false,
      root: () => root,
      onEscape: () => calls.push('font-panel'),
    })
    assert.equal(r5.tl5OverlayState().modal, false)
    // R8b: under a non-modal top there is no layering conflict for the other floats.
    assert.equal(r5.tl5OverlayOpenAllowed('wallpaper-panel'), true, 'non-modal top does not block other panels')
    calls.length = 0
    items.forEach((item) => { item.focused = false })
    globalThis.document.activeElement = null
    const fontTab = { key: 'Tab', shiftKey: false, prevented: false, preventDefault() { this.prevented = true } }
    r5.tl5OverlayOnKeyDown(fontTab)
    assert.equal(fontTab.prevented, false, 'a non-modal layer does not trap Tab')
    assert.equal(items.some((item) => item.focused), false, 'a non-modal layer never steals focus')
    r5.tl5OverlayOnKeyDown(escapes())
    assert.deepEqual(calls, ['font-panel'], 'Esc still closes the non-modal top layer')
    // The keyboard listener is installed only while the stack is non-empty.
    assert.equal(r5.tl5OverlayState().keyboard, true)
    lower()
    font()
    assert.equal(r5.tl5OverlayState().keyboard, false)
    assert.deepEqual(r5.tl5OverlayState().ids, [])
  } finally {
    const restore = (name, value) => {
      if (value === undefined) delete globalThis[name]
      else globalThis[name] = value
    }
    restore('window', saved.window)
    restore('document', saved.document)
    rmSync(dir, { recursive: true, force: true })
  }
})

// ---- R6 wallpaper-switching correctness: static contracts on the shipped product.
// Each assertion anchors one of the reported bugs so a regression cannot silently
// reintroduce it (4K decoder leak, stale late callbacks, fps misjudgement, transform
// fight between mirroring and slide/zoom transitions).
test('R6 A: leaving the video channel releases the decoder; samplers skip hidden video', () => {
  assert.match(
    CLIENT_SOURCE,
    /const releaseVideo = \(\) => \{[\s\S]{0,900}?video\.removeAttribute\("src"\);[\s\S]{0,200}?video\.load\(\);/,
    'releaseVideo clears src and calls load()',
  )
  assert.ok((CLIENT_SOURCE.match(/releaseVideo\(\);/g) ?? []).length >= 4, 'web/scene/shader/image/no-source paths release the video')
  assert.ok((CLIENT_SOURCE.match(/sceneVideo\.hidden === false/g) ?? []).length >= 3, 'legibility + zones + shared palette sampler skip a hidden video')
  assert.ok((CLIENT_SOURCE.match(/sceneVideo\.currentSrc !== ""/g) ?? []).length >= 3, '...and a released (src-less) video')
  // S4: the panel tint and the font-panel chroma now share one sampler, so the two
  // former copies cannot drift apart; both callers must still go through it.
  assert.ok((CLIENT_SOURCE.match(/tl5SampleWallpaperPalette\(\)/g) ?? []).length >= 2, 'both palette consumers use the shared sampler')
})

test('R6 B: async wallpaper callbacks are generation-guarded', () => {
  assert.match(CLIENT_SOURCE, /let sourceGeneration = 0;/)
  assert.match(CLIENT_SOURCE, /sourceGeneration \+= 1;/)
  assert.ok((CLIENT_SOURCE.match(/if \(generation !== sourceGeneration\) return;/g) ?? []).length >= 2, 'image onload/onerror guards')
  assert.ok((CLIENT_SOURCE.match(/failGeneration === sourceGeneration/g) ?? []).length >= 2, 'scene/web fallback thens')
  assert.ok((CLIENT_SOURCE.match(/fallbackGeneration === sourceGeneration/g) ?? []).length >= 2, 'shader fallback thens')
})

test('R6 C: a video frame rate is content, not performance evidence', () => {
  assert.match(CLIENT_SOURCE, /getVideoPlaybackQuality/)
  assert.match(CLIENT_SOURCE, /ADAPTIVE_VIDEO_DROP_RATIO/)
  assert.match(CLIENT_SOURCE, /Math\.round\(presented \/ rate\)/)
  assert.match(CLIENT_SOURCE, /if \(typeof sample\.perfLow === "boolean"\) return sample\.perfLow === true;/)
  assert.match(CLIENT_SOURCE, /scene\.dataset\.tlPerf = "low"/)
  const videoBranch = CLIENT_SOURCE.indexOf('scene.dataset.tlMedia === "video"')
  const fpsFloor = CLIENT_SOURCE.indexOf('if (fps > 0 && fps < EFFECT_BUDGET.sceneFpsFloor) return "scene-fps";')
  assert.ok(videoBranch > 0 && fpsFloor > videoBranch, '32-effects checks the video perf verdict before any fps floor')
  assert.match(CLIENT_SOURCE, /"scene-perf"/)
  assert.match(CLIENT_SOURCE, /fx\.frozenScenePerf/)
})

test('R6 D: mirroring composes with slide/zoom transitions instead of fighting them', () => {
  assert.match(CLIENT_SOURCE, /function supportsIndividualScale\(\)/)
  assert.match(CLIENT_SOURCE, /scene\.style\.setProperty\("--tl-flip"/)
  assert.match(CLIENT_SOURCE, /scale: var\(--tl-flip, 1 1\);/)
  assert.match(CLIENT_SOURCE, /video\.style\.removeProperty\("transform"\)/)
  const primaryAt = CLIENT_SOURCE.indexOf('if (supportsIndividualScale())')
  const fallbackAt = CLIENT_SOURCE.indexOf('video.style.transform = "scaleX(-1) translateZ(0)"')
  assert.ok(primaryAt > 0 && fallbackAt > primaryAt, 'inline-transform flip survives only as the legacy fallback branch')
})

// ---- R7: media fixtures are generated in a temp dir; the repo's assets/ is optional ----
test('R7 fixture: generated media drives transcode/catalog paths without repo assets', () => {
  const fixture = makeMediaFixture('tl-r7-fixture-')
  try {
    const options = { assetsDir: fixture.assetsDir, uploadsDir: fixture.uploadsDir, derivedDir: fixture.derivedDir }
    const assetInfo = resolveTranscodeSourceInfo('x.mp4', options)
    assert.ok(assetInfo !== null, 'asset fixture resolves')
    assert.equal(assetInfo.kind, 'assets')
    const uploadInfo = resolveTranscodeSourceInfo('uploads/x.mp4', options)
    assert.ok(uploadInfo !== null, 'upload fixture resolves')
    assert.equal(uploadInfo.kind, 'uploads')
    assert.equal(resolveTranscodeSource('missing.mp4', options), null)
    assert.equal(derivedOutputName(assetInfo.path, assetInfo.kind), 'assets-x.h264.mp4')
    const derived = listDerived(fixture.derivedDir)
    assert.equal(derived.length, 1)
    assert.equal(derived[0].id, 'derived/old.h264.mp4')
    assert.notEqual(derivedPath('old.h264.mp4', fixture.derivedDir), null)
    assert.equal(derivedPath('../escape.mp4', fixture.derivedDir), null)
    // The bytes are the generated ones (an empty/whitespace repo assets/ was never read).
    assert.equal(readFileSync(join(fixture.assetsDir, 'x.mp4')).equals(TINY_MP4), true)
    assert.equal(readFileSync(join(fixture.assetsDir, 'still.png')).equals(TINY_PNG), true)
  } finally {
    fixture.cleanup()
  }
})

test('R7: both harnesses are environment-independent (static guard)', () => {
  const testSource = readFileSync(new URL('./test.mjs', import.meta.url), 'utf8')
  const verifySource = readFileSync(new URL('./verify.mjs', import.meta.url), 'utf8')
  // The clean-clone regressions: no test may assert that the repo's own media exists.
  // Needles are assembled at runtime so this guard does not match its own source.
  const banned = ['items.length > 0, ' + "'existing sources still list'", 'items.some((item) => item.source' + " !== 'we')"]
  for (const needle of banned) {
    assert.equal(testSource.includes(needle), false, 'repo-asset presence assertion came back: ' + needle)
  }
  assert.match(testSource, /from '\.\/media-fixtures\.mjs'/, 'media-needing tests use the generated fixture module')
  // verify pins ffmpeg to a guaranteed-absent path and snapshots the working tree.
  assert.match(verifySource, /process\.env\.FFMPEG_PATH = FORCED_FFMPEG/, 'verify pins a deterministic absent ffmpeg')
  assert.match(verifySource, /snapshotTree\(/, 'verify snapshots the plugin tree')
  assert.match(verifySource, /verify did not write the plugin working tree/, 'verify asserts it wrote nothing')
})

// ---- R8 A: security closeout (published surfaces) ----
test('R8 A: instance/brain/agent/role-hub public surfaces expose no bypasses', () => {
  // A1: the published diagnostics object must not carry the live cordis ctx/fiber.
  assert.equal(/__dshTianlightInstance\s*\.\s*ctx\b/.test(CLIENT_SOURCE), false, 'no caller reaches the live instance ctx')
  const instanceAt = CLIENT_SOURCE.indexOf('instance = {')
  const instanceEnd = CLIENT_SOURCE.indexOf('globalThis[INSTANCE_REGISTRY_KEY] = instance;', instanceAt)
  assert.ok(instanceAt > 0 && instanceEnd > instanceAt, 'instance literal present')
  const instanceLiteral = CLIENT_SOURCE.slice(instanceAt, instanceEnd)
  assert.equal(/(?:^|\n)\s*ctx\s*,/.test(instanceLiteral), false, 'instance literal has no ctx field')
  assert.equal(/\bctx:\s*ctx\b/.test(instanceLiteral), false, 'instance literal has no ctx:ctx field')
  assert.match(CLIENT_SOURCE, /const ownerCtx = ctx;/, 'ctx stays in the apply closure')
  assert.match(CLIENT_SOURCE, /const teardownOwnedInstance = \(\) => \{/, 'teardown is closure-owned')
  assert.match(CLIENT_SOURCE, /previous\.dispose\(\)/, 'legacy (pre-R8) instances are torn down via their own dispose()')
  // A2: recordExternal is internal-only; the published brain API keeps read-only audit().
  const brainApiAt = CLIENT_SOURCE.indexOf('globalThis.tianlightPet = api')
  const brainApiStart = brainApiAt < 0 ? -1 : CLIENT_SOURCE.lastIndexOf('api = {', brainApiAt)
  const brainApiLiteral = brainApiStart < 0 ? '' : CLIENT_SOURCE.slice(brainApiStart, brainApiAt)
  assert.ok(brainApiLiteral !== '', 'published brain api literal present')
  assert.equal(/recordExternal\s*:/.test(brainApiLiteral), false, 'public tianlightPet exposes no audit-write path')
  assert.match(CLIENT_SOURCE, /recordExternal: \(entry\) => petRecordExternal\(entry\),/, 'internal bridge keeps recordExternal')
  // A3: openSession is gated like connect/chat/list.
  const openAt = CLIENT_SOURCE.indexOf('function petAgentOpenSession()')
  assert.ok(openAt > 0, 'petAgentOpenSession present')
  const openBody = CLIENT_SOURCE.slice(openAt, openAt + 320)
  assert.match(openBody, /if \(!petAgentPermitted\(\)\)/, 'openSession checks the agentChat grant')
  assert.match(openBody, /reason: "permission"/)
  // A4: synthetic (isTrusted=false) events cannot grant/connect/send.
  assert.match(CLIENT_SOURCE, /function isSyntheticUserEvent\(event\)/, 'synthetic-event helper present')
  assert.match(CLIENT_SOURCE, /event\.isTrusted === false/, 'helper depends on isTrusted')
  for (const signature of [
    /requestPermissionGrant = async \(id, risk, event\)/,
    /onLlmClick = async \(event\)/,
    /onAgentPermClick = async \(event\)/,
    /onAgentConnect = async \(event\)/,
    /sendChat = async \(event\)/,
  ]) {
    assert.match(CLIENT_SOURCE, signature, 'consent/Agent entry accepts the event: ' + String(signature))
  }
})

// ---- R8 B: review MINOR guards (sync queue, hidden-tab bridge, host identity) ----
test('R8 B: 409 queue protection, hidden-tab bridge cap and hostIdentity.api fallback', () => {
  // B1: host-wins adoption skips a key the user re-edited while the request was open.
  assert.match(
    CLIENT_SOURCE,
    /for \(const key of winners\) \{[\s\S]{0,160}?settingsMirror\.queue\.has\(key\)\) continue;/,
    'settingsResolveConflictBatch leaves queued keys to the retry path',
  )
  // B2: hidden tabs do not accumulate pendingRoots; visibilitychange runs one merged pass.
  assert.match(CLIENT_SOURCE, /document\.hidden === true/, 'bridge checks the hidden state')
  assert.match(CLIENT_SOURCE, /pendingRoots\.length > 2000/, 'pending work is hard-capped')
  assert.match(CLIENT_SOURCE, /document\.addEventListener\("visibilitychange", onVisibilityChange\)/, 'visibility listener installed')
  assert.match(CLIENT_SOURCE, /document\.removeEventListener\("visibilitychange", onVisibilityChange\)/, 'visibility listener removed on dispose')
  // B3: hostIdentity.api (reported by _engines) is consumed by the feedback label.
  assert.match(
    CLIENT_SOURCE,
    /if \(hostIdentity\.build !== ""\) return hostIdentity\.build;[\s\S]{0,400}?hostIdentity\.api !== ""\) return "api " \+ hostIdentity\.api;/,
    'hubVersionString prefers the reported hostIdentity.api',
  )
})

// ---- S2 (report §4 items 3 & 6): stable legibility decision + edge-triggered low power.
await testAsync('S2 client: legibility uses the original fill (hysteresis) and low power is edge-triggered', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'tl-r8s2-'))
  const productSource = readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8')
  const instrumented = productSource.replace(
    'exports.apply = apply;',
    [
      'exports.apply = apply;',
      '\t\texports.__s2 = {',
      '\t\t\tlegibilityShouldBoost, legibilityBaseCacheKey,',
      '\t\t\tinstallLowPower, installLegibilityGuard,',
      '\t\t\tsetLowPowerTargets: (scene, rail) => { scenePlayback = scene; railPlayback = rail; },',
      '\t\t\tgetLowPowerController: () => lowPowerController,',
      '\t\t\tinstallAudioProbe: () => {',
      '\t\t\t\tconst original = audioController.stop;',
      '\t\t\t\tlet stops = 0;',
      '\t\t\t\taudioController.stop = () => { stops += 1; };',
      '\t\t\t\treturn { count: () => stops, restore: () => { audioController.stop = original; } };',
      '\t\t\t},',
      '\t\t};',
    ].join('\n'),
  )
  assert.notEqual(instrumented, productSource, 'instrumentation point present')
  const clientFile = join(dir, 'client.mjs')
  writeFileSync(clientFile, instrumented)
  const saved = {
    window: globalThis.window,
    document: globalThis.document,
    localStorage: globalThis.localStorage,
    navigatorDescriptor: Object.getOwnPropertyDescriptor(globalThis, 'navigator'),
    matchMedia: globalThis.matchMedia,
    lowPowerController: globalThis.lowPowerController,
    MutationObserver: globalThis.MutationObserver,
  }
  const local = new Map()
  const handlers = {}
  const bodyAttrs = new Map()
  const body = {
    hasAttribute: (name) => bodyAttrs.has(name),
    getAttribute: (name) => (bodyAttrs.has(name) ? bodyAttrs.get(name) : null),
    setAttribute: (name, value) => void bodyAttrs.set(name, String(value)),
    removeAttribute: (name) => void bodyAttrs.delete(name),
    style: {
      removed: [],
      values: {},
      setProperty(name, value) {
        this.values[name] = String(value)
      },
      getPropertyValue(name) {
        return this.values[name] ?? ''
      },
      removeProperty(name) {
        this.removed.push(name)
        delete this.values[name]
      },
    },
  }
  // S2c NIT1: a no-op MutationObserver removes the `legibility:observer` ReferenceError
  // noise and lets the test cover the observer install/disconnect branch for real.
  const observerCalls = { created: 0, observed: 0, disconnected: 0 }
  globalThis.MutationObserver = class {
    constructor(callback) {
      this.callback = callback
      observerCalls.created += 1
    }
    observe() {
      observerCalls.observed += 1
    }
    disconnect() {
      observerCalls.disconnected += 1
    }
  }
  const makeTarget = () => ({
    pauses: 0,
    resumes: 0,
    userPaused: false,
    pause() {
      this.pauses += 1
    },
    resume() {
      // Mirrors the real playback contract: a user pause wins over a supervisor resume.
      if (this.userPaused === true) return
      this.resumes += 1
    },
  })
  const scene = makeTarget()
  const rail = makeTarget()
  const battery = {
    level: 0.8,
    charging: false,
    addEventListener: (name, fn) => { handlers[name] = fn },
    removeEventListener: () => {},
    fire: (name) => { if (typeof handlers[name] === 'function') handlers[name]() },
  }
  globalThis.localStorage = {
    getItem: (key) => (local.has(String(key)) ? local.get(String(key)) : null),
    setItem: (key, value) => void local.set(String(key), String(value)),
    removeItem: (key) => void local.delete(String(key)),
  }
  Object.defineProperty(globalThis, 'navigator', {
    value: { getBattery: async () => battery },
    configurable: true,
    writable: true,
  })
  globalThis.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} })
  globalThis.window = {
    __ModuleLoader__: { load: (spec) => { loaded = spec } },
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent: () => true,
    setTimeout: (fn, ms) => setTimeout(fn, ms),
    clearTimeout: (id) => clearTimeout(id),
    setInterval: () => 1,
    clearInterval() {},
    innerWidth: 1000,
    innerHeight: 700,
    location: { protocol: 'http:', hash: '' },
  }
  let loaded = null
  const documentFake = {
    hidden: false,
    body,
    addEventListener: (name, fn) => { handlers['document:' + name] = fn },
    removeEventListener: () => {},
    dispatchEvent: () => true,
    createElement: () => ({ width: 0, height: 0, getContext: () => null }),
    querySelector: () => null,
    querySelectorAll: () => [],
  }
  globalThis.document = documentFake
  let disposeLowPower = null
  let audioProbe = null
  try {
    await import(pathToFileURL(clientFile).href + '?stamp=' + Date.now())
    const s2 = loaded.factory(() => null).__s2
    assert.ok(s2 !== undefined, 'instrumented product exposes the S2 hooks')

    // ---- 1) legibility pure decision: original-background ratio + hysteresis ---------
    assert.equal(s2.legibilityShouldBoost(4.4, 4.5, true, false), true, 'low original contrast boosts')
    assert.equal(s2.legibilityShouldBoost(4.6, 4.5, true, false), false, 'ok contrast does not start a boost')
    assert.equal(s2.legibilityShouldBoost(4.6, 4.5, true, true), true, 'inside the band a boosted panel stays boosted')
    assert.equal(s2.legibilityShouldBoost(4.8, 4.5, true, true), false, 'clearly above the band releases the boost')
    assert.equal(s2.legibilityShouldBoost(3.0, 4.5, false, true), false, 'guard off always clears')
    assert.equal(s2.legibilityShouldBoost(3.0, 4.5, true, false), true, 'guard on still boosts low contrast')
    assert.match(
      CLIENT_SOURCE,
      /const LEGIBILITY_HYSTERESIS = 0\.25;/,
      'hysteresis constant present',
    )
    assert.match(CLIENT_SOURCE, /const readBaseFill = \(host, dark, fallbackFill\) =>/, 'original-fill cache helper present')
    assert.match(CLIENT_SOURCE, /getPropertyValue\("--tl-panel-fill"\)/, 'decision reads the base panel token, not the boosted style')
    assert.match(CLIENT_SOURCE, /legibilityShouldBoost\(ratio, settings\.threshold/, 'evaluate() uses the pure decision')
    assert.match(CLIENT_SOURCE, /function legibilityBaseCacheKey\(dark, panelToken, inlineFill\)/, 'base cache key helper present')
    assert.match(CLIENT_SOURCE, /host\.style\.getPropertyValue\("--tl-panel-fill"\)/, 'cached base refreshes from the host inline token')
    assert.match(CLIENT_SOURCE, /baseKey === key/, 'cache is keyed by theme + tokens')
    assert.equal(CLIENT_SOURCE.includes('baseFillDark'), false, 'old theme-only cache key is gone')
    assert.equal(
      CLIENT_SOURCE.includes('fill = parseCssColor(style.backgroundColor) ?? fallbackFill'),
      false,
      'the boosted computed background is no longer the decision input',
    )
    // REV-S2 F2: same-theme base changes (glass amount / sidebar tint / inline fill)
    // must invalidate the cache instead of waiting for the boost to be released.
    const keyLight = s2.legibilityBaseCacheKey(false, 'rgba(250,252,255,0.9)', '')
    assert.equal(s2.legibilityBaseCacheKey(false, 'rgba(250,252,255,0.9)', ''), keyLight, 'identical inputs keep the cache')
    assert.notEqual(s2.legibilityBaseCacheKey(false, 'rgba(250,252,255,0.8)', ''), keyLight, 'same-theme token change invalidates the cache')
    assert.notEqual(s2.legibilityBaseCacheKey(false, 'rgba(250,252,255,0.9)', 'rgba(250,252,255,0.7)'), keyLight, 'same-theme inline fill change invalidates the cache')
    assert.notEqual(s2.legibilityBaseCacheKey(true, 'rgba(250,252,255,0.9)', ''), keyLight, 'theme change invalidates the cache')
    // S2c NIT3: length-prefixing keeps tokens that themselves contain separators apart.
    assert.notEqual(
      s2.legibilityBaseCacheKey(false, 'a|b', 'c'),
      s2.legibilityBaseCacheKey(false, 'a', 'b|c'),
      'cache keys cannot collide through separator characters',
    )

    // ---- 2) low power: edge-triggered, hidden page never resumes --------------------
    s2.setLowPowerTargets(scene, rail)
    audioProbe = s2.installAudioProbe()
    let notified = 0
    disposeLowPower = s2.installLowPower()
    await new Promise((resolveTick) => setTimeout(resolveTick, 0))
    const controller = s2.getLowPowerController()
    assert.ok(controller !== null && typeof controller === 'object', 'controller published')
    const unsubscribe = controller.subscribe(() => { notified += 1 })
    assert.equal(notified, 1, 'subscribe delivers one initial snapshot')
    assert.equal(scene.pauses + rail.pauses, 0, 'healthy battery: no pause')
    assert.equal(scene.resumes + rail.resumes, 0, 'healthy battery: no resume')
    assert.equal(bodyAttrs.has('data-tl-lowpower'), false)

    // Ordinary 1% changes above the threshold: no side effect at all.
    battery.level = 0.5
    battery.fire('levelchange')
    assert.equal(scene.pauses + rail.pauses, 0, 'a normal level change stays a no-op')
    assert.equal(notified, 1, 'no subscriber churn for a normal level change')

    // Crossing INTO low power pauses once.
    battery.level = 0.15
    battery.charging = false
    battery.fire('levelchange')
    assert.equal(bodyAttrs.has('data-tl-lowpower'), true, 'low power attribute set on crossing')
    assert.equal(scene.pauses, 1, 'scene paused on entering low power')
    assert.equal(rail.pauses, 1, 'rail paused on entering low power')
    assert.equal(audioProbe.count(), 1, 'audio stopped once on entering low power')
    assert.equal(notified, 2, 'one notification for the transition')
    const resumesAfterEnter = scene.resumes + rail.resumes

    // More level changes while low: still no repeated pause/resume, no notification.
    battery.level = 0.1
    battery.fire('levelchange')
    battery.level = 0.12
    battery.fire('levelchange')
    assert.equal(scene.pauses, 1, 'repeated low battery events do not pause again')
    assert.equal(audioProbe.count(), 1, 'repeated low battery events do not stop audio again')
    assert.equal(scene.resumes + rail.resumes, resumesAfterEnter, 'no resume while still low')
    assert.equal(notified, 2, 'percent-only updates stay silent')

    // Leaving low power resumes once (visible page).
    battery.charging = true
    battery.fire('chargingchange')
    assert.equal(bodyAttrs.has('data-tl-lowpower'), false, 'attribute removed on leaving')
    assert.equal(scene.resumes, 1, 'scene resumed once on leaving low power')
    assert.equal(rail.resumes, 1, 'rail resumed once on leaving low power')
    assert.equal(notified, 3)

    // Hidden page: entering and leaving low power must not resume the scene/page.
    documentFake.hidden = true
    battery.charging = false
    battery.fire('chargingchange')
    assert.equal(scene.pauses, 2, 'entering low power while hidden still pauses')
    battery.charging = true
    battery.fire('chargingchange')
    assert.equal(scene.resumes, 1, 'leaving low power while hidden must NOT resume playback')
    assert.equal(rail.resumes, 1)
    // REV-S2 F1: the supervisor remembers what it paused; becoming visible resumes
    // the scene AND the rail mirror exactly once (the rail has no visibility handler).
    documentFake.hidden = false
    handlers['document:visibilitychange']()
    assert.equal(scene.resumes, 2, 'visible after a hidden low-power exit resumes the scene once')
    assert.equal(rail.resumes, 2, 'visible after a hidden low-power exit resumes the rail mirror once')
    handlers['document:visibilitychange']()
    assert.equal(scene.resumes, 2, 'markers are cleared: a second visibility event resumes nothing')
    assert.equal(rail.resumes, 2)

    // Active low power on a visible page: re-apply only pauses, never resumes.
    battery.charging = false
    battery.fire('chargingchange')
    assert.equal(scene.pauses, 3, 're-entering low power pauses again')
    assert.equal(rail.pauses, 3)
    const pausesBeforeVisibility = scene.pauses
    const railPausesBeforeVisibility = rail.pauses
    handlers['document:visibilitychange']()
    assert.equal(scene.resumes, 2, 'active low power: visible does not resume')
    assert.equal(rail.resumes, 2)
    // NIT2: becoming visible while ACTIVE re-pauses the current targets (apply(true)),
    // it must never look like a resume.
    assert.equal(scene.pauses, pausesBeforeVisibility + 1, 'visible + active re-pauses the scene')
    assert.equal(rail.pauses, railPausesBeforeVisibility + 1, 'visible + active re-pauses the rail')

    // S2c (REV-S2b F1): a playback object can be replaced/detached by its module while
    // low power holds it. Leaving low power must never resume the stale object (an old
    // rail would restart rAF for a removed mirror); the replacement target is paused
    // through sync and resumed once.
    const staleScene = scene
    const staleSceneResumes = staleScene.resumes
    const nextScene = makeTarget()
    s2.setLowPowerTargets(nextScene, rail)
    controller.sync()
    assert.equal(nextScene.pauses, 1, 'sync pauses the replacement target while active')
    const resumesBeforeBatteryNoise = staleScene.resumes + nextScene.resumes + rail.resumes
    battery.level = 0.1
    battery.fire('levelchange')
    assert.equal(
      staleScene.resumes + nextScene.resumes + rail.resumes,
      resumesBeforeBatteryNoise,
      'an active-state battery change never resumes anything',
    )
    battery.charging = true
    battery.fire('chargingchange')
    assert.equal(staleScene.resumes, staleSceneResumes, 'stale scene target is not resumed')
    assert.equal(nextScene.resumes, 1, 'current replacement target resumes once')
    assert.equal(rail.resumes, 3, 'current rail resumes once on this leave')

    // Both targets detached (module dispose sets scenePlayback/railPlayback=null):
    // leaving low power must not touch the detached objects.
    battery.charging = false
    battery.fire('chargingchange')
    const detachedScene = nextScene
    const detachedRail = rail
    s2.setLowPowerTargets(null, null)
    battery.charging = true
    battery.fire('chargingchange')
    assert.equal(detachedScene.resumes, 1, 'detached scene target is not resumed')
    assert.equal(detachedRail.resumes, 3, 'detached rail target is not resumed')

    // A user-paused target must never be forced back to playing by the supervisor.
    const manualScene = makeTarget()
    manualScene.userPaused = true
    s2.setLowPowerTargets(manualScene, rail)
    battery.charging = false
    battery.fire('chargingchange')
    assert.equal(manualScene.pauses, 1, 'entering low power still pauses the manual target')
    battery.charging = true
    battery.fire('chargingchange')
    assert.equal(manualScene.resumes, 0, 'supervisor resume respects the user pause')

    // ---- 3) REV-S2 F6: a residual boost from a crash/hot-reload is cleared on install
    bodyAttrs.set('data-tl-legibility', 'boost')
    body.style.values['--tl-legibility-solid'] = 'rgba(1, 2, 3, 1)'
    body.style.values['--tl-legibility-shadow'] = '0 1px 2px #000'
    body.style.removed = []
    const disposeLegibility = s2.installLegibilityGuard()
    assert.equal(bodyAttrs.has('data-tl-legibility'), false, 'install clears a residual boost attribute')
    assert.ok(body.style.removed.includes('--tl-legibility-solid'), 'install clears the residual solid variable')
    assert.ok(body.style.removed.includes('--tl-legibility-shadow'), 'install clears the residual shadow variable')
    // S2c NIT1: the observer install branch is real (fake MutationObserver is a no-op
    // recorder) and dispose removes it instead of leaving a dangling observer.
    assert.ok(observerCalls.created >= 1, 'legibility observer constructed')
    assert.ok(observerCalls.observed >= 1, 'legibility observer observed the body')
    disposeLegibility()
    assert.ok(observerCalls.disconnected >= 1, 'legibility observer disconnected on dispose')
  } finally {
    try {
      if (typeof audioProbe === 'object' && audioProbe !== null) audioProbe.restore()
    } catch {
      // probe teardown is best effort
    }
    try {
      if (typeof disposeLowPower === 'function') disposeLowPower()
    } catch {
      // teardown is best effort in the test process
    }
    const restore = (name, value) => {
      if (value === undefined) delete globalThis[name]
      else globalThis[name] = value
    }
    restore('window', saved.window)
    restore('document', saved.document)
    restore('localStorage', saved.localStorage)
    if (saved.navigatorDescriptor === undefined) delete globalThis.navigator
    else Object.defineProperty(globalThis, 'navigator', saved.navigatorDescriptor)
    restore('matchMedia', saved.matchMedia)
    restore('lowPowerController', saved.lowPowerController)
    restore('MutationObserver', saved.MutationObserver)
    rmSync(dir, { recursive: true, force: true })
  }
})

// ---- S1 (report §4 items 1-2): autonomous behavior respects pause/permission/life
// gates; the private mind keeps its LLM budget and payload separate from user chat.
await testAsync('S1 client: proactive speech and the private mind respect pause/permission/life gates', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'tl-r8s1-'))
  const productSource = readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8')
  const instrumented = productSource.replace(
    'exports.apply = apply;',
    [
      'exports.apply = apply;',
      '\t\texports.__r8s1 = {',
      '\t\t\tinstallPetBrain, petBrainInternal, petGrant, petRevoke, petRequestUiConsent, petPause, petResume,',
      '\t\t\tpetChat, petStatus, petMindThink, petMindTick, petMindEnable, petMindStatus, petMindContext, petMindDigest,',
      '\t\t\tpetSetLLM, companionDutyBridge,',
      '\t\t\tlifeEnsureState, lifeSaveState, lifeTryProactive, lifeReplayDue, lifeGate,',
      '\t\t};',
    ].join('\n'),
  )
  assert.notEqual(instrumented, productSource, 'instrumentation point present')
  const clientFile = join(dir, 'client.mjs')
  writeFileSync(clientFile, instrumented)
  const saved = {
    window: globalThis.window,
    document: globalThis.document,
    localStorage: globalThis.localStorage,
    BroadcastChannel: globalThis.BroadcastChannel,
    tianlightPet: globalThis.tianlightPet,
    tianlightPetMind: globalThis.tianlightPetMind,
    tianlightLife: globalThis.tianlightLife,
    tianlightDuty: globalThis.tianlightDuty,
    tianlightPetChats: globalThis.tianlightPetChats,
  }
  const local = new Map()
  const fakeStorage = {
    getItem: (key) => (local.has(String(key)) ? local.get(String(key)) : null),
    setItem: (key, value) => void local.set(String(key), String(value)),
    removeItem: (key) => void local.delete(String(key)),
    key: (index) => [...local.keys()][index] ?? null,
    get length() {
      return local.size
    },
  }
  let loaded = null
  globalThis.localStorage = fakeStorage
  globalThis.BroadcastChannel = undefined
  globalThis.window = {
    __ModuleLoader__: { load: (spec) => { loaded = spec } },
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent: () => true,
    setTimeout: (fn, ms) => setTimeout(fn, ms),
    clearTimeout: (id) => clearTimeout(id),
    setInterval: () => 1,
    clearInterval() {},
    innerWidth: 1000,
    innerHeight: 700,
    location: { protocol: 'http:', hash: '' },
  }
  globalThis.document = {
    hidden: false,
    activeElement: null,
    body: {
      hasAttribute: () => false,
      getAttribute: () => null,
      setAttribute() {},
      removeAttribute() {},
      dataset: {},
      appendChild() {},
    },
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent: () => true,
    querySelector: () => null,
    querySelectorAll: () => [],
  }
  let disposeBrain = null
  try {
    await import(pathToFileURL(clientFile).href + '?stamp=' + Date.now())
    const s1 = loaded.factory(() => null).__r8s1
    assert.ok(s1 !== undefined, 'instrumented product exposes the S1 hooks')
    disposeBrain = s1.installPetBrain()

    // ---- 1) proactive speech: pause / permission / life gates --------------------
    const now = Date.now()
    const sayCalls = []
    s1.companionDutyBridge.api = {
      say: (text, hold) => void sayCalls.push(String(text)),
      sayThought: () => {},
      status: () => ({ enabled: true }),
    }
    const life = s1.lifeEnsureState()
    Object.assign(life, { muteUntil: 0, wake: '00:00', sleep: '00:00', lastTalkAt: 0, lastSeenAt: now, recentLines: [] })
    life.quiet = { enabled: false, start: '23:00', end: '08:00' }
    life.focus = { active: false, endsAt: 0, minutes: 25 }
    life.budget = { dayKey: life.dayKey, used: 0, cap: 10 }
    life.deferred = []
    s1.lifeSaveState()

    s1.petPause()
    let verdict = s1.lifeTryProactive(now)
    assert.equal(verdict.spoken, false, 'paused brain: no proactive bubble')
    assert.equal(verdict.reason, 'paused', 'the pause is the recorded reason')
    assert.equal(sayCalls.length, 0, 'nothing reached the companion bridge')
    assert.equal(s1.lifeEnsureState().budget.used, 0, 'a paused attempt consumes no budget')

    // Deferred interrupts: pause postpones, resume replays exactly once.
    const replayed = []
    s1.companionDutyBridge.dutyReplay = (action) => void replayed.push(action.signalId)
    const deferredLife = s1.lifeEnsureState()
    deferredLife.deferred = [
      { signalId: 'sig-1', action: { type: 'interrupt', signalId: 'sig-1', text: 'deferred' }, queuedAt: now, priority: 60, dueAt: 0 },
    ]
    s1.lifeSaveState()
    const pausedReplay = s1.lifeReplayDue(now)
    assert.equal(pausedReplay.replayed, 0, 'paused brain replays nothing')
    assert.equal(replayed.length, 0)
    assert.equal(s1.lifeEnsureState().deferred.length, 1, 'the queued interrupt is kept for later')
    assert.ok(s1.lifeEnsureState().deferred[0].dueAt > now, 'its dueAt is pushed into the future')
    s1.petResume()
    const resumedReplay = s1.lifeReplayDue(now + 61000)
    assert.equal(resumedReplay.replayed, 1, 'after resume the queue replays once')
    assert.deepEqual(replayed, ['sig-1'])
    assert.equal(s1.lifeEnsureState().deferred.length, 0, 'replayed item leaves the queue')

    // Revoked proactive permission: still silent, still no budget spent.
    s1.petRevoke('proactive')
    verdict = s1.lifeTryProactive(now)
    assert.equal(verdict.spoken, false, 'no proactive grant: no bubble')
    assert.equal(verdict.reason, 'permission')
    assert.equal(sayCalls.length, 0)
    assert.equal(s1.lifeEnsureState().budget.used, 0)

    // Grant + awake + unfocused: the engine can speak (deterministic time search).
    assert.equal(s1.petGrant('proactive').ok, true, 'safe proactive grant works')
    let spokenResult = null
    for (let index = 0; index < 2400; index += 1) {
      const at = now + index * 30000
      const attempt = s1.lifeTryProactive(at)
      if (attempt.spoken === true) {
        spokenResult = attempt
        break
      }
      if (attempt.reason === 'budget') break
    }
    assert.ok(spokenResult !== null, 'granted/awake/unfocused: the engine speaks within the searched window')
    assert.equal(sayCalls.length, 1, 'exactly one proactive line reached the companion')
    assert.equal(s1.lifeEnsureState().budget.used, 1, 'the allowed proactive line consumed one life budget unit')

    // ---- 2) autonomous mind: pause + life gates --------------------------------
    const fakeLife = {
      quiet: false,
      awake: true,
      mutedUntil: 0,
      focus: { active: false, endsAt: 0, minutes: 25 },
      budget: { used: 0, cap: 50, remaining: 50 },
      memory: { interactions: 0, talks: 0, streakDays: 0, lastSeenAt: 0 },
      period: 'noon',
      config: { wake: '08:00', sleep: '23:00', quiet: { start: '23:00', end: '08:00' } },
    }
    s1.companionDutyBridge.life = { status: () => fakeLife, gate: () => ({ allow: true }) }
    s1.petMindEnable({ intervalMin: 5, autonomousSpeech: false, llmAssist: false })
    const initialThoughts = s1.petMindStatus().thoughtCount
    const allowLife = () => {
      fakeLife.quiet = false
      fakeLife.awake = true
      fakeLife.focus = { active: false, endsAt: 0, minutes: 25 }
    }
    s1.petPause()
    let think = await s1.petMindThink('manual')
    assert.equal(think.ok, false)
    assert.equal(think.reason, 'paused', 'paused brain does not think')
    s1.petResume()
    for (const [mutate, reason] of [
      [() => { fakeLife.quiet = true }, 'quiet-hours'],
      [() => { allowLife(); fakeLife.awake = false }, 'asleep'],
      [() => { allowLife(); fakeLife.focus = { active: true, endsAt: Date.now() + 600000, minutes: 25 } }, 'focus'],
    ]) {
      mutate()
      think = await s1.petMindThink('manual')
      assert.equal(think.ok, false, 'gated mind does not think: ' + reason)
      assert.equal(think.reason, reason)
    }
    allowLife()
    assert.equal(s1.petMindStatus().thoughtCount, initialThoughts, 'gated attempts add no thoughts')
    // The interval tick shares the same safety gate (no thought while focus is active).
    fakeLife.focus = { active: true, endsAt: Date.now() + 600000, minutes: 25 }
    s1.petMindTick()
    await new Promise((resolveTick) => setTimeout(resolveTick, 20))
    assert.equal(s1.petMindStatus().thoughtCount, initialThoughts, 'the tick also skips while gated')
    allowLife()

    // ---- 3) local default + independent LLM budget + no chat history in payload --
    assert.equal(s1.petGrant('chat').ok, true)
    const llmTicket = s1.petRequestUiConsent('llm')
    assert.equal(s1.petGrant('llm', { consent: llmTicket }).ok, true, 'LLM granted for the test')
    const payloads = []
    const adapterReply = '窗外很安静，我慢慢把今天的光线记在心里，也想起你刚才坐下来的样子。'
    s1.petSetLLM({
      id: 's1-test-adapter',
      chat: async (payload) => {
        payloads.push(JSON.parse(JSON.stringify(payload)))
        return adapterReply
      },
    })
    think = await s1.petMindThink('manual')
    assert.equal(think.ok, true, 'default mind still thinks (local template)')
    assert.equal(think.thought.kind, 'local', 'LLM inner monologue is opt-in; default is local')
    assert.equal(payloads.length, 0, 'no LLM call without the explicit mind LLM opt-in')

    // Skin-local chat history exists (manual chat context) and must stay out of the
    // LLM inner-monologue payload.
    const chatHistory = {
      version: 1,
      activeId: 'conv-1',
      conversations: [
        {
          id: 'conv-1',
          title: 'chat',
          createdAt: now,
          updatedAt: now,
          messages: [{ id: 'm-1', role: 'user', text: 'SECRET-USER-CHAT-XYZ', at: now }],
        },
      ],
    }
    fakeStorage.setItem('tianlight.petChats.v1', JSON.stringify(chatHistory))
    const context = s1.petMindContext(now)
    assert.ok(context.messages.some((message) => message.text.includes('SECRET-USER-CHAT-XYZ')), 'chat history is visible locally')
    s1.petMindEnable({ llmAssist: true })
    think = await s1.petMindThink('manual')
    assert.equal(think.ok, true)
    assert.equal(think.thought.kind, 'llm', 'explicit opt-in uses the LLM path')
    assert.equal(payloads.length, 1, 'exactly one LLM inner-monologue call')
    const mindContent = payloads[0].messages[0].content
    assert.equal(mindContent.includes('SECRET-USER-CHAT-XYZ'), false, 'mind LLM payload carries no chat history')
    assert.equal(s1.petMindStatus().llmUsedToday, 1, 'one unit of the mind budget was charged')
    assert.equal(s1.petStatus().llm.usedToday, 0, 'the user chat quota was NOT charged by the mind')

    // Manual chat keeps its bounded-context behaviour (and charges the chat quota).
    const manual = await s1.petChat('窗外的光线今天很柔和')
    assert.equal(manual.ok, true)
    assert.equal(manual.source, 'llm', 'manual chat still uses the granted LLM adapter')
    const manualPayload = payloads[payloads.length - 1].messages[0].content
    assert.ok(manualPayload.includes('SECRET-USER-CHAT-XYZ'), 'manual chat still sends its bounded local context')
    assert.equal(s1.petStatus().llm.usedToday, 1, 'manual chat consumed one unit of the user daily quota')

    // Exhaust the independent mind budget: fall back to local, chat quota untouched.
    for (let index = 0; index < 11; index += 1) await s1.petMindThink('manual')
    const mindStatus = s1.petMindStatus()
    assert.equal(mindStatus.llmUsedToday, 12, 'mind budget reached its limit')
    assert.equal(mindStatus.llmDailyLimit, 12)
    const afterBudget = await s1.petMindThink('manual')
    assert.equal(afterBudget.ok, true)
    assert.equal(afterBudget.thought.kind, 'local', 'mind budget used up => local template fallback')
    assert.equal(s1.petStatus().llm.usedToday, 1, 'autonomous thinking never drained the user chat quota')
    const stillChat = await s1.petChat('再聊一句')
    assert.equal(stillChat.ok, true, 'user chat still works after a day of autonomous thoughts')
    assert.equal(s1.petStatus().llm.usedToday, 2, 'only manual chats charge the user quota')
  } finally {
    try {
      if (typeof disposeBrain === 'function') disposeBrain()
    } catch {
      // teardown is best effort in the test process
    }
    const restore = (name, value) => {
      if (value === undefined) delete globalThis[name]
      else globalThis[name] = value
    }
    restore('window', saved.window)
    restore('document', saved.document)
    restore('localStorage', saved.localStorage)
    restore('BroadcastChannel', saved.BroadcastChannel)
    restore('tianlightPet', saved.tianlightPet)
    restore('tianlightPetMind', saved.tianlightPetMind)
    restore('tianlightLife', saved.tianlightLife)
    restore('tianlightDuty', saved.tianlightDuty)
    restore('tianlightPetChats', saved.tianlightPetChats)
    rmSync(dir, { recursive: true, force: true })
  }
})

// ---- S4: the shared client helpers (one implementation per concept) ----
await testAsync('S4 client: shared media-kind, upload and recent-list helpers behave consistently', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'tl-s4-'))
  const productSource = readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8')
  const instrumented = productSource.replace(
    'exports.apply = apply;',
    [
      'exports.apply = apply;',
      '\t\texports.__s4 = {',
      '\t\t\ttl5MediaKindFromName, tl5ValidateUploadFile, tl5ReadRecent, tl5RememberRecent, tl5LowerExtension,',
      '\t\t};',
    ].join('\n'),
  )
  assert.notEqual(instrumented, productSource, 'instrumentation point present')
  const clientFile = join(dir, 'client.mjs')
  writeFileSync(clientFile, instrumented)
  const saved = { window: globalThis.window, localStorage: globalThis.localStorage }
  const local = new Map()
  let loaded = null
  globalThis.localStorage = {
    getItem: (key) => (local.has(String(key)) ? local.get(String(key)) : null),
    setItem: (key, value) => void local.set(String(key), String(value)),
    removeItem: (key) => void local.delete(String(key)),
  }
  globalThis.window = {
    __ModuleLoader__: { load: (spec) => { loaded = spec } },
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent: () => true,
    setTimeout: (fn, ms) => setTimeout(fn, ms),
    clearTimeout: (id) => clearTimeout(id),
    innerWidth: 1000,
    innerHeight: 700,
    location: { protocol: 'http:', hash: '' },
  }
  try {
    await import(pathToFileURL(clientFile).href + '?stamp=' + Date.now())
    const s4 = loaded.factory(() => null).__s4
    assert.ok(s4 !== undefined, 'instrumented product exposes the shared helpers')
    // Media kind: one table for playback/upload decisions (URLs keep query strings).
    assert.equal(s4.tl5MediaKindFromName('wall.mp4'), 'video')
    assert.equal(s4.tl5MediaKindFromName('https://x/y/clip.webm?token=1#t'), 'video')
    assert.equal(s4.tl5MediaKindFromName('old.mkv'), 'video')
    assert.equal(s4.tl5MediaKindFromName('art.SVG'), 'image')
    assert.equal(s4.tl5MediaKindFromName('photo.avif'), 'image')
    assert.equal(s4.tl5MediaKindFromName('notes.txt'), null)
    assert.equal(s4.tl5LowerExtension('a.MP4?x=1'), '.mp4')
    // Upload pre-flight: identical formats everywhere, per-UI byte caps only.
    assert.deepEqual(s4.tl5ValidateUploadFile({ name: 'a.mp4', size: 10 }, 100), { ok: true, name: 'a.mp4', size: 10, kind: 'video' })
    assert.deepEqual(s4.tl5ValidateUploadFile({ name: 'p.png', size: 10 }, 100), { ok: true, name: 'p.png', size: 10, kind: 'image' })
    assert.equal(s4.tl5ValidateUploadFile({ name: 'a.mp4', size: 101 }, 100).code, 'too-big')
    assert.equal(s4.tl5ValidateUploadFile({ name: 'a.exe', size: 10 }, 100).code, 'type')
    assert.equal(s4.tl5ValidateUploadFile({ name: 'a.mp4', size: 0 }, 100).code, 'empty')
    assert.equal(s4.tl5ValidateUploadFile(null, 100).code, 'empty')
    // Recent list: one key, newest first, de-duplicated, bounded at 64.
    assert.deepEqual(s4.tl5ReadRecent(), [])
    assert.deepEqual(s4.tl5RememberRecent('a.mp4'), ['a.mp4'])
    assert.deepEqual(s4.tl5RememberRecent('b.png'), ['b.png', 'a.mp4'])
    assert.deepEqual(s4.tl5RememberRecent('a.mp4'), ['a.mp4', 'b.png'], 're-selecting moves the URL to the front')
    assert.equal(local.get('tianlight.recent'), JSON.stringify(['a.mp4', 'b.png']))
    for (let index = 0; index < 80; index += 1) s4.tl5RememberRecent('u' + index + '.mp4')
    assert.equal(s4.tl5ReadRecent().length, 64, 'recent list is bounded')
    assert.equal(s4.tl5ReadRecent()[0], 'u79.mp4')
  } finally {
    const restore = (name, value) => {
      if (value === undefined) delete globalThis[name]
      else globalThis[name] = value
    }
    restore('window', saved.window)
    restore('localStorage', saved.localStorage)
    rmSync(dir, { recursive: true, force: true })
  }
})

// ---- R8b (REV-R4B/R5/R6 follow-ups) ----
test('R8b A: host listeners/trust order/RePKG fallback are robust', () => {
  const transcodeSource = readFileSync(new URL('../lib/transcode.js', import.meta.url), 'utf8')
  const indexSource = readFileSync(new URL('../lib/index.js', import.meta.url), 'utf8')
  const weHostSource = readFileSync(new URL('../lib/we-wallpaper/host.mjs', import.meta.url), 'utf8')
  // R4B 1: the disconnect listener is armed before the (up to 2.5s) ffmpeg probe await.
  const closeAt = transcodeSource.indexOf("res.once?.('close', onClose)")
  const probeAwaitAt = transcodeSource.indexOf('await probeStatus(detectOptions)')
  assert.ok(closeAt >= 0 && probeAwaitAt > closeAt, 'close listener armed before the ffmpeg probe')
  assert.match(transcodeSource, /res\.destroyed === true \|\| res\.writableEnded === true/, 'probe-window disconnect bails out')
  // R4B 2: Host allowlist first, dsh-app trust second, in BOTH fences.
  const indexHost = indexSource.indexOf('isAllowedLocalHost(req.headers?.host)')
  const indexApp = indexSource.indexOf("origin.startsWith('dsh-app://')")
  assert.ok(indexHost >= 0 && indexApp > indexHost, 'index.js checks Host before dsh-app')
  const weHost = weHostSource.indexOf('isAllowedLocalHost(')
  const weApp = weHostSource.indexOf('dsh-app://')
  assert.ok(weHost >= 0 && weApp > weHost, 'we host checks Host before dsh-app')
  // R4B 3: invalid env falls through and reports the rejection.
  assert.match(weHostSource, /function classifyRepkgPath\(/, 'RePKG rejects are classified')
  assert.match(weHostSource, /if \(result\.path !== ""\) return \{ path: result\.path, rejected \};/, 'valid lower source is not swallowed')
  assert.match(weHostSource, /repkgRejected/, 'rejection surfaced as a diagnostic')
})

test('R8b B: overlay layering, Esc repeat, editor detection and arm expiry are enforced', () => {
  assert.match(CLIENT_SOURCE, /function tl5OverlayModalAbove\(id\)/, 'layering fence helper present')
  assert.match(CLIENT_SOURCE, /function tl5OverlayOpenAllowed\(id\)/, 'open-allowed helper present')
  assert.match(CLIENT_SOURCE, /event\.repeat === true/, 'Esc repeat guard present')
  assert.match(CLIENT_SOURCE, /composedPath/, 'editable detection uses composedPath')
  assert.match(CLIENT_SOURCE, /isContentEditable === true/, 'any contenteditable value counts as editing')
  assert.match(CLIENT_SOURCE, /\[role="textbox"\]/, 'role=textbox counts as editing')
  assert.match(CLIENT_SOURCE, /CONFIRM_ARM_TIMEOUT_MS/, 'destructive arm expiry constant present')
  assert.match(CLIENT_SOURCE, /disarmPendingConfirms\(\)/, 'other card actions disarm pending confirms')
  // R8c (REV-R8 F2): a capture-phase click/change fence disarms on ANY other card action.
  assert.match(CLIENT_SOURCE, /onAnyCardAction/, 'hub-wide capture disarm fence present')
  assert.match(CLIENT_SOURCE, /addEventListener\("click", onAnyCardAction, true\)/, 'click fence is capture-phase')
  assert.match(CLIENT_SOURCE, /addEventListener\("change", onAnyCardAction, true\)/, 'change fence is capture-phase')
  assert.match(CLIENT_SOURCE, /\[data-tl-hub-confirm='true'\]/, 'armed confirm button itself is excluded from disarming')
  assert.equal(CLIENT_SOURCE.includes('tl5OverlayHas'), false, 'dead tl5OverlayHas helper is gone')
  assert.match(CLIENT_SOURCE, /tl5OverlayOpenAllowed\("wallpaper-panel"\)/, 'wallpaper panel open path is fenced')
  assert.match(CLIENT_SOURCE, /tl5OverlayOpenAllowed\("font-panel"\)/, 'font panel open paths are fenced')
  assert.match(CLIENT_SOURCE, /tl5OverlayModalAbove\("wallpaper-panel"\)/, 'focusFirst respects a higher modal')
})

test('R8b C: wallpaper probe baseline, iframe token and video-event generation guards', () => {
  assert.match(CLIENT_SOURCE, /fpsQualityPrimed/, 'fps probe takes a quality baseline')
  assert.match(CLIENT_SOURCE, /fpsQualityWindows/, 'first window is baseline-only')
  assert.match(CLIENT_SOURCE, /sceneFrameToken/, 'per-mount scene token exists')
  assert.match(CLIENT_SOURCE, /data\.token !== sceneFrameToken/, 'parent rejects stale scene messages')
  assert.match(CLIENT_SOURCE, /bindVideoEvents\(sourceGeneration\)/, 'video handlers bind to the source generation')
  assert.match(CLIENT_SOURCE, /if \(generation !== sourceGeneration\) return;/, 'late video events are dropped')
  const sceneFrame = readFileSync(new URL('../lib/scene-frame.html', import.meta.url), 'utf8')
  assert.match(sceneFrame, /const mountToken = params\.get\("token"\) \|\| "";/, 'adapter reads the mount token')
  assert.match(sceneFrame, /Object\.assign\(\{ __tlScene: true, token: mountToken \}, payload\)/, 'adapter echoes the token')
})

// ---- v2.0.0: companion AI chat bridge (host half) ----
// The browser half cannot call a model (remote.llm exposes only provider reads),
// so the route under test is the only path from the pet to a model. These tests use
// a fake llm service: no DSH boot, no network, no credential, no real model.
const fakeLlmService = (options = {}) => {
  const calls = { stream: [], resolveModelInfo: [] }
  const providers =
    options.providers ?? [
      { id: 'deepseek-official', name: 'DeepSeek' },
      { id: 'deepseek-account', name: 'DeepSeek Account' },
    ]
  const service = {
    listProviders: () => (options.listProviders !== undefined ? options.listProviders() : providers.map((entry) => ({ ...entry }))),
    resolveModelInfo: async (provider, model, signal) => {
      calls.resolveModelInfo.push({ provider, model, signal })
      if (options.resolveModelInfo !== undefined) return options.resolveModelInfo(provider, model, signal)
      return {
        provider,
        id: model,
        name: model,
        reasoning: { efforts: [{ id: 'off', name: 'Off' }, { id: 'high', name: 'High' }] },
      }
    },
    stream: (request) => {
      calls.stream.push(request)
      if (options.stream !== undefined) return options.stream(request)
      return (async function* () {
        yield { type: 'text-delta', index: 0, text: 'meow' }
        yield { type: 'finish', reason: { kind: 'stop' } }
      })()
    },
  }
  return { service, calls }
}
const fakeAgentDefaultModel = (selection = { provider: 'deepseek-official', model: 'deepseek-flash' }) => ({
  currentSelection: () => ({ ...selection }),
})
const petChatContext = (llm, selection) => ({
  get: (name) => (name === 'llm' ? llm : name === 'agentDefaultModel' ? fakeAgentDefaultModel(selection) : undefined),
})
const callPetChat = async (mount, ctx, options = {}) => {
  const req = fakeRequest(
    options.method ?? 'POST',
    '/skin-tianlight/_pet-chat',
    { 'content-type': 'application/json', ...(options.headers ?? {}) },
    options.body === undefined ? JSON.stringify({ text: 'hi' }) : options.body,
  )
  const res = fakeResponse()
  mount(ctx, req, res)
  return waitForResponse(res)
}

await testAsync('pet chat bridge: success assembles text-delta only and pins the fixed prompt', async () => {
  const { service, calls } = fakeLlmService()
  const runtime = createPetChat()
  const response = await callPetChat(runtime.handle, petChatContext(service), { body: JSON.stringify({ text: 'hello' }) })
  assert.equal(response.status, 200)
  const value = response.bodyJson()
  assert.deepEqual(Object.keys(value).sort(), ['finish', 'model', 'ok', 'text'], 'success body carries exactly the four contract fields')
  assert.equal(value.ok, true)
  assert.equal(value.text, 'meow')
  assert.equal(value.finish, 'stop')
  assert.deepEqual(value.model, { provider: 'deepseek-official', model: 'deepseek-flash' })
  assert.equal(calls.resolveModelInfo.length, 1)
  assert.equal(calls.resolveModelInfo[0].provider, 'deepseek-official')
  assert.equal(calls.resolveModelInfo[0].model, 'deepseek-flash')
  const request = calls.stream[0]
  assert.equal(request.system, PET_CHAT_SYSTEM_PROMPT, 'the system prompt is a server constant')
  assert.equal(request.messages.length, 1)
  assert.equal(request.messages[0].role, 'user')
  assert.deepEqual(request.messages[0].content, [{ type: 'text', text: 'hello' }])
  assert.equal(request.maxTokens, PET_CHAT_MAX_TOKENS)
  assert.equal(PET_CHAT_MAX_TOKENS, 600, 'the output budget is exactly the 600 contract cap')
  assert.equal(PET_CHAT_TIMEOUT_MS, 20000, 'the whole-call deadline is the documented 20s')
  assert.equal(request.reasoningEffort, 'off', 'the lowest advertised effort is selected')
  assert.equal('purpose' in request, false, 'purpose is omitted (0.2.0/0.2.1 only allow two values)')
  assert.equal('sessionId' in request, false, 'no session identity is sent')
  assert.equal('tools' in request, false, 'no tool can be handed to the model')
  assert.equal(request.provider, 'deepseek-official')
})

await testAsync('pet chat bridge: provider override must be registered; model follows the DSH default', async () => {
  const { service, calls } = fakeLlmService()
  const runtime = createPetChat()
  const ctx = petChatContext(service)
  const allowed = await callPetChat(runtime.handle, ctx, { body: JSON.stringify({ text: 'hi', provider: 'deepseek-account' }) })
  assert.equal(allowed.status, 200)
  assert.equal(allowed.bodyJson().model.provider, 'deepseek-account')
  assert.equal(calls.stream[0].model, 'deepseek-flash', 'plan A: the model id follows the DSH default selection')
  const denied = await callPetChat(runtime.handle, ctx, { body: JSON.stringify({ text: 'hi', provider: 'evil-route' }) })
  assert.equal(denied.status, 400)
  assert.deepEqual(denied.bodyJson(), { ok: false, code: 'provider-not-allowed' })
})

await testAsync('pet chat bridge: a route without effort metadata sends no reasoningEffort', async () => {
  const { service, calls } = fakeLlmService({ resolveModelInfo: async (provider, model) => ({ provider, id: model, name: model }) })
  const runtime = createPetChat()
  const response = await callPetChat(runtime.handle, petChatContext(service), { body: JSON.stringify({ text: 'hi' }) })
  assert.equal(response.status, 200)
  assert.equal('reasoningEffort' in calls.stream[0], false)
})

await testAsync('pet chat bridge: method/content-type/json/size/text validation', async () => {
  const { service } = fakeLlmService()
  const runtime = createPetChat()
  const ctx = petChatContext(service)
  const wrongMethod = await callPetChat(runtime.handle, ctx, { method: 'GET', body: null })
  assert.equal(wrongMethod.status, 405)
  assert.deepEqual(wrongMethod.bodyJson(), { ok: false, code: 'invalid-request' })
  const wrongType = await callPetChat(runtime.handle, ctx, {
    headers: { 'content-type': 'text/plain' },
    body: JSON.stringify({ text: 'hi' }),
  })
  assert.equal(wrongType.status, 415)
  const badJson = await callPetChat(runtime.handle, ctx, { body: '{oops' })
  assert.equal(badJson.status, 400)
  const emptyText = await callPetChat(runtime.handle, ctx, { body: JSON.stringify({ text: '   ' }) })
  assert.equal(emptyText.status, 400)
  const notObject = await callPetChat(runtime.handle, ctx, { body: JSON.stringify(['hi']) })
  assert.equal(notObject.status, 400)
  const declared = await callPetChat(runtime.handle, ctx, {
    headers: { 'content-length': String(PET_CHAT_MAX_BODY_BYTES + 1) },
    body: JSON.stringify({ text: 'hi' }),
  })
  assert.equal(declared.status, 413)
  assert.deepEqual(declared.bodyJson(), { ok: false, code: 'too-large' })
  const oversized = 'a'.repeat(PET_CHAT_MAX_BODY_BYTES + 1024)
  const streamed = await callPetChat(runtime.handle, ctx, { body: JSON.stringify({ text: oversized }) })
  assert.equal(streamed.status, 413)
  assert.equal(streamed.bodyJson().code, 'too-large')
  const tooLongText = 'b'.repeat(PET_CHAT_MAX_CHARS + 1)
  const longText = await callPetChat(runtime.handle, ctx, { body: JSON.stringify({ text: tooLongText }) })
  assert.equal(longText.status, 413)
})

await testAsync('pet chat bridge: one request at a time; the second is rejected busy', async () => {
  let releaseFirst = null
  const gate = new Promise((resolve) => {
    releaseFirst = resolve
  })
  const { service } = fakeLlmService({
    stream: () =>
      (async function* () {
        yield { type: 'text-delta', index: 0, text: 'a' }
        await gate
        yield { type: 'finish', reason: { kind: 'stop' } }
      })(),
  })
  const runtime = createPetChat()
  const ctx = petChatContext(service)
  const first = callPetChat(runtime.handle, ctx, { body: JSON.stringify({ text: 'first' }) })
  await new Promise((resolve) => setTimeout(resolve, 20))
  const second = await callPetChat(runtime.handle, ctx, { body: JSON.stringify({ text: 'second' }) })
  assert.equal(second.status, 429)
  assert.deepEqual(second.bodyJson(), { ok: false, code: 'busy' })
  releaseFirst()
  const firstResponse = await first
  assert.equal(firstResponse.status, 200)
  assert.equal(runtime.status().busy, false, 'the gate is released after the call settles')
})

await testAsync('pet chat bridge: a client disconnect aborts the model request without a response', async () => {
  let aborted = false
  let sawAbort = null
  const abortedPromise = new Promise((resolve) => {
    sawAbort = resolve
  })
  const { service } = fakeLlmService({
    stream: (request) =>
      (async function* () {
        yield { type: 'text-delta', index: 0, text: 'x' }
        await new Promise((resolve) => {
          const onAbort = () => {
            aborted = true
            sawAbort()
            resolve()
          }
          if (request.signal.aborted === true) onAbort()
          else request.signal.addEventListener('abort', onAbort, { once: true })
        })
        yield { type: 'finish', reason: { kind: 'aborted', failure: { code: 'ABORTED' } } }
      })(),
  })
  const runtime = createPetChat()
  const req = fakeRequest(
    'POST',
    '/skin-tianlight/_pet-chat',
    { 'content-type': 'application/json' },
    JSON.stringify({ text: 'bye' }),
  )
  const res = fakeResponse()
  runtime.handle(petChatContext(service), req, res)
  await new Promise((resolve) => setTimeout(resolve, 20))
  res.emit('close')
  await abortedPromise
  await new Promise((resolve) => setTimeout(resolve, 20))
  assert.equal(aborted, true, 'the model request signal was aborted')
  assert.equal(res.writableFinished, false, 'no response is written to a disconnected client')
  assert.equal(runtime.status().busy, false, 'the gate is released on disconnect')
})

await testAsync('pet chat bridge: the 20s deadline aborts the stream and returns timeout', async () => {
  let aborted = false
  const { service } = fakeLlmService({
    stream: (request) =>
      (async function* () {
        await new Promise((resolve) => {
          const onAbort = () => {
            aborted = true
            resolve()
          }
          if (request.signal.aborted === true) onAbort()
          else request.signal.addEventListener('abort', onAbort, { once: true })
          setTimeout(resolve, 500)
        })
        yield { type: 'finish', reason: { kind: aborted ? 'aborted' : 'stop', failure: { code: 'ABORTED' } } }
      })(),
  })
  const runtime = createPetChat({ timeoutMs: 30 })
  const response = await callPetChat(runtime.handle, petChatContext(service), { body: JSON.stringify({ text: 'slow' }) })
  assert.equal(response.status, 504)
  assert.deepEqual(response.bodyJson(), { ok: false, code: 'timeout' })
  assert.equal(aborted, true, 'the deadline aborted the in-flight request')
})

await testAsync('pet chat bridge: the deadline also covers a stalled request body', async () => {
  const runtime = createPetChat({ timeoutMs: 30 })
  const req = new EventEmitter()
  req.method = 'POST'
  req.url = '/skin-tianlight/_pet-chat'
  req.headers = { 'content-type': 'application/json' }
  req.resume = () => {}
  req.destroy = () => {}
  const res = fakeResponse()
  runtime.handle(petChatContext(fakeLlmService().service), req, res)
  await waitForResponse(res)
  assert.equal(res.status, 504)
  assert.deepEqual(res.bodyJson(), { ok: false, code: 'timeout' })
  assert.equal(runtime.status().busy, false, 'a stalled body cannot hold the gate forever')
})

await testAsync('pet chat bridge: a hung resolveModelInfo is raced against the deadline', async () => {
  const { service } = fakeLlmService({ resolveModelInfo: () => new Promise(() => {}) })
  const runtime = createPetChat({ timeoutMs: 30 })
  const response = await callPetChat(runtime.handle, petChatContext(service), { body: JSON.stringify({ text: 'x' }) })
  assert.equal(response.status, 504)
  assert.equal(response.bodyJson().code, 'timeout')
  assert.equal(runtime.status().busy, false)
})

await testAsync('pet chat bridge: the gate is released after a timeout and the next call succeeds', async () => {
  let firstCall = true
  const { service } = fakeLlmService({
    stream: (request) => {
      if (firstCall === true) {
        firstCall = false
        return (async function* () {
          await new Promise((resolve) => {
            request.signal.addEventListener('abort', resolve, { once: true })
            setTimeout(resolve, 500)
          })
          yield { type: 'finish', reason: { kind: 'aborted', failure: { code: 'ABORTED' } } }
        })()
      }
      return (async function* () {
        yield { type: 'text-delta', index: 0, text: 'again' }
        yield { type: 'finish', reason: { kind: 'stop' } }
      })()
    },
  })
  const runtime = createPetChat({ timeoutMs: 30 })
  const ctx = petChatContext(service)
  const timedOut = await callPetChat(runtime.handle, ctx, { body: JSON.stringify({ text: 'slow' }) })
  assert.equal(timedOut.status, 504)
  const recovered = await callPetChat(runtime.handle, ctx, { body: JSON.stringify({ text: 'retry' }) })
  assert.equal(recovered.status, 200)
  assert.equal(recovered.bodyJson().text, 'again')
})

await testAsync('pet chat bridge: model override, non-stop finish passthrough and output truncation', async () => {
  const { service, calls } = fakeLlmService({
    resolveModelInfo: async (provider, model) => ({ provider, id: model, name: model }),
    stream: () =>
      (async function* () {
        const chunk = 'x'.repeat(500)
        for (let index = 0; index < 10; index += 1) yield { type: 'text-delta', index: 0, text: chunk }
        yield { type: 'finish', reason: { kind: 'max-tokens' } }
      })(),
  })
  const runtime = createPetChat()
  const response = await callPetChat(runtime.handle, petChatContext(service), {
    body: JSON.stringify({ text: 'x', model: 'custom-model' }),
  })
  assert.equal(response.status, 200)
  assert.equal(calls.stream[0].model, 'custom-model', 'a model override is passed through after validation')
  assert.equal(response.bodyJson().finish, 'max-tokens', 'the finish kind is passed through')
  assert.equal(response.bodyJson().text.length, PET_CHAT_MAX_CHARS, 'assembled text is capped at 4000 chars')
})

await testAsync('pet chat bridge: provider failure codes map to the stable companion vocabulary', async () => {
  const cases = [
    ['MISSING_CREDENTIAL', 'missing-credential'],
    ['INVALID_CREDENTIAL', 'missing-credential'],
    ['AUTH', 'missing-credential'],
    ['ACCOUNT_SIGN_IN_REQUIRED', 'missing-credential'],
    ['QUOTA', 'quota'],
    ['ACCOUNT_QUOTA', 'quota'],
    ['RATE_LIMIT', 'rate-limit'],
    ['TIMEOUT', 'timeout'],
    ['NO_ADAPTER', 'unconfigured-model'],
    ['UNKNOWN_MODEL', 'unconfigured-model'],
    ['SOMETHING_NEW', 'llm-error'],
  ]
  for (const [rawCode, expected] of cases) {
    const { service } = fakeLlmService({
      stream: () =>
        (async function* () {
          yield { type: 'finish', reason: { kind: 'error', failure: { code: rawCode } } }
        })(),
    })
    const runtime = createPetChat()
    const response = await callPetChat(runtime.handle, petChatContext(service), { body: JSON.stringify({ text: 'x' }) })
    assert.deepEqual(Object.keys(response.bodyJson()).sort(), ['code', 'ok'], 'failure body carries exactly {ok,code}')
    assert.equal(response.bodyJson().ok, false, rawCode)
    assert.equal(response.bodyJson().code, expected, rawCode)
  }
  assert.equal(mapProviderFailureCode('INVALID_MODEL_MAX_TOKENS'), 'unconfigured-model')
  assert.equal(mapProviderFailureCode(undefined), 'llm-error')
})

await testAsync('pet chat bridge: missing or unusable Host services degrade to stable codes', async () => {
  const noServices = await callPetChat(createPetChat().handle, { get: () => undefined }, { body: JSON.stringify({ text: 'x' }) })
  assert.equal(noServices.status, 503)
  assert.equal(noServices.bodyJson().code, 'host-unavailable')
  const { service } = fakeLlmService()
  const noDefaults = await callPetChat(createPetChat().handle, { get: (name) => (name === 'llm' ? service : undefined) }, { body: JSON.stringify({ text: 'x' }) })
  assert.equal(noDefaults.status, 409)
  assert.equal(noDefaults.bodyJson().code, 'unconfigured-model')
  const emptyProviders = fakeLlmService({ listProviders: () => [] })
  const noProviders = await callPetChat(createPetChat().handle, petChatContext(emptyProviders.service), { body: JSON.stringify({ text: 'x' }) })
  assert.equal(noProviders.bodyJson().code, 'unconfigured-model')
  const ghost = await callPetChat(createPetChat().handle, petChatContext(service, { provider: 'ghost', model: 'm' }), { body: JSON.stringify({ text: 'x' }) })
  assert.equal(ghost.bodyJson().code, 'unconfigured-model')
})

test('pet chat capability: _engines reports availability, reason, provider and model', async () => {
  const { service } = fakeLlmService()
  const healthy = await engineStatus(urlOf('/skin-tianlight/_engines'), petChatContext(service))
  assert.deepEqual(healthy.capabilities.petLlm, {
    available: true,
    reason: null,
    provider: 'deepseek-official',
    model: 'deepseek-flash',
  })
  assert.deepEqual(computePetLlmCapability(undefined), {
    available: false,
    reason: 'no-llm-service',
    provider: null,
    model: null,
  })
  assert.equal(computePetLlmCapability({ get: (name) => (name === 'llm' ? service : undefined) }).reason, 'no-default-model')
  assert.equal(
    computePetLlmCapability(petChatContext(fakeLlmService({ listProviders: () => [] }).service)).reason,
    'no-providers',
  )
  assert.equal(
    computePetLlmCapability(petChatContext(service, { provider: 'ghost', model: 'm' })).reason,
    'unconfigured-model',
  )
  // The old one-argument form still works and reports the service as absent.
  assert.equal((await engineStatus(urlOf('/skin-tianlight/_engines'))).capabilities.petLlm.available, false)
})

await testAsync('pet chat bridge is mounted on the skin route behind the loopback Host fence', async () => {
  const { service } = fakeLlmService()
  const routes = mountHostRoutes({ llm: service, agentDefaultModel: fakeAgentDefaultModel() })
  const evilHost = await callMounted(
    routes,
    'POST',
    '/skin-tianlight/_pet-chat',
    { 'content-type': 'application/json', host: 'evil.example:58733' },
    JSON.stringify({ text: 'hi' }),
  )
  assert.equal(evilHost.status, 403)
  for (const host of ['127.0.0.1:58733', 'localhost:58733', '[::1]:58733']) {
    const loopback = await callMounted(
      routes,
      'POST',
      '/skin-tianlight/_pet-chat',
      { 'content-type': 'application/json', host },
      JSON.stringify({ text: 'hi' }),
    )
    assert.equal(loopback.status, 200, host)
    assert.equal(loopback.bodyJson().ok, true, host)
  }
  const engines = await callMounted(routes, 'GET', '/skin-tianlight/_engines')
  assert.equal(engines.bodyJson().capabilities.petLlm.available, true)
  assert.equal(engines.bodyJson().capabilities.petLlm.provider, 'deepseek-official')
})

// ---- v2.0.0 client wiring: built-in DSH adapter, AI/local labels, provider picker ----
test('v2.0.0 client half wires the built-in dsh adapter, labels and provider picker', () => {
  // The browser cannot call a model: the built-in adapter must target the host route.
  assert.match(CLIENT_SOURCE, /PET_HOST_LLM_ROUTE = ASSET_BASE \+ "\/_pet-chat"/, 'built-in adapter posts the host route')
  assert.match(CLIENT_SOURCE, /id: "dsh", chat: petHostLlmChat/, 'auto-registers the built-in dsh adapter')
  assert.match(CLIENT_SOURCE, /function petHostLlmProbe\(/, 'host capability probe exists')
  assert.match(CLIENT_SOURCE, /const capabilities = payload\.capabilities/, 'probe reads the engine capabilities object')
  assert.match(CLIENT_SOURCE, /const petLlm = capabilities[^;]*capabilities\.petLlm/, 'probe reads capabilities.petLlm')
  // The auto-registered adapter never bypasses the user grant/quota path: it is only
  // installed into `petAdapter`, which petChat consults after petGranted("llm") and
  // petLlmQuota(); assert the adapter does NOT call itself or fetch directly.
  const probeAt = CLIENT_SOURCE.indexOf('function petHostLlmProbe(')
  const probeRegion = probeAt >= 0 ? CLIENT_SOURCE.slice(probeAt, probeAt + 9000) : ''
  assert.ok(probeRegion.includes('petAdapter === null'), 'probe fills only an empty adapter slot')
  assert.ok(probeRegion.includes('petAdapter.id === "dsh"'), 'probe removes only its own built-in adapter')
  assert.equal(probeRegion.includes('petGranted('), false, 'the probe itself grants nothing')
  // Source labels and localized hints consumed by the bubble and the hub.
  assert.match(CLIENT_SOURCE, /pet\.chat\.source\.ai/, 'AI reply label key exists')
  assert.match(CLIENT_SOURCE, /pet\.chat\.source\.local/, 'local reply label key exists')
  assert.match(CLIENT_SOURCE, /pet\.chat\.llmHint\.unconfiguredModel/, 'unconfigured-model hint exists')
  assert.match(CLIENT_SOURCE, /function petLlmHintText\(/, 'shared hint resolver exists')
  assert.match(CLIENT_SOURCE, /const lines = \[label, text\]/, 'chat bubble starts with the AI/local label line')
  assert.match(CLIENT_SOURCE, /sayChat\(reply, replySource, llmError\)/, 'bubble receives source + llmError')
  // Role hub: provider picker backed exclusively by remote.llm.listProviders().
  assert.match(CLIENT_SOURCE, /data-tl-hub-llm-provider/, 'hub provider select exists')
  assert.match(CLIENT_SOURCE, /remote\.llm/, 'hub resolves the remote.llm namespace')
  assert.match(CLIENT_SOURCE, /listProviders\(\)/, 'hub reads remote.llm.listProviders()')
  assert.match(CLIENT_SOURCE, /hub\.ai\.llmHint/, 'hub has its own hint keys')
  assert.match(CLIENT_SOURCE, /setLlmProvider/, 'hub writes the chosen provider through the brain bridge')
  // An explicit detach is honoured for the page lifetime: no background probe may
  // silently re-register the built-in adapter after clearLLM().
  assert.match(CLIENT_SOURCE, /petLlmAutoSuppressed = true/, 'explicit clearLLM suppresses auto re-registration')
  assert.match(CLIENT_SOURCE, /petAdapter === null && petLlmAutoSuppressed !== true/, 'auto-registration honours the suppression flag')
  // No model-call remote may be used from the page, and no DSH package import.
  assert.equal(/remote\.llm\.(stream|complete|chat|prompt)/.test(CLIENT_SOURCE), false, 'no model call is attempted from the page')
  assert.equal(/require\(["']@deepseek-ai\//.test(CLIENT_SOURCE), false, 'the client bundle requires no DSH package')
  assert.equal(/from\s+["']@deepseek-ai\//.test(CLIENT_SOURCE), false, 'the client bundle imports no DSH package')
})

console.log(`tests: ${passed} passed, ${failures.length} failed`)
for (const failure of failures) console.log('  FAIL ' + failure)
if (failures.length > 0) process.exit(1)
