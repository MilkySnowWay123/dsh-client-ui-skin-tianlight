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
		 * Two passes share the work, because the app mutates on almost every frame
		 * while a reply streams:
		 *   - incremental: a MutationObserver callback only collects `addedNodes` and
		 *     stamps those subtrees (one bounded query, coalesced to one pass per
		 *     animation frame). New bubbles/buttons/menus keep their glass immediately;
		 *   - fallback: a full `stampAll()` would re-scan the document, so it is kept
		 *     only as a >= 500 ms throttled sweep (and as the owner of the isConnected
		 *     cleanup of detached nodes). It can no longer run once per mutation.
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
				"data-tl-new-chat",
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
			/** Attribute presence that also tolerates the verifier's minimal fake DOM. */
			const hasAttr = (node, name) => typeof node.hasAttribute === "function" && node.hasAttribute(name);
			const attrValue = (node, name) => (typeof node.getAttribute === "function" ? node.getAttribute(name) : null);
			/** Substring class match, mirroring the `[class*='...']` hooks in tools/hooks.mjs. */
			const hasClassSubstring = (node, text) => classTokens(node).some((token) => token.includes(text));

			const mark = (node, attr) => {
				if (node === null || node === undefined) return;
				// Always own the node in the cleanup set: a node that already carries the
				// attribute (stamped by a previous instance) must still be cleared when
				// this instance is disposed, or the attribute leaks forever.
				stamped.add(node);
				if (node.getAttribute(attr) !== "") node.setAttribute(attr, "");
			};

			/**
			 * Stamp only the outermost node of a nesting family. Both passes call this,
			 * so "stamp the wrapper, not every nested node" is one rule instead of one
			 * filter per pass.
			 */
			const markOutermost = (node, attr) => {
				// v1.6.1: tolerate a fake DOM (verifier) that has no parentElement.
				for (let parent = node.parentElement; parent !== null && parent !== undefined; parent = parent.parentElement) {
					if (hasAttr(parent, attr)) return;
				}
				mark(node, attr);
			};

			// Defense in depth: a themed surface must never be a huge layout container.
			// 2026-10-30 regression: an over-broad selector stamped the whole right-side
			// panel body and painted it with the opaque panel fill (giant dark block).
			// v1.6.1: a fake DOM (verifier) may not implement layout, so an unmeasurable
			// node is treated as "not oversized" instead of throwing the whole pass away.
			const isOversized = (node) => {
				try {
					const rect = node.getBoundingClientRect();
					return rect.width * rect.height > globalThis.innerWidth * globalThis.innerHeight * 0.5;
				} catch {
					return false;
				}
			};

			// ---- shared surface predicates ------------------------------------------
			// The full pass and the incremental pass classify through the same functions,
			// so a surface can never be "glass in the full pass, bare in the added-node
			// pass" — a new bubble without glass is the visible version of that bug.
			const isBubbleNode = (node) => hasAttr(node, "data-message-bubble") || hasSegment(node, "bubble");
			const isMenuNode = (node) => hasAttr(node, "data-trigger-menu") || hasSegment(node, "menu");
			const isComposerFallback = (node) =>
				hasSegment(node, "card") &&
				node.querySelector("[contenteditable='true'], textarea") !== null &&
				isOversized(node) === false;
			// Only the LEGACY `_panel`-inside-`_mask` shape is stamped. On newer DSH the
			// settings UI renders inside the right-side panel shell, and stamping those
			// container bodies painted a giant dark block covering half the window
			// (2026-10-30 regression), so those selectors are deliberately gone.
			const isSettingsPanel = (node) => {
				if (hasSegment(node, "panel") === false) return false;
				const parent = node.parentElement;
				return parent !== null && parent !== undefined && hasSegment(parent, "mask") && isOversized(node) === false;
			};
			// Sidebar "new chat" button (expanded sidebar + collapsed titlebar rail):
			// the product paints it with its own elevated-button fill
			// (`--dsw-alias-button-elevated-fill`), which the skin does not own, so the
			// button stayed an opaque block on a 100% wallpaper interface. The wide button
			// and the collapsed 28-36px rail variant carry the same module class.
			const isNewChatNode = (node) => {
				if (String(node.tagName).toUpperCase() !== "BUTTON" || hasSegment(node, "newSession") === false) return false;
				return isOversized(node) === false;
			};
			// The slot marker is the public layout contract; the product data attribute is
			// the shell root that paints the sidebar background.
			const isSidebarSlot = (node) => attrValue(node, "data-slot") === "sidebar";

			/**
			 * One classification pass over a node; the caller owns the node set (the whole
			 * document, or only the subtree that was just inserted). `modelScope` mirrors
			 * the historical scoping of the model pill: the model Slot when present, else
			 * the composer card.
			 */
			const stampSurface = (node, modelScope, hasComposerCard) => {
				if (isSidebarSlot(node)) mark(node, "data-tl-sidebar-col");
				if (hasAttr(node, "data-sidebar-collapsed")) mark(node, "data-tl-sidebar");
				// Fallback for a build that renames the column class but keeps the suffix.
				// This one is a deliberate substring fallback, not a segment match: the
				// historical `[class*='_sidebarCol']` hook only keeps the suffix stable.
				if (hasClassSubstring(node, "_sidebarCol")) mark(node, "data-tl-sidebar-col");
				// Composer card: stable product data attribute first; the suffix fallback
				// only runs when no stable attribute exists in the document, and only for
				// the outermost card that actually owns an editor.
				if (hasAttr(node, "data-composer-card")) mark(node, "data-tl-composer");
				else if (hasComposerCard === false && isComposerFallback(node)) markOutermost(node, "data-tl-composer");
				// Model picker triggers stay scoped to the model slot / composer so the
				// permission selector and the mic button never get the pill treatment.
				if (hasSegment(node, "trigger") || hasSegment(node, "triggerLabel") || hasSegment(node, "triggerEffort")) {
					if (modelScope !== null && typeof modelScope.contains === "function" && modelScope.contains(node)) {
						if (hasSegment(node, "trigger")) mark(node, "data-tl-model");
						else if (hasSegment(node, "triggerLabel")) mark(node, "data-tl-model-label");
						else if (hasSegment(node, "triggerEffort")) mark(node, "data-tl-model-effort");
					}
				}
				if (isSettingsPanel(node)) mark(node, "data-tl-settings");
				// Conversation bubbles and floating menus: the product reuses `_menu*` /
				// `_bubble*` classes on rows and anchors too, so the segment rule + the
				// outermost rule keep exactly one surface themed per family.
				if (isBubbleNode(node)) markOutermost(node, "data-tl-bubble");
				if (isMenuNode(node)) markOutermost(node, "data-tl-menu");
				if (isNewChatNode(node)) markOutermost(node, "data-tl-new-chat");
			};

			// Every DOM hook in one expression. The full pass queries it once against the
			// document; the incremental pass queries it only inside an added node's
			// subtree, so a streaming transcript never scans the page.
			const SURFACE_SELECTOR = [
				'[data-slot="sidebar"]',
				"[data-sidebar-collapsed]",
				"[data-composer-card]",
				"[data-message-bubble]",
				"[data-trigger-menu]",
				"[class*='_sidebarCol']",
				"[class*='_card']",
				"[class*='_trigger']",
				"[class*='_panel']",
				"[class*='_bubble']",
				"[class*='_menu']",
				"[class*='_newSession']",
			].join(", ");

			// Scope for the model pill: the model Slot when the build has it, else the
			// composer card (stable product hook first, then a card stamped on an earlier
			// pass). Read before the stamps of the same pass, so the data attributes are
			// the reliable source inside a single sweep.
			const readModelScope = () =>
				document.querySelector('[data-slot="conversation.input.model"]') ??
				document.querySelector("[data-composer-card]") ??
				document.querySelector("[data-tl-composer]");

			const stampAll = () => {
				// A long streaming session mounts and unmounts many bubbles/surfaces. The
				// cleanup set must not pin detached subtrees forever: drop nodes the page
				// has already removed before each pass (isConnected is the cheap check).
				for (const node of stamped) {
					if (node.isConnected === false) stamped.delete(node);
				}
				const scope = readModelScope();
				const hasComposerCard = document.querySelector("[data-composer-card]") !== null;
				for (const node of document.querySelectorAll(SURFACE_SELECTOR)) stampSurface(node, scope, hasComposerCard);
			};

			// ---- incremental pass: stamp ONLY the added subtree ----------------------
			// The app mutates constantly and the transcript mutates on almost every frame
			// while a reply streams. Coalescing added nodes into one rAF pass keeps a new
			// bubble/menu/button glassed immediately at zero document-scan cost.
			const FULL_SCAN_INTERVAL_MS = 500;
			const pendingRoots = [];
			let frame = 0;
			let fullTimer = 0;
			let lastFullAt = Date.now();
			let sweepPending = false;

			const flushAdded = () => {
				frame = 0;
				if (pendingRoots.length === 0) return;
				const scope = readModelScope();
				const hasComposerCard = document.querySelector("[data-composer-card]") !== null;
				for (const root of pendingRoots.splice(0)) {
					try {
						if (root.nodeType !== 1) continue;
						// The added node first, then its subtree: one bounded query, never the
						// whole document. A React re-render often adds a wrapper whose inner
						// bubble/menu is the surface that actually needs the glass.
						stampSurface(root, scope, hasComposerCard);
						for (const node of root.querySelectorAll(SURFACE_SELECTOR)) stampSurface(node, scope, hasComposerCard);
					} catch {
						// a DOM shape the bridge does not recognise must never break the page
					}
				}
			};

			const runFullScan = () => {
				fullTimer = 0;
				sweepPending = false;
				lastFullAt = Date.now();
				try {
					stampAll();
				} catch {
					// a DOM shape the bridge does not recognise must never break the page
				}
			};

			// Throttle, not debounce: at most one full pass per 500 ms even while the app
			// mutates every frame. The incremental pass is coalesced to one rAF per frame,
			// and the two passes never run in the same frame by construction.
			const scheduleFullScan = () => {
				if (fullTimer !== 0) return;
				const wait = Math.max(0, FULL_SCAN_INTERVAL_MS - (Date.now() - lastFullAt));
				fullTimer = globalThis.setTimeout(runFullScan, wait);
			};

			const onMutations = (records) => {
				// R8 (REV-R2 M1): in a hidden tab rAF/full passes cannot run usefully, so
				// collecting every added node would grow pendingRoots without bound. Only
				// remember that a merged sweep is due; fetching data on show is handled by
				// the app itself, the bridge only needs to re-stamp what is now in the DOM.
				const hidden = typeof document !== "undefined" && document !== null && document.hidden === true;
				let added = false;
				for (const record of records) {
					if (hidden === false) {
						// Only added nodes are stamped here. Text nodes are ignored: they never
						// need a surface attribute, and streaming tokens are mostly text.
						for (const node of record.addedNodes) {
							if (node.nodeType !== 1) continue;
							pendingRoots.push(node);
							added = true;
						}
					}
					// The throttled full pass owns the isConnected sweep; walking the whole
					// stamped set on every removal would bring the per-frame cost back.
					if (record.removedNodes.length > 0) sweepPending = true;
				}
				if (hidden === true) {
					sweepPending = true;
					return;
				}
				// Hard cap for a very long foreground burst: the full pass below covers the
				// dropped nodes, so memory stays bounded even if rAF is starved.
				if (pendingRoots.length > 2000) {
					pendingRoots.length = 0;
					sweepPending = true;
				}
				if (added) {
					if (frame === 0) frame = globalThis.requestAnimationFrame(flushAdded);
					// Added surfaces are stamped incrementally; the full pass is the slow
					// fallback for structural changes the incremental pass cannot see (a
					// class mutated on an already-mounted node, an older build's hook).
					scheduleFullScan();
				} else if (sweepPending) {
					scheduleFullScan();
				}
			};

			/**
			 * R8 (REV-R2 M1): coming back to a visible tab runs ONE merged pass for all the
			 * DOM that accumulated while hidden. The 500ms full-scan throttle still applies,
			 * so a tab-switch storm cannot turn into a scan storm.
			 */
			const onVisibilityChange = () => {
				if (typeof document !== "undefined" && document !== null && document.hidden === true) return;
				sweepPending = true;
				if (frame !== 0) {
					globalThis.cancelAnimationFrame(frame);
					frame = 0;
				}
				flushAdded();
				scheduleFullScan();
			};

			stampAll();
			const observer = new MutationObserver(onMutations);
			observer.observe(document.body, { childList: true, subtree: true });
			document.addEventListener("visibilitychange", onVisibilityChange);

			return () => {
				observer.disconnect();
				document.removeEventListener("visibilitychange", onVisibilityChange);
				if (frame !== 0) globalThis.cancelAnimationFrame(frame);
				frame = 0;
				if (fullTimer !== 0) globalThis.clearTimeout(fullTimer);
				fullTimer = 0;
				pendingRoots.length = 0;
				sweepPending = false;
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
