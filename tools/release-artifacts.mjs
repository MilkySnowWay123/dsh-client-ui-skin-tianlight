// Assembles the deterministic release attachments for one version from the ONLY
// distributable source: the directory produced by `node tools/pack.mjs`.
//
// Output (default `dist/release/`):
//   dsh-client-ui-skin-tianlight.tgz        unversioned, for releases/latest/download
//   dsh-client-ui-skin-tianlight-<v>.tgz    byte-identical copy of the same archive
//   SHA256SUMS.txt                          sha256 of every packaged file + both tarballs
//   build-manifest.json                     version / git commit / HOST_API / client sha256 / builtAt
//
// The archive is written by this file: a deterministic ustar plus a hand-built gzip
// container (sorted entries, fixed mtime/uid/gid/mode, fixed gzip header). CI and a
// local run therefore pack with exactly the same code — there is no second packing
// path. Same input bytes => same .tgz bytes on the same zlib build.
//
// Hard rules enforced before anything is written (a violation exits non-zero, which
// makes the release CI fail):
//   - the packaged package.json version must equal the version being released;
//   - state/ assets/uploads/ backup/ diag/ tools/ src/ node_modules/ .git must not be packed;
//   - no machine-specific path may appear in any packaged text file;
//   - required runtime files (lib/, cap, presets, vendor, built-in demo media) must be present.
//
// usage:
//   node tools/release-artifacts.mjs [--package-dir <dir>] [--version <x.y.z[-rc.N]>]
//     [--commit <sha>] [--out <dir>] [--help]
//
// defaults: --package-dir dist/<name>-<version>, --version from package.json,
//           --commit from $GITHUB_SHA then `git rev-parse HEAD`, --out dist/release
import { existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { deflateRawSync } from 'node:zlib'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = dirname(HERE)
const USAGE = `usage: node tools/release-artifacts.mjs [options]

  --package-dir <dir>   packed directory produced by tools/pack.mjs
                        (default: dist/<package-name-without-scope>-<version>)
  --version <version>   version being released (default: package.json version)
  --commit <sha>        git commit to record (default: $GITHUB_SHA, then git rev-parse HEAD)
  --out <dir>           output directory (default: dist/release)
  --help                show this help`

const args = process.argv.slice(2)
const getArg = (name, fallback = null) => {
  const index = args.indexOf(name)
  return index >= 0 && args[index + 1] !== undefined ? args[index + 1] : fallback
}
for (const arg of args) {
  if (arg === '--help' || arg === '-h') {
    console.log(USAGE)
    process.exit(0)
  }
}

const rootManifest = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))
const packageName = String(rootManifest.name)
const baseName = packageName.replace(/^@[^/]+\//, '')
const version = getArg('--version', String(rootManifest.version))
const outDir = resolve(ROOT, getArg('--out', 'dist/release'))
const packageDir = resolve(ROOT, getArg('--package-dir', join('dist', `${baseName}-${version}`)))

function resolveCommit() {
  const explicit = getArg('--commit', process.env.GITHUB_SHA ?? '')
  if (explicit !== '' && explicit !== null) return explicit
  const result = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' })
  const sha = String(result.stdout ?? '').trim()
  if (result.status !== 0 || sha === '') {
    console.error('release-artifacts: cannot determine the git commit; pass --commit <sha> or run inside a git checkout')
    process.exit(2)
  }
  return sha
}

const commit = resolveCommit()

if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) {
  console.error('release-artifacts: --version must be x.y.z or x.y.z-<prerelease> (got: ' + version + ')')
  process.exit(2)
}
if (!existsSync(packageDir) || !statSync(packageDir).isDirectory()) {
  console.error('release-artifacts: packaged directory not found: ' + packageDir)
  console.error('  run `node tools/pack.mjs` first (it is the only accepted packing source)')
  process.exit(2)
}

// ---------------------------------------------------------------------------
// 1. collect + validate the packed tree
// ---------------------------------------------------------------------------
const problems = []
const files = []
const directories = new Set()

