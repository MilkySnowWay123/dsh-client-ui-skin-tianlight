# 天光皮肤 × DSH 0.3.0：宿主契约触点盘点（0.3 暂不支持；资料保留，放开前先验证）

- 盘点对象：本仓库当前工作树（`src/*.js` 片段（按 `tools/build.mjs` 的 FRAGMENTS 顺序拼接）→ `lib/client.js` 浏览器半；`lib/index.js` + `lib/routes/*` 宿主半）。
- 实测宿主：DSH **0.2.2-rc.3**（Desktop，asar `D:\dsh\resources\app.asar`）。0.3.0 未发布（`latest=0.2.2-rc.1`、`next=0.2.2-rc.3`），故「0.3.0 风险」列**全部是推理，不是实测**。
- 证据口径：`文件:行` 指本仓库；`asar:…` 指 0.2.2-rc.3 安装包内路径；写「仅代码推断」= 无安装包级证据。
- 降级口径：**fail-soft** = try/catch / 可选查询 / 缺失即跳过；**fail-hard** = 直接抛错（全仓只有 §6 两处）。

## 结论摘要

1. **硬风险（整包不出现）**：`window.__ModuleLoader__.load({id,factory})`（§6-1）若改契约，皮肤客户端在 ESM 顶层直接 ReferenceError，无任何 try/catch——壁纸/玻璃/桌宠全无。
2. **硬风险（功能级全灭）**：宿主 `webServer.register({kind:'prefix',path,handler})` 走的是**遗留 `handler` 分支**（§6-4）；0.2.2-rc.3 官方包已统一改用 Fetch 风格 `resource`，该分支一旦在 0.3.0 删除，18 条精确路由 + 5 条前缀 + 资源兜底全 404。**不能靠"再挂一个 resource"兜底**（会让写路由全 405，见 §6.1），只能整包改 Fetch 语义。
3. **门禁现状（2026-11-16 决定）**：0.3 预适配已**撤回**，engines.dsh / 两个 optional peer / skin.json.dshCompatibilityRange 都回到 <0.3.0-0，0.3.x 会被 DSH 门禁拦下（跳过整层）。本文与清单**保留**：放开 0.3 前必须先拿到真实 0.3 build，按第 6 节清单全绿后再在同一次改动里放开范围并登记 dshCompatibilityTested。
4. **中风险（静默）**：DOM 钩子层（`data-slot` / `data-composer-card` / `data-sidebar-collapsed` / `_newSession` 等）在 0.2.2-rc.3 全部真实存在；0.3.0 改名或改 shadow DOM 时桥**零命中且不报错**——壁纸在、玻璃全无。
5. **中风险（认知纠正）**：皮肤**不是**「不注册 slot」——它注册 4 处：`conversation.input.right`×2（推理滑杆、字体按钮）、`settings.section` 与 `sidebar.footer.action`（WE 壁纸库）。
6. **软风险**：`locale` / `theme` / `slots` / `remote.session` / `remote.llm` / `uiWorkspace` / `llm` / `agentDefaultModel` / `profileContext` 全部已包 try/catch + 存在性探测，缺一个只丢一个功能；`--dsw-*` token 改名只丢对应那层样式。

## 1. 标题栏 / 窗口 chrome

