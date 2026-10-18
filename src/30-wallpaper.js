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
		/**
		 * Wallpaper source providers. A provider is a source of frames; the scene renders
		 * video, image and the ShaderToy-style GLSL channel today. URL and ShaderToy are
		 * configured in the panel rather than listed as files.
		 *
		 * Adding one: set `available: true`, give `kind`, and teach applyWallpaper how to
		 * mount it.
		 */
		const PROVIDERS = [
			{ id: "local", label: "本地壁纸", kind: "video", available: true, desc: "assets/ 里的图片或视频", note: "把图片/视频放进 skin-tianlight/assets/，刷新页面即可" },
			{ id: "url", label: "URL 地址", kind: "video", available: true, desc: "粘贴图片/视频网址", note: "支持能直接打开的 http(s) 图片或视频地址" },
			// Clickable: opens the project-directory editor. It is not a frame source
			// itself, so `kind` stays null and its note explains what it can and cannot do.
			{ id: "we", label: "Wallpaper Engine", kind: null, available: true, desc: "读取 WE 项目目录（可选）", note: "视频/图片直接读；场景目录走内置 WebWallGL（失败自动降级）" },
			{ id: "shader", label: "ShaderToy 代码", kind: "shader", available: true, desc: "GLSL 实时壁纸，可改代码", note: "本地 GLSL 运行时：iTime / iResolution / iMouse + 速度/强度/色相；不抓取网站源码" },
		];
		/** Kinds the scene can actually render today. */
		const RENDERABLE_KINDS = new Set(["video", "image", "shader", "scene"]);

		/**
		 * Validates a choice before it reaches the scene. Returns the reason instead of
		 * silently doing nothing, so an unsupported provider is visible in the UI.
		 */
		function resolveWallpaperChoice(choice) {
			if (choice === null || typeof choice !== "object") return { ok: false, reason: "没有选择壁纸" };
			if (!RENDERABLE_KINDS.has(choice.kind)) {
				const provider = PROVIDERS.find((entry) => entry.kind === choice.kind);
				return { ok: false, reason: provider === undefined ? "不支持的壁纸类型" : provider.label + "：" + provider.note };
			}
			if (typeof choice.url !== "string" || choice.url === "") return { ok: false, reason: "壁纸缺少地址" };
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
				const kind = parsed.kind === "image" ? "image" : parsed.kind === "shader" ? "shader" : parsed.kind === "scene" ? "scene" : "video";
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
		const LAYER_LABELS = { none: "无", vignette: "暗角", grain: "颗粒", glow: "光晕", scan: "扫描线" };
		const LAYER_BLEND_LABELS = { normal: "正常", overlay: "叠加", screen: "滤色", multiply: "正片叠底" };
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
		const SHADER_PRESETS = [
			{ id: "aurora", label: "极光", source: SHADER_SOURCES.aurora },
			{ id: "nebula", label: "星云", source: SHADER_SOURCES.nebula },
			{ id: "water", label: "水波", source: SHADER_SOURCES.water },
			{ id: "audio", label: "音频极光", source: SHADER_SOURCES.audio },
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

		function audioState() {
			return { active: audioActive, busy: audioBusy, reason: audioReason };
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
			audioReason = typeof reason === "string" ? reason : "";
			releaseAudio();
			notifyAudio();
		}
		function onAudioVisibility() {
			if (document.hidden) stopAudio("页面隐藏，已停止音频");
		}
		function audioStartError(error) {
			if (error !== null && error !== undefined && error.name === "NotAllowedError") {
				return "麦克风被拒绝：在地址栏权限里允许后重试";
			}
			if (error !== null && error !== undefined && error.name === "NotFoundError") {
				return "没有可用的麦克风";
			}
			const message = error !== null && error !== undefined && error.message ? String(error.message) : "未知错误";
			return "无法启用麦克风：" + message;
		}
		async function startAudio() {
			if (audioActive) return { ok: true };
			if (audioBusy) return { ok: false, reason: "正在请求麦克风，请稍候" };
			if (document.querySelector("[data-tl-scene][data-tl-shader-on]") === null) {
				return { ok: false, reason: "先应用 ShaderToy 壁纸，再启用音频" };
			}
			if (document.body !== null && document.body.hasAttribute("data-tl-lowpower")) {
				return { ok: false, reason: "省电模式暂停中，先关闭省电再启用音频" };
			}
			if (document.hidden) return { ok: false, reason: "页面隐藏，回到页面后再启用音频" };
			const media = globalThis.navigator?.mediaDevices;
			if (media === undefined || media === null || typeof media.getUserMedia !== "function") {
				return { ok: false, reason: "当前浏览器不支持麦克风" };
			}
			const Context = globalThis.AudioContext ?? globalThis.webkitAudioContext;
			if (typeof Context !== "function") {
				return { ok: false, reason: "当前浏览器不支持 WebAudio" };
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
					return { ok: false, reason: "已取消" };
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
					return { ok: false, reason: "已取消" };
				}
				audioStream = stream;
				audioContext = context;
				audioSource = source;
				audioAnalyser = analyser;
				audioData = new Uint8Array(analyser.fftSize);
				audioActive = true;
				audioBusy = false;
				audioReason = "";
				audioLevel = 0;
				document.addEventListener("visibilitychange", onAudioVisibility);
				notifyAudio();
				return { ok: true };
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
					audioBusy = false;
					audioActive = false;
					audioReason = audioStartError(error);
					notifyAudio();
					return { ok: false, reason: audioReason };
				}
				return { ok: false, reason: "已取消" };
			}
		}
		function audioLevelNow() {
			if (audioActive === false || audioAnalyser === null || audioData === null) return 0;
			if (document.hidden) {
				stopAudio("页面隐藏，已停止音频");
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
				stopAudio("音频分析失败，已停止");
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
			start: startAudio,
			stop: stopAudio,
			level: audioLevelNow,
			subscribe: subscribeAudio,
			clearReason: () => {
				if (audioReason === "") return;
				audioReason = "";
				notifyAudio();
			},
		};

		/**
		 * Compiles a candidate in a throwaway context so the panel can refuse a broken
		 * shader before the scene swaps away a working wallpaper.
		 */
		function validateShaderSource(source) {
			if (typeof source !== "string" || source.trim() === "") return "着色器源码为空";
			if (source.length > SHADER_SOURCE_MAX) return "着色器源码太长（上限 " + SHADER_SOURCE_MAX + " 字符）";
			if (typeof document === "undefined") return null;
			let gl = null;
			try {
				const probe = document.createElement("canvas");
				gl = probe.getContext("webgl", { antialias: false, alpha: false, depth: false, stencil: false });
				if (gl === null) return "当前环境不支持 WebGL";
				const vertex = gl.createShader(gl.VERTEX_SHADER);
				const fragment = gl.createShader(gl.FRAGMENT_SHADER);
				gl.shaderSource(vertex, SHADER_VERTEX);
				gl.shaderSource(fragment, source);
				gl.compileShader(vertex);
				gl.compileShader(fragment);
				if (gl.getShaderParameter(fragment, gl.COMPILE_STATUS) !== true) {
					return String(gl.getShaderInfoLog(fragment) ?? "片元着色器编译失败").slice(0, 240);
				}
				const program = gl.createProgram();
				gl.attachShader(program, vertex);
				gl.attachShader(program, fragment);
				gl.linkProgram(program);
				if (gl.getProgramParameter(program, gl.LINK_STATUS) !== true) {
					return String(gl.getProgramInfoLog(program) ?? "着色器链接失败").slice(0, 240);
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
					if (typeof source !== "string" || source.trim() === "") return "着色器源码为空";
					const vertex = gl.createShader(gl.VERTEX_SHADER);
					const fragment = gl.createShader(gl.FRAGMENT_SHADER);
					let next = null;
					try {
						gl.shaderSource(vertex, SHADER_VERTEX);
						gl.shaderSource(fragment, source);
						gl.compileShader(vertex);
						gl.compileShader(fragment);
						if (gl.getShaderParameter(fragment, gl.COMPILE_STATUS) !== true) {
							return String(gl.getShaderInfoLog(fragment) ?? "片元着色器编译失败").slice(0, 240);
						}
						next = gl.createProgram();
						gl.attachShader(next, vertex);
						gl.attachShader(next, fragment);
						gl.linkProgram(next);
						if (gl.getProgramParameter(next, gl.LINK_STATUS) !== true) {
							const log = String(gl.getProgramInfoLog(next) ?? "着色器链接失败").slice(0, 240);
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
				return Promise.resolve({ ok: false, reason: "缺少视频地址，无法取帧" });
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
				const onError = () => finish({ ok: false, reason: "视频加载失败，无法取帧" });
				const onReady = () => {
					const duration = video.duration;
					if (!Number.isFinite(duration) || duration <= 0) {
						finish({ ok: false, reason: "视频时长无效，无法取帧" });
						return;
					}
					const canvas = document.createElement("canvas");
					canvas.width = 160;
					canvas.height = 90;
					const context = canvas.getContext("2d");
					if (context === null) {
						finish({ ok: false, reason: "无法创建取帧画布" });
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
								finish({ ok: false, reason: "视频跨域，浏览器禁止取帧；本地/WE 视频可用" });
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
							finish({ ok: false, reason: "无法定位视频帧" });
						}
					};
					seekNext();
				};
				timer = window.setTimeout(() => finish({ ok: false, reason: "取帧超时（视频可能仍未加载完）" }), 8000);
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

		/**
		 * Automatic catalog: the known-good video candidates by codec probe, then any
		 * other video, then a still image. Never consults the saved choice.
		 */
		async function resolveAutoWallpaper() {
			const items = await listWallpapers();
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
				return { kind: "video", url: item.url };
			}
			const video = items.find((item) => item.kind === "video");
			if (video !== undefined) return { kind: "video", url: video.url };
			const image = items.find((item) => item.kind === "image");
			if (image !== undefined) return { kind: "image", url: image.url };
			return null;
		}

		async function resolveWallpaper() {
			const chosen = readWallpaperChoice();
			if (chosen !== null) return chosen;
			return resolveAutoWallpaper();
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
			function paintShader(now) {
				if (shaderRenderer === null) return;
				const ratio = shaderPixelRatio();
				shaderRenderer.resize(globalThis.innerWidth * ratio, globalThis.innerHeight * ratio);
				shaderRenderer.render(now / 1000, shaderParams, shaderMouse, audioController.level());
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
					if (now - shaderLast >= 1000 / effectiveShaderFps()) {
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
				audioController.stop("图形上下文丢失，已停止音频");
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
					photo.style.backgroundImage = 'url("' + frame + '")';
					photo.dataset.tlReady = "";
					photo.hidden = false;
				} catch {
					// A cross-origin frame taints the canvas; the scene gradient holds instead.
					heldFrame = "";
				}
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
					report("paused", "hidden");
				} else if (userPaused === false) {
					if (sceneFrameActive) {
						postSceneFrame({ type: "resume" });
						report("playing", "playing");
					}
					start();
				}
			};
			const onResumeSignal = () => {
				if (document.hidden || userPaused) return;
				if (sceneFrameActive) {
					postSceneFrame({ type: "resume" });
					report("playing", "playing");
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

			const applyWallpaper = (choice) => {
				if (!scene.isConnected) return;
				clearRetry();
				stopFpsProbe();
				scene.removeAttribute("data-tl-fps");
				scene.removeAttribute("data-tl-jitter");
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
					scene.removeAttribute("data-tl-media");
					scene.removeAttribute("data-tl-width");
					scene.removeAttribute("data-tl-height");
					scene.removeAttribute("data-tl-duration");
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
				currentChoice = choice;
				scene.dataset.tlMedia = choice.kind;
				scene.removeAttribute("data-tl-width");
				scene.removeAttribute("data-tl-height");
				scene.removeAttribute("data-tl-duration");
				videoStillToken += 1;
				videoStill = null;
				clearStillHandlers();
				if (choice.kind !== "shader") audioController.stop("切换壁纸，已停止音频");
				// Any non-scene source retires the optional scene frame first.
				if (choice.kind !== "scene") stopSceneFrame();
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
					snapshotShader();
					if (wallpaperController !== null) wallpaperController.shaderSwatch = shaderSwatch;
					if (currentChoice !== null) lastGoodChoice = currentChoice;
					start();
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
					return;
				}
				// Hold the last decoded frame while the next video loads: the element goes
				// blank the moment `load()` runs, and the scene gradient alone reads as a
				// flicker on every switch.
				holdCurrentFrame();
				if (heldFrame === "") {
					photo.hidden = true;
					photo.removeAttribute("data-tl-ready");
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
				list: listWallpapers,
				apply: (choice) => {
					if (wallpaperController !== null) wallpaperController.apply(choice);
				},
				current: () => currentChoice,
				isStill: () => videoStill !== null,
				prepare: prepareWallpaper,
			});
			void resolveWallpaper().then(applyWallpaper);

			return () => {
				clearStillHandlers();
				clearRetry();
				releaseHeldFrame();
				audioController.stop("皮肤已关闭");
				stopFpsProbe();
				stopShaderLoop();
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

