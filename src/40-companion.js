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

		/**
		 * The desktop companion: draggable, proximity-aware, with a small mood
		 * model and a menu of interactions. Everything it owns is torn down by the
		 * returned disposer.
		 */
		function installCompanion() {
			// A previous companion instance restored the pre-skin global on dispose; every
			// (re)install owns the shared action API again while the pet module is on.
			globalThis.tianlightPetActions = petActionsApi;
			globalThis.tianlightPetChats = petChatsApi;
			const saved = loadState();
			// Matches the installed artwork (1130x569, about 2:1); keep in sync with the
			// `[data-tl-cat]` box in the stylesheet.
			const PET_WIDTH = 150;
			const PET_HEIGHT = 86;
			const state = {
				x: saved?.x ?? Math.max(16, window.innerWidth - PET_WIDTH - 32),
				y: saved?.y ?? Math.max(16, window.innerHeight - PET_HEIGHT - 210),
				mood: saved?.mood ?? 62,
			};
			lastSavedState = saved === null ? null : { x: state.x, y: state.y, mood: state.mood };

			const root = document.createElement("div");
			root.dataset.tlCat = "";
			root.setAttribute("role", "button");
			root.setAttribute("tabindex", "0");
			root.setAttribute("aria-label", TL_T("pet.aria"));

			const bubble = document.createElement("div");
			// Own attribute namespace: the selector bridge stamps PRODUCT message bubbles
			// with data-tl-bubble, and sharing the name made the bridge's glass rules leak
			// onto the companion's speech bubble.
			bubble.dataset.tlSay = "";
			root.appendChild(bubble);

			// Duty bubble: a second, action-capable bubble owned by the duty channel.
			// It is a sibling of the say bubble so ordinary pet speech can never
			// overwrite a pending duty request (and vice versa).
			const dutyBubble = document.createElement("div");
			dutyBubble.dataset.tlDuty = "";
			dutyBubble.setAttribute("role", "group");
			dutyBubble.setAttribute("aria-label", TL_T("duty.aria"));
			const dutyText = document.createElement("div");
			dutyText.dataset.tlDutyText = "";
			dutyText.setAttribute("role", "status");
			dutyText.setAttribute("aria-live", "polite");
			const dutyChoices = document.createElement("div");
			dutyChoices.dataset.tlDutyChoices = "";
			dutyBubble.append(dutyText, dutyChoices);
			root.appendChild(dutyBubble);

			const bodyWrap = document.createElement("div");
			bodyWrap.dataset.tlCatBody = "";
			// v1.0.0 replaceable art: the body container always owns BOTH the static
			// <img> and a silent looping <video>. Exactly one of them paints, decided by
			// `data-tl-cat-media` on the root node (stylesheet contract), so a media
			// switch is a src swap and never a DOM rebuild.
			bodyWrap.dataset.tlCatMedia = "image";
			const image = document.createElement("img");
			image.alt = "";
			image.draggable = false;
			// The hand-authored vector is the guaranteed baseline; real art replaces
			// it only once the host manifest confirms the file is installed.
			image.src = CAT_SVG;
			const video = document.createElement("video");
			video.dataset.tlCatVideo = "";
			// Life-rhythm clips are decorative and short (≤32 MiB): silent, looping,
			// inline, metadata-only preload, no controls, never picture-in-picture.
			video.muted = true;
			video.playsInline = true;
			video.loop = true;
			video.autoplay = true;
			video.preload = "metadata";
			video.disablePictureInPicture = true;
			video.setAttribute("muted", "");
			video.setAttribute("playsinline", "");
			video.setAttribute("aria-hidden", "true");
			video.hidden = true;
			bodyWrap.appendChild(image);
			bodyWrap.appendChild(video);
			root.dataset.tlCatMedia = "image";

			// ---- v1.0.0 media runtime (image or ≤32 MiB video from the life engine) ----
			// The life layer is the single source of truth for the chosen media: it
			// resolves/persists it and republishes changes as `tianlight:pet-media`
			// (detail = media | null) on `document`. Every path below is fail-soft, so a
			// missing or misbehaving life engine only costs the replacement art.
			let currentMedia = null;
			let builtInArt = CAT_SVG;
			let imageFallbackUsed = false;
			const stopVideo = () => {
				try {
					video.pause();
				} catch (error) {
					note("companion:video-pause", error);
				}
				try {
					if (video.getAttribute("src") !== null) {
						video.removeAttribute("src");
						video.load?.();
					}
				} catch (error) {
					note("companion:video-clear", error);
				}
			};
			const playVideo = () => {
				try {
					const played = video.play?.();
					if (played !== null && played !== undefined && typeof played.catch === "function") {
						played.catch(() => {});
					}
				} catch (error) {
					note("companion:video-play", error);
				}
			};
			const showImage = (url) => {
				currentMedia = { kind: "image", url };
				root.dataset.tlCatMedia = "image";
				bodyWrap.dataset.tlCatMedia = "image";
				image.hidden = false;
				video.hidden = true;
				stopVideo();
				imageFallbackUsed = false;
				image.src = url;
			};
			const showVideo = (url) => {
				currentMedia = { kind: "video", url };
				root.dataset.tlCatMedia = "video";
				bodyWrap.dataset.tlCatMedia = "video";
				video.hidden = false;
				image.hidden = true;
				imageFallbackUsed = false;
				video.src = url;
				playVideo();
			};
			const useBuiltInArt = () => {
				currentMedia = null;
				root.dataset.tlCatMedia = "image";
				bodyWrap.dataset.tlCatMedia = "image";
				image.hidden = false;
				video.hidden = true;
				stopVideo();
				imageFallbackUsed = false;
				image.src = builtInArt;
			};
			/** Apply a media object; returns false when it is not a usable media record. */
			const applyMedia = (media) => {
				if (media === null || typeof media !== "object") return false;
				const kind = media.kind;
				const url = typeof media.url === "string" ? media.url : "";
				if ((kind !== "image" && kind !== "video") || url === "") return false;
				if (currentMedia !== null && currentMedia.kind === kind && currentMedia.url === url) {
					// Same media re-announced: never restart a playing clip.
					if (kind === "video" && video.paused === true) playVideo();
					return true;
				}
				if (kind === "video") showVideo(url);
				else showImage(url);
				return true;
			};
			const readLifeMedia = () => {
				try {
					const life = globalThis.tianlightLife;
					if (life === null || life === undefined || typeof life.media !== "function") return null;
					return life.media();
				} catch (error) {
					note("companion:media-read", error);
					return null;
				}
			};
			// A failed replacement image degrades to the built-in vector, never to a
			// broken-image glyph; the flag stops a retry loop if even that fails.
			image.addEventListener("error", () => {
				try {
					if (root.dataset.tlCatMedia !== "image" || imageFallbackUsed) return;
					imageFallbackUsed = true;
					if (image.getAttribute("src") === CAT_SVG) return;
					image.src = CAT_SVG;
				} catch (error) {
					note("companion:art-fallback", error);
				}
			});
			// Same fail-soft rule for a replacement clip: a broken/unsupported video falls
			// back to the built-in art instead of leaving an empty body. `stopVideo()` drops
			// the src, so one failing switch cannot retry in a loop. Named so dispose can
			// drop it: the media stack outlives no companion, and a stray handler would be
			// held by the video element forever.
			const onVideoError = () => {
				try {
					if (root.dataset.tlCatMedia !== "video" || video.hidden === true) return;
					useBuiltInArt();
				} catch (error) {
					note("companion:video-fallback", error);
				}
			};
			video.addEventListener("error", onVideoError);
			const onPetMedia = (event) => {
				try {
					const detail = event === null || event === undefined ? null : event.detail;
					if (detail === null || detail === undefined) useBuiltInArt();
					else applyMedia(detail);
				} catch (error) {
					note("companion:pet-media", error);
				}
			};
			document.addEventListener("tianlight:pet-media", onPetMedia);
			const initialMedia = readLifeMedia();
			if (initialMedia !== null) applyMedia(initialMedia);
			void resolveCompanionArt().then((source) => {
				if (source === null || !root.isConnected) return;
				builtInArt = source;
				if (currentMedia === null) {
					imageFallbackUsed = false;
					image.src = source;
				}
			});
			root.appendChild(bodyWrap);

			const menu = document.createElement("div");
			// Same namespace separation as the speech bubble above.
			menu.dataset.tlCatmenu = "";
			const ACTIONS = [
				// v1.6.4: AI chat is the first item of the same interaction row. It carries
				// no mood delta; doAction() toggles the composer instead of a line.
				{ id: "chat", labelKey: "pet.action.chat" },
				// v1.6.7: conversation history sits right next to AI chat. It uses the fixed
				// glyph "☰" (the menu is a compact pill) and an i18n accessible name.
				{ id: "history", labelKey: "pet.action.history" },
				{ id: "pet", labelKey: "pet.action.pet", mood: 8 },
				{ id: "feed", labelKey: "pet.action.feed", mood: 12 },
				{ id: "play", labelKey: "pet.action.play", mood: 6 },
				{ id: "nap", labelKey: "pet.action.nap", mood: 2 },
				// v1.0.0: the life-rhythm control surface lives on the pet itself. These
				// two carry no mood delta; doAction() routes them to the life engine.
				{ id: "mute", labelKey: "pet.action.mute" },
				{ id: "focus", labelKey: "pet.action.focus" },
				// v1.3.0: the role hub lives on the pet itself. There is no separate
				// sidebar/settings entry anymore; this menu item and the right-click
				// context menu are the only ways in.
				{ id: "hub", labelKey: "pet.action.hub" },
			];
			for (const action of ACTIONS) {
				const button = document.createElement("button");
				button.type = "button";
				button.dataset.tlAction = action.id;
				if (action.id === "history") {
					// v1.6.7: a fixed glyph keeps the now-9-item pill compact; the English
					// and Chinese names both reach screen readers through aria-label.
					button.textContent = "☰";
					button.setAttribute("aria-label", TL_T(action.labelKey));
				} else {
					button.textContent = TL_T(action.labelKey);
				}
				menu.appendChild(button);
			}
			root.appendChild(menu);

			// ---- v1.6.4 AI chat composer (the menu item「AI 对话」toggles it) ----
			// DOM contract (all inside the pet root, after the menu):
			//   div[data-tl-catchat] > div[data-tl-catchat-head] > div[data-tl-catchat-status]
			//                                                   + button[data-tl-catchat-close]
			//                        + input[data-tl-catchat-input]
			//                        + button[data-tl-catchat-send]
			// Mounted after the menu inside the same root: the stylesheet floats it above
			// the art (a looping video keeps playing), and pointerdown inside it must never
			// start a drag. Closed by default: the root carries data-tl-chat-open to show it,
			// and the busy state is exposed as data-tl-busy on the panel.
			// v1.6.5 dismissal paths (the reported bug: the composer could not be left):
			// explicit × button, Escape (document-level capture, works from anywhere),
			// pointerdown outside the pet root, and a plain click on the pet itself — the
			// menu hangs below the pet and can be clipped off-screen near a screen edge, so
			// the menu must never be the only way to close the composer.
			// v1.6.6: the panel is clamped horizontally inside the viewport when it opens
			// (and after a resize or drag), so the × close button and the send button stay
			// reachable even when the pet sits near a screen edge.
			const chat = document.createElement("div");
			chat.dataset.tlCatchat = "";
			chat.setAttribute("aria-hidden", "true");
			// The stylesheet owns the transition, but `hidden` keeps the composer out of
			// the layout even before/without CSS, and is lifted by openChat(). v1.6.5: the
			// stylesheet also pins `[data-tl-catchat][hidden] { display: none !important; }`
			// because the composer's own `display: flex` rule would override the UA [hidden]
			// rule and leave an invisible panel occupying layout/pointer space.
			chat.hidden = true;
			const chatHead = document.createElement("div");
			chatHead.dataset.tlCatchatHead = "";
			const chatStatus = document.createElement("div");
			chatStatus.dataset.tlCatchatStatus = "";
			chatStatus.setAttribute("role", "status");
			chatStatus.setAttribute("aria-live", "polite");
			// v1.6.5: the always-visible, always-clickable way out of the composer.
			const chatClose = document.createElement("button");
			chatClose.type = "button";
			chatClose.setAttribute("type", "button");
			chatClose.dataset.tlCatchatClose = "";
			chatClose.textContent = "×";
			chatClose.setAttribute("aria-label", TL_T("pet.chat.close"));
			chatClose.tabIndex = -1;
			chatHead.append(chatStatus, chatClose);
			const chatInput = document.createElement("input");
			chatInput.type = "text";
			chatInput.setAttribute("type", "text");
			chatInput.dataset.tlCatchatInput = "";
			chatInput.maxLength = 500;
			chatInput.setAttribute("maxlength", "500");
			chatInput.autocomplete = "off";
			chatInput.spellcheck = false;
			chatInput.placeholder = TL_T("pet.chat.placeholder");
			chatInput.setAttribute("placeholder", TL_T("pet.chat.placeholder"));
			chatInput.setAttribute("aria-label", TL_T("pet.chat.placeholder"));
			chatInput.tabIndex = -1;
			const chatSend = document.createElement("button");
			chatSend.type = "button";
			chatSend.setAttribute("type", "button");
			chatSend.dataset.tlCatchatSend = "";
			chatSend.textContent = TL_T("pet.chat.send");
			chatSend.tabIndex = -1;
			chat.append(chatHead, chatInput, chatSend);
			root.appendChild(chat);

			// ---- v1.6.7 conversation history panel (the ☰ menu item toggles it) ----
			// DOM contract (inside the pet root, directly after the composer):
			//   div[data-tl-cathist] (hidden by default; aria-hidden mirrors it)
			//     div[data-tl-cathist-head]
			//       div[data-tl-cathist-title] + button[data-tl-cathist-new]
			//                                  + button[data-tl-cathist-delete]
			//                                  + button[data-tl-cathist-close]
			//     div[data-tl-cathist-status] (transient action feedback, aria-live)
			//     div[data-tl-cathist-conv-list] > button[data-tl-cathist-conv][data-conv-id][data-active?]
			//     div[data-tl-cathist-messages]
			//       > div[data-tl-cathist-msg][data-role][data-msg-id]
			//           > span[data-tl-cathist-role] + div[data-tl-cathist-text]
			//           + button[data-tl-cathist-edit] (user rows only)
			//         inline edit: input[data-tl-cathist-edit-input]
			//                      + button[data-tl-cathist-edit-save] / [data-tl-cathist-edit-cancel]
			//     div[data-tl-cathist-empty] (no conversation) / div[data-tl-cathist-hint] (no messages)
			// The panel and the composer are mutually exclusive surfaces above the pet.
			const hist = document.createElement("div");
			hist.dataset.tlCathist = "";
			hist.setAttribute("role", "group");
			hist.setAttribute("aria-label", TL_T("pet.history.title"));
			hist.setAttribute("aria-hidden", "true");
			// Like the composer: `hidden` keeps the panel out of the layout even before
			// CSS loads, and the stylesheet pins [hidden] because the base rule is flex.
			hist.hidden = true;
			hist.tabIndex = -1;
			const histHead = document.createElement("div");
			histHead.dataset.tlCathistHead = "";
			const histTitle = document.createElement("div");
			histTitle.dataset.tlCathistTitle = "";
			histTitle.textContent = TL_T("pet.history.title");
			const histNew = document.createElement("button");
			histNew.type = "button";
			histNew.dataset.tlCathistNew = "";
			histNew.textContent = TL_T("pet.history.new");
			histNew.tabIndex = -1;
			const histDelete = document.createElement("button");
			histDelete.type = "button";
			histDelete.dataset.tlCathistDelete = "";
			histDelete.textContent = TL_T("pet.history.delete");
			histDelete.tabIndex = -1;
			// No conversation exists before the first render: deleting is a no-op then.
			histDelete.disabled = true;
			const histClose = document.createElement("button");
			histClose.type = "button";
			histClose.dataset.tlCathistClose = "";
			histClose.textContent = "×";
			histClose.setAttribute("aria-label", TL_T("pet.history.close"));
			histClose.tabIndex = -1;
			histHead.append(histTitle, histNew, histDelete, histClose);
			const histStatus = document.createElement("div");
			histStatus.dataset.tlCathistStatus = "";
			histStatus.setAttribute("role", "status");
			histStatus.setAttribute("aria-live", "polite");
			histStatus.hidden = true;
			const histConvList = document.createElement("div");
			histConvList.dataset.tlCathistConvList = "";
			const histMessages = document.createElement("div");
			histMessages.dataset.tlCathistMessages = "";
			const histEmpty = document.createElement("div");
			histEmpty.dataset.tlCathistEmpty = "";
			histEmpty.hidden = true;
			const histHint = document.createElement("div");
			histHint.dataset.tlCathistHint = "";
			histHint.hidden = true;
			hist.append(histHead, histStatus, histConvList, histMessages, histEmpty, histHint);
			root.appendChild(hist);

			const clamp = () => {
				const maxX = Math.max(8, window.innerWidth - PET_WIDTH - 8);
				const maxY = Math.max(8, window.innerHeight - PET_HEIGHT - 8);
				state.x = Math.min(maxX, Math.max(8, state.x));
				state.y = Math.min(maxY, Math.max(8, state.y));
			};
			const place = () => {
				root.style.left = Math.round(state.x) + "px";
				root.style.top = Math.round(state.y) + "px";
			};
			clamp();
			place();
			// Mounted INSIDE the application root on purpose: `#root` is the stacking
			// context that carries menus (100) and modals (1000), so the companion
			// shares their scale instead of floating above dialogs from the body level.
			const surface = document.getElementById("root") ?? document.body;
			surface.appendChild(root);

			const timers = new Set();
			const later = (fn, delay) => {
				const id = window.setTimeout(() => {
					timers.delete(id);
					fn();
				}, delay);
				timers.add(id);
				return id;
			};
			let bubbleTimer = 0;
			// 正在显示台词的 i18n key。翻译在“显示”和“语言切换”两个时刻取值，
			// 不冻结在 say() 调用那一刻：旧实现切换语言后已显示的旧台词仍是中文。
			let bubbleKey = "";
			const say = (line, hold = 3200, chatReply = false) => {
				bubbleKey = typeof line === "string" ? line : "";
				// v1.6.4: a chat answer is allowed a wider, scrollable bubble (CSS keys on
				// `[data-tl-chat]`); any other line removes the marker again.
				if (chatReply === true) bubble.dataset.tlChat = "";
				else delete bubble.dataset.tlChat;
				// v1.6.8: a private-thought marker rides the same bubble; a normal line
				// always clears it so a thought is never mistaken for a chat answer.
				delete bubble.dataset.tlThought;
				// v1.0.0: the life engine speaks through this same bubble with its own
				// `life.line.*` keys, so translate ANY key the dictionaries know. Duty
				// `speak` passes arbitrary user copy, which TL_T returns unchanged.
				const translated = TL_T(bubbleKey);
				bubble.textContent = translated !== bubbleKey ? translated : bubbleKey;
				bubble.dataset.tlShow = "";
				if (bubbleTimer !== 0) window.clearTimeout(bubbleTimer);
				bubbleTimer = window.setTimeout(() => {
					delete bubble.dataset.tlShow;
					delete bubble.dataset.tlChat;
					delete bubble.dataset.tlThought;
					bubbleTimer = 0;
					bubbleKey = "";
				}, hold);
			};
			// Duty `clear` also dismisses a pending `speak` bubble: both are transient
			// "current utterance" surfaces, and a stuck line after clear is confusing.
			const clearSay = () => {
				if (bubbleTimer !== 0) {
					window.clearTimeout(bubbleTimer);
					bubbleTimer = 0;
				}
				bubbleKey = "";
				delete bubble.dataset.tlShow;
				delete bubble.dataset.tlChat;
				delete bubble.dataset.tlThought;
				bubble.textContent = "";
			};
			/**
			 * v1.6.8 thought bubble bridge (consumed by the private-thinking engine in
			 * src/44-pet-brain.js through companionDutyBridge.api.sayThought). It reuses
			 * the existing say channel — same bubble element, same timer/lifecycle — and
			 * marks the node with `data-tl-thought` for diagnostics/tests. Returns true
			 * when something was shown.
			 */
			const sayThought = (text, hold) => {
				try {
					const line = typeof text === "string" ? text.trim() : "";
					if (line === "") return false;
					const requested = Number(hold);
					const holdMs = Math.min(24000, Math.max(5000, Number.isFinite(requested) ? requested : 6000));
					say(line, holdMs, true);
					bubble.dataset.tlThought = "";
					return true;
				} catch (error) {
					note("companion:thought-say", error);
					return false;
				}
			};

			// ---- v0.7.0 duty bubble lifecycle (driven by the duty channel) ----
			let dutyTimer = 0;
			let dutySignal = "";
			let dutyEmit = null;
			const hideDuty = (reason) => {
				if (dutyTimer !== 0) {
					window.clearTimeout(dutyTimer);
					dutyTimer = 0;
				}
				delete dutyBubble.dataset.tlShow;
				delete dutyBubble.dataset.tlDutySignal;
				dutyText.textContent = "";
				dutyChoices.textContent = "";
				dutyChoices.hidden = true;
				dutySignal = "";
				dutyEmit = null;
				void reason;
			};
			const showDuty = (action, emit) => {
				hideDuty("replace");
				dutySignal = action.signalId;
				dutyEmit = typeof emit === "function" ? emit : null;
				dutyBubble.dataset.tlDutySignal = action.signalId;
				dutyText.textContent = action.text;
				for (const choice of action.choices) {
					const button = document.createElement("button");
					button.type = "button";
					button.dataset.tlDutyChoice = choice.id;
					button.textContent =
						typeof choice.label === "string" && choice.label !== ""
							? choice.label
							: TL_T(DUTY_CHOICE_LABELS[choice.id] ?? "duty.choice.later");
					button.addEventListener("click", (event) => {
						event.stopPropagation();
						const signalId = dutySignal;
						const emit = dutyEmit;
						hideDuty("choice");
						if (typeof emit === "function") {
							try {
								emit({ type: "choice", signalId, choiceId: choice.id, at: Date.now() });
								// The acknowledgement is a life-memory interaction, counted only
								// after the outbound event left successfully.
								try {
									globalThis.tianlightLife?.noteInteraction?.("ack");
								} catch (error) {
									note("duty:ack", error);
								}
							} catch (error) {
								note("duty:emit", error);
							}
						}
					});
					button.addEventListener("keydown", (event) => event.stopPropagation());
					button.addEventListener("pointerdown", (event) => event.stopPropagation());
					dutyChoices.appendChild(button);
				}
				dutyChoices.hidden = false;
				dutyBubble.dataset.tlShow = "";
				wake();
				if (action.ttlMs > 0) {
					dutyTimer = window.setTimeout(() => {
						dutyTimer = 0;
						const signalId = dutySignal;
						const emit = dutyEmit;
						hideDuty("timeout");
						if (typeof emit === "function") {
							try {
								emit({ type: "timeout", signalId, at: Date.now() });
							} catch (error) {
								note("duty:emit", error);
							}
						}
					}, action.ttlMs);
				}
			};
			companionDutyBridge.api = {
				showDuty,
				hideDuty,
				say: (text, hold) => say(text, hold),
				// v1.6.8: private thought display (same bubble, marked data-tl-thought).
				sayThought: (text, hold) => sayThought(text, hold),
				clearSay,
				status: () => ({
					ready: true,
					signalId: dutySignal === "" ? null : dutySignal,
					choiceCount: dutyChoices.children.length,
					visible: dutyBubble.dataset.tlShow !== undefined,
				}),
			};
			dutyChoices.hidden = true;

			// ---- v1.6.4 AI chat: composer state, send path, bubble reply ----
			// Brain denials are mapped onto dedicated i18n keys so every refused turn says
			// WHY (paused / permission / rate limit / malformed / disabled / internal). The
			// brain itself owns the permission model and quotas; this layer only displays.
			const CHAT_REASON_KEYS = {
				paused: "pet.chat.reason.paused",
				permission: "pet.chat.reason.permission",
				"rate-limit": "pet.chat.reason.rateLimit",
				rateLimit: "pet.chat.reason.rateLimit",
				"invalid-input": "pet.chat.reason.invalid",
				invalid: "pet.chat.reason.invalid",
				empty: "pet.chat.reason.invalid",
				disabled: "pet.chat.reason.disabled",
				"internal-error": "pet.chat.reason.internal",
				internal: "pet.chat.reason.internal",
			};
			let chatOpen = false;
			let chatBusy = false;
			let chatStatusKey = "";
			// R5: chat/history are non-modal layers in the shared overlay stack (Esc reaches
			// the top one; no Tab trap so the DSH composer keeps its own focus order).
			let chatOverlayDisposer = null;
			// v1.6.7: the history panel is the composer's sibling surface; both are
			// mutually exclusive and own a single transient edit row.
			let historyOpen = false;
			let histEditMsgId = "";
			let historyOverlayDisposer = null;
			let disposed = false;

			/** Effective pack of the look currently painted (null when the API is missing). */
			const currentPack = () => {
				try {
					const api = globalThis.tianlightPetActions;
					if (api === null || api === undefined || typeof api.get !== "function" || typeof api.current !== "function") return null;
					const pack = api.get(api.current());
					return pack !== null && typeof pack === "object" ? pack : null;
				} catch (error) {
					note("companion:pack-read", error);
					return null;
				}
			};
			/** Menu label: this look's custom label for pet/feed/play, i18n key otherwise. */
			const actionLabel = (action) => {
				if (action.id === "pet" || action.id === "feed" || action.id === "play") {
					const pack = currentPack();
					const custom = pack === null ? null : pack[action.id];
					if (custom !== null && custom !== undefined && typeof custom.label === "string" && custom.label !== "") {
						return TL_T(custom.label);
					}
				}
				return TL_T(action.labelKey);
			};
			/** Replies for one action: custom lines when set, else the built-in i18n keys. */
			const actionLines = (id) => {
				const pack = currentPack();
				const custom = pack === null ? null : pack[id];
				if (custom !== null && custom !== undefined && Array.isArray(custom.lines) && custom.lines.length > 0) return custom.lines;
				return LINES[id] ?? [];
			};
			const setChatStatus = (key) => {
				chatStatusKey = typeof key === "string" && key !== "" ? key : "";
				chatStatus.textContent = chatStatusKey === "" ? "" : TL_T(chatStatusKey);
			};
			const setChatBusy = (busy) => {
				chatBusy = busy === true;
				if (chatBusy) chat.dataset.tlBusy = "";
				else delete chat.dataset.tlBusy;
				chatInput.disabled = chatBusy;
				chatSend.disabled = chatBusy;
			};
			const focusChatInput = () => {
				try {
					chatInput.focus?.();
				} catch (error) {
					note("companion:chat-focus", error);
				}
			};
			// v1.6.6: keep the composer inside the viewport. The pet's default position is
			// near the right edge (x = innerWidth - 182) while the composer is 278px wide and
			// centred over the 150px pet, so its right edge lands ~32px past the viewport —
			// the new × close button (and the send button) were clipped almost entirely off
			// screen. Anchor it over the pet but clamp the left edge into [8, width-8], the
			// same way the interaction menu is clamped. Zero-layout environments (the Node
			// fake DOM) keep the stylesheet default.
			const clampChat = () => {
				chat.style.left = "50%";
				chat.style.right = "auto";
				chat.style.transform = "translateX(-50%)";
				const rect = chat.getBoundingClientRect();
				if (!(rect.width > 0)) return;
				const viewportLeft = Math.min(
					Math.max(8, state.x + PET_WIDTH / 2 - rect.width / 2),
					Math.max(8, window.innerWidth - rect.width - 8),
				);
				chat.style.left = Math.round(viewportLeft - state.x) + "px";
				chat.style.transform = "none";
			};
			const openChat = () => {
				// The two panels share the space above the pet: opening one closes the other.
				if (historyOpen === true) closeHistory();
				chatOpen = true;
				if (chatOverlayDisposer === null) {
					chatOverlayDisposer = tl5OverlayRegister({
						id: "pet-chat",
						modal: false,
						root: () => chat,
						onEscape: () => closeChat(),
					});
				}
				root.dataset.tlChatOpen = "";
				chat.hidden = false;
				chat.setAttribute("aria-hidden", "false");
				// v1.6.6: flip below when there is no room above. Measure the real panel
				// height (the close-button header row made the panel taller than the old
				// fixed 96px check) with a conservative fallback for zero-layout environments.
				const panelHeight = chat.getBoundingClientRect().height;
				const flipThreshold = panelHeight > 0 ? panelHeight + 18 : 118;
				if (state.y < flipThreshold) root.dataset.tlChatFlip = "";
				else delete root.dataset.tlChatFlip;
				clampChat();
				chatInput.tabIndex = 0;
				chatSend.tabIndex = 0;
				chatClose.tabIndex = 0;
				setChatStatus("");
				wake();
				later(() => {
					// The composer may have been closed in the same tick; never focus a
					// hidden input (it would steal the keyboard from the page).
					if (chatOpen === true) focusChatInput();
				}, 0);
			};
			const closeChat = () => {
				chatOpen = false;
				if (chatOverlayDisposer !== null) {
					try {
						chatOverlayDisposer();
					} catch {
						// the stack is already torn down
					}
					chatOverlayDisposer = null;
				}
				delete root.dataset.tlChatOpen;
				delete root.dataset.tlChatFlip;
				chat.hidden = true;
				chat.setAttribute("aria-hidden", "true");
				chatInput.tabIndex = -1;
				chatSend.tabIndex = -1;
				chatClose.tabIndex = -1;
				setChatStatus("");
				// Never leave the keyboard on a closed composer: Enter would keep sending.
				try {
					chatInput.blur?.();
					chatSend.blur?.();
					chatClose.blur?.();
				} catch (error) {
					note("companion:chat-blur", error);
				}
			};
			const toggleChat = () => {
				if (chatOpen === true) closeChat();
				else openChat();
			};
			// ---- v1.6.7 conversation history: panel state, rendering, inline edit ----
			const focusHistPanel = () => {
				try {
					hist.focus?.();
				} catch (error) {
					note("companion:chats-focus", error);
				}
			};
			const applyHistTabIndex = () => {
				// Closed panels must not keep a tab stop: tabbing through the page would
				// otherwise land inside a hidden conversation list.
				const tabIndex = historyOpen === true ? 0 : -1;
				for (const node of hist.querySelectorAll("button, input")) node.tabIndex = tabIndex;
			};
			const showHistStatus = (key) => {
				histStatus.textContent = TL_T(key);
				histStatus.hidden = false;
				later(() => {
					if (historyOpen !== true) return;
					histStatus.textContent = "";
					histStatus.hidden = true;
				}, 2000);
			};
			// Same clamp as the composer (v1.6.6): a 320px panel centred over a 150px pet
			// near the right edge would otherwise lose its close button off-screen.
			const clampHistory = () => {
				hist.style.left = "50%";
				hist.style.right = "auto";
				hist.style.transform = "translateX(-50%)";
				const rect = hist.getBoundingClientRect();
				if (!(rect.width > 0)) return;
				const viewportLeft = Math.min(
					Math.max(8, state.x + PET_WIDTH / 2 - rect.width / 2),
					Math.max(8, window.innerWidth - rect.width - 8),
				);
				hist.style.left = Math.round(viewportLeft - state.x) + "px";
				hist.style.transform = "none";
			};
			const buildHistRow = (message) => {
				const row = document.createElement("div");
				row.dataset.tlCathistMsg = "";
				row.dataset.role = message.role;
				row.dataset.msgId = message.id;
				const head = document.createElement("div");
				head.dataset.tlCathistMsgHead = "";
				const roleLabel = document.createElement("span");
				roleLabel.dataset.tlCathistRole = "";
				roleLabel.textContent = TL_T(message.role === "user" ? "pet.history.user" : "pet.history.pet");
				head.appendChild(roleLabel);
				row.appendChild(head);
				if (message.role === "user" && histEditMsgId === message.id) {
					// Inline edit replaces the text of exactly one user row; saving writes the
					// store (and the title when this is the conversation's first user line).
					const input = document.createElement("input");
					input.type = "text";
					input.dataset.tlCathistEditInput = "";
					input.value = message.text;
					input.maxLength = PET_CHATS_USER_MAX;
					input.setAttribute("maxlength", String(PET_CHATS_USER_MAX));
					input.autocomplete = "off";
					input.spellcheck = false;
					input.addEventListener("keydown", (event) => {
						if (event === null || event === undefined) return;
						if (event.key !== "Enter") return;
						if (typeof event.preventDefault === "function") event.preventDefault();
						saveHistEdit();
					});
					const actions = document.createElement("div");
					actions.dataset.tlCathistEditActions = "";
					const saveButton = document.createElement("button");
					saveButton.type = "button";
					saveButton.dataset.tlCathistEditSave = "";
					saveButton.textContent = TL_T("pet.history.save");
					const cancelButton = document.createElement("button");
					cancelButton.type = "button";
					cancelButton.dataset.tlCathistEditCancel = "";
					cancelButton.textContent = TL_T("pet.history.cancel");
					actions.append(saveButton, cancelButton);
					row.append(input, actions);
					later(() => {
						if (historyOpen !== true || histEditMsgId !== message.id) return;
						try {
							input.focus?.();
						} catch (error) {
							note("companion:chats-edit-focus", error);
						}
					}, 0);
				} else {
					const text = document.createElement("div");
					text.dataset.tlCathistText = "";
					text.textContent = message.text;
					row.appendChild(text);
					if (message.role === "user") {
						const editButton = document.createElement("button");
						editButton.type = "button";
						editButton.dataset.tlCathistEdit = "";
						editButton.textContent = TL_T("pet.history.edit");
						editButton.setAttribute("aria-label", TL_T("pet.history.edit"));
						head.appendChild(editButton);
					}
				}
				return row;
			};
			const renderHistory = () => {
				try {
					const state = petChatsRead();
					const activeId = state.activeId;
					const active = state.conversations.find((conversation) => conversation.id === activeId) ?? null;
					const keepEdit =
						active === null
							? false
							: active.messages.some((message) => message.id === histEditMsgId && message.role === "user");
					if (keepEdit === false) histEditMsgId = "";
					histConvList.textContent = "";
					for (const conversation of state.conversations) {
						const button = document.createElement("button");
						button.type = "button";
						button.dataset.tlCathistConv = "";
						button.dataset.convId = conversation.id;
						const title =
							typeof conversation.title === "string" && conversation.title !== ""
								? conversation.title
								: TL_T("pet.history.defaultTitle");
						button.textContent = title + " · " + TL_T("pet.history.count", { n: conversation.messages.length });
						button.title = title;
						if (conversation.id === activeId) button.dataset.active = "";
						histConvList.appendChild(button);
					}
					histEmpty.textContent = TL_T("pet.history.empty");
					histEmpty.hidden = state.conversations.length > 0;
					histMessages.textContent = "";
					if (active === null || active.messages.length === 0) {
						histHint.textContent = TL_T("pet.history.emptyHint");
						histHint.hidden = false;
					} else {
						histHint.hidden = true;
						for (const message of active.messages) histMessages.appendChild(buildHistRow(message));
					}
					histDelete.disabled = active === null;
					applyHistTabIndex();
					histMessages.scrollTop = histMessages.scrollHeight;
					histConvList.scrollTop = 0;
				} catch (error) {
					note("companion:chats-render", error);
				}
			};
			const saveHistEdit = () => {
				try {
					const active = petChatsActive();
					const input = histMessages.querySelector("[data-tl-cathist-edit-input]");
					if (active === null || histEditMsgId === "" || input === null) {
						histEditMsgId = "";
						renderHistory();
						return;
					}
					const value = typeof input.value === "string" ? input.value : "";
					const result = petChatsEditUserMessage(active.id, histEditMsgId, value);
					if (result !== null && result.ok === true) histEditMsgId = "";
					renderHistory();
				} catch (error) {
					histEditMsgId = "";
					note("companion:chats-edit-save", error);
				}
			};
			const openHistory = () => {
				// Mutual exclusion with the composer keeps one readable surface above the pet.
				if (chatOpen === true) closeChat();
				historyOpen = true;
				if (historyOverlayDisposer === null) {
					historyOverlayDisposer = tl5OverlayRegister({
						id: "pet-history",
						modal: false,
						root: () => hist,
						onEscape: () => closeHistory(),
					});
				}
				histEditMsgId = "";
				root.dataset.tlHistOpen = "";
				hist.hidden = false;
				hist.setAttribute("aria-hidden", "false");
				renderHistory();
				// Same flip rule as the composer: no room above the pet -> open below it.
				const panelHeight = hist.getBoundingClientRect().height;
				const flipThreshold = panelHeight > 0 ? panelHeight + 18 : 380;
				if (state.y < flipThreshold) root.dataset.tlHistFlip = "";
				else delete root.dataset.tlHistFlip;
				clampHistory();
				applyHistTabIndex();
				wake();
				later(() => {
					if (historyOpen === true) focusHistPanel();
				}, 0);
			};
			const closeHistory = () => {
				historyOpen = false;
				if (historyOverlayDisposer !== null) {
					try {
						historyOverlayDisposer();
					} catch {
						// the stack is already torn down
					}
					historyOverlayDisposer = null;
				}
				histEditMsgId = "";
				delete root.dataset.tlHistOpen;
				delete root.dataset.tlHistFlip;
				hist.hidden = true;
				hist.setAttribute("aria-hidden", "true");
				applyHistTabIndex();
				histStatus.textContent = "";
				histStatus.hidden = true;
				try {
					hist.blur?.();
					for (const node of hist.querySelectorAll("button, input")) node.blur?.();
				} catch (error) {
					note("companion:chats-blur", error);
				}
			};
			const toggleHistory = () => {
				if (historyOpen === true) closeHistory();
				else openHistory();
			};
			/** Persist one shown turn (user + pet) into the active conversation, creating it. */
			const recordChatTurn = (userText, petText) => {
				try {
					let conversation = petChatsActive();
					if (conversation === null) conversation = petChatsCreate();
					if (conversation === null) return;
					petChatsAppend(conversation.id, { role: "user", text: userText });
					petChatsAppend(conversation.id, { role: "pet", text: petText });
				} catch (error) {
					note("companion:chats-record", error);
				}
			};
			// Panel interactions are delegated: rows and conversation buttons are rebuilt
			// on every render while the panel and its header buttons are long-lived.
			const onHistClick = (event) => {
				const target = event === null || event === undefined ? null : event.target;
				if (!(target instanceof HTMLElement)) return;
				if (target.closest("[data-tl-cathist-close]") !== null) {
					closeHistory();
					return;
				}
				if (target.closest("[data-tl-cathist-new]") !== null) {
					histEditMsgId = "";
					petChatsCreate();
					renderHistory();
					return;
				}
				if (target.closest("[data-tl-cathist-delete]") !== null) {
					const active = petChatsActive();
					if (active === null) return;
					petChatsRemove(active.id);
					histEditMsgId = "";
					showHistStatus("pet.history.deleted");
					renderHistory();
					return;
				}
				const convButton = target.closest("[data-tl-cathist-conv]");
				if (convButton !== null) {
					const convId = convButton.dataset.convId;
					if (typeof convId === "string" && convId !== "") {
						petChatsSetActive(convId);
						histEditMsgId = "";
						renderHistory();
					}
					return;
				}
				const editButton = target.closest("[data-tl-cathist-edit]");
				if (editButton !== null) {
					const row = editButton.closest("[data-tl-cathist-msg]");
					if (row !== null && typeof row.dataset.msgId === "string" && row.dataset.msgId !== "") {
						histEditMsgId = row.dataset.msgId;
						renderHistory();
					}
					return;
				}
				if (target.closest("[data-tl-cathist-edit-save]") !== null) {
					saveHistEdit();
					return;
				}
				if (target.closest("[data-tl-cathist-edit-cancel]") !== null) {
					histEditMsgId = "";
					renderHistory();
				}
			};
			hist.addEventListener("click", onHistClick);
			// The panel consumes its own key events so the cat root's Enter/Space menu
			// shortcut cannot fire while a history button or the edit input has focus.
			hist.addEventListener("keydown", (event) => {
				if (event !== null && event !== undefined && typeof event.stopPropagation === "function") event.stopPropagation();
			});
			hist.addEventListener("pointerdown", (event) => {
				if (event !== null && event !== undefined && typeof event.stopPropagation === "function") event.stopPropagation();
			});
			/**
			 * v2.0.0: one-line hint for a model failure that fell back to a local reply.
			 * The pet brain (src/44-pet-brain.js, same closure) owns the localized copy;
			 * without it the turn still reads "本地回复" and the hint is simply omitted.
			 */
			const companionLlmHintText = (code) => {
				if (typeof code !== "string" || code === "") return "";
				try {
					if (typeof petLlmHintText === "function") {
						const hint = petLlmHintText(code);
						if (typeof hint === "string" && hint !== "") return hint;
					}
				} catch (error) {
					note("companion:llm-hint", error);
				}
				return "";
			};
			/**
			 * Show a chat answer in the say bubble: longer hold + the wide-bubble marker.
			 * v2.0.0 first line names the source ("AI 回复" / "本地回复") so a model
			 * fallback is never mistaken for an AI answer; a failed model call appends
			 * one localized reason line (the bubble CSS is white-space: pre-wrap).
			 */
			const sayChat = (reply, source, llmError) => {
				const text = typeof reply === "string" ? reply.trim() : "";
				if (text === "" || !root.isConnected) return false;
				const label = source === "llm" ? TL_T("pet.chat.source.ai") : TL_T("pet.chat.source.local");
				const lines = [label, text];
				const hint = companionLlmHintText(llmError);
				if (hint !== "") lines.push(hint);
				const body = lines.join("\n");
				const hold = Math.min(24000, Math.max(9000, 4000 + body.length * 30));
				say(body, hold, true);
				return true;
			};
			const sendChat = async () => {
				if (chatBusy === true) return;
				const raw = typeof chatInput.value === "string" ? chatInput.value : "";
				const text = raw.trim().slice(0, 500);
				if (text === "") {
					setChatStatus("pet.chat.empty");
					focusChatInput();
					return;
				}
				let brain = null;
				// R4A: prefer the brain's same-closure bridge over globalThis.tianlightPet
				// so a same-page script cannot swap the chat path. The global stays as a
				// fallback for a stripped harness only.
				try {
					if (typeof petBrainInternal !== "undefined" && petBrainInternal !== null) brain = petBrainInternal;
				} catch {
					brain = null;
				}
				if (brain === null) {
					try {
						brain = globalThis.tianlightPet;
					} catch (error) {
						brain = null;
						note("companion:chat-brain", error);
					}
				}
				if (brain === null || brain === undefined || typeof brain.chat !== "function") {
					setChatStatus("pet.chat.unavailable");
					return;
				}
				setChatBusy(true);
				setChatStatus("pet.chat.thinking");
				try {
					const result = await brain.chat(text);
					if (disposed === true) return;
					if (result !== null && typeof result === "object" && result.ok === true) {
						const reply =
							typeof result.reply === "string" && result.reply.trim() !== ""
								? result.reply.trim()
								: typeof result.text === "string"
									? result.text.trim()
									: "";
						// v2.0.0: pass the brain's source + stable model-failure code through, so
						// the bubble labels the reply and explains a local fallback. The history
						// schema stays unchanged: recordChatTurn still stores the plain reply.
						const replySource = typeof result.source === "string" && result.source !== "" ? result.source : "local";
						const llmError = typeof result.llmError === "string" && result.llmError !== "" ? result.llmError : "";
						if (sayChat(reply, replySource, llmError) === false) {
							setChatStatus("pet.chat.failed");
							return;
						}
						chatInput.value = "";
						// v1.6.7: the answered turn is history now; close the composer at once so
						// the speech bubble (already wide + scrollable) is the only reply surface.
						recordChatTurn(text, reply);
						closeChat();
						wake();
						noteInteraction("talk");
					} else {
						const reason = result !== null && typeof result === "object" && typeof result.reason === "string" ? result.reason : "";
						if (reason === "") setChatStatus("pet.chat.failed");
						else setChatStatus(Object.prototype.hasOwnProperty.call(CHAT_REASON_KEYS, reason) ? CHAT_REASON_KEYS[reason] : "pet.chat.reason.default");
						const deniedLine = TL_T("pet.chat.deniedSay");
						say("pet.chat.deniedSay", 3200);
						// v1.6.7: a deliberate refusal is still a completed turn, so it lands in
						// the history with the same denial line the bubble just showed.
						recordChatTurn(text, deniedLine);
						closeChat();
					}
				} catch (error) {
					note("companion:chat", error);
					if (disposed !== true) setChatStatus("pet.chat.failed");
				} finally {
					setChatBusy(false);
					if (disposed !== true && chatOpen === true) focusChatInput();
				}
			};
			// Keyboard: Enter sends, Escape closes. The panel consumes its own key events so
			// the cat root's Enter/Space menu shortcut can never fire while typing.
			chat.addEventListener("keydown", (event) => {
				if (event === null || event === undefined) return;
				if (typeof event.stopPropagation === "function") event.stopPropagation();
				if (event.key === "Escape") {
					if (typeof event.preventDefault === "function") event.preventDefault();
					closeChat();
				}
			});
			chatInput.addEventListener("keydown", (event) => {
				if (event === null || event === undefined) return;
				if (event.key === "Escape") {
					if (typeof event.preventDefault === "function") event.preventDefault();
					if (typeof event.stopPropagation === "function") event.stopPropagation();
					closeChat();
					return;
				}
				if (event.key !== "Enter") return;
				if (typeof event.preventDefault === "function") event.preventDefault();
				if (typeof event.stopPropagation === "function") event.stopPropagation();
				void sendChat();
			});
			chatSend.addEventListener("click", (event) => {
				if (event !== null && event !== undefined && typeof event.stopPropagation === "function") event.stopPropagation();
				void sendChat();
			});
			// v1.6.5: the explicit close button. pointerdown is consumed too so pressing
			// the button never starts a pet drag (the root pointerdown handler ignores the
			// composer, this keeps the guarantee even if that check changes).
			chatClose.addEventListener("pointerdown", (event) => {
				if (event !== null && event !== undefined && typeof event.stopPropagation === "function") event.stopPropagation();
			});
			chatClose.addEventListener("click", (event) => {
				if (event !== null && event !== undefined) {
					if (typeof event.preventDefault === "function") event.preventDefault();
					if (typeof event.stopPropagation === "function") event.stopPropagation();
				}
				closeChat();
			});

			// 语言切换（跟随 DSH 或手动）时刷新可读文案与正在显示的台词，不重建 DOM。
			const refreshCompanionLabels = () => {
				root.setAttribute("aria-label", TL_T("pet.aria"));
				for (const button of menu.querySelectorAll("[data-tl-action]")) {
					const action = ACTIONS.find((candidate) => candidate.id === button.dataset.tlAction);
					if (action === undefined) continue;
					if (action.id === "history") {
						// v1.6.7: fixed glyph, localized accessible name.
						button.textContent = "☰";
						button.setAttribute("aria-label", TL_T(action.labelKey));
					} else {
						button.textContent = actionLabel(action);
					}
				}
				chatInput.placeholder = TL_T("pet.chat.placeholder");
				chatInput.setAttribute("aria-label", TL_T("pet.chat.placeholder"));
				chatSend.textContent = TL_T("pet.chat.send");
				chatClose.setAttribute("aria-label", TL_T("pet.chat.close"));
				if (chatStatusKey !== "") chatStatus.textContent = TL_T(chatStatusKey);
				histTitle.textContent = TL_T("pet.history.title");
				hist.setAttribute("aria-label", TL_T("pet.history.title"));
				histNew.textContent = TL_T("pet.history.new");
				histDelete.textContent = TL_T("pet.history.delete");
				histClose.setAttribute("aria-label", TL_T("pet.history.close"));
				// Dynamic rows are rebuilt in the new language; a running inline edit is
				// intentionally dropped (its text lives in the store until saved).
				if (historyOpen === true) renderHistory();
				if (bubbleTimer !== 0 && bubbleKey !== "") bubble.textContent = TL_T(bubbleKey);
			};
			const unsubscribeI18n = subscribeTl5I18n(refreshCompanionLabels);
			refreshCompanionLabels();
			// The media switch and the role hub's pack edits both require a re-read of the
			// effective pack: the current look's labels/lines must be reflected immediately.
			const onPetPackChanged = () => {
				try {
					refreshCompanionLabels();
				} catch (error) {
					note("companion:pack-refresh", error);
				}
			};
			document.addEventListener("tianlight:pet-actions", onPetPackChanged);
			document.addEventListener("tianlight:pet-media", onPetPackChanged);

			let sleeping = false;
			const wake = () => {
				if (!sleeping) return;
				sleeping = false;
				delete root.dataset.tlSleeping;
			};
			/**
			 * v1.0.0: report one user interaction to the life engine's cross-session
			 * memory (pat/feed/play). `talk` is counted by the life engine itself; the
			 * duty bubble reports `ack` from its own click handler.
			 */
			const noteInteraction = (kind) => {
				try {
					globalThis.tianlightLife?.noteInteraction?.(kind);
				} catch (error) {
					note("companion:note-interaction", error);
				}
			};
			const doAction = (id) => {
				const action = ACTIONS.find((candidate) => candidate.id === id);
				if (action === undefined) return;
				// v1.3.0: the pet is the only role-hub entry point. Opening is silent when
				// the hub is absent: no mood change, no speech, no error.
				if (id === "hub") {
					closeMenu();
					try {
						globalThis.tianlightRoleHub?.open?.();
					} catch {
						// the hub is optional infrastructure; the menu stays usable
					}
					return;
				}
				// v1.6.4: the AI chat item toggles the composer; it carries no mood delta.
				if (id === "chat") {
					closeMenu();
					toggleChat();
					return;
				}
				// v1.6.7: conversation history toggles the list panel; the two panels are
				// mutually exclusive (each open path closes the other surface first).
				if (id === "history") {
					closeMenu();
					toggleHistory();
					return;
				}
				// v1.0.0 life-rhythm controls: the pet menu and the role settings page
				// share one state, so these only delegate and echo the outcome.
				if (id === "mute") {
					try {
						globalThis.tianlightLife?.muteFor?.(3600000);
					} catch (error) {
						note("companion:mute", error);
					}
					say("pet.act.mute", 2600);
					closeMenu();
					return;
				}
				if (id === "focus") {
					let focusing = false;
					try {
						const status = globalThis.tianlightLife?.focusStatus?.();
						focusing = status !== null && status !== undefined && status.active === true;
					} catch (error) {
						note("companion:focus-status", error);
					}
					try {
						if (focusing) globalThis.tianlightLife?.focusStop?.();
						else globalThis.tianlightLife?.focusStart?.(25);
					} catch (error) {
						note("companion:focus", error);
					}
					say(focusing ? "pet.act.focusStop" : "pet.act.focusStart", 2600);
					closeMenu();
					return;
				}
				if (id === "nap") {
					sleeping = true;
					root.dataset.tlSleeping = "";
					say(pick(LINES.nap));
				} else {
					wake();
					say(pick(actionLines(id)));
					if (id === "pet" || id === "feed" || id === "play") noteInteraction(id === "pet" ? "pat" : id);
				}
				state.mood = Math.min(100, state.mood + action.mood);
				saveState(state);
				closeMenu();
			};

			let menuOpen = false;
			const openMenu = () => {
				// v1.6.4: the cat menu hangs BELOW the pet while the chat composer sits ABOVE
				// it, so both can be visible; that keeps「AI 对话」a real toggle (click it
				// again from the menu to close the composer).
				menuOpen = true;
				menu.dataset.tlShow = "";
				// Keep the pill inside the viewport: the pet lives near the right edge by
				// default, where a centred 4-button pill would be clipped off-screen.
				menu.style.left = "50%";
				menu.style.right = "";
				menu.style.transform = "";
				const rect = menu.getBoundingClientRect();
				if (rect.right > window.innerWidth - 8) {
					menu.style.left = "auto";
					menu.style.right = "-6px";
					menu.style.transform = "none";
				} else if (rect.left < 8) {
					menu.style.left = "-6px";
					menu.style.transform = "none";
				}
			};
			const closeMenu = () => {
				menuOpen = false;
				delete menu.dataset.tlShow;
			};

			// ---- drag + click ----
			let dragging = false;
			let moved = false;
			let pointerId = -1;
			let offsetX = 0;
			let offsetY = 0;

			const onPointerDown = (event) => {
				if (event.button !== undefined && event.button !== 0) return;
				// Every floating surface owned by the pet is excluded from drag start, so a
				// press on a panel button can never move the pet or steal pointer capture.
				if (
					event.target instanceof HTMLElement &&
					event.target.closest("[data-tl-catmenu], [data-tl-catchat], [data-tl-cathist]") !== null
				) {
					return;
				}
				dragging = true;
				moved = false;
				pointerId = event.pointerId;
				offsetX = event.clientX - state.x;
				offsetY = event.clientY - state.y;
				root.dataset.tlDragging = "";
				root.setPointerCapture?.(event.pointerId);
				event.preventDefault();
			};
			const onPointerMove = (event) => {
				if (!dragging) return;
				if (Math.abs(event.clientX - state.x - offsetX) > 3 || Math.abs(event.clientY - state.y - offsetY) > 3) {
					moved = true;
				}
				state.x = event.clientX - offsetX;
				state.y = event.clientY - offsetY;
				clamp();
				place();
			};
			const onPointerUp = (event) => {
				if (!dragging) return;
				dragging = false;
				root.releasePointerCapture?.(pointerId);
				delete root.dataset.tlDragging;
				if (moved) {
					saveState(state);
					wake();
					// v1.6.6: the composer follows the pet; re-clamp it after dragging the pet
					// towards a screen edge (a drag never closes the composer by itself).
					if (chatOpen === true) clampChat();
					// v1.6.7: the history panel tracks the pet the same way.
					if (historyOpen === true) clampHistory();
					return;
				}
				// v1.6.5: a plain click on the pet while the composer is open is the
				// always-reachable way out. The menu hangs below the pet and may be clipped
				// off-screen near a screen edge, so the close path must not depend on it;
				// the click closes the composer and does not open the menu in the same go.
				// v1.6.7: the history panel closes through the very same path.
				if (chatOpen === true || historyOpen === true) {
					if (chatOpen === true) closeChat();
					if (historyOpen === true) closeHistory();
					closeMenu();
					wake();
					return;
				}
				// A click (not a drag) toggles the interaction menu.
				if (menuOpen) closeMenu();
				else openMenu();
				wake();
				if (!bubble.dataset.tlShow) say(pick(LINES.near), 1800);
			};
			root.addEventListener("pointerdown", onPointerDown);
			root.addEventListener("pointermove", onPointerMove);
			root.addEventListener("pointerup", onPointerUp);
			root.addEventListener("pointercancel", onPointerUp);
			root.addEventListener("keydown", (event) => {
				if (event.key === "Escape") {
					if (chatOpen === true) {
						event.preventDefault();
						closeChat();
					}
					return;
				}
				if (event.key !== "Enter" && event.key !== " ") return;
				event.preventDefault();
				if (menuOpen) closeMenu();
				else openMenu();
			});
			/**
			 * v1.2.0: right-clicking the cat is the fast path into the role hub. The
			 * event is consumed so the host page context menu never appears; when the
			 * hub is not installed (or refuses to open) the original interaction menu
			 * opens instead, so the gesture is never a silent no-op. This path never
			 * touches the left-button drag/click state.
			 */
			const onContextMenu = (event) => {
				if (event !== null && event !== undefined) {
					try {
						if (typeof event.preventDefault === "function") event.preventDefault();
						if (typeof event.stopPropagation === "function") event.stopPropagation();
					} catch (error) {
						note("companion:contextmenu-event", error);
					}
				}
				let opened = false;
				try {
					const hub = globalThis.tianlightRoleHub;
					if (hub !== null && hub !== undefined && typeof hub.open === "function") {
						opened = hub.open() !== false;
					}
				} catch (error) {
					opened = false;
					note("companion:contextmenu-hub", error);
				}
				if (opened === true) return;
				try {
					openMenu();
					wake();
				} catch (error) {
					note("companion:contextmenu-menu", error);
				}
			};
			root.addEventListener("contextmenu", onContextMenu);

			menu.addEventListener("click", (event) => {
				const target = event.target;
				if (!(target instanceof HTMLElement)) return;
				const action = target.dataset.tlAction;
				if (action !== undefined) doAction(action);
			});

			// ---- proximity ----
			let near = false;
			let nearTimer = 0;
			// v1.0.0 energy: `--tl-look` drives a transform on every pointer move; only
			// write it when the rounded value actually changes (the visual is identical).
			let lastLook = "";
			const onProximity = (event) => {
				if (dragging) return;
				const centerX = state.x + PET_WIDTH / 2;
				const centerY = state.y + PET_HEIGHT / 2;
				const dx = event.clientX - centerX;
				const dy = event.clientY - centerY;
				const distance = Math.hypot(dx, dy);
				const isNear = distance < 190;
				const look = (Math.max(-1, Math.min(1, dx / 220))).toFixed(3);
				if (look !== lastLook) {
					lastLook = look;
					root.style.setProperty("--tl-look", look);
				}
				if (isNear === near) return;
				near = isNear;
				if (near) {
					root.dataset.tlNear = "";
					wake();
					if (nearTimer !== 0) window.clearTimeout(nearTimer);
					nearTimer = window.setTimeout(() => {
						nearTimer = 0;
						if (!sleeping && !menuOpen && historyOpen !== true && Math.random() < 0.34) say(pick(LINES.near), 2200);
					}, 420);
				} else {
					delete root.dataset.tlNear;
				}
			};
			window.addEventListener("pointermove", onProximity, { passive: true });

			// ---- idle life ----
			// v1.0.0 energy: the 24s tick still skips hidden pages; on the 15fps render
			// budget it also runs the passive roll every other tick. Interaction paths
			// (pointer/drag/menu/proximity) are untouched, so the pet never feels slower.
			let idleTick = 0;
			const idleTimer = window.setInterval(() => {
				if (document.hidden) return;
				if (readRenderTier() === "15") {
					idleTick += 1;
					if (idleTick % 2 !== 0) return;
				}
				if (dragging || menuOpen || historyOpen) return;
				if (state.mood > 0) state.mood = Math.max(0, state.mood - 1);
				if (sleeping) return;
				if (state.mood < 30 && Math.random() < 0.5) {
					say(pick(LINES.idle), 3000);
					return;
				}
				const roll = Math.random();
				if (roll < 0.22) {
					sleeping = true;
					root.dataset.tlSleeping = "";
					say(pick(LINES.nap), 2600);
				} else if (roll < 0.4) {
					say(pick(LINES.idle), 3000);
				}
			}, 24000);

			const onResize = () => {
				clamp();
				place();
				// v1.6.6: keep an open composer inside the resized viewport.
				if (chatOpen === true) clampChat();
				// v1.6.7: same for the history panel.
				if (historyOpen === true) clampHistory();
			};
			window.addEventListener("resize", onResize);

			// Clicking anywhere outside the pet closes both transient surfaces. v1.6.5:
			// the composer joins the menu here, so a click on the page (or on another
			// dialog) leaves the chat instead of trapping the user in it.
			// v1.6.7: the history panel joins the same dismissal path.
			const onDocumentPointerDown = (event) => {
				if (!menuOpen && chatOpen !== true && historyOpen !== true) return;
				const target = event.target;
				const inside = target instanceof Node && root.contains(target);
				if (inside === true) return;
				if (menuOpen) closeMenu();
				if (chatOpen === true) closeChat();
				if (historyOpen === true) closeHistory();
			};
			document.addEventListener("pointerdown", onDocumentPointerDown, true);

			// v1.6.5: Escape closes the chat from anywhere. R5: this is now a non-modal
			// layer in the shared overlay stack (the stack closes only the TOP layer, so
			// Esc in the role hub no longer also closes the pet chat underneath).

			later(() => say("pet.hello", 2600), 700);
			// v1.0.0 media ordering: apply() installs the life layer AFTER this switchable
			// module, so a persisted media choice can resolve right after the current task.
			// One microtask re-read covers that order without a visible flash, and a short
			// timer covers an install pass that yields; a later `tianlight:pet-media` event
			// always wins. Neither path polls.
			const tryApplyLateMedia = () => {
				try {
					if (currentMedia !== null || !root.isConnected) return;
					const media = readLifeMedia();
					if (media !== null) {
						applyMedia(media);
						refreshCompanionLabels();
					}
				} catch (error) {
					note("companion:media-late-read", error);
				}
			};
			if (typeof queueMicrotask === "function") queueMicrotask(tryApplyLateMedia);
			later(tryApplyLateMedia, 900);

			return () => {
				disposed = true;
				companionDutyBridge.api = null;
				// Release the shared action API the same way the duty channel releases its
				// global: restore the pre-skin value (delete when there was none).
				if (globalThis.tianlightPetActions === petActionsApi) {
					if (previousPetActionsGlobal === undefined) delete globalThis.tianlightPetActions;
					else globalThis.tianlightPetActions = previousPetActionsGlobal;
				}
				// The conversation store API follows the same rule: restore the pre-skin
				// global (delete when none existed) instead of leaking a dead instance.
				if (globalThis.tianlightPetChats === petChatsApi) {
					if (previousPetChatsGlobal === undefined) delete globalThis.tianlightPetChats;
					else globalThis.tianlightPetChats = previousPetChatsGlobal;
				}
				hideDuty("dispose");
				if (typeof unsubscribeI18n === "function") unsubscribeI18n();
				window.clearInterval(idleTimer);
				if (bubbleTimer !== 0) window.clearTimeout(bubbleTimer);
				if (nearTimer !== 0) window.clearTimeout(nearTimer);
				for (const id of timers) window.clearTimeout(id);
				timers.clear();
				window.removeEventListener("pointermove", onProximity);
				window.removeEventListener("resize", onResize);
				document.removeEventListener("pointerdown", onDocumentPointerDown, true);
				if (chatOverlayDisposer !== null) {
					try {
						chatOverlayDisposer();
					} catch {
						// the stack is already torn down
					}
					chatOverlayDisposer = null;
				}
				if (historyOverlayDisposer !== null) {
					try {
						historyOverlayDisposer();
					} catch {
						// the stack is already torn down
					}
					historyOverlayDisposer = null;
				}
				document.removeEventListener("tianlight:pet-actions", onPetPackChanged);
				document.removeEventListener("tianlight:pet-media", onPetPackChanged);
				document.removeEventListener("tianlight:pet-media", onPetMedia);
				root.removeEventListener("contextmenu", onContextMenu);
				video.removeEventListener("error", onVideoError);
				try {
					stopVideo();
				} catch (error) {
					note("companion:dispose-media", error);
				}
				root.remove();
			};
		}

		/**
		 * Validate one inbound duty action. Fail-closed by design: an adapter is
		 * third-party code, so an unknown shape must never reach the pet DOM.
		 */
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

