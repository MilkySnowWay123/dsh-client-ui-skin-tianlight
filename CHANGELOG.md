# 更新日志

本文件由 `node tools/release.mjs --note "…"` 维护；条目按版本倒序，格式参考 Keep a Changelog。

## [1.6.1] - 2026-11-10

### 发布说明

- **侧栏「新会话」深色块修复**：根因是 DSH 产品按钮 token（`--dsw-alias-button-elevated-fill` / hover `--dsw-alias-button-floating-hover` / 边框 `--dsw-alias-border-l3`）皮肤此前未接管。selector bridge 现识别 `newSession` 分段按钮并打 `data-tl-new-chat`，**所有深度档**皮肤化（透明/玻璃填充 + 0.5px 描边 + 主题文字色 + hover accent-soft + focus-visible）——**off 档也不再是深色块**；`depth-on` 套完整液态玻璃 v2；产品 token 覆盖块（`--dsw-alias-*`）同步接管同类产品按钮。
- **液态玻璃 v2（OriginOS 7 风）**：三档 blur/sat 整体上调（soft **11px**/1.30、real **19px**/1.50、frosted **26px**/0.95）；多层 specular（左上径向 + 对角 sheen + 右下冷色 tint）、1px 亮/暗边（新增 `--tl-liquid-rim`）、外柔光（`--tl-liquid-glow-shadow`）、细噪点（新增 `--tl-liquid-grain`，feTurbulence SVG data URI）、hover/active 柔和回弹；v1.6 的全部分组 A/B、场景兜底层与中枢预览条同步升级，新增表面：新会话按钮 `[data-tl-new-chat]`、天气胶囊 `[data-tl-weather-chip]`；性能预算不变（每视口最多一层大 blur、气泡不逐项 blur），`[data-tl-lowpower]` 压平 blur≤3px、`prefers-reduced-motion` 关过渡、`off` 零变化（新会话修复除外）。
- **DSH 主界面天气胶囊**：主界面右上常驻浮动玻璃胶囊（fixed、不占布局；`top` 叠加 Desktop 标题栏安全区、`right:14px`、`z-index:96`），状态 `off/no-location/waiting/error/ready` 与 zh/en 文案（`weather.chip.*`）；优先订阅 `globalThis.tianlightWeather`，无订阅能力时 60s 轮询 `summary()`；点击/Enter/Space 打开角色中枢天气卡；**不自动 enable、不新增网络请求与权限**；lifecycle-owned，dispose 移除/退订/清定时器，由 `src/99-apply.js` 常驻安装。
- **版本与文档**：`BUILD`/`HOST_BUILD`/`package.json`/`skin.json` = **1.6.1**；新增 [docs/RELEASE-1.6.1.md](docs/RELEASE-1.6.1.md)；公开上传物/发布说明命名 **v1.0.0**（内部构建 1.6.1）。
- **验证**：静态链 build/build --check 26/26、test 67/67、structure --strict、audit（v1.6.1 新守卫 4 条：新会话全档玻璃 / 玻璃 v2 配方 / 天气胶囊挂载 / 五状态+本地化）、check-css、verify、i18n-audit（zh=en 1216 键）全绿；Node 冒烟 **622/622 PASS**（v1.6.0 的 586 条回归 + 36 条新增：N 11 / C 16 / G 扩展 9），构建 sha `54b425d4…`（`lib/client.js` 1,301,872 B），证据 `diag/skinlab/runs/20261110-184557-v161-v161-node-smoke/`；同一 build sha 复跑同样 622/622。

## [1.6.0] - 2026-11-10

### 发布说明

- **安全上限整体上调（权限模型不变）**：主动开口预算 6/20 → **12/50**；本地 chat 8/分、300/天 → **20/分、1200/天**，输入 280 → **1000** 字；LLM 日配额 20/50 → **60/120**、分钟 3 → **6**、输入 280 → **1000**、输出 600 → **1200** 字、超时 12s → **20s**；AI Agent 日 10/30 → **30/100**、输入 500 → **1000** 字、超时 60s → **120s**；中枢生活预算 0..20 → **0..50**；审计环 60/30 不变。默认关闭、显式授权、可撤销、全程审计、`agent`（驱动 DSH）永久禁止全部不变，旧持久化值按新区间 clamp。文档 [docs/RELEASE-1.6.0.md](docs/RELEASE-1.6.0.md)、[docs/AI-PET-PERMISSIONS.md](docs/AI-PET-PERMISSIONS.md) 已同步。
- **液态玻璃全覆盖**：depth != off 时统一应用到侧栏/设置/壁纸库/中枢/对话框/菜单/列表框/输入区/气泡/胶囊/提示等表面（分组 A 重：填充/specular/描边/轻阴影；分组 B 轻：气泡/胶囊/提示只加高光与描边；每视口只留一层模糊——大面板与气泡不叠实时 blur；输入控件只加描边/微高光、不加 blur）；无壁纸场景时自动插入 `[data-tl-liquid-fallback]` 玻璃兜底（scene 出现/消失同步、dispose 删除、低电量禁用）；off 档零变化、低电量/15fps 自动压平、`prefers-reduced-motion` 关动画；中枢预览条保留。
- **静态链全绿**：build 26/26、test 67/67、structure --strict、audit（v1.6 新守卫 10 条：全界面分组 / 场景缺失 fallback / 上限新值）、check-css、verify、i18n-audit（zh=en 1203 键）；`BUILD`/`HOST_BUILD`/`package.json`/`skin.json` = **1.6.0**。
- **Node 冒烟**：**586/586 PASS**（v1.5 的 534 条回归按新上限更新 + 52 条新增，含 G（GLASS-ALL）23 条 / Q（LIMITS）27 条），构建 sha `d9533358…`（`lib/client.js` 1,272,497 B），证据 `diag/skinlab/runs/20261110-174704-v160-v160-node-smoke/`；同 build sha 复跑同样 586/586。
- **发布物**：`github-upload/` 镜像同步 v1.6.0（commit + tag）；**仅本地、未 push**（本会话无凭据）。

## [1.5.0] - 2026-11-10

### 发布说明

- **液态玻璃可见性修复**：默认档由 off 改为 **soft**；强度提升；除壁纸场景层外，也作用于皮肤自身玻璃胶囊/表面；中枢玻璃卡新增**预览条**（切换即见）与「默认柔和」说明；低电量/15fps 仍自动降级。
- **天气上桌**：`src/35-context.js` 暴露 `globalThis.tianlightWeather`（含 `summary()/isReady()/enable()/disable()`）；角色中枢新增天气卡（当前天气描述/温度/更新时间/错误、启用开关、城市解析、坐标、定位、刷新、七态反馈），复用原有 Open-Meteo 天气（默认关闭、显式启用才联网、免 key）。
- **恢复默认形象**：中枢新增「恢复默认形象」→ `tianlightLife.setMedia(null)`。
- **一键自检**：中枢「自检」逐项检查 life/pet/glass/media/weather/agent/hub 并给出 PASS/FAIL、可复制结果。
- **反馈渠道**：GitHub Issues 已开放；新增 `.github/ISSUE_TEMPLATE/feedback.yml`、`docs/FEEDBACK.md`、中枢「反馈」面板（复制/预填 Issue/下载 JSON，不读取会话正文与凭据）。
- 静态链 26/26、test 67/67、audit v1.5 新守卫、CSS/verify/i18n 全绿；Node 冒烟 = v1.4 465 条回归 + WEATHER/UX 段。

