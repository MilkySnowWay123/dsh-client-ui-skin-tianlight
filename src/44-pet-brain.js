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
		 *   - the role hub writes the chosen provider and model through same-closure
		 *     bridges (`setLlmProvider` / `setLlmModel`). v2.2.0 replaced the plan-A
		 *     "provider only, model always follows the DSH default" rule: both values
		 *     persist (`tianlight.pet.llmProvider.v1`, `tianlight.pet.llmModel.v1`;
		 *     null/absent = follow the DSH default), and switching provider drops the
		 *     old model id so it can never be sent to a different route;
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
		// v2.2.0: read-only model catalogue for the provider+model picker. The browser
		// cannot call llm.listModels(), so this same-origin GET route supplies ids only.
		const PET_HOST_MODELS_ROUTE = ASSET_BASE + "/_pet-models";
		/** fetch-level fallback; the 20s PET_LLM_TIMEOUT_MS race in petCallLlm still wins. */
		const PET_HOST_LLM_FETCH_TIMEOUT_MS = 25000;
		const PET_HOST_MODELS_FETCH_TIMEOUT_MS = 8000;
		/** Only the user's provider/model choices persist; null/absent = follow DSH. */
		const PET_LLM_PROVIDER_KEY = "tianlight.pet.llmProvider.v1";
		const PET_LLM_MODEL_KEY = "tianlight.pet.llmModel.v1";
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
			// v2.2.0 catalogue reads (read-only model picker).
			"models-unavailable",
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

		//#endregion
