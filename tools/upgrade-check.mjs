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
  const fromEnv = process.env.DSH_PKGS_ROOT
  if (fromEnv && existsSync(join(fromEnv, 'dsh-web-frontend'))) return fromEnv
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
// Names below are the DSH 0.2.1-rc.3 build (2026-10-29). Re-run
// `node tools/resolve-selectors.mjs` after every DSH upgrade and update these.
const selectors = {
  'composer card .GRgSLq_card': 'GRgSLq_card',
  'settings panel ._pane_6nhg2_209': '_pane_6nhg2_209',
  'sidebar column .mP3x-q_sidebarCol': 'mP3x-q_sidebarCol',
  'model trigger ._9r0rkG_trigger': '_9r0rkG_trigger',
  'message bubble .LOmM4q_bubble': 'LOmM4q_bubble',
  'sidebar root .wtg9ga_root': 'wtg9ga_root',
  'workspace root .GAkraW_root': 'GAkraW_root',
}
for (const [label, token] of Object.entries(selectors)) {
  check('selector ' + label, false, () => {
    // Settings-shell surfaces live in the frontend app bundle, the rest in the
    // client plugin bundles, so a selector may be in either.
    if (frontendBundle().includes(token)) return true
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
// 0.2.1 renamed the slots package; SlotCore now ships in dsh-client-ui-renderer.
check('slots service is a client package', true, () =>
  existsSync(join(ROOT, 'dsh-client-ui-renderer', 'package.json')) || existsSync(join(ROOT, 'dsh-client-ui-slots', 'package.json')),
)
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
