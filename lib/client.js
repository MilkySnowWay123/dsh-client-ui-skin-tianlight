window.__ModuleLoader__.load({
	id: "@dsh-external/dsh-client-ui-skin-tianlight",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

		//#region constants
		/** Asset prefix owned by this skin's host half (`lib/index.js`). */
		const ASSET_BASE = "/skin-tianlight";
		/** Body attribute that both scopes the stylesheet and drives teardown. */
		const BODY_ATTR = "data-dsh-tianlight";
		/** The product marks the dark theme on <body>; several rules and the wallpaper
		 *  palette sample key off it. */
		const DARK_ATTR = "data-ds-dark-theme";
		const PLUGIN_ID = "@dsh-external/dsh-client-ui-skin-tianlight";
		const CSS_TAG_ID = "ui-skin-tianlight/tianlight.css";
		const STORAGE_KEY = "dsh-tianlight:cat:v1";

		/**
		 * Render budget tiers, shared by the shader wallpaper, the rail mirror and the
		 * performance panel. Kept in constants because three regions consume it; the
		 * low-power supervisor still wins and freezes everything regardless of tier.
		 * "auto"/"30" use 30fps, "60" opts into 60fps, "15" halves both.
		 */
		const FPS_KEY = "tianlight.fps";
		const FPS_TIERS = ["auto", "60", "30", "15"];
		/** Mirrors the host's upload cap default; the panel prefers the host's live value. */
		const UPLOAD_LIMIT = 512 * 1024 * 1024;
		let renderTier = "auto";
		try {
			const saved = globalThis.localStorage?.getItem(FPS_KEY);
			if (FPS_TIERS.includes(saved)) renderTier = saved;
		} catch {
			renderTier = "auto";
		}
		function readRenderTier() {
			return renderTier;
		}
		function effectiveShaderFps() {
			return renderTier === "60" ? 60 : renderTier === "15" ? 15 : 30;
		}
		function railFrameStep() {
			return renderTier === "60" ? 3 : renderTier === "15" ? 10 : 5;
		}
		const renderTierController = {
			read: readRenderTier,
			set: (next) => {
				renderTier = FPS_TIERS.includes(next) ? next : "auto";
				try {
					globalThis.localStorage.setItem(FPS_KEY, renderTier);
				} catch {
					// persistence is optional; this session still uses the new tier
				}
			},
		};

		/**
		 * Wallpaper preference order. An entry may declare the codec MIME the
		 * browser must decode; HEVC is tried first, but an H.264 file stays behind
		 * it so an unsupported codec can never leave the page with no wallpaper.
		 */
		const VIDEO_CANDIDATES = [
			// Broad container/codec family only: a fully qualified profile string can
			// report "unsupported" on browsers that do decode HEVC, which would skip
			// the uploaded wallpaper for no reason.
			{ file: "bg-main.mp4", codec: 'video/mp4; codecs="hvc1"' },
			{ file: "bg-4k.mp4" },
			{ file: "bg-1080.mp4" },
		];
		/** Horizontal focal point of the character, per the composition brief. */
		const FOCAL_X = "38%";

		/**
		 * Developer-facing note. Deliberately NOT a network beacon: posting diagnostics
		 * to a route the running host has not loaded produced a 405 on every page load,
		 * which is noise in the user's console for no information.
		 */
		function note(stage, detail) {
			try {
				console.warn("[ui-skin-tianlight] " + stage, detail ?? "");
			} catch {
				// logging must never affect the page
			}
		}

		/**
		 * Shared React runtime. Optional: if the host does not expose it the skin
		 * still applies, it simply registers no extra controls.
		 */
		let React = null;
		try {
			React = require("react");
		} catch (error) {
			React = null;
			note("react-missing", { message: String(error?.message ?? error) });
		}
		//#endregion

		//#region stylesheet
		const CSS = String.raw`
body[data-dsh-tianlight] {
	/* The app frame AND the conversation column both paint --dsw-alias-bg-base, so
	   their alphas COMPOUND: effective = 1-(1-a)^2. A high single-layer value here
	   makes the wallpaper vanish behind what looks like a solid panel. These are
	   tuned for the composited result (~48%), not for one layer. */
	/* 100% wallpaper: every surface layer is fully transparent. Text sits directly
	   on the video, so legibility is carried by ink colour and code-block fill only. */
	--tl-shell: rgba(252, 253, 255, 0);
	--tl-shell-strong: rgba(255, 255, 255, 0);
	--tl-shell-soft: rgba(250, 252, 255, 0);
	/* Menus get their own translucent fill: opaque 0.97 would hide the blur behind
	   them, so glass on a popover has to start with actual transparency. */
	--tl-overlay: rgba(250, 252, 255, 0.82);
	/* Composer-only glass. Everything else stays fully transparent; this card is
	   the one surface that earns a frosted backdrop. */
	--tl-glass-fill: rgba(255, 255, 255, calc(0.30 * var(--tl-glass-m, 1)));
	--tl-glass-line: rgba(255, 255, 255, 0.62);
	--tl-glass-blur: 12px;
	/* Modal-grade surface: a settings panel has to stay readable over the chat, so
	   it needs its own fill instead of the zeroed bg-layer tokens. The value is high
	   on purpose: the panel carries NO backdrop blur (see below), so its opacity is
	   what does the legibility work. */
	--tl-panel-fill: rgba(250, 252, 255, calc(0.84 * var(--tl-glass-m, 1)));
	--tl-ink: #0f2438;
	--tl-ink-soft: #3a5a78;
	--tl-ink-faint: #5d7d99;
	--tl-line: rgba(112, 156, 202, 0.30);
	--tl-line-strong: rgba(86, 134, 186, 0.44);
	--tl-accent: #2b74c9;
	--tl-accent-soft: rgba(43, 116, 201, 0.14);
	--tl-code: rgba(236, 244, 252, 0.40);
	--tl-glow: rgba(150, 210, 255, 0.55);

	--dsw-alias-bg-base: var(--tl-shell) !important;
	--dsw-alias-bg-layer-1: var(--tl-shell-strong) !important;
	--dsw-alias-bg-layer-2: var(--tl-shell-soft) !important;
	--dsw-alias-bg-overlay: var(--tl-overlay) !important;
	--dsw-specific-sidebar-fill: var(--tl-shell-soft) !important;
	--dsw-alias-border-l1: var(--tl-line) !important;
	--dsw-alias-border-l2: var(--tl-line-strong) !important;
	--dsw-alias-border-l3: var(--tl-line) !important;
	--dsw-alias-border-l4: var(--tl-line-strong) !important;
	--dsw-alias-brand-primary: var(--tl-accent) !important;
	--dsw-alias-label-primary: var(--tl-ink) !important;
	--dsw-alias-label-secondary: var(--tl-ink-soft) !important;
	--dsw-alias-label-tertiary: var(--tl-ink-faint) !important;
	--dsw-alias-state-error-primary: #c0392b !important;
	--dsw-alias-state-success-primary: #0e8a63 !important;
	--dsw-alias-state-warn-primary: #b4690e !important;
	--dsw-alias-interactive-bg-hover: var(--tl-accent-soft) !important;
	--dsw-alias-markdown-code-block: var(--tl-code) !important;
	/* Remaining surface tokens: bubbles, nested cards, menus, selectors. Left
	   opaque they read as the only solid blocks on a transparent interface. */
	--dsw-specific-bubble: rgba(255, 255, 255, 0.34) !important;
	--dsw-specific-tip: rgba(255, 255, 255, 0.40) !important;
	--dsw-specific-menu: var(--tl-overlay) !important;
	--dsw-alias-bg-layer-3: rgba(255, 255, 255, 0.28) !important;
	--dsw-alias-bg-module-platform: rgba(255, 255, 255, 0.26) !important;
	--dsw-alias-interactive-bg-hover-solid: rgba(112, 164, 214, 0.26) !important;
	--dsw-alias-turn-trigger-bg: rgba(255, 255, 255, 0.26) !important;
	--dsw-alias-markdown-code-block-banner: rgba(236, 244, 252, 0.44) !important;
	/* Remaining large surfaces that 0.2.0 still paints opaque: terminal, settings
	   cards, document preview, masks, skeletons, selectors, nav items. Translucent
	   only — deliberately NO new backdrop-filter, so playback cost stays flat. */
	--dsw-alias-bg-document-preview: var(--tl-glass-fill) !important;
	--dsw-alias-bg-l1: var(--tl-glass-fill) !important;
	--dsw-alias-bg-layer-4: var(--tl-glass-fill) !important;
	--dsw-alias-bg-mask-1: rgba(240, 244, 250, 0.62) !important;
	/* Full-viewport backdrop blur: the single most expensive thing on a page with a
	   playing video, and the mask is translucent enough without it. */
	--dsw-mask-blur: none !important;
	--dsw-alias-bg-mask-drop: rgba(240, 244, 250, 0.70) !important;
	--dsw-alias-bg-skeleton: var(--tl-line) !important;
	--dsw-alias-fill-l1: rgba(255, 255, 255, 0.42) !important;
	--dsw-alias-fill-l2: rgba(255, 255, 255, 0.30) !important;
	--dsw-alias-fill-tertiary: rgba(255, 255, 255, 0.26) !important;
	--dsw-alias-fill-tsp-secondary: rgba(255, 255, 255, 0.30) !important;
	--dsw-alias-interactive-bg-active: var(--tl-accent-soft) !important;
	--dsw-alias-interactive-bg-hover-danger: rgba(192, 57, 43, 0.16) !important;
	--dsw-alias-onboarding-card-fill: var(--tl-glass-fill) !important;
	--dsw-alias-onboarding-secondary-fill: rgba(255, 255, 255, 0.22) !important;
	--dsw-alias-settings-card-fill: var(--tl-glass-fill) !important;
	--dsw-specific-input-major: var(--tl-glass-fill) !important;
	--dsw-specific-selector: rgba(255, 255, 255, 0.42) !important;
	--dsw-specific-sidebar-nav-item-active: var(--tl-accent-soft) !important;
	--dsw-specific-sidebar-nav-item-active-accent: var(--tl-accent) !important;
	--dsw-specific-sidebar-nav-item-hover: var(--tl-accent-soft) !important;
	--dsw-alias-turn-trigger-bg-hover: var(--tl-accent-soft) !important;
}

body[data-dsh-tianlight][data-ds-dark-theme] {
	--tl-shell: rgba(10, 18, 32, 0);
	--tl-shell-strong: rgba(16, 27, 45, 0);
	--tl-shell-soft: rgba(10, 18, 32, 0);
	--tl-overlay: rgba(12, 22, 38, 0.84);
	--tl-glass-fill: rgba(16, 26, 42, calc(0.38 * var(--tl-glass-m, 1)));
	--tl-glass-line: rgba(150, 195, 250, 0.28);
	--tl-glass-blur: 14px;
	--tl-panel-fill: rgba(10, 18, 32, calc(0.88 * var(--tl-glass-m, 1)));
	--tl-ink: #eaf3ff;
	--tl-ink-soft: #a9c2dc;
	--tl-ink-faint: #7f9bb8;
	--tl-line: rgba(126, 178, 232, 0.26);
	--tl-line-strong: rgba(142, 194, 246, 0.40);
	--tl-accent: #7fb6ff;
	--tl-accent-soft: rgba(127, 182, 255, 0.16);
	--tl-code: rgba(10, 20, 34, 0.44);
	--tl-glow: rgba(120, 186, 255, 0.45);

	--dsw-alias-state-error-primary: #ff7b6b !important;
	--dsw-alias-state-success-primary: #4fe0a6 !important;
	--dsw-alias-state-warn-primary: #ffc46b !important;
	--dsw-specific-bubble: rgba(18, 30, 48, 0.42) !important;
	--dsw-specific-tip: rgba(18, 30, 48, 0.46) !important;
	--dsw-specific-menu: var(--tl-overlay) !important;
	--dsw-alias-bg-layer-3: rgba(18, 30, 48, 0.36) !important;
	--dsw-alias-bg-module-platform: rgba(18, 30, 48, 0.34) !important;
	--dsw-alias-interactive-bg-hover-solid: rgba(70, 118, 170, 0.28) !important;
	--dsw-alias-turn-trigger-bg: rgba(18, 30, 48, 0.34) !important;
	--dsw-alias-markdown-code-block-banner: rgba(10, 20, 34, 0.46) !important;
	--dsw-alias-bg-document-preview: var(--tl-glass-fill) !important;
	--dsw-alias-bg-l1: var(--tl-glass-fill) !important;
	--dsw-alias-bg-layer-4: var(--tl-glass-fill) !important;
	--dsw-alias-bg-mask-1: rgba(3, 8, 16, 0.55) !important;
	--dsw-mask-blur: none !important;
	--dsw-alias-bg-mask-drop: rgba(3, 8, 16, 0.65) !important;
	--dsw-alias-bg-skeleton: var(--tl-line) !important;
	--dsw-alias-fill-l1: rgba(20, 34, 54, 0.46) !important;
	--dsw-alias-fill-l2: rgba(20, 34, 54, 0.36) !important;
	--dsw-alias-fill-tertiary: rgba(20, 34, 54, 0.32) !important;
	--dsw-alias-fill-tsp-secondary: rgba(20, 34, 54, 0.36) !important;
	--dsw-alias-interactive-bg-active: var(--tl-accent-soft) !important;
	--dsw-alias-interactive-bg-hover-danger: rgba(255, 120, 105, 0.18) !important;
	--dsw-alias-onboarding-card-fill: var(--tl-glass-fill) !important;
	--dsw-alias-onboarding-secondary-fill: rgba(18, 30, 48, 0.30) !important;
	--dsw-alias-settings-card-fill: var(--tl-glass-fill) !important;
	--dsw-specific-input-major: var(--tl-glass-fill) !important;
	--dsw-specific-selector: rgba(18, 30, 48, 0.46) !important;
	--dsw-specific-sidebar-nav-item-active: var(--tl-accent-soft) !important;
	--dsw-specific-sidebar-nav-item-active-accent: var(--tl-accent) !important;
	--dsw-specific-sidebar-nav-item-hover: var(--tl-accent-soft) !important;
	--dsw-alias-turn-trigger-bg-hover: var(--tl-accent-soft) !important;
}

body[data-dsh-tianlight] {
	background: transparent !important;
	/* Glass multiplier. installGlassOpacity() overwrites it from the saved level; the
	   declaration lives here so every var the stylesheet reads is also declared. */
	--tl-glass-m: 1;
}

/* ---- wallpaper, painted strictly beneath the application ---- */
body[data-dsh-tianlight] [data-tl-scene] {
	/* Zone framing defaults. applyZones() overwrites these from the saved model; the
	   declarations live here so every var the stylesheet reads is also declared. */
	--tl-fit: cover;
	--tl-fit-size: cover;
	--tl-focal-x: 38%;
	--tl-focal-y: 50%;
	--tl-zone-dim: 0;
	--tl-overlay-opacity: 0.55;
	--tl-overlay-blend: normal;
	--tl-f-brightness: 1;
	--tl-f-contrast: 1;
	--tl-f-saturate: 1;
	position: fixed;
	inset: 0;
	z-index: 0;
	pointer-events: none;
	overflow: hidden;
	/* Own compositor layer + paint isolation: without these the whole page
	   recomposites whenever the video advances a frame. */
	contain: paint;
	transform: translateZ(0);
	background:
		radial-gradient(120% 90% at 18% 8%, #cfe9ff 0%, #9fcdf5 32%, #6aa8de 62%, #2f6ea8 100%);
}
body[data-dsh-tianlight][data-ds-dark-theme] [data-tl-scene] {
	/* Night sky, deliberately NOT near-black: this layer is what shows whenever the
	   video is missing or not yet decoded, and a #040a12 floor reads as a solid
	   black rectangle instead of a wallpaper. */
	background:
		radial-gradient(120% 90% at 22% 10%, #2b4f7d 0%, #1d3a5e 38%, #16294a 72%, #101d33 100%);
}
body[data-dsh-tianlight] [data-tl-scene] > video {
	position: absolute;
	inset: 0;
	width: 100%;
	height: 100%;	/* Zone-driven: fit and focal point come from the wallpaper settings, so a source
	   whose aspect ratio disagrees with the window can be cropped, letterboxed or
	   stretched, with the surviving region chosen by the user. */
	object-fit: var(--tl-fit, cover);
	object-position: var(--tl-focal-x, 38%) var(--tl-focal-y, 50%);
	/* No filter here on purpose. Even a zero-radius blur keeps the element on a
	   filter path that re-renders a full-screen surface every frame, which is what
	   made playback stutter. The tint now comes from the veil overlay instead. */
	transform: translateZ(0);
	backface-visibility: hidden;
	opacity: 0;
	transition: opacity 900ms ease;
}
body[data-dsh-tianlight] [data-tl-scene] > video[data-tl-ready] {
	opacity: 1;
}
/* Opt-in colour grading. The attribute gate matters: even neutral filter values
   would keep the element on a full-screen filter path, which is what made older
   builds stutter. Off by default, so the fast path has no filter at all. */
body[data-dsh-tianlight] [data-tl-scene][data-tl-filter] > video,
body[data-dsh-tianlight] [data-tl-scene][data-tl-filter] > [data-tl-photo] {
	filter: brightness(var(--tl-f-brightness, 1)) contrast(var(--tl-f-contrast, 1)) saturate(var(--tl-f-saturate, 1));
}
body[data-dsh-tianlight] [data-tl-scene] > [data-tl-veil] {
	position: absolute;
	inset: 0;
	background:
		linear-gradient(180deg, rgba(255, 255, 255, 0.10) 0%, transparent 40%, rgba(12, 28, 48, 0.10) 100%);
}
body[data-dsh-tianlight][data-ds-dark-theme] [data-tl-scene] > [data-tl-veil] {
	background:
		linear-gradient(180deg, rgba(120, 180, 240, 0.06) 0%, transparent 42%, rgba(2, 8, 18, 0.30) 100%);
}
/* top-left dawn burst: corner artwork that never meets a control */
body[data-dsh-tianlight] [data-tl-scene] > [data-tl-crest] {
	position: absolute;
	top: -120px;
	left: -140px;
	width: 520px;
	height: 520px;
	opacity: 0.42;
}
body[data-dsh-tianlight][data-ds-dark-theme] [data-tl-scene] > [data-tl-crest] {
	opacity: 0.30;
}

/* ---- model picker: same glass pill as the composer ---- */
body[data-dsh-tianlight] ._7KE1Ra_trigger {
	background: var(--tl-glass-fill) !important;
	-webkit-backdrop-filter: blur(var(--tl-glass-blur)) saturate(1.2);
	backdrop-filter: blur(var(--tl-glass-blur)) saturate(1.2);
	border: 0.5px solid var(--tl-glass-line) !important;
	border-radius: 999px !important;
	height: 26px;
	padding-inline: 11px !important;
	transition: background 140ms ease, border-color 140ms ease;
}
body[data-dsh-tianlight] ._7KE1Ra_trigger:hover {
	border-color: var(--tl-accent) !important;
}
body[data-dsh-tianlight] ._7KE1Ra_triggerLabel {
	font-weight: 500;
	letter-spacing: 0.01em;
}
body[data-dsh-tianlight] ._7KE1Ra_triggerEffort {
	opacity: 0.85;
}

/* ---- reasoning rheostat: a chrome-less luminous fader ----
   No capsule shell on purpose: a hairline of light plus a glowing bead reads as
   part of the wallpaper instead of one more pill in the tool row. Position comes
   from a real spring in JS, so the left/width properties must stay
   transition-free here or the rAF integration and CSS easing would fight. */
body[data-dsh-tianlight] [data-tl-rheo] {
	position: relative;
	box-sizing: border-box;
	width: 152px;
	height: 34px;
	flex: none;
	background: transparent;
	border: 0;
	touch-action: none;
	cursor: pointer;
	user-select: none;
	-webkit-user-select: none;
	transition: opacity 160ms ease;
}
body[data-dsh-tianlight] [data-tl-rheo]:focus-visible {
	outline: none;
}
body[data-dsh-tianlight] [data-tl-rheo][data-tl-busy] {
	opacity: 0.55;
}
body[data-dsh-tianlight] [data-tl-rheo][data-tl-rheo-empty] {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	box-sizing: border-box;
	width: auto;
	height: 26px;
	padding: 0 11px;
	border-radius: 999px;
	background: var(--tl-glass-fill);
	border: 0.5px solid var(--tl-glass-line);
	-webkit-backdrop-filter: blur(var(--tl-glass-blur)) saturate(1.2);
	backdrop-filter: blur(var(--tl-glass-blur)) saturate(1.2);
	cursor: default;
	opacity: 1;
}
body[data-dsh-tianlight] [data-tl-rheo-empty-text] {
	font-size: 11px;
	line-height: 1;
	letter-spacing: 0.04em;
	color: var(--tl-ink-faint);
	white-space: nowrap;
	max-width: 300px;
	overflow: hidden;
	text-overflow: ellipsis;
}
body[data-dsh-tianlight] [data-tl-rheo-track] {
	position: absolute;
	left: 12px;
	right: 40px;
	top: 50%;
	height: 2px;
	margin-top: -1px;
	border-radius: 999px;
	background: linear-gradient(90deg, transparent 0%, var(--tl-line-strong) 18%, var(--tl-line-strong) 100%);
}
body[data-dsh-tianlight] [data-tl-rheo-fill] {
	position: absolute;
	left: 12px;
	top: 50%;
	height: 2px;
	margin-top: -1px;
	border-radius: 999px;
	background: linear-gradient(90deg, color-mix(in srgb, var(--tl-accent) 25%, white), var(--tl-accent));
	box-shadow: 0 0 10px color-mix(in srgb, var(--tl-accent) 70%, transparent);
	width: calc((100% - 52px) * var(--tl-rheo-pos, 0));
}
body[data-dsh-tianlight] [data-tl-rheo-halo] {
	position: absolute;
	top: 50%;
	left: calc(12px + (100% - 52px) * var(--tl-rheo-pos, 0));
	width: 34px;
	height: 34px;
	margin: -17px 0 0 -17px;
	border-radius: 50%;
	background: radial-gradient(circle, color-mix(in srgb, var(--tl-accent) 40%, transparent) 0%, transparent 66%);
	pointer-events: none;
}
body[data-dsh-tianlight] [data-tl-rheo-bead] {
	position: absolute;
	top: 50%;
	left: calc(12px + (100% - 52px) * var(--tl-rheo-pos, 0));
	width: 11px;
	height: 11px;
	margin: -5.5px 0 0 -5.5px;
	border-radius: 50%;
	background: #ffffff;
	box-shadow:
		0 0 0 1.5px color-mix(in srgb, var(--tl-accent) 85%, white),
		0 0 14px 2px color-mix(in srgb, var(--tl-accent) 60%, transparent),
		0 1px 3px rgba(10, 30, 60, 0.30);
	pointer-events: none;
	transition:
		transform 240ms cubic-bezier(0.34, 1.7, 0.5, 1),
		box-shadow 200ms ease;
}
body[data-dsh-tianlight] [data-tl-rheo]:hover [data-tl-rheo-bead] {
	transform: scale(1.25);
}
body[data-dsh-tianlight] [data-tl-rheo][data-tl-drag] [data-tl-rheo-bead] {
	transform: scale(1.45);
}
/* one expanding ring per detent change; the element is keyed so it restarts */
body[data-dsh-tianlight] [data-tl-rheo-pulse] {
	position: absolute;
	top: 50%;
	left: calc(12px + (100% - 52px) * var(--tl-rheo-pos, 0));
	width: 12px;
	height: 12px;
	margin: -6px 0 0 -6px;
	border-radius: 50%;
	border: 1.5px solid color-mix(in srgb, var(--tl-accent) 75%, white);
	pointer-events: none;
	animation: tl-rheo-ring 620ms cubic-bezier(0.2, 0.7, 0.2, 1) forwards;
}
@keyframes tl-rheo-ring {
	0% {
		transform: scale(0.6);
		opacity: 0.85;
	}
	70% {
		opacity: 0.25;
	}
	100% {
		transform: scale(3.1);
		opacity: 0;
	}
}
body[data-dsh-tianlight] [data-tl-rheo-label] {
	position: absolute;
	right: 10px;
	top: 50%;
	transform: translateY(-50%);
	font-size: 11px;
	line-height: 1;
	letter-spacing: 0.05em;
	color: var(--tl-ink-soft);
	pointer-events: none;
	animation: tl-rheo-pop 420ms cubic-bezier(0.34, 1.6, 0.5, 1);
}
@keyframes tl-rheo-pop {
	0% {
		transform: translateY(-50%) translateY(3px) scale(0.86);
		opacity: 0.3;
	}
	60% {
		transform: translateY(-50%) translateY(-1px) scale(1.06);
		opacity: 1;
	}
	100% {
		transform: translateY(-50%) scale(1);
		opacity: 1;
	}
}
body[data-dsh-tianlight] [data-tl-rheo][data-tl-drag] [data-tl-rheo-label] {
	color: var(--tl-accent);
}
@media (prefers-reduced-motion: reduce) {
	body[data-dsh-tianlight] [data-tl-rheo-pulse],
	body[data-dsh-tianlight] [data-tl-rheo-label] {
		animation: none;
	}
}



/* ---- raise the application above the wallpaper ---- */
body[data-dsh-tianlight] [id='root'] {
	position: relative !important;
	z-index: 1 !important;
	/* Surfaces can be fully transparent, so text sits straight on a moving video.
	   A hairline shadow is inherited by every text node and costs no wallpaper. */
	text-shadow: 0 1px 2px rgba(255, 255, 255, 0.62), 0 0 1px rgba(255, 255, 255, 0.42);
}
body[data-dsh-tianlight][data-ds-dark-theme] [id='root'] {
	text-shadow: 0 1px 2px rgba(0, 0, 0, 0.66), 0 0 1px rgba(0, 0, 0, 0.45);
}

/* ---- left column: forced transparent, whichever variant painted it ----
   Every sidebar surface traces back to tokens the skin zeroed, yet a dark block
   persisted, so these rules skip the token indirection and zero the column and
   its list chrome outright. Build-hashed classes degrade silently if renamed. */
body[data-dsh-tianlight] .pI_x6G_sidebarCol,
body[data-dsh-tianlight] .hHd-Xa_root,
body[data-dsh-tianlight] .bhn1Oq_root {
	background: transparent !important;
	background-image: none !important;
	background-color: transparent !important;
}

/* Dark theme only, left column only: nothing inside may paint a background.
   The column's own rule was already transparent, so a pure-black area had to come
   from a descendant. Hover/selection tints inside the sidebar are sacrificed here
   on purpose — no black block is worth keeping them. */
body[data-dsh-tianlight][data-ds-dark-theme] .pI_x6G_sidebarCol :where(div, aside, nav, section, ul, ol, li) {
	background-color: transparent !important;
	background-image: none !important;
}

/* ---- composer only: frosted glass ----
   The rest of the interface stays fully transparent (100% wallpaper); this is the
   single surface that gets a blurred backdrop, because it is where typing happens
   and it sits over the moving picture.
   The class suffix is build-specific. If a DSH update renames it the selector stops
   matching and the composer returns to the transparent default, so this degrades
   quietly instead of breaking the layout. */
body[data-dsh-tianlight] .uV2eYG_card {
	/* The blur is painted by ::before, never here. backdrop-filter makes an element the
	   containing block for its position:fixed descendants; the composer's tooltips are
	   not portaled, so a blur on the card would re-anchor their bubbles to the card
	   instead of the viewport, which misplaces the bubble and disturbs the transcript
	   scroll area while it is open. The pseudo layer is not an ancestor of the
	   tooltips, so it keeps the frosted look without the containing block. */
	background: var(--tl-glass-fill) !important;
	border: 0.5px solid var(--tl-glass-line) !important;
	box-shadow:
		0 10px 34px rgba(8, 28, 52, 0.22),
		inset 0 1px 0 var(--tl-glass-line) !important;
	/* Stacking context (kept from the old backdrop-filter) without a fixed containing
	   block, so the ::before layer can sit above this background and below the text. */
	position: relative;
	isolation: isolate;
}
body[data-dsh-tianlight] .uV2eYG_card::before,
body[data-dsh-tianlight] [data-tl-composer]::before {
	content: "";
	position: absolute;
	inset: 0;
	border-radius: inherit;
	-webkit-backdrop-filter: blur(var(--tl-glass-blur)) saturate(1.25);
	backdrop-filter: blur(var(--tl-glass-blur)) saturate(1.25);
	pointer-events: none;
	z-index: -1;
}
body[data-dsh-tianlight][data-ds-dark-theme] .uV2eYG_card {
	box-shadow:
		0 10px 34px rgba(0, 0, 0, 0.45),
		inset 0 1px 0 var(--tl-glass-line) !important;
}

/* ---- settings panel: a solid-ish glass surface, with NO live blur ----
   The panel painted --dsw-alias-bg-layer-2, which the skin zeroes to reach 100%
   wallpaper, so the chat behind it showed through and the two text layers collided.
   It therefore needs its own fill.
   Deliberately no backdrop-filter here: the panel is ~800x800 over a playing video,
   and the product's mask already blurs the full viewport (--dsw-mask-blur). Two
   stacked live blurs re-composite on every video frame and made scrolling janky.
   Opacity plus a hairline border carries the glass look at zero per-frame cost. */
body[data-dsh-tianlight] .VOzbGW_panel {
	background: var(--tl-panel-fill) !important;
	border: 0.5px solid var(--tl-glass-line);
	box-shadow:
		0 18px 60px rgba(8, 26, 48, 0.28),
		inset 0 1px 0 var(--tl-glass-line);
}
body[data-dsh-tianlight][data-ds-dark-theme] .VOzbGW_panel {
	box-shadow:
		0 18px 60px rgba(0, 0, 0, 0.55),
		inset 0 1px 0 var(--tl-glass-line);
}

/* ---- font panel: right sidebar tab + its composer trigger ----
   Own class names only, so nothing here can collide with a product class. */
/* ---- wallpaper sidebar: full height, slides in from the left edge ---- */
body[data-dsh-tianlight] [data-tl-wall-handle] {
	position: fixed;
	left: 0;
	top: 50%;
	transform: translateY(-50%);
	z-index: 59;
	writing-mode: vertical-rl;
	letter-spacing: 0.22em;
	padding: 14px 7px;
	border: 0.5px solid var(--tl-glass-line);
	border-left: none;
	border-radius: 0 12px 12px 0;
	background: var(--tl-panel-fill);
	color: var(--tl-ink-soft);
	font-size: 11px;
	line-height: 1;
	cursor: pointer;
	box-shadow: 4px 0 18px rgba(8, 26, 48, 0.16);
	transition: color 0.18s ease, border-color 0.18s ease;
}
body[data-dsh-tianlight] [data-tl-wall-handle]:hover {
	color: var(--tl-ink);
	border-color: var(--tl-accent);
}
body[data-dsh-tianlight] [data-tl-wall-handle][data-tl-hidden] {
	display: none;
}
body[data-dsh-tianlight] [data-tl-wall] {
	position: fixed;
	top: 0;
	bottom: 0;
	left: 0;
	width: 320px;
	max-width: 88vw;
	/* Translation is owned by the drag/spring code, so no CSS transition here: a
	   transition would fight the rAF writes and eat the velocity. */
	display: none;
	flex-direction: column;
	background: var(--tl-panel-fill);
	border-right: 0.5px solid var(--tl-glass-line);
	box-shadow: 18px 0 48px rgba(8, 26, 48, 0.28);
	will-change: transform;
	z-index: 58;
	overflow-y: auto;
	/* Reserve the scrollbar lane: sections and the live quality line change height,
	   and a scrollbar appearing/disappearing used to shift the whole panel. */
	scrollbar-gutter: stable;
	color: var(--tl-ink);
	cursor: default;
	/* The wallpaper-derived fill is re-sampled every few seconds; transition the
	   colour instead of repainting it as a visible step. */
	transition: background-color 1.2s ease, border-color 0.24s ease;
	/* Vertical touch scrolling must keep working; only the drag handle captures
	   horizontal gestures. */
	touch-action: pan-y;
}
body[data-dsh-tianlight] [data-tl-wall] button,
body[data-dsh-tianlight] [data-tl-wall] input,
body[data-dsh-tianlight] [data-tl-wall] select {
	cursor: pointer;
}
body[data-dsh-tianlight] [data-tl-wall][data-tl-dragging] {
	cursor: grabbing;
}
body[data-dsh-tianlight] [data-tl-wall][data-tl-open] {
	display: flex;
}
body[data-dsh-tianlight] [data-tl-wall][data-tl-side="right"] {
	border-right: none;
	border-left: 0.5px solid var(--tl-glass-line);
	box-shadow: -18px 0 48px rgba(8, 26, 48, 0.28);
}
body[data-dsh-tianlight][data-ds-dark-theme] [data-tl-wall] {
	box-shadow: 18px 0 48px rgba(0, 0, 0, 0.55);
}
body[data-dsh-tianlight][data-ds-dark-theme] [data-tl-wall][data-tl-side="right"] {
	box-shadow: -18px 0 48px rgba(0, 0, 0, 0.55);
}
body[data-dsh-tianlight] [data-tl-wall] [data-tl-wall-drag] {
	cursor: grab;
	user-select: none;
	touch-action: none;
}
body[data-dsh-tianlight] [data-tl-wall][data-tl-dragging] {
	user-select: none;
}
body[data-dsh-tianlight] [data-tl-wall][data-tl-dragging] [data-tl-wall-drag] {
	cursor: grabbing;
}
body[data-dsh-tianlight] [data-tl-wall-scrim] {
	position: fixed;
	inset: 0;
	z-index: 57;
	background: rgba(10, 22, 38, 0.18);
	opacity: 0;
	pointer-events: none;
	transition: opacity 0.24s ease;
}
body[data-dsh-tianlight] [data-tl-wall-scrim][data-tl-open] {
	opacity: 1;
	pointer-events: auto;
}
body[data-dsh-tianlight] .tl-wall-inner {
	position: relative;
	display: flex;
	flex-direction: column;
	gap: 10px;
	padding: 14px;
}
body[data-dsh-tianlight] .tl-wall-glow {
	position: absolute;
	inset: 0;
	pointer-events: none;
	border-radius: inherit;
	--tl-glow-x: 50%;
	--tl-glow-y: 30%;
	--tl-glow-a: 0;
	opacity: var(--tl-glow-a);
	transition: opacity 0.22s ease;
	background: radial-gradient(
		240px circle at var(--tl-glow-x) var(--tl-glow-y),
		color-mix(in srgb, var(--tl-accent) 62%, transparent),
		transparent 72%
	);
}
body[data-dsh-tianlight] .tl-wall-head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 10px;
}
body[data-dsh-tianlight] .tl-wall-view-switch {
	margin-left: auto;
	display: flex;
	gap: 2px;
	padding: 2px;
	border-radius: 999px;
	background: color-mix(in srgb, var(--tl-ink-faint) 12%, transparent);
}
body[data-dsh-tianlight] .tl-wall-view-switch button {
	padding: 2px 7px;
	border: 0;
	border-radius: 999px;
	background: transparent;
	color: var(--tl-ink-faint);
	font: inherit;
	font-size: 10px;
	font-weight: 600;
	cursor: pointer;
}
body[data-dsh-tianlight] .tl-wall-view-switch button[data-active] {
	background: var(--tl-glass-fill);
	color: var(--tl-ink);
}
/* Pick mode is the default: only the source routes and the wallpaper list.
   Every adjustment group is one click away under 高级, not on screen by default. */
body[data-dsh-tianlight] [data-tl-wall] [data-tl-view="pick"] [data-tl-group="sources"],
body[data-dsh-tianlight] [data-tl-wall] [data-tl-view="pick"] [data-tl-group="advanced"] {
	display: none;
}
/* In the simple view the list is just upload + search + grid. Favourites, tags,
   hidden management and the tag editor are library administration: advanced. */
body[data-dsh-tianlight] [data-tl-view="pick"] .tl-wall-filters,
body[data-dsh-tianlight] [data-tl-view="pick"] .tl-wall-tag-editor {
	display: none;
}
body[data-dsh-tianlight] .tl-wall-hint {
	margin: 0;
	font-size: 11px;
	line-height: 1.5;
	color: var(--tl-ink-faint);
}
body[data-dsh-tianlight] .tl-wall-guide {
	display: flex;
	flex-direction: column;
	gap: 2px;
	margin: 0 2px 4px;
}
/* Three primary routes at the top: the shortest path to changing a wallpaper. */
body[data-dsh-tianlight] .tl-wall-quick {
	display: grid;
	grid-template-columns: repeat(4, minmax(0, 1fr));
	gap: 4px;
	margin: 2px 0 1px;
}
body[data-dsh-tianlight] .tl-wall-quick-btn {
	padding: 5px 2px;
	border-radius: 9px;
	border: 0.5px solid var(--tl-line-strong);
	background: var(--tl-glass-fill);
	color: var(--tl-ink-soft);
	font: inherit;
	font-size: 10px;
	font-weight: 600;
	line-height: 1.3;
	white-space: nowrap;
	cursor: pointer;
}
body[data-dsh-tianlight] .tl-wall-quick-btn:hover {
	border-color: var(--tl-accent);
	color: var(--tl-ink);
}
body[data-dsh-tianlight] .tl-wall-quick-btn[data-active] {
	border-color: var(--tl-accent);
	background: color-mix(in srgb, var(--tl-accent) 14%, var(--tl-glass-fill));
	color: var(--tl-ink);
}
/* One library: chips filter the same grid; URL/WE/GLSL are secondary import links. */
body[data-dsh-tianlight] .tl-wall-filter-row {
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: 4px;
	margin: 2px 0 1px;
}
body[data-dsh-tianlight] .tl-wall-filter-chip {
	padding: 5px 2px;
	border-radius: 999px;
	border: 0.5px solid var(--tl-line-strong);
	background: var(--tl-glass-fill);
	color: var(--tl-ink-soft);
	font: inherit;
	font-size: 10px;
	font-weight: 600;
	white-space: nowrap;
	cursor: pointer;
}
body[data-dsh-tianlight] .tl-wall-filter-chip:hover {
	border-color: var(--tl-accent);
	color: var(--tl-ink);
}
body[data-dsh-tianlight] .tl-wall-filter-chip[data-active] {
	border-color: var(--tl-accent);
	background: color-mix(in srgb, var(--tl-accent) 16%, var(--tl-glass-fill));
	color: var(--tl-ink);
}
body[data-dsh-tianlight] .tl-wall-import-row {
	display: flex;
	flex-wrap: wrap;
	gap: 2px 10px;
	margin: 0 0 1px;
}
body[data-dsh-tianlight] .tl-wall-import-btn {
	padding: 1px 0;
	border: 0;
	background: transparent;
	color: var(--tl-ink-faint);
	font: inherit;
	font-size: 10px;
	text-decoration: underline;
	text-underline-offset: 2px;
	cursor: pointer;
}
body[data-dsh-tianlight] .tl-wall-import-btn:hover,
body[data-dsh-tianlight] .tl-wall-import-btn[data-active] {
	color: var(--tl-accent);
}
/* Live playback state. A dot + one word answers "is the wallpaper actually
   moving?", which the old top bar could not: it always said 动态壁纸. */
body[data-dsh-tianlight] .tl-wall-status {
	display: flex;
	align-items: center;
	gap: 6px;
	margin: 0;
	font-size: 11px;
	font-weight: 600;
	letter-spacing: 0.01em;
	color: var(--tl-ink-soft);
	font-variant-numeric: tabular-nums;
}
/* The quality line carries changing FPS/jitter numbers. Keep it one line with
   tabular digits, otherwise the guide changes height every second and the whole
   panel appears to jitter while the wallpaper plays. */
body[data-dsh-tianlight] .tl-wall-quality {
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	font-variant-numeric: tabular-nums;
}
body[data-dsh-tianlight] .tl-wall-status-dot {
	flex: none;
	width: 6px;
	height: 6px;
	border-radius: 999px;
	background: var(--tl-ink-faint);
	box-shadow: 0 0 0 2px color-mix(in srgb, var(--tl-ink-faint) 22%, transparent);
}
body[data-dsh-tianlight] .tl-wall-status[data-tone="live"] {
	color: var(--tl-ink);
}
body[data-dsh-tianlight] .tl-wall-status[data-tone="live"] .tl-wall-status-dot {
	background: var(--tl-accent);
	box-shadow: 0 0 0 2px color-mix(in srgb, var(--tl-accent) 26%, transparent);
}
body[data-dsh-tianlight] .tl-wall-status[data-tone="warn"] {
	color: var(--tl-ink);
}
body[data-dsh-tianlight] .tl-wall-status[data-tone="warn"] .tl-wall-status-dot {
	background: #e8b45a;
	box-shadow: 0 0 0 2px rgba(232, 180, 90, 0.26);
}
body[data-dsh-tianlight] .tl-wall-status[data-tone="alert"] {
	color: var(--tl-ink);
}
body[data-dsh-tianlight] .tl-wall-status[data-tone="alert"] .tl-wall-status-dot {
	background: #e8776b;
	box-shadow: 0 0 0 2px rgba(232, 119, 107, 0.26);
}
body[data-dsh-tianlight] .tl-wall-current {
	margin: 0;
	font-size: 11px;
	font-weight: 600;
	color: var(--tl-ink);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}
body[data-dsh-tianlight] .tl-wall-sticky {
	position: sticky;
	top: 0;
	z-index: 2;
	display: flex;
	flex-direction: column;
	gap: 6px;
	margin: -14px -14px 0;
	padding: 14px 14px 10px;
	background: var(--tl-panel-fill);
	border-bottom: 0.5px solid var(--tl-line-strong);
}
body[data-dsh-tianlight] .tl-source-grid {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 6px;
}
body[data-dsh-tianlight] .tl-source-card {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: 2px;
	padding: 6px 8px;
	border-radius: 10px;
	border: 0.5px solid var(--tl-line-strong);
	background: var(--tl-glass-fill);
	color: var(--tl-ink-soft);
	font: inherit;
	text-align: left;
	cursor: pointer;
}
body[data-dsh-tianlight] .tl-source-card:hover {
	border-color: var(--tl-accent);
}
body[data-dsh-tianlight] .tl-source-card[data-active] {
	border-color: var(--tl-accent);
	background: color-mix(in srgb, var(--tl-accent) 12%, var(--tl-glass-fill));
}
body[data-dsh-tianlight] .tl-source-card[data-tl-disabled] {
	opacity: 0.45;
	cursor: not-allowed;
}
body[data-dsh-tianlight] .tl-source-name {
	font-size: 11px;
	font-weight: 600;
	line-height: 1.3;
	color: var(--tl-ink);
}
body[data-dsh-tianlight] .tl-source-note {
	font-size: 10px;
	line-height: 1.3;
	color: var(--tl-ink-faint);
}
body[data-dsh-tianlight] .tl-wall-grid {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 8px;
}
body[data-dsh-tianlight] .tl-wall-card {
	display: flex;
	flex-direction: column;
	gap: 6px;
	padding: 6px;
	border-radius: 12px;
	border: 0.5px solid var(--tl-line-strong);
	background: var(--tl-glass-fill);
	color: var(--tl-ink-soft);
	font-size: 11px;
	cursor: pointer;
	text-align: left;
}
body[data-dsh-tianlight] .tl-wall-card:hover {
	border-color: var(--tl-accent);
	color: var(--tl-ink);
}
body[data-dsh-tianlight] .tl-wall-card[data-active] {
	border-color: var(--tl-accent);
	background: var(--tl-accent-soft);
	color: var(--tl-ink);
}
body[data-dsh-tianlight] .tl-wall-thumb {
	position: relative;
	aspect-ratio: 16 / 9;
	border-radius: 8px;
	overflow: hidden;
	background: var(--tl-line);
	display: flex;
	align-items: center;
	justify-content: center;
}
body[data-dsh-tianlight] .tl-wall-thumb > img,
body[data-dsh-tianlight] .tl-wall-thumb > video {
	width: 100%;
	height: 100%;
	object-fit: cover;
	display: block;
}
body[data-dsh-tianlight] .tl-wall-auto {
	font-size: 11px;
	color: var(--tl-ink-faint);
	letter-spacing: 0.08em;
}
body[data-dsh-tianlight] .tl-wall-name {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
body[data-dsh-tianlight] .tl-wall-library {
	display: flex;
	flex-direction: column;
	gap: 6px;
}
body[data-dsh-tianlight] .tl-wall-upload {
	display: inline-flex;
	align-items: center;
	padding: 4px 12px;
	border-radius: 999px;
	border: 0.5px solid var(--tl-line-strong);
	background: transparent;
	color: var(--tl-ink-soft);
	font-size: 12px;
	line-height: 1.4;
	cursor: pointer;
}
body[data-dsh-tianlight] .tl-wall-upload:hover {
	border-color: var(--tl-accent);
	color: var(--tl-ink);
}
body[data-dsh-tianlight] .tl-wall-upload[data-busy] {
	opacity: 0.6;
	cursor: default;
}
body[data-dsh-tianlight] .tl-wall-cell {
	position: relative;
	display: flex;
	min-width: 0;
}
body[data-dsh-tianlight] .tl-wall-cell > .tl-wall-card {
	flex: 1;
	min-width: 0;
}
body[data-dsh-tianlight] .tl-wall-fav,
body[data-dsh-tianlight] .tl-wall-tag-open,
body[data-dsh-tianlight] .tl-wall-hide {
	position: absolute;
	top: 5px;
	width: 22px;
	height: 22px;
	display: grid;
	place-items: center;
	padding: 0;
	border-radius: 999px;
	border: 0.5px solid var(--tl-glass-line);
	background: var(--tl-overlay);
	color: var(--tl-ink-soft);
	font-size: 12px;
	line-height: 1;
	cursor: pointer;
}
body[data-dsh-tianlight] .tl-wall-fav {
	right: 5px;
}
body[data-dsh-tianlight] .tl-wall-hide {
	right: 31px;
	font-size: 10px;
}
body[data-dsh-tianlight] .tl-wall-tag-open {
	left: 5px;
}
body[data-dsh-tianlight] .tl-wall-fav:hover,
body[data-dsh-tianlight] .tl-wall-tag-open:hover,
body[data-dsh-tianlight] .tl-wall-hide:hover {
	border-color: var(--tl-accent);
	color: var(--tl-ink);
}
body[data-dsh-tianlight] .tl-wall-fav[data-active] {
	border-color: var(--tl-accent);
	color: var(--tl-accent);
}
body[data-dsh-tianlight] .tl-wall-hide[data-active] {
	border-color: #e8b45a;
	color: #e8b45a;
}
body[data-dsh-tianlight] .tl-wall-cell[data-tl-hidden] > .tl-wall-card {
	opacity: 0.5;
}
body[data-dsh-tianlight] .tl-wall-tags-mini {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	font-size: 10px;
	letter-spacing: 0.02em;
	color: var(--tl-ink-faint);
}
body[data-dsh-tianlight] .tl-frame-grid {
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: 6px;
}
body[data-dsh-tianlight] .tl-frame {
	display: flex;
	flex-direction: column;
	gap: 2px;
	padding: 3px;
	border-radius: 8px;
	border: 0.5px solid var(--tl-line-strong);
	background: var(--tl-glass-fill);
	color: var(--tl-ink-soft);
	font-size: 10px;
	line-height: 1.3;
	cursor: pointer;
}
body[data-dsh-tianlight] .tl-frame:hover {
	border-color: var(--tl-accent);
	color: var(--tl-ink);
}
body[data-dsh-tianlight] .tl-frame > img {
	width: 100%;
	aspect-ratio: 16 / 9;
	object-fit: cover;
	border-radius: 6px;
	display: block;
}
body[data-dsh-tianlight] .tl-font-reset:disabled {
	opacity: 0.5;
	cursor: default;
}
body[data-dsh-tianlight] .tl-wall-url {
	display: flex;
	flex-direction: column;
	gap: 8px;
	margin-top: 4px;
}
body[data-dsh-tianlight] .tl-wall-tabs {
	display: flex;
	gap: 6px;
	flex-wrap: wrap;
	align-items: center;
}
body[data-dsh-tianlight] .tl-wall-label {
	font-size: 11px;
	color: var(--tl-ink-soft);
}
body[data-dsh-tianlight] .tl-wall-slider > input:disabled {
	opacity: 0.4;
	cursor: not-allowed;
}
body[data-dsh-tianlight] .tl-wall-textarea {
	width: 100%;
	box-sizing: border-box;
	padding: 6px 10px;
	border-radius: 10px;
	border: 0.5px solid var(--tl-line-strong);
	background: var(--tl-glass-fill);
	color: var(--tl-ink);
	font-family: var(--ds-font-family-code, monospace);
	font-size: 11px;
	resize: vertical;
	outline: none;
}
body[data-dsh-tianlight] .tl-wall-textarea:focus {
	border-color: var(--tl-accent);
}
body[data-dsh-tianlight] .tl-wall-code {
	min-height: 132px;
	white-space: pre;
	tab-size: 2;
}
body[data-dsh-tianlight] .tl-wall-group {
	display: flex;
	flex-direction: column;
	gap: 8px;
	padding: 7px 9px;
	border-radius: 12px;
	border: 0.5px solid var(--tl-line-strong);
	background: color-mix(in srgb, var(--tl-glass-fill) 60%, transparent);
}
body[data-dsh-tianlight] .tl-wall-group > summary {
	display: flex;
	align-items: center;
	gap: 6px;
	cursor: pointer;
	list-style: none;
	font-size: 12px;
	font-weight: 600;
	letter-spacing: 0.04em;
	color: var(--tl-ink);
}
body[data-dsh-tianlight] .tl-wall-step {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	flex: none;
	width: 18px;
	height: 18px;
	border-radius: 50%;
	background: color-mix(in srgb, var(--tl-accent) 18%, transparent);
	color: var(--tl-accent);
	font-size: 10px;
	font-weight: 600;
	letter-spacing: 0;
}
body[data-dsh-tianlight] .tl-wall-group-title {
	flex: 1;
}
body[data-dsh-tianlight] .tl-wall-summary-value {
	margin-left: auto;
	max-width: 120px;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	font-size: 10px;
	font-weight: 400;
	letter-spacing: 0;
	color: var(--tl-ink-faint);
}
body[data-dsh-tianlight] .tl-wall-group > summary::-webkit-details-marker {
	display: none;
}
body[data-dsh-tianlight] .tl-wall-group > summary::after {
	content: " ▾";
	flex: none;
	font-weight: 400;
	color: var(--tl-ink-faint);
}
body[data-dsh-tianlight] .tl-wall-group:not([open]) > summary::after {
	content: " ▸";
}
body[data-dsh-tianlight] .tl-wall-group > *:not(summary) {
	margin-top: 2px;
}
body[data-dsh-tianlight] .tl-font-option[data-tl-disabled] {
	opacity: 0.45;
	cursor: not-allowed;
}
body[data-dsh-tianlight] .tl-wall-slider {
	display: flex;
	flex-direction: column;
	gap: 4px;
	font-size: 11px;
	color: var(--tl-ink-soft);
}
body[data-dsh-tianlight] .tl-wall-slider > input {
	width: 100%;
	accent-color: var(--tl-accent);
	cursor: pointer;
}

/* ---- font panel docked to the right edge (self-owned host) ---- */
body[data-dsh-tianlight] [data-tl-scene] > [data-tl-photo] {
	position: absolute;
	inset: 0;
	background-position: var(--tl-focal-x, 50%) var(--tl-focal-y, 50%);
	background-size: var(--tl-fit-size, cover);
	background-repeat: no-repeat;
	opacity: 0;
	transition: opacity 0.9s ease;
}
body[data-dsh-tianlight] [data-tl-scene] > [data-tl-dim] {
	position: absolute;
	inset: 0;
	pointer-events: none;
	background: rgba(4, 10, 18, var(--tl-zone-dim, 0));
}
/* The workspace rail can show its own framing of the same picture. A canvas mirror
   reuses the single decoded video instead of starting a second decoder. */
body[data-dsh-tianlight] [data-tl-rail] {
	position: fixed;
	top: 0;
	bottom: 0;
	left: 0;
	overflow: hidden;
	pointer-events: none;
	/* Same plane as the wallpaper scene: the app root sits at z-index 1, so anything
	   at 1 would paint OVER the application and hide the sidebar's text. */
	z-index: 0;
	display: none;
	--tl-rail-blur: 0px;
	--tl-rail-dim: 0;
}
body[data-dsh-tianlight] [data-tl-rail][data-tl-on] {
	display: block;
}
body[data-dsh-tianlight] [data-tl-rail] > canvas {
	width: 100%;
	height: 100%;
	display: block;
	filter: blur(var(--tl-rail-blur));
}
body[data-dsh-tianlight] [data-tl-rail] > [data-tl-rail-dim] {
	position: absolute;
	inset: 0;
	background: rgba(4, 10, 18, var(--tl-rail-dim));
	pointer-events: none;
}
body[data-dsh-tianlight] [data-tl-scene] > [data-tl-photo][data-tl-ready] {
	opacity: 1;
}
/* ---- shader channel: a full-screen WebGL canvas between the still layer and the veil ---- */
body[data-dsh-tianlight] [data-tl-scene] > [data-tl-shader] {
	position: absolute;
	inset: 0;
	width: 100%;
	height: 100%;
	display: none;
}
body[data-dsh-tianlight] [data-tl-scene][data-tl-shader-on] > [data-tl-shader] {
	display: block;
}
/* Optional WebWallGL scene channel: same slot as the shader canvas, sandboxed. */
body[data-dsh-tianlight] [data-tl-scene] > [data-tl-scene-frame] {
	position: absolute;
	inset: 0;
	width: 100%;
	height: 100%;
	border: 0;
	background: transparent;
	pointer-events: none;
}
/* ---- overlay stack: two CSS-only layers above the wallpaper, below veil/crest ---- */
body[data-dsh-tianlight] [data-tl-scene] > [data-tl-overlay] {
	position: absolute;
	inset: 0;
	display: none;
	pointer-events: none;
	background-repeat: no-repeat;
	background-position: center;
	opacity: var(--tl-overlay-opacity, 0.55);
	mix-blend-mode: var(--tl-overlay-blend, normal);
}
body[data-dsh-tianlight] [data-tl-scene] > [data-tl-overlay][data-tl-overlay-preset="vignette"] {
	display: block;
	background: radial-gradient(ellipse at center, transparent 42%, rgba(0, 0, 0, 0.55) 100%);
}
body[data-dsh-tianlight] [data-tl-scene] > [data-tl-overlay][data-tl-overlay-preset="grain"] {
	display: block;
	background-image:
		radial-gradient(rgba(255, 255, 255, 0.18) 0.6px, transparent 0.6px),
		radial-gradient(rgba(0, 0, 0, 0.22) 0.6px, transparent 0.6px);
	background-size: 3px 3px, 4px 4px;
	background-position: 0 0, 1px 2px;
}
body[data-dsh-tianlight] [data-tl-scene] > [data-tl-overlay][data-tl-overlay-preset="glow"] {
	display: block;
	background:
		radial-gradient(ellipse at 28% 18%, color-mix(in srgb, var(--tl-accent) 46%, transparent), transparent 60%),
		linear-gradient(125deg, transparent 45%, color-mix(in srgb, var(--tl-accent) 28%, transparent) 100%);
}
body[data-dsh-tianlight] [data-tl-scene] > [data-tl-overlay][data-tl-overlay-preset="scan"] {
	display: block;
	background: repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.2) 0 1px, transparent 1px 3px);
}
body[data-dsh-tianlight] [data-tl-scene] > [data-tl-overlay][data-tl-overlay-image] {
	display: block;
}
/* ---- ratio-locked crop window ----
   The crop is expressed in source-normalised coordinates; the media is scaled up and
   offset so exactly that window fills the frame. A preset ratio makes width/height
   differ, which is what keeps the visible window from drifting off-ratio. */
body[data-dsh-tianlight] [data-tl-scene] > video,
body[data-dsh-tianlight] [data-tl-scene] > [data-tl-photo] {
	inset: auto;
	left: calc(-100% * var(--crop-x, 0) / var(--crop-w, 1));
	top: calc(-100% * var(--crop-y, 0) / var(--crop-h, 1));
	width: calc(100% / var(--crop-w, 1));
	height: calc(100% / var(--crop-h, 1));
}
body[data-dsh-tianlight] .tl-font-select,
body[data-dsh-tianlight] .tl-font-input {
	width: 100%;
	box-sizing: border-box;
	padding: 6px 10px;
	border-radius: 10px;
	border: 0.5px solid var(--tl-line-strong);
	background: var(--tl-glass-fill);
	color: var(--tl-ink);
	font-size: 12px;
	outline: none;
}
body[data-dsh-tianlight] .tl-font-select:focus,
body[data-dsh-tianlight] .tl-font-input:focus {
	border-color: var(--tl-accent);
}
body[data-dsh-tianlight] [data-tl-font-panel] {
	position: fixed;
	right: 16px;
	top: 12vh;
	z-index: 60;
	width: 300px;
	max-width: calc(100vw - 32px);
	max-height: min(82vh, 660px);
	border-radius: 18px;
	background: var(--tl-panel-fill);
	border: 0.5px solid var(--tl-glass-line);
	box-shadow: 0 18px 48px rgba(8, 26, 48, 0.28);
	color: var(--tl-ink);
	overflow: hidden;
}
body[data-dsh-tianlight][data-ds-dark-theme] [data-tl-font-panel] {
	box-shadow: 0 18px 48px rgba(0, 0, 0, 0.55);
}
body[data-dsh-tianlight] [data-tl-font-panel][hidden] {
	display: none;
}
body[data-dsh-tianlight] .tl-font-panel {
	box-sizing: border-box;
	max-height: min(82vh, 660px);
	overflow-y: auto;
	padding: 14px 16px;
	display: flex;
	flex-direction: column;
	gap: 12px;
	color: var(--tl-ink);
}
body[data-dsh-tianlight] .tl-font-heading {
	display: flex;
	flex-direction: column;
	gap: 2px;
	min-width: 0;
}
body[data-dsh-tianlight] .tl-font-subtitle {
	font-size: 10px;
	line-height: 1.3;
	color: var(--tl-ink-faint);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}
body[data-dsh-tianlight] .tl-font-preview {
	display: flex;
	flex-direction: column;
	gap: 3px;
	padding: 8px 10px;
	border-radius: 10px;
	border: 0.5px dashed var(--tl-line-strong);
	background: color-mix(in srgb, var(--tl-glass-fill) 65%, transparent);
	color: var(--tl-ink);
}
body[data-dsh-tianlight] .tl-font-preview-line {
	line-height: 1.35;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}
body[data-dsh-tianlight] .tl-font-preview-note {
	font-size: 10px;
	line-height: 1.35;
	color: var(--tl-ink-faint);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}
body[data-dsh-tianlight] .tl-font-section {
	display: flex;
	flex-direction: column;
	gap: 9px;
	padding: 8px 10px;
	border-radius: 12px;
	border: 0.5px solid var(--tl-line-strong);
	background: color-mix(in srgb, var(--tl-glass-fill) 55%, transparent);
}
body[data-dsh-tianlight] .tl-font-section-title {
	font-size: 10px;
	font-weight: 600;
	letter-spacing: 0.12em;
	color: var(--tl-ink-faint);
}
body[data-dsh-tianlight] .tl-font-title {
	font-size: 13px;
	font-weight: 600;
	letter-spacing: 0.06em;
}
body[data-dsh-tianlight] .tl-font-head {
	position: sticky;
	top: 0;
	z-index: 1;
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 10px;
	padding-bottom: 6px;
	background: var(--tl-panel-fill);
	cursor: grab;
	user-select: none;
	touch-action: none;
}
body[data-dsh-tianlight] [data-tl-dragging] {
	user-select: none;
}
body[data-dsh-tianlight] [data-tl-dragging] .tl-font-head {
	cursor: grabbing;
}
body[data-dsh-tianlight] .tl-font-close {
	width: 22px;
	height: 22px;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	border-radius: 8px;
	border: 0.5px solid transparent;
	background: transparent;
	color: var(--tl-ink-soft);
	font-size: 15px;
	line-height: 1;
	cursor: pointer;
}
body[data-dsh-tianlight] .tl-font-close:hover {
	background: var(--tl-accent-soft);
	border-color: var(--tl-line-strong);
	color: var(--tl-ink);
}
body[data-dsh-tianlight] .tl-font-row {
	display: flex;
	flex-direction: column;
	gap: 7px;
}
body[data-dsh-tianlight] .tl-font-label {
	font-size: 12px;
	color: var(--tl-ink-soft);
}
body[data-dsh-tianlight] .tl-font-slider {
	display: flex;
	align-items: center;
	gap: 10px;
}
body[data-dsh-tianlight] .tl-font-range {
	-webkit-appearance: none;
	appearance: none;
	flex: 1;
	min-width: 0;
	height: 10px;
	border-radius: 999px;
	border: 0.5px solid var(--tl-glass-line);
	/* Glass track: a bright top bevel and a soft bottom shade read as a curved tube. */
	box-shadow:
		inset 0 1px 2px rgba(255, 255, 255, 0.55),
		inset 0 -1px 3px rgba(28, 66, 116, 0.20);
	cursor: pointer;
	outline: none;
}
body[data-dsh-tianlight][data-ds-dark-theme] .tl-font-range {
	box-shadow:
		inset 0 1px 2px rgba(255, 255, 255, 0.22),
		inset 0 -1px 3px rgba(0, 0, 0, 0.42);
}
body[data-dsh-tianlight] .tl-font-range::-webkit-slider-thumb {
	-webkit-appearance: none;
	appearance: none;
	width: 18px;
	height: 18px;
	border-radius: 50%;
	border: 0.5px solid rgba(255, 255, 255, 0.92);
	/* Highlight radial over a gradient body: a polished glass bead, not a flat dot. */
	background:
		radial-gradient(circle at 32% 26%, rgba(255, 255, 255, 0.98) 0%, rgba(255, 255, 255, 0.34) 40%, transparent 62%),
		linear-gradient(150deg, color-mix(in srgb, var(--tl-accent) 72%, #ffffff), var(--tl-accent));
	box-shadow:
		0 2px 8px rgba(18, 58, 108, 0.30),
		0 0 0 3px color-mix(in srgb, var(--tl-accent) 18%, transparent),
		inset 0 -1px 2px rgba(10, 40, 80, 0.28);
	cursor: grab;
	transition: box-shadow 0.18s ease, transform 0.18s ease;
}
body[data-dsh-tianlight][data-ds-dark-theme] .tl-font-range::-webkit-slider-thumb {
	border-color: rgba(210, 232, 255, 0.55);
	box-shadow:
		0 2px 10px rgba(0, 0, 0, 0.55),
		0 0 0 3px color-mix(in srgb, var(--tl-accent) 24%, transparent),
		inset 0 -1px 2px rgba(0, 0, 0, 0.40);
}
body[data-dsh-tianlight] .tl-font-range:active::-webkit-slider-thumb {
	cursor: grabbing;
	transform: scale(1.08);
	box-shadow:
		0 3px 14px rgba(18, 58, 108, 0.36),
		0 0 0 5px color-mix(in srgb, var(--tl-accent) 22%, transparent),
		inset 0 -1px 2px rgba(10, 40, 80, 0.28);
}
body[data-dsh-tianlight] .tl-font-range:focus-visible {
	box-shadow:
		inset 0 1px 2px rgba(255, 255, 255, 0.55),
		0 0 0 3px color-mix(in srgb, var(--tl-accent) 28%, transparent);
}
body[data-dsh-tianlight] .tl-font-range::-moz-range-thumb {
	width: 18px;
	height: 18px;
	border-radius: 50%;
	border: 0.5px solid rgba(255, 255, 255, 0.85);
	background: linear-gradient(150deg, color-mix(in srgb, var(--tl-accent) 72%, #ffffff), var(--tl-accent));
	box-shadow: 0 2px 8px rgba(18, 58, 108, 0.30);
	cursor: grab;
}
body[data-dsh-tianlight] .tl-font-value {
	min-width: 46px;
	text-align: right;
	font-size: 12px;
	font-variant-numeric: tabular-nums;
	color: var(--tl-ink);
}
body[data-dsh-tianlight] .tl-font-reset {
	margin-top: 2px;
	padding: 6px 0;
	border-radius: 10px;
	border: 0.5px solid var(--tl-line-strong);
	background: transparent;
	color: var(--tl-ink-soft);
	font-size: 12px;
	cursor: pointer;
}
body[data-dsh-tianlight] .tl-font-reset:hover {
	background: var(--tl-accent-soft);
	color: var(--tl-ink);
}
body[data-dsh-tianlight] .tl-font-options {
	display: flex;
	flex-wrap: wrap;
	gap: 6px;
}
body[data-dsh-tianlight] .tl-font-option {
	padding: 4px 12px;
	border-radius: 999px;
	border: 0.5px solid var(--tl-line-strong);
	background: transparent;
	color: var(--tl-ink-soft);
	font-size: 12px;
	line-height: 1.4;
	cursor: pointer;
}
body[data-dsh-tianlight] .tl-font-option[data-active] {
	background: var(--tl-accent-soft);
	border-color: var(--tl-accent);
	color: var(--tl-ink);
}
body[data-dsh-tianlight] .tl-font-option:disabled {
	opacity: 0.5;
	cursor: default;
}
body[data-dsh-tianlight] .tl-font-option[data-tone="warn"] {
	border-color: color-mix(in srgb, #e8b45a 55%, var(--tl-line-strong));
	color: var(--tl-ink);
}
body[data-dsh-tianlight] .tl-font-option[data-tone="alert"] {
	border-color: color-mix(in srgb, #e8776b 55%, var(--tl-line-strong));
	color: var(--tl-ink);
}
body[data-dsh-tianlight] [data-tl-wall] button:focus-visible,
body[data-dsh-tianlight] [data-tl-wall] summary:focus-visible,
body[data-dsh-tianlight] [data-tl-wall] input:focus-visible,
body[data-dsh-tianlight] [data-tl-wall] textarea:focus-visible,
body[data-dsh-tianlight] [data-tl-wall] select:focus-visible,
body[data-dsh-tianlight] [data-tl-font-panel] button:focus-visible,
body[data-dsh-tianlight] [data-tl-font-panel] input:focus-visible {
	outline: 2px solid var(--tl-accent);
	outline-offset: 2px;
}
body[data-dsh-tianlight] .tl-font-trigger {
	flex: none;
	min-width: 28px;
	height: 26px;
	padding: 0 8px;
	border-radius: 999px;
	border: 0.5px solid var(--tl-line-strong);
	background: transparent;
	color: var(--tl-ink-soft);
	font-size: 12px;
	line-height: 1;
	cursor: pointer;
}
body[data-dsh-tianlight] .tl-font-trigger:hover {
	background: var(--tl-accent-soft);
	color: var(--tl-ink);
}

/* ---- upgrade-proof equivalents, stamped by installSelectorBridge ----
   The hashed selectors above stay the primary path. These repeat the same intent on
   attributes the skin owns, so a DSH build that renames a module hash only loses the
   primary selector — the surface stays styled. */
body[data-dsh-tianlight] [data-tl-composer] {
	background: var(--tl-glass-fill) !important;
	border: 0.5px solid var(--tl-glass-line) !important;
	box-shadow: 0 10px 34px rgba(8, 28, 52, 0.22) !important;
	position: relative;
	isolation: isolate;
}
body[data-dsh-tianlight][data-ds-dark-theme] [data-tl-composer] {
	box-shadow: 0 10px 34px rgba(0, 0, 0, 0.45) !important;
}
body[data-dsh-tianlight] [data-tl-settings] {
	background: var(--tl-panel-fill) !important;
	border: 0.5px solid var(--tl-glass-line);
	box-shadow:
		0 18px 60px rgba(8, 26, 48, 0.28),
		inset 0 1px 0 var(--tl-glass-line);
}
body[data-dsh-tianlight][data-ds-dark-theme] [data-tl-settings] {
	box-shadow:
		0 18px 60px rgba(0, 0, 0, 0.55),
		inset 0 1px 0 var(--tl-glass-line);
}
body[data-dsh-tianlight] [data-tl-sidebar] {
	background: transparent !important;
	background-image: none !important;
}
body[data-dsh-tianlight] [data-tl-bubble],
body[data-dsh-tianlight] [data-tl-menu] {
	background: var(--tl-glass-fill) !important;
	border: 0.5px solid var(--tl-glass-line);
}

/* ---- the remaining surfaces, frosted ----
   Same glass treatment for the components whose background used to be an opaque
   token: message bubbles, popovers, code/tool output cards, choice selectors.
   Selectors are build-hashed: a DSH rename costs the blur (the translucency from
   the token overrides above still applies), it never breaks layout. */
body[data-dsh-tianlight] :is(
	.Sixlwa_bubble, .oRe1gG_bubble, .ROF66W_bubble,
	.QsffPG_menu, .JObwrW_panel
) {
	-webkit-backdrop-filter: blur(var(--tl-glass-blur)) saturate(1.2);
	backdrop-filter: blur(var(--tl-glass-blur)) saturate(1.2);
}

/* ---- light reflow: rhythm, radii, surfaces ---- */
body[data-dsh-tianlight] ::-webkit-scrollbar {
	width: 10px;
	height: 10px;
}
body[data-dsh-tianlight] ::-webkit-scrollbar-track {
	background: transparent;
}
body[data-dsh-tianlight] ::-webkit-scrollbar-thumb {
	background: var(--tl-line-strong);
	border: 3px solid transparent;
	border-radius: 999px;
	background-clip: padding-box;
}
body[data-dsh-tianlight] ::-webkit-scrollbar-thumb:hover {
	background: var(--tl-accent);
	background-clip: padding-box;
}
body[data-dsh-tianlight] ::selection {
	background: var(--tl-accent-soft);
	color: var(--tl-ink);
}
body[data-dsh-tianlight] :focus-visible {
	outline-color: var(--tl-accent) !important;
}

/* ---- companion: a mint chibi cat that lives on top of the workbench ---- */
body[data-dsh-tianlight] [data-tl-cat] {
	position: fixed;
	z-index: 95;
	width: 150px;
	height: 86px;
	touch-action: none;
	cursor: grab;
	user-select: none;
	-webkit-user-select: none;
	will-change: transform;
	filter: drop-shadow(0 10px 18px rgba(8, 26, 44, 0.28));
}
body[data-dsh-tianlight] [data-tl-cat][data-tl-dragging] {
	cursor: grabbing;
	filter: drop-shadow(0 16px 26px rgba(8, 26, 44, 0.38));
}
body[data-dsh-tianlight] [data-tl-cat] > [data-tl-cat-body] {
	position: absolute;
	inset: 0;
	display: grid;
	place-items: center;
	transform-origin: 50% 92%;
	transition: transform 220ms cubic-bezier(0.34, 1.56, 0.64, 1);
	animation: tl-breathe 4.2s ease-in-out infinite;
}
body[data-dsh-tianlight] [data-tl-cat] > [data-tl-cat-body] > img {
	width: 100%;
	height: 100%;
	object-fit: contain;
	pointer-events: none;
	-webkit-user-drag: none;
}
body[data-dsh-tianlight] [data-tl-cat][data-tl-near] > [data-tl-cat-body] {
	transform: rotate(calc(var(--tl-look, 0) * 7deg)) translateY(-2px) scale(1.04);
}
body[data-dsh-tianlight] [data-tl-cat][data-tl-dragging] > [data-tl-cat-body] {
	transform: scale(1.09) rotate(calc(var(--tl-look, 0) * 3deg));
	animation-play-state: paused;
}
body[data-dsh-tianlight] [data-tl-cat][data-tl-sleeping] > [data-tl-cat-body] {
	animation: tl-doze 3.4s ease-in-out infinite;
	transform: rotate(-4deg) scale(0.98);
	opacity: 0.92;
}
body[data-dsh-tianlight] [data-tl-cat][data-tl-sleeping]::after {
	content: "z z Z";
	position: absolute;
	top: -6px;
	right: -6px;
	font: 600 12px/1 var(--ds-font-family, system-ui);
	color: var(--tl-accent);
	opacity: 0.85;
	animation: tl-float 2.6s ease-in-out infinite;
}
body[data-dsh-tianlight] [data-tl-cat][data-tl-near]::before {
	content: "";
	position: absolute;
	inset: 8px;
	border-radius: 50%;
	background: radial-gradient(circle, var(--tl-glow) 0%, transparent 70%);
	opacity: 0.5;
	filter: blur(6px);
}
body[data-dsh-tianlight] [data-tl-cat] > [data-tl-bubble] {
	position: absolute;
	bottom: calc(100% + 10px);
	left: 50%;
	transform: translateX(-50%) translateY(4px);
	max-width: 190px;
	width: max-content;
	padding: 7px 11px;
	border-radius: 14px;
	background: var(--tl-overlay);
	color: var(--tl-ink);
	font: 500 12px/1.45 var(--ds-font-family, system-ui);
	text-align: center;
	white-space: pre-wrap;
	box-shadow: 0 6px 20px rgba(8, 26, 44, 0.18);
	border: 0.5px solid var(--tl-line);
	opacity: 0;
	pointer-events: none;
	transition: opacity 180ms ease, transform 180ms ease;
}
body[data-dsh-tianlight] [data-tl-cat] > [data-tl-bubble][data-tl-show] {
	opacity: 1;
	transform: translateX(-50%) translateY(0);
}
body[data-dsh-tianlight] [data-tl-cat] > [data-tl-menu] {
	position: absolute;
	top: calc(100% + 8px);
	left: 50%;
	transform: translateX(-50%) translateY(-4px);
	display: flex;
	gap: 4px;
	padding: 5px;
	border-radius: 999px;
	background: var(--tl-overlay);
	border: 0.5px solid var(--tl-line);
	box-shadow: 0 10px 26px rgba(8, 26, 44, 0.22);
	opacity: 0;
	pointer-events: none;
	transition: opacity 160ms ease, transform 160ms ease;
}
body[data-dsh-tianlight] [data-tl-cat] > [data-tl-menu][data-tl-show] {
	opacity: 1;
	transform: translateX(-50%) translateY(0);
	pointer-events: auto;
}
body[data-dsh-tianlight] [data-tl-cat] > [data-tl-menu] > button {
	appearance: none;
	border: 0;
	background: transparent;
	color: var(--tl-ink-soft);
	font: 500 12px/1 var(--ds-font-family, system-ui);
	padding: 6px 9px;
	border-radius: 999px;
	cursor: pointer;
	white-space: nowrap;
}
body[data-dsh-tianlight] [data-tl-cat] > [data-tl-menu] > button:hover {
	background: var(--tl-accent-soft);
	color: var(--tl-ink);
}

@keyframes tl-breathe {
	0%, 100% { transform: scale(1); }
	50% { transform: scale(1.022); }
}
@keyframes tl-doze {
	0%, 100% { transform: rotate(-4deg) scale(0.98); }
	50% { transform: rotate(-2deg) scale(0.955); }
}
@keyframes tl-float {
	0%, 100% { transform: translateY(0); opacity: 0.5; }
	50% { transform: translateY(-7px); opacity: 0.9; }
}

@media (prefers-reduced-motion: reduce) {
	body[data-dsh-tianlight] [data-tl-cat] > [data-tl-cat-body],
	body[data-dsh-tianlight] [data-tl-cat][data-tl-sleeping] > [data-tl-cat-body],
	body[data-dsh-tianlight] [data-tl-cat][data-tl-sleeping]::after {
		animation: none !important;
	}
}

/* ---- low power: freeze decorative animation while the wallpaper is parked ----
   The supervisor pauses the moving wallpaper and its rail mirror; these rules keep
   the remaining CSS animation off the compositor so the saving is real. */
body[data-dsh-tianlight][data-tl-lowpower] [data-tl-cat] > [data-tl-cat-body],
body[data-dsh-tianlight][data-tl-lowpower] [data-tl-cat][data-tl-sleeping] > [data-tl-cat-body] {
	animation-play-state: paused;
}
body[data-dsh-tianlight][data-tl-lowpower] [data-tl-cat][data-tl-sleeping]::after {
	animation: none;
}
`;

		/** Injected once per page; every rule is scoped to the skin's body attribute. */
		function installStyles() {
			if (typeof document === "undefined") return () => {};
			const existing = document.querySelector(
				"style[data-plugin-css=" + JSON.stringify(CSS_TAG_ID) + "]",
			);
			if (existing !== null) return () => {};
			const tag = document.createElement("style");
			tag.dataset.plugin = PLUGIN_ID;
			tag.dataset.pluginCss = CSS_TAG_ID;
			tag.textContent = CSS;
			document.head.appendChild(tag);
			return () => {
				tag.remove();
			};
		}
		//#endregion

		//#region wallpaper
		/** Inline SVG: a corner "dawn burst" so the top-left reads as sky light. */
		const CREST_SVG =
			"<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'>" +
			"<defs>" +
			"<radialGradient id='c' cx='50%' cy='50%' r='50%'>" +
			"<stop offset='0' stop-color='#ffffff' stop-opacity='.95'/>" +
			"<stop offset='.35' stop-color='#cfeaff' stop-opacity='.55'/>" +
			"<stop offset='1' stop-color='#9fd0ff' stop-opacity='0'/>" +
			"</radialGradient>" +
			"<linearGradient id='r' x1='0' y1='1' x2='1' y2='0'>" +
			"<stop offset='0' stop-color='#ffffff' stop-opacity='.55'/>" +
			"<stop offset='1' stop-color='#bfe4ff' stop-opacity='0'/>" +
			"</linearGradient>" +
			"</defs>" +
			"<circle cx='100' cy='100' r='100' fill='url(#c)'/>" +
			"<g stroke='url(#r)' stroke-linecap='round'>" +
			"<path d='M100 100 L196 46' stroke-width='7'/>" +
			"<path d='M100 100 L188 92' stroke-width='4'/>" +
			"<path d='M100 100 L170 148' stroke-width='3'/>" +
			"<path d='M100 100 L118 196' stroke-width='5'/>" +
			"</g>" +
			"<circle cx='100' cy='100' r='16' fill='#ffffff' fill-opacity='.85'/>" +
			"</svg>";

		/** One shared manifest read per page: which optional assets actually exist. */
		let manifestPromise = null;
		function readAssets() {
			if (manifestPromise !== null) return manifestPromise;
			manifestPromise = fetch(ASSET_BASE + "/_manifest", { cache: "no-store" })
				.then((response) => (response.ok ? response.json() : null))
				.then((value) => (Array.isArray(value?.assets) ? value.assets : null))
				.catch(() => null);
			return manifestPromise;
		}

		async function resolveVideoSource() {
			const assets = await readAssets();
			const probe = document.createElement("video");
			const playable = (candidate) =>
				candidate.codec === undefined || probe.canPlayType(candidate.codec) !== "";
			const usable = VIDEO_CANDIDATES.filter(
				(candidate) => playable(candidate) && (assets === null || assets.includes(candidate.file)),
			);
			if (usable.length > 0) return ASSET_BASE + "/" + usable[0].file;
			// Nothing probed playable: still point at the first uploaded file so the
			// error path (and its codec diagnostic) can fire instead of staying blank.
			if (assets !== null) {
				const present = VIDEO_CANDIDATES.find((candidate) => assets.includes(candidate.file));
				return present === undefined ? null : ASSET_BASE + "/" + present.file;
			}
			return ASSET_BASE + "/" + VIDEO_CANDIDATES[0].file;
		}

		/** User's wallpaper choice: `{ kind: "video"|"image", url }`, absent = automatic. */
		/**
		 * Wallpaper source providers. A provider is a source of frames; the scene renders
		 * video, image and the ShaderToy-style GLSL channel today. URL and ShaderToy are
		 * configured in the panel rather than listed as files.
		 *
		 * Adding one: set `available: true`, give `kind`, and teach applyWallpaper how to
		 * mount it.
		 */
		const PROVIDERS = [
			{ id: "local", label: "本地壁纸", kind: "video", available: true, desc: "assets/ 里的图片或视频", note: "把图片/视频放进 skin-tianlight/assets/，刷新页面即可" },
			{ id: "url", label: "URL 地址", kind: "video", available: true, desc: "粘贴图片/视频网址", note: "支持能直接打开的 http(s) 图片或视频地址" },
			// Clickable: opens the project-directory editor. It is not a frame source
			// itself, so `kind` stays null and its note explains what it can and cannot do.
			{ id: "we", label: "Wallpaper Engine", kind: null, available: true, desc: "读取 WE 项目目录（可选）", note: "视频/图片直接读；场景目录走内置 WebWallGL（失败自动降级）" },
			{ id: "shader", label: "ShaderToy 代码", kind: "shader", available: true, desc: "GLSL 实时壁纸，可改代码", note: "本地 GLSL 运行时：iTime / iResolution / iMouse + 速度/强度/色相；不抓取网站源码" },
		];
		/** Kinds the scene can actually render today. */
		const RENDERABLE_KINDS = new Set(["video", "image", "shader", "scene"]);

		/**
		 * Validates a choice before it reaches the scene. Returns the reason instead of
		 * silently doing nothing, so an unsupported provider is visible in the UI.
		 */
		function resolveWallpaperChoice(choice) {
			if (choice === null || typeof choice !== "object") return { ok: false, reason: "没有选择壁纸" };
			if (!RENDERABLE_KINDS.has(choice.kind)) {
				const provider = PROVIDERS.find((entry) => entry.kind === choice.kind);
				return { ok: false, reason: provider === undefined ? "不支持的壁纸类型" : provider.label + "：" + provider.note };
			}
			if (typeof choice.url !== "string" || choice.url === "") return { ok: false, reason: "壁纸缺少地址" };
			const still =
				choice.kind === "video" && Number.isFinite(choice.still) && choice.still >= 0 ? choice.still : undefined;
			return { ok: true, choice: { kind: choice.kind, url: choice.url, ...(still === undefined ? {} : { still }) } };
		}

		/** Live scene playback hook, used by the low-power supervisor. */
		let scenePlayback = null;
		const WALLPAPER_KEY = "tianlight.wallpaper";
		/** Live scene hook, so the panel can swap the wallpaper without a reload. */
		let wallpaperController = null;

		function readWallpaperChoice() {
			try {
				const raw = globalThis.localStorage.getItem(WALLPAPER_KEY);
				if (raw === null || raw === "") return null;
				const parsed = JSON.parse(raw);
				if (parsed === null || typeof parsed !== "object") return null;
				if (typeof parsed.url !== "string" || parsed.url === "") return null;
				const kind = parsed.kind === "image" ? "image" : parsed.kind === "shader" ? "shader" : parsed.kind === "scene" ? "scene" : "video";
				const still = kind === "video" && Number.isFinite(parsed.still) && parsed.still >= 0 ? parsed.still : undefined;
				return { kind, url: parsed.url, ...(still === undefined ? {} : { still }) };
			} catch {
				return null;
			}
		}

		function saveWallpaperChoice(choice) {
			try {
				if (choice === null) globalThis.localStorage.removeItem(WALLPAPER_KEY);
				else globalThis.localStorage.setItem(WALLPAPER_KEY, JSON.stringify(choice));
			} catch {
				// storage may be blocked; the scene still switches for this session
			}
		}

		/**
		 * Wallpaper overlay stack (v2: two CSS-only slots). No media decode and no
		 * timers; the scene divs are painted from this model and the panel edits it.
		 * A v1 single-object value still loads as slot A.
		 */
		const LAYERS_KEY = "tianlight.layers";
		const LAYER_PRESETS = ["none", "vignette", "grain", "glow", "scan"];
		const LAYER_BLENDS = ["normal", "overlay", "screen", "multiply"];
		const LAYER_FITS = ["cover", "contain", "stretch"];
		const LAYER_LABELS = { none: "无", vignette: "暗角", grain: "颗粒", glow: "光晕", scan: "扫描线" };
		const LAYER_BLEND_LABELS = { normal: "正常", overlay: "叠加", screen: "滤色", multiply: "正片叠底" };
		const LAYER_SLOT_DEFAULTS = { kind: "none", preset: "none", url: "", fit: "cover", opacity: 0.55, blend: "normal" };
		function defaultLayerSlot() {
			return { ...LAYER_SLOT_DEFAULTS };
		}
		function normalizeLayerSlot(value) {
			const slot = defaultLayerSlot();
			if (value === null || typeof value !== "object") return slot;
			if (value.kind === "none" || value.kind === "preset" || value.kind === "image") slot.kind = value.kind;
			else if (value.kind === undefined && typeof value.preset === "string") slot.kind = value.preset === "none" ? "none" : "preset";
			if (LAYER_PRESETS.includes(value.preset)) slot.preset = value.preset;
			if (typeof value.url === "string") slot.url = value.url;
			if (LAYER_FITS.includes(value.fit)) slot.fit = value.fit;
			if (LAYER_BLENDS.includes(value.blend)) slot.blend = value.blend;
			if (Number.isFinite(value.opacity)) slot.opacity = Math.min(1, Math.max(0, value.opacity));
			return slot;
		}
		function normalizeLayers(value) {
			const slots = [defaultLayerSlot(), defaultLayerSlot()];
			if (Array.isArray(value)) {
				slots[0] = normalizeLayerSlot(value[0]);
				slots[1] = normalizeLayerSlot(value[1]);
			} else if (value !== null && typeof value === "object") {
				if (Array.isArray(value.slots)) {
					slots[0] = normalizeLayerSlot(value.slots[0]);
					slots[1] = normalizeLayerSlot(value.slots[1]);
				} else {
					// v1: one overlay object.
					slots[0] = normalizeLayerSlot(value);
				}
			}
			return { version: 2, slots };
		}
		function readLayers() {
			try {
				const raw = JSON.parse(globalThis.localStorage.getItem(LAYERS_KEY) ?? "null");
				return normalizeLayers(raw);
			} catch {
				return normalizeLayers(null);
			}
		}
		function saveLayers(value) {
			try {
				globalThis.localStorage.setItem(LAYERS_KEY, JSON.stringify(value));
			} catch {
				// storage may be blocked; the overlay still applies for this session
			}
		}
		function paintOverlay(div, slot) {
			if (div === null || div === undefined) return;
			div.removeAttribute("data-tl-overlay-preset");
			div.removeAttribute("data-tl-overlay-image");
			div.style.removeProperty("background-image");
			div.style.removeProperty("background-size");
			div.style.setProperty("--tl-overlay-opacity", "0.55");
			div.style.setProperty("--tl-overlay-blend", "normal");
			div.style.display = "none";
			if (slot === null || slot.kind === "none") return;
			div.style.setProperty("--tl-overlay-opacity", String(slot.opacity));
			div.style.setProperty("--tl-overlay-blend", slot.blend);
			if (slot.kind === "image" && slot.url !== "") {
				div.setAttribute("data-tl-overlay-image", "");
				div.style.backgroundImage = 'url("' + slot.url.replace(/["\\)]/g, "") + '")';
				div.style.backgroundSize = slot.fit === "contain" ? "contain" : slot.fit === "stretch" ? "100% 100%" : "cover";
				div.style.display = "block";
				return;
			}
			if (slot.kind === "preset" && slot.preset !== "none") {
				div.setAttribute("data-tl-overlay-preset", slot.preset);
				div.style.display = "block";
			}
		}
		function applyLayers(scene, value) {
			if (scene === null || scene === undefined) return;
			const slots = Array.isArray(value?.slots) ? value.slots : [];
			paintOverlay(scene.querySelector('[data-tl-overlay-slot="0"]'), slots[0] ?? null);
			paintOverlay(scene.querySelector('[data-tl-overlay-slot="1"]'), slots[1] ?? null);
		}
		const layerController = {
			read: readLayers,
			apply: (value) => {
				const clean = normalizeLayers(value);
				saveLayers(clean);
				applyLayers(document.querySelector("[data-tl-scene]"), clean);
				return clean;
			},
		};

		/**
		 * Video playback preferences. Speed and mirroring are safe CSS/media properties;
		 * they do not add a second decoder and do not cap the source frame rate.
		 */
		const PLAYBACK_KEY = "tianlight.playback";
		const PLAYBACK_SPEEDS = [0.5, 1, 1.25, 1.5];
		const FILTER_DEFAULTS = { on: false, brightness: 100, contrast: 100, saturate: 100 };
		const PLAYBACK_DEFAULTS = { speed: 1, flip: false, paused: false, filter: { ...FILTER_DEFAULTS } };
		function normalizeFilter(value) {
			const filter = { ...FILTER_DEFAULTS };
			if (value === null || typeof value !== "object") return filter;
			if (value.on === true) filter.on = true;
			for (const key of ["brightness", "contrast", "saturate"]) {
				const number = Number(value[key]);
				if (Number.isFinite(number)) filter[key] = Math.min(150, Math.max(50, Math.round(number)));
			}
			return filter;
		}
		function normalizePlayback(value) {
			const model = { ...PLAYBACK_DEFAULTS, filter: { ...FILTER_DEFAULTS } };
			if (value !== null && typeof value === "object") {
				if (PLAYBACK_SPEEDS.includes(value.speed)) model.speed = value.speed;
				if (typeof value.flip === "boolean") model.flip = value.flip;
				if (typeof value.paused === "boolean") model.paused = value.paused;
				model.filter = normalizeFilter(value.filter);
			}
			return model;
		}
		function readPlayback() {
			try {
				return normalizePlayback(JSON.parse(globalThis.localStorage.getItem(PLAYBACK_KEY) ?? "null"));
			} catch {
				return normalizePlayback(null);
			}
		}
		function applyPlayback(scene, value) {
			const video = scene === null || scene === undefined ? null : scene.querySelector("video");
			if (video !== null) {
				try {
					video.playbackRate = value.speed;
				} catch {
					// some browsers refuse rate changes before metadata; retry on play
				}
				if (value.flip) video.style.transform = "scaleX(-1) translateZ(0)";
				else video.style.removeProperty("transform");
			}
			if (scene === null || scene === undefined) return;
			const filter = value.filter;
			scene.style.setProperty("--tl-f-brightness", String(filter.brightness / 100));
			scene.style.setProperty("--tl-f-contrast", String(filter.contrast / 100));
			scene.style.setProperty("--tl-f-saturate", String(filter.saturate / 100));
			// The attribute gates the CSS filter: at neutral values no filter path is
			// created at all, which is what keeps an unfiltered wallpaper at full rate.
			if (filter.on) scene.setAttribute("data-tl-filter", "");
			else scene.removeAttribute("data-tl-filter");
		}
		const playbackController = {
			read: readPlayback,
			apply: (value) => {
				const clean = normalizePlayback(value);
				try {
					globalThis.localStorage.setItem(PLAYBACK_KEY, JSON.stringify(clean));
				} catch {
					// persistence is optional
				}
				applyPlayback(document.querySelector("[data-tl-scene]"), clean);
				// A persisted pause is authoritative: one place decides both the DOM and
				// the saved flag, so the panel toggle can never disagree with a reload.
				if (scenePlayback !== null) {
					if (clean.paused) scenePlayback.pause("user");
					else scenePlayback.resume();
				}
				return clean;
			},
		};

		/**
		 * Live playback status, shared by the scene and the panel. Settings have
		 * controllers because they persist; this is ephemeral runtime truth, so it gets
		 * a tiny broadcast bus instead. A closed panel costs one Set lookup; an open one
		 * never has to poll the DOM to know whether the wallpaper is actually moving.
		 *
		 * Status vocabulary (deliberately small, the panel maps each to one sentence):
		 *   idle      nothing selected
		 *   loading   fetching/decoding; no frame yet
		 *   ready     frame available, not (yet) moving
		 *   playing   frames are reaching the screen
		 *   paused    paused on purpose (user or visibility)
		 *   blocked   the browser refused autoplay; a gesture will unlock it
		 *   stalled   playing was requested but no frame arrived for a while
		 *   still     a static frame is pinned
		 *   lowpower  the low-power supervisor parked playback
		 *   hidden    the page is hidden
		 *   error     decode/play failure (reason carries the codec/error name)
		 */
		let sceneStatus = { status: "idle", reason: "", fps: 0, jitter: 0 };
		const sceneStatusSubscribers = new Set();
		function publishSceneStatus(patch) {
			const next = { ...sceneStatus, ...patch };
			if (
				next.status === sceneStatus.status &&
				next.reason === sceneStatus.reason &&
				next.fps === sceneStatus.fps &&
				next.jitter === sceneStatus.jitter
			) {
				return;
			}
			sceneStatus = next;
			for (const subscriber of [...sceneStatusSubscribers]) {
				try {
					subscriber(next);
				} catch (error) {
					note("status:subscriber", error);
				}
			}
		}
		const sceneStatusController = {
			read: () => sceneStatus,
			subscribe: (listener) => {
				if (typeof listener !== "function") return () => {};
				sceneStatusSubscribers.add(listener);
				listener(sceneStatus);
				return () => {
					sceneStatusSubscribers.delete(listener);
				};
			},
		};

		/**
		 * Per-wallpaper library metadata: favourite flag and free-form tags, keyed by
		 * URL. UI-only state, so it never enters a recipe. Every write goes through this
		 * controller; the panel never touches localStorage directly.
		 */
		const LIBRARY_KEY = "tianlight.library";
		const LIBRARY_TAG_LENGTH = 12;
		const LIBRARY_TAG_MAX = 6;

		function readLibrary() {
			const model = { items: {} };
			try {
				const raw = JSON.parse(globalThis.localStorage.getItem(LIBRARY_KEY) ?? "null");
				const stored = raw === null || typeof raw !== "object" ? null : raw.items;
				if (stored === null || typeof stored !== "object") return model;
				for (const [url, entry] of Object.entries(stored)) {
					// A hand-edited library could carry a prototype key; skip the three that
					// would mutate Object.prototype when assigned onto a plain object.
					if (url === "__proto__" || url === "constructor" || url === "prototype") continue;
					if (typeof url !== "string" || url === "" || entry === null || typeof entry !== "object") continue;
					const tags = Array.isArray(entry.tags)
						? [...new Set(
								entry.tags
									.filter((tag) => typeof tag === "string")
									.map((tag) => tag.trim().slice(0, LIBRARY_TAG_LENGTH))
									.filter((tag) => tag !== ""),
							)].slice(0, LIBRARY_TAG_MAX)
						: [];
					model.items[url] = { favorite: entry.favorite === true, tags, hidden: entry.hidden === true };
				}
			} catch {
				// a corrupt library must not stop the panel
			}
			return model;
		}

		const wallpaperLibraryController = {
			read: readLibrary,
			write: (model) => {
				try {
					globalThis.localStorage.setItem(LIBRARY_KEY, JSON.stringify(model));
				} catch {
					// persistence is optional; filtering still works for this session
				}
			},
		};

		/**
		 * Automatic rotation. The saved model is tiny (on / order / interval / scope);
		 * the runtime lives inside the scene and is created with it, because only the
		 * scene knows the current source and can apply the next one without a reload.
		 *
		 * Rules that keep it from fighting the user:
		 *   - it never runs in a hidden tab, under low power, or while playback is
		 *     paused on purpose;
		 *   - it skips the wallpaper that is currently showing;
		 *   - hidden wallpapers and (optionally) anything not favourited are excluded;
		 *   - the next source is prepared first, then applied, so a slow/broken file is
		 *     skipped instead of becoming a blank frame.
		 */
		const ROTATION_KEY = "tianlight.rotation";
		const ROTATION_INTERVALS = [30, 60, 120, 300, 600];
		const ROTATION_DEFAULTS = { on: false, order: "sequence", interval: 120, favoritesOnly: false };
		function normalizeRotation(value) {
			const model = { ...ROTATION_DEFAULTS };
			if (value === null || typeof value !== "object") return model;
			if (typeof value.on === "boolean") model.on = value.on;
			if (value.order === "random" || value.order === "sequence") model.order = value.order;
			if (Number.isFinite(value.interval) && ROTATION_INTERVALS.includes(value.interval)) model.interval = value.interval;
			if (typeof value.favoritesOnly === "boolean") model.favoritesOnly = value.favoritesOnly;
			return model;
		}
		function readRotation() {
			try {
				return normalizeRotation(JSON.parse(globalThis.localStorage.getItem(ROTATION_KEY) ?? "null"));
			} catch {
				return normalizeRotation(null);
			}
		}
		let rotationRuntime = null;
		const rotationSubscribers = new Set();
		const rotationObservers = new Set();
		function notifyRotation(choice) {
			for (const listener of [...rotationObservers]) {
				try {
					listener(choice);
				} catch (error) {
					note("rotation:observer", error);
				}
			}
		}
		const rotationController = {
			read: readRotation,
			apply: (value) => {
				const clean = normalizeRotation(value);
				try {
					globalThis.localStorage.setItem(ROTATION_KEY, JSON.stringify(clean));
				} catch {
					// persistence is optional; rotation still runs this session
				}
				for (const listener of [...rotationSubscribers]) {
					try {
						listener(clean);
					} catch (error) {
						note("rotation:subscriber", error);
					}
				}
				if (rotationRuntime !== null) rotationRuntime.sync(clean);
				return clean;
			},
			subscribe: (listener) => {
				if (typeof listener !== "function") return () => {};
				rotationSubscribers.add(listener);
				listener(readRotation());
				return () => {
					rotationSubscribers.delete(listener);
				};
			},
			/** Notified with the choice that actually reached the scene. */
			observe: (listener) => {
				if (typeof listener !== "function") return () => {};
				rotationObservers.add(listener);
				return () => {
					rotationObservers.delete(listener);
				};
			},
		};

		/**
		 * Warms the next source before the switch. Images decode once; videos only
		 * fetch metadata, because preloading a 4K file would compete with the video
		 * that is currently on screen for bandwidth and decoder time.
		 */
		function prepareWallpaper(choice) {
			if (choice === null || typeof choice !== "object") return Promise.resolve(false);
			if (choice.kind === "image") {
				return new Promise((resolve) => {
					let settled = false;
					const image = new Image();
					let timer = 0;
					const finish = (value) => {
						if (settled) return;
						settled = true;
						if (timer !== 0) window.clearTimeout(timer);
						image.onload = null;
						image.onerror = null;
						resolve(value);
					};
					image.onload = () => finish(image.naturalWidth > 0);
					image.onerror = () => finish(false);
					image.src = choice.url;
					timer = window.setTimeout(() => finish(false), 5000);
				});
			}
			return new Promise((resolve) => {
				let settled = false;
				const video = document.createElement("video");
				let timer = 0;
				const finish = (value) => {
					if (settled) return;
					settled = true;
					if (timer !== 0) window.clearTimeout(timer);
					video.onloadedmetadata = null;
					video.onerror = null;
					video.removeAttribute("src");
					try {
						video.load();
					} catch {
						// detaching a probe is best effort
					}
					resolve(value);
				};
				video.muted = true;
				video.preload = "metadata";
				video.playsInline = true;
				video.onloadedmetadata = () => finish(true);
				video.onerror = () => finish(false);
				timer = window.setTimeout(() => finish(false), 5000);
				video.src = choice.url;
			});
		}

		/**
		 * URL type probe for extensionless / signed links. Image first (cheap), then
		 * video metadata. Returns null when neither is directly loadable, so the panel
		 * can say "this is not a direct media link" instead of swapping to a broken
		 * wallpaper and falling back.
		 */
		function probeUrlKind(url) {
			if (typeof document === "undefined" || typeof url !== "string" || url === "") return Promise.resolve(null);
			return new Promise((resolve) => {
				let settled = false;
				const image = new Image();
				let timer = 0;
				const finish = (kind) => {
					if (settled) return;
					settled = true;
					if (timer !== 0) window.clearTimeout(timer);
					image.onload = null;
					image.onerror = null;
					if (kind !== null) {
						resolve(kind);
						return;
					}
					// Not an image: try video metadata before giving up.
					let videoSettled = false;
					const video = document.createElement("video");
					let videoTimer = 0;
					const done = (value) => {
						if (videoSettled) return;
						videoSettled = true;
						if (videoTimer !== 0) window.clearTimeout(videoTimer);
						video.onloadedmetadata = null;
						video.onerror = null;
						video.removeAttribute("src");
						try {
							video.load();
						} catch {
							// detaching a probe is best effort
						}
						resolve(value);
					};
					video.muted = true;
					video.preload = "metadata";
					video.playsInline = true;
					video.onloadedmetadata = () => done("video");
					video.onerror = () => done(null);
					videoTimer = window.setTimeout(() => done(null), 5000);
					video.src = url;
				};
				image.onload = () => finish("image");
				image.onerror = () => finish(null);
				timer = window.setTimeout(() => finish(null), 6000);
				image.src = url;
			});
		}

		/**
		 * Scene-owned rotation loop. `list`/`apply`/`current`/`isStill` are injected so
		 * this stays testable and never reaches into the scene's private state.
		 */
		function createRotationRuntime(options) {
			let model = normalizeRotation(options.model);
			let timer = 0;
			// Start the countdown at mount: enabling rotation on a saved profile should
			// not swap the wallpaper one tick after the page opens.
			let lastSwitch = performance.now();
			let cursor = -1;
			let busy = false;
			const pick = async () => {
				if (model.on === false || busy) return;
				if (document.hidden) return;
				if (document.body !== null && document.body.hasAttribute("data-tl-lowpower")) return;
				if (readPlayback().paused) return;
				if (options.isStill()) return;
				if (performance.now() - lastSwitch < model.interval * 1000) return;
				busy = true;
				try {
					const items = await options.list();
					if (items === null) return;
					const library = readLibrary();
					const current = options.current();
					const currentUrl = current === null ? "" : current.url;
					const candidates = items.filter((item) => {
						if (item.kind !== "video" && item.kind !== "image") return false;
						if (item.url === currentUrl) return false;
						const meta = library.items[item.url];
						if (meta !== undefined && meta.hidden === true) return false;
						if (model.favoritesOnly && (meta === undefined || meta.favorite !== true)) return false;
						return true;
					});
					if (candidates.length === 0) return;
					const choice =
						model.order === "random"
							? candidates[Math.floor(Math.random() * candidates.length)]
							: candidates[(cursor + 1) % candidates.length];
					if (model.order === "sequence") cursor = candidates.indexOf(choice);
					const ok = await options.prepare({ kind: choice.kind, url: choice.url });
					if (ok !== true) {
						note("rotation:prepare-failed", choice.url);
						return;
					}
					options.apply({ kind: choice.kind, url: choice.url });
					lastSwitch = performance.now();
					notifyRotation(choice);
				} catch (error) {
					note("rotation:pick", error);
				} finally {
					busy = false;
				}
			};
			timer = window.setInterval(() => void pick(), 2000);
			return {
				sync: (next) => {
					model = normalizeRotation(next);
					lastSwitch = performance.now();
					cursor = -1;
				},
				stop: () => {
					if (timer !== 0) window.clearInterval(timer);
					timer = 0;
				},
			};
		}

		/* ---- ShaderToy-style wallpaper: settings, presets, validation, renderer ---- */
		const SHADER_KEY = "tianlight.shader";
		const SHADER_SOURCE_MAX = 12000;
		/** GLSL ES 1.0 (WebGL1) is the broadest target for a fragment wallpaper. */
		const SHADER_VERTEX = [
			"attribute vec2 a_position;",
			"void main() {",
			"  gl_Position = vec4(a_position, 0.0, 1.0);",
			"}",
		].join("\n");
		const SHADER_SOURCES = {
			aurora: [
				"precision highp float;",
				"uniform vec3 iResolution;",
				"uniform float iTime;",
				"uniform vec4 iMouse;",
				"uniform float u_speed;",
				"uniform float u_intensity;",
				"uniform float u_hue;",
				"void main() {",
				"  vec2 uv = gl_FragCoord.xy / iResolution.xy;",
				"  float t = iTime * u_speed;",
				"  float ribbon = sin(uv.y * 5.0 + t * 0.7 + sin(uv.x * 3.5 - t * 0.4) * 0.8);",
				"  float glow = smoothstep(0.15, 0.95, ribbon * 0.5 + 0.5);",
				"  float h = u_hue + 0.10 * glow + 0.04 * sin(uv.x * 6.0 + t * 0.3);",
				"  vec3 col = 0.5 + 0.5 * cos(6.28318 * (h + vec3(0.0, 0.33, 0.67)));",
				"  col *= 0.45 + 0.55 * glow;",
				"  col += u_intensity * 0.12 * vec3(0.15, 0.45, 0.9) * smoothstep(0.0, 1.0, uv.y);",
				"  gl_FragColor = vec4(col, 1.0);",
				"}",
			].join("\n"),
			nebula: [
				"precision highp float;",
				"uniform vec3 iResolution;",
				"uniform float iTime;",
				"uniform vec4 iMouse;",
				"uniform float u_speed;",
				"uniform float u_intensity;",
				"uniform float u_hue;",
				"void main() {",
				"  vec2 uv = (gl_FragCoord.xy - 0.5 * iResolution.xy) / min(iResolution.x, iResolution.y);",
				"  float t = iTime * u_speed;",
				"  float r = length(uv + vec2(sin(t * 0.3) * 0.15, cos(t * 0.23) * 0.12));",
				"  float rings = sin(r * 12.0 - t * 1.6) * 0.5 + 0.5;",
				"  float haze = exp(-r * 2.2);",
				"  float h = u_hue + rings * 0.12 + haze * 0.10;",
				"  vec3 col = 0.5 + 0.5 * cos(6.28318 * (h + vec3(0.0, 0.33, 0.67)));",
				"  col *= haze * 1.35 + rings * 0.25;",
				"  col += u_intensity * 0.10 * vec3(0.4, 0.25, 0.8);",
				"  gl_FragColor = vec4(col, 1.0);",
				"}",
			].join("\n"),
			water: [
				"precision highp float;",
				"uniform vec3 iResolution;",
				"uniform float iTime;",
				"uniform vec4 iMouse;",
				"uniform float u_speed;",
				"uniform float u_intensity;",
				"uniform float u_hue;",
				"void main() {",
				"  vec2 uv = gl_FragCoord.xy / iResolution.xy;",
				"  float t = iTime * u_speed;",
				"  float wave = sin(uv.x * 18.0 + t * 1.4 + sin(uv.y * 7.0 + t * 0.6) * 1.2);",
				"  float shimmer = pow(0.5 + 0.5 * wave, 3.0);",
				"  float h = u_hue + 0.06 * sin(uv.y * 4.0 + t * 0.5) + shimmer * 0.04;",
				"  vec3 col = 0.5 + 0.5 * cos(6.28318 * (h + vec3(0.0, 0.28, 0.58)));",
				"  col *= 0.35 + 0.65 * shimmer;",
				"  col += u_intensity * 0.10 * vec3(0.35, 0.6, 0.9) * smoothstep(0.0, 1.0, uv.y);",
				"  gl_FragColor = vec4(col, 1.0);",
				"}",
			].join("\n"),
			audio: [
				"precision highp float;",
				"uniform vec3 iResolution;",
				"uniform float iTime;",
				"uniform vec4 iMouse;",
				"uniform float u_speed;",
				"uniform float u_intensity;",
				"uniform float u_hue;",
				"uniform float u_audio;",
				"void main() {",
				"  vec2 uv = gl_FragCoord.xy / iResolution.xy;",
				"  float t = iTime * u_speed;",
				"  float level = clamp(u_audio, 0.0, 1.0);",
				"  float bands = sin(uv.y * 9.0 - t * 0.8) * 0.5 + 0.5;",
				"  float ripple = smoothstep(0.0, 1.0, 0.5 + 0.5 * sin(uv.x * 12.0 - t * 1.2 + level * 3.0));",
				"  float h = u_hue + level * 0.22 + ripple * 0.08;",
				"  vec3 col = 0.5 + 0.5 * cos(6.28318 * (h + vec3(0.0, 0.33, 0.67)));",
				"  col *= 0.28 + 0.55 * bands + 0.45 * level;",
				"  col += u_intensity * 0.16 * level * vec3(0.3, 0.6, 1.0);",
				"  gl_FragColor = vec4(col, 1.0);",
				"}",
			].join("\n"),
		};
		const SHADER_PRESETS = [
			{ id: "aurora", label: "极光", source: SHADER_SOURCES.aurora },
			{ id: "nebula", label: "星云", source: SHADER_SOURCES.nebula },
			{ id: "water", label: "水波", source: SHADER_SOURCES.water },
			{ id: "audio", label: "音频极光", source: SHADER_SOURCES.audio },
		];
		const SHADER_DEFAULTS = {
			preset: "aurora",
			source: SHADER_SOURCES.aurora,
			speed: 1,
			intensity: 1,
			hue: 0.58,
		};
		const clampNumber = (value, min, max, fallback) => {
			const number = Number(value);
			if (!Number.isFinite(number)) return fallback;
			return Math.min(max, Math.max(min, number));
		};
		function readShaderSettings() {
			const model = { ...SHADER_DEFAULTS };
			try {
				const raw = JSON.parse(globalThis.localStorage.getItem(SHADER_KEY) ?? "null");
				if (raw !== null && typeof raw === "object") {
					if (typeof raw.source === "string" && raw.source.trim() !== "" && raw.source.length <= SHADER_SOURCE_MAX) {
						model.source = raw.source;
						model.preset = typeof raw.preset === "string" ? raw.preset : "custom";
					}
					model.speed = clampNumber(raw.speed, 0.1, 3, model.speed);
					model.intensity = clampNumber(raw.intensity, 0, 2, model.intensity);
					model.hue = clampNumber(raw.hue, 0, 1, model.hue);
				}
			} catch {
				// a corrupt shader setting must not stop the wallpaper
			}
			return model;
		}
		const shaderController = {
			read: readShaderSettings,
			save: (settings) => {
				try {
					globalThis.localStorage.setItem(SHADER_KEY, JSON.stringify(settings));
				} catch {
					// persistence is optional; the scene still uses the live settings
				}
			},
		};

		/**
		 * Audio response v1: microphone -> AnalyserNode -> u_audio. Explicit opt-in only;
		 * nothing is recorded, stored or uploaded, and the stream/context are released on
		 * stop, panel close, low-power, wallpaper switch and page hide.
		 */
		let audioActive = false;
		let audioBusy = false;
		let audioReason = "";
		let audioToken = 0;
		let audioContext = null;
		let audioStream = null;
		let audioSource = null;
		let audioAnalyser = null;
		let audioData = null;
		let audioLevel = 0;
		let audioSubscriber = null;

		function audioState() {
			return { active: audioActive, busy: audioBusy, reason: audioReason };
		}
		function notifyAudio() {
			if (audioSubscriber !== null) audioSubscriber(audioState());
		}
		function releaseAudio() {
			if (audioAnalyser !== null) {
				try {
					audioAnalyser.disconnect();
				} catch {
					// already disconnected
				}
			}
			if (audioSource !== null) {
				try {
					audioSource.disconnect();
				} catch {
					// already disconnected
				}
			}
			if (audioContext !== null) {
				try {
					void audioContext.close();
				} catch {
					// closing is best effort
				}
			}
			if (audioStream !== null) {
				for (const track of audioStream.getTracks()) {
					try {
						track.stop();
					} catch {
						// a stopped track must not keep the mic alive
					}
				}
			}
			document.removeEventListener("visibilitychange", onAudioVisibility);
			audioContext = null;
			audioStream = null;
			audioSource = null;
			audioAnalyser = null;
			audioData = null;
			audioLevel = 0;
		}
		function stopAudio(reason) {
			const wasActive = audioActive || audioBusy || audioContext !== null || audioStream !== null;
			if (!wasActive) return;
			audioToken += 1;
			audioActive = false;
			audioBusy = false;
			audioReason = typeof reason === "string" ? reason : "";
			releaseAudio();
			notifyAudio();
		}
		function onAudioVisibility() {
			if (document.hidden) stopAudio("页面隐藏，已停止音频");
		}
		function audioStartError(error) {
			if (error !== null && error !== undefined && error.name === "NotAllowedError") {
				return "麦克风被拒绝：在地址栏权限里允许后重试";
			}
			if (error !== null && error !== undefined && error.name === "NotFoundError") {
				return "没有可用的麦克风";
			}
			const message = error !== null && error !== undefined && error.message ? String(error.message) : "未知错误";
			return "无法启用麦克风：" + message;
		}
		async function startAudio() {
			if (audioActive) return { ok: true };
			if (audioBusy) return { ok: false, reason: "正在请求麦克风，请稍候" };
			if (document.querySelector("[data-tl-scene][data-tl-shader-on]") === null) {
				return { ok: false, reason: "先应用 ShaderToy 壁纸，再启用音频" };
			}
			if (document.body !== null && document.body.hasAttribute("data-tl-lowpower")) {
				return { ok: false, reason: "省电模式暂停中，先关闭省电再启用音频" };
			}
			if (document.hidden) return { ok: false, reason: "页面隐藏，回到页面后再启用音频" };
			const media = globalThis.navigator?.mediaDevices;
			if (media === undefined || media === null || typeof media.getUserMedia !== "function") {
				return { ok: false, reason: "当前浏览器不支持麦克风" };
			}
			const Context = globalThis.AudioContext ?? globalThis.webkitAudioContext;
			if (typeof Context !== "function") {
				return { ok: false, reason: "当前浏览器不支持 WebAudio" };
			}
			const token = audioToken + 1;
			audioToken = token;
			audioBusy = true;
			audioReason = "";
			notifyAudio();
			let stream = null;
			let context = null;
			try {
				stream = await media.getUserMedia({ audio: true });
				if (token !== audioToken) {
					for (const track of stream.getTracks()) {
						try {
							track.stop();
						} catch {
							// cancelled start must release the mic
						}
					}
					return { ok: false, reason: "已取消" };
				}
				context = new Context();
				const source = context.createMediaStreamSource(stream);
				const analyser = context.createAnalyser();
				analyser.fftSize = 1024;
				analyser.smoothingTimeConstant = 0.75;
				source.connect(analyser);
				await context.resume();
				if (token !== audioToken) {
					for (const track of stream.getTracks()) {
						try {
							track.stop();
						} catch {
							// cancelled start must release the mic
						}
					}
					try {
						void context.close();
					} catch {
						// closing is best effort
					}
					return { ok: false, reason: "已取消" };
				}
				audioStream = stream;
				audioContext = context;
				audioSource = source;
				audioAnalyser = analyser;
				audioData = new Uint8Array(analyser.fftSize);
				audioActive = true;
				audioBusy = false;
				audioReason = "";
				audioLevel = 0;
				document.addEventListener("visibilitychange", onAudioVisibility);
				notifyAudio();
				return { ok: true };
			} catch (error) {
				for (const track of stream?.getTracks() ?? []) {
					try {
						track.stop();
					} catch {
						// a failed start must release the mic
					}
				}
				try {
					void context?.close();
				} catch {
					// closing is best effort
				}
				releaseAudio();
				if (token === audioToken) {
					audioBusy = false;
					audioActive = false;
					audioReason = audioStartError(error);
					notifyAudio();
					return { ok: false, reason: audioReason };
				}
				return { ok: false, reason: "已取消" };
			}
		}
		function audioLevelNow() {
			if (audioActive === false || audioAnalyser === null || audioData === null) return 0;
			if (document.hidden) {
				stopAudio("页面隐藏，已停止音频");
				return 0;
			}
			try {
				audioAnalyser.getByteTimeDomainData(audioData);
				let sum = 0;
				for (let index = 0; index < audioData.length; index += 1) {
					const value = (audioData[index] - 128) / 128;
					sum += value * value;
				}
				const rms = Math.sqrt(sum / audioData.length);
				const mapped = Math.min(1, Math.max(0, (rms - 0.015) * 4.5));
				audioLevel += (mapped - audioLevel) * 0.35;
				return audioLevel;
			} catch {
				stopAudio("音频分析失败，已停止");
				return 0;
			}
		}
		function subscribeAudio(listener) {
			audioSubscriber = typeof listener === "function" ? listener : null;
			if (audioSubscriber !== null) audioSubscriber(audioState());
			return () => {
				if (audioSubscriber === listener) audioSubscriber = null;
			};
		}
		const audioController = {
			read: audioState,
			start: startAudio,
			stop: stopAudio,
			level: audioLevelNow,
			subscribe: subscribeAudio,
			clearReason: () => {
				if (audioReason === "") return;
				audioReason = "";
				notifyAudio();
			},
		};

		/**
		 * Compiles a candidate in a throwaway context so the panel can refuse a broken
		 * shader before the scene swaps away a working wallpaper.
		 */
		function validateShaderSource(source) {
			if (typeof source !== "string" || source.trim() === "") return "着色器源码为空";
			if (source.length > SHADER_SOURCE_MAX) return "着色器源码太长（上限 " + SHADER_SOURCE_MAX + " 字符）";
			if (typeof document === "undefined") return null;
			let gl = null;
			try {
				const probe = document.createElement("canvas");
				gl = probe.getContext("webgl", { antialias: false, alpha: false, depth: false, stencil: false });
				if (gl === null) return "当前环境不支持 WebGL";
				const vertex = gl.createShader(gl.VERTEX_SHADER);
				const fragment = gl.createShader(gl.FRAGMENT_SHADER);
				gl.shaderSource(vertex, SHADER_VERTEX);
				gl.shaderSource(fragment, source);
				gl.compileShader(vertex);
				gl.compileShader(fragment);
				if (gl.getShaderParameter(fragment, gl.COMPILE_STATUS) !== true) {
					return String(gl.getShaderInfoLog(fragment) ?? "片元着色器编译失败").slice(0, 240);
				}
				const program = gl.createProgram();
				gl.attachShader(program, vertex);
				gl.attachShader(program, fragment);
				gl.linkProgram(program);
				if (gl.getProgramParameter(program, gl.LINK_STATUS) !== true) {
					return String(gl.getProgramInfoLog(program) ?? "着色器链接失败").slice(0, 240);
				}
				return null;
			} catch (error) {
				return error instanceof Error ? error.message : String(error);
			} finally {
				try {
					gl?.getExtension("WEBGL_lose_context")?.loseContext();
				} catch {
					// losing a probe context is best effort
				}
			}
		}

		/** One live WebGL program on the scene canvas, reused across source changes. */
		function createShaderRenderer(canvas) {
			let gl = null;
			try {
				gl = canvas.getContext("webgl", {
					alpha: false,
					antialias: false,
					depth: false,
					stencil: false,
					preserveDrawingBuffer: false,
					powerPreference: "low-power",
				});
			} catch {
				gl = null;
			}
			if (gl === null) return null;
			let program = null;
			let buffer = null;
			let position = -1;
			let uniforms = null;
			const teardownProgram = () => {
				if (program !== null) gl.deleteProgram(program);
				if (buffer !== null) gl.deleteBuffer(buffer);
				program = null;
				buffer = null;
				uniforms = null;
			};
			return {
				apply: (source) => {
					if (typeof source !== "string" || source.trim() === "") return "着色器源码为空";
					const vertex = gl.createShader(gl.VERTEX_SHADER);
					const fragment = gl.createShader(gl.FRAGMENT_SHADER);
					let next = null;
					try {
						gl.shaderSource(vertex, SHADER_VERTEX);
						gl.shaderSource(fragment, source);
						gl.compileShader(vertex);
						gl.compileShader(fragment);
						if (gl.getShaderParameter(fragment, gl.COMPILE_STATUS) !== true) {
							return String(gl.getShaderInfoLog(fragment) ?? "片元着色器编译失败").slice(0, 240);
						}
						next = gl.createProgram();
						gl.attachShader(next, vertex);
						gl.attachShader(next, fragment);
						gl.linkProgram(next);
						if (gl.getProgramParameter(next, gl.LINK_STATUS) !== true) {
							const log = String(gl.getProgramInfoLog(next) ?? "着色器链接失败").slice(0, 240);
							gl.deleteProgram(next);
							next = null;
							return log;
						}
						teardownProgram();
						program = next;
						gl.useProgram(program);
						buffer = gl.createBuffer();
						gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
						gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
						position = gl.getAttribLocation(program, "a_position");
						gl.enableVertexAttribArray(position);
						gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
						uniforms = {
							resolution: gl.getUniformLocation(program, "iResolution"),
							time: gl.getUniformLocation(program, "iTime"),
							mouse: gl.getUniformLocation(program, "iMouse"),
							speed: gl.getUniformLocation(program, "u_speed"),
							intensity: gl.getUniformLocation(program, "u_intensity"),
							hue: gl.getUniformLocation(program, "u_hue"),
							audio: gl.getUniformLocation(program, "u_audio"),
						};
						return null;
					} catch (error) {
						if (next !== null) gl.deleteProgram(next);
						return error instanceof Error ? error.message : String(error);
					} finally {
						gl.deleteShader(vertex);
						gl.deleteShader(fragment);
					}
				},
				resize: (width, height) => {
					const w = Math.max(1, Math.round(width));
					const h = Math.max(1, Math.round(height));
					if (canvas.width !== w || canvas.height !== h) {
						canvas.width = w;
						canvas.height = h;
					}
					gl.viewport(0, 0, w, h);
				},
				render: (time, settings, mouse, audio) => {
					if (program === null || uniforms === null) return;
					gl.useProgram(program);
					if (uniforms.resolution !== null) gl.uniform3f(uniforms.resolution, canvas.width, canvas.height, 1);
					if (uniforms.time !== null) gl.uniform1f(uniforms.time, time);
					if (uniforms.mouse !== null) gl.uniform4f(uniforms.mouse, mouse[0], mouse[1], 0, 0);
					if (uniforms.speed !== null) gl.uniform1f(uniforms.speed, settings.speed);
					if (uniforms.intensity !== null) gl.uniform1f(uniforms.intensity, settings.intensity);
					if (uniforms.hue !== null) gl.uniform1f(uniforms.hue, settings.hue);
					if (uniforms.audio !== null) gl.uniform1f(uniforms.audio, Number.isFinite(audio) ? audio : 0);
					gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
					gl.enableVertexAttribArray(position);
					gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
					gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
				},
				dispose: () => {
					teardownProgram();
					try {
						gl.getExtension("WEBGL_lose_context")?.loseContext();
					} catch {
						// losing the context is best effort
					}
				},
			};
		}

		/**
		 * Grabs evenly spaced frames from a video for the static-frame picker. Only
		 * same-origin media can be read (a cross-origin canvas is tainted), so the
		 * failure names that instead of returning empty thumbnails.
		 */
		function sampleVideoFrames(url, count) {
			if (typeof url !== "string" || url === "") {
				return Promise.resolve({ ok: false, reason: "缺少视频地址，无法取帧" });
			}
			return new Promise((resolve) => {
				let settled = false;
				let timer = 0;
				let pendingSeeker = null;
				const video = document.createElement("video");
				const cleanup = () => {
					if (timer !== 0) {
						window.clearTimeout(timer);
						timer = 0;
					}
					if (pendingSeeker !== null) {
						video.removeEventListener("seeked", pendingSeeker);
						pendingSeeker = null;
					}
					video.removeEventListener("loadeddata", onReady);
					video.removeEventListener("error", onError);
					video.removeAttribute("src");
					video.load();
				};
				const finish = (value) => {
					if (settled) return;
					settled = true;
					cleanup();
					resolve(value);
				};
				const onError = () => finish({ ok: false, reason: "视频加载失败，无法取帧" });
				const onReady = () => {
					const duration = video.duration;
					if (!Number.isFinite(duration) || duration <= 0) {
						finish({ ok: false, reason: "视频时长无效，无法取帧" });
						return;
					}
					const canvas = document.createElement("canvas");
					canvas.width = 160;
					canvas.height = 90;
					const context = canvas.getContext("2d");
					if (context === null) {
						finish({ ok: false, reason: "无法创建取帧画布" });
						return;
					}
					const frames = [];
					const total = Math.max(2, Math.min(8, Math.round(Number(count) || 6)));
					let index = 0;
					const seekNext = () => {
						if (settled) return;
						if (index >= total) {
							finish({ ok: true, frames });
							return;
						}
						const time = Math.min(duration - 0.05, Math.max(0.05, ((index + 0.5) / total) * duration));
						const onSeeked = () => {
							pendingSeeker = null;
							if (settled) return;
							try {
								context.drawImage(video, 0, 0, canvas.width, canvas.height);
								frames.push({ time, dataUrl: canvas.toDataURL("image/jpeg", 0.55) });
							} catch {
								finish({ ok: false, reason: "视频跨域，浏览器禁止取帧；本地/WE 视频可用" });
								return;
							}
							index += 1;
							seekNext();
						};
						pendingSeeker = onSeeked;
						video.addEventListener("seeked", pendingSeeker, { once: true });
						try {
							video.currentTime = time;
						} catch {
							finish({ ok: false, reason: "无法定位视频帧" });
						}
					};
					seekNext();
				};
				timer = window.setTimeout(() => finish({ ok: false, reason: "取帧超时（视频可能仍未加载完）" }), 8000);
				video.muted = true;
				video.playsInline = true;
				video.preload = "auto";
				video.addEventListener("loadeddata", onReady, { once: true });
				video.addEventListener("error", onError, { once: true });
				video.src = url;
				video.load();
			});
		}

		async function listWallpapers() {
			try {
				const response = await fetch(ASSET_BASE + "/_wallpapers", { cache: "no-store" });
				if (!response.ok) return null;
				const value = await response.json();
				return Array.isArray(value?.items) ? value.items : null;
			} catch {
				return null;
			}
		}

		/**
		 * Automatic catalog: the known-good video candidates by codec probe, then any
		 * other video, then a still image. Never consults the saved choice.
		 */
		async function resolveAutoWallpaper() {
			const items = await listWallpapers();
			if (items === null) {
				const fallback = await resolveVideoSource();
				return fallback === null ? null : { kind: "video", url: fallback };
			}
			const byId = new Map(items.map((item) => [item.id, item]));
			const probe = document.createElement("video");
			for (const candidate of VIDEO_CANDIDATES) {
				const item = byId.get(candidate.file);
				if (item === undefined) continue;
				if (candidate.codec !== undefined && probe.canPlayType(candidate.codec) === "") continue;
				return { kind: "video", url: item.url };
			}
			const video = items.find((item) => item.kind === "video");
			if (video !== undefined) return { kind: "video", url: video.url };
			const image = items.find((item) => item.kind === "image");
			if (image !== undefined) return { kind: "image", url: image.url };
			return null;
		}

		async function resolveWallpaper() {
			const chosen = readWallpaperChoice();
			if (chosen !== null) return chosen;
			return resolveAutoWallpaper();
		}

		async function resolveCompanionArt() {
			const assets = await readAssets();
			if (assets === null || assets.includes("cat.png") === false) return null;
			return ASSET_BASE + "/cat.png";
		}

		/**
		 * Builds the wallpaper stack beneath the application. Returns a disposer
		 * that removes every node and listener this activation created.
		 */
		function installScene() {
			const scene = document.createElement("div");
			scene.dataset.tlScene = "";
			scene.setAttribute("aria-hidden", "true");

			const video = document.createElement("video");
			video.muted = true;
			video.loop = true;
			video.autoplay = true;
			video.playsInline = true;
			video.preload = "auto";
			video.disablePictureInPicture = true;
			video.setAttribute("muted", "");
			video.setAttribute("playsinline", "");
			video.style.setProperty("--tl-focal-x", FOCAL_X);
			scene.appendChild(video);

			// Still-image layer. Same slot as the video (painted under veil/crest by DOM
			// order), so an image wallpaper needs no second scene or code path.
			const photo = document.createElement("div");
			photo.dataset.tlPhoto = "";
			photo.hidden = true;
			scene.appendChild(photo);

			// Third channel: a WebGL canvas painted between the still layer and the veil,
			// so the crest/veil keep working over procedural wallpaper frames.
			const shaderCanvas = document.createElement("canvas");
			shaderCanvas.dataset.tlShader = "";
			shaderCanvas.hidden = true;
			scene.appendChild(shaderCanvas);

			// Optional fourth channel: a sandboxed adapter page that runs WebWallGL for
			// WE scene projects. Same layer position as the shader canvas; only one of
			// video / photo / shader / scene frame is visible at a time.
			const sceneFrame = document.createElement("iframe");
			sceneFrame.dataset.tlSceneFrame = "";
			sceneFrame.hidden = true;
			sceneFrame.setAttribute("sandbox", "allow-scripts");
			sceneFrame.setAttribute("allow", "autoplay");
			sceneFrame.setAttribute("referrerpolicy", "no-referrer");
			sceneFrame.setAttribute("title", "Wallpaper Engine scene");
			scene.appendChild(sceneFrame);

			// Overlay stack: two CSS-only slots above all media, below the veil/crest.
			for (const index of [0, 1]) {
				const overlay = document.createElement("div");
				overlay.dataset.tlOverlay = "";
				overlay.dataset.tlOverlaySlot = String(index);
				scene.appendChild(overlay);
			}
			applyLayers(scene, readLayers());

			// Zone dim lives above the media but under the veil: the CSS rule existed but
			// no element carried `data-tl-dim`, so the 外观 → 暗化 slider silently did
			// nothing. It multiplies nothing (translucent black), so it costs one layer.
			const dim = document.createElement("div");
			dim.dataset.tlDim = "";
			scene.appendChild(dim);

			const veil = document.createElement("div");
			veil.dataset.tlVeil = "";
			scene.appendChild(veil);

			const crest = document.createElement("div");
			crest.dataset.tlCrest = "";
			crest.innerHTML = CREST_SVG;
			crest.style.setProperty("--tl-focal-x", FOCAL_X);
			scene.appendChild(crest);

			document.body.insertBefore(scene, document.body.firstChild);
			applyPlayback(scene, readPlayback());

			const disposers = [];

			const markReady = () => {
				video.dataset.tlReady = "";
			};
			// Two attributes on purpose: `data-tl-state` is the coarse legacy contract the
			// quality line already keys off; `data-tl-play` is the detailed state the
			// recovery bar needs. `data-tl-reason` keeps the failure inspectable from
			// devtools and from the panel without a console.
			const report = (state, playState, reason) => {
				scene.dataset.tlState = state;
				scene.dataset.tlPlay = playState ?? state;
				if (reason === undefined || reason === "") scene.removeAttribute("data-tl-reason");
				else scene.dataset.tlReason = reason;
				publishSceneStatus({ status: playState ?? state, reason: reason ?? "" });
			};
			// ---- ShaderToy-style GLSL channel ----
			// One program, one loop, ~30 fps, pixel ratio capped at 1.25: a fullscreen
			// fragment shader is the most expensive wallpaper, so it runs only while the
			// shader channel is actually active and the page is visible.
			let shaderRenderer = null;
			let shaderActive = false;
			let currentChoice = null;
			let lastGoodChoice = null;
			let shaderRaf = 0;
			let shaderLast = 0;
			let shaderSource = "";
			let shaderParams = readShaderSettings();
			let shaderMouse = [0.5, 0.5];
			// Static-frame mode: a paused video at `still` seconds. The token invalidates
			// pending seek listeners when the user switches wallpaper mid-seek.
			let videoStill = null;
			let videoStillToken = 0;
			let fpsHandle = 0;
			let fpsStart = 0;
			let fpsFrames = 0;
			let fpsLastFrame = 0;
			let fpsMaxGap = 0;
			let stillSeekHandler = null;
			let stillMetaHandler = null;
			// Playback ownership. A pause has an owner: the user (survives visibility),
			// the low-power supervisor, the page being hidden, or a source switch. Only a
			// user pause is remembered across a visibility change.
			let userPaused = false;
			let playBlocked = false;
			let playToken = 0;
			let playAttempts = 0;
			let lastAttemptAt = 0;
			let retryTimer = 0;
			let watchdogTimer = 0;
			let lastFrameAt = 0;
			let heldFrame = "";
			const clearStillHandlers = () => {
				if (stillSeekHandler !== null) {
					video.removeEventListener("seeked", stillSeekHandler);
					stillSeekHandler = null;
				}
				if (stillMetaHandler !== null) {
					video.removeEventListener("loadedmetadata", stillMetaHandler);
					stillMetaHandler = null;
				}
			};
			// A 32x18 2D copy made in the same task as the draw: the WebGL buffer is not
			// preserved, so this is the only reliable source for the panel tint/sidebar.
			const shaderSwatch = document.createElement("canvas");
			shaderSwatch.width = 32;
			shaderSwatch.height = 18;
			let shaderSwatchCtx = null;
			try {
				shaderSwatchCtx = shaderSwatch.getContext("2d", { willReadFrequently: true });
			} catch {
				shaderSwatchCtx = null;
			}
			let shaderSwatchTick = 0;
			const snapshotShader = () => {
				if (shaderSwatchCtx === null) return;
				try {
					shaderSwatchCtx.drawImage(shaderCanvas, 0, 0, shaderSwatch.width, shaderSwatch.height);
				} catch {
					// a lost context must not break the loop
				}
			};
			const shaderPixelRatio = () => Math.min(1.25, Math.max(1, globalThis.devicePixelRatio || 1));
			function paintShader(now) {
				if (shaderRenderer === null) return;
				const ratio = shaderPixelRatio();
				shaderRenderer.resize(globalThis.innerWidth * ratio, globalThis.innerHeight * ratio);
				shaderRenderer.render(now / 1000, shaderParams, shaderMouse, audioController.level());
			}
			function stopShaderLoop() {
				if (shaderRaf !== 0) globalThis.cancelAnimationFrame(shaderRaf);
				shaderRaf = 0;
			}
			function startShaderLoop() {
				if (shaderActive === false || shaderRenderer === null || shaderRaf !== 0) return;
				const step = (now) => {
					shaderRaf = 0;
					if (shaderActive === false || document.hidden) return;
					if (document.body !== null && document.body.hasAttribute("data-tl-lowpower")) return;
					if (now - shaderLast >= 1000 / effectiveShaderFps()) {
						shaderLast = now;
						try {
							paintShader(now);
						} catch (error) {
							note("shader:render", error);
							return;
						}
						shaderSwatchTick += 1;
						if (shaderSwatchTick % 60 === 0) snapshotShader();
					}
					shaderRaf = globalThis.requestAnimationFrame(step);
				};
				shaderRaf = globalThis.requestAnimationFrame(step);
			}
			// A lost GPU context must degrade to the scene gradient instead of leaving a
			// frozen/black canvas; the saved ShaderToy choice means re-applying rebuilds it.
			const onShaderContextLost = (event) => {
				event.preventDefault();
				shaderActive = false;
				stopShaderLoop();
				if (shaderRenderer !== null) {
					try {
						shaderRenderer.dispose();
					} catch {
						// the context is already gone
					}
				}
				shaderRenderer = null;
				shaderSource = "";
				shaderCanvas.hidden = true;
				scene.removeAttribute("data-tl-shader-on");
				if (wallpaperController !== null) wallpaperController.shaderSwatch = null;
				audioController.stop("图形上下文丢失，已停止音频");
				report("error", "error", "context-lost");
				note("shader:context-lost");
			};
			const onShaderContextRestored = () => {
				note("shader:context-restored");
			};
			shaderCanvas.addEventListener("webglcontextlost", onShaderContextLost);
			shaderCanvas.addEventListener("webglcontextrestored", onShaderContextRestored);
			disposers.push(() => {
				shaderCanvas.removeEventListener("webglcontextlost", onShaderContextLost);
				shaderCanvas.removeEventListener("webglcontextrestored", onShaderContextRestored);
			});
			const onShaderPointer = (event) => {
				if (shaderActive === false) return;
				shaderMouse = [
					Math.min(1, Math.max(0, event.clientX / (globalThis.innerWidth || 1))),
					Math.min(1, Math.max(0, 1 - event.clientY / (globalThis.innerHeight || 1))),
				];
			};
			window.addEventListener("pointermove", onShaderPointer, { passive: true });

			// ---- optional scene channel (WebWallGL adapter in a sandboxed iframe) ----
			// The adapter owns the engine; this side owns policy: first-frame timeout,
			// strict source check on postMessage, pause/resume, and the fallback chain.
			let sceneFrameActive = false;
			let sceneFrameTimer = 0;
			let sceneFrameLastStats = 0;
			const postSceneFrame = (payload) => {
				if (sceneFrameActive === false) return;
				try {
					sceneFrame.contentWindow?.postMessage({ __tlCommand: true, ...payload }, "*");
				} catch {
					// a torn-down frame is not an error worth surfacing
				}
			};
			const clearSceneFrameTimer = () => {
				if (sceneFrameTimer !== 0) {
					window.clearTimeout(sceneFrameTimer);
					sceneFrameTimer = 0;
				}
			};
			const stopSceneFrame = () => {
				sceneFrameActive = false;
				clearSceneFrameTimer();
				sceneFrameLastStats = 0;
				sceneFrame.hidden = true;
				scene.removeAttribute("data-tl-scene-fps");
				scene.removeAttribute("data-tl-fps");
				try {
					sceneFrame.src = "about:blank";
				} catch {
					// detaching a frame is best effort
				}
			};
			const failSceneFrame = (reason) => {
				if (sceneFrameActive === false) return;
				const failed = currentChoice;
				stopSceneFrame();
				report("error", "error", reason);
				if (
					lastGoodChoice !== null &&
					(currentChoice === null || lastGoodChoice.url !== currentChoice.url || lastGoodChoice.kind !== currentChoice.kind)
				) {
					const restore = lastGoodChoice;
					lastGoodChoice = null;
					applyWallpaper(restore);
					return;
				}
				// No known-good source: let the automatic chain pick a playable wallpaper
				// instead of leaving the scene gradient behind a failure message.
				void resolveAutoWallpaper().then((fallback) => {
					if (fallback !== null && (failed === null || fallback.url !== failed.url)) applyWallpaper(fallback);
				});
			};
			const onSceneMessage = (event) => {
				if (sceneFrameActive === false) return;
				if (event.source !== sceneFrame.contentWindow) return;
				const data = event.data;
				if (data === null || typeof data !== "object" || data.__tlScene !== true) return;
				if (data.type === "ready") {
					clearSceneFrameTimer();
					sceneFrameLastStats = performance.now();
					if (currentChoice === null || currentChoice.kind !== "scene") return;
					lastGoodChoice = currentChoice;
					// A persisted pause, low power or a hidden tab must win over the engine's
					// autoplay; the adapter already starts paused when asked via query.
					if (userPaused || hasLowPower() || document.hidden) {
						postSceneFrame({ type: "pause" });
						if (userPaused) report("paused", "paused", "user");
						else if (hasLowPower()) report("paused", "lowpower", "lowpower");
						else report("paused", "hidden");
						return;
					}
					report("ready", "playing");
					// The mount URL may carry `paused=1` from an earlier state; an explicit
					// resume is idempotent and makes the visible state authoritative.
					postSceneFrame({ type: "resume" });
					return;
				}
				if (data.type === "error") {
					failSceneFrame(String(data.reason ?? "scene-error").slice(0, 240));
					return;
				}
				if (data.type === "stats") {
					sceneFrameLastStats = performance.now();
					if (userPaused || hasLowPower() || document.hidden) return;
					const fps = Math.max(0, Math.round(Number(data.fps) || 0));
					if (fps > 0) {
						scene.dataset.tlFps = String(fps);
						publishSceneStatus({ fps });
					}
				}
			};
			window.addEventListener("message", onSceneMessage);
			disposers.push(() => {
				window.removeEventListener("message", onSceneMessage);
				stopSceneFrame();
			});
			const mountSceneFrame = (choice) => {
				stopSceneFrame();
				sceneFrameActive = true;
				sceneFrame.hidden = false;
				scene.dataset.tlMedia = "scene";
				scene.dataset.tlFile = choice.url.slice(choice.url.lastIndexOf("/") + 1) || "scene";
				report("loading", "loading");
				sceneFrameLastStats = performance.now();
				sceneFrameTimer = window.setTimeout(() => failSceneFrame("scene-timeout"), 20000);
				const fps = effectiveShaderFps();
				const paused = userPaused || hasLowPower() || document.hidden;
				scene.setAttribute("data-tl-scene-fps", String(fps));
				sceneFrame.src =
					ASSET_BASE +
					"/_scene-frame?project=" +
					encodeURIComponent(choice.url) +
					"&fps=" +
					String(fps) +
					(paused ? "&paused=1" : "");
			};
			/**
			 * The moving wallpaper is the whole point of this skin, so
			 * prefers-reduced-motion only trims decorative CSS animation; it must
			 * never silently park the video on its first frame.
			 *
			 * Low power is the one exception: while the body carries the attribute the
			 * play requests are refused, so a visibility change, a new source or the
			 * autoplay retry cannot silently undo the saving.
			 */
			function hasLowPower() {
				return document.body !== null && document.body.hasAttribute("data-tl-lowpower");
			}
			function wantsPlayback() {
				return (
					currentChoice !== null &&
					currentChoice.kind === "video" &&
					videoStill === null &&
					userPaused === false &&
					video.hidden === false &&
					document.hidden === false &&
					hasLowPower() === false
				);
			}
			function clearRetry() {
				if (retryTimer !== 0) {
					window.clearTimeout(retryTimer);
					retryTimer = 0;
				}
			}
			function scheduleRetry(delay) {
				if (retryTimer !== 0) return;
				retryTimer = window.setTimeout(() => {
					retryTimer = 0;
					attemptPlay("retry");
				}, delay);
			}
			/**
			 * One place where playback is requested, so the promise's rejection reason can
			 * become visible state instead of a console line. Autoplay rejection is NOT an
			 * error: the browser is waiting for a gesture, and the panel shows that button.
			 * AbortError is a source-switch race and retries by itself.
			 */
			function attemptPlay(source) {
				if (wantsPlayback() === false) return;
				// An explicit click is the one signal that may retry a blocked source.
				if (
					playBlocked === true &&
					source !== "gesture" &&
					source !== "focus" &&
					source !== "visible" &&
					source !== "user"
				) {
					return;
				}
				lastAttemptAt = performance.now();
				playAttempts += 1;
				try {
					// Some browsers reset muted when the element is re-created by the media
					// pipeline; re-assert it so a muted wallpaper is never treated as audible.
					video.muted = true;
				} catch {
					// muting is best effort; the element is already muted by construction
				}
				let promise = null;
				try {
					promise = video.play();
				} catch (error) {
					report("error", "error", String(error?.name ?? "play-failed"));
					return;
				}
				if (promise === null || typeof promise.then !== "function") return;
				const token = (playToken += 1);
				promise
					.then(() => {
						if (token !== playToken) return;
						playBlocked = false;
						playAttempts = 0;
						if (video.paused === false) report("playing", "playing");
					})
					.catch((error) => {
						if (token !== playToken) return;
						const name = String(error?.name ?? "");
						if (name === "AbortError") {
							// A source swap interrupted this request; the new load owns the state.
							scheduleRetry(350);
							return;
						}
						if (name === "NotAllowedError") {
							playBlocked = true;
							report("paused", "blocked", "autoplay");
							note("video:autoplay-blocked", { source });
							return;
						}
						report("error", "error", name === "" ? "play-failed" : name);
						note("video:play-failed", { source, name });
					});
			}
			function start() {
				if (hasLowPower()) return;
				if (sceneFrameActive) return;
				if (videoStill !== null) return;
				if (shaderActive) {
					startShaderLoop();
					return;
				}
				if (video.hidden || currentChoice === null || currentChoice.kind !== "video") return;
				if (video.paused) attemptPlay("start");
			}
			// The pause must freeze on the current frame: a video element does that for
			// free, which is why low-power mode costs nothing to render.
			scenePlayback = {
				pause: (owner) => {
					if (owner === "user") userPaused = true;
					if (sceneFrameActive) {
						postSceneFrame({ type: "pause" });
						scene.removeAttribute("data-tl-fps");
						if (owner === "user") report("paused", "paused", "user");
						else if (hasLowPower()) report("paused", "lowpower", "lowpower");
						else report("paused", document.hidden ? "hidden" : "paused");
						return;
					}
					stopShaderLoop();
					try {
						video.pause();
					} catch {
						// a detached video cannot throw anything worth surfacing
					}
					if (owner === "user") report("paused", "paused", "user");
					else if (hasLowPower()) report("paused", "lowpower", "lowpower");
					else report("paused", document.hidden ? "hidden" : "paused");
				},
				resume: (owner) => {
					// Low-power/visibility may ask for a resume; a standing user pause wins.
					if (owner !== "user" && readPlayback().paused === true) return;
					userPaused = false;
					if (sceneFrameActive) {
						postSceneFrame({ type: "resume" });
						report("playing", "playing");
						return;
					}
					if (shaderActive) {
						startShaderLoop();
						report("playing", "playing");
						return;
					}
					if (video.hidden || currentChoice === null || currentChoice.kind !== "video") return;
					attemptPlay("user");
				},
				state: () => sceneStatus,
			};
			// The supervisor installs before the scene (it sets the attribute early), so
			// ask it to re-apply now that there is a playback target to pause.
			if (lowPowerController !== null && typeof lowPowerController.sync === "function") lowPowerController.sync();
			/** Keep the last visible frame over the next load so switching never blinks. */
			function releaseHeldFrame() {
				if (heldFrame === "") return;
				heldFrame = "";
				// Fade, don't cut: the photo sits above the video, so removing `data-tl-ready`
				// starts its 900ms opacity transition while the video fades in underneath.
				photo.removeAttribute("data-tl-ready");
			}
			function holdCurrentFrame() {
				if (video.hidden || video.readyState < 2 || video.videoWidth <= 0) return;
				try {
					const scale = Math.min(1, 960 / video.videoWidth);
					const canvas = document.createElement("canvas");
					canvas.width = Math.max(2, Math.round(video.videoWidth * scale));
					canvas.height = Math.max(2, Math.round(video.videoHeight * scale));
					const context = canvas.getContext("2d");
					if (context === null) return;
					context.drawImage(video, 0, 0, canvas.width, canvas.height);
					const frame = canvas.toDataURL("image/jpeg", 0.6);
					if (frame === "" || frame === "data:,") return;
					heldFrame = frame;
					photo.style.backgroundImage = 'url("' + frame + '")';
					photo.dataset.tlReady = "";
					photo.hidden = false;
				} catch {
					// A cross-origin frame taints the canvas; the scene gradient holds instead.
					heldFrame = "";
				}
			}
			const stopFpsProbe = () => {
				if (fpsHandle !== 0 && typeof video.cancelVideoFrameCallback === "function") {
					try {
						video.cancelVideoFrameCallback(fpsHandle);
					} catch {
						// an already-finished callback is fine
					}
				}
				fpsHandle = 0;
				fpsStart = 0;
				fpsFrames = 0;
				fpsLastFrame = 0;
				fpsMaxGap = 0;
			};
			const startFpsProbe = () => {
				if (typeof video.requestVideoFrameCallback !== "function" || fpsHandle !== 0 || video.paused) return;
				const probe = (now) => {
					fpsHandle = 0;
					if (video.paused || document.hidden) return;
					// Frames are flowing again: a previous stall report must not stick.
					if (scene.dataset.tlPlay === "stalled") report("playing", "playing");
					lastFrameAt = now;
					if (fpsLastFrame !== 0) {
						const gap = now - fpsLastFrame;
						if (gap > fpsMaxGap) fpsMaxGap = gap;
					}
					fpsLastFrame = now;
					if (fpsStart === 0) {
						fpsStart = now;
						fpsFrames = 0;
					}
					fpsFrames += 1;
					const elapsed = now - fpsStart;
					if (elapsed >= 1000) {
						const fps = Math.max(0, Math.round((fpsFrames * 1000) / elapsed));
						const jitter = Math.max(0, Math.round(fpsMaxGap));
						scene.dataset.tlFps = String(fps);
						scene.dataset.tlJitter = String(jitter);
						publishSceneStatus({ fps, jitter });
						fpsStart = now;
						fpsFrames = 0;
						fpsMaxGap = 0;
					}
					fpsHandle = video.requestVideoFrameCallback(probe);
				};
				fpsHandle = video.requestVideoFrameCallback(probe);
			};
			const onLoaded = () => {
				// The new source has a frame: the held previous frame has done its job.
				// Keeping it past this point would show the OLD wallpaper over a new one
				// that failed to autoplay, which reads as "the switch did nothing".
				releaseHeldFrame();
				if (video.videoWidth > 0 && video.videoHeight > 0) {
					scene.dataset.tlWidth = String(video.videoWidth);
					scene.dataset.tlHeight = String(video.videoHeight);
				}
				if (Number.isFinite(video.duration) && video.duration > 0) {
					scene.dataset.tlDuration = String(Math.round(video.duration));
				}
				if (currentChoice !== null) lastGoodChoice = currentChoice;
				if (!video.paused) startFpsProbe();
				applyPlayback(scene, readPlayback());
				markReady();
				report("ready", userPaused ? "paused" : video.paused ? "ready" : "playing", userPaused ? "user" : "");
				start();
			};
			const onPlaying = () => {
				releaseHeldFrame();
				lastFrameAt = performance.now();
				playBlocked = false;
				playAttempts = 0;
				report("playing", "playing");
				startFpsProbe();
			};
			const onPause = () => {
				stopFpsProbe();
				scene.removeAttribute("data-tl-fps");
				scene.removeAttribute("data-tl-jitter");
				publishSceneStatus({ fps: 0, jitter: 0 });
				if (hasLowPower()) report("paused", "lowpower", "lowpower");
				else if (document.hidden) report("paused", "hidden");
				else if (userPaused) report("paused", "paused", "user");
				else report(video.ended ? "ended" : "paused", "paused");
			};
			const onWaiting = () => {
				if (userPaused || hasLowPower() || document.hidden) return;
				report("loading", "buffering");
			};
			const onError = () => {
				const code = video.error?.code;
				stopFpsProbe();
				scene.removeAttribute("data-tl-fps");
				scene.removeAttribute("data-tl-jitter");
				// Keep the failure inspectable from devtools instead of failing silent.
				console.error("[ui-skin-tianlight] wallpaper error", code, video.currentSrc || video.src);
				report("error", "error", code === undefined ? "decode" : "media-" + code);
				// Try the next candidate once, then restore the last source that actually
				// produced a frame. A missing/unsupported replacement must never leave the
				// background blank while a known-good wallpaper is still available.
				const index = VIDEO_CANDIDATES.findIndex(
					(candidate) => video.currentSrc.endsWith(candidate.file) || video.src.endsWith(candidate.file),
				);
				const next = VIDEO_CANDIDATES[index + 1];
				if (index >= 0 && next !== undefined) {
					video.src = ASSET_BASE + "/" + next.file;
					start();
					return;
				}
				if (
					lastGoodChoice !== null &&
					(currentChoice === null || lastGoodChoice.url !== currentChoice.url || lastGoodChoice.kind !== currentChoice.kind)
				) {
					const restore = lastGoodChoice;
					lastGoodChoice = null;
					applyWallpaper(restore);
				}
			};
			const onVisibility = () => {
				if (document.hidden) {
					if (sceneFrameActive) postSceneFrame({ type: "pause" });
					video.pause();
					report("paused", "hidden");
				} else if (userPaused === false) {
					if (sceneFrameActive) {
						postSceneFrame({ type: "resume" });
						report("playing", "playing");
					}
					start();
				}
			};
			const onResumeSignal = () => {
				if (document.hidden || userPaused) return;
				if (sceneFrameActive) {
					postSceneFrame({ type: "resume" });
					report("playing", "playing");
				}
				start();
			};
			// A gesture anywhere on the page is enough to satisfy the autoplay policy, but
			// only if we hear it. Capture phase keeps a host handler that calls
			// stopPropagation() from swallowing the unlock.
			const onUserGesture = () => {
				if (document.hidden) return;
				if (userPaused) return;
				playBlocked = false;
				if (video.paused && wantsPlayback()) attemptPlay("gesture");
			};
			const watchdogTick = () => {
				if (scene.isConnected === false) return;
				if (sceneFrameActive) {
					// The adapter posts stats every second; silence while "playing" means the
					// engine loop died. Surface it so the panel offers 重试 instead of a
					// frozen picture that still claims to be live.
					if (
						scene.dataset.tlPlay === "playing" &&
						sceneFrameLastStats > 0 &&
						performance.now() - sceneFrameLastStats > 6000
					) {
						report("playing", "stalled", "scene-no-stats");
					}
					return;
				}
				if (wantsPlayback() && video.paused && video.readyState >= 2) {
					if (playBlocked) return;
					if (performance.now() - lastAttemptAt < 1500) return;
					if (playAttempts >= 4) {
						report("paused", "stalled", "play-timeout");
						return;
					}
					attemptPlay("watchdog");
					return;
				}
				if (
					video.paused === false &&
					video.readyState >= 2 &&
					lastFrameAt > 0 &&
					performance.now() - lastFrameAt > 2500
				) {
					report("playing", "stalled", "no-frame");
				}
			};

			video.addEventListener("loadeddata", onLoaded);
			video.addEventListener("playing", onPlaying);
			video.addEventListener("pause", onPause);
			video.addEventListener("waiting", onWaiting);
			video.addEventListener("canplay", start);
			video.addEventListener("error", onError);
			document.addEventListener("visibilitychange", onVisibility);
			window.addEventListener("pointerdown", onUserGesture, { capture: true, passive: true });
			window.addEventListener("keydown", onUserGesture, { capture: true });
			window.addEventListener("touchstart", onUserGesture, { capture: true, passive: true });
			window.addEventListener("focus", onResumeSignal);
			window.addEventListener("pageshow", onResumeSignal);
			watchdogTimer = window.setInterval(watchdogTick, 2500);

			disposers.push(() => {
				clearRetry();
				if (watchdogTimer !== 0) {
					window.clearInterval(watchdogTimer);
					watchdogTimer = 0;
				}
				video.removeEventListener("loadeddata", onLoaded);
				video.removeEventListener("playing", onPlaying);
				video.removeEventListener("pause", onPause);
				video.removeEventListener("waiting", onWaiting);
				video.removeEventListener("canplay", start);
				video.removeEventListener("error", onError);
				document.removeEventListener("visibilitychange", onVisibility);
				window.removeEventListener("pointerdown", onUserGesture, { capture: true });
				window.removeEventListener("keydown", onUserGesture, { capture: true });
				window.removeEventListener("touchstart", onUserGesture, { capture: true });
				window.removeEventListener("focus", onResumeSignal);
				window.removeEventListener("pageshow", onResumeSignal);
				window.removeEventListener("pointermove", onShaderPointer);
			});

			const applyWallpaper = (choice) => {
				if (!scene.isConnected) return;
				clearRetry();
				stopFpsProbe();
				scene.removeAttribute("data-tl-fps");
				scene.removeAttribute("data-tl-jitter");
				// Every source switch starts from a clean playback intent: a blocked or
				// runtime-paused state belongs to the OLD source. A PERSISTED pause is the
				// exception — it is the user's standing choice and survives a reload.
				userPaused = readPlayback().paused === true;
				playBlocked = false;
				playAttempts = 0;
				publishSceneStatus({ fps: 0, jitter: 0 });
				if (choice === null) {
					currentChoice = null;
					stopSceneFrame();
					scene.removeAttribute("data-tl-media");
					scene.removeAttribute("data-tl-width");
					scene.removeAttribute("data-tl-height");
					scene.removeAttribute("data-tl-duration");
					report("no-source", "idle");
					return;
				}
				// Route every request through the provider gate: an unsupported source
				// reports why instead of leaving the previous wallpaper silently in place.
				const verdict = resolveWallpaperChoice(choice);
				if (verdict.ok === false) {
					report("unsupported", "error", "unsupported");
					note("wallpaper:unsupported", verdict.reason);
					return;
				}
				choice = verdict.choice;
				currentChoice = choice;
				scene.dataset.tlMedia = choice.kind;
				scene.removeAttribute("data-tl-width");
				scene.removeAttribute("data-tl-height");
				scene.removeAttribute("data-tl-duration");
				videoStillToken += 1;
				videoStill = null;
				clearStillHandlers();
				if (choice.kind !== "shader") audioController.stop("切换壁纸，已停止音频");
				// Any non-scene source retires the optional scene frame first.
				if (choice.kind !== "scene") stopSceneFrame();
				if (choice.kind === "scene") {
					shaderActive = false;
					stopShaderLoop();
					shaderCanvas.hidden = true;
					scene.removeAttribute("data-tl-shader-on");
					video.pause();
					video.hidden = true;
					video.removeAttribute("data-tl-ready");
					heldFrame = "";
					photo.hidden = true;
					photo.removeAttribute("data-tl-ready");
					photo.style.removeProperty("background-image");
					if (wallpaperController !== null) {
						wallpaperController.image = null;
						wallpaperController.shaderSwatch = null;
					}
					mountSceneFrame(choice);
					return;
				}
				if (choice.kind === "shader") {
					video.pause();
					video.hidden = true;
					heldFrame = "";
					photo.hidden = true;
					photo.removeAttribute("data-tl-ready");
					photo.style.removeProperty("background-image");
					if (wallpaperController !== null) wallpaperController.image = null;
					report("loading", "loading");
					if (shaderRenderer === null) shaderRenderer = createShaderRenderer(shaderCanvas);
					if (shaderRenderer === null) {
						// No WebGL: fall back to the normal catalog instead of a blank scene.
						report("error", "error", "no-webgl");
						note("shader:no-webgl", {});
						void resolveAutoWallpaper().then(applyWallpaper);
						return;
					}
					shaderParams = readShaderSettings();
					if (shaderParams.source !== shaderSource) {
						const error = shaderRenderer.apply(shaderParams.source);
						if (error !== null) {
							// Keep the saved choice so the panel can fix it after the fallback.
							report("error", "error", "shader-compile");
							note("shader:compile", { error });
							shaderActive = false;
							stopShaderLoop();
							shaderCanvas.hidden = true;
							scene.removeAttribute("data-tl-shader-on");
							void resolveAutoWallpaper().then(applyWallpaper);
							return;
						}
						shaderSource = shaderParams.source;
					}
					shaderCanvas.hidden = false;
					scene.setAttribute("data-tl-shader-on", "");
					scene.dataset.tlFile = "shader";
					shaderActive = true;
					shaderLast = performance.now();
					try {
						paintShader(shaderLast);
					} catch (error) {
						note("shader:render", error);
					}
					snapshotShader();
					if (wallpaperController !== null) wallpaperController.shaderSwatch = shaderSwatch;
					if (currentChoice !== null) lastGoodChoice = currentChoice;
					start();
					report("ready", "playing");
					return;
				}
				// Leaving the shader channel: stop its loop before a media layer takes over.
				shaderActive = false;
				stopShaderLoop();
				shaderCanvas.hidden = true;
				scene.removeAttribute("data-tl-shader-on");
				if (wallpaperController !== null) wallpaperController.shaderSwatch = null;
				const file = choice.url.slice(choice.url.lastIndexOf("/") + 1);
				if (choice.kind === "image") {
					video.pause();
					video.hidden = true;
					heldFrame = "";
					report("loading", "loading");
					photo.hidden = false;
					scene.dataset.tlFile = file;
					// Preload separately: marking ready on the div would flash the empty
					// layer before the bytes arrive.
					const probe = new Image();
					probe.onload = () => {
						if (probe.naturalWidth > 0 && probe.naturalHeight > 0) {
							scene.dataset.tlWidth = String(probe.naturalWidth);
							scene.dataset.tlHeight = String(probe.naturalHeight);
						}
						if (currentChoice !== null) lastGoodChoice = currentChoice;
						photo.dataset.tlReady = "";
						markReady();
						report("ready", "ready");
					};
					probe.onerror = () => {
						report("error", "error", "image-decode");
						// AVIF/SVG/WebP support varies; fall back to the last good wallpaper
						// instead of leaving a blank still layer.
						if (
							lastGoodChoice !== null &&
							(currentChoice === null || lastGoodChoice.url !== currentChoice.url || lastGoodChoice.kind !== currentChoice.kind)
						) {
							const restore = lastGoodChoice;
							lastGoodChoice = null;
							applyWallpaper(restore);
						}
					};
					probe.src = choice.url;
					// Kept for the palette sampler: a still wallpaper is not a <video>.
					if (wallpaperController !== null) wallpaperController.image = probe;
					photo.style.backgroundImage = 'url("' + choice.url.replace(/["\\)]/g, "") + '")';
					return;
				}
				// Hold the last decoded frame while the next video loads: the element goes
				// blank the moment `load()` runs, and the scene gradient alone reads as a
				// flicker on every switch.
				holdCurrentFrame();
				if (heldFrame === "") {
					photo.hidden = true;
					photo.removeAttribute("data-tl-ready");
					photo.style.removeProperty("background-image");
				}
				if (wallpaperController !== null) wallpaperController.image = null;
				video.hidden = false;
				video.removeAttribute("data-tl-ready");
				report("loading", "loading");
				const still = Number.isFinite(choice.still) ? Math.max(0, choice.still) : null;
				videoStill = still;
				const stillToken = videoStillToken;
				video.autoplay = still === null && userPaused === false;
				if (userPaused) report("paused", "paused", "user");
				video.src = choice.url;
				video.load();
				// Which file actually won: readable from devtools when diagnosing decode.
				scene.dataset.tlFile = file;
				if (still === null) {
					start();
					return;
				}
				const settleStill = () => {
					stillSeekHandler = null;
					if (stillToken !== videoStillToken) return;
					try {
						video.pause();
					} catch {
						// a detached video cannot throw anything worth surfacing
					}
					markReady();
					report("ready", "still");
				};
				const seekStill = () => {
					stillMetaHandler = null;
					if (stillToken !== videoStillToken) return;
					const target = Math.min(still, Math.max(0, (video.duration || still) - 0.05));
					if (video.readyState >= 2 && Math.abs(video.currentTime - target) < 0.01) {
						settleStill();
						return;
					}
					stillSeekHandler = settleStill;
					video.addEventListener("seeked", settleStill, { once: true });
					try {
						video.currentTime = target;
					} catch {
						settleStill();
					}
				};
				if (video.readyState >= 1) seekStill();
				else {
					stillMetaHandler = seekStill;
					video.addEventListener("loadedmetadata", stillMetaHandler, { once: true });
				}
			};
			wallpaperController = {
				image: null,
				shaderSwatch: null,
				apply: (choice) => {
					saveWallpaperChoice(choice);
					applyWallpaper(choice);
				},
				/** Re-run the CURRENT source without touching the saved choice. */
				reload: () => {
					if (currentChoice !== null) applyWallpaper(currentChoice);
				},
			};
			rotationRuntime = createRotationRuntime({
				model: readRotation(),
				list: listWallpapers,
				apply: (choice) => {
					if (wallpaperController !== null) wallpaperController.apply(choice);
				},
				current: () => currentChoice,
				isStill: () => videoStill !== null,
				prepare: prepareWallpaper,
			});
			void resolveWallpaper().then(applyWallpaper);

			return () => {
				clearStillHandlers();
				clearRetry();
				releaseHeldFrame();
				audioController.stop("皮肤已关闭");
				stopFpsProbe();
				stopShaderLoop();
				for (const dispose of disposers) dispose();
				if (shaderRenderer !== null) shaderRenderer.dispose();
				shaderRenderer = null;
				wallpaperController = null;
				if (rotationRuntime !== null) {
					rotationRuntime.stop();
					rotationRuntime = null;
				}
				scenePlayback = null;
				publishSceneStatus({ status: "idle", reason: "", fps: 0, jitter: 0 });
				video.pause();
				video.removeAttribute("src");
				video.load();
				scene.remove();
			};
		}
		//#endregion

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

		//#region reasoning rheostat
		/**
		 * A draggable detent rail for the session's reasoning effort, mounted beside
		 * the composer's existing controls.
		 *
		 * It is strictly additive and fail-safe: it reads the live selection from the
		 * `modelSelection` projection, writes through the same `session.selectModel`
		 * remote the shipped picker uses, and renders `null` when any of that is
		 * unavailable. A missing hook or a failed catalog never disturbs the composer.
		 */
		function installEffortRheostat(ctx) {
			if (React === null) {
				note("rheostat:react-missing", {});
				return () => {};
			}
			if (typeof ctx.inject !== "function") {
				note("rheostat:no-inject", {});
				return () => {};
			}
			// `slots` is published by a plugin that activates AFTER this one, so an eager
			// ctx.get('slots') during apply() is undefined on every boot and the control
			// silently never registered. Wait for the service instead of probing once.
			return ctx.inject(["slots"], (scoped) => {
				const slots = scoped.get("slots");
				if (slots === undefined) {
					note("rheostat:slots-missing", {});
					return () => {};
				}
				return registerRheostat(scoped, slots);
			});
		}

		function registerRheostat(ctx, slots) {
			// `remote` is a guarded context property, and ctx.inject(["remote"]) never fires
			// for it. The legal ways in: the loader injection declared in package.json
			// (dsh.client.inject -> api-remotes), a dotted "remote.session" service key, or
			// a guarded get(). Probe every path and use whichever answers.
			let remoteScope = null;
			let sessionScope = null;
			const disposeRemote = ctx.inject(["remote"], (scoped) => {
				remoteScope = scoped;
				return () => {
					remoteScope = null;
				};
			});
			const disposeSession = ctx.inject(["remote.session"], (scoped) => {
				sessionScope = scoped;
				return () => {
					sessionScope = null;
				};
			});
			/** The session remote namespace: the object carrying modelCatalog/selectModel. */
			const resolveRemoteSession = () => {
				if (sessionScope !== null) {
					try {
						const direct = sessionScope.get("remote.session");
						if (direct !== undefined) return direct;
					} catch {
						// fall through to the next path
					}
				}
				if (remoteScope !== null) {
					try {
						const viaScope = remoteScope.remote;
						if (viaScope?.session !== undefined) return viaScope.session;
					} catch {
						// fall through
					}
				}
				for (const key of ["remote.session", "remote"]) {
					try {
						const value = ctx.get(key);
						if (value?.modelCatalog !== undefined) return value;
						if (value?.session?.modelCatalog !== undefined) return value.session;
					} catch {
						// guarded access; keep probing
					}
				}
				return undefined;
			};

			/** Rail insets in px; must match [data-tl-rheo-track] in the stylesheet. */
			const RAIL_LEFT = 12;
			const RAIL_RIGHT = 40;
			let warnedRender = false;
			const FAULT_LABELS = {
				loading: "读取中",
				"no-remote": "未连接",
				error: "读取失败",
				rejected: "被拒绝",
				"no-efforts": "无档位",
			};
			const LABELS = {
				minimal: "极简",
				low: "低",
				medium: "中",
				high: "高",
				max: "最高",
				none: "关闭",
			};

			/**
			 * Effort levels for the selected model, read from the host catalog.
			 * @returns `{ ids, names, defaultEffort }`, or null when this model declares none.
			 *
			 * The catalog is NOT a flat group list: every entry is `{ kind, group }`, and
			 * the value to send back is `effort.id` (not a guessed label). Both mistakes
			 * made the control write values the host rejected, so the level never changed.
			 */
			const readEfforts = (catalog, selection) => {
				const groups = catalog?.groups;
				if (!Array.isArray(groups) || selection === null) return null;
				const collect = (model) => {
					const efforts = model?.reasoning?.efforts;
					if (!Array.isArray(efforts) || efforts.length < 2) return null;
					const ids = [];
					const names = {};
					for (const effort of efforts) {
						if (typeof effort === "string") {
							ids.push(effort);
							continue;
						}
						if (typeof effort?.id !== "string") continue;
						ids.push(effort.id);
						if (typeof effort.name === "string" && effort.name !== "") names[effort.id] = effort.name;
					}
					if (ids.length < 2) return null;
					const defaultEffort =
						typeof model.reasoning?.defaultEffort === "string" ? model.reasoning.defaultEffort : null;
					return { ids, names, defaultEffort };
				};
				const flat = [];
				for (const entry of groups) {
					const group = entry?.group === undefined ? entry : entry.group;
					for (const model of group?.models ?? []) flat.push({ group, model });
				}
				// Exact provider+model first...
				for (const { group, model } of flat) {
					if (group?.id !== selection.provider || model?.id !== selection.model) continue;
					const found = collect(model);
					if (found !== null) return found;
				}
				// ...then model alone: a provider id may be aliased between the settings
				// file and the live registry, and refusing the match hid a valid scale.
				for (const { model } of flat) {
					if (model?.id !== selection.model) continue;
					const found = collect(model);
					if (found !== null) return found;
				}
				return null;
			};

			function Rheostat(props) {
				const sessionId = props.sessionId;
				const useProjection = props.useProjection;
				const snapshot = typeof useProjection === "function" ? useProjection("modelSelection") : null;
				const selection = snapshot?.next ?? snapshot?.lastUsed ?? null;
				if (!warnedRender) {
					warnedRender = true;
					note("rheostat:render", {
						hookPresent: typeof useProjection === "function",
						snapshotKeys: snapshot === null ? null : Object.keys(snapshot).slice(0, 8),
						hasSelection: selection !== null,
						sessionId: typeof sessionId === "string",
					});
				}

				// Empty until the host catalog answers. Sending guessed effort ids was exactly
				// what made the control look alive while the level never changed.
				const [levels, setLevels] = React.useState([]);
				const [labels, setLabels] = React.useState({});
				const [defaultEffort, setDefaultEffort] = React.useState(null);
				// Some conversations have no explicit selection yet. The catalog carries the
				// default one, which is what the host would use anyway — falling back to it
				// is why this no longer renders "未就绪" in a fresh chat.
				const [catalogDefault, setCatalogDefault] = React.useState(null);
				// Why the scale is missing, surfaced in the placeholder so the failure names
				// itself instead of needing devtools.
				const [fault, setFault] = React.useState("loading");
				const [busy, setBusy] = React.useState(false);
				// The continuous position is written straight to the DOM node. Driving it
				// through React state re-rendered the component every frame, which is what
				// made the motion stutter; React now re-renders only on discrete changes.
				const dragRef = React.useRef(null);
				// `draggingRef` is the ONLY authority for whether pointer moves count.
				const draggingRef = React.useRef(false);
				const [held, setHeld] = React.useState(false);
				// Seeded lazily inside the effect: committedPos is declared further down, so
				// referencing it in a useRef initializer would hit the temporal dead zone.
				const springRef = React.useRef(null);
				const railRef = React.useRef(null);
				const applyPos = React.useCallback((value) => {
					const node = railRef.current;
					if (node === null) return;
					// A non-finite value invalidates `left: calc(...)`, which collapses the rail
					// into a distorted layout — sanitize before it reaches the stylesheet.
					const safe = Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
					node.style.setProperty("--tl-rheo-pos", String(safe));
				}, []);

				const active = selection ?? catalogDefault;
				const provider = active?.provider;
				const model = active?.model;

				// Switching conversations reuses the same component instance. Without this
				// reset the previous session's scale, fault text and drag state leak into
				// the new one, which is exactly how the control "breaks in another chat".
				const sessionRef = React.useRef(sessionId);
				React.useEffect(() => {
					if (sessionRef.current === sessionId) return;
					sessionRef.current = sessionId;
					setLevels([]);
					setLabels({});
					setDefaultEffort(null);
					setFault("loading");
					setDragIndex(null);
					setBusy(false);
					springRef.current = null;
				}, [sessionId]);

				React.useEffect(() => {
					let alive = true;
					let attempt = 0;
					let timer = 0;

					const run = async () => {
						if (!alive) return;
						try {
							const session = resolveRemoteSession();
							// `remote.session` is mounted asynchronously by the api-remotes plugin:
							// running once was a race that always lost, and the failure looked final.
							if (session === undefined || typeof session.modelCatalog !== "function") {
								throw new Error("remote.session.modelCatalog 尚未挂载");
							}
							const response = await session.modelCatalog();
							if (!alive) return;
							if (response?.ok !== true) {
								setFault("rejected");
								return;
							}
							const def = response.value?.default;
							const defaultSelection =
								def !== undefined && typeof def.provider === "string" && typeof def.model === "string"
									? {
											provider: def.provider,
											model: def.model,
											// The host also reports which effort it would apply; dropping it
											// made the knob guess between the model default and the highest.
											reasoningEffort: typeof def.reasoningEffort === "string" ? def.reasoningEffort : undefined,
										}
									: null;
							if (alive) setCatalogDefault(defaultSelection);
							const chosen = selection !== null ? selection : defaultSelection;
							const found =
								chosen === null ? null : readEfforts(response.value, { provider: chosen.provider, model: chosen.model });
							if (found === null) {
								setFault("no-efforts");
								return;
							}
							setFault(null);
							setLevels(found.ids);
							setLabels(found.names);
							setDefaultEffort(found.defaultEffort);
						} catch (error) {
							if (!alive) return;
							attempt += 1;
							if (attempt <= 12) {
								timer = window.setTimeout(run, 500);
								return;
							}
							const message = error instanceof Error ? error.message : String(error);
							setFault("err:" + message);
						}
					};

					void run();
					return () => {
						alive = false;
						if (timer !== 0) window.clearTimeout(timer);
					};
				}, [provider, model, sessionId]);

				// Null-safe derivation so every hook below runs on every render: a component
				// may not return before its hooks, or React rejects the changing count.
				const currentIndex =
					active === null || levels.length === 0
						? 0
						: Math.max(
								0,
								levels.indexOf(
									active.reasoningEffort ?? defaultEffort ?? levels[levels.length - 1],
								),
							);
				const steps = levels.length - 1;
				const committedPos = steps > 0 ? currentIndex / steps : 0;
				const dragging = held;
				// Only the detent index re-renders (label + aria); the continuous position
				// lives in the node's custom property.
				const [dragIndex, setDragIndex] = React.useState(null);
				const nearest = dragIndex === null ? currentIndex : dragIndex;
				const [pulse, setPulse] = React.useState(0);
				React.useEffect(() => {
					setPulse((n) => n + 1);
				}, [nearest]);
				React.useEffect(() => {
					if (dragging) return undefined;
					if (springRef.current === null) springRef.current = { pos: committedPos, vel: 0 };
					// Paint the seeded position before the first frame so the bead never
					// appears at the left edge and then jump into place.
					applyPos(springRef.current.pos);
					let raf = 0;
					// Near-critical damping (zeta ~0.96): a short overshoot, then settle.
					// Lower damping / higher stiffness is what made it wobble violently.
					const stiffness = 170;
					const damping = 25;
					const dt = 1 / 60;
					let pos = springRef.current.pos;
					let vel = 0;
					const step = () => {
						const target = committedPos;
						vel += ((target - pos) * stiffness - vel * damping) * dt;
						pos += vel * dt;
						const settled = Math.abs(target - pos) < 0.001 && Math.abs(vel) < 0.001;
						springRef.current = { pos: settled ? target : pos, vel: settled ? 0 : vel };
						applyPos(settled ? target : pos);
						if (!settled) raf = requestAnimationFrame(step);
					};
					raf = requestAnimationFrame(step);
					return () => cancelAnimationFrame(raf);
				}, [committedPos, dragging, applyPos]);

				// All hooks are above this line: an early return before any hook would make
				// the hook count change when the selection arrives, which React rejects.
				// Every non-working state renders something legible: a hairline at low
				// opacity is invisible on a bright wallpaper, which is how the control
				// appeared to "not exist" instead of reporting why.
				if (active === null || sessionId === undefined) {
					return React.createElement(
						"div",
						{ "data-tl-rheo": "", "data-tl-rheo-empty": "", title: "推理等级：未读取到当前会话的模型选择" },
						React.createElement("span", { "data-tl-rheo-empty-text": "" }, "推理 · 未就绪"),
					);
				}
				if (levels.length < 2) {
					const raw = FAULT_LABELS[fault] ?? (typeof fault === "string" && fault.startsWith("err:") ? fault.slice(4) : fault);
					const reason = typeof raw === "string" && raw.startsWith("err:") ? raw.slice(4) : (raw ?? "无档位");
					return React.createElement(
						"div",
						{ "data-tl-rheo": "", "data-tl-rheo-empty": "", title: "推理等级：" + reason },
						React.createElement("span", { "data-tl-rheo-empty-text": "" }, "推理 · " + reason),
					);
				}

				const commit = (target) => {
					if (busy || target === currentIndex) return;
					const session = resolveRemoteSession();
					if (typeof session?.selectModel !== "function") {
						note("rheostat:write-unavailable", {});
						return;
					}
					setBusy(true);
					Promise.resolve(
						session.selectModel({
							sessionId,
							provider: active.provider,
							model: active.model,
							reasoningEffort: levels[target],
						}),
					)
						.catch(() => {})
						.finally(() => setBusy(false));
				};

				const ratioAt = (clientX) => {
					const rail = railRef.current;
					if (rail === null) return committedPos;
					const rect = rail.getBoundingClientRect();
					const usable = rect.width - RAIL_LEFT - RAIL_RIGHT;
					if (usable <= 0) return committedPos;
					return Math.min(1, Math.max(0, (clientX - rect.left - RAIL_LEFT) / usable));
				};

				const onPointerDown = (event) => {
					if (event.button !== undefined && event.button !== 0) return;
					draggingRef.current = true;
					setHeld(true);
					railRef.current?.setPointerCapture?.(event.pointerId);
					const ratio = ratioAt(event.clientX);
					dragRef.current = ratio;
					applyPos(ratio);
					setDragIndex(steps > 0 ? Math.round(ratio * steps) : 0);
					event.preventDefault();
				};
				const onPointerMove = (event) => {
					// Only the held pointer moves the control; after release the spring owns it.
					if (!draggingRef.current) return;
					const ratio = ratioAt(event.clientX);
					dragRef.current = ratio;
					applyPos(ratio);
					const index = steps > 0 ? Math.round(ratio * steps) : 0;
					setDragIndex((current) => (current === index ? current : index));
				};
				const onPointerUp = (event) => {
					railRef.current?.releasePointerCapture?.(event.pointerId);
					const wasHeld = draggingRef.current;
					draggingRef.current = false;
					setHeld(false);
					const releasePos = dragRef.current;
					dragRef.current = null;
					setDragIndex(null);
					if (!wasHeld || releasePos === null) return;
					const target = steps > 0 ? Math.round(Math.min(1, Math.max(0, releasePos)) * steps) : 0;
					// Hand the exact release point to the spring so the settle starts where the
					// finger left off instead of snapping first.
					springRef.current = { pos: releasePos, vel: 0 };
					applyPos(releasePos);
					if (target !== currentIndex) commit(target);
				};

				const label = labels[levels[currentIndex]] ?? LABELS[levels[currentIndex]] ?? levels[currentIndex];
				const activeLabel = labels[levels[nearest]] ?? LABELS[levels[nearest]] ?? levels[nearest];
				return React.createElement(
					"div",
					{
						ref: railRef,
						"data-tl-rheo": "",
						"data-tl-busy": busy ? "" : undefined,
						"data-tl-drag": dragging ? "" : undefined,
						role: "slider",
						tabIndex: 0,
						"aria-label": "推理等级",
						"aria-valuemin": 0,
						"aria-valuemax": steps,
						"aria-valuenow": nearest,
						"aria-valuetext": activeLabel,
						title: "推理等级：" + label,
						onPointerDown,
						onPointerMove,
						onPointerUp,
						onPointerCancel: onPointerUp,
						onKeyDown: (event) => {
							if (event.key === "ArrowRight" || event.key === "ArrowUp") {
								event.preventDefault();
								commit(Math.min(steps, currentIndex + 1));
							} else if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
								event.preventDefault();
								commit(Math.max(0, currentIndex - 1));
							}
						},
					},
					React.createElement("span", { "data-tl-rheo-track": "" }),
					React.createElement("span", { "data-tl-rheo-fill": "" }),
					React.createElement("span", { "data-tl-rheo-halo": "" }),
					React.createElement("span", { "data-tl-rheo-bead": "" }),
					React.createElement("span", { key: "p" + pulse, "data-tl-rheo-pulse": "" }),
					React.createElement("span", { key: "l" + nearest, "data-tl-rheo-label": "" }, activeLabel),
				);
			}

			const disposeSlots = slots.inject("conversation.input.right", () => {
				return slots.register(
					{ name: "conversation.input.right", id: "ui-skin-tianlight:rheostat", order: -10 },
					Rheostat,
				);
			});
			// Both scopes are owned by this activation; leaking either leaves a stale
			// remote scope or a registered cell behind after the skin is switched off.
			return () => {
				if (typeof disposeSlots === "function") disposeSlots();
				if (typeof disposeRemote === "function") disposeRemote();
				if (typeof disposeSession === "function") disposeSession();
			};
		}
		//#endregion
		//#region low power
		/**
		 * Low-power mode. Three inputs, one decision:
		 *   forced on/off from the user
		 *   prefers-reduced-motion  (an explicit accessibility signal)
		 *   saveData / battery <= 20% and discharging
		 * Active mode pauses the wallpaper video on its current frame — a video element
		 * freezes for free — and stops the rail mirror from drawing.
		 */
		const LOWPOWER_KEY = "tianlight.lowpower";
		let lowPowerController = null;

		function readLowPowerMode() {
			try {
				const saved = globalThis.localStorage.getItem(LOWPOWER_KEY);
				if (saved === "on" || saved === "off" || saved === "auto") return saved;
			} catch {
				// storage may be blocked
			}
			return "auto";
		}

		function installLowPower() {
			let mode = readLowPowerMode();
			let battery = null;
			let query = null;
			let active = false;
			let reason = "";
			let detail = "";
			let subscriber = null;
			const snapshot = () => ({ mode, active, reason, detail });

			const apply = () => {
				let nextActive = mode === "on";
				let nextReason = mode === "on" ? "manual" : "";
				let nextDetail = "";
				if (mode === "auto") {
					const reduced = query !== null && query.matches === true;
					const saveData = globalThis.navigator?.connection?.saveData === true;
					const low = battery !== null && battery.level <= 0.2 && battery.charging === false;
					if (reduced) {
						nextActive = true;
						nextReason = "reduced-motion";
					} else if (saveData) {
						nextActive = true;
						nextReason = "save-data";
					} else if (low) {
						nextActive = true;
						nextReason = "battery";
						nextDetail = Math.round((battery.level ?? 0) * 100) + "% 电量且未充电";
					}
				}
				const changed = nextActive !== active || nextReason !== reason || nextDetail !== detail;
				active = nextActive;
				reason = nextReason;
				detail = nextDetail;
				const body = document.body;
				if (body === null) return;
				if (active) {
					body.setAttribute("data-tl-lowpower", "");
					body.setAttribute("data-tl-lowpower-reason", reason);
				} else {
					body.removeAttribute("data-tl-lowpower");
					body.removeAttribute("data-tl-lowpower-reason");
				}
				if (active) {
					if (scenePlayback !== null) scenePlayback.pause();
					if (railPlayback !== null) railPlayback.pause();
					if (typeof audioController !== "undefined") audioController.stop("省电模式，已停止音频");
				} else {
					if (scenePlayback !== null) scenePlayback.resume();
					if (railPlayback !== null) railPlayback.resume();
				}
				if (changed && subscriber !== null) {
					try {
						subscriber(snapshot());
					} catch (error) {
						note("lowpower:subscriber", error);
					}
				}
			};

			const onSignal = () => apply();
			try {
				if (typeof globalThis.matchMedia === "function") {
					query = globalThis.matchMedia("(prefers-reduced-motion: reduce)");
					query.addEventListener?.("change", onSignal);
				}
			} catch {
				query = null;
			}
			try {
				if (typeof globalThis.navigator?.getBattery === "function") {
					void globalThis.navigator
						.getBattery()
						.then((value) => {
							battery = value;
							battery.addEventListener?.("levelchange", onSignal);
							battery.addEventListener?.("chargingchange", onSignal);
							apply();
						})
						.catch(() => {
							// no battery API: the other signals still work
						});
				}
			} catch {
				battery = null;
			}

			apply();
			lowPowerController = {
				read: () => mode,
				/** Why playback is parked, not just whether it is. The panel needs both. */
				state: snapshot,
				subscribe: (listener) => {
					subscriber = typeof listener === "function" ? listener : null;
					if (subscriber !== null) subscriber(snapshot());
					return () => {
						if (subscriber === listener) subscriber = null;
					};
				},
				// Re-apply after a late-arriving playback target: the scene mounts after this
				// supervisor, and the rail source can be swapped at any time.
				sync: apply,
				set: (next) => {
					mode = next === "on" || next === "off" ? next : "auto";
					try {
						globalThis.localStorage.setItem(LOWPOWER_KEY, mode);
					} catch {
						// persistence is optional
					}
					apply();
				},
			};

			return () => {
				lowPowerController = null;
				subscriber = null;
				query?.removeEventListener?.("change", onSignal);
				battery?.removeEventListener?.("levelchange", onSignal);
				battery?.removeEventListener?.("chargingchange", onSignal);
				const body = document.body;
				if (body !== null) {
					body.removeAttribute("data-tl-lowpower");
					body.removeAttribute("data-tl-lowpower-reason");
				}
				if (scenePlayback !== null) scenePlayback.resume();
			};
		}
		//#endregion

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
		//#endregion

		//#region zone framing
		/**
		 * Per-zone wallpaper framing. Two zones, independent settings:
		 *   main  the picture behind the conversation
		 *   rail  the workspace column, which usually wants a different crop
		 * Each zone picks fit (crop / whole picture / stretch), the focal point that
		 * survives the crop, a dim and a blur. That is the answer to "the video's
		 * aspect ratio does not match the window".
		 */
		const ZONE_KEY = "tianlight.zones";
		const ZONE_MODES = ["cover", "contain", "stretch"];
		/** Ratio presets. `null` follows the window, which is the "avoid imbalance" default. */
		const RATIOS = { auto: null, "16:9": 16 / 9, "16:10": 1.6, "4:3": 4 / 3, "1:1": 1, "21:9": 21 / 9, "9:16": 9 / 16 };
		const ZONE_DEFAULTS = {
			main: { fit: "cover", fx: 38, fy: 50, dim: 0, blur: 0, ratio: "auto", zoom: 100, cx: 50, cy: 50 },
			rail: { fit: "cover", fx: 50, fy: 50, dim: 16, blur: 0, url: "", kind: "video" },
		};
		let zoneController = null;
		/** Playback hook for the rail's own video, owned by installZoneFraming. */
		let railPlayback = null;

		/**
		 * The crop window, in source-normalised coordinates, that yields the chosen
		 * ratio. `w/h = R / frameRatio` keeps the VISIBLE window on ratio even when
		 * the window is not: cover absorbs the remainder, so no distortion appears.
		 */
		function cropWindow(zone) {
			const zoom = Math.min(3, Math.max(0.3, (Number(zone.zoom) || 100) / 100));
			const frameRatio = (globalThis.innerWidth || 16) / (globalThis.innerHeight || 9);
			const preset = RATIOS[zone.ratio] ?? null;
			const w = 1 / zoom;
			const h = 1 / zoom;
			let cropW = w;
			let cropH = h;
			if (preset !== null) {
				// Visible ratio = frameRatio * (cropW / cropH); solving for the preset gives
				// cropH = cropW * frameRatio / preset. When that overflows the source box,
				// BOTH sides shrink by the same factor, so the ratio survives the clamp.
				cropH = (cropW * frameRatio) / preset;
				const scale = Math.min(1, 1 / cropH, 1 / cropW);
				cropW *= scale;
				cropH *= scale;
			}
			return {
				w: cropW.toFixed(4),
				h: cropH.toFixed(4),
				x: ((1 - cropW) * (Math.min(100, Math.max(0, zone.cx ?? 50)) / 100)).toFixed(4),
				y: ((1 - cropH) * (Math.min(100, Math.max(0, zone.cy ?? 50)) / 100)).toFixed(4),
			};
		}

		const pct = (value, fallback, max) => {
			if (!Number.isFinite(value)) return fallback;
			return Math.min(max, Math.max(0, Math.round(value)));
		};

		function normalizeZones(raw) {
			// `separate` is the single user-facing switch; the per-zone numbers keep
			// sensible defaults and exist only so the two framings can differ at all.
			const model = { separate: false, main: { ...ZONE_DEFAULTS.main }, rail: { ...ZONE_DEFAULTS.rail } };
			if (raw === null || typeof raw !== "object") return model;
			if (typeof raw.separate === "boolean") model.separate = raw.separate;
			for (const name of ["main", "rail"]) {
				const saved = raw[name];
				if (saved === null || typeof saved !== "object") continue;
				const zone = model[name];
				if (ZONE_MODES.includes(saved.fit)) zone.fit = saved.fit;
				zone.fx = pct(saved.fx, zone.fx, 100);
				zone.fy = pct(saved.fy, zone.fy, 100);
				zone.dim = pct(saved.dim, zone.dim, 70);
				zone.blur = pct(saved.blur, zone.blur, 12);
				if (name === "main") {
					if (typeof saved.ratio === "string" && Object.prototype.hasOwnProperty.call(RATIOS, saved.ratio)) zone.ratio = saved.ratio;
					zone.zoom = Math.min(300, Math.max(30, pct(saved.zoom, zone.zoom, 300)));
					zone.cx = pct(saved.cx, zone.cx, 100);
					zone.cy = pct(saved.cy, zone.cy, 100);
				}
				if (name === "rail") {
					if (typeof saved.url === "string" && saved.url !== "") zone.url = saved.url;
					if (saved.kind === "image" || saved.kind === "video") zone.kind = saved.kind;
				}
			}
			return model;
		}

		function readZones() {
			try {
				const raw = JSON.parse(globalThis.localStorage.getItem(ZONE_KEY) ?? "null");
				return normalizeZones(raw);
			} catch {
				return normalizeZones(null);
			}
		}

		function saveZones(model) {
			try {
				globalThis.localStorage.setItem(ZONE_KEY, JSON.stringify(model));
			} catch {
				// storage may be blocked; the framing still applies for this session
			}
		}

		function applyZones(model) {
			const scene = document.querySelector("[data-tl-scene]");
			if (scene !== null) {
				const main = model.main;
				// object-fit uses `fill` for stretch; the still layer uses a pair of lengths.
				scene.style.setProperty("--tl-fit", main.fit === "stretch" ? "fill" : main.fit);
				scene.style.setProperty("--tl-fit-size", main.fit === "stretch" ? "100% 100%" : main.fit);
				scene.style.setProperty("--tl-focal-x", main.fx + "%");
				scene.style.setProperty("--tl-focal-y", main.fy + "%");
				scene.style.setProperty("--tl-zone-dim", String(main.dim / 100));
				scene.setAttribute("data-tl-fit", main.fit);
				const crop = cropWindow(main);
				scene.style.setProperty("--crop-w", crop.w);
				scene.style.setProperty("--crop-h", crop.h);
				scene.style.setProperty("--crop-x", crop.x);
				scene.style.setProperty("--crop-y", crop.y);
			}
			const rail = document.querySelector("[data-tl-rail]");
			if (rail !== null) {
				rail.style.setProperty("--tl-rail-blur", model.rail.blur + "px");
				rail.style.setProperty("--tl-rail-dim", String(model.rail.dim / 100));
			}
		}

		/**
		 * The rail mirrors the same media through a canvas instead of opening a second
		 * decoder: one video in memory, two independent framings.
		 */
		function installZoneFraming() {
			const rail = document.createElement("div");
			rail.setAttribute("data-tl-rail", "");
			const canvas = document.createElement("canvas");
			const shade = document.createElement("div");
			shade.setAttribute("data-tl-rail-dim", "");
			rail.append(canvas, shade);
			if (document.body !== null) document.body.appendChild(rail);

			const surface = canvas.getContext("2d");
			let zones = readZones();
			let raf = 0;
			let frame = 0;
			let lastWidth = -1;

			applyZones(zones);
			let separate = zones.separate === true;
			// The rail's own source, used only when the switch is on AND a file is chosen.
			// Empty means "mirror the main wallpaper", which costs no extra decode.
			let railSource = null;
			let railUrl = "";
			const releaseRailSource = () => {
				if (railSource !== null && railSource instanceof HTMLVideoElement) {
					railSource.pause();
					railSource.removeAttribute("src");
					railSource.load();
				}
				railSource = null;
				railUrl = "";
			};
			const useRailSource = (url, kind) => {
				if (url === "" || url === null) {
					releaseRailSource();
					return;
				}
				if (url === railUrl && railSource !== null) return;
				releaseRailSource();
				railUrl = url;
				if (kind === "image") {
					const image = new Image();
					image.src = url;
					railSource = image;
					return;
				}
				const video = document.createElement("video");
				video.muted = true;
				video.loop = true;
				video.playsInline = true;
				video.preload = "auto";
				video.setAttribute("muted", "");
				video.src = url;
				// Low power keeps the rail video parked; the supervisor resumes it when
				// the mode turns off.
				if (document.body === null || document.body.hasAttribute("data-tl-lowpower") === false) {
					void video.play().catch(() => {});
				}
				railSource = video;
			};
			railPlayback = {
				pause: () => {
					stopRailLoop();
					if (railSource instanceof HTMLVideoElement) railSource.pause();
				},
				resume: () => {
					if (separate) ensureRailLoop();
					if (railSource instanceof HTMLVideoElement && railSource.paused) {
						void railSource.play().catch(() => {});
					}
				},
			};
			zoneController = {
				read: () => ({ ...zones, separate }),
				apply: (model) => {
					zones = model;
					separate = model.separate === true;
					saveZones(model);
					applyZones(model);
					useRailSource(separate ? (model.rail.url ?? "") : "", model.rail.kind);
					// Turning the switch off must take the mirror down immediately rather
					// than waiting for the next bounds sample.
					if (separate) ensureRailLoop();
					else {
						stopRailLoop();
						rail.removeAttribute("data-tl-on");
					}
				},
			};
			useRailSource(separate ? (zones.rail.url ?? "") : "", zones.rail.kind);

			const tick = () => {
				raf = 0;
				frame += 1;
				// No rail, no loop: with "same as main wallpaper" the mirror used to run a
				// full rAF loop at 60Hz just to skip every draw. The main video keeps the
				// whole frame budget now.
				if (separate === false) {
					rail.removeAttribute("data-tl-on");
					return;
				}
				if (document.body !== null && document.body.hasAttribute("data-tl-lowpower")) return;
				// Bound the sidebar every 30 frames: it is stamped later than boot and its
				// width animates when the user collapses the rail.
				if (frame % 30 === 0) {
					const sidebar = document.querySelector("[data-tl-sidebar]");
					const width = sidebar instanceof HTMLElement ? Math.round(sidebar.getBoundingClientRect().width) : 0;
					const on = separate && width > 40;
					if (on !== (rail.getAttribute("data-tl-on") !== null)) {
						rail.toggleAttribute("data-tl-on", on);
					}
					if (on && width !== lastWidth) {
						lastWidth = width;
						rail.style.width = width + "px";
						const dpr = Math.min(2, globalThis.devicePixelRatio || 1);
						canvas.width = Math.max(1, Math.round(width * dpr));
						canvas.height = Math.max(1, Math.round(window.innerHeight * dpr));
						canvas.style.height = window.innerHeight + "px";
					}
				}
				// ~12 fps is plenty for a background panel and keeps the main video smooth.
				if (
					frame % railFrameStep() === 0 &&
					rail.getAttribute("data-tl-on") !== null &&
					surface !== null &&
					document.body !== null &&
					!document.body.hasAttribute("data-tl-lowpower")
				) {
					const shaderOn = document.querySelector("[data-tl-scene][data-tl-shader-on]") !== null;
					const still = wallpaperController === null ? null : wallpaperController.image;
					const video = document.querySelector("[data-tl-scene] > video");
					// A rail-specific file wins; otherwise the rail mirrors the main media. A
					// WebGL canvas cannot be read reliably from another task (the drawing buffer
					// is cleared after compositing), so an independent shader lets the main
					// scene show through and the stale mirror frame is cleared below.
					const source =
						shaderOn && railSource === null
							? null
							: railSource !== null
								? railSource
								: still !== null && still !== undefined
									? still
									: video;
					// Every branch must be handled by TYPE: a rail video has no `.complete`,
					// and an Image has no `readyState`.
					const isVideo = source instanceof HTMLVideoElement;
					const ready = isVideo ? source.readyState >= 2 : source !== null && source !== undefined && source.complete === true;
					if (ready) {
						const sw = isVideo ? source.videoWidth : source.naturalWidth;
						const sh = isVideo ? source.videoHeight : source.naturalHeight;
						if (sw > 0 && sh > 0) {
							const cw = canvas.width;
							const ch = canvas.height;
							const zone = zones.rail;
							surface.clearRect(0, 0, cw, ch);
							if (zone.fit === "stretch") {
								surface.drawImage(source, 0, 0, sw, sh, 0, 0, cw, ch);
							} else {
								const scale = zone.fit === "contain" ? Math.min(cw / sw, ch / sh) : Math.max(cw / sw, ch / sh);
								const dw = sw * scale;
								const dh = sh * scale;
								const dx = (cw - dw) * (zone.fx / 100);
								const dy = (ch - dh) * (zone.fy / 100);
								if (zone.fit === "contain") {
									surface.fillStyle = "#0a1420";
									surface.fillRect(0, 0, cw, ch);
								}
								surface.drawImage(source, dx, dy, dw, dh);
							}
						}
					} else if (shaderOn && railSource === null) {
						surface.clearRect(0, 0, canvas.width, canvas.height);
					}
				}
				raf = globalThis.requestAnimationFrame(tick);
			};
			const ensureRailLoop = () => {
				if (raf !== 0) return;
				raf = globalThis.requestAnimationFrame(tick);
			};
			const stopRailLoop = () => {
				if (raf !== 0) globalThis.cancelAnimationFrame(raf);
				raf = 0;
			};
			if (separate) ensureRailLoop();

			return () => {
				zoneController = null;
				railPlayback = null;
				stopRailLoop();
				releaseRailSource();
				rail.remove();
			};
		}
		//#endregion

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

		//#region wallpaper sidebar
		/**
		 * A dedicated left-edge sidebar for the wallpaper, kept apart from the
		 * typography card on purpose: one is a full-height browsing surface with
		 * thumbnails, the other a small draggable settings card. Sharing one host made
		 * both feel cramped and put unrelated controls in the same panel.
		 */
		function installWallpaperSidebar(ctx) {
			if (React === null || typeof ctx.inject !== "function") return () => {};

			/**
			 * Curated presets shipped with the skin. The same recipes live in
			 * presets/*.json as shareable copies; the panel uses this list so browsing
			 * the gallery never needs a network call.
			 */
			const PRESET_ZONES = {
				separate: false,
				main: { fit: "cover", ratio: "auto", zoom: 100, cx: 50, cy: 50, fx: 38, fy: 50, dim: 0, blur: 0 },
				rail: { fit: "cover", fx: 50, fy: 50, dim: 16, blur: 0, url: "", kind: "video" },
			};
			const presetSlot = (kind, preset, opacity, blend) => ({ kind, preset, url: "", fit: "cover", opacity, blend });
			const CURATED_PRESETS = [
				{
					id: "aurora-vignette",
					label: "极光 · 暗角",
					desc: "ShaderToy 极光 + 暗角，冷色桌面",
					value: {
						format: "tianlight-preset",
						version: 1,
						zones: PRESET_ZONES,
						glass: 1,
						lowPower: "auto",
						wallpaper: { kind: "shader", url: "shader://live" },
						shader: { preset: "aurora", source: SHADER_SOURCES.aurora, speed: 1, intensity: 1, hue: 0.58 },
						layers: { version: 2, slots: [presetSlot("preset", "vignette", 0.45, "normal"), presetSlot("none", "none", 0.55, "normal")] },
					},
				},
				{
					id: "audio-scan",
					label: "音频极光 · 扫描线",
					desc: "麦克风律动 + 扫描线；需手动启用麦克风",
					value: {
						format: "tianlight-preset",
						version: 1,
						zones: PRESET_ZONES,
						glass: 1,
						lowPower: "auto",
						wallpaper: { kind: "shader", url: "shader://live" },
						shader: { preset: "audio", source: SHADER_SOURCES.audio, speed: 1, intensity: 1, hue: 0.58 },
						layers: { version: 2, slots: [presetSlot("preset", "scan", 0.28, "screen"), presetSlot("preset", "glow", 0.22, "screen")] },
					},
				},
				{
					id: "cinema-grain",
					label: "电影感 · 颗粒",
					desc: "保留当前壁纸，只加颗粒和暗角",
					value: {
						format: "tianlight-preset",
						version: 1,
						layers: { version: 2, slots: [presetSlot("preset", "grain", 0.38, "overlay"), presetSlot("preset", "vignette", 0.5, "multiply")] },
					},
				},
				{
					id: "night-glow",
					label: "冷夜 · 光晕",
					desc: "保留当前壁纸，叠加冷色光晕与扫描线",
					value: {
						format: "tianlight-preset",
						version: 1,
						layers: { version: 2, slots: [presetSlot("preset", "glow", 0.35, "screen"), presetSlot("preset", "scan", 0.18, "normal")] },
					},
				},
				{
					id: "clean",
					label: "纯净",
					desc: "清空两层叠加，回到干净壁纸",
					value: {
						format: "tianlight-preset",
						version: 1,
						layers: { version: 2, slots: [presetSlot("none", "none", 0.55, "normal"), presetSlot("none", "none", 0.55, "normal")] },
					},
				},
			];

			const WallpaperPanel = (props) => {
				const [items, setItems] = React.useState([]);
				const [active, setActive] = React.useState(() => {
					const chosen = readWallpaperChoice();
					return chosen === null ? "" : chosen.url;
				});
				// The full choice, not just its URL: the frame picker needs kind + still.
				const [activeChoice, setActiveChoice] = React.useState(() => readWallpaperChoice());
				const [draft, setDraft] = React.useState("");
				const [draftKind, setDraftKind] = React.useState("auto");
				const [draftBusy, setDraftBusy] = React.useState(false);
				const [draftNote, setDraftNote] = React.useState("");
				const [noteText, setNote] = React.useState("");
				const [weOpen, setWeOpen] = React.useState(false);
				// The source row is a real tab: it owns the highlight and the list contents.
				// "local" shows assets/, "we" shows the WE roots, "url" swaps the grid for
				// the URL composer, and "shader" for the GLSL editor.
				// "all" is the default: the panel opens on a single wallpaper grid, not a
				// source questionnaire. local/we are filters; URL and GLSL are composers.
				const [sourceTab, setSourceTab] = React.useState("all");
				const [composer, setComposer] = React.useState("none");
				// Two surfaces, one panel: "pick" is just sources + the list; "advanced"
				// reveals the adjustment groups. The old six-section wall was the main
				// complaint, so the default view no longer shows it at all.
				const [view, setView] = React.useState("pick");
				// ---- library: search, favourites and tags ----
				const [library, setLibrary] = React.useState(() => wallpaperLibraryController.read());
				const [query, setQuery] = React.useState("");
				const [favoritesOnly, setFavoritesOnly] = React.useState(false);
				const [showHidden, setShowHidden] = React.useState(false);
				const [tagFilter, setTagFilter] = React.useState([]);
				const [tagEditorUrl, setTagEditorUrl] = React.useState("");
				const [tagDraft, setTagDraft] = React.useState("");
				const [uploadBusy, setUploadBusy] = React.useState(false);
				const [uploadNote, setUploadNote] = React.useState("");
				// Optional engine availability, fetched once: the WE tab tells the truth
				// about scene support instead of rendering a dead card.
				const [engine, setEngine] = React.useState(null);
				const [engineProbe, setEngineProbe] = React.useState(0);
				React.useEffect(() => {
					let alive = true;
					void fetch(ASSET_BASE + "/_engines", { cache: "no-store" })
						.then((response) => (response.ok ? response.json() : null))
						.then((value) => {
							if (alive) setEngine(value ?? { webwallgl: false, adapter: false, sceneProjects: 0, stale: true });
						})
						.catch(() => {
							if (alive) setEngine({ webwallgl: false, adapter: false, sceneProjects: 0, stale: true });
						});
					return () => {
						alive = false;
					};
				}, [engineProbe]);
				const hostStale = engine !== null && engine.stale === true;
				// ---- ShaderToy-style GLSL editor ----
				const [shader, setShader] = React.useState(() => shaderController.read());
				const [shaderStatus, setShaderStatus] = React.useState("");
				const [audio, setAudio] = React.useState(() => audioController.read());
				const [audioNote, setAudioNote] = React.useState("");
				React.useEffect(() => audioController.subscribe((next) => setAudio(next)), []);
				const readSceneMedia = () => {
					if (typeof document === "undefined") return null;
					const scene = document.querySelector("[data-tl-scene]");
					if (scene === null) return null;
					const width = Number(scene.dataset.tlWidth) || 0;
					const height = Number(scene.dataset.tlHeight) || 0;
					const fps = Number(scene.dataset.tlFps) || 0;
					const jitter = Number(scene.dataset.tlJitter) || 0;
					return {
						width,
						height,
						fps,
						jitter,
						duration: Number(scene.dataset.tlDuration) || 0,
						kind: scene.dataset.tlMedia ?? "",
						state: scene.dataset.tlState ?? "",
						play: scene.dataset.tlPlay ?? "",
						reason: scene.dataset.tlReason ?? "",
					};
				};
				const [mediaInfo, setMediaInfo] = React.useState(() => readSceneMedia());
				React.useEffect(() => {
					if (typeof document === "undefined" || typeof MutationObserver !== "function") return;
					const scene = document.querySelector("[data-tl-scene]");
					if (scene === null) return;
					// FPS/jitter mutate every second. Coalesce them so the panel does not
					// re-render (and re-wrap its quality line) on every video frame tick.
					let syncTimer = 0;
					let lastSync = 0;
					const sync = () => {
						if (syncTimer !== 0) return;
						const wait = Math.max(0, 1800 - (performance.now() - lastSync));
						syncTimer = globalThis.setTimeout(() => {
							syncTimer = 0;
							lastSync = performance.now();
							setMediaInfo(readSceneMedia());
						}, wait);
					};
					sync();
					const observer = new MutationObserver(sync);
					observer.observe(scene, {
						attributes: true,
						attributeFilter: [
							"data-tl-media",
							"data-tl-width",
							"data-tl-height",
							"data-tl-duration",
							"data-tl-state",
							"data-tl-play",
							"data-tl-reason",
							"data-tl-fps",
							"data-tl-jitter",
						],
					});
					return () => {
						observer.disconnect();
						if (syncTimer !== 0) globalThis.clearTimeout(syncTimer);
					};
				}, []);
				// Live playback/lownpower state. The scene publishes; the panel renders the
				// exact reason a wallpaper is parked instead of guessing from a boolean.
				// FPS changes arrive here every second; only status/reason are rendered from
				// this state, so a pure frame-rate tick must not re-render the whole panel
				// (that was a visible layout shimmer while reading).
				const [playStatus, setPlayStatus] = React.useState(() => sceneStatusController.read());
				React.useEffect(
					() =>
						sceneStatusController.subscribe((next) =>
							setPlayStatus((current) =>
								current.status === next.status && current.reason === next.reason ? current : next,
							),
						),
					[],
				);
				const [powerState, setPowerState] = React.useState(() => {
					const controller = lowPowerController;
					return controller === null || typeof controller.state !== "function"
						? { mode: readLowPowerMode(), active: false, reason: "", detail: "" }
						: controller.state();
				});
				React.useEffect(() => {
					const controller = lowPowerController;
					if (controller === null || typeof controller.subscribe !== "function") return undefined;
					return controller.subscribe((next) => setPowerState(next));
				}, []);
				// ---- video static-frame picker ----
				const [frames, setFrames] = React.useState([]);
				const [frameSource, setFrameSource] = React.useState("");
				const [frameStatus, setFrameStatus] = React.useState("");
				const [frameBusy, setFrameBusy] = React.useState(false);
				const [weDraft, setWeDraft] = React.useState("");
				const [weStatus, setWeStatus] = React.useState("");
				const openWe = () => {
					setWeOpen(true);
					setNote("");
					void (async () => {
						try {
							const response = await fetch(ASSET_BASE + "/_we-roots", { cache: "no-store" });
							if (!response.ok) throw new Error(String(response.status));
							const value = await response.json();
							setWeDraft(Array.isArray(value.roots) ? value.roots.join("\n") : "");
						} catch {
							setWeStatus("无法读取目录列表（宿主接口需重启 DSH 后才存在）");
						}
					})();
				};
				const saveWe = () => {
					setWeStatus("保存中…");
					void (async () => {
						try {
							const roots = weDraft
								.split(/\r?\n/)
								.map((line) => line.trim())
								.filter((line) => line !== "");
							const response = await fetch(ASSET_BASE + "/_we-roots", {
								method: "POST",
								headers: { "content-type": "application/json" },
								body: JSON.stringify(roots),
							});
							if (!response.ok) throw new Error(String(response.status));
							const value = await response.json();
							const kept = Array.isArray(value.roots) ? value.roots.length : 0;
							setWeStatus("已保存 " + kept + " 个目录" + (kept < roots.length ? "（无效路径已忽略）" : ""));
							void listWallpapers().then((list) => {
								if (list !== null) setItems(list);
							});
						} catch {
							setWeStatus("保存失败：宿主接口需重启 DSH 后才存在");
						}
					})();
				};
				React.useEffect(() => {
					let alive = true;
					void listWallpapers().then((list) => {
						if (alive && list !== null) setItems(list);
					});
					return () => {
						alive = false;
					};
				}, []);
				const pick = (choice) => {
					if (wallpaperController !== null) wallpaperController.apply(choice);
					setActive(choice === null ? "" : choice.url);
					setActiveChoice(choice);
				};
				// ---- the only zone question that matters: separate or continuous ----
				const [zones, setZones] = React.useState(() => readZones());
				// Pan only has meaning when the crop is smaller than the frame; at 100%
				// there is nothing off-screen to move into view.
				const cropInfo = cropWindow(zones.main);
				const pannable = Number(cropInfo.w) < 1 || Number(cropInfo.h) < 1;
				const [glassLevel, setGlassLevel] = React.useState(() => readGlass());
				const [layers, setLayers] = React.useState(() => layerController.read());
				const [playback, setPlayback] = React.useState(() => playbackController.read());
				const updatePlayback = (patch) => {
					const next = playbackController.apply({ ...playback, ...patch });
					setPlayback(next);
				};
				const pauseWallpaper = () => {
					updatePlayback({ paused: true });
				};
				const resumeWallpaper = () => {
					updatePlayback({ paused: false });
				};
				const [layerSlot, setLayerSlot] = React.useState(0);
				const layerSlots = layers.slots;
				const selectedSlot = layerSlots[layerSlot];
				const layerSlotLabel = (slot) => {
					if (slot === undefined || slot.kind === "none") return "关闭";
					if (slot.kind === "image") return slot.url === "" ? "图片（未选）" : "图片";
					return slot.preset === "none" ? "关闭" : LAYER_LABELS[slot.preset] ?? "预设";
				};
				const updateLayerSlot = (index, patch) => {
					const slots = layerSlots.map((slot, position) => (position === index ? { ...slot, ...patch } : slot));
					const next = layerController.apply({ version: 2, slots });
					setLayers(next);
				};
				const swapLayers = () => {
					const next = layerController.apply({ version: 2, slots: [layerSlots[1], layerSlots[0]] });
					setLayers(next);
				};
				const [powerMode, setPowerMode] = React.useState(() => readLowPowerMode());
				const [fpsMode, setFpsMode] = React.useState(() => renderTierController.read());
				// ---- automatic rotation ----
				const [rotation, setRotation] = React.useState(() => rotationController.read());
				React.useEffect(() => rotationController.subscribe((next) => setRotation(next)), []);
				React.useEffect(
					() =>
						rotationController.observe((choice) => {
							if (choice === null) return;
							// Rotation writes the same source the picker does; mirror it into the
							// panel so "当前壁纸" never lags behind the scene.
							setActive(choice.url);
							setActiveChoice(choice);
						}),
					[],
				);
				const updateRotation = (patch) => setRotation(rotationController.apply({ ...rotation, ...patch }));
				// ---- preset import / export ----
				const [presetText, setPresetText] = React.useState("");
				const [presetStatus, setPresetStatus] = React.useState("");
				const exportPreset = () => {
					setPresetText(
						JSON.stringify({
							format: "tianlight-preset",
							version: 1,
							zones: readZones(),
							glass: readGlass(),
							lowPower: readLowPowerMode(),
							wallpaper: readWallpaperChoice(),
							shader: shaderController.read(),
							layers: layerController.read(),
							playback: playbackController.read(),
							rotation: rotationController.read(),
						}),
					);
					setPresetStatus("已生成配方，复制这段分享给别人");
				};
				const applyPresetValue = (value) => {
					if (value === null || typeof value !== "object") return "导入失败：不是有效的配方";
					let shaderRejected = false;
					try {
						// Re-validated by the existing readers: a hand-edited preset cannot push
						// values the UI itself would never produce.
						if (value.zones !== undefined) {
							const clean = normalizeZones(value.zones);
							setZones(clean);
							if (zoneController !== null) zoneController.apply(clean);
						}
						if (typeof value.glass === "number") {
							const next = Math.min(1.5, Math.max(0.35, value.glass));
							setGlassLevel(next);
							if (glassController !== null) glassController.apply(next);
						}
						if (value.lowPower === "auto" || value.lowPower === "on" || value.lowPower === "off") {
							setPowerMode(value.lowPower);
							if (lowPowerController !== null) lowPowerController.set(value.lowPower);
						}
						if (value.layers !== null && typeof value.layers === "object") {
							const clean = layerController.apply(value.layers);
							setLayers(clean);
						}
						if (value.playback !== null && typeof value.playback === "object") {
							const clean = playbackController.apply(value.playback);
							setPlayback(clean);
						}
						if (value.rotation !== null && typeof value.rotation === "object") {
							const clean = rotationController.apply(value.rotation);
							setRotation(clean);
						}
						// A recipe is the only way a shared shader travels; compile it here so a
						// broken paste cannot poison the saved settings.
						if (value.shader !== null && typeof value.shader === "object" && typeof value.shader.source === "string") {
							const error = validateShaderSource(value.shader.source);
							if (error === null) {
								const next = {
									preset: typeof value.shader.preset === "string" ? value.shader.preset : "custom",
									source: value.shader.source,
									speed: clampNumber(value.shader.speed, 0.1, 3, SHADER_DEFAULTS.speed),
									intensity: clampNumber(value.shader.intensity, 0, 2, SHADER_DEFAULTS.intensity),
									hue: clampNumber(value.shader.hue, 0, 1, SHADER_DEFAULTS.hue),
								};
								shaderController.save(next);
								setShader(next);
							} else {
								shaderRejected = true;
							}
						}
						if (value.wallpaper !== undefined && value.wallpaper !== null) {
							const verdict = resolveWallpaperChoice(value.wallpaper);
							if (verdict.ok === true) {
								setActive(verdict.choice.url);
								setActiveChoice(verdict.choice);
								if (wallpaperController !== null) wallpaperController.apply(verdict.choice);
							}
						}
					} catch {
						return "导入失败：配方内容无法应用";
					}
					return shaderRejected ? "配方已应用（着色器源码无效，已保留原设置）" : "配方已应用";
				};
				const importPreset = () => {
					try {
						const value = JSON.parse(presetText);
						setPresetStatus(applyPresetValue(value));
					} catch {
						setPresetStatus("导入失败：不是有效的配方文本");
					}
				};
				const applyCuratedPreset = (preset) => {
					setPresetText(JSON.stringify(preset.value));
					const status = applyPresetValue(preset.value);
					setPresetStatus(status === "配方已应用" ? "已应用精选：" + preset.label : status);
				};
				const applyDraft = async () => {
					const url = draft.trim();
					if (url === "") {
						setDraftNote("先粘贴一个图片或视频直链");
						return;
					}
					let parsed = null;
					try {
						parsed = new URL(url);
					} catch {
						parsed = null;
					}
					if (parsed === null || (parsed.protocol !== "http:" && parsed.protocol !== "https:")) {
						setDraftNote("地址要以 http:// 或 https:// 开头");
						return;
					}
					if (globalThis.location?.protocol === "https:" && parsed.protocol === "http:") {
						setDraftNote("当前页面是 HTTPS，浏览器会拦截 http 资源；请换用 https 地址");
						return;
					}
					setDraftBusy(true);
					setDraftNote("正在检查地址…");
					// Extension first; when the link is signed/extensionless, probe the media
					// itself instead of defaulting every unknown URL to "video" (which made
					// ordinary image CDN links fail).
					const clean = url.split(/[?#]/)[0];
					let kind = draftKind === "image" ? "image" : draftKind === "video" ? "video" : null;
					if (kind === null && /\.(png|jpe?g|webp|avif|gif|svg)$/i.test(clean)) kind = "image";
					else if (kind === null && /\.(mp4|webm|mov|m4v)$/i.test(clean)) kind = "video";
					else if (kind === null) kind = await probeUrlKind(url);
					if (kind === null) {
						setDraftBusy(false);
						setDraftNote("这不是可直接加载的图片/视频直链；请确认地址以 .jpg/.png/.mp4/.webm 等结尾，或手动选「图片 / 视频」。");
						return;
					}
					setComposer("url");
					setNote("");
					pick({ kind, url });
					setDraftBusy(false);
					setDraftNote("已应用：" + (kind === "image" ? "图片" : "视频") + " · " + (parsed.hostname || "远程地址"));
				};
				const applyShader = () => {
					const error = validateShaderSource(shader.source);
					if (error !== null) {
						setShaderStatus("编译失败：" + error);
						return;
					}
					shaderController.save(shader);
					setShaderStatus("已应用着色器");
					pick({ kind: "shader", url: "shader://live" });
				};
				const resetShader = () => {
					setShader({ ...SHADER_DEFAULTS });
					setShaderStatus("已恢复默认，点「应用着色器」生效");
				};
				const toggleAudio = async () => {
					if (audio.active) {
						audioController.stop("已停止音频");
						setAudioNote("");
						return;
					}
					setAudioNote("正在请求麦克风…");
					const result = await audioController.start();
					setAudioNote(result.ok === true ? "" : result.reason ?? "无法启用麦克风");
				};
				const useAudioPreset = () => {
					const preset = SHADER_PRESETS.find((entry) => entry.id === "audio");
					if (preset === undefined) return;
					setShader((current) => ({ ...current, preset: preset.id, source: preset.source }));
					setShaderStatus("已切到「音频极光」，点「应用着色器」生效");
				};
				// ---- video still-frame picker ----
				const requestFrames = () => {
					if (activeChoice === null || activeChoice.kind !== "video") return;
					const url = activeChoice.url;
					setFrameBusy(true);
					setFrameStatus("正在从视频取帧…");
					void sampleVideoFrames(url, 6).then((result) => {
						setFrameBusy(false);
						if (result.ok === true) {
							setFrames(result.frames);
							setFrameSource(url);
							setFrameStatus("点一帧设为静态壁纸（切走壁纸后需重新取帧）");
						} else {
							setFrames([]);
							setFrameSource("");
							setFrameStatus(result.reason);
						}
					});
				};
				const applyFrame = (time) => {
					if (activeChoice === null || activeChoice.kind !== "video") return;
					pick({ kind: "video", url: activeChoice.url, still: time });
					setFrameStatus("已设为静态帧 " + Number(time).toFixed(1) + "s");
				};
				const resumeVideo = () => {
					if (activeChoice === null || activeChoice.kind !== "video") return;
					pick({ kind: "video", url: activeChoice.url });
					setFrameStatus("已恢复动态播放");
				};
				// ---- library helpers: one read path, one write path ----
				const metaOf = (item) => library.items[item.url] ?? { favorite: false, tags: [], hidden: false };
				const nameOf = (item) =>
					item.id.replace(/^ext:\d+:/, "").replace(/^uploads\//, "").replace(/^scene:\d+:/, "");
				const updateMeta = (url, patch) => {
					const current = library.items[url] ?? { favorite: false, tags: [], hidden: false };
					const next = { ...current, ...patch };
					const nextItems = { ...library.items };
					if (next.favorite === false && next.tags.length === 0 && next.hidden !== true) delete nextItems[url];
					else nextItems[url] = next;
					const model = { items: nextItems };
					wallpaperLibraryController.write(model);
					setLibrary(model);
				};
				const formatBytes = (bytes) => {
					if (!Number.isFinite(bytes) || bytes <= 0) return "";
					const mb = bytes / (1024 * 1024);
					if (mb >= 1024) return (mb / 1024).toFixed(1) + "GB";
					return mb >= 1 ? mb.toFixed(1) + "MB" : Math.max(1, Math.round(bytes / 1024)) + "KB";
				};
				const uploadLimit =
					engine !== null && engine.upload !== undefined && Number.isFinite(engine.upload.max) ? engine.upload.max : UPLOAD_LIMIT;
				const uploadLimitMb = Math.round(uploadLimit / (1024 * 1024));
				const uploadWallpaper = (event) => {
					const input = event.currentTarget;
					const file = input.files !== null && input.files.length > 0 ? input.files[0] : null;
					// Clear immediately: picking the same file twice must still fire onChange.
					input.value = "";
					if (file === null) return;
					if (hostStale) {
						setUploadNote("宿主路由仍是旧的（404）：多半是旧的 dsh web 进程还占着 3080，新进程启动失败。先结束旧进程再启动；点「重新检测」不必刷新页面。");
						return;
					}
					if (engine !== null && engine.upload !== undefined && engine.upload.writable === false) {
						setUploadNote("上传目录不可写：检查 skin-tianlight/assets/ 的写权限");
						return;
					}
					if (file.size > uploadLimit) {
						setUploadNote("超过 " + uploadLimitMb + "MB 上限；4K 长片请先压缩，或设置 TIANLIGHT_UPLOAD_MAX");
						return;
					}
					if (/\.(mp4|m4v|mov|webm|png|jpe?g|webp|avif|gif|svg)$/i.test(file.name) === false) {
						setUploadNote("只支持 mp4/webm/mov/m4v/png/jpg/webp/avif/gif/svg");
						return;
					}
					setUploadBusy(true);
					setUploadNote("上传中…");
					void (async () => {
						try {
							const response = await fetch(ASSET_BASE + "/_upload?name=" + encodeURIComponent(file.name), {
								method: "POST",
								headers: { "content-type": file.type || "application/octet-stream" },
								body: file,
							});
							const value = await response.json().catch(() => null);
							if (!response.ok) throw new Error(value?.error ?? String(response.status));
							setUploadNote("已上传：" + String(value?.item?.id ?? file.name).replace(/^uploads\//, ""));
							const list = await listWallpapers();
							if (list !== null) setItems(list);
						} catch (error) {
							setUploadNote("上传失败：" + String(error?.message ?? error));
						} finally {
							setUploadBusy(false);
						}
					})();
				};
				const allTags = [
					...new Set(Object.values(library.items).flatMap((entry) => entry.tags ?? [])),
				].sort((left, right) => left.localeCompare(right));
				// A selected tag can outlive the last item that carried it (removed while the
				// filter is on); keep it in the row so it can still be switched off.
				const tagChoices = [...new Set([...allTags, ...tagFilter])].sort((left, right) => left.localeCompare(right));
				const filtersActive = query.trim() !== "" || favoritesOnly || tagFilter.length > 0;
				const hiddenCount = items.filter((item) => metaOf(item).hidden === true).length;
				const isWeItem = (item) => item.url.includes("/ext/") === true || item.kind === "scene";
				const allCount = items.length;
				const visibleItems = items
					.filter((item) => (sourceTab === "all" ? true : sourceTab === "we" ? isWeItem(item) : !isWeItem(item)))
					.filter((item) => showHidden || metaOf(item).hidden !== true)
					.filter((item) => favoritesOnly === false || metaOf(item).favorite)
					.filter((item) => tagFilter.length === 0 || tagFilter.some((tag) => metaOf(item).tags.includes(tag)))
					.filter((item) => {
						const needle = query.trim().toLowerCase();
						if (needle === "") return true;
						return (nameOf(item) + " " + metaOf(item).tags.join(" ")).toLowerCase().includes(needle);
					})
					.map((item) => ({ item, meta: metaOf(item) }));
				const editingItem = tagEditorUrl === "" ? null : items.find((item) => item.url === tagEditorUrl) ?? null;
				const editingMeta = editingItem === null ? { favorite: false, tags: [] } : metaOf(editingItem);
				const addTag = () => {
					if (editingItem === null) return;
					const tag = tagDraft.trim().slice(0, LIBRARY_TAG_LENGTH);
					if (tag === "" || editingMeta.tags.includes(tag)) {
						setTagDraft("");
						return;
					}
					updateMeta(editingItem.url, { tags: [...editingMeta.tags, tag].slice(0, LIBRARY_TAG_MAX) });
					setTagDraft("");
				};
				const removeTag = (tag) => {
					if (editingItem === null) return;
					updateMeta(editingItem.url, { tags: editingMeta.tags.filter((entry) => entry !== tag) });
				};
				// Plain-language orientation: what is showing now, and one sentence telling
				// the active source what to do next.
				const localCount = items.filter((item) => isWeItem(item) === false).length;
				const weCount = items.filter((item) => isWeItem(item)).length;
				const sceneCount = items.filter((item) => item.kind === "scene").length;
				const currentTitle = (() => {
					if (activeChoice === null) return "自动（按素材优先级）";
					if (activeChoice.kind === "scene") {
						const item = items.find((entry) => entry.url === activeChoice.url);
						return "场景 · " + (item !== undefined && item.title !== undefined ? item.title : activeChoice.url.slice(activeChoice.url.lastIndexOf("/") + 1));
					}
					if (activeChoice.kind === "shader") {
						const preset = SHADER_PRESETS.find((entry) => entry.id === shader.preset);
						return "ShaderToy · " + (preset === undefined ? "自定义代码" : preset.label);
					}
					const file = activeChoice.url.slice(activeChoice.url.lastIndexOf("/") + 1) || "未命名";
					const kind = activeChoice.kind === "image" ? "图片" : activeChoice.still !== undefined ? "视频静态帧" : "视频";
					return kind + " · " + file;
				})();
				const screenWidth = Math.round((globalThis.innerWidth || 0) * (globalThis.devicePixelRatio || 1));
				const screenHeight = Math.round((globalThis.innerHeight || 0) * (globalThis.devicePixelRatio || 1));
				const croppedWidth = Math.round((mediaInfo === null ? 0 : mediaInfo.width) * Number(cropInfo.w));
				const croppedHeight = Math.round((mediaInfo === null ? 0 : mediaInfo.height) * Number(cropInfo.h));
				let qualityNote = "";
				if (mediaInfo !== null && mediaInfo.state === "error") {
					qualityNote = "壁纸加载失败：请换一个文件，或检查编码/地址；皮肤会自动退回可播画面";
				} else if (mediaInfo !== null && mediaInfo.kind === "scene") {
					qualityNote =
						"画质：WebWallGL 实时场景" +
						(mediaInfo.fps > 0 ? " · 实测 " + mediaInfo.fps + "fps" : "") +
						(engine !== null && engine.webwallgl === false ? " · 引擎未就绪" : "");
				} else if (mediaInfo !== null && mediaInfo.kind === "shader") {
					qualityNote = "画质：程序化着色器，不受源分辨率影响";
				} else if (mediaInfo !== null && mediaInfo.width > 0 && mediaInfo.height > 0) {
					qualityNote =
						"画质：源 " +
						mediaInfo.width +
						"×" +
						mediaInfo.height +
						" · 当前裁切约 " +
						croppedWidth +
						"×" +
						croppedHeight +
						"px";
					const upscaled =
						zones.main.fit === "contain"
							? screenWidth > 0 && croppedWidth + 1 < screenWidth && croppedHeight + 1 < screenHeight
							: screenWidth > 0 && (croppedWidth + 1 < screenWidth || croppedHeight + 1 < screenHeight);
					qualityNote += upscaled ? " · 会放大，可能发糊" : " · 不需放大";
					if (mediaInfo.fps > 0) {
						qualityNote += " · 实测 " + mediaInfo.fps + "fps" + (mediaInfo.fps < 50 ? "（偏低）" : "");
					}
					if (mediaInfo.width >= 7680 || mediaInfo.height >= 4320) qualityNote += " · 8K 源可能被浏览器降采样";
					if (mediaInfo.duration > 0) {
						const minutes = Math.floor(mediaInfo.duration / 60);
						const seconds = String(mediaInfo.duration % 60).padStart(2, "0");
						qualityNote += " · 时长 " + minutes + ":" + seconds;
					}
				}
				const lowPowerActive = powerState.active === true;
				const hasStaticFrame = activeChoice !== null && activeChoice.kind === "video" && activeChoice.still !== undefined;
				const isVideoWallpaper =
					activeChoice !== null ? activeChoice.kind === "video" : mediaInfo !== null && mediaInfo.kind === "video";
				const isShaderWallpaper =
					activeChoice !== null ? activeChoice.kind === "shader" : mediaInfo !== null && mediaInfo.kind === "shader";
				const isImageWallpaper =
					activeChoice !== null ? activeChoice.kind === "image" : mediaInfo !== null && mediaInfo.kind === "image";
				const isSceneWallpaper =
					activeChoice !== null ? activeChoice.kind === "scene" : mediaInfo !== null && mediaInfo.kind === "scene";
				// One vocabulary for "is the wallpaper actually moving", fed by the scene
				// bus rather than inferred from a paused DOM element.
				const playState = playStatus.status || (mediaInfo === null ? "" : mediaInfo.play);
				const playReason = playStatus.reason || (mediaInfo === null ? "" : mediaInfo.reason);
				const sceneBroken = playState === "error";
				const isBlocked = playState === "blocked";
				const isStalled = playState === "stalled";
				const isBuffering = playState === "loading" || playState === "buffering";
				const isMoving = playState === "playing";
				const isPaused = playState === "paused" || playState === "hidden" || playState === "ready";
				const lowPowerReasonLabel =
					powerState.reason === "reduced-motion"
						? "系统开启了「减少动态效果」"
						: powerState.reason === "save-data"
							? "浏览器开启了流量节省"
							: powerState.reason === "battery"
								? powerState.detail || "电量偏低且未充电"
								: powerState.reason === "manual"
									? "手动开启省电"
									: "";
				const statusLabel = lowPowerActive
					? "省电暂停"
					: hasStaticFrame
						? "静态帧"
						: isBlocked
							? "自动播放被拦截"
							: isStalled
								? "画面卡住"
								: sceneBroken
									? "加载失败"
									: isImageWallpaper
										? "图片壁纸"
										: isBuffering
											? "加载中"
											: isMoving
												? isSceneWallpaper
													? "场景运行中"
													: isShaderWallpaper
														? "着色器运行中"
														: "动态播放中"
												: playState === "idle"
													? "未选择壁纸"
													: isPaused
														? "已暂停"
														: "已就绪";
				const statusTone = lowPowerActive || hasStaticFrame
					? "warn"
					: isBlocked || isStalled || sceneBroken
						? "alert"
						: isMoving
							? "live"
							: "idle";
				const statusHint = lowPowerActive
					? "省电自动暂停（" + (lowPowerReasonLabel || "省电模式") + "）；点按钮会关闭省电并恢复播放。"
					: hasStaticFrame
						? "当前固定在静态帧，刷新后仍保持；点「回到动态」恢复播放。"
						: isBlocked
							? "浏览器拦下了自动播放。点「播放动态」一次即可；之后回到页面会自动继续。"
							: isStalled
								? "已请求播放但没有新画面。点「重试」重新加载当前壁纸。"
								: sceneBroken
									? "解码或播放失败（" + (playReason || "未知原因") + "）；皮肤会自动退回可播画面。"
									: playState === "idle"
										? "还没有选择壁纸；从下面「来源」开始挑一张。"
										: isBuffering
										? "正在加载/解码，画面出现后会自动开始播放。"
										: isMoving
											? isSceneWallpaper
												? "WebWallGL 正在渲染 WE 场景；加载失败会自动退回视频/图片。"
												: isShaderWallpaper
													? "程序化着色器按当前渲染档位运行。"
													: "视频正在播放；切换页面会暂停、回来继续。"
											: isPaused
												? "已暂停在当前帧；点「继续播放」恢复。"
												: "画面已就绪。";
				const showPlaybackAction = isVideoWallpaper || isShaderWallpaper || isSceneWallpaper;
				const actionLabel = lowPowerActive
					? "关闭省电并播放"
					: hasStaticFrame
						? "回到动态"
						: isBlocked
							? "播放动态"
							: isStalled || sceneBroken
								? "重试"
								: isMoving
									? "暂停"
									: "继续播放";
				const playWallpaper = () => {
					if (lowPowerActive) {
						setPowerMode("off");
						if (lowPowerController !== null) lowPowerController.set("off");
					}
					if (hasStaticFrame) {
						updatePlayback({ paused: false });
						resumeVideo();
						return;
					}
					if (isMoving) {
						pauseWallpaper();
						return;
					}
					if (isStalled || sceneBroken) {
						// Reload the current source without changing the saved choice.
						if (wallpaperController !== null) wallpaperController.reload();
						else pick(activeChoice);
						return;
					}
					// Persisted resume: the controller applies it to the scene, so a reload
					// keeps the same intent instead of silently starting to play again.
					resumeWallpaper();
				};
				const qualityExtra = (() => {
					if (mediaInfo === null) return "";
					if (mediaInfo.jitter > 0 && mediaInfo.fps > 0) {
						return " · 帧间隔抖动 " + mediaInfo.jitter + "ms" + (mediaInfo.jitter > 90 ? "（偏高）" : "");
					}
					return "";
				})();
				const listHint =
					composer === "url"
						? "把完整媒体直链粘到下面；不是网页地址。网络直链只播放，不下载进壁纸库。"
						: composer === "shader"
							? "先选预设或贴 GLSL，调好参数，再点「应用着色器」。"
							: sourceTab === "we"
								? "Wallpaper Engine：" +
									weCount +
									" 张" +
									(sceneCount > 0 ? "（场景 " + sceneCount + "）" : "") +
									"；目录在清单顶部「配置目录」里改，场景失败会自动降级。"
								: sourceTab === "local"
									? "本地与上传：" + localCount + " 张。点缩略图直接应用；4K/8K 也可直接点。"
									: "全部壁纸：" +
										allCount +
										" 张（本地 " +
										localCount +
										" / WE " +
										weCount +
										"）。点缩略图直接应用；上方可筛选，或从「网址 / WE 目录 / GLSL」导入。";
				const sourceValue =
					composer === "url"
						? "URL 地址"
						: composer === "shader"
							? "ShaderToy"
							: sourceTab === "we"
								? "Wallpaper Engine"
								: sourceTab === "local"
									? "本地/上传"
									: "全部";
				const listValue =
					composer === "url"
						? "粘贴地址"
						: composer === "shader"
							? "GLSL"
							: (sourceTab === "we" ? weCount : sourceTab === "local" ? localCount : allCount) + " 张";
				const framingValue = zones.main.zoom + "% · " + (zones.main.ratio === "auto" ? "自动" : zones.main.ratio);
				const activeLayerLabels = layerSlots
					.filter((slot) =>
						slot.kind === "preset"
							? slot.preset !== "none"
							: slot.kind === "image"
								? slot.url !== ""
								: false,
					)
					.map((slot) => layerSlotLabel(slot));
				const appearanceValue =
					"玻璃 " +
					Math.round(glassLevel * 100) +
					"%" +
					(activeLayerLabels.length === 0 ? "" : " · " + activeLayerLabels.join(" + "));
				const performanceValue =
					(powerMode === "auto" ? "省电自动" : powerMode === "on" ? "省电开" : "省电关") +
					" · " +
					(fpsMode === "auto" ? "30fps" : fpsMode + "fps") +
					(rotation.on ? " · 轮播开" : "");
				const groupSummary = (step, title, value) =>
					React.createElement(
						"summary",
						{ className: "tl-wall-group-summary" },
						React.createElement("span", { className: "tl-wall-step" }, step),
						React.createElement("span", { className: "tl-wall-group-title" }, title),
						React.createElement("span", { className: "tl-wall-summary-value" }, value),
					);
				return React.createElement(
					"div",
					{ className: "tl-wall-inner", "data-tl-view": view },
					React.createElement("div", { className: "tl-wall-glow", "data-tl-wall-glow": "" }),
					React.createElement(
						"div",
						{ className: "tl-wall-sticky", "data-tl-wall-drag": "" },
						React.createElement(
							"div",
							{ className: "tl-wall-head" },
							React.createElement("div", { className: "tl-font-title" }, "壁纸"),
							React.createElement(
								"div",
								{ className: "tl-wall-view-switch" },
								[
									["pick", "选壁纸"],
									["advanced", "高级"],
								].map(([value, label]) =>
									React.createElement(
										"button",
										{
											key: value,
											type: "button",
											"data-active": view === value ? "" : undefined,
											onClick: () => {
												setView(value);
												// Simple view has no filter row; clear hidden filters so the list
												// cannot look mysteriously empty after leaving 高级.
												if (value === "pick") {
													setQuery("");
													setFavoritesOnly(false);
													setTagFilter([]);
													setShowHidden(false);
													setTagEditorUrl("");
												}
											},
										},
										label,
									),
								),
							),
							React.createElement(
								"button",
								{
									type: "button",
									className: "tl-font-close",
									"aria-label": "关闭壁纸侧栏",
									onClick: () => {
										if (props !== undefined && typeof props.onClose === "function") props.onClose();
									},
								},
								"\u00d7",
							),
						),
						React.createElement(
							"div",
							{ className: "tl-wall-guide" },
							React.createElement(
								"p",
								{ className: "tl-wall-status", "data-tone": statusTone, title: statusHint },
								React.createElement("span", { className: "tl-wall-status-dot", "aria-hidden": "true" }),
								statusLabel,
							),
							React.createElement(
								"p",
								{ className: "tl-wall-current", title: activeChoice === null ? undefined : activeChoice.url },
								"当前壁纸：" + currentTitle,
							),
							// The pick view is one library: all sources are already in the grid,
							// so the default action is simply "click a thumbnail". These chips
							// only filter it; URL/GLSL/WE config are secondary import actions.
							view === "pick"
								? React.createElement(
										React.Fragment,
										null,
										React.createElement(
											"div",
											{ className: "tl-wall-filter-row" },
											[
												["all", "全部", allCount],
												["local", "本地", localCount],
												["we", "WE", weCount],
											].map(([value, label, count]) =>
												React.createElement(
													"button",
													{
														key: value,
														type: "button",
														className: "tl-wall-filter-chip",
														"data-active": sourceTab === value && composer === "none" ? "" : undefined,
														onClick: () => {
															setSourceTab(value);
															setComposer("none");
															setNote("");
															const list = document.querySelector("[data-tl-wall-list]");
															if (list !== null) list.open = true;
															if (value === "we" && weCount === 0) openWe();
														},
													},
													label + " " + count,
												),
											),
										),
										React.createElement(
											"div",
											{ className: "tl-wall-import-row" },
											React.createElement(
												"button",
												{
													type: "button",
													className: "tl-wall-import-btn",
													"data-active": composer === "url" ? "" : undefined,
													onClick: () => {
													const next = composer === "url" ? "none" : "url";
													setComposer(next);
													const list = document.querySelector("[data-tl-wall-list]");
													if (list !== null) list.open = true;
													if (next === "url") {
														globalThis.setTimeout(() => {
															const input = document.querySelector("[data-tl-wall-url-input]");
															if (input !== null && typeof input.focus === "function") input.focus();
														}, 60);
													}
												},
												},
												composer === "url" ? "收起网址" : "网址导入",
											),
											React.createElement(
												"button",
												{
													type: "button",
													className: "tl-wall-import-btn",
													onClick: () => {
														setSourceTab("we");
														setComposer("none");
														const list = document.querySelector("[data-tl-wall-list]");
														if (list !== null) list.open = true;
														openWe();
													},
												},
												"WE 目录",
											),
											React.createElement(
												"button",
												{
													type: "button",
													className: "tl-wall-import-btn",
													"data-active": composer === "shader" ? "" : undefined,
													onClick: () => {
													const next = composer === "shader" ? "none" : "shader";
													setComposer(next);
													const list = document.querySelector("[data-tl-wall-list]");
													if (list !== null) list.open = true;
												},
												},
												composer === "shader" ? "收起 GLSL" : "GLSL",
											),
										),
									)
								: null,
							React.createElement(
								"p",
								{ className: "tl-wall-hint" },
								view === "pick" && statusTone === "live"
									? "点卡片立即生效；要调画面/外观点右上「高级」。"
									: statusHint,
							),
							view === "advanced" && qualityNote + qualityExtra !== ""
								? React.createElement(
										"p",
										{ className: "tl-wall-hint tl-wall-quality", title: qualityNote + qualityExtra },
										qualityNote + qualityExtra,
									)
								: null,
							showPlaybackAction
								? React.createElement(
										"div",
										{ className: "tl-wall-tabs" },
										React.createElement(
											"span",
											{ className: "tl-wall-label" },
											isMoving ? "播放中" : isBlocked ? "待恢复" : "播放",
										),
										React.createElement(
											"button",
											{ type: "button", className: "tl-font-option", "data-tone": statusTone, onClick: playWallpaper },
											actionLabel,
										),
									)
								: null,
						),
					),
					// ---- sources: which catalog the list below is drawn from ----
					React.createElement(
						"details",
						{ className: "tl-wall-group", open: false, "data-tl-group": "sources" },
						groupSummary("①", "来源（目录/代码）", sourceValue),
						React.createElement(
							"div",
							{ className: "tl-source-grid" },
							PROVIDERS.map((provider) =>
								React.createElement(
									"button",
									{
										key: provider.id,
										type: "button",
										className: "tl-source-card",
										// The clicked source owns the highlight, including URL, which
										// has no list of its own but is still a real choice.
										"data-active":
											provider.available &&
											(provider.id === "local" || provider.id === "we"
												? sourceTab === provider.id && composer === "none"
												: composer === provider.id)
												? ""
												: undefined,
										"data-tl-disabled": provider.available ? undefined : "",
										title: provider.available ? provider.note : provider.label + "：" + provider.note,
										onClick: () => {
											if (provider.id === "we") {
												// One click shows the WE selection, and the directory editor
												// only when nothing is configured yet.
												setSourceTab("we");
												setComposer("none");
												openWe();
												return;
											}
											if (provider.id === "local") {
												setSourceTab("local");
												setComposer("none");
												setNote("");
												return;
											}
											if (provider.id === "url") {
												setComposer("url");
												setNote("");
												return;
											}
											if (provider.id === "shader") {
												setComposer("shader");
												setNote("");
												return;
											}
											if (!provider.available) {
												// An unavailable source stays a note on the current tab; it must
												// not steal the selection from the source that is showing.
												setNote(provider.label + " · " + provider.note);
												globalThis.setTimeout(() => setNote(""), 6000);
												return;
											}
											setSourceTab(provider.id);
											setNote("");
										},
									},
									React.createElement("span", { className: "tl-source-name" }, provider.label),
									React.createElement("span", { className: "tl-source-note" }, provider.desc),
								),
							),
						),
						noteText === "" ? null : React.createElement("p", { className: "tl-wall-hint" }, noteText),
					),
					React.createElement(
						"details",
						{ className: "tl-wall-group", open: true, "data-tl-wall-list": "" },
						groupSummary("②", "壁纸清单", listValue),
						React.createElement("p", { className: "tl-wall-hint" }, listHint),
						// WE setup lives with the WE list, not behind ①. The pick view hides ①,
						// so keeping the directory editor there made it undiscoverable.
						sourceTab === "we" && composer === "none"
							? React.createElement(
									"div",
									{ className: "tl-wall-url" },
									React.createElement(
										"div",
										{ className: "tl-wall-tabs" },
										React.createElement("span", { className: "tl-wall-label" }, "WE 目录"),
										React.createElement(
											"button",
											{
												type: "button",
												className: "tl-font-option",
												onClick: () => {
													if (weOpen) setWeOpen(false);
													else openWe();
												},
											},
											weOpen ? "收起设置" : "配置目录",
										),
									),
									weOpen
										? React.createElement(
												"div",
												null,
												React.createElement(
													"p",
													{ className: "tl-wall-hint" },
													"把 Wallpaper Engine 的 projects 目录粘在这里，每行一个；只读，不修改原文件。",
												),
												React.createElement("textarea", {
													className: "tl-wall-textarea",
													rows: 3,
													placeholder: "每行一个绝对路径，例如 …/steamapps/workshop/content/431960/<项目ID>",
													value: weDraft,
													onChange: (event) => setWeDraft(event.target.value),
												}),
												React.createElement(
													"button",
													{ type: "button", className: "tl-font-reset", onClick: saveWe },
													"保存目录",
												),
												weStatus === "" ? null : React.createElement("p", { className: "tl-wall-hint" }, weStatus),
											)
										: React.createElement(
												"p",
												{ className: "tl-wall-hint" },
												"没有配置 WE 目录时，这里为空；点「配置目录」粘贴 Steam 的 431960 项目目录。",
											),
								)
							: null,
						composer !== "none"
							? null
							: React.createElement(
									"div",
									{ className: "tl-wall-library" },
							React.createElement(
								"div",
								{ className: "tl-wall-tabs" },
								React.createElement(
									"label",
									{
										className: "tl-wall-upload",
										"data-busy": uploadBusy ? "" : undefined,
										title: "上传后自动出现在本地清单；不会覆盖同名文件",
									},
									uploadBusy ? "上传中…" : "上传壁纸",
									React.createElement("input", {
										type: "file",
										accept: "video/*,image/*",
										disabled: uploadBusy,
										onChange: uploadWallpaper,
										style: { display: "none" },
									}),
								),
								React.createElement(
									"span",
									{ className: "tl-wall-hint" },
									hostStale ? "旧宿主仍占用端口" : "≤" + uploadLimitMb + "MB · 图片/视频",
								),
								hostStale
									? React.createElement(
											"button",
											{
												type: "button",
												className: "tl-font-option",
												onClick: () => {
													setUploadNote("正在重新检测宿主路由…");
													setEngineProbe((value) => value + 1);
												},
											},
											"重新检测",
										)
									: null,
							),
							uploadNote === "" ? null : React.createElement("p", { className: "tl-wall-hint" }, uploadNote),
							React.createElement("input", {
								className: "tl-font-input",
								type: "search",
								placeholder: "搜索名称或标签",
								"aria-label": "搜索壁纸",
								value: query,
								onChange: (event) => setQuery(event.target.value),
							}),
							React.createElement(
								"div",
								{ className: "tl-wall-tabs tl-wall-filters" },
								React.createElement(
									"button",
									{
										type: "button",
										className: "tl-font-option",
										"data-active": favoritesOnly ? "" : undefined,
										"aria-pressed": favoritesOnly,
										onClick: () => setFavoritesOnly((value) => !value),
									},
									"收藏",
								),
								hiddenCount === 0
									? null
									: React.createElement(
											"button",
											{
												type: "button",
												className: "tl-font-option",
												"data-active": showHidden ? "" : undefined,
												title: "隐藏只改变列表，不删除源文件",
												onClick: () => setShowHidden((value) => !value),
											},
											showHidden ? "隐藏中 " + hiddenCount : "显示隐藏 " + hiddenCount,
										),
								tagChoices.map((tag) =>
									React.createElement(
										"button",
										{
											key: tag,
											type: "button",
											className: "tl-font-option",
											"data-active": tagFilter.includes(tag) ? "" : undefined,
											"aria-pressed": tagFilter.includes(tag),
											onClick: () =>
												setTagFilter((current) =>
													current.includes(tag)
														? current.filter((entry) => entry !== tag)
														: [...current, tag],
												),
										},
										"#" + tag,
									),
								),
								filtersActive
									? React.createElement(
											"button",
											{
												type: "button",
												className: "tl-font-option",
												onClick: () => {
													setQuery("");
													setFavoritesOnly(false);
													setTagFilter([]);
												},
											},
											"清除筛选",
										)
									: null,
							),
						),
						editingItem === null || composer !== "none"
							? null
							: React.createElement(
									"div",
									{ className: "tl-wall-url tl-wall-tag-editor" },
									React.createElement("p", { className: "tl-wall-hint" }, "标签：" + nameOf(editingItem)),
									editingMeta.tags.length === 0
										? null
										: React.createElement(
												"div",
												{ className: "tl-wall-tabs" },
												editingMeta.tags.map((tag) =>
													React.createElement(
														"button",
														{
															key: tag,
															type: "button",
															className: "tl-font-option",
															title: "移除这个标签",
															onClick: () => removeTag(tag),
														},
														"#" + tag + " ×",
													),
												),
											),
									React.createElement("input", {
										className: "tl-font-input",
										type: "text",
										placeholder: "输入标签后回车，例如 夜景",
										value: tagDraft,
										onChange: (event) => setTagDraft(event.target.value),
										onKeyDown: (event) => {
											if (event.key === "Enter") {
												event.preventDefault();
												addTag();
											}
										},
									}),
									React.createElement(
										"div",
										{ className: "tl-wall-tabs" },
										React.createElement(
											"button",
											{
												type: "button",
												className: "tl-font-reset",
												onClick: () => {
													setTagEditorUrl("");
													setTagDraft("");
												},
											},
											"完成",
										),
									),
								),
						composer !== "none"
							? null
							: React.createElement(
									"div",
									{ className: "tl-wall-grid" },
							filtersActive
								? null
								: React.createElement(
										"button",
										{
											type: "button",
											className: "tl-wall-card",
											"data-active": active === "" ? "" : undefined,
											onClick: () => pick(null),
										},
										React.createElement("div", { className: "tl-wall-thumb tl-wall-auto" }, "自动"),
										React.createElement("span", { className: "tl-wall-name" }, "自动选择"),
										React.createElement("span", { className: "tl-wall-tags-mini" }, "按素材优先级"),
									),
							visibleItems.map(({ item, meta }) =>
								React.createElement(
									"div",
									{ key: item.id, className: "tl-wall-cell", "data-tl-hidden": meta.hidden ? "" : undefined },
									React.createElement(
										"button",
										{
											type: "button",
											className: "tl-wall-card",
											"data-active": active === item.url ? "" : undefined,
											onClick: () => pick({ kind: item.kind, url: item.url }),
										},
										React.createElement(
											"div",
											{ className: "tl-wall-thumb" },
											item.kind === "scene"
												? React.createElement("img", {
														src: item.preview || "",
														alt: item.title || nameOf(item),
														loading: "lazy",
														onError: (event) => {
															event.currentTarget.style.display = "none";
														},
													})
												: item.kind === "video"
													? React.createElement("video", {
															src: item.url + "#t=0.1",
															muted: true,
															preload: "metadata",
															playsInline: true,
															// A codec the browser cannot decode (e.g. HEVC) would
															// otherwise leave a black box that reads as "unreadable".
															onLoadedData: (event) => {
																event.currentTarget.dataset.tlThumb = "";
															},
															onError: (event) => {
																event.currentTarget.style.display = "none";
															},
														})
													: React.createElement("img", { src: item.url, alt: nameOf(item), loading: "lazy" }),
										),
										React.createElement(
											"span",
											{ className: "tl-wall-name" },
											item.kind === "scene" && item.title !== undefined ? item.title : nameOf(item),
										),
										React.createElement(
											"span",
											{ className: "tl-wall-tags-mini" },
											[
												item.kind === "video" ? "视频" : item.kind === "scene" ? "场景 · WebWallGL" : "图片",
												formatBytes(item.bytes),
												...meta.tags.map((tag) => "#" + tag),
											]
												.filter((entry) => entry !== "")
												.join(" · "),
										),
									),
									React.createElement(
										"button",
										{
											type: "button",
											className: "tl-wall-hide",
											"data-active": meta.hidden ? "" : undefined,
											"aria-label": meta.hidden ? "恢复显示" : "隐藏",
											title: meta.hidden ? "恢复显示（不删除文件）" : "隐藏（不删除文件，也不打断当前播放）",
											onClick: () => updateMeta(item.url, { hidden: meta.hidden !== true }),
										},
										meta.hidden ? "显" : "隐",
									),
									React.createElement(
										"button",
										{
											type: "button",
											className: "tl-wall-fav",
											"data-active": meta.favorite ? "" : undefined,
											"aria-label": meta.favorite ? "取消收藏" : "收藏",
											title: meta.favorite ? "取消收藏" : "收藏",
											onClick: () => updateMeta(item.url, { favorite: meta.favorite === false }),
										},
										meta.favorite ? "★" : "☆",
									),
									React.createElement(
										"button",
										{
											type: "button",
											className: "tl-wall-tag-open",
											"aria-label": "编辑标签",
											title: "编辑标签",
											onClick: () => {
												setTagEditorUrl(item.url);
												setTagDraft("");
											},
										},
										"#",
									),
								),
							),
						),
						composer === "none" && filtersActive && visibleItems.length === 0
							? React.createElement(
									"p",
									{ className: "tl-wall-hint" },
									"没有匹配的壁纸：换个关键词，或清空收藏/标签筛选",
								)
							: null,
						composer === "none" && filtersActive === false && visibleItems.length === 0
							? React.createElement(
									"p",
									{ className: "tl-wall-hint" },
									sourceTab === "we"
										? "这个目录下没有可读的视频/场景：点上方「WE 目录」检查路径；没有 Wallpaper Engine 就用本地或上传。"
										: sourceTab === "all"
											? "还没有壁纸：点下方「上传壁纸」，或用上方「网址导入 / WE 目录 / GLSL」。"
											: "本地还没有壁纸：把图片/视频放进 skin-tianlight/assets/，刷新页面即可；也可以直接点「上传壁纸」。",
								)
							: null,
						composer === "url"
							? React.createElement(
									"p",
									{ className: "tl-wall-hint" },
									"只支持「能直接打开的媒体直链」：图片或视频地址，不是网页地址。网络直链直接播放，不下载到本机；要进壁纸库请用上传。",
								)
							: null,
						composer === "url"
							? React.createElement(
									"div",
									{ className: "tl-wall-url" },
									React.createElement(
										"div",
										{ className: "tl-wall-tabs" },
										React.createElement("span", { className: "tl-wall-label" }, "类型"),
										[["auto", "自动"], ["image", "图片"], ["video", "视频"]].map(([value, label]) =>
											React.createElement(
												"button",
												{
													key: value,
													type: "button",
													className: "tl-font-option",
													"data-active": draftKind === value ? "" : undefined,
													onClick: () => {
														setDraftKind(value);
														setDraftNote("");
													},
												},
												label,
											),
										),
										React.createElement(
											"button",
											{
												type: "button",
												className: "tl-font-option",
												onClick: () => {
													void (async () => {
														try {
															const text = await globalThis.navigator?.clipboard?.readText();
															if (typeof text === "string" && text.trim() !== "") {
																setDraft(text.trim());
																setDraftNote("已从剪贴板粘贴，点「应用地址」或按回车");
																return;
															}
															setDraftNote("剪贴板是空的；请手动 Ctrl+V");
														} catch {
															setDraftNote("浏览器拒绝读取剪贴板；请手动 Ctrl+V");
														}
													})();
												},
											},
											"粘贴",
										),
									),
									React.createElement("input", {
										className: "tl-font-input",
										type: "url",
										"data-tl-wall-url-input": "",
										placeholder: "粘贴完整直链，例如 https://…/wallpaper.mp4",
										value: draft,
										onChange: (event) => {
											setDraft(event.target.value);
											setDraftNote("");
										},
										onKeyDown: (event) => {
											if (event.key === "Enter" && draftBusy === false) void applyDraft();
										},
									}),
									React.createElement(
										"button",
										{
											type: "button",
											className: "tl-font-reset",
											disabled: draftBusy,
											onClick: () => void applyDraft(),
										},
										draftBusy ? "检查中…" : "应用地址",
									),
									React.createElement(
										"p",
										{ className: "tl-wall-hint" },
										draftNote === ""
											? "自动会先按扩展名判断，无扩展名时实际探测图片/视频；不确定就保持自动。"
											: draftNote,
									),
								)
							: null,
						composer === "shader"
							? React.createElement(
									"div",
									{ className: "tl-wall-url" },
									React.createElement(
										"p",
										{ className: "tl-wall-hint" },
										"ShaderToy 风格：不需要网站账号，也不抓取 shadertoy.com。① 选预设或贴 GLSL → ② 调速度/强度/色相 → ③ 点「应用着色器」。",
									),
									React.createElement(
										"p",
										{ className: "tl-wall-hint" },
										"可用 uniform：iTime / iResolution / iMouse / u_speed / u_intensity / u_hue / u_audio。",
									),
									React.createElement(
										"div",
										{ className: "tl-wall-tabs" },
										SHADER_PRESETS.map((preset) =>
											React.createElement(
												"button",
												{
													key: preset.id,
													type: "button",
													className: "tl-font-option",
													"data-active": shader.preset === preset.id ? "" : undefined,
													onClick: () => {
														setShader((current) => ({ ...current, preset: preset.id, source: preset.source }));
														setShaderStatus("");
													},
												},
												preset.label,
											),
										),
									),
									React.createElement(
										"div",
										{ className: "tl-wall-url" },
										React.createElement(
											"p",
											{ className: "tl-wall-hint" },
											"音频响应：把麦克风实时电平送给 u_audio；只分析，不录音、不上传。",
										),
										React.createElement(
											"div",
											{ className: "tl-wall-tabs" },
											React.createElement(
												"button",
												{
													type: "button",
													className: "tl-font-option",
													"data-active": audio.active ? "" : undefined,
													disabled: audio.busy,
													onClick: toggleAudio,
												},
												audio.busy ? "请求中…" : audio.active ? "停止音频" : "启用麦克风",
											),
											React.createElement(
												"button",
												{ type: "button", className: "tl-font-option", onClick: useAudioPreset },
												"用「音频极光」",
											),
										),
										React.createElement(
											"p",
											{ className: "tl-wall-hint" },
											audioNote ||
												audio.reason ||
												(audio.active
													? "音频响应中；关闭面板/省电/页面隐藏会自动停止。"
													: "未启用。先应用 ShaderToy 壁纸，再启用。"),
										),
									),
									React.createElement("textarea", {
										className: "tl-wall-textarea tl-wall-code",
										rows: 8,
										spellCheck: false,
										"aria-label": "着色器源码",
										value: shader.source,
										onChange: (event) => {
											setShader((current) => ({ ...current, preset: "custom", source: event.target.value }));
											setShaderStatus("");
										},
									}),
									React.createElement(
										"label",
										{ className: "tl-wall-slider" },
										React.createElement("span", null, "速度 " + shader.speed.toFixed(1) + "×"),
										React.createElement("input", {
											type: "range",
											min: 0.1,
											max: 3,
											step: 0.1,
											value: shader.speed,
											onChange: (event) =>
												setShader((current) => ({ ...current, speed: Number(event.target.value) })),
										}),
									),
									React.createElement(
										"label",
										{ className: "tl-wall-slider" },
										React.createElement("span", null, "强度 " + shader.intensity.toFixed(2)),
										React.createElement("input", {
											type: "range",
											min: 0,
											max: 2,
											step: 0.05,
											value: shader.intensity,
											onChange: (event) =>
												setShader((current) => ({ ...current, intensity: Number(event.target.value) })),
										}),
									),
									React.createElement(
										"label",
										{ className: "tl-wall-slider" },
										React.createElement("span", null, "色相 " + Math.round(shader.hue * 100) + "%"),
										React.createElement("input", {
											type: "range",
											min: 0,
											max: 1,
											step: 0.01,
											value: shader.hue,
											onChange: (event) =>
												setShader((current) => ({ ...current, hue: Number(event.target.value) })),
										}),
									),
									React.createElement(
										"div",
										{ className: "tl-wall-tabs" },
										React.createElement("button", { type: "button", className: "tl-font-reset", onClick: applyShader }, "应用着色器"),
										React.createElement("button", { type: "button", className: "tl-font-reset", onClick: resetShader }, "恢复默认"),
									),
									shaderStatus === "" ? null : React.createElement("p", { className: "tl-wall-hint" }, shaderStatus),
								)
							: null,
					),
					// ---- framing: ratio-locked crop, zoom and pan ----
					React.createElement(
						"details",
						{ className: "tl-wall-group", open: false, "data-tl-group": "advanced" },
						groupSummary("③", "画面", framingValue),
						// ---- ratio-locked crop ----
						React.createElement(
							"div",
							{ className: "tl-wall-tabs" },
							Object.keys(RATIOS).map((key) =>
								React.createElement(
									"button",
									{
										key,
										type: "button",
										className: "tl-font-option",
										"data-active": zones.main.ratio === key ? "" : undefined,
										onClick: () => {
											const next = { ...zones, main: { ...zones.main, ratio: key } };
											setZones(next);
											if (zoneController !== null) zoneController.apply(next);
										},
									},
									key === "auto" ? "跟随窗口" : key,
								),
							),
						),
						React.createElement(
							"label",
							{ className: "tl-wall-slider" },
							React.createElement("span", null, "缩放 " + zones.main.zoom + "%"),
							React.createElement("input", {
								type: "range",
								min: 30,
								max: 300,
								step: 5,
								value: zones.main.zoom,
								onChange: (event) => {
									const next = { ...zones, main: { ...zones.main, zoom: Number(event.target.value) } };
									setZones(next);
									if (zoneController !== null) zoneController.apply(next);
								},
							}),
						),
						React.createElement(
							"label",
							{ className: "tl-wall-slider" },
							React.createElement("span", null, "取景横向 " + zones.main.cx + (pannable ? "%" : "% · 当前画面未裁切")),
							React.createElement("input", {
								type: "range",
								min: 0,
								max: 100,
								step: 1,
								value: zones.main.cx,
								disabled: pannable === false,
								onChange: (event) => {
									const next = { ...zones, main: { ...zones.main, cx: Number(event.target.value) } };
									setZones(next);
									if (zoneController !== null) zoneController.apply(next);
								},
							}),
						),
						React.createElement(
							"label",
							{ className: "tl-wall-slider" },
							React.createElement("span", null, "取景纵向 " + zones.main.cy + (pannable ? "%" : "% · 当前画面未裁切")),
							React.createElement("input", {
								type: "range",
								min: 0,
								max: 100,
								step: 1,
								value: zones.main.cy,
								disabled: pannable === false,
								onChange: (event) => {
									const next = { ...zones, main: { ...zones.main, cy: Number(event.target.value) } };
									setZones(next);
									if (zoneController !== null) zoneController.apply(next);
								},
							}),
						),
						React.createElement(
							"p",
							{ className: "tl-wall-hint" },
							"窗口 " + ((globalThis.innerWidth || 16) / (globalThis.innerHeight || 9)).toFixed(2) + ":1" +
								(zones.main.ratio === "auto" ? " · 裁切跟随窗口" : " · 裁切 " + zones.main.ratio),
						),
						pannable
							? null
							: React.createElement(
									"p",
									{ className: "tl-wall-hint" },
									"取景滑杆只在画面被裁切时可用：提高缩放，或换一个与窗口不同的比例。",
								),
						React.createElement(
							"div",
							{ className: "tl-wall-url" },
							React.createElement(
								"p",
								{ className: "tl-wall-hint" },
								activeChoice === null
									? "静态帧：先显式选择一个视频壁纸（自动选择不支持取帧）"
									: activeChoice.kind !== "video"
										? "静态帧：只有视频壁纸支持取帧"
										: "静态帧：从当前视频取 6 帧，点一帧固定为静态壁纸",
							),
							activeChoice !== null && activeChoice.kind === "video"
								? React.createElement(
										"div",
										{ className: "tl-wall-tabs" },
										React.createElement(
											"button",
											{ type: "button", className: "tl-font-reset", disabled: frameBusy, onClick: requestFrames },
											frameBusy ? "取帧中…" : "生成帧预览",
										),
										activeChoice.still !== undefined
											? React.createElement(
													"button",
													{ type: "button", className: "tl-font-reset", onClick: resumeVideo },
													"回到动态",
												)
											: null,
									)
								: null,
							activeChoice !== null && activeChoice.kind === "video" && activeChoice.still !== undefined
								? React.createElement(
										"p",
										{ className: "tl-wall-hint" },
										"当前：静态帧 " + Number(activeChoice.still).toFixed(1) + "s（「回到动态」恢复播放）",
									)
								: null,
							frameStatus === "" ? null : React.createElement("p", { className: "tl-wall-hint" }, frameStatus),
							frameSource === "" || activeChoice === null || frameSource !== activeChoice.url || frames.length === 0
								? null
								: React.createElement(
										"div",
										{ className: "tl-frame-grid" },
										frames.map((frame) =>
											React.createElement(
												"button",
												{
													key: frame.time,
													type: "button",
													className: "tl-frame",
													title: "设为静态帧 " + Number(frame.time).toFixed(1) + "s",
													onClick: () => applyFrame(frame.time),
												},
												React.createElement("img", { src: frame.dataUrl, alt: "" }),
												React.createElement("span", null, Number(frame.time).toFixed(1) + "s"),
											),
										),
									),
						),
						isVideoWallpaper
							? React.createElement(
									"div",
									{ className: "tl-wall-url" },
									React.createElement(
										"p",
										{ className: "tl-wall-hint" },
										"播放控制：倍速/翻转只影响视频；60fps 源仍按源帧率，倍速会按比例改变实际帧率。",
									),
									React.createElement(
										"div",
										{ className: "tl-wall-tabs" },
										React.createElement("span", { className: "tl-wall-label" }, "倍速"),
										[0.5, 1, 1.25, 1.5].map((speed) =>
											React.createElement(
												"button",
												{
													key: speed,
													type: "button",
													className: "tl-font-option",
													"data-active": playback.speed === speed ? "" : undefined,
													onClick: () => updatePlayback({ speed }),
												},
												speed + "x",
											),
										),
									),
									React.createElement(
										"div",
										{ className: "tl-wall-tabs" },
										React.createElement(
											"button",
											{
												type: "button",
												className: "tl-font-option",
												"data-active": playback.paused ? "" : undefined,
												onClick: () => updatePlayback({ paused: playback.paused === false }),
											},
											playback.paused ? "继续播放" : "暂停动态",
										),
										React.createElement(
											"button",
											{
												type: "button",
												className: "tl-font-option",
												"data-active": playback.flip ? "" : undefined,
												onClick: () => updatePlayback({ flip: playback.flip === false }),
											},
											"水平翻转",
										),
									),
									React.createElement(
										"div",
										{ className: "tl-wall-tabs" },
										React.createElement("span", { className: "tl-wall-label" }, "画面滤镜"),
										React.createElement(
											"button",
											{
												type: "button",
												className: "tl-font-option",
												"data-active": playback.filter.on ? "" : undefined,
												onClick: () => updatePlayback({ filter: { ...playback.filter, on: playback.filter.on === false } }),
											},
											playback.filter.on ? "已开启" : "默认关闭",
										),
									),
									React.createElement(
										"p",
										{ className: "tl-wall-hint" },
										playback.filter.on
											? "滤镜会多一层全屏合成；4K/60fps 下若掉帧，先关掉它。"
											: "滤镜默认关闭；开启后才对画面做亮度/对比度/饱和度调整。",
									),
									playback.filter.on
										? React.createElement(
												"div",
												null,
												[
													["brightness", "亮度"],
													["contrast", "对比度"],
													["saturate", "饱和度"],
												].map(([key, label]) =>
													React.createElement(
														"label",
														{ key, className: "tl-wall-slider" },
														React.createElement("span", null, label + " " + playback.filter[key] + "%"),
														React.createElement("input", {
															type: "range",
															min: 50,
															max: 150,
															step: 5,
															value: playback.filter[key],
															onChange: (event) =>
																updatePlayback({
																	filter: { ...playback.filter, [key]: Number(event.target.value) },
																}),
														}),
													),
												),
											)
										: null,
								)
							: null,
					),
					// ---- appearance: glass and the sidebar surface ----
					React.createElement(
						"details",
						{ className: "tl-wall-group", open: false, "data-tl-group": "advanced" },
						groupSummary("④", "外观", appearanceValue),
						// ---- glass opacity ----
						React.createElement(
							"label",
							{ className: "tl-wall-slider" },
							React.createElement("span", null, "玻璃不透明度 " + Math.round(glassLevel * 100) + "%"),
							React.createElement("input", {
								type: "range",
								min: 35,
								max: 150,
								step: 5,
								value: Math.round(glassLevel * 100),
								onChange: (event) => {
									const next = Number(event.target.value) / 100;
									setGlassLevel(next);
									if (glassController !== null) glassController.apply(next);
								},
							}),
						),
						// ---- two CSS overlay slots: no decoder, no timers ----
						React.createElement(
							"div",
							{ className: "tl-wall-tabs" },
							React.createElement("span", { className: "tl-wall-label" }, "叠加槽"),
							[0, 1].map((index) =>
								React.createElement(
									"button",
									{
										key: index,
										type: "button",
										className: "tl-font-option",
										"data-active": layerSlot === index ? "" : undefined,
										onClick: () => setLayerSlot(index),
									},
									(index === 0 ? "A（下）" : "B（上）") + " · " + layerSlotLabel(layerSlots[index]),
								),
							),
							React.createElement(
								"button",
								{ type: "button", className: "tl-font-option", onClick: swapLayers },
								"交换 A/B",
							),
						),
						React.createElement(
							"div",
							{ className: "tl-wall-tabs" },
							React.createElement("span", { className: "tl-wall-label" }, "类型"),
							[["none", "关闭"], ["preset", "预设"], ["image", "图片"]].map(([value, label]) =>
								React.createElement(
									"button",
									{
										key: value,
										type: "button",
										className: "tl-font-option",
										"data-active": selectedSlot.kind === value ? "" : undefined,
										onClick: () =>
											updateLayerSlot(layerSlot, {
												kind: value,
												preset: value === "preset" && selectedSlot.preset === "none" ? "vignette" : selectedSlot.preset,
											}),
									},
									label,
								),
							),
						),
						selectedSlot.kind === "preset"
							? React.createElement(
									"div",
									{ className: "tl-wall-tabs" },
									React.createElement("span", { className: "tl-wall-label" }, "图案"),
									Object.entries(LAYER_LABELS).map(([value, label]) =>
										React.createElement(
											"button",
											{
												key: value,
												type: "button",
												className: "tl-font-option",
												"data-active": selectedSlot.preset === value ? "" : undefined,
												onClick: () => updateLayerSlot(layerSlot, { kind: "preset", preset: value }),
											},
											label,
										),
									),
								)
							: null,
						selectedSlot.kind === "image"
							? React.createElement(
									"div",
									{ className: "tl-wall-url" },
									React.createElement(
										"select",
										{
											className: "tl-font-select",
											"aria-label": "本地图片叠加",
											value: items.some((item) => item.kind === "image" && item.url === selectedSlot.url) ? selectedSlot.url : "",
											onChange: (event) => updateLayerSlot(layerSlot, { kind: "image", url: event.target.value }),
										},
										React.createElement("option", { value: "" }, "选本地图片…"),
										items
											.filter((item) => item.kind === "image")
											.map((item) => React.createElement("option", { key: item.id, value: item.url }, item.id)),
									),
									React.createElement("input", {
										className: "tl-font-input",
										type: "url",
										placeholder: "或粘贴图片地址",
										value: selectedSlot.url,
										onChange: (event) => updateLayerSlot(layerSlot, { kind: "image", url: event.target.value }),
									}),
									React.createElement(
										"div",
										{ className: "tl-wall-tabs" },
										React.createElement("span", { className: "tl-wall-label" }, "图片适配"),
										[["cover", "填满"], ["contain", "完整"], ["stretch", "拉伸"]].map(([value, label]) =>
											React.createElement(
												"button",
												{
													key: value,
													type: "button",
													className: "tl-font-option",
													"data-active": selectedSlot.fit === value ? "" : undefined,
													onClick: () => updateLayerSlot(layerSlot, { fit: value }),
												},
												label,
											),
										),
									),
								)
							: null,
						selectedSlot.kind === "none"
							? React.createElement("p", { className: "tl-wall-hint" }, "这一槽关闭；选「预设」或「图片」启用。")
							: React.createElement(
									"label",
									{ className: "tl-wall-slider" },
									React.createElement("span", null, "叠加不透明度 " + Math.round(selectedSlot.opacity * 100) + "%"),
									React.createElement("input", {
										type: "range",
										min: 0,
										max: 100,
										step: 1,
										value: Math.round(selectedSlot.opacity * 100),
										onChange: (event) => updateLayerSlot(layerSlot, { opacity: Number(event.target.value) / 100 }),
									}),
								),
						selectedSlot.kind === "none"
							? null
							: React.createElement(
									"div",
									{ className: "tl-wall-tabs" },
									React.createElement("span", { className: "tl-wall-label" }, "混合"),
									Object.entries(LAYER_BLEND_LABELS).map(([value, label]) =>
										React.createElement(
											"button",
											{
												key: value,
												type: "button",
												className: "tl-font-option",
												"data-active": selectedSlot.blend === value ? "" : undefined,
												onClick: () => updateLayerSlot(layerSlot, { blend: value }),
											},
											label,
										),
									),
								),
						React.createElement(
							"p",
							{ className: "tl-wall-hint" },
							"两层都叠在视频/图片/Shader 之上；纯 CSS，不增加解码；省电时保持静态。",
						),
						// ---- the only zone question that matters: separate or continuous ----
						React.createElement(
							"div",
							{ className: "tl-wall-tabs" },
							React.createElement("span", { className: "tl-wall-label" }, "侧栏壁纸"),
							[["no", "与主壁纸相同"], ["yes", "独立分开"]].map(([value, label]) =>
								React.createElement(
									"button",
									{
										key: value,
										type: "button",
										className: "tl-font-option",
										"data-active": zones.separate === (value === "yes") ? "" : undefined,
										onClick: () => {
											const next = { ...zones, separate: value === "yes" };
											setZones(next);
											if (zoneController !== null) zoneController.apply(next);
										},
									},
									label,
								),
							),
						),
						zones.separate === true
							? React.createElement(
									"select",
									{
										className: "tl-font-select",
										"aria-label": "侧栏壁纸",
										value: zones.rail.url ?? "",
										onChange: (event) => {
											const url = event.target.value;
											const item = items.find((entry) => entry.url === url);
											const next = {
												...zones,
												rail: { ...zones.rail, url, kind: item === undefined ? "video" : item.kind },
											};
											setZones(next);
											if (zoneController !== null) zoneController.apply(next);
										},
									},
									React.createElement("option", { value: "" }, "侧栏：跟随主壁纸"),
									items.map((item) =>
										React.createElement("option", { key: item.id, value: item.url }, item.id),
									),
								)
							: null,
					),
					// ---- performance: render budget and battery saving ----
					React.createElement(
						"details",
						{ className: "tl-wall-group", open: false, "data-tl-group": "advanced" },
						groupSummary("⑤", "自动/性能", performanceValue),
						React.createElement(
							"div",
							{ className: "tl-wall-tabs" },
							React.createElement("span", { className: "tl-wall-label" }, "省电"),
							[["auto", "自动"], ["on", "开"], ["off", "关"]].map(([value, label]) =>
								React.createElement(
									"button",
									{
										key: value,
										type: "button",
										className: "tl-font-option",
										"data-active": powerMode === value ? "" : undefined,
										onClick: () => {
											setPowerMode(value);
											if (lowPowerController !== null) lowPowerController.set(value);
										},
									},
									label,
								),
							),
						),
						React.createElement(
							"div",
							{ className: "tl-wall-tabs" },
							React.createElement("span", { className: "tl-wall-label" }, "渲染帧率"),
							[["auto", "自动"], ["60", "60"], ["30", "30"], ["15", "15"]].map(([value, label]) =>
								React.createElement(
									"button",
									{
										key: value,
										type: "button",
										className: "tl-font-option",
										"data-active": fpsMode === value ? "" : undefined,
										onClick: () => {
											setFpsMode(value);
											renderTierController.set(value);
										},
									},
									value === "auto" ? label : label + "fps",
								),
							),
						),
						React.createElement(
							"p",
							{ className: "tl-wall-hint" },
							"帧率档位作用于 ShaderToy 渲染与侧栏镜像；视频走原生解码，按源帧率播放，60fps 源不需要设置。60fps 更耗电，省电设置优先。",
						),
						React.createElement(
							"p",
							{ className: "tl-wall-hint" },
							powerMode === "auto"
								? "自动：低电量、省流量或系统开启「减少动态效果」时，暂停动态壁纸并冻结装饰动画"
								: powerMode === "on"
									? "已暂停动态壁纸（停在当前帧），并冻结桌宠等装饰动画"
									: "始终播放动态壁纸，不再因电量或流量降级",
						),
						React.createElement(
							"div",
							{ className: "tl-wall-tabs" },
							React.createElement("span", { className: "tl-wall-label" }, "自动轮播"),
							React.createElement(
								"button",
								{
									type: "button",
									className: "tl-font-option",
									"data-active": rotation.on ? "" : undefined,
									onClick: () => updateRotation({ on: rotation.on === false }),
								},
								rotation.on ? "已开启" : "关闭",
							),
						),
						React.createElement(
							"div",
							{ className: "tl-wall-tabs" },
							React.createElement("span", { className: "tl-wall-label" }, "顺序"),
							[
								["sequence", "顺序"],
								["random", "随机"],
							].map(([value, label]) =>
								React.createElement(
									"button",
									{
										key: value,
										type: "button",
										className: "tl-font-option",
										"data-active": rotation.order === value ? "" : undefined,
										onClick: () => updateRotation({ order: value }),
									},
									label,
								),
							),
						),
						React.createElement(
							"div",
							{ className: "tl-wall-tabs" },
							React.createElement("span", { className: "tl-wall-label" }, "间隔"),
							ROTATION_INTERVALS.map((seconds) =>
								React.createElement(
									"button",
									{
										key: seconds,
										type: "button",
										className: "tl-font-option",
										"data-active": rotation.interval === seconds ? "" : undefined,
										onClick: () => updateRotation({ interval: seconds }),
									},
									seconds < 60 ? seconds + "s" : Math.round(seconds / 60) + "分",
								),
							),
						),
						React.createElement(
							"div",
							{ className: "tl-wall-tabs" },
							React.createElement(
								"button",
								{
									type: "button",
									className: "tl-font-option",
									"data-active": rotation.favoritesOnly ? "" : undefined,
									onClick: () => updateRotation({ favoritesOnly: rotation.favoritesOnly === false }),
								},
								"只轮播收藏",
							),
						),
						React.createElement(
							"p",
							{ className: "tl-wall-hint" },
							rotation.on
								? "每 " +
										(rotation.interval < 60 ? rotation.interval + " 秒" : Math.round(rotation.interval / 60) + " 分钟") +
										"换一张；页面隐藏、省电或暂停播放时顺延，当前这张不会重复选中。"
								: "开启后自动轮换本地/WE 的图片与视频；隐藏的壁纸不参与，坏文件会跳过。",
						),
					),
					// ---- recipe: the whole panel configuration, exportable ----
					React.createElement(
						"details",
						{ className: "tl-wall-group", open: false, "data-tl-group": "advanced" },
						groupSummary("⑥", "保存/分享", "精选 · 导出/导入"),
						React.createElement(
							"div",
							{ className: "tl-wall-url" },
							React.createElement(
								"p",
								{ className: "tl-wall-hint" },
								"精选配方一键套用；也可导出/导入 JSON。壁纸 + 取景 + 播放 + 玻璃 + 叠加层 + 省电（含着色器源码与参数）。",
							),
							React.createElement(
								"div",
								{ className: "tl-source-grid" },
								CURATED_PRESETS.map((preset) =>
									React.createElement(
										"button",
										{
											key: preset.id,
											type: "button",
											className: "tl-source-card",
											title: preset.desc,
											onClick: () => applyCuratedPreset(preset),
										},
										React.createElement("span", { className: "tl-source-name" }, preset.label),
										React.createElement("span", { className: "tl-source-note" }, preset.desc),
									),
								),
							),
							React.createElement("textarea", {
								className: "tl-wall-textarea",
								rows: 3,
								placeholder: "{ format: tianlight-preset }",
								value: presetText,
								onChange: (event) => setPresetText(event.target.value),
							}),
							React.createElement(
								"div",
								{ className: "tl-wall-tabs" },
								React.createElement("button", { type: "button", className: "tl-font-reset", onClick: exportPreset }, "导出配方"),
								React.createElement("button", { type: "button", className: "tl-font-reset", onClick: importPreset }, "导入配方"),
							),
							presetStatus === "" ? null : React.createElement("p", { className: "tl-wall-hint" }, presetStatus),
							// Reset lives next to the recipe: both own the same zones and glass.
							React.createElement(
								"button",
								{
									type: "button",
									className: "tl-font-reset",
									onClick: () => {
										const next = {
											...zones,
											separate: false,
											main: { ...ZONE_DEFAULTS.main },
											rail: { ...ZONE_DEFAULTS.rail },
										};
										setZones(next);
										if (zoneController !== null) zoneController.apply(next);
										setGlassLevel(1);
										if (glassController !== null) glassController.apply(1);
									},
								},
								"恢复壁纸默认",
							),
						),
					),
				);
			};

			const scrim = document.createElement("div");
			scrim.setAttribute("data-tl-wall-scrim", "");
			const host = document.createElement("div");
			host.className = "tl-wall-sidebar";
			host.setAttribute("data-tl-wall", "");
			// The trigger lives on the viewport edge, NOT in the composer: the composer is
			// for talking to the model, and a wallpaper picker there crowded the input row.
			const handle = document.createElement("button");
			handle.type = "button";
			handle.setAttribute("data-tl-wall-handle", "");
			handle.setAttribute("aria-keyshortcuts", "Alt+W");
			handle.title = "壁纸（Alt+W）";
			handle.textContent = "壁纸";
			const body = document.body;
			if (body !== null) {
				body.appendChild(scrim);
				body.appendChild(host);
				body.appendChild(handle);
			}

			let root = null;
			let open = false;
			let tintTimer = 0;

			// ---- background tinted by the wallpaper's own hue ----
			const swatch = document.createElement("canvas");
			swatch.width = 32;
			swatch.height = 18;
			let swatchCtx = null;
			try {
				swatchCtx = swatch.getContext("2d", { willReadFrequently: true });
			} catch {
				swatchCtx = null;
			}
			const tintPanel = () => {
				if (swatchCtx === null) return;
				const still = wallpaperController === null ? null : wallpaperController.image;
				const video = document.querySelector("[data-tl-scene] > video");
				// The shader snapshot is a 2D canvas copied in the render task, so it stays
				// readable even though the WebGL buffer is not preserved.
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
					if (delta < 0.05 || light < 0.08 || light > 0.95) continue;
					const sat = light > 0.5 ? delta / (2 - max - min) : delta / (max + min);
					let hue;
					if (max === r) hue = ((g - b) / delta + (g < b ? 6 : 0)) * 60;
					else if (max === g) hue = ((b - r) / delta + 2) * 60;
					else hue = ((r - g) / delta + 4) * 60;
					const rad = (hue * Math.PI) / 180;
					const w = sat * (1 - Math.abs(light - 0.55) * 1.2);
					sin += Math.sin(rad) * w;
					cos += Math.cos(rad) * w;
					satSum += sat * w;
					lightSum += light * w;
					weight += w;
				}
				if (weight <= 0.001) return;
				const hue = Math.round((((Math.atan2(sin, cos) * 180) / Math.PI) + 360) % 360);
				const sat = Math.min(0.70, Math.max(0.32, (satSum / weight) * 1.3));
				const light = lightSum / weight;
				const dark = document.body !== null && document.body.hasAttribute(DARK_ATTR);
				// Deliberately saturated: at 12-20% saturation on a 94%-light surface the
				// panel looked untinted, which is the bug this replaced.
				const fillLight = dark ? 0.15 : 0.90;
				const fillSat = Math.round(Math.min(0.52, Math.max(0.18, sat)) * 100);
				const fill = "hsl(" + hue + " " + fillSat + "% " + Math.round(fillLight * 100) + "% / calc(0.94 * var(--tl-glass-m, 1)))";
				host.style.setProperty("--tl-panel-fill", fill);
				// The edge handle carries the same tint, so the wallpaper colour is visible
				// even with the panel closed.
				handle.style.setProperty("--tl-panel-fill", fill);
				host.style.setProperty(
					"--tl-accent",
					"hsl(" + hue + " " + Math.round(sat * 100) + "% " + Math.round((dark ? 0.66 : 0.44) * 100) + "%)",
				);
			};
			const startTint = () => {
				if (tintTimer !== 0) return;
				tintPanel();
				// One delayed retry covers a video that has not decoded a frame yet at open
				// time. No polling: drawImage + getImageData from a 4K playing video every
				// few seconds caused a visible periodic hitch, which was reported as the
				// panel "shaking on its own".
				tintTimer = globalThis.setTimeout(() => {
					tintTimer = 0;
					tintPanel();
				}, 1500);
			};
			const stopTint = () => {
				if (tintTimer === 0) return;
				globalThis.clearTimeout(tintTimer);
				tintTimer = 0;
			};

			// ---- drag between edges, spring settle with a capped elastic overshoot ----
			const MAX_OVERSHOOT = 26;
			const RUBBER = 0.35;
			const MAX_VELOCITY = 1500;
			let offset = 0;
			let raf = 0;
			let drag = null;
			const panelWidth = () => host.offsetWidth || 296;
			const maxOffset = () => Math.max(0, globalThis.innerWidth - panelWidth());
			const applyX = (x) => {
				offset = x;
				host.style.transform = "translateX(" + x + "px)";
				// The border and shadow mirror whichever edge the panel settled on.
				if (x > 4) host.setAttribute("data-tl-side", "right");
				else host.removeAttribute("data-tl-side");
			};			/**
			 * Springs to one edge. Release velocity is clamped and the overshoot is
			 * hard-capped, so a violent flick cannot throw the panel across the screen.
			 */
			const settle = (target, velocity) => {
				if (raf !== 0) globalThis.cancelAnimationFrame(raf);
				const stiffness = 210;
				const damping = 26;
				const dt = 1 / 60;
				let pos = offset;
				let vel = Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, velocity)) / 60;
				const step = () => {
					vel += ((target - pos) * stiffness - vel * damping) * dt;
					pos += vel * dt;
					const over = pos - target;
					if (Math.abs(over) > MAX_OVERSHOOT) pos = target + Math.sign(over) * MAX_OVERSHOOT;
					if (Math.abs(target - pos) < 0.4 && Math.abs(vel) < 0.4) {
						applyX(target);
						raf = 0;
						return;
					}
					applyX(pos);
					raf = globalThis.requestAnimationFrame(step);
				};
				raf = globalThis.requestAnimationFrame(step);
			};
			// ---- moving light: follows the pointer, brightens with drag speed ----
			let glowNode = null;
			const updateGlow = (event, intensity) => {
				if (glowNode === null) glowNode = host.querySelector("[data-tl-wall-glow]");
				if (glowNode === null) return;
				const rect = host.getBoundingClientRect();
				if (rect.width === 0 || rect.height === 0) return;
				const x = Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100));
				const y = Math.max(0, Math.min(100, ((event.clientY - rect.top) / rect.height) * 100));
				glowNode.style.setProperty("--tl-glow-x", x.toFixed(1) + "%");
				glowNode.style.setProperty("--tl-glow-y", y.toFixed(1) + "%");
				glowNode.style.setProperty("--tl-glow-a", String(Math.max(0, Math.min(1, intensity))));
			};
			const onGlowLeave = () => {
				if (glowNode !== null) glowNode.style.setProperty("--tl-glow-a", "0");
			};

			/**
			 * Swallows exactly one upcoming click. Without it, finishing a drag that
			 * started on a wallpaper card would also "click" that card and switch the
			 * wallpaper by accident.
			 */
			const swallowNextClick = () => {
				const stop = (clickEvent) => {
					clickEvent.stopPropagation();
					clickEvent.preventDefault();
				};
				document.addEventListener("click", stop, true);
				// One cleanup path only: the timer always removes it, whether or not a
				// click arrived. Removing it in two places tripped the listener audit.
				globalThis.setTimeout(() => document.removeEventListener("click", stop, true), 80);
			};

			// Document-level capture: the panel is almost entirely made of card buttons,
			// and a host-scoped listener lost the gesture whenever a child consumed it.
			const onDragStart = (event) => {
				const target = event.target;
				if (!(target instanceof Element)) return;
				if (target.closest("[data-tl-wall]") === null) return;
				// Only the sticky title/guide block is a drag handle. The rest of the
				// panel is a normal scrolling surface; every interactive child (including
				// the dynamic-playback button) keeps its own click.
				if (target.closest("[data-tl-wall-drag]") === null) return;
				if (target.closest("button, a, input, textarea, select, summary") !== null) return;
				if (raf !== 0) {
					globalThis.cancelAnimationFrame(raf);
					raf = 0;
				}
				drag = {
					id: event.pointerId,
					startX: event.clientX,
					startOffset: offset,
					lastX: event.clientX,
					lastT: performance.now(),
					velocity: 0,
					moved: 0,
				};
				host.setAttribute("data-tl-dragging", "");
				event.preventDefault();
			};
			const onDragMove = (event) => {
				if (drag === null) {
					const target = event.target;
					if (target instanceof Element && target.closest("[data-tl-wall]") !== null) updateGlow(event, 0.34);
					return;
				}
				if (event.pointerId !== drag.id) return;
				// A pointerup delivered outside the window never reaches onDragEnd. Without
				// this check the panel keeps following the mouse with no button pressed,
				// which reads as the panel moving on its own.
				if ((event.buttons & 1) === 0) {
					onDragEnd(event);
					return;
				}
				const now = performance.now();
				const elapsed = Math.max(1, now - drag.lastT);
				drag.velocity = ((event.clientX - drag.lastX) / elapsed) * 1000;
				drag.lastX = event.clientX;
				drag.lastT = now;
				drag.moved = Math.max(drag.moved, Math.abs(event.clientX - drag.startX));
				updateGlow(event, Math.min(1, 0.25 + Math.abs(drag.velocity) / 1200));
				const raw = drag.startOffset + (event.clientX - drag.startX);
				const max = maxOffset();
				let x = raw;
				if (raw < 0) x = raw * RUBBER;
				else if (raw > max) x = max + (raw - max) * RUBBER;
				applyX(x);
			};
			const onDragEnd = (event) => {
				if (drag === null) return;
				const moved = drag.moved;
				const velocity = drag.velocity;
				drag = null;
				host.removeAttribute("data-tl-dragging");
				if (moved > 5) swallowNextClick();
				if (moved <= 4) {
					// A plain click on the title/guide must not spring the panel to an edge;
					// that made a stationary panel move "by itself" after any click.
					if (event !== undefined) event.preventDefault?.();
					return;
				}
				const max = maxOffset();
				// Only "near an edge" snaps; anywhere in the middle stays where it was
				// dropped. Always snapping to the nearest edge made every small drag spring
				// straight back, which reads as "the panel cannot be moved".
				const SNAP = 56;
				const clamped = Math.min(Math.max(offset, 0), max);
				let target = clamped;
				if (clamped <= SNAP) target = 0;
				else if (max - clamped <= SNAP) target = max;
				settle(target, velocity);
				if (event !== undefined) event.preventDefault?.();
			};
			document.addEventListener("pointerdown", onDragStart, true);
			document.addEventListener("pointermove", onDragMove, true);
			document.addEventListener("pointerup", onDragEnd, true);
			document.addEventListener("pointercancel", onDragEnd, true);
			host.addEventListener("pointerleave", onGlowLeave);

			const setOpen = (next) => {
				open = next;
				if (open) {
					host.setAttribute("data-tl-open", "");
					scrim.setAttribute("data-tl-open", "");
					handle.setAttribute("data-tl-hidden", "");
					startTint();
					audioController.clearReason();
					// Re-clamp against the current viewport before showing.
					applyX(Math.min(offset, maxOffset()));
				} else {
					host.removeAttribute("data-tl-open");
					scrim.removeAttribute("data-tl-open");
					handle.removeAttribute("data-tl-hidden");
					stopTint();
					audioController.stop("面板已关闭，已停止音频");
				}
				if (!open || root !== null) return;
				try {
					root = require("react-dom/client").createRoot(host);
					root.render(React.createElement(WallpaperPanel, { onClose: () => setOpen(false) }));
				} catch {
					root = null;
				}
			};
			const onScrim = () => setOpen(false);
			const onHandle = () => setOpen(!open);
			// The edge tab can be covered by the DSH sidebar / Windows taskbar.
			// A keyboard route must exist independently of that tab's position.
			const onKey = (event) => {
				if (event.altKey && event.ctrlKey === false && event.metaKey === false && (event.key === "w" || event.key === "W")) {
					event.preventDefault();
					setOpen(!open);
				}
			};
			// A cached offset goes stale when the viewport shrinks: a panel pinned to the
			// right edge would sit outside the window until the next drag.
			const onResize = () => {
				if (!open) return;
				const max = maxOffset();
				if (offset > max) applyX(max);
			};
			scrim.addEventListener("click", onScrim);
			handle.addEventListener("click", onHandle);
			window.addEventListener("keydown", onKey, true);
			window.addEventListener("resize", onResize);
			applyX(0);

			return () => {
				scrim.removeEventListener("click", onScrim);
				handle.removeEventListener("click", onHandle);
				window.removeEventListener("keydown", onKey, true);
				window.removeEventListener("resize", onResize);
				document.removeEventListener("pointerdown", onDragStart, true);
				document.removeEventListener("pointermove", onDragMove, true);
				document.removeEventListener("pointerup", onDragEnd, true);
				document.removeEventListener("pointercancel", onDragEnd, true);
				host.removeEventListener("pointerleave", onGlowLeave);
				stopTint();
				if (raf !== 0) globalThis.cancelAnimationFrame(raf);
				try {
					if (root !== null) root.unmount();
				} catch {
					// an already-detached root is fine
				}
				host.remove();
				scrim.remove();
				handle.remove();
			};
		}
		//#endregion

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

		function apply(ctx) {
			// Hard boundary: a DSH upgrade can change the DOM or a service without notice,
			// and an exception thrown out of apply() marks the plugin fibre failed. Catch
			// everything here so a skin defect can never take the page down with it — the
			// worst case is "no skin", never "no DSH".
			try {
				const body = document.body;
				if (body === null) {
					note("apply:no-body", {});
					return;
				}
				ctx.effect(() => installStyles(), "ui-skin-tianlight: stylesheet");
				ctx.effect(() => installGlassOpacity(), "ui-skin-tianlight: glass opacity");
				ctx.effect(() => installLowPower(), "ui-skin-tianlight: low power");
				ctx.effect(() => installSelectorBridge(), "ui-skin-tianlight: selector bridge");
				// Set and dispose the scoping attribute in ONE effect registered before any
				// fallible work: if the scene or companion throws, the attribute must still
				// have an owner that removes it, or the skin CSS stays armed for the page.
				ctx.effect(
					() => {
						body.setAttribute(BODY_ATTR, "");
						return () => {
							body.removeAttribute(BODY_ATTR);
						};
					},
					"ui-skin-tianlight: body attribute",
				);
				ctx.effect(() => installScene(), "ui-skin-tianlight: wallpaper");
				ctx.effect(() => installZoneFraming(), "ui-skin-tianlight: zone framing");
				ctx.effect(() => installCompanion(), "ui-skin-tianlight: companion");
				ctx.effect(() => installEffortRheostat(ctx), "ui-skin-tianlight: reasoning rheostat");
				ctx.effect(() => installFontPanel(ctx), "ui-skin-tianlight: font panel");
				ctx.effect(() => installWallpaperSidebar(ctx), "ui-skin-tianlight: wallpaper sidebar");
			} catch (error) {
				note("apply:failed", error);
			}
		}

		exports.apply = apply;
		return module.exports;
	}
});
