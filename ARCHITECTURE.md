# 架构

这个插件是 **DSH Web 皮肤 + 一组自建控件**，不是独立应用。两半分工明确，升级风险各自可控。
v0.6.0 起浏览器半是 **22 个片段**、宿主半是 **12 个模块**（新增 `we-wallpaper/host.mjs`），并新增
**第二个宿主路由前缀** `/api/we-wallpaper`。
v0.5.0 把浏览器半拆成 21 个片段、宿主半拆成 11 个模块，并新增一批注册表与宿主路由；
v0.5.1 在其上补齐 C4 天气联动与 A2 真实电平节拍（仍 21 片段、无新路由）；
v0.5.2 是自检修复版（21 片段、无新路由，新增 `tools/i18n-audit.mjs`）；
v0.5.3 是大修版（21 片段、无新路由：快捷选择/点击链路/语言/默认值）。
v0.6.0 新增 **Wallpaper Engine 库集成**：宿主扫描本机 WE 库 + `scene.pkg`/TEX 解码 + `/api/we-wallpaper/*` 路由，
客户端新增 **第 22 片段 `72-we-library.js`**（设置导航页 + 侧栏按钮 + 全屏浮层 + 快捷选择 WE 卡片）。
最终构建 **`acb17a6` / 896,889 字符 / 930,994 字节 / 22 片段**；静态链 build 22/22、test 67/67 全绿；
W 自检 web/Desktop 各 23/23（见 [docs/RELEASE-0.6.0.md](docs/RELEASE-0.6.0.md) §6）。

**当前（v1.6.3）**：浏览器半 **26 个片段 / 25 个 region**、宿主半 12 个模块；`lib/client.js` 由 `tools/build.mjs` 按显式顺序拼装（v1.6.0 基线 1,231,576 字符 / 1,272,497 字节）。片段数演变：v1.0.0 新增 `42-life.js`，v1.1.0 新增 `44-pet-brain.js` / `76-role-hub.js`，v1.2.0 新增 `48-pet-agent.js`，v1.3.0 移除 `74-life-settings.js` 后稳定在 26 片段。v1.6.0：安全上限整体上调 + 液态玻璃覆盖全部界面（分组 A/B + 场景缺失 fallback）；v1.6.1：液态玻璃 v2（OriginOS 风）+ 侧栏「新会话」按钮全档皮肤化 + DSH 主界面天气胶囊；v1.6.2：移除壁纸左上角固定晨光装饰（`CREST_SVG` / `[data-tl-crest]`，veil 保留）；v1.6.3：显示名统一为「天光」+ DSH 0.2.0/0.2.1/0.2.2 三线兼容实证（见 [docs/COMPATIBILITY.md](docs/COMPATIBILITY.md) §6.1）。

**v0.5.3 行为变更**：皮肤显式语言只切皮肤文案，**不再调用 `locale.setLocale()`**（不联动 DSH 界面语言）；
「跟随 DSH」仍走 locale 订阅。C1/C2/C3/C4 默认 OFF（已持久化选择保留）。

## 两半

| 半 | 文件 | 运行位置 | 职责 |
|---|---|---|---|
| 宿主半 | `lib/index.js` + `http-media.js` / `media-types.js` / `host-paths.js` / `upload.js` / `scene-project.js` / `scene-frame.html` / `settings-store.js` / `bundle.js` / `media-cache.js` / `transcode.js` / `web-project.js` / **`we-wallpaper/host.mjs`** | DSH 进程内 | 注册 `/skin-tianlight` 前缀路由（素材字节流、壁纸清单、上传、场景/网页壁纸、设置、包、缓存、转码）与第二个前缀 **`/api/we-wallpaper`**（WE 库清单/预览/媒体/pkg/网页/动态缓存/诊断）；WE 扫描与 `scene.pkg`/TEX 解码 |
| 浏览器半 | `src/` → `lib/client.js` | Web 页面内 | 样式注入、壁纸场景（视频/图片/GLSL/场景/网页/WE 库）、特效与氛围、智能情境、桌宠、推理滑杆、壁纸面板（①–⑥ + ⑦–⑪）、**WE 库设置页/侧栏按钮/全屏浮层（v0.6.0）**、字体面板、模块开关、双语、无障碍、选择器桥 |

v0.5.1 只改宿主 build 标记（`BUILD = '0.5.1'`），**路由表不变**；v0.5.2/v0.5.3 同样只改 build 标记
（浏览器半修复）。**v0.6.0 新增宿主路由**（`/api/we-wallpaper` + `_wallpapers`/`_engines` additive 字段）：
升级后需重启 DSH 一次；旧宿主上该前缀 404 → WE 页面提示重启/更新，其它功能正常。

浏览器半的产物必须是一个用 `window.__ModuleLoader__.load({ id, factory })` 封装的 ESM 单文件——这是加载器的契约，不是风格选择。源码按 region 拆在 `src/`，构建产物仍是这一份。

## 宿主半的分层

`lib/index.js` 只做「路由表 + 配置」；具体机制各自成模块，避免再次长回单文件：

