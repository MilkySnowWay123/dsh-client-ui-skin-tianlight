// Bundle export/import behind `_bundle` and `_import` (v0.5.0 contract §6, D2).
//
// Format: a plain gzipped ustar archive with no external dependencies.
//
//   manifest.json     version / created-at / enabled modules / recipe summary
//   settings.json     the host settings document (`state/settings.json` shape)
//   wallpapers/uploads/…  USER media only
//
// S3: the shipped demo media (`assets/bg-main.mp4`, `bg-4k.mp4`, `cat.png`, …) is
// NOT part of a bundle. It already ships with the plugin on every machine, so
// including it made bundles ~70 MB larger and an import copied a duplicate into
// `assets/uploads/`. Only `assets/uploads/` (the user's own media) is exported;
// older bundles that still contain a built-in name are skipped on import.
//
// Both directions are **streaming**: an export of a 512 MB wallpaper library must
// not be buffered in memory, and an import must be able to validate 2 GB without
// ever holding one whole file. The ustar writer/reader here is deliberately
// minimal (names, sizes, modes, mtimes, regular files) because a bundle is
// produced by this module and consumed by this module; foreign tar features are
// ignored rather than trusted.
//
// Import is transactional in the only way that matters: every entry is written
// into `state/import-<stamp>/` first, and files are hard-linked into
// `assets/uploads/` only after the whole archive has parsed cleanly. A dropped
// connection, a corrupt gzip or a traversal attempt leaves zero partial files.

