// Static audit of the skin bundle: duplicate custom properties, declared-but-unused
// variables, listener/timer inventory, and lifecycle ordering in apply().
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const FILE = fileURLToPath(new URL('../lib/client.js', import.meta.url))
const source = fs.readFileSync(FILE, 'utf8')

let issues = 0
const report = (level, text) => {
  if (level === 'FAIL') issues += 1
  console.log(`[${level}] ${text}`)
}

// ---- extract the CSS template ----
const open = source.indexOf('String.raw`') + 'String.raw`'.length
const close = source.indexOf('`', open)
const css = source.slice(open, close)
const blanked = css.replace(/\/\*[\s\S]*?\*\//g, '')

// ---- 1. duplicate declarations of the same custom property in one block ----
const blocks = []
{
  let depth = 0
  let start = 0
  for (let i = 0; i < blanked.length; i++) {
    if (blanked[i] === '{') { if (depth === 0) start = i; depth += 1 }
    else if (blanked[i] === '}') {
      depth -= 1
      if (depth === 0) blocks.push(blanked.slice(start + 1, i))
    }
  }
}
let dupCount = 0
for (const body of blocks) {
  const seen = new Map()
  for (const m of body.matchAll(/(--[a-z0-9-]+)\s*:/g)) {
    const name = m[1]
    seen.set(name, (seen.get(name) ?? 0) + 1)
  }
  for (const [name, count] of seen) {
    if (count > 1) { dupCount += 1; report('FAIL', `duplicate declaration: ${name} x${count} in one rule`) }
  }
}
if (dupCount === 0) report('PASS', 'no duplicate custom-property declarations inside a rule')

// ---- 2. declared vs used ----
const declared = new Set([...blanked.matchAll(/(--tl-[a-z0-9-]+)\s*:/g)].map((m) => m[1]))
const used = new Set([...blanked.matchAll(/var\((--tl-[a-z0-9-]+)/g)].map((m) => m[1]))
const unused = [...declared].filter((name) => !used.has(name))
if (unused.length === 0) report('PASS', 'every declared --tl-* variable is used')
else report('WARN', 'declared but never used: ' + unused.join(', '))

// Variables the runtime supplies from JavaScript rather than the stylesheet.
const JS_PROVIDED = new Set(['--tl-focal-x', '--tl-look', '--tl-rheo-pos', '--tl-rheo-t'])
const missing = [...used].filter((name) => !declared.has(name) && !JS_PROVIDED.has(name))
if (missing.length === 0) report('PASS', 'every referenced --tl-* variable is declared')
else report('FAIL', 'used but never declared: ' + missing.join(', '))

// ---- 3. listener inventory ----
// Only listeners on long-lived targets leak. Listeners on an element the skin
// removes die with that element, so they are excluded on purpose.
const SCOPED = /(window|document|video)\.(add|remove)EventListener\(\s*"([a-z]+)"/g
const adds = []
const removes = []
for (const m of source.matchAll(SCOPED)) {
  ;(m[2] === 'add' ? adds : removes).push(m[3])
}
const count = (list, name) => list.filter((x) => x === name).length
const kinds = new Set([...adds, ...removes])
let listenerIssue = false
for (const kind of kinds) {
  const a = count(adds, kind)
  const r = count(removes, kind)
  if (a !== r) {
    listenerIssue = true
    report('FAIL', `global listener imbalance on "${kind}": add=${a} remove=${r}`)
  }
}
if (!listenerIssue) report('PASS', 'every window/document/media listener is removed on dispose')

const timers = {
  setTimeout: [count([...source.matchAll(/window\.setTimeout/g)].map(() => 'x'), 'x'), count([...source.matchAll(/window\.clearTimeout/g)].map(() => 'x'), 'x')],
  setInterval: [count([...source.matchAll(/window\.setInterval/g)].map(() => 'x'), 'x'), count([...source.matchAll(/window\.clearInterval/g)].map(() => 'x'), 'x')],
}
for (const [name, [a, r]] of Object.entries(timers)) {
  if (a === 0) continue
  report(a <= r ? 'PASS' : 'WARN', `${name}: ${a} set / ${r} clear`)
}

// ---- 4. lifecycle: set and dispose must belong to the same effect ----
const pairedAttr = /ctx\.effect\(\s*\(\)\s*=>\s*\{[\s\S]{0,140}?setAttribute\(BODY_ATTR[\s\S]{0,260}?removeAttribute\(BODY_ATTR/.test(source)
if (!pairedAttr) {
  report('FAIL', 'body attribute must be set AND removed inside one ctx.effect, or a throw leaves it armed')
} else {
  report('PASS', 'body attribute set and removed inside one lifecycle-owned effect')
}

// The attribute effect must be registered before the fallible installers.
// Compare positions INSIDE apply(), not the module-wide function definitions.
const applyAt = source.lastIndexOf('function apply(ctx)')
const applyEnd = source.indexOf('exports.apply', applyAt)
const applyBody = source.slice(applyAt, applyEnd)
const order = [
  applyBody.indexOf('setAttribute(BODY_ATTR'),
  applyBody.indexOf('installScene'),
  applyBody.indexOf('installCompanion'),
]
if (order[0] >= 0 && order[0] < order[1] && order[1] < order[2]) {
  report('PASS', 'effect order inside apply(): stylesheet -> body attribute -> wallpaper -> companion')
} else {
  report('FAIL', 'effect order inside apply() is wrong: ' + JSON.stringify(order))
}

// ---- 5. no React hook may follow an early return ----
// A component that returns before its hooks changes the hook count between renders
// and React throws; this caught a real crash in the rheostat.
{
  const lines = source.split('\n')
  let sawEarlyReturn = false
  let violation = false
  for (const line of lines) {
    if (/if \(selection === null.*return null;/.test(line)) sawEarlyReturn = true
    else if (sawEarlyReturn && /React\.use(State|Effect|Ref|Memo|Callback|Reducer)\(/.test(line)) {
      violation = true
      break
    }
  }
  report(violation ? 'FAIL' : 'PASS', violation
    ? 'a React hook is declared after the early return'
    : 'no React hook is declared after the early return')
}

console.log('\nstylesheet: ' + css.length + ' chars, ' + declared.size + ' custom properties')
console.log(issues === 0 ? 'AUDIT: no blocking issues' : `AUDIT: ${issues} blocking issue(s)`)
process.exitCode = issues === 0 ? 0 : 1

