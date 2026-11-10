# 天光（TIANLIGHT）— DSH Web 皮肤插件

新海诚式的天光配色，全屏循环动态壁纸置于界面之下，玻璃质感面板、可拖拽的薄荷小猫桌宠，以及一套自建的排版与壁纸控制面板。v0.5.1 起它是一套**可开关、可观测、可回滚**的工作台：模块开关、宿主设置同步、智能情境（含天气联动）、特效与氛围、系统音频、网页壁纸、导入导出包与配方分享；v0.5.2 是**自检修复版**（设置数据安全 / i18n 完整性 / 面板体验），v0.5.3 是**大修版**（快捷壁纸 / 点击链路 / 语言解耦 / 情境安全默认），v0.6.0 起**自动接入本机 Wallpaper Engine 库**（无需填写目录，点一张即应用），v0.7.0 新增**职责通道**（角色包/职责引擎 → 桌宠气泡与用户选择，只改浏览器半、无需重启 DSH）。

> 这是一个 **DSH（DeepSeek Harness）Web GUI 皮肤插件**，不是独立应用。它是一个标准 DSH bundle：`dsh.bundle.patch` 负责插入 `ui-skin-tianlight` 行，`dsh.client` 提供浏览器半；Web GUI 与 DSH Desktop 共用同一前端。
>
> 包名 `@dsh-external/dsh-client-ui-skin-tianlight` · 布线行 `ui-skin-tianlight` · body 属性 `data-dsh-tianlight`

## v1.6.4 · 正式版：桌宠 AI 对话 · 每个形象的动作包 · 全代码审查修复

`1.6.4`（26 片段；`BUILD`/`HOST_BUILD` = `1.6.4`）。细节见 [docs/RELEASE-1.6.4.md](docs/RELEASE-1.6.4.md) 与审查报告 [docs/REVIEW-1.6.4.md](docs/REVIEW-1.6.4.md)：

- **桌宠「AI 对话」**：互动菜单首位新增 AI 对话；输入条 + 气泡回复，走既有 `tianlightPet.chat()`（权限/暂停/配额/审计语义不变）；识别当前图片/视频形象，视频上方悬浮、顶部空间不足自动翻转。
- **每个形象一套动作包**：`globalThis.tianlightPetActions`（get/set/clear/current，`localStorage["tianlight.petActions.v1"]`，按 mediaId 生效）；中枢可编辑摸摸/喂食/逗猫棒的动作名与回复，保存只提交改动项——未改动跟随语言默认、清空旧自定义会删除 override、切语言不冻结；新增 i18n 29 键（1216→1245）。
- **中枢形象文件名常显列表**：文件名/类型/大小一行一个，点击即切换（修复下拉 option 文字不可见）。
- **全代码审查修复**：H1 默认文案冻结、H2 WE 宿主流式 error 崩溃、M1 低电量异步泄漏、M2 bridge 节点清理、M3 聊天视口翻转、M4 转码超时兜底、M5 宿主同源栅栏收紧 + 契约测试；已知限制不阻塞发布（见 REVIEW 文档）。
- **公开上传命名**：上传物与发布说明使用公开版本名 **v1.0.3（正式版）**（内部构建 `1.6.4`）。
- 本版含宿主半/内核改动，升级请 **Ctrl+F5 + 重启 DSH 一次**。

## v1.6.3 · 更名「天光」· DSH 0.2.0/0.2.1/0.2.2 兼容性实证

`1.6.3`（26 片段；`BUILD`/`HOST_BUILD` = `1.6.3`）。细节见 [docs/RELEASE-1.6.3.md](docs/RELEASE-1.6.3.md)：

- **显示名统一为「天光」**：`skin.json` 的 `name` 改为「天光」（`nameEn` 保持 `TIANLIGHT`），README 标题同步为「天光（TIANLIGHT）— DSH Web 皮肤插件」；只改显示文本——skin id / 包名 / `data-dsh-tianlight` / 设置键与 `state/` 数据全不变，旧用户无迁移成本。
- **DSH 三版本兼容实证**：对 **0.2.0-rc.2 / 0.2.1-rc.5 / 0.2.2-rc.1** 三份真实安装跑 compat-matrix + hook-scan + upgrade-check——bundles 72/77/86、钩子层同为 slot+product-data+class-segments、11 项客户端契约与桥接钩子三线全在、verdict 全 **COMPATIBLE**、升级假设全部成立；`data-message-bubble` 仅 0.2.2 有（0.2.0/0.2.1 由 `_bubble` 兜底），**无需版本 if 分支**。细节见 [docs/COMPATIBILITY.md](docs/COMPATIBILITY.md) §6.1。
- **公开上传命名**：上传物与发布说明使用公开版本名 **v1.0.2**（内部构建 `1.6.3`）。

## v1.6.2 · 移除壁纸左上角固定晨光装饰

`1.6.2`（26 片段；`BUILD`/`HOST_BUILD` = `1.6.2`）。细节见 [docs/RELEASE-1.6.2.md](docs/RELEASE-1.6.2.md)：

- **修复「左上角小太阳」**：皮肤自带的固定角落装饰（`src/30-wallpaper.js` 的 `CREST_SVG` / `[data-tl-crest]`，每张壁纸重建场景都会绘制在 `top:-120px; left:-140px`、`opacity:.42`）已整段移除；场景层 DOM 顺序（video/photo/shader/sceneFrame/webFrame/overlay×2/dim/veil）不变，veil 天空光渐变保留。所有壁纸类型与所有玻璃档（含 `off`）都不再出现该角标。
- **纯视觉修复**：不改液态玻璃 v2、新会话按钮、主界面天气胶囊、桌宠/中枢、权限与限额；升级后无需重新配置。
- **公开上传命名**：上传物与发布说明使用公开版本名 **v1.0.1**（内部构建 `1.6.2`）。

## v1.6.1 · 液态玻璃 v2 · 新会话栏玻璃化 · 主界面天气胶囊

`1.6.1`（26 片段；`BUILD`/`HOST_BUILD` = `1.6.1`）。细节见 [docs/RELEASE-1.6.1.md](docs/RELEASE-1.6.1.md)：

- **侧栏「新会话」深色块修复**：根因是 DSH 产品按钮 token（`--dsw-alias-button-elevated-fill` / hover `--dsw-alias-button-floating-hover` / 边框 `--dsw-alias-border-l3`）皮肤此前未接管；现由 selector bridge 打 `data-tl-new-chat` 锚点并在**所有深度档**皮肤化（**off 也修复**），`depth-on` 套完整玻璃，产品 token 覆盖块（`--dsw-alias-*`）同步接管同类产品按钮。
- **液态玻璃 v2（OriginOS 7 风）**：更厚磨砂 + 更高饱和 + 多层 specular + 1px 亮/暗边 + 外柔光 + 细噪点（`--tl-liquid-grain` / `--tl-liquid-rim`）+ hover/active 柔和回弹；三档 blur/sat 上调（soft **11px**/1.30、real **19px**/1.50、frosted **26px**/0.95）；新会话按钮与天气胶囊纳入 v2 分组，中枢预览条同步 v2；每视口最多一层大 blur、气泡不逐项 blur、低电量 blur≤3px、减少动效关过渡、`off` 零变化（新会话修复除外）。
- **DSH 主界面天气胶囊**：主界面右上常驻浮动玻璃胶囊（fixed、不占布局），状态 `off / no-location / waiting / error / ready`，点击 / `Enter` / `Space` 打开角色中枢天气卡；订阅 `tianlightWeather`（无订阅能力时 60s 轮询 `summary()`），**不自动启用、不新增网络请求与权限**。
- **公开上传命名**：上传物与发布说明使用公开版本名 **v1.0.0**（内部构建 `1.6.1`）。

## v1.6.0 · 上限上调 + 液态玻璃全覆盖

`1.6.0`（26 片段；`BUILD`/`HOST_BUILD` = `1.6.0`）。细节见 [docs/RELEASE-1.6.0.md](docs/RELEASE-1.6.0.md)、权限规范 [docs/AI-PET-PERMISSIONS.md](docs/AI-PET-PERMISSIONS.md)：

- **安全上限整体上调（权限模型不变）**：主动开口预算 6/20 → **12/50**；本地 chat 8/分、300/天 → **20/分、1200/天**，输入 280 → **1000** 字；LLM 日配额 20/50 → **60/120**、分钟 3 → **6**、输入 280 → **1000**、输出 600 → **1200** 字、超时 12s → **20s**；AI Agent 日 10/30 → **30/100**、输入 500 → **1000** 字、超时 60s → **120s**；中枢生活预算 0..20 → **0..50**；审计环 60/30 不变。默认关闭、显式授权、可撤销、全程审计、`agent`（驱动 DSH）永久禁止全部不变；旧持久化值按新区间 clamp。
- **液态玻璃全覆盖**：depth != off 时统一应用到侧栏、设置、壁纸库、中枢、对话框、菜单、列表框、输入区、气泡、胶囊、提示等表面（分组 A 重：填充/specular/描边/轻阴影；分组 B 轻：气泡/胶囊/提示只加高光与描边；每视口只留一层模糊——大面板与气泡不叠实时 blur，浮层菜单与输入区沿用自身 blur；输入控件仅描边/微高光、不加 blur）；无壁纸场景时自动插入 `[data-tl-liquid-fallback]` 玻璃兜底（随 scene 出现/消失同步、dispose 删除、低电量禁用）；**off 档零变化**、低电量/15fps 自动压平、`prefers-reduced-motion` 关动画；中枢预览条保留。
- 静态链 build 26/26、test 67/67、structure --strict、audit（v1.6 新守卫）、CSS/verify/i18n（zh=en 1203 键）全绿；Node 冒烟 **586/586 PASS**（v1.5 的 534 条回归按新上限更新 + 新增 GLASS-ALL/LIMITS 段），构建 sha `d9533358…`。

## v1.5.0 · 可见性修复：默认玻璃可见 · 天气上桌 · 恢复默认形象 · 自检 · 反馈渠道

`1.5.0`（26 片段；`BUILD`/`HOST_BUILD` = `1.5.0`）。细节见 [docs/RELEASE-1.5.0.md](docs/RELEASE-1.5.0.md)：

- **恢复默认形象**：角色中枢「桌宠形象」新增按钮 → `tianlightLife.setMedia(null)` 回到默认 `cat.png`/SVG。
- **液态玻璃可见**：默认档改为 **柔和（soft）**、强度提升、并且同时作用于皮肤自身的玻璃胶囊/表面；中枢玻璃卡新增**预览条**——切换档位立刻看到差异（不再只有壁纸层才可见）。
- **天气上桌**：角色中枢新增天气卡（启用开关、城市解析、坐标、定位、刷新、当前天气描述/温度/更新时间/错误状态），消费 `globalThis.tianlightWeather.summary()`；天气仍默认关闭、显式启用才联网（Open-Meteo，免 key）。
- **一键自检**：中枢「自检」逐项检查 life/pet/glass/media/weather/agent/hub，列出 PASS/FAIL 并可复制结果。
- **反馈渠道**：GitHub Issues 已开放；新增 issue 模板（`.github/ISSUE_TEMPLATE/feedback.yml`）、[docs/FEEDBACK.md](docs/FEEDBACK.md) 与中枢「反馈」面板（复制环境/预填 Issue/下载 JSON；不读取会话正文与凭据）。
- 静态链 26/26、test 67/67、audit 新守卫、CSS/verify/i18n 全绿；Node 冒烟在 v1.4 465 条基础上新增 WEATHER/UX 段。

