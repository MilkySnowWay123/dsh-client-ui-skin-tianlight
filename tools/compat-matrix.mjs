// Cross-version compatibility matrix for the tianlight skin.
//
// The skin never names a DSH build hash: the runtime selector bridge discovers the
// product surfaces through the Slot marker, product data-* attributes, or class-name
// segments. This tool scans several DSH installs at once and reports, per version,
// which of those hook layers is actually present — so "adapt to 0.2.0/0.2.1/0.2.2"
// is a checked claim instead of a memory.
//
//   node tools/compat-matrix.mjs --dsh <dir> [--dsh <dir> ...] [--json]
//
// `<dir>` is a node_modules/@deepseek-ai directory (a source checkout, an npm run, or
// a profile's node_modules). An app.asar path cannot be read by plain Node: run the
// same command through Electron-as-Node (`ELECTRON_RUN_AS_NODE=1` + the DSH exe),
// which is how tools/upgrade-check.mjs is run against the installed Desktop.
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ADVISORY_HOOKS, DATA_HOOKS, SLOT_HOOKS, STATE_HOOKS, SUFFIX_HOOKS, findSuffixToken } from './hooks.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = dirname(HERE)
const json = process.argv.includes('--json')

/** Every `--dsh` value; defaults to the profile-local install when omitted. */
function rootsFromArgs() {
  const roots = []
  const argv = process.argv.slice(2)
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] !== '--dsh') continue
    const value = argv[index + 1]
    if (value !== undefined && value.startsWith('--') === false) roots.push(value)
  }
  return roots
}

/** Read the DSH version from a package tree, or null when the tree is incomplete. */
function versionOf(root) {
  try {
    return JSON.parse(readFileSync(join(root, 'dsh-web-frontend', 'package.json'), 'utf8')).version ?? null
  } catch {
    return null
  }
}

/** Collect client bundles the same way hook-scan does (package lib/client.js + frontend assets). */
function collectBundles(root) {
  const bundles = []
  const walk = (dir, depth) => {
    if (depth > 3) return
    let entries = []
    try {
      entries = readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      const path = join(dir, entry.name)
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' && depth > 1) continue
        walk(path, depth + 1)
        continue
      }
      if (
        (entry.name === 'client.js' && dir.endsWith('lib')) ||
        (entry.name.startsWith('index-') && entry.name.endsWith('.js') && dir.endsWith('assets'))
      ) {
        try {
          bundles.push({ path, text: readFileSync(path, 'utf8') })
        } catch {
          // an unreadable bundle is reported through the missing hook, not a crash
        }
      }
    }
  }
  walk(root, 0)
  return bundles
}

function analyse(root) {
  const version = versionOf(root)
  const bundles = collectBundles(root)
  const all = bundles.map((bundle) => bundle.text).join('\n')
  const hasLiteral = (literal) => all.includes(literal)
  const hasSuffix = (suffix) => findSuffixToken(all, suffix) !== null
  const hasPackage = (name) => existsSync(join(root, name, 'package.json'))

  const dataHooks = Object.fromEntries(DATA_HOOKS.map((hook) => [hook, hasLiteral(hook)]))
  const slotHooks = Object.fromEntries(SLOT_HOOKS.map((hook) => [hook, hasLiteral(hook)]))
  const suffixHooks = Object.fromEntries(SUFFIX_HOOKS.map((hook) => [hook, hasSuffix(hook)]))
  const advisory = Object.fromEntries(ADVISORY_HOOKS.map((hook) => [hook, hasLiteral(hook)]))
  // v0.5.0: runtime state hooks are observed, not styled. A miss degrades one
  // feature (focus link) and is reported, never disqualifying the build.
  const stateHooks = Object.fromEntries(STATE_HOOKS.map((hook) => [hook, hasLiteral(hook)]))
  const contracts = {
    moduleLoader: hasLiteral('__ModuleLoader__'),
    bootPayload: hasLiteral('__DSH_BOOT__'),
    reactSeed: hasLiteral('"react-dom/client"') || hasLiteral("'react-dom/client'"),
    modelCatalog: hasLiteral('modelCatalog'),
    selectModel: hasLiteral('selectModel'),
    apiRemotes: hasPackage('dsh-api-remotes'),
    sessionController: hasPackage('dsh-api-session-controller'),
    slotsService: hasPackage('dsh-client-ui-renderer') || hasPackage('dsh-client-ui-slots'),
    themeService: hasPackage('dsh-client-ui-theme'),
    // v0.5.0 i18n follows the host locale service when present; without it the
    // skin falls back to its own zh/en dictionaries and browser language.
    localeService: hasPackage('dsh-client-locale'),
    hostWebServer: hasPackage('dsh-host-webserver') || hasPackage('dsh-web-app'),
  }

  // Which bridge layer is available on this build? The bridge itself is layered, so a
  // missing product attribute is only fatal when the class-segment layer is missing too.
  const layers = []
  if (slotHooks['sidebar'] && slotHooks['conversation.input.model']) layers.push('slot')
  if (dataHooks['data-composer-card'] || dataHooks['data-sidebar-collapsed'] || dataHooks['data-trigger-menu']) layers.push('product-data')
  const requiredSuffixes = ['_sidebarCol', '_card', '_trigger', '_bubble', '_menu', '_panel']
  if (requiredSuffixes.every((suffix) => suffixHooks[suffix])) layers.push('class-segments')

  const required = [
    ...Object.entries(dataHooks),
    ...Object.entries(slotHooks),
    ...requiredSuffixes.map((suffix) => ['suffix ' + suffix, suffixHooks[suffix]]),
    ...Object.entries(contracts),
  ]
  const missing = required.filter(([, present]) => present !== true).map(([name]) => name)
  const verdict = missing.length === 0 && layers.length > 0 ? 'COMPATIBLE' : 'INCOMPATIBLE'
  return { root, version, bundles: bundles.length, layers, dataHooks, slotHooks, suffixHooks, advisory, stateHooks, contracts, missing, verdict }
}

