// Canonical DSH compatibility declaration for the Tianlight skin.
//
// ONE range string describes the supported DSH versions, and it is written into
// three declarations that must stay identical (enforced by tools/audit.mjs,
// tools/verify.mjs and tools/test.mjs):
//
//   package.json -> engines.dsh                    harness compatibility gate
//   package.json -> peerDependencies[official pkg] official packages we consume
//   skin.json    -> dshCompatibilityRange          catalog / human-readable range
//
// Why the explicit `||` branches: node-semver only lets a prerelease satisfy a
// range when *some* comparator in that range carries a prerelease tag on the
// SAME major.minor.patch tuple. The old `>=0.2.0-rc.1 <0.3.0` therefore silently
// excludes 0.2.1-rc.5 and 0.2.2-rc.1 (every 0.2.x prerelease except 0.2.0-*).
// One branch per patch tuple is the fix documented by awesome-dsh-plugin's
// contributing.md and works with plain semver and with the harness's
// includePrerelease evaluation alike.
//
// Harness-gate evidence (read from the published packages, see
// docs/COMPATIBILITY.md §1b):
//   - 0.2.0-rc.2  app-boot: evaluatePluginCompatibility() reads peerDependencies
//                 only (no engines.dsh support yet).
//   - 0.2.1-rc.5 / 0.2.2-rc.1 app-boot: an own `engines.dsh` range decides alone;
//                 otherwise every `@deepseek-ai/dsh` / `@deepseek-ai/dsh-*` peer
//                 is checked. All three use
//                 `semver.satisfies(runtime, range, { includePrerelease: true })`.
//   - Declaring BOTH keeps the gate working on every supported line.
export const DSH_COMPAT_RANGE = '>=0.2.0-rc.1 <0.2.1-0 || >=0.2.1-0 <0.2.2-0 || >=0.2.2-0 <0.3.0-0'

/** Versions that MUST satisfy DSH_COMPAT_RANGE (acceptance samples). */
export const DSH_COMPAT_MUST_MATCH = [
  '0.2.0-rc.1',
  '0.2.0-rc.2',
  '0.2.1-alpha.1',
  '0.2.1-rc.5',
  '0.2.1',
  '0.2.2-alpha.3',
  '0.2.2-rc.1',
  '0.2.2',
]

/** Versions that MUST NOT satisfy it: older line and every 0.3.x (stable or pre). */
export const DSH_COMPAT_MUST_NOT_MATCH = [
  '0.1.9',
  '0.2.0-alpha.3',
  '0.3.0-0',
  '0.3.0-alpha.1',
  '0.3.0-rc.1',
  '0.3.0',
  '0.4.0',
]

/** The old, broad-looking range that silently excluded 0.2.1-rc.* / 0.2.2-rc.*. */
export const LEGACY_BROAD_RANGE = '>=0.2.0-rc.1 <0.3.0'

/** Official harness packages this skin consumes (see package.json dsh.client.inject). */
export const OFFICIAL_PEER_PACKAGES = [
  '@deepseek-ai/dsh-api-remotes',
  '@deepseek-ai/dsh-api-session-controller',
]

// ---------------------------------------------------------------------------
// Minimal semver implementation (no dependencies: CI runs without npm install).
// Implements precedence, comparator sets (`||` branches of `<`/`<=`/`>`/`>=`/`=`)
// and node-semver's prerelease admission rule, which is the whole point here.
// ---------------------------------------------------------------------------
const VERSION_RE = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/

/** Parse "1.2.3-rc.1" into { major, minor, patch, prerelease }; null when invalid. */
export function parseVersion(text) {
  const match = VERSION_RE.exec(String(text).trim())
  if (match === null) return null
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4] === undefined ? null : match[4].split('.'),
  }
}

function comparePrereleaseIdentifiers(a, b) {
  const length = Math.max(a.length, b.length)
  for (let index = 0; index < length; index += 1) {
    const left = a[index]
    const right = b[index]
    if (left === undefined) return -1
    if (right === undefined) return 1
    const leftNumeric = /^\d+$/.test(left)
    const rightNumeric = /^\d+$/.test(right)
    if (leftNumeric && rightNumeric) {
      if (Number(left) !== Number(right)) return Number(left) < Number(right) ? -1 : 1
      continue
    }
    if (leftNumeric) return -1
    if (rightNumeric) return 1
    if (left !== right) return left < right ? -1 : 1
  }
  return 0
}

/** semver precedence of two version strings: -1 / 0 / 1. */
export function compareVersions(aText, bText) {
  const a = parseVersion(aText)
  const b = parseVersion(bText)
  if (a === null || b === null) throw new Error(`invalid semantic version: ${a === null ? aText : bText}`)
  for (const key of ['major', 'minor', 'patch']) {
    if (a[key] !== b[key]) return a[key] < b[key] ? -1 : 1
  }
  if (a.prerelease === null && b.prerelease === null) return 0
  if (a.prerelease === null) return 1
  if (b.prerelease === null) return -1
  return comparePrereleaseIdentifiers(a.prerelease, b.prerelease)
}

function sameTuple(a, b) {
  return a.major === b.major && a.minor === b.minor && a.patch === b.patch
}

function parseComparator(text) {
  const match = /^(<=|>=|<|>|=)?\s*(.+)$/.exec(text.trim())
  const operator = match[1] === undefined ? '=' : match[1]
  const version = parseVersion(match[2])
  if (version === null) throw new Error(`invalid comparator: ${text}`)
  return { operator, version }
}

function comparatorSatisfied(version, comparator) {
  const order = compareVersions(
    `${version.major}.${version.minor}.${version.patch}${version.prerelease === null ? '' : '-' + version.prerelease.join('.')}`,
    `${comparator.version.major}.${comparator.version.minor}.${comparator.version.patch}${comparator.version.prerelease === null ? '' : '-' + comparator.version.prerelease.join('.')}`,
  )
  switch (comparator.operator) {
    case '<':
      return order < 0
    case '<=':
      return order <= 0
    case '>':
      return order > 0
    case '>=':
      return order >= 0
    default:
      return order === 0
  }
}

/**
 * node-semver `satisfies` for the comparator strings this project declares.
 * A prerelease version is admitted only when a comparator in the matching set
 * carries a prerelease on the same major.minor.patch tuple — unless
 * `includePrerelease` is set, which is what the DSH harness itself uses.
 */
export function satisfies(versionText, rangeText, options = {}) {
  const includePrerelease = options.includePrerelease === true
  const version = parseVersion(versionText)
  if (version === null) throw new Error(`invalid semantic version: ${versionText}`)
  const branches = String(rangeText)
    .split('||')
    .map((branch) => branch.trim())
    .filter((branch) => branch !== '')
  if (branches.length === 0) return false
  for (const branch of branches) {
    const comparators = branch.split(/\s+/).map(parseComparator)
    if (!comparators.every((comparator) => comparatorSatisfied(version, comparator))) continue
    if (version.prerelease !== null && !includePrerelease) {
      const admitted = comparators.some(
        (comparator) => comparator.version.prerelease !== null && sameTuple(comparator.version, version),
      )
      if (!admitted) continue
    }
    return true
  }
  return false
}