## v1.4.0 · 权限模型调整：驱动 DSH 仍永久禁止，其余高风险可授权

`1.4.0`（26 片段；`BUILD`/`HOST_BUILD` = `1.4.0`）。细节见 [docs/RELEASE-1.4.0.md](docs/RELEASE-1.4.0.md)、权限规范 [docs/AI-PET-PERMISSIONS.md](docs/AI-PET-PERMISSIONS.md)：

- **`agent`（驱动 DSH）保持强烈永久禁止**，代码层不可授予。
- **network / files / shell / approve / message / install 六项改为 high risk、默认关闭、用户可显式授权/撤销**（中枢两步确认 + 高风险警告），不再硬性否决。
- **皮肤仍零危险实现**：授权只是闸门；`setCapabilityAdapter(cap,{id,run})` 由你注册适配器后，`invokeCapability(cap,input)` 才会在“已授权 + 未暂停”时调用你的代码，并写审计 `action:"capability"`；不注册适配器则没有执行路径。
- 权限总览按 safe/medium/high/forbidden 着色（6 个 high 行可授权，`agent` 行只读永久禁止）。
- 静态链 build 26/26、test 67/67、audit 新守卫（高风险可授权适配器 / 仅 agent 硬禁）、css/verify/i18n 全绿；Node 冒烟在 v1.3 410 条基础上更新 + 新增高风险/适配器段。

## v1.3.0 · 角色入口收进桌宠（不再单独列出）

`1.3.0`（`lib/client.js` **26 片段**；`BUILD`/`HOST_BUILD` = `1.3.0`）。细节见 [docs/RELEASE-1.3.0.md](docs/RELEASE-1.3.0.md)：

- **不再单独列出「角色」**：删除设置页「角色 / 生活」独立一项（`src/74-life-settings.js` 移除），删除侧栏 footer「角色」按钮；唯一入口是桌宠本身——**右键桌宠**，或点桌宠 → 菜单「角色中枢」（第 7 项）。
- **功能不丢**：原设置页内容并入角色中枢，新增「生活节奏设置」卡片（静默起止、每日额度、作息、虚拟时钟偏移、记忆统计）；玻璃/形象上传/AI 对话/AI Agent/权限/审计等全部保留。
- 静态链 build 26/26、test 67/67、structure/audit/css/verify/i18n 全绿；Node 冒烟在 v1.2 378/378 基础上更新入口断言（无独立设置页/无侧栏按钮/菜单第 7 项）。

## v1.2.0 · 右键桌宠进中枢 · 接入 DSH Agent（受控）

`1.2.0`（`lib/client.js` **27 片段**；`BUILD`/`HOST_BUILD` = `1.2.0`）。细节见 [docs/RELEASE-1.2.0.md](docs/RELEASE-1.2.0.md)、权限 [docs/AI-PET-PERMISSIONS.md](docs/AI-PET-PERMISSIONS.md)：

- **右键桌宠直接打开角色中枢**（preventDefault，不干扰左键菜单/拖拽；中枢不可用时回退菜单）。
- **接入真实 DSH Agent**：新增第 27 片段 `src/48-pet-agent.js`，走客户端 `remote.session`（list/create/prompt/follow）；中枢新增「AI Agent（实验）」卡片：显式授权 `agentChat`（默认关、两步确认）、新建桌宠会话或选现有会话、连接/断开/打开会话、预算/状态/风险提示；聊天输入在已连接时走真实 Agent，回复显示在中枢（解析失败提示到会话查看）。
- **严格规范**：仅用户手动触发、无定时/生活/职责钩子；日 ≤10（1..30）、≤500 字、≤60s、同时 1 条；只调用 list/create/prompt/follow，**绝不** cancel/approve/attachment；固定“只回答”引导语；发送与失败写审计并镜像大脑；断开/撤销即回落本地大脑。`agent`（自主驱动任务）仍永久禁止，7 项 forbidden 不变。
- 静态链 build 27/27、test 67/67、structure/audit/css/verify/i18n 全绿；Node 冒烟（v1.0+v1.1 回归 + AGENT 段）。

## v1.1.0 · 角色中枢 · AI 桌宠（严格权限）· 形象上传

`1.1.0`（`lib/client.js` **26 片段**；`BUILD`/`HOST_BUILD` = `1.1.0`）。细节见 [docs/RELEASE-1.1.0.md](docs/RELEASE-1.1.0.md)、权限规范 [docs/AI-PET-PERMISSIONS.md](docs/AI-PET-PERMISSIONS.md)：

- **角色中枢**：侧栏 footer「角色」按钮 + 全屏面板，一屏管生活状态/专注/静音/液态玻璃/形象/记忆/AI 对话/权限/审计；×、Esc、遮罩关闭，焦点还原；`globalThis.tianlightRoleHub`。
- **AI 桌宠（严格权限）**：`src/44-pet-brain.js` 本地大脑（12 类意图、中英双语、短句安静语气）+ 可选 `window.tianlightPetLLM` 适配器；**能力白名单**：safe 六项默认、`llm` 需显式同意、**7 项永久禁止**（agent/network/files/shell/approve/message/install 不可授予）；LLM 硬上限（日 20≤50/分钟 3/输入 280/输出 600 字/12s/固定安全系统提示/只发当前一句/无会话内容）；审计环形 60 + 暂停开关；`globalThis.tianlightPet`。
- **形象替换补完**：角色中枢可**直接上传本机图片/视频**（≤32MiB，客户端+服务端双校验），上传后即时切换；默认仍回退 `cat.png`/内联 SVG。
- **未完成项**：真实浏览器级验收（沙箱受限，harness 就绪）与 GitHub 推送（本会话无凭据，镜像/脚本已备）仍在进行；真实 DSH 任务/审批信号源未做（需新权限，另行规范）。
- 静态链 build 26/26、test 67/67、structure/audit/css/verify/i18n 全绿；Node 冒烟在 v1.0 169/169 基础上新增权限/中枢段。

## v1.0.0 · 角色生活节奏 · 可替换形象 · 液态玻璃（正式版）

`1.0.0`（`lib/client.js` **24 片段**；`BUILD`/`HOST_BUILD` = `1.0.0`）。**正式版**，细节见 [docs/RELEASE-1.0.0.md](docs/RELEASE-1.0.0.md)：

- **桌宠 → 多功能角色智能体**：虚拟时钟（`virtualOffsetMinutes`）、每日作息（wake/sleep + 静默时段）、主动开口预算（每日上限、30min 间隔，可调）、跨会话记忆（互动/摸摸/喂食/逗猫棒/交谈、连续天数、上次见面）、职责提醒闸门（静默/睡眠/预算不足 → 延迟队列 ≤8，窗口期自动 `replay` 回放）。
- **可替换形象**：设置页从本地壁纸库选**图片或 ≤32 MiB 视频**（视频静音循环、实时切换、无控件）；默认仍回退 `cat.png` / 内联 SVG，选择持久化。
- **液态玻璃（可选，默认关闭）**：真实 / 柔和 / 磨砂三档，壁纸与界面之间一层镜面高光 + blur/saturate；15fps 或低电量自动降级，`prefers-reduced-motion` 停动画，关闭时零合成层。
- **新设置页**：DSH 设置 →「角色 / 生活」（slots `settings.section` id `tianlight-role`）：形象、生活节奏、玻璃质感、记忆与专注一页管理。
- **新功能**：专注 25 分钟（桌宠菜单/设置页启动，专注期间角色不主动开口）、桌宠菜单「静音 1 小时」、互动记忆与连续天数、`__dshTianlightInstance.life()/glass()` 诊断。
- **节能/稳定**：生活定时器 30s + hidden 跳过；idle 低档降频；状态写盘仅变化时；延迟队列上限；新监听器成对清理。
- **无宿主路由改动**：Ctrl+F5 即可；若面板提示"宿主半需重启"（build 标记更新），重启一次 DSH 即消除。静态链 build 24/24、test 67/67、structure/audit/css/verify/i18n 全绿。

## v0.7.0 · 职责通道（role pack → 桌宠）

`0.7.0`（`lib/client.js` **22 片段**；**只改浏览器半**：宿主半 `lib/index.js`/`BUILD` 与 `HOST_BUILD` 均保持 0.6.0 → **无需重启 DSH Desktop**，Ctrl+F5 即可）。细节见 [docs/DUTY-CHANNEL.md](docs/DUTY-CHANNEL.md)：

- 新增 `globalThis.tianlightDuty`：`send(action)` / `subscribe(fn)` / `status()` / `clear()`；`document` 事件 `tianlight:duty`（入站）与 `tianlight:duty-action`（出站）。
- `interrupt` 在桌宠旁显示带选项按钮的职责气泡（≤5 个，TTL 默认 12s），用户点选后回传 `choice`，TTL 到期回传 `timeout`；`speak` 显示普通短句；`clear` 清理。fail-closed 校验、同伴模块关闭时 `companion-off` 降级、与普通台词 DOM 隔离、键盘可达（原生 button）。
- 用途：角色包职责层（`rolepack/quiet-writing-companion/`）把审批/完成/喝水等信号交给确定性引擎调度后，用**桌宠作为 DSH 之外的唯一常驻呈现面**；用户选择（等会儿/静音 1 小时/休息时再说/额度）回传引擎并写入 `soul-state.json#/dutyRuntime`。
- 静态链：build 22/22、test 67/67、structure --strict、audit、check-css、verify、i18n-audit（zh/en 860 键）全绿；隔离 lab 验收脚本 `diag/skinlab/dutycheck.mjs`（不触碰 live DSH）。

## v0.6.0 · Wallpaper Engine 库集成

`0.6.0`（git `acb17a6`；`lib/client.js` 896,889 字符 / 930,994 字节 / **22 片段**；`BUILD`/`HOST_BUILD` = `0.6.0`；
build --check 22/22、test 67/67；静态链全绿）。**新功能版本**，细节见 [docs/RELEASE-0.6.0.md](docs/RELEASE-0.6.0.md)：

- **本机 WE 库自动接入**：宿主半新增 `lib/we-wallpaper/host.mjs`（内嵌 MIT 的 dsh-we-wallpaper v0.4.0），
  自动发现 Steam/Wallpaper Engine → 扫描工坊与 projects → 纯 JS 解 `scene.pkg`/TEX 出 4K 静态图；
  `_wallpapers` **additive** 追加 WE 条目、`_engines.weLibrary` + `capabilities.weLibrary` 报告发现结果。
  本机真实结果：**38 张 = 本地 3 + WE 35**（workshop 16 / project 19；scene 22 / video 7 / web 3 / other 3；
  11 条中文标题原样保留）；8/8 workshop 场景解出 4K，33MB `.pkg` → 4.4MB PNG。
- **新路由前缀 `/api/we-wallpaper`**：`list` / `preview` / `media`（Range 206）/ `pkg` / `web` /
  `scene-video`（可选，非 Windows 或缺 wcap → 503 可读）/ `diagnostics` / `state`；`dsh-app` 与
  本机 origin 放行、跨站 403、路径 containment。
- **客户端第 22 片段 `72-we-library`**：DSH 设置导航「壁纸 / Wallpaper」页（`settings.section`
  id `tianlight-wallpaper`）+ 侧栏 Settings 旁按钮（`sidebar.footer.action`）+ 全屏浮层（`z-index:2600`、
  ×/Esc/mask、`tianlight:open-wallpaper-library` 事件入口）；预览网格/搜索/类型筛选/刷新/使用中/toast；
  点卡应用 video→media、image→media、web→网页、scene→pkg（无 pkg → diagnostics → preview 回退）；
  可选「生成动态」走真实 `{ok,status:{phase,progress,error}}` 轮询。
