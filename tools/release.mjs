// Cuts one release of the TIANLIGHT skin: version bump -> static checks -> snapshot
// -> CHANGELOG entry -> commit -> annotated git tag, then prints rollback steps.
//
//   node tools/release.mjs [patch|minor] --note "<release notes>" [--dry-run]
//   node tools/release.mjs --version 0.5.0 --note "..."      # tag the version already in the manifest
//   node tools/release.mjs --note-file release-notes.md      # notes from a UTF-8 file
//
// Default bump is `minor` (0.4.0 -> 0.5.0). `patch` does 0.4.0 -> 0.4.1.
//
// Safety rules (all enforced before anything is written):
//   - git working tree must be clean; a dirty tree is never tagged
//   - the target tag must not exist yet (re-running a finished release refuses)
//   - git user.name / user.email must be configured (an annotated tag needs them)
//   - HEAD must be a branch, not a detached HEAD
//   - NO network operation is performed: push and publish stay manual
//
// `--dry-run` prints the plan and the preflight verdict without writing, running the
// check chain, committing or tagging. Every real run leaves a snapshot under backup/
// (git-ignored) before the commit, so the release state itself is restorable.
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = dirname(HERE)

/** Files this tool is allowed to touch in a release commit. Anything else aborts. */
const OWNED_FILES = [
  'package.json',
  'skin.json',
  'CHANGELOG.md',
  'src/10-constants.js',
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
  --version X.Y.Z      explicit target; may equal the current version to tag an
                       already-bumped manifest (no --version maths, no double bump)
  --note <text>        release notes, written into CHANGELOG.md (multi-line allowed)
  --note-file <path>   read the release notes from a UTF-8 file instead of --note
  --dry-run            print the plan + preflight result; write/commit/tag nothing
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
  const result = spawnSync('git', gitArgs, { cwd: ROOT, encoding: 'utf8' })
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

/** "0.4.0" -> [0,4,0]; returns null when not a plain x.y.z version. */
function parseVersion(text) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(String(text).trim())
  if (match === null) return null
  return [Number(match[1]), Number(match[2]), Number(match[3])]
}

function formatVersion(parts) {
  return parts.join('.')
}

