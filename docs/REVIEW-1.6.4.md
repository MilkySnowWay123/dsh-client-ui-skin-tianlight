# v1.6.4 全代码审查报告

> 范围：tianlight 皮肤插件（`src/` 26 帧段 + 宿主半 `lib/` 全量 + `tools/` 静态链）— 审查日期 2026-11-10
> 性质：发布前全量代码审查（初审 + 增量复审）；本文件记录**已修复问题**、**已知限制**与**安全/隐私/生命周期确认项**。
> 结论：高/中优先级问题已全部修复并纳入 verifier 回归；剩余已知限制不阻塞发布（详见 §3）。

## 1. 审查范围与方法

| 面 | 内容 |
|---|---|
| 浏览器半 | `src/00-envelope.js` … `src/99-apply.js` 全部 26 个片段：生命周期/dispose、监听器与定时器泄漏、异步竞态、null/undefined、i18n 中英缺漏、localStorage 容错、权限边界、XSS/注入（innerHTML/URL 拼接）、渲染性能、DSH 契约耦合 |
| 宿主半 | `lib/index.js`（路由/serve/Range/错误处理/缓存）、`lib/we-wallpaper/host.mjs`（WE 库扫描/流式响应/同源判定）、`lib/media-types.js`、`lib/host-paths.js`、`lib/transcode.js` |
| 构建工具 | `tools/build.mjs`、`test.mjs`、`structure.mjs`、`audit.mjs`、`check-css.mjs`、`verify.mjs`、`i18n-audit.mjs` 的风险评估（不改实现） |
| 方法 | 全量阅读 + 只读静态链（build --check / test / audit / structure --strict / i18n-audit / check-css）+ 对 v1.6.4 新功能（`src/40-companion.js` AI 对话与动作包、`src/76-role-hub.js` 形象列表与动作包编辑器）重点复核 |

## 2. 已修复问题

| ID | 位置 | 影响 | 修法 | 验证方式 |
|---|---|---|---|---|
| **H1** | `src/76-role-hub.js:1826`（`savePack`）；`src/40-companion.js:386`（`petActionsSet`） | 保存动作包会把「当前语言的默认文案」固化成自定义，切换语言后被冻结；清空某项无法删除旧 override | 中枢保存时只提交与默认显示值真正不同的动作（未改动→不提交、清空/改回默认→提交空动作删除 override）；桌宠侧 `set` 支持部分动作，省略的动作保留原自定义 | verifier H1 断言（只提交改动项/空动作删除/切语言不冻结）+ 代码走查 |
| **H2** | `lib/we-wallpaper/host.mjs:2035`（`pipeFileSafe`），调用点 `:2123` / `:2134` / `:2406` | 壁纸文件在 stat/open 之间被删、被 AV 锁、或客户端中途 abort 时，裸 `stream.pipe(res)` 触发未捕获 error → 宿主进程崩溃 / 文件句柄泄漏 | 新增 `pipeFileSafe`：监听流 `error` 与响应 `close`/`error`，`destroy()` 流与响应并释放句柄；所有 WE 文件响应改走它 | verifier 静态断言 + code walkthrough（host 崩溃路径消除） |
| **M1** | `src/55-lowpower.js:51` / `:138` / `:179` | dispose 之后仍可能有异步回调写状态、派发事件（低电量状态机） | 增加 `disposed` 标志，dispose 后所有异步分支直接返回 | verifier 断言 + 单例重载回归 |
| **M2** | `src/65-bridge.js:96` | 选择器桥的 `stamped` 集合保留已从 DOM 移除的节点，长时间运行后集合无界增长 | `stampAll` 清理 `isConnected === false` 的节点 | verifier 断言 + 长时间运行走查 |
| **M3** | `src/40-companion.js:1015`（`openChat`）；`src/20-stylesheet.js:3033`（`data-tl-chat-flip`） | 桌宠贴近屏幕顶部时，AI 对话输入条被挤出视口、不可用 | 打开时判断 `y < 96`，root 加 `data-tl-chat-flip`，CSS 把输入条翻到桌宠下方 | verifier 断言（flip 属性）+ 浏览器点验 |
| **M4** | `lib/transcode.js:227`（kill）/ `:234`（`killTimer` 兜底） | 转码子进程被 SIGKILL 后若 `close` 事件不触发，Promise 永久悬挂、按钮一直 loading | kill 后加 5s 兜底 `finish({reason:"transcode timed out"})`，Promise 必 settle | verifier 断言 + 转码失败路径走查 |
| **M5** | `lib/index.js:255`（`isSameOriginRequest`）/ `:282-283`（`handle()` 开头 403）；`lib/we-wallpaper/host.mjs:1975`（`requireSameOrigin`）；`tools/test.mjs:1382-1424` | 宿主路由同源栅栏过松（部分跨站请求可命中），且无契约测试保护 | 统一收紧 `isSameOriginRequest`（Origin / Sec-Fetch-Site 判定），`handle()` 开头直接 403；WE 宿主同步收紧；`tools/test.mjs` 增加 WE 路由族同源栅栏契约测试 | 静态链 `test` + verifier 断言 |
| **M5 回归**（复审发现并修复） | `lib/index.js:236`（`SANDBOXED_READ_PATHS`）/ `:238-253`（`isSandboxedRead`，其中 `:241-248` 做路径归一化）；`lib/we-wallpaper/host.mjs:1975` / `:1986-1994`（`requireSameOrigin` 归一化 + `/web/` 只读放行）；`tools/test.mjs:1408-1437`（沙箱回归 + dot-dot） | 初版收紧同源栅栏后，**沙箱（opaque-origin）iframe 的子资源 GET**（WebWallGL 场景与网页壁纸；请求带 `Sec-Fetch-Site: cross-site`、`Origin: null`）被 403 → 场景/网页壁纸加载失败 | `lib/index.js` 增加只读放行清单 `SANDBOXED_READ_PATHS`（`/_engine/webwallgl.js`、`/_scene-project/`、`/_web-project/`、`/_scene-frame`）：仅 `GET`/`HEAD` 且 opaque/cross-site 才放行；**allowlist 判定前先用 WHATWG URL 归一化 pathname，`..`/`%2e%2e` 不能绕过**；`lib/we-wallpaper/host.mjs` 对 `/api/we-wallpaper/web/` 只读放行并同样归一化；**opaque/cross-site 写入仍 403**，其它跨站读取（如 `_settings`）仍拒绝 | `tools/test.mjs:1408-1437` 回归（沙箱只读脚本/场景帧/项目资源非 403；**新增 2 条 dot-dot 逃逸仍 403**；`_settings` GET 与 `_transcode` POST 仍 403）；verifier 新增 **S90–S93**（index allowlist / host `/web/` / test 契约 / pathname 归一化）；复审复检通过 |

