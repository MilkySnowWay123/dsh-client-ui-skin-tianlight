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
		//#endregion
