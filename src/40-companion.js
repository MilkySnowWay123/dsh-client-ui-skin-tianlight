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
				{ id: "pet", labelKey: "pet.action.pet", mood: 8 },
				{ id: "feed", labelKey: "pet.action.feed", mood: 12 },
				{ id: "play", labelKey: "pet.action.play", mood: 6 },
				{ id: "nap", labelKey: "pet.action.nap", mood: 2 },
				// v1.0.0: the life-rhythm control surface lives on the pet itself. These
				// two carry no mood delta; doAction() routes them to the life engine.
				{ id: "mute", labelKey: "pet.action.mute" },
				{ id: "focus", labelKey: "pet.action.focus" },
			];
			for (const action of ACTIONS) {
				const button = document.createElement("button");
				button.type = "button";
				button.dataset.tlAction = action.id;
				button.textContent = TL_T(action.labelKey);
				menu.appendChild(button);
			}
			root.appendChild(menu);

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
			const say = (line, hold = 3200) => {
				bubbleKey = typeof line === "string" ? line : "";
				// v1.0.0: the life engine speaks through this same bubble with its own
				// `life.line.*` keys, so translate ANY key the dictionaries know. Duty
				// `speak` passes arbitrary user copy, which TL_T returns unchanged.
				const translated = TL_T(bubbleKey);
				bubble.textContent = translated !== bubbleKey ? translated : bubbleKey;
				bubble.dataset.tlShow = "";
				if (bubbleTimer !== 0) window.clearTimeout(bubbleTimer);
				bubbleTimer = window.setTimeout(() => {
					delete bubble.dataset.tlShow;
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

			// 语言切换（跟随 DSH 或手动）时刷新可读文案与正在显示的台词，不重建 DOM。
			const refreshCompanionLabels = () => {
				root.setAttribute("aria-label", TL_T("pet.aria"));
				for (const button of menu.querySelectorAll("[data-tl-action]")) {
					const action = ACTIONS.find((candidate) => candidate.id === button.dataset.tlAction);
					if (action !== undefined) button.textContent = TL_T(action.labelKey);
				}
				if (bubbleTimer !== 0 && bubbleKey !== "") bubble.textContent = TL_T(bubbleKey);
			};
			const unsubscribeI18n = subscribeTl5I18n(refreshCompanionLabels);
			refreshCompanionLabels();

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
					say(pick(LINES[id]));
					if (id === "pet" || id === "feed" || id === "play") noteInteraction(id === "pet" ? "pat" : id);
				}
				state.mood = Math.min(100, state.mood + action.mood);
				saveState(state);
				closeMenu();
			};

			let menuOpen = false;
			const openMenu = () => {
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
				if (event.target instanceof HTMLElement && event.target.closest("[data-tl-catmenu]") !== null) return;
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
					if (media !== null) applyMedia(media);
				} catch (error) {
					note("companion:media-late-read", error);
				}
			};
			if (typeof queueMicrotask === "function") queueMicrotask(tryApplyLateMedia);
			later(tryApplyLateMedia, 900);

			return () => {
				companionDutyBridge.api = null;
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
				document.removeEventListener("tianlight:pet-media", onPetMedia);
				root.removeEventListener("contextmenu", onContextMenu);
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

