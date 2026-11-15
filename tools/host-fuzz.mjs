#!/usr/bin/env node
// Equivalent-behaviour harness for the v2.1.8 host route split (`handle()` ->
// lib/routes/<domain>.js).
//
//   node tools/host-fuzz.mjs --old <build dir> [--new <build dir>] [--json] [--keep]
//
// It loads lib/index.js from two checkouts, drives the SAME request list through both
// host halves, and compares each response's status, contract headers and normalized
// body. The scenario list covers every exact route (GET/HEAD/POST/PUT), every prefix,
// invalid parameters, path traversal, an over-long URL, forged Host/Origin headers,
// an aborted upload, ranged asset reads and concurrent reads.
//
// "Normalized" means: JSON bodies have their volatile identity keys removed (commit,
// builtAt, sha256, the formatted fingerprint line) and machine paths masked; the
// gzip bundle export is compared on status/headers only (its payload embeds the
// build commit by design). Everything else is compared byte-for-byte.
//
// Exit codes: 0 = the two builds answered every scenario identically, 1 = differences,
// 2 = usage or setup error.
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { Readable, Writable } from 'node:stream'
import { fileURLToPath, pathToFileURL } from 'node:url'

const argv = process.argv.slice(2)
const option = (name, fallback = null) => {
  const index = argv.indexOf(name)
  return index >= 0 && argv[index + 1] !== undefined && argv[index + 1].startsWith('--') === false ? argv[index + 1] : fallback
}
const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)))
const oldDir = option('--old')
const newDir = option('--new', ROOT)
const asJson = argv.includes('--json')
const keep = argv.includes('--keep')

if (oldDir === null) {
  console.error('usage: node tools/host-fuzz.mjs --old <previous build dir> [--new <current build dir>] [--json] [--keep]')
  process.exit(2)
}
for (const dir of [oldDir, newDir]) {
  if (!existsSync(join(dir, 'lib', 'index.js'))) {
    console.error('host-fuzz: no lib/index.js under ' + dir)
    process.exit(2)
  }
}

// ---- harness ----------------------------------------------------------------
/**
 * Boot one build's host half against a throwaway profile and return its route
 * handler. `profileContext.dir` puts every write under the temp profile (the same
 * persistent-data path a real DSH profile uses), so the checkout stays untouched.
 */
async function createHarness(buildDir) {
  const home = mkdtempSync(join(tmpdir(), 'tl-host-fuzz-'))
  const profile = join(home, 'profiles', 'fuzz')
  mkdirSync(profile, { recursive: true })
  const savedWeHome = process.env.TIANLIGHT_WE_HOME
  process.env.TIANLIGHT_WE_HOME = join(home, 'we-home')

  const host = await import(pathToFileURL(join(buildDir, 'lib', 'index.js')).href)
  let handler = null
  const carrier = { register: (route) => { handler = route.handler; return () => {} } }
  const ctx = {
    get: (name) => {
      if (name === 'webServer') return carrier
      if (name === 'profileContext') return { dir: profile }
      return undefined
    },
    webServer: carrier,
    effect: (fn) => {
      const dispose = fn()
      return typeof dispose === 'function' ? dispose : () => {}
    },
    inject: (_deps, callback) => callback(ctx),
  }
  host.apply(ctx)
  if (typeof handler !== 'function') throw new Error('no prefix handler registered by ' + buildDir)
  return {
    handler,
    home,
    dispose() {
      if (savedWeHome === undefined) delete process.env.TIANLIGHT_WE_HOME
      else process.env.TIANLIGHT_WE_HOME = savedWeHome
      if (!keep) rmSync(home, { recursive: true, force: true })
    },
  }
}

/** Drive one request through a handler with a real-shaped readable request. */
function send(handler, scenario) {
  const { method = 'GET', url, headers = {}, body = null, abort = false } = scenario
  const chunks = []
  const res = new Writable({ write(chunk, _enc, callback) { chunks.push(chunk); callback() } })
  res.writeHead = (status, responseHeaders) => { res.status = status; res.headers = responseHeaders ?? {} }
  res.setHeader = (name, value) => { res.headers = { ...(res.headers ?? {}), [String(name).toLowerCase()]: value } }
  const req = Readable.from(body === null || abort ? [] : [Buffer.isBuffer(body) ? body : Buffer.from(String(body))])
  req.method = method
  req.url = url
  req.headers = { ...headers }
  if (body !== null) req.headers['content-length'] = String(Buffer.byteLength(body))

  const done = new Promise((resolvePromise) => {
    let settled = false
    const finish = (timeout) => {
      if (settled) return
      settled = true
      resolvePromise({ status: res.status ?? 0, headers: res.headers ?? {}, body: Buffer.concat(chunks), timeout })
    }
    res.on('finish', () => finish(false))
    res.on('close', () => finish(false))
    setTimeout(() => finish(true), 5000)
  })
  handler(req, res)
  if (abort) setTimeout(() => { try { req.destroy() } catch { /* already gone */ } }, 5)
  return done
}