```text
http-media.js     sendJson/sendText/parseRange/servePath/pipeFile（Range/ETag/HEAD 唯一实现）
media-types.js    MIME、扩展名白名单、SAFE_NAME、safeJoin、fileSize
host-paths.js     插件根 / assets / uploads / derived / state / settings.json / frame-cache 路径唯一来源
upload.js         受控上传：文件名清洗、512MB 流式上限、.part-* 原子落盘、同名序号
scene-project.js  WE 场景发现、逐段路径校验、场景文件扩展名白名单
scene-frame.html  沙箱适配页：加载 WebWallGL、mount、pause/resume、统计上报
settings-store.js 设置 JSON 权威副本：前缀/数量/大小校验、原子写、单调 revision、读写合并
bundle.js         导入导出包：无依赖流式 tar.gz 读写、导入先 staging 后原子落盘
media-cache.js    预裁剪静态帧缓存：8MB/帧、256MB 总量、按 mtime 淘汰、内容嗅探
transcode.js      可选 ffmpeg：检测/超时/参数数组/临时文件，失败不覆盖源文件
web-project.js    WE 网页壁纸项目发现 + 逐段路径校验 + 严格 CSP
we-wallpaper/host.mjs  内嵌 MIT 的 dsh-we-wallpaper host half：Steam/WE 发现、工坊+projects 扫描、
                 依赖无关 scene.pkg/TEX 解码（4K 静态）、`/api/we-wallpaper/*` 路由族与请求围栏
```

引擎（`vendor/webwallgl/`）与 ffmpeg 都是**可选依赖**：缺失时对应通道不可用，视频/图片/GLSL 不受影响。

## 宿主路由表（两个前缀）

### `/skin-tianlight` 前缀

| 路由 | 方法 | 说明 | 新增版本 |
|---|---|---|---|
| `/`（素材名） | GET/HEAD | `assets/` 内图片/视频，Range/206/416/ETag | v0.1 |
| `uploads/<file>`、`ext/<root>/<file>` | GET/HEAD | 用户上传与 WE roots 素材 | v0.3 |
| `_manifest` | GET | `assets/` 文件名清单 | v0.1 |
| `_wallpapers` | GET | 本地 + 上传 + WE roots + 场景 + 网页壁纸 + **v0.6.0 WE 库条目（末尾 additive）** | v0.3 / v0.6 扩展 |
| `_we-roots` | GET/POST | 额外 WE 目录（只收 JSON + 绝对路径，≤8KB） | v0.3 |
| `_upload` | POST | 受控上传（流式、原子、同名序号） | v0.3 |
| `_engines` | GET | build 握手 + 场景/网页项目数 + ffmpeg + 缓存 + 设置 revision + `capabilities` + **v0.6.0 `weLibrary`/`capabilities.weLibrary`（additive）** | v0.4 / v0.5 / v0.6 扩展 |
| `_engine/webwallgl.js`、`_scene-frame`、`_scene-project/...` | GET | 场景引擎/适配页/场景字节 | v0.3 |
| `_settings` | GET/PUT/DELETE | 宿主设置（`{schemaVersion,revision,updatedAt,settings}`；仅 `tianlight.*`/`dsh-tianlight:*`，≤256KB，原子写） | **v0.5** |
| `_bundle` | GET | 流式导出 tar.gz：`manifest.json` + `settings.json` + `wallpapers/*` | **v0.5** |
| `_import` | POST | 流式校验导入包（路径/大小/扩展名），staging 后原子落盘 | **v0.5** |
| `_frame-cache?key=` | GET/HEAD/POST/DELETE | 预裁剪帧缓存：GET 取帧、POST 8MB 存帧、DELETE 清空 | **v0.5** |
| `_frame-cache/status` | GET | `{entries,bytes,hits,misses,maxBytes}` | **v0.5** |
| `_transcode?name=` | POST | 可选 ffmpeg 转码（HEVC→H.264 / GIF→MP4），缺失时 501 | **v0.5** |
| `_transcode/status` | GET | `{ffmpeg,version}` | **v0.5** |
| `_web-project/<root>/<dir>/...` | GET | WE 网页壁纸文件，逐段校验 + 严格 CSP（`sandbox allow-scripts`） | **v0.5** |

### `/api/we-wallpaper` 前缀（v0.6.0，第二前缀）

| 路由 | 方法 | 说明 |
|---|---|---|
| `/list`、`/state` | GET / POST | WE 库清单；持久化选择与显示选项（`state/we-wallpaper.json`） |
| `/preview/<id>` | GET/HEAD | 项目预览图/预览视频 |
| `/media/<id>` | GET/HEAD | 视频/图片/音频，支持 Range |
| `/pkg/<id>` | GET | 纯 JS 解出的高清场景背景（缓存） |
| `/web/<id>/<path>` | GET/HEAD | 网页壁纸静态文件（默认 `index.html`，逐段 containment） |
| `/diagnostics/<id>` | GET | 单个场景/动态缓存诊断 |
| `/scene-video/{generate,status,media}/<id>` | POST/GET | 可选 12s 动态缓存（Windows + wcap；否则 503 可读原因） |

两个前缀都经 `webServer.register({kind:'prefix'})` 注册（WE 先注册、皮肤后注册；真实 carrier 是路由 map）。
WE 路由同样有请求围栏：`dsh-app://` 与本机 origin 放行，`Sec-Fetch-Site: cross-site`/其它 Origin → 403；
id 经扫描结果映射、逐段路径 containment（遍历 400/403），从不把原始路径/堆栈回给浏览器。

`_engines` 的 `capabilities`（`settings`/`bundle`/`frameCache`/`transcode`/`webWallpapers`/**`weLibrary`**）是客户端
「这个入口要不要渲染」的唯一依据：**不 advertise 没挂载的能力**。旧宿主没有这些路由时客户端逐项隐藏，
不会把 404 变成报错弹窗。所有失败路径返回 4xx/5xx 简码，不把堆栈回给浏览器。

## 浏览器半的分区（26 个片段 / 25 个 region）

片段按 `//#region` 分区，顺序即依赖顺序；产物 `lib/client.js` 保留同样的 region 标记（`structure.mjs` 校验）。
所有者在 `docs/V050-CONTRACT.md` §1 固化，用于多工作流并行时互不越界。
下表括号里的分区编号（⑦ 等）是当前约定，最终 `id`/`order` 以整合后 `registerTl5PanelSection` 的实际注册为准。

| 片段 | region | 所有者 | 职责 |
|---|---|---|---|
| `00-envelope.js` | （外壳，无 region） | Lead | `window.__ModuleLoader__.load({ id, factory })` 单文件外壳 |
| `10-constants.js` | constants | Lead | 路由前缀、body 属性、存储键、渲染档位、候选名单、React 引导、`HOST_BUILD` 握手 |
| `11-platform.js` | platform | Lead | 平台注册表：模块开关/模块运行时、面板分区、CSS 块、指标总线、诊断命名空间 |
| `12-schema.js` | schema | platform-core | schema 迁移（v5）、宿主设置同步、多窗口一致、工程面板（engineering, 700）；**v0.5.2 数据安全**：宿主子集不删本地键、导入前备份 `tianlight.backup.host`、恢复入口、首启全量推送/失败重试、`tl5Diag("settings")` 计数 |
| `13-i18n.js` | i18n | Lead | locale 服务接入、zh/en 字典注册、`TL_T`/`useTl5I18n`、语言切换；**v0.5.2** 工厂期注册 12-schema 的 `TL5_SCHEMA_STRINGS`（静态审计可见 `settings.*`）；**v0.5.3** 显式语言只切皮肤文案（不调 `locale.setLocale`、不写宿主 locale），非 React 文案走 `data-tl-i18n-key`/`data-tl-i18n-title-key` 契约刷新；**v1.6.1** 新增天气胶囊 `weather.chip.*` zh/en 文案 |
| `20-stylesheet.js` | stylesheet | Lead | 主样式表 + `installStyles`（主表与各片段 CSS 块拼成一个 `<style>`）；**v0.5.3** 皮肤浮层 z-index 抬升到 1290–1320（scrim 1290 / 壁纸面板 1300 / 手柄 1310 / 字体面板 1320），盖过产品可能残留的不可见 modal mask，同时保留 Desktop 标题栏安全区；**v1.6.0** 液态玻璃覆盖全部界面（分组 A/B + 场景缺失 fallback；大面板/气泡不叠实时 blur，每视口一层模糊预算）；**v1.6.1** 液态玻璃 v2 配方（多层 specular、1px 亮/暗边、外柔光、细噪点，新增 `--tl-liquid-grain`/`--tl-liquid-rim`、柔和回弹）+ 侧栏「新会话」按钮 `[data-tl-new-chat]` 全档皮肤化 + 天气胶囊 `[data-tl-weather-chip]` 样式 |
| `30-wallpaper.js` | wallpaper | wallpaper-engine | 壁纸场景/播放状态总线/看门狗/静态帧/双槽叠加层/音频分析 v1/轮播/网页壁纸/动态分辨率/预裁剪缓存/转场/B4 消费；**v0.5.2** provider/layer/blend/shader 标签 getter 化（渲染时翻译）、错误/提示文案 TL_T 化；**v0.5.3** C3 自适应硬限制（仅 visible&focused 采样、5 次≥10s、5 分钟冷却、聚焦即清除）、frame-cache 已知 key 列表 + fetch/blob 探测（miss 不再 404）、capture 延迟 2500ms、audio 告警按用户触发区分 |
| `31-engine-extra.js` | wallpaper engine extras | wallpaper-engine | A 期客户端扩展：系统音频回环、Now Playing、转码 UI、转场状态；音频（audio, 820）与引擎（engine, 830）面板分区；v0.5.1：A2 用真实音频电平（~10Hz）驱动节拍点、引擎摘要紧凑化 + 网页壁纸暂停提示；v0.5.2：自适应原因补 en；v0.5.3：自适应冻结提示 + 锁定按钮、控制台告警只在自动降档 armed/用户触发时出现 |
| `32-effects.js` | ambient effects | effects-context | B1 视差 / B2 点击 / B3 氛围 + 特效面板（effects, 800） |
| `35-context.js` | smart context | effects-context | C1 时段自适应 / C2 专注联动 + 情境面板（context, 810）；v0.5.1：C4 天气联动（独立 `tianlight.weather` 模型 + opt-in 网络 runtime + ⑨ 内天气块，只驱动 `effectsController.ambience`，默认关）；v0.5.2：时段文案改完整字面量 key；**v0.5.3 安全默认**：`timeOfDay`/`focusLink`/`adaptive`/`weather` 默认 OFF（迁移保留已存选择）、C1 仅 \|亮度影响\|≤6% + 影响显示 + 关闭按钮、C4 折叠进「实验性」、⑨「恢复默认」；v1.5.0：暴露 `globalThis.tianlightWeather`（`summary/isReady/enable/disable`）供角色中枢天气卡消费；**v1.6.1**：`installWeatherChip()` 在 DSH 主界面右上创建常驻天气胶囊（`[data-tl-weather-chip]`，五状态 off/no-location/waiting/error/ready、订阅 summary、点击开角色中枢、不自动 enable、不新增网络/权限） |
| `40-companion.js` | companion | type-i18n（仅文案） | 薄荷小猫：拖拽、呼吸、互动菜单、台词；v0.5.1：台词持 i18n key、显示时翻译，语言切换时当前气泡即时重译 |
| `42-life.js` | life rhythm | Lead | **v1.0.0 新增**：生活节奏引擎——虚拟时钟/每日作息/静默时段/主动开口预算（v1.6.0：默认 12、可调 0..50）/跨会话互动记忆/职责闸门与延迟队列回放/可替换形象解析（图片或 ≤32MiB 视频、`tianlight:pet-media`） |
| `44-pet-brain.js` | pet brain | Lead | **v1.1.0 新增**：AI 桌宠本地大脑（12 类意图、zh/en）+ 可选 `window.tianlightPetLLM` 适配器 + 能力白名单与硬上限 + 审计环形 60/暂停开关；v1.4.0：高风险能力可授权 + 适配器（`setCapabilityAdapter`/`invokeCapability`），`agent`（驱动 DSH）永久禁止；v1.6.0：本地 chat 20/分 1200/天、LLM 日 60/上限 120、分钟 6、输入/输出 1000/1200 字、20s 超时 |
| `48-pet-agent.js` | pet agent | Lead | **v1.2.0 新增**：受控 DSH Agent 接入（`agentChat`，走客户端 `remote.session` 的 list/create/prompt/follow；仅用户手动提问、无自动触发、无审批/取消/附件；v1.6.0：日 30/上限 100、输入 1000 字、超时 120s、审计 30） |
| `50-rheostat.js` | reasoning rheostat | type-i18n（仅文案） | 推理档位滑杆；v0.5.1：删除 `rheostat:render` 一次性调试日志（cosmetic 警告清零） |
| `55-lowpower.js` | low power | Lead | 省电自适应（低电量/省流量/减少动效）；**v0.5.2** `state()` 增加 `detailKey`/`detailParams`（`detail` 保持语言中立，面板渲染时本地化），音频 stop 文案走 `TL_T` |
| `57-glass.js` | glass opacity | Lead | 液态玻璃深度控制（off/frosted/soft/real，持久化 `tianlight.glassDepth`、body `data-tl-glass-depth`/`data-tl-glass-effective`、低电量/15fps 自动降级、effective 映射）；**v1.6.0**：无 `[data-tl-scene]` 时在 body 首子节点插入 `[data-tl-liquid-fallback]` 兜底层（MutationObserver 同步、dispose 删除、lowpower 禁用、幂等）；**v1.6.1**：fallback 同步液态玻璃 v2 配方（grain/rim/更强渐变） |
| `58-legibility.js` | legibility | type-i18n | D5 可读性护栏 + 可读性面板分区（legibility, 840） |
| `60-zones.js` | zone framing | Lead | 取景裁切 + 侧栏 canvas 镜像 |
| `65-bridge.js` | selector bridge | Lead | 结构发现 + 自盖章（Slot 契约 → 产品 `data-*` → 类名分段名）；**v1.6.1**：识别 `newSession` 分段按钮（`[class*='_newSession']`，侧栏与 titlebar 变体）并打 `data-tl-new-chat`，dispose 清除 |
| `70-sidebar.js` | wallpaper sidebar | panel-library | 壁纸面板 ①–⑥ + 扩展分区挂载（仅在高级视图显示）、库 v2、导入导出包、分享链接、配方 v2；**v0.5.2** 清单加载态（失败 1.2s 静默重试 + 行内重试按钮）、pick 视图「更多设置在高级」提示、英文长标签换行兜底；**v0.5.3 快捷选择**：pick 视图=纯视觉缩略图网格（2 列大卡片/使用中高亮/点击切换+toast）、移除 pick 内上传/URL/WE/GLSL 导入、「更多设置↔返回快捷选择」互切、手柄/Alt+W 默认打开 pick、卡片点击乐观高亮+错误回退；**v0.6.0** WE 卡片（「壁纸引擎 N」chip/预览优先/徽标/静态高清提示）与高级 ① 自动检测行 +「打开壁纸库」 |
| `72-we-library.js` | we library | we-library | **v0.6.0 新增第 22 片段**：WE 库客户端——设置导航页（`settings.section` id `tianlight-wallpaper`）、侧栏按钮（`sidebar.footer.action`）、全屏浮层（`z-index:2600`、×/Esc/mask、`tianlight:open-wallpaper-library` 事件）；预览网格/搜索/类型筛选/刷新/使用中/toast；点卡应用（media/web/pkg + diagnostics/preview 回退）；可选场景动态缓存轮询（`{ok,status{phase,progress,error}}`，503 可读）；slots 缺失时降级为事件/诊断 |
| `76-role-hub.js` | role hub | Lead | **v1.1.0 新增**：全屏角色中枢——生活状态/节奏设置、液态玻璃（含 v1.5.0 预览条）、桌宠形象（含本机上传 ≤32MiB 与恢复默认）、AI 对话/LLM 授权、AI Agent、权限总览、审计、v1.5.0 天气卡/自检/反馈面板；唯一入口：右键桌宠 / 菜单「角色中枢」（v1.3.0 起无独立设置页/侧栏按钮）；v1.6.0：生活预算 0..50、AI 输入 1000；v1.6.1：玻璃 v2 预览 |
| `90-font.js` | font panel | type-i18n | 排版面板：预览、字号/字族/行宽/段距/代码字体 |
| `95-a11y.js` | accessibility | type-i18n | D6 焦点陷阱/aria/直播区/快捷键注册表 + 无障碍帮助分区（a11y, 860） |
| `99-apply.js` | apply | Lead | `apply(ctx)` effect 注册、单例 teardown、模块运行时、信封收尾；**v1.6.1**：常驻安装天气胶囊（`installWeatherChip`，不依赖 context 模块开关） |

**规则**：新功能必须落在对应区域内；跨区共享的东西放 `constants`/`platform`，不要从别的区偷函数。
需要别人文件加钩子时通过 Lead 转达（契约 §1），不要直接改别人的片段。

## 注册表（`src/11-platform.js` / `13-i18n.js`）

v0.5.0 并行开发的关键是「谁都不改别人的文件也能注册东西」：

| 注册表 / 总线 | API | 谁用 |
|---|---|---|
| 模块开关 | `moduleController.state()/isEnabled(id)/set(id,bool)/subscribe(fn)/list()`；`createModuleRuntime(install)` 的 `define/enable/disable/syncAll/activeIds` | `99-apply` 定义全部模块；⑦ 工程面板渲染开关 |
| 面板扩展分区 | `registerTl5PanelSection({ id, order, title, Component })` → `tl5PanelSections()` 按 order 排序；`70-sidebar` 只负责挂载，且分区只在「高级」视图**显示**（pick 视图由 CSS `data-tl-view` 隐藏，保持精简） | 最终注册：engineering(700) / effects(800) / context(810) / audio(820) / engine(830) / legibility(840) / a11y(860) |
| CSS 块 | `registerTl5Css(String.raw\`...\`)` → `tl5CssText()` 拼进同一个 `<style>` | 各功能片段；全部以 `body[data-dsh-tianlight]` 作用域开头（`agent-check`/`audit` 校验） |
| 指标总线 | `TL5_METRICS` + `publishTl5Metrics(patch)` / `subscribeTl5Metrics(fn)` | 播放/特效/缓存把只读指标发布给 ⑦ 工程面板；**只读，不做决策** |
| 诊断 | `TL5_DIAG` + `tl5Diag(namespace, patch)` | 控制台/工程面板读取：`engine/effects/context/audio/settings/cache/i18n/legibility` |
| 文案 | `registerTl5Strings({zh,en})`、`TL_T(key,params)`、`useTl5I18n()`、`setTl5Language(mode)`；非 React 固定文案用 `data-tl-i18n-key` / `data-tl-i18n-title-key` 属性契约刷新 | 所有新 UI；key 前缀按分区（`fx.*`/`ctx.*`/`audio.*`/`lib.*`/`settings.*`/`typo.*`/`a11y.*`） |
| 设置 | `schemaRuntime.report()/migrate()`、`settingsStore.status()/bootstrap()/forceSync()/subscribe()` | `12-schema` 实现；其他片段继续同步读 `localStorage`，写入由镜像层同步到宿主 |
| 快捷键 | `TL5_SHORTCUTS` + `registerTl5Shortcut({...})` | `95-a11y` 集中声明，避免各片段抢 window 监听 |
| DSH slots（v0.6.0） | `slots.inject`/`slots.register({name,id,order,label}, Component)`：`settings.section`（id `tianlight-wallpaper`）+ `sidebar.footer.action`；另有 `CustomEvent("tianlight:open-wallpaper-library")` 浮层入口 | `72-we-library`；slots 缺失时降级到事件/诊断，不阻塞 apply |

## 异步 apply 与模块运行时生命周期

`apply(ctx)` 是唯一入口，v0.5.0 起是 **async**（`build.mjs` 允许 `async function apply`），整体仍在 `try/catch` 内：
异常只记警告，绝不把插件标记为致命失败，因此**皮肤坏了也不会让 DSH 进不去**。

```text
apply(ctx)
  ├─ disposePreviousInstance()          # 单例注册表：先拆掉旧实例（优先熔断旧 cordis fiber）
  ├─ purgeOrphanHosts(body)             # 旧构建可能留下的 host 选择器兜底清理（v0.5 新增 fx/ambient/web/a11y live）
  ├─ await bootstrapSettingsRuntime(body)  # schema 迁移 + 宿主设置采纳（1.2s 超时；失败退化本地模式）
  ├─ 常驻核心（有序）：stylesheet → glass → low power → i18n → selector bridge → body 属性
  ├─ install("…: settings sync")        # 持续写镜像 + BroadcastChannel（基础设施，不是模块）
  ├─ 模块运行时：createModuleRuntime(install)；定义 wallpaper/zones/effects/context/audio/
  │   companion/rheostat/typography/legibility/panel，然后 runtime.syncAll() 按 MODULE_DEFS 顺序安装
  ├─ install("…: we library")           # v0.6.0：WE 设置页 + 侧栏按钮 + 浮层（always-on，slot 缺失时降级）
  └─ install("…: accessibility")        # 最后安装，依赖面板 host 已存在

模块开关：moduleController.set(id, bool)
  ├─ true  → runtime.enable(id)  → install(label, factory)（重新安装，返回幂等 disposer）
  └─ false → runtime.disable(id) → disposer()：DOM、window/document 监听、定时器、slot 注册全部移除
```

每个安装器都包在 `ctx.effect(() => factory(), label)` 里，返回的 teardown 幂等且带 label；
`globalThis.__dshTianlightInstance` 暴露 `dispose()` / `labels()` / `disposeLabel(label)` /
`modules()` / `settings()` / `metrics()` / `diag()` / `i18n()` / 懒计算的 `features`，用于热重载与支持诊断。

## 设置 / schema / 多窗口数据流

```text
localStorage（同步读缓存，所有片段直接读）
   ▲ 写入（各 controller / localStorage.setItem）
   │
settingsStore 镜像层（12-schema）
   ├─ 首次启动：schema 迁移 v4→v5（备份 tianlight.backup.v5）→ GET /_settings
   │              ├─ 宿主 revision 更新（v0.5.2）：只落地宿主里有的键（显式 null 墓碑删除），
   │              │   宿主没有的本地键保留 → 随后回推宿主（宿主重新变超集，绝不反向清空本地）
   │              ├─ 本地缓存为空而宿主有值：采纳宿主（避免「本地空 → push 一堆 null」清空宿主）
   │              └─ 否则把本地相对宿主的差异 PUT（首启是全量；失败 1s 后重试一次，仅 network/5xx/超时）
   ├─ 采纳前：本地可同步键 → tianlight.backup.host（本地键，`tianlight.backup.` 前缀被镜像排除；
   │           不参与宿主同步，256KB 上限；⑦ 工程「恢复宿主导入前备份」可写回并立即推宿主）
   ├─ 运行中：patch localStorage.setItem/removeItem → 300ms 防抖 PUT（只带变更键，合并语义）
   ├─ 多窗口：BroadcastChannel("tianlight.settings") + storage 事件，最后写入者为准
   ├─ 失败：status {host:false, lastError}，设置继续本地可用；不会阻塞 apply()
   └─ 可观测：tl5Diag("settings") = {localKeys, remoteKeys, pushedKeys, pushRetried}
```

**v0.5.2 数据安全不变量**：宿主快照只当「已知键的权威值」，不当「完整列表」——**子集只补不删**；
显式 `null` 墓碑仍删除本地键（跨浏览器删除语义）；`tianlight.backup.host` 是本地数据、永不进宿主。
`settingsStore.status()` 额外返回 `backup` / `recovered`，⑦ 工程分区据此显示备份状态与恢复入口。

宿主文件 `<plugin>/state/settings.json` 是跨浏览器权威副本；`assets/uploads/`、`state/`、
`assets/derived/` 都是本机数据（gitignore），不进仓库、不随发布包分发。

**壁纸/场景数据流**（v0.4.0 起的主干 + v0.5.0 扩展）：

```text
宿主路由 --fetch--> 壁纸解算 --choice--> 场景（video / photo / shader / scene iframe / web iframe）
                                        ├─ 动态分辨率：按窗口×DPR 选 1080/1440/4k 变体（交叉淡入）
                                        ├─ 预裁剪缓存：帧 → _frame-cache（下次首屏垫底，命中/未命中进指标）
                                        │   └─ v0.5.3：已知 key 列表（tianlight.cache.known）本地 miss 不探测 → 无 404 噪音
                                        ├─ 取色（canvas 32x18）→ CSS 变量 → 面板/光效
                                        ├─ 播放状态总线 → 顶部状态行 / 恢复按钮
                                        ├─ 轮播（可见且未暂停时按间隔换源）
                                        └─ 转场：上一帧快照 + fade/slide/zoom/dissolve，音频状态保持
上传 --POST /_upload--> assets/uploads/ --> _wallpapers --> 清单（HEVC/GIF 可用 _transcode 转 H.264）
WE roots --> _wallpapers(scene|web) --> 场景适配页 / 网页沙箱 iframe
WE 库（v0.6.0，host）--Steam 发现+扫描--> _wallpapers（末尾追加 we 条目）+ _engines.weLibrary
                       └─ /api/we-wallpaper/{preview,media,pkg,web}；scene.pkg/TEX → 4K 静态（缓存 23ms）
                     --客户端 72--> 设置页/侧栏按钮/浮层/快捷选择卡片 → 点卡应用；可选 scene-video（Windows）
快捷选择（v0.5.3，70）--点击卡片--> pickCard → wallpaperController.apply + 乐观高亮 + toast
                       └─ pick 视图只含缩略图网格/来源 chips/搜索/排序；上传/URL/WE/GLSL 只在高级
点击链路（v0.5.3，20）--皮肤浮层--> scrim 1290 / 面板 1300 / 手柄 1310 / 字体面板 1320
                       └─ 盖过产品残留的不可见 modal mask，同时保留标题栏安全区与键盘路径
特效（32）--读 effectsController--> 视差/点击/氛围；指标 → TL5_METRICS → ⑦ 工程面板
情境（35）--读 contextController--> 时段外观 / 专注联动（body[data-tl-focus]）/ 自适应锁定
         └─ C4（v0.5.1）：仅显式启用 + 已定位 → fetch Open-Meteo（8s 超时/静默重试/隐藏页跳过）
                          → effectsController.ambience（只改氛围；关闭时零请求、零定时器）
```

**v0.5.3 默认值与语言**：C1/C2/C3/C4 默认 OFF（已持久化选择保留）；皮肤显式语言只切皮肤文案，
不写宿主 locale；非 React 固定文案用 `data-tl-i18n-key`/`data-tl-i18n-title-key` 在语言事件时刷新。

## 源码与构建

`lib/client.js` 是产物，源码在 `src/`：按 region 切分的普通脚本片段（无 import/export），
由 `tools/build.mjs` 按显式顺序拼回同一个 factory 闭包。产物仍必须提交——profile 的 junction 直接加载它。

- `node tools/build.mjs`：重新生成 `lib/client.js`（26 个片段 → 单文件；v1.6.0 基线 1,231,576 字符 / 1,272,497 字节，v0.6.0 为 896,889 字符 / 930,994 字节，v0.5.3 为 827,150 字符 / 859,341 字节，v0.5.2 为 798,816 字符，v0.5.1 为 768,962 字符，v0.5.0 为 724,684 字符）
- `node tools/build.mjs --check`：产物落后于 `src/` 时退出 1（`npm run check` 已包含）
- `node tools/build.mjs --out <file>`：构建到暂存路径（沙箱/打包环境用）
- `node tools/agent-check.mjs`：多工作流并行时的单分片检查（构建到 `diag/tmp/`，不碰 `lib/client.js`）
- `node tools/test.mjs`：纯逻辑回归测试（v0.6.0：**67 条** = 61 旧 + 6 条 WE fixture）
- `node tools/i18n-audit.mjs`：zh/en 字典完整性（缺 key / 仅一种语言 / en 混 CJK 即红；zh 纯英文为报告项），已加入 `npm run check` 与 CI
- `node tools/snapshot.mjs` / `restore.mjs`：快照含 `lib/we-wallpaper/host.mjs`（`wehost`）与 `vendor/we-wallpaper/`；
  `pack.mjs` 分发目录带 `lib/we-wallpaper/`、`vendor/we-wallpaper/` 及许可文件
- 片段顺序只由 `build.mjs` 里的数组决定，不依赖文件系统排序

## 不变量（会被自动校验）

| 不变量 | 校验者 |
|---|---|
| 分区齐全且顺序正确 | `structure.mjs` |
| `apply()` 的 effect 顺序（含 settings sync 与模块运行时） | `structure.mjs` + `audit.mjs` |
| 每个模块都有 `runtime.define()` 与 `MODULE_DEFS` 条目 | `structure.mjs` |
| 单例注册表 / 禁止死选择器（`[data-tl-companion]`） | `structure.mjs` |
| 产物与 `src/` 一致 | `build.mjs --check` |
| `apply()` 的 try/catch 边界（允许 async） | `structure.mjs` |
| 全局监听器/定时器成对释放 | `audit.mjs` |
| 无 Hook 在 early return 之后 | `audit.mjs` |
| `--tl-*` 变量声明与使用一致 | `audit.mjs` |
| 每个功能 CSS 块以 `body[data-dsh-tianlight]` 作用域开头、括号平衡、无 `${}` 插值 | `agent-check.mjs` + `check-css.mjs` |
| zh/en 字典完整性：静态引用 key 两语言齐全、不出现 only-zh/only-en、en 不含中文 | `i18n-audit.mjs`（`npm run check` + CI） |
| 设置数据安全：宿主子集不删除本地键；显式 null 墓碑仍删除；备份键不参与宿主同步 | `test.mjs` + 代码审计（运行时由 lab 断言） |
| 皮肤显式语言只切皮肤文案：不调用宿主 `locale.setLocale()`；「跟随 DSH」才订阅 locale 变化 | 代码审计 + v0.5.3 lab |
| 非 React 固定文案使用 `data-tl-i18n-key` / `data-tl-i18n-title-key` 契约，语言事件时刷新 | 代码审计（`tl5ApplyI18nDom`） |
| 皮肤浮层 z-index 1290–1320 且保留标题栏安全区/键盘路径 | `check-css.mjs` + v0.5.3 真实鼠标 lab |
| pick 视图无文件选择/上传/URL/WE/GLSL 导入入口（只在高级） | v0.5.3 lab（DOM 断言） |
| WE 路由请求围栏：跨站 403、id 经扫描映射 + 逐段 containment（遍历 400/403） | `test.mjs`（WE fixture）+ 代码审计 |
| WE 集成 additive：`_wallpapers` 只在末尾追加、`_engines` 只加字段、`capabilities.weLibrary` 决定入口 | `verify.mjs` + W 自检 |
| 场景动态缓存仅在 Windows + wcap 可用时启用；否则 503 可读原因、静态高清仍可用 | `test.mjs`（disable 标志）+ 代码审计 |
| 素材路由的 Range/穿越/HEAD 行为；上传/包/缓存/转码/网页项目失败路径 | `test.mjs` + `verify.mjs` |
| 宿主 `_engines` 能力块与已挂载路由一致 | `verify.mjs` |
| 场景/网页 iframe 的 `event.source`/origin 与 CSP | 代码审计 + `verify.mjs` |
| 皮肤对当前 DSH 的假设（模块加载器/remote/桥接钩子） | `upgrade-check.mjs` |
| 0.2.0 / 0.2.1 / 0.2.2 三条线的钩子层与契约 | `compat-matrix.mjs` |

## 升级策略（五层）

1. `apply()` 的 try/catch —— 绝不炸穿页面
2. `upgrade-check.mjs` —— 假设清单，分 FAIL（致命）/ WARN（降级）
3. **结构桥接** —— 按结构发现元素并盖 `data-tl-*`，哈希变了样式仍生效；
   发现顺序是 **Slot 契约 → 产品 `data-*` → 类名分段名**，只标记最外层同类节点
4. `compat-matrix.mjs` —— 对任意多份 DSH 安装输出 `COMPATIBLE / INCOMPATIBLE`，
   逐版列出槽位/数据属性/类名/契约，是"同时支持 0.2.0/0.2.1/0.2.2"的可执行证明
5. 运行时诊断 —— `__dshTianlightInstance.features` 报告当前 DSH 实际渲染的钩子层，
   v0.5.0 增加 `.modules()` / `.settings()` / `.metrics()` / `.diag()` / `.i18n()`

v0.5.0 新增功能只用了三条线共有的稳定钩子：`[data-chat-running]`（专注联动）、locale 服务（双语）、
既有选择器桥（未改）。v0.6.0 的 WE 集成本质上是**加在既有 `webServer` 上的第二前缀**与 `slots` 的两个
additive 入口，不需要新的 DSH 钩子：旧宿主缺前缀时客户端按 404 降级提示，不缺能力本身。
多版本支持详见 [docs/COMPATIBILITY.md](docs/COMPATIBILITY.md)：
跨 0.2.x 的差异只体现在"桥接命中哪一层"，不需要版本 if 分支；跨 0.3 大版本时先跑 `npm run compat`，只改桥接。

## 发布与回滚

- `node tools/release.mjs [patch|minor] --note "…"`：版本自增（package.json + skin.json + 两处 build 标记）
  → 完整静态链 → `backup/` 快照 → CHANGELOG 条目 → release commit → 注记 tag `vX.Y.Z`；拒绝脏树/重复 tag，不联网。
- `node tools/snapshot.mjs` / `node tools/restore.mjs`：手工快照与回滚（含 `src/` 与全部宿主模块）。
- `node tools/pack.mjs`：生成可分发目录（默认不含大体积素材）。

## 长期路线

- [x] 把 `lib/client.js` 拆成 `src/` 多模块 + 构建步骤（加载器仍只吃单文件产物）
- [x] 桥接覆盖率提升到全部表面后，删除硬编码哈希选择器（v0.2.0 起 CSS 零哈希）
- [x] 宿主拆出 http/media/upload/scene 模块，引擎作为可选 vendor
- [x] 播放状态总线 + 看门狗 + 轮播 + 隐藏/上传
- [x] 同时支持 DSH 0.2.0 / 0.2.1 / 0.2.2（运行时 + 静态矩阵实测，v0.4.0）
- [x] v0.5.0：模块开关 / 宿主设置 / schema 迁移 / 多窗口 / 工程面板 / 特效 / 情境 / 双语 / 无障碍
- [x] v0.5.0：宿主设置、导入导出包、预裁剪缓存、可选转码、网页壁纸路由
- [x] v0.5.0：发布工具（`release.mjs`）+ CI 双 Node 版本静态链 + 分支/标签打包
- [x] v0.5.1：C4 天气联动（Open-Meteo 免 key、默认关、只显式启用后联网、失败静默、只驱动氛围）
- [x] v0.5.1：A2 真实电平节拍 / 同伴台词显示时 i18n / 删除 rheostat 调试警告 / 引擎摘要与网页壁纸提示打磨
- [x] v0.5.2：设置数据安全（宿主子集不删本地、导入前备份 + 恢复、首启全量推送/失败重试）/ i18n-audit 工具与 CI / 面板加载态与布局自检
- [x] v0.5.3：壁纸快捷选择重做（pick 纯视觉网格、无文件入口、高级互切）/ 点击链路 z-index 抬升（1290–1320）/ C3 自适应安全化 / 语言只切皮肤 / 情境安全默认 / frame-cache 与音频控制台静音
- [x] v0.6.0：本机 Wallpaper Engine 库自动接入（host 扫描 + scene.pkg/TEX 4K 解码 + `/api/we-wallpaper` 第二前缀）/ 第 22 片段 `72-we-library`（设置页 + 侧栏按钮 + 全屏浮层 + 快捷选择 WE 卡片）/ 可选 Windows 动态缓存
- [x] v1.0.0：生活节奏引擎 + 可替换形象（图片/≤32MiB 视频）+ 液态玻璃三档 + 专注计时（`42-life.js`）；v1.1.0：角色中枢（`76-role-hub.js`）+ AI 桌宠（`44-pet-brain.js`）；v1.2.0：受控 DSH Agent（`48-pet-agent.js`）；v1.3.0：角色入口收进桌宠（移除 `74-life-settings.js`，26 片段）
- [x] v1.4.0：高风险权限改为「默认关 + 显式授权 + 适配器 + 审计」，`agent`（驱动 DSH）仍永久禁止；v1.5.0：玻璃默认 soft + 中枢预览 / 天气卡 / 一键自检 / 反馈面板
- [x] v1.6.0：安全上限整体上调（主动开口 12/50、本地 chat 20/分 1200/天、LLM 日 60/上限 120、Agent 日 30/上限 100 等）+ 液态玻璃覆盖全部界面（分组 A/B + 场景缺失 fallback）
- [x] v1.6.1：液态玻璃 v2（OriginOS 风多层 specular/亮暗边/细噪点/外柔光/回弹）+ 侧栏「新会话」按钮全档皮肤化 + DSH 主界面天气胶囊
- [x] v1.6.2：移除壁纸左上角固定晨光装饰（`CREST_SVG` / `[data-tl-crest]`；场景层顺序与 veil 保留）；v1.6.3：显示名统一「天光」+ DSH 0.2.0-rc.2 / 0.2.1-rc.5 / 0.2.2-rc.1 三线 compat-matrix / hook-scan / upgrade-check 实证全绿
- [ ] 客户端纯逻辑（取色数学、弹簧积分、轮播选片、配方归一化、天气码映射）抽成可单测模块
- [ ] 给 CI 加一条：DSH 新版本发布时自动跑 `compat-matrix.mjs` + `upgrade-check.mjs`（CI 没有 DSH 安装，需自托管 runner）
