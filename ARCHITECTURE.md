# 架构（v2.2.0 现状）

本文件描述 **当前** 结构，不是版本流水账。按版本记的历史已整体挪到 [docs/HISTORY.md](docs/HISTORY.md)（内容未删改）。

`tools/structure.mjs --strict` 守住这份文档：`src/` 的每个片段、`lib/` 的每个模块、`lib/routes/` 的每个模块、每条路由路径，只要这里没写到就失败。改结构而忘了改这里，`npm run check` 会红。

## 1. 浏览器半：28 个片段拼成一个 ESM

DSH 的客户端插件加载约定是"一个插件只有一个 ESM 文件"（见 `tools/build.mjs` 开头），所以 `src/` 下的片段按固定顺序拼进 **同一个工厂闭包**，产物是 `lib/client.js`。片段之间没有 import，共享同一个作用域——这正是 [docs/DEPS.md](docs/DEPS.md) 记录、并由 `tools/deps.mjs --check` 机械守住的那份耦合（v2.1.6 起接入 `npm run check`）。

| # | 片段 | region | 字节 | 职责 |
| --- | --- | --- | --- | --- |
| 1 | `00-envelope.js` | （外壳） | 233 | 拼装外壳：`window.__ModuleLoader__.load` + factory/module/exports |
| 2 | `10-constants.js` | constants | 5749 | 常量、`HOST_API` 契约、`TL_BUILD_VERSION`、诊断入口 `note`/`tl5Diag` |
| 3 | `11-platform.js` | platform | 24569 | 模块注册表、TL5 指标/诊断总线、平台环境探测 |
| 4 | `12-schema.js` | schema | 29827 | 设置 schema、默认外观、数据键与 repair 校验（存储/同步见 12b，工程面板见 12c） |
| 5 | `12b-schema-sync.js` | schema | 60912 | 设置镜像与宿主同步：迁移、冲突重放、备份/恢复、跨标签广播 |
| 6 | `12c-schema-eng.js` | schema | 14643 | 模块标签/描述与工程面板分区（含 tl5-eng 样式） |
| 7 | `13-i18n.js` | i18n | 16333 | 中英文字典与 `registerTl5Strings` |
| 8 | `20-stylesheet.js` | stylesheet | 144872 | 全部 CSS：玻璃、分区、字体、无障碍、开机动画 |
| 9 | `30-wallpaper.js` | wallpaper | 96828 | 壁纸目录/变体/图层/播放设置（场景运行时见 30b） |
| 10 | `30b-wallpaper-scene.js` | wallpaper | 80385 | 壁纸场景运行时：video/image/scene 挂载、播放控制与释放（installScene） |
| 11 | `31-engine-extra.js` | wallpaper engine extras | 56604 | WebWallGL 场景引擎桥与预览 |
| 12 | `32-effects.js` | ambient effects | 41348 | 环境特效（光斑、雨雪、尘埃） |
| 13 | `35-context.js` | smart context | 99750 | 智能情境：时段、天气、专注联动 |
| 14 | `40-companion.js` | companion | 37749 | 桌宠外观、形象库、动作包与聊天记录存储（运行时见 40b，职责通道见 40c） |
| 15 | `40b-companion-install.js` | companion | 65125 | 桌宠运行时：拖拽、心情、互动菜单（installCompanion） |
| 16 | `40c-companion-duty.js` | companion | 8503 | 桌宠职责通道：role pack 动作归一化与派发 |
| 17 | `42-life.js` | life rhythm | 52033 | 生活节奏、预算、回忆与延后队列 |
| 18 | `44-pet-brain.js` | pet brain | 26187 | 桌宠权限模型、能力分级与提示词常量 |
| 19 | `44b-pet-state.js` | pet brain | 48648 | 桌宠状态：存储、权限/暂停/配额、审计、本地回复 |
| 20 | `44c-pet-llm.js` | pet brain | 29224 | 桌宠 LLM 通道：适配器、能力调用、聊天/历史/上下文 |
| 21 | `44d-pet-mind.js` | pet brain | 32285 | 桌宠私密思考引擎：预算、思考、tick 与 API |
| 22 | `48-pet-agent.js` | pet agent | 23685 | 桌宠接入 DSH Agent（受控） |
| 23 | `50-rheostat.js` | reasoning rheostat | 20501 | 推理滑杆（只影响本会话展示） |
| 24 | `55-lowpower.js` | low power | 10650 | 省电模式：三输入一决策，暂停壁纸与镜像 |
| 25 | `57-glass.js` | glass opacity | 17730 | 液态玻璃三档与深度、v2.2.0 实时渲染开关 |
| 26 | `58-legibility.js` | legibility | 25156 | 可读性对比/字号/字距 |
| 27 | `59-splash.js` | splash | 25280 | 开机动画：`splashPlan` 单点决策 + 简洁 A 版 |
| 28 | `59b-splash-film.js` | （splash 长片） | 110910 | 18.5 秒长片（WebGL/WAAPI，自带硬停与释放） |
| 29 | `60-zones.js` | zone framing | 12967 | 分区取景（主图/轨道） |
| 30 | `65-bridge.js` | selector bridge | 17988 | 运行时选择器桥：slot → 产品 `data-*` → 类名后缀 |
| 31 | `70-sidebar.js` | wallpaper sidebar | 59244 | 壁纸面板 i18n、分享/导入导出编解码助手（组件见 70b） |
| 32 | `70b-wallpaper-sidebar-panel.js` | wallpaper sidebar | 152219 | 壁纸面板 React 组件 WallpaperPanel：来源/清单/图层/播放/库（约 3850 行） |
| 33 | `72-we-library.js` | we library | 60116 | Wallpaper Engine 库与场景选择 |
| 34 | `76-role-hub.js` | role hub | 74825 | 角色中枢 i18n 字典、常量与通用助手（运行时见 76b） |
| 35 | `76b-role-hub-install.js` | role hub | 181030 | 角色中枢运行时：全屏 overlay、各卡片与状态（installRoleHub，约 3800 行） |
| 36 | `90-font.js` | font panel | 32193 | 字体面板（内置字体清单/拖拽） |
| 37 | `95-a11y.js` | accessibility | 20675 | 无障碍（键盘、焦点、对比度） |
| 38 | `99-apply.js` | apply | 17196 | `apply(ctx)`：按固定顺序安装/注册每个模块，单例与热重载 |

