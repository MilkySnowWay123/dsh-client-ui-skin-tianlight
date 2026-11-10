// Pre-cropped static-frame cache behind `_frame-cache` (v0.5.0 contract §6, A5).
//
// The browser half draws one frame of the current wallpaper, re-encodes it at the
// window's aspect ratio and PUTs the bytes here. On the next page load that image
// is the instant pre-paint layer under the video, which removes the expensive
// first-paint downscale from a 4K source.
//
// This is a cache, not a media library:
//   - keys are opaque tokens (`^[a-z0-9._-]{1,120}$`), never paths;
//   - 8 MB per entry, 256 MB total, oldest-mtime eviction;
//   - the content type is sniffed from the bytes, not trusted from the request:
//     keys carry no extension and a `.webp` label on PNG bytes would be served
//     with the wrong type;
//   - atomic tmp+rename, so a half-written frame is never a cache hit.
//
// The cache directory is `<plugin>/state/frame-cache/` (gitignored). Losing it is
// harmless: the next wallpaper application repopulates it.

import { closeSync, createWriteStream, mkdirSync, openSync, readSync, readdirSync, renameSync, statSync, unlinkSync, writeFileSync } from 'node:fs'
import { join, resolve, sep } from 'node:path'
import { FRAME_CACHE_DIR } from './host-paths.js'
import { pipeFile, sendJson, sendText } from './http-media.js'

/** Contract §6: 8 MB per frame. */
export const MAX_FRAME_BYTES = 8 * 1024 * 1024
/** LRU-ish total budget for the whole cache directory. */
export const MAX_FRAME_CACHE_BYTES = 256 * 1024 * 1024
/** Contract §6 key policy. */
export const FRAME_CACHE_KEY_RE = /^[a-z0-9._-]{1,120}$/
const FRAME_TYPES = new Set(['image/webp', 'image/png', 'image/jpeg'])
const TEMP_PREFIX = '.part-'
const STALE_TEMP_MS = 10 * 60 * 1000

export function validCacheKey(key) {
  return typeof key === 'string' && FRAME_CACHE_KEY_RE.test(key)
}

/** Browsers only ever store these three encodings; sniffing beats trusting headers. */
export function sniffImageType(header) {
  if (Buffer.isBuffer(header) === false || header.length < 12) return null
  if (header.subarray(0, 4).toString('ascii') === 'RIFF' && header.subarray(8, 12).toString('ascii') === 'WEBP') {
    return 'image/webp'
  }
  if (header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4e && header[3] === 0x47) return 'image/png'
  if (header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff) return 'image/jpeg'
  return null
}

function readHead(filePath, length) {
  let fd
  try {
    fd = openSync(filePath, 'r')
    const buffer = Buffer.alloc(length)
    const read = readSync(fd, buffer, 0, length, 0)
    return buffer.subarray(0, read)
  } catch {
    return null
  } finally {
    if (fd !== undefined) {
      try {
        closeSync(fd)
      } catch {
        // descriptor already closed
      }
    }
  }
}

/** One cache directory. A class (not module globals) so tests never touch state/. */
export class FrameCache {
  constructor(options = {}) {
    this.dir = typeof options.dir === 'string' ? options.dir : FRAME_CACHE_DIR
    const maxBytes = Number(options.maxBytes)
    this.maxBytes = Number.isSafeInteger(maxBytes) && maxBytes > 0 ? maxBytes : MAX_FRAME_CACHE_BYTES
    this.hits = 0
    this.misses = 0
  }

  /** Resolve one key to a file inside the cache dir, or null. */
  filePath(key) {
    if (validCacheKey(key) === false) return null
    const base = resolve(this.dir)
    const full = resolve(base, key)
    return full.startsWith(base + sep) ? full : null
  }

  lookup(key) {
    const filePath = this.filePath(key)
    if (filePath === null) return null
    try {
      const info = statSync(filePath)
      if (info.isFile() === false) return null
      return { path: filePath, size: info.size, mtimeMs: info.mtimeMs }
    } catch {
      return null
    }
  }

  noteHit() {
    this.hits += 1
  }

  noteMiss() {
    this.misses += 1
  }

  /** Files only: `.part-` temporaries are not entries. */
  list() {
    let names = []
    try {
      names = readdirSync(this.dir)
    } catch {
      return []
    }
    const entries = []
    for (const name of names) {
      if (name.startsWith(TEMP_PREFIX) || validCacheKey(name) === false) continue
      const filePath = join(this.dir, name)
      try {
        const info = statSync(filePath)
        if (info.isFile() === false) continue
        entries.push({ key: name, path: filePath, size: info.size, mtimeMs: info.mtimeMs })
      } catch {
        continue
      }
    }
    return entries
  }

  measure() {
    let entries = 0
    let bytes = 0
    for (const entry of this.list()) {
      entries += 1
      bytes += entry.size
    }
    return { entries, bytes }
  }

