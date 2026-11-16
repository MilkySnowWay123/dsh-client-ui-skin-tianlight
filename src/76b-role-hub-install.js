		//#region role hub
		/**
		 * Install the full-screen role hub (pet menu / right-click are the entry points).
		 * Returns a disposer that closes (and fully removes) an open overlay and restores
		 * the previous `globalThis.tianlightRoleHub`.
		 */
		function installRoleHub(ctx) {
			// The hub has no DSH slots/settings entries since v1.3.0; the pet is the entry.
			// `ctx` is only used to resolve the read-only remote.llm provider catalog (plan A).
			let disposed = false;
			let openState = false;
			let rootEl = null;
			// R8c (REV-R8 F2): capture-phase click/change fence that disarms a pending
			// destructive confirmation whenever the user acts anywhere else in the hub.
			let confirmCaptureDisposer = null;
			let ui = null;
			let timer = 0;
			let triggerEl = null;
			let mediaCache = null;
			let mediaBusy = false;
			/** One look switch in flight (double click / row + Apply must not race). */
			let mediaApplying = false;
			/** Effective pack last loaded by the editor (for "did this row have custom value?"). */
			let loadedPack = null;
			let chatBusy = false;
			let llmPending = false;
			// v1.6.8 autonomous-thinking card state (read-through only).
			let mindBusy = false;
			let lastError = "";
			// v1.2.0 experimental agent card state (all read-through, no second source).
			let agentStatusCache = null;
			let agentPermPending = false;
			let agentBusy = false;
			let agentTargetSignature = "";
			// The bridge returns the session catalog from refreshSessions() (status keeps
			// only the connected session), so cache the last successful listing here.
			let agentSessionsCache = [];
			// v1.4.0 permission rows that are armed for their second consent click.
			const permConfirmPending = new Map();
			// R5 destructive actions use the same "click twice" arming pattern.
			let packResetPending = false;
			let mindClearPending = false;
			// R8b (REV-R5 6): an armed destructive confirmation expires after 5s, and any
			// other card action disarms it — so "arm, then click elsewhere, then click the
			// same button once" can never execute a destructive action by accident.
			let packResetArmTimer = 0;
			let mindClearArmTimer = 0;
			// True while the rhythm card holds edits not yet applied (draft protection).
			let lifeDraftActive = false;
			// The shared overlay stack disposes through this handle.
			let overlayDisposer = null;
			// v1.5.0 weather / selftest state.
			let weatherBusy = false;
			let selftestBusy = false;
			const selftestResults = [];
			const logEntries = [];

			const setLastError = (stage, error) => {
				lastError = String(error?.message ?? error);
				note("role-hub:" + stage, error);
			};
			/** Run an async UI task without ever leaving an unhandled rejection behind. */
			const runAsync = (task) => {
				try {
					const result = task();
					if (result !== null && result !== undefined && typeof result.catch === "function") {
						result.catch((error) => setLastError("async", error));
					}
				} catch (error) {
					setLastError("async-sync", error);
				}
			};

			// ---- plan A: DSH LLM provider read (the hub only chooses a provider) ----
			// `remote.llm` is a READ-ONLY client remote namespace mounted asynchronously
			// by api-remotes, so an eager ctx.get() at apply() time is usually undefined.
			// The legal ways in mirror the existing remote.session resolver: the dotted
			// "remote.llm" service key, the injected scope (+ scoped.remote.llm), or the
			// guarded "remote" context property. Exactly one remote method is ever called:
			// listProviders() — no model/session/prompt method is reachable from here.
			let hubLlmServiceScope = null;
			let hubLlmRemoteScope = null;
			const hubLlmInjectDisposers = [];
			/** `{ ok, providers, reason }` of the first read; null until it completes. */
			let hubLlmProvidersCache = null;
			let hubLlmProvidersBusy = false;
			/** Signature guard: rebuild `<select>` options only when the data changed. */
			let hubLlmProviderSignature = "";
			// v2.2.0: model catalogue read on demand (not on every status poll).
			/** `{ provider, ok, models, reason }` for the current provider; null until read. */
			let hubLlmModelsCache = null;
			let hubLlmModelsBusy = false;
			/** Signature guard for the model `<select>` options. */
			let hubLlmModelSignature = "";
			try {
				if (ctx !== null && ctx !== undefined && typeof ctx.inject === "function") {
					hubLlmInjectDisposers.push(
						ctx.inject(["remote.llm"], (scoped) => {
							hubLlmServiceScope = scoped;
							return () => {
								hubLlmServiceScope = null;
							};
						}),
					);
					hubLlmInjectDisposers.push(
						ctx.inject(["remote"], (scoped) => {
							hubLlmRemoteScope = scoped;
							return () => {
								hubLlmRemoteScope = null;
							};
						}),
					);
				}
			} catch (error) {
				note("role-hub:llm-inject", error);
			}
			const hubHasListProviders = (candidate) =>
				candidate !== null && candidate !== undefined && typeof candidate.listProviders === "function";
			/** The `remote.llm` namespace, or null when no resolution path answers (plan A). */
			const hubRemoteLlm = () => {
				// 1) the dotted service key, when the loader already mounted it
				try {
					const direct = ctx !== null && ctx !== undefined && typeof ctx.get === "function" ? ctx.get("remote.llm") : undefined;
					if (hubHasListProviders(direct)) return direct;
				} catch (error) {
					note("role-hub:llm-get", error);
				}
				// 2) the injected "remote.llm" scope: scoped.get(...) then scoped.remote.llm
				if (hubLlmServiceScope !== null) {
					try {
						const scopedDirect = typeof hubLlmServiceScope.get === "function" ? hubLlmServiceScope.get("remote.llm") : undefined;
						if (hubHasListProviders(scopedDirect)) return scopedDirect;
					} catch (error) {
						note("role-hub:llm-scoped-get", error);
					}
					try {
						const scopedRemote = hubLlmServiceScope.remote?.llm;
						if (hubHasListProviders(scopedRemote)) return scopedRemote;
					} catch (error) {
						note("role-hub:llm-scoped-remote", error);
					}
				}
				// 3) the injected "remote" scope: scoped.remote.llm
				if (hubLlmRemoteScope !== null) {
					try {
						const scopedRemote = hubLlmRemoteScope.remote?.llm;
						if (hubHasListProviders(scopedRemote)) return scopedRemote;
					} catch (error) {
						note("role-hub:llm-remote-scope", error);
					}
				}
				// 4) the guarded "remote" context property: ctx.get("remote")?.llm
				try {
					const remote = ctx !== null && ctx !== undefined && typeof ctx.get === "function" ? ctx.get("remote") : undefined;
					if (hubHasListProviders(remote?.llm)) return remote.llm;
				} catch (error) {
					note("role-hub:llm-remote-get", error);
				}
				// 5) page-plugin contexts expose the namespace directly (`ctx.remote.llm`),
				// which is how the shipped settings section reads the provider directory.
				try {
					const directRemote = ctx !== null && ctx !== undefined ? ctx.remote?.llm : undefined;
					if (hubHasListProviders(directRemote)) return directRemote;
				} catch (error) {
					note("role-hub:llm-ctx-remote", error);
				}
				return null;
			};
			/**
			 * Read the provider catalog. Never rejects and never throws: a missing
			 * namespace or a host-side refusal degrades to `{ok:false}` so the picker can
			 * honestly fall back to "follow the DSH default model" only.
			 */
			const hubListProviders = async () => {
				const remoteLlm = hubRemoteLlm();
				if (remoteLlm === null) return { ok: false, providers: [], reason: "unavailable" };
				let result = null;
				try {
					result = await remoteLlm.listProviders();
				} catch (error) {
					note("role-hub:llm-providers", error);
					return { ok: false, providers: [], reason: "error" };
				}
				if (result !== null && typeof result === "object" && result.ok === false) {
					return { ok: false, providers: [], reason: typeof result.reason === "string" && result.reason !== "" ? result.reason : "unavailable" };
				}
				// Accepted shapes: a bare array, `{value:[...]}` (remote RPC envelope), or
				// a tolerant `{providers:[...]}`. Anything else is a failed read.
				const raw = Array.isArray(result) ? result : Array.isArray(result?.value) ? result.value : Array.isArray(result?.providers) ? result.providers : null;
				if (raw === null) return { ok: false, providers: [], reason: "unexpected-result" };
				const seen = new Set();
				const providers = [];
				for (const entry of raw) {
					if (entry === null || typeof entry !== "object") continue;
					const id = typeof entry.id === "string" ? entry.id.trim() : "";
					if (id === "" || seen.has(id)) continue;
					seen.add(id);
					const name = typeof entry.name === "string" && entry.name.trim() !== "" ? entry.name.trim() : id;
					providers.push({ id, name });
					if (providers.length >= HUB_LLM_PROVIDERS_MAX) break;
				}
				return { ok: true, providers, reason: "" };
			};
			/** Localized fallback hint for a model-failure code; 44 owns the shared copy. */
			const hubLlmHintText = (code) => {
				if (typeof code !== "string" || code === "") return "";
				try {
					if (typeof petLlmHintText === "function") {
						const shared = petLlmHintText(code);
						if (typeof shared === "string" && shared !== "") return shared;
					}
				} catch (error) {
					note("role-hub:llm-hint", error);
				}
				const kind = Object.prototype.hasOwnProperty.call(HUB_AI_LLM_HINT_KEYS, code) ? code : "default";
				return TL_T(HUB_AI_LLM_HINT_KEYS[kind]);
			};

			// ---- R8b (REV-R5 6): destructive-confirm arming with expiry -----------------
			const CONFIRM_ARM_TIMEOUT_MS = 5000;
			const disarmPackReset = () => {
				if (packResetArmTimer !== 0) {
					window.clearTimeout(packResetArmTimer);
					packResetArmTimer = 0;
				}
				packResetPending = false;
				if (ui !== null && ui.packReset !== null && ui.packReset !== undefined) {
					ui.packReset.textContent = TL_T("hub.media.pack.reset");
					ui.packReset.removeAttribute("data-tl-hub-confirm");
				}
			};
			const disarmMindClear = () => {
				if (mindClearArmTimer !== 0) {
					window.clearTimeout(mindClearArmTimer);
					mindClearArmTimer = 0;
				}
				mindClearPending = false;
				if (ui !== null && ui.mindClear !== null && ui.mindClear !== undefined) {
					ui.mindClear.textContent = TL_T("hub.mind.clear");
					ui.mindClear.removeAttribute("data-tl-hub-confirm");
				}
			};
			/** Disarm both destructive confirmations (any other card action calls this). */
			const disarmPendingConfirms = () => {
				if (packResetPending === true) disarmPackReset();
				if (mindClearPending === true) disarmMindClear();
			};
			const armPackReset = () => {
				packResetPending = true;
				if (packResetArmTimer !== 0) window.clearTimeout(packResetArmTimer);
				packResetArmTimer = window.setTimeout(() => {
					packResetArmTimer = 0;
					disarmPackReset();
				}, CONFIRM_ARM_TIMEOUT_MS);
				if (ui !== null && ui.packReset !== null && ui.packReset !== undefined) {
					ui.packReset.textContent = TL_T("hub.media.pack.resetConfirm");
					ui.packReset.setAttribute("data-tl-hub-confirm", "true");
				}
				setPackStatus(TL_T("hub.media.pack.resetConfirmNote"));
			};
			const armMindClear = () => {
				mindClearPending = true;
				if (mindClearArmTimer !== 0) window.clearTimeout(mindClearArmTimer);
				mindClearArmTimer = window.setTimeout(() => {
					mindClearArmTimer = 0;
					disarmMindClear();
				}, CONFIRM_ARM_TIMEOUT_MS);
				if (ui !== null && ui.mindClear !== null && ui.mindClear !== undefined) {
					ui.mindClear.textContent = TL_T("hub.mind.clearConfirm");
					ui.mindClear.setAttribute("data-tl-hub-confirm", "true");
				}
				setMindNote(TL_T("hub.mind.clearConfirmNote"));
			};

			// ---- close / focus / Esc ------------------------------------------------
			const restoreFocus = (target) => {
				if (target === null || target === undefined || typeof target.focus !== "function") return;
				try {
					target.focus();
				} catch {
					// focus is best effort
				}
			};
			const close = () => {
				// R5: closing (Esc included) persists unfinished chat / rhythm edits first, so
				// a single Esc can never silently discard them; reopening restores the draft.
				saveHubDraft();
				// R8b (REV-R5 6): closing also clears the destructive-confirm timers/arms.
				if (packResetArmTimer !== 0) {
					window.clearTimeout(packResetArmTimer);
					packResetArmTimer = 0;
				}
				if (mindClearArmTimer !== 0) {
					window.clearTimeout(mindClearArmTimer);
					mindClearArmTimer = 0;
				}
				lifeDraftActive = false;
				llmPending = false;
				agentPermPending = false;
				agentBusy = false;
				chatBusy = false;
				mindBusy = false;
				mediaApplying = false;
				loadedPack = null;
				packResetPending = false;
				mindClearPending = false;
				permConfirmPending.clear();
				const win = hubBrowserWindow();
				if (timer !== 0) {
					if (win !== null) win.clearInterval(timer);
					timer = 0;
				}
				const previousFocus = triggerEl;
				triggerEl = null;
				// R8c (REV-R8 F2): the capture fence lives exactly as long as the panel.
				if (confirmCaptureDisposer !== null) {
					try {
						confirmCaptureDisposer();
					} catch {
						// the panel DOM is going away anyway
					}
					confirmCaptureDisposer = null;
				}
				if (rootEl !== null) {
					try {
						rootEl.remove();
					} catch (error) {
						setLastError("close-remove", error);
					}
					rootEl = null;
				}
				ui = null;
				openState = false;
				// R5: leave the shared stack; if another layer was registered on top of the
				// hub in the meantime, removing this entry keeps that layer's position.
				if (overlayDisposer !== null) {
					try {
						overlayDisposer();
					} catch {
						// the stack is already torn down
					}
					overlayDisposer = null;
				}
				// Reopening the hub builds a fresh <select>; the cached render signature
				// must not suppress the first fill (v1.2 A73 regression guard).
				agentTargetSignature = "";
				// plan A: same guard for the provider picker built by the new overlay. The
				// provider-list result stays cached (one read per install, not per open).
				hubLlmProviderSignature = "";
				try {
					if (typeof document !== "undefined" && document !== null && document.body !== null && document.body !== undefined) {
						document.body.removeAttribute("data-tl-hub-open");
					}
				} catch (error) {
					setLastError("close-attr", error);
				}
				restoreFocus(previousFocus);
			};

			// ---- status card --------------------------------------------------------
			const refreshFocusButton = (status) => {
				if (ui === null) return;
				const life = hubLifeEngine();
				const button = ui.focusButton;
				if (life === null) {
					button.disabled = true;
					button.textContent = TL_T("hub.focus.start");
					return;
				}
				button.disabled = false;
				const active = hubTry(() => life.focusStatus?.()?.active === true, false, "focus-status");
				button.textContent = active ? TL_T("hub.focus.stop") : TL_T("hub.focus.start");
				button.setAttribute("data-tl-hub-focus-active", active === true ? "true" : "false");
			};
			const refreshMuteButton = (status) => {
				if (ui === null) return;
				const life = hubLifeEngine();
				const button = ui.muteButton;
				if (life === null) {
					button.disabled = true;
					button.textContent = TL_T("hub.mute.start");
					return;
				}
				button.disabled = false;
				const muted = status !== null && typeof status === "object" && Number.isFinite(status.mutedUntil) && status.mutedUntil > Date.now();
				button.textContent = muted ? TL_T("hub.mute.active") : TL_T("hub.mute.start");
			};
			const refreshStatus = () => {
				if (ui === null) return;
				const life = hubLifeEngine();
				const status = life !== null ? hubTry(() => life.status?.(), null, "life-status") : null;
				const pet = hubPetBrain();
				const petStatus = pet !== null ? hubTry(() => pet.status?.(), null, "pet-status") : null;
				ui.statusNote.textContent = status === null ? TL_T("hub.status.unavailable") : "";
				ui.statusCard.setAttribute("data-tl-hub-status-ready", status === null ? "false" : "true");
				if (status !== null) {
					ui.periodValue.textContent = hubPeriodLabel(status.period);
					ui.awakeValue.textContent = status.awake === true ? TL_T("hub.awake.yes") : TL_T("hub.awake.no");
					ui.quietValue.textContent = status.quiet === true ? TL_T("hub.quiet.on") : TL_T("hub.quiet.off");
					const budget = status.budget !== null && typeof status.budget === "object" ? status.budget : {};
					const used = Number.isFinite(budget.used) ? Math.max(0, Math.floor(budget.used)) : 0;
					const cap = Number.isFinite(budget.cap) ? Math.max(0, Math.floor(budget.cap)) : 0;
					ui.budgetValue.textContent = used + "/" + cap;
					const memory = status.memory !== null && typeof status.memory === "object" ? status.memory : {};
					const streak = Number.isFinite(memory.streakDays) ? Math.max(0, Math.floor(memory.streakDays)) : 0;
					ui.streakValue.textContent = TL_T("hub.unit.days", { n: streak });
				} else {
					for (const value of [ui.periodValue, ui.awakeValue, ui.quietValue, ui.budgetValue, ui.streakValue]) value.textContent = "—";
				}
				let aiState = TL_T("hub.ai.unavailable");
				if (pet !== null) aiState = petStatus !== null && petStatus.paused === true ? TL_T("hub.ai.pausedNote") : TL_T("hub.ai.ready");
				ui.aiValue.textContent = aiState;
				refreshFocusButton(status);
				refreshMuteButton(status);
			};

			// ---- life rhythm settings (absorbed from the deleted settings page) ----
			const setLifeNote = (text) => {
				if (ui !== null && ui.lifeNote !== null && ui.lifeNote !== undefined) ui.lifeNote.textContent = text;
			};
			const lifeConfigInputs = () => {
				if (ui === null) return [];
				return [ui.lifeQuietEnabled, ui.lifeQuietStart, ui.lifeQuietEnd, ui.lifeBudget, ui.lifeWake, ui.lifeSleep, ui.lifeVirtual, ui.lifeApply].filter(
					(input) => input !== null && input !== undefined,
				);
			};
			/** True while the user is typing in one of the rhythm inputs (4s tick skips it). */
			const isLifeConfigEditing = () => {
				try {
					if (ui === null) return false;
					const active = typeof document !== "undefined" && document !== null ? document.activeElement : null;
					if (active === null || active === undefined) return false;
					return lifeConfigInputs().some((input) => input === active);
				} catch {
					return false;
				}
			};
			const refreshLifeConfig = (force) => {
				if (ui === null) return;
				const life = hubLifeEngine();
				const inputs = lifeConfigInputs();
				if (life === null) {
					for (const input of inputs) input.disabled = true;
					if (ui.lifeMemory !== null && ui.lifeMemory !== undefined) ui.lifeMemory.textContent = "";
					setLifeNote(TL_T("hub.life.unavailable"));
					return;
				}
				if (force !== true && (isLifeConfigEditing() || lifeDraftActive === true)) return;
				const status = hubTry(() => life.status?.(), null, "life-config-status");
				const config = status !== null && typeof status === "object" && status.config !== null && typeof status.config === "object" ? status.config : null;
				if (config === null) {
					for (const input of inputs) input.disabled = true;
					setLifeNote(TL_T("hub.life.unavailable"));
					return;
				}
				for (const input of inputs) input.disabled = false;
				const quiet = config.quiet !== null && typeof config.quiet === "object" ? config.quiet : {};
				ui.lifeQuietEnabled.checked = quiet.enabled !== false;
				ui.lifeQuietStart.value = typeof quiet.start === "string" ? quiet.start : "23:00";
				ui.lifeQuietEnd.value = typeof quiet.end === "string" ? quiet.end : "08:00";
				ui.lifeBudget.value = String(Number.isFinite(config.cap) ? Math.max(0, Math.min(50, Math.round(config.cap))) : 12);
				ui.lifeWake.value = typeof config.wake === "string" ? config.wake : "08:00";
				ui.lifeSleep.value = typeof config.sleep === "string" ? config.sleep : "23:00";
				ui.lifeVirtual.value = String(Number.isFinite(config.virtualOffsetMinutes) ? Math.max(-720, Math.min(720, Math.round(config.virtualOffsetMinutes))) : 0);
				const memory = status.memory !== null && typeof status.memory === "object" ? status.memory : {};
				const numberOrZero = (value) => (Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0);
				ui.lifeMemory.textContent =
					TL_T("hub.life.memory", {
						interactions: numberOrZero(memory.interactions),
						pats: numberOrZero(memory.pats),
						feeds: numberOrZero(memory.feeds),
						plays: numberOrZero(memory.plays),
						streak: numberOrZero(memory.streakDays),
					}) +
					" · " +
					TL_T("hub.life.lastSeen", { time: hubDateTime(memory.lastSeenAt) });
			};
			const applyLifeConfig = () => {
				disarmPendingConfirms();
				const life = hubLifeEngine();
				if (ui === null) return;
				if (life === null || typeof life.configure !== "function") {
					setLifeNote(TL_T("hub.life.unavailable"));
					return;
				}
				const timeOk = (value) => typeof value === "string" && /^\d{2}:\d{2}$/.test(value);
				let invalid = false;
				const patch = { quiet: { enabled: ui.lifeQuietEnabled.checked === true } };
				const quietStart = String(ui.lifeQuietStart.value ?? "");
				if (timeOk(quietStart)) patch.quiet.start = quietStart;
				else invalid = true;
				const quietEnd = String(ui.lifeQuietEnd.value ?? "");
				if (timeOk(quietEnd)) patch.quiet.end = quietEnd;
				else invalid = true;
				const budget = Number(ui.lifeBudget.value);
				if (Number.isFinite(budget) && budget >= 0 && budget <= 50) patch.budgetDaily = Math.round(budget);
				else invalid = true;
				const wake = String(ui.lifeWake.value ?? "");
				if (timeOk(wake)) patch.wake = wake;
				else invalid = true;
				const sleep = String(ui.lifeSleep.value ?? "");
				if (timeOk(sleep)) patch.sleep = sleep;
				else invalid = true;
				const virtual = Number(ui.lifeVirtual.value);
				if (Number.isFinite(virtual) && virtual >= -720 && virtual <= 720) patch.virtualOffsetMinutes = Math.round(virtual);
				else invalid = true;
				try {
					life.configure(patch);
				} catch (error) {
					setLastError("life-configure", error);
					setLifeNote(TL_T("hub.life.invalid"));
					return;
				}
				setLifeNote(invalid === true ? TL_T("hub.life.invalid") : TL_T("hub.life.saved"));
				if (invalid !== true) {
					lifeDraftActive = false;
					clearHubLifeDraft();
				}
				refreshStatus();
				// R5: an invalid apply must not overwrite what the user is editing with the
				// last saved config (it stays a draft); a valid apply reloads the saved values.
				refreshLifeConfig(invalid !== true);
				refreshAi();
			};

			// ---- R5 unsaved-content draft (Esc/close must never discard input) ----------
			/**
			 * Drafts live in sessionStorage on purpose: per-tab, never mirrored to the host
			 * settings store and never exported in a bundle (the localStorage settings
			 * mirror would sync a `tianlight.*` key). Surviving a reload of the same tab is
			 * enough for the close/reopen flow this protects.
			 */
			const hubDraftStorage = () => {
				try {
					const win = hubBrowserWindow();
					return win !== null && win.sessionStorage !== undefined && win.sessionStorage !== null ? win.sessionStorage : null;
				} catch {
					return null;
				}
			};
			const readHubDraft = () => {
				try {
					const storage = hubDraftStorage();
					if (storage === null) return null;
					const raw = storage.getItem(HUB_DRAFT_KEY);
					if (raw === null || raw === "") return null;
					const value = JSON.parse(raw);
					return value !== null && typeof value === "object" && Array.isArray(value) === false ? value : null;
				} catch {
					return null;
				}
			};
			const writeHubDraft = (draft) => {
				try {
					const storage = hubDraftStorage();
					if (storage === null) return;
					const chat = typeof draft?.chat === "string" ? draft.chat : "";
					const life = draft?.life !== null && typeof draft?.life === "object" ? draft.life : null;
					if (chat === "" && life === null) {
						storage.removeItem(HUB_DRAFT_KEY);
						return;
					}
					storage.setItem(HUB_DRAFT_KEY, JSON.stringify({ chat, life }));
				} catch {
					// draft persistence is best effort
				}
			};
			/** Current rhythm-input values, or null when the card is unavailable/disabled. */
			const lifeDraftNow = () => {
				if (ui === null) return null;
				const inputs = lifeConfigInputs();
				if (inputs.length === 0 || inputs.some((input) => input.disabled === true)) return null;
				return {
					quietEnabled: ui.lifeQuietEnabled.checked === true,
					quietStart: String(ui.lifeQuietStart.value ?? ""),
					quietEnd: String(ui.lifeQuietEnd.value ?? ""),
					budget: String(ui.lifeBudget.value ?? ""),
					wake: String(ui.lifeWake.value ?? ""),
					sleep: String(ui.lifeSleep.value ?? ""),
					virtual: String(ui.lifeVirtual.value ?? ""),
				};
			};
			/** Mark the rhythm card dirty (input/change listeners are attached in buildOverlay). */
			const markLifeDraft = () => {
				lifeDraftActive = true;
			};
			const saveHubDraft = () => {
				if (ui === null) return;
				const chat = typeof ui.chatInput?.value === "string" ? ui.chatInput.value.trim().slice(0, HUB_AI_INPUT_MAX) : "";
				// Only persist rhythm values the user actually touched; untouched inputs
				// mirror the engine config and would otherwise produce a false "restored".
				writeHubDraft({ chat, life: lifeDraftActive === true ? lifeDraftNow() : null });
			};
			const restoreHubDraft = () => {
				if (ui === null) return;
				const draft = readHubDraft();
				if (draft === null) return;
				let restored = false;
				if (typeof draft.chat === "string" && draft.chat !== "" && ui.chatInput !== null && ui.chatInput !== undefined) {
					ui.chatInput.value = draft.chat.slice(0, HUB_AI_INPUT_MAX);
					restored = true;
				}
				const life = draft.life !== null && typeof draft.life === "object" ? draft.life : null;
				if (life !== null) {
					const inputs = lifeConfigInputs();
					if (inputs.length > 0 && inputs.every((input) => input.disabled === false)) {
						if (typeof life.quietStart === "string") ui.lifeQuietStart.value = life.quietStart;
						if (typeof life.quietEnd === "string") ui.lifeQuietEnd.value = life.quietEnd;
						if (typeof life.wake === "string") ui.lifeWake.value = life.wake;
						if (typeof life.sleep === "string") ui.lifeSleep.value = life.sleep;
						if (typeof life.budget === "string") ui.lifeBudget.value = life.budget;
						if (typeof life.virtual === "string") ui.lifeVirtual.value = life.virtual;
						if (typeof life.quietEnabled === "boolean") ui.lifeQuietEnabled.checked = life.quietEnabled;
						lifeDraftActive = true;
						restored = true;
					}
				}
				if (restored === true) setLifeNote(TL_T("hub.draft.restored"));
			};
			/** Drop only the rhythm part after a successful save (chat draft kept). */
			const clearHubLifeDraft = () => {
				const draft = readHubDraft();
				if (draft === null) return;
				writeHubDraft({ chat: typeof draft.chat === "string" ? draft.chat : "", life: null });
			};

			// ---- glass card ---------------------------------------------------------
			const refreshGlass = () => {
				if (ui === null) return;
				const controller = hubGlassDepthController();
				let depth = "off";
				let effective = "off";
				let live = false;
				let liveEffective = false;
				if (controller !== null) {
					depth = hubTry(() => controller.read(), "off", "glass-read");
					effective = hubTry(() => controller.effective(), depth, "glass-effective");
					live = hubTry(() => (typeof controller.live === "function" ? controller.live() : false), false, "glass-live-read") === true;
					liveEffective =
						hubTry(
							() => (typeof controller.liveEffective === "function" ? controller.liveEffective() : false),
							false,
							"glass-live-effective",
						) === true;
				}
				for (const level of HUB_GLASS_LEVELS) {
					const button = ui.glassButtons[level];
					if (button === undefined) continue;
					button.disabled = controller === null;
					if (controller !== null && depth === level) {
						button.setAttribute("data-active", "");
						button.setAttribute("aria-pressed", "true");
					} else {
						button.removeAttribute("data-active");
						button.setAttribute("aria-pressed", "false");
					}
				}
				if (ui.glassLive !== null && ui.glassLive !== undefined) {
					const supported = controller !== null && typeof controller.setLive === "function";
					ui.glassLive.disabled = supported === false || depth === "off";
					ui.glassLive.setAttribute("type", "button");
					ui.glassLive.setAttribute("aria-pressed", live ? "true" : "false");
					if (live) ui.glassLive.setAttribute("data-active", "");
					else ui.glassLive.removeAttribute("data-active");
					ui.glassLive.setAttribute("data-tl-hub-glass-live-state", live ? (liveEffective ? "on" : "degraded") : "off");
				}
				if (ui.glassLiveNote !== null && ui.glassLiveNote !== undefined) {
					ui.glassLiveNote.textContent =
						controller === null
							? TL_T("hub.glass.unavailable")
							: depth === "off"
								? TL_T("hub.glass.liveNeedsDepth")
								: live === false
									? TL_T("hub.glass.liveOffHint")
									: liveEffective === true
										? TL_T("hub.glass.liveOnHint")
										: TL_T("hub.glass.liveDegraded");
				}
				const syncGlassPreview = () => {
					if (ui === null || ui.glassPreview === null || ui.glassPreview === undefined) return;
					ui.glassPreview.setAttribute("data-tl-glass-preview", depth);
					ui.glassPreview.setAttribute("data-depth", depth);
					ui.glassPreview.setAttribute("data-effective", effective);
					ui.glassPreview.setAttribute("data-live", liveEffective ? "on" : "off");
					if (ui.glassPreviewLabel !== null && ui.glassPreviewLabel !== undefined) {
						ui.glassPreviewLabel.textContent = live
							? TL_T("hub.glass.previewLive", {
									depth: hubGlassLabel(depth),
									effective: hubGlassLabel(effective),
								})
							: TL_T("hub.glass.preview", { depth: hubGlassLabel(depth), effective: hubGlassLabel(effective) });
					}
				};
				if (controller === null) {
					ui.glassEffective.textContent = TL_T("hub.glass.unavailable");
					syncGlassPreview();
					return;
				}
				ui.glassEffective.textContent =
					depth === effective
						? TL_T("hub.glass.effective", { depth: hubGlassLabel(depth) })
						: TL_T("hub.glass.lowered", { depth: hubGlassLabel(depth), effective: hubGlassLabel(effective) });
				syncGlassPreview();
			};
			const applyGlass = (level) => {
				const controller = hubGlassDepthController();
				if (controller === null || typeof controller.apply !== "function") {
					if (ui !== null) ui.glassEffective.textContent = TL_T("hub.glass.unavailable");
					return;
				}
				hubTry(() => controller.apply(level), null, "glass-apply");
				refreshGlass();
			};
			/**
			 * v2.2.0: toggle the real-time sampling mode. "Live" is a modifier of a
			 * depth recipe, so turning it on from the "off" depth first selects the
			 * soft recipe (one explicit user action, not a hidden side effect). The
			 * controller persists the preference and the 15fps/low-power guard decides
			 * whether it is actually effective right now.
			 */
			const toggleGlassLive = () => {
				const controller = hubGlassDepthController();
				if (controller === null || typeof controller.setLive !== "function") {
					if (ui !== null && ui.glassLiveNote !== null && ui.glassLiveNote !== undefined) {
						ui.glassLiveNote.textContent = TL_T("hub.glass.unavailable");
					}
					return;
				}
				const current = hubTry(() => (typeof controller.live === "function" ? controller.live() : false), false, "glass-live-current") === true;
				if (current !== true && hubTry(() => controller.read(), "off", "glass-read-live") === "off") {
					hubTry(() => controller.apply("soft"), null, "glass-live-depth");
				}
				hubTry(() => controller.setLive(current !== true), null, "glass-live-toggle");
				refreshGlass();
			};

			// ---- opening animation card ---------------------------------------------
			// The splash module owns the setting and the one-play-per-session rule; the
			// hub only mirrors the stored preference. Turning it off does not replay or
			// cancel the current run (that is already over); the next DSH launch is quiet.
			const refreshSplash = () => {
				if (ui === null || ui.splashToggle === null || ui.splashToggle === undefined) return;
				const style = typeof readSplashStyle === "function" ? readSplashStyle() : "long-once";
				ui.splashToggle.value = style;
				ui.splashToggle.setAttribute("data-style", style);
				if (ui.splashLabel !== null && ui.splashLabel !== undefined) {
					const key =
						style === "long-once"
							? "hub.splash.longOnce"
							: style === "long"
								? "hub.splash.long"
								: style === "simple"
									? "hub.splash.simple"
									: "hub.splash.offOption";
					ui.splashLabel.textContent = TL_T(key);
				}
				if (ui.splashSound !== null && ui.splashSound !== undefined) {
					ui.splashSound.value = typeof readSplashSound === "function" && readSplashSound() ? "1" : "0";
				}
				if (ui.splashMotion !== null && ui.splashMotion !== undefined) {
					ui.splashMotion.value =
						typeof readSplashForceMotion === "function" && readSplashForceMotion() ? "1" : "0";
				}
			};

			// ---- media card ---------------------------------------------------------
			const setMediaStatus = (text) => {
				if (ui !== null) ui.mediaStatus.textContent = text;
			};
			const setUploadStatus = (text) => {
				if (ui !== null) ui.uploadStatus.textContent = text;
			};
			/** Media id the hub is editing now; an unfilled <select> falls back to the built-in look. */
			const currentMediaId = () => {
				if (ui === null) return "default";
				const value = ui.mediaSelect !== null && ui.mediaSelect !== undefined ? ui.mediaSelect.value : "";
				return typeof value === "string" && value !== "" ? value : "default";
			};
			/** A look switch must never overlap a catalog reload or another switch. */
			const mediaLocked = () => mediaBusy === true || mediaApplying === true;
			/** Disable/enable every filename row so a double click cannot start two switches. */
			const syncMediaRowDisabled = () => {
				if (ui === null || ui.mediaList === null || ui.mediaList === undefined) return;
				const locked = mediaLocked();
				for (const row of ui.mediaList.children) {
					if (row === null || typeof row !== "object") continue;
					row.disabled = locked;
				}
			};
			/** v1.6.4: mark the row of the *effective* look in the always-visible name list. */
			const syncMediaListSelection = (selected) => {
				if (ui === null || ui.mediaList === null || ui.mediaList === undefined) return;
				for (const row of ui.mediaList.children) {
					if (row === null || typeof row !== "object" || typeof row.getAttribute !== "function") continue;
					if (row.getAttribute("data-media-id") === selected) {
						row.setAttribute("data-selected", "");
						row.setAttribute("aria-pressed", "true");
					} else {
						row.removeAttribute("data-selected");
						row.setAttribute("aria-pressed", "false");
					}
				}
			};
			/** Re-read the life status so the selected highlight never lies. */
			const refreshMediaListSelection = () => {
				if (ui === null) return;
				const life = hubLifeEngine();
				const status = life !== null ? hubTry(() => life.status?.(), null, "media-list-status") : null;
				let selected = "default";
				if (status !== null && status.media !== null && typeof status.media === "object" && typeof status.media.id === "string") selected = status.media.id;
				syncMediaListSelection(selected);
			};
			/**
			 * v1.6.4: the always-visible look list. The native <select> options were
			 * unreadable (only the current one showed), so every look is a button row
			 * with its file name + kind/size; clicking a row applies that look through
			 * exactly the same path as the Apply button (set it on the <select> first).
			 */
			const renderMediaList = (items, selected) => {
				if (ui === null || ui.mediaList === null || ui.mediaList === undefined) return;
				const list = ui.mediaList;
				list.textContent = "";
				const appendRow = (mediaId, name, meta) => {
					const row = hubCreate("button", {
						type: "button",
						className: "tl-hub-media-row",
						"data-tl-hub-media-row": "",
						"data-media-id": mediaId,
						title: name,
						"aria-label": name,
						"aria-pressed": "false",
					});
					row.appendChild(hubCreate("span", { className: "tl-hub-media-name" }, name));
					row.appendChild(hubCreate("span", { className: "tl-hub-media-meta" }, meta));
					row.disabled = mediaLocked();
					row.addEventListener("click", () => runAsync(() => selectMediaFromList(mediaId)));
					list.appendChild(row);
				};
				appendRow("default", TL_T("hub.media.default"), "");
				for (const item of items) {
					if (item === null || typeof item !== "object" || typeof item.id !== "string" || item.id === "" || item.id === "default") continue;
					const bytes = Number(item.bytes);
					const kind = item.kind === "video" ? "video" : "image";
					const meta = Number.isFinite(bytes) && bytes > 0 ? kind + " · " + Math.round(bytes / 1024) + " KB" : kind;
					appendRow(item.id, String(item.name ?? item.id), meta);
				}
				syncMediaListSelection(selected);
			};
			/** Row click: mirror the choice into the <select>, then run the existing apply path. */
			const selectMediaFromList = async (mediaId) => {
				if (ui === null || mediaLocked() === true) return;
				try {
					ui.mediaSelect.value = mediaId;
				} catch (error) {
					note("role-hub:media-list-select", error);
				}
				await applySelectedMedia();
			};
			const refreshMedia = async () => {
				if (ui === null || mediaBusy === true) return;
				const life = hubLifeEngine();
				if (life === null || typeof life.listMedia !== "function") {
					if (ui !== null) {
						ui.mediaSelect.disabled = true;
						ui.mediaApply.disabled = true;
						ui.mediaUpload.disabled = true;
						ui.mediaDefault.disabled = true;
						if (ui.mediaList !== null && ui.mediaList !== undefined) ui.mediaList.textContent = "";
					}
					setMediaStatus(TL_T("hub.media.unavailable"));
					await loadEffectivePack();
					return;
				}
				mediaBusy = true;
				// No look switch may start while the catalog is being rebuilt.
				ui.mediaApply.disabled = true;
				syncMediaRowDisabled();
				setMediaStatus(TL_T("hub.loading"));
				try {
					let result = null;
					try {
						result = await life.listMedia();
					} catch (error) {
						setLastError("media-list", error);
						result = { items: [], rejected: [], error: String(error?.message ?? error) };
					}
					mediaCache = result;
					if (ui === null) return;
					const items = Array.isArray(result?.items) ? result.items : [];
					const rejected = Array.isArray(result?.rejected) ? result.rejected : [];
					const select = ui.mediaSelect;
					select.textContent = "";
					select.appendChild(hubCreate("option", { value: "default" }, TL_T("hub.media.default")));
					for (const item of items) {
						if (item === null || typeof item !== "object" || typeof item.id !== "string" || item.id === "default") continue;
						const bytes = Number(item.bytes);
						const meta = Number.isFinite(bytes) && bytes > 0 ? " · " + Math.round(bytes / 1024) + " KB" : "";
						const kind = item.kind === "video" ? "video" : "image";
						select.appendChild(hubCreate("option", { value: item.id }, String(item.name ?? item.id) + meta + " · " + kind));
					}
					let selected = "default";
					const status = hubTry(() => life.status?.(), null, "media-status");
					if (status !== null && status.media !== null && typeof status.media === "object" && typeof status.media.id === "string") selected = status.media.id;
					select.value = selected;
					select.disabled = false;
					ui.mediaApply.disabled = false;
					ui.mediaUpload.disabled = typeof fetch !== "function";
					ui.mediaDefault.disabled = selected === "default";
					setMediaStatus(items.length <= 1 ? TL_T("hub.media.empty") : "");
					ui.mediaRejected.textContent =
						rejected.length === 0
							? ""
							: TL_T("hub.media.rejected", { names: rejected.map((item) => String(item?.name ?? item?.id ?? "?")).join(", ") });
					// v1.6.4: keep the always-visible filename list and the pack editor in
					// sync with the just-loaded catalog / effective look.
					renderMediaList(items, selected);
					await loadEffectivePack();
				} catch (error) {
					setLastError("media-render", error);
				} finally {
					mediaBusy = false;
					if (ui !== null) {
						// Re-arm only when no switch is still in flight (upload path can
						// overlap a longer catalog reload).
						ui.mediaApply.disabled = mediaApplying === true;
						syncMediaRowDisabled();
					}
				}
			};
			const applySelectedMedia = async () => {
				disarmPendingConfirms();
				const life = hubLifeEngine();
				// A switch is ignored while the catalog reloads or another switch runs.
				if (ui === null || mediaApplying === true || mediaBusy === true) return;
				if (life === null || typeof life.setMedia !== "function") {
					setMediaStatus(TL_T("hub.media.unavailable"));
					return;
				}
				const target = ui;
				const id = typeof ui.mediaSelect.value === "string" ? ui.mediaSelect.value : "default";
				// v1.6.4: lock the Apply button and every filename row until this one
				// switch settles (double click / row + Apply must not race).
				mediaApplying = true;
				ui.mediaApply.disabled = true;
				syncMediaRowDisabled();
				try {
					const result = await life.setMedia(id === "default" ? null : id);
					if (ui !== target) return;
					if (result !== null && typeof result === "object" && result.ok === true) {
						const media = result.media !== null && typeof result.media === "object" ? result.media : {};
						setMediaStatus(TL_T("hub.media.applied", { name: String(media.name ?? id) }));
						// v1.6.4: the effective look changed -> move the list highlight and
						// load that look's action pack into the editor.
						refreshMediaListSelection();
						await loadEffectivePack();
					} else {
						setMediaStatus(TL_T("hub.media.failed", { reason: hubReasonLabel(result?.reason, HUB_MEDIA_REASON_KEYS) }));
					}
				} catch (error) {
					setLastError("media-apply", error);
					if (ui === target) setMediaStatus(TL_T("hub.media.failed", { reason: String(error?.message ?? error) }));
				} finally {
					mediaApplying = false;
					if (ui === target) {
						ui.mediaApply.disabled = false;
						syncMediaRowDisabled();
					}
				}
				if (ui === target) refreshStatus();
			};
			/** v1.5.0 "restore default look": setMedia(null), then refresh catalog + note. */
			const restoreDefaultMedia = async () => {
				disarmPendingConfirms();
				const life = hubLifeEngine();
				if (ui === null) return;
				if (life === null || typeof life.setMedia !== "function") {
					setMediaStatus(TL_T("hub.media.unavailable"));
					return;
				}
				ui.mediaDefault.disabled = true;
				try {
					const result = await life.setMedia(null);
					if (result !== null && typeof result === "object" && result.ok === false) {
						setMediaStatus(TL_T("hub.media.failed", { reason: hubReasonLabel(result.reason, HUB_MEDIA_REASON_KEYS) }));
					} else {
						await refreshMedia();
						setMediaStatus(TL_T("hub.media.defaultRestored"));
					}
				} catch (error) {
					setLastError("media-default", error);
					setMediaStatus(TL_T("hub.media.failed", { reason: String(error?.message ?? error) }));
				} finally {
					refreshStatus();
				}
			};
			/**
			 * v2.0.1 "restore the author's default appearance": write the appearance keys of
			 * presets/tianlight-default.json (embedded into the client at build time), then
			 * reload once so every fragment re-reads them exactly like a fresh install. Chat,
			 * permissions, weather and uploaded media files are never touched. Two clicks are
			 * required (same destructive-action convention as the other resets).
			 */
			let appearanceResetArmedAt = 0;
			let appearanceResetDisarmTimer = 0;
			const resetDefaultAppearance = () => {
				disarmPendingConfirms();
				const now = Date.now();
				const win = hubBrowserWindow();
				if (now - appearanceResetArmedAt > 5000) {
					appearanceResetArmedAt = now;
					if (ui !== null && ui.appearanceNote !== null) {
						ui.appearanceNote.textContent = TL_T("hub.appearance.confirm");
						ui.appearanceNote.setAttribute("data-tl-armed", "");
					}
					if (win !== null && typeof win.setTimeout === "function") {
						appearanceResetDisarmTimer = win.setTimeout(() => {
							appearanceResetArmedAt = 0;
							if (ui !== null && ui.appearanceNote !== null) {
								ui.appearanceNote.textContent = TL_T("hub.appearance.hint");
								ui.appearanceNote.removeAttribute("data-tl-armed");
							}
						}, 5000);
					}
					return;
				}
				appearanceResetArmedAt = 0;
				if (win !== null && typeof win.clearTimeout === "function" && appearanceResetDisarmTimer !== 0) {
					win.clearTimeout(appearanceResetDisarmTimer);
					appearanceResetDisarmTimer = 0;
				}
				const written = tl5ApplyDefaultAppearance();
				if (ui !== null && ui.appearanceNote !== null) {
					ui.appearanceNote.textContent = TL_T("hub.appearance.done", { n: String(written) });
					ui.appearanceNote.removeAttribute("data-tl-armed");
				}
				if (win !== null && typeof win.setTimeout === "function") {
					win.setTimeout(() => {
						try {
							win.location.reload();
						} catch (error) {
							setLastError("appearance-reload", error);
						}
					}, 700);
				}
			};
			const uploadPetMedia = async (file) => {
				if (typeof fetch !== "function") return { ok: false, status: 0, reason: TL_T("hub.upload.noFetch") };
				const name = typeof file.name === "string" && file.name !== "" ? file.name : "pet-media";
				const headers = {};
				if (typeof file.type === "string" && file.type !== "") headers["Content-Type"] = file.type;
				let response = null;
				try {
					response = await fetch(ASSET_BASE + "/_upload?name=" + encodeURIComponent(name), { method: "POST", headers, body: file });
				} catch (error) {
					return { ok: false, status: 0, reason: String(error?.message ?? error) };
				}
				let payload = null;
				try {
					payload = await response.json();
				} catch {
					payload = null;
				}
				if (response.ok !== true) {
					const reason = payload !== null && typeof payload === "object" && typeof payload.error === "string" ? payload.error : "HTTP " + String(response.status);
					return { ok: false, status: response.status, reason };
				}
				const item = payload !== null && typeof payload === "object" && payload.item !== null && typeof payload.item === "object" ? payload.item : null;
				if (item === null || typeof item.id !== "string" || item.id === "") return { ok: false, status: response.status, reason: "invalid-response" };
				return { ok: true, status: response.status, item };
			};
			const handleUploadPicked = async () => {
				if (ui === null) return;
				const input = ui.uploadInput;
				const files = input.files;
				const file = files !== null && files !== undefined && files.length > 0 ? files[0] : null;
				try {
					input.value = "";
				} catch {
					// some browsers keep the selection; harmless
				}
				if (file === null || file === undefined) return;
				// S4: shared upload pre-flight (same formats/limits as the wallpaper panel).
				const uploadVerdict = tl5ValidateUploadFile(file, HUB_UPLOAD_MAX_BYTES);
				if (uploadVerdict.ok !== true) {
					if (uploadVerdict.code === "too-big") {
						setUploadStatus(TL_T("hub.upload.tooBig", { size: (Number(file.size) / 1024 / 1024).toFixed(1) }));
					} else if (uploadVerdict.code === "type") {
						setUploadStatus(TL_T("hub.upload.type"));
					} else {
						setUploadStatus(TL_T("hub.upload.empty"));
					}
					return;
				}
				ui.mediaUpload.disabled = true;
				setUploadStatus(TL_T("hub.upload.uploading"));
				try {
					const uploaded = await uploadPetMedia(file);
					if (uploaded.ok !== true) {
						setUploadStatus(TL_T("hub.upload.rejected", { status: uploaded.status, reason: uploaded.reason }));
						return;
					}
					await refreshMedia();
					const applied = uploaded.item;
					const life = hubLifeEngine();
					if (life !== null && typeof life.setMedia === "function") {
						try {
							await life.setMedia(applied.id);
						} catch (error) {
							note("role-hub:upload-set-media", error);
						}
						if (ui !== null) {
							try {
								ui.mediaSelect.value = applied.id;
							} catch {
								// selection is cosmetic
							}
						}
					}
					setUploadStatus(TL_T("hub.upload.done", { name: String(applied.name ?? applied.id) }));
					// v1.6.4: reflect the freshly uploaded look and load its action pack.
					refreshMediaListSelection();
					await loadEffectivePack();
					refreshStatus();
				} catch (error) {
					setLastError("upload", error);
					setUploadStatus(TL_T("hub.upload.failed", { reason: String(error?.message ?? error) }));
				} finally {
					if (ui !== null) ui.mediaUpload.disabled = false;
				}
			};

			// ---- action pack editor (v1.6.4, globalThis.tianlightPetActions) -------
			const setPackStatus = (text) => {
				if (ui !== null && ui.packStatus !== null && ui.packStatus !== undefined) ui.packStatus.textContent = text;
			};
			const packControls = () => {
				if (ui === null) return [];
				const nodes = [ui.packSave, ui.packReset];
				for (const actionId of HUB_PACK_ACTIONS) {
					if (ui.packLabels !== null && ui.packLabels !== undefined) nodes.push(ui.packLabels[actionId]);
					if (ui.packLines !== null && ui.packLines !== undefined) nodes.push(ui.packLines[actionId]);
				}
				return nodes.filter((node) => node !== null && node !== undefined);
			};
			const setPackEnabled = (enabled) => {
				for (const node of packControls()) node.disabled = enabled !== true;
			};
			/** The companion-side store, or null when this companion build has no action API. */
			const packApi = () => {
				const actions = hubPetActions();
				if (actions === null) return null;
				const usable = typeof actions.get === "function" && typeof actions.set === "function" && typeof actions.clear === "function";
				return usable === true ? actions : null;
			};
			/** Textarea -> one trimmed non-empty reply per line (the documented pack shape). */
			const splitPackLines = (value) => {
				const result = [];
				for (const line of String(value ?? "").split(/\r?\n/)) {
					const text = line.trim();
					if (text !== "") result.push(text);
				}
				return result;
			};
			/**
			 * The companion keeps built-in labels/lines as i18n keys and resolves them
			 * when the menu renders; the editor must show the same readable text.
			 * Custom (literal) text passes through unchanged.
			 */
			const packDisplayText = (value) => {
				const text = typeof value === "string" ? value : "";
				if (text === "") return "";
				const translated = TL_T(text);
				return translated !== text ? translated : text;
			};
			const fillPackInputs = (pack) => {
				if (ui === null) return;
				for (const actionId of HUB_PACK_ACTIONS) {
					const row = pack !== null && typeof pack === "object" && pack[actionId] !== null && typeof pack[actionId] === "object" ? pack[actionId] : null;
					const label = row !== null && typeof row.label === "string" ? packDisplayText(row.label) : "";
					const lines = row !== null && Array.isArray(row.lines) ? row.lines.filter((line) => typeof line === "string").map(packDisplayText) : [];
					ui.packLabels[actionId].value = label;
					ui.packLines[actionId].value = lines.filter((line) => line !== "").join("\n");
				}
			};
			/** Exact reply-line comparison (for "unchanged vs this look's defaults"). */
			const packLinesEqual = (left, right) => left.length === right.length && left.every((line, index) => line === right[index]);
			/** One action of any effective pack in the same display form the editor shows. */
			const packDisplayRow = (pack, actionId) => {
				const row = pack !== null && typeof pack === "object" && pack[actionId] !== null && typeof pack[actionId] === "object" ? pack[actionId] : null;
				if (row === null) return null;
				const label = typeof row.label === "string" ? packDisplayText(row.label).trim() : "";
				const lines = Array.isArray(row.lines)
					? row.lines
							.filter((line) => typeof line === "string")
							.map((line) => packDisplayText(line).trim())
							.filter((line) => line !== "")
					: [];
				return { label, lines };
			};
			/**
			 * Load the current look's effective pack (get) into the editor. Also gates the
			 * whole editor: an old companion without `tianlightPetActions` shows the
			 * unavailable note and disables every input/button.
			 */
			const loadEffectivePack = async () => {
				const target = ui;
				if (target === null) return;
				loadedPack = null;
				const actions = packApi();
				setPackEnabled(actions !== null);
				if (actions === null) {
					fillPackInputs(null);
					setPackStatus(TL_T("hub.media.pack.unavailable"));
					return;
				}
				let pack = null;
				try {
					pack = await actions.get(currentMediaId());
				} catch (error) {
					note("role-hub:pack-get", error);
					pack = null;
				}
				// The hub may have been closed (or closed and reopened) while get resolved.
				if (ui !== target) return;
				loadedPack = pack !== null && typeof pack === "object" ? pack : null;
				fillPackInputs(loadedPack);
				setPackStatus("");
			};
			/** Save the editor into the current look's pack; the pet menu reads it next open. */
			const savePack = async () => {
				disarmPendingConfirms();
				const target = ui;
				if (target === null) return;
				const actions = packApi();
				if (actions === null) {
					setPackEnabled(false);
					setPackStatus(TL_T("hub.media.pack.unavailable"));
					return;
				}
				const mediaId = currentMediaId();
				// Read + validate the three editors first. The companion clips oversized
				// input silently; an explicit invalid note is honest and keeps the UI value.
				const edited = {};
				for (const actionId of HUB_PACK_ACTIONS) {
					const label = String(target.packLabels[actionId].value ?? "").trim();
					const lines = splitPackLines(target.packLines[actionId].value);
					if (lines.length > HUB_PACK_LINES_MAX || lines.some((line) => Array.from(line).length > HUB_PACK_LINE_MAX)) {
						setPackStatus(TL_T("hub.media.pack.invalid"));
						return;
					}
					edited[actionId] = { label, lines };
				}
				// H1: submit ONLY actions that really differ from this look's localized
				// defaults; untouched rows stay out of the payload so they keep following
				// the default text across language switches. The companion keeps customs
				// for omitted actions, so a row being reset (cleared, or edited back to
				// the default text) is sent empty to let the companion drop that override.
				const defaults = hubTry(() => (typeof actions.defaults === "function" ? actions.defaults() : null), null, "pack-defaults");
				const changed = {};
				let changedCount = 0;
				for (const actionId of HUB_PACK_ACTIONS) {
					const value = edited[actionId];
					const defaultsDisplay = packDisplayRow(defaults, actionId);
					const currentDisplay = packDisplayRow(loadedPack, actionId);
					const hadCustom =
						defaultsDisplay !== null &&
						currentDisplay !== null &&
						(currentDisplay.label !== defaultsDisplay.label || packLinesEqual(currentDisplay.lines, defaultsDisplay.lines) === false);
					const empty = value.label === "" && value.lines.length === 0;
					const sameAsDefault =
						empty === false && defaultsDisplay !== null && value.label === defaultsDisplay.label && packLinesEqual(value.lines, defaultsDisplay.lines);
					if (empty === true || sameAsDefault === true) {
						// Untouched / reset row: omitted unless a stale override must be removed.
						if (hadCustom === true) {
							changed[actionId] = { label: "", lines: [] };
							changedCount += 1;
						}
						continue;
					}
					changed[actionId] = value;
					changedCount += 1;
				}
				let result = null;
				try {
					if (changedCount === 0) {
						// Nothing differs from the defaults: drop any frozen custom pack.
						result = await actions.clear(mediaId);
					} else {
						result = await actions.set(mediaId, changed);
					}
				} catch (error) {
					note(changedCount === 0 ? "role-hub:pack-clear-default" : "role-hub:pack-set", error);
					if (ui === target) setPackStatus(TL_T("hub.media.pack.invalid"));
					return;
				}
				if (ui !== target) return;
				if (result !== null && typeof result === "object" && result.ok === false) {
					setPackStatus(TL_T("hub.media.pack.invalid"));
					return;
				}
				// Success: reload what the companion actually stored, then confirm.
				await loadEffectivePack();
				if (ui !== target) return;
				setPackStatus(TL_T("hub.media.pack.saved"));
			};
			/** Drop the custom pack for the current look, reload, then confirm. */
			const resetPack = async () => {
				const target = ui;
				if (target === null) return;
				const actions = packApi();
				if (actions === null) {
					setPackEnabled(false);
					setPackStatus(TL_T("hub.media.pack.unavailable"));
					return;
				}
				let result = null;
				try {
					result = await actions.clear(currentMediaId());
				} catch (error) {
					note("role-hub:pack-clear", error);
					if (ui === target) setPackStatus(TL_T("hub.media.pack.invalid"));
					return;
				}
				if (ui !== target) return;
				if (result !== null && typeof result === "object" && result.ok === false) {
					setPackStatus(TL_T("hub.media.pack.invalid"));
					return;
				}
				await loadEffectivePack();
				if (ui !== target) return;
				setPackStatus(TL_T("hub.media.pack.resetDone"));
			};

			// ---- weather card (v1.5.0, globalThis.tianlightWeather) -----------------
			const setWeatherNote = (text) => {
				if (ui !== null && ui.weatherNote !== null && ui.weatherNote !== undefined) ui.weatherNote.textContent = text;
			};
			/**
			 * Render the weather snapshot with the v1.5 precedence:
			 * disabled -> unmounted (!runtime) -> no location -> error -> ready -> waiting.
			 * `text` is already localized by the engine, so prefer it and only append the
			 * raw error code for diagnostics.
			 */
			const refreshWeather = () => {
				if (ui === null) return;
				const weather = hubWeather();
				const snapshot = hubWeatherSnapshot(weather);
				let state = "unavailable";
				let statusText = TL_T("hub.weather.unavailable");
				if (weather !== null) {
					if (snapshot === null) {
						state = "error";
						statusText = TL_T("hub.weather.error", { reason: TL_T("hub.weather.reason.default") });
					} else if (snapshot.enabled !== true) {
						state = "disabled";
						statusText = snapshot.text !== "" ? snapshot.text : TL_T("hub.weather.disabled");
					} else if (snapshot.runtime !== true) {
						// The module is exposed early but its context runtime is not mounted yet.
						state = "unavailable";
						statusText = snapshot.text !== "" ? snapshot.text : TL_T("hub.weather.unavailable");
					} else if (snapshot.hasLocation !== true) {
						state = "noLocation";
						statusText = snapshot.text !== "" ? snapshot.text : TL_T("hub.weather.noLocation");
					} else if (snapshot.error !== "") {
						state = "error";
						const reason = hubReasonLabel(snapshot.error, HUB_WEATHER_REASON_KEYS, "hub.weather.reason.default");
						statusText = snapshot.text !== "" ? snapshot.text : TL_T("hub.weather.error", { reason });
						statusText += " (" + snapshot.error + ")";
					} else if (snapshot.last !== null) {
						state = "normal";
						const at = snapshot.updatedAt !== null ? snapshot.updatedAt : snapshot.last !== null && Number.isFinite(snapshot.last.at) ? snapshot.last.at : 0;
						const base = snapshot.text !== "" ? snapshot.text : TL_T("hub.weather.state.normal");
						statusText = at > 0 ? base + " · " + TL_T("hub.weather.updated", { time: hubDateTime(at) }) : base;
					} else {
						state = "waiting";
						statusText = snapshot.text !== "" ? snapshot.text : TL_T("hub.weather.waiting");
					}
				}
				ui.weatherStatus.textContent = statusText;
				ui.weatherStatus.setAttribute("data-tl-hub-weather-state", state);
				ui.weatherStatus.setAttribute("data-tl-weather-state", TL_T(HUB_WEATHER_STATE_KEYS[state] ?? "hub.weather.state.unavailable"));
				const interactive = weather !== null && weatherBusy !== true;
				ui.weatherEnabled.disabled = interactive !== true;
				ui.weatherEnabled.checked = snapshot !== null && snapshot.enabled === true;
				for (const node of [ui.weatherCity, ui.weatherResolve, ui.weatherLat, ui.weatherLon, ui.weatherCoords, ui.weatherLocate, ui.weatherRefresh]) {
					if (node !== null && node !== undefined) node.disabled = interactive !== true;
				}
			};
			/** Shared busy/feedback wrapper for every weather action. */
			const runWeatherAction = async (busyKey, task) => {
				const weather = hubWeather();
				if (weather === null) {
					setWeatherNote(TL_T("hub.weather.unavailable"));
					return;
				}
				weatherBusy = true;
				if (busyKey !== "") setWeatherNote(TL_T(busyKey));
				refreshWeather();
				try {
					await task(weather);
				} catch (error) {
					setLastError("weather", error);
					setWeatherNote(TL_T("hub.weather.failed", { reason: String(error?.message ?? error) }));
				} finally {
					weatherBusy = false;
					refreshWeather();
				}
			};
			const onWeatherEnabled = () => {
				const enabled = ui !== null && ui.weatherEnabled.checked === true;
				runAsync(() =>
					runWeatherAction("", async (weather) => {
						if (typeof weather.apply !== "function") {
							setWeatherNote(TL_T("hub.weather.failed", { reason: TL_T("hub.weather.reason.default") }));
							return;
						}
						weather.apply({ enabled });
						setWeatherNote(enabled ? TL_T("hub.weather.enabledOn") : TL_T("hub.weather.enabledOff"));
					}),
				);
			};
			const onWeatherResolve = () => {
				runAsync(() =>
					runWeatherAction("hub.weather.resolving", async (weather) => {
						if (ui === null) return;
						const city = String(ui.weatherCity.value ?? "").trim();
						if (city === "") {
							setWeatherNote(TL_T("hub.weather.invalidCity"));
							return;
						}
						if (typeof weather.resolveCity !== "function") {
							setWeatherNote(TL_T("hub.weather.failed", { reason: TL_T("hub.weather.reason.default") }));
							return;
						}
						const result = await weather.resolveCity(city);
						if (result !== null && typeof result === "object" && result.ok === true) {
							const name = typeof result.name === "string" && result.name !== "" ? result.name : city;
							setWeatherNote(TL_T("hub.weather.cityResolved", { name }));
						} else {
							const reason =
								result !== null && typeof result === "object" && typeof result.error === "string" && result.error !== ""
									? result.error
									: TL_T("hub.weather.reason.default");
							setWeatherNote(TL_T("hub.weather.resolveFailed", { reason }));
						}
					}),
				);
			};
			const onWeatherCoords = () => {
				runAsync(() =>
					runWeatherAction("", async (weather) => {
						if (ui === null) return;
						const lat = Number(ui.weatherLat.value);
						const lon = Number(ui.weatherLon.value);
						if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
							setWeatherNote(TL_T("hub.weather.invalidCoords"));
							return;
						}
						if (typeof weather.setManualLocation !== "function") {
							setWeatherNote(TL_T("hub.weather.failed", { reason: TL_T("hub.weather.reason.default") }));
							return;
						}
						const result = weather.setManualLocation(lat, lon);
						if (result !== null && typeof result === "object" && result.ok === false) {
							const reason = typeof result.error === "string" && result.error !== "" ? result.error : TL_T("hub.weather.reason.default");
							setWeatherNote(TL_T("hub.weather.failed", { reason }));
						} else {
							setWeatherNote(TL_T("hub.weather.applied"));
						}
					}),
				);
			};
			const onWeatherLocate = () => {
				runAsync(() =>
					runWeatherAction("hub.weather.locating", async (weather) => {
						if (typeof weather.useCurrentLocation !== "function") {
							setWeatherNote(TL_T("hub.weather.failed", { reason: TL_T("hub.weather.reason.default") }));
							return;
						}
						const result = await weather.useCurrentLocation();
						if (result !== null && typeof result === "object" && result.ok === false) {
							const reason = typeof result.error === "string" && result.error !== "" ? result.error : TL_T("hub.weather.reason.default");
							setWeatherNote(TL_T("hub.weather.failed", { reason }));
						} else {
							setWeatherNote(TL_T("hub.weather.applied"));
						}
					}),
				);
			};
			const onWeatherRefresh = () => {
				runAsync(() =>
					runWeatherAction("hub.loading", async (weather) => {
						if (typeof weather.refresh !== "function") {
							setWeatherNote(TL_T("hub.weather.failed", { reason: TL_T("hub.weather.reason.default") }));
							return;
						}
						const fresh = await weather.refresh();
						setWeatherNote(fresh === true ? TL_T("hub.weather.refreshed") : TL_T("hub.weather.waiting"));
					}),
				);
			};

			// ---- AI card ------------------------------------------------------------
			const setAiNote = (text) => {
				if (ui !== null) ui.aiNote.textContent = text;
			};
			/**
			 * plan A: fold `status.llm` into the adapter line. Priority (Lead-approved):
			 * (a) the host probe ran and reports itself unavailable -> explain WHY via
			 * `hub.ai.host.<reason>` (this is what makes the "restart DSH -> unconfigured
			 * model" case visible even though session-only `llm` grants reset on reload);
			 * (b) the built-in host adapter is live -> provider / model; (c) a user adapter
			 * is registered -> its id; (d) otherwise the local-only fallback. Old brains
			 * without `routing` keep the pre-plan-A line, so the hub never regresses on a
			 * stripped harness.
			 */
			const hubAdapterLine = (status) => {
				const pet = hubPetBrain();
				const available = pet !== null;
				if (available !== true) return { text: TL_T("hub.ai.unavailable"), state: "unavailable" };
				const llm =
					status !== null && typeof status === "object" && status.llm !== null && typeof status.llm === "object" ? status.llm : null;
				const routing = llm !== null && typeof llm.routing === "string" ? llm.routing : "";
				const host = llm !== null && llm.host !== null && typeof llm.host === "object" ? llm.host : null;
				const hostProvider = host !== null && typeof host.provider === "string" && host.provider !== "" ? host.provider : "";
				const hostModel = host !== null && typeof host.model === "string" && host.model !== "" ? host.model : "";
				// v2.2.0: the user's explicit provider/model selection is what the next call
				// actually uses; fall back to the host default when either is unset.
				const selectedProvider = llm !== null && typeof llm.provider === "string" && llm.provider !== "" ? llm.provider : "";
				const selectedModel = llm !== null && typeof llm.model === "string" && llm.model !== "" ? llm.model : "";
				// v2.2.0: a provider override without a model lets the host pick that
				// provider's first catalogue entry, not the DSH default model of another
				// provider. The adapter line must not claim otherwise.
				const providerDiffers = selectedProvider !== "" && selectedProvider !== hostProvider;
				const adapterModel = selectedModel !== "" ? selectedModel : providerDiffers ? TL_T("hub.ai.llm.firstModel") : hostModel;
				const adapterId = hubAdapterId(status);
				// (a) the host answered the probe and cannot serve a model: name the reason.
				if (host !== null && host.checked === true && host.available !== true) {
					const reason = typeof host.reason === "string" ? host.reason : "";
					const known = Object.prototype.hasOwnProperty.call(HUB_AI_HOST_REASON_KEYS, reason);
					return { text: TL_T(known ? HUB_AI_HOST_REASON_KEYS[reason] : "hub.ai.host.unknown"), state: "host" };
				}
				// (b) the built-in "dsh" adapter is live (the model follows the DSH default).
				if (routing === "dsh") {
					return {
						text: TL_T("hub.ai.adapterDsh", {
							provider: (selectedProvider || hostProvider) === "" ? TL_T("hub.ai.llm.unknown") : selectedProvider || hostProvider,
							model: adapterModel === "" ? TL_T("hub.ai.llm.unknown") : adapterModel,
						}),
						state: "dsh",
					};
				}
				// (c) a user-registered adapter (routing === "adapter" on the new brain; the
				// adapter id alone on an older/partial status shape).
				if (adapterId !== null) return { text: TL_T("hub.ai.adapter", { adapter: adapterId }), state: "adapter" };
				// (d) no adapter at all: the companion is on the local brain.
				return { text: TL_T("hub.ai.adapterNone"), state: "none" };
			};
			/**
			 * plan A provider picker. Option 0 is always the DSH default (the model itself
			 * follows the DSH default selection); the remaining options come from
			 * remote.llm.listProviders() and carry `{id,name}`. Options are rebuilt only
			 * when their content changes (the hub polls status every 4s).
			 */
			const renderProviderSelect = (status) => {
				if (ui === null || ui.llmProvider === null || ui.llmProvider === undefined) return;
				const select = ui.llmProvider;
				const pet = hubPetBrain();
				const canSet = pet !== null && typeof pet.setLlmProvider === "function";
				const cache = hubLlmProvidersCache;
				const providers = cache !== null && cache.ok === true ? cache.providers : [];
				const llm = status !== null && typeof status === "object" && status.llm !== null && typeof status.llm === "object" ? status.llm : null;
				const host = llm !== null && llm.host !== null && typeof llm.host === "object" ? llm.host : null;
				const hostProvider = host !== null && typeof host.provider === "string" && host.provider !== "" ? host.provider : TL_T("hub.ai.llm.unknown");
				const hostModel = host !== null && typeof host.model === "string" && host.model !== "" ? host.model : TL_T("hub.ai.llm.unknown");
				const followLabel = TL_T("hub.ai.llm.followDefault") + " (" + hostProvider + " / " + hostModel + ")";
				const selected = llm !== null && typeof llm.provider === "string" ? llm.provider : "";
				const signature = followLabel + "|" + providers.map((provider) => provider.id).join(",") + "|" + (canSet ? "1" : "0");
				if (signature !== hubLlmProviderSignature) {
					hubLlmProviderSignature = signature;
					select.textContent = "";
					select.appendChild(hubCreate("option", { value: "" }, followLabel));
					for (const provider of providers) select.appendChild(hubCreate("option", { value: provider.id }, provider.name));
				}
				// A stored provider that is missing from a failed/empty list cannot be
				// rendered as an option; the picker honestly shows "follow default" while
				// the brain keeps the saved choice (a later successful read restores it).
				const known = providers.some((provider) => provider.id === selected);
				select.value = selected !== "" && known ? selected : "";
				select.disabled = canSet === false;
				select.setAttribute("data-tl-hub-llm-provider-count", String(providers.length));
				select.setAttribute(
					"data-tl-hub-llm-provider-state",
					cache === null ? "loading" : cache.ok === true ? (providers.length === 0 ? "empty" : "listed") : "unavailable",
				);
			};
			/**
			 * v2.2.0 model picker. The provider decides which catalogue to read; a model
			 * without a provider choice means "that model of the DSH default provider".
			 * The option label is the model's display name, falling back to its id.
			 */
			const renderModelSelect = (status) => {
				if (ui === null || ui.llmModel === null || ui.llmModel === undefined) return;
				const select = ui.llmModel;
				const pet = hubPetBrain();
				const canSet = pet !== null && typeof pet.setLlmModel === "function";
				const llm = status !== null && typeof status === "object" && status.llm !== null && typeof status.llm === "object" ? status.llm : null;
				const host = llm !== null && llm.host !== null && typeof llm.host === "object" ? llm.host : null;
				const selectedProvider = llm !== null && typeof llm.provider === "string" ? llm.provider : "";
				const hostProvider = host !== null && typeof host.provider === "string" ? host.provider : "";
				const effectiveProvider = selectedProvider !== "" ? selectedProvider : hostProvider;
				const hostModel = host !== null && typeof host.model === "string" && host.model !== "" ? host.model : TL_T("hub.ai.llm.unknown");
				const cache = hubLlmModelsCache;
				const models = cache !== null && cache.ok === true && cache.provider === effectiveProvider ? cache.models : [];
				const selected = llm !== null && typeof llm.model === "string" ? llm.model : "";
				const canChoose = canSet === true && models.length > 0;
				const known = models.some((model) => model.id === selected);
				const missing = selected !== "" && known === false;
				const providerDiffers = selectedProvider !== "" && selectedProvider !== hostProvider;
				const followLabel =
					providerDiffers && selected === ""
						? TL_T("hub.ai.llm.followProviderModel")
						: TL_T("hub.ai.llm.followModel", { model: hostModel });
				const signature =
					effectiveProvider +
					"|" +
					followLabel +
					"|" +
					models.map((model) => model.id).join(",") +
					"|" +
					(canChoose ? "1" : "0") +
					"|" +
					selected +
					"|" +
					(missing ? "1" : "0");
				if (signature !== hubLlmModelSignature) {
					hubLlmModelSignature = signature;
					select.textContent = "";
					select.appendChild(hubCreate("option", { value: "" }, followLabel));
					for (const model of models) select.appendChild(hubCreate("option", { value: model.id }, model.name));
					// v2.2.0: a saved model that the current catalogue no longer lists must be
					// visible, not silently rendered as "follow the default" while still being
					// sent. It stays selectable so the user can explicitly switch to follow.
					if (missing) {
						select.appendChild(
							hubCreate("option", { value: selected }, TL_T("hub.ai.llm.savedUnavailable", { model: selected })),
						);
					}
				}
				select.value = selected !== "" && (known || missing) ? selected : "";
				// With a saved-but-missing model the select stays usable: "follow default"
				// is the user's way out without switching providers or reloading.
				select.disabled = canChoose === false && selected === "";
				select.setAttribute("data-tl-hub-llm-model-count", String(models.length));
				select.setAttribute(
					"data-tl-hub-llm-model-state",
					canSet === false
						? "unavailable"
						: hubLlmModelsBusy === true
							? "loading"
							: cache === null || cache.provider !== effectiveProvider
								? "idle"
								: cache.ok === true
									? models.length === 0
										? "empty"
										: "listed"
									: "unavailable",
				);
			};
			/** One debounced catalogue read per provider; cache survives status polls. */
			const ensureLlmModels = (status) => {
				if (hubLlmModelsBusy === true) return;
				const pet = hubPetBrain();
				if (pet === null || typeof pet.listModels !== "function") return;
				const llm = status !== null && typeof status === "object" && status.llm !== null && typeof status.llm === "object" ? status.llm : null;
				const host = llm !== null && llm.host !== null && typeof llm.host === "object" ? llm.host : null;
				const selectedProvider = llm !== null && typeof llm.provider === "string" ? llm.provider : "";
				const provider = selectedProvider !== "" ? selectedProvider : host !== null && typeof host.provider === "string" ? host.provider : "";
				if (provider === "") return;
				if (hubLlmModelsCache !== null && hubLlmModelsCache.provider === provider) {
					// A successful catalogue stays cached for the page session; a failed one
					// retries after a short backoff instead of disabling the picker forever.
					if (hubLlmModelsCache.ok === true || Date.now() < hubLlmModelsCache.until) return;
				}
				hubLlmModelsBusy = true;
				runAsync(async () => {
					let result = null;
					try {
						result = await pet.listModels(provider);
					} catch (error) {
						note("role-hub:llm-models", error);
						result = null;
					}
					hubLlmModelsBusy = false;
					hubLlmModelsCache =
						result !== null && result !== undefined && result.ok === true
							? { provider, ok: true, models: Array.isArray(result.models) ? result.models : [], reason: "", until: 0 }
							: {
									provider,
									ok: false,
									models: [],
									reason: result !== null && result !== undefined && typeof result.code === "string" ? result.code : "unavailable",
									until: Date.now() + 5000,
								};
					refreshAi();
				});
			};
			/** Persist the chosen model through the brain's same-closure bridge. */
			const onModelChange = async (event) => {
				if (isSyntheticUserEvent(event)) return;
				disarmPendingConfirms();
				const pet = hubPetBrain();
				if (pet === null || typeof pet.setLlmModel !== "function") {
					setAiNote(TL_T("hub.ai.llm.modelFailed"));
					return;
				}
				const value =
					ui !== null && ui.llmModel !== null && ui.llmModel !== undefined && typeof ui.llmModel.value === "string"
						? ui.llmModel.value
						: "";
				let result = null;
				try {
					result = await pet.setLlmModel(value === "" ? null : value);
				} catch (error) {
					note("role-hub:llm-model", error);
					result = null;
				}
				setAiNote(result !== null && result !== undefined && result.ok === false ? TL_T("hub.ai.llm.modelFailed") : TL_T("hub.ai.llm.modelSaved"));
				refreshAi();
			};
			/** One model-fallback hint line, shared by the AI note (44 localizes the copy). */
			const setLlmHintNote = (code) => {
				const hint = hubLlmHintText(code);
				if (hint !== "") setAiNote(hint);
			};
			/** Re-read the host model capability (44 owns the probe); no-op without 44. */
			const refreshHostLlmStatus = () => {
				const pet = hubPetBrain();
				if (pet === null || typeof pet.refreshHostLlm !== "function") return;
				runAsync(async () => {
					await hubTry(async () => pet.refreshHostLlm(), null, "llm-host-refresh");
					refreshAi();
				});
			};
			/** One debounced provider-list read per hub install (single flight, cached). */
			const ensureLlmProviders = () => {
				if (hubLlmProvidersBusy === true || hubLlmProvidersCache !== null) return;
				hubLlmProvidersBusy = true;
				runAsync(async () => {
					try {
						hubLlmProvidersCache = await hubListProviders();
					} finally {
						hubLlmProvidersBusy = false;
					}
					refreshAi();
				});
			};
			/** Persist the chosen provider through the brain's same-closure bridge. */
			const onProviderChange = async (event) => {
				// R8 (REV-R4A F2): a script-dispatched change is not a user preference.
				if (isSyntheticUserEvent(event)) return;
				disarmPendingConfirms();
				const pet = hubPetBrain();
				if (pet === null || typeof pet.setLlmProvider !== "function") {
					setAiNote(TL_T("hub.ai.llm.providerFailed"));
					return;
				}
				const value =
					ui !== null && ui.llmProvider !== null && ui.llmProvider !== undefined && typeof ui.llmProvider.value === "string"
						? ui.llmProvider.value
						: "";
				let result = null;
				try {
					result = await pet.setLlmProvider(value === "" ? null : value);
				} catch (error) {
					note("role-hub:llm-provider", error);
					result = null;
				}
				// v2.2.0: a model id belongs to one provider; switching providers clears the
				// old selection (otherwise the host would resolve a model the new route does
				// not serve). The model picker immediately loads the new catalogue.
				if (typeof pet.setLlmModel === "function") {
					try {
						await pet.setLlmModel(null);
					} catch (error) {
						note("role-hub:llm-model-clear", error);
					}
				}
				hubLlmModelsCache = null;
				hubLlmModelSignature = "";
				setAiNote(result !== null && result !== undefined && result.ok === false ? TL_T("hub.ai.llm.providerFailed") : TL_T("hub.ai.llm.providerSaved"));
				refreshAi();
			};
			const appendLog = (entry) => {
				logEntries.push(entry);
				while (logEntries.length > HUB_LOG_MAX) logEntries.shift();
				renderLog();
			};
			const renderLog = () => {
				if (ui === null) return;
				const box = ui.logBox;
				box.textContent = "";
				if (logEntries.length === 0) {
					box.appendChild(hubCreate("p", { className: "tl-hub-note tl-hub-hint" }, TL_T("hub.ai.logEmpty")));
					return;
				}
				for (const entry of logEntries) {
					let text = "";
					let role = "pet";
					let source = "local";
					if (entry.role === "user") {
						role = "user";
						source = "user";
						text = TL_T("hub.ai.you") + ": " + String(entry.text ?? "");
					} else if (entry.ok === true) {
						source = entry.source === "llm" ? "llm" : entry.source === "agent" ? "agent" : "local";
						const sourceKey = source === "llm" ? "hub.ai.source.llm" : source === "agent" ? "hub.agent.source" : "hub.ai.source.local";
						text = TL_T("hub.ai.pet") + " · " + TL_T(sourceKey) + ": " + String(entry.text ?? "");
					} else {
						role = "denied";
						source = "denied";
						text = TL_T("hub.ai.pet") + " · " + TL_T("hub.ai.source.denied") + ": " + hubReasonLabel(entry.reason, HUB_AI_REASON_KEYS, "hub.ai.reason.default");
					}
					box.appendChild(hubCreate("p", { className: "tl-hub-log-row", "data-tl-hub-log-row": role, "data-role": role, "data-source": source }, text));
				}
			};
			/**
			 * Two-step consent for the LLM capability: the first click only arms the
			 * confirmation (button turns into "click again to confirm"), the second click
			 * grants with the explicit consent token the brain requires. No native dialog,
			 * so the flow is identical in the desktop webview and in tests.
			 */
			const confirmLlmGrant = () => {
				if (llmPending === true) {
					llmPending = false;
					return true;
				}
				llmPending = true;
				setAiNote(TL_T("hub.ai.llm.confirm"));
				return false;
			};
			const setPermStatus = (text) => {
				if (ui !== null && ui.permStatus !== null && ui.permStatus !== undefined) ui.permStatus.textContent = text;
			};
			/**
			 * v1.4.0 permission board: safe rows toggle directly, medium/high rows arm on
			 * the first click and only grant with the explicit consent token on the second
			 * click; `agent` (driving DSH) stays permanently denied and read-only.
			 */
			const refreshPermissions = (rows) => {
				if (ui === null) return;
				const box = ui.permRows;
				box.textContent = "";
				let hasHigh = false;
				if (!Array.isArray(rows) || rows.length === 0) {
					box.appendChild(hubCreate("p", { className: "tl-hub-note tl-hub-hint", "data-tl-hub-perm-empty": "" }, TL_T("hub.perm.unavailable")));
					if (ui.permHighWarning !== null && ui.permHighWarning !== undefined) ui.permHighWarning.hidden = true;
					return;
				}
				const seen = new Set();
				for (const row of rows) {
					if (row === null || typeof row !== "object" || typeof row.id !== "string" || seen.has(row.id)) continue;
					seen.add(row.id);
					const risk = row.risk === "forbidden" ? "forbidden" : row.risk === "high" ? "high" : row.risk === "medium" ? "medium" : "safe";
					if (risk === "high") hasHigh = true;
					const line = hubCreate("div", { className: "tl-hub-perm-row", "data-tl-hub-perm-row": row.id, "data-risk": risk });
					line.appendChild(hubCreate("span", { className: "tl-hub-perm-name" }, TL_T(HUB_CAP_KEYS[row.id] ?? "hub.perm.unknown")));
					line.appendChild(hubCreate("span", { className: "tl-hub-perm-risk", "data-risk": risk }, TL_T(HUB_RISK_KEYS[risk])));
					if (risk === "forbidden") {
						// v1.4.0: driving DSH is the only permanently denied capability.
						const denied = row.id === "agent" ? TL_T("hub.perm.agentForbidden") : TL_T("hub.perm.risk.forbidden");
						line.appendChild(hubCreate("span", { className: "tl-hub-perm-state", "data-tl-hub-perm-state": "forbidden" }, denied));
						box.appendChild(line);
						continue;
					}
					const granted = row.granted === true;
					if (granted === true) permConfirmPending.delete(row.id);
					// R4A: adapter-based capabilities must not read as a plain "granted".
					// LLM and the six high-risk caps only do something when the user
					// registers an adapter (and the skin itself never invokes one), so the
					// row says "no adapter (not enabled)" / "manual call only" instead.
					const adapterBased = row.adapter !== undefined;
					const hasAdapter = row.adapter === true;
					let stateText = granted ? TL_T("hub.perm.granted") : TL_T("hub.perm.notGranted");
					let stateKind = granted ? "granted" : "not-granted";
					if (granted === true && adapterBased === true) {
						if (hasAdapter === true) {
							stateText = risk === "high" ? TL_T("hub.perm.stateManual") : TL_T("hub.perm.granted");
							stateKind = "granted-adapter";
						} else {
							stateText = TL_T("hub.perm.stateNoAdapter");
							stateKind = "granted-no-adapter";
						}
					}
					line.appendChild(hubCreate("span", { className: "tl-hub-perm-state", "data-tl-hub-perm-state": stateKind }, stateText));
					const grantable = row.grantable !== false;
					const pending = permConfirmPending.get(row.id) === true;
					if (granted === true) {
						const button = hubCreate("button", { type: "button", className: "tl-hub-btn tl-hub-perm-btn", "data-tl-hub-perm-revoke": row.id }, TL_T("hub.perm.revoke"));
						if (grantable) button.addEventListener("click", () => runAsync(() => revokePermission(row.id)));
						else button.disabled = true;
						line.appendChild(button);
					} else if (grantable) {
						const label = pending === true ? TL_T("hub.perm.confirmHigh") : risk === "safe" ? TL_T("hub.perm.grant") : TL_T("hub.perm.grantHigh");
						const button = hubCreate("button", { type: "button", className: "tl-hub-btn tl-hub-perm-btn", "data-tl-hub-perm-grant": row.id }, label);
						button.addEventListener("click", (event) => {
							if (isSyntheticUserEvent(event)) return;
							runAsync(() => requestPermissionGrant(row.id, risk, event));
						});
						line.appendChild(button);
						if (pending === true && (risk === "medium" || risk === "high")) {
							line.appendChild(
								hubCreate(
									"span",
									{ className: "tl-hub-perm-note", "data-tl-hub-perm-note": row.id },
									risk === "high" ? TL_T("hub.perm.highWarning") : TL_T("hub.perm.mediumNote"),
								),
							);
						}
					}
					box.appendChild(line);
				}
				if (ui.permHighWarning !== null && ui.permHighWarning !== undefined) ui.permHighWarning.hidden = hasHigh !== true;
			};
			const requestPermissionGrant = async (id, risk, event) => {
				if (isSyntheticUserEvent(event)) return;
				const pet = hubPetBrain();
				if (pet === null || typeof pet.grant !== "function") return;
				if (risk !== "safe" && permConfirmPending.get(id) !== true) {
					// First click only arms the confirmation; nothing is granted yet.
					permConfirmPending.set(id, true);
					setPermStatus(risk === "high" ? TL_T("hub.perm.highWarning") : TL_T("hub.perm.mediumNote"));
					refreshAi();
					return;
				}
				permConfirmPending.delete(id);
				// R4A: the brain only accepts a one-shot consent ticket minted in its own
				// closure (a fixed string was replayable by any page script before).
				let options;
				if (risk === "safe") {
					options = undefined;
				} else {
					const ticket = typeof pet.requestConsent === "function" ? pet.requestConsent(id) : null;
					if (ticket === null) {
						setPermStatus(TL_T("hub.perm.grantFailed", { reason: TL_T("hub.agent.reason.consent") }));
						refreshAi();
						return;
					}
					options = { consent: ticket };
				}
				let result = null;
				try {
					result = await pet.grant(id, options);
				} catch (error) {
					setLastError("perm-grant", error);
					setPermStatus(TL_T("hub.perm.grantFailed", { reason: String(error?.message ?? error) }));
					refreshAi();
					return;
				}
				if (result !== null && typeof result === "object" && result.ok === false) {
					setPermStatus(
						TL_T("hub.perm.grantFailed", { reason: hubReasonLabel(result.reason, HUB_AGENT_GRANT_REASON_KEYS, "hub.agent.reason.default") }),
					);
				} else {
					setPermStatus(TL_T("hub.perm.grantedNote"));
				}
				refreshAi();
			};
			const revokePermission = async (id) => {
				const pet = hubPetBrain();
				if (pet === null || typeof pet.revoke !== "function") return;
				permConfirmPending.delete(id);
				let result = null;
				try {
					result = await pet.revoke(id);
				} catch (error) {
					setLastError("perm-revoke", error);
					setPermStatus(TL_T("hub.perm.revokeFailed", { reason: String(error?.message ?? error) }));
					refreshAi();
					return;
				}
				if (result !== null && typeof result === "object" && result.ok === false) {
					setPermStatus(
						TL_T("hub.perm.revokeFailed", { reason: hubReasonLabel(result.reason, HUB_AGENT_GRANT_REASON_KEYS, "hub.agent.reason.default") }),
					);
				} else {
					setPermStatus(TL_T("hub.perm.revoked"));
				}
				refreshAi();
			};
			const onLlmClick = async (event) => {
				// R8 (REV-R4A F2): a script-dispatched click must not grant LLM/consent.
				if (isSyntheticUserEvent(event)) return;
				disarmPendingConfirms();
				const pet = hubPetBrain();
				if (pet === null) return;
				const rows = await hubTry(async () => pet.permissions?.(), null, "perm-rows");
				const llmRow = Array.isArray(rows) ? rows.find((row) => row !== null && typeof row === "object" && row.id === "llm") : null;
				if (llmRow !== null && llmRow.granted === true) {
					await hubTry(async () => pet.revoke?.("llm"), null, "llm-revoke");
					setAiNote(TL_T("hub.ai.llm.revoked"));
					refreshAi();
					return;
				}
				if (llmRow !== null && llmRow.grantable === false) return;
				if (confirmLlmGrant() !== true) {
					refreshAi();
					return;
				}
				// R4A: same-closure one-shot consent ticket instead of a fixed string.
				const llmTicket = typeof pet.requestConsent === "function" ? pet.requestConsent("llm") : null;
				if (llmTicket === null) {
					llmPending = false;
					setAiNote(TL_T("hub.agent.reason.consent"));
					refreshAi();
					return;
				}
				const result = await hubTry(async () => pet.grant?.("llm", { consent: llmTicket }), null, "llm-grant");
				llmPending = false;
				setAiNote(result === null || result === undefined || result.ok !== false ? TL_T("hub.ai.llm.granted") : TL_T("hub.ai.unavailable"));
				refreshAi();
			};
			const togglePause = async () => {
				const pet = hubPetBrain();
				if (pet === null) return;
				const status = await hubTry(async () => pet.status?.(), null, "pause-status");
				const paused = status !== null && typeof status === "object" && status.paused === true;
				await hubTry(async () => (paused ? pet.resume?.() : pet.pause?.()), null, paused ? "resume" : "pause");
				setAiNote(paused ? TL_T("hub.ai.resumedNote") : TL_T("hub.ai.pausedNote"));
				refreshAi();
			};
			// ---- v1.6.8 autonomous-thinking card -----------------------------------
			// The hub is a read-through control surface for globalThis.tianlightPetMind
			// (src/44-pet-brain.js): no second source of truth, every handler awaits the
			// engine and then re-reads status. Missing API => card disabled + note.
			const setMindNote = (text) => {
				if (ui !== null && ui.mindStatus !== null && ui.mindStatus !== undefined) ui.mindStatus.textContent = text;
			};
			const hubMindReasonLabel = (reason) => {
				const key = Object.prototype.hasOwnProperty.call(HUB_MIND_REASON_KEYS, reason) ? HUB_MIND_REASON_KEYS[reason] : "hub.mind.reason.internal";
				return TL_T(key);
			};
			const mindStatusOf = () => {
				const mind = hubPetMind();
				if (mind === null || typeof mind.status !== "function") return null;
				const status = hubTry(() => mind.status(), null, "mind-status");
				return status !== null && typeof status === "object" ? status : null;
			};
			const refreshMind = () => {
				if (ui === null) return;
				const mind = hubPetMind();
				const available = mind !== null && typeof mind.status === "function";
				const status = available ? mindStatusOf() : null;
				const enabled = status !== null && status.enabled === true;
				const brain = hubPetBrain();
				const brainStatus = brain !== null && typeof brain.status === "function" ? hubTry(() => brain.status(), null, "mind-brain-status") : null;
				const brainPaused = brainStatus !== null && typeof brainStatus === "object" && brainStatus.paused === true;
				const interval =
					status !== null && Number.isFinite(status.intervalMin) && HUB_MIND_INTERVALS.indexOf(status.intervalMin) >= 0
						? status.intervalMin
						: 15;
				const thoughts = available && typeof mind.thoughts === "function" ? hubTry(() => mind.thoughts(), null, "mind-thoughts") : null;
				const list = Array.isArray(thoughts) ? thoughts.slice(0, 5) : [];
				const thoughtCount =
					status !== null && Number.isFinite(status.thoughtCount) ? Math.max(0, Math.floor(status.thoughtCount)) : list.length;
				ui.mindCard.setAttribute("data-tl-hub-mind-ready", available ? "true" : "false");
				ui.mindCard.setAttribute("data-tl-hub-mind-enabled", enabled ? "true" : "false");
				ui.mindToggle.disabled = available === false;
				ui.mindToggle.textContent = enabled ? TL_T("hub.mind.disable") : TL_T("hub.mind.enable");
				ui.mindInterval.disabled = available === false || enabled === false;
				ui.mindInterval.value = String(interval);
				ui.mindSpeak.disabled = available === false || enabled === false;
				ui.mindSpeak.checked = status === null || status.autonomousSpeech !== false;
				ui.mindLlm.disabled = available === false || enabled === false;
				ui.mindLlm.checked = status !== null && status.llmAssist === true;
				ui.mindThink.disabled = available === false || enabled === false || mindBusy === true;
				ui.mindClear.disabled = available === false || thoughtCount === 0;
				ui.mindThoughts.textContent = "";
				if (available === false) {
					ui.mindThoughts.appendChild(
						hubCreate("p", { className: "tl-hub-note tl-hub-hint", "data-tl-hub-mind-empty": "unavailable" }, TL_T("hub.mind.unavailable")),
					);
				} else if (list.length === 0) {
					ui.mindThoughts.appendChild(hubCreate("p", { className: "tl-hub-note tl-hub-hint", "data-tl-hub-mind-empty": "true" }, TL_T("hub.mind.empty")));
				} else {
					for (const entry of list) {
						if (entry === null || typeof entry !== "object" || typeof entry.text !== "string") continue;
						const kindText = entry.kind === "llm" ? TL_T("hub.mind.kind.llm") : TL_T("hub.mind.kind.local");
						ui.mindThoughts.appendChild(
							hubCreate("div", { className: "tl-hub-mind-thought", "data-tl-hub-mind-thought": entry.kind === "llm" ? "llm" : "local" }, [
								hubCreate("span", { className: "tl-hub-mind-time", "data-tl-hub-mind-time": "" }, hubClock(entry.at)),
								hubCreate("span", { className: "tl-hub-mind-kind", "data-tl-hub-mind-kind": "" }, kindText),
								hubCreate("span", { className: "tl-hub-mind-text", "data-tl-hub-mind-text": "" }, entry.text),
							]),
						);
					}
				}
				if (available === false) setMindNote(TL_T("hub.mind.unavailable"));
				else if (brainPaused === true) setMindNote(TL_T("hub.mind.paused"));
				else if (enabled === false) setMindNote(TL_T("hub.mind.disabledNote"));
				else {
					const budgetUsed = status !== null && Number.isFinite(status.llmUsedToday) ? Math.max(0, Math.floor(status.llmUsedToday)) : 0;
					const budgetCap = status !== null && Number.isFinite(status.llmDailyLimit) ? Math.max(0, Math.floor(status.llmDailyLimit)) : 0;
					const llmSuffix =
						status !== null && status.llmAssist === true && budgetCap > 0
							? " · " + TL_T("hub.mind.llmBudget", { used: budgetUsed, budget: budgetCap })
							: "";
					if (status !== null && Number.isFinite(status.lastThinkAt) && status.lastThinkAt > 0) {
						setMindNote(TL_T("hub.mind.status", { n: interval, count: thoughtCount, time: hubClock(status.lastThinkAt) }) + llmSuffix);
					} else {
						setMindNote(TL_T("hub.mind.statusNever", { n: interval }) + llmSuffix);
					}
				}
			};
			const onMindToggle = async () => {
				disarmPendingConfirms();
				const mind = hubPetMind();
				if (mind === null) return;
				const status = mindStatusOf();
				if (status !== null && status.enabled === true) {
					await hubTry(async () => mind.disable?.(), null, "mind-disable");
					refreshMind();
					setMindNote(TL_T("hub.mind.disabledNote"));
					return;
				}
				const interval = Number(ui !== null ? ui.mindInterval.value : 15);
				const speak = ui !== null && ui.mindSpeak.checked === true;
				const llmAssist = ui !== null && ui.mindLlm.checked === true;
				await hubTry(async () => mind.enable?.({ intervalMin: HUB_MIND_INTERVALS.indexOf(interval) >= 0 ? interval : 15, autonomousSpeech: speak, llmAssist }), null, "mind-enable");
				refreshMind();
			};
			const onMindInterval = async () => {
				const mind = hubPetMind();
				if (mind === null || ui === null) return;
				const status = mindStatusOf();
				if (status === null || status.enabled !== true) return;
				const interval = Number(ui.mindInterval.value);
				if (HUB_MIND_INTERVALS.indexOf(interval) < 0) return;
				await hubTry(async () => mind.enable?.({ intervalMin: interval }), null, "mind-interval");
				refreshMind();
			};
			const onMindSpeak = async () => {
				const mind = hubPetMind();
				if (mind === null || ui === null) return;
				const status = mindStatusOf();
				if (status === null || status.enabled !== true) return;
				await hubTry(async () => mind.enable?.({ autonomousSpeech: ui.mindSpeak.checked === true }), null, "mind-speak");
				refreshMind();
			};
			const onMindLlm = async () => {
				disarmPendingConfirms();
				const mind = hubPetMind();
				if (mind === null || ui === null) return;
				const status = mindStatusOf();
				if (status === null || status.enabled !== true) return;
				await hubTry(async () => mind.enable?.({ llmAssist: ui.mindLlm.checked === true }), null, "mind-llm");
				refreshMind();
			};
			const onMindThink = async () => {
				disarmPendingConfirms();
				const mind = hubPetMind();
				if (mind === null || typeof mind.thinkNow !== "function" || mindBusy === true) return;
				mindBusy = true;
				refreshMind();
				setMindNote(TL_T("hub.mind.thinking"));
				const result = await hubTry(async () => mind.thinkNow(), null, "mind-think");
				mindBusy = false;
				refreshMind();
				if (result !== null && typeof result === "object" && result.ok === true) {
					setMindNote(result.spoken === true ? TL_T("hub.mind.thinkSpoken") : TL_T("hub.mind.thinkDone"));
				} else {
					const reason = result !== null && typeof result === "object" && typeof result.reason === "string" ? result.reason : "internal";
					setMindNote(TL_T("hub.mind.thinkSkipped", { reason: hubMindReasonLabel(reason) }));
				}
			};
			const onMindClear = async () => {
				const mind = hubPetMind();
				if (mind === null || typeof mind.clearThoughts !== "function") return;
				await hubTry(async () => mind.clearThoughts(), null, "mind-clear");
				refreshMind();
				setMindNote(TL_T("hub.mind.cleared"));
			};
			const renderAudit = () => {
				if (ui === null) return;
				const pet = hubPetBrain();
				const box = ui.auditBox;
				box.textContent = "";
				if (pet === null || typeof pet.audit !== "function") {
					box.appendChild(hubCreate("p", { className: "tl-hub-note tl-hub-hint" }, TL_T("hub.audit.unavailable")));
					return;
				}
				const list = hubTry(() => pet.audit(HUB_AUDIT_LIMIT), null, "audit");
				if (!Array.isArray(list) || list.length === 0) {
					box.appendChild(hubCreate("p", { className: "tl-hub-note tl-hub-hint" }, TL_T("hub.audit.empty")));
					return;
				}
				for (const entry of list.slice(0, HUB_AUDIT_LIMIT)) {
					if (entry === null || typeof entry !== "object") continue;
					const ok = entry.ok === true;
					const parts = [hubClock(entry.at), String(entry.action ?? "—"), String(entry.cap ?? "—"), ok ? TL_T("hub.audit.ok") : TL_T("hub.audit.deny")];
					if (typeof entry.reason === "string" && entry.reason !== "") parts.push(hubReasonLabel(entry.reason, HUB_AI_REASON_KEYS, "hub.ai.reason.default"));
					if (typeof entry.source === "string" && entry.source !== "") parts.push(entry.source);
					box.appendChild(hubCreate("div", { className: "tl-hub-audit-row", "data-tl-hub-audit-row": String(entry.action ?? ""), "data-ok": ok ? "true" : "false" }, parts.join(" · ")));
				}
			};
			const refreshAi = () => {
				if (ui === null) return;
				const pet = hubPetBrain();
				const available = pet !== null;
				const status = available ? hubTry(() => pet.status?.(), null, "ai-status") : null;
				const paused = status !== null && typeof status === "object" && status.paused === true;
				ui.pauseButton.disabled = !available;
				ui.pauseButton.textContent = paused ? TL_T("hub.ai.resume") : TL_T("hub.ai.pause");
				ui.chatInput.disabled = !available;
				ui.chatSend.disabled = !available || chatBusy === true;
				const rows = available && typeof pet.permissions === "function" ? hubTry(() => pet.permissions(), null, "permissions") : null;
				const llmRow = Array.isArray(rows) ? rows.find((row) => row !== null && typeof row === "object" && row.id === "llm") : null;
				const llmGrantedFromStatus =
					status !== null && typeof status === "object" && status.llm !== null && typeof status.llm === "object" && status.llm.granted === true;
				const llmGranted = llmGrantedFromStatus || (llmRow !== null && llmRow.granted === true);
				ui.llmButton.disabled = !available || (llmRow !== null && llmRow.grantable === false);
				ui.llmButton.textContent = llmPending === true ? TL_T("hub.ai.llm.confirmShort") : llmGranted ? TL_T("hub.ai.llm.revoke") : TL_T("hub.ai.llm.grant");
				ui.llmButton.setAttribute("data-tl-hub-llm-granted", llmGranted ? "true" : "false");
				// plan A: one adapter line for the built-in DSH model, a custom adapter, an
				// unavailable host (with its reason) or the local-only fallback.
				const adapterLine = hubAdapterLine(status);
				ui.adapter.textContent = adapterLine.text;
				ui.adapter.setAttribute("data-tl-hub-adapter-state", adapterLine.state);
				renderProviderSelect(status);
				renderModelSelect(status);
				ensureLlmProviders();
				ensureLlmModels(status);
				if (!available) setAiNote(TL_T("hub.ai.unavailable"));
				else if (paused) setAiNote(TL_T("hub.ai.pausedNote"));
				else if (ui.aiNote.textContent === TL_T("hub.ai.pausedNote") || ui.aiNote.textContent === TL_T("hub.ai.unavailable")) setAiNote("");
				// A failed provider-list read explains the default-only picker, but never
				// overwrites a more recent note (typed error, saved provider, denied turn).
				if (hubLlmProvidersCache !== null && hubLlmProvidersCache.ok !== true && ui.aiNote.textContent === "") {
					setAiNote(TL_T("hub.ai.llm.providerUnavailable"));
				}
				// v2.2.0: a failed model catalogue only explains the disabled model picker;
				// a saved selection / typed error note still wins.
				if (
					hubLlmModelsCache !== null &&
					hubLlmModelsCache.ok !== true &&
					ui.aiNote.textContent === "" &&
					ui.llmModel !== null &&
					ui.llmModel !== undefined &&
					ui.llmModel.getAttribute("data-tl-hub-llm-model-state") === "unavailable"
				) {
					setAiNote(TL_T("hub.ai.llm.modelUnavailable"));
				}
				refreshPermissions(rows);
				renderAudit();
			};
			// ---- AI Agent card (experimental DSH session bridge, v1.2.0) -------------
			const setAgentNote = (text) => {
				if (ui !== null && ui.agentNote !== null && ui.agentNote !== undefined) ui.agentNote.textContent = text;
			};
			const renderAgentTargets = (sessions, status) => {
				if (ui === null) return;
				const select = ui.agentTarget;
				const list = Array.isArray(sessions) ? sessions : [];
				const signature = list
					.map((session) =>
						session !== null && typeof session === "object"
							? String(session.id ?? "") + ":" + (session.running === true ? "1" : "0") + ":" + String(session.title ?? "")
							: "",
					)
					.join("|");
				if (signature === agentTargetSignature && select.children.length > 0) return;
				agentTargetSignature = signature;
				const previous = typeof select.value === "string" ? select.value : "";
				select.textContent = "";
				select.appendChild(hubCreate("option", { value: HUB_AGENT_TARGET_NEW }, TL_T("hub.agent.target.new")));
				for (const session of list) {
					if (session === null || typeof session !== "object" || typeof session.id !== "string" || session.id === "") continue;
					const title = typeof session.title === "string" && session.title !== "" ? session.title : session.id.slice(0, 8);
					const label = session.running === true ? title + " · " + TL_T("hub.agent.target.running") : title;
					select.appendChild(hubCreate("option", { value: session.id }, label));
				}
				let next = HUB_AGENT_TARGET_NEW;
				for (const option of select.children) {
					if (previous !== "" && option.value === previous) {
						next = previous;
						break;
					}
				}
				if (next === HUB_AGENT_TARGET_NEW && status !== null && typeof status === "object" && status.connected === true && typeof status.sessionId === "string") {
					for (const option of select.children) {
						if (option.value === status.sessionId) {
							next = status.sessionId;
							break;
						}
					}
				}
				select.value = next;
			};
			const cacheAgentSessions = (result) => {
				if (result !== null && typeof result === "object" && result.ok === true && Array.isArray(result.sessions)) {
					agentSessionsCache = result.sessions;
				}
			};
			const refreshAgent = () => {
				if (ui === null) return;
				const agent = hubPetAgent();
				const status = agent !== null && typeof agent.status === "function" ? hubTry(() => agent.status(), null, "agent-status") : null;
				agentStatusCache = status !== null && typeof status === "object" ? status : null;
				const available = agent !== null && agentStatusCache !== null && agentStatusCache.available === true;
				const permission = available === true && hubAgentPermission(agentStatusCache) === true;
				const connected = permission === true && agentStatusCache.connected === true;
				let text = TL_T("hub.agent.status.unavailable");
				if (available === true) {
					if (permission !== true) text = TL_T("hub.agent.status.unauthorized");
					else if (connected !== true) text = TL_T("hub.agent.status.unconnected");
					else {
						const title =
							typeof agentStatusCache.sessionTitle === "string" && agentStatusCache.sessionTitle !== ""
								? agentStatusCache.sessionTitle
								: typeof agentStatusCache.sessionId === "string" && agentStatusCache.sessionId !== ""
									? agentStatusCache.sessionId.slice(0, 8)
									: TL_T("hub.agent.target.new");
						text = TL_T("hub.agent.status.connected", { title });
					}
					const budget = agentStatusCache.budget !== null && typeof agentStatusCache.budget === "object" ? agentStatusCache.budget : {};
					const used = Number.isFinite(budget.used) ? Math.max(0, Math.floor(budget.used)) : 0;
					const cap = Number.isFinite(budget.cap) ? Math.max(0, Math.floor(budget.cap)) : 0;
					text += " · " + TL_T("hub.agent.status.budget", { used, cap });
					if (agentStatusCache.pending === true) text += " · " + TL_T("hub.agent.status.pending");
				}
				if (ui.agentStatus !== null && ui.agentStatus !== undefined) {
					ui.agentStatus.textContent = text;
					ui.agentStatus.setAttribute("data-tl-hub-agent-available", available === true ? "true" : "false");
				}
				ui.agentPerm.disabled = available !== true;
				ui.agentPerm.textContent =
					agentPermPending === true ? TL_T("hub.agent.perm.confirmShort") : permission === true ? TL_T("hub.agent.perm.revoke") : TL_T("hub.agent.perm.grant");
				ui.agentPerm.setAttribute("data-tl-hub-agent-granted", permission === true ? "true" : "false");
				ui.agentTarget.disabled = available !== true || agentBusy === true;
				renderAgentTargets(agentSessionsCache, agentStatusCache);
				ui.agentConnect.disabled = available !== true || permission !== true || agentBusy === true;
				ui.agentDisconnect.disabled = connected !== true || agentBusy === true;
				ui.agentOpen.disabled = connected !== true;
			};
			/** True when the next chat turn must go to the DSH session instead of the brain. */
			const agentRouteReady = () => {
				const agent = hubPetAgent();
				return (
					agent !== null &&
					agentStatusCache !== null &&
					agentStatusCache.available === true &&
					hubAgentPermission(agentStatusCache) === true &&
					agentStatusCache.connected === true &&
					typeof agent.chat === "function"
				);
			};
			const refreshAgentSessions = async () => {
				const agent = hubPetAgent();
				if (agent === null || typeof agent.refreshSessions !== "function") return;
				try {
					cacheAgentSessions(await agent.refreshSessions());
				} catch (error) {
					note("role-hub:agent-sessions", error);
				}
				refreshAgent();
			};
			/**
			 * Two-step consent for taking the experimental agent route (same safe pattern
			 * as the LLM switch): the first click arms, the second grants with the
			 * explicit consent token the brain requires; revoke is direct.
			 */
			const confirmAgentGrant = () => {
				if (agentPermPending === true) {
					agentPermPending = false;
					return true;
				}
				agentPermPending = true;
				setAgentNote(TL_T("hub.agent.perm.confirm"));
				return false;
			};
			const onAgentPermClick = async (event) => {
				// R8 (REV-R4A F2): synthetic clicks do not count as the user's consent.
				if (isSyntheticUserEvent(event)) return;
				disarmPendingConfirms();
				const pet = hubPetBrain();
				const granted = hubAgentPermission(agentStatusCache) === true;
				if (granted === true) {
					if (pet !== null && typeof pet.revoke === "function") {
						try {
							await pet.revoke("agentChat");
						} catch (error) {
							note("role-hub:agent-revoke", error);
						}
					}
					setAgentNote(TL_T("hub.agent.perm.revoked"));
					refreshAgent();
					refreshAi();
					return;
				}
				if (confirmAgentGrant() !== true) {
					refreshAgent();
					return;
				}
				if (pet === null || typeof pet.grant !== "function") {
					setAgentNote(TL_T("hub.agent.status.unavailable"));
					refreshAgent();
					return;
				}
				let message = TL_T("hub.agent.perm.granted");
				try {
					// R4A: consent is a one-shot closure ticket, not the old fixed string.
					const ticket = typeof pet.requestConsent === "function" ? pet.requestConsent("agentChat") : null;
					if (ticket === null) {
						message = TL_T("hub.agent.perm.denied", { reason: hubReasonLabel("consent-required", HUB_AGENT_GRANT_REASON_KEYS, "hub.agent.reason.default") });
					} else {
						const result = await pet.grant("agentChat", { consent: ticket });
						if (result !== null && typeof result === "object" && result.ok === false) {
							message = TL_T("hub.agent.perm.denied", {
								reason: hubReasonLabel(result.reason, HUB_AGENT_GRANT_REASON_KEYS, "hub.agent.reason.default"),
							});
						}
					}
				} catch (error) {
					note("role-hub:agent-grant", error);
					message = TL_T("hub.agent.perm.denied", { reason: String(error?.message ?? error) });
				}
				setAgentNote(message);
				refreshAgent();
				refreshAi();
			};
			const onAgentConnect = async (event) => {
				// R8 (REV-R4A F2): connecting the Agent channel needs a real user gesture.
				if (isSyntheticUserEvent(event)) return;
				disarmPendingConfirms();
				const agent = hubPetAgent();
				if (ui === null) return;
				if (agent === null || typeof agent.connect !== "function") {
					setAgentNote(TL_T("hub.agent.status.unavailable"));
					return;
				}
				const target = typeof ui.agentTarget.value === "string" ? ui.agentTarget.value : HUB_AGENT_TARGET_NEW;
				const options = target === HUB_AGENT_TARGET_NEW || target === "" ? { mode: "new" } : { mode: "existing", sessionId: target };
				agentBusy = true;
				refreshAgent();
				setAgentNote(TL_T("hub.agent.busy"));
				try {
					const result = await agent.connect(options);
					if (result !== null && typeof result === "object" && result.ok === true) {
						const sessionId = typeof result.sessionId === "string" ? result.sessionId : "";
						setAgentNote(TL_T("hub.agent.connect.ok", { title: sessionId === "" ? TL_T("hub.agent.target.new") : sessionId.slice(0, 8) }));
						if (typeof agent.refreshSessions === "function") {
							try {
								cacheAgentSessions(await agent.refreshSessions());
							} catch (error) {
								note("role-hub:agent-sessions", error);
							}
						}
					} else {
						const reason = result !== null && typeof result === "object" && typeof result.reason === "string" ? result.reason : "";
						setAgentNote(TL_T("hub.agent.connect.failed", { reason: hubReasonLabel(reason, HUB_AGENT_REASON_KEYS, "hub.agent.reason.default") }));
					}
				} catch (error) {
					note("role-hub:agent-connect", error);
					setAgentNote(TL_T("hub.agent.connect.failed", { reason: String(error?.message ?? error) }));
				} finally {
					agentBusy = false;
					refreshAgent();
					refreshAi();
				}
			};
			const onAgentDisconnect = async () => {
				const agent = hubPetAgent();
				if (agent === null || typeof agent.disconnect !== "function") return;
				agentBusy = true;
				refreshAgent();
				try {
					await agent.disconnect();
					setAgentNote(TL_T("hub.agent.disconnected"));
				} catch (error) {
					note("role-hub:agent-disconnect", error);
				} finally {
					agentBusy = false;
					refreshAgent();
				}
			};
			const onAgentOpen = async () => {
				const agent = hubPetAgent();
				if (agent === null || typeof agent.openSession !== "function") {
					setAgentNote(TL_T("hub.agent.status.unavailable"));
					return;
				}
				try {
					const result = await agent.openSession();
					if (result !== null && typeof result === "object" && result.ok === false) {
						setAgentNote(TL_T("hub.agent.open.failed", { reason: hubReasonLabel(result.reason, HUB_AGENT_REASON_KEYS, "hub.agent.reason.default") }));
					}
				} catch (error) {
					note("role-hub:agent-open", error);
					setAgentNote(TL_T("hub.agent.open.failed", { reason: String(error?.message ?? error) }));
				}
			};
			const sendChat = async (event) => {
				// R8 (REV-R4A F2): sending into the Agent channel is a user gesture; a
				// script-dispatched click/keydown is ignored. The hub's own input is not a
				// substitute for the product composer and remains untouched by this guard.
				if (isSyntheticUserEvent(event)) return;
				disarmPendingConfirms();
				const pet = hubPetBrain();
				if (ui === null || pet === null || typeof pet.chat !== "function" || chatBusy === true) return;
				const raw = typeof ui.chatInput.value === "string" ? ui.chatInput.value : "";
				const text = raw.trim().slice(0, HUB_AI_INPUT_MAX);
				if (text === "") {
					setAiNote(TL_T("hub.ai.empty"));
					return;
				}
				// v1.2.0: an explicitly granted + connected DSH session takes the turn;
				// otherwise the turn stays on the local/LLM brain (unchanged v1.1 path).
				const useAgent = agentRouteReady();
				const agent = hubPetAgent();
				chatBusy = true;
				ui.chatSend.disabled = true;
				setAiNote(TL_T("hub.ai.thinking"));
				appendLog({ role: "user", at: Date.now(), text });
				try {
					if (useAgent === true && agent !== null) {
						const result = await agent.chat(text);
						const ok = result !== null && typeof result === "object" ? result.ok === true : false;
						const reply = result !== null && typeof result === "object" && typeof result.reply === "string" ? result.reply : "";
						if (ok === true) {
							if (reply !== "") appendLog({ role: "pet", at: Date.now(), source: "agent", ok: true, text: reply });
							else appendLog({ role: "pet", at: Date.now(), source: "agent", ok: true, text: TL_T("hub.agent.sent") });
							setAiNote("");
							ui.chatInput.value = "";
						} else {
							const reason = result !== null && typeof result === "object" && typeof result.reason === "string" ? result.reason : "";
							appendLog({ role: "pet", at: Date.now(), source: "agent", ok: false, reason });
							setAiNote(TL_T("hub.agent.chat.failed", { reason: hubReasonLabel(reason, HUB_AGENT_REASON_KEYS, "hub.agent.reason.default") }));
						}
					} else {
						const result = await pet.chat(text);
						const parsed = hubChatResult(result);
						// The log's `source` already renders as "AI 回复" / "本地回复".
						appendLog({ role: "pet", at: Date.now(), source: parsed.source, ok: parsed.ok, text: parsed.text, reason: parsed.reason });
						if (parsed.ok === true) {
							// plan A: a local fallback after a model failure says WHY (missing
							// credential, quota, timeout, host restart, ...) instead of "usually off".
							if (parsed.llmError !== "") setLlmHintNote(parsed.llmError);
							else setAiNote("");
						} else {
							setAiNote(TL_T("hub.ai.denied", { reason: hubReasonLabel(parsed.reason, HUB_AI_REASON_KEYS, "hub.ai.reason.default") }));
						}
						ui.chatInput.value = "";
					}
				} catch (error) {
					setLastError("chat", error);
					appendLog({ role: "pet", at: Date.now(), source: useAgent === true ? "agent" : "error", ok: false, reason: String(error?.message ?? error) });
					setAiNote(TL_T("hub.ai.failed", { reason: String(error?.message ?? error) }));
				} finally {
					chatBusy = false;
					if (ui !== null) ui.chatSend.disabled = ui.chatInput.disabled;
					renderLog();
					refreshAi();
					refreshAgent();
				}
			};

			// ---- self-test (v1.5.0) -------------------------------------------------
			const setSelftestNote = (text) => {
				if (ui !== null && ui.selftestNote !== null && ui.selftestNote !== undefined) ui.selftestNote.textContent = text;
			};
			const withSelftestTimeout = (promise, ms) => {
				const win = hubBrowserWindow();
				if (win === null || typeof win.setTimeout !== "function") return Promise.resolve(promise);
				return new Promise((resolve, reject) => {
					let timer = 0;
					const settle = (fn, value) => {
						if (timer !== 0) {
							try {
								win.clearTimeout(timer);
							} catch {
								// the host already cleared it
							}
							timer = 0;
						}
						fn(value);
					};
					try {
						timer = win.setTimeout(() => resolve({ timeout: true }), ms);
					} catch {
						resolve(promise);
						return;
					}
					Promise.resolve(promise).then(
						(value) => settle(resolve, value),
						(error) => settle(reject, error),
					);
				});
			};
			const selftestFail = (detail) => ({ ok: false, detail });
			const selftestError = (error) => ({ ok: false, detail: TL_T("hub.selftest.detail.error", { reason: String(error?.message ?? error) }) });
			// ---- version fingerprint (v2.0.1) --------------------------------------
			// `_fingerprint` reports the exact installed build: version, git commit,
			// lib/client.js sha256, HOST_API, DSH version and install method. The
			// self-test and feedback panels show the same one-line form the GitHub issue
			// template requires, and the feedback JSON carries the whole object.
			let fingerprintCache = null;
			let fingerprintAt = 0;
			let fingerprintPending = null;
			const loadFingerprint = async (force) => {
				const now = Date.now();
				if (force !== true && fingerprintCache !== null && now - fingerprintAt < 60000) return fingerprintCache;
				if (fingerprintPending !== null && force !== true) return fingerprintPending;
				fingerprintPending = (async () => {
					try {
						const response = await fetch(ASSET_BASE + "/_fingerprint", { cache: "no-store" });
						if (response.ok !== true) return null;
						const value = await response.json();
						if (value === null || typeof value !== "object" || typeof value.line !== "string") return null;
						fingerprintCache = value;
						fingerprintAt = Date.now();
						return value;
					} catch {
						return null;
					} finally {
						fingerprintPending = null;
					}
				})();
				return fingerprintPending;
			};
			const fingerprintLine = () => (fingerprintCache !== null && typeof fingerprintCache.line === "string" ? fingerprintCache.line : TL_T("hub.fingerprint.unavailable"));
			const renderFingerprint = () => {
				if (ui === null) return;
				const line = fingerprintLine();
				if (ui.selftestFingerprint !== null && ui.selftestFingerprint !== undefined) ui.selftestFingerprint.textContent = line;
				if (ui.feedbackFingerprint !== null && ui.feedbackFingerprint !== undefined) ui.feedbackFingerprint.textContent = line;
			};
			const refreshFingerprint = () => {
				void loadFingerprint(false).then(renderFingerprint);
			};
			const copyFingerprint = async () => {
				if (fingerprintCache === null) await loadFingerprint(true);
				if (fingerprintCache === null) {
					setSelftestNote(TL_T("hub.fingerprint.unavailable"));
					return;
				}
				const copied = await hubCopyText(fingerprintCache.line);
				setSelftestNote(copied === true ? TL_T("hub.fingerprint.copied") : TL_T("hub.selftest.copyFailed"));
			};
			const selftestCheckDefs = [
				{
					id: "life",
					run: async () => {
						const life = hubLifeEngine();
						if (life === null || typeof life.status !== "function") return selftestFail(TL_T("hub.selftest.detail.missing"));
						const status = hubTry(() => life.status(), null, "selftest-life");
						if (status === null || typeof status !== "object") return selftestFail(TL_T("hub.selftest.detail.empty"));
						return { ok: status.version === 1 || typeof status.period === "string", detail: TL_T("hub.selftest.detail.ok") };
					},
				},
				{
					id: "pet",
					run: async () => {
						const pet = hubPetBrain();
						if (pet === null || typeof pet.status !== "function") return selftestFail(TL_T("hub.selftest.detail.missing"));
						const status = hubTry(() => pet.status(), null, "selftest-pet");
						if (status === null || typeof status !== "object") return selftestFail(TL_T("hub.selftest.detail.empty"));
						const rows = typeof pet.permissions === "function" ? hubTry(() => pet.permissions(), null, "selftest-perms") : null;
						const count = Array.isArray(rows) ? rows.length : 0;
						return { ok: count > 0, detail: count + " caps" };
					},
				},
				{
					id: "glass",
					run: async () => {
						const controller = hubGlassDepthController();
						if (controller === null || typeof controller.read !== "function" || typeof controller.effective !== "function") {
							return selftestFail(TL_T("hub.selftest.detail.missing"));
						}
						const depth = hubTry(() => controller.read(), null, "selftest-glass");
						const effective = hubTry(() => controller.effective(), null, "selftest-glass");
						const valid = HUB_GLASS_LEVELS.includes(depth) && HUB_GLASS_LEVELS.includes(effective);
						return { ok: valid, detail: String(depth) + " / " + String(effective) };
					},
				},
				{
					id: "media",
					run: async () => {
						const life = hubLifeEngine();
						if (life === null || typeof life.listMedia !== "function") return selftestFail(TL_T("hub.selftest.detail.missing"));
						try {
							const result = await withSelftestTimeout(life.listMedia(), 4000);
							if (result !== null && typeof result === "object" && result.timeout === true) return selftestFail(TL_T("hub.selftest.detail.error", { reason: "timeout" }));
							if (result === null || typeof result !== "object" || Array.isArray(result.items) === false) return selftestFail(TL_T("hub.selftest.detail.empty"));
							return { ok: true, detail: result.items.length + " items" };
						} catch (error) {
							return selftestError(error);
						}
					},
				},
				{
					id: "weather",
					run: async () => {
						const weather = hubWeather();
						if (weather === null || typeof weather.summary !== "function") return selftestFail(TL_T("hub.selftest.detail.missing"));
						const snapshot = hubWeatherSnapshot(weather);
						if (snapshot === null) return selftestFail(TL_T("hub.selftest.detail.empty"));
						const detail = snapshot.text !== "" ? snapshot.text : TL_T("hub.selftest.detail.empty");
						return { ok: typeof snapshot.runtime === "boolean", detail };
					},
				},
				{
					id: "agent",
					run: async () => {
						const agent = hubPetAgent();
						if (agent === null || typeof agent.status !== "function") return selftestFail(TL_T("hub.selftest.detail.missing"));
						const status = hubTry(() => agent.status(), null, "selftest-agent");
						if (status === null || typeof status !== "object") return selftestFail(TL_T("hub.selftest.detail.empty"));
						return { ok: typeof status.available === "boolean", detail: status.available === true ? "available" : "unavailable" };
					},
				},
				{
					id: "hub",
					run: async () => {
						const hubStatus = hubTry(() => status(), null, "selftest-hub");
						if (hubStatus === null || typeof hubStatus !== "object") return selftestFail(TL_T("hub.selftest.detail.empty"));
						const ok = typeof hubStatus.version === "number" && hubStatus.dependencies !== null && typeof hubStatus.dependencies === "object";
						return { ok, detail: TL_T("hub.selftest.detail.ok") };
					},
				},
			];
			const renderSelftest = () => {
				if (ui === null) return;
				const box = ui.selftestList;
				box.textContent = "";
				let pass = 0;
				let fail = 0;
				for (const result of selftestResults) {
					if (result.ok === true) pass += 1;
					else fail += 1;
					box.appendChild(
						hubCreate("div", { className: "tl-hub-selftest-row", "data-tl-hub-selftest-item": result.id, "data-ok": result.ok === true ? "true" : "false" }, [
							hubCreate("span", { className: "tl-hub-selftest-name" }, TL_T(HUB_SELFTEST_ITEM_KEYS[result.id] ?? "hub.selftest.unknown")),
							hubCreate("span", { className: "tl-hub-selftest-state", "data-ok": result.ok === true ? "true" : "false" }, result.ok === true ? TL_T("hub.selftest.pass") : TL_T("hub.selftest.fail")),
							hubCreate("span", { className: "tl-hub-selftest-detail" }, String(result.detail ?? "")),
						]),
					);
				}
				ui.selftestSummary.textContent =
					selftestResults.length === 0 ? TL_T("hub.selftest.empty") : TL_T("hub.selftest.summary", { pass, fail });
			};
			const selftestText = () => {
				let pass = 0;
				let fail = 0;
				const lines = [];
				lines.push(TL_T("hub.fingerprint.title") + ": " + fingerprintLine());
				for (const result of selftestResults) {
					if (result.ok === true) pass += 1;
					else fail += 1;
					lines.push(TL_T(HUB_SELFTEST_ITEM_KEYS[result.id] ?? "hub.selftest.unknown") + ": " + (result.ok === true ? TL_T("hub.selftest.pass") : TL_T("hub.selftest.fail")) + " · " + String(result.detail ?? ""));
				}
				lines.push(TL_T("hub.selftest.summary", { pass, fail }));
				return lines.join("\n");
			};
			const runSelftest = async () => {
				if (selftestBusy === true || ui === null) return;
				selftestBusy = true;
				ui.selftestRun.disabled = true;
				ui.selftestCopy.disabled = true;
				setSelftestNote(TL_T("hub.selftest.running"));
				selftestResults.length = 0;
				renderSelftest();
				for (const def of selftestCheckDefs) {
					let result = null;
					try {
						result = await def.run();
					} catch (error) {
						result = selftestError(error);
					}
					selftestResults.push({
						id: def.id,
						ok: result !== null && result.ok === true,
						detail: result !== null && typeof result.detail === "string" ? result.detail : "",
					});
					renderSelftest();
				}
				setSelftestNote("");
				selftestBusy = false;
				if (ui !== null) {
					ui.selftestRun.disabled = false;
					ui.selftestCopy.disabled = false;
				}
			};
			const copySelftest = async () => {
				if (selftestBusy === true) return;
				if (selftestResults.length === 0) await runSelftest();
				const copied = await hubCopyText(selftestText());
				setSelftestNote(copied === true ? TL_T("hub.selftest.copied") : TL_T("hub.selftest.copyFailed"));
			};

			// ---- feedback panel (v1.5.0) -------------------------------------------
			const setFeedbackStatus = (text) => {
				if (ui !== null && ui.feedbackStatus !== null && ui.feedbackStatus !== undefined) ui.feedbackStatus.textContent = text;
			};
			const buildFeedbackPayload = () => {
				const life = hubLifeEngine();
				const pet = hubPetBrain();
				const glassController = hubGlassDepthController();
				const weather = hubWeather();
				const agent = hubPetAgent();
				const lifeStatus = life !== null ? hubTry(() => life.status?.(), null, "feedback-life") : null;
				const petStatus = pet !== null ? hubTry(() => pet.status?.(), null, "feedback-pet") : null;
				const petPermissions = pet !== null && typeof pet.permissions === "function" ? hubTry(() => pet.permissions(), null, "feedback-perms") : null;
				const glass =
					glassController !== null
						? {
								depth: hubTry(() => glassController.read(), "unknown", "feedback-glass"),
								effective: hubTry(() => glassController.effective(), "unknown", "feedback-glass"),
							}
						: null;
				const agentStatus = agent !== null ? hubTry(() => agent.status?.(), null, "feedback-agent") : null;
				const hubStatus = hubTry(() => status(), null, "feedback-hub");
				let userAgent = "";
				try {
					userAgent = String(typeof navigator !== "undefined" && navigator !== null ? navigator.userAgent ?? "" : "").slice(0, 200);
				} catch {
					userAgent = "";
				}
				const note = ui !== null && ui.feedbackText !== null && ui.feedbackText !== undefined ? String(ui.feedbackText.value ?? "").trim() : "";
				return {
					schema: "tianlight-feedback@1",
					at: new Date().toISOString(),
					version: hubVersionString(),
					fingerprint: fingerprintCache,
					fingerprintLine: fingerprintLine(),
					userAgent,
					note,
					hub: hubStatus,
					life: lifeStatus,
					pet: { status: petStatus, permissions: petPermissions },
					glass,
					weather: hubWeatherSnapshot(weather),
					agent: agentStatus,
				};
			};
			const onFeedbackCopy = () => {
				runAsync(async () => {
					setFeedbackStatus(TL_T("hub.loading"));
					let text = "";
					try {
						text = JSON.stringify(buildFeedbackPayload(), null, 2);
					} catch (error) {
						setFeedbackStatus(TL_T("hub.feedback.copyFailed"));
						return;
					}
					const copied = await hubCopyText(text);
					setFeedbackStatus(copied === true ? TL_T("hub.feedback.copied") : TL_T("hub.feedback.copyFailed"));
				});
			};
			const onFeedbackIssue = () => {
				try {
					const payload = buildFeedbackPayload();
					const note = payload.note !== "" ? payload.note : TL_T("hub.feedback.issueBody");
					let json = "";
					try {
						json = JSON.stringify(payload, null, 2).slice(0, 6000);
					} catch {
						json = "";
					}
					const body = note + "\n\n```json\n" + json + "\n```";
					const url =
						"https://github.com/MilkySnowWay123/dsh-client-ui-skin-tianlight/issues/new?title=" +
						encodeURIComponent(TL_T("hub.feedback.issueTitle")) +
						"&body=" +
						encodeURIComponent(body);
					const win = hubBrowserWindow();
					if (win === null || typeof win.open !== "function") {
						setFeedbackStatus(TL_T("hub.feedback.unsupported"));
						return;
					}
					const opened = win.open(url, "_blank", "noopener,noreferrer");
					setFeedbackStatus(opened === null || opened === undefined ? TL_T("hub.feedback.issueBlocked") : TL_T("hub.feedback.issueOpened"));
				} catch (error) {
					setLastError("feedback-issue", error);
					setFeedbackStatus(TL_T("hub.feedback.issueBlocked"));
				}
			};
			const onFeedbackDownload = () => {
				try {
					const filename = "tianlight-feedback-" + Date.now() + ".json";
					const result = hubDownloadJson(buildFeedbackPayload(), filename);
					if (result !== null && typeof result === "object" && result.ok === true) {
						setFeedbackStatus(TL_T("hub.feedback.downloaded", { name: result.name }));
					} else {
						const rawReason = result !== null && typeof result === "object" && typeof result.reason === "string" ? result.reason : "";
						const reason = rawReason === "" || rawReason === "unsupported" ? TL_T("hub.feedback.unsupported") : rawReason;
						setFeedbackStatus(TL_T("hub.feedback.downloadFailed", { reason }));
					}
				} catch (error) {
					setLastError("feedback-download", error);
					setFeedbackStatus(TL_T("hub.feedback.downloadFailed", { reason: String(error?.message ?? error) }));
				}
			};

			// ---- overlay build ------------------------------------------------------
			const buildOverlay = () => {
				const state = { glassButtons: {} };
				const root = hubCreate("div", {
					"data-tl-hub": "",
					id: HUB_DOM_ID,
					className: "tl-hub",
					role: "dialog",
					"aria-modal": "true",
					"aria-label": TL_T("hub.title"),
				});
				const mask = hubCreate("div", { "data-tl-hub-mask": "", className: "tl-hub-mask", "aria-hidden": "true" });
				mask.addEventListener("click", () => close());
				const panel = hubCreate("div", { "data-tl-hub-panel": "", className: "tl-hub-panel" });
				const head = hubCreate("div", { "data-tl-hub-head": "", className: "tl-hub-head" }, [
					hubCreate("h2", { className: "tl-hub-title" }, TL_T("hub.title")),
				]);
				const closeButton = hubCreate(
					"button",
					{ type: "button", "data-tl-hub-close": "", className: "tl-hub-close", "aria-label": TL_T("hub.close"), title: TL_T("hub.close") },
					"×",
				);
				closeButton.addEventListener("click", () => close());
				head.appendChild(closeButton);
				state.closeButton = closeButton;
				const body = hubCreate("div", { "data-tl-hub-body": "", className: "tl-hub-body" });

				// a) life status + quick controls
				const statusCard = hubCreate("section", { "data-tl-hub-status": "", className: "tl-hub-card tl-hub-status" }, [
					hubCreate("h3", { className: "tl-hub-card-title" }, TL_T("hub.status.title")),
				]);
				const statusGrid = hubCreate("div", { className: "tl-hub-status-grid" });
				const addStatusValue = (labelKey, slotName) => {
					statusGrid.appendChild(hubCreate("span", { className: "tl-hub-status-key" }, TL_T(labelKey) + "："));
					const value = hubCreate("span", { className: "tl-hub-status-value", "data-tl-hub-status-value": slotName });
					statusGrid.appendChild(value);
					statusGrid.appendChild(hubCreate("span", { className: "tl-hub-status-sep", "aria-hidden": "true" }, " · "));
					return value;
				};
				state.periodValue = addStatusValue("hub.status.period", "period");
				state.awakeValue = addStatusValue("hub.status.awake", "awake");
				state.quietValue = addStatusValue("hub.status.quiet", "quiet");
				state.budgetValue = addStatusValue("hub.status.budget", "budget");
				state.streakValue = addStatusValue("hub.status.streak", "streak");
				state.aiValue = addStatusValue("hub.status.ai", "ai");
				state.statusCard = statusCard;
				state.statusNote = hubCreate("p", { className: "tl-hub-note tl-hub-hint", "data-tl-hub-status-note": "" }, "");
				statusCard.appendChild(statusGrid);
				statusCard.appendChild(state.statusNote);
				const quickRow = hubCreate("div", { className: "tl-hub-row" });
				state.focusButton = hubCreate("button", { type: "button", "data-tl-hub-focus": "", className: "tl-hub-btn" }, TL_T("hub.focus.start"));
				state.focusButton.addEventListener("click", () => {
					const life = hubLifeEngine();
					if (life === null) return;
					const active = hubTry(() => life.focusStatus?.()?.active === true, false, "focus-click");
					hubTry(() => (active ? life.focusStop?.() : life.focusStart?.(25)), null, "focus-toggle");
					refreshStatus();
				});
				state.muteButton = hubCreate("button", { type: "button", "data-tl-hub-mute": "", className: "tl-hub-btn" }, TL_T("hub.mute.start"));
				state.muteButton.addEventListener("click", () => {
					const life = hubLifeEngine();
					if (life === null) return;
					hubTry(() => life.muteFor?.(3600000), null, "mute");
					setAiNote("");
					refreshStatus();
				});
				quickRow.appendChild(state.focusButton);
				quickRow.appendChild(state.muteButton);
				statusCard.appendChild(quickRow);
				body.appendChild(statusCard);

				// a2) life rhythm settings (v1.3.0: moved out of the deleted settings page)
				const lifeCard = hubCreate("section", { "data-tl-hub-life-config": "", className: "tl-hub-card tl-hub-life" }, [
					hubCreate("h3", { className: "tl-hub-card-title" }, TL_T("hub.life.title")),
				]);
				const lifeQuietRow = hubCreate("div", { className: "tl-hub-row" });
				lifeQuietRow.appendChild(hubCreate("span", { className: "tl-hub-status-key" }, TL_T("hub.life.quiet") + "："));
				state.lifeQuietEnabled = hubCreate("input", {
					type: "checkbox",
					"data-tl-hub-quiet-enabled": "",
					className: "tl-hub-check",
					"aria-label": TL_T("hub.life.quietOn"),
				});
				lifeQuietRow.appendChild(state.lifeQuietEnabled);
				state.lifeQuietStart = hubCreate("input", {
					type: "time",
					"data-tl-hub-quiet-start": "",
					className: "tl-hub-input tl-hub-time",
					"aria-label": TL_T("hub.life.quietStart"),
				});
				lifeQuietRow.appendChild(state.lifeQuietStart);
				lifeQuietRow.appendChild(hubCreate("span", { className: "tl-hub-status-key" }, "→"));
				state.lifeQuietEnd = hubCreate("input", {
					type: "time",
					"data-tl-hub-quiet-end": "",
					className: "tl-hub-input tl-hub-time",
					"aria-label": TL_T("hub.life.quietEnd"),
				});
				lifeQuietRow.appendChild(state.lifeQuietEnd);
				lifeCard.appendChild(lifeQuietRow);
				const lifeRhythmRow = hubCreate("div", { className: "tl-hub-row" });
				lifeRhythmRow.appendChild(hubCreate("span", { className: "tl-hub-status-key" }, TL_T("hub.life.budget") + "："));
				state.lifeBudget = hubCreate("input", {
					type: "number",
					min: "0",
					max: "50",
					step: "1",
					"data-tl-hub-budget": "",
					className: "tl-hub-input tl-hub-num",
					"aria-label": TL_T("hub.life.budget"),
				});
				lifeRhythmRow.appendChild(state.lifeBudget);
				lifeRhythmRow.appendChild(hubCreate("span", { className: "tl-hub-status-key" }, TL_T("hub.life.wake") + "："));
				state.lifeWake = hubCreate("input", {
					type: "time",
					"data-tl-hub-wake": "",
					className: "tl-hub-input tl-hub-time",
					"aria-label": TL_T("hub.life.wake"),
				});
				lifeRhythmRow.appendChild(state.lifeWake);
				lifeRhythmRow.appendChild(hubCreate("span", { className: "tl-hub-status-key" }, TL_T("hub.life.sleep") + "："));
				state.lifeSleep = hubCreate("input", {
					type: "time",
					"data-tl-hub-sleep": "",
					className: "tl-hub-input tl-hub-time",
					"aria-label": TL_T("hub.life.sleep"),
				});
				lifeRhythmRow.appendChild(state.lifeSleep);
				lifeCard.appendChild(lifeRhythmRow);
				const lifeApplyRow = hubCreate("div", { className: "tl-hub-row" });
				lifeApplyRow.appendChild(hubCreate("span", { className: "tl-hub-status-key" }, TL_T("hub.life.virtual") + "："));
				state.lifeVirtual = hubCreate("input", {
					type: "number",
					min: "-720",
					max: "720",
					step: "15",
					"data-tl-hub-virtual-offset": "",
					className: "tl-hub-input tl-hub-num",
					"aria-label": TL_T("hub.life.virtual"),
				});
				lifeApplyRow.appendChild(state.lifeVirtual);
				state.lifeApply = hubCreate("button", { type: "button", "data-tl-hub-life-apply": "", className: "tl-hub-btn" }, TL_T("hub.life.apply"));
				state.lifeApply.addEventListener("click", () => runAsync(applyLifeConfig));
				lifeApplyRow.appendChild(state.lifeApply);
				lifeCard.appendChild(lifeApplyRow);
				// R5: typing in any rhythm field marks an unsaved draft so the 4s refresh
				// never overwrites it, and closing (Esc included) persists it.
				for (const input of [
					state.lifeQuietEnabled,
					state.lifeQuietStart,
					state.lifeQuietEnd,
					state.lifeBudget,
					state.lifeWake,
					state.lifeSleep,
					state.lifeVirtual,
				]) {
					if (input === null || input === undefined) continue;
					input.addEventListener("input", markLifeDraft);
					input.addEventListener("change", markLifeDraft);
				}
				state.lifeMemory = hubCreate("p", { className: "tl-hub-hint", "data-tl-hub-memory": "" }, "");
				lifeCard.appendChild(state.lifeMemory);
				state.lifeNote = hubCreate("p", { className: "tl-hub-hint", "data-tl-hub-life-note": "", role: "status" }, "");
				lifeCard.appendChild(state.lifeNote);
				body.appendChild(lifeCard);

				// a3) weather (v1.5.0): the weather engine owns networking + geolocation
				const weatherCard = hubCreate("section", { "data-tl-hub-weather": "", className: "tl-hub-card tl-hub-weather" }, [
					hubCreate("h3", { className: "tl-hub-card-title" }, TL_T("hub.weather.title")),
					hubCreate("p", { className: "tl-hub-note tl-hub-hint" }, TL_T("hub.weather.hint")),
				]);
				state.weatherStatus = hubCreate(
					"p",
					{ className: "tl-hub-note tl-hub-hint", "data-tl-hub-weather-status": "", role: "status" },
					TL_T("hub.weather.unavailable"),
				);
				weatherCard.appendChild(state.weatherStatus);
				const weatherEnableRow = hubCreate("div", { className: "tl-hub-row" });
				weatherEnableRow.appendChild(hubCreate("span", { className: "tl-hub-status-key" }, TL_T("hub.weather.enable") + "："));
				state.weatherEnabled = hubCreate("input", {
					type: "checkbox",
					"data-tl-hub-weather-enabled": "",
					className: "tl-hub-check",
					"aria-label": TL_T("hub.weather.enable"),
				});
				state.weatherEnabled.addEventListener("change", () => runAsync(onWeatherEnabled));
				weatherEnableRow.appendChild(state.weatherEnabled);
				weatherCard.appendChild(weatherEnableRow);
				const weatherCityRow = hubCreate("div", { className: "tl-hub-row" });
				weatherCityRow.appendChild(hubCreate("span", { className: "tl-hub-status-key" }, TL_T("hub.weather.city") + "："));
				state.weatherCity = hubCreate("input", {
					type: "text",
					"data-tl-hub-weather-city": "",
					className: "tl-hub-input",
					placeholder: TL_T("hub.weather.cityPlaceholder"),
					"aria-label": TL_T("hub.weather.city"),
				});
				weatherCityRow.appendChild(state.weatherCity);
				state.weatherResolve = hubCreate("button", { type: "button", "data-tl-hub-weather-resolve": "", className: "tl-hub-btn" }, TL_T("hub.weather.resolve"));
				state.weatherResolve.addEventListener("click", () => runAsync(onWeatherResolve));
				weatherCityRow.appendChild(state.weatherResolve);
				weatherCard.appendChild(weatherCityRow);
				const weatherCoordsRow = hubCreate("div", { className: "tl-hub-row" });
				weatherCoordsRow.appendChild(hubCreate("span", { className: "tl-hub-status-key" }, TL_T("hub.weather.lat") + "："));
				state.weatherLat = hubCreate("input", {
					type: "number",
					step: "0.0001",
					min: "-90",
					max: "90",
					"data-tl-hub-weather-lat": "",
					className: "tl-hub-input tl-hub-num",
					"aria-label": TL_T("hub.weather.lat"),
				});
				weatherCoordsRow.appendChild(state.weatherLat);
				weatherCoordsRow.appendChild(hubCreate("span", { className: "tl-hub-status-key" }, TL_T("hub.weather.lon") + "："));
				state.weatherLon = hubCreate("input", {
					type: "number",
					step: "0.0001",
					min: "-180",
					max: "180",
					"data-tl-hub-weather-lon": "",
					className: "tl-hub-input tl-hub-num",
					"aria-label": TL_T("hub.weather.lon"),
				});
				weatherCoordsRow.appendChild(state.weatherLon);
				state.weatherCoords = hubCreate("button", { type: "button", "data-tl-hub-weather-coords": "", className: "tl-hub-btn" }, TL_T("hub.weather.coords"));
				state.weatherCoords.addEventListener("click", () => runAsync(onWeatherCoords));
				weatherCoordsRow.appendChild(state.weatherCoords);
				weatherCard.appendChild(weatherCoordsRow);
				const weatherActionsRow = hubCreate("div", { className: "tl-hub-row" });
				state.weatherLocate = hubCreate("button", { type: "button", "data-tl-hub-weather-locate": "", className: "tl-hub-btn" }, TL_T("hub.weather.locate"));
				state.weatherLocate.addEventListener("click", () => runAsync(onWeatherLocate));
				weatherActionsRow.appendChild(state.weatherLocate);
				state.weatherRefresh = hubCreate("button", { type: "button", "data-tl-hub-weather-refresh": "", className: "tl-hub-btn" }, TL_T("hub.weather.refresh"));
				state.weatherRefresh.addEventListener("click", () => runAsync(onWeatherRefresh));
				weatherActionsRow.appendChild(state.weatherRefresh);
				weatherCard.appendChild(weatherActionsRow);
				state.weatherNote = hubCreate("p", { className: "tl-hub-note tl-hub-hint", "data-tl-hub-weather-note": "", role: "status" }, "");
				weatherCard.appendChild(state.weatherNote);
				body.appendChild(weatherCard);

				// b) liquid glass
				const glassCard = hubCreate("section", { "data-tl-hub-glass-card": "", className: "tl-hub-card" }, [
					hubCreate("h3", { className: "tl-hub-card-title" }, TL_T("hub.glass.title")),
				]);
				const glassRow = hubCreate("div", { className: "tl-hub-choices" });
				for (const level of HUB_GLASS_LEVELS) {
					const button = hubCreate("button", { type: "button", className: "tl-hub-choice", "data-tl-hub-glass": level, "aria-pressed": "false" }, TL_T(HUB_GLASS_LABEL_KEYS[level]));
					button.addEventListener("click", () => applyGlass(level));
					state.glassButtons[level] = button;
					glassRow.appendChild(button);
				}
				glassCard.appendChild(glassRow);
				// v2.2.0: real-time sampling toggle. Rendered as a two-state button so the
				// control reads as a switch even before a wallpaper exists.
				const glassLiveRow = hubCreate("div", { className: "tl-hub-row tl-hub-glass-live-row", "data-tl-hub-glass-live-row": "" });
				state.glassLive = hubCreate(
					"button",
					{ type: "button", className: "tl-hub-choice", "data-tl-hub-glass-live": "", "aria-pressed": "false" },
					TL_T("hub.glass.live"),
				);
				state.glassLive.addEventListener("click", () => toggleGlassLive());
				state.glassLiveNote = hubCreate("span", { className: "tl-hub-hint", "data-tl-hub-glass-live-note": "" }, TL_T("hub.glass.liveOffHint"));
				glassLiveRow.appendChild(state.glassLive);
				glassLiveRow.appendChild(state.glassLiveNote);
				glassCard.appendChild(glassLiveRow);
				state.glassPreview = hubCreate(
					"div",
					{ className: "tl-hub-glass-preview", "data-tl-glass-preview": "off", "data-tl-hub-glass-preview": "", "data-depth": "off" },
					"",
				);
				state.glassPreviewLabel = hubCreate("span", { className: "tl-hub-glass-preview-label", "data-tl-glass-preview-label": "" }, "");
				state.glassPreview.appendChild(state.glassPreviewLabel);
				glassCard.appendChild(state.glassPreview);
				state.glassEffective = hubCreate("p", { className: "tl-hub-note tl-hub-hint", "data-tl-hub-glass-effective": "" }, "");
				glassCard.appendChild(state.glassEffective);
				glassCard.appendChild(hubCreate("p", { className: "tl-hub-note tl-hub-hint", "data-tl-hub-glass-hint": "" }, TL_T("hub.glass.previewHint")));
				// v2.0.1: one-click "author's default look" (appearance keys only).
				const appearanceRow = hubCreate("div", { className: "tl-hub-row" });
				state.appearanceReset = hubCreate("button", { type: "button", "data-tl-hub-appearance-reset": "", className: "tl-hub-btn" }, TL_T("hub.appearance.reset"));
				state.appearanceReset.addEventListener("click", () => resetDefaultAppearance());
				appearanceRow.appendChild(state.appearanceReset);
				glassCard.appendChild(appearanceRow);
				state.appearanceNote = hubCreate("p", { className: "tl-hub-note tl-hub-hint", "data-tl-hub-appearance-note": "", role: "status" }, TL_T("hub.appearance.hint"));
				glassCard.appendChild(state.appearanceNote);
				body.appendChild(glassCard);

				// b2) A · 破晓 opening animation (splash module owns the preference)
				const splashCard = hubCreate("section", { "data-tl-hub-splash-card": "", className: "tl-hub-card tl-hub-splash" }, [
					hubCreate("h3", { className: "tl-hub-card-title" }, TL_T("hub.splash.title")),
				]);
				const splashRow = hubCreate("div", { className: "tl-hub-row tl-hub-switch-row" });
				const splashLabel = hubCreate("span", { className: "tl-hub-switch-label" }, TL_T("hub.splash.style"));
				state.splashToggle = hubCreate("select", {
					className: "tl-hub-select",
					"aria-label": TL_T("hub.splash.aria"),
					"data-tl-hub-splash-toggle": "",
				});
				for (const [value, key] of [
					["long-once", "hub.splash.longOnce"],
					["long", "hub.splash.long"],
					["simple", "hub.splash.simple"],
					["off", "hub.splash.offOption"],
				]) {
					state.splashToggle.appendChild(hubCreate("option", { value }, TL_T(key)));
				}
				state.splashToggle.addEventListener("change", () => {
					try {
						setSplashStyle(state.splashToggle.value);
						refreshSplash();
					} catch (error) {
						setLastError("splash-toggle", error);
					}
				});
				splashRow.appendChild(splashLabel);
				splashRow.appendChild(state.splashToggle);
				splashCard.appendChild(splashRow);

				const soundRow = hubCreate("div", { className: "tl-hub-row tl-hub-switch-row" });
				soundRow.appendChild(hubCreate("span", { className: "tl-hub-switch-label" }, TL_T("hub.splash.sound")));
				state.splashSound = hubCreate("select", {
					className: "tl-hub-select",
					"aria-label": TL_T("hub.splash.sound"),
					"data-tl-hub-splash-sound": "",
				});
				state.splashSound.appendChild(hubCreate("option", { value: "0" }, TL_T("hub.splash.soundOff")));
				state.splashSound.appendChild(hubCreate("option", { value: "1" }, TL_T("hub.splash.soundOn")));
				state.splashSound.addEventListener("change", () => {
					try {
						setSplashSound(state.splashSound.value === "1");
						refreshSplash();
					} catch (error) {
						setLastError("splash-sound", error);
					}
				});
				soundRow.appendChild(state.splashSound);
				splashCard.appendChild(soundRow);

				const motionRow = hubCreate("div", { className: "tl-hub-row tl-hub-switch-row" });
				motionRow.appendChild(hubCreate("span", { className: "tl-hub-switch-label" }, TL_T("hub.splash.motion")));
				state.splashMotion = hubCreate("select", {
					className: "tl-hub-select",
					"aria-label": TL_T("hub.splash.motion"),
					"data-tl-hub-splash-motion": "",
				});
				state.splashMotion.appendChild(hubCreate("option", { value: "0" }, TL_T("hub.splash.motionOff")));
				state.splashMotion.appendChild(hubCreate("option", { value: "1" }, TL_T("hub.splash.motionOn")));
				state.splashMotion.addEventListener("change", () => {
					try {
						setSplashForceMotion(state.splashMotion.value === "1");
						refreshSplash();
					} catch (error) {
						setLastError("splash-motion", error);
					}
				});
				motionRow.appendChild(state.splashMotion);
				splashCard.appendChild(motionRow);
				splashCard.appendChild(hubCreate("p", { className: "tl-hub-note tl-hub-hint" }, TL_T("hub.splash.motionHint")));
				splashCard.appendChild(hubCreate("p", { className: "tl-hub-note tl-hub-hint" }, TL_T("hub.splash.hint")));
				body.appendChild(splashCard);

				// c) companion look: catalog select + local upload
				const mediaCard = hubCreate("section", { "data-tl-hub-media-card": "", className: "tl-hub-card" }, [
					hubCreate("h3", { className: "tl-hub-card-title" }, TL_T("hub.media.title")),
					hubCreate("p", { className: "tl-hub-note tl-hub-hint" }, TL_T("hub.upload.hint")),
				]);
				const mediaRow = hubCreate("div", { className: "tl-hub-row" });
				state.mediaSelect = hubCreate("select", { "data-tl-hub-media": "", className: "tl-hub-select", "aria-label": TL_T("hub.media.select") });
				// v1.6.4: choosing another value in the (still supported) select reloads
				// the action pack editor for that look.
				state.mediaSelect.addEventListener("change", () => runAsync(loadEffectivePack));
				state.mediaApply = hubCreate("button", { type: "button", "data-tl-hub-media-apply": "", className: "tl-hub-btn" }, TL_T("hub.media.apply"));
				state.mediaApply.addEventListener("click", () => runAsync(applySelectedMedia));
				mediaRow.appendChild(state.mediaSelect);
				mediaRow.appendChild(state.mediaApply);
				state.mediaDefault = hubCreate("button", { type: "button", "data-tl-hub-media-default": "", className: "tl-hub-btn" }, TL_T("hub.media.restoreDefault"));
				state.mediaDefault.addEventListener("click", () => runAsync(restoreDefaultMedia));
				mediaRow.appendChild(state.mediaDefault);
				mediaCard.appendChild(mediaRow);
				// v1.6.4: always-visible filename list (the native select hid the names).
				mediaCard.appendChild(hubCreate("p", { className: "tl-hub-note tl-hub-hint", "data-tl-hub-media-list-hint": "" }, TL_T("hub.media.listHint")));
				state.mediaList = hubCreate("div", { "data-tl-hub-media-list": "", className: "tl-hub-media-list" });
				mediaCard.appendChild(state.mediaList);
				const uploadRow = hubCreate("div", { className: "tl-hub-row" });
				state.uploadInput = hubCreate("input", {
					type: "file",
					accept: "image/*,video/*",
					"data-tl-hub-upload-input": "",
					className: "tl-hub-file",
					hidden: true,
				});
				state.uploadInput.addEventListener("change", () => runAsync(handleUploadPicked));
				state.mediaUpload = hubCreate("button", { type: "button", "data-tl-hub-upload": "", className: "tl-hub-btn" }, TL_T("hub.upload.button"));
				state.mediaUpload.addEventListener("click", () => {
					try {
						state.uploadInput.click();
					} catch (error) {
						setLastError("upload-pick", error);
					}
				});
				uploadRow.appendChild(state.mediaUpload);
				uploadRow.appendChild(state.uploadInput);
				mediaCard.appendChild(uploadRow);
				state.mediaStatus = hubCreate("p", { className: "tl-hub-note tl-hub-hint", "data-tl-hub-media-status": "" }, "");
				state.mediaRejected = hubCreate("p", { className: "tl-hub-note tl-hub-hint", "data-tl-hub-media-rejected": "" }, "");
				mediaCard.appendChild(state.mediaStatus);
				mediaCard.appendChild(state.mediaRejected);
				state.uploadStatus = hubCreate("p", { className: "tl-hub-note tl-hub-hint", "data-tl-hub-upload-status": "", role: "status" }, "");
				mediaCard.appendChild(state.uploadStatus);
				// v1.6.4: per-look action pack editor. The companion owns the data
				// (globalThis.tianlightPetActions), so the hub only reads/writes it.
				const packSection = hubCreate("section", { "data-tl-hub-media-pack": "", className: "tl-hub-media-pack" }, [
					hubCreate("h4", { className: "tl-hub-pack-title", "data-tl-hub-pack-title": "" }, TL_T("hub.media.pack.title")),
					hubCreate("p", { className: "tl-hub-note tl-hub-hint" }, TL_T("hub.media.pack.hint")),
				]);
				state.packLabels = {};
				state.packLines = {};
				for (const actionId of HUB_PACK_ACTIONS) {
					const labelKey = HUB_PACK_LABEL_KEYS[actionId] ?? "hub.media.pack.labelPet";
					const actionRow = hubCreate("div", { className: "tl-hub-pack-row", "data-tl-hub-pack-row": actionId });
					state.packLabels[actionId] = hubCreate("input", {
						type: "text",
						className: "tl-hub-input tl-hub-pack-label",
						"data-tl-hub-pack-label": actionId,
						maxlength: String(HUB_PACK_LABEL_MAX),
						placeholder: TL_T(labelKey),
						"aria-label": TL_T(labelKey),
					});
					state.packLines[actionId] = hubCreate("textarea", {
						className: "tl-hub-input tl-hub-textarea tl-hub-pack-lines",
						"data-tl-hub-pack-lines": actionId,
						rows: "2",
						placeholder: TL_T("hub.media.pack.linesPlaceholder"),
						"aria-label": TL_T(labelKey),
					});
					actionRow.appendChild(state.packLabels[actionId]);
					actionRow.appendChild(state.packLines[actionId]);
					packSection.appendChild(actionRow);
				}
				const packButtons = hubCreate("div", { className: "tl-hub-pack-actions", "data-tl-hub-pack-actions": "" });
				state.packSave = hubCreate("button", { type: "button", className: "tl-hub-btn", "data-tl-hub-pack-save": "" }, TL_T("hub.media.pack.save"));
				state.packSave.addEventListener("click", () => runAsync(savePack));
				state.packReset = hubCreate("button", { type: "button", className: "tl-hub-btn", "data-tl-hub-pack-reset": "" }, TL_T("hub.media.pack.reset"));
				// R5/R8b: destructive reset arms on the first click (5s expiry, disarmed by
				// any other card action) and only runs on the second click.
				state.packReset.addEventListener("click", () => {
					if (packResetPending !== true) {
						armPackReset();
						return;
					}
					disarmPackReset();
					runAsync(resetPack);
				});
				packButtons.appendChild(state.packSave);
				packButtons.appendChild(state.packReset);
				packSection.appendChild(packButtons);
				state.packStatus = hubCreate("p", { className: "tl-hub-note tl-hub-hint", "data-tl-hub-pack-status": "", role: "status" }, "");
				packSection.appendChild(state.packStatus);
				mediaCard.appendChild(packSection);
				body.appendChild(mediaCard);

				// d) AI chat + permissioned actions
				const aiCard = hubCreate("section", { "data-tl-hub-ai": "", className: "tl-hub-card tl-hub-ai" }, [
					hubCreate("h3", { className: "tl-hub-card-title" }, TL_T("hub.ai.title")),
					hubCreate("p", { className: "tl-hub-note tl-hub-hint" }, TL_T("hub.ai.hint")),
				]);
				const aiRow = hubCreate("div", { className: "tl-hub-row" });
				state.pauseButton = hubCreate("button", { type: "button", "data-tl-hub-pause": "", className: "tl-hub-btn" }, TL_T("hub.ai.pause"));
				state.pauseButton.addEventListener("click", () => runAsync(togglePause));
				state.llmButton = hubCreate("button", { type: "button", "data-tl-hub-perm": "llm", className: "tl-hub-btn", "data-tl-hub-llm-granted": "false" }, TL_T("hub.ai.llm.grant"));
				state.llmButton.addEventListener("click", (event) => runAsync(() => onLlmClick(event)));
				aiRow.appendChild(state.pauseButton);
				aiRow.appendChild(state.llmButton);
				aiCard.appendChild(aiRow);
				state.adapter = hubCreate("p", { className: "tl-hub-note tl-hub-hint", "data-tl-hub-adapter": "" }, TL_T("hub.ai.unavailable"));
				aiCard.appendChild(state.adapter);
				// plan A: only the provider is chosen here; the model follows the DSH
				// default selection. The label is redrawn by the shared i18n DOM sweep.
				const providerRow = hubCreate("div", { className: "tl-hub-row tl-hub-llm-provider-row", "data-tl-hub-llm-provider-row": "" });
				state.llmProviderLabel = hubCreate(
					"span",
					{ className: "tl-hub-hint", "data-tl-i18n-key": "hub.ai.llm.providerLabel" },
					TL_T("hub.ai.llm.providerLabel"),
				);
				state.llmProvider = hubCreate("select", {
					"data-tl-hub-llm-provider": "",
					className: "tl-hub-select",
					"aria-label": TL_T("hub.ai.llm.providerLabel"),
				});
				state.llmProvider.addEventListener("change", (event) => runAsync(() => onProviderChange(event)));
				providerRow.appendChild(state.llmProviderLabel);
				providerRow.appendChild(state.llmProvider);
				aiCard.appendChild(providerRow);
				// v2.2.0: model picker next to the provider picker. The catalogue is read on
				// demand from the host, so Grok / Claude / any DSH-configured route shows up
				// with its real model ids instead of silently using the DeepSeek default.
				const modelRow = hubCreate("div", { className: "tl-hub-row tl-hub-llm-model-row", "data-tl-hub-llm-model-row": "" });
				state.llmModelLabel = hubCreate(
					"span",
					{ className: "tl-hub-hint", "data-tl-i18n-key": "hub.ai.llm.modelLabel" },
					TL_T("hub.ai.llm.modelLabel"),
				);
				state.llmModel = hubCreate("select", {
					"data-tl-hub-llm-model": "",
					className: "tl-hub-select",
					"aria-label": TL_T("hub.ai.llm.modelLabel"),
				});
				state.llmModel.addEventListener("change", (event) => runAsync(() => onModelChange(event)));
				modelRow.appendChild(state.llmModelLabel);
				modelRow.appendChild(state.llmModel);
				aiCard.appendChild(modelRow);
				aiCard.appendChild(hubCreate("p", { className: "tl-hub-note tl-hub-hint", "data-tl-hub-llm-provider-hint": "" }, TL_T("hub.ai.llm.providerHint")));
				state.aiNote = hubCreate("p", { className: "tl-hub-note tl-hub-hint", "data-tl-hub-ai-note": "", role: "status" }, "");
				aiCard.appendChild(state.aiNote);
				const chatRow = hubCreate("div", { className: "tl-hub-row" });
				state.chatInput = hubCreate("input", {
					type: "text",
					"data-tl-hub-chat-input": "",
					className: "tl-hub-input",
					maxlength: String(HUB_AI_INPUT_MAX),
					placeholder: TL_T("hub.ai.inputPlaceholder"),
					"aria-label": TL_T("hub.ai.inputPlaceholder"),
				});
				state.chatInput.addEventListener("keydown", (event) => {
					if (event === null || event === undefined || event.key !== "Enter") return;
					if (typeof event.preventDefault === "function") event.preventDefault();
					runAsync(() => sendChat(event));
				});
				state.chatSend = hubCreate("button", { type: "button", "data-tl-hub-chat-send": "", className: "tl-hub-btn" }, TL_T("hub.ai.send"));
				state.chatSend.addEventListener("click", (event) => runAsync(() => sendChat(event)));
				chatRow.appendChild(state.chatInput);
				chatRow.appendChild(state.chatSend);
				aiCard.appendChild(chatRow);
				state.logBox = hubCreate("div", { "data-tl-hub-log": "", className: "tl-hub-log", role: "log", "aria-live": "polite" });
				aiCard.appendChild(state.logBox);
				body.appendChild(aiCard);

				// d1) v1.6.8 autonomous thinking (fully agentic companion, opt-in):
				// enable/pause, interval, autonomous-speech switch, "think now", the
				// latest five thoughts and one status line. Read-through only.
				const mindCard = hubCreate("section", { "data-tl-hub-mind": "", className: "tl-hub-card tl-hub-mind" }, [
					hubCreate("h3", { className: "tl-hub-card-title" }, TL_T("hub.mind.title")),
					hubCreate("p", { className: "tl-hub-note tl-hub-hint" }, TL_T("hub.mind.hint")),
				]);
				state.mindCard = mindCard;
				const mindRow = hubCreate("div", { className: "tl-hub-row" });
				state.mindToggle = hubCreate(
					"button",
					{ type: "button", "data-tl-hub-mind-toggle": "", className: "tl-hub-btn", "data-tl-hub-mind-enabled": "false" },
					TL_T("hub.mind.enable"),
				);
				state.mindToggle.addEventListener("click", () => runAsync(onMindToggle));
				mindRow.appendChild(state.mindToggle);
				state.mindInterval = hubCreate("select", {
					"data-tl-hub-mind-interval": "",
					className: "tl-hub-select",
					"aria-label": TL_T("hub.mind.interval"),
				});
				for (const minutes of HUB_MIND_INTERVALS) {
					state.mindInterval.appendChild(hubCreate("option", { value: String(minutes) }, TL_T("hub.mind.intervalValue", { n: minutes })));
				}
				state.mindInterval.value = "15";
				state.mindInterval.addEventListener("change", () => runAsync(onMindInterval));
				mindRow.appendChild(state.mindInterval);
				const mindSpeakBox = hubCreate("span", { className: "tl-hub-mind-speak" });
				state.mindSpeak = hubCreate("input", { type: "checkbox", "data-tl-hub-mind-speak": "" });
				state.mindSpeak.checked = true;
				state.mindSpeak.addEventListener("change", () => runAsync(onMindSpeak));
				mindSpeakBox.appendChild(state.mindSpeak);
				mindSpeakBox.appendChild(hubCreate("span", { className: "tl-hub-mind-speak-label" }, TL_T("hub.mind.speak")));
				mindRow.appendChild(mindSpeakBox);
				// S1: separate opt-in for LLM inner monologue (independent daily budget).
				const mindLlmBox = hubCreate("span", { className: "tl-hub-mind-speak", title: TL_T("hub.mind.llmHint") });
				state.mindLlm = hubCreate("input", { type: "checkbox", "data-tl-hub-mind-llm": "" });
				state.mindLlm.addEventListener("change", () => runAsync(onMindLlm));
				mindLlmBox.appendChild(state.mindLlm);
				mindLlmBox.appendChild(hubCreate("span", { className: "tl-hub-mind-speak-label" }, TL_T("hub.mind.llm")));
				mindRow.appendChild(mindLlmBox);
				mindCard.appendChild(mindRow);
				const mindActionRow = hubCreate("div", { className: "tl-hub-row" });
				state.mindThink = hubCreate("button", { type: "button", "data-tl-hub-mind-think": "", className: "tl-hub-btn" }, TL_T("hub.mind.think"));
				state.mindThink.addEventListener("click", () => runAsync(onMindThink));
				mindActionRow.appendChild(state.mindThink);
				state.mindClear = hubCreate("button", { type: "button", "data-tl-hub-mind-clear": "", className: "tl-hub-btn" }, TL_T("hub.mind.clear"));
				// R5/R8b: clearing thoughts cannot be undone; arm with expiry before running.
				state.mindClear.addEventListener("click", () => {
					if (mindClearPending !== true) {
						armMindClear();
						return;
					}
					disarmMindClear();
					runAsync(onMindClear);
				});
				mindActionRow.appendChild(state.mindClear);
				mindCard.appendChild(mindActionRow);
				state.mindThoughts = hubCreate("div", {
					"data-tl-hub-mind-thoughts": "",
					className: "tl-hub-mind-thoughts",
					role: "log",
					"aria-live": "polite",
				});
				mindCard.appendChild(state.mindThoughts);
				state.mindStatus = hubCreate("p", { className: "tl-hub-note tl-hub-hint", "data-tl-hub-mind-status": "", role: "status" }, "");
				mindCard.appendChild(state.mindStatus);
				body.appendChild(mindCard);

				// d2) experimental DSH Agent bridge (v1.2.0): permissioned hand-off of the
				// user's typed sentence to a user-selected DSH session. Never auto-triggers.
				const agentCard = hubCreate("section", { "data-tl-hub-agent": "", className: "tl-hub-card tl-hub-agent" }, [
					hubCreate("h3", { className: "tl-hub-card-title" }, TL_T("hub.agent.title")),
				]);
				state.agentStatus = hubCreate("p", { className: "tl-hub-hint", "data-tl-hub-agent-status": "", role: "status" }, TL_T("hub.agent.status.unavailable"));
				agentCard.appendChild(state.agentStatus);
				const agentPermRow = hubCreate("div", { className: "tl-hub-row" });
				state.agentPerm = hubCreate("button", { type: "button", "data-tl-hub-agent-perm": "", className: "tl-hub-btn", "data-tl-hub-agent-granted": "false" }, TL_T("hub.agent.perm.grant"));
				state.agentPerm.addEventListener("click", (event) => runAsync(() => onAgentPermClick(event)));
				agentPermRow.appendChild(state.agentPerm);
				agentCard.appendChild(agentPermRow);
				const agentTargetRow = hubCreate("div", { className: "tl-hub-row" });
				state.agentTarget = hubCreate("select", { "data-tl-hub-agent-target": "", className: "tl-hub-select", "aria-label": TL_T("hub.agent.target.label") });
				state.agentConnect = hubCreate("button", { type: "button", "data-tl-hub-agent-connect": "", className: "tl-hub-btn" }, TL_T("hub.agent.connect"));
				state.agentConnect.addEventListener("click", (event) => runAsync(() => onAgentConnect(event)));
				state.agentDisconnect = hubCreate("button", { type: "button", "data-tl-hub-agent-disconnect": "", className: "tl-hub-btn" }, TL_T("hub.agent.disconnect"));
				state.agentDisconnect.addEventListener("click", () => runAsync(onAgentDisconnect));
				state.agentOpen = hubCreate("button", { type: "button", "data-tl-hub-agent-open": "", className: "tl-hub-btn" }, TL_T("hub.agent.open"));
				state.agentOpen.addEventListener("click", () => runAsync(onAgentOpen));
				agentTargetRow.appendChild(state.agentTarget);
				agentTargetRow.appendChild(state.agentConnect);
				agentTargetRow.appendChild(state.agentDisconnect);
				agentTargetRow.appendChild(state.agentOpen);
				agentCard.appendChild(agentTargetRow);
				state.agentNote = hubCreate("p", { className: "tl-hub-hint", "data-tl-hub-agent-note": "", role: "status" }, "");
				agentCard.appendChild(state.agentNote);
				state.agentHint = hubCreate("p", { className: "tl-hub-hint", "data-tl-hub-agent-hint": "" }, TL_T("hub.agent.hint"));
				agentCard.appendChild(state.agentHint);
				body.appendChild(agentCard);

				// e) permission overview (v1.4.0: safe / medium / 6 grantable high / agent denied)
				const permCard = hubCreate("section", { "data-tl-hub-perms": "", className: "tl-hub-card" }, [
					hubCreate("h3", { className: "tl-hub-card-title" }, TL_T("hub.perm.title")),
					hubCreate("p", { className: "tl-hub-note tl-hub-hint" }, TL_T("hub.perm.hint")),
					hubCreate("p", { className: "tl-hub-perm-note", "data-tl-hub-perm-session-only": "" }, TL_T("hub.perm.sessionOnly")),
				]);
				state.permHighWarning = hubCreate("p", { className: "tl-hub-perm-note", "data-tl-hub-perm-high-warning": "" }, TL_T("hub.perm.highWarning"));
				state.permHighWarning.hidden = true;
				permCard.appendChild(state.permHighWarning);
				state.permRows = hubCreate("div", { className: "tl-hub-perm", "data-tl-hub-perm-list": "" });
				permCard.appendChild(state.permRows);
				state.permStatus = hubCreate("p", { className: "tl-hub-perm-note", "data-tl-hub-perm-status": "", role: "status" }, "");
				permCard.appendChild(state.permStatus);
				body.appendChild(permCard);

				// f) audit + settings hint
				const auditCard = hubCreate("section", { "data-tl-hub-audit-card": "", className: "tl-hub-card" }, [
					hubCreate("h3", { className: "tl-hub-card-title" }, TL_T("hub.audit.title")),
				]);
				state.auditBox = hubCreate("div", { "data-tl-hub-audit": "", className: "tl-hub-audit" });
				auditCard.appendChild(state.auditBox);
				body.appendChild(auditCard);

				// g) self-test + feedback (v1.5.0): diagnostics the user can attach to a report
				const selftestCard = hubCreate("section", { "data-tl-hub-selftest-card": "", className: "tl-hub-card" }, [
					hubCreate("h3", { className: "tl-hub-card-title" }, TL_T("hub.selftest.title")),
					hubCreate("p", { className: "tl-hub-note tl-hub-hint" }, TL_T("hub.selftest.hint")),
				]);
				state.selftestFingerprint = hubCreate("p", { className: "tl-hub-note tl-hub-fingerprint", "data-tl-hub-fingerprint-selftest": "", role: "status" }, TL_T("hub.fingerprint.title") + "：" + TL_T("hub.fingerprint.unavailable"));
				selftestCard.appendChild(state.selftestFingerprint);
				selftestCard.appendChild(hubCreate("p", { className: "tl-hub-note tl-hub-hint", "data-tl-hub-fingerprint-hint": "" }, TL_T("hub.fingerprint.hint")));
				const selftestRow = hubCreate("div", { className: "tl-hub-row" });
				state.selftestRun = hubCreate("button", { type: "button", "data-tl-hub-selftest": "", className: "tl-hub-btn" }, TL_T("hub.selftest.run"));
				state.selftestRun.addEventListener("click", () => runAsync(runSelftest));
				selftestRow.appendChild(state.selftestRun);
				state.selftestCopy = hubCreate("button", { type: "button", "data-tl-hub-selftest-copy": "", className: "tl-hub-btn" }, TL_T("hub.selftest.copy"));
				state.selftestCopy.addEventListener("click", () => runAsync(copySelftest));
				selftestRow.appendChild(state.selftestCopy);
				state.fingerprintCopy = hubCreate("button", { type: "button", "data-tl-hub-fingerprint-copy": "", className: "tl-hub-btn" }, TL_T("hub.fingerprint.copy"));
				state.fingerprintCopy.addEventListener("click", () => runAsync(copyFingerprint));
				selftestRow.appendChild(state.fingerprintCopy);
				selftestCard.appendChild(selftestRow);
				state.selftestSummary = hubCreate("p", { className: "tl-hub-note tl-hub-hint", "data-tl-hub-selftest-summary": "" }, TL_T("hub.selftest.empty"));
				selftestCard.appendChild(state.selftestSummary);
				state.selftestList = hubCreate("div", { className: "tl-hub-selftest-list", "data-tl-hub-selftest-list": "" }, "");
				selftestCard.appendChild(state.selftestList);
				state.selftestNote = hubCreate("p", { className: "tl-hub-note tl-hub-hint", "data-tl-hub-selftest-note": "", role: "status" }, "");
				selftestCard.appendChild(state.selftestNote);
				body.appendChild(selftestCard);
				const feedbackCard = hubCreate("section", { "data-tl-hub-feedback": "", className: "tl-hub-card tl-hub-feedback" }, [
					hubCreate("h3", { className: "tl-hub-card-title" }, TL_T("hub.feedback.title")),
					hubCreate("p", { className: "tl-hub-note tl-hub-hint" }, TL_T("hub.feedback.hint")),
				]);
				state.feedbackFingerprint = hubCreate("p", { className: "tl-hub-note tl-hub-fingerprint", "data-tl-hub-fingerprint-feedback": "", role: "status" }, TL_T("hub.fingerprint.title") + "：" + TL_T("hub.fingerprint.unavailable"));
				feedbackCard.appendChild(state.feedbackFingerprint);
				state.feedbackText = hubCreate("textarea", {
					"data-tl-hub-feedback-text": "",
					className: "tl-hub-input tl-hub-textarea",
					placeholder: TL_T("hub.feedback.placeholder"),
					"aria-label": TL_T("hub.feedback.placeholder"),
					rows: "3",
				});
				feedbackCard.appendChild(state.feedbackText);
				const feedbackRow = hubCreate("div", { className: "tl-hub-row" });
				state.feedbackCopy = hubCreate("button", { type: "button", "data-tl-hub-feedback-copy": "", className: "tl-hub-btn" }, TL_T("hub.feedback.copy"));
				state.feedbackCopy.addEventListener("click", () => onFeedbackCopy());
				feedbackRow.appendChild(state.feedbackCopy);
				state.feedbackIssue = hubCreate("button", { type: "button", "data-tl-hub-feedback-issue": "", className: "tl-hub-btn" }, TL_T("hub.feedback.issue"));
				state.feedbackIssue.addEventListener("click", () => onFeedbackIssue());
				feedbackRow.appendChild(state.feedbackIssue);
				state.feedbackDownload = hubCreate("button", { type: "button", "data-tl-hub-feedback-download": "", className: "tl-hub-btn" }, TL_T("hub.feedback.download"));
				state.feedbackDownload.addEventListener("click", () => onFeedbackDownload());
				feedbackRow.appendChild(state.feedbackDownload);
				feedbackCard.appendChild(feedbackRow);
				state.feedbackStatus = hubCreate("p", { className: "tl-hub-note tl-hub-hint", "data-tl-hub-feedback-status": "", role: "status" }, "");
				feedbackCard.appendChild(state.feedbackStatus);
				body.appendChild(feedbackCard);
				body.appendChild(hubCreate("p", { className: "tl-hub-hint", "data-tl-hub-settings-hint": "" }, TL_T("hub.settingsHint")));

				panel.appendChild(head);
				panel.appendChild(body);
				root.appendChild(mask);
				root.appendChild(panel);
				state.root = root;
				return state;
			};

			// ---- refresh all / open ------------------------------------------------
			const refreshAll = () => {
				if (openState !== true || ui === null) return;
				hubTry(refreshStatus, null, "refresh-status");
				hubTry(() => refreshLifeConfig(false), null, "refresh-life-config");
				hubTry(refreshWeather, null, "refresh-weather");
				hubTry(refreshGlass, null, "refresh-glass");
				hubTry(refreshSplash, null, "refresh-splash");
				hubTry(refreshAi, null, "refresh-ai");
				hubTry(refreshMind, null, "refresh-mind");
				hubTry(refreshAgent, null, "refresh-agent");
			};
			const open = () => {
				if (disposed === true) return false;
				if (openState === true && rootEl !== null) return true;
				if (typeof document === "undefined" || document === null || document.body === null || document.body === undefined) {
					setLastError("open-no-document", new Error("document is unavailable"));
					return false;
				}
				try {
					triggerEl = document.activeElement !== undefined ? document.activeElement : null;
					ui = buildOverlay();
					rootEl = ui.root;
					document.body.appendChild(rootEl);
					document.body.setAttribute("data-tl-hub-open", "");
					openState = true;
					// R8c (REV-R8 F2): any click/change anywhere in the hub disarms an old
					// destructive confirmation before the card handler runs — except a click
					// on the already-armed confirm button itself (its own handler performs the
					// second step). Capture phase is what makes "arm → click elsewhere → click
					// again" impossible for EVERY card action, not just the ten wired by hand.
					const hubElement = rootEl;
					const onAnyCardAction = (event) => {
						const target = event !== null && event !== undefined ? event.target : null;
						const armedButton =
							target !== null && target !== undefined && typeof target.closest === "function"
								? target.closest("[data-tl-hub-confirm='true']")
								: null;
						if (armedButton !== null) return;
						disarmPendingConfirms();
					};
					hubElement.addEventListener("click", onAnyCardAction, true);
					hubElement.addEventListener("change", onAnyCardAction, true);
					confirmCaptureDisposer = () => {
						hubElement.removeEventListener("click", onAnyCardAction, true);
						hubElement.removeEventListener("change", onAnyCardAction, true);
					};
					const win = hubBrowserWindow();
					// R5: the shared overlay stack owns Esc/Tab for this modal. Its
					// onEscape calls close(), which persists the draft before teardown.
					if (overlayDisposer === null) {
						overlayDisposer = tl5OverlayRegister({
							id: "role-hub",
							modal: true,
							root: () => rootEl,
							onEscape: () => close(),
						});
					}
					refreshStatus();
					refreshFingerprint();
					lifeDraftActive = false;
					refreshLifeConfig(true);
					// Restore unfinished edits AFTER the rhythm card has been filled from
					// the engine, otherwise the refresh would overwrite the draft.
					restoreHubDraft();
					refreshWeather();
					refreshGlass();
					refreshSplash();
					refreshAi();
					// plan A: re-probe the host model capability on every open (44 owns the
					// probe; it degrades to a no-op when the brain build predates it).
					refreshHostLlmStatus();
					refreshMind();
					refreshAgent();
					// The pack editor is loaded after the catalog pass (sequentially, so a
					// slow listMedia can never overwrite it with a stale look's pack).
					runAsync(async () => {
						await refreshMedia();
						await loadEffectivePack();
					});
					runAsync(refreshAgentSessions);
					if (win !== null) timer = win.setInterval(refreshAll, HUB_REFRESH_MS);
					try {
						ui.closeButton.focus();
					} catch (error) {
						setLastError("focus", error);
					}
					return true;
				} catch (error) {
					setLastError("open", error);
					hubTry(() => close(), null, "open-cleanup");
					return false;
				}
			};
			const status = () => ({
				version: HUB_VERSION,
				open: openState === true,
				mounted: rootEl !== null,
				dependencies: {
					document: typeof document !== "undefined" && document !== null && document.body !== null && document.body !== undefined,
					life: hubLifeEngine() !== null,
					pet: hubPetBrain() !== null,
					mind: hubPetMind() !== null,
					agent: hubPetAgent() !== null,
					glass: hubGlassDepthController() !== null,
					weather: (() => {
						const snapshot = hubWeatherSnapshot();
						return snapshot !== null && snapshot.runtime === true;
					})(),
				},
				features: {
					mediaDefault: true,
					glassPreview: true,
					glassLive: true,
					splash: true,
					weather: true,
					selftest: true,
					feedback: true,
					mindThinking: true,
				},
				logCount: logEntries.length,
				lastError: lastError,
			});

			const api = {
				version: HUB_VERSION,
				open: () => hubTry(open, false, "api-open"),
				close: () => hubTry(close, undefined, "api-close"),
				status,
			};
			const previousGlobal = hubTry(() => globalThis.tianlightRoleHub, undefined, "api-previous");
			try {
				globalThis.tianlightRoleHub = api;
			} catch (error) {
				setLastError("api-publish", error);
			}
			// v1.3.0: no DSH slots / settings-page registration. The pet menu and the pet
			// context menu call this global directly.

			return () => {
				if (disposed === true) return;
				disposed = true;
				hubTry(() => close(), null, "dispose-close");
				// plan A: release the injected remote scopes (no listener outlives the hub).
				// ctx.inject() returns a cordis Fiber (PromiseLike), not a disposer function;
				// accept either shape and never let teardown throw.
				for (const disposeLlmScope of hubLlmInjectDisposers.splice(0).reverse()) {
					try {
						if (typeof disposeLlmScope === "function") disposeLlmScope();
						else if (disposeLlmScope !== null && disposeLlmScope !== undefined && typeof disposeLlmScope.dispose === "function") disposeLlmScope.dispose();
					} catch (error) {
						note("role-hub:llm-inject-dispose", error);
					}
				}
				hubLlmServiceScope = null;
				hubLlmRemoteScope = null;
				hubLlmProvidersCache = null;
				hubLlmProvidersBusy = false;
				hubLlmProviderSignature = "";
				try {
					if (globalThis.tianlightRoleHub === api) {
						if (previousGlobal === undefined) delete globalThis.tianlightRoleHub;
						else globalThis.tianlightRoleHub = previousGlobal;
					}
				} catch (error) {
					setLastError("dispose-api", error);
				}
				rootEl = null;
				ui = null;
				triggerEl = null;
				agentStatusCache = null;
				agentTargetSignature = "";
				agentSessionsCache = [];
				selftestResults.length = 0;
				weatherBusy = false;
				selftestBusy = false;
				logEntries.length = 0;
			};
		}
		//#endregion
