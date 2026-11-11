// Optional ffmpeg transcode behind `_transcode` (v0.5.0 contract §6, A6).
//
// HEVC wallpapers and GIFs are the two formats users hit that browsers routinely
// refuse to play. When ffmpeg happens to be installed, this route converts them to
// H.264/MP4 into `assets/derived/`; when it is not, every call answers 501 and the
// panel hides the action. Nothing here is required for the skin to work.
//
// Safety:
//   - the input name is resolved through the same safe-join policy as uploads and
//     assets: it is a *name*, never a path outside the two media directories;
//   - args are passed as an array to `spawn` (no shell, no interpolation), so a
//     crafted filename cannot become a second command;
//   - output goes to a temp file in `assets/derived/`, renamed only on success: a
//     failed or timed-out run never overwrites the source and never leaves a
//     half-written MP4 in the catalog;
//   - stderr is capped at 4 MB and reduced to one sanitized line, so an internal
//     path or ffmpeg banner is never echoed to the browser.

import { spawn } from 'node:child_process'
import { mkdirSync, readdirSync, renameSync, statSync, unlinkSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'
import { ASSET_DIR, ROUTE, SAFE_NAME, fileSize, safeJoin } from './media-types.js'
import { UPLOAD_DIR } from './upload.js'
import { DERIVED_DIR } from './host-paths.js'
import { sendJson, sendText } from './http-media.js'

/** Contract: kill a runaway transcode after ten minutes. */
export const TRANSCODE_TIMEOUT_MS = 10 * 60 * 1000
/**
 * R4B: bound the number of concurrent ffmpeg processes. A wallpaper transcode is
 * CPU/disk heavy and used to be unbounded: a page could start dozens at once and
 * stall the DSH host. Requests over the limit get 429 (the client can retry).
 */
export const TRANSCODE_MAX_CONCURRENT = 2
/** How long the real ffmpeg probe may take; a missing binary fails fast anyway. */
const DETECT_TIMEOUT_MS = 2500
/** Cap on captured stderr; enough for the final error line, not an ffmpeg dump. */
const STDERR_MAX_BYTES = 4 * 1024 * 1024
const DETECT_TTL_MS = 60 * 1000
const DEFAULT_COMMAND = 'ffmpeg'
/** Inputs the H.264 branch accepts (HEVC usually hides inside .mov/.mp4). */
const VIDEO_INPUT_EXT = new Set(['.mp4', '.mov', '.m4v', '.webm'])

let detectCache = { command: null, at: 0, value: { ffmpeg: false, version: null } }
/** In-flight probe per command: concurrent status/transcode routes share one spawn. */
let detectPending = null

/** Number of transcodes currently running (global, not per route). */
let activeTranscodes = 0

/** `FFMPEG_PATH` lets a user point at a bundle that is not on PATH. */
export function ffmpegCommand() {
  const override = process.env.FFMPEG_PATH
  if (typeof override === 'string' && override.trim() !== '') return override.trim()
  return DEFAULT_COMMAND
}

/**
 * Probe `ffmpeg -version` once per minute (per command). R4B: the probe is ASYNC
 * (async spawn instead of spawnSync) so a cache miss can never block the DSH host
 * event loop. The result is cached in both directions: a machine without ffmpeg
 * must not spawn a doomed process for every panel refresh. Concurrent callers
 * share the same in-flight probe.
 */
export async function detectFfmpeg(options = {}) {
  const command = typeof options.command === 'string' && options.command !== '' ? options.command : ffmpegCommand()
  const now = Date.now()
  if (
    options.force !== true &&
    detectCache.command === command &&
    now - detectCache.at < DETECT_TTL_MS
  ) {
    return detectCache.value
  }
  if (detectPending !== null && detectPending.command === command) return detectPending.promise
  const promise = probeFfmpeg(command).then((value) => {
    detectCache = { command, at: Date.now(), value }
    detectPending = null
    return value
  })
  detectPending = { command, promise }
  return promise
}

/** One bounded async ffmpeg probe; resolves to `{ffmpeg, version}` (never rejects). */
function probeFfmpeg(command) {
  return new Promise((resolveProbe) => {
    let settled = false
    let stdout = ''
    const finish = (value) => {
      if (settled) return
      settled = true
      resolveProbe(value)
    }
    let child
    try {
      child = spawn(command, ['-version'], { windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] })
    } catch {
      finish({ ffmpeg: false, version: null })
      return
    }
    const timer = setTimeout(() => {
      try {
        child.kill('SIGKILL')
      } catch {
        // already gone
      }
      finish({ ffmpeg: false, version: null })
    }, DETECT_TIMEOUT_MS)
    child.stdout.on('data', (chunk) => {
      if (stdout.length < 4096) stdout += String(chunk)
    })
    child.on('error', () => {
      clearTimeout(timer)
      finish({ ffmpeg: false, version: null })
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      if (code !== 0) {
        finish({ ffmpeg: false, version: null })
        return
      }
      const firstLine = stdout.split(/\r?\n/)[0] ?? ''
      const match = /ffmpeg version\s+(\S+)/i.exec(firstLine)
      finish({ ffmpeg: true, version: match === null ? firstLine.trim().slice(0, 120) || 'unknown' : match[1] })
    })
  })
}

