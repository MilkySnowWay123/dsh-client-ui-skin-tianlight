// Expanded sweep. Catches (a) tokens used ANYWHERE inside a background value
// (gradients, color-mix, layered), and (b) background declarations with no token
// at all — hardcoded colors that a token override can never reach.
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOTS = [
  'C:/Users/57579/AppData/Local/npm-cache/_npx/1e7f6d9597241db0/node_modules/@deepseek-ai',
  'C:/Users/57579/AppData/Local/npm-cache/_npx/1e7f6d9597241db0/node_modules/@deepseek-ai/dsh-web-frontend/dist/assets',
  'C:/Users/57579/.dsh/profiles/web/node_modules/dshmarket',
  'C:/Users/57579/.dsh/profiles/web/node_modules/dsh-find-plugin',
]
const SKIN = fileURLToPath(new URL('../lib/client.js', import.meta.url))

const skinText = readFileSync(SKIN, 'utf8')
const cssStart = skinText.indexOf('String.raw`') + 'String.raw`'.length
const skinCss = skinText.slice(cssStart, skinText.indexOf('`', cssStart))
const overridden = new Set([...skinCss.matchAll(/^\s*(--dsw-[a-z0-9-]+)\s*:/gm)].map((m) => m[1]))

function walkFiles(root, seen) {
  const files = []
  const visit = (dir, depth) => {
    let entries = []
    try { entries = readdirSync(dir, { withFileTypes: true }) } catch { return }
    for (const e of entries) {
      const p = join(dir, e.name)
      if (e.isDirectory()) { if (depth < 3) visit(p, depth + 1) }
      else if (e.name.endsWith('.js')) files.push(p)
    }
  }
  visit(root, 0)
  return files
}

const painters = new Map() // token -> Set(file label)
const hardcoded = []      // { color, decl, file }
const files = []
for (const root of ROOTS) for (const f of walkFiles(root)) files.push(f)

for (const file of files) {
  let text = ''
  try { text = readFileSync(file, 'utf8') } catch { continue }
  const label = file.split('/').slice(-3).join('/')
  for (const m of text.matchAll(/background(?:-color|-image)?\s*:\s*([^;}]{0,260})/g)) {
    const value = m[1]
    const tokens = [...value.matchAll(/var\((--dsw-[a-z0-9-]+)/g)].map((x) => x[1])
    for (const token of tokens) {
      if (!painters.has(token)) painters.set(token, new Set())
      painters.get(token).add(label)
    }
    if (tokens.length === 0 && /(?:rgba?\(|#[0-9a-fA-F]{3,8})/.test(value)) {
      hardcoded.push({ color: value.slice(0, 140), file: label })
    }
  }
}

const missing = [...painters.keys()].filter((t) => !overridden.has(t)).sort()
console.log('painted tokens total: ' + painters.size + ', overridden: ' + overridden.size)
console.log('\n--- painted tokens NOT overridden (' + missing.length + ') ---')
for (const t of missing) console.log('  ' + t + '  <- ' + [...painters.get(t)].slice(0, 3).join(', '))
console.log('\n--- hardcoded backgrounds (no token, DARK only) ---')
const isDark = (color) => {
  const hex = color.match(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})/)
  if (hex) {
    let h = hex[1]
    if (h.length === 3) h = h.split('').map((c) => c + c).join('')
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16))
    if (h.length === 8) return false // has alpha -> likely translucent
    return r + g + b < 300
  }
  const rgb = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/)
  if (!rgb) return false
  const [, r, g, b, a] = rgb
  if (a !== undefined && Number(a) < 0.55) return false
  return Number(r) + Number(g) + Number(b) < 300
}
const dark = hardcoded.filter((h) => isDark(h.color))
for (const h of dark.slice(0, 30)) console.log('  ' + h.file + '\n     ' + h.color.replace(/\s+/g, ' '))
console.log('\ntotal hardcoded: ' + hardcoded.length + ', dark: ' + dark.length)
