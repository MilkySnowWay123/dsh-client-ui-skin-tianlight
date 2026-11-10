// Regression tests for the pure host-side logic. No DSH boot required.
// Run: node tools/test.mjs
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { existsSync, mkdtempSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Readable, Writable } from 'node:stream'
import { gunzipSync, gzipSync } from 'node:zlib'
import { __test } from '../lib/index.js'
import { apply as hostApply } from '../lib/index.js'
import { UPLOAD_DIR, UPLOAD_MAX, sanitizeUploadName, uploadPath } from '../lib/upload.js'
import { listSceneProjects, sceneFilePath } from '../lib/scene-project.js'
import {
  MAX_SETTING_KEYS,
  MAX_SETTINGS_BYTES,
  SCHEMA_VERSION,
  SettingsStore,
  handleSettings,
  isSettingKey,
  sanitizeSettingsState,
  validateSettingsPayload,
} from '../lib/settings-store.js'
import { buildTarBuffer, classifyBundleEntry, handleBundle, handleImport, parseTar, validateBundleEntryName } from '../lib/bundle.js'
import { FrameCache, handleFrameCache, handleFrameCacheStatus, sniffImageType, validCacheKey } from '../lib/media-cache.js'
import {
  buildTranscodeArgs,
  derivedOutputName,
  detectFfmpeg,
  handleTranscode,
  handleTranscodeStatus,
  listDerived,
  resolveTranscodeSource,
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
    settings: { 'tianlight.a': 'x', bad: 'y', 'tianlight.b': 7, 'tianlight.c': null },
  })
  assert.equal(sanitized.revision, 0)
  assert.equal(sanitized.updatedAt, null)
  assert.deepEqual(sanitized.settings, { 'tianlight.a': 'x', 'tianlight.c': null })
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

test('ffmpeg detection reports absent for a missing binary', () => {
  const status = detectFfmpeg({ command: 'tl-ffmpeg-not-installed-' + process.pid, force: true })
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
test('engine status advertises v0.5.0 capabilities with cache/settings shape', () => {
  const status = engineStatus(new URL('http://localhost/skin-tianlight/_engines?build=' + PKG_VERSION))
  assert.equal(status.build, PKG_VERSION)
  assert.equal(status.stale, false)
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

test('engine status flags a stale client build', () => {
  assert.equal(engineStatus(new URL('http://localhost/skin-tianlight/_engines?build=0.4.0')).stale, true)
  assert.equal(engineStatus(new URL('http://localhost/skin-tianlight/_engines')).stale, undefined)
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

    const del = await callRoute(mount, 'DELETE', '/skin-tianlight/_settings')
    assert.equal(del.status, 200)
    assert.equal(del.bodyJson().revision, 2)
    const post = await callRoute(mount, 'POST', '/skin-tianlight/_settings', { 'content-type': 'application/json' }, '{}')
    assert.equal(post.status, 405)
  })
})

await testAsync('bundle export streams a tar.gz that import round-trips', async () => {
  await withTempDirAsync('tl-bundle-', async (dir) => {
    const videoPath = join(dir, 'source.mp4')
    const imagePath = join(dir, 'still.webp')
    writeFileSync(videoPath, 'video-payload')
    writeFileSync(imagePath, 'RIFF....WEBP')
    const files = [
      { name: 'wallpapers/clip.mp4', path: videoPath },
      { name: 'wallpapers/uploads/still.webp', path: imagePath },
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
    assert.equal(JSON.parse(manifestText).format, 'tianlight-bundle')
    assert.equal(JSON.parse(manifestText).version, PKG_VERSION)
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
    assert.deepEqual(result.imported.slice().sort(), ['clip.mp4', 'still.webp'])
    assert.equal(result.revision, 1)
    assert.equal(result.settings['tianlight.wallpaper'], '{"kind":"video"}')
    assert.equal(readFileSync(join(dir, 'uploads', 'clip.mp4'), 'utf8'), 'video-payload')
    assert.equal(readFileSync(join(dir, 'uploads', 'still.webp'), 'utf8'), 'RIFF....WEBP')
    assert.equal(existsSync(join(dir, 'staging')), false)
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
const WE_ENV_KEYS = ['DSH_WE_DIR', 'TIANLIGHT_WE_HOME', 'TIANLIGHT_WE_DISABLE_SCENE_VIDEO']

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

/** Mount the real host half with a carrier that records every prefix route. */
const mountHostRoutes = () => {
  const routes = []
  const carrier = {
    register: (route) => {
      routes.push(route)
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

      // Existing sources keep working and stay ahead of the WE block.
      assert.ok(items.some((item) => item.source !== 'we'))
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
      assert.ok(items.length > 0, 'existing sources still list')
      assert.equal(items.filter((item) => item.source === 'we').length, 0)
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
        (await callMounted(routes, 'GET', '/api/we-wallpaper/list', { origin: 'http://127.0.0.1:51199' })).status,
        200,
        'localhost origin is not fenced out',
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

console.log(`tests: ${passed} passed, ${failures.length} failed`)
for (const failure of failures) console.log('  FAIL ' + failure)
if (failures.length > 0) process.exit(1)
