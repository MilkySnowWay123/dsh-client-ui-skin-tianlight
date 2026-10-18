		//#region font panel
		const FONT_STORAGE = "tianlight.font.family";
		/** Empty stack means "inherit the product font": clearing the property is the
		 *  only way to restore it without knowing the original value. */
		const FONT_FAMILIES = [
			{ id: "system", label: "系统", stack: "" },
			{ id: "serif", label: "衬线", stack: 'Georgia, "Songti SC", "Noto Serif SC", serif' },
			{ id: "round", label: "圆体", stack: '"PingFang SC", "HarmonyOS Sans SC", "MiSans", "Segoe UI", sans-serif' },
			{ id: "mono", label: "等宽", stack: 'Consolas, "SF Mono", "JetBrains Mono", monospace' },
		];

		const CODE_FAMILIES = [
			{ id: "system", label: "默认", stack: "" },
			{ id: "mono", label: "Mono", stack: '"SF Mono", "JetBrains Mono", "Fira Code", Consolas, monospace' },
			{ id: "consolas", label: "Consolas", stack: 'Consolas, "Courier New", monospace' },
		];
		const WEIGHTS = [
			{ id: "normal", label: "常规", value: "" },
			{ id: "medium", label: "中等", value: "500" },
			{ id: "bold", label: "加粗", value: "600" },
		];
		const LEADS = [
			{ id: "tight", label: "紧凑", value: "1.45" },
			{ id: "normal", label: "标准", value: "" },
			{ id: "loose", label: "宽松", value: "1.85" },
		];
		const TRACKS = [
			{ id: "tight", label: "紧凑", value: "-0.012em" },
			{ id: "normal", label: "标准", value: "" },
			{ id: "loose", label: "宽松", value: "0.02em" },
		];
		const TYPO_DEFAULTS = { size: 14, ui: "system", code: "system", weight: "normal", lead: "normal", track: "normal" };

		/** Reads the persisted model. Tolerates the legacy plain-string value. */
		function readTypography() {
			const model = { ...TYPO_DEFAULTS };
			let raw = null;
			try {
				raw = globalThis.localStorage.getItem(FONT_STORAGE);
			} catch {
				return model;
			}
			if (raw === null || raw === "") return model;
			let saved = null;
			try {
				saved = JSON.parse(raw);
			} catch {
				saved = null;
			}
			if (saved === null || typeof saved !== "object") {
				// legacy format: just the family id
				if (FONT_FAMILIES.some((item) => item.id === raw)) model.ui = raw;
				return model;
			}
			if (Number.isFinite(saved.size)) model.size = Math.min(22, Math.max(12, Math.round(saved.size)));
			if (FONT_FAMILIES.some((item) => item.id === saved.ui)) model.ui = saved.ui;
			if (CODE_FAMILIES.some((item) => item.id === saved.code)) model.code = saved.code;
			if (WEIGHTS.some((item) => item.id === saved.weight)) model.weight = saved.weight;
			if (LEADS.some((item) => item.id === saved.lead)) model.lead = saved.lead;
			if (TRACKS.some((item) => item.id === saved.track)) model.track = saved.track;
			return model;
		}

		/**
		 * Undoes every inline style the panel wrote. Without this the chosen family and
		 * weight survive skin teardown: the CSS is scoped by the body attribute, an inline
		 * style is not, so the page would keep the font after the skin is switched off.
		 */
		function clearTypography() {
			const body = document.body;
			if (body !== null) {
				body.style.removeProperty("--dsw-font-family");
				body.style.removeProperty("--ds-font-family-code");
			}
			const root = document.getElementById("root");
			if (root !== null) {
				root.style.removeProperty("font-weight");
				root.style.removeProperty("line-height");
				root.style.removeProperty("letter-spacing");
			}
		}

		/**
		 * Applies the whole model. Families and size are real APIs (a CSS variable and
		 * theme.setFontSize); weight/leading/tracking are inline on #root with an empty
		 * string meaning "inherit", which restores the product values without knowing
		 * them. `theme` is optional so a missing service still leaves families working.
		 */
		function applyTypography(theme, model, persist) {
			const ui = FONT_FAMILIES.find((item) => item.id === model.ui) ?? FONT_FAMILIES[0];
			const code = CODE_FAMILIES.find((item) => item.id === model.code) ?? CODE_FAMILIES[0];
			const body = document.body;
			if (body !== null) {
				if (ui.stack === "") body.style.removeProperty("--dsw-font-family");
				else body.style.setProperty("--dsw-font-family", ui.stack);
				if (code.stack === "") body.style.removeProperty("--ds-font-family-code");
				else body.style.setProperty("--ds-font-family-code", code.stack);
			}
			const root = document.getElementById("root");
			if (root !== null) {
				root.style.fontWeight = (WEIGHTS.find((item) => item.id === model.weight) ?? WEIGHTS[0]).value;
				root.style.lineHeight = (LEADS.find((item) => item.id === model.lead) ?? LEADS[0]).value;
				root.style.letterSpacing = (TRACKS.find((item) => item.id === model.track) ?? TRACKS[0]).value;
			}
			if (theme !== undefined && typeof theme.setFontSize === "function") {
				try {
					theme.setFontSize(model.size);
				} catch {
					// the host may clamp or refuse; the stored value stays authoritative
				}
			}
			if (persist !== false) {
				try {
					globalThis.localStorage.setItem(FONT_STORAGE, JSON.stringify(model));
				} catch {
					// a failed write must never break the panel
				}
			}
		}

		/**
		 * Font settings, docked to the right edge and owned by the skin.
		 *
		 * The right-sidebar tab path was dropped deliberately: registering a tab type
		 * and opening it needs internal controller contracts whose shape is not part of
		 * any published API, and it silently opened nothing. This host has no such
		 * dependency — the trigger button toggles it, react-dom/client renders the same
		 * component into it, and disposing the effect removes the host entirely.
		 * A missing react-dom/client or theme service degrades to no panel, never to a
		 * broken skin: every step is guarded.
		 */
		function installFontPanel(ctx) {
			if (React === null || typeof ctx.inject !== "function") return () => {};
			const theme = ctx.get("theme");

			// Restore only what the user saved. Seeding size from theme.fontSize matters:
			// writing the default 14 over a product-level 16 would silently change the
			// host setting on every skin load.
			let stored = null;
			try {
				stored = globalThis.localStorage.getItem(FONT_STORAGE);
			} catch {
				stored = null;
			}
			const initial = readTypography();
			if (stored === null && theme !== undefined && typeof theme.fontSize === "number") {
				initial.size = Math.min(22, Math.max(12, Math.round(theme.fontSize)));
			}
			applyTypography(theme, initial, false);

			const FontPanel = (props) => {
				const [model, setModel] = React.useState(() => readTypography());
				const update = (patch) => {
					setModel((current) => {
						const next = { ...current, ...patch };
						applyTypography(theme, next, true);
						return next;
					});
				};
				const pills = (list, activeId, onPick) =>
					list.map((item) =>
						React.createElement(
							"button",
							{
								key: item.id,
								type: "button",
								className: "tl-font-option",
								"data-active": item.id === activeId ? "" : undefined,
								onClick: () => onPick(item.id),
							},
							item.label,
						),
					);
				const row = (label, content) =>
					React.createElement(
						"div",
						{ className: "tl-font-row" },
						React.createElement("span", { className: "tl-font-label" }, label),
						content,
					);
				const optionLabel = (list, id) => (list.find((item) => item.id === id) ?? list[0]).label;
				const section = (title, ...children) =>
					React.createElement(
						"div",
						{ className: "tl-font-section" },
						React.createElement("div", { className: "tl-font-section-title" }, title),
						...children,
					);
				// Progress is painted straight into the track gradient: range inputs expose
				// no ::-webkit-slider-progress, and an inline gradient needs no extra state
				// or custom property (which the audit would have to whitelist).
				const ratio = (((model.size - 12) / 10) * 100).toFixed(2);
				return React.createElement(
					"div",
					{ className: "tl-font-panel" },
					React.createElement(
						"div",
						{ className: "tl-font-head", "data-tl-font-drag": "" },
						React.createElement(
							"div",
							{ className: "tl-font-heading" },
							React.createElement("div", { className: "tl-font-title" }, "字体"),
							React.createElement(
								"div",
								{ className: "tl-font-subtitle" },
								model.size +
									"px · 界面 " +
									optionLabel(FONT_FAMILIES, model.ui) +
									" · 代码 " +
									optionLabel(CODE_FAMILIES, model.code),
							),
						),
						React.createElement(
							"button",
							{
								type: "button",
								className: "tl-font-close",
								"data-tl-font-close": "",
								"aria-label": "关闭字体面板",
								onClick: () => {
									if (props !== undefined && typeof props.onClose === "function") props.onClose();
								},
							},
							"\u00d7",
						),
					),
					React.createElement(
						"div",
						{ className: "tl-font-preview", style: { fontSize: model.size + "px" } },
						React.createElement("div", { className: "tl-font-preview-line" }, "夜色温柔 · Aa 0123"),
						React.createElement(
							"div",
							{ className: "tl-font-preview-note" },
							"字重 " +
								optionLabel(WEIGHTS, model.weight) +
								" · 行距 " +
								optionLabel(LEADS, model.lead) +
								" · 字距 " +
								optionLabel(TRACKS, model.track),
						),
					),
					section(
						"字号",
						row(
							"界面字号",
							React.createElement(
								"div",
								{ className: "tl-font-slider" },
								React.createElement("input", {
									type: "range",
									min: 12,
									max: 22,
									step: 1,
									value: model.size,
									className: "tl-font-range",
									"aria-label": "字号",
									style: {
										background:
											"linear-gradient(90deg, var(--tl-accent) 0%, color-mix(in srgb, var(--tl-accent) 45%, #ffffff) " +
											ratio +
											"%, rgba(255, 255, 255, 0.16) " +
											ratio +
											"%, rgba(255, 255, 255, 0.16) 100%)",
									},
									onChange: (event) => update({ size: Number(event.target.value) }),
								}),
								React.createElement("span", { className: "tl-font-value" }, model.size + " px"),
							),
						),
					),
					section(
						"字族",
						row(
							"界面",
							React.createElement(
								"div",
								{ className: "tl-font-options" },
								pills(FONT_FAMILIES, model.ui, (id) => update({ ui: id })),
							),
						),
						row(
							"代码",
							React.createElement(
								"div",
								{ className: "tl-font-options" },
								pills(CODE_FAMILIES, model.code, (id) => update({ code: id })),
							),
						),
					),
					section(
						"排版",
						row(
							"字重",
							React.createElement(
								"div",
								{ className: "tl-font-options" },
								pills(WEIGHTS, model.weight, (id) => update({ weight: id })),
							),
						),
						row(
							"行距",
							React.createElement(
								"div",
								{ className: "tl-font-options" },
								pills(LEADS, model.lead, (id) => update({ lead: id })),
							),
						),
						row(
							"字距",
							React.createElement(
								"div",
								{ className: "tl-font-options" },
								pills(TRACKS, model.track, (id) => update({ track: id })),
							),
						),
					),
					// ---- reset ----
					React.createElement(
						"button",
						{
							type: "button",
							className: "tl-font-reset",
							onClick: () => {
								const reset = { ...TYPO_DEFAULTS };
								setModel(reset);
								applyTypography(theme, reset, true);
							},
						},
						"恢复默认",
					),
				);
			};

			const FontButton = () =>
				React.createElement(
					"button",
					{
						type: "button",
						className: "tl-font-trigger",
						title: "字体设置",
						onClick: () => {
							toggleOverlay();
						},
					},
					"Aa",
				);

			// Self-owned host, docked to the right edge and rendered with the same
			// component. The right-sidebar tab path depends on internal controller
			// contracts whose shape is not guaranteed across builds, and a settings
			// panel that silently opens nothing is worse than one the skin docks itself.
			let overlayRoot = null;
			const host = document.createElement("div");
			host.setAttribute("data-tl-font-panel", "");
			host.hidden = true;
			if (document.body !== null) document.body.appendChild(host);

			// Drag by the header only: buttons inside the body keep their own clicks.
			// Position switches from the CSS `right` anchor to left/top on first grab so
			// the panel never jumps when the viewport is resized mid-drag.
			const DRAG_STORAGE = "tianlight.font.position";
			let drag = null;
			try {
				const saved = JSON.parse(globalThis.localStorage.getItem(DRAG_STORAGE) ?? "null");
				if (saved !== null && Number.isFinite(saved.left) && Number.isFinite(saved.top)) {
					host.style.right = "auto";
					host.style.left = Math.max(0, saved.left) + "px";
					host.style.top = Math.max(0, saved.top) + "px";
				}
			} catch {
				// a corrupt position must not stop the panel from opening
			}
			const onDragStart = (event) => {
				const target = event.target;
				const handle = target instanceof Element ? target.closest("[data-tl-font-drag]") : null;
				if (handle === null) return;
				if (target instanceof Element && target.closest("[data-tl-font-close]") !== null) return;
				const rect = host.getBoundingClientRect();
				drag = { id: event.pointerId, dx: event.clientX - rect.left, dy: event.clientY - rect.top };
				host.style.right = "auto";
				host.style.left = rect.left + "px";
				host.style.top = rect.top + "px";
				host.setAttribute("data-tl-dragging", "");
				host.setPointerCapture?.(event.pointerId);
				event.preventDefault();
			};
			const onDragMove = (event) => {
				if (drag === null || event.pointerId !== drag.id) return;
				const maxLeft = Math.max(0, globalThis.innerWidth - host.offsetWidth);
				const maxTop = Math.max(0, globalThis.innerHeight - host.offsetHeight);
				host.style.left = Math.min(Math.max(0, event.clientX - drag.dx), maxLeft) + "px";
				host.style.top = Math.min(Math.max(0, event.clientY - drag.dy), maxTop) + "px";
			};
			const onDragEnd = (event) => {
				if (drag === null) return;
				host.releasePointerCapture?.(drag.id);
				drag = null;
				host.removeAttribute("data-tl-dragging");
				try {
					globalThis.localStorage.setItem(
						DRAG_STORAGE,
						JSON.stringify({ left: Math.round(host.offsetLeft), top: Math.round(host.offsetTop) }),
					);
				} catch {
					// position persistence is optional
				}
				if (event !== undefined) event.preventDefault?.();
			};
			host.addEventListener("pointerdown", onDragStart);
			host.addEventListener("pointermove", onDragMove);
			host.addEventListener("pointerup", onDragEnd);
			host.addEventListener("pointercancel", onDragEnd);
			const clampFontHost = () => {
				if (host.hidden || host.style.right !== "auto") return;
				const maxLeft = Math.max(0, globalThis.innerWidth - host.offsetWidth);
				const maxTop = Math.max(0, globalThis.innerHeight - host.offsetHeight);
				host.style.left = Math.min(maxLeft, Math.max(0, host.offsetLeft)) + "px";
				host.style.top = Math.min(maxTop, Math.max(0, host.offsetTop)) + "px";
			};
			window.addEventListener("resize", clampFontHost);
			// ---- wallpaper-adaptive palette ----
			// The wallpaper is same-origin, so drawing a frame into a canvas does not
			// taint it and getImageData stays legal. 32x18 pixels is enough to find the
			// dominant hue and costs nothing next to the video decode.
			const swatch = document.createElement("canvas");
			swatch.width = 32;
			swatch.height = 18;
			let swatchCtx = null;
			try {
				swatchCtx = swatch.getContext("2d", { willReadFrequently: true });
			} catch {
				swatchCtx = null;
			}
			let chromaTimer = 0;
			const adoptWallpaperPalette = () => {
				if (swatchCtx === null) return;
				const still = wallpaperController === null ? null : wallpaperController.image;
				const video = document.querySelector("[data-tl-scene] > video");
				// A still wallpaper is not a <video>: sample the loaded Image instead; the
				// shader snapshot is a same-origin 2D canvas and is sampled the same way.
				const shader = wallpaperController === null ? null : wallpaperController.shaderSwatch;
				const target =
					shader !== null && shader !== undefined
						? shader
						: still !== null && still !== undefined
							? still
							: video;
				if (target === null || target === undefined) return;
				if (target === video && video.readyState < 2) return;
				let data = null;
				try {
					swatchCtx.drawImage(target, 0, 0, swatch.width, swatch.height);
					data = swatchCtx.getImageData(0, 0, swatch.width, swatch.height).data;
				} catch {
					return;
				}
				let sin = 0;
				let cos = 0;
				let satSum = 0;
				let lightSum = 0;
				let weight = 0;
				for (let i = 0; i + 3 < data.length; i += 4) {
					const r = data[i] / 255;
					const g = data[i + 1] / 255;
					const b = data[i + 2] / 255;
					const max = Math.max(r, g, b);
					const min = Math.min(r, g, b);
					const delta = max - min;
					const light = (max + min) / 2;
					// Near-grey has no usable hue, and crushed pixels carry no design value.
					if (delta < 0.05 || light < 0.08 || light > 0.95) continue;
					const sat = light > 0.5 ? delta / (2 - max - min) : delta / (max + min);
					let hue;
					if (max === r) hue = ((g - b) / delta + (g < b ? 6 : 0)) * 60;
					else if (max === g) hue = ((b - r) / delta + 2) * 60;
					else hue = ((r - g) / delta + 4) * 60;
					const rad = (hue * Math.PI) / 180;
					// Weight the mid-tones: they carry the picture's character.
					const w = sat * (1 - Math.abs(light - 0.55) * 1.2);
					sin += Math.sin(rad) * w;
					cos += Math.cos(rad) * w;
					satSum += sat * w;
					lightSum += light * w;
					weight += w;
				}
				if (weight <= 0.001) return;
				// Circular mean: averaging hue linearly would break across 0/360.
				const hue = Math.round((((Math.atan2(sin, cos) * 180) / Math.PI) + 360) % 360);
				const sat = Math.min(0.70, Math.max(0.32, (satSum / weight) * 1.3));
				const light = lightSum / weight;
				const darkMode = document.body !== null && document.body.hasAttribute(DARK_ATTR);
				// Accent is lifted for contrast; the surface keeps the wallpaper's own
				// value so the panel feels lit by the same light source.
				const accentLight = darkMode ? 0.66 : 0.44;
				const fillLight = darkMode ? Math.min(0.20, 0.10 + light * 0.10) : Math.max(0.90, 0.94 + light * 0.04);
				host.style.setProperty("--tl-accent", "hsl(" + hue + " " + Math.round(sat * 100) + "% " + Math.round(accentLight * 100) + "%)");
				host.style.setProperty(
					"--tl-accent-soft",
					"hsl(" + hue + " " + Math.round(sat * 100) + "% " + Math.round(accentLight * 100) + "% / 0.18)",
				);
				host.style.setProperty(
					"--tl-line-strong",
					"hsl(" + hue + " " + Math.round(Math.min(0.5, sat) * 100) + "% " + Math.round((darkMode ? 0.62 : 0.42) * 100) + "% / 0.40)",
				);
				host.style.setProperty(
					"--tl-panel-fill",
					"hsl(" + hue + " " + Math.round(Math.min(0.42, sat * 0.55) * 100) + "% " + Math.round(fillLight * 100) + "% / calc(0.88 * var(--tl-glass-m, 1)))",
				);
			};
			const startChroma = () => {
				if (chromaTimer !== 0) return;
				adoptWallpaperPalette();
				// Re-sample while the panel is open: the wallpaper is a looping video, so
				// its colours drift and the panel should follow them.
				chromaTimer = globalThis.setInterval(adoptWallpaperPalette, 4000);
			};
			const stopChroma = () => {
				if (chromaTimer === 0) return;
				globalThis.clearInterval(chromaTimer);
				chromaTimer = 0;
			};

			const toggleOverlay = () => {
				host.hidden = !host.hidden;
				if (host.hidden) {
					// Closing mid-drag would leave the drag armed: the pointerup lands on a
					// hidden element, so the next reopen would follow the cursor without a
					// fresh grab.
					drag = null;
					host.removeAttribute("data-tl-dragging");
					stopChroma();
					return;
				}
				startChroma();
				clampFontHost();
				if (overlayRoot !== null) return;
				try {
					overlayRoot = require("react-dom/client").createRoot(host);
					overlayRoot.render(React.createElement(FontPanel, { onClose: toggleOverlay }));
				} catch {
					overlayRoot = null;
				}
			};

			const disposeSlots = ctx.inject(["slots"], (scoped) => {
				const slots = scoped.get("slots");
				if (slots === undefined) return () => {};
				return slots.inject("conversation.input.right", () =>
					slots.register({ name: "conversation.input.right", id: "ui-skin-tianlight:font", order: -20 }, FontButton),
				);
			});

			return () => {
				if (typeof disposeSlots === "function") disposeSlots();
				window.removeEventListener("resize", clampFontHost);
				stopChroma();
				clearTypography();
				try {
					if (overlayRoot !== null) overlayRoot.unmount();
				} catch {
					// an already-detached root is fine
				}
				host.remove();
			};
		}
		//#endregion

