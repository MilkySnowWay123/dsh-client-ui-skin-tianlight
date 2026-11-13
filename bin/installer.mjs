// One-command installer core for `npx dsh-client-ui-skin-tianlight`.
//
// npx has already downloaded (and integrity-checked) the published package into the
// npm cache before this code runs, so installing is purely local:
//   1. find $DSH_HOME and the target profile (desktop by default);
//   2. back up the profile manifest (+ pnpm lock/workspace files);
//   3. register the package the same way the DSH plugin manager does: an exact
//      registry version in `dependencies` and one entry in `dsh.profile.bundles`
//      (legacy package names are unregistered, never deleted);
//   4. copy this package's published files into <profile>/node_modules/<name>,
//      staged in a temp dir and swapped in, then verified byte-for-byte.
//
// The bundle's own cordis.patch.yml inserts the `ui-skin-tianlight` row, so nothing is
// ever written to any cordis.patch.yml. User data (<profile>/tianlight/) is never
// touched by install or uninstall. Everything here is pure Node (no dependencies) so
// tools/test.mjs can drive it against a temporary fake DSH home.
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  readlinkSync,
  realpathSync,
  renameSync,
  rmdirSync,
  rmSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
import { homedir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const PKG_NAME = 'dsh-client-ui-skin-tianlight'
export const ROW_ID = 'ui-skin-tianlight'
/** Old names that must not stay registered next to the current one (double mount). */
export const LEGACY_PACKAGES = ['@dsh-external/dsh-client-ui-skin-tianlight', '@local/dsh-enable-tianlight']
export const INSTALLER_DIR = '.tianlight-installer'
const KEEP_BACKUPS = 3

/** Root of the package this file ships in (bin/.. ). */
export const SELF_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

export function readJson(file) {
  return JSON.parse(readFileSync(file, 'utf8'))
}

/** Write via temp file + rename so a crash never leaves half a manifest behind. */
export function writeJsonAtomic(file, value) {
  const tmp = `${file}.tl-tmp-${process.pid}`
  writeFileSync(tmp, JSON.stringify(value, null, 2) + '\n', 'utf8')
  renameSync(tmp, file)
}

// ---- locating DSH -----------------------------------------------------------

/** `\\server\share` / `//server/share` (and `\\?\UNC\...`): network locations are refused. */
export function isUncPath(value) {
  return typeof value === 'string' && /^(?:\\\\|\/\/)/.test(value.trim())
}

export function resolveDshHome({ dshHome = null, env = process.env, home = homedir() } = {}) {
  if (typeof dshHome === 'string' && dshHome.trim() !== '') return resolve(dshHome.trim())
  if (typeof env.DSH_HOME === 'string' && env.DSH_HOME.trim() !== '') return resolve(env.DSH_HOME.trim())
  return join(home, '.dsh')
}

/** Profiles = directories under <home>/profiles that carry a package.json. */
export function listProfiles(dshHome) {
  const root = join(dshHome, 'profiles')
  if (existsSync(root) === false) return []
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(join(root, entry.name, 'package.json')))
    .map((entry) => entry.name)
    .sort()
}

/**
 * Explicit --profile wins; otherwise `desktop` (DSH Desktop's profile); otherwise the
 * only profile. Returns {ok, profile} or {ok:false, reason, profiles}.
 */
export function pickProfile(profiles, requested = null) {
  if (typeof requested === 'string' && requested !== '') {
    return profiles.includes(requested) ? { ok: true, profile: requested } : { ok: false, reason: 'profile-missing', profiles }
  }
  if (profiles.includes('desktop')) return { ok: true, profile: 'desktop' }
  if (profiles.length === 1) return { ok: true, profile: profiles[0] }
  if (profiles.length === 0) return { ok: false, reason: 'no-profiles', profiles }
  return { ok: false, reason: 'profile-ambiguous', profiles }
}

/** `tasklist /FO CSV /NH` output -> is the DSH Desktop image running? */
export function tasklistHasDsh(stdout) {
  return String(stdout)
    .split(/\r?\n/)
    .some((line) => line.toLowerCase().startsWith('"deepseek harness.exe"'))
}

/**
 * `ps -A -o pid=,comm=` output -> is a DSH process running? Matches the process NAME
 * only (never full command lines, which would match this installer when a path
 * contains "DeepSeek Harness") and ignores the given own pids.
 */
