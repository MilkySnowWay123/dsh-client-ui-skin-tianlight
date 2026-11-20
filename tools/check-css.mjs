// Static sanity check on every stylesheet embedded in the client module. Since v0.5.0
// the main sheet (20-stylesheet.js) is joined with each feature fragment's
// `registerTl5Css(String.raw`...`)` block at install time; one broken template string
// fails silently in the browser, so all blocks are checked here instead.
import { readFileSync, writeFileSync } from 'node:fs'
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
      // v2.3.0: the theme-transition pseudo-elements are document-level by nature
      // (they cannot be scoped to body[data-dsh-tianlight]); the extra check below
      // proves they only ever ship inside the appearance fragment.
      const scoped = (one) =>
        one.startsWith('body[data-dsh-tianlight]') ||
        one.startsWith('::view-transition-') ||
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

// v2.3.0 (4.1.4): the cross-document theme transition may only be declared by the
// appearance fragment. The pseudo-elements are global, so the fence lives here: the
// count in the product's CSS must equal the count inside the ONE appearance block
// (identified by its own toggle selector, not by block order).
const appearanceCssBlock = blocks.find((block) => block.includes('[data-tl-scheme-menu]')) ?? ''
const viewTransitionSelectors = [...blanked.matchAll(/(::view-transition-[a-z-]+)(?:\s*\([^)]*\))?/g)].map((match) => match[1])
expect(
  'the theme view-transition pseudos live only in the appearance fragment',
  viewTransitionSelectors.length > 0 &&
    appearanceCssBlock.includes('::view-transition-') &&
    appearanceCssBlock.split('::view-transition-').length - 1 === viewTransitionSelectors.length,
  'found ' + viewTransitionSelectors.length + ' match(es), appearance block has ' + (appearanceCssBlock.split('::view-transition-').length - 1),
)