- **快捷选择器**：WE 卡片自动出现（「壁纸引擎 35」chip、预览优先、video/scene/web 徽标、场景「静态高清」提示）；
  高级 ① 新增自动检测行（总数 + Steam/project 拆分）+「打开壁纸库」，旧手动目录折叠为兜底。
- **第三方**：dsh-we-wallpaper MIT、wcap Unlicense、RePKG/WebWallGL MIT，见
  [docs/THIRD-PARTY.md](docs/THIRD-PARTY.md)。

> **验证状态**：静态链全绿（build 22/22、test 67/67、structure/audit/check-css/verify/i18n-audit）；
> W 自检 v0.2.2 web **23/23 PASS**、v0.2.2 Desktop **23/23 PASS**；4-runtime 全量矩阵见
> `diag/skinlab/V060-VERDICT.md`。旧宿主 × 新客户端：WE 路由 404 → 页面提示重启/更新（未真机复验，已知边界）。

> **生效方式**：v0.6.0 **新增宿主路由**，升级后必须**重启 DSH 一次**，再 Ctrl+F5；之后只改浏览器半仍 Ctrl+F5。
> 旧宿主（仅新客户端）WE 库不可用，其余功能正常。

## v0.5.3 · 大修版：快捷壁纸、点击/语言/情境修复

`0.5.3`（git `73b378d`；`lib/client.js` 827,150 字符 / 859,341 字节 / 21 片段；`BUILD`/`HOST_BUILD` = `0.5.3`；build --check 21/21）。
**不含新功能**，针对用户三条新反馈做大修，细节见 [docs/RELEASE-0.5.3.md](docs/RELEASE-0.5.3.md)：

- **壁纸快捷选择重做**（用户要求）：pick 视图改为**纯视觉缩略图网格**（2 列大卡片、使用中高亮、点击立即切换
  + toast）；**移除 pick 视图里的上传/URL/WE/GLSL 导入**（只在「高级」保留）；「更多设置 ↔ 返回快捷选择」
  互切；边缘手柄 / **Alt+W** 默认打开快捷选择。
- **「几乎所有功能未响应」**：根因是 DSH 产品可能残留不可见全屏 modal mask（`z-index:1000`、
  `pointer-events:auto`）吞掉真实鼠标点击，键盘仍可用。v0.5.3 把皮肤浮层抬到 **z-index 1290–1320**
  （scrim 1290 / 面板 1300 / 手柄 1310 / 字体面板 1320，仍从 Desktop 标题栏下方开始），保留键盘路径；
  真实鼠标逐控件验证见 RELEASE。若仍遇到整页点不动：按 Esc/重启 DSH，再点右上「更多设置」。
- **C3 自适应误冻结修复**：默认关（新配置 `adaptive:false`，旧用户已存选择保留）；仅在页面可见且窗口聚焦时
  采样；连续 5 次低样本且 ≥10s 才降档；降档后 5 分钟冷却；重新聚焦/用户恢复立即清除；⑪ 增加
  「自动降档可能冻结动态壁纸」提示 + 锁定按钮。
- **语言切换**：显式「中文 / English」**只切皮肤文案，不再调用 `DSH locale.setLocale()`**，DSH 界面语言不受影响；
  「跟随 DSH」仍订阅 locale 变化；非 React 文案走 `data-tl-i18n-key`/`data-tl-i18n-title-key` 契约刷新。
  **这是行为变更**：皮肤语言与 DSH 语言不再联动。
- **天气 / 智能情境安全默认**：timeOfDay / focusLink / adaptive / weather 默认全 OFF（已持久化选择保留）；
  C1 只做 |亮度影响| ≤6% 的小偏移并显示影响 + 关闭按钮；C4 折叠进「实验性（需要联网，Electron 可能受限）」、
  默认关且零请求、失败可读 + 重试；⑨ 增加「恢复默认」。
- **控制台静音**：frame-cache miss 不再产生 404 控制台错误（未知 key 本地 miss、已知 key 才探测）；
  捕获延迟 2500ms 且仅可见/非低电量；`audio:system-failed` 只在用户触发时告警。

> **验证状态（已判定）**：最终构建 git `73b378d`（827,150 字符 / 859,341 字节 / 21 片段；build --check 21/21），
> 静态链含 `i18n-audit` 全绿；verifier 运行时矩阵 **4/4 运行时 PASS，387/387 断言**（web 96/96 ×3 + Desktop 99/99；
> 0 failed / 0 skipped / 0 console error）；真实鼠标 **P1–P5 39/39 PASS**；旧宿主 × 新客户端降级 **17/17 PASS**。
> 详见 [docs/RELEASE-0.5.3.md](docs/RELEASE-0.5.3.md) §8。

> **生效方式**：纯浏览器半修复（无新增宿主路由），Ctrl+F5 即生效；build 标记 0.5.2 → 0.5.3，
> 只刷新时仍会提示「宿主半待重启 DSH」（功能不受影响），重启一次消除提示。

## v0.5.2 · 自检修复（数据安全 / i18n / 面板体验）

`0.5.2`（git `fe32f7f`；`lib/client.js` 798,816 字符 / 829,659 字节 / 21 片段；`BUILD`/`HOST_BUILD` = `0.5.2`）。
**不含新功能**，只修用户反馈的三类问题，逐项「问题→根因→修复→证据」见 [docs/RELEASE-0.5.2.md](docs/RELEASE-0.5.2.md)：

- **① 设置/壁纸选择丢失、重启不恢复（最严重）**：根因是旧的 `applyHostSettings()` 在宿主 revision 更新时
  **删除宿主里没有的本地 `tianlight.*` 键**，宿主文件一旦不完整（首启/其它浏览器/推送失败）就清空用户设置。
  v0.5.2 改为：**宿主有的键按宿主落地、显式 null 墓碑仍删除、本地独有的键保留并回推宿主**；采纳前把本地
  可同步键备份到 `tianlight.backup.host`（**本地专用、不参与宿主同步**），⑦ 工程分区新增
  「恢复宿主导入前备份」；bootstrap 首启全量推送、失败一次重试；`tl5Diag("settings")` 记录
  `{localKeys, remoteKeys, pushedKeys, pushRetried}`。
- **② 语言/文案中英混杂**：补齐 `engine.adaptive.*` 的 en、`30` 的 provider/layer/shader 提示与
  `55` 的低电量/音频 stop 文案；`30` 全面 getter 化（渲染时翻译）；`55` 改用结构化 `detailKey/detailParams`；
  `ctx.*` 等动态拼接改字面量；`13-i18n` 工厂期注册 schema 字典。新增 **`tools/i18n-audit.mjs`**：
  缺 key / 仅一种语言 / en 混中文即红，已加入 `npm run check` 与 CI（Node 20 + 22）。
- **③ 面板/分区错位、重叠、被裁切/打不开**：首次打开清单增加「加载中…」态 + 失败 **1.2s 静默重试** +
  行内「重试」按钮；pick 视图新增「更多设置在右上『高级』」提示；英文长标签允许换行兜底；
  布局自检覆盖 4 视口（1292×826@2 / 1406×803 / 1024×700 / 900×650）× **zh + en** + Desktop 标题栏，
  7 个扩展分区全部可展开、无重叠/裁切/横向溢出（B/B2 **81/81 断言**，Desktop **10/10**）。

> **验证状态（已判定）**：最终构建 git `fe32f7f`（798,816 字符 / 829,659 字节 / 21 片段），静态链含 `i18n-audit`
> 全绿（build --check / test 61/61 / structure --strict / audit / check-css / verify / i18n-audit；
> zh=787 / en=787，referenced 619，missing/only/en-CJK 均为 0）。verifier 运行时矩阵 **4/4 运行时 PASS，
> 387/387 断言**（web 96/96 ×3 + Desktop 99/99；0 failed / 0 skipped / 0 console error），
> 三类用户问题自检 **A 7/7（语言）、B 81/81（布局 zh+en×4 视口）、C 10/10（设置持久化，含子集宿主不丢本地）**，
> Desktop 布局 10/10，旧宿主降级 17/17 PASS；详见 [docs/RELEASE-0.5.2.md](docs/RELEASE-0.5.2.md) §5.2。

> **生效方式**：纯浏览器半修复（无新增宿主路由），Ctrl+F5 即生效；build 标记从 0.5.1 → 0.5.2，只刷新时
> 页面会提示「宿主半待重启 DSH」（功能不受影响），重启一次消除提示。`tianlight.backup.host` 是本地键，不参与宿主同步。

## v0.5.1 · 天气联动与打磨

`0.5.1`（git `7282d94`；`lib/client.js` 768,962 字符 / 21 片段；`BUILD`/`HOST_BUILD` = `0.5.1`）。
v0.5.0 的 P0–P4 功能全部保留；这一版是增量补丁，同一份构建继续支持 **DSH 0.2.0 / 0.2.1 / 0.2.2**：

- **C4 天气联动补齐**（v0.5.0 未纳入 → v0.5.1 实现，**默认关**）：`tianlight.weather` 独立模型，
  **Open-Meteo 公共接口、免 API key**；城市解析 / 手动经纬度 / **仅点击触发的「使用当前位置」**；
  只显式启用且已定位才请求，15/30/60/120 分钟轮询、隐藏页跳过、8s 超时、失败静默保留上次观测；
  WMO 天气码只映射到氛围层（雨 0.55 / 雪 0.5 / 白天晴 spots 0.2 / 其它 none），不碰壁纸/叠加层/玻璃；
  面板块在 **⑨ 情境分区内**（不新增分区）。**关闭时零网络请求；开启后只请求 Open-Meteo 公开接口，无 key、无账号、无遥测。**
- **A2 真正驱动节拍**：系统音频回环激活时，用真实 audio level（~10Hz，非 rAF）驱动 Now Playing/回环节拍点；
  回环关闭时保留装饰性脉冲；低功耗/减少动效冻结；无新增全局监听器。
- **同伴英文台词修复**：台词持有 i18n key、显示时翻译；语言切换时**正在显示的气泡即时重译**（修英文模式下残留中文）；
  菜单/aria 全双语。
- **消除 cosmetic 警告**：删除 `[ui-skin-tianlight] rheostat:render Object` 调试日志（v0.5.0 每次运行 4–6 条，v0.5.1 应为 0）。
- **引擎分区 UI**：摘要改为紧凑短格式（`缓存 hit/miss · 自适应状态`，不再省略号截断）；网页壁纸增加
  「暂停会卸载沙箱页面（项目内状态重置）」提示与截断的工程 URL（仅 kind=web 显示）。

> **验证状态（已判定）**：v0.5.1 集成构建的静态链全绿（build --check / test 61/61 / structure --strict /
> audit / check-css / verify 全 exit 0）；verifier 多运行时矩阵 **4/4 运行时 PASS，387/387 断言**
> （web 96/96 ×3 + Desktop 99/99；0 failed / 0 skipped / 0 console error），旧宿主 × 新客户端降级 **17/17 PASS**，
> C4 默认关闭态 **零外部请求**（0 open-meteo），详见 [docs/RELEASE-0.5.1.md](docs/RELEASE-0.5.1.md) §8。
> v0.5.0 的 4 运行时判定（323/323）仍然有效（[docs/RELEASE-0.5.0.md](docs/RELEASE-0.5.0.md) §4）。