## [1.4.0] - 2026-11-10

### 发布说明

- **权限模型调整（用户要求）**：`agent`（驱动 DSH 任务/工具）**保持强烈永久禁止**；`network/files/shell/approve/message/install` 六项从 hard-denied 改为 **high risk、默认关闭、可显式授权/撤销**（`grant(cap,{consent:"user-explicit"})`；中枢两步确认 + 高风险警告），不再硬性否决。
- **能力适配器**：新增 `setCapabilityAdapter(cap,{id,run})` / `clearCapabilityAdapter(cap)` / `invokeCapability(cap,input)`——皮肤不内置危险实现；high 权限只有在“已授权 + 未暂停 + 适配器存在”时才会调用你注册的适配器，异常返回 `adapter-error`，全程审计 `action:"capability"`（不记录输入原文）。
- 权限总览 UI 按 safe/medium/high/forbidden 分组着色；6 个 high 行可两步确认授权/撤销；`agent` 行只读“永久禁止（驱动 DSH）”。
- 文档：更新 [docs/AI-PET-PERMISSIONS.md](docs/AI-PET-PERMISSIONS.md)（新矩阵/适配器契约/风险）、新增 [docs/RELEASE-1.4.0.md](docs/RELEASE-1.4.0.md)；`BUILD`/`HOST_BUILD`/`package.json`/`skin.json` = 1.4.0。
- 静态链：build 26/26、test 67/67、structure/audit（高风险可授权适配器 / 仅 agent 硬禁）/check-css/verify/i18n 全绿；Node 冒烟 = v1.3 410 条回归更新 + 高风险授权/适配器段。

## [1.3.0] - 2026-11-10

### 发布说明

- **角色入口收进桌宠**：删除设置页「角色 / 生活」独立页（移除 `src/74-life-settings.js`，26 片段）与侧栏 footer「角色」按钮（`sidebar.footer.action` 注册移除）；唯一入口是桌宠——右键桌宠直接打开角色中枢，或点桌宠 → 菜单新增第 7 项「角色中枢」。
- **功能不丢**：原设置页内容并入中枢新增「生活节奏设置」卡片（静默开关/起止、每日主动额度、起床/睡觉、虚拟时钟偏移、记忆统计），玻璃/形象/上传/AI/Agent/权限/审计全部保留。
- 文档：新增 [docs/RELEASE-1.3.0.md](docs/RELEASE-1.3.0.md)，更新 AI-PET-PERMISSIONS 控制面说明；`BUILD`/`HOST_BUILD`/`package.json`/`skin.json` = 1.3.0。
- 静态链：build 26/26、test 67/67、structure/audit/check-css/verify/i18n 全绿；Node 冒烟 = v1.2 378/378 回归（入口断言更新）+ v1.3 入口段。

## [1.2.0] - 2026-11-10

### 发布说明

- **右键桌宠 → 角色中枢**：`contextmenu` 直接打开（preventDefault，不干扰左键菜单/拖拽），中枢不可用时回退原菜单。
- **接入真实 DSH Agent（受控）**：新增第 27 片段 `src/48-pet-agent.js`（region `pet agent`），走客户端 `remote.session`（list/create/prompt/follow）。大脑新增 medium 权限 `agentChat`（默认关；`grant` 需 `{consent:"user-explicit"}`，可 revoke；`status()`/`permissions()` 同步为 15 行）。中枢新增「AI Agent（实验）」卡片：授权两步确认、新建桌宠会话/选现有会话、连接/断开/打开会话、预算与状态、风险提示；聊天在已连接时走 Agent（回复解析失败→“已发送，打开会话查看”），未连接/未授权回落本地大脑/LLM。
- **严格规范**：仅用户手动触发（无定时器/生活/职责钩子）；每日 ≤10（1..30）、单次 ≤500 字、回复 ≤60s、同时 1 条；只调用 list/create/prompt/follow，**绝不** cancel/approve/attachment；固定“只回答”引导语；发送/失败/连接写审计并镜像 `tianlightPet.audit`；断开/撤销立即回落。`agent`（自主驱动任务/工具）仍永久禁止，7 项 forbidden 不变。
- **文档**：更新 [docs/AI-PET-PERMISSIONS.md](docs/AI-PET-PERMISSIONS.md)（agentChat 规范与风险）、新增 [docs/RELEASE-1.2.0.md](docs/RELEASE-1.2.0.md)；`BUILD`/`HOST_BUILD`/`package.json`/`skin.json` = 1.2.0。
- 静态链：build 27/27、test 67/67、structure/audit/check-css/verify/i18n 全绿；Node 冒烟 = v1.1 283/283 回归 + AGENT 段。

## [1.1.0] - 2026-11-10

### 发布说明

- **角色中枢**：侧栏 footer「角色」按钮 + 全屏面板，一屏管生活状态、专注/静音、液态玻璃、形象、AI 对话、权限、审计；×/Esc/遮罩关闭、焦点还原；`globalThis.tianlightRoleHub`；实例诊断 `hub()`。
- **AI 桌宠（严格权限）**：新增第 25 片段 `src/44-pet-brain.js`（region `pet brain`）。本地大脑（12 类意图、中英双语、短句安静语气）+ 可选 `window.tianlightPetLLM` 适配器；能力白名单：safe 六项默认授予、`llm` 需用户显式 `{consent:"user-explicit"}`、**7 项永久禁止**（`agent/network/files/shell/approve/message/install`，代码层不可授予）；LLM 硬上限（日 20≤50、分钟 3、输入 280、输出 600 字、12s 超时、固定安全系统提示、只发当前一句、无 DSH 会话/文件/凭据）；HTML 清理；失败回退本地；审计环形 60；暂停/击杀开关；`globalThis.tianlightPet`；实例诊断 `pet()`。
- **形象替换补完**：角色中枢支持本机直接上传图片/视频（≤32MiB，客户端前置校验 + host `_upload` 服务端校验），上传后即时切换。
- **文档**：新增 [docs/AI-PET-PERMISSIONS.md](docs/AI-PET-PERMISSIONS.md)（权限矩阵/硬上限/适配器契约/审计）、[docs/RELEASE-1.1.0.md](docs/RELEASE-1.1.0.md)。
- 第 26 片段 `src/76-role-hub.js`（region `role hub`）；`src/99-apply.js` 安装 pet brain / role hub；`src/20-stylesheet.js` 中枢样式；`BUILD`/`HOST_BUILD`/`package.json`/`skin.json` = 1.1.0。
- 静态链：build 26/26、test 67/67、structure/audit/check-css/verify/i18n 全绿；Node 冒烟在 v1.0 169/169 基础上新增 BRAIN/HUB 段；真浏览器级仍受本会话沙箱限制。

### 新增

- 角色中枢 overlay + 侧栏入口；玻璃实时切换；专注/静音快捷键；形象列表 + 上传；AI 对话；权限表（含永久禁止只读行）；审计列表。
- `globalThis.tianlightPet` v1 API：`status/permissions/grant/revoke/chat/say/setLLM/clearLLM/pause/resume/audit/maybeProactive`。
- `globalThis.tianlightRoleHub` v1 API：`open/close/status`。

### 变更

