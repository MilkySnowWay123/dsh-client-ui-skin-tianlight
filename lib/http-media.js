// HTTP media plumbing shared by every route family.
//
// Range/ETag/HEAD behaviour is the contract the <video> element depends on, so it
// lives in one place instead of being re-derived per route. Nothing here knows
// about wallpapers, uploads or scenes.

import { createReadStream, readFileSync, statSync } from 'node:fs'
import { MIME } from './media-types.js'

export function sendJson(res, status, value) {
  const body = JSON.stringify(value)
  res.writeHead(status, {
    'content-type': MIME['.json'],
    'content-length': Buffer.byteLength(body),
    'cache-control': 'no-store',
  })
  res.end(body)
}

export function sendText(res, status, text) {
  res.writeHead(status, {
    'content-type': 'text/plain; charset=utf-8',
    'content-length': Buffer.byteLength(text),
    'cache-control': 'no-store',
  })
  res.end(text)
}

/** Parse `bytes=start-end` against a known total size. */
export function parseRange(header, size) {
  if (typeof header !== 'string') return null
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim())
  if (match === null) return null
  const [, rawStart, rawEnd] = match
  if (rawStart === '' && rawEnd === '') return null

  let start
  let end
  if (rawStart === '') {
    const suffix = Number(rawEnd)
    if (!Number.isFinite(suffix) || suffix <= 0) return null
    start = Math.max(0, size - suffix)
    end = size - 1
  } else {
    start = Number(rawStart)
    end = rawEnd === '' ? size - 1 : Number(rawEnd)
  }
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null
  if (start > end || start >= size) return { unsatisfiable: true }
  return { start, end: Math.min(end, size - 1) }
}

/** Small text/HTML documents (engine adapter). Not range-served on purpose. */
export function serveTextFile(req, res, filePath, type, extra = {}) {
  let body
  try {
    body = readFileSync(filePath)
  } catch {
    sendText(res, 404, 'not found')
    return
  }
  res.writeHead(200, {
    'content-type': type,
    'content-length': body.length,
    'cache-control': 'no-store',
    ...extra,
  })
  if (req.method === 'HEAD') res.end()
  else res.end(body)
}

export function servePath(req, res, filePath, name, extra = {}) {
  let info
  try {
    info = statSync(filePath)
  } catch {
    sendText(res, 404, 'not found')
    return
  }
  if (!info.isFile()) {
    sendText(res, 404, 'not found')
    return
  }

  const type = MIME[name.slice(name.lastIndexOf('.')).toLowerCase()] ?? 'application/octet-stream'
  const etag = `"${info.size.toString(16)}-${Math.floor(info.mtimeMs).toString(16)}"`
  const baseHeaders = {
    'content-type': type,
    'accept-ranges': 'bytes',
    'cache-control': 'public, max-age=600',
    etag,
    ...extra,
  }

  if (req.headers['if-none-match'] === etag) {
    res.writeHead(304, baseHeaders)
    res.end()
    return
  }

  const range = parseRange(req.headers.range, info.size)
  if (range !== null && range.unsatisfiable !== true) {
    const { start, end } = range
    res.writeHead(206, {
      ...baseHeaders,
      'content-range': `bytes ${start}-${end}/${info.size}`,
      'content-length': end - start + 1,
    })
    if (req.method === 'HEAD') {
      res.end()
      return
    }
    pipeFile(res, filePath, { start, end })
    return
  }
  if (range !== null && range.unsatisfiable === true) {
    res.writeHead(416, { ...baseHeaders, 'content-range': `bytes */${info.size}` })
    res.end()
    return
  }

  res.writeHead(200, { ...baseHeaders, 'content-length': info.size })
  if (req.method === 'HEAD') {
    res.end()
    return
  }
  pipeFile(res, filePath)
}

/**
 * Streams a file into the response and owns both directions of the lifecycle.
 * Without this, a file that vanishes mid-read leaves the socket open forever and
 * a client that aborts keeps the read stream alive.
 */
export function pipeFile(res, path, options) {
  const stream = createReadStream(path, options)
  const destroy = () => {
    stream.destroy()
  }
  stream.on('error', () => {
    res.destroy()
  })
  res.on('close', destroy)
  stream.pipe(res)
}