依赖表、跨片段引用清单和"新增引用就失败"的门禁见 [docs/DEPS.md](docs/DEPS.md)。

## 2. 宿主半：模块

| 模块 | 职责 |
| --- | --- |
| `lib/index.js` | 入口：两道同源围栏（`isSameOriginRequest`、`isSandboxedRead`）、`HOST_API`/`BUILD`、持久化数据初始化、**唯一的派发表**、`bindRoutes`、`apply` |
| `lib/media-types.js` | 扩展名/媒体类型、`safeJoin`、`SAFE_NAME`、`ROUTE`、文件大小 |
| `lib/http-media.js` | `sendJson`/`sendText`/`servePath`/`serveTextFile`/`parseRange`（Range 与 SVG CSP 沙箱都在这里） |
| `lib/host-paths.js` | 持久化数据目录 `<profile.dir>/tianlight`、legacy 数据一次性复制 |
| `lib/upload.js` | 上传接收、目录、清单 |
| `lib/settings-store.js` | 设置持久化（GET/HEAD/PUT/DELETE） |
| `lib/bundle.js` | 设置包导出（GET/HEAD）与导入（POST） |
| `lib/media-cache.js` | 帧缓存（DELETE/GET/HEAD/POST） |
| `lib/transcode.js` | ffmpeg 转码与状态、`derived/` 产物 |
| `lib/scene-project.js` | WebWallGL 场景项目解析 |
| `lib/web-project.js` | Wallpaper Engine 网页项目 |
| `lib/weather-proxy.js` | 天气代理（只读） |
| `lib/pet-chat.js` | 桌宠 AI 对话（POST `_pet-chat`，固定系统提示词与预算）与只读模型目录（GET `_pet-models`）；v2.2.0 按 provider+model 解析 |
| `lib/fingerprint.js` | 安装指纹（版本、哈希、安装方式） |
| `lib/we-wallpaper/host.mjs` | 内置 Wallpaper Engine 桥（`WE_API_PREFIX`） |
| `lib/scene-frame.html` | 场景适配 iframe（CSP 沙箱） |

## 3. 路由表（挂载在 `/skin-tianlight` 下）

所有路由先过同一道同源围栏 `isSameOriginRequest`；"沙箱读取豁免"只对 GET/HEAD 且只对下列四条路径生效（`SANDBOXED_READ_PATHS`）：`_engine/webwallgl.js`、`_scene-project/`、`_web-project/`、`_scene-frame`。