- `src/99-apply.js`：新增 pet brain / role hub 安装与诊断；`src/20-stylesheet.js`：中枢样式；`tools/build.mjs`/`structure.mjs`：26 片段 + 两个新 region；`tools/audit.mjs`：v1.1 权限/中枢/上传守卫。

## [1.0.0] - 2026-11-10

### 发布说明

- **正式版 v1.0.0**：桌宠从单一装饰升级为**多功能角色智能体**（虚拟时钟、每日作息、主动开口预算、跨会话记忆、职责提醒闸门/延迟/回放）；形象可替换为**图片或 ≤32 MiB 视频**；新增可选**液态玻璃**（真实/柔和/磨砂三档，低电量自动降级）；新增「角色 / 生活」设置页、专注计时与互动记忆；一轮节能与稳定性优化。**无宿主路由改动**，升级后 Ctrl+F5 即可（若面板提示宿主半需重启，重启一次即消除）。
- 新增对外 API：`globalThis.tianlightLife`（生活节奏/媒体/专注/记忆）、`__dshTianlightInstance.life()/glass()`；职责通道升级到 v1.1（生活闸门、`deferred` 出站、`replay` 回放、媒体 `tianlight:pet-media` 事件）。
- 文档：[docs/RELEASE-1.0.0.md](docs/RELEASE-1.0.0.md)、[docs/DUTY-CHANNEL.md](docs/DUTY-CHANNEL.md)。

### 新增

- 第 23 片段 `src/42-life.js`（region `life rhythm`）：生活节奏引擎 + 可替换形象解析（图片/视频≤32MiB、`_wallpapers` 素材筛选、`setMedia`/`tianlight:pet-media`）。
- 第 24 片段 `src/74-life-settings.js`（region `life settings`）：DSH 设置页「角色 / 生活」（slots `settings.section` id `tianlight-role`，order 110）。
- 液态玻璃三档（`src/57-glass.js` + stylesheet）：`off/frosted/soft/real`，持久化 `tianlight.glassDepth`，body `data-tl-glass-depth` / `data-tl-glass-effective`，低电量/15fps 自动降级，`prefers-reduced-motion` 关闭动画。
- 桌宠菜单「静音 1 小时」「专注 25 分钟」；互动记忆（摸摸/喂食/逗猫棒/交谈/连续天数）。
- 职责通道 v1.1：lifeGate 闸门、延迟队列（≤8、去重、优先级、持久化）、`tianlightDuty.replay()` 回放、出站 `{type:"deferred"|"interrupt"(replayed)}`。

### 变更

- `src/40-companion.js`：图片/视频双渲染、媒体实时切换、6 项菜单换行、idle 自适应节能、职责通道 v1.1。
- `src/99-apply.js`：安装 life rhythm / glass depth / life settings；实例诊断 `life()`/`glass()`。
- `src/20-stylesheet.js`：视频形象、菜单换行、液态玻璃三档、角色设置页样式。
- 浏览器片段 22 → **24**；`BUILD`/`HOST_BUILD`/`package.json`/`skin.json` = **1.0.0**；静态链 build 24/24、test 67/67、structure/audit/check-css/verify/i18n-audit 全绿。

### 节能/稳定

- 生活定时器 30s、hidden 跳过；idle 低档降频；液态玻璃 off 时零合成层、低电量压平；状态写盘仅变化时；延迟队列有上限；新增监听器全部成对清理。

### 兼容性

- 支持范围不变：`>=0.2.0-rc.1 <0.3.0`（DSH 0.2.0 / 0.2.1 / 0.2.2 同一构建）；旧数据缺省兼容；无宿主协议变更。
- 已知边界：职责通道真实浏览器级验收受本会话沙箱限制（Edge Mojo 管道），harness 待非沙箱环境补跑；真实信号源采集仍属角色包/适配器后续工作。

## [0.7.0] - 2026-11-10

### 发布说明

- **职责通道（Duty Channel）**：新增浏览器半跨插件接口 `globalThis.tianlightDuty`（`send` / `subscribe` / `status` / `clear`，`version:1`）与 `document` 事件 `tianlight:duty`（入站）/ `tianlight:duty-action`（出站）。外部角色包/职责引擎可以在桌宠旁显示带选项按钮的职责气泡（`interrupt`）、普通短句（`speak`）或清理气泡（`clear`），并把用户选择（等会儿/静音 1 小时/休息时再说/额度）与 TTL 超时（`timeout`）回传。fail-closed 校验（类型/长度/数量）、`companion-off` 降级、气泡与普通台词 DOM 隔离、键盘可达、卸载还原上一实例 API。
- **只改浏览器半**：`lib/index.js` 宿主半与 `BUILD` 不变（仍 0.6.0），`HOST_BUILD` 保持 0.6.0 以通过握手；**升级后不需要重启 DSH Desktop**，Ctrl+F5 刷新页面即可。职责通道随「薄荷桌宠」模块启用/关闭而降级/恢复。
- 文档：[docs/DUTY-CHANNEL.md](docs/DUTY-CHANNEL.md)。角色包侧桥接与场景证明见 `rolepack/quiet-writing-companion/`（`docs/ROLEPACK-DUTY.md`、`docs/ADAPTERS.md` §3.5）。

### 变更

- `src/40-companion.js`：新增职责气泡 DOM/生命周期与 `installDutyChannel()` / `normalizeDutyAction()` / `dutyChannelStatus()`；`companionDutyBridge` 作为可切换模块的桥接持有者。
- `src/20-stylesheet.js`：职责气泡与选项按钮样式（`[data-tl-duty]`），复用现有 `--tl-*` 变量。
- 台词键（`duty.choice.*` / `duty.aria`，zh/en 成对）加在 `src/40-companion.js` 的 `registerTl5Strings` 内。
- `src/99-apply.js`：安装 `ui-skin-tianlight: duty channel`（在模块运行时之后），实例诊断新增 `duty()`。
- 版本：`package.json` / `skin.json` = **0.7.0**；静态链 build 22/22、test 67/67、structure/audit/check-css/verify/i18n-audit 全绿（i18n zh/en 860 键）。

### 兼容性

- 支持范围不变：`>=0.2.0-rc.1 <0.3.0`（同一份构建继续支持 DSH 0.2.0 / 0.2.1 / 0.2.2）。
- 旧客户端 × 新宿主、新客户端 × 旧宿主均不受影响（本版无宿主改动）。
- 已知边界：真实信号源采集（DSH session/审批 → 职责层事件）仍属职责层/适配器侧，不在本皮肤内；职责气泡目前由外部代码主动调用。

## [0.6.0] - 2026-11-10

### 发布说明

