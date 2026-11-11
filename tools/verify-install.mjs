// Verifies one installed plugin directory against the SHA256SUMS.txt of its release.
//
// The role hub's self-test/feedback fingerprint proves which build is running; this
// tool proves that every installed file is byte-identical to the published package.
//
// usage:
//   node tools/verify-install.mjs <installed-plugin-dir> <SHA256SUMS.txt> [--json]
//
// SHA256SUMS.txt lists every packaged file plus the two release .tgz assets. The .tgz
// lines are skipped here (they describe the download, not installed files); everything
// else is compared: missing files, hash mismatches and unexpected packaged files are
// reported. User data written by the plugin (state/, uploads/, derived/, we-roots.json,
// migration.json) and VCS metadata are ignored because they are not package files.
//
// Exit codes: 0 = "完全一致" (every expected file matches and no extra package file),
//             1 = differences found, 2 = usage/read error.
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

/** Paths written by the plugin at runtime (or VCS metadata): never package files. */
const USER_DATA_PATHS = ['state', 'uploads', 'derived', 'we-roots.json', 'migration.json', '.git', '.pack-meta.json']

const USAGE = `usage: node tools/verify-install.mjs <installed-plugin-dir> <SHA256SUMS.txt> [--json]`

function sha256(file) {
  return createHash('sha256').update(readFileSync(file)).digest('hex')
}

/**
 * Compare an installed directory with a SHA256SUMS.txt file.
 * @param installDir - unpacked plugin directory (contains package.json/lib/assets/...).
 * @param sumsFile - the release's SHA256SUMS.txt.
 * @returns {{ok: boolean, matched: number, expected: number, mismatched: Array, missing: string[], extra: string[], skippedAssets: number}}
 */
export function verifyInstall(installDir, sumsFile) {
  const expected = new Map()
  const results = { ok: true, matched: 0, expected: 0, mismatched: [], missing: [], extra: [], skippedAssets: 0 }
  for (const rawLine of readFileSync(sumsFile, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim()
    if (line === '') continue
    const match = /^([0-9a-f]{64})\s{1,2}(.+)$/i.exec(line)
    if (match === null) throw new Error('malformed SHA256SUMS.txt line: ' + line)
    const file = match[2].trim()
    if (/\.(?:tgz|tar\.gz)$/i.test(file)) {
      results.skippedAssets += 1
      continue
    }
    expected.set(file, match[1].toLowerCase())
  }
  results.expected = expected.size
  for (const [file, wanted] of expected) {
    const full = join(installDir, ...file.split('/'))
    if (existsSync(full) === false || statSync(full).isFile() === false) {
      results.missing.push(file)
      continue
    }
    const actual = sha256(full)
    if (actual === wanted) results.matched += 1
    else results.mismatched.push({ file, wanted, actual })
  }
  const walk = (dir, relDir) => {
    let entries = []
    try {
      entries = readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      const rel = relDir === '' ? entry.name : relDir + '/' + entry.name
      if (entry.isDirectory()) walk(join(dir, entry.name), rel)
      else results.extra.push(rel)
    }
  }
  walk(installDir, '')
  const expectedFiles = new Set(expected.keys())
  results.extra = results.extra.filter((rel) => {
    const top = rel.split('/')[0]
    if (USER_DATA_PATHS.includes(top)) return false
    return expectedFiles.has(rel) === false
  })
  if (results.missing.length > 0 || results.mismatched.length > 0 || results.extra.length > 0) results.ok = false
  return results
}

function main(argv) {
  const jsonOutput = argv.includes('--json')
  const args = argv.filter((argument) => argument !== '--json')
  if (args.length !== 2) {
    console.error(USAGE)
    process.exit(2)
  }
  const installDir = resolve(args[0])
  const sumsFile = resolve(args[1])
  if (existsSync(installDir) === false || statSync(installDir).isDirectory() === false) {
    console.error('verify-install: not a directory: ' + installDir)
    process.exit(2)
  }
  if (existsSync(sumsFile) === false) {
    console.error('verify-install: SHA256SUMS.txt not found: ' + sumsFile)
    process.exit(2)
  }
  let results
  try {
    results = verifyInstall(installDir, sumsFile)
  } catch (error) {
    console.error('verify-install: ' + (error instanceof Error ? error.message : String(error)))
    process.exit(2)
  }
  if (jsonOutput === true) {
    console.log(JSON.stringify({ ...results, installDir, sumsFile }, null, 2))
  } else if (results.ok === true) {
    console.log('完全一致：' + results.matched + '/' + results.expected + ' 个文件与 ' + sumsFile + ' 校验通过')
    if (results.skippedAssets > 0) console.log('（已跳过 ' + results.skippedAssets + ' 个 .tgz 发行附件行）')
  } else {
    console.log('校验失败：' + installDir)
    console.log('  一致 ' + results.matched + '/' + results.expected)
    for (const entry of results.mismatched) {
      console.log('  MISMATCH ' + entry.file + '\n    expected ' + entry.wanted + '\n    actual   ' + entry.actual)
    }
    for (const file of results.missing) console.log('  MISSING  ' + file)
    for (const file of results.extra) console.log('  EXTRA    ' + file)
  }
  process.exit(results.ok === true ? 0 : 1)
}

// Run only when executed directly (test.mjs imports verifyInstall without side effects).
if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main(process.argv.slice(2))
}
