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
	   what does the legibility work.
	   The glass slider may lower it, but only down to a legibility floor: at 0.30 the
	   panel was so transparent that the sidebar text behind it showed through, which
	   reads as "duplicate stacked UI". Data surfaces keep a hard floor. */
	--tl-panel-fill: rgba(250, 252, 255, max(0.9, calc(0.84 * var(--tl-glass-m, 1))));
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
	/* v1.6.1: the sidebar "new chat" button lives on an opaque product fill token
	   (light: pure white, dark: a neutral-750 block). The skin owns 100% wallpaper, so
	   these two tokens must be glass as well; the same tokens paint every product
	   "elevated" button, which fixes their dark blocks too. The per-surface rule for
	   the stamped button is in the v1.6.1 section at the end of this sheet. */
	--dsw-alias-button-elevated-fill: var(--tl-glass-fill) !important;
	--dsw-alias-button-floating-hover: var(--tl-accent-soft) !important;
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
	--tl-panel-fill: rgba(10, 18, 32, max(0.96, calc(0.88 * var(--tl-glass-m, 1))));
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
   Targets are runtime-stamped by the selector bridge from STABLE DSH hooks
   (data-sidebar-collapsed, the _sidebarCol class suffix), so a DSH build
   hash change no longer silently drops the rule. */
body[data-dsh-tianlight] [data-tl-sidebar],
body[data-dsh-tianlight] [data-tl-sidebar-col] {
	background: transparent !important;
	background-image: none !important;
	background-color: transparent !important;
}

/* Dark theme only, left column only: nothing inside may paint a background.
   The column's own rule was already transparent, so a pure-black area had to come
   from a descendant. Hover/selection tints inside the sidebar are sacrificed here
   on purpose — no black block is worth keeping them. */
body[data-dsh-tianlight][data-ds-dark-theme] [data-tl-sidebar-col] :where(div, aside, nav, section, ul, ol, li) {
	background-color: transparent !important;
	background-image: none !important;
}

/* ---- composer only: frosted glass ----
   The rest of the interface stays fully transparent (100% wallpaper); this is the
   single surface that gets a blurred backdrop, because it is where typing happens
   and it sits over the moving picture.
   Bridge source: the stable data-composer-card attribute, or a _card suffix
   element that owns a contenteditable/textarea. */
