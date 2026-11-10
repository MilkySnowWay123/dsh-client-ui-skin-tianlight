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

