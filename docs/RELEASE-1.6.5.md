# v1.6.5 · 正式版：修复桌宠「AI 对话」关不掉 · 四个随手可退的关闭路径

> 版本：`1.6.5`（`lib/client.js` **26 片段**；`BUILD`/`HOST_BUILD` = `1.6.5`）
> 本版是**正式版**（公开命名 **v1.0.4**）：只修一个用户问题——桌宠「AI 对话」打开后关不掉/退不出去。**仅浏览器半逻辑改动，没有新增权限、网络通道或宿主路由**；因版本标记 bump，升级请 **Ctrl+F5 + 重启 DSH 一次**以消除宿主半 stale 提示。

## 1. 概述与公开命名

- 内部版本 `1.6.5`，GitHub 公开构建命名为 **v1.0.4（正式版）**；同一份构建，`BUILD`/`HOST_BUILD` 均为 `1.6.5`。
- 26 片段不变（只改 `src/40-companion.js` + `src/20-stylesheet.js`；无新增 fragment/region）。
- 新增 i18n 键 1 个（`pet.chat.close`，zh/en 成对）——注册键总数 1245 → **1246**。
- 不涉及 `state/`、`assets/uploads/` 与任何用户数据；不新增权限、不新增网络请求。

## 2. 问题与根因

用户报告：桌宠菜单里点开「AI 对话」后**没有明显退出方式**，感觉卡死。

- **根因 A：没有可发现的关闭控件。** 面板只有状态行 + 输入框 + 发送按钮，没有「关闭」按钮。
- **根因 B：Esc 覆盖不全。** v1.6.4 只在聊天面板/输入框上监听 Escape，且面板内 keydown 会 `stopPropagation`；焦点一旦离开输入框（例如点了页面别处），Esc 不再关闭。
- **根因 C：点空白只关菜单。** `document` 的 pointerdown 只处理互动菜单，不处理聊天面板。
- **根因 D：桌宠贴近屏幕底部时菜单不可达。** 互动菜单挂在桌宠**下方**（`top: calc(100% + 8px)`），聊天面板在桌宠**上方**；桌宠靠近视口底部时菜单被裁到屏幕外，用户无法再点「AI 对话」把它关掉。这是“退不出去”的最可能主因。
- **根因 E：`hidden` 实际无效。** `[data-tl-catchat]` 的 `display:flex` 覆盖了浏览器 UA 的 `[hidden]` 规则，`chat.hidden = true` 只让面板变成 opacity 0 + `pointer-events:none` 的“隐形占位”，并没有真正移出布局（审查时已记录）。

## 3. 修复内容（逐项）

1. **显式关闭按钮（×）**：面板顶部改为 `div[data-tl-catchat-head]` 行，左侧状态、右侧 `button[data-tl-catchat-close]`；`aria-label` 使用新增 i18n 键 `pet.chat.close`（zh“关闭”/en“Close”），语言切换即时刷新；打开时 tabIndex 进入焦点序列，关闭时收起并 blur；pointerdown/click 均 `stopPropagation`，不会触发桌宠拖拽。
2. **点空白关闭**：`document` 级 capture `pointerdown` 统一处理菜单与聊天面板——点击点不在桌宠 root 内时关闭对话。点桌宠本身、输入框、发送/关闭按钮不会误关。
3. **全局 Esc 关闭**：新增 `document` 级 capture `keydown`；只要面板打开，任意焦点位置按 Escape 都关闭（避免依赖焦点在面板内）；面板关闭后 Esc 无副作用；dispose 时移除监听。
4. **桌宠贴近底部也能退出**：`pointerup` 判定为“点击而非拖拽”时，若对话面板打开则**先关闭对话并收起菜单，不再打开菜单**。这样即使菜单被裁到视口外，用户点一下桌宠本身即可退出。
5. **`[hidden]` 真正隐藏**：新增 `[data-tl-catchat][hidden] { display: none !important; }`，关闭后的面板不再占布局/指针空间（`chat.hidden` 语义恢复）。
6. **关闭态键盘收尾**：关闭时输入框、发送、关闭按钮的 tabIndex 归 `-1` 并 blur，避免 Enter 继续发消息、焦点停留在隐藏控件上。

## 4. 验证

- 静态链：build/build --check 26/26、test 67/67、structure --strict、audit（`AUDIT: no blocking issues`，v1.6.4 既有守卫全绿）、check-css、verify、i18n-audit（zh=en **1246** 键，referenced 941）全绿；日志 `diag/skinlab/runs/v165-static-chain.log`（9,477 字符，8 步全部 exit 0）。
- Node 冒烟：**695/695 PASS**（v1.6.4 的 688 条回归 + 新增 7 条：T21–T26 关闭路径 6 条、S94 hidden/close CSS 1 条；S 段 93→94、T 段 20→26），构建 sha `9d23f5a035744d2c8d18930d043835ce6ebac0464d06c1d1635f38e6075cf4a7`（`lib/client.js` 1,359,807 B / 1,316,692 字符，26 片段，version 1.6.5）；证据 `diag/skinlab/runs/20261110-210646-v165-v165-node-smoke/`（REPORT.md、data/report.json、695 条 `data/assertions.json`、`fragments/` 含 `companion.js`、`logs/static-chain.log`）。
- 分段：R 58/58、H 54/54、L 19/19、M 18/18、S **94/94**、P 62/62、U 64/64、A 79/79、E 15/15、HIGH 46/46、W 26/26、X 32/32、N 11/11、C 16/16、G 32/32、Q 27/27、T **26/26**、B 16/16。
- 新增断言覆盖：关闭按钮 DOM 与双语 i18n 键、点击 × 关闭（`data-tl-chat-open` 移除、`aria-hidden=true`、tabIndex 收起）、document 级 Escape 关闭、root 外 pointerdown 关闭 / root 内（输入框、桌宠）不关闭、点桌宠关闭且不打开菜单、关闭过程无异常记录、`[hidden]`/head/close CSS 规则存在。
- 复跑确定性：同一 build sha 再跑一次同样 **695/695 PASS**，证据 `diag/skinlab/runs/20261110-210703-v165-v165-node-smoke/`。
- 真浏览器级（用户点验，Ctrl+F5 + 重启 DSH 后）：点桌宠 →「AI 对话」→ 分别用「×」、点页面空白、按 Esc、再点桌宠退出；并在桌宠拖到屏幕底部时重复“再点桌宠退出”。

## 5. 兼容性

- DSH **0.2.0-rc.2 / 0.2.1-rc.5 / 0.2.2-rc.1** 三线矩阵结论**不变**（全 `COMPATIBLE`，见 [docs/COMPATIBILITY.md](docs/COMPATIBILITY.md) §6.1）；本版没有新增 DSH 契约依赖，也没有宿主半路由/钩子改动。
- 旧用户设置、形象、动作包与 `state/` 数据无迁移成本；聊天相关的权限、暂停、配额、审计与失败回退语义完全不变。

## 6. 升级 / 回滚 / 仓库

- 升级：**Ctrl+F5** 即可获得关闭修复（仅浏览器半改动）；由于 `BUILD`/`HOST_BUILD` 已 bump 到 `1.6.5`，**重启 DSH 一次**可让宿主半同步并消除 stale 提示。
- 回滚：`git reset --hard v1.6.4 && node tools/build.mjs`，再 Ctrl+F5 + 重启 DSH。
- 仓库：内部 tag 为 `v1.6.5`；`github-upload/` 镜像以公开命名 **v1.0.4（正式版）** 上传；公开 Release 说明见 `diag/tmp/github-release-v1.0.4.md`。