| 触点 | 类型 | 证据(文件:行) | 0.2.2-rc.3 状态 | 挂掉后果 | 现有降级 | 0.3.0 风险 | 验证方法 |
|---|---|---|---|---|---|---|---|
| `html[data-windows-titlebar]` | 产品 data-attr | `src/20-stylesheet.js:638-649`、`src/65-bridge.js:373` | 存在（asar:`dsh-client-ui-layout` 与 `lib/preload-app.cjs` 均写该属性） | 壁纸/字体面板上沿回到 0，盖住 40px 标题条 | fail-soft（纯 CSS，选择器不匹配即不生效） | 中：改名则全部 `top` 补偿失效 | `document.documentElement.hasAttribute('data-windows-titlebar')` |
| `--dsh-windows-titlebar-height`（40px） | CSS 变量（消费） | `src/20-stylesheet.js:639,642,646,649,2947` | 存在（asar:`lib/preload-app.cjs` + `dsh-client-ui-layout`） | 同上，偏移量退化成常量 | fail-soft（5 处全带 fallback 40/48px） | 软：删了只是错位 0–40px | `getComputedStyle(document.documentElement).getPropertyValue('--dsh-windows-titlebar-height')` |
| `--dsw-*` 产品 token 覆盖（50 个 token / 85 处赋值，明暗两套） | CSS 变量（覆盖） | `src/20-stylesheet.js:49-170`；字体侧 `90-font.js:246-247,278-280` | 存在（asar:`--dsw-alias-label-primary` 见 192 个文件、`--dsw-alias-bg-base` 见 48 个文件，含 `dsh-client-ui-theme` 与 shell CSS；0.2.2 已删过 `--dsw-hovercard-bg` 等） | 该 token 对应的那一层玻璃/边框/字色回落到产品值——局部「没样式」，无报错 | fail-soft（未匹配的 token 赋值是惰性 no-op） | 中：每版都在增删 token，属常态化静默漂移 | `getComputedStyle(document.body).getPropertyValue('--dsw-alias-label-primary')` 应为 `#0f2438` |
| `--dsh-frame-top-clearance` | CSS 变量 | `src/20-stylesheet.js:2947` | 存在（asar:`dsh-client-ui-layout`） | 天气 chip 回到 48px 常量位置 | fail-soft（fallback 48px） | 软 | `getComputedStyle(document.querySelector('[data-tl-weather-chip]')).top` |
| 窗口拖拽区域（皮肤**不声明** `data-window-drag*`，仅自己的 chip 写 `-webkit-app-region:no-drag`） | CSS/壳行为 | `src/20-stylesheet.js:2967`；全仓无 `data-window-drag` 命中 | 存在（asar:shell 有 `data-window-drag`/`stopDragRecall`；`dsh/docs/upgrade-guide/v0.2.2-rc.1/window-drag-regions` 明写「仅 macOS，Web/Windows 不变」） | 若规则扩到全平台：皮肤浮层（splash / wall-handle / 字体面板 / 中枢）压住标题条会挡拖动 | fail-soft（纯 CSS） | 中：当前只影响 macOS；扩到 Windows 才成问题 | Windows 上拖标题条 40px 空白区应能拖窗 |
| 开机短片按产品 DOM 取样（`aside/nav/textarea/header`）画分镜 | DOM 启发式 | `src/59b-splash-film.js:687-691` | 仅代码推断（asar 里 `contenteditable` 编辑器确实在 `dsh-client-ui-conversation`，但「在 composer 内部」未逐项核） | 分镜里输入框/侧栏高亮错位 | fail-soft（`panelElement()` 找不到就跳过，`:694-703`） | 软：只影响开机 1.8s 的视觉 | 看开机动画高亮框是否落在真输入框上 |
| `#root` 挂载点 id（桌宠塞进 `#root` 共享层叠上下文；字重/行高 inline 写在 `#root`；splash 模糊目标） | DOM id | `src/40-companion.js:1353`、`src/90-font.js:253,287`、`src/59-splash.js:611`、`src/20-stylesheet.js:3709` | 存在（asar:`dsh-web-frontend/dist/index.html` 有 `<div id="root"></div>`） | 桌宠浮到弹窗之上；字重/行高失效；片尾不模糊产品 | 桌宠 fail-soft（`?? document.body`）；另两处 `if (root !== null)` 跳过 | 中：改 id 或 shadow DOM 化 → 桌宠层级永远在最上 | `document.getElementById('root') !== null` |

## 2. 会话列表 / 侧栏

