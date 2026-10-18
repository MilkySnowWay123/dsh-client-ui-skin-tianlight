// Host loader entry for the TIANLIGHT skin.
//
// The skin's browser half needs large binary assets (a looping video wallpaper
// and character art) that must NOT be inlined into `lib/client.js`. The client
// module carrier only serves bundles, so this host half owns one prefix route
// and streams files out of `assets/` with byte-range support, which is what lets
// `<video>` start playing before the whole file has arrived.

import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ASSET_DIR, IMAGE_EXT, ROUTE, SAFE_NAME, VIDEO_EXT, fileSize, safeJoin } from './media-types.js'
import { parseRange, sendJson, sendText, servePath, serveTextFile } from './http-media.js'
import { listUploads, receiveUpload, uploadPath, uploadStatus } from './upload.js'
import { listSceneProjects, resolveSceneDir, sceneFilePath } from './scene-project.js'

const HERE = dirname(fileURLToPath(import.meta.url))

/** Optional scene engine + its adapter page. Both may be absent in a slim install. */
const ENGINE_FILE = resolve(HERE, '..', 'vendor', 'webwallgl', 'webwallgl.global.min.js')
const SCENE_FRAME = resolve(HERE, 'scene-frame.html')

/** Optional list of extra wallpaper directories (e.g. Wallpaper Engine projects). */
const ROOTS_FILE = resolve(HERE, '..', 'we-roots.json')

function readRoots() {
  try {
    const value = JSON.parse(readFileSync(ROOTS_FILE, 'utf8'))
    if (!Array.isArray(value)) return []
    return value.filter((entry) => typeof entry === 'string' && entry.trim() !== '').map((entry) => resolve(entry))
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
 */
function writeRoots(req, res) {
  const chunks = []
  let size = 0
  req.on('data', (chunk) => {
    size += chunk.length
    if (size > 8192) {
      req.destroy()
      return
    }
    chunks.push(chunk)
  })
  req.on('end', () => {
    let roots
    try {
      const value = JSON.parse(Buffer.concat(chunks).toString('utf8'))
      if (!Array.isArray(value)) throw new Error('expected an array')
      roots = value
        .filter((entry) => typeof entry === 'string' && entry.trim() !== '')
        .map((entry) => resolve(entry.trim()))
        .filter((entry) => {
          try {
            return statSync(entry).isDirectory()
          } catch {
            return false
          }
        })
        .slice(0, 20)
      writeFileSync(ROOTS_FILE, JSON.stringify(roots, null, 2), 'utf8')
    } catch {
      sendText(res, 400, 'invalid roots payload')
      return
    }
    sendJson(res, 200, { roots })
  })
  req.on('error', () => {
    try {
      res.destroy()
    } catch {
      // ignore
    }
  })
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
    sendJson(res, 200, { items: [...listWallpapers(), ...listExternalWallpapers(), ...listSceneProjects(readRoots())] })
    return
  }

  // ---- optional WebWallGL scene engine ----
  if (rest === '_engines') {
    sendJson(res, 200, {
      build: '0.1.0+upload-20261018',
      webwallgl: existsSync(ENGINE_FILE),
      adapter: existsSync(SCENE_FRAME),
      sceneProjects: listSceneProjects(readRoots()).length,
      upload: uploadStatus(),
    })
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
 * Registers the asset route. The carrier service is optional from this row's
 * point of view (it is absent in non-Web profiles), so it is resolved through
 * `get()` and re-entered once injected, never through an undeclared property.
 */
function bindRoute(ctx) {
  const carrier = ctx.get('webServer')
  if (carrier === undefined) {
    ctx.inject(['webServer'], (webCtx) => bindRoute(webCtx))
    return
  }
  ctx.effect(
    () => carrier.register({ kind: 'prefix', path: ROUTE, handler: handle }),
    'ui-skin-tianlight: asset route',
  )
}

function apply(ctx) {
  bindRoute(ctx)
}

export { apply }
/**
 * Test hooks. The loader only ever calls `apply`, so extra named exports are inert
 * at runtime; they exist so the pure logic (range parsing, wallpaper discovery) can
 * be regression-tested without booting DSH.
 */
export const __test = { parseRange, listWallpapers, listAssets, safeJoin, readRoots, SAFE_NAME, VIDEO_EXT, IMAGE_EXT, fileSize }
