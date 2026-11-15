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
		 * look (no extra compositing), the three on-levels add a static specular +
		 * grain/tint treatment between the wallpaper and the product UI (the
		 * `[data-tl-scene]` layer, painted by the stylesheet ::after). The painting is
		 * deliberately static: the R2 energy pass removed the full-viewport live blur
		 * that used to re-composite on every video frame. The effective level degrades
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
		/**
		 * v2.2.0 "live" mode. The depth presets above are a STATIC veil: they look like
		 * glass but never sample the wallpaper behind them. Live mode is the explicit,
		 * opt-in reversal of the R2 energy decision: the known glass panels get a real
		 * backdrop-filter, so the compositor re-samples the (possibly playing) wallpaper
		 * on every frame and the panels become real glass. It is deliberately off by
		 * default and is flattened again by low power / the 15 fps tier, exactly like the
		 * depth presets. Persisted as "1"/"0" in the same localStorage mirror as
		 * `tianlight.glassDepth`; no host setting is involved.
		 */
		const GLASS_LIVE_KEY = "tianlight.glassLive";
		const GLASS_LENS_ID = "tl-glass-lens";
		let glassLiveLevel = false;
		let glassLensNode = null;

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

		function readGlassLive() {
			try {
				const raw = globalThis.localStorage.getItem(GLASS_LIVE_KEY);
				return raw === "1" || raw === "on" || raw === "true";
			} catch {
				// storage may be blocked
			}
			return false;
		}

		/**
		 * Live sampling obeys the same energy contract as the depth presets: low power
		 * (the body attribute owned by the low-power supervisor) or the 15 fps render
		 * tier turns the real backdrop-filter off without losing the user's preference.
		 */
		function effectiveGlassLive(live) {
			if (live !== true) return false;
			try {
				// Live is a modifier of a depth recipe, never a replacement for it: with
				// depth "off" there is no glass surface to sample, so it stays inert.
				const body = document.body;
				if (body === null || body.getAttribute("data-tl-glass-effective") === "off") return false;
				if (readRenderTier() === "15") return false;
				if (body.hasAttribute("data-tl-lowpower")) return false;
			} catch {
				// degrade silently
			}
			return true;
		}

		/**
		 * v2.2.2: the live glass uses an SVG displacement filter on the backdrop, so the
		 * wallpaper behind a panel is not just blurred 鈥?it is subtly bent like a lens.
		 * Chromium supports `backdrop-filter: url(#filter) ...` (verified in Edge/Chromium
		 * headless). The node is created only while live sampling is effective and is
		 * removed again otherwise, so the default path never carries the filter.
		 */
		/**
		 * A radial vector field: R/G encode the horizontal/vertical displacement, with
		 * zero offset in the centre and a strong outward bend near the rim. `feDisplacementMap`
		 * on the backdrop then behaves like a convex lens instead of a noisy warp.
		 * Generated at runtime so the package does not carry a big base64 blob.
		 */
		let glassLensMap = "";
		function lensMapDataUrl() {
			if (glassLensMap !== "") return glassLensMap;
			try {
				const size = 256;
				const canvas = document.createElement("canvas");
				canvas.width = size;
				canvas.height = size;
				const context = typeof canvas.getContext === "function" ? canvas.getContext("2d") : null;
				if (context === null) return "";
				const image = context.createImageData(size, size);
				const data = image.data;
				for (let y = 0; y < size; y += 1) {
					const ny = (y / (size - 1)) * 2 - 1;
					for (let x = 0; x < size; x += 1) {
						const nx = (x / (size - 1)) * 2 - 1;
						const radius = Math.min(1, Math.sqrt(nx * nx + ny * ny));
						const bend = Math.pow(radius, 2.2);
						const index = (y * size + x) * 4;
						data[index] = Math.max(0, Math.min(255, Math.round(128 + 127 * nx * bend)));
						data[index + 1] = Math.max(0, Math.min(255, Math.round(128 + 127 * ny * bend)));
						data[index + 2] = 128;
						data[index + 3] = 255;
					}
				}
				context.putImageData(image, 0, 0);
				glassLensMap = canvas.toDataURL("image/png");
				return glassLensMap;
			} catch (error) {
				note("glass:lens-map", error);
				return "";
			}
		}

		function ensureGlassLens() {
			try {
				if (glassLensNode !== null && glassLensNode.isConnected === true) return glassLensNode;
				const body = document.body;
				if (body === null) return null;
				const existing = document.getElementById(GLASS_LENS_ID);
				if (existing !== null) {
					glassLensNode = existing;
					return glassLensNode;
				}
				const map = lensMapDataUrl();
				if (map === "") return null;
				const ns = "http://www.w3.org/2000/svg";
				const svg = document.createElementNS(ns, "svg");
				svg.setAttribute("id", GLASS_LENS_ID);
				svg.setAttribute("aria-hidden", "true");
				svg.setAttribute("width", "0");
				svg.setAttribute("height", "0");
				svg.setAttribute("data-tl-glass-lens", "");
				svg.style.cssText = "position:fixed;width:0;height:0;overflow:hidden;pointer-events:none;";
				const defs = document.createElementNS(ns, "defs");
				const filter = document.createElementNS(ns, "filter");
				filter.setAttribute("id", "tl-glass-lens-filter");
				filter.setAttribute("x", "-10%");
				filter.setAttribute("y", "-10%");
				filter.setAttribute("width", "120%");
				filter.setAttribute("height", "120%");
				filter.setAttribute("color-interpolation-filters", "sRGB");
				const mapImage = document.createElementNS(ns, "feImage");
				mapImage.setAttribute("href", map);
				mapImage.setAttribute("x", "0");
				mapImage.setAttribute("y", "0");
				mapImage.setAttribute("width", "100%");
				mapImage.setAttribute("height", "100%");
				mapImage.setAttribute("preserveAspectRatio", "none");
				mapImage.setAttribute("result", "lensMap");
				const displace = document.createElementNS(ns, "feDisplacementMap");
				displace.setAttribute("in", "SourceGraphic");
				displace.setAttribute("in2", "lensMap");
				displace.setAttribute("scale", "56");
				displace.setAttribute("xChannelSelector", "R");
				displace.setAttribute("yChannelSelector", "G");
				filter.appendChild(mapImage);
				filter.appendChild(displace);
				defs.appendChild(filter);
				svg.appendChild(defs);
				body.appendChild(svg);
				glassLensNode = svg;
				return svg;
			} catch (error) {
				note("glass:lens", error);
				return null;
			}
		}

		function removeGlassLens() {
			try {
				if (glassLensNode !== null && glassLensNode.isConnected === true) glassLensNode.remove();
			} catch (error) {
				note("glass:lens-remove", error);
			}
			glassLensNode = null;
			try {
				const stale = document.getElementById(GLASS_LENS_ID);
				if (stale !== null) stale.remove();
			} catch {
				// nothing to remove
			}
		}

		/**
		 * Write the configured and effective live attributes. `off` keeps the stylesheet's
		 * default static veil; only `effective=on` adds any backdrop-filter, so a disabled
		 * or low-power live mode costs exactly what it cost before v2.2.0.
		 */
		function applyGlassLive(live) {
			const body = document.body;
			if (body === null) return false;
			glassLiveLevel = live === true;
			const effective = effectiveGlassLive(glassLiveLevel);
			// Install the lens BEFORE the attribute makes the stylesheet reference it.
			if (effective === true) {
				ensureGlassLens();
				let supported = false;
				try {
					// NB: `CSS` in this closure is the stylesheet string, not the CSSOM
					// namespace, so the feature probe must read globalThis.CSS.
					const cssom = globalThis.CSS;
					supported =
						cssom !== undefined &&
						cssom !== null &&
						typeof cssom.supports === "function" &&
						(cssom.supports("backdrop-filter", "url(#tl-glass-lens-filter)") ||
							cssom.supports("-webkit-backdrop-filter", "url(#tl-glass-lens-filter)"));
				} catch {
					supported = false;
				}
				body.setAttribute("data-tl-glass-lens-support", supported ? "1" : "0");
			} else {
				body.removeAttribute("data-tl-glass-lens-support");
				removeGlassLens();
			}
			body.setAttribute("data-tl-glass-live", glassLiveLevel ? "on" : "off");
			body.setAttribute("data-tl-glass-live-effective", effective ? "on" : "off");
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
		 * v1.6.1: the node's recipe is the liquid-glass v2 surface stack (tiled grain +
		 * cool tint + sheen + specular + rim/glow); the lifecycle itself is unchanged
		 * and the attribute stays a plain presence marker (the stylesheet owns the look).
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
			// v2.2.0: make the current render tier visible to the observer below, so a
			// later switch to 15fps immediately flattens live sampling without a reload.
			renderTierController.publish();
			let depth = readGlassDepth();
			glassLiveLevel = readGlassLive();
			// v2.2.2: a stored "live on + depth off" pair cannot render anything (live is
			// a modifier of a depth recipe). Older builds could leave that pair behind;
			// promote it to the soft recipe once, so the live switch does what it says.
			if (glassLiveLevel === true && depth === "off") {
				depth = "soft";
				try {
					globalThis.localStorage.setItem(GLASS_DEPTH_KEY, depth);
				} catch {
					// persistence is optional
				}
			}
			let effective = applyGlassDepth(depth);
			let liveEffective = applyGlassLive(glassLiveLevel);
			syncLiquidFallback(effective);
			glassDepthController = {
				read: () => depth,
				effective: () => effective,
				levels: () => [...GLASS_DEPTHS],
				live: () => glassLiveLevel,
				liveEffective: () => liveEffective,
				apply: (next) => {
					depth = GLASS_DEPTHS.includes(next) ? next : GLASS_DEPTH_DEFAULT;
					effective = applyGlassDepth(depth);
					liveEffective = applyGlassLive(glassLiveLevel);
					syncLiquidFallback(effective);
					try {
						globalThis.localStorage.setItem(GLASS_DEPTH_KEY, depth);
					} catch {
						// persistence is optional
					}
					return { depth, effective, live: glassLiveLevel, liveEffective };
				},
				/**
				 * v2.2.0: turn real-time sampling on/off. This never changes the depth by
				 * itself; the role hub combines the two controls so "live on" is only offered
				 * while a depth recipe exists. Returns the stored and effective state.
				 */
				setLive: (next) => {
					glassLiveLevel = next === true;
					liveEffective = applyGlassLive(glassLiveLevel);
					try {
						globalThis.localStorage.setItem(GLASS_LIVE_KEY, glassLiveLevel ? "1" : "0");
					} catch {
						// persistence is optional
					}
					return { live: glassLiveLevel, liveEffective };
				},
				refresh: () => {
					effective = applyGlassDepth(depth);
					liveEffective = applyGlassLive(glassLiveLevel);
					syncLiquidFallback(effective);
					return effective;
				},
			};
			let observer = null;
			try {
				observer = new MutationObserver(() => {
					const next = effectiveGlassDepth(depth);
					if (next !== effective) effective = applyGlassDepth(depth);
					// v2.2.0: a low-power / 15 fps transition must also switch the live
					// backdrop-filter off (or back on) without losing the stored preference.
					const nextLive = effectiveGlassLive(glassLiveLevel);
					if (nextLive !== liveEffective) liveEffective = applyGlassLive(glassLiveLevel);
					// childList only (no deep observation): the scene is injected/removed as a
					// direct body child, and watching descendants would fire on every streaming
					// token of the transcript. The call is cheap and syncLiquidFallback is a
					// no-op when the wanted state has not changed. Observing the attributes as
					// well keeps the low-power transition in the same callback.
					syncLiquidFallback(effective);
				});
				observer.observe(document.body, {
					attributes: true,
					attributeFilter: ["data-tl-lowpower", "data-tl-lowpower-reason", "data-tl-render-tier"],
					childList: true,
				});
			} catch (error) {
				note("glass-depth:observer", error);
			}
			return () => {
				glassDepthController = null;
				glassLiveLevel = false;
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
					body.removeAttribute("data-tl-glass-live");
					body.removeAttribute("data-tl-glass-live-effective");
					body.removeAttribute("data-tl-render-tier");
				}
				removeGlassLens();
			};
		}
		//#endregion

