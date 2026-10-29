// Pre-upgrade hook scanner: verify a DSH build still exposes the stable structural
// hooks the Tianlight selector bridge depends on.
//
// Usage:
//   node tools/hook-scan.mjs                                  # auto-detect the installed DSH
//   node tools/hook-scan.mjs --dsh <root>                      # e.g. an extracted @deepseek-ai dir
//   node tools/hook-scan.mjs --dsh <root> --self-check         # also check src/65-bridge.js mentions all hooks
//   node tools/hook-scan.mjs --dsh <root> --json
//
// <root> may be any directory tree that contains DSH packages: it is searched for
// `*/lib/client.js` client bundles and `*/dist/assets/index-*.js` frontend bundles.
// For the installed Desktop, run through Electron-as-Node so it can read app.asar.
//
// Exit code 0 = every hook found; 1 = at least one required hook is missing.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ADVISORY_HOOKS, BRIDGE_SOURCE_HINTS, DATA_HOOKS, SUFFIX_HOOKS, findSuffixToken } from './hooks.mjs'

const args = process.argv.slice(2)
const explicit = args.includes('--dsh') ? args[args.indexOf('--dsh') + 1] : null
const asJson = args.includes('--json')
const selfCheck = args.includes('--self-check')

function findDshRoot() {
  const fromEnv = process.env.DSH_PKGS_ROOT
  if (fromEnv && existsSync(fromEnv)) return fromEnv
  if (explicit) return explicit
  const npx = join(homedir(), 'AppData', 'Local', 'npm-cache', '_npx')
  try {
    for (const entry of readdirSync(npx)) {
      const candidate = join(npx, entry, 'node_modules', '@deepseek-ai')
      if (existsSync(candidate)) return candidate
    }
  } catch {
    // no npx cache
  }
  return null
}

const ROOT = findDshRoot()
if (ROOT === null) {
  console.error('cannot locate a DSH package root; pass --dsh <root>')
  process.exit(2)
}

/** Collect client + frontend bundles under ROOT (limited depth, no node_modules recursion loops). */
function collectBundles(root) {
  const out = []
  const walk = (dir, depth) => {
    if (depth > 6 || out.length > 400) return
    let entries
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
          out.push({ path, text: readFileSync(path, 'utf8') })
        } catch {
          // unreadable bundle: skip
        }
      }
    }
  }
  walk(root, 0)
  return out
}

const bundles = collectBundles(ROOT)
if (bundles.length === 0) {
  console.error('no client/frontend bundles found under ' + ROOT)
  process.exit(2)
}

/** Search a token/literal across every bundle. */
function searchLiteral(literal) {
  const owners = []
  for (const bundle of bundles) {
    if (bundle.text.includes(literal)) owners.push(relative(ROOT, bundle.path))
  }
  return owners
}

/** Search a stable class suffix; returns the first real token seen. */
function searchSuffix(suffix) {
  for (const bundle of bundles) {
    const token = findSuffixToken(bundle.text, suffix)
    if (token !== null) return { token, owners: [relative(ROOT, bundle.path)] }
  }
  return null
}

const rows = []
for (const hook of DATA_HOOKS) {
  const owners = searchLiteral(hook)
  rows.push({ kind: 'data', hook, ok: owners.length > 0, sample: hook, owners })
}
for (const hook of SUFFIX_HOOKS) {
  const found = searchSuffix(hook)
  rows.push({ kind: 'class-suffix', hook, ok: found !== null, sample: found?.token ?? null, owners: found?.owners ?? [] })
}
for (const hook of ADVISORY_HOOKS) {
  const owners = searchLiteral(hook)
  rows.push({ kind: 'advisory', hook, ok: owners.length > 0, advisory: true, sample: hook, owners })
}

let bridgeMismatch = []
if (selfCheck) {
  const bridge = join(dirname(dirname(fileURLToPath(import.meta.url))), 'src', '65-bridge.js')
  const source = existsSync(bridge) ? readFileSync(bridge, 'utf8') : ''
  bridgeMismatch = BRIDGE_SOURCE_HINTS.filter((hint) => !source.includes(hint))
}

if (asJson) {
  console.log(JSON.stringify({ root: ROOT, bundles: bundles.length, rows, bridgeMismatch }, null, 2))
} else {
  console.log('DSH hooks scan: ' + ROOT)
  console.log('bundles scanned: ' + bundles.length)
  console.log('')
  let missing = 0
  for (const row of rows) {
    if (row.advisory) {
      console.log(
        '  [' + (row.ok ? 'OK' : '--') + ']   advisory   ' + row.hook.padEnd(28) +
          (row.ok ? '  present (forward hook active)' : '  not in this build; 0.2.1 fallback in use'),
      )
      continue
    }
    const label = (row.kind === 'data' ? 'data attr  ' : 'class suffix') + ' ' + row.hook.padEnd(30)
    if (row.ok) {
      console.log('  [OK]   ' + label + '  sample: ' + row.sample + '  (' + row.owners.slice(0, 2).join(', ') + ')')
    } else {
      missing += 1
      console.log('  [MISS] ' + label + '  ->  the selector bridge must be updated')
    }
  }
  if (selfCheck) {
    console.log('')
    if (bridgeMismatch.length === 0) {
      console.log('  [OK]   src/65-bridge.js mentions every hook')
    } else {
      console.log('  [MISS] src/65-bridge.js missing hooks: ' + bridgeMismatch.join(', '))
      missing += 1
    }
  }
  console.log('')
  console.log(missing === 0 ? 'all bridge hooks present' : missing + ' hook(s) missing')
  if (missing > 0) process.exitCode = 1
}
