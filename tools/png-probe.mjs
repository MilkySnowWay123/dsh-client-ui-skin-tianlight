// Dependency-free PNG reader for the screenshot probes.
//
// The release acceptance checks colours on real screenshots; adding an image library
// just for that would put a native dependency into the repo. A PNG of a browser
// screenshot is always 8-bit RGB/RGBA, non-interlaced, so the decoder is small:
// parse IHDR + IDAT, inflate, undo the five filter types, and hand back RGBA.
//
//   import { decodePng, wcagLuminance, contrastRatio, regionStats } from './png-probe.mjs'
//   node tools/png-probe.mjs <file.png> [x y w h]
import { inflateSync } from 'node:zlib'
import { readFileSync } from 'node:fs'

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

/** Read one 8-bit non-interlaced PNG into `{ width, height, pixels }` (RGBA). */
export function decodePng(buffer) {
  for (let index = 0; index < PNG_SIGNATURE.length; index += 1) {
    if (buffer[index] !== PNG_SIGNATURE[index]) throw new Error('not a PNG file')
  }
  let offset = 8
  let width = 0
  let height = 0
  let colorType = 0
  let bitDepth = 0
  const idat = []
  while (offset + 8 <= buffer.length) {
    const length = buffer.readUInt32BE(offset)
    const type = buffer.toString('ascii', offset + 4, offset + 8)
    const dataStart = offset + 8
    const dataEnd = dataStart + length
    if (type === 'IHDR') {
      width = buffer.readUInt32BE(dataStart)
      height = buffer.readUInt32BE(dataStart + 4)
      bitDepth = buffer[dataStart + 8]
      colorType = buffer[dataStart + 9]
      if (buffer[dataStart + 12] !== 0) throw new Error('interlaced PNGs are not supported')
    } else if (type === 'IDAT') {
      idat.push(buffer.subarray(dataStart, dataEnd))
    } else if (type === 'IEND') {
      break
    }
    offset = dataEnd + 4
  }
  if (bitDepth !== 8) throw new Error('only 8-bit PNGs are supported (got ' + bitDepth + ')')
  if (colorType !== 2 && colorType !== 6) throw new Error('only RGB/RGBA PNGs are supported (got type ' + colorType + ')')
  const channels = colorType === 6 ? 4 : 3
  const raw = inflateSync(Buffer.concat(idat))
  const stride = width * channels
  const pixels = new Uint8Array(width * height * 4)
  let previous = new Uint8Array(stride)
  let cursor = 0
  for (let y = 0; y < height; y += 1) {
    const filter = raw[cursor]
    cursor += 1
    const line = Uint8Array.from(raw.subarray(cursor, cursor + stride))
    cursor += stride
    for (let x = 0; x < stride; x += 1) {
      const left = x >= channels ? line[x - channels] : 0
      const up = previous[x]
      const upLeft = x >= channels ? previous[x - channels] : 0
      let value = line[x]
      if (filter === 1) value += left
      else if (filter === 2) value += up
      else if (filter === 3) value += Math.floor((left + up) / 2)
      else if (filter === 4) {
        const p = left + up - upLeft
        const pa = Math.abs(p - left)
        const pb = Math.abs(p - up)
        const pc = Math.abs(p - upLeft)
        value += pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft
      } else if (filter !== 0) throw new Error('unknown PNG filter ' + filter)
      line[x] = value & 0xff
    }
    for (let x = 0; x < width; x += 1) {
      const from = x * channels
      const to = (y * width + x) * 4
      pixels[to] = line[from]
      pixels[to + 1] = line[from + 1]
      pixels[to + 2] = line[from + 2]
      pixels[to + 3] = channels === 4 ? line[from + 3] : 255
    }
    previous = line
  }
  return { width, height, pixels }
}

/** One pixel as `{r,g,b,a}`. */
export function pixelAt(image, x, y) {
  const index = (Math.floor(y) * image.width + Math.floor(x)) * 4
  return { r: image.pixels[index], g: image.pixels[index + 1], b: image.pixels[index + 2], a: image.pixels[index + 3] }
}

