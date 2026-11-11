// Static sanity check on every stylesheet embedded in the client module. Since v0.5.0
// the main sheet (20-stylesheet.js) is joined with each feature fragment's
// `registerTl5Css(String.raw`...`)` block at install time; one broken template string
// fails silently in the browser, so all blocks are checked here instead.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const source = readFileSync(fileURLToPath(new URL('../lib/client.js', import.meta.url)), 'utf8')

// Every String.raw template in the product is a CSS block by convention (no feature
// uses String.raw for anything else). Extract them all, in product order.
const blocks = [...source.matchAll(/String\.raw`([^`]*)`/g)].map((match) => match[1])
if (blocks.length === 0) throw new Error('CSS templates not found')
const css = blocks.join('\n')
/** Comments may contain braces and prose; strip them before structural checks. */
const blanked = css.replace(/\/\*[\s\S]*?\*\//g, '')

let failures = 0
const expect = (label, condition, detail = '') => {
  if (condition) console.log('PASS  ' + label)
  else { failures += 1; console.log('FAIL  ' + label + (detail ? ' :: ' + detail : '')) }
}

// Brace balance across each block independently: a block is a complete string.
for (let index = 0; index < blocks.length; index += 1) {
  const block = blocks[index].replace(/\/\*[\s\S]*?\*\//g, '')
  let depth = 0
  let minDepth = 0
  for (const char of block) {
    if (char === '{') depth += 1
    else if (char === '}') { depth -= 1; minDepth = Math.min(minDepth, depth) }
  }
  expect(`block ${index + 1}/${blocks.length} braces balance`, depth === 0, 'unbalanced depth=' + depth)
  expect(`block ${index + 1}/${blocks.length} never closes below zero`, minDepth === 0)
}
expect('never closes below zero', (() => {
  let depth = 0
  let minDepth = 0
  for (const char of blanked) {
    if (char === '{') depth += 1
    else if (char === '}') { depth -= 1; minDepth = Math.min(minDepth, depth) }
  }
  return minDepth === 0
})())

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
      // A rule is scoped when it is gated by the skin body attribute. Desktop chrome
      // clearance rules additionally start with the preload's `<html data-windows-titlebar>`
      // and are still gated by body[data-dsh-tianlight] further on.
      const scoped = (one) =>
        one.startsWith('body[data-dsh-tianlight]') ||
        (one.startsWith('html[data-windows-titlebar]') && one.includes('body[data-dsh-tianlight]'))
      for (const selector of head.split(',')) {
        const one = selector.trim()
        if (one !== '' && scoped(one) === false) scopeViolations.push(one)
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
expect('desktop titlebar clearance present', css.includes('--dsh-windows-titlebar-height'))
expect('panel fill has a legibility floor', css.includes('max(0.96, calc(0.88 * var(--tl-glass-m, 1)))'))
expect('no unresolved template placeholder', !css.includes('${'))
expect('no stray backtick', !css.includes('`'))

// ---- R2 energy pass: the scene layer is a static veil, never a live full-viewport blur.
// A backdrop-filter on [data-tl-scene]::after re-composites the whole viewport on every
// decoded wallpaper frame; the static grain/gradient surface must stay so the depth
// still reads on screen. Panel-level glass is a bounded surface and keeps its blur.
const sceneAfterRules = [...blanked.matchAll(/([^{}]+\[data-tl-scene\]::after[^{}]*)\{([^{}]*)\}/g)]
const sceneAfterLive = sceneAfterRules.filter((match) => /(?:-webkit-)?backdrop-filter\s*:/.test(match[2]))
expect(
  'scene layer paints a static veil, not a live full-viewport backdrop-filter',
  sceneAfterRules.length > 0 && sceneAfterLive.length === 0,
  sceneAfterLive.map((match) => match[1].trim()).join(' | '),
)
expect(
  'scene layer keeps the static liquid-glass surface (colour / grain veil)',
  sceneAfterRules.some((match) => /background-image\s*:/.test(match[2])),
)
expect(
  'no infinite animation repaints the scene layer',
  sceneAfterRules.every((match) => /animation\s*:[^;]*infinite/.test(match[2]) === false),
)
expect('the removed 22s scene-sheen keyframes are gone', css.includes('@keyframes tl-liquid-sheen') === false)
// The depth presets still drive the product's own glass: a live blur must remain on at
// least the composer / menu / model surfaces, otherwise the depth change became a no-op.
const liveBlurRules = [...blanked.matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter((match) => /(?:-webkit-)?backdrop-filter\s*:/.test(match[2]))
expect(
  'bounded product glass keeps a live blur (composer / menu / model)',
  liveBlurRules.some((match) => /\[data-tl-composer\]::before/.test(match[1])) &&
    liveBlurRules.some((match) => /\[data-tl-menu\]/.test(match[1])) &&
    liveBlurRules.some((match) => /\[data-tl-model\]/.test(match[1])),
)

console.log('\nCSS blocks: ' + blocks.length + ', total ' + css.length + ' chars')
console.log(failures === 0 ? 'ALL CSS CHECKS PASSED' : failures + ' CSS CHECK(S) FAILED')
process.exitCode = failures === 0 ? 0 : 1
