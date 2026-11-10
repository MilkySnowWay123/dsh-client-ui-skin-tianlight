// Per-workstream sanity check while several agents edit disjoint src/ fragments.
//
// It builds the current fragment set to a SCRATCH path (never lib/client.js), syntax
// checks the product, then runs the cheap CSS invariants over every String.raw block.
// This lets one workstream validate its own fragment without fighting the shared
// product file or the Lead's integration build.
//
//   node tools/agent-check.mjs
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = dirname(HERE)
const OUT_DIR = join(ROOT, '..', 'diag', 'tmp')
const OUT = join(OUT_DIR, 'agent-check-client.mjs')

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true })

const build = spawnSync(process.execPath, [join(HERE, 'build.mjs'), '--out', OUT], { encoding: 'utf8' })
if (build.status !== 0) {
  console.error(build.stdout.trim())
  console.error(build.stderr.trim())
  console.error('agent-check: build failed')
  process.exit(1)
}

const syntax = spawnSync(process.execPath, ['--check', OUT], { encoding: 'utf8' })
if (syntax.status !== 0) {
  console.error(syntax.stderr.trim())
  console.error('agent-check: product syntax error')
  process.exit(1)
}

const source = readFileSync(OUT, 'utf8')
const blocks = [...source.matchAll(/String\.raw`([^`]*)`/g)].map((match) => match[1])
let failures = 0
blocks.forEach((block, index) => {
  const blanked = block.replace(/\/\*[\s\S]*?\*\//g, '')
  let depth = 0
  let minDepth = 0
  let stack = []
  let buffer = ''
  const violations = []
  for (const char of blanked) {
    if (char === '{') {
      const head = buffer.trim().replace(/:is\([^)]*\)/g, ':is(*)').replace(/:where\([^)]*\)/g, ':where(*)')
      const scoped = (one) =>
        one.startsWith('body[data-dsh-tianlight]') ||
        (one.startsWith('html[data-windows-titlebar]') && one.includes('body[data-dsh-tianlight]'))
      if (!head.startsWith('@') && stack.every((s) => s.startsWith('@media'))) {
        for (const selector of head.split(',')) {
          const one = selector.trim()
          if (one !== '' && scoped(one) === false) violations.push(one)
        }
      }
      stack.push(head)
      buffer = ''
      depth += 1
    } else if (char === '}') {
      depth -= 1
      minDepth = Math.min(minDepth, depth)
      stack.pop()
      buffer = ''
    } else {
      buffer += char
    }
  }
  if (depth !== 0 || minDepth < 0) {
    failures += 1
    console.error(`agent-check: CSS block ${index + 1} has unbalanced braces (depth=${depth}, min=${minDepth})`)
  }
  for (const violation of violations.slice(0, 8)) {
    failures += 1
    console.error(`agent-check: CSS block ${index + 1} rule is not scoped under body[data-dsh-tianlight]: ${violation}`)
  }
  if (block.includes('${')) {
    failures += 1
    console.error(`agent-check: CSS block ${index + 1} contains a template placeholder (\${...}); String.raw still interpolates`)
  }
})
if (failures > 0) {
  console.error(`agent-check: FAIL (${failures} problem(s))`)
  process.exit(1)
}
console.log(`agent-check: PASS — ${blocks.length} CSS block(s), product ${source.length} chars`)
