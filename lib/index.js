// Host loader entry for the TIANLIGHT skin.
//
// The skin's browser half needs large binary assets (a looping video wallpaper
// and character art) that must NOT be inlined into `lib/client.js`. The client
// module carrier only serves bundles, so this host half owns one prefix route
// and streams files out of `assets/` with byte-range support, which is what lets
// `<video>` start playing before the whole file has arrived.

import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { basename, dirname, isAbsolute, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ASSET_DIR, IMAGE_EXT, ROUTE, SAFE_NAME, VIDEO_EXT, fileSize, safeJoin } from './media-types.js'
import { parseRange, sendJson, sendText, servePath, serveTextFile } from './http-media.js'
import { listUploads, receiveUpload, uploadPath, uploadStatus } from './upload.js'
import { listSceneProjects, resolveSceneDir, sceneFilePath } from './scene-project.js'
import { handleSettings, readSettings } from './settings-store.js'
import { handleBundle, handleImport } from './bundle.js'
import { frameCacheStatus, handleFrameCache, handleFrameCacheStatus } from './media-cache.js'
import { derivedPath, ffmpegStatus, handleTranscode, handleTranscodeStatus, listDerived } from './transcode.js'
import { handleWebProject, listWebProjects } from './web-project.js'
import {
  disposeSceneVideoCapture,
  listWeSkinItems,
  makeWeWallpaperHandler,
  weLibraryStatus,
  WE_API_PREFIX,
} from './we-wallpaper/host.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))

/** v0.6.0: the vendored Wallpaper Engine library bridge, mounted as a second prefix. */
const WE_HANDLER = makeWeWallpaperHandler()

/** Optional scene engine + its adapter page. Both may be absent in a slim install. */
const ENGINE_FILE = resolve(HERE, '..', 'vendor', 'webwallgl', 'webwallgl.global.min.js')
const SCENE_FRAME = resolve(HERE, 'scene-frame.html')

/** Optional list of extra wallpaper directories (e.g. Wallpaper Engine projects). */
const ROOTS_FILE = resolve(HERE, '..', 'we-roots.json')

/**
 * Host build marker. The browser half sends the value it expects (`?_engines?build=`)
 * and gets `stale: true` back when this process was started from an older plugin
 * build — the one case a Ctrl+F5 refresh cannot fix by itself. Keep in sync with
 * `HOST_BUILD` in `src/10-constants.js`.
 */
const BUILD = '1.6.2'

function readRoots() {
  try {
    const value = JSON.parse(readFileSync(ROOTS_FILE, 'utf8'))
    if (!Array.isArray(value)) return []
    // Absolute paths only: a relative entry would silently resolve against the DSH
    // process working directory, which is not the directory the user pointed at.
    return value
      .filter((entry) => typeof entry === 'string' && entry.trim() !== '' && isAbsolute(entry.trim()))
      .map((entry) => resolve(entry.trim()))
  } catch {
    return []
  }
}

/** Media files in the configured roots, addressed through the ext route. */
function listExternalWallpapers() {
  const items = []
  readRoots().forEach((root, index) => {
    let names = []
    try {
      names = readdirSync(root)
    } catch {
      return
    }
    for (const name of names) {
      if (SAFE_NAME.test(name) === false) continue
      const ext = name.slice(name.lastIndexOf('.')).toLowerCase()
      const kind = VIDEO_EXT.has(ext) ? 'video' : IMAGE_EXT.has(ext) ? 'image' : null
      if (kind === null) continue
      // The root index is part of the id: two roots can hold the same file name, and a
      // duplicate React key silently drops a card from the grid.
      items.push({ id: 'ext:' + index + ':' + name, kind, url: ROUTE + '/ext/' + index + '/' + name, bytes: fileSize(join(root, name)) })
    }
  })
  return items
}

function listAssets() {
  try {
    return readdirSync(ASSET_DIR).filter((name) => SAFE_NAME.test(name))
  } catch {
    return []
  }
}

/** The companion art is not a wallpaper candidate. */
const COMPANION = 'cat.png'

/**
 * Every file in `assets/` a user could reasonably drop in as a wallpaper. Drop a
 * file, reload, it appears in the list: no config, no manifest edit. Videos rank
 * first because the skin is built around a moving picture, stills are the fallback.
 */
