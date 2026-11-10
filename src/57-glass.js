		//#region glass opacity
		/**
		 * One multiplier for every glass surface. 1 = the designed look; below makes
		 * surfaces more see-through, above makes them more solid. Expressed as a
		 * multiplier rather than an absolute alpha so light and dark keep their own
		 * base values.
		 */
		const GLASS_KEY = "tianlight.glass";
		let glassController = null;

		function readGlass() {
			try {
				const raw = Number(globalThis.localStorage.getItem(GLASS_KEY));
				if (Number.isFinite(raw) && raw > 0) return Math.min(1.5, Math.max(0.35, raw));
			} catch {
				// storage may be blocked
			}
			return 1;
		}

		function applyGlass(multiplier) {
			const body = document.body;
			if (body === null) return;
			body.style.setProperty("--tl-glass-m", String(Math.min(1.5, Math.max(0.35, multiplier))));
		}

		function installGlassOpacity() {
			let level = readGlass();
			applyGlass(level);
			glassController = {
				read: () => level,
				apply: (next) => {
					level = Math.min(1.5, Math.max(0.35, Number(next) || 1));
					applyGlass(level);
					try {
						globalThis.localStorage.setItem(GLASS_KEY, String(level));
					} catch {
						// persistence is optional
					}
				},
			};
			return () => {
				glassController = null;
				const body = document.body;
				if (body !== null) body.style.removeProperty("--tl-glass-m");
			};
		}

		// ---- v1.0.0 liquid-glass depth: off / frosted / soft / real ----
		/**
		 * The depth is a semantic preset over the scene layer: `off` keeps the v0.7
		 * look (no extra compositing), the three on-levels add a specular + blur
		 * treatment between the wallpaper and the product UI (the `[data-tl-scene]`
		 * layer, painted by the stylesheet ::after). The effective level degrades
		 * automatically under low power / 15fps so the energy promise holds.
		 * v1.6.0: when the scene layer is absent (wallpaper module off) a fixed
		 * data-tl-liquid-fallback node paints the same depth recipe; it is created and
		 * removed by syncLiquidFallback() below and is never inserted while low power
		 * has flattened the effect.
		 */
		const GLASS_DEPTH_KEY = "tianlight.glassDepth";
		const GLASS_DEPTHS = ["off", "frosted", "soft", "real"];
		const GLASS_DEPTH_DEFAULT = "soft";
		let glassDepthController = null;

		function readGlassDepth() {
			try {
				const raw = globalThis.localStorage.getItem(GLASS_DEPTH_KEY);
				if (GLASS_DEPTHS.includes(raw)) return raw;
			} catch {
				// storage may be blocked
			}
			return GLASS_DEPTH_DEFAULT;
		}

		function effectiveGlassDepth(depth) {
			if (depth === "off") return "off";
			try {
				if (readRenderTier() === "15") return "soft";
				if (document.body !== null && document.body.hasAttribute("data-tl-lowpower")) return depth === "real" ? "soft" : depth;
			} catch {
				// degrade silently
			}
			return depth;
		}

		function applyGlassDepth(depth) {
			const body = document.body;
			if (body === null) return "off";
			const effective = effectiveGlassDepth(depth);
			body.setAttribute("data-tl-glass-depth", depth);
			body.setAttribute("data-tl-glass-effective", effective);
			return effective;
		}

		// ---- v1.6.0: scene-less liquid-glass fallback ----
		/**
		 * The depth recipe normally rides on the wallpaper scene layer. The wallpaper
		 * module is optional and its scene can be torn down, and without it a non-off
		 * depth would look like "nothing happened". The stylesheet therefore also paints
		 * a fixed data-tl-liquid-fallback layer; this installer owns only that node's
		 * lifetime. There is exactly one node, it is a direct child of body, and it is
		 * pointless (and would cost a full-viewport compositing layer) while the scene
		 * exists or while low power has flattened the effect.
		 */
		function liquidFallbackWanted(effective) {
			if (effective === "off") return false;
			const body = document.body;
			if (body === null) return false;
			if (body.hasAttribute("data-tl-lowpower")) return false;
			// installScene() injects the scene as body.firstChild; a direct query is enough
			// and avoids the scene-must-be-a-descendant assumption.
			return body.querySelector("[data-tl-scene]") === null;
		}

		/** Idempotent: create / keep / remove the single fallback node for this depth. */
		function syncLiquidFallback(effective) {
			const body = document.body;
			if (body === null) return;
			const existing = document.querySelector("[data-tl-liquid-fallback]");
			if (liquidFallbackWanted(effective)) {
				if (existing !== null) return;
				const node = document.createElement("div");
				node.setAttribute("data-tl-liquid-fallback", "");
				node.setAttribute("aria-hidden", "true");
				body.insertBefore(node, body.firstChild);
				return;
			}
			if (existing !== null) existing.remove();
		}

		function installGlassDepth() {
			let depth = readGlassDepth();
			let effective = applyGlassDepth(depth);
			syncLiquidFallback(effective);
			glassDepthController = {
				read: () => depth,
				effective: () => effective,
				levels: () => [...GLASS_DEPTHS],
				apply: (next) => {
					depth = GLASS_DEPTHS.includes(next) ? next : GLASS_DEPTH_DEFAULT;
					effective = applyGlassDepth(depth);
					syncLiquidFallback(effective);
					try {
						globalThis.localStorage.setItem(GLASS_DEPTH_KEY, depth);
					} catch {
						// persistence is optional
					}
					return { depth, effective };
				},
				refresh: () => {
					effective = applyGlassDepth(depth);
					syncLiquidFallback(effective);
					return effective;
				},
			};
			let observer = null;
			try {
				observer = new MutationObserver(() => {
					const next = effectiveGlassDepth(depth);
					if (next !== effective) effective = applyGlassDepth(depth);
					// childList only (no deep observation): the scene is injected/removed as a
					// direct body child, and watching descendants would fire on every streaming
					// token of the transcript. The call is cheap and syncLiquidFallback is a
					// no-op when the wanted state has not changed. Observing the attributes as
					// well keeps the low-power transition in the same callback.
					syncLiquidFallback(effective);
				});
				observer.observe(document.body, {
					attributes: true,
					attributeFilter: ["data-tl-lowpower", "data-tl-lowpower-reason"],
					childList: true,
				});
			} catch (error) {
				note("glass-depth:observer", error);
			}
			return () => {
				glassDepthController = null;
				try {
					observer?.disconnect();
				} catch (error) {
					note("glass-depth:disconnect", error);
				}
				const fallback = document.querySelector("[data-tl-liquid-fallback]");
				if (fallback !== null) fallback.remove();
				const body = document.body;
				if (body !== null) {
					body.removeAttribute("data-tl-glass-depth");
					body.removeAttribute("data-tl-glass-effective");
				}
			};
		}
		//#endregion

