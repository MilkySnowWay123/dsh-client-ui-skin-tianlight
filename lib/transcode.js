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

import { spawn, spawnSync } from 'node:child_process'
import { mkdirSync, readdirSync, renameSync, statSync, unlinkSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'
import { ASSET_DIR, ROUTE, SAFE_NAME, fileSize, safeJoin } from './media-types.js'
import { UPLOAD_DIR } from './upload.js'
import { DERIVED_DIR } from './host-paths.js'
import { sendJson, sendText } from './http-media.js'

/** Contract: kill a runaway transcode after ten minutes. */
export const TRANSCODE_TIMEOUT_MS = 10 * 60 * 1000
/** Cap on captured stderr; enough for the final error line, not an ffmpeg dump. */
const STDERR_MAX_BYTES = 4 * 1024 * 1024
const DETECT_TTL_MS = 60 * 1000
const DEFAULT_COMMAND = 'ffmpeg'
/** Inputs the H.264 branch accepts (HEVC usually hides inside .mov/.mp4). */
const VIDEO_INPUT_EXT = new Set(['.mp4', '.mov', '.m4v', '.webm'])

let detectCache = { command: null, at: 0, value: { ffmpeg: false, version: null } }

/** `FFMPEG_PATH` lets a user point at a bundle that is not on PATH. */
export function ffmpegCommand() {
  const override = process.env.FFMPEG_PATH
  if (typeof override === 'string' && override.trim() !== '') return override.trim()
  return DEFAULT_COMMAND
}

/**
 * Probe `ffmpeg -version` once per minute (per command). The result is cached in
 * both directions: a machine without ffmpeg must not spawn a doomed process for
 * every panel refresh.
 */
export function detectFfmpeg(options = {}) {
  const command = typeof options.command === 'string' && options.command !== '' ? options.command : ffmpegCommand()
  const now = Date.now()
  if (
    options.force !== true &&
    detectCache.command === command &&
    now - detectCache.at < DETECT_TTL_MS
  ) {
    return detectCache.value
  }
  let value = { ffmpeg: false, version: null }
  try {
    // Short timeout: this runs synchronously inside the `_engines`/status routes,
    // and a probe must never hold the host's event loop for long.
    const result = spawnSync(command, ['-version'], { encoding: 'utf8', timeout: 2500, windowsHide: true })
    if (result.error === undefined && result.status === 0) {
      const firstLine = String(result.stdout ?? '').split(/\r?\n/)[0] ?? ''
      const match = /ffmpeg version\s+(\S+)/i.exec(firstLine)
      value = { ffmpeg: true, version: match === null ? firstLine.trim().slice(0, 120) || 'unknown' : match[1] }
    }
  } catch {
    value = { ffmpeg: false, version: null }
  }
  detectCache = { command, at: now, value }
  return value
}

/** Contract shape: `{ffmpeg, version}`. */
export function ffmpegStatus(options = {}) {
  const value = detectFfmpeg(options)
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
 */
export function derivedOutputName(sourcePath) {
  const base = basename(String(sourcePath))
  const dot = base.lastIndexOf('.')
  const rawStem = dot > 0 ? base.slice(0, dot) : base
  const stem = rawStem.replace(/[^A-Za-z0-9._-]/g, '-').replace(/^[._-]+/, '').slice(0, 80)
  return (stem === '' ? 'wallpaper' : stem) + '.h264.mp4'
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
 * Resolve `?name=` to an existing file inside assets/, uploads/ or derived/.
 * Accepts `sky.mp4`, `uploads/sky.mp4` and `derived/sky.h264.mp4`.
 */
export function resolveTranscodeSource(rawName, options = {}) {
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
  const parts = decoded.split('/')
  if (parts.length === 1) return isFile(assets, parts[0]) ?? isFile(uploads, parts[0])
  if (parts.length === 2) {
    if (parts[0] === 'uploads') return isFile(uploads, parts[1])
    if (parts[0] === 'assets') return isFile(assets, parts[1])
    if (parts[0] === 'derived') return isFile(derived, parts[1])
    return null
  }
  return null
}

/**
 * Run ffmpeg with a hard timeout and a capped stderr. Resolves (never rejects) to
 * `{ok, code, reason}` so the route always has a sanitized answer to send.
 */
export function runTranscode(args, options = {}) {
  const command = typeof options.command === 'string' && options.command !== '' ? options.command : ffmpegCommand()
  const timeoutMs = Number(options.timeoutMs) > 0 ? Number(options.timeoutMs) : TRANSCODE_TIMEOUT_MS
  return new Promise((resolvePromise) => {
    let settled = false
    let timedOut = false
    let stderr = ''
    let timer = null
    const finish = (value) => {
      if (settled) return
      settled = true
      if (timer !== null) clearTimeout(timer)
      resolvePromise(value)
    }
    let child
    try {
      child = spawn(command, args, { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] })
    } catch {
      finish({ ok: false, code: null, reason: 'cannot start ffmpeg' })
      return
    }
    timer = setTimeout(() => {
      timedOut = true
      try {
        child.kill('SIGKILL')
      } catch {
        // process already exited
      }
    }, timeoutMs)
    child.stderr.on('data', (chunk) => {
      if (typeof chunk === 'string') chunk = Buffer.from(chunk)
      if (stderr.length >= STDERR_MAX_BYTES) return
      stderr += chunk.subarray(0, STDERR_MAX_BYTES - stderr.length).toString('utf8')
    })
    child.on('error', () => finish({ ok: false, code: null, reason: 'cannot start ffmpeg' }))
    child.on('close', (code) => {
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

/** `_transcode/status` (GET/HEAD). */
export function handleTranscodeStatus(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    sendText(res, 405, 'method not allowed')
    return
  }
  const status = ffmpegStatus()
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
 * `_transcode` (POST only). 501 when the optional binary is missing.
 * `options` (command/media directories) exists for tests; the route mounts it
 * with no options and therefore uses the real environment.
 */
export function handleTranscode(req, res, url, options = {}) {
  if (req.method !== 'POST') {
    sendText(res, 405, 'method not allowed')
    return
  }
  const rawName = url?.searchParams?.get('name') ?? null
  const source = resolveTranscodeSource(rawName, options)
  if (source === null) {
    sendJson(res, 400, { ok: false, error: 'name must be an existing asset or upload' })
    return
  }
  const kind = transcodeKind(source)
  if (kind === null) {
    sendJson(res, 400, { ok: false, error: 'only video containers and GIFs can be transcoded' })
    return
  }
  const detectOptions = typeof options.command === 'string' && options.command !== '' ? { command: options.command } : {}
  const status = ffmpegStatus(detectOptions)
  if (status.ffmpeg === false) {
    sendJson(res, 501, { ok: false, error: 'ffmpeg is not available', note: 'install ffmpeg or set FFMPEG_PATH' })
    return
  }
  const derivedDir = typeof options.derivedDir === 'string' ? options.derivedDir : DERIVED_DIR
  const outputName = derivedOutputName(source)
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
  runTranscode(args, { command: detectOptions.command ?? ffmpegCommand(), timeoutMs: options.timeoutMs })
    .then((result) => {
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
    })
    .catch(() => {
      removeQuietly(tempPath)
      sendJson(res, 500, { ok: false, error: 'transcode failed', note: 'ffmpeg failed' })
    })
}
