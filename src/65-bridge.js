		//#region selector bridge
		/**
		 * Upgrade-proof selector bridge.
		 *
		 * CSS-module hashes change on every DSH build, so a stylesheet that hardcodes
		 * them rots silently. This bridge finds the surfaces by STRUCTURE instead
		 * (`_card` containing a contenteditable, `_panel` inside a `_mask`, ...) and
		 * stamps them with attributes the skin owns. The stylesheet then has a stable
		 * target that survives any hash change.
		 *
		 * Stamper attributes are removed on dispose, so switching skins leaves no
		 * residue on the host application's DOM.
		 */
		function installSelectorBridge() {
			const stamped = new Set();
			const mark = (node, attr) => {
				if (node === null || node === undefined) return;
				if (node.getAttribute(attr) === "") return;
				node.setAttribute(attr, "");
				stamped.add(node);
			};

			const stampAll = () => {
				// Left column and session list: unique class suffixes.
				for (const node of document.querySelectorAll("[class*='_sidebarCol']")) mark(node, "data-tl-sidebar");
				for (const node of document.querySelectorAll("[class*='_sidebar']")) {
					if (node.getAttribute("data-tl-sidebar") === null && node.childElementCount > 0) mark(node, "data-tl-sidebar");
				}
				// Settings panel: a `_panel` whose parent is the `_mask` overlay.
				for (const node of document.querySelectorAll("[class*='_panel']")) {
					const parent = node.parentElement;
					if (parent !== null && parent.className.includes("_mask")) mark(node, "data-tl-settings");
				}
				// Composer: the `_card` that owns the rich-text input.
				for (const node of document.querySelectorAll("[class*='_card']")) {
					if (node.querySelector("[contenteditable='true']") !== null) mark(node, "data-tl-composer");
				}
				// Model trigger: a `_trigger` inside the stamped composer.
				const composer = document.querySelector("[data-tl-composer]");
				if (composer !== null) {
					for (const node of composer.querySelectorAll("[class*='_trigger']")) mark(node, "data-tl-model");
				}
				// Conversation surfaces and popovers.
				for (const node of document.querySelectorAll("[class*='_bubble']")) mark(node, "data-tl-bubble");
				for (const node of document.querySelectorAll("[class*='_menu']")) mark(node, "data-tl-menu");
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
					for (const attr of ["data-tl-sidebar", "data-tl-settings", "data-tl-composer", "data-tl-model", "data-tl-bubble", "data-tl-menu"]) {
						node.removeAttribute(attr);
					}
				}
				stamped.clear();
			};
		}
		//#endregion

