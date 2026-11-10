# v1.6.4 · 正式版：桌宠 AI 对话 + 每个形象的动作包 + 全代码审查修复

> 版本：`1.6.4`（`lib/client.js` **26 片段**；`BUILD`/`HOST_BUILD` = `1.6.4`）
> 本版是**正式版**（公开命名 **v1.0.3**）：桌宠可以直接聊 AI、每个自定义形象有自己的动作名与回复、角色中枢能一直看到形象文件名；同时做了一轮**全代码审查**并修掉 7 个高/中优先级问题。
> **含宿主半/内核改动（同源栅栏收紧、WE 宿主流式安全、转码超时兜底）**：升级后请 **Ctrl+F5 + 重启 DSH 一次**。

## 1. 概述与公开命名

- 内部版本 `1.6.4`，GitHub 公开构建命名为 **v1.0.3（正式版）**；同一份构建，`BUILD`/`HOST_BUILD` 均为 `1.6.4`。
- 26 片段不变（`src/40-companion.js`、`src/76-role-hub.js` 扩展；无新增 fragment/region）。
- 新增 i18n 键 29 个（`pet.*` 16 + `hub.media.*` 13，zh/en 成对）——注册键总数 1216 → **1245**。

## 2. 新功能

### 2.1 桌宠「AI 对话」

- 桌宠互动菜单保持原有 摸摸/喂食/逗猫棒/小睡/静音/专注/角色中枢，并在**同一栏第一位新增「AI 对话」**。
- 点击后弹出输入条（`div[data-tl-catchat]`，root 加 `data-tl-chat-open`），Enter 发送、Escape 关闭；发送时调用 `globalThis.tianlightPet.chat(text)`——**沿用原有 AI 大脑的权限、暂停、配额、审计与失败回退语义，不新增任何权限或网络通道**。
- 回复直接显示在桌宠现有气泡里（气泡带 `data-tl-chat` 标记，长回复自动加宽）；思考中禁用输入/发送并显示状态；失败按 reason 映射为 `pet.chat.reason.*` 的友好提示（暂停/无权限/限流/无效/未启用/内部错误）。
- **对视频形象友好**：输入条与气泡悬浮在视频上方、视频继续循环；桌宠贴近屏幕顶部（`y < 96`）时自动把输入条翻到下方（root 加 `data-tl-chat-flip`），不会被挤出视口。
- 聊天成功记一次 `noteInteraction("talk")`，继续参与生活节奏与记忆（不改动权限模型）。

### 2.2 每个形象一套「动作包」

- 新增共享 API `globalThis.tianlightPetActions = { version:1, defaults(), get(mediaId), set(mediaId, pack), clear(mediaId), current() }`；数据存 `localStorage["tianlight.petActions.v1"]`（`{version:1,packs:{[mediaId]:{pet,feed,play:{label,lines}}}}`，损坏/非法数据视为空），并由 12-schema 镜像到**本机宿主 settings**（本机文件，不上传网络）。
- **按当前形象生效**：桌宠菜单里 摸摸/喂食/逗猫棒 的动作名与台词取自当前 `mediaId` 的动作包（默认形象 `default`，图片/视频形象用其 id）；切换形象（`tianlight:pet-media`）后自动重读，无需刷新。
- 动作名 ≤24 字符、每条回复 ≤120 字符 / 最多 8 条，空行丢弃；校验失败返回 `{ok:false, reason:"invalid"}`。
- 桌宠侧支持**部分提交**：只改一项时，其余动作保持原自定义/默认；清空某动作会提交空动作，用来**删除 override**（H1 修复语义）。
- 保存后 `document` 派发 `tianlight:pet-actions`，桌宠菜单与中枢立即刷新；语言切换后未自定义的动作继续跟随默认文案（不会被冻结成保存时的语言）。

### 2.3 角色中枢：形象文件名常显 + 动作包编辑器

