# v1.2.0 · 右键桌宠进中枢 · 接入 DSH Agent（受控）

> 版本：`1.2.0`（`lib/client.js` **27 片段**；`BUILD`/`HOST_BUILD` = `1.2.0`）
> 主题：① **右键桌宠直接打开角色中枢**；② 在严格规范下**接入真实 DSH Agent**——桌宠可以把用户主动输入的话发给一个用户选定/新建的 DSH 会话的 Agent，并把回复显示在中枢里（回复解析失败则提示到会话查看）。
> 本次无宿主路由改动：升级后 Ctrl+F5 即可；若提示"宿主半需重启"（build 标记），重启一次 DSH 即消除。
> 权限规范：[AI-PET-PERMISSIONS.md](AI-PET-PERMISSIONS.md)（已更新 agentChat）。

## 1. 右键桌宠 → 角色中枢

- 桌宠根节点新增 `contextmenu`：右键即打开角色中枢（`preventDefault`，不触发左键菜单/拖拽）；中枢不可用时回退到原菜单，不会"右键无反应"。
- 侧栏「角色」按钮、右键桌宠两个入口等价；键盘用户仍可用侧栏/设置页。

## 2. 接入 DSH Agent（真实 AI）

实现 `src/48-pet-agent.js`，运输层是 DSH 客户端的 `remote.session`（`list/create/prompt/follow`）。这是**真实 Agent**，不是本地模拟。

| 规范项 | 规则 |
|---|---|
| 权限 | 新增 `agentChat`（medium，**默认关闭**），必须用户显式授权 `{consent:"user-explicit"}`；`agent`（桌宠自主驱动任务/工具）仍**永久禁止** |
| 触发 | **只有**用户在角色中枢里手动发送；无定时器、无生活/职责钩子、无自动任务 |
| 目标会话 | 用户明确选择：新建"桌宠会话"，或从会话列表选一个现有会话；连接信息持久化，可随时断开 |
| 预算 | 每日 ≤**10** 次（存储可调 1..30）；单次输入 ≤**500** 字；回复等待 ≤**60s**；**同时只允许 1 条** |
| 操作面 | 只调用 `list/create/prompt/follow`；**绝不**调用 cancel/approve/attachment 等接口，绝不替你批准/拒绝/发消息 |
| 提示词保护 | 每次发送前加固定引导语："请只回答，不要执行工具、不要请求审批、不要修改文件，除非用户明确要求"（软约束；Agent 真实工具权限仍由 DSH 会话决定，UI 明确警示） |
| 审计 | 每次发送/失败/连接写本地审计并镜像到 `tianlightPet.audit`；可在中枢查看 |
| 回复 | 尽力从 follow 流解析文本（≤1200 字）；解析失败显示"已发送，打开会话查看"，绝不假装有回复 |
| 断开 | 一键断开/撤销权限；断开后聊天自动回落到本地大脑/LLM 适配器 |

API：`globalThis.tianlightPetAgent` v1（`status/refreshSessions/connect/disconnect/chat/openSession/audit`）；实例诊断 `__dshTianlightInstance.agent()`。
中枢新增「AI Agent（实验）」卡片：授权开关（两步确认）、目标会话选择、连接/断开/打开会话、预算与状态、风险提示；聊天输入在已连接时自动走 Agent。

## 3. 为什么不是把 `agent` 从永久禁止里放出来

`agent` 的语义是"桌宠**自主**驱动 DSH 任务/工具/审批"——那会让一个装饰性角色获得行动权，风险不可接受。`agentChat` 只做"用户打字 → 发给 Agent → 显示回复"，用户是唯一触发者和审批者；即使 Agent 在会话中请求审批，也是 **DSH 正常流程交给你**，桌宠不代点。7 项永久禁止保持不变：`agent/network/files/shell/approve/message/install` 与 `agentChat` 无关。

## 4. 验证

- 静态链：build **27/27**、test 67/67、structure --strict、audit（v1.2 agent 桥守卫）、check-css、verify、i18n（1120 键）全绿。
- Node 冒烟：**378/378 PASS**（R 58 + H 54 + L 19 + M 18 + S 42 + P 62 + U 46 + A 79），构建 sha `8226E5B5…`；证据 `diag/skinlab/runs/20261110-160651-v120b-v120-node-smoke/`。
  - 验收中抓到并修复一个真实缺陷：中枢关闭再打开后 Agent 目标列表被签名缓存吞掉（`agentTargetSignature` 未在 close 重置）→ 修复后 A73/A74/A75 复核 PASS（旧 FAIL run `runs/20261110-160435-v120-...` 保留作 before/after 对照）。
  - 同时修掉 connect new 的回退重试未携带 `cwd` 的观察项。
- 真浏览器级与真实 DSH Agent 往返仍受本会话沙箱限制（Edge Mojo 命名管道），harness 就绪；Agent 真机建议在非沙箱环境按 §2 步骤点验（首次用“新建桌宠会话”）。

## 5. 升级 / 回滚 / 仓库

- 升级：Ctrl+F5；宿主无路由变化；提示宿主半需重启时重启一次。
- 回滚：`git reset --hard v1.1.0 && node tools/build.mjs`，再 Ctrl+F5。
- 仓库：`github-upload/` 同步 v1.2.0（tag），推送方式：
  - `$env:GH_TOKEN="github_pat_xxx"; powershell -NoProfile -ExecutionPolicy Bypass -File diag\tmp\publish-v120.ps1`
  - 或 GitHub Desktop / 网页上传（勿带 `.git`）