import { createReadStream, createWriteStream, existsSync, linkSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import { createGzip, createGunzip } from 'node:zlib'
import { ASSET_DIR, IMAGE_EXT, SAFE_NAME, SVG_MAX_BYTES, VIDEO_EXT, isSafeSvgBuffer } from './media-types.js'
import { UPLOAD_DIR } from './upload.js'
import { STATE_DIR } from './host-paths.js'
import { readSettings, settingsStore, stripDataSettings, validateSettingsPayload } from './settings-store.js'
import { sendJson, sendText } from './http-media.js'

export const BUNDLE_FORMAT = 'tianlight-bundle'
/** Archive name shown in the browser download. */
export const BUNDLE_FILE_PREFIX = 'tianlight-bundle'
/**
 * R4A: capability grants are session-memory only. A bundle must never carry the
 * permission document in either direction: exporting it would hand another machine
 * "already allowed" bits, and importing it would write them into the host settings
 * mirror (from where every browser used to pick them up). Both handlers strip this
 * key; the brain additionally ignores any dangerous bit it finds in localStorage.
 */
export const BUNDLE_SECRET_SETTINGS = Object.freeze(['tianlight.pet.permissions.v1'])
/** Remove the per-session capability document from a settings map (in place). */
export function stripBundleSecretSettings(settings) {
  if (settings === null || typeof settings !== 'object' || Array.isArray(settings)) return settings
  for (const key of BUNDLE_SECRET_SETTINGS) delete settings[key]
  return settings
}
/** Read-only export projection: data keys and capability grants are not shipped. */
function stripBundleStateSecrets(state) {
  const source = state !== null && typeof state === 'object' && Array.isArray(state) === false ? state : {}
  const settings = source.settings !== null && typeof source.settings === 'object' && Array.isArray(source.settings) === false ? { ...source.settings } : {}
  stripBundleSecretSettings(settings)
  return { ...source, settings }
}
/**
 * S3: a bundle may only carry formats the player (and the upload sink) accepts.
 * Derived from the shared media tables instead of a second hand-written list, so
 * "export writes a format import skips" cannot drift again (.svg/.avif used to do
 * exactly that). Unknown extensions in old/hostile packages are still skipped.
 */
export const IMPORT_EXT = new Set([...VIDEO_EXT, ...IMAGE_EXT])
/** The companion art (cat.png) is a built-in asset and is excluded with the rest. */
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/

/** Caps for a hostile/corrupt archive. Deliberately generous but finite. */
export const BUNDLE_LIMITS = Object.freeze({
  entries: 500,
  fileBytes: 512 * 1024 * 1024,
  totalBytes: 2 * 1024 * 1024 * 1024,
  settingsBytes: 512 * 1024,
  manifestBytes: 256 * 1024,
})

/** Import failures carry the HTTP status they should become; never a stack trace. */
export class BundleError extends Error {
  constructor(status, message) {
    super(message)
    this.name = 'BundleError'
    this.status = status
  }
}

// ---------------------------------------------------------------------------
// ustar writer
// ---------------------------------------------------------------------------

function writeOctal(buffer, offset, length, value) {
  const clamped = Math.max(0, Math.min(Number(value) || 0, 8 ** (length - 1) - 1))
  buffer.write(clamped.toString(8).padStart(length - 1, '0'), offset, length - 1, 'ascii')
  buffer[offset + length - 1] = 0
}

/**
 * ustar splits long paths into prefix[155] + name[100]. Bundle paths can exceed
 * 100 bytes (`wallpapers/uploads/<96-char upload name>`), so the split happens
 * at a separator; a name that cannot be split is refused rather than truncated
 * (a truncated name would import into the wrong file).
 */
function splitTarName(name) {
  if (typeof name !== 'string' || name === '') return null
  if (/[^\x20-\x7e]/.test(name)) return null
  if (name.length <= 100) return { name, prefix: '' }
  for (let index = name.length - 1; index > 0; index -= 1) {
    if (name[index] !== '/') continue
    const prefix = name.slice(0, index)
    const rest = name.slice(index + 1)
    if (prefix.length <= 155 && rest.length <= 100 && rest.length > 0) return { name: rest, prefix }
  }
  return null
}

/** One 512-byte ustar header (checksum included). */
export function tarHeader(options) {
  const name = typeof options?.name === 'string' ? options.name : ''
  const size = Math.max(0, Math.floor(Number(options?.size) || 0))
  const mtime = Math.max(0, Math.floor(Number(options?.mtime) || 0))
  const type = typeof options?.type === 'string' && options.type !== '' ? options.type[0] : '0'
  const split = splitTarName(name)
  if (split === null) return null
  const header = Buffer.alloc(512, 0)
  header.write(split.name, 0, 100, 'ascii')
  writeOctal(header, 100, 8, options?.mode ?? 0o644)
  writeOctal(header, 108, 8, 0)
  writeOctal(header, 116, 8, 0)
  writeOctal(header, 124, 12, size)
  writeOctal(header, 136, 12, mtime)
  header.fill(0x20, 148, 156) // checksum is summed with the field as spaces
  header[156] = type.charCodeAt(0)
  header.write(split.prefix, 345, 155, 'ascii')
  header.write('ustar', 257, 6, 'ascii')
  header.write('00', 263, 2, 'ascii')
  let sum = 0
  for (const byte of header) sum += byte
  header.write(sum.toString(8).padStart(6, '0'), 148, 6, 'ascii')
  header[154] = 0
  header[155] = 0x20
  return header
}

const paddingFor = (size) => (512 - (size % 512)) % 512

/** Small in-memory archives (tests, fixtures); production export uses `tarStream`. */
export function buildTarBuffer(entries) {
  const chunks = []
  for (const entry of entries) {
    const data = Buffer.isBuffer(entry?.data) ? entry.data : Buffer.from(String(entry?.data ?? ''), 'utf8')
    const header = tarHeader({ name: entry?.name, size: data.length, type: entry?.type, mtime: entry?.mtime })
    if (header === null) throw new Error('unsafe tar entry name: ' + String(entry?.name))
    chunks.push(header, data)
    const pad = paddingFor(data.length)
    if (pad > 0) chunks.push(Buffer.alloc(pad, 0))
  }
  chunks.push(Buffer.alloc(1024, 0))
  return Buffer.concat(chunks)
}

/**
 * Production export stream. File entries are declared with an exact byte count
 * and read with `end: size - 1`: if the file shrinks mid-export the short read
 * throws and the response is destroyed instead of emitting a corrupt archive.
 */
export async function* tarStream(entries) {
  for (const entry of entries) {
    if (typeof entry?.path === 'string') {
      let info
      try {
        info = statSync(entry.path)
      } catch {
        continue
      }
      if (info.isFile() === false) continue
      const size = info.size
      const header = tarHeader({ name: entry.name, size, mtime: Math.floor(info.mtimeMs / 1000) })
      if (header === null) continue
      yield header
      let written = 0
      const stream = createReadStream(entry.path, { start: 0, end: size > 0 ? size - 1 : 0 })
      for await (const chunk of stream) {
        written += chunk.length
        yield chunk
      }
      if (written !== size) throw new Error('bundle source changed while exporting: ' + entry.name)
      const pad = paddingFor(size)
      if (pad > 0) yield Buffer.alloc(pad, 0)
      continue
    }
    const data = Buffer.isBuffer(entry?.data) ? entry.data : Buffer.from(String(entry?.data ?? ''), 'utf8')
    const header = tarHeader({ name: entry?.name, size: data.length })
    if (header === null) continue
    yield header
    if (data.length > 0) yield data
    const pad = paddingFor(data.length)
    if (pad > 0) yield Buffer.alloc(pad, 0)
  }
  yield Buffer.alloc(1024, 0) // end-of-archive marker
}

// ---------------------------------------------------------------------------
// ustar reader
// ---------------------------------------------------------------------------

function cstring(buffer, offset, length) {
  let end = offset
  const limit = offset + length
  while (end < limit && buffer[end] !== 0) end += 1
  return buffer.toString('utf8', offset, end)
}

function parseOctal(buffer, offset, length) {
  const text = cstring(buffer, offset, length).trim()
  if (text === '') return 0
  if (/^[0-7]+$/.test(text) === false) return null
  const value = Number.parseInt(text, 8)
  return Number.isSafeInteger(value) ? value : null
}

const isZeroBlock = (block) => {
  for (const byte of block) if (byte !== 0) return false
  return true
}

/** Parse + checksum one 512-byte header. Returns null when the header is invalid. */
export function parseTarHeader(block) {
  if (Buffer.isBuffer(block) === false || block.length !== 512) return null
  const checksum = parseOctal(block, 148, 8)
  if (checksum === null) return null
  let sum = 0
  for (let index = 0; index < 512; index += 1) {
    sum += index >= 148 && index < 156 ? 0x20 : block[index]
  }
  if (sum !== checksum) return null
  const size = parseOctal(block, 124, 12)
  if (size === null) return null
  const mtime = parseOctal(block, 136, 12)
  const name = cstring(block, 0, 100)
  const prefix = cstring(block, 345, 155)
  const fullName = prefix === '' ? name : prefix + '/' + name
  return {
    name: fullName,
    size,
    mtime: mtime ?? 0,
    type: block[156] === 0 ? '0' : String.fromCharCode(block[156]),
  }
}

/**
 * Bounded chunk reader over an async iterable. The byte budget includes headers,
 * padding and anything after the end-of-archive marker, so a gzip bomb cannot
 * buy unbounded CPU by placing its expansion after the logical end of the tar.
 */
class ByteReader {
  constructor(source, maxBytes) {
    this.iterator = source[Symbol.asyncIterator]()
    this.chunk = null
    this.offset = 0
    this.done = false
    this.total = 0
    this.maxBytes = maxBytes
  }

  async _pull() {
    if (this.done) return false
    const step = await this.iterator.next()
    if (step.done === true) {
      this.done = true
      this.chunk = null
      return false
    }
    const chunk = Buffer.isBuffer(step.value) ? step.value : Buffer.from(step.value ?? '')
    this.total += chunk.length
    if (this.total > this.maxBytes) throw new BundleError(413, 'bundle expands beyond the size limit')
    this.chunk = chunk
    this.offset = 0
    return true
  }

  async _ensure() {
    while (this.chunk === null || this.offset >= this.chunk.length) {
      if ((await this._pull()) === false) return false
    }
    return true
  }

  /** Exactly `size` bytes, or null when the stream ends first. */
  async readExact(size) {
    const parts = []
    let need = size
    while (need > 0) {
      if ((await this._ensure()) === false) return null
      const available = this.chunk.length - this.offset
      const take = Math.min(need, available)
      parts.push(this.chunk.subarray(this.offset, this.offset + take))
      this.offset += take
      need -= take
    }
    return parts.length === 1 ? parts[0] : Buffer.concat(parts, size)
  }

  /** At most `maxSize` bytes, never crossing an upstream chunk boundary. */
  async readChunk(maxSize) {
    if ((await this._ensure()) === false) return null
    const available = this.chunk.length - this.offset
    const take = Math.min(maxSize, available)
    const out = this.chunk.subarray(this.offset, this.offset + take)
    this.offset += take
    return out
  }

  async drain() {
    for (;;) {
      if ((await this._ensure()) === false) return
      this.offset = this.chunk.length
    }
  }
}

async function* skipBytes(reader, size) {
  let remaining = size
  while (remaining > 0) {
    const chunk = await reader.readChunk(Math.min(64 * 1024, remaining))
    if (chunk === null) throw new BundleError(400, 'bundle is truncated: entry data ended early')
    remaining -= chunk.length
    yield chunk
  }
}

/**
 * Iterate a tar stream, handing each regular file to `onEntry` with an async
 * iterator over its bytes. The callback must consume `entry.data` before it
 * returns; whatever it leaves is drained here so the next header stays aligned.
 *
 * Entries whose path fails the bundle name policy are never yielded: they are
 * drained and reported in the returned `skipped` list, so one poisoned name in
 * an otherwise usable archive costs that item, not the whole import.
 */
export async function parseTar(source, options = {}) {
  const limits = { ...BUNDLE_LIMITS, ...(options.limits ?? {}) }
  const onEntry = typeof options.onEntry === 'function' ? options.onEntry : async () => {}
  const reader = new ByteReader(source, limits.totalBytes + 32 * 1024 * 1024)
  let entries = 0
  let total = 0
  const skipped = []
  for (;;) {
    const block = await reader.readExact(512)
    if (block === null) throw new BundleError(400, 'bundle is truncated: missing end-of-archive marker')
    if (isZeroBlock(block)) {
      await reader.drain()
      break
    }
    const header = parseTarHeader(block)
    if (header === null) throw new BundleError(400, 'bundle contains an invalid tar header')
    entries += 1
    if (entries > limits.entries) throw new BundleError(413, 'bundle has more than ' + limits.entries + ' entries')
    if (header.size > limits.fileBytes) throw new BundleError(413, 'bundle entry is larger than ' + limits.fileBytes + ' bytes')
    total += header.size
    if (total > limits.totalBytes) throw new BundleError(413, 'bundle is larger than ' + limits.totalBytes + ' bytes')
    const isFile = header.type === '0' || header.type === ' ' || header.type === '\u0000'
    if (isFile && validateBundleEntryName(header.name) === null) {
      // Policy rejection, not a structural failure: drain and report.
      skipped.push(header.name)
      for await (const chunk of skipBytes(reader, header.size)) void chunk
    } else if (isFile) {
      let consumed = 0
      const data = (async function* entryBytes() {
        while (consumed < header.size) {
          const chunk = await reader.readChunk(Math.min(64 * 1024, header.size - consumed))
          if (chunk === null) throw new BundleError(400, 'bundle is truncated: entry data ended early')
          consumed += chunk.length
          yield chunk
        }
      })()
      await onEntry({ name: header.name, size: header.size, type: 'file', data })
      // Drain the remainder through the same iterator: handlers that skip an
      // entry still leave the archive aligned.
      for await (const chunk of data) void chunk
    } else {
      // Directories, links and pax headers are never materialised. Their payload
      // still has to be skipped byte-for-byte so the next header stays aligned.
      for await (const chunk of skipBytes(reader, header.size)) void chunk
    }
    const pad = paddingFor(header.size)
    if (pad > 0 && (await reader.readExact(pad)) === null) {
      throw new BundleError(400, 'bundle is truncated: entry padding ended early')
    }
  }
  return { entries, bytes: total, skipped }
}

// ---------------------------------------------------------------------------
// Entry policy
// ---------------------------------------------------------------------------

/**
 * A bundle path is untrusted input: absolute paths, drive letters, backslashes,
 * `.`/`..`, empty segments and control characters are all refused. Returns the
 * validated segment list, or null.
 */
export function validateBundleEntryName(name) {
  if (typeof name !== 'string' || name === '' || name.length > 200) return null
  if (name.startsWith('/')) return null
  if (name.includes('\\')) return null
  if (/^[A-Za-z]:/.test(name)) return null
  if (CONTROL_CHARS.test(name)) return null
  const segments = name.split('/')
  for (const segment of segments) {
    if (segment === '' || segment === '.' || segment === '..') return null
    if (SAFE_NAME.test(segment) === false) return null
  }
  return segments
}

/** Map one archive path to what the importer does with it. */
export function classifyBundleEntry(name) {
  const segments = validateBundleEntryName(name)
  if (segments === null) return { kind: 'invalid' }
  if (segments.length === 1 && segments[0] === 'settings.json') return { kind: 'settings' }
  if (segments.length === 1 && segments[0] === 'manifest.json') return { kind: 'manifest' }
  if (segments[0] === 'wallpapers' && segments.length >= 2) {
    const base = segments[segments.length - 1]
    const ext = base.slice(base.lastIndexOf('.')).toLowerCase()
    if (IMPORT_EXT.has(ext)) {
      // S3: only the OLD flat layout (`wallpapers/<name>`) carried the shipped demo
      // media. `wallpapers/uploads/<name>` is always user content — a user upload may
      // legitimately share a demo basename and must still round-trip.
      return { kind: 'wallpaper', base, legacyRoot: segments.length === 2 }
    }
    return { kind: 'skip' }
  }
  return { kind: 'skip' }
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

/**
 * S3: the shipped demo media lives in the plugin root; it is never user content and
 * must never be exported, nor re-imported as a duplicate upload. A bundle entry with
 * the same base name is treated as the already-installed built-in.
 */
export function isBundleBuiltinMedia(base) {
  if (typeof base !== 'string' || base === '') return false
  if (SAFE_NAME.test(base) === false) return false
  try {
    return existsSync(join(ASSET_DIR, base))
  } catch {
    return false
  }
}

/**
 * S3: only USER media belongs in a bundle (`assets/uploads/`). The shipped demo
 * wallpapers and the companion art are excluded by construction instead of by a
 * keep-list, so a future bundled asset cannot silently inflate every export again.
 * Options exist for tests; production uses the real asset/upload dirs.
 */
export function listBundleWallpapers(options = {}) {
  const uploadDir = typeof options.uploadDir === 'string' ? options.uploadDir : UPLOAD_DIR
  const files = []
  let names = []
  try {
    names = readdirSync(uploadDir)
  } catch {
    return files
  }
  for (const name of names) {
    if (SAFE_NAME.test(name) === false) continue
    const ext = name.slice(name.lastIndexOf('.')).toLowerCase()
    if (VIDEO_EXT.has(ext) === false && IMAGE_EXT.has(ext) === false) continue
    const filePath = join(uploadDir, name)
    try {
      if (statSync(filePath).isFile() === false) continue
    } catch {
      continue
    }
    // S3b: a legacy upload may predate the strict SVG policy. Never export an active
    // SVG into a new pack; it is skipped (uploads themselves are already re-validated
    // on the next upload, and this keeps new bundles guaranteed passive).
    if (ext === '.svg') {
      try {
        if (isSafeSvgBuffer(readFileSync(filePath)).ok !== true) continue
      } catch {
        continue
      }
    }
    // `uploads/` is user content even when the basename matches a shipped demo file;
    // the archive path prefix is what distinguishes the two on import.
    files.push({ name: 'wallpapers/uploads/' + name, path: filePath })
  }
  files.sort((a, b) => a.name.localeCompare(b.name))
  return files
}

/** `manifest.json` payload: format marker, build, time, enabled modules, recipe. */
export function buildBundleManifest(state, build) {
  const parseSetting = (key) => {
    const raw = state?.settings?.[key]
    if (typeof raw !== 'string') return null
    try {
      return JSON.parse(raw)
    } catch {
      return null
    }
  }
  return {
    format: BUNDLE_FORMAT,
    version: typeof build === 'string' ? build : '',
    createdAt: new Date().toISOString(),
    modules: parseSetting('tianlight.modules'),
    recipe: parseSetting('tianlight.recipe'),
    settings: {
      schemaVersion: state?.schemaVersion ?? 0,
      revision: state?.revision ?? 0,
      updatedAt: state?.updatedAt ?? null,
    },
    // S3: make the package self-describing. Bundles only carry user uploads; the
    // shipped demo media already exists on every install and must not be duplicated.
    media: {
      policy: 'user-uploads-only',
      includes: 'wallpapers/uploads/',
      excludes: ['built-in demo assets', 'companion art', 'transcode derivatives'],
      formats: [...IMPORT_EXT].sort(),
    },
  }
}

/** GET/HEAD `_bundle`: stream manifest + settings + every wallpaper as tar.gz. */
export function handleBundle(req, res, options = {}) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    sendText(res, 405, 'method not allowed')
    return
  }
  const build = typeof options.build === 'string' ? options.build : ''
  // A bundle is settings + media, never the per-browser data (chat history,
  // thoughts, life memory, audit logs) and never the session-only capability
  // grants: those keys are filtered out on export and dropped again on import.
  const state = stripBundleStateSecrets(stripDataSettings(options.state ?? readSettings()))
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const headers = {
    'content-type': 'application/gzip',
    'content-disposition': 'attachment; filename="' + BUNDLE_FILE_PREFIX + '-' + stamp + '.tar.gz"',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
  }
  if (req.method === 'HEAD') {
    res.writeHead(200, headers)
    res.end()
    return
  }
  const entries = [
    { name: 'manifest.json', data: JSON.stringify(buildBundleManifest(state, build), null, 2) },
    { name: 'settings.json', data: JSON.stringify(state, null, 2) },
    ...(Array.isArray(options.files) ? options.files : listBundleWallpapers()),
  ]
  res.writeHead(200, headers)
  const gzip = createGzip({ level: 6 })
  const source = Readable.from(tarStream(entries))
  const fail = () => {
    try {
      res.destroy()
    } catch {
      // already torn down
    }
    try {
      gzip.destroy()
    } catch {
      // already torn down
    }
  }
  source.on('error', fail)
  gzip.on('error', fail)
  res.on('close', () => {
    try {
      source.destroy()
      gzip.destroy()
    } catch {
      // normal completion closes the streams too
    }
  })
  source.pipe(gzip).pipe(res)
}

