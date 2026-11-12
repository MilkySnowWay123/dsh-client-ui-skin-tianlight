# v2.0.1 · 正式版 · 发布产物化 · 多版本兼容护栏 · 用户数据持久化 · 版本指纹

> **天光（TIANLIGHT）** v2.0.1 把「发布、兼容、数据、可核对」四件事补齐：每个版本都有确定的预构建安装包（GitHub Release 4 个附件 + SHA256SUMS），DSH 0.2.0/0.2.1/0.2.2 的正式版与 rc/alpha 预发布都能装、0.3 起被明确拦下，设置与上传壁纸移出插件目录（卸载/重装不丢），并给每次构建一个可核对的版本指纹。
> **本版改动了宿主半：升级后必须重启 DSH 一次，再 Ctrl+F5。**

## 一、发布产物化与不可变 tag（任务 1）

- 新增 `tools/release-artifacts.mjs`：只吃 `tools/pack.mjs` 的产物，生成 4 个 Release 附件——
  `dsh-client-ui-skin-tianlight.tgz`（文件名不带版本号，供 `releases/latest/download`）、
  `dsh-client-ui-skin-tianlight-<版本>.tgz`（同一份字节的副本）、
  `SHA256SUMS.txt`（包内每个文件 + 两个 tgz 自身的 sha256）、
  `build-manifest.json`（version / git commit / HOST_API / lib/client.js sha256 / 构建时间）。
- 打包内置硬校验，任一命中即 CI 失败：包内出现 `state/`、`assets/uploads/`、`assets/derived/`、`backup/`、`diag/`、`tools/`、`src/`、`node_modules/`、`.git`，或文本文件出现本机路径，或包内版本 ≠ tag，或 HOST_API 两端不一致。
- `tools/pack.mjs` 默认产出完整可安装包（含随包演示素材白名单 `bg-4k.mp4`/`cat.png`；用户自备壁纸不会进包），并写入确定性的 `build-info.json`（commit + 提交时间，重打包字节一致）；`--code-only` 可出纯代码包。
- `.github/workflows/release.yml` 改为 `push v* tag` 触发，在干净 ubuntu 环境中依次执行
  `npm run check → node tools/pack.mjs → node tools/release-artifacts.mjs`，然后自动创建/更新 Release 并上传 4 个附件（含 `-` 的版本自动标记 Pre-release）。
- `.github/workflows/check.yml` 移除 tag 打包 job，改为 main/dev/PR 静态链 + `main-is-released` 守卫：push `main` 时 HEAD 必须正好是 `v<版本>` tag。
- **规则**：已发布的 tag 永不移动/重打/删除；开发在 `dev` 分支，`main` 只含已发布代码；发现问题的版本用新补丁号修复。

## 二、DSH 兼容范围修正（任务 2）

- 统一范围：`>=0.2.0-rc.1 <0.2.1-0 || >=0.2.1-0 <0.2.2-0 || >=0.2.2-0 <0.3.0-0`
  （同一串写入 `package.json` → `engines.dsh`、官方包 `peerDependencies`、`skin.json` → `dshCompatibilityRange`）。
- 旧范围 `>=0.2.0-rc.1 <0.3.0` 在默认 semver 下会静默排除 `0.2.1-rc.5` / `0.2.2-rc.1`；新范围对每个 patch 元组写显式预发布分支，正式版/rc/alpha 全部放行、0.3.x 明确拒绝。
- 实证：直接调用已发布的 DSH `0.2.0-rc.2 / 0.2.1-rc.5 / 0.2.2-rc.1` 三版 `dsh-app-boot` 的 `evaluatePluginCompatibility()`——0.2.0 只读 peerDependencies、0.2.1/0.2.2 以 `engines.dsh` 为准——三个真实实现均判 0.2.x 兼容、0.3.0-rc.1 不兼容；三版 profile 模板均为 `autoInstallPeers: false`（peer 只用于兼容判断，不会自动安装官方包）。证据与行号见 `docs/COMPATIBILITY.md` §1b。
- 新增 `tools/compat.mjs`（唯一来源 + 无依赖 semver 判断），`audit` / `verify` / `test` 三处守卫强制一致；`test.mjs` 增加 0.2.0-rc.2 / 0.2.1-alpha.1 / 0.2.1-rc.5 / 0.2.2-rc.1 / 0.2.2 匹配、0.3.0-rc.1 拒绝的断言。