function walk(absDir, relDir) {
  const names = readdirSync(absDir).sort()
  for (const name of names) {
    const absPath = join(absDir, name)
    const relPath = relDir === '' ? name : relDir + '/' + name
    const info = lstatSync(absPath)
    if (info.isSymbolicLink()) {
      problems.push('symlink must not be packaged: ' + relPath)
      continue
    }
    if (info.isDirectory()) {
      directories.add(relPath + '/')
      walk(absPath, relPath)
      continue
    }
    if (!info.isFile()) {
      problems.push('unsupported entry type: ' + relPath)
      continue
    }
    files.push({ rel: relPath, abs: absPath, size: info.size })
  }
}
walk(packageDir, '')
files.sort((a, b) => (a.rel < b.rel ? -1 : a.rel > b.rel ? 1 : 0))

const FORBIDDEN_PREFIXES = [
  'state/',
  'assets/uploads/',
  'assets/derived/',
  'backup/',
  'diag/',
  'tools/',
  'src/',
  'node_modules/',
  '.git/',
  '.github/',
  'dist/',
]
for (const file of files) {
  for (const prefix of FORBIDDEN_PREFIXES) {
    if (file.rel === prefix.slice(0, -1) || file.rel.startsWith(prefix)) {
      problems.push(`forbidden path in the package: ${file.rel} (${prefix}*)`)
    }
  }
  if (file.rel.split('/').some((segment) => segment === '' || segment === '.' || segment === '..')) {
    problems.push('invalid path segment in the package: ' + file.rel)
  }
  if (file.rel === '.pack-meta.json') {
    problems.push('unexpected .pack-meta.json inside the package (rebuild with the current tools/pack.mjs)')
  }
}

const fileMap = new Map(files.map((file) => [file.rel, file]))
const requireFile = (rel) => {
  if (!fileMap.has(rel)) problems.push('required file missing from the package: ' + rel)
}
for (const rel of [
  'package.json',
  'skin.json',
  'cordis.patch.yml',
  'lib/index.js',
  'lib/client.js',
  'README.md',
  'LICENSE',
  'assets/README.md',
  'assets/bg-4k.mp4',
  'assets/cat.png',
  'presets/README.md',
]) {
  requireFile(rel)
}
if (!files.some((file) => file.rel.startsWith('vendor/webwallgl/') && file.rel !== 'vendor/webwallgl/')) {
  problems.push('required vendor component missing: vendor/webwallgl/*')
}
if (!files.some((file) => file.rel.startsWith('vendor/we-wallpaper/') && file.rel !== 'vendor/we-wallpaper/')) {
  problems.push('required vendor component missing: vendor/we-wallpaper/*')
}

// package manifest on disk must describe exactly the version being released
let packagedManifest = null
try {
  packagedManifest = JSON.parse(readFileSync(join(packageDir, 'package.json'), 'utf8'))
} catch (error) {
  problems.push('packaged package.json is not valid JSON (' + String(error.message ?? error) + ')')
}
if (packagedManifest !== null) {
  if (packagedManifest.version !== version) {
    problems.push(`packaged version ${JSON.stringify(packagedManifest.version)} does not match the release version ${version}`)
  }
  if (packagedManifest.name !== packageName) {
    problems.push(`packaged name ${JSON.stringify(packagedManifest.name)} does not match ${packageName}`)
  }
  if (packagedManifest.private !== undefined) {
    problems.push('packaged package.json still carries "private"; rebuild with the current tools/pack.mjs')
  }
}

// HOST_API is a hand-edited route contract, never a release number. Record it, and
// make sure the packaged browser half speaks the same contract as the host half.
let hostApi = null
try {
  const hostSource = readFileSync(join(packageDir, 'lib', 'index.js'), 'utf8')
  const hostMatch = hostSource.match(/const HOST_API = '([^']+)'/)
  const clientSource = readFileSync(join(packageDir, 'lib', 'client.js'), 'utf8')
  const clientMatch = clientSource.match(/const HOST_API = "([^"]+)"/)
  if (hostMatch === null) problems.push('cannot read HOST_API from packaged lib/index.js')
  if (clientMatch === null) problems.push('cannot read HOST_API from packaged lib/client.js')
  if (hostMatch !== null && clientMatch !== null && hostMatch[1] !== clientMatch[1]) {
    problems.push(`HOST_API mismatch: host reports ${hostMatch[1]}, client reports ${clientMatch[1]}`)
  }
  if (hostMatch !== null) hostApi = hostMatch[1]
} catch (error) {
  problems.push('cannot read lib/index.js or lib/client.js from the package (' + String(error.message ?? error) + ')')
}

