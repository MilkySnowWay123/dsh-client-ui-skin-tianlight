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
const regionNames = [...client.matchAll(/\/\/#region ([a-z0-9 ]+)/g)].map((match) => match[1].trim())

// 1. regions must exist, in dependency order
const EXPECTED = [
  'constants',
  'platform',
  'schema',
  'i18n',
  'stylesheet',
  'wallpaper',
  'wallpaper engine extras',
  'ambient effects',
  'smart context',
  'companion',
  'life rhythm',
  'reasoning rheostat',
  'low power',
  'glass opacity',
  'legibility',
  'zone framing',
  'selector bridge',
  'wallpaper sidebar',
  'we library',
  'life settings',
  'font panel',
  'accessibility',
  'apply',
]
for (const name of EXPECTED) {
  if (!regionNames.includes(name)) violations.push(`missing region: ${name}`)
}
const positions = EXPECTED.map((name) => regionNames.indexOf(name)).filter((index) => index >= 0)
if (positions.some((value, index) => index > 0 && value < positions[index - 1])) {
  violations.push('regions are out of the expected order: ' + regionNames.join(' -> '))
}

// 2. apply() must register effects in a documented order
const applyAt = client.lastIndexOf('async function apply(ctx)')
const syncAt = client.lastIndexOf('function apply(ctx)')
const applyStart = applyAt >= 0 ? applyAt : syncAt
const applyEnd = client.indexOf('exports.apply', applyStart)
const applyBody = applyStart < 0 ? '' : client.slice(applyStart, applyEnd > applyStart ? applyEnd : applyStart + 16000)
const ORDER = [
  'ui-skin-tianlight: stylesheet',
  'ui-skin-tianlight: glass opacity',
  'ui-skin-tianlight: low power',
  'ui-skin-tianlight: i18n',
  'ui-skin-tianlight: selector bridge',
  'ui-skin-tianlight: body attribute',
  'ui-skin-tianlight: settings sync',
  'module: wallpaper',
  'module: zones',
  'module: effects',
  'module: context',
  'module: audio',
  'module: companion',
  'module: rheostat',
  'module: typography',
  'module: legibility',
  'module: panel',
  'ui-skin-tianlight: we library',
  'ui-skin-tianlight: accessibility',
]
let cursor = -1
for (const marker of ORDER) {
  const at = applyBody.indexOf(marker)
  if (at < 0) violations.push(`apply() no longer registers: ${marker}`)
  else if (at < cursor) violations.push(`apply() order inverted at: ${marker}`)
  else cursor = at
}

// 2a. every module definition must have a runtime installer, and every switchable
// module must be listed in 11-platform.js (a missing entry silently hides a switch).
for (const match of client.matchAll(/runtime\.define\("([a-z]+)", "module: ([a-z]+)"/g)) {
  if (match[1] !== match[2]) violations.push(`module runtime define id mismatch: ${match[1]} vs ${match[2]}`)
}
for (const module of ['wallpaper', 'effects', 'context', 'audio', 'companion', 'rheostat', 'typography', 'panel', 'zones', 'legibility']) {
  if (!client.includes(`runtime.define("${module}"`)) violations.push(`module "${module}" is missing a runtime.define() installer`)
  if (!new RegExp(`id: "${module}"`).test(client)) violations.push(`module "${module}" is missing from MODULE_DEFS (11-platform.js)`)
}

// 2b. every instance must be able to tear down the previous one (hot-reload duplicates)
if (!applyBody.includes('INSTANCE_REGISTRY_KEY')) {
  violations.push('apply() lost the singleton instance registry: a loader re-apply can stack a second skin')
}
if (!/disposePreviousInstance\(\)/.test(applyBody)) {
  violations.push('apply() no longer disposes the previous instance before installing')
}
// The old guard selector was a typo that never matched (the companion is [data-tl-cat]).
if (client.includes('[data-tl-companion]')) {
  violations.push('dead host selector [data-tl-companion] is back (the companion host is [data-tl-cat])')
}

// 3. the try/catch boundary must still wrap the effect registrations
if (!/try \{[\s\S]{0,12000}installStyles/.test(applyBody)) {
  violations.push('apply() lost its try/catch boundary (a skin defect could fail the plugin fibre)')
}

// 4. every tool referenced by the README must exist
const readme = existsSync(README) ? readFileSync(README, 'utf8') : ''
for (const match of readme.matchAll(/node (tools\/[a-z-]+\.mjs)/g)) {
  if (!existsSync(join(ROOT, match[1]))) violations.push(`README references a missing tool: ${match[1]}`)
}

// 5. host module must stay small and free of machine paths
if (lineCount(host) > 460) notes.push(`lib/index.js grew to ${lineCount(host)} lines; consider splitting the route layer`)
for (const [label, text] of [['lib/client.js', client], ['lib/index.js', host]]) {
  if (/[A-Z]:\\\\|[A-Z]:\\[A-Za-z]/.test(text)) violations.push(`${label} contains an absolute path`)
}

// 6. v0.5.0 extension points: feature fragments must use the registries, not private
// copies, or parallel features drift apart again.
if (!client.includes('registerTl5PanelSection(')) violations.push('no feature registers a v0.5.0 panel section')
if (!client.includes('registerTl5Css(')) violations.push('no feature registers a v0.5.0 style block')
if (!client.includes('registerTl5Strings(')) violations.push('i18n dictionaries are not registered')

// 7. size guidance (informational): one bundle, so growth is expected, but track it
notes.push(`lib/client.js: ${lineCount(client)} lines / ${(client.length / 1024).toFixed(1)} KB`)
notes.push(`lib/index.js: ${lineCount(host)} lines`)
const important = (client.match(/!important/g) ?? []).length
notes.push(`!important occurrences: ${important}`)
notes.push('regions: ' + regionNames.join(' -> '))
notes.push('panel sections: ' + [...client.matchAll(/registerTl5PanelSection\(\{\s*id: "([a-z0-9-]+)"/g)].map((m) => m[1]).join(', '))

console.log('structure audit')
for (const note of notes) console.log('  - ' + note)
if (violations.length === 0) {
  console.log('  all structural invariants hold')
} else {
  console.log('')
  for (const violation of violations) console.log('  [VIOLATION] ' + violation)
}
if (strict && violations.length > 0) process.exitCode = 1
