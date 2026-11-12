// Exact build fingerprint of the installed plugin (v2.0.1).
//
// The self-test / feedback panels show this one line, and the feedback issue template
// requires it, so a user and the author can prove which build is actually running:
//
//   <version> · <commit short> · client <sha256 12> · HOST_API <n> · DSH <version> · <install method>
//
// Sources (no invented data):
//   - version: this package's package.json (the same value the release tag enforces);
//   - commit:  `build-info.json` written by tools/pack.mjs at pack time (deterministic:
//              commit + commit date), or the `.git` HEAD for a link/dev checkout;
//   - client:  sha256 of the shipped lib/client.js bytes on disk (what is really installed);
//   - HOST_API: the hand-edited route contract constant (lib/index.js);
//   - DSH:     DSH's package.json at `profileContext.installAnchor` (the DSH host documents
//              that field as the absolute path of the dsh app package's package.json);
//   - method:  how the running profile names our dependency spec: link: (local link),
//              file:/…tgz (tarball), git+/github (git), a version range/registry (registry).
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
/** Plugin root: `lib/` is one level below it. */
export const PLUGIN_ROOT = resolve(HERE, '..')
export const PACKAGE_NAME = 'dsh-client-ui-skin-tianlight'

const PACKAGE_JSON = join(PLUGIN_ROOT, 'package.json')
const CLIENT_FILE = join(HERE, 'client.js')
const BUILD_INFO_FILE = join(PLUGIN_ROOT, 'build-info.json')

function readJson(file) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'))
  } catch {
    return null
  }
}

/** sha256 of a file's bytes, lowercase hex; null when unreadable. */
function sha256File(file) {
  try {
    return createHash('sha256').update(readFileSync(file)).digest('hex')
  } catch {
    return null
  }
}

/** Parse `.git/HEAD` (+ the referenced ref file) of a source checkout. */
function readGitCommit(dir) {
  try {
    let head = readFileSync(join(dir, '.git', 'HEAD'), 'utf8').trim()
    if (head.startsWith('ref: ')) {
      const ref = head.slice(5).trim()
      if (ref === '' || ref.includes('..')) return null
      head = readFileSync(join(dir, '.git', ...ref.split('/')), 'utf8').trim()
    }
    return /^[0-9a-f]{40,64}$/i.test(head) ? head : null
  } catch {
    return null
  }
}

/**
 * Classify a profile dependency spec into the four install methods the panel shows.
 * Exported for tests: the profile manifest is the only trustworthy source of how the
 * package got here (a link checkout and an unpacked tarball look identical on disk).
 */