| 触点 | 类型 | 证据(文件:行) | 0.2.2-rc.3 状态 | 挂掉后果 | 现有降级 | 0.3.0 风险 | 验证方法 |
|---|---|---|---|---|---|---|---|
| `[data-slot="sidebar"]` → `data-tl-sidebar-col` | Slot 契约 | `src/65-bridge.js:136,145,178` | 存在（asar:`dsh-client-ui-renderer` 渲染 `<div data-slot={slotKey}>`；`sidebar` 在 116 槽契约表内） | 左栏失去玻璃底/字色/悬停 | fail-soft（未命中即跳过；整桥在 `install()` 的 try/catch 内，`src/99-apply.js:148-186`） | 中 | `!!document.querySelector('[data-slot="sidebar"]')` 且 `__dshTianlightInstance.features.slotMarkers` 为 true |
| `[data-sidebar-collapsed]` → `data-tl-sidebar` | 产品 data-attr | `src/65-bridge.js:146,179` | 存在（asar:`dsh-client-ui-layout` 的 `frame[data-sidebar-collapsed]`） | 侧栏收起态整栏玻璃失效 | fail-soft | 中 | `document.querySelectorAll('[data-sidebar-collapsed]').length` |
| `[class*='_sidebarCol']` → `data-tl-sidebar-col` | 类名子串 | `src/65-bridge.js:150,183` | 存在（asar:`dsh-client-ui-layout` 内 10 处 `_sidebarCol`） | 兜底链断一层（slot 层仍可覆盖） | fail-soft | 软 | `document.querySelectorAll('[class*="_sidebarCol"]').length` |
| `[class*='_newSession']` + `tagName==='BUTTON'` → `data-tl-new-chat` | 类名段 | `src/65-bridge.js:130-133,171,189`；样式 `src/20-stylesheet.js:2897-2933` | 存在（asar:`dsh-client-ui-sidebar` 内 38 处 `_newSession`） | 新建会话按钮在壁纸上变成不透明色块 | fail-soft | 中：若渲染成 `<a>`/`<div>`，`BUTTON` 守卫会挡掉这条 | `document.querySelectorAll('[data-tl-new-chat]').length`（展开/收起各 1） |
| `data-message-bubble` → `data-tl-bubble` | 产品 data-attr | `src/65-bridge.js:110,181` | 存在但**全 asar 仅 1 处**（asar:`dsh-client-ui-chat` 用户气泡） | 用户侧气泡玻璃丢失 | fail-soft（`_bubble` 段兜底） | 中：单点钩子 | 发一条消息后 `document.querySelectorAll('[data-tl-bubble]').length` > 0 |
| `data-trigger-menu` → `data-tl-menu` | 产品 data-attr | `src/65-bridge.js:111,182` | 存在（asar:`dsh-client-ui-input-trigger` 1 处） | 输入框浮层菜单失去玻璃 | fail-soft（`_menu` 段兜底） | 中 | 输入 `@` 开菜单后 `document.querySelectorAll('[data-tl-menu]').length` |
| 桥的扫描根 = `document.body` 子树 | 观察面 | `src/65-bridge.js:322-323` | 存在（asar:`dist/index.html` 为 `body > #root`） | 若 0.3.0 用 shadow root，`querySelectorAll` 穿不透 → 一切 `data-tl-*` 零命中（壁纸在、玻璃全无、无报错） | fail-soft（观察器照跑，只是永不命中） | 中（静默，最难排查） | `__dshTianlightInstance.features` 全 false + `document.querySelectorAll('[data-tl-sidebar-col],[data-tl-composer]').length === 0` |
| `sidebar.workspaces`、`sidebar.session.row.*` 槽 | Slot（**未使用**） | 全仓 grep 无命中；对照 asar 116 槽契约表 | 存在但皮肤不注册、不监听 | 无 | 不适用 | 无 | 无需验证（记录：0.3.0 动这些槽不影响本皮肤） |

## 3. 输入框 / composer

| 触点 | 类型 | 证据(文件:行) | 0.2.2-rc.3 状态 | 挂掉后果 | 现有降级 | 0.3.0 风险 | 验证方法 |
|---|---|---|---|---|---|---|---|
| `[data-composer-card]` → `data-tl-composer` | 产品 data-attr | `src/65-bridge.js:154,180` | 存在（asar:`dsh-client-ui-conversation` InputBar 上 `"data-composer-card":true`） | 输入卡失去毛玻璃，壁纸直接透到正文 | fail-soft | 中 | `!!document.querySelector('[data-composer-card]')` 且 `[data-tl-composer].length===1` |
| `_card` 段 + 内含编辑器 + 非超大 → 兜底 `data-tl-composer` | 类名段 | `src/65-bridge.js:112-115,155,184` | 仅当文档无 `data-composer-card` 时启用；0.2.2 上属**未启用**（不是不存在） | 兜底链失效 | fail-soft（`markOutermost` + `isOversized` 双保险） | 软 | 仅旧宿主有意义 |
| `[data-slot="conversation.input.model"]`（模型胶囊作用域） | Slot 契约 | `src/65-bridge.js:197,209,228,367` | 存在（116 槽契约表：`conversation.input.model` single/session，被 `dsh-client-ui-model-selection` 占用） | 胶囊失玻璃；作用域退化到整张 composer card（权限选择器可能被一起上样式） | fail-soft（`readModelScope()` 回退 `[data-composer-card]`） | 中 | `!!document.querySelector('[data-slot="conversation.input.model"]')` |
| `_trigger` / `_triggerLabel` / `_triggerEffort`（作用域内） | 类名段 | `src/65-bridge.js:158-164`；样式 `src/20-stylesheet.js:256-273` | 存在（asar:`dsh-client-ui-model-selection` 各 3 处） | 胶囊文字/档位标签不再被接管 | fail-soft | 中 | `[data-tl-model]`、`[data-tl-model-label]`、`[data-tl-model-effort]` 各 ≥1 |
| `_mask` 内 `_panel` → `data-tl-settings` | 类名段 | `src/65-bridge.js:120-124,165` | **几乎不命中**（0.2.2 设置改右侧面板；asar 里 `_mask_` 只在 shell 旧样式） | 无（本来就不命中） | fail-soft（`isOversized` 面积保险） | 无，但需防回归：若 0.3.0 换回 mask 结构会重演 2026-10-30「巨型色块」 | `document.querySelectorAll('[data-tl-settings]').length` 应为 0 |
| `[role="textbox"]` / `[role="dialog"|"menu"|"listbox"|"tooltip"|"tabpanel"]` | ARIA 角色 | `src/20-stylesheet.js:2262,2284,2361,2372-2383` | 存在（asar: chat/model-selection/input-trigger/approval 等均在用这些 role） | 浮层与输入框玻璃只对这几个 role 生效 | fail-soft | 软-中：改用自定义 role 则浮层不上玻璃 | 开一个产品菜单，看 `getComputedStyle(menu).backdropFilter` |
| 推理滑杆注册 `conversation.input.right`（order −10） | Slot（写） | `src/50-rheostat.js:69-76,508-513` | 存在（116 槽契约表 list/session；asar:`dsh-client-ui-conversation` 声明该槽） | 滑杆从输入行消失，其余正常 | fail-soft（`slots===undefined` → note 后返回 noop，`:71-74`） | 中：槽名或 `register` 形状变更即静默消失 | `__dshTianlightInstance.labels()` 含 `module: rheostat` 且 `!!document.querySelector('[data-tl-rheo]')` |
| 字体按钮注册 `conversation.input.right`（order −20） | Slot（写） | `src/90-font.js:843-849` | 同上 | 字体面板失去入口（面板本身仍可被代码打开） | fail-soft（`slots===undefined` 直接 noop，`:845`） | 中 | 输入行右侧出现字体按钮（`[data-slot="conversation.input.right"]` 有子节点） |