- 形象卡新增**文件名常显列表**（`[data-tl-hub-media-list]`）：默认形象 + 每个上传形象一行，显示**文件名**、类型与大小；当前生效行高亮，点击任意一行即切换形象，不用先展开下拉。
- 修复下拉 `option` 文字不可见：浅色/深色主题下原生下拉选项改为可读的主题色（白字白底问题）。
- 新增**动作包编辑器**（`section[data-tl-hub-media-pack]`）：为当前选中形象编辑 摸摸/喂食/逗猫棒 的动作名与回复（一行一条），可保存或恢复默认；保存只提交与默认显示值有差别的动作，并把「被重置/清空」的旧自定义提交为空动作删除，**不会把当前语言的默认文案固化成自定义**。桌宠动作 API 不存在时编辑器禁用并提示，不报错。

## 3. 代码审查与修复

本版对 **26 个 src 片段 + 宿主半（`lib/` 全量）+ tools 静态链**做了一轮全代码审查（初审 + 增量复审），完整清单（file:line / 影响 / 修法 / 验证方式）见 **[docs/REVIEW-1.6.4.md](docs/REVIEW-1.6.4.md)**。

已修复的高/中优先级问题：

| ID | 问题 | 修复 |
|---|---|---|
| H1 | 动作包保存会把「当前语言的默认文案」写进自定义，之后切换语言被冻结 | 中枢只提交与默认显示值不同的动作；桌宠侧支持部分提交，空动作删除 override |
| H2 | WE 壁纸文件在 stat/open 之间被删或客户端中途断开时，宿主裸 `pipe` 触发未捕获 error，可导致宿主进程崩溃/句柄泄漏 | 宿主新增 `pipeFileSafe`（error/close 清理、destroy 流与响应、释放句柄），替换全部裸 pipe |
| M1 | 低电量异步回调在 dispose 之后仍写状态/派发事件 | `55-lowpower` 增加 `disposed` 标志，dispose 后所有异步分支直接返回 |
| M2 | 选择器桥的 stamped 集合会保留已从 DOM 移除的节点 | `stampAll` 清理 `isConnected === false` 的节点，集合不再无界增长 |
| M3 | 桌宠贴近屏幕顶部时 AI 对话输入条会被挤出视口 | 打开时判断 `y < 96`，root 加 `data-tl-chat-flip` 由 CSS 翻转输入条位置 |
| M4 | 转码子进程被 kill 后若 `close` 事件不触发，Promise 悬挂 | kill 后加 5s 兜底 `finish({reason:"transcode timed out"})` |
| M5 | 宿主路由同源栅栏过松（部分跨站请求可命中），且无契约测试 | `lib/index.js` 与 WE 宿主统一收紧 `isSameOriginRequest`（Origin / Sec-Fetch-Site 判定），`handle()` 开头直接 403；`tools/test.mjs` 增加 WE 路由族同源栅栏契约测试 |
| M5 回归（复审发现并修复） | 初版收紧后，沙箱 iframe 的子资源 GET（WebWallGL 场景 / 网页壁纸，带 `Sec-Fetch-Site: cross-site` 或 `Origin: null`）被 403，导致场景/网页壁纸加载失败 | `lib/index.js` 增加只读放行清单 `SANDBOXED_READ_PATHS`（`/_engine/webwallgl.js`、`/_scene-project/`、`/_web-project/`、`/_scene-frame`，仅 GET/HEAD）；**allowlist 判定前用 WHATWG URL 归一化 pathname，`..`/`%2e%2e` 不能绕过**；`lib/we-wallpaper/host.mjs` 对 `/api/we-wallpaper/web/` 只读放行并同样归一化；**写入与其它跨站读取仍 403**；`tools/test.mjs` 新增沙箱回归 + **2 条 dot-dot 逃逸回归**；verifier 新增 **S90–S93** 四条断言（index allowlist / host `/web/` 只读 / test 契约 / **pathname 归一化防 `..` 绕过**） |

剩余**已知限制（不阻塞发布，见 REVIEW 文档 §3）**：M6 `_engines`/`_wallpapers` 的 WE 库扫描仍在请求路径内同步执行（首次打开可能多耗数百 ms；ffmpeg 探测有超时）；M7「生成动态」WE 场景录制的 teardown 最长约 18s（仅手动触发，UI 有进度与失败提示，无手动取消）；M3 聊天输入条的 flip 阈值固定 `y < 96`，打开后拖动桌宠/窗口 resize 不重算（可拖动或重开恢复，未在本版修）；选择器桥全量扫描的 CPU 峰值（DOM 高频变化时每帧一次查询，已防抖），以及若干低风险项。

