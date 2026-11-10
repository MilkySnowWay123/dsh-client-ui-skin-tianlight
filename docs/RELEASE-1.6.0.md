# v1.6.0 · 上限上调 + 液态玻璃全覆盖

> 版本：`1.6.0`（`lib/client.js` **26 片段**；`BUILD`/`HOST_BUILD` = `1.6.0`）
> 针对你的两条反馈：①「安全上限提高一些」→ 主动开口、本地 chat、LLM、AI Agent 的每日/速率/输入/输出/超时上限整体上调（**权限模型/默认关闭/显式授权/审计/驱动 DSH 永久禁止全部不变**）；②「液态玻璃没有应用到全部界面」→ 在 depth != off 时把液态玻璃配方统一套到侧栏/设置/壁纸库/中枢/对话框/菜单/列表框/输入区/气泡/胶囊/提示等表面，无壁纸场景时自动补一层玻璃兜底。
> 无宿主路由改动：Ctrl+F5 即可；`BUILD`/`HOST_BUILD` 同步为 1.6.0（仅 build 标记），若面板提示宿主半需重启，重启一次 DSH 即消除。

## 1. 本轮改动

| 需求 | 改动 | 验收 |
|---|---|---|
| A. 上限提高 | §2 全部数值上调：主动开口、本地 chat、LLM、AI Agent、中枢预算；权限语义不变；旧持久化值按新区间 clamp | 静态断言 + Node 行为冒烟（默认值/超限拒绝/clamp/跨天重置/旧值迁移） |
| B. 玻璃全覆盖 | §3 分组 A/B 规则 + 场景缺失兜底 + off 零变化 + 低电量/减少动效降级 | 静态断言（选择器/变量/off/lowpower/fallback 生命周期）+ 你真浏览器点验 |

26 片段不变（改动在 `src/20-stylesheet.js`、`src/57-glass.js`、`src/42-life.js`、`src/44-pet-brain.js`、`src/48-pet-agent.js`、`src/76-role-hub.js` 内部扩展，无新增 fragment/region）；无新增宿主路由。

## 2. 安全上限整体上调

数值整体放宽，语义不变：**默认关闭、显式授权、可撤销、全程审计、`agent`（驱动 DSH）永久禁止**均保持 v1.4/v1.5 行为；配额仍按调用尝试计数（失败也消耗），跨天重置逻辑不变。

| 项 | 常量 / 位置 | 旧 → 新 |
|---|---|---|
| 桌宠主动开口预算（默认 / 可调上限） | `src/42-life.js` `LIFE_DEFAULT_CAP` / `LIFE_BUDGET_MAX` | 6 / 20 → **12 / 50** |
| 本地 chat 频次 | `src/44-pet-brain.js` `PET_LOCAL_MINUTE_LIMIT` / `PET_LOCAL_DAILY_LIMIT` | 8/分、300/天 → **20/分、1200/天** |
| 本地 chat 输入上限 | `src/44-pet-brain.js` `PET_INPUT_MAX` | 280 → **1000** 字（超长截断并审计） |
| LLM 日配额（默认 / 可配上限） | `PET_DAILY_LIMIT_DEFAULT` / `PET_DAILY_LIMIT_MAX` | 20 / 50 → **60 / 120** |
| LLM 每分钟调用 | `PET_MINUTE_CALL_LIMIT` | 3 → **6** 次/分 |
| LLM 输入 | `PET_INPUT_MAX`（与本地 chat 共用同一截断） | 280 → **1000** 字 |
| LLM 输出上限 | `PET_LLM_MAX_CHARS`（适配器契约 `maxChars`）+ `PET_REPLY_MAX`（回复清理截断） | 600 → **1200** 字（两处统一） |
| LLM 超时 | `PET_LLM_TIMEOUT_MS`（适配器契约 `timeoutMs`） | 12000 → **20000** ms |
| AI Agent 日预算（默认 / 可调上限） | `src/48-pet-agent.js` `PET_AGENT_DAILY_CAP` + 持久化 clamp `PET_AGENT_DAILY_CAP_MAX` | 10 / 30 → **30 / 100** |
| AI Agent 输入 | `PET_AGENT_MAX_CHARS` | 500 → **1000** 字 |
| AI Agent 回复超时 | `PET_AGENT_TIMEOUT_MS` | 60s → **120s** |
| 中枢生活预算输入范围 | `src/76-role-hub.js`（input `max` + 回填 clamp + patch 校验） | 0..20 → **0..50** |
| 中枢 AI 输入上限 | `src/76-role-hub.js` `HUB_AI_INPUT_MAX` | 280 → **1000** 字 |
| 审计环 / Agent 审计环 | `PET_AUDIT_MAX` / `PET_AGENT_AUDIT_MAX` | 60 / 30（不变） |
| 权限模型 / 默认关闭 / 显式授权 / 审计 / 驱动 DSH 永久禁止 | `src/44-pet-brain.js` + `src/48-pet-agent.js` | **不变** |