## 4. 设置 / 角色中枢

| 触点 | 类型 | 证据(文件:行) | 0.2.2-rc.3 状态 | 挂掉后果 | 现有降级 | 0.3.0 风险 | 验证方法 |
|---|---|---|---|---|---|---|---|
| `settings.section` slot（WE 壁纸库页，带 `label` thunk） | Slot（写） | `src/72-we-library.js:1524-1527,1584-1597` | 存在（116 槽契约表 list/root；`registerOptions` 含 `id`/`order`/`label`，且要求 locale 变更时重注册——皮肤正是这么做的，`:1506-1532`） | DSH 设置里不再出现「壁纸库」页 | fail-soft（`slots` 缺失 → `tl5Diag('engine',{weLibrarySlots:'missing'})`，保留 CustomEvent 浮层，`:1577-1579,1498-1503`） | 中 | 设置页出现「壁纸库」；`__dshTianlightInstance.diag().engine.weLibrarySlots === 'settings.section+sidebar.footer.action'` |
| `sidebar.footer.action` slot（侧栏底部按钮） | Slot（写） | `src/72-we-library.js:1544-1547,1605-1618` | 存在（116 槽契约表 list/root） | 侧栏底部入口消失 | fail-soft（`try/catch` 包住两次注册） | 中 | `[data-slot="sidebar.footer.action"]` 下有壁纸按钮 |
| 角色中枢：**自建 DOM**，挂在 `<body>`，不读 DSH 设置页结构 | 自建 | `src/76-role-hub.js:4321-4342`（`data-tl-hub`/`data-tl-hub-panel`）、`5063-5065`（`document.body.appendChild`）；注释 `:1421` | 与设置页零耦合 | 与宿主无关（除非 `<body>` 不存在） | fail-soft（body 为空返回 false，`:5056-5060`） | 无 | `!!document.querySelector('[data-tl-hub]')` |
| 中枢 provider 目录：`remote.llm.listProviders()` | client remote | `src/76-role-hub.js:1511-1526,1533-1581` | 存在（asar:`dsh-client-ui-settings-models/lib/client.js` 用 `ctx.remote.llm.listProviders()`，返回 `{ok,value}` 信封——皮肤 `hubListProviders()` 已按该信封解析） | provider 下拉为空 → 只能「跟随 DSH 默认模型」 | fail-soft（5 条解析路径，每步 note；上层返回 `{ok:false}`，`:1587-1599`） | 中 | `document.querySelector('[data-tl-hub-llm-provider-count]').getAttribute('data-tl-hub-llm-provider-count')` > 0 |
| 中枢 model 目录：宿主 `_pet-models` | 宿主路由 | `src/44-pet-brain.js:195`、`lib/routes/pet.js:13-17`、`lib/pet-chat.js:641-843` | 存在（本仓库自注册 + 宿主 `llm.listModels`） | 模型下拉为空 | fail-soft（客户端拿 `{ok:false}` → 该行显示「不可用」，`:3052-3069`） | 中 | `curl -s "$b/skin-tianlight/_pet-models"` → `{ok:true,providers:[…]}` |
| `theme` 服务（字号种子 + `setFontSize` 写回） | Cordis 服务 | `src/90-font.js:323,335-338,293-301` | 存在（asar:`dsh-client-ui-theme`） | 排版面板字号不与产品对齐；改字号不写回产品 | fail-soft（`theme!==undefined` 才用；`setFontSize` 外包 try/catch） | 软 | 字体面板可调且重启后保持 |
| 皮肤自建设置面板（右下壁纸面板，不是 DSH 设置页） | 自建 | `src/70-sidebar.js:4650-4652`（`scrim/host/handle` 挂 body） | 无耦合 | 与宿主无关 | fail-soft（`install()` 包裹） | 无 | `!!document.querySelector('[data-tl-wall]')` |