- v0.6.0: Wallpaper Engine library integration (new feature). (1) Host half vendors the MIT dsh-we-wallpaper 0.4.0 bridge: Steam/WE auto-detection (registry -> libraryfolders.vdf -> default paths, workshop 431960 + projects), pure-JS scene.pkg/TEX 4K static extraction, and the /api/we-wallpaper route family (list, preview, media with Range, pkg, web, diagnostics, optional scene-video; dsh-app origin allowed, cross-site rejected, id resolution via scan map + per-segment containment). _wallpapers now appends the auto-detected library items (we:<id>, kind/weType/weSource/title/url/preview/source) and _engines adds weLibrary{found,count,root} + capabilities.weLibrary; on this machine 38 items = 3 local + 35 Wallpaper Engine, 8/8 workshop scene.pkg decoded to 4K PNG/JPEG. (2) New 22nd client fragment src/72-we-library.js: DSH settings page '壁纸 / Wallpaper' (settings.section tianlight-wallpaper), a sidebar Settings function button (sidebar.footer.action), and a full-screen library overlay (z-index 2600) - auto-scanned preview grid with search, type filters, refresh, in-use highlight and click-to-apply for video/web/image and scene HD stills (pkg/ diagnostics->preview fallback), plus optional scene animated-cache generation (readable 503 when unsupported). The quick picker now shows engine items automatically (壁纸引擎 chip, previews, badges, scene static hint) and advanced Sources replaces the folder-path flow with an auto-detect row + 'Open library' button (manual path collapsed). (3) Licenses: dsh-we-wallpaper MIT + wcap Unlicense attribution in lib/we-wallpaper and docs/THIRD-PARTY.md. Verified: 4 runtimes 387/387 assertions (web 96/96 x3, Desktop 99/99), 0 console errors; Wallpaper Engine W self-check 23/23 on web and 23/23 on Desktop (slots registration, sidebar button, real host previews, real-mouse click-to-apply, overlay open/close, console clean); host real-machine routes 38/35 items and 4K scene extraction; static chain incl. 67 host tests and i18n audit green.

> 交付状态：代码已定稿——git `acb17a6`；`lib/client.js` **896,889 字符 / 930,994 字节 / 22 片段**；
> `BUILD`/`HOST_BUILD` = 0.6.0；静态链 build --check **22/22**、**test 67/67**、
> structure/audit/check-css/verify/i18n-audit 全绿。W 自检 v0.2.2 web **23/23**、v0.2.2 Desktop **23/23**；
> 4-runtime 全量矩阵见 `diag/skinlab/V060-VERDICT.md`（发布前以该文件为准）。tag 未切。

### 新增

- **Wallpaper Engine 库集成**：宿主半新增 `lib/we-wallpaper/host.mjs`（内嵌 MIT 的 dsh-we-wallpaper v0.4.0
  @ `61ccaa2`）——自动发现 Steam/WE 安装、扫描 `steamapps/workshop/content/431960` 与
  `projects/{myprojects,defaultprojects}`、纯 JS 解码 `scene.pkg`/TEX 出 4K 静态图；本机真实结果
  `_wallpapers` **38 = 本地 3 + WE 35**（workshop 16 / project 19；scene 22 / video 7 / web 3 / other 3；
  11 条中文标题），`_engines.weLibrary={found:true,count:35,root}` + `capabilities.weLibrary`，
  8/8 workshop 场景解出 4K（33MB `.pkg` → 4.4MB PNG，首次 78–1449ms/缓存 23ms）。
- **新路由前缀 `/api/we-wallpaper/*`**：`list`、`state`、`preview`、`media`（Range 206）、`pkg`、
  `web/<id>/<path>`、`diagnostics`、`scene-video/{generate,status,media}`；`dsh-app` 与本机 origin 放行、
  跨站 403、id 经扫描映射 + 逐段 containment。
- **客户端第 22 片段 `src/72-we-library.js`**：设置导航「壁纸 / Wallpaper」页（`settings.section`
  id `tianlight-wallpaper`）+ 侧栏 Settings 旁按钮（`sidebar.footer.action`）+ 全屏浮层
  （`z-index:2600`、×/Esc/mask、`tianlight:open-wallpaper-library` 事件入口）；预览网格/搜索/类型筛选/
  刷新/使用中/toast；点卡应用 video→media、image→media、web→网页、scene→pkg（无 pkg →
  diagnostics → preview 回退）；可选「生成动态」（真实 `{ok,status:{phase,progress,error}}` 轮询，503 可读）。
- **快捷选择器**：WE 卡片自动出现（「壁纸引擎 35」chip、预览优先、video/scene/web 徽标、场景「静态高清」提示）；
  高级 ① 新增自动检测行（总数 + Steam/project 拆分）+「打开壁纸库」，旧手动目录折叠为兜底。

### 变更

- 浏览器半 21 → **22 个片段**（新增 `72-we-library`）；宿主半新增 `lib/we-wallpaper/`（路由表 + 扫描/解码）；
  `build.mjs`/`structure`/`verify`/`pack`/`snapshot` 工具链同步。
- 纯逻辑回归测试 61 → **67 条**（+6 WE fixture；测试用 `TIANLIGHT_WE_DISABLE_SCENE_VIDEO=1` 跳过真实捕获）。
- `_wallpapers` 只在末尾追加、旧条目顺序/id 不变；`_engines` 只加字段；`capabilities.weLibrary` 是入口依据
  （**全部 additive**）；WE 未安装时 `{found:false,count:0}`。
- 新增第三方与许可说明：[docs/THIRD-PARTY.md](docs/THIRD-PARTY.md)（MIT dsh-we-wallpaper、Unlicense wcap、
  RePKG/WebWallGL MIT）；`lib/we-wallpaper/LICENSE` 与 `vendor/we-wallpaper/wcap/LICENSE` 随包分发。

### 兼容性

- 支持范围不变：`>=0.2.0-rc.1 <0.3.0`，同一份构建继续支持 DSH 0.2.0 / 0.2.1 / 0.2.2。
- **升级后必须重启 DSH 一次**（新增 host 路由），再 Ctrl+F5；场景动态缓存 **Windows-only**。
- 旧宿主 × 新客户端：WE 路由 404 → WE 页面提示「宿主半需重启/更新」，其它功能正常；
  **该组合未真机复验，标为已知边界**。
- 逐项细节与验证表：[docs/RELEASE-0.6.0.md](docs/RELEASE-0.6.0.md)；上一版 [docs/RELEASE-0.5.3.md](docs/RELEASE-0.5.3.md)。

## [0.5.3] - 2026-11-09

### 发布说明

- v0.5.3: wallpaper UX overhaul and self-check hardening (no new features). Fixes the reported symptoms: (1) 'wallpaper UI almost unresponsive' - real-mouse diagnosis found DSH product can leave an invisible full-viewport z-index:1000 modal mask swallowing clicks while keyboard works; skin overlays now sit above it (scrim 1290 / panel 1300 / handle 1310 / font 1320), proven with an injected stale mask; also C3 adaptive no longer false-freezes the 4K video wallpaper (focus/visibility gating, 5 consecutive low samples over 10s, 5-minute probe cooldown, transition-only logs), frame-cache misses no longer log 404s, audio warnings only on user gesture. (2) Wallpaper quick picker REDO - visual 2-column thumbnail grid, click any card to switch with toast + in-use chip; no file/URL/WE/GLSL import in the quick view (advanced '更多设置' only), edge handle and Alt+W open the picker. (3) 'language switching broken' - explicit zh/en now switches skin copy only (no DSH locale.setLocale side effect), auto follows DSH locale, instant re-render + persistence. (4) weather/smart context quality - safe OFF defaults (timeOfDay/focusLink/adaptive/weather), migration preserves existing choices, time-of-day brightness capped at 6% with impact readout + off button, weather folded into a collapsed experimental block with zero network while off and readable failure/retry, restore-defaults button. Verified: 4 runtimes 387/387 assertions (web 96/96 x3, Desktop 99/99), 0 console errors; real-mouse self-check 39/39 (picker/stale-mask/language/console/weather); old-host degradation 17/17.

