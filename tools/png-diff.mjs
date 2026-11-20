// Pixel comparison for the v2.3.0 dark-parity acceptance.
//
//   node tools/png-diff.mjs <a.png> <b.png> [--threshold 8] [--write <diff.png>] [--ignore x,y,w,h]
//
// Counts pixels whose largest per-channel difference exceeds `threshold` (8/255 keeps
// JPEG-free PNG antialiasing out of the count) and prints the percentage of the frame.
// `--ignore` excludes a rectangle (e.g. the new scheme toggle that did not exist in the
// baseline build) from both the count and the written diff map.
//
// Uses tools/png-probe.mjs for decoding and a tiny PNG writer for the diff map, so the
// tool stays dependency-free.
import { deflateSync } from 'node:zlib'
import { readFileSync, writeFileSync } from 'node:fs'
import { decodePng } from './png-probe.mjs'

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()
function crc32(buffer) {
  let crc = 0xffffffff
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

/** Encode RGBA pixels as a PNG (8-bit, filter 0 rows). */
function encodePng(width, height, pixels) {
  const stride = width * 4
  const raw = Buffer.alloc((stride + 1) * height)
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0
    Buffer.from(pixels.buffer, pixels.byteOffset + y * stride, stride).copy(raw, y * (stride + 1) + 1)
  }
  const chunk = (type, data) => {
    const length = Buffer.alloc(4)
    length.writeUInt32BE(data.length)
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
    const crc = Buffer.alloc(4)
    crc.writeUInt32BE(crc32(body) >>> 0)
    return Buffer.concat([length, body, crc])
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const [aPath, bPath] = process.argv.slice(2)
if (aPath === undefined || bPath === undefined) {
  console.error('usage: node tools/png-diff.mjs <a.png> <b.png> [--threshold N] [--write out.png] [--ignore x,y,w,h]')
  process.exit(2)
}
const valueOf = (flag, fallback) => {
  const index = process.argv.indexOf(flag)
  return index >= 0 && process.argv[index + 1] !== undefined ? process.argv[index + 1] : fallback
}
const threshold = Number(valueOf('--threshold', '8'))
const outPath = valueOf('--write', null)
const ignoreArg = valueOf('--ignore', null)
const ignore =
  ignoreArg === null
    ? null
    : (() => {
        const [x, y, w, h] = ignoreArg.split(',').map(Number)
        return { x, y, w, h }
      })()

const a = decodePng(readFileSync(aPath))
const b = decodePng(readFileSync(bPath))
if (a.width !== b.width || a.height !== b.height) {
  console.error('size mismatch: ' + a.width + 'x' + a.height + ' vs ' + b.width + 'x' + b.height)
  process.exit(1)
}

const diff = new Uint8Array(a.width * a.height * 4)
let differing = 0
let ignored = 0
let maxDelta = 0
for (let y = 0; y < a.height; y += 1) {
  for (let x = 0; x < a.width; x += 1) {
    const index = (y * a.width + x) * 4
    const dr = Math.abs(a.pixels[index] - b.pixels[index])
    const dg = Math.abs(a.pixels[index + 1] - b.pixels[index + 1])
    const db = Math.abs(a.pixels[index + 2] - b.pixels[index + 2])
    const delta = Math.max(dr, dg, db)
    if (delta > maxDelta) maxDelta = delta
    const insideIgnore =
      ignore !== null && x >= ignore.x && x < ignore.x + ignore.w && y >= ignore.y && y < ignore.y + ignore.h
    if (insideIgnore) {
      if (delta > threshold) ignored += 1
      diff[index] = 0
      diff[index + 1] = 0
      diff[index + 2] = 0
    } else if (delta > threshold) {
      differing += 1
      diff[index] = 255
      diff[index + 1] = 0
      diff[index + 2] = 40
    } else {
      // Dim the identical content so the red pixels stand out in the evidence image.
      diff[index] = Math.round(a.pixels[index] * 0.25)
      diff[index + 1] = Math.round(a.pixels[index + 1] * 0.25)
      diff[index + 2] = Math.round(a.pixels[index + 2] * 0.25)
    }
    diff[index + 3] = 255
  }
}

if (outPath !== null) writeFileSync(outPath, encodePng(a.width, a.height, diff))

const total = a.width * a.height
console.log(
  JSON.stringify(
    {
      a: aPath,
      b: bPath,
      size: a.width + 'x' + a.height,
      threshold,
      ignored: ignored === 0 ? null : { rect: ignore, pixels: ignored },
      differing,
      differingPercent: Number(((differing / total) * 100).toFixed(4)),
      maxDelta,
      diffImage: outPath,
    },
    null,
    2,
  ),
)
process.exitCode = differing / total <= 0.005 ? 0 : 1
