		//#region selector bridge
		/**
		 * Upgrade-proof selector bridge.
		 *
		 * The stylesheet never names a DSH build hash. This bridge finds the host
		 * surfaces through STABLE hooks instead:
		 *   - the DSH Slot contract (`data-slot="sidebar"` / `data-slot="conversation.input.model"`)
		 *     for the column and the model picker;
		 *   - `data-*` attributes the product ships for its own layout
		 *     (`data-composer-card`, `data-sidebar-collapsed`, `data-message-bubble`,
		 *     `data-trigger-menu`), which do not change between builds; and
		 *   - CSS-module class-name SEGMENTS (`bubble`, `menu`, `panel`, `trigger`,
		 *     `triggerLabel`, `triggerEffort`). A module class is either `hash_name`
		 *     (legacy) or `_name_hash_line` (0.2.1+), so a segment is matched exactly
		 *     inside an underscore-separated token: `_bubble_ab_1` matches bubble,
		 *     `_bubbleItem_ab_1` and `_menuAnchor_ab_1` do not.
		 *
		 * Two rules keep the stamped set small and cheap:
		 *   1. Only the OUTERMOST node of a nested surface is stamped. Stamping every
		 *      `_bubble` wrapper painted N translucent layers where the product has
		 *      one bubble, which is the "duplicate stacked UI" defect.
		 *   2. A node that is not a real surface is never stamped (menu anchors, icon
		 *      spans and label spans are excluded by the segment rule above).
		 *
		 * Upgrade contract: `tools/hook-scan.mjs` reports a missing hook BEFORE a DSH
		 * upgrade ships; extend this bridge there instead of hardcoding a new hash.
		 */
		function installSelectorBridge() {
			const STAMPED_ATTRS = [
				"data-tl-sidebar",
				"data-tl-sidebar-col",
				"data-tl-settings",
				"data-tl-composer",
				"data-tl-model",
				"data-tl-model-label",
				"data-tl-model-effort",
				"data-tl-bubble",
				"data-tl-menu",
			];
			const stamped = new Set();

			/** Attribute value (`class` works for SVG too), split into class tokens. */
			const classTokens = (node) => {
				const raw = typeof node.getAttribute === "function" ? node.getAttribute("class") : null;
				return typeof raw === "string" && raw !== "" ? raw.split(/\s+/) : [];
			};
			/**
			 * True when one class token contains `name` as a whole underscore segment.
			 * Legacy `hash_name`, current `_name_hash_line` and plain `name` all match;
			 * `nameExtra` / `otherName` do not.
			 */
			const hasSegment = (node, name) =>
				classTokens(node).some((token) => token.split("_").includes(name));

			const mark = (node, attr) => {
				if (node === null || node === undefined) return;
				// Always own the node in the cleanup set: a node that already carries the
				// attribute (stamped by a previous instance) must still be cleared when
				// this instance is disposed, or the attribute leaks forever.
				stamped.add(node);
				if (node.getAttribute(attr) !== "") node.setAttribute(attr, "");
			};

			/** Drop every node that has a candidate ancestor — keep only the outermost. */
			const outermost = (nodes) => {
				const set = new Set(nodes);
				return nodes.filter((node) => {
					for (let parent = node.parentElement; parent !== null; parent = parent.parentElement) {
						if (set.has(parent)) return false;
					}
					return true;
				});
			};

			// Defense in depth: a themed surface must never be a huge layout container.
			// 2026-10-30 regression: an over-broad selector stamped the whole right-side
			// panel body and painted it with the opaque panel fill (giant dark block).
			const isOversized = (node) => {
				const rect = node.getBoundingClientRect();
				return rect.width * rect.height > globalThis.innerWidth * globalThis.innerHeight * 0.5;
			};

			const stampAll = () => {
				// ---- left column + sidebar shell ----
				// The slot marker is the public layout contract; the product data attribute
				// is the shell root that paints the sidebar background.
				const sidebarSlot = document.querySelector('[data-slot="sidebar"]');
				if (sidebarSlot !== null) mark(sidebarSlot, "data-tl-sidebar-col");
				for (const node of document.querySelectorAll("[data-sidebar-collapsed]")) {
					mark(node, "data-tl-sidebar");
				}
				// Fallback for a build that renames the column class but keeps the suffix.
				for (const node of document.querySelectorAll("[class*='_sidebarCol']")) {
					mark(node, "data-tl-sidebar-col");
				}

				// ---- composer card ----
				// Stable product data attribute first; the suffix fallback only runs when it
				// is absent, and only stamps the outermost card that actually owns an editor.
				const composerCards = [...document.querySelectorAll("[data-composer-card]")];
				for (const node of composerCards) mark(node, "data-tl-composer");
				if (composerCards.length === 0) {
					const candidates = [...document.querySelectorAll("[class*='_card']")].filter(
						(node) =>
							hasSegment(node, "card") &&
							node.querySelector("[contenteditable='true'], textarea") !== null &&
							isOversized(node) === false,
					);
					for (const node of outermost(candidates)) mark(node, "data-tl-composer");
				}

				// ---- model picker inside the composer's model slot ----
				// Scoping by the slot keeps the permission selector and the mic button out of
				// the pill treatment; the segment rule keeps icon/label spans untouched.
				const modelScope =
					document.querySelector('[data-slot="conversation.input.model"]') ??
					document.querySelector("[data-tl-composer]");
				if (modelScope !== null) {
					for (const node of modelScope.querySelectorAll("[class*='_trigger']")) {
						if (hasSegment(node, "trigger")) mark(node, "data-tl-model");
						else if (hasSegment(node, "triggerLabel")) mark(node, "data-tl-model-label");
						else if (hasSegment(node, "triggerEffort")) mark(node, "data-tl-model-effort");
					}
				}

				// ---- settings page surfaces ----
				// Only the LEGACY `_panel`-inside-`_mask` shape is stamped.
				// 2026-10-30 regression: on newer DSH the settings UI renders inside the
				// right-side panel shell, so stamping `[data-sidebar-right-panel]`
				// surface/pane children (and `[data-dockkit-pane]`) painted the whole
				// 1281x1656 panel body with the opaque panel fill — a giant dark block
				// covering half the window. The product's own styling is correct there,
				// so those selectors are deliberately gone.
				for (const node of document.querySelectorAll("[class*='_panel']")) {
					if (hasSegment(node, "panel") === false) continue;
					const parent = node.parentElement;
					if (
						parent !== null &&
						hasSegment(parent, "mask") &&
						isOversized(node) === false
					) {
						mark(node, "data-tl-settings");
					}
				}

				// ---- conversation bubbles and floating menus ----
				// `data-message-bubble` is the 0.2.2-alpha primitives hook; the `bubble`
				// segment keeps 0.2.1.x working. Only the outermost bubble is stained:
				// a transcript bubble nests a wrapper, a content box and sometimes an
				// avatar row, and each extra layer re-painted the same glass.
				const bubbleCandidates = [...document.querySelectorAll("[class*='_bubble'], [data-message-bubble]")].filter(
					(node) => node.hasAttribute("data-message-bubble") || hasSegment(node, "bubble"),
				);
				for (const node of outermost(bubbleCandidates)) mark(node, "data-tl-bubble");

				// Same for popovers: the menu anchor root and every menu row also carry a
				// `_menu*` class, but only the floating surface earns the glass panel.
				const menuCandidates = [...document.querySelectorAll("[class*='_menu'], [data-trigger-menu]")].filter(
					(node) => node.hasAttribute("data-trigger-menu") || hasSegment(node, "menu"),
				);
				for (const node of outermost(menuCandidates)) mark(node, "data-tl-menu");
			};

			// Debounced to one pass per frame: the app mutates constantly.
			let queued = 0;
			const schedule = () => {
				if (queued !== 0) return;
				queued = globalThis.requestAnimationFrame(() => {
					queued = 0;
					try {
						stampAll();
					} catch {
						// a DOM shape the bridge does not recognise must never break the page
					}
				});
			};

			stampAll();
			const observer = new MutationObserver(schedule);
			observer.observe(document.body, { childList: true, subtree: true });

			return () => {
				observer.disconnect();
				if (queued !== 0) globalThis.cancelAnimationFrame(queued);
				for (const node of stamped) {
					for (const attr of STAMPED_ATTRS) node.removeAttribute(attr);
				}
				stamped.clear();
			};
		}

		/**
		 * Feature-detect which stable hooks THIS running DSH build actually renders.
		 *
		 * The bridge is layered (slot markers → product `data-*` → class-name segments),
		 * and each DSH line 0.2.0 / 0.2.1 / 0.2.2 prefers a different layer: 0.2.0 and
		 * 0.2.2 web DOM have `data-slot` + product data attributes but no
		 * `data-sidebar-collapsed`; 0.2.1 has the collapsed marker. The result is exposed
		 * for support (`__dshTianlightInstance.features`) so a "skin looks unstyled on my
		 * build" report can be answered from the console in one line, and so the
		 * multi-version verification lab can assert the expected layer per runtime.
		 */
		function detectDshFeatures() {
			const has = (selector) => document.querySelector(selector) !== null;
			// Class naming: legacy `hash_name` vs 0.2.1+ `_name_hash_line`. A sample node
			// that carries a known suffix is enough; the CSS never depends on this value.
			const sample = document.querySelector("[class*='_card'], [class*='_bubble'], [class*='_panel']");
			const classSample = sample === null ? "" : String(sample.getAttribute("class") ?? "");
			const naming =
				/(?:^|\s)_[A-Za-z0-9]+_[A-Za-z0-9]+_\d+/.test(classSample)
					? "name_hash_line"
					: /(?:^|\s)[A-Za-z0-9-]+_[a-z][A-Za-z0-9]*/.test(classSample)
						? "hash_name"
						: "unknown";
			return {
				slotMarkers: has("[data-slot]"),
				modelSlot: has('[data-slot="conversation.input.model"]'),
				composerCard: has("[data-composer-card]"),
				sidebarCollapsed: has("[data-sidebar-collapsed]"),
				triggerMenu: has("[data-trigger-menu]"),
				messageBubble: has("[data-message-bubble]"),
				classNaming: naming,
				desktopChrome: document.documentElement.hasAttribute("data-windows-titlebar"),
			};
		}
		//#endregion