> 交付状态：已整合并验证——git `73b378d`；`lib/client.js` **827,150 字符 / 859,341 字节 / 21 片段**；
> build --check 21/21；静态链（含 i18n-audit）全绿（test 61/61）。
> 运行时矩阵：**4/4 运行时 PASS，387/387 断言**（web 96/96 ×3 + Desktop 99/99；0 failed / 0 skipped /
> 0 console error）；真实鼠标 **P1–P5 39/39 PASS**；旧宿主降级 **17/17 PASS**。
> 证据 `diag/skinlab/V053-VERDICT.md`，详见 [docs/RELEASE-0.5.3.md](docs/RELEASE-0.5.3.md) §8。
> 本版**不含新功能**，是响应用户新反馈的大修版；fragment 数仍 21，无新增宿主路由；tag 未切。

### 修复

- **壁纸快捷选择重做**（用户明确要求）：pick 视图改为纯视觉缩略图网格（2 列大卡片、使用中高亮、点击立即切换 +
  toast）；**移除 pick 视图的上传/URL/WE/GLSL 导入与文件选择行**（只在「高级」保留）；面板头「更多设置」↔
  高级顶部「返回快捷选择」互切；边缘手柄 / Alt+W 默认打开快捷选择；卡片点击乐观高亮，失败回退并显示错误
  （壁纸模块关闭时提示去高级开启，不再静默无反应）。
- **整页点击无响应**：根因是 DSH 产品可能残留不可见全屏 modal mask（`position:fixed`、`z-index:1000`、
  `pointer-events:auto`）吞掉真实鼠标点击而键盘仍可用。修复：皮肤浮层抬到 **z-index 1290–1320**
  （scrim 1290 / 壁纸面板 1300 / 边缘手柄 1310 / 字体面板 1320），仍从 Desktop 标题栏下方开始、不遮应用菜单，
  保留 Alt+W/Esc/Tab 键盘路径；真实鼠标 P1–P5 **39/39 PASS**（详见 RELEASE §8）。用户若仍遇整页点不动：按 Esc/重启 DSH
  清理产品弹窗残留，再点面板右上「更多设置」。
- **C3 自适应误冻结**：live 控制台可见 `adaptive:video-static` / `adaptive:probe` / `adaptive:cleared` 循环
  （后台窗口低 FPS 被误判）。修复：默认关闭（新配置 `adaptive:false`，旧用户已持久化选择保留）；仅在页面可见
  且窗口聚焦时采样；连续 5 次低样本且跨度 ≥10s 才降档；降档后 5 分钟冷却；只在状态变化时记日志；
  重新聚焦/用户恢复立即清除；⑪ 增加「自动降档可能冻结动态壁纸」提示 + 锁定按钮。
- **语言切换**：显式「中文 / English」**只切皮肤文案，绝不调用 `locale.setLocale()`**，不再连带切换 DSH 界面语言
  （旧实现造成整页闪动/状态丢失/看起来“切不动”）；「跟随 DSH」仍订阅 `locale/change`；语言行提示更新；
  非 React 文案统一走 `data-tl-i18n-key` / `data-tl-i18n-title-key` 契约刷新（语言事件时刻扫描）。
- **天气 / 智能情境安全默认**：`timeOfDay` / `focusLink` / `adaptive` / `weather` 全部默认 OFF
  （已持久化合法选择保留，迁移安全）；C1 只做 |亮度影响| ≤6% 的小偏移并显示影响值 + 关闭按钮；
  C4 折叠进「实验性功能（需要联网，Electron 下可能受网络策略限制）」、默认关、零网络请求、失败可读 + 重试；
  ⑨ 增加「恢复默认」按钮。
- **控制台静音**：frame-cache miss 不再产生 404 控制台错误（未知 key 本地 miss，不探测；只有已捕获 key 才探测，
  改用 fetch + blob URL）；捕获延迟 2500ms 且仅可见/非低电量执行；`audio:system-failed` 只在用户触发时告警。

### 变更

- 版本 `0.5.3`（构建标记同步）；无新增宿主路由/选择器桥规则；新增本地键 `tianlight.cache.known`
  （已捕获帧缓存 key，本地数据、不参与宿主同步）。
- **行为变更**：皮肤语言不再联动 DSH 界面语言；C1/C2/C3/C4 默认 OFF。详见
  [docs/RELEASE-0.5.3.md](docs/RELEASE-0.5.3.md) §5–§6 与 [docs/COMPATIBILITY.md](docs/COMPATIBILITY.md) §2.3。

### 兼容性

- 支持范围不变：`>=0.2.0-rc.1 <0.3.0`，同一份构建继续支持 DSH 0.2.0 / 0.2.1 / 0.2.2。
- 语言/点击/默认值修复都是纯客户端逻辑，不改变 `_settings` 协议与宿主路由；旧宿主/旧 DSH 同样生效。
- 逐项细节与占位：[docs/RELEASE-0.5.3.md](docs/RELEASE-0.5.3.md)；上一版 [docs/RELEASE-0.5.2.md](docs/RELEASE-0.5.2.md)。

## [0.5.2] - 2026-11-09

### 发布说明

- v0.5.2: self-check hardening release (no new features). Fixes the reported symptoms: (1) settings data safety - host adoption no longer deletes local-only keys, pre-adoption backup tianlight.backup.host + recover button, full first-boot push with retry; (2) mixed zh/en copy - missing en keys for adaptive reasons, localized provider/layer/shader/audio/low-power strings, dynamic ctx/wp keys literalized, new tools/i18n-audit.mjs in the check chain; (3) panel UX - library loading state + retry, advanced-view hint, English label wrapping, localized low-power detail. Verified: 4 runtimes 387/387 assertions (web 96/96 x3, Desktop 99/99), 0 console errors; self-checks 7/7 mixed-language, 81/81 layout in zh+en at 4 viewports, 10/10 settings persistence incl. partial-host no-data-loss, old-host degradation 17/17.

> 交付状态：已整合并验证——git `fe32f7f`；`lib/client.js` **798,816 字符 / 829,659 字节 / 21 片段**；
> 静态链（含 `tools/i18n-audit.mjs`）全绿（build --check 21/21 / test 61/61 / structure --strict / audit /
> check-css / verify / i18n-audit；zh=787 / en=787，referenced 619，missing/only/en-CJK 均为 0）。
> 运行时矩阵：**4/4 运行时 PASS，387/387 断言**（web 96/96 ×3 + Desktop 99/99；0 failed / 0 skipped /
> 0 console error）；三类用户问题自检 **A 7/7、B 81/81、C 10/10**，Desktop 10/10，旧宿主降级 17/17。
> 证据 `diag/skinlab/V052-VERDICT.md`，详见 [docs/RELEASE-0.5.2.md](docs/RELEASE-0.5.2.md) §5.2。
> 本版**不含新功能**，只修用户反馈的三类问题（数据安全 / i18n / 面板体验）；fragment 数仍 21；tag 未切。

### 修复