写入路由在通用 GET/HEAD 门禁 **之前** 求值（各自管方法与响应），读取路由在门禁 **之后**；前缀按表中顺序匹配；最后是包内资产回退。

| 路径 | 方法 | 模块 | 同源 / 沙箱 |
| --- | --- | --- | --- |
| `_we-roots` | GET / POST | `lib/routes/wallpaper.js` | 围栏；无豁免 |
| `_settings` | GET / HEAD / PUT / DELETE | `lib/routes/settings.js` | 围栏；无豁免 |
| `_bundle` | GET / HEAD / POST | `lib/routes/settings.js` | 围栏；无豁免 |
| `_import` | POST | `lib/routes/settings.js` | 围栏；无豁免 |
| `_frame-cache` | DELETE / GET / HEAD / POST | `lib/routes/frames.js` | 围栏；无豁免 |
| `_frame-cache/status` | GET / HEAD | `lib/routes/frames.js` | 围栏；无豁免 |
| `_transcode` | POST | `lib/routes/frames.js` | 围栏；无豁免 |
| `_transcode/status` | GET / HEAD | `lib/routes/frames.js` | 围栏；无豁免 |
| `_pet-chat` | POST | `lib/routes/pet.js` | 围栏；无豁免 |
| `_pet-models` | GET / HEAD | `lib/routes/pet.js` | 围栏；无豁免 |
| `_upload` | POST | `lib/routes/media.js` | 围栏；无豁免 |
| `_manifest` | GET / HEAD | `lib/routes/media.js` | 围栏；无豁免 |
| `_wallpapers` | GET / HEAD | `lib/routes/wallpaper.js` | 围栏；无豁免 |
| `_engines` | GET / HEAD | `lib/routes/engine.js` | 围栏；无豁免 |
| `_weather` | GET | `lib/routes/weather.js` | 围栏；无豁免 |
| `_fingerprint` | GET | `lib/routes/settings.js` | 围栏；无豁免 |
| `_engine/webwallgl.js` | GET / HEAD | `lib/routes/engine.js` | 围栏 + 沙箱读取豁免 |
| `_scene-frame` | GET / HEAD | `lib/routes/engine.js` | 围栏 + 沙箱读取豁免 |
| `_scene-project/<root>/<dir>/<file>` | GET / HEAD | `lib/routes/scene.js` | 围栏 + 沙箱读取豁免；CORS `*` |
| `_web-project/<root>/<page>` | GET / HEAD | `lib/routes/webproject.js` | 围栏 + 沙箱读取豁免 |
| `uploads/<file>` | GET / HEAD | `lib/routes/media.js` | 围栏；Range |
| `derived/<file>` | GET / HEAD | `lib/routes/frames.js` | 围栏；Range |
| `ext/<rootIndex>/<file>` | GET / HEAD | `lib/routes/wallpaper.js` | 围栏；Range |
| `<asset>`（回退） | GET / HEAD | `lib/routes/media.js` | 围栏；Range |

九条 `lib/routes/*.js` 都只导出 `{ exact, prefix }`（外加少量共享纯函数）；`lib/index.js` 按原顺序把它们组装成派发表，这个顺序由 `tools/host-fuzz.mjs` 对 2.1.7 构建逐条比对（122 个场景的状态码、9 个契约响应头、归一化响应体）。

## 4. 开机动画：结构与全部结束方式

- **决策**：`splashPlan()` 是唯一决策点（v2.1.7 合并了原先三处重复守卫），输入 style（`long-once` / `long` / `simple` / `off`）、本会话是否已播、`prefers-reduced-motion` + 显式 `forceMotion` 覆盖、低电量、今日是否已播长片；输出 `{ mode: none|simple|long, reason, style }`。
- **简洁 A 版**（`59-splash.js`）：1.7s 时间线，3s 硬停。
- **长片**（`59b-splash-film.js`）：18.5s，23.5s 硬停；失败回退简洁版；自带 WebGL/AudioContext 释放与 `dispose`。
- **结束方式**：自然结束（1.7s / 18.5s）、硬停（3s / 23.5s）、用户跳过（pointerdown / keydown，含 Esc）、`reduced-motion`、低电量、每会话一次（sessionStorage）、每日一次（localStorage）、长片失败回退、异常清理（错误监听 + 幂等 cleanup）、插件卸载 `dispose`。
- **时长常量**：`SPLASH_DURATION_MS`/`SPLASH_HARD_STOP_MS`（简洁）、`SPLASH_FILM_DURATION_MS`/`SPLASH_FILM_HARD_STOP_MS`（长片，仍由 `tools/test.mjs` 断言）。

