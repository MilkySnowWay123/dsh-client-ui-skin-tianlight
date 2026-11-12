#!/usr/bin/env node
// npx dsh-client-ui-skin-tianlight [install|uninstall|doctor] [options]
//
//   install    (default) put this version into a DSH profile and register it
//   uninstall  unregister + remove the package files (user data is kept)
//   doctor     read-only health check of the DSH home / profile / install
//
// options: --profile <name>  --dsh-home <dir>  --dry-run  --force  --lang zh|en
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  LEGACY_PACKAGES,
  PKG_NAME,
  ROW_ID,
  SELF_ROOT,
  compareTrees,
  countFiles,
  inspectInstalled,
  inspectUserData,
  installFiles,
  isDshRunning,
  listProfiles,
  makeBackupDir,
  packageEntries,
  pickProfile,
  planInstall,
  planUninstall,
  pruneBackups,
  readJson,
  removeInstalledFiles,
  resolveDshHome,
  scanPatches,
  writeJsonAtomic,
} from './installer.mjs'

const SELF = readJson(join(SELF_ROOT, 'package.json'))
const VERSION = SELF.version

// ---- args -------------------------------------------------------------------
const argv = process.argv.slice(2)
const flags = new Set(argv.filter((a) => a.startsWith('--') || a === '-h' || a === '-v'))
const value = (name) => {
  const i = argv.indexOf(name)
  return i >= 0 && argv[i + 1] !== undefined && argv[i + 1].startsWith('--') === false ? argv[i + 1] : null
}
const valueFlags = new Set(['--profile', '--dsh-home', '--lang'])
const positional = argv.filter((a, i) => a.startsWith('-') === false && valueFlags.has(argv[i - 1]) === false)
const command = positional[0] ?? 'install'
const dryRun = flags.has('--dry-run')
const force = flags.has('--force')

const envLocale = String(process.env.LC_ALL || process.env.LANG || Intl.DateTimeFormat().resolvedOptions().locale || '')
const lang = value('--lang') === 'en' ? 'en' : value('--lang') === 'zh' ? 'zh' : /^zh/i.test(envLocale) ? 'zh' : 'en'

