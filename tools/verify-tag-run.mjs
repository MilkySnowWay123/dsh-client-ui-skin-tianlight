// Did pushing the tag actually start the release workflow?
//
// GitHub creates NO push event when one `git push` carries more than three tags, so a
// batch-pushed release tag can land on the remote while zero `release` runs exist — the
// silent failure that made v2.2.0-v2.2.3 ship by hand. A tag push is therefore not done
// until a run exists. This tool answers that one question against the GitHub Actions API:
//
//   node tools/verify-tag-run.mjs v2.3.0              # check now (read-only, no token needed)
//   node tools/verify-tag-run.mjs v2.3.0 --wait 120   # push may still be propagating: poll
//   node tools/verify-tag-run.mjs v2.3.0 --json       # machine-readable
//
// Exit codes: 0 = a run exists (print its status/conclusion), 3 = NO run exists,
// 2 = usage, 4 = the GitHub API could not be read.
//
// The repository is read from package.json `repository.url`; `--repo owner/name`
// overrides it. A token is optional: `GITHUB_TOKEN`/`GH_TOKEN` raises the rate limit
// and lets the tool see a private repository.
const args = process.argv.slice(2)

function usage(exitCode) {
  console.error('usage: node tools/verify-tag-run.mjs <vX.Y.Z> [--wait <seconds>] [--repo <owner/name>] [--json]')
  process.exit(exitCode)
}

const FLAGS_WITH_VALUE = new Set(['--wait', '--repo'])
let tag
for (let index = 0; index < args.length; index += 1) {
  const value = args[index]
  if (FLAGS_WITH_VALUE.has(value)) {
    index += 1
    continue
  }
  if (value.startsWith('--')) continue
  tag = value
  break
}
if (tag === undefined || !/^v\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(tag)) usage(2)
const valueOf = (flag) => {
  const index = args.indexOf(flag)
  return index >= 0 && args[index + 1] !== undefined ? args[index + 1] : undefined
}
const waitSeconds = Number(valueOf('--wait') ?? '0')
if (!Number.isFinite(waitSeconds) || waitSeconds < 0 || waitSeconds > 900) usage(2)
const asJson = args.includes('--json')

const { readFileSync } = await import('node:fs')
const { dirname, join } = await import('node:path')
const { fileURLToPath } = await import('node:url')

function repositoryFromManifest() {
  const root = dirname(dirname(fileURLToPath(import.meta.url)))
  try {
    const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
    const url = String(manifest?.repository?.url ?? '')
    const match = /github\.com[/:]([^/]+)\/([^/.]+?)(?:\.git)?$/.exec(url)
    if (match !== null) return `${match[1]}/${match[2]}`
  } catch {
    // fall through to the usage error below
  }
  return null
}

const repo = valueOf('--repo') ?? repositoryFromManifest()
if (repo === null || !/^[^/\s]+\/[^/\s]+$/.test(repo)) {
  console.error('cannot determine the repository: add a GitHub repository.url to package.json or pass --repo owner/name')
  process.exit(2)
}

const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN ?? ''
const headers = { 'User-Agent': 'tianlight-verify-tag-run', Accept: 'application/vnd.github+json' }
if (token !== '') headers.Authorization = 'Bearer ' + token

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function listReleaseRuns() {
  // One page is enough: the newest 50 runs cover any plausible release window, and the
  // tag is also matched exactly on head_branch, so an old run with the same tag cannot
  // be mistaken for a new one (tags are immutable here, so this is a re-check anyway).
  const url = `https://api.github.com/repos/${repo}/actions/workflows/release.yml/runs?per_page=50`
  const response = await fetch(url, { headers })
  if (!response.ok) {
    const body = await response.text().catch(() => '')
    const error = new Error(`GitHub API ${response.status} ${response.statusText}${body === '' ? '' : ': ' + body.slice(0, 200)}`)
    error.code = 'api'
    throw error
  }
  const payload = await response.json()
  return Array.isArray(payload.workflow_runs) ? payload.workflow_runs : []
}

const started = Date.now()
let found = null
let lastError = null
for (;;) {
  try {
    const runs = await listReleaseRuns()
    found = runs.find((run) => run?.head_branch === tag) ?? null
    lastError = null
  } catch (error) {
    lastError = error
  }
  if (found !== null || lastError !== null) break
  if (Date.now() - started >= waitSeconds * 1000) break
  await sleep(5000)
}

if (asJson) {
  console.log(JSON.stringify({ repo, tag, found: found !== null, run: found }, null, 2))
} else if (found !== null) {
  const finished = found.status === 'completed'
  console.log(`release workflow run FOUND for ${tag} (${repo})`)
  console.log(`  event:      ${found.event}`)
  console.log(`  status:     ${found.status}${finished ? ' / ' + found.conclusion : ' (still running)'}`)
  console.log(`  created:    ${found.created_at}`)
  console.log(`  url:        ${found.html_url}`)
  if (finished && found.conclusion !== 'success') {
    console.log('  verdict:    the workflow ran but did NOT succeed — read the run log before announcing the release')
  }
} else {
  console.error(`release workflow run MISSING for ${tag} (${repo})`)
  if (lastError !== null) console.error(`  api error:  ${lastError.message}`)
  console.error('')
  console.error('A tag push that carries more than three tags produces no push event at all.')
  console.error('Nothing was published by CI for this tag. Fix it without touching the tag:')
  console.error('  1. never move/recreate the tag; it is immutable,')
  console.error('  2. publish from the same tag:')
  console.error(`       gh workflow run release.yml -f tag=${tag}`)
  console.error(`     or the Actions tab -> release -> Run workflow -> tag=${tag},`)
  console.error('  3. next time push tags ONE AT A TIME and re-run this check after each push.')
}

if (lastError !== null) process.exit(4)
process.exit(found === null ? 3 : 0)