// machine-specific paths: allowed Windows system roots, everything else is a leak
const ALLOWED_DRIVE_ROOTS = new Set(['windows', 'program files', 'program files (x86)', 'programdata', '$recycle.bin'])
const TEXT_FILE = /\.(?:mjs|cjs|js|json|md|txt|yml|yaml|html?|css|patch|ps1|svg|xml)$/i
const MAX_TEXT_BYTES = 4 * 1024 * 1024

function machinePathHits(text) {
  const hits = []
  // Windows source files escape backslashes; collapse doubled ones before scanning so
  // "C:\\Users\\name" and "C:\Users\name" are treated the same.
  const normalized = text.includes('\\') ? text.replace(/\\\\/g, '\\') : text
  const drive = /(^|[^A-Za-z0-9])([A-Za-z]):\\([^"'<>\r\n]*)/g
  let match
  while ((match = drive.exec(normalized)) !== null) {
    const rest = match[3]
    const root = String(rest.split('\\')[0] ?? '').toLowerCase()
    if (root === '' || ALLOWED_DRIVE_ROOTS.has(root) === false) {
      hits.push(`${match[2]}:\\${rest.slice(0, 60)}`)
    }
  }
  for (const pattern of [/\/Users\/[^/\s"'<>]+\//g, /\/home\/[^/\s"'<>]+\//g, /\/root\//g]) {
    const found = normalized.match(pattern)
    if (found !== null) hits.push(...found)
  }
  if (normalized.includes('DeepSeek Harness(2)')) hits.push('DeepSeek Harness(2)')
  return hits
}

for (const file of files) {
  if (TEXT_FILE.test(file.rel) === false || file.size > MAX_TEXT_BYTES) continue
  const text = readFileSync(file.abs, 'utf8')
  if (text.includes('\u0000')) continue
  const hits = machinePathHits(text)
  for (const hit of hits) problems.push(`machine-specific path in ${file.rel}: ${hit}`)
}

if (problems.length > 0) {
  console.error('release-artifacts refused: the packed tree is not releasable')
  for (const problem of problems) console.error('  - ' + problem)
  process.exit(1)
}

// ---------------------------------------------------------------------------
// 2. deterministic ustar archive
// ---------------------------------------------------------------------------
const tarEntries = []
const rootEntry = baseName + '/'
tarEntries.push({ name: rootEntry, type: '5' })
for (const directory of [...directories].sort()) tarEntries.push({ name: baseName + '/' + directory, type: '5' })
for (const file of files) tarEntries.push({ name: baseName + '/' + file.rel, type: '0', abs: file.abs, size: file.size })
tarEntries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))

function writeOctal(buffer, value, offset, length) {
  const text = Math.max(0, Math.floor(value)).toString(8).padStart(length - 1, '0') + '\u0000'
  buffer.write(text, offset, length, 'ascii')
}

function writeText(buffer, text, offset, length) {
  const bytes = Buffer.from(text, 'utf8')
  if (bytes.length > length) throw new Error('tar field overflow: ' + text)
  bytes.copy(buffer, offset)
}

function splitName(full) {
  if (Buffer.byteLength(full) <= 100) return { name: full, prefix: '' }
  const withoutTrailing = full.endsWith('/') ? full.slice(0, -1) : full
  const isDirectory = full.endsWith('/')
  for (let index = withoutTrailing.lastIndexOf('/'); index > 0; index = withoutTrailing.lastIndexOf('/', index - 1)) {
    const prefix = withoutTrailing.slice(0, index)
    const name = withoutTrailing.slice(index + 1) + (isDirectory ? '/' : '')
    if (Buffer.byteLength(prefix) <= 155 && Buffer.byteLength(name) <= 100) return { name, prefix }
  }
  throw new Error('tar path is too long for ustar: ' + full)
}

function tarHeader(entry) {
  const header = Buffer.alloc(512)
  const { name, prefix } = splitName(entry.name)
  writeText(header, name, 0, 100)
  writeOctal(header, entry.type === '5' ? 0o755 : 0o644, 100, 8)
  writeOctal(header, 0, 108, 8) // uid
  writeOctal(header, 0, 116, 8) // gid
  writeOctal(header, entry.type === '0' ? entry.size : 0, 124, 12) // size
  writeOctal(header, 0, 136, 12) // mtime: fixed epoch for reproducibility
  header.fill(0x20, 148, 156) // checksum placeholder
  header[156] = entry.type === '5' ? 0x35 : 0x30 // '5' dir / '0' file
  writeText(header, 'ustar', 257, 6)
  writeText(header, '00', 263, 2)
  if (prefix !== '') writeText(header, prefix, 345, 155)
  let checksum = 0
  for (const byte of header) checksum += byte
  writeText(header, checksum.toString(8).padStart(6, '0') + '\u0000 ', 148, 8)
  return header
}

const chunks = []
let tarLength = 0
const pushChunk = (chunk) => {
  chunks.push(chunk)
  tarLength += chunk.length
}
for (const entry of tarEntries) {
  pushChunk(tarHeader(entry))
  if (entry.type === '0') {
    const data = readFileSync(entry.abs)
    pushChunk(data)
    const remainder = data.length % 512
    if (remainder !== 0) pushChunk(Buffer.alloc(512 - remainder))
  }
}
pushChunk(Buffer.alloc(1024)) // end-of-archive marker
const tarBuffer = Buffer.concat(chunks, tarLength)

// gzip container built by hand so every field is fixed (deflateRawSync itself is
// deterministic for a fixed zlib build + input).
const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let value = 0; value < 256; value += 1) {
    let crc = value
    for (let bit = 0; bit < 8; bit += 1) crc = (crc & 1) !== 0 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1
    table[value] = crc >>> 0
  }
  return table
})()
function crc32(buffer) {
  let crc = 0xffffffff
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}
function gzip(buffer) {
  const deflated = deflateRawSync(buffer, { level: 9 })
  const header = Buffer.from([0x1f, 0x8b, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0x02, 0xff])
  const trailer = Buffer.alloc(8)
  trailer.writeUInt32LE(crc32(buffer), 0)
  trailer.writeUInt32LE(buffer.length >>> 0, 4)
  return Buffer.concat([header, deflated, trailer])
}