- **设置/壁纸选择丢失、重启不恢复（数据安全，最严重）**：根因是 `applyHostSettings()` 在宿主 revision 更新时
  删除宿主快照里没有的本地 `tianlight.*` 键，宿主文件一旦不完整（首启/其它浏览器子集/推送失败）就清空用户设置。
  v0.5.2 改为：**宿主有的键按宿主落地、显式 `null` 墓碑仍删除、宿主没有的本地键保留并回推宿主**；
  采纳前把本地可同步键备份到 `tianlight.backup.host`（本地键，`tianlight.backup.` 前缀不参与宿主同步，256KB 上限）；
  ⑦ 工程新增「恢复宿主导入前备份」；bootstrap 首启全量推送、失败按需重试一次（1s，仅 network/5xx/超时）；
  `tl5Diag("settings")` 记录 `{localKeys, remoteKeys, pushedKeys, pushRetried}`。
  平台级证据：首启 6 键全量推送、二次加载不重复推、宿主子集 revision 更高时本地 6/6 保留并回推（备份 451B）、
  null 墓碑仍删除、PUT 失败重试后成功、恢复 1 项。
- **语言/文案中英混杂**：`engine.adaptive.staticReason/fpsReason` 缺 en（回退中文）；`30-wallpaper.js` 的
  provider/layer/shader 提示与 `55-lowpower.js` 的低电量 detail、音频 stop 直出中文；`ctx.*` 动态拼接绕过审计；
  `12-schema` 的 `settings.*` 只能运行时注册。修复：补齐 en/zh key；30 全面 getter 化（渲染时翻译、完整字面量
  key 映射）；55 结构化 `detailKey`/`detailParams`；35/70 动态拼接改字面量；13-i18n 工厂期注册 schema 字典。
  新增 `tools/i18n-audit.mjs`（缺 key / 仅一种语言 / en 混中文即红；zh 纯英文为报告项）并纳入 `npm run check` 与 CI。
- **面板/分区错位、重叠、被裁切或打不开**：首次打开清单加「加载中…」态，失败先 1.2s 静默重试一次，两次失败才
  显示错误 + 行内「重试」；pick 视图加「更多设置在右上『高级』」提示；英文长标签允许换行兜底；低电量 detail
  本地化。布局自检：4 视口（1292×826@2 / 1406×803 / 1024×700 / 900×650）+ Desktop 标题栏下 7 个扩展分区
  全部可展开、无重叠/裁切/横向溢出（B/B2 **81/81 断言**，zh+en × 4 视口；Desktop **10/10**）。

### 变更

- 新增工具 `tools/i18n-audit.mjs`；`npm run check` 增加 i18n-audit 步骤；CI（Node 20/22）增加 `i18n audit`。
- 新增本地专用备份键 `tianlight.backup.host`（不参与宿主同步）；⑦ 工程新增备份状态与「恢复宿主导入前备份」。
- 无新增宿主路由、不改选择器桥；宿主 build 标记 0.5.1 → 0.5.2（只刷新浏览器时仍有重启提示，功能不受影响）。

### 兼容性

- 支持范围不变：`>=0.2.0-rc.1 <0.3.0`，同一份构建继续支持 DSH 0.2.0 / 0.2.1 / 0.2.2。
- 数据安全修复是纯客户端逻辑，不改变 `_settings` 协议与设置键名；旧宿主/旧版本 DSH 同样生效。
- 备份键是本地数据：每台机器独立、不随宿主同步；恢复只覆盖备份内的键。
- 逐项细节与占位：[docs/RELEASE-0.5.2.md](docs/RELEASE-0.5.2.md)；上一版 [docs/RELEASE-0.5.1.md](docs/RELEASE-0.5.1.md)。

## [0.5.1] - 2026-11-09

### 发布说明

- v0.5.1: complete the v0.5.0 outline with C4 weather (optional, default off, keyless Open-Meteo, silent, ambience-only) inside the context panel; A2 Now Playing drives a real audio-level beat; companion speech now re-translates live on language switch; removed cosmetic rheostat render warnings; compact engine summary + web-wallpaper pause hint. Same build passes DSH 0.2.0/0.2.1/0.2.2: 387/387 runtime assertions (web 96/96 x3, Desktop 99/99), 0 console errors; old-host degradation 17/17.

> 交付状态：已整合（git `7282d94`；`lib/client.js` 768,962 字符 / 796,478 字节 / 21 片段；静态链全 PASS，test 61/61）。
> 运行时矩阵已判定：**4 个运行时 387/387 断言 PASS**（web 96/96 ×3 + Desktop 99/99；0 failed / 0 skipped /
> 0 console error），旧宿主 × 新客户端降级 **17/17 PASS**；证据 `diag/skinlab/V051-VERDICT.md`，详见
> [docs/RELEASE-0.5.1.md](docs/RELEASE-0.5.1.md) §8。v0.5.0 的 4 运行时判定（323/323）与旧宿主降级 17/17 仍然有效。

### 新增

- **C4 天气联动**（v0.5.0 未纳入 → v0.5.1 实现，**默认关**）：独立 `tianlight.weather` 持久化模型
  （`enabled/provider/city/latitude/longitude/intervalMin/last/lastError`），使用 **Open-Meteo 公共接口（免 API key）**：
  - 位置：城市解析（geocoding，count=1、中文）、手动经纬度（纬度 -90..90 / 经度 -180..180）、
    **仅点击触发的“使用当前位置”**（`navigator.geolocation`，绝不自动弹权限）；
  - 请求：仅显式启用且已定位才请求；15/30/60/120 分钟轮询（默认 30）；页面隐藏跳过、恢复可见立即刷新；
    8s 超时（AbortController）；单次失败最多 60s 后重试一次；失败全静默并保留上次观测；关闭时零请求/零定时器；
  - 映射：WMO 天气码 → `effectsController.ambience` 一个字段（雨类 `rain` 0.55 / 雪类 `snow` 0.5 /
    晴且白天 `spots` 0.2 / 其它 `none`），不碰壁纸、叠加层、玻璃；
  - 面板：C4 块在 ⑨ 情境分区内（不新增分区）；与 C1 同时开启时最后写入者为准，面板有冲突提示。

### 修复 / 打磨

- **A2 真实节拍**：系统音频回环激活时，⑩ 的两个节拍点由真实 analyser 电平驱动（`window.setInterval` ~10Hz，非 rAF）；
  回环关闭回到装饰性播放脉冲；低功耗/`prefers-reduced-motion` 冻结；interval 清理，无新增全局监听器。
- **同伴英文台词**：台词改为持有 i18n key、显示时翻译；语言切换时正在显示的气泡即时重译；菜单/aria 全双语
  （修 v0.5.0 英文模式下气泡残留中文的问题）。
- **删除 cosmetic 警告**：移除 `[ui-skin-tianlight] rheostat:render Object` 调试日志（v0.5.0 每运行时 4–6 条 → 0）。
- **引擎分区 UI**：摘要改紧凑短格式（`缓存 {hit}/{miss} · {自适应状态}`，不再省略号截断），完整缓存/自适应信息留在展开区；
  网页壁纸增加「暂停会卸载沙箱页面（项目内状态重置）」提示与截断的工程 URL（仅 `kind=web` 显示）。
- **测试/校验**：`tools/test.mjs` 的 build 握手断言改为从 `package.json` 读取版本（版本自增不会让旧断言失败）；
  `tools/verify.mjs` 更新为 0.5.1。

### 兼容性

- 支持范围不变：`>=0.2.0-rc.1 <0.3.0`，同一份构建继续支持 DSH 0.2.0 / 0.2.1 / 0.2.2；
  v0.5.1 **没有新增宿主路由、没有改选择器桥**（C4 只用标准 `fetch`）。