迁移与边界：旧 `localStorage`/状态里的 cap 超出新范围时按新区间 clamp（如旧 Agent cap 30 保留、>100 收为 100；生活预算 >50 收为 50）；超限仍拒绝并给出原因，跨天重置、暂停/击杀开关、审计 `action` 语义都不变。`PET_SAY_MAX=200` 只是桌宠气泡口播截断，不属于 LLM 输出上限。

## 3. 液态玻璃：统一覆盖全部界面

v1.5 的玻璃只作用于壁纸场景层 `[data-tl-scene]::after` 与皮肤自身的玻璃胶囊（模型选择/推理档位），其它 DSH 表面仍是旧样式，所以看起来「没应用到全部」。v1.6 在 `depth != off` 时把同一套液态玻璃配方套到所有已知玻璃/浮层表面。

- 生效条件：`data-tl-glass-effective` ∈ `soft|frosted|real`（即 `data-tl-glass-depth` != off）；CSS 规则全部以 `body[data-dsh-tianlight]` 开头限定，不使用构建哈希类名。
- 配方：复用 `--tl-glass-fill` / `--tl-glass-line` / `--tl-glass-m` 与 v1.5 的 `--tl-liquid-*`（blur/sat/hi/lo/noise/sheen）——specular 顶边高光 `inset 0 1px 0 rgba(255,255,255,var(--tl-liquid-hi))`、用 `box-shadow` 画的 0.5px hairline（不新增 border、不触发回流）、轻外阴影与对角 sheen。
- 分组 A（重：面板/浮层）：`[data-tl-sidebar]`、`[data-tl-sidebar-col]`、`[data-tl-settings]`、`[data-tl-wall]`（壁纸库）、`[data-tl-hub] [data-tl-hub-panel]`（角色中枢面板）、`[role="dialog"]`、`[role="menu"]`、`[role="listbox"]`：sheen + specular 顶边 + `box-shadow` hairline + 浅投影；**填充只落在 `[data-tl-sidebar]`/`[data-tl-sidebar-col]`（`color-mix` 前景 62%）**，`[data-tl-settings]`/`[data-tl-wall]`/`[data-tl-hub-panel]` 保留产品原有填充、只加丝光/描边/阴影，`[role="dialog"]`/`[role="menu"]`/`[role="listbox"]` 作为 ARIA 兜底**不加填充**（不覆写产品自身填充，只加 specular/hairline/浅投影）；**大面板不叠实时 `backdrop-filter`**——每视口只保留一层模糊（场景层或兜底层），这些面板本身已有底色或位于产品遮罩模糊之上，再叠全屏 blur 会每帧重新合成。
- 分组 B（轻：气泡/胶囊/菜单/提示）：`[data-tl-composer]`（输入区容器）、`[data-tl-model]`、`[data-tl-bubble]`、`[data-tl-menu]`、`[data-tl-duty]`、`[data-tl-catmenu]`、`[role="tooltip"]`、`[role="tabpanel"]`：specular + hairline + 浅投影；气泡列表不逐项 blur、桌宠气泡/菜单不改原有填充（长会话滚动性能与可读性优先）；`[data-tl-model]` 额外加对角 sheen，`[data-tl-menu]` 额外加更深投影并复用自身 blur。`[role=…]` 系列是 DSH 自带稳定语义锚点，作为“全部表面”的兜底。
- 输入控件（`input[type=text/number/…]`、`textarea`、`[contenteditable="true"]`、`[role="textbox"]`；checkbox/radio/range 除外）：只加描边 + specular 顶边微高光，**不加 filter、不加投影**（光标、IME 候选窗、选区锚点必须保持原位）。
- 模糊只有三处：① 有场景时仍由 v1.5 的 `[data-tl-scene]::after` 提供；② 浮层菜单 `[data-tl-menu]` 与输入区 `[data-tl-composer]::before`，用 `@supports` 包裹 `blur(max(var(--tl-glass-blur), var(--tl-liquid-blur))) saturate(var(--tl-liquid-sat))`（保证 soft 档不比 off 更难读）；③ 无场景时的兜底层。
- 场景缺失兜底：页面上没有 `[data-tl-scene]` 时（未设壁纸/图片壁纸/纯色），glass installer 在 `body` 的第一个子节点位置插入唯一一个 `<div data-tl-liquid-fallback aria-hidden="true">`（`position:fixed; inset:0; z-index:-1; pointer-events:none`，渐变 + `blur(var(--tl-liquid-blur)) saturate(...)`，随深度变量联动）——保证「没有场景也能看到玻璃」。`[data-tl-scene]` 出现/消失时由 body 的 `childList` MutationObserver 同步移除/重建（`insertBefore(node, body.firstChild)`，幂等）；`dispose()` 删除节点并断开 observer；低电量不插入、已存在则移除。
- 关闭档零变化：`off` 时上述分组规则、兜底层、两处新增 blur 全部不生效（规则只在 `soft|frosted|real` 块内；fallback 不插入），保持 v1.4 前观感与零额外合成开销。
- 自动降级：低电量/15fps（`[data-tl-lowpower]`）去掉 sheen/投影/动画（填充可保留，它没有每帧合成成本），两处实时 blur 压到 3px、兜底层压到 2px；`prefers-reduced-motion` 去掉 sheen 动画。
- 性能取舍：每视口最多一层全屏/大面积模糊；大面板与气泡只做填充/高光/描边/阴影；关闭档与低电量即时回到零成本路径。中枢玻璃卡原有预览条（`[data-tl-glass-preview]`）保留，切换四档可直接看差异。

