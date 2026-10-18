// Builds a git/npm-friendly copy of the skin under dist/.
// Media in assets/ is excluded by default: it is user-supplied and large.
// Usage: node tools/pack.mjs [--with-assets]
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = dirname(HERE)
const manifest = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))
const withAssets = process.argv.includes('--with-assets')
// `--out <dir>` exists for environments where the package directory is not
// writable (sandboxes, read-only checkouts): pack straight into a temp path.
const outIndex = process.argv.indexOf('--out')
const outRoot = outIndex >= 0 && process.argv[outIndex + 1] !== undefined ? process.argv[outIndex + 1] : join(ROOT, 'dist')
const OUT = join(outRoot, `${manifest.name.replace(/^@[^/]+\//, '')}-${manifest.version}`)

const MEDIA = /\.(mp4|webm|mov|m4v|png|jpe?g|webp|avif|gif|svg)$/i
const FILES = ['lib', 'cordis.patch.yml', 'skin.json', 'package.json', 'README.md', 'LICENSE', 'assets/README.md', 'presets', 'vendor']

// 1. verify the source is distributable
const problems = []
for (const file of FILES) {
  if (!existsSync(join(ROOT, file))) problems.push(`missing ${file}`)
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

// 3. media (opt-in)
let mediaCount = 0
if (withAssets) {
  for (const name of readdirSync(join(ROOT, 'assets'))) {
    if (!MEDIA.test(name)) continue
    cpSync(join(ROOT, 'assets', name), join(OUT, 'assets', name))
    mediaCount += 1
  }
} else if (existsSync(join(OUT, 'assets'))) {
  for (const name of readdirSync(join(OUT, 'assets'))) {
    if (MEDIA.test(name)) rmSync(join(OUT, 'assets', name))
  }
}

// 4. report
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
writeFileSync(join(OUT, '.pack-meta.json'), JSON.stringify({ builtAt: new Date().toISOString(), media: mediaCount }, null, 2))

console.log('packed -> ' + OUT)
console.log(`  files: ${stats.files}, size: ${(stats.total / 1024).toFixed(1)} KB, media: ${mediaCount || 'none'}`)
console.log('  ready to git add / npm publish')
