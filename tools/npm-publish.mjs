#!/usr/bin/env node
// Publish the packaged skin to the public npm registry.
//
// The npm package is the SAME directory `tools/pack.mjs` builds for the GitHub
// Release (`dist/<name>-<version>/`), so the registry tarball and the Release
// tarball carry the same files. This script only guards identity/auth and then
// runs `npm publish`; it never packs by itself.
//
//   node tools/npm-publish.mjs             # publish (requires `npm login` / token)
//   node tools/npm-publish.mjs --dry-run    # show the resolved tarball, no upload
//   node tools/npm-publish.mjs --dir <path> # publish a different packaged dir
//
// Before uploading it verifies:
//   - the packaged package.json name/version equal the repository manifest;
//   - the package is not private and points its repository at this GitHub repo;
//   - build-info.json matches HEAD (override with --skip-commit-check);
//   - an npm session exists (dry runs skip this).
import { existsSync, readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = dirname(HERE)
const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const skipCommitCheck = args.includes('--skip-commit-check')
const dirIndex = args.indexOf('--dir')
const GITHUB_REPO = 'github.com/MilkySnowWay123/dsh-client-ui-skin-tianlight'

/** Resolve npm's JS entry point so arguments with spaces never pass through cmd.exe. */
function npmEntry() {
  if (typeof process.env.npm_execpath === 'string' && existsSync(process.env.npm_execpath)) return process.env.npm_execpath
  const nodeDir = dirname(process.execPath)
  const candidates = [
    join(nodeDir, 'node_modules', 'npm', 'bin', 'npm-cli.js'),
    join(nodeDir, '..', 'node_modules', 'npm', 'bin', 'npm-cli.js'),
    join(process.env.APPDATA ?? '', 'npm', 'node_modules', 'npm', 'bin', 'npm-cli.js'),
  ]
  return candidates.find((candidate) => existsSync(candidate)) ?? null
}

function run(cmd, cmdArgs) {
  const entry = cmd === 'npm' ? npmEntry() : null
  const realCmd = entry === null ? cmd : process.execPath
  const realArgs = entry === null ? cmdArgs : [entry, ...cmdArgs]
  return spawnSync(realCmd, realArgs, {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: entry === null && process.platform === 'win32',
    windowsHide: true,
  })
}

function fail(message) {
  console.error('npm-publish: ' + message)
  process.exit(1)
}

const manifest = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))
const packageDir = resolve(ROOT, dirIndex >= 0 ? args[dirIndex + 1] : join('dist', `${manifest.name}-${manifest.version}`))
const packagedManifestPath = join(packageDir, 'package.json')
if (existsSync(packagedManifestPath) === false) {
  fail(`packaged directory not found: ${packageDir} (run node tools/pack.mjs first)`)
}
const packaged = JSON.parse(readFileSync(packagedManifestPath, 'utf8'))

const problems = []
if (packaged.name !== manifest.name) problems.push(`packaged name ${packaged.name} != repository name ${manifest.name}`)
if (packaged.version !== manifest.version) problems.push(`packaged version ${packaged.version} != repository version ${manifest.version}`)
if (packaged.private !== undefined) problems.push('packaged manifest still has a private flag (npm would refuse it)')
if (typeof packaged.repository?.url !== 'string' || packaged.repository.url.includes(GITHUB_REPO) === false) {
  problems.push('packaged manifest repository.url must point at ' + GITHUB_REPO)
}
if (Array.isArray(packaged.files) === false || packaged.files.includes('build-info.json') === false) {
  problems.push('packaged manifest files[] must include build-info.json')
}
if (existsSync(join(packageDir, 'build-info.json')) === false) problems.push('build-info.json is missing from the packaged directory')
if (problems.length > 0) fail(problems.join('\n  '))

if (skipCommitCheck === false) {
  const head = run('git', ['rev-parse', 'HEAD'])
  const packagedCommit = String(JSON.parse(readFileSync(join(packageDir, 'build-info.json'), 'utf8')).commit ?? '')
  if (head.status !== 0) fail('cannot read git HEAD')
  if (packagedCommit !== head.stdout.trim()) {
    fail(`build-info.json commit ${packagedCommit} does not match HEAD ${head.stdout.trim()} (repack at the release commit or pass --skip-commit-check)`)
  }
}

if (dryRun === false) {
  const who = run('npm', ['whoami'])
  if (who.status !== 0) {
    fail(
      'npm is not logged in (npm whoami failed). Run `npm login` on this machine, or provide an npm token via NPM_TOKEN/' +
        '~/.npmrc, then retry. The package was NOT uploaded.',
    )
  }
  console.log('npm user: ' + who.stdout.trim())
}

const publishArgs = [
  'publish',
  packageDir,
  '--access',
  'public',
  '--registry',
  'https://registry.npmjs.org/',
  '--ignore-scripts',
]
if (dryRun) publishArgs.push('--dry-run')
console.log(`${dryRun ? '[dry-run] ' : ''}npm ${publishArgs.join(' ')}`)
const publish = run('npm', publishArgs)
process.stdout.write(publish.stdout ?? '')
process.stderr.write(publish.stderr ?? '')
if (publish.status !== 0) fail(`npm publish exited with ${publish.status}`)
if (dryRun) {
  console.log('dry run only: nothing was uploaded. Re-run without --dry-run after `npm login`.')
} else {
  console.log(`published ${packaged.name}@${packaged.version} — verify: npm view ${packaged.name} version`)
}
