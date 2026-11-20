		//#region appearance
		/**
		 * v2.3.0 appearance: «跟随 DSH / 浅色 / 深色 / 随天光».
		 *
		 * The single source of truth for light vs dark is DSH's own theme preference:
		 * its menus, dialogs, code highlighting and hovercards all flip on
		 * body[data-ds-dark-theme], so the skin must DRIVE that mechanism instead of
		 * inventing a second scheme. This fragment therefore owns three things only:
		 *   1. the persisted intent (`tianlight.appearance`: which preference Tianlight
		 *      writes, and whether it follows the sun);
		 *   2. writing that intent through ctx.theme.setTheme() — the only legitimate
		 *      writer of the product preference;
		 *   3. the scheduling/transition/UI around it (sky boundaries, reveal animation,
		 *      the top-right toggle, Alt+L).
		 * Everything that RENDERS the scheme reads tl5Scheme()/tl5OnScheme() from the
		 * platform region; nothing in this fragment may set or remove
		 * body[data-ds-dark-theme] directly.
		 *
		 * Conflict rule: if the preference changes and it was not our write, the user
		 * changed it in DSH's own settings — Tianlight switches to «跟随 DSH» and says so.
		 * It never writes the user's choice back.
		 *
		 * Prohibited (regression fences): no setTheme at boot, no setTheme in follow
		 * mode, no filter/backdrop-filter/transform/will-change on a glass host, no
		 * blur on the scene layer, no video-frame polling for the fog sampler.
		 */
		const APPEARANCE_SELF_WRITE_WINDOW_MS = 1500;
		const APPEARANCE_REVEAL_MS = 620;
		const APPEARANCE_FADE_MS = 360;
		const APPEARANCE_SAMPLE_DELAYS = [600, 1500];
		const APPEARANCE_SAMPLE_MIN_GAP_MS = 1500;
		const APPEARANCE_SKY_MAX_DELAY_MS = 2147483647;
		const APPEARANCE_MENU_ID = "scheme-menu";
		const APPEARANCE_MODE_LABEL_KEYS = {
			follow: "appearance.mode.follow",
			light: "appearance.mode.light",
			dark: "appearance.mode.dark",
			sky: "appearance.mode.sky",
		};
		const APPEARANCE_TRANSITION_LABEL_KEYS = {
			reveal: "appearance.transition.reveal",
			fade: "appearance.transition.fade",
			off: "appearance.transition.off",
		};

		// ---- pure helpers (unit-tested, no DOM) --------------------------------
		/** "HH:MM" -> minutes of day; null for anything else. */
		function appearanceClockMinutes(text) {
			if (tl5IsClockTime(text) === false) return null;
			return Number(text.slice(0, 2)) * 60 + Number(text.slice(3, 5));
		}
		/** Minutes of day -> "HH:MM". */
		function appearanceFormatClock(minutes) {
			const value = Number(minutes);
			if (Number.isFinite(value) === false) return "";
			const wrapped = ((Math.round(value) % 1440) + 1440) % 1440;
			return String(Math.floor(wrapped / 60)).padStart(2, "0") + ":" + String(wrapped % 60).padStart(2, "0");
		}
		/** Local minutes-of-day plus the fractional seconds, for boundary math. */
		function appearanceMinuteOfDay(nowMs) {
			const date = new Date(nowMs);
			return date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60 + date.getMilliseconds() / 60000;
		}
		/**
		 * The day's two switch instants. `auto` uses the weather module's local sunrise
		 * and sunset when today's data exists; otherwise (no location, request failed,
		 * stale day) it falls back to the user's manual clock times, so the feature never
		 * depends on the network to work.
		 */
		function appearanceSkyWindow(sunTimes, sky) {
			const manual = {
				light: appearanceClockMinutes(tl5IsPlainObject(sky) ? sky.lightAt : "") ?? appearanceClockMinutes(TL5_APPEARANCE_CLOCK_DEFAULTS.lightAt),
				dark: appearanceClockMinutes(tl5IsPlainObject(sky) ? sky.darkAt : "") ?? appearanceClockMinutes(TL5_APPEARANCE_CLOCK_DEFAULTS.darkAt),
				source: "clock",
			};
			if (tl5IsPlainObject(sky) !== true || sky.source !== "auto") return manual;
			const sunrise = sunTimes === null || sunTimes === undefined ? NaN : Number(sunTimes.sunrise);
			const sunset = sunTimes === null || sunTimes === undefined ? NaN : Number(sunTimes.sunset);
			if (Number.isFinite(sunrise) === false || Number.isFinite(sunset) === false) return manual;
			if (sunrise < 0 || sunrise > 1439 || sunset < 0 || sunset > 1439) return manual;
			if (sunrise === sunset) return manual;
			return { light: sunrise, dark: sunset, source: "sun" };
		}
		/**
		 * The two boundaries of one calendar day, sorted. A boundary whose minute is equal
		 * to the other one is dropped, and a degenerate window (same instant) keeps only
		 * the dark boundary so the day still alternates.
		 */
		function appearanceBoundariesForDay(sunTimes, sky) {
			const window = appearanceSkyWindow(sunTimes, sky);
			const list = [
				{ minutes: window.light, scheme: "light" },
				{ minutes: window.dark, scheme: "dark" },
			];
			if (list[0].minutes === list[1].minutes) return [{ minutes: window.dark, scheme: "dark" }];
			list.sort((left, right) => left.minutes - right.minutes);
			return list;
		}
		/**
		 * Which scheme «随天光» wants at this instant: the last boundary at or before now,
		 * looking back into yesterday when today's first boundary has not passed yet
		 * (03:00 with a 06:30 sunrise belongs to last evening's dark).
		 */
		function appearanceSchemeNow(nowMs, sunTimes, sky) {
			const now = Number(nowMs);
			if (Number.isFinite(now) === false) return "light";
			const minute = appearanceMinuteOfDay(now);
			const today = appearanceBoundariesForDay(sunTimes, sky);
			let scheme = "dark";
			let decided = false;
			for (const boundary of today) {
				if (boundary.minutes <= minute) {
					scheme = boundary.scheme;
					decided = true;
				}
			}
			if (decided === true) return scheme;
			// Before today's first boundary: the last one is yesterday's last boundary.
			const yesterday = appearanceBoundariesForDay(sunTimes, sky);
			return yesterday.length === 0 ? "dark" : yesterday[yesterday.length - 1].scheme;
		}
		/**
		 * The next moment the sky schedule changes scheme, as `{ at, scheme, minutes,
		 * source }` (`at` is a wall-clock Date time). Returns null only when the schedule
		 * is degenerate (impossible with the clock fallback, but defended).
		 */
		function appearanceNextBoundary(nowMs, sunTimes, sky) {
			const now = Number(nowMs);
			if (Number.isFinite(now) === false) return null;
			const minute = appearanceMinuteOfDay(now);
			const date = new Date(now);
			const today = appearanceBoundariesForDay(sunTimes, sky);
			for (const boundary of today) {
				if (boundary.minutes > minute + 0.001) {
					const at = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0).getTime();
					return {
						at: at + Math.round(boundary.minutes * 60000),
						scheme: boundary.scheme,
						minutes: boundary.minutes,
						source: appearanceSkyWindow(sunTimes, sky).source,
					};
				}
			}
			const tomorrow = date.getDate() + 1;
			const first = today[0] ?? { minutes: 390, scheme: "light" };
			const at = new Date(date.getFullYear(), date.getMonth(), tomorrow, 0, 0, 0, 0).getTime();
			return {
				at: at + Math.round(first.minutes * 60000),
				scheme: first.scheme,
				minutes: first.minutes,
				source: appearanceSkyWindow(sunTimes, sky).source,
			};
		}
		/**
		 * «晨雾»: how much white fog the light theme paints behind the transcript. A bright
		 * wallpaper needs none; a dark one (L below 0.42) ramps up to 1 at L = 0.10.
		 * Unknown luma (cross-origin scene, video not ready) takes a conservative 0.55.
		 */
		function appearanceFogLift(luma) {
			const value = luma === null || luma === undefined ? NaN : Number(luma);
			if (Number.isFinite(value) === false) return 0.55;
			if (value >= 0.42) return 0;
			if (value <= 0.1) return 1;
			return Math.min(1, Math.max(0, (0.42 - value) / 0.32));
		}
		/**
		 * «夜雾»: the symmetric guard for the dark theme on a very bright wallpaper.
		 * 0 below L = 0.38, so the shipped dark look is pixel-identical on mid/dark
		 * wallpapers (the baseline screenshot comparison depends on this).
		 */
		function appearanceNightLift(luma) {
			const value = luma === null || luma === undefined ? NaN : Number(luma);
			if (Number.isFinite(value) === false) return 0;
			if (value <= 0.38) return 0;
			if (value >= 0.68) return 1;
			return Math.min(1, Math.max(0, (value - 0.38) / 0.3));
		}

		// ---- persisted state ---------------------------------------------------
		let appearanceState = null;
		let appearanceSelfWrite = { target: "", at: 0 };
		let appearanceSkyTimer = 0;
		let appearanceSampleTimer = 0;
		let appearanceSecondSampleTimer = 0;
		let appearanceLastSampleAt = 0;
		let appearanceThemeReady = false;
		/** How many times Tianlight wrote the DSH preference (smoke/diagnostic counter). */
		let appearanceSetThemeCalls = 0;
		const appearanceSubscribers = new Set();

		/** Canonical snapshot (a fresh object; callers may keep it). */
		function appearanceSnapshot() {
			return JSON.parse(tl5Json(appearanceState ?? tl5AppearanceDefaults()));
		}
		function appearancePersist() {
			try {
				globalThis.localStorage.setItem(TL5_APPEARANCE_KEY, tl5Json(appearanceState));
			} catch (error) {
				note("appearance:persist", error);
			}
		}
		function appearanceNotify() {
			const snapshot = appearanceSnapshot();
			for (const listener of [...appearanceSubscribers]) {
				try {
					listener(snapshot);
				} catch (error) {
					note("appearance:subscriber", error);
				}
			}
		}
		function appearanceSubscribe(listener) {
			if (typeof listener !== "function") return () => {};
			appearanceSubscribers.add(listener);
			return () => appearanceSubscribers.delete(listener);
		}

		// ---- writing the product preference ------------------------------------
		/** Live theme service, or null before DSH publishes it. */
		function appearanceService() {
			return typeof tl5ThemeService === "function" ? tl5ThemeService() : null;
		}
		function appearanceHasThemeService() {
			const service = appearanceService();
			return service !== null && service !== undefined && typeof service.setTheme === "function";
		}
		/**
		 * Conflict rule (pure, unit-tested): classify one theme/change.
		 * "ignore" = our own write (or follow mode, which never writes); "follow" = the
		 * preference came from somewhere else, so Tianlight must switch to follow.
		 */
		function appearanceConflictDecision(mode, preference, selfWrite, nowMs) {
			if (mode === "follow") return "ignore";
			const target = preference === "dark" || preference === "light" ? preference : "";
			if (target === "") return "follow";
			if (selfWrite === null || selfWrite === undefined) return "follow";
			if (selfWrite.target !== target) return "follow";
			const at = Number(selfWrite.at);
			if (Number.isFinite(at) === false) return "follow";
			return Number(nowMs) - at < APPEARANCE_SELF_WRITE_WINDOW_MS ? "ignore" : "follow";
		}
		/**
		 * Write one scheme into DSH. Every call records the self-write so the resulting
		 * theme/change is not mistaken for a user edit in DSH's own settings.
		 */
		function appearanceWriteTheme(target) {
			const service = appearanceService();
			if (service === null || service === undefined || typeof service.setTheme !== "function") return false;
			const value = target === "dark" ? "dark" : "light";
			appearanceSelfWrite = { target: value, at: globalThis.performance?.now?.() ?? Date.now() };
			try {
				service.setTheme(value);
				appearanceSetThemeCalls += 1;
				tl5Diag("appearance", { setThemeCalls: appearanceSetThemeCalls, lastWrite: value });
				return true;
			} catch (error) {
				note("appearance:set-theme", error);
				return false;
			}
		}
		function appearancePrefersReducedMotion() {
			try {
				const reduce = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;
				if (reduce === false) return false;
				// The user's explicit "keep the motion" override (splash setting) wins.
				const forced = typeof readSplashForceMotion === "function" ? readSplashForceMotion() : false;
				return forced !== true;
			} catch {
				return false;
			}
		}
		function appearanceIsCheapMotion() {
			try {
				const body = document.body;
				if (body === null) return true;
				if (body.hasAttribute("data-tl-lowpower")) return true;
				return body.getAttribute("data-tl-render-tier") === "15";
			} catch {
				return true;
			}
		}
		/** Fade fallback: 360 ms of background/colour transitions, then the attribute goes. */
		function appearanceFadeSwitch(write) {
			const body = document.body;
			if (body === null) return write();
			body.setAttribute("data-tl-theme-fading", "");
			globalThis.setTimeout(() => {
				try {
					body.removeAttribute("data-tl-theme-fading");
				} catch {
					// a replaced body is fine
				}
			}, APPEARANCE_FADE_MS + 40);
			return write();
		}
		/**
		 * Switch the visible scheme with the configured transition. `origin` is the click
		 * point for the circular reveal ({x,y}) and null for scheduled switches.
		 */
		function appearanceSwitchScheme(target, origin) {
			const value = target === "dark" ? "dark" : "light";
			const write = () => appearanceWriteTheme(value);
			if (appearanceHasThemeService() === false) {
				tl5Announce(TL_T("appearance.noThemeService"));
				return false;
			}
			const reduce = appearancePrefersReducedMotion();
			const cheap = appearanceIsCheapMotion();
			const style = appearanceState === null ? "reveal" : appearanceState.transition;
			if (style !== "reveal" || reduce === true || cheap === true || typeof document.startViewTransition !== "function") {
				if (style === "fade" && reduce !== true) {
					appearanceFadeSwitch(write);
					return true;
				}
				return write();
			}
			const x = origin !== null && origin !== undefined && Number.isFinite(Number(origin.x)) ? Number(origin.x) : globalThis.innerWidth - 40;
			const y = origin !== null && origin !== undefined && Number.isFinite(Number(origin.y)) ? Number(origin.y) : 40;
			const radius = Math.hypot(Math.max(x, globalThis.innerWidth - x), Math.max(y, globalThis.innerHeight - y));
			const body = document.body;
			if (body !== null) body.setAttribute("data-tl-theme-switching", "");
			let transition = null;
			try {
				transition = document.startViewTransition(() => {
					// setTheme -> theme/change -> ThemePresenter flips body synchronously.
					write();
				});
			} catch (error) {
				note("appearance:view-transition", error);
				if (body !== null) body.removeAttribute("data-tl-theme-switching");
				return write();
			}
			const finish = () => {
				if (body !== null) body.removeAttribute("data-tl-theme-switching");
			};
			try {
				transition.ready
					.then(() => {
						document.documentElement.animate(
							{
								clipPath: ["circle(0px at " + x + "px " + y + "px)", "circle(" + radius + "px at " + x + "px " + y + "px)"],
							},
							{
								duration: APPEARANCE_REVEAL_MS,
								easing: "cubic-bezier(0.22, 1, 0.36, 1)",
								pseudoElement: "::view-transition-new(root)",
							},
						);
					})
					.catch(() => {});
				transition.finished.then(finish, finish);
			} catch (error) {
				note("appearance:reveal-animate", error);
				finish();
			}
			return true;
		}
		/** Announce + optional companion bubble (duty channel); both degrade silently. */
		function appearanceTip(text) {
			if (typeof text !== "string" || text === "") return;
			tl5Announce(text);
			try {
				const duty = globalThis.tianlightDuty;
				if (duty !== null && duty !== undefined && typeof duty.send === "function") {
					duty.send({ type: "speak", text, ttlMs: 4200 });
				}
			} catch (error) {
				note("appearance:duty", error);
			}
		}

		// ---- per-mode wallpaper ------------------------------------------------
		/**
		 * Apply the wallpaper recorded for this scheme, if any. The slot stores a library
		 * entry id; it is resolved against the same catalog the wallpaper panel uses, and
		 * a missing entry clears the slot with one notice instead of failing silently.
		 */
		function appearanceApplyModeWallpaper(scheme) {
			try {
				if (appearanceState === null) return;
				const slot = appearanceState.wallpapers[scheme === "dark" ? "dark" : "light"];
				if (typeof slot !== "string" || slot === "") return;
				if (typeof wallpaperController === "undefined" || wallpaperController === null) return;
				const current = readWallpaperChoice();
				if (current !== null) {
					// Already the right entry: reading the catalog for every switch is waste.
					const name = String(slot);
					if (current.url === name || current.url.endsWith("/" + name) || current.url.indexOf(name) >= 0) return;
				}
				if (typeof listWallpapers !== "function") return;
				void listWallpapers()
					.then((items) => {
						const entry = Array.isArray(items) ? items.find((item) => item !== null && item !== undefined && item.id === slot) : null;
						if (entry === null || entry === undefined) {
							if (appearanceState !== null) {
								appearanceState.wallpapers[scheme === "dark" ? "dark" : "light"] = null;
								appearancePersist();
								appearanceNotify();
								appearanceTip(TL_T("appearance.wallpaperMissing"));
							}
							return;
						}
						const choice = { kind: entry.kind === "image" ? "image" : entry.kind === "video" ? "video" : entry.kind, url: entry.url };
						const controller = typeof wallpaperController === "undefined" ? null : wallpaperController;
						if (controller === null || typeof controller.apply !== "function") return;
						const currentChoice = readWallpaperChoice();
						if (currentChoice !== null && currentChoice.url === choice.url) return;
						controller.apply(choice);
					})
					.catch((error) => note("appearance:mode-wallpaper", error));
			} catch (error) {
				note("appearance:mode-wallpaper", error);
			}
		}

		// ---- adaptive fog sampling --------------------------------------------
		/** One luma sample -> CSS variables + diagnostics. Never polls video frames. */
		function appearanceApplyLift() {
			const body = document.body;
			if (body === null) return;
			const luma = typeof tl5SampleWallpaperLuma === "function" ? tl5SampleWallpaperLuma() : null;
			const dayLift = appearanceFogLift(luma);
			const nightLift = appearanceNightLift(luma);
			body.style.setProperty("--tl-day-lift", String(Math.round(dayLift * 1000) / 1000));
			body.style.setProperty("--tl-night-lift", String(Math.round(nightLift * 1000) / 1000));
			tl5Diag("appearance", {
				luma: luma === null ? null : Math.round(luma * 1000) / 1000,
				dayLift: Math.round(dayLift * 1000) / 1000,
				nightLift: Math.round(nightLift * 1000) / 1000,
			});
		}
		/** Throttled sample run: a wallpaper change arms 600 ms + 1.5 s, never a loop. */
		function appearanceScheduleSample(force) {
			if (appearanceState === null) return;
			const now = Date.now();
			if (force !== true && now - appearanceLastSampleAt < APPEARANCE_SAMPLE_MIN_GAP_MS) return;
			if (appearanceSampleTimer !== 0) globalThis.clearTimeout(appearanceSampleTimer);
			if (appearanceSecondSampleTimer !== 0) globalThis.clearTimeout(appearanceSecondSampleTimer);
			appearanceSampleTimer = globalThis.setTimeout(() => {
				appearanceSampleTimer = 0;
				appearanceLastSampleAt = Date.now();
				appearanceApplyLift();
			}, APPEARANCE_SAMPLE_DELAYS[0]);
			appearanceSecondSampleTimer = globalThis.setTimeout(() => {
				appearanceSecondSampleTimer = 0;
				appearanceLastSampleAt = Date.now();
				appearanceApplyLift();
			}, APPEARANCE_SAMPLE_DELAYS[1]);
		}
		/** 30b calls this after every applied wallpaper (the scene module owns the DOM). */
		function tl5WallpaperApplied() {
			appearanceScheduleSample(false);
		}

		// ---- sky scheduler -----------------------------------------------------
		/** Today's local sunrise/sunset from the weather module, or null. */
		function appearanceSunTimes() {
			try {
				if (typeof weatherController === "undefined" || weatherController === null) return null;
				return typeof weatherController.sunTimes === "function" ? weatherController.sunTimes() : null;
			} catch {
				return null;
			}
		}
		function appearanceClearSkyTimer() {
			if (appearanceSkyTimer === 0) return;
			globalThis.clearTimeout(appearanceSkyTimer);
			appearanceSkyTimer = 0;
		}
		/** Arm exactly one timer for the next boundary (no polling). */
		function appearanceScheduleSky() {
			appearanceClearSkyTimer();
			if (appearanceState === null || appearanceState.mode !== "sky") return;
			const now = Date.now();
			const sun = appearanceSunTimes();
			const next = appearanceNextBoundary(now, sun, appearanceState.sky);
			if (next === null) return;
			const delay = Math.max(1000, Math.min(APPEARANCE_SKY_MAX_DELAY_MS, next.at - now));
			appearanceSkyTimer = globalThis.setTimeout(() => {
				appearanceSkyTimer = 0;
				appearanceSkyTick();
			}, delay);
			tl5Diag("appearance", {
				skyNextAt: next.at,
				skyNextScheme: next.scheme,
				skySource: next.source,
				skyNextClock: appearanceFormatClock(next.minutes),
			});
		}
		function appearanceSkyTick() {
			if (appearanceState === null || appearanceState.mode !== "sky") return;
			const sun = appearanceSunTimes();
			const scheme = appearanceSchemeNow(Date.now(), sun, appearanceState.sky);
			appearanceApplyModeWallpaper(scheme);
			if (scheme !== tl5Scheme()) appearanceSwitchScheme(scheme, null);
			appearanceScheduleSky();
			appearanceNotify();
		}

		// ---- controller surface (hub card + tests) ------------------------------
		/**
		 * Patch the model. `mode` changes persist and immediately apply the matching
		 * scheme (follow writes nothing); `sky`/`transition`/`wallpapers` are pure model
		 * changes unless the current sky mode needs re-scheduling.
		 */
		function appearanceApply(patch) {
			if (appearanceState === null) return appearanceSnapshot();
			const next = { ...appearanceState };
			if (tl5IsPlainObject(patch)) {
				if (typeof patch.mode === "string" && TL5_APPEARANCE_MODES.indexOf(patch.mode) >= 0) next.mode = patch.mode;
				if (patch.sky !== undefined) next.sky = { ...next.sky, ...(tl5IsPlainObject(patch.sky) ? patch.sky : {}) };
				if (typeof patch.transition === "string" && TL5_APPEARANCE_TRANSITIONS.indexOf(patch.transition) >= 0) {
					next.transition = patch.transition;
				}
				if (patch.wallpapers !== undefined) {
					const wallpapers = tl5IsPlainObject(patch.wallpapers) ? patch.wallpapers : {};
					next.wallpapers = { ...next.wallpapers, ...(typeof wallpapers.light === "string" || wallpapers.light === null ? { light: wallpapers.light } : {}), ...(typeof wallpapers.dark === "string" || wallpapers.dark === null ? { dark: wallpapers.dark } : {}) };
				}
			}
			const normalized = normalizeAppearanceValue(next);
			const modeChanged = normalized.mode !== appearanceState.mode;
			const skyChanged = tl5Json(normalized.sky) !== tl5Json(appearanceState.sky);
			appearanceState = normalized;
			appearancePersist();
			if (normalized.mode === "sky") {
				const scheme = appearanceSchemeNow(Date.now(), appearanceSunTimes(), normalized.sky);
				if (modeChanged || skyChanged) {
					appearanceApplyModeWallpaper(scheme);
					if (scheme !== tl5Scheme()) appearanceSwitchScheme(scheme, null);
				}
				appearanceScheduleSky();
			} else if (normalized.mode === "light" || normalized.mode === "dark") {
				appearanceClearSkyTimer();
				if (modeChanged || normalized.mode !== tl5Scheme()) {
					appearanceApplyModeWallpaper(normalized.mode);
					appearanceSwitchScheme(normalized.mode, null);
				}
			} else {
				// follow: Tianlight stops writing the preference (never calls setTheme here).
				appearanceClearSkyTimer();
			}
			appearanceNotify();
			appearanceSyncToggle();
			return appearanceSnapshot();
		}
		/** One click on the toggle: fixed light/dark from the CURRENT scheme. */
		function appearanceToggleScheme(origin) {
			if (appearanceState === null) return appearanceSnapshot();
			const target = tl5Scheme() === "dark" ? "light" : "dark";
			appearanceApply({ mode: target });
			appearanceTip(TL_T(target === "dark" ? "appearance.switchedDark" : "appearance.switchedLight"));
			tl5Diag("appearance", { lastToggle: target, origin: origin ?? null });
			return appearanceSnapshot();
		}

		// ---- toggle UI ---------------------------------------------------------
		function appearanceModeLabel(mode) {
			const key = APPEARANCE_MODE_LABEL_KEYS[mode];
			return key === undefined ? mode : TL_T(key);
		}
		/** Tooltip copy: mode + "next switch" for the sky mode. */
		function appearanceToggleTitle() {
			if (appearanceState === null) return TL_T("appearance.toggle");
			const mode = appearanceState.mode;
			if (mode === "sky") {
				const next = appearanceNextBoundary(Date.now(), appearanceSunTimes(), appearanceState.sky);
				if (next !== null) {
					return TL_T("appearance.toggleSky", { mode: appearanceModeLabel(mode), time: appearanceFormatClock(next.minutes) });
				}
			}
			return TL_T("appearance.toggle", { mode: appearanceModeLabel(mode) });
		}
		function appearanceSyncToggle() {
			const button = document.querySelector("[data-tl-scheme-toggle]");
			if (button === null) return;
			const mode = appearanceState === null ? "follow" : appearanceState.mode;
			const scheme = tl5Scheme();
			button.setAttribute("data-tl-scheme-mode", mode);
			button.setAttribute("data-tl-scheme-current", scheme);
			const title = appearanceToggleTitle();
			button.setAttribute("title", title);
			button.setAttribute("aria-label", title);
		}
		let appearanceMenuCloser = null;
		function appearanceCloseMenu() {
			if (appearanceMenuCloser !== null) {
				const close = appearanceMenuCloser;
				appearanceMenuCloser = null;
				close();
			}
		}
		/**
		 * Context menu (right click / long press) with the four modes. It registers on the
		 * shared overlay stack, so Esc closes only this layer and focus returns to the
		 * toggle.
		 */
		function appearanceOpenMenu(button, anchor) {
			appearanceCloseMenu();
			if (typeof tl5OverlayOpenAllowed === "function" && tl5OverlayOpenAllowed(APPEARANCE_MENU_ID) === false) return;
			const body = document.body;
			if (body === null) return;
			const menu = document.createElement("div");
			menu.setAttribute("data-tl-scheme-menu", "");
			menu.setAttribute("role", "menu");
			menu.setAttribute("data-tl-menu", "");
			menu.setAttribute("aria-label", TL_T("appearance.menuTitle"));
			const modes = TL5_APPEARANCE_MODES;
			const current = appearanceState === null ? "follow" : appearanceState.mode;
			for (const mode of modes) {
				const item = document.createElement("button");
				item.type = "button";
				item.setAttribute("role", "menuitemradio");
				item.setAttribute("data-tl-scheme-mode-item", mode);
				item.setAttribute("aria-checked", mode === current ? "true" : "false");
				item.className = "tl-scheme-menu-item";
				if (mode === current) item.setAttribute("data-tl-active", "");
				const label = document.createElement("span");
				label.textContent = appearanceModeLabel(mode);
				item.appendChild(label);
				const hint = document.createElement("span");
				hint.className = "tl-scheme-menu-check";
				hint.textContent = mode === current ? "✓" : "";
				item.appendChild(hint);
				item.addEventListener("click", (event) => {
					event.stopPropagation();
					appearanceCloseMenu();
					const origin = { x: anchor.x, y: anchor.y };
					appearanceApply({ mode });
					const copy =
						mode === "follow"
							? TL_T("appearance.followedHost")
							: TL_T(mode === "sky" ? "appearance.skyEnabled" : mode === "dark" ? "appearance.switchedDark" : "appearance.switchedLight");
					appearanceTip(copy);
					tl5Diag("appearance", { lastMode: mode, origin });
				});
				menu.appendChild(item);
			}
			const hint = document.createElement("p");
			hint.className = "tl-scheme-menu-hint";
			hint.textContent = TL_T("appearance.menuHint");
			menu.appendChild(hint);
			menu.style.setProperty("--tl-menu-x", Math.round(anchor.x) + "px");
			menu.style.setProperty("--tl-menu-y", Math.round(anchor.y) + "px");
			body.appendChild(menu);
			const onPointerDown = (event) => {
				if (menu.contains(event.target) === true) return;
				appearanceCloseMenu();
			};
			let disposeOverlay = null;
			const close = () => {
				try {
					document.removeEventListener("pointerdown", onPointerDown, true);
				} catch {
					// nothing to remove
				}
				menu.remove();
				if (typeof disposeOverlay === "function") disposeOverlay();
				disposeOverlay = null;
				try {
					button.focus({ preventScroll: true });
				} catch {
					// the button may be gone
				}
			};
			disposeOverlay =
				typeof tl5OverlayRegister === "function"
					? tl5OverlayRegister({ id: APPEARANCE_MENU_ID, root: menu, onEscape: close })
					: null;
			appearanceMenuCloser = close;
			document.addEventListener("pointerdown", onPointerDown, true);
			const first = menu.querySelector("[data-tl-active]") ?? menu.querySelector("button");
			try {
				first?.focus?.({ preventScroll: true });
			} catch {
				// focus is best effort
			}
		}
		function installAppearanceToggle() {
			const body = document.body;
			if (body === null) return () => {};
			if (document.querySelector("[data-tl-scheme-toggle]") !== null) return () => {};
			const button = document.createElement("button");
			button.type = "button";
			button.setAttribute("data-tl-scheme-toggle", "");
			button.innerHTML =
				'<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle class="tl-scheme-sun" cx="12" cy="12" r="4.6"></circle><g class="tl-scheme-rays"><path d="M12 2.6v2.4M12 19v2.4M2.6 12h2.4M19 12h2.4M5.3 5.3l1.7 1.7M17 17l1.7 1.7M18.7 5.3L17 7M7 17l-1.7 1.7"></path></g><path class="tl-scheme-moon" d="M14.6 3.4a8.6 8.6 0 1 0 6 14.6 7 7 0 0 1-6-14.6z"></path></svg>';
			body.appendChild(button);
			let pressTimer = 0;
			let suppressClick = false;
			const pointOf = () => {
				const rect = button.getBoundingClientRect();
				return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
			};
			const onClick = (event) => {
				event.stopPropagation();
				if (suppressClick === true) {
					suppressClick = false;
					return;
				}
				appearanceToggleScheme(pointOf());
			};
			const onContextMenu = (event) => {
				event.preventDefault();
				event.stopPropagation();
				appearanceOpenMenu(button, pointOf());
			};
			const onPointerDown = () => {
				if (pressTimer !== 0) globalThis.clearTimeout(pressTimer);
				pressTimer = globalThis.setTimeout(() => {
					pressTimer = 0;
					suppressClick = true;
					appearanceOpenMenu(button, pointOf());
				}, 450);
			};
			const onPointerUp = () => {
				if (pressTimer !== 0) {
					globalThis.clearTimeout(pressTimer);
					pressTimer = 0;
				}
			};
			button.addEventListener("click", onClick);
			button.addEventListener("contextmenu", onContextMenu);
			button.addEventListener("pointerdown", onPointerDown);
			button.addEventListener("pointerup", onPointerUp);
			button.addEventListener("pointercancel", onPointerUp);
			appearanceSyncToggle();
			const disposeShortcut = (() => {
				try {
					if (typeof registerTl5Shortcut !== "function") return () => {};
					return registerTl5Shortcut({
						id: "scheme-toggle",
						keys: "alt+l",
						labelKey: "appearance.altLDesc",
						run: () => {
							if (typeof tl5OverlayOpenAllowed === "function" && tl5OverlayOpenAllowed("scheme-toggle") === false) return;
							appearanceToggleScheme(pointOf());
						},
					});
				} catch (error) {
					note("appearance:shortcut", error);
					return () => {};
				}
			})();
			return () => {
				button.removeEventListener("click", onClick);
				button.removeEventListener("contextmenu", onContextMenu);
				button.removeEventListener("pointerdown", onPointerDown);
				button.removeEventListener("pointerup", onPointerUp);
				button.removeEventListener("pointercancel", onPointerUp);
				if (pressTimer !== 0) globalThis.clearTimeout(pressTimer);
				if (typeof disposeShortcut === "function") disposeShortcut();
				appearanceCloseMenu();
				button.remove();
			};
		}

		// ---- install -----------------------------------------------------------
		function installAppearance() {
			if (appearanceState !== null) return () => {};
			appearanceState = normalizeAppearanceValue(readAppearanceSetting() ?? tl5AppearanceDefaults());
			appearancePersist();
			appearanceThemeReady = appearanceHasThemeService();
			const body = document.body;
			const cleanups = [];
			const add = (fn) => {
				if (typeof fn === "function") cleanups.push(fn);
			};

			// Initial state: follow writes NOTHING (an upgraded user's look is untouched,
			// and prohibition 5 forbids a boot-time setTheme). A stored fixed mode that
			// disagrees with the live scheme can only mean the user changed DSH's own
			// preference while this build was closed — honour that and become follow
			// rather than writing their choice back.
			if (appearanceState.mode === "light" || appearanceState.mode === "dark") {
				if (appearanceState.mode !== tl5Scheme()) {
					appearanceState.mode = "follow";
					appearancePersist();
					tl5Diag("appearance", { bootMismatch: true, live: tl5Scheme() });
				}
			} else if (appearanceState.mode === "sky") {
				appearanceApplyModeWallpaper(appearanceSchemeNow(Date.now(), appearanceSunTimes(), appearanceState.sky));
				// Prohibition: no setTheme during the boot frame. Reconcile after it.
				globalThis.setTimeout(() => appearanceSkyTick(), 800);
			}

			// DSH preference changes: our own writes are ignored, an external edit means the
			// user switched in DSH's settings → follow it (never fight the user).
			add(
				tl5OnThemeChange((snapshot) => {
					const preference = snapshot !== null && snapshot !== undefined ? snapshot.preference : "";
					if (typeof preference !== "string" || preference === "") return;
					appearanceThemeReady = appearanceHasThemeService();
					if (appearanceState === null) return;
					const selfTarget = preference === "dark" || preference === "light" ? preference : "";
					const decision = appearanceConflictDecision(
						appearanceState.mode,
						preference,
						appearanceSelfWrite,
						globalThis.performance?.now?.() ?? Date.now(),
					);
					if (decision === "follow") {
						appearanceState.mode = "follow";
						appearancePersist();
						appearanceClearSkyTimer();
						appearanceNotify();
						appearanceSyncToggle();
						appearanceTip(TL_T("appearance.followedHost"));
						tl5Diag("appearance", { conflicted: true, preference, selfTarget });
					}
					appearanceSyncToggle();
				}),
			);
			// The rendered scheme flipped (whoever wrote it): recompute everything that
			// samples a colour, then re-arm the sky timer so a manual switch does not leave
			// a stale timer behind.
			add(
				tl5OnScheme((scheme) => {
					appearanceSyncToggle();
					appearanceScheduleSample(false);
					appearanceApplyModeWallpaper(scheme);
					if (appearanceState !== null && appearanceState.mode === "sky") appearanceScheduleSky();
				}),
			);
			// Returning from a long sleep may have skipped boundaries: recompute once.
			const onVisible = () => {
				if (document.hidden === true) return;
				if (appearanceState !== null && appearanceState.mode === "sky") {
					appearanceSkyTick();
				} else {
					appearanceScheduleSample(false);
				}
			};
			document.addEventListener("visibilitychange", onVisible);
			add(() => document.removeEventListener("visibilitychange", onVisible));

			add(installAppearanceToggle());
			appearanceScheduleSample(true);
			appearanceScheduleSky();
			tl5Diag("appearance", {
				mode: appearanceState.mode,
				transition: appearanceState.transition,
				themeService: appearanceThemeReady,
				setThemeCalls: appearanceSetThemeCalls,
			});
			const previousGlobal = globalThis.tianlightAppearance;
			globalThis.tianlightAppearance = {
				state: () => appearanceSnapshot(),
				apply: (patch) => appearanceApply(patch),
				subscribe: (listener) => appearanceSubscribe(listener),
				scheme: () => tl5Scheme(),
				toggle: () => appearanceToggleScheme(null),
				service: () => appearanceHasThemeService(),
				openMenu: () => {
					const button = document.querySelector("[data-tl-scheme-toggle]");
					if (button !== null) {
						const rect = button.getBoundingClientRect();
						appearanceOpenMenu(button, { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
					}
				},
				stop: () => {},
			};
			return () => {
				for (const dispose of cleanups.splice(0)) {
					try {
						dispose();
					} catch (error) {
						note("appearance:dispose", error);
					}
				}
				appearanceCloseMenu();
				appearanceClearSkyTimer();
				if (appearanceSampleTimer !== 0) globalThis.clearTimeout(appearanceSampleTimer);
				if (appearanceSecondSampleTimer !== 0) globalThis.clearTimeout(appearanceSecondSampleTimer);
				appearanceSampleTimer = 0;
				appearanceSecondSampleTimer = 0;
				appearanceSubscribers.clear();
				appearanceState = null;
				appearanceSelfWrite = { target: "", at: 0 };
				appearanceThemeReady = false;
				try {
					if (globalThis.tianlightAppearance !== undefined) {
						if (previousGlobal === undefined) delete globalThis.tianlightAppearance;
						else globalThis.tianlightAppearance = previousGlobal;
					}
				} catch {
					// a frozen global slot is not fatal
				}
				try {
					const host = document.body;
					if (host !== null) {
						host.style.removeProperty("--tl-day-lift");
						host.style.removeProperty("--tl-night-lift");
						host.removeAttribute("data-tl-theme-switching");
						host.removeAttribute("data-tl-theme-fading");
					}
				} catch {
					// a replaced body is fine
				}
			};
		}

		// ---- i18n + CSS ---------------------------------------------------------
		function installAppearanceStrings() {
			registerTl5Strings({
				zh: {
					"appearance.title": "外观",
					"appearance.mode.follow": "跟随 DSH",
					"appearance.mode.light": "浅色",
					"appearance.mode.dark": "深色",
					"appearance.mode.sky": "随天光",
					"appearance.sky.source.auto": "日出日落（天气定位）",
					"appearance.sky.source.clock": "手动时间",
					"appearance.sky.source.label": "数据来源",
					"appearance.sky.lightAt": "天亮时间",
					"appearance.sky.darkAt": "天黑时间",
					"appearance.transition.label": "切换动效",
					"appearance.wallpaper.none": "跟随当前壁纸",
					"appearance.sky.next": "下次切换：{time} → {mode}",
					"appearance.transition.reveal": "揭开",
					"appearance.transition.fade": "柔和",
					"appearance.transition.off": "关闭",
					"appearance.wallpaper.light": "浅色壁纸",
					"appearance.wallpaper.dark": "深色壁纸",
					"appearance.wallpaper.pick": "从壁纸库选择",
					"appearance.wallpaper.clear": "清除",
					"appearance.wallpaper.applySlot": "设为{slot}壁纸",
					"appearance.altLDesc": "切换浅色/深色外观",
					"appearance.toggle": "外观：{mode}（Alt+L 切换）",
					"appearance.toggleSky": "随天光 · {time} 切换（Alt+L）",
					"appearance.menuTitle": "外观模式",
					"appearance.menuHint": "天光会同步修改 DSH 的「设置 → 通用 → 外观」。",
					"appearance.switchedLight": "已切换到浅色",
					"appearance.switchedDark": "已切换到深色",
					"appearance.skyEnabled": "已切换到随天光",
					"appearance.followedHost": "已改为跟随 DSH 的外观设置",
					"appearance.noThemeService": "当前 DSH 未提供主题服务，请在 DSH 设置 → 通用 → 外观中切换",
					"appearance.darkWallpaperHint": "这张壁纸偏暗，浅色模式会加一层晨雾保证可读；可在「外观」里为浅色单独指定一张明亮壁纸",
					"appearance.wallpaperMissing": "该壁纸已不在库中，已清除这个分模式壁纸",
					"appearance.hostNote": "当前外观由 DSH 的设置决定；天光只提供快捷切换。",
				},
				en: {
					"appearance.title": "Appearance",
					"appearance.mode.follow": "Follow DSH",
					"appearance.mode.light": "Light",
					"appearance.mode.dark": "Dark",
					"appearance.mode.sky": "Follow daylight",
					"appearance.sky.source.auto": "Sunrise / sunset (weather location)",
					"appearance.sky.source.clock": "Manual times",
					"appearance.sky.source.label": "Source",
					"appearance.sky.lightAt": "Light at",
					"appearance.sky.darkAt": "Dark at",
					"appearance.transition.label": "Transition",
					"appearance.wallpaper.none": "Follow the current wallpaper",
					"appearance.sky.next": "Next switch: {time} → {mode}",
					"appearance.transition.reveal": "Reveal",
					"appearance.transition.fade": "Soft fade",
					"appearance.transition.off": "Off",
					"appearance.wallpaper.light": "Light wallpaper",
					"appearance.wallpaper.dark": "Dark wallpaper",
					"appearance.wallpaper.pick": "Pick from library",
					"appearance.wallpaper.clear": "Clear",
					"appearance.wallpaper.applySlot": "Use as {slot} wallpaper",
					"appearance.altLDesc": "Toggle light/dark appearance",
					"appearance.toggle": "Appearance: {mode} (Alt+L to switch)",
					"appearance.toggleSky": "Following daylight · switches at {time} (Alt+L)",
					"appearance.menuTitle": "Appearance mode",
					"appearance.menuHint": "Tianlight writes DSH's own Settings → General → Appearance preference.",
					"appearance.switchedLight": "Switched to light",
					"appearance.switchedDark": "Switched to dark",
					"appearance.skyEnabled": "Following daylight",
					"appearance.followedHost": "Now following DSH's appearance setting",
					"appearance.noThemeService": "This DSH build exposes no theme service; switch in DSH Settings → General → Appearance",
					"appearance.darkWallpaperHint": "This wallpaper is dark, so light mode adds a morning fog for legibility — you can set a bright wallpaper for light mode in Appearance",
					"appearance.wallpaperMissing": "That wallpaper is no longer in the library; this per-mode slot was cleared",
					"appearance.hostNote": "The current appearance follows DSH's own setting; Tianlight only adds the quick switch.",
				},
			});
		}
		// Registered at factory evaluation so TL_T resolves from the very first paint
		// (the toggle title and every later render read these keys).
		installAppearanceStrings();
		registerTl5Css(String.raw`/* ---- v2.3.0 appearance toggle: a 30px glass circle left of the weather chip ----
   The chip is pushed right when the toggle exists, so the pair keeps the 8px gap
   without JS measuring a variable-width chip. It floats below the Windows title
   strip exactly like the chip, and never takes layout space. */
body[data-dsh-tianlight] [data-tl-scheme-toggle] {
	position: fixed;
	top: calc(var(--dsh-windows-titlebar-height, 0px) + var(--dsh-frame-top-clearance, 48px) + 8px);
	right: 14px;
	z-index: 96;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	box-sizing: border-box;
	width: 30px;
	height: 30px;
	padding: 0;
	border-radius: 50%;
	border: 0.5px solid var(--tl-glass-line);
	background-color: color-mix(in srgb, var(--tl-glass-fill) 90%, transparent);
	color: var(--tl-ink);
	cursor: pointer;
	-webkit-app-region: no-drag;
	box-shadow:
		var(--tl-pill-inset),
		var(--tl-shadow-float);
	transition: transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1), background-color 180ms ease, border-color 180ms ease;
}
body[data-dsh-tianlight]:has([data-tl-scheme-toggle]) [data-tl-weather-chip] {
	right: 52px;
}
body[data-dsh-tianlight] [data-tl-scheme-toggle]:hover {
	transform: scale(1.06);
	border-color: var(--tl-accent);
}
body[data-dsh-tianlight] [data-tl-scheme-toggle]:active {
	transform: scale(0.94);
}
body[data-dsh-tianlight] [data-tl-scheme-toggle]:focus-visible {
	outline: 2px solid var(--tl-accent);
	outline-offset: 2px;
}
body[data-dsh-tianlight] [data-tl-scheme-toggle] svg {
	display: block;
	width: 16px;
	height: 16px;
	overflow: visible;
	fill: none;
	stroke: currentColor;
	stroke-width: 1.6;
	stroke-linecap: round;
	stroke-linejoin: round;
}
body[data-dsh-tianlight] [data-tl-scheme-toggle] .tl-scheme-sun {
	fill: currentColor;
	stroke: none;
	transform-origin: 12px 12px;
	transition: transform 360ms cubic-bezier(0.22, 1, 0.36, 1), opacity 240ms ease;
}
body[data-dsh-tianlight] [data-tl-scheme-toggle] .tl-scheme-rays {
	transition: transform 360ms cubic-bezier(0.22, 1, 0.36, 1), opacity 240ms ease;
	transform-origin: 12px 12px;
}
body[data-dsh-tianlight] [data-tl-scheme-toggle] .tl-scheme-moon {
	fill: currentColor;
	stroke: none;
	opacity: 0;
	transform: translate(4px, -4px) scale(0.4);
	transform-origin: 12px 12px;
	transition: transform 360ms cubic-bezier(0.22, 1, 0.36, 1), opacity 240ms ease;
}
/* Light scheme: sun. Dark scheme: the sun shrinks away and the moon slides in. */
body[data-dsh-tianlight] [data-tl-scheme-toggle][data-tl-scheme-current="dark"] .tl-scheme-sun {
	transform: scale(0.2) rotate(90deg);
	opacity: 0;
}
body[data-dsh-tianlight] [data-tl-scheme-toggle][data-tl-scheme-current="dark"] .tl-scheme-rays {
	transform: scale(0.4) rotate(90deg);
	opacity: 0;
}
body[data-dsh-tianlight] [data-tl-scheme-toggle][data-tl-scheme-current="dark"] .tl-scheme-moon {
	opacity: 1;
	transform: translate(0, 0) scale(1);
}
@media (max-width: 719px) {
	body[data-dsh-tianlight] [data-tl-scheme-toggle] {
		top: calc(var(--dsh-windows-titlebar-height, 0px) + var(--dsh-frame-top-clearance, 48px) + 6px);
	}
}
/* The popup menu reuses the shared [data-tl-menu] glass recipe; only placement and
   rows are new. */
body[data-dsh-tianlight] [data-tl-scheme-menu] {
	position: fixed;
	z-index: 97;
	top: calc(var(--tl-menu-y, 60px) + 18px);
	right: 14px;
	box-sizing: border-box;
	width: 210px;
	padding: 6px;
	border-radius: 14px;
	border: 0.5px solid var(--tl-glass-line);
	outline: none;
}
body[data-dsh-tianlight] [data-tl-scheme-menu] .tl-scheme-menu-item {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 8px;
	width: 100%;
	height: 32px;
	padding: 0 10px;
	border: 0;
	border-radius: 9px;
	background: transparent;
	color: var(--tl-ink);
	font: 500 13px/1 var(--ds-font-family, system-ui);
	text-align: left;
	cursor: pointer;
}
body[data-dsh-tianlight] [data-tl-scheme-menu] .tl-scheme-menu-item:hover,
body[data-dsh-tianlight] [data-tl-scheme-menu] .tl-scheme-menu-item:focus-visible {
	background: var(--tl-accent-soft);
	outline: none;
}
body[data-dsh-tianlight] [data-tl-scheme-menu] .tl-scheme-menu-check {
	color: var(--tl-accent);
	font-size: 12px;
}
body[data-dsh-tianlight] [data-tl-scheme-menu] .tl-scheme-menu-hint {
	margin: 4px 8px 2px;
	color: var(--tl-ink-faint);
	font: 400 11px/1.5 var(--ds-font-family, system-ui);
}
/* ---- theme transition ---- */
::view-transition-old(root),
::view-transition-new(root) {
	animation: none;
	mix-blend-mode: normal;
}
::view-transition-old(root) {
	z-index: 1;
}
::view-transition-new(root) {
	z-index: 2;
}
body[data-dsh-tianlight][data-tl-theme-fading] [data-tl-sidebar-col],
body[data-dsh-tianlight][data-tl-theme-fading] [data-tl-wall],
body[data-dsh-tianlight][data-tl-theme-fading] [data-tl-settings],
body[data-dsh-tianlight][data-tl-theme-fading] [data-tl-menu],
body[data-dsh-tianlight][data-tl-theme-fading] [data-tl-composer],
body[data-dsh-tianlight][data-tl-theme-fading] #root,
body[data-dsh-tianlight][data-tl-theme-fading] [data-tl-scene] > [data-tl-veil] {
	transition: background-color 320ms ease, color 320ms ease, box-shadow 320ms ease, border-color 320ms ease;
}
@media (prefers-reduced-motion: reduce) {
	body[data-dsh-tianlight][data-tl-theme-fading] [data-tl-sidebar-col],
	body[data-dsh-tianlight][data-tl-theme-fading] [data-tl-wall],
	body[data-dsh-tianlight][data-tl-theme-fading] [data-tl-settings],
	body[data-dsh-tianlight][data-tl-theme-fading] [data-tl-menu],
	body[data-dsh-tianlight][data-tl-theme-fading] [data-tl-composer],
	body[data-dsh-tianlight][data-tl-theme-fading] #root,
	body[data-dsh-tianlight][data-tl-theme-fading] [data-tl-scene] > [data-tl-veil] {
		transition: none;
	}
}
`);
		//#endregion