const tgz = gzip(tarBuffer)
const sha256 = (data) => createHash('sha256').update(data).digest('hex')

// ---------------------------------------------------------------------------
// 3. write the attachments
// ---------------------------------------------------------------------------
rmSync(outDir, { recursive: true, force: true })
mkdirSync(outDir, { recursive: true })

const versionedName = `${baseName}-${version}.tgz`
const latestName = `${baseName}.tgz`
writeFileSync(join(outDir, versionedName), tgz)
writeFileSync(join(outDir, latestName), tgz)
if (sha256(readFileSync(join(outDir, versionedName))) !== sha256(tgz) || sha256(readFileSync(join(outDir, latestName))) !== sha256(tgz)) {
  console.error('release-artifacts refused: written tarballs do not round-trip to the same bytes')
  process.exit(1)
}

const sums = []
for (const file of files) sums.push(`${sha256(readFileSync(file.abs))}  ${file.rel}`)
sums.push(`${sha256(tgz)}  ${latestName}`)
sums.push(`${sha256(tgz)}  ${versionedName}`)
writeFileSync(join(outDir, 'SHA256SUMS.txt'), sums.join('\n') + '\n', 'utf8')

const clientSha256 = sha256(readFileSync(join(packageDir, 'lib', 'client.js')))
const manifest = {
  version,
  commit,
  hostApi,
  clientSha256,
  builtAt: new Date().toISOString(),
}
writeFileSync(join(outDir, 'build-manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8')

console.log('release artifacts -> ' + outDir)
console.log(`  package: ${baseName}-${version}  files: ${files.length}  packaged size: ${(tarLength / 1024 / 1024).toFixed(1)} MiB, tgz: ${(tgz.length / 1024 / 1024).toFixed(1)} MiB`)
console.log(`  ${latestName}  ${sha256(tgz)}`)
console.log(`  ${versionedName}  ${sha256(tgz)}  (identical copy)`)
console.log(`  SHA256SUMS.txt  (${files.length} packaged files + 2 tarballs)`)
console.log(`  build-manifest.json  version=${version} commit=${commit} hostApi=${hostApi} clientSha256=${clientSha256}`)
