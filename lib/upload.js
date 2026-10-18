// Upload sink for user wallpapers.
//
// Policy, not a file browser:
//   - POST only, one file, one safe name (the client's filename is a hint, never a path);
//   - images/videos only, 512 MB hard cap enforced while streaming (a lying
//     Content-Length cannot buy extra bytes; TIANLIGHT_UPLOAD_MAX can raise/lower it);
//   - writes land in `assets/uploads/`, via `*.part-*` then rename, so a failed or
//     truncated upload never appears in the wallpaper list;
//   - never overwrites: a duplicate name gets `-1`, `-2`, ….

import { accessSync, constants, createWriteStream, existsSync, mkdirSync, readdirSync, renameSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'
import { ASSET_DIR, IMAGE_EXT, ROUTE, SAFE_NAME, VIDEO_EXT, fileSize, safeJoin } from './media-types.js'

export const UPLOAD_DIR = join(ASSET_DIR, 'uploads')
/**
 * 512 MB default: a 4K/60fps wallpaper loop routinely passes the old 128 MB cap.
 * Override with `TIANLIGHT_UPLOAD_MAX` (bytes) when a machine needs more or less;
 * the client reads the effective value from `_engines`, so both sides agree.
 */
const DEFAULT_UPLOAD_MAX = 512 * 1024 * 1024
const configuredMax = Number(process.env.TIANLIGHT_UPLOAD_MAX)
export const UPLOAD_MAX =
  Number.isFinite(configuredMax) && configuredMax >= 16 * 1024 * 1024 && configuredMax <= 4 * 1024 * 1024 * 1024
    ? Math.round(configuredMax)
    : DEFAULT_UPLOAD_MAX
export const UPLOAD_MAX_MB = Math.round(UPLOAD_MAX / (1024 * 1024))

/**
 * Normalises a client-supplied filename. Returns null instead of guessing: the
 * caller turns null into a 400, so an unsupported format is visible rather than
 * stored as an unplayable mystery file.
 *
 * Wide characters are common in 4K wallpaper names, so a name whose ASCII part is
 * empty is not rejected: the stem becomes `upload-<stamp>` and the extension (the
 * part that actually decides decodability) is kept.
 */
export function sanitizeUploadName(raw) {
  if (typeof raw !== 'string' || raw === '') return null
  let decoded = raw
  try {
    decoded = decodeURIComponent(raw)
  } catch {
    // A malformed escape stays literal and will fail the checks below.
  }
  // Both separators: a browser sends a basename, but a hand-written request may not.
  const base = decoded.split(/[\\/]/).pop() ?? ''
  const extMatch = /\.([A-Za-z0-9]{1,8})$/.exec(base)
  if (extMatch === null) return null
  const ext = '.' + extMatch[1].toLowerCase()
  if (!VIDEO_EXT.has(ext) && !IMAGE_EXT.has(ext)) return null
  const rawStem = base.slice(0, base.length - extMatch[0].length)
  let stem = rawStem.replace(/[^A-Za-z0-9._-]/g, '').replace(/^[._-]+/, '').slice(0, 80)
  if (stem === '') {
    stem = 'upload-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6)
  }
  const cleaned = stem + ext
  if (cleaned.length > 96) return null
  return SAFE_NAME.test(cleaned) ? cleaned : null
}

/** Host truth for the panel: effective cap + whether uploads can be written. */
export function uploadStatus() {
  let writable = false
  try {
    // Probe the parent when the directory does not exist yet: status checks must not
    // mutate the tree just to answer a question.
    accessSync(existsSync(UPLOAD_DIR) ? UPLOAD_DIR : ASSET_DIR, constants.W_OK)
    writable = true
  } catch {
    writable = false
  }
  return { max: UPLOAD_MAX, maxMb: UPLOAD_MAX_MB, writable }
}

/** Wallpapers this plugin received. Sorted like the local catalog: videos first. */
export function listUploads() {
  let names = []
  try {
    names = readdirSync(UPLOAD_DIR)
  } catch {
    return []
  }
  const items = []
  for (const name of names) {
    if (SAFE_NAME.test(name) === false || name.includes('.part-')) continue
    const ext = name.slice(name.lastIndexOf('.')).toLowerCase()
    const kind = VIDEO_EXT.has(ext) ? 'video' : IMAGE_EXT.has(ext) ? 'image' : null
    if (kind === null) continue
    items.push({
      id: 'uploads/' + name,
      kind,
      url: ROUTE + '/uploads/' + name,
      bytes: fileSize(join(UPLOAD_DIR, name)),
      uploaded: true,
    })
  }
  items.sort((a, b) => (a.kind === b.kind ? a.id.localeCompare(b.id) : a.kind === 'video' ? -1 : 1))
  return items
}

/** Resolve a `uploads/<name>` path, refusing anything outside the upload dir. */
export function uploadPath(name) {
  return safeJoin(UPLOAD_DIR, name)
}

function uniqueTarget(name) {
  const dot = name.lastIndexOf('.')
  const stem = name.slice(0, dot)
  const ext = name.slice(dot)
  for (let index = 0; index < 50; index += 1) {
    const candidate = index === 0 ? name : stem + '-' + index + ext
    if (existsSync(join(UPLOAD_DIR, candidate)) === false) return candidate
  }
  return null
}

/**
 * Streams one upload to disk. `respond(res, status, value)` is the route's JSON
 * writer, injected so this module never re-implements the response contract.
 */
export function receiveUpload(req, res, rawName, respond) {
  const name = sanitizeUploadName(rawName)
  if (name === null) {
    respond(res, 400, { error: 'name must be a safe image/video filename (mp4/webm/mov/m4v/png/jpg/jpeg/webp/avif/gif/svg)' })
    return
  }
  const type = String(req.headers['content-type'] ?? '').toLowerCase()
  const typeOk = type === '' || type.startsWith('video/') || type.startsWith('image/') || type.startsWith('application/octet-stream')
  if (typeOk === false) {
    respond(res, 415, { error: 'unsupported content type' })
    return
  }
  const declared = Number(req.headers['content-length'])
  if (Number.isFinite(declared) && declared > UPLOAD_MAX) {
    respond(res, 413, { error: 'file too large (max ' + UPLOAD_MAX_MB + ' MB)' })
    return
  }
  try {
    mkdirSync(UPLOAD_DIR, { recursive: true })
  } catch {
    respond(res, 500, { error: 'cannot create the upload directory' })
    return
  }
  const target = uniqueTarget(name)
  if (target === null) {
    respond(res, 409, { error: 'too many files with that name; rename and retry' })
    return
  }
  const ext = target.slice(target.lastIndexOf('.')).toLowerCase()
  const kind = VIDEO_EXT.has(ext) ? 'video' : 'image'
  const finalPath = join(UPLOAD_DIR, target)
  const tempPath = finalPath + '.part-' + process.pid + '-' + Date.now()

  let size = 0
  let settled = false
  let out = null
  try {
    out = createWriteStream(tempPath, { flags: 'wx' })
  } catch {
    respond(res, 500, { error: 'cannot open the upload file' })
    return
  }
  const cleanup = () => {
    try {
      unlinkSync(tempPath)
    } catch {
      // already renamed or never created
    }
  };
  const settle = (status, value) => {
    if (settled) return
    settled = true
    if (status !== 200) cleanup()
    respond(res, status, value)
  }

  req.on('data', (chunk) => {
    size += chunk.length
    if (size > UPLOAD_MAX && settled === false) {
      settled = true
      try {
        req.unpipe(out)
      } catch {
        // the pipe may already have been torn down
      }
      out.destroy()
      cleanup()
      respond(res, 413, { error: 'file too large (max ' + UPLOAD_MAX_MB + ' MB)' })
      // Discard the rest so the socket is not left half-open.
      req.resume()
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
  out.on('error', () => settle(500, { error: 'cannot write the upload' }))
  out.on('finish', () => {
    if (settled) return
    if (size === 0) {
      settle(400, { error: 'empty file' })
      return
    }
    try {
      renameSync(tempPath, finalPath)
    } catch {
      settle(500, { error: 'cannot finalize the upload' })
      return
    }
    settled = true
    respond(res, 200, {
      item: { id: 'uploads/' + target, kind, url: ROUTE + '/uploads/' + target, bytes: size, uploaded: true },
    })
  })
  req.pipe(out)
}
