# v1.6.7 · 正式版：URL / ShaderToy 壁纸一等入口 · 桌宠回复即收面板 · 对话历史（☰）

> 版本：`1.6.7`（`lib/client.js` **26 片段**；`BUILD`/`HOST_BUILD` = `1.6.7`）
> 本版是**正式版**（公开命名 **v1.0.6**）：壁纸面板默认视图新增「URL 地址」「ShaderToy 代码」两个**一等快捷来源**（之前只藏在「高级 → ① 来源」）；桌宠「AI 对话」**收到回复立即收起输入面板**，只保留气泡回复；新增「☰」**对话历史**（与「AI 对话」相邻），可查看历史、开启新对话、编辑已发消息、删除对话。**仅浏览器半逻辑改动**，无新增权限/网络通道/宿主路由；因版本常量 bump，升级请 **Ctrl+F5 + 重启 DSH 一次**以消除宿主半 stale 提示。

## 1. 概述与公开命名

- 内部版本 `1.6.7`，GitHub 公开构建命名为 **v1.0.6（正式版）**；同一份构建，`BUILD`/`HOST_BUILD` 均为 `1.6.7`。
- 26 片段不变（改 `src/70-sidebar.js`、`src/40-companion.js`、`src/20-stylesheet.js`、`src/30-wallpaper.js` 仅作为被调用的既有运行时未改；版本常量另改 `src/10-constants.js`、`lib/index.js`、`package.json`、`skin.json`、feedback 模板）。
- i18n 新增 20 个键（14 个 `pet.history.*` + `pet.action.history` + 5 个 `lib.quick.*`，zh/en 成对）——注册键总数 1246 → **1266**。
- 桌宠互动菜单 8 → **9** 项：`[AI 对话][☰][摸摸][喂食][逗猫棒][小睡][静音][专注][角色中枢]`。

## 2. 新功能

### 2.1 壁纸「URL 地址」与「ShaderToy 代码」正式化

- **默认 pick 视图新增一等快捷来源行**（`[data-tl-quick-source]`，位于过滤 chips 上方、所有可折叠 `[data-tl-group]` 之外）：两个按钮 `[data-tl-quick-source="url"]`「URL 地址」与 `[data-tl-quick-source="shader"]`「ShaderToy 代码」（i18n `lib.quick.*`）。点击后自动切到「高级」、打开对应编辑器并把输入区滚动到可见；「高级 → ① 来源」里的原有卡片保留。
- **URL 壁纸链路核查**：http(s) 校验、HTTPS 页面里 http 地址拦截提示、按扩展名/实际探测判定图片或视频、应用后经既有 `pick → wallpaperController.apply → saveWallpaperChoice` 持久化 `{kind,url}` 并渲染场景。
- **ShaderToy 代码链路核查**：四个预设、源码编辑器（≤12000 字符 + 编译/链接校验）、速度/强度/色相、应用后持久化 `tianlight.shader` 与 `kind="shader"`、恢复默认。
- **自检发现并修复 3 个真实 bug**：① URL 在壁纸模块关闭时「假成功」（不持久化却提示已应用）；② URL 应用抛错后按钮永久卡在「检查中…」；③ Shader 在持久化之前就显示「已应用着色器」（模块关闭/抛错时刷新会丢）。

### 2.2 桌宠回复即刻收起 AI 对话面板

- 成功收到回复：清空输入 → 记录本轮对话 → **立即关闭输入面板**，只保留桌宠气泡回复（气泡带 `data-tl-chat`，长回复加宽可滚动）。
- 拒绝（`ok:false`，气泡显示「这句我接不了」）同样关闭面板，并把本轮写入历史。
- 空输入 / AI 未就绪 / 发送失败 / 处理中：**保持面板打开**并显示状态，方便重试。

### 2.3 对话历史（☰，与「AI 对话」相邻）

- 数据：`localStorage["tianlight.petChats.v1"]`，结构 `{version:1, activeId, conversations:[{id,title,createdAt,updatedAt,messages:[{id,role,text,at}]}]}`；上限 **20 个会话 / 每会话 120 条消息 / 用户 500 字 / 回复 1200 字**，标题取首条用户消息（≤24 字）；损坏或异版本数据静默重置，存储失败不影响聊天。
- 共享 API：`globalThis.tianlightPetChats`（`version:1`，`list/get/create/remove/active/setActive/append/editUserMessage/subscribe`），实例 dispose 时恢复先前 global。
- 面板 `[data-tl-cathist]`：会话列表（当前会话高亮）＋「新对话」「删除对话」「× 关闭」；消息按角色分行显示，用户消息带「编辑」内联编辑（保存后若是首条用户消息会同步标题）；空态给出引导文案。
- 关闭路径与输入面板一致：×、全局 Esc、点页面空白、点桌宠本身；「AI 对话」与「☰」两个面板互斥（打开一个自动关另一个）。