/** Contract shape: `{ffmpeg, version}`. Async since R4B (see detectFfmpeg). */
export async function ffmpegStatus(options = {}) {
  const value = await detectFfmpeg(options)
  return { ffmpeg: value.ffmpeg, version: value.version }
}

/** `gif` (frame sequence) or `video` (container that may hold HEVC). */
export function transcodeKind(name) {
  if (typeof name !== 'string') return null
  const dot = name.lastIndexOf('.')
  if (dot < 0) return null
  const ext = name.slice(dot).toLowerCase()
  if (ext === '.gif') return 'gif'
  if (VIDEO_INPUT_EXT.has(ext)) return 'video'
  return null
}

/**
 * Deterministic output name: `<source stem>.h264.mp4`. Dots inside the stem are
 * legal in a SAFE_NAME, so `sky.1080.mp4` becomes `sky.1080.h264.mp4`.
 *
 * R4B: when the source directory is known (`assets`/`uploads`/`derived`), it is
 * part of the output key. `assets/x.mp4` and `uploads/x.mp4` used to derive the
 * same `x.h264.mp4`, so the second transcode silently overwrote the first.
 */
export function derivedOutputName(sourcePath, sourceKind) {
  const base = basename(String(sourcePath))
  const dot = base.lastIndexOf('.')
  const rawStem = dot > 0 ? base.slice(0, dot) : base
  const stem = rawStem.replace(/[^A-Za-z0-9._-]/g, '-').replace(/^[._-]+/, '').slice(0, 80)
  const safeStem = stem === '' ? 'wallpaper' : stem
  const kind = sourceKind === 'assets' || sourceKind === 'uploads' || sourceKind === 'derived' ? sourceKind : null
  return (kind === null ? '' : kind + '-') + safeStem + '.h264.mp4'
}

/**
 * ffmpeg argument list. GIFs need even dimensions for yuv420p; video containers
 * get a fast-start H.264 stream with audio dropped (wallpapers are muted).
 */
export function buildTranscodeArgs(inputPath, outputPath) {
  const kind = transcodeKind(String(inputPath))
  if (kind === 'gif') {
    return [
      '-y',
      '-i',
      inputPath,
      '-vf',
      'scale=trunc(iw/2)*2:trunc(ih/2)*2',
      '-pix_fmt',
      'yuv420p',
      '-movflags',
      '+faststart',
      '-an',
      outputPath,
    ]
  }
  if (kind === 'video') {
    return [
      '-y',
      '-i',
      inputPath,
      '-c:v',
      'libx264',
      '-crf',
      '20',
      '-preset',
      'veryfast',
      '-movflags',
      '+faststart',
      '-an',
      outputPath,
    ]
  }
  return null
}

