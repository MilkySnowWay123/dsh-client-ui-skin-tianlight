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
		 *   - its ONLY network I/O is the user-enabled, same-origin host bridge added
		 *     in v2.0.0: a `_engines` capability probe and
		 *     `POST /skin-tianlight/_pet-chat` while the user has granted `llm`. It
		 *     never contacts another origin, has no beacon and no background request
		 *     loop, never touches a filesystem API, never imports or calls a DSH
		 *     service directly, and never reads DSH sessions, tasks, files or
		 *     credentials (the host route receives no session id, no tools and no
		 *     credentials);
		 *   - the only persistent skin state is five localStorage keys:
		 *       tianlight.pet.permissions.v1  SAFE capability bits only (R4A: the
		 *                                     medium/high bits are session-memory)
		 *       tianlight.pet.pause.v1        kill switch
		 *       tianlight.pet.ai.v1           LLM usage + daily limit
		 *       tianlight.petMind.v1          v1.6.8 bounded private-thought store
		 *       tianlight.pet.llmProvider.v1  v2.0.0 user-chosen provider id only
		 *   - the optional LLM adapter is supplied by the page owner (v2.0.0: the brain
		 *     auto-registers a built-in `dsh` adapter when the host reports a usable
		 *     model; a user-registered non-`dsh` adapter is never overwritten). It is
		 *     only called after the user grants `llm` through the role hub's two-step confirmation
		 *     (R4A: an internal one-shot closure ticket, never a replayable string); the
		 *     system prompt is a fixed safety string, `messages` contains the current
		 *     user sentence plus (v1.6.8) a bounded, skin-local context digest built
		 *     from this skin's own chat history, memory counters and current thought —
		 *     never DSH data/files/credentials/sessions — output is sanitized, the call
		 *     is bounded by 20s/1200 chars and daily/minute quotas. Any failure falls
		 *     back to the local brain and is audited with a stable reason code
		 *     (`llm-fallback` remains the fallback for an adapter that reports none);
		 *   - `agentChat` is only a permission bit plus an audit source for the
		 *     separate src/48-pet-agent.js bridge (that bridge owns the injected
		 *     client `remote.session` call and sends only user-typed prompts to a
		 *     user-selected session). R4A: the bridge authorizes via this fragment's
		 *     closure state (`petAgentChatAllowed`); listing DSH sessions also needs
		 *     the grant. The brain itself still has no DSH access, and the forbidden
		 *     `agent` capability — the pet driving tasks/tools by itself — remains
		 *     permanently denied;
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
		 * v2.0.0「桌宠 AI 对话走 DSH LLM」adds a built-in browser adapter:
		 *   - the brain probes `_engines.capabilities.petLlm` on install, on demand and
		 *     after a failed AI call. When the host reports a usable model it
		 *     auto-registers the adapter `{ id: "dsh", chat }`, which POSTs only the
		 *     bounded user content to `POST /skin-tianlight/_pet-chat` and throws an
		 *     Error carrying a stable `code` on failure. A user-registered non-`dsh`
		 *     adapter is never overridden, and `llm` still needs the user's explicit
		 *     grant before anything is called;
		 *   - the role hub writes the chosen provider through the same-closure bridge
		 *     (`setLlmProvider`); the model always follows the DSH default (plan A),
		 *     so there is no per-model selection. Only the provider string persists
		 *     (`tianlight.pet.llmProvider.v1`, null/absent = follow the default);
		 *   - a failed AI call degrades to the local brain exactly as before; the chat
		 *     result carries an additive `llmError` stable code and
		 *     `petLlmHintText()` localizes the user-facing hint. The existing quotas
		 *     (60/day, 6/min, 1200 chars, 20s), permissions/consent, sanitization and
		 *     the audit ring are unchanged, and the private mind keeps its independent
		 *     12/day budget and chat-history-free prompt.
		 *
		 * The visible control planes are the role hub (`src/76-role-hub.js`) and the
		 * companion speech bubble (thought bridge). R4A: both now call the same-closure
		 * `petBrainInternal` bridge instead of `globalThis.tianlightPet`, so a page
		 * script that replaces a global cannot change what the UI grants or reads.
		 * `globalThis.tianlightPet` stays published as the documented console surface.
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
		// S1: the optional LLM inner monologue has its OWN daily budget. It never charges
		// the user's chat quota (PET_DAILY_LIMIT_DEFAULT), so a long thinking session
		// cannot leave the user without chat budget. 12 thoughts/day = a full day at 15m.
		const PET_MIND_LLM_DAILY_LIMIT = 12;
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
		 * R4A (v0.6.1 security pass): medium/high grants are SESSION-ONLY. They are
		 * never written to localStorage, never loaded from it and never imported, so
		 * a page reload (or a second browser, or a recipe bundle) cannot restore a
		 * dangerous grant. The role hub re-asks with the two-step confirmation after
		 * every load. Safe capabilities keep persisting exactly as before.
		 */
		const PET_SESSION_ONLY_CAPS = ["llm", "agentChat", ...PET_HIGH_CAPS];
		/** A UI consent ticket is single-use and expires after two minutes. */
		const PET_CONSENT_TICKET_TTL_MS = 120000;
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
		// ---- v2.0.0 built-in DSH LLM adapter (host bridge) ----------------------
		// The browser cannot call a model (remote.llm only lists providers), so the only
		// model path is the host's fixed-prompt route. These constants are shared by the
		// capability probe, the built-in adapter and the role hub's status card.
		const PET_HOST_LLM_ROUTE = ASSET_BASE + "/_pet-chat";
		/** fetch-level fallback; the 20s PET_LLM_TIMEOUT_MS race in petCallLlm still wins. */
		const PET_HOST_LLM_FETCH_TIMEOUT_MS = 25000;
		/** Only the user's provider choice persists; null/absent = follow the DSH default. */
		const PET_LLM_PROVIDER_KEY = "tianlight.pet.llmProvider.v1";
		/** Stable error codes shared with the host route (unknown codes normalize to llm-error). */
		const PET_LLM_CODES = [
			"invalid-request",
			"too-large",
			"busy",
			"unconfigured-model",
			"provider-not-allowed",
			"timeout",
			"aborted",
			"host-unavailable",
			"missing-credential",
			"quota",
			"rate-limit",
			"llm-error",
		];
		/** Stable code -> localized "replied locally because…" hint key. */
		const PET_LLM_HINT_KEYS = {
			"unconfigured-model": "pet.chat.llmHint.unconfiguredModel",
			// An explicit provider override the host no longer knows is the same user fix:
			// pick/configure a usable provider in the role hub (never "restart the host").
			"provider-not-allowed": "pet.chat.llmHint.unconfiguredModel",
			"missing-credential": "pet.chat.llmHint.missingCredential",
			quota: "pet.chat.llmHint.quota",
			"rate-limit": "pet.chat.llmHint.rateLimit",
			timeout: "pet.chat.llmHint.timeout",
			"host-unavailable": "pet.chat.llmHint.hostUnavailable",
		};
		/**
		 * Host `petLlm.reason` values that mean "no usable model is configured". The host
		 * reports `no-default-model` as well; folding it into `unconfigured-model` gives
		 * the actionable "configure a model" hint instead of the misleading restart hint.
		 */
		const PET_HOST_LLM_UNCONFIGURED_REASONS = ["unconfigured-model", "no-llm-service", "no-providers", "no-default-model"];
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
				// v2.0.0: built-in DSH LLM chat — where the reply came from, and why a
				// failed model call still answered locally (short, actionable, both languages).
				"pet.chat.source.ai": "AI 回复",
				"pet.chat.source.local": "本地回复",
				"pet.chat.llmHint.unconfiguredModel": "未配置模型，已用本地回复",
				"pet.chat.llmHint.missingCredential": "缺少凭据，已用本地回复",
				"pet.chat.llmHint.quota": "模型额度不足，已用本地回复",
				"pet.chat.llmHint.rateLimit": "模型限流，已用本地回复",
				"pet.chat.llmHint.timeout": "模型响应超时，已用本地回复",
				"pet.chat.llmHint.hostUnavailable": "宿主不可用（可能需要重启 DSH），已用本地回复",
				"pet.chat.llmHint.default": "AI 暂时不可用，已用本地回复",
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
				// v2.0.0: built-in DSH LLM chat — where the reply came from, and why a
				// failed model call still answered locally (short, actionable, both languages).
				"pet.chat.source.ai": "AI reply",
				"pet.chat.source.local": "Local reply",
				"pet.chat.llmHint.unconfiguredModel": "No model is configured; replied locally",
				"pet.chat.llmHint.missingCredential": "Missing credentials; replied locally",
				"pet.chat.llmHint.quota": "Model quota is exhausted; replied locally",
				"pet.chat.llmHint.rateLimit": "The model is rate-limited; replied locally",
				"pet.chat.llmHint.timeout": "The model timed out; replied locally",
				"pet.chat.llmHint.hostUnavailable": "The host is unavailable (a DSH restart may be needed); replied locally",
				"pet.chat.llmHint.default": "AI is unavailable right now; replied locally",
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

		// ---- v2.0.0 built-in DSH LLM adapter (host bridge) ----------------------
		// The browser half cannot call a model (`remote.llm` only lists providers), so
		// this is the only model path: a narrow same-origin host route whose system
		// prompt is fixed server-side. The implementation sits right after the strings
		// and the route constant so tools/audit.mjs can assert the whole capability
		// surface (probe, adapter, hints, AI/local labels) as one bounded, identifiable
		// unit; the module state it uses is declared further below.
		//
		// Privacy/security: the payload is only the bounded user sentence (+ the existing
		// skin-local context digest) that petCallLlm already built — no DSH session id,
		// no tools, no files, no credentials. The host decides availability; this half
		// only mirrors the answer and never grants `llm` by itself (the user still needs
		// the explicit consent token through the role hub), never overrides a user
		// adapter, and always falls back to the local brain on failure.

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
		 * bounded content string and (when the user chose one) the provider id are sent;
		 * the model always follows the DSH default (plan A). Every failure throws an
		 * Error with a stable `code`; petChat exposes it as the additive `llmError`.
		 */
		async function petHostLlmChat(payload) {
			const messages = payload !== null && typeof payload === "object" && Array.isArray(payload.messages) ? payload.messages : [];
			const first = messages.length > 0 && messages[0] !== null && typeof messages[0] === "object" ? messages[0].content : "";
			const text = typeof first === "string" ? first : "";
			if (text === "") throw petLlmError("invalid-request");
			const body = { text };
			// Plan A: provider only; never send a model id (the host uses its default).
			if (petLlmProvider !== null) body.provider = petLlmProvider;
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
		 * Plan A: the role hub selects only a PROVIDER (the model always follows the DSH
		 * default). `null`/"" = follow the default; a string is trimmed and capped at 128
		 * chars. Returns `{ok:true, provider}` or `{ok:false, reason:"invalid-provider"}`.
		 */
		function petSetLlmProvider(value) {
			try {
				if (value === null || value === undefined || value === "") {
					petLlmProvider = null;
					petSaveLlmProvider();
					return { ok: true, provider: null };
				}
				if (typeof value !== "string") return { ok: false, reason: "invalid-provider" };
				const provider = value.trim();
				if (provider === "") {
					petLlmProvider = null;
					petSaveLlmProvider();
					return { ok: true, provider: null };
				}
				if (provider.length > 128) return { ok: false, reason: "invalid-provider" };
				petLlmProvider = provider;
				petSaveLlmProvider();
				return { ok: true, provider };
			} catch (error) {
				note("pet-brain:set-llm-provider", error);
				return { ok: false, reason: "internal-error" };
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
					provider: petLlmProvider,
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
						// v2.0.0 (additive): plan A provider choice + adapter routing + the
						// cached host capability snapshot (read by the role hub AI card).
						provider: petLlmProvider,
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
				petLlmProvider = petReadLlmProvider();
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
