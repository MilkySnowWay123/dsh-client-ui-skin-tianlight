// Shared media policy for the TIANLIGHT host half.
//
// These tables used to live inside index.js. They are shared by the asset route,
// the wallpaper catalog and the upload sink, and a second copy of an extension
// list is exactly how "the upload accepted a format the player cannot decode"
// bugs happen. One table, imported by every route.

import { statSync } from 'node:fs'
import { dirname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
/** Package-local binary directory; uploads live one level below it. */
export const ASSET_DIR = resolve(HERE, '..', 'assets')

export const ROUTE = '/skin-tianlight'

export const MIME = {
  '.mp4': 'video/mp4',
  '.m4v': 'video/mp4',
  '.mov': 'video/quicktime',
  '.webm': 'video/webm',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
}

export const VIDEO_EXT = new Set(['.mp4', '.webm', '.mov', '.m4v'])
export const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.avif', '.gif', '.svg'])

/** One path segment only: no separators, no traversal, no hidden control chars. */
export const SAFE_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*$/

/**
 * Resolves `name` inside `root` and proves the result stays inside it. Symlinks and
 * `..` are both defeated by comparing the RESOLVED path against the resolved root
 * with a trailing separator, which is the only containment test that cannot be
 * fooled by a crafted filename.
 */
export function safeJoin(root, name) {
  if (typeof name !== 'string' || SAFE_NAME.test(name) === false) return null
  const joined = resolve(root, name)
  const prefix = root.endsWith(sep) ? root : root + sep
  return joined.startsWith(prefix) ? joined : null
}

/** Card metadata: size is cheap (one stat) and lets the library show real weight. */
export function fileSize(filePath) {
  try {
    const info = statSync(filePath)
    return info.isFile() ? info.size : 0
  } catch {
    return 0
  }
}
