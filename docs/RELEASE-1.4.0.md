# v1.4.0 · 权限模型调整：驱动 DSH 仍永久禁止，其余高风险改为「可授权」

> 版本：`1.4.0`（`lib/client.js` **26 片段**；`BUILD`/`HOST_BUILD` = `1.4.0`）
> 按你的补充要求：**「驱动 DSH」保持强烈永久禁止**；直接联网、读写文件、执行命令、代审批、代发消息、安装插件这六项**不再硬性否决**，改为**用户可显式授予的高风险权限**（默认关闭、可撤销、全程审计）。
> 不变：无宿主路由改动，Ctrl+F5 即用；若提示宿主半需重启，重启一次 DSH 即消除。

## 1. 新的权限模型（15 行）

| 组 | 能力 | 默认 | 可授予 | 说明 |
|---|---|---|---|---|
| safe（6） | chat / memory / focus / media / remind / proactive | ✅ | 可撤销 | 安静陪伴所需最小集合 |
| medium（2） | llm / agentChat | ❌ | **需显式同意** | LLM 适配器 / 用户主动提问的 Agent 会话 |
| **high（6，新）** | network / files / shell / approve / message / install | ❌ | **需显式同意并二次确认** | 直接联网、读写文件、执行命令、代审批、代发消息、安装插件 |
| forbidden（1） | **agent（驱动 DSH）** | ❌ | **永久禁止** | 桌宠自主驱动 DSH 任务/工具——强烈禁止，代码层拒授 |

规则：
- `grant(cap, {consent:"user-explicit"})` 才能授权 medium/high；high 在中枢里是**两步确认 + 高风险警告**；`revoke` 随时可用。
- safe 可免 consent 恢复/撤销；`agent` 的 `grant/revoke` 永远返回 `hard-denied`。
- 所有授权持久化在 `tianlight.pet.permissions.v1`，15 行顺序固定：`chat,memory,focus,media,remind,proactive,llm,agentChat,network,files,shell,approve,message,install,agent`。

## 2. 授权之后能做什么？——能力适配器（皮肤本身仍零危险实现）

皮肤**不内置**联网/文件/命令/审批/消息/安装的任何实现。授权只是"打开开关"；真正执行必须由你（或宿主扩展）注册能力适配器：

```js
// 例如在控制台由你自己注册（皮肤不会主动注册）
window.tianlightPet.setCapabilityAdapter("network", {
  id: "my-net-adapter",
  async run(input) { /* 你自己的实现；我只会把 input 交给你并审计 */ }
})
window.tianlightPet.grant("network", { consent: "user-explicit" })
const r = await window.tianlightPet.invokeCapability("network", { url: "https://example.com" })
// -> {ok:true, adapterId:"my-net-adapter", result:...}；每次调用写审计 action:"capability"
```

- `invokeCapability` 前置：该 high cap 已授权、未暂停、适配器存在；否则拒绝（`permission` / `adapter-missing` / `paused`）。
- 适配器 `run()` 的输入/输出由你的适配器负责；皮肤只做权限闸门、调用与审计，**不替你做网络/文件/命令操作**。
- `setCapabilityAdapter` / `clearCapabilityAdapter` / `invokeCapability` 均为 v1.4 新 API；适配器函数只存内存，不持久化。
- 审计新增 `action:"capability"`（记录 cap/ok/reason/chars，不含输入原文）。

## 3. 为什么这样更符合你的要求

- 硬性否决会把你锁死；现在**你有最终决定权**：默认全关、逐个授权、可随时撤销、调用可审计。
- 同时「驱动 DSH」这条真正的行动权仍被彻底禁止，避免桌宠自己跑任务/工具。
- 皮肤自身依然零网络/零文件/零命令/零审批/零安装实现：不注册适配器时，即使授权也没有任何执行路径——风险边界清晰。

## 4. 中枢 UI

「角色中枢 → 权限总览」：15 行按 safe/medium/high/forbidden 分组着色；high 行显示「高风险」与两步确认授权；授权前显示固定警告“高风险能力本身不内置实现，需你注册适配器后才会被调用，全程审计，可随时撤销；驱动 DSH 永远禁止”；`agent` 行只读“永久禁止”。

## 5. 验证

- 静态链：build **26/26**、test 67/67、structure --strict、audit（3 条 v1.4 新守卫：六项高风险可授权 adapter / 仅 agent 永久禁止 / 适配器受控+审计）、check-css、verify、i18n（1114 键）全绿。
- Node 冒烟：**465/465 PASS**（R 58 + H 54 + L 19 + M 18 + S 60 + P 62 + U 54 + A 79 + E 15 + **HIGH 46**），构建 sha `FC4E446A…`；证据 `diag/skinlab/runs/20261110-164742-v140-v140-node-smoke/`。
- HIGH 段覆盖：15 行/risk/consent 矩阵、safe 免 consent、agent 双向 hard-denied、适配器校验与内存态、`invokeCapability` 门禁顺序（granted→未暂停→adapter）与五类路径、`capability` 审计不含原文、中枢 8 个 grant/6 个 revoke 按钮与两步确认、优先于 adapter-missing 的 paused、`agent` 行只读“永久禁止（驱动 DSH）”。
- 真浏览器级与真实 DSH Agent/适配器往返仍受本会话沙箱限制（Edge Mojo 命名管道），harness 就绪待非沙箱补跑。

## 6. 升级 / 回滚 / 仓库

- 升级：Ctrl+F5；宿主无路由变化；提示宿主半需重启时重启一次。
- 回滚：`git reset --hard v1.3.0 && node tools/build.mjs`，再 Ctrl+F5。
- 仓库：`github-upload/` 同步 v1.4.0（tag），推送方式：
  - `$env:GH_TOKEN="github_pat_xxx"; powershell -NoProfile -ExecutionPolicy Bypass -File diag\tmp\publish-v140.ps1`
  - 或 GitHub Desktop / 网页上传（勿带 `.git`）