// ---- messages ---------------------------------------------------------------
const M = {
  zh: {
    title: `天光 TIANLIGHT 皮肤安装器 v${VERSION}`,
    home: (p) => `DSH 数据目录：${p}`,
    noHome: (p) => `找不到 DSH 数据目录 ${p}\n  请先安装并启动一次 DeepSeek Harness；数据目录不在默认位置时用 --dsh-home <目录> 指定。`,
    noProfiles: '这个 DSH 数据目录里还没有 profile。请先启动一次 DSH 再运行本命令。',
    profileMissing: (p, list) => `没有名为 "${p}" 的 profile。现有：${list.join('、') || '（无）'}`,
    profileAmbiguous: (list) => `有多个 profile：${list.join('、')}\n  请用 --profile <名称> 指定要装到哪一个。`,
    profile: (p) => `目标 profile：${p}`,
    notProfile: 'profile 的 package.json 里没有 dsh.profile.bundles，看起来不是 DSH profile，已停止。',
    running: 'DeepSeek Harness 正在运行。请先完全退出（包括托盘图标）再运行本命令；\n  运行中替换插件文件会被 Windows 拒绝（EPERM）。确实要继续可加 --force。',
    runningForced: '注意：DSH 正在运行，已按 --force 继续。',
    runningUnknown: '无法确认 DSH 是否在运行；如果开着，请先退出。',
    current: (k, v) => (k === 'missing' ? '当前：未安装' : k === 'link' ? `当前：链接安装（指向 ${v ?? '未知'}），将改为 npm 版本，链接目标目录不会被改动` : `当前：已安装 ${v ?? '未知版本'}`),
    plan: '将要执行：',
    change: {
      'legacy-dependency-removed': (c) => `移除旧包依赖 ${c.name}`,
      'legacy-bundle-removed': (c) => `移除旧包 bundle 登记 ${c.name}`,
      'dependency-set': (c) => `依赖 ${PKG_NAME}：${c.from ?? '（无）'} → ${c.to}`,
      'bundle-added': () => `在 dsh.profile.bundles 登记 ${PKG_NAME}`,
      'dependency-removed': (c) => `移除依赖 ${c.name}`,
      'bundle-removed': (c) => `移除 bundle 登记 ${c.name}`,
    },
    copy: (n) => `复制插件文件到 node_modules/${PKG_NAME}（${n} 个文件）`,
    sameFiles: '插件文件已是这个版本且逐字节一致，跳过复制',
    manifestSame: 'profile 登记已经正确，无需修改',
    dry: '（--dry-run：只显示计划，没有改动任何文件）',
    backup: (p) => `已备份到：${p}`,
    verified: (n) => `校验通过：${n} 个文件与发布包一致`,
    verifyFailed: (n) => `校验失败：${n} 个文件不一致，安装可能不完整（备份在上面的目录）`,
    patchDisabled: (f) => `警告：${f} 里有一段把 ${ROW_ID} 设为 disabled: true，皮肤会被禁用。\n    请在插件管理器里启用，或删掉那一段后重启 DSH（本工具不会改 cordis.patch.yml）。`,
    patchInsert: (f) => `警告：${f} 里手写插入了 ${ROW_ID} 行，会与插件自带的行重复挂载，请删掉那一段。`,
    data: (d) => (d.exists ? `你的天光数据保留在：${d.root}（设置版本 ${d.revision ?? '未知'}，上传 ${d.uploads} 个）` : '还没有天光用户数据（首次安装会自动套用作者默认外观）'),
    installed: (v) => `完成：天光 ${v} 已安装。`,
    next: [
      '下一步：',
      '  1. 打开 DeepSeek Harness（如果开着，请完全退出后重开）；',
      '  2. 页面按 Ctrl+F5；',
      '  3. 插件管理器里能看到 dsh-client-ui-skin-tianlight。',
      '  profile 的 pnpm-lock.yaml 会在插件管理器下一次安装/更新时自动补齐。',
    ],
    uninstalled: '完成：已从 profile 移除天光（用户数据未删除；插件文件已移到备份目录）。',
    nothing: '这个 profile 里没有安装天光，无需卸载。',
    doctorTitle: '体检结果：',
    ok: '正常',
    warn: '注意',
    err: '问题',
    dRegistered: (s) => `已登记依赖 ${PKG_NAME}@${s}`,
    dNotRegistered: `没有登记依赖 ${PKG_NAME}`,
    dBundle: (y) => (y ? '已登记到 dsh.profile.bundles' : '没有登记到 dsh.profile.bundles（不会被加载）'),
    dLegacy: (n) => `仍登记了旧包 ${n}（会重复挂载），运行 install 会自动移除`,
    dFiles: (i) => (i.kind === 'missing' ? 'node_modules 里没有插件文件' : i.kind === 'link' ? `插件是链接安装，指向 ${i.linkTarget ?? '未知'}` : `已安装文件版本 ${i.version ?? '未知'}${i.buildInfo?.commit ? `（commit ${String(i.buildInfo.commit).slice(0, 8)}）` : ''}`),
    dMismatch: (a, b) => `登记的版本 ${a} 与已安装文件版本 ${b} 不一致`,
    dSameAsSelf: (n) => `已安装文件与本安装器自带的 ${VERSION} 发布包逐字节一致（${n} 个文件）`,
    dDiffSelf: (n) => `已安装文件与 ${VERSION} 发布包有 ${n} 处不同（可能被修改或损坏），可运行 install 修复`,
    dNewer: (v) => `有新版本可装：${v}（运行 npx ${PKG_NAME}@latest）`,
    dRunning: (r) => (r === true ? 'DSH 正在运行' : r === false ? 'DSH 未运行' : '无法确认 DSH 是否在运行'),
    summary: (e, w) => `结论：${e} 个问题，${w} 个注意事项`,
    usage: `用法：npx ${PKG_NAME} [install|uninstall|doctor] [--profile <名称>] [--dsh-home <目录>] [--dry-run] [--force] [--lang zh|en]`,
    unknownCommand: (c) => `未知命令：${c}`,
    failed: (m) => `安装失败：${m}`,
  },
  en: {
    title: `TIANLIGHT skin installer v${VERSION}`,
    home: (p) => `DSH home: ${p}`,
    noHome: (p) => `DSH home not found: ${p}\n  Install and start DeepSeek Harness once first, or pass --dsh-home <dir>.`,
    noProfiles: 'This DSH home has no profile yet. Start DSH once, then run this command again.',
    profileMissing: (p, list) => `No profile named "${p}". Existing: ${list.join(', ') || '(none)'}`,
    profileAmbiguous: (list) => `Several profiles exist: ${list.join(', ')}\n  Pick one with --profile <name>.`,
    profile: (p) => `Target profile: ${p}`,
    notProfile: 'The profile package.json has no dsh.profile.bundles; it does not look like a DSH profile. Stopped.',
    running: 'DeepSeek Harness is running. Quit it completely (tray icon too) and run this again;\n  Windows refuses to replace plugin files while DSH has them open (EPERM). Use --force to continue anyway.',
    runningForced: 'Note: DSH is running; continuing because of --force.',
    runningUnknown: 'Could not tell whether DSH is running; quit it first if it is.',
    current: (k, v) => (k === 'missing' ? 'Current: not installed' : k === 'link' ? `Current: linked install (-> ${v ?? 'unknown'}); it becomes the npm version and the linked folder is left untouched` : `Current: installed ${v ?? 'unknown version'}`),
    plan: 'Plan:',
    change: {
      'legacy-dependency-removed': (c) => `remove legacy dependency ${c.name}`,
      'legacy-bundle-removed': (c) => `remove legacy bundle entry ${c.name}`,
      'dependency-set': (c) => `dependency ${PKG_NAME}: ${c.from ?? '(none)'} -> ${c.to}`,
      'bundle-added': () => `register ${PKG_NAME} in dsh.profile.bundles`,
      'dependency-removed': (c) => `remove dependency ${c.name}`,
      'bundle-removed': (c) => `remove bundle entry ${c.name}`,
    },
    copy: (n) => `copy the package files to node_modules/${PKG_NAME} (${n} files)`,
    sameFiles: 'Package files are already this version and byte-identical; copy skipped',
    manifestSame: 'Profile registration is already correct',
    dry: '(--dry-run: plan only, nothing was changed)',
    backup: (p) => `Backup: ${p}`,
    verified: (n) => `Verified: ${n} files match the published package`,
    verifyFailed: (n) => `Verification failed: ${n} files differ; the install may be incomplete (see the backup above)`,
    patchDisabled: (f) => `Warning: ${f} sets ${ROW_ID} to disabled: true, which keeps the skin off.\n    Enable it in the plugin manager or delete that block and restart DSH (this tool never edits cordis.patch.yml).`,
    patchInsert: (f) => `Warning: ${f} inserts a ${ROW_ID} row by hand; it double-mounts the skin. Delete that block.`,
    data: (d) => (d.exists ? `Your Tianlight data stays in: ${d.root} (settings revision ${d.revision ?? 'unknown'}, ${d.uploads} uploads)` : 'No Tianlight user data yet (a fresh install applies the author default look)'),
    installed: (v) => `Done: Tianlight ${v} is installed.`,
    next: [
      'Next:',
      '  1. Open DeepSeek Harness (quit and reopen it if it was running);',
      '  2. press Ctrl+F5 in the page;',
      '  3. the plugin manager lists dsh-client-ui-skin-tianlight.',
      '  The profile pnpm-lock.yaml is completed by the plugin manager on its next install/update.',
    ],
    uninstalled: 'Done: Tianlight was removed from the profile (user data kept; package files moved to the backup folder).',
    nothing: 'Tianlight is not installed in this profile; nothing to remove.',
    doctorTitle: 'Health check:',
    ok: 'ok',
    warn: 'warn',
    err: 'problem',
    dRegistered: (s) => `dependency ${PKG_NAME}@${s} is registered`,
    dNotRegistered: `dependency ${PKG_NAME} is not registered`,
    dBundle: (y) => (y ? 'registered in dsh.profile.bundles' : 'not in dsh.profile.bundles (it will not load)'),
    dLegacy: (n) => `legacy package ${n} is still registered (double mount); install removes it`,
    dFiles: (i) => (i.kind === 'missing' ? 'no package files in node_modules' : i.kind === 'link' ? `linked install -> ${i.linkTarget ?? 'unknown'}` : `installed files: version ${i.version ?? 'unknown'}${i.buildInfo?.commit ? ` (commit ${String(i.buildInfo.commit).slice(0, 8)})` : ''}`),
    dMismatch: (a, b) => `registered version ${a} differs from installed files ${b}`,
    dSameAsSelf: (n) => `installed files are byte-identical to the ${VERSION} package shipped with this installer (${n} files)`,
    dDiffSelf: (n) => `installed files differ from the ${VERSION} package in ${n} places (modified or damaged); run install to repair`,
    dNewer: (v) => `a newer version is available: ${v} (run npx ${PKG_NAME}@latest)`,
    dRunning: (r) => (r === true ? 'DSH is running' : r === false ? 'DSH is not running' : 'could not tell whether DSH is running'),
    summary: (e, w) => `Result: ${e} problems, ${w} warnings`,
    usage: `usage: npx ${PKG_NAME} [install|uninstall|doctor] [--profile <name>] [--dsh-home <dir>] [--dry-run] [--force] [--lang zh|en]`,
    unknownCommand: (c) => `unknown command: ${c}`,
    failed: (m) => `install failed: ${m}`,
  },
}[lang]