> **生效方式**：v0.5.1 没有新增宿主路由，但宿主 build 标记从 0.5.0 → 0.5.1；只 Ctrl+F5 时页面会提示
> 「宿主半待重启 DSH」（功能不受影响），想消除提示请**重启一次 DSH**；之后只改浏览器半仍 Ctrl+F5。

## v0.5.0 · 模块化工作台（基础版本）

同一份构建继续支持 **DSH 0.2.0 / 0.2.1 / 0.2.2**（范围 `>=0.2.0-rc.1 <0.3.0`，不加版本分支、不写构建哈希）。
这一版在 v0.4.0 的兼容底座上落地 P0–P4：

- **P0 工程地基**：宿主设置同步（`_settings`，跨浏览器）、schema 迁移 v5（旧设置自动迁移并备份）、多窗口一致（BroadcastChannel）、⑦ 工程分区（模块开关 / 渲染预算 / 语言 / 诊断）、CI 双 Node 版本静态链。
- **P1 数据与内容**：壁纸库 v2（排序 / 标签 facet / 隐藏收藏计数）、导入导出包（`.tgz`）、配方分享链接（`#tl=…`）、排版增强（内容宽度 / 段距 / 代码字号 / 阅读字体）。
- **P2 情境与可读性**：时段自适应（晨/午/黄昏/夜）、专注联动（模型生成中压暗+模糊场景）、性能自适应 v2（掉帧自动降档、原因可读可锁定）、可读性护栏（面板对比度不足时自动提亮）。
- **P3 特效与氛围**：鼠标视差、点击水波纹/火花、雨/雪/光斑氛围层、fade/slide/zoom/dissolve 转场。全部走一个 `[data-tl-fx]` 合成层与一条低功耗冻结路径，不做全屏 60Hz canvas。
- **P4 壁纸引擎**：系统音频回环（只分析不录音）、Now Playing、网页壁纸（WE `type:"web"` 沙箱 iframe）、动态分辨率（1080/1440/4k 变体按窗口×DPR 选择）、预裁剪帧缓存、可选 ffmpeg 转码（HEVC→H.264 / GIF→MP4）。
- **其它**：D6 键盘与无障碍（焦点陷阱 / aria / 直播区 / Alt+T 字体面板）、D7 zh/en 双语（接入 DSH locale，切换无需刷新）、E5 发布工具 `tools/release.mjs`。

**C4 天气联动在 v0.5.0 未纳入**；v0.5.1 已补齐（默认关、Open-Meteo 免 API key、只在显式启用且定位后联网，见上一节）。
逐项功能、降级与代码位置见 **[docs/V050-FEATURES.md](docs/V050-FEATURES.md)**；本版改动与验证状态见 **[docs/RELEASE-0.5.0.md](docs/RELEASE-0.5.0.md)**；兼容性见 **[docs/COMPATIBILITY.md](docs/COMPATIBILITY.md)**。

> **生效方式（v0.5.0 重要）**：宿主半新增路由（设置/导入导出/缓存/转码/网页壁纸），更新后需**重启一次 DSH**；页面 Ctrl+F5。之后只改浏览器半仍 Ctrl+F5 即可。旧宿主上这些新入口会静默降级/隐藏，不会报错。

### 面板新增扩展分区（接在 ①–⑥ 之后，按注册 order 排列）

扩展分区由注册表按 order 渲染在**「高级」视图**显示（pick 视图用 CSS 按 `data-tl-view` 隐藏，保持精简，属有意行为）。
最终注册顺序：**⑦ 工程 (engineering, 700) / ⑧ 特效 (effects, 800) / ⑨ 情境 (context, 810) /
⑩ 音频 (audio, 820) / ⑪ 引擎 (engine, 830)**，以及**可读性 (legibility, 840)**、**无障碍帮助 (a11y, 860)**：

| 分区 | 内容 |
|---|---|
| ⑦ 工程 | 语言开关（跟随 DSH / 中文 / English）、宿主配置 / 本地缓存状态与配置版本、schema 迁移报告、模块开关（壁纸/特效/情境/音频/桌宠/推理滑杆/排版可关；面板/取景/可读性护栏常驻）、渲染预算只读指标（fps/抖动/档位/省电原因/缓存命中/特效开销）、诊断 |
| ⑧ 特效 | 总开关、鼠标视差与幅度、点击特效风格（水波纹/火花）、氛围层（雨/雪/光斑）与密度、转场预设与时长、预算读档 |
| ⑨ 情境 | 时段自适应开关与手动时段、专注联动开关与压暗/模糊、性能自适应状态与锁定；v0.5.1 起含**天气联动块**（开关 / 城市解析 / 手动经纬度 / 使用当前位置 / 15–120 分钟轮询 / 立即刷新 / 隐私说明） |
| ⑩ 音频 | 系统音频回环的启用/停止与状态、当前媒体标题/艺术家、失败原因（不支持/被拒/无设备）；v0.5.1 起回环激活时两个节拍点由真实音频电平（~10Hz）驱动 |
| ⑪ 引擎 | 分辨率变体与缓存状态/清空、可选转码按钮、性能自适应状态与锁定；v0.5.1 起摘要紧凑（`缓存 hit/miss · 自适应状态`）、网页壁纸显示暂停语义提示与截断工程 URL |
| 可读性 / 无障碍 | 可读性护栏开关与对比度阈值；无障碍帮助与快捷键列表（焦点陷阱/aria/直播区） |
| ⑥ 内 | 导入导出包（`.tgz`）与配方分享链接（`#tl=…`）入口 |

**快捷键**：`Alt+W` 打开/关闭壁纸面板，`Alt+T` 打开/关闭字体面板，`Esc` 关闭面板；面板内 `Tab`/`Shift+Tab` 在面板内循环（焦点陷阱，关闭后焦点归还触发按钮）。
**语言**：⑦ 工程分区切换「跟随 DSH / 中文 / English」，立即生效；显式选择会同步切换 DSH 语言，locale 服务缺席时只切天光自己的文案。

## 版本历史

- **v1.6.4（2026-11-10）**：正式版（公开 v1.0.3）——桌宠「AI 对话」（输入条+气泡回复、识别图片/视频形象、顶部自动翻转、权限/配额不变）；每个自定义形象一套动作名+回复（按 mediaId 生效、只提交改动项、切语言不冻结）；中枢形象文件名常显列表 + 下拉选项可读性修复；全代码审查修复 H1/H2/M1/M2/M3/M4/M5。详见 [docs/RELEASE-1.6.4.md](docs/RELEASE-1.6.4.md) 与 [docs/REVIEW-1.6.4.md](docs/REVIEW-1.6.4.md)。
- **v1.6.3（2026-11-10）**：显示名统一为「天光」（`skin.json.name` + README 标题；skin id/包名/data 属性/设置键不变，无迁移成本）；完成 DSH 0.2.0-rc.2 / 0.2.1-rc.5 / 0.2.2-rc.1 三线兼容性实证（bundles 72/77/86、三行 verdict COMPATIBLE、hook-scan 与 upgrade-check 全绿，桥分层发现无需版本分支）；公开上传版本命名为 **v1.0.2**（内部构建 1.6.3）。详见 [docs/RELEASE-1.6.3.md](docs/RELEASE-1.6.3.md)。
- **v1.6.2（2026-11-10）**：移除壁纸左上角固定「晨光/太阳」装饰（`src/30-wallpaper.js` 的 `CREST_SVG` + `[data-tl-crest]`，每张壁纸重建场景都会出现、固定在 top:-120/left:-140、opacity .42）；场景层顺序与 veil 天空光渐变保留，纯视觉修复；公开上传版本命名为 **v1.0.1**（内部构建 1.6.2）。详见 [docs/RELEASE-1.6.2.md](docs/RELEASE-1.6.2.md)。
- **v1.6.1（2026-11-10）**：液态玻璃 v2（OriginOS 风：更厚磨砂、多层 specular、1px 亮暗边、外柔光、细噪点、柔和回弹）；修复侧栏「新会话」按钮深色块并玻璃化（全档位，off 也修复）；DSH 主界面右上新增常驻天气胶囊（五状态、点击打开角色中枢天气卡，不新增网络/权限）；公开上传版本命名为 **v1.0.0**（内部构建 1.6.1）。详见 [docs/RELEASE-1.6.1.md](docs/RELEASE-1.6.1.md)。
- **v1.6.0（2026-11-10）**：安全上限整体上调（主动开口 12/50；本地 chat 20/分、1200/天，输入 1000 字；LLM 日 60/上限 120、分钟 6、输入 1000/输出 1200 字、20s 超时；AI Agent 日 30/上限 100、输入 1000 字/120s；中枢预算 0..50）；液态玻璃全覆盖（侧栏/设置/壁纸库/中枢/对话框/菜单/列表框/输入区/气泡/胶囊/提示，无壁纸场景自动兜底，off 零变化、低电量/15fps 降级）；权限模型与「驱动 DSH 永久禁止」不变。详见 [docs/RELEASE-1.6.0.md](docs/RELEASE-1.6.0.md)。
- **v1.5.0（2026-11-10）**：可见性修复——液态玻璃默认柔和档、强度提升 + 中枢预览；天气卡上桌（启用/城市/定位/刷新/状态）；桌宠形象一键恢复默认；中枢一键自检；GitHub issue 模板 + 应用内反馈面板。详见 [docs/RELEASE-1.5.0.md](docs/RELEASE-1.5.0.md)。
- **v1.4.0（2026-11-10）**：权限模型调整——「驱动 DSH」永久禁止；联网/文件/命令/代审批/代发消息/安装改为用户可显式授予的高风险权限（默认关、二次确认、可撤销、审计；皮肤不内置实现，需注册能力适配器才可调用）。详见 [docs/RELEASE-1.4.0.md](docs/RELEASE-1.4.0.md)。
- **v1.3.0（2026-11-10）**：角色入口收进桌宠——删除设置页「角色 / 生活」与侧栏「角色」按钮，右键桌宠 / 桌宠菜单「角色中枢」为唯一入口；生活节奏设置并入中枢（26 片段）。详见 [docs/RELEASE-1.3.0.md](docs/RELEASE-1.3.0.md)。
- **v1.2.0（2026-11-10）**：右键桌宠直达角色中枢；接入真实 DSH Agent（受控 `agentChat`：默认关、显式授权、仅用户手动提问、目标会话由用户选择、日≤10/≤500 字/60s/单飞、只 list/create/prompt/follow、审计+可断开、`agent` 自主执行仍永久禁止）。详见 [docs/RELEASE-1.2.0.md](docs/RELEASE-1.2.0.md)。
- **v1.1.0（2026-11-10）**：角色中枢（侧栏入口 + 全屏面板：生活/专注/静音/玻璃/形象/记忆/AI/权限/审计）、AI 桌宠（本地大脑 + 可选用户授权 LLM 适配器 + 严格能力白名单与 7 项永久禁止 + 硬上限 + 审计 + 暂停开关）、形象支持本机直接上传图片/视频（≤32MiB）；无宿主路由改动。详见 [docs/RELEASE-1.1.0.md](docs/RELEASE-1.1.0.md) 与 [docs/AI-PET-PERMISSIONS.md](docs/AI-PET-PERMISSIONS.md)。
- **v1.0.0（2026-11-10）**：正式版——桌宠升级为多功能角色智能体（虚拟时钟/每日作息/主动开口预算/跨会话记忆/职责提醒闸门与延迟回放）、可替换形象（图片或 ≤32 MiB 视频）、可选液态玻璃三档（真实/柔和/磨砂，自动降级）、角色设置页、专注计时、互动记忆；节能与稳定性优化；无宿主路由改动。详见 [docs/RELEASE-1.0.0.md](docs/RELEASE-1.0.0.md)。
- **v0.7.0（2026-11-10）**：职责通道——浏览器半新增 `globalThis.tianlightDuty`（`send/subscribe/status/clear`）与 `tianlight:duty` / `tianlight:duty-action` 事件；桌宠新增带选项按钮的职责气泡（`interrupt`）、普通短句（`speak`）、清理（`clear`），回传 `choice`/`timeout`；fail-closed、`companion-off` 降级、键盘可达、与普通台词隔离。**只改浏览器半，无需重启 DSH**。详见 [docs/DUTY-CHANNEL.md](docs/DUTY-CHANNEL.md)。
- **v0.6.0（2026-11-10）**：Wallpaper Engine 库集成——宿主半自动发现/扫描本机 WE 工坊与 projects（本机 35 条），纯 JS `scene.pkg`/TEX 解 4K 静态图，新增 `/api/we-wallpaper/*` 路由；客户端第 22 片段 `72-we-library` 提供设置导航页 + 侧栏按钮 + 全屏浮层，快捷选择器自动显示 WE 卡片，高级 ① 自动检测；可选场景动态缓存（Windows-only）。详见 [docs/RELEASE-0.6.0.md](docs/RELEASE-0.6.0.md)。
- **v0.5.3（2026-11-09）**：大修版（无新功能）——壁纸快捷选择重做为纯视觉缩略图网格（pick 移除上传/URL/WE/GLSL 导入、更多设置↔返回快捷选择、手柄/Alt+W 默认打开快捷选择）；整页点击无响应（产品残留 modal mask）用 1290–1320 z-index 抬升 + 保留键盘路径；C3 自适应默认关 + 仅 visible&focused 采样/5 次≥10s/5 分钟冷却/聚焦清除；语言显式选择只切皮肤文案、不再联动 DSH 语言；天气/情境安全默认全 OFF + ⑨ 恢复默认；frame-cache miss 静音 + 音频告警仅用户触发。详见 [docs/RELEASE-0.5.3.md](docs/RELEASE-0.5.3.md)。
- **v0.5.2（2026-11-09）**：自检修复——设置数据安全（宿主子集不再清空本地、导入前备份 `tianlight.backup.host` + ⑦ 恢复入口、首启全量推送/失败重试）、i18n 完整性（补 en、30 getter 化、55 detailKey、动态拼接改字面量、新增 `tools/i18n-audit.mjs` 并纳入 check/CI）、面板体验（清单加载态 + 1.2s 重试 + 重试按钮、pick 视图高级提示、英文长标签换行；布局自检 zh+en×4 视口 81/81 + Desktop 10/10）。**不含新功能**。详见 [docs/RELEASE-0.5.2.md](docs/RELEASE-0.5.2.md)。
- **v0.5.1（2026-11-09）**：C4 天气联动（默认关、Open-Meteo 免 key、只显式启用后联网）、A2 真实电平节拍、同伴英文台词重译、删除 cosmetic rheostat 警告、引擎摘要/网页壁纸提示打磨。详见 [docs/RELEASE-0.5.1.md](docs/RELEASE-0.5.1.md)。
- **v0.5.0（2026-11-09）**：模块化工作台——宿主设置同步 / schema 迁移 / 模块开关 / 渲染预算 / 特效与情境 / 系统音频 / 网页壁纸 / 导入导出包与分享链接 / 双语与无障碍。4 个运行时 323/323 断言 PASS，旧宿主降级 17/17 PASS。详见 [docs/RELEASE-0.5.0.md](docs/RELEASE-0.5.0.md)。
- **v0.4.0（2026-11-09）**：同一份构建实测支持 DSH 0.2.0 / 0.2.1 / 0.2.2；新增 `tools/compat-matrix.mjs` 与运行时诊断 `__dshTianlightInstance.features`；`skin.json` 增加兼容范围/实测字段。详见 [docs/RELEASE-0.4.0.md](docs/RELEASE-0.4.0.md)。
- **v0.3.0（2026-11-09）**：针对 DSH Desktop 0.2.1-rc.3 的彻底重做——桌面标题栏 40px 安全区、面板每次打开重挂载、选择器桥「只盖最外层 + 槽位作用域」、单例热重载清理、面板填充可读性下限、Esc 关闭、宿主半加固。详见 [docs/RELEASE-0.3.0.md](docs/RELEASE-0.3.0.md)。
- **v0.2.x**：运行时选择器桥（CSS 零哈希依赖）、播放状态总线/看门狗、壁纸库与轮播、WebWallGL 场景通道。详见 [docs/MAJOR-UPGRADE.md](docs/MAJOR-UPGRADE.md)。

