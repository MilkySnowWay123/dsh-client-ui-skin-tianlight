		//#region wallpaper
		/** Inline SVG: a corner "dawn burst" so the top-left reads as sky light. */
		const CREST_SVG =
			"<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'>" +
			"<defs>" +
			"<radialGradient id='c' cx='50%' cy='50%' r='50%'>" +
			"<stop offset='0' stop-color='#ffffff' stop-opacity='.95'/>" +
			"<stop offset='.35' stop-color='#cfeaff' stop-opacity='.55'/>" +
			"<stop offset='1' stop-color='#9fd0ff' stop-opacity='0'/>" +
			"</radialGradient>" +
			"<linearGradient id='r' x1='0' y1='1' x2='1' y2='0'>" +
			"<stop offset='0' stop-color='#ffffff' stop-opacity='.55'/>" +
			"<stop offset='1' stop-color='#bfe4ff' stop-opacity='0'/>" +
			"</linearGradient>" +
			"</defs>" +
			"<circle cx='100' cy='100' r='100' fill='url(#c)'/>" +
			"<g stroke='url(#r)' stroke-linecap='round'>" +
			"<path d='M100 100 L196 46' stroke-width='7'/>" +
			"<path d='M100 100 L188 92' stroke-width='4'/>" +
			"<path d='M100 100 L170 148' stroke-width='3'/>" +
			"<path d='M100 100 L118 196' stroke-width='5'/>" +
			"</g>" +
			"<circle cx='100' cy='100' r='16' fill='#ffffff' fill-opacity='.85'/>" +
			"</svg>";

		/** One shared manifest read per page: which optional assets actually exist. */
		let manifestPromise = null;
		function readAssets() {
			if (manifestPromise !== null) return manifestPromise;
			manifestPromise = fetch(ASSET_BASE + "/_manifest", { cache: "no-store" })
				.then((response) => (response.ok ? response.json() : null))
				.then((value) => (Array.isArray(value?.assets) ? value.assets : null))
				.catch(() => null);
			return manifestPromise;
		}

		async function resolveVideoSource() {
			const assets = await readAssets();
			const probe = document.createElement("video");
			const playable = (candidate) =>
				candidate.codec === undefined || probe.canPlayType(candidate.codec) !== "";
			const usable = VIDEO_CANDIDATES.filter(
				(candidate) => playable(candidate) && (assets === null || assets.includes(candidate.file)),
			);
			if (usable.length > 0) return ASSET_BASE + "/" + usable[0].file;
			// Nothing probed playable: still point at the first uploaded file so the
			// error path (and its codec diagnostic) can fire instead of staying blank.
			if (assets !== null) {
				const present = VIDEO_CANDIDATES.find((candidate) => assets.includes(candidate.file));
				return present === undefined ? null : ASSET_BASE + "/" + present.file;
			}
			return ASSET_BASE + "/" + VIDEO_CANDIDATES[0].file;
		}

		/** User's wallpaper choice: `{ kind: "video"|"image", url }`, absent = automatic. */
		// The provider cards are user-visible fixed labels: all five rows are bilingual
		// v0.5.2 copy (they used to be hardcoded Chinese except the web row).
		registerTl5Strings({
			zh: {
				"wp.local.label": "本地壁纸",
				"wp.local.desc": "assets/ 里的图片或视频",
				"wp.local.note": "把图片/视频放进 skin-tianlight/assets/，刷新页面即可",
				"wp.url.label": "URL 地址",
				"wp.url.desc": "粘贴图片/视频网址",
				"wp.url.note": "支持能直接打开的 http(s) 图片或视频地址",
				"wp.we.label": "Wallpaper Engine",
				"wp.we.desc": "读取 WE 项目目录（可选）",
				"wp.we.note": "视频/图片直接读；场景目录走内置 WebWallGL（失败自动降级）",
				"wp.web.label": "网页壁纸",
				"wp.web.desc": "WE type:web 项目，沙箱隔离",
				"wp.web.note": "在 ① 来源 → Wallpaper Engine 的清单里选择；失败会自动退回上一张",
				"wp.shader.label": "ShaderToy 代码",
				"wp.shader.desc": "GLSL 实时壁纸，可改代码",
				"wp.shader.note": "本地 GLSL 运行时：iTime / iResolution / iMouse + 速度/强度/色相；不抓取网站源码",
				"wp.layer.none": "无",
				"wp.layer.vignette": "暗角",
				"wp.layer.grain": "颗粒",
				"wp.layer.glow": "光晕",
				"wp.layer.scan": "扫描线",
				"wp.blend.normal": "正常",
				"wp.blend.overlay": "叠加",
				"wp.blend.screen": "滤色",
				"wp.blend.multiply": "正片叠底",
				"wp.shaderPreset.aurora": "极光",
				"wp.shaderPreset.nebula": "星云",
				"wp.shaderPreset.water": "水波",
				"wp.shaderPreset.audio": "音频极光",
				"wp.shaderErr.empty": "着色器源码为空",
				"wp.shaderErr.tooLong": "着色器源码太长（上限 {max} 字符）",
				"wp.shaderErr.noWebgl": "当前环境不支持 WebGL",
				"wp.shaderErr.compileFail": "片元着色器编译失败",
				"wp.shaderErr.linkFail": "着色器链接失败",
				"wp.frames.noUrl": "缺少视频地址，无法取帧",
				"wp.frames.loadFail": "视频加载失败，无法取帧",
				"wp.frames.noDuration": "视频时长无效，无法取帧",
				"wp.frames.noCanvas": "无法创建取帧画布",
				"wp.frames.cors": "视频跨域，浏览器禁止取帧；本地/WE 视频可用",
				"wp.frames.seekFail": "无法定位视频帧",
				"wp.frames.timeout": "取帧超时（视频可能仍未加载完）",
				"wp.choice.none": "没有选择壁纸",
				"wp.choice.unsupported": "不支持的壁纸类型",
				"wp.choice.noUrl": "壁纸缺少地址",
				"wp.choice.webUrl": "网页壁纸必须是宿主 _web-project 目录里的项目",
				"wp.choice.providerNote": "{label}：{note}",
			},
			en: {
				"wp.local.label": "Local wallpapers",
				"wp.local.desc": "Images or videos in assets/",
				"wp.local.note": "Drop images/videos into skin-tianlight/assets/ and reload the page",
				"wp.url.label": "URL",
				"wp.url.desc": "Paste an image/video URL",
				"wp.url.note": "Direct http(s) image or video links only",
				"wp.we.label": "Wallpaper Engine",
				"wp.we.desc": "Read WE project folders (optional)",
				"wp.we.note": "Videos/images read directly; scene folders use the bundled WebWallGL engine (automatic fallback on failure)",
				"wp.web.label": "Web wallpaper",
				"wp.web.desc": "WE type:web project, sandboxed",
				"wp.web.note": "Pick it from the ① Sources → Wallpaper Engine list; failures fall back to the previous wallpaper",
				"wp.shader.label": "ShaderToy code",
				"wp.shader.desc": "Live GLSL wallpaper, editable",
				"wp.shader.note": "Local GLSL runtime: iTime / iResolution / iMouse + speed/intensity/hue; never scrapes website source",
				"wp.layer.none": "None",
				"wp.layer.vignette": "Vignette",
				"wp.layer.grain": "Grain",
				"wp.layer.glow": "Glow",
				"wp.layer.scan": "Scanlines",
				"wp.blend.normal": "Normal",
				"wp.blend.overlay": "Overlay",
				"wp.blend.screen": "Screen",
				"wp.blend.multiply": "Multiply",
				"wp.shaderPreset.aurora": "Aurora",
				"wp.shaderPreset.nebula": "Nebula",
				"wp.shaderPreset.water": "Water",
				"wp.shaderPreset.audio": "Audio aurora",
				"wp.shaderErr.empty": "Shader source is empty",
				"wp.shaderErr.tooLong": "Shader source is too long (max {max} characters)",
				"wp.shaderErr.noWebgl": "WebGL is not available in this environment",
				"wp.shaderErr.compileFail": "Fragment shader compilation failed",
				"wp.shaderErr.linkFail": "Shader linking failed",
				"wp.frames.noUrl": "No video URL: cannot grab frames",
				"wp.frames.loadFail": "Video failed to load: cannot grab frames",
				"wp.frames.noDuration": "Invalid video duration: cannot grab frames",
				"wp.frames.noCanvas": "Cannot create the frame canvas",
				"wp.frames.cors": "Cross-origin video: the browser blocks frame grabs; local/WE videos work",
				"wp.frames.seekFail": "Cannot seek to the video frame",
				"wp.frames.timeout": "Frame grab timed out (the video may still be loading)",
				"wp.choice.none": "No wallpaper selected",
				"wp.choice.unsupported": "Unsupported wallpaper kind",
				"wp.choice.noUrl": "Wallpaper URL is missing",
				"wp.choice.webUrl": "Web wallpapers must be a project under the host _web-project route",
				"wp.choice.providerNote": "{label}: {note}",
			},
		});
		/**
		 * Wallpaper source providers. A provider is a source of frames; the scene renders
		 * video, image and the ShaderToy-style GLSL channel today. URL and ShaderToy are
		 * configured in the panel rather than listed as files.
		 *
		 * Adding one: set `available: true`, give `kind`, and teach applyWallpaper how to
		 * mount it.
		 */
		/**
		 * `label`/`desc`/`note` are getters on purpose: the panel reads those fields at
		 * render time, so a live language switch updates the source cards without the
		 * panel having to know a key. `id`/`kind`/`available` stay plain data.
		 *
		 * Full literal keys live in this map instead of being concatenated: the
		 * factory-time i18n audit can only verify literal TL_T arguments, and a
		 * concatenated prefix previously looked like a missing key (platform-core T11-E).
		 */
		const PROVIDER_KEYS = {
			local: { label: "wp.local.label", desc: "wp.local.desc", note: "wp.local.note" },
			url: { label: "wp.url.label", desc: "wp.url.desc", note: "wp.url.note" },
			we: { label: "wp.we.label", desc: "wp.we.desc", note: "wp.we.note" },
			web: { label: "wp.web.label", desc: "wp.web.desc", note: "wp.web.note" },
			shader: { label: "wp.shader.label", desc: "wp.shader.desc", note: "wp.shader.note" },
		};
		/** Full literal key or "" — an unknown id must never render a raw key. */
		const providerKey = (id, field) => {
			const entry = PROVIDER_KEYS[id];
			if (entry === undefined) return "";
			const key = entry[field];
			return typeof key === "string" ? key : "";
		};
		const providerCopy = (id, fields) => ({
			...fields,
			get label() {
				const key = providerKey(id, "label");
				return key === "" ? "" : TL_T(key);
			},
			get desc() {
				const key = providerKey(id, "desc");
				return key === "" ? "" : TL_T(key);
			},
			get note() {
				const key = providerKey(id, "note");
				return key === "" ? "" : TL_T(key);
			},
		});
		const PROVIDERS = [
			providerCopy("local", { id: "local", kind: "video", available: true }),
			providerCopy("url", { id: "url", kind: "video", available: true }),
			// Clickable: opens the project-directory editor. It is not a frame source
			// itself, so `kind` stays null and its note explains what it can and cannot do.
			providerCopy("we", { id: "we", kind: null, available: true }),
			// v0.5.0: WE projects of type "web" are a wallpaper kind, but they are picked
			// from the same WE catalog (① 来源 → Wallpaper Engine) instead of a second
			// directory editor. `available:false` keeps the card explanatory: the panel's
			// per-source tabs are owned elsewhere and must not gain a fourth tab here.
			providerCopy("web", { id: "web", kind: "web", available: false }),
			providerCopy("shader", { id: "shader", kind: "shader", available: true }),
		];
		/** Kinds the scene can actually render today. */
		const RENDERABLE_KINDS = new Set(["video", "image", "shader", "scene", "web"]);

		/* ---- A3 web wallpaper: opaque-origin sandboxed project (WE type:"web") ---- */
		/**
		 * A web wallpaper is a self-contained WE `type:"web"` project served by the
		 * host under `_web-project/`. The iframe is sandboxed WITHOUT
		 * `allow-same-origin`, so the project runs in an opaque origin: it can paint its
		 * own canvas but cannot reach this page's DOM, storage, cookies or DSH state.
		 * Only host-served URLs are accepted — an external URL would turn the
		 * wallpaper into an arbitrary network client that survives every reload.
		 *
		 * v0.6.0: the WE library host serves `type:"web"` projects under
		 * `/api/we-wallpaper/web/<id>/`; that same-origin host route is accepted too.
		 */
		const WEB_WALLPAPER_PREFIX = ASSET_BASE + "/_web-project/";
		const WE_WEB_WALLPAPER_PREFIX = "/api/we-wallpaper/web/";
		function isWebWallpaperUrl(url) {
			if (typeof url !== "string") return false;
			if (url.startsWith(WEB_WALLPAPER_PREFIX) && url.length > WEB_WALLPAPER_PREFIX.length) return true;
			return url.startsWith(WE_WEB_WALLPAPER_PREFIX) && url.length > WE_WEB_WALLPAPER_PREFIX.length;
		}
		/** Mount URL for the web iframe: host route only, no fragment, no credentials. */
		function webWallpaperSrc(url) {
			if (isWebWallpaperUrl(url) === false) return "";
			return url.split("#")[0];
		}

		/* ---- A4 dynamic resolution: stem grouping + window/DPR choice ---- */
		/**
		 * One logical wallpaper can have several encodes:
		 *   name.1080.mp4 / name.1440.mp4 / name.4k.mp4 / name-2160p.mp4
		 * The suffix is metadata, not part of the wallpaper: the user picks one card,
		 * the scene picks the encode that matches the current window, and a settled
		 * resize switches encodes without touching the saved choice.
		 */
		const VARIANT_TIERS = ["4k", "1440", "1080", "720"];
		function variantTierOf(token) {
			const value = String(token).toLowerCase();
			if (value === "4k" || value.startsWith("2160")) return "4k";
			if (value === "2k" || value.startsWith("1440")) return "1440";
			if (value.startsWith("1080")) return "1080";
			if (value.startsWith("720")) return "720";
			return null;
		}
		/** `{ stem, tier }` for a variant file name, or null when it has no suffix. */
		function parseVariantName(name) {
			if (typeof name !== "string" || name === "") return null;
			const base = name.slice(name.lastIndexOf("/") + 1).split(/[?#]/)[0];
			const dot = base.lastIndexOf(".");
			const stemPart = dot > 0 ? base.slice(0, dot) : base;
			const match = /^(.*?)[._-](2160p?|1440p?|1080p?|720p?|4k|2k)$/i.exec(stemPart);
			if (match === null) return null;
			const tier = variantTierOf(match[2]);
			const stem = match[1];
			if (tier === null || stem === "") return null;
			return { stem, tier };
		}
		/** Groups catalog items into logical wallpapers: Map<"kind:stemLower", group>. */
		function groupVariantItems(items) {
			const groups = new Map();
			if (!Array.isArray(items)) return groups;
			for (const item of items) {
				if (item === null || typeof item !== "object") continue;
				if (item.kind !== "video" && item.kind !== "image") continue;
				const parsed = parseVariantName(typeof item.url === "string" ? item.url : item.id);
				if (parsed === null || typeof item.url !== "string") continue;
				const key = item.kind + ":" + parsed.stem.toLowerCase();
				let group = groups.get(key);
				if (group === undefined) {
					group = { kind: item.kind, stem: parsed.stem, tiers: {} };
					groups.set(key, group);
				}
				if (group.tiers[parsed.tier] === undefined) group.tiers[parsed.tier] = item;
			}
			return groups;
		}
		function groupForUrl(groups, kind, url) {
			if (typeof url !== "string" || groups === null) return null;
			for (const group of groups.values()) {
				if (group.kind !== kind) continue;
				for (const tier of VARIANT_TIERS) {
					const item = group.tiers[tier];
					if (item !== undefined && item.url === url) return group;
				}
			}
			return null;
		}
		/** Window pixels decide the encode: 4K only when the device really has them. */
		function targetVariantOrder() {
			const px = (globalThis.innerWidth || 0) * (globalThis.devicePixelRatio || 1);
			if (px >= 2200) return ["4k", "1440", "1080", "720"];
			if (px >= 1400) return ["1440", "1080", "4k", "720"];
			return ["1080", "720", "1440", "4k"];
		}
		function variantTiersOf(group) {
			if (group === null || group === undefined || group.tiers === undefined) return [];
			return VARIANT_TIERS.filter((tier) => group.tiers[tier] !== undefined);
		}
		/**
		 * Best available encode of the logical wallpaper the choice points at.
		 * `null` when the URL is not a variant (single-file wallpapers stay untouched).
		 */
		function resolveVariantChoice(choice, groups) {
			if (choice === null || typeof choice !== "object") return null;
			if (choice.kind !== "video" && choice.kind !== "image") return null;
			const group = groupForUrl(groups, choice.kind, choice.url);
			if (group === null) return null;
			let picked = null;
			for (const tier of targetVariantOrder()) {
				const item = group.tiers[tier];
				if (item !== undefined) {
					picked = { item, tier };
					break;
				}
			}
			if (picked === null) return null;
			const next =
				picked.item.url === choice.url
					? choice
					: { kind: choice.kind, url: picked.item.url, ...(Number.isFinite(choice.still) ? { still: choice.still } : {}) };
			return { choice: next, tier: picked.tier, tiers: variantTiersOf(group), changed: next.url !== choice.url };
		}
		/** Human-readable target: "2560x1440@1.25" (window pixels, not media pixels). */
		function resolutionLabel() {
			const width = Math.round(globalThis.innerWidth || 0);
			const height = Math.round(globalThis.innerHeight || 0);
			const dpr = Math.round((globalThis.devicePixelRatio || 1) * 100) / 100;
			return width + "x" + height + "@" + dpr;
		}

		/**
		 * One catalog read shared by automatic selection, dynamic resolution and the
		 * frame cache: those three must not race three `_wallpapers` fetches on every
		 * switch. A 15s TTL keeps a fresh upload visible without a reload.
		 */
		const CATALOG_TTL_MS = 15000;
		let catalogPromise = null;
		let catalogCache = { at: 0, items: null };
		function readCatalog() {
			if (catalogCache.items !== null && Date.now() - catalogCache.at < CATALOG_TTL_MS) {
				return Promise.resolve(catalogCache.items);
			}
			if (catalogPromise !== null) return catalogPromise;
			catalogPromise = fetch(ASSET_BASE + "/_wallpapers", { cache: "no-store" })
				.then((response) => (response.ok ? response.json() : null))
				.then((value) => (Array.isArray(value?.items) ? value.items : null))
				.catch(() => null)
				.then((items) => {
					if (items !== null) catalogCache = { at: Date.now(), items };
					catalogPromise = null;
					return items;
				});
			return catalogPromise;
		}
		/** Drops the shared catalog snapshot (upload/transcode/WE-root change). */
		function forgetCatalog() {
			catalogCache = { at: 0, items: null };
		}
		/**
		 * Synchronous best-variant substitution from the catalog already in memory. This
		 * is what keeps rotation/panel switches from loading the wrong encode first (and
		 * then reloading it after the async resolution lands).
		 */
		function pickCachedVariant(choice) {
			if (choice === null || typeof choice !== "object" || choice.kind !== "video") return choice;
			const items = catalogCache.items;
			if (items === null) return choice;
			const resolved = resolveVariantChoice(choice, groupVariantItems(items));
			return resolved === null ? choice : resolved.choice;
		}

		/**
		 * Validates a choice before it reaches the scene. Returns the reason instead of
		 * silently doing nothing, so an unsupported provider is visible in the UI.
		 */
		function resolveWallpaperChoice(choice) {
			if (choice === null || typeof choice !== "object") return { ok: false, reason: TL_T("wp.choice.none") };
			if (!RENDERABLE_KINDS.has(choice.kind)) {
				const provider = PROVIDERS.find((entry) => entry.kind === choice.kind);
				return {
					ok: false,
					reason:
						provider === undefined
							? TL_T("wp.choice.unsupported")
							: TL_T("wp.choice.providerNote", { label: provider.label, note: provider.note }),
				};
			}
			if (typeof choice.url !== "string" || choice.url === "") return { ok: false, reason: TL_T("wp.choice.noUrl") };
			if (choice.kind === "web" && isWebWallpaperUrl(choice.url) === false) {
				return { ok: false, reason: TL_T("wp.choice.webUrl") };
			}
			const still =
				choice.kind === "video" && Number.isFinite(choice.still) && choice.still >= 0 ? choice.still : undefined;
			return { ok: true, choice: { kind: choice.kind, url: choice.url, ...(still === undefined ? {} : { still }) } };
		}

		/** Live scene playback hook, used by the low-power supervisor. */
		let scenePlayback = null;
		const WALLPAPER_KEY = "tianlight.wallpaper";
		/** Live scene hook, so the panel can swap the wallpaper without a reload. */
		let wallpaperController = null;

		function readWallpaperChoice() {
			try {
				const raw = globalThis.localStorage.getItem(WALLPAPER_KEY);
				if (raw === null || raw === "") return null;
				const parsed = JSON.parse(raw);
				if (parsed === null || typeof parsed !== "object") return null;
				if (typeof parsed.url !== "string" || parsed.url === "") return null;
				const kind =
					parsed.kind === "image"
						? "image"
						: parsed.kind === "shader"
							? "shader"
							: parsed.kind === "scene"
								? "scene"
								: parsed.kind === "web"
									? "web"
									: "video";
				const still = kind === "video" && Number.isFinite(parsed.still) && parsed.still >= 0 ? parsed.still : undefined;
				return { kind, url: parsed.url, ...(still === undefined ? {} : { still }) };
			} catch {
				return null;
			}
		}

		function saveWallpaperChoice(choice) {
			try {
				if (choice === null) globalThis.localStorage.removeItem(WALLPAPER_KEY);
				else globalThis.localStorage.setItem(WALLPAPER_KEY, JSON.stringify(choice));
			} catch {
				// storage may be blocked; the scene still switches for this session
			}
		}

		/**
		 * Wallpaper overlay stack (v2: two CSS-only slots). No media decode and no
		 * timers; the scene divs are painted from this model and the panel edits it.
		 * A v1 single-object value still loads as slot A.
		 */
		const LAYERS_KEY = "tianlight.layers";
		const LAYER_PRESETS = ["none", "vignette", "grain", "glow", "scan"];
		const LAYER_BLENDS = ["normal", "overlay", "screen", "multiply"];
		const LAYER_FITS = ["cover", "contain", "stretch"];
		// Getters, not frozen strings: the panel reads Object.entries(...) per render, so
		// a live language switch re-labels the overlay controls without a reload.
		const LAYER_LABELS = {
			get none() {
				return TL_T("wp.layer.none");
			},
			get vignette() {
				return TL_T("wp.layer.vignette");
			},
			get grain() {
				return TL_T("wp.layer.grain");
			},
			get glow() {
				return TL_T("wp.layer.glow");
			},
			get scan() {
				return TL_T("wp.layer.scan");
			},
		};
		const LAYER_BLEND_LABELS = {
			get normal() {
				return TL_T("wp.blend.normal");
			},
			get overlay() {
				return TL_T("wp.blend.overlay");
			},
			get screen() {
				return TL_T("wp.blend.screen");
			},
			get multiply() {
				return TL_T("wp.blend.multiply");
			},
		};
		const LAYER_SLOT_DEFAULTS = { kind: "none", preset: "none", url: "", fit: "cover", opacity: 0.55, blend: "normal" };
		function defaultLayerSlot() {
			return { ...LAYER_SLOT_DEFAULTS };
		}
		function normalizeLayerSlot(value) {
			const slot = defaultLayerSlot();
			if (value === null || typeof value !== "object") return slot;
			if (value.kind === "none" || value.kind === "preset" || value.kind === "image") slot.kind = value.kind;
			else if (value.kind === undefined && typeof value.preset === "string") slot.kind = value.preset === "none" ? "none" : "preset";
			if (LAYER_PRESETS.includes(value.preset)) slot.preset = value.preset;
			if (typeof value.url === "string") slot.url = value.url;
			if (LAYER_FITS.includes(value.fit)) slot.fit = value.fit;
			if (LAYER_BLENDS.includes(value.blend)) slot.blend = value.blend;
			if (Number.isFinite(value.opacity)) slot.opacity = Math.min(1, Math.max(0, value.opacity));
			return slot;
		}
		function normalizeLayers(value) {
			const slots = [defaultLayerSlot(), defaultLayerSlot()];
			if (Array.isArray(value)) {
				slots[0] = normalizeLayerSlot(value[0]);
				slots[1] = normalizeLayerSlot(value[1]);
			} else if (value !== null && typeof value === "object") {
				if (Array.isArray(value.slots)) {
					slots[0] = normalizeLayerSlot(value.slots[0]);
					slots[1] = normalizeLayerSlot(value.slots[1]);
				} else {
					// v1: one overlay object.
					slots[0] = normalizeLayerSlot(value);
				}
			}
			return { version: 2, slots };
		}
		function readLayers() {
			try {
				const raw = JSON.parse(globalThis.localStorage.getItem(LAYERS_KEY) ?? "null");
				return normalizeLayers(raw);
			} catch {
				return normalizeLayers(null);
			}
		}
		function saveLayers(value) {
			try {
				globalThis.localStorage.setItem(LAYERS_KEY, JSON.stringify(value));
			} catch {
				// storage may be blocked; the overlay still applies for this session
			}
		}
		function paintOverlay(div, slot) {
			if (div === null || div === undefined) return;
			div.removeAttribute("data-tl-overlay-preset");
			div.removeAttribute("data-tl-overlay-image");
			div.style.removeProperty("background-image");
			div.style.removeProperty("background-size");
			div.style.setProperty("--tl-overlay-opacity", "0.55");
			div.style.setProperty("--tl-overlay-blend", "normal");
			div.style.display = "none";
			if (slot === null || slot.kind === "none") return;
			div.style.setProperty("--tl-overlay-opacity", String(slot.opacity));
			div.style.setProperty("--tl-overlay-blend", slot.blend);
			if (slot.kind === "image" && slot.url !== "") {
				div.setAttribute("data-tl-overlay-image", "");
				div.style.backgroundImage = 'url("' + slot.url.replace(/["\\)]/g, "") + '")';
				div.style.backgroundSize = slot.fit === "contain" ? "contain" : slot.fit === "stretch" ? "100% 100%" : "cover";
				div.style.display = "block";
				return;
			}
			if (slot.kind === "preset" && slot.preset !== "none") {
				div.setAttribute("data-tl-overlay-preset", slot.preset);
				div.style.display = "block";
			}
		}
		function applyLayers(scene, value) {
			if (scene === null || scene === undefined) return;
			const slots = Array.isArray(value?.slots) ? value.slots : [];
			paintOverlay(scene.querySelector('[data-tl-overlay-slot="0"]'), slots[0] ?? null);
			paintOverlay(scene.querySelector('[data-tl-overlay-slot="1"]'), slots[1] ?? null);
		}
		const layerController = {
			read: readLayers,
			apply: (value) => {
				const clean = normalizeLayers(value);
				saveLayers(clean);
				applyLayers(document.querySelector("[data-tl-scene]"), clean);
				return clean;
			},
		};

		/**
		 * Video playback preferences. Speed and mirroring are safe CSS/media properties;
		 * they do not add a second decoder and do not cap the source frame rate.
		 */
		const PLAYBACK_KEY = "tianlight.playback";
		const PLAYBACK_SPEEDS = [0.5, 1, 1.25, 1.5];
		const FILTER_DEFAULTS = { on: false, brightness: 100, contrast: 100, saturate: 100 };
		const PLAYBACK_DEFAULTS = { speed: 1, flip: false, paused: false, filter: { ...FILTER_DEFAULTS } };
		function normalizeFilter(value) {
			const filter = { ...FILTER_DEFAULTS };
			if (value === null || typeof value !== "object") return filter;
			if (value.on === true) filter.on = true;
			for (const key of ["brightness", "contrast", "saturate"]) {
				const number = Number(value[key]);
				if (Number.isFinite(number)) filter[key] = Math.min(150, Math.max(50, Math.round(number)));
			}
			return filter;
		}
		function normalizePlayback(value) {
			const model = { ...PLAYBACK_DEFAULTS, filter: { ...FILTER_DEFAULTS } };
			if (value !== null && typeof value === "object") {
				if (PLAYBACK_SPEEDS.includes(value.speed)) model.speed = value.speed;
				if (typeof value.flip === "boolean") model.flip = value.flip;
				if (typeof value.paused === "boolean") model.paused = value.paused;
				model.filter = normalizeFilter(value.filter);
			}
			return model;
		}
		function readPlayback() {
			try {
				return normalizePlayback(JSON.parse(globalThis.localStorage.getItem(PLAYBACK_KEY) ?? "null"));
			} catch {
				return normalizePlayback(null);
			}
		}
		function applyPlayback(scene, value) {
			const video = scene === null || scene === undefined ? null : scene.querySelector("video");
			if (video !== null) {
				try {
					video.playbackRate = value.speed;
				} catch {
					// some browsers refuse rate changes before metadata; retry on play
				}
				if (value.flip) video.style.transform = "scaleX(-1) translateZ(0)";
				else video.style.removeProperty("transform");
			}
			if (scene === null || scene === undefined) return;
			const filter = value.filter;
			scene.style.setProperty("--tl-f-brightness", String(filter.brightness / 100));
			scene.style.setProperty("--tl-f-contrast", String(filter.contrast / 100));
			scene.style.setProperty("--tl-f-saturate", String(filter.saturate / 100));
			// The attribute gates the CSS filter: at neutral values no filter path is
			// created at all, which is what keeps an unfiltered wallpaper at full rate.
			if (filter.on) scene.setAttribute("data-tl-filter", "");
			else scene.removeAttribute("data-tl-filter");
		}
		const playbackController = {
			read: readPlayback,
			apply: (value) => {
				const clean = normalizePlayback(value);
				try {
					globalThis.localStorage.setItem(PLAYBACK_KEY, JSON.stringify(clean));
				} catch {
					// persistence is optional
				}
				applyPlayback(document.querySelector("[data-tl-scene]"), clean);
				// A persisted pause is authoritative: one place decides both the DOM and
				// the saved flag, so the panel toggle can never disagree with a reload.
				if (scenePlayback !== null) {
					if (clean.paused) scenePlayback.pause("user");
					else scenePlayback.resume();
				}
				return clean;
			},
		};

		/**
		 * Live playback status, shared by the scene and the panel. Settings have
		 * controllers because they persist; this is ephemeral runtime truth, so it gets
		 * a tiny broadcast bus instead. A closed panel costs one Set lookup; an open one
		 * never has to poll the DOM to know whether the wallpaper is actually moving.
		 *
		 * Status vocabulary (deliberately small, the panel maps each to one sentence):
		 *   idle      nothing selected
		 *   loading   fetching/decoding; no frame yet
		 *   ready     frame available, not (yet) moving
		 *   playing   frames are reaching the screen
		 *   paused    paused on purpose (user or visibility)
		 *   blocked   the browser refused autoplay; a gesture will unlock it
		 *   stalled   playing was requested but no frame arrived for a while
		 *   still     a static frame is pinned
		 *   lowpower  the low-power supervisor parked playback
		 *   hidden    the page is hidden
		 *   error     decode/play failure (reason carries the codec/error name)
		 */
		let sceneStatus = { status: "idle", reason: "", fps: 0, jitter: 0 };
		const sceneStatusSubscribers = new Set();
		function publishSceneStatus(patch) {
			const next = { ...sceneStatus, ...patch };
			if (
				next.status === sceneStatus.status &&
				next.reason === sceneStatus.reason &&
				next.fps === sceneStatus.fps &&
				next.jitter === sceneStatus.jitter
			) {
				return;
			}
			sceneStatus = next;
			for (const subscriber of [...sceneStatusSubscribers]) {
				try {
					subscriber(next);
				} catch (error) {
					note("status:subscriber", error);
				}
			}
		}
		const sceneStatusController = {
			read: () => sceneStatus,
			subscribe: (listener) => {
				if (typeof listener !== "function") return () => {};
				sceneStatusSubscribers.add(listener);
				listener(sceneStatus);
				return () => {
					sceneStatusSubscribers.delete(listener);
				};
			},
		};

		/**
		 * Per-wallpaper library metadata: favourite flag and free-form tags, keyed by
		 * URL. UI-only state, so it never enters a recipe. Every write goes through this
		 * controller; the panel never touches localStorage directly.
		 */
		const LIBRARY_KEY = "tianlight.library";
		const LIBRARY_TAG_LENGTH = 12;
		const LIBRARY_TAG_MAX = 6;

		function readLibrary() {
			const model = { items: {} };
			try {
				const raw = JSON.parse(globalThis.localStorage.getItem(LIBRARY_KEY) ?? "null");
				const stored = raw === null || typeof raw !== "object" ? null : raw.items;
				if (stored === null || typeof stored !== "object") return model;
				for (const [url, entry] of Object.entries(stored)) {
					// A hand-edited library could carry a prototype key; skip the three that
					// would mutate Object.prototype when assigned onto a plain object.
					if (url === "__proto__" || url === "constructor" || url === "prototype") continue;
					if (typeof url !== "string" || url === "" || entry === null || typeof entry !== "object") continue;
					const tags = Array.isArray(entry.tags)
						? [...new Set(
								entry.tags
									.filter((tag) => typeof tag === "string")
									.map((tag) => tag.trim().slice(0, LIBRARY_TAG_LENGTH))
									.filter((tag) => tag !== ""),
							)].slice(0, LIBRARY_TAG_MAX)
						: [];
					model.items[url] = { favorite: entry.favorite === true, tags, hidden: entry.hidden === true };
				}
			} catch {
				// a corrupt library must not stop the panel
			}
			return model;
		}

		const wallpaperLibraryController = {
			read: readLibrary,
			write: (model) => {
				try {
					globalThis.localStorage.setItem(LIBRARY_KEY, JSON.stringify(model));
				} catch {
					// persistence is optional; filtering still works for this session
				}
			},
		};

		/**
		 * Automatic rotation. The saved model is tiny (on / order / interval / scope);
		 * the runtime lives inside the scene and is created with it, because only the
		 * scene knows the current source and can apply the next one without a reload.
		 *
		 * Rules that keep it from fighting the user:
		 *   - it never runs in a hidden tab, under low power, or while playback is
		 *     paused on purpose;
		 *   - it skips the wallpaper that is currently showing;
		 *   - hidden wallpapers and (optionally) anything not favourited are excluded;
		 *   - the next source is prepared first, then applied, so a slow/broken file is
		 *     skipped instead of becoming a blank frame.
		 */
		const ROTATION_KEY = "tianlight.rotation";
		const ROTATION_INTERVALS = [30, 60, 120, 300, 600];
		const ROTATION_DEFAULTS = { on: false, order: "sequence", interval: 120, favoritesOnly: false };
		function normalizeRotation(value) {
			const model = { ...ROTATION_DEFAULTS };
			if (value === null || typeof value !== "object") return model;
			if (typeof value.on === "boolean") model.on = value.on;
			if (value.order === "random" || value.order === "sequence") model.order = value.order;
			if (Number.isFinite(value.interval) && ROTATION_INTERVALS.includes(value.interval)) model.interval = value.interval;
			if (typeof value.favoritesOnly === "boolean") model.favoritesOnly = value.favoritesOnly;
			return model;
		}
		function readRotation() {
			try {
				return normalizeRotation(JSON.parse(globalThis.localStorage.getItem(ROTATION_KEY) ?? "null"));
			} catch {
				return normalizeRotation(null);
			}
		}
		let rotationRuntime = null;
		const rotationSubscribers = new Set();
		const rotationObservers = new Set();
		function notifyRotation(choice) {
			for (const listener of [...rotationObservers]) {
				try {
					listener(choice);
				} catch (error) {
					note("rotation:observer", error);
				}
			}
		}
		const rotationController = {
			read: readRotation,
			apply: (value) => {
				const clean = normalizeRotation(value);
				try {
					globalThis.localStorage.setItem(ROTATION_KEY, JSON.stringify(clean));
				} catch {
					// persistence is optional; rotation still runs this session
				}
				for (const listener of [...rotationSubscribers]) {
					try {
						listener(clean);
					} catch (error) {
						note("rotation:subscriber", error);
					}
				}
				if (rotationRuntime !== null) rotationRuntime.sync(clean);
				return clean;
			},
			subscribe: (listener) => {
				if (typeof listener !== "function") return () => {};
				rotationSubscribers.add(listener);
				listener(readRotation());
				return () => {
					rotationSubscribers.delete(listener);
				};
			},
			/** Notified with the choice that actually reached the scene. */
			observe: (listener) => {
				if (typeof listener !== "function") return () => {};
				rotationObservers.add(listener);
				return () => {
					rotationObservers.delete(listener);
				};
			},
		};

		/**
		 * Warms the next source before the switch. Images decode once; videos only
		 * fetch metadata, because preloading a 4K file would compete with the video
		 * that is currently on screen for bandwidth and decoder time.
		 */
		function prepareWallpaper(choice) {
			if (choice === null || typeof choice !== "object") return Promise.resolve(false);
			if (choice.kind === "image") {
				return new Promise((resolve) => {
					let settled = false;
					const image = new Image();
					let timer = 0;
					const finish = (value) => {
						if (settled) return;
						settled = true;
						if (timer !== 0) window.clearTimeout(timer);
						image.onload = null;
						image.onerror = null;
						resolve(value);
					};
					image.onload = () => finish(image.naturalWidth > 0);
					image.onerror = () => finish(false);
					image.src = choice.url;
					timer = window.setTimeout(() => finish(false), 5000);
				});
			}
			return new Promise((resolve) => {
				let settled = false;
				const video = document.createElement("video");
				let timer = 0;
				const finish = (value) => {
					if (settled) return;
					settled = true;
					if (timer !== 0) window.clearTimeout(timer);
					video.onloadedmetadata = null;
					video.onerror = null;
					video.removeAttribute("src");
					try {
						video.load();
					} catch {
						// detaching a probe is best effort
					}
					resolve(value);
				};
				video.muted = true;
				video.preload = "metadata";
				video.playsInline = true;
				video.onloadedmetadata = () => finish(true);
				video.onerror = () => finish(false);
				timer = window.setTimeout(() => finish(false), 5000);
				video.src = choice.url;
			});
		}

		/**
		 * URL type probe for extensionless / signed links. Image first (cheap), then
		 * video metadata. Returns null when neither is directly loadable, so the panel
		 * can say "this is not a direct media link" instead of swapping to a broken
		 * wallpaper and falling back.
		 */
		function probeUrlKind(url) {
			if (typeof document === "undefined" || typeof url !== "string" || url === "") return Promise.resolve(null);
			return new Promise((resolve) => {
				let settled = false;
				const image = new Image();
				let timer = 0;
				const finish = (kind) => {
					if (settled) return;
					settled = true;
					if (timer !== 0) window.clearTimeout(timer);
					image.onload = null;
					image.onerror = null;
					if (kind !== null) {
						resolve(kind);
						return;
					}
					// Not an image: try video metadata before giving up.
					let videoSettled = false;
					const video = document.createElement("video");
					let videoTimer = 0;
					const done = (value) => {
						if (videoSettled) return;
						videoSettled = true;
						if (videoTimer !== 0) window.clearTimeout(videoTimer);
						video.onloadedmetadata = null;
						video.onerror = null;
						video.removeAttribute("src");
						try {
							video.load();
						} catch {
							// detaching a probe is best effort
						}
						resolve(value);
					};
					video.muted = true;
					video.preload = "metadata";
					video.playsInline = true;
					video.onloadedmetadata = () => done("video");
					video.onerror = () => done(null);
					videoTimer = window.setTimeout(() => done(null), 5000);
					video.src = url;
				};
				image.onload = () => finish("image");
				image.onerror = () => finish(null);
				timer = window.setTimeout(() => finish(null), 6000);
				image.src = url;
			});
		}

		/**
		 * Scene-owned rotation loop. `list`/`apply`/`current`/`isStill` are injected so
		 * this stays testable and never reaches into the scene's private state.
		 */
		function createRotationRuntime(options) {
			let model = normalizeRotation(options.model);
			let timer = 0;
			// Start the countdown at mount: enabling rotation on a saved profile should
			// not swap the wallpaper one tick after the page opens.
			let lastSwitch = performance.now();
			let cursor = -1;
			let busy = false;
			const pick = async () => {
				if (model.on === false || busy) return;
				if (document.hidden) return;
				if (document.body !== null && document.body.hasAttribute("data-tl-lowpower")) return;
				if (readPlayback().paused) return;
				if (options.isStill()) return;
				if (performance.now() - lastSwitch < model.interval * 1000) return;
				busy = true;
				try {
					const items = await options.list();
					if (items === null) return;
					const library = readLibrary();
					const current = options.current();
					const currentUrl = current === null ? "" : current.url;
					const candidates = items.filter((item) => {
						if (item.kind !== "video" && item.kind !== "image") return false;
						if (item.url === currentUrl) return false;
						const meta = library.items[item.url];
						if (meta !== undefined && meta.hidden === true) return false;
						if (model.favoritesOnly && (meta === undefined || meta.favorite !== true)) return false;
						return true;
					});
					if (candidates.length === 0) return;
					const choice =
						model.order === "random"
							? candidates[Math.floor(Math.random() * candidates.length)]
							: candidates[(cursor + 1) % candidates.length];
					if (model.order === "sequence") cursor = candidates.indexOf(choice);
					const ok = await options.prepare({ kind: choice.kind, url: choice.url });
					if (ok !== true) {
						note("rotation:prepare-failed", choice.url);
						return;
					}
					options.apply({ kind: choice.kind, url: choice.url });
					lastSwitch = performance.now();
					notifyRotation(choice);
				} catch (error) {
					note("rotation:pick", error);
				} finally {
					busy = false;
				}
			};
			timer = window.setInterval(() => void pick(), 2000);
			return {
				sync: (next) => {
					model = normalizeRotation(next);
					lastSwitch = performance.now();
					cursor = -1;
				},
				stop: () => {
					if (timer !== 0) window.clearInterval(timer);
					timer = 0;
				},
			};
		}

		/* ---- ShaderToy-style wallpaper: settings, presets, validation, renderer ---- */
		const SHADER_KEY = "tianlight.shader";
		const SHADER_SOURCE_MAX = 12000;
		/** GLSL ES 1.0 (WebGL1) is the broadest target for a fragment wallpaper. */
		const SHADER_VERTEX = [
			"attribute vec2 a_position;",
			"void main() {",
			"  gl_Position = vec4(a_position, 0.0, 1.0);",
			"}",
		].join("\n");
		const SHADER_SOURCES = {
			aurora: [
				"precision highp float;",
				"uniform vec3 iResolution;",
				"uniform float iTime;",
				"uniform vec4 iMouse;",
				"uniform float u_speed;",
				"uniform float u_intensity;",
				"uniform float u_hue;",
				"void main() {",
				"  vec2 uv = gl_FragCoord.xy / iResolution.xy;",
				"  float t = iTime * u_speed;",
				"  float ribbon = sin(uv.y * 5.0 + t * 0.7 + sin(uv.x * 3.5 - t * 0.4) * 0.8);",
				"  float glow = smoothstep(0.15, 0.95, ribbon * 0.5 + 0.5);",
				"  float h = u_hue + 0.10 * glow + 0.04 * sin(uv.x * 6.0 + t * 0.3);",
				"  vec3 col = 0.5 + 0.5 * cos(6.28318 * (h + vec3(0.0, 0.33, 0.67)));",
				"  col *= 0.45 + 0.55 * glow;",
				"  col += u_intensity * 0.12 * vec3(0.15, 0.45, 0.9) * smoothstep(0.0, 1.0, uv.y);",
				"  gl_FragColor = vec4(col, 1.0);",
				"}",
			].join("\n"),
			nebula: [
				"precision highp float;",
				"uniform vec3 iResolution;",
				"uniform float iTime;",
				"uniform vec4 iMouse;",
				"uniform float u_speed;",
				"uniform float u_intensity;",
				"uniform float u_hue;",
				"void main() {",
				"  vec2 uv = (gl_FragCoord.xy - 0.5 * iResolution.xy) / min(iResolution.x, iResolution.y);",
				"  float t = iTime * u_speed;",
				"  float r = length(uv + vec2(sin(t * 0.3) * 0.15, cos(t * 0.23) * 0.12));",
				"  float rings = sin(r * 12.0 - t * 1.6) * 0.5 + 0.5;",
				"  float haze = exp(-r * 2.2);",
				"  float h = u_hue + rings * 0.12 + haze * 0.10;",
				"  vec3 col = 0.5 + 0.5 * cos(6.28318 * (h + vec3(0.0, 0.33, 0.67)));",
				"  col *= haze * 1.35 + rings * 0.25;",
				"  col += u_intensity * 0.10 * vec3(0.4, 0.25, 0.8);",
				"  gl_FragColor = vec4(col, 1.0);",
				"}",
			].join("\n"),
			water: [
				"precision highp float;",
				"uniform vec3 iResolution;",
				"uniform float iTime;",
				"uniform vec4 iMouse;",
				"uniform float u_speed;",
				"uniform float u_intensity;",
				"uniform float u_hue;",
				"void main() {",
				"  vec2 uv = gl_FragCoord.xy / iResolution.xy;",
				"  float t = iTime * u_speed;",
				"  float wave = sin(uv.x * 18.0 + t * 1.4 + sin(uv.y * 7.0 + t * 0.6) * 1.2);",
				"  float shimmer = pow(0.5 + 0.5 * wave, 3.0);",
				"  float h = u_hue + 0.06 * sin(uv.y * 4.0 + t * 0.5) + shimmer * 0.04;",
				"  vec3 col = 0.5 + 0.5 * cos(6.28318 * (h + vec3(0.0, 0.28, 0.58)));",
				"  col *= 0.35 + 0.65 * shimmer;",
				"  col += u_intensity * 0.10 * vec3(0.35, 0.6, 0.9) * smoothstep(0.0, 1.0, uv.y);",
				"  gl_FragColor = vec4(col, 1.0);",
				"}",
			].join("\n"),
			audio: [
				"precision highp float;",
				"uniform vec3 iResolution;",
				"uniform float iTime;",
				"uniform vec4 iMouse;",
				"uniform float u_speed;",
				"uniform float u_intensity;",
				"uniform float u_hue;",
				"uniform float u_audio;",
				"void main() {",
				"  vec2 uv = gl_FragCoord.xy / iResolution.xy;",
				"  float t = iTime * u_speed;",
				"  float level = clamp(u_audio, 0.0, 1.0);",
				"  float bands = sin(uv.y * 9.0 - t * 0.8) * 0.5 + 0.5;",
				"  float ripple = smoothstep(0.0, 1.0, 0.5 + 0.5 * sin(uv.x * 12.0 - t * 1.2 + level * 3.0));",
				"  float h = u_hue + level * 0.22 + ripple * 0.08;",
				"  vec3 col = 0.5 + 0.5 * cos(6.28318 * (h + vec3(0.0, 0.33, 0.67)));",
				"  col *= 0.28 + 0.55 * bands + 0.45 * level;",
				"  col += u_intensity * 0.16 * level * vec3(0.3, 0.6, 1.0);",
				"  gl_FragColor = vec4(col, 1.0);",
				"}",
			].join("\n"),
		};
		// Literal label keys (see PROVIDER_KEYS): the prefix is never concatenated, so
		// the factory-time i18n audit sees real full keys only.
		const SHADER_PRESET_KEYS = {
			aurora: "wp.shaderPreset.aurora",
			nebula: "wp.shaderPreset.nebula",
			water: "wp.shaderPreset.water",
			audio: "wp.shaderPreset.audio",
		};
		/** Full literal key or "" — an unknown preset id must never render a raw key. */
		const shaderPresetKey = (id) => {
			const key = SHADER_PRESET_KEYS[id];
			return typeof key === "string" ? key : "";
		};
		const shaderPreset = (id, source) => ({
			id,
			source,
			get label() {
				const key = shaderPresetKey(id);
				return key === "" ? "" : TL_T(key);
			},
		});
		const SHADER_PRESETS = [
			shaderPreset("aurora", SHADER_SOURCES.aurora),
			shaderPreset("nebula", SHADER_SOURCES.nebula),
			shaderPreset("water", SHADER_SOURCES.water),
			shaderPreset("audio", SHADER_SOURCES.audio),
		];
		const SHADER_DEFAULTS = {
			preset: "aurora",
			source: SHADER_SOURCES.aurora,
			speed: 1,
			intensity: 1,
			hue: 0.58,
		};
		const clampNumber = (value, min, max, fallback) => {
			const number = Number(value);
			if (!Number.isFinite(number)) return fallback;
			return Math.min(max, Math.max(min, number));
		};
		function readShaderSettings() {
			const model = { ...SHADER_DEFAULTS };
			try {
				const raw = JSON.parse(globalThis.localStorage.getItem(SHADER_KEY) ?? "null");
				if (raw !== null && typeof raw === "object") {
					if (typeof raw.source === "string" && raw.source.trim() !== "" && raw.source.length <= SHADER_SOURCE_MAX) {
						model.source = raw.source;
						model.preset = typeof raw.preset === "string" ? raw.preset : "custom";
					}
					model.speed = clampNumber(raw.speed, 0.1, 3, model.speed);
					model.intensity = clampNumber(raw.intensity, 0, 2, model.intensity);
					model.hue = clampNumber(raw.hue, 0, 1, model.hue);
				}
			} catch {
				// a corrupt shader setting must not stop the wallpaper
			}
			return model;
		}
		const shaderController = {
			read: readShaderSettings,
			save: (settings) => {
				try {
					globalThis.localStorage.setItem(SHADER_KEY, JSON.stringify(settings));
				} catch {
					// persistence is optional; the scene still uses the live settings
				}
			},
		};

		/**
		 * Audio response v1: microphone -> AnalyserNode -> u_audio. Explicit opt-in only;
		 * nothing is recorded, stored or uploaded, and the stream/context are released on
		 * stop, panel close, low-power, wallpaper switch and page hide.
		 */
		let audioActive = false;
		let audioBusy = false;
		let audioReason = "";
		let audioToken = 0;
		let audioContext = null;
		let audioStream = null;
		let audioSource = null;
		let audioAnalyser = null;
		let audioData = null;
		let audioLevel = 0;
		let audioSubscriber = null;
		/** "mic" (v1, shader-gated) or "system" (v2 loopback); "" when idle. */
		let audioMode = "";
		/** Machine-readable last outcome: unsupported | denied | no-device | busy | hidden | lowpower | cancelled. */
		let audioFailure = "";

		function audioState() {
			return { active: audioActive, busy: audioBusy, reason: audioReason, mode: audioMode, code: audioFailure };
		}
		/** What the browser can even attempt; the panel uses it to hide dead buttons. */
		function audioSupport() {
			const media = globalThis.navigator?.mediaDevices;
			return {
				mic: media !== undefined && media !== null && typeof media.getUserMedia === "function",
				display: media !== undefined && media !== null && typeof media.getDisplayMedia === "function",
				webaudio: typeof (globalThis.AudioContext ?? globalThis.webkitAudioContext) === "function",
			};
		}
		function notifyAudio() {
			if (audioSubscriber !== null) audioSubscriber(audioState());
		}
		function releaseAudio() {
			if (audioAnalyser !== null) {
				try {
					audioAnalyser.disconnect();
				} catch {
					// already disconnected
				}
			}
			if (audioSource !== null) {
				try {
					audioSource.disconnect();
				} catch {
					// already disconnected
				}
			}
			if (audioContext !== null) {
				try {
					void audioContext.close();
				} catch {
					// closing is best effort
				}
			}
			if (audioStream !== null) {
				for (const track of audioStream.getTracks()) {
					try {
						track.stop();
					} catch {
						// a stopped track must not keep the mic alive
					}
				}
			}
			document.removeEventListener("visibilitychange", onAudioVisibility);
			audioContext = null;
			audioStream = null;
			audioSource = null;
			audioAnalyser = null;
			audioData = null;
			audioLevel = 0;
		}
		function stopAudio(reason) {
			const wasActive = audioActive || audioBusy || audioContext !== null || audioStream !== null;
			if (!wasActive) return;
			audioToken += 1;
			audioActive = false;
			audioBusy = false;
			audioMode = "";
			audioFailure = "";
			audioReason = typeof reason === "string" ? reason : "";
			releaseAudio();
			notifyAudio();
		}
		function onAudioVisibility() {
			if (document.hidden) stopAudio(TL_T("audio.stopHidden"));
		}
		/**
		 * Both capture paths (mic v1, system loopback v2) share ONE visibility listener.
		 * Registering an identical listener twice is a no-op per DOM spec, so this is
		 * idempotent; `releaseAudio` owns the single matching removal.
		 */
		function bindAudioVisibility() {
			document.addEventListener("visibilitychange", onAudioVisibility);
		}
		/**
		 * One error taxonomy for both capture paths, so the panel can show an honest
		 * sentence for each of the three A1 outcomes: unsupported / denied / no device.
		 */
		function audioFailureOf(error, source) {
			const name = error !== null && error !== undefined ? String(error.name ?? "") : "";
			const system = source === "system";
			if (name === "NotAllowedError" || name === "PermissionDeniedError" || name === "SecurityError" || name === "AbortError") {
				return { code: "denied", reason: TL_T(system ? "audio.denied" : "audio.micDenied") };
			}
			if (name === "NotFoundError" || name === "DevicesNotFoundError" || name === "OverconstrainedError" || name === "NotReadableError") {
				return { code: "no-device", reason: TL_T(system ? "audio.noDevice" : "audio.micMissing") };
			}
			if (name === "NotSupportedError" || name === "TypeError") {
				return { code: "unsupported", reason: TL_T("audio.unsupported") };
			}
			const message = error !== null && error !== undefined && error.message ? String(error.message) : TL_T("audio.unknownError");
			return { code: "failed", reason: TL_T(system ? "audio.failedSystem" : "audio.failedMic", { reason: message }) };
		}
		async function startAudio() {
			if (audioActive) return { ok: true };
			if (audioBusy) return { ok: false, reason: TL_T("audio.micBusy") };
			if (document.querySelector("[data-tl-scene][data-tl-shader-on]") === null) {
				return { ok: false, reason: TL_T("audio.micNeedsShader") };
			}
			if (document.body !== null && document.body.hasAttribute("data-tl-lowpower")) {
				return { ok: false, reason: TL_T("audio.lowpower") };
			}
			if (document.hidden) return { ok: false, reason: TL_T("audio.hiddenPage") };
			const media = globalThis.navigator?.mediaDevices;
			if (media === undefined || media === null || typeof media.getUserMedia !== "function") {
				return { ok: false, reason: TL_T("audio.micUnsupported") };
			}
			const Context = globalThis.AudioContext ?? globalThis.webkitAudioContext;
			if (typeof Context !== "function") {
				return { ok: false, reason: TL_T("audio.webaudioUnsupported") };
			}
			const token = audioToken + 1;
			audioToken = token;
			audioBusy = true;
			audioReason = "";
			notifyAudio();
			let stream = null;
			let context = null;
			try {
				stream = await media.getUserMedia({ audio: true });
				if (token !== audioToken) {
					for (const track of stream.getTracks()) {
						try {
							track.stop();
						} catch {
							// cancelled start must release the mic
						}
					}
					return { ok: false, reason: TL_T("audio.cancelled") };
				}
				context = new Context();
				const source = context.createMediaStreamSource(stream);
				const analyser = context.createAnalyser();
				analyser.fftSize = 1024;
				analyser.smoothingTimeConstant = 0.75;
				source.connect(analyser);
				await context.resume();
				if (token !== audioToken) {
					for (const track of stream.getTracks()) {
						try {
							track.stop();
						} catch {
							// cancelled start must release the mic
						}
					}
					try {
						void context.close();
					} catch {
						// closing is best effort
					}
					return { ok: false, reason: TL_T("audio.cancelled") };
				}
				audioStream = stream;
				audioContext = context;
				audioSource = source;
				audioAnalyser = analyser;
				audioData = new Uint8Array(analyser.fftSize);
				audioActive = true;
				audioBusy = false;
				audioMode = "mic";
				audioFailure = "";
				audioReason = "";
				audioLevel = 0;
				bindAudioVisibility();
				notifyAudio();
				return { ok: true, mode: "mic" };
			} catch (error) {
				for (const track of stream?.getTracks() ?? []) {
					try {
						track.stop();
					} catch {
						// a failed start must release the mic
					}
				}
				try {
					void context?.close();
				} catch {
					// closing is best effort
				}
				releaseAudio();
				if (token === audioToken) {
					const failure = audioFailureOf(error, "mic");
					audioBusy = false;
					audioActive = false;
					audioMode = "";
					audioFailure = failure.code;
					audioReason = failure.reason;
					notifyAudio();
					return { ok: false, code: failure.code, reason: audioReason };
				}
				return { ok: false, reason: TL_T("audio.cancelled") };
			}
		}
		function releaseMediaStream(stream) {
			if (stream === null || stream === undefined) return;
			let tracks = [];
			try {
				tracks = stream.getTracks();
			} catch {
				return;
			}
			for (const track of tracks) {
				try {
					track.stop();
				} catch {
					// a stopped track must not keep the capture alive
				}
			}
		}

		/**
		 * A1: system audio loopback. `getDisplayMedia({audio:true, video:true})` is the
		 * only web API that can capture system output; the video track is requested
		 * solely because browsers require it, then stopped and discarded immediately.
		 * Analysis only: no MediaRecorder, no sample storage, no upload. The stream is
		 * released on stop/visibility/low-power/wallpaper switch/module dispose.
		 *
		 * v0.5.3: `options.userInitiated` marks the one path that runs from a real click.
		 * Only that path logs `audio:system-failed`; any non-gesture attempt (future
		 * automation, tests, retries) records tl5Diag instead so the console stays quiet.
		 */
		async function startSystemAudio(options) {
			const userInitiated = options !== null && typeof options === "object" && options.userInitiated === true;
			if (audioActive) return { ok: true, mode: audioMode };
			if (audioBusy) return { ok: false, code: "busy", reason: TL_T("audio.busy") };
			const support = audioSupport();
			if (support.display === false || support.webaudio === false) {
				audioFailure = "unsupported";
				audioReason = TL_T("audio.unsupported");
				notifyAudio();
				return { ok: false, code: "unsupported", reason: audioReason };
			}
			if (document.body !== null && document.body.hasAttribute("data-tl-lowpower")) {
				audioFailure = "lowpower";
				audioReason = TL_T("audio.lowpower");
				notifyAudio();
				return { ok: false, code: "lowpower", reason: audioReason };
			}
			if (document.hidden) {
				audioFailure = "hidden";
				audioReason = TL_T("audio.hiddenPage");
				notifyAudio();
				return { ok: false, code: "hidden", reason: audioReason };
			}
			const Context = globalThis.AudioContext ?? globalThis.webkitAudioContext;
			if (typeof Context !== "function") {
				audioFailure = "unsupported";
				audioReason = TL_T("audio.unsupported");
				notifyAudio();
				return { ok: false, code: "unsupported", reason: audioReason };
			}
			const token = audioToken + 1;
			audioToken = token;
			audioBusy = true;
			audioReason = "";
			audioFailure = "";
			notifyAudio();
			let stream = null;
			let context = null;
			try {
				stream = await globalThis.navigator.mediaDevices.getDisplayMedia({ audio: true, video: true });
				if (token !== audioToken) {
					releaseMediaStream(stream);
					return { ok: false, code: "cancelled", reason: TL_T("audio.cancelled") };
				}
				// Drop the permission vehicle: only the audio track may stay alive.
				for (const track of stream.getVideoTracks()) {
					try {
						track.stop();
					} catch {
						// a discarded video track must not keep the capture alive
					}
					try {
						stream.removeTrack(track);
					} catch {
						// some browsers return an immutable stream; stopping is enough
					}
				}
				const audioTracks = typeof stream.getAudioTracks === "function" ? stream.getAudioTracks() : [];
				if (audioTracks.length === 0) {
					// The user shared a window/screen without ticking "share audio".
					releaseMediaStream(stream);
					if (token !== audioToken) return { ok: false, code: "cancelled", reason: TL_T("audio.cancelled") };
					audioBusy = false;
					audioActive = false;
					audioMode = "";
					audioFailure = "no-device";
					audioReason = TL_T("audio.noDevice");
					notifyAudio();
					return { ok: false, code: "no-device", reason: audioReason };
				}
				context = new Context();
				const source = context.createMediaStreamSource(stream);
				const analyser = context.createAnalyser();
				analyser.fftSize = 2048;
				analyser.smoothingTimeConstant = 0.8;
				source.connect(analyser);
				await context.resume();
				if (token !== audioToken) {
					releaseMediaStream(stream);
					try {
						void context.close();
					} catch {
						// closing is best effort
					}
					return { ok: false, code: "cancelled", reason: TL_T("audio.cancelled") };
				}
				audioStream = stream;
				audioContext = context;
				audioSource = source;
				audioAnalyser = analyser;
				audioData = new Uint8Array(analyser.fftSize);
				audioActive = true;
				audioBusy = false;
				audioMode = "system";
				audioFailure = "";
				audioReason = "";
				audioLevel = 0;
				bindAudioVisibility();
				notifyAudio();
				note("audio:system-started", { tracks: audioTracks.length });
				return { ok: true, mode: "system" };
			} catch (error) {
				releaseMediaStream(stream);
				try {
					void context?.close();
				} catch {
					// closing is best effort
				}
				releaseAudio();
				if (token !== audioToken) return { ok: false, code: "cancelled", reason: TL_T("audio.cancelled") };
				const failure = audioFailureOf(error, "system");
				audioBusy = false;
				audioActive = false;
				audioMode = "";
				audioFailure = failure.code;
				audioReason = failure.reason;
				notifyAudio();
				if (userInitiated) note("audio:system-failed", { code: failure.code });
				else tl5Diag("audio", { systemFailure: { code: failure.code, reason: failure.reason, auto: true } });
				return { ok: false, code: failure.code, reason: audioReason };
			}
		}

		/** Stops the loopback capture only when it is the active source. */
		function stopSystemAudio(reason) {
			if (audioActive !== true && audioBusy !== true) return { ok: true };
			stopAudio(typeof reason === "string" ? reason : TL_T("audio.stopped"));
			return { ok: true };
		}

		function audioLevelNow() {
			if (audioActive === false || audioAnalyser === null || audioData === null) return 0;
			if (document.hidden) {
				stopAudio(TL_T("audio.stopHidden"));
				return 0;
			}
			try {
				audioAnalyser.getByteTimeDomainData(audioData);
				let sum = 0;
				for (let index = 0; index < audioData.length; index += 1) {
					const value = (audioData[index] - 128) / 128;
					sum += value * value;
				}
				const rms = Math.sqrt(sum / audioData.length);
				const mapped = Math.min(1, Math.max(0, (rms - 0.015) * 4.5));
				audioLevel += (mapped - audioLevel) * 0.35;
				return audioLevel;
			} catch {
				stopAudio(TL_T("audio.stopAnalysis"));
				return 0;
			}
		}
		function subscribeAudio(listener) {
			audioSubscriber = typeof listener === "function" ? listener : null;
			if (audioSubscriber !== null) audioSubscriber(audioState());
			return () => {
				if (audioSubscriber === listener) audioSubscriber = null;
			};
		}
		const audioController = {
			read: audioState,
			/** v1 mic path, unchanged: shader-gated, explicit opt-in. */
			start: startAudio,
			startSystem: startSystemAudio,
			/** Stops whichever capture is active (mic or system loopback). */
			stop: stopAudio,
			stopSystem: stopSystemAudio,
			supported: audioSupport,
			level: audioLevelNow,
			subscribe: subscribeAudio,
			clearReason: () => {
				if (audioReason === "") return;
				audioReason = "";
				notifyAudio();
			},
		};

		/* ---- A5 pre-crop frame cache (host-backed first-paint still) ---- */
		/**
		 * The first paint of a 4K video scales a huge decoder surface; a still cropped
		 * to the current window aspect paints under it immediately and fades out when
		 * the real frame arrives. The cache lives in the HOST (`_frame-cache`), not in
		 * localStorage: images are bytes, and every failure here is a silent no-op so
		 * the wallpaper itself is never affected.
		 */
		const FRAME_CACHE_ROUTE = ASSET_BASE + "/_frame-cache";
		const FRAME_CACHE_MAX_WIDTH = 1920;
		const FRAME_CACHE_WEBP_QUALITY = 0.72;
		/** v0.5.3: capture waits for first paint; never runs hidden/not-visible/low-power. */
		const FRAME_CACHE_CAPTURE_DELAY_MS = 2500;
		function frameCacheCaptureAllowed() {
			if (typeof document === "undefined") return false;
			if (document.hidden === true) return false;
			if (document.visibilityState !== undefined && document.visibilityState !== "visible") return false;
			if (typeof document.body !== "undefined" && document.body !== null && document.body.hasAttribute("data-tl-lowpower")) return false;
			return true;
		}
		/** Same 38% focal point as the scene composition, so the crop matches. */
		const FRAME_CACHE_FOCAL_X = 0.38;
		const frameCacheState = {
			hit: 0,
			miss: 0,
			entries: 0,
			bytes: 0,
			maxBytes: 0,
			lastKey: "",
			lastError: "",
			host: false,
		};
		let frameCacheTimer = 0;
		/**
		 * v0.5.3: keys this profile has actually captured. A GET for an unknown key can
		 * only 404, so it is counted as a local miss WITHOUT a network request — that is
		 * what keeps the console free of `_frame-cache` resource errors. The list is
		 * small, persisted, and cleared together with the host cache / when status
		 * reports an empty cache.
		 */
		const FRAME_CACHE_KNOWN_KEY = "tianlight.cache.known";
		const FRAME_CACHE_KNOWN_MAX = 60;
		let frameCacheKnownKeys = null;
		function loadFrameCacheKnownKeys() {
			if (frameCacheKnownKeys !== null) return frameCacheKnownKeys;
			frameCacheKnownKeys = new Set();
			try {
				const raw = JSON.parse(globalThis.localStorage?.getItem(FRAME_CACHE_KNOWN_KEY) ?? "null");
				if (Array.isArray(raw)) {
					for (const key of raw.slice(-FRAME_CACHE_KNOWN_MAX)) {
						if (typeof key === "string" && key !== "" && /^[a-z0-9._-]{1,120}$/.test(key)) frameCacheKnownKeys.add(key);
					}
				}
			} catch {
				// a corrupt known-key list only means "no pre-paint this session"
			}
			return frameCacheKnownKeys;
		}
		function saveFrameCacheKnownKeys() {
			try {
				if (frameCacheKnownKeys === null) return;
				globalThis.localStorage?.setItem(FRAME_CACHE_KNOWN_KEY, JSON.stringify([...frameCacheKnownKeys].slice(-FRAME_CACHE_KNOWN_MAX)));
			} catch {
				// persistence is optional; the session set still works
			}
		}
		function rememberFrameCacheKey(key) {
			if (typeof key !== "string" || key === "") return;
			const known = loadFrameCacheKnownKeys();
			if (known.has(key)) return;
			known.add(key);
			while (known.size > FRAME_CACHE_KNOWN_MAX) known.delete(known.values().next().value);
			saveFrameCacheKnownKeys();
		}
		function forgetFrameCacheKey(key) {
			const known = loadFrameCacheKnownKeys();
			if (known.delete(key)) saveFrameCacheKnownKeys();
		}
		function clearFrameCacheKnownKeys() {
			loadFrameCacheKnownKeys().clear();
			saveFrameCacheKnownKeys();
		}
		/** Object URLs created for cached stills; revoked on dispose / after a few uses. */
		const frameCacheObjectUrls = [];
		function releaseFrameCacheUrls() {
			while (frameCacheObjectUrls.length > 0) {
				const url = frameCacheObjectUrls.pop();
				try {
					if (typeof globalThis.URL === "object" && typeof globalThis.URL.revokeObjectURL === "function") {
						globalThis.URL.revokeObjectURL(url);
					}
				} catch {
					// revoking an already-revoked URL is best effort
				}
			}
		}
		function trackFrameCacheUrl(url) {
			frameCacheObjectUrls.push(url);
			while (frameCacheObjectUrls.length > 4) {
				const old = frameCacheObjectUrls.shift();
				try {
					if (typeof globalThis.URL === "object" && typeof globalThis.URL.revokeObjectURL === "function") {
						globalThis.URL.revokeObjectURL(old);
					}
				} catch {
					// revoking an already-revoked URL is best effort
				}
			}
		}
		/**
		 * Host capability probe (one fetch per page). A host from an older build has no
		 * `_frame-cache` route at all; asking for it would 404 on every wallpaper load,
		 * so the cache is simply OFF until the host reports `capabilities.frameCache`.
		 */
		let frameCacheSupport = null;
		function frameCacheSupported() {
			if (frameCacheSupport !== null) return frameCacheSupport;
			frameCacheSupport = fetch(ASSET_BASE + "/_engines", { cache: "no-store" })
				.then((response) => (response.ok ? response.json() : null))
				.then((value) =>
					value !== null && typeof value === "object" && value.capabilities !== undefined
						? value.capabilities.frameCache === true
						: null,
				)
				.catch(() => null);
			return frameCacheSupport;
		}

		/** Host cache keys accept `[a-z0-9._-]` only; lowercase everything else away. */
		function cacheTokens(value, max) {
			return String(value ?? "")
				.toLowerCase()
				.replace(/[^a-z0-9._-]+/g, "_")
				.replace(/^[._-]+|[._-]+$/g, "")
				.slice(0, max);
		}
		/**
		 * Stable short hash. Two CJK filenames both sanitise to "mp4", so a lossy token
		 * needs a discriminator or different wallpapers would share one cache entry.
		 */
		function cacheHash(value) {
			let hash = 2166136261;
			const text = String(value ?? "");
			for (let index = 0; index < text.length; index += 1) {
				hash ^= text.charCodeAt(index);
				hash = Math.imul(hash, 16777619) >>> 0;
			}
			return hash.toString(36);
		}
		/** Nearest canonical aspect, so two slightly different windows share one still. */
		function cacheAspectBucket() {
			const width = globalThis.innerWidth || 1600;
			const height = globalThis.innerHeight || 900;
			const ratio = width / Math.max(1, height);
			const presets = [[21, 9], [16, 9], [16, 10], [3, 2], [4, 3], [1, 1], [9, 16]];
			let best = "";
			let bestDelta = Infinity;
			for (const preset of presets) {
				const delta = Math.abs(ratio - preset[0] / preset[1]);
				if (delta < bestDelta) {
					bestDelta = delta;
					best = preset[0] + "x" + preset[1];
				}
			}
			if (best !== "" && bestDelta <= 0.18) return best;
			return "r" + String(Math.round(ratio * 10) / 10).replace(".", "_");
		}
		/** Target width bucket (<=1920): a 4K still is wasted on a 1080p window. */
		function cacheTierWidth() {
			const width = (globalThis.innerWidth || 1600) * (globalThis.devicePixelRatio || 1);
			const clamped = Math.min(FRAME_CACHE_MAX_WIDTH, Math.max(640, width));
			return String(Math.round(clamped / 160) * 160);
		}
		function frameCacheKey(choice) {
			if (choice === null || typeof choice !== "object") return "";
			if (choice.kind !== "video" && choice.kind !== "image") return "";
			const url = typeof choice.url === "string" ? choice.url : "";
			const file = url.slice(url.lastIndexOf("/") + 1).split(/[?#]/)[0];
			const id = cacheTokens(file, 56);
			if (id === "") return "";
			// Non-ASCII names are lossy after sanitising; keep them unique with a hash.
			const lossy = /[^a-z0-9._-]/.test(file);
			const stable = lossy ? id + "-" + cacheHash(file) : id;
			return stable + "." + cacheAspectBucket() + "." + cacheTierWidth();
		}
		function frameCacheTargetSize() {
			const tier = Number(cacheTierWidth()) || 1280;
			const aspect = (globalThis.innerWidth || 16) / Math.max(1, globalThis.innerHeight || 9);
			return {
				width: Math.max(320, Math.min(FRAME_CACHE_MAX_WIDTH, tier)),
				height: Math.max(180, Math.min(2160, Math.round(tier / Math.max(0.4, aspect)))),
			};
		}
		function publishCacheMetrics() {
			publishTl5Metrics({ cacheHit: frameCacheState.hit, cacheMiss: frameCacheState.miss });
			tl5Diag("cache", { ...frameCacheState });
		}
		function cancelFrameCacheCapture() {
			if (frameCacheTimer === 0) return;
			window.clearTimeout(frameCacheTimer);
			frameCacheTimer = 0;
		}
		/** POSTs a blob; 8s cap so a hung host cannot keep a request forever. */
		function postFrameCache(key, blob) {
			let controller = null;
			try {
				if (typeof AbortController === "function") controller = new AbortController();
			} catch {
				controller = null;
			}
			let timer = 0;
			if (controller !== null) {
				timer = window.setTimeout(() => {
					try {
						controller.abort();
					} catch {
						// an already-finished request is fine
					}
				}, 8000);
			}
			fetch(FRAME_CACHE_ROUTE + "?key=" + encodeURIComponent(key), {
				method: "POST",
				headers: { "content-type": blob.type || "image/webp" },
				body: blob,
				signal: controller === null ? undefined : controller.signal,
			})
				.then((response) => {
					if (response.ok) {
						frameCacheState.lastKey = key;
						rememberFrameCacheKey(key);
					} else {
						frameCacheState.lastError = "http-" + response.status;
					}
					publishCacheMetrics();
				})
				.catch(() => {
					frameCacheState.lastError = "network";
					publishCacheMetrics();
				})
				.finally(() => {
					if (timer !== 0) {
						window.clearTimeout(timer);
						timer = 0;
					}
				});
		}
		/**
		 * Schedules one capture for a decodable source (video element or loaded Image).
		 * v0.5.3: waits 2.5s so the capture never competes with first paint, and skips
		 * entirely while hidden / not visible / low-power. `stillCurrent` is checked at
		 * fire time: a wallpaper switched during the delay must not overwrite the new key.
		 */
		function captureFrameCache(choice, source, stillCurrent) {
			cancelFrameCacheCapture();
			const key = frameCacheKey(choice);
			if (key === "" || source === null || source === undefined) return;
			if (frameCacheCaptureAllowed() === false) return;
			void frameCacheSupported().then((supported) => {
				if (supported !== true) return;
				frameCacheTimer = window.setTimeout(() => {
					frameCacheTimer = 0;
					try {
						if (typeof stillCurrent === "function" && stillCurrent() !== true) return;
						// Re-check at fire time: the tab may have gone hidden / low-power
						// during the 2.5s delay, and a hidden capture is wasted work.
						if (frameCacheCaptureAllowed() === false) return;
						const width = Number(source.videoWidth ?? source.naturalWidth ?? 0);
						const height = Number(source.videoHeight ?? source.naturalHeight ?? 0);
						if (!(width > 0) || !(height > 0)) return;
						const target = frameCacheTargetSize();
						const canvas = document.createElement("canvas");
						canvas.width = target.width;
						canvas.height = target.height;
						const context = canvas.getContext("2d");
						if (context === null) return;
						const sourceRatio = width / height;
						const targetRatio = target.width / target.height;
						let cropWidth = width;
						let cropHeight = height;
						if (sourceRatio > targetRatio) cropWidth = Math.round(height * targetRatio);
						else cropHeight = Math.round(width / targetRatio);
						const left = Math.min(width - cropWidth, Math.max(0, Math.round(FRAME_CACHE_FOCAL_X * width - cropWidth / 2)));
						const top = Math.round((height - cropHeight) / 2);
						context.drawImage(source, left, top, cropWidth, cropHeight, 0, 0, target.width, target.height);
						canvas.toBlob(
							(blob) => {
								if (blob !== null && blob.size > 0) {
									postFrameCache(key, blob);
									return;
								}
								// A browser without canvas WebP support returns null; the host sniffs
								// the bytes anyway, so JPEG is a valid fallback cache entry.
								canvas.toBlob(
									(jpeg) => {
										if (jpeg !== null && jpeg.size > 0) postFrameCache(key, jpeg);
									},
									"image/jpeg",
									0.75,
								);
							},
							"image/webp",
							FRAME_CACHE_WEBP_QUALITY,
						);
					} catch {
						// A cross-origin source taints the canvas; the cache stays a no-op.
						frameCacheState.lastError = "tainted";
						publishCacheMetrics();
					}
				}, FRAME_CACHE_CAPTURE_DELAY_MS);
			});
		}
		/**
		 * Resolves the cached still URL for this choice, counting hit/miss metrics.
		 * v0.5.3: a fetch+blob-URL probe replaces `<img src=...>` so a cache MISS is a
		 * normal 404 branch (counter only) instead of a console resource error.
		 */
		function lookupFrameCache(choice) {
			const key = frameCacheKey(choice);
			if (key === "") return Promise.resolve(null);
			// Unknown keys can only 404: count the miss locally and skip the request.
			if (loadFrameCacheKnownKeys().has(key) === false) {
				frameCacheState.miss += 1;
				frameCacheState.lastError = "miss";
				publishCacheMetrics();
				return Promise.resolve(null);
			}
			return frameCacheSupported().then((supported) => {
				if (supported !== true) return null;
				const url = FRAME_CACHE_ROUTE + "?key=" + encodeURIComponent(key);
				return fetch(url, { cache: "no-store" })
					.then((response) => {
						if (!response.ok) {
							// A stale known key (host LRU eviction / another profile): forget it
							// so the next lookup is a quiet local miss again.
							forgetFrameCacheKey(key);
							frameCacheState.miss += 1;
							frameCacheState.lastError = response.status === 404 ? "miss" : "http-" + response.status;
							publishCacheMetrics();
							return null;
						}
						return response.blob().then((blob) => {
							if (blob === null || blob.size === 0) {
								frameCacheState.miss += 1;
								publishCacheMetrics();
								return null;
							}
							const BlobUrl = globalThis.URL;
							if (BlobUrl === undefined || typeof BlobUrl.createObjectURL !== "function") {
								frameCacheState.miss += 1;
								publishCacheMetrics();
								return null;
							}
							const objectUrl = BlobUrl.createObjectURL(blob);
							trackFrameCacheUrl(objectUrl);
							frameCacheState.hit += 1;
							frameCacheState.lastError = "";
							publishCacheMetrics();
							return { url: objectUrl, key };
						});
					})
					.catch(() => {
						frameCacheState.miss += 1;
						frameCacheState.lastError = "network";
						publishCacheMetrics();
						return null;
					});
			});
		}
		function readFrameCacheStatus() {
			return frameCacheSupported().then((supported) => {
				if (supported !== true) return null;
				return fetch(FRAME_CACHE_ROUTE + "/status", { cache: "no-store" })
					.then((response) => (response.ok ? response.json() : null))
					.then((value) => {
						if (value === null || typeof value !== "object") return null;
						frameCacheState.host = true;
						frameCacheState.entries = Number(value.entries) || 0;
						frameCacheState.bytes = Number(value.bytes) || 0;
						frameCacheState.maxBytes = Number(value.maxBytes) || 0;
						frameCacheState.lastError = "";
						// The host cache was cleared (or lost): the local known-key list is stale.
						if (frameCacheState.entries === 0) clearFrameCacheKnownKeys();
						publishCacheMetrics();
						return value;
					})
					.catch(() => null);
			});
		}
		function clearFrameCache() {
			return frameCacheSupported().then((supported) => {
				if (supported !== true) return null;
				return fetch(FRAME_CACHE_ROUTE, { method: "DELETE" })
					.then((response) => (response.ok ? response.json() : null))
					.then((value) => {
						frameCacheState.hit = 0;
						frameCacheState.miss = 0;
						frameCacheState.lastKey = "";
						clearFrameCacheKnownKeys();
						publishCacheMetrics();
						return value;
					})
					.catch(() => null);
			});
		}
		const frameCacheController = {
			key: frameCacheKey,
			state: () => ({ ...frameCacheState }),
			capture: captureFrameCache,
			cancel: cancelFrameCacheCapture,
			captureAllowed: frameCacheCaptureAllowed,
			delayMs: FRAME_CACHE_CAPTURE_DELAY_MS,
			lookup: lookupFrameCache,
			status: readFrameCacheStatus,
			clear: clearFrameCache,
			revoke: releaseFrameCacheUrls,
			targetSize: frameCacheTargetSize,
		};

		/* ---- C3 performance-adaptive v2: shared state for the engine panel ---- */
		/**
		 * The sampler lives inside the scene (it owns fps/jitter); this top-level state
		 * is the read-only surface the panel and diagnostics use. `adaptiveHooks` is
		 * bound by installScene and unbound on dispose, so the module switch really
		 * removes the behaviour.
		 */
		const ADAPTIVE_DEFAULTS = { active: false, kind: "", level: 0, reason: "", fps: 0, jitter: 0 };
		const adaptiveState = { ...ADAPTIVE_DEFAULTS };
		const adaptiveSubscribers = new Set();
		let adaptiveHooks = null;
		function publishAdaptive(patch) {
			const next = { ...adaptiveState, ...(patch === null || typeof patch !== "object" ? {} : patch) };
			const changed =
				next.active !== adaptiveState.active ||
				next.kind !== adaptiveState.kind ||
				next.level !== adaptiveState.level ||
				next.reason !== adaptiveState.reason;
			Object.assign(adaptiveState, next);
			if (changed) {
				for (const listener of [...adaptiveSubscribers]) {
					try {
						listener({ ...adaptiveState });
					} catch (error) {
						note("adaptive:subscriber", error);
					}
				}
			}
			tl5Diag("engine", { adaptive: { ...adaptiveState } });
			// C3 contract with the Smart-context workstream: they publish
			// TL5_DIAG.context.adaptiveEnabled (their switch); the readable downgrade
			// reason string is owned here.
			tl5Diag("context", {
				adaptive: adaptiveState.active === true ? adaptiveState.reason : "",
				adaptiveActive: adaptiveState.active,
				adaptiveKind: adaptiveState.kind,
				adaptiveLevel: adaptiveState.level,
			});
		}
		const adaptiveController = {
			read: () => ({ ...adaptiveState }),
			subscribe: (listener) => {
				if (typeof listener !== "function") return () => {};
				adaptiveSubscribers.add(listener);
				listener({ ...adaptiveState });
				return () => {
					adaptiveSubscribers.delete(listener);
				};
			},
			/** Re-evaluate now: the engine panel's lock toggle calls this after writing context. */
			sync: () => {
				if (adaptiveHooks !== null && typeof adaptiveHooks.sync === "function") adaptiveHooks.sync();
			},
		};

		/* ---- C3 adaptive v3 hard limits (v0.5.3 live-runtime fix) ----
		 * v0.5.2 downgraded after 3 samples of fps<18/jitter>140 with a 60s probe, and it
		 * sampled even while the window was occluded. On the live Desktop that cycled
		 * "video -> static -> resume" forever (a background window reports near-zero fps),
		 * which read as a frozen wallpaper. The limits below are deliberately hard to
		 * reach: focus+visibility gated, 5 consecutive lows over >=10s, and a 5 minute
		 * probe cooldown. Pure so the smoke tests can drive time/focus without waiting.
		 */
		const ADAPTIVE_LOW_FPS = 15;
		const ADAPTIVE_HIGH_JITTER = 180;
		const ADAPTIVE_LOW_STREAK = 5;
		const ADAPTIVE_LOW_SPAN_MS = 10000;
		const ADAPTIVE_RECOVER_FPS = 28;
		const ADAPTIVE_RECOVER_STREAK = 5;
		const ADAPTIVE_PROBE_COOLDOWN_MS = 5 * 60 * 1000;
		const ADAPTIVE_PROBE_MAX_SAMPLES = 15;
		function adaptiveSampleIsLow(sample) {
			if (sample === null || typeof sample !== "object") return false;
			const fps = Number(sample.fps);
			const jitter = Number(sample.jitter);
			if (!Number.isFinite(fps)) return false;
			if (fps < ADAPTIVE_LOW_FPS) return true;
			return Number.isFinite(jitter) && jitter > ADAPTIVE_HIGH_JITTER;
		}
		function adaptiveSustainedLow(streak, spanMs) {
			return Number(streak) >= ADAPTIVE_LOW_STREAK && Number(spanMs) >= ADAPTIVE_LOW_SPAN_MS;
		}
		/**
		 * Pure C3 decision for the sampler tick.
		 * actions: none | clear | start-probe | probe-fail | downgrade | recover | limit-shader
		 */
		function adaptiveDecision(input) {
			const source = input !== null && typeof input === "object" ? input : {};
			if (source.autoAllowed !== true) return { action: "clear" };
			// Gate first: an unfocused/occluded/hidden page must never act, even though it
			// may already be in the middle of a static-frame state.
			if (source.eligible !== true) return { action: "none" };
			const now = Number(source.now) || 0;
			const stillAt = Number(source.stillAt) || 0;
			if (source.still === true) {
				if (source.probe === true) return { action: "none" };
				return now - stillAt >= ADAPTIVE_PROBE_COOLDOWN_MS ? { action: "start-probe" } : { action: "none" };
			}
			const sample = source.sample !== null && typeof source.sample === "object" ? source.sample : null;
			if (sample === null) return { action: "none" };
			const low = adaptiveSampleIsLow(sample);
			const healthy = Number(sample.fps) >= ADAPTIVE_RECOVER_FPS;
			const streak = Math.max(0, Math.round(Number(source.lowStreak) || 0));
			const span = Math.max(0, now - (Number(source.lowSince) || 0));
			const samples = Math.max(0, Math.round(Number(source.samples) || 0));
			const highStreak = Math.max(0, Math.round(Number(source.highStreak) || 0));
			if (source.probe === true) {
				if (healthy && highStreak >= ADAPTIVE_RECOVER_STREAK) return { action: "recover" };
				// A failed probe re-parks the frame, which starts a fresh 5 min cooldown;
				// it must NOT chain another downgrade (that was the v0.5.2 loop).
				if (adaptiveSustainedLow(streak, span)) return { action: "probe-fail" };
				if (samples >= ADAPTIVE_PROBE_MAX_SAMPLES) return { action: "probe-fail" };
				return { action: "none" };
			}
			if (adaptiveSustainedLow(streak, span)) {
				return { action: source.kind === "shader" ? "limit-shader" : "downgrade" };
			}
			if (source.kind === "shader" && Number(source.level) > 0 && healthy && highStreak >= ADAPTIVE_RECOVER_STREAK) {
				return { action: "raise-shader" };
			}
			return { action: "none" };
		}



		/**
		 * Compiles a candidate in a throwaway context so the panel can refuse a broken
		 * shader before the scene swaps away a working wallpaper.
		 */
		function validateShaderSource(source) {
			if (typeof source !== "string" || source.trim() === "") return TL_T("wp.shaderErr.empty");
			if (source.length > SHADER_SOURCE_MAX) return TL_T("wp.shaderErr.tooLong", { max: SHADER_SOURCE_MAX });
			if (typeof document === "undefined") return null;
			let gl = null;
			try {
				const probe = document.createElement("canvas");
				gl = probe.getContext("webgl", { antialias: false, alpha: false, depth: false, stencil: false });
				if (gl === null) return TL_T("wp.shaderErr.noWebgl");
				const vertex = gl.createShader(gl.VERTEX_SHADER);
				const fragment = gl.createShader(gl.FRAGMENT_SHADER);
				gl.shaderSource(vertex, SHADER_VERTEX);
				gl.shaderSource(fragment, source);
				gl.compileShader(vertex);
				gl.compileShader(fragment);
				if (gl.getShaderParameter(fragment, gl.COMPILE_STATUS) !== true) {
					return String(gl.getShaderInfoLog(fragment) ?? TL_T("wp.shaderErr.compileFail")).slice(0, 240);
				}
				const program = gl.createProgram();
				gl.attachShader(program, vertex);
				gl.attachShader(program, fragment);
				gl.linkProgram(program);
				if (gl.getProgramParameter(program, gl.LINK_STATUS) !== true) {
					return String(gl.getProgramInfoLog(program) ?? TL_T("wp.shaderErr.linkFail")).slice(0, 240);
				}
				return null;
			} catch (error) {
				return error instanceof Error ? error.message : String(error);
			} finally {
				try {
					gl?.getExtension("WEBGL_lose_context")?.loseContext();
				} catch {
					// losing a probe context is best effort
				}
			}
		}

		/** One live WebGL program on the scene canvas, reused across source changes. */
		function createShaderRenderer(canvas) {
			let gl = null;
			try {
				gl = canvas.getContext("webgl", {
					alpha: false,
					antialias: false,
					depth: false,
					stencil: false,
					preserveDrawingBuffer: false,
					powerPreference: "low-power",
				});
			} catch {
				gl = null;
			}
			if (gl === null) return null;
			let program = null;
			let buffer = null;
			let position = -1;
			let uniforms = null;
			const teardownProgram = () => {
				if (program !== null) gl.deleteProgram(program);
				if (buffer !== null) gl.deleteBuffer(buffer);
				program = null;
				buffer = null;
				uniforms = null;
			};
			return {
				apply: (source) => {
					if (typeof source !== "string" || source.trim() === "") return TL_T("wp.shaderErr.empty");
					const vertex = gl.createShader(gl.VERTEX_SHADER);
					const fragment = gl.createShader(gl.FRAGMENT_SHADER);
					let next = null;
					try {
						gl.shaderSource(vertex, SHADER_VERTEX);
						gl.shaderSource(fragment, source);
						gl.compileShader(vertex);
						gl.compileShader(fragment);
						if (gl.getShaderParameter(fragment, gl.COMPILE_STATUS) !== true) {
							return String(gl.getShaderInfoLog(fragment) ?? TL_T("wp.shaderErr.compileFail")).slice(0, 240);
						}
						next = gl.createProgram();
						gl.attachShader(next, vertex);
						gl.attachShader(next, fragment);
						gl.linkProgram(next);
						if (gl.getProgramParameter(next, gl.LINK_STATUS) !== true) {
							const log = String(gl.getProgramInfoLog(next) ?? TL_T("wp.shaderErr.linkFail")).slice(0, 240);
							gl.deleteProgram(next);
							next = null;
							return log;
						}
						teardownProgram();
						program = next;
						gl.useProgram(program);
						buffer = gl.createBuffer();
						gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
						gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
						position = gl.getAttribLocation(program, "a_position");
						gl.enableVertexAttribArray(position);
						gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
						uniforms = {
							resolution: gl.getUniformLocation(program, "iResolution"),
							time: gl.getUniformLocation(program, "iTime"),
							mouse: gl.getUniformLocation(program, "iMouse"),
							speed: gl.getUniformLocation(program, "u_speed"),
							intensity: gl.getUniformLocation(program, "u_intensity"),
							hue: gl.getUniformLocation(program, "u_hue"),
							audio: gl.getUniformLocation(program, "u_audio"),
						};
						return null;
					} catch (error) {
						if (next !== null) gl.deleteProgram(next);
						return error instanceof Error ? error.message : String(error);
					} finally {
						gl.deleteShader(vertex);
						gl.deleteShader(fragment);
					}
				},
				resize: (width, height) => {
					const w = Math.max(1, Math.round(width));
					const h = Math.max(1, Math.round(height));
					if (canvas.width !== w || canvas.height !== h) {
						canvas.width = w;
						canvas.height = h;
					}
					gl.viewport(0, 0, w, h);
				},
				render: (time, settings, mouse, audio) => {
					if (program === null || uniforms === null) return;
					gl.useProgram(program);
					if (uniforms.resolution !== null) gl.uniform3f(uniforms.resolution, canvas.width, canvas.height, 1);
					if (uniforms.time !== null) gl.uniform1f(uniforms.time, time);
					if (uniforms.mouse !== null) gl.uniform4f(uniforms.mouse, mouse[0], mouse[1], 0, 0);
					if (uniforms.speed !== null) gl.uniform1f(uniforms.speed, settings.speed);
					if (uniforms.intensity !== null) gl.uniform1f(uniforms.intensity, settings.intensity);
					if (uniforms.hue !== null) gl.uniform1f(uniforms.hue, settings.hue);
					if (uniforms.audio !== null) gl.uniform1f(uniforms.audio, Number.isFinite(audio) ? audio : 0);
					gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
					gl.enableVertexAttribArray(position);
					gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
					gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
				},
				dispose: () => {
					teardownProgram();
					try {
						gl.getExtension("WEBGL_lose_context")?.loseContext();
					} catch {
						// losing the context is best effort
					}
				},
			};
		}

		/**
		 * Grabs evenly spaced frames from a video for the static-frame picker. Only
		 * same-origin media can be read (a cross-origin canvas is tainted), so the
		 * failure names that instead of returning empty thumbnails.
		 */
		function sampleVideoFrames(url, count) {
			if (typeof url !== "string" || url === "") {
				return Promise.resolve({ ok: false, reason: TL_T("wp.frames.noUrl") });
			}
			return new Promise((resolve) => {
				let settled = false;
				let timer = 0;
				let pendingSeeker = null;
				const video = document.createElement("video");
				const cleanup = () => {
					if (timer !== 0) {
						window.clearTimeout(timer);
						timer = 0;
					}
					if (pendingSeeker !== null) {
						video.removeEventListener("seeked", pendingSeeker);
						pendingSeeker = null;
					}
					video.removeEventListener("loadeddata", onReady);
					video.removeEventListener("error", onError);
					video.removeAttribute("src");
					video.load();
				};
				const finish = (value) => {
					if (settled) return;
					settled = true;
					cleanup();
					resolve(value);
				};
				const onError = () => finish({ ok: false, reason: TL_T("wp.frames.loadFail") });
				const onReady = () => {
					const duration = video.duration;
					if (!Number.isFinite(duration) || duration <= 0) {
						finish({ ok: false, reason: TL_T("wp.frames.noDuration") });
						return;
					}
					const canvas = document.createElement("canvas");
					canvas.width = 160;
					canvas.height = 90;
					const context = canvas.getContext("2d");
					if (context === null) {
						finish({ ok: false, reason: TL_T("wp.frames.noCanvas") });
						return;
					}
					const frames = [];
					const total = Math.max(2, Math.min(8, Math.round(Number(count) || 6)));
					let index = 0;
					const seekNext = () => {
						if (settled) return;
						if (index >= total) {
							finish({ ok: true, frames });
							return;
						}
						const time = Math.min(duration - 0.05, Math.max(0.05, ((index + 0.5) / total) * duration));
						const onSeeked = () => {
							pendingSeeker = null;
							if (settled) return;
							try {
								context.drawImage(video, 0, 0, canvas.width, canvas.height);
								frames.push({ time, dataUrl: canvas.toDataURL("image/jpeg", 0.55) });
							} catch {
								finish({ ok: false, reason: TL_T("wp.frames.cors") });
								return;
							}
							index += 1;
							seekNext();
						};
						pendingSeeker = onSeeked;
						video.addEventListener("seeked", pendingSeeker, { once: true });
						try {
							video.currentTime = time;
						} catch {
							finish({ ok: false, reason: TL_T("wp.frames.seekFail") });
						}
					};
					seekNext();
				};
				timer = window.setTimeout(() => finish({ ok: false, reason: TL_T("wp.frames.timeout") }), 8000);
				video.muted = true;
				video.playsInline = true;
				video.preload = "auto";
				video.addEventListener("loadeddata", onReady, { once: true });
				video.addEventListener("error", onError, { once: true });
				video.src = url;
				video.load();
			});
		}

		async function listWallpapers() {
			try {
				const response = await fetch(ASSET_BASE + "/_wallpapers", { cache: "no-store" });
				if (!response.ok) return null;
				const value = await response.json();
				return Array.isArray(value?.items) ? value.items : null;
			} catch {
				return null;
			}
		}

		/** Automatic selection is also where dynamic resolution first kicks in. */
		function withPreferredVariant(choice, items) {
			const resolved = resolveVariantChoice(choice, groupVariantItems(items));
			return resolved === null ? choice : resolved.choice;
		}

		/**
		 * Automatic catalog: the known-good video candidates by codec probe, then any
		 * other video, then a still image. Never consults the saved choice, and never
		 * auto-picks a web/GLSL wallpaper (those are explicit choices only).
		 */
		async function resolveAutoWallpaper() {
			const items = await readCatalog();
			if (items === null) {
				const fallback = await resolveVideoSource();
				return fallback === null ? null : { kind: "video", url: fallback };
			}
			const byId = new Map(items.map((item) => [item.id, item]));
			const probe = document.createElement("video");
			for (const candidate of VIDEO_CANDIDATES) {
				const item = byId.get(candidate.file);
				if (item === undefined) continue;
				if (candidate.codec !== undefined && probe.canPlayType(candidate.codec) === "") continue;
				return withPreferredVariant({ kind: "video", url: item.url }, items);
			}
			const video = items.find((item) => item.kind === "video");
			if (video !== undefined) return withPreferredVariant({ kind: "video", url: video.url }, items);
			const image = items.find((item) => item.kind === "image");
			if (image !== undefined) return { kind: "image", url: image.url };
			return null;
		}

		async function resolveWallpaper() {
			const chosen = readWallpaperChoice();
			if (chosen !== null) return chosen;
			return resolveAutoWallpaper();
		}

		/**
		 * Rotation list: one entry per LOGICAL wallpaper. `bg-4k.mp4` / `bg-1080.mp4` are
		 * two encodes of one picture, so rotating between them would produce a "switch"
		 * that looks identical; the preferred encode for the current window is used.
		 */
		async function listRotationCandidates() {
			const items = await listWallpapers();
			if (items === null) return null;
			const groups = groupVariantItems(items);
			const seen = new Set();
			const result = [];
			for (const item of items) {
				if (item === null || typeof item !== "object") continue;
				if (item.kind !== "video" && item.kind !== "image") continue;
				const group = item.kind === "video" ? groupForUrl(groups, "video", item.url) : null;
				if (group === null) {
					result.push(item);
					continue;
				}
				const key = group.stem.toLowerCase();
				if (seen.has(key)) continue;
				seen.add(key);
				const resolved = resolveVariantChoice(item, groups);
				result.push(resolved === null ? item : { ...item, url: resolved.choice.url });
			}
			return result;
		}

		async function resolveCompanionArt() {
			const assets = await readAssets();
			if (assets === null || assets.includes("cat.png") === false) return null;
			return ASSET_BASE + "/cat.png";
		}

		/**
		 * Builds the wallpaper stack beneath the application. Returns a disposer
		 * that removes every node and listener this activation created.
		 */
		function installScene() {
			const scene = document.createElement("div");
			scene.dataset.tlScene = "";
			scene.setAttribute("aria-hidden", "true");

			const video = document.createElement("video");
			video.muted = true;
			video.loop = true;
			video.autoplay = true;
			video.playsInline = true;
			video.preload = "auto";
			video.disablePictureInPicture = true;
			video.setAttribute("muted", "");
			video.setAttribute("playsinline", "");
			video.style.setProperty("--tl-focal-x", FOCAL_X);
			scene.appendChild(video);

			// Still-image layer. Same slot as the video (painted under veil/crest by DOM
			// order), so an image wallpaper needs no second scene or code path.
			const photo = document.createElement("div");
			photo.dataset.tlPhoto = "";
			photo.hidden = true;
			scene.appendChild(photo);

			// Third channel: a WebGL canvas painted between the still layer and the veil,
			// so the crest/veil keep working over procedural wallpaper frames.
			const shaderCanvas = document.createElement("canvas");
			shaderCanvas.dataset.tlShader = "";
			shaderCanvas.hidden = true;
			scene.appendChild(shaderCanvas);

			// Optional fourth channel: a sandboxed adapter page that runs WebWallGL for
			// WE scene projects. Same layer position as the shader canvas; only one of
			// video / photo / shader / scene frame is visible at a time.
			const sceneFrame = document.createElement("iframe");
			sceneFrame.dataset.tlSceneFrame = "";
			sceneFrame.hidden = true;
			sceneFrame.setAttribute("sandbox", "allow-scripts");
			sceneFrame.setAttribute("allow", "autoplay");
			sceneFrame.setAttribute("referrerpolicy", "no-referrer");
			sceneFrame.setAttribute("title", "Wallpaper Engine scene");
			scene.appendChild(sceneFrame);

			// Fifth channel: a WE `type:"web"` project. Deliberately a SECOND iframe with
			// its own protocol-less lifecycle; the WebWallGL adapter contract must not be
			// reused here. `allow-scripts` WITHOUT `allow-same-origin` gives the project an
			// opaque origin, so it cannot touch this page or DSH's origin storage.
			const webFrame = document.createElement("iframe");
			webFrame.dataset.tlWeb = "";
			webFrame.hidden = true;
			webFrame.setAttribute("sandbox", "allow-scripts");
			webFrame.setAttribute("allow", "autoplay");
			webFrame.setAttribute("referrerpolicy", "no-referrer");
			webFrame.setAttribute("title", "Web wallpaper");
			scene.appendChild(webFrame);

			// Overlay stack: two CSS-only slots above all media, below the veil/crest.
			for (const index of [0, 1]) {
				const overlay = document.createElement("div");
				overlay.dataset.tlOverlay = "";
				overlay.dataset.tlOverlaySlot = String(index);
				scene.appendChild(overlay);
			}
			applyLayers(scene, readLayers());

			// Zone dim lives above the media but under the veil: the CSS rule existed but
			// no element carried `data-tl-dim`, so the 外观 → 暗化 slider silently did
			// nothing. It multiplies nothing (translucent black), so it costs one layer.
			const dim = document.createElement("div");
			dim.dataset.tlDim = "";
			scene.appendChild(dim);

			const veil = document.createElement("div");
			veil.dataset.tlVeil = "";
			scene.appendChild(veil);

			const crest = document.createElement("div");
			crest.dataset.tlCrest = "";
			crest.innerHTML = CREST_SVG;
			crest.style.setProperty("--tl-focal-x", FOCAL_X);
			scene.appendChild(crest);

			document.body.insertBefore(scene, document.body.firstChild);
			applyPlayback(scene, readPlayback());

			const disposers = [];

			const markReady = () => {
				video.dataset.tlReady = "";
				// B4: the incoming layer has a decodable frame NOW; that is when the
				// transition starts, never when the request was merely issued.
				startTransition();
			};
			// Two attributes on purpose: `data-tl-state` is the coarse legacy contract the
			// quality line already keys off; `data-tl-play` is the detailed state the
			// recovery bar needs. `data-tl-reason` keeps the failure inspectable from
			// devtools and from the panel without a console.
			const report = (state, playState, reason) => {
				scene.dataset.tlState = state;
				scene.dataset.tlPlay = playState ?? state;
				if (reason === undefined || reason === "") scene.removeAttribute("data-tl-reason");
				else scene.dataset.tlReason = reason;
				publishSceneStatus({ status: playState ?? state, reason: reason ?? "" });
			};
			// ---- ShaderToy-style GLSL channel ----
			// One program, one loop, ~30 fps, pixel ratio capped at 1.25: a fullscreen
			// fragment shader is the most expensive wallpaper, so it runs only while the
			// shader channel is actually active and the page is visible.
			let shaderRenderer = null;
			let shaderActive = false;
			let currentChoice = null;
			let lastGoodChoice = null;
			let shaderRaf = 0;
			let shaderLast = 0;
			let shaderSource = "";
			let shaderParams = readShaderSettings();
			let shaderMouse = [0.5, 0.5];
			// Static-frame mode: a paused video at `still` seconds. The token invalidates
			// pending seek listeners when the user switches wallpaper mid-seek.
			let videoStill = null;
			let videoStillToken = 0;
			let fpsHandle = 0;
			let fpsStart = 0;
			let fpsFrames = 0;
			let fpsLastFrame = 0;
			let fpsMaxGap = 0;
			let stillSeekHandler = null;
			let stillMetaHandler = null;
			// Playback ownership. A pause has an owner: the user (survives visibility),
			// the low-power supervisor, the page being hidden, or a source switch. Only a
			// user pause is remembered across a visibility change.
			let userPaused = false;
			let playBlocked = false;
			let playToken = 0;
			let playAttempts = 0;
			let lastAttemptAt = 0;
			let retryTimer = 0;
			let watchdogTimer = 0;
			let lastFrameAt = 0;
			let heldFrame = "";
			// ---- A3 web wallpaper state ----
			let webActive = false;
			let webTimer = 0;
			let webParked = false;
			// ---- B4 transition state ----
			let transitionTimer = 0;
			let transitionPreset = "fade";
			let transitionDuration = 600;
			// ---- A4 dynamic resolution ----
			let pendingSeekTo = null;
			let resizeTimer = 0;
			let variantToken = 0;
			// ---- C3 adaptive v2 sampler ----
			let adaptiveTimer = 0;
			let adaptiveStill = false;
			let adaptiveStillAt = 0;
			let adaptiveProbe = false;
			let adaptiveLevel = 0;
			let adaptiveLow = 0;
			let adaptiveHigh = 0;
			let adaptiveSamples = 0;
			let adaptiveReason = "";
			// v0.5.3: timestamp of the first low sample in the current streak + the last
			// measured values (for the readable downgrade reason) + the last logged gate.
			let adaptiveLowSince = 0;
			let adaptiveLastFps = 0;
			let adaptiveLastJitter = 0;
			let adaptiveGateKey = "";
			let shaderFrameTicks = 0;
			let shaderWindowStart = 0;
			let shaderLastPaint = 0;
			let shaderMaxGap = 0;
			let shaderProbeAt = 0;
			// ---- A5 frame cache bookkeeping ----
			let cachePrimeToken = 0;
			const clearStillHandlers = () => {
				if (stillSeekHandler !== null) {
					video.removeEventListener("seeked", stillSeekHandler);
					stillSeekHandler = null;
				}
				if (stillMetaHandler !== null) {
					video.removeEventListener("loadedmetadata", stillMetaHandler);
					stillMetaHandler = null;
				}
			};
			// A 32x18 2D copy made in the same task as the draw: the WebGL buffer is not
			// preserved, so this is the only reliable source for the panel tint/sidebar.
			const shaderSwatch = document.createElement("canvas");
			shaderSwatch.width = 32;
			shaderSwatch.height = 18;
			let shaderSwatchCtx = null;
			try {
				shaderSwatchCtx = shaderSwatch.getContext("2d", { willReadFrequently: true });
			} catch {
				shaderSwatchCtx = null;
			}
			let shaderSwatchTick = 0;
			const snapshotShader = () => {
				if (shaderSwatchCtx === null) return;
				try {
					shaderSwatchCtx.drawImage(shaderCanvas, 0, 0, shaderSwatch.width, shaderSwatch.height);
				} catch {
					// a lost context must not break the loop
				}
			};
			const shaderPixelRatio = () => Math.min(1.25, Math.max(1, globalThis.devicePixelRatio || 1));
			/** C3: the adaptive sampler may lower the shader budget below the saved tier. */
			function effectiveShaderCap() {
				const base = effectiveShaderFps();
				return adaptiveLevel > 0 ? Math.min(base, adaptiveLevel) : base;
			}
			function paintShader(now) {
				if (shaderRenderer === null) return;
				const ratio = shaderPixelRatio();
				shaderRenderer.resize(globalThis.innerWidth * ratio, globalThis.innerHeight * ratio);
				shaderRenderer.render(now / 1000, shaderParams, shaderMouse, audioController.level());
				// Real rendered fps for the adaptive sampler: the render tier is only the
				// requested budget, not what the GPU managed.
				shaderFrameTicks += 1;
				if (shaderLastPaint > 0) {
					const gap = now - shaderLastPaint;
					if (gap > shaderMaxGap) shaderMaxGap = gap;
				}
				shaderLastPaint = now;
			}
			function stopShaderLoop() {
				if (shaderRaf !== 0) globalThis.cancelAnimationFrame(shaderRaf);
				shaderRaf = 0;
			}
			function startShaderLoop() {
				if (shaderActive === false || shaderRenderer === null || shaderRaf !== 0) return;
				const step = (now) => {
					shaderRaf = 0;
					if (shaderActive === false || document.hidden) return;
					if (document.body !== null && document.body.hasAttribute("data-tl-lowpower")) return;
					if (now - shaderLast >= 1000 / effectiveShaderCap()) {
						shaderLast = now;
						try {
							paintShader(now);
						} catch (error) {
							note("shader:render", error);
							return;
						}
						shaderSwatchTick += 1;
						if (shaderSwatchTick % 60 === 0) snapshotShader();
					}
					shaderRaf = globalThis.requestAnimationFrame(step);
				};
				shaderRaf = globalThis.requestAnimationFrame(step);
			}
			// A lost GPU context must degrade to the scene gradient instead of leaving a
			// frozen/black canvas; the saved ShaderToy choice means re-applying rebuilds it.
			const onShaderContextLost = (event) => {
				event.preventDefault();
				shaderActive = false;
				stopShaderLoop();
				if (shaderRenderer !== null) {
					try {
						shaderRenderer.dispose();
					} catch {
						// the context is already gone
					}
				}
				shaderRenderer = null;
				shaderSource = "";
				shaderCanvas.hidden = true;
				scene.removeAttribute("data-tl-shader-on");
				if (wallpaperController !== null) wallpaperController.shaderSwatch = null;
				audioController.stop(TL_T("audio.stopContext"));
				report("error", "error", "context-lost");
				note("shader:context-lost");
			};
			const onShaderContextRestored = () => {
				note("shader:context-restored");
			};
			shaderCanvas.addEventListener("webglcontextlost", onShaderContextLost);
			shaderCanvas.addEventListener("webglcontextrestored", onShaderContextRestored);
			disposers.push(() => {
				shaderCanvas.removeEventListener("webglcontextlost", onShaderContextLost);
				shaderCanvas.removeEventListener("webglcontextrestored", onShaderContextRestored);
			});
			const onShaderPointer = (event) => {
				if (shaderActive === false) return;
				shaderMouse = [
					Math.min(1, Math.max(0, event.clientX / (globalThis.innerWidth || 1))),
					Math.min(1, Math.max(0, 1 - event.clientY / (globalThis.innerHeight || 1))),
				];
			};
			window.addEventListener("pointermove", onShaderPointer, { passive: true });

			// ---- optional scene channel (WebWallGL adapter in a sandboxed iframe) ----
			// The adapter owns the engine; this side owns policy: first-frame timeout,
			// strict source check on postMessage, pause/resume, and the fallback chain.
			let sceneFrameActive = false;
			let sceneFrameTimer = 0;
			let sceneFrameLastStats = 0;
			const postSceneFrame = (payload) => {
				if (sceneFrameActive === false) return;
				try {
					sceneFrame.contentWindow?.postMessage({ __tlCommand: true, ...payload }, "*");
				} catch {
					// a torn-down frame is not an error worth surfacing
				}
			};
			const clearSceneFrameTimer = () => {
				if (sceneFrameTimer !== 0) {
					window.clearTimeout(sceneFrameTimer);
					sceneFrameTimer = 0;
				}
			};
			const stopSceneFrame = () => {
				sceneFrameActive = false;
				clearSceneFrameTimer();
				sceneFrameLastStats = 0;
				sceneFrame.hidden = true;
				scene.removeAttribute("data-tl-scene-fps");
				scene.removeAttribute("data-tl-fps");
				try {
					sceneFrame.src = "about:blank";
				} catch {
					// detaching a frame is best effort
				}
			};
			const failSceneFrame = (reason) => {
				if (sceneFrameActive === false) return;
				const failed = currentChoice;
				stopSceneFrame();
				report("error", "error", reason);
				if (
					lastGoodChoice !== null &&
					(currentChoice === null || lastGoodChoice.url !== currentChoice.url || lastGoodChoice.kind !== currentChoice.kind)
				) {
					const restore = lastGoodChoice;
					lastGoodChoice = null;
					applyWallpaper(restore);
					return;
				}
				// No known-good source: let the automatic chain pick a playable wallpaper
				// instead of leaving the scene gradient behind a failure message.
				void resolveAutoWallpaper().then((fallback) => {
					if (fallback !== null && (failed === null || fallback.url !== failed.url)) applyWallpaper(fallback);
				});
			};
			const onSceneMessage = (event) => {
				if (sceneFrameActive === false) return;
				if (event.source !== sceneFrame.contentWindow) return;
				const data = event.data;
				if (data === null || typeof data !== "object" || data.__tlScene !== true) return;
				if (data.type === "ready") {
					clearSceneFrameTimer();
					sceneFrameLastStats = performance.now();
					if (currentChoice === null || currentChoice.kind !== "scene") return;
					lastGoodChoice = currentChoice;
					// A persisted pause, low power or a hidden tab must win over the engine's
					// autoplay; the adapter already starts paused when asked via query.
					if (userPaused || hasLowPower() || document.hidden) {
						postSceneFrame({ type: "pause" });
						if (userPaused) report("paused", "paused", "user");
						else if (hasLowPower()) report("paused", "lowpower", "lowpower");
						else report("paused", "hidden");
						return;
					}
					startTransition();
					report("ready", "playing");
					// The mount URL may carry `paused=1` from an earlier state; an explicit
					// resume is idempotent and makes the visible state authoritative.
					postSceneFrame({ type: "resume" });
					return;
				}
				if (data.type === "error") {
					failSceneFrame(String(data.reason ?? "scene-error").slice(0, 240));
					return;
				}
				if (data.type === "stats") {
					sceneFrameLastStats = performance.now();
					if (userPaused || hasLowPower() || document.hidden) return;
					const fps = Math.max(0, Math.round(Number(data.fps) || 0));
					if (fps > 0) {
						scene.dataset.tlFps = String(fps);
						publishSceneStatus({ fps });
					}
				}
			};
			window.addEventListener("message", onSceneMessage);
			disposers.push(() => {
				window.removeEventListener("message", onSceneMessage);
				stopSceneFrame();
			});
			const mountSceneFrame = (choice) => {
				stopSceneFrame();
				sceneFrameActive = true;
				sceneFrame.hidden = false;
				scene.dataset.tlMedia = "scene";
				scene.dataset.tlFile = choice.url.slice(choice.url.lastIndexOf("/") + 1) || "scene";
				report("loading", "loading");
				sceneFrameLastStats = performance.now();
				sceneFrameTimer = window.setTimeout(() => failSceneFrame("scene-timeout"), 20000);
				const fps = effectiveShaderFps();
				const paused = userPaused || hasLowPower() || document.hidden;
				scene.setAttribute("data-tl-scene-fps", String(fps));
				sceneFrame.src =
					ASSET_BASE +
					"/_scene-frame?project=" +
					encodeURIComponent(choice.url) +
					"&fps=" +
					String(fps) +
					(paused ? "&paused=1" : "");
			};

			// ---- A3 web wallpaper: mount / park / fail ----
			const clearWebTimer = () => {
				if (webTimer !== 0) {
					window.clearTimeout(webTimer);
					webTimer = 0;
				}
			};
			/** Navigating away is the only reliable stop for a sandboxed project. */
			const unloadWebFrame = () => {
				webFrame.hidden = true;
				scene.removeAttribute("data-tl-web-on");
				try {
					webFrame.src = "about:blank";
				} catch {
					// detaching a frame is best effort
				}
			};
			const stopWebWallpaper = () => {
				webActive = false;
				webParked = false;
				clearWebTimer();
				unloadWebFrame();
			};
			const parkWebWallpaper = (owner) => {
				if (webActive === false) return;
				webActive = false;
				webParked = true;
				clearWebTimer();
				unloadWebFrame();
				if (owner === "user") report("paused", "paused", "user");
				else if (hasLowPower()) report("paused", "lowpower", "lowpower");
				else if (document.hidden) report("paused", "hidden");
				else report("paused", "paused");
			};
			const onWebLoad = () => {
				if (webActive === false) return;
				let loadedSrc = "";
				try {
					loadedSrc = String(webFrame.src ?? "");
				} catch {
					loadedSrc = "";
				}
				// The park path loads about:blank; that is not a rendered wallpaper.
				if (loadedSrc === "" || loadedSrc.startsWith("about:")) return;
				clearWebTimer();
				if (currentChoice === null || currentChoice.kind !== "web") return;
				lastGoodChoice = currentChoice;
				webParked = false;
				scene.dataset.tlWidth = String(Math.round(globalThis.innerWidth || 0));
				scene.dataset.tlHeight = String(Math.round(globalThis.innerHeight || 0));
				scene.removeAttribute("data-tl-duration");
				if (userPaused || hasLowPower() || document.hidden) {
					parkWebWallpaper(userPaused ? "user" : hasLowPower() ? "lowpower" : "hidden");
					return;
				}
				markReady();
				report("ready", "playing");
				startTransition();
			};
			const onWebError = () => {
				if (webActive === false) return;
				failWebWallpaper("web-error");
			};
			const failWebWallpaper = (reason) => {
				if (webActive === false && webParked === false) return;
				const failed = currentChoice;
				stopWebWallpaper();
				report("error", "error", reason);
				if (
					lastGoodChoice !== null &&
					(failed === null || lastGoodChoice.url !== failed.url || lastGoodChoice.kind !== failed.kind)
				) {
					const restore = lastGoodChoice;
					lastGoodChoice = null;
					applyWallpaper(restore);
					return;
				}
				// No known-good source: the automatic chain must replace the failure, never a
				// blank scene gradient behind an error message.
				void resolveAutoWallpaper().then((fallback) => {
					if (fallback !== null && (failed === null || fallback.url !== failed.url)) applyWallpaper(fallback);
				});
			};
			const mountWebWallpaper = (choice) => {
				const src = webWallpaperSrc(choice.url);
				stopSceneFrame();
				stopWebWallpaper();
				if (src === "") {
					report("error", "error", "web-url");
					return;
				}
				webParked = false;
				scene.dataset.tlMedia = "web";
				// A persisted pause / low power / hidden tab must not load (and immediately
				// discard) a whole sandboxed project; park first, mount on resume.
				if (userPaused || hasLowPower() || document.hidden) {
					webActive = false;
					webParked = true;
					unloadWebFrame();
					if (userPaused) report("paused", "paused", "user");
					else if (hasLowPower()) report("paused", "lowpower", "lowpower");
					else report("paused", "hidden");
					return;
				}
				webActive = true;
				webFrame.hidden = false;
				scene.setAttribute("data-tl-web-on", "");
				report("loading", "loading");
				// A sandboxed 404 page still fires `load`, so probe the route first: a host
				// without `_web-project` must fall back at once instead of after 20 seconds.
				void fetch(src, { method: "HEAD", cache: "no-store" })
					.then((response) => {
						// Only a definitive "route/file missing" fails here; a host that
						// answers HEAD with 405 must still get its chance via the iframe load.
						if (response.status !== 404 && response.status !== 410 && response.status !== 501) return;
						if (currentChoice !== null && currentChoice.url === choice.url) failWebWallpaper("web-http-" + response.status);
					})
					.catch(() => {
						if (currentChoice !== null && currentChoice.url === choice.url) failWebWallpaper("web-http");
					});
				webTimer = window.setTimeout(() => failWebWallpaper("web-timeout"), 20000);
				try {
					webFrame.src = src;
				} catch {
					failWebWallpaper("web-load");
				}
			};
			webFrame.addEventListener("load", onWebLoad);
			webFrame.addEventListener("error", onWebError);
			disposers.push(() => {
				webFrame.removeEventListener("load", onWebLoad);
				webFrame.removeEventListener("error", onWebError);
				stopWebWallpaper();
			});

			// ---- B4 transitions: preset + duration around every source swap ----
			/**
			 * The preset lives in transitionController (31-engine-extra). Reading it here,
			 * lazily, keeps 30 independent of fragment evaluation order: the controller is
			 * referenced only when a wallpaper actually swaps.
			 */
			function readTransitionSettings() {
				let state = null;
				try {
					if (typeof transitionController !== "undefined" && transitionController !== null && typeof transitionController.read === "function") {
						state = transitionController.read();
					}
				} catch {
					state = null;
				}
				const preset = state !== null && typeof state.preset === "string" ? state.preset : "fade";
				const duration = state !== null && Number.isFinite(state.durationMs) ? state.durationMs : 600;
				return {
					preset: ["fade", "slide", "zoom", "dissolve"].includes(preset) ? preset : "fade",
					durationMs: Math.min(1500, Math.max(200, Math.round(duration))),
				};
			}
			function transitionsAllowed() {
				if (hasLowPower()) return false;
				try {
					if (typeof globalThis.matchMedia === "function" && globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches === true) {
						return false;
					}
				} catch {
					// a missing matchMedia is not a reason to disable transitions
				}
				return true;
			}
			function clearTransition() {
				if (transitionTimer !== 0) {
					window.clearTimeout(transitionTimer);
					transitionTimer = 0;
				}
				scene.removeAttribute("data-tl-transition");
			}
			/** The outgoing still is done: drop its role so the layer settles hidden. */
			function finishHeldPhoto() {
				if (photo.dataset.tlPhotoRole !== "held") return;
				photo.removeAttribute("data-tl-photo-role");
				if (currentChoice === null || currentChoice.kind !== "image") {
					photo.removeAttribute("data-tl-ready");
					photo.hidden = true;
					photo.style.removeProperty("background-image");
				}
			}
			/**
			 * Called when the incoming source is actually decodable. Starting here (not at
			 * request time) means the animation never plays against a still-black layer.
			 */
			function startTransition() {
				clearTransition();
				if (transitionsAllowed() === false) {
					finishHeldPhoto();
					return;
				}
				scene.style.setProperty("--tl-tx-ms", transitionDuration + "ms");
				void scene.offsetHeight; // restart a still-running CSS animation on a fast switch
				scene.setAttribute("data-tl-transition", transitionPreset);
				transitionTimer = window.setTimeout(() => {
					transitionTimer = 0;
					scene.removeAttribute("data-tl-transition");
					finishHeldPhoto();
				}, transitionDuration + 80);
			}
			function requestTransition() {
				const settings = readTransitionSettings();
				transitionPreset = settings.preset;
				transitionDuration = settings.durationMs;
				clearTransition();
			}

			// ---- A5 frame cache: pre-paint under a loading video ----
			/**
			 * The cached still is only used while there is no live frame yet: once the
			 * real video decodes, `releaseHeldFrame` fades the photo layer out.
			 */
			function primeFrameCache(choice) {
				if (choice === null || choice.kind !== "video") return;
				const token = (cachePrimeToken += 1);
				void frameCacheController.lookup(choice).then((cached) => {
					if (cached === null || token !== cachePrimeToken) return;
					if (currentChoice === null || currentChoice.url !== choice.url) return;
					if (video.readyState >= 2 || heldFrame !== "") return;
					heldFrame = "cache";
					photo.dataset.tlPhotoRole = "held";
					photo.style.backgroundImage = 'url("' + cached.url.replace(/["\\)]/g, "") + '")';
					photo.dataset.tlReady = "";
					photo.hidden = false;
					// Diagnostic only: a note() here would log on every wallpaper load.
					tl5Diag("cache", { prepaint: cached.key });
				});
			}

			// ---- A4 dynamic resolution: pick / switch the encode of the logical wallpaper ----
			function syncResolutionDataset() {
				const label = resolutionLabel();
				if (scene.dataset.tlResolution !== label) scene.dataset.tlResolution = label;
			}
			function applyVariantDatasets(resolved) {
				if (resolved === null) {
					scene.removeAttribute("data-tl-variant");
					scene.removeAttribute("data-tl-variants");
					return;
				}
				scene.dataset.tlVariant = resolved.tier;
				scene.dataset.tlVariants = resolved.tiers.join(",");
			}
			function variantForChoice(choice, items) {
				if (choice === null || typeof choice !== "object" || choice.kind !== "video") return null;
				return resolveVariantChoice(choice, groupVariantItems(items));
			}
			/** Switches encode without touching the saved choice (logical wallpaper stays). */
			function switchVariant(nextChoice) {
				if (currentChoice === null || currentChoice.kind !== "video") return;
				const seek = video.currentTime;
				applyWallpaper(nextChoice, {
					seekTo: Number.isFinite(seek) ? seek : null,
					variantSwitch: true,
				});
			}
			async function maybeApplyVariant(choice) {
				const token = (variantToken += 1);
				syncResolutionDataset();
				if (choice === null || typeof choice !== "object" || choice.kind !== "video") {
					applyVariantDatasets(null);
					return;
				}
				const items = await readCatalog();
				if (token !== variantToken) return;
				if (currentChoice === null || currentChoice.kind !== "video") return;
				if (items === null) {
					applyVariantDatasets(null);
					return;
				}
				const resolved = variantForChoice(currentChoice, items);
				applyVariantDatasets(resolved);
				if (resolved === null || resolved.changed === false) return;
				if (currentChoice.url !== choice.url) return;
				if (videoStill !== null || userPaused || hasLowPower() || document.hidden) return;
				switchVariant(resolved.choice);
			}
			async function onResolutionSettled() {
				syncResolutionDataset();
				if (currentChoice === null || currentChoice.kind !== "video") return;
				if (videoStill !== null || userPaused || hasLowPower() || document.hidden) return;
				if (video.readyState === 0) return;
				const items = await readCatalog();
				if (items === null || currentChoice === null || currentChoice.kind !== "video") return;
				const resolved = variantForChoice(currentChoice, items);
				applyVariantDatasets(resolved);
				if (resolved !== null && resolved.changed) switchVariant(resolved.choice);
			}
			let resizeRaf = 0;
			const onWindowResize = () => {
				// The window may resize for many frames; one coalesced handler is enough.
				if (resizeRaf !== 0) return;
				resizeRaf = globalThis.requestAnimationFrame(() => {
					resizeRaf = 0;
					syncResolutionDataset();
				});
				if (resizeTimer !== 0) window.clearTimeout(resizeTimer);
				resizeTimer = window.setTimeout(() => {
					resizeTimer = 0;
					void onResolutionSettled();
				}, 400);
			};
			window.addEventListener("resize", onWindowResize, { passive: true });

			// ---- C3 performance-adaptive v2 ----
			/** Context/module/lock gate: false means "do not touch the scene". */
			function adaptiveAllowed() {
				try {
					if (
						typeof moduleController !== "undefined" &&
						moduleController !== null &&
						typeof moduleController.isEnabled === "function" &&
						moduleController.isEnabled("context") === false
					) {
						return false;
					}
				} catch {
					// a missing module layer means the context switch cannot veto; allow
				}
				let context = null;
				try {
					if (typeof contextController !== "undefined" && contextController !== null && typeof contextController.state === "function") {
						context = contextController.state();
					}
				} catch {
					context = null;
				}
				if (context === null || typeof context !== "object") return true;
				if (context.adaptive === false) return false;
				if (context.adaptiveLocked === true) return false;
				return true;
			}
			function publishAdaptiveStatus(reasonText, level, kind, fps, jitter) {
				adaptiveReason = reasonText;
				scene.dataset.tlAdaptive = reasonText;
				publishAdaptive({ active: true, kind, level, reason: reasonText, fps, jitter });
			}
			/**
			 * Restores the un-adapted state. Called when the context toggle/lock turns the
			 * sampler off, when the user explicitly resumes, and after sustained recovery.
			 */
			function clearAdaptive(why, silent) {
				const wasActive = adaptiveStill || adaptiveLevel !== 0 || adaptiveReason !== "";
				// Called on every wallpaper switch and every sampler tick while disabled;
				// once there is nothing to restore this must cost no DOM/diag writes.
				if (wasActive === false) return;
				adaptiveStill = false;
				adaptiveProbe = false;
				adaptiveLevel = 0;
				adaptiveLow = 0;
				adaptiveLowSince = 0;
				adaptiveHigh = 0;
				adaptiveSamples = 0;
				adaptiveStillAt = 0;
				adaptiveReason = "";
				scene.removeAttribute("data-tl-adaptive");
				publishAdaptive({ ...ADAPTIVE_DEFAULTS });
				if (wasActive === false) return;
				note("adaptive:cleared", why);
				if (silent === true || currentChoice === null) return;
				if (currentChoice.kind === "shader") {
					if (shaderActive && !video.paused) report("playing", "playing");
					return;
				}
				if (currentChoice.kind === "video") {
					if (userPaused || hasLowPower() || document.hidden) return;
					attemptPlay("adaptive");
				}
			}
			/**
			 * Video -> static frame at the current time: a paused element freezes for free.
			 * v0.5.3: every park resets the probe clock, so a failed probe re-parks and then
			 * waits the full 5 minute cooldown instead of chaining downgrades.
			 */
			function downgradeVideoToStatic(fps, jitter, why) {
				const wasStill = adaptiveStill;
				adaptiveStill = true;
				adaptiveStillAt = performance.now();
				adaptiveProbe = false;
				adaptiveLow = 0;
				adaptiveLowSince = 0;
				adaptiveHigh = 0;
				adaptiveSamples = 0;
				const reason = TL_T("engine.adaptive.staticReason", { fps: Math.round(fps) });
				try {
					video.pause();
				} catch {
					// a detached video cannot throw anything worth surfacing
				}
				publishAdaptiveStatus(reason, 0, "video", fps, jitter);
				report("still", "still", reason);
				// One note per state transition only (v0.5.3: no per-sample/per-probe spam).
				if (wasStill === false) note("adaptive:video-static", { fps: Math.round(fps), jitter, why: why ?? "sustained-low" });
			}
			function limitShaderFps(fps, jitter, cap) {
				const previous = adaptiveLevel;
				adaptiveLevel = Math.max(15, Math.round(cap));
				const reason = TL_T("engine.adaptive.fpsReason", { fps: Math.round(fps), cap: adaptiveLevel });
				publishAdaptiveStatus(reason, adaptiveLevel, "shader", fps, jitter);
				publishSceneStatus({ reason });
				scene.dataset.tlReason = reason;
				if (previous !== adaptiveLevel) note("adaptive:shader-fps", { fps: Math.round(fps), cap: adaptiveLevel });
			}
			/** Samples the channels that can actually be measured right now. */
			function collectAdaptiveSample() {
				if (sceneFrameActive) {
					const fps = Number(scene.dataset.tlFps) || 0;
					return fps > 0 ? { fps, jitter: 0 } : null;
				}
				if (currentChoice !== null && currentChoice.kind === "shader" && shaderActive) {
					const now = performance.now();
					const elapsed = now - (shaderWindowStart || now - 2000);
					shaderWindowStart = now;
					const fps = elapsed > 200 ? Math.round((shaderFrameTicks * 1000) / elapsed) : 0;
					const jitter = Math.round(shaderMaxGap);
					shaderFrameTicks = 0;
					shaderMaxGap = 0;
					return fps > 0 ? { fps, jitter } : null;
				}
				if (currentChoice !== null && currentChoice.kind === "video" && video.paused === false) {
					const fps = Number(scene.dataset.tlFps) || 0;
					const jitter = Number(scene.dataset.tlJitter) || 0;
					return fps > 0 ? { fps, jitter } : null;
				}
				return null;
			}
			/**
			 * v0.5.3 sampling gate: a background/occluded/minimized window reports near-zero
			 * fps, which is what froze the live 4K wallpaper in v0.5.2. Never sample there.
			 */
			function adaptiveEligible() {
				let focused = true;
				try {
					focused = typeof document.hasFocus === "function" ? document.hasFocus() === true : true;
				} catch {
					focused = false;
				}
				const hidden = document.hidden === true;
				const visible = hidden === false && (document.visibilityState === undefined || document.visibilityState === "visible");
				const lowPower = hasLowPower();
				return {
					eligible: focused && visible && lowPower === false && userPaused === false,
					focused,
					visible,
					hidden,
					lowPower,
					userPaused,
				};
			}
			function adaptiveTick() {
				if (scene.isConnected === false) return;
				if (adaptiveAllowed() === false) {
					// The module switch / the user's adaptive toggle or lock is authoritative:
					// park an automatic downgrade instead of keeping it stuck.
					clearAdaptive("context-off");
					return;
				}
				if (currentChoice === null) return;
				// A loading/buffering frame-rate sample describes network/decode, not GPU
				// headroom; acting on it would downgrade a wallpaper that is merely fetching.
				if (scene.dataset.tlPlay === "loading" || scene.dataset.tlPlay === "buffering") return;
				const gate = adaptiveEligible();
				const gateKey =
					(gate.focused ? "f" : "-") +
					(gate.visible ? "v" : "-") +
					(gate.lowPower ? "l" : "-") +
					(gate.userPaused ? "u" : "-") +
					(gate.eligible ? "1" : "0");
				if (gateKey !== adaptiveGateKey) {
					adaptiveGateKey = gateKey;
					// Focus/visibility included in the diagnostics payload; only on change.
					tl5Diag("engine", { adaptiveGate: gate });
				}
				const now = performance.now();
				const sample = gate.eligible ? collectAdaptiveSample() : null;
				if (sample !== null) {
					adaptiveLastFps = Number(sample.fps) || 0;
					adaptiveLastJitter = Number(sample.jitter) || 0;
					adaptiveSamples += 1;
					if (adaptiveSampleIsLow(sample)) {
						if (adaptiveLow === 0) adaptiveLowSince = now;
						adaptiveLow += 1;
					} else {
						adaptiveLow = 0;
						adaptiveLowSince = 0;
					}
					adaptiveHigh = Number(sample.fps) >= ADAPTIVE_RECOVER_FPS ? adaptiveHigh + 1 : 0;
				}
				const decision = adaptiveDecision({
					eligible: gate.eligible,
					autoAllowed: true,
					kind: currentChoice.kind,
					still: adaptiveStill,
					probe: adaptiveProbe,
					now,
					stillAt: adaptiveStillAt,
					sample,
					lowStreak: adaptiveLow,
					lowSince: adaptiveLowSince,
					highStreak: adaptiveHigh,
					samples: adaptiveSamples,
					level: adaptiveLevel,
				});
				if (decision.action === "start-probe") {
					adaptiveProbe = true;
					adaptiveStill = false;
					adaptiveStillAt = now;
					adaptiveLow = 0;
					adaptiveLowSince = 0;
					adaptiveHigh = 0;
					adaptiveSamples = 0;
					attemptPlay("adaptive-probe");
					// Routine bookkeeping: diag only, no console note (v0.5.3 quiet console).
					tl5Diag("engine", { adaptiveProbe: { startedAt: now, cooldownMs: ADAPTIVE_PROBE_COOLDOWN_MS } });
					return;
				}
				if (decision.action === "probe-fail") {
					// Re-park; downgradeVideoToStatic resets stillAt => full new cooldown.
					downgradeVideoToStatic(adaptiveLastFps, adaptiveLastJitter, "probe-failed");
					return;
				}
				if (decision.action === "recover") {
					adaptiveProbe = false;
					clearAdaptive("recovered");
					return;
				}
				if (decision.action === "downgrade") {
					downgradeVideoToStatic(adaptiveLastFps, adaptiveLastJitter, "sustained-low");
					return;
				}
				if (currentChoice.kind === "shader" && (decision.action === "limit-shader" || decision.action === "raise-shader")) {
					const base = effectiveShaderFps();
					const current = adaptiveLevel > 0 ? adaptiveLevel : base;
					if (decision.action === "limit-shader") {
						const nextCap = Math.max(15, Math.round(current / 2));
						if (nextCap < current) limitShaderFps(adaptiveLastFps, adaptiveLastJitter, nextCap);
					} else {
						const restored = Math.min(base, adaptiveLevel * 2);
						if (restored >= base) clearAdaptive("shader-recovered");
						else limitShaderFps(adaptiveLastFps, adaptiveLastJitter, restored);
					}
					return;
				}
				// Shader 15fps probe: 5 minute cooldown (v0.5.3, was 60s); diag only.
				if (
					currentChoice.kind === "shader" &&
					adaptiveLevel > 0 &&
					adaptiveLevel <= 15 &&
					gate.eligible &&
					now - shaderProbeAt >= ADAPTIVE_PROBE_COOLDOWN_MS
				) {
					shaderProbeAt = now;
					limitShaderFps(adaptiveLastFps, adaptiveLastJitter, Math.min(effectiveShaderFps(), 30));
				}
			}
			function bindAdaptiveHooks() {
				adaptiveHooks = {
					sync: () => {
						if (scene.isConnected === false) return;
						adaptiveTick();
					},
				};
			}
			bindAdaptiveHooks();
			adaptiveTimer = window.setInterval(adaptiveTick, 2000);
			disposers.push(() => {
				if (adaptiveTimer !== 0) {
					window.clearInterval(adaptiveTimer);
					adaptiveTimer = 0;
				}
				adaptiveHooks = null;
				adaptiveStill = false;
				adaptiveProbe = false;
				adaptiveLevel = 0;
				adaptiveReason = "";
				scene.removeAttribute("data-tl-adaptive");
				publishAdaptive({ ...ADAPTIVE_DEFAULTS });
			});

			/**
			 * The moving wallpaper is the whole point of this skin, so
			 * prefers-reduced-motion only trims decorative CSS animation; it must
			 * never silently park the video on its first frame.
			 *
			 * Low power is the one exception: while the body carries the attribute the
			 * play requests are refused, so a visibility change, a new source or the
			 * autoplay retry cannot silently undo the saving.
			 */
			function hasLowPower() {
				return document.body !== null && document.body.hasAttribute("data-tl-lowpower");
			}
			function wantsPlayback() {
				return (
					currentChoice !== null &&
					currentChoice.kind === "video" &&
					videoStill === null &&
					adaptiveStill === false &&
					userPaused === false &&
					video.hidden === false &&
					document.hidden === false &&
					hasLowPower() === false
				);
			}
			function clearRetry() {
				if (retryTimer !== 0) {
					window.clearTimeout(retryTimer);
					retryTimer = 0;
				}
			}
			function scheduleRetry(delay) {
				if (retryTimer !== 0) return;
				retryTimer = window.setTimeout(() => {
					retryTimer = 0;
					attemptPlay("retry");
				}, delay);
			}
			/**
			 * One place where playback is requested, so the promise's rejection reason can
			 * become visible state instead of a console line. Autoplay rejection is NOT an
			 * error: the browser is waiting for a gesture, and the panel shows that button.
			 * AbortError is a source-switch race and retries by itself.
			 */
			function attemptPlay(source) {
				if (wantsPlayback() === false) return;
				// An explicit click is the one signal that may retry a blocked source.
				if (
					playBlocked === true &&
					source !== "gesture" &&
					source !== "focus" &&
					source !== "visible" &&
					source !== "user"
				) {
					return;
				}
				lastAttemptAt = performance.now();
				playAttempts += 1;
				try {
					// Some browsers reset muted when the element is re-created by the media
					// pipeline; re-assert it so a muted wallpaper is never treated as audible.
					video.muted = true;
				} catch {
					// muting is best effort; the element is already muted by construction
				}
				let promise = null;
				try {
					promise = video.play();
				} catch (error) {
					report("error", "error", String(error?.name ?? "play-failed"));
					return;
				}
				if (promise === null || typeof promise.then !== "function") return;
				const token = (playToken += 1);
				promise
					.then(() => {
						if (token !== playToken) return;
						playBlocked = false;
						playAttempts = 0;
						if (video.paused === false) report("playing", "playing");
					})
					.catch((error) => {
						if (token !== playToken) return;
						const name = String(error?.name ?? "");
						if (name === "AbortError") {
							// A source swap interrupted this request; the new load owns the state.
							scheduleRetry(350);
							return;
						}
						if (name === "NotAllowedError") {
							playBlocked = true;
							report("paused", "blocked", "autoplay");
							note("video:autoplay-blocked", { source });
							return;
						}
						report("error", "error", name === "" ? "play-failed" : name);
						note("video:play-failed", { source, name });
					});
			}
			function start() {
				if (hasLowPower()) return;
				if (sceneFrameActive) return;
				// C3: a static-frame downgrade owns the paused state; the watchdog and a
				// visibility change must not silently undo it.
				if (adaptiveStill) return;
				if (videoStill !== null) return;
				if (shaderActive) {
					startShaderLoop();
					return;
				}
				if (video.hidden || currentChoice === null || currentChoice.kind !== "video") return;
				if (video.paused) attemptPlay("start");
			}
			// The pause must freeze on the current frame: a video element does that for
			// free, which is why low-power mode costs nothing to render.
			scenePlayback = {
				pause: (owner) => {
					if (owner === "user") userPaused = true;
					if (currentChoice !== null && currentChoice.kind === "web") {
						parkWebWallpaper(owner);
						return;
					}
					if (sceneFrameActive) {
						postSceneFrame({ type: "pause" });
						scene.removeAttribute("data-tl-fps");
						if (owner === "user") report("paused", "paused", "user");
						else if (hasLowPower()) report("paused", "lowpower", "lowpower");
						else report("paused", document.hidden ? "hidden" : "paused");
						return;
					}
					stopShaderLoop();
					try {
						video.pause();
					} catch {
						// a detached video cannot throw anything worth surfacing
					}
					if (owner === "user") report("paused", "paused", "user");
					else if (hasLowPower()) report("paused", "lowpower", "lowpower");
					else report("paused", document.hidden ? "hidden" : "paused");
				},
				resume: (owner) => {
					// Low-power/visibility may ask for a resume; a standing user pause wins.
					if (owner !== "user" && readPlayback().paused === true) return;
					userPaused = false;
					// Any resume request (user pause toggle, low-power exit) overrules the
					// static-frame downgrade; the sampler re-evaluates on the next tick.
					if (owner === "user" || adaptiveStill) clearAdaptive("resume");
					if (currentChoice !== null && currentChoice.kind === "web") {
						if (hasLowPower() || document.hidden) return;
						if (webActive === false) mountWebWallpaper(currentChoice);
						report("playing", "playing");
						return;
					}
					if (sceneFrameActive) {
						postSceneFrame({ type: "resume" });
						report("playing", "playing");
						return;
					}
					if (shaderActive) {
						startShaderLoop();
						report("playing", "playing");
						return;
					}
					if (video.hidden || currentChoice === null || currentChoice.kind !== "video") return;
					attemptPlay("user");
				},
				state: () => sceneStatus,
			};
			// The supervisor installs before the scene (it sets the attribute early), so
			// ask it to re-apply now that there is a playback target to pause.
			if (lowPowerController !== null && typeof lowPowerController.sync === "function") lowPowerController.sync();
			/** Keep the last visible frame over the next load so switching never blinks. */
			function releaseHeldFrame() {
				if (heldFrame === "") return;
				heldFrame = "";
				// Fade, don't cut: the photo sits above the video, so removing `data-tl-ready`
				// starts its 900ms opacity transition while the video fades in underneath.
				photo.removeAttribute("data-tl-ready");
			}
			function holdCurrentFrame() {
				if (video.hidden || video.readyState < 2 || video.videoWidth <= 0) return;
				try {
					const scale = Math.min(1, 960 / video.videoWidth);
					const canvas = document.createElement("canvas");
					canvas.width = Math.max(2, Math.round(video.videoWidth * scale));
					canvas.height = Math.max(2, Math.round(video.videoHeight * scale));
					const context = canvas.getContext("2d");
					if (context === null) return;
					context.drawImage(video, 0, 0, canvas.width, canvas.height);
					const frame = canvas.toDataURL("image/jpeg", 0.6);
					if (frame === "" || frame === "data:,") return;
					heldFrame = frame;
					// The role tells the transition CSS which direction this layer animates:
					// "held" is the OUTGOING still, "media" is a still wallpaper being shown.
					photo.dataset.tlPhotoRole = "held";
					photo.style.backgroundImage = 'url("' + frame + '")';
					photo.dataset.tlReady = "";
					photo.hidden = false;
				} catch {
					// A cross-origin frame taints the canvas; the scene gradient holds instead.
					heldFrame = "";
				}
			}
			/**
			 * Switching from a STILL wallpaper to a video has no video frame to capture;
			 * the already-visible photo layer is the outgoing snapshot instead.
			 */
			function captureHeldFromPhoto() {
				if (heldFrame !== "") return;
				if (photo.dataset.tlPhotoRole !== "media" || photo.hidden) return;
				heldFrame = "previous-image";
				photo.dataset.tlPhotoRole = "held";
				photo.dataset.tlReady = "";
			}
			const stopFpsProbe = () => {
				if (fpsHandle !== 0 && typeof video.cancelVideoFrameCallback === "function") {
					try {
						video.cancelVideoFrameCallback(fpsHandle);
					} catch {
						// an already-finished callback is fine
					}
				}
				fpsHandle = 0;
				fpsStart = 0;
				fpsFrames = 0;
				fpsLastFrame = 0;
				fpsMaxGap = 0;
			};
			const startFpsProbe = () => {
				if (typeof video.requestVideoFrameCallback !== "function" || fpsHandle !== 0 || video.paused) return;
				const probe = (now) => {
					fpsHandle = 0;
					if (video.paused || document.hidden) return;
					// Frames are flowing again: a previous stall report must not stick.
					if (scene.dataset.tlPlay === "stalled") report("playing", "playing");
					lastFrameAt = now;
					if (fpsLastFrame !== 0) {
						const gap = now - fpsLastFrame;
						if (gap > fpsMaxGap) fpsMaxGap = gap;
					}
					fpsLastFrame = now;
					if (fpsStart === 0) {
						fpsStart = now;
						fpsFrames = 0;
					}
					fpsFrames += 1;
					const elapsed = now - fpsStart;
					if (elapsed >= 1000) {
						const fps = Math.max(0, Math.round((fpsFrames * 1000) / elapsed));
						const jitter = Math.max(0, Math.round(fpsMaxGap));
						scene.dataset.tlFps = String(fps);
						scene.dataset.tlJitter = String(jitter);
						publishSceneStatus({ fps, jitter });
						fpsStart = now;
						fpsFrames = 0;
						fpsMaxGap = 0;
					}
					fpsHandle = video.requestVideoFrameCallback(probe);
				};
				fpsHandle = video.requestVideoFrameCallback(probe);
			};
			const onLoaded = () => {
				// A resolution switch keeps the playback position instead of restarting the
				// video from zero; only a real wallpaper change starts at the beginning.
				if (pendingSeekTo !== null) {
					const target = pendingSeekTo;
					pendingSeekTo = null;
					try {
						if (Number.isFinite(video.duration) && video.duration > 0) {
							video.currentTime = Math.min(Math.max(0, target), Math.max(0, video.duration - 0.05));
						}
					} catch {
						// seeking before metadata is best effort; playback continues anyway
					}
				}
				// The new source has a frame: the held previous frame has done its job.
				// Keeping it past this point would show the OLD wallpaper over a new one
				// that failed to autoplay, which reads as "the switch did nothing".
				releaseHeldFrame();
				if (video.videoWidth > 0 && video.videoHeight > 0) {
					scene.dataset.tlWidth = String(video.videoWidth);
					scene.dataset.tlHeight = String(video.videoHeight);
				}
				if (Number.isFinite(video.duration) && video.duration > 0) {
					scene.dataset.tlDuration = String(Math.round(video.duration));
				}
				if (currentChoice !== null) lastGoodChoice = currentChoice;
				if (!video.paused) startFpsProbe();
				applyPlayback(scene, readPlayback());
				markReady();
				report("ready", userPaused ? "paused" : video.paused ? "ready" : "playing", userPaused ? "user" : "");
				// A5: snapshot this frame for the next load of the same wallpaper.
				const captured = currentChoice;
				if (captured !== null && captured.kind === "video" && video.readyState >= 2) {
					captureFrameCache(captured, video, () => currentChoice !== null && currentChoice.url === captured.url);
				}
				start();
			};
			const onPlaying = () => {
				releaseHeldFrame();
				lastFrameAt = performance.now();
				playBlocked = false;
				playAttempts = 0;
				report("playing", "playing");
				startFpsProbe();
			};
			const onPause = () => {
				stopFpsProbe();
				scene.removeAttribute("data-tl-fps");
				scene.removeAttribute("data-tl-jitter");
				publishSceneStatus({ fps: 0, jitter: 0 });
				// C3 paused the video itself; the reason must survive this event.
				if (adaptiveStill) {
					report("still", "still", adaptiveReason);
					return;
				}
				if (hasLowPower()) report("paused", "lowpower", "lowpower");
				else if (document.hidden) report("paused", "hidden");
				else if (userPaused) report("paused", "paused", "user");
				else report(video.ended ? "ended" : "paused", "paused");
			};
			const onWaiting = () => {
				if (userPaused || hasLowPower() || document.hidden) return;
				report("loading", "buffering");
			};
			const onError = () => {
				const code = video.error?.code;
				stopFpsProbe();
				scene.removeAttribute("data-tl-fps");
				scene.removeAttribute("data-tl-jitter");
				// Keep the failure inspectable from devtools instead of failing silent.
				console.error("[ui-skin-tianlight] wallpaper error", code, video.currentSrc || video.src);
				report("error", "error", code === undefined ? "decode" : "media-" + code);
				// Try the next candidate once, then restore the last source that actually
				// produced a frame. A missing/unsupported replacement must never leave the
				// background blank while a known-good wallpaper is still available.
				const index = VIDEO_CANDIDATES.findIndex(
					(candidate) => video.currentSrc.endsWith(candidate.file) || video.src.endsWith(candidate.file),
				);
				const next = VIDEO_CANDIDATES[index + 1];
				if (index >= 0 && next !== undefined) {
					video.src = ASSET_BASE + "/" + next.file;
					start();
					return;
				}
				if (
					lastGoodChoice !== null &&
					(currentChoice === null || lastGoodChoice.url !== currentChoice.url || lastGoodChoice.kind !== currentChoice.kind)
				) {
					const restore = lastGoodChoice;
					lastGoodChoice = null;
					applyWallpaper(restore);
				}
			};
			const onVisibility = () => {
				if (document.hidden) {
					if (sceneFrameActive) postSceneFrame({ type: "pause" });
					video.pause();
					// A web project cannot be frozen from outside: unload it, remount on show.
					if (currentChoice !== null && currentChoice.kind === "web") parkWebWallpaper("hidden");
					report("paused", "hidden");
				} else if (userPaused === false) {
					// v0.5.3: an automatic C3 downgrade measured while the tab was hidden is
					// stale; a visible tab must not come back to a frozen frame.
					clearAdaptive("visible");
					if (sceneFrameActive) {
						postSceneFrame({ type: "resume" });
						report("playing", "playing");
					}
					if (currentChoice !== null && currentChoice.kind === "web" && !hasLowPower() && webActive === false) {
						mountWebWallpaper(currentChoice);
					}
					start();
				}
			};
			const onResumeSignal = () => {
				if (document.hidden || userPaused) return;
				// v0.5.3: refocusing the window clears any automatic downgrade immediately;
				// C3 may only downgrade again after a fresh focused 5-sample/10s streak.
				clearAdaptive("refocus");
				if (sceneFrameActive) {
					postSceneFrame({ type: "resume" });
					report("playing", "playing");
				}
				if (currentChoice !== null && currentChoice.kind === "web" && !hasLowPower() && webActive === false) {
					mountWebWallpaper(currentChoice);
				}
				start();
			};
			// A gesture anywhere on the page is enough to satisfy the autoplay policy, but
			// only if we hear it. Capture phase keeps a host handler that calls
			// stopPropagation() from swallowing the unlock.
			const onUserGesture = () => {
				if (document.hidden) return;
				if (userPaused) return;
				playBlocked = false;
				if (video.paused && wantsPlayback()) attemptPlay("gesture");
			};
			const watchdogTick = () => {
				if (scene.isConnected === false) return;
				// A web project reports nothing: its only health signal is the mount
				// timeout, so the video watchdog must stay out of its way.
				if (currentChoice !== null && currentChoice.kind === "web") return;
				if (sceneFrameActive) {
					// The adapter posts stats every second; silence while "playing" means the
					// engine loop died. Surface it so the panel offers 重试 instead of a
					// frozen picture that still claims to be live.
					if (
						scene.dataset.tlPlay === "playing" &&
						sceneFrameLastStats > 0 &&
						performance.now() - sceneFrameLastStats > 6000
					) {
						report("playing", "stalled", "scene-no-stats");
					}
					return;
				}
				if (wantsPlayback() && video.paused && video.readyState >= 2) {
					if (playBlocked) return;
					if (performance.now() - lastAttemptAt < 1500) return;
					if (playAttempts >= 4) {
						report("paused", "stalled", "play-timeout");
						return;
					}
					attemptPlay("watchdog");
					return;
				}
				if (
					video.paused === false &&
					video.readyState >= 2 &&
					lastFrameAt > 0 &&
					performance.now() - lastFrameAt > 2500
				) {
					report("playing", "stalled", "no-frame");
				}
			};

			video.addEventListener("loadeddata", onLoaded);
			video.addEventListener("playing", onPlaying);
			video.addEventListener("pause", onPause);
			video.addEventListener("waiting", onWaiting);
			video.addEventListener("canplay", start);
			video.addEventListener("error", onError);
			document.addEventListener("visibilitychange", onVisibility);
			window.addEventListener("pointerdown", onUserGesture, { capture: true, passive: true });
			window.addEventListener("keydown", onUserGesture, { capture: true });
			window.addEventListener("touchstart", onUserGesture, { capture: true, passive: true });
			window.addEventListener("focus", onResumeSignal);
			window.addEventListener("pageshow", onResumeSignal);
			watchdogTimer = window.setInterval(watchdogTick, 2500);

			disposers.push(() => {
				clearRetry();
				if (watchdogTimer !== 0) {
					window.clearInterval(watchdogTimer);
					watchdogTimer = 0;
				}
				video.removeEventListener("loadeddata", onLoaded);
				video.removeEventListener("playing", onPlaying);
				video.removeEventListener("pause", onPause);
				video.removeEventListener("waiting", onWaiting);
				video.removeEventListener("canplay", start);
				video.removeEventListener("error", onError);
				document.removeEventListener("visibilitychange", onVisibility);
				window.removeEventListener("pointerdown", onUserGesture, { capture: true });
				window.removeEventListener("keydown", onUserGesture, { capture: true });
				window.removeEventListener("touchstart", onUserGesture, { capture: true });
				window.removeEventListener("focus", onResumeSignal);
				window.removeEventListener("pageshow", onResumeSignal);
				window.removeEventListener("pointermove", onShaderPointer);
			});

			const applyWallpaper = (choice, options) => {
				if (!scene.isConnected) return;
				clearRetry();
				stopFpsProbe();
				scene.removeAttribute("data-tl-fps");
				scene.removeAttribute("data-tl-jitter");
				requestTransition();
				// C3: a new source gets a clean adaptive baseline (silent: the old source is
				// on its way out and must not be resumed just to be replaced).
				clearAdaptive("source-switch", true);
				shaderFrameTicks = 0;
				shaderWindowStart = 0;
				shaderLastPaint = 0;
				shaderMaxGap = 0;
				// A4: preserving the playback position is what makes a resolution switch
				// invisible instead of "the wallpaper restarted".
				pendingSeekTo =
					options !== null && options !== undefined && Number.isFinite(options.seekTo) ? options.seekTo : null;
				// Every source switch starts from a clean playback intent: a blocked or
				// runtime-paused state belongs to the OLD source. A PERSISTED pause is the
				// exception — it is the user's standing choice and survives a reload.
				userPaused = readPlayback().paused === true;
				playBlocked = false;
				playAttempts = 0;
				publishSceneStatus({ fps: 0, jitter: 0 });
				if (choice === null) {
					currentChoice = null;
					stopSceneFrame();
					stopWebWallpaper();
					applyVariantDatasets(null);
					scene.removeAttribute("data-tl-media");
					scene.removeAttribute("data-tl-width");
					scene.removeAttribute("data-tl-height");
					scene.removeAttribute("data-tl-duration");
					if (wallpaperController !== null) {
						wallpaperController.image = null;
						wallpaperController.shaderSwatch = null;
					}
					report("no-source", "idle");
					return;
				}
				// Route every request through the provider gate: an unsupported source
				// reports why instead of leaving the previous wallpaper silently in place.
				const verdict = resolveWallpaperChoice(choice);
				if (verdict.ok === false) {
					report("unsupported", "error", "unsupported");
					note("wallpaper:unsupported", verdict.reason);
					return;
				}
				choice = verdict.choice;
				// A4: if the catalog is already warm, pick the right encode before mounting.
				choice = pickCachedVariant(choice);
				currentChoice = choice;
				scene.dataset.tlMedia = choice.kind;
				scene.removeAttribute("data-tl-width");
				scene.removeAttribute("data-tl-height");
				scene.removeAttribute("data-tl-duration");
				videoStillToken += 1;
				videoStill = null;
				clearStillHandlers();
				if (choice.kind !== "video") applyVariantDatasets(null);
				if (choice.kind !== "shader") audioController.stop(TL_T("audio.stopSwitch"));
				// Any non-scene source retires the optional scene frame first.
				if (choice.kind !== "scene") stopSceneFrame();
				// A3: the web project owns its own iframe; it is not one of the media
				// channels, so the other four are retired before it mounts.
				if (choice.kind === "web") {
					shaderActive = false;
					stopShaderLoop();
					shaderCanvas.hidden = true;
					scene.removeAttribute("data-tl-shader-on");
					video.pause();
					video.hidden = true;
					video.removeAttribute("data-tl-ready");
					heldFrame = "";
					photo.hidden = true;
					photo.removeAttribute("data-tl-ready");
					photo.removeAttribute("data-tl-photo-role");
					photo.style.removeProperty("background-image");
					if (wallpaperController !== null) {
						wallpaperController.image = null;
						wallpaperController.shaderSwatch = null;
					}
					applyVariantDatasets(null);
					syncResolutionDataset();
					mountWebWallpaper(choice);
					return;
				}
				// Every other source retires a mounted web project (scripts must stop).
				stopWebWallpaper();
				if (choice.kind === "scene") {
					shaderActive = false;
					stopShaderLoop();
					shaderCanvas.hidden = true;
					scene.removeAttribute("data-tl-shader-on");
					video.pause();
					video.hidden = true;
					video.removeAttribute("data-tl-ready");
					heldFrame = "";
					photo.hidden = true;
					photo.removeAttribute("data-tl-ready");
					photo.style.removeProperty("background-image");
					if (wallpaperController !== null) {
						wallpaperController.image = null;
						wallpaperController.shaderSwatch = null;
					}
					mountSceneFrame(choice);
					return;
				}
				if (choice.kind === "shader") {
					video.pause();
					video.hidden = true;
					heldFrame = "";
					photo.hidden = true;
					photo.removeAttribute("data-tl-ready");
					photo.style.removeProperty("background-image");
					if (wallpaperController !== null) wallpaperController.image = null;
					report("loading", "loading");
					if (shaderRenderer === null) shaderRenderer = createShaderRenderer(shaderCanvas);
					if (shaderRenderer === null) {
						// No WebGL: fall back to the normal catalog instead of a blank scene.
						report("error", "error", "no-webgl");
						note("shader:no-webgl", {});
						void resolveAutoWallpaper().then(applyWallpaper);
						return;
					}
					shaderParams = readShaderSettings();
					if (shaderParams.source !== shaderSource) {
						const error = shaderRenderer.apply(shaderParams.source);
						if (error !== null) {
							// Keep the saved choice so the panel can fix it after the fallback.
							report("error", "error", "shader-compile");
							note("shader:compile", { error });
							shaderActive = false;
							stopShaderLoop();
							shaderCanvas.hidden = true;
							scene.removeAttribute("data-tl-shader-on");
							void resolveAutoWallpaper().then(applyWallpaper);
							return;
						}
						shaderSource = shaderParams.source;
					}
					shaderCanvas.hidden = false;
					scene.setAttribute("data-tl-shader-on", "");
					scene.dataset.tlFile = "shader";
					shaderActive = true;
					shaderLast = performance.now();
					try {
						paintShader(shaderLast);
					} catch (error) {
						note("shader:render", error);
					}
					// C3 measures real rendered frames from a fresh window per source.
					shaderFrameTicks = 0;
					shaderMaxGap = 0;
					shaderLastPaint = 0;
					shaderWindowStart = performance.now();
					snapshotShader();
					if (wallpaperController !== null) wallpaperController.shaderSwatch = shaderSwatch;
					if (currentChoice !== null) lastGoodChoice = currentChoice;
					start();
					startTransition();
					report("ready", "playing");
					return;
				}
				// Leaving the shader channel: stop its loop before a media layer takes over.
				shaderActive = false;
				stopShaderLoop();
				shaderCanvas.hidden = true;
				scene.removeAttribute("data-tl-shader-on");
				if (wallpaperController !== null) wallpaperController.shaderSwatch = null;
				const file = choice.url.slice(choice.url.lastIndexOf("/") + 1);
				if (choice.kind === "image") {
					video.pause();
					video.hidden = true;
					heldFrame = "";
					report("loading", "loading");
					photo.hidden = false;
					// A still wallpaper IS the photo layer; transitions animate it IN.
					photo.dataset.tlPhotoRole = "media";
					scene.dataset.tlFile = file;
					// Preload separately: marking ready on the div would flash the empty
					// layer before the bytes arrive.
					const probe = new Image();
					probe.onload = () => {
						if (probe.naturalWidth > 0 && probe.naturalHeight > 0) {
							scene.dataset.tlWidth = String(probe.naturalWidth);
							scene.dataset.tlHeight = String(probe.naturalHeight);
						}
						if (currentChoice !== null) lastGoodChoice = currentChoice;
						photo.dataset.tlReady = "";
						markReady();
						// A5: an image wallpaper is also a valid cache snapshot.
						const captured = choice;
						captureFrameCache(captured, probe, () => currentChoice !== null && currentChoice.url === captured.url);
						report("ready", "ready");
					};
					probe.onerror = () => {
						report("error", "error", "image-decode");
						// AVIF/SVG/WebP support varies; fall back to the last good wallpaper
						// instead of leaving a blank still layer.
						if (
							lastGoodChoice !== null &&
							(currentChoice === null || lastGoodChoice.url !== currentChoice.url || lastGoodChoice.kind !== currentChoice.kind)
						) {
							const restore = lastGoodChoice;
							lastGoodChoice = null;
							applyWallpaper(restore);
						}
					};
					probe.src = choice.url;
					// Kept for the palette sampler: a still wallpaper is not a <video>.
					if (wallpaperController !== null) wallpaperController.image = probe;
					photo.style.backgroundImage = 'url("' + choice.url.replace(/["\\)]/g, "") + '")';
					applyVariantDatasets(null);
					syncResolutionDataset();
					return;
				}
				// Hold the last decoded frame while the next video loads: the element goes
				// blank the moment `load()` runs, and the scene gradient alone reads as a
				// flicker on every switch.
				holdCurrentFrame();
				captureHeldFromPhoto();
				if (heldFrame === "") {
					photo.hidden = true;
					photo.removeAttribute("data-tl-ready");
					photo.removeAttribute("data-tl-photo-role");
					photo.style.removeProperty("background-image");
				}
				if (wallpaperController !== null) wallpaperController.image = null;
				video.hidden = false;
				video.removeAttribute("data-tl-ready");
				report("loading", "loading");
				const still = Number.isFinite(choice.still) ? Math.max(0, choice.still) : null;
				videoStill = still;
				const stillToken = videoStillToken;
				video.autoplay = still === null && userPaused === false;
				if (userPaused) report("paused", "paused", "user");
				video.src = choice.url;
				video.load();
				// Which file actually won: readable from devtools when diagnosing decode.
				scene.dataset.tlFile = file;
				// A5 + A4: cached still paints under the loading video; the shared catalog
				// then decides whether a better encode exists for this window.
				primeFrameCache(choice);
				void maybeApplyVariant(choice);
				if (still === null) {
					start();
					return;
				}
				const settleStill = () => {
					stillSeekHandler = null;
					if (stillToken !== videoStillToken) return;
					try {
						video.pause();
					} catch {
						// a detached video cannot throw anything worth surfacing
					}
					markReady();
					report("ready", "still");
				};
				const seekStill = () => {
					stillMetaHandler = null;
					if (stillToken !== videoStillToken) return;
					const target = Math.min(still, Math.max(0, (video.duration || still) - 0.05));
					if (video.readyState >= 2 && Math.abs(video.currentTime - target) < 0.01) {
						settleStill();
						return;
					}
					stillSeekHandler = settleStill;
					video.addEventListener("seeked", settleStill, { once: true });
					try {
						video.currentTime = target;
					} catch {
						settleStill();
					}
				};
				if (video.readyState >= 1) seekStill();
				else {
					stillMetaHandler = seekStill;
					video.addEventListener("loadedmetadata", stillMetaHandler, { once: true });
				}
			};
			wallpaperController = {
				image: null,
				shaderSwatch: null,
				apply: (choice) => {
					saveWallpaperChoice(choice);
					applyWallpaper(choice);
				},
				/** Re-run the CURRENT source without touching the saved choice. */
				reload: () => {
					if (currentChoice !== null) applyWallpaper(currentChoice);
				},
			};
			rotationRuntime = createRotationRuntime({
				model: readRotation(),
				list: listRotationCandidates,
				apply: (choice) => {
					if (wallpaperController !== null) wallpaperController.apply(choice);
				},
				current: () => currentChoice,
				isStill: () => videoStill !== null,
				prepare: prepareWallpaper,
			});
			syncResolutionDataset();
			void (async () => {
				// The catalog decides the encode: waiting for it once means the very first
				// mount already uses the window-appropriate variant (no reload on start).
				await readCatalog();
				applyWallpaper(await resolveWallpaper());
			})();

			return () => {
				clearStillHandlers();
				clearRetry();
				releaseHeldFrame();
				audioController.stop(TL_T("audio.stopSkin"));
				stopFpsProbe();
				stopShaderLoop();
				// Teardown of everything the engine extras mounted or scheduled: after this
				// the scene DOM is gone and no stray fetch/timer may touch it.
				currentChoice = null;
				cachePrimeToken += 1;
				cancelFrameCacheCapture();
				releaseFrameCacheUrls();
				clearTransition();
				stopWebWallpaper();
				if (resizeTimer !== 0) {
					window.clearTimeout(resizeTimer);
					resizeTimer = 0;
				}
				if (resizeRaf !== 0) {
					globalThis.cancelAnimationFrame(resizeRaf);
					resizeRaf = 0;
				}
				window.removeEventListener("resize", onWindowResize);
				for (const dispose of disposers) dispose();
				if (shaderRenderer !== null) shaderRenderer.dispose();
				shaderRenderer = null;
				wallpaperController = null;
				if (rotationRuntime !== null) {
					rotationRuntime.stop();
					rotationRuntime = null;
				}
				scenePlayback = null;
				publishSceneStatus({ status: "idle", reason: "", fps: 0, jitter: 0 });
				video.pause();
				video.removeAttribute("src");
				video.load();
				scene.remove();
			};
		}
		//#endregion