const say = (line = '') => console.log(line)
const die = (line, code = 1) => {
  console.error(line)
  process.exit(code)
}

// ---- shared steps -----------------------------------------------------------
function locate() {
  const dshHome = resolveDshHome({ dshHome: value('--dsh-home') })
  say(M.home(dshHome))
  if (existsSync(dshHome) === false) die(M.noHome(dshHome))
  const profiles = listProfiles(dshHome)
  const picked = pickProfile(profiles, value('--profile'))
  if (picked.ok === false) {
    if (picked.reason === 'no-profiles') die(M.noProfiles)
    if (picked.reason === 'profile-missing') die(M.profileMissing(value('--profile'), profiles))
    die(M.profileAmbiguous(profiles))
  }
  say(M.profile(picked.profile))
  return { dshHome, profile: picked.profile, profileDir: join(dshHome, 'profiles', picked.profile) }
}

function guardRunning() {
  const running = isDshRunning()
  if (running === true && force === false && dryRun === false) die(M.running, 3)
  if (running === true && force) say(M.runningForced)
  if (running === null) say(M.runningUnknown)
}

function reportPatches(dshHome, profileDir) {
  let count = 0
  for (const item of scanPatches(dshHome, profileDir)) {
    say(item.finding === 'disabled' ? M.patchDisabled(item.file) : M.patchInsert(item.file))
    count += 1
  }
  return count
}