  status() {
    const measured = this.measure()
    return {
      entries: measured.entries,
      bytes: measured.bytes,
      hits: this.hits,
      misses: this.misses,
      maxBytes: this.maxBytes,
    }
  }

  /** Delete oldest entries until the directory fits the budget. */
  prune() {
    let entries = []
    try {
      entries = this.list()
    } catch {
      entries = []
    }
    this.removeStaleTemps()
    let total = entries.reduce((sum, entry) => sum + entry.size, 0)
    if (total <= this.maxBytes) return { removed: 0, bytes: 0 }
    entries.sort((a, b) => a.mtimeMs - b.mtimeMs)
    let removed = 0
    let freed = 0
    for (const entry of entries) {
      if (total <= this.maxBytes) break
      try {
        unlinkSync(entry.path)
        total -= entry.size
        removed += 1
        freed += entry.size
      } catch {
        // another request may have removed it first
      }
    }
    return { removed, bytes: freed }
  }

  removeStaleTemps() {
    let names = []
    try {
      names = readdirSync(this.dir)
    } catch {
      return
    }
    const cutoff = Date.now() - STALE_TEMP_MS
    for (const name of names) {
      if (name.startsWith(TEMP_PREFIX) === false) continue
      const filePath = join(this.dir, name)
      try {
        if (statSync(filePath).mtimeMs > cutoff) continue
        unlinkSync(filePath)
      } catch {
        // raced with another cleanup
      }
    }
  }

  /** Small synchronous write (tests, fixtures). Production streams through HTTP. */
  writeBuffer(key, buffer) {
    const finalPath = this.filePath(key)
    if (finalPath === null) return null
    mkdirSync(this.dir, { recursive: true })
    const tempPath = join(
      this.dir,
      TEMP_PREFIX + process.pid + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6),
    )
    try {
      writeFileSync(tempPath, buffer)
      renameSync(tempPath, finalPath)
      this.prune()
      return { path: finalPath, bytes: buffer.length }
    } catch {
      try {
        unlinkSync(tempPath)
      } catch {
        // never created, or already renamed
      }
      return null
    }
  }

  commitTemp(key, tempPath) {
    const finalPath = this.filePath(key)
    if (finalPath === null) return null
    let size = 0
    try {
      size = statSync(tempPath).size
      renameSync(tempPath, finalPath)
    } catch {
      return null
    }
    this.prune()
    return { path: finalPath, bytes: size }
  }

  clear() {
    let cleared = 0
    let bytes = 0
    let names = []
    try {
      names = readdirSync(this.dir)
    } catch {
      return { cleared, bytes }
    }
    for (const name of names) {
      const isTemp = name.startsWith(TEMP_PREFIX)
      if (isTemp === false && validCacheKey(name) === false) continue
      const filePath = join(this.dir, name)
      try {
        const info = statSync(filePath)
        if (info.isFile() === false) continue
        unlinkSync(filePath)
        cleared += 1
        bytes += info.size
      } catch {
        // raced with another cleanup
      }
    }
    return { cleared, bytes }
  }
}

export const frameCache = new FrameCache()

function sendCached(req, res, key, cache) {
  const hit = cache.lookup(key)
  if (hit === null) {
    cache.noteMiss()
    sendJson(res, 404, { ok: false, error: 'cache miss' })
    return
  }
  const type = sniffImageType(readHead(hit.path, 16) ?? Buffer.alloc(0))
  if (type === null) {
    // A corrupt entry must not be served forever; drop it and report a miss.
    try {
      unlinkSync(hit.path)
    } catch {
      // another request removed it first
    }
    cache.noteMiss()
    sendJson(res, 404, { ok: false, error: 'cache miss' })
    return
  }
  cache.noteHit()
  const etag = '"' + hit.size.toString(16) + '-' + Math.floor(hit.mtimeMs).toString(16) + '"'
  const headers = {
    'content-type': type,
    'content-length': hit.size,
    'cache-control': 'public, max-age=31536000, immutable',
    etag,
  }
  if (req.headers['if-none-match'] === etag) {
    res.writeHead(304, headers)
    res.end()
    return
  }
  res.writeHead(200, headers)
  if (req.method === 'HEAD') {
    res.end()
    return
  }
  pipeFile(res, hit.path)
}

/**
 * POST `_frame-cache?key=`: raw image bytes, streamed to a temp file while the
 * 8 MB cap and the magic bytes are checked. Nothing enters the directory unless
 * the whole body arrived and decoded as a supported image.
 *
 * Status policy: unsupported declared Content-Type -> 415; everything else that
 * is the client's fault (empty body, junk bytes, declared/actual type mismatch,
 * oversized frame) -> 400/413. A 500 is reserved for storage failures.
 */
function discard(req) {
  try {
    if (typeof req.resume === 'function') req.resume()
  } catch {
    // request already finished
  }
}

