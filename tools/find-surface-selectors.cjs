// Finds every CSS rule whose `background` is painted from a design token, grouped
// by token. Used to turn the remaining opaque/dark surfaces into glass without
// guessing hashed class names.
const fs = require('node:fs')
const path = require('node:path')

const NM = 'C:/Users/57579/AppData/Local/npm-cache/_npx/1e7f6d9597241db0/node_modules/@deepseek-ai'
const TOKENS = [
  '--dsw-specific-menu',
  '--dsw-specific-bubble',
  '--dsw-specific-tip',
  '--dsw-alias-markdown-code-block',
  '--dsw-alias-markdown-code-block-banner',
  '--dsw-alias-bg-module-platform',
  '--dsw-alias-interactive-bg-hover-solid',
  '--dsw-alias-turn-trigger-bg',
  '--dsw-alias-bg-layer-3',
  '--dsw-alias-bg-base',
]

const found = new Map()

for (const pkg of fs.readdirSync(NM)) {
  const file = path.join(NM, pkg, 'lib', 'client.js')
  if (!fs.existsSync(file)) continue
  const text = fs.readFileSync(file, 'utf8')

  for (const token of TOKENS) {
    const needle = 'background:var(' + token
    let from = 0
    for (;;) {
      const at = text.indexOf(needle, from)
      if (at < 0) break
      from = at + needle.length
      // walk back to the start of the selector for this declaration
      let i = at
      while (i > 0 && text[i] !== '{') i -= 1
      if (i <= 0) continue
      let start = i - 1
      while (start > 0 && text[start] !== '}') start -= 1
      const selector = text.slice(start + 1, i).trim()
      if (selector.length === 0 || selector.length > 160) continue
      if (!found.has(token)) found.set(token, new Set())
      found.get(token).add(selector.replace(/\s+/g, ' '))
    }
  }
}

for (const [token, set] of found) {
  console.log('\n### ' + token + '  (' + set.size + ' rule(s))')
  for (const selector of [...set].slice(0, 8)) console.log('  ' + selector)
}
