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
		 * v1.5.0 天气可见化：给角色中枢/诊断用的一次性本地化摘要。只读——绝不发起
		 * 请求、绝不写存储；五态文案复用面板同一批 `ctx.weather.*` 键，所以隐藏的
		 * 「环境」分区和中枢不会说出两种天气。
		 *
		 * 状态优先级：未启用 → 运行时未挂载 → 未设位置 → 最近一次错误 → 已拿到数据
		 * → 等待首帧。`runtime` 只表示 installContextRuntime 是否已挂载（网络+定时器
		 * 的持有者），与用户是否启用无关。
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
					const errorKey = weatherErrorKey(error);
					text = TL_T("ctx.weather.statusError", {
						reason: errorKey === "" ? error : TL_T(errorKey),
					});
				} else if (last !== null) {
					text = TL_T("ctx.weather.summaryLast", {
						desc: TL_T(weatherDescriptionKey(last.code)),
						temperature: String(last.temperatureC),
					});
				} else {
					text = TL_T("ctx.weather.statusWaiting");
				}
				return {
					enabled: state.enabled === true,
					hasLocation: hasLocation === true,
					runtime,
					last,
					text,
					error,
					updatedAt: last === null ? null : last.at,
				};
			} catch (summaryError) {
				return {
					enabled: false,
					hasLocation: false,
					runtime: weatherRuntime !== null,
					last: null,
					text: "",
					error: "",
					updatedAt: null,
				};
			}
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