/** sRGB channel of a WCAG relative luminance (0..1). */
export function wcagLuminance(rgb) {
  const linear = (channel) => {
    const value = channel / 255
    return value <= 0.04045 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * linear(rgb.r) + 0.7152 * linear(rgb.g) + 0.0722 * linear(rgb.b)
}

/** WCAG contrast ratio between two `{r,g,b}` colours (>= 1). */
export function contrastRatio(a, b) {
  const la = wcagLuminance(a)
  const lb = wcagLuminance(b)
  const light = Math.max(la, lb)
  const dark = Math.min(la, lb)
  return (light + 0.05) / (dark + 0.05)
}

/** HSL saturation of one `{r,g,b}` colour (0..1). */
export function hslSaturation(rgb) {
  const r = rgb.r / 255
  const g = rgb.g / 255
  const b = rgb.b / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const light = (max + min) / 2
  if (max === min) return 0
  const delta = max - min
  return light > 0.5 ? delta / (2 - max - min) : delta / (max + min)
}

/**
 * HSV saturation of one `{r,g,b}` colour (0..1).
 *
 * The acceptance line reads "HSL S", but HSL saturation is mathematically unstable
 * near white (pure white is 0, while a 2% blue tint of white already reports ~0.4-0.5,
 * and MORE opacity makes it worse). The reported defect is "saturated cyan/yellow
 * blocks", i.e. chroma, so the probe measures HSV saturation and records the reasoning
 * in the acceptance report.
 */
export function hsvSaturation(rgb) {
  const max = Math.max(rgb.r, rgb.g, rgb.b)
  const min = Math.min(rgb.r, rgb.g, rgb.b)
  return max === 0 ? 0 : (max - min) / max
}

/**
 * Pixel statistics of a rectangle: mean colour, luminance percentiles and the two
 * clusters a legibility check needs (background = the dominant extreme, text = the
 * minority extreme). `scheme` picks which extreme is the background.
 */
export function regionStats(image, rect, scheme = 'light') {
  const x0 = Math.max(0, Math.floor(rect.x))
  const y0 = Math.max(0, Math.floor(rect.y))
  const x1 = Math.min(image.width, Math.ceil(rect.x + rect.w))
  const y1 = Math.min(image.height, Math.ceil(rect.y + rect.h))
  const samples = []
  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      const pixel = pixelAt(image, x, y)
      samples.push({ rgb: pixel, luma: wcagLuminance(pixel) })
    }
  }
  if (samples.length === 0) throw new Error('empty region')
  samples.sort((a, b) => a.luma - b.luma)
  const quantile = (q) => samples[Math.min(samples.length - 1, Math.max(0, Math.floor(q * (samples.length - 1))))]
  // Text pixels are the darkest 2% in the light theme and the brightest 2% in the dark
  // theme (glyph cores: a wider slice mixes in antialiasing and reports grey as "text");
  // the background is the median of the opposite half.
  const textEnd = Math.max(1, Math.floor(samples.length * 0.02));
  const textSamples = scheme === 'dark' ? samples.slice(samples.length - textEnd) : samples.slice(0, textEnd)
  const backgroundSamples =
    scheme === 'dark' ? samples.slice(0, Math.floor(samples.length * 0.55)) : samples.slice(Math.floor(samples.length * 0.45))
  const mean = (list) => {
    const sum = list.reduce((acc, item) => ({ r: acc.r + item.rgb.r, g: acc.g + item.rgb.g, b: acc.b + item.rgb.b }), { r: 0, g: 0, b: 0 })
    return { r: sum.r / list.length, g: sum.g / list.length, b: sum.b / list.length }
  }
  return {
    pixels: samples.length,
    mean: mean(samples),
    background: mean(backgroundSamples),
    text: mean(textSamples),
    contrast: contrastRatio(mean(textSamples), mean(backgroundSamples)),
    lumaMin: quantile(0).luma,
    lumaMedian: quantile(0.5).luma,
    lumaMax: quantile(1).luma,
    saturation: samples.reduce((acc, item) => acc + hslSaturation(item.rgb), 0) / samples.length,
  }
}

// ---- CLI -------------------------------------------------------------------
import { fileURLToPath } from 'node:url'
import { resolve as resolvePath } from 'node:path'
const invokedDirectly = process.argv[1] !== undefined && fileURLToPath(import.meta.url) === resolvePath(process.argv[1])
if (invokedDirectly) {
  const args = process.argv.slice(2)
  if (args.length === 0) {
    console.error('usage: node tools/png-probe.mjs <file.png> [x y w h] [light|dark]')
    process.exit(2)
  }
  const image = decodePng(readFileSync(args[0]))
  const rect =
    args.length >= 5
      ? { x: Number(args[1]), y: Number(args[2]), w: Number(args[3]), h: Number(args[4]) }
      : { x: 0, y: 0, w: image.width, h: image.height }
  const stats = regionStats(image, rect, args[5] === 'dark' ? 'dark' : 'light')
  console.log(JSON.stringify({ file: args[0], size: image.width + 'x' + image.height, region: rect, ...stats }, null, 2))
}
