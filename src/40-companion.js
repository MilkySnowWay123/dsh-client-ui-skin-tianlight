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
		const companionDutyBridge = { api: null, lifeGate: null };
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
				"pet.chat.placeholder": "和我说点什么…",
				"pet.chat.send": "发送",
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
				"pet.chat.placeholder": "Say something to me…",
				"pet.chat.send": "Send",
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
				button.textContent = TL_T(action.labelKey);
				menu.appendChild(button);
			}
			root.appendChild(menu);

			// ---- v1.6.4 AI chat composer (the menu item「AI 对话」toggles it) ----
			// DOM contract (all inside the pet root, after the menu):
			//   div[data-tl-catchat] > div[data-tl-catchat-status]
			//                        + input[data-tl-catchat-input]
			//                        + button[data-tl-catchat-send]
			// Mounted after the menu inside the same root: the stylesheet floats it above
			// the art (a looping video keeps playing), and pointerdown inside it must never
			// start a drag. Closed by default: the root carries data-tl-chat-open to show it,
			// and the busy state is exposed as data-tl-busy on the panel.
			const chat = document.createElement("div");
			chat.dataset.tlCatchat = "";
			chat.setAttribute("aria-hidden", "true");
			// The stylesheet owns the transition, but `hidden` keeps the composer out of
			// the layout even before/without CSS, and is lifted by openChat().
			chat.hidden = true;
			const chatStatus = document.createElement("div");
			chatStatus.dataset.tlCatchatStatus = "";
			chatStatus.setAttribute("role", "status");
			chatStatus.setAttribute("aria-live", "polite");
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
			chat.append(chatStatus, chatInput, chatSend);
			root.appendChild(chat);

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
				bubble.textContent = "";
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
			const openChat = () => {
				chatOpen = true;
				root.dataset.tlChatOpen = "";
				// Not enough viewport above the pet: flip the composer below it (the
				// stylesheet keys on data-tl-chat-flip) instead of pushing it off-screen.
				if (state.y < 96) root.dataset.tlChatFlip = "";
				else delete root.dataset.tlChatFlip;
				chat.hidden = false;
				chat.setAttribute("aria-hidden", "false");
				chatInput.tabIndex = 0;
				chatSend.tabIndex = 0;
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
				delete root.dataset.tlChatOpen;
				delete root.dataset.tlChatFlip;
				chat.hidden = true;
				chat.setAttribute("aria-hidden", "true");
				chatInput.tabIndex = -1;
				chatSend.tabIndex = -1;
				setChatStatus("");
				// Never leave the keyboard on a closed composer: Enter would keep sending.
				try {
					chatInput.blur?.();
					chatSend.blur?.();
				} catch (error) {
					note("companion:chat-blur", error);
				}
			};
			const toggleChat = () => {
				if (chatOpen === true) closeChat();
				else openChat();
			};
			/** Show a chat answer in the say bubble: longer hold + the wide-bubble marker. */
			const sayChat = (reply) => {
				const text = typeof reply === "string" ? reply.trim() : "";
				if (text === "" || !root.isConnected) return false;
				const hold = Math.min(24000, Math.max(9000, 4000 + text.length * 30));
				say(text, hold, true);
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
				try {
					brain = globalThis.tianlightPet;
				} catch (error) {
					brain = null;
					note("companion:chat-brain", error);
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
						if (sayChat(reply) === false) {
							setChatStatus("pet.chat.failed");
							return;
						}
						chatInput.value = "";
						setChatStatus("pet.chat.you");
						later(() => {
							if (chatBusy === false && chatStatusKey === "pet.chat.you") setChatStatus("");
						}, 2200);
						wake();
						noteInteraction("talk");
					} else {
						const reason = result !== null && typeof result === "object" && typeof result.reason === "string" ? result.reason : "";
						if (reason === "") setChatStatus("pet.chat.failed");
						else setChatStatus(Object.prototype.hasOwnProperty.call(CHAT_REASON_KEYS, reason) ? CHAT_REASON_KEYS[reason] : "pet.chat.reason.default");
						say("pet.chat.deniedSay", 3200);
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

			// 语言切换（跟随 DSH 或手动）时刷新可读文案与正在显示的台词，不重建 DOM。
			const refreshCompanionLabels = () => {
				root.setAttribute("aria-label", TL_T("pet.aria"));
				for (const button of menu.querySelectorAll("[data-tl-action]")) {
					const action = ACTIONS.find((candidate) => candidate.id === button.dataset.tlAction);
					if (action !== undefined) button.textContent = actionLabel(action);
				}
				chatInput.placeholder = TL_T("pet.chat.placeholder");
				chatInput.setAttribute("aria-label", TL_T("pet.chat.placeholder"));
				chatSend.textContent = TL_T("pet.chat.send");
				if (chatStatusKey !== "") chatStatus.textContent = TL_T(chatStatusKey);
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
				if (event.target instanceof HTMLElement && event.target.closest("[data-tl-catmenu], [data-tl-catchat]") !== null) return;
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
						if (!sleeping && !menuOpen && Math.random() < 0.34) say(pick(LINES.near), 2200);
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
				if (dragging || menuOpen) return;
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
			};
			window.addEventListener("resize", onResize);

			const onDocumentPointerDown = (event) => {
				if (!menuOpen) return;
				const target = event.target;
				if (target instanceof Node && root.contains(target)) return;
				closeMenu();
			};
			document.addEventListener("pointerdown", onDocumentPointerDown, true);

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