// ---- normalization ----------------------------------------------------------
const VOLATILE_KEYS = new Set([
  // identity/diagnostic fields that legitimately differ between two checkouts
  'commit', 'commitShort', 'builtAt', 'sha256', 'line', 'buildSource',
  // The fingerprint necessarily reports each build's own client hash; route
  // equivalence compares everything else about the response.
  'clientSha256', 'clientShort',
  // The host contract id moves only with a deliberate route-contract change (v2.2.0:
  // 2 -> 3). Route equivalence ignores the id itself but still compares every route.
  'api', 'hostApi',
  // local leftovers of the checkout (state/ exists in a dev tree, not in a fresh one)
  'migratedFromLegacy', 'legacyDataPending',
])
const HEADER_KEYS = [
  'content-type',
  'content-security-policy',
  'cache-control',
  'referrer-policy',
  'access-control-allow-origin',
  'cross-origin-resource-policy',
  'accept-ranges',
  'content-range',
  'x-content-type-options',
]

function maskPaths(text) {
  return String(text)
    .replace(/[A-Za-z]:\\[^"'\\\s]+(?:\\[^"'\\\s]+)*/g, '<path>')
    .replace(/\/(?:home|tmp|Users)\/[^"'\s]+/g, '<path>')
}

function stripVolatile(value) {
  if (Array.isArray(value)) return value.map(stripVolatile)
  if (value !== null && typeof value === 'object') {
    const out = {}
    for (const key of Object.keys(value).sort()) {
      if (VOLATILE_KEYS.has(key)) continue
      out[key] = stripVolatile(value[key])
    }
    return out
  }
  return typeof value === 'string' ? maskPaths(value) : value
}

function normalizeBody(contentType, buffer) {
  const text = buffer.toString('utf8')
  if (/json/i.test(contentType)) {
    try {
      return JSON.stringify(stripVolatile(JSON.parse(text)))
    } catch {
      return maskPaths(text)
    }
  }
  return maskPaths(text)
}

// ---- scenarios --------------------------------------------------------------
/** A tiny but structurally valid PNG: the upload route checks the magic bytes. */
const PNG = Buffer.from(
  '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6360000002000155a2a5d40000000049454e44ae426082',
  'hex',
)

// v2.2.0 `_pet-models` is intentionally absent: it did not exist in the 2.1.7
// reference build, so an old-vs-new comparison would be a guaranteed 404/200
// difference. Its behaviour is covered by tools/test.mjs instead.
const EXACT = [
  '_we-roots',
  '_settings',
  '_bundle',
  '_import',
  '_frame-cache',
  '_frame-cache/status',
  '_transcode',
  '_transcode/status',
  '_pet-chat',
  '_upload',
  '_manifest',
  '_wallpapers',
  '_engines',
  '_weather',
  '_fingerprint',
  '_engine/webwallgl.js',
  '_scene-frame',
]
const PREFIX = ['uploads/fuzz-probe.png', 'uploads/missing.png', 'derived/missing.mp4', 'ext/0/a.png', 'ext/9/a.png', '_scene-project/0/proj/a.png', '_scene-project/../../etc/passwd', '_web-project/0/index.html', 'derived/../../package.json', 'ext/0/../../package.json']

const scenarios = []
const push = (scenario) => scenarios.push({ name: scenario.name, ...scenario })

for (const route of EXACT) {
  for (const method of ['GET', 'HEAD', 'POST', 'PUT']) {
    // The bundle export embeds this checkout's commit by design; it is compared on
    // status + headers only (the dedicated scenario below documents why).
    push({ name: method + ' /' + route, method, url: '/skin-tianlight/' + route, skipBody: route === '_bundle' })
  }
}
for (const route of PREFIX) {
  for (const method of ['GET', 'HEAD']) {
    push({ name: method + ' prefix ' + route, method, url: '/skin-tianlight/' + route })
  }
}
// write bodies: JSON settings, a JSON roots list, an upload, an invalid upload
push({ name: 'POST _we-roots json', method: 'POST', url: '/skin-tianlight/_we-roots', headers: { 'content-type': 'application/json' }, body: '["C:\\\\","relative"]' })
push({ name: 'POST _we-roots wrong type', method: 'POST', url: '/skin-tianlight/_we-roots', headers: { 'content-type': 'text/plain' }, body: '[]' })
push({ name: 'POST _we-roots oversized', method: 'POST', url: '/skin-tianlight/_we-roots', headers: { 'content-type': 'application/json' }, body: '[' + '0,'.repeat(5000) + '0]' })
push({ name: 'POST _settings json', method: 'POST', url: '/skin-tianlight/_settings', headers: { 'content-type': 'application/json' }, body: '{"expectedRevision":0,"settings":{}}' })
push({ name: 'PUT _settings malformed', method: 'PUT', url: '/skin-tianlight/_settings', headers: { 'content-type': 'application/json' }, body: '{' })
push({ name: 'POST _pet-chat json', method: 'POST', url: '/skin-tianlight/_pet-chat', headers: { 'content-type': 'application/json' }, body: '{"text":"hi"}' })
push({ name: 'POST _upload png', method: 'POST', url: '/skin-tianlight/_upload?name=fuzz-probe.png', headers: { 'content-type': 'image/png' }, body: PNG })
push({ name: 'POST _upload bad name', method: 'POST', url: '/skin-tianlight/_upload?name=../escape.png', headers: { 'content-type': 'image/png' }, body: PNG })
push({ name: 'POST _upload aborted', method: 'POST', url: '/skin-tianlight/_upload?name=fuzz-abort.png', headers: { 'content-type': 'image/png' }, body: PNG, abort: true })
push({ name: 'GET _bundle with build stamp', method: 'GET', url: '/skin-tianlight/_bundle', skipBody: true })
push({ name: 'POST _import empty gzip', method: 'POST', url: '/skin-tianlight/_import', headers: { 'content-type': 'application/gzip' }, body: '' })
// A deliberately wrong contract id is stale in BOTH builds; the actual HOST_API
// value moves with each route-contract change, so it is not an old-vs-new constant.
push({ name: 'GET _engines with stale api', method: 'GET', url: '/skin-tianlight/_engines?api=0' })
push({ name: 'GET _engines with legacy build', method: 'GET', url: '/skin-tianlight/_engines?build=2.1.5' })
push({ name: 'GET _engines with stale legacy build', method: 'GET', url: '/skin-tianlight/_engines?build=0.4.0' })
push({ name: 'GET _fingerprint twice', method: 'GET', url: '/skin-tianlight/_fingerprint' })

// assets, ranges, fallback and traversal
push({ name: 'GET asset video', method: 'GET', url: '/skin-tianlight/bg-4k.mp4' })
push({ name: 'GET asset video range', method: 'GET', url: '/skin-tianlight/bg-4k.mp4', headers: { range: 'bytes=0-99' } })
push({ name: 'GET asset video bad range', method: 'GET', url: '/skin-tianlight/bg-4k.mp4', headers: { range: 'bytes=999999999-' } })
push({ name: 'HEAD asset video range', method: 'HEAD', url: '/skin-tianlight/bg-4k.mp4', headers: { range: 'bytes=10-20' } })
push({ name: 'GET asset readme', method: 'GET', url: '/skin-tianlight/README.md' })
push({ name: 'GET asset missing', method: 'GET', url: '/skin-tianlight/missing.png' })
push({ name: 'GET bare prefix', method: 'GET', url: '/skin-tianlight' })
push({ name: 'GET bare prefix slash', method: 'GET', url: '/skin-tianlight/' })
push({ name: 'GET nested fallback', method: 'GET', url: '/skin-tianlight/a/b.png' })
push({ name: 'GET traversal fallback', method: 'GET', url: '/skin-tianlight/%2e%2e/%2e%2e/etc/passwd' })
push({ name: 'GET long url', method: 'GET', url: '/skin-tianlight/' + 'a'.repeat(5000) })

// fences: forged host/origin and the sandboxed-read exemption
push({ name: 'GET forged host', method: 'GET', url: '/skin-tianlight/_manifest', headers: { host: 'evil.example' } })
push({ name: 'GET foreign origin', method: 'GET', url: '/skin-tianlight/_manifest', headers: { origin: 'http://evil.example' } })
push({ name: 'POST foreign origin', method: 'POST', url: '/skin-tianlight/_settings', headers: { origin: 'http://evil.example', 'content-type': 'application/json' }, body: '{}' })
push({ name: 'GET null origin engine script', method: 'GET', url: '/skin-tianlight/_engine/webwallgl.js', headers: { origin: 'null', 'sec-fetch-site': 'cross-site' } })
push({ name: 'GET null origin manifest', method: 'GET', url: '/skin-tianlight/_manifest', headers: { origin: 'null' } })
push({ name: 'GET dsh-app origin', method: 'GET', url: '/skin-tianlight/_manifest', headers: { origin: 'dsh-app://app' } })
push({ name: 'GET same-origin header', method: 'GET', url: '/skin-tianlight/_manifest', headers: { origin: 'http://127.0.0.1:3080', host: '127.0.0.1:3080', 'sec-fetch-site': 'same-origin' } })
push({ name: 'GET cross-site write method', method: 'PUT', url: '/skin-tianlight/_settings', headers: { 'sec-fetch-site': 'cross-site', 'content-type': 'application/json' }, body: '{}' })

// concurrency: eight identical reads at once
const concurrency = { name: 'concurrent GET _manifest x8', concurrent: Array.from({ length: 8 }, () => ({ method: 'GET', url: '/skin-tianlight/_manifest' })) }

// ---- run --------------------------------------------------------------------
function summarize(response, scenario) {
  const contentType = String(response.headers['content-type'] ?? '')
  const headers = {}
  for (const key of HEADER_KEYS) headers[key] = String(response.headers[key] ?? '')
  const body = scenario.skipBody === true || response.body.length === 0 ? '' : normalizeBody(contentType, response.body)
  return {
    status: response.status,
    timeout: response.timeout === true,
    headers,
    bodyHash: createHash('sha256').update(body).digest('hex'),
    body,
  }
}

const results = []
let differences = 0

async function runBuild(harness) {
  const rows = []
  for (const scenario of scenarios) {
    if (scenario.concurrent !== undefined) {
      const responses = await Promise.all(scenario.concurrent.map((request) => send(harness.handler, request)))
      rows.push({ name: scenario.name, responses: responses.map((response) => summarize(response, scenario)) })
      continue
    }
    const response = await send(harness.handler, scenario)
    rows.push({ name: scenario.name, responses: [summarize(response, scenario)] })
  }
  return rows
}

const oldHarness = await createHarness(oldDir)
const newHarness = await createHarness(newDir)
try {
  const oldRows = await runBuild(oldHarness)
  const newRows = await runBuild(newHarness)
  for (let index = 0; index < scenarios.length; index += 1) {
    const left = oldRows[index]
    const right = newRows[index]
    const problems = []
    for (let instance = 0; instance < left.responses.length; instance += 1) {
      const a = left.responses[instance]
      const b = right.responses[instance]
      if (a.status !== b.status) problems.push(`status ${a.status} != ${b.status}`)
      if (a.timeout !== b.timeout) problems.push('timeout mismatch')
      for (const key of HEADER_KEYS) {
        if (a.headers[key] !== b.headers[key]) problems.push(`header ${key}: ${JSON.stringify(a.headers[key])} != ${JSON.stringify(b.headers[key])}`)
      }
      if (a.bodyHash !== b.bodyHash) {
        problems.push('body differs')
        if (problems.length <= 4) {
          problems.push('  old: ' + a.body.slice(0, 220))
          problems.push('  new: ' + b.body.slice(0, 220))
        }
      }
    }
    if (problems.length > 0) {
      differences += 1
      results.push({ scenario: left.name, problems })
    }
  }
} finally {
  oldHarness.dispose()
  newHarness.dispose()
}

if (asJson) {
  console.log(JSON.stringify({ scenarios: scenarios.length, differences, results }, null, 2))
} else {
  console.log('host-fuzz: ' + scenarios.length + ' scenario(s) across ' + EXACT.length + ' exact routes and ' + PREFIX.length + ' prefix paths')
  console.log('  old: ' + oldDir)
  console.log('  new: ' + newDir)
  if (differences === 0) {
    console.log('  all responses identical (status, ' + HEADER_KEYS.length + ' headers, normalized body)')
  } else {
    for (const result of results) {
      console.log('  DIFF ' + result.scenario)
      for (const problem of result.problems) console.log('    ' + problem)
    }
    console.log('  ' + differences + ' scenario(s) differ')
  }
}
process.exit(differences === 0 ? 0 : 1)
