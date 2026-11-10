// Wallpaper Engine *web* projects behind `_web-project/…` (v0.5.0 contract §6, A3).
//
// Wallpaper Engine distinguishes "scene" projects (WebWallGL) from "web" projects
// (an HTML page plus assets). The browser half renders a web project in an
// opaque-origin iframe; the host half only has to serve the page and its files
// faithfully, and to make sure the directory can never be used for anything else.
//
// Policy:
//   - a project is a directory under a configured WE root whose project.json says
//     `type: "web"` (or names an `.html` entry file);
//   - only a fixed extension allow-list is served; no listable directories, no
//     executable/SVG-text tricks beyond what a sandboxed document can already do;
//   - every request resolves per segment against the project root (encoded `..`,
//     absolute names and separators are all refused);
//   - documents carry a strict CSP with `sandbox allow-scripts` — the same
//     opaque-origin guarantee the scene adapter has.

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { basename, join, resolve, sep } from 'node:path'
import { ROUTE, SAFE_NAME } from './media-types.js'
import { servePath, sendText } from './http-media.js'

/** Extensions a web wallpaper page may load. No archives, no executables. */
export const WEB_FILE_EXT = new Set([
  '.html',
  '.js',
  '.mjs',
  '.css',
  '.json',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.gif',
  '.svg',
  '.woff',
  '.woff2',
  '.mp3',
  '.ogg',
  '.wav',
  '.mp4',
  '.webm',
  '.wasm',
])

/** Contract §6 CSP: opaque origin, no top navigation, no forms, no plugins. */
export const WEB_CSP =
  "default-src 'none'; script-src * 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval'; " +
  "style-src * 'unsafe-inline'; img-src * data: blob:; media-src * blob:; font-src * data:; " +
  "connect-src *; frame-src 'none'; object-src 'none'; base-uri 'none'; sandbox allow-scripts"

const MAX_SEGMENTS = 12
const PREVIEW_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif'])

function readProjectJson(dir) {
  try {
    const value = JSON.parse(readFileSync(join(dir, 'project.json'), 'utf8'))
    if (value === null || typeof value !== 'object' || Array.isArray(value)) return null
    return value
  } catch {
    return null
  }
}

/** `type: "web"` wins; an `.html` entry file is the fallback heuristic. */
export function isWebProject(project) {
  if (project === null || typeof project !== 'object') return false
  if (typeof project.type === 'string' && project.type.toLowerCase() === 'web') return true
  return typeof project.file === 'string' && /\.html$/i.test(project.file)
}

/** The page a web project opens: its declared `.html` file or index.html. */
export function projectEntryName(project) {
  const file = typeof project?.file === 'string' ? project.file : ''
  if (file !== '' && SAFE_NAME.test(file) && /\.html$/i.test(file)) return file
  return 'index.html'
}

/** Resolve `<rootIndex>/<dir>` to a validated web project directory. */
export function resolveWebProjectDir(roots, index, dir) {
  if (Array.isArray(roots) === false) return null
  if (Number.isInteger(index) === false || index < 0 || index >= roots.length) return null
  if (typeof dir !== 'string' || SAFE_NAME.test(dir) === false) return null
  const target = join(roots[index], dir)
  try {
    if (statSync(target).isDirectory() === false) return null
  } catch {
    return null
  }
  return isWebProject(readProjectJson(target)) ? target : null
}

/**
 * Resolve requested segments inside an already-validated project directory.
 * An empty path means the project entry page (index.html by default) — a request
 * for a directory never produces a listing.
 */
export function webProjectFilePath(projectDir, segments) {
  const base = resolve(projectDir)
  const prefix = base.endsWith(sep) ? base : base + sep
  const list = Array.isArray(segments) ? segments : []
  if (list.length === 0) {
    const entry = projectEntryName(readProjectJson(base))
    if (SAFE_NAME.test(entry) === false) return null
    return join(base, entry)
  }
  if (list.length > MAX_SEGMENTS) return null
  let current = base
  for (const raw of list) {
    let segment = raw
    try {
      segment = decodeURIComponent(raw)
    } catch {
      return null
    }
    if (SAFE_NAME.test(segment) === false) return null
    current = resolve(current, segment)
    if (current.startsWith(prefix) === false) return null
  }
  const ext = current.slice(current.lastIndexOf('.')).toLowerCase()
  if (WEB_FILE_EXT.has(ext) === false) return null
  return current
}

function projectPreviewUrl(rootIndex, dirName, dir, project) {
  const preview = typeof project?.preview === 'string' ? project.preview : ''
  if (preview === '' || SAFE_NAME.test(preview) === false) return ''
  const ext = preview.slice(preview.lastIndexOf('.')).toLowerCase()
  if (PREVIEW_EXT.has(ext) === false) return ''
  if (existsSync(join(dir, preview)) === false) return ''
  return ROUTE + '/_web-project/' + rootIndex + '/' + dirName + '/' + preview
}

/** Web projects found under the configured roots, as `_wallpapers` items. */
export function listWebProjects(roots) {
  const items = []
  if (Array.isArray(roots) === false) return items
  roots.forEach((root, index) => {
    let entries = []
    try {
      entries = readdirSync(root, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      if (entry.isDirectory() === false || SAFE_NAME.test(entry.name) === false) continue
      const dir = join(root, entry.name)
      const project = readProjectJson(dir)
      if (isWebProject(project) === false) continue
      const entryName = projectEntryName(project)
      const entryPath = join(dir, entryName)
      let info
      try {
        info = statSync(entryPath)
      } catch {
        continue
      }
      if (info.isFile() === false) continue
      const title = typeof project.title === 'string' && project.title.trim() !== '' ? project.title.trim().slice(0, 80) : entry.name
      items.push({
        id: 'web:' + index + ':' + entry.name,
        kind: 'web',
        url: ROUTE + '/_web-project/' + index + '/' + entry.name,
        title,
        preview: projectPreviewUrl(index, entry.name, dir, project),
        bytes: info.size,
        dir: entry.name,
        file: entryName,
      })
    }
  })
  return items
}

/**
 * GET/HEAD `_web-project/<rootIndex>/<dir>[/<subpath>]`. Each segment is
 * re-validated here, so the discovery list is not the only line of defence.
 */
export function handleWebProject(req, res, rest, roots) {
  const tail = rest.slice('_web-project/'.length)
  const parts = tail.split('/')
  while (parts.length > 0 && parts[parts.length - 1] === '') parts.pop()
  if (parts.length < 2) {
    sendText(res, 404, 'not found')
    return
  }
  const index = Number(parts[0])
  const dirName = parts[1]
  const projectDir = resolveWebProjectDir(roots, index, dirName)
  if (projectDir === null) {
    sendText(res, 404, 'not found')
    return
  }
  const filePath = webProjectFilePath(projectDir, parts.slice(2))
  if (filePath === null) {
    sendText(res, 404, 'not found')
    return
  }
  servePath(req, res, filePath, basename(filePath), {
    'content-security-policy': WEB_CSP,
    'access-control-allow-origin': '*',
    'cross-origin-resource-policy': 'cross-origin',
    'referrer-policy': 'no-referrer',
    'x-content-type-options': 'nosniff',
  })
}
