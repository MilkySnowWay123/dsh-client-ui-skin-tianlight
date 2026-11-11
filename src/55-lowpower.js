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
			// The battery probe is async; a dispose (module reinstall / HMR) can land
			// before it resolves, so every late callback must check this flag before
			// attaching listeners or writing the page attribute.
			let disposed = false;
			let active = false;
			let reason = "";
			let detail = "";
			// Structured companions of `detail` (see the region doc above). Always
			// present so the snapshot shape does not change between states.
			let detailKey = "";
			let detailParams = null;
			let subscriber = null;
			// S2b (REV-S2 F1): targets this supervisor actually paused. A hidden page
			// leaves low power without resuming (correct); when the page becomes visible
			// again these marked targets are resumed once — the rail mirror has no
			// visibility handler of its own, so without this it stayed frozen forever.
			const pausedTargets = new Set();
			const markPaused = (target) => {
				if (target !== null && target !== undefined) pausedTargets.add(target);
			};
			/**
			 * S2c (REV-S2b F1): a playback object can be REPLACED or detached by its own
			 * module (wallpaper dispose sets scenePlayback=null, zones dispose sets
			 * railPlayback=null). Resuming such a stale object would restart rAF for a
			 * removed rail or try to resume a detached video, so only the CURRENT target
			 * is resumed; stale markers are dropped.
			 */
			const isCurrentTarget = (target) => target === scenePlayback || target === railPlayback;
			const prunePausedTargets = () => {
				for (const target of [...pausedTargets]) {
					if (isCurrentTarget(target) === false) pausedTargets.delete(target);
				}
			};
			const resumePausedTargets = () => {
				if (pausedTargets.size === 0) return;
				const targets = [...pausedTargets];
				pausedTargets.clear();
				for (const target of targets) {
					if (isCurrentTarget(target) === false) continue;
					try {
						target.resume();
					} catch (error) {
						note("lowpower:resume-target", error);
					}
				}
			};
			const snapshot = () => ({ mode, active, reason, detail, detailKey, detailParams });

			/**
			 * S2: one decision, applied once per threshold CROSSING. Battery level events
			 * fire on every 1% change; re-running pause/resume then (a) restarted the scene
			 * repeatedly, (b) resumed a hidden page's WebWallGL scene and (c) cleared the
			 * wallpaper's adaptive downgrade on unrelated events. `sync` is the only path
			 * that may re-apply the current state to a late-mounted playback target.
			 */
			const apply = (syncTargets) => {
				// Drop markers for targets that no longer exist before any decision.
				prunePausedTargets();
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
				const entered = nextActive === true && active === false;
				const left = nextActive === false && active === true;
				// Ordinary battery-percent changes update `detail` silently; only a real
				// state/reason transition notifies subscribers or touches playback.
				const stateChanged = nextActive !== active || nextReason !== reason;
				const reasonChanged = nextReason !== reason;
				active = nextActive;
				reason = nextReason;
				detail = nextDetail;
				detailKey = nextDetailKey;
				detailParams = nextDetailParams;
				const body = document.body;
				if (body === null) return;
				if (nextActive) {
					if (body.hasAttribute("data-tl-lowpower") === false) body.setAttribute("data-tl-lowpower", "");
					if (reasonChanged || body.getAttribute("data-tl-lowpower-reason") !== nextReason) {
						body.setAttribute("data-tl-lowpower-reason", nextReason);
					}
				} else if (body.hasAttribute("data-tl-lowpower")) {
					body.removeAttribute("data-tl-lowpower");
					body.removeAttribute("data-tl-lowpower-reason");
				}
				if (nextActive) {
					if (entered || syncTargets === true) {
						if (scenePlayback !== null) {
							scenePlayback.pause();
							markPaused(scenePlayback);
						}
						if (railPlayback !== null) {
							railPlayback.pause();
							markPaused(railPlayback);
						}
					}
					if (entered && typeof audioController !== "undefined") audioController.stop(TL_T("lowpower.audioStopped"));
				} else if (left) {
					// Leaving low power may resume playback, but never on a hidden page: the
					// visibility handler below resumes exactly the targets this supervisor
					// paused once the page is visible again.
					if (document.hidden !== true) resumePausedTargets();
				}
				if (stateChanged && subscriber !== null) {
					try {
						subscriber(snapshot());
					} catch (error) {
						note("lowpower:subscriber", error);
					}
				}
			};

			const onSignal = () => apply(false);
			const onVisibilityChange = () => {
				// Coming back to a visible page re-checks the CURRENT battery/mode state and
				// re-applies it to the (possibly remounted) scene; while hidden nothing runs.
				// REV-S2 F1: targets paused before a hidden exit are resumed exactly once.
				if (document.hidden !== true) {
					if (active === false) resumePausedTargets();
					apply(true);
				}
			};
			try {
				if (typeof document !== "undefined" && document !== null && typeof document.addEventListener === "function") {
					document.addEventListener("visibilitychange", onVisibilityChange);
				}
			} catch {
				// no document: the battery/media-query signals still drive the attribute
			}
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
							if (disposed) return;
							battery = value;
							battery.addEventListener?.("levelchange", onSignal);
							battery.addEventListener?.("chargingchange", onSignal);
							apply(false);
						})
						.catch(() => {
							// no battery API: the other signals still work
						});
				}
			} catch {
				battery = null;
			}

			apply(false);
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
				// supervisor, and the rail source can be swapped at any time. `sync` only
				// re-applies the CURRENT state; it never resumes a hidden page.
				sync: () => apply(true),
				set: (next) => {
					mode = next === "on" || next === "off" ? next : "auto";
					try {
						globalThis.localStorage.setItem(LOWPOWER_KEY, mode);
					} catch {
						// persistence is optional
					}
					apply(false);
				},
			};

			return () => {
				disposed = true;
				lowPowerController = null;
				subscriber = null;
				query?.removeEventListener?.("change", onSignal);
				try {
					if (typeof document !== "undefined" && document !== null && typeof document.removeEventListener === "function") {
						document.removeEventListener("visibilitychange", onVisibilityChange);
					}
				} catch {
					// the page is going away
				}
				battery?.removeEventListener?.("levelchange", onSignal);
				battery?.removeEventListener?.("chargingchange", onSignal);
				const body = document.body;
				if (body !== null) {
					body.removeAttribute("data-tl-lowpower");
					body.removeAttribute("data-tl-lowpower-reason");
				}
				// REV-S2 F1: dispose follows the same visibility rule — never wake a hidden
				// page, but do not leave a visible page parked by a supervisor that is gone.
				if (document.hidden !== true) resumePausedTargets();
				pausedTargets.clear();
			};
		}
		//#endregion