## 特性

### 壁纸与播放
- **动态壁纸**：全屏循环视频，固定在图层最底，应用整体抬升一层
- **可替换壁纸**：任意 `mp4 / webm / mov / m4v / png / jpg / jpeg / webp / avif / gif / svg` 放进 `assets/` 自动识别；也可从「网址导入」粘贴远程直链（无扩展名会自动探测图片/视频，不是直链会明确报错）；格式限制见 [docs/FORMATS.md](docs/FORMATS.md)
- **静态帧**：从当前视频抓 6 帧，点一帧固定为静态壁纸，可一键回到动态；跨域 URL 会被浏览器拦取帧
- **一眼换壁纸（v0.5.3 快捷选择）**：点边缘手柄或按 **Alt+W** 直接打开**纯视觉缩略图网格**（2 列大卡片、使用中高亮、点击立即切换 + toast）；pick 视图不含上传/URL/WE/GLSL 导入，这些只在右上「更多设置」的高级视图；顶部保留 `全部 / 本地 / WE` chips、搜索与排序
- **入口**：左侧「壁纸」标签可打开；标签被侧栏/任务栏挡住时，按 **Alt+W** 打开或关闭面板；**Esc** 关闭面板
- **播放恢复**：面板顶部显示**真实播放状态**（动态播放中 / 已暂停 / 自动播放被拦截 / 省电暂停 / 静态帧 / 画面卡住 / 加载失败），并给出原因与一键恢复；60 秒看门狗 + 页面可见/窗口聚焦重试
- **播放控制**：取景段支持暂停/继续（刷新后仍保持）、0.5–1.5x 倍速与水平翻转
- **画面滤镜**：亮度/对比度/饱和度，**默认关闭**；开启后才有全屏合成成本，掉帧时面板提示先关掉
- **自动轮播**：顺序或随机、30 秒到 10 分钟、只轮播收藏；页面隐藏、省电或手动暂停时顺延；先准备下一张再切换，坏文件跳过；隐藏的壁纸不参与
- **壁纸库 v2（v0.5.0）**：搜索 + 标签 facet 多选 + 排序（名称/类型/最近使用/收藏优先）+ 隐藏/恢复（只改列表，不删文件、不打断播放）；卡片显示类型、文件大小；顶部显示源分辨率、时长与实测 FPS/帧间隔抖动
- **首开不再像“0 张”**（v0.5.2）：清单首次加载显示「加载中…」；失败先 1.2s 静默重试一次，两次失败才显示错误与行内「重试」按钮；宿主 build 过旧会提示重启 DSH。pick 视图另有「更多设置在右上『高级』」提示
- **上传壁纸**：面板内选择图片/视频，默认上限 **512MB**（`TIANLIGHT_UPLOAD_MAX` 可调）；宿主流式落盘到 `assets/uploads/`，只接受图片/视频扩展名，同名自动加 `-1` 而不是覆盖；中文/4K 文件名会清洗成可播放的 ASCII 名
- **叠加层**：A/B 两槽，预设（暗角/颗粒/光晕/扫描线）或图片（本地/URL），不透明度 + 混合 + 交换层级，纯 CSS 叠在任意壁纸之上
- **玻璃面板（液态玻璃 v2，v1.6.1 起）**：`depth != off` 时统一覆盖全部界面——侧栏、设置面板、壁纸库、角色中枢、对话框、菜单、列表框、输入区、气泡、胶囊、提示，以及侧栏「新会话」按钮与主界面天气胶囊；v2 配方 = 更厚磨砂 + 更高饱和 + 多层 specular（左上径向 + 对角 sheen）+ 1px 亮/暗边（`--tl-liquid-rim`）+ 外柔光 + 细噪点（`--tl-liquid-grain`）+ hover/active 柔和回弹，三档 blur/sat 整体上调；**每视口只留一层模糊**（有场景用场景层、无场景用兜底层，浮层菜单与输入区沿用自身 blur；大面板与气泡不叠实时 blur，保证长会话滚动与视频流畅）；输入控件（`input`/`textarea`/`[contenteditable]`）只加描边/微高光、不加 blur；无壁纸场景时自动补一层玻璃兜底；`off` 档零变化（保持 v1.4 前观感，唯一例外是 v1.6.1 的新会话深色块修复），低电量/15fps 与减少动效自动降级
- **亮/暗双主题**：两套 token，均保持壁纸可见

### 引擎 / 音频（v0.5.0）
- **ShaderToy 风格壁纸**：本地 GLSL 片段着色器（`iTime` / `iResolution` / `iMouse` / 可选 `u_audio`），预设极光/星云/水波/音频极光，速度/强度/色相滑块；编译失败只提示、不换掉当前壁纸
- **WebWallGL 场景**：可选的 Wallpaper Engine 场景通道（内置 MIT 的 WebWallGL 3.0，`vendor/webwallgl/`），在**沙箱 iframe**里实时渲染 `project.json` + `scene.pkg`；首帧超时/引擎失败自动退回上一张可播壁纸或视频
- **网页壁纸（A3）**：WE 目录中 `project.json` 声明 `type:"web"`（或入口 `.html`）的项目在清单出现，经 opaque-origin 沙箱 iframe 渲染；失败/20s 超时回落上一张；暂停/省电时卸载 iframe，重播放会重挂载（项目内部状态丢失）
- **动态分辨率（A4）**：同一素材的 `name.1080` / `name.1440` / `name.4k`（及 `-1080p` 等）变体按窗口宽 × DPR 自动选择，resize 防抖后交叉淡入切换，不黑屏；变体需按文件名约定提供（不做内容探测）
- **预裁剪缓存（A5）**：首帧按窗口比例裁剪写入宿主 `state/frame-cache/`，下次首屏用缓存图垫底；⑪ 引擎分区显示命中状态并可清空；best-effort，失败时直接实时帧
- **可选转码（A6）**：本机有 ffmpeg 时对 HEVC/GIF 上传件显示「转 H.264 / MP4」，转完自动进清单；没有 ffmpeg 就隐藏；失败/超时不覆盖源文件
- **系统音频回环（A1）**：用户手势后在系统弹窗勾选「分享音频」，采集系统/标签页音频做实时分析（不录音、不留存），驱动音频响应着色器（`u_audio`）；不支持/被拒/无设备有明确提示
- **Now Playing（A2）**：纯只读读取 MediaSession 元数据，在 ⑩ 显示当前媒体；拿不到就静默隐藏。v0.5.1 起系统音频回环激活时，两个节拍点由**真实音频电平**（~10Hz，非 rAF）驱动；回环关闭时保留装饰性脉冲；低功耗/减少动效冻结
- **音频响应 v1**：ShaderToy 的「音频极光」预设可接麦克风实时电平；只在手动启用后分析，关面板/省电/切走/页面隐藏自动释放
- **性能档位**：ShaderToy 与侧栏镜像可选 自动 / 60 / 30 / 15fps；视频按源帧率原生播放；顶部显示实测视频 FPS

