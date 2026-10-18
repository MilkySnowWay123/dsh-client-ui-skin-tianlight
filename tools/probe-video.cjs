// Prints container-level facts about an MP4 without decoding: resolution, fps,
// duration, streams. Usage: node probe-video.cjs <path-to-mp4>
const fs = require('node:fs')

const file = process.argv[2]
if (!file) {
  console.error('usage: node probe-video.cjs <file.mp4>')
  process.exit(2)
}
const buf = fs.readFileSync(file)
console.log('file: ' + file)
console.log('bytes: ' + buf.length + ' (' + (buf.length / 1048576).toFixed(1) + ' MB)')

const CONTAINERS = new Set(['moov', 'trak', 'mdia', 'minf', 'stbl', 'edts', 'dinf', 'udta'])
let videoSamples = 0
let durationSec = 0
let videoSize = ''

function walk(start, end) {
  let off = start
  while (off + 8 <= end) {
    let size = buf.readUInt32BE(off)
    const type = buf.toString('latin1', off + 4, off + 8)
    let header = 8
    if (size === 1) {
      if (off + 16 > end) break
      size = Number(buf.readBigUInt64BE(off + 8))
      header = 16
    } else if (size === 0) {
      size = end - off
    }
    if (size < header || off + size > end) break
    const body = off + header
    const bodyEnd = off + size

    if (type === 'mvhd') {
      const version = buf[body]
      if (version === 0) {
        const timescale = buf.readUInt32BE(body + 12)
        const duration = buf.readUInt32BE(body + 16)
        durationSec = duration / timescale
      } else {
        const timescale = buf.readUInt32BE(body + 20)
        durationSec = Number(buf.readBigUInt64BE(body + 24)) / timescale
      }
    }
    if (type === 'stsd') {
      const count = buf.readUInt32BE(body + 4)
      let p = body + 8
      for (let i = 0; i < count && p + 16 <= bodyEnd; i++) {
        const entrySize = buf.readUInt32BE(p)
        const format = buf.toString('latin1', p + 4, p + 8)
        if (format === 'avc1' || format === 'hvc1' || format === 'hev1' || format === 'av01') {
          const w = buf.readUInt16BE(p + 32)
          const h = buf.readUInt16BE(p + 34)
          videoSize = w + 'x' + h
          console.log('video: ' + format + ' ' + videoSize)
        } else {
          console.log('stream: ' + format)
        }
        if (entrySize < 8) break
        p += entrySize
      }
    }
    if (type === 'stts') {
      const count = buf.readUInt32BE(body + 4)
      let total = 0
      let p = body + 8
      for (let i = 0; i < count && p + 8 <= bodyEnd; i++) {
        total += buf.readUInt32BE(p)
        p += 8
      }
      if (total > videoSamples) videoSamples = total
    }
    if (CONTAINERS.has(type)) walk(body, bodyEnd)
    off = bodyEnd
  }
}

walk(0, buf.length)
console.log('duration: ' + durationSec.toFixed(2) + 's')
if (videoSamples > 0 && durationSec > 0) {
  console.log('fps: ' + (videoSamples / durationSec).toFixed(1) + '  (samples ' + videoSamples + ')')
}
