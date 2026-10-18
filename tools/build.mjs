// Assembles lib/client.js from the ordered fragments under src/.
//
// The loader contract is one ESM file, so src/ exists for maintenance only: fragments
// are plain script fragments (no imports) concatenated inside the same factory
// closure. Keeping the region markers in the fragments means tools/structure.mjs
// validates the product exactly as before.
//
//   node tools/build.mjs                  # write lib/client.js
//   node tools/build.mjs --check          # exit 1 when the product is stale
//   node tools/build.mjs --out <file>     # build to a staging path (sandbox-friendly)
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = dirname(HERE)
const PRODUCT = join(ROOT, 'lib', 'client.js')
const SRC = join(ROOT, 'src')

// The order is explicit on purpose: glob order would let the filesystem reorder
// regions, and structure.mjs rejects a product whose regions are out of order.
const FRAGMENTS = [
  '00-envelope.js',
  '10-constants.js',
  '20-stylesheet.js',
  '30-wallpaper.js',
  '40-companion.js',
  '50-rheostat.js',
  '55-lowpower.js',
  '57-glass.js',
  '60-zones.js',
  '65-bridge.js',
  '70-sidebar.js',
  '90-font.js',
  '99-apply.js',
]

const REGIONS = [
  'constants',
  'stylesheet',
  'wallpaper',
  'companion',
  'reasoning rheostat',
  'low power',
  'glass opacity',
  'zone framing',
  'selector bridge',
  'wallpaper sidebar',
  'font panel',
]

const args = process.argv.slice(2)
const outIndex = args.indexOf('--out')
const target = outIndex >= 0 && args[outIndex + 1] !== undefined ? args[outIndex + 1] : PRODUCT
const check = args.includes('--check')

const parts = []
for (const name of FRAGMENTS) {
  const path = join(SRC, name)
  if (!existsSync(path)) {
    console.error('build refused: missing src/' + name)
    process.exit(1)
  }
  parts.push(readFileSync(path, 'utf8'))
}
const text = parts.join('')

// Cheap product invariants: the loader envelope and every region must survive assembly.
const problems = []
if (!text.startsWith('window.__ModuleLoader__.load(')) problems.push('loader envelope missing')
if (!/^[ \t]+function apply\(ctx\) \{/m.test(text)) problems.push('apply() missing')
for (const region of REGIONS) {
  if (!text.includes('//#region ' + region)) problems.push('region missing: ' + region)
}
if (!/}\);\n$/.test(text)) problems.push('product does not end with the module close')
if (problems.length > 0) {
  console.error('build refused:')
  for (const problem of problems) console.error('  - ' + problem)
  process.exit(1)
}

if (check) {
  const current = existsSync(target) ? readFileSync(target, 'utf8') : null
  if (current !== text) {
    console.error('build check failed: ' + target + ' is stale; run npm run build')
    process.exit(1)
  }
  console.log('build check: ' + FRAGMENTS.length + ' fragments match ' + (target === PRODUCT ? 'lib/client.js' : target))
  process.exit(0)
}

try {
  writeFileSync(target, text)
} catch (error) {
  console.error('build failed: cannot write ' + target + ' (' + (error?.code ?? error) + ')')
  console.error('  if the sandbox denies project writes, retry: node tools/build.mjs --out <writable file>')
  process.exit(1)
}
console.log('built ' + FRAGMENTS.length + ' fragments -> ' + target + ' (' + text.length + ' chars)')