export function psHasDsh(stdout, ownPids = []) {
  return String(stdout)
    .split(/\r?\n/)
    .some((line) => {
      const match = /^\s*(\d+)\s+(.+)$/.exec(line)
      if (match === null || ownPids.includes(Number(match[1]))) return false
      const name = match[2].trim().split('/').pop()
      return /^deepseek[ -]harness/i.test(name)
    })
}

/** true / false / null (unknown). DSH must be closed: open files make Windows refuse the swap (EPERM). */
export function isDshRunning(platform = process.platform) {
  try {
    if (platform === 'win32') {
      const result = spawnSync('tasklist', ['/FO', 'CSV', '/NH'], { encoding: 'utf8', windowsHide: true })
      if (result.status !== 0 || typeof result.stdout !== 'string') return null
      return tasklistHasDsh(result.stdout)
    }
    const result = spawnSync('ps', ['-A', '-o', 'pid=,comm='], { encoding: 'utf8' })
    if (result.status !== 0 || typeof result.stdout !== 'string') return null
    return psHasDsh(result.stdout, [process.pid, process.ppid])
  } catch {
    return null
  }
}

// ---- manifest planning (pure) -------------------------------------------------

function bundlesOf(manifest) {
  const bundles = manifest?.dsh?.profile?.bundles
  return Array.isArray(bundles) ? bundles : null
}

/**
 * Returns {ok, manifest, changes} with a NEW manifest object (input untouched).
 * Refuses a manifest without dsh.profile.bundles: that is not a DSH profile and the
 * base bundles cannot be guessed.
 */
export function planInstall(manifest, version) {
  const next = JSON.parse(JSON.stringify(manifest))
  const bundles = bundlesOf(next)
  if (bundles === null) return { ok: false, reason: 'not-a-profile', changes: [] }
  const changes = []
  if (next.dependencies === undefined || next.dependencies === null || typeof next.dependencies !== 'object') {
    next.dependencies = {}
  }
  for (const legacy of LEGACY_PACKAGES) {
    if (Object.prototype.hasOwnProperty.call(next.dependencies, legacy)) {
      delete next.dependencies[legacy]
      changes.push({ kind: 'legacy-dependency-removed', name: legacy })
    }
    const at = bundles.indexOf(legacy)
    if (at >= 0) {
      bundles.splice(at, 1)
      changes.push({ kind: 'legacy-bundle-removed', name: legacy })
    }
  }
  const previous = next.dependencies[PKG_NAME]
  if (previous !== version) {
    next.dependencies[PKG_NAME] = version
    changes.push({ kind: 'dependency-set', from: previous ?? null, to: version })
  }
  if (bundles.includes(PKG_NAME) === false) {
    bundles.push(PKG_NAME)
    changes.push({ kind: 'bundle-added' })
  }
  return { ok: true, manifest: next, changes }
}

export function planUninstall(manifest) {
  const next = JSON.parse(JSON.stringify(manifest))
  const bundles = bundlesOf(next)
  const changes = []
  for (const name of [PKG_NAME, ...LEGACY_PACKAGES]) {
    if (next.dependencies && Object.prototype.hasOwnProperty.call(next.dependencies, name)) {
      delete next.dependencies[name]
      changes.push({ kind: 'dependency-removed', name })
    }
    if (bundles !== null) {
      const at = bundles.indexOf(name)
      if (at >= 0) {
        bundles.splice(at, 1)
        changes.push({ kind: 'bundle-removed', name })
      }
    }
  }
  return { ok: true, manifest: next, changes }
}

// ---- cordis patch scan (read-only) ------------------------------------------

/**
 * Finds `ui-skin-tianlight` rows in a cordis.patch.yml text. Each top-level list
 * item is one block; a block that targets the row and sets `disabled: true` keeps the
 * skin off, and a block that inserts the row by hand double-mounts it.
 */
export function scanPatchText(text) {
  const findings = []
  const blocks = String(text).replace(/\r\n/g, '\n').split(/\n(?=- )/)
  const rowPattern = new RegExp(`id:\\s*['"]?${ROW_ID}['"]?\\s*$`, 'm')
  for (const block of blocks) {
    if (rowPattern.test(block) === false) continue
    if (/^\s*disabled:\s*true\s*$/m.test(block)) findings.push('disabled')
    if (/^-\s*insert:/m.test(block)) findings.push('manual-insert')
  }
  return findings
}

export function scanPatches(dshHome, profileDir) {
  const result = []
  for (const file of [join(dshHome, 'cordis.patch.yml'), join(profileDir, 'cordis.patch.yml')]) {
    if (existsSync(file) === false) continue
    for (const finding of scanPatchText(readFileSync(file, 'utf8'))) result.push({ file, finding })
  }
  return result
}

