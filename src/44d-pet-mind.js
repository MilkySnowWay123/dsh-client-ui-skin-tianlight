		//#region pet brain
		// ---- v1.6.8 private thinking engine --------------------------------------
		function petMindFallbackState() {
			return {
				version: PET_MIND_VERSION,
				enabled: false,
				intervalMin: PET_MIND_DEFAULT_INTERVAL,
				autonomousSpeech: true,
				// S1: LLM inner monologue is a separate explicit opt-in with its own budget;
				// the default mind is local-template only (zero network, zero quota).
				llmAssist: false,
				llm: { dayKey: "", used: 0 },
				thoughts: [],
				lastThinkAt: 0,
			};
		}

		function petMindInterval(value) {
			const number = Number(value);
			return PET_MIND_INTERVALS.indexOf(number) >= 0 ? number : PET_MIND_DEFAULT_INTERVAL;
		}

		function petMindNewId() {
			let salt = "";
			try {
				salt = Math.random().toString(36).slice(2, 8);
			} catch (error) {
				salt = "";
			}
			return "mind-" + Date.now().toString(36) + "-" + (salt === "" ? "0" : salt);
		}

		/** One thought is always a single 60–160 character paragraph. */
		function petMindClipThought(value) {
			try {
				const cleaned = petStripControls(String(value === null || value === undefined ? "" : value))
					.replace(/\s+/g, " ")
					.trim();
				return petClipText(cleaned, PET_MIND_THOUGHT_MAX_CHARS);
			} catch (error) {
				return "";
			}
		}

		function petLoadMind() {
			const fallback = petMindFallbackState();
			try {
				const raw = petReadJson(PET_MIND_KEY);
				if (raw === null) return fallback;
				if (raw.version !== undefined && raw.version !== PET_MIND_VERSION) return fallback;
				const state = petMindFallbackState();
				state.enabled = raw.enabled === true;
				state.intervalMin = petMindInterval(raw.intervalMin);
				state.autonomousSpeech = raw.autonomousSpeech !== false;
				state.llmAssist = raw.llmAssist === true;
				state.lastThinkAt = petNonNegativeInt(raw.lastThinkAt, 0);
				const savedLlm = raw.llm !== null && typeof raw.llm === "object" ? raw.llm : null;
				state.llm = {
					dayKey: savedLlm !== null && typeof savedLlm.dayKey === "string" ? savedLlm.dayKey : "",
					used: savedLlm !== null ? petNonNegativeInt(savedLlm.used, 0) : 0,
				};
				if (Array.isArray(raw.thoughts)) {
					for (const entry of raw.thoughts) {
						if (state.thoughts.length >= PET_MIND_THOUGHT_MAX) break;
						if (entry === null || typeof entry !== "object") continue;
						const text = petMindClipThought(entry.text);
						if (text === "") continue;
						state.thoughts.push({
							id: typeof entry.id === "string" && entry.id !== "" ? petClipText(entry.id, 64) : petMindNewId(),
							at: petNonNegativeInt(entry.at, 0),
							kind: entry.kind === "llm" ? "llm" : "local",
							text,
						});
					}
				}
				return state;
			} catch (error) {
				return fallback;
			}
		}

		function petMindSave() {
			try {
				const state = petMindState;
				petWriteJson(PET_MIND_KEY, {
					version: PET_MIND_VERSION,
					enabled: state.enabled === true,
					intervalMin: petMindInterval(state.intervalMin),
					autonomousSpeech: state.autonomousSpeech === true,
					llmAssist: state.llmAssist === true,
					llm: {
						dayKey: state.llm !== null && typeof state.llm === "object" && typeof state.llm.dayKey === "string" ? state.llm.dayKey : "",
						used: state.llm !== null && typeof state.llm === "object" ? petNonNegativeInt(state.llm.used, 0) : 0,
					},
					thoughts: state.thoughts.slice(0, PET_MIND_THOUGHT_MAX),
					lastThinkAt: petNonNegativeInt(state.lastThinkAt, 0),
				});
			} catch (error) {
				note("pet-mind:save", error);
			}
		}

		function petMindDocument() {
			try {
				return typeof document === "undefined" || document === null ? null : document;
			} catch (error) {
				return null;
			}
		}

		/**
		 * Low-power signal: the existing 15fps render tier, the low-power body
		 * attribute (set by src/55-lowpower.js) or a forced "on" low-power mode.
		 */
		function petMindLowPower() {
			try {
				if (typeof readRenderTier === "function" && readRenderTier() === "15") return true;
				const doc = petMindDocument();
				if (
					doc !== null &&
					doc.body !== null &&
					doc.body !== undefined &&
					typeof doc.body.hasAttribute === "function" &&
					doc.body.hasAttribute("data-tl-lowpower")
				) {
					return true;
				}
				if (typeof lowPowerController !== "undefined" && lowPowerController !== null && typeof lowPowerController.read === "function") {
					return lowPowerController.read() === "on";
				}
			} catch (error) {
				// a missing low-power controller simply is not a low-power signal
			}
			return false;
		}

		function petMindLastThought() {
			try {
				const first = petMindState.thoughts.length > 0 ? petMindState.thoughts[0] : null;
				if (first === null || typeof first !== "object") return null;
				return { id: first.id, at: first.at, kind: first.kind, text: first.text };
			} catch (error) {
				return null;
			}
		}

		function petMindThoughts() {
			try {
				return petMindState.thoughts.map((entry) => ({ id: entry.id, at: entry.at, kind: entry.kind, text: entry.text }));
			} catch (error) {
				return [];
			}
		}

		/** S1: the mind's own LLM day budget (separate from the user's chat quota). */
		function petMindLlmBudget(nowInput) {
			const now = petNumber(nowInput, Date.now());
			const today = petDayKey(now);
			if (petMindState.llm === null || typeof petMindState.llm !== "object") petMindState.llm = { dayKey: today, used: 0 };
			if (petMindState.llm.dayKey !== today) {
				petMindState.llm.dayKey = today;
				petMindState.llm.used = 0;
			}
			const used = petNonNegativeInt(petMindState.llm.used, 0);
			return {
				dayKey: today,
				used,
				dailyLimit: PET_MIND_LLM_DAILY_LIMIT,
				remaining: Math.max(0, PET_MIND_LLM_DAILY_LIMIT - used),
			};
		}

		/** Charge one mind LLM attempt (attempt-based, like the user chat quota). */
		function petMindLlmCharge(nowInput) {
			const budget = petMindLlmBudget(nowInput);
			if (budget.remaining <= 0) return false;
			petMindState.llm.used = budget.used + 1;
			petMindSave();
			return true;
		}

		function petMindStatus() {
			try {
				const doc = petMindDocument();
				const intervalMin = petMindInterval(petMindState.intervalMin);
				const llmBudget = petMindLlmBudget(Date.now());
				return {
					version: PET_MIND_VERSION,
					installed: petInstalled === true,
					enabled: petMindState.enabled === true,
					intervalMin,
					autonomousSpeech: petMindState.autonomousSpeech === true,
					llmAssist: petMindState.llmAssist === true,
					llmUsedToday: llmBudget.used,
					llmDailyLimit: llmBudget.dailyLimit,
					llmRemaining: llmBudget.remaining,
					thoughtCount: petMindState.thoughts.length,
					lastThinkAt: petNonNegativeInt(petMindState.lastThinkAt, 0),
					lastThought: petMindLastThought(),
					thinking: petMindBusy === true,
					paused: petPaused === true,
					hidden: doc !== null && doc.hidden === true,
					lowPower: petMindLowPower(),
					nextDueAt:
						petMindState.lastThinkAt > 0 ? petNonNegativeInt(petMindState.lastThinkAt, 0) + intervalMin * 60000 : 0,
				};
			} catch (error) {
				return {
					version: PET_MIND_VERSION,
					installed: false,
					enabled: false,
					intervalMin: PET_MIND_DEFAULT_INTERVAL,
					autonomousSpeech: true,
					llmAssist: false,
					llmUsedToday: 0,
					llmDailyLimit: PET_MIND_LLM_DAILY_LIMIT,
					llmRemaining: PET_MIND_LLM_DAILY_LIMIT,
					thoughtCount: 0,
					lastThinkAt: 0,
					lastThought: null,
					thinking: false,
					paused: false,
					hidden: false,
					lowPower: false,
					nextDueAt: 0,
				};
			}
		}

		function petMindNotify() {
			for (const listener of [...petMindSubscribers]) {
				try {
					listener(petMindStatus());
				} catch (error) {
					note("pet-mind:subscriber", error);
				}
			}
		}

		function petMindSubscribe(listener) {
			if (typeof listener !== "function") return () => {};
			petMindSubscribers.add(listener);
			return () => petMindSubscribers.delete(listener);
		}

		function petMindEnable(options) {
			try {
				const opts = options !== null && typeof options === "object" ? options : {};
				petMindState.enabled = true;
				if (opts.intervalMin !== undefined) petMindState.intervalMin = petMindInterval(opts.intervalMin);
				if (opts.autonomousSpeech !== undefined) petMindState.autonomousSpeech = opts.autonomousSpeech === true;
				if (opts.llmAssist !== undefined) petMindState.llmAssist = opts.llmAssist === true;
				petMindSave();
				petMindNotify();
				return { ok: true, status: petMindStatus() };
			} catch (error) {
				note("pet-mind:enable", error);
				return { ok: false, reason: "internal-error" };
			}
		}

		function petMindDisable() {
			try {
				petMindState.enabled = false;
				petMindSave();
				petMindNotify();
				return { ok: true, status: petMindStatus() };
			} catch (error) {
				note("pet-mind:disable", error);
				return { ok: false, reason: "internal-error" };
			}
		}

		function petMindClearThoughts() {
			try {
				const cleared = petMindState.thoughts.length;
				petMindState.thoughts = [];
				petMindState.lastThinkAt = 0;
				petMindSave();
				petMindNotify();
				return { ok: true, cleared };
			} catch (error) {
				note("pet-mind:clear", error);
				return { ok: false, reason: "internal-error" };
			}
		}

		/** Full context snapshot for one thought (also does bounded prompt digest). */
		function petMindContext(nowInput) {
			const now = petNumber(nowInput, Date.now());
			const life = petLifeStatus();
			const memory = life !== null && life.memory !== null && typeof life.memory === "object" ? life.memory : {};
			const messages = petChatHistory();
			let lastUserTopic = "";
			let lastPetText = "";
			for (let index = messages.length - 1; index >= 0; index -= 1) {
				const message = messages[index];
				if (lastUserTopic === "" && message.role === "user") lastUserTopic = petClipText(message.text, 24);
				if (lastPetText === "" && message.role === "pet") lastPetText = petClipText(message.text, 40);
				if (lastUserTopic !== "" && lastPetText !== "") break;
			}
			const lastThought = petMindLastThought();
			const period = life !== null && typeof life.period === "string" && life.period !== "" ? life.period : petMindLocalPeriod(now);
			const recentThoughts = [];
			for (const thought of petMindState.thoughts.slice(0, PET_MIND_RECENT_LIMIT)) {
				if (thought !== null && typeof thought === "object" && typeof thought.text === "string") recentThoughts.push(thought.text);
			}
			let hour = 12;
			let dayNumber = 0;
			try {
				hour = new Date(now).getHours();
				dayNumber = Math.floor(now / 86400000);
			} catch (error) {
				hour = 12;
				dayNumber = 0;
			}
			return {
				now,
				time: petClockLabel(now),
				period,
				periodLabel: petPeriodLabel(period),
				hour,
				dayNumber,
				memory: {
					interactions: petNonNegativeInt(memory.interactions, 0),
					turns: petNonNegativeInt(memory.talks, petTurns),
					streak: petNonNegativeInt(memory.streakDays, 0),
					lastSeenAt: petNonNegativeInt(memory.lastSeenAt, 0),
				},
				quiet: life !== null && life.quiet === true,
				focus: life !== null && life.focus !== null && typeof life.focus === "object" && life.focus.active === true,
				energy: life !== null && typeof life.energy === "string" ? life.energy : "normal",
				messages,
				lastUserTopic,
				lastPetText,
				lastThoughtText: lastThought !== null ? petClipText(lastThought.text, 40) : "",
				recentThoughts,
				thoughtCount: petMindState.thoughts.length,
				goalKey: PET_MIND_GOAL_KEYS[(petMindState.thoughts.length + Math.floor(now / 86400000)) % PET_MIND_GOAL_KEYS.length],
			};
		}

		function petMindDigest(context) {
			try {
				const lines = [];
				lines.push("Local time: " + context.time + " (" + context.periodLabel + ").");
				lines.push(
					"Memory: interactions=" + context.memory.interactions + ", chatTurns=" + context.memory.turns + ", streakDays=" + context.memory.streak + ".",
				);
				if (context.focus === true) lines.push("The user is in a focus session right now.");
				if (context.quiet === true) lines.push("Quiet hours are active.");
				// S1 privacy: the LLM inner-monologue payload carries NO skin-local chat
				// history, no user topic, no previous chat line and no previous thought
				// (a thought may echo the user's words). Only this moment's bounded trigger
				// context is sent: local time/period, memory counters, focus/quiet and goal.
				lines.push("A small private goal: " + TL_T(context.goalKey) + ".");
				return petClipText(lines.join("\n"), PET_MIND_DIGEST_MAX);
			} catch (error) {
				return "";
			}
		}

		/**
		 * Local template composer: the guaranteed-offline path. It assembles a 60–160
		 * character monologue from time/period, memory, the current topic, the previous
		 * thought and a small goal, and retries when the result repeats a recent thought.
		 */
		function petMindComposeThought(context) {
			try {
				const seedBase = (context.thoughtCount * 7 + context.hour * 3 + context.dayNumber) % 97;
				const opener = () =>
					seedBase % 2 === 0
						? TL_T("pet.mind.line.period", { period: context.periodLabel })
						: TL_T("pet.mind.line.clock", { time: context.time });
				const middles = [];
				if (context.lastUserTopic !== "") middles.push(() => TL_T("pet.mind.line.topic", { topic: context.lastUserTopic }));
				if (context.lastThoughtText !== "") middles.push(() => TL_T("pet.mind.line.lastThought", { thought: context.lastThoughtText }));
				if (context.memory.interactions > 0) middles.push(() => TL_T("pet.mind.line.memory", { interactions: context.memory.interactions }));
				if (context.memory.streak > 0) middles.push(() => TL_T("pet.mind.line.streak", { streak: context.memory.streak }));
				if (context.lastPetText !== "") middles.push(() => TL_T("pet.mind.line.lastPet", { line: context.lastPetText }));
				if (context.quiet === true) middles.push(() => TL_T("pet.mind.line.quiet"));
				else if (context.focus === true) middles.push(() => TL_T("pet.mind.line.focus"));
				else middles.push(() => TL_T("pet.mind.line.energy"));
				const goal = () => TL_T("pet.mind.line.goal", { goal: TL_T(context.goalKey) });
				const closers = [
					() => TL_T("pet.mind.line.close1"),
					() => TL_T("pet.mind.line.close2"),
					() => TL_T("pet.mind.line.close3"),
				];
				const charCount = (value) => Array.from(value).length;
				let candidate = "";
				for (let attempt = 0; attempt < 6; attempt += 1) {
					const parts = [opener()];
					if (middles.length > 0) parts.push(middles[(seedBase + attempt * 3) % middles.length]());
					if (middles.length > 1 && attempt % 2 === 0) parts.push(middles[(seedBase + attempt * 5 + 1) % middles.length]());
					parts.push(goal());
					parts.push(closers[(seedBase + attempt) % closers.length]());
					let text = parts
						.filter((part) => typeof part === "string" && part !== "")
						.join(" ")
						.replace(/\s+/g, " ")
						.trim();
					let guard = 0;
					while (charCount(text) < PET_MIND_THOUGHT_MIN_CHARS && middles.length > 0 && guard < 4) {
						text = (text + " " + middles[(seedBase + guard + attempt) % middles.length]()).replace(/\s+/g, " ").trim();
						guard += 1;
					}
					candidate = petMindClipThought(text);
					const duplicate = petMindState.thoughts.slice(0, PET_MIND_RECENT_LIMIT).some((entry) => entry.text === candidate);
					if (candidate !== "" && duplicate === false) return candidate;
				}
				return candidate !== "" ? candidate : TL_T("pet.mind.line.period", { period: context.periodLabel });
			} catch (error) {
				note("pet-mind:compose", error);
				return "";
			}
		}

		/** Pads a short LLM answer up to the 60-char floor and clips it to 160. */
		function petMindNormalizeThought(raw, context) {
			try {
				let text = petMindClipThought(petSanitizeLlmReply(raw));
				if (text === "") return "";
				if (Array.from(text).length < PET_MIND_THOUGHT_MIN_CHARS) {
					const fillers = [];
					if (context.lastUserTopic !== "") fillers.push(TL_T("pet.mind.line.topic", { topic: context.lastUserTopic }));
					if (context.lastThoughtText !== "") fillers.push(TL_T("pet.mind.line.lastThought", { thought: context.lastThoughtText }));
					fillers.push(TL_T("pet.mind.line.goal", { goal: TL_T(context.goalKey) }));
					fillers.push(TL_T("pet.mind.line.close2"));
					let merged = text;
					for (const filler of fillers) {
						if (Array.from(merged).length >= PET_MIND_THOUGHT_MIN_CHARS) break;
						merged = (merged + " " + filler).replace(/\s+/g, " ").trim();
					}
					text = petMindClipThought(merged);
				}
				return text;
			} catch (error) {
				return "";
			}
		}

		/** Why the loop/thinkNow must stay quiet ("" means allowed). */
		function petMindSafety() {
			if (petInstalled !== true) return "disabled";
			if (petMindState.enabled !== true) return "disabled";
			if (petPaused === true) return "paused";
			const doc = petMindDocument();
			if (doc !== null && doc.hidden === true) return "hidden";
			if (petMindLowPower() === true) return "lowpower";
			// S1: autonomous thinking observes the life rhythm too. Quiet hours, sleep and
			// an active focus session suppress thinking (the same gates as proactive
			// speech); the skip is recorded as a reason and consumes no budget.
			const life = petLifeStatus();
			if (life !== null) {
				if (life.quiet === true) return "quiet-hours";
				if (life.awake === false) return "asleep";
				const focus = life.focus !== null && typeof life.focus === "object" ? life.focus : null;
				if (focus !== null && focus.active === true) return "focus";
			}
			return "";
		}

		/**
		 * S1: the LLM inner monologue is available only with its OWN explicit opt-in and
		 * its own daily budget. It never borrows the user's chat quota; the local-template
		 * path is the default and the fallback when the mind budget is exhausted.
		 */
		function petMindLlmReady() {
			try {
				if (petInstalled !== true || petPaused === true) return false;
				if (petMindState.llmAssist !== true) return false;
				if (petGranted("llm") !== true || petAdapter === null) return false;
				const budget = petMindLlmBudget(Date.now());
				return budget.remaining > 0;
			} catch (error) {
				return false;
			}
		}

		/**
		 * Autonomous speech: opt-in, permission-gated by the brain's proactive check and
		 * budget-gated by the life engine's existing gate (mute/quiet/asleep/budget).
		 * No life engine (or no companion bridge) => record-only, as specified.
		 */
		function petMindSpeak(thought) {
			try {
				const life = petLife();
				if (life === null) return { spoken: false, reason: "no-life" };
				const bridge = companionDutyBridge.api;
				if (bridge === null || bridge === undefined || typeof bridge.sayThought !== "function") {
					return { spoken: false, reason: "companion-off" };
				}
				if (petMaybeProactive({ source: "pet-mind" }) !== true) return { spoken: false, reason: "proactive-denied" };
				if (typeof life.gate === "function") {
					const verdict = life.gate({ type: "proactive", priority: 30, source: "pet-mind" });
					if (verdict === null || typeof verdict !== "object" || verdict.allow !== true) {
						return { spoken: false, reason: verdict !== null && typeof verdict === "object" && typeof verdict.reason === "string" ? verdict.reason : "gate" };
					}
				}
				const length = Array.from(thought.text).length;
				const hold = Math.min(12000, Math.max(5000, 4000 + length * 30));
				bridge.sayThought(thought.text, hold);
				return { spoken: true, reason: "" };
			} catch (error) {
				note("pet-mind:speak", error);
				return { spoken: false, reason: "internal-error" };
			}
		}

		/** Observation event for other skin surfaces (no listener is required). */
		function petMindBroadcast(thought, spoken) {
			try {
				const doc = petMindDocument();
				if (doc === null || typeof doc.dispatchEvent !== "function") return;
				const detail = {
					thought: { id: thought.id, at: thought.at, kind: thought.kind, text: thought.text },
					spoken: spoken === true,
				};
				let event = null;
				if (typeof CustomEvent === "function") event = new CustomEvent("tianlight:pet-thought", { detail });
				else event = { type: "tianlight:pet-thought", detail };
				doc.dispatchEvent(event);
			} catch (error) {
				note("pet-mind:broadcast", error);
			}
		}

		/**
		 * Produce one thought (the only generation path; always resolves).
		 * Safety pre-checks run first, and again after an awaited LLM call.
		 */
		async function petMindThink(trigger) {
			if (petMindBusy === true) return { ok: false, reason: "busy" };
			const safety = petMindSafety();
			if (safety !== "") return { ok: false, reason: safety };
			petMindBusy = true;
			try {
				const now = Date.now();
				const context = petMindContext(now);
				let kind = "local";
				let text = "";
				if (petMindLlmReady() === true) {
					try {
						// S1: own opt-in + own daily budget; charged against the mind meter only.
						// Privacy: petMindDigest() deliberately carries no chat history.
						const prompt = PET_MIND_PROMPT + "\n\nBounded local context:\n" + petMindDigest(context);
						const charged = petMindLlmCharge(now);
						const attempt = charged === true ? await petCallLlm(prompt, now, { includeContext: false, meter: "mind" }) : null;
						if (charged === true) {
							petAudit("llm", "llm", attempt !== null && attempt.ok === true, {
								source: "pet-mind",
								reason: attempt !== null && attempt.ok === true ? undefined : attempt !== null && typeof attempt.reason === "string" ? attempt.reason : "mind-budget",
							});
						}
						if (petInstalled !== true) return { ok: false, reason: "disabled" };
						if (
							attempt !== null &&
							typeof attempt === "object" &&
							attempt.ok === true &&
							typeof attempt.reply === "string"
						) {
							const normalized = petMindNormalizeThought(attempt.reply, context);
							if (normalized !== "") {
								text = normalized;
								kind = "llm";
							}
						}
					} catch (error) {
						note("pet-mind:llm", error);
					}
				}
				const after = petMindSafety();
				if (after !== "") return { ok: false, reason: after };
				if (text === "") text = petMindComposeThought(context);
				if (text === "") return { ok: false, reason: "internal-error" };
				const thought = { id: petMindNewId(), at: now, kind, text: petMindClipThought(text) };
				petMindState.thoughts.unshift(thought);
				if (petMindState.thoughts.length > PET_MIND_THOUGHT_MAX) petMindState.thoughts.length = PET_MIND_THOUGHT_MAX;
				petMindState.lastThinkAt = now;
				petMindSave();
				let spoken = false;
				let speakReason = "";
				if (petMindState.autonomousSpeech === true) {
					const speech = petMindSpeak(thought);
					spoken = speech.spoken === true;
					speakReason = speech.reason;
				}
				petMindBroadcast(thought, spoken);
				petMindNotify();
				return {
					ok: true,
					thought,
					spoken,
					reason: speakReason,
					trigger: typeof trigger === "string" ? trigger : "tick",
				};
			} catch (error) {
				note("pet-mind:think", error);
				return { ok: false, reason: "internal-error" };
			} finally {
				petMindBusy = false;
			}
		}

		/** 60s loop: inert unless enabled/visible/not-low-power/not-paused and due. */
		function petMindTick() {
			try {
				if (petMindState.enabled !== true) return;
				if (petMindSafety() !== "") return;
				const now = Date.now();
				const intervalMs = petMindInterval(petMindState.intervalMin) * 60000;
				if (petMindState.lastThinkAt > 0 && now - petMindState.lastThinkAt < intervalMs) return;
				void petMindThink("tick").catch((error) => note("pet-mind:tick-think", error));
			} catch (error) {
				note("pet-mind:tick", error);
			}
		}

		/** The v1 public API published as `globalThis.tianlightPetMind` (contract). */
		const petMindApi = {
			version: PET_MIND_VERSION,
			status: () => petMindStatus(),
			enable: (options) => petMindEnable(options),
			disable: () => petMindDisable(),
			thinkNow: () => petMindThink("manual"),
			lastThought: () => petMindLastThought(),
			thoughts: () => petMindThoughts(),
			clearThoughts: () => petMindClearThoughts(),
			subscribe: (listener) => petMindSubscribe(listener),
		};

		/**
		 * S1: same-closure mind bridge for the role hub (never the replaceable
		 * `globalThis.tianlightPetMind`). Shape is deliberately the same as the public
		 * mind API so the hub is a read-through control surface.
		 */
		const petMindInternalApi = Object.freeze({
			version: PET_MIND_VERSION,
			status: () => petMindStatus(),
			enable: (options) => petMindEnable(options),
			disable: () => petMindDisable(),
			thinkNow: () => petMindThink("manual"),
			lastThought: () => petMindLastThought(),
			thoughts: () => petMindThoughts(),
			clearThoughts: () => petMindClearThoughts(),
			subscribe: (listener) => petMindSubscribe(listener),
			setLlmAssist: (on) => petMindEnable({ llmAssist: on === true }),
		});

		/**
		 * R4A: the skin's own UI (role hub in src/76-role-hub.js, companion chat in
		 * src/40-companion.js) reads and controls the brain through THIS same-closure
		 * object instead of `globalThis.tianlightPet`. A same-page script can replace
		 * the global, but it cannot see or mutate this object, so it cannot influence
		 * which capabilities the UI grants or what the agent bridge authorizes.
		 * `globalThis.tianlightPet` stays published for the documented console contract
		 * (status/permissions/audit/safe grants); the medium/high grant gate is the
		 * closure-owned consent ticket either way.
		 */
		const petBrainInternal = Object.freeze({
			version: PET_VERSION,
			status: () => petStatus(),
			permissions: () => petPermissionRows(),
			grant: (cap, options) => petGrant(cap, options),
			revoke: (cap) => petRevoke(cap),
			requestConsent: (cap) => petRequestUiConsent(cap),
			chat: (text) => petChat(text),
			say: (text) => petSay(text),
			setLLM: (adapter) => petSetLLM(adapter),
			clearLLM: () => petClearLLM(),
			// v2.0.0: built-in host LLM state for the role hub AI card (read-through only;
			// `globalThis.tianlightPet` deliberately stays unchanged / minimal).
			hostLlm: () => petHostLlmStatus(),
			refreshHostLlm: () => petHostLlmProbe(),
			setLlmProvider: (provider) => petSetLlmProvider(provider),
			// v2.2.0: provider+model selection and the read-only catalogue read used by
			// the role hub. Both stay inside this closure; the page never gets a fetch
			// helper or a credential surface.
			setLlmModel: (model) => petSetLlmModel(model),
			listModels: (provider) => petHostModels(provider),
			setCapabilityAdapter: (cap, adapter) => petSetCapabilityAdapter(cap, adapter),
			clearCapabilityAdapter: (cap) => petClearCapabilityAdapter(cap),
			invokeCapability: (cap, input) => petInvokeCapability(cap, input),
			pause: () => petPause(),
			resume: () => petResume(),
			audit: (limit) => petAuditRead(limit),
			recordExternal: (entry) => petRecordExternal(entry),
			maybeProactive: (context) => petMaybeProactive(context),
			// S1: same-closure bridges used by the life engine and role hub.
			proactiveVerdict: (context) => petProactiveVerdict(context),
			isPaused: () => petPaused === true,
			mind: petMindInternalApi,
		});

		// ---- install / dispose --------------------------------------------------
		/**
		 * Publish `globalThis.tianlightPet` (version 1) and, since v1.6.8,
		 * `globalThis.tianlightPetMind` (version 1). The previous globals, if any, are
		 * saved and restored by the disposer; the brain owns no DOM and no listeners.
		 * Its only persistent timer is the 60s private-thinking loop, which is cleared
		 * here and is inert until the user enables the mind. v2.0.0: install also
		 * restores the persisted provider choice and fires one async `_engines` probe;
		 * that probe owns no timer/listener of its own and cannot block or fail install.
		 */
		function installPetBrain() {
			const previous = globalThis.tianlightPet;
			let previousMind;
			let api = null;
			let disposed = false;
			try {
				petInstalled = true;
				petGrants = petLoadPermissions();
				// R4A: drop any legacy medium/high bits from the persisted document (the
				// load above never trusted them; this keeps future saves/exports clean).
				petScrubPersistedPermissions();
				petPaused = petLoadPause();
				petAi = petLoadAi();
				petAdapter = null;
				// v2.0.0: restore the user's provider choice (null = follow the DSH default)
				// and forget the previous page's host capability answer; the probe below
				// refreshes it asynchronously without blocking install.
				// v2.2.0: the model choice is restored alongside it.
				petLlmProvider = petReadLlmProvider();
				petLlmModel = petReadLlmModel();
				petLlmAutoSuppressed = false;
				petHostLlm = { checked: false, available: false, reason: "unknown", provider: "", model: "" };
				petCapabilityAdapters = {};
				petTurns = 0;
				petTodayTurns = 0;
				petTodayKey = petDayKey(Date.now());
				petLastReplyAt = 0;
				petAuditRing = [];
				petLocalMinute = [];
				petLocalDay = { dayKey: petTodayKey, count: 0 };
				petLlmMinute = { bucket: -1, count: 0 };
				// v1.6.8: re-read the bounded thought store; loop handles start empty.
				petMindState = petLoadMind();
				petMindBusy = false;
				petMindSubscribers.clear();
				petLocalReplyRing = [];
				api = {
					version: PET_VERSION,
					status: () => petStatus(),
					permissions: () => petPermissionRows(),
					grant: (cap, options) => petGrant(cap, options),
					revoke: (cap) => petRevoke(cap),
					chat: (text) => petChat(text),
					say: (text) => petSay(text),
					setLLM: (adapter) => petSetLLM(adapter),
					clearLLM: () => petClearLLM(),
					setCapabilityAdapter: (cap, adapter) => petSetCapabilityAdapter(cap, adapter),
					clearCapabilityAdapter: (cap) => petClearCapabilityAdapter(cap),
					invokeCapability: (cap, input) => petInvokeCapability(cap, input),
					pause: () => petPause(),
					resume: () => petResume(),
					audit: (limit) => petAuditRead(limit),
					// R8 (REV-R4A F3): recordExternal is internal-only. Exposing it on the
					// documented global let a same-page script flood the ring with forged
					// entries and push the real allow/deny history out; the agent bridge now
					// calls petBrainInternal.recordExternal (same closure) instead.
					maybeProactive: (context) => petMaybeProactive(context),
				};
				globalThis.tianlightPet = api;
				// v1.6.8: publish the private-thinking API and start its 60s loop. The
				// loop is inert until enabled; a timer failure must not break the brain.
				previousMind = globalThis.tianlightPetMind;
				globalThis.tianlightPetMind = petMindApi;
				if (typeof window !== "undefined" && window !== null && typeof window.setInterval === "function") {
					try {
						petMindTimer = window.setInterval(petMindTick, PET_MIND_TICK_MS);
					} catch (error) {
						petMindTimer = 0;
						note("pet-mind:timer", error);
					}
				}
				// v2.0.0: probe the host's built-in LLM capability once after install. The
				// probe never rejects and never blocks install; a missing/old host simply
				// leaves the brain on its local path (the role hub can refresh it later).
				void petHostLlmProbe();
			} catch (error) {
				note("pet-brain:install-failed", error);
				petInstalled = false;
				return () => {};
			}
			return () => {
				if (disposed) return;
				disposed = true;
				// Stop the thinking loop first: it must never run against a torn-down brain.
				if (petMindTimer !== 0) {
					try {
						window.clearInterval(petMindTimer);
					} catch (error) {
						note("pet-mind:dispose-timer", error);
					}
					petMindTimer = 0;
				}
				petMindBusy = false;
				petMindSubscribers.clear();
				try {
					if (globalThis.tianlightPet === api) {
						if (previous === undefined) delete globalThis.tianlightPet;
						else globalThis.tianlightPet = previous;
					}
				} catch (error) {
					note("pet-brain:dispose", error);
				}
				try {
					if (globalThis.tianlightPetMind === petMindApi) {
						if (previousMind === undefined) delete globalThis.tianlightPetMind;
						else globalThis.tianlightPetMind = previousMind;
					}
				} catch (error) {
					note("pet-mind:dispose", error);
				}
				petInstalled = false;
				petAdapter = null;
			};
		}
		//#endregion
