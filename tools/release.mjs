// Cuts one release of the TIANLIGHT skin: version bump -> release-notes file ->
// CHANGELOG entry -> static checks -> snapshot -> commit -> annotated git tag ->
// local package + release attachments, then prints push/rollback instructions.
//
//   node tools/release.mjs [patch|minor] --note "<release notes>" [--dry-run]
//   node tools/release.mjs --version 0.5.0 --note "..."         # tag an already-bumped manifest
//   node tools/release.mjs --version 2.0.1-rc.1 --note-file notes.md   # pre-release from `dev`
//
// Default bump is `minor` (0.4.0 -> 0.5.0). `patch` does 0.4.0 -> 0.4.1.
//
// Release rules (all enforced before anything is written):
//   - a published tag is IMMUTABLE: if the target tag exists locally or on origin the
//     tool refuses. It never moves, recreates or deletes a tag; a bad release is fixed
//     by cutting a NEW version (e.g. 2.0.1).
//   - `dev` is the development branch and `main` only carries released code:
//     pre-release versions (x.y.z-rc.N) are cut from `dev`, stable versions from
//     `main`. CI additionally requires a stable tag to be reachable from `main`.
//   - git working tree must be clean; a dirty tree is never tagged
//   - git user.name / user.email must be configured (an annotated tag needs them)
//   - HEAD must be a branch, not a detached HEAD
//   - network: one read-only `git ls-remote` tag-existence check (`--offline` skips it);
//     push and publish stay manual.
//
// The tool also writes RELEASE-NOTES-v<version>.md (the GitHub Release body source the
// release workflow reads), and after tagging it builds the four release attachments
// with the same tools CI runs (tools/pack.mjs + tools/release-artifacts.mjs) and prints
// their sha256 values. `--dry-run` prints the plan and preflight verdict only. Every
// real run leaves a snapshot under backup/ (git-ignored) before the commit.
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = dirname(HERE)

/**
 * Files this tool is allowed to touch in a release commit. `RELEASE-NOTES-v<version>.md`
 * is added dynamically to this allow-list (the release workflow publishes that file as
 * the GitHub Release body). Anything else aborts.
 */
const OWNED_FILES = [
  'package.json',
  'skin.json',
  'CHANGELOG.md',
  'lib/index.js',
  'lib/client.js',
]
/** The exact static chain `npm run check` runs, in the same order. */
const CHECK_CHAIN = [
  ['build check', 'tools/build.mjs', '--check'],
  ['unit tests', 'tools/test.mjs'],
  ['structure', 'tools/structure.mjs', '--strict'],
  ['audit', 'tools/audit.mjs'],
  ['check-css', 'tools/check-css.mjs'],
  ['verify', 'tools/verify.mjs'],
]
const CHANGELOG_HEADER = [
  '# 更新日志',
  '',
  '本文件由 `node tools/release.mjs --note "…"` 维护；条目按版本倒序，格式参考 Keep a Changelog。',
  '',
].join('\n')

const USAGE = `usage: node tools/release.mjs [patch|minor] --note "<text>" [options]

  patch | minor        version bump to apply (default: minor)
  --version X.Y.Z[-rc.N]
                       explicit target; may equal the current version to tag an
                       already-bumped manifest (no --version maths, no double bump)
  --note <text>        release notes (written to RELEASE-NOTES-v<version>.md and
                       summarised in CHANGELOG.md; multi-line allowed)
  --note-file <path>   read the release notes from a UTF-8 file instead of --note
                       (a markdown file starting with '#' is used verbatim as the
                       RELEASE-NOTES body)
  --dry-run            print the plan + preflight result; write/commit/tag nothing
  --offline            skip the read-only 'git ls-remote' tag-immutability check
  --skip-package       do not build dist/release attachments after tagging
  --prepare            prepare the version on dev (bump + notes + build + commit +
                       local attachments) but do NOT create the tag; the tag is cut
                       later from main after the acceptance matrix passes
  --help               show this help

Exit codes: 0 ok, 1 refused/failed (nothing is committed or tagged on failure).`

// ---------------------------------------------------------------------------
// small helpers
// ---------------------------------------------------------------------------
const args = process.argv.slice(2)

function fail(message) {
  console.error('release refused: ' + message)
  process.exit(1)
}

function runGit(gitArgs) {
  const result = spawnSync('git', gitArgs, { cwd: ROOT, encoding: 'utf8', timeout: 30000 })
  if (result.error !== undefined && result.error !== null) {
    fail('git is required but could not be started (' + String(result.error.message ?? result.error) + ')')
  }
  return {
    status: result.status,
    stdout: String(result.stdout ?? ''),
    stderr: String(result.stderr ?? ''),
  }
}