// ---- package files ----------------------------------------------------------

/** The published file list: package.json + `files` (only entries that exist). */
export function packageEntries(srcRoot = SELF_ROOT) {
  const manifest = readJson(join(srcRoot, 'package.json'))
  const listed = Array.isArray(manifest.files) ? manifest.files : []
  return ['package.json', ...listed.filter((entry) => entry !== 'package.json')].filter((entry) =>
    existsSync(join(srcRoot, entry)),
  )
}

function walkFiles(root, rel = '') {
  const out = []
  const full = join(root, rel)
  const info = statSync(full)
  if (info.isDirectory() === false) return [rel]
  for (const name of readdirSync(full).sort()) out.push(...walkFiles(root, rel === '' ? name : `${rel}/${name}`))
  return out
}

/** Number of files under the published entries (what install copies and verifies). */
export function countFiles(srcRoot, entries) {
  let total = 0
  for (const entry of entries) total += walkFiles(srcRoot, entry).length
  return total
}

function sha256File(file) {
  return createHash('sha256').update(readFileSync(file)).digest('hex')
}

/** Byte comparison of every published file; returns the list of differing/missing paths. */
export function compareTrees(srcRoot, targetDir, entries) {
  const problems = []
  for (const entry of entries) {
    for (const rel of walkFiles(srcRoot, entry)) {
      const target = join(targetDir, rel)
      if (existsSync(target) === false) {
        problems.push({ path: rel, problem: 'missing' })
        continue
      }
      if (rel === 'package.json') {
        // the dev-tree manifest carries `private`; installed copies drop it (like tools/pack.mjs)
        const a = readJson(join(srcRoot, rel))
        const b = readJson(target)
        delete a.private
        delete b.private
        if (JSON.stringify(a) !== JSON.stringify(b)) problems.push({ path: rel, problem: 'differs' })
        continue
      }
      if (sha256File(join(srcRoot, rel)) !== sha256File(target)) problems.push({ path: rel, problem: 'differs' })
    }
  }
  return problems
}

const samePath = (a, b, platform) => (platform === 'win32' ? a.toLowerCase() === b.toLowerCase() : a === b)

/**
 * If `path` is a link of any kind, returns where it points; otherwise null.
 * Windows junctions (what `link:` installs create) are NOT always reported by
 * lstat().isSymbolicLink(): on Node 24 they show up as plain directories and
 * readlink() fails with EINVAL. So a directory whose real path is not
 * <real parent>/<name> is treated as a link too. Anything treated as a link is only
 * ever unlinked, never renamed into backups or removed recursively.
 */
export function linkTargetOf(path, { lstat = lstatSync, realpath = realpathSync.native, platform = process.platform } = {}) {
  let info
  try {
    info = lstat(path)
  } catch {
    return null
  }
  if (info.isSymbolicLink()) {
    try {
      return realpath(path)
    } catch {
      try {
        return readlinkSync(path)
      } catch {
        return '(unresolved link)'
      }
    }
  }
  if (info.isDirectory() === false) return null
  try {
    const real = realpath(path)
    const expected = join(realpath(dirname(path)), basename(path))
    return samePath(real, expected, platform) ? null : real
  } catch {
    return null
  }
}

/** Recursive delete that unlinks links instead of descending into them. */
export function safeRemoveTree(path) {
  let info
  try {
    info = lstatSync(path)
  } catch {
    return
  }
  if (linkTargetOf(path) !== null) {
    removeLink(path)
    return
  }
  if (info.isDirectory()) {
    for (const name of readdirSync(path)) safeRemoveTree(join(path, name))
    rmdirSync(path)
    return
  }
  unlinkSync(path)
}

/** missing | link (symlink/junction, e.g. a `link:` dev install) | dir. */
export function inspectInstalled(profileDir) {
  const target = join(profileDir, 'node_modules', PKG_NAME)
  try {
    lstatSync(target)
  } catch {
    return { kind: 'missing', path: target }
  }
  const linkTarget = linkTargetOf(target)
  if (linkTarget !== null) return { kind: 'link', path: target, linkTarget }
  let version = null
  let buildInfo = null
  try {
    version = readJson(join(target, 'package.json')).version ?? null
  } catch {
    version = null
  }
  try {
    buildInfo = readJson(join(target, 'build-info.json'))
  } catch {
    buildInfo = null
  }
  return { kind: 'dir', path: target, version, buildInfo }
}

