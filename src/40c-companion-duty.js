		//#region companion
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
			// S1: internal replay bridge for the life engine (no replaceable global read).
			const previousReplay = companionDutyBridge.dutyReplay;
			companionDutyBridge.dutyReplay = replay;
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
				if (companionDutyBridge.dutyReplay === replay) {
					companionDutyBridge.dutyReplay = previousReplay === undefined ? null : previousReplay;
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