## 5. 宠物（自建 DOM + 宿主模型目录）

| 触点 | 类型 | 证据(文件:行) | 0.2.2-rc.3 状态 | 挂掉后果 | 现有降级 | 0.3.0 风险 | 验证方法 |
|---|---|---|---|---|---|---|---|
| 桌宠根节点挂在 `#root`（挂在 body 会失去与弹窗的层叠关系） | 自建 + DOM id | `src/40-companion.js:1350-1354`（挂载点见 §1） | 依赖 `#root` 存在 | 桌宠浮在设置弹窗之上，抢点击 | fail-soft（`?? document.body`） | 中 | 打开任意产品弹窗，桌宠应在其下 |
| `POST _pet-chat`（模型调用全在宿主，页面不碰凭据） | 宿主路由 | `src/44-pet-brain.js:192`、`lib/routes/pet.js:6-12`、`lib/pet-chat.js:277-624` | 存在（本仓库自注册） | AI 对话只剩本地模板回复 | fail-soft（客户端 catch → `llmError` 码 → 本地模板，`44:71` 注释；宿主永远回 JSON `{ok:false,code}`） | 中：路由靠 `handler` 字段（§6-4） | `curl -s -X POST -H 'content-type: application/json' -d '{"text":"hi"}' "$b/skin-tianlight/_pet-chat"` → 200 或 409/503，**不能 404** |
| `GET _pet-models`（provider → model 目录） | 宿主路由 | `src/44-pet-brain.js:195`、`lib/routes/pet.js:13-17` | 存在 | 中枢模型下拉空 | fail-soft | 中 | 同上 GET 断言 |
| DSH `llm` 服务（`stream/listProviders/listModels/resolveModelInfo`） | Cordis 服务（host） | `lib/pet-chat.js:160-167,423-432,482-509,525-528` | 存在（asar:`@deepseek-ai/dsh` 的 llm 服务） | 桌宠无法调模型，错误码 `host-unavailable`/`unconfigured-model` | fail-soft（`safeService()` 全包 try/catch，`:141-147`；缺 → 503/409 JSON） | 中-硬：`llm.stream` 请求形状（`messages/system/maxTokens/reasoningEffort/signal`）或 `listModels` 签名一变即整体失效 | `curl -s "$b/skin-tianlight/_engines?api=3"` → `.capabilities.petLlm` |
| `agentDefaultModel.currentSelection()`（默认 provider+model） | Cordis 服务（host） | `lib/pet-chat.js:169-183,433-445` | 存在（asar:`dsh-agent-default-model`） | 无默认模型 → 必须显式选 provider+model | fail-soft（缺 → `no-default-model`/409） | 中 | `.capabilities.petLlm.reason` 为 null 即正常 |
| `_engines.capabilities.petLlm`（客户端据此注册内置适配器） | 宿主路由 + 字段 | `src/44-pet-brain.js:485-520`（fetch 在 `:516`）、`lib/routes/engine.js:65-76` | 存在 | 客户端判定「宿主不提供 AI」→ AI 开关变灰 | fail-soft（probe 从不 reject，`:485` 注释） | 中 | `.capabilities.petLlm.available === true` |
| 宿主侧凭据 | 由宿主 `llm` 服务持有 | `lib/pet-chat.js:1-33`（只转发 `provider`/`model`，不回传任何 key） | 不存在凭据外泄面 | 无 | 不适用 | 无（本条是「不依赖」，记录用） | 页面任何位置不应出现 key |

## 6. 加载器 / API / 路由 / 服务

