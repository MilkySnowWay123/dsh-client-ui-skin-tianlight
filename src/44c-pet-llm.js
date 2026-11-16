		//#region pet brain
		// ---- optional LLM adapter ----------------------------------------------
		function petNormalizeAdapter(candidate) {
			try {
				if (candidate === null || typeof candidate !== "object") return null;
				const id = typeof candidate.id === "string" ? candidate.id.trim().slice(0, 64) : "";
				if (id === "" || typeof candidate.chat !== "function") return null;
				return { id, chat: candidate.chat };
			} catch (error) {
				return null;
			}
		}

		/**
		 * Register one adapter. The documented adapter slot is
		 * `window.tianlightPetLLM = { id, async chat({ system, messages, maxChars,
		 * timeoutMs }) }`; registration itself is always an explicit call (the brain
		 * never auto-detects or auto-calls anything), and registration does NOT
		 * grant `llm` — the user must still grant it with explicit consent.
		 */
		function petSetLLM(adapter) {
			try {
				let candidate = adapter;
				if (candidate === undefined) {
					try {
						candidate = globalThis.tianlightPetLLM;
					} catch (error) {
						candidate = undefined;
					}
				}
				const normalized = petNormalizeAdapter(candidate);
				if (normalized === null) return { ok: false, reason: "invalid-adapter" };
				petAdapter = normalized;
				return { ok: true, adapter: { id: normalized.id } };
			} catch (error) {
				note("pet-brain:set-llm", error);
				return { ok: false, reason: "internal-error" };
			}
		}

		function petClearLLM() {
			try {
				petAdapter = null;
				// An explicit detach wins over the capability probe until the next reload.
				petLlmAutoSuppressed = true;
				return { ok: true, adapter: null };
			} catch (error) {
				return { ok: false, reason: "internal-error" };
			}
		}

		function petSanitizeLlmReply(raw) {
			try {
				let text = String(raw);
				text = text.replace(/<[^>]*>/g, " ");
				text = petStripControls(text);
				text = text.replace(/\s+/g, " ").trim();
				if (text.length > PET_REPLY_MAX) text = text.slice(0, PET_REPLY_MAX).replace(/\s+$/, "");
				return text;
			} catch (error) {
				return "";
			}
		}

		/**
		 * One bounded adapter call. The adapter contract is
		 * `{ id, chat({ system, messages, maxChars, timeoutMs }) => Promise<string> }`.
		 * The payload carries the fixed system prompt, the current user sentence and —
		 * since v1.6.8 — a bounded skin-local context digest (this skin's chat history,
		 * memory counters, current thought and time). It never carries DSH state, files,
		 * credentials or sessions. `options.includeContext === false` skips the digest
		 * when the caller already supplies its own bounded context (the mind prompt).
		 */
		async function petCallLlm(text, now, options) {
			const adapter = petAdapter;
			if (adapter === null) return { ok: false, reason: "no-adapter" };
			// S1: an LLM inner monologue is charged against the mind's own budget
			// (`meter:"mind"`); it must never touch the user's chat quota.
			const meter = options !== null && typeof options === "object" && options.meter === "mind" ? "mind" : "chat";
			if (meter === "chat") petChargeLlm(now);
			let timer = 0;
			try {
				let content = text;
				const includeContext = options === null || typeof options !== "object" || options.includeContext !== false;
				if (includeContext === true) {
					const digest = petChatContextDigest(petChatContext(), PET_CHAT_CONTEXT_MAX);
					if (digest !== "") content = "Context (skin-local and bounded; use it only for tone and continuity):\n" + digest + "\n\nUser: " + text;
					const chars = Array.from(content);
					const maxInput = PET_INPUT_MAX + PET_CHAT_CONTEXT_MAX;
					if (chars.length > maxInput) content = chars.slice(0, maxInput).join("");
				}
				const payload = {
					system: PET_SYSTEM_PROMPT,
					messages: [{ role: "user", content }],
					maxChars: PET_LLM_MAX_CHARS,
					timeoutMs: PET_LLM_TIMEOUT_MS,
				};
				const timeout = new Promise((resolve) => {
					timer = window.setTimeout(() => resolve(PET_LLM_TIMEOUT_TOKEN), PET_LLM_TIMEOUT_MS);
				});
				const call = Promise.resolve().then(() => adapter.chat(payload));
				const result = await Promise.race([call, timeout]);
				// v2.0.0: every failure also carries a stable `code` so petChat can expose
				// the additive `llmError` / localized hint. The `reason` strings are kept
				// unchanged for the existing audit and the private-mind path.
				if (result === PET_LLM_TIMEOUT_TOKEN) return { ok: false, reason: "timeout", code: "timeout" };
				if (typeof result !== "string") return { ok: false, reason: "invalid-reply", code: "llm-error" };
				const reply = petSanitizeLlmReply(result);
				if (reply === "") return { ok: false, reason: "empty-reply", code: "llm-error" };
				return { ok: true, reply };
			} catch (error) {
				note("pet-brain:llm", error);
				// The built-in dsh adapter throws an Error carrying a stable `code`; a
				// user adapter without one is a generic llm-error (unknown codes normalize).
				return { ok: false, reason: "adapter-error", code: petNormalizeLlmCode(error !== null && typeof error === "object" ? error.code : "") };
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

		// ---- user-supplied capability adapters (high risk only) -----------------
		function petIsHighCapability(cap) {
			return typeof cap === "string" && PET_HIGH_CAPS.indexOf(cap) >= 0;
		}

		function petNormalizeCapabilityAdapter(candidate) {
			try {
				if (candidate === null || typeof candidate !== "object") return null;
				const id = typeof candidate.id === "string" ? candidate.id.trim().slice(0, 64) : "";
				if (id === "" || typeof candidate.run !== "function") return null;
				return { id, run: candidate.run };
			} catch (error) {
				return null;
			}
		}

		/**
		 * Register (or replace) the adapter for one HIGH-risk capability. Granting the
		 * capability is a separate user action, so registering an adapter alone never
		 * makes anything callable. Adapters are memory-only by design: this skin does
		 * not persist executable functions, and a reload clears them (the granted
		 * permission bits persist separately).
		 */
		function petSetCapabilityAdapter(cap, adapter) {
			try {
				const id = typeof cap === "string" ? cap : "";
				if (petIsHighCapability(id) === false) return { ok: false, reason: "not-adapter-capability" };
				const normalized = petNormalizeCapabilityAdapter(adapter);
				if (normalized === null) return { ok: false, reason: "invalid-adapter" };
				petCapabilityAdapters[id] = normalized;
				return { ok: true, cap: id, adapterId: normalized.id };
			} catch (error) {
				note("pet-brain:set-capability-adapter", error);
				return { ok: false, reason: "internal-error" };
			}
		}

		function petClearCapabilityAdapter(cap) {
			try {
				const id = typeof cap === "string" ? cap : "";
				if (petIsHighCapability(id) === false) return { ok: false, reason: "not-adapter-capability" };
				if (Object.prototype.hasOwnProperty.call(petCapabilityAdapters, id)) delete petCapabilityAdapters[id];
				return { ok: true, cap: id };
			} catch (error) {
				note("pet-brain:clear-capability-adapter", error);
				return { ok: false, reason: "internal-error" };
			}
		}

		/**
		 * Invoke one HIGH-risk capability through its user-supplied adapter. Gate order
		 * is the permission model in code: capability granted → brain not paused →
		 * adapter registered. Failure reasons are explicit (`permission`, `paused`,
		 * `adapter-missing`, `adapter-error`) and every gated attempt writes one audit
		 * record with `action:"capability"` (metadata only, never the payload text).
		 * Success returns `{ ok:true, adapterId, result }` with `result` unchanged.
		 */
		async function petInvokeCapability(cap, input) {
			const id = typeof cap === "string" ? cap : "";
			try {
				if (petIsHighCapability(id) === false) return { ok: false, reason: "not-adapter-capability" };
				const chars = typeof input === "string" ? input.length : undefined;
				if (petInstalled !== true || petGranted(id) !== true) {
					petAudit("capability", id, false, { reason: "permission", chars });
					return { ok: false, reason: "permission" };
				}
				if (petPaused === true) {
					petAudit("capability", id, false, { reason: "paused", chars });
					return { ok: false, reason: "paused" };
				}
				const adapter = Object.prototype.hasOwnProperty.call(petCapabilityAdapters, id) ? petCapabilityAdapters[id] : null;
				if (adapter === null) {
					petAudit("capability", id, false, { reason: "adapter-missing", chars });
					return { ok: false, reason: "adapter-missing" };
				}
				try {
					let result = adapter.run(input);
					if (result !== null && typeof result === "object" && typeof result.then === "function") result = await result;
					petAudit("capability", id, true, { source: "adapter", chars });
					return { ok: true, adapterId: adapter.id, result };
				} catch (error) {
					note("pet-brain:capability-run", error);
					petAudit("capability", id, false, { reason: "adapter-error", source: "adapter", chars });
					return { ok: false, reason: "adapter-error" };
				}
			} catch (error) {
				note("pet-brain:capability", error);
				return { ok: false, reason: "internal-error" };
			}
		}

		// ---- chat / say ---------------------------------------------------------
		function petChatDenied(reason) {
			petAudit("chat", "chat", false, { reason, source: "local" });
			return { ok: false, reply: "", text: "", source: "local", denied: true, reason };
		}

		function petRecordReply(now, source, chars) {
			petLastReplyAt = now;
			if (petGranted("memory") === true) {
				petTurns += 1;
				petEnsureDay(now);
				petTodayTurns += 1;
			}
			void source;
			void chars;
		}

		/**
		 * One chat turn. Order of checks is the permission model in code:
		 * installed -> paused -> chat capability -> input -> (optional LLM with
		 * quotas) -> local reply with local rate limits. Always resolves.
		 *
		 * `options` is internal only (the documented global API is `chat(text)`):
		 * `{ includeContext:false }` tells the LLM prompt builder that the caller
		 * already embedded its own bounded context (the v1.6.8 mind prompt).
		 *
		 * v2.0.0: the result additionally carries `llmError` (a stable code like
		 * `timeout`/`missing-credential`, or null). It is set only when an AI call failed
		 * or when `llm` is granted but no adapter/model exists; quota fallbacks keep the
		 * historical `llmError:null` behaviour. No existing field or branch changed.
		 */
		async function petChat(input, options) {
			try {
				const now = Date.now();
				petEnsureDay(now);
				if (petInstalled !== true) return petChatDenied("disabled");
				if (petPaused === true) return petChatDenied("paused");
				if (petGranted("chat") !== true) return petChatDenied("permission");
				if (typeof input !== "string") return petChatDenied("invalid-input");
				let text = petStripControls(input).trim();
				if (text === "") return petChatDenied("empty");
				let truncated = false;
				if (text.length > PET_INPUT_MAX) {
					text = text.slice(0, PET_INPUT_MAX);
					truncated = true;
				}
				let reply = null;
				let source = "local";
				// v2.0.0 (additive): the stable reason code when an AI attempt failed - or
				// when `llm` is granted but the host exposes no model at all. null on
				// success, on quota fallback and on every denied/never-attempted path.
				let llmError = null;
				const llmGranted = petGranted("llm") === true;
				const llmWanted = llmGranted === true && petAdapter !== null;
				if (llmWanted) {
					const quota = petLlmQuota(now);
					if (quota.ok === true) {
						const attempt = await petCallLlm(text, now, options);
						if (attempt.ok === true && typeof attempt.reply === "string" && attempt.reply !== "") {
							reply = attempt.reply;
							source = "llm";
							petAudit("llm", "llm", true, { source: "llm", chars: reply.length });
						} else {
							// Adapter failure: audit the stable code (the historical
							// "llm-fallback" string stays the fallback), answer locally.
							llmError = typeof attempt.code === "string" && attempt.code !== "" ? petNormalizeLlmCode(attempt.code) : "llm-error";
							petAudit("llm", "llm", false, { reason: llmError });
							// A failure can mean the host restarted or lost its model: re-probe in
							// the background so a built-in adapter recovers without a reload.
							void petHostLlmProbe();
						}
					} else {
						// Quota fallback keeps the existing behaviour: local reply, no llmError.
						petAudit("llm", "llm", false, { reason: quota.reason });
					}
				} else if (llmGranted === true && petAdapter === null) {
					// The user granted `llm` but the brain has no adapter: the host exposes no
					// usable model (or shipped before a DSH restart). Nothing was called, so no
					// quota is consumed; the result still explains why the reply is local.
					llmError = petHostLlmUnavailableCode();
					void petHostLlmProbe();
				}
				if (reply === null) {
					if (petLocalRateOk(now) !== true) return petChatDenied("rate-limit");
					const local = petLocalReply(text);
					reply = petClipText(local.reply, PET_LOCAL_REPLY_MAX);
					// Remember the last few local lines so the context reply can avoid
					// sounding like a recording (ring lives in memory only).
					petLocalReplyRing = [reply, ...petLocalReplyRing.filter((line) => line !== reply)].slice(0, 8);
					petLocalMinute.push(now);
					petEnsureDay(now);
					petLocalDay.count = petNonNegativeInt(petLocalDay.count, 0) + 1;
					source = "local";
				}
				petRecordReply(now, source, reply.length);
				petAudit("chat", "chat", true, { source, chars: reply.length, reason: truncated ? "truncated" : undefined });
				// Additive v2.0.0 field (`llmError`); every pre-existing field keeps its
				// meaning. The bubble/hub show petLlmHintText(llmError) when it is non-null.
				return { ok: true, reply, text: reply, source, llmError };
			} catch (error) {
				note("pet-brain:chat", error);
				return petChatDenied("internal-error");
			}
		}

		/**
		 * Speak one reply through the companion's say bubble (<=200 chars shown).
		 * Uses the same chat permission and pause switch; `companion-off` when the
		 * companion module is disabled, exactly like the duty channel.
		 */
		async function petSay(input) {
			try {
				const bridge = companionDutyBridge.api;
				if (bridge === null || bridge === undefined || typeof bridge.say !== "function") {
					petAudit("say", "chat", false, { reason: "companion-off" });
					return { ok: false, reply: "", text: "", source: "local", denied: true, spoken: false, reason: "companion-off" };
				}
				if (typeof input !== "string") {
					petAudit("say", "chat", false, { reason: "invalid-input" });
					return { ok: false, reply: "", text: "", source: "local", denied: true, spoken: false, reason: "invalid-input" };
				}
				let text = petStripControls(input).trim();
				let truncated = false;
				if (text.length > PET_SAY_MAX) {
					text = text.slice(0, PET_SAY_MAX);
					truncated = true;
				}
				if (text === "") {
					petAudit("say", "chat", false, { reason: "empty" });
					return { ok: false, reply: "", text: "", source: "local", denied: true, spoken: false, reason: "empty" };
				}
				const result = await petChat(text);
				if (result.ok !== true) {
					petAudit("say", "chat", false, { reason: typeof result.reason === "string" ? result.reason : "denied" });
					return { ...result, spoken: false };
				}
				const bubble = petClipText(result.reply, PET_SAY_MAX);
				try {
					bridge.say(bubble, 3200);
				} catch (error) {
					note("pet-brain:say-bridge", error);
					petAudit("say", "chat", false, { reason: "companion-off" });
					return { ok: false, reply: "", text: "", source: "local", denied: true, spoken: false, reason: "companion-off" };
				}
				petAudit("say", "chat", true, { source: result.source, chars: bubble.length, reason: truncated ? "truncated" : undefined });
				return { ok: true, reply: result.reply, text: result.reply, source: result.source, spoken: true, llmError: typeof result.llmError === "string" ? result.llmError : null };
			} catch (error) {
				note("pet-brain:say", error);
				return { ok: false, reply: "", text: "", source: "local", denied: true, spoken: false, reason: "internal-error" };
			}
		}

		// ---- status / kill switch / proactive ----------------------------------
		function petFallbackStatus() {
			return {
				version: PET_VERSION,
				enabled: petInstalled === true,
				paused: petPaused === true,
				adapter: petAdapter === null ? null : { id: petAdapter.id },
				llm: {
					granted: petGranted("llm") === true,
					usedToday: petNonNegativeInt(petAi.usedToday, 0),
					dailyLimit: petNonNegativeInt(petAi.dailyLimit, PET_DAILY_LIMIT_DEFAULT),
					remaining: 0,
					minuteRemaining: 0,
					// v2.0.0 (additive): same shape as petStatus(); a status failure must not
					// claim the host is available, so the host block is the static unknown one.
					// v2.2.0: `model` is the user's chosen model (null = follow default).
					provider: petLlmProvider,
					model: petLlmModel,
					routing: petLlmRouting(),
					host: { checked: false, available: false, reason: "unknown", provider: "", model: "" },
				},
				permissions: petPermissionMap(),
				memory: { turns: petNonNegativeInt(petTurns, 0), todayTurns: petNonNegativeInt(petTodayTurns, 0) },
				lastReplyAt: petNonNegativeInt(petLastReplyAt, 0),
				auditCount: petAuditRing.length,
			};
		}

		function petStatus() {
			try {
				const now = Date.now();
				petEnsureDay(now);
				const usedToday = petNonNegativeInt(petAi.usedToday, 0);
				const dailyLimit = petNonNegativeInt(petAi.dailyLimit, PET_DAILY_LIMIT_DEFAULT);
				return {
					version: PET_VERSION,
					enabled: petInstalled === true,
					paused: petPaused === true,
					adapter: petAdapter === null ? null : { id: petAdapter.id },
					llm: {
						granted: petGranted("llm") === true,
						usedToday,
						dailyLimit,
						remaining: Math.max(0, dailyLimit - usedToday),
						minuteRemaining: Math.max(0, PET_MINUTE_CALL_LIMIT - petLlmMinuteCount(now)),
						// v2.0.0 (additive): provider choice + adapter routing + the cached
						// host capability snapshot (read by the role hub AI card).
						// v2.2.0: `model` joins `provider` as the user's explicit selection.
						provider: petLlmProvider,
						model: petLlmModel,
						routing: petLlmRouting(),
						host: petHostLlmStatus(),
					},
					permissions: petPermissionMap(),
					memory: { turns: petTurns, todayTurns: petTodayTurns },
					lastReplyAt: petLastReplyAt,
					auditCount: petAuditRing.length,
				};
			} catch (error) {
				note("pet-brain:status", error);
				return petFallbackStatus();
			}
		}

		function petPause() {
			try {
				if (petPaused !== true) {
					petPaused = true;
					petPauseAt = Date.now();
					petSavePause();
					petAudit("pause", "", true, {});
				}
				return petStatus();
			} catch (error) {
				note("pet-brain:pause", error);
				return petStatus();
			}
		}

		function petResume() {
			try {
				if (petPaused === true) {
					petPaused = false;
					petSavePause();
					petAudit("resume", "", true, {});
				}
				return petStatus();
			} catch (error) {
				note("pet-brain:resume", error);
				return petStatus();
			}
		}

		/**
		 * S1: pure "may I speak first?" verdict (no audit side effect). Shared by the
		 * audit-emitting petMaybeProactive() and same-closure callers (life engine,
		 * mind speech). Checks pause, the proactive grant and the life gates.
		 */
		function petProactiveVerdict(context) {
			try {
				const now = Date.now();
				petEnsureDay(now);
				let allowed = true;
				let reason = "";
				if (petInstalled !== true) {
					allowed = false;
					reason = "disabled";
				} else if (petPaused === true) {
					allowed = false;
					reason = "paused";
				} else if (petGranted("proactive") !== true) {
					allowed = false;
					reason = "permission";
				}
				if (allowed === true) {
					const life = petLifeStatus();
					if (life !== null) {
						const budget = life.budget !== null && typeof life.budget === "object" ? life.budget : null;
						const focus = life.focus !== null && typeof life.focus === "object" ? life.focus : null;
						if (petNumber(life.mutedUntil, 0) > now) {
							allowed = false;
							reason = "mute";
						} else if (life.quiet === true) {
							allowed = false;
							reason = "quiet-hours";
						} else if (life.awake === false) {
							allowed = false;
							reason = "asleep";
						} else if (budget !== null && petNumber(budget.remaining, 0) <= 0) {
							allowed = false;
							reason = "budget";
						} else if (focus !== null && focus.active === true) {
							allowed = false;
							reason = "focus";
						}
					}
				}
				void context;
				return { allowed, reason };
			} catch (error) {
				note("pet-brain:proactive-verdict", error);
				return { allowed: false, reason: "internal-error" };
			}
		}

		/**
		 * The single "may I speak first?" check used by the life engine / hub.
		 * Returns false when the brain is paused, the proactive capability is
		 * revoked, or the life engine is muted/quiet/asleep/focused/out of budget.
		 */
		function petMaybeProactive(context) {
			try {
				const verdict = petProactiveVerdict(context);
				petAudit("proactive-check", "proactive", verdict.allowed === true, {
					reason: verdict.reason === "" ? undefined : verdict.reason,
				});
				return verdict.allowed === true;
			} catch (error) {
				note("pet-brain:proactive", error);
				return false;
			}
		}

		// ---- v1.6.8 skin-local chat context --------------------------------------
		/**
		 * The only chat-history source for both the human-like chat and the mind is the
		 * companion's v1.6.7 store (src/40-companion.js): its factory-scope helper first,
		 * the published `tianlightPetChats` global as a fallback. Both are optional — a
		 * missing companion degrades to "no recent turns", never to an error.
		 */
		function petChatHistory() {
			try {
				if (typeof petChatsRecentContext === "function") {
					const recent = petChatsRecentContext(PET_MIND_CONTEXT_MESSAGES);
					if (recent !== null && typeof recent === "object" && Array.isArray(recent.messages)) {
						return petChatHistoryNormalize(recent.messages);
					}
				}
				const api = globalThis.tianlightPetChats;
				if (api === null || api === undefined || typeof api.list !== "function") return [];
				const conversations = api.list();
				if (!Array.isArray(conversations) || conversations.length === 0) return [];
				const conversation = conversations[0];
				if (conversation === null || typeof conversation !== "object" || Array.isArray(conversation.messages) === false) return [];
				return petChatHistoryNormalize(conversation.messages);
			} catch (error) {
				return [];
			}
		}

		function petChatHistoryNormalize(messages) {
			const result = [];
			try {
				for (const message of messages.slice(-PET_MIND_CONTEXT_MESSAGES)) {
					if (message === null || typeof message !== "object") continue;
					if (typeof message.text !== "string" || message.text === "") continue;
					result.push({
						role: message.role === "user" ? "user" : "pet",
						text: petClipText(message.text, 160),
						at: petNonNegativeInt(message.at, 0),
					});
				}
			} catch (error) {
				result.length = 0;
			}
			return result;
		}

		function petClockLabel(nowInput) {
			try {
				const date = new Date(petNumber(nowInput, Date.now()));
				const hours = String(date.getHours()).padStart(2, "0");
				const minutes = String(date.getMinutes()).padStart(2, "0");
				return hours + ":" + minutes;
			} catch (error) {
				return "";
			}
		}

		/** Period id used when the life engine is unavailable (same seven buckets). */
		function petMindLocalPeriod(nowInput) {
			try {
				const hour = new Date(petNumber(nowInput, Date.now())).getHours();
				if (hour < 5) return "night";
				if (hour < 8) return "dawn";
				if (hour < 11) return "morning";
				if (hour < 13) return "noon";
				if (hour < 17) return "afternoon";
				if (hour < 19) return "dusk";
				if (hour < 22) return "evening";
				return "night";
			} catch (error) {
				return "night";
			}
		}

		/** Context snapshot for one local chat reply / LLM digest. Never throws. */
		function petChatContext() {
			const now = Date.now();
			const life = petLifeStatus();
			const memory = life !== null && life.memory !== null && typeof life.memory === "object" ? life.memory : {};
			const messages = petChatHistory();
			let lastUserText = "";
			let lastPetText = "";
			for (let index = messages.length - 1; index >= 0; index -= 1) {
				const message = messages[index];
				if (lastUserText === "" && message.role === "user") lastUserText = petClipText(message.text, 160);
				if (lastPetText === "" && message.role === "pet") lastPetText = petClipText(message.text, 80);
				if (lastUserText !== "" && lastPetText !== "") break;
			}
			const thought = petMindLastThought();
			const period = life !== null && typeof life.period === "string" && life.period !== "" ? life.period : petMindLocalPeriod(now);
			return {
				time: petClockLabel(now),
				period,
				periodLabel: petPeriodLabel(period),
				memory: {
					interactions: petNonNegativeInt(memory.interactions, 0),
					turns: petNonNegativeInt(memory.talks, petTurns),
					streak: petNonNegativeInt(memory.streakDays, 0),
				},
				quiet: life !== null && life.quiet === true,
				focus: life !== null && life.focus !== null && typeof life.focus === "object" && life.focus.active === true,
				messages,
				lastUserText,
				lastPetText,
				thought,
			};
		}

		/** Bounded prompt digest for user chat (skin-local chat + memory + thought). */
		function petChatContextDigest(context, maxChars) {
			try {
				const lines = [];
				lines.push("Local time: " + context.time + " (" + context.periodLabel + ").");
				lines.push(
					"Memory: interactions=" + context.memory.interactions + ", chatTurns=" + context.memory.turns + ", streakDays=" + context.memory.streak + ".",
				);
				if (context.focus === true) lines.push("The user is in a focus session.");
				if (context.quiet === true) lines.push("Quiet hours are active.");
				if (context.messages.length > 0) {
					lines.push("Recent skin-local chat (oldest first; never repeat verbatim):");
					for (const message of context.messages) lines.push("- " + message.role + ": " + message.text);
				}
				if (context.thought !== null && typeof context.thought === "object") {
					lines.push("My current private thought: " + petClipText(context.thought.text, 120));
				}
				const max = Number.isFinite(maxChars) ? Math.max(80, maxChars) : PET_CHAT_CONTEXT_MAX;
				return petClipText(lines.join("\n"), max);
			} catch (error) {
				return "";
			}
		}

		/**
		 * v1.6.8: local reply for the fallback intent. It continues the recent topic,
		 * folds in the period / memory / current thought, rotates the clause pair and
		 * skips any line that was just said (ring), so the local brain stops sounding
		 * canned while staying inside the 80-char local reply cap.
		 */
		function petLocalContextReply(text) {
			void text;
			try {
				const context = petChatContext();
				const recent = petLocalReplyRing.slice(0, 8);
				const topic = petClipText(context.lastUserText, 24);
				const pool = [];
				if (topic !== "") pool.push(TL_T("pet.chat.ctx.continue", { topic }));
				if (context.thought !== null && typeof context.thought === "object") {
					pool.push(TL_T("pet.chat.ctx.thought", { thought: petClipText(context.thought.text, 28) }));
				}
				if (topic !== "") pool.push(TL_T("pet.chat.ctx.soft", { topic }));
				pool.push(TL_T("pet.chat.ctx.period", { period: context.periodLabel }));
				if (context.memory.turns > 0) pool.push(TL_T("pet.chat.ctx.memory", { turns: context.memory.turns }));
				pool.push(TL_T("pet.chat.ctx.plain"));
				const usable = pool.filter((candidate) => typeof candidate === "string" && candidate !== "");
				let chosen = "";
				for (let attempt = 0; attempt < usable.length && chosen === ""; attempt += 1) {
					const first = usable[(petLocalReplySeed + attempt) % usable.length];
					let second = usable[(petLocalReplySeed + attempt + 1) % usable.length];
					if (second === first || first.indexOf(second) >= 0 || second.indexOf(first) >= 0) second = "";
					// A short opener gets one distinct second clause so it never feels like
					// a one-word bot; the cap still applies afterwards.
					let candidate = second !== "" && Array.from(first).length < 24 ? (first + " " + second).trim() : first;
					candidate = petClipText(candidate, PET_LOCAL_REPLY_MAX);
					if (candidate !== "" && recent.indexOf(candidate) < 0) chosen = candidate;
				}
				if (chosen === "") chosen = usable.length > 0 ? usable[0] : TL_T("pet.chat.ctx.plain");
				petLocalReplySeed = (petLocalReplySeed + 1) % 997;
				return petClipText(chosen, PET_LOCAL_REPLY_MAX);
			} catch (error) {
				note("pet-brain:local-context", error);
				return TL_T("pet.brain.fallback");
			}
		}

		//#endregion
