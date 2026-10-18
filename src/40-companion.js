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

		const LINES = {
			near: ["喵？", "你靠得好近…", "（歪头）", "薄荷味的风？"],
			pet: ["呼噜呼噜…", "再摸摸嘛～", "唔…舒服", "耳朵不可以揪啦"],
			feed: ["是小鱼干！", "薄荷味儿的最好吃", "还想再来一条"],
			play: ["逗猫棒！接住！", "啪！抓住了", "再来一次！"],
			nap: ["zzZ…", "困了…", "先眯一会儿"],
			idle: ["……有点无聊", "看着窗外的云", "今天天光真好", "陪我待会儿？"],
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

		function saveState(value) {
			try {
				window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
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

			const root = document.createElement("div");
			root.dataset.tlCat = "";
			root.setAttribute("role", "button");
			root.setAttribute("tabindex", "0");
			root.setAttribute("aria-label", "薄荷小猫：可拖拽，点击打开互动菜单");

			const bubble = document.createElement("div");
			bubble.dataset.tlBubble = "";
			root.appendChild(bubble);

			const bodyWrap = document.createElement("div");
			bodyWrap.dataset.tlCatBody = "";
			const image = document.createElement("img");
			image.alt = "";
			image.draggable = false;
			// The hand-authored vector is the guaranteed baseline; real art replaces
			// it only once the host manifest confirms the file is installed.
			image.src = CAT_SVG;
			bodyWrap.appendChild(image);
			void resolveCompanionArt().then((source) => {
				if (source === null || !root.isConnected) return;
				image.addEventListener(
					"error",
					() => {
						image.src = CAT_SVG;
					},
					{ once: true },
				);
				image.src = source;
			});
			root.appendChild(bodyWrap);

			const menu = document.createElement("div");
			menu.dataset.tlMenu = "";
			const ACTIONS = [
				{ id: "pet", label: "摸摸", mood: 8 },
				{ id: "feed", label: "喂食", mood: 12 },
				{ id: "play", label: "逗猫棒", mood: 6 },
				{ id: "nap", label: "小睡", mood: 2 },
			];
			for (const action of ACTIONS) {
				const button = document.createElement("button");
				button.type = "button";
				button.dataset.tlAction = action.id;
				button.textContent = action.label;
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
			const say = (text, hold = 3200) => {
				bubble.textContent = text;
				bubble.dataset.tlShow = "";
				if (bubbleTimer !== 0) window.clearTimeout(bubbleTimer);
				bubbleTimer = window.setTimeout(() => {
					delete bubble.dataset.tlShow;
					bubbleTimer = 0;
				}, hold);
			};

			let sleeping = false;
			const wake = () => {
				if (!sleeping) return;
				sleeping = false;
				delete root.dataset.tlSleeping;
			};
			const doAction = (id) => {
				const action = ACTIONS.find((candidate) => candidate.id === id);
				if (action === undefined) return;
				if (id === "nap") {
					sleeping = true;
					root.dataset.tlSleeping = "";
					say(pick(LINES.nap));
				} else {
					wake();
					say(pick(LINES[id]));
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
				if (event.target instanceof HTMLElement && event.target.closest("[data-tl-menu]") !== null) return;
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

			menu.addEventListener("click", (event) => {
				const target = event.target;
				if (!(target instanceof HTMLElement)) return;
				const action = target.dataset.tlAction;
				if (action !== undefined) doAction(action);
			});

			// ---- proximity ----
			let near = false;
			let nearTimer = 0;
			const onProximity = (event) => {
				if (dragging) return;
				const centerX = state.x + PET_WIDTH / 2;
				const centerY = state.y + PET_HEIGHT / 2;
				const dx = event.clientX - centerX;
				const dy = event.clientY - centerY;
				const distance = Math.hypot(dx, dy);
				const isNear = distance < 190;
				root.style.setProperty("--tl-look", (Math.max(-1, Math.min(1, dx / 220))).toFixed(3));
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
			const idleTimer = window.setInterval(() => {
				if (document.hidden || dragging || menuOpen) return;
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

			later(() => say("喵～我来啦", 2600), 700);

			return () => {
				window.clearInterval(idleTimer);
				if (bubbleTimer !== 0) window.clearTimeout(bubbleTimer);
				if (nearTimer !== 0) window.clearTimeout(nearTimer);
				for (const id of timers) window.clearTimeout(id);
				timers.clear();
				window.removeEventListener("pointermove", onProximity);
				window.removeEventListener("resize", onResize);
				document.removeEventListener("pointerdown", onDocumentPointerDown, true);
				root.remove();
			};
		}
		//#endregion

