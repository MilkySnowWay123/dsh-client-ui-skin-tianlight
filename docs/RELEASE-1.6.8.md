# v1.6.8 · 正式版：桌宠「自主思考」智能体 + 更像人的聊天

> 版本：`1.6.8`（`lib/client.js` **26 片段**；`BUILD`/`HOST_BUILD` = `1.6.8`）
> 本版是**正式版**（公开命名 **v1.0.7**）：桌宠新增**私有自主思考引擎**与**上下文感知聊天**：按间隔做内心独白、可自主开口（受既有主动开口预算约束），聊天回复融入最近对话/时段/记忆/当前想法；角色中枢新增「自主思考」卡片。**不新增权限、不新增网络通道、不自动驱动 DSH Agent、不自动执行工具**；仅浏览器半逻辑改动，无宿主路由改动；因版本标记 bump，升级请 **Ctrl+F5 + 重启 DSH 一次**以消除宿主半 stale 提示。

## 1. 概述与公开命名

- 内部版本 `1.6.8`，GitHub 公开构建命名为 **v1.0.7（正式版）**；同一份构建，`BUILD`/`HOST_BUILD` 均为 `1.6.8`。
- 新增 `globalThis.tianlightPetMind`（version 1）+ `localStorage["tianlight.petMind.v1"]`：
  `{version:1, enabled, intervalMin(5/10/15/30), autonomousSpeech, thoughts≤30, lastThinkAt}`；损坏/异版本静默重置。
- 思考循环：60s tick，仅在**已启用 + 页面可见 + 非低电量 + 未暂停 + 到达间隔**时思考；`thinkNow()` 手动触发。
- 自主开口：opt-in，经既有 `tianlightPet.maybeProactive()` 与 `tianlightLife.gate({type:"proactive"})`（静音/免打扰/睡眠/每日主动预算），无 life 引擎或桌宠未连接时**只记录不开口**。
- 聊天更像人：本地回复融入最近话题/时段/记忆/当前想法并做防复读；有 LLM 适配器时 prompt 附加有界上下文摘要（≤700 字，近 6 条聊天 + 记忆 + 当前想法，不涉及 DSH 数据）。权限、暂停、配额、审计与清洗语义不变。
- 与 v1.6.7 对话历史互通：思考上下文读取 `tianlight.petChats.v1` 的最近 6 条（可选缺失）；聊天记录仍由桌宠写入历史。
- 角色中枢新增「自主思考」卡片：启用/暂停、间隔选择、自主开口开关、「现在想一下」、最近 5 条想法（时间/来源/文本）、清空、状态行；API 缺失时禁用并提示。
- i18n 新增 53 个键（6 `pet.chat.ctx.*` + 17 `pet.mind.*` + 30 `hub.mind.*`，zh/en 成对）：注册键 1266 → **1319**。

## 2. 安全边界

- 不新增任何权限行；沿用 `proactive`（安全能力，默认开）与既有主动开口每日预算；LLM 仅在用户已配置适配器且已授权 `llm` 时经既有 brain 路径调用，共用其每日/每分钟配额与审计。
- 不调用 `tianlightPetAgent`、不驱动 DSH、不访问网络（客户端片段无 fetch/XHR/WebSocket/sendBeacon 新增）。
- 页面隐藏 / 15fps 渲染档 / `data-tl-lowpower` / 低电量控制器 on / 大脑暂停 → 一律不思考。
- 唯一定时器（60s 思考循环）与订阅者在 `installPetBrain` disposer 中清理；global 恢复先前值；无新增 window/document 监听器。

## 3. 已知限制（不阻塞本地验证）

- 自主思考若启用 LLM 生成，会消耗既有 LLM 配额（默认 60/天、6/分钟）；5 分钟间隔较吃额度。
- 自主开口消耗 life 既有主动开口预算（一次 1 单位），没有独立预算。
- 想法文本在生成时按当时语言冻结；切换语言只影响之后的新想法（与 v1.6.7 历史一致）。
- 真浏览器视觉与实时预算体验尚未录制验证（fake-DOM/静态链已覆盖）。

## 4. 验证

- 静态链：build / build --check 26/26、test 67/67、structure --strict、audit（新增 v1.6.8 守卫 3 条）、check-css、verify、i18n-audit（zh=en **1319**，referenced 1000）全绿。
- Node 冒烟：**715/715 PASS**（v1.6.7 的 706 条回归 + 新增 9 条：P-M1..P-M7 自主思考引擎/边界/开口/dispose、S99 静态契约、S100 v1.6.8 audit 守卫；P 段 62→69、S 段 98→100），构建 sha `1188519cea4016389adef625dc2e4113e8c5fdb466f946d1ecf018397bf98958`（`lib/client.js` 1,464,313 B / 1,419,950 字符，26 片段，version 1.6.8）；证据 `diag/skinlab/runs/20261110-233104-v168-v168-node-smoke/`（REPORT.md、data/report.json、715 条 `data/assertions.json`、`fragments/`、logs/static-chain.log）。
- 复跑确定性：同一 build sha 再跑一次同样 **715/715 PASS**，证据 `diag/skinlab/runs/20261110-233124-v168-v168-node-smoke/`。

## 5. 升级 / 回滚 / 仓库

- 本地生效：重启 DSH 一次 + Ctrl+F5（因 `BUILD`/`HOST_BUILD` bump）。
- 回滚：`git reset --hard v1.6.7 && node tools/build.mjs`，再重启 DSH + Ctrl+F5。
- 仓库：内部 tag 为 `v1.6.8`；`github-upload/` 镜像以公开命名 **v1.0.7（正式版）** 上传；公开 Release 说明见 `diag/tmp/github-release-v1.0.7.md`。公开包因版本常量不同会重新构建，其 `lib/client.js` sha 与内部构建不同（代码相同）。
