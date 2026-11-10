# v1.6.3 · 更名「天光」+ DSH 0.2.0/0.2.1/0.2.2 兼容性实证

> 版本：`1.6.3`（`lib/client.js` **26 片段**；`BUILD`/`HOST_BUILD` = `1.6.3`）
> 本轮两件事：① 显示名从旧的双词名精简为「**天光**」（`skin.json.name` 与 README 标题同步；`nameEn` 保持 `TIANLIGHT`）；② 对 DSH **0.2.0-rc.2 / 0.2.1-rc.5 / 0.2.2-rc.1** 三条线做兼容性实证（compat-matrix 三行全 `COMPATIBLE`、hook-scan 与 upgrade-check 全绿）。
> 无宿主路由改动：Ctrl+F5 即可；`BUILD`/`HOST_BUILD` 同步为 1.6.3（仅 build 标记），若面板提示宿主半需重启，重启一次 DSH 即消除。

## 1. 更名：显示名统一为「天光」

- `skin.json` 的 `name` 改为 **「天光」**（`nameEn` 保持 `TIANLIGHT`）；README 标题改为「天光（TIANLIGHT）— DSH Web 皮肤插件」，去掉旧显示名里的修饰前缀。
- **只改显示文本**：skin `id`（`tianlight`）、`package` 包名（`@dsh-external/dsh-client-ui-skin-tianlight`）、`bodyAttr`（`data-dsh-tianlight`）、`wiring.id`（`ui-skin-tianlight`）、全部本地设置键与 `state/` 数据都不变 → **旧用户无迁移成本**，安装/启用方式与目录结构不变。
- 反馈模板与文档里的版本示例同步为 1.6.3。

## 2. DSH 三版本兼容性实证（2026-11-10）

对三份真实安装各跑一遍 `tools/compat-matrix.mjs`（静态钩子/契约）、`tools/hook-scan.mjs`（桥接钩子）、`tools/upgrade-check.mjs`（升级假设），证据见 `diag/skinlab/evidence/compat-v163/`。

| DSH 版本 | bundles | 钩子层 | slot / 产品 data / 类名分段 | 客户端契约 | verdict |
|---|---|---|---|---|---|
| 0.2.0-rc.2 | 72 | slot + product-data + class-segments | 全在（advisory `data-message-bubble` 无，`_bubble` 兜底） | 11/11 true | **COMPATIBLE** |
| 0.2.1-rc.5 | 77 | slot + product-data + class-segments | 全在（advisory `data-message-bubble` 无，`_bubble` 兜底） | 11/11 true | **COMPATIBLE** |
| 0.2.2-rc.1 | 86 | slot + product-data + class-segments | 全在（advisory `data-message-bubble` 有，前进钩子生效） | 11/11 true | **COMPATIBLE** |

- **hook-scan**：三份日志结论均为 `all bridge hooks present`（`data-composer-card` / `data-sidebar-collapsed` / `data-trigger-menu` / `data-slot` / `_sidebarCol` / `_card` / `_trigger*` / `_bubble` / `_menu` / `_panel`+`_mask` / `[data-chat-running]` 全在；仅 `data-message-bubble` 在 0.2.0/0.2.1 为 advisory 缺失，桥用 `_bubble` 段兜底，0.2.2 起前进钩子生效）。
- **upgrade-check**：三份日志结论均为 `all upgrade assumptions hold`。
- **contracts**：`moduleLoader` / `bootPayload` / `reactSeed` / `modelCatalog` / `selectModel` / `apiRemotes` / `sessionController` / `slotsService` / `themeService` / `localeService` / `hostWebServer` 三条线全 true，`missing` 为空。
- **结论**：三条线共用同一份构建与同一套 CSS，**无需版本 if 分支**——`src/65-bridge.js` 按「Slot 契约 → 产品 `data-*` → 类名分段」分层发现；`data-message-bubble` 的版本差异由既有兜底吸收。静态矩阵细节、降级表与证据文件名见 [docs/COMPATIBILITY.md](docs/COMPATIBILITY.md) §6.1。

## 3. 验证

- 静态链：build/build --check 26/26、test 67/67、structure --strict、audit（v1.6.3 新守卫 2 条：显示名不含旧前缀 + DSH 三版本兼容声明）、check-css、verify、i18n-audit（zh=en 1216 键，referenced 928）全绿；日志 `diag/skinlab/runs/v163-static-chain.log`（9,362 B，evidence 内 44 条 green 行）。
- Node 冒烟：**631/631 PASS**（v1.6.2 的 626 条回归 + 新增 5 条 S78–S82：名称 / 兼容元数据 / 兼容证据），构建 sha `926f6f173cf1d31afe41735a83d04bc1e0fdf3c4d82e31eb16349603c4f73d45`（`lib/client.js` 1,300,780 B / 1,258,324 字符，26 片段，version 1.6.3）；证据 `diag/skinlab/runs/20261110-194055-v163-v163-node-smoke/`（REPORT.md、data/report.json、631 条 `data/assertions.json`、`fragments/`、`logs/static-chain.log`）。
- 分段：R 58/58、H 54/54、L 19/19、M 18/18、S **82/82**、P 62/62、U 54/54、A 79/79、E 15/15、HIGH 46/46、W 26/26、X 32/32、N 11/11、C 16/16、G 32/32、Q 27/27。
- 复跑确定性：同一 build sha 再跑一次同样 631/631 PASS，证据目录 `diag/skinlab/runs/20261110-194030-v163-v163-node-smoke/`。
- 兼容性实证：证据 `diag/skinlab/evidence/compat-v163/`（`matrix.json` + `hookscan-<ver>.log` ×3 + `upgrade-check-<ver>.log` ×3），结论见 §2。

## 4. 升级 / 回滚 / 仓库

- 升级：Ctrl+F5；本版无宿主路由改动（仅 `BUILD`/`HOST_BUILD` build 标记同步为 1.6.3）；若中枢/面板提示宿主半需重启，重启一次 DSH 即消除。
- 回滚：`git reset --hard v1.6.2 && node tools/build.mjs`，再 Ctrl+F5。
- 仓库：内部 tag 为 `v1.6.3`；**`github-upload/` 镜像以公开命名 `v1.0.2` 上传**（用户要求：上传物与发布说明叫 v1.0.2，内部构建是 1.6.3）；本会话无凭据、**未 push**，公开 GitHub Release 说明草稿见 `diag/tmp/github-release-v1.0.2.md`。