| 触点 | 类型 | 证据(文件:行) | 0.2.2-rc.3 状态 | 挂掉后果 | 现有降级 | 0.3.0 风险 | 验证方法 |
|---|---|---|---|---|---|---|---|
| `window.__ModuleLoader__.load({id,factory})` | 客户端加载器 | `src/00-envelope.js:1-3` | 存在（asar:`dsh-client-modules/lib/client.js` 自身就用同一形状） | **整包不注册**：壁纸/玻璃/桌宠全无，DSH 页面正常 | **fail-hard**：ESM 顶层取 `window.__ModuleLoader__`，无 try/catch → ReferenceError | 硬 | `typeof window.__ModuleLoader__` 为 `object`；`__DSH_BOOT__.modules` 内含 `dsh-client-ui-skin-tianlight` |
| `require("react")` / `require("react-dom/client")` | 静态种子模块 | `src/10-constants.js:136-142`、`src/70-sidebar.js:4878`、`src/72-we-library.js:1431`、`src/90-font.js:836` | 存在（asar:shell `staticModules` 固定 11 个种子，含这两个） | `React=null` → 桌宠/滑杆/字体/WE 浮层**全部不装**，仅剩 CSS | **fail-soft**：`try/catch` → `react-missing` 警告（`10:137-142`）；各 installer 首行 `if (React===null) return noop` | 中 | `__dshTianlightInstance.labels()` 含 `module: companion/typography/rheostat/panel`，且 `diag()` 无 `react-missing` |
| `dsh.client.platform` / `dsh.client.inject`（两个官方包） | 包清单字段 | `package.json:17-28` | 存在（asar:`dsh-client-modules/lib/index.js` 的 `parseDshClient()` 解析 `platform`（必填 string）/`inject`/`external`/`immediately`） | 不注入 → `remote.session`/`remote.llm` 永不挂载 → 滑杆/中枢 provider/Agent 通道全灰（其余正常） | fail-soft：remote 解析都是多路径 + 缺失分支（`50:98-126`、`76:1533-1581`、`48:545-569`） | 中：字段改名只丢 remote 功能；但 `platform` 缺失/类型错会让 `parseDshClient` **抛错**（CompositionError，整包不加载） | `__dshTianlightInstance.agent()`；`document.querySelector('[data-tl-hub-agent-available]')` |
| `webServer.register({kind:'prefix',path,handler})` | Cordis 服务（host） | `lib/index.js:249-285`（注册在 `:261,:264`） | **存在，但走遗留分支**（已复核）：`dsh-host-webserver/lib/index.js:469-471` 仍是 `function → 'resource' in responder → responder.handler`；官方包已统一用 Fetch 风格 `resource`（asar:`dsh-client-modules/lib/index.js`）。v2.2.4 起 `lib/index.js` 的 `scheduleRouteSelfCheck()` 会在路由不可达时于宿主控制台明确报「legacy handler 未被分发」 | 18 条精确路由 + 5 条前缀 + 资源兜底全 404：壁纸视频/上传/设置同步/WE/天气兜底/`_pet-*`/指纹全灭；**CSS 与 DOM 仍在**（有壳无内容） | fail-soft：`ctx.get('webServer')` 缺失 → `ctx.inject(['webServer'])` 等待（`:250-253`） | 硬（功能级）：0.3.0 删掉 `handler` 分支即触发 | `curl -sI "$b/skin-tianlight/bg-1080.mp4"` → 200/206 |
| `profileContext.dir`（持久数据根） | Cordis 服务（host） | `lib/index.js:296-321`、`lib/host-paths.js:57-80` | 存在（asar:`dsh/lib/profile-boot-*.js` 的 `hostCtx.provide("profileContext",{…dir: composed.profile.dir…})`） | 数据退回插件目录（legacy）→ 升级/卸载时设置、壁纸、WE 状态可能随插件目录被删 | fail-soft（`ctx.get` 包 try/catch，缺则 `{mode:'legacy'}`，`:298-308`） | 中：静默降级且**无告警**，只在 `_engines.data.mode` 可见 | `curl -s "$b/skin-tianlight/_engines?api=3"` → `.data.mode === "persistent"` |
| `_engines` + `HOST_API` 握手（`stale` 判定） | 宿主路由 + 约定 | `src/10-constants.js:23`、`lib/index.js:65`、`lib/routes/engine.js:24-44` | 存在（两端都在本仓库，自洽） | 客户端把宿主判为 `stale` → 面板提示「重启 DSH」（不阻断） | fail-soft：fetch 失败/非 2xx 折叠成 `unreachable`，与 `stale` 分离（`70:1300-1315`） | 软（内部契约） | `curl …/_engines?api=3` → `api:"3"`、`stale:false` |
| 客户端实际依赖的宿主路由（8 类） | 宿主路由 | 客户端：`_manifest`（`30:11`）、`_wallpapers`（`30:338`）、`_frame-cache`（`30:1595`）、`_settings`（`12:58`）、`_bundle`（`70:1970`）、`_import`（`70:2005`）、`_weather`（`35:2062`）、`_fingerprint`（`76:4028`）、另 `_upload`/`_transcode`/`_we-roots`/`_scene-frame`；宿主表 `lib/index.js:97-128` | 存在（同一构建） | 对应入口置灰/报错，面板与播放主体仍在（既有降级表见 `docs/COMPATIBILITY.md:333-345`） | fail-soft（全部 fetch 带 `.catch` 降级） | 中（取决于 §6-4 的 `handler` 是否存活） | 逐个 `curl` 应 200，**不应 404/405** |
| `locale` 服务（`register/subscribe/getSnapshot`） | Cordis 服务（client） | `src/13-i18n.js:305-352` | 存在（asar:`dsh-client-locale`） | 皮肤文案不再跟随 DSH 语言（退化为浏览器语言） | fail-soft（`ctx.get` + `ctx.inject(['locale'])` + try/catch，`:325-340`） | 软 | `__dshTianlightInstance.i18n()` |
| `slots` 服务（`inject/register`） | Cordis 服务（client） | `src/50-rheostat.js:69-76`、`src/90-font.js:843-849`、`src/72-we-library.js:1567-1634` | 存在（asar:官方插件同款用法 + 116 槽契约表内嵌于 `dsh-cordis-client-runner/lib/client.js`） | 3 个入口（滑杆/字体按钮/WE 设置页+侧栏按钮）消失 | fail-soft（三处都有 `slots===undefined` 分支） | 中 | `document.querySelectorAll('[data-slot="conversation.input.right"] *').length` > 0 |
| `remote.session`（`modelCatalog/selectModel`） | client remote | `src/50-rheostat.js:84-126,268-273,399-405`、`src/48-pet-agent.js:545-556` | 存在（asar:`dsh-api-session-controller` + `dsh-api-remotes`） | 滑杆只显示「未连接」；Agent 通道不可用 | fail-soft（三路径解析 + 渲染 `null`，`50:52-56` 注释） | 中 | 滑杆悬停提示不应是「remote.session 尚未挂载」 |
| `uiWorkspace`（Agent 通道的会话列表） | Cordis 服务（client） | `src/48-pet-agent.js:558-569` | 存在（asar:`dsh-client-ui-workspace/lib/client.js` 的 `super(ctx,'uiWorkspace')` 即服务键） | 中枢 Agent 卡的目标会话列表空 | fail-soft（inject 内 try/catch） | 软 | 中枢 Agent 卡「目标会话」下拉非空 |
| CSS 来源：`--dsw-*` 产品 token + 自建 `--tl-*`；`<style data-plugin-css>` 注入 | CSS 机制 | `src/20-stylesheet.js:3,49-170,3766-3782` | 存在（asar:`dsh-client-modules/lib/client.js` 用 `data-plugin`/`data-plugin-css` 认领插件注入的 `<style>`） | `<style>` 被拒/被清理 → 整页无皮肤样式（DOM 与桌宠仍在） | fail-soft（`document` 缺失直接 noop；重复注入复用已有标签，`:3768-3771`） | 软（皮肤自己 append，不走 adoptedStyleSheets） | `!!document.querySelector('style[data-plugin-css="ui-skin-tianlight/tianlight.css"]')` |
| 开机遮罩给 `#root` 打 `data-tl-splash-blur` | DOM | `src/59-splash.js:607-614`、`src/20-stylesheet.js:3709` | 依赖 `#root`（见 §1） | 片尾「产品从模糊变清晰」缺失 | fail-soft（`if (appRoot !== null)`） | 软 | 看开机收尾是否模糊到清晰 |

