// Resolves the daily DSH canary matrix used by .github/workflows/dsh-canary.yml.
//
//   node tools/canary-matrix.mjs             # GITHUB_OUTPUT lines (matrix=..., next=..., alpha=..., tested=...)
//   node tools/canary-matrix.mjs --readable  # human-readable table (local check)
//
// Rows, in this order:
//   next    the npm `next` dist-tag of @deepseek-ai/dsh
//   alpha   the npm `alpha` dist-tag (skipped when it resolves to the same version as next)
//   tested  the newest version already listed in skin.json dshCompatibilityTested
//
// The `tested` row is the control: it is a version this skin is published as
// compatible with, so the same tools must keep passing there. When a scheduled run
// breaks only that row, the matrix or the checkout is wrong, not DSH.
//
// The resolver only reads: npm dist-tags and skin.json. It never edits the repo and
// never talks to GitHub. CI appends its stdout to $GITHUB_OUTPUT, which is why every
// line is a single `name=value` pair.
import { spawnSync } from 'node:child_process'
import { closeSync, existsSync, mkdtempSync, openSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { compareVersions, parseVersion } from './compat.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = dirname(HERE)
const DSH_PACKAGE = '@deepseek-ai/dsh'
const readable = process.argv.includes('--readable')

/**
 * Run npm and return its combined output. Stdio is redirected to a FILE, never a
 * pipe: a confined host (the DSH sandbox) hands child processes no named pipes, so
 * `spawnSync(..., { encoding: 'utf8' })` would fail with EPERM there even though it
 * works in CI. A file descriptor is inherited normally by every platform.
 *
 * npm itself is started as `node <npm-cli.js>` when that file can be found next to
 * the running Node, which avoids the deprecation warning `spawnSync(shell: true)`
 * raises on Node 24 and keeps the arguments unescaped-free. The shim path is only a
 * fallback for exotic installs.
 */
function npmCommand(args) {
  const candidates = []
  if (typeof process.env.npm_execpath === 'string' && process.env.npm_execpath !== '') candidates.push(process.env.npm_execpath)
  const execDir = dirname(process.execPath)
  candidates.push(join(execDir, 'node_modules', 'npm', 'bin', 'npm-cli.js'))
  candidates.push(join(execDir, '..', 'lib', 'node_modules', 'npm', 'bin', 'npm-cli.js'))
  for (const candidate of candidates) {
    // Existence matters: a GitHub runner's Node lives in the toolcache, where the
    // first layout (`<node>/node_modules/npm/...`) does not exist even though the
    // path ends with `.js`. Returning it would make the resolver fail on every tick.
    if (candidate.endsWith('.js') && existsSync(candidate)) return { command: process.execPath, args: [candidate, ...args], shell: false }
  }
  return { command: 'npm', args, shell: process.platform === 'win32' }
}

function runNpm(args) {
  const dir = mkdtempSync(join(tmpdir(), 'tl-canary-'))
  const captured = join(dir, 'npm.out')
  const fd = openSync(captured, 'w')
  const invocation = npmCommand(args)
  let result
  try {
    result = spawnSync(invocation.command, invocation.args, {
      stdio: ['ignore', fd, fd],
      windowsHide: true,
      shell: invocation.shell,
    })
  } finally {
    closeSync(fd)
  }
  const output = readFileSync(captured, 'utf8')
  rmSync(dir, { recursive: true, force: true })
  return { status: result.status, error: result.error, output }
}

/** The npm dist-tags object for the harness package, or throws with npm's own message. */
function readDistTags() {
  const result = runNpm(['view', DSH_PACKAGE, 'dist-tags', '--json'])
  if (result.status !== 0) {
    const detail = String(result.output ?? '').trim()
    throw new Error(
      'npm view ' + DSH_PACKAGE + ' dist-tags failed' +
        (result.error === undefined ? '' : ' (' + result.error.message + ')') +
        ' [status ' + String(result.status) + ']' +
        (detail === '' ? '' : ':\n' + detail),
    )
  }
  const parsed = JSON.parse(String(result.output ?? '{}'))
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('npm view ' + DSH_PACKAGE + ' dist-tags returned a non-object: ' + JSON.stringify(parsed))
  }
  return parsed
}

/** The newest skin.json dshCompatibilityTested entry, or '' when the list is empty. */
function newestTestedVersion() {
  const skin = JSON.parse(readFileSync(join(ROOT, 'skin.json'), 'utf8'))
  const list = Array.isArray(skin.dshCompatibilityTested) ? skin.dshCompatibilityTested : []
  const valid = list.filter((version) => typeof version === 'string' && parseVersion(version) !== null)
  valid.sort(compareVersions)
  return valid.length === 0 ? '' : valid[valid.length - 1]
}

let tags
try {
  tags = readDistTags()
} catch (error) {
  console.error('canary-matrix: ' + (error instanceof Error ? error.message : String(error)))
  process.exit(1)
}

const next = typeof tags.next === 'string' ? tags.next : ''
const alpha = typeof tags.alpha === 'string' ? tags.alpha : ''
const tested = newestTestedVersion()

for (const [label, version] of [['next', next], ['alpha', alpha], ['tested', tested]]) {
  if (version !== '' && parseVersion(version) === null) {
    console.error(`canary-matrix: ${label} resolved to "${version}", which is not a semantic version`)
    process.exit(1)
  }
  if (version === '') console.error(`canary-matrix: ${label} resolved to an empty version; the row is dropped`)
}

const rows = []
const seen = new Set()
const add = (label, version, source) => {
  if (version === '' || seen.has(version)) return
  seen.add(version)
  rows.push({ label, version, source })
}
add('next', next, 'npm dist-tag next')
add('alpha', alpha, 'npm dist-tag alpha')
// The control row is never deduplicated away: it is the "this must keep working" row.
if (tested !== '') rows.push({ label: 'tested', version: tested, source: 'skin.json dshCompatibilityTested' })

if (readable) {
  console.log('canary matrix')
  console.log('  package: ' + DSH_PACKAGE)
  for (const row of rows) console.log(`  ${row.label.padEnd(7)} ${row.version.padEnd(14)} (${row.source})`)
  console.log('  rows: ' + rows.length)
} else {
  console.log('matrix=' + JSON.stringify(rows.map(({ label, version }) => ({ label, version }))))
  console.log('next=' + next)
  console.log('alpha=' + alpha)
  console.log('tested=' + tested)
  // stderr keeps the log readable when the workflow prints the step output.
  console.error('canary-matrix: ' + rows.length + ' row(s): ' + rows.map((row) => row.label + '=' + row.version).join(', '))
}
