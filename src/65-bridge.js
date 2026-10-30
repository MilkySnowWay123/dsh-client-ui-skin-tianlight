		//#region selector bridge
		/**
		 * Upgrade-proof selector bridge.
		 *
		 * The stylesheet never names a DSH build hash. This bridge finds the host
		 * surfaces through STABLE hooks instead:
		 *   - `data-*` attributes the product ships for its own layout
		 *     (`data-composer-card`, `data-sidebar-collapsed`, `data-sidebar-right-panel`,
		 *     `data-trigger-menu`), which do not change between builds; and
		 *   - CSS-module class-name SUFFIXES (`_sidebarCol`, `_card`, `_trigger`,
		 *     `_triggerLabel`, `_triggerEffort`, `_bubble`, `_menu`, `_panel`, `_mask`),
		 *     which stay stable while the hash prefix changes on every build.
		 *
		 * The stamping attributes are removed on dispose, so switching skins leaves no
		 * residue on the host application's DOM.
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
			const mark = (node, attr) => {
				if (node === null || node === undefined) return;
				if (node.getAttribute(attr) === "") return;
				node.setAttribute(attr, "");
				stamped.add(node);
			};

			// Defense in depth: a themed surface must never be a huge layout container.
			// 2026-10-30 regression: an over-broad selector stamped the whole right-side
			// panel body and painted it with the opaque panel fill (giant dark block).
			const isOversized = (node) => {
				const rect = node.getBoundingClientRect();
				return rect.width * rect.height > globalThis.innerWidth * globalThis.innerHeight * 0.5;
			};

			const stampAll = () => {
				// ---- left column + sidebar root: product-owned stable data attribute,
				//      with the `_sidebarCol` / `_sidebar` suffixes as fallback. ----
				for (const node of document.querySelectorAll("[data-sidebar-collapsed]")) {
					mark(node, "data-tl-sidebar");
				}
				for (const node of document.querySelectorAll("[class*='_sidebarCol']")) {
					mark(node, "data-tl-sidebar-col");
				}
				for (const node of document.querySelectorAll("[class*='_sidebar']")) {
					if (node.childElementCount > 0 && node.getAttribute("data-tl-sidebar") === null) {
						mark(node, "data-tl-sidebar");
					}
				}
				// ---- composer card: stable `data-composer-card`, or a `_card` that owns
				//      the rich-text input. ----
				for (const node of document.querySelectorAll("[data-composer-card]")) {
					mark(node, "data-tl-composer");
				}
				for (const node of document.querySelectorAll("[class*='_card']")) {
					if (
						node.querySelector("[contenteditable='true'], textarea") !== null &&
						node.getAttribute("data-tl-composer") === null
					) {
						mark(node, "data-tl-composer");
					}
				}
				// ---- model trigger and its two text parts, inside the composer ----
				const composer = document.querySelector("[data-tl-composer]");
				if (composer !== null) {
					for (const node of composer.querySelectorAll("[class*='_trigger']")) {
						mark(node, "data-tl-model");
					}
					for (const node of composer.querySelectorAll("[class*='_triggerLabel']")) {
						mark(node, "data-tl-model-label");
					}
					for (const node of composer.querySelectorAll("[class*='_triggerEffort']")) {
						mark(node, "data-tl-model-effort");
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
					const parent = node.parentElement;
					if (
						parent !== null &&
						typeof parent.className === "string" &&
						parent.className.includes("_mask") &&
						isOversized(node) === false
					) {
						mark(node, "data-tl-settings");
					}
				}
				// ---- conversation surfaces and popovers ----
				// `data-message-bubble` is the 0.2.2-alpha primitives hook; the
				// `_bubble` suffix keeps working on 0.2.1.x.
				for (const node of document.querySelectorAll("[class*='_bubble'], [data-message-bubble]")) {
					mark(node, "data-tl-bubble");
				}
				for (const node of document.querySelectorAll("[class*='_menu'], [data-trigger-menu]")) {
					mark(node, "data-tl-menu");
				}
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
		//#endregion