// ---------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------

function stagingDirFor() {
  return join(
    STATE_DIR,
    'import-' + process.pid + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6),
  )
}

async function readEntryBytes(entry, limit) {
  const chunks = []
  let size = 0
  for await (const chunk of entry.data) {
    size += chunk.length
    if (size > limit) throw new BundleError(413, 'bundle entry is too large')
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
}

/** Stream one entry to a staging file; the archive size is a promise, not a hint. */
function writeEntryToFile(entry, tempPath) {
  return new Promise((resolve, reject) => {
    const out = createWriteStream(tempPath, { flags: 'wx' })
    let settled = false
    const fail = (error) => {
      if (settled) return
      settled = true
      try {
        out.destroy()
      } catch {
        // already closed
      }
      reject(error instanceof BundleError ? error : new BundleError(500, 'cannot write the imported wallpaper'))
    }
    out.on('error', fail)
    ;(async () => {
      try {
        let written = 0
        for await (const chunk of entry.data) {
          written += chunk.length
          if (out.write(chunk) === false) {
            await new Promise((done) => out.once('drain', done))
          }
        }
        if (written !== entry.size) throw new BundleError(400, 'bundle entry size does not match its header')
        await new Promise((done) => out.end(done))
        if (settled) return
        settled = true
        resolve(written)
      } catch (error) {
        fail(error)
      }
    })()
  })
}

/** Hard-link a staged file into uploads under a fresh name; never clobbers. */
function publishStaged(stagedPath, base, uploadDir) {
  const dot = base.lastIndexOf('.')
  const stem = base.slice(0, dot)
  const ext = base.slice(dot)
  for (let index = 0; index < 50; index += 1) {
    const candidate = index === 0 ? base : stem + '-' + index + ext
    const target = join(uploadDir, candidate)
    try {
      linkSync(stagedPath, target)
      unlinkSync(stagedPath)
      return candidate
    } catch (error) {
      if (error?.code === 'EEXIST') continue
      if (error?.code === 'ENOENT') continue // another import grabbed it first
      return null
    }
  }
  return null
}

function removeQuietly(filePath) {
  try {
    unlinkSync(filePath)
  } catch {
    // never existed or already gone
  }
}

function cleanupStaging(staging) {
  try {
    rmSync(staging, { recursive: true, force: true })
  } catch {
    // a leftover staging dir is invisible to every listing and pruned by hand
  }
}

const STAGING_PREFIX = 'import-'
const STAGING_MAX_AGE_MS = 60 * 60 * 1000

/** Remove staging directories orphaned by a crash mid-import (older than 1h). */
function removeStaleStaging() {
  let entries = []
  try {
    entries = readdirSync(STATE_DIR, { withFileTypes: true })
  } catch {
    return
  }
  const cutoff = Date.now() - STAGING_MAX_AGE_MS
  for (const entry of entries) {
    if (entry.isDirectory() === false || entry.name.startsWith(STAGING_PREFIX) === false) continue
    const dir = join(STATE_DIR, entry.name)
    try {
      if (statSync(dir).mtimeMs > cutoff) continue
      rmSync(dir, { recursive: true, force: true })
    } catch {
      // raced with another cleanup or the filesystem refused; harmless
    }
  }
}

/**
 * Not every HTTP-shaped request object exposes the full stream API (the route
 * verification harness drives the handler with a bare EventEmitter). Real Node
 * requests pipe; the fallback forwards the same signals into gunzip so both
 * shapes hit identical validation and identical 400/413/415 responses.
 */
function feedRequest(req, gunzip) {
  if (typeof req.pipe === 'function') {
    req.pipe(gunzip)
    return
  }
  if (typeof req.on !== 'function') {
    gunzip.end()
    return
  }
  req.on('data', (chunk) => {
    try {
      gunzip.write(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    } catch {
      // the parser already failed; the catch below answers
    }
  })
  req.on('end', () => {
    try {
      gunzip.end()
    } catch {
      // already ended by an error path
    }
  })
  req.on('error', () => {
    try {
      gunzip.destroy(new BundleError(400, 'request stream failed'))
    } catch {
      // already destroyed
    }
  })
}

function discardRequest(req) {
  try {
    if (typeof req.unpipe === 'function') req.unpipe()
  } catch {
    // nothing was piped
  }
  try {
    if (typeof req.resume === 'function') req.resume()
  } catch {
    // request already finished
  }
}

/** POST `_import`: validate → stage → publish → merge settings. No partial files. */
export function handleImport(req, res, options = {}) {
  if (req.method !== 'POST') {
    sendText(res, 405, 'method not allowed')
    return
  }
  const contentType = String(req.headers?.['content-type'] ?? '').toLowerCase()
  const typeOk =
    contentType === '' || contentType.includes('gzip') || contentType.includes('x-tar') || contentType.includes('octet-stream')
  if (typeOk === false) {
    sendText(res, 415, 'expected a gzipped tar bundle')
    discardRequest(req)
    return
  }
  const limits = { ...BUNDLE_LIMITS, ...(options.limits ?? {}) }
  const store = options.store ?? settingsStore
  const uploadDir = typeof options.uploadDir === 'string' ? options.uploadDir : UPLOAD_DIR
  const declared = Number(req.headers?.['content-length'])
  if (Number.isFinite(declared) && declared > limits.totalBytes) {
    sendText(res, 413, 'bundle is too large')
    discardRequest(req)
    return
  }

  const staging = typeof options.stagingDir === 'string' ? options.stagingDir : stagingDirFor()
  if (options.stagingDir === undefined) removeStaleStaging()
  const collected = { settings: null, wallpapers: [], skipped: [] }
  const respondError = (status, message) => sendJson(res, status, { ok: false, error: message })
  const gunzip = createGunzip()

  const run = async () => {
    mkdirSync(staging, { recursive: true })
    feedRequest(req, gunzip)
    const parsed = await parseTar(gunzip, {
      limits,
      onEntry: async (entry) => {
        const classified = classifyBundleEntry(entry.name)
        if (classified.kind === 'invalid') {
          // Unreachable by design (parseTar filters unsafe names), kept as a
          // belt-and-braces skip rather than a write attempt.
          collected.skipped.push(entry.name)
          return
        }
        if (classified.kind === 'skip') {
          collected.skipped.push(entry.name)
          return
        }
        if (classified.kind === 'settings') {
          if (entry.size > limits.settingsBytes) throw new BundleError(413, 'settings.json in the bundle is too large')
          const raw = await readEntryBytes(entry, limits.settingsBytes)
          try {
            collected.settings = JSON.parse(raw.toString('utf8'))
          } catch {
            throw new BundleError(400, 'bundle settings.json is not valid JSON')
          }
          return
        }
        if (classified.kind === 'manifest') {
          // Informational only: parse it when it is sane, otherwise ignore it.
          if (entry.size > limits.manifestBytes) return
          const raw = await readEntryBytes(entry, limits.manifestBytes)
          try {
            JSON.parse(raw.toString('utf8'))
          } catch {
            throw new BundleError(400, 'bundle manifest.json is not valid JSON')
          }
          return
        }
        if (entry.size > limits.fileBytes) throw new BundleError(413, 'bundle wallpaper is too large')
        // S3: older bundles still contain the shipped demo media in the OLD flat
        // `wallpapers/<name>` layout. It is already on disk in `assets/`, so
        // re-importing it would only create a duplicate upload. Names under
        // `wallpapers/uploads/` are user content and always round-trip.
        if (classified.legacyRoot === true && isBundleBuiltinMedia(classified.base)) {
          collected.skipped.push(entry.name + ' (built-in media already installed)')
          return
        }
        const tempPath = join(staging, String(collected.wallpapers.length).padStart(3, '0') + '-' + classified.base)
        if (/\.svg$/i.test(classified.base)) {
          // SVG is executable when opened directly; only passive image documents are
          // accepted (same policy as the upload sink). Unlike a structurally broken
          // archive, a hostile old bundle entry is skipped per-item: the rest of the
          // user's pack still imports and the readable reason lands in `skipped`.
          if (entry.size > SVG_MAX_BYTES) throw new BundleError(413, 'bundled SVG is larger than the allowed size')
          const raw = await readEntryBytes(entry, SVG_MAX_BYTES)
          const verdict = isSafeSvgBuffer(raw)
          if (verdict.ok !== true) {
            collected.skipped.push(entry.name + ' (unsafe SVG: ' + verdict.reason + ')')
            return
          }
          writeFileSync(tempPath, raw)
          collected.wallpapers.push({ base: classified.base, path: tempPath, bytes: raw.length })
          return
        }
        const bytes = await writeEntryToFile(entry, tempPath)
        collected.wallpapers.push({ base: classified.base, path: tempPath, bytes })
      },
    })
    collected.skipped.push(...parsed.skipped)

    // Settings are validated before anything is published so a bad merge cannot
    // leave half an import behind.
    let bundleSettings = null
    if (collected.settings !== null) {
      if (typeof collected.settings !== 'object' || Array.isArray(collected.settings)) {
        throw new BundleError(400, 'bundle settings.json has an unexpected shape')
      }
      const map = collected.settings.settings !== undefined ? collected.settings.settings : collected.settings
      // R4A: never merge capability grants from a bundle into the host mirror. The
      // brain treats them as session-only anyway, but a bundle must not even plant
      // them in server-side state that another browser could read.
      stripBundleSecretSettings(map)
      const validated = validateSettingsPayload({ settings: map })
      if (validated.ok !== true) throw new BundleError(validated.status ?? 400, validated.error ?? 'invalid bundle settings')
      bundleSettings = validated.settings
    }

    // A settings-only bundle must not create empty media directories.
    if (collected.wallpapers.length > 0) mkdirSync(uploadDir, { recursive: true })
    const imported = []
    const publishedPaths = []
    try {
      for (const staged of collected.wallpapers) {
        const finalName = publishStaged(staged.path, staged.base, uploadDir)
        if (finalName === null) throw new BundleError(500, 'cannot publish a bundled wallpaper')
        imported.push(finalName)
        publishedPaths.push(join(uploadDir, finalName))
      }
      let revision = store.read().revision
      let settings = store.read().settings
      if (bundleSettings !== null) {
        const merged = store.put({ settings: bundleSettings })
        if (merged.ok !== true) throw new BundleError(merged.status ?? 500, merged.error ?? 'cannot merge the bundled settings')
        revision = merged.revision
        settings = merged.settings
      }
      return { imported, skipped: collected.skipped, settings, revision }
    } catch (error) {
      for (const published of publishedPaths) removeQuietly(published)
      throw error
    }
  }

  run()
    .then((result) => {
      cleanupStaging(staging)
      sendJson(res, 200, { ok: true, ...result })
    })
    .catch((error) => {
      cleanupStaging(staging)
      discardRequest(req)
      try {
        gunzip.destroy()
      } catch {
        // already destroyed
      }
      if (error instanceof BundleError) {
        respondError(error.status, error.message)
      } else if (error && typeof error.code === 'string' && error.code.startsWith('Z_')) {
        respondError(400, 'bundle is not a valid gzip archive')
      } else if (error && typeof error.code === 'string' && error.code.startsWith('E')) {
        // Real filesystem failure (permissions, disk full): a 500 is honest, but
        // it still carries no path and no stack.
        respondError(500, 'cannot store the imported files')
      } else {
        // Malformed input that failed outside the tar parser's own guards.
        respondError(400, 'bundle is not a valid gzip/tar archive')
      }
    })
}