const roots = rootsFromArgs()
if (roots.length === 0) {
  console.error('usage: node tools/compat-matrix.mjs --dsh <node_modules/@deepseek-ai> [--dsh ...] [--json]')
  console.error('hint: the installed Desktop lives at <app.asar>/dsh/node_modules/@deepseek-ai; run this tool through Electron-as-Node for that path')
  process.exit(2)
}

const rows = roots.map((root) => analyse(root))
if (json) {
  console.log(JSON.stringify({ skin: JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).version, rows }, null, 2))
} else {
  console.log('tianlight multi-version compatibility matrix')
  console.log('skin package: ' + JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).version + '  (bridge layers: slot -> product data-* -> class segments)')
  console.log('')
  for (const row of rows) {
    const mark = (value) => (value ? 'yes' : 'NO ')
    console.log('DSH ' + String(row.version ?? 'unknown').padEnd(12) + '  ' + relative(process.cwd(), row.root))
    console.log('  bundles scanned        : ' + row.bundles)
    console.log('  hook layers available  : ' + (row.layers.length === 0 ? 'NONE' : row.layers.join(' + ')))
    console.log('  slot marker / model    : ' + mark(row.dataHooks['data-slot']) + ' / ' + mark(row.slotHooks['conversation.input.model']))
    console.log('  composer / sidebar     : ' + mark(row.dataHooks['data-composer-card']) + ' / ' + mark(row.dataHooks['data-sidebar-collapsed']))
    console.log('  legacy class suffixes  : ' + ['_sidebarCol', '_card', '_trigger', '_bubble', '_menu', '_panel'].map((suffix) => suffix + '=' + mark(row.suffixHooks[suffix])).join(' '))
    console.log('  advisory (0.2.2+)      : ' + Object.entries(row.advisory).map(([hook, present]) => hook + '=' + mark(present)).join(' '))
    console.log('  runtime state hooks    : ' + Object.entries(row.stateHooks).map(([hook, present]) => hook + '=' + mark(present)).join(' '))
    console.log('  client/host contracts  : moduleLoader=' + mark(row.contracts.moduleLoader) + ' boot=' + mark(row.contracts.bootPayload) + ' remotes=' + mark(row.contracts.apiRemotes) + ' slots=' + mark(row.contracts.slotsService) + ' locale=' + mark(row.contracts.localeService) + ' webserver=' + mark(row.contracts.hostWebServer))
    console.log('  verdict                : ' + row.verdict + (row.missing.length === 0 ? '' : '  (missing: ' + row.missing.join(', ') + ')'))
    console.log('')
  }
  const failed = rows.filter((row) => row.verdict !== 'COMPATIBLE')
  if (failed.length === 0) {
    console.log('all scanned DSH builds expose the hooks this skin relies on')
  } else {
    console.log(failed.length + ' build(s) missing required hooks; the bridge (src/65-bridge.js) must be extended before shipping')
  }
  process.exitCode = failed.length === 0 ? 0 : 1
}