function listWallpapers() {
  const items = []
  for (const name of listAssets()) {
    if (name === COMPANION) continue
    const ext = name.slice(name.lastIndexOf('.')).toLowerCase()
    const kind = VIDEO_EXT.has(ext) ? 'video' : IMAGE_EXT.has(ext) ? 'image' : null
    if (kind === null) continue
    items.push({ id: name, kind, url: ROUTE + '/' + name, bytes: fileSize(join(ASSET_DIR, name)) })
  }
  // Uploads are ordinary wallpapers once they land, so they share one sorted
  // catalog instead of a second list the panel would have to merge.
  const combined = [...items, ...listUploads()]
  combined.sort((a, b) => (a.kind === b.kind ? a.id.localeCompare(b.id) : a.kind === 'video' ? -1 : 1))
  return combined
}

/**
 * Stores the extra wallpaper roots. Accepts only absolute paths that currently
 * resolve to a directory, capped at 20 entries: the file is a configuration, not a
 * filesystem browser, so a bad payload is rejected instead of written.
 * Relative entries are dropped (not resolved against the process CWD), a body over
 * the cap gets a 413 instead of a dropped connection, and the request must be JSON.
 */
function writeRoots(req, res) {
  const contentType = String(req.headers['content-type'] ?? '').toLowerCase()
  if (contentType.includes('application/json') === false) {
    sendText(res, 415, 'expected application/json')
    req.resume()
    return
  }
  const chunks = []
  let size = 0
  let oversized = false
  req.on('data', (chunk) => {
    if (oversized) return
    size += chunk.length
    if (size > 8192) {
      oversized = true
      sendText(res, 413, 'roots payload too large')
      req.resume()
      return
    }
    chunks.push(chunk)
  })
  req.on('end', () => {
    if (oversized) return
    let roots
    let skipped = 0
    try {
      const value = JSON.parse(Buffer.concat(chunks).toString('utf8'))
      if (!Array.isArray(value)) throw new Error('expected an array')
      const accepted = []
      for (const entry of value) {
        if (typeof entry !== 'string' || entry.trim() === '') continue
        const candidate = entry.trim()
        if (isAbsolute(candidate) === false) {
          skipped += 1
          continue
        }
        try {
          if (statSync(candidate).isDirectory()) accepted.push(resolve(candidate))
          else skipped += 1
        } catch {
          skipped += 1
        }
      }
      roots = accepted.slice(0, 20)
      writeFileSync(ROOTS_FILE, JSON.stringify(roots, null, 2), 'utf8')
    } catch {
      sendText(res, 400, 'invalid roots payload')
      return
    }
    sendJson(res, 200, { roots, skipped })
  })
  req.on('error', () => {
    try {
      res.destroy()
    } catch {
      // ignore
    }
  })
}

/**
 * `_engines` payload. The capabilities block is how the browser half decides
 * whether to render settings sync, bundle import/export, the frame cache and the
 * optional transcode action at all: nothing is advertised that is not mounted.
 */
function buildEngineStatus(url) {
  const expected = url.searchParams.get('build')
  const ffmpeg = ffmpegStatus()
  const roots = readRoots()
  return {
    build: BUILD,
    // Only a client that states its expected build can be answered meaningfully;
    // an old client (no query) keeps the field absent and simply ignores it.
    stale: expected === null ? undefined : expected !== BUILD,
    webwallgl: existsSync(ENGINE_FILE),
    adapter: existsSync(SCENE_FRAME),
    sceneProjects: listSceneProjects(roots).length,
    webProjects: listWebProjects(roots).length,
    upload: uploadStatus(),
    ffmpeg: ffmpeg.ffmpeg,
    cache: frameCacheStatus(),
    settings: { revision: readSettings().revision },
    // v0.6.0 (additive): local Wallpaper Engine library discovery. `found:false`
    // with `count:0` is the honest answer for a machine without WE.
    weLibrary: weLibraryStatus(),
    capabilities: {
      settings: true,
      bundle: true,
      frameCache: true,
      transcode: ffmpeg.ffmpeg,
      webWallpapers: true,
      weLibrary: true,
    },
  }
}

