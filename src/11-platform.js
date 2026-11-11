		//#region platform
		/**
		 * v0.5.0 平台层。这里只放“跨区共享的插槽”，不放任何具体功能：
		 *
		 *   moduleController   模块开关（壁纸/桌宠/排版/特效/情境/音频/推理滑杆）。
		 *                      每个模块的安装器由 99-apply.js 注册，关闭时调用它的
		 *                      disposer —— 关闭后不留 DOM、不留监听器。
		 *   TL5_PANEL_SECTIONS 壁纸面板的扩展分区注册表。各功能片段把自己的 React
		 *                      组件 push 进来，70-sidebar.js 只负责按 order 渲染，
		 *                      多个功能并行开发时不需要改同一个文件。
		 *   TL5_CSS_BLOCKS     各功能片段的样式块注册表。20-stylesheet.js 注入样式时
		 *                      把主表与所有扩展块拼成一个 <style>，工具链统一校验。
		 *   TL5_METRICS        渲染预算可视化共享的只读指标总线（fps/抖动/档位/
		 *                      缓存命中/特效开销/省电原因），面板分区订阅它。
		 *   TL5_DIAG           运行时诊断命名空间，供 `__dshTianlightInstance` 与
		 *                      面板“工程”分区读取，不写进产品 DOM。
		 */
		const TL5_VERSION = "0.5.0";
		const TL5_MODULES_ATTR = "data-tl-modules";
		const MODULES_KEY = "tianlight.modules";

		/**
		 * 模块清单。顺序即安装顺序；`switchable: false` 的模块是基础设施，
		 * 面板里显示为“常驻”（面板本身关掉就没有关闭入口了）。
		 */
		// Array order IS the install order: zones framing must exist right after the
		// scene (it reads [data-tl-scene]), the panel installs last because it is the
		// control surface for every other module.
		const MODULE_DEFS = [
			{ id: "wallpaper", labelKey: "module.wallpaper", descKey: "module.wallpaperDesc", order: 10, switchable: true, fallback: "壁纸场景" },
			{ id: "zones", labelKey: "module.zones", descKey: "module.zonesDesc", order: 15, switchable: false, fallback: "分区取景" },
			{ id: "effects", labelKey: "module.effects", descKey: "module.effectsDesc", order: 20, switchable: true, fallback: "特效与氛围" },
			{ id: "context", labelKey: "module.context", descKey: "module.contextDesc", order: 30, switchable: true, fallback: "智能情境" },
			{ id: "audio", labelKey: "module.audio", descKey: "module.audioDesc", order: 40, switchable: true, fallback: "音频可视化" },
			{ id: "companion", labelKey: "module.companion", descKey: "module.companionDesc", order: 50, switchable: true, fallback: "薄荷桌宠" },
			{ id: "rheostat", labelKey: "module.rheostat", descKey: "module.rheostatDesc", order: 60, switchable: true, fallback: "推理滑杆" },
			{ id: "typography", labelKey: "module.typography", descKey: "module.typographyDesc", order: 70, switchable: true, fallback: "排版面板" },
			{ id: "legibility", labelKey: "module.legibility", descKey: "module.legibilityDesc", order: 90, switchable: false, fallback: "可读性护栏" },
			{ id: "panel", labelKey: "module.panel", descKey: "module.panelDesc", order: 95, switchable: false, fallback: "壁纸面板" },
		];
		const MODULE_IDS = MODULE_DEFS.map((def) => def.id);

		/* ================= cross-region shared helpers (S4) =================
		 * One implementation per concept, shared by every fragment through this
		 * closure: media-kind detection, upload validation, the "recent wallpapers"
		 * list and the wallpaper palette sampler. Duplicates here used to drift
		 * (upload rules disagreed between panels; the two recent lists overwrote
		 * each other; the panel tint and the font-panel chroma sampled separately).
		 */
		const TL5_VIDEO_EXTS = [".mp4", ".webm", ".mov", ".m4v"];
		const TL5_IMAGE_EXTS = [".png", ".jpg", ".jpeg", ".webp", ".avif", ".gif", ".svg"];
		const TL5_PLAYBACK_VIDEO_EXTS = [...TL5_VIDEO_EXTS, ".mkv", ".avi"];
		/** Extension of a file name or URL path (query/hash stripped), lower-case. */
		function tl5LowerExtension(name) {
			try {
				const text = String(name ?? "").split("?")[0].split("#")[0];
				const dot = text.lastIndexOf(".");
				return dot < 0 ? "" : text.slice(dot).toLowerCase();
			} catch {
				return "";
			}
		}
		/** "video" | "image" | null for a file name/URL the player may render. */
		function tl5MediaKindFromName(name) {
			const ext = tl5LowerExtension(name);
			if (TL5_PLAYBACK_VIDEO_EXTS.includes(ext)) return "video";
			if (TL5_IMAGE_EXTS.includes(ext)) return "image";
			return null;
		}
		/**
		 * Shared client-side upload pre-flight. The host re-validates everything (size,
		 * SafeName, content); this only keeps the two panels' rules identical. `maxBytes`
		 * is per-UI (the wallpaper panel uses the host-advertised cap, the role hub its
		 * companion-media cap); the ACCEPTED FORMATS are always the same list.
		 */
		function tl5ValidateUploadFile(file, maxBytes) {
			if (file === null || file === undefined) return { ok: false, code: "empty" };
			const name = typeof file.name === "string" ? file.name : "";
			const ext = tl5LowerExtension(name);
			const size = Number(file.size);
			if (Number.isFinite(size) === false || size <= 0) return { ok: false, code: "empty" };
			// Size check before the format check: the wallpaper panel reported "file too
			// large" for an oversized non-media file and that ordering is preserved.
			if (Number.isFinite(Number(maxBytes)) && Number(maxBytes) > 0 && size > Number(maxBytes)) {
				return { ok: false, code: "too-big", size };
			}
			const isVideo = TL5_VIDEO_EXTS.includes(ext);
			const isImage = TL5_IMAGE_EXTS.includes(ext);
			if (isVideo === false && isImage === false) return { ok: false, code: "type" };
			return { ok: true, name, size, kind: isVideo ? "video" : "image" };
		}

		/** Shared "recently used wallpapers" list (URL strings, newest first, <=64). */
		const TL5_RECENT_KEY = "tianlight.recent";
		const TL5_RECENT_MAX = 64;
		function tl5ReadRecent() {
			try {
				const raw = JSON.parse(globalThis.localStorage?.getItem(TL5_RECENT_KEY) ?? "null");
				if (!Array.isArray(raw)) return [];
				return [...new Set(raw.filter((url) => typeof url === "string" && url !== ""))].slice(0, TL5_RECENT_MAX);
			} catch {
				return [];
			}
		}
		function tl5RememberRecent(url) {
			if (typeof url !== "string" || url === "") return tl5ReadRecent();
			const next = [url, ...tl5ReadRecent().filter((entry) => entry !== url)].slice(0, TL5_RECENT_MAX);
			try {
				globalThis.localStorage?.setItem(TL5_RECENT_KEY, JSON.stringify(next));
			} catch {
				// usage order is a convenience, never a requirement
			}
			return next;
		}

		/**
		 * Shared wallpaper palette sampler used by the wallpaper-panel tint and the
		 * font-panel chroma adopt. Returns `{hue, sat, light}` or null; callers keep
		 * their own visual formulas (fill/accent) so the two surfaces stay distinct.
		 */
		let tl5PaletteCanvas = null;
		let tl5PaletteCtx = null;
		function tl5SampleWallpaperPalette() {
			try {
				if (tl5PaletteCanvas === null) {
					tl5PaletteCanvas = document.createElement("canvas");
					tl5PaletteCanvas.width = 32;
					tl5PaletteCanvas.height = 18;
					tl5PaletteCtx = tl5PaletteCanvas.getContext("2d", { willReadFrequently: true });
				}
				if (tl5PaletteCtx === null || tl5PaletteCtx === undefined) return null;
				const controller = typeof wallpaperController === "undefined" ? null : wallpaperController;
				const shader = controller === null ? null : controller.shaderSwatch;
				const still = controller === null ? null : controller.image;
				const sceneVideo = document.querySelector("[data-tl-scene] > video");
				const video =
					sceneVideo !== null && sceneVideo.hidden === false && sceneVideo.currentSrc !== "" && sceneVideo.readyState >= 2
						? sceneVideo
						: null;
				const target =
					shader !== null && shader !== undefined ? shader : still !== null && still !== undefined ? still : video;
				if (target === null || target === undefined) return null;
				if (target === video && video.readyState < 2) return null;
				let data = null;
				try {
					tl5PaletteCtx.drawImage(target, 0, 0, tl5PaletteCanvas.width, tl5PaletteCanvas.height);
					data = tl5PaletteCtx.getImageData(0, 0, tl5PaletteCanvas.width, tl5PaletteCanvas.height).data;
				} catch {
					return null;
				}
				let sin = 0;
				let cos = 0;
				let satSum = 0;
				let lightSum = 0;
				let weight = 0;
				for (let i = 0; i + 3 < data.length; i += 4) {
					const r = data[i] / 255;
					const g = data[i + 1] / 255;
					const b = data[i + 2] / 255;
					const max = Math.max(r, g, b);
					const min = Math.min(r, g, b);
					const delta = max - min;
					const light = (max + min) / 2;
					if (delta < 0.05 || light < 0.08 || light > 0.95) continue;
					const sat = light > 0.5 ? delta / (2 - max - min) : delta / (max + min);
					let hue;
					if (max === r) hue = ((g - b) / delta + (g < b ? 6 : 0)) * 60;
					else if (max === g) hue = ((b - r) / delta + 2) * 60;
					else hue = ((r - g) / delta + 4) * 60;
					const rad = (hue * Math.PI) / 180;
					const w = sat * (1 - Math.abs(light - 0.55) * 1.2);
					sin += Math.sin(rad) * w;
					cos += Math.cos(rad) * w;
					satSum += sat * w;
					lightSum += light * w;
					weight += w;
				}
				if (weight <= 0.001) return null;
				return {
					hue: Math.round((((Math.atan2(sin, cos) * 180) / Math.PI) + 360) % 360),
					sat: Math.min(0.70, Math.max(0.32, (satSum / weight) * 1.3)),
					light: lightSum / weight,
				};
			} catch {
				return null;
			}
		}

		function normalizeModuleState(raw) {
			const state = {};
			const source = raw !== null && typeof raw === "object" ? raw : {};
			for (const def of MODULE_DEFS) {
				state[def.id] = def.switchable === false ? true : source[def.id] === undefined ? true : source[def.id] === true;
			}
			return state;
		}

		const modulesState = (() => {
			try {
				const raw = globalThis.localStorage?.getItem(MODULES_KEY);
				return raw === undefined || raw === null || raw === "" ? normalizeModuleState(null) : normalizeModuleState(JSON.parse(raw));
			} catch {
				return normalizeModuleState(null);
			}
		})();

		const moduleSubscribers = new Set();
		/** 由 apply() 在安装模块时挂载；关闭模块走它的 disable()。 */
		let moduleRuntime = null;

		function syncModulesAttr() {
			try {
				if (document.body === null) return;
				document.body.setAttribute(TL5_MODULES_ATTR, MODULE_IDS.filter((id) => modulesState[id] === true).join(" "));
			} catch {
				// a missing body is a pre-mount race, not a failure
			}
		}

		function notifyModules() {
			syncModulesAttr();
			for (const listener of [...moduleSubscribers]) {
				try {
					listener(moduleController.state());
				} catch (error) {
					note("modules:subscriber", error);
				}
			}
		}

		function moduleEnabled(id) {
			return modulesState[id] === true;
		}

		const moduleController = {
			read: () => moduleController.state(),
			state: () => MODULE_IDS.reduce((out, id) => {
				out[id] = modulesState[id] === true;
				return out;
			}, {}),
			isEnabled: (id) => moduleEnabled(id),
			list: () => MODULE_DEFS.map((def) => ({ ...def, enabled: moduleEnabled(def.id) })),
			subscribe: (listener) => {
				if (typeof listener !== "function") return () => {};
				moduleSubscribers.add(listener);
				return () => moduleSubscribers.delete(listener);
			},
			/**
			 * 开关一个模块。持久化后同步给运行时：打开 = 重新安装，关闭 = 调用
			 * 安装时返回的 disposer。非开关型模块（面板/取景/护栏）忽略写入。
			 */
			set: (id, enabled) => {
				const def = MODULE_DEFS.find((entry) => entry.id === id);
				if (def === undefined || def.switchable === false) return false;
				const next = enabled === true;
				if (modulesState[id] === next) return true;
				modulesState[id] = next;
				try {
					globalThis.localStorage?.setItem(MODULES_KEY, JSON.stringify(modulesState));
				} catch {
					// persistence is optional; the session still follows the switch
				}
				if (moduleRuntime !== null) {
					try {
						if (next) moduleRuntime.enable(id);
						else moduleRuntime.disable(id);
					} catch (error) {
						note("modules:runtime", error);
					}
				}
				notifyModules();
				return true;
			},
			/** 由 apply() 调用一次。 */
			attach: (runtime) => {
				moduleRuntime = runtime;
			},
			active: () => (moduleRuntime === null ? MODULE_IDS.filter((id) => modulesState[id] === true) : moduleRuntime.activeIds()),
		};

		/**
		 * 模块运行时。`install` 是 apply() 里那个包了 ctx.effect 的安装器，
		 * 返回一个幂等的 disposer。
		 */
		function createModuleRuntime(install) {
			const definitions = new Map();
			const active = new Map();
			const enable = (id) => {
				if (active.has(id)) return;
				const def = definitions.get(id);
				if (def === undefined) return;
				if (def.switchable !== false && moduleEnabled(id) === false) return;
				let dispose = null;
				try {
					dispose = install(def.label, def.factory);
				} catch (error) {
					note("modules:install", { id, error });
					return;
				}
				if (typeof dispose === "function") active.set(id, dispose);
			};
			const disable = (id) => {
				const dispose = active.get(id);
				if (dispose === undefined) return;
				active.delete(id);
				try {
					dispose();
				} catch (error) {
					note("modules:dispose", { id, error });
				}
			};
			const runtime = {
				define: (id, label, factory) => {
					const def = MODULE_DEFS.find((entry) => entry.id === id);
					definitions.set(id, {
						label,
						factory,
						switchable: def === undefined ? true : def.switchable !== false,
					});
				},
				enable,
				disable,
				syncAll: () => {
					for (const def of MODULE_DEFS) enable(def.id);
				},
				activeIds: () => [...active.keys()],
				definitions: () => [...definitions.keys()],
			};
			return runtime;
		}

		/**
		 * 面板扩展分区：{ id, order, title, Component }。title 是 i18n key，
		 * Component 是无 props 的 React 组件（自己渲染 <details class="tl-wall-group">）。
		 */
		const TL5_PANEL_SECTIONS = [];
		function registerTl5PanelSection(section) {
			if (section === null || typeof section !== "object" || typeof section.Component !== "function") return () => {};
			const id = typeof section.id === "string" && section.id !== "" ? section.id : "section-" + TL5_PANEL_SECTIONS.length;
			if (TL5_PANEL_SECTIONS.some((entry) => entry.id === id)) return () => {};
			const entry = {
				id,
				order: Number.isFinite(section.order) ? section.order : 500,
				title: typeof section.title === "string" ? section.title : "section." + id,
				Component: section.Component,
			};
			TL5_PANEL_SECTIONS.push(entry);
			return () => {
				const index = TL5_PANEL_SECTIONS.indexOf(entry);
				if (index >= 0) TL5_PANEL_SECTIONS.splice(index, 1);
			};
		}
		function tl5PanelSections() {
			return TL5_PANEL_SECTIONS.slice().sort((a, b) => a.order - b.order);
		}

		/** 功能片段自己的样式块；installStyles 把它们拼进同一个 <style>。 */
		const TL5_CSS_BLOCKS = [];
		function registerTl5Css(text) {
			if (typeof text !== "string" || text.trim() === "") return;
			TL5_CSS_BLOCKS.push(text);
		}
		function tl5CssText() {
			return TL5_CSS_BLOCKS.join("\n");
		}

		/**
		 * 渲染预算指标：低帧率/抖动/档位/省电/缓存命中/特效开关与开销。
		 * 面板“工程”分区订阅它，只读展示，不参与决策；决策在各功能自己的控制器里。
		 */
		const TL5_METRICS = {
			fps: 0,
			jitter: 0,
			tier: "auto",
			lowPower: false,
			lowPowerReason: "",
			cacheHit: 0,
			cacheMiss: 0,
			effects: { active: 0, fps: 0, budget: "auto" },
			updatedAt: 0,
		};
		const tl5MetricsSubscribers = new Set();
		function publishTl5Metrics(patch) {
			if (patch === null || typeof patch !== "object") return;
			Object.assign(TL5_METRICS, patch);
			TL5_METRICS.updatedAt = Date.now();
			for (const listener of [...tl5MetricsSubscribers]) {
				try {
					listener(TL5_METRICS);
				} catch {
					// a metrics listener must never break the render loop
				}
			}
		}
		function subscribeTl5Metrics(listener) {
			if (typeof listener !== "function") return () => {};
			tl5MetricsSubscribers.add(listener);
			return () => tl5MetricsSubscribers.delete(listener);
		}

		/** 运行时诊断命名空间（工程面板 + 控制台）。 */
		const TL5_DIAG = {
			engine: {},
			effects: {},
			context: {},
			audio: {},
			settings: {},
			cache: {},
			i18n: {},
		};
		function tl5Diag(namespace, patch) {
			if (typeof namespace !== "string" || patch === null || typeof patch !== "object") return;
			TL5_DIAG[namespace] = { ...(TL5_DIAG[namespace] ?? {}), ...patch };
		}
		/**
		 * R5 统一浮层栈：跨区共享的“当前最上层浮层”注册表。各面板（壁纸面板、
		 * WE 库、角色中枢、排版浮窗、宠物聊天/历史）在打开/关闭时登记/注销，
		 * Esc 与模态焦点循环只在这里处理一次：
		 *   - Esc 只交给栈顶浮层的 onEscape；模块自己不再 capture 并吞掉事件；
		 *   - Tab / Shift+Tab 只对栈顶且 modal:true 的浮层做焦点循环；非模态浮窗
		 *     （排版面板、宠物聊天）既不 trap，也不抢 DSH 输入框的 Tab；
		 *   - 监听器按需安装、栈空即移除（audit 的 window/document listener 配对
		 *     与模块自身 disposer 不受影响）。
		 */
		const TL5_OVERLAYS = [];
		const TL5_OVERLAY_FOCUSABLE =
			'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [contenteditable="true"], [tabindex]:not([tabindex="-1"])';
		let tl5OverlayKeyboardInstalled = false;

		function tl5OverlayList() {
			return TL5_OVERLAYS.filter((entry) => entry !== null && entry !== undefined && entry.disposed !== true);
		}
		/** 栈顶浮层；没有则 null。 */
		function tl5OverlayTop() {
			const list = tl5OverlayList();
			return list.length === 0 ? null : list[list.length - 1];
		}
		/**
		 * R8b (REV-R5 F1)：现在是否允许打开 id 指定的浮层？已有更高模态在栈顶时，
		 * 再打开一个下层浮层只会被视觉遮住、却抢走“键盘栈顶”和 Esc 归属。入口
		 * （Alt+W/Alt+T、面板/浮窗 open）据此 no-op；同 id 重复 open 仍允许。
		 * 返回挡路的栈顶层；可打开时返回 null。
		 */
		function tl5OverlayModalAbove(id) {
			const top = tl5OverlayTop();
			if (top === null || top.modal !== true) return null;
			if (typeof id === "string" && top.id === id) return null;
			return top;
		}
		function tl5OverlayOpenAllowed(id) {
			return tl5OverlayModalAbove(id) === null;
		}
		function tl5OverlayResolveRoot(entry) {
			try {
				const root = typeof entry.root === "function" ? entry.root() : entry.root;
				return root !== null && root !== undefined && root.isConnected === true ? root : null;
			} catch {
				return null;
			}
		}
		function tl5OverlayOnKeyDown(event) {
			if (event === null || event === undefined) return;
			const top = tl5OverlayTop();
			if (top === null) return;
			if (event.key === "Escape" || event.key === "Esc") {
				// R8b (REV-R5 5): holding Esc must not tear down layer after layer; a
				// keyboard auto-repeat event closes nothing. R8c (REV-R8 F1): it must still
				// be owned by the stack — prevent default and stop propagation, otherwise
				// the repeated key leaks to DSH's own Esc handlers while a skin layer is open.
				if (event.repeat === true) {
					if (typeof event.preventDefault === "function") event.preventDefault();
					if (typeof event.stopPropagation === "function") event.stopPropagation();
					return;
				}
				// The stack is the single owner while a skin overlay is open: close only
				// the top layer and do not let DSH's own Esc handlers run underneath.
				if (typeof event.preventDefault === "function") event.preventDefault();
				if (typeof event.stopPropagation === "function") event.stopPropagation();
				try {
					if (typeof top.onEscape === "function") top.onEscape();
				} catch (error) {
					note("overlays:escape", error);
				}
				return;
			}
			if (event.key !== "Tab" || top.modal !== true) return;
			const root = tl5OverlayResolveRoot(top);
			if (root === null || typeof root.querySelectorAll !== "function") return;
			const items = [];
			try {
				for (const node of root.querySelectorAll(TL5_OVERLAY_FOCUSABLE)) {
					if (node === null || node === undefined || typeof node.focus !== "function") continue;
					if (node.getClientRects().length === 0) continue;
					items.push(node);
				}
			} catch {
				return;
			}
			if (items.length === 0) {
				// A modal with nothing focusable still must not leak Tab to the page.
				if (typeof event.preventDefault === "function") event.preventDefault();
				return;
			}
			const first = items[0];
			const last = items[items.length - 1];
			const current = typeof document !== "undefined" && document !== null ? document.activeElement : null;
			let inside = false;
			try {
				inside = current !== null && current !== undefined && typeof root.contains === "function" && root.contains(current) === true;
			} catch {
				inside = false;
			}
			if (event.shiftKey === true) {
				if (inside === false || current === first) {
					if (typeof event.preventDefault === "function") event.preventDefault();
					try {
						last.focus();
					} catch {
						// element vanished between reads
					}
				}
				return;
			}
			if (inside === false || current === last) {
				if (typeof event.preventDefault === "function") event.preventDefault();
				try {
					first.focus({ preventScroll: true });
				} catch {
					try {
						first.focus();
					} catch {
						// element vanished between reads
					}
				}
			}
		}
		function tl5OverlayInstallKeyboard() {
			if (tl5OverlayKeyboardInstalled === true) return;
			if (typeof window === "undefined" || window === null || typeof window.addEventListener !== "function") return;
			tl5OverlayKeyboardInstalled = true;
			// Capture: the skin's Esc/Tab contract must win before DSH's own handlers.
			window.addEventListener("keydown", tl5OverlayOnKeyDown, true);
		}
		function tl5OverlayReleaseKeyboard() {
			if (tl5OverlayKeyboardInstalled === false) return;
			tl5OverlayKeyboardInstalled = false;
			try {
				window.removeEventListener("keydown", tl5OverlayOnKeyDown, true);
			} catch {
				// a torn-down window is fine
			}
		}
		/**
		 * 登记一个浮层：`{ id, modal?, root?, onEscape }`。重复登记同一 id 时原地更新
		 * （幂等 open 路径），返回幂等 disposer。root 可以是元素或返回元素的函数。
		 */
		function tl5OverlayRegister(spec) {
			if (spec === null || typeof spec !== "object") return () => {};
			const id = typeof spec.id === "string" && spec.id !== "" ? spec.id : "";
			if (id === "") return () => {};
			const existing = TL5_OVERLAYS.find((entry) => entry !== null && entry !== undefined && entry.id === id);
			if (existing !== undefined) {
				existing.modal = spec.modal === true;
				existing.root = spec.root;
				existing.onEscape = typeof spec.onEscape === "function" ? spec.onEscape : existing.onEscape;
				existing.disposed = false;
				tl5OverlayInstallKeyboard();
				return () => {
					if (existing.disposed === true) return;
					tl5OverlayUnregister(id);
				};
			}
			const entry = {
				id,
				modal: spec.modal === true,
				root: spec.root,
				onEscape: typeof spec.onEscape === "function" ? spec.onEscape : null,
				disposed: false,
			};
			TL5_OVERLAYS.push(entry);
			tl5OverlayInstallKeyboard();
			return () => {
				if (entry.disposed === true) return;
				tl5OverlayUnregister(id);
			};
		}
		function tl5OverlayUnregister(id) {
			if (typeof id !== "string" || id === "") return;
			for (let index = TL5_OVERLAYS.length - 1; index >= 0; index -= 1) {
				const entry = TL5_OVERLAYS[index];
				if (entry === null || entry === undefined || entry.id !== id) continue;
				entry.disposed = true;
				TL5_OVERLAYS.splice(index, 1);
			}
			if (TL5_OVERLAYS.length === 0) tl5OverlayReleaseKeyboard();
		}
		/** 只读栈状态（诊断/测试）：自底向上 id 列表 + 栈顶是否模态。 */
		function tl5OverlayState() {
			const list = tl5OverlayList();
			return {
				ids: list.map((entry) => entry.id),
				top: list.length === 0 ? null : list[list.length - 1].id,
				modal: list.length === 0 ? false : list[list.length - 1].modal === true,
				keyboard: tl5OverlayKeyboardInstalled === true,
			};
		}
		//#endregion