/** Reduce ffmpeg's stderr to one short, path-free line for the UI. */
export function sanitizeFfmpegMessage(text) {
  if (typeof text !== 'string') return ''
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== '')
  let last = lines.length > 0 ? lines[lines.length - 1] : ''
  last = last.replace(/[A-Za-z]:\\[^\s"']+/g, '[path]')
  last = last.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim()
  if (last.length > 300) last = last.slice(0, 300)
  return last
}

/**
 * Resolve `?name=` to an existing file inside assets/, uploads/ or derived/ and
 * say which directory it came from (the output key needs it, R4B).
 * Accepts `sky.mp4`, `uploads/sky.mp4` and `derived/sky.h264.mp4`.
 */
export function resolveTranscodeSourceInfo(rawName, options = {}) {
  if (typeof rawName !== 'string' || rawName === '') return null
  let decoded = rawName
  try {
    decoded = decodeURIComponent(rawName)
  } catch {
    return null
  }
  if (decoded.includes('\\') || decoded.length > 200) return null
  const assets = options.assetsDir ?? ASSET_DIR
  const uploads = options.uploadsDir ?? UPLOAD_DIR
  const derived = options.derivedDir ?? DERIVED_DIR
  const isFile = (root, name) => {
    const filePath = safeJoin(root, name)
    if (filePath === null) return null
    try {
      return statSync(filePath).isFile() ? filePath : null
    } catch {
      return null
    }
  }
  const found = (kind, root, name) => {
    const filePath = isFile(root, name)
    return filePath === null ? null : { path: filePath, kind }
  }
  const parts = decoded.split('/')
  if (parts.length === 1) return found('assets', assets, parts[0]) ?? found('uploads', uploads, parts[0])
  if (parts.length === 2) {
    if (parts[0] === 'uploads') return found('uploads', uploads, parts[1])
    if (parts[0] === 'assets') return found('assets', assets, parts[1])
    if (parts[0] === 'derived') return found('derived', derived, parts[1])
    return null
  }
  return null
}

/** Backward-compatible path-only resolver (same containment rules). */
export function resolveTranscodeSource(rawName, options = {}) {
  const info = resolveTranscodeSourceInfo(rawName, options)
  return info === null ? null : info.path
}

/**
 * Run ffmpeg with a hard timeout and a capped stderr. Resolves (never rejects) to
 * `{ok, code, reason}` so the route always has a sanitized answer to send.
 * `options.signal` (AbortSignal, R4B) kills the process when the HTTP client
 * disconnects so a closed tab never leaves a ten-minute ffmpeg running.
 */
export function runTranscode(args, options = {}) {
  const command = typeof options.command === 'string' && options.command !== '' ? options.command : ffmpegCommand()
  const timeoutMs = Number(options.timeoutMs) > 0 ? Number(options.timeoutMs) : TRANSCODE_TIMEOUT_MS
  const signal = options.signal instanceof AbortSignal ? options.signal : null
  return new Promise((resolvePromise) => {
    let settled = false
    let timedOut = false
    let aborted = false
    let stderr = ''
    let timer = null
    let killTimer = null
    const onAbort = () => {
      if (settled) return
      aborted = true
      try {
        child.kill('SIGKILL')
      } catch {
        // process already exited
      }
      killTimer = setTimeout(() => {
        finish({ ok: false, code: null, reason: 'client disconnected', aborted: true })
      }, 5000)
    }
    const finish = (value) => {
      if (settled) return
      settled = true
      if (timer !== null) clearTimeout(timer)
      if (killTimer !== null) clearTimeout(killTimer)
      if (signal !== null) signal.removeEventListener('abort', onAbort)
      resolvePromise(value)
    }
    let child
    try {
      child = spawn(command, args, { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] })
    } catch {
      finish({ ok: false, code: null, reason: 'cannot start ffmpeg' })
      return
    }
    if (signal !== null) {
      if (signal.aborted) {
        onAbort()
      } else {
        signal.addEventListener('abort', onAbort, { once: true })
      }
    }
    timer = setTimeout(() => {
      timedOut = true
      try {
        child.kill('SIGKILL')
      } catch {
        // process already exited
      }
      // A killed child usually emits 'close', but a stuck handle or a failed kill
      // must not leave this promise pending forever (the route would hang and the
      // .part temp would linger).
      killTimer = setTimeout(() => {
        finish({ ok: false, code: null, reason: 'transcode timed out', timedOut: true })
      }, 5000)
    }, timeoutMs)
    child.stderr.on('data', (chunk) => {
      if (typeof chunk === 'string') chunk = Buffer.from(chunk)
      if (stderr.length >= STDERR_MAX_BYTES) return
      stderr += chunk.subarray(0, STDERR_MAX_BYTES - stderr.length).toString('utf8')
    })
    child.on('error', () => finish({ ok: false, code: null, reason: 'cannot start ffmpeg' }))
    child.on('close', (code) => {
      if (aborted) {
        finish({ ok: false, code: typeof code === 'number' ? code : null, reason: 'client disconnected', aborted: true })
        return
      }
      if (timedOut) {
        finish({ ok: false, code: typeof code === 'number' ? code : null, reason: 'transcode timed out', timedOut: true })
        return
      }
      if (code === 0) {
        finish({ ok: true, code: 0 })
        return
      }
      finish({
        ok: false,
        code: typeof code === 'number' ? code : null,
        reason: sanitizeFfmpegMessage(stderr) || 'ffmpeg exited with code ' + String(code),
      })
    })
  })
}

