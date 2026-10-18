import { Writable } from 'node:stream'
import { fileURLToPath, pathToFileURL } from 'node:url'
import assert from 'node:assert/strict'
import { dirname } from 'node:path'

const PKG = dirname(dirname(fileURLToPath(import.meta.url)))
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

function call(method, url, headers = {}) {
  const chunks = []
  const res = new Writable({
    write(chunk, _enc, cb) { chunks.push(chunk); cb() },
  })
  res.writeHead = (status, hdrs) => { res.status = status; res.headers = hdrs ?? {} }
  const req = { method, url, headers }
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
const engines = await call('GET', '/skin-tianlight/_engines')
check('engine status reports the vendored WebWallGL', () => {
  assert.equal(engines.status, 200)
  const value = JSON.parse(engines.body.toString('utf8'))
  assert.equal(value.build, '0.1.0+upload-20261018')
  assert.equal(value.webwallgl, true)
  assert.equal(value.adapter, true)
  assert.ok(value.upload && value.upload.max >= 512 * 1024 * 1024, 'upload.max')
  assert.equal(value.upload.writable, true)
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
})

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`)
process.exitCode = failures === 0 ? 0 : 1