### 特效 / 情境（v0.5.0）
- **B1 鼠标视差**：场景层随指针轻微位移，幅度可调，默认关；低功耗/减少动效/掉帧自动禁用
- **B2 点击特效**：点击处水波纹或火花，单层 canvas、30fps 上限、可关；面板/输入框内不触发
- **B3 氛围层**：雨/雪/光斑，低帧率粒子场、密度可调；省电/减少动效时冻结，与叠加层互不覆盖
- **B4 转场**：fade/slide/zoom/dissolve + 时长（200–1500ms）；用上一帧快照做交叉过渡，切源保持音频状态；减少动效时跳过
- **C1 时段自适应**：按本地时钟 dawn/day/dusk/night 调整外观（叠加层/玻璃/氛围/画面压暗），不换壁纸；手动时段优先
- **C2 专注联动**：检测 `[data-chat-running]`，生成中压暗+模糊场景，结束恢复；有独立开关，不覆盖手动暂停
- **C3 性能自适应 v2**：按实测帧率/抖动自动降档（着色器 60→30→15、视频→静态帧），原因可读、可锁定；采样约 2s，降为静态帧后 60s 再探测；省电监管仍然优先
- **C4 天气联动（v0.5.1）**：默认关的独立 `tianlight.weather` 模型；城市解析 / 手动经纬度 / 仅点击触发的「使用当前位置」；开启且已定位后按 15/30/60/120 分钟轮询 Open-Meteo（**免 API key**），按 WMO 天气码只切换氛围层（雨/雪/白天晴光斑/其它关闭），不碰壁纸/叠加层/玻璃；8s 超时、失败静默保留上次观测；与 C1 同时开启时最后写入者为准（面板有冲突提示，建议二选一）。**v1.6.1**：DSH 主界面右上新增常驻**天气胶囊**（只读 `tianlightWeather.summary()`，五状态 off/no-location/waiting/error/ready，点击/键盘打开**角色中枢天气卡**；不自动启用、不新增网络请求与权限）
- **D5 可读性护栏**：面板打开/壁纸变化时采样对比度，不足时只提亮面板底色与文字阴影（不改壁纸），阈值可调

### 面板 / 库 / 分享（v0.5.0）
- **精选配方**：内置卡片一键套用；`presets/` 提供可分享 JSON；不联网
- **导入导出包（D2）**：⑥ 导出/导入整包（`.tgz`：清单 + 设置 + 配方 + 上传壁纸）；显示导入/跳过数量，设置写入宿主后**刷新页面统一生效**，失败不丢当前配置
- **配方分享链接（D3）**：生成 `#tl=…` 链接（配方 v2）；打开后提示「检测到共享配方」并确认后应用；非法链接只清 hash，绝不写设置
- **模块开关**：壁纸、特效、情境、音频、桌宠、推理滑杆、排版七个模块可关；关闭即移除 DOM 与监听器，再打开重新安装
- **宿主设置同步**：`tianlight.*` / `dsh-tianlight:*` 设置存插件目录 `state/settings.json`，跨浏览器一致；宿主不可用时自动退回本地存储
- **多窗口一致**：同浏览器多窗口设置同步（最后写入者为准）
- **设置数据安全（v0.5.2）**：宿主导入不再删除本地独有的键（宿主有的键按宿主落地、显式 null 墓碑仍删除、本地独有键保留并回推宿主）；导入前自动备份到本地键 `tianlight.backup.host`（**不参与宿主同步**），⑦ 工程分区可用「恢复宿主导入前备份」；首启全量推送、推送失败重试一次

### 排版 / 无障碍 / 双语（v0.5.0）
- **排版面板（Aa，Alt+T）**：字号滑杆、界面字族、代码字族、字重、行距、字距、一键复位；v0.5.0 新增内容最大宽度、段距、代码字号、阅读字体（系统/衬线），只作用于消息正文与代码块
- **D6 键盘与无障碍**：壁纸/字体面板焦点陷阱、打开聚焦与关闭归还、`role="dialog"` + `aria-modal` + `aria-label`、直播区播报；快捷键 Alt+W / Alt+T / Esc / Tab
- **D7 zh/en 双语**：语言切换无需刷新；**v0.5.3 起显式「中文 / English」只切皮肤文案，不再联动 DSH 界面语言**，要跟随 DSH 请选「跟随 DSH」；非 React 文案走 `data-tl-i18n-key`/`data-tl-i18n-title-key` 契约刷新；新 UI 文案全部走 `TL_T`/`useTl5I18n`；v0.5.2 新增 `tools/i18n-audit.mjs` 做静态完整性审计（缺 key / 仅一种语言 / en 混中文即红），已纳入 `npm run check` 与 CI
- **推理档位滑杆**：弹簧阻尼、连续拖拽、档位吸附，走官方 `remote.session.modelCatalog / selectModel`
- **薄荷小猫**：可拖拽、会呼吸、靠近会回应、点击打开互动菜单；v0.5.1 起台词以 i18n key 保存、**显示时翻译**，语言切换时正在显示的气泡会即时重译（修英文模式下残留中文），菜单/aria 全双语

## 安装

本皮肤是**标准 DSH bundle**：`package.json` 的 `dsh.bundle.patch` 指向包内自带的 `cordis.patch.yml`，由它插入 `ui-skin-tianlight` 这一行；浏览器半由 `dsh.client` 提供。**只安装这一个包即可**，旧教程里的第二个 enable bundle（`@local/dsh-enable-tianlight`）已废弃，不要再装。

### DSH Desktop（0.2.0 / 0.2.1 / 0.2.2，单包安装）

1. 把本仓库目录（或解包后的 `dsh-client-ui-skin-tianlight-0.6.0/` 目录）放到任意位置，建议用纯 ASCII 路径。
2. 在 DSH Desktop 的**插件管理器**里选择「安装本地目录 / Install from local folder」，指向该目录。Desktop 的 profile（本版为 `desktop`）由 Electron 管理，**不要**手动编辑 profile 目录下的 `package.json` / `cordis.patch.yml`；安装器会以 `link:` 依赖引用本包，并且只登记 `@dsh-external/dsh-client-ui-skin-tianlight` 这一条 bundle。
3. 确认 `ui-skin-tianlight` 这一行处于 **enabled** 状态。该行由本包的 `cordis.patch.yml` 自带，profile 的 `cordis.patch.yml` 不需要、也不应该再手写同 id 的行（重复插入会重复挂载插件）。
4. **重启 DSH Desktop**（v0.5.0 宿主半新增路由，必须重启一次）。之后只改浏览器半（`src/` → `lib/client.js`）时 Ctrl+F5 刷新即可，不用重启。

> **关键前提**：机器级 `$DSH_HOME/cordis.patch.yml`（Windows 默认 `%USERPROFILE%\.dsh\cordis.patch.yml`）的优先级**高于** bundle 自带的 patch。如果里面残留旧 skin-manager 生成的 `ui-skin-tianlight` + `disabled: true`，行的 enabled 会被覆盖、皮肤静默不出现——删掉该行再重启。处理见下方「故障排查」第 1 条。

### 命令行 `dsh web`（可选）

不用 Desktop 时，Web profile 也是同一种单包安装：把本包以目录链接或 `link:` 依赖放进 profile 的 `node_modules`，在 profile 的 `package.json` 里依赖本包，并在 `dsh.profile.bundles` 中登记 `@dsh-external/dsh-client-ui-skin-tianlight`。行仍由 bundle 自带的 patch 插入，不需要手写。

> **v0.5.0 新增宿主能力**（设置存储 / 导入导出包 / 预裁剪缓存 / 可选转码 / 网页壁纸），所以安装或更新后需要**重启一次 DSH**；之后只改 `src/` 的浏览器半仍只需 Ctrl+F5。设置与缓存写在插件目录的 `state/`（git 忽略、per-machine），`ffmpeg` 是可选的系统命令。
>
> **v0.5.1**：没有新增宿主路由，但宿主 build 标记从 `0.5.0` → `0.5.1`。只 Ctrl+F5 时面板会提示「宿主半待重启 DSH」
> （功能不受影响），重启一次即可消除提示。
>
> **v0.6.0 新增宿主路由**（`/api/we-wallpaper/*` + `_wallpapers`/`_engines` 的 additive 字段）：
> 安装/更新后必须**重启 DSH 一次**，再 Ctrl+F5；之后只改浏览器半仍 Ctrl+F5。旧宿主（仅新客户端）WE 库不可用
> （页面提示「宿主半尚未提供壁纸库接口」），其余功能正常。

> `assets/uploads/` 是**用户数据**（面板「上传壁纸」落盘的图片/视频），`state/` 是设置与缓存，`assets/derived/` 是转码产物——都不属于发布包、不随仓库提交；发布或迁移时请自行保留/备份。发布包（`node tools/pack.mjs`）默认只含代码、清单、`lib/`、`vendor/`、`presets/` 与 `assets/README.md`，不含上传、缓存与派生文件。

## 故障排查

### 1. 皮肤不出现，`ui-skin-tianlight` 被禁用（home patch 覆盖）

机器级 `$DSH_HOME/cordis.patch.yml`（Windows 默认 `%USERPROFILE%\.dsh\cordis.patch.yml`）的优先级高于 bundle 自带的 patch。检查其中是否有一条旧 skin-manager 生成的：

```yaml
- id: ui-skin-tianlight
  disabled: true
```

有的话整段删掉（或把 `disabled` 改为 `false`）后重启 DSH。这个旧行通常是以前用 Web 皮肤管理器安装时留下的；一个 profile 里只应有一条 `ui-skin-tianlight` 行，不要靠 home patch 再写一遍，避免管理器以后重写 home patch 又把 Desktop 禁用。

### 2. 端口 / origin 变化后设置“像丢了”

皮肤状态优先从宿主设置文件读取（v0.5.0 起跨浏览器）；宿主不可用时退回浏览器 `localStorage`，它按 **origin**（协议 + 主机 + 端口）隔离。DSH 换了端口、从 Web profile 换到 Desktop profile、或用另一个地址打开，且宿主设置也不可用时，会读到新 origin 的默认值。回到原来的地址/端口即可恢复；确实换了 origin 就重新设置一次——这不是皮肤丢配置。

### 3. Windows 上视频壁纸自动暂停，面板显示「省电暂停」

Windows 开启「减少动态效果 / Reduce motion」后，皮肤省电模式（auto）会跟随 `prefers-reduced-motion` 自动暂停动态壁纸。面板点「关闭省电并播放」，或把省电模式设为关；也可以到 Windows 设置 → 辅助功能 → 视觉效果 → 动画效果 关闭「减少动态效果」。这不是加载失败。

### 4. v0.5.0 的入口不见了（⑦–⑪ 分区 / 导入导出 / 转码 / 网页壁纸）

这些能力依赖 v0.5.0 宿主路由。**升级后没有重启 DSH** 时，客户端会看到旧宿主：设置退化为本地模式，导入导出/缓存/转码/网页壁纸入口自动隐藏（不会报错弹窗）。先在 DSH 之外结束旧进程再启动，然后 Ctrl+F5。检查方法：DevTools Console 执行 `__dshTianlightInstance.settings()` 与 `fetch('/skin-tianlight/_engines?build=0.5.0').then(r=>r.json())`，`build` 应为 `0.5.0`、`capabilities` 含对应能力。

