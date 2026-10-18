# 天光皮肤 · 重大升级（P0 → P1 → P3 已落地）

> 参考项目：
> - <https://github.com/elysia395/dsh-wallpaper-engine#readme>（WebWallGL、遮挡暂停、准备后切换、隐藏/上传/轮播）
> - <https://github.com/starsstreaming/beautiCode/tree/main/integrations/deepseek-harness>（可读面板、氛围层、背景媒体、宿主鉴权边界）
>
> 参考的是**问题与边界**，不是代码：本仓库仍是单文件 ESM 客户端 + 无依赖宿主，
> 没有引入 ffmpeg / media bridge / 后台市场，也没有照搬别人的状态机。
>
> 从 beautiCode 只取两点结构性启发：**背景媒体与可读面板分离**（本皮肤的 `--tl-panel-fill`
> 与状态行是这条的轻量版），以及**宿主侧媒体/鉴权边界**（上传与场景文件都在宿主收口）。
> 它的 water/atmosphere 全屏 canvas 没有引入：那会在主视频之外再加一个 60Hz 合成层，
> 与本轮「播放稳定优先」的性能预算冲突；留作以后可选的氛围层。

## 0. 基线

- 快照：`20261018-192547`（UI 回退到 190410）；P1 末为 `20261018-170251`。
- 浏览器半：`lib/client.js` ≈ 318.2KB / 9,099 行；`src/` 13 个片段。
- 宿主半：`lib/index.js` 296 行 + `http-media.js` / `media-types.js` / `upload.js` / `scene-project.js`。
- `npm run check`：23 个宿主测试 + 结构/审计/CSS/verify 全绿。

## 1. P0 · 播放稳定（已完成）

问题现象：刷新后动态壁纸有时不播放，点一下才恢复。

根因不是单一 bug，而是**状态不可见 + 恢复路径不完整**：

1. 自动播放被浏览器拦截时，`video.play()` 的 rejection 只写 console；面板仍显示「动态壁纸」。
2. 省电 `auto` 可能因低电量/省流量/`prefers-reduced-motion` 触发，但面板只有一个布尔值，没有原因。
3. 手势解锁只监听 `pointerdown`，宿主若 `stopPropagation` 就收不到；窗口聚焦/bfcache 恢复没有重试。
4. 暂停没有「归属」，`visibilitychange` 会覆盖用户手动暂停。

落地：

- **播放状态总线** `sceneStatusController`：`idle/loading/ready/playing/paused/blocked/stalled/still/lowpower/hidden/error`；场景发布，面板订阅，不再靠轮询 DOM 猜。
- `data-tl-play` / `data-tl-reason` 两个属性：状态与失败原因可从 devtools 直接读。
- **一次请求入口** `attemptPlay(source)`：区分 `NotAllowedError`（等手势）、`AbortError`（换源竞态，350ms 重试）、其它（报错）；成功后重置重试计数。
- **手势解锁**：`pointerdown` / `keydown` / `touchstart` 全部 capture 阶段监听；另有 `focus` / `pageshow` / `visibilitychange` 重试。
- **60 秒看门狗**（2.5s tick）：视频在应播状态下停住且 `readyState>=2` 时自动重试，最多 4 次；超过则报 `stalled` 让面板给「重试」。
- **舞台抖动统计**：rVFC 记录 1 秒窗口内最大帧间隔，`data-tl-jitter` → 面板显示「帧间隔抖动 xxms」；`stalled` 后第一帧到达会自动清掉。
- **低电量/省流量/减少动效的原因**：`lowPowerController.state()` 返回 `{mode, active, reason, detail}`，订阅式通知；面板显示「省电暂停 · 电量 15% 且未充电」。
- **暂停归属**：`userPaused` 与持久化 `playback.paused` 分离；手动暂停刷新后仍保持，低电量恢复不会偷偷覆盖。
- **切源不黑屏**：切换视频前把当前帧抓成 JPEG 垫在 `photo` 层，新源 `loadeddata` 后交叉淡出；跨域取不到帧时退回渐变。
- **暗化层修复**：`[data-tl-dim]` 元素此前根本没创建，④外观的「暗化」滑杆是死控件；现在补上。

## 2. P1 · 播放与壁纸库（已完成）