## 4. 验证

- 静态链：build/build --check 26/26、test 67/67（含沙箱只读 + dot-dot 回归断言）、structure --strict、audit（v1.6.4 新守卫 3 条：AI 对话菜单/动作包、形象文件名列表/动作包编辑、聊天状态双语；`AUDIT: no blocking issues`）、check-css、verify、i18n-audit（zh=en 1245 键，referenced 940）全绿；日志 `diag/skinlab/runs/v164-static-chain.log`（9,653 B，evidence 内 47 条 green 行）。
- Node 冒烟：**688/688 PASS**（v1.6.3 的 631 条回归 + 新增 57 条：T PET CHAT 20、B PET ACTIONS 16、U 扩 10、S 扩 11，S 段 82→93；其中 **S90–S93 为 M5 沙箱回归断言**：index `SANDBOXED_READ_PATHS` allowlist / WE host `/web/` 沙箱只读 / `tools/test.mjs` 沙箱回归契约 / pathname 归一化防 `..` 绕过），构建 sha `2bd062c1bd978b2c6fff3d246524b23c8d847c6123ce41dc9acbe76a740367bc`（`lib/client.js` 1,354,877 B / 1,311,772 字符，26 片段，version 1.6.4；仅宿主半修复，client 未变）；证据 `diag/skinlab/runs/20261110-204923-v164-v164-node-smoke/`（REPORT.md、data/report.json、688 条 `data/assertions.json`、`fragments/` 含 `companion.js`、`logs/static-chain.log`）。
- 分段：R 58/58、H 54/54、L 19/19、M 18/18、S **93/93**、P 62/62、U **64/64**、A 79/79、E 15/15、HIGH 46/46、W 26/26、X 32/32、N 11/11、C 16/16、G 32/32、Q 27/27、T **20/20**、B **16/16**。
- 复跑确定性：同一 build sha 再跑一次同样 688/688 PASS，证据目录 `diag/skinlab/runs/20261110-204911-v164-v164-node-smoke/`。
- 真浏览器级：Ctrl+F5 + 重启 DSH 后点验——桌宠菜单「AI 对话」输入/回复/视频形象/顶部翻转、中枢形象文件名列表点击切换、动作包编辑后菜单即时生效与切语言不冻结（本会话沙箱限制自动化浏览器验收不可用）。

## 5. 兼容性

- DSH **0.2.0-rc.2 / 0.2.1-rc.5 / 0.2.2-rc.1** 三线矩阵结论**不变**（全 `COMPATIBLE`，见 [docs/COMPATIBILITY.md](docs/COMPATIBILITY.md) §6.1）；本版没有新增 DSH 契约依赖，宿主侧改动（同源栅栏/流式安全/转码兜底）不改变既有路由与降级策略。
- **v1.6.4 构建实跑兼容矩阵**：0.2.0-rc.2 / 0.2.1-rc.5 / 0.2.2-rc.1 三行 `COMPATIBLE`（bundles 72/77/86，contracts 全 true、`missing` 全空），3 份 `hookscan` 均 `all bridge hooks present`、3 份 `upgrade-check` 均 `all upgrade assumptions hold`；证据 `diag/skinlab/evidence/compat-v164/`（`matrix.json` + 6 份日志）。
- 旧用户设置、形象、动作包（本版首次引入）与 `state/` 数据无迁移成本；未自定义动作的形象自动使用默认动作名与台词。

## 6. 升级 / 回滚 / 仓库

- 升级：**Ctrl+F5 + 重启 DSH 一次**（本版含宿主半/内核改动：同源栅栏收紧（沙箱 iframe 的壁纸只读通道已放行，WebWallGL 场景/网页壁纸不受影响）、WE 流式安全、转码兜底）；重启后若中枢提示宿主半待重启即已消除。
- 回滚：`git reset --hard v1.6.3 && node tools/build.mjs`，再 Ctrl+F5 + 重启 DSH。
- 仓库：内部 tag 为 `v1.6.4`；**`github-upload/` 镜像以公开命名 `v1.0.3`（正式版）上传**；本会话无凭据、**未 push**，公开 GitHub Release 说明草稿见 `diag/tmp/github-release-v1.0.3.md`。
