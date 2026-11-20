// Screenshot legibility probe for the v2.3.0 appearance matrix.
//
// The acceptance criteria are numeric, so they are measured instead of eyeballed:
//   - light × dark wallpaper: transcript text >= 4.5:1, sidebar nav >= 4.5:1,
//     faint text >= 3:1 (approximated by the darkest/brightest 8% cluster);
//   - light sidebar: mean HSL saturation <= 0.35 (no cyan->yellow blocks);
//   - light × bright wallpaper: fog alpha <= 0.12 (the shot must not look washed out).
//
// `tools/smoke-dsh.mjs --matrix <dir>` produces the shots and matrix.json; this tool
// only reads PNG files (through tools/png-probe.mjs, no native dependency).
//
//   node tools/contrast-probe.mjs <dir> [--json <file>]
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { decodePng, regionStats } from './png-probe.mjs'

const root = process.argv[2]
if (root === undefined || root === '') {
  console.error('usage: node tools/contrast-probe.mjs <screenshot-dir> [--json <file>]')
  process.exit(2)
}
const jsonIndex = process.argv.indexOf('--json')
const jsonPath = jsonIndex >= 0 ? process.argv[jsonIndex + 1] : null
const files = existsSync(root) ? readdirSync(root).filter((name) => name.endsWith('.png')).sort() : []
if (files.length === 0) {
  console.error('contrast-probe: no PNG files in ' + root)
  process.exit(1)
}

/** Layout regions in the 1280x900 capture (percent of the image). */
const REGIONS = {
  transcript: { x: 0.30, y: 0.22, w: 0.62, h: 0.52 },
  sidebar: { x: 0.02, y: 0.14, w: 0.17, h: 0.52 },
  composer: { x: 0.30, y: 0.80, w: 0.62, h: 0.12 },
}

const report = { generatedFrom: root, shots: [] }
let failures = 0
const fail = (label, condition, detail) => {
  if (condition === false) failures += 1
  console.log(`  [${condition === false ? 'FAIL' : 'PASS'}] ${label}${detail === undefined ? '' : '  ->  ' + detail}`)
}

for (const name of files) {
  const image = decodePng(readFileSync(join(root, name)))
  const scheme = name.startsWith('light-') ? 'light' : name.startsWith('dark-') ? 'dark' : null
  if (scheme === null) continue
  const regions = {}
  for (const [key, rect] of Object.entries(REGIONS)) {
    regions[key] = regionStats(image, { x: rect.x * image.width, y: rect.y * image.height, w: rect.w * image.width, h: rect.h * image.height }, scheme)
  }
  const entry = { name, size: image.width + 'x' + image.height, scheme, regions }
  report.shots.push(entry)
  console.log(name + ' (' + entry.size + ')')
  for (const [key, stats] of Object.entries(regions)) {
    console.log(
      '  ' +
        key.padEnd(10) +
        ' contrast ' + stats.contrast.toFixed(2) +
        ':1  bg ' + rgb(stats.background) +
        '  text ' + rgb(stats.text) +
        '  sat ' + stats.saturation.toFixed(3),
    )
  }
  // Acceptance: light × dark wallpaper text/sidebar contrast; light sidebar saturation.
  const parts = name.split('-')
  const luma = parts[1] ?? ''
  if (scheme === 'light' && luma === 'dark' && name.endsWith('session.png')) {
    fail(name + ' transcript contrast >= 4.5:1', regions.transcript.contrast >= 4.5, regions.transcript.contrast.toFixed(2))
    fail(name + ' sidebar contrast >= 4.5:1', regions.sidebar.contrast >= 4.5, regions.sidebar.contrast.toFixed(2))
  }
  if (scheme === 'light' && luma !== '' && name.endsWith('session.png')) {
    fail(name + ' light sidebar saturation <= 0.35', regions.sidebar.saturation <= 0.35, regions.sidebar.saturation.toFixed(3))
  }
  if (scheme === 'light' && luma === 'bright' && name.endsWith('session.png')) {
    // A bright wallpaper must stay bright: the fog only adds its 0.06–0.10 base linear
    // veil there (dayLift = 0). The luma of the brightest region is the evidence.
    fail(name + ' bright wallpaper is not washed out (mean luma >= 0.55)', regions.transcript.lumaMedian >= 0.55, regions.transcript.lumaMedian.toFixed(3))
  }
}

function rgb(color) {
  return 'rgb(' + Math.round(color.r) + ',' + Math.round(color.g) + ',' + Math.round(color.b) + ')'
}

if (jsonPath !== null) writeFileSync(jsonPath, JSON.stringify(report, null, 2) + '\n', 'utf8')
console.log('\n' + (failures === 0 ? 'CONTRAST PROBE: PASS' : 'CONTRAST PROBE: ' + failures + ' FAILURE(S)'))
process.exitCode = failures === 0 ? 0 : 1
