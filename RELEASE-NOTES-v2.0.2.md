# v2.0.2 · 正式版 · npm 发布 · 包名迁移为 dsh-client-ui-skin-tianlight

> **天光（TIANLIGHT）** v2.0.2 把安装门槛降到一条命令：插件现在发布到公开 **npm registry**（`dsh-client-ui-skin-tianlight`），DSH Desktop 插件管理器/市场可直接按包名安装、按 registry 版本升级，无需下载 Release 附件或手工放目录。
> **注意：本版改了包名（bundle 名）。旧用户需要迁移一次；用户数据（设置、上传壁纸）不受影响。升级后重启 DSH 一次 + Ctrl+F5。**

## 一、npm 发布（本版重点）

- 包名：**`dsh-client-ui-skin-tianlight`**（公开 registry，预构建，无安装脚本，免 `allowBuilds` 构建授权）。
- 安装（任选）：
  - DSH Desktop → 插件管理器 → 安装/添加插件，输入 `dsh-client-ui-skin-tianlight`；插件管理器会登记依赖与 `dsh.profile.bundles`。
  - 命令行：`dsh plugin --profile desktop add dsh-client-ui-skin-tianlight`，然后在插件管理器启用 `ui-skin-tianlight` 行。
  - 从插件市场（dsh-market）安装：待 awesome 列表/市场刷新后可一键安装。
- 升级：插件管理器「更新」按 npm 最新版更新；或 `dsh plugin --profile desktop add dsh-client-ui-skin-tianlight@latest`，随后重启 DSH + Ctrl+F5。
- npm 包与 GitHub Release tarball **同源**：两者都由 `node tools/pack.mjs` 的同一目录生成，文件集合逐字节一致（44 个文件）；npm tarball 额外自动带 `package.json` 的标准字段（LICENSE/README 本来就在包内）。
- 维护者发布：`node tools/pack.mjs` → `node tools/npm-publish.mjs --dry-run`（校验身份/版本/非 private/repository/build-info=HEAD）→ `npm login`（或 token）→ `node tools/npm-publish.mjs`。见 `PUBLISH.md`。

## 二、包名迁移（旧用户必读）

- 旧包名 `@dsh-external/dsh-client-ui-skin-tianlight` 是 `link:`/本地目录安装的约定名，**不是可发布作用域**，所以 v2.0.2 起统一为 `dsh-client-ui-skin-tianlight`。
- DSH 用 profile 的包名解析 bundle（`resolveBundleDir`）并用 bundle patch 的 insert name 挂载插件，因此 **包名、`cordis.patch.yml` 名、浏览器模块 id、`skin.json.package`、宿主指纹包名一起改**；`lib/client.js` 的模块 id 同步更新。
- 用 npm 安装的用户：插件管理器里移除旧条目 → 用新包名安装一次。
- 用 `link:`/本地目录安装的旧用户：把 profile `package.json` 的依赖名与 `dsh.profile.bundles` 条目从旧名改成新名，或直接移除后重新安装；随后重启 DSH。
- **用户数据不动**：设置与上传壁纸在 `$DSH_HOME/profiles/<profile>/tianlight/`（v2.0.1 起），与包名无关；卸载/重装/迁移包名都不会删除它。

## 三、安装前验收修复（延续 v2.0.1）

- 冷启动设置引导重试：页面第一次 `_settings` GET 落在宿主绑定路由之前时，会做最多 4 次退避重试，避免首启默认外观只写本地。
- 设置/帧缓存单例改为惰性解析持久数据目录，避免宿主半在模块加载时固定旧路径。
- npm 打包白名单漂移被验收发现并修复：`package.json files[]` 之前漏了 `lib/fingerprint.js`，npm 包会缺文件导致宿主半加载失败；现在 `files[]` 改为目录条目，npm tarball 与 Release tarball 文件集合一致（44/44），`verify` 增加了身份一致性与必需文件覆盖断言。

## 四、功能

- 与 v2.0.1 功能一致：全屏视频/图片壁纸、随包 4K 视频默认外观、液态玻璃、桌宠与权限化 AI 对话（使用 DSH 已配置模型）、壁纸库/WE 场景、版本指纹与自检、用户数据持久化。发行说明见 `RELEASE-NOTES-v2.0.1.md`。

