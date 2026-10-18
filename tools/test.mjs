// Regression tests for the pure host-side logic. No DSH boot required.
// Run: node tools/test.mjs
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { __test } from '../lib/index.js'
import { UPLOAD_DIR, UPLOAD_MAX, sanitizeUploadName, uploadPath } from '../lib/upload.js'
import { listSceneProjects, sceneFilePath } from '../lib/scene-project.js'

const { parseRange, listWallpapers, listAssets, VIDEO_EXT, IMAGE_EXT, SAFE_NAME, safeJoin } = __test
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

console.log(`tests: ${passed} passed, ${failures.length} failed`)
for (const failure of failures) console.log('  FAIL ' + failure)
if (failures.length > 0) process.exit(1)
