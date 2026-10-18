// Patch-day report for CSS-module hashes.
//
// A CSS-module class is `<hash>_<name>`; the hash changes on every DSH build. This
// tool answers one question per selector the skin hardcodes:
//   still present  -> nothing to do
//   gone           -> the surface changed; here are the same-suffix candidates,
//                     scoped to the package that used to own it
// It never rewrites source: `_card` and `_panel` are repeated across packages, and
// a blind replacement is worse than a report.
//
//   node tools/resolve-selectors.mjs
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = dirname(HERE)
const CLIENT = join(ROOT, 'lib', 'client.js')

function findDshRoot() {
  const candidates = [join(homedir(), '.dsh', 'profiles', 'web', 'node_modules', '@deepseek-ai')]
  const npx = join(homedir(), 'AppData', 'Local', 'npm-cache', '_npx')
  try {
    for (const entry of readdirSync(npx)) candidates.push(join(npx, entry, 'node_modules', '@deepseek-ai'))
  } catch {
    // no npx cache
  }
  return candidates.find((path) => existsSync(join(path, 'dsh-web-frontend'))) ?? null
}

const DSH = findDshRoot()
if (DSH === null) {
  console.error('could not locate @deepseek-ai')
  process.exit(1)
}

/** pkg name -> bundle text */
const bundles = new Map()
for (const pkg of readdirSync(DSH)) {
  const path = join(DSH, pkg, 'lib', 'client.js')
  if (!existsSync(path)) continue
  try {
    bundles.set(pkg, readFileSync(path, 'utf8'))
  } catch {
    // unreadable bundle: skip
  }
}

const source = readFileSync(CLIENT, 'utf8')
const tokens = [...new Set(
  [...source.matchAll(/\b([A-Za-z0-9_-]{5,})_(card|panel|sidebarCol|trigger|bubble|menu|segment|editor)\b/g)].map(
    (match) => match[0],
  ),
)].sort()

const rows = []
for (const token of tokens) {
  const suffix = '_' + token.split('_').pop()
  const owners = [...bundles.entries()].filter(([, text]) => text.includes(token)).map(([pkg]) => pkg)
  if (owners.length > 0) {
    rows.push({ token, status: 'present', owners, candidates: [] })
    continue
  }
  // Gone: look for the same suffix inside the package that used to own it. We do not
  // know the previous owner after the fact, so report every candidate with its package
  // and let the human pick — ambiguity is the honest answer, not a guess.
  const candidates = []
  const pattern = new RegExp('\\b([A-Za-z0-9_-]{5,})' + suffix + '\\b', 'g')
  for (const [pkg, text] of bundles) {
    for (const match of text.matchAll(pattern)) {
      if (!candidates.some((entry) => entry.token === match[0])) candidates.push({ token: match[0], pkg })
    }
  }
  rows.push({ token, status: 'MISSING', owners: [], candidates })
}

let missing = 0
for (const row of rows) {
  if (row.status === 'present') {
    console.log(`[present] ${row.token}   (${row.owners.join(', ')})`)
    continue
  }
  missing += 1
  console.log(`[MISSING] ${row.token}`)
  if (row.candidates.length === 0) {
    console.log('          no same-suffix class in this build: the surface was renamed or removed')
  } else {
    for (const candidate of row.candidates.slice(0, 6)) {
      console.log(`          candidate ${candidate.token}  (${candidate.pkg})`)
    }
  }
}

console.log('')
console.log(`${rows.length} selector(s) checked, ${missing} missing`)
if (missing > 0) {
  console.log('fix the MISSING rows by hand, then run tools/verify.mjs and tools/upgrade-check.mjs')
  process.exitCode = 1
}
