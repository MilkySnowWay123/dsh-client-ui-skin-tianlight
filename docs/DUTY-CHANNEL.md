# 职责通道（Duty Channel）— v0.7.0

> 浏览器半新增的跨插件接口：让「角色包 / 职责层」（role pack）等外部代码驱动**天光桌宠**的职责气泡与用户选择。
> 本版**只改浏览器半**（`lib/client.js`）：宿主半 `lib/index.js` 与 `BUILD` 仍是 0.6.0，所以**不需要重启 DSH Desktop**，Ctrl+F5 刷新页面即可加载；`HOST_BUILD` 保持 0.6.0 以通过启动握手（不会显示“宿主半需重启”）。

## 1. 为什么

角色包的职责层（见 `rolepack/quiet-writing-companion/duties.json`）负责「替用户盯着什么、什么时候介入、被拒绝后怎么记住」。它需要唯一的呈现出口：**在 DSH 之外持续存在的桌宠**。v0.6.0 的桌宠只有装饰性互动；v0.7.0 增加一个极小的、fail-closed 的通道，让外部代码可以：

- 在桌宠旁显示**带选项按钮的职责气泡**（审批/完成/喝水等）；
- 显示**普通短句气泡**（角色反馈，如“好，等会儿我再来”）；
- 收到用户点击选项的结果（`等会儿 / 静音 1 小时 / 休息时再说 / 额度调整`），交给职责引擎决定后续行为；
- 也支持 TTL 到期（未选择）事件，避免气泡永久占位。

## 2. 契约

### 2.1 入站（外部 → 桌宠）

```js
// 两种等价写法：
globalThis.tianlightDuty.send(action)
document.dispatchEvent(new CustomEvent("tianlight:duty", { detail: action }))
```

| action | 字段 | 行为 |
|---|---|---|
| `interrupt` | `signalId` 1..64；`text` 1..200；`choices` 1..5 个 `{id:1..40, label?:1..40}`；`ttlMs` 0..120000（默认 12000）；`priority?` | 桌宠旁显示职责气泡（文本 + 按钮）；点按钮后出站；TTL 到期出站 `timeout` |
| `speak` | `text` 1..200；`ttlMs` 500..120000（默认 8000） | 普通气泡短句，无按钮 |
| `clear` | — | 隐藏职责气泡，并清掉挂起的 `speak` 气泡 |

返回值：`{ ok: true }` 或 `{ ok: false, reason }`：
- `invalid-action`：形状不合法（fail-closed，第三方代码的畸形输入不会进 DOM）；
- `companion-off`：同伴模块被关闭（设置 → 模块 → 薄荷桌宠）；
- `internal-error`：渲染期异常（已捕获，不会打崩页面）。

### 2.2 出站（桌宠 → 外部）

```js
const dispose = globalThis.tianlightDuty.subscribe((event) => { /* ... */ })
document.addEventListener("tianlight:duty-action", (e) => { e.detail /* ... */ })
```

| event | 字段 |
|---|---|
| `choice` | `signalId`、`choiceId`、`at`（ms epoch） |
| `timeout` | `signalId`、`at`（TTL 内用户未选） |

### 2.3 诊断

```js
globalThis.tianlightDuty.version   // 1
globalThis.tianlightDuty.status()  // { version, enabled, subscriberCount, interrupts, speaks, clears, rejected, choices, timeouts, lastActionAt, lastSignalId, companion }
globalThis.__dshTianlightInstance.duty()  // 同上（皮肤实例诊断入口）
```

## 3. 用法示例（职责引擎 → 天光桌宠）

```js
// 例：写作专注场景，审批气泡（等会儿 / 静音 1 小时）
const result = globalThis.tianlightDuty.send({
  type: "interrupt",
  signalId: "agent.approval",
  text: "有个审批等你点一下。不急，我先放这儿。",
  choices: [
    { id: "later", label: "等会儿" },
    { id: "mute", label: "静音 1 小时" },
  ],
  ttlMs: 12000,
})

globalThis.tianlightDuty.subscribe((event) => {
  if (event.type !== "choice") return
  // 把用户选择回传给职责层：later → snooze 15min；mute → mute 1h
  dutyEngine.handleControl({ signalId: event.signalId, action: event.choiceId, at: event.at })
})
```

角色包侧的浏览器桥接与映射见 `rolepack/quiet-writing-companion/examples/adapters/tianlight-duty-bridge.js` 与 `docs/ADAPTERS.md` §3.5。