/** H.264 derivatives in `assets/derived/`, as `_wallpapers` cards. */
export function listDerived(dir = DERIVED_DIR) {
  let names = []
  try {
    names = readdirSync(dir)
  } catch {
    return []
  }
  const items = []
  for (const name of names) {
    // In-flight temps keep the `.mp4` extension so ffmpeg can mux into them;
    // they must never appear as wallpaper cards.
    if (name.includes('.part-')) continue
    if (SAFE_NAME.test(name) === false) continue
    const ext = name.slice(name.lastIndexOf('.')).toLowerCase()
    if (ext !== '.mp4') continue
    const filePath = join(dir, name)
    try {
      if (statSync(filePath).isFile() === false) continue
    } catch {
      continue
    }
    items.push({
      id: 'derived/' + name,
      kind: 'video',
      url: ROUTE + '/derived/' + name,
      bytes: fileSize(filePath),
      derived: true,
    })
  }
  items.sort((a, b) => a.id.localeCompare(b.id))
  return items
}

/** Resolve a `derived/<name>` request to a file inside the derived directory. */
export function derivedPath(name, dir = DERIVED_DIR) {
  return safeJoin(dir, name)
}

/** `_transcode/status` (GET/HEAD). Async since R4B: the ffmpeg probe no longer blocks. */
export async function handleTranscodeStatus(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    sendText(res, 405, 'method not allowed')
    return
  }
  const status = await ffmpegStatus()
  if (req.method === 'HEAD') {
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
    res.end()
    return
  }
  sendJson(res, 200, { ffmpeg: status.ffmpeg, version: status.version })
}

function removeQuietly(filePath) {
  try {
    unlinkSync(filePath)
  } catch {
    // never created, or already renamed
  }
}

/**
 * `_transcode` (POST only). 501 when the optional binary is missing, 429 when the
 * global concurrency cap is reached. `options` (command/media directories and the
 * test seams `runTranscodeImpl`/`maxConcurrent`) exists for tests; the route mounts
 * it with no options and therefore uses the real environment.
 *
 * R4B: the client `res` close aborts the running ffmpeg and removes the temp file;
 * the output key includes the source directory (assets/uploads/derived) so equal
 * file names from different directories cannot overwrite each other.
 */
