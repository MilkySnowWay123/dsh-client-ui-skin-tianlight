		//#region wallpaper engine extras
		/**
		 * A 期壁纸引擎的客户端扩展（由 wallpaper-engine 工作流实现）：
		 *
		 *   A1 系统音频回环：用户手势后 getDisplayMedia({audio:true})，只做实时
		 *      AnalyserNode 分析驱动可视化，不录音、不留存；拒绝/无设备/不支持
		 *      三种提示由 audioRuntime 状态机给出（采集与电平在 30 的 audioController）。
		 *   A2 Now Playing：读 MediaSession 元数据，拿不到就静默隐藏。
		 *   A3 Web 壁纸：kind="web" 走 opaque-origin 沙箱 iframe（DOM 在 30）。
		 *   A4 动态分辨率：同一素材的 1080/4K 变体按窗口与 DPR 自动选择（30）。
		 *   A5 预裁剪缓存：静态帧按窗口比例写入宿主缓存；本文件是面板与诊断。
		 *   B4 转场系统：fade/slide/zoom/dissolve + 时长，转场中保持音频状态。
		 *   C3 性能自适应 v2：依据帧率/抖动自动降档（30 采样，本文件只读展示 + 锁定）。
		 *
		 * 本文件只做三件事：注册面板分区、维护跨改动可见的控制器、以及把
		 * 宿主能力（缓存/转码）包装成诚实降级的 UI。所有 DOM/采集都归 30 管。
		 */

		/* ================= i18n（新增文案全部双语） ================= */
		registerTl5Strings({
			zh: {
				"section.engine": "壁纸引擎",
				"audio.title": "音频",
				"audio.loopback": "系统音频回环",
				"audio.loopbackHint": "点下面的按钮后，在系统弹窗里勾选「分享音频」。只做实时分析驱动律动，不录音、不上传、不保存任何采样。",
				"audio.start": "启用系统音频",
				"audio.stop": "停止分析",
				"audio.idle": "未启用",
				"audio.busy": "正在请求系统音频授权…",
				"audio.activeSystem": "分析中（系统音频）",
				"audio.activeMic": "分析中（麦克风）",
				"audio.moduleOff": "音频模块已关闭：在「工程」分区重新打开后才能启用。",
				"audio.nowPlaying": "Now Playing",
				"audio.nowPlayingHint": "来自当前页面的 MediaSession 元数据；没有播放中的媒体时不显示。",
				"audio.playing": "正在播放",
				"audio.pausedState": "已暂停",
				"audio.unsupported": "当前浏览器不支持系统音频回环",
				"audio.denied": "已拒绝共享音频：点按钮重试，并在弹窗里勾选「分享音频」",
				"audio.micDenied": "麦克风被拒绝：在地址栏权限里允许后重试",
				"audio.noDevice": "没有可用的系统音频设备（共享屏幕时请勾选「分享音频」）",
				"audio.micMissing": "没有可用的麦克风",
				"audio.hiddenPage": "页面隐藏，回到页面后再启用",
				"audio.lowpower": "省电模式暂停中，先关闭省电再启用音频",
				"audio.cancelled": "已取消",
				"audio.stopped": "已停止音频分析",
				"audio.stoppedByModule": "音频模块已关闭，已停止分析",
				"audio.unknownError": "未知错误",
				"audio.failedSystem": "无法启用系统音频：{reason}",
				"audio.failedMic": "无法启用麦克风：{reason}",
				// v1 mic path lives in 30-wallpaper.js but its user-visible reasons are
				// rendered by this section's controller, so the copy is owned here.
				"audio.micBusy": "正在请求麦克风，请稍候",
				"audio.micNeedsShader": "先应用 ShaderToy 壁纸，再启用音频",
				"audio.micUnsupported": "当前浏览器不支持麦克风",
				"audio.webaudioUnsupported": "当前浏览器不支持 WebAudio",
				"audio.stopHidden": "页面隐藏，已停止音频",
				"audio.stopSwitch": "切换壁纸，已停止音频",
				"audio.stopContext": "图形上下文丢失，已停止音频",
				"audio.stopSkin": "皮肤已关闭",
				"audio.stopAnalysis": "音频分析失败，已停止",
				"audio.beatLive": "系统音频节拍（实时）",
				"engine.resolution": "目标画布",
				"engine.variant": "源变体",
				"engine.variantValue": "{tier}（可用 {tiers}）",
				"engine.noVariant": "单文件（无分辨率变体）",
				"engine.summary": "{cache} · {adaptive}",
				"engine.summaryCache": "缓存 {hit}/{miss}",
				"engine.summaryDegraded": "降档中",
				"engine.summaryLocked": "已锁定",
				"engine.summaryIdle": "未降档",
				"engine.summaryOff": "自适应关",
				"engine.webPauseHint": "网页壁纸：暂停会卸载沙箱页面（项目内状态会重置）。",
				"engine.webUrl": "工程：{url}",
				"engine.adaptive": "性能自适应",
				"engine.adaptiveIdle": "运行正常，未降档",
				"engine.adaptiveOff": "已关闭（智能情境里关闭或锁定）",
				"engine.adaptiveLocked": "已锁定：不自动降档",
				"engine.adaptiveLockedHint": "锁定后即使持续掉帧也不降档；解锁后会在下一次采样恢复自动。",
				"engine.adaptiveLock": "锁定自适应",
				"engine.adaptiveUnlock": "解除锁定",
				"engine.fps": "帧率",
				"engine.jitter": "抖动",
				"engine.cache": "预裁剪缓存",
				"engine.cacheHint": "播放一帧后缓存按窗口比例裁好的静态图，下次加载先铺它，缩短首帧发糊时间。",
				"engine.cacheStats": "条目 {entries} · {size} · 命中 {hit} / 未命中 {miss}",
				"engine.cacheUnavailable": "宿主未重启或缓存路由不可用；不影响壁纸播放。",
				"engine.cacheRefresh": "刷新状态",
				"engine.cacheClear": "清空缓存",
				"engine.cacheClearing": "清理中…",
				"engine.cacheCleared": "已清空缓存（{bytes}）",
				"engine.transcode": "转码（HEVC/GIF → H.264/MP4）",
				"engine.transcodeHint": "宿主有 ffmpeg 时才可用；转码输出为新文件，原文件不动。",
				"engine.transcodeUnavailable": "宿主缺少 ffmpeg，转码不可用。",
				"engine.transcodeChecking": "正在检测 ffmpeg…",
				"engine.transcodeNone": "没有可转码的本地/上传素材。",
				"engine.transcodeDo": "转换",
				"engine.transcodeBusy": "转码中…",
				"engine.transcodeOk": "已转码：{name}",
				"engine.transcodeFail": "转码失败：{reason}",
				"engine.transcodeFound": "已转码并应用：{name}",
				"engine.transcodeRefresh": "重新检测",
				"engine.transcodeMore": "还有 {count} 个…",
				"engine.hostOffline": "宿主未重启或路由不可用。",
				"engine.adaptiveSection": "自适应降档",
				"engine.contextOff": "智能情境模块已关闭，自适应不会动作。",
				"engine.adaptive.staticReason": "性能自适应：视频→静态帧（平均 {fps}fps）",
				"engine.adaptive.perfReason": "性能自适应：视频→静态帧（检测到掉帧/抖动）",
				"engine.adaptive.fpsReason": "性能自适应：着色器限制在 {cap}fps（实测 {fps}fps）",
				"engine.adaptiveFreezeHint": "自动降档可能冻结动态壁纸：如果画面停住，用下面的「锁定自适应」关闭它。",
				"engine.adaptiveLine": "{label}：{value}",
				"engine.transcodeLine": "{label}：{hint}",
				"engine.bytesKb": "{n} KB",
				"engine.bytesMb": "{n} MB",
			},
			en: {
				"section.engine": "Wallpaper engine",
				"audio.title": "Audio",
				"audio.loopback": "System audio loopback",
				"audio.loopbackHint": "Click the button, then tick “Share audio” in the picker. Live analysis only: nothing is recorded, uploaded or stored.",
				"audio.start": "Enable system audio",
				"audio.stop": "Stop analysis",
				"audio.idle": "Off",
				"audio.busy": "Requesting system audio…",
				"audio.activeSystem": "Analyzing (system audio)",
				"audio.activeMic": "Analyzing (microphone)",
				"audio.moduleOff": "Audio module is off: re-enable it in Engineering.",
				"audio.nowPlaying": "Now Playing",
				"audio.nowPlayingHint": "Read from this page's MediaSession; hidden when nothing is playing.",
				"audio.playing": "Playing",
				"audio.pausedState": "Paused",
				"audio.unsupported": "This browser cannot capture system audio",
				"audio.denied": "Audio sharing was refused: retry and tick “Share audio” in the picker",
				"audio.micDenied": "Microphone denied: allow it in the address bar, then retry",
				"audio.noDevice": "No system audio device (tick “Share audio” when sharing a screen)",
				"audio.micMissing": "No microphone available",
				"audio.hiddenPage": "Page is hidden: come back before enabling",
				"audio.lowpower": "Low-power is on: disable it before enabling audio",
				"audio.cancelled": "Cancelled",
				"audio.stopped": "Audio analysis stopped",
				"audio.stoppedByModule": "Audio module off: analysis stopped",
				"audio.unknownError": "unknown error",
				"audio.failedSystem": "Could not enable system audio: {reason}",
				"audio.failedMic": "Could not enable the microphone: {reason}",
				"audio.micBusy": "Requesting the microphone, one moment",
				"audio.micNeedsShader": "Apply a ShaderToy wallpaper before enabling audio",
				"audio.micUnsupported": "This browser cannot use a microphone",
				"audio.webaudioUnsupported": "This browser cannot use WebAudio",
				"audio.stopHidden": "Page hidden: audio stopped",
				"audio.stopSwitch": "Wallpaper changed: audio stopped",
				"audio.stopContext": "Graphics context lost: audio stopped",
				"audio.stopSkin": "Skin closed",
				"audio.stopAnalysis": "Audio analysis failed: stopped",
				"audio.beatLive": "System audio beat (live)",
				"engine.resolution": "Target canvas",
				"engine.variant": "Source variant",
				"engine.variantValue": "{tier} (available {tiers})",
				"engine.noVariant": "Single file (no resolution variants)",
				"engine.summary": "{cache} · {adaptive}",
				"engine.summaryCache": "cache {hit}/{miss}",
				"engine.summaryDegraded": "degraded",
				"engine.summaryLocked": "locked",
				"engine.summaryIdle": "ok",
				"engine.summaryOff": "adaptive off",
				"engine.webPauseHint": "Web wallpaper: pausing unloads the sandboxed page (in-project state resets).",
				"engine.webUrl": "Project: {url}",
				"engine.adaptive": "Adaptive performance",
				"engine.adaptiveIdle": "Healthy, no downgrade",
				"engine.adaptiveOff": "Off (disabled or locked in Smart context)",
				"engine.adaptiveLocked": "Locked: never downgrades",
				"engine.adaptiveLockedHint": "While locked, sustained low fps will not downgrade; unlocking resumes automatic behaviour on the next sample.",
				"engine.adaptiveLock": "Lock adaptive",
				"engine.adaptiveUnlock": "Unlock",
				"engine.adaptive.staticReason": "Adaptive performance: video downgraded to a still frame (avg {fps} fps)",
				"engine.adaptive.perfReason": "Adaptive performance: video downgraded to a still frame (dropped frames / stutter detected)",
				"engine.adaptive.fpsReason": "Adaptive performance: shader capped at {cap} fps (measured {fps} fps)",
				"engine.adaptiveFreezeHint": "Automatic downgrade can freeze the video wallpaper: if the picture stops, use “Lock adaptive” below to turn it off.",
				"engine.adaptiveLine": "{label}: {value}",
				"engine.transcodeLine": "{label}: {hint}",
				"engine.fps": "FPS",
				"engine.jitter": "Jitter",
				"engine.cache": "Pre-crop cache",
				"engine.cacheHint": "Caches a window-aspect still after the first frame so the next load paints it before the video decodes.",
				"engine.cacheStats": "{entries} entries · {size} · hits {hit} / misses {miss}",
				"engine.cacheUnavailable": "Host not restarted or cache route missing; playback is unaffected.",
				"engine.cacheRefresh": "Refresh status",
				"engine.cacheClear": "Clear cache",
				"engine.cacheClearing": "Clearing…",
				"engine.cacheCleared": "Cache cleared ({bytes})",
				"engine.transcode": "Transcode (HEVC/GIF → H.264/MP4)",
				"engine.transcodeHint": "Only with ffmpeg on the host; output is a new file, the source is untouched.",
				"engine.transcodeUnavailable": "Host has no ffmpeg; transcode is unavailable.",
				"engine.transcodeChecking": "Detecting ffmpeg…",
				"engine.transcodeNone": "No local/uploaded media to transcode.",
				"engine.transcodeDo": "Convert",
				"engine.transcodeBusy": "Transcoding…",
				"engine.transcodeOk": "Transcoded: {name}",
				"engine.transcodeFail": "Transcode failed: {reason}",
				"engine.transcodeFound": "Transcoded and applied: {name}",
				"engine.transcodeRefresh": "Check again",
				"engine.transcodeMore": "{count} more…",
				"engine.hostOffline": "Host not restarted or route unavailable.",
				"engine.adaptiveSection": "Adaptive downgrade",
				"engine.contextOff": "Smart context module is off; adaptive does nothing.",
				"engine.bytesKb": "{n} KB",
				"engine.bytesMb": "{n} MB",
			},
		});

		/* ================= 样式（转场 / 网页壁纸 / 两个分区） ================= */
		registerTl5Css(String.raw`
/* ---- B4 transitions: keyed off [data-tl-transition] on the scene ---- */
body[data-dsh-tianlight] [data-tl-scene] {
	--tl-tx-ms: 600ms;
	--tl-flip: 1 1;
}
/* R6 D: the mirror uses the independent scale property (fed by --tl-flip), so a
   slide/zoom transition animating transform composes with it instead of
   overriding the flip for the whole transition. */
body[data-dsh-tianlight] [data-tl-scene] > video {
	scale: var(--tl-flip, 1 1);
}
body[data-dsh-tianlight] [data-tl-scene] > [data-tl-web] {
	position: absolute;
	inset: 0;
	width: 100%;
	height: 100%;
	border: 0;
	background: transparent;
	pointer-events: none;
}
body[data-dsh-tianlight] [data-tl-scene][data-tl-web-on] > [data-tl-web] {
	display: block;
}
body[data-dsh-tianlight] [data-tl-scene][data-tl-transition] > video,
body[data-dsh-tianlight] [data-tl-scene][data-tl-transition] > [data-tl-shader],
body[data-dsh-tianlight] [data-tl-scene][data-tl-transition] > [data-tl-scene-frame],
body[data-dsh-tianlight] [data-tl-scene][data-tl-transition] > [data-tl-web],
body[data-dsh-tianlight] [data-tl-scene][data-tl-transition] > [data-tl-photo][data-tl-photo-role="media"],
body[data-dsh-tianlight] [data-tl-scene][data-tl-transition] > [data-tl-photo][data-tl-photo-role="held"] {
	animation-duration: var(--tl-tx-ms, 600ms);
	animation-timing-function: cubic-bezier(0.22, 0.7, 0.2, 1);
	animation-fill-mode: both;
}
body[data-dsh-tianlight] [data-tl-scene][data-tl-transition="fade"] > video,
body[data-dsh-tianlight] [data-tl-scene][data-tl-transition="fade"] > [data-tl-shader],
body[data-dsh-tianlight] [data-tl-scene][data-tl-transition="fade"] > [data-tl-scene-frame],
body[data-dsh-tianlight] [data-tl-scene][data-tl-transition="fade"] > [data-tl-web],
body[data-dsh-tianlight] [data-tl-scene][data-tl-transition="fade"] > [data-tl-photo][data-tl-photo-role="media"] {
	animation-name: tl5-tx-fade-in;
}
body[data-dsh-tianlight] [data-tl-scene][data-tl-transition="fade"] > [data-tl-photo][data-tl-photo-role="held"] {
	animation-name: tl5-tx-fade-out;
}
body[data-dsh-tianlight] [data-tl-scene][data-tl-transition="slide"] > video,
body[data-dsh-tianlight] [data-tl-scene][data-tl-transition="slide"] > [data-tl-shader],
body[data-dsh-tianlight] [data-tl-scene][data-tl-transition="slide"] > [data-tl-scene-frame],
body[data-dsh-tianlight] [data-tl-scene][data-tl-transition="slide"] > [data-tl-web],
body[data-dsh-tianlight] [data-tl-scene][data-tl-transition="slide"] > [data-tl-photo][data-tl-photo-role="media"] {
	animation-name: tl5-tx-slide-in;
}
body[data-dsh-tianlight] [data-tl-scene][data-tl-transition="slide"] > [data-tl-photo][data-tl-photo-role="held"] {
	animation-name: tl5-tx-slide-out;
}
body[data-dsh-tianlight] [data-tl-scene][data-tl-transition="zoom"] > video,
body[data-dsh-tianlight] [data-tl-scene][data-tl-transition="zoom"] > [data-tl-shader],
body[data-dsh-tianlight] [data-tl-scene][data-tl-transition="zoom"] > [data-tl-scene-frame],
body[data-dsh-tianlight] [data-tl-scene][data-tl-transition="zoom"] > [data-tl-web],
body[data-dsh-tianlight] [data-tl-scene][data-tl-transition="zoom"] > [data-tl-photo][data-tl-photo-role="media"] {
	animation-name: tl5-tx-zoom-in;
}
body[data-dsh-tianlight] [data-tl-scene][data-tl-transition="zoom"] > [data-tl-photo][data-tl-photo-role="held"] {
	animation-name: tl5-tx-zoom-out;
}
body[data-dsh-tianlight] [data-tl-scene][data-tl-transition="dissolve"] > video,
body[data-dsh-tianlight] [data-tl-scene][data-tl-transition="dissolve"] > [data-tl-shader],
body[data-dsh-tianlight] [data-tl-scene][data-tl-transition="dissolve"] > [data-tl-scene-frame],
body[data-dsh-tianlight] [data-tl-scene][data-tl-transition="dissolve"] > [data-tl-web],
body[data-dsh-tianlight] [data-tl-scene][data-tl-transition="dissolve"] > [data-tl-photo][data-tl-photo-role="media"] {
	animation-name: tl5-tx-dissolve-in;
}
body[data-dsh-tianlight] [data-tl-scene][data-tl-transition="dissolve"] > [data-tl-photo][data-tl-photo-role="held"] {
	animation-name: tl5-tx-dissolve-out;
}
@keyframes tl5-tx-fade-in {
	from { opacity: 0; }
	to { opacity: 1; }
}
@keyframes tl5-tx-fade-out {
	from { opacity: 1; }
	to { opacity: 0; }
}
@keyframes tl5-tx-slide-in {
	from { opacity: 0.55; transform: translate3d(5%, 0, 0) scale(1.03); }
	to { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
}
@keyframes tl5-tx-slide-out {
	from { opacity: 1; transform: translate3d(0, 0, 0); }
	to { opacity: 0; transform: translate3d(-6%, 0, 0); }
}
@keyframes tl5-tx-zoom-in {
	from { opacity: 0.5; transform: scale(1.09); }
	to { opacity: 1; transform: scale(1); }
}
@keyframes tl5-tx-zoom-out {
	from { opacity: 1; transform: scale(1); }
	to { opacity: 0; transform: scale(0.93); }
}
@keyframes tl5-tx-dissolve-in {
	from { opacity: 0; filter: blur(10px); }
	to { opacity: 1; filter: blur(0); }
}
@keyframes tl5-tx-dissolve-out {
	from { opacity: 1; filter: blur(0); }
	to { opacity: 0; filter: blur(12px); }
}
@media (prefers-reduced-motion: reduce) {
	body[data-dsh-tianlight] [data-tl-scene][data-tl-transition] > video,
	body[data-dsh-tianlight] [data-tl-scene][data-tl-transition] > [data-tl-shader],
	body[data-dsh-tianlight] [data-tl-scene][data-tl-transition] > [data-tl-scene-frame],
	body[data-dsh-tianlight] [data-tl-scene][data-tl-transition] > [data-tl-web],
	body[data-dsh-tianlight] [data-tl-scene][data-tl-transition] > [data-tl-photo] {
		animation: none;
	}
}
/* ---- engine/audio panel sections (registered here, mounted by 70) ---- */
body[data-dsh-tianlight] .tl5-eng-kv {
	display: grid;
	grid-template-columns: minmax(72px, auto) 1fr;
	gap: 3px 10px;
	font-size: 12px;
	line-height: 1.5;
	color: var(--tl-ink-soft);
}
body[data-dsh-tianlight] .tl5-eng-kv > b {
	font-weight: 500;
	color: var(--tl-ink);
}
body[data-dsh-tianlight] .tl5-eng-actions {
	display: flex;
	flex-wrap: wrap;
	gap: 6px;
	margin: 6px 0;
}
body[data-dsh-tianlight] .tl5-eng-item {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 8px;
	padding: 3px 0;
	font-size: 12px;
}
body[data-dsh-tianlight] .tl5-eng-name {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
body[data-dsh-tianlight] .tl5-audio-dot {
	display: inline-block;
	width: 7px;
	height: 7px;
	margin-right: 6px;
	border-radius: 50%;
	background: var(--tl-accent);
	opacity: 0.45;
	transform-origin: center;
}
body[data-dsh-tianlight] [data-tl-beat] .tl5-audio-dot {
	opacity: 1;
	animation: tl5-audio-pulse 1.6s ease-in-out infinite;
}
/* Loopback ON: the dot is driven by the real analyser level at ~10 Hz (inline
   transform/opacity from the panel), so the decorative animation must yield. */
body[data-dsh-tianlight] .tl5-audio-dot[data-tl-audio-driven] {
	animation: none;
}
body[data-dsh-tianlight] .tl5-audio-beat {
	display: flex;
	align-items: center;
	gap: 6px;
	margin: 4px 0;
	font-size: 12px;
	color: var(--tl-ink-soft);
}
body[data-dsh-tianlight] .tl5-audio-beat .tl5-audio-dot {
	margin-right: 0;
}
body[data-dsh-tianlight] .tl5-eng-url {
	font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
	font-size: 11px;
	word-break: break-all;
}
@keyframes tl5-audio-pulse {
	0%, 100% { transform: scale(0.85); opacity: 0.6; }
	50% { transform: scale(1.25); opacity: 1; }
}
/* Low power freezes both the decorative pulse and any level-driven paint. */
body[data-dsh-tianlight][data-tl-lowpower] [data-tl-beat] .tl5-audio-dot,
body[data-dsh-tianlight][data-tl-lowpower] .tl5-audio-dot[data-tl-audio-driven] {
	animation: none;
}
@media (prefers-reduced-motion: reduce) {
	body[data-dsh-tianlight] [data-tl-beat] .tl5-audio-dot,
	body[data-dsh-tianlight] .tl5-audio-dot[data-tl-audio-driven] {
		animation: none;
	}
}
`);

		/* ================= B4 transitionController ================= */
		/**
		 * 转场预设独立存储（`tianlight.transition`）：面板库的配方导入/导出与
		 * 未来的配方 UI 都读它。effects-context 的特效面板沿用 EFFECTS 状态里的
		 * transition/transitionMs 键；两边合并规则见 transitionController.read()：
		 * 特效面板写出的非默认值视为更新的用户意图，其余情况以本控制器为准。
		 */
		const TRANSITION_KEY = "tianlight.transition";
		const TRANSITION_PRESETS = ["fade", "slide", "zoom", "dissolve"];
		const TRANSITION_DEFAULTS = { preset: "fade", durationMs: 600 };
		/**
		 * `base` is the state an invalid field falls back to. Without it, hand-edited or
		 * stale storage would silently reset a valid preset to the default whenever one
		 * unrelated field is invalid.
		 */
		function normalizeTransition(value, base) {
			const fallback = base === null || typeof base !== "object" ? TRANSITION_DEFAULTS : base;
			const model = {
				preset: TRANSITION_PRESETS.includes(fallback.preset) ? fallback.preset : TRANSITION_DEFAULTS.preset,
				durationMs:
					Number.isFinite(fallback.durationMs) && fallback.durationMs >= 200 && fallback.durationMs <= 1500
						? Math.round(fallback.durationMs)
						: TRANSITION_DEFAULTS.durationMs,
			};
			if (value === null || typeof value !== "object") return model;
			if (TRANSITION_PRESETS.includes(value.preset)) model.preset = value.preset;
			const duration = Number(value.durationMs);
			if (Number.isFinite(duration)) model.durationMs = Math.min(1500, Math.max(200, Math.round(duration)));
			return model;
		}
		function readStoredTransition() {
			try {
				const raw = globalThis.localStorage?.getItem(TRANSITION_KEY);
				if (raw === undefined || raw === null || raw === "") return null;
				const parsed = JSON.parse(raw);
				if (parsed === null || typeof parsed !== "object") return null;
				return normalizeTransition(parsed);
			} catch {
				return null;
			}
		}
		function transitionFromEffects() {
			try {
				if (typeof effectsController === "undefined" || effectsController === null || typeof effectsController.state !== "function") return null;
				const fx = effectsController.state();
				if (fx === null || typeof fx !== "object") return null;
				return normalizeTransition({ preset: fx.transition, durationMs: fx.transitionMs });
			} catch {
				return null;
			}
		}
		function readTransitionState() {
			const stored = readStoredTransition();
			const live = transitionFromEffects();
			if (stored === null) return live === null ? { ...TRANSITION_DEFAULTS } : live;
			if (live !== null) {
				const liveIsDefault =
					live.preset === TRANSITION_DEFAULTS.preset && live.durationMs === TRANSITION_DEFAULTS.durationMs;
				if (liveIsDefault === false && (live.preset !== stored.preset || live.durationMs !== stored.durationMs)) {
					// The effects panel is the live UI; a non-default value there is newer.
					return live;
				}
			}
			return stored;
		}
		/**
		 * S4: only `read()` is consumed by the product (30-wallpaper transition preset);
		 * `apply`/`subscribe`/`defaults` had no callers (audited + grep), so the dead
		 * methods and their subscriber set are gone. The read/merge semantics are
		 * unchanged (effects panel value wins when non-default, else stored preset).
		 */
		const transitionController = {
			key: TRANSITION_KEY,
			presets: TRANSITION_PRESETS.slice(),
			read: readTransitionState,
		};
		tl5Diag("engine", { transition: readTransitionState() });

		/* ================= A2 Now Playing（MediaSession 只读镜像） ================= */
		/**
		 * 只读 `navigator.mediaSession.metadata`：没有元数据就是"没有 Now Playing"，
		 * UI 不显示占位符。轮询 3s（runtime 安装期间），不订阅媒体事件，不注入任何
		 * 东西进页面的 MediaSession。
		 */
		const NOW_PLAYING_IDLE = { title: "", artist: "", album: "", playbackState: "", hasMedia: false };
		const nowPlayingState = { ...NOW_PLAYING_IDLE };
		const nowPlayingSubscribers = new Set();
		function readMediaSessionInfo() {
			let session = null;
			try {
				session = globalThis.navigator?.mediaSession ?? null;
			} catch {
				session = null;
			}
			if (session === null || session === undefined) return null;
			let metadata = null;
			try {
				metadata = session.metadata ?? null;
			} catch {
				metadata = null;
			}
			if (metadata === null || typeof metadata !== "object") return null;
			const title = typeof metadata.title === "string" ? metadata.title.trim().slice(0, 160) : "";
			if (title === "") return null;
			const artist = typeof metadata.artist === "string" ? metadata.artist.trim().slice(0, 160) : "";
			const album = typeof metadata.album === "string" ? metadata.album.trim().slice(0, 160) : "";
			let playbackState = "";
			try {
				playbackState = String(session.playbackState ?? "");
			} catch {
				playbackState = "";
			}
			return { title, artist, album, playbackState };
		}
		function nowPlayingEqual(left, right) {
			return (
				left.title === right.title &&
				left.artist === right.artist &&
				left.album === right.album &&
				left.playbackState === right.playbackState &&
				left.hasMedia === right.hasMedia
			);
		}
		function refreshNowPlaying() {
			const info = readMediaSessionInfo();
			const next = info === null ? { ...NOW_PLAYING_IDLE } : { ...info, hasMedia: true };
			const changed = nowPlayingEqual(next, nowPlayingState) === false;
			if (changed) Object.assign(nowPlayingState, next);
			if (changed) {
				for (const listener of [...nowPlayingSubscribers]) {
					try {
						listener({ ...nowPlayingState });
					} catch (error) {
						note("nowplaying:subscriber", error);
					}
				}
			}
			let loopback = null;
			try {
				if (typeof audioController !== "undefined" && audioController !== null && typeof audioController.read === "function") {
					loopback = audioController.read();
				}
			} catch {
				loopback = null;
			}
			tl5Diag("audio", { nowPlaying: { ...nowPlayingState }, loopback });
			return nowPlayingState;
		}
		const nowPlayingController = {
			read: () => ({ ...nowPlayingState }),
			refresh: refreshNowPlaying,
			subscribe: (listener) => {
				if (typeof listener !== "function") return () => {};
				nowPlayingSubscribers.add(listener);
				listener({ ...nowPlayingState });
				return () => {
					nowPlayingSubscribers.delete(listener);
				};
			},
		};

		/* ================= A1 audio runtime（轮询 + 归零 + 诊断） ================= */
		/**
		 * 音频模块的 installer：把系统音频回环的生命周期接进模块运行时。
		 *
		 * 采集与电平在 30 的 audioController（startSystem/stopSystem/level），本
		 * 安装器只负责：
		 *   - 3s 轮询 Now Playing（离开页面时不轮询，省电）；
		 *   - 把回环/设备能力写进 tl5Diag("audio")；
		 *   - disposer 里释放系统音频（不录音、不残留 MediaStream）。
		 */
		function installAudioRuntime(ctx) {
			let timer = 0;
			let disposed = false;
			let unsubscribeAudio = () => {};
			const poll = () => {
				if (disposed) return;
				// Metadata can change while hidden, but polling a hidden page is wasteful
				// and the panel is closed anyway; refresh once when it becomes visible.
				if (document.hidden) return;
				refreshNowPlaying();
			};
			refreshNowPlaying();
			timer = window.setInterval(poll, 3000);
			try {
				if (typeof audioController !== "undefined" && audioController !== null && typeof audioController.subscribe === "function") {
					const unsubscribe = audioController.subscribe(() => {
						if (disposed) return;
						refreshNowPlaying();
					});
					if (typeof unsubscribe === "function") unsubscribeAudio = unsubscribe;
				}
			} catch {
				unsubscribeAudio = () => {};
			}
			const onVisible = () => {
				if (document.hidden === false) refreshNowPlaying();
			};
			document.addEventListener("visibilitychange", onVisible);
			tl5Diag("audio", { installed: true, supported: typeof audioController !== "undefined" ? audioController.supported() : null });
			return () => {
				if (disposed) return;
				disposed = true;
				if (timer !== 0) {
					window.clearInterval(timer);
					timer = 0;
				}
				document.removeEventListener("visibilitychange", onVisible);
				try {
					unsubscribeAudio();
				} catch {
					// an already-removed subscriber is fine
				}
				unsubscribeAudio = () => {};
				try {
					if (typeof audioController !== "undefined" && audioController !== null && typeof audioController.stop === "function") {
						audioController.stop(TL_T("audio.stoppedByModule"));
					}
				} catch (error) {
					note("audio:dispose", error);
				}
				Object.assign(nowPlayingState, NOW_PLAYING_IDLE);
				tl5Diag("audio", { installed: false, nowPlaying: { ...nowPlayingState }, loopback: null });
			};
		}

		/* ================= 面板小工具（只在本文件用） ================= */
		function tl5FormatBytes(bytes) {
			const value = Number(bytes);
			if (!Number.isFinite(value) || value <= 0) return "0 B";
			if (value < 1024 * 1024) return TL_T("engine.bytesKb", { n: Math.max(1, Math.round(value / 1024)) });
			return TL_T("engine.bytesMb", { n: Math.round((value / (1024 * 1024)) * 10) / 10 });
		}
		function tl5GroupSummary(step, title, value, tooltip) {
			return React.createElement(
				"summary",
				{ className: "tl-wall-group-summary", title: typeof tooltip === "string" && tooltip !== "" ? tooltip : undefined },
				React.createElement("span", { className: "tl-wall-step" }, step),
				React.createElement("span", { className: "tl-wall-group-title" }, title),
				React.createElement("span", { className: "tl-wall-summary-value" }, value),
			);
		}
		function tl5ReadSceneView() {
			if (typeof document === "undefined") return null;
			const scene = document.querySelector("[data-tl-scene]");
			if (scene === null) return null;
			const read = (name) => (scene.dataset[name] === undefined ? "" : String(scene.dataset[name]));
			return {
				media: read("tlMedia"),
				file: read("tlFile"),
				resolution: read("tlResolution"),
				variant: read("tlVariant"),
				variants: read("tlVariants"),
				adaptive: read("tlAdaptive"),
				play: read("tlPlay"),
				fps: Number(scene.dataset.tlFps) || 0,
				jitter: Number(scene.dataset.tlJitter) || 0,
			};
		}
		/** Maps an analyser level (0..1, already smoothed in 30) to a visual energy. */
		function audioBeatLevel(rawLevel) {
			const value = Number(rawLevel);
			if (!Number.isFinite(value) || value <= 0) return 0;
			return Math.min(1, Math.max(0, value));
		}
		/**
		 * Pure beat decision for the two dots: the real level only drives them while the
		 * loopback is active and nothing (low power / reduced motion) asked to freeze.
		 * Returns the exact scale/opacity the panel paints, so it is testable headless.
		 */
		function beatVisualState(options) {
			const source = options !== null && typeof options === "object" ? options : {};
			const driven = source.loopbackActive === true && source.frozen !== true;
			const energy = driven ? audioBeatLevel(source.level) : 0;
			return {
				driven,
				energy,
				scale: 1 + energy * 0.9,
				opacity: 0.45 + energy * 0.55,
			};
		}
		/**
		 * Compact engine-group summary: the panel summary is a single line and the v0.5.0
		 * full cache counters were ellipsised there. Full detail stays in the body.
		 */
		function engineSummaryLines(info) {
			const source = info !== null && typeof info === "object" ? info : {};
			const hit = Math.max(0, Math.round(Number(source.hit) || 0));
			const miss = Math.max(0, Math.round(Number(source.miss) || 0));
			const cache = TL_T("engine.summaryCache", { hit, miss });
			let adaptive = "engine.summaryIdle";
			if (source.adaptiveActive === true) adaptive = "engine.summaryDegraded";
			else if (source.adaptiveLocked === true) adaptive = "engine.summaryLocked";
			else if (source.adaptiveOff === true) adaptive = "engine.summaryOff";
			return TL_T("engine.summary", { cache, adaptive: TL_T(adaptive) });
		}
		/** Current kind is web? (the web-pause hint is only meaningful then). */
		function isWebWallpaperView(view) {
			return view !== null && typeof view === "object" && view.media === "web";
		}
		/** Middle-truncated project URL for the engine panel; the title attr has the full one. */
		function webWallpaperUrlLabel(url) {
			const text = String(url === undefined || url === null ? "" : url);
			if (text.length <= 56) return text;
			return text.slice(0, 30) + "…" + text.slice(text.length - 22);
		}
		function tl5FetchJson(url, options) {
			return fetch(url, options)
				.then((response) => response.json().catch(() => null).then((value) => ({ ok: response.ok, status: response.status, value })))
				.catch(() => null);
		}

		/* ================= 面板分区：音频与 Now Playing（order 820） ================= */
		const AudioSection = () => {
			const { t } = useTl5I18n();
			const [audio, setAudio] = React.useState(() =>
				typeof audioController !== "undefined" && audioController !== null && typeof audioController.read === "function"
					? audioController.read()
					: { active: false, busy: false, reason: "", mode: "", code: "" },
			);
			const [now, setNow] = React.useState(() => nowPlayingController.read());
			const [moduleOn, setModuleOn] = React.useState(() =>
				typeof moduleController !== "undefined" && moduleController !== null ? moduleController.isEnabled("audio") : true,
			);
			const [requesting, setRequesting] = React.useState(false);
			React.useEffect(() => {
				if (typeof audioController === "undefined" || audioController === null) return () => {};
				return audioController.subscribe((next) => setAudio(next));
			}, []);
			React.useEffect(() => nowPlayingController.subscribe((next) => setNow(next)), []);
			React.useEffect(() => {
				if (typeof moduleController === "undefined" || moduleController === null) return () => {};
				return moduleController.subscribe((state) => setModuleOn(state.audio === true));
			}, []);
			// A2 beat: while the system-audio loopback is ACTIVE the two beat dots are
			// painted from the real analyser level at ~10 Hz (never a 60 Hz rAF — this is a
			// 7px dot, and 10 Hz is enough to read as a beat). Loopback off => attributes
			// are cleared and the existing decorative playback pulse takes over.
			const nowPlayingDotRef = React.useRef(null);
			const loopbackDotRef = React.useRef(null);
			React.useEffect(() => {
				if (typeof window === "undefined" || typeof globalThis.setInterval !== "function") return () => {};
				let lastEnergy = -1;
				let lastDriven = false;
				let lastDotCount = -1;
				const paint = () => {
					let loopback = false;
					let frozen = false;
					try {
						if (typeof audioController !== "undefined" && audioController !== null) {
							const state = audioController.read();
							loopback = state !== null && state.active === true && state.mode === "system";
						}
						frozen =
							(document.body !== null && document.body.hasAttribute("data-tl-lowpower")) ||
							(typeof globalThis.matchMedia === "function" &&
								globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches === true);
					} catch {
						loopback = false;
						frozen = true;
					}
					const driven = loopback === true && frozen === false;
					const level =
						driven && typeof audioController !== "undefined" && audioController !== null && typeof audioController.level === "function"
							? audioController.level()
							: 0;
					const visual = beatVisualState({ loopbackActive: loopback, frozen, level });
					const dots = [nowPlayingDotRef.current, loopbackDotRef.current];
					const dotCount = dots.filter((dot) => dot !== null && dot !== undefined).length;
					// Repaint when the level changes, when drive toggles, and when a dot
					// appears later (Now Playing block mounting after the beat started).
					if (visual.energy === lastEnergy && visual.driven === lastDriven && dotCount === lastDotCount) return;
					lastEnergy = visual.energy;
					lastDriven = visual.driven;
					lastDotCount = dotCount;
					for (const dot of dots) {
						if (dot === null || dot === undefined || typeof dot.style !== "object") continue;
						if (visual.driven) {
							dot.setAttribute("data-tl-audio-driven", "");
							dot.style.transform = "scale(" + visual.scale.toFixed(3) + ")";
							dot.style.opacity = visual.opacity.toFixed(3);
						} else {
							dot.removeAttribute("data-tl-audio-driven");
							dot.style.removeProperty("transform");
							dot.style.removeProperty("opacity");
						}
					}
				};
				const timer = window.setInterval(paint, 100);
				paint();
				return () => window.clearInterval(timer);
			}, []);
			const support =
				typeof audioController !== "undefined" && audioController !== null && typeof audioController.supported === "function"
					? audioController.supported()
					: { display: false, mic: false, webaudio: false };
			const activeSystem = audio.active === true && audio.mode === "system";
			const activeMic = audio.active === true && audio.mode === "mic";
			const busy = requesting === true || audio.busy === true;
			const statusText = activeSystem
				? t("audio.activeSystem")
				: activeMic
					? t("audio.activeMic")
					: busy
						? t("audio.busy")
						: t("audio.idle");
			const startSystem = () => {
				if (busy) return;
				setRequesting(true);
				// getDisplayMedia must be called from the click gesture; startSystem() reaches
				// it synchronously before its first await, so no intermediate await is added.
				// `userInitiated` is v0.5.3 console hygiene: only the real click may log
				// audio:system-failed; anything automatic goes to diagnostics instead.
				void audioController.startSystem({ userInitiated: true }).then(() => setRequesting(false));
			};
			const stopAudio = () => {
				audioController.stopSystem(TL_T("audio.stopped"));
			};
			const failureText = audio.reason !== "" ? String(audio.reason) : support.display === false ? t("audio.unsupported") : "";
			const beat = now.hasMedia === true && now.playbackState === "playing";
			const nowPlayingBlock =
				now.hasMedia === true
					? React.createElement(
							"div",
							{ className: "tl5-eng-kv", "data-tl-beat": beat ? "" : undefined },
							React.createElement("b", null, t("audio.nowPlaying")),
							React.createElement(
								"span",
								null,
								React.createElement("span", {
									className: "tl5-audio-dot",
									ref: nowPlayingDotRef,
									"data-tl-audio-dot": "",
									"aria-hidden": "true",
								}),
								now.title + (now.artist === "" ? "" : " · " + now.artist) + (now.album === "" ? "" : " · " + now.album),
							),
							React.createElement("b", null, t("engine.fps")),
							React.createElement(
								"span",
								null,
								now.playbackState === "playing" ? t("audio.playing") : now.playbackState === "paused" ? t("audio.pausedState") : "--",
							),
						)
					: null;
			return React.createElement(
				"details",
				{ className: "tl-wall-group", open: false, "data-tl-group": "audio" },
				tl5GroupSummary("♪", t("section.audio"), activeSystem || activeMic ? statusText : now.hasMedia ? now.title : statusText),
				React.createElement("p", { className: "tl-wall-hint" }, t("audio.loopbackHint")),
				moduleOn === false ? React.createElement("p", { className: "tl-wall-hint" }, t("audio.moduleOff")) : null,
				React.createElement(
					"div",
					{ className: "tl5-eng-actions" },
					React.createElement(
						"button",
						{
							type: "button",
							className: "tl-font-option",
							disabled: busy || moduleOn === false,
							"data-active": activeSystem ? "" : undefined,
							onClick: activeSystem || activeMic ? stopAudio : startSystem,
						},
						activeSystem || activeMic ? t("audio.stop") : t("audio.start"),
					),
					support.display === false
						? React.createElement("span", { className: "tl-wall-hint" }, t("audio.unsupported"))
						: null,
				),
				// The live beat indicator only exists while the loopback really drives it;
				// Now Playing keeps its own decorative pulse when loopback is off.
				activeSystem
					? React.createElement(
							"p",
							{ className: "tl-wall-hint tl5-audio-beat" },
							React.createElement("span", {
								className: "tl5-audio-dot",
								ref: loopbackDotRef,
								"data-tl-audio-dot": "",
								"aria-hidden": "true",
							}),
							t("audio.beatLive"),
						)
					: null,
				failureText === "" ? null : React.createElement("p", { className: "tl-wall-hint", title: failureText }, failureText),
				nowPlayingBlock,
				React.createElement("p", { className: "tl-wall-hint" }, t("audio.nowPlayingHint")),
			);
		};

		/* ================= 面板分区：壁纸引擎（order 830） ================= */
		const EngineSection = () => {
			const { t } = useTl5I18n();
			const [sceneView, setSceneView] = React.useState(() => tl5ReadSceneView());
			const [cacheStatus, setCacheStatus] = React.useState(null);
			const [cacheNote, setCacheNote] = React.useState("");
			const [cacheBusy, setCacheBusy] = React.useState(false);
			const [transcode, setTranscode] = React.useState({ checked: false, ffmpeg: false, version: "" });
			const [transcodeNote, setTranscodeNote] = React.useState("");
			const [transcodeBusy, setTranscodeBusy] = React.useState("");
			const [candidates, setCandidates] = React.useState([]);
			const [contextState, setContextState] = React.useState(() =>
				typeof contextController !== "undefined" && contextController !== null && typeof contextController.state === "function"
					? contextController.state()
					: { adaptive: true, adaptiveLocked: false },
			);
			const [moduleOn, setModuleOn] = React.useState(() =>
				typeof moduleController !== "undefined" && moduleController !== null ? moduleController.isEnabled("context") : true,
			);
			const [metrics, setMetrics] = React.useState(() => ({ cacheHit: 0, cacheMiss: 0 }));
			React.useEffect(() => {
				// The scene owns its datasets; a light poll is enough and keeps this section
				// independent from the panel's own MutationObserver.
				const timer = window.setInterval(() => setSceneView(tl5ReadSceneView()), 2000);
				return () => window.clearInterval(timer);
			}, []);
			React.useEffect(() => {
				if (typeof subscribeTl5Metrics !== "function") return () => {};
				return subscribeTl5Metrics((next) => setMetrics({ cacheHit: Number(next.cacheHit) || 0, cacheMiss: Number(next.cacheMiss) || 0 }));
			}, []);
			React.useEffect(() => {
				if (typeof moduleController === "undefined" || moduleController === null) return () => {};
				return moduleController.subscribe((state) => setModuleOn(state.context === true));
			}, []);
			React.useEffect(() => {
				if (typeof contextController === "undefined" || contextController === null) return () => {};
				return contextController.subscribe((next) => setContextState(next));
			}, []);
			const refreshCache = React.useCallback(() => {
				if (typeof frameCacheController === "undefined" || frameCacheController === null) return;
				void frameCacheController.status().then((value) => {
					setCacheStatus(value);
					if (value === null) setCacheNote("");
				});
			}, []);
			const refreshTranscode = React.useCallback(() => {
				void (async () => {
					const status = await tl5FetchJson(ASSET_BASE + "/_transcode/status", { cache: "no-store" });
					if (status === null || status.ok !== true || status.value === null || typeof status.value !== "object") {
						setTranscode({ checked: true, ffmpeg: false, version: "", host: false });
						return;
					}
					const ffmpeg = status.value.ffmpeg === true;
					setTranscode({ checked: true, ffmpeg, version: typeof status.value.version === "string" ? status.value.version : "", host: true });
					tl5Diag("engine", { transcode: { ffmpeg, version: status.value.version ?? "" } });
					if (ffmpeg === false) return;
					// Transcodable uploads/assets: local paths only, never WE `ext/` or scenes.
					const catalog = await tl5FetchJson(ASSET_BASE + "/_wallpapers", { cache: "no-store" });
					if (catalog === null || catalog.ok !== true || !Array.isArray(catalog.value?.items)) return;
					// HEVC/GIF first (the real A6 use cases); a plain local catalog without
					// those still shows the action for anything the host can re-encode.
					const priority = [".hevc", ".h265", ".gif", ".mkv", ".mov", ".avi", ".wmv", ".webm"];
					const local = catalog.value.items.filter((item) => {
						if (item === null || typeof item !== "object" || typeof item.url !== "string") return false;
						if (item.kind !== "video" && item.kind !== "image") return false;
						if (item.url.includes("/ext/") || item.url.includes("/_web-project/") || item.url.includes("/_scene-project/")) return false;
						return true;
					});
					const fileOf = (item) => item.url.slice(item.url.lastIndexOf("/") + 1).split(/[?#]/)[0].toLowerCase();
					const special = local.filter((item) => priority.some((ext) => fileOf(item).endsWith(ext)));
					const fallback = local.filter((item) =>
						[".mp4", ".webm", ".mov", ".mkv", ".m4v", ".gif"].some((ext) => fileOf(item).endsWith(ext)),
					);
					const list = special.length > 0 ? special : fallback;
					setCandidates(list.slice(0, 8));
				})();
			}, []);
			React.useEffect(() => {
				refreshCache();
				refreshTranscode();
			}, [refreshCache, refreshTranscode]);
			const clearCache = () => {
				if (cacheBusy) return;
				setCacheBusy(true);
				setCacheNote(t("engine.cacheClearing"));
				void frameCacheController.clear().then((value) => {
					setCacheBusy(false);
					if (value === null) {
						setCacheNote(t("engine.cacheUnavailable"));
						return;
					}
					setCacheNote(t("engine.cacheCleared", { bytes: tl5FormatBytes(value.bytes ?? 0) }));
					refreshCache();
				});
			};
			const toggleAdaptiveLock = () => {
				if (typeof contextController === "undefined" || contextController === null || typeof contextController.apply !== "function") {
					setCacheNote(t("engine.contextOff"));
					return;
				}
				const next = contextController.apply({ adaptiveLocked: contextState.adaptiveLocked !== true });
				setContextState(next);
				if (typeof adaptiveController !== "undefined" && adaptiveController !== null && typeof adaptiveController.sync === "function") {
					adaptiveController.sync();
				}
			};
			const runTranscode = (item) => {
				if (transcodeBusy !== "") return;
				const file = item.url.slice(item.url.lastIndexOf("/") + 1).split(/[?#]/)[0];
				if (file === "") return;
				setTranscodeBusy(file);
				setTranscodeNote(t("engine.transcodeBusy"));
				void (async () => {
					const response = await fetch(ASSET_BASE + "/_transcode?name=" + encodeURIComponent(file), {
						method: "POST",
						headers: { "content-type": "application/json" },
						body: "{}",
					}).catch(() => null);
					const value = response === null ? null : await response.json().catch(() => null);
					setTranscodeBusy("");
					if (response === null || response.ok !== true || value === null || value.ok !== true) {
						const reason = value !== null && (value.error ?? value.note) ? String(value.error ?? value.note).slice(0, 160) : String(response === null ? "offline" : response.status);
						setTranscodeNote(t("engine.transcodeFail", { reason }));
						return;
					}
					// A6 client side: refresh the catalog and apply the derived file. The host may
					// list it under a new id; fall back to a clear note instead of guessing a URL.
					if (typeof forgetCatalog === "function") forgetCatalog();
					const output = typeof value.output === "string" ? value.output : "";
					const outputName = output.slice(output.lastIndexOf("/") + 1).split(/[?#]/)[0];
					const catalog = await tl5FetchJson(ASSET_BASE + "/_wallpapers", { cache: "no-store" });
					const items = catalog !== null && catalog.ok === true && Array.isArray(catalog.value?.items) ? catalog.value.items : [];
					const found = items.find((entry) => {
						if (entry === null || typeof entry !== "object" || typeof entry.url !== "string") return false;
						const entryName = entry.url.slice(entry.url.lastIndexOf("/") + 1).split(/[?#]/)[0];
						if (outputName !== "" && entryName === outputName) return true;
						return output !== "" && entry.url.includes(output);
					});
					if (found === undefined) {
						setTranscodeNote(t("engine.transcodeOk", { name: outputName === "" ? file : outputName }));
						refreshTranscode();
						return;
					}
					if (wallpaperController !== null && typeof wallpaperController.apply === "function") {
						wallpaperController.apply({ kind: found.kind, url: found.url });
					}
					setTranscodeNote(t("engine.transcodeFound", { name: found.url.slice(found.url.lastIndexOf("/") + 1) }));
					refreshTranscode();
				})();
			};
			const adaptive = typeof adaptiveController !== "undefined" && adaptiveController !== null ? adaptiveController.read() : null;
			const adaptiveActive = adaptive !== null && adaptive.active === true;
			const adaptiveOff = moduleOn === false || contextState.adaptive === false || contextState.adaptiveLocked === true;
			// v0.5.3: only warn while automatic downgrade is actually armed; the hint names
			// the lock button right below as the one-click way to disable it.
			const adaptiveArmed = adaptiveOff === false;
			const adaptiveText = adaptiveActive
				? adaptive.reason
				: adaptiveOff
					? t(contextState.adaptiveLocked === true ? "engine.adaptiveLocked" : "engine.adaptiveOff")
					: t("engine.adaptiveIdle");
			const variantText =
				sceneView !== null && sceneView.variant !== ""
					? t("engine.variantValue", { tier: sceneView.variant, tiers: sceneView.variants === "" ? sceneView.variant : sceneView.variants })
					: t("engine.noVariant");
			const cacheText =
				cacheStatus === null
					? t("engine.cacheUnavailable")
					: t("engine.cacheStats", {
							entries: Number(cacheStatus.entries) || 0,
							size: tl5FormatBytes(cacheStatus.bytes ?? 0),
							hit: metrics.cacheHit,
							miss: metrics.cacheMiss,
						});
			// The summary line is one truncated row; full counters/hints stay in the body.
			const summaryValue = engineSummaryLines({
				hit: metrics.cacheHit,
				miss: metrics.cacheMiss,
				adaptiveActive,
				adaptiveLocked: contextState.adaptiveLocked === true,
				adaptiveOff: moduleOn === false || contextState.adaptive === false,
			});
			const showWebHint = isWebWallpaperView(sceneView);
			const currentWebUrl = (() => {
				if (showWebHint === false) return "";
				let chosen = null;
				try {
					if (typeof readWallpaperChoice === "function") chosen = readWallpaperChoice();
				} catch {
					chosen = null;
				}
				if (chosen !== null && typeof chosen === "object" && chosen.kind === "web" && typeof chosen.url === "string") {
					return chosen.url;
				}
				return sceneView !== null && typeof sceneView.file === "string" && sceneView.file !== "" ? sceneView.file : "";
			})();
			return React.createElement(
				"details",
				{ className: "tl-wall-group", open: false, "data-tl-group": "engine" },
				// Hover keeps the full (untruncated) detail available from the summary row.
				tl5GroupSummary("⚙", t("section.engine"), summaryValue, cacheText + " · " + adaptiveText),
				React.createElement(
					"div",
					{ className: "tl5-eng-kv" },
					React.createElement("b", null, t("engine.resolution")),
					React.createElement("span", null, sceneView === null || sceneView.resolution === "" ? "--" : sceneView.resolution),
					React.createElement("b", null, t("engine.variant")),
					React.createElement("span", null, variantText),
					React.createElement("b", null, t("engine.fps")),
					React.createElement("span", null, (sceneView === null ? 0 : sceneView.fps) + "fps · " + t("engine.jitter") + " " + (sceneView === null ? 0 : sceneView.jitter) + "ms"),
				),
				// ---- A3 web wallpaper: pause semantics + current project URL ----
				showWebHint
					? React.createElement("p", { className: "tl-wall-hint tl5-eng-webhint" }, t("engine.webPauseHint"))
					: null,
				showWebHint && currentWebUrl !== ""
					? React.createElement(
							"p",
							{ className: "tl-wall-hint tl5-eng-url", title: currentWebUrl },
							t("engine.webUrl", { url: webWallpaperUrlLabel(currentWebUrl) }),
						)
					: null,
				// ---- C3 adaptive status + lock ----
				React.createElement(
					"p",
					{ className: "tl-wall-hint", title: adaptiveActive ? adaptiveText : undefined },
					t("engine.adaptiveLine", { label: t("engine.adaptiveSection"), value: adaptiveText }),
				),
				adaptiveArmed ? React.createElement("p", { className: "tl-wall-hint tl5-eng-adaptive-hint" }, t("engine.adaptiveFreezeHint")) : null,
				moduleOn === false ? React.createElement("p", { className: "tl-wall-hint" }, t("engine.contextOff")) : null,
				React.createElement(
					"div",
					{ className: "tl5-eng-actions" },
					React.createElement(
						"button",
						{
							type: "button",
							className: "tl-font-option",
							disabled: moduleOn === false,
							"data-active": contextState.adaptiveLocked === true ? "" : undefined,
							onClick: toggleAdaptiveLock,
						},
						contextState.adaptiveLocked === true ? t("engine.adaptiveUnlock") : t("engine.adaptiveLock"),
					),
				),
				contextState.adaptiveLocked === true ? React.createElement("p", { className: "tl-wall-hint" }, t("engine.adaptiveLockedHint")) : null,
				// ---- A5 cache status ----
				React.createElement("p", { className: "tl-wall-hint" }, t("engine.cacheHint")),
				React.createElement("p", { className: "tl-wall-hint" }, cacheText),
				React.createElement(
					"div",
					{ className: "tl5-eng-actions" },
					React.createElement("button", { type: "button", className: "tl-font-option", onClick: refreshCache }, t("engine.cacheRefresh")),
					React.createElement(
						"button",
						{ type: "button", className: "tl-font-option", disabled: cacheBusy, onClick: clearCache },
						t("engine.cacheClear"),
					),
				),
				cacheNote === "" ? null : React.createElement("p", { className: "tl-wall-hint" }, cacheNote),
				// ---- A6 client side: transcode ----
				React.createElement(
					"p",
					{ className: "tl-wall-hint" },
					t("engine.transcodeLine", { label: t("engine.transcode"), hint: t("engine.transcodeHint") }),
				),
				transcode.checked === false
					? React.createElement("p", { className: "tl-wall-hint" }, t("engine.transcodeChecking"))
					: transcode.ffmpeg === false
						? React.createElement("p", { className: "tl-wall-hint" }, transcode.host === false && transcode.checked === true ? t("engine.hostOffline") : t("engine.transcodeUnavailable"))
						: candidates.length === 0
							? React.createElement("p", { className: "tl-wall-hint" }, t("engine.transcodeNone"))
							: candidates.map((item) =>
									React.createElement(
										"div",
										{ className: "tl5-eng-item", key: item.url },
										React.createElement(
											"span",
											{ className: "tl5-eng-name", title: item.url },
											item.url.slice(item.url.lastIndexOf("/") + 1),
										),
										React.createElement(
											"button",
											{
												type: "button",
												className: "tl-font-option",
												disabled: transcodeBusy !== "",
												onClick: () => runTranscode(item),
											},
											transcodeBusy === item.url.slice(item.url.lastIndexOf("/") + 1) ? t("engine.transcodeBusy") : t("engine.transcodeDo"),
										),
									),
								),
				transcodeNote === "" ? null : React.createElement("p", { className: "tl-wall-hint" }, transcodeNote),
				React.createElement(
					"div",
					{ className: "tl5-eng-actions" },
					React.createElement("button", { type: "button", className: "tl-font-option", onClick: refreshTranscode }, t("engine.transcodeRefresh")),
				),
			);
		};

		if (React !== null) {
			registerTl5PanelSection({ id: "audio", order: 820, title: "section.audio", Component: AudioSection });
			registerTl5PanelSection({ id: "engine", order: 830, title: "section.engine", Component: EngineSection });
		}
		//#endregion