function handle(req, res) {
  const url = new URL(req.url ?? '/', 'http://localhost')
  let rest = url.pathname
  if (rest.startsWith(ROUTE)) rest = rest.slice(ROUTE.length)
  rest = rest.replace(/^\/+/, '')

  if (rest === '_we-roots') {
    if (req.method === 'POST') writeRoots(req, res)
    else sendJson(res, 200, { roots: readRoots() })
    return
  }

  // ---- v0.5.0 host routes (contract §6 order) ----
  // Each module owns its method gate and its own failure status: the shared
  // GET/HEAD gate below would turn every write route into a blanket 405.
  if (rest === '_settings') {
    handleSettings(req, res)
    return
  }
  if (rest === '_bundle') {
    handleBundle(req, res, { build: BUILD })
    return
  }
  if (rest === '_import') {
    handleImport(req, res)
    return
  }
  if (rest === '_frame-cache') {
    handleFrameCache(req, res, url)
    return
  }
  if (rest === '_frame-cache/status') {
    handleFrameCacheStatus(req, res)
    return
  }
  if (rest === '_transcode') {
    handleTranscode(req, res, url)
    return
  }
  if (rest === '_transcode/status') {
    handleTranscodeStatus(req, res)
    return
  }

  // Upload is the one write endpoint that is not JSON. It has to run before the
  // GET/HEAD gate, and it owns its own body limits and response framing.
  if (rest === '_upload') {
    if (req.method !== 'POST') {
      sendText(res, 405, 'method not allowed')
      return
    }
    receiveUpload(req, res, url.searchParams.get('name'), sendJson)
    return
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    sendText(res, 405, 'method not allowed')
    return
  }

  if (rest === '_manifest') {
    sendJson(res, 200, { assets: listAssets() })
    return
  }

  if (rest === '_wallpapers') {
    sendJson(res, 200, {
      items: [
        ...listWallpapers(),
        ...listExternalWallpapers(),
        ...listSceneProjects(readRoots()),
        ...listWebProjects(readRoots()),
        ...listDerived(),
        // v0.6.0: the real Wallpaper Engine library, appended so every existing
        // source keeps its position/id even when WE is absent (then: no items).
        ...listWeSkinItems(),
      ],
    })
    return
  }

  // ---- optional WebWallGL scene engine ----
  if (rest === '_engines') {
    sendJson(res, 200, buildEngineStatus(url))
    return
  }
  if (rest === '_engine/webwallgl.js') {
    serveTextFile(req, res, ENGINE_FILE, 'text/javascript; charset=utf-8')
    return
  }
  if (rest === '_scene-frame') {
    // The iframe itself is sandboxed by the client; the CSP is the second lock:
    // opaque origin, no framing, no top navigation, no form posts.
    serveTextFile(req, res, SCENE_FRAME, 'text/html; charset=utf-8', {
      'content-security-policy':
        "default-src 'none'; script-src * 'unsafe-inline' 'unsafe-eval'; style-src 'unsafe-inline'; connect-src *; img-src * data: blob:; media-src * blob:; font-src * data:; worker-src * blob:; frame-src 'none'; object-src 'none'; base-uri 'none'; sandbox allow-scripts",
      'referrer-policy': 'no-referrer',
    })
    return
  }
  // Scene project files. Each path segment is validated again; only media/asset
  // extensions are served, and CORS is open because the adapter is opaque-origin.
  if (rest.startsWith('_scene-project/')) {
    const parts = rest.split('/')
    const index = Number(parts[1])
    const dirName = parts[2]
    const projectDir = resolveSceneDir(readRoots(), index, dirName)
    const filePath = projectDir === null ? null : sceneFilePath(projectDir, parts.slice(3))
    if (filePath === null) {
      sendText(res, 404, 'not found')
      return
    }
    servePath(req, res, filePath, basename(filePath), {
      'access-control-allow-origin': '*',
      'cross-origin-resource-policy': 'cross-origin',
    })
    return
  }

  // Wallpaper Engine web projects (A3): an opaque-origin page plus its assets.
  // Segment validation happens inside the module again; discovery is not a gate.
  if (rest.startsWith('_web-project/')) {
    handleWebProject(req, res, rest, readRoots())
    return
  }

  // User uploads: uploads/<fileName>, served through the same Range pipeline.
  if (rest.startsWith('uploads/')) {
    const parts = rest.split('/')
    if (parts.length !== 2) {
      sendText(res, 404, 'not found')
      return
    }
    const filePath = uploadPath(parts[1])
    if (filePath === null) {
      sendText(res, 404, 'not found')
      return
    }
    servePath(req, res, filePath, parts[1])
    return
  }

  // ffmpeg derivatives: derived/<fileName>. Written only by `_transcode`.
  if (rest.startsWith('derived/')) {
    const parts = rest.split('/')
    if (parts.length !== 2) {
      sendText(res, 404, 'not found')
      return
    }
    const filePath = derivedPath(parts[1])
    if (filePath === null) {
      sendText(res, 404, 'not found')
      return
    }
    servePath(req, res, filePath, parts[1])
    return
  }

  // Extra wallpaper roots, addressed as ext/<rootIndex>/<fileName>.
  if (rest.startsWith('ext/')) {
    const parts = rest.split('/')
    const index = Number(parts[1])
    const roots = readRoots()
    if (parts.length !== 3 || Number.isInteger(index) === false || index < 0 || index >= roots.length) {
      sendText(res, 404, 'not found')
      return
    }
    const filePath = safeJoin(roots[index], parts[2])
    if (filePath === null) {
      sendText(res, 404, 'not found')
      return
    }
    servePath(req, res, filePath, parts[2])
    return
  }

  if (rest === '' || rest.includes('/') || SAFE_NAME.test(rest) === false) {
    sendText(res, 404, 'not found')
    return
  }

  serveAsset(req, res, rest)
}