## 5. 安装器与用户数据

- **安装器**：`bin/cli.mjs`（install / uninstall / doctor）→ `bin/installer.mjs`。把发布包文件复制到 `<DSH_HOME>/profiles/<profile>/node_modules/dsh-client-ui-skin-tianlight`，在 profile 的 `package.json` 登记 `dsh.profile.bundles`，备份到 profile 的 `.tianlight-installer/`。卸载只移走插件文件，用户数据保留。
- **用户数据**：`<profile.dir>/tianlight`（由 `lib/host-paths.js` 决定）：设置、`uploads/`、`derived/`、`state/`、`we-roots.json`、`migration.json`。legacy 的"插件目录内数据"只复制一次、不删除。
- **运行时资产**：`assets/` 与 `vendor/` 由宿主半经 `/skin-tianlight/<file>`（Range）与 WE 前缀提供；`assets/bg-4k.mp4`、`assets/cat.png` 是发布包内置的两个演示媒体。

## 6. 兼容策略与每日巡检

- 三处声明必须一致（`package.json` 的 `engines.dsh` + 官方包 peer、`skin.json.dshCompatibilityRange`），由 `tools/test.mjs` / `tools/audit.mjs` / `tools/verify.mjs` 守住；DSH 只读 `engines.dsh`/peer，不读 `dshCompatibilityRange`。
- 支持范围：DSH 0.2.0 / 0.2.1 / 0.2.2（含 rc/alpha）**已实测**；0.3.x 为**预适配**（`>=0.3.0-0 <0.4.0-0`，见 `tools/compat.mjs` 注释），由每日巡检兑现承诺，差异表见 [docs/COMPAT-0.3.0.md](docs/COMPAT-0.3.0.md)。
- 发布侧：tag 必须**一个一个推**；单次 push 超过 3 个 tag 时 GitHub 不产生 push 事件，`release.yml` 不会启动。推完用 `node tools/verify-tag-run.mjs <tag>` 确认 run 存在（`tools/release.mjs` 的收尾提示与 `PUBLISH.md` 都写了这条）；补发走 `workflow_dispatch` 的 `tag` 输入，不动 tag。
- 每日巡检：`.github/workflows/dsh-canary.yml`（npm `next`、`alpha`、最新已测版本对照；三个工具 + 范围判断；越界开 issue）；策略细节见 [docs/COMPATIBILITY.md](docs/COMPATIBILITY.md) §10。
- 升级前本地复验：`node tools/compat-matrix.mjs --dsh …`、`node tools/hook-scan.mjs --self-check`、`node tools/upgrade-check.mjs`、`node tools/smoke-dsh.mjs --dsh …`。

## 7. 发布流程

`dev`（开发）→ CI 全绿（`.github/workflows/check.yml` 的 Node 20/22 × Linux/Windows 静态矩阵，外加每日 `dsh-canary`）→ `ff` 合并到 `main` → `node tools/release.mjs`（bump 版本、写 RELEASE-NOTES、CHANGELOG、快照、提交、annotated tag、本地打包）→ 推 tag → `release.yml` 发布 GitHub Release → npm 发布 → `tools/verify-install.mjs` 用 SHA256SUMS 对照（v2.1.5 为 48/48；v2.1.8 因 9 个路由模块变为 57）。

## 8. 测试与门禁速查

| 命令 | 作用 |
| --- | --- |
| `npm run check` | build → test → structure → deps → audit → css → verify → i18n（CI 同款） |
| `npm run upgrade` | upgrade-check + hook-scan 自检 |
| `npm run compat` | 多版本静态兼容矩阵 |
| `node tools/smoke-dsh.mjs --dsh …` | 真实 DSH + headless Chrome 运行时冒烟（4 条断言） |
| `node tools/host-fuzz.mjs --old …` | 两个构建的宿主路由等价验证（状态码/9 个响应头/归一化响应体） |
| `node tools/canary-matrix.mjs` | 巡检矩阵解析（npm next/alpha + 最新已测） |
| `node tools/deps.mjs [--check]` | 片段依赖清单与跨片段引用门禁 |
| `node tools/agent-check.mjs` | 单分片快速检查（构建到 diag/tmp） |
