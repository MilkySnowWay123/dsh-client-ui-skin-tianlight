// What does a NEWER DSH say changed? Read its own upgrade guides and report only the
// items that touch surfaces this skin actually uses.
//
// The skin never branches on a DSH version; it discovers surfaces at runtime. The risk
// is therefore never "the version is unknown", it is "a documented break lands on a
// surface the bridge or the host half depends on". The installed DSH ships
// `docs/upgrade-guide/README.md` with one `## v<T>` section per release (v<T> is the
// release being LEFT), so the guides newer than the newest version we tested are
// exactly the unreviewed surface changes.
//
//   node tools/guide-diff.mjs                    # auto-detect an npm/CLI DSH install
//   node tools/guide-diff.mjs --dsh <node_modules/@deepseek-ai>
//   node tools/guide-diff.mjs --docs <.../upgrade-guide/README.md> [--since 0.2.2]
//   node tools/guide-diff.mjs --all              # list every unseen item, matched or not
//
// Exit codes: 0 = no unseen guide touches a skin surface (or no guides are shipped),
// 3 = REVIEW NEEDED (an unseen guide matches a surface), 2 = usage, 4 = docs unreadable.
import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { compareVersions, parseVersion } from './compat.mjs'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))

const args = process.argv.slice(2)
const valueOf = (flag) => {
  const index = args.indexOf(flag)
  return index >= 0 && args[index + 1] !== undefined ? args[index + 1] : undefined
}
const listAll = args.includes('--all')
const sinceArg = valueOf('--since')

/**
 * Skin surfaces and the exact words a guide summary uses to describe them.
 *
 * Patterns are deliberately narrow: a diff tool that reports 38 of 40 items is the
 * same as one that reports none. `session`, `model`, `api`, `plugin` and `event` are
 * NOT patterns on their own — they appear in almost every guide — each surface names
 * the phrase that actually implies it needs this skin to change.
 */
const SURFACES = [
  {
    id: 'window/titlebar',
    label: '标题栏 / 窗口',
    patterns: [/window[ -]?drag/i, /title ?bar/i, /no-drag/i, /drag region/i, /overlay/i, /窗口/, /标题栏/, /拖拽/, /浮层/],
  },
  {
    id: 'sidebar/session',
    label: '会话列表 / 侧栏',
    patterns: [/sidebar/i, /session row/i, /session list/i, /会话列表/, /侧栏/],
  },
  {
    id: 'composer',
    label: '输入框 / composer',
    patterns: [/composer/i, /message input/i, /输入框/],
  },
  {
    id: 'settings/plugins',
    label: '设置页 / 插件页',
    patterns: [/settings (?:page|section|slot|general)/i, /settings\./i, /插件页/, /设置页/],
  },
  {
    id: 'client/loader',
    label: '客户端加载器 / Slot',
    patterns: [/__ModuleLoader__/, /\bslot\b/i, /client (?:plugin|bundle|module|ui|overlay)/i, /loader entry/i, /客户端插件/, /插槽/],
  },
  {
    id: 'theme/css',
    label: '主题 / CSS',
    patterns: [/theme (?:service|token|package)/i, /css/i, /stylesheet/i, /主题令牌/, /样式表/],
  },
  {
    id: 'remote/route',
    label: 'Remote / 宿主路由',
    patterns: [/remote (?:method|import|namespace|event|dependency)/i, /host route/i, /web server/i, /宿主路由/],
  },
  {
    id: 'model/credential',
    label: '模型目录 / 凭据（桌宠 AI）',
    patterns: [/\bllm\b/i, /model (?:error|request|listing|route|catalog|selection)/i, /credential/i, /模型(?:目录|请求|列表|错误)/, /凭据/],
  },
  {
    id: 'bundle/install',
    label: 'Bundle / 安装与兼容门禁',
    patterns: [/bundleinfo/i, /plugin (?:update|manager|entry|compatibility)/i, /engines\.dsh/i, /兼容(?:性|门禁)/, /插件(?:更新|管理|兼容)/],
  },
]

function docsRoot() {
  const explicit = valueOf('--docs')
  if (explicit) return existsSync(explicit) ? explicit : null
  const dshRoots = []
  const fromArg = valueOf('--dsh')
  if (fromArg) dshRoots.push(fromArg)
  if (process.env.DSH_PKGS_ROOT) dshRoots.push(process.env.DSH_PKGS_ROOT)
  dshRoots.push(join(homedir(), '.dsh', 'profiles', 'web', 'node_modules', '@deepseek-ai'))
  for (const root of dshRoots) {
    const candidate = join(root, 'dsh', 'docs', 'upgrade-guide', 'README.md')
    if (existsSync(candidate)) return candidate
  }
  return null
}

