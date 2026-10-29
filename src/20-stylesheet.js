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
   token: message bubbles, popovers/menus. The selector bridge stamps
   [data-tl-bubble] / [data-tl-menu] from the stable class suffixes
   (_bubble, _menu, data-trigger-menu), so no build hash appears here. */
body[data-dsh-tianlight] :is([data-tl-bubble], [data-tl-menu]) {
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

