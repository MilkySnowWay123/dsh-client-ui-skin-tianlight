		//#region splash
		/**
		 * A · 破晓 opening animation.
		 *
		 * The whole thing is one CSS/WAAPI overlay appended to <body>, outside #root:
		 *  - it never waits for the wallpaper, the product shell or any network request;
		 *  - it does not change layout or pause DSH initialisation;
		 *  - only transform / opacity / filter are animated;
		 *  - every entrance/exit is capped at 1.7s and the overlay is force-removed at 3s;
		 *  - a pointerdown, any keydown or any page error removes it immediately;
		 *  - one play per browser session (sessionStorage), so Ctrl+F5 does not replay it.
		 *
		 * Timeline (ms):
		 *   000-250  deep night, still
		 *   250-700  1px gold-white light grows from the centre to 42vw
		 *   700-1100 the light softens into a dawn wash; the wordmark rises 8px and
		 *            tightens from 0.6em to 0.32em using character transforms
		 *   1100-1300 one diagonal cyan highlight passes the glyphs once
		 *   1300-1700 overlay fades while #root sharpens from blur(20px) to 0
		 *
		 * Settings / accessibility:
		 *   tianlight.splash      "1" / "0", default on
		 *   reduced motion       no overlay at all
		 *   low-power mode       no overlay at all
		 *   sessionStorage key    tianlight.splash.seen.v1
		 */
		const SPLASH_ENABLED_KEY = "tianlight.splash";
		const SPLASH_STYLE_KEY = "tianlight.splash.style";
		const SPLASH_LAST_FULL_KEY = "tianlight.splash.lastFull";
		const SPLASH_SOUND_KEY = "tianlight.splash.sound";
		const SPLASH_FORCE_MOTION_KEY = "tianlight.splash.forceMotion";
		const SPLASH_SESSION_KEY = "tianlight.splash.seen.v1";
		const SPLASH_STYLES = ["long-once", "long", "simple", "off"];
		const SPLASH_DEFAULT_STYLE = "long-once";
		const SPLASH_DURATION_MS = 1700;
		const SPLASH_HARD_STOP_MS = 3000;
		const SPLASH_FILM_DURATION_MS = 18500;
		const SPLASH_FILM_HARD_STOP_MS = 23500;
		const SPLASH_REVEAL_AT_MS = 1300;
		const SPLASH_REVEAL_MS = 400;
		const SPLASH_EASE_IN = "cubic-bezier(0.22, 1, 0.36, 1)";
		const SPLASH_EASE_OUT = "cubic-bezier(0.4, 0, 1, 1)";
		let splashPreferenceFallback = null;
		let splashStyleFallback = null;
		let splashSoundFallback = null;
		let splashForceMotionFallback = null;
		const splashRuntime = {
			active: false,
			reason: "idle",
			startedAt: 0,
			style: SPLASH_DEFAULT_STYLE,
			mode: "simple",
			/** Number of finite WAAPI effects the current overlay owns. Diagnostics only. */
			animations: 0,
		};

		function readSplashStyle() {
			try {
				const raw = globalThis.localStorage?.getItem(SPLASH_STYLE_KEY);
				if (typeof raw === "string") {
					const value = raw.trim().toLowerCase();
					if (SPLASH_STYLES.includes(value)) return value;
				}
				// legacy boolean: "0" was off; "1" was the original A splash.
				const legacy = globalThis.localStorage?.getItem(SPLASH_ENABLED_KEY);
				if (typeof legacy === "string") {
					const value = legacy.trim().toLowerCase();
					if (value === "0" || value === "false" || value === "off") return "off";
					if (value === "1" || value === "true" || value === "on") return SPLASH_DEFAULT_STYLE;
				}
			} catch {
				// storage can be blocked; the fallback below keeps this session consistent
			}
			if (splashStyleFallback !== null) return splashStyleFallback;
			if (splashPreferenceFallback === false) return "off";
			return SPLASH_DEFAULT_STYLE;
		}

		function readSplashEnabled() {
			return readSplashStyle() !== "off";
		}

		/**
		 * Persist the four-way style. The settings mirror watches every
		 * `tianlight.*` key, so these writes are also the host sync.
		 */
		function setSplashStyle(style) {
			const next = SPLASH_STYLES.includes(style) ? style : SPLASH_DEFAULT_STYLE;
			splashStyleFallback = next;
			splashPreferenceFallback = next !== "off";
			try {
				globalThis.localStorage?.setItem(SPLASH_STYLE_KEY, next);
				globalThis.localStorage?.setItem(SPLASH_ENABLED_KEY, next === "off" ? "0" : "1");
			} catch {
				// the in-memory fallback still makes the current session behave
			}
			tl5Diag("splash", { style: next, enabled: next !== "off", changedAt: Date.now() });
			return next;
		}

		function setSplashEnabled(enabled) {
			return setSplashStyle(enabled === false ? "off" : SPLASH_DEFAULT_STYLE) !== "off";
		}

		function readSplashSound() {
			try {
				const raw = globalThis.localStorage?.getItem(SPLASH_SOUND_KEY);
				if (typeof raw === "string") {
					const value = raw.trim().toLowerCase();
					if (value === "1" || value === "true" || value === "on") return true;
					if (value === "0" || value === "false" || value === "off") return false;
				}
			} catch {
				// fall through
			}
			return splashSoundFallback === true;
		}

		function setSplashSound(enabled) {
			splashSoundFallback = enabled === true;
			try {
				globalThis.localStorage?.setItem(SPLASH_SOUND_KEY, splashSoundFallback ? "1" : "0");
			} catch {
				// current session still follows the fallback
			}
			tl5Diag("splash", { sound: splashSoundFallback, changedAt: Date.now() });
			return splashSoundFallback;
		}

		/**
		 * Explicit, default-off accessibility override. When the user turns this on,
		 * the splash is allowed to run even if the OS reports reduce-motion. Low-power
		 * mode still skips unconditionally.
		 */
		function readSplashForceMotion() {
			try {
				const raw = globalThis.localStorage?.getItem(SPLASH_FORCE_MOTION_KEY);
				if (typeof raw === "string") {
					const value = raw.trim().toLowerCase();
					if (value === "1" || value === "true" || value === "on") return true;
					if (value === "0" || value === "false" || value === "off") return false;
				}
			} catch {
				// fall through
			}
			return splashForceMotionFallback === true;
		}

		function setSplashForceMotion(enabled) {
			splashForceMotionFallback = enabled === true;
			try {
				globalThis.localStorage?.setItem(SPLASH_FORCE_MOTION_KEY, splashForceMotionFallback ? "1" : "0");
			} catch {
				// current session still follows the fallback
			}
			tl5Diag("splash", { forceMotion: splashForceMotionFallback, changedAt: Date.now() });
			return splashForceMotionFallback;
		}

		function splashLocalDate() {
			const d = new Date();
			const y = d.getFullYear();
			const m = String(d.getMonth() + 1).padStart(2, "0");
			const day = String(d.getDate()).padStart(2, "0");
			return y + "-" + m + "-" + day;
		}

		function readSplashLastFull() {
			try {
				const raw = globalThis.localStorage?.getItem(SPLASH_LAST_FULL_KEY);
				return typeof raw === "string" ? raw : "";
			} catch {
				return "";
			}
		}

		function markSplashLastFull() {
			const today = splashLocalDate();
			try {
				globalThis.localStorage?.setItem(SPLASH_LAST_FULL_KEY, today);
			} catch {
				// daily cadence degrades to each-open only if storage is unavailable
			}
			return today;
		}

		function splashSeenThisSession() {
			try {
				return globalThis.sessionStorage?.getItem(SPLASH_SESSION_KEY) === "1";
			} catch {
				return false;
			}
		}

		function splashMarkSession() {
			try {
				globalThis.sessionStorage?.setItem(SPLASH_SESSION_KEY, "1");
			} catch {
				// no sessionStorage: at worst the animation can run again on refresh
			}
		}

		function splashReducedMotion() {
			try {
				return (
					typeof globalThis.matchMedia === "function" &&
					globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches === true
				);
			} catch {
				return false;
			}
		}

		function splashLowPowerActive() {
			try {
				if (document.body !== null && document.body.hasAttribute("data-tl-lowpower")) return true;
				if (lowPowerController !== null && typeof lowPowerController.state === "function") {
					const snapshot = lowPowerController.state();
					return snapshot !== null && typeof snapshot === "object" && snapshot.active === true;
				}
			} catch {
				// a missing low-power supervisor must not block the splash
			}
			return false;
		}

		/** One session decision. The session marker is written even when the splash is skipped. */
		function splashDecision() {
			const enabled = readSplashEnabled();
			if (splashSeenThisSession()) return { play: false, reason: "seen", enabled };
			splashMarkSession();
			if (enabled === false) return { play: false, reason: "disabled", enabled };
			if (splashReducedMotion() && readSplashForceMotion() !== true) return { play: false, reason: "reduced-motion", enabled };
			if (splashLowPowerActive()) return { play: false, reason: "low-power", enabled };
			return { play: true, reason: "playing", enabled };
		}

		/**
		 * Pure planner used by installSplashEntry() and by tests. It does not
		 * write the session/daily markers; the caller owns those side effects.
		 */
		function splashPlan(overrides) {
			const o = overrides !== null && typeof overrides === "object" ? overrides : {};
			const style = SPLASH_STYLES.includes(o.style) ? o.style : readSplashStyle();
			const seen = o.seen === undefined ? splashSeenThisSession() : o.seen === true;
			const reduced = o.reduced === undefined ? splashReducedMotion() : o.reduced === true;
			const low = o.low === undefined ? splashLowPowerActive() : o.low === true;
			const forceMotion = o.forceMotion === undefined ? readSplashForceMotion() : o.forceMotion === true;
			const today = typeof o.today === "string" ? o.today : splashLocalDate();
			const lastFull = typeof o.lastFull === "string" ? o.lastFull : readSplashLastFull();
			if (seen) return { mode: "none", reason: "seen", style };
			if (style === "off") return { mode: "none", reason: "disabled", style };
			if (reduced && forceMotion !== true) return { mode: "none", reason: "reduced-motion", style };
			if (low) return { mode: "none", reason: "low-power", style };
			if (style === "simple") return { mode: "simple", reason: "simple", style };
			if (style === "long-once" && lastFull === today) return { mode: "simple", reason: "daily", style };
			return { mode: "long", reason: style === "long" ? "long" : "daily-first", style };
		}

		function splashStatus() {
			return {
				active: splashRuntime.active,
				reason: splashRuntime.reason,
				enabled: readSplashEnabled(),
				style: readSplashStyle(),
				mode: splashRuntime.mode,
				seen: splashSeenThisSession(),
				lastFull: readSplashLastFull(),
				sound: readSplashSound(),
				forceMotion: readSplashForceMotion(),
				durationMs: splashRuntime.mode === "long" ? SPLASH_FILM_DURATION_MS : SPLASH_DURATION_MS,
				animations: splashRuntime.animations,
			};
		}

		/**
		 * Build the overlay with direct DOM calls only. No innerHTML (CSP + injection
		 * safety), no asset URL, no external font.
		 */
		function buildSplashOverlay() {
			const node = (tag, attrs, text) => {
				const element = document.createElement(tag);
				if (attrs !== null && typeof attrs === "object") {
					for (const name of Object.keys(attrs)) {
						const value = attrs[name];
						if (value === undefined || value === null || value === false) continue;
						if (name === "className") element.className = String(value);
						else element.setAttribute(name, value === true ? "" : String(value));
					}
				}
				if (text !== undefined && text !== null) element.textContent = String(text);
				return element;
			};

			const root = node("div", { "data-tl-splash": "", className: "tl-splash", "aria-hidden": "true" });
			const sky = node("div", { "data-tl-splash-sky": "", className: "tl-splash-sky" });
			const dawn = node("div", { "data-tl-splash-dawn": "", className: "tl-splash-dawn" });
			const glow = node("div", { "data-tl-splash-glow": "", className: "tl-splash-glow" });
			const line = node("div", { "data-tl-splash-line": "", className: "tl-splash-line" });
			const lineCore = node("span", { "data-tl-splash-line-core": "", className: "tl-splash-line-core" });
			line.appendChild(lineCore);
			const center = node("div", { "data-tl-splash-center": "", className: "tl-splash-center" });
			const wordmark = node("div", { "data-tl-splash-wordmark": "", className: "tl-splash-wordmark" });
			const base = node("span", { className: "tl-splash-word-base" });
			const charA = node("span", { "data-tl-splash-char": "", className: "tl-splash-char" }, "天");
			const charB = node("span", { "data-tl-splash-char": "", className: "tl-splash-char" }, "光");
			base.appendChild(charA);
			base.appendChild(charB);
			const sheen = node("span", { className: "tl-splash-sheen", "aria-hidden": "true" });
			const sheenWindow = node("span", { "data-tl-splash-sheen-window": "", className: "tl-splash-sheen-window" });
			const sheenCopy = node("span", { "data-tl-splash-sheen-copy": "", className: "tl-splash-sheen-copy" }, "天光");
			sheenWindow.appendChild(sheenCopy);
			sheen.appendChild(sheenWindow);
			wordmark.appendChild(base);
			wordmark.appendChild(sheen);
			const small = node("span", { "data-tl-splash-small": "", className: "tl-splash-small" }, "TIANLIGHT");
			center.appendChild(wordmark);
			center.appendChild(small);
			root.appendChild(sky);
			root.appendChild(dawn);
			root.appendChild(glow);
			root.appendChild(line);
			root.appendChild(center);
			return { root, sky, dawn, glow, line, lineCore, wordmark, charA, charB, sheenWindow, sheenCopy, small, center };
		}

		/**
		 * Install the opening overlay for this page session.
		 *
		 * Fully synchronous: no await, no resource load, no layout mutation beyond the
		 * fixed overlay (and a scoped filter class on #root 1.3s later). Cleanup is
		 * idempotent and removes every timer, animation and listener it owns.
		 */
		function installSplash() {
			let active = true;
			let rootEl = null;
			const animations = [];
			const timers = new Set();
			let appRoot = null;
			let appRootAnimation = null;
			let appRootAttr = false;

			const cleanup = (reason) => {
				if (active === false) return;
				active = false;
				for (const timer of timers) {
					try {
						globalThis.clearTimeout(timer);
					} catch {
						// ignore
					}
				}
				timers.clear();
				for (const animation of animations) {
					try {
						animation.cancel();
					} catch {
						// ignore
					}
				}
				animations.length = 0;
				if (appRootAnimation !== null) {
					try {
						appRootAnimation.cancel();
					} catch {
						// ignore
					}
					appRootAnimation = null;
				}
				if (appRoot !== null && appRootAttr === true) {
					try {
						appRoot.removeAttribute("data-tl-splash-blur");
					} catch {
						// ignore
					}
					appRootAttr = false;
				}
				appRoot = null;
				try {
					document.removeEventListener("pointerdown", onSkip, true);
					document.removeEventListener("keydown", onSkip, true);
				} catch {
					// ignore
				}
				try {
					globalThis.removeEventListener?.("error", onError);
					globalThis.removeEventListener?.("unhandledrejection", onError);
				} catch {
					// ignore
				}
				if (rootEl !== null) {
					try {
						if (typeof rootEl.remove === "function") rootEl.remove();
						else if (rootEl.parentNode !== null && rootEl.parentNode !== undefined) rootEl.parentNode.removeChild(rootEl);
					} catch {
						// ignore
					}
					rootEl = null;
				}
				splashRuntime.active = false;
				splashRuntime.reason = reason;
				splashRuntime.animations = 0;
				tl5Diag("splash", splashStatus());
			};

			const onSkip = (event) => {
				if (active === false) return;
				try {
					if (event !== null && event !== undefined && typeof event.preventDefault === "function") event.preventDefault();
					if (event !== null && event !== undefined && typeof event.stopPropagation === "function") event.stopPropagation();
				} catch {
					// a synthetic event without these methods is still a skip
				}
				cleanup("skipped");
			};
			const onError = () => cleanup("error");

			const schedule = (fn, delay) => {
				let id = 0;
				try {
					id = globalThis.setTimeout(() => {
						timers.delete(id);
						if (active === false) return;
						try {
							fn();
						} catch (error) {
							note("splash:timer", error);
							cleanup("error");
						}
					}, delay);
					timers.add(id);
				} catch (error) {
					// A page that cannot schedule the forced cleanup must not keep a black
					// cover forever: remove it immediately instead.
					note("splash:timer", error);
					cleanup("error");
				}
				return id;
			};

			const animate = (element, keyframes, start, duration, easing) => {
				const animation = element.animate(keyframes, {
					duration,
					delay: start,
					easing,
					fill: "both",
				});
				animations.push(animation);
				return animation;
			};

			let decision = null;
			try {
				decision = splashDecision();
			} catch (error) {
				note("splash:decision", error);
				decision = { play: false, reason: "error", enabled: readSplashEnabled() };
			}
			if (decision.play === false) {
				splashRuntime.active = false;
				splashRuntime.reason = decision.reason;
				tl5Diag("splash", splashStatus());
				return () => {};
			}

			const body = document.body;
			if (body === null || body === undefined) {
				splashRuntime.reason = "no-body";
				tl5Diag("splash", splashStatus());
				return () => {};
			}
			if (body.hasAttribute(BODY_ATTR) === false) {
				splashRuntime.reason = "no-scope";
				tl5Diag("splash", splashStatus());
				return () => {};
			}
			if (typeof globalThis.Element === "undefined" || typeof globalThis.Element.prototype?.animate !== "function") {
				splashRuntime.reason = "no-waapi";
				tl5Diag("splash", splashStatus());
				return () => {};
			}

			try {
				const ui = buildSplashOverlay();
				rootEl = ui.root;
				// Guard before the first paint: a browser without WAAPI must not show a
				// static black poster with no exit.
				if (typeof rootEl.animate !== "function") {
					splashRuntime.reason = "no-waapi";
					rootEl = null;
					return () => {};
				}
				body.appendChild(rootEl);
				splashRuntime.active = true;
				splashRuntime.reason = "playing";
				splashRuntime.startedAt = Date.now();
				splashRuntime.animations = 0;

				// Capture the page's first interaction. preventDefault keeps the skip
				// click/key from also activating the UI underneath.
				document.addEventListener("pointerdown", onSkip, true);
				document.addEventListener("keydown", onSkip, true);
				try {
					globalThis.addEventListener?.("error", onError);
					globalThis.addEventListener?.("unhandledrejection", onError);
				} catch (error) {
					note("splash:error-guard", error);
				}

				// The 3s guard is armed before any animation work. Even a synchronous
				// failure below is caught, and a future animation defect still leaves
				// this timer as the last line of defence.
				schedule(() => cleanup("timeout"), SPLASH_HARD_STOP_MS);
				schedule(() => cleanup("finished"), SPLASH_DURATION_MS + 50);
				if (active === false) return () => cleanup("error");

				// A · 破晓 timeline. Every effect is finite and only animates
				// transform / opacity / filter.
				animate(ui.sky, [{ opacity: 0 }, { opacity: 1 }], 620, 500, SPLASH_EASE_IN);
				animate(
					ui.dawn,
					[
						{ opacity: 0, transform: "translate3d(-50%, -50%, 0) scale(0.54, 0.18)" },
						{ opacity: 0.94, transform: "translate3d(-50%, -50%, 0) scale(1, 1)" },
					],
					680,
					500,
					SPLASH_EASE_IN,
				);
				animate(ui.line, [{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }], 250, 450, SPLASH_EASE_IN);
				animate(
					ui.lineCore,
					[
						{ opacity: 1, transform: "scaleY(1)", filter: "blur(0px)" },
						{ opacity: 0.16, transform: "scaleY(9)", filter: "blur(6px)" },
					],
					760,
					360,
					SPLASH_EASE_OUT,
				);
				animate(
					ui.glow,
					[
						{ opacity: 0, transform: "scaleX(0.2)" },
						{ opacity: 0.5, transform: "scaleX(1)" },
					],
					300,
					500,
					SPLASH_EASE_IN,
				);
				animate(
					ui.wordmark,
					[
						{ opacity: 0, transform: "translate3d(0, 8px, 0)", filter: "blur(5px)" },
						{ opacity: 1, transform: "translate3d(0, 0, 0)", filter: "blur(0px)" },
					],
					700,
					380,
					SPLASH_EASE_IN,
				);
				animate(
					ui.charA,
					[{ transform: "translate3d(-0.14em, 0, 0)" }, { transform: "translate3d(0, 0, 0)" }],
					700,
					400,
					SPLASH_EASE_IN,
				);
				animate(
					ui.charB,
					[{ transform: "translate3d(0.14em, 0, 0)" }, { transform: "translate3d(0, 0, 0)" }],
					700,
					400,
					SPLASH_EASE_IN,
				);
				animate(
					ui.small,
					[
						{ opacity: 0, transform: "translate3d(0, 4px, 0)", filter: "blur(4px)" },
						{ opacity: 1, transform: "translate3d(0, 0, 0)", filter: "blur(0px)" },
					],
					850,
					250,
					SPLASH_EASE_IN,
				);
				animate(
					ui.sheenWindow,
					[{ transform: "translate3d(-100%, 0, 0)" }, { transform: "translate3d(454.5455%, 0, 0)" }],
					1100,
					200,
					SPLASH_EASE_IN,
				);
				animate(
					ui.sheenCopy,
					[{ transform: "translate3d(22%, 0, 0)" }, { transform: "translate3d(-100%, 0, 0)" }],
					1100,
					200,
					SPLASH_EASE_IN,
				);
				animate(ui.root, [{ opacity: 1 }, { opacity: 0 }], SPLASH_REVEAL_AT_MS, SPLASH_REVEAL_MS, SPLASH_EASE_OUT);
				splashRuntime.animations = animations.length;

				// Blur the real shell only while it is hidden behind the overlay. The
				// timer starts at 1300ms so there is no full-viewport filter cost before
				// the reveal. #root is outside the overlay, so only the product blurs.
				schedule(() => {
					if (active === false) return;
					try {
						appRoot = document.getElementById("root");
						if (appRoot === null || appRoot === undefined || typeof appRoot.animate !== "function") return;
						appRootAttr = true;
						appRoot.setAttribute("data-tl-splash-blur", "");
						appRootAnimation = appRoot.animate(
							[
								{ filter: "blur(20px)", transform: "scale(1.012)" },
								{ filter: "blur(0px)", transform: "scale(1)" },
							],
							{ duration: SPLASH_REVEAL_MS, easing: SPLASH_EASE_OUT, fill: "both" },
						);
						try {
							appRootAnimation.id = "tl-splash-reveal";
						} catch {
							// id is diagnostic only
						}
					} catch (error) {
						note("splash:reveal", error);
					}
				}, SPLASH_REVEAL_AT_MS);
			} catch (error) {
				note("splash:install", error);
				cleanup("error");
			}

			return () => cleanup("disposed");
		}

		/**
		 * Four-way entry point used by apply():
		 *   long-once  default; full film on the first launch of the local day,
		 *              then the compact A splash for the rest of the day;
		 *   long       full film on every launch (still once per browser session);
		 *   simple     compact A splash only;
		 *   off        nothing.
		 *
		 * The old installSplash() remains the compact A implementation so the
		 * original behaviour and tests keep working; this function only decides
		 * which implementation runs.
		 */
		function installSplashEntry() {
			const style = readSplashStyle();
			const finishStatus = (reason, mode) => {
				splashRuntime.active = false;
				splashRuntime.reason = reason;
				splashRuntime.mode = mode || "simple";
				tl5Diag("splash", splashStatus());
				return () => {};
			};
			if (splashSeenThisSession()) return finishStatus("seen", style === "long" || style === "long-once" ? "long" : "simple");
			if (style === "off") return finishStatus("disabled", "simple");
			if (splashReducedMotion() && readSplashForceMotion() !== true) return finishStatus("reduced-motion", "simple");
			if (splashLowPowerActive()) return finishStatus("low-power", "simple");

			if (style === "simple") return installSplash();
			if (style === "long-once" && readSplashLastFull() === splashLocalDate()) return installSplash();

			const body = document.body;
			if (body === null || body === undefined) return finishStatus("no-body", "long");
			if (body.hasAttribute(BODY_ATTR) === false) return finishStatus("no-scope", "long");
			if (typeof installSplashFilm !== "function") return finishStatus("no-film", "long");

			splashMarkSession();
			markSplashLastFull();
			splashRuntime.active = true;
			splashRuntime.reason = "playing";
			splashRuntime.style = style;
			splashRuntime.mode = "long";
			splashRuntime.startedAt = Date.now();
			splashRuntime.animations = 0;

			let film = null;
			try {
				film = installSplashFilm({
					sound: readSplashSound(),
					skipText: typeof TL_T === "function" ? TL_T("hub.splash.skip") : "点击任意处跳过",
					onDone: (reason) => {
						splashRuntime.active = false;
						splashRuntime.reason = reason === "timeout" ? "timeout" : "done";
						splashRuntime.mode = "long";
						splashRuntime.animations = 0;
						tl5Diag("splash", splashStatus());
					},
					onFallback: (reason) => {
						splashRuntime.reason = "fallback:" + String(reason || "simple");
						splashRuntime.mode = "simple";
						tl5Diag("splash", splashStatus());
					},
				});
			} catch (error) {
				note("splash:film", error);
				return finishStatus("error", "long");
			}
			if (!film) return finishStatus("error", "long");
			tl5Diag("splash", splashStatus());
			return () => {
				try {
					film.dispose();
				} catch (error) {
					note("splash:film-dispose", error);
				}
				if (splashRuntime.mode === "long" && splashRuntime.reason === "playing") {
					splashRuntime.active = false;
					splashRuntime.reason = "disposed";
				}
			};
		}
		//#endregion