/** Package-local assets: identical serving, path rooted at assets/. */
function serveAsset(req, res, name) {
  servePath(req, res, join(ASSET_DIR, name), name)
}

/**
 * Registers both prefix routes on the web-server carrier: the skin's own asset
 * routes and the vendored Wallpaper Engine library bridge. The carrier service is
 * optional from this row's point of view (it is absent in non-Web profiles), so
 * it is resolved through `get()` and re-entered once injected. One effect owns
 * both registrations, so disposal also stops a running scene-video recorder.
 */
function bindRoutes(ctx) {
  const carrier = ctx.get('webServer')
  if (carrier === undefined) {
    ctx.inject(['webServer'], (webCtx) => bindRoutes(webCtx))
    return
  }
  ctx.effect(
    () => {
      // The WE prefix is registered first on purpose: tools/verify.mjs captures
      // the *last* registered handler as the skin route, and that harness
      // contract predates this second prefix. A real carrier is a route map and
      // does not care about order.
      const disposeWe = carrier.register({ kind: 'prefix', path: WE_API_PREFIX, handler: WE_HANDLER })
      const disposeSkin = carrier.register({ kind: 'prefix', path: ROUTE, handler: handle })
      return () => {
        try {
          if (typeof disposeWe === 'function') disposeWe()
        } catch {
          // carrier may have removed it already
        }
        try {
          if (typeof disposeSkin === 'function') disposeSkin()
        } catch {
          // carrier may have removed it already
        }
        try {
          disposeSceneVideoCapture()
        } catch {
          // teardown must never throw out of the skin's disposer
        }
      }
    },
    'ui-skin-tianlight: asset + we-wallpaper routes',
  )
}

function apply(ctx) {
  bindRoutes(ctx)
}

export { apply }
/**
 * Test hooks. The loader only ever calls `apply`, so extra named exports are inert
 * at runtime; they exist so the pure logic (range parsing, wallpaper discovery,
 * engine capabilities) can be regression-tested without booting DSH.
 */
export const __test = {
  parseRange,
  listWallpapers,
  listAssets,
  safeJoin,
  readRoots,
  SAFE_NAME,
  VIDEO_EXT,
  IMAGE_EXT,
  fileSize,
  engineStatus: buildEngineStatus,
  readSettings,
  // v0.6.0 WE library bridge (re-exported so tests need one import).
  listWeSkinItems,
  weLibraryStatus,
}