## 三、作者默认外观（任务 6）

- 新增 `presets/tianlight-default.json`：从作者本机实际设置导出并只保留外观键（随包 `bg-4k.mp4` 壁纸、取景、叠加层、玻璃不透明度+档位、排版、特效、时段外观、可读性、播放、默认 cat.png 形象）；聊天记录、念头、权限、天气坐标、本机路径、上传壁纸与 WE 库条目全部剔除。
- **首次安装且没有任何已保存设置**时自动应用该外观；已有设置时绝不覆盖。
- 角色中枢 →「液态玻璃」卡片新增两次点击确认的「恢复默认外观」按钮（只改外观键，不动聊天/权限/天气，也不删除任何上传文件）。
- README 增加「想恢复作者默认外观：角色中枢 → 恢复默认」的说明。

## 四、用户数据移出插件目录（任务 3）

- 宿主半用户数据从插件目录迁移到 DSH 管理的 profile 目录：`$DSH_HOME/profiles/<profile>/tianlight/`
  （`state/` 设置与缓存、`uploads/` 上传壁纸、`derived/` 转码产物、`we-roots.json`、`migration.json`）。
- 证据：DSH 0.2.0/0.2.1/0.2.2 的 profile-boot 都 `hostCtx.provide("profileContext", …)`（含 profile `dir`），官方包也把持久数据放在 profile 目录（如 `created-plugins`、`.plugin-manager`）。
- v2.0.0 及更早版本留在插件目录的数据：新版本**首次启动时复制**到新位置（旧文件保留不删，方便回滚），并写 `migration.json` 诊断记录。
- 卸载/升级不会删除该数据目录；README 说明位置与手动清理方法（退出 DSH 后删除 `$DSH_HOME/profiles/<profile>/tianlight/`）。
- `_engines` 增加 additive 的 `data` 字段（mode/dir 符号化/是否迁移过），便于核对。

## 五、可核对的版本指纹（任务 4）

- 角色中枢「功能自检」/「反馈」面板顶部显示一行**版本指纹**：
  `版本 · git commit 短哈希 · lib/client.js sha256 前 12 位 · HOST_API · DSH 版本 · 安装方式`；
  自检复制文本与反馈 JSON 都包含它，GitHub issue 模板把它设为必填。
- 新增宿主路由 `GET /skin-tianlight/_fingerprint`（additive，不含机器路径）；commit 来自打包时写入的 `build-info.json`（本地链接安装则回退读 `.git`），client sha256 来自实际安装文件，DSH 版本读 `profileContext.installAnchor`，安装方式由 profile 依赖写法判定（local-link / tarball / git / registry）。
- 新增 `tools/verify-install.mjs <插件目录> <SHA256SUMS.txt>`：逐文件比对并输出「完全一致」或 `MISMATCH` / `MISSING` / `EXTRA`（忽略 `state/`、`uploads/` 等用户数据）。
- 指纹与 Release 的 `build-manifest.json` 同源（version / commit / clientSha256 / HOST_API 一致）。

## 发布前验收修复

- **冷启动设置引导重试**：任务 7 矩阵在 DSH 0.2.2-rc.1 + git 源码首次安装时复现——页面冷启动的第一次 `GET /skin-tianlight/_settings` 可能落在宿主半绑定路由之前，拿到 SPA HTML/404 而不是 JSON；旧逻辑把它当成"宿主不可用"，默认外观只写 localStorage、不推送到宿主镜像（该会话后续也不再同步，诊断显示 `lastError: host:bad-json`）。现在只对可恢复的回答（bad JSON / 网络错误 / 404 / 405 / 501）做最多 **4 次、300/600/900ms 退避** 的重试，仍失败才退化为本地模式；诊断新增 `bootstrapAttempts` 便于核对。

## 验证

