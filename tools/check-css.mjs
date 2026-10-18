// Static sanity check on the stylesheet embedded in the client module: a broken
// template string fails silently in the browser, so it is checked here instead.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const source = readFileSync(fileURLToPath(new URL('../lib/client.js', import.meta.url)), 'utf8')
const start = source.indexOf('String.raw`')
if (start < 0) throw new Error('CSS template not found')
const open = source.indexOf('`', start)
const close = source.indexOf('`', open + 1)
const css = source.slice(open + 1, close)
/** Comments may contain braces and prose; strip them before structural checks. */
const blanked = css.replace(/\/\*[\s\S]*?\*\//g, '')

let failures = 0
const expect = (label, condition, detail = '') => {
  if (condition) console.log('PASS  ' + label)
  else { failures += 1; console.log('FAIL  ' + label + (detail ? ' :: ' + detail : '')) }
}

// Brace balance
let depth = 0
let minDepth = 0
for (const char of blanked) {
  if (char === '{') depth += 1
  else if (char === '}') { depth -= 1; minDepth = Math.min(minDepth, depth) }
}
expect('braces balance', depth === 0, 'unbalanced depth=' + depth)
expect('never closes below zero', minDepth === 0)

// Every rule outside an at-rule must be scoped to the skin body attribute.
const scopeViolations = []
let stack = []
let buffer = ''
for (const char of blanked) {
  if (char === '{') {
    // Functional pseudo-classes may hold a comma-separated list; collapse their
    // arguments so the scope check below only inspects the outer selector head.
    const head = buffer.trim().replace(/:is\([^)]*\)/g, ':is(*)').replace(/:where\([^)]*\)/g, ':where(*)')
    const isAtRule = head.startsWith('@')
    if (!isAtRule && stack.every((s) => s.startsWith('@media'))) {
      for (const selector of head.split(',')) {
        const one = selector.trim()
        if (one !== '' && !one.startsWith('body[data-dsh-tianlight]')) scopeViolations.push(one)
      }
    }
    stack.push(head)
    buffer = ''
  } else if (char === '}') {
    stack.pop()
    buffer = ''
  } else {
    buffer += char
  }
}
expect('all rules scoped to the skin attribute', scopeViolations.length === 0, scopeViolations.slice(0, 5).join(' | '))

// Declarations that would leak if the body attribute were removed are moot only
// when the !important token overrides are present.
const requiredTokens = [
  '--dsw-alias-bg-base',
  '--dsw-alias-bg-layer-1',
  '--dsw-alias-bg-layer-2',
  '--dsw-alias-bg-overlay',
  '--dsw-specific-sidebar-fill',
  '--dsw-alias-border-l1',
  '--dsw-alias-border-l2',
  '--dsw-alias-brand-primary',
  '--dsw-alias-label-primary',
  '--dsw-alias-label-secondary',
  '--dsw-alias-state-error-primary',
  '--dsw-alias-state-success-primary',
  '--dsw-alias-state-warn-primary',
]
const missing = requiredTokens.filter((token) => !css.includes(token + ':'))
expect('overrides all 13 alias tokens', missing.length === 0, missing.join(', '))
expect('overrides use !important (inline tokens are otherwise unopposed)', /--dsw-alias-bg-base:\s*var\([^)]+\)\s*!important/.test(css))
expect('dark theme block exists', css.includes('body[data-dsh-tianlight][data-ds-dark-theme]'))
expect('reduced-motion guard exists', css.includes('prefers-reduced-motion: reduce'))
expect('no unresolved template placeholder', !css.includes('${'))
expect('no stray backtick', !css.includes('`'))

console.log('\nCSS length: ' + css.length + ' chars')
console.log(failures === 0 ? 'ALL CSS CHECKS PASSED' : failures + ' CSS CHECK(S) FAILED')
process.exitCode = failures === 0 ? 0 : 1