## 4. 验证

- 静态链：build/build --check 26/26、test 67/67、structure --strict、audit（v1.6 新守卫 10 条：全界面分组 / 场景缺失 fallback / 上限新值）、check-css、verify、i18n-audit（zh=en 1203 键）全绿；日志 `diag/skinlab/runs/v160-static-chain.log`（8,649 B，36 条 green 行）。
- Node 冒烟：**586/586 PASS**（v1.5 的 534 条回归按新上限更新 + 52 条新增），构建 sha `d9533358c30efa510f22ecba62d00c7f53b75ed183c4a5df949068773bc0e95f`（`lib/client.js` 1,272,497 B / 1,231,576 字符，26 片段，version 1.6.0）；证据 `diag/skinlab/runs/20261110-174704-v160-v160-node-smoke/`（REPORT.md、data/report.json、586 条 `assertions.json`、`fragments/`、`glass-all.css`、`logs/static-chain.log`）。
- 分段：R 58/58、H 54/54、L 19/19、M 18/18、S 73/73、P 62/62、U 54/54、A 79/79、E 15/15、HIGH 46/46、W 26/26、X 32/32、G（GLASS-ALL）23/23、Q（LIMITS）27/27。
- 复跑确定性：同一 build sha 再跑一次同样 586/586 PASS，证据目录 `diag/skinlab/runs/20261110-174632-v160-v160-node-smoke/`。
- G 段覆盖：分组 A/B 选择器与 `[role=…]` 兜底存在、`--tl-liquid-*` 复用、`@supports` 包裹的 blur 仅落在 `[data-tl-menu]` 与 `[data-tl-composer]::before`、大面板不叠实时 `backdrop-filter`、输入控件无 filter/投影、off 档无新增规则（零变化）、`[data-tl-lowpower]` 压平（blur≤3px、无阴影/动画）、`prefers-reduced-motion` 关动画、`[data-tl-liquid-fallback]` 的 CSS 与创建/移除/dispose/lowpower 生命周期、中枢预览条保留。
- Q 段覆盖：新默认值、边界（超限拒绝）、clamp、跨天重置、旧持久化值迁移、LLM payload 的 `maxChars`/`timeoutMs`、Agent 预算 clamp 1..100、中枢预算 max=50（50 接受 / 51 拒绝）。
- 真浏览器级视觉仍受本会话沙箱限制（Edge Mojo 命名管道），由你 Ctrl+F5 后点验；可先跑一次角色中枢「自检」确认各层状态。

## 5. 升级 / 回滚 / 仓库

- 升级：Ctrl+F5；本版无宿主路由改动（仅 `BUILD`/`HOST_BUILD` build 标记同步为 1.6.0）；若中枢/面板提示宿主半需重启，重启一次 DSH 即消除。
- 回滚：`git reset --hard v1.5.0 && node tools/build.mjs`，再 Ctrl+F5。
- 仓库：`github-upload/` 同步 v1.6.0（commit + tag `v1.6.0`），**未 push**（本会话无凭据）；推送脚本见 `diag/tmp/publish-v160.ps1` 或 GitHub Desktop。
