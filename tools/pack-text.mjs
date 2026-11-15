// Text-file line-ending normalization for the distributable package.
//
// The repository stores every text file with LF (`.gitattributes` eol=lf), but a
// Windows checkout with core.autocrlf=true can still hand pack.mjs CRLF bytes for
// files Git considers clean. Copying those bytes made the npm tarball differ from
// the GitHub Release tarball built on Linux: 44/48 per-file hashes matched even
// though nothing in the plugin had changed. Normalize after copying so the same
// commit packs byte-identically on every platform.
//
// Only known text extensions/names are touched; media and executables are copied
// verbatim, and a file containing NUL bytes is always treated as binary.
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { basename, extname, join } from 'node:path'

export const TEXT_EXTENSIONS = new Set([
  '.js', '.mjs', '.cjs', '.json', '.md', '.txt', '.yml', '.yaml',
  '.html', '.htm', '.css', '.ps1', '.cmd', '.bat', '.xml', '.svg',
])
const TEXT_NAMES = new Set(['LICENSE', 'NOTICE', 'COPYING', 'README', 'CHANGELOG'])

export function isTextPath(filePath) {
  const name = basename(String(filePath))
  const extension = extname(name).toLowerCase()
  return TEXT_EXTENSIONS.has(extension) || TEXT_NAMES.has(name) || name.startsWith('LICENSE.')
}

/** LF-only buffer; binary (NUL-containing) and already-LF buffers are returned as-is. */
export function normalizeTextBuffer(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.includes(0)) return buffer
  const text = buffer.toString('utf8')
  const normalized = text.replace(/\r\n/g, '\n')
  return normalized === text ? buffer : Buffer.from(normalized, 'utf8')
}

/**
 * Walk a packaged tree and rewrite CRLF text files as LF. Returns the number of
 * files whose bytes changed (0 on an LF-only checkout / Linux CI).
 */
export function normalizeTextTree(root) {
  let changed = 0
  for (const name of readdirSync(root)) {
    const full = join(root, name)
    const info = statSync(full)
    if (info.isDirectory()) {
      changed += normalizeTextTree(full)
      continue
    }
    if (!isTextPath(full)) continue
    const buffer = readFileSync(full)
    const normalized = normalizeTextBuffer(buffer)
    if (normalized !== buffer) {
      writeFileSync(full, normalized)
      changed += 1
    }
  }
  return changed
}