### 5. 系统音频 / 转码按钮不可用

系统音频回环需要浏览器支持 `getDisplayMedia({audio:true})` 且用户在面板里手动点启用（拒绝后可在 ⑩ 重试）；转码需要本机有 `ffmpeg`（`FFMPEG_PATH` 可指定），没有时按钮隐藏、原文件仍按原格式尝试播放。这两项都是「有则用、无则降级」，不是安装依赖。

### 6. 网页壁纸 / 场景只显示预览

网页壁纸只识别 WE 目录中 `project.json` 声明为 `web` 的项目；场景需要 WebGL2 与 `scene.pkg`/`scene.json`。引擎或首帧失败会自动回落上一张可播壁纸。检查来源目录是否配置在「WE 目录」里、目录名是否为 ASCII。

## 壁纸

### Wallpaper Engine 库（v0.6.0，自动检测）

装了 Wallpaper Engine 就直接用，**不需要填任何目录**：

- 打开 **设置 →「壁纸」页**（皮肤注册的 `tianlight-wallpaper` 设置分区）、点侧栏 Settings 旁的壁纸按钮，
  或按面板里的「打开壁纸库」——都进入同一个全屏库：预览网格、搜索、类型筛选、刷新、使用中高亮；
  点一张立即应用（video/image → 原文件，web → 沙箱网页，scene → 解出的 4K 静态图）。
- **快捷选择器**里也会自动出现「壁纸引擎 N」来源与卡片（预览优先、视频/场景/网页徽标、场景提示「静态高清」）。
- 场景想要动态效果：在库页对场景点「生成动态」（Windows + `wcap` 可用时；其它情况给出可读的 503 原因，
  默认仍以高清静态应用）。
- 旧的手动目录仍保留在 **高级 ①「高级（手动路径）」** 里作为兜底；自动检测结果见 ① 的「已检测到 N 张
  （Steam 工坊 x / projects y）」行。
- WE 未安装 / Steam 未启动时显示「未检测到」空态，不报错、不影响其它壁纸。

### 本地文件与来源优先级

来源优先级从高到低：

1. **手动选择**：壁纸面板 → 清单卡片（本地 / 上传 / WE 视频图片 / WE 场景 / WE 网页 / URL / ShaderToy）
2. **自动**：`bg-main.mp4` → `bg-4k.mp4` → 其它视频 → 第一张图片 → 内置渐变

替换壁纸**不需要改代码**，放文件即可：

```text
assets/
  bg-main.mp4     ← 首选视频
  bg-4k.mp4       ← 备选 / 4K
  rain.webp       ← 图片也可以，会作为静态壁纸
  cat.png         ← 桌宠素材，不参与壁纸候选
```

缺文件时逐级降级，**不会白屏**。动态分辨率变体按 `bg-4k.2160.mp4` / `bg-4k.1080.mp4` 这类后缀识别。

## 兼容性

| 项 | 说明 |
|---|---|
| 支持范围 | **DSH 0.2.0 / 0.2.1 / 0.2.2**（`>=0.2.0-rc.1 <0.3.0`），一份构建通用；矩阵见 [docs/COMPATIBILITY.md](docs/COMPATIBILITY.md) |
| 测试版本 | 真实运行时实测：`0.2.0-rc.2`、`0.2.1-rc.5`（npm）、`0.2.2-rc.1`（npm + 本机 Desktop 实机）；`0.2.1-rc.3` Desktop 为 v0.3.0 基线 |
| v0.5.0 验证状态 | 已整合 git `72d72fe`：724,684 字符 / 21 片段，静态链全 PASS（test 61/61）；运行时矩阵 **4/4 运行时 PASS，323/323 断言，0 console error**（web 80/80 ×3 + Desktop 83/83），旧宿主 × 新客户端降级 **17/17 PASS**；详见 [docs/RELEASE-0.5.0.md](docs/RELEASE-0.5.0.md) §4、残余风险 §9 |
| v0.5.1 验证状态 | 已整合 git `7282d94`：768,962 字符 / 21 片段，静态链全 PASS（test 61/61）；运行时矩阵 **4/4 运行时 PASS，387/387 断言**（web 96/96 ×3 + Desktop 99/99；0 failed / 0 skipped / 0 console error），C4 默认关闭态零外部请求（0 open-meteo），旧宿主降级 17/17 PASS；详见 [docs/RELEASE-0.5.1.md](docs/RELEASE-0.5.1.md) §8 |
| v0.5.2 验证状态 | 已整合 git `fe32f7f`：798,816 字符 / 829,659 字节 / 21 片段，静态链含 i18n-audit 全 PASS（test 61/61；zh=787 / en=787，missing/only/en-CJK 0）；运行时矩阵 **4/4 运行时 PASS，387/387 断言**（web 96/96 ×3 + Desktop 99/99；0 failed / 0 skipped / 0 console error）；自检 A 7/7（语言）、B 81/81（布局 zh+en×4 视口）、C 10/10（设置持久化 + 子集宿主不丢本地）、Desktop 10/10、旧宿主降级 17/17；详见 [docs/RELEASE-0.5.2.md](docs/RELEASE-0.5.2.md) §5.2 |
| v0.5.3 验证状态 | 已整合 git `73b378d`：827,150 字符 / 859,341 字节 / 21 片段，build --check 21/21，静态链含 i18n-audit 全 PASS（test 61/61）；运行时矩阵 **4/4 运行时 PASS，387/387 断言**（web 96/96 ×3 + Desktop 99/99；0 failed / 0 skipped / 0 console error）；真实鼠标 **P1–P5 39/39**（picker/z-mask/语言/console/天气情境）；旧宿主降级 17/17；详见 [docs/RELEASE-0.5.3.md](docs/RELEASE-0.5.3.md) §8 |
| v0.6.0 验证状态 | 已整合 git `acb17a6`：896,889 字符 / 930,994 字节 / **22 片段**，build --check 22/22、**test 67/67**、structure/audit/check-css/verify/i18n-audit 全绿；W 自检 v0.2.2 web **23/23**、v0.2.2 Desktop **23/23**；4-runtime 全量矩阵见 `diag/skinlab/V060-VERDICT.md`；host 真实本机 WE 35 条（`_wallpapers` 38、`_engines.weLibrary`）；详见 [docs/RELEASE-0.6.0.md](docs/RELEASE-0.6.0.md) §6 |
| WE 集成（v0.6.0） | 宿主半新增第二路由前缀 `/api/we-wallpaper/*`（list/preview/media Range/pkg/web/scene-video 503/diagnostics/state），`_wallpapers`/`_engines` 只做 **additive**；旧宿主上 WE 路由 404 → 页面提示重启/更新，其它功能正常；场景动态缓存 **Windows-only** |
| 行为变更（v0.5.3） | 皮肤语言显式选择**不再切换 DSH 界面语言**（DSH 语言归 DSH 设置；要跟随请选「跟随 DSH」）；C1/C2/C3/C4 默认 OFF（已持久化选择保留）；新增本地键 `tianlight.cache.known`（不参与宿主同步） |
| 设置数据安全 | v0.5.2 起：宿主有的键权威、显式 null 仍删除、本地独有键保留并回推；导入前备份 `tianlight.backup.host` 是**本地键**（`tianlight.backup.` 前缀不参与宿主同步，256KB 上限）；⑦ 有「恢复宿主导入前备份」 |
| 最低要求 | 支持 `dsh.client` 的版本（`0.1.5` 起）；自动桥接的正式验证范围见上 |
| v0.5.0 / v0.5.1 / v0.5.2 / v0.5.3 / v0.6.0 依赖的稳定钩子 | `[data-chat-running]`（专注联动）与 locale 服务（双语）在三条线均存在；选择器桥未改，CSS 仍零哈希依赖；v0.5.1 没有新增 DSH 钩子/宿主路由（C4 只用标准 `fetch`）；v0.5.2/v0.5.3 是修复版；**v0.6.0 新增第二 webServer 前缀 `/api/we-wallpaper` + `slots` 的 `settings.section`/`sidebar.footer.action`（均为 additive，缺失时降级）** |
| 旧宿主降级 | v0.5.0 宿主路由在旧宿主上 404 → 对应入口隐藏/退化为本地模式，既有壁纸/面板/特效功能不受影响；v0.5.1 / v0.5.2 / v0.5.3 无新路由，只有 build 标记变化；**v0.6.0 的 WE 路由在旧宿主 404 → 壁纸库页面提示「宿主半需重启/更新」，其余功能正常（该组合未真机复验，见兼容性文档）** |
| 联网 / 隐私 | 默认**零网络请求**；唯一可选联网是 C4 天气：显式启用且已定位后只请求 Open-Meteo 公共接口（**免 API key、无账号、无遥测**，只发送城市名或坐标），失败静默保留上次观测；**v1.6.1 主界面天气胶囊只读本地 `summary()`，不新增网络请求**；其余功能完全离线 |
| 服务缺失 | `theme` / `layout` / `slots` / `remote` / `locale` 全部按可选处理；缺失时对应功能降级 |
| 换版本 | 0.2.x 内不需要改任何字段；跨 0.3 大版本更新 `skin.json` 的 `dshCompatibilityRange` 并可先跑 `npm run compat` |
| 运行时诊断 | DevTools：`__dshTianlightInstance.features`（钩子层）、`.modules()`（模块开关状态）、`.settings()`（宿主同步状态）、`.metrics()`（渲染预算）、`.diag()`（分区诊断）、`.i18n()`（语言） |
| 场景/网页壁纸 | 场景需要浏览器 WebGL2；网页壁纸在 opaque-origin 沙箱运行；失败自动降级，不影响视频/图片 |
| 上传/转码 | 单文件 ≤512MB（可调）；HEVC/GIF 可在有 ffmpeg 时转 H.264/MP4 |

### 升级 DSH 后（或升级 Desktop 前）必做

```bash
node tools/compat-matrix.mjs --dsh <新版本>/node_modules/@deepseek-ai   # 多版本钩子 + 契约矩阵（可重复 --dsh）
node tools/upgrade-check.mjs        # 当前已装 DSH：模块加载器/启动载荷/remote 契约/桥接钩子
node tools/hook-scan.mjs --self-check   # 同一套钩子 + 校验 src/65-bridge.js 与 hooks.mjs 同步
node tools/hook-scan.mjs --dsh <新版本@deepseek-ai 目录>  # 升级 Desktop 前：对新版本做预检
```

> DSH Desktop 的包在 `app.asar` 里，普通 node 读不到；本机用 Electron-as-Node 跑：
> `set ELECTRON_RUN_AS_NODE=1` + `"D:\dsh\DeepSeek Harness.exe" tools\upgrade-check.mjs`（`DSH_PKGS_ROOT` 指向 asar 内的 `@deepseek-ai`，见 `HANDOFF-DESKTOP-INSTALL.md`）。npm 解包出来的目录可以直接 `node tools/hook-scan.mjs --dsh <目录>`。

- `FAIL` / `[MISS]` = 必须处理：皮肤可能加载失败，或某个表面失去玻璃样式。改 `src/65-bridge.js` 的探测查询（或 `hooks.mjs` 清单），**不要**把新哈希写进 CSS。
- `WARN` = 降级：某个视觉细节失效，页面仍正常。