- 静态链 `npm run check` 全绿：build --check 26 片段、**test 125/125**、structure --strict、audit 无阻断（新增 4 条 v2.0.1 守卫）、check-css 10 块、verify ALL CHECKS PASSED、i18n zh=en 1373。
- 任务 7 验收矩阵：**12/12 组合（3 个真实 DSH 运行时 × 2 种安装形态 × 全新安装/升级）全部通过**，明细见文末表格。
- 矩阵用的 Release tarball 内容与本地 `build-manifest.json` 指纹（version / commit / client sha256 / HOST_API）逐项一致；默认外观 11 个外观键与 `presets/tianlight-default.json` 完全一致；卸载后页面无 `data-dsh-tianlight` 属性/样式/节点。

## 安装与升级

1. 从本 Release 下载 `.tgz` 与 `SHA256SUMS.txt`，按 `PUBLISH.md` 校验（或 `node tools/verify-install.mjs`）。
2. 解压后在 DSH Desktop 插件管理器「安装本地目录」指向该目录；源码用户照旧从仓库目录安装。
3. **升级后重启 DSH 一次**，再 Ctrl+F5；之后纯浏览器半更新只需 Ctrl+F5。
4. 旧版设置/上传壁纸首次启动会自动复制到 `$DSH_HOME/profiles/<profile>/tianlight/`，旧文件保留。

## 已知边界

- 兼容承诺仅限 DSH `>=0.2.0-rc.1 <0.3.0`；0.3.x 起会被 DSH 兼容门禁明确拦下，需先跑兼容矩阵再放宽 `tools/compat.mjs`。
- 卸载插件后数据目录仍保留（设计如此），需要彻底清理时手动删除 `$DSH_HOME/profiles/<profile>/tianlight/`。
- 「恢复默认外观」只覆盖外观键，不会重置聊天、权限、天气与上传文件。
- 默认外观是**确定性快照**：预设把 C1 时段外观（`context.timeOfDay`）固定为关闭；想要随时间变化的氛围，可在 ⑤ 情境面板自行开启。


## 任务 7 验收矩阵（发布前实测）

环境：3 个真实 DSH 运行时（隔离 `$DSH_HOME` + headless Edge CDP）× 2 种安装形态（Release tarball 内容 / git 源码检出）。每个组合依次执行「全新安装 → 从 v2.0.0 升级（卸载再安装）→ 卸载」，全部在临时 DSH_HOME 中完成（不触碰本机 live 数据）。

| DSH 版本 | 安装方式 | 全新安装 | 升级保留（设置 + 上传壁纸） | 卸载无残留 |
|---|---|---|---|---|
| 0.2.0-rc.2 | tarball | ✅ 通过 | ✅ 通过 | ✅ 通过 |
| 0.2.0-rc.2 | git 源码 | ✅ 通过 | ✅ 通过 | ✅ 通过 |
| 0.2.1-rc.5 | tarball | ✅ 通过 | ✅ 通过 | ✅ 通过 |
| 0.2.1-rc.5 | git 源码 | ✅ 通过 | ✅ 通过 | ✅ 通过 |
| 0.2.2-rc.1 | tarball | ✅ 通过 | ✅ 通过 | ✅ 通过 |
| 0.2.2-rc.1 | git 源码 | ✅ 通过 | ✅ 通过 | ✅ 通过 |

每个组合的断言（12/12 通过）：

- `body[data-dsh-tianlight]` 出现；浏览器控制台 0 error / 0 exception；
- `GET /skin-tianlight/_fingerprint` 的 version / git commit / `lib/client.js` sha256 / HOST_API / DSH 版本 / 安装方式与本地 `build-manifest.json` 一致；
- 全新安装：11 个外观键与 `presets/tianlight-default.json` 完全一致（截图见仓库 `screenshots/`）；
- 升级：改过的设置（`tianlight.glass=1.13`）与上传的壁纸都保留；旧插件目录数据未删除；`<profile>/tianlight/migration.json` 迁移记录存在；
- 卸载：DSH 正常启动，无 `data-dsh-tianlight` 属性 / 无皮肤样式表 / 无皮肤节点，控制台干净。

证据：`diag/tmp/task7/runs/20261112-002931/`（`results.json` + `shots/` + `logs/`）。

## 许可

- 本仓库代码 MIT；`vendor/webwallgl/`（MIT）、`vendor/we-wallpaper/`（MIT/Unlicense）许可见 `docs/THIRD-PARTY.md`。
- `assets/` 内演示素材版权归各自权利方，仅用于演示。
