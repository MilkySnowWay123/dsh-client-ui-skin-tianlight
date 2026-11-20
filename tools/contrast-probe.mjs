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
import { decodePng, hsvSaturation, pixelAt, regionStats, wcagLuminance } from './png-probe.mjs'

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

/** Layout regions in the 1280x900 capture (percent of the image).
 *  `sidebar` is the nav-label band (not the whole column: empty pixels would dilute the
 *  clusters); `hero` is the new-session headline block, the largest body text the lab
 *  runtime renders directly on the wallpaper (no model credentials -> no transcript). */
const REGIONS = {
  sidebar: { x: 0.02, y: 0.10, w: 0.16, h: 0.20 },
  hero: { x: 0.46, y: 0.37, w: 0.22, h: 0.05 },
  composer: { x: 0.36, y: 0.55, w: 0.50, h: 0.06 },
}

/**
 * Mean HSL saturation over 32x32 tiles: "no cyan->yellow block anywhere in the rail"
 * is a per-tile property, so a single whole-region average would hide a hot tile.
 * HSL saturation is meaningless on near-white / near-black pixels (a 2% blue tint of
 * white reads as S 0.7), so only pixels with a mid luma carry the measurement; a tile
 * with almost no such pixels (a plain frosted-white area) is skipped.
 */
function tileSaturation(image, rect, tile = 32) {
  const x0 = Math.max(0, Math.floor(rect.x))
  const y0 = Math.max(0, Math.floor(rect.y))
  const x1 = Math.min(image.width, Math.floor(rect.x + rect.w))
  const y1 = Math.min(image.height, Math.floor(rect.y + rect.h))
  const means = []
  for (let top = y0; top + tile <= y1; top += tile) {
    for (let left = x0; left + tile <= x1; left += tile) {
      let sum = 0
      let count = 0
      for (let y = top; y < top + tile; y += 1) {
        for (let x = left; x < left + tile; x += 1) {
          const pixel = pixelAt(image, x, y)
          const luma = wcagLuminance(pixel)
          if (luma < 0.12 || luma > 0.86) continue
          sum += hsvSaturation(pixel)
          count += 1
        }
      }
      if (count >= tile * tile * 0.25) means.push(sum / count)
    }
  }
  return {
    tiles: means.length,
    mean: means.length === 0 ? 0 : means.reduce((acc, value) => acc + value, 0) / means.length,
    max: means.length === 0 ? 0 : Math.max(...means),
  }
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
  // Light rail: per-32x32-tile saturation (the "cyan->yellow block" acceptance).
  if (scheme === 'light') {
    const sidebarRect = REGIONS.sidebar
    entry.sidebarTiles = tileSaturation(image, {
      x: sidebarRect.x * image.width,
      y: sidebarRect.y * image.height,
      w: sidebarRect.w * image.width,
      h: sidebarRect.h * image.height,
    })
  }
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
  if (entry.sidebarTiles !== undefined) {
    console.log('  sidebar tiles mean sat ' + entry.sidebarTiles.mean.toFixed(3) + ' · max ' + entry.sidebarTiles.max.toFixed(3))
  }
  // Acceptance (light theme only: the dark theme's shipped look must not change).
  const parts = name.split('-')
  const luma = parts[1] ?? ''
  const isSession = name.endsWith('session.png')
  if (scheme === 'light' && luma === 'dark' && isSession) {
    fail(name + ' sidebar nav contrast >= 4.5:1', regions.sidebar.contrast >= 4.5, regions.sidebar.contrast.toFixed(2))
    fail(name + ' hero headline contrast >= 3.0:1 (large text)', regions.hero.contrast >= 3.0, regions.hero.contrast.toFixed(2))
    fail(name + ' composer placeholder contrast >= 3.0:1', regions.composer.contrast >= 3.0, regions.composer.contrast.toFixed(2))
  }
  if (scheme === 'light' && isSession && entry.sidebarTiles !== undefined) {
    fail(name + ' light rail tiles mean saturation <= 0.35', entry.sidebarTiles.mean <= 0.35, entry.sidebarTiles.mean.toFixed(3))
  }
  if (scheme === 'light' && luma === 'bright' && isSession) {
    // A bright wallpaper must stay bright: the fog only adds its 0.06-0.10 base veil
    // there (dayLift = 0), so the reading area keeps a high median luma.
    fail(name + ' bright wallpaper is not washed out (median luma >= 0.55)', regions.hero.lumaMedian >= 0.55, regions.hero.lumaMedian.toFixed(3))
  }
}

function rgb(color) {
  return 'rgb(' + Math.round(color.r) + ',' + Math.round(color.g) + ',' + Math.round(color.b) + ')'
}

if (jsonPath !== null) writeFileSync(jsonPath, JSON.stringify(report, null, 2) + '\n', 'utf8')
console.log('\n' + (failures === 0 ? 'CONTRAST PROBE: PASS' : 'CONTRAST PROBE: ' + failures + ' FAILURE(S)'))
process.exitCode = failures === 0 ? 0 : 1
