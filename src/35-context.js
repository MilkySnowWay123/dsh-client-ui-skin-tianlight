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
		/**
		 * v2.2.12：读数单独存这个 key（配置仍留在上面的同步键里）。
		 *
		 * 它被列进 12-schema 的 `TL5_DATA_KEYS`（与宿主 `lib/settings-store.js` 的
		 * `DATA_SETTING_KEYS` 一一对应），所以永不参与宿主设置镜像：另一个窗口或更早
		 * 版本写下的旧 `last`/旧 `lastError` 不可能在重启后被宿主 map 盖回来，手动
		 * 刷新也不再抬高 settings revision。之前读数与配置同住一个 key，宿主只要
		 * revision 更高就整体采纳，正是“重启后又回到旧数据/旧报错”的来源。
		 */
		const WEATHER_CACHE_KEY = "tianlight.weather.cache";
		const WEATHER_PROVIDER = "open-meteo";
		const WEATHER_INTERVALS = [15, 30, 60, 120];
		/**
		 * 单条直连预算（ms）。v2.2.12 起它与宿主兜底**并发**赛跑，不再串行相加：
		 * 旧顺序（直连 8s → 宿主 https 2.5s → 宿主 http 8s）最坏要 18.5 秒才给出失败。
		 */
		const WEATHER_TIMEOUT_MS = 8000;
		/** 宿主代理预算（ms）：宿主内部 https/http 也是并发赛跑，6s 足够覆盖一次 TLS 握手。 */
		const WEATHER_HOST_TIMEOUT_MS = 9500;
		/** 一次刷新的总预算：直连或宿主谁先拿到合法 payload 用谁，到点两条路一起放弃。 */
		const WEATHER_TOTAL_BUDGET_MS = 10000;
		/** 已知可用路线（cache.route）的头程优势（ms）：另一条路晚这么久起跑，少浪费带宽。 */
		const WEATHER_RACE_HEAD_START_MS = 250;
		/** 宿主回 429 busy（另一个窗口正在取）时的等待（ms）：等它一下再试，不算失败。 */
		const WEATHER_BUSY_WAIT_MS = 1200;
		/**
		 * v2.0.6：失败后的退避阶梯（毫秒）。上游会整段不可用（TCP 连上却几十秒不回包），
		 * 只重试一次 60 秒就又回到 30 分钟轮询，恢复后往往要等很久才更新。
		 * 阶梯用尽后仍由常规 interval 兜底，不会变成密集重试。
		 * v2.2.12：定时器在窗口隐藏时到点**不消耗级数**，变可见后立即执行（见下方）。
		 */
		const WEATHER_RETRY_DELAYS_MS = [60000, 180000, 600000];
		/** 两次 60s 时钟 tick 的间隔超过它（ms）即视为系统睡眠唤醒：setInterval 不会补发。 */
		const WEATHER_WAKE_GAP_MS = 180000;
		/** stale 阈值：2 × interval 与 3 小时的**较小者**（长间隔时 3 小时先到）。 */
		const WEATHER_STALE_FACTOR = 2;
		const WEATHER_STALE_MAX_MS = 10800000;
		/** 客户端 ↔ 宿主天气路由的契约版本（§2.8：插件更新后宿主可能还是旧代码）。 */
		const WEATHER_API_VERSION = 2;
		const WEATHER_ROUTE_DIRECT = "direct";
		/** 能记住的“上次成功路线”；宿主侧再区分 https / http 两条上游。 */
		const WEATHER_ROUTES = [WEATHER_ROUTE_DIRECT, "host-https", "host-http"];
		const WEATHER_GEOCODE_ENDPOINT = "https://geocoding-api.open-meteo.com/v1/search";
		const WEATHER_FORECAST_ENDPOINT = "https://api.open-meteo.com/v1/forecast";
		/** 历史错误码（老 localStorage 可能带着）+ v2.2.12 的 busy / host-stale。 */
		const WEATHER_ERROR_CODES = [
			"",
			"network",
			"timeout",
			"invalid",
			"geocode",
			"geolocation",
			"unavailable",
			"aborted",
			"busy",
			"host-stale",
		];
		/** 上游非 200（429 限流 / 400 参数错）带状态码，中枢里才能看出是被限流。 */
		const WEATHER_UPSTREAM_PATTERN = /^upstream-[1-5][0-9][0-9]$/;
		const WEATHER_RAIN_CODES = [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99];
		const WEATHER_SNOW_CODES = [71, 73, 75, 77, 85, 86];
		/** 同步键里的**配置**（会进宿主设置镜像）。 */
		const WEATHER_DEFAULTS = {
			enabled: false,
			provider: WEATHER_PROVIDER,
			city: "",
			latitude: null,
			longitude: null,
			intervalMin: 30,
		};
		/** 只存本机的**读数**（v2.2.12 起不再同步）。 */
		const WEATHER_CACHE_DEFAULTS = {
			last: null,
			lastError: "",
			/** 最近一次**成功**请求的时间（ms）；失败不推进它。 */
			fetchedAt: 0,
			/** 上次成功的路线：direct / host-https / host-http / ""。 */
			route: "",
		};
		function weatherErrorCodeValid(code) {
			if (typeof code !== "string") return false;
			return WEATHER_ERROR_CODES.includes(code) || WEATHER_UPSTREAM_PATTERN.test(code);
		}
		const weatherState = { ...WEATHER_DEFAULTS, ...WEATHER_CACHE_DEFAULTS };
		const weatherSubscribers = new Set();
		/**
		 * v2.0.6：本页最近一次*成功*取到天气的时间（不落盘、不同步宿主）。
		 *
		 * 持久化的 `last.at` 只在数值变化时才更新（否则每个轮询周期都会写一次设置、
		 * 抬高 revision）。但界面上「更新于」如果只读 `last.at`，在天气平稳时就会
		 * 一直停在几小时前，看起来像坏了。这里只影响展示：下一次成功轮询就前进。
		 */
		let weatherFreshAt = 0;
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
			// v2.2.12: the payload's own sample time (`current.time`). `at` is only when
			// this page fetched it, so the hub must not present a 15-minute-old
			// observation as "just now".
			const observedAt = value.observedAt === null || value.observedAt === undefined ? NaN : Number(value.observedAt);
			if (Number.isFinite(code) === false || code < 0 || code > 99) return null;
			if (Number.isFinite(temperatureC) === false) return null;
			if (Number.isFinite(at) === false || at <= 0) return null;
			return {
				code: Math.round(code),
				temperatureC: Math.round(temperatureC * 10) / 10,
				isDay: value.isDay === true,
				at: Math.round(at),
				observedAt: Number.isFinite(observedAt) && observedAt > 0 ? Math.round(observedAt) : 0,
			};
		}

		function normalizeWeatherRoute(value) {
			return WEATHER_ROUTES.includes(value) ? value : "";
		}

		/** 纯配置（同步键里的全部内容）。 */
		function weatherConfigFromState() {
			return {
				enabled: weatherState.enabled === true,
				provider: WEATHER_PROVIDER,
				city: weatherState.city,
				latitude: weatherState.latitude,
				longitude: weatherState.longitude,
				intervalMin: weatherState.intervalMin,
			};
		}

		/** 只存本机的读数（tianlight.weather.cache）。 */
		function weatherCacheFromState() {
			return {
				last: weatherState.last === null ? null : { ...weatherState.last },
				lastError: weatherState.lastError,
				fetchedAt: weatherState.fetchedAt,
				route: weatherState.route,
			};
		}

		function readWeatherCache() {
			const model = { ...WEATHER_CACHE_DEFAULTS };
			try {
				const raw = globalThis.localStorage?.getItem(WEATHER_CACHE_KEY);
				if (raw === undefined || raw === null || raw === "") return model;
				const parsed = JSON.parse(raw);
				if (parsed === null || typeof parsed !== "object") return model;
				model.last = normalizeWeatherLast(parsed.last);
				if (typeof parsed.lastError === "string" && weatherErrorCodeValid(parsed.lastError)) model.lastError = parsed.lastError;
				const fetchedAt = Number(parsed.fetchedAt);
				model.fetchedAt = Number.isFinite(fetchedAt) && fetchedAt > 0 ? Math.round(fetchedAt) : 0;
				model.route = normalizeWeatherRoute(parsed.route);
			} catch {
				return { ...WEATHER_CACHE_DEFAULTS };
			}
			return model;
		}

		function writeWeatherCache() {
			try {
				globalThis.localStorage?.setItem(WEATHER_CACHE_KEY, JSON.stringify(weatherCacheFromState()));
			} catch {
				// persistence is optional; the session still follows the model
			}
		}

		function writeWeatherConfig() {
			try {
				globalThis.localStorage?.setItem(WEATHER_KEY, JSON.stringify(weatherConfigFromState()));
			} catch {
				// persistence is optional; the session still follows the model
			}
		}

		/**
		 * v2.2.12 一次性迁移：v2.2.11 及更早把读数写在同步的 `tianlight.weather` 里。
		 * 读到旧字段就把「比 cache 里更新」的读数搬进 cache，然后把同步键重写成纯配置
		 * ——宿主镜像里那份旧 `last`/`lastError` 会在下一次推送时被差异删除，重启后
		 * 不会再被别人的旧快照盖回来。幂等：重写之后不再有旧字段可搬。
		 *
		 * 注意：重写必须用**刚解析出来的配置**（不是 weatherState —— 迁移发生在
		 * Object.assign 之前，那一份还是默认值，用它会把用户的城市/坐标清空）。
		 */
		function migrateLegacyWeatherReadings(parsed, cache, config) {
			const legacyLast = normalizeWeatherLast(parsed.last);
			const legacyError =
				typeof parsed.lastError === "string" && weatherErrorCodeValid(parsed.lastError) ? parsed.lastError : "";
			const next = { ...cache };
			let cacheChanged = false;
			if (legacyLast !== null || legacyError !== "") {
				const legacyAt = legacyLast === null ? 0 : Number(legacyLast.at) || 0;
				const cacheAt = next.last === null ? 0 : Number(next.last.at) || 0;
				if (legacyLast !== null && legacyAt > cacheAt) {
					next.last = legacyLast;
					cacheChanged = true;
				}
				if (legacyError !== "" && next.lastError === "" && legacyAt >= Number(next.fetchedAt || 0)) {
					next.lastError = legacyError;
					cacheChanged = true;
				}
				if (legacyAt > Number(next.fetchedAt || 0)) {
					next.fetchedAt = legacyAt;
					cacheChanged = true;
				}
			}
			if (cacheChanged) {
				try {
					globalThis.localStorage?.setItem(WEATHER_CACHE_KEY, JSON.stringify(next));
				} catch {
					// persistence is optional
				}
			}
			try {
				globalThis.localStorage?.setItem(WEATHER_KEY, JSON.stringify(config));
			} catch {
				// persistence is optional
			}
		}

		function readWeatherSettings() {
			const model = { ...WEATHER_DEFAULTS };
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
				if (parsed.last !== undefined || parsed.lastError !== undefined) {
					migrateLegacyWeatherReadings(parsed, readWeatherCache(), { ...model, provider: WEATHER_PROVIDER });
				}
			} catch {
				return { ...WEATHER_DEFAULTS };
			}
			return model;
		}

		function weatherSnapshot() {
			return {
				...weatherState,
				provider: WEATHER_PROVIDER,
				last: weatherState.last === null ? null : { ...weatherState.last },
			};
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
			/**
			 * v2.2.11: notify subscribers without persisting. An automatic poll that
			 * returns the SAME code/temperature still refreshes the "updated at" time,
			 * but must not write the synced snapshot (that bumps the host revision).
			 * Before this, weatherFreshAt advanced invisibly and the chip kept showing
			 * the old timestamp until the values themselves changed or a manual
			 * refresh wrote the whole snapshot.
			 */
			touch: () => {
				weatherNotify();
				return weatherSnapshot();
			},
			apply: (patch) => {
				let configChanged = false;
				let cacheChanged = false;
				if (patch !== null && typeof patch === "object") {
					if (patch.enabled === true || patch.enabled === false) {
						weatherState.enabled = patch.enabled;
						configChanged = true;
					}
					if (typeof patch.city === "string") {
						weatherState.city = patch.city.trim().slice(0, 80);
						configChanged = true;
					}
					if (patch.latitude !== undefined) {
						weatherState.latitude = normalizeWeatherCoordinate(patch.latitude, 90);
						configChanged = true;
					}
					if (patch.longitude !== undefined) {
						weatherState.longitude = normalizeWeatherCoordinate(patch.longitude, 180);
						configChanged = true;
					}
					if (WEATHER_INTERVALS.includes(Number(patch.intervalMin))) {
						weatherState.intervalMin = Number(patch.intervalMin);
						configChanged = true;
					}
					if (patch.last !== undefined) {
						weatherState.last = normalizeWeatherLast(patch.last);
						cacheChanged = true;
					}
					if (typeof patch.lastError === "string" && weatherErrorCodeValid(patch.lastError)) {
						weatherState.lastError = patch.lastError;
						cacheChanged = true;
					}
					if (patch.fetchedAt !== undefined) {
						const fetchedAt = Number(patch.fetchedAt);
						weatherState.fetchedAt = Number.isFinite(fetchedAt) && fetchedAt > 0 ? Math.round(fetchedAt) : 0;
						cacheChanged = true;
					}
					if (patch.route !== undefined) {
						weatherState.route = normalizeWeatherRoute(patch.route);
						cacheChanged = true;
					}
					weatherState.provider = WEATHER_PROVIDER;
				}
				if (cacheChanged) {
					// v2.2.12: 读数只落 localStorage 缓存键，永不写同步键 → 不抬 revision。
					// 成功时间同时推进展示用的 weatherFreshAt（v2.2.11 的 repaint 修复）。
					weatherFreshAt = Math.max(weatherFreshAt, Number(weatherState.fetchedAt) || 0);
					writeWeatherCache();
				}
				if (configChanged) writeWeatherConfig();
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
			/**
			 * v2.2.12: 返回 `{ ok, error, transport, ms }`，中枢才能说出失败原因与用时。
			 * 旧调用方只看 truthy 的写法仍然可用（成功对象带 ok: true；失败对象带
			 * ok: false，请检查 `ok` 而不是对象本身）。运行时未挂载时返回 unavailable。
			 */
			refresh: () =>
				weatherRuntime === null
					? Promise.resolve({ ok: false, error: "unavailable", transport: "", ms: 0 })
					: weatherRuntime.refresh(),
			resolveCity: (query) =>
				weatherRuntime === null ? Promise.resolve({ ok: false, error: "unavailable" }) : weatherRuntime.resolveCity(query),
			useCurrentLocation: () =>
				weatherRuntime === null ? Promise.resolve({ ok: false, error: "unavailable" }) : weatherRuntime.useCurrentLocation(),
			// ---- v1.5.0 visible-weather surface: read-only summary + convenience switches ----
			// `summary()` is what the role hub renders; it never triggers a request.
			// `enable()` only flips the persisted flag (no geolocation, no city lookup);
			// when coordinates already exist the existing reconcileWeather path starts the
			// poll exactly as it did for the hidden panel.
			summary: () => weatherSummary(),
			isReady: () => weatherRuntime !== null,
			enable: () => weatherController.apply({ enabled: true }),
			disable: () => weatherController.apply({ enabled: false }),
		};
		/**
		 * v1.5.0：全局句柄的簿记与暴露。
		 *
		 * 需求：`globalThis.tianlightWeather` 在 weatherController 定义之后即可见（隐藏的
		 * 「环境」分区之外的中枢/自检可读），dispose 时若仍是同一对象则删除/还原。模块
		 * 可被开关：factory 求值阶段先暴露一次（runtime=null，summary 会提示未挂载），
		 * 之后每次 installContextRuntime 再挂一次（保留最初的旧值），这样重新启用后
		 * 句柄仍在，而迟到的 disposer 也不会清掉新实例。
		 */
		let weatherGlobalToken = null;
		let weatherGlobalPrevious = undefined;
		function weatherExposeGlobal(token) {
			if (weatherGlobalToken === null) weatherGlobalPrevious = globalThis.tianlightWeather;
			weatherGlobalToken = token;
			globalThis.tianlightWeather = weatherController;
		}
		const weatherModuleGlobalToken = {};
		weatherExposeGlobal(weatherModuleGlobalToken);
		Object.assign(weatherState, readWeatherSettings(), readWeatherCache());
		weatherFreshAt = Math.max(weatherFreshAt, Number(weatherState.fetchedAt) || 0);

		/** 宿主设置接管后的刷新（同 refreshContextState）：只在安装器入口调用。 */
		function refreshWeatherState() {
			const stored = readWeatherSettings();
			const cached = readWeatherCache();
			let changed = false;
			for (const key of Object.keys(WEATHER_DEFAULTS)) {
				if (key === "provider") continue;
				if (stored[key] !== weatherState[key]) changed = true;
			}
			const beforeLast = weatherState.last === null ? "" : JSON.stringify(weatherState.last);
			const afterLast = cached.last === null ? "" : JSON.stringify(cached.last);
			if (beforeLast !== afterLast) changed = true;
			if (cached.lastError !== weatherState.lastError) changed = true;
			if (Number(cached.fetchedAt) !== Number(weatherState.fetchedAt)) changed = true;
			if (cached.route !== weatherState.route) changed = true;
			Object.assign(weatherState, stored, cached);
			weatherFreshAt = Math.max(weatherFreshAt, Number(weatherState.fetchedAt) || 0);
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
			// v2.2.12: 这三个文案与中枢共用同一份字典（76-role-hub.js），因为 13-i18n
			// 的基础字典里没有它们，而中枢也要说同一句话。
			if (code === "busy") return "hub.weather.reason.busy";
			if (code === "host-stale") return "hub.weather.reason.hostStale";
			return "";
		}

		/**
		 * v2.2.12: 错误码 → 人话。upstream-429 这类码要连状态码一起说，否则中枢只能
		 * 显示一个裸码；未知码原样返回（便于诊断）。
		 */
		function weatherErrorReason(code) {
			const text = typeof code === "string" ? code : "";
			const upstream = WEATHER_UPSTREAM_PATTERN.exec(text);
			if (upstream !== null) return TL_T("hub.weather.reason.upstream", { status: upstream[0].slice("upstream-".length) });
			const key = weatherErrorKey(text);
			return key === "" ? text : TL_T(key);
		}

		/** WMO 天气码 → 氛围预设。只返回 ambience/密度，绝不动玻璃/叠加层/壁纸。 */
		function weatherAmbienceFor(code, isDay) {
			const value = Number(code);
			if (WEATHER_RAIN_CODES.includes(value)) return { ambience: "rain", ambienceDensity: 0.55 };
			if (WEATHER_SNOW_CODES.includes(value)) return { ambience: "snow", ambienceDensity: 0.5 };
			if (value === 0 && isDay === true) return { ambience: "spots", ambienceDensity: 0.2 };
			return { ambience: "none", ambienceDensity: 0 };
		}

		/** open-meteo 的 `current.time` 是本地时间（timezone=auto）且没有时区后缀。 */
		function weatherObservedTime(value) {
			if (typeof value !== "string" || value === "") return 0;
			// "2026-11-17T14:15" → 本机时区的 14:15（open-meteo 已按请求坐标时区返回）。
			const match = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/.exec(value);
			if (match === null) return 0;
			const at = new Date(
				Number(match[1]),
				Number(match[2]) - 1,
				Number(match[3]),
				Number(match[4]),
				Number(match[5]),
			).getTime();
			return Number.isFinite(at) ? at : 0;
		}

		function normalizeWeatherForecast(payload) {
			if (payload !== null && typeof payload === "object" && payload.error === true) {
				// §2.8: an upstream error body (`{error:true, reason:"..."}`) explains the
				// failure; keep the reason in diagnostics instead of only reporting invalid.
				tl5Diag("context", { weatherUpstreamError: String(payload.reason ?? "") });
				return null;
			}
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
				observedAt: weatherObservedTime(current.time),
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
		 * v2.2.12 stale 判定（纯函数，便于隔离验证）。
		 *
		 * 页面重启后 `last.at` 可能是昨天：只有数值变化才会写缓存，而首个请求成功之前
		 * 胶囊看起来像「实时的」。超过 max(2 × interval, 3 小时中的较小者)就算 stale：
		 * 温度保留但灰显，title 说明数据时间与更新状态。
		 */
		function weatherStaleInfo(updatedAt, intervalMin, nowMs) {
			const minutes = WEATHER_INTERVALS.includes(Number(intervalMin)) ? Number(intervalMin) : 30;
			const staleAfterMs = Math.min(minutes * 60000 * WEATHER_STALE_FACTOR, WEATHER_STALE_MAX_MS);
			const at = Number(updatedAt);
			const nowValue = Number(nowMs);
			if (Number.isFinite(at) === false || at <= 0 || Number.isFinite(nowValue) === false) {
				return { stale: false, ageMs: null, staleAfterMs };
			}
			const ageMs = Math.max(0, nowValue - at);
			return { stale: ageMs > staleAfterMs, ageMs, staleAfterMs };
		}

		/**
		 * v1.5.0 天气可见化：给角色中枢/诊断用的一次性本地化摘要。只读——绝不发起
		 * 请求、绝不写存储；五态文案复用面板同一批 `ctx.weather.*` 键，所以隐藏的
		 * 「环境」分区和中枢不会说出两种天气。
		 *
		 * 状态优先级：未启用 → 运行时未挂载 → 未设位置 → 最近一次错误 → 已拿到数据
		 * → 等待首帧。`runtime` 只表示 installContextRuntime 是否已挂载（网络+定时器
		 * 的持有者），与用户是否启用无关。
		 *
		 * v2.2.12 新增（只增不改，老调用方按 7 个键读仍然成立）：
		 *   stale      数据已过期（见 weatherStaleInfo）
		 *   observedAt 上游观测时间（payload current.time），可能比 updatedAt 早 15 分钟
		 *   freshAt    本页最近一次**成功**请求的时间
		 *   route      上次成功的路线（direct / host-https / host-http）
		 *   intervalMin 当前轮询间隔，stale 由它推导
		 */
		function weatherSummary() {
			try {
				const state = weatherSnapshot();
				const hasLocation =
					state.latitude !== null &&
					state.longitude !== null &&
					Number.isFinite(Number(state.latitude)) &&
					Number.isFinite(Number(state.longitude));
				const runtime = weatherRuntime !== null;
				const last = state.last === null ? null : { ...state.last };
				const error = typeof state.lastError === "string" ? state.lastError : "";
				let text = "";
				if (state.enabled !== true) {
					text = TL_T("ctx.weather.statusDisabled");
				} else if (runtime !== true) {
					text = TL_T("ctx.weather.runtimeMissing");
				} else if (hasLocation !== true) {
					text = TL_T("ctx.weather.statusNoLocation");
				} else if (error !== "") {
					text = TL_T("ctx.weather.statusError", { reason: weatherErrorReason(error) });
				} else if (last !== null) {
					text = TL_T("ctx.weather.summaryLast", {
						desc: TL_T(weatherDescriptionKey(last.code)),
						temperature: String(last.temperatureC),
					});
				} else {
					text = TL_T("ctx.weather.statusWaiting");
				}
				// v2.0.6/v2.2.11: the newest successful poll, even when the numbers did not
				// change — display truthfully.
				const updatedAt = last === null ? null : Math.max(Number(last.at) || 0, weatherFreshAt) || last.at;
				const intervalMin = WEATHER_INTERVALS.includes(Number(state.intervalMin)) ? Number(state.intervalMin) : 30;
				const stale = weatherStaleInfo(updatedAt, intervalMin, Date.now());
				const observedRaw = last === null ? 0 : Number(last.observedAt) || 0;
				// v2.2.12: 读数本身（“晴 · 20.7°C”）与状态文案分开，中枢才能在“有旧数据
				// 但刷新失败”时继续显示读数，只加一个小失败标记而不是整块换成错误。
				const reading =
					last === null
						? ""
						: TL_T("ctx.weather.summaryLast", {
								desc: TL_T(weatherDescriptionKey(last.code)),
								temperature: String(last.temperatureC),
							});
				return {
					enabled: state.enabled === true,
					hasLocation: hasLocation === true,
					runtime,
					last,
					text,
					reading,
					error,
					updatedAt,
					stale: stale.stale,
					ageMs: stale.ageMs,
					staleAfterMs: stale.staleAfterMs,
					observedAt: observedRaw > 0 ? observedRaw : last === null ? null : Number(last.at) || null,
					freshAt: weatherFreshAt > 0 ? weatherFreshAt : Number(state.fetchedAt) || null,
					route: typeof state.route === "string" ? state.route : "",
					intervalMin,
					errorReason: error === "" ? "" : weatherErrorReason(error),
				};
			} catch (summaryError) {
				return {
					enabled: false,
					hasLocation: false,
					runtime: weatherRuntime !== null,
					last: null,
					text: "",
					reading: "",
					error: "",
					updatedAt: null,
					stale: false,
					ageMs: null,
					staleAfterMs: 0,
					observedAt: null,
					freshAt: null,
					route: "",
					intervalMin: 30,
					errorReason: "",
				};
			}
		}

		/**
		 * v1.6.1：DSH 主界面右上角的常驻「天气胶囊」。
		 *
		 * 由 99-apply 作为 always-on installer 安装（duty channel 附近），所以智能情境
		 * 模块被关掉时胶囊仍然存在：此时 summary().runtime 为 false，胶囊显示中性
		 * 「天气」状态，绝不自己联网、也绝不自动 enable 天气。数据只读
		 * `weatherController.summary()` 的 7 个键（enabled/text/last/updatedAt/error/
		 * hasLocation/runtime）；优先订阅模型变化，只有 subscribe 不可用时才用 60 秒
		 * 轮询兜底；语言切换用 subscribeTl5I18n 刷新文案与 aria-label。
		 *
		 * click / Enter / Space 只调用已存在的 `globalThis.tianlightRoleHub.open()`：
		 * 角色中枢里本来就有天气卡。不新增网络路径、权限、全局句柄或设置入口。
		 *
		 * 生命周期：dispose 移除节点、退订、清定时器与监听；document.body 为空时安全
		 * 跳过；重复安装复用孤儿节点，页面上永远只有一颗胶囊。
		 */
		/** off / no-location / waiting / error / ready 五态；runtime 缺失归入 off。 */
		function weatherChipState(summary) {
			if (summary === null || summary === undefined || typeof summary !== "object") return "off";
			if (summary.enabled !== true || summary.runtime !== true) return "off";
			if (summary.hasLocation !== true) return "no-location";
			const hasLast = summary.last !== null && summary.last !== undefined;
			const error = typeof summary.error === "string" ? summary.error : "";
			// v2.2.12: 有旧数据时不再整块换成「错误」——数据照常显示，只降级成 stale。
			if (hasLast === true) {
				if (error !== "" || summary.stale === true) return "stale";
				return "ready";
			}
			if (error !== "") return "error";
			return "waiting";
		}

		/**
		 * 胶囊可见文案：温度与描述分开两个 span（样式 owner 按
		 * `[data-tl-weather-temp]` / `[data-tl-weather-desc]` 精确布局）。ready 时温度
		 * 取 summary.last.temperatureC、描述用本地 WMO 码映射到既有的
		 * `ctx.weather.desc*` 键；其它状态温度留空（hidden）、描述是状态短文案。
		 * 自包含实现（不依赖片段里的其它 helper），便于隔离 verifier 直接执行。
		 */
		function weatherChipVisibleParts(state, summary) {
			const describe = (code) => {
				const value = Number(code);
				if (Number.isFinite(value) === false) return TL_T("ctx.weather.descUnknown");
				if (value === 0) return TL_T("ctx.weather.descClear");
				if (value === 1) return TL_T("ctx.weather.descMainlyClear");
				if (value === 2) return TL_T("ctx.weather.descPartlyCloudy");
				if (value === 3) return TL_T("ctx.weather.descOvercast");
				if (value === 45 || value === 48) return TL_T("ctx.weather.descFog");
				if (value === 56 || value === 57 || value === 66 || value === 67) return TL_T("ctx.weather.descFreezing");
				if (value === 95 || value === 96 || value === 99) return TL_T("ctx.weather.descThunder");
				if (value === 80 || value === 81 || value === 82) return TL_T("ctx.weather.descShowers");
				if (value === 51 || value === 53 || value === 55) return TL_T("ctx.weather.descDrizzle");
				if (value === 71 || value === 73 || value === 75 || value === 77) return TL_T("ctx.weather.descSnow");
				if (value === 85 || value === 86) return TL_T("ctx.weather.descSnowShowers");
				if (value >= 51 && value <= 67) return TL_T("ctx.weather.descRain");
				if (value >= 80 && value <= 99) return TL_T("ctx.weather.descRain");
				return TL_T("ctx.weather.descUnknown");
			};
			if (state === "ready" || state === "stale") {
				const last = summary !== null && typeof summary === "object" ? summary.last : null;
				if (last !== null && last !== undefined && typeof last === "object") {
					const temperature = Number(last.temperatureC);
					return {
						temp: Number.isFinite(temperature) ? String(temperature) + "°C" : "",
						desc: describe(last.code),
					};
				}
				if (state === "stale") return { temp: "", desc: TL_T("weather.chip.stale") };
				return { temp: "", desc: TL_T("weather.chip.ready") };
			}
			if (state === "no-location") return { temp: "", desc: TL_T("weather.chip.noLocation") };
			if (state === "waiting") return { temp: "", desc: TL_T("weather.chip.waiting") };
			if (state === "error") return { temp: "", desc: TL_T("weather.chip.error") };
			return { temp: "", desc: TL_T("weather.chip.off") };
		}

		/**
		 * title / aria-label 的本地化详情：只用 summary 的键，不发起任何请求。
		 * 自包含实现（错误码/时间格式化都在函数内），隔离 verifier 可直接执行；每个
		 * 分支都用完整字面量 key 调 TL_T，静态 i18n 审计才能看到真实 key。
		 *
		 * v2.2.12：stale（有旧数据但过期/失败）不再吞掉数据，title 说清「数据来自
		 * HH:MM」以及是「正在更新」还是「更新失败：原因」。
		 */
		function weatherChipDetail(state, summary) {
			const clock = (at) => {
				const value = Number(at);
				if (Number.isFinite(value) === false || value <= 0) return "";
				const date = new Date(value);
				if (Number.isFinite(date.getTime()) === false) return "";
				return String(date.getHours()).padStart(2, "0") + ":" + String(date.getMinutes()).padStart(2, "0");
			};
			const reason = (code) => {
				if (code === "network") return TL_T("ctx.weather.errorNetwork");
				if (code === "timeout") return TL_T("ctx.weather.errorTimeout");
				if (code === "invalid") return TL_T("ctx.weather.errorInvalid");
				if (code === "geocode") return TL_T("ctx.weather.errorGeocode");
				if (code === "geolocation") return TL_T("ctx.weather.errorGeolocation");
				if (code === "unavailable") return TL_T("ctx.weather.errorUnavailable");
				if (code === "busy") return TL_T("hub.weather.reason.busy");
				if (code === "host-stale") return TL_T("hub.weather.reason.hostStale");
				const upstream = /^upstream-([1-5][0-9][0-9])$/.exec(code);
				if (upstream !== null) return TL_T("hub.weather.reason.upstream", { status: upstream[1] });
				return code;
			};
			if (state === "no-location") return TL_T("weather.chip.detailNoLocation");
			if (state === "waiting") return TL_T("weather.chip.detailWaiting");
			if (state === "stale") {
				const code =
					summary !== null && typeof summary === "object" && typeof summary.error === "string" ? summary.error : "";
				const time = clock(summary !== null && typeof summary === "object" ? summary.updatedAt : 0);
				if (time === "") return TL_T("weather.chip.detailStaleUnknown");
				if (code === "") return TL_T("weather.chip.detailStale", { time: time });
				return TL_T("weather.chip.detailStaleError", { time: time, reason: reason(code) });
			}
			if (state === "error") {
				const code = summary !== null && typeof summary === "object" && typeof summary.error === "string" ? summary.error : "";
				return TL_T("weather.chip.detailError", { reason: reason(code) });
			}
			if (state === "ready") {
				const text = typeof summary.text === "string" && summary.text !== "" ? summary.text : TL_T("weather.chip.ready");
				const time = clock(summary !== null && typeof summary === "object" ? summary.updatedAt : 0);
				return time === "" ? text : TL_T("weather.chip.detailReady", { text: text, time: time });
			}
			if (summary !== null && typeof summary === "object" && summary.enabled === true && summary.runtime !== true) {
				return TL_T("weather.chip.detailMissing");
			}
			return TL_T("weather.chip.detailOff");
		}

		/** 图标只是装饰（aria-hidden）：WMO 码 → 单字符字形，闭集、不联网。 */
		function weatherChipGlyph(state, summary) {
			if ((state !== "ready" && state !== "stale") || summary === null || typeof summary !== "object") return "☁";
			const last = summary.last;
			if (last === null || last === undefined || typeof last !== "object") return "☁";
			const code = Number(last.code);
			if (Number.isFinite(code) === false) return "☁";
			if (code === 71 || code === 73 || code === 75 || code === 77 || code === 85 || code === 86) return "❄";
			if (code === 95 || code === 96 || code === 99) return "⚡";
			if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return "☂";
			if (code === 45 || code === 48 || code === 2 || code === 3) return "☁";
			if (code === 0 || code === 1) return last.isDay === true ? "☀" : "☾";
			return "☁";
		}

		/**
		 * 天气胶囊安装器。节点只创建一次（重复安装复用同一颗），每次数据/语言变化只
		 * 更新文本与属性，不重建 DOM。dispose 幂等。
		 */
		function installWeatherChip() {
			const body = document.body;
			if (body === null || body === undefined) return () => {};
			const WEATHER_CHIP_POLL_MS = 60000;
			// 幂等单节点：上一实例/旧构建可能留下孤儿节点，直接复用；正常 teardown 已移除
			// 节点，所以这里通常走创建分支。节点只创建一次，数据/语言变化只更新文本。
			let chip = body.querySelector("[data-tl-weather-chip]");
			if (chip === null) {
				chip = document.createElement("div");
				chip.setAttribute("data-tl-weather-chip", "");
				body.appendChild(chip);
			}
			chip.setAttribute("role", "button");
			chip.setAttribute("tabindex", "0");
			let icon = chip.querySelector("[data-tl-weather-icon]");
			if (icon === null) {
				icon = document.createElement("span");
				icon.setAttribute("data-tl-weather-icon", "");
				icon.setAttribute("aria-hidden", "true");
				chip.appendChild(icon);
			}
			let temp = chip.querySelector("[data-tl-weather-temp]");
			if (temp === null) {
				temp = document.createElement("span");
				temp.setAttribute("data-tl-weather-temp", "");
				chip.appendChild(temp);
			}
			let desc = chip.querySelector("[data-tl-weather-desc]");
			if (desc === null) {
				desc = document.createElement("span");
				desc.setAttribute("data-tl-weather-desc", "");
				chip.appendChild(desc);
			}
			// v2.2.12: 出错但有旧数据时只加一个很小的失败标记，不把整颗胶囊换成「错误」。
			let badge = chip.querySelector("[data-tl-weather-badge]");
			if (badge === null) {
				badge = document.createElement("span");
				badge.setAttribute("data-tl-weather-badge", "");
				badge.setAttribute("aria-hidden", "true");
				badge.style.marginLeft = "2px";
				badge.style.fontWeight = "700";
				chip.appendChild(badge);
			}

			let alive = true;
			let unsubscribeWeather = null;
			let unsubscribeModules = null;
			let pollTimer = 0;
			const openRoleHub = () => {
				// 中枢是可选的 always-on 基础设施：缺席时静默，不抛错、不弹窗。
				try {
					globalThis.tianlightRoleHub?.open?.();
				} catch (error) {
					note("context:weather-chip-open", error);
				}
			};
			const onClick = (event) => {
				if (event !== null && event !== undefined && typeof event.stopPropagation === "function") {
					// 胶囊浮在 DSH 表面之上：这一下点击只负责开中枢，不能同时触发底下的
					// 菜单关闭/场景点击处理器。
					event.stopPropagation();
				}
				openRoleHub();
			};
			const onKeyDown = (event) => {
				if (event === null || event === undefined) return;
				const key = typeof event.key === "string" ? event.key : "";
				if (key !== "Enter" && key !== " " && key !== "Spacebar") return;
				if (typeof event.preventDefault === "function") event.preventDefault();
				if (typeof event.stopPropagation === "function") event.stopPropagation();
				openRoleHub();
			};
			const refresh = () => {
				if (alive === false) return;
				let summary = null;
				try {
					summary = weatherController.summary();
				} catch (error) {
					note("context:weather-chip-summary", error);
					summary = null;
				}
				const state = weatherChipState(summary);
				const hint = TL_T("weather.chip.openHint");
				const detail = weatherChipDetail(state, summary);
				const aria = TL_T("weather.chip.aria", { text: detail, hint: hint });
				const parts = weatherChipVisibleParts(state, summary);
				const stale = state === "stale";
				const failed = typeof summary?.error === "string" && summary.error !== "";
				chip.setAttribute("data-tl-weather-state", state);
				chip.setAttribute("aria-label", aria);
				chip.title = aria;
				// §2.6: stale 时温度保留但灰显；data-tl-weather-stale 供样式层使用，内联
				// filter/opacity 是不依赖 CSS 片段的兜底（样式片段不在本次改动范围内）。
				if (stale === true) chip.setAttribute("data-tl-weather-stale", "");
				else chip.removeAttribute("data-tl-weather-stale");
				chip.style.filter = stale === true ? "grayscale(1)" : "";
				chip.style.opacity = stale === true ? "0.72" : "";
				badge.textContent = failed === true && summary?.last !== null && summary?.last !== undefined ? "!" : "";
				badge.hidden = badge.textContent === "";
				icon.textContent = weatherChipGlyph(state, summary);
				temp.textContent = parts.temp;
				temp.hidden = parts.temp === "";
				desc.textContent = parts.desc;
			};

			chip.addEventListener("click", onClick);
			chip.addEventListener("keydown", onKeyDown);
			const unsubscribeI18n = subscribeTl5I18n(refresh);
			try {
				if (weatherController !== null && weatherController !== undefined && typeof weatherController.subscribe === "function") {
					const unsubscribe = weatherController.subscribe(refresh);
					if (typeof unsubscribe === "function") unsubscribeWeather = unsubscribe;
				}
			} catch (error) {
				unsubscribeWeather = null;
				note("context:weather-chip-subscribe", error);
			}
			// 智能情境模块的开关会改变 summary().runtime：订阅模块状态，让胶囊在模块被
			// 关掉/重新打开时立刻回到中性态或恢复显示，而不用等下一次天气抓取。
			try {
				if (typeof moduleController !== "undefined" && typeof moduleController.subscribe === "function") {
					const unsubscribe = moduleController.subscribe(refresh);
					if (typeof unsubscribe === "function") unsubscribeModules = unsubscribe;
				}
			} catch (error) {
				note("context:weather-chip-modules", error);
			}
			// 需求兜底：模型没有 subscribe 时才用 60 秒轮询；正常路径零定时器。
			if (unsubscribeWeather === null) pollTimer = window.setInterval(refresh, WEATHER_CHIP_POLL_MS);
			refresh();

			let disposed = false;
			const dispose = () => {
				if (disposed === true) return;
				disposed = true;
				alive = false;
				chip.removeEventListener("click", onClick);
				chip.removeEventListener("keydown", onKeyDown);
				if (unsubscribeWeather !== null) {
					try {
						unsubscribeWeather();
					} catch (error) {
						note("context:weather-chip-unsubscribe", error);
					}
				}
				unsubscribeWeather = null;
				if (unsubscribeModules !== null) {
					try {
						unsubscribeModules();
					} catch (error) {
						note("context:weather-chip-modules-unsubscribe", error);
					}
				}
				unsubscribeModules = null;
				if (pollTimer !== 0) {
					window.clearInterval(pollTimer);
					pollTimer = 0;
				}
				try {
					unsubscribeI18n();
				} catch (error) {
					note("context:weather-chip-i18n", error);
				}
				chip.remove();
			};
			return dispose;
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
				"ctx.focusHint": "对话生成中会压暗并模糊整张壁纸，结束后恢复；默认关闭。它不暂停播放，但会明显改变壁纸观感。",
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
				"ctx.weather.statusStale": "上次 {desc} {temperature}°C · {time} · 正在重试（{reason}）",
				"ctx.weather.runtimeMissing": "环境模块未挂载",
				"ctx.weather.summaryLast": "{desc} · {temperature}°C",
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
				"weather.chip.aria": "天气：{text}。{hint}",
				"weather.chip.off": "天气",
				"weather.chip.noLocation": "未设位置",
				"weather.chip.waiting": "等待数据",
				"weather.chip.error": "获取失败",
				"weather.chip.ready": "天气",
				"weather.chip.openHint": "点击打开角色中枢查看天气卡",
				"weather.chip.detailOff": "天气未启用",
				"weather.chip.detailMissing": "天气运行时未挂载",
				"weather.chip.detailNoLocation": "已启用，尚未设置位置",
				"weather.chip.detailWaiting": "正在等待首次天气数据",
				"weather.chip.detailError": "获取失败：{reason}",
				"weather.chip.detailReady": "{text} · 更新于 {time}",
				"weather.chip.stale": "数据偏旧",
				"weather.chip.detailStale": "数据来自 {time}，正在更新",
				"weather.chip.detailStaleError": "数据来自 {time}，更新失败：{reason}",
				"weather.chip.detailStaleUnknown": "数据已过期，正在更新",
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
				"ctx.focusHint": "While a reply is generating, dims and blurs the WHOLE wallpaper, then restores it. Off by default. Playback keeps running, but the wallpaper visibly changes.",
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
				"ctx.weather.statusStale": "Last {desc} {temperature}°C · {time} · retrying ({reason})",
				"ctx.weather.runtimeMissing": "Context module not mounted",
				"ctx.weather.summaryLast": "{desc} · {temperature}°C",
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
				"weather.chip.aria": "Weather: {text}. {hint}",
				"weather.chip.off": "Weather",
				"weather.chip.noLocation": "No location",
				"weather.chip.waiting": "Waiting",
				"weather.chip.error": "Failed",
				"weather.chip.ready": "Weather",
				"weather.chip.openHint": "Click to open the role hub weather card",
				"weather.chip.detailOff": "Weather is off",
				"weather.chip.detailMissing": "Weather runtime is not mounted",
				"weather.chip.detailNoLocation": "Enabled, but no location is set",
				"weather.chip.detailWaiting": "Waiting for the first weather data",
				"weather.chip.detailError": "Fetch failed: {reason}",
				"weather.chip.detailReady": "{text} · updated {time}",
				"weather.chip.stale": "stale",
				"weather.chip.detailStale": "data from {time}, updating",
				"weather.chip.detailStaleError": "data from {time}, update failed: {reason}",
				"weather.chip.detailStaleUnknown": "data is stale, updating",
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
				const last = weather.last;
				// v2.0.6：上游整段不可用时，保留上一次读数并标出时间与原因，
				// 而不是把整张卡换成一行错误——那正是「看起来停在几小时前」的来源。
				if (errorKey !== "") {
					if (last !== null && typeof last === "object") {
						return t("ctx.weather.statusStale", {
							desc: t(weatherDescriptionKey(last.code)),
							temperature: String(last.temperatureC),
							time: formatWeatherTime(Math.max(Number(last.at) || 0, weatherFreshAt)),
							reason: t(errorKey),
						});
					}
					return t("ctx.weather.statusError", { reason: t(errorKey) });
				}
				if (last === null || typeof last !== "object") return t("ctx.weather.statusWaiting");
				return t("ctx.weather.statusLast", {
					desc: t(weatherDescriptionKey(last.code)),
					temperature: String(last.temperatureC),
					// v2.0.6: show the newest successful poll, not only the last value change.
					time: formatWeatherTime(Math.max(Number(last.at) || 0, weatherFreshAt)),
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
		/**
		 * v2.2.12：C4 天气网络状态机（从 installContextRuntime 里拆出来，便于隔离验证）。
		 *
		 * 这一版修的是「刷新失败 / 旧数据长期挂着」本身：
		 *
		 *  1. **单飞**：同一时刻只允许一次天气请求。已有请求在跑时，新的调用（含手动
		 *     刷新）直接 await 同一个 Promise，不再发第二个请求、也不再把前一个标记成
		 *     `aborted`。手动刷新若搭的那次失败，会立刻补发一次。
		 *  2. **直连与宿主并发**：两条路同时出发（已知可用路线让另一条晚 250ms 起跑），
		 *     谁先拿到合法 payload 用谁，另一条 abort；总预算 10s。旧顺序最坏 18.5s。
		 *  3. **只有 dispose 才算 aborted**：不再用共享 token 互相作废；城市解析用自己的
		 *     token（解析城市和取天气互不影响）。
		 *  4. **失败不推进成功时间**：`lastWeatherSuccessAt` 只在成功后更新，切回可见/联网/唤醒
		 *     时按它判断「是否已经过了间隔」，所以一次失败不会把下一次补刷推迟一整轮。
		 *  5. **隐藏不消耗退避**：退避定时器在窗口隐藏（Windows 上被完全遮挡也算）时到点
		 *     只挂起，变可见立即执行。
		 *  6. **唤醒追平**：60s 时钟检测时间跳变（>3 分钟）视为睡眠唤醒，同样触发过期检查。
		 *  7. **错误码可读**：上游非 200 → `upstream-<状态码>`，宿主忙 → `busy`，宿主还是
		 *     旧版本 → `host-stale`，中枢才能说清原因。
		 *
		 * deps 全显式传入（controller / normalize / ambience / fetch / AbortController /
		 * document / navigator / clock / timers / endpoints / limits / alive / note /
		 * diag），所以 tools/test.mjs 可以直接从产物里抽出这个函数、用假 fetch 与假定时器
		 * 驱动它，不需要启动 DSH。
		 */
		function createWeatherRuntime(deps) {
			const options = deps !== null && typeof deps === "object" ? deps : {};
			const controller = options.controller;
			const limits = options.limits;
			const endpoints = options.endpoints;
			const timers = options.timers !== null && typeof options.timers === "object" ? options.timers : {};
			const clock = typeof options.clock === "function" ? options.clock : () => Date.now();
			const documentRef = options.document ?? null;
			const navigatorRef = options.navigator ?? null;
			const fetchImpl = options.fetch;
			const AbortImpl = options.AbortController;
			const aliveGuard = typeof options.alive === "function" ? options.alive : () => true;
			const note = typeof options.note === "function" ? options.note : () => {};
			const diag = typeof options.diag === "function" ? options.diag : () => {};
			const normalize = typeof options.normalize === "function" ? options.normalize : () => null;
			const ambience = typeof options.ambience === "function" ? options.ambience : () => {};
			const coerceCoordinate = typeof options.coerceCoordinate === "function" ? options.coerceCoordinate : () => null;

			const setTimeoutFn = typeof timers.setTimeout === "function" ? timers.setTimeout : (fn, ms) => globalThis.setTimeout(fn, ms);
			const clearTimeoutFn = typeof timers.clearTimeout === "function" ? timers.clearTimeout : (id) => globalThis.clearTimeout(id);
			const setIntervalFn = typeof timers.setInterval === "function" ? timers.setInterval : (fn, ms) => globalThis.setInterval(fn, ms);
			const clearIntervalFn = typeof timers.clearInterval === "function" ? timers.clearInterval : (id) => globalThis.clearInterval(id);

			let alive = true;
			let inflight = null;
			let pollTimer = 0;
			let pollMinutes = 0;
			let retryTimer = 0;
			let retryStep = 0;
			let retryPending = false;
			let scheduleKey = "";
			let cityToken = 0;
			let lastWeatherSuccessAt = 0;
			let clockAt = 0;
			const aborters = new Set();

			const isAlive = () => alive === true && aliveGuard() !== false;
			const now = () => {
				const value = Number(clock());
				return Number.isFinite(value) ? value : 0;
			};
			const stateOf = () => controller.state();
			const hasLocation = (state) =>
				state !== null &&
				typeof state === "object" &&
				state.latitude !== null &&
				state.latitude !== undefined &&
				state.longitude !== null &&
				state.longitude !== undefined &&
				Number.isFinite(Number(state.latitude)) &&
				Number.isFinite(Number(state.longitude)) &&
				Math.abs(Number(state.latitude)) <= 90 &&
				Math.abs(Number(state.longitude)) <= 180;
			const intervalMinutes = (state) =>
				limits.intervals.includes(Number(state.intervalMin)) ? Number(state.intervalMin) : 30;
			const weatherValuesEqual = (left, right) => {
				if (left === null || left === undefined || right === null || right === undefined) return false;
				return left.code === right.code && left.temperatureC === right.temperatureC && left.isDay === right.isDay;
			};
			/** 错误码原样保留上游状态码，其余非法值一律退回 network。 */
			const errorCode = (code) => {
				if (code === "network" || code === "timeout" || code === "invalid" || code === "busy" || code === "host-stale") {
					return code;
				}
				if (typeof code === "string" && /^upstream-/.test(code)) return code;
				return "network";
			};

			const sleep = (ms) => new Promise((resolve) => setTimeoutFn(resolve, ms));
			const openRequest = (timeoutMs) => {
				const entry = { controller: new AbortImpl(), timeoutId: 0, timedOut: false, cancelled: false };
				aborters.add(entry);
				entry.timeoutId = setTimeoutFn(() => {
					entry.timedOut = true;
					try {
						entry.controller.abort();
					} catch {
						// already aborted
					}
				}, timeoutMs);
				return entry;
			};
			const closeRequest = (entry) => {
				aborters.delete(entry);
				if (entry.timeoutId !== 0) {
					clearTimeoutFn(entry.timeoutId);
					entry.timeoutId = 0;
				}
			};
			const cancelRequest = (entry) => {
				entry.cancelled = true;
				try {
					entry.controller.abort();
				} catch {
					// already aborted
				}
			};
			const clearRequests = () => {
				for (const entry of [...aborters]) cancelRequest(entry);
			};
			const requestError = (entry, error) => {
				if (entry.cancelled === true) return "aborted";
				if (entry.timedOut === true) return "timeout";
				if (error !== null && error !== undefined && error.name === "AbortError") return "timeout";
				return "network";
			};

			const forecastUrl = (state) =>
				endpoints.forecast +
				"?latitude=" +
				encodeURIComponent(String(state.latitude)) +
				"&longitude=" +
				encodeURIComponent(String(state.longitude)) +
				"&current=temperature_2m,weather_code,is_day&timezone=auto";
			const hostUrl = (state) =>
				endpoints.host +
				"/_weather?latitude=" +
				encodeURIComponent(String(state.latitude)) +
				"&longitude=" +
				encodeURIComponent(String(state.longitude)) +
				"&api=" +
				String(limits.apiVersion);

			/** 直连：非 200 带状态码（429 限流要能被中枢说出来）。 */
			const requestDirect = async (state, open) => {
				const entry = open(limits.directTimeoutMs);
				try {
					const response = await fetchImpl(forecastUrl(state), { signal: entry.controller.signal, cache: "no-store" });
					if (isAlive() === false) return { ok: false, error: "aborted", route: "direct" };
					if (response === null || response === undefined || response.ok !== true) {
						const status = Number(response?.status ?? 0);
						return { ok: false, error: status >= 400 ? "upstream-" + status : "network", route: "direct", status };
					}
					const payload = await response.json();
					if (isAlive() === false) return { ok: false, error: "aborted", route: "direct" };
					return { ok: true, payload, route: "direct" };
				} catch (error) {
					return { ok: false, error: requestError(entry, error), route: "direct" };
				} finally {
					closeRequest(entry);
				}
			};

			const requestHostOnce = async (state, open) => {
				const entry = open(limits.hostTimeoutMs);
				try {
					const response = await fetchImpl(hostUrl(state), {
						signal: entry.controller.signal,
						cache: "no-store",
						credentials: "same-origin",
					});
					if (isAlive() === false) return { ok: false, error: "aborted", route: "host-https" };
					if (response === null || response === undefined || response.ok !== true) {
						const status = Number(response?.status ?? 0);
						if (status === 429) return { ok: false, error: "busy", route: "host-https", status };
						return {
							ok: false,
							error: status >= 500 ? "network" : status >= 400 ? "upstream-" + status : "network",
							route: "host-https",
							status,
						};
					}
					const body = await response.json();
					const route = body !== null && typeof body === "object" && body.transport === "http" ? "host-http" : "host-https";
					if (body === null || typeof body !== "object") return { ok: false, error: "invalid", route };
					const apiVersion = Number(body.apiVersion);
					const versionKnown = Number.isFinite(apiVersion);
					if (body.ok !== true) {
						// §2.8: an old host route has no apiVersion. When it cannot answer either,
						// say "restart DSH" (host-stale) instead of a misleading network error.
						if (versionKnown === false || apiVersion !== limits.apiVersion) {
							diag("context", { weatherHostApi: versionKnown === true ? apiVersion : null, weatherHostError: String(body.error ?? "") });
							return { ok: false, error: "host-stale", route };
						}
						const error = body.error === "busy" ? "busy" : body.error === "timeout" ? "timeout" : "network";
						return { ok: false, error, route };
					}
					// A working old host is still better than nothing: accept the payload, but
					// record the version gap so diagnostics can explain a later restart.
					if (versionKnown === false || apiVersion !== limits.apiVersion) {
						diag("context", { weatherHostApi: versionKnown === true ? apiVersion : null });
					}
					return {
						ok: true,
						payload: body.payload,
						route,
						via: typeof body.via === "string" ? body.via : "",
					};
				} catch (error) {
					return { ok: false, error: requestError(entry, error), route: "host-https" };
				} finally {
					closeRequest(entry);
				}
			};

			/** 宿主 429 = 另一个窗口正在取：等它一下再试，这是「等正在跑的那次」而不是失败。 */
			const requestHost = async (state, open) => {
				const first = await requestHostOnce(state, open);
				if (first.ok === true || first.error !== "busy" || isAlive() === false) return first;
				await sleep(limits.busyWaitMs);
				if (isAlive() === false) return { ok: false, error: "aborted", route: first.route };
				return requestHostOnce(state, open);
			};

			const pickError = (results) => {
				const errors = results
					.map((result) => (result !== null && typeof result === "object" && typeof result.error === "string" ? result.error : ""))
					.filter((code) => code !== "");
				const upstream = errors.find((code) => /^upstream-/.test(code));
				if (upstream !== undefined) return upstream;
				if (errors.includes("host-stale")) return "host-stale";
				if (errors.includes("busy")) return "busy";
				if (errors.includes("timeout")) return "timeout";
				if (errors.includes("invalid")) return "invalid";
				return errors[0] ?? "network";
			};

			/**
			 * 一次「尝试」：直连与宿主并发。失败不会提前结束赛跑（一条路快速报错不该
			 * 掩盖另一条路正在成功），只有成功、两条都失败、或总预算用尽才结算。
			 */
			const fetchOnce = async (state) => {
				const started = now();
				const group = [];
				const open = (timeoutMs) => {
					const entry = openRequest(timeoutMs);
					group.push(entry);
					return entry;
				};
				let settled = false;
				let remaining = 2;
				let lastResults = [];
				let resolveFirst = null;
				let resolveAll = null;
				const firstSuccess = new Promise((resolve) => {
					resolveFirst = resolve;
				});
				const allFailed = new Promise((resolve) => {
					resolveAll = resolve;
				});
				const budgetId = setTimeoutFn(() => {
					if (settled === true) return;
					settled = true;
					resolveAll({ ok: false, error: "timeout", route: "" });
				}, limits.totalBudgetMs);
				const run = async (task) => {
					let result = null;
					try {
						result = await task();
					} catch (error) {
						note("context:weather-route", error);
						result = { ok: false, error: "network", route: "" };
					}
					if (settled === false) {
						lastResults = lastResults.concat([result]);
						remaining -= 1;
						if (result.ok === true) {
							settled = true;
							resolveFirst(result);
						} else if (remaining <= 0) {
							settled = true;
							resolveAll({ ok: false, error: pickError(lastResults), route: "" });
						}
					}
					return result;
				};
				const preferred = limits.routes.includes(String(stateOf().route)) ? String(stateOf().route) : "";
				const hostFirst = preferred === "host-https" || preferred === "host-http";
				// 已知可用路线先起跑，另一条晚 250ms（仍然并发，只是不白抢带宽）。
				const headStart = preferred === "" ? 0 : limits.headStartMs;
				// 晚起跑的那条必须重新确认还没结算：赢家已经出结果时不再白白发一次请求。
				const late = (task) =>
					sleep(headStart).then(() => {
						if (settled === true) return { ok: false, error: "aborted", route: "" };
						return task();
					});
				const tasks = hostFirst
					? [run(() => requestHost(state, open)), run(() => late(() => requestDirect(state, open)))]
					: [run(() => requestDirect(state, open)), run(() => late(() => requestHost(state, open)))];
				const outcome = await Promise.race([firstSuccess, allFailed]);
				settled = true;
				clearTimeoutFn(budgetId);
				for (const entry of [...group]) cancelRequest(entry);
				// 输掉的那条路仍会自己收尾；这里只保证没有未处理的 rejection。
				Promise.all(tasks).catch(() => {});
				const ms = Math.max(0, now() - started);
				if (outcome.ok === true) {
					return { ok: true, payload: outcome.payload, route: outcome.route, transport: outcome.route, via: outcome.via ?? "", ms };
				}
				return { ok: false, error: errorCode(outcome.error), route: "", transport: "", ms };
			};

			const setError = (code) => {
				const next = errorCode(code);
				if (stateOf().lastError === next) return next;
				controller.apply({ lastError: next });
				return next;
			};

			const scheduleRetry = () => {
				if (isAlive() === false || retryTimer !== 0) return;
				const step = retryStep;
				if (step >= limits.retryDelaysMs.length) return;
				const state = stateOf();
				if (state.enabled !== true || hasLocation(state) !== true) return;
				retryTimer = setTimeoutFn(() => {
					retryTimer = 0;
					if (isAlive() === false) return;
					if (documentRef !== null && documentRef.hidden === true) {
						// §2.3: 窗口隐藏（Windows 上被完全遮挡也算）时到点不消耗退避级数，
						// 挂起等 visibilitychange；否则这一级被白白吃掉且不会补。
						retryPending = true;
						return;
					}
					retryStep = step + 1;
					void fetchWeather("retry");
				}, limits.retryDelaysMs[step]);
			};

			const runPendingRetry = () => {
				if (retryPending !== true) return false;
				retryPending = false;
				retryStep = Math.min(retryStep + 1, limits.retryDelaysMs.length);
				void fetchWeather("retry");
				return true;
			};

			const finalize = (state, outcome) => {
				const ms = Math.max(0, Number(outcome.ms) || 0);
				if (outcome.ok !== true) {
					const code = setError(outcome.error);
					scheduleRetry();
					return { ok: false, error: code, transport: "", ms };
				}
				const last = normalize(outcome.payload);
				if (last === null) {
					setError("invalid");
					scheduleRetry();
					return { ok: false, error: "invalid", transport: outcome.route, ms };
				}
				retryStep = 0;
				retryPending = false;
				const at = now();
				lastWeatherSuccessAt = at;
				const unchanged = state.lastError === "" && weatherValuesEqual(state.last, last);
				if (unchanged === true) {
					// v2.2.11 的 repaint 修复保留：值没变也要让「最近成功请求」前进。
					// 读数现在只落本机缓存键（不进宿主同步），所以这里不会有 revision 写入。
					controller.apply({ fetchedAt: at, route: outcome.route });
					controller.touch();
				} else {
					controller.apply({ fetchedAt: at, route: outcome.route, last, lastError: "" });
					ambience(last.code, last.isDay);
				}
				return { ok: true, error: "", transport: outcome.route, ms, at, observedAt: Number(last.observedAt) || 0 };
			};

			const fetchWeather = (source) => {
				if (isAlive() === false) return Promise.resolve({ ok: false, error: "aborted", transport: "", ms: 0 });
				if (typeof fetchImpl !== "function" || typeof AbortImpl !== "function") {
					return Promise.resolve({ ok: false, error: "unavailable", transport: "", ms: 0 });
				}
				const state = stateOf();
				if (state.enabled !== true || hasLocation(state) !== true) {
					return Promise.resolve({ ok: false, error: "unavailable", transport: "", ms: 0 });
				}
				if (inflight !== null) {
					// 单飞：加入正在跑的那次，不再发请求、也不作废它。
					const running = inflight;
					if (source !== "manual") return running;
					return running.then((result) =>
						result !== null && result !== undefined && result.ok === true ? result : fetchWeather("manual-retry"),
					);
				}
				retryPending = false;
				if (source !== "retry" && source !== "manual-retry") retryStep = 0;
				const attempt = (async () => {
					const current = stateOf();
					if (current.enabled !== true || hasLocation(current) !== true) {
						return { ok: false, error: "unavailable", transport: "", ms: 0 };
					}
					const outcome = await fetchOnce(current);
					if (isAlive() === false) return { ok: false, error: "aborted", transport: "", ms: Number(outcome.ms) || 0 };
					const result = finalize(current, outcome);
					diag("context", {
						weatherAttempt: {
							source: source,
							ok: result.ok === true,
							error: result.error,
							transport: result.transport,
							ms: result.ms,
						},
					});
					return result;
				})();
				const tracked = attempt.then(
					(result) => {
						inflight = null;
						return result;
					},
					(error) => {
						inflight = null;
						throw error;
					},
				);
				inflight = tracked;
				return tracked;
			};

			const dueFetch = (source) => {
				if (isAlive() === false) return false;
				const state = stateOf();
				if (state.enabled !== true || hasLocation(state) !== true) return false;
				if (retryPending === true) return runPendingRetry();
				const intervalMs = intervalMinutes(state) * 60000;
				if (lastWeatherSuccessAt === 0 || now() - lastWeatherSuccessAt >= intervalMs) {
					void fetchWeather(source);
					return true;
				}
				return false;
			};

			const clearPoll = () => {
				if (pollTimer !== 0) {
					clearIntervalFn(pollTimer);
					pollTimer = 0;
				}
				pollMinutes = 0;
			};
			const clearRetry = () => {
				if (retryTimer !== 0) {
					clearTimeoutFn(retryTimer);
					retryTimer = 0;
				}
			};

			const tick = () => {
				if (isAlive() === false) return false;
				// 隐藏时绝不发请求（Windows 的遮挡检测会把 DSH 当成 hidden），追平交给
				// visible / online / focus / 唤醒检查。
				if (documentRef !== null && documentRef.hidden === true) return false;
				const state = stateOf();
				if (state.enabled !== true || hasLocation(state) !== true) return false;
				if (retryPending === true) return runPendingRetry();
				void fetchWeather("interval");
				return true;
			};

			const visible = () => {
				if (isAlive() === false) return false;
				if (documentRef !== null && documentRef.hidden === true) return false;
				return dueFetch("visible");
			};

			const online = () => {
				if (isAlive() === false) return false;
				const state = stateOf();
				if (state.enabled !== true || hasLocation(state) !== true) return false;
				// 刚恢复网络而上一轮是失败：立刻重试，不必等满一个间隔。
				if (state.lastError !== "") {
					void fetchWeather("online");
					return true;
				}
				return dueFetch("online");
			};

			const wake = () => {
				if (isAlive() === false) return false;
				if (documentRef !== null && documentRef.hidden === true) return false;
				return dueFetch("wake");
			};

			/** C1 的 60s 时钟喂进来：间隔 > 3 分钟即视为睡眠唤醒（setInterval 不补发）。 */
			const noteClock = () => {
				const at = now();
				const gap = clockAt === 0 ? 0 : at - clockAt;
				clockAt = at;
				if (gap > limits.wakeGapMs) wake();
				return gap;
			};

			const sync = (force) => {
				if (isAlive() === false) return false;
				const state = stateOf();
				if (state.enabled !== true || hasLocation(state) !== true) {
					clearPoll();
					clearRetry();
					retryPending = false;
					scheduleKey = "";
					return false;
				}
				const minutes = intervalMinutes(state);
				if (pollTimer === 0 || pollMinutes !== minutes) {
					clearPoll();
					pollMinutes = minutes;
					pollTimer = setIntervalFn(tick, minutes * 60000);
				}
				const key =
					String(state.enabled) +
					"|" +
					String(state.latitude) +
					"|" +
					String(state.longitude) +
					"|" +
					String(minutes);
				const changed = key !== scheduleKey;
				scheduleKey = key;
				if (force === true || changed === true) void fetchWeather(changed === true ? "enable" : "manual");
				return true;
			};

			const resolveCity = async (query) => {
				if (isAlive() === false) return { ok: false, error: "aborted" };
				const state = stateOf();
				if (state.enabled !== true) return { ok: false, error: "unavailable" };
				if (typeof fetchImpl !== "function" || typeof AbortImpl !== "function") {
					return { ok: false, error: "unavailable" };
				}
				const name = String(query === undefined || query === null ? state.city : query)
					.trim()
					.slice(0, 80);
				if (name === "") return { ok: false, error: "geocode" };
				// 独立 token：城市解析不再和天气请求共用一个，天气轮询不会作废这次解析。
				const token = (cityToken += 1);
				const entry = openRequest(limits.directTimeoutMs);
				try {
					const url =
						endpoints.geocode + "?name=" + encodeURIComponent(name) + "&count=1&language=zh&format=json";
					const response = await fetchImpl(url, { signal: entry.controller.signal, cache: "no-store" });
					if (isAlive() === false || token !== cityToken) return { ok: false, error: "aborted" };
					if (response === null || response === undefined || response.ok !== true) {
						const status = Number(response?.status ?? 0);
						const code = setError(status >= 400 ? "upstream-" + status : "network");
						return { ok: false, error: code };
					}
					const payload = await response.json();
					if (isAlive() === false || token !== cityToken) return { ok: false, error: "aborted" };
					if (stateOf().enabled !== true) return { ok: false, error: "aborted" };
					const first = payload !== null && typeof payload === "object" && Array.isArray(payload.results) ? payload.results[0] : null;
					const latitude = coerceCoordinate(first === null || first === undefined ? null : first.latitude, 90);
					const longitude = coerceCoordinate(first === null || first === undefined ? null : first.longitude, 180);
					if (latitude === null || longitude === null) {
						setError("geocode");
						return { ok: false, error: "geocode" };
					}
					const resolved =
						String((first === null || first === undefined ? "" : first.name) ?? name)
							.trim()
							.slice(0, 80) || name;
					controller.apply({ city: resolved, latitude, longitude, lastError: "" });
					return { ok: true, name: resolved };
				} catch (error) {
					if (isAlive() === false || token !== cityToken) return { ok: false, error: "aborted" };
					const code = setError(requestError(entry, error) === "timeout" ? "timeout" : "network");
					return { ok: false, error: code };
				} finally {
					closeRequest(entry);
				}
			};

			/** 只在用户显式点击时调用；绝不自动请求定位权限。 */
			const useCurrentLocation = () =>
				new Promise((resolve) => {
					if (isAlive() === false) {
						resolve({ ok: false, error: "aborted" });
						return;
					}
					if (stateOf().enabled !== true) {
						resolve({ ok: false, error: "unavailable" });
						return;
					}
					const geolocation = navigatorRef !== null && navigatorRef !== undefined ? navigatorRef.geolocation : null;
					if (geolocation === null || geolocation === undefined || typeof geolocation.getCurrentPosition !== "function") {
						setError("geolocation");
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
								if (isAlive() === false) {
									finish({ ok: false, error: "aborted" });
									return;
								}
								const latitude = coerceCoordinate(
									position === null || position === undefined ? null : position.coords?.latitude,
									90,
								);
								const longitude = coerceCoordinate(
									position === null || position === undefined ? null : position.coords?.longitude,
									180,
								);
								if (latitude === null || longitude === null) {
									setError("geolocation");
									finish({ ok: false, error: "geolocation" });
									return;
								}
								controller.apply({ latitude, longitude, lastError: "" });
								finish({ ok: true });
							},
							() => {
								if (isAlive() === false) {
									finish({ ok: false, error: "aborted" });
									return;
								}
								setError("geolocation");
								finish({ ok: false, error: "geolocation" });
							},
							{ enableHighAccuracy: false, timeout: limits.directTimeoutMs, maximumAge: 600000 },
						);
					} catch {
						setError("geolocation");
						finish({ ok: false, error: "geolocation" });
					}
				});

			const start = () => {
				const state = stateOf();
				lastWeatherSuccessAt = Math.max(Number(state.fetchedAt) || 0, state.last === null ? 0 : Number(state.last.at) || 0);
				clockAt = now();
				return sync(false);
			};

			const stop = () => {
				if (alive === false) return;
				alive = false;
				clearPoll();
				clearRetry();
				retryPending = false;
				cityToken += 1;
				clearRequests();
			};

			return {
				start,
				stop,
				sync,
				tick,
				visible,
				online,
				wake,
				noteClock,
				refresh: () => fetchWeather("manual"),
				resolveCity,
				useCurrentLocation,
				/** 诊断/测试读数：内部状态只读暴露，不参与界面。 */
				state: () => ({
					inflight: inflight !== null,
					retryStep,
					retryPending,
					lastWeatherSuccessAt,
					pollMinutes,
					scheduleKey,
				}),
			};
		}

		function installContextRuntime(ctx) {
			// C1/C2 are client-only; ctx stays in the signature because 99-apply passes it.
			void ctx;
			const body = document.body;
			if (body === null) return () => {};
			// Host settings were adopted in apply() BEFORE this installer runs; refresh the
			// persisted model before wiring timers/observers so adopted values apply now.
			refreshContextState();
			refreshWeatherState();
			// v1.5.0: expose the live weather controller so the role hub / pet brain /
			// diagnostics can render a visible weather card. The module-level token keeps
			// re-applies safe: the first installer remembers the original global value, a
			// stale disposer can never clear a newer instance, and the last disposer
			// restores (or deletes) the original handle.
			const weatherGlobalOwnToken = {};
			weatherExposeGlobal(weatherGlobalOwnToken);

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
			// v2.2.12: 网络状态机在 createWeatherRuntime 里（单飞、直连/宿主并发、退避、
			// 可见/联网/唤醒追平）；这里只负责接线 —— 模型、DOM 事件、定时器与诊断。
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
			const publishWeatherDiag = () => {
				const state = weatherController.state();
				const summary = weatherController.summary();
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
						// v2.2.12: 读数缓存（localStorage-only）与新鲜度。
						fetchedAt: state.fetchedAt,
						route: state.route,
						stale: summary.stale === true,
						observedAt: summary.observedAt,
						freshAt: summary.freshAt,
					},
				});
			};
			publishWeatherDiag();

			const weatherEngine = createWeatherRuntime({
				controller: weatherController,
				normalize: normalizeWeatherForecast,
				ambience: applyWeatherAmbience,
				coerceCoordinate: normalizeWeatherCoordinate,
				fetch: (url, init) => globalThis.fetch(url, init),
				AbortController: typeof AbortController === "function" ? AbortController : null,
				document,
				navigator: globalThis.navigator ?? null,
				clock: () => Date.now(),
				timers: {
					setTimeout: (fn, ms) => window.setTimeout(fn, ms),
					clearTimeout: (id) => window.clearTimeout(id),
					setInterval: (fn, ms) => window.setInterval(fn, ms),
					clearInterval: (id) => window.clearInterval(id),
				},
				endpoints: {
					forecast: WEATHER_FORECAST_ENDPOINT,
					geocode: WEATHER_GEOCODE_ENDPOINT,
					host: ASSET_BASE,
				},
				limits: {
					intervals: WEATHER_INTERVALS,
					routes: WEATHER_ROUTES,
					directTimeoutMs: WEATHER_TIMEOUT_MS,
					hostTimeoutMs: WEATHER_HOST_TIMEOUT_MS,
					totalBudgetMs: WEATHER_TOTAL_BUDGET_MS,
					headStartMs: WEATHER_RACE_HEAD_START_MS,
					retryDelaysMs: WEATHER_RETRY_DELAYS_MS,
					wakeGapMs: WEATHER_WAKE_GAP_MS,
					busyWaitMs: WEATHER_BUSY_WAIT_MS,
					apiVersion: WEATHER_API_VERSION,
				},
				alive: () => alive === true,
				diag: tl5Diag,
				note,
			});
			// 组合句柄：外部（中枢/设置面板/诊断）只认识这几个方法，网络细节不外泄。
			// v2.2.12 顺手暴露 tick/visible/online/wake/detail（只读/幂等），供自检与测试驱动。
			weatherRuntime = {
				refresh: () => weatherEngine.refresh(),
				resolveCity: (query) => weatherEngine.resolveCity(query),
				useCurrentLocation: () => weatherEngine.useCurrentLocation(),
				tick: () => weatherEngine.tick(),
				visible: () => weatherEngine.visible(),
				online: () => weatherEngine.online(),
				wake: () => weatherEngine.wake(),
				detail: () => ({ ...weatherEngine.state(), summary: weatherController.summary() }),
			};
			const unsubscribeWeather = weatherController.subscribe(() => {
				weatherEngine.sync(false);
				publishWeatherDiag();
			});
			weatherEngine.start();
			// §2.3: 联网恢复与窗口重新聚焦都按同一个「是否已过间隔」规则补一次。
			const onWeatherOnline = () => weatherEngine.online();
			const onWeatherFocus = () => weatherEngine.visible();
			window.addEventListener("online", onWeatherOnline);
			window.addEventListener("focus", onWeatherFocus);

			// ONE interval for C1: 60s, no writes while hidden or in manual mode.
			clockTimer = window.setInterval(() => {
				if (alive === false) return;
				// §2.3: setInterval 不会补发系统睡眠期间的 tick。先让天气运行时看时间跳变
				// （>3 分钟视作唤醒），再走 C1 的时段检查——即便 C1 关着也要检测。
				weatherEngine.noteClock();
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
				// C4 v2.2.12: 隐藏期间的 tick 全部被跳过（不做后台网络），所以切回可见时
				// 按「最近成功时间」判断是否过期；挂起的失败重试也在这里立即执行。普通
				// 窗口切换不会重复请求，也不会再写任何同步键。
				weatherEngine.visible();
			};
			const unsubscribe = contextController.subscribe(() => reconcile(true));
			document.addEventListener("visibilitychange", onVisibilityChange);
			reconcile(true);
			weatherEngine.sync(false);

			return () => {
				if (alive === false) return;
				alive = false;
				window.removeEventListener("online", onWeatherOnline);
				window.removeEventListener("focus", onWeatherFocus);
				weatherEngine.stop();
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
				// v1.5.0: only the owner of the current global handle restores it. Re-apply
				// and late-dispose are handled by the token; the object check keeps a foreign
				// global (someone else took the name) untouched.
				if (weatherGlobalToken === weatherGlobalOwnToken) {
					weatherGlobalToken = null;
					try {
						if (globalThis.tianlightWeather === weatherController) {
							if (weatherGlobalPrevious === undefined) delete globalThis.tianlightWeather;
							else globalThis.tianlightWeather = weatherGlobalPrevious;
						}
					} catch (error) {
						note("context:weather-global-dispose", error);
					}
					weatherGlobalPrevious = undefined;
				}
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