- **唯一可选联网**是 C4 天气：默认关、零请求；开启且定位后只请求 Open-Meteo（免 key、无账号、无遥测，
  只发送城市名/坐标）；无 SLA，失败静默降级。
- 宿主 build 标记 0.5.0 → 0.5.1：只刷新浏览器时面板会提示「宿主半待重启 DSH」（功能不受影响），重启一次消除提示。
- 逐项功能状态：[docs/V050-FEATURES.md](docs/V050-FEATURES.md) 的 C4 行已更新为「实现（v0.5.1）」；
  本版细节与剩余验证占位见 [docs/RELEASE-0.5.1.md](docs/RELEASE-0.5.1.md)。

## [0.5.0] - 2026-11-09

### 发布说明

- v0.5.0: modular workbench release - host settings sync + schema migration + module switches + render budget (P0), library v2/bundles/share links/typography (P1), time-of-day/focus/adaptive performance/readability (P2), parallax/click/ambience/transitions (P3), system audio/Now Playing/web wallpapers/dynamic resolution/frame cache/optional transcode (P4), keyboard a11y + zh/en i18n. Same build passes DSH 0.2.0/0.2.1/0.2.2 (323/323 runtime assertions, 0 console errors); old-host degradation 17/17.

> 交付状态：已整合并验证（git `72d72fe`；`lib/client.js` 724,684 字符 / 750,666 字节 / 21 片段；静态链全 PASS，test 61/61）。
> 运行时矩阵 **4/4 运行时 PASS（323/323 断言，0 failed / 0 skipped / 0 console error；web 80/80 ×3 + Desktop 83/83）**，
> 旧宿主 × 新客户端降级 **17/17 PASS**；证据 `diag/skinlab/V050-VERDICT.md`，详见
> [docs/RELEASE-0.5.0.md](docs/RELEASE-0.5.0.md) §4；逐项状态与残余风险见 [docs/V050-FEATURES.md](docs/V050-FEATURES.md) 与 RELEASE §9。

主题：在 v0.4.0「一份构建适配 DSH 0.2.0 / 0.2.1 / 0.2.2」的基础上，把皮肤扩展成一套**可开关、可观测、可回滚**的工作台。新增功能全部只依赖三条运行时线共有的稳定钩子，不写 DSH 构建哈希、不加版本分支。

### 新增

- **P0 工程地基**
  - E1 宿主配置同步：`GET/PUT /skin-tianlight/_settings` 把 `tianlight.*` / `dsh-tianlight:*` 设置存到插件目录 `state/settings.json`，跨浏览器一致；宿主不可用时自动退化为纯 localStorage 模式，不阻塞皮肤加载。
  - E2 schema 迁移：首次启动把 v0.4.0 及更早的存储键归一化到 schema v5，迁移前原始值备份到 `tianlight.backup.v5`；迁移失败只记录、不抛错。
  - E3 多窗口一致：BroadcastChannel + `storage` 事件同步同浏览器多窗口，最后写入者为准。
  - E4 工程面板（⑦）：语言开关（跟随 DSH / 中文 / English）、宿主/本地状态与配置版本、schema 迁移报告、模块开关、渲染预算只读指标（fps/抖动/档位/省电原因/缓存命中/特效开销）、诊断信息。
  - E6 CI：`.github/workflows/check.yml` 在 Node 20 与 Node 22 上无依赖执行完整静态链（build --check / test / structure --strict / audit / check-css / verify）；tag 推送额外校验 tag 与 `package.json` 版本一致并产出 `pack.mjs` 分发包 artifact。
  - 渲染预算：各新功能共享 `TL5_METRICS` 只读指标总线，面板只读展示，不做二次决策。
- **P1 数据与内容**
  - D1 壁纸库 v2：排序（名称/类型/最近使用/收藏优先）、标签 facet 多选、隐藏/收藏计数、空状态可复位；轮播「只轮播收藏」与同一份收藏数据一致。
  - D2 导入/导出包：`GET /_bundle` 流式导出 `manifest.json` + 设置 + 配方 + 壁纸；`POST /_import` 校验后原子导入；面板显示导入/跳过数量，设置写入宿主后刷新页面统一生效，失败不丢当前配置。
  - D3 配方分享链接：配方 JSON（`tianlight-recipe` v2）base64url 编码进 `#tl=…`；打开面板时检测、确认后才应用；非法链接只清 hash，不改设置。
  - D4 排版增强：内容最大宽度、段距、代码字号、阅读字体（系统/衬线），只作用于消息内容与代码块，不改应用骨架；旧排版存储值继续可读。
- **P2 情境与可读性**
  - C1 时段自适应：按本地时钟切换 dawn/day/dusk/night 外观（叠加层/玻璃/氛围/画面压暗），不换用户壁纸；手动时段优先。
  - C2 专注联动：检测 `[data-chat-running]`，生成中压暗+模糊场景，结束恢复；有独立开关，不覆盖手动暂停。
  - C3 性能自适应 v2：按实测帧率/抖动自动降档（着色器 60→30→15、视频→静态帧），原因可读、可锁定；不覆盖省电监管。
  - D5 可读性护栏：面板打开/壁纸变化时采样壁纸亮度与面板对比度，不足时只提亮面板底色与文字阴影（不改壁纸），阈值可配。
- **P3 特效与氛围**
  - B1 鼠标视差：场景层随指针轻微位移，幅度可调，默认关，低功耗/掉帧自动禁用。
  - B2 点击特效：点击处水波纹/火花，单层 canvas、30fps 上限、可关、掉帧自动关。
  - B3 氛围层：雨/雪/光斑，低帧率粒子场，省电/减少动效时冻结，与叠加层互不覆盖。
  - B4 转场：fade/slide/zoom/dissolve + 时长，切源保持音频状态；用上一帧快照做交叉过渡，不黑屏。
- **P4 壁纸引擎**
  - A1 系统音频回环：用户手势后 `getDisplayMedia({audio:true, video:true})`（只保留音轨），只做实时 AnalyserNode 分析（不录音、不上传），驱动音频响应着色器 `u_audio`；不支持/被拒/无设备三种状态可读。
  - A2 Now Playing：读取 MediaSession 元数据，拿不到就静默隐藏。
  - A3 网页壁纸：`kind="web"` 的 Web 项目经 opaque-origin 沙箱 iframe 渲染，失败回落上一张可播壁纸。
  - A4 动态分辨率：同一素材的 1080/1440/4K 变体按窗口宽 × DPR 自动选择，resize 防抖后交叉淡入切换。
  - A5 预裁剪缓存：可解码帧按窗口比例裁剪并写入宿主 `state/frame-cache/`，命中/未命中可观测；首屏用缓存图垫底。
  - A6 可选转码：检测本机 ffmpeg（缺失时隐藏入口），HEVC→H.264、GIF→MP4，输出 `assets/derived/`，不覆盖源文件。
- **其它**
  - D6 键盘与无障碍：面板/字体面板焦点陷阱、打开聚焦与关闭归还、`role="dialog"`/`aria-modal`、直播区播报、快捷键集中注册（Alt+W / Esc 保持）。
  - D7 zh/en 双语：接入 DSH locale 服务，语言切换无需刷新；显式选中文/English 时同步切换 DSH 语言；locale 服务缺席时退化为浏览器语言。本轮完成 322 处字面量转换、342 个 `lib.*` key，中文文案字节不变、代码层 0 处硬编码中文字面量。
  - E5 发布工具：`node tools/release.mjs` 一条命令完成版本自增 → 静态检查链 → 快照 → CHANGELOG → 提交 → 注记 tag，并打印回滚步骤；拒绝脏工作树、拒绝重复 tag、不联网。