export function classifyInstallSpec(spec) {
  if (typeof spec !== 'string' || spec.trim() === '') return 'unknown'
  const value = spec.trim()
  if (/^link:/i.test(value)) return 'local-link'
  if (/^workspace:/i.test(value)) return 'local-link'
  if (/^(file:|\.{1,2}[\\/])/i.test(value)) return 'tarball'
  if (/\.(?:tgz|tar\.gz)$/i.test(value)) return 'tarball'
  if (/^(?:git\+|git:|github:|gitlab:|bitbucket:)/i.test(value)) return 'git'
  if (/^(?:https?|ssh):\/\//i.test(value) && /(?:\.git)(?:#|$)|\/github\.com\//i.test(value)) return 'git'
  if (/^[~^<>=*]|\|\||^\d+\.\d+\.\d+/.test(value)) return 'registry'
  if (/^@?[a-z0-9][a-z0-9._-]*(?:\/[a-z0-9][a-z0-9._-]*)?$/i.test(value)) return 'registry'
  return 'unknown'
}

/** Read the dependency spec our package has in the running profile's package.json. */
export function readInstallMethod(profileDir, packageName) {
  if (typeof profileDir !== 'string' || profileDir === '') return 'unknown'
  const manifest = readJson(join(profileDir, 'package.json'))
  if (manifest === null || typeof manifest !== 'object') return 'unknown'
  const dependencies = manifest.dependencies !== null && typeof manifest.dependencies === 'object' ? manifest.dependencies : {}
  if (Object.prototype.hasOwnProperty.call(dependencies, packageName)) return classifyInstallSpec(dependencies[packageName])
  const devDependencies = manifest.devDependencies !== null && typeof manifest.devDependencies === 'object' ? manifest.devDependencies : {}
  if (Object.prototype.hasOwnProperty.call(devDependencies, packageName)) return classifyInstallSpec(devDependencies[packageName])
  return 'unknown'
}

/**
 * DSH version from `profileContext.installAnchor`. app-boot documents that field as the
 * absolute path of the dsh app package's package.json; tolerate a directory as well.
 */
export function readDshVersion(profile) {
  const anchor = profile !== null && profile !== undefined && typeof profile.installAnchor === 'string' ? profile.installAnchor : ''
  if (anchor === '') return null
  const candidates = [anchor, join(dirname(anchor), 'package.json'), join(anchor, 'package.json')]
  for (const candidate of candidates) {
    if (existsSync(candidate) === false) continue
    const parsed = readJson(candidate)
    if (parsed === null || typeof parsed !== 'object') continue
    if (typeof parsed.version !== 'string' || parsed.version.trim() === '') continue
    return { version: parsed.version.trim(), name: typeof parsed.name === 'string' ? parsed.name : null }
  }
  return null
}

/**
 * Build the fingerprint object. Never throws: every unknown part is null and the
 * one-line form prints `unknown`, which is itself useful evidence.
 * @param options.hostApi - the HOST_API constant of the running host half.
 * @param options.profile - DSH profileContext (dir/name/installAnchor), or null.
 * @param options.dataMode - '' | 'persistent' | 'legacy' (diagnostic only).
 */
export function buildFingerprint(options = {}) {
  const packageManifest = readJson(PACKAGE_JSON)
  const version = packageManifest !== null && typeof packageManifest.version === 'string' ? packageManifest.version : null
  const buildInfo = readJson(BUILD_INFO_FILE)
  let commit = buildInfo !== null && typeof buildInfo.commit === 'string' ? buildInfo.commit : null
  let buildSource = buildInfo !== null && typeof buildInfo.source === 'string' ? buildInfo.source : commit !== null ? 'pack' : 'unknown'
  if (commit === null) {
    const fromGit = readGitCommit(PLUGIN_ROOT)
    if (fromGit !== null) {
      commit = fromGit
      buildSource = 'git-checkout'
    }
  }
  const clientSha256 = sha256File(CLIENT_FILE)
  const dsh = readDshVersion(options.profile ?? null)
  return {
    schema: 1,
    product: typeof packageManifest?.name === 'string' ? packageManifest.name : PACKAGE_NAME,
    version,
    commit,
    commitShort: commit === null ? null : commit.slice(0, 12),
    clientSha256,
    clientShort: clientSha256 === null ? null : clientSha256.slice(0, 12),
    hostApi: options.hostApi === undefined ? null : String(options.hostApi),
    dshVersion: dsh === null ? null : dsh.version,
    dshPackage: dsh === null ? null : dsh.name,
    installMethod: readInstallMethod(options.profile?.dir, PACKAGE_NAME),
    buildSource,
    builtAt: buildInfo !== null && typeof buildInfo.builtAt === 'string' ? buildInfo.builtAt : null,
    profile: options.profile !== null && options.profile !== undefined && typeof options.profile.name === 'string' ? options.profile.name : null,
    dataMode: typeof options.dataMode === 'string' ? options.dataMode : null,
  }
}

/** One paste-able line: `<version> · <commit> · client <sha> · HOST_API <n> · DSH <v> · <method>`. */
export function formatFingerprintLine(fingerprint) {
  const value = fingerprint !== null && typeof fingerprint === 'object' ? fingerprint : {}
  const version = typeof value.version === 'string' ? value.version : 'unknown'
  const commit = typeof value.commitShort === 'string' ? value.commitShort : 'unknown'
  const client = typeof value.clientShort === 'string' ? value.clientShort : 'unknown'
  const hostApi = value.hostApi === null || value.hostApi === undefined ? 'unknown' : String(value.hostApi)
  const dsh = typeof value.dshVersion === 'string' ? value.dshVersion : 'unknown'
  const method = typeof value.installMethod === 'string' ? value.installMethod : 'unknown'
  return version + ' · ' + commit + ' · client ' + client + ' · HOST_API ' + hostApi + ' · DSH ' + dsh + ' · ' + method
}
