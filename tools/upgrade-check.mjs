// Upgrade safety net. Every assumption the skin makes about the installed DSH build
// is checked here, so a DSH upgrade cannot silently turn the skin into a broken page.
//
// Usage:
//   node tools/upgrade-check.mjs            # auto-detect the DSH install
//   node tools/upgrade-check.mjs --dsh <path to node_modules/@deepseek-ai>
//
// Exit code 0 = every assumption holds. 1 = at least one FAIL (the skin may not load).
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const args = process.argv.slice(2)
const explicit = args[args.indexOf('--dsh') + 1]

function findDshRoot() {
  const candidates = []
  if (args.includes('--dsh') && explicit) candidates.push(explicit)
  candidates.push(join(homedir(), '.dsh', 'profiles', 'web', 'node_modules', '@deepseek-ai'))
  const npx = join(homedir(), 'AppData', 'Local', 'npm-cache', '_npx')
  try {
    for (const entry of readdirSync(npx)) candidates.push(join(npx, entry, 'node_modules', '@deepseek-ai'))
  } catch {
    // no npx cache on this machine
  }
  for (const candidate of candidates) {
    if (existsSync(join(candidate, 'dsh-web-frontend'))) return candidate
  }
  return null
}

const ROOT = findDshRoot()
if (ROOT === null) {
  console.error('could not locate @deepseek-ai; pass --dsh <node_modules/@deepseek-ai>')
  process.exit(1)
}

/** Concatenated client bundles, read once. */
const bundles = new Map()
function readBundle(pkg, file = 'lib/client.js') {
  const key = join(pkg, file)
  if (!bundles.has(key)) {
    const path = join(ROOT, key)
    bundles.set(key, existsSync(path) ? readFileSync(path, 'utf8') : '')
  }
  return bundles.get(key)
}

function frontendBundle() {
  const dir = join(ROOT, 'dsh-web-frontend', 'dist', 'assets')
  try {
    const name = readdirSync(dir).find((entry) => entry.startsWith('index-') && entry.endsWith('.js'))
    return name === undefined ? '' : readFileSync(join(dir, name), 'utf8')
  } catch {
    return ''
  }
}

const results = []
const check = (name, fatal, fn) => {
  let ok = false
  let detail = ''
  try {
    const value = fn()
    ok = value === true
    if (typeof value === 'string') detail = value
  } catch (error) {
    detail = error instanceof Error ? error.message : String(error)
  }
  results.push({ name, fatal, ok, detail })
}

const shell = frontendBundle()

check('client module loader (__ModuleLoader__)', true, () => shell.includes('__ModuleLoader__'))
check('static module seed: react-dom/client', true, () => shell.includes('"react-dom/client"'))
check('static module seed: react', true, () => {
  // Minified seed tables use bare keys (`react:Ef`), pretty builds quote them.
  const bare = /[{,]\s*react\s*:/.test(shell)
  const quoted = shell.includes('"react":')
  return bare || quoted
})
check('boot payload (window.__DSH_BOOT__)', true, () => shell.includes('__DSH_BOOT__'))

// Hashed selectors are cosmetic: losing one degrades, it never breaks the layout.
const selectors = {
  'composer card .uV2eYG_card': 'uV2eYG_card',
  'settings panel .VOzbGW_panel': 'VOzbGW_panel',
  'sidebar column .pI_x6G_sidebarCol': 'pI_x6G_sidebarCol',
  'model trigger ._7KE1Ra_trigger': '_7KE1Ra_trigger',
  'message bubble .Sixlwa_bubble': 'Sixlwa_bubble',
}
for (const [label, token] of Object.entries(selectors)) {
  check('selector ' + label, false, () => {
    const pkgs = readdirSync(ROOT)
    for (const pkg of pkgs) {
      if (readBundle(pkg).includes(token)) return true
    }
    return 'not found in any bundle'
  })
}

check('remote contract: modelCatalog', true, () => readBundle('dsh-api-remotes').includes('modelCatalog'))
check('remote contract: selectModel', true, () => readBundle('dsh-api-remotes').includes('selectModel'))
check('injected package dsh-api-remotes', true, () => existsSync(join(ROOT, 'dsh-api-remotes', 'package.json')))
check('injected package dsh-api-session-controller', true, () =>
  existsSync(join(ROOT, 'dsh-api-session-controller', 'package.json')),
)
check('slots service is a client package', true, () => existsSync(join(ROOT, 'dsh-client-ui-slots', 'package.json')))
check('theme service is a client package', true, () => existsSync(join(ROOT, 'dsh-client-ui-theme', 'package.json')))

const version = (() => {
  try {
    return JSON.parse(readFileSync(join(ROOT, 'dsh-web-frontend', 'package.json'), 'utf8')).version ?? '?'
  } catch {
    return '?'
  }
})()

console.log('DSH install: ' + ROOT)
console.log('dsh-web-frontend version: ' + version)
console.log('')
let failed = 0
for (const result of results) {
  const mark = result.ok ? 'PASS' : result.fatal ? 'FAIL' : 'WARN'
  if (!result.ok) failed += 1
  console.log(`  [${mark}] ${result.name}${result.detail === '' ? '' : '  ->  ' + result.detail}`)
}
console.log('')
if (failed === 0) {
  console.log('all upgrade assumptions hold')
} else {
  console.log(`${failed} assumption(s) broken: fix the FAIL lines before shipping this build,`)
  console.log('and update skin.json dshCompatibility if the version changed.')
  process.exitCode = 1
}
