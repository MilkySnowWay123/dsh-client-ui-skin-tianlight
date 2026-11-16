		//#region pet brain
		/** Normalize any adapter/host error code to the stable route vocabulary. */
		function petNormalizeLlmCode(value) {
			try {
				const code = typeof value === "string" ? value.trim().toLowerCase() : "";
				return PET_LLM_CODES.indexOf(code) >= 0 ? code : "llm-error";
			} catch (error) {
				return "llm-error";
			}
		}

		/** One stable Error for every adapter failure (`petCallLlm` reads `error.code`). */
		function petLlmError(code) {
			const normalized = petNormalizeLlmCode(code);
			const error = new Error("pet-llm:" + normalized);
			error.code = normalized;
			return error;
		}

		/** Normalize the host `capabilities.petLlm` answer into the cached status shape. */
		function petHostLlmNormalize(value) {
			const source = value !== null && typeof value === "object" ? value : {};
			const available = source.available === true;
			const reason = typeof source.reason === "string" ? petClipText(source.reason.trim(), 64) : "";
			return {
				checked: true,
				available,
				reason: available === true ? (reason === "" ? "available" : reason) : reason === "" ? "unknown" : reason,
				provider: typeof source.provider === "string" ? petClipText(source.provider.trim(), 128) : "",
				model: typeof source.model === "string" ? petClipText(source.model.trim(), 128) : "",
			};
		}

		/** Defensive copy of the cached host capability (never a live reference). */
		function petHostLlmStatus() {
			try {
				return {
					checked: petHostLlm.checked === true,
					available: petHostLlm.available === true,
					reason: typeof petHostLlm.reason === "string" ? petHostLlm.reason : "unknown",
					provider: typeof petHostLlm.provider === "string" ? petHostLlm.provider : "",
					model: typeof petHostLlm.model === "string" ? petHostLlm.model : "",
				};
			} catch (error) {
				return { checked: false, available: false, reason: "unknown", provider: "", model: "" };
			}
		}

		/** `"dsh"` = auto-registered built-in adapter, `"adapter"` = user adapter, `"none"`. */
		function petLlmRouting() {
			try {
				if (petAdapter === null) return "none";
				return petAdapter.id === "dsh" ? "dsh" : "adapter";
			} catch (error) {
				return "none";
			}
		}

		/**
		 * Probe `_engines.capabilities.petLlm` and mirror the answer. Never rejects and
		 * never throws: a failed/old host is cached as `host-unavailable` (one DSH restart
		 * may be needed after updating the plugin) and clears a previously auto-registered
		 * built-in adapter. A user-registered non-`dsh` adapter is never touched. Triggered
		 * by install, by the role hub (`refreshHostLlm`) and in the background after a
		 * failed AI call (so a host restart recovers without a page reload).
		 */
		async function petHostLlmProbe() {
			// Only a real page can call the relative host route. A bare Node harness (the
			// Node smoke suite evaluates this bundle with a minimal window stub and a global
			// fetch) must degrade to "host unavailable" silently instead of logging a
			// relative-URL TypeError on every install.
			let pageLocation = null;
			try {
				pageLocation = typeof window !== "undefined" && window !== null ? window.location : null;
			} catch (error) {
				pageLocation = null;
			}
			if (
				typeof fetch !== "function" ||
				pageLocation === null ||
				typeof pageLocation !== "object" ||
				typeof pageLocation.href !== "string" ||
				pageLocation.href === ""
			) {
				petHostLlm = { checked: true, available: false, reason: "host-unavailable", provider: "", model: "" };
				if (petAdapter !== null && petAdapter.id === "dsh") petAdapter = null;
				return petHostLlmStatus();
			}
			let next = { checked: true, available: false, reason: "host-unavailable", provider: "", model: "" };
			try {
				const response = await fetch(ASSET_BASE + "/_engines?api=" + encodeURIComponent(HOST_API), { cache: "no-store" });
				// A real browser Response always carries `ok`; only an explicit HTTP failure is
				// rejected here (an old/partial host body is handled by the JSON checks below).
				if (response === null || typeof response !== "object" || response.ok === false) throw new Error("host-unavailable");
				let payload = null;
				try {
					payload = typeof response.json === "function" ? await response.json() : null;
				} catch (error) {
					payload = null;
				}
				if (payload === null || typeof payload !== "object") throw new Error("host-unavailable");
				// Keep the existing stale-host / restart diagnostics accurate from the answer.
				rememberHostIdentity(payload);
				const capabilities = payload.capabilities !== null && typeof payload.capabilities === "object" ? payload.capabilities : null;
				const petLlm = capabilities !== null && capabilities.petLlm !== null && typeof capabilities.petLlm === "object" ? capabilities.petLlm : null;
				if (petLlm !== null) next = petHostLlmNormalize(petLlm);
			} catch (error) {
				note("pet-brain:host-llm-probe", error);
				next = { checked: true, available: false, reason: "host-unavailable", provider: "", model: "" };
			}
			petHostLlm = next;
			if (next.available === true) {
				// Auto-register into an EMPTY slot only: a user-registered adapter is never
				// overridden, whichever id it uses.
				if (petAdapter === null && petLlmAutoSuppressed !== true) petAdapter = { id: "dsh", chat: petHostLlmChat };
			} else if (petAdapter !== null && petAdapter.id === "dsh") {
				petAdapter = null;
			}
			return petHostLlmStatus();
		}

		/**
		 * Built-in `{ id:"dsh", chat }` adapter for `petCallLlm`. `payload.system` is
		 * IGNORED on purpose: the system prompt is fixed on the host side. Only the
		 * bounded content string and (when the user chose them) the provider id and
		 * model id are sent. v2.2.0 sends the model too, so picking Claude / Grok / any
		 * other DSH-configured route actually reaches that model instead of the default
		 * one. Every failure throws an Error with a stable `code`; petChat exposes it as
		 * the additive `llmError`.
		 */
		async function petHostLlmChat(payload) {
			const messages = payload !== null && typeof payload === "object" && Array.isArray(payload.messages) ? payload.messages : [];
			const first = messages.length > 0 && messages[0] !== null && typeof messages[0] === "object" ? messages[0].content : "";
			const text = typeof first === "string" ? first : "";
			if (text === "") throw petLlmError("invalid-request");
			const body = { text };
			// v2.2.0: provider and model travel together; either may be null to follow
			// the DSH default (a lone model id is valid and means "that model of the
			// default provider").
			if (petLlmProvider !== null) body.provider = petLlmProvider;
			if (petLlmModel !== null) body.model = petLlmModel;
			let timer = 0;
			let controller = null;
			try {
				if (typeof fetch !== "function") throw petLlmError("host-unavailable");
				if (typeof AbortController === "function") controller = new AbortController();
				timer = window.setTimeout(() => {
					// The 20s brain-side race is the outer deadline; this 25s abort only
					// releases the socket/reader of an abandoned call.
					try {
						if (controller !== null) controller.abort();
					} catch (error) {
						// abort is best-effort
					}
				}, PET_HOST_LLM_FETCH_TIMEOUT_MS);
				const request = {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify(body),
				};
				if (controller !== null) request.signal = controller.signal;
				const response = await fetch(PET_HOST_LLM_ROUTE, request);
				let data = null;
				try {
					data = response !== null && typeof response === "object" && typeof response.json === "function" ? await response.json() : null;
				} catch (error) {
					data = null;
				}
				if (data !== null && typeof data === "object" && data.ok === true && typeof data.text === "string") return data.text;
				// The host only ever answers `{ok:false, code}`; map anything else defensively.
				if (data !== null && typeof data === "object" && typeof data.code === "string") throw petLlmError(data.code);
				const status = response !== null && typeof response === "object" ? Number(response.status) : 0;
				if (status === 404 || status === 405 || status === 501) throw petLlmError("host-unavailable");
				throw petLlmError("llm-error");
			} catch (error) {
				const code = error !== null && typeof error === "object" && typeof error.code === "string" ? error.code : "";
				if (PET_LLM_CODES.indexOf(code) >= 0) throw error;
				const name = error !== null && typeof error === "object" && typeof error.name === "string" ? error.name : "";
				throw petLlmError(name === "AbortError" ? "timeout" : "host-unavailable");
			} finally {
				if (timer !== 0) {
					try {
						window.clearTimeout(timer);
					} catch (error) {
						// the timeout already fired; nothing to clear
					}
				}
			}
		}

		/**
		 * A granted `llm` capability with no adapter at all means the host exposes no
		 * usable model (or this browser half shipped before the host was restarted). The
		 * host's own reason decides which hint the bubble shows; nothing was called, so
		 * no quota is consumed and no audit entry is written for it.
		 */
		function petHostLlmUnavailableCode() {
			try {
				if (PET_HOST_LLM_UNCONFIGURED_REASONS.indexOf(petHostLlm.reason) >= 0) return "unconfigured-model";
			} catch (error) {
				// fall through to the generic host reason
			}
			return "host-unavailable";
		}

		/** Stable code -> i18n key (unknown codes fall back to the generic hint). */
		function petLlmHintKey(code) {
			const normalized = petNormalizeLlmCode(typeof code === "string" ? code : "");
			const key = Object.prototype.hasOwnProperty.call(PET_LLM_HINT_KEYS, normalized) ? PET_LLM_HINT_KEYS[normalized] : "";
			return key !== "" ? key : "pet.chat.llmHint.default";
		}

		/** Localized "replied locally because…" hint shared by the bubble and hub. */
		function petLlmHintText(code) {
			try {
				return TL_T(petLlmHintKey(code));
			} catch (error) {
				return TL_T("pet.chat.llmHint.default");
			}
		}

		/** Persisted provider choice (a plain string; null = follow the DSH default). */
		function petReadLlmProvider() {
			try {
				const storage = petStorage();
				if (storage === null) return null;
				const raw = storage.getItem(PET_LLM_PROVIDER_KEY);
				if (typeof raw !== "string") return null;
				const provider = raw.trim();
				if (provider === "" || provider.length > 128) return null;
				return provider;
			} catch (error) {
				return null;
			}
		}

		function petSaveLlmProvider() {
			try {
				const storage = petStorage();
				if (storage === null) return;
				if (petLlmProvider === null) {
					if (typeof storage.removeItem === "function") storage.removeItem(PET_LLM_PROVIDER_KEY);
				} else {
					storage.setItem(PET_LLM_PROVIDER_KEY, petLlmProvider);
				}
			} catch (error) {
				note("pet-brain:llm-provider-save", error);
			}
		}

		/**
		 * The role hub selects a provider (and, since v2.2.0, a model too). `null`/"" =
		 * follow the DSH default; a string is trimmed and capped at 128 chars. Changing
		 * the provider clears the saved model. Returns `{ok:true, provider}` or
		 * `{ok:false, reason:"invalid-provider"}`.
		 */
		function petSetLlmProvider(value) {
			try {
				if (value === null || value === undefined || value === "") {
					petLlmProvider = null;
					// v2.2.0: a model id belongs to the provider that served it.
					petLlmModel = null;
					petSaveLlmProvider();
					petSaveLlmModel();
					return { ok: true, provider: null };
				}
				if (typeof value !== "string") return { ok: false, reason: "invalid-provider" };
				const provider = value.trim();
				if (provider === "") {
					petLlmProvider = null;
					petLlmModel = null;
					petSaveLlmProvider();
					petSaveLlmModel();
					return { ok: true, provider: null };
				}
				if (provider.length > 128) return { ok: false, reason: "invalid-provider" };
				if (petLlmProvider !== provider) petLlmModel = null;
				petLlmProvider = provider;
				petSaveLlmProvider();
				if (petLlmModel === null) petSaveLlmModel();
				return { ok: true, provider };
			} catch (error) {
				note("pet-brain:set-llm-provider", error);
				return { ok: false, reason: "internal-error" };
			}
		}

		/** Persisted model id (null = follow the DSH default model). */
		function petReadLlmModel() {
			try {
				const storage = petStorage();
				if (storage === null) return null;
				const raw = storage.getItem(PET_LLM_MODEL_KEY);
				if (typeof raw !== "string") return null;
				const model = raw.trim();
				if (model === "" || model.length > 200) return null;
				return model;
			} catch (error) {
				return null;
			}
		}

		function petSaveLlmModel() {
			try {
				const storage = petStorage();
				if (storage === null) return;
				if (petLlmModel === null) {
					if (typeof storage.removeItem === "function") storage.removeItem(PET_LLM_MODEL_KEY);
				} else {
					storage.setItem(PET_LLM_MODEL_KEY, petLlmModel);
				}
			} catch (error) {
				note("pet-brain:llm-model-save", error);
			}
		}

		/**
		 * v2.2.0: the role hub selects a model in addition to a provider, so a Grok /
		 * Claude (or any DSH-configured) route can actually be reached. `null`/"" =
		 * follow the DSH default model. A model without a provider choice is valid
		 * (choose a model of the default provider). Returns `{ok:true, model}` or
		 * `{ok:false, reason}`.
		 */
		function petSetLlmModel(value) {
			try {
				if (value === null || value === undefined || value === "") {
					petLlmModel = null;
					petSaveLlmModel();
					return { ok: true, model: null };
				}
				if (typeof value !== "string") return { ok: false, reason: "invalid-model" };
				const model = value.trim();
				if (model === "") {
					petLlmModel = null;
					petSaveLlmModel();
					return { ok: true, model: null };
				}
				if (model.length > 200) return { ok: false, reason: "invalid-model" };
				petLlmModel = model;
				petSaveLlmModel();
				return { ok: true, model };
			} catch (error) {
				note("pet-brain:set-llm-model", error);
				return { ok: false, reason: "internal-error" };
			}
		}

		/**
		 * v2.2.0: read the model ids one registered provider serves. This is the only
		 * new network call in the brain and it is the same same-origin, read-only host
		 * route the chat uses; the payload contains no text and no credentials. Returns
		 * `{ok:true, provider, models:[{id,name}]}` or `{ok:false, code}`; never throws.
		 */
		async function petHostModels(provider) {
			const wanted = typeof provider === "string" ? provider.trim() : "";
			if (wanted === "" || wanted.length > 128) return { ok: false, code: "invalid-request" };
			if (typeof fetch !== "function") return { ok: false, code: "host-unavailable" };
			let controller = null;
			let timer = 0;
			try {
				if (typeof AbortController === "function") controller = new AbortController();
				timer = window.setTimeout(() => {
					try {
						if (controller !== null) controller.abort();
					} catch (error) {
						// abort is best-effort
					}
				}, PET_HOST_MODELS_FETCH_TIMEOUT_MS);
				const request = {
					method: "GET",
					headers: { accept: "application/json" },
					cache: "no-store",
				};
				if (controller !== null) request.signal = controller.signal;
				const response = await fetch(PET_HOST_MODELS_ROUTE + "?provider=" + encodeURIComponent(wanted), request);
				let data = null;
				try {
					data = response !== null && typeof response === "object" && typeof response.json === "function" ? await response.json() : null;
				} catch (error) {
					data = null;
				}
				if (data !== null && typeof data === "object" && data.ok === true && Array.isArray(data.models)) {
					const models = [];
					for (const entry of data.models) {
						if (models.length >= 200) break;
						if (entry === null || typeof entry !== "object") continue;
						const id = typeof entry.id === "string" ? petClipText(entry.id.trim(), 200) : "";
						if (id === "") continue;
						const name = typeof entry.name === "string" && entry.name.trim() !== "" ? petClipText(entry.name.trim(), 200) : id;
						models.push({ id, name });
					}
					return { ok: true, provider: wanted, models };
				}
				const code = data !== null && typeof data === "object" && typeof data.code === "string" ? petNormalizeLlmCode(data.code) : "models-unavailable";
				return { ok: false, code };
			} catch (error) {
				const name = error !== null && typeof error === "object" && typeof error.name === "string" ? error.name : "";
				return { ok: false, code: name === "AbortError" ? "timeout" : "host-unavailable" };
			} finally {
				if (timer !== 0) {
					try {
						window.clearTimeout(timer);
					} catch (error) {
						// the timeout already fired
					}
				}
			}
		}

		// ---- module state -------------------------------------------------------
		// One brain per page. Persisted bits are re-read on install; the ring log and
		// the rate windows live in memory only (they are diagnostics, not facts).
		let petInstalled = false;
		let petPaused = false;
		let petPauseAt = 0;
		let petGrants = {};
		let petAdapter = null;
		/**
		 * v2.0.0: last cached `_engines.capabilities.petLlm` answer. `reason` is the host's
		 * own availability reason ("unknown" before the first probe); provider/model are
		 * the host's CURRENT DSH default selection (informational only — the model always
		 * follows that default). `checked` distinguishes "not probed yet" from "unavailable".
		 */
		let petHostLlm = { checked: false, available: false, reason: "unknown", provider: "", model: "" };
		/** The provider id the user picked in the role hub; null = follow the DSH default. */
		let petLlmProvider = null;
		/** v2.2.0: the model id the user picked; null = follow the DSH default model. */
		let petLlmModel = null;
		/**
		 * v2.0.0: after an explicit `clearLLM()` the page keeps honouring that choice for
		 * its lifetime; only a page reload lets the host capability probe auto-register
		 * the built-in adapter again. Without this flag the next background probe would
		 * silently undo the user's "detach the model" action.
		 */
		let petLlmAutoSuppressed = false;
		// Adapters for the six HIGH-risk capabilities (network/files/shell/approve/
		// message/install), registered by the user/host at runtime. Functions are kept
		// in memory only and are never persisted. R4A: a reload clears the adapters
		// AND the medium/high grants (session-only), so both must be re-established
		// after every load; only safe capability bits persist.
		let petCapabilityAdapters = {};
		/**
		 * R4A: one-shot consent ticket for a medium/high grant. The role hub obtains
		 * it through `petRequestUiConsent()` in this same closure immediately before
		 * calling `grant`; the grant accepts ONLY that object identity, never a fixed
		 * string. A same-page script can replace any global, but it cannot reach this
		 * closure variable or mint a ticket for the UI.
		 */
		let petConsentTicket = null;
		let petAi = { dayKey: "", usedToday: 0, dailyLimit: PET_DAILY_LIMIT_DEFAULT };
		let petTurns = 0;
		let petTodayTurns = 0;
		let petTodayKey = "";
		let petLastReplyAt = 0;
		let petAuditRing = [];
		let petLocalMinute = [];
		let petLocalDay = { dayKey: "", count: 0 };
		let petLlmMinute = { bucket: -1, count: 0 };
		// v1.6.8 private thinking: persisted state, loop handle and subscribers.
		let petMindState = petMindFallbackState();
		let petMindTimer = 0;
		let petMindBusy = false;
		const petMindSubscribers = new Set();
		/** Recently spoken local chat lines, used to avoid mechanical repetition. */
		let petLocalReplyRing = [];
		/** Rotation seed so consecutive context replies vary even with a small pool. */
		let petLocalReplySeed = 0;

		// ---- small helpers ------------------------------------------------------
		function petStorage() {
			try {
				const storage = globalThis.localStorage;
				if (storage === null || storage === undefined) return null;
				if (typeof storage.getItem !== "function" || typeof storage.setItem !== "function") return null;
				return storage;
			} catch (error) {
				return null;
			}
		}

		function petReadJson(key) {
			try {
				const storage = petStorage();
				if (storage === null) return null;
				const raw = storage.getItem(key);
				if (typeof raw !== "string" || raw === "") return null;
				const parsed = JSON.parse(raw);
				return parsed !== null && typeof parsed === "object" ? parsed : null;
			} catch (error) {
				return null;
			}
		}

		function petWriteJson(key, value) {
			try {
				const storage = petStorage();
				if (storage === null) return false;
				storage.setItem(key, JSON.stringify(value));
				return true;
			} catch (error) {
				note("pet-brain:persist", error);
				return false;
			}
		}

		function petNumber(value, fallback) {
			const number = Number(value);
			return Number.isFinite(number) ? number : fallback;
		}

		function petClampInt(value, min, max, fallback) {
			const number = Number(value);
			if (Number.isFinite(number) === false) return fallback;
			return Math.min(max, Math.max(min, Math.round(number)));
		}

		function petNonNegativeInt(value, fallback) {
			const number = petNumber(value, fallback);
			if (number <= 0) return 0;
			return Math.min(9007199254740991, Math.floor(number));
		}

		function petDayKey(nowInput) {
			const now = petNumber(nowInput, Date.now());
			const date = new Date(now);
			const month = String(date.getMonth() + 1).padStart(2, "0");
			const day = String(date.getDate()).padStart(2, "0");
			return date.getFullYear() + "-" + month + "-" + day;
		}

		/** Remove control characters from anything that leaves the brain. */
		function petStripControls(value) {
			try {
				return String(value).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "");
			} catch (error) {
				return "";
			}
		}

		function petClipText(value, max) {
			try {
				const text = String(value);
				if (text.length <= max) return text;
				return text.slice(0, Math.max(0, max)).replace(/\s+$/, "");
			} catch (error) {
				return "";
			}
		}

		function petPeriodLabel(period) {
			const key = typeof period === "string" ? PET_PERIOD_KEYS[period] : undefined;
			return typeof key === "string" ? TL_T(key) : typeof period === "string" ? period : "";
		}

		// ---- capability model ---------------------------------------------------
		function petDefaultGrants() {
			const grants = {};
			for (const cap of PET_SAFE_CAPS) grants[cap] = true;
			for (const cap of PET_MEDIUM_CAPS) grants[cap] = false;
			for (const cap of PET_HIGH_CAPS) grants[cap] = false;
			for (const cap of PET_FORBIDDEN_CAPS) grants[cap] = false;
			return grants;
		}

		/**
		 * Load persisted grants. R4A: only SAFE capabilities are trusted from disk;
		 * medium/high bits (llm / agentChat / the six high-risk ones) are session-only
		 * and always start false, no matter what localStorage or an imported recipe
		 * says. This is the "reload requires re-authorization" boundary in code.
		 */
		function petLoadPermissions() {
			const grants = petDefaultGrants();
			try {
				const raw = petReadJson(PET_PERMISSIONS_KEY);
				if (raw === null) return grants;
				// Accept both the nested shape this build writes and a flat map.
				const source = raw.granted !== null && typeof raw.granted === "object" ? raw.granted : raw;
				if (source === null || typeof source !== "object") return grants;
				for (const cap of PET_SAFE_CAPS) {
					if (typeof source[cap] === "boolean") grants[cap] = source[cap];
				}
				// Any legacy medium/high bit in storage is ignored on purpose; the next
				// save rewrites the document with safe bits only.
			} catch (error) {
				note("pet-brain:permissions-load", error);
			}
			return grants;
		}

		function petSavePermissions() {
			const persisted = {};
			for (const cap of PET_SAFE_CAPS) persisted[cap] = petGrants[cap] === true;
			// R4A: medium/high grants live in this page's memory only. Persisting them
			// would let a reload / another browser read a stale "already allowed" bit,
			// which is exactly the hole this pass closes. The permanently forbidden
			// capability is never written either (no code path can grant it).
			petWriteJson(PET_PERMISSIONS_KEY, { version: PET_VERSION, granted: persisted, sessionOnly: PET_SESSION_ONLY_CAPS.slice() });
		}

		/**
		 * R4A migration: if an older build persisted medium/high bits (or a recipe
		 * import wrote them into localStorage), rewrite the document with safe bits
		 * only. Only writes when a legacy bit is actually present, so a normal reload
		 * does not churn the synced settings revision.
		 */
		function petScrubPersistedPermissions() {
			try {
				const raw = petReadJson(PET_PERMISSIONS_KEY);
				if (raw === null || typeof raw !== "object") return;
				const source = raw.granted !== null && typeof raw.granted === "object" ? raw.granted : raw;
				if (source === null || typeof source !== "object") return;
				let legacy = false;
				for (const cap of PET_SESSION_ONLY_CAPS) {
					if (typeof source[cap] === "boolean") legacy = true;
				}
				if (legacy === true) petSavePermissions();
			} catch (error) {
				note("pet-brain:permissions-scrub", error);
			}
		}

		function petPermissionMap() {
			const map = {};
			for (const cap of PET_SAFE_CAPS) map[cap] = petGrants[cap] === true;
			for (const cap of PET_MEDIUM_CAPS) map[cap] = petGrants[cap] === true;
			for (const cap of PET_HIGH_CAPS) map[cap] = petGrants[cap] === true;
			for (const cap of PET_FORBIDDEN_CAPS) map[cap] = false;
			return map;
		}

		/**
		 * Permission matrix for the role hub. R4A: adapter-based capabilities carry
		 * `adapter:true|false` so the UI can say "no adapter (not enabled)" instead of
		 * claiming a plain "granted" for something that has no implementation. The
		 * skin itself never calls `invokeCapability`; a grant is only a gate.
		 */
		function petPermissionRows() {
			const rows = [];
			for (const cap of PET_SAFE_CAPS) {
				rows.push({ id: cap, granted: petGrants[cap] === true, grantable: true, risk: "safe" });
			}
			for (const cap of PET_MEDIUM_CAPS) {
				const adapter = cap === "llm" ? petAdapter !== null : undefined;
				rows.push({ id: cap, granted: petGrants[cap] === true, grantable: true, risk: "medium", adapter });
			}
			for (const cap of PET_HIGH_CAPS) {
				rows.push({
					id: cap,
					granted: petGrants[cap] === true,
					grantable: true,
					risk: "high",
					adapter: Object.prototype.hasOwnProperty.call(petCapabilityAdapters, cap),
				});
			}
			for (const cap of PET_FORBIDDEN_CAPS) {
				rows.push({ id: cap, granted: false, grantable: false, risk: "forbidden" });
			}
			return rows;
		}

		function petGranted(cap) {
			try {
				if (typeof cap !== "string") return false;
				if (PET_FORBIDDEN_CAPS.indexOf(cap) >= 0) return false;
				if (PET_GRANTABLE_CAPS.indexOf(cap) < 0) return false;
				return petGrants[cap] === true;
			} catch (error) {
				return false;
			}
		}

		function petCapabilityRequest(value) {
			return typeof value === "string" ? value.slice(0, 32) : "";
		}

		/**
		 * R4A: mint the one-shot consent ticket the role hub passes to `grant`.
		 * Read-only callers cannot reach this function: it is a same-closure declaration
		 * and is NOT published on `globalThis.tianlightPet`. The ticket is consumed by
		 * the next successful `grant` and expires quickly, so a stale ticket cannot be
		 * replayed by a script that somehow observed one.
		 */
		function petRequestUiConsent(cap) {
			const id = petCapabilityRequest(cap);
			if (PET_CONSENT_CAPS.indexOf(id) < 0) return null;
			petConsentTicket = { cap: id, at: Date.now() };
			return petConsentTicket;
		}

		function petConsentTicketValid(ticket, id) {
			if (ticket === null || typeof ticket !== "object") return false;
			if (ticket !== petConsentTicket) return false; // object identity, never a shape/string
			if (ticket.cap !== id) return false;
			if (Date.now() - ticket.at > PET_CONSENT_TICKET_TTL_MS) return false;
			return true;
		}

		/**
		 * R4A: the DSH-Agent bridge authorizes through THIS closure state, never via
		 * `globalThis.tianlightPet` (a same-page script can replace any global). The
		 * bridge fragment (src/48-pet-agent.js) calls these two functions directly.
		 */
		function petAgentChatAllowed() {
			return petInstalled === true && petPaused !== true && petGranted("agentChat") === true;
		}

		function petAgentPaused() {
			return petPaused === true;
		}

		/**
		 * Grant a capability. The permanently forbidden `agent` capability and unknown
		 * ids are rejected before any state is touched. Safe capabilities toggle
		 * freely; medium + high risk capabilities additionally require the one-shot
		 * consent ticket minted by `petRequestUiConsent()` from the role hub (R4A).
		 * The ticket is an object identity inside this closure, not a fixed string:
		 * before R4A any page script could replay `{consent:"user-explicit"}`.
		 */
		function petGrant(cap, options) {
			try {
				const id = petCapabilityRequest(cap);
				if (PET_FORBIDDEN_CAPS.indexOf(id) >= 0) {
					petAudit("grant", id, false, { reason: "hard-denied" });
					return { ok: false, reason: "hard-denied" };
				}
				if (PET_GRANTABLE_CAPS.indexOf(id) < 0) {
					petAudit("grant", id, false, { reason: "unknown-capability" });
					return { ok: false, reason: "unknown-capability" };
				}
				if (PET_CONSENT_CAPS.indexOf(id) >= 0) {
					const consent = options !== null && typeof options === "object" ? options.consent : undefined;
					if (petConsentTicketValid(consent, id) === false) {
						petAudit("grant", id, false, { reason: "consent-required" });
						return { ok: false, reason: "consent-required" };
					}
					// One-shot even if the grant below throws.
					petConsentTicket = null;
				}
				petGrants[id] = true;
				// R4A: only safe bits are persisted. A session-only grant changes no
				// persisted state, so writing the document here would churn the synced
				// settings revision for nothing.
				if (PET_SAFE_CAPS.indexOf(id) >= 0) petSavePermissions();
				petAudit("grant", id, true, {});
				return { ok: true, capability: id, granted: true };
			} catch (error) {
				note("pet-brain:grant", error);
				return { ok: false, reason: "internal-error" };
			}
		}

		function petRevoke(cap) {
			try {
				const id = petCapabilityRequest(cap);
				if (PET_FORBIDDEN_CAPS.indexOf(id) >= 0) {
					petAudit("revoke", id, false, { reason: "hard-denied" });
					return { ok: false, reason: "hard-denied" };
				}
				if (PET_GRANTABLE_CAPS.indexOf(id) < 0) {
					petAudit("revoke", id, false, { reason: "unknown-capability" });
					return { ok: false, reason: "unknown-capability" };
				}
				petGrants[id] = false;
				// R4A: session-only caps are not persisted (see petGrant).
				if (PET_SAFE_CAPS.indexOf(id) >= 0) petSavePermissions();
				petAudit("revoke", id, true, {});
				return { ok: true, capability: id, granted: false };
			} catch (error) {
				note("pet-brain:revoke", error);
				return { ok: false, reason: "internal-error" };
			}
		}

		// ---- pause / AI state / rate windows ------------------------------------
		function petLoadPause() {
			try {
				const storage = petStorage();
				if (storage === null) return false;
				const raw = storage.getItem(PET_PAUSE_KEY);
				if (raw === null || raw === "") return false;
				if (raw === "true" || raw === "1") return true;
				const parsed = JSON.parse(raw);
				if (parsed === true) return true;
				if (parsed !== null && typeof parsed === "object") {
					petPauseAt = petNonNegativeInt(parsed.at, 0);
					return parsed.paused === true;
				}
				return false;
			} catch (error) {
				return false;
			}
		}

		function petSavePause() {
			petWriteJson(PET_PAUSE_KEY, { version: PET_VERSION, paused: petPaused === true, at: petPauseAt });
		}

		function petLoadAi() {
			const today = petDayKey(Date.now());
			const fallback = { dayKey: today, usedToday: 0, dailyLimit: PET_DAILY_LIMIT_DEFAULT };
			try {
				const raw = petReadJson(PET_AI_KEY);
				if (raw === null) return fallback;
				const dayKey = typeof raw.dayKey === "string" ? raw.dayKey : "";
				const dailyLimit = petClampInt(raw.dailyLimit, 1, PET_DAILY_LIMIT_MAX, PET_DAILY_LIMIT_DEFAULT);
				const usedToday = petNonNegativeInt(raw.usedToday, 0);
				return { dayKey, usedToday: dayKey === today ? usedToday : 0, dailyLimit };
			} catch (error) {
				return fallback;
			}
		}

		function petSaveAi() {
			petWriteJson(PET_AI_KEY, {
				version: PET_VERSION,
				dayKey: petAi.dayKey,
				usedToday: petNonNegativeInt(petAi.usedToday, 0),
				dailyLimit: petAi.dailyLimit,
			});
		}

		/** Calendar-day rollover: local counters and the LLM daily quota reset. */
		function petEnsureDay(nowInput) {
			const now = petNumber(nowInput, Date.now());
			const dayKey = petDayKey(now);
			if (petAi.dayKey !== dayKey) {
				petAi.dayKey = dayKey;
				petAi.usedToday = 0;
				petSaveAi();
			}
			if (petLocalDay.dayKey !== dayKey) petLocalDay = { dayKey, count: 0 };
			if (petTodayKey !== dayKey) {
				petTodayKey = dayKey;
				petTodayTurns = 0;
			}
			return dayKey;
		}

		function petLlmMinuteCount(now) {
			const bucket = Math.floor(now / 60000);
			if (petLlmMinute.bucket !== bucket) return 0;
			return petNonNegativeInt(petLlmMinute.count, 0);
		}

		function petLlmQuota(now) {
			petEnsureDay(now);
			if (petAi.usedToday >= petAi.dailyLimit) return { ok: false, reason: "daily-quota" };
			if (petLlmMinuteCount(now) >= PET_MINUTE_CALL_LIMIT) return { ok: false, reason: "minute-quota" };
			return { ok: true };
		}

		function petChargeLlm(now) {
			petEnsureDay(now);
			petAi.usedToday = petNonNegativeInt(petAi.usedToday, 0) + 1;
			petSaveAi();
			const bucket = Math.floor(now / 60000);
			if (petLlmMinute.bucket !== bucket) petLlmMinute = { bucket, count: 0 };
			petLlmMinute.count = petNonNegativeInt(petLlmMinute.count, 0) + 1;
		}

		function petLocalRateOk(now) {
			petLocalMinute = petLocalMinute.filter((stamp) => now - stamp < 60000);
			if (petLocalMinute.length >= PET_LOCAL_MINUTE_LIMIT) return false;
			petEnsureDay(now);
			if (petLocalDay.count >= PET_LOCAL_DAILY_LIMIT) return false;
			return true;
		}

		// ---- audit ring ---------------------------------------------------------
		/**
		 * Ring buffer of the last 60 allow/deny decisions. Entry shape is part of the
		 * UI contract (docs/AI-PET-PERMISSIONS.md §5): no user text, no adapter
		 * objects, only metadata — the log is local and must stay safe to display.
		 */
		function petAudit(action, cap, ok, detail) {
			try {
				const entry = {
					at: Date.now(),
					action: petClipText(action, 24),
					cap: petClipText(cap ?? "", 32),
					ok: ok === true,
				};
				if (detail !== null && typeof detail === "object") {
					if (typeof detail.reason === "string" && detail.reason !== "") entry.reason = petClipText(detail.reason, 64);
					if (typeof detail.source === "string" && detail.source !== "") entry.source = petClipText(detail.source, 16);
					const chars = Number(detail.chars);
					if (Number.isFinite(chars) && chars >= 0) entry.chars = Math.min(100000, Math.floor(chars));
				}
				petAuditRing.push(entry);
				if (petAuditRing.length > PET_AUDIT_MAX) petAuditRing.splice(0, petAuditRing.length - PET_AUDIT_MAX);
				return entry;
			} catch (error) {
				return null;
			}
		}

		function petAuditRead(limit) {
			try {
				const value = Number(limit);
				const max = Number.isFinite(value)
					? Math.min(PET_AUDIT_MAX, Math.max(1, Math.round(value)))
					: PET_AUDIT_DEFAULT_LIMIT;
				return petAuditRing
					.slice(Math.max(0, petAuditRing.length - max))
					.reverse()
					.map((entry) => ({ ...entry }));
			} catch (error) {
				return [];
			}
		}

		/**
		 * External audit write path for the skin's own agent bridge
		 * (src/48-pet-agent.js). Internal modules / audit use ONLY: this is the single
		 * way the agent fragment can append its allow/deny decisions to the same ring
		 * the brain and the role hub display. The record shape is validated strictly
		 * (documented action set + the 15 capability ids) so a malformed or accidental
		 * entry can never corrupt the ring or smuggle arbitrary payloads into it.
		 * Invalid input returns `{ ok:false, reason:"invalid-audit" }` and writes
		 * nothing; the ring keeps its 60-entry cap and newest-first read order.
		 */
		function petRecordExternal(entry) {
			try {
				if (entry === null || typeof entry !== "object" || Array.isArray(entry)) return { ok: false, reason: "invalid-audit" };
				for (const key of Object.keys(entry)) {
					if (key !== "action" && key !== "cap" && key !== "ok" && key !== "reason" && key !== "source" && key !== "chars") {
						return { ok: false, reason: "invalid-audit" };
					}
				}
				const action = typeof entry.action === "string" ? entry.action : "";
				if (PET_AUDIT_ACTIONS.indexOf(action) < 0) return { ok: false, reason: "invalid-audit" };
				const cap = typeof entry.cap === "string" ? entry.cap : "";
				if (PET_AUDIT_CAPS.indexOf(cap) < 0) return { ok: false, reason: "invalid-audit" };
				if (typeof entry.ok !== "boolean") return { ok: false, reason: "invalid-audit" };
				if (entry.reason !== undefined && typeof entry.reason !== "string") return { ok: false, reason: "invalid-audit" };
				if (entry.source !== undefined && typeof entry.source !== "string") return { ok: false, reason: "invalid-audit" };
				if (entry.chars !== undefined && (typeof entry.chars !== "number" || Number.isFinite(entry.chars) === false || entry.chars < 0)) {
					return { ok: false, reason: "invalid-audit" };
				}
				petAudit(action, cap, entry.ok === true, {
					reason: typeof entry.reason === "string" && entry.reason !== "" ? entry.reason : undefined,
					source: typeof entry.source === "string" && entry.source !== "" ? entry.source : undefined,
					chars: typeof entry.chars === "number" ? entry.chars : undefined,
				});
				return { ok: true };
			} catch (error) {
				note("pet-brain:record-external", error);
				return { ok: false, reason: "invalid-audit" };
			}
		}

		// ---- read-only bridges to the skin's own engines -----------------------
		function petLife() {
			try {
				// S1: prefer the life engine's same-closure bridge; the global is only a
				// fallback for a stripped harness. This keeps pause/quiet/focus gates
				// authoritative even if a page script replaces globalThis.tianlightLife.
				const bridgeLife = companionDutyBridge.life;
				if (bridgeLife !== null && bridgeLife !== undefined && typeof bridgeLife.status === "function") return bridgeLife;
			} catch (error) {
				// missing bridge: fall through to the documented global
			}
			try {
				const life = globalThis.tianlightLife;
				return life !== null && life !== undefined && typeof life === "object" ? life : null;
			} catch (error) {
				return null;
			}
		}

		function petLifeStatus() {
			try {
				const life = petLife();
				if (life === null || typeof life.status !== "function") return null;
				const status = life.status();
				return status !== null && typeof status === "object" ? status : null;
			} catch (error) {
				return null;
			}
		}

		function petGlassState() {
			try {
				if (typeof glassDepthController === "undefined" || glassDepthController === null) return null;
				const depth = typeof glassDepthController.read === "function" ? glassDepthController.read() : "";
				const effective = typeof glassDepthController.effective === "function" ? glassDepthController.effective() : depth;
				return { depth: String(depth ?? ""), effective: String(effective ?? "") };
			} catch (error) {
				return null;
			}
		}

		// ---- local brain: intent classification ---------------------------------
		/**
		 * Ordered keyword classifier (zh + en, both checked regardless of UI
		 * language). Safety topics (install/execute/network/files/approve/message)
		 * are matched first so they can never be spoofed into an action intent.
		 */
		function petClassify(text) {
			try {
				const raw = typeof text === "string" ? text : "";
				if (raw === "") return "fallback";
				if (
					/(安装|执行|运行|命令|脚本|终端|联网|上网|网络|下载|上传|读文件|写文件|文件|文件夹|批准|审批|发消息|发送消息|消息给|密码|凭据|令牌|密钥|删除|格式化|工具调用|会话|工作区)/.test(raw) ||
					/(install|execute|\brun\b|shell|\bcommand\b|\bscript\b|network|internet|online|download|upload|\bfile\b|folder|approve|approval|send\s+(?:a\s+)?message|message\s+to|password|credential|api\s*key|secret|token|delete|format\s+disk|tool\s*call|session|workspace)/i.test(raw)
				) {
					return "forbidden";
				}
				if (/(静音|安静(?:一|会|点|下)|别说话|闭嘴|不要说话)|(\bmute\b|stop\s+talking|quiet\s+(?:for|down)|silence)/i.test(raw)) return "mute";
				if (/(开始|进入|打开|来).{0,3}专注|专注.{0,2}(开始|25|二十五)|start\s+(?:a\s+)?focus|begin\s+focus|focus\s+for\s+25|start\s+focusing/i.test(raw)) {
					return "focus-start";
				}
				if (/(停止|结束|取消|退出|关闭).{0,3}专注|stop\s+focus|end\s+focus|cancel\s+focus|stop\s+focusing/i.test(raw)) return "focus-stop";
				if (/(专注.{0,4}(状态|吗|中|多久|还在|查询|情况))|在专注|focus(?:ing)?\s+(?:status|query|state|now)|are\s+you\s+focusing|how\s+long.{0,12}focus/i.test(raw)) {
					return "focus-query";
				}
				if (/(玻璃|磨砂|质感|通透|透明|模糊)|(\bglass\b|frosted|blurry|\bblur\b|texture)/i.test(raw)) return "glass";
				if (/(形象|图片|视频|换图|外观|长什么样)|(\blook\b|appearance|avatar|\bimage\b|\bvideo\b|\bmedia\b|pet\s*art)/i.test(raw)) return "media";
				if (/(记忆|记得|聊过|互动|认识我|上次)|(\bmemory\b|remember|chat\s*history|interacted|met\s+before)/i.test(raw)) return "memory";
				if (/(作息|起床|睡觉|几点|日程|静默时段|休息时间|什么时候睡)|(\brhythm\b|schedule|\bwake\b|\bsleep\b|quiet\s*hours|what\s+time|bedtime)/i.test(raw)) {
					return "rhythm";
				}
				if (/(状态|怎么样|还好|如何|现在|生活|精力|报告|心情|精神)|(\bstatus\b|how\s+are\s+you|how's\s+it\s+going|report|\bstate\b|\bmood\b|energy)/i.test(raw)) return "status";
				if (/(帮助|怎么用|有什么功能|功能|指令|能做什么)|(\bhelp\b|how\s+do\s+i\s+use|what\s+can\s+you\s+do|features|commands?)/i.test(raw)) return "help";
				if (/(权限|授权|允许|能力|限制)|(permissions?|capabilit|allowed|restriction)/i.test(raw)) return "permissions";
				if (/(你好|您好|哈喽|嗨|在吗|早安|早上好|午安|晚上好)|(^|\b)(hi|hello|hey|yo)\b|good\s+(?:morning|afternoon|evening)|are\s+you\s+there/i.test(raw)) {
					return "greeting";
				}
				return "fallback";
			} catch (error) {
				return "fallback";
			}
		}

		function petStatusReply() {
			const status = petLifeStatus();
			if (status === null) return TL_T("pet.brain.noLife");
			const budget = status.budget !== null && typeof status.budget === "object" ? status.budget : {};
			const memory = status.memory !== null && typeof status.memory === "object" ? status.memory : {};
			const stateKey = status.quiet === true ? "pet.brain.stateQuiet" : status.awake === false ? "pet.brain.stateAsleep" : "pet.brain.stateAwake";
			return TL_T("pet.brain.status", {
				period: petPeriodLabel(status.period),
				state: TL_T(stateKey),
				used: petNonNegativeInt(budget.used, 0),
				cap: petNonNegativeInt(budget.cap, 0),
				streak: petNonNegativeInt(memory.streakDays, 0),
			});
		}

		/**
		 * Local reply for one classified intent. Actions are delegated to the skin's
		 * own life/glass controllers and guarded; the reply never claims an action it
		 * could not perform. `intent` is returned for audit metadata only.
		 */
		function petLocalReply(text) {
			const intent = petClassify(text);
			const life = petLife();
			try {
				if (intent === "forbidden") return { intent, reply: TL_T("pet.brain.denied") };
				if (intent === "greeting") return { intent, reply: TL_T("pet.brain.greet") };
				if (intent === "help") return { intent, reply: TL_T("pet.brain.help") };
				// v1.6.8: the fallback is no longer a canned line — it continues the
				// conversation using the skin-local context (recent topic, period,
				// memory, current thought) and avoids repeating a recent line.
				if (intent === "fallback") return { intent, reply: petLocalContextReply(text) };
				if (intent === "permissions") return { intent, reply: TL_T("pet.brain.permissions") };
				if (intent === "status") return { intent, reply: petStatusReply() };
				if (intent === "mute") {
					if (life === null || typeof life.muteFor !== "function") return { intent, reply: TL_T("pet.brain.noLife") };
					life.muteFor(3600000);
					return { intent, reply: TL_T("pet.brain.muted") };
				}
				if (intent === "focus-start") {
					if (petGranted("focus") !== true) return { intent, reply: TL_T("pet.brain.focusDenied") };
					if (life === null || typeof life.focusStart !== "function") return { intent, reply: TL_T("pet.brain.noLife") };
					const focus = life.focusStart(25);
					if (focus !== null && typeof focus === "object" && focus.active === false) return { intent, reply: TL_T("pet.brain.focusDenied") };
					return { intent, reply: TL_T("pet.brain.focusStarted") };
				}
				if (intent === "focus-stop") {
					if (petGranted("focus") !== true) return { intent, reply: TL_T("pet.brain.focusDenied") };
					if (life === null || typeof life.focusStop !== "function") return { intent, reply: TL_T("pet.brain.noLife") };
					life.focusStop();
					return { intent, reply: TL_T("pet.brain.focusStopped") };
				}
				if (intent === "focus-query") {
					if (petGranted("focus") !== true) return { intent, reply: TL_T("pet.brain.focusDenied") };
					if (life === null || typeof life.focusStatus !== "function") return { intent, reply: TL_T("pet.brain.noLife") };
					const focus = life.focusStatus();
					if (focus !== null && typeof focus === "object" && focus.active === true) {
						const endsAt = petNumber(focus.endsAt, 0);
						const minutes = endsAt > 0 ? Math.max(1, Math.round((endsAt - Date.now()) / 60000)) : petNonNegativeInt(focus.minutes, 25);
						return { intent, reply: TL_T("pet.brain.focusActive", { minutes }) };
					}
					return { intent, reply: TL_T("pet.brain.focusIdle") };
				}
				if (intent === "glass") {
					const glass = petGlassState();
					if (glass === null) return { intent, reply: TL_T("pet.brain.noGlass") };
					return { intent, reply: TL_T("pet.brain.glass", { depth: glass.depth, effective: glass.effective }) };
				}
				if (intent === "media") {
					if (petGranted("media") !== true) return { intent, reply: TL_T("pet.brain.denied") };
					if (life === null || typeof life.media !== "function") return { intent, reply: TL_T("pet.brain.noLife") };
					const media = life.media();
					const name = media !== null && typeof media === "object" ? media.name || media.id || "default" : "default";
					return { intent, reply: TL_T("pet.brain.media", { name }) };
				}
				if (intent === "memory") {
					if (petGranted("memory") !== true) return { intent, reply: TL_T("pet.brain.memoryDenied") };
					const status = petLifeStatus();
					if (status === null) return { intent, reply: TL_T("pet.brain.noLife") };
					const memory = status.memory !== null && typeof status.memory === "object" ? status.memory : {};
					return {
						intent,
						reply: TL_T("pet.brain.memory", {
							interactions: petNonNegativeInt(memory.interactions, 0),
							turns: petNonNegativeInt(petTurns, 0),
							streak: petNonNegativeInt(memory.streakDays, 0),
						}),
					};
				}
				if (intent === "rhythm") {
					const status = petLifeStatus();
					if (status === null) return { intent, reply: TL_T("pet.brain.noLife") };
					const config = status.config !== null && typeof status.config === "object" ? status.config : {};
					const quiet = config.quiet !== null && typeof config.quiet === "object" ? config.quiet : {};
					return {
						intent,
						reply: TL_T("pet.brain.rhythm", {
							wake: typeof config.wake === "string" ? config.wake : "08:00",
							sleep: typeof config.sleep === "string" ? config.sleep : "23:00",
							start: typeof quiet.start === "string" ? quiet.start : "23:00",
							end: typeof quiet.end === "string" ? quiet.end : "08:00",
						}),
					};
				}
				return { intent, reply: TL_T("pet.brain.fallback") };
			} catch (error) {
				note("pet-brain:local", error);
				return { intent, reply: TL_T("pet.brain.fallback") };
			}
		}

		//#endregion
