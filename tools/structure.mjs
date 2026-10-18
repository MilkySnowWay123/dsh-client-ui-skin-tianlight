// Structural audit. The skin is one client bundle by loader requirement, so the risk
// is not "wrong file" but "regions drift": a feature added outside its region, the
// apply() order inverted, a documented tool that no longer exists.
//
//   node tools/structure.mjs           # report
//   node tools/structure.mjs --strict  # non-zero exit on any violation
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = dirname(HERE)
const CLIENT = join(ROOT, 'lib', 'client.js')
const HOST = join(ROOT, 'lib', 'index.js')
const README = join(ROOT, 'README.md')

const client = readFileSync(CLIENT, 'utf8')
const host = readFileSync(HOST, 'utf8')
const strict = process.argv.includes('--strict')
const violations = []
const notes = []

const lineCount = (text) => text.split('\n').length
const regionNames = [...client.matchAll(/\/\/#region ([a-z ]+)/g)].map((match) => match[1].trim())

// 1. regions must exist, in dependency order
const EXPECTED = ['constants', 'stylesheet', 'wallpaper', 'companion', 'reasoning rheostat', 'selector bridge', 'wallpaper sidebar', 'font panel']
for (const name of EXPECTED) {
  if (!regionNames.includes(name)) violations.push(`missing region: ${name}`)
}
const positions = EXPECTED.map((name) => regionNames.indexOf(name)).filter((index) => index >= 0)
if (positions.some((value, index) => index > 0 && value < positions[index - 1])) {
  violations.push('regions are out of the expected order: ' + regionNames.join(' -> '))
}

// 2. apply() must register effects in a documented order
const applyAt = client.lastIndexOf('function apply(ctx)')
const applyBody = applyAt < 0 ? '' : client.slice(applyAt, applyAt + 2400)
const ORDER = ['installStyles', 'installSelectorBridge', 'body attribute', 'installScene', 'installCompanion', 'installEffortRheostat', 'installFontPanel', 'installWallpaperSidebar']
let cursor = -1
for (const marker of ORDER) {
  const at = applyBody.indexOf(marker)
  if (at < 0) violations.push(`apply() no longer registers: ${marker}`)
  else if (at < cursor) violations.push(`apply() order inverted at: ${marker}`)
  else cursor = at
}

// 3. the try/catch boundary must still wrap the effect registrations
if (!/try \{[\s\S]{0,1200}installStyles/.test(applyBody)) {
  violations.push('apply() lost its try/catch boundary (a skin defect could fail the plugin fibre)')
}

// 4. every tool referenced by the README must exist
const readme = existsSync(README) ? readFileSync(README, 'utf8') : ''
for (const match of readme.matchAll(/node (tools\/[a-z-]+\.mjs)/g)) {
  if (!existsSync(join(ROOT, match[1]))) violations.push(`README references a missing tool: ${match[1]}`)
}

// 5. host module must stay small and free of machine paths
if (lineCount(host) > 400) notes.push(`lib/index.js grew to ${lineCount(host)} lines; consider splitting the route layer`)
for (const [label, text] of [['lib/client.js', client], ['lib/index.js', host]]) {
  if (/[A-Z]:\\\\|[A-Z]:\\[A-Za-z]/.test(text)) violations.push(`${label} contains an absolute path`)
}

// 6. size guidance (informational): one bundle, so growth is expected, but track it
notes.push(`lib/client.js: ${lineCount(client)} lines / ${(client.length / 1024).toFixed(1)} KB`)
notes.push(`lib/index.js: ${lineCount(host)} lines`)
const important = (client.match(/!important/g) ?? []).length
notes.push(`!important occurrences: ${important}`)
notes.push('regions: ' + regionNames.join(' -> '))

console.log('structure audit')
for (const note of notes) console.log('  - ' + note)
if (violations.length === 0) {
  console.log('  all structural invariants hold')
} else {
  console.log('')
  for (const violation of violations) console.log('  [VIOLATION] ' + violation)
}
if (strict && violations.length > 0) process.exitCode = 1
