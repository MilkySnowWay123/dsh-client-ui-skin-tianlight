		//#region companion
		/** Inline SVG fallback so the companion exists before any art is dropped in. */
		const CAT_SVG = (() => {
			const svg =
				"<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'>" +
				"<defs><linearGradient id='g' x1='0' y1='0' x2='0' y2='1'>" +
				"<stop offset='0' stop-color='#b6f4e2'/><stop offset='1' stop-color='#5ed3b3'/>" +
				"</linearGradient></defs>" +
				"<path d='M92 84 q17 -3 13 -21' stroke='#5ed3b3' stroke-width='9' fill='none' stroke-linecap='round'/>" +
				"<ellipse cx='60' cy='87' rx='26' ry='20' fill='url(#g)'/>" +
				"<path d='M36 43 l-5 -19 17 9 z' fill='#5ed3b3'/>" +
				"<path d='M84 43 l5 -19 -17 9 z' fill='#5ed3b3'/>" +
				"<circle cx='60' cy='52' r='26' fill='url(#g)'/>" +
				"<path d='M40 40 l-2 -10 9 5 z' fill='#ffb7c9'/>" +
				"<path d='M80 40 l2 -10 -9 5 z' fill='#ffb7c9'/>" +
				"<ellipse cx='50' cy='52' rx='4.6' ry='5.8' fill='#123b33'/>" +
				"<ellipse cx='70' cy='52' rx='4.6' ry='5.8' fill='#123b33'/>" +
				"<circle cx='51.7' cy='49.8' r='1.7' fill='#ffffff'/>" +
				"<circle cx='71.7' cy='49.8' r='1.7' fill='#ffffff'/>" +
				"<ellipse cx='42' cy='60' rx='5' ry='3' fill='#ffb7c9' fill-opacity='.8'/>" +
				"<ellipse cx='78' cy='60' rx='5' ry='3' fill='#ffb7c9' fill-opacity='.8'/>" +
				"<path d='M56 60 q4 4.4 8 0' stroke='#123b33' stroke-width='2' fill='none' stroke-linecap='round'/>" +
				"<g stroke='#8fe6cf' stroke-width='1.7' stroke-linecap='round'>" +
				"<path d='M33 53 h-11'/><path d='M33 60 h-10'/>" +
				"<path d='M87 53 h11'/><path d='M87 60 h10'/>" +
				"</g></svg>";
			return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
		})();

		// ---- v0.7.0 duty channel (role pack → pet) ----
		// The companion module is switchable at runtime; the duty channel is always
		// installed and reaches the pet through this mutable holder. A null `api`
		// means the companion is currently off, and inbound actions degrade to
		// `{ ok: false, reason: "companion-off" }` instead of throwing.
		// v1.1: `lifeGate(action)` is registered by the life-rhythm engine (same closure)
		// and may defer an interrupt; null / non-function means "no gate" (v0.7 behavior).
		// S1: `life` (the internal life API) and `dutyReplay` (the internal replay path)
		// are same-closure bridges so the brain/life never read a replaceable global.
		const companionDutyBridge = { api: null, lifeGate: null, life: null, dutyReplay: null };
		const DUTY_CHANNEL_VERSION = 1;
		const DUTY_EVENT = "tianlight:duty";
		const DUTY_ACTION_EVENT = "tianlight:duty-action";
		const DUTY_CHOICE_LABELS = {
			later: "duty.choice.later",
			mute: "duty.choice.mute",
			snoozeUntilBreak: "duty.choice.snoozeUntilBreak",
			budgetDown: "duty.choice.budgetDown",
			budgetUp: "duty.choice.budgetUp",
		};
		const DUTY_LIMITS = {
			text: 200,
			signalId: 64,
			choiceId: 40,
			choiceLabel: 40,
			choices: 5,
			ttlDefault: 12000,
			ttlMax: 120000,
			speakTtlDefault: 8000,
		};

		// v0.5.0：桌宠台词全部走 i18n key，语言切换无需重载（订阅后刷新按钮文案）。
		registerTl5Strings({
			zh: {
				"pet.near.1": "喵？",
				"pet.near.2": "你靠得好近…",
				"pet.near.3": "（歪头）",
				"pet.near.4": "薄荷味的风？",
				"pet.pet.1": "呼噜呼噜…",
				"pet.pet.2": "再摸摸嘛～",
				"pet.pet.3": "唔…舒服",
				"pet.pet.4": "耳朵不可以揪啦",
				"pet.feed.1": "是小鱼干！",
				"pet.feed.2": "薄荷味儿的最好吃",
				"pet.feed.3": "还想再来一条",
				"pet.play.1": "逗猫棒！接住！",
				"pet.play.2": "啪！抓住了",
				"pet.play.3": "再来一次！",
				"pet.nap.1": "zzZ…",
				"pet.nap.2": "困了…",
				"pet.nap.3": "先眯一会儿",
				"pet.idle.1": "……有点无聊",
				"pet.idle.2": "看着窗外的云",
				"pet.idle.3": "今天天光真好",
				"pet.idle.4": "陪我待会儿？",
				"pet.hello": "喵～我来啦",
				"pet.aria": "薄荷小猫：可拖拽，点击打开互动菜单",
				"pet.action.pet": "摸摸",
				"pet.action.feed": "喂食",
				"pet.action.play": "逗猫棒",
				"pet.action.nap": "小睡",
				"pet.action.mute": "静音 1 小时",
				"pet.action.focus": "专注 25 分钟",
				"pet.action.hub": "角色中枢",
				"pet.action.chat": "AI 对话",
				"pet.action.history": "对话历史",
				"pet.chat.placeholder": "和我说点什么…",
				"pet.chat.send": "发送",
				"pet.chat.close": "关闭",
				"pet.chat.thinking": "想想…",
				"pet.chat.empty": "先说点什么吧。",
				"pet.chat.unavailable": "AI 大脑还没就绪。",
				"pet.chat.failed": "这次没接住，再试一次？",
				"pet.chat.you": "听见了。",
				"pet.chat.deniedSay": "这句我接不了。",
				"pet.chat.reason.paused": "我现在被暂停了，先不聊。",
				"pet.chat.reason.permission": "我没有聊天权限。",
				"pet.chat.reason.rateLimit": "说得有点快，缓一缓。",
				"pet.chat.reason.invalid": "这句话我读不懂。",
				"pet.chat.reason.disabled": "AI 还没有启用。",
				"pet.chat.reason.internal": "我这边出了点小问题。",
				"pet.chat.reason.default": "暂时没法回复。",
				// v1.6.7 conversation history panel (the ☰ entry in the pet menu).
				"pet.history.title": "对话历史",
				"pet.history.new": "新对话",
				"pet.history.delete": "删除对话",
				"pet.history.close": "关闭",
				"pet.history.empty": "还没有对话",
				"pet.history.emptyHint": "从桌宠的「AI 对话」聊一句，这里会自动收好。",
				"pet.history.edit": "编辑",
				"pet.history.save": "保存",
				"pet.history.cancel": "取消",
				"pet.history.user": "你",
				"pet.history.pet": "小猫",
				"pet.history.defaultTitle": "未命名对话",
				"pet.history.deleted": "已删除这个对话",
				"pet.history.count": "{n} 条",
				"pet.act.mute": "好，安静一小时",
				"pet.act.focusStart": "专注 25 分钟，开始",
				"pet.act.focusStop": "专注结束，歇口气吧",
				"duty.choice.later": "等会儿",
				"duty.choice.mute": "静音 1 小时",
				"duty.choice.snoozeUntilBreak": "休息时再说",
				"duty.choice.budgetDown": "少打扰一点",
				"duty.choice.budgetUp": "可以多提醒",
				"duty.aria": "职责气泡：可稍后处理或静音",
			},
			en: {
				"pet.near.1": "Meow?",
				"pet.near.2": "You're really close…",
				"pet.near.3": "(head tilt)",
				"pet.near.4": "Minty breeze?",
				"pet.pet.1": "Purr purr…",
				"pet.pet.2": "Pet me more~",
				"pet.pet.3": "Mmm… that's nice",
				"pet.pet.4": "No ear pulling!",
				"pet.feed.1": "A dried fish!",
				"pet.feed.2": "Mint flavor is the best",
				"pet.feed.3": "One more, please",
				"pet.play.1": "The wand! Catch!",
				"pet.play.2": "Got it!",
				"pet.play.3": "Again!",
				"pet.nap.1": "zzZ…",
				"pet.nap.2": "Sleepy…",
				"pet.nap.3": "Just a quick nap",
				"pet.idle.1": "…I'm a little bored",
				"pet.idle.2": "Watching the clouds",
				"pet.idle.3": "Lovely light today",
				"pet.idle.4": "Stay with me?",
				"pet.hello": "Meow~ I'm here",
				"pet.aria": "Mint cat: draggable, click to open the interaction menu",
				"pet.action.pet": "Pet",
				"pet.action.feed": "Feed",
				"pet.action.play": "Wand",
				"pet.action.nap": "Nap",
				"pet.action.mute": "Mute 1h",
				"pet.action.focus": "Focus 25m",
				"pet.action.hub": "Role hub",
				"pet.action.chat": "AI chat",
				"pet.action.history": "Chat history",
				"pet.chat.placeholder": "Say something to me…",
				"pet.chat.send": "Send",
				"pet.chat.close": "Close",
				"pet.chat.thinking": "Thinking…",
				"pet.chat.empty": "Say something first.",
				"pet.chat.unavailable": "The AI brain isn't ready.",
				"pet.chat.failed": "I missed that one. Try again?",
				"pet.chat.you": "Heard you.",
				"pet.chat.deniedSay": "I can't take this one.",
				"pet.chat.reason.paused": "I'm paused right now.",
				"pet.chat.reason.permission": "I don't have chat permission.",
				"pet.chat.reason.rateLimit": "A bit fast — give me a moment.",
				"pet.chat.reason.invalid": "I couldn't read that.",
				"pet.chat.reason.disabled": "AI isn't enabled.",
				"pet.chat.reason.internal": "Something went wrong on my side.",
				"pet.chat.reason.default": "Can't reply right now.",
				// v1.6.7 conversation history panel (the ☰ entry in the pet menu).
				"pet.history.title": "Chat history",
				"pet.history.new": "New chat",
				"pet.history.delete": "Delete chat",
				"pet.history.close": "Close",
				"pet.history.empty": "No conversations yet",
				"pet.history.emptyHint": "Say one line in AI chat and it will be kept here.",
				"pet.history.edit": "Edit",
				"pet.history.save": "Save",
				"pet.history.cancel": "Cancel",
				"pet.history.user": "You",
				"pet.history.pet": "Cat",
				"pet.history.defaultTitle": "Untitled chat",
				"pet.history.deleted": "Conversation deleted",
				"pet.history.count": "{n} msgs",
				"pet.act.mute": "Okay, quiet for an hour",
				"pet.act.focusStart": "Focusing for 25 minutes",
				"pet.act.focusStop": "Focus done. Take a breather",
				"duty.choice.later": "Later",
				"duty.choice.mute": "Mute 1h",
				"duty.choice.snoozeUntilBreak": "Tell me at break",
				"duty.choice.budgetDown": "Fewer interruptions",
				"duty.choice.budgetUp": "More reminders",
				"duty.aria": "Duty bubble: snooze or mute",
			},
		});

		const LINES = {
			near: ["pet.near.1", "pet.near.2", "pet.near.3", "pet.near.4"],
			pet: ["pet.pet.1", "pet.pet.2", "pet.pet.3", "pet.pet.4"],
			feed: ["pet.feed.1", "pet.feed.2", "pet.feed.3"],
			play: ["pet.play.1", "pet.play.2", "pet.play.3"],
			nap: ["pet.nap.1", "pet.nap.2", "pet.nap.3"],
			idle: ["pet.idle.1", "pet.idle.2", "pet.idle.3", "pet.idle.4"],
		};

		function pick(list) {
			return list[Math.floor(Math.random() * list.length)];
		}

		// ---- v1.6.4 per-look action packs（每个形象一套动作名+回复，桌宠与角色中枢共用） ----
		// One pack per look. `mediaId` is the life engine's replaceable-media id; the
		// built-in art is "default". The packs are a shared surface (the companion menu
		// reads labels/lines, the role hub edits them), so the API is installed at
		// factory scope and stays available while the switchable companion is off.
		// Defaults stay i18n KEYS: the consumer resolves them with TL_T when it renders,
		// so a language switch only needs a re-read (the menu re-reads through the API).
		// Storage shape: { version:1, packs:{ [mediaId]:{ pet:{label,lines}, feed:{...}, play:{...} } } }.
		const PET_ACTIONS_KEY = "tianlight.petActions.v1";
		const PET_ACTIONS_VERSION = 1;
		const PET_ACTION_IDS = ["pet", "feed", "play"];
		const PET_ACTION_LABEL_MAX = 24;
		const PET_ACTION_LINE_MAX = 120;
		const PET_ACTION_LINES_MAX = 8;
		const PET_ACTION_MEDIA_MAX = 512;
		const PET_ACTION_LABEL_KEYS = {
			pet: "pet.action.pet",
			feed: "pet.action.feed",
			play: "pet.action.play",
		};

		function petActionsStorage() {
			try {
				const storage = globalThis.localStorage;
				if (storage === null || storage === undefined) return null;
				if (typeof storage.getItem !== "function" || typeof storage.setItem !== "function") return null;
				return storage;
			} catch (error) {
				return null;
			}
		}

		/** Remove control characters and collapse whitespace (labels/lines are single-line). */
		function petActionsScrub(value) {
			try {
				return String(value)
					.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
					.replace(/\s+/g, " ")
					.trim();
			} catch (error) {
				return "";
			}
		}

		/** Count characters, not UTF-16 units, so a cap never splits an emoji. */
		function petActionsClip(value, max) {
			try {
				const chars = Array.from(String(value));
				if (chars.length <= max) return chars.join("");
				return chars.slice(0, Math.max(0, max)).join("");
			} catch (error) {
				return "";
			}
		}

		function petActionsMediaId(value) {
			try {
				if (typeof value !== "string") return "default";
				const id = petActionsScrub(value);
				if (id === "") return "default";
				return petActionsClip(id, PET_ACTION_MEDIA_MAX);
			} catch (error) {
				return "default";
			}
		}

		/** Read the raw packs map; malformed / foreign-version data is treated as empty. */
		function petActionsReadPacks() {
			try {
				const storage = petActionsStorage();
				if (storage === null) return {};
				const raw = storage.getItem(PET_ACTIONS_KEY);
				if (typeof raw !== "string" || raw === "") return {};
				const value = JSON.parse(raw);
				if (value === null || typeof value !== "object" || Array.isArray(value)) return {};
				if (value.version !== undefined && value.version !== PET_ACTIONS_VERSION) return {};
				const packs = value.packs;
				if (packs === null || typeof packs !== "object" || Array.isArray(packs)) return {};
				return packs;
			} catch (error) {
				return {};
			}
		}

		function petActionsWritePacks(packs) {
			try {
				const storage = petActionsStorage();
				if (storage === null) return false;
				storage.setItem(PET_ACTIONS_KEY, JSON.stringify({ version: PET_ACTIONS_VERSION, packs }));
				return true;
			} catch (error) {
				note("companion:actions-store", error);
				return false;
			}
		}

		/** Broadcast one pack change (detail: { mediaId }); the companion + hub re-read. */
		function petActionsDispatch(mediaId) {
			try {
				if (typeof document === "undefined" || document === null || typeof document.dispatchEvent !== "function") return;
				const detail = { mediaId };
				let event = null;
				if (typeof CustomEvent === "function") {
					event = new CustomEvent("tianlight:pet-actions", { detail });
				} else {
					// Some test environments have no CustomEvent constructor; a plain object
					// keeps the dispatch observable instead of throwing.
					event = { type: "tianlight:pet-actions", detail };
				}
				document.dispatchEvent(event);
			} catch (error) {
				note("companion:actions-dispatch", error);
			}
		}

		/** Default pack: i18n keys (resolved by the consumer at render time). */
		function petActionsDefaults() {
			const result = {};
			for (const id of PET_ACTION_IDS) {
				result[id] = { label: PET_ACTION_LABEL_KEYS[id], lines: (LINES[id] ?? []).slice() };
			}
			return result;
		}

		/** Normalize one stored/offered action override; null means "malformed". */
		function petActionsNormalizeAction(value) {
			if (value === null || value === undefined) return {};
			if (typeof value !== "object" || Array.isArray(value)) return null;
			const result = {};
			if (value.label !== undefined && value.label !== null) {
				if (typeof value.label !== "string") return null;
				const label = petActionsClip(petActionsScrub(value.label), PET_ACTION_LABEL_MAX);
				if (label !== "") result.label = label;
			}
			if (value.lines !== undefined && value.lines !== null) {
				if (!Array.isArray(value.lines)) return null;
				const lines = [];
				for (const item of value.lines) {
					if (typeof item !== "string") return null;
					const line = petActionsClip(petActionsScrub(item), PET_ACTION_LINE_MAX);
					if (line === "") continue;
					lines.push(line);
					if (lines.length >= PET_ACTION_LINES_MAX) break;
				}
				if (lines.length > 0) result.lines = lines;
			}
			return result;
		}

		/** Effective pack for one look: defaults + stored overrides (never throws). */
		function petActionsGet(mediaIdInput) {
			const mediaId = petActionsMediaId(mediaIdInput);
			const defaults = petActionsDefaults();
			const result = { mediaId };
			for (const id of PET_ACTION_IDS) {
				result[id] = { label: defaults[id].label, lines: defaults[id].lines.slice() };
			}
			try {
				const packs = petActionsReadPacks();
				const custom = Object.prototype.hasOwnProperty.call(packs, mediaId) ? packs[mediaId] : null;
				if (custom === null || typeof custom !== "object" || Array.isArray(custom)) return result;
				for (const id of PET_ACTION_IDS) {
					const action = petActionsNormalizeAction(custom[id]);
					if (action === null) continue;
					if (typeof action.label === "string" && action.label !== "") result[id].label = action.label;
					if (Array.isArray(action.lines) && action.lines.length > 0) result[id].lines = action.lines.slice(0, PET_ACTION_LINES_MAX);
				}
			} catch (error) {
				note("companion:actions-get", error);
			}
			return result;
		}

		/** Custom part of one offered action: fields equal to the localized defaults are dropped. */
		function petActionsCustomAction(id, action) {
			const result = {};
			const defaultLabel = TL_T(PET_ACTION_LABEL_KEYS[id]);
			if (typeof action.label === "string" && action.label !== "" && action.label !== defaultLabel) result.label = action.label;
			if (Array.isArray(action.lines) && action.lines.length > 0) {
				const defaultLines = (LINES[id] ?? []).map((key) => TL_T(key));
				const sameAsDefault =
					action.lines.length === defaultLines.length && action.lines.every((line, index) => line === defaultLines[index]);
				if (sameAsDefault === false) result.lines = action.lines.slice();
			}
			return result;
		}

		/**
		 * Validate + persist one look's pack. Partial packs are supported: only the
		 * actions present in `pack` are written, the look's other custom actions are kept.
		 * A submitted value that merely repeats the localized default (the hub fills the
		 * editor with display text) is not custom and removes that field, so untouched
		 * rows keep following the default text across language switches. An action left
		 * with no custom field is dropped, and an empty pack deletes the look's entry.
		 * Returns {ok:true, pack:<effective pack>} or {ok:false, reason:"invalid"}.
		 */
		function petActionsSet(mediaIdInput, pack) {
			try {
				if (typeof mediaIdInput !== "string" || petActionsScrub(mediaIdInput) === "") return { ok: false, reason: "invalid" };
				if (pack === null || typeof pack !== "object" || Array.isArray(pack)) return { ok: false, reason: "invalid" };
				const mediaId = petActionsMediaId(mediaIdInput);
				const packs = petActionsReadPacks();
				const raw = Object.prototype.hasOwnProperty.call(packs, mediaId) ? packs[mediaId] : null;
				const merged = {};
				// Existing custom actions survive a partial edit; corrupt entries are skipped.
				if (raw !== null && typeof raw === "object" && Array.isArray(raw) === false) {
					for (const id of PET_ACTION_IDS) {
						const existing = petActionsNormalizeAction(raw[id]);
						if (existing !== null && Object.keys(existing).length > 0) merged[id] = existing;
					}
				}
				for (const id of PET_ACTION_IDS) {
					if (Object.prototype.hasOwnProperty.call(pack, id) === false) continue;
					const action = petActionsNormalizeAction(pack[id]);
					if (action === null) return { ok: false, reason: "invalid" };
					const custom = petActionsCustomAction(id, action);
					if (Object.keys(custom).length > 0) merged[id] = custom;
					else delete merged[id];
				}
				if (Object.keys(merged).length > 0) packs[mediaId] = merged;
				else delete packs[mediaId];
				petActionsWritePacks(packs);
				petActionsDispatch(mediaId);
				return { ok: true, pack: petActionsGet(mediaId) };
			} catch (error) {
				note("companion:actions-set", error);
				return { ok: false, reason: "invalid" };
			}
		}

		/** Drop one look's overrides (back to localized defaults) and broadcast. */
		function petActionsClear(mediaIdInput) {
			try {
				if (typeof mediaIdInput !== "string" || petActionsScrub(mediaIdInput) === "") return { ok: false, reason: "invalid" };
				const mediaId = petActionsMediaId(mediaIdInput);
				const packs = petActionsReadPacks();
				const existed = Object.prototype.hasOwnProperty.call(packs, mediaId);
				if (existed) delete packs[mediaId];
				petActionsWritePacks(packs);
				petActionsDispatch(mediaId);
				return { ok: true, mediaId, cleared: existed };
			} catch (error) {
				note("companion:actions-clear", error);
				return { ok: false, reason: "invalid" };
			}
		}

		/** The look currently painted by the life engine ("default" when absent). */
		function petActionsCurrent() {
			try {
				const life = globalThis.tianlightLife;
				if (life !== null && life !== undefined && typeof life === "object" && typeof life.media === "function") {
					const media = life.media();
					if (media !== null && media !== undefined && typeof media === "object") {
						const id = typeof media.id === "string" ? petActionsScrub(media.id) : "";
						if (id !== "") return petActionsClip(id, PET_ACTION_MEDIA_MAX);
					}
				}
			} catch (error) {
				note("companion:actions-current", error);
			}
			return "default";
		}

		/** Shared API consumed by the companion menu and the role hub (contract frozen). */
		const petActionsApi = {
			version: PET_ACTIONS_VERSION,
			defaults: petActionsDefaults,
			get: petActionsGet,
			set: petActionsSet,
			clear: petActionsClear,
			current: petActionsCurrent,
		};
		// Factory-scope install keeps the API available to the role hub even before the
		// switchable companion module mounts; the companion disposer restores whatever
		// global existed before this skin instance (same rule as the always-on channels).
		const previousPetActionsGlobal = globalThis.tianlightPetActions;
		globalThis.tianlightPetActions = petActionsApi;

		// ---- v1.6.7 pet chat history (localStorage store + global API) ----
		// Every chat turn that actually landed (a bubble reply, or a deliberate denial)
		// is appended to the active conversation; the AI chat composer closes right
		// away, so the speech bubble is the single visible answer. The store is plain
		// JSON with one version tag, a bounded conversation list, bounded messages and
		// best-effort persistence: a storage failure must never break the chat itself.
		const PET_CHATS_KEY = "tianlight.petChats.v1";
		const PET_CHATS_VERSION = 1;
		const PET_CHATS_MAX_CONVERSATIONS = 20;
		const PET_CHATS_MAX_MESSAGES = 120;
		const PET_CHATS_USER_MAX = 500;
		const PET_CHATS_PET_MAX = 1200;
		const PET_CHATS_TITLE_MAX = 24;
		const PET_CHATS_ID_MAX = 80;
		const petChatSubscribers = new Set();

		/** Conversation / message ids: `conv-<base36 time>-<random>`, unique per turn. */
		function petChatsNewId(prefix) {
			let salt = "";
			try {
				salt = Math.random().toString(36).slice(2, 8);
			} catch (error) {
				salt = "";
			}
			if (salt === "") salt = "0";
			return prefix + "-" + Date.now().toString(36) + "-" + salt;
		}

		/**
		 * Message text is normalized, never trusted: CR/LF become \n, control
		 * characters are dropped, and the role-specific cap counts characters (not
		 * UTF-16 units) so a clip never splits an emoji.
		 */
		function petChatsCleanText(value, max) {
			try {
				if (typeof value !== "string") return "";
				const text = value
					.replace(/\r\n?/g, "\n")
					.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
					.trim();
				const chars = Array.from(text);
				if (chars.length <= max) return text;
				return chars.slice(0, Math.max(0, max)).join("");
			} catch (error) {
				return "";
			}
		}

		/** Conversation title: first user line, whitespace-collapsed, ≤ 24 characters. */
		function petChatsTitleFrom(value) {
			try {
				const flat = petChatsCleanText(value, PET_CHATS_TITLE_MAX * 8).replace(/\s+/g, " ");
				const chars = Array.from(flat);
				if (chars.length <= PET_CHATS_TITLE_MAX) return flat;
				return chars.slice(0, PET_CHATS_TITLE_MAX).join("").trim();
			} catch (error) {
				return "";
			}
		}

		/** Validate + normalize one stored message; null drops it silently. */
		function petChatsMessage(raw) {
			try {
				if (raw === null || typeof raw !== "object" || Array.isArray(raw)) return null;
				const role = raw.role === "user" || raw.role === "pet" ? raw.role : "";
				if (role === "") return null;
				const text = petChatsCleanText(raw.text, role === "user" ? PET_CHATS_USER_MAX : PET_CHATS_PET_MAX);
				if (text === "") return null;
				const id =
					typeof raw.id === "string" && raw.id !== ""
						? petActionsClip(raw.id, PET_CHATS_ID_MAX)
						: petChatsNewId("msg");
				const at = Number.isFinite(raw.at) ? raw.at : Date.now();
				return { id, role, text, at };
			} catch (error) {
				return null;
			}
		}

		/** Validate + normalize one stored conversation; null drops it silently. */
		function petChatsConversation(raw) {
			try {
				if (raw === null || typeof raw !== "object" || Array.isArray(raw)) return null;
				const id = typeof raw.id === "string" ? petActionsClip(raw.id, PET_CHATS_ID_MAX) : "";
				if (id === "") return null;
				const createdAt = Number.isFinite(raw.createdAt) ? raw.createdAt : Date.now();
				const updatedAt = Number.isFinite(raw.updatedAt) ? raw.updatedAt : createdAt;
				const messages = [];
				if (Array.isArray(raw.messages)) {
					for (const item of raw.messages) {
						const message = petChatsMessage(item);
						if (message !== null) messages.push(message);
					}
				}
				const bounded =
					messages.length > PET_CHATS_MAX_MESSAGES
						? messages.slice(messages.length - PET_CHATS_MAX_MESSAGES)
						: messages;
				// The title mirrors the first user line unless an explicit title exists.
				const firstUser = bounded.find((message) => message.role === "user") ?? null;
				const title =
					typeof raw.title === "string" && raw.title.trim() !== ""
						? petChatsTitleFrom(raw.title)
						: firstUser === null
							? ""
							: petChatsTitleFrom(firstUser.text);
				return { id, title, createdAt, updatedAt, messages: bounded };
			} catch (error) {
				return null;
			}
		}

		/**
		 * Read the whole store. Corrupt JSON, a foreign version tag or an unusable
		 * shape silently reset to the empty structure (never throws, never prompts).
		 */
		function petChatsRead() {
			const empty = { version: PET_CHATS_VERSION, activeId: "", conversations: [] };
			try {
				const storage = petActionsStorage();
				if (storage === null) return empty;
				const raw = storage.getItem(PET_CHATS_KEY);
				if (typeof raw !== "string" || raw === "") return empty;
				const value = JSON.parse(raw);
				if (value === null || typeof value !== "object" || Array.isArray(value)) return empty;
				if (value.version !== PET_CHATS_VERSION) return empty;
				const conversations = [];
				if (Array.isArray(value.conversations)) {
					for (const item of value.conversations) {
						const conversation = petChatsConversation(item);
						if (conversation !== null) conversations.push(conversation);
					}
				}
				conversations.sort((a, b) => b.updatedAt - a.updatedAt);
				const bounded =
					conversations.length > PET_CHATS_MAX_CONVERSATIONS
						? conversations.slice(0, PET_CHATS_MAX_CONVERSATIONS)
						: conversations;
				let activeId = typeof value.activeId === "string" ? value.activeId : "";
				if (bounded.every((conversation) => conversation.id !== activeId)) {
					activeId = bounded.length > 0 ? bounded[0].id : "";
				}
				return { version: PET_CHATS_VERSION, activeId, conversations: bounded };
			} catch (error) {
				return empty;
			}
		}

		function petChatsWrite(state) {
			try {
				const storage = petActionsStorage();
				if (storage === null) return false;
				storage.setItem(
					PET_CHATS_KEY,
					JSON.stringify({
						version: PET_CHATS_VERSION,
						activeId: state.activeId,
						conversations: state.conversations,
					}),
				);
				return true;
			} catch (error) {
				note("companion:chats-store", error);
				return false;
			}
		}

		function petChatsNotify() {
			for (const listener of [...petChatSubscribers]) {
				try {
					listener();
				} catch (error) {
					note("companion:chats-subscriber", error);
				}
			}
		}

		/** Bounds + active-id repair, persist, then tell subscribers (panel re-render). */
		function petChatsCommit(state) {
			state.conversations.sort((a, b) => b.updatedAt - a.updatedAt);
			if (state.conversations.length > PET_CHATS_MAX_CONVERSATIONS) {
				state.conversations = state.conversations.slice(0, PET_CHATS_MAX_CONVERSATIONS);
			}
			if (state.conversations.every((conversation) => conversation.id !== state.activeId)) {
				state.activeId = state.conversations.length > 0 ? state.conversations[0].id : "";
			}
			petChatsWrite(state);
			petChatsNotify();
			return state;
		}

		/** All conversations, most recently updated first. */
		function petChatsList() {
			return petChatsRead().conversations;
		}

		function petChatsGet(id) {
			try {
				if (typeof id !== "string" || id === "") return null;
				for (const conversation of petChatsRead().conversations) {
					if (conversation.id === id) return conversation;
				}
				return null;
			} catch (error) {
				return null;
			}
		}

		/** The active conversation (null only when the store is empty). */
		function petChatsActive() {
			try {
				const state = petChatsRead();
				for (const conversation of state.conversations) {
					if (conversation.id === state.activeId) return conversation;
				}
				return null;
			} catch (error) {
				return null;
			}
		}

		function petChatsCreate() {
			try {
				const state = petChatsRead();
				const now = Date.now();
				const conversation = {
					id: petChatsNewId("conv"),
					title: "",
					createdAt: now,
					updatedAt: now,
					messages: [],
				};
				state.conversations.unshift(conversation);
				state.activeId = conversation.id;
				petChatsCommit(state);
				return petChatsGet(conversation.id);
			} catch (error) {
				note("companion:chats-create", error);
				return null;
			}
		}

		function petChatsRemove(id) {
			try {
				if (typeof id !== "string" || id === "") return { ok: false, reason: "invalid" };
				const state = petChatsRead();
				const index = state.conversations.findIndex((conversation) => conversation.id === id);
				if (index < 0) return { ok: false, reason: "missing" };
				state.conversations.splice(index, 1);
				if (state.activeId === id) {
					state.activeId = state.conversations.length > 0 ? state.conversations[0].id : "";
				}
				petChatsCommit(state);
				return { ok: true, removed: id, activeId: state.activeId };
			} catch (error) {
				note("companion:chats-remove", error);
				return { ok: false, reason: "internal" };
			}
		}

		function petChatsSetActive(id) {
			try {
				if (typeof id !== "string") return { ok: false, reason: "invalid" };
				const state = petChatsRead();
				const exists = state.conversations.some((conversation) => conversation.id === id);
				if (exists === false) return { ok: false, reason: "missing" };
				state.activeId = id;
				petChatsCommit(state);
				return { ok: true, conversation: petChatsGet(id) };
			} catch (error) {
				note("companion:chats-active", error);
				return { ok: false, reason: "internal" };
			}
		}

		/**
		 * Append one turn. A missing/expired conversation id falls back to the active
		 * conversation (or creates one): the chat path never loses a turn it showed.
		 */
		function petChatsAppend(convIdInput, entry) {
			try {
				if (entry === null || typeof entry !== "object" || Array.isArray(entry)) {
					return { ok: false, reason: "invalid" };
				}
				const role = entry.role === "user" || entry.role === "pet" ? entry.role : "";
				if (role === "") return { ok: false, reason: "invalid" };
				const text = petChatsCleanText(entry.text, role === "user" ? PET_CHATS_USER_MAX : PET_CHATS_PET_MAX);
				if (text === "") return { ok: false, reason: "invalid" };
				const state = petChatsRead();
				const wanted = typeof convIdInput === "string" ? convIdInput : "";
				let target = null;
				if (wanted !== "") {
					target = state.conversations.find((conversation) => conversation.id === wanted) ?? null;
				}
				if (target === null) {
					target = state.conversations.find((conversation) => conversation.id === state.activeId) ?? null;
				}
				const now = Date.now();
				if (target === null) {
					target = { id: petChatsNewId("conv"), title: "", createdAt: now, updatedAt: now, messages: [] };
					state.conversations.unshift(target);
				}
				const message = { id: petChatsNewId("msg"), role, text, at: now };
				target.messages.push(message);
				if (target.messages.length > PET_CHATS_MAX_MESSAGES) {
					target.messages = target.messages.slice(target.messages.length - PET_CHATS_MAX_MESSAGES);
				}
				target.updatedAt = now;
				state.activeId = target.id;
				if (role === "user") {
					const firstUser = target.messages.find((item) => item.role === "user") ?? null;
					if (firstUser !== null && firstUser.id === message.id) target.title = petChatsTitleFrom(text);
				}
				petChatsCommit(state);
				return { ok: true, conversation: petChatsGet(target.id), message };
			} catch (error) {
				note("companion:chats-append", error);
				return { ok: false, reason: "internal" };
			}
		}

		/** Edit one user message in place; the conversation title follows a first-line edit. */
		function petChatsEditUserMessage(convId, msgId, textInput) {
			try {
				if (typeof convId !== "string" || convId === "" || typeof msgId !== "string" || msgId === "") {
					return { ok: false, reason: "invalid" };
				}
				const text = petChatsCleanText(textInput, PET_CHATS_USER_MAX);
				if (text === "") return { ok: false, reason: "invalid" };
				const state = petChatsRead();
				const conversation = state.conversations.find((item) => item.id === convId) ?? null;
				if (conversation === null) return { ok: false, reason: "missing" };
				const message =
					conversation.messages.find((item) => item.id === msgId && item.role === "user") ?? null;
				if (message === null) return { ok: false, reason: "missing" };
				message.text = text;
				conversation.updatedAt = Date.now();
				const firstUser = conversation.messages.find((item) => item.role === "user") ?? null;
				if (firstUser !== null && firstUser.id === message.id) conversation.title = petChatsTitleFrom(text);
				petChatsCommit(state);
				return { ok: true, conversation: petChatsGet(convId), message };
			} catch (error) {
				note("companion:chats-edit", error);
				return { ok: false, reason: "internal" };
			}
		}

		function petChatsSubscribe(listener) {
			if (typeof listener !== "function") return () => {};
			petChatSubscribers.add(listener);
			return () => petChatSubscribers.delete(listener);
		}

		/**
		 * v1.6.8 chat-context bridge: a bounded view of the most recent conversation
		 * for the pet brain (human-like chat + private thought). Only this skin's own
		 * store is read, never DSH data. Returns `{ conversationId, title, messages }`
		 * with at most 6 messages (oldest first, text clipped) so a caller can embed it
		 * in a prompt safely; a missing/empty store returns an empty shape.
		 */
		function petChatsRecentContext(limitInput) {
			try {
				const limit = Number.isFinite(Number(limitInput)) ? Math.max(1, Math.min(6, Math.floor(Number(limitInput)))) : 6;
				const state = petChatsRead();
				const conversation = state.conversations.length > 0 ? state.conversations[0] : null;
				if (conversation === null) return { conversationId: "", title: "", messages: [] };
				const messages = [];
				for (const message of conversation.messages.slice(-limit)) {
					if (message === null || typeof message !== "object") continue;
					messages.push({
						role: message.role === "user" ? "user" : "pet",
						text: petActionsClip(message.text, message.role === "user" ? 200 : 240),
						at: Number.isFinite(message.at) ? message.at : 0,
					});
				}
				return {
					conversationId: conversation.id,
					title: typeof conversation.title === "string" ? conversation.title : "",
					messages,
				};
			} catch (error) {
				note("companion:chats-recent", error);
				return { conversationId: "", title: "", messages: [] };
			}
		}

		/** Shared API (contract: version 1). The panel reads the same functions directly. */
		const petChatsApi = {
			version: PET_CHATS_VERSION,
			list: petChatsList,
			get: petChatsGet,
			create: petChatsCreate,
			remove: petChatsRemove,
			active: petChatsActive,
			setActive: petChatsSetActive,
			append: petChatsAppend,
			editUserMessage: petChatsEditUserMessage,
			subscribe: petChatsSubscribe,
			// v1.6.8 additive: bounded context for the brain/mind (backward compatible).
			recent: petChatsRecentContext,
		};
		// Same lifecycle rule as the action-pack API: installed at factory scope so other
		// modules can read history even before the switchable companion mounts, and
		// restored by the companion disposer to whatever global existed before.
		const previousPetChatsGlobal = globalThis.tianlightPetChats;
		globalThis.tianlightPetChats = petChatsApi;

		function loadState() {
			try {
				const raw = window.localStorage.getItem(STORAGE_KEY);
				if (raw === null) return null;
				const value = JSON.parse(raw);
				if (typeof value !== "object" || value === null) return null;
				return {
					x: Number.isFinite(value.x) ? value.x : null,
					y: Number.isFinite(value.y) ? value.y : null,
					mood: Number.isFinite(value.mood) ? Math.min(100, Math.max(0, value.mood)) : 62,
				};
			} catch {
				return null;
			}
		}

		// v1.0.0 energy: localStorage writes are synchronous, so only persist when a
		// value the user can observe actually changed. The baseline is reset whenever a
		// companion instance loads its saved state.
		let lastSavedState = null;
		function saveState(value) {
			const next = { x: value.x, y: value.y, mood: value.mood };
			if (
				lastSavedState !== null &&
				lastSavedState.x === next.x &&
				lastSavedState.y === next.y &&
				lastSavedState.mood === next.mood
			) {
				return;
			}
			lastSavedState = next;
			try {
				window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
			} catch {
				/* storage is a convenience, never a requirement */
			}
		}

		//#endregion
