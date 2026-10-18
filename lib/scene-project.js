// Wallpaper Engine scene projects exposed to the optional WebWallGL engine.
//
// A scene project is a *directory* (workshop folders are numeric IDs, so the name
// policy is the same strict SAFE_NAME used everywhere else). The browser never
// lists a raw filesystem: it asks for one project index, the host resolves it
// against the configured roots, and every sub-path is re-validated per segment.
//
// Loose-scene subfolders (`textures/…`) are allowed because WebWallGL fetches
// them relative to the project URL; only media/asset extensions are served, so
// a project directory cannot be used to read arbitrary files even if a name
// somehow slips through the segment check.

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve, sep } from 'node:path'
import { ROUTE, SAFE_NAME, fileSize } from './media-types.js'

/** Extensions a scene renderer may legitimately request. No HTML/JS/EXE. */
export const SCENE_FILE_EXT = new Set([
  '.json',
  '.pkg',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.avif',
  '.gif',
  '.svg',
  '.tex',
  '.mp4',
  '.webm',
  '.mov',
  '.m4v',
  '.mp3',
  '.ogg',
  '.wav',
  '.flac',
  '.ttf',
  '.otf',
  '.glb',
  '.gltf',
  '.bin',
  '.mdl',
  '.obj',
  '.fbx',
  '.dae',
  '.stl',
  '.ply',
  '.3ds',
  '.cur',
])

/** Directory names are URL segments too, so they get the strict policy. */
export function resolveSceneDir(roots, index, dir) {
  if (Array.isArray(roots) === false) return null
  if (Number.isInteger(index) === false || index < 0 || index >= roots.length) return null
  if (typeof dir !== 'string' || SAFE_NAME.test(dir) === false) return null
  const target = join(roots[index], dir)
  try {
    if (statSync(target).isDirectory() === false) return null
    if (existsSync(join(target, 'project.json')) === false) return null
  } catch {
    return null
  }
  return target
}

/** Resolve `segments` inside an already-validated project directory. */
export function sceneFilePath(projectDir, segments) {
  if (Array.isArray(segments) === false || segments.length === 0) return null
  const base = resolve(projectDir)
  const prefix = base.endsWith(sep) ? base : base + sep
  let current = base
  for (const raw of segments) {
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
  if (SCENE_FILE_EXT.has(ext) === false) return null
  return current
}

/** Scene projects found under the configured roots, as panel items. */
export function listSceneProjects(roots) {
  const items = []
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
      let project = null
      try {
        project = JSON.parse(readFileSync(join(dir, 'project.json'), 'utf8'))
      } catch {
        continue
      }
      if (project === null || typeof project !== 'object') continue
      const type = String(project.type ?? 'scene').toLowerCase()
      if (type !== 'scene') continue
      const file = typeof project.file === 'string' ? project.file : 'scene.pkg'
      if (SAFE_NAME.test(file) === false || existsSync(join(dir, file)) === false) continue
      const previewName =
        typeof project.preview === 'string' && SAFE_NAME.test(project.preview) ? project.preview : 'preview.jpg'
      const preview = existsSync(join(dir, previewName))
        ? ROUTE + '/_scene-project/' + index + '/' + entry.name + '/' + previewName
        : ''
      items.push({
        id: 'scene:' + index + ':' + entry.name,
        kind: 'scene',
        url: ROUTE + '/_scene-project/' + index + '/' + entry.name,
        title: typeof project.title === 'string' && project.title.trim() !== '' ? project.title.trim().slice(0, 80) : entry.name,
        preview,
        bytes: fileSize(join(dir, file)),
        dir: entry.name,
      })
    }
  })
  return items
}