### 6.1 为什么不能"顺手"补一个 Fetch `resource`（已复核，重要）

有人会想：既然官方改用 `resource`，那就给同一个路由对象同时挂 `handler` 和 `resource`。
**这会更糟，不能这么做。** `dsh-host-webserver` 的 HTTP 分发顺序（`lib/index.js:469-471`）是：

1. `typeof responder === 'function'` → 当 handler；
2. `'resource' in responder` → 走 Fetch 资源分支（**不看 method**）；
3. `responder.handler(req, res)`。

也就是说，路由对象一旦带 `resource`，**所有方法**（包括本插件的写路由：`_settings` PUT、`_upload` POST、`_pet-chat` POST、`_import`/`_bundle`/`_transcode`）都会走 `resource`；
而 `readResource()` 对非 GET/HEAD 在匹配之前就返回 405。结果：读通了、写全挂。
`register()` 也不允许同一 `(kind, path)` 注册两次（重复即 throw，`lib/index.js:375-382`），所以"一条 handler 路由 + 一条 resource 路由"同样不可行。

结论：`handler` → `resource` 是**整包重写**（`lib/http-media.js` 的 Range/流式、8 条写路由、两道同源围栏都要变成 Request/Response 语义），不是补一个字段。0.3.0 若真的删掉 legacy 分支，正确顺序是：

1. 先按清单确认是这一条（`curl` 404 + 宿主控制台出现 route self-check FAILED）；
2. 新建 `lib/fetch-resource.js`：把 `handle(ctx, req, res)` 跑在 Node `http` shim 上，响应体用 `Readable.toWeb` 转成 `Response`（Range/HEAD 语义保持不变）；
3. 所有路由改注册 `resource`，`scheduleRouteSelfCheck` 改为调用 `webServer.readResource()`；
4. 在 `tools/test.mjs` 给 shim 补单测（GET/HEAD/206/POST 必须 405/同源 403）后再发版。

在此之前，**保留 `handler` 是唯一正确选择**——它是 0.2.x 里唯一能同时服务读和写的方法。

## 0.3.0 发版日检查清单（按顺序执行）