**安全性设计**：`apply()` 整体被 `try/catch` 包住。即使某个假设在未来版本上崩了，最坏结果是"皮肤不出现"，**绝不会让 DSH 进不去**——异常被吞掉并写进 `console.warn`，不会把插件标记为致命失败。

## 配置

| 变量 | 默认（亮 / 暗） | 作用 |
|---|---|---|
| `--tl-panel-fill` | `0.84` / `0.88` | 模态面板填充，越大越实 |
| `--tl-glass-fill` | `0.30` / `0.38` | 玻璃表面填充 |
| `--tl-glass-blur` | `12px` / `14px` | 玻璃模糊半径（v1.6.0 起全界面分组按档位使用；输入控件不加 blur） |
| `--tl-shell` | `0` | 全局表面透明度，`0` = 100% 壁纸 |
| `--tl-overlay` | `0.82` / `0.84` | 菜单/弹层遮罩 |
| `--tl-accent` | `#2b74c9` | 强调色（面板内由壁纸取色覆盖） |
| `--tl-content-width` / `--tl-para-gap` / `--tl-code-size` | 排版面板决定 | v0.5.0 排版增强写入的正文宽度/段距/代码字号变量 |

持久化：壁纸选择、取景、玻璃、省电、收藏/标签/隐藏、排版、面板位置、播放/滤镜、轮播、桌宠、模块开关、语言、特效、情境、可读性等。
v0.5.0 起设置由 `settingsStore` 镜像到宿主 `state/settings.json`（跨浏览器），本地 `localStorage` 仍是同步读缓存；
旧版本存储键在首次启动时迁移到 schema v5，原值备份在 `tianlight.backup.v5`。

推理滑杆手感：`stiffness`（170）、`damping`（25）——越大越干脆 / 越不弹。

## 目录结构

```text
lib/index.js            宿主半：路由表（素材/清单/上传/场景/网页壁纸/设置/包/缓存/转码）
lib/http-media.js       宿主半：Range / ETag / HEAD / 流式响应
lib/media-types.js      宿主半：共享 MIME、扩展名、路径包含检查
lib/host-paths.js       宿主半：assets / uploads / derived / state 路径唯一来源
lib/upload.js           宿主半：受控上传（512MB 上限、安全文件名、原子落盘）
lib/scene-project.js    宿主半：WE 场景目录发现 + 逐段路径校验
lib/scene-frame.html    沙箱适配页：加载 WebWallGL 并和父页面通信
lib/settings-store.js   宿主半：设置 JSON 权威副本（原子写、revision）
lib/bundle.js           宿主半：导入导出包（流式 tar.gz）
lib/media-cache.js      宿主半：预裁剪帧缓存
lib/transcode.js        宿主半：可选 ffmpeg 转码
lib/web-project.js      宿主半：WE 网页壁纸项目
lib/we-wallpaper/host.mjs  宿主半：WE 库发现/扫描 + scene.pkg/TEX 解码 + `/api/we-wallpaper/*` 路由（内嵌 MIT 上游）
lib/we-wallpaper/LICENSE|README.md  上游 MIT 许可与修改说明
lib/client.js           浏览器半产物：由 src/ 拼装，不要直接改（v0.6.0：896,889 字符 / 22 片段）
src/                    浏览器半源码：22 个按 region 切分的片段（新增 72-we-library）
vendor/webwallgl/       MIT 的 WebWallGL 3.0 引擎（可选，不内联进 client.js）
vendor/we-wallpaper/wcap/  可选场景动态缓存工具（Windows，Unlicense）
cordis.patch.yml        插件行插入
skin.json               皮肤管理器清单
CHANGELOG.md            更新日志（release.mjs 维护）
docs/                   发布说明、兼容性、功能清单、架构补充文档
presets/                可分享的 v0.4 / v0.5 配方 JSON
.github/workflows/      CI：Node 20 + 22 静态链；tag 打包
assets/                 壁纸与桌宠素材（可选；state/、assets/uploads/、assets/derived/ 为本机数据）
tools/                  构建、审计、打包、快照、回滚、发布脚本
```

## 开发

改代码请改 `src/`：`lib/client.js` 是构建产物，直接改会被下次构建覆盖。

```bash
node tools/build.mjs         # 从 src/ 生成 lib/client.js（22 个片段，改完源码先跑）
node tools/build.mjs --check # 校验产物没落后（npm run check 已包含）
node tools/agent-check.mjs   # 多工作流并行时的单分片检查（构建到 diag/tmp，不碰 lib/client.js）
node tools/test.mjs          # 纯逻辑回归测试（v0.6.0：67 条 = 61 旧 + 6 WE fixture）
node tools/structure.mjs --strict # 结构审计：region 顺序、apply() 顺序、模块注册
node tools/audit.mjs         # 静态审计：变量/监听器/定时器/Hook 顺序
node tools/check-css.mjs     # 样式结构检查（含 v0.5.0 CSS 块作用域）
node tools/verify.mjs        # 路由、封装、清单、能力块契约断言
node tools/i18n-audit.mjs    # zh/en 字典完整性：缺 key / 仅一种语言 / en 混中文即红（npm run check 已包含）
node tools/upgrade-check.mjs # DSH 兼容性自检：模块/契约/桥接钩子（见上一节）
node tools/hook-scan.mjs     # 桥接钩子扫描（--dsh 指定任意版本；--self-check 校验桥接同步）
node tools/pack.mjs          # 生成可分发目录（默认不含大体积素材）
node tools/snapshot.mjs      # 存快照（lib 产物 + 宿主模块 + src/）
node tools/restore.mjs       # 从 backup/ 回滚到最近快照（含 src/ 与宿主模块）
node tools/release.mjs       # 发布：版本自增 + 静态链 + 快照 + CHANGELOG + commit + tag（见下）
```

`npm run check` = `build --check + test + structure --strict + audit + check-css + verify + i18n-audit`（CI 在 Node 20 与 22 上跑同一条链，无依赖安装）。
**发布**：`package.json` 已提供 `"release": "node tools/release.mjs"`，发布一条命令：

```bash
npm run release -- --note "0.5.0: …"        # 默认 minor：0.4.0 -> 0.5.0
npm run release -- patch --note "fix: …"    # 0.5.0 -> 0.5.1
node tools/release.mjs --version 0.5.0 --note "…"   # 清单已是 0.5.0 时直接为当前版本打 tag
node tools/release.mjs --dry-run --note "…" # 只打印计划，不写/不跑/不提交
```

工具要求 git 工作树干净、目标 tag 不存在、有 git 身份；检查失败即中止（不提交不 tag）；不联网，push 需手动。
`backup/` 快照不会进入提交（gitignored），发布工具也不写 `state/`。

## 许可与素材

- 代码：MIT（见 `LICENSE`）
- **第三方**：v0.6.0 内嵌 dsh-we-wallpaper host half（MIT，v0.4.0 @ `61ccaa2`）、wcap（Unlicense）、
  RePKG（MIT，DXT 解码实现依据）、WebWallGL（MIT）；组件、版本、归属与许可全文见
  [docs/THIRD-PARTY.md](docs/THIRD-PARTY.md)
- **仓库完整版附带默认演示素材**：`assets/bg-main.mp4`、`assets/bg-4k.mp4`、`assets/cat.png`（约 70MB）；`assets/uploads/`、`state/`、`assets/derived/` 与其它自加素材不提交。替换或再分发前请确认你有使用权，缺失时以渐变兜底
- 桌宠形象与视频版权归各自权利方；如果只想要轻量代码仓库，删除这三个文件即可

## 已知取舍

- 暗色主题下清除侧栏内部的悬停/选中底色，用于消灭一块无法溯源的纯黑区域
- 设置面板不做实时背景模糊：全屏视频上叠两层 `backdrop-filter` 会明显掉帧
- 壁纸取色对跨域图片会被浏览器阻止（画布污染），此时保持默认配色；面板取色只在打开时采样一次
- 实测 FPS 每 1.8s 更新一次并固定单行，数字变化不会把面板撑高
- 特效/氛围/点击特效共用一个总开关和一条低功耗冻结路径，不做全屏 60Hz canvas；总开关默认开，具体视差/点击/氛围默认关，需在 ⑧ 手动开启
- 系统音频回环、ffmpeg 转码、网页壁纸、Wallpaper Engine 场景都是可选能力，不支持时降级而不是报错
- A2 Now Playing 只读 MediaSession 元数据；v0.5.1 起系统音频回环激活时用真实电平（~10Hz）驱动节拍点，回环关闭时回到装饰性脉冲（不是音频分析仪）；A3 网页壁纸暂停/省电时卸载 iframe，重挂载会丢项目内部状态
- A4 动态分辨率依赖 `name.1080/1440/4k` 文件名约定；A5 预裁剪缓存是 best-effort、可清空；C3 降档采样较粗（约 2s，静态帧后 60s 再探测）
- 面板扩展分区只在「高级」视图显示（pick 视图 CSS 隐藏，保持精简）；D2 导入包里的设置写入宿主后刷新页面统一生效
- **C4 天气联动（v0.5.1）默认关**：关闭时**零网络请求**；开启且定位后只请求 Open-Meteo 公开接口（免 API key、无账号、无遥测，只发送城市名或坐标），无 SLA、失败静默保留上次观测；「使用当前位置」只在点击时触发 geolocation，绝不自动弹权限；与 C1 时段自适应同时开启时最后写入者为准（建议二选一）
- **设置数据安全（v0.5.2）**：`tianlight.backup.host` 是本地键、不参与宿主同步（每台机器独立），256KB 上限；「恢复宿主导入前备份」只在存在备份时可用，且备份只覆盖「宿主导入前」的状态——更早版本已丢失的数据无法自动找回
- **快捷选择（v0.5.3）**：pick 视图只做「看缩略图、点一下切换」；上传/URL/WE/GLSL 导入与参数都在「高级」。壁纸模块被关时点击卡片会提示「请先在高级开启壁纸模块」，不会静默无反应
- **C3 自适应（v0.5.3）**：默认关；只有页面可见且窗口聚焦时才采样，连续 5 次低样本且 ≥10s 才降档，降档后 5 分钟冷却，重新聚焦/用户恢复立即清除；仍可在 ⑨/⑪ 手动开启或锁定
- **整页点击无响应（v0.5.3）**：皮肤浮层已抬到产品残留 mask 之上；若仍整页点不动，按 Esc/重启 DSH 清理产品弹窗残留，再点「更多设置」
- **语言（v0.5.3）**：皮肤语言与 DSH 界面语言已解耦；「跟随 DSH」才会随宿主 locale 变化
- **WE 库（v0.6.0）**：自动检测只读本机 Steam/Wallpaper Engine，不联网；场景首次解包 78–1449ms、之后缓存 23ms；场景动态缓存 Windows-only（非 Windows/缺 wcap → 503 可读，静态高清仍可用）；未装 WE 时显示空态、不生成假条目；旧宿主只有客户端时 WE 库不可用（提示重启/更新）；运行状态与缓存写入插件 gitignored `state/`
- **i18n-audit 边界（v0.5.2）**：只审计静态字面量 key 与已知动态家族（`ctx.`/`lang.`/`fx.`）；新增代码若用运行时拼接需改成字面量才会被审计。zh 纯 ASCII 英文检测只报告（品牌/技术白名单除外），不阻塞
- **布局自检边界（v0.5.2）**：4 视口 + Desktop 标题栏的类断言覆盖「可展开/重叠/裁切/横向溢出」，不代替用户真实环境；若仍看到具体位置问题，请提供截图 + 分区名