// v2.3.0 (4.1.1): every --tl-* token declared in the dark theme block must have a
// light-theme counterpart in the base block (and vice versa). Runtime variables that
// JS writes per frame are exempt. A one-sided token is how a light mode ends up with
// an undefined background.
const LIGHT_START = blanked.indexOf('body[data-dsh-tianlight] {')
const DARK_START = blanked.indexOf('body[data-dsh-tianlight][data-ds-dark-theme] {')
const BLOCK_END = DARK_START < 0 ? -1 : blanked.indexOf('body[data-dsh-tianlight] {', DARK_START + 1)
const lightTokenBlock = LIGHT_START >= 0 && DARK_START > LIGHT_START ? blanked.slice(LIGHT_START, DARK_START) : ''
const darkTokenBlock = DARK_START >= 0 && BLOCK_END > DARK_START ? blanked.slice(DARK_START, BLOCK_END) : ''
const tokenNames = (block) => new Set([...block.matchAll(/(--tl-[a-z0-9-]+)\s*:/g)].map((match) => match[1]))
const runtimeTokens = new Set([
  '--tl-day-lift',
  '--tl-night-lift',
  '--tl-glass-m',
  '--tl-look',
  '--tl-rheo-pos',
  '--tl-rheo-t',
  '--tl-flip',
  '--tl-menu-x',
  '--tl-menu-y',
])
const lightTokens = tokenNames(lightTokenBlock)
const darkTokens = tokenNames(darkTokenBlock)
const missingInLight = [...darkTokens].filter((name) => lightTokens.has(name) === false && runtimeTokens.has(name) === false)
const missingInDark = [...lightTokens].filter((name) => darkTokens.has(name) === false && runtimeTokens.has(name) === false)
expect(
  'light and dark token blocks declare the same --tl-* variables',
  lightTokens.size > 0 && darkTokens.size > 0 && missingInLight.length === 0 && missingInDark.length === 0,
  'dark-only: ' + missingInLight.join(', ') + ' | light-only: ' + missingInDark.join(', '),
)

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
expect(
  'both panel fills keep a legibility floor (light + dark)',
  css.includes('max(0.74, calc(0.80 * var(--tl-glass-m, 1)))') &&
    css.includes('max(0.96, calc(0.88 * var(--tl-glass-m, 1)))'),
)
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
  'v2.2.9: the scene layer carries no glass surface (the wallpaper stays crisp)',
  sceneAfterRules.every((match) => /--tl-liquid-surface/.test(match[2]) === false && /backdrop-filter/.test(match[2]) === false),
)
expect(
  'no infinite animation repaints the scene layer',
  sceneAfterRules.every((match) => /animation\s*:[^;]*infinite/.test(match[2]) === false),
)
expect('the removed 22s scene-sheen keyframes are gone', css.includes('@keyframes tl-liquid-sheen') === false)
// The depth presets still drive the product's own glass: a live blur must remain on at
// least the composer / menu / model surfaces, otherwise the depth change became a no-op.
const liveBlurRules = [...blanked.matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter((match) => /(?:-webkit-)?backdrop-filter\s*:\s*(?!none)[^;]+/.test(match[2]))
expect(
  'bounded product glass keeps a live blur (composer / menu / model)',
  liveBlurRules.some((match) => /\[data-tl-composer\]::before/.test(match[1])) &&
    liveBlurRules.some((match) => /\[data-tl-menu\]::before/.test(match[1])) &&
    liveBlurRules.some((match) => /\[data-tl-sidebar-col\]/.test(match[1])),
)
// v2.2.6: the composer card had a 0.5px border AND a 1px inset top highlight, which
// read as a stray second line above the input. One edge only.
const composerCardRules = [...blanked.matchAll(/\[data-tl-composer\](?!::before)[^{]*\{([^{}]*)\}/g)].map((match) => match[1])
expect(
  'the composer card draws one edge, not two (no 1px inset top highlight)',
  composerCardRules.length > 0 && composerCardRules.every((body) => /inset 0 1px 0/.test(body) === false),
  composerCardRules.map((body) => body.trim().slice(0, 120)).join(' | '),
)
// v2.2.8: the depth presets must not repaint a white outline on the composer or the
// model pill. --tl-glass-line is fully transparent; an explicit rgba(255,255,255,…)
// border reinstated the "white ring" the preview report named, so any such rule fails.
const whiteOutlineRules = [...blanked.matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter(
  (match) =>
    /\[data-tl-(?:composer|model)\]/.test(match[1]) &&
    /border-color\s*:\s*rgba\(\s*255\s*,\s*255\s*,\s*255/.test(match[2]),
)
expect(
  'the composer and the model pill keep no white border in the depth path',
  whiteOutlineRules.length === 0,
  whiteOutlineRules.map((match) => match[1].trim().slice(0, 120)).join(' | '),
)

// ---- v2.2.0 live glass: every real-time filter must be gated on the installer's
// effective flag, so the default path (and low power / 15 fps) adds no compositing.
const liveRules = liveBlurRules.filter((match) => /data-tl-glass-live/.test(match[1]))
expect(
  'live glass ships real backdrop-filter rules',
  liveRules.length >= 3,
  'found ' + liveRules.length,
)
expect(
  'every live glass rule is gated on data-tl-glass-live-effective="on"',
  liveRules.every((match) => /data-tl-glass-live-effective="on"/.test(match[1])),
  liveRules.map((match) => match[1].trim()).filter((selector) => /data-tl-glass-live-effective="on"/.test(selector) === false).join(' | '),
)
const lensRules = liveBlurRules.filter((match) => /url\(#tl-glass-lens-filter\)/.test(match[2]))
expect(
  'the live lens uses an SVG displacement filter gated on runtime support',
  lensRules.length >= 1 && lensRules.every((match) => /data-tl-glass-lens-support="1"/.test(match[1])),
  lensRules.map((match) => match[1].trim()).join(' | '),
)
expect(
  'live glass is bounded to the composer and the small floating controls',
  liveRules.some((match) => /\[data-tl-composer\]::before/.test(match[1])) &&
    liveRules.some((match) => /\[data-tl-menu\]::before/.test(match[1])) &&
    liveRules.some((match) => /\[data-tl-sidebar-col\].*::before/.test(match[1])),
)
// v2.2.5: liquid glass must never blur the wallpaper as a whole. Full-viewport nodes
// (the scene-less fallback, the hub scrim) and large panels (settings / wallpaper panel
// / hub panel / the sidebar column) must stay filter-free; they carry tint and borders
// only. A filter there is the reported "the background wallpaper is all blurred".
// v2.2.9: the blur is allowed on the pseudo element of a bounded panel, because a
// pseudo is not an ancestor of the product's position:fixed children. The host,
// the frame and every full-viewport scrim stay completely filter-free.
const fullViewportFiltered = liveBlurRules.filter((match) => /\[data-tl-liquid-fallback\]|\[data-tl-hub-mask\]|\[data-tl-wall-scrim\]|\[data-tl-scene\]|_frame|data-tl-sidebar(?!-col)/.test(match[1]))
expect('full-viewport scrims, frame and scene receive no backdrop-filter', fullViewportFiltered.length === 0, fullViewportFiltered.map((match) => match[1].trim()).join(' | '))
const panelHostFiltered = liveBlurRules.filter((match) => {
  if (/::before/.test(match[1])) return false
  return /\[data-tl-(?:sidebar-col|wall|settings|hub-panel|menu|composer)\](?!::)/.test(match[1])
})
expect('glass panel hosts carry no backdrop-filter (blur lives on ::before)', panelHostFiltered.length === 0, panelHostFiltered.map((match) => match[1].trim()).join(' | '))
const filteredHosts = [...blanked.matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter((match) => {
  if (/::(?:before|after)/.test(match[1])) return false
  return /\[data-tl-(?:sidebar-col|wall|settings|hub-panel|menu|composer)\]/.test(match[1]) &&
    /(?:^|;)\s*(?:filter|backdrop-filter|transform|will-change)\s*:/.test(match[2])
})
expect('glass panel hosts have no filter/backdrop-filter/transform/will-change', filteredHosts.length === 0, filteredHosts.map((match) => match[1].trim()).join(' | '))
const framePaintSelectors = [...blanked.matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter((match) =>
  /\[data-tl-sidebar\](?!-col)/.test(match[1]) && /(?:background|box-shadow|backdrop-filter|filter)\s*:/.test(match[2]),
)
expect('v2.2.9: no paint rule targets the legacy full-frame data-tl-sidebar', framePaintSelectors.length === 0, framePaintSelectors.map((m) => m[1].trim()).join(' | '))
// v2.2.7: no hard outline pass. The 1px white sidebar edge and the 1px light/dark rim
// that every glass surface composed are what read as "a line on every part".
expect(
  'the sidebar pane draws no 1px edge line',
  /\[data-tl-sidebar[^{]*\{[^}]*border-right\s*:\s*1px/.test(css) === false,
)
expect(
  'glass surfaces compose no 1px rim any more',
  css.includes('--tl-liquid-rim-shadow: inset 0 0 0 0 rgba(0, 0, 0, 0)'),
)
expect(
  'skin hairlines are gone (glass line fully transparent)',
  css.includes('--tl-glass-line: rgba(255, 255, 255, 0)') && css.includes('--tl-glass-line: rgba(150, 195, 250, 0)'),
)

expect(
  'text-bearing glass keeps a legibility floor (bubble >= 0.30; live lowers decorative fill)',
  css.includes('--tl-glass-fill: rgba(250, 252, 255, calc(0.52 * var(--tl-glass-m, 1)))') &&
    css.includes('--dsw-specific-bubble: rgba(236, 245, 255, 0.56) !important'),
)
expect(
  'the old white specular is gone (real / soft / frosted hi alpha lowered)',
  css.includes('--tl-liquid-hi: 0.12') &&
    css.includes('--tl-liquid-hi: 0.08') &&
    css.includes('--tl-liquid-hi: 0.16') &&
    css.includes('--tl-liquid-hi: 0.52') === false,
)

// v2.3.0 (4.1.2): component rules must paint from tokens, not literals. The light
// theme is a redesign, so a stray `rgba(255,255,255,0.3)` copied into a component
// rule would survive the token system and break on the other scheme. Existing
// violations are frozen in tools/css-color-baseline.json; ONLY new ones fail.
// Regenerate after a deliberate, reviewed change: node tools/check-css.mjs --write-baseline
const keyframeRanges = [...blanked.matchAll(/@keyframes[^{]*\{[\s\S]*?\}\s*\}/g)].map((match) => [match.index, match.index + match[0].length])
const insideKeyframes = (index) => keyframeRanges.some(([from, to]) => index >= from && index < to)
const insideTokenBlocks = (index) => LIGHT_START >= 0 && BLOCK_END > LIGHT_START && index >= LIGHT_START && index < BLOCK_END
const COLOR_PROPS = /(?:^|;)\s*(box-shadow|background|background-color|background-image|color|border|border-color|border-top-color|border-bottom-color|outline-color|fill|stroke)\s*:\s*([^;]+)/g
const colorViolations = []
for (const match of blanked.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
  const selector = match[1].trim().replace(/\s+/g, ' ')
  if (selector.startsWith('@') || insideKeyframes(match.index) || insideTokenBlocks(match.index)) continue
  const body = match[2]
  for (const declaration of body.matchAll(COLOR_PROPS)) {
    const property = declaration[1]
    const value = declaration[2].trim()
    const literals = [...value.matchAll(/#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)/g)].map((entry) => entry[0].toLowerCase().replace(/\s+/g, ''))
    if (literals.length === 0) continue
    colorViolations.push(selector + '|' + property + '|' + literals.join(','))
  }
}
const baselinePath = fileURLToPath(new URL('./css-color-baseline.json', import.meta.url))
const baseline = (() => {
  try {
    const parsed = JSON.parse(readFileSync(baselinePath, 'utf8'))
    return parsed !== null && typeof parsed === 'object' && parsed.colors !== null && typeof parsed.colors === 'object' ? parsed.colors : {}
  } catch {
    return null
  }
})()
if (process.argv.includes('--write-baseline')) {
  const counts = {}
  for (const key of colorViolations) counts[key] = (counts[key] ?? 0) + 1
  writeFileSync(baselinePath, JSON.stringify({ note: 'Frozen pre-v2.3.0 literal colours in component rules. Only new entries fail check-css.', colors: counts }, null, 1) + '\n', 'utf8')
  console.log('wrote ' + Object.keys(counts).length + ' colour baseline entries to ' + baselinePath)
} else if (baseline === null) {
  expect('component colour baseline exists (run --write-baseline once)', false, baselinePath)
} else {
  const counts = {}
  for (const key of colorViolations) counts[key] = (counts[key] ?? 0) + 1
  const added = []
  for (const key of Object.keys(counts)) {
    if ((baseline[key] ?? 0) < counts[key]) added.push(key)
  }
  const removed = Object.keys(baseline).filter((key) => (counts[key] ?? 0) === 0)
  expect(
    'no NEW literal colours in component rules (token-only painting)',
    added.length === 0,
    added.slice(0, 6).join(' | '),
  )
  if (removed.length > 0) console.log('NOTE  ' + removed.length + ' frozen colour baseline entr(ies) are gone; refresh with --write-baseline')
}

console.log('\nCSS blocks: ' + blocks.length + ', total ' + css.length + ' chars')
console.log(failures === 0 ? 'ALL CSS CHECKS PASSED' : failures + ' CSS CHECK(S) FAILED')
process.exitCode = failures === 0 ? 0 : 1