## 3. 自检与修复

- 静态链 8 步全部通过：build / build --check 26/26、test 67/67、structure --strict、audit（新增 v1.6.7 守卫 3 条）、check-css、verify、i18n-audit（zh=en **1266**，referenced 958）。
- 修复项见 2.1 的 3 个 URL/Shader 链路 bug；新代码未新增 window/document 监听器（原有 dispose 审计仍通过），无新增依赖、无新增网络请求。
- 已知限制（不阻塞）：URL 远程探测最坏约 11s（图片 6s + 视频 5s，避免误杀慢 CDN）；远程 URL 应用属乐观成功，解码失败由场景自动回退；对话历史仅存本机 localStorage（不写入宿主 settings、不上传网络）。

## 4. 验证

- Node 冒烟：**706/706 PASS**（v1.6.6 的 698 条回归全保留 + 新增 8 条：T29 回复自动关闭并写入历史、T30 历史存储 API 上限/编辑/删除/损坏重置、T31 ☰ 面板 DOM 与新对话、T32 面板内编辑已发消息与删除会话、T33 历史面板关闭路径与互斥、S96 壁纸快捷来源、S97 历史静态契约、S98 v1.6.7 audit 守卫；S 段 95→98、T 段 28→33），构建 sha `a6b6ffb0e0fbcecf8e771151da41366685691cc054a1928c4157f83fc6989764`（`lib/client.js` 1,406,164 B / 1,362,843 字符，26 片段，version 1.6.7）；证据 `diag/skinlab/runs/20261110-215643-v167-v167-node-smoke/`（REPORT.md、data/report.json、706 条 `data/assertions.json`、`fragments/` 含 `companion.js`、`logs/static-chain.log`）。
- 分段：R 58/58、H 54/54、L 19/19、M 18/18、S **98/98**、P 62/62、U 64/64、A 79/79、E 15/15、HIGH 46/46、W 26/26、X 32/32、N 11/11、C 16/16、G 32/32、Q 27/27、T **33/33**、B 16/16。
- 复跑确定性：同一 build sha 再跑一次同样 **706/706 PASS**，证据 `diag/skinlab/runs/20261110-215703-v167-v167-node-smoke/`。
- 真浏览器级（用户点验，Ctrl+F5 + 重启 DSH 后）：壁纸面板默认视图点「URL 地址」「ShaderToy 代码」→ 编辑器出现并可应用；AI 对话发送后输入面板自动消失、只剩气泡；点 ☰ 打开历史 → 新对话/切换/编辑已发消息/删除对话；×、Esc、点空白、点桌宠均可关闭历史面板。

## 5. 兼容性

- DSH **0.2.0-rc.2 / 0.2.1-rc.5 / 0.2.2-rc.1** 三线矩阵结论**不变**（全 `COMPATIBLE`，见 [docs/COMPATIBILITY.md](docs/COMPATIBILITY.md) §6.1）；本版没有新增 DSH 契约依赖，也没有宿主半路由/钩子改动。
- 用户设置、形象、动作包与 `state/` 数据无迁移成本；聊天权限、暂停、配额、审计与失败回退语义完全不变；对话历史为新键，旧版本无该数据时为空。

## 6. 升级 / 回滚 / 仓库

- 升级：**Ctrl+F5** 即可获得新功能（仅浏览器半）；因 `BUILD`/`HOST_BUILD` = `1.6.7`，**重启 DSH 一次**可让宿主半同步并消除 stale 提示。
- 回滚：`git reset --hard v1.6.6 && node tools/build.mjs`，再 Ctrl+F5 + 重启 DSH。
- 仓库：内部 tag 为 `v1.6.7`；`github-upload/` 镜像以公开命名 **v1.0.6（正式版）** 上传；公开 Release 说明见 `diag/tmp/github-release-v1.0.6.md`。公开包因版本常量不同会重新构建，其 `lib/client.js` sha 与内部构建不同（代码相同）。
