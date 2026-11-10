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