## 五、安装与升级

1. npm 安装：见上；或继续用 GitHub Release tarball / 源码目录。
2. **升级后重启 DSH 一次**，再 Ctrl+F5；之后纯浏览器半更新只需 Ctrl+F5。
3. 旧包名用户先完成包名迁移（见第二节）。

## 六、已知边界

- 兼容承诺仅限 DSH `>=0.2.0-rc.1 <0.3.0`；0.3.x 起会被 DSH 兼容门禁明确拦下。
- 卸载插件后用户数据目录仍保留（设计如此），需要彻底清理时手动删除 `$DSH_HOME/profiles/<profile>/tianlight/`。
- npm 包内含随包 4K 演示视频（约 33MB），首次安装下载体积较大；不需要可安装后换自己的壁纸（包内素材不会删除你的上传文件）。
- 默认外观的 C1 时段外观固定关闭，想要随时间变化的氛围可在 ⑤ 情境自行开启。

## 验证

- 静态链 `npm run check` 全绿：build --check 26 片段、test 125/125、structure --strict、audit 无阻断、check-css、verify（含新增身份一致性/必需文件断言）、i18n zh=en。
- `node tools/npm-publish.mjs --dry-run`：npm tarball 与 pack 目录文件集合一致（44 文件）；包名/版本/非 private/repository/build-info=HEAD 校验通过。
- 任务 7 验收矩阵（本版重跑）：**18/18 组合全部通过**——3 个真实 DSH 运行时 × 3 种安装形态（Release tarball / git 源码 / npm registry tarball）× 全新安装、从旧包名 v2.0.0 升级（迁移后数据保留），明细见文末表格。
- npm 与 Release tarball 文件集合一致（44/44），`npm run check` 全绿（125 tests），dry-run 通过。


## 任务 7 验收矩阵（v2.0.2，发布前实测）

环境：3 个真实 DSH 运行时（隔离 `$DSH_HOME` + headless Edge CDP）× 3 种安装形态：
**Release tarball**（GitHub Release 内容）、**git 源码检出**、**npm registry tarball**（`npm pack` 产物，按 registry 名与范围安装）。每个组合依次执行「全新安装 → 从旧包名 v2.0.0 升级（迁移包名/数据目录）→ 卸载」。npm 形态在真实发布前用与 registry 完全相同的 `npm pack` tarball 验证。

| DSH 版本 | tarball 全新/升级 | git 全新/升级 | npm 全新/升级 |
|---|---|---|---|
| 0.2.0-rc.2 | ✅/✅ | ✅/✅ | ✅/✅ |
| 0.2.1-rc.5 | ✅/✅ | ✅/✅ | ✅/✅ |
| 0.2.2-rc.1 | ✅/✅ | ✅/✅ | ✅/✅ |

每个组合的断言（18/18 通过）：

- 新包名 `dsh-client-ui-skin-tianlight` 的 bundle 被 profile 解析并挂载：`body[data-dsh-tianlight]` 出现，浏览器控制台 0 error / 0 exception；
- `GET /skin-tianlight/_fingerprint` 的 version / git commit / `lib/client.js` sha256 / HOST_API / DSH 版本 / 安装方式（tarball / git / registry）与 `build-manifest.json` 一致；
- 全新安装：默认外观 11 个键与 `presets/tianlight-default.json` 一致；
- 升级：先用旧包名 v2.0.0 启动并改设置/上传壁纸，卸载旧条目后换成新包名安装，改过的设置（`tianlight.glass=1.13`）与上传壁纸都保留，旧数据未删除，`<profile>/tianlight/migration.json` 存在；
- 卸载：DSH 正常启动，无皮肤属性/样式/节点，控制台干净。

证据：`diag/tmp/task7/runs/20261112-140713/`（results.json + shots + logs）。

## 许可

- 本仓库代码 MIT；`vendor/webwallgl/`（MIT）、`vendor/we-wallpaper/`（MIT/Unlicense）许可见 `docs/THIRD-PARTY.md`。
- `assets/` 内演示素材版权归各自权利方，仅用于演示。