function compareVersions(a, b) {
  for (let index = 0; index < 3; index += 1) {
    if (a[index] !== b[index]) return a[index] < b[index] ? -1 : 1
  }
  return 0
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

for (let index = 0; index < args.length; index += 1) {
  const arg = args[index]
  if (arg === '--help' || arg === '-h') {
    console.log(USAGE)
    process.exit(0)
  } else if (arg === '--dry-run') {
    dryRun = true
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
const currentParts = parseVersion(manifest.version)
if (currentParts === null) fail('package.json has no plain x.y.z version (found: ' + String(manifest.version) + ')')
const currentVersion = formatVersion(currentParts)

let targetVersion
if (explicitVersion !== null) {
  const parts = parseVersion(explicitVersion)
  if (parts === null) fail('--version must be x.y.z (got: ' + explicitVersion + ')')
  if (compareVersions(parts, currentParts) < 0) {
    fail('--version ' + explicitVersion + ' is lower than the current ' + currentVersion + ' (releases only move forward)')
  }
  targetVersion = formatVersion(parts)
} else if (bumpKind === 'patch') {
  targetVersion = formatVersion([currentParts[0], currentParts[1], currentParts[2] + 1])
} else {
  targetVersion = formatVersion([currentParts[0], currentParts[1] + 1, 0])
}
const targetParts = parseVersion(targetVersion)
const tagName = 'v' + targetVersion
const sameVersion = targetVersion === currentVersion

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
    if (branch !== 'main') warnings.push('branch is "' + branch + '"; releases are usually cut from main')
  }

  const dirty = gitStatusLines()
  if (dirty.length > 0) problems.push('working tree is not clean (' + dirty.length + ' change(s)); commit or stash first')
  else info.push('working tree: clean')

  const existingTag = gitValue(['tag', '--list', tagName])
  if (existingTag !== '') problems.push('tag ' + tagName + ' already exists (delete it or pick a new version)')
  else info.push('tag ' + tagName + ': free')

  // Re-run guard: if HEAD is already the release commit of the CURRENT manifest
  // version, nothing changed since that release. A second invocation of a bumping
  // release would silently cut the next patch/minor, so refuse instead.
  const headTag = gitValue(['describe', '--tags', '--exact-match', 'HEAD'])
  if (headTag === 'v' + currentVersion) {
    problems.push(
      'HEAD is already the ' + headTag + ' release commit; commit new changes before cutting ' + tagName +
        ' (or delete the tag if you really mean to re-tag the same tree)',
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
plan.push('build markers: src/10-constants.js HOST_BUILD and lib/index.js BUILD -> ' + (sameVersion ? 'unchanged' : targetVersion))
plan.push('product: rebuild lib/client.js with node tools/build.mjs')
plan.push('changelog: ' + (existsSync(join(ROOT, 'CHANGELOG.md')) ? 'update CHANGELOG.md' : 'create CHANGELOG.md') + ' (' + tagName + ')')
plan.push('checks: ' + CHECK_CHAIN.map((step) => 'node ' + step.slice(1).join(' ')).join(' && '))
plan.push('snapshot: node tools/snapshot.mjs (backup/, git-ignored)')
plan.push('commit: release: ' + tagName + (sameVersion ? ' (or skip when nothing changed)' : ''))
plan.push('tag: annotated ' + tagName)
plan.push('network: none (push is manual)')

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

  // Build markers: the client half and the host half compare these so a stale host
  // process is visible instead of silently serving old routes. Keep them at the
  // release version; the product is rebuilt below because the client marker lives in src/.
  const constantsPath = join(ROOT, 'src', '10-constants.js')
  if (existsSync(constantsPath)) {
    const text = readText('src/10-constants.js')
    const next = text.replace(/(const HOST_BUILD = ")[^"]+(";)/, '$1' + targetVersion + '$2')
    if (next !== text) {
      writeText('src/10-constants.js', next)
      changes.push('src/10-constants.js')
    }
  }
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
// 2. changelog
// ---------------------------------------------------------------------------
const changelogState = updateChangelog(targetVersion, note)
if (changelogState.action === 'entry-created') changes.push('CHANGELOG.md')
if (changelogState.action === 'notes-added') changes.push('CHANGELOG.md')
console.log('\nchangelog: ' + changelogState.action + ' (' + targetVersion + ')')

// ---------------------------------------------------------------------------
// 3. rebuild + full static chain
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
// 4. snapshot (a consistent copy of exactly what is about to be tagged)
// ---------------------------------------------------------------------------
console.log('\n\u25b6 snapshot: node tools/snapshot.mjs')
const snapshotResult = spawnSync(process.execPath, ['tools/snapshot.mjs'], { cwd: ROOT, encoding: 'utf8' })
process.stdout.write(snapshotResult.stdout ?? '')
process.stderr.write(snapshotResult.stderr ?? '')
if (snapshotResult.status !== 0) fail('snapshot failed; nothing was committed or tagged')
const snapshotMatch = /snapshot\s+(\d{8}-\d{6})/.exec(String(snapshotResult.stdout ?? ''))
const snapshotStamp = snapshotMatch === null ? stampForBackup() : snapshotMatch[1]

// ---------------------------------------------------------------------------
// 5. stage -> commit -> tag
// ---------------------------------------------------------------------------
const changed = gitStatusLines().map(parseStatusLine)
const unexpected = changed.filter((entry) => !OWNED_FILES.includes(entry.path))
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
    notesToBullets(note),
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

const firstNoteLine = notesToBullets(note).split('\n')[0].replace(/^-\s*/, '')
const tag = runGitAsRelease([
  'tag',
  '-a',
  tagName,
  '-m',
  tagName + (firstNoteLine === '' ? '' : ': ' + firstNoteLine),
  '-m',
  notesToBullets(note),
])
if (tag.status !== 0) fail('git tag failed: ' + tag.stderr.trim() + ' (the release commit exists but is not tagged)')

// ---------------------------------------------------------------------------
// 6. report + rollback instructions
// ---------------------------------------------------------------------------
console.log('\n\u2714 release ' + tagName + ' created (local only; nothing was pushed)')
console.log('  tag:      ' + tagName + ' (annotated)')
console.log('  head:     ' + commitSha + (commitCreated ? ' (release commit)' : ' (pre-existing commit, no file changes)'))
console.log('  snapshot: backup/*.' + snapshotStamp + '  +  backup/src.' + snapshotStamp)
console.log('  changelog: CHANGELOG.md (' + targetVersion + ')')
console.log('\npush (manual, after reviewing):')
console.log('  git push origin ' + gitValue(['symbolic-ref', '--short', '-q', 'HEAD']))
console.log('  git push origin ' + tagName)

console.log('\nrollback (before pushing):')
if (commitCreated) console.log('  git reset --hard ' + previousSha)
console.log('  git tag -d ' + tagName)
console.log('  # if the release run failed before commit, restore only the release edits:')
console.log('  git checkout -- ' + OWNED_FILES.filter((file) => file !== 'CHANGELOG.md').join(' '))
console.log('  # newly created CHANGELOG.md: delete it (git checkout cannot remove an untracked file)')

console.log('\nrollback (after pushing):')
console.log('  git push origin :refs/tags/' + tagName)
if (commitCreated) console.log('  git revert --no-edit ' + commitSha)
else console.log('  # no release commit was created; only the tag needs deleting')

console.log('\nrestore paths:')
console.log('  backup/' + snapshotStamp + ' / backup/src.' + snapshotStamp + ' = this release state')
console.log('  npm run restore                = restore the NEWEST snapshot (this release state)')
console.log('  git checkout ' + tagName + '    = inspect the tagged tree')