1. `npm view @deepseek-ai/dsh dist-tags` — 记下 0.3.0 的确切版本号，后续每条都用它。
2. 门禁自检（`engines.dsh` 单独判定，命中即 `IncompatiblePlugin`）：
   `node -e "const fs=require('node:fs');for(const f of ['package.json','skin.json']){const t=fs.readFileSync(f,'utf8');console.log(f, />=0\.3\.0-0\s+<0\.4\.0-0/.test(t)?'OK':'MISSING')}"`
   期望两行都 `OK`；`MISSING` 时先补 `engines.dsh`、两个 optional peer、`skin.json.dshCompatibilityRange`。
   再 `git diff -- package.json skin.json`：三处必须已经在**发布提交**里（只留在工作树 = 干净检出仍被拒）。
3. `node tools/hook-scan.mjs` — 只读静态扫描，确认 0.3.0 安装包里 9 个类名段 + 5 个 data 钩子 + 2 个 slot 名仍在。
4. 启动 0.3.0 后取当天 URL（形如 `http://127.0.0.1:51546`），记为 `$b`；先打宿主路由：
   `curl.exe -s "$b/skin-tianlight/_engines?api=3"`、`curl.exe -sI "$b/skin-tianlight/bg-1080.mp4"`（200/206）、`curl.exe -s -o NUL -w "%{http_code}`n" "$b/skin-tianlight/_pet-models"`（200/409，**不能 404**）。
5. `_engines` 字段断言：`api==="3"`、`stale!==true`、`data.mode==="persistent"`、`capabilities.petLlm.available===true`。
6. Console 大断言（一次粘贴，任一 false 即定位到对应小节）：
   `({loader:typeof window.__ModuleLoader__, root:!!document.getElementById('root'), css:!!document.querySelector('style[data-plugin-css="ui-skin-tianlight/tianlight.css"]'), labels:__dshTianlightInstance.labels(), features:__dshTianlightInstance.features, token:getComputedStyle(document.body).getPropertyValue('--dsw-alias-label-primary').trim()})`
7. `features` 逐项：`slotMarkers/modelSlot/composerCard/triggerMenu/messageBubble/sidebarCollapsed` 应 true；`classNaming` 不应是 `unknown`；`desktopChrome` 仅 Desktop 为 true。
8. 侧栏：展开与收起各截一次，`document.querySelectorAll('[data-tl-new-chat]').length===1`、`[data-tl-sidebar-col].length>=1`、`[data-tl-settings].length===0`（防「巨型色块」回归）。
9. 输入区：`[data-tl-composer].length===1`、`[data-tl-model]`/`[data-tl-model-label]`/`[data-tl-model-effort]` 各 ≥1、`!!document.querySelector('[data-tl-rheo]')`（滑杆已注册）。
10. 三个 slot 入口到位：DSH 设置里有「壁纸库」页、侧栏底部有壁纸按钮、输入行右侧有字体按钮。
11. 桌宠与模型：`__dshTianlightInstance.pet()/agent()/hub()` 均非 null；中枢 provider 下拉 `[data-tl-hub-llm-provider-count]` > 0；`curl` 一次 `_pet-chat` 返回 JSON 而非 404。
12. 回滚验证（证明 0.3.0 的 dispose 仍干净）：禁用插件后 `document.querySelectorAll('[data-tl-sidebar-col],[data-tl-composer],[data-tl-model],[data-tl-new-chat]').length===0`、`!!document.querySelector('style[data-plugin-css="ui-skin-tianlight/tianlight.css"]')===false`、`document.body.hasAttribute('data-dsh-tianlight')===false`。
13. 皮肤自有标识（0.3.0 若改插件 CSS 归属或 loader 的 id 规则，先在这里断）：五个名字必须同时成立且彼此对应——`skin.json.wiring.id === "ui-skin-tianlight"`、CSS 标签 `data-plugin-css="ui-skin-tianlight/tianlight.css"`（及 `id` 同值）、`body[data-dsh-tianlight]`（皮肤作用域根，**不是**产品属性）、客户端模块 `id: "dsh-client-ui-skin-tianlight"`、`package.json.dsh.client.platform === "web"`。断言：
    ```js
    ({ css: !!document.querySelector('style[data-plugin-css="ui-skin-tianlight/tianlight.css"]'),
       body: document.body.hasAttribute('data-dsh-tianlight'),
       lang: document.body.getAttribute('data-tl-lang'),
       loaded: typeof globalThis.__dshTianlightInstance === 'object' })
    ```
    任何一项为 false：先看 Console 有无 `[ui-skin-tianlight] react-missing` / `glyph` / 路由自检告警，再判断是 loader 契约（§6-1）还是 CSS 认领机制变了。皮肤自有的 `data-tl-*` 不进 Checklist——那些是皮肤自己打的，不依赖宿主。
