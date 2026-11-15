// Host routes: the wallpaper catalog, the extra wallpaper roots file, and the
// `ext/<rootIndex>/<fileName>` media prefix.
//
// Extracted from lib/index.js in v2.1.8 (the handle() split). Route handlers keep the
// dispatch signature `(ctx, req, res, url, rest, host)`; the exact/prefix maps are
// assembled by lib/index.js's dispatch table in its original order.
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { isAbsolute, join, resolve } from 'node:path'
import { ASSET_DIR, ROUTE, SAFE_NAME, fileSize, mediaKindFromName, safeJoin } from '../media-types.js'
import { WE_ROOTS_FILE } from '../host-paths.js'
import { sendJson, sendText, servePath } from '../http-media.js'
import { listUploads } from '../upload.js'
import { listSceneProjects } from '../scene-project.js'
import { listWebProjects } from '../web-project.js'
import { listDerived } from '../transcode.js'
import { listWeSkinItems } from '../we-wallpaper/host.mjs'

/** The companion art is not a wallpaper candidate. */
const COMPANION = 'cat.png'

function readRoots() {
  try {
    const value = JSON.parse(readFileSync(WE_ROOTS_FILE, 'utf8'))
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
      const kind = mediaKindFromName(name)
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

/**
 * Every file in `assets/` a user could reasonably drop in as a wallpaper. Drop a
 * file, reload, it appears in the list: no config, no manifest edit. Videos rank
 * first because the skin is built around a moving picture, stills are the fallback.
 */
function listWallpapers() {
  const items = []
  for (const name of listAssets()) {
    if (name === COMPANION) continue
    const kind = mediaKindFromName(name)
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
      writeFileSync(WE_ROOTS_FILE, JSON.stringify(roots, null, 2), 'utf8')
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

export const exact = {
  '_we-roots': (ctx, req, res) => {
    if (req.method === 'POST') writeRoots(req, res)
    else sendJson(res, 200, { roots: readRoots() })
  },
  _wallpapers: (ctx, req, res) => {
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
  },
}

export const prefix = [
  [
    'ext/',
    (ctx, req, res, rest) => {
      // Extra wallpaper roots, addressed as ext/<rootIndex>/<fileName>.
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
    },
  ],
]

export { listAssets, listExternalWallpapers, listWallpapers, readRoots }
