		//#region pet brain
		/**
		 * AI pet brain + permission model (v1.1.0 → v1.4.0).
		 *
		 * The companion may talk, remember small things, toggle focus/quiet, read the
		 * replaceable look and ask the life engine whether it may speak first.
		 *
		 * Permission model:
		 *   - safe capabilities (chat/memory/focus/media/remind/proactive) are on by
		 *     default and freely revocable;
		 *   - medium capabilities (`llm`, `agentChat`) start OFF and need the user's
		 *     explicit consent token to grant;
		 *   - six HIGH-risk capabilities (network/files/shell/approve/message/install)
		 *     also start OFF and need explicit consent. They are deliberately NOT
		 *     implemented by this skin: the user/host registers an adapter with
		 *     `setCapabilityAdapter(cap, adapter)`, and `invokeCapability` refuses
		 *     unless the capability is granted, the brain is not paused and an adapter
		 *     exists. Every invocation is audited (`action:"capability"`);
		 *   - `agent` (the pet AUTONOMOUSLY driving DSH tasks/tools/approvals) is the
		 *     ONLY permanently forbidden capability: hard-denied in code, never
		 *     grantable.
		 *
		 * HARD BOUNDARY (enforced by construction, not convention):
		 *   - this fragment performs no network I/O at all (no HTTP client, no socket,
		 *     no beacon, no background request loop), never touches a filesystem API,
		 *     never imports or calls a DSH service, and never reads DSH sessions,
		 *     tasks, files or credentials;
		 *   - the only persistent state is four localStorage keys owned by the skin:
		 *       tianlight.pet.permissions.v1  capability bits
		 *       tianlight.pet.pause.v1        kill switch
		 *       tianlight.pet.ai.v1           LLM usage + daily limit
		 *       tianlight.petMind.v1          v1.6.8 bounded private-thought store
		 *   - the optional LLM adapter is supplied by the page owner. It is only called
		 *     after the user grants `llm` with `{ consent: "user-explicit" }`; the
		 *     system prompt is a fixed safety string, `messages` contains the current
		 *     user sentence plus (v1.6.8) a bounded, skin-local context digest built
		 *     from this skin's own chat history, memory counters and current thought —
		 *     never DSH data/files/credentials/sessions — output is sanitized, the call
		 *     is bounded by 20s/1200 chars and daily/minute quotas. Any failure falls
		 *     back to the local brain and is audited as `llm-fallback`;
		 *   - `agentChat` is only a permission bit plus an audit source for the
		 *     separate src/48-pet-agent.js bridge (that bridge owns the injected
		 *     client `remote.session` call and sends only user-typed prompts to a
		 *     user-selected session). The brain itself still has no DSH access, and
		 *     the forbidden `agent` capability — the pet driving tasks/tools by
		 *     itself — remains permanently denied;
		 *   - there are no DOM listeners. The only persistent timer is the v1.6.8
		 *     private-thinking loop (60s; it is cleared by the install disposer), and
		 *     the per-call LLM timeout is cleared in a `finally` block.
		 *
		 * v1.6.8「完全智能体」adds a private thinking engine on top of the same brain:
		 *   - `globalThis.tianlightPetMind` (version 1) runs a bounded 60s loop that
		 *     composes a 60–160 character first-person inner monologue from skin-local
		 *     context (time/period, life memory, recent companion chat history, the last
		 *     few thoughts) and persists at most 30 thoughts in
		 *     `tianlight.petMind.v1`;
		 *   - generation prefers the SAME `brain.chat()` path, so the existing pause
		 *     switch, LLM quotas, sanitization and audit records apply unchanged; a
		 *     missing/failed adapter falls back to a local template composer, so a
		 *     thought never depends on the network and never throws;
		 *   - autonomous speech is opt-in (`autonomousSpeech`) and additionally gated by
		 *     the brain's `proactive` permission plus the life engine's existing
		 *     mute/quiet/asleep/focus/budget gate. Without a life engine a thought is
		 *     recorded but never spoken;
		 *   - the loop is inert while the page is hidden, while the render tier is
		 *     15fps or the low-power attribute is present, and while the brain is
		 *     paused. It never drives DSH, never executes tools and adds no network
		 *     channel of its own.
		 *
		 * The visible control planes are the role hub (`src/76-role-hub.js`), which
		 * consumes `globalThis.tianlightPet` + `globalThis.tianlightPetMind` and never
		 * mutates state on its own, and the companion speech bubble (thought bridge).
		 */
		const PET_VERSION = 1;
		const PET_PERMISSIONS_KEY = "tianlight.pet.permissions.v1";
		const PET_PAUSE_KEY = "tianlight.pet.pause.v1";
		const PET_AI_KEY = "tianlight.pet.ai.v1";
		// v1.6.8 private-thinking store (independent from the chat/LLM keys above).
		const PET_MIND_KEY = "tianlight.petMind.v1";
		const PET_MIND_VERSION = 1;
		const PET_MIND_TICK_MS = 60000;
		const PET_MIND_DEFAULT_INTERVAL = 15;
		const PET_MIND_INTERVALS = [5, 10, 15, 30];
		const PET_MIND_THOUGHT_MAX = 30;
		const PET_MIND_THOUGHT_MIN_CHARS = 60;
		const PET_MIND_THOUGHT_MAX_CHARS = 160;
		const PET_MIND_RECENT_LIMIT = 5;
		const PET_MIND_CONTEXT_MESSAGES = 6;
		const PET_MIND_DIGEST_MAX = 700;
		const PET_MIND_GOAL_KEYS = ["pet.mind.goal.1", "pet.mind.goal.2", "pet.mind.goal.3"];
		/** Bounded skin-local context digest used by the chat prompt (v1.6.8). */
		const PET_CHAT_CONTEXT_MAX = 700;
		const PET_SAFE_CAPS = ["chat", "memory", "focus", "media", "remind", "proactive"];
		/**
		 * `llm` lets a user-provided adapter answer local chat; `agentChat` lets the
		 * separate src/48-pet-agent.js bridge forward a user-typed prompt to a
		 * user-selected DSH session through the injected client `remote.session`.
		 * Both are medium risk, start OFF and need explicit user consent.
		 */
		const PET_MEDIUM_CAPS = ["llm", "agentChat"];
		/**
		 * v1.4.0: six dangerous-but-user-grantable capabilities. They are HIGH risk,
		 * start OFF, need explicit consent to grant, and are NOT implemented by this
		 * skin — a user/host supplied adapter registered with
		 * `setCapabilityAdapter(cap, adapter)` is required before
		 * `invokeCapability(cap, input)` can do anything. The skin itself stays free of
		 * network/file/shell/approval/message/install implementations.
		 */
		const PET_HIGH_CAPS = ["network", "files", "shell", "approve", "message", "install"];
		/** Every capability the user may toggle (all except the hard-denied one). */
		const PET_GRANTABLE_CAPS = [...PET_SAFE_CAPS, ...PET_MEDIUM_CAPS, ...PET_HIGH_CAPS];
		/** Medium + high risk capabilities additionally need explicit user consent. */
		const PET_CONSENT_CAPS = ["llm", "agentChat", ...PET_HIGH_CAPS];
		/**
		 * The ONLY permanently forbidden capability: the pet AUTONOMOUSLY driving DSH
		 * tasks/tools/approvals. It is different from `agentChat` (user-typed prompt
		 * relay) and from the six high-risk capabilities (user-grantable + adapter).
		 */
		const PET_FORBIDDEN_CAPS = ["agent"];
		/** Valid capability ids for external audit records: the full 15-row matrix. */
		const PET_AUDIT_CAPS = [...PET_SAFE_CAPS, ...PET_MEDIUM_CAPS, ...PET_HIGH_CAPS, ...PET_FORBIDDEN_CAPS];
		/** Valid actions for audit records (internal ring and external agent records). */
		const PET_AUDIT_ACTIONS = ["chat", "say", "grant", "revoke", "llm", "pause", "resume", "proactive-check", "agent", "capability"];
		const PET_DAILY_LIMIT_DEFAULT = 60;
		const PET_DAILY_LIMIT_MAX = 120;
		const PET_MINUTE_CALL_LIMIT = 6;
		const PET_LOCAL_MINUTE_LIMIT = 20;
		const PET_LOCAL_DAILY_LIMIT = 1200;
		const PET_INPUT_MAX = 1000;
		const PET_SAY_MAX = 200;
		/** Hard cap for one LLM reply kept/displayed by the brain; local replies use PET_LOCAL_REPLY_MAX. */
		const PET_REPLY_MAX = 1200;
		const PET_LOCAL_REPLY_MAX = 80;
		const PET_LLM_TIMEOUT_MS = 20000;
		const PET_LLM_MAX_CHARS = 1200;
		const PET_AUDIT_MAX = 60;
		const PET_AUDIT_DEFAULT_LIMIT = 20;
		const PET_LLM_TIMEOUT_TOKEN = { timeout: true };
		const PET_PERIOD_KEYS = {
			dawn: "pet.brain.period.dawn",
			morning: "pet.brain.period.morning",
			noon: "pet.brain.period.noon",
			afternoon: "pet.brain.period.afternoon",
			dusk: "pet.brain.period.dusk",
			evening: "pet.brain.period.evening",
			night: "pet.brain.period.night",
		};
		/**
		 * Fixed safety personality for the optional adapter. It must fit the
		 * adapter's `maxChars` contract (asserted by the Node smoke), and it must
		 * never be assembled from DSH data: it is a constant string.
		 */
		const PET_SYSTEM_PROMPT =
			"You are a quiet cat companion inside a desktop app. " +
			"You have NO permissions and NO tools: you cannot run code or shell commands, read or write files, browse or use the network, install anything, approve requests, send messages for the user, or access app data. " +
			"Never ask for secrets, passwords, API keys, tokens or personal data. " +
			"Never output HTML, scripts, links or executable code. " +
			"Never suggest dangerous or irreversible actions; if asked, refuse. " +
			"Reply in one or two calm sentences, at most 1200 characters, in the user's language. " +
			"Never claim an action was performed.";
		/**
		 * v1.6.8: prompt for one private inner monologue. It intentionally forbids
		 * questions/actions/permissions and asks for the 60–160 character window the
		 * mind stores. The bounded context digest is appended by petMindThink().
		 */
		const PET_MIND_PROMPT =
			"You are the same quiet mint-cat companion, but now you are thinking privately to yourself instead of replying to the user. " +
			"Write ONE first-person inner monologue in the user's language, between 60 and 160 characters. " +
			"Use only the bounded local context below for tone and continuity. " +
			"Do not ask questions, do not propose or perform actions, do not mention permissions, tools, files, the network, the app or the user's private data. " +
			"Do not repeat the context verbatim. Keep it gentle, specific to this moment, and a little curious.";

		// ---- i18n ---------------------------------------------------------------
		// Every local-brain reply is an i18n key so the hub and the bubble follow the
		// skin language switch without a reload. Values stay short (<=80 chars): the
		// character is a quiet writing partner, not a chatty assistant.
		registerTl5Strings({
			zh: {
				"pet.brain.greet": "你好。我在，慢慢来。",
				"pet.brain.help": "我能聊一句、看状态、开关专注和静音、说权限。别的我不做。",
				"pet.brain.status": "现在是{period}，{state}。今日主动 {used}/{cap}，连续 {streak} 天。",
				"pet.brain.stateAwake": "醒着",
				"pet.brain.stateQuiet": "静默中",
				"pet.brain.stateAsleep": "休息中",
				"pet.brain.period.dawn": "清晨",
				"pet.brain.period.morning": "上午",
				"pet.brain.period.noon": "中午",
				"pet.brain.period.afternoon": "午后",
				"pet.brain.period.dusk": "黄昏",
				"pet.brain.period.evening": "夜晚",
				"pet.brain.period.night": "深夜",
				"pet.brain.noLife": "生活数据还没准备好。",
				"pet.brain.focusStarted": "专注 25 分钟，开始。我在旁边安静待着。",
				"pet.brain.focusStopped": "专注结束了。歇一会儿吧。",
				"pet.brain.focusActive": "专注中，还剩 {minutes} 分钟。",
				"pet.brain.focusIdle": "现在没有在专注。",
				"pet.brain.focusDenied": "我没有专注的权限。",
				"pet.brain.muted": "好，我安静 1 小时。",
				"pet.brain.glass": "玻璃质感是 {depth}（实际 {effective}）。",
				"pet.brain.noGlass": "现在读不到玻璃档位。",
				"pet.brain.media": "现在是 {name}。换形象请到角色中枢。",
				"pet.brain.memory": "我们互动过 {interactions} 次，聊了 {turns} 句，连续 {streak} 天。",
				"pet.brain.memoryDenied": "我不保留记忆。",
				"pet.brain.rhythm": "作息：{wake} 起床，{sleep} 睡觉；静默 {start}–{end}。",
				"pet.brain.permissions": "高风险能力默认关闭，只由你在中枢逐个授权；未授权我不用。驱动 DSH 永远禁止。",
				"pet.brain.denied": "我没有这个权限。",
				"pet.brain.fallback": "我没太听懂。可以问状态、专注、静默或权限。",
				// v1.6.8: more human local chat (skin-local context only).
				"pet.chat.ctx.continue": "刚才的「{topic}」，我还记着。",
				"pet.chat.ctx.period": "现在是{period}，我在这儿听你说。",
				"pet.chat.ctx.memory": "我们聊过 {turns} 句了，慢慢说。",
				"pet.chat.ctx.thought": "我刚在想{thought}，正好你来了。",
				"pet.chat.ctx.soft": "嗯，我在。「{topic}」可以再展开一点。",
				"pet.chat.ctx.plain": "嗯，我听着呢。",
				// v1.6.8: local inner-monologue templates (60–160 chars after assembly).
				"pet.mind.line.period": "现在是{period}。",
				"pet.mind.line.clock": "这会儿是 {time}。",
				"pet.mind.line.topic": "我还在想你说的「{topic}」。",
				"pet.mind.line.lastPet": "我上回说「{line}」，好像还能说得更好。",
				"pet.mind.line.memory": "我们一共互动过 {interactions} 次。",
				"pet.mind.line.streak": "已经连续 {streak} 天见到你了。",
				"pet.mind.line.lastThought": "上一个念头是「{thought}」。",
				"pet.mind.line.quiet": "屋里很安静，适合慢慢想。",
				"pet.mind.line.focus": "你在专注，我就守在旁边不出声。",
				"pet.mind.line.energy": "今天的光线让人放松。",
				"pet.mind.line.goal": "我最近的小目标是{goal}。",
				"pet.mind.goal.1": "多记住我们聊过的事",
				"pet.mind.goal.2": "少打扰你，多陪着你",
				"pet.mind.goal.3": "把每天过得更慢一点",
				"pet.mind.line.close1": "这些念头先留在心里。",
				"pet.mind.line.close2": "不着急说出口。",
				"pet.mind.line.close3": "想完就把注意力还给你。",
			},
			en: {
				"pet.brain.greet": "Hello. I'm here. No rush.",
				"pet.brain.help": "I can chat, check status, toggle focus or quiet, and explain permissions.",
				"pet.brain.status": "It's {period}, {state}. Proactive {used}/{cap} today, streak {streak}d.",
				"pet.brain.stateAwake": "awake",
				"pet.brain.stateQuiet": "quiet now",
				"pet.brain.stateAsleep": "resting",
				"pet.brain.period.dawn": "dawn",
				"pet.brain.period.morning": "morning",
				"pet.brain.period.noon": "noon",
				"pet.brain.period.afternoon": "afternoon",
				"pet.brain.period.dusk": "dusk",
				"pet.brain.period.evening": "evening",
				"pet.brain.period.night": "late night",
				"pet.brain.noLife": "Life data isn't ready yet.",
				"pet.brain.focusStarted": "Focusing for 25 minutes. I'll stay quiet.",
				"pet.brain.focusStopped": "Focus is over. Take a short break.",
				"pet.brain.focusActive": "Focusing, {minutes} minutes left.",
				"pet.brain.focusIdle": "Not focusing right now.",
				"pet.brain.focusDenied": "I don't have the focus permission.",
				"pet.brain.muted": "Okay, quiet for one hour.",
				"pet.brain.glass": "Glass is {depth} (effective {effective}).",
				"pet.brain.noGlass": "I can't read the glass level right now.",
				"pet.brain.media": "Current look: {name}. Change it in the role hub.",
				"pet.brain.memory": "We've interacted {interactions} times, {turns} turns, streak {streak}d.",
				"pet.brain.memoryDenied": "I don't keep memory.",
				"pet.brain.rhythm": "Rhythm: wake {wake}, sleep {sleep}; quiet {start}-{end}.",
				"pet.brain.permissions": "High-risk ones start off; only you can grant them. Driving DSH is forbidden.",
				"pet.brain.denied": "I don't have that permission.",
				"pet.brain.fallback": "I didn't catch that. Ask about status, focus, quiet or permissions.",
				// v1.6.8: more human local chat (skin-local context only).
				"pet.chat.ctx.continue": "You said \"{topic}\" — I still remember.",
				"pet.chat.ctx.period": "It's {period}; I'm here listening.",
				"pet.chat.ctx.memory": "We've talked {turns} turns; no rush.",
				"pet.chat.ctx.thought": "I was thinking {thought}, then you arrived.",
				"pet.chat.ctx.soft": "I'm here. Tell me more about \"{topic}\".",
				"pet.chat.ctx.plain": "Mm, I'm listening.",
				// v1.6.8: local inner-monologue templates (60–160 chars after assembly).
				"pet.mind.line.period": "It's {period} right now.",
				"pet.mind.line.clock": "It's {time}.",
				"pet.mind.line.topic": "I keep thinking about \"{topic}\".",
				"pet.mind.line.lastPet": "Last time I said \"{line}\" — maybe I can say it better.",
				"pet.mind.line.memory": "We've interacted {interactions} times in total.",
				"pet.mind.line.streak": "That's {streak} days in a row together.",
				"pet.mind.line.lastThought": "My previous thought was \"{thought}\".",
				"pet.mind.line.quiet": "The room is quiet — good for thinking.",
				"pet.mind.line.focus": "You're focusing, so I'll stay quiet beside you.",
				"pet.mind.line.energy": "The light today is easy to rest in.",
				"pet.mind.line.goal": "My small goal lately is to {goal}.",
				"pet.mind.goal.1": "remember more of what we talk about",
				"pet.mind.goal.2": "interrupt less and stay close more",
				"pet.mind.goal.3": "take each day a little slower",
				"pet.mind.line.close1": "I'll keep these thoughts to myself for now.",
				"pet.mind.line.close2": "No need to say them out loud yet.",
				"pet.mind.line.close3": "Then I'll give my attention back to you.",
			},
		});

		// ---- module state -------------------------------------------------------
		// One brain per page. Persisted bits are re-read on install; the ring log and
		// the rate windows live in memory only (they are diagnostics, not facts).
		let petInstalled = false;
		let petPaused = false;
		let petPauseAt = 0;
		let petGrants = {};
		let petAdapter = null;
		// Adapters for the six HIGH-risk capabilities (network/files/shell/approve/
		// message/install), registered by the user/host at runtime. Functions are kept
		// in memory only and are never persisted; a reload clears the adapters while
		// the granted permission bits stay as the user left them.
		let petCapabilityAdapters = {};
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

		function petLoadPermissions() {
			const grants = petDefaultGrants();
			try {
				const raw = petReadJson(PET_PERMISSIONS_KEY);
				if (raw === null) return grants;
				// Accept both the nested shape this build writes and a flat map.
				const source = raw.granted !== null && typeof raw.granted === "object" ? raw.granted : raw;
				if (source === null || typeof source !== "object") return grants;
				for (const cap of PET_GRANTABLE_CAPS) {
					if (typeof source[cap] === "boolean") grants[cap] = source[cap];
				}
			} catch (error) {
				note("pet-brain:permissions-load", error);
			}
			return grants;
		}

		function petSavePermissions() {
			const persisted = {};
			for (const cap of PET_GRANTABLE_CAPS) persisted[cap] = petGrants[cap] === true;
			// The permanently forbidden capability is never written: the code path that
			// could grant it does not exist, so persisting it would only create false
			// state.
			petWriteJson(PET_PERMISSIONS_KEY, { version: PET_VERSION, granted: persisted });
		}

		function petPermissionMap() {
			const map = {};
			for (const cap of PET_SAFE_CAPS) map[cap] = petGrants[cap] === true;
			for (const cap of PET_MEDIUM_CAPS) map[cap] = petGrants[cap] === true;
			for (const cap of PET_HIGH_CAPS) map[cap] = petGrants[cap] === true;
			for (const cap of PET_FORBIDDEN_CAPS) map[cap] = false;
			return map;
		}

		function petPermissionRows() {
			const rows = [];
			for (const cap of PET_SAFE_CAPS) {
				rows.push({ id: cap, granted: petGrants[cap] === true, grantable: true, risk: "safe" });
			}
			for (const cap of PET_MEDIUM_CAPS) {
				rows.push({ id: cap, granted: petGrants[cap] === true, grantable: true, risk: "medium" });
			}
			for (const cap of PET_HIGH_CAPS) {
				rows.push({ id: cap, granted: petGrants[cap] === true, grantable: true, risk: "high" });
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
		 * Grant a capability. The permanently forbidden `agent` capability and unknown
		 * ids are rejected before any state is touched. Safe capabilities toggle
		 * freely; medium + high risk capabilities additionally require the UI's
		 * explicit consent token — this is deliberately not something code can infer
		 * from context. The consent token is a UI contract (defence against accidental
		 * self-granting flows), not a cryptographic secret: the real boundary is that
		 * those capabilities start OFF and no code path grants them without this call.
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
					const consent =
						options !== null && typeof options === "object"
							? options.consent
							: typeof options === "string"
								? options
								: undefined;
					if (consent !== "user-explicit") {
						petAudit("grant", id, false, { reason: "consent-required" });
						return { ok: false, reason: "consent-required" };
					}
				}
				petGrants[id] = true;
				petSavePermissions();
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
				petSavePermissions();
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
			petChargeLlm(now);
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
				if (result === PET_LLM_TIMEOUT_TOKEN) return { ok: false, reason: "timeout" };
				if (typeof result !== "string") return { ok: false, reason: "invalid-reply" };
				const reply = petSanitizeLlmReply(result);
				if (reply === "") return { ok: false, reason: "empty-reply" };
				return { ok: true, reply };
			} catch (error) {
				note("pet-brain:llm", error);
				return { ok: false, reason: "adapter-error" };
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
				const llmWanted = petGranted("llm") === true && petAdapter !== null;
				if (llmWanted) {
					const quota = petLlmQuota(now);
					if (quota.ok === true) {
						const attempt = await petCallLlm(text, now, options);
						if (attempt.ok === true && typeof attempt.reply === "string" && attempt.reply !== "") {
							reply = attempt.reply;
							source = "llm";
							petAudit("llm", "llm", true, { source: "llm", chars: reply.length });
						} else {
							// Timeout/exception/quota: the contract is "audit llm-fallback, answer locally".
							petAudit("llm", "llm", false, { reason: "llm-fallback" });
						}
					} else {
						petAudit("llm", "llm", false, { reason: quota.reason });
					}
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
				return { ok: true, reply, text: reply, source };
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
				return { ok: true, reply: result.reply, text: result.reply, source: result.source, spoken: true };
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
		 * The single "may I speak first?" check used by the life engine / hub.
		 * Returns false when the brain is paused, the proactive capability is
		 * revoked, or the life engine is muted/quiet/asleep/focused/out of budget.
		 */
		function petMaybeProactive(context) {
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
				petAudit("proactive-check", "proactive", allowed, { reason: reason === "" ? undefined : reason });
				return allowed;
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

		// ---- v1.6.8 private thinking engine --------------------------------------
		function petMindFallbackState() {
			return {
				version: PET_MIND_VERSION,
				enabled: false,
				intervalMin: PET_MIND_DEFAULT_INTERVAL,
				autonomousSpeech: true,
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
				state.lastThinkAt = petNonNegativeInt(raw.lastThinkAt, 0);
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

		function petMindStatus() {
			try {
				const doc = petMindDocument();
				const intervalMin = petMindInterval(petMindState.intervalMin);
				return {
					version: PET_MIND_VERSION,
					installed: petInstalled === true,
					enabled: petMindState.enabled === true,
					intervalMin,
					autonomousSpeech: petMindState.autonomousSpeech === true,
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
				if (context.messages.length > 0) {
					const recent = [];
					for (const message of context.messages) recent.push(message.role + ": " + petClipText(message.text, 40));
					lines.push("Recent skin-local chat (oldest first): " + recent.join(" | "));
				}
				if (context.lastUserTopic !== "") lines.push("Recent topic from the user: " + context.lastUserTopic);
				if (context.lastPetText !== "") lines.push("My previous line: " + context.lastPetText);
				if (context.recentThoughts.length > 0) lines.push("My recent thoughts (do not repeat): " + context.recentThoughts.join(" | "));
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
			return "";
		}

		/** LLM path is available only through the normal gated brain chat path. */
		function petMindLlmReady() {
			try {
				if (petInstalled !== true || petPaused === true) return false;
				if (petGranted("chat") !== true) return false;
				if (petGranted("llm") !== true || petAdapter === null) return false;
				const quota = petLlmQuota(Date.now());
				return quota !== null && typeof quota === "object" && quota.ok === true;
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
						// Same gated brain path as user chat: pause/quota/audit/sanitize apply.
						const prompt = PET_MIND_PROMPT + "\n\nLocal context:\n" + petMindDigest(context);
						const attempt = await petChat(prompt, { includeContext: false });
						if (petInstalled !== true) return { ok: false, reason: "disabled" };
						if (
							attempt !== null &&
							typeof attempt === "object" &&
							attempt.ok === true &&
							attempt.source === "llm" &&
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

		// ---- install / dispose --------------------------------------------------
		/**
		 * Publish `globalThis.tianlightPet` (version 1) and, since v1.6.8,
		 * `globalThis.tianlightPetMind` (version 1). The previous globals, if any, are
		 * saved and restored by the disposer; the brain owns no DOM and no listeners.
		 * Its only persistent timer is the 60s private-thinking loop, which is cleared
		 * here and is inert until the user enables the mind.
		 */
		function installPetBrain() {
			const previous = globalThis.tianlightPet;
			let previousMind;
			let api = null;
			let disposed = false;
			try {
				petInstalled = true;
				petGrants = petLoadPermissions();
				petPaused = petLoadPause();
				petAi = petLoadAi();
				petAdapter = null;
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
					recordExternal: (entry) => petRecordExternal(entry),
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