// ---- commands ---------------------------------------------------------------
function install() {
  const { dshHome, profileDir } = locate()
  guardRunning()
  const manifestPath = join(profileDir, 'package.json')
  const manifest = readJson(manifestPath)
  const plan = planInstall(manifest, VERSION)
  if (plan.ok === false) die(M.notProfile)
  const before = inspectInstalled(profileDir)
  say(M.current(before.kind, before.kind === 'link' ? before.linkTarget : before.version))

  const entries = packageEntries(SELF_ROOT)
  const fileCount = countFiles(SELF_ROOT, entries)
  const sameFiles = before.kind === 'dir' && before.version === VERSION && compareTrees(SELF_ROOT, before.path, entries).length === 0
  say(M.plan)
  if (plan.changes.length === 0) say('  - ' + M.manifestSame)
  for (const change of plan.changes) say('  - ' + M.change[change.kind](change))
  say('  - ' + (sameFiles ? M.sameFiles : M.copy(fileCount)))
  if (dryRun) {
    reportPatches(dshHome, profileDir)
    say(M.dry)
    return
  }

  const backupDir = makeBackupDir(profileDir)
  say(M.backup(backupDir))
  if (sameFiles === false) installFiles({ srcRoot: SELF_ROOT, profileDir, backupDir, entries })
  if (plan.changes.length > 0) writeJsonAtomic(manifestPath, plan.manifest)
  pruneBackups(profileDir)

  const problems = compareTrees(SELF_ROOT, join(profileDir, 'node_modules', PKG_NAME), entries)
  if (problems.length > 0) {
    for (const p of problems.slice(0, 10)) say(`  ${p.problem}: ${p.path}`)
    die(M.verifyFailed(problems.length))
  }
  say(M.verified(fileCount))
  reportPatches(dshHome, profileDir)
  say(M.data(inspectUserData(profileDir)))
  say()
  say(M.installed(VERSION))
  for (const line of M.next) say(line)
}