function receiveFrame(req, res, key, cache) {
  const rawType = String(req.headers?.['content-type'] ?? '').toLowerCase()
  const type = rawType.split(';')[0].trim()
  const typeAccepted = type === '' || type === 'application/octet-stream' || FRAME_TYPES.has(type)
  if (typeAccepted === false) {
    sendJson(res, 415, { ok: false, error: 'content type must be image/webp, image/png or image/jpeg' })
    discard(req)
    return
  }
  const declared = Number(req.headers?.['content-length'])
  if (Number.isFinite(declared) && declared > MAX_FRAME_BYTES) {
    sendJson(res, 413, { ok: false, error: 'frame is too large (max 8 MB)' })
    discard(req)
    return
  }
  const finalPath = cache.filePath(key)
  if (finalPath === null) {
    sendJson(res, 400, { ok: false, error: 'invalid cache key' })
    discard(req)
    return
  }
  try {
    mkdirSync(cache.dir, { recursive: true })
  } catch {
    sendJson(res, 500, { ok: false, error: 'cannot create the frame cache directory' })
    return
  }
  const tempPath = join(
    cache.dir,
    TEMP_PREFIX + process.pid + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6),
  )
  const out = createWriteStream(tempPath, { flags: 'wx' })
  let size = 0
  let head = Buffer.alloc(0)
  let settled = false
  const cleanup = () => {
    try {
      unlinkSync(tempPath)
    } catch {
      // never created, or already renamed
    }
  }
  const settle = (status, value) => {
    if (settled) return
    settled = true
    if (status !== 200) cleanup()
    sendJson(res, status, value)
  }

  req.on('data', (chunk) => {
    if (settled) return
    size += chunk.length
    if (head.length < 16) head = Buffer.concat([head, chunk.subarray(0, 16 - head.length)])
    if (size > MAX_FRAME_BYTES) {
      settled = true
      try {
        req.unpipe(out)
      } catch {
        // pipe already torn down, or a non-stream request shape
      }
      out.destroy()
      cleanup()
      sendJson(res, 413, { ok: false, error: 'frame is too large (max 8 MB)' })
      discard(req)
    }
  })
  req.on('aborted', () => {
    if (settled) return
    settled = true
    out.destroy()
    cleanup()
  })
  req.on('error', () => {
    if (settled) return
    settled = true
    out.destroy()
    cleanup()
  })
  out.on('error', () => settle(500, { ok: false, error: 'cannot write the frame cache entry' }))
  out.on('finish', () => {
    if (settled) return
    if (size === 0) {
      settle(400, { ok: false, error: 'empty frame' })
      return
    }
    const actual = sniffImageType(head)
    if (actual === null) {
      settle(400, { ok: false, error: 'body is not a webp/png/jpeg image' })
      return
    }
    if (type !== '' && type !== 'application/octet-stream' && type !== actual) {
      settle(400, { ok: false, error: 'content type does not match the image bytes' })
      return
    }
    let bytes = 0
    try {
      bytes = statSync(tempPath).size
      renameSync(tempPath, finalPath)
    } catch {
      settle(500, { ok: false, error: 'cannot commit the frame cache entry' })
      return
    }
    cache.prune()
    settled = true
    sendJson(res, 200, { ok: true, key, bytes, type: actual })
  })
  if (typeof req.pipe === 'function') {
    req.pipe(out)
  } else {
    // The route verification harness drives handlers with a bare EventEmitter
    // request; forward its signals into the same write stream so both shapes
    // produce identical validation and status codes.
    req.on('data', (chunk) => {
      if (settled) return
      try {
        out.write(chunk)
      } catch {
        // the cap handler already settled
      }
    })
    req.on('end', () => {
      if (settled) return
      out.end()
    })
  }
}

/** `_frame-cache` (GET/HEAD/POST/DELETE). */
export function handleFrameCache(req, res, url, cache = frameCache) {
  const method = req.method
  if (method === 'DELETE') {
    const result = cache.clear()
    sendJson(res, 200, { ok: true, cleared: result.cleared, bytes: result.bytes })
    return
  }
  const key = url?.searchParams?.get('key') ?? null
  if (validCacheKey(key) === false) {
    sendJson(res, 400, { ok: false, error: 'key must match ^[a-z0-9._-]{1,120}$' })
    discard(req)
    return
  }
  if (method === 'GET' || method === 'HEAD') {
    sendCached(req, res, key, cache)
    return
  }
  if (method === 'POST') {
    receiveFrame(req, res, key, cache)
    return
  }
  sendText(res, 405, 'method not allowed')
}

/** `_frame-cache/status` (GET/HEAD). */
export function handleFrameCacheStatus(req, res, cache = frameCache) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    sendText(res, 405, 'method not allowed')
    return
  }
  if (req.method === 'HEAD') {
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
    res.end()
    return
  }
  sendJson(res, 200, cache.status())
}

/** Convenience for `_engines`: `{entries, bytes, hits, misses, maxBytes}`. */
export function frameCacheStatus() {
  return frameCache.status()
}
