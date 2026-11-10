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