/**
 * Removes only the link itself — never recurses into a linked development tree.
 * A non-recursive rmdir on a junction/directory symlink deletes the reparse point,
 * not the target's contents; unlink covers file symlinks and POSIX links.
 */
export function removeLink(path) {
  try {
    unlinkSync(path)
  } catch {
    rmdirSync(path)
  }
  if (existsSync(path)) throw new Error('could not remove link ' + path)
}

function stampNow() {
  return new Date().toISOString().replace(/[:.]/g, '-')
}

export function makeBackupDir(profileDir) {
  const dir = join(profileDir, INSTALLER_DIR, 'backups', stampNow())
  mkdirSync(dir, { recursive: true })
  for (const name of ['package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml']) {
    const file = join(profileDir, name)
    if (existsSync(file)) cpSync(file, join(dir, name))
  }
  return dir
}

/** Keep the newest KEEP_BACKUPS backup folders (each may hold a previous package copy). */
export function pruneBackups(profileDir, keep = KEEP_BACKUPS) {
  const root = join(profileDir, INSTALLER_DIR, 'backups')
  if (existsSync(root) === false) return []
  const names = readdirSync(root).sort()
  const removed = names.slice(0, Math.max(0, names.length - keep))
  for (const name of removed) safeRemoveTree(join(root, name))
  return removed
}

/**
 * Stage the published files next to the target, move the previous copy into the
 * backup folder (a link is just unlinked), then swap the staged copy in. If the swap
 * fails the previous copy is put back.
 */
export const STAGING_PREFIX = `.${PKG_NAME}.tl-staging-`

/** v2.0.4 (L1): staging copies left behind by an interrupted/failed earlier run. */
export function cleanStaleStaging(modulesDir) {
  const removed = []
  if (existsSync(modulesDir) === false) return removed
  for (const name of readdirSync(modulesDir)) {
    if (name.startsWith(STAGING_PREFIX) === false) continue
    safeRemoveTree(join(modulesDir, name))
    removed.push(name)
  }
  return removed
}

export function installFiles({ srcRoot = SELF_ROOT, profileDir, backupDir, entries = packageEntries(srcRoot) }) {
  const modules = join(profileDir, 'node_modules')
  mkdirSync(modules, { recursive: true })
  cleanStaleStaging(modules)
  const target = join(modules, PKG_NAME)
  const staging = join(modules, `${STAGING_PREFIX}${process.pid}`)
  let parked = null
  let swapped = false
  try {
    mkdirSync(staging, { recursive: true })
    for (const entry of entries) cpSync(join(srcRoot, entry), join(staging, entry), { recursive: true })
    const stagedManifestPath = join(staging, 'package.json')
    const stagedManifest = readJson(stagedManifestPath)
    if (stagedManifest.private !== undefined) {
      delete stagedManifest.private
      writeFileSync(stagedManifestPath, JSON.stringify(stagedManifest, null, 2) + '\n', 'utf8')
    }
    const before = inspectInstalled(profileDir)
    if (before.kind === 'link') {
      removeLink(target)
    } else if (before.kind === 'dir') {
      parked = join(backupDir, 'previous-package')
      renameSync(target, parked)
    }
    try {
      renameSync(staging, target)
      swapped = true
    } catch (error) {
      if (parked !== null && existsSync(target) === false) renameSync(parked, target)
      throw error
    }
    return { previous: before, parked }
  } finally {
    // v2.0.4 (L1): whatever failed — copy, parking (EPERM on a locked file), swap —
    // never leave the ~37 MB staging copy behind.
    if (swapped === false) safeRemoveTree(staging)
  }
}

export function removeInstalledFiles({ profileDir, backupDir }) {
  const before = inspectInstalled(profileDir)
  if (before.kind === 'link') removeLink(before.path)
  else if (before.kind === 'dir') renameSync(before.path, join(backupDir, 'previous-package'))
  return before
}

// ---- user data (read-only) ----------------------------------------------------

export function inspectUserData(profileDir) {
  const root = join(profileDir, 'tianlight')
  if (existsSync(root) === false) return { exists: false, root }
  let revision = null
  try {
    revision = readJson(join(root, 'state', 'settings.json')).revision ?? null
  } catch {
    revision = null
  }
  let uploads = 0
  try {
    uploads = readdirSync(join(root, 'uploads')).length
  } catch {
    uploads = 0
  }
  return { exists: true, root, revision, uploads }
}