body[data-dsh-tianlight] [data-tl-composer] {
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
body[data-dsh-tianlight][data-ds-dark-theme] [data-tl-composer] {
	box-shadow:
		0 10px 34px rgba(0, 0, 0, 0.45),
		inset 0 1px 0 var(--tl-glass-line) !important;
}

/* ---- settings panel: a solid-ish glass surface, with NO live blur ----
   The panel painted --dsw-alias-bg-layer-2, which the skin zeroes to reach 100%
   wallpaper, so the chat behind it showed through and the two text layers collided.
   It therefore needs its own fill.
   Deliberately no backdrop-filter here: the panel is large over a playing video,
   and the product's mask already blurs the full viewport (--dsw-mask-blur). Two
   stacked live blurs re-composite on every video frame and made scrolling janky.
   Opacity plus a hairline border carries the glass look at zero per-frame cost.
   Bridge source: _surface/_pane inside [data-sidebar-right-panel], or the
   legacy _panel-inside-_mask shape. */
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

/* ---- font panel: right sidebar tab + its composer trigger ----
   Own class names only, so nothing here can collide with a product class. */
/* ---- wallpaper sidebar: full height, slides in from the left edge ---- */
body[data-dsh-tianlight] [data-tl-wall-handle] {
	position: fixed;
	left: 0;
	top: 50%;
	transform: translateY(-50%);
	z-index: 1310;
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
	/* v0.5.3 hardening: the DSH product can leave a full-viewport modal mask
	   (position:fixed, z-index:1000, pointer-events:auto) mounted while it is visually
	   gone (first-run / stale popover). Such a mask swallows every real mouse click
	   while keyboard shortcuts still reach the page - the reported "the wallpaper
	   panel does not react". Skin surfaces therefore sit above the product mask and
	   below nothing else that matters; the panel starts below the title strip, so the
	   z-index gap does not cover the app menu. */
	z-index: 1300;
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
/* ---- desktop window chrome clearance (Windows) ----
   DSH Desktop's preload marks <html data-windows-titlebar> and exposes the measured
   native title strip as --dsh-windows-titlebar-height (40px on 0.2.1). Its own app
   menu is a fixed host at z-index 1100 covering that strip. A skin surface pinned to
   the very top therefore had its header painted UNDER the menu and its top row
   outside the clickable page area (the reported "panel does nothing" bug).
   Fixed surfaces that touch the top edge start below the strip instead; when the
   window is fullscreen the preload sets data-fullscreen and the clearance is gone. */
html[data-windows-titlebar]:not([data-fullscreen]) body[data-dsh-tianlight] [data-tl-wall] {
	top: var(--dsh-windows-titlebar-height, 40px);
}
html[data-windows-titlebar]:not([data-fullscreen]) body[data-dsh-tianlight] [data-tl-wall-scrim] {
	top: var(--dsh-windows-titlebar-height, 40px);
}
html[data-windows-titlebar]:not([data-fullscreen]) body[data-dsh-tianlight] [data-tl-wall-handle] {
	/* Optically centre the edge tab in the *content* area, not the whole window. */
	top: calc(50% + var(--dsh-windows-titlebar-height, 40px) / 2);
}
html[data-windows-titlebar]:not([data-fullscreen]) body[data-dsh-tianlight] [data-tl-font-panel] {
	top: max(12vh, calc(var(--dsh-windows-titlebar-height, 40px) + 12px));
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
	z-index: 1290;
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
	/* Bottom padding is a safe area: the panel is full-height and the last card used
	   to end flush against the window edge. */
	padding: 14px 14px calc(18px + env(safe-area-inset-bottom, 0px));
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
/* v0.5.0 extension sections (⑦ 工程 / ⑧ 特效 / ⑨ 情境 / ⑩ 音频 / ⑪ 引擎 …)
   are advanced surfaces too: the simple "pick a wallpaper" view stays short.
   They are one click away under 高级, in registration order. */
body[data-dsh-tianlight] [data-tl-wall] [data-tl-view="pick"] [data-tl-group]:not([data-tl-group="sources"]):not([data-tl-group="advanced"]) {
	display: none;
}
/* In the simple view the list is just upload + search + filters + grid. The filter
   row stays visible: it owns the only "显示隐藏 N" recovery entry, and hiding it
   made the small "隐" button on a card a one-way door (the card vanished with no
   way back until the user found 高级). Tag editing stays an advanced action. */
body[data-dsh-tianlight] [data-tl-view="pick"] .tl-wall-tag-editor {
	display: none;
}
body[data-dsh-tianlight] .tl-wall-hint {
	margin: 0;
	font-size: 11px;
	line-height: 1.5;
	color: var(--tl-ink-faint);
}
/* A filtered-empty list needs a way back to the full library, not just a line of
   grey text — the empty state is a small column: sentence, then the exit button. */
body[data-dsh-tianlight] .tl-wall-empty {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: 8px;
	margin: 2px 0 4px;
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
	z-index: 1320;
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

/* ---- bridge-stamped surfaces ----
   The selector bridge stamps a SMALL, semantic set of product nodes: the composer
   card, the legacy settings panel and the outermost message bubble / floating
   menu. The full visual recipes for composer/settings/sidebar live in the sections
   above; only surfaces that need a different treatment than those recipes are
   listed here. Never add a rule that relies on a build hash here. */

/* Message bubbles: fill + hairline only, no live blur. A transcript can hold dozens
   of bubbles stacked over the playing video; a backdrop-filter per bubble would
   re-composite the wallpaper behind every one of them on each frame. */
body[data-dsh-tianlight] [data-tl-bubble] {
	background: var(--tl-glass-fill) !important;
	border: 0.5px solid var(--tl-glass-line);
}

/* Floating menus / popovers: one translucent panel fill is enough. The bridge stamps
   only the outermost menu surface (the menu anchor root is deliberately excluded),
   so this costs one compositor layer per open menu, not one per menu row. */
body[data-dsh-tianlight] [data-tl-menu] {
	background: var(--tl-panel-fill) !important;
	border: 0.5px solid var(--tl-glass-line);
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
body[data-dsh-tianlight] [data-tl-cat] > [data-tl-say] {
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
body[data-dsh-tianlight] [data-tl-cat] > [data-tl-say][data-tl-show] {
	opacity: 1;
	transform: translateX(-50%) translateY(0);
}
/* v0.7.0 duty bubble: an action-capable sibling of the say bubble. It is owned by
   the duty channel (role pack adapter) and never overwrites ordinary pet speech. */
body[data-dsh-tianlight] [data-tl-cat] > [data-tl-duty] {
	position: absolute;
	bottom: calc(100% + 12px);
	left: 50%;
	transform: translateX(-50%) translateY(4px);
	width: max-content;
	max-width: 240px;
	padding: 9px 11px 8px;
	border-radius: 14px;
	background: var(--tl-overlay);
	color: var(--tl-ink);
	font: 500 12px/1.45 var(--ds-font-family, system-ui);
	box-shadow: 0 10px 28px rgba(8, 26, 44, 0.24);
	border: 0.5px solid var(--tl-line);
	opacity: 0;
	pointer-events: none;
	z-index: 2;
	transition: opacity 180ms ease, transform 180ms ease;
}
body[data-dsh-tianlight] [data-tl-cat] > [data-tl-duty][data-tl-show] {
	opacity: 1;
	transform: translateX(-50%) translateY(0);
	pointer-events: auto;
}
body[data-dsh-tianlight] [data-tl-cat] > [data-tl-duty] > [data-tl-duty-text] {
	white-space: pre-wrap;
}
body[data-dsh-tianlight] [data-tl-cat] > [data-tl-duty] > [data-tl-duty-choices] {
	display: flex;
	flex-wrap: wrap;
	gap: 4px;
	margin-top: 7px;
}
body[data-dsh-tianlight] [data-tl-cat] > [data-tl-duty] > [data-tl-duty-choices][hidden] {
	display: none;
}
body[data-dsh-tianlight] [data-tl-cat] > [data-tl-duty] button {
	appearance: none;
	border: 0.5px solid var(--tl-line);
	background: var(--tl-accent-soft);
	color: var(--tl-ink);
	font: 600 11px/1 var(--ds-font-family, system-ui);
	padding: 6px 9px;
	border-radius: 999px;
	cursor: pointer;
}
body[data-dsh-tianlight] [data-tl-cat] > [data-tl-duty] button:hover {
	background: var(--tl-accent);
	color: #fff;
}
body[data-dsh-tianlight] [data-tl-cat] > [data-tl-duty] button:focus-visible {
	outline: 2px solid var(--tl-accent);
	outline-offset: 2px;
}
body[data-dsh-tianlight] [data-tl-cat] > [data-tl-catmenu] {
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
body[data-dsh-tianlight] [data-tl-cat] > [data-tl-catmenu][data-tl-show] {
	opacity: 1;
	transform: translateX(-50%) translateY(0);
	pointer-events: auto;
}
body[data-dsh-tianlight] [data-tl-cat] > [data-tl-catmenu] > button {
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
body[data-dsh-tianlight] [data-tl-cat] > [data-tl-catmenu] > button:hover {
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

/* ---- v1.0.0 replaceable pet media: still image OR muted looping video ---- */
body[data-dsh-tianlight] [data-tl-cat] > [data-tl-cat-body] > video {
	width: 100%;
	height: 100%;
	object-fit: contain;
	pointer-events: none;
	background: transparent;
	-webkit-user-drag: none;
}
body[data-dsh-tianlight] [data-tl-cat][data-tl-cat-media="video"] > [data-tl-cat-body] {
	animation: none;
	transform-origin: 50% 92%;
}
body[data-dsh-tianlight] [data-tl-cat][data-tl-cat-media="video"][data-tl-near] > [data-tl-cat-body] {
	transform: translateY(-2px) scale(1.04);
}
/* 6 menu entries since v1.0.0 (mute / focus added): allow a second row instead of
   clipping, while keeping the single-row pill shape for the original four. */
body[data-dsh-tianlight] [data-tl-cat] > [data-tl-catmenu] {
	flex-wrap: wrap;
	width: max-content;
	max-width: 320px;
	border-radius: 16px;
	justify-content: center;
}

/* ---- v1.0.0 liquid glass depth: off / frosted / soft / real ----
   The treatment lives on the scene layer (behind the product UI): a specular
   gradient + backdrop blur/saturation over the wallpaper. "off" adds nothing, so
   the v0.7 look and the energy profile are unchanged by default. */
body[data-dsh-tianlight] {
	--tl-liquid-blur: 0px;
	--tl-liquid-sat: 1;
	--tl-liquid-hi: 0;
	--tl-liquid-lo: 0;
	--tl-liquid-noise: 0;
	--tl-liquid-sheen: 0;
	/* v1.6.1 liquid glass v2. The surface/size pairs below are the complete
	   multi-layer recipe every glass surface paints, so each rule is a one-line
	   background-image away from the whole look: a baked feTurbulence grain tile
	   (size --tl-liquid-grain), a cool bottom-right tint, the diagonal sheen, then
	   the top-left radial specular. The flat pair is the same recipe without the
	   tiled grain, for surfaces that appear in large numbers (transcript bubbles).
	   The var() references resolve against the selected depth on <body>, so only the
	   numbers and the per-level grain URL are repeated per depth. */
	--tl-liquid-grain: 140px;
	--tl-liquid-rim: 0;
	--tl-liquid-grain-image: none;
	--tl-liquid-surface:
		var(--tl-liquid-grain-image),
		radial-gradient(120% 100% at 100% 100%, rgba(120, 170, 235, calc(0.05 + var(--tl-liquid-noise) * 1.2)) 0%, rgba(96, 146, 214, calc(0.03 + var(--tl-liquid-noise) * 0.6)) 42%, rgba(80, 130, 200, 0) 72%),
		linear-gradient(115deg, rgba(255, 255, 255, var(--tl-liquid-hi)) 0%, rgba(255, 255, 255, 0) 32%, rgba(255, 255, 255, 0) 62%, rgba(255, 255, 255, var(--tl-liquid-lo)) 100%),
		radial-gradient(120% 80% at 14% 4%, rgba(255, 255, 255, var(--tl-liquid-hi)) 0%, rgba(255, 255, 255, 0) 56%);
	--tl-liquid-surface-size: var(--tl-liquid-grain) var(--tl-liquid-grain), auto, auto, auto;
	--tl-liquid-surface-flat:
		radial-gradient(120% 100% at 100% 100%, rgba(120, 170, 235, calc(0.05 + var(--tl-liquid-noise) * 1.2)) 0%, rgba(96, 146, 214, calc(0.03 + var(--tl-liquid-noise) * 0.6)) 42%, rgba(80, 130, 200, 0) 72%),
		linear-gradient(115deg, rgba(255, 255, 255, var(--tl-liquid-hi)) 0%, rgba(255, 255, 255, 0) 32%, rgba(255, 255, 255, 0) 62%, rgba(255, 255, 255, var(--tl-liquid-lo)) 100%),
		radial-gradient(120% 80% at 14% 4%, rgba(255, 255, 255, var(--tl-liquid-hi)) 0%, rgba(255, 255, 255, 0) 56%);
	--tl-liquid-surface-flat-size: auto, auto, auto;
	--tl-liquid-fallback-boost: radial-gradient(120% 90% at 18% 6%, rgba(170, 215, 255, calc(0.04 + var(--tl-liquid-sheen) * 0.10)) 0%, rgba(120, 170, 230, 0) 62%);
	/* The 1px light/dark inner edge pair and the outer soft glow, shared by every
	   surface so one box-shadow declaration composes the full v2 rim. */
	--tl-liquid-rim-shadow:
		inset 1px 1px 0 rgba(255, 255, 255, var(--tl-liquid-rim)),
		inset -1px -1px 0 rgba(4, 14, 28, calc(var(--tl-liquid-rim) * 0.55));
	--tl-liquid-glow-shadow: 0 0 calc(6px + 14px * var(--tl-liquid-sheen)) rgba(150, 200, 250, calc(var(--tl-liquid-sheen) * 0.14));
}
body[data-dsh-tianlight][data-tl-glass-effective="soft"] {
	--tl-liquid-blur: 11px;
	--tl-liquid-sat: 1.3;
	--tl-liquid-hi: 0.30;
	--tl-liquid-lo: 0.14;
	--tl-liquid-noise: 0.035;
	--tl-liquid-sheen: 0.4;
	--tl-liquid-grain: 180px;
	--tl-liquid-rim: 0.26;
	--tl-liquid-grain-image: url("data:image/svg+xml,%3Csvg%20xmlns%3D'http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg'%20width%3D'140'%20height%3D'140'%3E%3Cfilter%20id%3D'n'%3E%3CfeTurbulence%20type%3D'fractalNoise'%20baseFrequency%3D'0.9'%20numOctaves%3D'2'%20stitchTiles%3D'stitch'%2F%3E%3CfeColorMatrix%20type%3D'saturate'%20values%3D'0'%2F%3E%3C%2Ffilter%3E%3Crect%20width%3D'140'%20height%3D'140'%20filter%3D'url(%23n)'%20opacity%3D'0.035'%2F%3E%3C%2Fsvg%3E");
}
body[data-dsh-tianlight][data-tl-glass-effective="real"] {
	--tl-liquid-blur: 19px;
	--tl-liquid-sat: 1.5;
	--tl-liquid-hi: 0.52;
	--tl-liquid-lo: 0.28;
	--tl-liquid-noise: 0.05;
	--tl-liquid-sheen: 1;
	--tl-liquid-grain: 140px;
	--tl-liquid-rim: 0.46;
	--tl-liquid-grain-image: url("data:image/svg+xml,%3Csvg%20xmlns%3D'http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg'%20width%3D'140'%20height%3D'140'%3E%3Cfilter%20id%3D'n'%3E%3CfeTurbulence%20type%3D'fractalNoise'%20baseFrequency%3D'0.9'%20numOctaves%3D'2'%20stitchTiles%3D'stitch'%2F%3E%3CfeColorMatrix%20type%3D'saturate'%20values%3D'0'%2F%3E%3C%2Ffilter%3E%3Crect%20width%3D'140'%20height%3D'140'%20filter%3D'url(%23n)'%20opacity%3D'0.05'%2F%3E%3C%2Fsvg%3E");
}
body[data-dsh-tianlight][data-tl-glass-effective="frosted"] {
	--tl-liquid-blur: 26px;
	--tl-liquid-sat: 0.95;
	--tl-liquid-hi: 0.55;
	--tl-liquid-lo: 0.08;
	--tl-liquid-noise: 0.12;
	--tl-liquid-sheen: 0.12;
	--tl-liquid-grain: 110px;
	--tl-liquid-rim: 0.5;
	--tl-liquid-grain-image: url("data:image/svg+xml,%3Csvg%20xmlns%3D'http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg'%20width%3D'140'%20height%3D'140'%3E%3Cfilter%20id%3D'n'%3E%3CfeTurbulence%20type%3D'fractalNoise'%20baseFrequency%3D'0.9'%20numOctaves%3D'2'%20stitchTiles%3D'stitch'%2F%3E%3CfeColorMatrix%20type%3D'saturate'%20values%3D'0'%2F%3E%3C%2Ffilter%3E%3Crect%20width%3D'140'%20height%3D'140'%20filter%3D'url(%23n)'%20opacity%3D'0.12'%2F%3E%3C%2Fsvg%3E");
}
body[data-dsh-tianlight] [data-tl-scene]::after {
	content: "";
	position: absolute;
	inset: -2%;
	pointer-events: none;
	z-index: 2;
	opacity: 1;
	background-image: var(--tl-liquid-surface);
	background-size: var(--tl-liquid-surface-size);
	-webkit-backdrop-filter: blur(var(--tl-liquid-blur)) saturate(var(--tl-liquid-sat));
	backdrop-filter: blur(var(--tl-liquid-blur)) saturate(var(--tl-liquid-sat));
}
body[data-dsh-tianlight][data-tl-glass-effective="off"] [data-tl-scene]::after {
	display: none;
}
body[data-dsh-tianlight][data-tl-lowpower] [data-tl-scene]::after {
	animation: none !important;
	-webkit-backdrop-filter: blur(2px) saturate(1.04);
	backdrop-filter: blur(2px) saturate(1.04);
}
@keyframes tl-liquid-sheen {
	0% { transform: translate3d(-1.5%, 0, 0); }
	100% { transform: translate3d(1.5%, 0, 0); }
}
@media (prefers-reduced-motion: no-preference) {
	body[data-dsh-tianlight][data-tl-glass-effective="real"] [data-tl-scene]::after {
		animation: tl-liquid-sheen 22s ease-in-out infinite alternate;
	}
}
/* v1.5.0: make the selected depth visible on the product's own glass surfaces too
   (the wallpaper scene is optional, so a scene-only effect can look like "nothing
   happened"). These are the same glass pills/panels that already use the
   --tl-glass-* tokens; the depth only boosts blur/saturation and adds a specular
   inner highlight. */
body[data-dsh-tianlight][data-tl-glass-effective="soft"] [data-tl-model],
body[data-dsh-tianlight][data-tl-glass-effective="frosted"] [data-tl-model],
body[data-dsh-tianlight][data-tl-glass-effective="real"] [data-tl-model],
body[data-dsh-tianlight][data-tl-glass-effective="soft"] [data-tl-rheo][data-tl-rheo-empty],
body[data-dsh-tianlight][data-tl-glass-effective="frosted"] [data-tl-rheo][data-tl-rheo-empty],
body[data-dsh-tianlight][data-tl-glass-effective="real"] [data-tl-rheo][data-tl-rheo-empty] {
	-webkit-backdrop-filter: blur(var(--tl-liquid-blur)) saturate(var(--tl-liquid-sat));
	backdrop-filter: blur(var(--tl-liquid-blur)) saturate(var(--tl-liquid-sat));
	box-shadow:
		inset 0 1px 0 rgba(255, 255, 255, var(--tl-liquid-hi)),
		0 6px 20px rgba(8, 26, 44, 0.16);
	border-color: rgba(255, 255, 255, calc(var(--tl-liquid-hi) + 0.18)) !important;
}
body[data-dsh-tianlight][data-tl-glass-effective="real"] [data-tl-model],
body[data-dsh-tianlight][data-tl-glass-effective="real"] [data-tl-rheo][data-tl-rheo-empty] {
	box-shadow:
		inset 0 1px 0 rgba(255, 255, 255, var(--tl-liquid-hi)),
		0 8px 26px rgba(8, 26, 44, 0.22);
}
body[data-dsh-tianlight][data-tl-lowpower] [data-tl-model],
body[data-dsh-tianlight][data-tl-lowpower] [data-tl-rheo][data-tl-rheo-empty] {
	-webkit-backdrop-filter: blur(3px) saturate(1.05);
	backdrop-filter: blur(3px) saturate(1.05);
	box-shadow: none;
}
/* ---- v1.6.0/v1.6.1: liquid glass on the rest of the interface ----
   v1.6.1 upgrades this block to the liquid-glass v2 recipe: one shared multi-layer
   surface (tiled grain + cool tint + diagonal sheen + top-left specular), 1px
   light/dark inner rim, outer soft glow, softer/deeper blur presets and softer
   rebound transitions. The v1.6.0 grouping/performance contract is unchanged.
   v1.6.0 wired the depth preset only into the wallpaper scene layer and the skin's own
   pills, so changing depth on a normal page looked like "nothing happened". These
   grouped rules spread the same recipe over every KNOWN glass / popover surface.
   Hard constraints, in order of importance:
   - every rule is gated on data-tl-glass-effective=soft|frosted|real, so depth "off"
     adds zero declarations and the v1.4 look is untouched;
   - targets are runtime-stamped data-tl-* anchors or stable ARIA roles, never a DSH
     build-hash class name;
   - large panels (sidebar / settings / wall / hub panel) get NO extra live
     backdrop-filter: one blur layer per viewport is the budget, and these surfaces
     already paint their own fill or sit behind the product mask blur. A second
     full-size blur would re-composite on every video frame;
   - the transcript bubble list is fill + highlight only: one live blur per bubble
     would re-composite the wallpaper behind every message of a long session;
   - input controls get a hairline plus a specular top edge only, never a filter: the
     caret, IME candidate window and selection must not be re-anchored;
   - [data-tl-lowpower] flattens all of it (blur <= 3px, no shadow, no animation). */

/* Scene-less fallback. The wallpaper module is optional, so when the scene layer is
   absent the glass installer inserts one fixed data-tl-liquid-fallback node; it paints
   the SAME v2 surface stack (grain + cool tint + sheen + specular) plus one stronger
   backlight gradient, so the selected depth stays visible on a bare page. It is
   painted beneath the product UI (root is z-index 1, body is transparent) and never
   intercepts a pointer. */
body[data-dsh-tianlight]:is([data-tl-glass-effective="soft"], [data-tl-glass-effective="frosted"], [data-tl-glass-effective="real"]) [data-tl-liquid-fallback] {
	position: fixed;
	inset: 0;
	z-index: -1;
	pointer-events: none;
	background-image: var(--tl-liquid-surface), var(--tl-liquid-fallback-boost);
	background-size: var(--tl-liquid-surface-size), auto;
	-webkit-backdrop-filter: blur(var(--tl-liquid-blur)) saturate(var(--tl-liquid-sat));
	backdrop-filter: blur(var(--tl-liquid-blur)) saturate(var(--tl-liquid-sat));
	box-shadow: var(--tl-liquid-rim-shadow);
}
body[data-dsh-tianlight][data-tl-glass-effective="off"] [data-tl-liquid-fallback] {
	display: none;
}
body[data-dsh-tianlight][data-tl-lowpower]:is([data-tl-glass-effective="soft"], [data-tl-glass-effective="frosted"], [data-tl-glass-effective="real"]) [data-tl-liquid-fallback] {
	background-image: linear-gradient(115deg, rgba(255, 255, 255, var(--tl-liquid-hi)) 0%, rgba(255, 255, 255, 0) 60%);
	background-size: auto;
	-webkit-backdrop-filter: blur(2px) saturate(1.04);
	backdrop-filter: blur(2px) saturate(1.04);
	box-shadow: none;
}

/* Group A: heavy surfaces. Fill, v2 surface stack (tiled grain + cool tint + sheen +
   specular), 1px light/dark inner rim, outer soft glow and a light drop shadow.
   The sidebar column is the one place the depth adds a fill on purpose: it is a
   product surface that otherwise stays fully transparent, and "glass everywhere"
   is the point of this preset. The fill is mixed down so the wallpaper still reads
   through it. No extra backdrop-filter on these panels: one large blur layer is the
   budget, and the scene/fallback layer already owns it. */
body[data-dsh-tianlight]:is([data-tl-glass-effective="soft"], [data-tl-glass-effective="frosted"], [data-tl-glass-effective="real"]) :is([data-tl-sidebar], [data-tl-sidebar-col]) {
	background-color: color-mix(in srgb, var(--tl-glass-fill) 62%, transparent) !important;
	background-image: var(--tl-liquid-surface) !important;
	background-size: var(--tl-liquid-surface-size);
	box-shadow:
		var(--tl-liquid-rim-shadow),
		var(--tl-liquid-glow-shadow),
		0 0 0 0.5px var(--tl-glass-line),
		0 10px 30px rgba(8, 26, 44, 0.14);
}
body[data-dsh-tianlight]:is([data-tl-glass-effective="soft"], [data-tl-glass-effective="frosted"], [data-tl-glass-effective="real"]) :is([data-tl-settings], [data-tl-wall]) {
	background-image: var(--tl-liquid-surface) !important;
	background-size: var(--tl-liquid-surface-size);
	border-color: var(--tl-glass-line);
	box-shadow:
		var(--tl-liquid-rim-shadow),
		var(--tl-liquid-glow-shadow),
		0 18px 60px rgba(8, 26, 44, 0.26);
}
body[data-dsh-tianlight][data-ds-dark-theme]:is([data-tl-glass-effective="soft"], [data-tl-glass-effective="frosted"], [data-tl-glass-effective="real"]) :is([data-tl-settings], [data-tl-wall]) {
	box-shadow:
		var(--tl-liquid-rim-shadow),
		var(--tl-liquid-glow-shadow),
		0 18px 60px rgba(0, 0, 0, 0.55);
}
body[data-dsh-tianlight]:is([data-tl-glass-effective="soft"], [data-tl-glass-effective="frosted"], [data-tl-glass-effective="real"]) [data-tl-hub] [data-tl-hub-panel] {
	background-image: var(--tl-liquid-surface);
	background-size: var(--tl-liquid-surface-size);
	border-color: var(--tl-glass-line);
	box-shadow:
		var(--tl-liquid-rim-shadow),
		var(--tl-liquid-glow-shadow),
		0 28px 80px rgba(4, 14, 26, 0.45);
}

/* ARIA fallbacks. The bridge stamps the surfaces it recognises; the product also
   ships plain role="dialog|menu|listbox|tooltip|tabpanel" nodes. Their fill is left
   alone (an unknown product panel keeps its own legibility floor); the depth adds the
   v2 light signature: the surface stack, the 1px light/dark rim drawn with a
   box-shadow (so nothing reflows) and the outer soft glow. */
body[data-dsh-tianlight]:is([data-tl-glass-effective="soft"], [data-tl-glass-effective="frosted"], [data-tl-glass-effective="real"]) :is([role="dialog"], [role="menu"], [role="listbox"]) {
	background-image: var(--tl-liquid-surface);
	background-size: var(--tl-liquid-surface-size);
	box-shadow:
		var(--tl-liquid-rim-shadow),
		var(--tl-liquid-glow-shadow),
		0 0 0 0.5px var(--tl-glass-line),
		0 12px 34px rgba(8, 26, 44, 0.18);
}

/* Group B: light surfaces. The flat stack (no tiled grain) keeps a long transcript
   cheap: hundreds of bubbles must not each paint an SVG noise tile; the detached
   tooltip/tabpanel surfaces are few enough for the full stack. No per-item blur. */
body[data-dsh-tianlight]:is([data-tl-glass-effective="soft"], [data-tl-glass-effective="frosted"], [data-tl-glass-effective="real"]) :is([data-tl-bubble], [data-tl-duty], [data-tl-catmenu]) {
	background-image: var(--tl-liquid-surface-flat) !important;
	background-size: var(--tl-liquid-surface-flat-size);
	box-shadow:
		var(--tl-liquid-rim-shadow),
		var(--tl-liquid-glow-shadow),
		0 0 0 0.5px var(--tl-glass-line),
		0 6px 18px rgba(8, 26, 44, 0.12);
}
body[data-dsh-tianlight]:is([data-tl-glass-effective="soft"], [data-tl-glass-effective="frosted"], [data-tl-glass-effective="real"]) :is([role="tooltip"], [role="tabpanel"]) {
	background-image: var(--tl-liquid-surface);
	background-size: var(--tl-liquid-surface-size);
	box-shadow:
		var(--tl-liquid-rim-shadow),
		var(--tl-liquid-glow-shadow),
		0 0 0 0.5px var(--tl-glass-line),
		0 8px 22px rgba(8, 26, 44, 0.16);
}

/* Composer: the blur already lives on ::before (a backdrop-filter on the card itself
   would re-anchor its non-portaled tooltips, which are position:fixed). The depth
   only strengthens the sheen, the hairline, the rim and the saturation, so the pseudo
   layer ownership stays untouched. */
body[data-dsh-tianlight]:is([data-tl-glass-effective="soft"], [data-tl-glass-effective="frosted"], [data-tl-glass-effective="real"]) [data-tl-composer] {
	background-image: var(--tl-liquid-surface) !important;
	background-size: var(--tl-liquid-surface-size);
	border-color: rgba(255, 255, 255, calc(var(--tl-liquid-hi) + 0.18)) !important;
	box-shadow:
		var(--tl-liquid-rim-shadow),
		var(--tl-liquid-glow-shadow),
		0 12px 38px rgba(8, 28, 52, 0.26) !important;
}
body[data-dsh-tianlight][data-ds-dark-theme]:is([data-tl-glass-effective="soft"], [data-tl-glass-effective="frosted"], [data-tl-glass-effective="real"]) [data-tl-composer] {
	box-shadow:
		var(--tl-liquid-rim-shadow),
		var(--tl-liquid-glow-shadow),
		0 12px 38px rgba(0, 0, 0, 0.50) !important;
}

/* Model pill: the v1.5 rule above already contributes the depth blur, specular edge
   and border; paint the full v2 stack on top of it. */
body[data-dsh-tianlight]:is([data-tl-glass-effective="soft"], [data-tl-glass-effective="frosted"], [data-tl-glass-effective="real"]) [data-tl-model] {
	background-image: var(--tl-liquid-surface) !important;
	background-size: var(--tl-liquid-surface-size);
	box-shadow:
		var(--tl-liquid-rim-shadow),
		var(--tl-liquid-glow-shadow),
		0 6px 20px rgba(8, 26, 44, 0.16) !important;
}

/* Floating menus (bridge-stamped): full stack plus a deeper shadow than the bubble
   tier and the outer glow. */
body[data-dsh-tianlight]:is([data-tl-glass-effective="soft"], [data-tl-glass-effective="frosted"], [data-tl-glass-effective="real"]) [data-tl-menu] {
	background-image: var(--tl-liquid-surface) !important;
	background-size: var(--tl-liquid-surface-size);
	box-shadow:
		var(--tl-liquid-rim-shadow),
		var(--tl-liquid-glow-shadow),
		0 14px 38px rgba(8, 26, 44, 0.22);
}

/* The live blurs the depth adds or retunes, each exactly one small layer: the stamped
   floating menu and the composer's existing ::before layer. The popover follows the
   preset's own blur (it carries a near-opaque panel fill, so the value is safe); the
   composer keeps max() so a soft depth never makes the typing surface less frosted
   than off, where legibility matters most. Neither host gains a filter it did not
   already have, so no position:fixed descendant is re-anchored. */
@supports ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
	body[data-dsh-tianlight]:is([data-tl-glass-effective="soft"], [data-tl-glass-effective="frosted"], [data-tl-glass-effective="real"]) [data-tl-menu] {
		-webkit-backdrop-filter: blur(var(--tl-liquid-blur)) saturate(var(--tl-liquid-sat));
		backdrop-filter: blur(var(--tl-liquid-blur)) saturate(var(--tl-liquid-sat));
	}
	body[data-dsh-tianlight]:is([data-tl-glass-effective="soft"], [data-tl-glass-effective="frosted"], [data-tl-glass-effective="real"]) [data-tl-composer]::before {
		-webkit-backdrop-filter: blur(max(var(--tl-glass-blur), var(--tl-liquid-blur))) saturate(var(--tl-liquid-sat));
		backdrop-filter: blur(max(var(--tl-glass-blur), var(--tl-liquid-blur))) saturate(var(--tl-liquid-sat));
	}
}

/* Inputs and editors: a hairline and a specular top edge only. Never a filter here,
   and no elevation, so typing and IME composition keep their exact anchoring. */
body[data-dsh-tianlight]:is([data-tl-glass-effective="soft"], [data-tl-glass-effective="frosted"], [data-tl-glass-effective="real"]) textarea,
body[data-dsh-tianlight]:is([data-tl-glass-effective="soft"], [data-tl-glass-effective="frosted"], [data-tl-glass-effective="real"]) [contenteditable="true"],
body[data-dsh-tianlight]:is([data-tl-glass-effective="soft"], [data-tl-glass-effective="frosted"], [data-tl-glass-effective="real"]) [role="textbox"],
body[data-dsh-tianlight]:is([data-tl-glass-effective="soft"], [data-tl-glass-effective="frosted"], [data-tl-glass-effective="real"]) input:not([type="checkbox"]):not([type="radio"]):not([type="range"]) {
	border-color: rgba(255, 255, 255, calc(var(--tl-liquid-hi) + 0.14));
	box-shadow: inset 0 1px 0 rgba(255, 255, 255, var(--tl-liquid-hi));
}

/* Low power / 15fps: flatten every decoration the depth just added. Fills may stay
   (they cost no per-frame compositing) but shadows, v2 surface layers, rim/glow and
   animation go, and every live blur drops to 3px, matching the v1.5 low-power recipe.
   The v2 stack is cleared only on the surfaces this block paints one on, so a product
   background-image elsewhere is never thrown away. */
body[data-dsh-tianlight][data-tl-lowpower]:is([data-tl-glass-effective="soft"], [data-tl-glass-effective="frosted"], [data-tl-glass-effective="real"]) :is([data-tl-sidebar], [data-tl-sidebar-col], [data-tl-settings], [data-tl-wall], [data-tl-hub-panel], [data-tl-glass-preview], [data-tl-composer], [data-tl-model], [data-tl-rheo][data-tl-rheo-empty], [data-tl-bubble], [data-tl-menu], [data-tl-duty], [data-tl-catmenu], [role="dialog"], [role="menu"], [role="listbox"], [role="tooltip"], [role="tabpanel"]) {
	box-shadow: none !important;
	animation: none !important;
}
body[data-dsh-tianlight][data-tl-lowpower]:is([data-tl-glass-effective="soft"], [data-tl-glass-effective="frosted"], [data-tl-glass-effective="real"]) :is([data-tl-sidebar], [data-tl-sidebar-col], [data-tl-settings], [data-tl-wall], [data-tl-hub-panel], [data-tl-glass-preview], [data-tl-composer], [data-tl-model], [data-tl-menu], [role="dialog"], [role="menu"], [role="listbox"], [role="tooltip"], [role="tabpanel"]) {
	background-image: none !important;
}
body[data-dsh-tianlight][data-tl-lowpower]:is([data-tl-glass-effective="soft"], [data-tl-glass-effective="frosted"], [data-tl-glass-effective="real"]) [data-tl-menu] {
	-webkit-backdrop-filter: blur(3px) saturate(1.05) !important;
	backdrop-filter: blur(3px) saturate(1.05) !important;
}
body[data-dsh-tianlight][data-tl-lowpower]:is([data-tl-glass-effective="soft"], [data-tl-glass-effective="frosted"], [data-tl-glass-effective="real"]) [data-tl-composer]::before {
	-webkit-backdrop-filter: blur(3px) saturate(1.05) !important;
	backdrop-filter: blur(3px) saturate(1.05) !important;
}
/* The v1.5 depth rules for the two pills outrank the older low-power rule on
   specificity, so the flatten needs an explicit depth-scoped override here. */
body[data-dsh-tianlight][data-tl-lowpower]:is([data-tl-glass-effective="soft"], [data-tl-glass-effective="frosted"], [data-tl-glass-effective="real"]) :is([data-tl-model], [data-tl-rheo][data-tl-rheo-empty]) {
	-webkit-backdrop-filter: blur(3px) saturate(1.05) !important;
	backdrop-filter: blur(3px) saturate(1.05) !important;
}
/* v1.6.1 surfaces (new-chat button, weather chip) flatten with the rest; their blur
   lives on the element itself (small, no fixed descendants), never on a panel. */
body[data-dsh-tianlight][data-tl-lowpower]:is([data-tl-glass-effective="soft"], [data-tl-glass-effective="frosted"], [data-tl-glass-effective="real"]) :is([data-tl-new-chat], [data-tl-weather-chip]) {
	box-shadow: none !important;
	animation: none !important;
	background-image: none !important;
	-webkit-backdrop-filter: blur(3px) saturate(1.05) !important;
	backdrop-filter: blur(3px) saturate(1.05) !important;
}
@media (prefers-reduced-motion: reduce) {
	body[data-dsh-tianlight]:is([data-tl-glass-effective="soft"], [data-tl-glass-effective="frosted"], [data-tl-glass-effective="real"]) :is([data-tl-menu], [data-tl-composer], [data-tl-liquid-fallback], [data-tl-new-chat], [data-tl-weather-chip]) {
		animation: none !important;
		transition: none !important;
	}
}

/* Role-hub liquid-glass preview: a compact swatch that reflects the current depth
   even before/without a wallpaper, so the control always has visible feedback. */
body[data-dsh-tianlight] [data-tl-hub] [data-tl-glass-preview] {
	height: 34px;
	border-radius: 10px;
	border: 0.5px solid rgba(255, 255, 255, 0.42);
	background-image: var(--tl-liquid-surface), radial-gradient(90% 120% at 12% 0%, rgba(180, 220, 255, calc(0.10 + var(--tl-liquid-sheen) * 0.16)) 0%, rgba(120, 170, 230, 0.10) 55%, rgba(90, 140, 210, 0.06) 100%);
	background-size: var(--tl-liquid-surface-size), auto;
	-webkit-backdrop-filter: blur(var(--tl-liquid-blur)) saturate(var(--tl-liquid-sat));
	backdrop-filter: blur(var(--tl-liquid-blur)) saturate(var(--tl-liquid-sat));
	box-shadow:
		inset 0 1px 0 rgba(255, 255, 255, var(--tl-liquid-hi)),
		var(--tl-liquid-rim-shadow),
		var(--tl-liquid-glow-shadow);
}
body[data-dsh-tianlight] [data-tl-hub] [data-tl-glass-preview][data-depth="off"] {
	background-image: linear-gradient(120deg, rgba(255, 255, 255, 0.06), rgba(120, 170, 230, 0.06));
	background-size: auto;
	-webkit-backdrop-filter: none;
	backdrop-filter: none;
	box-shadow: none;
}
body[data-dsh-tianlight] [data-tl-hub] [data-tl-glass-preview-label] {
	display: block;
	margin-top: 4px;
	font: 400 11px/1.5 var(--ds-font-family, system-ui);
	color: var(--tl-ink-faint, var(--tl-ink-soft, var(--tl-ink)));
}
/* v1.5.0 hub: weather card, self-test rows, feedback form. */
body[data-dsh-tianlight] [data-tl-hub] .tl-hub-textarea {
	min-height: 64px;
	resize: vertical;
	padding: 8px 10px;
	border-radius: 10px;
	border: 0.5px solid var(--tl-line-strong, rgba(255, 255, 255, 0.3));
	background: var(--tl-glass-fill, rgba(255, 255, 255, 0.12));
	color: var(--tl-ink);
	font: 400 12px/1.5 var(--ds-font-family, system-ui);
}
body[data-dsh-tianlight] [data-tl-hub] .tl-hub-weather input[type="checkbox"] {
	appearance: auto;
	width: 14px;
	height: 14px;
	accent-color: var(--tl-accent);
}
body[data-dsh-tianlight] [data-tl-hub] .tl-hub-weather input[type="text"],
body[data-dsh-tianlight] [data-tl-hub] .tl-hub-weather input[type="number"] {
	padding: 6px 9px;
	border-radius: 9px;
	border: 0.5px solid var(--tl-line-strong, rgba(255, 255, 255, 0.3));
	background: var(--tl-glass-fill, rgba(255, 255, 255, 0.12));
	color: var(--tl-ink);
	font: 500 12px/1.3 var(--ds-font-family, system-ui);
}
body[data-dsh-tianlight] [data-tl-hub] .tl-hub-weather input[type="number"] {
	width: 84px;
}
body[data-dsh-tianlight] [data-tl-hub] .tl-hub-selftest-row {
	display: flex;
	align-items: baseline;
	gap: 8px;
	padding: 3px 0;
	font: 500 12px/1.45 var(--ds-font-family, system-ui);
}
body[data-dsh-tianlight] [data-tl-hub] .tl-hub-selftest-row[data-ok="false"] .tl-hub-selftest-state {
	color: var(--tl-bad, #c94f4f);
	font-weight: 700;
}
body[data-dsh-tianlight] [data-tl-hub] .tl-hub-selftest-row[data-ok="true"] .tl-hub-selftest-state {
	color: var(--tl-ok, #2f8f4e);
	font-weight: 700;
}
body[data-dsh-tianlight] [data-tl-hub] .tl-hub-selftest-name {
	min-width: 96px;
	color: var(--tl-ink-soft, var(--tl-ink));
}
body[data-dsh-tianlight] [data-tl-hub] .tl-hub-selftest-detail {
	color: var(--tl-ink-faint, var(--tl-ink-soft, var(--tl-ink)));
	font: 400 11px/1.5 var(--ds-font-family, system-ui);
}
body[data-dsh-tianlight] [data-tl-hub] .tl-hub-feedback[data-status],
body[data-dsh-tianlight] [data-tl-hub] [data-tl-hub-feedback-status] {
	color: var(--tl-ink-soft, var(--tl-ink));
	font: 400 11px/1.5 var(--ds-font-family, system-ui);
}

/* ---- v1.1.0 role hub: sidebar entry + full-screen "role control" overlay ---- */
body[data-dsh-tianlight] {
	--tl-ok: #2f8f4e;
	--tl-warn: #c78117;
	--tl-bad: #c94f4f;
}
body[data-dsh-tianlight][data-tl-hub-open] {
	overflow: hidden;
}
body[data-dsh-tianlight] [data-tl-hub] {
	position: fixed;
	inset: 0;
	z-index: 2601;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 24px;
	color: var(--tl-ink);
	font: 500 13px/1.5 var(--ds-font-family, system-ui);
}
body[data-dsh-tianlight] [data-tl-hub-mask] {
	position: absolute;
	inset: 0;
	background: rgba(6, 16, 28, 0.42);
	-webkit-backdrop-filter: blur(3px);
	backdrop-filter: blur(3px);
}
body[data-dsh-tianlight] [data-tl-hub-panel] {
	position: relative;
	display: flex;
	flex-direction: column;
	width: min(760px, 94vw);
	max-height: 88vh;
	border-radius: 20px;
	background: var(--tl-overlay, rgba(18, 30, 48, 0.94));
	border: 0.5px solid var(--tl-glass-line, rgba(255, 255, 255, 0.3));
	box-shadow: 0 28px 80px rgba(4, 14, 26, 0.45);
	overflow: hidden;
}
body[data-dsh-tianlight] [data-tl-hub-head] {
	display: flex;
	align-items: center;
	gap: 10px;
	padding: 14px 18px;
	border-bottom: 0.5px solid var(--tl-glass-line, rgba(255, 255, 255, 0.22));
}
body[data-dsh-tianlight] [data-tl-hub-head] h2 {
	flex: 1;
	margin: 0;
	font: 600 15px/1.3 var(--ds-font-family, system-ui);
}
body[data-dsh-tianlight] [data-tl-hub-close] {
	appearance: none;
	width: 30px;
	height: 30px;
	border-radius: 999px;
	border: 0.5px solid var(--tl-line-strong, rgba(255, 255, 255, 0.3));
	background: var(--tl-accent-soft, rgba(255, 255, 255, 0.12));
	color: var(--tl-ink);
	font: 600 15px/1 var(--ds-font-family, system-ui);
	cursor: pointer;
}
body[data-dsh-tianlight] [data-tl-hub-close]:hover,
body[data-dsh-tianlight] [data-tl-hub-close]:focus-visible {
	background: var(--tl-accent);
	color: #fff;
	outline: none;
}
body[data-dsh-tianlight] [data-tl-hub-body] {
	display: flex;
	flex-direction: column;
	gap: 12px;
	padding: 16px 18px 20px;
	overflow: auto;
}
body[data-dsh-tianlight] [data-tl-hub] .tl-hub-card {
	display: flex;
	flex-direction: column;
	gap: 9px;
	padding: 13px 14px;
	border-radius: 14px;
	background: var(--tl-glass-fill, rgba(255, 255, 255, 0.10));
	border: 0.5px solid var(--tl-glass-line, rgba(255, 255, 255, 0.2));
}
body[data-dsh-tianlight] [data-tl-hub] .tl-hub-card > h3 {
	margin: 0;
	font: 600 13px/1.35 var(--ds-font-family, system-ui);
}
body[data-dsh-tianlight] [data-tl-hub] .tl-hub-row {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 8px;
}
body[data-dsh-tianlight] [data-tl-hub] button,
body[data-dsh-tianlight] [data-tl-hub] select {
	appearance: none;
	cursor: pointer;
	font: 600 12px/1.2 var(--ds-font-family, system-ui);
	color: var(--tl-ink);
	background: var(--tl-accent-soft, rgba(255, 255, 255, 0.12));
	border: 0.5px solid var(--tl-line-strong, rgba(255, 255, 255, 0.3));
	border-radius: 999px;
	padding: 7px 12px;
}
body[data-dsh-tianlight] [data-tl-hub] select {
	border-radius: 10px;
	max-width: 100%;
}
body[data-dsh-tianlight] [data-tl-hub] button:hover,
body[data-dsh-tianlight] [data-tl-hub] button:focus-visible {
	background: var(--tl-accent);
	color: #fff;
	outline: none;
}
body[data-dsh-tianlight] [data-tl-hub] button[data-active] {
	background: var(--tl-accent);
	color: #fff;
}
/* v1.3.0 merged life-rhythm settings (formerly the removed settings page). */
body[data-dsh-tianlight] [data-tl-hub] .tl-hub-life input[type="time"],
body[data-dsh-tianlight] [data-tl-hub] .tl-hub-life input[type="number"] {
	appearance: auto;
	padding: 6px 9px;
	border-radius: 9px;
	border: 0.5px solid var(--tl-line-strong, rgba(255, 255, 255, 0.3));
	background: var(--tl-glass-fill, rgba(255, 255, 255, 0.12));
	color: var(--tl-ink);
	font: 500 12px/1.3 var(--ds-font-family, system-ui);
}
body[data-dsh-tianlight] [data-tl-hub] .tl-hub-life input[type="number"] {
	width: 64px;
}
body[data-dsh-tianlight] [data-tl-hub] .tl-hub-life input[type="checkbox"] {
	appearance: auto;
	width: 14px;
	height: 14px;
	accent-color: var(--tl-accent);
}
body[data-dsh-tianlight] [data-tl-hub] .tl-hub-status-key {
	color: var(--tl-ink-soft, var(--tl-ink));
	font: 500 12px/1.4 var(--ds-font-family, system-ui);
}
body[data-dsh-tianlight] [data-tl-hub] [data-tl-hub-life-note] {
	margin: 0;
	font: 400 11px/1.5 var(--ds-font-family, system-ui);
	color: var(--tl-ink-faint, var(--tl-ink-soft, var(--tl-ink)));
}
body[data-dsh-tianlight] [data-tl-hub] button:disabled {
	opacity: 0.45;
	cursor: default;
}
body[data-dsh-tianlight] [data-tl-hub-status] {
	font: 500 12px/1.55 var(--ds-font-family, system-ui);
	white-space: pre-wrap;
	color: var(--tl-ink-soft, var(--tl-ink));
}
body[data-dsh-tianlight] [data-tl-hub] .tl-hub-log {
	display: flex;
	flex-direction: column;
	gap: 6px;
	max-height: 200px;
	overflow: auto;
	padding: 8px 10px;
	border-radius: 10px;
	background: rgba(8, 18, 30, 0.22);
}
body[data-dsh-tianlight] [data-tl-hub] .tl-hub-log > p {
	margin: 0;
	font: 400 12px/1.45 var(--ds-font-family, system-ui);
	white-space: pre-wrap;
}
body[data-dsh-tianlight] [data-tl-hub] .tl-hub-log > p[data-role="pet"] {
	color: var(--tl-ink);
}
body[data-dsh-tianlight] [data-tl-hub] .tl-hub-log > p[data-role="user"] {
	color: var(--tl-ink-soft, var(--tl-ink));
}
body[data-dsh-tianlight] [data-tl-hub] .tl-hub-log > p[data-role="denied"] {
	color: var(--tl-warn, #e6a23c);
}
body[data-dsh-tianlight] [data-tl-hub-chat-input] {
	flex: 1;
	min-width: 160px;
	padding: 8px 11px;
	border-radius: 10px;
	border: 0.5px solid var(--tl-line-strong, rgba(255, 255, 255, 0.3));
	background: var(--tl-glass-fill, rgba(255, 255, 255, 0.12));
	color: var(--tl-ink);
	font: 500 12px/1.4 var(--ds-font-family, system-ui);
}
body[data-dsh-tianlight] [data-tl-hub-chat-input]:focus {
	outline: 2px solid var(--tl-accent);
	outline-offset: 1px;
}
body[data-dsh-tianlight] [data-tl-hub] .tl-hub-perm {
	display: flex;
	flex-direction: column;
	gap: 4px;
}
body[data-dsh-tianlight] [data-tl-hub] [data-tl-hub-perm-row] {
	display: flex;
	align-items: center;
	gap: 8px;
	font: 500 12px/1.4 var(--ds-font-family, system-ui);
}
body[data-dsh-tianlight] [data-tl-hub] [data-tl-hub-perm-row][data-risk="safe"] span:first-child {
	color: var(--tl-ok, #67c23a);
}
body[data-dsh-tianlight] [data-tl-hub] [data-tl-hub-perm-row][data-risk="medium"] span:first-child {
	color: var(--tl-warn, #e6a23c);
}
body[data-dsh-tianlight] [data-tl-hub] [data-tl-hub-perm-row][data-risk="high"] span:first-child {
	color: var(--tl-bad, #c94f4f);
	font-weight: 700;
}
body[data-dsh-tianlight] [data-tl-hub] [data-tl-hub-perm-row][data-risk="forbidden"] span:first-child {
	color: var(--tl-bad, #f56c6c);
}
body[data-dsh-tianlight] [data-tl-hub] [data-tl-hub-perm-note] {
	margin: 0;
	font: 400 11px/1.5 var(--ds-font-family, system-ui);
	color: var(--tl-warn, #c78117);
}
body[data-dsh-tianlight] [data-tl-hub] [data-tl-hub-audit] {
	display: flex;
	flex-direction: column;
	gap: 3px;
	font: 400 11px/1.5 var(--ds-font-family, system-ui);
	color: var(--tl-ink-faint, var(--tl-ink-soft, var(--tl-ink)));
}
body[data-dsh-tianlight] [data-tl-hub] .tl-hub-hint {
	margin: 0;
	font: 400 11px/1.5 var(--ds-font-family, system-ui);
	color: var(--tl-ink-faint, var(--tl-ink-soft, var(--tl-ink)));
}
body[data-dsh-tianlight] [data-tl-hub] .tl-hub-badge {
	display: inline-block;
	padding: 2px 7px;
	border-radius: 999px;
	font: 600 10px/1.4 var(--ds-font-family, system-ui);
	background: var(--tl-accent-soft, rgba(255, 255, 255, 0.14));
}
/* v1.2.0 controlled DSH Agent card inside the role hub. */
body[data-dsh-tianlight] [data-tl-hub] [data-tl-hub-agent] {
	border-color: var(--tl-line-strong, rgba(255, 255, 255, 0.28));
}
body[data-dsh-tianlight] [data-tl-hub] [data-tl-hub-agent-status] {
	font: 500 12px/1.5 var(--ds-font-family, system-ui);
	white-space: pre-wrap;
	color: var(--tl-ink-soft, var(--tl-ink));
}
body[data-dsh-tianlight] [data-tl-hub] [data-tl-hub-agent-hint] {
	color: var(--tl-warn, #c78117);
}
body[data-dsh-tianlight] [data-tl-hub] .tl-hub-log > p[data-source="agent"] {
	color: var(--tl-ok, #2f8f4e);
}

/* ---- v1.6.1 new surfaces: product "new chat" button + main-interface weather chip ----
   Both must exist at EVERY depth. Off keeps the neutral glass look; depth != off adds
   the full liquid-glass v2 surface. The new-chat dark-block fix is the one deliberate
   off-mode visual change: the product painted that button with
   --dsw-alias-button-elevated-fill (an opaque block on the 100% wallpaper interface).
   Layout is never taken over: the new-chat geometry belongs to the product (its
   collapsed variant is fixed by the product in the desktop titlebar), the chip is ours. */

/* "New chat" button. The selector bridge stamps it from the stable _newSession module
   class on <button> (expanded sidebar + collapsed titlebar rail variants), so no build
   hash is named here. The two product tokens are glass in the token blocks above. */
body[data-dsh-tianlight] [data-tl-new-chat] {
	background-color: color-mix(in srgb, var(--tl-glass-fill) 78%, transparent) !important;
	border: 0.5px solid var(--tl-glass-line) !important;
	color: var(--tl-ink) !important;
	box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.16);
	transition:
		background-color 160ms cubic-bezier(0.34, 1.56, 0.64, 1),
		border-color 160ms ease,
		box-shadow 180ms ease,
		transform 180ms cubic-bezier(0.34, 1.56, 0.64, 1);
}
body[data-dsh-tianlight]:is([data-tl-glass-effective="soft"], [data-tl-glass-effective="frosted"], [data-tl-glass-effective="real"]) [data-tl-new-chat] {
	background-color: color-mix(in srgb, var(--tl-glass-fill) 72%, transparent) !important;
	background-image: var(--tl-liquid-surface) !important;
	background-size: var(--tl-liquid-surface-size);
	border-color: rgba(255, 255, 255, calc(var(--tl-liquid-rim) + 0.16)) !important;
	box-shadow:
		var(--tl-liquid-rim-shadow),
		var(--tl-liquid-glow-shadow),
		0 4px 16px rgba(8, 26, 44, 0.16) !important;
}
@supports ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
	body[data-dsh-tianlight]:is([data-tl-glass-effective="soft"], [data-tl-glass-effective="frosted"], [data-tl-glass-effective="real"]) [data-tl-new-chat] {
		-webkit-backdrop-filter: blur(var(--tl-liquid-blur)) saturate(var(--tl-liquid-sat));
		backdrop-filter: blur(var(--tl-liquid-blur)) saturate(var(--tl-liquid-sat));
	}
}
@media (hover: hover) {
	body[data-dsh-tianlight] [data-tl-new-chat]:hover {
		background-color: var(--tl-accent-soft) !important;
		border-color: var(--tl-accent) !important;
	}
}
body[data-dsh-tianlight] [data-tl-new-chat]:active {
	transform: scale(0.985);
}
body[data-dsh-tianlight] [data-tl-new-chat]:focus-visible {
	outline: 2px solid var(--tl-accent) !important;
	outline-offset: 2px;
}

/* Main-interface weather chip. DOM contract (created by the weather module, exactly one
   per page): div[data-tl-weather-chip][role=button][tabindex=0] with
   data-tl-weather-state=off|no-location|waiting|error|ready and up to three children
   ([data-tl-weather-icon], [data-tl-weather-temp], [data-tl-weather-desc]; plain spans
   are accepted as a fallback). It floats below the Windows title strip and the DSH top
   frame clearance, above the wallpaper but below product modals / the role hub
   (z-index 96 < the 1000 mask family), and never takes layout space. */
body[data-dsh-tianlight] [data-tl-weather-chip] {
	position: fixed;
	top: calc(var(--dsh-windows-titlebar-height, 0px) + var(--dsh-frame-top-clearance, 48px) + 8px);
	right: 14px;
	z-index: 96;
	display: inline-flex;
	align-items: center;
	gap: 6px;
	box-sizing: border-box;
	max-width: min(240px, 46vw);
	height: 30px;
	padding: 0 11px;
	border-radius: 999px;
	border: 0.5px solid var(--tl-glass-line);
	background-color: color-mix(in srgb, var(--tl-glass-fill) 90%, transparent);
	color: var(--tl-ink);
	font: 500 12px/1 var(--ds-font-family, system-ui);
	letter-spacing: 0.01em;
	white-space: nowrap;
	cursor: pointer;
	user-select: none;
	-webkit-user-select: none;
	-webkit-app-region: no-drag;
	box-shadow:
		inset 0 1px 0 rgba(255, 255, 255, 0.16),
		0 4px 16px rgba(8, 26, 44, 0.16);
	transition:
		transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1),
		background-color 180ms ease,
		border-color 180ms ease,
		box-shadow 200ms ease;
}
body[data-dsh-tianlight] [data-tl-weather-chip] [data-tl-weather-icon],
body[data-dsh-tianlight] [data-tl-weather-chip] > span:first-child {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	flex: none;
	font-size: 14px;
	line-height: 1;
}
body[data-dsh-tianlight] [data-tl-weather-chip] svg {
	display: block;
	flex: none;
	width: 15px;
	height: 15px;
}
body[data-dsh-tianlight] [data-tl-weather-chip] [data-tl-weather-temp] {
	font-weight: 700;
	font-variant-numeric: tabular-nums;
}
body[data-dsh-tianlight] [data-tl-weather-chip] [data-tl-weather-desc] {
	min-width: 0;
	max-width: 118px;
	overflow: hidden;
	text-overflow: ellipsis;
	color: var(--tl-ink-soft, var(--tl-ink));
}
body[data-dsh-tianlight] [data-tl-weather-chip][data-tl-weather-state="off"],
body[data-dsh-tianlight] [data-tl-weather-chip][data-tl-weather-state="no-location"] {
	color: var(--tl-ink-soft, var(--tl-ink));
}
body[data-dsh-tianlight] [data-tl-weather-chip][data-tl-weather-state="off"] [data-tl-weather-desc],
body[data-dsh-tianlight] [data-tl-weather-chip][data-tl-weather-state="no-location"] [data-tl-weather-desc] {
	color: var(--tl-ink-faint, var(--tl-ink));
}
body[data-dsh-tianlight] [data-tl-weather-chip][data-tl-weather-state="waiting"] {
	opacity: 0.78;
}
body[data-dsh-tianlight] [data-tl-weather-chip][data-tl-weather-state="ready"] {
	color: var(--tl-ink);
}
body[data-dsh-tianlight] [data-tl-weather-chip][data-tl-weather-state="error"] {
	border-color: color-mix(in srgb, var(--tl-bad, #c94f4f) 55%, transparent);
	color: var(--tl-bad, #c94f4f);
}
body[data-dsh-tianlight]:is([data-tl-glass-effective="soft"], [data-tl-glass-effective="frosted"], [data-tl-glass-effective="real"]) [data-tl-weather-chip] {
	background-color: color-mix(in srgb, var(--tl-glass-fill) 78%, transparent);
	background-image: var(--tl-liquid-surface);
	background-size: var(--tl-liquid-surface-size);
	border-color: rgba(255, 255, 255, calc(var(--tl-liquid-rim) + 0.14));
	box-shadow:
		var(--tl-liquid-rim-shadow),
		var(--tl-liquid-glow-shadow),
		0 6px 20px rgba(8, 26, 44, 0.18);
}
@supports ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
	body[data-dsh-tianlight]:is([data-tl-glass-effective="soft"], [data-tl-glass-effective="frosted"], [data-tl-glass-effective="real"]) [data-tl-weather-chip] {
		-webkit-backdrop-filter: blur(var(--tl-liquid-blur)) saturate(var(--tl-liquid-sat));
		backdrop-filter: blur(var(--tl-liquid-blur)) saturate(var(--tl-liquid-sat));
	}
}
@media (hover: hover) {
	body[data-dsh-tianlight] [data-tl-weather-chip]:hover {
		transform: translateY(-1px) scale(1.02);
		border-color: var(--tl-accent);
		background-color: color-mix(in srgb, var(--tl-glass-fill) 70%, var(--tl-accent-soft));
		box-shadow:
			inset 0 1px 0 rgba(255, 255, 255, calc(0.16 + var(--tl-liquid-rim))),
			0 8px 24px rgba(8, 26, 44, 0.22);
	}
}
body[data-dsh-tianlight] [data-tl-weather-chip]:active {
	transform: scale(0.976);
}
body[data-dsh-tianlight] [data-tl-weather-chip]:focus-visible {
	outline: 2px solid var(--tl-accent) !important;
	outline-offset: 2px;
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
			// The base sheet plus every feature fragment's registered block (v0.5.0).
			// One <style> keeps teardown and the audit's scope checks unambiguous.
			tag.textContent = CSS + "\n" + tl5CssText();
			document.head.appendChild(tag);
			return () => {
				tag.remove();
			};
		}
		//#endregion

