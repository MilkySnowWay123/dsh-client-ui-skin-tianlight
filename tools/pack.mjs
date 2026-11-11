// Builds the distributable copy of the skin under dist/ — the ONLY packing path
// used for releases (CI runs exactly this, then tools/release-artifacts.mjs turns
// the directory into the .tgz/SHA256SUMS/build-manifest attachments).
//
// Default: a complete installable package = runtime code + manifests + presets +
// vendor + the two git-tracked demo media files (`assets/bg-4k.mp4`,
// `assets/cat.png`). User-supplied media (uploads/, derived/, anything else the
// user dropped into assets/) is NEVER copied: only the explicit built-in list is.
//
//   node tools/pack.mjs                 complete installable package
//   node tools/pack.mjs --code-only     code only (no demo media, ~3 MB)
//   node tools/pack.mjs --out <dir>     pack into another root (read-only checkouts)
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = dirname(HERE)

/** git value or '' when git is unavailable (pack must still work outside a checkout). */
function gitText(args) {
  const result = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8' })
  if (result.status !== 0) return ''
  return String(result.stdout ?? '').trim()
}
const manifest = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))
const codeOnly = process.argv.includes('--code-only')
const outIndex = process.argv.indexOf('--out')
const outRoot = outIndex >= 0 && process.argv[outIndex + 1] !== undefined ? process.argv[outIndex + 1] : join(ROOT, 'dist')
const OUT = join(outRoot, `${manifest.name.replace(/^@[^/]+\//, '')}-${manifest.version}`)

// The demo media shipped with the repository. This is an explicit allow-list so a
// local user wallpaper can never leak into a release package.
const BUILTIN_MEDIA = ['bg-4k.mp4', 'cat.png']
const FILES = ['lib', 'cordis.patch.yml', 'skin.json', 'package.json', 'README.md', 'LICENSE', 'assets/README.md', 'presets', 'vendor']

// 1. verify the source is distributable
const problems = []
for (const file of FILES) {
  if (!existsSync(join(ROOT, file))) problems.push(`missing ${file}`)
}
if (!codeOnly) {
  for (const name of BUILTIN_MEDIA) {
    if (!existsSync(join(ROOT, 'assets', name))) {
      problems.push(`missing built-in demo media assets/${name} (use --code-only for a code-only package)`)
    }
  }
}
for (const file of ['lib/index.js', 'lib/client.js']) {
  const source = readFileSync(join(ROOT, file), 'utf8')
  for (const pattern of [/D:\\/i, /C:\\/i, /DeepSeek Harness/i]) {
    if (pattern.test(source)) problems.push(`${file} contains a machine-specific path (${pattern})`)
  }
}
for (const file of ['package.json', 'skin.json']) {
  try {
    JSON.parse(readFileSync(join(ROOT, file), 'utf8'))
  } catch {
    problems.push(`${file} is not valid JSON`)
  }
}
if (problems.length > 0) {
  console.error('pack refused:')
  for (const problem of problems) console.error('  - ' + problem)
  process.exit(1)
}

// 2. assemble
try {
  rmSync(OUT, { recursive: true, force: true })
  mkdirSync(OUT, { recursive: true })
} catch (error) {
  console.error('pack refused: cannot create ' + OUT)
  console.error('  ' + (error instanceof Error ? error.message : String(error)))
  console.error('  this usually means the package directory is read-only; retry with:')
  console.error('    node tools/pack.mjs --out <a writable directory>')
  process.exit(1)
}
for (const file of FILES) {
  cpSync(join(ROOT, file), join(OUT, file), { recursive: true })
}

// A distributable package must not keep the source manifest's private flag,
// otherwise `npm publish` refuses the tarball.
const outPackagePath = join(OUT, 'package.json')
const outPackage = JSON.parse(readFileSync(outPackagePath, 'utf8'))
delete outPackage.private
writeFileSync(outPackagePath, JSON.stringify(outPackage, null, 2) + '\n', 'utf8')

// 3. built-in media (allow-list only, never user uploads)
let media = []
if (!codeOnly) {
  for (const name of BUILTIN_MEDIA) {
    cpSync(join(ROOT, 'assets', name), join(OUT, 'assets', name))
    media.push(name)
  }
}

// 4. build-info.json: the installed-build identity the role hub's self-test / feedback
// fingerprint reads back (version, git commit, commit time). The commit DATE is used as
// builtAt instead of "now" so re-packing the same commit is byte-identical.
const envCommit = typeof process.env.TL_BUILD_COMMIT === 'string' ? process.env.TL_BUILD_COMMIT.trim() : ''
const commit = /^[0-9a-f]{40,64}$/i.test(envCommit) ? envCommit.toLowerCase() : gitText(['rev-parse', 'HEAD'])
const commitIso = commit === '' ? '' : gitText(['log', '-1', '--format=%cI'])
const sourceEpoch = Number(process.env.SOURCE_DATE_EPOCH)
const builtAt =
  commitIso !== ''
    ? commitIso
    : Number.isSafeInteger(sourceEpoch) && sourceEpoch >= 0
      ? new Date(sourceEpoch * 1000).toISOString()
      : '1970-01-01T00:00:00.000Z'
writeFileSync(
  join(OUT, 'build-info.json'),
  JSON.stringify(
    {
      schema: 1,
      product: manifest.name,
      version: manifest.version,
      commit: commit === '' ? null : commit,
      builtAt,
      source: 'pack',
    },
    null,
    2,
  ) + '\n',
  'utf8',
)

// 5. report
const walk = (dir) => {
  let total = 0
  let files = 0
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    const info = statSync(full)
    if (info.isDirectory()) {
      const nested = walk(full)
      total += nested.total
      files += nested.files
    } else {
      total += info.size
      files += 1
    }
  }
  return { total, files }
}
const stats = walk(OUT)
// Metadata lives NEXT TO the package, not inside it: the release tarball must
// contain exactly the installable files.
writeFileSync(
  join(outRoot, '.pack-meta.json'),
  JSON.stringify({ builtAt: new Date().toISOString(), version: manifest.version, media: media.length }, null, 2) + '\n',
)

console.log('packed -> ' + OUT)
console.log(`  files: ${stats.files}, size: ${(stats.total / 1024 / 1024).toFixed(1)} MiB, built-in media: ${media.length === 0 ? 'none (--code-only)' : media.join(', ')}`)
console.log('  metadata: ' + join(outRoot, '.pack-meta.json') + ' (outside the package)')
console.log('  next: node tools/release-artifacts.mjs   (release attachments)')
