// Dark-theme byte parity guard for v2.3.0.
//
// The release promise is "the dark look is pixel-identical to v2.2.x". A screenshot
// comparison is the final proof, but the cheapest invariant is the token table itself:
// every `--tl-*` declaration that existed in the dark block before v2.3.0 must keep the
// exact same resolved text, and new declarations may only be ADDED (the shadow tokens
// the release moved the old literals into). This runs without a browser, so it belongs
// in the release gate.
//
//   node tools/dark-parity.mjs [--ref <git-ref>]
import { spawnSync } from 'node:child_process'
import { closeSync, mkdtempSync, openSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = dirname(HERE)
const argv = process.argv.slice(2)
const refIndex = argv.indexOf('--ref')
const ref = refIndex >= 0 && argv[refIndex + 1] !== undefined ? argv[refIndex + 1] : 'f278548'

/** Concatenate every fragment that can declare tokens. */
function currentSources() {
  const files = ['20-stylesheet.js', '20b-stylesheet-shell.js', '20c-stylesheet-glass.js', '20d-stylesheet-hub.js', '56-appearance.js']
  return files.map((name) => readFileSync(join(ROOT, 'src', name), 'utf8')).join('\n')
}

/** The dark token block: `body[data-dsh-tianlight][data-ds-dark-theme] { ... }`. */
function darkBlock(source) {
  const start = source.indexOf('body[data-dsh-tianlight][data-ds-dark-theme] {')
  if (start < 0) return ''
  const end = source.indexOf('\n}', start)
  return end < 0 ? '' : source.slice(start, end)
}

/** `{ token: value }` for every `--tl-*: ...;` declaration in one block. */
function tokensOf(block) {
  const tokens = {}
  for (const match of block.matchAll(/(--tl-[a-z0-9-]+)\s*:\s*([^;]+);/g)) tokens[match[1]] = match[2].trim().replace(/\s+/g, ' ')
  return tokens
}

// The DSH sandbox gives child processes no pipes, so git's stdout goes to a FILE (the
// same pattern tools/smoke-dsh.mjs uses) instead of a piped buffer.
function gitShow(ref, path) {
  const dir = mkdtempSync(join(tmpdir(), 'tl-parity-'))
  const out = join(dir, 'file.js')
  const fd = openSync(out, 'w')
  try {
    const result = spawnSync('git', ['-C', ROOT, 'show', ref + ':' + path], { stdio: ['ignore', fd, 'ignore'], windowsHide: true })
    if (result.status !== 0) throw new Error('git show ' + ref + ':' + path + ' failed (status ' + String(result.status) + ')')
  } finally {
    closeSync(fd)
  }
  try {
    return readFileSync(out, 'utf8')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

const previous = gitShow(ref, 'src/20-stylesheet.js')
const before = tokensOf(darkBlock(previous))
const after = tokensOf(darkBlock(currentSources()))
const changed = []
const removed = []
const added = []
for (const [token, value] of Object.entries(before)) {
  if (!(token in after)) removed.push(token)
  else if (after[token] !== value) changed.push(token + ': ' + value + ' -> ' + after[token])
}
for (const token of Object.keys(after)) if (!(token in before)) added.push(token)

console.log('dark parity: ' + Object.keys(before).length + ' pre-v2.3.0 token(s), ' + Object.keys(after).length + ' now')
if (added.length > 0) console.log('  added (allowed): ' + added.join(', '))
if (changed.length > 0) console.log('  CHANGED: ' + changed.join(' | '))
if (removed.length > 0) console.log('  REMOVED: ' + removed.join(', '))
const ok = changed.length === 0 && removed.length === 0
console.log(ok ? 'DARK PARITY: PASS (no existing dark value changed)' : 'DARK PARITY: FAIL')
process.exitCode = ok ? 0 : 1
