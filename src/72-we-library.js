		//#region we library
		/**
		 * v0.6.0 — 本机 Wallpaper Engine 壁纸库（A real click-to-apply WE library）.
		 *
		 * 用户目标：DSH 设置里有一个「壁纸 / Wallpaper」功能入口，点进去自动列出本机
		 * Steam 创意工坊 + WE projects 的壁纸（预览网格、中文标题、搜索/筛选），点一张
		 * 就直接应用为背景；不填任何目录。
		 *
		 * 客户端只消费宿主路由（host-core task-22）：
		 *   GET  /api/we-wallpaper/list                 -> {found, root, count, wallpapers:[…]}
		 *   GET  /api/we-wallpaper/preview/<id>         -> 预览图
		 *   GET  /api/we-wallpaper/media/<id>           -> 视频/图片原始媒体
		 *   GET  /api/we-wallpaper/pkg/<id>             -> 场景 .pkg 的纯 JS 高清静态图
		 *   GET  /api/we-wallpaper/web/<id>/index.html  -> 网页壁纸（沙箱 iframe）
		 *   POST /api/we-wallpaper/scene-video/generate/<id>  -> 可选动态缓存（202/503）
		 *   GET  /api/we-wallpaper/scene-video/status/<id>    -> 轮询状态
		 *   GET  /api/we-wallpaper/scene-video/media/<id>     -> 生成好的视频
		 *
		 * 两个入口共用同一个组件与同一份 store：
		 *   1) DSH 设置里的页面（slots 'settings.section'）— 真正的功能页按钮；
		 *   2) 侧边栏 Settings 旁的功能按钮（slots 'sidebar.footer.action'）+ 全屏浮层；
		 *   3) 另外监听皮肤面板派发的 CustomEvent `tianlight:open-wallpaper-library`。
		 * slots 服务缺失时降级成「只有 CustomEvent 浮层 + 诊断」，绝不把 apply() 打崩。
		 *
		 * 该片段自身不创建 scene/DOM 之外的东西：浮层只在打开时创建；dispose 时反注册
		 * slots、移除监听、卸载 React root、清空定时器。
		 */

		/* ================= i18n（we.*） ================= */
		registerTl5Strings({
			zh: {
				"we.section.label": "壁纸",
				"we.sidebar.label": "壁纸库",
				"we.title": "Wallpaper Engine 壁纸库",
				"we.subtitle": "自动检测本机 Steam 创意工坊与 WE projects，点一张即可应用；不需要填写目录。",
				"we.overlay.title": "壁纸库",
				"we.close": "关闭",
				"we.refresh": "刷新",
				"we.refreshing": "刷新中…",
				"we.searchPlaceholder": "搜索标题或 ID",
				"we.searchLabel": "搜索壁纸",
				"we.count": "{shown} / {total} 张",
				"we.detected": "已检测到 {n} 张",
				"we.rootHint": "库目录：{root}",
				"we.type.all": "全部",
				"we.type.video": "视频",
				"we.type.scene": "场景",
				"we.type.web": "网页",
				"we.type.image": "图片",
				"we.loading": "正在扫描本机壁纸…",
				"we.empty.title": "未检测到 Wallpaper Engine 壁纸",
				"we.empty.hint": "确认已安装 Steam + Wallpaper Engine，并订阅了创意工坊壁纸或导入了 WE projects；无需手动填写目录。",
				"we.empty.filter": "没有匹配的壁纸：换个关键词或类型筛选。",
				"we.hostMissing.title": "宿主半尚未提供壁纸库接口",
				"we.hostMissing.hint": "更新/重启 DSH 后重试；皮肤面板的壁纸选择仍然可用。",
				"we.error.fetch": "扫描失败：{reason}",
				"we.retry": "重试",
				"we.applyTitle": "应用：{title}",
				"we.apply": "应用",
				"we.inUse": "使用中",
				"we.toastApplied": "已切换：{title}",
				"we.toastScene": "已使用高清静态：{title}；点「生成动态」可缓存动画。",
				"we.source.workshop": "创意工坊",
				"we.source.project": "WE 项目",
				"we.previewFailed": "预览不可用",
				"we.scene.note": "场景壁纸：已使用高清静态；生成动态缓存后才会动。",
				"we.scene.cardHint": "静态场景图 · 可生成动态缓存",
				"we.scene.previewOnly": "该场景没有可解析的 .pkg，已使用预览图：{title}",
				"we.scene.static": "高清静态",
				"we.scene.generate": "生成动态",
				"we.scene.generating": "生成中…",
				"we.scene.progress": "生成动态缓存 {percent}%",
				"we.scene.ready": "动态缓存已生成，正在切换…",
				"we.scene.failed": "生成失败：{reason}",
				"we.scene.unsupported": "宿主未启用动态缓存（缺少 ffmpeg 或生成器）；静态图仍可使用。",
				"we.scene.timeout": "生成超时；静态图仍可使用。",
				"we.scene.retry": "重试生成",
				"we.workshopId": "创意工坊 {id}",
				"we.unknownTitle": "未命名壁纸",
			},
			en: {
				"we.section.label": "Wallpaper",
				"we.sidebar.label": "Wallpaper library",
				"we.title": "Wallpaper Engine library",
				"we.subtitle": "Detects your local Steam Workshop and WE projects automatically — click a wallpaper to apply it, no folder path needed.",
				"we.overlay.title": "Wallpaper library",
				"we.close": "Close",
				"we.refresh": "Refresh",
				"we.refreshing": "Refreshing…",
				"we.searchPlaceholder": "Search title or ID",
				"we.searchLabel": "Search wallpapers",
				"we.count": "{shown} / {total}",
				"we.detected": "{n} wallpapers detected",
				"we.rootHint": "Library root: {root}",
				"we.type.all": "All",
				"we.type.video": "Videos",
				"we.type.scene": "Scenes",
				"we.type.web": "Web",
				"we.type.image": "Images",
				"we.loading": "Scanning local wallpapers…",
				"we.empty.title": "No Wallpaper Engine wallpapers found",
				"we.empty.hint": "Make sure Steam + Wallpaper Engine are installed and you have subscribed Workshop wallpapers or imported WE projects; no folder path is needed.",
				"we.empty.filter": "Nothing matches: try another keyword or type filter.",
				"we.hostMissing.title": "Host routes for the wallpaper library are unavailable",
				"we.hostMissing.hint": "Update/restart DSH and retry; the skin panel picker keeps working.",
				"we.error.fetch": "Scan failed: {reason}",
				"we.retry": "Retry",
				"we.applyTitle": "Apply: {title}",
				"we.apply": "Apply",
				"we.inUse": "In use",
				"we.toastApplied": "Applied: {title}",
				"we.toastScene": "HD still applied: {title}; press “Generate animated” to cache the animation.",
				"we.source.workshop": "Workshop",
				"we.source.project": "WE project",
				"we.previewFailed": "Preview unavailable",
				"we.scene.note": "Scene wallpaper: HD still applied; it only animates after the optional animated cache is generated.",
				"we.scene.cardHint": "Static scene image · animated cache optional",
				"we.scene.previewOnly": "This scene has no decodable .pkg; showing its preview image: {title}",
				"we.scene.static": "HD still",
				"we.scene.generate": "Generate animated",
				"we.scene.generating": "Generating…",
				"we.scene.progress": "Generating animated cache {percent}%",
				"we.scene.ready": "Animated cache ready, switching…",
				"we.scene.failed": "Generation failed: {reason}",
				"we.scene.unsupported": "The host cannot generate animated caches (ffmpeg/generator unavailable); the still image still works.",
				"we.scene.timeout": "Generation timed out; the still image still works.",
				"we.scene.retry": "Generate again",
				"we.workshopId": "Workshop {id}",
				"we.unknownTitle": "Untitled wallpaper",
			},
		});

		/* ================= CSS（全部 body[data-dsh-tianlight] 作用域） ================= */
		registerTl5Css(String.raw`
		/* ---- WE library: shared page inside the DSH settings content column ---- */
		body[data-dsh-tianlight] [data-tl-we-page] {
			display: flex;
			flex-direction: column;
			gap: 10px;
			max-width: 100%;
			min-width: 0;
			color: var(--tl-ink);
		}
		body[data-dsh-tianlight] .tl-we-head {
			display: flex;
			align-items: flex-start;
			justify-content: space-between;
			gap: 12px;
			flex-wrap: wrap;
		}
		body[data-dsh-tianlight] .tl-we-head-main {
			min-width: 0;
			flex: 1 1 260px;
		}
		body[data-dsh-tianlight] .tl-we-title {
			margin: 0;
			font-size: 16px;
			font-weight: 600;
			line-height: 1.4;
			color: var(--tl-ink);
		}
		body[data-dsh-tianlight] .tl-we-subtitle {
			margin: 2px 0 0;
			font-size: 12px;
			line-height: 1.5;
			color: var(--tl-ink-soft);
		}
		body[data-dsh-tianlight] .tl-we-meta {
			margin: 3px 0 0;
			font-size: 11px;
			line-height: 1.4;
			color: var(--tl-ink-faint);
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}
		body[data-dsh-tianlight] .tl-we-actions {
			display: flex;
			gap: 6px;
			flex-wrap: wrap;
			align-items: center;
		}
		body[data-dsh-tianlight] .tl-we-btn {
			appearance: none;
			border: 1px solid var(--tl-line-strong);
			background: var(--tl-accent-soft);
			color: var(--tl-ink);
			font: inherit;
			font-size: 12px;
			line-height: 1.2;
			border-radius: 8px;
			padding: 6px 10px;
			cursor: pointer;
		}
		body[data-dsh-tianlight] .tl-we-btn:hover {
			border-color: var(--tl-accent);
		}
		body[data-dsh-tianlight] .tl-we-btn[disabled] {
			opacity: 0.55;
			cursor: default;
		}
		body[data-dsh-tianlight] .tl-we-btn[data-active] {
			background: var(--tl-accent);
			border-color: var(--tl-accent);
			color: #ffffff;
		}
		body[data-dsh-tianlight] .tl-we-search-row {
			display: flex;
			gap: 6px;
			flex-wrap: wrap;
			align-items: center;
		}
		body[data-dsh-tianlight] .tl-we-search {
			flex: 1 1 220px;
			min-width: 140px;
			border: 1px solid var(--tl-line);
			background: var(--tl-code);
			color: var(--tl-ink);
			font: inherit;
			font-size: 13px;
			border-radius: 8px;
			padding: 6px 10px;
			outline: none;
		}
		body[data-dsh-tianlight] .tl-we-search:focus {
			border-color: var(--tl-accent);
		}
		body[data-dsh-tianlight] .tl-we-chips {
			display: flex;
			gap: 6px;
			flex-wrap: wrap;
			align-items: center;
		}
		body[data-dsh-tianlight] .tl-we-scroll {
			min-height: 0;
			max-width: 100%;
			overflow: auto;
			padding: 2px 2px 12px;
		}
		body[data-dsh-tianlight] .tl-we-grid {
			display: grid;
			grid-template-columns: repeat(auto-fill, minmax(176px, 1fr));
			gap: 10px;
			max-width: 100%;
		}
		@media (max-width: 560px) {
			body[data-dsh-tianlight] .tl-we-grid {
				grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
			}
		}
		body[data-dsh-tianlight] .tl-we-card {
			position: relative;
			min-width: 0;
			border: 1px solid var(--tl-line);
			border-radius: 12px;
			background: var(--tl-code);
			overflow: hidden;
			display: flex;
			flex-direction: column;
		}
		body[data-dsh-tianlight] .tl-we-card[data-tl-we-in-use] {
			border-color: var(--tl-accent);
			box-shadow: 0 0 0 1px var(--tl-accent), 0 6px 20px var(--tl-accent-soft);
		}
		body[data-dsh-tianlight] .tl-we-thumb {
			appearance: none;
			display: block;
			position: relative;
			width: 100%;
			aspect-ratio: 16 / 9;
			padding: 0;
			margin: 0;
			border: 0;
			background: rgba(128, 128, 128, 0.14);
			cursor: pointer;
			overflow: hidden;
		}
		body[data-dsh-tianlight] .tl-we-thumb img,
		body[data-dsh-tianlight] .tl-we-thumb video {
			display: block;
			width: 100%;
			height: 100%;
			object-fit: cover;
		}
		body[data-dsh-tianlight] .tl-we-thumb[data-tl-we-preview="failed"] img,
		body[data-dsh-tianlight] .tl-we-thumb[data-tl-we-preview="failed"] video {
			display: none;
		}
		body[data-dsh-tianlight] .tl-we-fallback {
			position: absolute;
			inset: 0;
			display: none;
			align-items: center;
			justify-content: center;
			font-size: 12px;
			color: var(--tl-ink-faint);
			background: rgba(128, 128, 128, 0.1);
			text-align: center;
			padding: 8px;
		}
		body[data-dsh-tianlight] .tl-we-thumb[data-tl-we-preview="failed"] .tl-we-fallback,
		body[data-dsh-tianlight] .tl-we-thumb[data-tl-we-preview="none"] .tl-we-fallback {
			display: flex;
		}
		body[data-dsh-tianlight] .tl-we-badge {
			position: absolute;
			top: 6px;
			left: 6px;
			font-size: 10px;
			line-height: 1;
			padding: 4px 6px;
			border-radius: 999px;
			background: rgba(6, 12, 20, 0.66);
			color: #f2f7ff;
			backdrop-filter: blur(4px);
		}
		body[data-dsh-tianlight] .tl-we-badge[data-tl-we-in-use] {
			left: auto;
			right: 6px;
			background: var(--tl-accent);
			color: #ffffff;
		}
		body[data-dsh-tianlight] .tl-we-type-badge {
			position: absolute;
			bottom: 6px;
			right: 6px;
			font-size: 10px;
			line-height: 1;
			padding: 4px 6px;
			border-radius: 6px;
			background: rgba(6, 12, 20, 0.6);
			color: #eaf3ff;
		}
		body[data-dsh-tianlight] .tl-we-caption {
			display: flex;
			flex-direction: column;
			gap: 4px;
			padding: 7px 8px 8px;
			min-width: 0;
		}
		body[data-dsh-tianlight] .tl-we-name {
			font-size: 12px;
			line-height: 1.35;
			color: var(--tl-ink);
			display: -webkit-box;
			-webkit-line-clamp: 2;
			-webkit-box-orient: vertical;
			overflow: hidden;
			word-break: break-word;
		}
		body[data-dsh-tianlight] .tl-we-sub {
			font-size: 10px;
			line-height: 1.3;
			color: var(--tl-ink-faint);
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}
		body[data-dsh-tianlight] .tl-we-scene-row {
			display: flex;
			gap: 6px;
			flex-wrap: wrap;
			align-items: center;
		}
		body[data-dsh-tianlight] .tl-we-scene-note {
			font-size: 10px;
			line-height: 1.35;
			color: var(--tl-ink-soft);
		}
		body[data-dsh-tianlight] .tl-we-scene-error {
			font-size: 10px;
			line-height: 1.35;
			color: #c0392b;
		}
		body[data-dsh-tianlight][data-ds-dark-theme] .tl-we-scene-error {
			color: #ff9c8a;
		}
		body[data-dsh-tianlight] .tl-we-state {
			border: 1px dashed var(--tl-line-strong);
			border-radius: 12px;
			padding: 18px 16px;
			background: var(--tl-code);
			color: var(--tl-ink-soft);
			font-size: 12px;
			line-height: 1.6;
		}
		body[data-dsh-tianlight] .tl-we-state-title {
			margin: 0 0 4px;
			font-size: 13px;
			font-weight: 600;
			color: var(--tl-ink);
		}
		body[data-dsh-tianlight] .tl-we-state-hint {
			margin: 0 0 8px;
		}
		body[data-dsh-tianlight] .tl-we-toast {
			position: fixed;
			left: 50%;
			bottom: 28px;
			transform: translateX(-50%);
			z-index: 2610;
			max-width: min(560px, 86vw);
			padding: 8px 14px;
			border-radius: 999px;
			background: rgba(12, 20, 32, 0.86);
			color: #f2f7ff;
			font-size: 12px;
			line-height: 1.4;
			box-shadow: 0 10px 30px rgba(0, 0, 0, 0.28);
			pointer-events: none;
		}
		/* ---- sidebar footer action (skin-styled, works in 56px rail and wide) ---- */
		body[data-dsh-tianlight] .tl-we-nav-btn {
			appearance: none;
			display: inline-flex;
			align-items: center;
			justify-content: center;
			gap: 8px;
			width: 100%;
			min-height: 32px;
			border: 1px solid var(--tl-line);
			border-radius: 8px;
			background: var(--tl-accent-soft);
			color: var(--tl-ink);
			font: inherit;
			font-size: 12px;
			padding: 4px 8px;
			cursor: pointer;
		}
		body[data-dsh-tianlight] .tl-we-nav-btn:hover {
			border-color: var(--tl-accent);
		}
		body[data-dsh-tianlight] .tl-we-nav-btn[data-tl-we-wide="false"] {
			width: 32px;
			min-height: 32px;
			padding: 0;
			gap: 0;
			border-color: transparent;
			background: transparent;
		}
		body[data-dsh-tianlight] .tl-we-nav-icon {
			display: inline-flex;
			width: 16px;
			height: 16px;
			flex: none;
		}
		body[data-dsh-tianlight] .tl-we-nav-label {
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}
		/* ---- fullscreen overlay entry (z above the skin panel and the settings modal) ---- */
		body[data-dsh-tianlight] [data-tl-we-overlay] {
			position: fixed;
			inset: 0;
			z-index: 2600;
			display: flex;
			align-items: center;
			justify-content: center;
			padding: max(16px, 3vh) max(16px, 3vw);
			color: var(--tl-ink);
		}
		body[data-dsh-tianlight] [data-tl-we-overlay][hidden] {
			display: none;
		}
		body[data-dsh-tianlight] .tl-we-mask {
			position: absolute;
			inset: 0;
			background: rgba(4, 10, 18, 0.55);
			backdrop-filter: blur(10px) saturate(1.1);
			cursor: pointer;
		}
		body[data-dsh-tianlight][data-ds-dark-theme] .tl-we-mask {
			background: rgba(2, 6, 12, 0.68);
		}
		body[data-dsh-tianlight] .tl-we-shell {
			position: relative;
			display: flex;
			flex-direction: column;
			width: min(1180px, 94vw);
			height: min(820px, 88vh);
			min-height: 320px;
			border: 1px solid var(--tl-line-strong);
			border-radius: 16px;
			background: var(--tl-panel-fill);
			box-shadow: 0 24px 80px rgba(0, 0, 0, 0.36);
			overflow: hidden;
		}
		body[data-dsh-tianlight] .tl-we-shell-head {
			display: flex;
			align-items: center;
			justify-content: space-between;
			gap: 10px;
			padding: 12px 14px;
			border-bottom: 1px solid var(--tl-line);
		}
		body[data-dsh-tianlight] .tl-we-shell-title {
			margin: 0;
			font-size: 15px;
			font-weight: 600;
			color: var(--tl-ink);
		}
		body[data-dsh-tianlight] .tl-we-close {
			appearance: none;
			display: inline-flex;
			align-items: center;
			justify-content: center;
			width: 30px;
			height: 30px;
			border-radius: 8px;
			border: 1px solid var(--tl-line);
			background: var(--tl-accent-soft);
			color: var(--tl-ink);
			font-size: 16px;
			line-height: 1;
			cursor: pointer;
		}
		body[data-dsh-tianlight] .tl-we-close:hover {
			border-color: var(--tl-accent);
		}
		body[data-dsh-tianlight] .tl-we-shell-body {
			flex: 1 1 auto;
			min-height: 0;
			overflow: auto;
			padding: 12px 14px 18px;
		}
		`);

		/* ================= 常量 / store（两个入口共用同一份状态） ================= */
		const WE_ENDPOINTS = {
			list: "/api/we-wallpaper/list",
			preview: "/api/we-wallpaper/preview",
			media: "/api/we-wallpaper/media",
			pkg: "/api/we-wallpaper/pkg",
			web: "/api/we-wallpaper/web",
			generate: "/api/we-wallpaper/scene-video/generate",
			status: "/api/we-wallpaper/scene-video/status",
			sceneMedia: "/api/we-wallpaper/scene-video/media",
			diagnostics: "/api/we-wallpaper/diagnostics",
		};
		const WE_LAST_KEY = "tianlight.we.last";
		const WE_RECENT_KEY = "tianlight.recent";
		const WE_CACHE_TTL_MS = 15000;
		const WE_FETCH_TIMEOUT_MS = 8000;
		const WE_POLL_INTERVAL_MS = 900;
		const WE_POLL_MAX = 140;
		const WE_TOAST_MS = 2800;
		const WE_TYPES = ["all", "video", "scene", "web", "image"];
		const WE_IMAGE_TYPES = ["video", "scene", "web", "image"];
		/**
		 * Full literal i18n keys per type. A map (instead of a dynamically concatenated
		 * key) keeps the factory-time i18n audit able to see every key and never renders
		 * a bare key for an unknown type.
		 */
		const WE_TYPE_KEYS = {
			all: "we.type.all",
			video: "we.type.video",
			scene: "we.type.scene",
			web: "we.type.web",
			image: "we.type.image",
		};
		function weTypeLabel(type, t) {
			const key = WE_TYPE_KEYS[type];
			if (typeof key !== "string") return String(type === undefined || type === null ? "" : type);
			return typeof t === "function" ? t(key) : TL_T(key);
		}

		const weState = {
			status: "idle",
			found: false,
			root: "",
			count: 0,
			items: [],
			error: "",
			errorKind: "",
			host: null,
			lastId: "",
			sceneStaticId: "",
			toast: { text: "", tone: "" },
			generate: {},
		};
		const weSubscribers = new Set();
		const weTimers = new Set();
		const weControllers = new Set();
		let weListRequest = null;
		let weListFetchedAt = 0;
		let weEnginesPromise = null;
		let weToastTimer = 0;
		let weOpenOverlay = null;

		function weSnapshot() {
			return {
				...weState,
				toast: { ...weState.toast },
				generate: { ...weState.generate },
				items: weState.items.slice(),
			};
		}
		function weNotify() {
			const snapshot = weSnapshot();
			for (const listener of [...weSubscribers]) {
				try {
					listener(snapshot);
				} catch (error) {
					note("we-library:subscriber", error);
				}
			}
		}
		function weSetState(patch) {
			if (patch === null || typeof patch !== "object") return;
			Object.assign(weState, patch);
			weNotify();
		}
		function weSubscribe(listener) {
			if (typeof listener !== "function") return () => {};
			weSubscribers.add(listener);
			listener(weSnapshot());
			return () => {
				weSubscribers.delete(listener);
			};
		}
		function weTrackTimer(timer) {
			if (timer !== 0) weTimers.add(timer);
			return timer;
		}
		function weClearTimer(timer) {
			if (timer === 0) return;
			weTimers.delete(timer);
			try {
				window.clearTimeout(timer);
			} catch {
				// a timer already fired/cleared is fine
			}
		}
		function weClearAllTimers() {
			for (const timer of [...weTimers]) weClearTimer(timer);
			weTimers.clear();
			weToastTimer = 0;
		}
		function weClearAllControllers() {
			for (const controller of [...weControllers]) {
				try {
					controller.abort();
				} catch {
					// an already-aborted request is fine
				}
			}
			weControllers.clear();
		}
		function weSetGenerate(id, patch) {
			const current = weState.generate[id] !== undefined && weState.generate[id] !== null ? weState.generate[id] : {};
			weState.generate = { ...weState.generate, [id]: { ...current, ...(patch === null || typeof patch !== "object" ? {} : patch) } };
			weNotify();
		}
		function weToast(text) {
			const message = typeof text === "string" ? text : "";
			weSetState({ toast: { text: message, tone: "ok" } });
			if (weToastTimer !== 0) weClearTimer(weToastTimer);
			weToastTimer = weTrackTimer(
				window.setTimeout(() => {
					weToastTimer = 0;
					weSetState({ toast: { text: "", tone: "" } });
				}, WE_TOAST_MS),
			);
		}
		/** One fetch helper: JSON-or-null, 8s abort, never throws, no console noise. */
		function weFetchJson(url, options) {
			const controller = typeof AbortController === "function" ? new AbortController() : null;
			if (controller !== null) weControllers.add(controller);
			let timer = 0;
			if (controller !== null) {
				timer = weTrackTimer(
					window.setTimeout(() => {
						weClearTimer(timer);
						timer = 0;
						try {
							controller.abort();
						} catch {
							// an already-finished request is fine
						}
					}, WE_FETCH_TIMEOUT_MS),
				);
			}
			const request = fetch(url, {
				cache: "no-store",
				...(options === null || typeof options !== "object" ? {} : options),
				signal: controller === null ? undefined : controller.signal,
			})
				.then((response) => response.json().catch(() => null).then((value) => ({ ok: response.ok, status: response.status, value })))
				.catch(() => ({ ok: false, status: 0, value: null }));
			return request.then((result) => {
				if (timer !== 0) {
					weClearTimer(timer);
					timer = 0;
				}
				if (controller !== null) weControllers.delete(controller);
				return result;
			});
		}
		function weFetchEngines() {
			if (weEnginesPromise !== null) return weEnginesPromise;
			weEnginesPromise = weFetchJson(ASSET_BASE + "/_engines")
				.then((result) => (result !== null && result.ok === true && result.value !== null && typeof result.value === "object" ? result.value : null))
				.catch(() => null);
			return weEnginesPromise;
		}

		/* ================= 纯函数（可被 harness 直接覆盖） ================= */
		function weNormalizeItem(raw) {
			if (raw === null || typeof raw !== "object") return null;
			const id = typeof raw.id === "string" ? raw.id : typeof raw.id === "number" ? String(raw.id) : "";
			if (id === "") return null;
			const type = WE_IMAGE_TYPES.includes(raw.type) ? raw.type : "video";
			const title = typeof raw.title === "string" && raw.title.trim() !== "" ? raw.title.trim() : id;
			return {
				id,
				title,
				type,
				previewKind: typeof raw.previewKind === "string" ? raw.previewKind : "",
				source: typeof raw.source === "string" ? raw.source : "",
				workshopId: raw.workshopId === undefined || raw.workshopId === null ? "" : String(raw.workshopId),
			};
		}
		function weFilterItems(items, query, type) {
			const list = Array.isArray(items) ? items : [];
			const needle = typeof query === "string" ? query.trim().toLowerCase() : "";
			const wanted = WE_TYPES.includes(type) ? type : "all";
			return list.filter((item) => {
				if (item === null || typeof item !== "object") return false;
				if (wanted !== "all" && item.type !== wanted) return false;
				if (needle === "") return true;
				const haystack = (String(item.title ?? "") + " " + String(item.id ?? "") + " " + String(item.workshopId ?? "")).toLowerCase();
				return haystack.includes(needle);
			});
		}
		function weEncodeId(id) {
			const text = typeof id === "string" ? id : String(id ?? "");
			try {
				return encodeURIComponent(text);
			} catch {
				return text;
			}
		}
		function wePreviewUrl(item) {
			if (item === null || typeof item !== "object" || typeof item.id !== "string" || item.id === "") return "";
			return WE_ENDPOINTS.preview + "/" + weEncodeId(item.id);
		}
		/** The exact wallpaperController.apply() payload for one library item. */
		function weChoiceForItem(item, wantAnimated) {
			if (item === null || typeof item !== "object" || typeof item.id !== "string" || item.id === "") return null;
			const id = weEncodeId(item.id);
			if (item.type === "video") return { kind: "video", url: WE_ENDPOINTS.media + "/" + id };
			if (item.type === "image") return { kind: "image", url: WE_ENDPOINTS.media + "/" + id };
			if (item.type === "web") return { kind: "web", url: WE_ENDPOINTS.web + "/" + id + "/index.html" };
			if (item.type === "scene") {
				return wantAnimated === true
					? { kind: "video", url: WE_ENDPOINTS.sceneMedia + "/" + id }
					: { kind: "image", url: WE_ENDPOINTS.pkg + "/" + id };
			}
			return null;
		}
		/** Extract the library id back out of an applied choice URL (current-item highlight). */
		function weIdFromUrl(url) {
			if (typeof url !== "string" || url === "") return "";
			const patterns = [
				/^\/api\/we-wallpaper\/media\/([^/?#]+)/,
				/^\/api\/we-wallpaper\/pkg\/([^/?#]+)/,
				/^\/api\/we-wallpaper\/preview\/([^/?#]+)/,
				/^\/api\/we-wallpaper\/web\/([^/?#]+)\//,
				/^\/api\/we-wallpaper\/scene-video\/media\/([^/?#]+)/,
			];
			for (const pattern of patterns) {
				const match = pattern.exec(url);
				if (match !== null) {
					try {
						return decodeURIComponent(match[1]);
					} catch {
						return match[1];
					}
				}
			}
			return "";
		}
		function weCurrentId() {
			try {
				if (typeof readWallpaperChoice === "function") {
					const chosen = readWallpaperChoice();
					if (chosen !== null && typeof chosen === "object" && typeof chosen.url === "string") {
						const fromUrl = weIdFromUrl(chosen.url);
						if (fromUrl !== "") return fromUrl;
					}
				}
			} catch {
				// a missing controller is fine: fall back to the last applied id
			}
			return typeof weState.lastId === "string" ? weState.lastId : "";
		}
		/**
		 * The vendored host answers scene-video calls as `{ok, status:{phase,progress,error}}`
		 * (phase: idle|capturing|ready|error). Accept the nested object, a flat object and a
		 * plain string so an upstream shape change cannot wedge the polling loop.
		 */
		function weSceneVideoView(value) {
			if (value === null || typeof value !== "object") return null;
			const nested = value.status !== null && typeof value.status === "object" ? value.status : null;
			const flat = nested !== null ? nested : value;
			const phase =
				typeof flat.phase === "string"
					? flat.phase
					: typeof flat.status === "string"
						? flat.status
						: typeof value.status === "string"
							? value.status
							: "";
			const progress = Number(flat.progress);
			const errorValue = flat.error !== null && flat.error !== undefined ? flat.error : flat.reason !== undefined ? flat.reason : value.error;
			return {
				phase: phase === "" ? "" : phase,
				progress: Number.isFinite(progress) ? progress : 0,
				error: errorValue === null || errorValue === undefined ? "" : String(errorValue).slice(0, 160),
			};
		}
		function weRememberUrl(url) {
			if (typeof url !== "string" || url === "") return;
			try {
				if (typeof globalThis.rememberWallpaper === "function") {
					globalThis.rememberWallpaper(url);
					return;
				}
			} catch {
				// fall through to the shared recent-list write
			}
			try {
				const key = WE_RECENT_KEY;
				const raw = JSON.parse(globalThis.localStorage?.getItem(key) ?? "null");
				const current = Array.isArray(raw) ? raw.filter((entry) => typeof entry === "string" && entry !== "") : [];
				const next = [url, ...current.filter((entry) => entry !== url)].slice(0, 64);
				globalThis.localStorage?.setItem(key, JSON.stringify(next));
			} catch {
				// usage order is a convenience, never a requirement
			}
		}
		function weStoreLast(id) {
			try {
				if (typeof id === "string" && id !== "") globalThis.localStorage?.setItem(WE_LAST_KEY, id);
			} catch {
				// persistence is optional
			}
		}
		function weReadLast() {
			try {
				const value = globalThis.localStorage?.getItem(WE_LAST_KEY);
				return typeof value === "string" ? value : "";
			} catch {
				return "";
			}
		}

		/* ================= 数据流：list / apply / scene generate ================= */
		function weRefreshList(force) {
			if (weListRequest !== null) return weListRequest;
			const now = Date.now();
			if (force !== true && weState.status === "ready" && now - weListFetchedAt < WE_CACHE_TTL_MS) {
				return Promise.resolve(weSnapshot());
			}
			weSetState({ status: "loading", error: "", errorKind: "" });
			weListRequest = (async () => {
				const engines = await weFetchEngines();
				const result = await weFetchJson(WE_ENDPOINTS.list);
				weListRequest = null;
				weListFetchedAt = Date.now();
				if (result === null || result.ok !== true) {
					const missing = result === null || result.status === 0 || result.status === 404 || result.status === 405 || result.status === 501;
					weSetState({
						status: "error",
						found: false,
						items: [],
						errorKind: missing ? "host-missing" : "fetch",
						error: result !== null && result.status > 0 ? "HTTP " + result.status : "",
						host: engines,
					});
					return weSnapshot();
				}
				const value = result.value !== null && typeof result.value === "object" ? result.value : {};
				const rawItems = Array.isArray(value.wallpapers) ? value.wallpapers : [];
				const items = [];
				for (const raw of rawItems) {
					const item = weNormalizeItem(raw);
					if (item !== null) items.push(item);
				}
				weSetState({
					status: "ready",
					found: value.found === true,
					root: typeof value.root === "string" ? value.root : "",
					count: Number.isFinite(Number(value.count)) ? Number(value.count) : items.length,
					items,
					error: "",
					errorKind: "",
					host: engines,
				});
				return weSnapshot();
			})();
			return weListRequest;
		}

		function weApplyChoice(choice, meta) {
			if (choice === null || typeof choice !== "object") return false;
			let applied = false;
			try {
				if (typeof wallpaperController !== "undefined" && wallpaperController !== null && typeof wallpaperController.apply === "function") {
					wallpaperController.apply(choice);
					applied = true;
				}
			} catch (error) {
				note("we-library:apply", error);
				applied = false;
			}
			if (applied !== true) {
				weToast(TL_T("we.error.fetch", { reason: "wallpaper controller unavailable" }));
				return false;
			}
			const id = meta !== null && typeof meta === "object" && typeof meta.id === "string" ? meta.id : "";
			if (id !== "") {
				weStoreLast(id);
				weSetState({ lastId: id });
			}
			weRememberUrl(choice.url);
			return true;
		}

		function weApplyItem(item) {
			if (item === null || typeof item !== "object") return false;
			if (item.type === "scene") {
				weApplySceneStatic(item);
				return true;
			}
			const choice = weChoiceForItem(item, false);
			if (choice === null) return false;
			const ok = weApplyChoice(choice, item);
			if (ok !== true) return false;
			weToast(TL_T("we.toastApplied", { title: item.title }));
			return true;
		}
		/**
		 * Scene cards apply the HD still first (the v0.6.0 default). The vendored host
		 * can only decode some projects: `/diagnostics/<id>` reports `pkgFound`, and a
		 * project without a decodable pkg falls back to its preview image — the same
		 * honest rule `_wallpapers` uses for scene cards.
		 */
		function weApplySceneStatic(item) {
			const id = weEncodeId(item.id);
			void (async () => {
				let choice = { kind: "image", url: WE_ENDPOINTS.pkg + "/" + id };
				let usedPreview = false;
				const result = await weFetchJson(WE_ENDPOINTS.diagnostics + "/" + id);
				if (result !== null && result.ok === true && result.value !== null && typeof result.value === "object") {
					const diagnostics = result.value.diagnostics;
					if (diagnostics !== null && diagnostics !== undefined && typeof diagnostics === "object" && diagnostics.pkgFound === false) {
						choice = { kind: "image", url: WE_ENDPOINTS.preview + "/" + id };
						usedPreview = true;
					}
				}
				const ok = weApplyChoice(choice, item);
				if (ok !== true) return;
				weSetState({ sceneStaticId: item.id });
				weToast(usedPreview ? TL_T("we.scene.previewOnly", { title: item.title }) : TL_T("we.toastScene", { title: item.title }));
			})();
		}

		function weFindItem(id) {
			for (const item of weState.items) {
				if (item.id === id) return item;
			}
			return null;
		}

		function weFinishSceneGenerate(id) {
			const item = weFindItem(id);
			const animated = item === null ? { kind: "video", url: WE_ENDPOINTS.sceneMedia + "/" + weEncodeId(id) } : weChoiceForItem(item, true);
			weSetGenerate(id, { status: "ready", progress: 1, error: "" });
			if (animated !== null) {
				weApplyChoice(animated, item === null ? { id } : item);
				weToast(TL_T("we.toastApplied", { title: item === null ? id : item.title }));
			}
		}

		function wePollSceneGenerate(id, attempt) {
			if (attempt > WE_POLL_MAX) {
				weSetGenerate(id, { status: "error", error: TL_T("we.scene.timeout") });
				return;
			}
			const timer = weTrackTimer(
				window.setTimeout(() => {
					weTimers.delete(timer);
					void (async () => {
						const result = await weFetchJson(WE_ENDPOINTS.status + "/" + weEncodeId(id));
						if (result === null || result.ok !== true) {
							weSetGenerate(id, {
								status: "error",
								error: TL_T("we.scene.failed", { reason: result !== null && result.status > 0 ? "HTTP " + result.status : "status unavailable" }),
							});
							return;
						}
						const view = weSceneVideoView(result.value);
						const phase = view === null ? "" : view.phase;
						if (phase === "ready" || phase === "done" || phase === "succeeded") {
							weFinishSceneGenerate(id);
							return;
						}
						if (phase === "error" || phase === "failed" || phase === "cancelled") {
							const reason = view !== null && view.error !== "" ? view.error : phase;
							weSetGenerate(id, { status: "error", error: TL_T("we.scene.failed", { reason }) });
							return;
						}
						const progress = view === null ? 0 : Math.max(0, Math.min(100, Math.round(view.progress)));
						weSetGenerate(id, { status: "running", progress, error: "" });
						wePollSceneGenerate(id, attempt + 1);
					})();
				}, WE_POLL_INTERVAL_MS),
			);
		}

		function weGenerateScene(id) {
			if (typeof id !== "string" || id === "") return;
			const current = weState.generate[id];
			if (current !== undefined && current !== null && (current.status === "queued" || current.status === "running")) return;
			weSetGenerate(id, { status: "queued", progress: 0, error: "" });
			void (async () => {
				const result = await weFetchJson(WE_ENDPOINTS.generate + "/" + weEncodeId(id), {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: "{}",
				});
				if (result === null || result.ok !== true) {
					const unsupported =
						result !== null && (result.status === 503 || result.status === 501 || result.status === 404 || result.status === 400);
					const reason =
						result !== null && result.value !== null && typeof result.value === "object" && (result.value.error !== undefined || result.value.note !== undefined)
							? String(result.value.error ?? result.value.note).slice(0, 160)
							: result !== null && result.status > 0
								? "HTTP " + result.status
								: "host unavailable";
					weSetGenerate(id, { status: "error", error: unsupported ? TL_T("we.scene.unsupported") : TL_T("we.scene.failed", { reason }) });
					return;
				}
				// The vendored host answers {ok, status:{phase,progress,error}}; a plain
				// string / flat phase is accepted for forward compatibility.
				const view = weSceneVideoView(result.value);
				const phase = view === null ? "" : view.phase;
				if (phase === "ready" || phase === "done" || phase === "succeeded") {
					weFinishSceneGenerate(id);
					return;
				}
				if (phase === "error" || phase === "failed" || phase === "cancelled") {
					const reason = view !== null && view.error !== "" ? view.error : phase === "" ? "host error" : phase;
					weSetGenerate(id, { status: "error", error: TL_T("we.scene.failed", { reason }) });
					return;
				}
				weSetGenerate(id, { status: "running", progress: view === null ? 0 : Math.max(0, Math.min(100, Math.round(view.progress))), error: "" });
				wePollSceneGenerate(id, 1);
			})();
		}

		/* ================= 共享 hook / 小组件 ================= */
		function useWeLibraryStore() {
			const [snapshot, setSnapshot] = React.useState(() => weSnapshot());
			React.useEffect(() => weSubscribe(setSnapshot), []);
			return snapshot;
		}

		function weSceneGenerateState(store, id) {
			const entry = store.generate !== null && store.generate !== undefined && typeof store.generate === "object" ? store.generate[id] : undefined;
			return entry !== null && entry !== undefined && typeof entry === "object" ? entry : null;
		}

		/** The settings-section page (real "function button" in DSH 设置). */
		function WeLibraryPage(props) {
			const { t } = useTl5I18n();
			return React.createElement(
				"div",
				{ "data-tl-we-page": "", "data-tl-we-mode": "settings", className: "tl-we-page" },
				React.createElement(
					"div",
					{ className: "tl-we-head" },
					React.createElement(
						"div",
						{ className: "tl-we-head-main" },
						React.createElement("h2", { className: "tl-we-title" }, t("we.title")),
						React.createElement("p", { className: "tl-we-subtitle" }, t("we.subtitle")),
					),
				),
				React.createElement(WeLibraryBody, { mode: "settings" }),
			);
		}

		/** Sidebar-foot action registered beside Settings; owner passes {wide}. */
		function SidebarWallpaperButton(props) {
			const { t } = useTl5I18n();
			const wide = props !== null && props !== undefined && props.wide === true;
			const label = t("we.sidebar.label");
			return React.createElement(
				"button",
				{
					type: "button",
					className: "tl-we-nav-btn",
					"data-tl-we-nav": "",
					"data-tl-we-wide": wide === true ? "true" : "false",
					title: label,
					"aria-label": label,
					onClick: () => {
						if (typeof weOpenOverlay === "function") {
							weOpenOverlay();
							return;
						}
						try {
							if (typeof globalThis.dispatchEvent === "function" && typeof globalThis.CustomEvent === "function") {
								globalThis.dispatchEvent(new globalThis.CustomEvent("tianlight:open-wallpaper-library"));
							}
						} catch {
							// no overlay path available: the settings page entry still works
						}
					},
				},
				React.createElement(
					"span",
					{ className: "tl-we-nav-icon", "aria-hidden": "true" },
					React.createElement(
						"svg",
						{ viewBox: "0 0 16 16", width: "16", height: "16", fill: "none", stroke: "currentColor", strokeWidth: "1.4" },
						React.createElement("rect", { x: "2", y: "2.5", width: "12", height: "9", rx: "1.4" }),
						React.createElement("path", { d: "M2.8 9.4 6 6.4l2.4 2.2 2-1.7 2.6 2.4" }),
						React.createElement("circle", { cx: "10.9", cy: "5.3", r: "0.9" }),
					),
				),
				wide === true ? React.createElement("span", { className: "tl-we-nav-label" }, label) : null,
			);
		}

		/** Full-screen overlay entry (fixed, dark glass, Esc/close). */
		function WeLibraryOverlay(props) {
			const { t } = useTl5I18n();
			const closeRef = React.useRef(null);
			React.useEffect(() => {
				const node = closeRef.current;
				if (node !== null && node !== undefined && typeof node.focus === "function") {
					try {
						node.focus();
					} catch {
						// focus is best effort
					}
				}
			}, []);
			const close = props !== null && props !== undefined && typeof props.onClose === "function" ? props.onClose : () => {};
			return React.createElement(
				"div",
				{ "data-tl-we-overlay-root": "", "data-tl-we-overlay": "", role: "dialog", "aria-modal": "true", "aria-label": t("we.overlay.title") },
				React.createElement("div", { className: "tl-we-mask", "data-tl-we-mask": "", onClick: close, "aria-hidden": "true" }),
				React.createElement(
					"div",
					{ className: "tl-we-shell" },
					React.createElement(
						"div",
						{ className: "tl-we-shell-head" },
						React.createElement("h2", { className: "tl-we-shell-title" }, t("we.overlay.title")),
						React.createElement(
							"button",
							{
								type: "button",
								className: "tl-we-close",
								ref: closeRef,
								"data-tl-we-close": "",
								"aria-label": t("we.close"),
								title: t("we.close"),
								onClick: close,
							},
							"\u00d7",
						),
					),
					React.createElement("div", { className: "tl-we-shell-body" }, React.createElement(WeLibraryBody, { mode: "overlay" })),
				),
			);
		}

		/* ================= 页面主体（设置页与浮层共用） ================= */
		function WeLibraryBody(props) {
			const { t } = useTl5I18n();
			const store = useWeLibraryStore();
			const [query, setQuery] = React.useState("");
			const [type, setType] = React.useState("all");
			React.useEffect(() => {
				void weRefreshList(false);
			}, []);
			const mode = props !== null && props !== undefined && props.mode === "overlay" ? "overlay" : "settings";
			const items = Array.isArray(store.items) ? store.items : [];
			const filtered = weFilterItems(items, query, type);
			const currentId = weCurrentId();
			const detected = store.status === "ready" ? t("we.detected", { n: store.count }) : "";
			const buildMeta = () => {
				if (store.status !== "ready") return null;
				const parts = [detected];
				if (store.root !== "") parts.push(t("we.rootHint", { root: store.root }));
				return React.createElement("p", { className: "tl-we-meta", title: store.root === "" ? undefined : store.root }, parts.join(" · "));
			};
			const typeChips = WE_TYPES.map((value) =>
				React.createElement(
					"button",
					{
						key: value,
						type: "button",
						className: "tl-we-btn",
						"data-tl-we-type": value,
						"data-active": type === value ? "" : undefined,
						"aria-pressed": type === value,
						onClick: () => setType(value),
					},
					weTypeLabel(value, t),
				),
			);
			const renderCard = (item) => {
				const inUse = currentId !== "" && currentId === item.id;
				const generated = weSceneGenerateState(store, item.id);
				const previewKind = item.previewKind === "video" ? "video" : item.previewKind === "none" ? "none" : "image";
				const onPreviewFailed = (event) => {
					const button = event !== null && event !== undefined && event.currentTarget !== undefined ? event.currentTarget.parentNode : null;
					if (button !== null && button !== undefined && typeof button.setAttribute === "function") button.setAttribute("data-tl-we-preview", "failed");
				};
				const preview =
					previewKind === "none"
						? null
						: previewKind === "video"
							? React.createElement("video", {
									src: wePreviewUrl(item),
									muted: true,
									loop: true,
									playsInline: true,
									preload: "metadata",
									"aria-hidden": "true",
									onError: onPreviewFailed,
									onMouseEnter: (event) => {
										try {
											void event.currentTarget.play();
										} catch {
											// hover previews are optional
										}
									},
									onMouseLeave: (event) => {
										try {
											event.currentTarget.pause();
										} catch {
											// hover previews are optional
										}
									},
								})
							: React.createElement("img", {
									src: wePreviewUrl(item),
									alt: item.title,
									loading: "lazy",
									decoding: "async",
									onError: onPreviewFailed,
								});
				const sourceLabel =
					item.source === "workshop"
						? t("we.source.workshop")
						: item.source === "project"
							? t("we.source.project")
							: item.source !== ""
								? item.source
								: "";
				const subParts = [];
				if (sourceLabel !== "") subParts.push(sourceLabel);
				if (item.workshopId !== "") subParts.push(t("we.workshopId", { id: item.workshopId }));
				const sceneState = generated;
				const generating = sceneState !== null && (sceneState.status === "queued" || sceneState.status === "running");
				const generateLabel = generating
					? t("we.scene.generating")
					: sceneState !== null && sceneState.status === "error"
						? t("we.scene.retry")
						: t("we.scene.generate");
				const generatePercent = sceneState !== null && Number.isFinite(Number(sceneState.progress)) ? Math.round(Number(sceneState.progress)) : 0;
				const sceneRow =
					item.type === "scene"
						? React.createElement(
								"div",
								{ className: "tl-we-scene-row" },
								React.createElement(
									"button",
									{
										type: "button",
										className: "tl-we-btn",
										"data-tl-we-generate": item.id,
										disabled: generating,
										title: t("we.scene.note"),
										onClick: (event) => {
											if (event !== null && event !== undefined && typeof event.stopPropagation === "function") event.stopPropagation();
											weGenerateScene(item.id);
										},
									},
									generateLabel,
								),
								generating
									? React.createElement("span", { className: "tl-we-scene-note" }, t("we.scene.progress", { percent: generatePercent }))
									: sceneState !== null && sceneState.status === "error"
										? React.createElement("span", { className: "tl-we-scene-error" }, String(sceneState.error || t("we.scene.failed", { reason: "" })))
										: null,
							)
						: null;
				return React.createElement(
					"div",
					{
						key: item.id,
						className: "tl-we-card",
						"data-tl-we-card": item.id,
						"data-tl-we-type": item.type,
						"data-tl-we-in-use": inUse ? "" : undefined,
					},
					React.createElement(
						"button",
						{
							type: "button",
							className: "tl-we-thumb",
							"data-tl-we-apply": item.id,
							"data-tl-we-preview": previewKind === "none" ? "none" : "ok",
							title: t("we.applyTitle", { title: item.title }),
							"aria-label": t("we.applyTitle", { title: item.title }),
							onClick: () => weApplyItem(item),
						},
						preview,
						React.createElement("span", { className: "tl-we-fallback" }, t("we.previewFailed")),
						inUse ? React.createElement("span", { className: "tl-we-badge", "data-tl-we-in-use": "" }, t("we.inUse")) : null,
						React.createElement("span", { className: "tl-we-type-badge" }, weTypeLabel(item.type, t)),
					),
					React.createElement(
						"div",
						{ className: "tl-we-caption" },
						React.createElement("span", { className: "tl-we-name", title: item.title }, item.title === "" ? t("we.unknownTitle") : item.title),
						subParts.length === 0 ? null : React.createElement("span", { className: "tl-we-sub" }, subParts.join(" · ")),
						item.type === "scene"
							? React.createElement(
									"span",
									{ className: "tl-we-scene-note", "data-tl-we-scene-hint": "" },
									store.sceneStaticId === item.id ? t("we.scene.static") + " · " + t("we.scene.cardHint") : t("we.scene.cardHint"),
								)
							: null,
						sceneRow,
					),
				);
			};
			let content = null;
			if (store.status === "idle" || store.status === "loading") {
				content = React.createElement("div", { className: "tl-we-state", "data-tl-we-state": "loading" }, t("we.loading"));
			} else if (store.status === "error") {
				const hostMissing = store.errorKind === "host-missing";
				content = React.createElement(
					"div",
					{ className: "tl-we-state", "data-tl-we-state": hostMissing ? "host-missing" : "error" },
					React.createElement("p", { className: "tl-we-state-title" }, hostMissing ? t("we.hostMissing.title") : t("we.error.fetch", { reason: store.error === "" ? "?" : store.error })),
					React.createElement("p", { className: "tl-we-state-hint" }, t("we.hostMissing.hint")),
					React.createElement(
						"button",
						{ type: "button", className: "tl-we-btn", onClick: () => void weRefreshList(true) },
						t("we.retry"),
					),
				);
			} else if (items.length === 0 || store.found === false) {
				content = React.createElement(
					"div",
					{ className: "tl-we-state", "data-tl-we-state": "empty" },
					React.createElement("p", { className: "tl-we-state-title" }, t("we.empty.title")),
					React.createElement("p", { className: "tl-we-state-hint" }, t("we.empty.hint")),
					React.createElement(
						"button",
						{ type: "button", className: "tl-we-btn", onClick: () => void weRefreshList(true) },
						t("we.refresh"),
					),
				);
			} else if (filtered.length === 0) {
				content = React.createElement("div", { className: "tl-we-state", "data-tl-we-state": "no-match" }, t("we.empty.filter"));
			} else {
				content = React.createElement("div", { className: "tl-we-grid", "data-tl-we-grid": "" }, filtered.map(renderCard));
			}
			return React.createElement(
				"div",
				{ "data-tl-we-body": "", "data-tl-we-body-mode": mode, className: "tl-we-body" },
				React.createElement(
					"div",
					{ className: "tl-we-actions", "data-tl-we-toolbar": "" },
					React.createElement(
						"span",
						{ className: "tl-we-sub", "data-tl-we-count": "" },
						t("we.count", { shown: filtered.length, total: items.length }),
					),
					React.createElement(
						"button",
						{ type: "button", className: "tl-we-btn", "data-tl-we-refresh": "", disabled: store.status === "loading", onClick: () => void weRefreshList(true) },
						store.status === "loading" ? t("we.refreshing") : t("we.refresh"),
					),
					buildMeta(),
				),
				React.createElement(
					"div",
					{ className: "tl-we-search-row" },
					React.createElement("input", {
						type: "search",
						className: "tl-we-search",
						"data-tl-we-search": "",
						placeholder: t("we.searchPlaceholder"),
						"aria-label": t("we.searchLabel"),
						value: query,
						onChange: (event) => setQuery(event !== null && event !== undefined && event.target !== undefined ? String(event.target.value ?? "") : ""),
					}),
					React.createElement("div", { className: "tl-we-chips", "data-tl-we-types": "" }, typeChips),
				),
				React.createElement("div", { className: "tl-we-scroll", "data-tl-we-scroll": "" }, content),
				store.toast !== null && store.toast !== undefined && store.toast.text !== ""
					? React.createElement("div", { className: "tl-we-toast", "data-tl-we-toast": "" }, store.toast.text)
					: null,
			);
		}

		/* ================= 控制器（面板/诊断可读；两个入口共用） ================= */
		const weLibraryController = {
			endpoints: () => ({ ...WE_ENDPOINTS }),
			read: () => weSnapshot(),
			state: () => weSnapshot(),
			refresh: (force) => weRefreshList(force === true),
			applyById: (id) => {
				const item = weFindItem(typeof id === "string" ? id : "");
				return item === null ? false : weApplyItem(item);
			},
			generate: (id) => weGenerateScene(typeof id === "string" ? id : ""),
			open: () => {
				if (typeof weOpenOverlay === "function") {
					weOpenOverlay();
					return true;
				}
				return false;
			},
			subscribe: (listener) => weSubscribe(listener),
		};

		/* ================= installWeLibrary(ctx) ================= */
		/**
		 * 安装两个 DSH slots 入口 + CustomEvent 浮层入口。任何一步失败都只写
		 * tl5Diag，不影响 apply()；返回的 disposer 会反注册 slots、移除监听、卸载
		 * React root 并清空所有定时器/进行中的请求。
		 */
		function installWeLibrary(ctx) {
			let disposed = false;
			let overlayHost = null;
			let overlayRoot = null;
			let overlayOpen = false;
			let disposeSlots = () => {};

			const ensureOverlayHost = () => {
				if (overlayHost !== null) return overlayHost;
				if (typeof document === "undefined" || document.body === null || document.body === undefined) return null;
				overlayHost = document.createElement("div");
				overlayHost.setAttribute("data-tl-we-overlay", "");
				overlayHost.setAttribute("data-tl-we-host", "");
				overlayHost.hidden = true;
				document.body.appendChild(overlayHost);
				try {
					const ReactDomClient = require("react-dom/client");
					if (ReactDomClient !== null && ReactDomClient !== undefined && typeof ReactDomClient.createRoot === "function") {
						overlayRoot = ReactDomClient.createRoot(overlayHost);
					}
				} catch (error) {
					overlayRoot = null;
					note("we-library:react-dom", error);
				}
				return overlayHost;
			};
			const closeOverlay = () => {
				if (overlayOpen === false && (overlayHost === null || overlayHost.hidden === true)) return;
				overlayOpen = false;
				if (overlayRoot !== null) {
					try {
						overlayRoot.render(null);
					} catch {
						// an unmounted root is fine
					}
				}
				if (overlayHost !== null) overlayHost.hidden = true;
			};
			const openOverlay = () => {
				if (disposed) return false;
				const host = ensureOverlayHost();
				if (host === null || overlayRoot === null) {
					// No DOM/React root (or a stripped profile): keep the event path honest.
					tl5Diag("engine", { weLibraryOverlay: "unavailable" });
					return false;
				}
				overlayOpen = true;
				host.hidden = false;
				try {
					overlayRoot.render(React.createElement(WeLibraryOverlay, { onClose: closeOverlay }));
				} catch (error) {
					overlayOpen = false;
					note("we-library:overlay", error);
					return false;
				}
				// Opening the library is the only moment it needs fresh data.
				void weRefreshList(false);
				tl5Diag("engine", { weLibraryOverlay: "open" });
				return true;
			};
			weOpenOverlay = openOverlay;

			const onKeyDown = (event) => {
				if (overlayOpen === false) return;
				const key = event !== null && event !== undefined ? event.key : "";
				if (key !== "Escape" && key !== "Esc") return;
				if (typeof event.preventDefault === "function") event.preventDefault();
				closeOverlay();
			};
			/**
			 * Panel/library entry event. Mark the event handled only when the overlay
			 * really opened: the panel then shows its success note instead of the
			 * "go to Settings" fallback, and other listeners see defaultPrevented.
			 */
			const onOpenRequest = (event) => {
				const opened = openOverlay() === true;
				if (opened === true && event !== null && event !== undefined && typeof event.preventDefault === "function") event.preventDefault();
				return opened;
			};
			window.addEventListener("keydown", onKeyDown);
			window.addEventListener("tianlight:open-wallpaper-library", onOpenRequest);

			/*
			 * Slot registrations. The settings entry is re-registered when the skin's own
			 * language switch fires: our i18n is skin-local, so the DSH locale revision
			 * does not move and the shell's cached nav rows would keep the old label. A
			 * fresh registration bumps the slot ledger, which re-projects the label thunk.
			 */
			let slotService = null;
			const slotHandles = { settings: null, sidebar: null };
			const registerSettingsEntry = () => {
				if (slotService === null) return;
				if (slotHandles.settings !== null) {
					try {
						slotHandles.settings();
					} catch (error) {
						note("we-library:settings-refresh", error);
					}
					slotHandles.settings = null;
				}
				try {
					slotHandles.settings = slotService.register(
						{ name: "settings.section", id: "tianlight-wallpaper", order: 120, label: () => TL_T("we.section.label") },
						WeLibraryPage,
					);
				} catch (error) {
					tl5Diag("engine", { weLibrarySlots: "settings.section-failed" });
					note("we-library:settings-slot", error);
				}
			};
			const registerSidebarEntry = () => {
				if (slotService === null) return;
				if (slotHandles.sidebar !== null) {
					try {
						slotHandles.sidebar();
					} catch (error) {
						note("we-library:sidebar-refresh", error);
					}
					slotHandles.sidebar = null;
				}
				try {
					slotHandles.sidebar = slotService.register(
						{ name: "sidebar.footer.action", id: "tianlight-wallpaper", order: 10, label: () => TL_T("we.sidebar.label") },
						SidebarWallpaperButton,
					);
				} catch (error) {
					tl5Diag("engine", { weLibrarySidebarSlot: "failed" });
					note("we-library:sidebar-slot", error);
				}
			};
			const clearSlotHandles = () => {
				for (const name of ["settings", "sidebar"]) {
					const handle = slotHandles[name];
					slotHandles[name] = null;
					try {
						if (typeof handle === "function") handle();
					} catch (error) {
						note("we-library:slot-dispose", error);
					}
				}
			};
			let disposeI18n = () => {};
			if (React !== null && typeof ctx !== "undefined" && ctx !== null && typeof ctx.inject === "function") {
				try {
					const slotDisposer = ctx.inject(["slots"], (scoped) => {
						if (disposed) return () => {};
						const scopedSlots = scoped !== null && scoped !== undefined && typeof scoped.get === "function" ? scoped.get("slots") : undefined;
						const slots = scopedSlots !== undefined && scopedSlots !== null ? scopedSlots : scoped !== null && scoped !== undefined ? scoped.slots : undefined;
						if (
							slots === undefined ||
							slots === null ||
							typeof slots.inject !== "function" ||
							typeof slots.register !== "function"
						) {
							tl5Diag("engine", { weLibrarySlots: "missing" });
							return () => {};
						}
						slotService = slots;
						const disposers = [];
						try {
							disposers.push(
								slots.inject("settings.section", () => {
									registerSettingsEntry();
									return () => {
										if (slotHandles.settings !== null) {
											try {
												slotHandles.settings();
											} catch (error) {
												note("we-library:settings-release", error);
											}
											slotHandles.settings = null;
										}
									};
								}),
							);
							tl5Diag("engine", { weLibrarySlots: "settings.section+sidebar.footer.action" });
						} catch (error) {
							tl5Diag("engine", { weLibrarySlots: "settings.section-failed" });
							note("we-library:settings-slot", error);
						}
						try {
							disposers.push(
								slots.inject("sidebar.footer.action", () => {
									registerSidebarEntry();
									return () => {
										if (slotHandles.sidebar !== null) {
											try {
												slotHandles.sidebar();
											} catch (error) {
												note("we-library:sidebar-release", error);
											}
											slotHandles.sidebar = null;
										}
									};
								}),
							);
						} catch (error) {
							tl5Diag("engine", { weLibrarySidebarSlot: "failed" });
							note("we-library:sidebar-slot", error);
						}
						return () => {
							for (const dispose of disposers) {
								try {
									if (typeof dispose === "function") dispose();
								} catch (error) {
									note("we-library:slot-dispose", error);
								}
							}
							slotService = null;
						};
					});
					if (typeof slotDisposer === "function") disposeSlots = slotDisposer;
				} catch (error) {
					tl5Diag("engine", { weLibrarySlots: "inject-failed" });
					note("we-library:inject", error);
				}
			} else {
				tl5Diag("engine", { weLibrarySlots: "unavailable" });
			}
			if (typeof subscribeTl5I18n === "function") {
				try {
					const unsubscribe = subscribeTl5I18n(() => {
						if (disposed === false) registerSettingsEntry();
					});
					if (typeof unsubscribe === "function") disposeI18n = unsubscribe;
				} catch (error) {
					note("we-library:i18n-subscribe", error);
				}
			}
			tl5Diag("engine", { weLibrary: { installed: true, endpoints: { ...WE_ENDPOINTS } } });

			return () => {
				if (disposed) return;
				disposed = true;
				if (weOpenOverlay === openOverlay) weOpenOverlay = null;
				window.removeEventListener("keydown", onKeyDown);
				window.removeEventListener("tianlight:open-wallpaper-library", onOpenRequest);
				closeOverlay();
				if (overlayRoot !== null) {
					try {
						overlayRoot.unmount();
					} catch {
						// an already-unmounted root is fine
					}
					overlayRoot = null;
				}
				if (overlayHost !== null) {
					overlayHost.remove();
					overlayHost = null;
				}
				try {
					disposeI18n();
				} catch (error) {
					note("we-library:dispose-i18n", error);
				}
				disposeI18n = () => {};
				try {
					disposeSlots();
				} catch (error) {
					note("we-library:dispose-slots", error);
				}
				disposeSlots = () => {};
				clearSlotHandles();
				slotService = null;
				weClearAllTimers();
				weClearAllControllers();
				weListRequest = null;
				tl5Diag("engine", { weLibrary: { installed: false } });
			};
		}
		//#endregion
