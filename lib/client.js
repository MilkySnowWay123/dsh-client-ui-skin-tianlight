window.__ModuleLoader__.load({
	id: "@dsh-external/dsh-client-ui-skin-tianlight",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

		//#region constants
		/** Asset prefix owned by this skin's host half (`lib/index.js`). */
		const ASSET_BASE = "/skin-tianlight";
		/** Body attribute that both scopes the stylesheet and drives teardown. */
		const BODY_ATTR = "data-dsh-tianlight";
		/** The product marks the dark theme on <body>; several rules and the wallpaper
		 *  palette sample key off it. */
		const DARK_ATTR = "data-ds-dark-theme";
		const PLUGIN_ID = "@dsh-external/dsh-client-ui-skin-tianlight";
		const CSS_TAG_ID = "ui-skin-tianlight/tianlight.css";
		const STORAGE_KEY = "dsh-tianlight:cat:v1";
		/**
		 * Host/client build handshake. The browser half is cached independently from the
		 * host half (Ctrl+F5 reloads the page, not the process), so after updating the
		 * plugin the page can run the new client against an old host whose routes are
		 * missing. The host compares this value and reports `stale: true`, which the
		 * panel turns into a visible "restart DSH" hint instead of a mystery network
		 * error. Keep in sync with `BUILD` in lib/index.js.
		 */
		const HOST_BUILD = "1.0.0";

		/**
		 * Render budget tiers, shared by the shader wallpaper, the rail mirror and the
		 * performance panel. Kept in constants because three regions consume it; the
		 * low-power supervisor still wins and freezes everything regardless of tier.
		 * "auto"/"30" use 30fps, "60" opts into 60fps, "15" halves both.
		 */
		const FPS_KEY = "tianlight.fps";
		const FPS_TIERS = ["auto", "60", "30", "15"];
		/** Mirrors the host's upload cap default; the panel prefers the host's live value. */
		const UPLOAD_LIMIT = 512 * 1024 * 1024;
		let renderTier = "auto";
		try {
			const saved = globalThis.localStorage?.getItem(FPS_KEY);
			if (FPS_TIERS.includes(saved)) renderTier = saved;
		} catch {
			renderTier = "auto";
		}
		function readRenderTier() {
			return renderTier;
		}
		function effectiveShaderFps() {
			return renderTier === "60" ? 60 : renderTier === "15" ? 15 : 30;
		}
		function railFrameStep() {
			return renderTier === "60" ? 3 : renderTier === "15" ? 10 : 5;
		}
		const renderTierController = {
			read: readRenderTier,
			set: (next) => {
				renderTier = FPS_TIERS.includes(next) ? next : "auto";
				try {
					globalThis.localStorage.setItem(FPS_KEY, renderTier);
				} catch {
					// persistence is optional; this session still uses the new tier
				}
			},
		};

		/**
		 * Wallpaper preference order. An entry may declare the codec MIME the
		 * browser must decode; HEVC is tried first, but an H.264 file stays behind
		 * it so an unsupported codec can never leave the page with no wallpaper.
		 */
		const VIDEO_CANDIDATES = [
			// Broad container/codec family only: a fully qualified profile string can
			// report "unsupported" on browsers that do decode HEVC, which would skip
			// the uploaded wallpaper for no reason.
			{ file: "bg-main.mp4", codec: 'video/mp4; codecs="hvc1"' },
			{ file: "bg-4k.mp4" },
			{ file: "bg-1080.mp4" },
		];
		/** Horizontal focal point of the character, per the composition brief. */
		const FOCAL_X = "38%";

		/**
		 * Developer-facing note. Deliberately NOT a network beacon: posting diagnostics
		 * to a route the running host has not loaded produced a 405 on every page load,
		 * which is noise in the user's console for no information.
		 */
		function note(stage, detail) {
			try {
				console.warn("[ui-skin-tianlight] " + stage, detail ?? "");
			} catch {
				// logging must never affect the page
			}
		}

		/**
		 * Shared React runtime. Optional: if the host does not expose it the skin
		 * still applies, it simply registers no extra controls.
		 */
		let React = null;
		try {
			React = require("react");
		} catch (error) {
			React = null;
			note("react-missing", { message: String(error?.message ?? error) });
		}
		//#endregion

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
		//#region schema
		/**
		 * v0.5.0 设置分层（由 platform-core 工作流实现；v0.5.2 增加数据安全）：
		 *
		 *   1. schema 迁移：把 v0.4.0 及更早的 `tianlight.*` 存储键归一化到
		 *      `TL5_SCHEMA_VERSION`，迁移前的原始值先备份到 `tianlight.backup.v5`。
		 *   2. 宿主设置：GET/PUT `/skin-tianlight/_settings`。宿主文件是跨浏览器
		 *      的权威副本；本地 localStorage 仍是同步读缓存，读写通过镜像层同步
		 *      （300ms 去抖，只 PUT 变化的键，宿主按 key 合并）。
		 *   3. 多窗口一致：BroadcastChannel("tianlight.settings") + `storage` 事件，
		 *      最后写入者为准；外部写入不再回声，也不再次镜像。
		 *   4. 运行时对齐：迁移/宿主导入之后，把在片段加载期读过 localStorage 的
		 *      模块开关与语言同步到其控制器（其余功能由各自 install 期读取）。
		 *   5. v0.5.2 数据安全（用户反馈“重启后设置丢失”）：
		 *      - 采纳宿主快照时【绝不删除宿主里没有的本地键】（宿主文件可能是子集/
		 *        不完整），本地独有键保留后立即回推宿主，使宿主重新变成超集；
		 *        只有显式 null 墓碑才删除本地键（跨浏览器删除语义保留）；
		 *      - 采纳前把导入前的本地设置备份到 `tianlight.backup.host`（本地专用，
		 *        mirror 因 tianlight.backup. 前缀天然排除）；宿主快照是子集时若确实
		 *        改过本地值，面板“恢复宿主导入前备份”可一键恢复；
		 *      - bootstrap 的 push 失败按需重试一次（1s，仅网络/5xx/超时）；
		 *      - tl5Diag("settings") 记录 {localKeys, remoteKeys, pushedKeys} 计数，
		 *        供 verifier 断言“首启全量推送 / 采纳后回推”。
		 *
		 * 生命周期：
		 *   bootstrapSettingsRuntime(body)  apply() 里 await：先迁移、再接管宿主配置。
		 *                                   任何失败都退化为本地模式，绝不抛穿 apply()。
		 *   installSettingsRuntime(body)    镜像层安装器（always-on effect），返回幂等
		 *                                   disposer：还原被补丁的 localStorage 方法、
		 *                                   关闭 BroadcastChannel、移除监听与定时器。
		 *
		 * 契约（其他片段依赖）：
		 *   settingsStore.status()      -> { host, revision, pending, lastError,
		 *                                   migrated:[key], schema:{from,to},
		 *                                   backup:boolean, recovered:number }
		 *   settingsStore.bootstrap()   -> Promise<void>（失败不抛，退化为本地模式）
		 *   settingsStore.forceSync()   -> Promise<boolean>
		 *   settingsStore.recoverBackup() -> Promise<boolean>（写回 tianlight.backup.host）
		 *   settingsStore.subscribe(fn) -> unsubscribe
		 *   schemaRuntime.report()      -> { from, to, migrated:[key], failed:[key] }
		 *   schemaRuntime.migrate()     -> 同 report（一次会话只跑一次，幂等）
		 *
		 * “设置”的定义：所有 `tianlight.` / `dsh-tianlight:` 前缀的字符串键，但本机
		 * 元数据（schema / backup / sync.revision）除外 —— 见 tl5SyncableKey()。
		 */
		const TL5_SCHEMA_KEY = "tianlight.schema";
		const TL5_SCHEMA_VERSION = 5;
		const TL5_SETTINGS_ROUTE = ASSET_BASE + "/_settings";
		const TL5_SYNC_REVISION_KEY = "tianlight.sync.revision";
		const TL5_SETTINGS_PREFIXES = ["tianlight.", "dsh-tianlight:"];
		/** 迁移前的原始值备份。永不参与宿主同步（否则备份会被复制到每一台机器）。 */
		const TL5_BACKUP_KEY = "tianlight.backup.v5";
		const TL5_BACKUP_MAX_BYTES = 1024 * 1024;
		/**
		 * 宿主导入（adoption）前的本地设置备份。v0.5.2 数据安全：宿主快照可能是
		 * 子集/不完整，落地前先留一份本地可同步键，供面板“恢复宿主导入前备份”。
		 * 前缀 `tianlight.backup.` 已被 tl5SyncableKey() 排除，所以永不参与镜像。
		 */
		const TL5_HOST_BACKUP_KEY = "tianlight.backup.host";
		const TL5_HOST_BACKUP_MAX_BYTES = 256 * 1024;
		/** bootstrap push 失败后的唯一一次重试延迟（仅网络/5xx/超时重试）。 */
		const TL5_PUSH_RETRY_DELAY_MS = 1000;
		/** 只属于本机的元数据：不同步；schema/revision 由本文件单独维护。 */
		const TL5_META_EXACT = [TL5_SCHEMA_KEY, TL5_BACKUP_KEY, TL5_SYNC_REVISION_KEY];
		const TL5_META_PREFIXES = ["tianlight.backup.", "tianlight.sync."];
		/** 导入（bootstrap 的 GET）超时按契约 1200ms；PUT 允许更大一点。 */
		const TL5_HOST_TIMEOUT_MS = 1200;
		const TL5_HOST_WRITE_TIMEOUT_MS = 4000;
		const TL5_MIRROR_DEBOUNCE_MS = 300;
		const TL5_MIRROR_RETRY_MS = 3000;
		const TL5_MIRROR_RETRY_MAX = 2;
		const TL5_BC_NAME = "tianlight.settings";
		/** 语言模式；与 13-i18n.js 的 LANGUAGE_MODES 同值（那里是 let/const，不能前置读取）。 */
		const TL5_LANGUAGE_MODES = ["auto", "zh", "en"];

		/* ================= 文案（i18n） =================
		 * 本片段的顶层在 13-i18n.js 之前执行，所以这里只存数据；注册动作放在
		 * bootstrapSettingsRuntime() / installSettingsRuntime() 里（那时 13 已初始化）。
		 * 只补 13-i18n.js 基础字典里没有的 key，已有 key 直接复用。 */
		const TL5_SCHEMA_STRINGS = {
			zh: {
				"settings.schemaVersion": "schema 版本",
				"settings.schemaFromTo": "v{from} → v{to}",
				"settings.available": "可用",
				"settings.unavailable": "不可用",
				"settings.resident": "常驻",
				"settings.fps": "帧率",
				"settings.jitter": "抖动",
				"settings.tier": "渲染档位",
				"settings.lowPower": "省电",
				"settings.cache": "静态帧缓存",
				"settings.cacheRate": "缓存命中率",
				"settings.effectsLayer": "特效层",
				"settings.updated": "更新于",
				"settings.lastError": "最近错误",
				"settings.activeModules": "活动模块",
				"settings.capabilityHost": "宿主设置",
				"settings.capabilityRuntime": "运行时诊断",
				"settings.none": "—",
				"settings.syncing": "同步中…",
				"settings.syncHint": "宿主不可用时配置保存在浏览器本地；宿主恢复后点“立即同步”合并。",
				"settings.diagHint": "控制台可读 __dshTianlightInstance.modules() / settings()。",
				"settings.backup": "导入前备份",
				"settings.recoverBackup": "恢复宿主导入前备份",
				"settings.recovered": "已恢复 {n} 项",
				"settings.recoverEmpty": "没有可恢复的备份",
			},
			en: {
				"settings.schemaVersion": "Schema version",
				"settings.schemaFromTo": "v{from} → v{to}",
				"settings.available": "Available",
				"settings.unavailable": "Unavailable",
				"settings.resident": "Always on",
				"settings.fps": "FPS",
				"settings.jitter": "Jitter",
				"settings.tier": "Render tier",
				"settings.lowPower": "Low power",
				"settings.cache": "Frame cache",
				"settings.cacheRate": "Cache hit rate",
				"settings.effectsLayer": "Effects layer",
				"settings.updated": "Updated",
				"settings.lastError": "Last error",
				"settings.activeModules": "Active modules",
				"settings.capabilityHost": "Host settings",
				"settings.capabilityRuntime": "Runtime diagnostics",
				"settings.none": "—",
				"settings.syncing": "Syncing…",
				"settings.syncHint": "Without a host, settings stay in this browser; press Sync now once the host returns.",
				"settings.diagHint": "Console: __dshTianlightInstance.modules() / settings().",
				"settings.backup": "Pre-import backup",
				"settings.recoverBackup": "Restore pre-import backup",
				"settings.recovered": "Restored {n} item(s)",
				"settings.recoverEmpty": "No backup to restore",
			},
		};

		function registerSchemaStrings() {
			// registerTl5Strings 是 13-i18n.js 的函数声明（会提升），但它引用的
			// TL5_STRINGS 是 const；正常调用点都在 apply() 之后，不存在 TDZ 问题。
			try {
				registerTl5Strings(TL5_SCHEMA_STRINGS);
			} catch (error) {
				note("settings:strings", error);
			}
		}

		/* ================= 通用小工具（全部带 tl5 前缀，避免与别的片段重名） ================= */

		/** localStorage 可能被浏览器策略禁用（SecurityError）。每次访问都兜底。 */
		function tl5Storage() {
			try {
				return globalThis.localStorage ?? null;
			} catch {
				return null;
			}
		}

		/** 枚举 localStorage 的键；枚举失败（权限/配额异常）时返回空数组。 */
		function tl5StorageKeys(storage) {
			const keys = [];
			try {
				if (typeof storage.key === "function" && typeof storage.length === "number") {
					for (let index = 0; index < storage.length; index += 1) {
						const key = storage.key(index);
						if (typeof key === "string") keys.push(key);
					}
					return keys;
				}
			} catch {
				return [];
			}
			try {
				return Object.keys(storage).filter((key) => typeof key === "string");
			} catch {
				return [];
			}
		}

		function tl5IsPlainObject(value) {
			return value !== null && typeof value === "object" && Array.isArray(value) === false;
		}

		function tl5Json(value) {
			return JSON.stringify(value);
		}

		function tl5Clamp(number, min, max) {
			return Math.min(max, Math.max(min, number));
		}

		/**
		 * 一个键是否属于“设置”。
		 * 本机元数据（schema / backup / revision）必须排除：它们要么由迁移维护，
		 * 要么是每台机器自己的水位线，不能被别的浏览器覆盖。
		 */
		function tl5SyncableKey(key) {
			if (typeof key !== "string" || key === "") return false;
			if (TL5_META_EXACT.indexOf(key) >= 0) return false;
			for (const prefix of TL5_META_PREFIXES) {
				if (key.startsWith(prefix)) return false;
			}
			for (const prefix of TL5_SETTINGS_PREFIXES) {
				// 前缀本身不是键（宿主 lib/settings-store.js 也把 "tianlight." 判为 400）。
				if (key.length > prefix.length && key.startsWith(prefix)) return true;
			}
			return false;
		}

		/* ================= E2：schema 迁移框架 =================
		 *
		 * 每条迁移只做“旧形状 → 当前形状”的结构搬运，并保留未知字段：
		 *   - 已经是当前形状的值原样不动（返回 null，不产生写入）；
		 *   - 损坏的 JSON 记入 failed，原件不动（读取方本来就会退化到默认值）；
		 *   - 迁移前把被改写的原始字符串一次性备份进 `tianlight.backup.v5`，容量上限 1MB；
		 *   - 无论成败最后都写入 `tianlight.schema = "5"`，保证跨刷新只迁移一次。
		 *
		 * 迁移表是唯一的“旧键清单”。新增 v5 键（effects/context/legibility/transition）
		 * 在 v0.4.0 不存在，因此只做 JSON 对象校验，不做改写。
		 */

		const TL5_FILTER_DEFAULTS = { on: false, brightness: 100, contrast: 100, saturate: 100 };
		const TL5_ROTATION_INTERVALS = [30, 60, 120, 300, 600];
		const TL5_RAIL_DEFAULTS = { fit: "cover", fx: 50, fy: 50, dim: 16, blur: 0, url: "", kind: "video" };
		const TL5_ZONE_LEGACY_FIELDS = ["zoom", "ratio", "cx", "cy", "fx", "fy", "fit", "dim", "blur"];
		const TL5_FONT_DEFAULTS = { size: 14, ui: "system", code: "system", weight: "normal", lead: "normal", track: "normal" };

		/** 旧版壁纸可能只有 url；按扩展名猜一个 kind（读侧仍会把未知 kind 兜成 video）。 */
		function tl5GuessMediaKind(url) {
			const path = String(url).split("?")[0].split("#")[0].toLowerCase();
			if (/\.(png|jpe?g|webp|gif|avif|bmp|svg)$/.test(path)) return "image";
			return "video";
		}

		/** `tianlight.wallpaper`：纯 URL 字符串 / 缺 kind 的对象 → {kind,url,still?}。 */
		function repairWallpaperSetting(raw) {
			const value = JSON.parse(raw);
			if (typeof value === "string" && value !== "") {
				return tl5Json({ kind: tl5GuessMediaKind(value), url: value });
			}
			if (tl5IsPlainObject(value) === false) return null;
			if (typeof value.url !== "string" || value.url === "") return null;
			if (typeof value.kind === "string" && value.kind !== "") return null;
			return tl5Json({ ...value, kind: tl5GuessMediaKind(value.url) });
		}

		/** `tianlight.playback`：filter 旧版是布尔或平铺字段；speed 旧版可能是字符串。 */
		function repairPlaybackSetting(raw) {
			const value = JSON.parse(raw);
			if (tl5IsPlainObject(value) === false) return null;
			const next = { ...value };
			let changed = false;
			if (typeof next.filter === "boolean") {
				next.filter = { ...TL5_FILTER_DEFAULTS, on: next.filter === true };
				changed = true;
			} else if (next.filter === undefined) {
				const legacyKeys = ["on", "brightness", "contrast", "saturate"];
				if (legacyKeys.some((key) => next[key] !== undefined)) {
					const filter = { ...TL5_FILTER_DEFAULTS };
					if (next.on === true) filter.on = true;
					for (const key of ["brightness", "contrast", "saturate"]) {
						const number = Number(next[key]);
						if (Number.isFinite(number)) filter[key] = Math.round(number);
					}
					next.filter = filter;
					for (const key of legacyKeys) delete next[key];
					changed = true;
				}
			}
			if (typeof next.speed === "string" && next.speed.trim() !== "") {
				const speed = Number(next.speed);
				if (Number.isFinite(speed)) {
					next.speed = speed;
					changed = true;
				}
			}
			return changed ? tl5Json(next) : null;
		}

		function tl5NearestInterval(seconds) {
			let best = TL5_ROTATION_INTERVALS[0];
			for (const candidate of TL5_ROTATION_INTERVALS) {
				if (Math.abs(candidate - seconds) < Math.abs(best - seconds)) best = candidate;
			}
			return best;
		}

		/** `tianlight.rotation`：interval 可能是 "2m"/"120s"/"120"；order "shuffle" → "random"。 */
		function repairRotationSetting(raw) {
			const value = JSON.parse(raw);
			if (tl5IsPlainObject(value) === false) return null;
			const next = { ...value };
			let changed = false;
			if (typeof next.interval === "string") {
				const match = next.interval.trim().toLowerCase().match(/^(\d+(?:\.\d+)?)\s*(s|sec|secs|秒|m|min|mins|分|分钟)?$/);
				if (match !== null) {
					const amount = Number(match[1]);
					const unit = match[2] ?? "";
					const minutes = unit === "m" || unit === "min" || unit === "mins" || unit === "分" || unit === "分钟";
					next.interval = tl5NearestInterval(minutes ? amount * 60 : amount);
					changed = true;
				}
			}
			if (next.order === "shuffle") {
				next.order = "random";
				changed = true;
			}
			return changed ? tl5Json(next) : null;
		}

		/** `tianlight.library`：v0.3 之前是收藏 URL 数组 / {favorites:[...]} → {items:{url:meta}}。 */
		function repairLibrarySetting(raw) {
			const value = JSON.parse(raw);
			if (Array.isArray(value)) {
				const items = {};
				for (const url of value) {
					if (typeof url === "string" && url !== "") items[url] = { favorite: true, tags: [], hidden: false };
				}
				return tl5Json({ items });
			}
			if (tl5IsPlainObject(value) === false) return null;
			if (Array.isArray(value.favorites) && value.items === undefined) {
				const items = {};
				for (const url of value.favorites) {
					if (typeof url === "string" && url !== "") items[url] = { favorite: true, tags: [], hidden: false };
				}
				const next = { ...value, items };
				delete next.favorites;
				return tl5Json(next);
			}
			return null;
		}

		/** `tianlight.zones`：v0.3 的平铺取景对象 → {separate,main,rail}。 */
		function repairZonesSetting(raw) {
			const value = JSON.parse(raw);
			if (tl5IsPlainObject(value) === false) return null;
			if (tl5IsPlainObject(value.main) || tl5IsPlainObject(value.rail) || typeof value.separate === "boolean") return null;
			const legacy = TL5_ZONE_LEGACY_FIELDS.filter((key) => value[key] !== undefined);
			if (legacy.length === 0) return null;
			const main = {};
			for (const key of legacy) main[key] = value[key];
			const next = { ...value, separate: false, main, rail: { ...TL5_RAIL_DEFAULTS } };
			for (const key of legacy) delete next[key];
			return tl5Json(next);
		}

		/** `tianlight.glass`：当前是裸数字字符串；JSON 数字/对象是旧格式，越界值夹到 0.35–1.5。 */
		function repairGlassSetting(raw) {
			const number = Number(raw);
			if (Number.isFinite(number)) {
				const clamped = tl5Clamp(number, 0.35, 1.5);
				return clamped === number ? null : String(clamped);
			}
			try {
				const value = JSON.parse(raw);
				if (tl5IsPlainObject(value)) {
					const candidate = Number(value.value ?? value.level ?? value.opacity);
					if (Number.isFinite(candidate)) return String(tl5Clamp(candidate, 0.35, 1.5));
				}
			} catch {
				// 非 JSON 文本：按损坏值重置为默认 1
			}
			return "1";
		}

		/** `tianlight.lowpower`：布尔 true/false → on/off；manual → on。 */
		function repairLowPowerSetting(raw) {
			if (raw === "on" || raw === "off" || raw === "auto") return null;
			if (raw === "true") return "on";
			if (raw === "false") return "off";
			try {
				const value = JSON.parse(raw);
				if (value === true) return "on";
				if (value === false) return "off";
				if (value === "on" || value === "off" || value === "auto") return value;
				if (value === "manual") return "on";
				if (value === "battery" || value === "auto-battery") return "auto";
			} catch {
				// 非 JSON 文本
			}
			return raw === "manual" ? "on" : null;
		}

		/** `tianlight.fps`：数字/"30fps"/"high" 等旧写法归一到 auto/60/30/15。 */
		function repairFpsSetting(raw) {
			if (raw === "auto" || raw === "60" || raw === "30" || raw === "15") return null;
			try {
				const value = JSON.parse(raw);
				if (typeof value === "string" || typeof value === "number") return repairFpsSetting(String(value));
			} catch {
				// 非 JSON 文本，按下面的文本规则处理
			}
			const text = String(raw).trim().toLowerCase().replace(/fps$/, "");
			const number = Number(text);
			if (Number.isFinite(number)) {
				if (number >= 45) return "60";
				if (number >= 22) return "30";
				return "15";
			}
			if (text === "high") return "60";
			if (text === "low" || text === "battery") return "15";
			return null;
		}

		/** `tianlight.shader`：旧版是纯 preset 字符串，但源码无法在这里恢复；只让损坏 JSON 记 failed。 */
		function repairShaderSetting(raw) {
			const value = JSON.parse(raw);
			if (tl5IsPlainObject(value)) return null;
			return null;
		}

		/** 槽位只做结构搬运；值域校验交给 30-wallpaper.js 的 normalizeLayerSlot（避免删掉新预设）。 */
		function tl5CleanLayerSlot(value) {
			const slot = { kind: "none", preset: "none", url: "", fit: "cover", opacity: 0.55, blend: "normal" };
			if (tl5IsPlainObject(value) === false) return slot;
			for (const key of Object.keys(slot)) {
				if (value[key] !== undefined) slot[key] = value[key];
			}
			return slot;
		}

		/** `tianlight.layers`：v1 单对象/数组 → {version:2,slots:[A,B]}。 */
		function repairLayersSetting(raw) {
			const value = JSON.parse(raw);
			if (Array.isArray(value)) {
				return tl5Json({ version: 2, slots: [tl5CleanLayerSlot(value[0]), tl5CleanLayerSlot(value[1])] });
			}
			if (tl5IsPlainObject(value) === false) return null;
			if (Array.isArray(value.slots)) {
				if (value.version === 2) return null;
				return tl5Json({ ...value, version: 2 });
			}
			// v1：单对象就是一个叠加层 → 放进 A 槽，B 槽补默认值。
			return tl5Json({ version: 2, slots: [tl5CleanLayerSlot(value), tl5CleanLayerSlot(undefined)] });
		}

		/** `tianlight.font.family`：旧版只存字族 id（纯文本或 JSON 字符串）→ 完整排版对象。 */
		function repairFontFamilySetting(raw) {
			let value;
			try {
				value = JSON.parse(raw);
			} catch {
				value = undefined;
			}
			if (tl5IsPlainObject(value)) return null;
			if (typeof value === "string" && /^[a-z][a-z0-9-]{0,31}$/.test(value)) {
				return tl5Json({ ...TL5_FONT_DEFAULTS, ui: value });
			}
			if (value === undefined && /^[a-z][a-z0-9-]{0,31}$/.test(raw)) {
				return tl5Json({ ...TL5_FONT_DEFAULTS, ui: raw });
			}
			return null;
		}

		function tl5PxNumber(value) {
			if (typeof value === "number") return Number.isFinite(value) ? value : null;
			if (typeof value !== "string") return null;
			const match = value.trim().match(/^(-?\d+(?:\.\d+)?)(?:px)?$/i);
			return match === null ? null : Number(match[1]);
		}

		/** `tianlight.font.position`：{x,y} / "120px" 字符串 → {left,top} 数字。 */
		function repairFontPositionSetting(raw) {
			let value;
			try {
				value = JSON.parse(raw);
			} catch {
				return null;
			}
			if (tl5IsPlainObject(value) === false) return null;
			const next = { ...value };
			let changed = false;
			for (const pair of [["left", "x"], ["top", "y"]]) {
				const axis = pair[0];
				const legacyAxis = pair[1];
				const parsed = tl5PxNumber(next[axis]);
				if (parsed !== null && typeof next[axis] !== "number") {
					next[axis] = parsed;
					changed = true;
				}
				if (next[axis] === undefined && tl5PxNumber(next[legacyAxis]) !== null) {
					next[axis] = tl5PxNumber(next[legacyAxis]);
					delete next[legacyAxis];
					changed = true;
				}
			}
			return changed ? tl5Json(next) : null;
		}

		/** 桌宠 `dsh-tianlight:cat:v1`：补齐 mood 默认值，字符串数字转数字，left/top → x/y。 */
		function repairCompanionSetting(raw) {
			let value;
			try {
				value = JSON.parse(raw);
			} catch {
				return null;
			}
			if (tl5IsPlainObject(value) === false) return null;
			const next = { ...value };
			let changed = false;
			if (next.mood === undefined) {
				next.mood = 62;
				changed = true;
			} else if (typeof next.mood === "string" && Number.isFinite(Number(next.mood))) {
				next.mood = Number(next.mood);
				changed = true;
			}
			for (const pair of [["x", "left"], ["y", "top"]]) {
				const axis = pair[0];
				const legacyAxis = pair[1];
				if (next[axis] === undefined && Number.isFinite(next[legacyAxis])) {
					next[axis] = next[legacyAxis];
					delete next[legacyAxis];
					changed = true;
				} else if (typeof next[axis] === "string" && Number.isFinite(Number(next[axis]))) {
					next[axis] = Number(next[axis]);
					changed = true;
				}
			}
			return changed ? tl5Json(next) : null;
		}

		/** `tianlight.modules`：数组（启用名单）/ "true" 字符串 → 布尔对象；缺省模块由读取方补默认 true。 */
		function repairModulesSetting(raw) {
			let value;
			try {
				value = JSON.parse(raw);
			} catch {
				return null;
			}
			if (Array.isArray(value)) {
				const state = {};
				for (const def of MODULE_DEFS) {
					state[def.id] = def.switchable === false ? true : value.indexOf(def.id) >= 0;
				}
				return tl5Json(state);
			}
			if (tl5IsPlainObject(value) === false) return null;
			let changed = false;
			const next = { ...value };
			for (const def of MODULE_DEFS) {
				const saved = next[def.id];
				if (saved === "true" || saved === "false") {
					next[def.id] = saved === "true";
					changed = true;
				} else if (saved !== undefined && typeof saved !== "boolean") {
					next[def.id] = saved === 1 || saved === "on" || saved === "enabled";
					changed = true;
				}
			}
			return changed ? tl5Json(next) : null;
		}

		/** `tianlight.language`：JSON 字符串 `"zh"` → 裸值 zh。 */
		function repairLanguageSetting(raw) {
			if (TL5_LANGUAGE_MODES.indexOf(raw) >= 0) return null;
			try {
				const value = JSON.parse(raw);
				if (typeof value === "string" && TL5_LANGUAGE_MODES.indexOf(value) >= 0) return value;
			} catch {
				// 非 JSON 文本
			}
			return null;
		}

		/** v5 新键（effects/context/legibility/transition）：只校验是 JSON 对象，形状归各自控制器。 */
		function repairJsonObjectSetting(raw) {
			const value = JSON.parse(raw);
			if (tl5IsPlainObject(value)) return null;
			return null;
		}

		/** `tianlight.sync.revision`：非负整数文本；其他写法带上限重置。 */
		function repairSyncRevisionSetting(raw) {
			if (/^\d+$/.test(raw)) return null;
			const number = Number(raw);
			if (Number.isInteger(number) && number >= 0) return String(number);
			return "0";
		}

		const TL5_MIGRATIONS = [
			{ key: "tianlight.wallpaper", repair: repairWallpaperSetting },
			{ key: "tianlight.playback", repair: repairPlaybackSetting },
			{ key: "tianlight.rotation", repair: repairRotationSetting },
			{ key: "tianlight.library", repair: repairLibrarySetting },
			{ key: "tianlight.zones", repair: repairZonesSetting },
			{ key: "tianlight.glass", repair: repairGlassSetting },
			{ key: "tianlight.lowpower", repair: repairLowPowerSetting },
			{ key: "tianlight.fps", repair: repairFpsSetting },
			{ key: "tianlight.shader", repair: repairShaderSetting },
			{ key: "tianlight.layers", repair: repairLayersSetting },
			{ key: "tianlight.font.family", repair: repairFontFamilySetting },
			{ key: "tianlight.font.position", repair: repairFontPositionSetting },
			{ key: STORAGE_KEY, repair: repairCompanionSetting },
			{ key: "tianlight.modules", repair: repairModulesSetting },
			{ key: "tianlight.language", repair: repairLanguageSetting },
			{ key: "tianlight.effects", repair: repairJsonObjectSetting },
			{ key: "tianlight.context", repair: repairJsonObjectSetting },
			{ key: "tianlight.legibility", repair: repairJsonObjectSetting },
			{ key: "tianlight.transition", repair: repairJsonObjectSetting },
			{ key: TL5_SYNC_REVISION_KEY, repair: repairSyncRevisionSetting },
		];

		/**
		 * 备份被改写的原始值，一次迁移只写一次；已有备份里存在的键不覆盖
		 * （保留最早的原件）。超过 1MB 时从后往前放弃，并记入诊断。
		 */
		function tl5BackupOriginals(storage, originals) {
			if (originals.size === 0) return;
			let backup = {};
			let existing = null;
			try {
				existing = storage.getItem(TL5_BACKUP_KEY);
			} catch {
				existing = null;
			}
			if (existing !== null && existing !== "") {
				try {
					const parsed = JSON.parse(existing);
					if (tl5IsPlainObject(parsed)) backup = parsed;
				} catch {
					// 备份本身损坏：本次迁移重建一份（原件只此一份，优先保住本次数据）
					backup = {};
				}
			}
			let bytes = tl5Json(backup).length;
			let added = 0;
			for (const pair of originals) {
				const key = pair[0];
				const raw = pair[1];
				if (Object.prototype.hasOwnProperty.call(backup, key)) continue;
				const cost = tl5Json(key).length + tl5Json(raw).length + 4;
				if (bytes + cost > TL5_BACKUP_MAX_BYTES) {
					tl5Diag("settings", { backupSkipped: key });
					continue;
				}
				backup[key] = raw;
				bytes += cost;
				added += 1;
			}
			if (added === 0) return;
			try {
				storage.setItem(TL5_BACKUP_KEY, tl5Json(backup));
			} catch (error) {
				note("settings:backup", error);
			}
		}

		/** 读取已存的 schema 版本；缺失/损坏一律视为迁移前（0）。 */
		function readStoredSchemaVersion(storage) {
			let raw = null;
			try {
				raw = storage.getItem(TL5_SCHEMA_KEY);
			} catch {
				return 0;
			}
			if (raw === null || raw === "") return 0;
			const direct = Number(raw);
			if (Number.isInteger(direct) && direct >= 0) return direct;
			try {
				const parsed = JSON.parse(raw);
				if (tl5IsPlainObject(parsed)) {
					const version = Number(parsed.version);
					if (Number.isInteger(version) && version >= 0) return version;
				}
			} catch {
				// 损坏的版本标记：当作迁移前处理一次
			}
			return 0;
		}

		/** 实际执行一遍迁移（每会话一次）。任何单键失败只记录，不中断其他键。 */
		function executeSchemaMigrations() {
			const report = { from: 0, to: TL5_SCHEMA_VERSION, migrated: [], failed: [] };
			const storage = tl5Storage();
			if (storage === null) {
				report.failed.push("storage");
				return report;
			}
			report.from = readStoredSchemaVersion(storage);
			// schema 已是当前版本：直接跳过。等价于“每个浏览器只迁移一次”。
			if (report.from >= TL5_SCHEMA_VERSION) return report;
			const rewrites = new Map();
			const originals = new Map();
			for (const entry of TL5_MIGRATIONS) {
				let raw = null;
				try {
					raw = storage.getItem(entry.key);
				} catch {
					report.failed.push(entry.key);
					continue;
				}
				if (raw === null || raw === "") continue;
				try {
					const next = entry.repair(raw);
					if (typeof next === "string" && next !== raw) {
						rewrites.set(entry.key, next);
						originals.set(entry.key, raw);
					}
				} catch {
					// 损坏的 JSON / 未知旧形状：保留原件，读取方会退化到默认值。
					report.failed.push(entry.key);
				}
			}
			try {
				tl5BackupOriginals(storage, originals);
			} catch (error) {
				note("settings:backup", error);
			}
			for (const pair of rewrites) {
				try {
					storage.setItem(pair[0], pair[1]);
					report.migrated.push(pair[0]);
				} catch {
					report.failed.push(pair[0]);
				}
			}
			// 即使有失败键也盖章：否则每次刷新都会重新尝试同一批损坏值。
			try {
				storage.setItem(TL5_SCHEMA_KEY, String(TL5_SCHEMA_VERSION));
			} catch {
				report.failed.push(TL5_SCHEMA_KEY);
			}
			return report;
		}

		let schemaReport = null;

		const schemaRuntime = {
			report: () =>
				schemaReport === null
					? { from: 0, to: TL5_SCHEMA_VERSION, migrated: [], failed: [] }
					: {
							from: schemaReport.from,
							to: schemaReport.to,
							migrated: schemaReport.migrated.slice(),
							failed: schemaReport.failed.slice(),
						},
			migrate: () => {
				if (schemaReport === null) {
					try {
						schemaReport = executeSchemaMigrations();
					} catch (error) {
						note("settings:migrate", error);
						schemaReport = { from: 0, to: TL5_SCHEMA_VERSION, migrated: [], failed: ["*"] };
					}
					tl5Diag("settings", { migrated: schemaReport.migrated, failed: schemaReport.failed, from: schemaReport.from, to: schemaReport.to });
				}
				return schemaRuntime.report();
			},
		};

		/* ================= E1/E3：宿主设置 + 本地镜像 + 多窗口 ================= */

		function tl5ReadSyncRevision() {
			const storage = tl5Storage();
			if (storage === null) return 0;
			try {
				const number = Number(storage.getItem(TL5_SYNC_REVISION_KEY));
				return Number.isInteger(number) && number >= 0 ? number : 0;
			} catch {
				return 0;
			}
		}

		const settingsState = {
			host: false,
			revision: tl5ReadSyncRevision(),
			pending: 0,
			lastError: "",
			/** 宿主 404/405/501：路由不存在（旧版本宿主），不要每次写入都重试。 */
			hostRouteMissing: false,
			/** tianlight.backup.host 是否存在可用备份（bootstrap/安装时刷新，避免 status 反复解析）。 */
			backup: false,
			/** 最近一次 recoverBackup 恢复的键数（面板显示“已恢复 N 项”）。 */
			recovered: 0,
		};
		/** bootstrap push 的计数，供 verifier 断言“首启全量推送”。 */
		let settingsSyncStats = { localKeys: 0, remoteKeys: 0, pushedKeys: 0 };
		const settingsSubscribers = new Set();
		/** 本窗口的随机 id：BroadcastChannel 不回放自己的消息。 */
		const settingsInstanceId = "tl5-" + Math.random().toString(36).slice(2, 10) + "-" + Date.now().toString(36);

		const settingsMirror = {
			installed: false,
			storage: null,
			originalSet: null,
			originalRemove: null,
			restore: null,
			eventTarget: null,
			onStorage: null,
			channel: null,
			onChannelMessage: null,
			timer: 0,
			queue: new Map(),
			inFlight: 0,
			retries: 0,
		};
		/** 对齐运行时状态时置位：写入本地但不进镜像队列（值本来就来自宿主/迁移）。 */
		let settingsSuppressMirror = false;

		function settingsStatus() {
			const report = schemaRuntime.report();
			return {
				host: settingsState.host,
				revision: settingsState.revision,
				pending: settingsState.pending,
				lastError: settingsState.lastError,
				migrated: report.migrated,
				schema: { from: report.from, to: report.to },
				/** 是否存在 tianlight.backup.host 备份（面板“恢复宿主导入前备份”按钮）。 */
				backup: settingsState.backup === true,
				/** 最近一次 recoverBackup 的恢复项数（0 表示本会话还没恢复过）。 */
				recovered: settingsState.recovered,
			};
		}

		function settingsNotify() {
			tl5Diag("settings", settingsStatus());
			if (settingsSubscribers.size === 0) return;
			const snapshot = settingsStatus();
			for (const listener of [...settingsSubscribers]) {
				try {
					listener(snapshot);
				} catch (error) {
					note("settings:subscriber", error);
				}
			}
		}

		/**
		 * 一次宿主请求。所有失败（网络、超时、非 2xx、坏 JSON）都折叠成
		 * { ok:false, status, error }，调用方不需要 try/catch。
		 */
		async function settingsRequest(method, payload, timeoutMs) {
			if (typeof fetch !== "function") return { ok: false, status: 0, error: "host:no-fetch" };
			const controller = typeof AbortController === "function" ? new AbortController() : null;
			let timer = 0;
			if (controller !== null) {
				timer = window.setTimeout(() => {
					try {
						controller.abort();
					} catch {
						// already settled
					}
				}, timeoutMs);
			}
			try {
				const response = await fetch(TL5_SETTINGS_ROUTE, {
					method: method,
					headers: { "Content-Type": "application/json", Accept: "application/json" },
					body: payload === undefined ? undefined : JSON.stringify(payload),
					signal: controller === null ? undefined : controller.signal,
					credentials: "same-origin",
					cache: "no-store",
				});
				const status = Number(response?.status ?? 0);
				if (response === null || response === undefined || response.ok !== true) {
					return { ok: false, status: status, error: "host:" + String(status === 0 ? "network" : status) };
				}
				let data = null;
				try {
					data = await response.json();
				} catch {
					return { ok: false, status: status, error: "host:bad-json" };
				}
				if (tl5IsPlainObject(data) === false) return { ok: false, status: status, error: "host:bad-json" };
				return { ok: true, status: status, data: data };
			} catch (error) {
				const aborted = controller !== null && controller.signal !== undefined && controller.signal.aborted === true;
				return { ok: false, status: 0, error: aborted ? "host:timeout" : "host:network" };
			} finally {
				if (timer !== 0) {
					window.clearTimeout(timer);
					timer = 0;
				}
			}
		}

		/** 收集本机全部“设置”键（同步镜像的源）。 */
		function collectLocalSettings() {
			const map = {};
			const storage = tl5Storage();
			if (storage === null) return map;
			for (const key of tl5StorageKeys(storage)) {
				if (tl5SyncableKey(key) === false) continue;
				try {
					const value = storage.getItem(key);
					if (typeof value === "string") map[key] = value;
				} catch {
					// 单个键读失败不影响其余键
				}
			}
			return map;
		}

		/** 宿主返回的 settings 只接受合法键与 string|null 值。 */
		function sanitizeRemoteSettings(raw) {
			const map = {};
			if (tl5IsPlainObject(raw) === false) return map;
			for (const key of Object.keys(raw)) {
				if (tl5SyncableKey(key) === false) continue;
				const value = raw[key];
				if (typeof value === "string") map[key] = value;
				else if (value === null) map[key] = null;
			}
			return map;
		}

		/** 计算本地 → 宿主的差异；null 表示删除（远端存在而本地没有的键）。 */
		function buildSettingsPush(local, remote) {
			const push = {};
			let changed = false;
			const keys = new Set([...Object.keys(local), ...Object.keys(remote)]);
			for (const key of keys) {
				const left = Object.prototype.hasOwnProperty.call(local, key) ? local[key] : null;
				const right = Object.prototype.hasOwnProperty.call(remote, key) ? remote[key] : null;
				if (left === right) continue;
				push[key] = left;
				changed = true;
			}
			return changed ? push : null;
		}

		/** 绕过镜像层写 localStorage（外部值落地 / 元数据写入都必须用这些）。 */
		function tl5RawSet(storage, key, value) {
			const mirror = settingsMirror;
			if (mirror.installed === true && mirror.storage === storage && typeof mirror.originalSet === "function") {
				return mirror.originalSet.call(storage, key, value);
			}
			return storage.setItem(key, value);
		}

		function tl5RawRemove(storage, key) {
			const mirror = settingsMirror;
			if (mirror.installed === true && mirror.storage === storage && typeof mirror.originalRemove === "function") {
				return mirror.originalRemove.call(storage, key);
			}
			return storage.removeItem(key);
		}

		function tl5WriteSyncRevision(revision) {
			settingsState.revision = revision;
			const storage = tl5Storage();
			if (storage === null) return;
			try {
				const text = String(revision);
				if (storage.getItem(TL5_SYNC_REVISION_KEY) === text) return; // 避免无意义的 storage 事件
				tl5RawSet(storage, TL5_SYNC_REVISION_KEY, text);
			} catch (error) {
				note("settings:revision-write", error);
			}
		}

		/** 外部来源（宿主/BC/storage 事件）的配置落地：不回声、不镜像。 */
		function applyExternalSettings(patch, source) {
			const storage = tl5Storage();
			if (storage === null || tl5IsPlainObject(patch) === false) return 0;
			const changedKeys = [];
			for (const key of Object.keys(patch)) {
				if (tl5SyncableKey(key) === false) continue;
				const value = patch[key];
				// 外部写入是“最后写入者”，把还在去抖队列里的本地旧值丢掉。
				settingsMirror.queue.delete(key);
				let current = null;
				try {
					current = storage.getItem(key);
				} catch {
					continue;
				}
				try {
					if (value === null) {
						if (current !== null) {
							tl5RawRemove(storage, key);
							changedKeys.push(key);
						}
					} else if (typeof value === "string" && current !== value) {
						tl5RawSet(storage, key, value);
						changedKeys.push(key);
					}
				} catch (error) {
					note("settings:external-write", { key, error });
				}
			}
			if (settingsMirror.installed === true) {
				settingsState.pending = settingsMirror.queue.size + settingsMirror.inFlight;
			}
			if (changedKeys.length > 0) {
				settingsNotify();
				dispatchSettingsEvent(source, changedKeys);
			}
			return changedKeys.length;
		}

		/* ---- 宿主导入前的本地备份（v0.5.2 数据安全） ---- */

		/** tianlight.backup.host 是否可用（存在且至少一个键）。只在 bootstrap/安装/恢复时调用。 */
		function tl5HostBackupAvailable() {
			const storage = tl5Storage();
			if (storage === null) return false;
			try {
				const raw = storage.getItem(TL5_HOST_BACKUP_KEY);
				if (raw === null || raw === "") return false;
				const parsed = JSON.parse(raw);
				return tl5IsPlainObject(parsed) && Object.keys(parsed).length > 0;
			} catch {
				return false;
			}
		}

		function tl5RefreshBackupFlag() {
			settingsState.backup = tl5HostBackupAvailable();
		}

		/**
		 * 把导入前的本地可同步键写进 tianlight.backup.host（本地专用，mirror 已排除）。
		 * 256KB 上限：超限时按 key 截断并记诊断——宁可少备份，也不写超大值。
		 */
		function tl5WriteHostBackup(storage, map) {
			try {
				const keys = Object.keys(map);
				if (keys.length === 0) return;
				let text = tl5Json(map);
				if (text.length > TL5_HOST_BACKUP_MAX_BYTES) {
					const trimmed = {};
					let bytes = 2;
					for (const key of keys) {
						const cost = tl5Json(key).length + tl5Json(map[key]).length + 4;
						if (bytes + cost > TL5_HOST_BACKUP_MAX_BYTES) break;
						trimmed[key] = map[key];
						bytes += cost;
					}
					text = tl5Json(trimmed);
					tl5Diag("settings", { hostBackupTruncated: true });
				}
				storage.setItem(TL5_HOST_BACKUP_KEY, text);
				settingsState.backup = true;
			} catch (error) {
				note("settings:host-backup", error);
			}
		}

		/**
		 * 宿主 revision 更新时的落地（v0.5.2 数据安全规则）：
		 *   - 宿主里有的键按宿主值落地；显式 null 是删除墓碑，仍然删除本地
		 *     （跨浏览器删除传播靠它）；
		 *   - 宿主里没有的本地键一律保留！宿主文件可能是子集/不完整，绝不能反过来
		 *     清空用户本地设置。调用方随后会把本地独有键 push 回宿主（宿主变超集）；
		 *   - 落地前若真的会改本地值，先把改动前的本地可同步键备份到
		 *     tianlight.backup.host（面板可一键恢复）。
		 * 返回真正变化的键（用于 tianlight:settings 事件与诊断）。
		 */
		function applyHostSettings(remoteMap) {
			const storage = tl5Storage();
			if (storage === null) return [];
			const changedKeys = [];
			// 1) 只读地算出会变化哪些键（决定是否需要备份），不先动任何值。
			for (const key of Object.keys(remoteMap)) {
				if (tl5SyncableKey(key) === false) continue;
				const value = remoteMap[key];
				if (value !== null && typeof value !== "string") continue;
				let current = null;
				try {
					current = storage.getItem(key);
				} catch {
					continue;
				}
				if (value === null ? current !== null : current !== value) changedKeys.push(key);
			}
			if (changedKeys.length === 0) {
				settingsState.pending = settingsMirror.queue.size + settingsMirror.inFlight;
				return changedKeys;
			}
			// 2) 备份“导入前”的本地设置（只备份真正会被改动的那一次）。
			tl5WriteHostBackup(storage, collectLocalSettings());
			// 3) 这些键的宿主快照是权威值：丢掉还没推送的本地旧值；本地独有键的队列保留。
			for (const key of changedKeys) settingsMirror.queue.delete(key);
			// 4) 只应用宿主里存在的键；本地独有的键保持原样（不删除）。
			for (const key of changedKeys) {
				const value = remoteMap[key];
				try {
					if (value === null) tl5RawRemove(storage, key);
					else tl5RawSet(storage, key, value);
				} catch (error) {
					note("settings:host-write", { key, error });
				}
			}
			settingsState.pending = settingsMirror.queue.size + settingsMirror.inFlight;
			settingsNotify();
			return changedKeys;
		}

		/**
		 * 外部应用后广播 `tianlight:settings` CustomEvent（bubbles:true，所以挂在
		 * body 上时 window/document 的监听也能收到）。detail = {source, keys}。
		 */
		function dispatchSettingsEvent(source, keys) {
			try {
				let target = null;
				if (typeof document !== "undefined" && document !== null && document.body !== null) target = document.body;
				else if (settingsMirror.eventTarget !== null && settingsMirror.eventTarget !== undefined) target = settingsMirror.eventTarget;
				else if (typeof globalThis.window !== "undefined") target = globalThis.window;
				if (target === null || target === undefined || typeof target.dispatchEvent !== "function") return;
				const EventCtor = typeof globalThis.CustomEvent === "function" ? globalThis.CustomEvent : null;
				if (EventCtor === null) return;
				target.dispatchEvent(new EventCtor("tianlight:settings", { bubbles: true, detail: { source: source, keys: keys.slice() } }));
			} catch (error) {
				note("settings:event", error);
			}
		}

		/* ---- bootstrap 期间的 push（含一次重试与计数诊断） ---- */

		/** push 失败是否值得重试一次：只重试网络/超时/5xx，4xx 是宿主明确拒绝。 */
		function tl5SettingsPushRetryable(result) {
			if (result === null || typeof result !== "object") return false;
			if (result.status === 0) return true;
			return result.status >= 500;
		}

		/** 延迟；用 window.setTimeout（audit.mjs 统计 window.setTimeout/clearTimeout）。 */
		function tl5Delay(ms) {
			return new Promise((resolve) => {
				window.setTimeout(resolve, ms);
			});
		}

		/**
		 * 把本地与宿主的差异 PUT 上去（宿主按 key merge：字符串覆盖、null 删除）。
		 * 失败只重试一次（1s，且仅网络/5xx/超时），4xx/路由缺失不重试。
		 * 返回 { ok, pushedKeys, retried }；pushedKeys 含 null 墓碑条数。
		 */
		async function settingsPushDiff(local, remoteMap) {
			const push = buildSettingsPush(local, remoteMap);
			if (push === null) return { ok: true, pushedKeys: 0, retried: false };
			const pushedKeys = Object.keys(push).length;
			const send = () => settingsRequest("PUT", { revision: settingsState.revision, settings: push }, TL5_HOST_WRITE_TIMEOUT_MS);
			let put = await send();
			let retried = false;
			if (put.ok === false && tl5SettingsPushRetryable(put)) {
				retried = true;
				await tl5Delay(TL5_PUSH_RETRY_DELAY_MS);
				put = await send();
			}
			if (put.ok === true) {
				const revision = Math.max(0, Math.floor(Number(put.data.revision) || 0));
				if (revision > settingsState.revision) settingsState.revision = revision;
				tl5WriteSyncRevision(settingsState.revision);
				settingsState.host = true;
				settingsState.hostRouteMissing = false;
				settingsState.lastError = "";
				return { ok: true, pushedKeys, retried };
			}
			settingsState.lastError = put.error;
			if (put.status === 404 || put.status === 405 || put.status === 501) {
				settingsState.host = false;
				settingsState.hostRouteMissing = true;
			} else if (put.status === 400 || put.status === 412 || put.status === 413) {
				// 宿主拒绝本批（键/大小/版本冲突）：本批放弃，本地值继续生效。
				settingsState.host = true;
			}
			return { ok: false, pushedKeys, retried };
		}

		/**
		 * bootstrap：GET 宿主配置（v0.5.2 数据安全版）。
		 *   宿主 revision > 本地  → 宿主权威：只落地宿主里有的键（null 墓碑删除本地），
		 *                          本地独有键保留，随后回推给宿主（宿主重新变成超集）；
		 *   本地缓存为空 + 宿主有值 → 当作“新浏览器/本地被清空”，同样采纳宿主，绝不反向清空宿主；
		 *   宿主 revision <= 本地 → 本地权威：把差异推给宿主（含 null 删除远端孤键）。
		 * push 失败按需重试一次（1s）。宿主不可达只记 lastError，本地模式继续可用。
		 * 结束时写 tl5Diag("settings", {localKeys, remoteKeys, pushedKeys, ...})，
		 * 供 verifier 断言“首启全量推送 / 采纳后回推”。
		 */
		async function settingsBootstrap() {
			const storage = tl5Storage();
			if (storage === null) {
				settingsState.host = false;
				settingsState.lastError = "storage:blocked";
				settingsSyncStats = { localKeys: 0, remoteKeys: 0, pushedKeys: 0 };
				settingsNotify();
				return;
			}
			const result = await settingsRequest("GET", undefined, TL5_HOST_TIMEOUT_MS);
			if (result.ok === false) {
				settingsState.host = false;
				settingsState.lastError = result.error;
				settingsState.hostRouteMissing = result.status === 404 || result.status === 405 || result.status === 501;
				settingsSyncStats = { localKeys: Object.keys(collectLocalSettings()).length, remoteKeys: 0, pushedKeys: 0 };
				tl5Diag("settings", { ...settingsStatus(), ...settingsSyncStats });
				settingsNotify();
				return;
			}
			const remote = result.data;
			if (remote.ok === false) {
				settingsState.host = false;
				settingsState.lastError = "host:rejected";
				settingsSyncStats = { localKeys: Object.keys(collectLocalSettings()).length, remoteKeys: 0, pushedKeys: 0 };
				tl5Diag("settings", { ...settingsStatus(), ...settingsSyncStats });
				settingsNotify();
				return;
			}
			const remoteMap = sanitizeRemoteSettings(remote.settings);
			const remoteRevision = Math.max(0, Math.floor(Number(remote.revision) || 0));
			const remoteSchema = Number(remote.schemaVersion);
			settingsState.host = true;
			settingsState.hostRouteMissing = false;
			if (Number.isFinite(remoteSchema) && remoteSchema > TL5_SCHEMA_VERSION) {
				// 宿主来自更新的插件版本：不用未知形状覆盖本地，等插件升级后再合并。
				if (remoteRevision > settingsState.revision) settingsState.revision = remoteRevision;
				settingsState.lastError = "host:schema-newer";
				settingsSyncStats = {
					localKeys: Object.keys(collectLocalSettings()).length,
					remoteKeys: Object.keys(remoteMap).length,
					pushedKeys: 0,
				};
				tl5Diag("settings", { ...settingsStatus(), ...settingsSyncStats });
				settingsNotify();
				return;
			}
			const localBefore = collectLocalSettings();
			const remoteHasValues = Object.keys(remoteMap).some((key) => remoteMap[key] !== null);
			// 本地缓存完全为空而宿主有值：即使 revision 不高于本地也采纳宿主。
			// 反向（本地空 → push 一堆 null）会把宿主也清空，属于数据丢失，必须避免。
			const adoptHost = remoteRevision > settingsState.revision || (Object.keys(localBefore).length === 0 && remoteHasValues);
			if (adoptHost) {
				const changed = applyHostSettings(remoteMap);
				tl5WriteSyncRevision(Math.max(settingsState.revision, remoteRevision));
				settingsState.lastError = "";
				// 模块开关/语言在片段加载期就缓存过 localStorage，这里对齐一次。
				reconcileSettingsConsumers(["tianlight.modules", "tianlight.language"]);
				if (changed.length > 0) dispatchSettingsEvent("host", changed);
			}
			// 无论谁权威，都把本地相对宿主的差异推上去：
			//  - 首启/迁移后：remoteMap 为空 → 全量推送；
			//  - 宿主较新：宿主键已落地，本地独有键在这里回推，宿主恢复为超集。
			const local = collectLocalSettings();
			const pushed = await settingsPushDiff(local, remoteMap);
			settingsSyncStats = {
				localKeys: Object.keys(local).length,
				remoteKeys: Object.keys(remoteMap).length,
				pushedKeys: pushed.pushedKeys,
			};
			tl5RefreshBackupFlag();
			tl5Diag("settings", { ...settingsStatus(), ...settingsSyncStats, pushRetried: pushed.retried });
			settingsNotify();
		}

		/** 同浏览器多窗口广播；没有 BroadcastChannel 时静默降级（storage 事件仍在）。 */
		function settingsPostBroadcast(message) {
			const channel = settingsMirror.channel;
			if (channel === null) return;
			try {
				channel.postMessage({ type: "tl5-settings", source: settingsInstanceId, at: Date.now(), ...message });
			} catch (error) {
				note("settings:broadcast-post", error);
			}
		}

		function settingsOnBroadcast(event) {
			const data = event === null || event === undefined ? null : event.data;
			if (tl5IsPlainObject(data) === false || data.type !== "tl5-settings") return;
			if (data.source === settingsInstanceId) return;
			applyExternalSettings(data.settings, "broadcast");
			const revision = Math.max(0, Math.floor(Number(data.revision) || 0));
			if (revision > settingsState.revision) {
				tl5WriteSyncRevision(revision);
				settingsNotify();
			}
		}

		function settingsOnStorage(event) {
			if (event === null || typeof event !== "object") return;
			const key = event.key;
			if (key === TL5_SYNC_REVISION_KEY) {
				const revision = Math.max(0, Math.floor(Number(event.newValue) || 0));
				if (revision > settingsState.revision) {
					settingsState.revision = revision;
					settingsNotify();
				}
				return;
			}
			if (typeof key !== "string") return;
			if (tl5SyncableKey(key) === false) return;
			const patch = {};
			patch[key] = typeof event.newValue === "string" ? event.newValue : null;
			const applied = applyExternalSettings(patch, "storage");
			if (applied === 0) {
				// localStorage 是共享存储区，值通常已经在本窗口生效；等值检查会跳过写入。
				// 这里仍然派发事件，让监听方刷新界面。
				dispatchSettingsEvent("storage", [key]);
				settingsNotify();
			}
		}

		/** 本地写入进入去抖队列（键被补丁方法调用时触发）。 */
		function queueSettingsMirror(key, rawValue) {
			const mirror = settingsMirror;
			if (mirror.installed === false) return;
			if (tl5SyncableKey(key) === false) return;
			const value = typeof rawValue === "string" ? rawValue : rawValue === null ? null : String(rawValue);
			mirror.queue.set(key, value);
			settingsState.pending = mirror.queue.size + mirror.inFlight;
			settingsNotify();
			if (mirror.timer !== 0) window.clearTimeout(mirror.timer);
			mirror.timer = window.setTimeout(() => {
				mirror.timer = 0;
				void settingsFlushMirror().catch((error) => note("settings:mirror", error));
			}, TL5_MIRROR_DEBOUNCE_MS);
		}

		/**
		 * 把去抖队列 PUT 给宿主。成功则更新 revision 并 BC 广播；
		 * 400/412/413（宿主拒绝本批）丢弃队列但本地值继续生效；
		 * 网络/5xx 重试 TL5_MIRROR_RETRY_MAX 次后丢弃并记录。
		 */
		async function settingsFlushMirror() {
			const mirror = settingsMirror;
			if (mirror.installed === false) return false;
			if (mirror.timer !== 0) {
				window.clearTimeout(mirror.timer);
				mirror.timer = 0;
			}
			if (mirror.queue.size === 0) return settingsState.host;
			const batch = new Map(mirror.queue);
			mirror.queue.clear();
			mirror.inFlight = batch.size;
			settingsState.pending = mirror.inFlight;
			settingsNotify();
			const payload = {};
			for (const pair of batch) payload[pair[0]] = pair[1];
			let ok = false;
			try {
				if (settingsState.hostRouteMissing === true && settingsState.host === false) {
					// 旧版本宿主没有这条路由：不再每次写入都 404，只做同浏览器多窗口同步。
					settingsPostBroadcast({ revision: settingsState.revision, settings: payload, host: false });
					ok = true;
				} else {
					const put = await settingsRequest("PUT", { revision: settingsState.revision, settings: payload }, TL5_HOST_WRITE_TIMEOUT_MS);
					if (put.ok === true) {
						ok = true;
						const revision = Math.max(0, Math.floor(Number(put.data.revision) || 0));
						if (revision > settingsState.revision) settingsState.revision = revision;
						tl5WriteSyncRevision(settingsState.revision);
						settingsState.host = true;
						settingsState.hostRouteMissing = false;
						settingsState.lastError = "";
						settingsPostBroadcast({ revision: settingsState.revision, settings: payload, host: true });
					} else {
						settingsState.lastError = put.error;
						if (put.status === 404 || put.status === 405 || put.status === 501) {
							settingsState.host = false;
							settingsState.hostRouteMissing = true;
						} else if (put.status === 400 || put.status === 412 || put.status === 413) {
							// 宿主拒绝（键前缀/大小/版本冲突）：丢弃本批，本地值仍然生效。
							settingsState.host = true;
						} else if (mirror.retries < TL5_MIRROR_RETRY_MAX) {
							mirror.retries += 1;
							for (const pair of batch) {
								if (mirror.queue.has(pair[0]) === false) mirror.queue.set(pair[0], pair[1]);
							}
							mirror.inFlight = 0;
							settingsState.pending = mirror.queue.size;
							if (mirror.timer === 0) {
								mirror.timer = window.setTimeout(() => {
									mirror.timer = 0;
									void settingsFlushMirror().catch((error) => note("settings:mirror-retry", error));
								}, TL5_MIRROR_RETRY_MS);
							}
							settingsNotify();
							return false;
						}
					}
				}
			} catch (error) {
				settingsState.lastError = "sync:exception";
				note("settings:mirror", error);
			}
			mirror.inFlight = 0;
			mirror.retries = 0;
			settingsState.pending = mirror.queue.size;
			settingsNotify();
			return ok;
		}

		/* ---- 被补丁的 localStorage 方法（模块级，便于 dispose 后仍能安全转发） ---- */
		function patchedStorageSetItem(key, value) {
			const mirror = settingsMirror;
			const original = mirror.originalSet;
			const result = typeof original === "function" ? original.call(this, key, value) : undefined;
			if (mirror.installed === true && this === mirror.storage && settingsSuppressMirror === false) queueSettingsMirror(key, value);
			return result;
		}

		function patchedStorageRemoveItem(key) {
			const mirror = settingsMirror;
			const original = mirror.originalRemove;
			const result = typeof original === "function" ? original.call(this, key) : undefined;
			if (mirror.installed === true && this === mirror.storage && settingsSuppressMirror === false) queueSettingsMirror(key, null);
			return result;
		}

		/**
		 * 把“片段加载期就同步读过 localStorage”的两个消费者对齐一次。
		 *
		 * 本片段的迁移/宿主导入都发生在 apply() 里，而 11-platform.js 的模块状态、
		 * 13-i18n.js 的语言模式是在 bundle 求值时读取的；不对齐的话，宿主刚导入的
		 * 值要等下一次刷新才生效。这里只碰有公共控制器的两处（模块开关 / 语言），
		 * effects/context/legibility 的缓存属于各自片段的 install 期，不在本文件处理。
		 * 读取值与缓存一致时不产生任何写入；写入用 settingsSuppressMirror 抑制镜像，
		 * 避免“把刚导入的值又 PUT 回宿主”造成 revision 空转。
		 */
		function reconcileSettingsConsumers(keys) {
			if (Array.isArray(keys) === false || keys.length === 0) return;
			const storage = tl5Storage();
			if (storage === null) return;
			try {
				settingsSuppressMirror = true;
				if (keys.indexOf("tianlight.modules") >= 0) {
					try {
						const raw = storage.getItem("tianlight.modules");
						const parsed = raw === null || raw === "" ? null : JSON.parse(raw);
						if (tl5IsPlainObject(parsed)) {
							for (const def of MODULE_DEFS) {
								if (def.switchable === false) continue;
								if (parsed[def.id] === undefined) continue;
								if (parsed[def.id] === moduleController.isEnabled(def.id)) continue;
								moduleController.set(def.id, parsed[def.id] === true);
							}
						}
					} catch (error) {
						note("settings:reconcile-modules", error);
					}
				}
				if (keys.indexOf("tianlight.language") >= 0) {
					try {
						const raw = storage.getItem("tianlight.language");
						const mode = typeof raw === "string" ? raw : "";
						if (TL5_LANGUAGE_MODES.indexOf(mode) >= 0 && tl5Language().mode !== mode) setTl5Language(mode);
					} catch (error) {
						note("settings:reconcile-language", error);
					}
				}
			} finally {
				settingsSuppressMirror = false;
			}
		}

		/**
		 * 安装镜像层（always-on effect）。返回幂等 disposer：
		 *   还原 localStorage.setItem/removeItem、关闭 BroadcastChannel、
		 *   移除 window storage 监听、清掉去抖/重试定时器与待发送队列。
		 */
		function installSettingsRuntime(body) {
			registerSchemaStrings();
			if (settingsMirror.installed === true) return () => {};
			const storage = tl5Storage();
			if (storage === null) {
				if (settingsState.lastError === "") settingsState.lastError = "storage:blocked";
				settingsNotify();
				return () => {};
			}
			const originalSet = storage.setItem;
			const originalRemove = storage.removeItem;
			if (typeof originalSet !== "function" || typeof originalRemove !== "function") return () => {};
			settingsMirror.originalSet = originalSet;
			settingsMirror.originalRemove = originalRemove;
			settingsMirror.storage = storage;
			settingsMirror.eventTarget = body !== null && body !== undefined ? body : null;
			// 优先给 localStorage 实例自身定义属性（只影响本实例、可完全还原且不污染
			// Storage.prototype）；个别环境不允许时退回原型补丁，并用 this 判断作用域。
			let patchMode = "none";
			let ownSet = null;
			let ownRemove = null;
			let prototype = null;
			let protoSet = null;
			let protoRemove = null;
			try {
				ownSet = Object.getOwnPropertyDescriptor(storage, "setItem");
				ownRemove = Object.getOwnPropertyDescriptor(storage, "removeItem");
				Object.defineProperty(storage, "setItem", { configurable: true, writable: true, value: patchedStorageSetItem });
				Object.defineProperty(storage, "removeItem", { configurable: true, writable: true, value: patchedStorageRemoveItem });
				patchMode = "instance";
			} catch (error) {
				// 实例补丁只成功了一半时先回滚，再退回原型补丁（避免留下半补丁状态）。
				try {
					if (ownSet !== undefined && ownSet !== null) Object.defineProperty(storage, "setItem", ownSet);
					else delete storage.setItem;
					if (ownRemove !== undefined && ownRemove !== null) Object.defineProperty(storage, "removeItem", ownRemove);
					else delete storage.removeItem;
				} catch {
					// best effort: 原型补丁仍能接管，restore() 只还原原型
				}
				patchMode = "prototype";
			}
			if (patchMode === "prototype") {
				try {
					prototype = Object.getPrototypeOf(storage);
					if (prototype === null || prototype === undefined) {
						settingsMirror.storage = null;
						settingsMirror.originalSet = null;
						settingsMirror.originalRemove = null;
						return () => {};
					}
					protoSet = Object.getOwnPropertyDescriptor(prototype, "setItem");
					protoRemove = Object.getOwnPropertyDescriptor(prototype, "removeItem");
					prototype.setItem = patchedStorageSetItem;
					prototype.removeItem = patchedStorageRemoveItem;
				} catch (error) {
					note("settings:patch-storage", error);
					settingsMirror.storage = null;
					settingsMirror.originalSet = null;
					settingsMirror.originalRemove = null;
					return () => {};
				}
			}
			settingsMirror.restore = () => {
				try {
					if (patchMode === "instance") {
						if (ownSet !== undefined && ownSet !== null) Object.defineProperty(storage, "setItem", ownSet);
						else delete storage.setItem;
						if (ownRemove !== undefined && ownRemove !== null) Object.defineProperty(storage, "removeItem", ownRemove);
						else delete storage.removeItem;
					} else if (prototype !== null) {
						if (protoSet !== undefined && protoSet !== null) Object.defineProperty(prototype, "setItem", protoSet);
						else delete prototype.setItem;
						if (protoRemove !== undefined && protoRemove !== null) Object.defineProperty(prototype, "removeItem", protoRemove);
						else delete prototype.removeItem;
					}
				} catch (error) {
					note("settings:unpatch-storage", error);
				}
			};
			settingsMirror.installed = true;
			settingsMirror.onStorage = (event) => {
				try {
					settingsOnStorage(event);
				} catch (error) {
					note("settings:storage-event", error);
				}
			};
			window.addEventListener("storage", settingsMirror.onStorage);
			try {
				if (typeof BroadcastChannel === "function") {
					settingsMirror.channel = new BroadcastChannel(TL5_BC_NAME);
					settingsMirror.onChannelMessage = (event) => {
						try {
							settingsOnBroadcast(event);
						} catch (error) {
							note("settings:broadcast", error);
						}
					};
					settingsMirror.channel.addEventListener("message", settingsMirror.onChannelMessage);
				}
			} catch (error) {
				settingsMirror.channel = null;
				settingsMirror.onChannelMessage = null;
				note("settings:broadcast-open", error);
			}
			// 备份可能是在 bootstrap（镜像安装前）写下的；安装时刷新一次面板按钮状态。
			tl5RefreshBackupFlag();
			settingsNotify();
			return () => {
				if (settingsMirror.installed === false) return;
				settingsMirror.installed = false;
				if (settingsMirror.timer !== 0) {
					window.clearTimeout(settingsMirror.timer);
					settingsMirror.timer = 0;
				}
				settingsMirror.queue.clear();
				settingsMirror.inFlight = 0;
				settingsState.pending = 0;
				if (settingsMirror.onStorage !== null) {
					window.removeEventListener("storage", settingsMirror.onStorage);
					settingsMirror.onStorage = null;
				}
				if (settingsMirror.channel !== null) {
					try {
						if (settingsMirror.onChannelMessage !== null) {
							settingsMirror.channel.removeEventListener("message", settingsMirror.onChannelMessage);
						}
					} catch (error) {
						note("settings:broadcast-off", error);
					}
					try {
						settingsMirror.channel.close();
					} catch (error) {
						note("settings:broadcast-close", error);
					}
					settingsMirror.channel = null;
				}
				settingsMirror.onChannelMessage = null;
				if (typeof settingsMirror.restore === "function") {
					settingsMirror.restore();
					settingsMirror.restore = null;
				}
				settingsMirror.storage = null;
				settingsMirror.originalSet = null;
				settingsMirror.originalRemove = null;
				settingsMirror.eventTarget = null;
				settingsNotify();
			};
		}

		/** 立即同步：先把待发送队列推出去，再跑一轮完整 bootstrap；返回是否成功。 */
		async function settingsForceSync() {
			try {
				await settingsFlushMirror();
				await settingsBootstrap();
				// bootstrap 的 push 是直连 PUT；这里再兜一次队列（例如恢复备份后排队写入）。
				await settingsFlushMirror();
				const ok = settingsState.host === true && settingsState.lastError === "";
				tl5Diag("settings", { forceSync: ok, at: Date.now() });
				settingsNotify();
				return ok;
			} catch (error) {
				note("settings:force-sync", error);
				settingsState.lastError = "sync:exception";
				settingsNotify();
				return false;
			}
		}

		/**
		 * 把 tianlight.backup.host（宿主导入前的本地设置）写回本地并推给宿主。
		 * 正常路径：镜像层已安装 → 用 localStorage.setItem 走正常去抖镜像，随后
		 * 立即 flush 一次，让“恢复”马上同步到宿主；备份键本身保留，可再次恢复。
		 * 返回 Promise<boolean>（存在备份并完成恢复尝试为 true）；恢复键数写入
		 * settingsState.recovered，面板据此显示“已恢复 N 项”。
		 */
		async function settingsRecoverBackup() {
			const storage = tl5Storage();
			if (storage === null) return false;
			let map = null;
			try {
				const raw = storage.getItem(TL5_HOST_BACKUP_KEY);
				if (raw === null || raw === "") return false;
				const parsed = JSON.parse(raw);
				if (tl5IsPlainObject(parsed)) map = parsed;
			} catch (error) {
				note("settings:recover-read", error);
				return false;
			}
			if (map === null) return false;
			const restoredKeys = [];
			try {
				for (const key of Object.keys(map)) {
					if (tl5SyncableKey(key) === false) continue;
					const value = map[key];
					if (typeof value !== "string") continue;
					let current = null;
					try {
						current = storage.getItem(key);
					} catch {
						continue;
					}
					if (current === value) continue;
					try {
						// 已安装镜像时走补丁后的 setItem（自动排队推送）；否则绕过镜像直接写。
						if (settingsMirror.installed === true) storage.setItem(key, value);
						else tl5RawSet(storage, key, value);
						restoredKeys.push(key);
					} catch (error) {
						note("settings:recover-write", { key, error });
					}
				}
				settingsState.recovered = restoredKeys.length;
				if (restoredKeys.length > 0) {
					if (settingsMirror.installed === true) {
						await settingsFlushMirror();
					} else {
						const payload = {};
						for (const key of restoredKeys) payload[key] = map[key];
						await settingsRequest("PUT", { revision: settingsState.revision, settings: payload }, TL5_HOST_WRITE_TIMEOUT_MS);
					}
					dispatchSettingsEvent("recover", restoredKeys);
				}
				tl5Diag("settings", { recovered: restoredKeys.length, at: Date.now() });
				settingsNotify();
				return true;
			} catch (error) {
				note("settings:recover", error);
				return false;
			}
		}

		const settingsStore = {
			status: () => settingsStatus(),
			bootstrap: async () => {
				try {
					await settingsBootstrap();
				} catch (error) {
					note("settings:bootstrap", error);
					settingsState.lastError = "bootstrap:exception";
					settingsNotify();
				}
			},
			forceSync: async () => {
				try {
					return await settingsForceSync();
				} catch (error) {
					note("settings:force-sync", error);
					return false;
				}
			},
			recoverBackup: async () => {
				try {
					return await settingsRecoverBackup();
				} catch (error) {
					note("settings:recover", error);
					return false;
				}
			},
			subscribe: (listener) => {
				if (typeof listener !== "function") return () => {};
				settingsSubscribers.add(listener);
				return () => settingsSubscribers.delete(listener);
			},
		};

		/**
		 * apply() 里 await 的入口：注册文案 → 迁移 → 接管宿主配置 → 记诊断。
		 * 每一步单独兜底，绝不抛出（否则会把插件 fibre 标记为失败）。
		 */
		async function bootstrapSettingsRuntime(body) {
			registerSchemaStrings();
			try {
				schemaRuntime.migrate();
			} catch (error) {
				note("settings:migrate", error);
			}
			try {
				await settingsStore.bootstrap();
			} catch (error) {
				note("settings:bootstrap", error);
			}
			// 迁移（schema 归一化）也可能改变模块/语言缓存值；这里兜一次底。
			try {
				reconcileSettingsConsumers(["tianlight.modules", "tianlight.language"]);
			} catch (error) {
				note("settings:reconcile", error);
			}
			try {
				tl5Diag("settings", settingsStatus());
			} catch {
				// diagnostics must never break apply
			}
			return body;
		}

		/* ================= E4：工程面板分区 =================
		 * 只注册一个分区（id "engineering"，order 700）。根节点沿用壁纸面板的
		 * <details class="tl-wall-group"> + groupSummary 视觉语言，内容全部只读或
		 * 走公共控制器（moduleController / settingsStore / subscribeTl5Metrics）。 */

		function tl5ModuleLabel(def) {
			const text = TL_T(def.labelKey);
			return text === def.labelKey && typeof def.fallback === "string" ? def.fallback : text;
		}

		function tl5ModuleDesc(def) {
			const text = TL_T(def.descKey);
			return text === def.descKey ? "" : text;
		}

		function EngineeringPanelSection() {
			// 语言变化时 useTl5I18n 会让本组件重渲染；mode/setLanguage 同时用于语言开关。
			const i18n = useTl5I18n();
			const t = i18n.t;
			const mode = i18n.mode;
			const setLanguage = i18n.setLanguage;
			const [status, setStatus] = React.useState(() => settingsStore.status());
			const [metrics, setMetrics] = React.useState(() => ({ ...TL5_METRICS }));
			const [modules, setModules] = React.useState(() => moduleController.list());
			const [busy, setBusy] = React.useState(false);
			const [recoverBusy, setRecoverBusy] = React.useState(false);
			/** 最近一次“恢复宿主导入前备份”的结果（transient：仅在本次面板挂载内显示）。 */
			const [recoverNote, setRecoverNote] = React.useState("");
			React.useEffect(() => settingsStore.subscribe((next) => setStatus(next)), []);
			React.useEffect(() => subscribeTl5Metrics((next) => setMetrics({ ...next })), []);
			React.useEffect(() => moduleController.subscribe(() => setModules(moduleController.list())), []);

			const schema = schemaRuntime.report();
			const summaryValue = status.host
				? (status.pending > 0 ? t("settings.pending") : t("settings.synced")) + " · v" + status.revision
				: t("settings.offline");

			const renderRows = (rows) => {
				const children = [];
				for (const row of rows) {
					children.push(React.createElement("span", { key: "k-" + row.label, className: "tl5-eng-key" }, row.label));
					children.push(
						React.createElement("span", { key: "v-" + row.label, className: "tl5-eng-value", "data-tone": row.tone, title: row.value }, row.value),
					);
				}
				return React.createElement("div", { className: "tl5-eng-grid" }, children);
			};

			const onForceSync = () => {
				if (busy) return;
				setBusy(true);
				settingsStore
					.forceSync()
					.then((ok) => {
						setBusy(false);
						setStatus(settingsStore.status());
						if (ok === false) note("settings:force-sync-failed", settingsStore.status().lastError);
					})
					.catch((error) => {
						setBusy(false);
						note("settings:force-sync", error);
					});
			};

			/** 恢复宿主导入前的本地备份（v0.5.2 数据安全）：写回本地并立即推宿主。 */
			const onRecover = () => {
				if (recoverBusy || busy) return;
				if (settingsStore.status().backup !== true) {
					setRecoverNote(t("settings.recoverEmpty"));
					return;
				}
				setRecoverBusy(true);
				setRecoverNote("");
				settingsStore
					.recoverBackup()
					.then((ok) => {
						setRecoverBusy(false);
						const next = settingsStore.status();
						setStatus(next);
						setRecoverNote(ok ? t("settings.recovered", { n: next.recovered }) : t("settings.recoverEmpty"));
					})
					.catch((error) => {
						setRecoverBusy(false);
						setRecoverNote(t("common.failed"));
						note("settings:recover", error);
					});
			};

			const toggleModule = (id) => {
				const def = moduleController.list().find((entry) => entry.id === id);
				if (def === undefined) return;
				moduleController.set(id, def.enabled === false);
				setModules(moduleController.list());
			};

			const effects = tl5IsPlainObject(metrics.effects) ? metrics.effects : { active: 0, fps: 0, budget: "auto" };
			const cacheTotal = Number(metrics.cacheHit) + Number(metrics.cacheMiss);
			const metricsFresh = Number(metrics.updatedAt) > 0;

			let instance = null;
			let runtimeModules = null;
			try {
				instance = globalThis.__dshTianlightInstance ?? null;
				if (instance !== null && typeof instance.modules === "function") runtimeModules = instance.modules();
			} catch {
				instance = null;
				runtimeModules = null;
			}
			let runtimeModuleCount = t("settings.none");
			if (runtimeModules !== null && Array.isArray(runtimeModules.active) && Array.isArray(runtimeModules.definitions)) {
				runtimeModuleCount = runtimeModules.active.length + " / " + runtimeModules.definitions.length;
			}

			const languageButton = (id, label) =>
				React.createElement(
					"button",
					{
						key: id,
						type: "button",
						className: "tl-font-option",
						"data-active": mode === id ? "" : undefined,
						"aria-pressed": mode === id ? "true" : "false",
						onClick: () => setLanguage(id),
					},
					label,
				);
			// 完整字面量 key（不做 "lang." + id 拼接），i18n 静态自检才能看见它们。
			const languageRow = [
				languageButton("auto", t("lang.auto")),
				languageButton("zh", t("lang.zh")),
				languageButton("en", t("lang.en")),
			];

			const moduleRows = modules.map((def) =>
				React.createElement(
					"div",
					{ key: def.id, className: "tl5-eng-module" },
					React.createElement("span", { className: "tl5-eng-module-label", title: tl5ModuleDesc(def) }, tl5ModuleLabel(def)),
					def.switchable === false
						? React.createElement(
								"button",
								{ type: "button", className: "tl-font-option", disabled: true, "data-tl-disabled": "" },
								t("settings.resident"),
							)
						: React.createElement(
								"button",
								{
									type: "button",
									className: "tl-font-option",
									"data-active": def.enabled ? "" : undefined,
									"aria-pressed": def.enabled ? "true" : "false",
									onClick: () => toggleModule(def.id),
								},
								def.enabled ? t("common.on") : t("common.off"),
							),
				),
			);

			const migrationValue = schema.migrated.length > 0 ? schema.migrated.join(", ") : t("settings.nothing");
			const failedValue = schema.failed.length > 0 ? schema.failed.join(", ") : t("settings.none");

			return React.createElement(
				"details",
				{ className: "tl-wall-group", "data-tl-group": "engineering", open: false },
				React.createElement(
					"summary",
					{ className: "tl-wall-group-summary" },
					React.createElement("span", { className: "tl-wall-step" }, "⑦"),
					React.createElement("span", { className: "tl-wall-group-title" }, t("section.engineering")),
					React.createElement("span", { className: "tl-wall-summary-value", title: t("section.engineeringHint") }, summaryValue),
				),
				React.createElement(
					"div",
					{ className: "tl5-eng" },
					// ---- 语言 ----
					React.createElement(
						"div",
						{ className: "tl5-eng-block" },
						React.createElement("p", { className: "tl5-eng-label" }, t("lang.title")),
						React.createElement("div", { className: "tl-font-options" }, languageRow),
						React.createElement("p", { className: "tl-wall-hint" }, t("lang.hint")),
					),
					// ---- 宿主设置同步 ----
					React.createElement(
						"div",
						{ className: "tl5-eng-block" },
						React.createElement("p", { className: "tl5-eng-label" }, t("settings.title")),
						renderRows([
							{
								label: t("settings.host"),
								value: status.host ? t("settings.available") : t("settings.unavailable"),
								tone: status.host ? undefined : "warn",
							},
							{ label: t("settings.revision"), value: "v" + status.revision },
							{ label: t("settings.pending"), value: String(status.pending) },
							{ label: t("settings.backup"), value: status.backup ? t("settings.available") : t("settings.none") },
							{ label: t("settings.lastError"), value: status.lastError === "" ? t("settings.none") : status.lastError, tone: status.lastError === "" ? undefined : "alert" },
						]),
						React.createElement(
							"div",
							{ className: "tl-wall-tabs" },
							React.createElement(
								"button",
								{
									type: "button",
									className: "tl-font-option",
									disabled: busy || recoverBusy,
									onClick: onForceSync,
									"data-tone": status.lastError === "" ? undefined : "warn",
								},
								busy ? t("settings.syncing") : t("settings.force"),
							),
							// v0.5.2 数据安全：宿主快照是子集时本地键不删；若导入确实改过值，
							// 这里可以一键恢复“导入前”的本地设置。
							React.createElement(
								"button",
								{
									type: "button",
									className: "tl-font-option",
									disabled: busy || recoverBusy || status.backup !== true,
									"data-tone": status.backup ? "warn" : undefined,
									onClick: onRecover,
								},
								recoverBusy ? t("settings.syncing") : t("settings.recoverBackup"),
							),
						),
						React.createElement(
							"p",
							{ className: "tl-wall-hint" },
							recoverNote !== "" ? recoverNote : status.host ? t("settings.synced") : t("settings.offline") + " " + t("settings.syncHint"),
						),
					),
					// ---- schema 迁移 ----
					React.createElement(
						"div",
						{ className: "tl5-eng-block" },
						React.createElement("p", { className: "tl5-eng-label" }, t("settings.migrateTitle")),
						renderRows([
							{
								label: t("settings.schemaVersion"),
								value: t("settings.schemaFromTo", { from: schema.from, to: schema.to }),
							},
							{ label: t("settings.migrated"), value: migrationValue },
							{ label: t("common.failed"), value: failedValue, tone: schema.failed.length > 0 ? "alert" : undefined },
						]),
						React.createElement("p", { className: "tl-wall-hint" }, t("settings.migrateHint")),
					),
					// ---- 模块开关 ----
					React.createElement(
						"div",
						{ className: "tl5-eng-block" },
						React.createElement("p", { className: "tl5-eng-label" }, t("settings.modules")),
						React.createElement("div", { className: "tl5-eng-modules" }, moduleRows),
						React.createElement("p", { className: "tl-wall-hint" }, t("settings.modulesHint")),
					),
					// ---- 渲染预算（只读） ----
					React.createElement(
						"div",
						{ className: "tl5-eng-block" },
						React.createElement("p", { className: "tl5-eng-label" }, t("settings.budget")),
						renderRows([
							{ label: t("settings.fps"), value: metricsFresh ? Math.round(Number(metrics.fps) || 0) + " fps" : t("settings.none") },
							{ label: t("settings.jitter"), value: metricsFresh ? Math.round(Number(metrics.jitter) || 0) + " ms" : t("settings.none") },
							{ label: t("settings.tier"), value: String(metrics.tier ?? "auto") },
							{
								label: t("settings.lowPower"),
								value: metrics.lowPower
									? t("common.on") + (typeof metrics.lowPowerReason === "string" && metrics.lowPowerReason !== "" ? " · " + metrics.lowPowerReason : "")
									: t("common.off"),
								tone: metrics.lowPower ? "warn" : undefined,
							},
							{ label: t("settings.cache"), value: Number(metrics.cacheHit) + " / " + Number(metrics.cacheMiss) },
							{ label: t("settings.cacheRate"), value: cacheTotal > 0 ? Math.round((Number(metrics.cacheHit) / cacheTotal) * 100) + "%" : t("settings.none") },
							{
								label: t("settings.effectsLayer"),
								value: Number(effects.active) + " · " + Math.round(Number(effects.fps) || 0) + " fps · " + String(effects.budget ?? "auto"),
							},
							{ label: t("settings.updated"), value: metricsFresh ? new Date(Number(metrics.updatedAt)).toLocaleTimeString() : t("settings.none") },
						]),
						React.createElement("p", { className: "tl-wall-hint" }, t("settings.budgetHint")),
					),
					// ---- 诊断 ----
					React.createElement(
						"div",
						{ className: "tl5-eng-block" },
						React.createElement("p", { className: "tl5-eng-label" }, t("settings.diag")),
						renderRows([
							{ label: t("settings.capabilityHost"), value: status.host ? t("settings.available") : t("settings.unavailable") },
							{ label: t("settings.capabilityRuntime"), value: instance === null ? t("settings.unavailable") : t("settings.available") },
							{ label: t("settings.activeModules"), value: runtimeModuleCount },
							{ label: t("settings.revision"), value: "v" + status.revision },
							{ label: t("settings.lastError"), value: status.lastError === "" ? t("settings.none") : status.lastError, tone: status.lastError === "" ? undefined : "alert" },
						]),
						React.createElement("p", { className: "tl-wall-hint" }, t("settings.diagHint")),
					),
				),
			);
		}

		// 唯一的分区注册：order 700 排在壁纸面板 ①–⑥ 之后（其他功能分区 800+）。
		registerTl5PanelSection({ id: "engineering", order: 700, title: "section.engineering", Component: EngineeringPanelSection });

		/** 工程分区样式（tl5-eng-*）。全部作用域在 body[data-dsh-tianlight] 下。 */
		registerTl5Css(String.raw`
	body[data-dsh-tianlight] .tl5-eng {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	body[data-dsh-tianlight] .tl5-eng-block {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	body[data-dsh-tianlight] .tl5-eng-label {
		margin: 0;
		font-size: 10px;
		font-weight: 600;
		letter-spacing: 0.06em;
		color: var(--tl-ink-faint);
	}
	body[data-dsh-tianlight] .tl5-eng-grid {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 2px 10px;
		font-size: 11px;
	}
	body[data-dsh-tianlight] .tl5-eng-key {
		color: var(--tl-ink-soft);
		white-space: nowrap;
	}
	body[data-dsh-tianlight] .tl5-eng-value {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		text-align: right;
		color: var(--tl-ink);
		font-variant-numeric: tabular-nums;
	}
	body[data-dsh-tianlight] .tl5-eng-value[data-tone="warn"] {
		color: color-mix(in srgb, #e8b45a 82%, var(--tl-ink));
	}
	body[data-dsh-tianlight] .tl5-eng-value[data-tone="alert"] {
		color: color-mix(in srgb, #e8776b 82%, var(--tl-ink));
	}
	body[data-dsh-tianlight] .tl5-eng-modules {
		display: flex;
		flex-direction: column;
		gap: 3px;
	}
	body[data-dsh-tianlight] .tl5-eng-module {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 12px;
		color: var(--tl-ink);
	}
	body[data-dsh-tianlight] .tl5-eng-module-label {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		color: var(--tl-ink-soft);
	}
	body[data-dsh-tianlight] .tl5-eng-module > button {
		flex: none;
		min-width: 44px;
		padding: 2px 10px;
		font-size: 11px;
	}
`);
		//#endregion
		//#region i18n
		/**
		 * 国际化。走 DSH 的 locale 服务（`ctx.get("locale")`），但**只用来读宿主语言**：
		 *
		 *   1. 首次安装时把天光自己的 zh/en 字典注册进 locale 服务（命名空间隔离，
		 *      不影响宿主自己的语言）；
		 *   2. “跟随 DSH”模式订阅 locale/change：用户在 DSH 设置里切换界面语言时，
		 *      皮肤文案跟着刷新，不重载页面、不重建面板；
		 *   3. v0.5.3 起：用户显式选 中文/English **只切换皮肤文案**，绝不调用
		 *      locale.setLocale()（旧实装会把整个 DSH 界面也跟着切，导致面板状态
		 *      丢失/整页闪动，是“切换语言有问题”的根因）。DSH 界面语言由用户到
		 *      DSH 设置里修改；皮肤不越权。
		 *
		 * 刷新契约（任何片段都可以用）：
		 *   - React 组件：`const { t, mode, setLanguage } = useTl5I18n()`；语言变化时
		 *     本组件自动重渲染（不要在 useState/useEffect([]) 里缓存 TL_T 结果）；
		 *   - 非 React 的固定文案节点：`subscribeTl5I18n(fn)` 主动刷新（参考
		 *     40-companion 的 refreshCompanionLabels），或者给节点加
		 *     `data-tl-i18n-key`（textContent）/ `data-tl-i18n-title-key`（title）
		 *     属性，由 tl5NotifyLanguage() 统一刷新。
		 *
		 * 任何功能片段都可以在顶层调用 registerTl5Strings({ zh: {...}, en: {...} })
		 * 注册自己的文案，不会与别的片段抢同一个文件。
		 */
		const LANGUAGE_KEY = "tianlight.language";
		const LANGUAGE_MODES = ["auto", "zh", "en"];
		const TL5_I18N_NS = "skin.tianlight";
		const TL5_STRINGS = { zh: {}, en: {} };
		const tl5I18nSubscribers = new Set();
		let tl5LocaleService = null;
		let tl5LanguageMode = (() => {
			try {
				const saved = globalThis.localStorage?.getItem(LANGUAGE_KEY);
				return LANGUAGE_MODES.includes(saved) ? saved : "auto";
			} catch {
				return "auto";
			}
		})();

		const tl5BaseStrings = {
			zh: {
				"common.on": "开",
				"common.off": "关",
				"common.auto": "自动",
				"common.reset": "恢复默认",
				"common.clear": "清空",
				"common.refresh": "刷新",
				"common.copy": "复制",
				"common.copied": "已复制",
				"common.failed": "失败",
				"common.loading": "加载中…",
				"common.unsupported": "当前环境不支持",
				"module.wallpaper": "壁纸场景",
				"module.wallpaperDesc": "视频/图片/着色器/场景/网页壁纸",
				"module.effects": "特效与氛围",
				"module.effectsDesc": "视差、点击特效、雨雪光斑、转场",
				"module.context": "智能情境",
				"module.contextDesc": "时段自适应、专注联动、性能自适应",
				"module.audio": "音频可视化",
				"module.audioDesc": "系统音频回环与 Now Playing（不录音）",
				"module.companion": "薄荷桌宠",
				"module.companionDesc": "可拖拽的小猫与互动",
				"module.rheostat": "推理滑杆",
				"module.rheostatDesc": "输入框下方的推理档位控件",
				"module.typography": "排版面板",
				"module.typographyDesc": "字号/字族/行宽/段距/代码字体",
				"module.panel": "壁纸面板",
				"module.panelDesc": "常驻：关闭后没有重新打开的入口",
				"module.zones": "分区取景",
				"module.zonesDesc": "常驻：主画面裁切与侧栏镜像",
				"module.legibility": "可读性护栏",
				"module.legibilityDesc": "常驻：面板对比度不足时自动提亮",
				"section.engineering": "工程",
				"section.engineeringHint": "配置宿主化、schema 迁移、模块开关与渲染预算",
				"section.effects": "特效与氛围",
				"section.context": "智能情境",
				"section.audio": "音频与 Now Playing",
				"section.library": "库、包与分享",
				"section.typography": "排版增强",
				"lang.title": "语言",
				"lang.auto": "跟随 DSH",
				"lang.zh": "中文",
				"lang.en": "English",
				"lang.hint": "切换立即生效，不需要刷新。仅切换皮肤文案；DSH 界面语言请到 DSH 设置中修改。",
				"settings.title": "宿主设置",
				"settings.host": "宿主配置文件",
				"settings.local": "浏览器本地缓存",
				"settings.revision": "配置版本",
				"settings.synced": "已同步",
				"settings.pending": "待同步",
				"settings.offline": "宿主不可用，暂用本地存储",
				"settings.force": "立即同步",
				"settings.migrateTitle": "schema 迁移",
				"settings.migrateHint": "旧版本存储键会自动转换；迁移前的原始值会保留备份。",
				"settings.migrated": "已迁移",
				"settings.nothing": "无需迁移",
				"settings.modules": "模块开关",
				"settings.modulesHint": "关闭后对应 DOM 与监听器会被移除；再打开会重新安装。",
				"settings.budget": "渲染预算",
				"settings.budgetHint": "只读：当前帧率/抖动/档位/缓存/特效开销；降档原因见情境分区。",
				"settings.diag": "诊断",
			},
			en: {
				"common.on": "On",
				"common.off": "Off",
				"common.auto": "Auto",
				"common.reset": "Reset",
				"common.clear": "Clear",
				"common.refresh": "Refresh",
				"common.copy": "Copy",
				"common.copied": "Copied",
				"common.failed": "Failed",
				"common.loading": "Loading…",
				"common.unsupported": "Not supported here",
				"module.wallpaper": "Wallpaper scene",
				"module.wallpaperDesc": "Video / image / shader / scene / web",
				"module.effects": "Effects & ambiance",
				"module.effectsDesc": "Parallax, click effects, rain/snow, transitions",
				"module.context": "Smart context",
				"module.contextDesc": "Time of day, focus link, adaptive performance",
				"module.audio": "Audio visualizer",
				"module.audioDesc": "System loopback + Now Playing (never recorded)",
				"module.companion": "Mint companion",
				"module.companionDesc": "Draggable chibi cat",
				"module.rheostat": "Reasoning slider",
				"module.rheostatDesc": "Effort control under the composer",
				"module.typography": "Typography panel",
				"module.typographyDesc": "Size, family, line width, spacing, code font",
				"module.panel": "Wallpaper panel",
				"module.panelDesc": "Always on: closing it removes the reopen entry",
				"module.zones": "Zone framing",
				"module.zonesDesc": "Always on: crop and rail mirror",
				"module.legibility": "Readability guard",
				"module.legibilityDesc": "Always on: brightens the panel when contrast drops",
				"section.engineering": "Engineering",
				"section.engineeringHint": "Host settings, schema migration, module switches, render budget",
				"section.effects": "Effects & ambiance",
				"section.context": "Smart context",
				"section.audio": "Audio & Now Playing",
				"section.library": "Library, bundles & sharing",
				"section.typography": "Typography",
				"lang.title": "Language",
				"lang.auto": "Follow DSH",
				"lang.zh": "中文",
				"lang.en": "English",
				"lang.hint": "Applies instantly without a reload. Switches skin copy only; change the DSH interface language in DSH settings.",
				"settings.title": "Host settings",
				"settings.host": "Host config file",
				"settings.local": "Browser local cache",
				"settings.revision": "Config revision",
				"settings.synced": "Synced",
				"settings.pending": "Pending",
				"settings.offline": "Host unavailable — using local storage",
				"settings.force": "Sync now",
				"settings.migrateTitle": "Schema migration",
				"settings.migrateHint": "Old storage keys are converted automatically; the originals are backed up first.",
				"settings.migrated": "Migrated",
				"settings.nothing": "Nothing to migrate",
				"settings.modules": "Modules",
				"settings.modulesHint": "Disabling removes its DOM and listeners; enabling installs it again.",
				"settings.budget": "Render budget",
				"settings.budgetHint": "Read-only: fps, jitter, tier, cache, effect cost; downgrade reasons live in Smart context.",
				"settings.diag": "Diagnostics",
			},
		};

		function registerTl5Strings(dicts) {
			if (dicts === null || typeof dicts !== "object") return;
			for (const lang of ["zh", "en"]) {
				const table = dicts[lang];
				if (table === null || typeof table !== "object") continue;
				for (const key of Object.keys(table)) {
					if (typeof table[key] === "string") TL5_STRINGS[lang][key] = table[key];
				}
			}
		}
		registerTl5Strings(tl5BaseStrings);
		// 12-schema.js runs BEFORE this fragment, so its dictionary const is already
		// initialized while TL5_STRINGS only exists from here on. Registering it at
		// factory time keeps the static i18n audit complete; the schema fragment's own
		// runtime registration stays as a belt-and-braces for older orderings.
		if (typeof TL5_SCHEMA_STRINGS !== "undefined") registerTl5Strings(TL5_SCHEMA_STRINGS);

		function detectTl5Language() {
			if (tl5LanguageMode === "zh" || tl5LanguageMode === "en") return tl5LanguageMode;
			try {
				const locale = tl5LocaleService;
				if (locale !== null && typeof locale.getSnapshot === "function") {
					const snapshot = locale.getSnapshot();
					const active = snapshot === null || snapshot === undefined ? "" : String(snapshot.active ?? "");
					if (active.toLowerCase().startsWith("zh")) return "zh";
					if (active !== "") return "en";
				}
			} catch {
				// fall through to the browser language
			}
			try {
				const language = String(globalThis.navigator?.language ?? "").toLowerCase();
				return language.startsWith("zh") ? "zh" : "en";
			} catch {
				return "zh";
			}
		}

		let tl5ActiveLanguage = detectTl5Language();

		/**
		 * 非 React 的固定文案：片段给节点加 data-tl-i18n-key（写 textContent）或
		 * data-tl-i18n-title-key（写 title）属性，这里在每次语言变化时统一刷新。
		 * 静态扫描不到“语言切换后不会更新”的命令式 DOM 时，这是最省的修法。
		 */
		function tl5ApplyI18nDom() {
			try {
				if (typeof document === "undefined" || document === null || typeof document.querySelectorAll !== "function") return;
				for (const node of document.querySelectorAll("[data-tl-i18n-key]")) {
					const key = node.getAttribute("data-tl-i18n-key");
					if (typeof key === "string" && key !== "") node.textContent = TL_T(key);
				}
				for (const node of document.querySelectorAll("[data-tl-i18n-title-key]")) {
					const key = node.getAttribute("data-tl-i18n-title-key");
					if (typeof key === "string" && key !== "") node.title = TL_T(key);
				}
			} catch (error) {
				note("i18n:dom-refresh", error);
			}
		}

		function tl5NotifyLanguage() {
			tl5ActiveLanguage = detectTl5Language();
			try {
				if (document.body !== null) document.body.setAttribute("data-tl-lang", tl5ActiveLanguage);
			} catch {
				// body may not exist in non-browser test runs
			}
			tl5ApplyI18nDom();
			tl5Diag("i18n", { mode: tl5LanguageMode, active: tl5ActiveLanguage, localeService: tl5LocaleService !== null });
			for (const listener of [...tl5I18nSubscribers]) {
				try {
					listener(tl5ActiveLanguage);
				} catch (error) {
					note("i18n:subscriber", error);
				}
			}
		}

		function TL_T(key, params) {
			if (typeof key !== "string") return "";
			const chain = tl5ActiveLanguage === "zh" ? [TL5_STRINGS.zh, TL5_STRINGS.en] : [TL5_STRINGS.en, TL5_STRINGS.zh];
			let template = key;
			for (const table of chain) {
				if (typeof table[key] === "string") {
					template = table[key];
					break;
				}
			}
			if (params === null || typeof params !== "object") return template;
			return template.replace(/\{(\w+)\}/g, (match, name) => (Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match));
		}

		function tl5Language() {
			return { mode: tl5LanguageMode, active: tl5ActiveLanguage };
		}

		/**
		 * 设置皮肤语言。
		 * v0.5.3 起：显式 中文/English 只影响天光自己的文案 —— **绝不调用
		 * locale.setLocale()**，所以 DSH 界面语言、html lang、宿主界面都不会被
		 * 顺手改掉（旧实装会整页跟着切，造成面板状态丢失/闪动/看起来“切不动”）。
		 * “跟随 DSH”（auto）继续通过 installI18nRuntime 的 locale 订阅跟随宿主。
		 */
		function setTl5Language(mode) {
			const next = LANGUAGE_MODES.includes(mode) ? mode : "auto";
			tl5LanguageMode = next;
			try {
				globalThis.localStorage?.setItem(LANGUAGE_KEY, next);
			} catch {
				// persistence is optional; this session still switches
			}
			// 注意：这里刻意没有 locale.setLocale()。宿主语言是 DSH 设置的职责，
			// 皮肤只读不写；需要跟随宿主时请选“跟随 DSH”。
			tl5NotifyLanguage();
			return tl5Language();
		}

		function subscribeTl5I18n(listener) {
			if (typeof listener !== "function") return () => {};
			tl5I18nSubscribers.add(listener);
			return () => tl5I18nSubscribers.delete(listener);
		}

		/**
		 * 安装 i18n：接入 locale 服务、注册字典、订阅语言变化。
		 * 返回 disposer；locale 服务缺席时退化为本地模式。
		 */
		function installI18nRuntime(ctx) {
			const bindings = [];
			const bindLocale = (locale) => {
				if (locale === null || locale === undefined || typeof locale.getSnapshot !== "function") return;
				if (tl5LocaleService === locale) return;
				tl5LocaleService = locale;
				try {
					if (typeof locale.register === "function") {
						const dispose = locale.register(TL5_I18N_NS, { zh: TL5_STRINGS.zh, en: TL5_STRINGS.en });
						if (typeof dispose === "function") bindings.push(dispose);
					}
					if (typeof locale.subscribe === "function") {
						const unsubscribe = locale.subscribe(() => tl5NotifyLanguage());
						if (typeof unsubscribe === "function") bindings.push(unsubscribe);
					}
				} catch (error) {
					note("i18n:locale-binding", error);
				}
				tl5NotifyLanguage();
			};
			try {
				const direct = ctx !== null && typeof ctx === "object" && typeof ctx.get === "function" ? ctx.get("locale") : undefined;
				if (direct !== undefined) bindLocale(direct);
				else if (typeof ctx.inject === "function") {
					// The locale service may be provided after this fibre mounts: wait for
					// it instead of degrading to the browser language for the whole session.
					const disposeInject = ctx.inject(["locale"], (scoped) => {
						bindLocale(scoped.get("locale"));
						return () => {};
					});
					if (typeof disposeInject === "function") bindings.push(disposeInject);
				}
			} catch (error) {
				tl5LocaleService = null;
				note("i18n:locale-service", error);
			}
			if (tl5LocaleService === null) tl5NotifyLanguage();
			return () => {
				for (const dispose of bindings.splice(0)) {
					try {
						dispose();
					} catch {
						// a host that unregistered first is fine
					}
				}
				tl5LocaleService = null;
			};
		}

		/** React hook：语言变化时让组件重渲染。 */
		function useTl5I18n() {
			const [, setRevision] = React.useState(0);
			React.useEffect(() => {
				let alive = true;
				const unsubscribe = subscribeTl5I18n(() => {
					if (alive) setRevision((value) => value + 1);
				});
				return () => {
					alive = false;
					unsubscribe();
				};
			}, []);
			return { t: TL_T, lang: tl5ActiveLanguage, mode: tl5LanguageMode, setLanguage: setTl5Language };
		}
		//#endregion
		//#region stylesheet
		const CSS = String.raw`
body[data-dsh-tianlight] {
	/* The app frame AND the conversation column both paint --dsw-alias-bg-base, so
	   their alphas COMPOUND: effective = 1-(1-a)^2. A high single-layer value here
	   makes the wallpaper vanish behind what looks like a solid panel. These are
	   tuned for the composited result (~48%), not for one layer. */
	/* 100% wallpaper: every surface layer is fully transparent. Text sits directly
	   on the video, so legibility is carried by ink colour and code-block fill only. */
	--tl-shell: rgba(252, 253, 255, 0);
	--tl-shell-strong: rgba(255, 255, 255, 0);
	--tl-shell-soft: rgba(250, 252, 255, 0);
	/* Menus get their own translucent fill: opaque 0.97 would hide the blur behind
	   them, so glass on a popover has to start with actual transparency. */
	--tl-overlay: rgba(250, 252, 255, 0.82);
	/* Composer-only glass. Everything else stays fully transparent; this card is
	   the one surface that earns a frosted backdrop. */
	--tl-glass-fill: rgba(255, 255, 255, calc(0.30 * var(--tl-glass-m, 1)));
	--tl-glass-line: rgba(255, 255, 255, 0.62);
	--tl-glass-blur: 12px;
	/* Modal-grade surface: a settings panel has to stay readable over the chat, so
	   it needs its own fill instead of the zeroed bg-layer tokens. The value is high
	   on purpose: the panel carries NO backdrop blur (see below), so its opacity is
	   what does the legibility work.
	   The glass slider may lower it, but only down to a legibility floor: at 0.30 the
	   panel was so transparent that the sidebar text behind it showed through, which
	   reads as "duplicate stacked UI". Data surfaces keep a hard floor. */
	--tl-panel-fill: rgba(250, 252, 255, max(0.9, calc(0.84 * var(--tl-glass-m, 1))));
	--tl-ink: #0f2438;
	--tl-ink-soft: #3a5a78;
	--tl-ink-faint: #5d7d99;
	--tl-line: rgba(112, 156, 202, 0.30);
	--tl-line-strong: rgba(86, 134, 186, 0.44);
	--tl-accent: #2b74c9;
	--tl-accent-soft: rgba(43, 116, 201, 0.14);
	--tl-code: rgba(236, 244, 252, 0.40);
	--tl-glow: rgba(150, 210, 255, 0.55);

	--dsw-alias-bg-base: var(--tl-shell) !important;
	--dsw-alias-bg-layer-1: var(--tl-shell-strong) !important;
	--dsw-alias-bg-layer-2: var(--tl-shell-soft) !important;
	--dsw-alias-bg-overlay: var(--tl-overlay) !important;
	--dsw-specific-sidebar-fill: var(--tl-shell-soft) !important;
	--dsw-alias-border-l1: var(--tl-line) !important;
	--dsw-alias-border-l2: var(--tl-line-strong) !important;
	--dsw-alias-border-l3: var(--tl-line) !important;
	--dsw-alias-border-l4: var(--tl-line-strong) !important;
	--dsw-alias-brand-primary: var(--tl-accent) !important;
	--dsw-alias-label-primary: var(--tl-ink) !important;
	--dsw-alias-label-secondary: var(--tl-ink-soft) !important;
	--dsw-alias-label-tertiary: var(--tl-ink-faint) !important;
	--dsw-alias-state-error-primary: #c0392b !important;
	--dsw-alias-state-success-primary: #0e8a63 !important;
	--dsw-alias-state-warn-primary: #b4690e !important;
	--dsw-alias-interactive-bg-hover: var(--tl-accent-soft) !important;
	--dsw-alias-markdown-code-block: var(--tl-code) !important;
	/* Remaining surface tokens: bubbles, nested cards, menus, selectors. Left
	   opaque they read as the only solid blocks on a transparent interface. */
	--dsw-specific-bubble: rgba(255, 255, 255, 0.34) !important;
	--dsw-specific-tip: rgba(255, 255, 255, 0.40) !important;
	--dsw-specific-menu: var(--tl-overlay) !important;
	--dsw-alias-bg-layer-3: rgba(255, 255, 255, 0.28) !important;
	--dsw-alias-bg-module-platform: rgba(255, 255, 255, 0.26) !important;
	--dsw-alias-interactive-bg-hover-solid: rgba(112, 164, 214, 0.26) !important;
	--dsw-alias-turn-trigger-bg: rgba(255, 255, 255, 0.26) !important;
	--dsw-alias-markdown-code-block-banner: rgba(236, 244, 252, 0.44) !important;
	/* Remaining large surfaces that 0.2.0 still paints opaque: terminal, settings
	   cards, document preview, masks, skeletons, selectors, nav items. Translucent
	   only — deliberately NO new backdrop-filter, so playback cost stays flat. */
	--dsw-alias-bg-document-preview: var(--tl-glass-fill) !important;
	--dsw-alias-bg-l1: var(--tl-glass-fill) !important;
	--dsw-alias-bg-layer-4: var(--tl-glass-fill) !important;
	--dsw-alias-bg-mask-1: rgba(240, 244, 250, 0.62) !important;
	/* Full-viewport backdrop blur: the single most expensive thing on a page with a
	   playing video, and the mask is translucent enough without it. */
	--dsw-mask-blur: none !important;
	--dsw-alias-bg-mask-drop: rgba(240, 244, 250, 0.70) !important;
	--dsw-alias-bg-skeleton: var(--tl-line) !important;
	--dsw-alias-fill-l1: rgba(255, 255, 255, 0.42) !important;
	--dsw-alias-fill-l2: rgba(255, 255, 255, 0.30) !important;
	--dsw-alias-fill-tertiary: rgba(255, 255, 255, 0.26) !important;
	--dsw-alias-fill-tsp-secondary: rgba(255, 255, 255, 0.30) !important;
	--dsw-alias-interactive-bg-active: var(--tl-accent-soft) !important;
	--dsw-alias-interactive-bg-hover-danger: rgba(192, 57, 43, 0.16) !important;
	--dsw-alias-onboarding-card-fill: var(--tl-glass-fill) !important;
	--dsw-alias-onboarding-secondary-fill: rgba(255, 255, 255, 0.22) !important;
	--dsw-alias-settings-card-fill: var(--tl-glass-fill) !important;
	--dsw-specific-input-major: var(--tl-glass-fill) !important;
	--dsw-specific-selector: rgba(255, 255, 255, 0.42) !important;
	--dsw-specific-sidebar-nav-item-active: var(--tl-accent-soft) !important;
	--dsw-specific-sidebar-nav-item-active-accent: var(--tl-accent) !important;
	--dsw-specific-sidebar-nav-item-hover: var(--tl-accent-soft) !important;
	--dsw-alias-turn-trigger-bg-hover: var(--tl-accent-soft) !important;
}

body[data-dsh-tianlight][data-ds-dark-theme] {
	--tl-shell: rgba(10, 18, 32, 0);
	--tl-shell-strong: rgba(16, 27, 45, 0);
	--tl-shell-soft: rgba(10, 18, 32, 0);
	--tl-overlay: rgba(12, 22, 38, 0.84);
	--tl-glass-fill: rgba(16, 26, 42, calc(0.38 * var(--tl-glass-m, 1)));
	--tl-glass-line: rgba(150, 195, 250, 0.28);
	--tl-glass-blur: 14px;
	--tl-panel-fill: rgba(10, 18, 32, max(0.96, calc(0.88 * var(--tl-glass-m, 1))));
	--tl-ink: #eaf3ff;
	--tl-ink-soft: #a9c2dc;
	--tl-ink-faint: #7f9bb8;
	--tl-line: rgba(126, 178, 232, 0.26);
	--tl-line-strong: rgba(142, 194, 246, 0.40);
	--tl-accent: #7fb6ff;
	--tl-accent-soft: rgba(127, 182, 255, 0.16);
	--tl-code: rgba(10, 20, 34, 0.44);
	--tl-glow: rgba(120, 186, 255, 0.45);

	--dsw-alias-state-error-primary: #ff7b6b !important;
	--dsw-alias-state-success-primary: #4fe0a6 !important;
	--dsw-alias-state-warn-primary: #ffc46b !important;
	--dsw-specific-bubble: rgba(18, 30, 48, 0.42) !important;
	--dsw-specific-tip: rgba(18, 30, 48, 0.46) !important;
	--dsw-specific-menu: var(--tl-overlay) !important;
	--dsw-alias-bg-layer-3: rgba(18, 30, 48, 0.36) !important;
	--dsw-alias-bg-module-platform: rgba(18, 30, 48, 0.34) !important;
	--dsw-alias-interactive-bg-hover-solid: rgba(70, 118, 170, 0.28) !important;
	--dsw-alias-turn-trigger-bg: rgba(18, 30, 48, 0.34) !important;
	--dsw-alias-markdown-code-block-banner: rgba(10, 20, 34, 0.46) !important;
	--dsw-alias-bg-document-preview: var(--tl-glass-fill) !important;
	--dsw-alias-bg-l1: var(--tl-glass-fill) !important;
	--dsw-alias-bg-layer-4: var(--tl-glass-fill) !important;
	--dsw-alias-bg-mask-1: rgba(3, 8, 16, 0.55) !important;
	--dsw-mask-blur: none !important;
	--dsw-alias-bg-mask-drop: rgba(3, 8, 16, 0.65) !important;
	--dsw-alias-bg-skeleton: var(--tl-line) !important;
	--dsw-alias-fill-l1: rgba(20, 34, 54, 0.46) !important;
	--dsw-alias-fill-l2: rgba(20, 34, 54, 0.36) !important;
	--dsw-alias-fill-tertiary: rgba(20, 34, 54, 0.32) !important;
	--dsw-alias-fill-tsp-secondary: rgba(20, 34, 54, 0.36) !important;
	--dsw-alias-interactive-bg-active: var(--tl-accent-soft) !important;
	--dsw-alias-interactive-bg-hover-danger: rgba(255, 120, 105, 0.18) !important;
	--dsw-alias-onboarding-card-fill: var(--tl-glass-fill) !important;
	--dsw-alias-onboarding-secondary-fill: rgba(18, 30, 48, 0.30) !important;
	--dsw-alias-settings-card-fill: var(--tl-glass-fill) !important;
	--dsw-specific-input-major: var(--tl-glass-fill) !important;
	--dsw-specific-selector: rgba(18, 30, 48, 0.46) !important;
	--dsw-specific-sidebar-nav-item-active: var(--tl-accent-soft) !important;
	--dsw-specific-sidebar-nav-item-active-accent: var(--tl-accent) !important;
	--dsw-specific-sidebar-nav-item-hover: var(--tl-accent-soft) !important;
	--dsw-alias-turn-trigger-bg-hover: var(--tl-accent-soft) !important;
}

body[data-dsh-tianlight] {
	background: transparent !important;
	/* Glass multiplier. installGlassOpacity() overwrites it from the saved level; the
	   declaration lives here so every var the stylesheet reads is also declared. */
	--tl-glass-m: 1;
}

/* ---- wallpaper, painted strictly beneath the application ---- */
body[data-dsh-tianlight] [data-tl-scene] {
	/* Zone framing defaults. applyZones() overwrites these from the saved model; the
	   declarations live here so every var the stylesheet reads is also declared. */
	--tl-fit: cover;
	--tl-fit-size: cover;
	--tl-focal-x: 38%;
	--tl-focal-y: 50%;
	--tl-zone-dim: 0;
	--tl-overlay-opacity: 0.55;
	--tl-overlay-blend: normal;
	--tl-f-brightness: 1;
	--tl-f-contrast: 1;
	--tl-f-saturate: 1;
	position: fixed;
	inset: 0;
	z-index: 0;
	pointer-events: none;
	overflow: hidden;
	/* Own compositor layer + paint isolation: without these the whole page
	   recomposites whenever the video advances a frame. */
	contain: paint;
	transform: translateZ(0);
	background:
		radial-gradient(120% 90% at 18% 8%, #cfe9ff 0%, #9fcdf5 32%, #6aa8de 62%, #2f6ea8 100%);
}
body[data-dsh-tianlight][data-ds-dark-theme] [data-tl-scene] {
	/* Night sky, deliberately NOT near-black: this layer is what shows whenever the
	   video is missing or not yet decoded, and a #040a12 floor reads as a solid
	   black rectangle instead of a wallpaper. */
	background:
		radial-gradient(120% 90% at 22% 10%, #2b4f7d 0%, #1d3a5e 38%, #16294a 72%, #101d33 100%);
}
body[data-dsh-tianlight] [data-tl-scene] > video {
	position: absolute;
	inset: 0;
	width: 100%;
	height: 100%;	/* Zone-driven: fit and focal point come from the wallpaper settings, so a source
	   whose aspect ratio disagrees with the window can be cropped, letterboxed or
	   stretched, with the surviving region chosen by the user. */
	object-fit: var(--tl-fit, cover);
	object-position: var(--tl-focal-x, 38%) var(--tl-focal-y, 50%);
	/* No filter here on purpose. Even a zero-radius blur keeps the element on a
	   filter path that re-renders a full-screen surface every frame, which is what
	   made playback stutter. The tint now comes from the veil overlay instead. */
	transform: translateZ(0);
	backface-visibility: hidden;
	opacity: 0;
	transition: opacity 900ms ease;
}
body[data-dsh-tianlight] [data-tl-scene] > video[data-tl-ready] {
	opacity: 1;
}
/* Opt-in colour grading. The attribute gate matters: even neutral filter values
   would keep the element on a full-screen filter path, which is what made older
   builds stutter. Off by default, so the fast path has no filter at all. */
body[data-dsh-tianlight] [data-tl-scene][data-tl-filter] > video,
body[data-dsh-tianlight] [data-tl-scene][data-tl-filter] > [data-tl-photo] {
	filter: brightness(var(--tl-f-brightness, 1)) contrast(var(--tl-f-contrast, 1)) saturate(var(--tl-f-saturate, 1));
}
body[data-dsh-tianlight] [data-tl-scene] > [data-tl-veil] {
	position: absolute;
	inset: 0;
	background:
		linear-gradient(180deg, rgba(255, 255, 255, 0.10) 0%, transparent 40%, rgba(12, 28, 48, 0.10) 100%);
}
body[data-dsh-tianlight][data-ds-dark-theme] [data-tl-scene] > [data-tl-veil] {
	background:
		linear-gradient(180deg, rgba(120, 180, 240, 0.06) 0%, transparent 42%, rgba(2, 8, 18, 0.30) 100%);
}
/* top-left dawn burst: corner artwork that never meets a control */
body[data-dsh-tianlight] [data-tl-scene] > [data-tl-crest] {
	position: absolute;
	top: -120px;
	left: -140px;
	width: 520px;
	height: 520px;
	opacity: 0.42;
}
body[data-dsh-tianlight][data-ds-dark-theme] [data-tl-scene] > [data-tl-crest] {
	opacity: 0.30;
}

/* ---- model picker: same glass pill as the composer ----
   Targets are runtime-stamped attributes (selector bridge), never build hashes. */
body[data-dsh-tianlight] [data-tl-model] {
	background: var(--tl-glass-fill) !important;
	-webkit-backdrop-filter: blur(var(--tl-glass-blur)) saturate(1.2);
	backdrop-filter: blur(var(--tl-glass-blur)) saturate(1.2);
	border: 0.5px solid var(--tl-glass-line) !important;
	border-radius: 999px !important;
	height: 26px;
	padding-inline: 11px !important;
	transition: background 140ms ease, border-color 140ms ease;
}
body[data-dsh-tianlight] [data-tl-model]:hover {
	border-color: var(--tl-accent) !important;
}
body[data-dsh-tianlight] [data-tl-model-label] {
	font-weight: 500;
	letter-spacing: 0.01em;
}
body[data-dsh-tianlight] [data-tl-model-effort] {
	opacity: 0.85;
}

/* ---- reasoning rheostat: a chrome-less luminous fader ----
   No capsule shell on purpose: a hairline of light plus a glowing bead reads as
   part of the wallpaper instead of one more pill in the tool row. Position comes
   from a real spring in JS, so the left/width properties must stay
   transition-free here or the rAF integration and CSS easing would fight. */
body[data-dsh-tianlight] [data-tl-rheo] {
	position: relative;
	box-sizing: border-box;
	width: 152px;
	height: 34px;
	flex: none;
	background: transparent;
	border: 0;
	touch-action: none;
	cursor: pointer;
	user-select: none;
	-webkit-user-select: none;
	transition: opacity 160ms ease;
}
body[data-dsh-tianlight] [data-tl-rheo]:focus-visible {
	outline: none;
}
body[data-dsh-tianlight] [data-tl-rheo][data-tl-busy] {
	opacity: 0.55;
}
body[data-dsh-tianlight] [data-tl-rheo][data-tl-rheo-empty] {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	box-sizing: border-box;
	width: auto;
	height: 26px;
	padding: 0 11px;
	border-radius: 999px;
	background: var(--tl-glass-fill);
	border: 0.5px solid var(--tl-glass-line);
	-webkit-backdrop-filter: blur(var(--tl-glass-blur)) saturate(1.2);
	backdrop-filter: blur(var(--tl-glass-blur)) saturate(1.2);
	cursor: default;
	opacity: 1;
}
body[data-dsh-tianlight] [data-tl-rheo-empty-text] {
	font-size: 11px;
	line-height: 1;
	letter-spacing: 0.04em;
	color: var(--tl-ink-faint);
	white-space: nowrap;
	max-width: 300px;
	overflow: hidden;
	text-overflow: ellipsis;
}
body[data-dsh-tianlight] [data-tl-rheo-track] {
	position: absolute;
	left: 12px;
	right: 40px;
	top: 50%;
	height: 2px;
	margin-top: -1px;
	border-radius: 999px;
	background: linear-gradient(90deg, transparent 0%, var(--tl-line-strong) 18%, var(--tl-line-strong) 100%);
}
body[data-dsh-tianlight] [data-tl-rheo-fill] {
	position: absolute;
	left: 12px;
	top: 50%;
	height: 2px;
	margin-top: -1px;
	border-radius: 999px;
	background: linear-gradient(90deg, color-mix(in srgb, var(--tl-accent) 25%, white), var(--tl-accent));
	box-shadow: 0 0 10px color-mix(in srgb, var(--tl-accent) 70%, transparent);
	width: calc((100% - 52px) * var(--tl-rheo-pos, 0));
}
body[data-dsh-tianlight] [data-tl-rheo-halo] {
	position: absolute;
	top: 50%;
	left: calc(12px + (100% - 52px) * var(--tl-rheo-pos, 0));
	width: 34px;
	height: 34px;
	margin: -17px 0 0 -17px;
	border-radius: 50%;
	background: radial-gradient(circle, color-mix(in srgb, var(--tl-accent) 40%, transparent) 0%, transparent 66%);
	pointer-events: none;
}
body[data-dsh-tianlight] [data-tl-rheo-bead] {
	position: absolute;
	top: 50%;
	left: calc(12px + (100% - 52px) * var(--tl-rheo-pos, 0));
	width: 11px;
	height: 11px;
	margin: -5.5px 0 0 -5.5px;
	border-radius: 50%;
	background: #ffffff;
	box-shadow:
		0 0 0 1.5px color-mix(in srgb, var(--tl-accent) 85%, white),
		0 0 14px 2px color-mix(in srgb, var(--tl-accent) 60%, transparent),
		0 1px 3px rgba(10, 30, 60, 0.30);
	pointer-events: none;
	transition:
		transform 240ms cubic-bezier(0.34, 1.7, 0.5, 1),
		box-shadow 200ms ease;
}
body[data-dsh-tianlight] [data-tl-rheo]:hover [data-tl-rheo-bead] {
	transform: scale(1.25);
}
body[data-dsh-tianlight] [data-tl-rheo][data-tl-drag] [data-tl-rheo-bead] {
	transform: scale(1.45);
}
/* one expanding ring per detent change; the element is keyed so it restarts */
body[data-dsh-tianlight] [data-tl-rheo-pulse] {
	position: absolute;
	top: 50%;
	left: calc(12px + (100% - 52px) * var(--tl-rheo-pos, 0));
	width: 12px;
	height: 12px;
	margin: -6px 0 0 -6px;
	border-radius: 50%;
	border: 1.5px solid color-mix(in srgb, var(--tl-accent) 75%, white);
	pointer-events: none;
	animation: tl-rheo-ring 620ms cubic-bezier(0.2, 0.7, 0.2, 1) forwards;
}
@keyframes tl-rheo-ring {
	0% {
		transform: scale(0.6);
		opacity: 0.85;
	}
	70% {
		opacity: 0.25;
	}
	100% {
		transform: scale(3.1);
		opacity: 0;
	}
}
body[data-dsh-tianlight] [data-tl-rheo-label] {
	position: absolute;
	right: 10px;
	top: 50%;
	transform: translateY(-50%);
	font-size: 11px;
	line-height: 1;
	letter-spacing: 0.05em;
	color: var(--tl-ink-soft);
	pointer-events: none;
	animation: tl-rheo-pop 420ms cubic-bezier(0.34, 1.6, 0.5, 1);
}
@keyframes tl-rheo-pop {
	0% {
		transform: translateY(-50%) translateY(3px) scale(0.86);
		opacity: 0.3;
	}
	60% {
		transform: translateY(-50%) translateY(-1px) scale(1.06);
		opacity: 1;
	}
	100% {
		transform: translateY(-50%) scale(1);
		opacity: 1;
	}
}
body[data-dsh-tianlight] [data-tl-rheo][data-tl-drag] [data-tl-rheo-label] {
	color: var(--tl-accent);
}
@media (prefers-reduced-motion: reduce) {
	body[data-dsh-tianlight] [data-tl-rheo-pulse],
	body[data-dsh-tianlight] [data-tl-rheo-label] {
		animation: none;
	}
}



/* ---- raise the application above the wallpaper ---- */
body[data-dsh-tianlight] [id='root'] {
	position: relative !important;
	z-index: 1 !important;
	/* Surfaces can be fully transparent, so text sits straight on a moving video.
	   A hairline shadow is inherited by every text node and costs no wallpaper. */
	text-shadow: 0 1px 2px rgba(255, 255, 255, 0.62), 0 0 1px rgba(255, 255, 255, 0.42);
}
body[data-dsh-tianlight][data-ds-dark-theme] [id='root'] {
	text-shadow: 0 1px 2px rgba(0, 0, 0, 0.66), 0 0 1px rgba(0, 0, 0, 0.45);
}

/* ---- left column: forced transparent, whichever variant painted it ----
   Targets are runtime-stamped by the selector bridge from STABLE DSH hooks
   (data-sidebar-collapsed, the _sidebarCol class suffix), so a DSH build
   hash change no longer silently drops the rule. */
body[data-dsh-tianlight] [data-tl-sidebar],
body[data-dsh-tianlight] [data-tl-sidebar-col] {
	background: transparent !important;
	background-image: none !important;
	background-color: transparent !important;
}

/* Dark theme only, left column only: nothing inside may paint a background.
   The column's own rule was already transparent, so a pure-black area had to come
   from a descendant. Hover/selection tints inside the sidebar are sacrificed here
   on purpose — no black block is worth keeping them. */
body[data-dsh-tianlight][data-ds-dark-theme] [data-tl-sidebar-col] :where(div, aside, nav, section, ul, ol, li) {
	background-color: transparent !important;
	background-image: none !important;
}

/* ---- composer only: frosted glass ----
   The rest of the interface stays fully transparent (100% wallpaper); this is the
   single surface that gets a blurred backdrop, because it is where typing happens
   and it sits over the moving picture.
   Bridge source: the stable data-composer-card attribute, or a _card suffix
   element that owns a contenteditable/textarea. */
body[data-dsh-tianlight] [data-tl-composer] {
	/* The blur is painted by ::before, never here. backdrop-filter makes an element the
	   containing block for its position:fixed descendants; the composer's tooltips are
	   not portaled, so a blur on the card would re-anchor their bubbles to the card
	   instead of the viewport, which misplaces the bubble and disturbs the transcript
	   scroll area while it is open. The pseudo layer is not an ancestor of the
	   tooltips, so it keeps the frosted look without the containing block. */
	background: var(--tl-glass-fill) !important;
	border: 0.5px solid var(--tl-glass-line) !important;
	box-shadow:
		0 10px 34px rgba(8, 28, 52, 0.22),
		inset 0 1px 0 var(--tl-glass-line) !important;
	/* Stacking context (kept from the old backdrop-filter) without a fixed containing
	   block, so the ::before layer can sit above this background and below the text. */
	position: relative;
	isolation: isolate;
}
body[data-dsh-tianlight] [data-tl-composer]::before {
	content: "";
	position: absolute;
	inset: 0;
	border-radius: inherit;
	-webkit-backdrop-filter: blur(var(--tl-glass-blur)) saturate(1.25);
	backdrop-filter: blur(var(--tl-glass-blur)) saturate(1.25);
	pointer-events: none;
	z-index: -1;
}
body[data-dsh-tianlight][data-ds-dark-theme] [data-tl-composer] {
	box-shadow:
		0 10px 34px rgba(0, 0, 0, 0.45),
		inset 0 1px 0 var(--tl-glass-line) !important;
}

/* ---- settings panel: a solid-ish glass surface, with NO live blur ----
   The panel painted --dsw-alias-bg-layer-2, which the skin zeroes to reach 100%
   wallpaper, so the chat behind it showed through and the two text layers collided.
   It therefore needs its own fill.
   Deliberately no backdrop-filter here: the panel is large over a playing video,
   and the product's mask already blurs the full viewport (--dsw-mask-blur). Two
   stacked live blurs re-composite on every video frame and made scrolling janky.
   Opacity plus a hairline border carries the glass look at zero per-frame cost.
   Bridge source: _surface/_pane inside [data-sidebar-right-panel], or the
   legacy _panel-inside-_mask shape. */
body[data-dsh-tianlight] [data-tl-settings] {
	background: var(--tl-panel-fill) !important;
	border: 0.5px solid var(--tl-glass-line);
	box-shadow:
		0 18px 60px rgba(8, 26, 48, 0.28),
		inset 0 1px 0 var(--tl-glass-line);
}
body[data-dsh-tianlight][data-ds-dark-theme] [data-tl-settings] {
	box-shadow:
		0 18px 60px rgba(0, 0, 0, 0.55),
		inset 0 1px 0 var(--tl-glass-line);
}

/* ---- font panel: right sidebar tab + its composer trigger ----
   Own class names only, so nothing here can collide with a product class. */
/* ---- wallpaper sidebar: full height, slides in from the left edge ---- */
body[data-dsh-tianlight] [data-tl-wall-handle] {
	position: fixed;
	left: 0;
	top: 50%;
	transform: translateY(-50%);
	z-index: 1310;
	writing-mode: vertical-rl;
	letter-spacing: 0.22em;
	padding: 14px 7px;
	border: 0.5px solid var(--tl-glass-line);
	border-left: none;
	border-radius: 0 12px 12px 0;
	background: var(--tl-panel-fill);
	color: var(--tl-ink-soft);
	font-size: 11px;
	line-height: 1;
	cursor: pointer;
	box-shadow: 4px 0 18px rgba(8, 26, 48, 0.16);
	transition: color 0.18s ease, border-color 0.18s ease;
}
body[data-dsh-tianlight] [data-tl-wall-handle]:hover {
	color: var(--tl-ink);
	border-color: var(--tl-accent);
}
body[data-dsh-tianlight] [data-tl-wall-handle][data-tl-hidden] {
	display: none;
}
body[data-dsh-tianlight] [data-tl-wall] {
	position: fixed;
	top: 0;
	bottom: 0;
	left: 0;
	width: 320px;
	max-width: 88vw;
	/* Translation is owned by the drag/spring code, so no CSS transition here: a
	   transition would fight the rAF writes and eat the velocity. */
	display: none;
	flex-direction: column;
	background: var(--tl-panel-fill);
	border-right: 0.5px solid var(--tl-glass-line);
	box-shadow: 18px 0 48px rgba(8, 26, 48, 0.28);
	will-change: transform;
	/* v0.5.3 hardening: the DSH product can leave a full-viewport modal mask
	   (position:fixed, z-index:1000, pointer-events:auto) mounted while it is visually
	   gone (first-run / stale popover). Such a mask swallows every real mouse click
	   while keyboard shortcuts still reach the page - the reported "the wallpaper
	   panel does not react". Skin surfaces therefore sit above the product mask and
	   below nothing else that matters; the panel starts below the title strip, so the
	   z-index gap does not cover the app menu. */
	z-index: 1300;
	overflow-y: auto;
	/* Reserve the scrollbar lane: sections and the live quality line change height,
	   and a scrollbar appearing/disappearing used to shift the whole panel. */
	scrollbar-gutter: stable;
	color: var(--tl-ink);
	cursor: default;
	/* The wallpaper-derived fill is re-sampled every few seconds; transition the
	   colour instead of repainting it as a visible step. */
	transition: background-color 1.2s ease, border-color 0.24s ease;
	/* Vertical touch scrolling must keep working; only the drag handle captures
	   horizontal gestures. */
	touch-action: pan-y;
}
body[data-dsh-tianlight] [data-tl-wall] button,
body[data-dsh-tianlight] [data-tl-wall] input,
body[data-dsh-tianlight] [data-tl-wall] select {
	cursor: pointer;
}
body[data-dsh-tianlight] [data-tl-wall][data-tl-dragging] {
	cursor: grabbing;
}
body[data-dsh-tianlight] [data-tl-wall][data-tl-open] {
	display: flex;
}
body[data-dsh-tianlight] [data-tl-wall][data-tl-side="right"] {
	border-right: none;
	border-left: 0.5px solid var(--tl-glass-line);
	box-shadow: -18px 0 48px rgba(8, 26, 48, 0.28);
}
body[data-dsh-tianlight][data-ds-dark-theme] [data-tl-wall] {
	box-shadow: 18px 0 48px rgba(0, 0, 0, 0.55);
}
body[data-dsh-tianlight][data-ds-dark-theme] [data-tl-wall][data-tl-side="right"] {
	box-shadow: -18px 0 48px rgba(0, 0, 0, 0.55);
}
/* ---- desktop window chrome clearance (Windows) ----
   DSH Desktop's preload marks <html data-windows-titlebar> and exposes the measured
   native title strip as --dsh-windows-titlebar-height (40px on 0.2.1). Its own app
   menu is a fixed host at z-index 1100 covering that strip. A skin surface pinned to
   the very top therefore had its header painted UNDER the menu and its top row
   outside the clickable page area (the reported "panel does nothing" bug).
   Fixed surfaces that touch the top edge start below the strip instead; when the
   window is fullscreen the preload sets data-fullscreen and the clearance is gone. */
html[data-windows-titlebar]:not([data-fullscreen]) body[data-dsh-tianlight] [data-tl-wall] {
	top: var(--dsh-windows-titlebar-height, 40px);
}
html[data-windows-titlebar]:not([data-fullscreen]) body[data-dsh-tianlight] [data-tl-wall-scrim] {
	top: var(--dsh-windows-titlebar-height, 40px);
}
html[data-windows-titlebar]:not([data-fullscreen]) body[data-dsh-tianlight] [data-tl-wall-handle] {
	/* Optically centre the edge tab in the *content* area, not the whole window. */
	top: calc(50% + var(--dsh-windows-titlebar-height, 40px) / 2);
}
html[data-windows-titlebar]:not([data-fullscreen]) body[data-dsh-tianlight] [data-tl-font-panel] {
	top: max(12vh, calc(var(--dsh-windows-titlebar-height, 40px) + 12px));
}
body[data-dsh-tianlight] [data-tl-wall] [data-tl-wall-drag] {
	cursor: grab;
	user-select: none;
	touch-action: none;
}
body[data-dsh-tianlight] [data-tl-wall][data-tl-dragging] {
	user-select: none;
}
body[data-dsh-tianlight] [data-tl-wall][data-tl-dragging] [data-tl-wall-drag] {
	cursor: grabbing;
}
body[data-dsh-tianlight] [data-tl-wall-scrim] {
	position: fixed;
	inset: 0;
	z-index: 1290;
	background: rgba(10, 22, 38, 0.18);
	opacity: 0;
	pointer-events: none;
	transition: opacity 0.24s ease;
}
body[data-dsh-tianlight] [data-tl-wall-scrim][data-tl-open] {
	opacity: 1;
	pointer-events: auto;
}
body[data-dsh-tianlight] .tl-wall-inner {
	position: relative;
	display: flex;
	flex-direction: column;
	gap: 10px;
	/* Bottom padding is a safe area: the panel is full-height and the last card used
	   to end flush against the window edge. */
	padding: 14px 14px calc(18px + env(safe-area-inset-bottom, 0px));
}
body[data-dsh-tianlight] .tl-wall-glow {
	position: absolute;
	inset: 0;
	pointer-events: none;
	border-radius: inherit;
	--tl-glow-x: 50%;
	--tl-glow-y: 30%;
	--tl-glow-a: 0;
	opacity: var(--tl-glow-a);
	transition: opacity 0.22s ease;
	background: radial-gradient(
		240px circle at var(--tl-glow-x) var(--tl-glow-y),
		color-mix(in srgb, var(--tl-accent) 62%, transparent),
		transparent 72%
	);
}
body[data-dsh-tianlight] .tl-wall-head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 10px;
}
body[data-dsh-tianlight] .tl-wall-view-switch {
	margin-left: auto;
	display: flex;
	gap: 2px;
	padding: 2px;
	border-radius: 999px;
	background: color-mix(in srgb, var(--tl-ink-faint) 12%, transparent);
}
body[data-dsh-tianlight] .tl-wall-view-switch button {
	padding: 2px 7px;
	border: 0;
	border-radius: 999px;
	background: transparent;
	color: var(--tl-ink-faint);
	font: inherit;
	font-size: 10px;
	font-weight: 600;
	cursor: pointer;
}
body[data-dsh-tianlight] .tl-wall-view-switch button[data-active] {
	background: var(--tl-glass-fill);
	color: var(--tl-ink);
}
/* Pick mode is the default: only the source routes and the wallpaper list.
   Every adjustment group is one click away under 高级, not on screen by default. */
body[data-dsh-tianlight] [data-tl-wall] [data-tl-view="pick"] [data-tl-group="sources"],
body[data-dsh-tianlight] [data-tl-wall] [data-tl-view="pick"] [data-tl-group="advanced"] {
	display: none;
}
/* v0.5.0 extension sections (⑦ 工程 / ⑧ 特效 / ⑨ 情境 / ⑩ 音频 / ⑪ 引擎 …)
   are advanced surfaces too: the simple "pick a wallpaper" view stays short.
   They are one click away under 高级, in registration order. */
body[data-dsh-tianlight] [data-tl-wall] [data-tl-view="pick"] [data-tl-group]:not([data-tl-group="sources"]):not([data-tl-group="advanced"]) {
	display: none;
}
/* In the simple view the list is just upload + search + filters + grid. The filter
   row stays visible: it owns the only "显示隐藏 N" recovery entry, and hiding it
   made the small "隐" button on a card a one-way door (the card vanished with no
   way back until the user found 高级). Tag editing stays an advanced action. */
body[data-dsh-tianlight] [data-tl-view="pick"] .tl-wall-tag-editor {
	display: none;
}
body[data-dsh-tianlight] .tl-wall-hint {
	margin: 0;
	font-size: 11px;
	line-height: 1.5;
	color: var(--tl-ink-faint);
}
/* A filtered-empty list needs a way back to the full library, not just a line of
   grey text — the empty state is a small column: sentence, then the exit button. */
body[data-dsh-tianlight] .tl-wall-empty {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: 8px;
	margin: 2px 0 4px;
}
body[data-dsh-tianlight] .tl-wall-guide {
	display: flex;
	flex-direction: column;
	gap: 2px;
	margin: 0 2px 4px;
}
/* Three primary routes at the top: the shortest path to changing a wallpaper. */
body[data-dsh-tianlight] .tl-wall-quick {
	display: grid;
	grid-template-columns: repeat(4, minmax(0, 1fr));
	gap: 4px;
	margin: 2px 0 1px;
}
body[data-dsh-tianlight] .tl-wall-quick-btn {
	padding: 5px 2px;
	border-radius: 9px;
	border: 0.5px solid var(--tl-line-strong);
	background: var(--tl-glass-fill);
	color: var(--tl-ink-soft);
	font: inherit;
	font-size: 10px;
	font-weight: 600;
	line-height: 1.3;
	white-space: nowrap;
	cursor: pointer;
}
body[data-dsh-tianlight] .tl-wall-quick-btn:hover {
	border-color: var(--tl-accent);
	color: var(--tl-ink);
}
body[data-dsh-tianlight] .tl-wall-quick-btn[data-active] {
	border-color: var(--tl-accent);
	background: color-mix(in srgb, var(--tl-accent) 14%, var(--tl-glass-fill));
	color: var(--tl-ink);
}
/* One library: chips filter the same grid; URL/WE/GLSL are secondary import links. */
body[data-dsh-tianlight] .tl-wall-filter-row {
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: 4px;
	margin: 2px 0 1px;
}
body[data-dsh-tianlight] .tl-wall-filter-chip {
	padding: 5px 2px;
	border-radius: 999px;
	border: 0.5px solid var(--tl-line-strong);
	background: var(--tl-glass-fill);
	color: var(--tl-ink-soft);
	font: inherit;
	font-size: 10px;
	font-weight: 600;
	white-space: nowrap;
	cursor: pointer;
}
body[data-dsh-tianlight] .tl-wall-filter-chip:hover {
	border-color: var(--tl-accent);
	color: var(--tl-ink);
}
body[data-dsh-tianlight] .tl-wall-filter-chip[data-active] {
	border-color: var(--tl-accent);
	background: color-mix(in srgb, var(--tl-accent) 16%, var(--tl-glass-fill));
	color: var(--tl-ink);
}
body[data-dsh-tianlight] .tl-wall-import-row {
	display: flex;
	flex-wrap: wrap;
	gap: 2px 10px;
	margin: 0 0 1px;
}
body[data-dsh-tianlight] .tl-wall-import-btn {
	padding: 1px 0;
	border: 0;
	background: transparent;
	color: var(--tl-ink-faint);
	font: inherit;
	font-size: 10px;
	text-decoration: underline;
	text-underline-offset: 2px;
	cursor: pointer;
}
body[data-dsh-tianlight] .tl-wall-import-btn:hover,
body[data-dsh-tianlight] .tl-wall-import-btn[data-active] {
	color: var(--tl-accent);
}
/* Live playback state. A dot + one word answers "is the wallpaper actually
   moving?", which the old top bar could not: it always said 动态壁纸. */
body[data-dsh-tianlight] .tl-wall-status {
	display: flex;
	align-items: center;
	gap: 6px;
	margin: 0;
	font-size: 11px;
	font-weight: 600;
	letter-spacing: 0.01em;
	color: var(--tl-ink-soft);
	font-variant-numeric: tabular-nums;
}
/* The quality line carries changing FPS/jitter numbers. Keep it one line with
   tabular digits, otherwise the guide changes height every second and the whole
   panel appears to jitter while the wallpaper plays. */
body[data-dsh-tianlight] .tl-wall-quality {
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	font-variant-numeric: tabular-nums;
}
body[data-dsh-tianlight] .tl-wall-status-dot {
	flex: none;
	width: 6px;
	height: 6px;
	border-radius: 999px;
	background: var(--tl-ink-faint);
	box-shadow: 0 0 0 2px color-mix(in srgb, var(--tl-ink-faint) 22%, transparent);
}
body[data-dsh-tianlight] .tl-wall-status[data-tone="live"] {
	color: var(--tl-ink);
}
body[data-dsh-tianlight] .tl-wall-status[data-tone="live"] .tl-wall-status-dot {
	background: var(--tl-accent);
	box-shadow: 0 0 0 2px color-mix(in srgb, var(--tl-accent) 26%, transparent);
}
body[data-dsh-tianlight] .tl-wall-status[data-tone="warn"] {
	color: var(--tl-ink);
}
body[data-dsh-tianlight] .tl-wall-status[data-tone="warn"] .tl-wall-status-dot {
	background: #e8b45a;
	box-shadow: 0 0 0 2px rgba(232, 180, 90, 0.26);
}
body[data-dsh-tianlight] .tl-wall-status[data-tone="alert"] {
	color: var(--tl-ink);
}
body[data-dsh-tianlight] .tl-wall-status[data-tone="alert"] .tl-wall-status-dot {
	background: #e8776b;
	box-shadow: 0 0 0 2px rgba(232, 119, 107, 0.26);
}
body[data-dsh-tianlight] .tl-wall-current {
	margin: 0;
	font-size: 11px;
	font-weight: 600;
	color: var(--tl-ink);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}
body[data-dsh-tianlight] .tl-wall-sticky {
	position: sticky;
	top: 0;
	z-index: 2;
	display: flex;
	flex-direction: column;
	gap: 6px;
	margin: -14px -14px 0;
	padding: 14px 14px 10px;
	background: var(--tl-panel-fill);
	border-bottom: 0.5px solid var(--tl-line-strong);
}
body[data-dsh-tianlight] .tl-source-grid {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 6px;
}
body[data-dsh-tianlight] .tl-source-card {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: 2px;
	padding: 6px 8px;
	border-radius: 10px;
	border: 0.5px solid var(--tl-line-strong);
	background: var(--tl-glass-fill);
	color: var(--tl-ink-soft);
	font: inherit;
	text-align: left;
	cursor: pointer;
}
body[data-dsh-tianlight] .tl-source-card:hover {
	border-color: var(--tl-accent);
}
body[data-dsh-tianlight] .tl-source-card[data-active] {
	border-color: var(--tl-accent);
	background: color-mix(in srgb, var(--tl-accent) 12%, var(--tl-glass-fill));
}
body[data-dsh-tianlight] .tl-source-card[data-tl-disabled] {
	opacity: 0.45;
	cursor: not-allowed;
}
body[data-dsh-tianlight] .tl-source-name {
	font-size: 11px;
	font-weight: 600;
	line-height: 1.3;
	color: var(--tl-ink);
}
body[data-dsh-tianlight] .tl-source-note {
	font-size: 10px;
	line-height: 1.3;
	color: var(--tl-ink-faint);
}
body[data-dsh-tianlight] .tl-wall-grid {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 8px;
}
body[data-dsh-tianlight] .tl-wall-card {
	display: flex;
	flex-direction: column;
	gap: 6px;
	padding: 6px;
	border-radius: 12px;
	border: 0.5px solid var(--tl-line-strong);
	background: var(--tl-glass-fill);
	color: var(--tl-ink-soft);
	font-size: 11px;
	cursor: pointer;
	text-align: left;
}
body[data-dsh-tianlight] .tl-wall-card:hover {
	border-color: var(--tl-accent);
	color: var(--tl-ink);
}
body[data-dsh-tianlight] .tl-wall-card[data-active] {
	border-color: var(--tl-accent);
	background: var(--tl-accent-soft);
	color: var(--tl-ink);
}
body[data-dsh-tianlight] .tl-wall-thumb {
	position: relative;
	aspect-ratio: 16 / 9;
	border-radius: 8px;
	overflow: hidden;
	background: var(--tl-line);
	display: flex;
	align-items: center;
	justify-content: center;
}
body[data-dsh-tianlight] .tl-wall-thumb > img,
body[data-dsh-tianlight] .tl-wall-thumb > video {
	width: 100%;
	height: 100%;
	object-fit: cover;
	display: block;
}
body[data-dsh-tianlight] .tl-wall-auto {
	font-size: 11px;
	color: var(--tl-ink-faint);
	letter-spacing: 0.08em;
}
body[data-dsh-tianlight] .tl-wall-name {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
body[data-dsh-tianlight] .tl-wall-library {
	display: flex;
	flex-direction: column;
	gap: 6px;
}
body[data-dsh-tianlight] .tl-wall-upload {
	display: inline-flex;
	align-items: center;
	padding: 4px 12px;
	border-radius: 999px;
	border: 0.5px solid var(--tl-line-strong);
	background: transparent;
	color: var(--tl-ink-soft);
	font-size: 12px;
	line-height: 1.4;
	cursor: pointer;
}
body[data-dsh-tianlight] .tl-wall-upload:hover {
	border-color: var(--tl-accent);
	color: var(--tl-ink);
}
body[data-dsh-tianlight] .tl-wall-upload[data-busy] {
	opacity: 0.6;
	cursor: default;
}
body[data-dsh-tianlight] .tl-wall-cell {
	position: relative;
	display: flex;
	min-width: 0;
}
body[data-dsh-tianlight] .tl-wall-cell > .tl-wall-card {
	flex: 1;
	min-width: 0;
}
body[data-dsh-tianlight] .tl-wall-fav,
body[data-dsh-tianlight] .tl-wall-tag-open,
body[data-dsh-tianlight] .tl-wall-hide {
	position: absolute;
	top: 5px;
	width: 22px;
	height: 22px;
	display: grid;
	place-items: center;
	padding: 0;
	border-radius: 999px;
	border: 0.5px solid var(--tl-glass-line);
	background: var(--tl-overlay);
	color: var(--tl-ink-soft);
	font-size: 12px;
	line-height: 1;
	cursor: pointer;
}
body[data-dsh-tianlight] .tl-wall-fav {
	right: 5px;
}
body[data-dsh-tianlight] .tl-wall-hide {
	right: 31px;
	font-size: 10px;
}
body[data-dsh-tianlight] .tl-wall-tag-open {
	left: 5px;
}
body[data-dsh-tianlight] .tl-wall-fav:hover,
body[data-dsh-tianlight] .tl-wall-tag-open:hover,
body[data-dsh-tianlight] .tl-wall-hide:hover {
	border-color: var(--tl-accent);
	color: var(--tl-ink);
}
body[data-dsh-tianlight] .tl-wall-fav[data-active] {
	border-color: var(--tl-accent);
	color: var(--tl-accent);
}
body[data-dsh-tianlight] .tl-wall-hide[data-active] {
	border-color: #e8b45a;
	color: #e8b45a;
}
body[data-dsh-tianlight] .tl-wall-cell[data-tl-hidden] > .tl-wall-card {
	opacity: 0.5;
}
body[data-dsh-tianlight] .tl-wall-tags-mini {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	font-size: 10px;
	letter-spacing: 0.02em;
	color: var(--tl-ink-faint);
}
body[data-dsh-tianlight] .tl-frame-grid {
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: 6px;
}
body[data-dsh-tianlight] .tl-frame {
	display: flex;
	flex-direction: column;
	gap: 2px;
	padding: 3px;
	border-radius: 8px;
	border: 0.5px solid var(--tl-line-strong);
	background: var(--tl-glass-fill);
	color: var(--tl-ink-soft);
	font-size: 10px;
	line-height: 1.3;
	cursor: pointer;
}
body[data-dsh-tianlight] .tl-frame:hover {
	border-color: var(--tl-accent);
	color: var(--tl-ink);
}
body[data-dsh-tianlight] .tl-frame > img {
	width: 100%;
	aspect-ratio: 16 / 9;
	object-fit: cover;
	border-radius: 6px;
	display: block;
}
body[data-dsh-tianlight] .tl-font-reset:disabled {
	opacity: 0.5;
	cursor: default;
}
body[data-dsh-tianlight] .tl-wall-url {
	display: flex;
	flex-direction: column;
	gap: 8px;
	margin-top: 4px;
}
body[data-dsh-tianlight] .tl-wall-tabs {
	display: flex;
	gap: 6px;
	flex-wrap: wrap;
	align-items: center;
}
body[data-dsh-tianlight] .tl-wall-label {
	font-size: 11px;
	color: var(--tl-ink-soft);
}
body[data-dsh-tianlight] .tl-wall-slider > input:disabled {
	opacity: 0.4;
	cursor: not-allowed;
}
body[data-dsh-tianlight] .tl-wall-textarea {
	width: 100%;
	box-sizing: border-box;
	padding: 6px 10px;
	border-radius: 10px;
	border: 0.5px solid var(--tl-line-strong);
	background: var(--tl-glass-fill);
	color: var(--tl-ink);
	font-family: var(--ds-font-family-code, monospace);
	font-size: 11px;
	resize: vertical;
	outline: none;
}
body[data-dsh-tianlight] .tl-wall-textarea:focus {
	border-color: var(--tl-accent);
}
body[data-dsh-tianlight] .tl-wall-code {
	min-height: 132px;
	white-space: pre;
	tab-size: 2;
}
body[data-dsh-tianlight] .tl-wall-group {
	display: flex;
	flex-direction: column;
	gap: 8px;
	padding: 7px 9px;
	border-radius: 12px;
	border: 0.5px solid var(--tl-line-strong);
	background: color-mix(in srgb, var(--tl-glass-fill) 60%, transparent);
}
body[data-dsh-tianlight] .tl-wall-group > summary {
	display: flex;
	align-items: center;
	gap: 6px;
	cursor: pointer;
	list-style: none;
	font-size: 12px;
	font-weight: 600;
	letter-spacing: 0.04em;
	color: var(--tl-ink);
}
body[data-dsh-tianlight] .tl-wall-step {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	flex: none;
	width: 18px;
	height: 18px;
	border-radius: 50%;
	background: color-mix(in srgb, var(--tl-accent) 18%, transparent);
	color: var(--tl-accent);
	font-size: 10px;
	font-weight: 600;
	letter-spacing: 0;
}
body[data-dsh-tianlight] .tl-wall-group-title {
	flex: 1;
}
body[data-dsh-tianlight] .tl-wall-summary-value {
	margin-left: auto;
	max-width: 120px;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	font-size: 10px;
	font-weight: 400;
	letter-spacing: 0;
	color: var(--tl-ink-faint);
}
body[data-dsh-tianlight] .tl-wall-group > summary::-webkit-details-marker {
	display: none;
}
body[data-dsh-tianlight] .tl-wall-group > summary::after {
	content: " ▾";
	flex: none;
	font-weight: 400;
	color: var(--tl-ink-faint);
}
body[data-dsh-tianlight] .tl-wall-group:not([open]) > summary::after {
	content: " ▸";
}
body[data-dsh-tianlight] .tl-wall-group > *:not(summary) {
	margin-top: 2px;
}
body[data-dsh-tianlight] .tl-font-option[data-tl-disabled] {
	opacity: 0.45;
	cursor: not-allowed;
}
body[data-dsh-tianlight] .tl-wall-slider {
	display: flex;
	flex-direction: column;
	gap: 4px;
	font-size: 11px;
	color: var(--tl-ink-soft);
}
body[data-dsh-tianlight] .tl-wall-slider > input {
	width: 100%;
	accent-color: var(--tl-accent);
	cursor: pointer;
}

/* ---- font panel docked to the right edge (self-owned host) ---- */
body[data-dsh-tianlight] [data-tl-scene] > [data-tl-photo] {
	position: absolute;
	inset: 0;
	background-position: var(--tl-focal-x, 50%) var(--tl-focal-y, 50%);
	background-size: var(--tl-fit-size, cover);
	background-repeat: no-repeat;
	opacity: 0;
	transition: opacity 0.9s ease;
}
body[data-dsh-tianlight] [data-tl-scene] > [data-tl-dim] {
	position: absolute;
	inset: 0;
	pointer-events: none;
	background: rgba(4, 10, 18, var(--tl-zone-dim, 0));
}
/* The workspace rail can show its own framing of the same picture. A canvas mirror
   reuses the single decoded video instead of starting a second decoder. */
body[data-dsh-tianlight] [data-tl-rail] {
	position: fixed;
	top: 0;
	bottom: 0;
	left: 0;
	overflow: hidden;
	pointer-events: none;
	/* Same plane as the wallpaper scene: the app root sits at z-index 1, so anything
	   at 1 would paint OVER the application and hide the sidebar's text. */
	z-index: 0;
	display: none;
	--tl-rail-blur: 0px;
	--tl-rail-dim: 0;
}
body[data-dsh-tianlight] [data-tl-rail][data-tl-on] {
	display: block;
}
body[data-dsh-tianlight] [data-tl-rail] > canvas {
	width: 100%;
	height: 100%;
	display: block;
	filter: blur(var(--tl-rail-blur));
}
body[data-dsh-tianlight] [data-tl-rail] > [data-tl-rail-dim] {
	position: absolute;
	inset: 0;
	background: rgba(4, 10, 18, var(--tl-rail-dim));
	pointer-events: none;
}
body[data-dsh-tianlight] [data-tl-scene] > [data-tl-photo][data-tl-ready] {
	opacity: 1;
}
/* ---- shader channel: a full-screen WebGL canvas between the still layer and the veil ---- */
body[data-dsh-tianlight] [data-tl-scene] > [data-tl-shader] {
	position: absolute;
	inset: 0;
	width: 100%;
	height: 100%;
	display: none;
}
body[data-dsh-tianlight] [data-tl-scene][data-tl-shader-on] > [data-tl-shader] {
	display: block;
}
/* Optional WebWallGL scene channel: same slot as the shader canvas, sandboxed. */
body[data-dsh-tianlight] [data-tl-scene] > [data-tl-scene-frame] {
	position: absolute;
	inset: 0;
	width: 100%;
	height: 100%;
	border: 0;
	background: transparent;
	pointer-events: none;
}
/* ---- overlay stack: two CSS-only layers above the wallpaper, below veil/crest ---- */
body[data-dsh-tianlight] [data-tl-scene] > [data-tl-overlay] {
	position: absolute;
	inset: 0;
	display: none;
	pointer-events: none;
	background-repeat: no-repeat;
	background-position: center;
	opacity: var(--tl-overlay-opacity, 0.55);
	mix-blend-mode: var(--tl-overlay-blend, normal);
}
body[data-dsh-tianlight] [data-tl-scene] > [data-tl-overlay][data-tl-overlay-preset="vignette"] {
	display: block;
	background: radial-gradient(ellipse at center, transparent 42%, rgba(0, 0, 0, 0.55) 100%);
}
body[data-dsh-tianlight] [data-tl-scene] > [data-tl-overlay][data-tl-overlay-preset="grain"] {
	display: block;
	background-image:
		radial-gradient(rgba(255, 255, 255, 0.18) 0.6px, transparent 0.6px),
		radial-gradient(rgba(0, 0, 0, 0.22) 0.6px, transparent 0.6px);
	background-size: 3px 3px, 4px 4px;
	background-position: 0 0, 1px 2px;
}
body[data-dsh-tianlight] [data-tl-scene] > [data-tl-overlay][data-tl-overlay-preset="glow"] {
	display: block;
	background:
		radial-gradient(ellipse at 28% 18%, color-mix(in srgb, var(--tl-accent) 46%, transparent), transparent 60%),
		linear-gradient(125deg, transparent 45%, color-mix(in srgb, var(--tl-accent) 28%, transparent) 100%);
}
body[data-dsh-tianlight] [data-tl-scene] > [data-tl-overlay][data-tl-overlay-preset="scan"] {
	display: block;
	background: repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.2) 0 1px, transparent 1px 3px);
}
body[data-dsh-tianlight] [data-tl-scene] > [data-tl-overlay][data-tl-overlay-image] {
	display: block;
}
/* ---- ratio-locked crop window ----
   The crop is expressed in source-normalised coordinates; the media is scaled up and
   offset so exactly that window fills the frame. A preset ratio makes width/height
   differ, which is what keeps the visible window from drifting off-ratio. */
body[data-dsh-tianlight] [data-tl-scene] > video,
body[data-dsh-tianlight] [data-tl-scene] > [data-tl-photo] {
	inset: auto;
	left: calc(-100% * var(--crop-x, 0) / var(--crop-w, 1));
	top: calc(-100% * var(--crop-y, 0) / var(--crop-h, 1));
	width: calc(100% / var(--crop-w, 1));
	height: calc(100% / var(--crop-h, 1));
}
body[data-dsh-tianlight] .tl-font-select,
body[data-dsh-tianlight] .tl-font-input {
	width: 100%;
	box-sizing: border-box;
	padding: 6px 10px;
	border-radius: 10px;
	border: 0.5px solid var(--tl-line-strong);
	background: var(--tl-glass-fill);
	color: var(--tl-ink);
	font-size: 12px;
	outline: none;
}
body[data-dsh-tianlight] .tl-font-select:focus,
body[data-dsh-tianlight] .tl-font-input:focus {
	border-color: var(--tl-accent);
}
body[data-dsh-tianlight] [data-tl-font-panel] {
	position: fixed;
	right: 16px;
	top: 12vh;
	z-index: 1320;
	width: 300px;
	max-width: calc(100vw - 32px);
	max-height: min(82vh, 660px);
	border-radius: 18px;
	background: var(--tl-panel-fill);
	border: 0.5px solid var(--tl-glass-line);
	box-shadow: 0 18px 48px rgba(8, 26, 48, 0.28);
	color: var(--tl-ink);
	overflow: hidden;
}
body[data-dsh-tianlight][data-ds-dark-theme] [data-tl-font-panel] {
	box-shadow: 0 18px 48px rgba(0, 0, 0, 0.55);
}
body[data-dsh-tianlight] [data-tl-font-panel][hidden] {
	display: none;
}
body[data-dsh-tianlight] .tl-font-panel {
	box-sizing: border-box;
	max-height: min(82vh, 660px);
	overflow-y: auto;
	padding: 14px 16px;
	display: flex;
	flex-direction: column;
	gap: 12px;
	color: var(--tl-ink);
}
body[data-dsh-tianlight] .tl-font-heading {
	display: flex;
	flex-direction: column;
	gap: 2px;
	min-width: 0;
}
body[data-dsh-tianlight] .tl-font-subtitle {
	font-size: 10px;
	line-height: 1.3;
	color: var(--tl-ink-faint);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}
body[data-dsh-tianlight] .tl-font-preview {
	display: flex;
	flex-direction: column;
	gap: 3px;
	padding: 8px 10px;
	border-radius: 10px;
	border: 0.5px dashed var(--tl-line-strong);
	background: color-mix(in srgb, var(--tl-glass-fill) 65%, transparent);
	color: var(--tl-ink);
}
body[data-dsh-tianlight] .tl-font-preview-line {
	line-height: 1.35;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}
body[data-dsh-tianlight] .tl-font-preview-note {
	font-size: 10px;
	line-height: 1.35;
	color: var(--tl-ink-faint);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}
body[data-dsh-tianlight] .tl-font-section {
	display: flex;
	flex-direction: column;
	gap: 9px;
	padding: 8px 10px;
	border-radius: 12px;
	border: 0.5px solid var(--tl-line-strong);
	background: color-mix(in srgb, var(--tl-glass-fill) 55%, transparent);
}
body[data-dsh-tianlight] .tl-font-section-title {
	font-size: 10px;
	font-weight: 600;
	letter-spacing: 0.12em;
	color: var(--tl-ink-faint);
}
body[data-dsh-tianlight] .tl-font-title {
	font-size: 13px;
	font-weight: 600;
	letter-spacing: 0.06em;
}
body[data-dsh-tianlight] .tl-font-head {
	position: sticky;
	top: 0;
	z-index: 1;
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 10px;
	padding-bottom: 6px;
	background: var(--tl-panel-fill);
	cursor: grab;
	user-select: none;
	touch-action: none;
}
body[data-dsh-tianlight] [data-tl-dragging] {
	user-select: none;
}
body[data-dsh-tianlight] [data-tl-dragging] .tl-font-head {
	cursor: grabbing;
}
body[data-dsh-tianlight] .tl-font-close {
	width: 22px;
	height: 22px;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	border-radius: 8px;
	border: 0.5px solid transparent;
	background: transparent;
	color: var(--tl-ink-soft);
	font-size: 15px;
	line-height: 1;
	cursor: pointer;
}
body[data-dsh-tianlight] .tl-font-close:hover {
	background: var(--tl-accent-soft);
	border-color: var(--tl-line-strong);
	color: var(--tl-ink);
}
body[data-dsh-tianlight] .tl-font-row {
	display: flex;
	flex-direction: column;
	gap: 7px;
}
body[data-dsh-tianlight] .tl-font-label {
	font-size: 12px;
	color: var(--tl-ink-soft);
}
body[data-dsh-tianlight] .tl-font-slider {
	display: flex;
	align-items: center;
	gap: 10px;
}
body[data-dsh-tianlight] .tl-font-range {
	-webkit-appearance: none;
	appearance: none;
	flex: 1;
	min-width: 0;
	height: 10px;
	border-radius: 999px;
	border: 0.5px solid var(--tl-glass-line);
	/* Glass track: a bright top bevel and a soft bottom shade read as a curved tube. */
	box-shadow:
		inset 0 1px 2px rgba(255, 255, 255, 0.55),
		inset 0 -1px 3px rgba(28, 66, 116, 0.20);
	cursor: pointer;
	outline: none;
}
body[data-dsh-tianlight][data-ds-dark-theme] .tl-font-range {
	box-shadow:
		inset 0 1px 2px rgba(255, 255, 255, 0.22),
		inset 0 -1px 3px rgba(0, 0, 0, 0.42);
}
body[data-dsh-tianlight] .tl-font-range::-webkit-slider-thumb {
	-webkit-appearance: none;
	appearance: none;
	width: 18px;
	height: 18px;
	border-radius: 50%;
	border: 0.5px solid rgba(255, 255, 255, 0.92);
	/* Highlight radial over a gradient body: a polished glass bead, not a flat dot. */
	background:
		radial-gradient(circle at 32% 26%, rgba(255, 255, 255, 0.98) 0%, rgba(255, 255, 255, 0.34) 40%, transparent 62%),
		linear-gradient(150deg, color-mix(in srgb, var(--tl-accent) 72%, #ffffff), var(--tl-accent));
	box-shadow:
		0 2px 8px rgba(18, 58, 108, 0.30),
		0 0 0 3px color-mix(in srgb, var(--tl-accent) 18%, transparent),
		inset 0 -1px 2px rgba(10, 40, 80, 0.28);
	cursor: grab;
	transition: box-shadow 0.18s ease, transform 0.18s ease;
}
body[data-dsh-tianlight][data-ds-dark-theme] .tl-font-range::-webkit-slider-thumb {
	border-color: rgba(210, 232, 255, 0.55);
	box-shadow:
		0 2px 10px rgba(0, 0, 0, 0.55),
		0 0 0 3px color-mix(in srgb, var(--tl-accent) 24%, transparent),
		inset 0 -1px 2px rgba(0, 0, 0, 0.40);
}
body[data-dsh-tianlight] .tl-font-range:active::-webkit-slider-thumb {
	cursor: grabbing;
	transform: scale(1.08);
	box-shadow:
		0 3px 14px rgba(18, 58, 108, 0.36),
		0 0 0 5px color-mix(in srgb, var(--tl-accent) 22%, transparent),
		inset 0 -1px 2px rgba(10, 40, 80, 0.28);
}
body[data-dsh-tianlight] .tl-font-range:focus-visible {
	box-shadow:
		inset 0 1px 2px rgba(255, 255, 255, 0.55),
		0 0 0 3px color-mix(in srgb, var(--tl-accent) 28%, transparent);
}
body[data-dsh-tianlight] .tl-font-range::-moz-range-thumb {
	width: 18px;
	height: 18px;
	border-radius: 50%;
	border: 0.5px solid rgba(255, 255, 255, 0.85);
	background: linear-gradient(150deg, color-mix(in srgb, var(--tl-accent) 72%, #ffffff), var(--tl-accent));
	box-shadow: 0 2px 8px rgba(18, 58, 108, 0.30);
	cursor: grab;
}
body[data-dsh-tianlight] .tl-font-value {
	min-width: 46px;
	text-align: right;
	font-size: 12px;
	font-variant-numeric: tabular-nums;
	color: var(--tl-ink);
}
body[data-dsh-tianlight] .tl-font-reset {
	margin-top: 2px;
	padding: 6px 0;
	border-radius: 10px;
	border: 0.5px solid var(--tl-line-strong);
	background: transparent;
	color: var(--tl-ink-soft);
	font-size: 12px;
	cursor: pointer;
}
body[data-dsh-tianlight] .tl-font-reset:hover {
	background: var(--tl-accent-soft);
	color: var(--tl-ink);
}
body[data-dsh-tianlight] .tl-font-options {
	display: flex;
	flex-wrap: wrap;
	gap: 6px;
}
body[data-dsh-tianlight] .tl-font-option {
	padding: 4px 12px;
	border-radius: 999px;
	border: 0.5px solid var(--tl-line-strong);
	background: transparent;
	color: var(--tl-ink-soft);
	font-size: 12px;
	line-height: 1.4;
	cursor: pointer;
}
body[data-dsh-tianlight] .tl-font-option[data-active] {
	background: var(--tl-accent-soft);
	border-color: var(--tl-accent);
	color: var(--tl-ink);
}
body[data-dsh-tianlight] .tl-font-option:disabled {
	opacity: 0.5;
	cursor: default;
}
body[data-dsh-tianlight] .tl-font-option[data-tone="warn"] {
	border-color: color-mix(in srgb, #e8b45a 55%, var(--tl-line-strong));
	color: var(--tl-ink);
}
body[data-dsh-tianlight] .tl-font-option[data-tone="alert"] {
	border-color: color-mix(in srgb, #e8776b 55%, var(--tl-line-strong));
	color: var(--tl-ink);
}
body[data-dsh-tianlight] [data-tl-wall] button:focus-visible,
body[data-dsh-tianlight] [data-tl-wall] summary:focus-visible,
body[data-dsh-tianlight] [data-tl-wall] input:focus-visible,
body[data-dsh-tianlight] [data-tl-wall] textarea:focus-visible,
body[data-dsh-tianlight] [data-tl-wall] select:focus-visible,
body[data-dsh-tianlight] [data-tl-font-panel] button:focus-visible,
body[data-dsh-tianlight] [data-tl-font-panel] input:focus-visible {
	outline: 2px solid var(--tl-accent);
	outline-offset: 2px;
}
body[data-dsh-tianlight] .tl-font-trigger {
	flex: none;
	min-width: 28px;
	height: 26px;
	padding: 0 8px;
	border-radius: 999px;
	border: 0.5px solid var(--tl-line-strong);
	background: transparent;
	color: var(--tl-ink-soft);
	font-size: 12px;
	line-height: 1;
	cursor: pointer;
}
body[data-dsh-tianlight] .tl-font-trigger:hover {
	background: var(--tl-accent-soft);
	color: var(--tl-ink);
}

/* ---- bridge-stamped surfaces ----
   The selector bridge stamps a SMALL, semantic set of product nodes: the composer
   card, the legacy settings panel and the outermost message bubble / floating
   menu. The full visual recipes for composer/settings/sidebar live in the sections
   above; only surfaces that need a different treatment than those recipes are
   listed here. Never add a rule that relies on a build hash here. */

/* Message bubbles: fill + hairline only, no live blur. A transcript can hold dozens
   of bubbles stacked over the playing video; a backdrop-filter per bubble would
   re-composite the wallpaper behind every one of them on each frame. */
body[data-dsh-tianlight] [data-tl-bubble] {
	background: var(--tl-glass-fill) !important;
	border: 0.5px solid var(--tl-glass-line);
}

/* Floating menus / popovers: one translucent panel fill is enough. The bridge stamps
   only the outermost menu surface (the menu anchor root is deliberately excluded),
   so this costs one compositor layer per open menu, not one per menu row. */
body[data-dsh-tianlight] [data-tl-menu] {
	background: var(--tl-panel-fill) !important;
	border: 0.5px solid var(--tl-glass-line);
	-webkit-backdrop-filter: blur(var(--tl-glass-blur)) saturate(1.2);
	backdrop-filter: blur(var(--tl-glass-blur)) saturate(1.2);
}

/* ---- light reflow: rhythm, radii, surfaces ---- */
body[data-dsh-tianlight] ::-webkit-scrollbar {
	width: 10px;
	height: 10px;
}
body[data-dsh-tianlight] ::-webkit-scrollbar-track {
	background: transparent;
}
body[data-dsh-tianlight] ::-webkit-scrollbar-thumb {
	background: var(--tl-line-strong);
	border: 3px solid transparent;
	border-radius: 999px;
	background-clip: padding-box;
}
body[data-dsh-tianlight] ::-webkit-scrollbar-thumb:hover {
	background: var(--tl-accent);
	background-clip: padding-box;
}
body[data-dsh-tianlight] ::selection {
	background: var(--tl-accent-soft);
	color: var(--tl-ink);
}
body[data-dsh-tianlight] :focus-visible {
	outline-color: var(--tl-accent) !important;
}

/* ---- companion: a mint chibi cat that lives on top of the workbench ---- */
body[data-dsh-tianlight] [data-tl-cat] {
	position: fixed;
	z-index: 95;
	width: 150px;
	height: 86px;
	touch-action: none;
	cursor: grab;
	user-select: none;
	-webkit-user-select: none;
	will-change: transform;
	filter: drop-shadow(0 10px 18px rgba(8, 26, 44, 0.28));
}
body[data-dsh-tianlight] [data-tl-cat][data-tl-dragging] {
	cursor: grabbing;
	filter: drop-shadow(0 16px 26px rgba(8, 26, 44, 0.38));
}
body[data-dsh-tianlight] [data-tl-cat] > [data-tl-cat-body] {
	position: absolute;
	inset: 0;
	display: grid;
	place-items: center;
	transform-origin: 50% 92%;
	transition: transform 220ms cubic-bezier(0.34, 1.56, 0.64, 1);
	animation: tl-breathe 4.2s ease-in-out infinite;
}
body[data-dsh-tianlight] [data-tl-cat] > [data-tl-cat-body] > img {
	width: 100%;
	height: 100%;
	object-fit: contain;
	pointer-events: none;
	-webkit-user-drag: none;
}
body[data-dsh-tianlight] [data-tl-cat][data-tl-near] > [data-tl-cat-body] {
	transform: rotate(calc(var(--tl-look, 0) * 7deg)) translateY(-2px) scale(1.04);
}
body[data-dsh-tianlight] [data-tl-cat][data-tl-dragging] > [data-tl-cat-body] {
	transform: scale(1.09) rotate(calc(var(--tl-look, 0) * 3deg));
	animation-play-state: paused;
}
body[data-dsh-tianlight] [data-tl-cat][data-tl-sleeping] > [data-tl-cat-body] {
	animation: tl-doze 3.4s ease-in-out infinite;
	transform: rotate(-4deg) scale(0.98);
	opacity: 0.92;
}
body[data-dsh-tianlight] [data-tl-cat][data-tl-sleeping]::after {
	content: "z z Z";
	position: absolute;
	top: -6px;
	right: -6px;
	font: 600 12px/1 var(--ds-font-family, system-ui);
	color: var(--tl-accent);
	opacity: 0.85;
	animation: tl-float 2.6s ease-in-out infinite;
}
body[data-dsh-tianlight] [data-tl-cat][data-tl-near]::before {
	content: "";
	position: absolute;
	inset: 8px;
	border-radius: 50%;
	background: radial-gradient(circle, var(--tl-glow) 0%, transparent 70%);
	opacity: 0.5;
	filter: blur(6px);
}
body[data-dsh-tianlight] [data-tl-cat] > [data-tl-say] {
	position: absolute;
	bottom: calc(100% + 10px);
	left: 50%;
	transform: translateX(-50%) translateY(4px);
	max-width: 190px;
	width: max-content;
	padding: 7px 11px;
	border-radius: 14px;
	background: var(--tl-overlay);
	color: var(--tl-ink);
	font: 500 12px/1.45 var(--ds-font-family, system-ui);
	text-align: center;
	white-space: pre-wrap;
	box-shadow: 0 6px 20px rgba(8, 26, 44, 0.18);
	border: 0.5px solid var(--tl-line);
	opacity: 0;
	pointer-events: none;
	transition: opacity 180ms ease, transform 180ms ease;
}
body[data-dsh-tianlight] [data-tl-cat] > [data-tl-say][data-tl-show] {
	opacity: 1;
	transform: translateX(-50%) translateY(0);
}
/* v0.7.0 duty bubble: an action-capable sibling of the say bubble. It is owned by
   the duty channel (role pack adapter) and never overwrites ordinary pet speech. */
body[data-dsh-tianlight] [data-tl-cat] > [data-tl-duty] {
	position: absolute;
	bottom: calc(100% + 12px);
	left: 50%;
	transform: translateX(-50%) translateY(4px);
	width: max-content;
	max-width: 240px;
	padding: 9px 11px 8px;
	border-radius: 14px;
	background: var(--tl-overlay);
	color: var(--tl-ink);
	font: 500 12px/1.45 var(--ds-font-family, system-ui);
	box-shadow: 0 10px 28px rgba(8, 26, 44, 0.24);
	border: 0.5px solid var(--tl-line);
	opacity: 0;
	pointer-events: none;
	z-index: 2;
	transition: opacity 180ms ease, transform 180ms ease;
}
body[data-dsh-tianlight] [data-tl-cat] > [data-tl-duty][data-tl-show] {
	opacity: 1;
	transform: translateX(-50%) translateY(0);
	pointer-events: auto;
}
body[data-dsh-tianlight] [data-tl-cat] > [data-tl-duty] > [data-tl-duty-text] {
	white-space: pre-wrap;
}
body[data-dsh-tianlight] [data-tl-cat] > [data-tl-duty] > [data-tl-duty-choices] {
	display: flex;
	flex-wrap: wrap;
	gap: 4px;
	margin-top: 7px;
}
body[data-dsh-tianlight] [data-tl-cat] > [data-tl-duty] > [data-tl-duty-choices][hidden] {
	display: none;
}
body[data-dsh-tianlight] [data-tl-cat] > [data-tl-duty] button {
	appearance: none;
	border: 0.5px solid var(--tl-line);
	background: var(--tl-accent-soft);
	color: var(--tl-ink);
	font: 600 11px/1 var(--ds-font-family, system-ui);
	padding: 6px 9px;
	border-radius: 999px;
	cursor: pointer;
}
body[data-dsh-tianlight] [data-tl-cat] > [data-tl-duty] button:hover {
	background: var(--tl-accent);
	color: #fff;
}
body[data-dsh-tianlight] [data-tl-cat] > [data-tl-duty] button:focus-visible {
	outline: 2px solid var(--tl-accent);
	outline-offset: 2px;
}
body[data-dsh-tianlight] [data-tl-cat] > [data-tl-catmenu] {
	position: absolute;
	top: calc(100% + 8px);
	left: 50%;
	transform: translateX(-50%) translateY(-4px);
	display: flex;
	gap: 4px;
	padding: 5px;
	border-radius: 999px;
	background: var(--tl-overlay);
	border: 0.5px solid var(--tl-line);
	box-shadow: 0 10px 26px rgba(8, 26, 44, 0.22);
	opacity: 0;
	pointer-events: none;
	transition: opacity 160ms ease, transform 160ms ease;
}
body[data-dsh-tianlight] [data-tl-cat] > [data-tl-catmenu][data-tl-show] {
	opacity: 1;
	transform: translateX(-50%) translateY(0);
	pointer-events: auto;
}
body[data-dsh-tianlight] [data-tl-cat] > [data-tl-catmenu] > button {
	appearance: none;
	border: 0;
	background: transparent;
	color: var(--tl-ink-soft);
	font: 500 12px/1 var(--ds-font-family, system-ui);
	padding: 6px 9px;
	border-radius: 999px;
	cursor: pointer;
	white-space: nowrap;
}
body[data-dsh-tianlight] [data-tl-cat] > [data-tl-catmenu] > button:hover {
	background: var(--tl-accent-soft);
	color: var(--tl-ink);
}

@keyframes tl-breathe {
	0%, 100% { transform: scale(1); }
	50% { transform: scale(1.022); }
}
@keyframes tl-doze {
	0%, 100% { transform: rotate(-4deg) scale(0.98); }
	50% { transform: rotate(-2deg) scale(0.955); }
}
@keyframes tl-float {
	0%, 100% { transform: translateY(0); opacity: 0.5; }
	50% { transform: translateY(-7px); opacity: 0.9; }
}

@media (prefers-reduced-motion: reduce) {
	body[data-dsh-tianlight] [data-tl-cat] > [data-tl-cat-body],
	body[data-dsh-tianlight] [data-tl-cat][data-tl-sleeping] > [data-tl-cat-body],
	body[data-dsh-tianlight] [data-tl-cat][data-tl-sleeping]::after {
		animation: none !important;
	}
}

/* ---- low power: freeze decorative animation while the wallpaper is parked ----
   The supervisor pauses the moving wallpaper and its rail mirror; these rules keep
   the remaining CSS animation off the compositor so the saving is real. */
body[data-dsh-tianlight][data-tl-lowpower] [data-tl-cat] > [data-tl-cat-body],
body[data-dsh-tianlight][data-tl-lowpower] [data-tl-cat][data-tl-sleeping] > [data-tl-cat-body] {
	animation-play-state: paused;
}
body[data-dsh-tianlight][data-tl-lowpower] [data-tl-cat][data-tl-sleeping]::after {
	animation: none;
}

/* ---- v1.0.0 replaceable pet media: still image OR muted looping video ---- */
body[data-dsh-tianlight] [data-tl-cat] > [data-tl-cat-body] > video {
	width: 100%;
	height: 100%;
	object-fit: contain;
	pointer-events: none;
	background: transparent;
	-webkit-user-drag: none;
}
body[data-dsh-tianlight] [data-tl-cat][data-tl-cat-media="video"] > [data-tl-cat-body] {
	animation: none;
	transform-origin: 50% 92%;
}
body[data-dsh-tianlight] [data-tl-cat][data-tl-cat-media="video"][data-tl-near] > [data-tl-cat-body] {
	transform: translateY(-2px) scale(1.04);
}
/* 6 menu entries since v1.0.0 (mute / focus added): allow a second row instead of
   clipping, while keeping the single-row pill shape for the original four. */
body[data-dsh-tianlight] [data-tl-cat] > [data-tl-catmenu] {
	flex-wrap: wrap;
	width: max-content;
	max-width: 320px;
	border-radius: 16px;
	justify-content: center;
}

/* ---- v1.0.0 liquid glass depth: off / frosted / soft / real ----
   The treatment lives on the scene layer (behind the product UI): a specular
   gradient + backdrop blur/saturation over the wallpaper. "off" adds nothing, so
   the v0.7 look and the energy profile are unchanged by default. */
body[data-dsh-tianlight] {
	--tl-liquid-blur: 0px;
	--tl-liquid-sat: 1;
	--tl-liquid-hi: 0;
	--tl-liquid-lo: 0;
	--tl-liquid-noise: 0;
	--tl-liquid-sheen: 0;
}
body[data-dsh-tianlight][data-tl-glass-effective="soft"] {
	--tl-liquid-blur: 3px;
	--tl-liquid-sat: 1.18;
	--tl-liquid-hi: 0.14;
	--tl-liquid-lo: 0.08;
	--tl-liquid-noise: 0;
	--tl-liquid-sheen: 0.35;
}
body[data-dsh-tianlight][data-tl-glass-effective="real"] {
	--tl-liquid-blur: 6px;
	--tl-liquid-sat: 1.42;
	--tl-liquid-hi: 0.28;
	--tl-liquid-lo: 0.16;
	--tl-liquid-noise: 0;
	--tl-liquid-sheen: 1;
}
body[data-dsh-tianlight][data-tl-glass-effective="frosted"] {
	--tl-liquid-blur: 14px;
	--tl-liquid-sat: 0.92;
	--tl-liquid-hi: 0.34;
	--tl-liquid-lo: 0.05;
	--tl-liquid-noise: 0.12;
	--tl-liquid-sheen: 0.1;
}
body[data-dsh-tianlight] [data-tl-scene]::after {
	content: "";
	position: absolute;
	inset: -2%;
	pointer-events: none;
	z-index: 2;
	opacity: 1;
	background-image:
		linear-gradient(115deg, rgba(255, 255, 255, var(--tl-liquid-hi)) 0%, rgba(255, 255, 255, 0) 34%, rgba(255, 255, 255, 0) 64%, rgba(255, 255, 255, var(--tl-liquid-lo)) 100%),
		radial-gradient(120% 80% at 16% 6%, rgba(255, 255, 255, var(--tl-liquid-hi)) 0%, rgba(255, 255, 255, 0) 58%);
	-webkit-backdrop-filter: blur(var(--tl-liquid-blur)) saturate(var(--tl-liquid-sat));
	backdrop-filter: blur(var(--tl-liquid-blur)) saturate(var(--tl-liquid-sat));
}
body[data-dsh-tianlight][data-tl-glass-effective="off"] [data-tl-scene]::after {
	display: none;
}
body[data-dsh-tianlight][data-tl-lowpower] [data-tl-scene]::after {
	animation: none !important;
	-webkit-backdrop-filter: blur(2px) saturate(1.04);
	backdrop-filter: blur(2px) saturate(1.04);
}
@keyframes tl-liquid-sheen {
	0% { transform: translate3d(-1.5%, 0, 0); }
	100% { transform: translate3d(1.5%, 0, 0); }
}
@media (prefers-reduced-motion: no-preference) {
	body[data-dsh-tianlight][data-tl-glass-effective="real"] [data-tl-scene]::after {
		animation: tl-liquid-sheen 22s ease-in-out infinite alternate;
	}
}

/* ---- v1.0.0 role settings page (slots: settings.section "tianlight-role") ---- */
body[data-dsh-tianlight] .tl-role-page {
	display: flex;
	flex-direction: column;
	gap: 14px;
	padding: 4px 2px 24px;
	color: var(--tl-ink);
}
body[data-dsh-tianlight] .tl-role-page h3 {
	margin: 0;
	font: 600 15px/1.35 var(--ds-font-family, system-ui);
}
body[data-dsh-tianlight] .tl-role-page p {
	margin: 0;
	font: 400 12px/1.5 var(--ds-font-family, system-ui);
	color: var(--tl-ink-soft);
}
body[data-dsh-tianlight] .tl-role-card {
	display: flex;
	flex-direction: column;
	gap: 10px;
	padding: 14px 16px;
	border-radius: 16px;
	background: var(--tl-panel-fill, var(--tl-glass-fill));
	border: 0.5px solid var(--tl-glass-line);
}
body[data-dsh-tianlight] .tl-role-row {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 8px;
	font: 500 12px/1.4 var(--ds-font-family, system-ui);
}
body[data-dsh-tianlight] .tl-role-row > label {
	min-width: 110px;
	color: var(--tl-ink-soft);
}
body[data-dsh-tianlight] .tl-role-page select,
body[data-dsh-tianlight] .tl-role-page input[type="number"],
body[data-dsh-tianlight] .tl-role-page input[type="time"] {
	appearance: auto;
	background: var(--tl-glass-fill);
	color: var(--tl-ink);
	border: 0.5px solid var(--tl-line-strong);
	border-radius: 9px;
	padding: 5px 8px;
	font: 500 12px/1.4 var(--ds-font-family, system-ui);
}
body[data-dsh-tianlight] .tl-role-page input[type="number"] {
	width: 66px;
}
body[data-dsh-tianlight] .tl-role-page button {
	appearance: none;
	cursor: pointer;
	border: 0.5px solid var(--tl-line-strong);
	border-radius: 999px;
	padding: 6px 12px;
	background: var(--tl-accent-soft);
	color: var(--tl-ink);
	font: 600 12px/1 var(--ds-font-family, system-ui);
}
body[data-dsh-tianlight] .tl-role-page button:hover {
	background: var(--tl-accent);
	color: #fff;
}
body[data-dsh-tianlight] .tl-role-page button[data-active] {
	background: var(--tl-accent);
	color: #fff;
}
body[data-dsh-tianlight] .tl-role-page button:disabled {
	opacity: 0.5;
	cursor: default;
}
body[data-dsh-tianlight] .tl-role-choices {
	display: flex;
	flex-wrap: wrap;
	gap: 6px;
}
body[data-dsh-tianlight] .tl-role-note {
	font: 400 11px/1.5 var(--ds-font-family, system-ui);
	color: var(--tl-ink-faint);
}
body[data-dsh-tianlight] .tl-role-stats {
	display: flex;
	flex-wrap: wrap;
	gap: 6px 14px;
	font: 500 12px/1.4 var(--ds-font-family, system-ui);
	color: var(--tl-ink-soft);
}
body[data-dsh-tianlight] .tl-role-stats b {
	color: var(--tl-ink);
	font-weight: 600;
}
`;

		/** Injected once per page; every rule is scoped to the skin's body attribute. */
		function installStyles() {
			if (typeof document === "undefined") return () => {};
			const existing = document.querySelector(
				"style[data-plugin-css=" + JSON.stringify(CSS_TAG_ID) + "]",
			);
			if (existing !== null) return () => {};
			const tag = document.createElement("style");
			tag.dataset.plugin = PLUGIN_ID;
			tag.dataset.pluginCss = CSS_TAG_ID;
			// The base sheet plus every feature fragment's registered block (v0.5.0).
			// One <style> keeps teardown and the audit's scope checks unambiguous.
			tag.textContent = CSS + "\n" + tl5CssText();
			document.head.appendChild(tag);
			return () => {
				tag.remove();
			};
		}
		//#endregion

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
		const transitionSubscribers = new Set();
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
		const transitionController = {
			key: TRANSITION_KEY,
			presets: TRANSITION_PRESETS.slice(),
			defaults: () => ({ ...TRANSITION_DEFAULTS }),
			read: readTransitionState,
			apply: (patch) => {
				const base = readTransitionState();
				const next = normalizeTransition({ ...base, ...(patch === null || typeof patch !== "object" ? {} : patch) }, base);
				try {
					globalThis.localStorage?.setItem(TRANSITION_KEY, JSON.stringify(next));
				} catch {
					// persistence is optional; this session still uses the preset
				}
				// Mirror into the effects panel so two UIs can never disagree.
				try {
					if (typeof effectsController !== "undefined" && effectsController !== null && typeof effectsController.apply === "function") {
						effectsController.apply({ transition: next.preset, transitionMs: next.durationMs });
					}
				} catch {
					// an absent effects controller is fine
				}
				for (const listener of [...transitionSubscribers]) {
					try {
						listener({ ...next });
					} catch (error) {
						note("transition:subscriber", error);
					}
				}
				tl5Diag("engine", { transition: next });
				return next;
			},
			subscribe: (listener) => {
				if (typeof listener !== "function") return () => {};
				transitionSubscribers.add(listener);
				listener(readTransitionState());
				return () => {
					transitionSubscribers.delete(listener);
				};
			},
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
		//#region ambient effects
		/**
		 * B 期交互表现（由 effects-context 工作流实现）：
		 *
		 *   B1 鼠标视差   场景层随指针轻微位移，幅度可调，默认关；低功耗/掉帧自动禁用。
		 *   B2 点击特效   点击处水波纹/粒子，单层 canvas、帧率上限 30、可关、掉帧自动关。
		 *   B3 氛围层     雨/雪/光斑，低帧率、省电时冻结、与叠加层互不覆盖。
		 *   B4 转场       由 31-engine-extra.js 实现（需要场景内部状态），本文件只保存
		 *                 `transition` / `transitionMs` 两个设置键并把它们发布到诊断。
		 *
		 * 硬约束：不做全屏 60Hz canvas；B1/B2/B3 共享一个总开关、一个性能预算
		 * （EFFECT_BUDGET）、一条低功耗冻结路径。所有 DOM 都挂在 body 上并带
		 * `data-tl-fx-*` 标记，模块关闭时 disposer 必须全部移除。
		 *
		 * 单一渲染层：所有像素动画（B2+B3）共用一张 `[data-tl-fx]` canvas；B1 不画
		 * canvas，而是给 `[data-tl-scene]` 写 CSS transform。任何时刻最多一个 rAF，
		 * 空闲（开关关 / 全部静态 / 冻结）时一个 rAF 都不留。
		 */
		const EFFECTS_KEY = "tianlight.effects";
		const EFFECTS_DEFAULTS = {
			enabled: true,
			parallax: false,
			parallaxStrength: 0.4,
			click: false,
			clickStyle: "ripple",
			ambience: "none",
			ambienceDensity: 0.5,
			transition: "fade",
			transitionMs: 600,
			budget: "auto",
		};
		const effectsState = { ...EFFECTS_DEFAULTS };
		const effectsSubscribers = new Set();

		function readEffectsSettings() {
			try {
				const raw = globalThis.localStorage?.getItem(EFFECTS_KEY);
				if (raw === undefined || raw === null || raw === "") return { ...EFFECTS_DEFAULTS };
				const parsed = JSON.parse(raw);
				const model = { ...EFFECTS_DEFAULTS };
				if (parsed !== null && typeof parsed === "object") {
					for (const key of Object.keys(EFFECTS_DEFAULTS)) {
						if (parsed[key] !== undefined) model[key] = parsed[key];
					}
				}
				return model;
			} catch {
				return { ...EFFECTS_DEFAULTS };
			}
		}

		const effectsController = {
			read: () => ({ ...effectsState }),
			apply: (patch) => {
				const next = { ...effectsState, ...(patch === null || typeof patch !== "object" ? {} : patch) };
				Object.assign(effectsState, next);
				try {
					globalThis.localStorage?.setItem(EFFECTS_KEY, JSON.stringify(effectsState));
				} catch {
					// optional persistence
				}
				for (const listener of [...effectsSubscribers]) {
					try {
						listener({ ...effectsState });
					} catch (error) {
						note("effects:subscriber", error);
					}
				}
				return { ...effectsState };
			},
			subscribe: (listener) => {
				if (typeof listener !== "function") return () => {};
				effectsSubscribers.add(listener);
				return () => effectsSubscribers.delete(listener);
			},
			state: () => ({ ...effectsState }),
		};
		Object.assign(effectsState, readEffectsSettings());

		/**
		 * v0.5.0 宿主设置接管：平台层在 apply() 里先 await 宿主配置（可能来自另一个
		 * 浏览器），之后才运行本安装器，所以 bundle 求值时的读取可能已过期。安装器
		 * 在接线任何监听器/rAF 之前重新读一次持久化模型，让被接管的
		 * tianlight.effects（含总开关 enabled）立即生效，无需刷新页面。
		 * 这是纯读取；只有值真的变化时才通知订阅者，不写回存储。
		 */
		function refreshEffectsState() {
			const stored = readEffectsSettings();
			let changed = false;
			for (const key of Object.keys(EFFECTS_DEFAULTS)) {
				if (stored[key] !== effectsState[key]) {
					changed = true;
					break;
				}
			}
			Object.assign(effectsState, stored);
			if (changed === false) return;
			for (const listener of [...effectsSubscribers]) {
				try {
					listener({ ...effectsState });
				} catch (error) {
					note("effects:subscriber", error);
				}
			}
		}

		/**
		 * B 期共享常量。一个预算对象同时约束 B1/B2/B3：帧率上限、并发上限、以及
		 * “这一帧太贵”的阈值。自动降级只改本层的渲染量，不改用户的设置值。
		 */
		const EFFECTS_AMBIENCE_TYPES = ["none", "rain", "snow", "spots"];
		const EFFECTS_CLICK_STYLES = ["ripple", "spark"];
		const EFFECTS_TRANSITIONS = ["fade", "slide", "zoom", "dissolve"];
		const EFFECTS_PARALLAX_MAX = 12;
		const EFFECT_BUDGET = {
			clickFps: 30,
			ambienceFps: 24,
			maxClickEffects: 40,
			clickLifeMs: 700,
			frameCostMs: 6,
			slowFrameMs: 12,
			degradeMs: 14,
			degradeForMs: 1600,
			sceneFpsFloor: 18,
			retryMs: 15000,
			ambienceBase: { rain: 150, snow: 110, spots: 40 },
		};

		registerTl5Strings({
			zh: {
				"fx.idle": "空闲",
				"fx.master": "总开关",
				"fx.masterHint": "关闭后 B1/B2/B3 全部停止，连渲染层一起隐藏。",
				"fx.parallax": "鼠标视差",
				"fx.parallaxHint": "壁纸随指针做轻微位移（最多约 12px × 幅度）。",
				"fx.strength": "幅度",
				"fx.click": "点击特效",
				"fx.clickHint": "点击处水波纹或粒子；壁纸面板与输入框内不触发。",
				"fx.style": "样式",
				"fx.ripple": "水波纹",
				"fx.spark": "粒子",
				"fx.ambience": "氛围层",
				"fx.ambienceHint": "低帧率雨/雪/光斑；省电或系统减少动效时冻结。",
				"fx.none": "无",
				"fx.rain": "雨",
				"fx.snow": "雪",
				"fx.spots": "光斑",
				"fx.density": "密度",
				"fx.transition": "转场",
				"fx.transitionHint": "壁纸切换的过渡预设与时长（由壁纸引擎读取）。",
				"fx.fade": "淡入淡出",
				"fx.slide": "滑动",
				"fx.zoom": "缩放",
				"fx.dissolve": "溶解",
				"fx.duration": "时长",
				"fx.budget": "渲染预算",
				"fx.budgetValue": "运行 {active} 项 · {fps}fps · 预算 {budget}",
				"fx.frozen": "冻结：{reason}",
				"fx.frozenLowPower": "省电模式",
				"fx.frozenReducedMotion": "系统减少动效",
				"fx.frozenSceneFps": "壁纸帧率过低",
				"fx.frozenDisabled": "总开关已关闭",
				"fx.clickAutoOff": "点击特效已因帧开销自动关闭（{reason}）",
				"fx.frameCost": "帧开销约 {ms}ms",
			},
			en: {
				"fx.idle": "Idle",
				"fx.master": "Master switch",
				"fx.masterHint": "Turning this off stops B1/B2/B3 and hides the render layer.",
				"fx.parallax": "Cursor parallax",
				"fx.parallaxHint": "The wallpaper shifts slightly with the pointer (up to ~12px × strength).",
				"fx.strength": "Strength",
				"fx.click": "Click effects",
				"fx.clickHint": "A ripple or spark at the click; never inside the wallpaper panel or inputs.",
				"fx.style": "Style",
				"fx.ripple": "Ripple",
				"fx.spark": "Spark",
				"fx.ambience": "Ambiance",
				"fx.ambienceHint": "Low-fps rain/snow/spots; frozen under low power or reduced motion.",
				"fx.none": "None",
				"fx.rain": "Rain",
				"fx.snow": "Snow",
				"fx.spots": "Spots",
				"fx.density": "Density",
				"fx.transition": "Transition",
				"fx.transitionHint": "Transition preset and duration used by the wallpaper engine.",
				"fx.fade": "Fade",
				"fx.slide": "Slide",
				"fx.zoom": "Zoom",
				"fx.dissolve": "Dissolve",
				"fx.duration": "Duration",
				"fx.budget": "Render budget",
				"fx.budgetValue": "{active} running · {fps}fps · budget {budget}",
				"fx.frozen": "Frozen: {reason}",
				"fx.frozenLowPower": "low power",
				"fx.frozenReducedMotion": "reduced motion",
				"fx.frozenSceneFps": "wallpaper fps too low",
				"fx.frozenDisabled": "master switch off",
				"fx.clickAutoOff": "Click effects were auto-disabled by frame cost ({reason})",
				"fx.frameCost": "Frame cost ~{ms}ms",
			},
		});

		function EffectsPanelSection() {
			const i18n = useTl5I18n();
			const t = i18n.t;
			const [state, setState] = React.useState(() => effectsController.state());
			const [renderMetrics, setRenderMetrics] = React.useState(() => ({ ...TL5_METRICS.effects }));
			React.useEffect(() => effectsController.subscribe((next) => setState(next)), []);
			React.useEffect(
				() =>
					subscribeTl5Metrics((metrics) => {
						const next = metrics.effects;
						if (next === null || typeof next !== "object") return;
						setRenderMetrics((current) =>
							current.active === next.active &&
							current.fps === next.fps &&
							current.budget === next.budget &&
							current.frozenReason === next.frozenReason &&
							current.clickAutoOff === next.clickAutoOff
								? current
								: { ...next },
						);
					}),
				[],
			);
			const update = (patch) => effectsController.apply(patch);
			const toggleButton = (label, active, onClick, disabled) =>
				React.createElement(
					"button",
					{
						type: "button",
						className: "tl-font-option",
						"data-active": active === true ? "" : undefined,
						disabled: disabled === true,
						onClick,
					},
					label,
				);
			const choices = (values, current, onPick, disabled) =>
				React.createElement(
					"div",
					{ className: "tl-font-options" },
					values.map((value) =>
						React.createElement(
							"button",
							{
								key: value,
								type: "button",
								className: "tl-font-option",
								"data-active": current === value ? "" : undefined,
								disabled: disabled === true,
								onClick: () => onPick(value),
							},
							t("fx." + value),
						),
					),
				);
			const slider = (label, value, min, max, step, onChange, disabled) =>
				React.createElement(
					"label",
					{ className: "tl-wall-slider" },
					React.createElement("span", null, label + " · " + value),
					React.createElement("input", {
						type: "range",
						min,
						max,
						step,
						value,
						disabled: disabled === true,
						onChange: (event) => onChange(Number(event.target.value)),
					}),
				);
			const row = (label, child) =>
				React.createElement(
					"div",
					{ className: "tl-fx-row" },
					React.createElement("span", { className: "tl-wall-label" }, label),
					child,
				);
			const frozenReason = typeof renderMetrics.frozenReason === "string" ? renderMetrics.frozenReason : "";
			const frozenLabel =
				frozenReason === "low-power"
					? t("fx.frozenLowPower")
					: frozenReason === "reduced-motion"
						? t("fx.frozenReducedMotion")
						: frozenReason === "scene-fps"
							? t("fx.frozenSceneFps")
							: frozenReason === "disabled"
								? t("fx.frozenDisabled")
								: "";
			const summaryParts = [];
			if (state.parallax === true) summaryParts.push(t("fx.parallax"));
			if (state.click === true) summaryParts.push(t("fx.click"));
			if (state.ambience !== "none") {
				summaryParts.push(t("fx." + (EFFECTS_AMBIENCE_TYPES.includes(state.ambience) ? state.ambience : "none")));
			}
			const summary =
				state.enabled === false ? t("common.off") : summaryParts.length === 0 ? t("fx.idle") : summaryParts.join(" · ");
			const clickAutoOff = typeof renderMetrics.clickAutoOff === "string" ? renderMetrics.clickAutoOff : "";
			const metricsLine = [
				t("fx.budgetValue", {
					active: renderMetrics.active ?? 0,
					fps: renderMetrics.fps ?? 0,
					budget: renderMetrics.budget ?? state.budget,
				}),
				frozenLabel === "" ? "" : t("fx.frozen", { reason: frozenLabel }),
				clickAutoOff === "" ? "" : t("fx.clickAutoOff", { reason: clickAutoOff }),
				Number.isFinite(renderMetrics.frameCostMs) ? t("fx.frameCost", { ms: Math.round(renderMetrics.frameCostMs) }) : "",
			]
				.filter((line) => line !== "")
				.join("\n");
			const transitionValue = EFFECTS_TRANSITIONS.includes(state.transition) ? state.transition : "fade";
			const duration = Number.isFinite(Number(state.transitionMs)) ? Math.min(1500, Math.max(200, Number(state.transitionMs))) : 600;
			return React.createElement(
				"details",
				{ className: "tl-wall-group", open: false, "data-tl-group": "effects" },
				React.createElement(
					"summary",
					{ className: "tl-wall-group-summary" },
					React.createElement("span", { className: "tl-wall-step" }, "✦"),
					React.createElement("span", { className: "tl-wall-group-title" }, t("section.effects")),
					React.createElement("span", { className: "tl-wall-summary-value" }, summary),
				),
				React.createElement(
					"div",
					{ className: "tl-fx-grid" },
					row(
						t("fx.master"),
						toggleButton(state.enabled === true ? t("common.on") : t("common.off"), state.enabled === true, () =>
							update({ enabled: state.enabled !== true }),
						),
					),
					React.createElement("div", { className: "tl-fx-hint" }, t("fx.masterHint")),
					row(
						t("fx.parallax"),
						toggleButton(state.parallax === true ? t("common.on") : t("common.off"), state.parallax === true, () =>
							update({ parallax: state.parallax !== true }),
						),
					),
					slider(
						t("fx.strength"),
						Number(state.parallaxStrength).toFixed(2),
						0,
						1,
						0.05,
						(value) => update({ parallaxStrength: value }),
						state.enabled !== true || state.parallax !== true,
					),
					React.createElement("div", { className: "tl-fx-hint" }, t("fx.parallaxHint")),
					row(
						t("fx.click"),
						toggleButton(state.click === true ? t("common.on") : t("common.off"), state.click === true, () =>
							update({ click: state.click !== true }),
						),
					),
					React.createElement("div", { className: "tl-fx-hint" }, t("fx.clickHint")),
					row(
						t("fx.style"),
						choices(EFFECTS_CLICK_STYLES, state.clickStyle, (value) => update({ clickStyle: value }), state.enabled !== true || state.click !== true),
					),
					row(t("fx.ambience"), choices(EFFECTS_AMBIENCE_TYPES, state.ambience, (value) => update({ ambience: value }), state.enabled !== true)),
					React.createElement("div", { className: "tl-fx-hint" }, t("fx.ambienceHint")),
					slider(
						t("fx.density"),
						Number(state.ambienceDensity).toFixed(2),
						0,
						1,
						0.05,
						(value) => update({ ambienceDensity: value }),
						state.enabled !== true || state.ambience === "none",
					),
					row(t("fx.transition"), choices(EFFECTS_TRANSITIONS, transitionValue, (value) => update({ transition: value }), false)),
					slider(t("fx.duration"), duration, 200, 1500, 50, (value) => update({ transitionMs: value }), false),
					React.createElement("div", { className: "tl-fx-hint" }, t("fx.transitionHint")),
					React.createElement("div", { className: "tl-fx-readout" }, t("fx.budget") + "\n" + metricsLine),
				),
			);
		}

		if (React !== null) {
			registerTl5PanelSection({ id: "effects", order: 800, title: "section.effects", Component: EffectsPanelSection });
		}

		registerTl5Css(String.raw`
/* ---- v0.5.0 B1/B2/B3: one composited effects plane above the wallpaper ---- */
body[data-dsh-tianlight] [data-tl-fx] {
	position: fixed;
	inset: 0;
	width: 100%;
	height: 100%;
	z-index: 0;
	pointer-events: none;
	contain: paint;
}
body[data-dsh-tianlight] [data-tl-scene][data-tl-parallax] {
	will-change: transform;
}
/* extension panel rows reuse the wallpaper panel's group/label/slider language */
body[data-dsh-tianlight] .tl-fx-grid {
	display: flex;
	flex-direction: column;
	gap: 8px;
}
body[data-dsh-tianlight] .tl-fx-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 8px;
	flex-wrap: wrap;
}
body[data-dsh-tianlight] .tl-fx-hint {
	font-size: 10px;
	line-height: 1.5;
	color: var(--tl-ink-faint);
}
body[data-dsh-tianlight] .tl-fx-readout {
	font-family: var(--ds-font-family-code, monospace);
	font-size: 10px;
	line-height: 1.6;
	color: var(--tl-ink-soft);
	white-space: pre-wrap;
	word-break: break-word;
}
`);

		/**
		 * B1/B2/B3 的唯一安装器。返回幂等 disposer：取消 rAF、断开观察者、
		 * 移除全部 window/document 监听器、恢复场景 inline transform、删除 canvas。
		 *
		 * 低功耗冻结是单一路径：`data-tl-lowpower`（55）或 prefers-reduced-motion
		 * 任意一个为真，本层立即停帧、隐藏 canvas、清空粒子和点击，并发布
		 * tl5Diag("effects", { frozenReason })。恢复由 body 属性观察 + 定时重试
		 * 触发，不轮询、不常驻 rAF。
		 */
		function installEffectsLayer() {
			const body = document.body;
			if (body === null) return () => {};
			// Host settings were adopted in apply() BEFORE this installer runs; refresh the
			// persisted model before wiring anything so host-adopted values apply now.
			refreshEffectsState();

			const canvas = document.createElement("canvas");
			canvas.dataset.tlFx = "";
			canvas.setAttribute("aria-hidden", "true");
			body.appendChild(canvas);
			let ctx = null;
			try {
				ctx = canvas.getContext("2d", { alpha: true });
			} catch {
				ctx = null;
			}
			canvas.hidden = true;

			let alive = true;
			let frameRaf = 0;
			let lastFrameAt = 0;
			let skipNextFrame = false;
			let frameCostEma = 0;
			let slowSince = 0;
			let degradeFactor = 1;
			let lastFrozenReason = "";
			let clickAutoOff = "";
			let retryTimer = 0;
			let sceneFps = 0;
			let lastSceneProbe = 0;
			let measuredFps = 0;
			let frameCount = 0;
			let fpsStart = 0;
			let lastMetricsAt = 0;
			let lastDiagAt = 0;
			let sizeDirty = true;
			let canvasW = 0;
			let canvasH = 0;
			let canvasRatio = 1;

			const clicks = [];
			const particles = [];
			let particleType = "none";

			let targetX = 0;
			let targetY = 0;
			let curX = 0;
			let curY = 0;

			let accentRgb = { r: 127, g: 182, b: 255 };
			let accentReadAt = -10000;

			let pointerMoveBound = false;
			let pointerDownBound = false;

			const getScene = () => document.querySelector("[data-tl-scene]");

			let motionQuery = null;
			let reducedMotion = false;
			try {
				if (typeof globalThis.matchMedia === "function") {
					motionQuery = globalThis.matchMedia("(prefers-reduced-motion: reduce)");
					reducedMotion = motionQuery !== null && motionQuery.matches === true;
				}
			} catch {
				motionQuery = null;
			}

			// ---- freeze decision: one path for B1/B2/B3 ----
			const isLowPowerActive = () => {
				try {
					if (body.hasAttribute("data-tl-lowpower")) return true;
					if (lowPowerController !== null && typeof lowPowerController.state === "function") {
						const snapshot = lowPowerController.state();
						return snapshot !== null && snapshot !== undefined && snapshot.active === true;
					}
				} catch {
					// the supervisor is optional; the body attribute is the contract
				}
				return false;
			};
			const probeSceneFps = (now) => {
				if (now - lastSceneProbe < 1500) return sceneFps;
				lastSceneProbe = now;
				let fps = 0;
				try {
					const status = sceneStatusController.read();
					if (status !== null && status !== undefined && Number.isFinite(status.fps)) fps = Number(status.fps);
				} catch {
					fps = 0;
				}
				if (fps <= 0) {
					const scene = getScene();
					const raw = scene === null ? 0 : Number(scene.dataset.tlFps);
					if (Number.isFinite(raw)) fps = raw;
				}
				sceneFps = fps > 0 ? Math.round(fps) : 0;
				return sceneFps;
			};
			const currentFreeze = (now) => {
				if (effectsState.enabled !== true) return "disabled";
				if (reducedMotion === true) return "reduced-motion";
				if (isLowPowerActive()) return "low-power";
				if (getScene() !== null) {
					const fps = probeSceneFps(now === undefined ? performance.now() : now);
					if (fps > 0 && fps < EFFECT_BUDGET.sceneFpsFloor) return "scene-fps";
				}
				return "";
			};

			// ---- shared measurements / publication ----
			const activeSubsystems = () => {
				let active = 0;
				if (effectsState.parallax === true && lastFrozenReason === "") active += 1;
				if (clicks.length > 0) active += 1;
				if (ambienceActive()) active += 1;
				return active;
			};
			const publishMetrics = (active, force) => {
				const now = performance.now();
				if (force !== true && now - lastMetricsAt < 250) return;
				lastMetricsAt = now;
				publishTl5Metrics({
					effects: {
						active,
						fps: measuredFps,
						budget: effectsState.budget,
						frozenReason: lastFrozenReason,
						clickAutoOff,
						frameCostMs: Math.round(frameCostEma * 100) / 100,
						parallax: effectsState.parallax === true,
						click: effectsState.click === true,
						ambience: effectsState.ambience,
					},
				});
			};
			const publishDiag = (force) => {
				const now = performance.now();
				if (force !== true && now - lastDiagAt < 200) return;
				lastDiagAt = now;
				tl5Diag("effects", {
					enabled: effectsState.enabled,
					parallax: effectsState.parallax === true && lastFrozenReason === "",
					click: effectsState.click === true && clickAutoOff === "" && lastFrozenReason === "",
					ambience: effectsState.ambience,
					ambienceDensity: effectsState.ambienceDensity,
					frozenReason: lastFrozenReason,
					clickAutoOff,
					degradeFactor: Math.round(degradeFactor * 100) / 100,
					particles: particles.length,
					clicks: clicks.length,
					sceneFps,
					frameCostMs: Math.round(frameCostEma * 100) / 100,
					active: activeSubsystems(),
					fps: measuredFps,
					budget: effectsState.budget,
					transition: effectsState.transition,
					transitionMs: effectsState.transitionMs,
				});
			};

			// ---- canvas sizing ----
			const resizeCanvas = () => {
				sizeDirty = false;
				const width = Math.max(1, Math.round(globalThis.innerWidth || 1));
				const height = Math.max(1, Math.round(globalThis.innerHeight || 1));
				const ratio = Math.min(1.5, Math.max(1, globalThis.devicePixelRatio || 1));
				if (width === canvasW && height === canvasH && ratio === canvasRatio && canvas.width > 0) return;
				canvasW = width;
				canvasH = height;
				canvasRatio = ratio;
				canvas.width = Math.max(1, Math.round(width * ratio));
				canvas.height = Math.max(1, Math.round(height * ratio));
				if (ctx !== null) {
					try {
						ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
						ctx.clearRect(0, 0, width, height);
					} catch {
						// a lost 2D context falls back to "no drawing"
					}
				}
				particles.length = 0;
				particleType = "none";
			};

			// ---- B1 parallax ----
			const resetParallax = () => {
				targetX = 0;
				targetY = 0;
				curX = 0;
				curY = 0;
				const scene = getScene();
				if (scene === null) return;
				scene.style.removeProperty("transform");
				scene.removeAttribute("data-tl-parallax");
			};
			const parallaxWanted = () =>
				effectsState.enabled === true && effectsState.parallax === true && lastFrozenReason === "" && getScene() !== null;
			const parallaxNeedsFrames = () =>
				parallaxWanted() && (Math.abs(targetX - curX) > 0.05 || Math.abs(targetY - curY) > 0.05);
			const stepParallax = (dt) => {
				const scene = getScene();
				if (scene === null) {
					curX = 0;
					curY = 0;
					return;
				}
				const lerp = 1 - Math.pow(0.78, dt * 60);
				curX += (targetX - curX) * lerp;
				curY += (targetY - curY) * lerp;
				if (Math.abs(targetX - curX) < 0.05) curX = targetX;
				if (Math.abs(targetY - curY) < 0.05) curY = targetY;
				// Scale just enough to keep the translated fixed layer covering the viewport:
				// each side grows by (scale - 1) / 2 * dimension, so 1 + 2 * maxOffset / minDim
				// covers the largest possible offset without permanently cropping the scene.
				const strength = Math.min(1, Math.max(0, Number(effectsState.parallaxStrength) || 0));
				const maxOffset = EFFECTS_PARALLAX_MAX * strength;
				const minDim = Math.max(1, Math.min(globalThis.innerWidth || 1, globalThis.innerHeight || 1));
				const scale = 1 + (2 * maxOffset) / minDim;
				scene.style.transform =
					"translate3d(" +
					curX.toFixed(2) +
					"px, " +
					curY.toFixed(2) +
					"px, 0) scale(" +
					scale.toFixed(4) +
					")";
				if (scene.hasAttribute("data-tl-parallax") === false) scene.setAttribute("data-tl-parallax", "");
			};

			// ---- B2 click effects ----
			const readAccentRgb = () => {
				const now = performance.now();
				if (now - accentReadAt < 5000) return accentRgb;
				accentReadAt = now;
				try {
					const raw = String(globalThis.getComputedStyle(body).getPropertyValue("--tl-accent") ?? "").trim();
					const match = /^#([0-9a-f]{6})$/i.exec(raw);
					if (match !== null) {
						const value = parseInt(match[1], 16);
						accentRgb = { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
					}
				} catch {
					// keep the mint default
				}
				return accentRgb;
			};
			const accentFill = (alpha) => {
				const rgb = readAccentRgb();
				return "rgba(" + rgb.r + ", " + rgb.g + ", " + rgb.b + ", " + alpha.toFixed(3) + ")";
			};
			const spawnClick = (x, y) => {
				if (ctx === null) return;
				while (clicks.length >= EFFECT_BUDGET.maxClickEffects) clicks.shift();
				if (clicks.length >= EFFECT_BUDGET.maxClickEffects) return;
				const style = effectsState.clickStyle === "spark" ? "spark" : "ripple";
				const item = { x, y, born: performance.now(), style };
				if (style === "spark") {
					const burst = [];
					const count = 8;
					for (let index = 0; index < count; index += 1) {
						const angle = (Math.PI * 2 * index) / count + Math.random() * 0.6;
						const speed = 60 + Math.random() * 150;
						burst.push({
							vx: Math.cos(angle) * speed,
							vy: Math.sin(angle) * speed,
							size: 1.4 + Math.random() * 1.8,
						});
					}
					item.particles = burst;
				}
				clicks.push(item);
			};
			const drawClicks = (now) => {
				const life = EFFECT_BUDGET.clickLifeMs;
				for (let index = clicks.length - 1; index >= 0; index -= 1) {
					const item = clicks[index];
					const age = now - item.born;
					if (age >= life || age < 0) {
						clicks.splice(index, 1);
						continue;
					}
					const k = age / life;
					if (item.style === "spark") {
						const fade = (1 - k) * 0.9;
						for (const particle of item.particles) {
							if (fade <= 0.02) continue;
							const px = item.x + particle.vx * (age / 1000);
							const py = item.y + particle.vy * (age / 1000) + 220 * Math.pow(age / 1000, 2);
							ctx.fillStyle = accentFill(fade);
							ctx.beginPath();
							ctx.arc(px, py, Math.max(0.4, particle.size * (1 - k * 0.45)), 0, Math.PI * 2);
							ctx.fill();
						}
						continue;
					}
					const ease = 1 - Math.pow(1 - k, 2);
					const radius = 6 + 38 * ease;
					const alpha = 0.55 * Math.pow(1 - k, 1.6);
					ctx.strokeStyle = accentFill(alpha);
					ctx.lineWidth = 2.4 * (1 - k) + 0.6;
					ctx.beginPath();
					ctx.arc(item.x, item.y, radius, 0, Math.PI * 2);
					ctx.stroke();
					ctx.fillStyle = accentFill(alpha * 0.16);
					ctx.beginPath();
					ctx.arc(item.x, item.y, radius * 0.45, 0, Math.PI * 2);
					ctx.fill();
				}
			};

			// ---- B3 ambience ----
			const ambienceActive = () => {
				if (effectsState.enabled !== true) return false;
				if (lastFrozenReason !== "") return false;
				if (ctx === null) return false;
				if (EFFECTS_AMBIENCE_TYPES.includes(effectsState.ambience) === false) return false;
				if (effectsState.ambience === "none") return false;
				return Number(effectsState.ambienceDensity) > 0;
			};
			const ambienceTarget = () => {
				const base = EFFECT_BUDGET.ambienceBase[effectsState.ambience] ?? 0;
				const density = Math.min(1, Math.max(0, Number(effectsState.ambienceDensity) || 0));
				return Math.min(200, Math.round(base * density * degradeFactor));
			};
			const makeParticle = (type, x, y) => {
				if (type === "rain") {
					return {
						x: x === undefined ? Math.random() * canvasW : x,
						y: y === undefined ? Math.random() * canvasH : y,
						len: 10 + Math.random() * 12,
						speed: 520 + Math.random() * 420,
						wind: -90 - Math.random() * 60,
						alpha: 0.18 + Math.random() * 0.28,
					};
				}
				if (type === "snow") {
					return {
						x: x === undefined ? Math.random() * canvasW : x,
						y: y === undefined ? Math.random() * canvasH : y,
						size: 1 + Math.random() * 1.9,
						speed: 18 + Math.random() * 46,
						drift: 10 + Math.random() * 22,
						phase: Math.random() * Math.PI * 2,
						alpha: 0.35 + Math.random() * 0.45,
					};
				}
				return {
					x: x === undefined ? Math.random() * canvasW : x,
					y: y === undefined ? Math.random() * canvasH : y,
					size: 1.6 + Math.random() * 3.6,
					speed: 6 + Math.random() * 16,
					phase: Math.random() * Math.PI * 2,
				};
			};
			const drawAmbience = (now, dt) => {
				const type = effectsState.ambience;
				if (particleType !== type) {
					particleType = type;
					particles.length = 0;
				}
				const target = ambienceTarget();
				while (particles.length < target) particles.push(makeParticle(type));
				if (particles.length > target) particles.length = target;
				const seconds = now / 1000;
				for (const particle of particles) {
					if (type === "rain") {
						particle.y += particle.speed * dt;
						particle.x += particle.wind * dt;
						if (particle.y > canvasH + 24) {
							particle.y = -24;
							particle.x = Math.random() * (canvasW + 120);
						}
						if (particle.x < -24) particle.x = canvasW + 24;
						ctx.strokeStyle = "rgba(196, 218, 255, " + particle.alpha.toFixed(3) + ")";
						ctx.lineWidth = 1;
						ctx.beginPath();
						ctx.moveTo(particle.x, particle.y);
						ctx.lineTo(particle.x + particle.wind * 0.02, particle.y - particle.len);
						ctx.stroke();
						continue;
					}
					if (type === "snow") {
						particle.y += particle.speed * dt;
						particle.x += Math.sin(seconds * 0.9 + particle.phase) * particle.drift * dt;
						if (particle.y > canvasH + 6) {
							particle.y = -6;
							particle.x = Math.random() * canvasW;
						}
						if (particle.x < -8) particle.x = canvasW + 8;
						else if (particle.x > canvasW + 8) particle.x = -8;
						ctx.fillStyle = "rgba(255, 255, 255, " + particle.alpha.toFixed(3) + ")";
						ctx.beginPath();
						ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
						ctx.fill();
						continue;
					}
					particle.y -= particle.speed * dt;
					particle.x += Math.sin(seconds * 0.6 + particle.phase) * 10 * dt;
					if (particle.y < -10) {
						particle.y = canvasH + 10;
						particle.x = Math.random() * canvasW;
					}
					const pulse = 0.16 + 0.12 * (0.5 + 0.5 * Math.sin(seconds * 1.4 + particle.phase));
					ctx.fillStyle = accentFill(pulse);
					ctx.beginPath();
					ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
					ctx.fill();
				}
			};

			// ---- frame loop (one rAF, never runs when inert) ----
			const frameInterval = () => {
				let interval = 0;
				if (ambienceActive()) interval = 1000 / EFFECT_BUDGET.ambienceFps;
				if (clicks.length > 0) interval = Math.max(interval, 1000 / EFFECT_BUDGET.clickFps);
				if (interval === 0 && parallaxNeedsFrames()) interval = 1000 / EFFECT_BUDGET.clickFps;
				return interval;
			};
			const needsFrames = () => {
				if (lastFrozenReason !== "") return false;
				if (effectsState.enabled !== true) return false;
				if (clicks.length > 0) return true;
				if (ambienceActive()) return true;
				return parallaxNeedsFrames();
			};
			const drawFrame = (now, elapsed) => {
				const dt = Math.min(0.1, Math.max(0.001, (elapsed > 0 ? elapsed : 1000 / 30) / 1000));
				if (parallaxNeedsFrames()) stepParallax(dt);
				const ambience = ambienceActive();
				if (ctx === null || (ambience === false && clicks.length === 0)) return;
				if (sizeDirty || canvasW === 0) resizeCanvas();
				if (canvasW === 0) return;
				try {
					ctx.clearRect(0, 0, canvasW, canvasH);
				} catch {
					return;
				}
				if (ambience) drawAmbience(now, dt);
				if (clicks.length > 0) drawClicks(now);
				canvas.hidden = false;
			};
			const onFrameCost = (cost, now) => {
				frameCostEma = frameCostEma === 0 ? cost : frameCostEma * 0.9 + cost * 0.1;
				if (cost > EFFECT_BUDGET.slowFrameMs) skipNextFrame = true;
				if (frameCostEma > EFFECT_BUDGET.frameCostMs) degradeFactor = Math.max(0.45, degradeFactor - 0.01);
				else degradeFactor = Math.min(1, degradeFactor + 0.004);
				if (frameCostEma > EFFECT_BUDGET.degradeMs && clicks.length > 0) {
					if (slowSince === 0) slowSince = now;
					else if (now - slowSince >= EFFECT_BUDGET.degradeForMs) {
						clickAutoOff = "frame-cost";
						clicks.length = 0;
						slowSince = 0;
						scheduleRetry();
					}
				} else {
					slowSince = 0;
				}
			};
			const updateFps = (now) => {
				frameCount += 1;
				if (fpsStart === 0) fpsStart = now;
				if (now - fpsStart >= 1000) {
					measuredFps = Math.round((frameCount * 1000) / (now - fpsStart));
					frameCount = 0;
					fpsStart = now;
					publishMetrics(activeSubsystems(), true);
					publishDiag();
				}
			};
			const step = (now) => {
				frameRaf = 0;
				if (alive === false) return;
				const reason = currentFreeze(now);
				if (reason !== "") {
					lastFrozenReason = reason;
					reconcile(true);
					return;
				}
				if (lastFrozenReason !== "") lastFrozenReason = "";
				const interval = frameInterval();
				if (interval <= 0) {
					stopLoop();
					publishMetrics(0, true);
					publishDiag();
					return;
				}
				const since = lastFrameAt === 0 ? interval : now - lastFrameAt;
				if (lastFrameAt !== 0 && since < interval) {
					frameRaf = globalThis.requestAnimationFrame(step);
					return;
				}
				if (skipNextFrame) {
					skipNextFrame = false;
					lastFrameAt = now;
					updateFps(now);
					frameRaf = globalThis.requestAnimationFrame(step);
					return;
				}
				lastFrameAt = now;
				const started = performance.now();
				drawFrame(now, since);
				onFrameCost(performance.now() - started, now);
				updateFps(now);
				if (needsFrames()) frameRaf = globalThis.requestAnimationFrame(step);
				else {
					stopLoop();
					publishMetrics(0, true);
					publishDiag();
				}
			};
			const ensureLoop = () => {
				if (alive === false || frameRaf !== 0) return;
				if (needsFrames() === false) return;
				lastFrameAt = 0;
				fpsStart = 0;
				frameCount = 0;
				measuredFps = 0;
				frameRaf = globalThis.requestAnimationFrame(step);
			};
			const stopLoop = () => {
				if (frameRaf !== 0) {
					globalThis.cancelAnimationFrame(frameRaf);
					frameRaf = 0;
				}
				if (ctx !== null) {
					try {
						ctx.clearRect(0, 0, canvasW, canvasH);
					} catch {
						// the canvas may already be gone
					}
				}
				canvas.hidden = true;
				measuredFps = 0;
				lastFrameAt = 0;
				skipNextFrame = false;
				loseMetricsWindow();
			};
			const loseMetricsWindow = () => {
				frameCount = 0;
				fpsStart = 0;
			};
			const scheduleRetry = () => {
				if (alive === false) return;
				const needsRetry = clickAutoOff !== "" || lastFrozenReason === "scene-fps";
				if (needsRetry === false) {
					clearRetry();
					return;
				}
				if (retryTimer !== 0) return;
				retryTimer = window.setTimeout(() => {
					retryTimer = 0;
					if (alive === false) return;
					clickAutoOff = "";
					slowSince = 0;
					frameCostEma = frameCostEma * 0.5;
					sceneFps = 0;
					lastSceneProbe = 0;
					reconcile(true);
				}, EFFECT_BUDGET.retryMs);
			};
			const clearRetry = () => {
				if (retryTimer === 0) return;
				window.clearTimeout(retryTimer);
				retryTimer = 0;
			};

			// ---- listeners (attached only while a feature needs them) ----
			const onPointerMove = (event) => {
				if (parallaxWanted() === false) return;
				if (currentFreeze(performance.now()) !== "") return;
				const scene = getScene();
				if (scene === null) return;
				const width = Math.max(1, globalThis.innerWidth || 1);
				const height = Math.max(1, globalThis.innerHeight || 1);
				const strength = Math.min(1, Math.max(0, Number(effectsState.parallaxStrength) || 0));
				targetX = (event.clientX / width - 0.5) * 2 * EFFECTS_PARALLAX_MAX * strength;
				targetY = (event.clientY / height - 0.5) * 2 * EFFECTS_PARALLAX_MAX * strength * 0.6;
				ensureLoop();
			};
			const onPointerLeave = () => {
				targetX = 0;
				targetY = 0;
				if (parallaxWanted()) ensureLoop();
			};
			const onClickDown = (event) => {
				if (effectsState.enabled !== true || effectsState.click !== true) return;
				if (clickAutoOff !== "") return;
				if (event.button !== undefined && event.button !== 0) return;
				if (event.isPrimary === false) return;
				if (currentFreeze(performance.now()) !== "") return;
				const target = event.target;
				if (target !== null && typeof target.closest === "function") {
					const blocked = target.closest("[data-tl-wall], [data-tl-font-panel], input, textarea, select, [contenteditable='true']");
					if (blocked !== null) return;
				}
				spawnClick(event.clientX, event.clientY);
				ensureLoop();
				publishDiag();
			};
			const onResize = () => {
				sizeDirty = true;
			};
			const onVisibilityChange = () => {
				if (document.hidden) {
					stopLoop();
					resetParallax();
					publishMetrics(0, true);
					publishDiag(true);
					return;
				}
				reconcile(false);
			};
			const onMotionChange = () => {
				reducedMotion = motionQuery !== null && motionQuery.matches === true;
				reconcile(true);
			};

			// Add/remove occur exactly once in the source (inside these helpers) so the
			// static listener inventory in tools/audit.mjs stays balanced even though the
			// listeners are attached/detached many times at runtime.
			const attachPointerListeners = () => {
				if (pointerMoveBound === true) return;
				pointerMoveBound = true;
				window.addEventListener("pointermove", onPointerMove, { passive: true });
				document.addEventListener("pointerleave", onPointerLeave, { passive: true });
			};
			const detachPointerListeners = () => {
				if (pointerMoveBound === false) return;
				pointerMoveBound = false;
				window.removeEventListener("pointermove", onPointerMove);
				document.removeEventListener("pointerleave", onPointerLeave);
			};
			const attachClickListeners = () => {
				if (pointerDownBound === true) return;
				pointerDownBound = true;
				document.addEventListener("pointerdown", onClickDown, { passive: true });
			};
			const detachClickListeners = () => {
				if (pointerDownBound === false) return;
				pointerDownBound = false;
				document.removeEventListener("pointerdown", onClickDown);
			};
			const syncListeners = () => {
				const pointerWanted =
					effectsState.enabled === true && effectsState.parallax === true && lastFrozenReason === "";
				if (pointerWanted) attachPointerListeners();
				else detachPointerListeners();
				const clickWanted =
					effectsState.enabled === true && effectsState.click === true && lastFrozenReason === "" && clickAutoOff === "";
				if (clickWanted) attachClickListeners();
				else detachClickListeners();
			};

			// ---- reconcile: the only place DOM/listeners/loop are switched ----
			const reconcile = (force) => {
				if (alive === false) return;
				lastFrozenReason = currentFreeze(performance.now());
				const frozen = lastFrozenReason !== "";
				if (frozen || effectsState.parallax !== true) {
					if (frozen || parallaxWanted() === false) resetParallax();
				}
				if (frozen || effectsState.click !== true) {
					if (clicks.length > 0) clicks.length = 0;
				}
				if (frozen || ambienceActive() === false) {
					if (particles.length > 0) particles.length = 0;
					particleType = "none";
				}
				syncListeners();
				if (frozen === false && needsFrames()) ensureLoop();
				else stopLoop();
				scheduleRetry();
				publishMetrics(activeSubsystems(), force === true);
				publishDiag(force === true);
			};

			const unsubscribe = effectsController.subscribe(() => reconcile(true));

			let lowPowerObserver = null;
			try {
				lowPowerObserver = new MutationObserver(() => reconcile(true));
				lowPowerObserver.observe(body, { attributes: true, attributeFilter: ["data-tl-lowpower", "data-tl-modules"] });
			} catch {
				lowPowerObserver = null;
			}
			window.addEventListener("resize", onResize);
			document.addEventListener("visibilitychange", onVisibilityChange);
			try {
				motionQuery?.addEventListener?.("change", onMotionChange);
			} catch {
				// an older media-query implementation simply never notifies
			}

			reconcile(true);

			return () => {
				if (alive === false) return;
				alive = false;
				stopLoop();
				clearRetry();
				unsubscribe();
				detachPointerListeners();
				detachClickListeners();
				window.removeEventListener("resize", onResize);
				document.removeEventListener("visibilitychange", onVisibilityChange);
				try {
					motionQuery?.removeEventListener?.("change", onMotionChange);
				} catch {
					// nothing to remove
				}
				if (lowPowerObserver !== null) {
					try {
						lowPowerObserver.disconnect();
					} catch {
						// already disconnected
					}
					lowPowerObserver = null;
				}
				clicks.length = 0;
				particles.length = 0;
				resetParallax();
				canvas.hidden = true;
				if (canvas.parentNode !== null) canvas.parentNode.removeChild(canvas);
				publishMetrics(0, true);
			};
		}
		//#endregion
		//#region smart context
		/**
		 * C 期智能情境（由 effects-context 工作流实现）：
		 *
		 *   C1 时段自适应  晨/午/黄昏/夜切换叠加层/玻璃/氛围与场景暗度，纯本地；
		 *                  手动模式优先，绝不切换用户选的壁纸。
		 *   C2 专注联动    `[data-chat-running]` 出现时压暗+模糊场景，结束恢复；
		 *                  有明确开关，只改 `[data-tl-scene]` 的 filter，不覆盖播放状态。
		 *   C3 性能自适应  由 31-engine-extra.js 实现（需要场景内部帧率数据）。本文件只
		 *                  提供状态读数与控制：读 `scene.dataset.tlAdaptive` /
		 *                  `TL5_DIAG.context` / contextController 的 adaptive 与
		 *                  adaptiveLocked，锁定按钮通过 contextController.apply 写入。
		 *
		 * 依赖 sceneStatusController（30-wallpaper.js）、layerController（30）、
		 * glassController（57）与 lowPowerController（55）。这些跨文件引用只出现在
		 * 运行时函数里（installContextRuntime），片段顶层不碰它们。
		 *
		 * 分区组件在本文件顶层 registerTl5PanelSection(...)。
		 */
		const CONTEXT_KEY = "tianlight.context";
		/** C1 可接受的时段值（"auto" 交给本地时钟）。 */
		const CONTEXT_PERIOD_VALUES = ["auto", "dawn", "day", "dusk", "night"];
		/**
		 * v0.5.3 安全默认：模块本体默认启用，但所有“会改变外观/联网”的子功能一律默认关。
		 * 旧版本里只有缺失/非法字段才会落到这些默认值；已持久化的合法用户选择保留，
		 * 所以老用户不会在升级后被强行关掉，新用户也不会一上来就被天气/时段改动。
		 */
		const CONTEXT_DEFAULTS = {
			enabled: true,
			timeOfDay: false,
			manualPeriod: "auto",
			focusLink: false,
			focusDim: 40,
			focusBlur: 6,
			adaptive: false,
			adaptiveLocked: false,
		};
		const contextState = { ...CONTEXT_DEFAULTS };
		const contextSubscribers = new Set();

		function contextCoerceNumber(value, min, max, fallback) {
			const number = Number(value);
			if (Number.isFinite(number) === false) return fallback;
			return Math.min(max, Math.max(min, number));
		}

		function readContextSettings() {
			const model = { ...CONTEXT_DEFAULTS };
			try {
				const raw = globalThis.localStorage?.getItem(CONTEXT_KEY);
				if (raw === undefined || raw === null || raw === "") return model;
				const parsed = JSON.parse(raw);
				if (parsed === null || typeof parsed !== "object") return model;
				// Migration-safe: a field only overrides the (safe) default when it is a valid
				// value. Missing or malformed fields fall back to the new defaults; valid
				// persisted user choices survive the upgrade untouched.
				if (parsed.enabled === true || parsed.enabled === false) model.enabled = parsed.enabled;
				if (parsed.timeOfDay === true || parsed.timeOfDay === false) model.timeOfDay = parsed.timeOfDay;
				if (CONTEXT_PERIOD_VALUES.includes(parsed.manualPeriod)) model.manualPeriod = parsed.manualPeriod;
				if (parsed.focusLink === true || parsed.focusLink === false) model.focusLink = parsed.focusLink;
				model.focusDim = contextCoerceNumber(parsed.focusDim, 0, 90, model.focusDim);
				model.focusBlur = contextCoerceNumber(parsed.focusBlur, 0, 24, model.focusBlur);
				if (parsed.adaptive === true || parsed.adaptive === false) model.adaptive = parsed.adaptive;
				if (parsed.adaptiveLocked === true || parsed.adaptiveLocked === false) model.adaptiveLocked = parsed.adaptiveLocked;
			} catch {
				return { ...CONTEXT_DEFAULTS };
			}
			return model;
		}

		const contextController = {
			read: () => ({ ...contextState }),
			apply: (patch) => {
				Object.assign(contextState, patch === null || typeof patch !== "object" ? {} : patch);
				try {
					globalThis.localStorage?.setItem(CONTEXT_KEY, JSON.stringify(contextState));
				} catch {
					// optional persistence
				}
				for (const listener of [...contextSubscribers]) {
					try {
						listener({ ...contextState });
					} catch (error) {
						note("context:subscriber", error);
					}
				}
				return { ...contextState };
			},
			subscribe: (listener) => {
				if (typeof listener !== "function") return () => {};
				contextSubscribers.add(listener);
				return () => contextSubscribers.delete(listener);
			},
			state: () => ({ ...contextState }),
		};
		Object.assign(contextState, readContextSettings());

		/**
		 * v0.5.0 宿主设置接管：平台层在 apply() 里先 await 宿主配置（可能来自另一个
		 * 浏览器），之后才运行本安装器，所以 bundle 求值时的读取可能已过期。安装器
		 * 在接线定时器/观察者之前重新读一次持久化模型，让被接管的
		 * tianlight.context（含 timeOfDay/manualPeriod/focusLink/adaptive 等）立即
		 * 生效，无需刷新页面。纯读取；值变化时才通知订阅者，不写回存储。
		 */
		function refreshContextState() {
			const stored = readContextSettings();
			let changed = false;
			for (const key of Object.keys(CONTEXT_DEFAULTS)) {
				if (stored[key] !== contextState[key]) {
					changed = true;
					break;
				}
			}
			Object.assign(contextState, stored);
			if (changed === false) return;
			for (const listener of [...contextSubscribers]) {
				try {
					listener({ ...contextState });
				} catch (error) {
					note("context:subscriber", error);
				}
			}
		}

		/**
		 * C4 天气联动（v0.5.1，可选、默认关、免 API key、失败全静默）。
		 *
		 * 刻意选用 Open-Meteo 公共接口：免 key、CORS 友好、无需用户申请账号，所以
		 * 开启后唯一外发的数据就是城市名/坐标本身。关闭时零网络请求；位置只来自
		 * 用户输入的坐标、显式“使用当前位置”或显式城市解析，绝不自动定位/自动弹权限。
		 *
		 * weatherController 是独立于 contextController 的持久化模型
		 * （tianlight.weather），只驱动 effectsController 的 ambience 一个字段；
		 * 叠加层/玻璃/壁纸仍归 C1 与壁纸模块所有。
		 */
		const WEATHER_KEY = "tianlight.weather";
		const WEATHER_PROVIDER = "open-meteo";
		const WEATHER_INTERVALS = [15, 30, 60, 120];
		const WEATHER_TIMEOUT_MS = 8000;
		const WEATHER_RETRY_MS = 60000;
		const WEATHER_GEOCODE_ENDPOINT = "https://geocoding-api.open-meteo.com/v1/search";
		const WEATHER_FORECAST_ENDPOINT = "https://api.open-meteo.com/v1/forecast";
		const WEATHER_ERROR_CODES = ["", "network", "timeout", "invalid", "geocode", "geolocation", "unavailable", "aborted"];
		const WEATHER_RAIN_CODES = [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99];
		const WEATHER_SNOW_CODES = [71, 73, 75, 77, 85, 86];
		const WEATHER_DEFAULTS = {
			enabled: false,
			provider: WEATHER_PROVIDER,
			city: "",
			latitude: null,
			longitude: null,
			intervalMin: 30,
			last: null,
			lastError: "",
		};
		const weatherState = { ...WEATHER_DEFAULTS };
		const weatherSubscribers = new Set();
		/** 安装器提供的网络钩子；模块关闭（installer disposed）时归 null → 零请求。 */
		let weatherRuntime = null;

		function normalizeWeatherCoordinate(value, limit) {
			// Number(null) === 0: never let an absent field become the valid coordinate (0,0).
			if (typeof value === "number") {
				if (Number.isFinite(value) === false) return null;
				if (Math.abs(value) > limit) return null;
				return Math.round(value * 10000) / 10000;
			}
			if (typeof value === "string") {
				const trimmed = value.trim();
				if (trimmed === "") return null;
				const parsed = Number(trimmed);
				if (Number.isFinite(parsed) === false) return null;
				if (Math.abs(parsed) > limit) return null;
				return Math.round(parsed * 10000) / 10000;
			}
			return null;
		}

		function normalizeWeatherLast(value) {
			if (value === null || typeof value !== "object") return null;
			const code = value.code === null || value.code === undefined ? NaN : Number(value.code);
			const temperatureC = value.temperatureC === null || value.temperatureC === undefined ? NaN : Number(value.temperatureC);
			const at = value.at === null || value.at === undefined ? NaN : Number(value.at);
			if (Number.isFinite(code) === false || code < 0 || code > 99) return null;
			if (Number.isFinite(temperatureC) === false) return null;
			if (Number.isFinite(at) === false || at <= 0) return null;
			return {
				code: Math.round(code),
				temperatureC: Math.round(temperatureC * 10) / 10,
				isDay: value.isDay === true,
				at: Math.round(at),
			};
		}

		function readWeatherSettings() {
			const model = { ...WEATHER_DEFAULTS, last: null };
			try {
				const raw = globalThis.localStorage?.getItem(WEATHER_KEY);
				if (raw === undefined || raw === null || raw === "") return model;
				const parsed = JSON.parse(raw);
				if (parsed === null || typeof parsed !== "object") return model;
				if (parsed.enabled === true) model.enabled = true;
				if (typeof parsed.city === "string") model.city = parsed.city.trim().slice(0, 80);
				model.latitude = normalizeWeatherCoordinate(parsed.latitude, 90);
				model.longitude = normalizeWeatherCoordinate(parsed.longitude, 180);
				if (WEATHER_INTERVALS.includes(Number(parsed.intervalMin))) model.intervalMin = Number(parsed.intervalMin);
				model.last = normalizeWeatherLast(parsed.last);
				if (typeof parsed.lastError === "string" && WEATHER_ERROR_CODES.includes(parsed.lastError)) model.lastError = parsed.lastError;
			} catch {
				return { ...WEATHER_DEFAULTS, last: null };
			}
			return model;
		}

		function weatherSnapshot() {
			return { ...weatherState, last: weatherState.last === null ? null : { ...weatherState.last } };
		}

		function weatherNotify() {
			for (const listener of [...weatherSubscribers]) {
				try {
					listener(weatherSnapshot());
				} catch (error) {
					note("weather:subscriber", error);
				}
			}
		}

		const weatherController = {
			read: weatherSnapshot,
			state: weatherSnapshot,
			apply: (patch) => {
				if (patch !== null && typeof patch === "object") {
					if (patch.enabled === true || patch.enabled === false) weatherState.enabled = patch.enabled;
					if (typeof patch.city === "string") weatherState.city = patch.city.trim().slice(0, 80);
					if (patch.latitude !== undefined) weatherState.latitude = normalizeWeatherCoordinate(patch.latitude, 90);
					if (patch.longitude !== undefined) weatherState.longitude = normalizeWeatherCoordinate(patch.longitude, 180);
					if (WEATHER_INTERVALS.includes(Number(patch.intervalMin))) weatherState.intervalMin = Number(patch.intervalMin);
					if (patch.last !== undefined) weatherState.last = normalizeWeatherLast(patch.last);
					if (typeof patch.lastError === "string" && WEATHER_ERROR_CODES.includes(patch.lastError)) {
						weatherState.lastError = patch.lastError;
					}
					weatherState.provider = WEATHER_PROVIDER;
				}
				try {
					globalThis.localStorage?.setItem(WEATHER_KEY, JSON.stringify(weatherState));
				} catch {
					// persistence is optional; the session still follows the model
				}
				weatherNotify();
				return weatherSnapshot();
			},
			subscribe: (listener) => {
				if (typeof listener !== "function") return () => {};
				weatherSubscribers.add(listener);
				return () => weatherSubscribers.delete(listener);
			},
			/** 手动坐标（不联网）：范围校验后写入模型；运行时通过订阅立即开轮询。 */
			setManualLocation: (latitude, longitude) => {
				const lat = normalizeWeatherCoordinate(latitude, 90);
				const lon = normalizeWeatherCoordinate(longitude, 180);
				if (lat === null || lon === null) return { ok: false, error: "coords" };
				weatherController.apply({ latitude: lat, longitude: lon, lastError: "" });
				return { ok: true };
			},
			refresh: () => (weatherRuntime === null ? Promise.resolve(false) : weatherRuntime.refresh()),
			resolveCity: (query) =>
				weatherRuntime === null ? Promise.resolve({ ok: false, error: "unavailable" }) : weatherRuntime.resolveCity(query),
			useCurrentLocation: () =>
				weatherRuntime === null ? Promise.resolve({ ok: false, error: "unavailable" }) : weatherRuntime.useCurrentLocation(),
		};
		Object.assign(weatherState, readWeatherSettings());

		/** 宿主设置接管后的刷新（同 refreshContextState）：只在安装器入口调用。 */
		function refreshWeatherState() {
			const stored = readWeatherSettings();
			let changed = false;
			for (const key of Object.keys(WEATHER_DEFAULTS)) {
				if (key === "last") {
					const before = weatherState.last === null ? "" : JSON.stringify(weatherState.last);
					const after = stored.last === null ? "" : JSON.stringify(stored.last);
					if (before !== after) changed = true;
					continue;
				}
				if (stored[key] !== weatherState[key]) changed = true;
			}
			Object.assign(weatherState, stored);
			if (changed) weatherNotify();
		}

		/** WMO weather_code → 状态行文案 key（仅面板展示用）。 */
		function weatherDescriptionKey(code) {
			const value = Number(code);
			if (value === 0) return "ctx.weather.descClear";
			if (value === 1) return "ctx.weather.descMainlyClear";
			if (value === 2) return "ctx.weather.descPartlyCloudy";
			if (value === 3) return "ctx.weather.descOvercast";
			if (value === 45 || value === 48) return "ctx.weather.descFog";
			if (WEATHER_RAIN_CODES.includes(value)) {
				if (value === 56 || value === 57 || value === 66 || value === 67) return "ctx.weather.descFreezing";
				if (value === 95 || value === 96 || value === 99) return "ctx.weather.descThunder";
				if (value === 80 || value === 81 || value === 82) return "ctx.weather.descShowers";
				if (value === 51 || value === 53 || value === 55) return "ctx.weather.descDrizzle";
				return "ctx.weather.descRain";
			}
			if (WEATHER_SNOW_CODES.includes(value)) {
				if (value === 85 || value === 86) return "ctx.weather.descSnowShowers";
				return "ctx.weather.descSnow";
			}
			return "ctx.weather.descUnknown";
		}

		function weatherErrorKey(code) {
			if (code === "network") return "ctx.weather.errorNetwork";
			if (code === "timeout") return "ctx.weather.errorTimeout";
			if (code === "invalid") return "ctx.weather.errorInvalid";
			if (code === "geocode") return "ctx.weather.errorGeocode";
			if (code === "geolocation") return "ctx.weather.errorGeolocation";
			if (code === "unavailable") return "ctx.weather.errorUnavailable";
			return "";
		}

		/** WMO 天气码 → 氛围预设。只返回 ambience/密度，绝不动玻璃/叠加层/壁纸。 */
		function weatherAmbienceFor(code, isDay) {
			const value = Number(code);
			if (WEATHER_RAIN_CODES.includes(value)) return { ambience: "rain", ambienceDensity: 0.55 };
			if (WEATHER_SNOW_CODES.includes(value)) return { ambience: "snow", ambienceDensity: 0.5 };
			if (value === 0 && isDay === true) return { ambience: "spots", ambienceDensity: 0.2 };
			return { ambience: "none", ambienceDensity: 0 };
		}

		function normalizeWeatherForecast(payload) {
			const current = payload !== null && typeof payload === "object" ? payload.current : null;
			if (current === null || typeof current !== "object") return null;
			const code = current.weather_code === null || current.weather_code === undefined ? NaN : Number(current.weather_code);
			const temperatureC =
				current.temperature_2m === null || current.temperature_2m === undefined ? NaN : Number(current.temperature_2m);
			if (Number.isFinite(code) === false || code < 0 || code > 99) return null;
			if (Number.isFinite(temperatureC) === false) return null;
			return normalizeWeatherLast({
				code,
				temperatureC,
				isDay: current.is_day === 1 || current.is_day === true,
				at: Date.now(),
			});
		}

		function formatWeatherTime(at) {
			const date = new Date(Number(at));
			if (Number.isFinite(date.getTime()) === false) return "";
			const hours = String(date.getHours()).padStart(2, "0");
			const minutes = String(date.getMinutes()).padStart(2, "0");
			return hours + ":" + minutes;
		}

		/**
		 * C1 时段定义与每个时段的“配方”。v0.5.3 起刻意保守：只做很小的亮度偏移
		 * （玻璃 ±≤0.04、场景压暗 ≤0.04，合成后 |影响| ≤6%），叠加层只留微弱边缘
		 * 过渡，不碰壁纸选择、不加模糊/filter。用户明确关闭时恢复原状。
		 */
		const CONTEXT_BRIGHTNESS_CAP = 0.06;
		const CONTEXT_PERIODS = ["dawn", "day", "dusk", "night"];
		const CONTEXT_PERIOD_LOOKS = {
			dawn: {
				glass: 1.02,
				dim: 0.02,
				ambience: "spots",
				ambienceDensity: 0.15,
				layers: [
					{ preset: "glow", opacity: 0.08 },
					{ preset: "vignette", opacity: 0.06 },
				],
			},
			day: {
				glass: 1.04,
				dim: 0,
				ambience: "none",
				ambienceDensity: 0,
				layers: [
					{ preset: "vignette", opacity: 0.05 },
					{ preset: "none", opacity: 0 },
				],
			},
			dusk: {
				glass: 0.99,
				dim: 0.03,
				ambience: "spots",
				ambienceDensity: 0.2,
				layers: [
					{ preset: "vignette", opacity: 0.08 },
					{ preset: "glow", opacity: 0.08 },
				],
			},
			night: {
				glass: 0.98,
				dim: 0.04,
				ambience: "rain",
				ambienceDensity: 0.25,
				layers: [
					{ preset: "vignette", opacity: 0.08 },
					{ preset: "none", opacity: 0 },
				],
			},
		};

		/** 某时段的“壁纸亮度影响” = 玻璃增益 − 场景压暗；强制限制在 ±cap 内。 */
		function contextBrightnessDelta(period) {
			const look = CONTEXT_PERIOD_LOOKS[period];
			if (look === undefined || look === null) return null;
			const delta = (look.glass - 1) - look.dim;
			return Math.max(-CONTEXT_BRIGHTNESS_CAP, Math.min(CONTEXT_BRIGHTNESS_CAP, delta));
		}

		/** 面板展示用："+4%" / "-6%" / "0%"。 */
		function contextBrightnessLabel(period) {
			const delta = contextBrightnessDelta(period);
			if (delta === null) return "";
			const percent = Math.round(delta * 100);
			return percent > 0 ? "+" + percent + "%" : percent + "%";
		}

		function contextClockPeriod(date) {
			const source = date instanceof Date ? date : new Date();
			const hour = source.getHours();
			if (hour >= 5 && hour < 8) return "dawn";
			if (hour >= 8 && hour < 16) return "day";
			if (hour >= 16 && hour < 19) return "dusk";
			return "night";
		}

		function contextNormalizeManual(value) {
			return value === "auto" || CONTEXT_PERIODS.includes(value) ? value : "auto";
		}

		/** 当前应生效的时段：关掉 C1 时返回空串；手动模式优先于本地时钟。 */
		function contextEffectivePeriod() {
			if (contextState.enabled !== true || contextState.timeOfDay !== true) return "";
			const manual = contextNormalizeManual(contextState.manualPeriod);
			if (manual !== "auto") return manual;
			return contextClockPeriod();
		}

		/**
		 * 时段 -> 文案。故意写成完整字面量 key 的 switch：用 "ctx." 前缀拼接时段名
		 * 会让静态 i18n 审计看不到真实 key（漏翻/缺 key 只能等运行时暴露），也会在
		 * 后缀拼错时把原始 key 直接显示给用户。
		 */
		function contextPeriodLabel(period) {
			if (period === "dawn") return TL_T("ctx.dawn");
			if (period === "day") return TL_T("ctx.day");
			if (period === "dusk") return TL_T("ctx.dusk");
			if (period === "night") return TL_T("ctx.night");
			return "";
		}

		function contextLookLayers(period) {
			const look = CONTEXT_PERIOD_LOOKS[period];
			if (look === undefined || look === null) return null;
			return {
				version: 2,
				slots: look.layers.map((slot) => ({
					kind: slot.preset === "none" ? "none" : "preset",
					preset: slot.preset,
					url: "",
					fit: "cover",
					opacity: slot.opacity,
					blend: "normal",
				})),
			};
		}

		/** 运行时读数：C3 自适应状态在 scene.dataset.tlAdaptive / TL5_DIAG.context，
		 *  C1 实际生效的时段由安装器发布到 TL5_DIAG.context.period（手动模式也如实反映）。 */
		function readContextRuntimeInfo() {
			let raw = "";
			let focusActive = false;
			let appliedPeriod = "";
			try {
				const scene = document.querySelector("[data-tl-scene]");
				if (scene !== null) raw = String(scene.dataset.tlAdaptive ?? "");
			} catch {
				raw = "";
			}
			try {
				const diag = TL5_DIAG.context ?? {};
				if (raw === "" && typeof diag.adaptive === "string") raw = diag.adaptive;
				if (diag.focusActive === true) focusActive = true;
				if (typeof diag.period === "string" && CONTEXT_PERIODS.includes(diag.period)) appliedPeriod = diag.period;
			} catch {
				// diagnostics are optional
			}
			const state = contextController.state();
			return {
				raw,
				adaptiveEnabled: state.adaptive === true,
				adaptiveLocked: state.adaptiveLocked === true,
				focusActive,
				appliedPeriod,
			};
		}

		registerTl5Strings({
			zh: {
				"ctx.idle": "默认",
				"ctx.master": "总开关",
				"ctx.masterHint": "关闭后时段自适应与专注联动都停止并恢复默认外观。",
				"ctx.timeOfDay": "时段自适应",
				"ctx.timeOfDayHint": "按本地时间做小幅外观调整（亮度影响 ≤6%，不加模糊）；只改外观，不换壁纸。",
				"ctx.timeOfDayTakeover": "开启时临时接管叠加层、玻璃与氛围，关闭后恢复接管前的外观。",
				"ctx.period": "时段",
				"ctx.currentPeriod": "当前时段：{period}",
				"ctx.manualPriority": "手动优先",
				"ctx.dawn": "晨",
				"ctx.day": "昼",
				"ctx.dusk": "黄昏",
				"ctx.night": "夜",
				"ctx.focus": "专注联动",
				"ctx.focusHint": "对话生成中压暗并虚化壁纸，结束后恢复；不暂停、不改变播放状态。",
				"ctx.focusDim": "压暗",
				"ctx.focusBlur": "模糊",
				"ctx.focusActive": "生成中",
				"ctx.focusIdle": "空闲",
				"ctx.adaptive": "性能自适应",
				"ctx.adaptiveHint": "壁纸引擎按帧率自动降档；锁定后不再自动调整。",
				"ctx.adaptiveLock": "锁定",
				"ctx.adaptiveUnlock": "解锁",
				"ctx.adaptiveLocked": "已锁定",
				"ctx.adaptiveState": "引擎状态：{state}",
				"ctx.adaptiveUnknown": "等待引擎",
				"ctx.readout": "运行时读数",
				"ctx.weather.title": "天气联动",
				"ctx.weather.privacyHint": "默认关闭时零网络请求；开启后只请求 Open-Meteo 公开接口（免 API key，只发送城市名或坐标）。",
				"ctx.weather.city": "城市",
				"ctx.weather.cityPlaceholder": "城市名（如 上海）",
				"ctx.weather.resolve": "解析城市",
				"ctx.weather.resolving": "正在解析城市…",
				"ctx.weather.resolved": "已定位：{name}",
				"ctx.weather.useLocation": "使用当前位置",
				"ctx.weather.locating": "正在获取位置…",
				"ctx.weather.locationReady": "已获取当前位置",
				"ctx.weather.geocodeFailed": "城市解析失败，请检查拼写或改用坐标。",
				"ctx.weather.geolocationFailed": "无法获取当前位置（可能被拒绝或不可用）。",
				"ctx.weather.lat": "纬度",
				"ctx.weather.lon": "经度",
				"ctx.weather.applyCoords": "应用坐标",
				"ctx.weather.coordsInvalid": "坐标无效：纬度 -90..90，经度 -180..180。",
				"ctx.weather.coordsApplied": "坐标已更新",
				"ctx.weather.interval": "轮询间隔",
				"ctx.weather.intervalValue": "{n} 分钟",
				"ctx.weather.refresh": "立即刷新",
				"ctx.weather.refreshing": "正在刷新…",
				"ctx.weather.statusDisabled": "未启用（关闭时零网络请求）",
				"ctx.weather.statusNoLocation": "已启用，请先设置城市或坐标。",
				"ctx.weather.statusWaiting": "等待首次天气数据…",
				"ctx.weather.statusLast": "{desc} · {temperature}°C · {time}",
				"ctx.weather.statusError": "获取失败：{reason}（静默重试）",
				"ctx.weather.conflictHint": "时段自适应也控制氛围；两者同时开启时以最近一次变更为准。",
				"ctx.weather.errorNetwork": "网络不可用",
				"ctx.weather.errorTimeout": "请求超时",
				"ctx.weather.errorInvalid": "天气数据无效",
				"ctx.weather.errorGeocode": "城市解析失败",
				"ctx.weather.errorGeolocation": "定位失败",
				"ctx.weather.errorUnavailable": "情境运行时未安装",
				"ctx.weather.descClear": "晴",
				"ctx.weather.descMainlyClear": "大致晴朗",
				"ctx.weather.descPartlyCloudy": "多云",
				"ctx.weather.descOvercast": "阴",
				"ctx.weather.descFog": "雾",
				"ctx.weather.descDrizzle": "毛毛雨",
				"ctx.weather.descRain": "雨",
				"ctx.weather.descFreezing": "冻雨",
				"ctx.weather.descThunder": "雷暴",
				"ctx.weather.descShowers": "阵雨",
				"ctx.weather.descSnow": "雪",
				"ctx.weather.descSnowShowers": "阵雪",
				"ctx.weather.descUnknown": "未知天气",
				"ctx.impact": "影响：壁纸亮度 {delta}",
				"ctx.timeOfDayOff": "关闭时段外观",
				"ctx.restoreDefaults": "恢复默认",
				"ctx.restoreDefaultsHint": "关闭时段外观、专注联动、性能自适应与天气，并恢复默认参数。",
				"ctx.experimental.title": "实验性功能（需要联网，Electron 下可能受网络策略限制）",
				"ctx.experimental.hint": "默认关闭；只有开启天气后才会发起网络请求。",
				"ctx.weather.retry": "重试",
				"ctx.weather.statusPrefix": "状态：{value}",
				"ctx.weather.geolocationHint": "桌面端（Electron）可能无法定位；失败会保留上次数据并显示原因。",
			},
			en: {
				"ctx.idle": "Default",
				"ctx.master": "Master switch",
				"ctx.masterHint": "Turning this off stops time-of-day and focus link and restores the default look.",
				"ctx.timeOfDay": "Time of day",
				"ctx.timeOfDayHint": "Small appearance shifts from the local clock (brightness impact ≤6%, no blur); never changes the wallpaper.",
				"ctx.timeOfDayTakeover": "While enabled it temporarily takes over overlays, glass and ambience; turning it off restores the previous look.",
				"ctx.period": "Period",
				"ctx.currentPeriod": "Current period: {period}",
				"ctx.manualPriority": "Manual override",
				"ctx.dawn": "Dawn",
				"ctx.day": "Day",
				"ctx.dusk": "Dusk",
				"ctx.night": "Night",
				"ctx.focus": "Focus link",
				"ctx.focusHint": "Dims and blurs the wallpaper while a reply is generating, then restores it; playback is never paused or changed.",
				"ctx.focusDim": "Dim",
				"ctx.focusBlur": "Blur",
				"ctx.focusActive": "Generating",
				"ctx.focusIdle": "Idle",
				"ctx.adaptive": "Adaptive performance",
				"ctx.adaptiveHint": "The wallpaper engine downgrades on its own frame rate; lock it to stop automatic changes.",
				"ctx.adaptiveLock": "Lock",
				"ctx.adaptiveUnlock": "Unlock",
				"ctx.adaptiveLocked": "Locked",
				"ctx.adaptiveState": "Engine state: {state}",
				"ctx.adaptiveUnknown": "Waiting for engine",
				"ctx.readout": "Runtime readout",
				"ctx.weather.title": "Weather link",
				"ctx.weather.privacyHint": "Off by default with zero network requests; when enabled it only calls the public Open-Meteo API (no API key; sends only the city name or coordinates).",
				"ctx.weather.city": "City",
				"ctx.weather.cityPlaceholder": "City name (e.g. Shanghai)",
				"ctx.weather.resolve": "Find city",
				"ctx.weather.resolving": "Resolving city…",
				"ctx.weather.resolved": "Located: {name}",
				"ctx.weather.useLocation": "Use current location",
				"ctx.weather.locating": "Getting location…",
				"ctx.weather.locationReady": "Current location set",
				"ctx.weather.geocodeFailed": "City lookup failed — check the spelling or enter coordinates.",
				"ctx.weather.geolocationFailed": "Could not get the current location (denied or unavailable).",
				"ctx.weather.lat": "Latitude",
				"ctx.weather.lon": "Longitude",
				"ctx.weather.applyCoords": "Apply coordinates",
				"ctx.weather.coordsInvalid": "Invalid coordinates: latitude -90..90, longitude -180..180.",
				"ctx.weather.coordsApplied": "Coordinates updated",
				"ctx.weather.interval": "Poll interval",
				"ctx.weather.intervalValue": "{n} min",
				"ctx.weather.refresh": "Refresh now",
				"ctx.weather.refreshing": "Refreshing…",
				"ctx.weather.statusDisabled": "Off (zero network requests while off)",
				"ctx.weather.statusNoLocation": "Enabled — set a city or coordinates first.",
				"ctx.weather.statusWaiting": "Waiting for the first weather data…",
				"ctx.weather.statusLast": "{desc} · {temperature}°C · {time}",
				"ctx.weather.statusError": "Fetch failed: {reason} (silent retry)",
				"ctx.weather.conflictHint": "Time-of-day also drives ambiance; when both are on, the most recent change wins.",
				"ctx.weather.errorNetwork": "network unavailable",
				"ctx.weather.errorTimeout": "request timed out",
				"ctx.weather.errorInvalid": "invalid weather data",
				"ctx.weather.errorGeocode": "city lookup failed",
				"ctx.weather.errorGeolocation": "location failed",
				"ctx.weather.errorUnavailable": "context runtime not installed",
				"ctx.weather.descClear": "Clear",
				"ctx.weather.descMainlyClear": "Mainly clear",
				"ctx.weather.descPartlyCloudy": "Partly cloudy",
				"ctx.weather.descOvercast": "Overcast",
				"ctx.weather.descFog": "Fog",
				"ctx.weather.descDrizzle": "Drizzle",
				"ctx.weather.descRain": "Rain",
				"ctx.weather.descFreezing": "Freezing precipitation",
				"ctx.weather.descThunder": "Thunderstorm",
				"ctx.weather.descShowers": "Showers",
				"ctx.weather.descSnow": "Snow",
				"ctx.weather.descSnowShowers": "Snow showers",
				"ctx.weather.descUnknown": "Unknown weather",
				"ctx.impact": "Impact: wallpaper brightness {delta}",
				"ctx.timeOfDayOff": "Turn off period look",
				"ctx.restoreDefaults": "Restore defaults",
				"ctx.restoreDefaultsHint": "Turns off the period look, focus link, adaptive performance and weather, and restores default parameters.",
				"ctx.experimental.title": "Experimental (network required; may be restricted by Electron network policy)",
				"ctx.experimental.hint": "Off by default; network requests are only made after weather is enabled.",
				"ctx.weather.retry": "Retry",
				"ctx.weather.statusPrefix": "Status: {value}",
				"ctx.weather.geolocationHint": "Desktop (Electron) geolocation may be unavailable; failures keep the last data and show the reason.",
			},
		});

		function ContextPanelSection() {
			const i18n = useTl5I18n();
			const t = i18n.t;
			const [state, setState] = React.useState(() => contextController.state());
			const [runtime, setRuntime] = React.useState(() => readContextRuntimeInfo());
			// One subscription drives both the settings and the runtime readout: the
			// installer reconciles synchronously inside apply(), so by the time this
			// listener runs TL5_DIAG.context.period already reflects the applied period.
			React.useEffect(
				() =>
					contextController.subscribe((next) => {
						setState(next);
						setRuntime(readContextRuntimeInfo());
					}),
				[],
			);
			React.useEffect(() => {
				const timer = window.setInterval(() => setRuntime(readContextRuntimeInfo()), 2000);
				return () => window.clearInterval(timer);
			}, []);
			const [weather, setWeather] = React.useState(() => weatherController.read());
			const [weatherNotice, setWeatherNotice] = React.useState("");
			const [cityDraft, setCityDraft] = React.useState(() => weatherController.read().city);
			const [latDraft, setLatDraft] = React.useState(() => {
				const value = weatherController.read().latitude;
				return value === null ? "" : String(value);
			});
			const [lonDraft, setLonDraft] = React.useState(() => {
				const value = weatherController.read().longitude;
				return value === null ? "" : String(value);
			});
			React.useEffect(() => weatherController.subscribe((next) => setWeather(next)), []);
			const update = (patch) => contextController.apply(patch);
			const toggleButton = (label, active, onClick, disabled) =>
				React.createElement(
					"button",
					{
						type: "button",
						className: "tl-font-option",
						"data-active": active === true ? "" : undefined,
						disabled: disabled === true,
						onClick,
					},
					label,
				);
			const choices = (values, current, onPick, labelFor) =>
				React.createElement(
					"div",
					{ className: "tl-font-options" },
					values.map((value) =>
						React.createElement(
							"button",
							{
								key: value,
								type: "button",
								className: "tl-font-option",
								"data-active": current === value ? "" : undefined,
								onClick: () => onPick(value),
							},
							typeof labelFor === "function" ? labelFor(value) : String(value),
						),
					),
				);
			const slider = (label, value, min, max, step, onChange, disabled) =>
				React.createElement(
					"label",
					{ className: "tl-wall-slider" },
					React.createElement("span", null, label + " · " + value),
					React.createElement("input", {
						type: "range",
						min,
						max,
						step,
						value,
						disabled: disabled === true,
						onChange: (event) => onChange(Number(event.target.value)),
					}),
				);
			const row = (label, child) =>
				React.createElement(
					"div",
					{ className: "tl-fx-row" },
					React.createElement("span", { className: "tl-wall-label" }, label),
					child,
				);
			// ---- C4 weather: local view state + explicit user-gesture actions ----
			const validCoord = (value, limit) =>
				value !== null && value !== undefined && Number.isFinite(Number(value)) && Math.abs(Number(value)) <= limit;
			const weatherEnabled = weather.enabled === true;
			const weatherHasLocation = validCoord(weather.latitude, 90) && validCoord(weather.longitude, 180);
			const weatherStatusText = (() => {
				if (weatherEnabled !== true) return t("ctx.weather.statusDisabled");
				if (weatherHasLocation !== true) return t("ctx.weather.statusNoLocation");
				const errorKey = weatherErrorKey(weather.lastError);
				if (errorKey !== "") return t("ctx.weather.statusError", { reason: t(errorKey) });
				const last = weather.last;
				if (last === null || typeof last !== "object") return t("ctx.weather.statusWaiting");
				return t("ctx.weather.statusLast", {
					desc: t(weatherDescriptionKey(last.code)),
					temperature: String(last.temperatureC),
					time: formatWeatherTime(last.at),
				});
			})();
			const weatherConflict = weatherEnabled === true && state.timeOfDay === true;
			const updateWeather = (patch) => weatherController.apply(patch);
			const onResolveWeatherCity = async () => {
				if (weatherEnabled !== true) return;
				setWeatherNotice(t("ctx.weather.resolving"));
				const result = await weatherController.resolveCity(cityDraft);
				if (result !== null && result !== undefined && result.ok === true) {
					const name = result.name === undefined ? cityDraft.trim() : String(result.name);
					setCityDraft(name);
					setWeatherNotice(t("ctx.weather.resolved", { name }));
					return;
				}
				if (result !== null && result !== undefined && result.error === "aborted") {
					setWeatherNotice("");
					return;
				}
				setWeatherNotice(t("ctx.weather.geocodeFailed"));
			};
			const onUseWeatherLocation = async () => {
				if (weatherEnabled !== true) return;
				setWeatherNotice(t("ctx.weather.locating"));
				const result = await weatherController.useCurrentLocation();
				if (result !== null && result !== undefined && result.ok === true) {
					const next = weatherController.read();
					if (next.latitude !== null) setLatDraft(String(next.latitude));
					if (next.longitude !== null) setLonDraft(String(next.longitude));
					setWeatherNotice(t("ctx.weather.locationReady"));
					return;
				}
				if (result !== null && result !== undefined && result.error === "aborted") {
					setWeatherNotice("");
					return;
				}
				setWeatherNotice(t("ctx.weather.geolocationFailed"));
			};
			const onApplyWeatherCoords = () => {
				const result = weatherController.setManualLocation(latDraft, lonDraft);
				if (result.ok === true) {
					const next = weatherController.read();
					if (next.latitude !== null) setLatDraft(String(next.latitude));
					if (next.longitude !== null) setLonDraft(String(next.longitude));
					setWeatherNotice(t("ctx.weather.coordsApplied"));
					return;
				}
				setWeatherNotice(t("ctx.weather.coordsInvalid"));
			};
			const onRefreshWeather = async () => {
				if (weatherEnabled !== true) return;
				setWeatherNotice(t("ctx.weather.refreshing"));
				await weatherController.refresh();
				setWeatherNotice("");
			};
			/** v0.5.3: one button restores the whole ⑨ section to the safe defaults. */
			const restoreDefaults = () => {
				contextController.apply({ ...CONTEXT_DEFAULTS });
				weatherController.apply({
					enabled: false,
					city: "",
					latitude: null,
					longitude: null,
					intervalMin: 30,
					last: null,
					lastError: "",
				});
				setWeatherNotice("");
				setCityDraft("");
				setLatDraft("");
				setLonDraft("");
			};
			const manual = contextNormalizeManual(state.manualPeriod);
			const periodChoices = ["auto"].concat(CONTEXT_PERIODS);
			// Prefer the period the installer actually applied (TL5_DIAG.context.period) so
			// the readout is truthful in manual mode and right after a switch; fall back to
			// the local-clock computation only when the runtime is not installed.
			const appliedPeriod = CONTEXT_PERIODS.includes(runtime.appliedPeriod) ? runtime.appliedPeriod : "";
			const period = appliedPeriod !== "" ? appliedPeriod : contextEffectivePeriod();
			const periodLabel = period === "" ? t("common.off") : contextPeriodLabel(period);
			const manualPriority = manual !== "auto" && state.timeOfDay === true;
			// v0.5.3 conservative C1: only a bounded brightness shift, surfaced next to a
			// one-click off switch. No blur is ever applied by C1.
			const c1ImpactLabel = contextBrightnessLabel(period);
			const c1ImpactText = t("ctx.impact", { delta: c1ImpactLabel === "" ? "0%" : c1ImpactLabel });
			const weatherHasError = typeof weather.lastError === "string" && weather.lastError !== "";
			const weatherStatusLine = t("ctx.weather.statusPrefix", { value: weatherStatusText });
			const summaryParts = [];
			if (state.timeOfDay === true) {
				summaryParts.push(t("ctx.period") + " " + periodLabel + (manualPriority ? " · " + t("ctx.manualPriority") : ""));
			}
			if (state.focusLink === true) {
				summaryParts.push(t("ctx.focus") + (runtime.focusActive ? " · " + t("ctx.focusActive") : ""));
			}
			if (state.adaptiveLocked === true) summaryParts.push(t("ctx.adaptiveLocked"));
			const summary =
				state.enabled === false
					? t("common.off")
					: summaryParts.length === 0
						? t("ctx.idle")
						: summaryParts.join(" · ");
			const adaptiveStateText = runtime.raw === "" ? t("ctx.adaptiveUnknown") : runtime.raw;
			const dim = Math.min(90, Math.max(0, Number(state.focusDim) || 0));
			const blur = Math.min(24, Math.max(0, Number(state.focusBlur) || 0));
			return React.createElement(
				"details",
				{ className: "tl-wall-group", open: false, "data-tl-group": "context" },
				React.createElement(
					"summary",
					{ className: "tl-wall-group-summary" },
					React.createElement("span", { className: "tl-wall-step" }, "◐"),
					React.createElement("span", { className: "tl-wall-group-title" }, t("section.context")),
					React.createElement("span", { className: "tl-wall-summary-value" }, summary),
				),
				React.createElement(
					"div",
					{ className: "tl-fx-grid" },
					row(
						t("ctx.master"),
						toggleButton(state.enabled === true ? t("common.on") : t("common.off"), state.enabled === true, () =>
							update({ enabled: state.enabled !== true }),
						),
					),
					React.createElement("div", { className: "tl-fx-hint" }, t("ctx.masterHint")),
					React.createElement(
						"div",
						{ className: "tl-fx-row" },
						toggleButton(t("ctx.restoreDefaults"), false, restoreDefaults),
					),
					React.createElement("div", { className: "tl-fx-hint" }, t("ctx.restoreDefaultsHint")),
					row(
						t("ctx.timeOfDay"),
						toggleButton(state.timeOfDay === true ? t("common.on") : t("common.off"), state.timeOfDay === true, () =>
							update({ timeOfDay: state.timeOfDay !== true }),
						),
					),
					React.createElement("div", { className: "tl-fx-hint" }, t("ctx.timeOfDayHint")),
					React.createElement("div", { className: "tl-fx-hint" }, t("ctx.timeOfDayTakeover")),
					choices(
						periodChoices,
						manual,
						(value) => update({ manualPeriod: value }),
						(value) => (value === "auto" ? t("common.auto") : contextPeriodLabel(value)),
					),
					React.createElement(
						"div",
						{ className: "tl-ctx-readout" },
						t("ctx.currentPeriod", { period: periodLabel }) + (manualPriority ? " · " + t("ctx.manualPriority") : ""),
					),
					state.timeOfDay === true
						? React.createElement(
								"div",
								{ className: "tl-fx-row" },
								React.createElement("span", { className: "tl-wall-label" }, c1ImpactText),
								toggleButton(t("ctx.timeOfDayOff"), false, () => update({ timeOfDay: false })),
							)
						: null,
					row(
						t("ctx.focus"),
						toggleButton(state.focusLink === true ? t("common.on") : t("common.off"), state.focusLink === true, () =>
							update({ focusLink: state.focusLink !== true }),
						),
					),
					React.createElement("div", { className: "tl-fx-hint" }, t("ctx.focusHint")),
					slider(
						t("ctx.focusDim"),
						dim,
						0,
						90,
						5,
						(value) => update({ focusDim: value }),
						state.focusLink !== true,
					),
					slider(
						t("ctx.focusBlur"),
						blur,
						0,
						24,
						1,
						(value) => update({ focusBlur: value }),
						state.focusLink !== true,
					),
					row(
						t("ctx.adaptive"),
						toggleButton(state.adaptive === true ? t("common.on") : t("common.off"), state.adaptive === true, () =>
							update({ adaptive: state.adaptive !== true }),
						),
					),
					React.createElement("div", { className: "tl-fx-hint" }, t("ctx.adaptiveHint")),
					row(
						t("ctx.adaptiveLock"),
						toggleButton(
							runtime.adaptiveLocked ? t("ctx.adaptiveLocked") : t("ctx.adaptiveLock"),
							runtime.adaptiveLocked,
							() => update({ adaptiveLocked: runtime.adaptiveLocked === false }),
						),
					),
					React.createElement(
						"div",
						{ className: "tl-ctx-readout" },
						t("ctx.readout") + "\n" + t("ctx.adaptiveState", { state: adaptiveStateText }),
					),
					React.createElement(
						"details",
						{ className: "tl-ctx-exp", open: false, "data-tl-group": "experimental" },
						React.createElement("summary", { className: "tl-ctx-exp-title" }, t("ctx.experimental.title")),
						React.createElement(
							"div",
							{ className: "tl-ctx-weather" },
							React.createElement("div", { className: "tl-fx-hint" }, t("ctx.experimental.hint")),
							row(
								t("ctx.weather.title"),
								toggleButton(weatherEnabled ? t("common.on") : t("common.off"), weatherEnabled, () =>
									updateWeather({ enabled: weather.enabled !== true }),
								),
							),
							React.createElement("div", { className: "tl-fx-hint" }, t("ctx.weather.privacyHint")),
						React.createElement(
							"div",
							{ className: "tl-fx-row" },
							React.createElement("span", { className: "tl-wall-label" }, t("ctx.weather.city")),
							React.createElement("input", {
								className: "tl-ctx-input",
								type: "text",
								value: cityDraft,
								placeholder: t("ctx.weather.cityPlaceholder"),
								disabled: weatherEnabled !== true,
								onChange: (event) => setCityDraft(event.target.value),
							}),
							React.createElement(
								"button",
								{ type: "button", className: "tl-font-option", disabled: weatherEnabled !== true, onClick: onResolveWeatherCity },
								t("ctx.weather.resolve"),
							),
						),
						React.createElement(
							"div",
							{ className: "tl-fx-row" },
							React.createElement(
								"button",
								{ type: "button", className: "tl-font-option", disabled: weatherEnabled !== true, onClick: onUseWeatherLocation },
								t("ctx.weather.useLocation"),
							),
							React.createElement(
								"button",
								{
									type: "button",
									className: "tl-font-option",
									disabled: weatherEnabled !== true || weatherHasLocation !== true,
									onClick: onRefreshWeather,
								},
								t("ctx.weather.refresh"),
							),
							weatherHasError && weatherHasLocation === true
								? React.createElement(
										"button",
										{ type: "button", className: "tl-font-option", onClick: onRefreshWeather },
										t("ctx.weather.retry"),
									)
								: null,
						),
						React.createElement("div", { className: "tl-fx-hint" }, t("ctx.weather.geolocationHint")),
						React.createElement(
							"div",
							{ className: "tl-fx-row" },
							React.createElement("span", { className: "tl-wall-label" }, t("ctx.weather.lat")),
							React.createElement("input", {
								className: "tl-ctx-input tl-ctx-input-small",
								type: "text",
								inputMode: "decimal",
								value: latDraft,
								disabled: weatherEnabled !== true,
								onChange: (event) => setLatDraft(event.target.value),
							}),
							React.createElement("span", { className: "tl-wall-label" }, t("ctx.weather.lon")),
							React.createElement("input", {
								className: "tl-ctx-input tl-ctx-input-small",
								type: "text",
								inputMode: "decimal",
								value: lonDraft,
								disabled: weatherEnabled !== true,
								onChange: (event) => setLonDraft(event.target.value),
							}),
							React.createElement(
								"button",
								{ type: "button", className: "tl-font-option", disabled: weatherEnabled !== true, onClick: onApplyWeatherCoords },
								t("ctx.weather.applyCoords"),
							),
						),
						React.createElement(
							"div",
							{ className: "tl-fx-row" },
							React.createElement("span", { className: "tl-wall-label" }, t("ctx.weather.interval")),
							React.createElement(
								"div",
								{ className: "tl-font-options" },
								WEATHER_INTERVALS.map((minutes) =>
									React.createElement(
										"button",
										{
											key: minutes,
											type: "button",
											className: "tl-font-option",
											"data-active": weather.intervalMin === minutes ? "" : undefined,
											onClick: () => updateWeather({ intervalMin: minutes }),
										},
										t("ctx.weather.intervalValue", { n: minutes }),
									),
								),
							),
						),
						React.createElement(
							"div",
							{ className: "tl-ctx-readout" },
							weatherStatusLine + (weatherNotice === "" ? "" : "\n" + weatherNotice),
						),
						weatherConflict ? React.createElement("div", { className: "tl-fx-hint" }, t("ctx.weather.conflictHint")) : null,
						),
					),
				),
			);
		}

		if (React !== null) {
			registerTl5PanelSection({ id: "context", order: 810, title: "section.context", Component: ContextPanelSection });
		}

		registerTl5Css(String.raw`
/* ---- v0.5.0 C1 时段外观 / C2 专注联动（只作用于场景层，不碰应用与播放） ---- */
body[data-dsh-tianlight] {
	--tl-period-dim: 0;
	--tl-focus-brightness: 1;
	--tl-focus-blur: 0px;
}
body[data-dsh-tianlight][data-tl-period="dawn"] {
	--tl-period-dim: 0.02;
}
body[data-dsh-tianlight][data-tl-period="day"] {
	--tl-period-dim: 0;
}
body[data-dsh-tianlight][data-tl-period="dusk"] {
	--tl-period-dim: 0.03;
}
body[data-dsh-tianlight][data-tl-period="night"] {
	--tl-period-dim: 0.04;
}
body[data-dsh-tianlight][data-tl-period] [data-tl-scene]::after {
	content: "";
	position: absolute;
	inset: 0;
	pointer-events: none;
	background: linear-gradient(180deg, rgba(10, 20, 40, 0) 0%, rgba(6, 12, 26, 0.55) 100%);
	opacity: var(--tl-period-dim, 0);
	transition: opacity 900ms ease;
}
/* C1 swaps the overlay presets through layerController; fading the existing overlay
   opacity keeps a period change from popping. v0.5.3 keeps those presets subtle and
   never adds a blur/filter — the only filter in this fragment belongs to C2 below. */
body[data-dsh-tianlight] [data-tl-scene] > [data-tl-overlay] {
	transition: opacity 900ms ease;
}
/* C2 only: dim + optional blur, explicitly toggled by the user. */
body[data-dsh-tianlight][data-tl-focus="on"] [data-tl-scene] {
	filter: brightness(var(--tl-focus-brightness, 1)) blur(var(--tl-focus-blur, 0px));
	transition: filter 420ms ease;
}
body[data-dsh-tianlight] .tl-ctx-readout {
	font-family: var(--ds-font-family-code, monospace);
	font-size: 10px;
	line-height: 1.6;
	color: var(--tl-ink-soft);
	white-space: pre-wrap;
	word-break: break-word;
}
/* C4 lives behind an experimental <details>: collapsed by default, offline while off. */
body[data-dsh-tianlight] .tl-ctx-exp {
	min-width: 0;
	max-width: 100%;
	box-sizing: border-box;
	padding: 6px 8px;
	border-radius: 10px;
	border: 0.5px dashed var(--tl-line-strong);
	background: color-mix(in srgb, var(--tl-glass-fill) 45%, transparent);
}
body[data-dsh-tianlight] .tl-ctx-exp > summary {
	cursor: pointer;
	list-style: none;
	font-size: 10px;
	line-height: 1.5;
	color: var(--tl-ink-soft);
	overflow-wrap: anywhere;
}
body[data-dsh-tianlight] .tl-ctx-exp > summary::-webkit-details-marker {
	display: none;
}
body[data-dsh-tianlight] .tl-ctx-exp > summary::after {
	content: " ▸";
	color: var(--tl-ink-faint);
}
body[data-dsh-tianlight] .tl-ctx-exp[open] > summary {
	color: var(--tl-ink);
}
body[data-dsh-tianlight] .tl-ctx-exp[open] > summary::after {
	content: " ▾";
}
body[data-dsh-tianlight] .tl-ctx-exp > .tl-ctx-weather {
	border-top: 0;
	padding-top: 6px;
}
/* C4 weather block: same row/label language, separated by a hairline */
body[data-dsh-tianlight] .tl-ctx-weather {
	display: flex;
	flex-direction: column;
	gap: 8px;
	min-width: 0;
	max-width: 100%;
	padding-top: 8px;
	border-top: 0.5px solid var(--tl-line-strong);
	box-sizing: border-box;
}
body[data-dsh-tianlight] .tl-ctx-input {
	flex: 1 1 120px;
	min-width: 0;
	max-width: 100%;
	box-sizing: border-box;
	padding: 4px 8px;
	border-radius: 8px;
	border: 0.5px solid var(--tl-line-strong);
	background: var(--tl-glass-fill);
	color: var(--tl-ink);
	font-size: 11px;
	outline: none;
}
body[data-dsh-tianlight] .tl-ctx-input-small {
	flex: 0 1 68px;
	width: auto;
	min-width: 56px;
	max-width: 100%;
}
body[data-dsh-tianlight] .tl-ctx-input:focus {
	border-color: var(--tl-accent);
}
body[data-dsh-tianlight] .tl-ctx-input:disabled {
	opacity: 0.5;
}
/* ---- v0.5.2 窄宽/高 DPI 兜底：⑨ 情境分区不得横向溢出或被裁切 ----
   折叠面板内容宽约 320px - 内边距/滚动条（≈290px）；下列规则让每一行都能换行、
   控件按 border-box 计算并封顶 100%，长英文串在控件内部换行而不是撑破面板。 */
body[data-dsh-tianlight] [data-tl-group="context"] {
	box-sizing: border-box;
	min-width: 0;
	max-width: 100%;
	overflow-wrap: anywhere;
}
body[data-dsh-tianlight] [data-tl-group="context"] .tl-fx-grid,
body[data-dsh-tianlight] [data-tl-group="context"] .tl-fx-row,
body[data-dsh-tianlight] [data-tl-group="context"] .tl-font-options,
body[data-dsh-tianlight] [data-tl-group="context"] .tl-wall-slider {
	min-width: 0;
	max-width: 100%;
}
body[data-dsh-tianlight] [data-tl-group="context"] .tl-fx-row {
	flex-wrap: wrap;
}
body[data-dsh-tianlight] [data-tl-group="context"] .tl-fx-row > .tl-wall-label {
	flex: none;
}
body[data-dsh-tianlight] [data-tl-group="context"] input,
body[data-dsh-tianlight] [data-tl-group="context"] button {
	box-sizing: border-box;
	max-width: 100%;
}
body[data-dsh-tianlight] [data-tl-group="context"] .tl-font-option {
	flex: 0 1 auto;
	max-width: 100%;
	white-space: normal;
	overflow-wrap: anywhere;
	text-align: center;
}
body[data-dsh-tianlight] [data-tl-group="context"] .tl-fx-readout,
body[data-dsh-tianlight] [data-tl-group="context"] .tl-ctx-readout,
body[data-dsh-tianlight] [data-tl-group="context"] .tl-fx-hint {
	max-width: 100%;
	overflow-wrap: anywhere;
}
@media (prefers-reduced-motion: reduce) {
	body[data-dsh-tianlight][data-tl-period] [data-tl-scene]::after {
		transition: none;
	}
	body[data-dsh-tianlight] [data-tl-scene] > [data-tl-overlay] {
		transition: none;
	}
	body[data-dsh-tianlight][data-tl-focus="on"] [data-tl-scene] {
		transition: none;
	}
}
`);

		/**
		 * C1+C2 的唯一安装器。返回幂等 disposer：清掉唯一的 60 秒定时器、
		 * 断开 MutationObserver、取消 rAF、移除监听器、恢复 C1 开启前的外观、
		 * 并移除自己写上去的 body 属性/内联变量。
		 */
		function installContextRuntime(ctx) {
			// C1/C2 are client-only; ctx stays in the signature because 99-apply passes it.
			void ctx;
			const body = document.body;
			if (body === null) return () => {};
			// Host settings were adopted in apply() BEFORE this installer runs; refresh the
			// persisted model before wiring timers/observers so adopted values apply now.
			refreshContextState();
			refreshWeatherState();

			let alive = true;
			let clockTimer = 0;
			let appliedPeriod = "";
			let baseline = null;
			let lookApplied = false;
			let focusActive = false;
			let focusObserver = null;
			let focusRaf = 0;
			let lastDiagAt = 0;

			const hasChatRunning = () => {
				try {
					const root = document.documentElement;
					if (root === null) return false;
					if (root.hasAttribute("data-chat-running")) return true;
					return root.querySelector("[data-chat-running]") !== null;
				} catch {
					return false;
				}
			};

			// ---- C1 baseline: 只记录 C1 真正覆盖的三样东西，退出时原样还回去 ----
			const captureBaseline = () => {
				if (baseline !== null) return baseline;
				let layers = null;
				let glass = null;
				try {
					layers = typeof layerController.read === "function" ? layerController.read() : null;
				} catch {
					layers = null;
				}
				try {
					glass =
						glassController !== null && typeof glassController === "object" && typeof glassController.read === "function"
							? glassController.read()
							: null;
				} catch {
					glass = null;
				}
				const effects = effectsController.state();
				baseline = { layers, glass, ambience: effects.ambience, ambienceDensity: effects.ambienceDensity };
				return baseline;
			};
			const restoreBaseline = () => {
				const saved = baseline;
				baseline = null;
				lookApplied = false;
				appliedPeriod = "";
				// C1's only DOM side effect outside the controllers: the period-dim variable
				// (bounded to the brightness cap). Always remove it so "off" is pixel-identical.
				body.style.removeProperty("--tl-period-dim");
				if (saved === null) return;
				try {
					if (saved.layers !== null) layerController.apply(saved.layers);
				} catch (error) {
					note("context:restore-layers", error);
				}
				try {
					if (glassController !== null && saved.glass !== null) glassController.apply(saved.glass);
				} catch (error) {
					note("context:restore-glass", error);
				}
				try {
					effectsController.apply({ ambience: saved.ambience, ambienceDensity: saved.ambienceDensity });
				} catch (error) {
					note("context:restore-ambience", error);
				}
			};
			const applyPeriod = (period) => {
				if (period === "") {
					if (body.hasAttribute("data-tl-period")) body.removeAttribute("data-tl-period");
					restoreBaseline();
					return;
				}
				if (body.getAttribute("data-tl-period") !== period) body.setAttribute("data-tl-period", period);
				const look = CONTEXT_PERIOD_LOOKS[period];
				if (look === undefined) return;
				// The look table is the single source of truth for the dim value; the CSS
				// per-period defaults are only a fallback for a missed JS write.
				body.style.setProperty("--tl-period-dim", String(look.dim));
				if (period === appliedPeriod) return;
				captureBaseline();
				try {
					const layers = contextLookLayers(period);
					if (layers !== null) layerController.apply(layers);
				} catch (error) {
					note("context:layers", error);
				}
				try {
					if (glassController !== null && typeof glassController.apply === "function") glassController.apply(look.glass);
				} catch (error) {
					note("context:glass", error);
				}
				try {
					effectsController.apply({ ambience: look.ambience, ambienceDensity: look.ambienceDensity });
				} catch (error) {
					note("context:ambience", error);
				}
				appliedPeriod = period;
				lookApplied = true;
			};

			// ---- C2 focus link: 观察产品属性，rAF 合并写入 ----
			const setFocusAttr = (on) => {
				if (on === focusActive) return;
				focusActive = on;
				if (on) body.setAttribute("data-tl-focus", "on");
				else body.removeAttribute("data-tl-focus");
			};
			const applyFocusVars = () => {
				const state = contextController.state();
				if (state.enabled !== true || state.focusLink !== true) {
					body.style.removeProperty("--tl-focus-brightness");
					body.style.removeProperty("--tl-focus-blur");
					return;
				}
				const dim = Math.min(90, Math.max(0, Number(state.focusDim) || 0));
				const blur = Math.min(24, Math.max(0, Number(state.focusBlur) || 0));
				body.style.setProperty("--tl-focus-brightness", String(Math.max(0.15, 1 - dim / 100)));
				body.style.setProperty("--tl-focus-blur", String(blur) + "px");
			};
			const evaluateFocus = () => {
				focusRaf = 0;
				if (alive === false) return;
				const state = contextController.state();
				if (state.enabled !== true || state.focusLink !== true) {
					setFocusAttr(false);
					return;
				}
				if (document.hidden) return;
				setFocusAttr(hasChatRunning());
				publishDiag(true);
			};
			const scheduleFocusEvaluate = () => {
				if (alive === false || focusRaf !== 0) return;
				focusRaf = globalThis.requestAnimationFrame(evaluateFocus);
			};
			const syncFocusObserver = () => {
				const state = contextController.state();
				const wanted = state.enabled === true && state.focusLink === true;
				if (wanted && focusObserver === null) {
					try {
						focusObserver = new MutationObserver(() => scheduleFocusEvaluate());
						focusObserver.observe(document.documentElement, {
							attributes: true,
							attributeFilter: ["data-chat-running"],
							childList: true,
							subtree: true,
						});
						scheduleFocusEvaluate();
					} catch {
						focusObserver = null;
					}
				} else if (wanted === false && focusObserver !== null) {
					focusObserver.disconnect();
					focusObserver = null;
					setFocusAttr(false);
					if (focusRaf !== 0) {
						globalThis.cancelAnimationFrame(focusRaf);
						focusRaf = 0;
					}
				}
			};

			const publishDiag = (force) => {
				const now = performance.now();
				if (force !== true && now - lastDiagAt < 250) return;
				lastDiagAt = now;
				const state = contextController.state();
				const period = appliedPeriod;
				tl5Diag("context", {
					enabled: state.enabled === true,
					timeOfDay: state.timeOfDay === true,
					manualPeriod: contextNormalizeManual(state.manualPeriod),
					period,
					focusLink: state.focusLink === true,
					focusActive,
					adaptiveEnabled: state.adaptive === true,
					adaptiveLocked: state.adaptiveLocked === true,
					lookApplied,
					baselineCaptured: baseline !== null,
				});
			};

			const reconcile = (force) => {
				if (alive === false) return;
				applyPeriod(contextEffectivePeriod());
				syncFocusObserver();
				applyFocusVars();
				if (contextController.state().focusLink === true) scheduleFocusEvaluate();
				publishDiag(force === true);
			};

			// ---- C4 weather runtime: opt-in, keyless, silent, ambience only ----
			// Only runs while the context module is installed (module switch disposes it).
			// No request while weather.enabled is false; location is never inferred.
			let weatherTimer = 0;
			let weatherTimerInterval = 0;
			let weatherRetryTimer = 0;
			let weatherRetryUsed = false;
			let weatherRequestToken = 0;
			let weatherScheduleKey = "";
			const weatherAborters = new Set();
			const weatherTimeouts = new Set();

			const weatherHasLocation = () => {
				const state = weatherController.state();
				return (
					state.latitude !== null &&
					state.longitude !== null &&
					Number.isFinite(Number(state.latitude)) &&
					Number.isFinite(Number(state.longitude)) &&
					Math.abs(Number(state.latitude)) <= 90 &&
					Math.abs(Number(state.longitude)) <= 180
				);
			};
			const weatherForecastUrl = (state) =>
				WEATHER_FORECAST_ENDPOINT +
				"?latitude=" +
				encodeURIComponent(String(state.latitude)) +
				"&longitude=" +
				encodeURIComponent(String(state.longitude)) +
				"&current=temperature_2m,weather_code,is_day&timezone=auto";
			const clearWeatherTimer = () => {
				if (weatherTimer !== 0) {
					window.clearInterval(weatherTimer);
					weatherTimer = 0;
				}
				weatherTimerInterval = 0;
			};
			const clearWeatherRetry = () => {
				if (weatherRetryTimer !== 0) {
					window.clearTimeout(weatherRetryTimer);
					weatherRetryTimer = 0;
				}
			};
			const clearWeatherRequests = () => {
				for (const controller of [...weatherAborters]) {
					try {
						controller.abort();
					} catch {
						// already aborted
					}
				}
				weatherAborters.clear();
				for (const timeoutId of [...weatherTimeouts]) window.clearTimeout(timeoutId);
				weatherTimeouts.clear();
			};
			const weatherOpenRequest = () => {
				const request = { controller: new AbortController(), timeoutId: 0, timedOut: false };
				weatherAborters.add(request.controller);
				request.timeoutId = window.setTimeout(() => {
					request.timedOut = true;
					try {
						request.controller.abort();
					} catch {
						// already aborted
					}
				}, WEATHER_TIMEOUT_MS);
				weatherTimeouts.add(request.timeoutId);
				return request;
			};
			const weatherCloseRequest = (request) => {
				if (request.timeoutId !== 0) {
					window.clearTimeout(request.timeoutId);
					weatherTimeouts.delete(request.timeoutId);
					request.timeoutId = 0;
				}
				weatherAborters.delete(request.controller);
			};
			const setWeatherError = (code) => {
				// Silent for the user; only persist when the reason actually changes so a
				// flapping endpoint cannot churn localStorage.
				if (weatherState.lastError === code) return;
				weatherController.apply({ lastError: code });
			};
			const publishWeatherDiag = () => {
				const state = weatherController.state();
				tl5Diag("context", {
					weather: {
						enabled: state.enabled === true,
						provider: state.provider,
						city: state.city,
						latitude: state.latitude,
						longitude: state.longitude,
						intervalMin: state.intervalMin,
						last: state.last,
						lastError: state.lastError,
					},
				});
			};
			/** 只改 effectsController 的 ambience：壁纸/玻璃/叠加层不归 C4 管。 */
			const applyWeatherAmbience = (code, isDay) => {
				const next = weatherAmbienceFor(code, isDay);
				const current = effectsController.state();
				if (current.ambience === next.ambience && current.ambienceDensity === next.ambienceDensity) return;
				try {
					effectsController.apply({ ambience: next.ambience, ambienceDensity: next.ambienceDensity });
				} catch (error) {
					note("context:weather-ambience", error);
				}
			};
			const scheduleWeatherRetry = () => {
				// Bounded: at most one 60s retry per failure burst; the regular interval
				// retries afterwards, so a dead endpoint never becomes a tight loop.
				if (alive === false || weatherRetryUsed === true || weatherRetryTimer !== 0) return;
				const state = weatherController.state();
				if (state.enabled !== true || weatherHasLocation() !== true) return;
				weatherRetryUsed = true;
				weatherRetryTimer = window.setTimeout(() => {
					weatherRetryTimer = 0;
					if (alive === false || document.hidden) return;
					const current = weatherController.state();
					if (current.enabled !== true || weatherHasLocation() !== true) return;
					void fetchWeather("retry");
				}, WEATHER_RETRY_MS);
			};
			const fetchWeather = async (source) => {
				if (alive === false) return false;
				if (typeof AbortController !== "function") return false;
				const state = weatherController.state();
				if (state.enabled !== true || weatherHasLocation() !== true) return false;
				if (source !== "retry") weatherRetryUsed = false;
				const token = (weatherRequestToken += 1);
				const request = weatherOpenRequest();
				try {
					const response = await fetch(weatherForecastUrl(state), { signal: request.controller.signal, cache: "no-store" });
					if (alive === false || token !== weatherRequestToken) return false;
					if (response === null || response === undefined || response.ok !== true) {
						setWeatherError("network");
						scheduleWeatherRetry();
						return false;
					}
					const payload = await response.json();
					if (alive === false || token !== weatherRequestToken) return false;
					if (weatherController.state().enabled !== true) return false;
					const last = normalizeWeatherForecast(payload);
					if (last === null) {
						setWeatherError("invalid");
						scheduleWeatherRetry();
						return false;
					}
					weatherRetryUsed = false;
					weatherController.apply({ last, lastError: "" });
					applyWeatherAmbience(last.code, last.isDay);
					return true;
				} catch (error) {
					if (alive === false || token !== weatherRequestToken) return false;
					const reason =
						request.timedOut === true || (error !== null && error !== undefined && error.name === "AbortError")
							? "timeout"
							: "network";
					setWeatherError(reason);
					scheduleWeatherRetry();
					return false;
				} finally {
					weatherCloseRequest(request);
				}
			};
			const resolveWeatherCity = async (query) => {
				if (alive === false) return { ok: false, error: "aborted" };
				if (typeof AbortController !== "function") return { ok: false, error: "unavailable" };
				const state = weatherController.state();
				// Explicitly enabled only: the geocoding request is network traffic.
				if (state.enabled !== true) return { ok: false, error: "unavailable" };
				const name = String(query === undefined || query === null ? state.city : query).trim().slice(0, 80);
				if (name === "") return { ok: false, error: "geocode" };
				const token = (weatherRequestToken += 1);
				const request = weatherOpenRequest();
				try {
					const url =
						WEATHER_GEOCODE_ENDPOINT + "?name=" + encodeURIComponent(name) + "&count=1&language=zh&format=json";
					const response = await fetch(url, { signal: request.controller.signal, cache: "no-store" });
					if (alive === false || token !== weatherRequestToken) return { ok: false, error: "aborted" };
					if (response === null || response === undefined || response.ok !== true) {
						setWeatherError("network");
						return { ok: false, error: "network" };
					}
					const payload = await response.json();
					if (alive === false || token !== weatherRequestToken) return { ok: false, error: "aborted" };
					if (weatherController.state().enabled !== true) return { ok: false, error: "aborted" };
					const first =
						payload !== null && typeof payload === "object" && Array.isArray(payload.results) ? payload.results[0] : null;
					const latitude = normalizeWeatherCoordinate(first === null || first === undefined ? null : first.latitude, 90);
					const longitude = normalizeWeatherCoordinate(first === null || first === undefined ? null : first.longitude, 180);
					if (latitude === null || longitude === null) {
						setWeatherError("geocode");
						return { ok: false, error: "geocode" };
					}
					const resolved =
						String((first === null || first === undefined ? "" : first.name) ?? name)
							.trim()
							.slice(0, 80) || name;
					weatherController.apply({ city: resolved, latitude, longitude, lastError: "" });
					return { ok: true, name: resolved };
				} catch (error) {
					if (alive === false || token !== weatherRequestToken) return { ok: false, error: "aborted" };
					const reason =
						request.timedOut === true || (error !== null && error !== undefined && error.name === "AbortError")
							? "timeout"
							: "network";
					setWeatherError(reason);
					return { ok: false, error: reason };
				} finally {
					weatherCloseRequest(request);
				}
			};
			/** 只在用户显式点击时调用；绝不自动请求定位权限。 */
			const useWeatherCurrentLocation = () =>
				new Promise((resolve) => {
					if (alive === false) {
						resolve({ ok: false, error: "aborted" });
						return;
					}
					if (weatherController.state().enabled !== true) {
						resolve({ ok: false, error: "unavailable" });
						return;
					}
					let geolocation = null;
					try {
						geolocation = globalThis.navigator?.geolocation ?? null;
					} catch {
						geolocation = null;
					}
					if (geolocation === null || typeof geolocation.getCurrentPosition !== "function") {
						setWeatherError("geolocation");
						resolve({ ok: false, error: "geolocation" });
						return;
					}
					let settled = false;
					const finish = (result) => {
						if (settled) return;
						settled = true;
						resolve(result);
					};
					try {
						geolocation.getCurrentPosition(
							(position) => {
								if (alive === false) {
									finish({ ok: false, error: "aborted" });
									return;
								}
								const latitude = normalizeWeatherCoordinate(
									position === null || position === undefined ? null : position.coords?.latitude,
									90,
								);
								const longitude = normalizeWeatherCoordinate(
									position === null || position === undefined ? null : position.coords?.longitude,
									180,
								);
								if (latitude === null || longitude === null) {
									setWeatherError("geolocation");
									finish({ ok: false, error: "geolocation" });
									return;
								}
								weatherController.apply({ latitude, longitude, lastError: "" });
								finish({ ok: true });
							},
							() => {
								if (alive === false) {
									finish({ ok: false, error: "aborted" });
									return;
								}
								setWeatherError("geolocation");
								finish({ ok: false, error: "geolocation" });
							},
							{ enableHighAccuracy: false, timeout: WEATHER_TIMEOUT_MS, maximumAge: 600000 },
						);
					} catch {
						setWeatherError("geolocation");
						finish({ ok: false, error: "geolocation" });
					}
				});
			const weatherIntervalTick = () => {
				if (alive === false || document.hidden) return;
				const state = weatherController.state();
				if (state.enabled !== true || weatherHasLocation() !== true) return;
				void fetchWeather("interval");
			};
			/**
			 * 排程唯一入口：启用/位置/间隔变化时立即抓一次；轮询按 intervalMin。
			 * 关闭时同时清理 interval 与重试，保持零请求、零定时器。
			 */
			const reconcileWeather = (force) => {
				if (alive === false) return;
				const state = weatherController.state();
				const wanted = state.enabled === true && weatherHasLocation() === true;
				if (wanted !== true) {
					clearWeatherTimer();
					clearWeatherRetry();
					weatherScheduleKey = "";
					publishWeatherDiag();
					return;
				}
				const interval = WEATHER_INTERVALS.includes(Number(state.intervalMin)) ? Number(state.intervalMin) : 30;
				if (weatherTimer === 0 || weatherTimerInterval !== interval) {
					clearWeatherTimer();
					weatherTimerInterval = interval;
					weatherTimer = window.setInterval(weatherIntervalTick, interval * 60000);
				}
				const key =
					String(state.enabled) + "|" + String(state.latitude) + "|" + String(state.longitude) + "|" + String(interval);
				const changed = key !== weatherScheduleKey;
				weatherScheduleKey = key;
				if (force === true || changed) void fetchWeather(changed ? "enable" : "manual");
				publishWeatherDiag();
			};
			weatherRuntime = {
				refresh: () => fetchWeather("manual"),
				resolveCity: (query) => resolveWeatherCity(query),
				useCurrentLocation: () => useWeatherCurrentLocation(),
			};
			const unsubscribeWeather = weatherController.subscribe(() => reconcileWeather(false));

			// ONE interval for C1: 60s, no writes while hidden or in manual mode.
			clockTimer = window.setInterval(() => {
				if (alive === false) return;
				const state = contextController.state();
				if (state.enabled !== true || state.timeOfDay !== true) return;
				if (contextNormalizeManual(state.manualPeriod) !== "auto") return;
				if (document.hidden) return;
				const period = contextEffectivePeriod();
				if (period !== appliedPeriod) reconcile(false);
			}, 60000);

			const onVisibilityChange = () => {
				if (document.hidden) {
					if (focusRaf !== 0) {
						globalThis.cancelAnimationFrame(focusRaf);
						focusRaf = 0;
					}
					return;
				}
				reconcile(false);
				// C4: refresh immediately when the tab becomes visible again; ticks that
				// happened while hidden were skipped (no background network traffic).
				reconcileWeather(true);
			};
			const unsubscribe = contextController.subscribe(() => reconcile(true));
			document.addEventListener("visibilitychange", onVisibilityChange);
			reconcile(true);
			reconcileWeather(false);

			return () => {
				if (alive === false) return;
				alive = false;
				if (clockTimer !== 0) {
					window.clearInterval(clockTimer);
					clockTimer = 0;
				}
				if (focusRaf !== 0) {
					globalThis.cancelAnimationFrame(focusRaf);
					focusRaf = 0;
				}
				if (focusObserver !== null) {
					try {
						focusObserver.disconnect();
					} catch {
						// already disconnected
					}
					focusObserver = null;
				}
				unsubscribe();
				unsubscribeWeather();
				weatherRuntime = null;
				clearWeatherTimer();
				clearWeatherRetry();
				clearWeatherRequests();
				document.removeEventListener("visibilitychange", onVisibilityChange);
				setFocusAttr(false);
				body.removeAttribute("data-tl-period");
				body.style.removeProperty("--tl-focus-brightness");
				body.style.removeProperty("--tl-focus-blur");
				restoreBaseline();
				publishWeatherDiag();
				publishDiag(true);
			};
		}
		//#endregion
		//#region companion
		/** Inline SVG fallback so the companion exists before any art is dropped in. */
		const CAT_SVG = (() => {
			const svg =
				"<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'>" +
				"<defs><linearGradient id='g' x1='0' y1='0' x2='0' y2='1'>" +
				"<stop offset='0' stop-color='#b6f4e2'/><stop offset='1' stop-color='#5ed3b3'/>" +
				"</linearGradient></defs>" +
				"<path d='M92 84 q17 -3 13 -21' stroke='#5ed3b3' stroke-width='9' fill='none' stroke-linecap='round'/>" +
				"<ellipse cx='60' cy='87' rx='26' ry='20' fill='url(#g)'/>" +
				"<path d='M36 43 l-5 -19 17 9 z' fill='#5ed3b3'/>" +
				"<path d='M84 43 l5 -19 -17 9 z' fill='#5ed3b3'/>" +
				"<circle cx='60' cy='52' r='26' fill='url(#g)'/>" +
				"<path d='M40 40 l-2 -10 9 5 z' fill='#ffb7c9'/>" +
				"<path d='M80 40 l2 -10 -9 5 z' fill='#ffb7c9'/>" +
				"<ellipse cx='50' cy='52' rx='4.6' ry='5.8' fill='#123b33'/>" +
				"<ellipse cx='70' cy='52' rx='4.6' ry='5.8' fill='#123b33'/>" +
				"<circle cx='51.7' cy='49.8' r='1.7' fill='#ffffff'/>" +
				"<circle cx='71.7' cy='49.8' r='1.7' fill='#ffffff'/>" +
				"<ellipse cx='42' cy='60' rx='5' ry='3' fill='#ffb7c9' fill-opacity='.8'/>" +
				"<ellipse cx='78' cy='60' rx='5' ry='3' fill='#ffb7c9' fill-opacity='.8'/>" +
				"<path d='M56 60 q4 4.4 8 0' stroke='#123b33' stroke-width='2' fill='none' stroke-linecap='round'/>" +
				"<g stroke='#8fe6cf' stroke-width='1.7' stroke-linecap='round'>" +
				"<path d='M33 53 h-11'/><path d='M33 60 h-10'/>" +
				"<path d='M87 53 h11'/><path d='M87 60 h10'/>" +
				"</g></svg>";
			return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
		})();

		// ---- v0.7.0 duty channel (role pack → pet) ----
		// The companion module is switchable at runtime; the duty channel is always
		// installed and reaches the pet through this mutable holder. A null `api`
		// means the companion is currently off, and inbound actions degrade to
		// `{ ok: false, reason: "companion-off" }` instead of throwing.
		// v1.1: `lifeGate(action)` is registered by the life-rhythm engine (same closure)
		// and may defer an interrupt; null / non-function means "no gate" (v0.7 behavior).
		const companionDutyBridge = { api: null, lifeGate: null };
		const DUTY_CHANNEL_VERSION = 1;
		const DUTY_EVENT = "tianlight:duty";
		const DUTY_ACTION_EVENT = "tianlight:duty-action";
		const DUTY_CHOICE_LABELS = {
			later: "duty.choice.later",
			mute: "duty.choice.mute",
			snoozeUntilBreak: "duty.choice.snoozeUntilBreak",
			budgetDown: "duty.choice.budgetDown",
			budgetUp: "duty.choice.budgetUp",
		};
		const DUTY_LIMITS = {
			text: 200,
			signalId: 64,
			choiceId: 40,
			choiceLabel: 40,
			choices: 5,
			ttlDefault: 12000,
			ttlMax: 120000,
			speakTtlDefault: 8000,
		};

		// v0.5.0：桌宠台词全部走 i18n key，语言切换无需重载（订阅后刷新按钮文案）。
		registerTl5Strings({
			zh: {
				"pet.near.1": "喵？",
				"pet.near.2": "你靠得好近…",
				"pet.near.3": "（歪头）",
				"pet.near.4": "薄荷味的风？",
				"pet.pet.1": "呼噜呼噜…",
				"pet.pet.2": "再摸摸嘛～",
				"pet.pet.3": "唔…舒服",
				"pet.pet.4": "耳朵不可以揪啦",
				"pet.feed.1": "是小鱼干！",
				"pet.feed.2": "薄荷味儿的最好吃",
				"pet.feed.3": "还想再来一条",
				"pet.play.1": "逗猫棒！接住！",
				"pet.play.2": "啪！抓住了",
				"pet.play.3": "再来一次！",
				"pet.nap.1": "zzZ…",
				"pet.nap.2": "困了…",
				"pet.nap.3": "先眯一会儿",
				"pet.idle.1": "……有点无聊",
				"pet.idle.2": "看着窗外的云",
				"pet.idle.3": "今天天光真好",
				"pet.idle.4": "陪我待会儿？",
				"pet.hello": "喵～我来啦",
				"pet.aria": "薄荷小猫：可拖拽，点击打开互动菜单",
				"pet.action.pet": "摸摸",
				"pet.action.feed": "喂食",
				"pet.action.play": "逗猫棒",
				"pet.action.nap": "小睡",
				"pet.action.mute": "静音 1 小时",
				"pet.action.focus": "专注 25 分钟",
				"pet.act.mute": "好，安静一小时",
				"pet.act.focusStart": "专注 25 分钟，开始",
				"pet.act.focusStop": "专注结束，歇口气吧",
				"duty.choice.later": "等会儿",
				"duty.choice.mute": "静音 1 小时",
				"duty.choice.snoozeUntilBreak": "休息时再说",
				"duty.choice.budgetDown": "少打扰一点",
				"duty.choice.budgetUp": "可以多提醒",
				"duty.aria": "职责气泡：可稍后处理或静音",
			},
			en: {
				"pet.near.1": "Meow?",
				"pet.near.2": "You're really close…",
				"pet.near.3": "(head tilt)",
				"pet.near.4": "Minty breeze?",
				"pet.pet.1": "Purr purr…",
				"pet.pet.2": "Pet me more~",
				"pet.pet.3": "Mmm… that's nice",
				"pet.pet.4": "No ear pulling!",
				"pet.feed.1": "A dried fish!",
				"pet.feed.2": "Mint flavor is the best",
				"pet.feed.3": "One more, please",
				"pet.play.1": "The wand! Catch!",
				"pet.play.2": "Got it!",
				"pet.play.3": "Again!",
				"pet.nap.1": "zzZ…",
				"pet.nap.2": "Sleepy…",
				"pet.nap.3": "Just a quick nap",
				"pet.idle.1": "…I'm a little bored",
				"pet.idle.2": "Watching the clouds",
				"pet.idle.3": "Lovely light today",
				"pet.idle.4": "Stay with me?",
				"pet.hello": "Meow~ I'm here",
				"pet.aria": "Mint cat: draggable, click to open the interaction menu",
				"pet.action.pet": "Pet",
				"pet.action.feed": "Feed",
				"pet.action.play": "Wand",
				"pet.action.nap": "Nap",
				"pet.action.mute": "Mute 1h",
				"pet.action.focus": "Focus 25m",
				"pet.act.mute": "Okay, quiet for an hour",
				"pet.act.focusStart": "Focusing for 25 minutes",
				"pet.act.focusStop": "Focus done. Take a breather",
				"duty.choice.later": "Later",
				"duty.choice.mute": "Mute 1h",
				"duty.choice.snoozeUntilBreak": "Tell me at break",
				"duty.choice.budgetDown": "Fewer interruptions",
				"duty.choice.budgetUp": "More reminders",
				"duty.aria": "Duty bubble: snooze or mute",
			},
		});

		const LINES = {
			near: ["pet.near.1", "pet.near.2", "pet.near.3", "pet.near.4"],
			pet: ["pet.pet.1", "pet.pet.2", "pet.pet.3", "pet.pet.4"],
			feed: ["pet.feed.1", "pet.feed.2", "pet.feed.3"],
			play: ["pet.play.1", "pet.play.2", "pet.play.3"],
			nap: ["pet.nap.1", "pet.nap.2", "pet.nap.3"],
			idle: ["pet.idle.1", "pet.idle.2", "pet.idle.3", "pet.idle.4"],
		};

		function pick(list) {
			return list[Math.floor(Math.random() * list.length)];
		}

		function loadState() {
			try {
				const raw = window.localStorage.getItem(STORAGE_KEY);
				if (raw === null) return null;
				const value = JSON.parse(raw);
				if (typeof value !== "object" || value === null) return null;
				return {
					x: Number.isFinite(value.x) ? value.x : null,
					y: Number.isFinite(value.y) ? value.y : null,
					mood: Number.isFinite(value.mood) ? Math.min(100, Math.max(0, value.mood)) : 62,
				};
			} catch {
				return null;
			}
		}

		// v1.0.0 energy: localStorage writes are synchronous, so only persist when a
		// value the user can observe actually changed. The baseline is reset whenever a
		// companion instance loads its saved state.
		let lastSavedState = null;
		function saveState(value) {
			const next = { x: value.x, y: value.y, mood: value.mood };
			if (
				lastSavedState !== null &&
				lastSavedState.x === next.x &&
				lastSavedState.y === next.y &&
				lastSavedState.mood === next.mood
			) {
				return;
			}
			lastSavedState = next;
			try {
				window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
			} catch {
				/* storage is a convenience, never a requirement */
			}
		}

		/**
		 * The desktop companion: draggable, proximity-aware, with a small mood
		 * model and a menu of interactions. Everything it owns is torn down by the
		 * returned disposer.
		 */
		function installCompanion() {
			const saved = loadState();
			// Matches the installed artwork (1130x569, about 2:1); keep in sync with the
			// `[data-tl-cat]` box in the stylesheet.
			const PET_WIDTH = 150;
			const PET_HEIGHT = 86;
			const state = {
				x: saved?.x ?? Math.max(16, window.innerWidth - PET_WIDTH - 32),
				y: saved?.y ?? Math.max(16, window.innerHeight - PET_HEIGHT - 210),
				mood: saved?.mood ?? 62,
			};
			lastSavedState = saved === null ? null : { x: state.x, y: state.y, mood: state.mood };

			const root = document.createElement("div");
			root.dataset.tlCat = "";
			root.setAttribute("role", "button");
			root.setAttribute("tabindex", "0");
			root.setAttribute("aria-label", TL_T("pet.aria"));

			const bubble = document.createElement("div");
			// Own attribute namespace: the selector bridge stamps PRODUCT message bubbles
			// with data-tl-bubble, and sharing the name made the bridge's glass rules leak
			// onto the companion's speech bubble.
			bubble.dataset.tlSay = "";
			root.appendChild(bubble);

			// Duty bubble: a second, action-capable bubble owned by the duty channel.
			// It is a sibling of the say bubble so ordinary pet speech can never
			// overwrite a pending duty request (and vice versa).
			const dutyBubble = document.createElement("div");
			dutyBubble.dataset.tlDuty = "";
			dutyBubble.setAttribute("role", "group");
			dutyBubble.setAttribute("aria-label", TL_T("duty.aria"));
			const dutyText = document.createElement("div");
			dutyText.dataset.tlDutyText = "";
			dutyText.setAttribute("role", "status");
			dutyText.setAttribute("aria-live", "polite");
			const dutyChoices = document.createElement("div");
			dutyChoices.dataset.tlDutyChoices = "";
			dutyBubble.append(dutyText, dutyChoices);
			root.appendChild(dutyBubble);

			const bodyWrap = document.createElement("div");
			bodyWrap.dataset.tlCatBody = "";
			// v1.0.0 replaceable art: the body container always owns BOTH the static
			// <img> and a silent looping <video>. Exactly one of them paints, decided by
			// `data-tl-cat-media` on the root node (stylesheet contract), so a media
			// switch is a src swap and never a DOM rebuild.
			bodyWrap.dataset.tlCatMedia = "image";
			const image = document.createElement("img");
			image.alt = "";
			image.draggable = false;
			// The hand-authored vector is the guaranteed baseline; real art replaces
			// it only once the host manifest confirms the file is installed.
			image.src = CAT_SVG;
			const video = document.createElement("video");
			video.dataset.tlCatVideo = "";
			// Life-rhythm clips are decorative and short (≤32 MiB): silent, looping,
			// inline, metadata-only preload, no controls, never picture-in-picture.
			video.muted = true;
			video.playsInline = true;
			video.loop = true;
			video.autoplay = true;
			video.preload = "metadata";
			video.disablePictureInPicture = true;
			video.setAttribute("muted", "");
			video.setAttribute("playsinline", "");
			video.setAttribute("aria-hidden", "true");
			video.hidden = true;
			bodyWrap.appendChild(image);
			bodyWrap.appendChild(video);
			root.dataset.tlCatMedia = "image";

			// ---- v1.0.0 media runtime (image or ≤32 MiB video from the life engine) ----
			// The life layer is the single source of truth for the chosen media: it
			// resolves/persists it and republishes changes as `tianlight:pet-media`
			// (detail = media | null) on `document`. Every path below is fail-soft, so a
			// missing or misbehaving life engine only costs the replacement art.
			let currentMedia = null;
			let builtInArt = CAT_SVG;
			let imageFallbackUsed = false;
			const stopVideo = () => {
				try {
					video.pause();
				} catch (error) {
					note("companion:video-pause", error);
				}
				try {
					if (video.getAttribute("src") !== null) {
						video.removeAttribute("src");
						video.load?.();
					}
				} catch (error) {
					note("companion:video-clear", error);
				}
			};
			const playVideo = () => {
				try {
					const played = video.play?.();
					if (played !== null && played !== undefined && typeof played.catch === "function") {
						played.catch(() => {});
					}
				} catch (error) {
					note("companion:video-play", error);
				}
			};
			const showImage = (url) => {
				currentMedia = { kind: "image", url };
				root.dataset.tlCatMedia = "image";
				bodyWrap.dataset.tlCatMedia = "image";
				image.hidden = false;
				video.hidden = true;
				stopVideo();
				imageFallbackUsed = false;
				image.src = url;
			};
			const showVideo = (url) => {
				currentMedia = { kind: "video", url };
				root.dataset.tlCatMedia = "video";
				bodyWrap.dataset.tlCatMedia = "video";
				video.hidden = false;
				image.hidden = true;
				imageFallbackUsed = false;
				video.src = url;
				playVideo();
			};
			const useBuiltInArt = () => {
				currentMedia = null;
				root.dataset.tlCatMedia = "image";
				bodyWrap.dataset.tlCatMedia = "image";
				image.hidden = false;
				video.hidden = true;
				stopVideo();
				imageFallbackUsed = false;
				image.src = builtInArt;
			};
			/** Apply a media object; returns false when it is not a usable media record. */
			const applyMedia = (media) => {
				if (media === null || typeof media !== "object") return false;
				const kind = media.kind;
				const url = typeof media.url === "string" ? media.url : "";
				if ((kind !== "image" && kind !== "video") || url === "") return false;
				if (currentMedia !== null && currentMedia.kind === kind && currentMedia.url === url) {
					// Same media re-announced: never restart a playing clip.
					if (kind === "video" && video.paused === true) playVideo();
					return true;
				}
				if (kind === "video") showVideo(url);
				else showImage(url);
				return true;
			};
			const readLifeMedia = () => {
				try {
					const life = globalThis.tianlightLife;
					if (life === null || life === undefined || typeof life.media !== "function") return null;
					return life.media();
				} catch (error) {
					note("companion:media-read", error);
					return null;
				}
			};
			// A failed replacement image degrades to the built-in vector, never to a
			// broken-image glyph; the flag stops a retry loop if even that fails.
			image.addEventListener("error", () => {
				try {
					if (root.dataset.tlCatMedia !== "image" || imageFallbackUsed) return;
					imageFallbackUsed = true;
					if (image.getAttribute("src") === CAT_SVG) return;
					image.src = CAT_SVG;
				} catch (error) {
					note("companion:art-fallback", error);
				}
			});
			const onPetMedia = (event) => {
				try {
					const detail = event === null || event === undefined ? null : event.detail;
					if (detail === null || detail === undefined) useBuiltInArt();
					else applyMedia(detail);
				} catch (error) {
					note("companion:pet-media", error);
				}
			};
			document.addEventListener("tianlight:pet-media", onPetMedia);
			const initialMedia = readLifeMedia();
			if (initialMedia !== null) applyMedia(initialMedia);
			void resolveCompanionArt().then((source) => {
				if (source === null || !root.isConnected) return;
				builtInArt = source;
				if (currentMedia === null) {
					imageFallbackUsed = false;
					image.src = source;
				}
			});
			root.appendChild(bodyWrap);

			const menu = document.createElement("div");
			// Same namespace separation as the speech bubble above.
			menu.dataset.tlCatmenu = "";
			const ACTIONS = [
				{ id: "pet", labelKey: "pet.action.pet", mood: 8 },
				{ id: "feed", labelKey: "pet.action.feed", mood: 12 },
				{ id: "play", labelKey: "pet.action.play", mood: 6 },
				{ id: "nap", labelKey: "pet.action.nap", mood: 2 },
				// v1.0.0: the life-rhythm control surface lives on the pet itself. These
				// two carry no mood delta; doAction() routes them to the life engine.
				{ id: "mute", labelKey: "pet.action.mute" },
				{ id: "focus", labelKey: "pet.action.focus" },
			];
			for (const action of ACTIONS) {
				const button = document.createElement("button");
				button.type = "button";
				button.dataset.tlAction = action.id;
				button.textContent = TL_T(action.labelKey);
				menu.appendChild(button);
			}
			root.appendChild(menu);

			const clamp = () => {
				const maxX = Math.max(8, window.innerWidth - PET_WIDTH - 8);
				const maxY = Math.max(8, window.innerHeight - PET_HEIGHT - 8);
				state.x = Math.min(maxX, Math.max(8, state.x));
				state.y = Math.min(maxY, Math.max(8, state.y));
			};
			const place = () => {
				root.style.left = Math.round(state.x) + "px";
				root.style.top = Math.round(state.y) + "px";
			};
			clamp();
			place();
			// Mounted INSIDE the application root on purpose: `#root` is the stacking
			// context that carries menus (100) and modals (1000), so the companion
			// shares their scale instead of floating above dialogs from the body level.
			const surface = document.getElementById("root") ?? document.body;
			surface.appendChild(root);

			const timers = new Set();
			const later = (fn, delay) => {
				const id = window.setTimeout(() => {
					timers.delete(id);
					fn();
				}, delay);
				timers.add(id);
				return id;
			};
			let bubbleTimer = 0;
			// 正在显示台词的 i18n key。翻译在“显示”和“语言切换”两个时刻取值，
			// 不冻结在 say() 调用那一刻：旧实现切换语言后已显示的旧台词仍是中文。
			let bubbleKey = "";
			const say = (line, hold = 3200) => {
				bubbleKey = typeof line === "string" ? line : "";
				// v1.0.0: the life engine speaks through this same bubble with its own
				// `life.line.*` keys, so translate ANY key the dictionaries know. Duty
				// `speak` passes arbitrary user copy, which TL_T returns unchanged.
				const translated = TL_T(bubbleKey);
				bubble.textContent = translated !== bubbleKey ? translated : bubbleKey;
				bubble.dataset.tlShow = "";
				if (bubbleTimer !== 0) window.clearTimeout(bubbleTimer);
				bubbleTimer = window.setTimeout(() => {
					delete bubble.dataset.tlShow;
					bubbleTimer = 0;
					bubbleKey = "";
				}, hold);
			};
			// Duty `clear` also dismisses a pending `speak` bubble: both are transient
			// "current utterance" surfaces, and a stuck line after clear is confusing.
			const clearSay = () => {
				if (bubbleTimer !== 0) {
					window.clearTimeout(bubbleTimer);
					bubbleTimer = 0;
				}
				bubbleKey = "";
				delete bubble.dataset.tlShow;
				bubble.textContent = "";
			};

			// ---- v0.7.0 duty bubble lifecycle (driven by the duty channel) ----
			let dutyTimer = 0;
			let dutySignal = "";
			let dutyEmit = null;
			const hideDuty = (reason) => {
				if (dutyTimer !== 0) {
					window.clearTimeout(dutyTimer);
					dutyTimer = 0;
				}
				delete dutyBubble.dataset.tlShow;
				delete dutyBubble.dataset.tlDutySignal;
				dutyText.textContent = "";
				dutyChoices.textContent = "";
				dutyChoices.hidden = true;
				dutySignal = "";
				dutyEmit = null;
				void reason;
			};
			const showDuty = (action, emit) => {
				hideDuty("replace");
				dutySignal = action.signalId;
				dutyEmit = typeof emit === "function" ? emit : null;
				dutyBubble.dataset.tlDutySignal = action.signalId;
				dutyText.textContent = action.text;
				for (const choice of action.choices) {
					const button = document.createElement("button");
					button.type = "button";
					button.dataset.tlDutyChoice = choice.id;
					button.textContent =
						typeof choice.label === "string" && choice.label !== ""
							? choice.label
							: TL_T(DUTY_CHOICE_LABELS[choice.id] ?? "duty.choice.later");
					button.addEventListener("click", (event) => {
						event.stopPropagation();
						const signalId = dutySignal;
						const emit = dutyEmit;
						hideDuty("choice");
						if (typeof emit === "function") {
							try {
								emit({ type: "choice", signalId, choiceId: choice.id, at: Date.now() });
								// The acknowledgement is a life-memory interaction, counted only
								// after the outbound event left successfully.
								try {
									globalThis.tianlightLife?.noteInteraction?.("ack");
								} catch (error) {
									note("duty:ack", error);
								}
							} catch (error) {
								note("duty:emit", error);
							}
						}
					});
					button.addEventListener("keydown", (event) => event.stopPropagation());
					button.addEventListener("pointerdown", (event) => event.stopPropagation());
					dutyChoices.appendChild(button);
				}
				dutyChoices.hidden = false;
				dutyBubble.dataset.tlShow = "";
				wake();
				if (action.ttlMs > 0) {
					dutyTimer = window.setTimeout(() => {
						dutyTimer = 0;
						const signalId = dutySignal;
						const emit = dutyEmit;
						hideDuty("timeout");
						if (typeof emit === "function") {
							try {
								emit({ type: "timeout", signalId, at: Date.now() });
							} catch (error) {
								note("duty:emit", error);
							}
						}
					}, action.ttlMs);
				}
			};
			companionDutyBridge.api = {
				showDuty,
				hideDuty,
				say: (text, hold) => say(text, hold),
				clearSay,
				status: () => ({
					ready: true,
					signalId: dutySignal === "" ? null : dutySignal,
					choiceCount: dutyChoices.children.length,
					visible: dutyBubble.dataset.tlShow !== undefined,
				}),
			};
			dutyChoices.hidden = true;

			// 语言切换（跟随 DSH 或手动）时刷新可读文案与正在显示的台词，不重建 DOM。
			const refreshCompanionLabels = () => {
				root.setAttribute("aria-label", TL_T("pet.aria"));
				for (const button of menu.querySelectorAll("[data-tl-action]")) {
					const action = ACTIONS.find((candidate) => candidate.id === button.dataset.tlAction);
					if (action !== undefined) button.textContent = TL_T(action.labelKey);
				}
				if (bubbleTimer !== 0 && bubbleKey !== "") bubble.textContent = TL_T(bubbleKey);
			};
			const unsubscribeI18n = subscribeTl5I18n(refreshCompanionLabels);
			refreshCompanionLabels();

			let sleeping = false;
			const wake = () => {
				if (!sleeping) return;
				sleeping = false;
				delete root.dataset.tlSleeping;
			};
			/**
			 * v1.0.0: report one user interaction to the life engine's cross-session
			 * memory (pat/feed/play). `talk` is counted by the life engine itself; the
			 * duty bubble reports `ack` from its own click handler.
			 */
			const noteInteraction = (kind) => {
				try {
					globalThis.tianlightLife?.noteInteraction?.(kind);
				} catch (error) {
					note("companion:note-interaction", error);
				}
			};
			const doAction = (id) => {
				const action = ACTIONS.find((candidate) => candidate.id === id);
				if (action === undefined) return;
				// v1.0.0 life-rhythm controls: the pet menu and the role settings page
				// share one state, so these only delegate and echo the outcome.
				if (id === "mute") {
					try {
						globalThis.tianlightLife?.muteFor?.(3600000);
					} catch (error) {
						note("companion:mute", error);
					}
					say("pet.act.mute", 2600);
					closeMenu();
					return;
				}
				if (id === "focus") {
					let focusing = false;
					try {
						const status = globalThis.tianlightLife?.focusStatus?.();
						focusing = status !== null && status !== undefined && status.active === true;
					} catch (error) {
						note("companion:focus-status", error);
					}
					try {
						if (focusing) globalThis.tianlightLife?.focusStop?.();
						else globalThis.tianlightLife?.focusStart?.(25);
					} catch (error) {
						note("companion:focus", error);
					}
					say(focusing ? "pet.act.focusStop" : "pet.act.focusStart", 2600);
					closeMenu();
					return;
				}
				if (id === "nap") {
					sleeping = true;
					root.dataset.tlSleeping = "";
					say(pick(LINES.nap));
				} else {
					wake();
					say(pick(LINES[id]));
					if (id === "pet" || id === "feed" || id === "play") noteInteraction(id === "pet" ? "pat" : id);
				}
				state.mood = Math.min(100, state.mood + action.mood);
				saveState(state);
				closeMenu();
			};

			let menuOpen = false;
			const openMenu = () => {
				menuOpen = true;
				menu.dataset.tlShow = "";
				// Keep the pill inside the viewport: the pet lives near the right edge by
				// default, where a centred 4-button pill would be clipped off-screen.
				menu.style.left = "50%";
				menu.style.right = "";
				menu.style.transform = "";
				const rect = menu.getBoundingClientRect();
				if (rect.right > window.innerWidth - 8) {
					menu.style.left = "auto";
					menu.style.right = "-6px";
					menu.style.transform = "none";
				} else if (rect.left < 8) {
					menu.style.left = "-6px";
					menu.style.transform = "none";
				}
			};
			const closeMenu = () => {
				menuOpen = false;
				delete menu.dataset.tlShow;
			};

			// ---- drag + click ----
			let dragging = false;
			let moved = false;
			let pointerId = -1;
			let offsetX = 0;
			let offsetY = 0;

			const onPointerDown = (event) => {
				if (event.button !== undefined && event.button !== 0) return;
				if (event.target instanceof HTMLElement && event.target.closest("[data-tl-catmenu]") !== null) return;
				dragging = true;
				moved = false;
				pointerId = event.pointerId;
				offsetX = event.clientX - state.x;
				offsetY = event.clientY - state.y;
				root.dataset.tlDragging = "";
				root.setPointerCapture?.(event.pointerId);
				event.preventDefault();
			};
			const onPointerMove = (event) => {
				if (!dragging) return;
				if (Math.abs(event.clientX - state.x - offsetX) > 3 || Math.abs(event.clientY - state.y - offsetY) > 3) {
					moved = true;
				}
				state.x = event.clientX - offsetX;
				state.y = event.clientY - offsetY;
				clamp();
				place();
			};
			const onPointerUp = (event) => {
				if (!dragging) return;
				dragging = false;
				root.releasePointerCapture?.(pointerId);
				delete root.dataset.tlDragging;
				if (moved) {
					saveState(state);
					wake();
					return;
				}
				// A click (not a drag) toggles the interaction menu.
				if (menuOpen) closeMenu();
				else openMenu();
				wake();
				if (!bubble.dataset.tlShow) say(pick(LINES.near), 1800);
			};
			root.addEventListener("pointerdown", onPointerDown);
			root.addEventListener("pointermove", onPointerMove);
			root.addEventListener("pointerup", onPointerUp);
			root.addEventListener("pointercancel", onPointerUp);
			root.addEventListener("keydown", (event) => {
				if (event.key !== "Enter" && event.key !== " ") return;
				event.preventDefault();
				if (menuOpen) closeMenu();
				else openMenu();
			});

			menu.addEventListener("click", (event) => {
				const target = event.target;
				if (!(target instanceof HTMLElement)) return;
				const action = target.dataset.tlAction;
				if (action !== undefined) doAction(action);
			});

			// ---- proximity ----
			let near = false;
			let nearTimer = 0;
			// v1.0.0 energy: `--tl-look` drives a transform on every pointer move; only
			// write it when the rounded value actually changes (the visual is identical).
			let lastLook = "";
			const onProximity = (event) => {
				if (dragging) return;
				const centerX = state.x + PET_WIDTH / 2;
				const centerY = state.y + PET_HEIGHT / 2;
				const dx = event.clientX - centerX;
				const dy = event.clientY - centerY;
				const distance = Math.hypot(dx, dy);
				const isNear = distance < 190;
				const look = (Math.max(-1, Math.min(1, dx / 220))).toFixed(3);
				if (look !== lastLook) {
					lastLook = look;
					root.style.setProperty("--tl-look", look);
				}
				if (isNear === near) return;
				near = isNear;
				if (near) {
					root.dataset.tlNear = "";
					wake();
					if (nearTimer !== 0) window.clearTimeout(nearTimer);
					nearTimer = window.setTimeout(() => {
						nearTimer = 0;
						if (!sleeping && !menuOpen && Math.random() < 0.34) say(pick(LINES.near), 2200);
					}, 420);
				} else {
					delete root.dataset.tlNear;
				}
			};
			window.addEventListener("pointermove", onProximity, { passive: true });

			// ---- idle life ----
			// v1.0.0 energy: the 24s tick still skips hidden pages; on the 15fps render
			// budget it also runs the passive roll every other tick. Interaction paths
			// (pointer/drag/menu/proximity) are untouched, so the pet never feels slower.
			let idleTick = 0;
			const idleTimer = window.setInterval(() => {
				if (document.hidden) return;
				if (readRenderTier() === "15") {
					idleTick += 1;
					if (idleTick % 2 !== 0) return;
				}
				if (dragging || menuOpen) return;
				if (state.mood > 0) state.mood = Math.max(0, state.mood - 1);
				if (sleeping) return;
				if (state.mood < 30 && Math.random() < 0.5) {
					say(pick(LINES.idle), 3000);
					return;
				}
				const roll = Math.random();
				if (roll < 0.22) {
					sleeping = true;
					root.dataset.tlSleeping = "";
					say(pick(LINES.nap), 2600);
				} else if (roll < 0.4) {
					say(pick(LINES.idle), 3000);
				}
			}, 24000);

			const onResize = () => {
				clamp();
				place();
			};
			window.addEventListener("resize", onResize);

			const onDocumentPointerDown = (event) => {
				if (!menuOpen) return;
				const target = event.target;
				if (target instanceof Node && root.contains(target)) return;
				closeMenu();
			};
			document.addEventListener("pointerdown", onDocumentPointerDown, true);

			later(() => say("pet.hello", 2600), 700);
			// v1.0.0 media ordering: apply() installs the life layer AFTER this switchable
			// module, so a persisted media choice can resolve right after the current task.
			// One microtask re-read covers that order without a visible flash, and a short
			// timer covers an install pass that yields; a later `tianlight:pet-media` event
			// always wins. Neither path polls.
			const tryApplyLateMedia = () => {
				try {
					if (currentMedia !== null || !root.isConnected) return;
					const media = readLifeMedia();
					if (media !== null) applyMedia(media);
				} catch (error) {
					note("companion:media-late-read", error);
				}
			};
			if (typeof queueMicrotask === "function") queueMicrotask(tryApplyLateMedia);
			later(tryApplyLateMedia, 900);

			return () => {
				companionDutyBridge.api = null;
				hideDuty("dispose");
				if (typeof unsubscribeI18n === "function") unsubscribeI18n();
				window.clearInterval(idleTimer);
				if (bubbleTimer !== 0) window.clearTimeout(bubbleTimer);
				if (nearTimer !== 0) window.clearTimeout(nearTimer);
				for (const id of timers) window.clearTimeout(id);
				timers.clear();
				window.removeEventListener("pointermove", onProximity);
				window.removeEventListener("resize", onResize);
				document.removeEventListener("pointerdown", onDocumentPointerDown, true);
				document.removeEventListener("tianlight:pet-media", onPetMedia);
				try {
					stopVideo();
				} catch (error) {
					note("companion:dispose-media", error);
				}
				root.remove();
			};
		}

		/**
		 * Validate one inbound duty action. Fail-closed by design: an adapter is
		 * third-party code, so an unknown shape must never reach the pet DOM.
		 */
		function normalizeDutyAction(raw) {
			if (raw === null || typeof raw !== "object" || typeof raw.type !== "string") return null;
			if (raw.type === "clear") return { type: "clear" };
			const text = typeof raw.text === "string" ? raw.text.trim() : "";
			if (text.length === 0 || text.length > DUTY_LIMITS.text) return null;
			const rawTtl = raw.ttlMs === undefined ? undefined : Number(raw.ttlMs);
			if (raw.type === "speak") {
				const ttl = rawTtl === undefined || !Number.isFinite(rawTtl)
					? DUTY_LIMITS.speakTtlDefault
					: Math.max(500, Math.min(DUTY_LIMITS.ttlMax, Math.round(rawTtl)));
				return { type: "speak", text, ttlMs: ttl };
			}
			if (raw.type !== "interrupt") return null;
			if (typeof raw.signalId !== "string" || raw.signalId.length === 0 || raw.signalId.length > DUTY_LIMITS.signalId) return null;
			if (!Array.isArray(raw.choices) || raw.choices.length === 0 || raw.choices.length > DUTY_LIMITS.choices) return null;
			const choices = [];
			for (const candidate of raw.choices) {
				if (candidate === null || typeof candidate !== "object") return null;
				if (typeof candidate.id !== "string" || candidate.id.length === 0 || candidate.id.length > DUTY_LIMITS.choiceId) return null;
				if (candidate.label !== undefined && (typeof candidate.label !== "string" || candidate.label.length > DUTY_LIMITS.choiceLabel)) return null;
				choices.push(candidate.label === undefined ? { id: candidate.id } : { id: candidate.id, label: candidate.label });
			}
			const ttl = rawTtl === undefined || !Number.isFinite(rawTtl)
				? DUTY_LIMITS.ttlDefault
				: Math.max(0, Math.min(DUTY_LIMITS.ttlMax, Math.round(rawTtl)));
			return { type: "interrupt", signalId: raw.signalId, text, choices, ttlMs: ttl };
		}

		/**
		 * The duty channel: the only cross-plug-in surface that can drive the pet.
		 *
		 * Inbound (role pack → pet):
		 *   globalThis.tianlightDuty.send(action)
		 *   document.dispatchEvent(new CustomEvent("tianlight:duty", { detail: action }))
		 * Outbound (pet → role pack):
		 *   document.dispatchEvent(new CustomEvent("tianlight:duty-action", { detail }))
		 *   globalThis.tianlightDuty.subscribe(listener)
		 *
		 * The channel is always-on infrastructure; it degrades to `companion-off`
		 * while the switchable companion module is disabled. No host route is
		 * involved, so this ships in the browser half alone (no DSH restart).
		 */
		function installDutyChannel() {
			const subscribers = new Set();
			const stats = {
				interrupts: 0,
				speaks: 0,
				clears: 0,
				rejected: 0,
				choices: 0,
				timeouts: 0,
				deferred: 0,
				replayed: 0,
				lastActionAt: 0,
				lastSignalId: "",
			};
			const previous = globalThis.tianlightDuty;
			const emit = (out) => {
				if (out.type === "choice") stats.choices += 1;
				else if (out.type === "timeout") stats.timeouts += 1;
				for (const listener of [...subscribers]) {
					try {
						listener(out);
					} catch (error) {
						note("duty:subscriber", error);
					}
				}
				try {
					document.dispatchEvent(new CustomEvent(DUTY_ACTION_EVENT, { detail: out }));
				} catch (error) {
					note("duty:dispatch", error);
				}
			};
			/**
			 * v1.1: the single presentation path for an interrupt. `send` reaches it after
			 * the life gate; the life engine reaches it through `replay()` for a previously
			 * deferred signal. Metrics and the outbound `replayed` marker are updated here
			 * so both paths stay honest — a replay is never gated a second time.
			 */
			const showInterrupt = (action, replayed) => {
				const at = Date.now();
				companionDutyBridge.api.showDuty(action, emit);
				stats.interrupts += 1;
				stats.lastActionAt = at;
				stats.lastSignalId = action.signalId;
				if (replayed) {
					stats.replayed += 1;
					emit({ type: "interrupt", signalId: action.signalId, replayed: true, at });
				}
			};
			const send = (raw) => {
				const action = normalizeDutyAction(raw);
				if (action === null) {
					stats.rejected += 1;
					return { ok: false, reason: "invalid-action" };
				}
				try {
					// The companion module is switchable: while it is off there is no
					// presentation surface, so do not let the life gate consume budget for
					// a bubble that can never be shown.
					const bridge = companionDutyBridge.api;
					if (bridge === null) return { ok: false, reason: "companion-off" };
					// v1.1 life-rhythm gate: a blocked interrupt never reaches the DOM. It is
					// handed back to the life engine (which owns the deferred queue) through
					// the return value and the outbound `deferred` event.
					if (action.type === "interrupt") {
						const gate = companionDutyBridge.lifeGate;
						if (typeof gate === "function") {
							const verdict = gate(action);
							if (verdict !== null && typeof verdict === "object" && verdict.allow === false) {
								const reason = verdict.reason ?? "deferred";
								const dueAt = verdict.dueAt ?? null;
								stats.deferred += 1;
								emit({ type: "deferred", signalId: action.signalId, reason, dueAt, at: Date.now() });
								return { ok: true, deferred: true, reason, dueAt };
							}
						}
					}
					if (action.type === "interrupt") {
						showInterrupt(action, false);
					} else if (action.type === "speak") {
						bridge.say(action.text, action.ttlMs);
						stats.speaks += 1;
					} else {
						bridge.hideDuty("clear");
						if (typeof bridge.clearSay === "function") bridge.clearSay();
						stats.clears += 1;
					}
				} catch (error) {
					note("duty:send", error);
					return { ok: false, reason: "internal-error" };
				}
				stats.lastActionAt = Date.now();
				stats.lastSignalId = typeof action.signalId === "string" ? action.signalId : "";
				return { ok: true };
			};
			/**
			 * v1.1: present a previously deferred interrupt. The action is the already
			 * normalized object the life engine received (it is re-validated here anyway);
			 * replay deliberately bypasses the life gate so a deferred signal cannot loop.
			 */
			const replay = (raw) => {
				const action = normalizeDutyAction(raw);
				if (action === null || action.type !== "interrupt") {
					stats.rejected += 1;
					return { ok: false, reason: "invalid-action" };
				}
				if (companionDutyBridge.api === null) return { ok: false, reason: "companion-off" };
				try {
					showInterrupt(action, true);
				} catch (error) {
					note("duty:replay", error);
					return { ok: false, reason: "internal-error" };
				}
				return { ok: true, replayed: true };
			};
			const subscribe = (listener) => {
				if (typeof listener !== "function") return () => {};
				subscribers.add(listener);
				return () => subscribers.delete(listener);
			};
			const status = () => ({
				version: DUTY_CHANNEL_VERSION,
				enabled: companionDutyBridge.api !== null,
				subscriberCount: subscribers.size,
				...stats,
				companion: companionDutyBridge.api === null ? null : companionDutyBridge.api.status(),
			});
			const publicApi = {
				version: DUTY_CHANNEL_VERSION,
				send,
				subscribe,
				status,
				clear: () => send({ type: "clear" }),
				replay,
			};
			globalThis.tianlightDuty = publicApi;
			const onDutyEvent = (event) => {
				const result = send(event === null || event === undefined ? undefined : event.detail);
				if (result.ok === false) note("duty:rejected", result.reason);
			};
			document.addEventListener(DUTY_EVENT, onDutyEvent);
			return () => {
				document.removeEventListener(DUTY_EVENT, onDutyEvent);
				if (globalThis.tianlightDuty === publicApi) {
					if (previous === undefined) delete globalThis.tianlightDuty;
					else globalThis.tianlightDuty = previous;
				}
				subscribers.clear();
				if (companionDutyBridge.api !== null) {
					try {
						companionDutyBridge.api.hideDuty("channel-dispose");
					} catch (error) {
						note("duty:dispose", error);
					}
				}
			};
		}

		/** Read-only diagnostics for the engineering panel / support console. */
		function dutyChannelStatus() {
			try {
				return globalThis.tianlightDuty === undefined ? null : globalThis.tianlightDuty.status();
			} catch {
				return null;
			}
		}
		//#endregion

		//#region life rhythm
		/**
		 * v1.0.0 character life engine: "when may the character speak first?"
		 *
		 * The companion used to be a single decoration with per-tick `Math.random()`.
		 * Giving it memory, a daily rhythm and a proactive budget is only useful if the
		 * budget is legible and adjustable, so this fragment owns one persisted state
		 * object and one API:
		 *
		 *   localStorage["tianlight.life.v1"]      rhythm + memory + budget + deferred queue
		 *   localStorage["tianlight.petMedia.v1"]  selected pet media id (raw string, null = default)
		 *   globalThis.tianlightLife (version 1)   status/configure/gate/media/proactive...
		 *   companionDutyBridge.lifeGate           duty channel asks before showing an interrupt
		 *   body[data-tl-life-period/energy/pet-media]  CSS observation points
		 *
		 * Design rules (all of them are acceptance criteria):
		 *   - Every public method is fail-open, never throws. A broken storage/fetch/DOM
		 *     must degrade the character, not the page.
		 *   - The virtual clock (`virtualOffsetMinutes`) only changes the period the
		 *     character *feels*; quiet hours, sleep and the daily budget use real local
		 *     time so a demo offset can never shift the user's actual interruptions.
		 *   - Gate priority is mute > quiet-hours > asleep > budget. Critical signals
		 *     (priority >= 90 or critical === true) may bypass ONLY the budget.
		 *   - Randomness is a deterministic hash of (day, hour, tick, talks). Tests and
		 *     support can reproduce "why did it stay silent" without a seeded PRNG.
		 */
		const LIFE_VERSION = 1;
		const LIFE_STATE_KEY = "tianlight.life.v1";
		const LIFE_MEDIA_KEY = "tianlight.petMedia.v1";
		const LIFE_CHANNEL = "tianlight.life";
		const LIFE_DEFERRED_MAX = 8;
		const LIFE_MEDIA_CAP_BYTES = 32 * 1024 * 1024;
		const LIFE_PROACTIVE_GAP_MS = 30 * 60 * 1000;
		/** Percent chance per 30s tick once the 30min gap has passed. */
		const LIFE_PROACTIVE_CHANCE = 12;
		const LIFE_TICK_MS = 30000;
		const LIFE_DEFAULT_CAP = 6;
		const LIFE_BUDGET_MAX = 20;
		const LIFE_MUTE_MAX_MS = 86400000;
		const LIFE_FOCUS_MINUTES = 25;
		const LIFE_FOCUS_MAX_MINUTES = 180;
		const LIFE_SAY_HOLD_MS = 3200;
		const LIFE_PERIODS = ["dawn", "morning", "noon", "afternoon", "dusk", "evening", "night"];
		const LIFE_PERIOD_LINE = {
			dawn: "life.line.dawn",
			morning: "life.line.morning",
			noon: "life.line.noon",
			afternoon: "life.line.afternoon",
			dusk: "life.line.dusk",
			evening: "life.line.evening",
			night: "life.line.night",
		};
		const LIFE_INTERACTION_BUCKET = { pat: "pats", feed: "feeds", play: "plays", talk: "talks", ack: "acks" };
		const LIFE_DEFAULT_MEDIA = {
			id: "default",
			kind: "image",
			url: ASSET_BASE + "/cat.png",
			name: "cat.png (default)",
			bytes: null,
		};

		// The character is a quiet writing partner: short lines, no exclamation
		// stacking, and every line maps to a moment of the day or to a shared memory.
		registerTl5Strings({
			zh: {
				"life.line.dawn": "天刚亮。先喝一口水，再开始吧。",
				"life.line.morning": "上午好。今天的字，慢慢写就行。",
				"life.line.noon": "中午了。记得吃饭，别空着肚子。",
				"life.line.afternoon": "午后容易发困。我陪你安静待一会儿。",
				"life.line.dusk": "天光在收。先保存一下手上的东西吧。",
				"life.line.evening": "晚上了。今天到这里也可以。",
				"life.line.night": "夜深了。我在这儿，不吵你。",
				"life.line.longAway": "好久不见。我一直在。",
				"life.line.focus": "专注时间。我不打扰你。",
				"life.line.done": "这一段完成了。起来走两步吧。",
				"life.line.water": "该喝水了。",
			},
			en: {
				"life.line.dawn": "First light. Water first, then words.",
				"life.line.morning": "Good morning. Take today's words slowly.",
				"life.line.noon": "Noon already. Don't skip lunch.",
				"life.line.afternoon": "The afternoon drags a little. I'll keep it quiet.",
				"life.line.dusk": "The light is going. Save your work first.",
				"life.line.evening": "Evening. Stopping here is fine too.",
				"life.line.night": "Late night. I'm here, quietly.",
				"life.line.longAway": "It's been a while. I'm still here.",
				"life.line.focus": "Focus time. I won't interrupt.",
				"life.line.done": "That part is done. Stretch for a moment.",
				"life.line.water": "Time for some water.",
			},
		});

		// One engine instance per page: the state is lazily (re)read from storage, the
		// media cache is synchronously available for the companion's first render.
		let lifeState = null;
		let lifeStateSaveNoted = false;
		let lifeMediaCache = null;
		let lifeMediaSelectedId = "default";
		let lifeChannel = null;
		let lifeInstanceId = "";
		let lifeInstanceSeq = 0;

		// ---- small helpers -------------------------------------------------------
		function lifeDoc() {
			try {
				return typeof document === "undefined" || document === null ? null : document;
			} catch (error) {
				return null;
			}
		}

		function lifeNumber(value, fallback) {
			const number = Number(value);
			return Number.isFinite(number) ? number : fallback;
		}

		function lifeClamp(value, min, max) {
			return Math.min(max, Math.max(min, value));
		}

		function lifeClampInt(value, min, max, fallback) {
			const number = Number(value);
			if (Number.isFinite(number) === false) return fallback;
			return lifeClamp(Math.round(number), min, max);
		}

		function lifeNonNegativeInt(value, fallback) {
			const number = lifeNumber(value, fallback);
			if (number <= 0) return 0;
			return Math.min(9007199254740991, Math.floor(number));
		}

		function lifeTimeString(value, fallback) {
			return typeof value === "string" && /^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(value) ? value : fallback;
		}

		function lifeParseHm(value) {
			const text = lifeTimeString(value, null);
			if (text === null) return null;
			const parts = text.split(":");
			return Number(parts[0]) * 60 + Number(parts[1]);
		}

		function lifeDayKeyOf(nowInput) {
			const now = lifeNumber(nowInput, Date.now());
			const date = new Date(now);
			const month = String(date.getMonth() + 1).padStart(2, "0");
			const day = String(date.getDate()).padStart(2, "0");
			return date.getFullYear() + "-" + month + "-" + day;
		}

		function lifeValidDayKey(value) {
			if (typeof value !== "string" || /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(value) === false) return false;
			const parts = value.split("-");
			const year = Number(parts[0]);
			const month = Number(parts[1]);
			const day = Number(parts[2]);
			if (month < 1 || month > 12 || day < 1 || day > 31) return false;
			const utc = new Date(Date.UTC(year, month - 1, day));
			return utc.getUTCFullYear() === year && utc.getUTCMonth() === month - 1 && utc.getUTCDate() === day;
		}

		function lifeDayNumber(dayKey) {
			if (lifeValidDayKey(dayKey) === false) return 0;
			const parts = dayKey.split("-");
			return Math.floor(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])) / 86400000);
		}

		// ---- persisted state -----------------------------------------------------
		function lifeFreshState(nowInput) {
			const now = lifeNumber(nowInput, Date.now());
			const dayKey = lifeDayKeyOf(now);
			return {
				version: LIFE_VERSION,
				createdAt: now,
				lastSeenAt: now,
				lastTalkAt: 0,
				dayKey,
				// Day of the last counted interaction, so a streak can survive reloads.
				lastDayKey: "",
				streakDays: 0,
				memory: { interactions: 0, pats: 0, feeds: 0, plays: 0, talks: 0, acks: 0 },
				budget: { dayKey, used: 0, cap: LIFE_DEFAULT_CAP },
				quiet: { enabled: true, start: "23:00", end: "08:00" },
				wake: "08:00",
				sleep: "23:00",
				virtualOffsetMinutes: 0,
				muteUntil: 0,
				focus: { active: false, endsAt: 0, minutes: LIFE_FOCUS_MINUTES },
				deferred: [],
				recentLines: [],
			};
		}

		function lifeSanitizeDeferred(raw) {
			const list = [];
			if (Array.isArray(raw) === false) return list;
			const seen = new Set();
			for (const candidate of raw) {
				if (candidate === null || typeof candidate !== "object") continue;
				const signalId = lifeValidSignalId(candidate.signalId);
				if (signalId === null || seen.has(signalId)) continue;
				if (candidate.action === null || typeof candidate.action !== "object") continue;
				seen.add(signalId);
				list.push({
					signalId,
					action: lifeCloneAction(candidate.action),
					queuedAt: lifeNonNegativeInt(candidate.queuedAt, 0),
					priority: lifeClampInt(candidate.priority, 0, 100, 50),
					dueAt: lifeNonNegativeInt(candidate.dueAt, 0),
				});
			}
			list.sort((left, right) => right.priority - left.priority);
			return list.slice(0, LIFE_DEFERRED_MAX);
		}

		function lifeSanitizeRecentLines(raw) {
			const lines = [];
			if (Array.isArray(raw) === false) return lines;
			for (const entry of raw) {
				if (typeof entry !== "string" || entry === "" || lines.includes(entry)) continue;
				lines.push(entry);
				if (lines.length >= 3) break;
			}
			return lines;
		}

		/** Merge any persisted shape into the v1 shape; unknown/invalid fields fall back. */
		function lifeNormalizeState(raw) {
			const now = Date.now();
			const state = lifeFreshState(now);
			const value = raw !== null && typeof raw === "object" && Array.isArray(raw) === false ? raw : null;
			if (value === null) return state;
			state.version = LIFE_VERSION;
			state.createdAt = lifeNonNegativeInt(value.createdAt, state.createdAt);
			state.lastSeenAt = lifeNonNegativeInt(value.lastSeenAt, state.lastSeenAt);
			state.lastTalkAt = lifeNonNegativeInt(value.lastTalkAt, 0);
			state.dayKey = lifeValidDayKey(value.dayKey) ? value.dayKey : state.dayKey;
			state.lastDayKey = lifeValidDayKey(value.lastDayKey) ? value.lastDayKey : "";
			state.streakDays = Math.min(1000000, lifeNonNegativeInt(value.streakDays, 0));

			const memory = value.memory !== null && typeof value.memory === "object" ? value.memory : {};
			for (const key of ["interactions", "pats", "feeds", "plays", "talks", "acks"]) {
				state.memory[key] = Math.min(1000000000, lifeNonNegativeInt(memory[key], 0));
			}

			const budget = value.budget !== null && typeof value.budget === "object" ? value.budget : {};
			state.budget.cap = lifeClampInt(budget.cap, 0, LIFE_BUDGET_MAX, LIFE_DEFAULT_CAP);
			state.budget.dayKey = lifeValidDayKey(budget.dayKey) ? budget.dayKey : state.dayKey;
			state.budget.used = Math.min(1000000, lifeNonNegativeInt(budget.used, 0));

			const quiet = value.quiet !== null && typeof value.quiet === "object" ? value.quiet : {};
			state.quiet = {
				enabled: typeof quiet.enabled === "boolean" ? quiet.enabled : true,
				start: lifeTimeString(quiet.start, "23:00"),
				end: lifeTimeString(quiet.end, "08:00"),
			};
			state.wake = lifeTimeString(value.wake, "08:00");
			state.sleep = lifeTimeString(value.sleep, "23:00");
			state.virtualOffsetMinutes = lifeClampInt(value.virtualOffsetMinutes, -720, 720, 0);
			state.muteUntil = lifeNonNegativeInt(value.muteUntil, 0);

			const focus = value.focus !== null && typeof value.focus === "object" ? value.focus : {};
			state.focus = {
				active: focus.active === true,
				endsAt: lifeNonNegativeInt(focus.endsAt, 0),
				minutes: lifeClampInt(focus.minutes, 1, LIFE_FOCUS_MAX_MINUTES, LIFE_FOCUS_MINUTES),
			};
			if (state.focus.active === true && state.focus.endsAt <= 0) state.focus.active = false;

			state.deferred = lifeSanitizeDeferred(value.deferred);
			state.recentLines = lifeSanitizeRecentLines(value.recentLines);
			return state;
		}

		function lifeReadStoredState() {
			let raw = null;
			try {
				const storage = globalThis.localStorage;
				if (storage !== null && storage !== undefined && typeof storage.getItem === "function") {
					raw = storage.getItem(LIFE_STATE_KEY);
				}
			} catch (error) {
				raw = null;
			}
			let parsed = null;
			if (typeof raw === "string" && raw !== "") {
				try {
					parsed = JSON.parse(raw);
				} catch (error) {
					parsed = null;
					note("life:parse", error);
				}
			}
			return lifeNormalizeState(parsed);
		}

		/** In-memory state is the source of truth; storage failures degrade to memory only. */
		function lifeEnsureState() {
			if (lifeState === null) {
				try {
					lifeState = lifeReadStoredState();
				} catch (error) {
					note("life:state-load", error);
					lifeState = lifeFreshState(Date.now());
				}
			}
			return lifeState;
		}

		function lifeSaveState() {
			const state = lifeState;
			if (state === null) return false;
			try {
				const storage = globalThis.localStorage;
				if (storage !== null && storage !== undefined && typeof storage.setItem === "function") {
					storage.setItem(LIFE_STATE_KEY, JSON.stringify(state));
				}
			} catch (error) {
				if (lifeStateSaveNoted === false) {
					lifeStateSaveNoted = true;
					note("life:persist", error);
				}
			}
			return true;
		}

		/** Daily counters roll over at local midnight; the deferred queue spans days. */
		function lifeEnsureDay(state, nowInput) {
			const now = lifeNumber(nowInput, Date.now());
			const dayKey = lifeDayKeyOf(now);
			let changed = false;
			if (state.budget.dayKey !== dayKey) {
				state.budget.dayKey = dayKey;
				state.budget.used = 0;
				changed = true;
			}
			if (state.dayKey !== dayKey) {
				state.dayKey = dayKey;
				changed = true;
			}
			if (changed) lifeSaveState();
			return state;
		}

		// ---- clock, wake/sleep and quiet hours ----------------------------------
		/**
		 * What the character *feels* it is (virtual offset applied). Used for lines and
		 * presentation only; gating always uses real local time.
		 */
		function lifePeriod(nowInput) {
			const state = lifeEnsureState();
			const now = lifeNumber(nowInput, Date.now());
			const offset = lifeClampInt(state.virtualOffsetMinutes, -720, 720, 0);
			const date = new Date(now + offset * 60000);
			const hour = date.getHours() + date.getMinutes() / 60;
			if (hour >= 5 && hour < 8) return "dawn";
			if (hour >= 8 && hour < 11) return "morning";
			if (hour >= 11 && hour < 14) return "noon";
			if (hour >= 14 && hour < 17) return "afternoon";
			if (hour >= 17 && hour < 19) return "dusk";
			if (hour >= 19 && hour < 22) return "evening";
			return "night";
		}

		/** Awake window from wake/sleep, midnight-crossing supported (23:00 -> 08:00). */
		function lifeAwake(nowInput) {
			const state = lifeEnsureState();
			const now = lifeNumber(nowInput, Date.now());
			const wake = lifeParseHm(state.wake);
			const sleep = lifeParseHm(state.sleep);
			if (wake === null || sleep === null || wake === sleep) return true;
			const date = new Date(now);
			const minutes = date.getHours() * 60 + date.getMinutes();
			if (wake < sleep) return minutes >= wake && minutes < sleep;
			return minutes >= wake || minutes < sleep;
		}

		function lifeInQuiet(nowInput) {
			const state = lifeEnsureState();
			if (state.quiet.enabled !== true) return false;
			const start = lifeParseHm(state.quiet.start);
			const end = lifeParseHm(state.quiet.end);
			if (start === null || end === null || start === end) return false;
			const now = lifeNumber(nowInput, Date.now());
			const date = new Date(now);
			const minutes = date.getHours() * 60 + date.getMinutes();
			if (start < end) return minutes >= start && minutes < end;
			return minutes >= start || minutes < end;
		}

		/** Next occurrence of a local HH:MM clock time, strictly after `now`. */
		function lifeNextClockAt(nowInput, hhmm) {
			const now = lifeNumber(nowInput, Date.now());
			const minutes = lifeParseHm(hhmm);
			if (minutes === null) return now;
			const date = new Date(now);
			const target = new Date(date.getFullYear(), date.getMonth(), date.getDate(), Math.floor(minutes / 60), minutes % 60, 0, 0);
			if (target.getTime() <= now) target.setDate(target.getDate() + 1);
			return target.getTime();
		}

		function lifeNextWakeAt(nowInput) {
			const state = lifeEnsureState();
			return lifeNextClockAt(nowInput, state.wake);
		}

		function lifeNextQuietEndAt(nowInput) {
			const state = lifeEnsureState();
			return lifeNextClockAt(nowInput, state.quiet.end);
		}

		// ---- duty gate + deferred queue -----------------------------------------
		function lifeValidSignalId(value) {
			if (typeof value !== "string") return null;
			const trimmed = value.trim();
			if (trimmed === "" || trimmed.length > 64) return null;
			return trimmed;
		}

		function lifePriorityOf(action) {
			if (action === null || typeof action !== "object") return 50;
			const priority = Number(action.priority);
			return Number.isFinite(priority) ? lifeClamp(Math.round(priority), 0, 100) : 50;
		}

		/** Critical may bypass the daily budget only; mute/quiet/asleep still win. */
		function lifeIsCritical(action) {
			if (action === null || typeof action !== "object") return false;
			if (action.critical === true) return true;
			const priority = Number(action.priority);
			return Number.isFinite(priority) && priority >= 90;
		}

		function lifeIsInterrupt(action) {
			if (action === null || typeof action !== "object") return false;
			if (action.type === "interrupt") return true;
			return typeof action.signalId === "string" && Array.isArray(action.choices);
		}

		function lifeCloneAction(action) {
			try {
				const text = JSON.stringify(action);
				if (typeof text === "string" && text.length > 0 && text.length <= 8192) {
					const copy = JSON.parse(text);
					if (copy !== null && typeof copy === "object") return copy;
				}
			} catch (error) {
				note("life:clone-action", error);
			}
			return {
				type: typeof action.type === "string" ? action.type : "interrupt",
				signalId: typeof action.signalId === "string" ? action.signalId.slice(0, 64) : "",
				text: typeof action.text === "string" ? action.text.slice(0, 200) : "",
				choices: [],
			};
		}

		function lifeQueueDeferred(state, action, now, dueAt) {
			const signalId = lifeValidSignalId(action.signalId);
			if (signalId === null) return;
			const list = state.deferred;
			const priority = lifePriorityOf(action);
			for (const item of list) {
				if (item.signalId !== signalId) continue;
				// Deduplicate by signalId: refresh the payload and raise priority/dueAt,
				// but keep the original queue position timestamp.
				item.action = lifeCloneAction(action);
				item.priority = Math.max(item.priority, priority);
				if (Number.isFinite(dueAt) && dueAt > 0) item.dueAt = Math.floor(dueAt);
				list.sort((left, right) => right.priority - left.priority);
				lifeSaveState();
				return;
			}
			list.push({
				signalId,
				action: lifeCloneAction(action),
				queuedAt: now,
				priority,
				dueAt: Number.isFinite(dueAt) && dueAt > 0 ? Math.floor(dueAt) : 0,
			});
			list.sort((left, right) => right.priority - left.priority);
			if (list.length > LIFE_DEFERRED_MAX) list.length = LIFE_DEFERRED_MAX;
			lifeSaveState();
		}

		/**
		 * The duty channel calls this for every inbound action (v1.1 contract).
		 * Returning `{ allow: false }` means "do not show now"; interrupts are queued
		 * for `replayDue()` instead. A non-critical allowed action consumes one unit of
		 * the daily budget, which is what makes the budget a real quota.
		 */
		function lifeGate(action) {
			try {
				const state = lifeEnsureState();
				const now = Date.now();
				lifeEnsureDay(state, now);
				const interrupt = lifeIsInterrupt(action);
				const critical = lifeIsCritical(action);
				if (state.muteUntil > now) {
					const dueAt = state.muteUntil;
					if (interrupt) lifeQueueDeferred(state, action, now, dueAt);
					return { allow: false, reason: "mute", dueAt };
				}
				if (lifeInQuiet(now)) {
					const dueAt = lifeNextQuietEndAt(now);
					if (interrupt) lifeQueueDeferred(state, action, now, dueAt);
					return { allow: false, reason: "quiet-hours", dueAt };
				}
				if (lifeAwake(now) === false) {
					const dueAt = lifeNextWakeAt(now);
					if (interrupt) lifeQueueDeferred(state, action, now, dueAt);
					return { allow: false, reason: "asleep", dueAt };
				}
				if (critical === false && state.budget.used >= state.budget.cap) {
					// The quota refreshes at the wake clock, so that is when a queued
					// reminder becomes meaningful again.
					const dueAt = lifeNextWakeAt(now);
					if (interrupt) lifeQueueDeferred(state, action, now, dueAt);
					return { allow: false, reason: "budget", dueAt };
				}
				if (critical === false && action !== null && typeof action === "object") {
					state.budget.used = Math.min(state.budget.cap, state.budget.used + 1);
					lifeSaveState();
				}
				return { allow: true };
			} catch (error) {
				note("life:gate", error);
				return { allow: false, reason: "internal-error" };
			}
		}

		/**
		 * Replay deferred interrupts whose window has arrived. Items without a dueAt
		 * are treated as immediately due. The queue is trimmed BEFORE the calls so a
		 * replay that synchronously re-queues a duplicate cannot loop forever.
		 */
		function lifeReplayDue(nowInput) {
			try {
				const state = lifeEnsureState();
				const now = lifeNumber(nowInput, Date.now());
				const deferred = state.deferred;
				if (deferred.length === 0) return { replayed: 0 };
				const due = [];
				const keep = [];
				for (const item of deferred) {
					const dueAt = lifeNumber(item.dueAt, 0);
					if (dueAt <= 0 || dueAt <= now) due.push(item);
					else keep.push(item);
				}
				if (due.length === 0) return { replayed: 0 };
				state.deferred = keep;
				let replayed = 0;
				for (const item of due) {
					replayed += 1;
					try {
						const duty = globalThis.tianlightDuty;
						if (duty !== null && duty !== undefined && typeof duty.replay === "function") duty.replay(item.action);
					} catch (error) {
						note("life:replay", error);
					}
				}
				lifeSaveState();
				return { replayed };
			} catch (error) {
				note("life:replay-due", error);
				return { replayed: 0 };
			}
		}

		// ---- focus timer ---------------------------------------------------------
		function lifeFocusActive(nowInput) {
			const state = lifeEnsureState();
			if (state.focus.active !== true) return false;
			const now = lifeNumber(nowInput, Date.now());
			return state.focus.endsAt > now;
		}

		function lifeFocusStatus() {
			try {
				const state = lifeEnsureState();
				const active = lifeFocusActive(Date.now());
				return { active, endsAt: active ? state.focus.endsAt : 0, minutes: state.focus.minutes };
			} catch (error) {
				note("life:focus-status", error);
				return { active: false, endsAt: 0, minutes: LIFE_FOCUS_MINUTES };
			}
		}

		function lifeFocusStart(minutes) {
			try {
				const state = lifeEnsureState();
				const now = Date.now();
				const value = Number(minutes);
				const length = Number.isFinite(value) && value > 0 ? lifeClampInt(value, 1, LIFE_FOCUS_MAX_MINUTES, LIFE_FOCUS_MINUTES) : LIFE_FOCUS_MINUTES;
				state.focus = { active: true, endsAt: now + length * 60000, minutes: length };
				lifeSaveState();
				lifeRefreshAttrs();
				lifeBroadcast("config");
				return lifeFocusStatus();
			} catch (error) {
				note("life:focus-start", error);
				return { active: false, endsAt: 0, minutes: LIFE_FOCUS_MINUTES };
			}
		}

		function lifeFocusStop() {
			try {
				const state = lifeEnsureState();
				state.focus = { active: false, endsAt: 0, minutes: lifeClampInt(state.focus.minutes, 1, LIFE_FOCUS_MAX_MINUTES, LIFE_FOCUS_MINUTES) };
				lifeSaveState();
				lifeRefreshAttrs();
				lifeBroadcast("config");
				return lifeFocusStatus();
			} catch (error) {
				note("life:focus-stop", error);
				return { active: false, endsAt: 0, minutes: LIFE_FOCUS_MINUTES };
			}
		}

		// ---- cross-session memory ------------------------------------------------
		/**
		 * `pat|feed|play|talk|ack` each bump their own bucket, the shared interaction
		 * counter and lastSeenAt; the streak advances once per local calendar day
		 * (consecutive days +1, a gap restarts at 1).
		 */
		function lifeNoteInteraction(kind) {
			try {
				const state = lifeEnsureState();
				const now = Date.now();
				lifeEnsureDay(state, now);
				const bucket = LIFE_INTERACTION_BUCKET[String(kind)];
				if (bucket === undefined) return lifeStatus();
				state.memory[bucket] = Math.min(1000000000, lifeNonNegativeInt(state.memory[bucket], 0) + 1);
				state.memory.interactions = Math.min(1000000000, lifeNonNegativeInt(state.memory.interactions, 0) + 1);
				state.lastSeenAt = now;
				const dayKey = lifeDayKeyOf(now);
				if (state.lastDayKey !== dayKey) {
					const previous = lifeValidDayKey(state.lastDayKey) ? state.lastDayKey : "";
					if (previous !== "" && lifeDayNumber(dayKey) - lifeDayNumber(previous) === 1) {
						state.streakDays = Math.min(1000000, lifeNonNegativeInt(state.streakDays, 0) + 1);
					} else {
						state.streakDays = 1;
					}
					state.lastDayKey = dayKey;
				}
				lifeSaveState();
				return lifeStatus();
			} catch (error) {
				note("life:interaction", error);
				return lifeStatus();
			}
		}

		// ---- proactive speaking --------------------------------------------------
		/**
		 * Deterministic pseudo-random roll (0..99). Hash inputs: local day, hour, the
		 * 30s tick counter and talks already given; a test can replay any moment.
		 */
		function lifeProactiveRoll(state, now, period) {
			const hour = new Date(now).getHours();
			const tick = Math.floor(now / LIFE_TICK_MS);
			const periodIndex = Math.max(0, LIFE_PERIODS.indexOf(period));
			let seed = 2166136261;
			for (const part of [lifeDayNumber(state.dayKey), hour, tick, periodIndex, lifeNonNegativeInt(state.memory.talks, 0)]) {
				seed ^= (part + 0x9e3779b9) >>> 0;
				seed = Math.imul(seed, 16777619) >>> 0;
			}
			return seed % 100;
		}

		function lifeLineCandidates(state, now, period) {
			const candidates = [];
			const periodLine = LIFE_PERIOD_LINE[period];
			if (typeof periodLine === "string") candidates.push(periodLine);
			const lastSeen = lifeNumber(state.lastSeenAt, 0);
			if (lastSeen === 0 || now - lastSeen >= 2 * 24 * 60 * 60 * 1000) candidates.push("life.line.longAway");
			if (lifeFocusActive(now)) candidates.push("life.line.focus");
			const talks = lifeNonNegativeInt(state.memory.talks, 0);
			if (talks > 0 && talks % 5 === 0) candidates.push("life.line.done");
			const hour = new Date(now).getHours();
			if (hour >= 9 && hour <= 21) candidates.push("life.line.water");
			const fresh = candidates.filter((key) => state.recentLines.includes(key) === false);
			return fresh.length > 0 ? fresh : candidates;
		}

		function lifePickLine(state, now, period) {
			const pool = lifeLineCandidates(state, now, period);
			if (pool.length === 0) return "life.line.morning";
			const tick = Math.floor(now / LIFE_TICK_MS);
			let seed = 0;
			for (const part of [tick, lifeDayNumber(state.dayKey), lifeNonNegativeInt(state.memory.talks, 0), pool.length]) {
				seed = (Math.imul(seed ^ (part + 0x9e3779b9), 16777619) >>> 0) % 1000003;
			}
			return pool[seed % pool.length];
		}

		/**
		 * One proactive attempt. Returns `{spoken, reason, key, line}` and never
		 * throws. Silence reasons are explicit so support can tell "asleep" from
		 * "rolled low" from "companion off".
		 */
		function lifeTryProactive(nowInput) {
			const result = { spoken: false, reason: "", key: "", line: "" };
			try {
				const state = lifeEnsureState();
				const now = lifeNumber(nowInput, Date.now());
				lifeEnsureDay(state, now);
				if (state.muteUntil > now) {
					result.reason = "mute";
					return result;
				}
				if (lifeInQuiet(now)) {
					result.reason = "quiet-hours";
					return result;
				}
				if (lifeAwake(now) === false) {
					result.reason = "asleep";
					return result;
				}
				if (lifeFocusActive(now)) {
					result.reason = "focus";
					return result;
				}
				if (state.budget.used >= state.budget.cap) {
					result.reason = "budget";
					return result;
				}
				if (state.lastTalkAt > 0 && now - state.lastTalkAt < LIFE_PROACTIVE_GAP_MS) {
					result.reason = "gap";
					return result;
				}
				const period = lifePeriod(now);
				const roll = lifeProactiveRoll(state, now, period);
				if (roll >= LIFE_PROACTIVE_CHANCE) {
					result.reason = "roll";
					return result;
				}
				const bridge = companionDutyBridge.api;
				if (bridge === null || bridge === undefined || typeof bridge.say !== "function") {
					result.reason = "no-companion";
					return result;
				}
				const key = lifePickLine(state, now, period);
				bridge.say(key, LIFE_SAY_HOLD_MS);
				state.budget.used = Math.min(state.budget.cap, state.budget.used + 1);
				state.memory.talks = Math.min(1000000000, lifeNonNegativeInt(state.memory.talks, 0) + 1);
				state.lastTalkAt = now;
				state.recentLines = [key, ...state.recentLines.filter((entry) => entry !== key)].slice(0, 3);
				lifeSaveState();
				result.spoken = true;
				result.key = key;
				result.line = TL_T(key);
				return result;
			} catch (error) {
				note("life:proactive", error);
				result.reason = "internal-error";
				return result;
			}
		}

		// ---- replaceable pet media ----------------------------------------------
		function lifeDefaultMedia() {
			return {
				id: LIFE_DEFAULT_MEDIA.id,
				kind: LIFE_DEFAULT_MEDIA.kind,
				url: LIFE_DEFAULT_MEDIA.url,
				name: LIFE_DEFAULT_MEDIA.name,
				bytes: null,
			};
		}

		function lifeReadStoredMediaId() {
			try {
				const storage = globalThis.localStorage;
				if (storage === null || storage === undefined || typeof storage.getItem !== "function") return null;
				const raw = storage.getItem(LIFE_MEDIA_KEY);
				if (typeof raw !== "string" || raw === "" || raw === "default") return null;
				return raw.slice(0, 512);
			} catch (error) {
				return null;
			}
		}

		function lifeWriteStoredMediaId(id) {
			try {
				const storage = globalThis.localStorage;
				if (storage === null || storage === undefined) return;
				if (id === null || id === undefined || id === "default") {
					if (typeof storage.removeItem === "function") storage.removeItem(LIFE_MEDIA_KEY);
					return;
				}
				if (typeof storage.setItem === "function") storage.setItem(LIFE_MEDIA_KEY, String(id));
			} catch (error) {
				note("life:media-persist", error);
			}
		}

		function lifeGuessMediaKind(url) {
			return /\.(mp4|webm|mov|m4v|mkv|avi)(\?|#|$)/i.test(String(url)) ? "video" : "image";
		}

		/** Rebuild a catalog URL from a persisted id (catalog may not have loaded yet). */
		function lifeGuessMediaUrl(id) {
			const text = String(id);
			if (text.startsWith("ext:")) {
				const parts = text.split(":");
				if (parts.length >= 3) return ASSET_BASE + "/ext/" + parts[1] + "/" + parts.slice(2).join(":");
			}
			if (text.startsWith("/")) return text;
			return ASSET_BASE + "/" + text;
		}

		/** Synchronous selection cache, so the companion can render before any fetch. */
		function lifeLoadMediaSelection() {
			try {
				const stored = lifeReadStoredMediaId();
				if (stored === null) {
					lifeMediaSelectedId = "default";
					lifeMediaCache = lifeDefaultMedia();
					return;
				}
				lifeMediaSelectedId = stored;
				lifeMediaCache = {
					id: stored,
					kind: lifeGuessMediaKind(stored),
					url: lifeGuessMediaUrl(stored),
					name: stored,
					bytes: null,
				};
			} catch (error) {
				note("life:media-load", error);
				lifeMediaSelectedId = "default";
				lifeMediaCache = lifeDefaultMedia();
			}
		}

		function lifeResolveMediaCache(items) {
			let selected = null;
			const stored = lifeMediaSelectedId === "default" ? null : lifeMediaSelectedId;
			if (stored !== null) {
				for (const item of items) {
					if (item.id === stored) {
						selected = item;
						break;
					}
				}
				if (selected === null) {
					// The chosen file was removed from the library: fall back to the
					// default art instead of leaving a broken <img>.
					lifeMediaSelectedId = "default";
					lifeWriteStoredMediaId(null);
				}
			}
			lifeMediaCache = selected === null ? lifeDefaultMedia() : {
				id: selected.id,
				kind: selected.kind,
				url: selected.url,
				name: selected.name,
				bytes: selected.bytes,
			};
			return lifeMediaCache;
		}

		function lifeMedia() {
			try {
				if (lifeMediaCache === null) lifeLoadMediaSelection();
				const cache = lifeMediaCache;
				if (cache === null) return null;
				return { id: cache.id, kind: cache.kind, url: cache.url, name: cache.name, bytes: cache.bytes };
			} catch (error) {
				note("life:media", error);
				return null;
			}
		}

		/** Safe cleanup helper for the shared catalog fetch. */
		function lifeMediaFetchError(error) {
			try {
				if (error !== null && error !== undefined && typeof error.message === "string") return error.message.slice(0, 200);
				return String(error).slice(0, 200);
			} catch (inner) {
				return "fetch-failed";
			}
		}

		/**
		 * Catalog of replaceable pet media: every non-Wallpaper-Engine image/video in
		 * the host `_wallpapers` list that fits the 32 MiB budget, with the default
		 * cat.png pinned first. Never throws; the caller always gets a usable list.
		 */
		async function lifeListMedia() {
			const items = [lifeDefaultMedia()];
			const rejected = [];
			const fail = (error) => ({ items, rejected, error });
			try {
				if (typeof fetch !== "function") return fail("fetch-unavailable");
				let response = null;
				try {
					response = await fetch(ASSET_BASE + "/_wallpapers", { cache: "no-store" });
				} catch (error) {
					return fail(lifeMediaFetchError(error));
				}
				if (response === null || response === undefined || response.ok !== true) {
					return fail("http-" + (response === null || response === undefined ? "none" : response.status));
				}
				let payload = null;
				try {
					payload = await response.json();
				} catch (error) {
					return fail("invalid-json");
				}
				const rawItems = payload !== null && typeof payload === "object" && Array.isArray(payload.items) ? payload.items : null;
				if (rawItems === null) return fail("invalid-catalog");
				const seen = new Set(["default"]);
				for (const raw of rawItems) {
					if (raw === null || typeof raw !== "object") continue;
					if (raw.source === "we") continue;
					if (raw.kind !== "image" && raw.kind !== "video") continue;
					const id = typeof raw.id === "string" && raw.id !== "" ? raw.id : typeof raw.url === "string" ? raw.url : "";
					const url = typeof raw.url === "string" && raw.url !== "" ? raw.url : "";
					if (id === "" || url === "" || seen.has(id)) continue;
					const bytes = Number(raw.bytes);
					if (Number.isFinite(bytes) === false) continue;
					const name = typeof raw.title === "string" && raw.title !== "" ? raw.title : id;
					if (bytes > LIFE_MEDIA_CAP_BYTES) {
						rejected.push({ name, bytes, reason: "over-32MiB" });
						continue;
					}
					seen.add(id);
					items.push({ id, kind: raw.kind, url, name, bytes });
				}
				lifeResolveMediaCache(items);
				return { items, rejected };
			} catch (error) {
				note("life:media-list", error);
				return fail(lifeMediaFetchError(error));
			}
		}

		function lifeSetMedia(idOrNull) {
			return lifeSetMediaAsync(idOrNull);
		}

		async function lifeSetMediaAsync(idOrNull) {
			try {
				const catalog = await lifeListMedia();
				if (typeof catalog.error === "string") return { ok: false, reason: "catalog-unavailable", error: catalog.error };
				const wanted =
					idOrNull === null || idOrNull === undefined || idOrNull === "default" || idOrNull === ""
						? "default"
						: String(idOrNull);
				let media = null;
				if (wanted === "default") {
					media = lifeDefaultMedia();
				} else {
					for (const item of catalog.items) {
						if (item !== null && item.id === wanted) {
							media = { id: item.id, kind: item.kind, url: item.url, name: item.name, bytes: item.bytes };
							break;
						}
					}
					if (media === null) return { ok: false, reason: "unknown-media" };
				}
				const isDefault = media.id === "default";
				lifeMediaSelectedId = isDefault ? "default" : media.id;
				lifeMediaCache = media;
				lifeWriteStoredMediaId(isDefault ? null : media.id);
				try {
					const doc = lifeDoc();
					if (doc !== null && doc.body !== null && doc.body !== undefined) {
						doc.body.setAttribute("data-tl-pet-media", media.id);
					}
				} catch (error) {
					note("life:media-attr", error);
				}
				try {
					const doc = lifeDoc();
					if (doc !== null && typeof doc.dispatchEvent === "function") {
						doc.dispatchEvent(new CustomEvent("tianlight:pet-media", { detail: { ...media } }));
					}
				} catch (error) {
					note("life:media-event", error);
				}
				lifeBroadcast("media");
				return { ok: true, media: { ...media } };
			} catch (error) {
				note("life:set-media", error);
				return { ok: false, reason: "internal-error", error: lifeMediaFetchError(error) };
			}
		}

		// ---- status / configuration ---------------------------------------------
		function lifeEnergy() {
			try {
				const doc = lifeDoc();
				const hidden = doc !== null && doc.hidden === true;
				let tier = "auto";
				try {
					tier = typeof readRenderTier === "function" ? readRenderTier() : "auto";
				} catch (error) {
					tier = "auto";
				}
				return tier === "15" || hidden ? "low" : "normal";
			} catch (error) {
				return "normal";
			}
		}

		function lifeFallbackStatus() {
			let dayKey = "";
			try {
				dayKey = lifeDayKeyOf(Date.now());
			} catch (error) {
				dayKey = "";
			}
			return {
				version: LIFE_VERSION,
				period: "night",
				awake: false,
				quiet: false,
				mutedUntil: 0,
				budget: { cap: LIFE_DEFAULT_CAP, used: 0, remaining: LIFE_DEFAULT_CAP, dayKey },
				config: {
					quiet: { enabled: true, start: "23:00", end: "08:00" },
					wake: "08:00",
					sleep: "23:00",
					virtualOffsetMinutes: 0,
					cap: LIFE_DEFAULT_CAP,
				},
				memory: { interactions: 0, pats: 0, feeds: 0, plays: 0, talks: 0, acks: 0, streakDays: 0, lastSeenAt: 0, lastTalkAt: 0 },
				focus: { active: false, endsAt: 0, minutes: LIFE_FOCUS_MINUTES },
				media: lifeMediaCache === null ? null : { ...lifeMediaCache },
				deferredCount: 0,
				energy: lifeEnergy(),
				virtualOffsetMinutes: 0,
			};
		}

		function lifeStatus() {
			try {
				const state = lifeEnsureState();
				const now = Date.now();
				lifeEnsureDay(state, now);
				const cap = lifeClampInt(state.budget.cap, 0, LIFE_BUDGET_MAX, LIFE_DEFAULT_CAP);
				const used = Math.max(0, Math.floor(lifeNumber(state.budget.used, 0)));
				const active = lifeFocusActive(now);
				const media = lifeMediaCache === null ? null : { ...lifeMediaCache };
				return {
					version: LIFE_VERSION,
					period: lifePeriod(now),
					awake: lifeAwake(now),
					quiet: lifeInQuiet(now),
					mutedUntil: state.muteUntil > now ? state.muteUntil : 0,
					budget: { cap, used, remaining: Math.max(0, cap - used), dayKey: state.budget.dayKey },
					config: {
						quiet: { enabled: state.quiet.enabled, start: state.quiet.start, end: state.quiet.end },
						wake: state.wake,
						sleep: state.sleep,
						virtualOffsetMinutes: state.virtualOffsetMinutes,
						cap,
					},
					memory: {
						interactions: state.memory.interactions,
						pats: state.memory.pats,
						feeds: state.memory.feeds,
						plays: state.memory.plays,
						talks: state.memory.talks,
						acks: state.memory.acks,
						streakDays: state.streakDays,
						lastSeenAt: state.lastSeenAt,
						lastTalkAt: state.lastTalkAt,
					},
					focus: { active, endsAt: active ? state.focus.endsAt : 0, minutes: state.focus.minutes },
					media,
					deferredCount: state.deferred.length,
					energy: lifeEnergy(),
					virtualOffsetMinutes: state.virtualOffsetMinutes,
				};
			} catch (error) {
				note("life:status", error);
				return lifeFallbackStatus();
			}
		}

		function lifeConfigure(patch) {
			try {
				const state = lifeEnsureState();
				const now = Date.now();
				lifeEnsureDay(state, now);
				if (patch === null || patch === undefined || typeof patch !== "object") return lifeStatus();
				let changed = false;
				const quiet = patch.quiet;
				if (quiet !== null && typeof quiet === "object") {
					if (typeof quiet.enabled === "boolean" && quiet.enabled !== state.quiet.enabled) {
						state.quiet.enabled = quiet.enabled;
						changed = true;
					}
					const start = lifeTimeString(quiet.start, null);
					if (start !== null && start !== state.quiet.start) {
						state.quiet.start = start;
						changed = true;
					}
					const end = lifeTimeString(quiet.end, null);
					if (end !== null && end !== state.quiet.end) {
						state.quiet.end = end;
						changed = true;
					}
				}
				if (patch.budgetDaily !== undefined) {
					const value = Number(patch.budgetDaily);
					if (Number.isFinite(value) && value >= 0 && value <= LIFE_BUDGET_MAX) {
						const next = Math.round(value);
						if (next !== state.budget.cap) {
							state.budget.cap = next;
							changed = true;
						}
					}
				}
				if (patch.wake !== undefined) {
					const next = lifeTimeString(patch.wake, null);
					if (next !== null && next !== state.wake) {
						state.wake = next;
						changed = true;
					}
				}
				if (patch.sleep !== undefined) {
					const next = lifeTimeString(patch.sleep, null);
					if (next !== null && next !== state.sleep) {
						state.sleep = next;
						changed = true;
					}
				}
				if (patch.virtualOffsetMinutes !== undefined) {
					const value = Number(patch.virtualOffsetMinutes);
					if (Number.isFinite(value) && value >= -720 && value <= 720) {
						const next = Math.round(value);
						if (next !== state.virtualOffsetMinutes) {
							state.virtualOffsetMinutes = next;
							changed = true;
						}
					}
				}
				if (changed) {
					lifeSaveState();
					lifeRefreshAttrs();
					lifeBroadcast("config");
				}
				return lifeStatus();
			} catch (error) {
				note("life:configure", error);
				return lifeStatus();
			}
		}

		/** `adjustBudget` moves the daily cap (the user-facing "more/less bubbles"). */
		function lifeAdjustBudget(delta) {
			try {
				const state = lifeEnsureState();
				const value = Number(delta);
				if (Number.isFinite(value) && value !== 0) {
					const next = lifeClampInt(state.budget.cap + value, 0, LIFE_BUDGET_MAX, LIFE_DEFAULT_CAP);
					if (next !== state.budget.cap) {
						state.budget.cap = next;
						lifeSaveState();
						lifeRefreshAttrs();
						lifeBroadcast("budget");
					}
				}
				return lifeStatus();
			} catch (error) {
				note("life:adjust-budget", error);
				return lifeStatus();
			}
		}

		function lifeMuteFor(ms) {
			try {
				const state = lifeEnsureState();
				const value = Number(ms);
				if (Number.isFinite(value)) {
					const duration = lifeClampInt(value, 0, LIFE_MUTE_MAX_MS, 0);
					state.muteUntil = duration === 0 ? 0 : Date.now() + duration;
					lifeSaveState();
					lifeBroadcast("mute");
				}
				return lifeStatus();
			} catch (error) {
				note("life:mute", error);
				return lifeStatus();
			}
		}

		// ---- presentation + cross-window sync ------------------------------------
		function lifeRefreshAttrs() {
			try {
				const doc = lifeDoc();
				if (doc === null || doc.body === null || doc.body === undefined) return;
				const now = Date.now();
				doc.body.setAttribute("data-tl-life-period", lifePeriod(now));
				doc.body.setAttribute("data-tl-life-energy", lifeEnergy());
				doc.body.setAttribute("data-tl-pet-media", lifeMediaCache === null ? "default" : lifeMediaCache.id);
			} catch (error) {
				note("life:attrs", error);
			}
		}

		function lifeBroadcast(type) {
			const channel = lifeChannel;
			if (channel === null) return;
			try {
				channel.postMessage({ source: lifeInstanceId, type, at: Date.now() });
			} catch (error) {
				note("life:broadcast", error);
			}
		}

		function lifeOnChannelMessage(event) {
			try {
				const data = event === null || event === undefined ? null : event.data;
				if (data === null || typeof data !== "object") return;
				if (typeof data.source === "string" && data.source === lifeInstanceId) return;
				const type = typeof data.type === "string" ? data.type : "";
				if (type !== "config" && type !== "budget" && type !== "mute" && type !== "media") return;
				// Another window changed the shared state: adopt its persisted copy and
				// repaint, so both windows agree without a reload.
				lifeState = lifeReadStoredState();
				lifeLoadMediaSelection();
				lifeRefreshAttrs();
				// Another window picked a different look: repaint this window's pet too.
				if (type === "media") {
					try {
						const doc = lifeDoc();
						if (doc !== null && typeof doc.dispatchEvent === "function") {
							doc.dispatchEvent(new CustomEvent("tianlight:pet-media", { detail: lifeMedia() }));
						}
					} catch (error) {
						note("life:media-broadcast", error);
					}
				}
			} catch (error) {
				note("life:channel-message", error);
			}
		}

		/** 30s loop: power-aware; hidden pages do nothing until visible again. */
		function lifeTick() {
			try {
				const doc = lifeDoc();
				if (doc !== null && doc.hidden === true) return;
				lifeReplayDue();
				lifeTryProactive();
				lifeRefreshAttrs();
			} catch (error) {
				note("life:tick", error);
			}
		}

		// ---- install / dispose ---------------------------------------------------
		function installLifeRhythm() {
			const cleanups = [];
			let disposed = false;
			const dispose = () => {
				if (disposed) return;
				disposed = true;
				for (const cleanup of cleanups.splice(0).reverse()) {
					try {
						cleanup();
					} catch (error) {
						note("life:dispose", error);
					}
				}
			};
			try {
				lifeInstanceSeq += 1;
				lifeInstanceId = "life-" + lifeInstanceSeq + "-" + Date.now();
				lifeState = lifeReadStoredState();
				lifeEnsureDay(lifeState, Date.now());
				// Persist the normalized shape once: a fresh install writes createdAt/
				// defaults, an old shape is migrated in place. Cross-window readers and
				// the next session then see exactly what this session sees.
				lifeSaveState();
				lifeLoadMediaSelection();
				const previousGlobal = globalThis.tianlightLife;
				const previousGate = companionDutyBridge.lifeGate;

				// 1) bridge: the duty channel reads this on every inbound action.
				const bridgeGate = (action) => lifeGate(action);
				companionDutyBridge.lifeGate = bridgeGate;
				cleanups.push(() => {
					if (companionDutyBridge.lifeGate !== bridgeGate) return;
					companionDutyBridge.lifeGate = previousGate === undefined ? null : previousGate;
				});

				// 2) observation attributes for the stylesheet / devtools.
				lifeRefreshAttrs();
				cleanups.push(() => {
					try {
						const doc = lifeDoc();
						if (doc === null || doc.body === null || doc.body === undefined) return;
						doc.body.removeAttribute("data-tl-life-period");
						doc.body.removeAttribute("data-tl-life-energy");
						doc.body.removeAttribute("data-tl-pet-media");
					} catch (error) {
						note("life:attrs-dispose", error);
					}
				});

				// 3) 30s rhythm tick (audit-visible window.setInterval/clearInterval pair).
				if (typeof window !== "undefined" && window !== null && typeof window.setInterval === "function") {
					const timer = window.setInterval(lifeTick, LIFE_TICK_MS);
					cleanups.push(() => {
						try {
							window.clearInterval(timer);
						} catch (error) {
							note("life:clear-timer", error);
						}
					});
				}

				// 4) visibility resume: refresh immediately, then run one full tick.
				const doc = lifeDoc();
				if (doc !== null && typeof doc.addEventListener === "function") {
					const onVisibility = () => {
						try {
							lifeRefreshAttrs();
							if (doc.hidden !== true) lifeTick();
						} catch (error) {
							note("life:visibility", error);
						}
					};
					doc.addEventListener("visibilitychange", onVisibility);
					cleanups.push(() => {
						try {
							doc.removeEventListener("visibilitychange", onVisibility);
						} catch (error) {
							note("life:visibility-dispose", error);
						}
					});
				}

				// 5) cross-window sync (optional; a missing BroadcastChannel is fine).
				try {
					if (typeof BroadcastChannel === "function") {
						const channel = new BroadcastChannel(LIFE_CHANNEL);
						channel.onmessage = lifeOnChannelMessage;
						lifeChannel = channel;
						cleanups.push(() => {
							try {
								channel.onmessage = null;
								channel.close();
							} catch (error) {
								note("life:channel-close", error);
							}
							if (lifeChannel === channel) lifeChannel = null;
						});
					}
				} catch (error) {
					lifeChannel = null;
					note("life:channel-open", error);
				}

				// 6) public API (strict v1 shape consumed by the settings page + pet).
				const api = {
					version: LIFE_VERSION,
					status: () => lifeStatus(),
					configure: (patch) => lifeConfigure(patch),
					adjustBudget: (delta) => lifeAdjustBudget(delta),
					muteFor: (ms) => lifeMuteFor(ms),
					gate: (action) => lifeGate(action),
					replayDue: (now) => lifeReplayDue(now),
					noteInteraction: (kind) => lifeNoteInteraction(kind),
					focusStart: (minutes) => lifeFocusStart(minutes),
					focusStop: () => lifeFocusStop(),
					focusStatus: () => lifeFocusStatus(),
					listMedia: () => lifeListMedia(),
					setMedia: (idOrNull) => lifeSetMedia(idOrNull),
					media: () => lifeMedia(),
					tryProactive: (now) => lifeTryProactive(now),
				};
				globalThis.tianlightLife = api;
				cleanups.push(() => {
					if (globalThis.tianlightLife !== api) return;
					if (previousGlobal === undefined) delete globalThis.tianlightLife;
					else globalThis.tianlightLife = previousGlobal;
				});
				return dispose;
			} catch (error) {
				note("life:install-failed", error);
				dispose();
				return dispose;
			}
		}
		//#endregion
		//#region reasoning rheostat
		// v0.5.0：滑杆的所有可见文案走 i18n；组件内用 useTl5I18n()，语言变化即时重渲染。
		registerTl5Strings({
			zh: {
				"rheo.label": "推理等级",
				"rheo.slider": "推理等级",
				"rheo.titleValue": "推理等级：{label}",
				"rheo.empty": "推理 · 未就绪",
				"rheo.emptyTitle": "推理等级：未读取到当前会话的模型选择",
				"rheo.faultTitle": "推理等级：{reason}",
				"rheo.emptyReason": "推理 · {reason}",
				"rheo.fault.noEfforts": "无档位",
				"rheo.fault.loading": "读取中",
				"rheo.fault.noRemote": "未连接",
				"rheo.fault.error": "读取失败",
				"rheo.fault.rejected": "被拒绝",
				"rheo.level.minimal": "极简",
				"rheo.level.low": "低",
				"rheo.level.medium": "中",
				"rheo.level.high": "高",
				"rheo.level.max": "最高",
				"rheo.level.none": "关闭",
				"rheo.error.notMounted": "remote.session.modelCatalog 尚未挂载",
			},
			en: {
				"rheo.label": "Reasoning level",
				"rheo.slider": "Reasoning level",
				"rheo.titleValue": "Reasoning level: {label}",
				"rheo.empty": "Reasoning · not ready",
				"rheo.emptyTitle": "Reasoning level: no model selection for this session",
				"rheo.faultTitle": "Reasoning level: {reason}",
				"rheo.emptyReason": "Reasoning · {reason}",
				"rheo.fault.noEfforts": "No levels",
				"rheo.fault.loading": "Loading",
				"rheo.fault.noRemote": "Not connected",
				"rheo.fault.error": "Read failed",
				"rheo.fault.rejected": "Rejected",
				"rheo.level.minimal": "Minimal",
				"rheo.level.low": "Low",
				"rheo.level.medium": "Medium",
				"rheo.level.high": "High",
				"rheo.level.max": "Max",
				"rheo.level.none": "Off",
				"rheo.error.notMounted": "remote.session.modelCatalog is not mounted yet",
			},
		});

		/**
		 * A draggable detent rail for the session's reasoning effort, mounted beside
		 * the composer's existing controls.
		 *
		 * It is strictly additive and fail-safe: it reads the live selection from the
		 * `modelSelection` projection, writes through the same `session.selectModel`
		 * remote the shipped picker uses, and renders `null` when any of that is
		 * unavailable. A missing hook or a failed catalog never disturbs the composer.
		 */
		function installEffortRheostat(ctx) {
			if (React === null) {
				note("rheostat:react-missing");
				return () => {};
			}
			if (typeof ctx.inject !== "function") {
				note("rheostat:no-inject");
				return () => {};
			}
			// `slots` is published by a plugin that activates AFTER this one, so an eager
			// ctx.get('slots') during apply() is undefined on every boot and the control
			// silently never registered. Wait for the service instead of probing once.
			return ctx.inject(["slots"], (scoped) => {
				const slots = scoped.get("slots");
				if (slots === undefined) {
					note("rheostat:slots-missing");
					return () => {};
				}
				return registerRheostat(scoped, slots);
			});
		}

		function registerRheostat(ctx, slots) {
			// `remote` is a guarded context property, and ctx.inject(["remote"]) never fires
			// for it. The legal ways in: the loader injection declared in package.json
			// (dsh.client.inject -> api-remotes), a dotted "remote.session" service key, or
			// a guarded get(). Probe every path and use whichever answers.
			let remoteScope = null;
			let sessionScope = null;
			const disposeRemote = ctx.inject(["remote"], (scoped) => {
				remoteScope = scoped;
				return () => {
					remoteScope = null;
				};
			});
			const disposeSession = ctx.inject(["remote.session"], (scoped) => {
				sessionScope = scoped;
				return () => {
					sessionScope = null;
				};
			});
			/** The session remote namespace: the object carrying modelCatalog/selectModel. */
			const resolveRemoteSession = () => {
				if (sessionScope !== null) {
					try {
						const direct = sessionScope.get("remote.session");
						if (direct !== undefined) return direct;
					} catch {
						// fall through to the next path
					}
				}
				if (remoteScope !== null) {
					try {
						const viaScope = remoteScope.remote;
						if (viaScope?.session !== undefined) return viaScope.session;
					} catch {
						// fall through
					}
				}
				for (const key of ["remote.session", "remote"]) {
					try {
						const value = ctx.get(key);
						if (value?.modelCatalog !== undefined) return value;
						if (value?.session?.modelCatalog !== undefined) return value.session;
					} catch {
						// guarded access; keep probing
					}
				}
				return undefined;
			};

			/** Rail insets in px; must match [data-tl-rheo-track] in the stylesheet. */
			const RAIL_LEFT = 12;
			const RAIL_RIGHT = 40;
			// 失败原因 / 档位标签都存 key，渲染时再翻译（语言切换无需重建组件）。
			const FAULT_KEYS = {
				loading: "rheo.fault.loading",
				"no-remote": "rheo.fault.noRemote",
				error: "rheo.fault.error",
				rejected: "rheo.fault.rejected",
				"no-efforts": "rheo.fault.noEfforts",
			};
			const LABEL_KEYS = {
				minimal: "rheo.level.minimal",
				low: "rheo.level.low",
				medium: "rheo.level.medium",
				high: "rheo.level.high",
				max: "rheo.level.max",
				none: "rheo.level.none",
			};

			/**
			 * Effort levels for the selected model, read from the host catalog.
			 * @returns `{ ids, names, defaultEffort }`, or null when this model declares none.
			 *
			 * The catalog is NOT a flat group list: every entry is `{ kind, group }`, and
			 * the value to send back is `effort.id` (not a guessed label). Both mistakes
			 * made the control write values the host rejected, so the level never changed.
			 */
			const readEfforts = (catalog, selection) => {
				const groups = catalog?.groups;
				if (!Array.isArray(groups) || selection === null) return null;
				const collect = (model) => {
					const efforts = model?.reasoning?.efforts;
					if (!Array.isArray(efforts) || efforts.length < 2) return null;
					const ids = [];
					const names = {};
					for (const effort of efforts) {
						if (typeof effort === "string") {
							ids.push(effort);
							continue;
						}
						if (typeof effort?.id !== "string") continue;
						ids.push(effort.id);
						if (typeof effort.name === "string" && effort.name !== "") names[effort.id] = effort.name;
					}
					if (ids.length < 2) return null;
					const defaultEffort =
						typeof model.reasoning?.defaultEffort === "string" ? model.reasoning.defaultEffort : null;
					return { ids, names, defaultEffort };
				};
				const flat = [];
				for (const entry of groups) {
					const group = entry?.group === undefined ? entry : entry.group;
					for (const model of group?.models ?? []) flat.push({ group, model });
				}
				// Exact provider+model first...
				for (const { group, model } of flat) {
					if (group?.id !== selection.provider || model?.id !== selection.model) continue;
					const found = collect(model);
					if (found !== null) return found;
				}
				// ...then model alone: a provider id may be aliased between the settings
				// file and the live registry, and refusing the match hid a valid scale.
				for (const { model } of flat) {
					if (model?.id !== selection.model) continue;
					const found = collect(model);
					if (found !== null) return found;
				}
				return null;
			};

			function Rheostat(props) {
				const { t } = useTl5I18n();
				const sessionId = props.sessionId;
				const useProjection = props.useProjection;
				const snapshot = typeof useProjection === "function" ? useProjection("modelSelection") : null;
				const selection = snapshot?.next ?? snapshot?.lastUsed ?? null;

				// Empty until the host catalog answers. Sending guessed effort ids was exactly
				// what made the control look alive while the level never changed.
				const [levels, setLevels] = React.useState([]);
				const [labels, setLabels] = React.useState({});
				const [defaultEffort, setDefaultEffort] = React.useState(null);
				// Some conversations have no explicit selection yet. The catalog carries the
				// default one, which is what the host would use anyway — falling back to it
				// is why this no longer renders "未就绪" in a fresh chat.
				const [catalogDefault, setCatalogDefault] = React.useState(null);
				// Why the scale is missing, surfaced in the placeholder so the failure names
				// itself instead of needing devtools.
				const [fault, setFault] = React.useState("loading");
				const [busy, setBusy] = React.useState(false);
				// The continuous position is written straight to the DOM node. Driving it
				// through React state re-rendered the component every frame, which is what
				// made the motion stutter; React now re-renders only on discrete changes.
				const dragRef = React.useRef(null);
				// `draggingRef` is the ONLY authority for whether pointer moves count.
				const draggingRef = React.useRef(false);
				const [held, setHeld] = React.useState(false);
				// Seeded lazily inside the effect: committedPos is declared further down, so
				// referencing it in a useRef initializer would hit the temporal dead zone.
				const springRef = React.useRef(null);
				const railRef = React.useRef(null);
				const applyPos = React.useCallback((value) => {
					const node = railRef.current;
					if (node === null) return;
					// A non-finite value invalidates `left: calc(...)`, which collapses the rail
					// into a distorted layout — sanitize before it reaches the stylesheet.
					const safe = Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
					node.style.setProperty("--tl-rheo-pos", String(safe));
				}, []);

				const active = selection ?? catalogDefault;
				const provider = active?.provider;
				const model = active?.model;

				// Switching conversations reuses the same component instance. Without this
				// reset the previous session's scale, fault text and drag state leak into
				// the new one, which is exactly how the control "breaks in another chat".
				const sessionRef = React.useRef(sessionId);
				React.useEffect(() => {
					if (sessionRef.current === sessionId) return;
					sessionRef.current = sessionId;
					setLevels([]);
					setLabels({});
					setDefaultEffort(null);
					setFault("loading");
					setDragIndex(null);
					setBusy(false);
					springRef.current = null;
				}, [sessionId]);

				React.useEffect(() => {
					let alive = true;
					let attempt = 0;
					let timer = 0;

					const run = async () => {
						if (!alive) return;
						try {
							const session = resolveRemoteSession();
							// `remote.session` is mounted asynchronously by the api-remotes plugin:
							// running once was a race that always lost, and the failure looked final.
							if (session === undefined || typeof session.modelCatalog !== "function") {
								throw new Error(TL_T("rheo.error.notMounted"));
							}
							const response = await session.modelCatalog();
							if (!alive) return;
							if (response?.ok !== true) {
								setFault("rejected");
								return;
							}
							const def = response.value?.default;
							const defaultSelection =
								def !== undefined && typeof def.provider === "string" && typeof def.model === "string"
									? {
											provider: def.provider,
											model: def.model,
											// The host also reports which effort it would apply; dropping it
											// made the knob guess between the model default and the highest.
											reasoningEffort: typeof def.reasoningEffort === "string" ? def.reasoningEffort : undefined,
										}
									: null;
							if (alive) setCatalogDefault(defaultSelection);
							const chosen = selection !== null ? selection : defaultSelection;
							const found =
								chosen === null ? null : readEfforts(response.value, { provider: chosen.provider, model: chosen.model });
							if (found === null) {
								setFault("no-efforts");
								return;
							}
							setFault(null);
							setLevels(found.ids);
							setLabels(found.names);
							setDefaultEffort(found.defaultEffort);
						} catch (error) {
							if (!alive) return;
							attempt += 1;
							if (attempt <= 12) {
								timer = window.setTimeout(run, 500);
								return;
							}
							const message = error instanceof Error ? error.message : String(error);
							setFault("err:" + message);
						}
					};

					void run();
					return () => {
						alive = false;
						if (timer !== 0) window.clearTimeout(timer);
					};
				}, [provider, model, sessionId]);

				// Null-safe derivation so every hook below runs on every render: a component
				// may not return before its hooks, or React rejects the changing count.
				const currentIndex =
					active === null || levels.length === 0
						? 0
						: Math.max(
								0,
								levels.indexOf(
									active.reasoningEffort ?? defaultEffort ?? levels[levels.length - 1],
								),
							);
				const steps = levels.length - 1;
				const committedPos = steps > 0 ? currentIndex / steps : 0;
				const dragging = held;
				// Only the detent index re-renders (label + aria); the continuous position
				// lives in the node's custom property.
				const [dragIndex, setDragIndex] = React.useState(null);
				const nearest = dragIndex === null ? currentIndex : dragIndex;
				const [pulse, setPulse] = React.useState(0);
				React.useEffect(() => {
					setPulse((n) => n + 1);
				}, [nearest]);
				React.useEffect(() => {
					if (dragging) return undefined;
					if (springRef.current === null) springRef.current = { pos: committedPos, vel: 0 };
					// Paint the seeded position before the first frame so the bead never
					// appears at the left edge and then jump into place.
					applyPos(springRef.current.pos);
					let raf = 0;
					// Near-critical damping (zeta ~0.96): a short overshoot, then settle.
					// Lower damping / higher stiffness is what made it wobble violently.
					const stiffness = 170;
					const damping = 25;
					const dt = 1 / 60;
					let pos = springRef.current.pos;
					let vel = 0;
					const step = () => {
						const target = committedPos;
						vel += ((target - pos) * stiffness - vel * damping) * dt;
						pos += vel * dt;
						const settled = Math.abs(target - pos) < 0.001 && Math.abs(vel) < 0.001;
						springRef.current = { pos: settled ? target : pos, vel: settled ? 0 : vel };
						applyPos(settled ? target : pos);
						if (!settled) raf = requestAnimationFrame(step);
					};
					raf = requestAnimationFrame(step);
					return () => cancelAnimationFrame(raf);
				}, [committedPos, dragging, applyPos]);

				// All hooks are above this line: an early return before any hook would make
				// the hook count change when the selection arrives, which React rejects.
				// Every non-working state renders something legible: a hairline at low
				// opacity is invisible on a bright wallpaper, which is how the control
				// appeared to "not exist" instead of reporting why.
				const faultReason = () => {
					if (typeof fault === "string" && fault.startsWith("err:")) return fault.slice(4);
					const key = fault === null || fault === undefined ? undefined : FAULT_KEYS[fault];
					return key === undefined ? t("rheo.fault.noEfforts") : t(key);
				};
				if (active === null || sessionId === undefined) {
					return React.createElement(
						"div",
						{ "data-tl-rheo": "", "data-tl-rheo-empty": "", title: t("rheo.emptyTitle") },
						React.createElement("span", { "data-tl-rheo-empty-text": "" }, t("rheo.empty")),
					);
				}
				if (levels.length < 2) {
					const reason = faultReason();
					return React.createElement(
						"div",
						{ "data-tl-rheo": "", "data-tl-rheo-empty": "", title: t("rheo.faultTitle", { reason }) },
						React.createElement("span", { "data-tl-rheo-empty-text": "" }, t("rheo.emptyReason", { reason })),
					);
				}

				const commit = (target) => {
					if (busy || target === currentIndex) return;
					const session = resolveRemoteSession();
					if (typeof session?.selectModel !== "function") {
						note("rheostat:write-unavailable");
						return;
					}
					setBusy(true);
					Promise.resolve(
						session.selectModel({
							sessionId,
							provider: active.provider,
							model: active.model,
							reasoningEffort: levels[target],
						}),
					)
						.catch(() => {})
						.finally(() => setBusy(false));
				};

				const ratioAt = (clientX) => {
					const rail = railRef.current;
					if (rail === null) return committedPos;
					const rect = rail.getBoundingClientRect();
					const usable = rect.width - RAIL_LEFT - RAIL_RIGHT;
					if (usable <= 0) return committedPos;
					return Math.min(1, Math.max(0, (clientX - rect.left - RAIL_LEFT) / usable));
				};

				const onPointerDown = (event) => {
					if (event.button !== undefined && event.button !== 0) return;
					draggingRef.current = true;
					setHeld(true);
					railRef.current?.setPointerCapture?.(event.pointerId);
					const ratio = ratioAt(event.clientX);
					dragRef.current = ratio;
					applyPos(ratio);
					setDragIndex(steps > 0 ? Math.round(ratio * steps) : 0);
					event.preventDefault();
				};
				const onPointerMove = (event) => {
					// Only the held pointer moves the control; after release the spring owns it.
					if (!draggingRef.current) return;
					const ratio = ratioAt(event.clientX);
					dragRef.current = ratio;
					applyPos(ratio);
					const index = steps > 0 ? Math.round(ratio * steps) : 0;
					setDragIndex((current) => (current === index ? current : index));
				};
				const onPointerUp = (event) => {
					railRef.current?.releasePointerCapture?.(event.pointerId);
					const wasHeld = draggingRef.current;
					draggingRef.current = false;
					setHeld(false);
					const releasePos = dragRef.current;
					dragRef.current = null;
					setDragIndex(null);
					if (!wasHeld || releasePos === null) return;
					const target = steps > 0 ? Math.round(Math.min(1, Math.max(0, releasePos)) * steps) : 0;
					// Hand the exact release point to the spring so the settle starts where the
					// finger left off instead of snapping first.
					springRef.current = { pos: releasePos, vel: 0 };
					applyPos(releasePos);
					if (target !== currentIndex) commit(target);
				};

				const effortLabel = (id) => {
					const name = labels[id];
					if (typeof name === "string" && name !== "") return name;
					const key = LABEL_KEYS[id];
					return key === undefined ? String(id) : t(key);
				};
				const label = effortLabel(levels[currentIndex]);
				const activeLabel = effortLabel(levels[nearest]);
				return React.createElement(
					"div",
					{
						ref: railRef,
						"data-tl-rheo": "",
						"data-tl-busy": busy ? "" : undefined,
						"data-tl-drag": dragging ? "" : undefined,
						role: "slider",
						tabIndex: 0,
						"aria-label": t("rheo.slider"),
						"aria-valuemin": 0,
						"aria-valuemax": steps,
						"aria-valuenow": nearest,
						"aria-valuetext": activeLabel,
						title: t("rheo.titleValue", { label }),
						onPointerDown,
						onPointerMove,
						onPointerUp,
						onPointerCancel: onPointerUp,
						onKeyDown: (event) => {
							if (event.key === "ArrowRight" || event.key === "ArrowUp") {
								event.preventDefault();
								commit(Math.min(steps, currentIndex + 1));
							} else if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
								event.preventDefault();
								commit(Math.max(0, currentIndex - 1));
							}
						},
					},
					React.createElement("span", { "data-tl-rheo-track": "" }),
					React.createElement("span", { "data-tl-rheo-fill": "" }),
					React.createElement("span", { "data-tl-rheo-halo": "" }),
					React.createElement("span", { "data-tl-rheo-bead": "" }),
					React.createElement("span", { key: "p" + pulse, "data-tl-rheo-pulse": "" }),
					React.createElement("span", { key: "l" + nearest, "data-tl-rheo-label": "" }, activeLabel),
				);
			}

			const disposeSlots = slots.inject("conversation.input.right", () => {
				return slots.register(
					{ name: "conversation.input.right", id: "ui-skin-tianlight:rheostat", order: -10 },
					Rheostat,
				);
			});
			// Both scopes are owned by this activation; leaking either leaves a stale
			// remote scope or a registered cell behind after the skin is switched off.
			return () => {
				if (typeof disposeSlots === "function") disposeSlots();
				if (typeof disposeRemote === "function") disposeRemote();
				if (typeof disposeSession === "function") disposeSession();
			};
		}
		//#endregion
		//#region low power
		/**
		 * Low-power mode. Three inputs, one decision:
		 *   forced on/off from the user
		 *   prefers-reduced-motion  (an explicit accessibility signal)
		 *   saveData / battery <= 20% and discharging
		 * Active mode pauses the wallpaper video on its current frame — a video element
		 * freezes for free — and stops the rail mirror from drawing.
		 *
		 * i18n (v0.5.2): `lowPowerController.state()` keeps its v0.4 fields and adds two
		 * structured ones, so the panel can localize at RENDER time instead of showing a
		 * string frozen in the language that happened to be active when the battery event
		 * fired:
		 *   { mode, active, reason, detail, detailKey, detailParams }
		 *   - detail:       language-neutral numeric percent, e.g. "15%";
		 *   - detailKey:    i18n key for the explanation ("lowpower.batteryDetail");
		 *   - detailParams: TL_T params, e.g. { pct: 15 }.
		 * A consumer that has not been updated yet can always show `detail` (no CJK leak);
		 * `lowpower.batteryDetail` holds the localized explanation for that percent.
		 */
		registerTl5Strings({
			zh: {
				"lowpower.batteryDetail": "{pct}% 电量且未充电",
				"lowpower.audioStopped": "省电模式，已停止音频",
			},
			en: {
				"lowpower.batteryDetail": "{pct}% battery, not charging",
				"lowpower.audioStopped": "Low-power mode: audio analysis stopped",
			},
		});
		const LOWPOWER_KEY = "tianlight.lowpower";
		let lowPowerController = null;

		function readLowPowerMode() {
			try {
				const saved = globalThis.localStorage.getItem(LOWPOWER_KEY);
				if (saved === "on" || saved === "off" || saved === "auto") return saved;
			} catch {
				// storage may be blocked
			}
			return "auto";
		}

		function installLowPower() {
			let mode = readLowPowerMode();
			let battery = null;
			let query = null;
			let active = false;
			let reason = "";
			let detail = "";
			// Structured companions of `detail` (see the region doc above). Always
			// present so the snapshot shape does not change between states.
			let detailKey = "";
			let detailParams = null;
			let subscriber = null;
			const snapshot = () => ({ mode, active, reason, detail, detailKey, detailParams });

			const apply = () => {
				let nextActive = mode === "on";
				let nextReason = mode === "on" ? "manual" : "";
				let nextDetail = "";
				let nextDetailKey = "";
				let nextDetailParams = null;
				if (mode === "auto") {
					const reduced = query !== null && query.matches === true;
					const saveData = globalThis.navigator?.connection?.saveData === true;
					const low = battery !== null && battery.level <= 0.2 && battery.charging === false;
					if (reduced) {
						nextActive = true;
						nextReason = "reduced-motion";
					} else if (saveData) {
						nextActive = true;
						nextReason = "save-data";
					} else if (low) {
						nextActive = true;
						nextReason = "battery";
						const pct = Math.round((battery.level ?? 0) * 100);
						// Language-neutral on purpose: no CJK reaches the panel in en mode.
						nextDetail = pct + "%";
						nextDetailKey = "lowpower.batteryDetail";
						nextDetailParams = { pct };
					}
				}
				const changed =
					nextActive !== active ||
					nextReason !== reason ||
					nextDetail !== detail ||
					nextDetailKey !== detailKey;
				active = nextActive;
				reason = nextReason;
				detail = nextDetail;
				detailKey = nextDetailKey;
				detailParams = nextDetailParams;
				const body = document.body;
				if (body === null) return;
				if (active) {
					body.setAttribute("data-tl-lowpower", "");
					body.setAttribute("data-tl-lowpower-reason", reason);
				} else {
					body.removeAttribute("data-tl-lowpower");
					body.removeAttribute("data-tl-lowpower-reason");
				}
				if (active) {
					if (scenePlayback !== null) scenePlayback.pause();
					if (railPlayback !== null) railPlayback.pause();
					if (typeof audioController !== "undefined") audioController.stop(TL_T("lowpower.audioStopped"));
				} else {
					if (scenePlayback !== null) scenePlayback.resume();
					if (railPlayback !== null) railPlayback.resume();
				}
				if (changed && subscriber !== null) {
					try {
						subscriber(snapshot());
					} catch (error) {
						note("lowpower:subscriber", error);
					}
				}
			};

			const onSignal = () => apply();
			try {
				if (typeof globalThis.matchMedia === "function") {
					query = globalThis.matchMedia("(prefers-reduced-motion: reduce)");
					query.addEventListener?.("change", onSignal);
				}
			} catch {
				query = null;
			}
			try {
				if (typeof globalThis.navigator?.getBattery === "function") {
					void globalThis.navigator
						.getBattery()
						.then((value) => {
							battery = value;
							battery.addEventListener?.("levelchange", onSignal);
							battery.addEventListener?.("chargingchange", onSignal);
							apply();
						})
						.catch(() => {
							// no battery API: the other signals still work
						});
				}
			} catch {
				battery = null;
			}

			apply();
			lowPowerController = {
				read: () => mode,
				/** Why playback is parked, not just whether it is. The panel needs both. */
				state: snapshot,
				subscribe: (listener) => {
					subscriber = typeof listener === "function" ? listener : null;
					if (subscriber !== null) subscriber(snapshot());
					return () => {
						if (subscriber === listener) subscriber = null;
					};
				},
				// Re-apply after a late-arriving playback target: the scene mounts after this
				// supervisor, and the rail source can be swapped at any time.
				sync: apply,
				set: (next) => {
					mode = next === "on" || next === "off" ? next : "auto";
					try {
						globalThis.localStorage.setItem(LOWPOWER_KEY, mode);
					} catch {
						// persistence is optional
					}
					apply();
				},
			};

			return () => {
				lowPowerController = null;
				subscriber = null;
				query?.removeEventListener?.("change", onSignal);
				battery?.removeEventListener?.("levelchange", onSignal);
				battery?.removeEventListener?.("chargingchange", onSignal);
				const body = document.body;
				if (body !== null) {
					body.removeAttribute("data-tl-lowpower");
					body.removeAttribute("data-tl-lowpower-reason");
				}
				if (scenePlayback !== null) scenePlayback.resume();
			};
		}
		//#endregion

		//#region glass opacity
		/**
		 * One multiplier for every glass surface. 1 = the designed look; below makes
		 * surfaces more see-through, above makes them more solid. Expressed as a
		 * multiplier rather than an absolute alpha so light and dark keep their own
		 * base values.
		 */
		const GLASS_KEY = "tianlight.glass";
		let glassController = null;

		function readGlass() {
			try {
				const raw = Number(globalThis.localStorage.getItem(GLASS_KEY));
				if (Number.isFinite(raw) && raw > 0) return Math.min(1.5, Math.max(0.35, raw));
			} catch {
				// storage may be blocked
			}
			return 1;
		}

		function applyGlass(multiplier) {
			const body = document.body;
			if (body === null) return;
			body.style.setProperty("--tl-glass-m", String(Math.min(1.5, Math.max(0.35, multiplier))));
		}

		function installGlassOpacity() {
			let level = readGlass();
			applyGlass(level);
			glassController = {
				read: () => level,
				apply: (next) => {
					level = Math.min(1.5, Math.max(0.35, Number(next) || 1));
					applyGlass(level);
					try {
						globalThis.localStorage.setItem(GLASS_KEY, String(level));
					} catch {
						// persistence is optional
					}
				},
			};
			return () => {
				glassController = null;
				const body = document.body;
				if (body !== null) body.style.removeProperty("--tl-glass-m");
			};
		}

		// ---- v1.0.0 liquid-glass depth: off / frosted / soft / real ----
		/**
		 * The depth is a semantic preset over the scene layer: `off` keeps the v0.7
		 * look (no extra compositing), the three on-levels add a specular + blur
		 * treatment between the wallpaper and the product UI (the `[data-tl-scene]`
		 * layer, painted by the stylesheet ::after). The effective level degrades
		 * automatically under low power / 15fps so the energy promise holds.
		 */
		const GLASS_DEPTH_KEY = "tianlight.glassDepth";
		const GLASS_DEPTHS = ["off", "frosted", "soft", "real"];
		const GLASS_DEPTH_DEFAULT = "off";
		let glassDepthController = null;

		function readGlassDepth() {
			try {
				const raw = globalThis.localStorage.getItem(GLASS_DEPTH_KEY);
				if (GLASS_DEPTHS.includes(raw)) return raw;
			} catch {
				// storage may be blocked
			}
			return GLASS_DEPTH_DEFAULT;
		}

		function effectiveGlassDepth(depth) {
			if (depth === "off") return "off";
			try {
				if (readRenderTier() === "15") return "soft";
				if (document.body !== null && document.body.hasAttribute("data-tl-lowpower")) return depth === "real" ? "soft" : depth;
			} catch {
				// degrade silently
			}
			return depth;
		}

		function applyGlassDepth(depth) {
			const body = document.body;
			if (body === null) return "off";
			const effective = effectiveGlassDepth(depth);
			body.setAttribute("data-tl-glass-depth", depth);
			body.setAttribute("data-tl-glass-effective", effective);
			return effective;
		}

		function installGlassDepth() {
			let depth = readGlassDepth();
			let effective = applyGlassDepth(depth);
			glassDepthController = {
				read: () => depth,
				effective: () => effective,
				levels: () => [...GLASS_DEPTHS],
				apply: (next) => {
					depth = GLASS_DEPTHS.includes(next) ? next : GLASS_DEPTH_DEFAULT;
					effective = applyGlassDepth(depth);
					try {
						globalThis.localStorage.setItem(GLASS_DEPTH_KEY, depth);
					} catch {
						// persistence is optional
					}
					return { depth, effective };
				},
				refresh: () => {
					effective = applyGlassDepth(depth);
					return effective;
				},
			};
			let observer = null;
			try {
				observer = new MutationObserver(() => {
					const next = effectiveGlassDepth(depth);
					if (next === effective) return;
					effective = applyGlassDepth(depth);
				});
				observer.observe(document.body, { attributes: true, attributeFilter: ["data-tl-lowpower", "data-tl-lowpower-reason"] });
			} catch (error) {
				note("glass-depth:observer", error);
			}
			return () => {
				glassDepthController = null;
				try {
					observer?.disconnect();
				} catch (error) {
					note("glass-depth:disconnect", error);
				}
				const body = document.body;
				if (body !== null) {
					body.removeAttribute("data-tl-glass-depth");
					body.removeAttribute("data-tl-glass-effective");
				}
			};
		}
		//#endregion

		//#region legibility
		/**
		 * D5 可读性护栏（type-i18n 工作流）：
		 *
		 *   - 壁纸面板打开 / 壁纸媒体切换 / 主题切换时（一个 MutationObserver，
		 *     节流 ≥1.5s）采样当前壁纸画面（shaderSwatch → image → video）求平均
		 *     亮度；
		 *   - 面板底色取实际 computed style（读不到用主题常量），与壁纸采样合成
		 *     后按 WCAG 相对亮度算正文色对比度；
		 *   - 低于阈值（默认 4.5:1，3–7 可调）且护栏开启时，把
		 *     `body[data-tl-legibility="boost"]` 打开，抬高面板填充并加一层文字
		 *     阴影；恢复足够时再移除；
		 *   - 绝不改壁纸本身，也不碰场景 canvas / video 的任何样式。
		 *
		 * 设置持久化在 `tianlight.legibility`，统一走 legibilityController：
		 * 排版面板与壁纸面板的“可读性”分区共用这一份状态，subscribe 即时同步。
		 */
		const LEGIBILITY_KEY = "tianlight.legibility";
		const LEGIBILITY_DEFAULTS = { enabled: true, threshold: 4.5, boost: 0.12 };
		const LEGIBILITY_THRESHOLD_MIN = 3;
		const LEGIBILITY_THRESHOLD_MAX = 7;
		/** 提亮后面板填充的目标不透明度：仍保留壁纸色相，但文字必须压得住。 */
		const LEGIBILITY_FILL_ALPHA = 0.97;
		/** 两次采样之间的最小间隔：视频每帧都在变，逐帧采样会自己制造抖动。 */
		const LEGIBILITY_MIN_INTERVAL = 1500;

		registerTl5Strings({
			zh: {
				"legibility.title": "可读性",
				"legibility.guard": "对比度不足时提亮面板",
				"legibility.threshold": "对比度阈值",
				"legibility.status": "对比度 {ratio}:1 · 阈值 {threshold}:1",
				"legibility.statusBoosted": "对比度 {ratio}:1 · 已提亮面板",
				"legibility.statusIdle": "未采样到壁纸画面，暂不介入",
				"legibility.hint": "只调整面板底色与文字阴影，不改变壁纸本身的观感。",
			},
			en: {
				"legibility.title": "Readability",
				"legibility.guard": "Brighten the panel when contrast is low",
				"legibility.threshold": "Contrast threshold",
				"legibility.status": "Contrast {ratio}:1 · threshold {threshold}:1",
				"legibility.statusBoosted": "Contrast {ratio}:1 · panel brightened",
				"legibility.statusIdle": "No wallpaper frame sampled yet — guard idle",
				"legibility.hint": "Only the panel fill and text shadow change; the wallpaper itself is untouched.",
			},
		});

		// Boost 只作用于面板/菜单这类“读字表面”，且全部以 body 作用域开头。
		// 提高的不透明度通过 --tl-legibility-solid 同时覆盖面板自身的
		// --tl-panel-fill（sticky 头、分组底都用它），避免只有外层变实。
		registerTl5Css(String.raw`
body[data-dsh-tianlight] {
	--tl-legibility-solid: rgba(250, 252, 255, 0.97);
	--tl-legibility-shadow: 0 1px 2px rgba(8, 24, 44, 0.28);
}
body[data-dsh-tianlight][data-ds-dark-theme] {
	--tl-legibility-solid: rgba(14, 22, 36, 0.97);
	--tl-legibility-shadow: 0 1px 2px rgba(0, 0, 0, 0.55);
}
body[data-dsh-tianlight][data-tl-legibility="boost"] [data-tl-wall],
body[data-dsh-tianlight][data-tl-legibility="boost"] [data-tl-font-panel] {
	--tl-panel-fill: var(--tl-legibility-solid) !important;
	background-color: var(--tl-legibility-solid) !important;
	text-shadow: var(--tl-legibility-shadow);
}
`);

		function normalizeLegibilitySettings(raw) {
			const model = { ...LEGIBILITY_DEFAULTS };
			const source = raw !== null && typeof raw === "object" ? raw : {};
			if (typeof source.enabled === "boolean") model.enabled = source.enabled;
			if (Number.isFinite(source.threshold)) {
				model.threshold = Math.round(Math.min(LEGIBILITY_THRESHOLD_MAX, Math.max(LEGIBILITY_THRESHOLD_MIN, source.threshold)) * 10) / 10;
			}
			if (Number.isFinite(source.boost)) model.boost = Math.min(0.4, Math.max(0, source.boost));
			return model;
		}

		function readLegibilitySettings() {
			try {
				const raw = globalThis.localStorage?.getItem(LEGIBILITY_KEY);
				if (raw === undefined || raw === null || raw === "") return { ...LEGIBILITY_DEFAULTS };
				let parsed = null;
				try {
					parsed = JSON.parse(raw);
				} catch {
					parsed = null;
				}
				return normalizeLegibilitySettings(parsed);
			} catch {
				return { ...LEGIBILITY_DEFAULTS };
			}
		}

		const legibilityState = readLegibilitySettings();
		const legibilitySubscribers = new Set();
		/** 最近一次采样的只读结果，供面板显示（不持久化）。 */
		const legibilityStatus = {
			ratio: 0,
			afterRatio: 0,
			boosted: false,
			sampled: false,
			source: "none",
			threshold: legibilityState.threshold,
			enabled: legibilityState.enabled,
		};
		/** installLegibilityGuard 挂上的调度器；设置变化时立即复核。 */
		let legibilityRuntime = null;

		function legibilityNotify() {
			const snapshot = legibilityController.snapshot();
			for (const listener of [...legibilitySubscribers]) {
				try {
					listener(snapshot);
				} catch (error) {
					note("legibility:subscriber", error);
				}
			}
		}

		function requestLegibilityEvaluation(immediate) {
			if (legibilityRuntime === null) return;
			try {
				legibilityRuntime.schedule(immediate === true);
			} catch (error) {
				note("legibility:schedule", error);
			}
		}

		const legibilityController = {
			read: () => ({ ...legibilityState }),
			state: () => ({ ...legibilityState }),
			snapshot: () => ({ ...legibilityState, ...legibilityStatus }),
			subscribe: (listener) => {
				if (typeof listener !== "function") return () => {};
				legibilitySubscribers.add(listener);
				return () => legibilitySubscribers.delete(listener);
			},
			apply: (patch) => {
				const next = normalizeLegibilitySettings({
					...legibilityState,
					...(patch !== null && typeof patch === "object" ? patch : {}),
				});
				Object.assign(legibilityState, next);
				legibilityStatus.enabled = legibilityState.enabled;
				legibilityStatus.threshold = legibilityState.threshold;
				try {
					globalThis.localStorage?.setItem(LEGIBILITY_KEY, JSON.stringify(legibilityState));
				} catch {
					// 持久化失败不影响本次会话
				}
				legibilityNotify();
				requestLegibilityEvaluation(true);
				return { ...legibilityState };
			},
			/** 护栏安装器写回采样结果（只读诊断 + 面板显示），并广播。 */
			report: (status) => {
				if (status === null || typeof status !== "object") return;
				Object.assign(legibilityStatus, status);
				legibilityNotify();
			},
			refresh: () => requestLegibilityEvaluation(true),
		};

		// ---- WCAG 数学（纯函数，便于独立复算） ----
		function srgbToLinear(channel) {
			const value = channel / 255;
			return value <= 0.04045 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
		}
		function relativeLuminance(r, g, b) {
			return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
		}
		function contrastRatio(lumA, lumB) {
			const high = Math.max(lumA, lumB);
			const low = Math.min(lumA, lumB);
			return (high + 0.05) / (low + 0.05);
		}
		/** computed style 的颜色串 → {r,g,b,a}；兼容 rgb()/rgba()/color(srgb)。 */
		function parseCssColor(value) {
			if (typeof value !== "string" || value === "") return null;
			const legacy = value.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)/i);
			if (legacy !== null) {
				const channels = [Number(legacy[1]), Number(legacy[2]), Number(legacy[3])];
				if (!channels.every((channel) => Number.isFinite(channel))) return null;
				const alpha = legacy[4] === undefined ? 1 : Number(legacy[4]);
				return {
					r: Math.min(255, Math.max(0, channels[0])),
					g: Math.min(255, Math.max(0, channels[1])),
					b: Math.min(255, Math.max(0, channels[2])),
					a: Number.isFinite(alpha) ? Math.min(1, Math.max(0, alpha)) : 1,
				};
			}
			const modern = value.match(/color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\s*\)/i);
			if (modern !== null) {
				const alpha = modern[4] === undefined ? 1 : Number(modern[4]);
				return {
					r: Math.min(255, Math.max(0, Number(modern[1]) * 255)),
					g: Math.min(255, Math.max(0, Number(modern[2]) * 255)),
					b: Math.min(255, Math.max(0, Number(modern[3]) * 255)),
					a: Number.isFinite(alpha) ? Math.min(1, Math.max(0, alpha)) : 1,
				};
			}
			return null;
		}

		function installLegibilityGuard() {
			const body = document.body;
			if (body === null) return () => {};
			// apply() 里 await 的宿主设置导入/ schema 迁移可能在工厂求值之后才把
			// 权威值写进 localStorage：安装时重新读一次，多窗口与宿主导入的
			// 阈值/开关立即生效。
			Object.assign(legibilityState, readLegibilitySettings());
			legibilityStatus.enabled = legibilityState.enabled;
			legibilityStatus.threshold = legibilityState.threshold;
			let observer = null;
			let timer = 0;
			let lastRun = 0;
			let boosted = false;
			// 壁纸刚换源时视频还没解出帧：有限次重试（仍受 ≥1.5s 节流约束），
			// 让默认状态下的 diag 也能拿到真实对比度，而不是永远停在 idle。
			let sampleMisses = 0;
			const canvas = document.createElement("canvas");
			canvas.width = 32;
			canvas.height = 18;
			let canvasCtx = null;
			try {
				canvasCtx = canvas.getContext("2d", { willReadFrequently: true });
			} catch {
				canvasCtx = null;
			}

			/** 采样当前壁纸：shader 快照 → 静态图 → 视频帧；拿不到返回 null。 */
			const readWallpaperSample = () => {
				if (canvasCtx === null) return null;
				const controller = wallpaperController;
				const shader = controller === null ? null : controller.shaderSwatch;
				const still = controller === null ? null : controller.image;
				const video = document.querySelector("[data-tl-scene] > video");
				const target =
					shader !== null && shader !== undefined
						? shader
						: still !== null && still !== undefined
							? still
							: video;
				if (target === null || target === undefined) return null;
				if (target === video && video.readyState < 2) return null;
				let data = null;
				try {
					canvasCtx.drawImage(target, 0, 0, canvas.width, canvas.height);
					data = canvasCtx.getImageData(0, 0, canvas.width, canvas.height).data;
				} catch {
					// 跨域污染或解码未完成：这一轮不介入，等下一次观察
					return null;
				}
				let rSum = 0;
				let gSum = 0;
				let bSum = 0;
				let luminanceSum = 0;
				let count = 0;
				for (let i = 0; i + 3 < data.length; i += 4) {
					const red = data[i];
					const green = data[i + 1];
					const blue = data[i + 2];
					rSum += red;
					gSum += green;
					bSum += blue;
					luminanceSum += relativeLuminance(red, green, blue);
					count += 1;
				}
				if (count === 0) return null;
				return {
					r: rSum / count,
					g: gSum / count,
					b: bSum / count,
					luminance: luminanceSum / count,
					source: target === shader ? "shader" : target === still ? "image" : "video",
				};
			};

			/** 面板实际底色/正文色（读 computed style，失败用主题常量）。 */
			const readPanelColors = (sample, dark) => {
				const host = document.querySelector("[data-tl-wall]") ?? document.querySelector("[data-tl-font-panel]");
				const fallbackFill = dark ? { r: 10, g: 18, b: 32, a: 0.96 } : { r: 250, g: 252, b: 255, a: 0.94 };
				const fallbackInk = dark ? { r: 234, g: 243, b: 255, a: 1 } : { r: 15, g: 36, b: 56, a: 1 };
				let fill = fallbackFill;
				let ink = fallbackInk;
				if (host !== null) {
					try {
						const style = globalThis.getComputedStyle(host);
						fill = parseCssColor(style.backgroundColor) ?? fallbackFill;
						ink = parseCssColor(style.color) ?? fallbackInk;
					} catch {
						fill = fallbackFill;
						ink = fallbackInk;
					}
				}
				if (fill.a < 0.05) fill = fallbackFill;
				const composite = {
					r: fill.r * fill.a + sample.r * (1 - fill.a),
					g: fill.g * fill.a + sample.g * (1 - fill.a),
					b: fill.b * fill.a + sample.b * (1 - fill.a),
				};
				return { fill, ink, composite };
			};

			const boostFillFor = (sample, dark) => {
				const target = dark ? 8 : 252;
				const amount = dark ? 0.9 : 0.92;
				return {
					r: Math.round(sample.r + (target - sample.r) * amount),
					g: Math.round(sample.g + (target - sample.g) * amount),
					b: Math.round(sample.b + (target - sample.b) * amount),
					a: LEGIBILITY_FILL_ALPHA,
				};
			};

			const clearBoost = () => {
				boosted = false;
				try {
					body.removeAttribute("data-tl-legibility");
					body.style.removeProperty("--tl-legibility-solid");
					body.style.removeProperty("--tl-legibility-shadow");
				} catch {
					// body 被卸载时忽略
				}
			};

			const applyBoost = (fill, dark) => {
				boosted = true;
				try {
					body.style.setProperty(
						"--tl-legibility-solid",
						"rgba(" + fill.r + ", " + fill.g + ", " + fill.b + ", " + fill.a + ")",
					);
					body.style.setProperty(
						"--tl-legibility-shadow",
						dark ? "0 1px 2px rgba(0, 0, 0, 0.55)" : "0 1px 2px rgba(8, 24, 44, 0.28)",
					);
					body.setAttribute("data-tl-legibility", "boost");
				} catch (error) {
					note("legibility:boost", error);
				}
			};

			const evaluate = () => {
				lastRun = Date.now();
				const settings = legibilityState;
				const dark = body.hasAttribute(DARK_ATTR);
				const sample = readWallpaperSample();
				if (sample === null) {
					if (boosted) clearBoost();
					legibilityController.report({
						ratio: 0,
						afterRatio: 0,
						boosted: false,
						sampled: false,
						source: "none",
						threshold: settings.threshold,
						enabled: settings.enabled,
					});
					tl5Diag("legibility", { ratio: 0, boosted: false, threshold: settings.threshold, sampled: false });
					// 视频/图片还没可读：隔一个节流窗口再试，最多 3 次，避免无帧时刷循环。
					if (sampleMisses < 3 && observer !== null) {
						sampleMisses += 1;
						schedule(false);
					}
					return;
				}
				sampleMisses = 0;
				const colors = readPanelColors(sample, dark);
				const ratio = contrastRatio(
					relativeLuminance(colors.composite.r, colors.composite.g, colors.composite.b),
					relativeLuminance(colors.ink.r, colors.ink.g, colors.ink.b),
				);
				const shouldBoost = settings.enabled === true && ratio < settings.threshold;
				let afterRatio = ratio;
				if (shouldBoost) {
					const solid = boostFillFor(sample, dark);
					afterRatio = contrastRatio(
						relativeLuminance(solid.r, solid.g, solid.b),
						relativeLuminance(colors.ink.r, colors.ink.g, colors.ink.b),
					);
					applyBoost(solid, dark);
				} else if (boosted) {
					clearBoost();
				}
				const rounded = Math.round(ratio * 100) / 100;
				const roundedAfter = Math.round(afterRatio * 100) / 100;
				legibilityController.report({
					ratio: rounded,
					afterRatio: roundedAfter,
					boosted,
					sampled: true,
					source: sample.source,
					threshold: settings.threshold,
					enabled: settings.enabled,
				});
				tl5Diag("legibility", {
					ratio: rounded,
					afterRatio: roundedAfter,
					boosted,
					threshold: settings.threshold,
					source: sample.source,
				});
			};

			/**
			 * 合并同一批 DOM 变更，并把两次评估间隔压到 ≥1.5s：
			 * 面板拖拽、视频换源、主题切换都会连续改属性，逐条评估没有意义。
			 */
			const schedule = (immediate) => {
				if (timer !== 0) return;
				const wait = immediate === true ? 0 : Math.max(250, LEGIBILITY_MIN_INTERVAL - (Date.now() - lastRun));
				timer = window.setTimeout(() => {
					timer = 0;
					try {
						evaluate();
					} catch (error) {
						note("legibility:evaluate", error);
					}
				}, wait);
			};

			try {
				observer = new MutationObserver(() => schedule(false));
				observer.observe(body, {
					attributes: true,
					subtree: true,
					attributeFilter: ["data-tl-open", "data-tl-media", "hidden", "data-ds-dark-theme"],
				});
			} catch (error) {
				observer = null;
				note("legibility:observer", error);
			}
			legibilityRuntime = { schedule };
			schedule(true);

			return () => {
				legibilityRuntime = null;
				if (observer !== null) {
					observer.disconnect();
					observer = null;
				}
				if (timer !== 0) {
					window.clearTimeout(timer);
					timer = 0;
				}
				clearBoost();
				legibilityController.report({
					ratio: 0,
					afterRatio: 0,
					boosted: false,
					sampled: false,
					source: "none",
					threshold: legibilityState.threshold,
					enabled: legibilityState.enabled,
				});
			};
		}

		/** 壁纸面板“可读性”分区（常驻，排版面板关闭时也能改阈值）。 */
		const LegibilityPanelSection = () => {
			const { t } = useTl5I18n();
			const [snapshot, setSnapshot] = React.useState(() => legibilityController.snapshot());
			React.useEffect(() => legibilityController.subscribe(setSnapshot), []);
			const update = (patch) => {
				legibilityController.apply(patch);
				setSnapshot(legibilityController.snapshot());
			};
			const progress = Math.round(
				((snapshot.threshold - LEGIBILITY_THRESHOLD_MIN) / (LEGIBILITY_THRESHOLD_MAX - LEGIBILITY_THRESHOLD_MIN)) * 100,
			);
			const statusText =
				snapshot.sampled !== true
					? t("legibility.statusIdle")
					: snapshot.boosted === true
						? t("legibility.statusBoosted", { ratio: snapshot.ratio, threshold: snapshot.threshold })
						: t("legibility.status", { ratio: snapshot.ratio, threshold: snapshot.threshold });
			return React.createElement(
				"details",
				{ className: "tl-wall-group", open: false, "data-tl-group": "legibility" },
				React.createElement(
					"summary",
					{ className: "tl-wall-group-summary" },
					React.createElement("span", { className: "tl-wall-step" }, "\u25d0"),
					React.createElement("span", { className: "tl-wall-group-title" }, t("legibility.title")),
					React.createElement("span", { className: "tl-wall-summary-value" }, snapshot.threshold + ":1"),
				),
				React.createElement(
					"div",
					{ className: "tl-font-section" },
					React.createElement(
						"div",
						{ className: "tl-font-row" },
						React.createElement("span", { className: "tl-font-label" }, t("legibility.guard")),
						React.createElement(
							"div",
							{ className: "tl-font-options", "data-tl-legibility-toggle": "" },
							React.createElement(
								"button",
								{
									type: "button",
									className: "tl-font-option",
									"data-active": snapshot.enabled === true ? "" : undefined,
									onClick: () => update({ enabled: true }),
								},
								t("common.on"),
							),
							React.createElement(
								"button",
								{
									type: "button",
									className: "tl-font-option",
									"data-active": snapshot.enabled === true ? undefined : "",
									onClick: () => update({ enabled: false }),
								},
								t("common.off"),
							),
						),
					),
					React.createElement(
						"div",
						{ className: "tl-font-row" },
						React.createElement("span", { className: "tl-font-label" }, t("legibility.threshold")),
						React.createElement(
							"div",
							{ className: "tl-font-slider" },
							React.createElement("input", {
								type: "range",
								min: LEGIBILITY_THRESHOLD_MIN,
								max: LEGIBILITY_THRESHOLD_MAX,
								step: 0.5,
								value: snapshot.threshold,
								className: "tl-font-range",
								"data-tl-field": "legibility-threshold",
								"aria-label": t("legibility.threshold"),
								style: {
									background:
										"linear-gradient(90deg, var(--tl-accent) 0%, color-mix(in srgb, var(--tl-accent) 45%, #ffffff) " +
										progress +
										"%, rgba(255, 255, 255, 0.16) " +
										progress +
										"%, rgba(255, 255, 255, 0.16) 100%)",
								},
								onChange: (event) => update({ threshold: Number(event.target.value) }),
							}),
							React.createElement("span", { className: "tl-font-value" }, snapshot.threshold + ":1"),
						),
					),
					React.createElement("p", { className: "tl-wall-hint", "data-tl-legibility-status": "" }, statusText),
					React.createElement("p", { className: "tl-wall-hint" }, t("legibility.hint")),
				),
			);
		};
		registerTl5PanelSection({
			id: "legibility",
			order: 840,
			title: "section.typography",
			Component: LegibilityPanelSection,
		});
		//#endregion
		//#region zone framing
		/**
		 * Per-zone wallpaper framing. Two zones, independent settings:
		 *   main  the picture behind the conversation
		 *   rail  the workspace column, which usually wants a different crop
		 * Each zone picks fit (crop / whole picture / stretch), the focal point that
		 * survives the crop, a dim and a blur. That is the answer to "the video's
		 * aspect ratio does not match the window".
		 */
		const ZONE_KEY = "tianlight.zones";
		const ZONE_MODES = ["cover", "contain", "stretch"];
		/** Ratio presets. `null` follows the window, which is the "avoid imbalance" default. */
		const RATIOS = { auto: null, "16:9": 16 / 9, "16:10": 1.6, "4:3": 4 / 3, "1:1": 1, "21:9": 21 / 9, "9:16": 9 / 16 };
		const ZONE_DEFAULTS = {
			main: { fit: "cover", fx: 38, fy: 50, dim: 0, blur: 0, ratio: "auto", zoom: 100, cx: 50, cy: 50 },
			rail: { fit: "cover", fx: 50, fy: 50, dim: 16, blur: 0, url: "", kind: "video" },
		};
		let zoneController = null;
		/** Playback hook for the rail's own video, owned by installZoneFraming. */
		let railPlayback = null;

		/**
		 * The crop window, in source-normalised coordinates, that yields the chosen
		 * ratio. `w/h = R / frameRatio` keeps the VISIBLE window on ratio even when
		 * the window is not: cover absorbs the remainder, so no distortion appears.
		 */
		function cropWindow(zone) {
			const zoom = Math.min(3, Math.max(0.3, (Number(zone.zoom) || 100) / 100));
			const frameRatio = (globalThis.innerWidth || 16) / (globalThis.innerHeight || 9);
			const preset = RATIOS[zone.ratio] ?? null;
			const w = 1 / zoom;
			const h = 1 / zoom;
			let cropW = w;
			let cropH = h;
			if (preset !== null) {
				// Visible ratio = frameRatio * (cropW / cropH); solving for the preset gives
				// cropH = cropW * frameRatio / preset. When that overflows the source box,
				// BOTH sides shrink by the same factor, so the ratio survives the clamp.
				cropH = (cropW * frameRatio) / preset;
				const scale = Math.min(1, 1 / cropH, 1 / cropW);
				cropW *= scale;
				cropH *= scale;
			}
			return {
				w: cropW.toFixed(4),
				h: cropH.toFixed(4),
				x: ((1 - cropW) * (Math.min(100, Math.max(0, zone.cx ?? 50)) / 100)).toFixed(4),
				y: ((1 - cropH) * (Math.min(100, Math.max(0, zone.cy ?? 50)) / 100)).toFixed(4),
			};
		}

		const pct = (value, fallback, max) => {
			if (!Number.isFinite(value)) return fallback;
			return Math.min(max, Math.max(0, Math.round(value)));
		};

		function normalizeZones(raw) {
			// `separate` is the single user-facing switch; the per-zone numbers keep
			// sensible defaults and exist only so the two framings can differ at all.
			const model = { separate: false, main: { ...ZONE_DEFAULTS.main }, rail: { ...ZONE_DEFAULTS.rail } };
			if (raw === null || typeof raw !== "object") return model;
			if (typeof raw.separate === "boolean") model.separate = raw.separate;
			for (const name of ["main", "rail"]) {
				const saved = raw[name];
				if (saved === null || typeof saved !== "object") continue;
				const zone = model[name];
				if (ZONE_MODES.includes(saved.fit)) zone.fit = saved.fit;
				zone.fx = pct(saved.fx, zone.fx, 100);
				zone.fy = pct(saved.fy, zone.fy, 100);
				zone.dim = pct(saved.dim, zone.dim, 70);
				zone.blur = pct(saved.blur, zone.blur, 12);
				if (name === "main") {
					if (typeof saved.ratio === "string" && Object.prototype.hasOwnProperty.call(RATIOS, saved.ratio)) zone.ratio = saved.ratio;
					zone.zoom = Math.min(300, Math.max(30, pct(saved.zoom, zone.zoom, 300)));
					zone.cx = pct(saved.cx, zone.cx, 100);
					zone.cy = pct(saved.cy, zone.cy, 100);
				}
				if (name === "rail") {
					if (typeof saved.url === "string" && saved.url !== "") zone.url = saved.url;
					if (saved.kind === "image" || saved.kind === "video") zone.kind = saved.kind;
				}
			}
			return model;
		}

		function readZones() {
			try {
				const raw = JSON.parse(globalThis.localStorage.getItem(ZONE_KEY) ?? "null");
				return normalizeZones(raw);
			} catch {
				return normalizeZones(null);
			}
		}

		function saveZones(model) {
			try {
				globalThis.localStorage.setItem(ZONE_KEY, JSON.stringify(model));
			} catch {
				// storage may be blocked; the framing still applies for this session
			}
		}

		function applyZones(model) {
			const scene = document.querySelector("[data-tl-scene]");
			if (scene !== null) {
				const main = model.main;
				// object-fit uses `fill` for stretch; the still layer uses a pair of lengths.
				scene.style.setProperty("--tl-fit", main.fit === "stretch" ? "fill" : main.fit);
				scene.style.setProperty("--tl-fit-size", main.fit === "stretch" ? "100% 100%" : main.fit);
				scene.style.setProperty("--tl-focal-x", main.fx + "%");
				scene.style.setProperty("--tl-focal-y", main.fy + "%");
				scene.style.setProperty("--tl-zone-dim", String(main.dim / 100));
				scene.setAttribute("data-tl-fit", main.fit);
				const crop = cropWindow(main);
				scene.style.setProperty("--crop-w", crop.w);
				scene.style.setProperty("--crop-h", crop.h);
				scene.style.setProperty("--crop-x", crop.x);
				scene.style.setProperty("--crop-y", crop.y);
			}
			const rail = document.querySelector("[data-tl-rail]");
			if (rail !== null) {
				rail.style.setProperty("--tl-rail-blur", model.rail.blur + "px");
				rail.style.setProperty("--tl-rail-dim", String(model.rail.dim / 100));
			}
		}

		/**
		 * The rail mirrors the same media through a canvas instead of opening a second
		 * decoder: one video in memory, two independent framings.
		 */
		function installZoneFraming() {
			const rail = document.createElement("div");
			rail.setAttribute("data-tl-rail", "");
			const canvas = document.createElement("canvas");
			const shade = document.createElement("div");
			shade.setAttribute("data-tl-rail-dim", "");
			rail.append(canvas, shade);
			if (document.body !== null) document.body.appendChild(rail);

			const surface = canvas.getContext("2d");
			let zones = readZones();
			let raf = 0;
			let frame = 0;
			let lastWidth = -1;

			applyZones(zones);
			let separate = zones.separate === true;
			// The rail's own source, used only when the switch is on AND a file is chosen.
			// Empty means "mirror the main wallpaper", which costs no extra decode.
			let railSource = null;
			let railUrl = "";
			const releaseRailSource = () => {
				if (railSource !== null && railSource instanceof HTMLVideoElement) {
					railSource.pause();
					railSource.removeAttribute("src");
					railSource.load();
				}
				railSource = null;
				railUrl = "";
			};
			const useRailSource = (url, kind) => {
				if (url === "" || url === null) {
					releaseRailSource();
					return;
				}
				if (url === railUrl && railSource !== null) return;
				releaseRailSource();
				railUrl = url;
				if (kind === "image") {
					const image = new Image();
					image.src = url;
					railSource = image;
					return;
				}
				const video = document.createElement("video");
				video.muted = true;
				video.loop = true;
				video.playsInline = true;
				video.preload = "auto";
				video.setAttribute("muted", "");
				video.src = url;
				// Low power keeps the rail video parked; the supervisor resumes it when
				// the mode turns off.
				if (document.body === null || document.body.hasAttribute("data-tl-lowpower") === false) {
					void video.play().catch(() => {});
				}
				railSource = video;
			};
			railPlayback = {
				pause: () => {
					stopRailLoop();
					if (railSource instanceof HTMLVideoElement) railSource.pause();
				},
				resume: () => {
					if (separate) ensureRailLoop();
					if (railSource instanceof HTMLVideoElement && railSource.paused) {
						void railSource.play().catch(() => {});
					}
				},
			};
			zoneController = {
				read: () => ({ ...zones, separate }),
				apply: (model) => {
					zones = model;
					separate = model.separate === true;
					saveZones(model);
					applyZones(model);
					useRailSource(separate ? (model.rail.url ?? "") : "", model.rail.kind);
					// Turning the switch off must take the mirror down immediately rather
					// than waiting for the next bounds sample.
					if (separate) ensureRailLoop();
					else {
						stopRailLoop();
						rail.removeAttribute("data-tl-on");
					}
				},
			};
			useRailSource(separate ? (zones.rail.url ?? "") : "", zones.rail.kind);

			const tick = () => {
				raf = 0;
				frame += 1;
				// No rail, no loop: with "same as main wallpaper" the mirror used to run a
				// full rAF loop at 60Hz just to skip every draw. The main video keeps the
				// whole frame budget now.
				if (separate === false) {
					rail.removeAttribute("data-tl-on");
					return;
				}
				if (document.body !== null && document.body.hasAttribute("data-tl-lowpower")) return;
				// Bound the sidebar every 30 frames: it is stamped later than boot and its
				// width animates when the user collapses the rail.
				if (frame % 30 === 0) {
					const sidebar = document.querySelector("[data-tl-sidebar]");
					const width = sidebar instanceof HTMLElement ? Math.round(sidebar.getBoundingClientRect().width) : 0;
					const on = separate && width > 40;
					if (on !== (rail.getAttribute("data-tl-on") !== null)) {
						rail.toggleAttribute("data-tl-on", on);
					}
					if (on && width !== lastWidth) {
						lastWidth = width;
						rail.style.width = width + "px";
						const dpr = Math.min(2, globalThis.devicePixelRatio || 1);
						canvas.width = Math.max(1, Math.round(width * dpr));
						canvas.height = Math.max(1, Math.round(window.innerHeight * dpr));
						canvas.style.height = window.innerHeight + "px";
					}
				}
				// ~12 fps is plenty for a background panel and keeps the main video smooth.
				if (
					frame % railFrameStep() === 0 &&
					rail.getAttribute("data-tl-on") !== null &&
					surface !== null &&
					document.body !== null &&
					!document.body.hasAttribute("data-tl-lowpower")
				) {
					const shaderOn = document.querySelector("[data-tl-scene][data-tl-shader-on]") !== null;
					const still = wallpaperController === null ? null : wallpaperController.image;
					const video = document.querySelector("[data-tl-scene] > video");
					// A rail-specific file wins; otherwise the rail mirrors the main media. A
					// WebGL canvas cannot be read reliably from another task (the drawing buffer
					// is cleared after compositing), so an independent shader lets the main
					// scene show through and the stale mirror frame is cleared below.
					const source =
						shaderOn && railSource === null
							? null
							: railSource !== null
								? railSource
								: still !== null && still !== undefined
									? still
									: video;
					// Every branch must be handled by TYPE: a rail video has no `.complete`,
					// and an Image has no `readyState`.
					const isVideo = source instanceof HTMLVideoElement;
					const ready = isVideo ? source.readyState >= 2 : source !== null && source !== undefined && source.complete === true;
					if (ready) {
						const sw = isVideo ? source.videoWidth : source.naturalWidth;
						const sh = isVideo ? source.videoHeight : source.naturalHeight;
						if (sw > 0 && sh > 0) {
							const cw = canvas.width;
							const ch = canvas.height;
							const zone = zones.rail;
							surface.clearRect(0, 0, cw, ch);
							if (zone.fit === "stretch") {
								surface.drawImage(source, 0, 0, sw, sh, 0, 0, cw, ch);
							} else {
								const scale = zone.fit === "contain" ? Math.min(cw / sw, ch / sh) : Math.max(cw / sw, ch / sh);
								const dw = sw * scale;
								const dh = sh * scale;
								const dx = (cw - dw) * (zone.fx / 100);
								const dy = (ch - dh) * (zone.fy / 100);
								if (zone.fit === "contain") {
									surface.fillStyle = "#0a1420";
									surface.fillRect(0, 0, cw, ch);
								}
								surface.drawImage(source, dx, dy, dw, dh);
							}
						}
					} else if (shaderOn && railSource === null) {
						surface.clearRect(0, 0, canvas.width, canvas.height);
					}
				}
				raf = globalThis.requestAnimationFrame(tick);
			};
			const ensureRailLoop = () => {
				if (raf !== 0) return;
				raf = globalThis.requestAnimationFrame(tick);
			};
			const stopRailLoop = () => {
				if (raf !== 0) globalThis.cancelAnimationFrame(raf);
				raf = 0;
			};
			if (separate) ensureRailLoop();

			return () => {
				zoneController = null;
				railPlayback = null;
				stopRailLoop();
				releaseRailSource();
				rail.remove();
			};
		}
		//#endregion

		//#region selector bridge
		/**
		 * Upgrade-proof selector bridge.
		 *
		 * The stylesheet never names a DSH build hash. This bridge finds the host
		 * surfaces through STABLE hooks instead:
		 *   - the DSH Slot contract (`data-slot="sidebar"` / `data-slot="conversation.input.model"`)
		 *     for the column and the model picker;
		 *   - `data-*` attributes the product ships for its own layout
		 *     (`data-composer-card`, `data-sidebar-collapsed`, `data-message-bubble`,
		 *     `data-trigger-menu`), which do not change between builds; and
		 *   - CSS-module class-name SEGMENTS (`bubble`, `menu`, `panel`, `trigger`,
		 *     `triggerLabel`, `triggerEffort`). A module class is either `hash_name`
		 *     (legacy) or `_name_hash_line` (0.2.1+), so a segment is matched exactly
		 *     inside an underscore-separated token: `_bubble_ab_1` matches bubble,
		 *     `_bubbleItem_ab_1` and `_menuAnchor_ab_1` do not.
		 *
		 * Two rules keep the stamped set small and cheap:
		 *   1. Only the OUTERMOST node of a nested surface is stamped. Stamping every
		 *      `_bubble` wrapper painted N translucent layers where the product has
		 *      one bubble, which is the "duplicate stacked UI" defect.
		 *   2. A node that is not a real surface is never stamped (menu anchors, icon
		 *      spans and label spans are excluded by the segment rule above).
		 *
		 * Upgrade contract: `tools/hook-scan.mjs` reports a missing hook BEFORE a DSH
		 * upgrade ships; extend this bridge there instead of hardcoding a new hash.
		 */
		function installSelectorBridge() {
			const STAMPED_ATTRS = [
				"data-tl-sidebar",
				"data-tl-sidebar-col",
				"data-tl-settings",
				"data-tl-composer",
				"data-tl-model",
				"data-tl-model-label",
				"data-tl-model-effort",
				"data-tl-bubble",
				"data-tl-menu",
			];
			const stamped = new Set();

			/** Attribute value (`class` works for SVG too), split into class tokens. */
			const classTokens = (node) => {
				const raw = typeof node.getAttribute === "function" ? node.getAttribute("class") : null;
				return typeof raw === "string" && raw !== "" ? raw.split(/\s+/) : [];
			};
			/**
			 * True when one class token contains `name` as a whole underscore segment.
			 * Legacy `hash_name`, current `_name_hash_line` and plain `name` all match;
			 * `nameExtra` / `otherName` do not.
			 */
			const hasSegment = (node, name) =>
				classTokens(node).some((token) => token.split("_").includes(name));

			const mark = (node, attr) => {
				if (node === null || node === undefined) return;
				// Always own the node in the cleanup set: a node that already carries the
				// attribute (stamped by a previous instance) must still be cleared when
				// this instance is disposed, or the attribute leaks forever.
				stamped.add(node);
				if (node.getAttribute(attr) !== "") node.setAttribute(attr, "");
			};

			/** Drop every node that has a candidate ancestor — keep only the outermost. */
			const outermost = (nodes) => {
				const set = new Set(nodes);
				return nodes.filter((node) => {
					for (let parent = node.parentElement; parent !== null; parent = parent.parentElement) {
						if (set.has(parent)) return false;
					}
					return true;
				});
			};

			// Defense in depth: a themed surface must never be a huge layout container.
			// 2026-10-30 regression: an over-broad selector stamped the whole right-side
			// panel body and painted it with the opaque panel fill (giant dark block).
			const isOversized = (node) => {
				const rect = node.getBoundingClientRect();
				return rect.width * rect.height > globalThis.innerWidth * globalThis.innerHeight * 0.5;
			};

			const stampAll = () => {
				// ---- left column + sidebar shell ----
				// The slot marker is the public layout contract; the product data attribute
				// is the shell root that paints the sidebar background.
				const sidebarSlot = document.querySelector('[data-slot="sidebar"]');
				if (sidebarSlot !== null) mark(sidebarSlot, "data-tl-sidebar-col");
				for (const node of document.querySelectorAll("[data-sidebar-collapsed]")) {
					mark(node, "data-tl-sidebar");
				}
				// Fallback for a build that renames the column class but keeps the suffix.
				for (const node of document.querySelectorAll("[class*='_sidebarCol']")) {
					mark(node, "data-tl-sidebar-col");
				}

				// ---- composer card ----
				// Stable product data attribute first; the suffix fallback only runs when it
				// is absent, and only stamps the outermost card that actually owns an editor.
				const composerCards = [...document.querySelectorAll("[data-composer-card]")];
				for (const node of composerCards) mark(node, "data-tl-composer");
				if (composerCards.length === 0) {
					const candidates = [...document.querySelectorAll("[class*='_card']")].filter(
						(node) =>
							hasSegment(node, "card") &&
							node.querySelector("[contenteditable='true'], textarea") !== null &&
							isOversized(node) === false,
					);
					for (const node of outermost(candidates)) mark(node, "data-tl-composer");
				}

				// ---- model picker inside the composer's model slot ----
				// Scoping by the slot keeps the permission selector and the mic button out of
				// the pill treatment; the segment rule keeps icon/label spans untouched.
				const modelScope =
					document.querySelector('[data-slot="conversation.input.model"]') ??
					document.querySelector("[data-tl-composer]");
				if (modelScope !== null) {
					for (const node of modelScope.querySelectorAll("[class*='_trigger']")) {
						if (hasSegment(node, "trigger")) mark(node, "data-tl-model");
						else if (hasSegment(node, "triggerLabel")) mark(node, "data-tl-model-label");
						else if (hasSegment(node, "triggerEffort")) mark(node, "data-tl-model-effort");
					}
				}

				// ---- settings page surfaces ----
				// Only the LEGACY `_panel`-inside-`_mask` shape is stamped.
				// 2026-10-30 regression: on newer DSH the settings UI renders inside the
				// right-side panel shell, so stamping `[data-sidebar-right-panel]`
				// surface/pane children (and `[data-dockkit-pane]`) painted the whole
				// 1281x1656 panel body with the opaque panel fill — a giant dark block
				// covering half the window. The product's own styling is correct there,
				// so those selectors are deliberately gone.
				for (const node of document.querySelectorAll("[class*='_panel']")) {
					if (hasSegment(node, "panel") === false) continue;
					const parent = node.parentElement;
					if (
						parent !== null &&
						hasSegment(parent, "mask") &&
						isOversized(node) === false
					) {
						mark(node, "data-tl-settings");
					}
				}

				// ---- conversation bubbles and floating menus ----
				// `data-message-bubble` is the 0.2.2-alpha primitives hook; the `bubble`
				// segment keeps 0.2.1.x working. Only the outermost bubble is stained:
				// a transcript bubble nests a wrapper, a content box and sometimes an
				// avatar row, and each extra layer re-painted the same glass.
				const bubbleCandidates = [...document.querySelectorAll("[class*='_bubble'], [data-message-bubble]")].filter(
					(node) => node.hasAttribute("data-message-bubble") || hasSegment(node, "bubble"),
				);
				for (const node of outermost(bubbleCandidates)) mark(node, "data-tl-bubble");

				// Same for popovers: the menu anchor root and every menu row also carry a
				// `_menu*` class, but only the floating surface earns the glass panel.
				const menuCandidates = [...document.querySelectorAll("[class*='_menu'], [data-trigger-menu]")].filter(
					(node) => node.hasAttribute("data-trigger-menu") || hasSegment(node, "menu"),
				);
				for (const node of outermost(menuCandidates)) mark(node, "data-tl-menu");
			};

			// Debounced to one pass per frame: the app mutates constantly.
			let queued = 0;
			const schedule = () => {
				if (queued !== 0) return;
				queued = globalThis.requestAnimationFrame(() => {
					queued = 0;
					try {
						stampAll();
					} catch {
						// a DOM shape the bridge does not recognise must never break the page
					}
				});
			};

			stampAll();
			const observer = new MutationObserver(schedule);
			observer.observe(document.body, { childList: true, subtree: true });

			return () => {
				observer.disconnect();
				if (queued !== 0) globalThis.cancelAnimationFrame(queued);
				for (const node of stamped) {
					for (const attr of STAMPED_ATTRS) node.removeAttribute(attr);
				}
				stamped.clear();
			};
		}

		/**
		 * Feature-detect which stable hooks THIS running DSH build actually renders.
		 *
		 * The bridge is layered (slot markers → product `data-*` → class-name segments),
		 * and each DSH line 0.2.0 / 0.2.1 / 0.2.2 prefers a different layer: 0.2.0 and
		 * 0.2.2 web DOM have `data-slot` + product data attributes but no
		 * `data-sidebar-collapsed`; 0.2.1 has the collapsed marker. The result is exposed
		 * for support (`__dshTianlightInstance.features`) so a "skin looks unstyled on my
		 * build" report can be answered from the console in one line, and so the
		 * multi-version verification lab can assert the expected layer per runtime.
		 */
		function detectDshFeatures() {
			const has = (selector) => document.querySelector(selector) !== null;
			// Class naming: legacy `hash_name` vs 0.2.1+ `_name_hash_line`. A sample node
			// that carries a known suffix is enough; the CSS never depends on this value.
			const sample = document.querySelector("[class*='_card'], [class*='_bubble'], [class*='_panel']");
			const classSample = sample === null ? "" : String(sample.getAttribute("class") ?? "");
			const naming =
				/(?:^|\s)_[A-Za-z0-9]+_[A-Za-z0-9]+_\d+/.test(classSample)
					? "name_hash_line"
					: /(?:^|\s)[A-Za-z0-9-]+_[a-z][A-Za-z0-9]*/.test(classSample)
						? "hash_name"
						: "unknown";
			return {
				slotMarkers: has("[data-slot]"),
				modelSlot: has('[data-slot="conversation.input.model"]'),
				composerCard: has("[data-composer-card]"),
				sidebarCollapsed: has("[data-sidebar-collapsed]"),
				triggerMenu: has("[data-trigger-menu]"),
				messageBubble: has("[data-message-bubble]"),
				classNaming: naming,
				desktopChrome: document.documentElement.hasAttribute("data-windows-titlebar"),
			};
		}
		//#endregion
		//#region wallpaper sidebar
		/**
		 * A dedicated left-edge sidebar for the wallpaper, kept apart from the
		 * typography card on purpose: one is a full-height browsing surface with
		 * thumbnails, the other a small draggable settings card. Sharing one host made
		 * both feel cramped and put unrelated controls in the same panel.
		 */
		/**
		 * v0.5.0 面板新增文案（工作流 panel-library 自有前缀 `lib.`）。
		 * v0.4.0 的既有中文标签保持原样：skinlab 运行时矩阵按这些字符串断言
		 * （"壁纸" / "N 张" / "全部 3" / "WE 目录" / "查看全部壁纸"），
		 * 翻译它们会把布局验证变成语言相关，所以只给新增控件走 TL_T。
		 */
		registerTl5Strings({
			zh: {
				"lib.sort": "排序",
				"lib.sortName": "名称",
				"lib.sortKind": "类型",
				"lib.sortRecent": "最近使用",
				"lib.sortFavorites": "收藏优先",
				"lib.favorites": "收藏",
				"lib.hidden": "显示隐藏",
				"lib.hiddenOn": "隐藏中",
				"lib.filterClear": "清除筛选",
				"lib.filterEmpty": "没有匹配的壁纸：换关键词，或清空收藏/标签筛选",
				"lib.searchPlaceholder": "搜索名称、标签或类型",
				"lib.searchAria": "搜索壁纸",
				"lib.shareTitle": "分享链接",
				"lib.shareCopy": "复制分享链接",
				"lib.shareCopied": "已复制分享链接（只含配置，不含壁纸文件）",
				"lib.shareFailed": "复制失败，请手动选择下面的链接复制",
				"lib.shareHint": "分享链接包含当前壁纸、取景、外观、播放、轮播、特效、情境与排版；只有对方点「应用」才会写入设置。",
				"lib.shareDetected": "检测到共享配方（{n} 项）",
				"lib.shareApply": "应用",
				"lib.shareIgnore": "忽略",
				"lib.shareApplied": "共享配方已应用",
				"lib.shareIgnored": "已忽略共享配方（设置未改动）",
				"lib.shareInvalid": "分享链接无效，已忽略（未修改任何设置）",
				"lib.shareManual": "或手动复制这段链接：",
				"lib.shareLinkAria": "共享配方链接",
				"lib.shareLong": "链接较长（含着色器源码），部分聊天工具可能截断。",
				"lib.shareBuildFail": "生成分享链接失败：{reason}",
				"lib.bundleTitle": "导入 / 导出包",
				"lib.bundleHint": "包内含设置、配方与上传的壁纸；导出由宿主直接流式打包，不经过浏览器内存。",
				"lib.bundleExport": "导出包",
				"lib.bundleExportBusy": "准备下载…",
				"lib.bundleExportStarted": "已开始下载。若浏览器提示 404，说明宿主半还是旧版本，重启 DSH 后重试。",
				"lib.bundleExportFail": "导出失败：{reason}",
				"lib.bundleImport": "导入包",
				"lib.bundleImporting": "导入中…",
				"lib.bundleImportDone": "导入完成：新增 {imported} 个，跳过 {skipped} 个",
				"lib.bundleImportSettings": "设置已写入宿主，刷新页面后统一生效",
				"lib.bundleImportFail": "导入失败：{reason}",
				"lib.bundleImportSize": "包超过 {mb}MB 上限，请分开导入",
				"lib.bundleImportType": "只支持 .tgz / .tar.gz 包",
				"lib.bundleNoHost": "当前宿主没有提供打包接口：重启 DSH Desktop 后可用。",
				"lib.bundleProgress": "上传 {pct}%",
				"lib.recipeHint": "配方 v2 含壁纸、取景、外观、播放、轮播、特效、情境、可读性与排版（含着色器源码与参数）。",
				"lib.recipeExported": "已生成配方（v2），复制这段分享给别人",
				"lib.recipeBadText": "导入失败：不是有效的配方文本",
				"lib.recipeBadValue": "导入失败：不是有效的配方",
				"lib.exportRecipe": "导出配方",
				"lib.importRecipe": "导入配方",
				"lib.resetWallpaper": "恢复壁纸默认",
				"lib.recipePlaceholder": "{ format: \"tianlight-recipe\", version: 2 }",
				"lib.we.readFailed": "无法读取目录列表（宿主接口需重启 DSH 后才存在）",
				"lib.we.saving": "保存中…",
				"lib.we.savedPrefix": "已保存 ",
				"lib.we.savedDirs": " 个目录",
				"lib.punct.openParen": "（",
				"lib.we.savedSkipped": " 条无效/相对路径已忽略，需填绝对路径）",
				"lib.we.saveFailed": "保存失败：宿主接口需重启 DSH 后才存在",
				"lib.ctrl.off": "关闭",
				"lib.slot.imageUnset": "图片（未选）",
				"lib.kind.image": "图片",
				"lib.slot.preset": "预设",
				"lib.url.empty": "先粘贴一个图片或视频直链",
				"lib.url.scheme": "地址要以 http:// 或 https:// 开头",
				"lib.url.httpsBlocked": "当前页面是 HTTPS，浏览器会拦截 http 资源；请换用 https 地址",
				"lib.url.checking": "正在检查地址…",
				"lib.url.notMedia": "这不是可直接加载的图片/视频直链；请确认地址以 .jpg/.png/.mp4/.webm 等结尾，或手动选「图片 / 视频」。",
				"lib.url.applied": "已应用：",
				"lib.kind.video": "视频",
				"lib.url.remoteHost": "远程地址",
				"lib.shader.compileFailed": "编译失败：",
				"lib.shader.applied": "已应用着色器",
				"lib.shader.reset": "已恢复默认，点「应用着色器」生效",
				"lib.audio.stopped": "已停止音频",
				"lib.audio.requesting": "正在请求麦克风…",
				"lib.audio.failed": "无法启用麦克风",
				"lib.shader.audioPreset": "已切到「音频极光」，点「应用着色器」生效",
				"lib.frame.sampling": "正在从视频取帧…",
				"lib.frame.pickHint": "点一帧设为静态壁纸（切走壁纸后需重新取帧）",
				"lib.frame.pinned": "已设为静态帧 ",
				"lib.frame.resumed": "已恢复动态播放",
				"lib.upload.hostStale": "宿主半还是旧版本（页面已更新、进程未重启）：重启一次 DSH Desktop 后再上传；点「重新检测」可复查。",
				"lib.upload.notWritable": "上传目录不可写：检查 skin-tianlight/assets/ 的写权限",
				"lib.upload.tooBigPrefix": "超过 ",
				"lib.upload.tooBigSuffix": "MB 上限；4K 长片请先压缩，或设置 TIANLIGHT_UPLOAD_MAX",
				"lib.upload.types": "只支持 mp4/webm/mov/m4v/png/jpg/webp/avif/gif/svg",
				"lib.upload.busy": "上传中…",
				"lib.upload.done": "已上传：",
				"lib.upload.failed": "上传失败：",
				"lib.current.auto": "自动（按素材优先级）",
				"lib.current.scenePrefix": "场景 · ",
				"lib.current.customShader": "自定义代码",
				"lib.current.unnamed": "未命名",
				"lib.current.videoStill": "视频静态帧",
				"lib.quality.loadFailed": "壁纸加载失败：请换一个文件，或检查编码/地址；皮肤会自动退回可播画面",
				"lib.quality.scene": "画质：WebWallGL 实时场景",
				"lib.quality.measured": " · 实测 ",
				"lib.quality.engineNotReady": " · 引擎未就绪",
				"lib.quality.shader": "画质：程序化着色器，不受源分辨率影响",
				"lib.quality.source": "画质：源 ",
				"lib.quality.crop": " · 当前裁切约 ",
				"lib.quality.upscaled": " · 会放大，可能发糊",
				"lib.quality.native": " · 不需放大",
				"lib.quality.low": "（偏低）",
				"lib.quality.eightK": " · 8K 源可能被浏览器降采样",
				"lib.quality.duration": " · 时长 ",
				"lib.power.reducedMotion": "系统开启了「减少动态效果」",
				"lib.power.saveData": "浏览器开启了流量节省",
				"lib.power.battery": "电量偏低且未充电",
				"lib.power.manual": "手动开启省电",
				"lib.status.lowPower": "省电暂停",
				"lib.status.still": "静态帧",
				"lib.status.blocked": "自动播放被拦截",
				"lib.status.stalled": "画面卡住",
				"lib.status.failed": "加载失败",
				"lib.status.image": "图片壁纸",
				"lib.status.loading": "加载中",
				"lib.status.scene": "场景运行中",
				"lib.status.shader": "着色器运行中",
				"lib.status.playing": "动态播放中",
				"lib.status.idle": "未选择壁纸",
				"lib.status.paused": "已暂停",
				"lib.status.ready": "已就绪",
				"lib.hint.lowPowerPauseOpen": "省电自动暂停（",
				"lib.power.mode": "省电模式",
				"lib.hint.lowPowerPauseClose": "）；点按钮会关闭省电并恢复播放。",
				"lib.hint.still": "当前固定在静态帧，刷新后仍保持；点「回到动态」恢复播放。",
				"lib.hint.blocked": "浏览器拦下了自动播放。点「播放动态」一次即可；之后回到页面会自动继续。",
				"lib.hint.stalled": "已请求播放但没有新画面。点「重试」重新加载当前壁纸。",
				"lib.hint.decodeFailedOpen": "解码或播放失败（",
				"lib.common.unknownReason": "未知原因",
				"lib.hint.decodeFailedClose": "）；皮肤会自动退回可播画面。",
				"lib.hint.idle": "还没有选择壁纸；从下面「来源」开始挑一张。",
				"lib.hint.buffering": "正在加载/解码，画面出现后会自动开始播放。",
				"lib.hint.scene": "WebWallGL 正在渲染 WE 场景；加载失败会自动退回视频/图片。",
				"lib.hint.shader": "程序化着色器按当前渲染档位运行。",
				"lib.hint.videoPlaying": "视频正在播放；切换页面会暂停、回来继续。",
				"lib.hint.paused": "已暂停在当前帧；点「继续播放」恢复。",
				"lib.hint.ready": "画面已就绪。",
				"lib.action.lowPowerPlay": "关闭省电并播放",
				"lib.action.backToMotion": "回到动态",
				"lib.action.play": "播放动态",
				"lib.action.retry": "重试",
				"lib.action.pause": "暂停",
				"lib.action.resume": "继续播放",
				"lib.quality.jitter": " · 帧间隔抖动 ",
				"lib.quality.high": "（偏高）",
				"lib.listHint.url": "把完整媒体直链粘到下面；不是网页地址。网络直链只播放，不下载进壁纸库。",
				"lib.listHint.shader": "先选预设或贴 GLSL，调好参数，再点「应用着色器」。",
				"lib.listHint.weOpen": "Wallpaper Engine：",
				"lib.unit.items": " 张",
				"lib.listHint.weSceneOpen": "（场景 ",
				"lib.punct.closeParen": "）",
				"lib.listHint.weClose": "；目录在清单顶部「配置目录」里改，场景失败会自动降级。",
				"lib.listHint.local": "本地与上传：",
				"lib.listHint.localSuffix": " 张。点缩略图直接应用；4K/8K 也可直接点。",
				"lib.listHint.all": "全部壁纸：",
				"lib.listHint.allMiddle": " 张（本地 ",
				"lib.listHint.allSuffix": "）。点缩略图直接应用；上方可筛选，或从「网址 / WE 目录 / GLSL」导入。",
				"lib.list.loading": "加载中…",
				"lib.list.failed": "读取失败",
				"lib.list.loadingHint": "正在读取壁纸清单…",
				"lib.list.errNetwork": "无法读取壁纸清单：宿主接口不可用或网络错误",
				"lib.list.errHostStale": "无法读取壁纸清单：宿主半还是旧版本，重启 DSH Desktop 后重试",
				"lib.pick.more": "更多设置",
				"lib.pick.back": "返回快捷选择",
				"lib.pick.applied": "已切换：{name}",
				"lib.pick.failed": "切换失败：{reason}",
				"lib.pick.noScene": "壁纸场景未启用：请先在高级中开启壁纸模块",
				"lib.card.inUse": "使用中",
				"lib.source.url": "URL 地址",
				"lib.source.local": "本地/上传",
				"lib.source.all": "全部",
				"lib.source.engine": "壁纸引擎",
				"lib.we.detected": "Wallpaper Engine：已检测到 {n} 张（Steam 工坊 {steam} / 我的项目 {project}）",
				"lib.we.openLibrary": "打开壁纸库",
				"lib.we.openRequested": "已请求打开壁纸库",
				"lib.we.openFallback": "已请求打开壁纸库；若没有打开，请到 设置 → 壁纸",
				"lib.we.manual": "高级（手动路径）",
				"lib.we.manualHint": "仅用于自动检测不到的旧版目录；一般不需要设置。",
				"lib.we.autoDesc": "自动检测本机壁纸库（无需配置路径）",
				"lib.we.staticHint": "静态高清",
				"lib.we.staticHintTitle": "场景以静态高清图应用；动态缓存可在设置页选择「生成动态」",
				"lib.listHint.engine": "壁纸引擎：{n} 张（自动检测，点卡片直接应用；场景为静态高清）",
				"lib.listValue.pasteUrl": "粘贴地址",
				"lib.ctrl.auto": "自动",
				"lib.appearance.glassPrefix": "玻璃 ",
				"lib.perf.powerAuto": "省电自动",
				"lib.perf.powerOn": "省电开",
				"lib.perf.powerOff": "省电关",
				"lib.perf.rotationOn": " · 轮播开",
				"lib.panel.title": "壁纸",
				"lib.view.pick": "选壁纸",
				"lib.view.advanced": "高级",
				"lib.panel.close": "关闭壁纸侧栏",
				"lib.current.prefix": "当前壁纸：",
				"lib.source.localShort": "本地",
				"lib.label.playing": "播放中",
				"lib.label.unlock": "待恢复",
				"lib.label.play": "播放",
				"lib.group.sources": "来源（目录/代码）",
				"lib.punct.colon": "：",
				"lib.group.list": "壁纸清单",
				"lib.we.hint": "把 Wallpaper Engine 的 projects 目录粘在这里，每行一个；只读，不修改原文件。",
				"lib.we.placeholder": "每行一个绝对路径，例如 …/steamapps/workshop/content/431960/<项目ID>",
				"lib.we.save": "保存目录",
				"lib.upload.title": "上传后自动出现在本地清单；不会覆盖同名文件",
				"lib.upload.button": "上传壁纸",
				"lib.upload.hostStaleShort": "宿主半待重启 DSH",
				"lib.upload.limitSuffix": "MB · 图片/视频",
				"lib.upload.redetecting": "正在重新检测宿主路由…",
				"lib.upload.redetect": "重新检测",
				"lib.hiddenHint": "隐藏只改变列表，不删除源文件",
				"lib.tag.prefix": "标签：",
				"lib.tag.remove": "移除这个标签",
				"lib.tag.placeholder": "输入标签后回车，例如 夜景",
				"lib.common.done": "完成",
				"lib.card.autoTitle": "自动选择",
				"lib.card.autoNote": "按素材优先级",
				"lib.card.scene": "场景 · WebWallGL",
				"lib.card.unhide": "恢复显示",
				"lib.card.hide": "隐藏",
				"lib.card.unhideTitle": "恢复显示（不删除文件）",
				"lib.card.hideTitle": "隐藏（不删除文件，也不打断当前播放）",
				"lib.card.unhideShort": "显",
				"lib.card.hideShort": "隐",
				"lib.card.unfavorite": "取消收藏",
				"lib.card.favorite": "收藏",
				"lib.card.editTags": "编辑标签",
				"lib.empty.we": "这个来源下没有可读的视频/场景：旧版目录可在高级 ① 的「高级（手动路径）」里检查；自动检测的条目在「壁纸引擎」来源里。",
				"lib.empty.all": "还没有壁纸：点下方「上传壁纸」，或用上方「网址导入 / WE 目录 / GLSL」。",
				"lib.empty.local": "本地还没有壁纸：把图片/视频放进 skin-tianlight/assets/，刷新页面即可；也可以直接点「上传壁纸」。",
				"lib.empty.engine": "壁纸引擎没有可显示的壁纸：请在 设置 → 壁纸 里查看自动检测状态。",
				"lib.empty.showAll": "查看全部壁纸",
				"lib.url.hint": "只支持「能直接打开的媒体直链」：图片或视频地址，不是网页地址。网络直链直接播放，不下载到本机；要进壁纸库请用上传。",
				"lib.field.type": "类型",
				"lib.url.pasted": "已从剪贴板粘贴，点「应用地址」或按回车",
				"lib.url.clipboardEmpty": "剪贴板是空的；请手动 Ctrl+V",
				"lib.url.clipboardDenied": "浏览器拒绝读取剪贴板；请手动 Ctrl+V",
				"lib.url.paste": "粘贴",
				"lib.url.placeholder": "粘贴完整直链，例如 https://…/wallpaper.mp4",
				"lib.url.checkingShort": "检查中…",
				"lib.url.apply": "应用地址",
				"lib.url.autoHint": "自动会先按扩展名判断，无扩展名时实际探测图片/视频；不确定就保持自动。",
				"lib.shader.intro": "ShaderToy 风格：不需要网站账号，也不抓取 shadertoy.com。① 选预设或贴 GLSL → ② 调速度/强度/色相 → ③ 点「应用着色器」。",
				"lib.shader.uniforms": "可用 uniform：iTime / iResolution / iMouse / u_speed / u_intensity / u_hue / u_audio。",
				"lib.audio.hint": "音频响应：把麦克风实时电平送给 u_audio；只分析，不录音、不上传。",
				"lib.audio.requestingShort": "请求中…",
				"lib.audio.stop": "停止音频",
				"lib.audio.start": "启用麦克风",
				"lib.audio.usePreset": "用「音频极光」",
				"lib.audio.active": "音频响应中；关闭面板/省电/页面隐藏会自动停止。",
				"lib.audio.idle": "未启用。先应用 ShaderToy 壁纸，再启用。",
				"lib.shader.sourceAria": "着色器源码",
				"lib.shader.speed": "速度 ",
				"lib.shader.intensity": "强度 ",
				"lib.shader.hue": "色相 ",
				"lib.shader.apply": "应用着色器",
				"lib.shader.resetButton": "恢复默认",
				"lib.group.framing": "画面",
				"lib.framing.followWindow": "跟随窗口",
				"lib.framing.zoom": "缩放 ",
				"lib.framing.cx": "取景横向 ",
				"lib.framing.notCropped": "% · 当前画面未裁切",
				"lib.framing.cy": "取景纵向 ",
				"lib.framing.window": "窗口 ",
				"lib.framing.cropFollows": " · 裁切跟随窗口",
				"lib.framing.cropIs": " · 裁切 ",
				"lib.framing.hint": "取景滑杆只在画面被裁切时可用：提高缩放，或换一个与窗口不同的比例。",
				"lib.frame.needExplicit": "静态帧：先显式选择一个视频壁纸（自动选择不支持取帧）",
				"lib.frame.videoOnly": "静态帧：只有视频壁纸支持取帧",
				"lib.frame.hint": "静态帧：从当前视频取 6 帧，点一帧固定为静态壁纸",
				"lib.frame.busy": "取帧中…",
				"lib.frame.generate": "生成帧预览",
				"lib.frame.currentPrefix": "当前：静态帧 ",
				"lib.frame.currentSuffix": "s（「回到动态」恢复播放）",
				"lib.frame.set": "设为静态帧 ",
				"lib.playback.hint": "播放控制：倍速/翻转只影响视频；60fps 源仍按源帧率，倍速会按比例改变实际帧率。",
				"lib.playback.speed": "倍速",
				"lib.playback.pause": "暂停动态",
				"lib.playback.flip": "水平翻转",
				"lib.playback.filter": "画面滤镜",
				"lib.ctrl.on": "已开启",
				"lib.ctrl.offByDefault": "默认关闭",
				"lib.playback.filterOnHint": "滤镜会多一层全屏合成；4K/60fps 下若掉帧，先关掉它。",
				"lib.playback.filterOffHint": "滤镜默认关闭；开启后才对画面做亮度/对比度/饱和度调整。",
				"lib.filter.brightness": "亮度",
				"lib.filter.contrast": "对比度",
				"lib.filter.saturate": "饱和度",
				"lib.group.appearance": "外观",
				"lib.appearance.glassLabel": "玻璃不透明度 ",
				"lib.layer.slots": "叠加槽",
				"lib.layer.slotA": "A（下）",
				"lib.layer.slotB": "B（上）",
				"lib.layer.swap": "交换 A/B",
				"lib.layer.pattern": "图案",
				"lib.layer.imageAria": "本地图片叠加",
				"lib.layer.selectImage": "选本地图片…",
				"lib.layer.pasteImage": "或粘贴图片地址",
				"lib.layer.fit": "图片适配",
				"lib.layer.fitCover": "填满",
				"lib.layer.fitContain": "完整",
				"lib.layer.fitStretch": "拉伸",
				"lib.layer.offHint": "这一槽关闭；选「预设」或「图片」启用。",
				"lib.layer.opacity": "叠加不透明度 ",
				"lib.layer.blend": "混合",
				"lib.layer.hint": "两层都叠在视频/图片/Shader 之上；纯 CSS，不增加解码；省电时保持静态。",
				"lib.rail.title": "侧栏壁纸",
				"lib.rail.same": "与主壁纸相同",
				"lib.rail.separate": "独立分开",
				"lib.rail.follow": "侧栏：跟随主壁纸",
				"lib.group.performance": "自动/性能",
				"lib.perf.lowPower": "省电",
				"lib.ctrl.onShort": "开",
				"lib.ctrl.offShort": "关",
				"lib.perf.renderFps": "渲染帧率",
				"lib.perf.fpsHint": "帧率档位作用于 ShaderToy 渲染与侧栏镜像；视频走原生解码，按源帧率播放，60fps 源不需要设置。60fps 更耗电，省电设置优先。",
				"lib.perf.autoHint": "自动：低电量、省流量或系统开启「减少动态效果」时，暂停动态壁纸并冻结装饰动画",
				"lib.perf.onHint": "已暂停动态壁纸（停在当前帧），并冻结桌宠等装饰动画",
				"lib.perf.offHint": "始终播放动态壁纸，不再因电量或流量降级",
				"lib.rotation.title": "自动轮播",
				"lib.rotation.order": "顺序",
				"lib.rotation.random": "随机",
				"lib.rotation.interval": "间隔",
				"lib.unit.minutesShort": "分",
				"lib.rotation.favoritesOnly": "只轮播收藏",
				"lib.rotation.everyPrefix": "每 ",
				"lib.unit.secondsSuffix": " 秒",
				"lib.unit.minutesSuffix": " 分钟",
				"lib.rotation.onHint": "换一张；页面隐藏、省电或暂停播放时顺延，当前这张不会重复选中。",
				"lib.rotation.offHint": "开启后自动轮换本地/WE 的图片与视频；隐藏的壁纸不参与，坏文件会跳过。",
				"lib.group.recipe": "保存/分享",
				"lib.group.recipeValue": "精选 · 导出/导入",
				"lib.preset.aurora.label": "极光 · 暗角",
				"lib.preset.aurora.desc": "ShaderToy 极光 + 暗角，冷色桌面",
				"lib.preset.audioScan.label": "音频极光 · 扫描线",
				"lib.preset.audioScan.desc": "麦克风律动 + 扫描线；需手动启用麦克风",
				"lib.preset.cinemaGrain.label": "电影感 · 颗粒",
				"lib.preset.cinemaGrain.desc": "保留当前壁纸，只加颗粒和暗角",
				"lib.preset.nightGlow.label": "冷夜 · 光晕",
				"lib.preset.nightGlow.desc": "保留当前壁纸，叠加冷色光晕与扫描线",
				"lib.preset.clean.label": "纯净",
				"lib.preset.clean.desc": "清空两层叠加，回到干净壁纸",
				"lib.preset.applied": "已应用精选：{name}",
				"lib.recipeApplied": "配方已应用",
				"lib.recipeAppliedShader": "配方已应用（着色器源码无效，已保留原设置）",
				"lib.recipeBadApply": "导入失败：配方内容无法应用",
				"lib.handle.title": "壁纸（Alt+W）",
				"lib.handle.text": "壁纸",
				"lib.audio.stoppedOnClose": "面板已关闭，已停止音频",
				"lib.kind.scene": "场景",
				"lib.kind.shader": "着色器",
				"lib.kind.web": "网页",
				"lib.card.web": "网页 · WE web",
				"lib.status.web": "网页壁纸运行中",
				"lib.quality.web": "画质：网页壁纸（沙箱 iframe，分辨率随窗口）",
				"lib.hint.web": "网页壁纸在沙箱 iframe 里运行；隐藏页面、省电或关闭面板时暂停。",
				"lib.current.webPrefix": "网页 · ",
			},
			en: {
				"lib.sort": "Sort",
				"lib.sortName": "Name",
				"lib.sortKind": "Type",
				"lib.sortRecent": "Recent",
				"lib.sortFavorites": "Favorites first",
				"lib.favorites": "Favorites",
				"lib.hidden": "Show hidden",
				"lib.hiddenOn": "Hidden shown",
				"lib.filterClear": "Clear filters",
				"lib.filterEmpty": "No wallpapers match: change the keywords or clear the favorite/tag filters",
				"lib.searchPlaceholder": "Search name, tag or type",
				"lib.searchAria": "Search wallpapers",
				"lib.shareTitle": "Share link",
				"lib.shareCopy": "Copy share link",
				"lib.shareCopied": "Share link copied (config only, no media files)",
				"lib.shareFailed": "Copy failed — select the link below and copy it manually",
				"lib.shareHint": "The link carries the wallpaper, framing, appearance, playback, rotation, effects, context and typography config; it only writes settings when the receiver clicks Apply.",
				"lib.shareDetected": "Shared recipe detected ({n} items)",
				"lib.shareApply": "Apply",
				"lib.shareIgnore": "Ignore",
				"lib.shareApplied": "Shared recipe applied",
				"lib.shareIgnored": "Shared recipe ignored (nothing changed)",
				"lib.shareInvalid": "Invalid share link — ignored (nothing changed)",
				"lib.shareManual": "Or copy this link manually:",
				"lib.shareLinkAria": "Shared recipe link",
				"lib.shareLong": "The link is long (it embeds shader source); some chat tools may truncate it.",
				"lib.shareBuildFail": "Could not build the share link: {reason}",
				"lib.bundleTitle": "Bundle import / export",
				"lib.bundleHint": "The bundle holds settings, recipes and uploaded wallpapers; the host streams the export without buffering it in the page.",
				"lib.bundleExport": "Export bundle",
				"lib.bundleExportBusy": "Preparing download…",
				"lib.bundleExportStarted": "Download started. A 404 means the host half is still the old build — restart DSH and retry.",
				"lib.bundleExportFail": "Export failed: {reason}",
				"lib.bundleImport": "Import bundle",
				"lib.bundleImporting": "Importing…",
				"lib.bundleImportDone": "Import finished: {imported} added, {skipped} skipped",
				"lib.bundleImportSettings": "Settings were saved on the host; reload the page to apply them",
				"lib.bundleImportFail": "Import failed: {reason}",
				"lib.bundleImportSize": "The bundle exceeds the {mb}MB limit; split it and import in parts",
				"lib.bundleImportType": "Only .tgz / .tar.gz bundles are supported",
				"lib.bundleNoHost": "This host build exposes no bundle route — restart DSH Desktop to enable it.",
				"lib.bundleProgress": "Uploading {pct}%",
				"lib.recipeHint": "Recipe v2 carries the wallpaper, framing, appearance, playback, rotation, effects, context, legibility and typography config (including shader source and parameters).",
				"lib.recipeExported": "Recipe v2 generated — copy this to share it",
				"lib.recipeBadText": "Import failed: not valid recipe text",
				"lib.recipeBadValue": "Import failed: not a valid recipe",
				"lib.exportRecipe": "Export recipe",
				"lib.importRecipe": "Import recipe",
				"lib.resetWallpaper": "Reset wallpaper defaults",
				"lib.recipePlaceholder": "{ format: \"tianlight-recipe\", version: 2 }",
				"lib.we.readFailed": "Cannot read the folder list (restart DSH to enable the host route)",
				"lib.we.saving": "Saving…",
				"lib.we.savedPrefix": "Saved ",
				"lib.we.savedDirs": " folders",
				"lib.punct.openParen": " (",
				"lib.we.savedSkipped": " invalid/relative paths ignored — use absolute paths)",
				"lib.we.saveFailed": "Save failed: restart DSH to enable the host route",
				"lib.ctrl.off": "Off",
				"lib.slot.imageUnset": "Image (none selected)",
				"lib.kind.image": "Image",
				"lib.slot.preset": "Preset",
				"lib.url.empty": "Paste a direct image or video URL first",
				"lib.url.scheme": "The URL must start with http:// or https://",
				"lib.url.httpsBlocked": "This page is HTTPS, so the browser blocks http media; use an https URL",
				"lib.url.checking": "Checking the URL…",
				"lib.url.notMedia": "That is not a directly loadable image/video URL; use an address ending in .jpg/.png/.mp4/.webm, or pick Image/Video manually.",
				"lib.url.applied": "Applied: ",
				"lib.kind.video": "Video",
				"lib.url.remoteHost": "remote host",
				"lib.shader.compileFailed": "Compile failed: ",
				"lib.shader.applied": "Shader applied",
				"lib.shader.reset": "Defaults restored — click Apply shader to use them",
				"lib.audio.stopped": "Audio stopped",
				"lib.audio.requesting": "Requesting the microphone…",
				"lib.audio.failed": "Could not enable the microphone",
				"lib.shader.audioPreset": "Switched to Audio aurora — click Apply shader to use it",
				"lib.frame.sampling": "Extracting frames from the video…",
				"lib.frame.pickHint": "Click a frame to pin it as a still wallpaper (frames are lost after switching wallpapers)",
				"lib.frame.pinned": "Still frame pinned at ",
				"lib.frame.resumed": "Live playback restored",
				"lib.upload.hostStale": "The host half is still the old build (page updated, process not restarted): restart DSH Desktop, then upload again. Click Re-detect to re-check.",
				"lib.upload.notWritable": "The upload folder is not writable: check write permission on skin-tianlight/assets/",
				"lib.upload.tooBigPrefix": "Over ",
				"lib.upload.tooBigSuffix": "MB limit; compress 4K clips first or raise TIANLIGHT_UPLOAD_MAX",
				"lib.upload.types": "Only mp4/webm/mov/m4v/png/jpg/webp/avif/gif/svg are supported",
				"lib.upload.busy": "Uploading…",
				"lib.upload.done": "Uploaded: ",
				"lib.upload.failed": "Upload failed: ",
				"lib.current.auto": "Automatic (asset priority)",
				"lib.current.scenePrefix": "Scene · ",
				"lib.current.customShader": "Custom code",
				"lib.current.unnamed": "Untitled",
				"lib.current.videoStill": "Video still frame",
				"lib.quality.loadFailed": "Wallpaper failed to load: pick another file or check the codec/URL; the skin falls back to a playable frame",
				"lib.quality.scene": "Quality: WebWallGL real-time scene",
				"lib.quality.measured": " · measured ",
				"lib.quality.engineNotReady": " · engine not ready",
				"lib.quality.shader": "Quality: procedural shader, independent of source resolution",
				"lib.quality.source": "Quality: source ",
				"lib.quality.crop": " · current crop ≈ ",
				"lib.quality.upscaled": " · upscaled, may look soft",
				"lib.quality.native": " · no upscaling",
				"lib.quality.low": " (low)",
				"lib.quality.eightK": " · 8K sources may be downsampled",
				"lib.quality.duration": " · duration ",
				"lib.power.reducedMotion": "Reduced motion is on in the system",
				"lib.power.saveData": "Data saver is on in the browser",
				"lib.power.battery": "Battery is low and not charging",
				"lib.power.manual": "Low power turned on manually",
				"lib.status.lowPower": "Low-power pause",
				"lib.status.still": "Still frame",
				"lib.status.blocked": "Autoplay blocked",
				"lib.status.stalled": "Picture stalled",
				"lib.status.failed": "Load failed",
				"lib.status.image": "Image wallpaper",
				"lib.status.loading": "Loading",
				"lib.status.scene": "Scene running",
				"lib.status.shader": "Shader running",
				"lib.status.playing": "Playing",
				"lib.status.idle": "No wallpaper selected",
				"lib.status.paused": "Paused",
				"lib.status.ready": "Ready",
				"lib.hint.lowPowerPauseOpen": "Auto-paused by low power (",
				"lib.power.mode": "low power",
				"lib.hint.lowPowerPauseClose": "); click the button to turn low power off and resume playback.",
				"lib.hint.still": "Pinned to a still frame; it stays after a reload. Click Back to motion to resume playback.",
				"lib.hint.blocked": "The browser blocked autoplay. Click Play once; afterwards returning to the page resumes automatically.",
				"lib.hint.stalled": "Playback was requested but no new frame arrived. Click Retry to reload the current wallpaper.",
				"lib.hint.decodeFailedOpen": "Decode or playback failed (",
				"lib.common.unknownReason": "unknown reason",
				"lib.hint.decodeFailedClose": "); the skin falls back to a playable frame.",
				"lib.hint.idle": "No wallpaper selected yet; start from Sources below.",
				"lib.hint.buffering": "Loading/decoding; playback starts as soon as the picture appears.",
				"lib.hint.scene": "WebWallGL is rendering the WE scene; a failed load falls back to video/image.",
				"lib.hint.shader": "The procedural shader runs at the current render tier.",
				"lib.hint.videoPlaying": "The video is playing; switching pages pauses it and returning resumes.",
				"lib.hint.paused": "Paused on the current frame; click Resume playback to continue.",
				"lib.hint.ready": "The picture is ready.",
				"lib.action.lowPowerPlay": "Turn off low power and play",
				"lib.action.backToMotion": "Back to motion",
				"lib.action.play": "Play",
				"lib.action.retry": "Retry",
				"lib.action.pause": "Pause",
				"lib.action.resume": "Resume playback",
				"lib.quality.jitter": " · frame jitter ",
				"lib.quality.high": " (high)",
				"lib.listHint.url": "Paste the full media URL below; not a web page. Remote URLs play without being downloaded into the library.",
				"lib.listHint.shader": "Pick a preset or paste GLSL, tune the parameters, then click Apply shader.",
				"lib.listHint.weOpen": "Wallpaper Engine: ",
				"lib.unit.items": " items",
				"lib.listHint.weSceneOpen": " (scenes ",
				"lib.punct.closeParen": ")",
				"lib.listHint.weClose": "; change folders under Configure folders at the top of the list. Failed scenes fall back automatically.",
				"lib.listHint.local": "Local & uploads: ",
				"lib.listHint.localSuffix": " items. Click a thumbnail to apply it; 4K/8K are fine too.",
				"lib.listHint.all": "All wallpapers: ",
				"lib.listHint.allMiddle": " items (local ",
				"lib.listHint.allSuffix": "). Click a thumbnail to apply it, or filter above, or import from URL / WE folder / GLSL.",
				"lib.list.loading": "Loading…",
				"lib.list.failed": "Unavailable",
				"lib.list.loadingHint": "Loading the wallpaper list…",
				"lib.list.errNetwork": "Cannot read the wallpaper list: the host route or network failed",
				"lib.list.errHostStale": "Cannot read the wallpaper list: the host half is the old build — restart DSH Desktop and retry",
				"lib.pick.more": "More settings",
				"lib.pick.back": "Back to quick pick",
				"lib.pick.applied": "Switched to: {name}",
				"lib.pick.failed": "Switch failed: {reason}",
				"lib.pick.noScene": "Wallpaper scene is off: enable the Wallpaper module in Advanced",
				"lib.card.inUse": "In use",
				"lib.source.url": "URL",
				"lib.source.local": "Local/uploads",
				"lib.source.all": "All",
				"lib.source.engine": "Wallpaper Engine",
				"lib.we.detected": "Wallpaper Engine: {n} wallpapers detected (Steam Workshop {steam} / My projects {project})",
				"lib.we.openLibrary": "Open wallpaper library",
				"lib.we.openRequested": "Wallpaper library requested",
				"lib.we.openFallback": "Wallpaper library requested; if it did not open, go to Settings → Wallpaper",
				"lib.we.manual": "Advanced (manual path)",
				"lib.we.manualHint": "Only for legacy folders auto-detect cannot find; normally not needed.",
				"lib.we.autoDesc": "Auto-detects the local wallpaper library (no path setup)",
				"lib.we.staticHint": "Still HD",
				"lib.we.staticHintTitle": "Scenes apply as a still HD image; opt into Generate animated in the settings page",
				"lib.listHint.engine": "Wallpaper Engine: {n} wallpapers (auto-detected — click a card to apply; scenes are still-HD)",
				"lib.listValue.pasteUrl": "Paste URL",
				"lib.ctrl.auto": "Auto",
				"lib.appearance.glassPrefix": "Glass ",
				"lib.perf.powerAuto": "Low power auto",
				"lib.perf.powerOn": "Low power on",
				"lib.perf.powerOff": "Low power off",
				"lib.perf.rotationOn": " · rotation on",
				"lib.panel.title": "Wallpaper",
				"lib.view.pick": "Pick",
				"lib.view.advanced": "Advanced",
				"lib.panel.close": "Close the wallpaper sidebar",
				"lib.current.prefix": "Current wallpaper: ",
				"lib.source.localShort": "Local",
				"lib.label.playing": "Playing",
				"lib.label.unlock": "Needs a click",
				"lib.label.play": "Play",
				"lib.group.sources": "Sources (folders/code)",
				"lib.punct.colon": ": ",
				"lib.group.list": "Wallpaper list",
				"lib.we.hint": "Paste the Wallpaper Engine projects folders here, one per line; read-only, the original files are untouched.",
				"lib.we.placeholder": "One absolute path per line, e.g. …/steamapps/workshop/content/431960/<projectID>",
				"lib.we.save": "Save folders",
				"lib.upload.title": "Uploaded files appear in the local list; same-name files are not overwritten",
				"lib.upload.button": "Upload wallpaper",
				"lib.upload.hostStaleShort": "Host half needs a DSH restart",
				"lib.upload.limitSuffix": "MB · images/videos",
				"lib.upload.redetecting": "Re-checking the host routes…",
				"lib.upload.redetect": "Re-detect",
				"lib.hiddenHint": "Hiding only changes the list; source files are kept",
				"lib.tag.prefix": "Tags: ",
				"lib.tag.remove": "Remove this tag",
				"lib.tag.placeholder": "Type a tag and press Enter, e.g. night",
				"lib.common.done": "Done",
				"lib.card.autoTitle": "Automatic",
				"lib.card.autoNote": "Asset priority",
				"lib.card.scene": "Scene · WebWallGL",
				"lib.card.unhide": "Show again",
				"lib.card.hide": "Hide",
				"lib.card.unhideTitle": "Show again (files are kept)",
				"lib.card.hideTitle": "Hide (files kept, playback not interrupted)",
				"lib.card.unhideShort": "S",
				"lib.card.hideShort": "H",
				"lib.card.unfavorite": "Remove favorite",
				"lib.card.favorite": "Favorite",
				"lib.card.editTags": "Edit tags",
				"lib.empty.we": "No readable video/scene in this source: legacy folders can be checked under Advanced ① → Advanced (manual path); auto-detected items live under the Wallpaper Engine source.",
				"lib.empty.all": "No wallpapers yet: click Upload wallpaper below, or use Import URL / WE folder / GLSL above.",
				"lib.empty.local": "No local wallpapers yet: put images/videos into skin-tianlight/assets/ and reload, or click Upload wallpaper.",
				"lib.empty.engine": "No Wallpaper Engine wallpapers to show: check auto-detection in Settings → Wallpaper.",
				"lib.empty.showAll": "View all wallpapers",
				"lib.url.hint": "Only directly loadable media URLs: image or video addresses, not web pages. Remote URLs play without being downloaded; upload to add to the library.",
				"lib.field.type": "Type",
				"lib.url.pasted": "Pasted from the clipboard — click Apply URL or press Enter",
				"lib.url.clipboardEmpty": "The clipboard is empty; press Ctrl+V manually",
				"lib.url.clipboardDenied": "The browser refused clipboard access; press Ctrl+V manually",
				"lib.url.paste": "Paste",
				"lib.url.placeholder": "Paste a full direct URL, e.g. https://…/wallpaper.mp4",
				"lib.url.checkingShort": "Checking…",
				"lib.url.apply": "Apply URL",
				"lib.url.autoHint": "Auto checks the extension first and probes the media when there is none; keep Auto if unsure.",
				"lib.shader.intro": "ShaderToy style: no account and no scraping. ① pick a preset or paste GLSL → ② tune speed/intensity/hue → ③ click Apply shader.",
				"lib.shader.uniforms": "Available uniforms: iTime / iResolution / iMouse / u_speed / u_intensity / u_hue / u_audio.",
				"lib.audio.hint": "Audio response: sends the live microphone level to u_audio; analysis only, never recorded or uploaded.",
				"lib.audio.requestingShort": "Requesting…",
				"lib.audio.stop": "Stop audio",
				"lib.audio.start": "Enable microphone",
				"lib.audio.usePreset": "Use Audio aurora",
				"lib.audio.active": "Audio response is live; closing the panel, low power or a hidden page stops it.",
				"lib.audio.idle": "Not enabled. Apply a ShaderToy wallpaper first.",
				"lib.shader.sourceAria": "Shader source",
				"lib.shader.speed": "Speed ",
				"lib.shader.intensity": "Intensity ",
				"lib.shader.hue": "Hue ",
				"lib.shader.apply": "Apply shader",
				"lib.shader.resetButton": "Reset defaults",
				"lib.group.framing": "Picture",
				"lib.framing.followWindow": "Fit window",
				"lib.framing.zoom": "Zoom ",
				"lib.framing.cx": "Framing X ",
				"lib.framing.notCropped": "% · not cropped",
				"lib.framing.cy": "Framing Y ",
				"lib.framing.window": "Window ",
				"lib.framing.cropFollows": " · crop follows the window",
				"lib.framing.cropIs": " · crop ",
				"lib.framing.hint": "Framing sliders only work when the picture is cropped: raise the zoom or pick a ratio different from the window.",
				"lib.frame.needExplicit": "Still frame: select a video wallpaper explicitly first (Automatic does not support frame picking)",
				"lib.frame.videoOnly": "Still frame: only video wallpapers support frame picking",
				"lib.frame.hint": "Still frame: take 6 frames from the current video; click one to pin it as the wallpaper",
				"lib.frame.busy": "Extracting frames…",
				"lib.frame.generate": "Generate frame preview",
				"lib.frame.currentPrefix": "Current: still frame ",
				"lib.frame.currentSuffix": "s (Back to motion resumes playback)",
				"lib.frame.set": "Pin still frame ",
				"lib.playback.hint": "Playback: speed/flip affect video only; a 60fps source keeps its rate and speed scales the effective frame rate.",
				"lib.playback.speed": "Speed",
				"lib.playback.pause": "Pause",
				"lib.playback.flip": "Flip horizontally",
				"lib.playback.filter": "Picture filter",
				"lib.ctrl.on": "On",
				"lib.ctrl.offByDefault": "Off by default",
				"lib.playback.filterOnHint": "The filter adds one full-screen composite; if 4K/60fps drops frames, turn it off first.",
				"lib.playback.filterOffHint": "The filter is off by default; enable it to adjust brightness/contrast/saturation.",
				"lib.filter.brightness": "Brightness",
				"lib.filter.contrast": "Contrast",
				"lib.filter.saturate": "Saturation",
				"lib.group.appearance": "Appearance",
				"lib.appearance.glassLabel": "Glass opacity ",
				"lib.layer.slots": "Overlay slots",
				"lib.layer.slotA": "A (lower)",
				"lib.layer.slotB": "B (upper)",
				"lib.layer.swap": "Swap A/B",
				"lib.layer.pattern": "Pattern",
				"lib.layer.imageAria": "Local image overlay",
				"lib.layer.selectImage": "Select a local image…",
				"lib.layer.pasteImage": "Or paste an image URL",
				"lib.layer.fit": "Image fit",
				"lib.layer.fitCover": "Fill",
				"lib.layer.fitContain": "Fit",
				"lib.layer.fitStretch": "Stretch",
				"lib.layer.offHint": "This slot is off; choose Preset or Image to enable it.",
				"lib.layer.opacity": "Overlay opacity ",
				"lib.layer.blend": "Blend",
				"lib.layer.hint": "Both slots sit above video/image/shader with pure CSS: no extra decoding, frozen under low power.",
				"lib.rail.title": "Rail wallpaper",
				"lib.rail.same": "Same as main",
				"lib.rail.separate": "Separate",
				"lib.rail.follow": "Rail: follow the main wallpaper",
				"lib.group.performance": "Auto / performance",
				"lib.perf.lowPower": "Low power",
				"lib.ctrl.onShort": "On",
				"lib.ctrl.offShort": "Off",
				"lib.perf.renderFps": "Render frame rate",
				"lib.perf.fpsHint": "The tier drives ShaderToy rendering and the rail mirror; video uses native decoding at its source rate, so a 60fps source needs no setting. 60fps costs more power; low-power settings win.",
				"lib.perf.autoHint": "Auto: on low battery, data saver or reduced motion, pause the animated wallpaper and freeze decorative animations",
				"lib.perf.onHint": "The animated wallpaper is paused on its current frame and decorative animations (companion etc.) are frozen",
				"lib.perf.offHint": "Always play the animated wallpaper; no battery/data downgrade",
				"lib.rotation.title": "Auto rotation",
				"lib.rotation.order": "Order",
				"lib.rotation.random": "Random",
				"lib.rotation.interval": "Interval",
				"lib.unit.minutesShort": "min",
				"lib.rotation.favoritesOnly": "Favorites only",
				"lib.rotation.everyPrefix": "Every ",
				"lib.unit.secondsSuffix": " s",
				"lib.unit.minutesSuffix": " min",
				"lib.rotation.onHint": "switch to the next one; it waits while the page is hidden, under low power or when playback is paused, and never repeats the current wallpaper.",
				"lib.rotation.offHint": "When on, rotate local/WE images and videos automatically; hidden wallpapers are excluded and broken files are skipped.",
				"lib.group.recipe": "Save / share",
				"lib.group.recipeValue": "Presets · export/import",
				"lib.preset.aurora.label": "Aurora · vignette",
				"lib.preset.aurora.desc": "ShaderToy aurora + vignette, cool desktop",
				"lib.preset.audioScan.label": "Audio aurora · scanlines",
				"lib.preset.audioScan.desc": "Microphone pulse + scanlines; enable the mic manually",
				"lib.preset.cinemaGrain.label": "Cinematic · grain",
				"lib.preset.cinemaGrain.desc": "Keep the current wallpaper, add grain + vignette only",
				"lib.preset.nightGlow.label": "Cold night · glow",
				"lib.preset.nightGlow.desc": "Keep the current wallpaper, add a cold glow + scanlines",
				"lib.preset.clean.label": "Clean",
				"lib.preset.clean.desc": "Clear both overlay slots for a clean wallpaper",
				"lib.preset.applied": "Applied preset: {name}",
				"lib.recipeApplied": "Recipe applied",
				"lib.recipeAppliedShader": "Recipe applied (invalid shader source; original settings kept)",
				"lib.recipeBadApply": "Import failed: the recipe could not be applied",
				"lib.handle.title": "Wallpaper (Alt+W)",
				"lib.handle.text": "Wallpaper",
				"lib.audio.stoppedOnClose": "Panel closed — audio stopped",
				"lib.kind.scene": "Scene",
				"lib.kind.shader": "Shader",
				"lib.kind.web": "Web",
				"lib.card.web": "Web · WE web",
				"lib.status.web": "Web wallpaper running",
				"lib.quality.web": "Quality: web wallpaper (sandboxed iframe, sized to the window)",
				"lib.hint.web": "The web wallpaper runs in a sandboxed iframe; it pauses when the page is hidden, under low power or when the panel closes.",
				"lib.current.webPrefix": "Web · ",
			},
		});

		/**
		 * v0.5.0 面板新增样式。整块必须落在 body[data-dsh-tianlight] 作用域下
		 * （agent-check / check-css 校验）；既有控件继续复用 v0.4.0 的类，
		 * 面板几何不变，只给新控件补最小样式。
		 */
		registerTl5Css(String.raw`
body[data-dsh-tianlight] .tl-wall-sort-row {
	display: flex;
	flex-wrap: wrap;
	gap: 4px 6px;
	align-items: center;
}
body[data-dsh-tianlight] .tl-wall-facet-row {
	display: flex;
	flex-wrap: wrap;
	gap: 4px;
	align-items: center;
}
body[data-dsh-tianlight] .tl-wall-share-strip {
	display: flex;
	flex-direction: column;
	gap: 6px;
	margin: 2px 0 4px;
	padding: 7px 9px;
	border-radius: 10px;
	border: 0.5px solid var(--tl-accent);
	background: color-mix(in srgb, var(--tl-accent) 12%, var(--tl-glass-fill));
	color: var(--tl-ink);
	font-size: 11px;
	line-height: 1.45;
}
body[data-dsh-tianlight] .tl-wall-share-strip[data-tone="warn"] {
	border-color: var(--tl-line-strong);
	background: var(--tl-glass-fill);
	color: var(--tl-ink-soft);
}
body[data-dsh-tianlight] .tl-wall-share-strip-text {
	margin: 0;
	font-weight: 600;
}
body[data-dsh-tianlight] .tl-wall-share-strip-actions {
	display: flex;
	flex-wrap: wrap;
	gap: 4px;
	align-items: center;
}
body[data-dsh-tianlight] .tl-wall-bundle-row {
	display: flex;
	flex-wrap: wrap;
	gap: 6px;
	align-items: center;
}
body[data-dsh-tianlight] .tl-wall-progress {
	width: 100%;
	height: 6px;
	accent-color: var(--tl-accent);
}
body[data-dsh-tianlight] .tl-wall-v05-note {
	margin: 0;
	font-size: 10px;
	line-height: 1.5;
	color: var(--tl-ink-faint);
}
/* v0.5.2: the English copy is longer than the Chinese one. Rows already wrap
   (.tl-wall-tabs does); long button/chip labels must wrap too instead of pushing
   the fixed-width panel wider (measured on the 296px sidebar). */
body[data-dsh-tianlight] [data-tl-wall] .tl-font-option,
body[data-dsh-tianlight] [data-tl-wall] .tl-wall-filter-chip,
body[data-dsh-tianlight] [data-tl-wall] .tl-wall-import-btn,
body[data-dsh-tianlight] [data-tl-wall] .tl-font-reset {
	max-width: 100%;
	white-space: normal;
	overflow-wrap: anywhere;
	word-break: break-word;
}
body[data-dsh-tianlight] [data-tl-wall] .tl-wall-tabs,
body[data-dsh-tianlight] [data-tl-wall] .tl-wall-import-row,
body[data-dsh-tianlight] [data-tl-wall] .tl-wall-sort-row,
body[data-dsh-tianlight] [data-tl-wall] .tl-wall-bundle-row,
body[data-dsh-tianlight] [data-tl-wall] .tl-wall-share-strip-actions,
body[data-dsh-tianlight] [data-tl-wall] .tl-wall-filter-row,
body[data-dsh-tianlight] [data-tl-wall] .tl-wall-filters {
	flex-wrap: wrap;
}
body[data-dsh-tianlight] [data-tl-wall] .tl-font-input,
body[data-dsh-tianlight] [data-tl-wall] .tl-font-select,
body[data-dsh-tianlight] [data-tl-wall] .tl-wall-textarea,
body[data-dsh-tianlight] [data-tl-wall] .tl-source-card {
	max-width: 100%;
	box-sizing: border-box;
	overflow-wrap: anywhere;
}
/* ---- v0.5.3 quick picker -------------------------------------------------
   The pick view is a wallpaper chooser, not a settings page: compact header,
   visual 2-column grid, no upload/import rows. The advanced view keeps the full
   v0.5.2 guide. All rules stay scoped to the skin body + panel. */
body[data-dsh-tianlight] [data-tl-wall] .tl-wall-more-settings {
	margin-left: auto;
	border-color: var(--tl-accent);
	background: color-mix(in srgb, var(--tl-accent) 14%, transparent);
	color: var(--tl-ink);
	font-weight: 600;
	padding: 4px 10px;
}
body[data-dsh-tianlight] [data-tl-wall] .tl-wall-more-settings:hover {
	background: color-mix(in srgb, var(--tl-accent) 22%, transparent);
}
body[data-dsh-tianlight] [data-tl-wall] .tl-wall-back-quick {
	border-color: var(--tl-accent);
	background: color-mix(in srgb, var(--tl-accent) 12%, transparent);
	color: var(--tl-ink);
	font-weight: 600;
}
body[data-dsh-tianlight] [data-tl-wall] .tl-wall-pick-status {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 6px;
	margin: 2px 0 0;
}
body[data-dsh-tianlight] [data-tl-wall] .tl-wall-pick-status .tl-wall-status {
	margin: 0;
}
body[data-dsh-tianlight] [data-tl-wall] .tl-wall-pick-error {
	margin: 0;
	width: 100%;
	font-size: 11px;
	line-height: 1.5;
	color: var(--tl-ink);
	border-left: 2px solid var(--tl-line-strong);
	padding-left: 6px;
}
/* In the pick view the sticky block is a compact bar; its guide only keeps the
   source chips (and a pending share-recipe strip). */
body[data-dsh-tianlight] [data-tl-wall] [data-tl-view="pick"] .tl-wall-guide {
	gap: 4px;
	margin-bottom: 0;
}
body[data-dsh-tianlight] [data-tl-wall] [data-tl-view="pick"] .tl-wall-view-switch {
	display: none;
}
body[data-dsh-tianlight] [data-tl-wall] [data-tl-view="pick"] .tl-wall-head {
	gap: 6px;
}
/* The grid is the body of the picker: two large columns, bigger previews. */
body[data-dsh-tianlight] [data-tl-wall] .tl-wall-grid-pick {
	gap: 10px;
	margin: 2px 0 0;
}
body[data-dsh-tianlight] [data-tl-wall] .tl-wall-grid-pick .tl-wall-cell > .tl-wall-card {
	padding: 7px;
	gap: 7px;
	border-radius: 14px;
}
body[data-dsh-tianlight] [data-tl-wall] .tl-wall-grid-pick .tl-wall-thumb {
	aspect-ratio: 4 / 3;
	border-radius: 10px;
}
/* "Click anywhere on the card switches": preview media must not eat the gesture. */
body[data-dsh-tianlight] [data-tl-wall] .tl-wall-grid-pick .tl-wall-thumb > img,
body[data-dsh-tianlight] [data-tl-wall] .tl-wall-grid-pick .tl-wall-thumb > video {
	pointer-events: none;
}
body[data-dsh-tianlight] [data-tl-wall] .tl-wall-grid-pick .tl-wall-name {
	font-size: 12px;
	font-weight: 600;
	line-height: 1.35;
	white-space: normal;
	overflow-wrap: anywhere;
}
body[data-dsh-tianlight] [data-tl-wall] .tl-wall-grid-pick .tl-wall-tags-mini {
	white-space: normal;
	line-height: 1.35;
}
body[data-dsh-tianlight] [data-tl-wall] .tl-wall-grid-pick .tl-wall-card[data-active] {
	border-color: var(--tl-accent);
	box-shadow: 0 0 0 2px color-mix(in srgb, var(--tl-accent) 40%, transparent);
}
body[data-dsh-tianlight] [data-tl-wall] .tl-wall-using {
	align-self: flex-start;
	padding: 1px 7px;
	border-radius: 999px;
	background: var(--tl-accent);
	color: #ffffff;
	font-size: 10px;
	font-weight: 700;
	line-height: 1.5;
	letter-spacing: 0.02em;
}
/* Transient "switched to …" feedback. The host is a transformed fixed layer, so a
   fixed toast is positioned against the panel itself. */
body[data-dsh-tianlight] [data-tl-wall] .tl-wall-toast {
	position: fixed;
	left: 14px;
	right: 14px;
	bottom: calc(18px + env(safe-area-inset-bottom, 0px));
	z-index: 6;
	padding: 8px 12px;
	border-radius: 12px;
	border: 0.5px solid var(--tl-glass-line);
	background: color-mix(in srgb, var(--tl-panel-fill) 92%, var(--tl-accent));
	color: var(--tl-ink);
	font-size: 12px;
	line-height: 1.4;
	box-shadow: 0 8px 24px rgba(8, 26, 48, 0.22);
	pointer-events: none;
	overflow-wrap: anywhere;
	animation: tl-wall-toast-in 0.16s ease-out;
}
@keyframes tl-wall-toast-in {
	from { opacity: 0; transform: translateY(6px); }
	to { opacity: 1; transform: translateY(0); }
}
/* ---- v0.6.0 Wallpaper Engine library ------------------------------------- */
/* Four source chips (all/local/legacy-WE/engine) must wrap inside the 296px panel
   instead of being squeezed into the old 3-column grid. */
body[data-dsh-tianlight] [data-tl-wall] .tl-wall-filter-row {
	display: flex;
	flex-wrap: wrap;
	gap: 4px;
}
body[data-dsh-tianlight] [data-tl-wall] .tl-wall-filter-row .tl-wall-filter-chip {
	flex: 0 1 auto;
	max-width: 100%;
}
body[data-dsh-tianlight] [data-tl-wall] .tl-we-auto {
	display: flex;
	flex-wrap: wrap;
	gap: 6px;
	align-items: center;
	margin: 2px 0 0;
}
body[data-dsh-tianlight] [data-tl-wall] .tl-we-auto-text {
	flex: 1 1 150px;
	min-width: 0;
	overflow-wrap: anywhere;
}
body[data-dsh-tianlight] [data-tl-wall] .tl-we-open-library {
	flex: 0 0 auto;
	border-color: var(--tl-accent);
	background: color-mix(in srgb, var(--tl-accent) 14%, transparent);
	color: var(--tl-ink);
	font-weight: 600;
}
body[data-dsh-tianlight] [data-tl-wall] .tl-we-open-library:hover {
	background: color-mix(in srgb, var(--tl-accent) 22%, transparent);
}
/* The manual-path fallback is a nested collapsed details; keep it quiet. */
body[data-dsh-tianlight] [data-tl-wall] .tl-we-manual {
	margin-top: 2px;
	padding: 5px 7px;
	border-style: dashed;
	background: transparent;
}
body[data-dsh-tianlight] [data-tl-wall] .tl-we-manual > summary {
	font-size: 11px;
	font-weight: 500;
	color: var(--tl-ink-soft);
}
body[data-dsh-tianlight] [data-tl-wall] .tl-we-manual-body {
	display: flex;
	flex-direction: column;
	gap: 6px;
}
body[data-dsh-tianlight] [data-tl-wall] .tl-wall-badge-hint {
	align-self: flex-start;
	padding: 0 6px;
	border-radius: 999px;
	border: 0.5px solid var(--tl-line-strong);
	color: var(--tl-ink-soft);
	font-size: 9px;
	font-weight: 600;
	line-height: 1.6;
	cursor: help;
}
`);

		/** v0.5.0 面板「最近使用」顺序：只记录用户主动选中的壁纸，供排序使用。 */
		const PANEL_RECENT_KEY = "tianlight.recent";
		/** v0.5.2: one silent list retry before the panel reports a failure (~1.2s). */
		const PANEL_LIST_RETRY_MS = 1200;
		function readPanelRecent() {
			try {
				const raw = JSON.parse(globalThis.localStorage?.getItem(PANEL_RECENT_KEY) ?? "null");
				if (!Array.isArray(raw)) return [];
				return [...new Set(raw.filter((url) => typeof url === "string" && url !== ""))].slice(0, 64);
			} catch {
				return [];
			}
		}

		/**
		 * v0.5.0 D3 分享链接：`#tl=<base64url(recipe json)>`。哈希不会发给宿主，
		 * 也不写任何设置；只有用户在确认条里点「应用」才会走 applyPresetValue
		 * 那套既有 normalizer。
		 */
		const PANEL_SHARE_FORMATS = ["tianlight-recipe", "tianlight-preset"];
		const PANEL_SHARE_KEYS = [
			"zones",
			"glass",
			"lowPower",
			"lowpower",
			"wallpaper",
			"shader",
			"layers",
			"playback",
			"rotation",
			"effects",
			"context",
			"legibility",
			"typography",
		];
		const PANEL_SHARE_MAX = 512 * 1024;
		/** D2 导入包上限：超过后先提示，绝不把大文件读进内存。 */
		const PANEL_BUNDLE_LIMIT = 256 * 1024 * 1024;

		function tl5Base64UrlEncode(text) {
			const bytes = new TextEncoder().encode(String(text));
			let binary = "";
			const chunk = 0x8000;
			for (let index = 0; index < bytes.length; index += chunk) {
				binary += String.fromCharCode.apply(null, bytes.subarray(index, index + chunk));
			}
			return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
		}

		function tl5Base64UrlDecode(data) {
			const padded = String(data)
				.replace(/-/g, "+")
				.replace(/_/g, "/");
			const withPad = padded + "=".repeat((4 - (padded.length % 4)) % 4);
			const binary = atob(withPad);
			const bytes = new Uint8Array(binary.length);
			for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
			return new TextDecoder().decode(bytes);
		}

		/** 只认 tianlight-recipe/preset 形状；返回 { recipe, count } 或 null。 */
		function readTl5RecipeObject(value) {
			if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
			const format = typeof value.format === "string" ? value.format : "";
			if (format !== "" && PANEL_SHARE_FORMATS.includes(format) === false) return null;
			const version = Number(value.version);
			if (!Number.isFinite(version) || version < 1 || version > 2) return null;
			let count = 0;
			for (const key of PANEL_SHARE_KEYS) {
				const present = value[key] !== undefined && value[key] !== null;
				if (present === false) continue;
				// lowPower / lowpower 是同一个字段的两种写法，只计一次。
				if (key === "lowpower" && value.lowPower !== undefined && value.lowPower !== null) continue;
				count += 1;
			}
			if (count === 0) return null;
			return { recipe: value, count };
		}

		function decodeTl5ShareRecipe(payload) {
			try {
				if (typeof payload !== "string" || payload.length < 8 || payload.length > PANEL_SHARE_MAX) return null;
				return readTl5RecipeObject(JSON.parse(tl5Base64UrlDecode(payload)));
			} catch {
				return null;
			}
		}

		function clearTl5ShareHash() {
			try {
				const location = globalThis.location;
				if (location === undefined || location === null) return;
				const clean = String(location.pathname ?? "") + String(location.search ?? "");
				if (typeof globalThis.history?.replaceState === "function") globalThis.history.replaceState(null, "", clean);
			} catch {
				// history may be unavailable; an un-cleared hash changes nothing
			}
		}

		/** 读取当前 URL 的 #tl=；非法链接立即清掉并只记一条警告，绝不写设置。 */
		function readTl5ShareHash() {
			try {
				const hash = String(globalThis.location?.hash ?? "");
				if (hash.startsWith("#tl=") === false) return null;
				const decoded = decodeTl5ShareRecipe(hash.slice(4));
				if (decoded === null) {
					note("share:invalid-link", {});
					clearTl5ShareHash();
					return null;
				}
				return decoded;
			} catch (error) {
				note("share:read-link", error);
				return null;
			}
		}

		function installWallpaperSidebar(ctx) {
			if (React === null || typeof ctx.inject !== "function") return () => {};

			/**
			 * Curated presets shipped with the skin. The same recipes live in
			 * presets/*.json as shareable copies; the panel uses this list so browsing
			 * the gallery never needs a network call.
			 */
			const PRESET_ZONES = {
				separate: false,
				main: { fit: "cover", ratio: "auto", zoom: 100, cx: 50, cy: 50, fx: 38, fy: 50, dim: 0, blur: 0 },
				rail: { fit: "cover", fx: 50, fy: 50, dim: 16, blur: 0, url: "", kind: "video" },
			};
			const presetSlot = (kind, preset, opacity, blend) => ({ kind, preset, url: "", fit: "cover", opacity, blend });
			const CURATED_PRESETS = [
				{
					id: "aurora-vignette",
					labelKey: "lib.preset.aurora.label",
					descKey: "lib.preset.aurora.desc",
					value: {
						format: "tianlight-preset",
						version: 1,
						zones: PRESET_ZONES,
						glass: 1,
						lowPower: "auto",
						wallpaper: { kind: "shader", url: "shader://live" },
						shader: { preset: "aurora", source: SHADER_SOURCES.aurora, speed: 1, intensity: 1, hue: 0.58 },
						layers: { version: 2, slots: [presetSlot("preset", "vignette", 0.45, "normal"), presetSlot("none", "none", 0.55, "normal")] },
					},
				},
				{
					id: "audio-scan",
					labelKey: "lib.preset.audioScan.label",
					descKey: "lib.preset.audioScan.desc",
					value: {
						format: "tianlight-preset",
						version: 1,
						zones: PRESET_ZONES,
						glass: 1,
						lowPower: "auto",
						wallpaper: { kind: "shader", url: "shader://live" },
						shader: { preset: "audio", source: SHADER_SOURCES.audio, speed: 1, intensity: 1, hue: 0.58 },
						layers: { version: 2, slots: [presetSlot("preset", "scan", 0.28, "screen"), presetSlot("preset", "glow", 0.22, "screen")] },
					},
				},
				{
					id: "cinema-grain",
					labelKey: "lib.preset.cinemaGrain.label",
					descKey: "lib.preset.cinemaGrain.desc",
					value: {
						format: "tianlight-preset",
						version: 1,
						layers: { version: 2, slots: [presetSlot("preset", "grain", 0.38, "overlay"), presetSlot("preset", "vignette", 0.5, "multiply")] },
					},
				},
				{
					id: "night-glow",
					labelKey: "lib.preset.nightGlow.label",
					descKey: "lib.preset.nightGlow.desc",
					value: {
						format: "tianlight-preset",
						version: 1,
						layers: { version: 2, slots: [presetSlot("preset", "glow", 0.35, "screen"), presetSlot("preset", "scan", 0.18, "normal")] },
					},
				},
				{
					id: "clean",
					labelKey: "lib.preset.clean.label",
					descKey: "lib.preset.clean.desc",
					value: {
						format: "tianlight-preset",
						version: 1,
						layers: { version: 2, slots: [presetSlot("none", "none", 0.55, "normal"), presetSlot("none", "none", 0.55, "normal")] },
					},
				},
			];

			const WallpaperPanel = (props) => {
				// v0.5.0: re-render on a language change. This hook is the first hook in
				// the component so the hook order stays fixed for its whole lifetime.
				const { t } = useTl5I18n();
				const [items, setItems] = React.useState([]);
				const [active, setActive] = React.useState(() => {
					const chosen = readWallpaperChoice();
					return chosen === null ? "" : chosen.url;
				});
				// The full choice, not just its URL: the frame picker needs kind + still.
				const [activeChoice, setActiveChoice] = React.useState(() => readWallpaperChoice());
				const [draft, setDraft] = React.useState("");
				const [draftKind, setDraftKind] = React.useState("auto");
				const [draftBusy, setDraftBusy] = React.useState(false);
				const [draftNote, setDraftNote] = React.useState("");
				const [noteText, setNote] = React.useState("");
				const [weOpen, setWeOpen] = React.useState(false);
				// The source row is a real tab: it owns the highlight and the list contents.
				// "local" shows assets/, "we" shows the WE roots, "url" swaps the grid for
				// the URL composer, and "shader" for the GLSL editor.
				// "all" is the default: the panel opens on a single wallpaper grid, not a
				// source questionnaire. local/we are filters; URL and GLSL are composers.
				const [sourceTab, setSourceTab] = React.useState("all");
				const [composer, setComposer] = React.useState("none");
				// Two surfaces, one panel: "pick" is just sources + the list; "advanced"
				// reveals the adjustment groups. The old six-section wall was the main
				// complaint, so the default view no longer shows it at all.
				const [view, setView] = React.useState("pick");
				// v0.5.3 quick picker: "更多设置"/"返回快捷选择" replace the old
				// discoverability hint; the pick view is a pure visual grid.
				const [toast, setToast] = React.useState(null);
				const [pickError, setPickError] = React.useState("");
				const showToast = (text) => {
					const next = { text, at: Date.now() };
					setToast(next);
					globalThis.setTimeout(() => {
						setToast((current) => (current !== null && current.at === next.at ? null : current));
					}, 1800);
				};
				// ---- library: search, favourites and tags ----
				const [library, setLibrary] = React.useState(() => wallpaperLibraryController.read());
				const [query, setQuery] = React.useState("");
				const [favoritesOnly, setFavoritesOnly] = React.useState(false);
				const [showHidden, setShowHidden] = React.useState(false);
				const [tagFilter, setTagFilter] = React.useState([]);
				const [tagEditorUrl, setTagEditorUrl] = React.useState("");
				const [tagDraft, setTagDraft] = React.useState("");
				const [uploadBusy, setUploadBusy] = React.useState(false);
				const [uploadNote, setUploadNote] = React.useState("");
				// ---- v0.5.2: wallpaper list loading / retry state ----
				// "loading" until the first _wallpapers answer (or its silent retry);
				// "error" only after both attempts failed, with an inline retry button.
				const [listState, setListState] = React.useState("loading");
				const [listAttempt, setListAttempt] = React.useState(0);
				const applyWallpaperList = (list) => {
					if (list === null) return;
					setItems(list);
					setListState("ready");
				};
				// ---- library v2: explicit sort + recent-use order ----
				const [sortMode, setSortMode] = React.useState("name");
				const [recentUrls, setRecentUrls] = React.useState(() => readPanelRecent());
				const rememberWallpaper = (url) => {
					if (typeof url !== "string" || url === "") return;
					setRecentUrls((current) => {
						const next = [url, ...current.filter((entry) => entry !== url)].slice(0, 64);
						try {
							globalThis.localStorage?.setItem(PANEL_RECENT_KEY, JSON.stringify(next));
						} catch {
							// usage order is a convenience, never a requirement
						}
						return next;
					});
				};
				// Optional engine availability, fetched once: the WE tab tells the truth
				// about scene support instead of rendering a dead card.
				const [engine, setEngine] = React.useState(null);
				const [engineProbe, setEngineProbe] = React.useState(0);
				React.useEffect(() => {
					let alive = true;
					// The build query is a host/client handshake: a host started from an older
					// plugin build answers `stale: true`, which the panel surfaces as a
					// "restart DSH" hint instead of a bare network error on upload.
					void fetch(ASSET_BASE + "/_engines?build=" + encodeURIComponent(HOST_BUILD), { cache: "no-store" })
						.then((response) => (response.ok ? response.json() : null))
						.then((value) => {
							if (alive) setEngine(value ?? { webwallgl: false, adapter: false, sceneProjects: 0, stale: true });
						})
						.catch(() => {
							if (alive) setEngine({ webwallgl: false, adapter: false, sceneProjects: 0, stale: true });
						});
					return () => {
						alive = false;
					};
				}, [engineProbe]);
				const hostStale = engine !== null && engine.stale === true;
				// ---- ShaderToy-style GLSL editor ----
				const [shader, setShader] = React.useState(() => shaderController.read());
				const [shaderStatus, setShaderStatus] = React.useState("");
				const [audio, setAudio] = React.useState(() => audioController.read());
				const [audioNote, setAudioNote] = React.useState("");
				React.useEffect(() => audioController.subscribe((next) => setAudio(next)), []);
				const readSceneMedia = () => {
					if (typeof document === "undefined") return null;
					const scene = document.querySelector("[data-tl-scene]");
					if (scene === null) return null;
					const width = Number(scene.dataset.tlWidth) || 0;
					const height = Number(scene.dataset.tlHeight) || 0;
					const fps = Number(scene.dataset.tlFps) || 0;
					const jitter = Number(scene.dataset.tlJitter) || 0;
					return {
						width,
						height,
						fps,
						jitter,
						duration: Number(scene.dataset.tlDuration) || 0,
						kind: scene.dataset.tlMedia ?? "",
						state: scene.dataset.tlState ?? "",
						play: scene.dataset.tlPlay ?? "",
						reason: scene.dataset.tlReason ?? "",
					};
				};
				const [mediaInfo, setMediaInfo] = React.useState(() => readSceneMedia());
				React.useEffect(() => {
					if (typeof document === "undefined" || typeof MutationObserver !== "function") return;
					const scene = document.querySelector("[data-tl-scene]");
					if (scene === null) return;
					// FPS/jitter mutate every second. Coalesce them so the panel does not
					// re-render (and re-wrap its quality line) on every video frame tick.
					let syncTimer = 0;
					let lastSync = 0;
					const sync = () => {
						if (syncTimer !== 0) return;
						const wait = Math.max(0, 1800 - (performance.now() - lastSync));
						syncTimer = globalThis.setTimeout(() => {
							syncTimer = 0;
							lastSync = performance.now();
							setMediaInfo(readSceneMedia());
						}, wait);
					};
					sync();
					const observer = new MutationObserver(sync);
					observer.observe(scene, {
						attributes: true,
						attributeFilter: [
							"data-tl-media",
							"data-tl-width",
							"data-tl-height",
							"data-tl-duration",
							"data-tl-state",
							"data-tl-play",
							"data-tl-reason",
							"data-tl-fps",
							"data-tl-jitter",
						],
					});
					return () => {
						observer.disconnect();
						if (syncTimer !== 0) globalThis.clearTimeout(syncTimer);
					};
				}, []);
				// Live playback/lownpower state. The scene publishes; the panel renders the
				// exact reason a wallpaper is parked instead of guessing from a boolean.
				// FPS changes arrive here every second; only status/reason are rendered from
				// this state, so a pure frame-rate tick must not re-render the whole panel
				// (that was a visible layout shimmer while reading).
				const [playStatus, setPlayStatus] = React.useState(() => sceneStatusController.read());
				React.useEffect(
					() =>
						sceneStatusController.subscribe((next) =>
							setPlayStatus((current) =>
								current.status === next.status && current.reason === next.reason ? current : next,
							),
						),
					[],
				);
				const [powerState, setPowerState] = React.useState(() => {
					const controller = lowPowerController;
					return controller === null || typeof controller.state !== "function"
						? { mode: readLowPowerMode(), active: false, reason: "", detail: "", detailKey: "", detailParams: null }
						: controller.state();
				});
				React.useEffect(() => {
					const controller = lowPowerController;
					if (controller === null || typeof controller.subscribe !== "function") return undefined;
					return controller.subscribe((next) => setPowerState(next));
				}, []);
				// ---- video static-frame picker ----
				const [frames, setFrames] = React.useState([]);
				const [frameSource, setFrameSource] = React.useState("");
				const [frameStatus, setFrameStatus] = React.useState("");
				const [frameBusy, setFrameBusy] = React.useState(false);
				const [weDraft, setWeDraft] = React.useState("");
				const [weStatus, setWeStatus] = React.useState("");
				const [weLibraryNote, setWeLibraryNote] = React.useState("");
				/**
				 * v0.6.0: the Wallpaper Engine library is a DSH settings page owned by
				 * src/72-we-library.js. The panel only requests it: a cancelable
				 * CustomEvent on window; a listener that handles it calls preventDefault().
				 * Without a listener the panel shows the "Settings → Wallpaper" fallback.
				 */
				const openWallpaperLibrary = () => {
					let handled = false;
					try {
						const event = new CustomEvent("tianlight:open-wallpaper-library", {
							bubbles: true,
							cancelable: true,
							detail: { source: "wallpaper-panel", engineCount },
						});
						handled = globalThis.dispatchEvent(event) === false || event.defaultPrevented === true;
					} catch (error) {
						note("we-library:open", error);
					}
					setWeLibraryNote(handled ? t("lib.we.openRequested") : t("lib.we.openFallback"));
				};
				const openWe = () => {
					setWeOpen(true);
					setNote("");
					void (async () => {
						try {
							const response = await fetch(ASSET_BASE + "/_we-roots", { cache: "no-store" });
							if (!response.ok) throw new Error(String(response.status));
							const value = await response.json();
							setWeDraft(Array.isArray(value.roots) ? value.roots.join("\n") : "");
						} catch {
							setWeStatus(t("lib.we.readFailed"));
						}
					})();
				};
				const saveWe = () => {
					setWeStatus(t("lib.we.saving"));
					void (async () => {
						try {
							const roots = weDraft
								.split(/\r?\n/)
								.map((line) => line.trim())
								.filter((line) => line !== "");
							const response = await fetch(ASSET_BASE + "/_we-roots", {
								method: "POST",
								headers: { "content-type": "application/json" },
								body: JSON.stringify(roots),
							});
							if (!response.ok) throw new Error(String(response.status));
							const value = await response.json();
							const kept = Array.isArray(value.roots) ? value.roots.length : 0;
							const skipped = Number(value.skipped) || 0;
							setWeStatus(
								t("lib.we.savedPrefix") +
									kept +
									t("lib.we.savedDirs") +
									(skipped > 0 ? t("lib.punct.openParen") + skipped + t("lib.we.savedSkipped") : ""),
							);
							void listWallpapers().then(applyWallpaperList);
						} catch {
							setWeStatus(t("lib.we.saveFailed"));
						}
					})();
				};
				// ---- v0.5.2: list load with one silent retry ----
				// The panel used to show "全部 0 / 0 张" forever when the first _wallpapers
				// request lost a race with the host (or hit a transient error). Now the
				// summary/hint say "加载中…" during the attempt, one retry happens after
				// ~1.2s, and only a second failure surfaces the reason + inline retry.
				React.useEffect(() => {
					let alive = true;
					let retryTimer = 0;
					const load = (attempt) => {
						void listWallpapers().then((list) => {
							if (alive === false) return;
							if (list !== null) {
								setItems(list);
								setListState("ready");
								return;
							}
							if (attempt === 0) {
								setListState("loading");
								retryTimer = globalThis.setTimeout(() => {
									retryTimer = 0;
									if (alive) load(1);
								}, PANEL_LIST_RETRY_MS);
								return;
							}
							setListState("error");
						});
					};
					setListState("loading");
					load(0);
					return () => {
						alive = false;
						if (retryTimer !== 0) globalThis.clearTimeout(retryTimer);
					};
				}, [listAttempt]);
				const pick = (choice) => {
					if (wallpaperController !== null) wallpaperController.apply(choice);
					setActive(choice === null ? "" : choice.url);
					setActiveChoice(choice);
					// v0.5.0: an explicit pick feeds the "最近使用" sort. Automatic
					// rotation deliberately does not, so the order stays the user's.
					if (choice !== null) rememberWallpaper(choice.url);
				};
				/**
				 * v0.5.3: card click path. The ring is optimistic (state is set before the
				 * controller call, so the highlight lands in the same React batch), and a
				 * throwing controller reverts it and shows an inline error instead of
				 * silently swallowing the click.
				 */
				const pickCard = (choice, name) => {
					setPickError("");
					// A disabled wallpaper module leaves wallpaperController null: that is a
					// real failure the user must see, not a silent dead click.
					if (wallpaperController === null) {
						setPickError(t("lib.pick.noScene"));
						return;
					}
					const previousActive = active;
					const previousChoice = activeChoice;
					setActive(choice === null ? "" : choice.url);
					setActiveChoice(choice);
					try {
						wallpaperController.apply(choice);
						if (choice !== null) rememberWallpaper(choice.url);
						showToast(t("lib.pick.applied", { name }));
					} catch (error) {
						setActive(previousActive);
						setActiveChoice(previousChoice);
						setPickError(t("lib.pick.failed", { reason: String(error?.message ?? error) }));
					}
				};
				// ---- the only zone question that matters: separate or continuous ----
				const [zones, setZones] = React.useState(() => readZones());
				// Pan only has meaning when the crop is smaller than the frame; at 100%
				// there is nothing off-screen to move into view.
				const cropInfo = cropWindow(zones.main);
				const pannable = Number(cropInfo.w) < 1 || Number(cropInfo.h) < 1;
				const [glassLevel, setGlassLevel] = React.useState(() => readGlass());
				const [layers, setLayers] = React.useState(() => layerController.read());
				const [playback, setPlayback] = React.useState(() => playbackController.read());
				const updatePlayback = (patch) => {
					const next = playbackController.apply({ ...playback, ...patch });
					setPlayback(next);
				};
				const pauseWallpaper = () => {
					updatePlayback({ paused: true });
				};
				const resumeWallpaper = () => {
					updatePlayback({ paused: false });
				};
				const [layerSlot, setLayerSlot] = React.useState(0);
				const layerSlots = layers.slots;
				const selectedSlot = layerSlots[layerSlot];
				const layerSlotLabel = (slot) => {
					if (slot === undefined || slot.kind === "none") return t("lib.ctrl.off");
					if (slot.kind === "image") return slot.url === "" ? t("lib.slot.imageUnset") : t("lib.kind.image");
					return slot.preset === "none" ? t("lib.ctrl.off") : LAYER_LABELS[slot.preset] ?? t("lib.slot.preset");
				};
				const updateLayerSlot = (index, patch) => {
					const slots = layerSlots.map((slot, position) => (position === index ? { ...slot, ...patch } : slot));
					const next = layerController.apply({ version: 2, slots });
					setLayers(next);
				};
				const swapLayers = () => {
					const next = layerController.apply({ version: 2, slots: [layerSlots[1], layerSlots[0]] });
					setLayers(next);
				};
				const [powerMode, setPowerMode] = React.useState(() => readLowPowerMode());
				const [fpsMode, setFpsMode] = React.useState(() => renderTierController.read());
				// ---- automatic rotation ----
				const [rotation, setRotation] = React.useState(() => rotationController.read());
				React.useEffect(() => rotationController.subscribe((next) => setRotation(next)), []);
				React.useEffect(
					() =>
						rotationController.observe((choice) => {
							if (choice === null) return;
							// Rotation writes the same source the picker does; mirror it into the
							// panel so "当前壁纸" never lags behind the scene.
							setActive(choice.url);
							setActiveChoice(choice);
						}),
					[],
				);
				const updateRotation = (patch) => setRotation(rotationController.apply({ ...rotation, ...patch }));
				// ---- recipe v2 import / export ----
				const [presetText, setPresetText] = React.useState("");
				const [presetStatus, setPresetStatus] = React.useState("");
				const resolveThemeService = () => {
					try {
						return typeof ctx?.get === "function" ? ctx.get("theme") : undefined;
					} catch {
						return undefined;
					}
				};
				/**
				 * Recipe v2 = v1 fields + the v0.5.0 sections. effects/context/legibility
				 * are declared in fragments that run before this one; readTypography /
				 * applyTypography are function declarations in the later font fragment, so
				 * they are only referenced through TYPE OF guards evaluated at click time
				 * (never at module scope), and every optional section is try/caught.
				 */
				const buildShareRecipe = () => {
					const recipe = {
						format: "tianlight-recipe",
						version: 2,
						zones: readZones(),
						glass: readGlass(),
						lowPower: readLowPowerMode(),
						wallpaper: readWallpaperChoice(),
						shader: shaderController.read(),
						layers: layerController.read(),
						playback: playbackController.read(),
						rotation: rotationController.read(),
					};
					// v1/v2 compatibility: v2 writes the contract's lowercase spelling as an
					// alias while lowPower stays the canonical field the apply path reads.
					recipe.lowpower = recipe.lowPower;
					try {
						if (typeof effectsController !== "undefined" && effectsController !== null && typeof effectsController.read === "function") {
							recipe.effects = effectsController.read();
						}
					} catch {
						// an optional section must never block the rest of the recipe
					}
					try {
						if (typeof contextController !== "undefined" && contextController !== null && typeof contextController.read === "function") {
							recipe.context = contextController.read();
						}
					} catch {
						// optional
					}
					try {
						if (typeof legibilityController !== "undefined" && legibilityController !== null && typeof legibilityController.read === "function") {
							recipe.legibility = legibilityController.read();
						}
					} catch {
						// optional
					}
					try {
						if (typeof readTypography === "function") recipe.typography = readTypography();
					} catch {
						// optional
					}
					return recipe;
				};
				const exportPreset = () => {
					try {
						setPresetText(JSON.stringify(buildShareRecipe()));
						setPresetStatus(t("lib.recipeExported"));
					} catch {
						setPresetStatus(t("lib.recipeBadValue"));
					}
				};
				const applyPresetValue = (value) => {
					if (value === null || typeof value !== "object") return "lib.recipeBadValue";
					let shaderRejected = false;
					try {
						// Re-validated by the existing readers: a hand-edited preset cannot push
						// values the UI itself would never produce.
						if (value.zones !== undefined) {
							const clean = normalizeZones(value.zones);
							setZones(clean);
							if (zoneController !== null) zoneController.apply(clean);
						}
						if (typeof value.glass === "number") {
							const next = Math.min(1.5, Math.max(0.35, value.glass));
							setGlassLevel(next);
							if (glassController !== null) glassController.apply(next);
						}
						// v2 export writes lowPower; v1-style links or hand edits may write
						// lowpower, so both spellings are accepted and normalized here.
						const lowPowerValue =
							value.lowPower === "auto" || value.lowPower === "on" || value.lowPower === "off"
								? value.lowPower
								: value.lowpower === "auto" || value.lowpower === "on" || value.lowpower === "off"
									? value.lowpower
									: null;
						if (lowPowerValue !== null) {
							setPowerMode(lowPowerValue);
							if (lowPowerController !== null) lowPowerController.set(lowPowerValue);
						}
						if (value.layers !== null && typeof value.layers === "object") {
							const clean = layerController.apply(value.layers);
							setLayers(clean);
						}
						if (value.playback !== null && typeof value.playback === "object") {
							const clean = playbackController.apply(value.playback);
							setPlayback(clean);
						}
						if (value.rotation !== null && typeof value.rotation === "object") {
							const clean = rotationController.apply(value.rotation);
							setRotation(clean);
						}
						// A recipe is the only way a shared shader travels; compile it here so a
						// broken paste cannot poison the saved settings.
						if (value.shader !== null && typeof value.shader === "object" && typeof value.shader.source === "string") {
							const error = validateShaderSource(value.shader.source);
							if (error === null) {
								const next = {
									preset: typeof value.shader.preset === "string" ? value.shader.preset : "custom",
									source: value.shader.source,
									speed: clampNumber(value.shader.speed, 0.1, 3, SHADER_DEFAULTS.speed),
									intensity: clampNumber(value.shader.intensity, 0, 2, SHADER_DEFAULTS.intensity),
									hue: clampNumber(value.shader.hue, 0, 1, SHADER_DEFAULTS.hue),
								};
								shaderController.save(next);
								setShader(next);
							} else {
								shaderRejected = true;
							}
						}
						if (value.wallpaper !== undefined && value.wallpaper !== null) {
							const verdict = resolveWallpaperChoice(value.wallpaper);
							if (verdict.ok === true) {
								setActive(verdict.choice.url);
								setActiveChoice(verdict.choice);
								if (wallpaperController !== null) wallpaperController.apply(verdict.choice);
							}
						}
						// ---- v0.5.0 recipe sections ----
						// Only keys the owning controller declares are copied, and only when
						// the source value has the declared type: a hand-edited share link can
						// never push a nested object into a boolean/enum slot.
						const patchOf = (source, defaults) => {
							const patch = {};
							if (source === null || typeof source !== "object" || defaults === null || typeof defaults !== "object") return patch;
							for (const key of Object.keys(defaults)) {
								if (Object.prototype.hasOwnProperty.call(source, key) === false) continue;
								if (typeof source[key] !== typeof defaults[key]) continue;
								patch[key] = source[key];
							}
							return patch;
						};
						const applyControllerPatch = (controller, defaults, source) => {
							if (typeof controller === "undefined" || controller === null || typeof controller.apply !== "function") return;
							const patch = patchOf(source, typeof defaults === "undefined" ? null : defaults);
							if (Object.keys(patch).length > 0) controller.apply(patch);
						};
						if (typeof effectsController !== "undefined") {
							applyControllerPatch(
								effectsController,
								typeof EFFECTS_DEFAULTS === "undefined" ? null : EFFECTS_DEFAULTS,
								value.effects,
							);
						}
						if (typeof contextController !== "undefined") {
							applyControllerPatch(
								contextController,
								typeof CONTEXT_DEFAULTS === "undefined" ? null : CONTEXT_DEFAULTS,
								value.context,
							);
						}
						if (typeof legibilityController !== "undefined") {
							applyControllerPatch(
								legibilityController,
								typeof LEGIBILITY_DEFAULTS === "undefined" ? null : LEGIBILITY_DEFAULTS,
								value.legibility,
							);
						}
						if (typeof readTypography === "function" && typeof applyTypography === "function") {
							const typography = value.typography;
							if (typography !== null && typeof typography === "object") {
								// Merge only fields the typography model actually declares, with a
								// matching type: v0.5.0 added fields (content width, paragraph
								// spacing, code size, reading family) travel without this panel
								// knowing their names, and a hand-edited link cannot invent keys.
								const current = readTypography();
								const next = { ...current };
								for (const key of Object.keys(current)) {
									if (Object.prototype.hasOwnProperty.call(typography, key) === false) continue;
									if (typeof typography[key] !== typeof current[key]) continue;
									next[key] = typography[key];
								}
								// Size is the one field the host API accepts directly: clamp it here
								// so a shared recipe cannot push an out-of-range font size.
								if (Number.isFinite(next.size)) next.size = Math.min(22, Math.max(12, Math.round(next.size)));
								applyTypography(resolveThemeService(), next, true);
							}
						}
					} catch {
						return "lib.recipeBadApply";
					}
					return shaderRejected ? "lib.recipeAppliedShader" : "lib.recipeApplied";
				};
				const importPreset = () => {
					try {
						const value = JSON.parse(presetText);
						setPresetStatus(t(applyPresetValue(value)));
					} catch {
						setPresetStatus(t("lib.recipeBadText"));
					}
				};
				const applyCuratedPreset = (preset) => {
					setPresetText(JSON.stringify(preset.value));
					const status = applyPresetValue(preset.value);
					setPresetStatus(
						status === "lib.recipeApplied" ? t("lib.preset.applied", { name: t(preset.labelKey) }) : t(status),
					);
				};
				// ---- v0.5.0 D3: share link (#tl=<base64url recipe v2>) ----
				const [shareLink, setShareLink] = React.useState("");
				const [shareNote, setShareNote] = React.useState("");
				// v0.5.3: shareStatus stores the i18n KEY (not the rendered string), so a
				// language switch re-renders it; no empty-deps translation cache is left.
				const [shareStatus, setShareStatus] = React.useState(() =>
					props !== undefined && props.shareRejected === true ? "lib.shareInvalid" : "",
				);
				// A recipe parsed from the URL (install time or a later open) is a pending
				// PROPOSAL: it is displayed in a confirm strip and never applied until the
				// user clicks 应用. Invalid links are dropped by readTl5ShareHash without
				// touching settings.
				const [sharedRecipe, setSharedRecipe] = React.useState(() =>
					props !== undefined && props.sharedRecipe !== undefined && props.sharedRecipe !== null
						? props.sharedRecipe
						: null,
				);
				React.useEffect(() => {
					if (sharedRecipe !== null) return;
					const hash = String(globalThis.location?.hash ?? "");
					if (hash.startsWith("#tl=") === false) return;
					const next = readTl5ShareHash();
					if (next === null) {
						setShareStatus("lib.shareInvalid");
						return;
					}
					pendingShare = next;
					setSharedRecipe(next);
				}, []);
				const copyShareLink = () => {
					try {
						const payload = tl5Base64UrlEncode(JSON.stringify(buildShareRecipe()));
						const location = globalThis.location;
						const base =
							String(location?.origin ?? "") + String(location?.pathname ?? "") + String(location?.search ?? "");
						const link = base + "#tl=" + payload;
						setShareLink(link);
						setShareNote(payload.length > 6000 ? t("lib.shareLong") : "");
						const clipboard = globalThis.navigator?.clipboard;
						if (clipboard !== null && clipboard !== undefined && typeof clipboard.writeText === "function") {
							void clipboard.writeText(link).then(
								() => setShareNote(t("lib.shareCopied")),
								() => setShareNote(t("lib.shareFailed")),
							);
						} else {
							// No async clipboard here: the textarea below is the manual fallback.
							setShareNote(t("lib.shareFailed"));
						}
					} catch (error) {
						setShareNote(t("lib.shareBuildFail", { reason: String(error?.message ?? error) }));
					}
				};
				const clearSharedRecipe = () => {
					pendingShare = null;
					clearTl5ShareHash();
					setSharedRecipe(null);
				};
				const applySharedRecipe = () => {
					if (sharedRecipe === null) return;
					try {
						setPresetStatus(t(applyPresetValue(sharedRecipe.recipe)));
						setShareStatus("lib.shareApplied");
					} catch {
						setShareStatus("lib.shareInvalid");
					}
					clearSharedRecipe();
				};
				const ignoreSharedRecipe = () => {
					clearSharedRecipe();
					setShareStatus("lib.shareIgnored");
				};
				// ---- v0.5.0 D2: bundle export / import (gated on host capabilities) ----
				const [bundleBusy, setBundleBusy] = React.useState(false);
				const [bundleNote, setBundleNote] = React.useState("");
				const [importBusy, setImportBusy] = React.useState(false);
				const [importPct, setImportPct] = React.useState(0);
				const [importNote, setImportNote] = React.useState("");
				const hostCapabilities =
					engine !== null && typeof engine.capabilities === "object" && engine.capabilities !== null
						? engine.capabilities
						: null;
				const hostCapability = (name) => {
					if (hostCapabilities === null) return false;
					const direct = hostCapabilities[name];
					if (typeof direct === "boolean") return direct;
					if (direct !== undefined && direct !== null) return direct !== false;
					const routes = hostCapabilities.routes;
					if (Array.isArray(routes)) return routes.includes(name);
					if (routes !== null && typeof routes === "object") {
						const entry = routes[name];
						if (typeof entry === "boolean") return entry;
						if (typeof entry === "string") return true;
					}
					// A host that publishes a capabilities object is new enough for the
					// v0.5.0 routes; only an explicit false hides a control.
					return true;
				};
				const bundleSupported = hostCapability("bundle") === true;
				const importSupported = hostCapability("import") === true;
				const exportBundle = () => {
					if (bundleBusy) return;
					setBundleBusy(true);
					setBundleNote(t("lib.bundleExportBusy"));
					try {
						// The host streams the tar.gz straight to the browser: a plain anchor
						// download never buffers the archive in page memory.
						const link = document.createElement("a");
						link.href = ASSET_BASE + "/_bundle?build=" + encodeURIComponent(HOST_BUILD);
						link.download = "tianlight-bundle-" + new Date().toISOString().slice(0, 10) + ".tgz";
						link.rel = "noopener";
						document.body.appendChild(link);
						link.click();
						link.remove();
						setBundleNote(t("lib.bundleExportStarted"));
					} catch (error) {
						setBundleNote(t("lib.bundleExportFail", { reason: String(error?.message ?? error) }));
					}
					globalThis.setTimeout(() => setBundleBusy(false), 400);
				};
				const importBundle = (event) => {
					const input = event.currentTarget;
					const file = input.files !== null && input.files.length > 0 ? input.files[0] : null;
					// Clear immediately so picking the same file twice still fires onChange.
					input.value = "";
					if (file === null || importBusy) return;
					if (/\.(tgz|tar\.gz)$/i.test(file.name) === false && /gzip/.test(file.type) === false) {
						setImportNote(t("lib.bundleImportType"));
						return;
					}
					if (file.size > PANEL_BUNDLE_LIMIT) {
						setImportNote(t("lib.bundleImportSize", { mb: Math.round(PANEL_BUNDLE_LIMIT / (1024 * 1024)) }));
						return;
					}
					setImportBusy(true);
					setImportPct(0);
					setImportNote(t("lib.bundleImporting"));
					try {
						// XHR (not fetch) because the upload progress bar is the only honest
						// signal for a large archive; failures never clear existing config.
						// The host accepts gzip/octet-stream and rejects anything else with 415.
						const xhr = new XMLHttpRequest();
						xhr.open("POST", ASSET_BASE + "/_import");
						const mime = String(file.type || "");
						xhr.setRequestHeader("content-type", /gzip/.test(mime) || /octet-stream/.test(mime) ? mime : "application/gzip");
						xhr.upload.onprogress = (progress) => {
							if (progress.lengthComputable && progress.total > 0) {
								setImportPct(Math.round((progress.loaded / progress.total) * 100));
							}
						};
						xhr.onerror = () => {
							setImportBusy(false);
							setImportNote(t("lib.bundleImportFail", { reason: "network" }));
						};
						xhr.onload = () => {
							setImportBusy(false);
							let value = null;
							try {
								value = JSON.parse(xhr.responseText);
							} catch {
								value = null;
							}
							if (xhr.status < 200 || xhr.status >= 300) {
								// JSON errors carry a message; plain-text failures (405/413/415)
								// are short enough to show verbatim.
								const plain = typeof xhr.responseText === "string" ? xhr.responseText.trim().slice(0, 160) : "";
								const reason =
									value !== null && typeof value.error === "string"
										? value.error
										: plain !== ""
											? plain
											: "HTTP " + xhr.status;
								setImportNote(t("lib.bundleImportFail", { reason }));
								return;
							}
							const imported = value !== null && Array.isArray(value.imported) ? value.imported.length : 0;
							const skipped = value !== null && Array.isArray(value.skipped) ? value.skipped.length : 0;
							setImportNote(t("lib.bundleImportDone", { imported, skipped }) + " · " + t("lib.bundleImportSettings"));
							// The settings layer owns the merge; this event is a notification for
							// anyone listening, and the manifest refresh is what the panel needs.
							if (value !== null && value.settings !== null && typeof value.settings === "object") {
								try {
									globalThis.dispatchEvent(
										new CustomEvent("tianlight:settings", { detail: { settings: value.settings, source: "bundle" } }),
									);
								} catch {
									// a notification is best effort
								}
								// Pull the freshly merged host settings into the browser mirror now;
								// a missing settings layer just means "reload applies them" instead.
								try {
									if (typeof settingsStore !== "undefined" && settingsStore !== null) {
										if (typeof settingsStore.bootstrap === "function") void settingsStore.bootstrap();
										else if (typeof settingsStore.forceSync === "function") void settingsStore.forceSync();
									}
								} catch {
									// the import already succeeded on the host
								}
							}
							void listWallpapers().then(applyWallpaperList);
							setEngineProbe((current) => current + 1);
						};
						xhr.send(file);
					} catch (error) {
						setImportBusy(false);
						setImportNote(t("lib.bundleImportFail", { reason: String(error?.message ?? error) }));
					}
				};
				const applyDraft = async () => {
					const url = draft.trim();
					if (url === "") {
						setDraftNote(t("lib.url.empty"));
						return;
					}
					let parsed = null;
					try {
						parsed = new URL(url);
					} catch {
						parsed = null;
					}
					if (parsed === null || (parsed.protocol !== "http:" && parsed.protocol !== "https:")) {
						setDraftNote(t("lib.url.scheme"));
						return;
					}
					if (globalThis.location?.protocol === "https:" && parsed.protocol === "http:") {
						setDraftNote(t("lib.url.httpsBlocked"));
						return;
					}
					setDraftBusy(true);
					setDraftNote(t("lib.url.checking"));
					// Extension first; when the link is signed/extensionless, probe the media
					// itself instead of defaulting every unknown URL to "video" (which made
					// ordinary image CDN links fail).
					const clean = url.split(/[?#]/)[0];
					let kind = draftKind === "image" ? "image" : draftKind === "video" ? "video" : null;
					if (kind === null && /\.(png|jpe?g|webp|avif|gif|svg)$/i.test(clean)) kind = "image";
					else if (kind === null && /\.(mp4|webm|mov|m4v)$/i.test(clean)) kind = "video";
					else if (kind === null) kind = await probeUrlKind(url);
					if (kind === null) {
						setDraftBusy(false);
						setDraftNote(t("lib.url.notMedia"));
						return;
					}
					setComposer("url");
					setNote("");
					pick({ kind, url });
					setDraftBusy(false);
					setDraftNote(t("lib.url.applied") + (kind === "image" ? t("lib.kind.image") : t("lib.kind.video")) + " · " + (parsed.hostname || t("lib.url.remoteHost")));
				};
				const applyShader = () => {
					const error = validateShaderSource(shader.source);
					if (error !== null) {
						setShaderStatus(t("lib.shader.compileFailed") + error);
						return;
					}
					shaderController.save(shader);
					setShaderStatus(t("lib.shader.applied"));
					pick({ kind: "shader", url: "shader://live" });
				};
				const resetShader = () => {
					setShader({ ...SHADER_DEFAULTS });
					setShaderStatus(t("lib.shader.reset"));
				};
				const toggleAudio = async () => {
					if (audio.active) {
						audioController.stop(t("lib.audio.stopped"));
						setAudioNote("");
						return;
					}
					setAudioNote(t("lib.audio.requesting"));
					const result = await audioController.start();
					setAudioNote(result.ok === true ? "" : result.reason ?? t("lib.audio.failed"));
				};
				const useAudioPreset = () => {
					const preset = SHADER_PRESETS.find((entry) => entry.id === "audio");
					if (preset === undefined) return;
					setShader((current) => ({ ...current, preset: preset.id, source: preset.source }));
					setShaderStatus(t("lib.shader.audioPreset"));
				};
				// ---- video still-frame picker ----
				const requestFrames = () => {
					if (activeChoice === null || activeChoice.kind !== "video") return;
					const url = activeChoice.url;
					setFrameBusy(true);
					setFrameStatus(t("lib.frame.sampling"));
					void sampleVideoFrames(url, 6).then((result) => {
						setFrameBusy(false);
						if (result.ok === true) {
							setFrames(result.frames);
							setFrameSource(url);
							setFrameStatus(t("lib.frame.pickHint"));
						} else {
							setFrames([]);
							setFrameSource("");
							setFrameStatus(result.reason);
						}
					});
				};
				const applyFrame = (time) => {
					if (activeChoice === null || activeChoice.kind !== "video") return;
					pick({ kind: "video", url: activeChoice.url, still: time });
					setFrameStatus(t("lib.frame.pinned") + Number(time).toFixed(1) + "s");
				};
				const resumeVideo = () => {
					if (activeChoice === null || activeChoice.kind !== "video") return;
					pick({ kind: "video", url: activeChoice.url });
					setFrameStatus(t("lib.frame.resumed"));
				};
				// ---- library helpers: one read path, one write path ----
				const metaOf = (item) => library.items[item.url] ?? { favorite: false, tags: [], hidden: false };
				const nameOf = (item) =>
					item.id.replace(/^ext:\d+:/, "").replace(/^web:\d+:/, "").replace(/^uploads\//, "").replace(/^scene:\d+:/, "");
				// Kind is searchable and sortable in v2: "视频" matches every video even
				// when the file name is a hash, which is what a wall paper library needs.
				const kindLabelOf = (item) =>
					item.kind === "video"
						? t("lib.kind.video")
						: item.kind === "scene"
							? t("lib.kind.scene")
							: item.kind === "shader"
								? t("lib.kind.shader")
								: item.kind === "web"
									? t("lib.kind.web")
									: t("lib.kind.image");
				const kindRank = (item) => (item.kind === "image" ? 0 : item.kind === "video" ? 1 : item.kind === "scene" ? 2 : 3);
				// ---- v0.6.0: auto-detected Wallpaper Engine library items ----
				// host-core appends WE items to /_wallpapers; they are identified by
				// source:"we"/weId and must need no folder configuration at all.
				const isEngineItem = (item) =>
					item !== null &&
					typeof item === "object" &&
					(item.source === "we" || typeof item.weId === "string" || (typeof item.id === "string" && item.id.startsWith("we:")));
				const isLegacyWeItem = (item) =>
					isEngineItem(item) === false &&
					(item.url.includes("/ext/") === true || item.kind === "scene" || item.kind === "web");
				const engineSourceOf = (item) => {
					const raw = String(item.weSource ?? "").toLowerCase();
					if (raw === "steam" || raw === "workshop") return "steam";
					if (raw === "project" || raw === "local" || raw === "mine") return "project";
					// Tolerate a host that only distinguishes the roots via the item path/id.
					const sourceField = String(item.source ?? "").toLowerCase();
					if (sourceField === "steam" || sourceField === "workshop") return "steam";
					if (sourceField === "project" || sourceField === "local" || sourceField === "mine") return "project";
					const label = [item.weId, item.id, item.path, item.url]
						.filter((entry) => typeof entry === "string")
						.join(" ");
					return /steam|workshop|431960|steamapps/i.test(label) ? "steam" : "project";
				};
				const engineTypeOf = (item) => {
					const type = String(item.weType ?? "").toLowerCase();
					return type === "video" || type === "scene" || type === "web" || type === "image" ? type : "";
				};
				const engineLabelOf = (item) => {
					const type = engineTypeOf(item);
					if (type === "video") return t("lib.kind.video");
					if (type === "scene") return t("lib.kind.scene");
					if (type === "web") return t("lib.kind.web");
					if (type === "image") return t("lib.kind.image");
					return t("lib.source.engine");
				};
				const badgeOf = (item) =>
					isEngineItem(item)
						? engineLabelOf(item)
						: item.kind === "video"
							? t("lib.kind.video")
							: item.kind === "scene"
								? t("lib.card.scene")
								: item.kind === "web"
									? t("lib.card.web")
									: t("lib.kind.image");
				// All thumbnails prefer the host preview; a WE video preview must never be
				// replaced by the media URL (that would download the whole wallpaper).
				const previewOf = (item) => (typeof item.preview === "string" ? item.preview : "");
				const displayNameOf = (item) =>
					(isEngineItem(item) || item.kind === "scene" || item.kind === "web") &&
					typeof item.title === "string" &&
					item.title !== ""
						? item.title
						: nameOf(item);
				const updateMeta = (url, patch) => {
					const current = library.items[url] ?? { favorite: false, tags: [], hidden: false };
					const next = { ...current, ...patch };
					const nextItems = { ...library.items };
					if (next.favorite === false && next.tags.length === 0 && next.hidden !== true) delete nextItems[url];
					else nextItems[url] = next;
					const model = { items: nextItems };
					wallpaperLibraryController.write(model);
					setLibrary(model);
				};
				const formatBytes = (bytes) => {
					if (!Number.isFinite(bytes) || bytes <= 0) return "";
					const mb = bytes / (1024 * 1024);
					if (mb >= 1024) return (mb / 1024).toFixed(1) + "GB";
					return mb >= 1 ? mb.toFixed(1) + "MB" : Math.max(1, Math.round(bytes / 1024)) + "KB";
				};
				const uploadLimit =
					engine !== null && engine.upload !== undefined && Number.isFinite(engine.upload.max) ? engine.upload.max : UPLOAD_LIMIT;
				const uploadLimitMb = Math.round(uploadLimit / (1024 * 1024));
				const uploadWallpaper = (event) => {
					const input = event.currentTarget;
					const file = input.files !== null && input.files.length > 0 ? input.files[0] : null;
					// Clear immediately: picking the same file twice must still fire onChange.
					input.value = "";
					if (file === null) return;
					if (hostStale) {
						setUploadNote(t("lib.upload.hostStale"));
						return;
					}
					if (engine !== null && engine.upload !== undefined && engine.upload.writable === false) {
						setUploadNote(t("lib.upload.notWritable"));
						return;
					}
					if (file.size > uploadLimit) {
						setUploadNote(t("lib.upload.tooBigPrefix") + uploadLimitMb + t("lib.upload.tooBigSuffix"));
						return;
					}
					if (/\.(mp4|m4v|mov|webm|png|jpe?g|webp|avif|gif|svg)$/i.test(file.name) === false) {
						setUploadNote(t("lib.upload.types"));
						return;
					}
					setUploadBusy(true);
					setUploadNote(t("lib.upload.busy"));
					void (async () => {
						try {
							const response = await fetch(ASSET_BASE + "/_upload?name=" + encodeURIComponent(file.name), {
								method: "POST",
								headers: { "content-type": file.type || "application/octet-stream" },
								body: file,
							});
							const value = await response.json().catch(() => null);
							if (!response.ok) throw new Error(value?.error ?? String(response.status));
							setUploadNote(t("lib.upload.done") + String(value?.item?.id ?? file.name).replace(/^uploads\//, ""));
							applyWallpaperList(await listWallpapers());
						} catch (error) {
							setUploadNote(t("lib.upload.failed") + String(error?.message ?? error));
						} finally {
							setUploadBusy(false);
						}
					})();
				};
				const allTags = [
					...new Set(Object.values(library.items).flatMap((entry) => entry.tags ?? [])),
				].sort((left, right) => left.localeCompare(right));
				// A selected tag can outlive the last item that carried it (removed while the
				// filter is on); keep it in the row so it can still be switched off.
				const tagChoices = [...new Set([...allTags, ...tagFilter])].sort((left, right) => left.localeCompare(right));
				const filtersActive = query.trim() !== "" || favoritesOnly || tagFilter.length > 0;
				const hiddenCount = items.filter((item) => metaOf(item).hidden === true).length;
				const favoriteCount = items.filter((item) => metaOf(item).favorite === true).length;
				// v0.6.0 source tabs: all | local (our own assets/uploads) | we (legacy
				// WE folders from v0.5) | engine (auto-detected Wallpaper Engine library).
				const matchesSourceTab = (item) => {
					if (sourceTab === "all") return true;
					if (sourceTab === "we") return isLegacyWeItem(item);
					if (sourceTab === "engine") return isEngineItem(item);
					return isLegacyWeItem(item) === false && isEngineItem(item) === false;
				};
				const allCount = items.length;
				const visibleItems = items
					.filter(matchesSourceTab)
					.filter((item) => showHidden || metaOf(item).hidden !== true)
					.filter((item) => favoritesOnly === false || metaOf(item).favorite)
					// v2 facet semantics: multiple selected tags narrow the list (AND), so
					// "夜景 + 4K" finds the intersection instead of the union.
					.filter((item) => tagFilter.length === 0 || tagFilter.every((tag) => metaOf(item).tags.includes(tag)))
					.filter((item) => {
						const needle = query.trim().toLowerCase();
						if (needle === "") return true;
						// v0.6.0: WE items are searchable by their library title and weType
						// (video/scene/web/image) on top of the normal name/kind/tag haystack.
						return (
							displayNameOf(item) +
							" " +
							nameOf(item) +
							" " +
							kindLabelOf(item) +
							" " +
							(isEngineItem(item) ? engineLabelOf(item) + " " : "") +
							String(item.title ?? "") +
							" " +
							String(item.weType ?? "") +
							" " +
							item.kind +
							" " +
							item.id +
							" #" +
							metaOf(item).tags.join(" #")
						)
							.toLowerCase()
							.includes(needle);
					})
					.map((item) => ({ item, meta: metaOf(item) }));
				// v0.5.0 D1: sort is a pure view concern — the ② summary keeps reporting
				// "filtered / all" counts and the order is stable for every mode.
				const sortLibraryItems = (list) => {
					const copy = [...list];
					const byName = (left, right) =>
						displayNameOf(left.item).localeCompare(displayNameOf(right.item), "zh") || left.item.id.localeCompare(right.item.id);
					if (sortMode === "kind") {
						copy.sort((left, right) => kindRank(left.item) - kindRank(right.item) || byName(left, right));
					} else if (sortMode === "recent") {
						const rank = (entry) => {
							const index = recentUrls.indexOf(entry.item.url);
							return index < 0 ? Number.MAX_SAFE_INTEGER : index;
						};
						copy.sort((left, right) => rank(left) - rank(right) || byName(left, right));
					} else if (sortMode === "favorites") {
						copy.sort(
							(left, right) =>
								Number(right.meta.favorite === true) - Number(left.meta.favorite === true) || byName(left, right),
						);
					} else {
						copy.sort(byName);
					}
					return copy;
				};
				const sortedItems = sortLibraryItems(visibleItems);
				const editingItem = tagEditorUrl === "" ? null : items.find((item) => item.url === tagEditorUrl) ?? null;
				const editingMeta = editingItem === null ? { favorite: false, tags: [] } : metaOf(editingItem);
				const addTag = () => {
					if (editingItem === null) return;
					const tag = tagDraft.trim().slice(0, LIBRARY_TAG_LENGTH);
					if (tag === "" || editingMeta.tags.includes(tag)) {
						setTagDraft("");
						return;
					}
					updateMeta(editingItem.url, { tags: [...editingMeta.tags, tag].slice(0, LIBRARY_TAG_MAX) });
					setTagDraft("");
				};
				const removeTag = (tag) => {
					if (editingItem === null) return;
					updateMeta(editingItem.url, { tags: editingMeta.tags.filter((entry) => entry !== tag) });
				};
				// Plain-language orientation: what is showing now, and one sentence telling
				// the active source what to do next.
				const engineItems = items.filter(isEngineItem);
				const engineCount = engineItems.length;
				const engineSteamCount = engineItems.filter((item) => engineSourceOf(item) === "steam").length;
				const engineProjectCount = engineCount - engineSteamCount;
				const localCount = items.filter((item) => isLegacyWeItem(item) === false && isEngineItem(item) === false).length;
				const weCount = items.filter(isLegacyWeItem).length;
				const sceneCount = items.filter((item) => item.kind === "scene").length;
				const currentTitle = (() => {
					if (activeChoice === null) return t("lib.current.auto");
					const activeItem = items.find((entry) => entry.url === activeChoice.url) ?? null;
					if (activeItem !== null && isEngineItem(activeItem)) {
						return t("lib.source.engine") + " · " + displayNameOf(activeItem);
					}
					if (activeChoice.kind === "scene" || activeChoice.kind === "web") {
						const item = activeItem;
						const prefix = activeChoice.kind === "web" ? t("lib.current.webPrefix") : t("lib.current.scenePrefix");
						return prefix + (item !== undefined && item.title !== undefined ? item.title : activeChoice.url.slice(activeChoice.url.lastIndexOf("/") + 1));
					}
					if (activeChoice.kind === "shader") {
						const preset = SHADER_PRESETS.find((entry) => entry.id === shader.preset);
						return "ShaderToy · " + (preset === undefined ? t("lib.current.customShader") : preset.label);
					}
					const file = activeChoice.url.slice(activeChoice.url.lastIndexOf("/") + 1) || t("lib.current.unnamed");
					const kind = activeChoice.kind === "image" ? t("lib.kind.image") : activeChoice.still !== undefined ? t("lib.current.videoStill") : t("lib.kind.video");
					return kind + " · " + file;
				})();
				const screenWidth = Math.round((globalThis.innerWidth || 0) * (globalThis.devicePixelRatio || 1));
				const screenHeight = Math.round((globalThis.innerHeight || 0) * (globalThis.devicePixelRatio || 1));
				const croppedWidth = Math.round((mediaInfo === null ? 0 : mediaInfo.width) * Number(cropInfo.w));
				const croppedHeight = Math.round((mediaInfo === null ? 0 : mediaInfo.height) * Number(cropInfo.h));
				let qualityNote = "";
				if (mediaInfo !== null && mediaInfo.state === "error") {
					qualityNote = t("lib.quality.loadFailed");
				} else if (mediaInfo !== null && mediaInfo.kind === "scene") {
					qualityNote =
						t("lib.quality.scene") +
						(mediaInfo.fps > 0 ? t("lib.quality.measured") + mediaInfo.fps + "fps" : "") +
						(engine !== null && engine.webwallgl === false ? t("lib.quality.engineNotReady") : "");
				} else if (mediaInfo !== null && mediaInfo.kind === "shader") {
					qualityNote = t("lib.quality.shader");
				} else if (mediaInfo !== null && mediaInfo.kind === "web") {
					// A WE web project runs in 30-wallpaper's sandboxed iframe; this line only
					// reports it (the panel must never mount the iframe itself).
					qualityNote = t("lib.quality.web");
				} else if (mediaInfo !== null && mediaInfo.width > 0 && mediaInfo.height > 0) {
					qualityNote =
						t("lib.quality.source") +
						mediaInfo.width +
						"×" +
						mediaInfo.height +
						t("lib.quality.crop") +
						croppedWidth +
						"×" +
						croppedHeight +
						"px";
					const upscaled =
						zones.main.fit === "contain"
							? screenWidth > 0 && croppedWidth + 1 < screenWidth && croppedHeight + 1 < screenHeight
							: screenWidth > 0 && (croppedWidth + 1 < screenWidth || croppedHeight + 1 < screenHeight);
					qualityNote += upscaled ? t("lib.quality.upscaled") : t("lib.quality.native");
					if (mediaInfo.fps > 0) {
						qualityNote += t("lib.quality.measured") + mediaInfo.fps + "fps" + (mediaInfo.fps < 50 ? t("lib.quality.low") : "");
					}
					if (mediaInfo.width >= 7680 || mediaInfo.height >= 4320) qualityNote += t("lib.quality.eightK");
					if (mediaInfo.duration > 0) {
						const minutes = Math.floor(mediaInfo.duration / 60);
						const seconds = String(mediaInfo.duration % 60).padStart(2, "0");
						qualityNote += t("lib.quality.duration") + minutes + ":" + seconds;
					}
				}
				const lowPowerActive = powerState.active === true;
				const hasStaticFrame = activeChoice !== null && activeChoice.kind === "video" && activeChoice.still !== undefined;
				const isVideoWallpaper =
					activeChoice !== null ? activeChoice.kind === "video" : mediaInfo !== null && mediaInfo.kind === "video";
				const isShaderWallpaper =
					activeChoice !== null ? activeChoice.kind === "shader" : mediaInfo !== null && mediaInfo.kind === "shader";
				const isImageWallpaper =
					activeChoice !== null ? activeChoice.kind === "image" : mediaInfo !== null && mediaInfo.kind === "image";
				const isSceneWallpaper =
					activeChoice !== null ? activeChoice.kind === "scene" : mediaInfo !== null && mediaInfo.kind === "scene";
				const isWebWallpaper =
					activeChoice !== null ? activeChoice.kind === "web" : mediaInfo !== null && mediaInfo.kind === "web";
				// One vocabulary for "is the wallpaper actually moving", fed by the scene
				// bus rather than inferred from a paused DOM element.
				const playState = playStatus.status || (mediaInfo === null ? "" : mediaInfo.play);
				const playReason = playStatus.reason || (mediaInfo === null ? "" : mediaInfo.reason);
				const sceneBroken = playState === "error";
				const isBlocked = playState === "blocked";
				const isStalled = playState === "stalled";
				const isBuffering = playState === "loading" || playState === "buffering";
				const isMoving = playState === "playing";
				const isPaused = playState === "paused" || playState === "hidden" || playState === "ready";
				const lowPowerReasonLabel =
					powerState.reason === "reduced-motion"
						? t("lib.power.reducedMotion")
						: powerState.reason === "save-data"
							? t("lib.power.saveData")
							: powerState.reason === "battery"
								? // v0.5.2: 55-lowpower now hands back a language-neutral detail
									// ("15%") plus detailKey/detailParams, so the full sentence is
									// localized at render time (switching language re-renders it).
									typeof powerState.detailKey === "string" && powerState.detailKey !== ""
									? t(powerState.detailKey, powerState.detailParams ?? {})
									: powerState.detail || t("lib.power.battery")
								: powerState.reason === "manual"
									? t("lib.power.manual")
									: "";
				const statusLabel = lowPowerActive
					? t("lib.status.lowPower")
					: hasStaticFrame
						? t("lib.status.still")
						: isBlocked
							? t("lib.status.blocked")
							: isStalled
								? t("lib.status.stalled")
								: sceneBroken
									? t("lib.status.failed")
									: isImageWallpaper
										? t("lib.status.image")
										: isBuffering
											? t("lib.status.loading")
											: isMoving
												? isSceneWallpaper
													? t("lib.status.scene")
													: isShaderWallpaper
														? t("lib.status.shader")
														: isWebWallpaper
															? t("lib.status.web")
															: t("lib.status.playing")
												: playState === "idle"
													? t("lib.status.idle")
													: isPaused
														? t("lib.status.paused")
														: t("lib.status.ready");
				const statusTone = lowPowerActive || hasStaticFrame
					? "warn"
					: isBlocked || isStalled || sceneBroken
						? "alert"
						: isMoving
							? "live"
							: "idle";
				const statusHint = lowPowerActive
					? t("lib.hint.lowPowerPauseOpen") + (lowPowerReasonLabel || t("lib.power.mode")) + t("lib.hint.lowPowerPauseClose")
					: hasStaticFrame
						? t("lib.hint.still")
						: isBlocked
							? t("lib.hint.blocked")
							: isStalled
								? t("lib.hint.stalled")
								: sceneBroken
									? t("lib.hint.decodeFailedOpen") + (playReason || t("lib.common.unknownReason")) + t("lib.hint.decodeFailedClose")
									: playState === "idle"
										? t("lib.hint.idle")
										: isBuffering
										? t("lib.hint.buffering")
										: isMoving
											? isSceneWallpaper
												? t("lib.hint.scene")
												: isShaderWallpaper
													? t("lib.hint.shader")
													: isWebWallpaper
														? t("lib.hint.web")
														: t("lib.hint.videoPlaying")
											: isPaused
												? t("lib.hint.paused")
												: t("lib.hint.ready");
				const showPlaybackAction = isVideoWallpaper || isShaderWallpaper || isSceneWallpaper || isWebWallpaper;
				const actionLabel = lowPowerActive
					? t("lib.action.lowPowerPlay")
					: hasStaticFrame
						? t("lib.action.backToMotion")
						: isBlocked
							? t("lib.action.play")
							: isStalled || sceneBroken
								? t("lib.action.retry")
								: isMoving
									? t("lib.action.pause")
									: t("lib.action.resume");
				const playWallpaper = () => {
					if (lowPowerActive) {
						setPowerMode("off");
						if (lowPowerController !== null) lowPowerController.set("off");
					}
					if (hasStaticFrame) {
						updatePlayback({ paused: false });
						resumeVideo();
						return;
					}
					if (isMoving) {
						pauseWallpaper();
						return;
					}
					if (isStalled || sceneBroken) {
						// Reload the current source without changing the saved choice.
						if (wallpaperController !== null) wallpaperController.reload();
						else pick(activeChoice);
						return;
					}
					// Persisted resume: the controller applies it to the scene, so a reload
					// keeps the same intent instead of silently starting to play again.
					resumeWallpaper();
				};
				const qualityExtra = (() => {
					if (mediaInfo === null) return "";
					if (mediaInfo.jitter > 0 && mediaInfo.fps > 0) {
						return t("lib.quality.jitter") + mediaInfo.jitter + "ms" + (mediaInfo.jitter > 90 ? t("lib.quality.high") : "");
					}
					return "";
				})();
				const readyListHint =
					composer === "url"
						? t("lib.listHint.url")
						: composer === "shader"
							? t("lib.listHint.shader")
							: sourceTab === "engine"
								? t("lib.listHint.engine", { n: engineCount })
								: sourceTab === "we"
								? t("lib.listHint.weOpen") +
									weCount +
									t("lib.unit.items") +
									(sceneCount > 0 ? t("lib.listHint.weSceneOpen") + sceneCount + t("lib.punct.closeParen") : "") +
									t("lib.listHint.weClose")
								: sourceTab === "local"
									? t("lib.listHint.local") + localCount + t("lib.listHint.localSuffix")
									: t("lib.listHint.all") +
										allCount +
										t("lib.listHint.allMiddle") +
										localCount +
										" / WE " +
										weCount +
										t("lib.listHint.allSuffix");
				// v0.5.2 loading/retry gates the ② copy: the v0.5.1 strings below are only
				// used once the list state is "ready".
				const listErrorText = hostStale ? t("lib.list.errHostStale") : t("lib.list.errNetwork");
				const listHint =
					listState === "loading"
						? t("lib.list.loadingHint")
						: listState === "error"
							? listErrorText
							: readyListHint;
				const sourceValue =
					composer === "url"
						? t("lib.source.url")
						: composer === "shader"
							? "ShaderToy"
							: sourceTab === "engine"
								? t("lib.source.engine")
								: sourceTab === "we"
									? "Wallpaper Engine"
									: sourceTab === "local"
										? t("lib.source.local")
										: t("lib.source.all");
				const readyListValue =
					composer === "url"
						? t("lib.listValue.pasteUrl")
						: composer === "shader"
							? "GLSL"
							: sourceTab === "all" && filtersActive === false
								? allCount + t("lib.unit.items")
								: // A filtered list states both numbers: "0 / 3 张" is honest about
									// an empty WE filter, while a bare "0 张" next to chips reading
									// "全部 3" looked like the library had lost its wallpapers.
									visibleItems.length + " / " + allCount + t("lib.unit.items");
				const listValue =
					listState === "loading"
						? t("lib.list.loading")
						: listState === "error"
							? t("lib.list.failed")
							: readyListValue;
				const framingValue = zones.main.zoom + "% · " + (zones.main.ratio === "auto" ? t("lib.ctrl.auto") : zones.main.ratio);
				const activeLayerLabels = layerSlots
					.filter((slot) =>
						slot.kind === "preset"
							? slot.preset !== "none"
							: slot.kind === "image"
								? slot.url !== ""
								: false,
					)
					.map((slot) => layerSlotLabel(slot));
				const appearanceValue =
					t("lib.appearance.glassPrefix") +
					Math.round(glassLevel * 100) +
					"%" +
					(activeLayerLabels.length === 0 ? "" : " · " + activeLayerLabels.join(" + "));
				const performanceValue =
					(powerMode === "auto" ? t("lib.perf.powerAuto") : powerMode === "on" ? t("lib.perf.powerOn") : t("lib.perf.powerOff")) +
					" · " +
					(fpsMode === "auto" ? "30fps" : fpsMode + "fps") +
					(rotation.on ? t("lib.perf.rotationOn") : "");
				const groupSummary = (step, title, value) =>
					React.createElement(
						"summary",
						{ className: "tl-wall-group-summary" },
						React.createElement("span", { className: "tl-wall-step" }, step),
						React.createElement("span", { className: "tl-wall-group-title" }, title),
						React.createElement("span", { className: "tl-wall-summary-value" }, value),
					);
				return React.createElement(
					"div",
					{ className: "tl-wall-inner", "data-tl-view": view },
					React.createElement("div", { className: "tl-wall-glow", "data-tl-wall-glow": "" }),
					React.createElement(
						"div",
						{ className: "tl-wall-sticky", "data-tl-wall-drag": "" },
						React.createElement(
							"div",
							{ className: "tl-wall-head" },
							React.createElement("div", { className: "tl-font-title" }, t("lib.panel.title")),
							view === "pick"
								? React.createElement(
										"button",
										{
											type: "button",
											className: "tl-font-option tl-wall-more-settings",
											"data-tl-more-settings": "",
											onClick: () => setView("advanced"),
										},
										t("lib.pick.more"),
									)
								: null,
							React.createElement(
								"div",
								{ className: "tl-wall-view-switch" },
								[
									["pick", t("lib.view.pick")],
									["advanced", t("lib.view.advanced")],
								].map(([value, label]) =>
									React.createElement(
										"button",
										{
											key: value,
											type: "button",
											"data-active": view === value ? "" : undefined,
											onClick: () => {
												setView(value);
												setPickError("");
												// Simple view has no filter row; clear hidden filters so the list
												// cannot look mysteriously empty after leaving 高级.
												if (value === "pick") {
													setQuery("");
													setFavoritesOnly(false);
													setTagFilter([]);
													setShowHidden(false);
													setTagEditorUrl("");
													setComposer("none");
												}
											},
										},
										label,
									),
								),
							),
							React.createElement(
								"button",
								{
									type: "button",
									className: "tl-font-close",
									"aria-label": t("lib.panel.close"),
									onClick: () => {
										if (props !== undefined && typeof props.onClose === "function") props.onClose();
									},
								},
								"\u00d7",
							),
						),
						// v0.5.3 quick picker: one compact status line with an immediate
						// pause/resume; the full guide only belongs to the advanced view.
						view === "pick"
							? React.createElement(
									"div",
									{ className: "tl-wall-pick-status", "data-tl-pick-status": "" },
									React.createElement(
										"p",
										{ className: "tl-wall-status", "data-tone": statusTone, title: statusHint },
										React.createElement("span", { className: "tl-wall-status-dot", "aria-hidden": "true" }),
										statusLabel,
									),
									showPlaybackAction
										? React.createElement(
												"button",
												{ type: "button", className: "tl-font-option", "data-tone": statusTone, onClick: playWallpaper },
												actionLabel,
											)
										: null,
									pickError === "" ? null : React.createElement("p", { className: "tl-wall-pick-error", "data-tl-pick-error": "" }, pickError),
								)
							: null,
						React.createElement(
							"div",
							{ className: "tl-wall-guide" },
							view === "advanced"
								? React.createElement(
										"div",
										{ className: "tl-wall-tabs" },
										React.createElement(
											"button",
											{
												type: "button",
												className: "tl-font-option tl-wall-back-quick",
												"data-tl-back-quick": "",
												onClick: () => {
													setView("pick");
													setComposer("none");
													setPickError("");
												},
											},
											t("lib.pick.back"),
										),
									)
								: null,
							view === "advanced"
								? React.createElement(
										"p",
										{ className: "tl-wall-status", "data-tone": statusTone, title: statusHint },
										React.createElement("span", { className: "tl-wall-status-dot", "aria-hidden": "true" }),
										statusLabel,
									)
								: null,
							view === "advanced"
								? React.createElement(
										"p",
										{ className: "tl-wall-current", title: activeChoice === null ? undefined : activeChoice.url },
										t("lib.current.prefix") + currentTitle,
									)
								: null,
							// v0.5.0 D3: a #tl= recipe found in the URL is a PROPOSAL. This strip
							// is the only place that can turn it into settings (应用), and an
							// invalid link never reaches it at all.
							sharedRecipe === null
								? shareStatus === ""
									? null
									: React.createElement("p", { className: "tl-wall-v05-note" }, t(shareStatus))
								: React.createElement(
										"div",
										{ className: "tl-wall-share-strip", "data-tone": "accent" },
										React.createElement(
											"p",
											{ className: "tl-wall-share-strip-text" },
											t("lib.shareDetected", { n: sharedRecipe.count }),
										),
										React.createElement(
											"div",
											{ className: "tl-wall-share-strip-actions" },
											React.createElement(
												"button",
												{ type: "button", className: "tl-font-reset", onClick: applySharedRecipe },
												t("lib.shareApply"),
											),
											React.createElement(
												"button",
												{ type: "button", className: "tl-font-option", onClick: ignoreSharedRecipe },
												t("lib.shareIgnore"),
											),
										),
										React.createElement("p", { className: "tl-wall-hint" }, t("lib.shareHint")),
									),
							// The pick view is one library: all sources are already in the grid,
							// so the default action is simply "click a thumbnail". These chips
							// only filter it; URL/GLSL/WE config are secondary import actions.
							view === "pick"
								? React.createElement(
										React.Fragment,
										null,
										React.createElement(
											"div",
											{ className: "tl-wall-filter-row" },
											[
												["all", t("lib.source.all"), allCount],
												["local", t("lib.source.localShort"), localCount],
												["we", "WE", weCount],
												["engine", t("lib.source.engine"), engineCount],
											].map(([value, label, count]) =>
												React.createElement(
													"button",
													{
														key: value,
														type: "button",
														className: "tl-wall-filter-chip",
														"data-active": sourceTab === value && composer === "none" ? "" : undefined,
														onClick: () => {
															setSourceTab(value);
															setComposer("none");
															setNote("");
															const list = document.querySelector("[data-tl-wall-list]");
															if (list !== null) list.open = true;
															if (value === "we" && weCount === 0) openWe();
														},
													},
													// Counts are only meaningful once the list actually loaded:
													// during loading/error the chips stay label-only instead of
													// claiming "全部 0" (the v0.5.1 "0 张 forever" complaint).
													listState === "ready" ? label + " " + count : label,
												),
											),
										),
									)
								: null,
							// v0.5.3: the pick view is a wallpaper picker, not a file/URL
							// importer — URL / WE / GLSL import links only exist in 高级.
							view === "advanced"
								? React.createElement("p", { className: "tl-wall-hint" }, statusHint)
								: null,
							view === "advanced" && qualityNote + qualityExtra !== ""
								? React.createElement(
										"p",
										{ className: "tl-wall-hint tl-wall-quality", title: qualityNote + qualityExtra },
										qualityNote + qualityExtra,
									)
								: null,
							view === "advanced" && showPlaybackAction
								? React.createElement(
										"div",
										{ className: "tl-wall-tabs tl-wall-play-row" },
										React.createElement(
											"span",
											{ className: "tl-wall-label" },
											isMoving ? t("lib.label.playing") : isBlocked ? t("lib.label.unlock") : t("lib.label.play"),
										),
										React.createElement(
											"button",
											{ type: "button", className: "tl-font-option", "data-tone": statusTone, onClick: playWallpaper },
											actionLabel,
										),
									)
								: null,
						),
					),
					// ---- sources: which catalog the list below is drawn from ----
					React.createElement(
						"details",
						{ className: "tl-wall-group", open: false, "data-tl-group": "sources" },
						groupSummary("①", t("lib.group.sources"), sourceValue),
						React.createElement(
							"div",
							{ className: "tl-source-grid" },
							PROVIDERS.map((provider) =>
								React.createElement(
									"button",
									{
										key: provider.id,
										type: "button",
										className: "tl-source-card",
										// The clicked source owns the highlight, including URL, which
										// has no list of its own but is still a real choice.
										"data-active":
											provider.available &&
											(provider.id === "local"
												? sourceTab === "local" && composer === "none"
												: provider.id === "we"
													? sourceTab === "engine" && composer === "none"
													: composer === provider.id)
												? ""
												: undefined,
										"data-tl-disabled": provider.available ? undefined : "",
										title:
											provider.id === "we"
												? t("lib.we.autoDesc")
												: provider.available
													? provider.note
													: provider.label + t("lib.punct.colon") + provider.note,
										onClick: () => {
											if (provider.id === "we") {
												// v0.6.0: no folder browsing. The auto-detected library lives
												// in the DSH settings page; ask it to open and filter the grid.
												setSourceTab("engine");
												setComposer("none");
												openWallpaperLibrary();
												return;
											}
											if (provider.id === "local") {
												setSourceTab("local");
												setComposer("none");
												setNote("");
												return;
											}
											if (provider.id === "url") {
												setComposer("url");
												setNote("");
												return;
											}
											if (provider.id === "shader") {
												setComposer("shader");
												setNote("");
												return;
											}
											if (!provider.available) {
												// An unavailable source stays a note on the current tab; it must
												// not steal the selection from the source that is showing.
												setNote(provider.label + " · " + provider.note);
												globalThis.setTimeout(() => setNote(""), 6000);
												return;
											}
											setSourceTab(provider.id);
											setNote("");
										},
									},
									React.createElement("span", { className: "tl-source-name" }, provider.label),
									React.createElement(
										"span",
										{ className: "tl-source-note" },
										provider.id === "we" ? t("lib.we.autoDesc") : provider.desc,
									),
								),
							),
						),
						// v0.6.0: Wallpaper Engine is auto-detected from the app's library; the
						// folder-path editor is now only a collapsed edge-case fallback.
						React.createElement(
							"div",
							{ className: "tl-wall-tabs tl-we-auto", "data-tl-we-auto": "" },
							React.createElement(
								"span",
								{ className: "tl-wall-hint tl-we-auto-text", "data-tl-we-detected": "" },
								t("lib.we.detected", { n: engineCount, steam: engineSteamCount, project: engineProjectCount }),
							),
							React.createElement(
								"button",
								{
									type: "button",
									className: "tl-font-option tl-we-open-library",
									"data-tl-open-library": "",
									onClick: openWallpaperLibrary,
								},
								t("lib.we.openLibrary"),
							),
						),
						weLibraryNote === ""
							? null
							: React.createElement("p", { className: "tl-wall-hint", "data-tl-we-note": "" }, weLibraryNote),
						React.createElement(
							"details",
							{
								className: "tl-wall-group tl-we-manual",
								open: false,
								"data-tl-group": "we-manual",
								"data-tl-we-manual": "",
							},
							React.createElement(
								"summary",
								{
									className: "tl-wall-group-summary",
									onClick: () => {
										if (weOpen === false) openWe();
									},
								},
								React.createElement("span", { className: "tl-wall-group-title" }, t("lib.we.manual")),
							),
							weOpen
								? React.createElement(
										"div",
										{ className: "tl-we-manual-body" },
										React.createElement("p", { className: "tl-wall-hint" }, t("lib.we.hint")),
										React.createElement("textarea", {
											className: "tl-wall-textarea",
											rows: 3,
											placeholder: t("lib.we.placeholder"),
											value: weDraft,
											onChange: (event) => setWeDraft(event.target.value),
										}),
										React.createElement(
											"button",
											{ type: "button", className: "tl-font-reset", onClick: saveWe },
											t("lib.we.save"),
										),
										weStatus === "" ? null : React.createElement("p", { className: "tl-wall-hint" }, weStatus),
									)
								: React.createElement("p", { className: "tl-wall-hint" }, t("lib.we.manualHint")),
						),
						noteText === "" ? null : React.createElement("p", { className: "tl-wall-hint" }, noteText),
					),
					React.createElement(
						"details",
						{ className: "tl-wall-group", open: true, "data-tl-wall-list": "" },
						groupSummary("②", t("lib.group.list"), listValue),
						// v0.5.3: the pick view is a pure visual grid — long hints only in 高级.
						view === "advanced" ? React.createElement("p", { className: "tl-wall-hint" }, listHint) : null,
						// v0.5.2: only after the silent retry failed does the panel admit an
						// error; the ② hint carries the reason and this row adds the retry.
						listState === "error"
							? React.createElement(
									"div",
									{ className: "tl-wall-empty tl-wall-list-error" },
									// In the pick view the long hint is hidden, so the reason lives
									// inside the error row instead (no silent failure).
									view === "pick" ? React.createElement("p", { className: "tl-wall-hint" }, listErrorText) : null,
									React.createElement(
										"button",
										{
											type: "button",
											className: "tl-font-option",
											onClick: () => setListAttempt((current) => current + 1),
										},
										t("lib.action.retry"),
									),
								)
							: null,
						// v0.6.0: the WE folder-path editor moved into ① as a collapsed
						// "Advanced (manual path)" fallback; auto-detection needs no config.
						composer !== "none"
							? null
							: React.createElement(
									"div",
									{ className: "tl-wall-library" },
							// v0.5.3: upload is an advanced-view action; the pick view must not
							// contain a file picker at all.
							view === "advanced"
								? React.createElement(
								"div",
								{ className: "tl-wall-tabs" },
								React.createElement(
									"label",
									{
										className: "tl-wall-upload",
										"data-busy": uploadBusy ? "" : undefined,
										title: t("lib.upload.title"),
									},
									uploadBusy ? t("lib.upload.busy") : t("lib.upload.button"),
									React.createElement("input", {
										type: "file",
										accept: "video/*,image/*",
										disabled: uploadBusy,
										onChange: uploadWallpaper,
										style: { display: "none" },
									}),
								),
								React.createElement(
									"span",
									{ className: "tl-wall-hint" },
									hostStale ? t("lib.upload.hostStaleShort") : "≤" + uploadLimitMb + t("lib.upload.limitSuffix"),
								),
								hostStale
									? React.createElement(
											"button",
											{
												type: "button",
												className: "tl-font-option",
												onClick: () => {
													setUploadNote(t("lib.upload.redetecting"));
													setEngineProbe((value) => value + 1);
												},
											},
											t("lib.upload.redetect"),
										)
									: null,
								)
								: null,
							view === "advanced" && uploadNote !== ""
								? React.createElement("p", { className: "tl-wall-hint" }, uploadNote)
								: null,
							React.createElement("input", {
								className: "tl-font-input",
								type: "search",
								placeholder: t("lib.searchPlaceholder"),
								"aria-label": t("lib.searchAria"),
								value: query,
								onChange: (event) => setQuery(event.target.value),
							}),
							// v0.5.0 D1: sort is its own labelled row, so the filter chips keep
							// their v0.4.0 shape ("全部 N" / "本地" / "WE") that skinlab asserts.
							React.createElement(
								"div",
								{ className: "tl-wall-sort-row", role: "group", "aria-label": t("lib.sort") },
								React.createElement("span", { className: "tl-wall-label" }, t("lib.sort")),
								[
									["name", t("lib.sortName")],
									["kind", t("lib.sortKind")],
									["recent", t("lib.sortRecent")],
									["favorites", t("lib.sortFavorites")],
								].map(([value, label]) =>
									React.createElement(
										"button",
										{
											key: value,
											type: "button",
											className: "tl-font-option",
											"data-active": sortMode === value ? "" : undefined,
											"aria-pressed": sortMode === value,
											onClick: () => setSortMode(value),
										},
										label,
									),
								),
							),
							// v0.5.3: favorites/tags/clear facets stay in 高级; the pick view keeps
							// only the source chips, search and sort.
							view === "advanced"
								? React.createElement(
								"div",
								{ className: "tl-wall-tabs tl-wall-filters" },
								React.createElement(
									"button",
									{
										type: "button",
										className: "tl-font-option",
										"data-active": favoritesOnly ? "" : undefined,
										"aria-pressed": favoritesOnly,
										onClick: () => setFavoritesOnly((value) => !value),
									},
									favoriteCount > 0 ? t("lib.favorites") + " " + favoriteCount : t("lib.favorites"),
								),
								hiddenCount === 0
									? null
									: React.createElement(
											"button",
											{
												type: "button",
												className: "tl-font-option",
												"data-active": showHidden ? "" : undefined,
												"aria-pressed": showHidden,
												title: t("lib.hiddenHint"),
												onClick: () => setShowHidden((value) => !value),
											},
											showHidden
												? t("lib.hiddenOn") + " " + hiddenCount
												: t("lib.hidden") + " " + hiddenCount,
										),
								tagChoices.map((tag) =>
									React.createElement(
										"button",
										{
											key: tag,
											type: "button",
											className: "tl-font-option",
											"data-active": tagFilter.includes(tag) ? "" : undefined,
											"aria-pressed": tagFilter.includes(tag),
											onClick: () =>
												setTagFilter((current) =>
													current.includes(tag)
														? current.filter((entry) => entry !== tag)
														: [...current, tag],
												),
										},
										"#" + tag,
									),
								),
								filtersActive
									? React.createElement(
											"button",
											{
												type: "button",
												className: "tl-font-option",
												onClick: () => {
													setQuery("");
													setFavoritesOnly(false);
													setTagFilter([]);
												},
											},
											t("lib.filterClear"),
										)
									: null,
								)
								: null,
						),
						editingItem === null || composer !== "none" || view !== "advanced"
							? null
							: React.createElement(
									"div",
									{ className: "tl-wall-url tl-wall-tag-editor" },
									React.createElement("p", { className: "tl-wall-hint" }, t("lib.tag.prefix") + nameOf(editingItem)),
									editingMeta.tags.length === 0
										? null
										: React.createElement(
												"div",
												{ className: "tl-wall-tabs" },
												editingMeta.tags.map((tag) =>
													React.createElement(
														"button",
														{
															key: tag,
															type: "button",
															className: "tl-font-option",
															title: t("lib.tag.remove"),
															onClick: () => removeTag(tag),
														},
														"#" + tag + " ×",
													),
												),
											),
									React.createElement("input", {
										className: "tl-font-input",
										type: "text",
										placeholder: t("lib.tag.placeholder"),
										value: tagDraft,
										onChange: (event) => setTagDraft(event.target.value),
										onKeyDown: (event) => {
											if (event.key === "Enter") {
												event.preventDefault();
												addTag();
											}
										},
									}),
									React.createElement(
										"div",
										{ className: "tl-wall-tabs" },
										React.createElement(
											"button",
											{
												type: "button",
												className: "tl-font-reset",
												onClick: () => {
													setTagEditorUrl("");
													setTagDraft("");
												},
											},
											t("lib.common.done"),
										),
									),
								),
						composer !== "none"
							? null
							: React.createElement(
									"div",
									{ className: view === "pick" ? "tl-wall-grid tl-wall-grid-pick" : "tl-wall-grid" },
							filtersActive
								? null
								: React.createElement(
										"button",
										{
											type: "button",
											className: "tl-wall-card",
											"data-tl-wall-card": "",
											"data-tl-auto-card": "",
											"data-active": active === "" ? "" : undefined,
											onClick: () => pickCard(null, t("lib.card.autoTitle")),
										},
										React.createElement("div", { className: "tl-wall-thumb tl-wall-auto" }, t("lib.ctrl.auto")),
										React.createElement("span", { className: "tl-wall-name" }, t("lib.card.autoTitle")),
										React.createElement("span", { className: "tl-wall-tags-mini" }, t("lib.card.autoNote")),
										active === "" ? React.createElement("span", { className: "tl-wall-using", "data-tl-in-use": "" }, t("lib.card.inUse")) : null,
									),
							sortedItems.map(({ item, meta }) =>
								React.createElement(
									"div",
									{ key: item.id, className: "tl-wall-cell", "data-tl-hidden": meta.hidden ? "" : undefined },
									React.createElement(
										"button",
										{
											type: "button",
											className: "tl-wall-card",
											"data-tl-wall-card": "",
											"data-tl-url": item.url,
											"data-tl-kind": item.kind,
											"data-tl-we-item": isEngineItem(item) ? "" : undefined,
											"data-tl-we-type": isEngineItem(item) ? engineTypeOf(item) || "unknown" : undefined,
											"data-active": active === item.url ? "" : undefined,
											onClick: () => pickCard({ kind: item.kind, url: item.url }, displayNameOf(item)),
										},
										React.createElement(
											"div",
											{ className: "tl-wall-thumb" },
											previewOf(item) !== ""
												? React.createElement("img", {
														// v0.6.0: every kind prefers the host preview; a WE video
														// must never be downloaded just to paint a thumbnail.
														src: previewOf(item),
														alt: displayNameOf(item),
														loading: "lazy",
														onError: (event) => {
															event.currentTarget.style.display = "none";
														},
													})
												: item.kind === "scene" || item.kind === "web"
													? React.createElement("img", {
															src: "",
															alt: displayNameOf(item),
															loading: "lazy",
															onError: (event) => {
																event.currentTarget.style.display = "none";
															},
														})
													: item.kind === "video"
														? React.createElement("video", {
																src: item.url + "#t=0.1",
																muted: true,
																preload: "metadata",
																playsInline: true,
																// A codec the browser cannot decode (e.g. HEVC) would
																// otherwise leave a black box that reads as "unreadable".
																onLoadedData: (event) => {
																	event.currentTarget.dataset.tlThumb = "";
																},
																onError: (event) => {
																	event.currentTarget.style.display = "none";
																},
															})
														: React.createElement("img", {
																src: item.url,
																alt: displayNameOf(item),
																loading: "lazy",
															}),
										),
										React.createElement("span", { className: "tl-wall-name" }, displayNameOf(item)),
										active === item.url
											? React.createElement("span", { className: "tl-wall-using", "data-tl-in-use": "" }, t("lib.card.inUse"))
											: null,
										React.createElement(
											"span",
											{ className: "tl-wall-tags-mini", "data-tl-badge": "" },
											[
												badgeOf(item),
												formatBytes(item.bytes),
												...meta.tags.map((tag) => "#" + tag),
											]
												.filter((entry) => entry !== "")
												.join(" · "),
										),
										isEngineItem(item) && engineTypeOf(item) === "scene"
											? React.createElement(
													"span",
													{ className: "tl-wall-badge-hint", "data-tl-static-hint": "", title: t("lib.we.staticHintTitle") },
													t("lib.we.staticHint"),
												)
											: null,
									),
									React.createElement(
										"button",
										{
											type: "button",
											className: "tl-wall-hide",
											"data-active": meta.hidden ? "" : undefined,
											"aria-label": meta.hidden ? t("lib.card.unhide") : t("lib.card.hide"),
											title: meta.hidden ? t("lib.card.unhideTitle") : t("lib.card.hideTitle"),
											onClick: () => updateMeta(item.url, { hidden: meta.hidden !== true }),
										},
										meta.hidden ? t("lib.card.unhideShort") : t("lib.card.hideShort"),
									),
									React.createElement(
										"button",
										{
											type: "button",
											className: "tl-wall-fav",
											"data-active": meta.favorite ? "" : undefined,
											"aria-label": meta.favorite ? t("lib.card.unfavorite") : t("lib.card.favorite"),
											title: meta.favorite ? t("lib.card.unfavorite") : t("lib.card.favorite"),
											onClick: () => updateMeta(item.url, { favorite: meta.favorite === false }),
										},
										meta.favorite ? "★" : "☆",
									),
									// Tag editing is an advanced-view action; its editor container is
									// hidden in the pick view, so rendering the "#" there made a
									// button that could not do anything.
									view === "advanced"
										? React.createElement(
												"button",
												{
													type: "button",
													className: "tl-wall-tag-open",
													"aria-label": t("lib.card.editTags"),
													title: t("lib.card.editTags"),
													onClick: () => {
														setTagEditorUrl(item.url);
														setTagDraft("");
													},
												},
												"#",
											)
										: null,
								),
							),
						),
						composer === "none" && listState === "ready" && filtersActive && visibleItems.length === 0
							? React.createElement(
									"div",
									{ className: "tl-wall-empty" },
									React.createElement("p", { className: "tl-wall-hint" }, t("lib.filterEmpty")),
									// Show exactly which filters are narrowing the list, in a
									// language-neutral form, so "0 张" never looks like data loss.
									React.createElement(
										"p",
										{ className: "tl-wall-v05-note" },
										[
											query.trim() === "" ? "" : "🔍 " + query.trim(),
											favoritesOnly ? "★" : "",
											tagFilter.length === 0 ? "" : tagFilter.map((tag) => "#" + tag).join(" + "),
										]
											.filter((entry) => entry !== "")
											.join(" · "),
									),
									React.createElement(
										"button",
										{
											type: "button",
											className: "tl-font-option",
											onClick: () => {
												setQuery("");
												setFavoritesOnly(false);
												setTagFilter([]);
												setShowHidden(false);
											},
										},
										t("lib.filterClear"),
									),
								)
							: null,
						composer === "none" && listState === "ready" && filtersActive === false && visibleItems.length === 0
							? React.createElement(
									"div",
									{ className: "tl-wall-empty" },
									React.createElement(
										"p",
										{ className: "tl-wall-hint" },
										sourceTab === "engine"
											? t("lib.empty.engine")
											: sourceTab === "we"
												? t("lib.empty.we")
												: sourceTab === "all"
													? t("lib.empty.all")
													: t("lib.empty.local"),
									),
									// A filtered-empty list must never be a dead end: one click goes
									// back to the full library (this was the "0 张 and no way out"
									// state when the panel reopened on a stale WE filter).
									sourceTab !== "all"
										? React.createElement(
												"button",
												{
													type: "button",
													className: "tl-font-option",
													onClick: () => {
														setSourceTab("all");
														setComposer("none");
														setNote("");
													},
												},
												t("lib.empty.showAll"),
											)
										: null,
								)
							: null,
						composer === "url"
							? React.createElement(
									"p",
									{ className: "tl-wall-hint" },
									t("lib.url.hint"),
								)
							: null,
						composer === "url"
							? React.createElement(
									"div",
									{ className: "tl-wall-url" },
									React.createElement(
										"div",
										{ className: "tl-wall-tabs" },
										React.createElement("span", { className: "tl-wall-label" }, t("lib.field.type")),
										[["auto", t("lib.ctrl.auto")], ["image", t("lib.kind.image")], ["video", t("lib.kind.video")]].map(([value, label]) =>
											React.createElement(
												"button",
												{
													key: value,
													type: "button",
													className: "tl-font-option",
													"data-active": draftKind === value ? "" : undefined,
													onClick: () => {
														setDraftKind(value);
														setDraftNote("");
													},
												},
												label,
											),
										),
										React.createElement(
											"button",
											{
												type: "button",
												className: "tl-font-option",
												onClick: () => {
													void (async () => {
														try {
															const text = await globalThis.navigator?.clipboard?.readText();
															if (typeof text === "string" && text.trim() !== "") {
																setDraft(text.trim());
																setDraftNote(t("lib.url.pasted"));
																return;
															}
															setDraftNote(t("lib.url.clipboardEmpty"));
														} catch {
															setDraftNote(t("lib.url.clipboardDenied"));
														}
													})();
												},
											},
											t("lib.url.paste"),
										),
									),
									React.createElement("input", {
										className: "tl-font-input",
										type: "url",
										"data-tl-wall-url-input": "",
										placeholder: t("lib.url.placeholder"),
										value: draft,
										onChange: (event) => {
											setDraft(event.target.value);
											setDraftNote("");
										},
										onKeyDown: (event) => {
											if (event.key === "Enter" && draftBusy === false) void applyDraft();
										},
									}),
									React.createElement(
										"button",
										{
											type: "button",
											className: "tl-font-reset",
											disabled: draftBusy,
											onClick: () => void applyDraft(),
										},
										draftBusy ? t("lib.url.checkingShort") : t("lib.url.apply"),
									),
									React.createElement(
										"p",
										{ className: "tl-wall-hint" },
										draftNote === ""
											? t("lib.url.autoHint")
											: draftNote,
									),
								)
							: null,
						composer === "shader"
							? React.createElement(
									"div",
									{ className: "tl-wall-url" },
									React.createElement(
										"p",
										{ className: "tl-wall-hint" },
										t("lib.shader.intro"),
									),
									React.createElement(
										"p",
										{ className: "tl-wall-hint" },
										t("lib.shader.uniforms"),
									),
									React.createElement(
										"div",
										{ className: "tl-wall-tabs" },
										SHADER_PRESETS.map((preset) =>
											React.createElement(
												"button",
												{
													key: preset.id,
													type: "button",
													className: "tl-font-option",
													"data-active": shader.preset === preset.id ? "" : undefined,
													onClick: () => {
														setShader((current) => ({ ...current, preset: preset.id, source: preset.source }));
														setShaderStatus("");
													},
												},
												preset.label,
											),
										),
									),
									React.createElement(
										"div",
										{ className: "tl-wall-url" },
										React.createElement(
											"p",
											{ className: "tl-wall-hint" },
											t("lib.audio.hint"),
										),
										React.createElement(
											"div",
											{ className: "tl-wall-tabs" },
											React.createElement(
												"button",
												{
													type: "button",
													className: "tl-font-option",
													"data-active": audio.active ? "" : undefined,
													disabled: audio.busy,
													onClick: toggleAudio,
												},
												audio.busy ? t("lib.audio.requestingShort") : audio.active ? t("lib.audio.stop") : t("lib.audio.start"),
											),
											React.createElement(
												"button",
												{ type: "button", className: "tl-font-option", onClick: useAudioPreset },
												t("lib.audio.usePreset"),
											),
										),
										React.createElement(
											"p",
											{ className: "tl-wall-hint" },
											audioNote ||
												audio.reason ||
												(audio.active
													? t("lib.audio.active")
													: t("lib.audio.idle")),
										),
									),
									React.createElement("textarea", {
										className: "tl-wall-textarea tl-wall-code",
										rows: 8,
										spellCheck: false,
										"aria-label": t("lib.shader.sourceAria"),
										value: shader.source,
										onChange: (event) => {
											setShader((current) => ({ ...current, preset: "custom", source: event.target.value }));
											setShaderStatus("");
										},
									}),
									React.createElement(
										"label",
										{ className: "tl-wall-slider" },
										React.createElement("span", null, t("lib.shader.speed") + shader.speed.toFixed(1) + "×"),
										React.createElement("input", {
											type: "range",
											min: 0.1,
											max: 3,
											step: 0.1,
											value: shader.speed,
											onChange: (event) =>
												setShader((current) => ({ ...current, speed: Number(event.target.value) })),
										}),
									),
									React.createElement(
										"label",
										{ className: "tl-wall-slider" },
										React.createElement("span", null, t("lib.shader.intensity") + shader.intensity.toFixed(2)),
										React.createElement("input", {
											type: "range",
											min: 0,
											max: 2,
											step: 0.05,
											value: shader.intensity,
											onChange: (event) =>
												setShader((current) => ({ ...current, intensity: Number(event.target.value) })),
										}),
									),
									React.createElement(
										"label",
										{ className: "tl-wall-slider" },
										React.createElement("span", null, t("lib.shader.hue") + Math.round(shader.hue * 100) + "%"),
										React.createElement("input", {
											type: "range",
											min: 0,
											max: 1,
											step: 0.01,
											value: shader.hue,
											onChange: (event) =>
												setShader((current) => ({ ...current, hue: Number(event.target.value) })),
										}),
									),
									React.createElement(
										"div",
										{ className: "tl-wall-tabs" },
										React.createElement("button", { type: "button", className: "tl-font-reset", onClick: applyShader }, t("lib.shader.apply")),
										React.createElement("button", { type: "button", className: "tl-font-reset", onClick: resetShader }, t("lib.shader.resetButton")),
									),
									shaderStatus === "" ? null : React.createElement("p", { className: "tl-wall-hint" }, shaderStatus),
								)
							: null,
					),
					// ---- framing: ratio-locked crop, zoom and pan ----
					React.createElement(
						"details",
						{ className: "tl-wall-group", open: false, "data-tl-group": "advanced" },
						groupSummary("③", t("lib.group.framing"), framingValue),
						// ---- ratio-locked crop ----
						React.createElement(
							"div",
							{ className: "tl-wall-tabs" },
							Object.keys(RATIOS).map((key) =>
								React.createElement(
									"button",
									{
										key,
										type: "button",
										className: "tl-font-option",
										"data-active": zones.main.ratio === key ? "" : undefined,
										onClick: () => {
											const next = { ...zones, main: { ...zones.main, ratio: key } };
											setZones(next);
											if (zoneController !== null) zoneController.apply(next);
										},
									},
									key === "auto" ? t("lib.framing.followWindow") : key,
								),
							),
						),
						React.createElement(
							"label",
							{ className: "tl-wall-slider" },
							React.createElement("span", null, t("lib.framing.zoom") + zones.main.zoom + "%"),
							React.createElement("input", {
								type: "range",
								min: 30,
								max: 300,
								step: 5,
								value: zones.main.zoom,
								onChange: (event) => {
									const next = { ...zones, main: { ...zones.main, zoom: Number(event.target.value) } };
									setZones(next);
									if (zoneController !== null) zoneController.apply(next);
								},
							}),
						),
						React.createElement(
							"label",
							{ className: "tl-wall-slider" },
							React.createElement("span", null, t("lib.framing.cx") + zones.main.cx + (pannable ? "%" : t("lib.framing.notCropped"))),
							React.createElement("input", {
								type: "range",
								min: 0,
								max: 100,
								step: 1,
								value: zones.main.cx,
								disabled: pannable === false,
								onChange: (event) => {
									const next = { ...zones, main: { ...zones.main, cx: Number(event.target.value) } };
									setZones(next);
									if (zoneController !== null) zoneController.apply(next);
								},
							}),
						),
						React.createElement(
							"label",
							{ className: "tl-wall-slider" },
							React.createElement("span", null, t("lib.framing.cy") + zones.main.cy + (pannable ? "%" : t("lib.framing.notCropped"))),
							React.createElement("input", {
								type: "range",
								min: 0,
								max: 100,
								step: 1,
								value: zones.main.cy,
								disabled: pannable === false,
								onChange: (event) => {
									const next = { ...zones, main: { ...zones.main, cy: Number(event.target.value) } };
									setZones(next);
									if (zoneController !== null) zoneController.apply(next);
								},
							}),
						),
						React.createElement(
							"p",
							{ className: "tl-wall-hint" },
							t("lib.framing.window") + ((globalThis.innerWidth || 16) / (globalThis.innerHeight || 9)).toFixed(2) + ":1" +
								(zones.main.ratio === "auto" ? t("lib.framing.cropFollows") : t("lib.framing.cropIs") + zones.main.ratio),
						),
						pannable
							? null
							: React.createElement(
									"p",
									{ className: "tl-wall-hint" },
									t("lib.framing.hint"),
								),
						React.createElement(
							"div",
							{ className: "tl-wall-url" },
							React.createElement(
								"p",
								{ className: "tl-wall-hint" },
								activeChoice === null
									? t("lib.frame.needExplicit")
									: activeChoice.kind !== "video"
										? t("lib.frame.videoOnly")
										: t("lib.frame.hint"),
							),
							activeChoice !== null && activeChoice.kind === "video"
								? React.createElement(
										"div",
										{ className: "tl-wall-tabs" },
										React.createElement(
											"button",
											{ type: "button", className: "tl-font-reset", disabled: frameBusy, onClick: requestFrames },
											frameBusy ? t("lib.frame.busy") : t("lib.frame.generate"),
										),
										activeChoice.still !== undefined
											? React.createElement(
													"button",
													{ type: "button", className: "tl-font-reset", onClick: resumeVideo },
													t("lib.action.backToMotion"),
												)
											: null,
									)
								: null,
							activeChoice !== null && activeChoice.kind === "video" && activeChoice.still !== undefined
								? React.createElement(
										"p",
										{ className: "tl-wall-hint" },
										t("lib.frame.currentPrefix") + Number(activeChoice.still).toFixed(1) + t("lib.frame.currentSuffix"),
									)
								: null,
							frameStatus === "" ? null : React.createElement("p", { className: "tl-wall-hint" }, frameStatus),
							frameSource === "" || activeChoice === null || frameSource !== activeChoice.url || frames.length === 0
								? null
								: React.createElement(
										"div",
										{ className: "tl-frame-grid" },
										frames.map((frame) =>
											React.createElement(
												"button",
												{
													key: frame.time,
													type: "button",
													className: "tl-frame",
													title: t("lib.frame.set") + Number(frame.time).toFixed(1) + "s",
													onClick: () => applyFrame(frame.time),
												},
												React.createElement("img", { src: frame.dataUrl, alt: "" }),
												React.createElement("span", null, Number(frame.time).toFixed(1) + "s"),
											),
										),
									),
						),
						isVideoWallpaper
							? React.createElement(
									"div",
									{ className: "tl-wall-url" },
									React.createElement(
										"p",
										{ className: "tl-wall-hint" },
										t("lib.playback.hint"),
									),
									React.createElement(
										"div",
										{ className: "tl-wall-tabs" },
										React.createElement("span", { className: "tl-wall-label" }, t("lib.playback.speed")),
										[0.5, 1, 1.25, 1.5].map((speed) =>
											React.createElement(
												"button",
												{
													key: speed,
													type: "button",
													className: "tl-font-option",
													"data-active": playback.speed === speed ? "" : undefined,
													onClick: () => updatePlayback({ speed }),
												},
												speed + "x",
											),
										),
									),
									React.createElement(
										"div",
										{ className: "tl-wall-tabs" },
										React.createElement(
											"button",
											{
												type: "button",
												className: "tl-font-option",
												"data-active": playback.paused ? "" : undefined,
												onClick: () => updatePlayback({ paused: playback.paused === false }),
											},
											playback.paused ? t("lib.action.resume") : t("lib.playback.pause"),
										),
										React.createElement(
											"button",
											{
												type: "button",
												className: "tl-font-option",
												"data-active": playback.flip ? "" : undefined,
												onClick: () => updatePlayback({ flip: playback.flip === false }),
											},
											t("lib.playback.flip"),
										),
									),
									React.createElement(
										"div",
										{ className: "tl-wall-tabs" },
										React.createElement("span", { className: "tl-wall-label" }, t("lib.playback.filter")),
										React.createElement(
											"button",
											{
												type: "button",
												className: "tl-font-option",
												"data-active": playback.filter.on ? "" : undefined,
												onClick: () => updatePlayback({ filter: { ...playback.filter, on: playback.filter.on === false } }),
											},
											playback.filter.on ? t("lib.ctrl.on") : t("lib.ctrl.offByDefault"),
										),
									),
									React.createElement(
										"p",
										{ className: "tl-wall-hint" },
										playback.filter.on
											? t("lib.playback.filterOnHint")
											: t("lib.playback.filterOffHint"),
									),
									playback.filter.on
										? React.createElement(
												"div",
												null,
												[
													["brightness", t("lib.filter.brightness")],
													["contrast", t("lib.filter.contrast")],
													["saturate", t("lib.filter.saturate")],
												].map(([key, label]) =>
													React.createElement(
														"label",
														{ key, className: "tl-wall-slider" },
														React.createElement("span", null, label + " " + playback.filter[key] + "%"),
														React.createElement("input", {
															type: "range",
															min: 50,
															max: 150,
															step: 5,
															value: playback.filter[key],
															onChange: (event) =>
																updatePlayback({
																	filter: { ...playback.filter, [key]: Number(event.target.value) },
																}),
														}),
													),
												),
											)
										: null,
								)
							: null,
					),
					// ---- appearance: glass and the sidebar surface ----
					React.createElement(
						"details",
						{ className: "tl-wall-group", open: false, "data-tl-group": "advanced" },
						groupSummary("④", t("lib.group.appearance"), appearanceValue),
						// ---- glass opacity ----
						React.createElement(
							"label",
							{ className: "tl-wall-slider" },
							React.createElement("span", null, t("lib.appearance.glassLabel") + Math.round(glassLevel * 100) + "%"),
							React.createElement("input", {
								type: "range",
								min: 35,
								max: 150,
								step: 5,
								value: Math.round(glassLevel * 100),
								onChange: (event) => {
									const next = Number(event.target.value) / 100;
									setGlassLevel(next);
									if (glassController !== null) glassController.apply(next);
								},
							}),
						),
						// ---- two CSS overlay slots: no decoder, no timers ----
						React.createElement(
							"div",
							{ className: "tl-wall-tabs" },
							React.createElement("span", { className: "tl-wall-label" }, t("lib.layer.slots")),
							[0, 1].map((index) =>
								React.createElement(
									"button",
									{
										key: index,
										type: "button",
										className: "tl-font-option",
										"data-active": layerSlot === index ? "" : undefined,
										onClick: () => setLayerSlot(index),
									},
									(index === 0 ? t("lib.layer.slotA") : t("lib.layer.slotB")) + " · " + layerSlotLabel(layerSlots[index]),
								),
							),
							React.createElement(
								"button",
								{ type: "button", className: "tl-font-option", onClick: swapLayers },
								t("lib.layer.swap"),
							),
						),
						React.createElement(
							"div",
							{ className: "tl-wall-tabs" },
							React.createElement("span", { className: "tl-wall-label" }, t("lib.field.type")),
							[["none", t("lib.ctrl.off")], ["preset", t("lib.slot.preset")], ["image", t("lib.kind.image")]].map(([value, label]) =>
								React.createElement(
									"button",
									{
										key: value,
										type: "button",
										className: "tl-font-option",
										"data-active": selectedSlot.kind === value ? "" : undefined,
										onClick: () =>
											updateLayerSlot(layerSlot, {
												kind: value,
												preset: value === "preset" && selectedSlot.preset === "none" ? "vignette" : selectedSlot.preset,
											}),
									},
									label,
								),
							),
						),
						selectedSlot.kind === "preset"
							? React.createElement(
									"div",
									{ className: "tl-wall-tabs" },
									React.createElement("span", { className: "tl-wall-label" }, t("lib.layer.pattern")),
									Object.entries(LAYER_LABELS).map(([value, label]) =>
										React.createElement(
											"button",
											{
												key: value,
												type: "button",
												className: "tl-font-option",
												"data-active": selectedSlot.preset === value ? "" : undefined,
												onClick: () => updateLayerSlot(layerSlot, { kind: "preset", preset: value }),
											},
											label,
										),
									),
								)
							: null,
						selectedSlot.kind === "image"
							? React.createElement(
									"div",
									{ className: "tl-wall-url" },
									React.createElement(
										"select",
										{
											className: "tl-font-select",
											"aria-label": t("lib.layer.imageAria"),
											value: items.some((item) => item.kind === "image" && item.url === selectedSlot.url) ? selectedSlot.url : "",
											onChange: (event) => updateLayerSlot(layerSlot, { kind: "image", url: event.target.value }),
										},
										React.createElement("option", { value: "" }, t("lib.layer.selectImage")),
										items
											.filter((item) => item.kind === "image")
											.map((item) => React.createElement("option", { key: item.id, value: item.url }, item.id)),
									),
									React.createElement("input", {
										className: "tl-font-input",
										type: "url",
										placeholder: t("lib.layer.pasteImage"),
										value: selectedSlot.url,
										onChange: (event) => updateLayerSlot(layerSlot, { kind: "image", url: event.target.value }),
									}),
									React.createElement(
										"div",
										{ className: "tl-wall-tabs" },
										React.createElement("span", { className: "tl-wall-label" }, t("lib.layer.fit")),
										[["cover", t("lib.layer.fitCover")], ["contain", t("lib.layer.fitContain")], ["stretch", t("lib.layer.fitStretch")]].map(([value, label]) =>
											React.createElement(
												"button",
												{
													key: value,
													type: "button",
													className: "tl-font-option",
													"data-active": selectedSlot.fit === value ? "" : undefined,
													onClick: () => updateLayerSlot(layerSlot, { fit: value }),
												},
												label,
											),
										),
									),
								)
							: null,
						selectedSlot.kind === "none"
							? React.createElement("p", { className: "tl-wall-hint" }, t("lib.layer.offHint"))
							: React.createElement(
									"label",
									{ className: "tl-wall-slider" },
									React.createElement("span", null, t("lib.layer.opacity") + Math.round(selectedSlot.opacity * 100) + "%"),
									React.createElement("input", {
										type: "range",
										min: 0,
										max: 100,
										step: 1,
										value: Math.round(selectedSlot.opacity * 100),
										onChange: (event) => updateLayerSlot(layerSlot, { opacity: Number(event.target.value) / 100 }),
									}),
								),
						selectedSlot.kind === "none"
							? null
							: React.createElement(
									"div",
									{ className: "tl-wall-tabs" },
									React.createElement("span", { className: "tl-wall-label" }, t("lib.layer.blend")),
									Object.entries(LAYER_BLEND_LABELS).map(([value, label]) =>
										React.createElement(
											"button",
											{
												key: value,
												type: "button",
												className: "tl-font-option",
												"data-active": selectedSlot.blend === value ? "" : undefined,
												onClick: () => updateLayerSlot(layerSlot, { blend: value }),
											},
											label,
										),
									),
								),
						React.createElement(
							"p",
							{ className: "tl-wall-hint" },
							t("lib.layer.hint"),
						),
						// ---- the only zone question that matters: separate or continuous ----
						React.createElement(
							"div",
							{ className: "tl-wall-tabs" },
							React.createElement("span", { className: "tl-wall-label" }, t("lib.rail.title")),
							[["no", t("lib.rail.same")], ["yes", t("lib.rail.separate")]].map(([value, label]) =>
								React.createElement(
									"button",
									{
										key: value,
										type: "button",
										className: "tl-font-option",
										"data-active": zones.separate === (value === "yes") ? "" : undefined,
										onClick: () => {
											const next = { ...zones, separate: value === "yes" };
											setZones(next);
											if (zoneController !== null) zoneController.apply(next);
										},
									},
									label,
								),
							),
						),
						zones.separate === true
							? React.createElement(
									"select",
									{
										className: "tl-font-select",
										"aria-label": t("lib.rail.title"),
										value: zones.rail.url ?? "",
										onChange: (event) => {
											const url = event.target.value;
											const item = items.find((entry) => entry.url === url);
											const next = {
												...zones,
												rail: { ...zones.rail, url, kind: item === undefined ? "video" : item.kind },
											};
											setZones(next);
											if (zoneController !== null) zoneController.apply(next);
										},
									},
									React.createElement("option", { value: "" }, t("lib.rail.follow")),
									items.map((item) =>
										React.createElement("option", { key: item.id, value: item.url }, item.id),
									),
								)
							: null,
					),
					// ---- performance: render budget and battery saving ----
					React.createElement(
						"details",
						{ className: "tl-wall-group", open: false, "data-tl-group": "advanced" },
						groupSummary("⑤", t("lib.group.performance"), performanceValue),
						React.createElement(
							"div",
							{ className: "tl-wall-tabs" },
							React.createElement("span", { className: "tl-wall-label" }, t("lib.perf.lowPower")),
							[["auto", t("lib.ctrl.auto")], ["on", t("lib.ctrl.onShort")], ["off", t("lib.ctrl.offShort")]].map(([value, label]) =>
								React.createElement(
									"button",
									{
										key: value,
										type: "button",
										className: "tl-font-option",
										"data-active": powerMode === value ? "" : undefined,
										onClick: () => {
											setPowerMode(value);
											if (lowPowerController !== null) lowPowerController.set(value);
										},
									},
									label,
								),
							),
						),
						React.createElement(
							"div",
							{ className: "tl-wall-tabs" },
							React.createElement("span", { className: "tl-wall-label" }, t("lib.perf.renderFps")),
							[["auto", t("lib.ctrl.auto")], ["60", "60"], ["30", "30"], ["15", "15"]].map(([value, label]) =>
								React.createElement(
									"button",
									{
										key: value,
										type: "button",
										className: "tl-font-option",
										"data-active": fpsMode === value ? "" : undefined,
										onClick: () => {
											setFpsMode(value);
											renderTierController.set(value);
										},
									},
									value === "auto" ? label : label + "fps",
								),
							),
						),
						React.createElement(
							"p",
							{ className: "tl-wall-hint" },
							t("lib.perf.fpsHint"),
						),
						React.createElement(
							"p",
							{ className: "tl-wall-hint" },
							powerMode === "auto"
								? t("lib.perf.autoHint")
								: powerMode === "on"
									? t("lib.perf.onHint")
									: t("lib.perf.offHint"),
						),
						React.createElement(
							"div",
							{ className: "tl-wall-tabs" },
							React.createElement("span", { className: "tl-wall-label" }, t("lib.rotation.title")),
							React.createElement(
								"button",
								{
									type: "button",
									className: "tl-font-option",
									"data-active": rotation.on ? "" : undefined,
									onClick: () => updateRotation({ on: rotation.on === false }),
								},
								rotation.on ? t("lib.ctrl.on") : t("lib.ctrl.off"),
							),
						),
						React.createElement(
							"div",
							{ className: "tl-wall-tabs" },
							React.createElement("span", { className: "tl-wall-label" }, t("lib.rotation.order")),
							[
								["sequence", t("lib.rotation.order")],
								["random", t("lib.rotation.random")],
							].map(([value, label]) =>
								React.createElement(
									"button",
									{
										key: value,
										type: "button",
										className: "tl-font-option",
										"data-active": rotation.order === value ? "" : undefined,
										onClick: () => updateRotation({ order: value }),
									},
									label,
								),
							),
						),
						React.createElement(
							"div",
							{ className: "tl-wall-tabs" },
							React.createElement("span", { className: "tl-wall-label" }, t("lib.rotation.interval")),
							ROTATION_INTERVALS.map((seconds) =>
								React.createElement(
									"button",
									{
										key: seconds,
										type: "button",
										className: "tl-font-option",
										"data-active": rotation.interval === seconds ? "" : undefined,
										onClick: () => updateRotation({ interval: seconds }),
									},
									seconds < 60 ? seconds + "s" : Math.round(seconds / 60) + t("lib.unit.minutesShort"),
								),
							),
						),
						React.createElement(
							"div",
							{ className: "tl-wall-tabs" },
							React.createElement(
								"button",
								{
									type: "button",
									className: "tl-font-option",
									"data-active": rotation.favoritesOnly ? "" : undefined,
									onClick: () => updateRotation({ favoritesOnly: rotation.favoritesOnly === false }),
								},
								t("lib.rotation.favoritesOnly"),
							),
						),
						React.createElement(
							"p",
							{ className: "tl-wall-hint" },
							rotation.on
								? t("lib.rotation.everyPrefix") +
										(rotation.interval < 60 ? rotation.interval + t("lib.unit.secondsSuffix") : Math.round(rotation.interval / 60) + t("lib.unit.minutesSuffix")) +
										t("lib.rotation.onHint")
								: t("lib.rotation.offHint"),
						),
					),
					// ---- recipe: the whole panel configuration, exportable ----
					React.createElement(
						"details",
						{ className: "tl-wall-group", open: false, "data-tl-group": "advanced" },
						groupSummary("⑥", t("lib.group.recipe"), t("lib.group.recipeValue")),
						React.createElement(
							"div",
							{ className: "tl-wall-url" },
							React.createElement(
								"p",
								{ className: "tl-wall-hint" },
								t("lib.recipeHint"),
							),
							React.createElement(
								"div",
								{ className: "tl-source-grid" },
								CURATED_PRESETS.map((preset) =>
									React.createElement(
										"button",
										{
											key: preset.id,
											type: "button",
											className: "tl-source-card",
											title: t(preset.descKey),
											onClick: () => applyCuratedPreset(preset),
										},
										React.createElement("span", { className: "tl-source-name" }, t(preset.labelKey)),
										React.createElement("span", { className: "tl-source-note" }, t(preset.descKey)),
									),
								),
							),
							React.createElement("textarea", {
								className: "tl-wall-textarea",
								rows: 3,
								placeholder: t("lib.recipePlaceholder"),
								value: presetText,
								onChange: (event) => setPresetText(event.target.value),
							}),
							React.createElement(
								"div",
								{ className: "tl-wall-tabs" },
								React.createElement("button", { type: "button", className: "tl-font-reset", onClick: exportPreset }, t("lib.exportRecipe")),
								React.createElement("button", { type: "button", className: "tl-font-reset", onClick: importPreset }, t("lib.importRecipe")),
							),
							presetStatus === "" ? null : React.createElement("p", { className: "tl-wall-hint" }, presetStatus),
							// ---- v0.5.0 D3: copy a #tl=<recipe v2> share link ----
							React.createElement(
								"div",
								{ className: "tl-wall-url" },
								React.createElement("p", { className: "tl-wall-hint" }, t("lib.shareTitle") + " · v2"),
								React.createElement(
									"div",
									{ className: "tl-wall-tabs" },
									React.createElement(
										"button",
										{ type: "button", className: "tl-font-reset", onClick: copyShareLink },
										t("lib.shareCopy"),
									),
								),
								React.createElement("p", { className: "tl-wall-hint" }, t("lib.shareHint")),
								shareLink === ""
									? null
									: React.createElement(
											"div",
											null,
											React.createElement("p", { className: "tl-wall-v05-note" }, t("lib.shareManual")),
											React.createElement("textarea", {
												className: "tl-wall-textarea",
												rows: 2,
												readOnly: true,
												"aria-label": t("lib.shareLinkAria"),
												value: shareLink,
												onFocus: (event) => event.currentTarget.select(),
											}),
										),
								shareNote === "" ? null : React.createElement("p", { className: "tl-wall-hint" }, shareNote),
							),
							// ---- v0.5.0 D2: export / import the host bundle ----
							bundleSupported || importSupported
								? React.createElement(
										"div",
										{ className: "tl-wall-url" },
										React.createElement("p", { className: "tl-wall-hint" }, t("lib.bundleTitle")),
										React.createElement(
											"div",
											{ className: "tl-wall-bundle-row" },
											bundleSupported
												? React.createElement(
														"button",
														{
															type: "button",
															className: "tl-font-reset",
															disabled: bundleBusy,
															onClick: exportBundle,
														},
														bundleBusy ? t("lib.bundleExportBusy") : t("lib.bundleExport"),
													)
												: null,
											importSupported
												? React.createElement(
														"label",
														{ className: "tl-wall-upload", "data-busy": importBusy ? "" : undefined, title: t("lib.bundleImport") },
														importBusy ? t("lib.bundleImporting") : t("lib.bundleImport"),
														React.createElement("input", {
															type: "file",
															accept: ".tgz,.tar.gz,application/gzip,application/x-gzip",
															disabled: importBusy,
															onChange: importBundle,
															style: { display: "none" },
														}),
													)
												: null,
										),
										React.createElement("p", { className: "tl-wall-hint" }, t("lib.bundleHint")),
										importBusy
											? React.createElement("progress", {
													className: "tl-wall-progress",
													max: 100,
													value: importPct,
													"aria-label": t("lib.bundleImporting"),
												})
											: null,
										importBusy
											? React.createElement("p", { className: "tl-wall-v05-note" }, t("lib.bundleProgress", { pct: importPct }))
											: null,
										bundleNote === "" ? null : React.createElement("p", { className: "tl-wall-hint" }, bundleNote),
										importNote === "" ? null : React.createElement("p", { className: "tl-wall-hint" }, importNote),
									)
								: engine === null
									// State probe still in flight: show nothing rather than flashing
									// "host unavailable" for the first render.
									? null
									: React.createElement("p", { className: "tl-wall-hint" }, t("lib.bundleNoHost")),
							// Reset lives next to the recipe: both own the same zones and glass.
							React.createElement(
								"button",
								{
									type: "button",
									className: "tl-font-reset",
									onClick: () => {
										const next = {
											...zones,
											separate: false,
											main: { ...ZONE_DEFAULTS.main },
											rail: { ...ZONE_DEFAULTS.rail },
										};
										setZones(next);
										if (zoneController !== null) zoneController.apply(next);
										setGlassLevel(1);
										if (glassController !== null) glassController.apply(1);
									},
								},
								t("lib.resetWallpaper"),
							),
						),
					),
					// ---- v0.5.0 extension sections: every workstream registers its own
					// <details class="tl-wall-group"> component; the panel only mounts them
					// in registration order, after ⑥, inside this same scroll container.
					// ①-⑥ above stay untouched so the skinlab inventory/layout checks hold.
					...tl5PanelSections().map((section) =>
						React.createElement(section.Component, { key: "tl5-" + section.id }),
					),
					// v0.5.3: transient picker feedback ("已切换：…"/inline errors live in the
					// compact status row). Rendered last so it floats above the grid.
					toast === null || view !== "pick"
						? null
						: React.createElement("div", { className: "tl-wall-toast", "data-tl-toast": "", role: "status" }, toast.text),
				);
			};

			const scrim = document.createElement("div");
			scrim.setAttribute("data-tl-wall-scrim", "");
			const host = document.createElement("div");
			host.className = "tl-wall-sidebar";
			host.setAttribute("data-tl-wall", "");
			// The trigger lives on the viewport edge, NOT in the composer: the composer is
			// for talking to the model, and a wallpaper picker there crowded the input row.
			const handle = document.createElement("button");
			handle.type = "button";
			handle.setAttribute("data-tl-wall-handle", "");
			handle.setAttribute("aria-keyshortcuts", "Alt+W");
			// The handle lives outside the React panel; keep it on the same dictionary and
			// refresh it when the language changes (subscribeTl5I18n is disposed below).
			// v0.5.3 13-i18n can also auto-rewrite these via data-tl-i18n-*; both paths are
			// kept so older/newer i18n fragments behave the same.
			handle.setAttribute("data-tl-i18n-key", "lib.handle.text");
			handle.setAttribute("data-tl-i18n-title-key", "lib.handle.title");
			const refreshHandleCopy = () => {
				handle.title = TL_T("lib.handle.title");
				handle.textContent = TL_T("lib.handle.text");
			};
			refreshHandleCopy();
			const unsubscribeHandleI18n = subscribeTl5I18n(refreshHandleCopy);
			const body = document.body;
			if (body !== null) {
				body.appendChild(scrim);
				body.appendChild(host);
				body.appendChild(handle);
			}

			let root = null;
			let open = false;
			let tintTimer = 0;
			// v0.5.0 D3: a validated #tl= recipe waiting for the user's explicit decision.
			// Read once at install (page load with a shared link) and re-read on each open
			// by the panel; a decision clears both this and the hash.
			const hashAtInstall = String(globalThis.location?.hash ?? "");
			let pendingShare = hashAtInstall.startsWith("#tl=") ? readTl5ShareHash() : null;
			// A link that was present but rejected (invalid/oversized) is surfaced as a
			// single note when the panel opens: the hash is already cleared, no settings
			// were touched.
			const shareRejectedAtLoad = hashAtInstall.startsWith("#tl=") && pendingShare === null;

			// ---- background tinted by the wallpaper's own hue ----
			const swatch = document.createElement("canvas");
			swatch.width = 32;
			swatch.height = 18;
			let swatchCtx = null;
			try {
				swatchCtx = swatch.getContext("2d", { willReadFrequently: true });
			} catch {
				swatchCtx = null;
			}
			const tintPanel = () => {
				if (swatchCtx === null) return;
				const still = wallpaperController === null ? null : wallpaperController.image;
				const video = document.querySelector("[data-tl-scene] > video");
				// The shader snapshot is a 2D canvas copied in the render task, so it stays
				// readable even though the WebGL buffer is not preserved.
				const shader = wallpaperController === null ? null : wallpaperController.shaderSwatch;
				const target =
					shader !== null && shader !== undefined
						? shader
						: still !== null && still !== undefined
							? still
							: video;
				if (target === null || target === undefined) return;
				if (target === video && video.readyState < 2) return;
				let data = null;
				try {
					swatchCtx.drawImage(target, 0, 0, swatch.width, swatch.height);
					data = swatchCtx.getImageData(0, 0, swatch.width, swatch.height).data;
				} catch {
					return;
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
				if (weight <= 0.001) return;
				const hue = Math.round((((Math.atan2(sin, cos) * 180) / Math.PI) + 360) % 360);
				const sat = Math.min(0.70, Math.max(0.32, (satSum / weight) * 1.3));
				const light = lightSum / weight;
				const dark = document.body !== null && document.body.hasAttribute(DARK_ATTR);
				// Deliberately saturated: at 12-20% saturation on a 94%-light surface the
				// panel looked untinted, which is the bug this replaced.
				const fillLight = dark ? 0.15 : 0.90;
				const fillSat = Math.round(Math.min(0.52, Math.max(0.18, sat)) * 100);
				const fill = "hsl(" + hue + " " + fillSat + "% " + Math.round(fillLight * 100) + "% / max(0.96, calc(0.94 * var(--tl-glass-m, 1))))";
				host.style.setProperty("--tl-panel-fill", fill);
				// The edge handle carries the same tint, so the wallpaper colour is visible
				// even with the panel closed.
				handle.style.setProperty("--tl-panel-fill", fill);
				host.style.setProperty(
					"--tl-accent",
					"hsl(" + hue + " " + Math.round(sat * 100) + "% " + Math.round((dark ? 0.66 : 0.44) * 100) + "%)",
				);
			};
			const startTint = () => {
				if (tintTimer !== 0) return;
				tintPanel();
				// One delayed retry covers a video that has not decoded a frame yet at open
				// time. No polling: drawImage + getImageData from a 4K playing video every
				// few seconds caused a visible periodic hitch, which was reported as the
				// panel "shaking on its own".
				tintTimer = globalThis.setTimeout(() => {
					tintTimer = 0;
					tintPanel();
				}, 1500);
			};
			const stopTint = () => {
				if (tintTimer === 0) return;
				globalThis.clearTimeout(tintTimer);
				tintTimer = 0;
			};

			// ---- drag between edges, spring settle with a capped elastic overshoot ----
			const MAX_OVERSHOOT = 26;
			const RUBBER = 0.35;
			const MAX_VELOCITY = 1500;
			let offset = 0;
			let raf = 0;
			let drag = null;
			const panelWidth = () => host.offsetWidth || 296;
			const maxOffset = () => Math.max(0, globalThis.innerWidth - panelWidth());
			const applyX = (x) => {
				offset = x;
				host.style.transform = "translateX(" + x + "px)";
				// The border and shadow mirror whichever edge the panel settled on.
				if (x > 4) host.setAttribute("data-tl-side", "right");
				else host.removeAttribute("data-tl-side");
			};			/**
			 * Springs to one edge. Release velocity is clamped and the overshoot is
			 * hard-capped, so a violent flick cannot throw the panel across the screen.
			 */
			const settle = (target, velocity) => {
				if (raf !== 0) globalThis.cancelAnimationFrame(raf);
				const stiffness = 210;
				const damping = 26;
				const dt = 1 / 60;
				let pos = offset;
				let vel = Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, velocity)) / 60;
				const step = () => {
					vel += ((target - pos) * stiffness - vel * damping) * dt;
					pos += vel * dt;
					const over = pos - target;
					if (Math.abs(over) > MAX_OVERSHOOT) pos = target + Math.sign(over) * MAX_OVERSHOOT;
					if (Math.abs(target - pos) < 0.4 && Math.abs(vel) < 0.4) {
						applyX(target);
						raf = 0;
						return;
					}
					applyX(pos);
					raf = globalThis.requestAnimationFrame(step);
				};
				raf = globalThis.requestAnimationFrame(step);
			};
			// ---- moving light: follows the pointer, brightens with drag speed ----
			let glowNode = null;
			const updateGlow = (event, intensity) => {
				if (glowNode === null) glowNode = host.querySelector("[data-tl-wall-glow]");
				if (glowNode === null) return;
				const rect = host.getBoundingClientRect();
				if (rect.width === 0 || rect.height === 0) return;
				const x = Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100));
				const y = Math.max(0, Math.min(100, ((event.clientY - rect.top) / rect.height) * 100));
				glowNode.style.setProperty("--tl-glow-x", x.toFixed(1) + "%");
				glowNode.style.setProperty("--tl-glow-y", y.toFixed(1) + "%");
				glowNode.style.setProperty("--tl-glow-a", String(Math.max(0, Math.min(1, intensity))));
			};
			const onGlowLeave = () => {
				if (glowNode !== null) glowNode.style.setProperty("--tl-glow-a", "0");
			};

			/**
			 * Swallows exactly one upcoming click. Without it, finishing a drag that
			 * started on a wallpaper card would also "click" that card and switch the
			 * wallpaper by accident.
			 */
			const swallowNextClick = () => {
				const stop = (clickEvent) => {
					clickEvent.stopPropagation();
					clickEvent.preventDefault();
				};
				document.addEventListener("click", stop, true);
				// One cleanup path only: the timer always removes it, whether or not a
				// click arrived. Removing it in two places tripped the listener audit.
				globalThis.setTimeout(() => document.removeEventListener("click", stop, true), 80);
			};

			// Document-level capture: the panel is almost entirely made of card buttons,
			// and a host-scoped listener lost the gesture whenever a child consumed it.
			const onDragStart = (event) => {
				const target = event.target;
				if (!(target instanceof Element)) return;
				if (target.closest("[data-tl-wall]") === null) return;
				// Only the sticky title/guide block is a drag handle. The rest of the
				// panel is a normal scrolling surface; every interactive child (including
				// the dynamic-playback button) keeps its own click.
				if (target.closest("[data-tl-wall-drag]") === null) return;
				if (target.closest("button, a, input, textarea, select, summary") !== null) return;
				if (raf !== 0) {
					globalThis.cancelAnimationFrame(raf);
					raf = 0;
				}
				drag = {
					id: event.pointerId,
					startX: event.clientX,
					startOffset: offset,
					lastX: event.clientX,
					lastT: performance.now(),
					velocity: 0,
					moved: 0,
				};
				host.setAttribute("data-tl-dragging", "");
				event.preventDefault();
			};
			const onDragMove = (event) => {
				if (drag === null) {
					const target = event.target;
					if (target instanceof Element && target.closest("[data-tl-wall]") !== null) updateGlow(event, 0.34);
					return;
				}
				if (event.pointerId !== drag.id) return;
				// A pointerup delivered outside the window never reaches onDragEnd. Without
				// this check the panel keeps following the mouse with no button pressed,
				// which reads as the panel moving on its own.
				if ((event.buttons & 1) === 0) {
					onDragEnd(event);
					return;
				}
				const now = performance.now();
				const elapsed = Math.max(1, now - drag.lastT);
				drag.velocity = ((event.clientX - drag.lastX) / elapsed) * 1000;
				drag.lastX = event.clientX;
				drag.lastT = now;
				drag.moved = Math.max(drag.moved, Math.abs(event.clientX - drag.startX));
				updateGlow(event, Math.min(1, 0.25 + Math.abs(drag.velocity) / 1200));
				const raw = drag.startOffset + (event.clientX - drag.startX);
				const max = maxOffset();
				let x = raw;
				if (raw < 0) x = raw * RUBBER;
				else if (raw > max) x = max + (raw - max) * RUBBER;
				applyX(x);
			};
			const onDragEnd = (event) => {
				if (drag === null) return;
				const moved = drag.moved;
				const velocity = drag.velocity;
				drag = null;
				host.removeAttribute("data-tl-dragging");
				if (moved > 5) swallowNextClick();
				if (moved <= 4) {
					// A plain click on the title/guide must not spring the panel to an edge;
					// that made a stationary panel move "by itself" after any click.
					if (event !== undefined) event.preventDefault?.();
					return;
				}
				const max = maxOffset();
				// Only "near an edge" snaps; anywhere in the middle stays where it was
				// dropped. Always snapping to the nearest edge made every small drag spring
				// straight back, which reads as "the panel cannot be moved".
				const SNAP = 56;
				const clamped = Math.min(Math.max(offset, 0), max);
				let target = clamped;
				if (clamped <= SNAP) target = 0;
				else if (max - clamped <= SNAP) target = max;
				settle(target, velocity);
				if (event !== undefined) event.preventDefault?.();
			};
			document.addEventListener("pointerdown", onDragStart, true);
			document.addEventListener("pointermove", onDragMove, true);
			document.addEventListener("pointerup", onDragEnd, true);
			document.addEventListener("pointercancel", onDragEnd, true);
			host.addEventListener("pointerleave", onGlowLeave);

			// Each open remounts the panel component (via the React key), so the panel
			// always starts on the full library. The React state (source tab, filters, WE
			// editor) used to survive close/open for the whole page session: after the user
			// clicked "WE 目录" once, every later open came back to an empty WE filter with
			// "壁纸清单 0 张" and the directory editor expanded — the reported "wallpaper
			// panel is broken" state.
			let openSeq = 0;
			const renderPanel = () => {
				if (root === null) {
					try {
						root = require("react-dom/client").createRoot(host);
					} catch {
						root = null;
						return;
					}
				}
				openSeq += 1;
				try {
					root.render(
						React.createElement(WallpaperPanel, {
							key: "wall-panel-" + openSeq,
							onClose: () => setOpen(false),
							sharedRecipe: pendingShare,
							shareRejected: shareRejectedAtLoad,
						}),
					);
				} catch {
					// a failing render must not keep the panel in a half-open state
				}
			};
			const setOpen = (next) => {
				open = next;
				if (open) {
					host.setAttribute("data-tl-open", "");
					scrim.setAttribute("data-tl-open", "");
					handle.setAttribute("data-tl-hidden", "");
					startTint();
					audioController.clearReason();
					// Re-clamp against the current viewport before showing.
					applyX(Math.min(offset, maxOffset()));
					renderPanel();
				} else {
					host.removeAttribute("data-tl-open");
					scrim.removeAttribute("data-tl-open");
					handle.removeAttribute("data-tl-hidden");
					stopTint();
					audioController.stop(TL_T("lib.audio.stoppedOnClose"));
				}
			};
			const onScrim = () => setOpen(false);
			const onHandle = () => setOpen(!open);
			// The edge tab can be covered by the DSH sidebar / Windows taskbar.
			// A keyboard route must exist independently of that tab's position.
			const onKey = (event) => {
				if (event.altKey && event.ctrlKey === false && event.metaKey === false && (event.key === "w" || event.key === "W")) {
					event.preventDefault();
					setOpen(!open);
					return;
				}
				// Esc is the standard way out of a panel. Only claimed while the panel is open,
				// so dialogs and menus elsewhere keep their own Esc behaviour.
				if (event.key === "Escape" && open) {
					event.preventDefault();
					event.stopPropagation();
					setOpen(false);
				}
			};
			// A cached offset goes stale when the viewport shrinks: a panel pinned to the
			// right edge would sit outside the window until the next drag.
			const onResize = () => {
				if (!open) return;
				const max = maxOffset();
				if (offset > max) applyX(max);
			};
			scrim.addEventListener("click", onScrim);
			handle.addEventListener("click", onHandle);
			window.addEventListener("keydown", onKey, true);
			window.addEventListener("resize", onResize);
			applyX(0);

			return () => {
				scrim.removeEventListener("click", onScrim);
				handle.removeEventListener("click", onHandle);
				window.removeEventListener("keydown", onKey, true);
				window.removeEventListener("resize", onResize);
				document.removeEventListener("pointerdown", onDragStart, true);
				document.removeEventListener("pointermove", onDragMove, true);
				document.removeEventListener("pointerup", onDragEnd, true);
				document.removeEventListener("pointercancel", onDragEnd, true);
				host.removeEventListener("pointerleave", onGlowLeave);
				if (typeof unsubscribeHandleI18n === "function") unsubscribeHandleI18n();
				stopTint();
				if (raf !== 0) globalThis.cancelAnimationFrame(raf);
				try {
					if (root !== null) root.unmount();
				} catch {
					// an already-detached root is fine
				}
				host.remove();
				scrim.remove();
				handle.remove();
			};
		}
		//#endregion

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
		//#region life settings
		/**
		 * v1.0.0 role page (slots `settings.section`, id `tianlight-role`).
		 *
		 * One page for the character layer: replaceable pet media (image or video
		 * <=32 MiB), life rhythm (quiet hours / wake-sleep / daily proactive budget /
		 * virtual clock), liquid-glass depth, memory stats and a focus timer. Every
		 * control talks to the same runtime APIs the pet uses, so there is no second
		 * source of truth:
		 *   - globalThis.tianlightLife (life rhythm + media, src/42-life.js)
		 *   - glassDepthController        (off/frosted/soft/real, src/57-glass.js)
		 *   - globalThis.tianlightDuty    (bubble channel, read-only stats here)
		 *
		 * Slots/React missing => the page silently degrades (diagnostics only); the
		 * pet and the console APIs keep working.
		 */
		registerTl5Strings({
			zh: {
				"role.section.label": "角色 / 生活",
				"role.title": "角色 · 生活节奏",
				"role.intro": "桌宠不只是装饰：它有作息、有主动开口的预算，也能换成你自己的图片或短视频形象。这里的所有设置都即时生效。",
				"role.media.title": "桌宠形象",
				"role.media.hint": "支持本地壁纸库中的图片或视频（≤32 MiB）。视频会静音循环播放；换图/换视频不需要改代码。",
				"role.media.default": "默认形象（cat.png）",
				"role.media.apply": "应用形象",
				"role.media.applied": "形象已切换：{name}",
				"role.media.tooBig": "以下素材超过 32 MiB，已忽略：{names}",
				"role.media.empty": "本地壁纸库暂无可用素材；先在上传壁纸里添加图片/视频。",
				"role.life.title": "生活节奏",
				"role.life.quiet": "静默时段",
				"role.life.quietOn": "启用",
				"role.life.start": "开始",
				"role.life.end": "结束",
				"role.life.budget": "每日主动开口上限",
				"role.life.wake": "起床",
				"role.life.sleep": "睡觉",
				"role.life.virtual": "虚拟时钟偏移（分钟）",
				"role.life.apply": "保存生活节奏",
				"role.life.saved": "已保存。",
				"role.life.status": "现在是 {period} · 今日主动 {used}/{cap} 次 · {quiet}",
				"role.life.quietActive": "静默中",
				"role.life.quietOff": "可开口",
				"role.life.deferred": "被推迟的职责提醒：{n} 条",
				"role.glass.title": "玻璃液态质感",
				"role.glass.hint": "在壁纸与界面之间加一层液态玻璃。真实最通透、柔和更稳、磨砂最安静；低电量或 15fps 时自动降级。",
				"role.glass.off": "关闭",
				"role.glass.frosted": "磨砂",
				"role.glass.soft": "柔和",
				"role.glass.real": "真实",
				"role.glass.applied": "质感：{depth}（实际 {effective}）",
				"role.memory.title": "记忆与专注",
				"role.memory.stats": "互动 {interactions} · 摸摸 {pats} · 喂食 {feeds} · 逗猫棒 {plays} · 连续 {streak} 天",
				"role.memory.lastSeen": "上次见面：{time}",
				"role.focus.start": "开始 25 分钟专注",
				"role.focus.stop": "结束专注",
				"role.focus.active": "专注中，剩余 {minutes} 分钟",
				"role.focus.idle": "未在专注",
				"role.memory.hint": "专注期间角色不会主动开口；职责气泡（审批等）不受影响。",
			},
			en: {
				"role.section.label": "Role / Life",
				"role.title": "Role · Life rhythm",
				"role.intro": "The companion is more than decoration: it keeps a daily rhythm, has a proactive-speaking budget, and can wear your own image or short video. Everything here applies immediately.",
				"role.media.title": "Companion look",
				"role.media.hint": "Pick an image or video from the local wallpaper library (<=32 MiB). Videos loop muted; no code change needed.",
				"role.media.default": "Default (cat.png)",
				"role.media.apply": "Apply look",
				"role.media.applied": "Look applied: {name}",
				"role.media.tooBig": "Over 32 MiB, ignored: {names}",
				"role.media.empty": "No usable media in the local library yet; upload an image or video first.",
				"role.life.title": "Life rhythm",
				"role.life.quiet": "Quiet hours",
				"role.life.quietOn": "Enabled",
				"role.life.start": "Start",
				"role.life.end": "End",
				"role.life.budget": "Proactive bubbles per day",
				"role.life.wake": "Wake",
				"role.life.sleep": "Sleep",
				"role.life.virtual": "Virtual clock offset (minutes)",
				"role.life.apply": "Save rhythm",
				"role.life.saved": "Saved.",
				"role.life.status": "Now {period} · proactive today {used}/{cap} · {quiet}",
				"role.life.quietActive": "quiet",
				"role.life.quietOff": "open",
				"role.life.deferred": "Deferred duty reminders: {n}",
				"role.glass.title": "Liquid glass",
				"role.glass.hint": "A liquid-glass pass between wallpaper and UI. Real is the clearest, soft the safest, frosted the quietest; degrades automatically on low power or 15fps.",
				"role.glass.off": "Off",
				"role.glass.frosted": "Frosted",
				"role.glass.soft": "Soft",
				"role.glass.real": "Real",
				"role.glass.applied": "Depth: {depth} (effective {effective})",
				"role.memory.title": "Memory & focus",
				"role.memory.stats": "Interactions {interactions} · pats {pats} · feeds {feeds} · play {plays} · streak {streak}d",
				"role.memory.lastSeen": "Last seen: {time}",
				"role.focus.start": "Start 25m focus",
				"role.focus.stop": "Stop focus",
				"role.focus.active": "Focused, {minutes}m left",
				"role.focus.idle": "Not focusing",
				"role.memory.hint": "The character stays quiet while you focus; duty bubbles (approvals) are unaffected.",
			},
		});

		const ROLE_PAGE_ID = "tianlight-role";
		const ROLE_GLASS_LABEL_KEYS = { off: "role.glass.off", frosted: "role.glass.frosted", soft: "role.glass.soft", real: "role.glass.real" };

		function roleLifeStatus() {
			try {
				return globalThis.tianlightLife?.status?.() ?? null;
			} catch (error) {
				note("role-life:status", error);
				return null;
			}
		}

		function roleGlassDepth() {
			try {
				if (glassDepthController === null) return { depth: "off", effective: "off" };
				return { depth: glassDepthController.read(), effective: glassDepthController.effective() };
			} catch (error) {
				note("role-life:glass", error);
				return { depth: "off", effective: "off" };
			}
		}

		function formatWhen(value) {
			if (!value) return "—";
			try {
				const date = new Date(value);
				if (Number.isNaN(date.getTime())) return "—";
				return date.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
			} catch {
				return "—";
			}
		}

		function RoleSettingsPage() {
			const ReactImpl = React;
			const h = ReactImpl.createElement;
			const [status, setStatus] = React.useState(() => roleLifeStatus());
			const [glass, setGlass] = React.useState(() => roleGlassDepth());
			const [mediaState, setMediaState] = React.useState(null);
			const [mediaId, setMediaId] = React.useState(() => {
				try {
					return globalThis.localStorage?.getItem("tianlight.petMedia.v1") ?? "default";
				} catch {
					return "default";
				}
			});
			const [notice, setNotice] = React.useState("");
			const [busy, setBusy] = React.useState(false);
			const [quietEnabled, setQuietEnabled] = React.useState(() => roleLifeStatus()?.config?.quiet?.enabled !== false);
			const [quietStart, setQuietStart] = React.useState(() => roleLifeStatus()?.config?.quiet?.start ?? "23:00");
			const [quietEnd, setQuietEnd] = React.useState(() => roleLifeStatus()?.config?.quiet?.end ?? "08:00");
			const [budgetDaily, setBudgetDaily] = React.useState(() => roleLifeStatus()?.config?.cap ?? 6);
			const [wake, setWake] = React.useState(() => roleLifeStatus()?.config?.wake ?? "08:00");
			const [sleep, setSleep] = React.useState(() => roleLifeStatus()?.config?.sleep ?? "23:00");
			const [virtualOffset, setVirtualOffset] = React.useState(() => roleLifeStatus()?.config?.virtualOffsetMinutes ?? 0);

			const refresh = () => {
				const next = roleLifeStatus();
				setStatus(next);
				setGlass(roleGlassDepth());
				if (next?.config !== undefined) {
					setQuietEnabled(next.config.quiet?.enabled !== false);
					setQuietStart(next.config.quiet?.start ?? "23:00");
					setQuietEnd(next.config.quiet?.end ?? "08:00");
					setBudgetDaily(next.config.cap ?? 6);
					setWake(next.config.wake ?? "08:00");
					setSleep(next.config.sleep ?? "23:00");
					setVirtualOffset(next.config.virtualOffsetMinutes ?? 0);
				}
			};

			React.useEffect(() => {
				let alive = true;
				const loadMedia = async () => {
					try {
						const result = await globalThis.tianlightLife?.listMedia?.();
						if (alive && result !== undefined) setMediaState(result);
					} catch (error) {
						if (alive) setMediaState({ items: [], rejected: [], error: String(error?.message ?? error) });
					}
				};
				void loadMedia();
				const timer = window.setInterval(() => {
					if (!alive) return;
					refresh();
				}, 4000);
				return () => {
					alive = false;
					window.clearInterval(timer);
				};
			}, []);

			const applyMedia = async () => {
				setBusy(true);
				try {
					const result = await globalThis.tianlightLife?.setMedia?.(mediaId === "default" ? null : mediaId);
					if (result?.ok === true) setNotice(TL_T("role.media.applied", { name: result.media?.name ?? mediaId }));
					else if (result?.reason === "unknown-media") setNotice(TL_T("role.media.empty"));
					else setNotice(TL_T("role.media.empty"));
				} catch (error) {
					setNotice(String(error?.message ?? error));
				} finally {
					setBusy(false);
					refresh();
				}
			};
			const applyLife = () => {
				try {
					globalThis.tianlightLife?.configure?.({
						quiet: { enabled: quietEnabled, start: quietStart, end: quietEnd },
						budgetDaily: Number(budgetDaily),
						wake,
						sleep,
						virtualOffsetMinutes: Number(virtualOffset),
					});
					setNotice(TL_T("role.life.saved"));
				} catch (error) {
					setNotice(String(error?.message ?? error));
				}
				refresh();
			};
			const applyGlass = (next) => {
				try {
					glassDepthController?.apply?.(next);
					setGlass(roleGlassDepth());
					setNotice(TL_T("role.glass.applied", { depth: TL_T(ROLE_GLASS_LABEL_KEYS[next]), effective: roleGlassDepth().effective }));
				} catch (error) {
					setNotice(String(error?.message ?? error));
				}
			};
			const focusAction = () => {
				try {
					const active = globalThis.tianlightLife?.focusStatus?.()?.active === true;
					if (active) globalThis.tianlightLife?.focusStop?.();
					else globalThis.tianlightLife?.focusStart?.(25);
				} catch (error) {
					setNotice(String(error?.message ?? error));
				}
				refresh();
			};
			const life = status;
			const memory = life?.memory ?? {};
			const focus = life?.focus ?? {};
			const quiet = life?.quiet === true;
			const deferred = life?.deferredCount ?? 0;
			const mediaItems = mediaState?.items ?? [];
			const rejected = mediaState?.rejected ?? [];
			const glassLevels = ["off", "frosted", "soft", "real"];
			return h(
				"div",
				{ className: "tl-role-page" },
				h("h3", null, TL_T("role.title")),
				h("p", null, TL_T("role.intro")),
				notice === "" ? null : h("p", { className: "tl-role-note", role: "status" }, notice),
				// ---- pet media ----
				h(
					"div",
					{ className: "tl-role-card" },
					h("h3", null, TL_T("role.media.title")),
					h("p", null, TL_T("role.media.hint")),
					h(
						"div",
						{ className: "tl-role-row" },
						h("label", null, TL_T("role.media.default")),
						h(
							"select",
							{ value: mediaId, onChange: (event) => setMediaId(event.target.value), "aria-label": TL_T("role.media.title") },
							mediaItems.map((item) =>
								h(
									"option",
									{ key: item.id, value: item.id },
									item.bytes === null ? item.name : `${item.name} · ${Math.round(item.bytes / 1024)} KB · ${item.kind}`,
								),
							),
						),
						h("button", { type: "button", disabled: busy, onClick: () => void applyMedia() }, TL_T("role.media.apply")),
					),
					rejected.length === 0
						? null
						: h("p", { className: "tl-role-note" }, TL_T("role.media.tooBig", { names: rejected.map((item) => item.name).join(", ") })),
					mediaItems.length === 0 ? h("p", { className: "tl-role-note" }, TL_T("role.media.empty")) : null,
				),
				// ---- life rhythm ----
				h(
					"div",
					{ className: "tl-role-card" },
					h("h3", null, TL_T("role.life.title")),
					h(
						"p",
						null,
						TL_T("role.life.status", {
							period: life?.period ?? "—",
							used: life?.budget?.used ?? 0,
							cap: life?.budget?.cap ?? budgetDaily,
							quiet: quiet ? TL_T("role.life.quietActive") : TL_T("role.life.quietOff"),
						}),
					),
					h(
						"div",
						{ className: "tl-role-row" },
						h("label", null, TL_T("role.life.quiet")),
						h("input", { type: "checkbox", checked: quietEnabled, onChange: (event) => setQuietEnabled(event.target.checked) }),
						h("span", null, TL_T("role.life.quietOn")),
						h("input", { type: "time", value: quietStart, onChange: (event) => setQuietStart(event.target.value), "aria-label": TL_T("role.life.start") }),
						h("span", null, "→"),
						h("input", { type: "time", value: quietEnd, onChange: (event) => setQuietEnd(event.target.value), "aria-label": TL_T("role.life.end") }),
					),
					h(
						"div",
						{ className: "tl-role-row" },
						h("label", null, TL_T("role.life.budget")),
						h("input", { type: "number", min: 0, max: 20, step: 1, value: budgetDaily, onChange: (event) => setBudgetDaily(event.target.value) }),
						h("label", null, TL_T("role.life.wake")),
						h("input", { type: "time", value: wake, onChange: (event) => setWake(event.target.value) }),
						h("label", null, TL_T("role.life.sleep")),
						h("input", { type: "time", value: sleep, onChange: (event) => setSleep(event.target.value) }),
					),
					h(
						"div",
						{ className: "tl-role-row" },
						h("label", null, TL_T("role.life.virtual")),
						h("input", { type: "number", min: -720, max: 720, step: 15, value: virtualOffset, onChange: (event) => setVirtualOffset(event.target.value) }),
						h("button", { type: "button", onClick: applyLife }, TL_T("role.life.apply")),
					),
					deferred > 0 ? h("p", { className: "tl-role-note" }, TL_T("role.life.deferred", { n: deferred })) : null,
				),
				// ---- liquid glass ----
				h(
					"div",
					{ className: "tl-role-card" },
					h("h3", null, TL_T("role.glass.title")),
					h("p", null, TL_T("role.glass.hint")),
					h(
						"div",
						{ className: "tl-role-choices" },
						glassLevels.map((level) =>
							h(
								"button",
								{
									key: level,
									type: "button",
									"data-active": glass.depth === level ? "" : undefined,
									"aria-pressed": glass.depth === level,
									onClick: () => applyGlass(level),
								},
								TL_T(ROLE_GLASS_LABEL_KEYS[level]),
							),
						),
					),
					h("p", { className: "tl-role-note" }, TL_T("role.glass.applied", { depth: TL_T(ROLE_GLASS_LABEL_KEYS[glass.depth]), effective: glass.effective })),
				),
				// ---- memory + focus ----
				h(
					"div",
					{ className: "tl-role-card" },
					h("h3", null, TL_T("role.memory.title")),
					h(
						"div",
						{ className: "tl-role-stats" },
						h("span", null, TL_T("role.memory.stats", {
							interactions: memory.interactions ?? 0,
							pats: memory.pats ?? 0,
							feeds: memory.feeds ?? 0,
							plays: memory.plays ?? 0,
							streak: memory.streakDays ?? 0,
						})),
						h("span", null, TL_T("role.memory.lastSeen", { time: formatWhen(memory.lastSeenAt) })),
					),
					h("p", null, TL_T("role.memory.hint")),
					h(
						"div",
						{ className: "tl-role-row" },
						h("span", null, focus.active === true ? TL_T("role.focus.active", { minutes: Math.max(0, Math.round((focus.endsAt - Date.now()) / 60000)) }) : TL_T("role.focus.idle")),
						h("button", { type: "button", onClick: focusAction }, focus.active === true ? TL_T("role.focus.stop") : TL_T("role.focus.start")),
					),
				),
			);
		}

		/**
		 * Register the role page in DSH settings. Missing slots/React => no page,
		 * everything else (pet, life API, duty channel) keeps working.
		 */
		function installLifeSettings(ctx) {
			if (React === null) {
				note("role-life:no-react", {});
				return () => {};
			}
			if (ctx === undefined || ctx === null || typeof ctx.inject !== "function") {
				note("role-life:no-ctx", {});
				return () => {};
			}
			let dispose = () => {};
			try {
				const injected = ctx.inject(["slots"], (scoped) => {
					const scopedSlots = scoped !== null && scoped !== undefined && typeof scoped.get === "function" ? scoped.get("slots") : undefined;
					const slots = scopedSlots !== undefined && scopedSlots !== null ? scopedSlots : scoped?.slots;
					if (slots === undefined || slots === null || typeof slots.register !== "function") {
						note("role-life:no-slots", {});
						return () => {};
					}
					const disposers = [];
					try {
						disposers.push(
							slots.inject("settings.section", () =>
								slots.register(
									{ name: "settings.section", id: ROLE_PAGE_ID, order: 110, label: () => TL_T("role.section.label") },
									RoleSettingsPage,
								),
							),
						);
					} catch (error) {
						note("role-life:section-failed", error);
					}
					return () => {
						for (const entry of disposers) {
							try {
								if (typeof entry === "function") entry();
							} catch (error) {
								note("role-life:dispose", error);
							}
						}
					};
				});
				if (typeof injected === "function") dispose = injected;
			} catch (error) {
				note("role-life:inject-failed", error);
			}
			return () => {
				try {
					dispose();
				} catch (error) {
					note("role-life:dispose-failed", error);
				}
			};
		}
		//#endregion
		//#region font panel
		const FONT_STORAGE = "tianlight.font.family";
		/** Empty stack means "inherit the product font": clearing the property is the
		 *  only way to restore it without knowing the original value. */
		const FONT_FAMILIES = [
			{ id: "system", label: "系统", stack: "" },
			{ id: "serif", label: "衬线", stack: 'Georgia, "Songti SC", "Noto Serif SC", serif' },
			{ id: "round", label: "圆体", stack: '"PingFang SC", "HarmonyOS Sans SC", "MiSans", "Segoe UI", sans-serif' },
			{ id: "mono", label: "等宽", stack: 'Consolas, "SF Mono", "JetBrains Mono", monospace' },
		];

		const CODE_FAMILIES = [
			{ id: "system", label: "默认", stack: "" },
			{ id: "mono", label: "Mono", stack: '"SF Mono", "JetBrains Mono", "Fira Code", Consolas, monospace' },
			{ id: "consolas", label: "Consolas", stack: 'Consolas, "Courier New", monospace' },
		];
		const WEIGHTS = [
			{ id: "normal", label: "常规", value: "" },
			{ id: "medium", label: "中等", value: "500" },
			{ id: "bold", label: "加粗", value: "600" },
		];
		const LEADS = [
			{ id: "tight", label: "紧凑", value: "1.45" },
			{ id: "normal", label: "标准", value: "" },
			{ id: "loose", label: "宽松", value: "1.85" },
		];
		const TRACKS = [
			{ id: "tight", label: "紧凑", value: "-0.012em" },
			{ id: "normal", label: "标准", value: "" },
			{ id: "loose", label: "宽松", value: "0.02em" },
		];
		/** v0.5.0 正文衬线预设：只作用于消息正文，不碰界面骨架。 */
		const READING_FAMILIES = [
			{ id: "system", label: "系统", stack: "" },
			{ id: "serif", label: "衬线", stack: 'Georgia, "Songti SC", "Noto Serif SC", "Songti TC", serif' },
		];
		/**
		 * v0.5.0 模型：旧字段（size/ui/code/weight/lead/track）原样保留，新增
		 * width/para/codeSize/serif。旧存档只有前六个字段，读取时缺省补默认值，
		 * 因此 v0.4 的 `tianlight.font.family` 可以无缝升级。
		 */
		const TYPO_DEFAULTS = {
			size: 14,
			ui: "system",
			code: "system",
			weight: "normal",
			lead: "normal",
			track: "normal",
			width: 860,
			para: 0.5,
			codeSize: 13,
			serif: "system",
		};
		const TYPO_WIDTH_MIN = 640;
		const TYPO_WIDTH_MAX = 1400;
		const TYPO_PARA_MIN = 0;
		const TYPO_PARA_MAX = 1.5;
		const TYPO_CODE_SIZE_MIN = 11;
		const TYPO_CODE_SIZE_MAX = 18;

		registerTl5Strings({
			zh: {
				"typo.title": "字体",
				"typo.subtitle": "{size}px · 界面 {ui} · 代码 {code}",
				"typo.close": "关闭字体面板",
				"typo.trigger": "字体设置（Alt+T）",
				"typo.preview": "夜色温柔 · Aa 0123",
				"typo.previewNote": "字重 {weight} · 行距 {lead} · 字距 {track}",
				"typo.section.size": "字号",
				"typo.section.family": "字族",
				"typo.section.typeset": "排版",
				"typo.section.content": "内容排版",
				"typo.section.readability": "可读性",
				"typo.uiSize": "界面字号",
				"typo.uiFamily": "界面",
				"typo.codeFamily": "代码",
				"typo.weight": "字重",
				"typo.lead": "行距",
				"typo.track": "字距",
				"typo.width": "内容宽度",
				"typo.para": "段落间距",
				"typo.codeSize": "代码字号",
				"typo.reading": "正文衬线",
				"typo.reset": "恢复默认",
				"typo.slider.size": "字号",
				"typo.slider.width": "内容宽度",
				"typo.slider.para": "段落间距",
				"typo.slider.codeSize": "代码字号",
				"typo.family.system": "系统",
				"typo.family.serif": "衬线",
				"typo.family.round": "圆体",
				"typo.family.mono": "等宽",
				"typo.codeFamily.system": "默认",
				"typo.codeFamily.mono": "Mono",
				"typo.codeFamily.consolas": "Consolas",
				"typo.weight.normal": "常规",
				"typo.weight.medium": "中等",
				"typo.weight.bold": "加粗",
				"typo.lead.tight": "紧凑",
				"typo.lead.normal": "标准",
				"typo.lead.loose": "宽松",
				"typo.track.tight": "紧凑",
				"typo.track.normal": "标准",
				"typo.track.loose": "宽松",
				"typo.reading.system": "系统",
				"typo.reading.serif": "衬线",
			},
			en: {
				"typo.title": "Typography",
				"typo.subtitle": "{size}px · UI {ui} · Code {code}",
				"typo.close": "Close typography panel",
				"typo.trigger": "Typography settings (Alt+T)",
				"typo.preview": "Night light · Aa 0123",
				"typo.previewNote": "Weight {weight} · Leading {lead} · Tracking {track}",
				"typo.section.size": "Size",
				"typo.section.family": "Family",
				"typo.section.typeset": "Typesetting",
				"typo.section.content": "Content layout",
				"typo.section.readability": "Readability",
				"typo.uiSize": "UI size",
				"typo.uiFamily": "UI",
				"typo.codeFamily": "Code",
				"typo.weight": "Weight",
				"typo.lead": "Leading",
				"typo.track": "Tracking",
				"typo.width": "Content width",
				"typo.para": "Paragraph gap",
				"typo.codeSize": "Code size",
				"typo.reading": "Reading serif",
				"typo.reset": "Reset",
				"typo.slider.size": "Font size",
				"typo.slider.width": "Content width",
				"typo.slider.para": "Paragraph spacing",
				"typo.slider.codeSize": "Code font size",
				"typo.family.system": "System",
				"typo.family.serif": "Serif",
				"typo.family.round": "Rounded",
				"typo.family.mono": "Monospace",
				"typo.codeFamily.system": "Default",
				"typo.codeFamily.mono": "Mono",
				"typo.codeFamily.consolas": "Consolas",
				"typo.weight.normal": "Regular",
				"typo.weight.medium": "Medium",
				"typo.weight.bold": "Semibold",
				"typo.lead.tight": "Tight",
				"typo.lead.normal": "Normal",
				"typo.lead.loose": "Loose",
				"typo.track.tight": "Tight",
				"typo.track.normal": "Normal",
				"typo.track.loose": "Loose",
				"typo.reading.system": "System",
				"typo.reading.serif": "Serif",
			},
		});

		/**
		 * D4 内容排版样式：只作用于桥接盖章的消息气泡与其 pre/code，
		 * 不改变界面骨架。变量由 applyTypography 写在 body 上，
		 * 未设置时回落到这里的默认值。
		 */
		registerTl5Css(String.raw`
body[data-dsh-tianlight] {
	--tl-content-width: 860px;
	--tl-para-gap: 0.5em;
	--tl-code-size: 13px;
	--tl-reading-family: inherit;
}
body[data-dsh-tianlight] [data-tl-bubble] {
	max-width: var(--tl-content-width);
	font-family: var(--tl-reading-family);
}
body[data-dsh-tianlight] [data-tl-bubble] p,
body[data-dsh-tianlight] [data-tl-bubble] ul,
body[data-dsh-tianlight] [data-tl-bubble] ol,
body[data-dsh-tianlight] [data-tl-bubble] blockquote,
body[data-dsh-tianlight] [data-tl-bubble] pre {
	margin-block: calc(var(--tl-para-gap) * 0.5);
}
body[data-dsh-tianlight] [data-tl-bubble] pre,
body[data-dsh-tianlight] [data-tl-bubble] code {
	font-size: var(--tl-code-size);
}
`);

		function clampTypographyNumber(value, min, max) {
			if (!Number.isFinite(value)) return null;
			return Math.min(max, Math.max(min, value));
		}

		/**
		 * 归一化一个（可能来自旧存档或配方的）排版模型。未知字段忽略，
		 * 缺失字段补默认值，数值全部夹到面板滑杆范围内，保证 UI 与 CSS 一致。
		 */
		function normalizeTypography(model) {
			const source = model !== null && typeof model === "object" ? model : {};
			const next = { ...TYPO_DEFAULTS };
			const size = clampTypographyNumber(source.size, 12, 22);
			if (size !== null) next.size = Math.round(size);
			if (FONT_FAMILIES.some((item) => item.id === source.ui)) next.ui = source.ui;
			if (CODE_FAMILIES.some((item) => item.id === source.code)) next.code = source.code;
			if (WEIGHTS.some((item) => item.id === source.weight)) next.weight = source.weight;
			if (LEADS.some((item) => item.id === source.lead)) next.lead = source.lead;
			if (TRACKS.some((item) => item.id === source.track)) next.track = source.track;
			const width = clampTypographyNumber(source.width, TYPO_WIDTH_MIN, TYPO_WIDTH_MAX);
			if (width !== null) next.width = Math.round(width);
			const para = clampTypographyNumber(source.para, TYPO_PARA_MIN, TYPO_PARA_MAX);
			if (para !== null) next.para = Math.round(para * 10) / 10;
			const codeSize = clampTypographyNumber(source.codeSize, TYPO_CODE_SIZE_MIN, TYPO_CODE_SIZE_MAX);
			if (codeSize !== null) next.codeSize = Math.round(codeSize);
			if (READING_FAMILIES.some((item) => item.id === source.serif)) next.serif = source.serif;
			return next;
		}

		/** Reads the persisted model. Tolerates the legacy plain-string value. */
		function readTypography() {
			const model = { ...TYPO_DEFAULTS };
			let raw = null;
			try {
				raw = globalThis.localStorage.getItem(FONT_STORAGE);
			} catch {
				return model;
			}
			if (raw === null || raw === "") return model;
			let saved = null;
			try {
				saved = JSON.parse(raw);
			} catch {
				saved = null;
			}
			if (saved === null || typeof saved !== "object") {
				// legacy format: just the family id
				if (FONT_FAMILIES.some((item) => item.id === raw)) model.ui = raw;
				return model;
			}
			return normalizeTypography(saved);
		}

		/**
		 * Undoes every inline style the panel wrote. Without this the chosen family and
		 * weight survive skin teardown: the CSS is scoped by the body attribute, an inline
		 * style is not, so the page would keep the font after the skin is switched off.
		 */
		function clearTypography() {
			const body = document.body;
			if (body !== null) {
				body.style.removeProperty("--dsw-font-family");
				body.style.removeProperty("--ds-font-family-code");
				body.style.removeProperty("--tl-content-width");
				body.style.removeProperty("--tl-para-gap");
				body.style.removeProperty("--tl-code-size");
				body.style.removeProperty("--tl-reading-family");
			}
			const root = document.getElementById("root");
			if (root !== null) {
				root.style.removeProperty("font-weight");
				root.style.removeProperty("line-height");
				root.style.removeProperty("letter-spacing");
			}
		}

		/**
		 * Applies the whole model. Families and size are real APIs (a CSS variable and
		 * theme.setFontSize); weight/leading/tracking are inline on #root with an empty
		 * string meaning "inherit", which restores the product values without knowing
		 * them. The v0.5.0 content fields (width/para/codeSize/reading serif) are CSS
		 * variables consumed only under [data-tl-bubble], so the app skeleton keeps the
		 * product layout. `theme` is optional so a missing service still leaves families
		 * working. Signature kept compatible with v0.4.0 callers.
		 */
		function applyTypography(theme, model, persist) {
			const next = normalizeTypography(model);
			const ui = FONT_FAMILIES.find((item) => item.id === next.ui) ?? FONT_FAMILIES[0];
			const code = CODE_FAMILIES.find((item) => item.id === next.code) ?? CODE_FAMILIES[0];
			const reading = READING_FAMILIES.find((item) => item.id === next.serif) ?? READING_FAMILIES[0];
			const body = document.body;
			if (body !== null) {
				if (ui.stack === "") body.style.removeProperty("--dsw-font-family");
				else body.style.setProperty("--dsw-font-family", ui.stack);
				if (code.stack === "") body.style.removeProperty("--ds-font-family-code");
				else body.style.setProperty("--ds-font-family-code", code.stack);
				body.style.setProperty("--tl-content-width", next.width + "px");
				body.style.setProperty("--tl-para-gap", next.para + "em");
				body.style.setProperty("--tl-code-size", next.codeSize + "px");
				if (reading.stack === "") body.style.removeProperty("--tl-reading-family");
				else body.style.setProperty("--tl-reading-family", reading.stack);
			}
			const root = document.getElementById("root");
			if (root !== null) {
				root.style.fontWeight = (WEIGHTS.find((item) => item.id === next.weight) ?? WEIGHTS[0]).value;
				root.style.lineHeight = (LEADS.find((item) => item.id === next.lead) ?? LEADS[0]).value;
				root.style.letterSpacing = (TRACKS.find((item) => item.id === next.track) ?? TRACKS[0]).value;
			}
			if (theme !== undefined && typeof theme.setFontSize === "function") {
				try {
					theme.setFontSize(next.size);
				} catch {
					// the host may clamp or refuse; the stored value stays authoritative
				}
			}
			if (persist !== false) {
				try {
					globalThis.localStorage.setItem(FONT_STORAGE, JSON.stringify(next));
				} catch {
					// a failed write must never break the panel
				}
			}
			return next;
		}

		/**
		 * Font settings, docked to the right edge and owned by the skin.
		 *
		 * The right-sidebar tab path was dropped deliberately: registering a tab type
		 * and opening it needs internal controller contracts whose shape is not part of
		 * any published API, and it silently opened nothing. This host has no such
		 * dependency — the trigger button toggles it, react-dom/client renders the same
		 * component into it, and disposing the effect removes the host entirely.
		 * A missing react-dom/client or theme service degrades to no panel, never to a
		 * broken skin: every step is guarded.
		 */
		function installFontPanel(ctx) {
			if (React === null || typeof ctx.inject !== "function") return () => {};
			const theme = ctx.get("theme");

			// Restore only what the user saved. Seeding size from theme.fontSize matters:
			// writing the default 14 over a product-level 16 would silently change the
			// host setting on every skin load.
			let stored = null;
			try {
				stored = globalThis.localStorage.getItem(FONT_STORAGE);
			} catch {
				stored = null;
			}
			const initial = readTypography();
			if (stored === null && theme !== undefined && typeof theme.fontSize === "number") {
				initial.size = Math.min(22, Math.max(12, Math.round(theme.fontSize)));
			}
			applyTypography(theme, initial, false);

			const FontPanel = (props) => {
				const { t } = useTl5I18n();
				const [model, setModel] = React.useState(() => readTypography());
				const [legibility, setLegibility] = React.useState(() => legibilityController.snapshot());
				React.useEffect(() => legibilityController.subscribe(setLegibility), []);
				const tr = (key, fallback) => {
					const value = t(key);
					return value === key ? fallback : value;
				};
				const update = (patch) => {
					setModel((current) => {
						const next = { ...current, ...patch };
						applyTypography(theme, next, true);
						return next;
					});
				};
				const updateLegibility = (patch) => {
					legibilityController.apply(patch);
					setLegibility(legibilityController.snapshot());
				};
				const labelOf = (list, item, prefix) => (item === undefined ? "" : tr(prefix + "." + item.id, item.label));
				const optionLabel = (list, id, prefix) =>
					labelOf(list, list.find((item) => item.id === id) ?? list[0], prefix);
				const pills = (list, activeId, onPick, prefix) =>
					list.map((item) =>
						React.createElement(
							"button",
							{
								key: item.id,
								type: "button",
								className: "tl-font-option",
								"data-active": item.id === activeId ? "" : undefined,
								"aria-pressed": item.id === activeId ? "true" : "false",
								onClick: () => onPick(item.id),
							},
							labelOf(list, item, prefix),
						),
					);
				const row = (label, content) =>
					React.createElement(
						"div",
						{ className: "tl-font-row" },
						React.createElement("span", { className: "tl-font-label" }, label),
						content,
					);
				const section = (title, ...children) =>
					React.createElement(
						"div",
						{ className: "tl-font-section" },
						React.createElement("div", { className: "tl-font-section-title" }, title),
						...children,
					);
				// Progress is painted straight into the track gradient: range inputs expose
				// no ::-webkit-slider-progress, and an inline gradient needs no extra state
				// or custom property (which the audit would have to whitelist).
				const sliderStyle = (value, min, max) => {
					const percent = Math.round(((value - min) / (max - min)) * 100);
					return {
						background:
							"linear-gradient(90deg, var(--tl-accent) 0%, color-mix(in srgb, var(--tl-accent) 45%, #ffffff) " +
							percent +
							"%, rgba(255, 255, 255, 0.16) " +
							percent +
							"%, rgba(255, 255, 255, 0.16) 100%)",
					};
				};
				const slider = (attributes) =>
					React.createElement(
						"div",
						{ className: "tl-font-slider" },
						React.createElement("input", {
							type: "range",
							min: attributes.min,
							max: attributes.max,
							step: attributes.step,
							value: attributes.value,
							className: "tl-font-range",
							"data-tl-field": attributes.field,
							"aria-label": attributes.label,
							style: sliderStyle(attributes.value, attributes.min, attributes.max),
							onChange: attributes.onChange,
						}),
						React.createElement("span", { className: "tl-font-value" }, attributes.valueText),
					);
				const legibilityStatus =
					legibility.sampled !== true
						? t("legibility.statusIdle")
						: legibility.boosted === true
							? t("legibility.statusBoosted", { ratio: legibility.ratio, threshold: legibility.threshold })
							: t("legibility.status", { ratio: legibility.ratio, threshold: legibility.threshold });
				const legibilityProgress = Math.round(
					((legibility.threshold - LEGIBILITY_THRESHOLD_MIN) / (LEGIBILITY_THRESHOLD_MAX - LEGIBILITY_THRESHOLD_MIN)) *
						100,
				);
				return React.createElement(
					"div",
					{ className: "tl-font-panel" },
					React.createElement(
						"div",
						{ className: "tl-font-head", "data-tl-font-drag": "" },
						React.createElement(
							"div",
							{ className: "tl-font-heading" },
							React.createElement("div", { className: "tl-font-title" }, t("typo.title")),
							React.createElement(
								"div",
								{ className: "tl-font-subtitle" },
								t("typo.subtitle", {
									size: model.size,
									ui: optionLabel(FONT_FAMILIES, model.ui, "typo.family"),
									code: optionLabel(CODE_FAMILIES, model.code, "typo.codeFamily"),
								}),
							),
						),
						React.createElement(
							"button",
							{
								type: "button",
								className: "tl-font-close",
								"data-tl-font-close": "",
								"aria-label": t("typo.close"),
								onClick: () => {
									if (props !== undefined && typeof props.onClose === "function") props.onClose();
								},
							},
							"\u00d7",
						),
					),
					React.createElement(
						"div",
						{ className: "tl-font-preview", style: { fontSize: model.size + "px" } },
						React.createElement("div", { className: "tl-font-preview-line" }, t("typo.preview")),
						React.createElement(
							"div",
							{ className: "tl-font-preview-note" },
							t("typo.previewNote", {
								weight: optionLabel(WEIGHTS, model.weight, "typo.weight"),
								lead: optionLabel(LEADS, model.lead, "typo.lead"),
								track: optionLabel(TRACKS, model.track, "typo.track"),
							}),
						),
					),
					section(
						t("typo.section.size"),
						row(
							t("typo.uiSize"),
							slider({
								field: "size",
								min: 12,
								max: 22,
								step: 1,
								value: model.size,
								label: t("typo.slider.size"),
								valueText: model.size + " px",
								onChange: (event) => update({ size: Number(event.target.value) }),
							}),
						),
					),
					section(
						t("typo.section.family"),
						row(
							t("typo.uiFamily"),
							React.createElement(
								"div",
								{ className: "tl-font-options", "data-tl-typo-ui": "" },
								pills(FONT_FAMILIES, model.ui, (id) => update({ ui: id }), "typo.family"),
							),
						),
						row(
							t("typo.codeFamily"),
							React.createElement(
								"div",
								{ className: "tl-font-options", "data-tl-typo-code": "" },
								pills(CODE_FAMILIES, model.code, (id) => update({ code: id }), "typo.codeFamily"),
							),
						),
					),
					section(
						t("typo.section.typeset"),
						row(
							t("typo.weight"),
							React.createElement(
								"div",
								{ className: "tl-font-options", "data-tl-typo-weight": "" },
								pills(WEIGHTS, model.weight, (id) => update({ weight: id }), "typo.weight"),
							),
						),
						row(
							t("typo.lead"),
							React.createElement(
								"div",
								{ className: "tl-font-options", "data-tl-typo-lead": "" },
								pills(LEADS, model.lead, (id) => update({ lead: id }), "typo.lead"),
							),
						),
						row(
							t("typo.track"),
							React.createElement(
								"div",
								{ className: "tl-font-options", "data-tl-typo-track": "" },
								pills(TRACKS, model.track, (id) => update({ track: id }), "typo.track"),
							),
						),
					),
					// ---- v0.5.0 content-only typography (messages & code) ----
					section(
						t("typo.section.content"),
						row(
							t("typo.width"),
							slider({
								field: "width",
								min: TYPO_WIDTH_MIN,
								max: TYPO_WIDTH_MAX,
								step: 20,
								value: model.width,
								label: t("typo.slider.width"),
								valueText: model.width + " px",
								onChange: (event) => update({ width: Number(event.target.value) }),
							}),
						),
						row(
							t("typo.para"),
							slider({
								field: "para",
								min: TYPO_PARA_MIN,
								max: TYPO_PARA_MAX,
								step: 0.1,
								value: model.para,
								label: t("typo.slider.para"),
								valueText: model.para + " em",
								onChange: (event) => update({ para: Number(event.target.value) }),
							}),
						),
						row(
							t("typo.codeSize"),
							slider({
								field: "codeSize",
								min: TYPO_CODE_SIZE_MIN,
								max: TYPO_CODE_SIZE_MAX,
								step: 1,
								value: model.codeSize,
								label: t("typo.slider.codeSize"),
								valueText: model.codeSize + " px",
								onChange: (event) => update({ codeSize: Number(event.target.value) }),
							}),
						),
						row(
							t("typo.reading"),
							React.createElement(
								"div",
								{ className: "tl-font-options", "data-tl-typo-serif": "" },
								pills(READING_FAMILIES, model.serif, (id) => update({ serif: id }), "typo.reading"),
							),
						),
					),
					// ---- v0.5.0 readability guard settings (D5) ----
					section(
						t("legibility.title"),
						row(
							t("legibility.guard"),
							React.createElement(
								"div",
								{ className: "tl-font-options", "data-tl-legibility-toggle": "" },
								React.createElement(
									"button",
									{
										type: "button",
										className: "tl-font-option",
										"data-active": legibility.enabled === true ? "" : undefined,
										"aria-pressed": legibility.enabled === true ? "true" : "false",
										onClick: () => updateLegibility({ enabled: true }),
									},
									t("common.on"),
								),
								React.createElement(
									"button",
									{
										type: "button",
										className: "tl-font-option",
										"data-active": legibility.enabled === true ? undefined : "",
										"aria-pressed": legibility.enabled === true ? "false" : "true",
										onClick: () => updateLegibility({ enabled: false }),
									},
									t("common.off"),
								),
							),
						),
						row(
							t("legibility.threshold"),
							slider({
								field: "legibility-threshold",
								min: LEGIBILITY_THRESHOLD_MIN,
								max: LEGIBILITY_THRESHOLD_MAX,
								step: 0.5,
								value: legibility.threshold,
								label: t("legibility.threshold"),
								valueText: legibility.threshold + ":1",
								onChange: (event) => updateLegibility({ threshold: Number(event.target.value) }),
							}),
						),
						React.createElement("p", { className: "tl-wall-hint", "data-tl-legibility-status": "" }, legibilityStatus),
						React.createElement("p", { className: "tl-wall-hint" }, t("legibility.hint")),
					),
					// ---- reset ----
					React.createElement(
						"button",
						{
							type: "button",
							className: "tl-font-reset",
							onClick: () => {
								const reset = { ...TYPO_DEFAULTS };
								setModel(reset);
								applyTypography(theme, reset, true);
							},
						},
						t("typo.reset"),
					),
				);
			};

			const FontButton = () => {
				const { t } = useTl5I18n();
				return React.createElement(
					"button",
					{
						type: "button",
						className: "tl-font-trigger",
						title: t("typo.trigger"),
						"aria-label": t("typo.trigger"),
						"aria-keyshortcuts": "Alt+T",
						"aria-haspopup": "dialog",
						onClick: () => {
							toggleOverlay();
						},
					},
					"Aa",
				);
			};

			// Self-owned host, docked to the right edge and rendered with the same
			// component. The right-sidebar tab path depends on internal controller
			// contracts whose shape is not guaranteed across builds, and a settings
			// panel that silently opens nothing is worse than one the skin docks itself.
			let overlayRoot = null;
			const host = document.createElement("div");
			host.setAttribute("data-tl-font-panel", "");
			host.hidden = true;
			if (document.body !== null) document.body.appendChild(host);

			// Drag by the header only: buttons inside the body keep their own clicks.
			// Position switches from the CSS `right` anchor to left/top on first grab so
			// the panel never jumps when the viewport is resized mid-drag.
			const DRAG_STORAGE = "tianlight.font.position";
			let drag = null;
			try {
				const saved = JSON.parse(globalThis.localStorage.getItem(DRAG_STORAGE) ?? "null");
				if (saved !== null && Number.isFinite(saved.left) && Number.isFinite(saved.top)) {
					host.style.right = "auto";
					host.style.left = Math.max(0, saved.left) + "px";
					host.style.top = Math.max(0, saved.top) + "px";
				}
			} catch {
				// a corrupt position must not stop the panel from opening
			}
			const onDragStart = (event) => {
				const target = event.target;
				const handle = target instanceof Element ? target.closest("[data-tl-font-drag]") : null;
				if (handle === null) return;
				if (target instanceof Element && target.closest("[data-tl-font-close]") !== null) return;
				const rect = host.getBoundingClientRect();
				drag = { id: event.pointerId, dx: event.clientX - rect.left, dy: event.clientY - rect.top };
				host.style.right = "auto";
				host.style.left = rect.left + "px";
				host.style.top = rect.top + "px";
				host.setAttribute("data-tl-dragging", "");
				host.setPointerCapture?.(event.pointerId);
				event.preventDefault();
			};
			const onDragMove = (event) => {
				if (drag === null || event.pointerId !== drag.id) return;
				const maxLeft = Math.max(0, globalThis.innerWidth - host.offsetWidth);
				const maxTop = Math.max(0, globalThis.innerHeight - host.offsetHeight);
				host.style.left = Math.min(Math.max(0, event.clientX - drag.dx), maxLeft) + "px";
				host.style.top = Math.min(Math.max(0, event.clientY - drag.dy), maxTop) + "px";
			};
			const onDragEnd = (event) => {
				if (drag === null) return;
				host.releasePointerCapture?.(drag.id);
				drag = null;
				host.removeAttribute("data-tl-dragging");
				try {
					globalThis.localStorage.setItem(
						DRAG_STORAGE,
						JSON.stringify({ left: Math.round(host.offsetLeft), top: Math.round(host.offsetTop) }),
					);
				} catch {
					// position persistence is optional
				}
				if (event !== undefined) event.preventDefault?.();
			};
			host.addEventListener("pointerdown", onDragStart);
			host.addEventListener("pointermove", onDragMove);
			host.addEventListener("pointerup", onDragEnd);
			host.addEventListener("pointercancel", onDragEnd);
			const clampFontHost = () => {
				if (host.hidden || host.style.right !== "auto") return;
				const maxLeft = Math.max(0, globalThis.innerWidth - host.offsetWidth);
				const maxTop = Math.max(0, globalThis.innerHeight - host.offsetHeight);
				host.style.left = Math.min(maxLeft, Math.max(0, host.offsetLeft)) + "px";
				host.style.top = Math.min(maxTop, Math.max(0, host.offsetTop)) + "px";
			};
			window.addEventListener("resize", clampFontHost);
			// ---- wallpaper-adaptive palette ----
			// The wallpaper is same-origin, so drawing a frame into a canvas does not
			// taint it and getImageData stays legal. 32x18 pixels is enough to find the
			// dominant hue and costs nothing next to the video decode.
			const swatch = document.createElement("canvas");
			swatch.width = 32;
			swatch.height = 18;
			let swatchCtx = null;
			try {
				swatchCtx = swatch.getContext("2d", { willReadFrequently: true });
			} catch {
				swatchCtx = null;
			}
			let chromaTimer = 0;
			const adoptWallpaperPalette = () => {
				if (swatchCtx === null) return;
				const still = wallpaperController === null ? null : wallpaperController.image;
				const video = document.querySelector("[data-tl-scene] > video");
				// A still wallpaper is not a <video>: sample the loaded Image instead; the
				// shader snapshot is a same-origin 2D canvas and is sampled the same way.
				const shader = wallpaperController === null ? null : wallpaperController.shaderSwatch;
				const target =
					shader !== null && shader !== undefined
						? shader
						: still !== null && still !== undefined
							? still
							: video;
				if (target === null || target === undefined) return;
				if (target === video && video.readyState < 2) return;
				let data = null;
				try {
					swatchCtx.drawImage(target, 0, 0, swatch.width, swatch.height);
					data = swatchCtx.getImageData(0, 0, swatch.width, swatch.height).data;
				} catch {
					return;
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
					// Near-grey has no usable hue, and crushed pixels carry no design value.
					if (delta < 0.05 || light < 0.08 || light > 0.95) continue;
					const sat = light > 0.5 ? delta / (2 - max - min) : delta / (max + min);
					let hue;
					if (max === r) hue = ((g - b) / delta + (g < b ? 6 : 0)) * 60;
					else if (max === g) hue = ((b - r) / delta + 2) * 60;
					else hue = ((r - g) / delta + 4) * 60;
					const rad = (hue * Math.PI) / 180;
					// Weight the mid-tones: they carry the picture's character.
					const w = sat * (1 - Math.abs(light - 0.55) * 1.2);
					sin += Math.sin(rad) * w;
					cos += Math.cos(rad) * w;
					satSum += sat * w;
					lightSum += light * w;
					weight += w;
				}
				if (weight <= 0.001) return;
				// Circular mean: averaging hue linearly would break across 0/360.
				const hue = Math.round((((Math.atan2(sin, cos) * 180) / Math.PI) + 360) % 360);
				const sat = Math.min(0.70, Math.max(0.32, (satSum / weight) * 1.3));
				const light = lightSum / weight;
				const darkMode = document.body !== null && document.body.hasAttribute(DARK_ATTR);
				// Accent is lifted for contrast; the surface keeps the wallpaper's own
				// value so the panel feels lit by the same light source.
				const accentLight = darkMode ? 0.66 : 0.44;
				const fillLight = darkMode ? Math.min(0.20, 0.10 + light * 0.10) : Math.max(0.90, 0.94 + light * 0.04);
				host.style.setProperty("--tl-accent", "hsl(" + hue + " " + Math.round(sat * 100) + "% " + Math.round(accentLight * 100) + "%)");
				host.style.setProperty(
					"--tl-accent-soft",
					"hsl(" + hue + " " + Math.round(sat * 100) + "% " + Math.round(accentLight * 100) + "% / 0.18)",
				);
				host.style.setProperty(
					"--tl-line-strong",
					"hsl(" + hue + " " + Math.round(Math.min(0.5, sat) * 100) + "% " + Math.round((darkMode ? 0.62 : 0.42) * 100) + "% / 0.40)",
				);
				host.style.setProperty(
					"--tl-panel-fill",
					"hsl(" + hue + " " + Math.round(Math.min(0.42, sat * 0.55) * 100) + "% " + Math.round(fillLight * 100) + "% / calc(0.88 * var(--tl-glass-m, 1)))",
				);
			};
			const startChroma = () => {
				if (chromaTimer !== 0) return;
				adoptWallpaperPalette();
				// Re-sample while the panel is open: the wallpaper is a looping video, so
				// its colours drift and the panel should follow them.
				chromaTimer = globalThis.setInterval(adoptWallpaperPalette, 4000);
			};
			const stopChroma = () => {
				if (chromaTimer === 0) return;
				globalThis.clearInterval(chromaTimer);
				chromaTimer = 0;
			};

			const toggleOverlay = () => {
				host.hidden = !host.hidden;
				if (host.hidden) {
					// Closing mid-drag would leave the drag armed: the pointerup lands on a
					// hidden element, so the next reopen would follow the cursor without a
					// fresh grab.
					drag = null;
					host.removeAttribute("data-tl-dragging");
					stopChroma();
					return;
				}
				startChroma();
				clampFontHost();
				if (overlayRoot !== null) return;
				try {
					overlayRoot = require("react-dom/client").createRoot(host);
					overlayRoot.render(React.createElement(FontPanel, { onClose: toggleOverlay }));
				} catch {
					overlayRoot = null;
				}
			};

			const disposeSlots = ctx.inject(["slots"], (scoped) => {
				const slots = scoped.get("slots");
				if (slots === undefined) return () => {};
				return slots.inject("conversation.input.right", () =>
					slots.register({ name: "conversation.input.right", id: "ui-skin-tianlight:font", order: -20 }, FontButton),
				);
			});

			return () => {
				if (typeof disposeSlots === "function") disposeSlots();
				window.removeEventListener("resize", clampFontHost);
				stopChroma();
				clearTypography();
				try {
					if (overlayRoot !== null) overlayRoot.unmount();
				} catch {
					// an already-detached root is fine
				}
				host.remove();
			};
		}
		//#endregion
		//#region accessibility
		/**
		 * D6 键盘与无障碍（type-i18n 工作流）：
		 *
		 *   - 壁纸面板 / 排版面板打开时：给宿主加 role="dialog" + aria-modal +
		 *     aria-label，Tab / Shift+Tab 在面板内循环，焦点进入第一个控件；
		 *     关闭时移除语义并把焦点还给触发按钮（Alt+W 行为仍由 70-sidebar
		 *     自己处理，本片段不重复）；
		 *   - 直播区 [data-tl-a11y-live] 播报面板开关与分区展开/收起；
		 *   - 全局快捷键集中在 TL5_SHORTCUTS 注册表；这里只新增 Alt+T
		 *     （打开/关闭排版面板），帮助分区（id "a11y"，order 860）列出全部
		 *     快捷键与焦点行为；
		 *   - 只补属性，不改产品自身 DOM 语义；所有监听器在 disposer 里成对移除。
		 */
		registerTl5Strings({
			zh: {
				"a11y.title": "键盘与无障碍",
				"a11y.summaryValue": "快捷键",
				"a11y.altWDesc": "打开 / 关闭壁纸面板",
				"a11y.altTDesc": "打开 / 关闭排版面板",
				"a11y.escDesc": "关闭当前面板",
				"a11y.tabDesc": "在当前面板内循环焦点",
				"a11y.trapNote": "面板打开时焦点被限制在面板内（Tab / Shift+Tab 循环）；Esc 关闭后焦点回到触发按钮。",
				"a11y.liveNote": "面板打开 / 关闭与分区展开 / 收起会通过读屏实时播报。",
				"a11y.dialogWall": "壁纸面板",
				"a11y.dialogFont": "排版面板",
				"a11y.announceOpen": "{name}已打开",
				"a11y.announceClose": "{name}已关闭",
				"a11y.announceSectionOpen": "分区「{name}」已展开",
				"a11y.announceSectionClose": "分区「{name}」已收起",
				"a11y.altTUnavailable": "排版面板当前不可用",
			},
			en: {
				"a11y.title": "Keyboard & accessibility",
				"a11y.summaryValue": "Shortcuts",
				"a11y.altWDesc": "Open / close the wallpaper panel",
				"a11y.altTDesc": "Open / close the typography panel",
				"a11y.escDesc": "Close the current panel",
				"a11y.tabDesc": "Cycle focus inside the current panel",
				"a11y.trapNote": "While a panel is open, Tab / Shift+Tab cycle inside it; Esc closes it and returns focus to the trigger.",
				"a11y.liveNote": "Panel open/close and section expand/collapse are announced to screen readers.",
				"a11y.dialogWall": "Wallpaper panel",
				"a11y.dialogFont": "Typography panel",
				"a11y.announceOpen": "{name} opened",
				"a11y.announceClose": "{name} closed",
				"a11y.announceSectionOpen": "Section \"{name}\" expanded",
				"a11y.announceSectionClose": "Section \"{name}\" collapsed",
				"a11y.altTUnavailable": "The typography panel is not available right now",
			},
		});

		registerTl5Css(String.raw`
body[data-dsh-tianlight] [data-tl-a11y-live] {
	position: fixed;
	width: 1px;
	height: 1px;
	margin: -1px;
	padding: 0;
	overflow: hidden;
	clip: rect(0 0 0 0);
	clip-path: inset(50%);
	white-space: nowrap;
	border: 0;
}
body[data-dsh-tianlight] .tl5-a11y-body {
	display: flex;
	flex-direction: column;
	gap: 7px;
	padding: 2px 2px 4px;
}
body[data-dsh-tianlight] .tl5-a11y-row {
	display: flex;
	align-items: baseline;
	justify-content: space-between;
	gap: 10px;
}
body[data-dsh-tianlight] .tl5-a11y-kbd {
	flex: none;
	min-width: 92px;
	padding: 2px 8px;
	border-radius: 7px;
	border: 0.5px solid var(--tl-line-strong);
	background: var(--tl-glass-fill);
	color: var(--tl-ink);
	font-family: var(--ds-font-family-code, monospace);
	font-size: 11px;
	line-height: 1.5;
	text-align: center;
}
body[data-dsh-tianlight] .tl5-a11y-desc {
	font-size: 12px;
	line-height: 1.45;
	color: var(--tl-ink-soft);
	text-align: right;
}
body[data-dsh-tianlight] .tl5-a11y-note {
	margin: 2px 0 0;
	font-size: 11px;
	line-height: 1.55;
	color: var(--tl-ink-faint);
}
`);

		const TL5_SHORTCUTS = [];
		function normalizeTl5Shortcut(shortcut) {
			if (shortcut === null || typeof shortcut !== "object" || typeof shortcut.run !== "function") return null;
			const spec =
				typeof shortcut.keys === "string"
					? shortcut.keys
					: typeof shortcut.key === "string"
						? shortcut.key
						: "";
			const parts = spec.toLowerCase().split("+").map((part) => part.trim()).filter((part) => part !== "");
			const key = parts.length === 0 ? "" : parts[parts.length - 1];
			if (key === "") return null;
			return {
				id: typeof shortcut.id === "string" && shortcut.id !== "" ? shortcut.id : "shortcut-" + (TL5_SHORTCUTS.length + 1),
				keys: spec,
				key,
				alt: parts.indexOf("alt") >= 0,
				ctrl: parts.indexOf("ctrl") >= 0 || parts.indexOf("control") >= 0,
				meta: parts.indexOf("meta") >= 0 || parts.indexOf("cmd") >= 0,
				shift: parts.indexOf("shift") >= 0,
				labelKey: typeof shortcut.labelKey === "string" ? shortcut.labelKey : "",
				run: shortcut.run,
			};
		}
		function registerTl5Shortcut(shortcut) {
			const entry = normalizeTl5Shortcut(shortcut);
			if (entry === null) return () => {};
			TL5_SHORTCUTS.push(entry);
			return () => {
				const index = TL5_SHORTCUTS.indexOf(entry);
				if (index >= 0) TL5_SHORTCUTS.splice(index, 1);
			};
		}
		function tl5Shortcuts() {
			return TL5_SHORTCUTS.slice();
		}

		/** “键盘与无障碍”帮助分区（壁纸面板扩展区，order 860）。 */
		const A11yHelpSection = () => {
			const { t } = useTl5I18n();
			const rows = [
				{ keys: "Alt+W", desc: t("a11y.altWDesc") },
				{ keys: "Alt+T", desc: t("a11y.altTDesc") },
				{ keys: "Esc", desc: t("a11y.escDesc") },
				{ keys: "Tab / Shift+Tab", desc: t("a11y.tabDesc") },
			];
			for (const shortcut of tl5Shortcuts()) {
				if (shortcut.id === "font-panel" || shortcut.labelKey === "") continue;
				rows.push({ keys: shortcut.keys, desc: t(shortcut.labelKey) });
			}
			return React.createElement(
				"details",
				{ className: "tl-wall-group", open: false, "data-tl-group": "a11y", "data-tl-a11y-help": "" },
				React.createElement(
					"summary",
					{ className: "tl-wall-group-summary" },
					React.createElement("span", { className: "tl-wall-step" }, "\u2328"),
					React.createElement("span", { className: "tl-wall-group-title" }, t("a11y.title")),
					React.createElement("span", { className: "tl-wall-summary-value" }, t("a11y.summaryValue")),
				),
				React.createElement(
					"div",
					{ className: "tl5-a11y-body" },
					rows.map((row) =>
						React.createElement(
							"div",
							{ className: "tl5-a11y-row", key: row.keys + "|" + row.desc },
							React.createElement("span", { className: "tl5-a11y-kbd" }, row.keys),
							React.createElement("span", { className: "tl5-a11y-desc" }, row.desc),
						),
					),
					React.createElement("p", { className: "tl5-a11y-note" }, t("a11y.trapNote")),
					React.createElement("p", { className: "tl5-a11y-note" }, t("a11y.liveNote")),
				),
			);
		};
		registerTl5PanelSection({
			id: "a11y",
			order: 860,
			title: "a11y.title",
			Component: A11yHelpSection,
		});

		const A11Y_FOCUSABLE =
			'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [contenteditable="true"], [tabindex]:not([tabindex="-1"])';

		function installAccessibility(ctx) {
			const body = document.body;
			if (body === null) return () => {};

			// ---- live region ----
			const live = document.createElement("div");
			live.setAttribute("data-tl-a11y-live", "");
			live.setAttribute("role", "status");
			live.setAttribute("aria-live", "polite");
			live.setAttribute("aria-atomic", "true");
			body.appendChild(live);
			let liveTimer = 0;
			const announce = (text) => {
				if (typeof text !== "string" || text === "") return;
				if (liveTimer !== 0) window.clearTimeout(liveTimer);
				// 清空后再写入：读屏器只播报变化的节点。
				live.textContent = "";
				liveTimer = window.setTimeout(() => {
					liveTimer = 0;
					live.textContent = text;
				}, 40);
			};

			let wallHost = null;
			let fontHost = null;
			const tracked = new Map();
			const returnFocus = new Map();
			const openOrder = [];
			const pendingFocus = new Map();

			const refreshHosts = () => {
				if (wallHost === null || wallHost.isConnected === false) wallHost = document.querySelector("[data-tl-wall]");
				if (fontHost === null || fontHost.isConnected === false) fontHost = document.querySelector("[data-tl-font-panel]");
			};
			const hostLabel = (host) => (host !== null && host === fontHost ? TL_T("a11y.dialogFont") : TL_T("a11y.dialogWall"));
			const isHostOpen = (host) => {
				if (host === null) return false;
				if (host === wallHost) return host.hasAttribute("data-tl-open");
				return host.hasAttribute("hidden") === false;
			};
			const triggerFor = (host) => {
				if (host !== null && host === fontHost) return document.querySelector(".tl-font-trigger");
				return document.querySelector("[data-tl-wall-handle]");
			};
			const focusables = (host) => {
				const list = [];
				for (const node of host.querySelectorAll(A11Y_FOCUSABLE)) {
					if (typeof node.focus !== "function") continue;
					if (node.getClientRects().length === 0) continue;
					list.push(node);
				}
				return list;
			};
			const clearPendingFocus = (host) => {
				const timer = pendingFocus.get(host);
				if (timer === undefined) return;
				window.clearTimeout(timer);
				pendingFocus.delete(host);
			};
			/** 面板内容是 React 异步挂载的：重试几次直到出现可聚焦控件。 */
			const focusFirst = (host, attempt) => {
				clearPendingFocus(host);
				const list = focusables(host);
				if (list.length > 0) {
					try {
						list[0].focus({ preventScroll: true });
					} catch {
						try {
							list[0].focus();
						} catch {
							// 元素已卸载：交给下一次观察
						}
					}
					return;
				}
				if (attempt >= 4) return;
				const timer = window.setTimeout(() => {
					pendingFocus.delete(host);
					if (isHostOpen(host)) focusFirst(host, attempt + 1);
				}, 120);
				pendingFocus.set(host, timer);
			};
			const setTriggerExpanded = (host, expanded) => {
				const trigger = triggerFor(host);
				if (trigger === null) return;
				try {
					trigger.setAttribute("aria-expanded", expanded === true ? "true" : "false");
				} catch {
					// a trigger that unmounted mid-close is fine
				}
			};
			const applyDialogSemantics = (host) => {
				try {
					host.setAttribute("role", "dialog");
					host.setAttribute("aria-modal", "true");
					host.setAttribute("aria-label", hostLabel(host));
				} catch (error) {
					note("a11y:dialog", error);
				}
			};
			const removeDialogSemantics = (host) => {
				try {
					if (host.getAttribute("role") === "dialog") host.removeAttribute("role");
					host.removeAttribute("aria-modal");
					host.removeAttribute("aria-label");
				} catch {
					// disconnected hosts do not need cleanup
				}
			};
			/** Esc / 快捷键统一从触发按钮点击关闭，复用各分区自己的关闭路径。 */
			const closeHost = (host) => {
				if (host !== null && host === fontHost) {
					const close = host.querySelector("[data-tl-font-close]");
					if (close !== null) {
						close.click();
						return;
					}
					const trigger = triggerFor(host);
					if (trigger !== null) trigger.click();
					return;
				}
				const scrim = document.querySelector("[data-tl-wall-scrim]");
				if (scrim !== null) {
					scrim.click();
					return;
				}
				const handle = document.querySelector("[data-tl-wall-handle]");
				if (handle !== null) handle.click();
			};
			const onHostOpen = (host) => {
				const active = document.activeElement;
				returnFocus.set(
					host,
					active !== null && active !== undefined && active !== body && typeof active.focus === "function" ? active : null,
				);
				if (openOrder.indexOf(host) < 0) openOrder.push(host);
				applyDialogSemantics(host);
				setTriggerExpanded(host, true);
				announce(TL_T("a11y.announceOpen", { name: hostLabel(host) }));
				focusFirst(host, 0);
			};
			const onHostClose = (host) => {
				clearPendingFocus(host);
				const index = openOrder.indexOf(host);
				if (index >= 0) openOrder.splice(index, 1);
				removeDialogSemantics(host);
				setTriggerExpanded(host, false);
				const previous = returnFocus.get(host) ?? null;
				returnFocus.delete(host);
				announce(TL_T("a11y.announceClose", { name: hostLabel(host) }));
				const otherOpen = openOrder.some(
					(entry) => entry !== null && entry !== host && entry.isConnected === true && isHostOpen(entry),
				);
				if (otherOpen) return;
				// Spec: focus goes back to the panel's trigger (the Aa / edge-tab button).
				// If that trigger is gone, fall back to whatever had focus when it opened.
				const triggerTarget = triggerFor(host);
				let target = null;
				if (
					triggerTarget !== null &&
					triggerTarget !== undefined &&
					triggerTarget.isConnected === true &&
					typeof triggerTarget.focus === "function"
				) {
					target = triggerTarget;
				} else if (previous !== null && previous.isConnected === true) {
					target = previous;
				}
				if (target !== null && target !== undefined && target.isConnected === true && typeof target.focus === "function") {
					try {
						target.focus({ preventScroll: true });
					} catch {
						try {
							target.focus();
						} catch {
							// focus target vanished: nothing to restore
						}
					}
				}
			};
			const syncHost = (host) => {
				if (host === null) return;
				const open = isHostOpen(host);
				const was = tracked.get(host) === true;
				if (open === was) return;
				tracked.set(host, open);
				if (open) onHostOpen(host);
				else onHostClose(host);
			};
			const syncStates = () => {
				refreshHosts();
				if (wallHost !== null && tracked.has(wallHost) === false) tracked.set(wallHost, false);
				if (fontHost !== null && tracked.has(fontHost) === false) tracked.set(fontHost, false);
				syncHost(wallHost);
				syncHost(fontHost);
				for (const host of [...tracked.keys()]) {
					if (host.isConnected === true) continue;
					tracked.delete(host);
					clearPendingFocus(host);
					const index = openOrder.indexOf(host);
					if (index >= 0) openOrder.splice(index, 1);
					returnFocus.delete(host);
				}
			};
			const activeHost = () => {
				for (let index = openOrder.length - 1; index >= 0; index -= 1) {
					const host = openOrder[index];
					if (host !== null && host.isConnected === true && isHostOpen(host)) return host;
				}
				return null;
			};

			// ---- global shortcuts (Alt+W stays owned by 70-sidebar) ----
			const disposeShortcut = registerTl5Shortcut({
				id: "font-panel",
				keys: "alt+t",
				labelKey: "a11y.altTDesc",
				run: () => {
					const host = document.querySelector("[data-tl-font-panel]");
					if (host === null) {
						announce(TL_T("a11y.altTUnavailable"));
						return;
					}
					if (host.hidden === false) {
						const close = host.querySelector("[data-tl-font-close]");
						if (close !== null) {
							close.click();
							return;
						}
					}
					const trigger = document.querySelector(".tl-font-trigger");
					if (trigger === null) {
						announce(TL_T("a11y.altTUnavailable"));
						return;
					}
					trigger.click();
				},
			});

			const onKeyDown = (event) => {
				if (event.defaultPrevented === true) return;
				if (event.altKey === true || event.ctrlKey === true || event.metaKey === true) {
					for (const shortcut of [...TL5_SHORTCUTS]) {
						if (shortcut.key === "") continue;
						if (
							event.altKey !== shortcut.alt ||
							event.ctrlKey !== shortcut.ctrl ||
							event.metaKey !== shortcut.meta ||
							event.shiftKey !== shortcut.shift
						) {
							continue;
						}
						if (String(event.key ?? "").toLowerCase() !== shortcut.key) continue;
						event.preventDefault();
						try {
							shortcut.run(event);
						} catch (error) {
							note("a11y:shortcut", error);
						}
						return;
					}
					return;
				}
				const host = activeHost();
				if (host === null) return;
				if (event.key === "Escape") {
					event.preventDefault();
					event.stopPropagation();
					closeHost(host);
					return;
				}
				if (event.key !== "Tab") return;
				const items = focusables(host);
				if (items.length === 0) {
					event.preventDefault();
					return;
				}
				const first = items[0];
				const last = items[items.length - 1];
				const current = document.activeElement;
				const inside = current !== null && current !== undefined && typeof host.contains === "function" && host.contains(current) === true;
				if (event.shiftKey === true) {
					if (inside === false || current === first) {
						event.preventDefault();
						try {
							last.focus();
						} catch {
							// element vanished between reads
						}
					}
				} else if (inside === false || current === last) {
					event.preventDefault();
					try {
						first.focus();
					} catch {
						// element vanished between reads
					}
				}
			};

			// ---- live announcements for section toggles ----
			const onToggle = (event) => {
				const target = event.target;
				if (!(target instanceof Element)) return;
				if (target.classList.contains("tl-wall-group") === false) return;
				if (target.closest("[data-tl-wall]") === null) return;
				const titleNode = target.querySelector(".tl-wall-group-title");
				const name = titleNode === null ? "" : String(titleNode.textContent ?? "").trim();
				announce(
					target.open === true
						? TL_T("a11y.announceSectionOpen", { name })
						: TL_T("a11y.announceSectionClose", { name }),
				);
			};

			// 语言变化时，把已打开面板的 aria-label 换成本地化名称。
			const unsubscribeI18n = subscribeTl5I18n(() => {
				for (const host of [wallHost, fontHost]) {
					if (host === null || host.isConnected !== true || isHostOpen(host) === false) continue;
					try {
						host.setAttribute("aria-label", hostLabel(host));
					} catch {
						// host removed during a language switch
					}
				}
			});

			// 两个观察者分开：attributes 只订阅可读性相关的少量属性（聊天流式渲染
			// 不触发），childList 只看 body 的直接子节点（两个面板宿主都是 body 子级）。
			const openObserver = new MutationObserver(() => syncStates());
			const treeObserver = new MutationObserver(() => syncStates());
			try {
				openObserver.observe(body, {
					attributes: true,
					subtree: true,
					attributeFilter: ["data-tl-open", "hidden"],
				});
				treeObserver.observe(body, { childList: true });
			} catch (error) {
				note("a11y:observer", error);
			}
			refreshHosts();
			syncStates();
			window.addEventListener("keydown", onKeyDown);
			document.addEventListener("toggle", onToggle, true);

			return () => {
				openObserver.disconnect();
				treeObserver.disconnect();
				window.removeEventListener("keydown", onKeyDown);
				document.removeEventListener("toggle", onToggle, true);
				if (typeof disposeShortcut === "function") disposeShortcut();
				if (typeof unsubscribeI18n === "function") unsubscribeI18n();
				if (liveTimer !== 0) {
					window.clearTimeout(liveTimer);
					liveTimer = 0;
				}
				for (const timer of pendingFocus.values()) window.clearTimeout(timer);
				pendingFocus.clear();
				for (const host of [...tracked.keys()]) {
					clearPendingFocus(host);
					removeDialogSemantics(host);
					setTriggerExpanded(host, false);
				}
				tracked.clear();
				returnFocus.clear();
				openOrder.length = 0;
				live.remove();
			};
		}
		//#endregion
		//#region apply
		/**
		 * One page can outlive one plugin instance: the loader re-applies a bundle when a
		 * patch/profile changes, and a hot reload can mount the new fibre before the old
		 * one is disposed. Every skin instance therefore publishes a single disposer on
		 * `globalThis` and the next instance calls it before installing anything.
		 *
		 * Why not "remove the [data-tl-*] hosts and re-apply" (the old guard)? Removing
		 * DOM nodes does not stop the old instance: its window/document listeners, its
		 * MutationObserver, its timers and its slot registrations stay alive, so the old
		 * companion kept living as a second cat and the old pointer handlers kept eating
		 * clicks. Worse, a late disposal of the old instance could remove the NEW
		 * instance's body attribute and stylesheet. The registry below disposes effects
		 * in reverse install order and is idempotent, so a later cordis disposal is a
		 * no-op instead of a second teardown.
		 */
		const INSTANCE_REGISTRY_KEY = "__dshTianlightInstance";

		/**
		 * Tear one instance down completely.
		 *
		 * The owning cordis FIBER is the authoritative teardown: disposing it runs every
		 * registered effect as one transaction, which also unregisters the slot cells the
		 * rheostat/font controls live in. Disposing only the effect list (the previous
		 * approach) removed the DOM hosts but left the slot-rendered cells mounted — a
		 * re-apply then produced two reasoning sliders and two font buttons. The effect
		 * list stays as a fallback for a context whose fiber is not reachable.
		 */
		function teardownInstance(instance) {
			if (instance === undefined || instance === null) return;
			if (globalThis[INSTANCE_REGISTRY_KEY] === instance) globalThis[INSTANCE_REGISTRY_KEY] = null;
			const fiber = instance.ctx === undefined ? undefined : instance.ctx.fiber;
			if (fiber !== undefined && fiber !== null && typeof fiber.dispose === "function") {
				try {
					fiber.dispose();
				} catch (error) {
					note("apply:fiber-dispose-failed", error);
				}
			}
			try {
				instance.disposeEffects();
			} catch (error) {
				note("apply:dispose-failed", error);
			}
		}

		function disposePreviousInstance() {
			const previous = globalThis[INSTANCE_REGISTRY_KEY];
			if (previous === undefined || previous === null) return;
			teardownInstance(previous);
		}

		/**
		 * Remove hosts an OLDER skin build may have left behind (no registry, or a build
		 * whose disposer failed). The new instance owns fresh nodes from here on, so this
		 * only ever runs before installing; it is deliberately not a substitute for the
		 * registry above.
		 */
		function purgeOrphanHosts(body) {
			try {
				for (const selector of [
					"[data-tl-scene]",
					"[data-tl-rail]",
					"[data-tl-cat]",
					"[data-tl-wall]",
					"[data-tl-wall-scrim]",
					"[data-tl-wall-handle]",
					"[data-tl-font-panel]",
					// v0.5.0 layers: a previous build may have left these behind when a
					// module was disabled mid-session or a disposer failed.
					"[data-tl-fx]",
					"[data-tl-ambient]",
					"[data-tl-legibility]",
					"[data-tl-web]",
					"[data-tl-a11y-live]",
				]) {
					for (const node of document.querySelectorAll(selector)) node.remove();
				}
				const staleStyle = document.querySelector(
					"style[data-plugin-css=" + JSON.stringify(CSS_TAG_ID) + "]",
				);
				if (staleStyle !== null) staleStyle.remove();
				body.removeAttribute(BODY_ATTR);
				body.removeAttribute(TL5_MODULES_ATTR);
				body.removeAttribute("data-tl-lang");
				body.removeAttribute("data-tl-legibility");
			} catch (error) {
				note("apply:purge-failed", error);
			}
		}

		async function apply(ctx) {
			// Hard boundary: a DSH upgrade can change the DOM or a service without notice,
			// and an exception thrown out of apply() marks the plugin fibre failed.
			// Catch everything here so a skin defect can never take the page down with it —
			// the worst case is "no skin", never "no DSH".
			try {
				const body = document.body;
				if (body === null) {
					note("apply:no-body", {});
					return;
				}
				disposePreviousInstance();
				purgeOrphanHosts(body);

				// Every installer goes through here so this instance can be torn down from
				// outside cordis (the hot-reload case). `live` makes each disposer idempotent:
				// cordis disposal after a registry teardown is a no-op, never a double free.
				// The returned disposer is what the v0.5.0 module runtime uses to switch a
				// feature OFF at runtime (DOM + listeners gone, no reload).
				const cleanups = [];
				const install = (label, factory) => {
					let dispose = null;
					try {
						ctx.effect(() => {
							const result = factory();
							let live = true;
							const teardown = () => {
								if (!live) return;
								live = false;
								const index = cleanups.indexOf(teardown);
								if (index >= 0) cleanups.splice(index, 1);
								try {
									if (typeof result === "function") result();
								} catch (error) {
									note("apply:dispose-failed", { label, error });
								}
							};
							// Diagnostics only: the label makes a teardown debuggable from the
							// console (`__dshTianlightInstance.labels()`), and disposeLabel()
							// lets a developer tear down one feature without a reload.
							teardown.label = label;
							cleanups.push(teardown);
							dispose = teardown;
							return teardown;
						}, label);
					} catch (error) {
						note("apply:install-failed", { label, error });
						return null;
					}
					const registered = dispose;
					if (registered === null) return null;
					return () => {
						try {
							registered();
						} catch (error) {
							note("apply:dispose-failed", { label, error });
						}
					};
				};

				const instance = {
					// Diagnostics only: lets the console inspect the owning context/fiber.
					ctx,
					dispose() {
						teardownInstance(instance);
					},
					/** Effect-list teardown only; `dispose()` is the public entry point. */
					disposeEffects() {
						for (const dispose of cleanups.splice(0)) {
							try {
								dispose();
							} catch (error) {
								note("apply:dispose-failed", error);
							}
						}
					},
					labels() {
						return cleanups.map((dispose) => dispose.label);
					},
					disposeLabel(label) {
						const target = cleanups.find((dispose) => dispose.label === label);
						if (target === undefined) return false;
						target();
						return true;
					},
					// ---- v0.5.0 runtime surfaces (read-only diagnostics) ----
					modules: () => ({
						state: moduleController.state(),
						active: moduleController.active(),
						definitions: moduleController.list().map((def) => def.id),
					}),
					settings: () => {
						try {
							return settingsStore.status();
						} catch {
							return null;
						}
					},
					metrics: () => TL5_METRICS,
					diag: () => TL5_DIAG,
					i18n: () => tl5Language(),
					duty: () => dutyChannelStatus(),
					life: () => {
						try {
							return globalThis.tianlightLife?.status?.() ?? null;
						} catch {
							return null;
						}
					},
					glass: () => {
						try {
							return glassDepthController === null ? null : { depth: glassDepthController.read(), effective: glassDepthController.effective() };
						} catch {
							return null;
						}
					},
				};
				// Support diagnostics: which hook layer does this DSH build render?
				// Lazy on purpose — plugin apply runs before the shell mounts the product UI,
				// so a value sampled here would report every hook missing. The getter is
				// evaluated when a support engineer reads it from the console, long after
				// the UI mounted, and never rendered into the product DOM.
				Object.defineProperty(instance, "features", {
					enumerable: true,
					configurable: true,
					get() {
						try {
							return detectDshFeatures();
						} catch {
							return null;
						}
					},
				});
				globalThis[INSTANCE_REGISTRY_KEY] = instance;

				// ---- settings: migrate local schema + adopt the host config BEFORE any
				// installer reads localStorage. Failures degrade to local-only mode and
				// must never block the skin from applying. ----
				await bootstrapSettingsRuntime(body);

				// ---- always-on core ----
				install("ui-skin-tianlight: stylesheet", () => installStyles());
				install("ui-skin-tianlight: glass opacity", () => installGlassOpacity());
				install("ui-skin-tianlight: glass depth", () => installGlassDepth());
				install("ui-skin-tianlight: low power", () => installLowPower());
				install("ui-skin-tianlight: i18n", () => installI18nRuntime(ctx));
				install("ui-skin-tianlight: selector bridge", () => installSelectorBridge());
				// Set and dispose the scoping attribute in ONE effect registered before any
				// fallible work: if a feature throws, the attribute must still have an owner
				// that removes it, or the skin CSS stays armed for the page.
				install("ui-skin-tianlight: body attribute", () => {
					body.setAttribute(BODY_ATTR, "");
					body.setAttribute("data-tl-lang", tl5ActiveLanguage);
					syncModulesAttr();
					return () => {
						body.removeAttribute(BODY_ATTR);
						body.removeAttribute(TL5_MODULES_ATTR);
						body.removeAttribute("data-tl-lang");
						body.removeAttribute("data-tl-legibility");
					};
				});
				// Settings mirroring is infrastructure, not a module: it keeps the host
				// settings file and the other windows in sync for every feature. The
				// one-shot migration/host-adoption already ran above; this effect owns
				// the persistent write mirror + BroadcastChannel only.
				install("ui-skin-tianlight: settings sync", () => installSettingsRuntime(body));

				// ---- switchable modules: installed in MODULE_DEFS order ----
				const runtime = createModuleRuntime(install);
				runtime.define("wallpaper", "module: wallpaper", () => installScene());
				runtime.define("zones", "module: zones", () => installZoneFraming());
				runtime.define("effects", "module: effects", () => installEffectsLayer());
				runtime.define("context", "module: context", () => installContextRuntime(ctx));
				runtime.define("audio", "module: audio", () => installAudioRuntime(ctx));
				runtime.define("companion", "module: companion", () => installCompanion());
				runtime.define("rheostat", "module: rheostat", () => installEffortRheostat(ctx));
				runtime.define("typography", "module: typography", () => installFontPanel(ctx));
				runtime.define("legibility", "module: legibility", () => installLegibilityGuard());
				runtime.define("panel", "module: panel", () => installWallpaperSidebar(ctx));
				moduleController.attach(runtime);
				runtime.syncAll();
				tl5Diag("engine", { modules: moduleController.state(), active: moduleController.active() });

				// ---- v0.6.0 Wallpaper Engine library (always on, additive) ----
				// Registers the DSH settings page + the sidebar footer button and mounts the
				// full-screen library overlay. Degrades to diagnostics when the host half or
				// the slots service is unavailable, so it must not live inside a module switch.
				install("ui-skin-tianlight: we library", () => installWeLibrary(ctx));

				// ---- v0.7.0 duty channel (client half only, no DSH restart) ----
				// Always-on infrastructure installed after the module runtime so the
				// companion is already mounted when it is enabled. The channel itself
				// degrades to `companion-off` when the companion module is switched off.
				install("ui-skin-tianlight: duty channel", () => installDutyChannel());

				// ---- v1.0.0 character life layer ----
				// The life engine owns the virtual clock / daily rhythm / proactive budget,
				// gates duty interrupts, resolves replaceable pet media and persists the
				// cross-session memory. It installs after the module runtime so a disabled
				// companion degrades cleanly, and the settings page only needs `slots`.
				install("ui-skin-tianlight: life rhythm", () => installLifeRhythm());
				install("ui-skin-tianlight: life settings", () => installLifeSettings(ctx));

				// ---- keyboard/a11y is always on and installs AFTER the panel host exists ----
				install("ui-skin-tianlight: accessibility", () => installAccessibility(ctx));

				// The module runtime is exposed for the engineering panel's "reinstall"
				// diagnostics and for hot-reload teardown.
				instance.moduleRuntime = runtime;
			} catch (error) {
				note("apply:failed", error);
			}
		}

		exports.apply = apply;
		return module.exports;
	}
});
