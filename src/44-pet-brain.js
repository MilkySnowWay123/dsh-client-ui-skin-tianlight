		//#region pet brain
		/**
		 * v1.1.0 AI pet brain + strict permission model.
		 *
		 * The companion may talk, remember small things, toggle focus/quiet, read the
		 * replaceable look and ask the life engine whether it may speak first. It may
		 * NOT drive DSH, browse the network, read or write files, run commands, approve
		 * requests, send messages as the user or install anything — those seven
		 * capabilities are hard-denied in code and can never be granted.
		 *
		 * HARD BOUNDARY (enforced by construction, not convention):
		 *   - this fragment performs no network I/O at all (no HTTP client, no socket,
		 *     no beacon, no background request loop), never touches a filesystem API,
		 *     never imports or calls a DSH service, and never reads DSH sessions,
		 *     tasks, files or credentials;
		 *   - the only persistent state is three localStorage keys owned by the skin:
		 *       tianlight.pet.permissions.v1  capability bits
		 *       tianlight.pet.pause.v1        kill switch
		 *       tianlight.pet.ai.v1           LLM usage + daily limit
		 *   - the optional LLM adapter is supplied by the page owner. It is only called
		 *     after the user grants `llm` with `{ consent: "user-explicit" }`; the
		 *     system prompt is a fixed safety string, `messages` contains exactly the
		 *     current user sentence (never DSH data/history), output is sanitized, the
		 *     call is bounded by 12s/600 chars and daily/minute quotas. Any failure
		 *     falls back to the local brain and is audited as `llm-fallback`;
		 *   - there are no DOM listeners and no persistent timers. The only timer is
		 *     the per-call LLM timeout, which is cleared in a `finally` block.
		 *
		 * The visible control plane is the role hub (`src/76-role-hub.js`), which
		 * consumes `globalThis.tianlightPet` and never mutates state on its own.
		 */
		const PET_VERSION = 1;
		const PET_PERMISSIONS_KEY = "tianlight.pet.permissions.v1";
		const PET_PAUSE_KEY = "tianlight.pet.pause.v1";
		const PET_AI_KEY = "tianlight.pet.ai.v1";
		const PET_SAFE_CAPS = ["chat", "memory", "focus", "media", "remind", "proactive"];
		const PET_MEDIUM_CAPS = ["llm"];
		/** Permanent denials: not "off by default", but impossible to grant. */
		const PET_FORBIDDEN_CAPS = ["agent", "network", "files", "shell", "approve", "message", "install"];
		const PET_DAILY_LIMIT_DEFAULT = 20;
		const PET_DAILY_LIMIT_MAX = 50;
		const PET_MINUTE_CALL_LIMIT = 3;
		const PET_LOCAL_MINUTE_LIMIT = 8;
		const PET_LOCAL_DAILY_LIMIT = 300;
		const PET_INPUT_MAX = 280;
		const PET_SAY_MAX = 200;
		const PET_REPLY_MAX = 600;
		const PET_LOCAL_REPLY_MAX = 80;
		const PET_LLM_TIMEOUT_MS = 12000;
		const PET_LLM_MAX_CHARS = 600;
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
			"Reply in one or two calm sentences, at most 600 characters, in the user's language. " +
			"Never claim an action was performed.";

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
				"pet.brain.permissions": "我能聊天、记一点互动、开关专注和静音。联网、执行、文件都不行。",
				"pet.brain.denied": "我没有这个权限。",
				"pet.brain.fallback": "我没太听懂。可以问状态、专注、静默或权限。",
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
				"pet.brain.permissions": "Chat, memory, focus, media are allowed; network, execution and files are not.",
				"pet.brain.denied": "I don't have that permission.",
				"pet.brain.fallback": "I didn't catch that. Ask about status, focus, quiet or permissions.",
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
		let petAi = { dayKey: "", usedToday: 0, dailyLimit: PET_DAILY_LIMIT_DEFAULT };
		let petTurns = 0;
		let petTodayTurns = 0;
		let petTodayKey = "";
		let petLastReplyAt = 0;
		let petAuditRing = [];
		let petLocalMinute = [];
		let petLocalDay = { dayKey: "", count: 0 };
		let petLlmMinute = { bucket: -1, count: 0 };

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
				for (const cap of PET_SAFE_CAPS.concat(PET_MEDIUM_CAPS)) {
					if (typeof source[cap] === "boolean") grants[cap] = source[cap];
				}
			} catch (error) {
				note("pet-brain:permissions-load", error);
			}
			return grants;
		}

		function petSavePermissions() {
			const persisted = {};
			for (const cap of PET_SAFE_CAPS.concat(PET_MEDIUM_CAPS)) persisted[cap] = petGrants[cap] === true;
			// Forbidden capabilities are never written: the code path that could grant
			// them does not exist, so persisting them would only create false state.
			petWriteJson(PET_PERMISSIONS_KEY, { version: PET_VERSION, granted: persisted });
		}

		function petPermissionMap() {
			const map = {};
			for (const cap of PET_SAFE_CAPS) map[cap] = petGrants[cap] === true;
			for (const cap of PET_MEDIUM_CAPS) map[cap] = petGrants[cap] === true;
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
			for (const cap of PET_FORBIDDEN_CAPS) {
				rows.push({ id: cap, granted: false, grantable: false, risk: "forbidden" });
			}
			return rows;
		}

		function petGranted(cap) {
			try {
				if (typeof cap !== "string") return false;
				if (PET_FORBIDDEN_CAPS.indexOf(cap) >= 0) return false;
				if (PET_SAFE_CAPS.indexOf(cap) < 0 && PET_MEDIUM_CAPS.indexOf(cap) < 0) return false;
				return petGrants[cap] === true;
			} catch (error) {
				return false;
			}
		}

		function petCapabilityRequest(value) {
			return typeof value === "string" ? value.slice(0, 32) : "";
		}

		/**
		 * Grant a capability. Forbidden capabilities and unknown ids are rejected
		 * before any state is touched. `llm` additionally requires the UI's explicit
		 * consent token — this is deliberately not something code can infer from
		 * context. The consent token is a UI contract (defence against accidental
		 * self-granting flows), not a cryptographic secret: the real boundary is that
		 * `llm` starts OFF and no code path grants it without this call.
		 */
		function petGrant(cap, options) {
			try {
				const id = petCapabilityRequest(cap);
				if (PET_FORBIDDEN_CAPS.indexOf(id) >= 0) {
					petAudit("grant", id, false, { reason: "hard-denied" });
					return { ok: false, reason: "hard-denied" };
				}
				if (PET_SAFE_CAPS.indexOf(id) < 0 && PET_MEDIUM_CAPS.indexOf(id) < 0) {
					petAudit("grant", id, false, { reason: "unknown-capability" });
					return { ok: false, reason: "unknown-capability" };
				}
				if (id === "llm") {
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
				if (PET_SAFE_CAPS.indexOf(id) < 0 && PET_MEDIUM_CAPS.indexOf(id) < 0) {
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
				if (intent === "fallback") return { intent, reply: TL_T("pet.brain.fallback") };
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
		 * The payload carries the fixed system prompt and ONLY the current user
		 * sentence — never DSH state, files, credentials or earlier turns.
		 */
		async function petCallLlm(text, now) {
			const adapter = petAdapter;
			if (adapter === null) return { ok: false, reason: "no-adapter" };
			petChargeLlm(now);
			let timer = 0;
			try {
				const payload = {
					system: PET_SYSTEM_PROMPT,
					messages: [{ role: "user", content: text }],
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
		 */
		async function petChat(input) {
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
						const attempt = await petCallLlm(text, now);
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

		// ---- install / dispose --------------------------------------------------
		/**
		 * Publish `globalThis.tianlightPet` (version 1). The previous instance, if
		 * any, is saved and restored by the disposer; the brain natively owns no DOM
		 * and no listeners, so teardown is just the global handover.
		 */
		function installPetBrain() {
			const previous = globalThis.tianlightPet;
			let api = null;
			let disposed = false;
			try {
				petInstalled = true;
				petGrants = petLoadPermissions();
				petPaused = petLoadPause();
				petAi = petLoadAi();
				petAdapter = null;
				petTurns = 0;
				petTodayTurns = 0;
				petTodayKey = petDayKey(Date.now());
				petLastReplyAt = 0;
				petAuditRing = [];
				petLocalMinute = [];
				petLocalDay = { dayKey: petTodayKey, count: 0 };
				petLlmMinute = { bucket: -1, count: 0 };
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
					pause: () => petPause(),
					resume: () => petResume(),
					audit: (limit) => petAuditRead(limit),
					maybeProactive: (context) => petMaybeProactive(context),
				};
				globalThis.tianlightPet = api;
			} catch (error) {
				note("pet-brain:install-failed", error);
				petInstalled = false;
				return () => {};
			}
			return () => {
				if (disposed) return;
				disposed = true;
				try {
					if (globalThis.tianlightPet === api) {
						if (previous === undefined) delete globalThis.tianlightPet;
						else globalThis.tianlightPet = previous;
					}
				} catch (error) {
					note("pet-brain:dispose", error);
				}
				petInstalled = false;
				petAdapter = null;
			};
		}
		//#endregion
