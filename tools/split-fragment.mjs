// Split one `src/` fragment into several, preserving its `#region` markers.
//
// The client half must stay ONE ESM file (loader contract), so `src/` exists purely for
// maintenance: `tools/build.mjs` concatenates the fragments in a fixed order inside one
// factory closure. A 250 KB fragment is not larger at runtime than four 60 KB fragments,
// but it is much harder to change without side effects — the split is a maintenance
// boundary, not a performance one.
//
//   node tools/split-fragment.mjs src/76-role-hub.js \
//     --out 76a-role-hub-strings.js:1:860 \
//     --out 76-role-hub.js:861:1420 \
//     --out 76b-role-hub-cards.js:1421:5220          # dry run: prints the plan
//
//   node tools/split-fragment.mjs src/76-role-hub.js ... --apply
//
// Rules the tool enforces:
//   - the source is one `//#region <name>` … `//#endregion` block; every output gets the
//     SAME region name plus its own markers, so `tools/structure.mjs` and `tools/build.mjs`
//     keep working and existing region slicing in tests stays valid (59/59b precedent);
//   - ranges are 1-based, contiguous, ordered, and must cover the body exactly once;
//   - a range may only start on a blank line or a top-level declaration
//     (`function`/`const`/`let`/`class`/comment at exactly two tabs) — never mid-expression;
//   - an output file must not already exist, except the source itself when `--replace`
//     is set (the usual case: keep the original name for the first chunk);
//   - nothing else is touched: `tools/build.mjs` FRAGMENTS, ARCHITECTURE.md and the deps
//     baseline are the caller's follow-up (the tool prints the exact lines to change).
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = dirname(HERE)

function usage(code) {
  console.error('usage: node tools/split-fragment.mjs <src/file.js> --out <name.js>:<from>:<to> [--out …] [--apply] [--replace]')
  process.exit(code)
}

const args = process.argv.slice(2)
const source = args.find((value) => !value.startsWith('--'))
if (source === undefined) usage(2)
const apply = args.includes('--apply')
const replace = args.includes('--replace')

const outs = []
for (let index = 0; index < args.length; index += 1) {
  if (args[index] !== '--out') continue
  const spec = args[index + 1]
  const match = /^([^:]+\.js):(\d+):(\d+)$/.exec(spec ?? '')
  if (match === null) {
    console.error('bad --out spec: ' + JSON.stringify(spec) + ' (expected name.js:from:to)')
    usage(2)
  }
  outs.push({ name: match[1], from: Number(match[2]), to: Number(match[3]) })
}
if (outs.length < 2) {
  console.error('a split needs at least two --out ranges')
  usage(2)
}

const sourcePath = resolve(ROOT, source)
if (!existsSync(sourcePath)) {
  console.error('missing source fragment: ' + source)
  process.exit(2)
}
const text = readFileSync(sourcePath, 'utf8')
const lines = text.split(/(?<=\n)/)
const markers = []
lines.forEach((line, index) => {
  const trimmed = line.trim()
  const begin = /^\/\/#region\s+(.+?)$/.exec(trimmed)
  if (begin !== null) markers.push({ kind: 'begin', index, name: begin[1].trim() })
  else if (/^\/\/#endregion$/.test(trimmed)) markers.push({ kind: 'end', index })
})
if (markers.length !== 2 || markers[0].kind !== 'begin' || markers[1].kind !== 'end') {
  console.error('expected exactly one //#region … //#endregion pair; found ' + markers.length + ' marker(s)')
  process.exit(2)
}
const region = markers[0].name
// Lines are 1-based in the CLI; the body excludes the two marker lines.
const bodyStart = markers[0].index + 2 // first body line, 1-based
const bodyEnd = markers[1].index // last body line, 1-based
const body = lines.slice(markers[0].index + 1, markers[1].index)
// `to = 0` means "to the end of the body" (only meaningful on the last range).
for (const out of outs) if (out.to === 0) out.to = bodyEnd

for (let index = 0; index < outs.length; index += 1) {
  const out = outs[index]
  if (out.from !== (index === 0 ? bodyStart : outs[index - 1].to + 1)) {
    console.error('ranges are not contiguous at ' + out.name + ': expected from=' + (index === 0 ? bodyStart : outs[index - 1].to + 1) + ', got ' + out.from)
    process.exit(2)
  }
  if (out.to < out.from || out.to > bodyEnd) {
    console.error('range out of bounds for ' + out.name + ': ' + out.from + '..' + out.to + ' (body is ' + bodyStart + '..' + bodyEnd + ')')
    process.exit(2)
  }
  if (out.from > bodyStart) {
    const line = lines[out.from - 1]
    const isBoundary = /^\s*$/.test(line) || /^\t\t(?:async\s+)?(?:function|const|let|class|\/\*|\/\/)/.test(line)
    if (!isBoundary) {
      console.error('range ' + out.name + ' starts mid-statement at line ' + out.from + ': ' + JSON.stringify(line.slice(0, 100)))
      process.exit(2)
    }
  }
  if (out.name !== source.split(/[\\/]/).pop() && existsSync(join(ROOT, 'src', out.name))) {
    console.error('refusing to overwrite existing src/' + out.name)
    process.exit(2)
  }
}
if (outs[outs.length - 1].to !== bodyEnd) {
  console.error('ranges must cover the whole body: last range ends at ' + outs[outs.length - 1].to + ', body ends at ' + bodyEnd)
  process.exit(2)
}

const newline = text.includes('\r\n') ? '\r\n' : '\n'
// Keep the fragment's own indentation on both markers (fragments sit two tabs deep
// inside the factory closure).
const indent = /^\s*/.exec(lines[markers[0].index])[0]
console.log('split ' + source + ' (region "' + region + '", body ' + bodyStart + '..' + bodyEnd + ')')
for (const out of outs) {
  const slice = body.slice(out.from - bodyStart, out.to - bodyStart + 1)
  const chunk = indent + '//#region ' + region + newline + slice.join('') + indent + '//#endregion' + newline
  console.log('  ' + out.name.padEnd(34) + String(slice.length).padStart(6) + ' lines  ' + out.from + '..' + out.to)
  if (apply) writeFileSync(join(ROOT, 'src', out.name), chunk)
}
if (!apply) {
  console.log('\ndry run: nothing written; re-run with --apply')
  process.exit(0)
}
if (replace) {
  const sourceName = source.split(/[\\/]/).pop()
  if (outs.some((out) => out.name === sourceName)) {
    console.log('rewrote ' + source + ' as the first chunk')
  } else {
    const { rmSync } = await import('node:fs')
    rmSync(sourcePath)
    console.log('removed ' + source + ' (its content now lives in the listed outputs)')
  }
}
console.log('\nnext:')
console.log('  1. tools/build.mjs  FRAGMENTS: replace the old entry with the new names, in this order')
console.log('     ' + outs.map((out) => "'" + out.name + "'").join(', '))
console.log('  2. ARCHITECTURE.md fragment table: add a row per new file (structure.mjs --strict requires it)')
console.log('  3. node tools/build.mjs && node tools/deps.mjs   (regenerate the reviewed baseline)')
console.log('  4. node tools/structure.mjs --strict && node tools/test.mjs')