- **画面滤镜**：亮度/对比度/饱和度（50–150%），**默认关闭**；用 `[data-tl-filter]` 属性门控，中性值不产生全屏 filter 路径。面板明确写出 4K/60fps 掉帧时先关。
- **自动轮播**：`{on, order, interval 30–600s, favoritesOnly}`；只在页面可见、未省电、未手动暂停时推进；当前这张不重复；**先解析下一张元数据/预解码图片，再切换**；隐藏和不喜欢的壁纸不参与；坏文件跳过。
- **隐藏/恢复**：`tianlight.library.items[url].hidden`；只改列表，不删文件、不打断播放；「显示隐藏 N」筛选。
- **卡片元数据**：宿主 `stat` 出 `bytes`，面板显示类型/文件大小；当前视频补 `时长 mm:ss`。
- **上传**：`POST /skin-tianlight/_upload?name=...`；512MB 流式上限（`TIANLIGHT_UPLOAD_MAX` 可调）、只收图片/视频、文件名清洗（中文/4K 名不再被拒）、同名加序号、`.part-*` 后 rename；`assets/uploads/` 与本地壁纸走同一 Range 管道。`tools/test.mjs` 与 `tools/verify.mjs` 覆盖拒绝路径，另有一次性探针验证落盘/同名/空文件。
- **来源 tab 修正**：场景条目归入 WE tab，不再误进「本地」；本地/WE 计数与空状态同步。

## 3. P3 · WebWallGL 场景（已接入，可选）

设计取向：**引擎是可选依赖，不是打进 client.js 的代码**。

- 引擎：`vendor/webwallgl/webwallgl.global.min.js`（MIT，WebWallGL 3.0；保留 LICENSE 与上游 README）。宿主从 `_engine/webwallgl.js` 供文件，缺失时 `_engines` 返回 `webwallgl:false`。
- 适配页：`lib/scene-frame.html` 由 `_scene-frame` 提供，带 CSP `sandbox allow-scripts`；客户端再套 `sandbox="allow-scripts"` iframe → **opaque origin**，场景脚本拿不到宿主页面。
- 场景发现：宿主扫描 WE roots 下含 `project.json` 的目录，只收 `type:"scene"`，有 `scene.pkg`/`scene.json` 才进清单；预览图存在则作卡片缩略图。
- 文件面：`/_scene-project/<root>/<dir>/<...path>`，逐段 `SAFE_NAME` + 解析后包含检查 + 扩展名白名单（无 html/js/exe），CORS 仅对该路由开放。
- 生命周期：首帧 20s 预算；`ready/error/stats` 三类 postMessage，父页面校验 `event.source`；暂停/省电/隐藏通过 `pause` 命令停引擎；失败按「上一张可播 → 自动选择 → 渐变」降级。
- 不做：WE 网页壁纸、系统音频回环、ffmpeg 转码、真在线市场（P2/P4，仍需要宿主/后端能力）。

## 4. 为什么不是照抄

| 参考做法 | 本文做法 | 原因 |
|---|---|---|
| 面板轮询/读 DOM 判断播放 | 状态总线 + 订阅 | 单一事实源，面板不再猜 |
| 低电量只有一个布尔 | `{reason, detail}` 快照 | 用户需要知道「为什么停了」 |
| 自动轮播直接切 | 先准备再切 + 跳过坏文件 | 避免黑帧与空白 |
| 引擎内联进插件 | 可选 vendor + 沙箱 iframe | 单文件产物/许可证/失败隔离 |
| 宿主一个大 index.js | 媒体/上传/场景/HTTP 分层 | 429 行提示后拆分，职责可测 |
| 复制参考的 UI 文案 | 沿用天光六段面板 + 状态行 | 保持本皮肤的信息架构 |

## 5. 测试

- `npm run check`：build --check、23 个宿主测试、structure、audit、check-css、verify（含上传/场景/引擎拒绝路径）。
- 上传落盘/同名/空文件：一次性 Node 探针（跑完删除，不留在仓库）。
- 场景目录/路径包含：`tools/test.mjs` 用临时目录。
- 浏览器人工：见 `docs/WALLPAPER-UI.md` 第六节新增验收项；重点看顶部状态、刷新后暂停保持、轮播顺延、隐藏不打断、场景降级。

## 6. 剩余

- P2：设置迁宿主 `config.json`、系统音频回环/Now Playing、可选 ffmpeg 转码。
- P4：真市场（托管/审核/CDN/版本兼容）。
- 已知限制：场景只支持 ASCII 目录名与 `scene.pkg`/松散 `scene.json`；WebWallGL 兼容性取决于具体工坊项目；引擎缺失时只显示预览。