## 3. 已知限制（不阻塞发布）

| ID | 限制 | 影响 / 处置 |
|---|---|---|
| **M6** | `_engines` / `_wallpapers` 的 WE 库扫描在请求路径内同步执行（`lib/index.js:351`（`_wallpapers`）/`:368`（`_engines`）路由 + `lib/we-wallpaper/host.mjs` 扫描器） | 首次打开可能多耗数百 ms（大库/慢盘）；ffmpeg 探测有超时；已有降级路径，不阻塞交互。后续可加惰性缓存/后台扫描 |
| **M7** | 「生成动态」WE 场景录制的 teardown 最长约 18s（`vendor/we-wallpaper/wcap` 子进程退出等待） | 仅用户手动点「生成动态」时触发，日常使用不涉及；UI 有进度与失败提示，无手动取消 |
| 低风险 | M3 聊天输入条的 flip 阈值固定 `y < 96`，聊天打开后拖动桌宠/窗口 resize 不重算 flip | 功能可用：拖动桌宠或重开聊天即恢复正确位置；未在本版修 |
| 低风险 | 选择器桥全量扫描：DOM 高频变化时每帧一次 `querySelectorAll`（已防抖到一帧一次） | CPU 峰值可见但不致卡死；后续可做增量扫描 |
| 低风险 | 其余为样式/注释类问题与外观细节，不影响功能与发布 |

## 4. 安全 / 隐私 / 生命周期确认

- **权限模型不变**：AI 对话只调用既有 `globalThis.tianlightPet.chat(text)`，沿用大脑的暂停、权限白名单、日/分钟配额、审计与失败回退；**没有新增能力、没有新增网络路径**；`agent`（驱动 DSH）仍永久禁止。
- **隐私**：动作包写本机 `localStorage["tianlight.petActions.v1"]` + 本机宿主 settings 镜像（12-schema 镜像，**不上传网络**）；聊天不发送 DSH 会话/文件/凭据（沿用大脑契约）；天气仍默认关、显式启用才联网。
- **宿主安全**：同源栅栏收紧（M5）后路由默认拒绝跨站；**沙箱 iframe 的壁纸只读通道**（engine 脚本 / scene-project / web-project / scene-frame，以及 `/api/we-wallpaper/web/`）经白名单放行，opaque/cross-site **写入**与其它跨站读取仍 403（见 §2 M5 回归）；WE 文件流式响应有 error/close 清理（H2），异常路径不再崩溃宿主；`lib/index.js` 既有 403/路径 containment/只读路由不变。
- **生命周期**：AI 对话 DOM/监听在桌宠模块 dispose 时清理（含 `tianlight:pet-media`/`tianlight:pet-actions` 订阅）；中枢动作包编辑器对 UI null/API 缺失安全降级；低电量 dispose 后不再异步写状态（M1）；选择器桥清理失效节点（M2）；`tianlightPetActions` 全局句柄在重装时恢复上一实例（不重复泄漏）。
- **i18n**：新增 29 键（`pet.*` 16 + `hub.media.*` 13）zh/en 成对，无占位符不匹配；注册键总数 1216 → 1245。
- **兼容**：未新增 DSH 契约依赖，0.2.0/0.2.1/0.2.2 三线矩阵结论不变。

## 5. 复审状态

- **增量复审完成**：M5 沙箱栅栏回归已修复并通过复审复检（**收尾复检 PASS，20:48**），无新增阻断问题；H1 保存语义、H2 异常路径、M1–M5 修复均覆盖原缺陷（详见 §2）；采纳 reviewer 唯一非阻塞加固——allowlist 路径归一化防 `..` 绕过（含 2 条 dot-dot 回归测试）。
- 本文件与 [docs/RELEASE-1.6.4.md](docs/RELEASE-1.6.4.md) 口径一致：以纳入发布的最终 diff 为准；若发布前再发现新问题，由 Lead 决定修复或转入已知限制。