### 变更

- `apply()` 支持异步：先 await 宿主设置引导（带超时），再按「常驻核心 → 模块运行时」顺序安装；设置服务不可用时退化本地模式，绝不阻塞皮肤出现。
- 壁纸面板在 ①–⑥ 之后新增扩展分区 ⑦–⑪（工程、特效与氛围、智能情境、音频与 Now Playing、库/包与分享），由注册表按 order 渲染，新增功能不再抢改同一个文件。
- 模块开关（壁纸/特效/情境/音频/桌宠/推理滑杆/排版可关；面板/取景/可读性护栏常驻）关闭时调用 disposer：对应 DOM、监听器、定时器全部移除，再打开重新安装。
- 样式改为「主表 + 各片段 `registerTl5Css` 块」拼成同一个 `<style>`，全部以 `body[data-dsh-tianlight]` 作用域开头。
- 宿主半新增 `lib/settings-store.js` / `bundle.js` / `media-cache.js` / `transcode.js` / `web-project.js`；`_engines` 追加 ffmpeg/缓存/设置 revision/能力清单。
- 快照与恢复扩展到 v0.5.0 宿主模块（`settings-store` / `bundle` / `media-cache` / `transcode` / `web-project`）。
- 已知取舍不变：设置面板不做实时背景模糊；面板取色仍只在打开时采样一次；新特效不做全屏 60Hz canvas。

### 兼容性

- 支持范围不变：`>=0.2.0-rc.1 <0.3.0`，同一份构建支持 DSH 0.2.0 / 0.2.1 / 0.2.2，不写构建哈希、不加版本分支。
- 新增功能只依赖三条线共有的稳定钩子：`[data-chat-running]`（C2）、locale 服务（D7）、既有选择器桥（不改）；宿主新路由在旧宿主上返回 404 时逐个静默降级（设置本地模式、包/分享/缓存/转码/网页壁纸入口自动隐藏）。
- 宿主半有变更：更新后需**重启一次 DSH**；只更新浏览器半仍可 Ctrl+F5。详见 `docs/RELEASE-0.5.0.md`。
- C4 天气联动本版**未纳入**——这是范围决定而不是缺陷（可选能力、默认关、需要外部 API key 与联网）。
  `A1` 系统音频回环依赖 `getDisplayMedia` 的浏览器/系统实现，`A6` 转码依赖本机 ffmpeg，均在缺失时降级。
- 已知取舍：A2 只读 MediaSession 元数据（装饰性脉冲，非真实节拍分析）；A3 网页壁纸暂停时卸载 iframe，项目内部状态会丢失；A4 动态分辨率依赖文件名约定；A5 缓存是 best-effort、可清空；C3 降档采样较粗（约 2s，静态帧后 60s 再探测）；面板扩展分区只在「高级」视图显示（pick 视图隐藏）；D2 导入的设置刷新后统一生效。
- 运行时矩阵与验证证据：4 个运行时 323/323 断言 PASS + 旧宿主降级 17/17 PASS（`diag/skinlab/V050-VERDICT.md`）；详见 `docs/RELEASE-0.5.0.md` §4 与 `docs/COMPATIBILITY.md` §3.2；已接受残余风险见 RELEASE §9。

## [0.4.0] - 2026-11-09

### 新增

- 同一份构建支持 **DSH 0.2.0 / 0.2.1 / 0.2.2** 三条运行时线：0.2.0-rc.2 / 0.2.1-rc.5 / 0.2.2-rc.1 三个 `dsh web` 运行时逐个实测（客户端应用、host 单例、面板、0 console error），Desktop 0.2.2-rc.1 真机复验。
- 新增 `tools/compat-matrix.mjs`：一次扫描任意多份 DSH 安装，逐版输出命中钩子层与 `COMPATIBLE / INCOMPATIBLE` 判定。
- 新增运行时诊断 `__dshTianlightInstance.features`（懒计算）：报告当前 DSH 实际渲染的槽位/数据属性/类名形状，便于一条命令定位「某版本样式不生效」。
- `skin.json` 增加 `dshCompatibilityRange` 与 `dshCompatibilityTested`（skin-manager 只读单串并安全忽略未知字段）。
- 文档：`docs/COMPATIBILITY.md`、`docs/RELEASE-0.4.0.md`。

### 修复

- 0.2.2 新增的 `data-message-bubble` 由选择器桥接支持；0.2.0/0.2.1 继续由 `_bubble` 段兜底。
- 宿主 build 握手与「需重启 DSH」提示沿用 v0.3.0 机制。

## [0.3.0] - 2026-11-09

针对「皮肤不适配当前 DSH」「界面重复堆叠、壁纸界面功能错误未响应」的彻底重做，基线为 DSH Desktop 0.2.1-rc.3。

### 新增

- 桌面标题栏 40px 安全区：面板/遮罩/把手/字体面板从标题栏下方开始，不再被桌面菜单层（z-index 1100）盖住。
- 面板每次打开重挂载：不再卡在「WE 0 张」空筛选，空筛选提供「查看全部壁纸」出口，计数改为「可见 / 全部 张」。
- 选择器桥改为「Slot 契约 → 产品 `data-*` → 类名分段名」分层发现，只标记最外层同类节点；模型胶囊 8 层→1 层，菜单/气泡各 1 层。
- 单例热重载清理：`globalThis.__dshTianlightInstance.dispose()` 优先熔断旧 cordis fiber 并清理 slot 注册，不再出现第二只猫/第二个滑杆。
- 面板填充可读性下限（≥0.96），玻璃倍率调低时不再透出侧栏文字。
- Esc 关闭面板；简单视图保留收藏/显示隐藏入口；底部安全区。
- 宿主半加固：`_we-roots` 只收 JSON 与绝对路径、超限 413；`_engines` build 握手；上传同名并发原子占位。

### 修复

- 删除按选择器删 DOM 的旧幂等守卫（含错误的 `[data-tl-companion]` 选择器）。
- 删除重复的 composer/settings/sidebar CSS 死规则；补 0.2.1 的 `data-slot` 槽位钩子。

### 验证

- 隔离 DSH 实例 + Edge CDP 14/14 断言；`npm run check` 全 PASS；真实窗口截图复验。详见 `docs/RELEASE-0.3.0.md`。

## [0.2.1] - 2026-10-29

- 适配 DSH 0.2.1：停止把右侧 dock 面板误标为设置面板，增加超大盖章保护；按 DSH 0.2.1 构建选择器重映射输入卡玻璃、设置面板、侧栏、模型胶囊与消息气泡。
- 过渡到「运行时选择器桥」：不再依赖构建哈希，rc.4/rc.5/alpha.2 钩子预检通过。

## [0.2.0] - 2026-10-28

- 皮肤拆分为 `src/` 多片段 + `tools/build.mjs` 构建单文件 `lib/client.js`；CSS 零哈希依赖。
- 播放稳定（P0）：播放状态总线 + 单入口 `attemptPlay()`、手势解锁、看门狗、静态帧垫底、暗化层。
- 壁纸库与轮播（P1）、WebWallGL 场景通道（P3，可选 vendor）。
