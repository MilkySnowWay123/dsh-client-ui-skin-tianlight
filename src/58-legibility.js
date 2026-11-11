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
		// S2: boost decisions are made from the ORIGINAL panel fill only. Once the guard
		// adds `data-tl-legibility="boost"`, the computed panel background becomes the
		// boosted solid; using it as the next input made the guard oscillate
		// (boost -> looks fine -> un-boost -> looks low -> boost ...). The release margin
		// is a hysteresis band: leave boost only when the original contrast is clearly
		// above the target, so two evaluations around the threshold cannot flip-flop.
		const LEGIBILITY_HYSTERESIS = 0.25;
		/**
		 * Pure decision (instrumented by tools/test.mjs): should the panel be boosted?
		 * `ratio` MUST be the contrast computed from the original (un-boosted) fill.
		 */
		function legibilityShouldBoost(ratio, threshold, enabled, alreadyBoosted) {
			if (enabled !== true) return false;
			if (Number.isFinite(ratio) !== true || Number.isFinite(threshold) !== true) return alreadyBoosted === true;
			if (alreadyBoosted === true) return ratio < threshold + LEGIBILITY_HYSTERESIS;
			return ratio < threshold;
		}
		/**
		 * S2b (REV-S2 F2): cache key for the original fill. It includes the base panel
		 * token and the host's inline `--tl-panel-fill`, so a same-theme base change
		 * (glass amount, sidebar tint, font-panel host) is visible even while boosted.
		 */
		function legibilityBaseCacheKey(dark, panelToken, inlineFill) {
			// Length-prefixed join (not a bare "|" concatenation) so tokens that contain
			// the separator cannot collide with a different (dark, token, inline) triple.
			const theme = dark === true ? "dark" : "light";
			const tokenText = String(panelToken ?? "");
			const inlineText = String(inlineFill ?? "");
			return theme.length + ":" + theme + ":" + tokenText.length + ":" + tokenText + ":" + inlineText.length + ":" + inlineText;
		}
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
			// REV-S2 F6: an exception or hot reload can leave the boost attribute and its
			// CSS variables on body. Start every install from a clean slate before sampling
			// so a stale boost cannot skew the first decision.
			try {
				body.removeAttribute("data-tl-legibility");
				body.style.removeProperty("--tl-legibility-solid");
				body.style.removeProperty("--tl-legibility-shadow");
			} catch (error) {
				note("legibility:reset-boost", error);
			}
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
			// S2: cached original (un-boosted) panel fill per theme. Reading the host's
			// computed background while [data-tl-legibility="boost"] is set returns the
			// boosted solid, which used to feed back into the decision and cause flicker.
			let baseFill = null;
			let baseKey = "";
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
				// R6 A: a hidden/released video (left the video channel) still has a final
				// readyState and would keep tinting the panels from a dead frame.
				const sceneVideo = document.querySelector("[data-tl-scene] > video");
				const video =
					sceneVideo !== null && sceneVideo.hidden === false && sceneVideo.currentSrc !== "" && sceneVideo.readyState >= 2
						? sceneVideo
						: null;
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

			/**
			 * The ORIGINAL panel fill for this theme, independent of the boost attribute.
			 * REV-S2 F2: while boosted, read the cheap inline/base tokens every evaluation
			 * and only reuse the cached color when the token key is unchanged — so a same-
			 * theme base change (glass slider, sidebar tint) is picked up immediately.
			 * Once the boost is off the host's computed background is the real base and
			 * refreshes the cache.
			 */
			const readBaseFill = (host, dark, fallbackFill) => {
				let inlineFill = "";
				if (host !== null) {
					try {
						inlineFill = host.style.getPropertyValue("--tl-panel-fill");
					} catch {
						inlineFill = "";
					}
				}
				let panelToken = "";
				try {
					panelToken = globalThis.getComputedStyle(body).getPropertyValue("--tl-panel-fill");
				} catch {
					panelToken = "";
				}
				const key = legibilityBaseCacheKey(dark, panelToken, inlineFill);
				if (boosted === true && baseFill !== null && baseKey === key) return baseFill;
				let next = parseCssColor(inlineFill);
				if (next === null) next = parseCssColor(panelToken);
				if (next === null && boosted === false && host !== null) {
					try {
						next = parseCssColor(globalThis.getComputedStyle(host).backgroundColor);
					} catch {
						next = null;
					}
				}
				baseFill = next === null ? fallbackFill : next;
				baseKey = key;
				return baseFill;
			};

			/** 面板实际底色/正文色（底色取原始状态，不受已提亮影响）。 */
			const readPanelColors = (sample, dark) => {
				const host = document.querySelector("[data-tl-wall]") ?? document.querySelector("[data-tl-font-panel]");
				const fallbackFill = dark ? { r: 10, g: 18, b: 32, a: 0.96 } : { r: 250, g: 252, b: 255, a: 0.94 };
				const fallbackInk = dark ? { r: 234, g: 243, b: 255, a: 1 } : { r: 15, g: 36, b: 56, a: 1 };
				let fill = fallbackFill;
				let ink = fallbackInk;
				if (host !== null) {
					try {
						const style = globalThis.getComputedStyle(host);
						ink = parseCssColor(style.color) ?? fallbackInk;
					} catch {
						ink = fallbackInk;
					}
				}
				fill = readBaseFill(host, dark, fallbackFill);
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
				// S2: decision uses the original-background ratio and a hysteresis band; the
				// current boost state is an output that is only ever fed back as "already on".
				const shouldBoost = legibilityShouldBoost(ratio, settings.threshold, settings.enabled, boosted);
				let afterRatio = ratio;
				let solid = null;
				if (settings.enabled === true) {
					// F4: only report an "after" ratio when a boost is actually active or
					// would be applied; otherwise it would be a hypothetical number.
					if (shouldBoost === true || boosted === true) {
						solid = boostFillFor(sample, dark);
						afterRatio = contrastRatio(
							relativeLuminance(solid.r, solid.g, solid.b),
							relativeLuminance(colors.ink.r, colors.ink.g, colors.ink.b),
						);
					}
					if (shouldBoost === true) applyBoost(solid, dark);
					else if (boosted === true) clearBoost();
				} else if (boosted === true) {
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
