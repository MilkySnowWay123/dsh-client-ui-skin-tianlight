		//#region companion
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
		//#endregion
