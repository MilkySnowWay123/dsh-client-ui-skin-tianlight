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
	/* v2.2.0 anti-white-cast pass: every white fill was re-tinted toward the cool
	   daylight hue and pulled down in alpha. The old recipe stacked ~0.30 white fill
	   + up to 0.52 white specular on the same pixel, which read as a grey/white veil
	   over the wallpaper ("整体泛白") instead of glass. The wallpapers stay the source
	   of colour; the glass only adds a thin, cool specular edge. */
	--tl-overlay: rgba(235, 245, 255, 0.54);
	/* Composer-only glass. Everything else stays fully transparent; this card is
	   the one surface that earns a frosted backdrop. */
	/* v2.2.2 "clear glass": the panel is a lens, not a white sheet. The fill is a
	   near-transparent cool tint; the visible body comes from the backdrop filter and
	   the 1px light/dark rim, so bright wallpapers stay coloured instead of milky. */
	--tl-glass-fill: rgba(205, 228, 250, calc(0.05 * var(--tl-glass-m, 1)));
	--tl-glass-line: rgba(255, 255, 255, 0);
	--tl-glass-blur: 12px;
	/* Modal-grade surface: a settings panel has to stay readable over the chat, so
	   it needs its own fill instead of the zeroed bg-layer tokens. The value is high
	   on purpose: the panel carries NO backdrop blur unless live mode is on (see
	   below), so its opacity is what does the legibility work there.
	   The glass slider may lower it, but only down to a legibility floor: at 0.30 the
	   panel was so transparent that the sidebar text behind it showed through, which
	   reads as "duplicate stacked UI". Data surfaces keep a hard floor.
	   v2.2.0: slightly less opaque and less pure-white; live mode lowers it further
	   because its own real backdrop blur carries the legibility. */
	--tl-panel-fill: rgba(235, 245, 255, max(0.68, calc(0.62 * var(--tl-glass-m, 1))));
	--tl-ink: #0f2438;
	--tl-ink-soft: #3a5a78;
	--tl-ink-faint: #5d7d99;
	--tl-line: rgba(112, 156, 202, 0.06);
	--tl-line-strong: rgba(86, 134, 186, 0.12);
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
	/* Text-bearing surfaces keep a legibility floor: the anti-white pass lowers the
	   decorative veil, not the contrast the dark-ink transcript needs on a night
	   wallpaper. Bubbles/tips are the two the legibility guard does not cover. */
	--dsw-specific-bubble: rgba(236, 245, 255, 0.30) !important;
	--dsw-specific-tip: rgba(238, 247, 255, 0.32) !important;
	--dsw-specific-menu: var(--tl-overlay) !important;
	--dsw-alias-bg-layer-3: rgba(236, 245, 255, 0.20) !important;
	--dsw-alias-bg-module-platform: rgba(236, 245, 255, 0.18) !important;
	--dsw-alias-interactive-bg-hover-solid: rgba(104, 156, 210, 0.22) !important;
	--dsw-alias-turn-trigger-bg: rgba(236, 245, 255, 0.18) !important;
	--dsw-alias-markdown-code-block-banner: rgba(226, 238, 250, 0.40) !important;
	/* Remaining large surfaces that 0.2.0 still paints opaque: terminal, settings
	   cards, document preview, masks, skeletons, selectors, nav items. Translucent
	   only — deliberately NO new backdrop-filter, so playback cost stays flat. */
	--dsw-alias-bg-document-preview: var(--tl-glass-fill) !important;
	--dsw-alias-bg-l1: var(--tl-glass-fill) !important;
	--dsw-alias-bg-layer-4: var(--tl-glass-fill) !important;
	--dsw-alias-bg-mask-1: rgba(236, 243, 251, 0.58) !important;
	/* Full-viewport backdrop blur: the single most expensive thing on a page with a
	   playing video, and the mask is translucent enough without it. */
	--dsw-mask-blur: none !important;
	--dsw-alias-bg-mask-drop: rgba(236, 243, 251, 0.68) !important;
	--dsw-alias-bg-skeleton: var(--tl-line) !important;
	--dsw-alias-fill-l1: rgba(236, 245, 255, 0.30) !important;
	--dsw-alias-fill-l2: rgba(236, 245, 255, 0.22) !important;
	--dsw-alias-fill-tertiary: rgba(236, 245, 255, 0.18) !important;
	--dsw-alias-fill-tsp-secondary: rgba(236, 245, 255, 0.22) !important;
	--dsw-alias-interactive-bg-active: var(--tl-accent-soft) !important;
	--dsw-alias-interactive-bg-hover-danger: rgba(192, 57, 43, 0.16) !important;
	/* v1.6.1: the sidebar "new chat" button lives on an opaque product fill token
	   (light: pure white, dark: a neutral-750 block). The skin owns 100% wallpaper, so
	   these two tokens must be glass as well; the same tokens paint every product
	   "elevated" button, which fixes their dark blocks too. The per-surface rule for
	   the stamped button is in the v1.6.1 section at the end of this sheet. */
	--dsw-alias-button-elevated-fill: var(--tl-glass-fill) !important;
	--dsw-alias-button-floating-hover: var(--tl-accent-soft) !important;
	--dsw-alias-onboarding-card-fill: var(--tl-glass-fill) !important;
	--dsw-alias-onboarding-secondary-fill: rgba(236, 245, 255, 0.18) !important;
	--dsw-alias-settings-card-fill: var(--tl-glass-fill) !important;
	--dsw-specific-input-major: var(--tl-glass-fill) !important;
	--dsw-specific-selector: rgba(236, 245, 255, 0.30) !important;
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
	--tl-glass-line: rgba(150, 195, 250, 0);
	--tl-glass-blur: 14px;
	--tl-panel-fill: rgba(10, 18, 32, max(0.96, calc(0.88 * var(--tl-glass-m, 1))));
	--tl-ink: #eaf3ff;
	--tl-ink-soft: #a9c2dc;
	--tl-ink-faint: #7f9bb8;
	--tl-line: rgba(126, 178, 232, 0.06);
	--tl-line-strong: rgba(142, 194, 246, 0.12);
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
	/* v1.6.1: same glass handover for the elevated button family in the dark theme. */
	--dsw-alias-button-elevated-fill: var(--tl-glass-fill) !important;
	--dsw-alias-button-floating-hover: var(--tl-accent-soft) !important;
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
		linear-gradient(180deg, rgba(240, 248, 255, 0.05) 0%, transparent 40%, rgba(12, 28, 48, 0.12) 100%);
}
body[data-dsh-tianlight][data-ds-dark-theme] [data-tl-scene] > [data-tl-veil] {
	background:
		linear-gradient(180deg, rgba(120, 180, 240, 0.06) 0%, transparent 42%, rgba(2, 8, 18, 0.30) 100%);
}
/* v1.6.2: the fixed top-left "dawn burst" corner artwork was removed on user feedback
   (it looked like a permanent little sun on every wallpaper). The veil above still
   supplies the sky-light tint; nothing else is pinned to the top-left corner. */

/* ---- model picker: same glass pill as the composer ----
   Targets are runtime-stamped attributes (selector bridge), never build hashes. */
body[data-dsh-tianlight] [data-tl-model] {
	background: var(--tl-glass-fill) !important;
	-webkit-backdrop-filter: blur(var(--tl-glass-blur)) saturate(1.2);
	backdrop-filter: blur(var(--tl-glass-blur)) saturate(1.2);
	border: 0.5px solid var(--tl-glass-line) !important;
	border-radius: 999px !important;
	height: 26px;
	padding-inline: 11px !important;
	transition: background 140ms ease, border-color 140ms ease;
}
body[data-dsh-tianlight] [data-tl-model]:hover {
	border-color: var(--tl-accent) !important;
}
body[data-dsh-tianlight] [data-tl-model-label] {
	font-weight: 500;
	letter-spacing: 0.01em;
}
body[data-dsh-tianlight] [data-tl-model-effort] {
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



`;
		//#endregion