function baselineVersion() {
  if (sinceArg !== undefined) return sinceArg
  try {
    const skin = JSON.parse(readFileSync(join(ROOT, 'skin.json'), 'utf8'))
    const tested = Array.isArray(skin.dshCompatibilityTested) ? skin.dshCompatibilityTested : []
    const valid = tested.filter((version) => typeof version === 'string' && parseVersion(version) !== null)
    valid.sort(compareVersions)
    return valid.length === 0 ? '' : valid[valid.length - 1]
  } catch {
    return ''
  }
}

/** Parse the guide index into [{ version, items: [{ title, summary, path }] }]. */
function parseIndex(text) {
  const sections = []
  let current = null
  for (const line of text.split(/\r?\n/)) {
    const heading = /^##\s+v(\S+)\s*$/.exec(line.trim())
    if (heading !== null) {
      current = { version: heading[1], items: [] }
      sections.push(current)
      continue
    }
    if (current === null || !line.trim().startsWith('|')) continue
    const cells = line.split('|').slice(1, -1).map((cell) => cell.trim())
    if (cells.length < 3) continue
    if (cells[0].toLowerCase() === 'item' || /^-{3,}$/.test(cells[0])) continue
    // English and Chinese guide links are the last two cells.
    const links = cells.filter((cell) => /\]\(([^)]+)\)/.test(cell))
    const path = links.length > 0 ? /\[[^\]]*\]\(([^)]+)\)/.exec(links[links.length - 1])[1] : ''
    const summary = [cells[1], cells[2]].filter((cell) => cell !== '').join(' / ')
    if (cells[0] === '') continue
    current.items.push({ title: cells[0].replace(/`/g, ''), summary, path })
  }
  return sections
}

function matchSurfaces(item) {
  const haystack = item.title + ' ' + item.summary
  const hits = []
  for (const surface of SURFACES) {
    if (surface.patterns.some((pattern) => pattern.test(haystack))) hits.push(surface)
  }
  return hits
}

const docs = docsRoot()
if (docs === null) {
  // A slim install legitimately has no docs (the Desktop asar is not readable by a
  // plain node), so this is "cannot answer here", not "no breakdowns".
  console.error('guide-diff: no DSH upgrade-guide index found; pass --dsh <node_modules/@deepseek-ai> or --docs <README.md>')
  console.error('            (Desktop ships its docs inside app.asar: run this against an npm-installed DSH, or in CI.)')
  process.exit(4)
}

let text
try {
  text = readFileSync(docs, 'utf8')
} catch (error) {
  console.error('guide-diff: cannot read ' + docs + ': ' + (error instanceof Error ? error.message : String(error)))
  process.exit(4)
}

const since = baselineVersion()
const sections = parseIndex(text)
const unseen = sections.filter((section) => {
  if (parseVersion(section.version) === null) return false
  if (since === '') return true
  try {
    return compareVersions(section.version, since) > 0
  } catch {
    return false
  }
})

const hits = []
for (const section of unseen) {
  for (const item of section.items) {
    const surfaces = matchSurfaces(item)
    if (surfaces.length > 0) hits.push({ section: section.version, item, surfaces })
  }
}

console.log('guide-diff: ' + docs)
console.log('  baseline (newest skin.json.dshCompatibilityTested): ' + (since === '' ? '?' : since))
console.log('  unseen guide sections: ' + unseen.length + ' (' + unseen.map((section) => 'v' + section.version).join(', ') + ')')
console.log('')

if (listAll) {
  for (const section of unseen) {
    console.log('v' + section.version)
    for (const item of section.items) {
      const surfaces = matchSurfaces(item)
      console.log('  - ' + item.title + (surfaces.length === 0 ? '' : '  <-- ' + surfaces.map((surface) => surface.id).join(', ')))
    }
  }
  console.log('')
}

if (hits.length === 0) {
  console.log('  no unseen guide mentions a skin surface; nothing to re-verify for this install.')
  process.exit(0)
}

console.log('  REVIEW NEEDED: ' + hits.length + ' unseen guide item(s) touch a surface the skin uses:')
for (const hit of hits) {
  console.log('')
  console.log('  v' + hit.section + '  ' + hit.item.title)
  console.log('    surfaces: ' + hit.surfaces.map((surface) => surface.label).join(' / '))
  console.log('    summary:  ' + hit.item.summary.slice(0, 220))
  if (hit.item.path !== '') console.log('    guide:    ' + hit.item.path)
}
console.log('')
console.log('  Next: read each guide, decide per surface in docs/COMPAT-0.3.0.md whether the')
console.log('  skin still detects it, then run hook-scan/upgrade-check against that install.')
process.exit(3)