export async function handleTranscode(req, res, url, options = {}) {
  if (req.method !== 'POST') {
    sendText(res, 405, 'method not allowed')
    return
  }
  const rawName = url?.searchParams?.get('name') ?? null
  const sourceInfo = resolveTranscodeSourceInfo(rawName, options)
  if (sourceInfo === null) {
    sendJson(res, 400, { ok: false, error: 'name must be an existing asset or upload' })
    return
  }
  const source = sourceInfo.path
  const kind = transcodeKind(source)
  if (kind === null) {
    sendJson(res, 400, { ok: false, error: 'only video containers and GIFs can be transcoded' })
    return
  }
  const detectOptions = typeof options.command === 'string' && options.command !== '' ? { command: options.command } : {}
  // R8b (REV-R4B 1): listen for a client disconnect BEFORE the ffmpeg probe. A cache
  // miss can await up to 2.5s; a closed tab during that window must abort the route
  // instead of running a transcode or writing into a destroyed socket.
  const controller = new AbortController()
  let finished = false
  const onClose = () => {
    if (finished) return
    if (res.writableEnded === true) return
    controller.abort()
  }
  res.once?.('close', onClose)
  // `assumeFfmpeg` / `ffmpegStatusImpl` are test seams (tools/test.mjs exercises the
  // route logic with a stub runner/probe on machines that do not have ffmpeg).
  const probeStatus = typeof options.ffmpegStatusImpl === 'function' ? options.ffmpegStatusImpl : ffmpegStatus
  const status = options.assumeFfmpeg === true ? { ffmpeg: true, version: 'test' } : await probeStatus(detectOptions)
  if (controller.signal.aborted === true || res.destroyed === true || res.writableEnded === true) {
    // Client gone while we were probing: no response, no work.
    finished = true
    return
  }
  if (status.ffmpeg === false) {
    sendJson(res, 501, { ok: false, error: 'ffmpeg is not available', note: 'install ffmpeg or set FFMPEG_PATH' })
    return
  }
  const maxConcurrent = Number(options.maxConcurrent) > 0 ? Math.floor(Number(options.maxConcurrent)) : TRANSCODE_MAX_CONCURRENT
  if (activeTranscodes >= maxConcurrent) {
    sendJson(res, 429, { ok: false, error: 'too many concurrent transcodes', limit: maxConcurrent })
    return
  }
  const derivedDir = typeof options.derivedDir === 'string' ? options.derivedDir : DERIVED_DIR
  const outputName = derivedOutputName(source, sourceInfo.kind)
  const finalPath = join(derivedDir, outputName)
  if (resolve(source) === resolve(finalPath)) {
    sendJson(res, 400, { ok: false, error: 'refusing to overwrite the source file' })
    return
  }
  // The temp file must keep the `.mp4` extension: ffmpeg infers the container
  // from the output name, and a `.part-*` suffix would make it fail to mux.
  const tempStem = outputName.slice(0, outputName.length - '.mp4'.length)
  const tempPath = join(derivedDir, tempStem + '.part-' + process.pid + '-' + Date.now().toString(36) + '.mp4')
  try {
    mkdirSync(derivedDir, { recursive: true })
  } catch {
    sendJson(res, 500, { ok: false, error: 'cannot create the derived directory' })
    return
  }
  const args = buildTranscodeArgs(source, tempPath)
  if (args === null) {
    sendJson(res, 400, { ok: false, error: 'unsupported input for transcoding' })
    return
  }
  activeTranscodes += 1
  const runner = typeof options.runTranscodeImpl === 'function' ? options.runTranscodeImpl : runTranscode
  let result
  try {
    result = await runner(args, {
      command: detectOptions.command ?? ffmpegCommand(),
      timeoutMs: options.timeoutMs,
      signal: controller.signal,
    })
  } catch {
    result = { ok: false, code: null, reason: 'transcode failed' }
  } finally {
    activeTranscodes = Math.max(0, activeTranscodes - 1)
    finished = true
  }
  if (controller.signal.aborted === true) {
    // Client gone: no response to write, just drop the in-flight temp file.
    removeQuietly(tempPath)
    return
  }
  if (result.ok === true) {
    let bytes = 0
    try {
      bytes = statSync(tempPath).size
      renameSync(tempPath, finalPath)
    } catch {
      removeQuietly(tempPath)
      sendJson(res, 500, { ok: false, error: 'cannot store the transcoded file' })
      return
    }
    sendJson(res, 200, {
      ok: true,
      output: 'derived/' + outputName,
      bytes,
      note: kind === 'gif' ? 'GIF to MP4 (H.264)' : 'H.264',
    })
    return
  }
  removeQuietly(tempPath)
  sendJson(res, 500, { ok: false, error: 'transcode failed', note: result.reason ?? 'ffmpeg failed' })
}