## 4. 安全 / 兼容 / 边界

- **fail-closed**：类型/长度/数量校验；未知 action 拒绝；气泡文本用 `textContent`（不解析 HTML）。
- **不新增宿主路由**：纯浏览器 API，无网络请求、无越权；卸载时还原上一个 `globalThis.tianlightDuty`（热重载不泄漏）。
- **同伴模块关闭时**降级为 `companion-off`；职责层可自行决定排队或忽略。
- **与现有气泡隔离**：职责气泡是 `[data-tl-duty]`，普通台词是 `[data-tl-say]`，互不覆盖。
- **键盘可达**：选项是原生 `<button>`，可 Tab 聚焦、Enter/Space 触发；不影响桌宠拖拽与菜单（事件已 stopPropagation）。
- **已知边界**：本版只把动作映射到桌宠气泡/按钮；真实信号源采集（DSH session 事件 → 职责层）仍属职责层/适配器侧，不在本皮肤内；宿主半未变，旧宿主 + 新客户端仍正常工作。

## 5. 验收

静态链（`npm run check`）覆盖：build 22 片段、test 67/67、structure --strict、audit（监听器/setTimeout 配对、effect 顺序、**职责通道出站顺序回归守卫**）、check-css、verify、i18n-audit（zh/en 860 键）。

Node 级契约冒烟（真实构建代码 + fake DOM）：**54/54 PASS**（通道 surface/version、interrupt DOM/按钮/入站、subscribe+点击→choice、TTL→timeout、非法 action、speak/clear、无异常、静态契约）；旧构建对照 **43/54 FAIL**，根因是 `hideDuty()` 在 `emit()` 前清空了 emitter（已修复为捕获→hide→emit）。证据：`diag/skinlab/runs/20261110-131518-v070-after-fix-node-smoke/`（旧构建：`...-before-fix-node-smoke/`）。

浏览器级（隔离 DSH + headless Edge + 真实鼠标）：本会话沙箱阻止 Edge 启动（命名管道 `Access denied (0x5)`），harness 已就绪待非沙箱环境补跑：`node diag/skinlab/dutycheck.mjs --version v022 --skin-dir <skin>`。

## 6. v1.1（1.0.0）生活闸门 / 延迟回放 / 可替换形象

v1.0.0 在通道上加了一层**生活节奏闸门**（实现：`src/42-life.js` + `src/40-companion.js`），让"职责提醒"不再无视用户作息与主动性预算：

| 变化 | 说明 |
|---|---|
| `interrupt` 先过生活闸门 | 静默时段 / 睡眠窗口 / 静音 / 每日预算耗尽时**不立刻弹**：进入生活引擎延迟队列（≤8 条、按 signalId 去重、按优先级排序、持久化）。 |
| 返回值扩展 | 被拦下时 `send()` 返回 `{ok:true, deferred:true, reason:"quiet-hours"|"asleep"|"mute"|"budget", dueAt}`，调用方可据此排队/展示状态。 |
| 新出站 `deferred` | `{type:"deferred", signalId, reason, dueAt, at}`（同时走 subscribe 与 `tianlight:duty-action`）。 |
| 新出站 `interrupt`（回放） | 生活引擎在窗口期调用 `tianlightDuty.replay(action)` 补发：`{type:"interrupt", signalId, replayed:true, at}`；气泡正常渲染、用户选择照常回传。 |
| `status()` 扩展 | 增加 `deferred`（累计被延迟次数）、`replayed`（累计回放次数）。 |
| 形象事件 | `document` 上新增 `tianlight:pet-media`（detail=`{id,kind:"image"|"video",url,name,bytes}|null`），桌宠据此实时切换图片/≤32 MiB 视频形象。 |
| 生活 API | `globalThis.tianlightLife`（version 1）：`status/configure/adjustBudget/muteFor/gate/noteInteraction/focusStart/focusStop/listMedia/setMedia/tryProactive`。设置页与桌宠共用同一状态，不新增第二事实源。 |

兼容：旧调用方式（`send`/`subscribe`/`tianlight:duty`）不变；`globalThis.tianlightDuty.version` **仍为 1**（v1.1 是契约修订，只做加性 API），旧适配器（按 `version === 1` 判断）不受影响；未提供 `tianlightLife` 时（例如只更新了客户端但页面未挂上生活层）闸门缺失等价于放行。真实信号源采集仍属角色包/适配器侧。