function gitValue(gitArgs) {
  const result = runGit(gitArgs)
  if (result.status !== 0) return ''
  return result.stdout.trim()
}

/**
 * Porcelain status lines, kept verbatim: trimming the whole output would eat the
 * leading space of the FIRST line (` M file` -> `M file`) and shift its path.
 */
function gitStatusLines() {
  const result = runGit(['status', '--porcelain'])
  if (result.status !== 0) return []
  return String(result.stdout ?? '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .filter((line) => line.trim() !== '')
}

function parseStatusLine(line) {
  return { code: line.slice(0, 2), path: line.slice(3).trim().replace(/\\/g, '/') }
}

/** Run one node tool from the repo root with inherited stdio (the user sees its output). */
function runNode(step, toolArgs) {
  console.log('\n\u25b6 ' + step + ': node ' + toolArgs.join(' '))
  const result = spawnSync(process.execPath, toolArgs, { cwd: ROOT, stdio: 'inherit' })
  return result.status === 0
}

function readText(relative) {
  return readFileSync(join(ROOT, relative), 'utf8')
}

function writeText(relative, text) {
  writeFileSync(join(ROOT, relative), text, 'utf8')
}

function firstMatch(text, pattern) {
  const match = text.match(pattern)
  return match === null ? null : match[1]
}

function pad2(value) {
  return String(value).padStart(2, '0')
}

function localDate() {
  const now = new Date()
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`
}

function stampForBackup() {
  const now = new Date()
  return (
    `${now.getFullYear()}${pad2(now.getMonth() + 1)}${pad2(now.getDate())}` +
    `-${pad2(now.getHours())}${pad2(now.getMinutes())}${pad2(now.getSeconds())}`
  )
}

/** "0.4.0" / "2.0.1-rc.1" -> { parts: [major, minor, patch], prerelease: 'rc.1' | null }. */
function parseVersion(text) {
  const match = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/.exec(String(text).trim())
  if (match === null) return null
  return {
    parts: [Number(match[1]), Number(match[2]), Number(match[3])],
    prerelease: match[4] === undefined ? null : match[4],
  }
}

function formatVersion(version) {
  return version.parts.join('.') + (version.prerelease === null ? '' : '-' + version.prerelease)
}

/** semver precedence: -1 / 0 / 1 (a pre-release sorts before its stable version). */
function compareVersions(a, b) {
  for (let index = 0; index < 3; index += 1) {
    if (a.parts[index] !== b.parts[index]) return a.parts[index] < b.parts[index] ? -1 : 1
  }
  if (a.prerelease === null && b.prerelease === null) return 0
  if (a.prerelease === null) return 1
  if (b.prerelease === null) return -1
  return comparePrerelease(a.prerelease, b.prerelease)
}

function comparePrerelease(a, b) {
  const left = a.split('.')
  const right = b.split('.')
  const length = Math.max(left.length, right.length)
  for (let index = 0; index < length; index += 1) {
    const l = left[index]
    const r = right[index]
    if (l === undefined) return -1
    if (r === undefined) return 1
    const lNumeric = /^\d+$/.test(l)
    const rNumeric = /^\d+$/.test(r)
    if (lNumeric && rNumeric) {
      if (Number(l) !== Number(r)) return Number(l) < Number(r) ? -1 : 1
    } else if (lNumeric) return -1
    else if (rNumeric) return 1
    else if (l !== r) return l < r ? -1 : 1
  }
  return 0
}

/** patch/minor bump from a possibly pre-release version; the result is stable. */
function bumpVersion(current, kind) {
  const [major, minor, patch] = current.parts
  if (kind === 'patch') return { parts: [major, minor, patch + 1], prerelease: null }
  return { parts: [major, minor + 1, 0], prerelease: null }
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Convert free-form --note text into a markdown bullet list. */
function notesToBullets(note) {
  const lines = String(note).replace(/\r\n/g, '\n').split('\n')
  const kept = []
  for (const line of lines) {
    const trimmed = line.trimEnd()
    if (trimmed.trim() === '') continue
    kept.push(/^(-|\*|\d+\.)\s/.test(trimmed.trim()) ? trimmed.trim() : '- ' + trimmed.trim())
  }
  return kept.length === 0 ? '- （无发布说明）' : kept.join('\n')
}

/**
 * Insert the release notes into CHANGELOG.md. Existing version sections are kept;
 * the notes go in as a `### 发布说明` subsection and are skipped when identical
 * notes are already present (a re-run must not duplicate them).
 */
function updateChangelog(targetVersion, note) {
  const existed = existsSync(join(ROOT, 'CHANGELOG.md'))
  const base = existed ? readText('CHANGELOG.md') : CHANGELOG_HEADER
  const heading = '## [' + targetVersion + ']'
  const sectionAt = base.search(new RegExp('^' + escapeRegExp(heading) + '(?=\\s|$)', 'm'))
  const bullets = notesToBullets(note)

  if (sectionAt >= 0) {
    const section = base.slice(sectionAt)
    if (section.includes(bullets)) return { action: 'unchanged', existed }
    const headingEnd = base.indexOf('\n', sectionAt)
    const insertAt = headingEnd < 0 ? base.length : headingEnd + 1
    const next = base.slice(0, insertAt) + '\n### 发布说明\n\n' + bullets + '\n' + base.slice(insertAt)
    writeText('CHANGELOG.md', next.endsWith('\n') ? next : next + '\n')
    return { action: 'notes-added', existed }
  }

  const entry = heading + ' - ' + localDate() + '\n\n### 发布说明\n\n' + bullets + '\n'
  const headerEnd = base.indexOf('\n## ')
  let next
  if (headerEnd < 0) {
    next = base.replace(/\s*$/, '\n\n') + entry + '\n'
  } else {
    next = base.slice(0, headerEnd + 1) + '\n' + entry + '\n' + base.slice(headerEnd + 1)
  }
  writeText('CHANGELOG.md', next.endsWith('\n') ? next : next + '\n')
  return { action: 'entry-created', existed }
}

// ---------------------------------------------------------------------------
// argument parsing
// ---------------------------------------------------------------------------
let dryRun = false
let bumpKind = null
let note = null
let noteFile = null
let explicitVersion = null
let offline = false
let skipPackage = false
let prepareOnly = false

for (let index = 0; index < args.length; index += 1) {
  const arg = args[index]
  if (arg === '--help' || arg === '-h') {
    console.log(USAGE)
    process.exit(0)
  } else if (arg === '--dry-run') {
    dryRun = true
  } else if (arg === '--offline') {
    offline = true
  } else if (arg === '--skip-package') {
    skipPackage = true
  } else if (arg === '--prepare') {
    prepareOnly = true
  } else if (arg === '--note') {
    note = args[index + 1]
    index += 1
    if (note === undefined) fail('--note needs a value')
  } else if (arg === '--note-file') {
    noteFile = args[index + 1]
    index += 1
    if (noteFile === undefined) fail('--note-file needs a path')
  } else if (arg === '--version') {
    explicitVersion = args[index + 1]
    index += 1
    if (explicitVersion === undefined) fail('--version needs a value (x.y.z)')
  } else if (arg === 'patch' || arg === 'minor') {
    if (bumpKind !== null) fail('only one bump kind is allowed (' + bumpKind + ' / ' + arg + ')')
    bumpKind = arg
  } else {
    fail('unknown argument: ' + arg + '\n\n' + USAGE)
  }
}

if (bumpKind !== null && explicitVersion !== null) fail('use either a bump kind or --version, not both')
if (bumpKind === null) bumpKind = 'minor'
if (noteFile !== null) {
  if (note !== null) fail('use either --note or --note-file, not both')
  if (!existsSync(resolve(ROOT, noteFile))) fail('--note-file does not exist: ' + noteFile)
  note = readFileSync(resolve(ROOT, noteFile), 'utf8')
}

// ---------------------------------------------------------------------------
// versions
// ---------------------------------------------------------------------------
const packagePath = join(ROOT, 'package.json')
if (!existsSync(packagePath)) fail('package.json not found in ' + ROOT)
const packageText = readText('package.json')
let manifest
try {
  manifest = JSON.parse(packageText)
} catch (error) {
  fail('package.json is not valid JSON (' + String(error.message ?? error) + ')')
}
const currentParsed = parseVersion(manifest.version)
if (currentParsed === null) fail('package.json has no valid semver version (found: ' + JSON.stringify(manifest.version) + ')')
const currentVersion = formatVersion(currentParsed)

let targetParsed
if (explicitVersion !== null) {
  const parsed = parseVersion(explicitVersion)
  if (parsed === null) fail('--version must be x.y.z or x.y.z-<prerelease> (got: ' + explicitVersion + ')')
  if (compareVersions(parsed, currentParsed) < 0) {
    fail('--version ' + explicitVersion + ' is lower than the current ' + currentVersion + ' (releases only move forward)')
  }
  targetParsed = parsed
} else {
  targetParsed = bumpVersion(currentParsed, bumpKind)
}
const targetVersion = formatVersion(targetParsed)
const tagName = 'v' + targetVersion
const sameVersion = targetVersion === currentVersion
const prerelease = targetParsed.prerelease !== null
const notesFile = 'RELEASE-NOTES-' + tagName + '.md'

if (note === null) {
  if (!dryRun) fail('--note is required for a real release (use --dry-run to preview without it)')
  note = '（dry-run 未提供 --note）'
}

// ---------------------------------------------------------------------------
// preflight (read-only; dry-run reports the same issues as warnings)
// ---------------------------------------------------------------------------
const problems = []
const warnings = []
const info = []
let gitIdentity = null

/** Run git with the release identity when git config does not provide one. */
function runGitAsRelease(gitArgs) {
  if (gitIdentity === null || gitIdentity.overrides === false) return runGit(gitArgs)
  return runGit(['-c', 'user.name=' + gitIdentity.name, '-c', 'user.email=' + gitIdentity.email, ...gitArgs])
}

if (Number(process.versions.node.split('.')[0]) < 18) {
  problems.push('Node >= 18 is required (found ' + process.versions.node + ')')
}

if (gitValue(['rev-parse', '--is-inside-work-tree']) !== 'true') {
  problems.push(ROOT + ' is not inside a git working tree')
} else {
  const branch = gitValue(['symbolic-ref', '--short', '-q', 'HEAD'])
  if (branch === '') problems.push('HEAD is detached; check out a branch before releasing')
  else {
    info.push('branch: ' + branch)
    // Branch model: `dev` is where development happens; `main` only carries released
    // code. Pre-releases are cut from `dev`, stable releases from `main`. `--prepare`
    // is the one exception: a stable version is prepared on `dev` (version bump, notes,
    // changelog, build, local attachments — no tag), verified there, then merged to
    // `main` where the actual tag is cut from the release commit.
    if (prerelease && branch !== 'dev') {
      problems.push('pre-release versions are cut from `dev` (development branch); current branch: ' + branch)
    } else if (!prerelease && branch !== 'main') {
      if (prepareOnly && branch === 'dev') {
        info.push('prepare mode: stable version prepared on `dev`; the tag will be cut on `main` after review')
      } else {
        problems.push('stable releases are cut from `main` (only released code lives there); current branch: ' + branch)
      }
    }
  }

  const dirty = gitStatusLines()
  if (dirty.length > 0) problems.push('working tree is not clean (' + dirty.length + ' change(s)); commit or stash first')
  else info.push('working tree: clean')

  // Immutable tags: a tagged release is never moved, recreated or deleted. Refuse when
  // the tag already exists locally, and verify against origin as well when possible.
  const existingTag = gitValue(['tag', '--list', tagName])
  if (existingTag !== '') {
    problems.push('tag ' + tagName + ' already exists locally (published tags are immutable; cut a new version instead)')
  } else {
    info.push('tag ' + tagName + ': free locally')
  }
  if (offline) {
    info.push('remote tag check: skipped (--offline)')
  } else if (gitValue(['remote', 'get-url', 'origin']) === '') {
    warnings.push('no `origin` remote: skipped the remote tag-immutability check')
  } else {
    const remoteTag = runGit(['ls-remote', '--tags', 'origin', 'refs/tags/' + tagName])
    if (remoteTag.status !== 0) {
      warnings.push('could not check origin tags (git ls-remote failed); make sure ' + tagName + ' has never been published')
    } else if (String(remoteTag.stdout ?? '').trim() !== '') {
      problems.push('tag ' + tagName + ' already exists on origin (published tags are immutable; cut a new version instead)')
    } else {
      info.push('tag ' + tagName + ': free on origin')
    }
  }

  // Re-run guard: if HEAD is already the release commit of the CURRENT manifest
  // version, nothing changed since that release. A second invocation of a bumping
  // release would silently cut the next patch/minor, so refuse instead.
  const headTag = gitValue(['describe', '--tags', '--exact-match', 'HEAD'])
  if (headTag === 'v' + currentVersion) {
    problems.push(
      'HEAD is already the ' + headTag + ' release commit; commit new changes before cutting ' + tagName +
        ' (a tagged release is never re-tagged — cut a new version instead)',
    )
  }

  // An annotated tag needs a committer identity. Use git config when present, else
  // GIT_COMMITTER_* env, else fall back to the author of the last commit — the tool
  // is run on the same machine that made the previous commits, so that identity is
  // the right one, and `git -c` keeps the override local to the release commands.
  const configName = gitValue(['config', 'user.name'])
  const configEmail = gitValue(['config', 'user.email'])
  let identityName = configName
  let identityEmail = configEmail
  let identityOverrides = false
  if (identityName === '' || identityEmail === '') {
    const envName = String(process.env.GIT_COMMITTER_NAME ?? process.env.GIT_AUTHOR_NAME ?? '').trim()
    const envEmail = String(process.env.GIT_COMMITTER_EMAIL ?? process.env.GIT_AUTHOR_EMAIL ?? '').trim()
    if (envName !== '' && envEmail !== '') {
      identityName = envName
      identityEmail = envEmail
      identityOverrides = true
    } else {
      identityName = gitValue(['log', '-1', '--format=%an'])
      identityEmail = gitValue(['log', '-1', '--format=%ae'])
      identityOverrides = true
      if (identityName !== '' && identityEmail !== '') {
        warnings.push('git user.name/user.email not configured; using the last commit author: ' + identityName + ' <' + identityEmail + '>')
      }
    }
  }
  if (identityName === '' || identityEmail === '') {
    problems.push('no git identity available: run `git config user.name "Your Name"` and `git config user.email "you@example.com"`')
  } else {
    info.push('git identity: ' + identityName + ' <' + identityEmail + '>')
    gitIdentity = { name: identityName, email: identityEmail, overrides: identityOverrides }
  }
}

// The tool edits exactly these files; preflight names every one that will change.
const plan = []
plan.push(
  sameVersion
    ? 'version: keep ' + currentVersion + ' (tag the current manifest)'
    : 'version: ' + currentVersion + ' -> ' + targetVersion + ' (in package.json' + (existsSync(join(ROOT, 'skin.json')) ? ' + skin.json' : '') + ')',
)
plan.push(
  'build marker: lib/index.js BUILD -> ' +
    (sameVersion ? 'unchanged' : targetVersion) +
    ' (HOST_API is a route-contract version and is edited by hand only)',
)
plan.push('product: rebuild lib/client.js with node tools/build.mjs')
plan.push(
  'branch policy: ' +
    (prerelease ? 'pre-release from dev (stays off main until a stable release)' : 'stable release from main (main only carries released code)'),
)
plan.push('tag immutability: refuse if ' + tagName + ' exists locally or on origin')
plan.push('release notes: ' + notesFile + ' (GitHub Release body source used by the release workflow)')
plan.push('changelog: ' + (existsSync(join(ROOT, 'CHANGELOG.md')) ? 'update CHANGELOG.md' : 'create CHANGELOG.md') + ' (' + tagName + ')')
plan.push('checks: ' + CHECK_CHAIN.map((step) => 'node ' + step.slice(1).join(' ')).join(' && '))
plan.push('snapshot: node tools/snapshot.mjs (backup/, git-ignored)')
plan.push('commit: release: ' + tagName + (sameVersion ? ' (or skip when nothing changed)' : ''))
plan.push(prepareOnly ? 'tag: NOT created in --prepare mode (cut later from main)' : 'tag: annotated ' + tagName)
plan.push(
  skipPackage
    ? 'package: skipped (--skip-package)'
    : 'package: node tools/pack.mjs && node tools/release-artifacts.mjs --version ' + targetVersion + ' (4 attachments, sha256 printed)',
)
plan.push('network: read-only origin tag check' + (offline ? ' (skipped: --offline)' : '') + '; push stays manual')

console.log('release plan' + (dryRun ? ' (dry run)' : ''))
console.log('  current: ' + currentVersion + (gitValue(['rev-parse', '--short', 'HEAD']) === '' ? '' : ' @ ' + gitValue(['rev-parse', '--short', 'HEAD'])))
console.log('  target:  ' + targetVersion)
for (const line of plan) console.log('  - ' + line)
for (const line of info) console.log('  i ' + line)
for (const line of warnings) console.log('  ! ' + line)

if (problems.length > 0) {
  for (const line of problems) console.log((dryRun ? '  ! would refuse: ' : '  x ') + line)
  if (!dryRun) {
    console.log('\nrelease aborted before any write. Fix the problem(s) above and re-run.')
    process.exit(1)
  }
  console.log('\n(dry run continues; a real run would abort on the problems above)')
} else if (!dryRun) {
  console.log('\npreflight ok.')
}

if (dryRun) {
  console.log('\n(dry run) no file was written, no check ran, nothing was committed or tagged.')
  process.exit(0)
}

if (problems.length > 0) process.exit(1)

// ---------------------------------------------------------------------------
// 1. version fields
// ---------------------------------------------------------------------------
const changes = []

function replaceVersion(relative, oldVersion, newVersion) {
  const text = readText(relative)
  const exact = new RegExp('("version"\\s*:\\s*")' + escapeRegExp(oldVersion) + '(")')
  if (exact.test(text)) {
    writeText(relative, text.replace(exact, '$1' + newVersion + '$2'))
    return true
  }
  // The file may carry a stale version (manifests edited by hand) or no version at
  // all (skin.json today). Update the first version value, else add one after `id`.
  const anyVersion = /("version"\s*:\s*")[^"]*(")/
  if (anyVersion.test(text)) {
    writeText(relative, text.replace(anyVersion, '$1' + newVersion + '$2'))
    return true
  }
  if (relative === 'skin.json') {
    const next = text.replace(/("id"\s*:\s*"[^"]*",\n)/, '$1  "version": "' + newVersion + '",\n')
    if (next === text) fail('cannot add version to skin.json (no "id" line found)')
    writeText(relative, next)
    return true
  }
  return false
}

if (!sameVersion) {
  if (replaceVersion('package.json', currentVersion, targetVersion)) {
    try {
      JSON.parse(readText('package.json'))
    } catch {
      fail('internal error: package.json became invalid')
    }
    changes.push('package.json')
  } else {
    fail('package.json version field was not found')
  }
  if (existsSync(join(ROOT, 'skin.json'))) {
    if (replaceVersion('skin.json', currentVersion, targetVersion)) {
      try {
        JSON.parse(readText('skin.json'))
      } catch {
        fail('internal error: skin.json became invalid')
      }
      changes.push('skin.json')
    }
  }

  // Build marker: `BUILD` is the host's diagnostic build number (it is reported by
  // `_engines` and stamped into the bundle manifest), so it follows the release.
  // The handshake marker `HOST_API` is deliberately NOT rewritten here: it only
  // changes when the lib/ route contract changes, otherwise a browser-half-only
  // release would ask users to restart DSH again for no reason.
  const hostIndexPath = join(ROOT, 'lib', 'index.js')
  if (existsSync(hostIndexPath)) {
    const text = readText('lib/index.js')
    const next = text.replace(/(const BUILD = ')[^']+(')/, '$1' + targetVersion + '$2')
    if (next !== text) {
      writeText('lib/index.js', next)
      changes.push('lib/index.js')
    }
  }
}

// ---------------------------------------------------------------------------
// 2. release notes file (the GitHub Release body the release workflow reads)
// ---------------------------------------------------------------------------
const rawNote = String(note).replace(/\r\n/g, '\n').replace(/\s+$/, '')
const firstNoteLine = rawNote.split('\n').map((line) => line.trim()).find((line) => line !== '') ?? ''
const noteTitle = firstNoteLine.replace(/^#+\s*/, '')
const notesContent = rawNote.startsWith('#')
  ? rawNote + '\n'
  : '# ' + tagName + (noteTitle === '' ? '' : ' · ' + noteTitle) + '\n\n' + notesToBullets(rawNote) + '\n'
const previousNotes = existsSync(join(ROOT, notesFile)) ? readText(notesFile) : null
if (previousNotes === notesContent) {
  console.log('\nrelease notes: ' + notesFile + ' unchanged')
} else {
  writeText(notesFile, notesContent)
  changes.push(notesFile)
  console.log('\nrelease notes: ' + notesFile + (previousNotes === null ? ' created' : ' updated'))
}

// ---------------------------------------------------------------------------
// 3. changelog
// ---------------------------------------------------------------------------
const changelogNote = rawNote.startsWith('#')
  ? (noteTitle === '' ? rawNote : noteTitle + '（发布说明见 ' + notesFile + '）')
  : rawNote
const changelogState = updateChangelog(targetVersion, changelogNote)
if (changelogState.action === 'entry-created') changes.push('CHANGELOG.md')
if (changelogState.action === 'notes-added') changes.push('CHANGELOG.md')
console.log('changelog: ' + changelogState.action + ' (' + targetVersion + ')')

// ---------------------------------------------------------------------------
// 4. rebuild + full static chain
// ---------------------------------------------------------------------------
if (!runNode('build', ['tools/build.mjs'])) {
  fail('build failed; the working tree still contains the release edits (see rollback steps below)')
}
// The build rewrites lib/client.js; include it in the release commit only if the
// bytes changed (a version-only release with an unchanged client commits nothing).
if (gitStatusLines().some((line) => line.slice(3).trim().replace(/\\/g, '/') === 'lib/client.js')) {
  changes.push('lib/client.js')
}

for (const step of CHECK_CHAIN) {
  if (!runNode(step[0], step.slice(1))) {
    fail('static check failed: ' + step[0] + ' — nothing was committed or tagged')
  }
}
console.log('\nall static checks passed.')

// ---------------------------------------------------------------------------
// 5. snapshot (a consistent copy of exactly what is about to be tagged)
// ---------------------------------------------------------------------------
console.log('\n\u25b6 snapshot: node tools/snapshot.mjs')
const snapshotResult = spawnSync(process.execPath, ['tools/snapshot.mjs'], { cwd: ROOT, encoding: 'utf8' })
process.stdout.write(snapshotResult.stdout ?? '')
process.stderr.write(snapshotResult.stderr ?? '')
if (snapshotResult.status !== 0) fail('snapshot failed; nothing was committed or tagged')
const snapshotMatch = /snapshot\s+(\d{8}-\d{6})/.exec(String(snapshotResult.stdout ?? ''))
const snapshotStamp = snapshotMatch === null ? stampForBackup() : snapshotMatch[1]

// ---------------------------------------------------------------------------
// 6. stage -> commit -> tag
// ---------------------------------------------------------------------------
const ownedFiles = [...OWNED_FILES, notesFile]
const changed = gitStatusLines().map(parseStatusLine)
const unexpected = changed.filter((entry) => !ownedFiles.includes(entry.path))
if (unexpected.length > 0) {
  console.error('release aborted: unexpected changes were created by the release:')
  for (const entry of unexpected) console.error('  ' + entry.code + ' ' + entry.path)
  console.error('rollback: ' + changed.map((entry) => 'git checkout -- ' + entry.path).join(' && '))
  process.exit(1)
}

let commitCreated = false
let commitSha = gitValue(['rev-parse', 'HEAD'])
const previousSha = commitSha
if (changed.length > 0) {
  const add = runGit(['add', '--', ...changed.map((entry) => entry.path)])
  if (add.status !== 0) fail('git add failed: ' + add.stderr.trim())
  const commit = runGitAsRelease([
    'commit',
    '-m',
    'release: ' + tagName,
    '-m',
    (noteTitle === '' ? tagName : noteTitle) + '\n\nRelease notes: ' + notesFile,
    '-m',
    'Snapshot: backup/' + snapshotStamp + ' (pre-commit release state).',
  ])
  if (commit.status !== 0) fail('git commit failed: ' + commit.stderr.trim())
  commitCreated = true
  commitSha = gitValue(['rev-parse', '--short', 'HEAD'])
  console.log('\ncommitted ' + commitSha + ': release: ' + tagName + '  (' + changed.length + ' file(s))')
} else {
  console.log('\nno file changes: the manifests already hold ' + targetVersion + '; tagging HEAD directly.')
}

const tag = prepareOnly
  ? { status: 0, stderr: '' }
  : runGitAsRelease([
      'tag',
      '-a',
      tagName,
      '-m',
      tagName + (noteTitle === '' ? '' : ': ' + noteTitle),
      '-m',
      notesContent,
    ])
if (tag.status !== 0) fail('git tag failed: ' + tag.stderr.trim() + ' (the release commit exists but is not tagged)')
if (prepareOnly) console.log('\nprepare mode: tag ' + tagName + ' NOT created (cut it from `main` after the acceptance matrix passes)')

// ---------------------------------------------------------------------------
// 7. local package + release attachments (exactly what the release CI builds)
// ---------------------------------------------------------------------------
if (skipPackage) {
  console.log('\npackage: skipped (--skip-package)')
} else {
  console.log('\n\u25b6 package: node tools/pack.mjs')
  if (!runNode('pack', ['tools/pack.mjs'])) {
    fail('packaging failed' + (prepareOnly ? ' (prepare aborted, nothing was pushed)' : '; the tag exists only locally (nothing was pushed) — delete it with `git tag -d ' + tagName + '` and fix the pack input'))
  }
  if (!runNode('release artifacts', ['tools/release-artifacts.mjs', '--version', targetVersion, '--commit', gitValue(['rev-parse', 'HEAD'])])) {
    fail('release attachment build failed' + (prepareOnly ? ' (prepare aborted, nothing was pushed)' : '; the tag exists only locally (nothing was pushed) — delete it with `git tag -d ' + tagName + '` and fix the package'))
  }
}

// ---------------------------------------------------------------------------
// 8. report + push/rollback instructions
// ---------------------------------------------------------------------------
const branch = gitValue(['symbolic-ref', '--short', '-q', 'HEAD'])
if (prepareOnly) {
  console.log('\n\u2714 prepared ' + tagName + ' on `' + branch + '` (no tag yet; nothing was pushed)')
  console.log('  head:     ' + commitSha + (commitCreated ? ' (release commit)' : ' (pre-existing commit, no file changes)'))
  console.log('  notes:    ' + notesFile + ' (GitHub Release body)')
  console.log('  changelog: CHANGELOG.md (' + targetVersion + ')')
  if (!skipPackage) console.log('  package:  dist/release/ (2 tgz + SHA256SUMS.txt + build-manifest.json)')
  console.log('\nnext (after the acceptance matrix passes and the release is approved):')
  console.log('  # 1) append the acceptance-matrix result table to ' + notesFile + ' and commit it on ' + branch)
  console.log('  # 2) merge ' + branch + ' into main WITHOUT rewriting history, then on main run:')
  console.log('  #      node tools/release.mjs --version ' + targetVersion + ' --note-file ' + notesFile)
  console.log('  #    (version/notes already exist, so this only cuts the annotated tag on main HEAD)')
  console.log('  # 3) push main first, then the tag:')
  console.log('  #      git push origin main && git push origin ' + tagName)
  console.log('\nno tag was created; if this prepare must be undone before merging:')
  if (commitCreated) console.log('  git reset --hard ' + previousSha)
  console.log('  git checkout -- ' + [...OWNED_FILES, notesFile].join(' '))
  console.log('  # newly created CHANGELOG.md / ' + notesFile + ': delete them (git checkout cannot remove untracked files)')
} else {
  console.log('\n\u2714 release ' + tagName + ' created (local only; nothing was pushed)')
  console.log('  tag:      ' + tagName + ' (annotated)')
  console.log('  head:     ' + commitSha + (commitCreated ? ' (release commit)' : ' (pre-existing commit, no file changes)'))
  console.log('  branch:   ' + branch)
  console.log('  notes:    ' + notesFile + ' (GitHub Release body)')
  console.log('  snapshot: backup/*.' + snapshotStamp + '  +  backup/src.' + snapshotStamp)
  console.log('  changelog: CHANGELOG.md (' + targetVersion + ')')
  if (!skipPackage) console.log('  package:  dist/release/ (2 tgz + SHA256SUMS.txt + build-manifest.json)')

  console.log('\npush (manual, after reviewing; push the branch BEFORE the tag — CI verifies the tag is reachable from it):')
  console.log('  git push origin ' + branch)
  console.log('  git push origin ' + tagName)

  console.log('\nimmutable-tag rule: once pushed, ' + tagName + ' must never be moved, recreated or deleted.')
  const fixVersion = prerelease ? 'v' + targetVersion.replace(/-.*$/, '') + '-rc.2' : 'v' + bumpVersion(targetParsed, 'patch').parts.join('.')
  console.log('  a bad release is fixed by cutting a NEW version (e.g. ' + fixVersion + '), never by re-tagging.')
  console.log('\nrollback (before pushing — the tag is still private):')
  if (commitCreated) console.log('  git reset --hard ' + previousSha)
  console.log('  git tag -d ' + tagName)
  console.log('  # if the run failed before commit, also restore the release edits:')
  console.log('  git checkout -- ' + [...OWNED_FILES, notesFile].join(' '))
  console.log('  # newly created CHANGELOG.md / ' + notesFile + ': delete them (git checkout cannot remove untracked files)')
  console.log('\nrollback (after pushing): NOT possible by design — do not delete or move the tag.')
  console.log('  publish a new patch/pre-release version and mark the bad release as superseded in its notes.')
}

console.log('\nrestore paths:')
console.log('  backup/' + snapshotStamp + ' / backup/src.' + snapshotStamp + ' = this release state')
console.log('  npm run restore                = restore the NEWEST snapshot (this release state)')
if (!prepareOnly) console.log('  git checkout ' + tagName + '    = inspect the tagged tree')