function uninstall() {
  const { profileDir } = locate()
  guardRunning()
  const manifestPath = join(profileDir, 'package.json')
  const plan = planUninstall(readJson(manifestPath))
  const before = inspectInstalled(profileDir)
  if (plan.changes.length === 0 && before.kind === 'missing') {
    say(M.nothing)
    return
  }
  say(M.plan)
  for (const change of plan.changes) say('  - ' + M.change[change.kind](change))
  if (dryRun) {
    say(M.dry)
    return
  }
  const backupDir = makeBackupDir(profileDir)
  say(M.backup(backupDir))
  removeInstalledFiles({ profileDir, backupDir })
  if (plan.changes.length > 0) writeJsonAtomic(manifestPath, plan.manifest)
  pruneBackups(profileDir)
  say(M.data(inspectUserData(profileDir)))
  say(M.uninstalled)
}

function doctor() {
  const { dshHome, profileDir } = locate()
  const rows = []
  const add = (level, text) => rows.push({ level, text })
  const running = isDshRunning()
  add(running === null ? 'warn' : 'ok', M.dRunning(running))

  const manifest = readJson(join(profileDir, 'package.json'))
  const spec = manifest.dependencies?.[PKG_NAME]
  const bundles = Array.isArray(manifest.dsh?.profile?.bundles) ? manifest.dsh.profile.bundles : []
  add(spec ? 'ok' : 'err', spec ? M.dRegistered(spec) : M.dNotRegistered)
  add(bundles.includes(PKG_NAME) ? 'ok' : 'err', M.dBundle(bundles.includes(PKG_NAME)))
  for (const legacy of LEGACY_PACKAGES) {
    if (manifest.dependencies?.[legacy] !== undefined || bundles.includes(legacy)) add('err', M.dLegacy(legacy))
  }

  const installed = inspectInstalled(profileDir)
  add(installed.kind === 'missing' ? 'err' : installed.kind === 'link' ? 'warn' : 'ok', M.dFiles(installed))
  if (installed.kind === 'dir' && spec && /^\d/.test(spec) && installed.version !== spec) add('err', M.dMismatch(spec, installed.version))
  if (installed.kind === 'dir' && installed.version === VERSION) {
    const entries = packageEntries(SELF_ROOT)
    const diff = compareTrees(SELF_ROOT, installed.path, entries)
    add(diff.length === 0 ? 'ok' : 'err', diff.length === 0 ? M.dSameAsSelf(countFiles(SELF_ROOT, entries)) : M.dDiffSelf(diff.length))
  }
  for (const item of scanPatches(dshHome, profileDir)) {
    add('err', item.finding === 'disabled' ? M.patchDisabled(item.file) : M.patchInsert(item.file))
  }
  const data = inspectUserData(profileDir)
  add('ok', M.data(data))
  if (installed.kind === 'dir' && installed.version && compareVersions(VERSION, installed.version) > 0) add('warn', M.dNewer(VERSION))

  say()
  say(M.doctorTitle)
  const label = { ok: M.ok, warn: M.warn, err: M.err }
  for (const row of rows) say(`  [${label[row.level]}] ${row.text}`)
  const errors = rows.filter((r) => r.level === 'err').length
  const warns = rows.filter((r) => r.level === 'warn').length
  say(M.summary(errors, warns))
  if (errors > 0) process.exitCode = 1
}

function compareVersions(a, b) {
  const pa = String(a).split(/[.-]/).map((x) => (/^\d+$/.test(x) ? Number(x) : x))
  const pb = String(b).split(/[.-]/).map((x) => (/^\d+$/.test(x) ? Number(x) : x))
  for (let i = 0; i < 3; i += 1) {
    if (pa[i] !== pb[i]) return Number(pa[i]) > Number(pb[i]) ? 1 : -1
  }
  return 0
}

// ---- main -------------------------------------------------------------------
if (flags.has('--help') || flags.has('-h') || command === 'help') {
  say(M.usage)
  process.exit(0)
}
if (flags.has('--version') || flags.has('-v')) {
  say(VERSION)
  process.exit(0)
}
say(M.title)
try {
  if (command === 'install') install()
  else if (command === 'uninstall') uninstall()
  else if (command === 'doctor') doctor()
  else die(M.unknownCommand(command) + '\n' + M.usage, 2)
} catch (error) {
  const message = error instanceof Error ? `${error.code ? error.code + ' ' : ''}${error.message}` : String(error)
  die(M.failed(message))
}
