# tools/

维护中的工具（README 与 `npm run` 引用）：

| 文件 | 用途 | 需要 DSH |
|---|---|---|
| `build.mjs` | 从 `src/` 片段拼装 `lib/client.js`（`--check` 校验产物不落后） | 否 |
| `test.mjs` | 纯逻辑回归测试（Range 解析、文件名安全、壁纸发现、上传/场景路径策略） | 否 |
| `structure.mjs` | 结构审计：分区顺序、`apply()` 顺序与 try/catch 边界 | 否 |
| `audit.mjs` | 静态审计：变量、监听器、定时器、Hook 顺序 | 否 |
| `check-css.mjs` | 样式结构检查 | 否 |
| `verify.mjs` | 路由/封装/清单契约断言（含上传、场景、引擎拒绝路径 + v0.5.0 的 settings/bundle/frame-cache/transcode/web-project 拒绝路径与能力通告） | 否 |
| `upgrade-check.mjs` | DSH 升级兼容性自检：模块加载器/启动载荷/remote 契约/服务包 + **结构桥接钩子**（v0.2.0 起不再依赖构建哈希）+ v0.5.0 运行时状态钩子（`data-chat-running`）与 locale 服务 | 是 |
| `compat-matrix.mjs` | 多份 DSH 安装静态矩阵：逐版列出钩子层/契约/`COMPATIBLE` 判定（0.2.0 / 0.2.1 / 0.2.2） | 是 |
| `agent-check.mjs` | 并行开发的自检：把当前片段构建到 `diag/tmp/`（不碰 `lib/client.js`），做语法 + CSS 作用域检查 | 否 |
| `i18n-audit.mjs` | zh/en 字典完整性审计：静态引用的 key 是否两语言齐全、en 是否混入中文、zh 是否残留纯英文（`npm run check` 已包含，缺 key 即红） | 否 |
| `public-release.mjs` | 把内部构建树转成公开版本（改四处版本标记 + `INTERNAL-BUILD.json` + 重建 `lib/client.js`），供 GitHub 镜像仓库使用（见 `PUBLISH.md`） | 否 |
| `release.mjs` | E5 发布流水线：版本自增 / 静态链 / 快照 / CHANGELOG / 提交 / 注记 tag（`--dry-run` 可预览；不联网） | 否 |
| `hook-scan.mjs` | 对**任意 DSH 版本目录**扫描桥接钩子（`data-*` 属性 + CSS 类名后缀）；升级 Desktop 前先跑；`--self-check` 同时校验 `src/65-bridge.js` 与钩子清单同步 | 是 |
| `hooks.mjs` | 桥接钩子清单（data-* 与类名后缀），被 `upgrade-check` / `hook-scan` / 测试共用 | 否 |
| `resolve-selectors.mjs` | 历史工具：构建哈希选择器体检（v0.2.0 起 CSS 已无哈希依赖，仅排查旧版/外部版本时用） | 是 |
| `pack.mjs` | 生成可分发目录 | 否 |
| `snapshot.mjs` | 存快照（产物 + 宿主模块 + `src/`）到 `backup/` | 否 |
| `restore.mjs` | 从 `backup/` 回滚（含宿主模块与 `src/`） | 否 |

一次性脚本（开发过程留下，保留作为历史记录，不参与检查链）：

| 文件 | 当时的用途 |
|---|---|
| `install.mjs` / `preflight.mjs` | 早期 Web profile 一次性接线脚本（硬编码了作者机器上的 web profile 与 home patch 路径，不要用于 Desktop；Desktop 单包安装见根目录 README） |
| `inspect-manager.cjs` | 排查皮肤管理器的协议 |
| `probe-video.cjs` | 探测视频编码与可播放性 |
| `CatKeyer.cs` | 把白底桌宠图抠成透明 PNG（System.Drawing 泛洪） |
| `repair-encoding.mjs` | 修复一次 PowerShell 回写导致的 UTF-8 损坏 |
| `restore-disabled-rows.mjs` | 恢复被清空的插件行 |
| `rheostat.css` | 推理滑杆早期样式的暂存副本 |

`npm run check` 先跑 `build --check`，再跑第一张表里的静态工具；`npm run upgrade` 跑 `upgrade-check` + `hook-scan --self-check`（都需要 DSH）。`npm run agent-check` 是并发开发时的轻量自检；`npm run release` 只在确定要发版时用（先 `--dry-run`）。

**DSH 升级流程**：拿到新版本 DSH 的 `@deepseek-ai` 目录后（app.asar 需用 Electron-as-Node 读，或 npm 解包），先跑
`node tools/hook-scan.mjs --dsh <该目录>`；所有钩子 OK 再升级 Desktop；有 MISS 就先改 `src/65-bridge.js` 的探测查询，再发布皮肤新版本。

`src/` 是浏览器半的源码：按 region 切分的普通脚本片段（无 import/export），由 `build.mjs` 按显式顺序拼成单文件产物 `lib/client.js`。改代码的流程是：改 `src/` → `npm run build` → `npm run check`。快照用 `npm run snapshot`（产物和 `src/` 一次存齐），`npm run restore` 会一起恢复。
