// Prepares a PUBLIC release build in a copied repository (the GitHub upload mirror).
//
// Why: `.github/workflows/check.yml` enforces the tag/version invariant "tag === v +
// package.json version". The internal development tree (tianlight) uses internal
// versions (e.g. 1.6.2) while the public repository is labelled with its public
// release version (e.g. 1.0.1). This tool turns an internal tree into a public
// build: it patches the four version markers, records the internal identity in
// INTERNAL-BUILD.json, rebuilds lib/client.js and prints the git commands to run.
//
// usage:
//   node tools/public-release.mjs --dir <mirror checkout> --version 1.0.2 \
//     --internal-version 1.6.3 --internal-tag v1.6.3 [--internal-sha <sha256>]
//
// The tool never runs git. Build/verify afterwards inside <dir>:
//   node tools/build.mjs && node tools/build.mjs --check && node tools/test.mjs && ...
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const args = process.argv.slice(2)
const get = (name, fallback = null) => {
  const index = args.indexOf(name)
  return index >= 0 && args[index + 1] !== undefined ? args[index + 1] : fallback
}
const dir = get('--dir')
const version = get('--version')
const internalVersion = get('--internal-version')
const internalTag = get('--internal-tag')
const internalSha = get('--internal-sha')
if (!dir || !version || !internalVersion || !internalTag) {
  console.error('usage: node tools/public-release.mjs --dir <mirror checkout> --version <publicVersion> --internal-version <internalVersion> --internal-tag <internalTag> [--internal-sha <sha256>]')
  process.exit(2)
}
if (existsSync(dir) === false) {
  console.error('public-release: directory not found: ' + dir)
  process.exit(2)
}
const read = (rel) => readFileSync(join(dir, rel), 'utf8')
const write = (rel, text) => writeFileSync(join(dir, rel), text)
const patch = (rel, from, to) => {
  const text = read(rel)
  if (text.includes(from) === false) throw new Error(`${rel} does not contain ${from}`)
  write(rel, text.split(from).join(to))
}

try {
  // package.json / skin.json version
  for (const file of ['package.json', 'skin.json']) {
    const text = read(file)
    const next = text.replace(/"version": "[^"]+"/, `"version": "${version}"`)
    if (next === text) throw new Error('cannot patch version in ' + file)
    write(file, next)
  }
  // host/client build handshake markers
  const host = read('lib/index.js')
  const nextHost = host.replace(/const BUILD = '[^']+'/, `const BUILD = '${version}'`)
  if (nextHost === host) throw new Error('cannot patch BUILD in lib/index.js')
  write('lib/index.js', nextHost)
  const constants = read('src/10-constants.js')
  const nextConstants = constants.replace(/const HOST_BUILD = "[^"]+"/, `const HOST_BUILD = "${version}"`)
  if (nextConstants === constants) throw new Error('cannot patch HOST_BUILD in src/10-constants.js')
  write('src/10-constants.js', nextConstants)
  // optional docs examples that name the internal version
  const feedback = '.github/ISSUE_TEMPLATE/feedback.yml'
  if (existsSync(join(dir, feedback))) {
    write(feedback, read(feedback).split('v' + internalVersion).join('v' + version))
  }
  // rebuild the product so the shipped client carries the public version markers
  const build = spawnSync(process.execPath, [join(dir, 'tools/build.mjs')], { encoding: 'utf8' })
  if (build.status !== 0) {
    console.error(build.stdout.trim())
    console.error(build.stderr.trim())
    throw new Error('build failed in ' + dir)
  }
  // provenance for the public repo
  write(
    'INTERNAL-BUILD.json',
    JSON.stringify(
      {
        publicVersion: 'v' + version,
        internalVersion: 'v' + internalVersion,
        internalTag,
        internalClientSha256: internalSha || null,
        note: 'The public repository is versioned by its public release label. The same code was built internally as internalVersion; its verifier evidence and RELEASE docs are kept under docs/.',
      },
      null,
      2,
    ) + '\n',
  )
  console.log(`public-release: ${dir}`)
  console.log(`  public v${version} (internal v${internalVersion} @ ${internalTag})`)
  console.log(`  ${build.stdout.trim()}`)
  console.log('next steps (inside the mirror checkout):')
  console.log(`  node tools/build.mjs --check && node tools/test.mjs && node tools/structure.mjs --strict && node tools/audit.mjs && node tools/check-css.mjs && node tools/verify.mjs && node tools/i18n-audit.mjs`)
  console.log(`  node tools/pack.mjs`)
  console.log(`  git add -A && git commit -m "release: v${version} (public build of internal v${internalVersion})"`)
  console.log(`  git tag -f v${version} && git push origin main && git push -f origin refs/tags/v${version}`)
} catch (error) {
  console.error('public-release refused: ' + (error instanceof Error ? error.message : String(error)))
  process.exit(1)
}
