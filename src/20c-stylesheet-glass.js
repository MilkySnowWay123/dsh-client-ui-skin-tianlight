		//#region stylesheet
		const CSS_GLASS = String.raw`/* ---- companion: a mint chibi cat that lives on top of the workbench ---- */
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

/* ---- legacy liquid-glass tokens (still consumed by the hub preview/pills) ----
   v2.2.9: the depth is no longer painted on the scene layer. The token stack below
   remains only for the small self-owned preview swatch; bounded panels use the new
   host-tint / ::before-blur / ::after-edge recipe at the end of this sheet. */
body[data-dsh-tianlight] {
	--tl-liquid-blur: 0px;
	--tl-liquid-sat: 1;
	--tl-liquid-hi: 0;
	--tl-liquid-lo: 0;
	--tl-liquid-noise: 0;
	--tl-liquid-sheen: 0;
	/* v2.2.0 live mode: the only place the stylesheet re-samples the wallpaper in
	   real time. These are the plain defaults; each depth and the dark theme tune
	   them below, so the live look still follows the selected depth. */
	--tl-liquid-live-blur: 2px;
	--tl-liquid-live-sat: 1.9;
	--tl-liquid-live-bright: 0.92;
	--tl-liquid-live-contrast: 1.1;
	/* v1.6.1 liquid glass v2, re-tuned in v2.2.0 against the white cast. The
	   surface/size pairs below are the complete multi-layer recipe every glass
	   surface paints: a baked feTurbulence grain tile (size --tl-liquid-grain), a
	   cool bottom-right tint, the diagonal sheen, the top-left radial specular, and
	   a faint bottom-edge thickness gradient. The flat pair is the same recipe
	   without the tiled grain, for surfaces that appear in large numbers (transcript
	   bubbles). Speculars are deliberately cool and low-alpha: white was the main
	   reason every panel looked like a grey-white veil over the wallpaper. */
	--tl-liquid-grain: 140px;
	--tl-liquid-rim: 0;
	--tl-liquid-grain-image: none;
	--tl-liquid-surface:
		var(--tl-liquid-grain-image),
		radial-gradient(120% 100% at 100% 100%, rgba(120, 170, 235, calc(0.05 + var(--tl-liquid-noise) * 1.2)) 0%, rgba(96, 146, 214, calc(0.03 + var(--tl-liquid-noise) * 0.6)) 42%, rgba(80, 130, 200, 0) 72%),
		linear-gradient(115deg, rgba(216, 233, 250, var(--tl-liquid-hi)) 0%, rgba(216, 233, 250, 0) 32%, rgba(216, 233, 250, 0) 62%, rgba(216, 233, 250, var(--tl-liquid-lo)) 100%),
		radial-gradient(120% 80% at 14% 4%, rgba(220, 238, 252, var(--tl-liquid-hi)) 0%, rgba(220, 238, 252, 0) 56%),
		linear-gradient(180deg, rgba(9, 24, 42, 0) 0%, rgba(9, 24, 42, 0) 76%, rgba(9, 24, 42, calc(0.05 + var(--tl-liquid-noise) * 0.55)) 100%);
	--tl-liquid-surface-size: var(--tl-liquid-grain) var(--tl-liquid-grain), auto, auto, auto, auto;
	--tl-liquid-surface-flat:
		radial-gradient(120% 100% at 100% 100%, rgba(120, 170, 235, calc(0.05 + var(--tl-liquid-noise) * 1.2)) 0%, rgba(96, 146, 214, calc(0.03 + var(--tl-liquid-noise) * 0.6)) 42%, rgba(80, 130, 200, 0) 72%),
		linear-gradient(115deg, rgba(216, 233, 250, var(--tl-liquid-hi)) 0%, rgba(216, 233, 250, 0) 32%, rgba(216, 233, 250, 0) 62%, rgba(216, 233, 250, var(--tl-liquid-lo)) 100%),
		radial-gradient(120% 80% at 14% 4%, rgba(220, 238, 252, var(--tl-liquid-hi)) 0%, rgba(220, 238, 252, 0) 56%),
		linear-gradient(180deg, rgba(9, 24, 42, 0) 0%, rgba(9, 24, 42, 0) 76%, rgba(9, 24, 42, calc(0.05 + var(--tl-liquid-noise) * 0.55)) 100%);
	--tl-liquid-surface-flat-size: auto, auto, auto, auto;
	--tl-liquid-fallback-boost: radial-gradient(120% 90% at 18% 6%, rgba(170, 215, 255, calc(0.03 + var(--tl-liquid-sheen) * 0.06)) 0%, rgba(120, 170, 230, 0) 62%);
	/* v2.2.7: the shared 1px light/dark rim is gone, and so is the sidebar's 1px white
	   right edge — those were the "every surface has an obvious line" report (the
	   sidebar edge was worst). Separation is the surface stack, the broad inner lens
	   shadow and the outer soft glow; only a 0.12-alpha hairline ring remains. */
	--tl-liquid-rim-shadow: inset 0 0 0 0 rgba(0, 0, 0, 0);
	/* v2.2.9: the 22px/60px inner lens shadow was the main "the pane base is too dark"
	   contributor. Bounded surfaces now use one inset top/bottom hairline instead. */
	--tl-liquid-glow-shadow: 0 0 calc(6px + 14px * var(--tl-liquid-sheen)) rgba(150, 200, 250, calc(var(--tl-liquid-sheen) * 0.10));
}
body[data-dsh-tianlight][data-tl-glass-effective="soft"] {
	--tl-liquid-blur: 11px;
	--tl-liquid-sat: 1.3;
	--tl-liquid-hi: 0.08;
	--tl-liquid-lo: 0.02;
	--tl-liquid-noise: 0.03;
	--tl-liquid-sheen: 0.18;
	--tl-liquid-grain: 180px;
	--tl-liquid-rim: 0.30;
	--tl-liquid-live-blur: 2px;
	--tl-liquid-live-sat: 1.8;
	--tl-liquid-live-bright: 0.93;
	--tl-liquid-live-contrast: 1.1;
	--tl-liquid-grain-image: url("data:image/svg+xml,%3Csvg%20xmlns%3D'http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg'%20width%3D'140'%20height%3D'140'%3E%3Cfilter%20id%3D'n'%3E%3CfeTurbulence%20type%3D'fractalNoise'%20baseFrequency%3D'0.9'%20numOctaves%3D'2'%20stitchTiles%3D'stitch'%2F%3E%3CfeColorMatrix%20type%3D'saturate'%20values%3D'0'%2F%3E%3C%2Ffilter%3E%3Crect%20width%3D'140'%20height%3D'140'%20filter%3D'url(%23n)'%20opacity%3D'0.035'%2F%3E%3C%2Fsvg%3E");
}
body[data-dsh-tianlight][data-tl-glass-effective="real"] {
	--tl-liquid-blur: 19px;
	--tl-liquid-sat: 1.5;
	--tl-liquid-hi: 0.12;
	--tl-liquid-lo: 0.03;
	--tl-liquid-noise: 0.045;
	--tl-liquid-sheen: 0.35;
	--tl-liquid-grain: 140px;
	--tl-liquid-rim: 0.36;
	--tl-liquid-live-blur: 3px;
	--tl-liquid-live-sat: 1.95;
	--tl-liquid-live-bright: 0.91;
	--tl-liquid-live-contrast: 1.1;
	--tl-liquid-grain-image: url("data:image/svg+xml,%3Csvg%20xmlns%3D'http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg'%20width%3D'140'%20height%3D'140'%3E%3Cfilter%20id%3D'n'%3E%3CfeTurbulence%20type%3D'fractalNoise'%20baseFrequency%3D'0.9'%20numOctaves%3D'2'%20stitchTiles%3D'stitch'%2F%3E%3CfeColorMatrix%20type%3D'saturate'%20values%3D'0'%2F%3E%3C%2Ffilter%3E%3Crect%20width%3D'140'%20height%3D'140'%20filter%3D'url(%23n)'%20opacity%3D'0.05'%2F%3E%3C%2Fsvg%3E");
}
body[data-dsh-tianlight][data-tl-glass-effective="frosted"] {
	--tl-liquid-blur: 26px;
	--tl-liquid-sat: 0.95;
	--tl-liquid-hi: 0.16;
	--tl-liquid-lo: 0.02;
	--tl-liquid-noise: 0.10;
	--tl-liquid-sheen: 0.08;
	--tl-liquid-grain: 110px;
	--tl-liquid-rim: 0.40;
	--tl-liquid-live-blur: 6px;
	--tl-liquid-live-sat: 1.1;
	--tl-liquid-live-bright: 0.98;
	--tl-liquid-live-contrast: 1.04;
	--tl-liquid-grain-image: url("data:image/svg+xml,%3Csvg%20xmlns%3D'http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg'%20width%3D'140'%20height%3D'140'%3E%3Cfilter%20id%3D'n'%3E%3CfeTurbulence%20type%3D'fractalNoise'%20baseFrequency%3D'0.9'%20numOctaves%3D'2'%20stitchTiles%3D'stitch'%2F%3E%3CfeColorMatrix%20type%3D'saturate'%20values%3D'0'%2F%3E%3C%2Ffilter%3E%3Crect%20width%3D'140'%20height%3D'140'%20filter%3D'url(%23n)'%20opacity%3D'0.12'%2F%3E%3C%2Fsvg%3E");
}
/* v2.2.9: the scene layer is a wallpaper, not glass. The old full-viewport
   grain + tint + inner vignette ::after here put a fog layer over every wallpaper
   and fought the time-of-day dim rule in 35-context.js for the same pseudo element.
   Glass is painted only on bounded controls now. The period dim keeps ::after. */

/* ---- v2.2.9 real glass: tint on the host, blur on ::before, light on ::after ----
   Contract (regression-tested by tools/check-css.mjs):
   - the HOST never has filter / backdrop-filter / transform / will-change; those
     properties would create a containing block for the product's position:fixed
     sidebar toggle and every non-portaled tooltip;
   - the blur lives on ::before, which is not an ancestor of those fixed children;
   - the 1px edge is a GRADIENT on ::after, masked to the border, so it follows the
     corner radius and never reads as a uniform white ring;
   - large panels get a low-alpha tint (0.06-0.10 light / 0.16-0.24 dark), not an
     opaque fill. Depth changes blur/saturation only. Live mode is the only path
     that re-samples the wallpaper; low power removes every backdrop-filter. */
body[data-dsh-tianlight] {
	/* Compatibility tokens still consumed by the hub preview and the small pills. */
	--tl-liquid-grain: 140px;
	--tl-liquid-grain-image: none;
	--tl-liquid-live-bright: 0.92;
}
body[data-dsh-tianlight]:is([data-tl-glass-effective="soft"], [data-tl-glass-effective="frosted"], [data-tl-glass-effective="real"]) {
	--tl-glass-sheen: linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0) 30%);
}
body[data-dsh-tianlight][data-tl-glass-effective="soft"] {
	--tl-glass-blur-live: 10px;
	--tl-glass-sat-live: 1.5;
	--tl-glass-menu-blur-live: 16px;
}
body[data-dsh-tianlight][data-tl-glass-effective="frosted"] {
	--tl-glass-blur-live: 26px;
	--tl-glass-sat-live: 1.2;
	--tl-glass-menu-blur-live: 28px;
	--tl-glass-tint: rgba(255, 255, 255, calc(0.14 * var(--tl-glass-m, 1)));
	--tl-liquid-grain-image: url("data:image/svg+xml,%3Csvg%20xmlns%3D'http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg'%20width%3D'140'%20height%3D'140'%3E%3Cfilter%20id%3D'n'%3E%3CfeTurbulence%20type%3D'fractalNoise'%20baseFrequency%3D'0.9'%20numOctaves%3D'2'%20stitchTiles%3D'stitch'%2F%3E%3CfeColorMatrix%20type%3D'saturate'%20values%3D'0'%2F%3E%3C%2Ffilter%3E%3Crect%20width%3D'140'%20height%3D'140'%20filter%3D'url(%23n)'%20opacity%3D'0.05'%2F%3E%3C%2Fsvg%3E");
}
body[data-dsh-tianlight][data-ds-dark-theme] {
	--tl-glass-sheen: linear-gradient(135deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0) 30%);
	--tl-liquid-live-bright: 0.92;
}
body[data-dsh-tianlight][data-ds-dark-theme][data-tl-glass-effective="frosted"] {
	--tl-glass-tint: rgba(12, 18, 28, calc(0.26 * var(--tl-glass-m, 1)));
}
body[data-dsh-tianlight][data-ds-dark-theme][data-tl-glass-effective="real"] {
	--tl-liquid-live-bright: 0.92;
}

/* One host recipe for every bounded glass surface. The sidebar column is included,
   but only its runtime-stamped column node ([data-tl-sidebar-col]); the product frame
   was the v2.2.8 full-window smoked overlay. */
body[data-dsh-tianlight]:is([data-tl-glass-effective="soft"], [data-tl-glass-effective="frosted"], [data-tl-glass-effective="real"]) :is([data-tl-sidebar-col], [data-tl-wall], [data-tl-settings], [data-tl-hub] [data-tl-hub-panel], [data-tl-menu], [data-tl-composer]) {
	isolation: isolate;
	background-color: var(--tl-glass-tint) !important;
	background-image: var(--tl-glass-sheen) !important;
	border-color: transparent !important;
	/* v2.3.0: one shadow token per theme (the dark value is the shipped v2.2.x recipe
	   verbatim, so the dark pixels do not move). */
	box-shadow: var(--tl-glass-shadow) !important;
}
body[data-dsh-tianlight]:is([data-tl-glass-effective="soft"], [data-tl-glass-effective="frosted"], [data-tl-glass-effective="real"]) [data-tl-sidebar-col] {
	/* Anchor for ::before/::after. position:relative alone does NOT change the
	   containing block of position:fixed descendants; a filter would. */
	position: relative;
}
body[data-dsh-tianlight]:is([data-tl-glass-effective="soft"], [data-tl-glass-effective="frosted"], [data-tl-glass-effective="real"]) [data-tl-wall] {
	background-color: var(--tl-wall-tint, var(--tl-glass-tint)) !important;
}
body[data-dsh-tianlight]:is([data-tl-glass-effective="soft"], [data-tl-glass-effective="frosted"], [data-tl-glass-effective="real"]) [data-tl-menu] {
	background-color: var(--tl-glass-tint-menu) !important;
}
body[data-dsh-tianlight]:is([data-tl-glass-effective="soft"], [data-tl-glass-effective="frosted"], [data-tl-glass-effective="real"]) [data-tl-hub] [data-tl-hub-panel] {
	background-color: var(--tl-glass-tint-menu) !important;
}
body[data-dsh-tianlight]:is([data-tl-glass-effective="soft"], [data-tl-glass-effective="frosted"], [data-tl-glass-effective="real"]) :is([role="dialog"], [role="menu"], [role="listbox"], [role="tooltip"], [role="tabpanel"]) {
	/* ARIA fallback surfaces that the bridge has not stamped. Tint only: these can be
	   product-owned layers with their own fixed children, so they never gain a blur. */
	background-color: var(--tl-glass-tint-menu) !important;
	border-color: transparent !important;
}
body[data-dsh-tianlight][data-tl-glass-effective="frosted"] :is([data-tl-sidebar-col], [data-tl-wall], [data-tl-settings], [data-tl-hub] [data-tl-hub-panel], [data-tl-composer]) {
	background-image: var(--tl-liquid-grain-image), var(--tl-glass-sheen) !important;
	background-size: 140px 140px, auto;
	background-repeat: repeat, no-repeat;
}
body[data-dsh-tianlight]:is([data-tl-glass-effective="soft"], [data-tl-glass-effective="frosted"], [data-tl-glass-effective="real"]) :is([data-tl-sidebar-col], [data-tl-wall], [data-tl-settings], [data-tl-hub] [data-tl-hub-panel], [data-tl-menu], [data-tl-composer])::before {
	content: "";
	position: absolute;
	inset: 0;
	border-radius: inherit;
	pointer-events: none;
	z-index: -1;
	background: transparent;
}
body[data-dsh-tianlight]:is([data-tl-glass-effective="soft"], [data-tl-glass-effective="frosted"], [data-tl-glass-effective="real"]) :is([data-tl-sidebar-col], [data-tl-wall], [data-tl-settings], [data-tl-hub] [data-tl-hub-panel], [data-tl-menu], [data-tl-composer])::after {
	content: "";
	position: absolute;
	inset: 0;
	border-radius: inherit;
	padding: 1px;
	pointer-events: none;
	z-index: 1;
	background: linear-gradient(135deg, var(--tl-glass-edge-hi) 0%, var(--tl-glass-edge-mid) 28%, rgba(255, 255, 255, 0) 50%, rgba(255, 255, 255, 0.06) 72%, var(--tl-glass-edge-lo) 100%);
	-webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
	-webkit-mask-composite: xor;
	mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
	mask-composite: exclude;
}
/* The sidebar has a fixed child toggle; the pseudo is NOT its ancestor, so the
   toggle stays anchored to the viewport. Never add a filter to the column itself. */

@supports ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
	/* Live on: the one real glass path. This is the only place a large panel samples
	   the wallpaper; the pseudo layer keeps every fixed descendant anchored. */
	body[data-dsh-tianlight][data-tl-glass-live-effective="on"] :is([data-tl-sidebar-col], [data-tl-wall], [data-tl-settings], [data-tl-hub] [data-tl-hub-panel], [data-tl-composer])::before {
		-webkit-backdrop-filter: blur(var(--tl-glass-blur-live)) saturate(var(--tl-glass-sat-live)) brightness(var(--tl-glass-bright-live)) contrast(var(--tl-glass-contrast-live));
		backdrop-filter: blur(var(--tl-glass-blur-live)) saturate(var(--tl-glass-sat-live)) brightness(var(--tl-glass-bright-live)) contrast(var(--tl-glass-contrast-live));
	}
	body[data-dsh-tianlight][data-tl-glass-live-effective="on"] [data-tl-menu]::before {
		-webkit-backdrop-filter: blur(var(--tl-glass-menu-blur-live)) saturate(var(--tl-glass-sat-live)) brightness(var(--tl-glass-bright-live)) contrast(var(--tl-glass-contrast-live));
		backdrop-filter: blur(var(--tl-glass-menu-blur-live)) saturate(var(--tl-glass-sat-live)) brightness(var(--tl-glass-bright-live)) contrast(var(--tl-glass-contrast-live));
	}
	/* Composer lens: the SVG filter only bends an 18px band at the rounded edge;
	   the centre is untouched. It is gated on real depth + runtime support and is
	   optional; the blur above still works when the browser rejects the SVG filter. */
	body[data-dsh-tianlight][data-tl-glass-effective="real"][data-tl-glass-lens-support="1"][data-tl-glass-live-effective="on"] [data-tl-composer]::before {
		-webkit-backdrop-filter: url(#tl-glass-lens-filter) blur(var(--tl-glass-blur-live)) saturate(var(--tl-glass-sat-live)) brightness(var(--tl-glass-bright-live)) contrast(var(--tl-glass-contrast-live));
		backdrop-filter: url(#tl-glass-lens-filter) blur(var(--tl-glass-blur-live)) saturate(var(--tl-glass-sat-live)) brightness(var(--tl-glass-bright-live)) contrast(var(--tl-glass-contrast-live));
	}
}

/* Static fallback = live off, low power and the 15 fps tier. Still tinted glass,
   never an opaque sheet; and no sampling, so the wallpaper stays crisp. */
body[data-dsh-tianlight]:is([data-tl-glass-effective="soft"], [data-tl-glass-effective="frosted"], [data-tl-glass-effective="real"])[data-tl-glass-live-effective="off"] :is([data-tl-sidebar-col], [data-tl-wall], [data-tl-settings], [data-tl-hub] [data-tl-hub-panel], [data-tl-composer]) {
	background-color: var(--tl-glass-tint-static) !important;
}
body[data-dsh-tianlight]:is([data-tl-glass-effective="soft"], [data-tl-glass-effective="frosted"], [data-tl-glass-effective="real"])[data-tl-glass-live-effective="off"] [data-tl-menu] {
	background-color: var(--tl-glass-tint-menu) !important;
}
body[data-dsh-tianlight][data-tl-lowpower]:is([data-tl-glass-effective="soft"], [data-tl-glass-effective="frosted"], [data-tl-glass-effective="real"]) :is([data-tl-sidebar-col], [data-tl-wall], [data-tl-settings], [data-tl-hub] [data-tl-hub-panel], [data-tl-menu], [data-tl-composer]),
body[data-dsh-tianlight][data-tl-render-tier="15"]:is([data-tl-glass-effective="soft"], [data-tl-glass-effective="frosted"], [data-tl-glass-effective="real"]) :is([data-tl-sidebar-col], [data-tl-wall], [data-tl-settings], [data-tl-hub] [data-tl-hub-panel], [data-tl-menu], [data-tl-composer]) {
	background-color: var(--tl-glass-tint-lowpower) !important;
}
/* Acceptance 5: at low power / 15 fps there is no backdrop-filter anywhere. This
   includes the base composer fuzz and the small pills that predate the depth presets. */
body[data-dsh-tianlight][data-tl-lowpower] :is([data-tl-composer], [data-tl-model], [data-tl-rheo][data-tl-rheo-empty], [data-tl-menu], [data-tl-new-chat], [data-tl-weather-chip], [data-tl-glass-preview])::before,
body[data-dsh-tianlight][data-tl-render-tier="15"] :is([data-tl-composer], [data-tl-model], [data-tl-rheo][data-tl-rheo-empty], [data-tl-menu], [data-tl-new-chat], [data-tl-weather-chip], [data-tl-glass-preview])::before,
body[data-dsh-tianlight][data-tl-lowpower] :is([data-tl-composer], [data-tl-model], [data-tl-rheo][data-tl-rheo-empty], [data-tl-menu], [data-tl-new-chat], [data-tl-weather-chip], [data-tl-glass-preview]),
body[data-dsh-tianlight][data-tl-render-tier="15"] :is([data-tl-composer], [data-tl-model], [data-tl-rheo][data-tl-rheo-empty], [data-tl-menu], [data-tl-new-chat], [data-tl-weather-chip], [data-tl-glass-preview]) {
	-webkit-backdrop-filter: none !important;
	backdrop-filter: none !important;
}
body[data-dsh-tianlight][data-tl-lowpower] :is([data-tl-sidebar-col], [data-tl-wall], [data-tl-settings], [data-tl-hub] [data-tl-hub-panel], [data-tl-menu], [data-tl-composer])::before,
body[data-dsh-tianlight][data-tl-render-tier="15"] :is([data-tl-sidebar-col], [data-tl-wall], [data-tl-settings], [data-tl-hub] [data-tl-hub-panel], [data-tl-menu], [data-tl-composer])::before {
	-webkit-backdrop-filter: none !important;
	backdrop-filter: none !important;
}

/* Small floating controls keep their existing compact glass. They are host-blurred
   today; the low-power rule above removes that blur. At real depth the two existing
   pills use the same saturation as the panels. */
body[data-dsh-tianlight]:is([data-tl-glass-effective="soft"], [data-tl-glass-effective="frosted"], [data-tl-glass-effective="real"]) :is([data-tl-model], [data-tl-rheo][data-tl-rheo-empty], [data-tl-new-chat], [data-tl-weather-chip], [data-tl-glass-preview], [data-tl-scheme-toggle]) {
	border-color: transparent !important;
	/* v2.3.0: the light pill takes the cool float shadow + white top highlight; the dark
	   override below keeps its shipped values. */
	box-shadow:
		var(--tl-pill-inset),
		var(--tl-shadow-float) !important;
}
body[data-dsh-tianlight][data-ds-dark-theme]:is([data-tl-glass-effective="soft"], [data-tl-glass-effective="frosted"], [data-tl-glass-effective="real"]) :is([data-tl-model], [data-tl-rheo][data-tl-rheo-empty], [data-tl-new-chat], [data-tl-weather-chip], [data-tl-glass-preview], [data-tl-scheme-toggle]) {
	box-shadow:
		inset 0 1px 1px rgba(255, 255, 255, 0.10),
		0 6px 20px rgba(0, 0, 0, 0.30) !important;
}

/* Scene-less fallback: a quiet depth wash behind the UI, never a full-screen blur. */
body[data-dsh-tianlight]:is([data-tl-glass-effective="soft"], [data-tl-glass-effective="frosted"], [data-tl-glass-effective="real"]) [data-tl-liquid-fallback] {
	position: fixed;
	inset: 0;
	z-index: -1;
	pointer-events: none;
	background: linear-gradient(180deg, rgba(255, 255, 255, 0.03) 0%, rgba(8, 16, 28, 0.08) 100%);
}
body[data-dsh-tianlight][data-tl-glass-effective="off"] [data-tl-liquid-fallback] {
	display: none;
}
body[data-dsh-tianlight][data-tl-lowpower] [data-tl-liquid-fallback] {
	background: rgba(8, 16, 28, 0.12);
}

/* Inputs keep a hairline only; never a filter that could re-anchor IME/caret. */
body[data-dsh-tianlight]:is([data-tl-glass-effective="soft"], [data-tl-glass-effective="frosted"], [data-tl-glass-effective="real"]) textarea,
body[data-dsh-tianlight]:is([data-tl-glass-effective="soft"], [data-tl-glass-effective="frosted"], [data-tl-glass-effective="real"]) [contenteditable="true"],
body[data-dsh-tianlight]:is([data-tl-glass-effective="soft"], [data-tl-glass-effective="frosted"], [data-tl-glass-effective="real"]) [role="textbox"],
body[data-dsh-tianlight]:is([data-tl-glass-effective="soft"], [data-tl-glass-effective="frosted"], [data-tl-glass-effective="real"]) input:not([type="checkbox"]):not([type="radio"]):not([type="range"]) {
	border-color: color-mix(in srgb, var(--tl-glass-edge-hi) 18%, transparent);
	box-shadow: none;
}

/* Off-depth keeps the v2.2.8 look: only the rules gated on a non-off effective
   depth above are new. The old 0.66/0.72 full-frame sidebar overlay is gone. */
body[data-dsh-tianlight][data-ds-dark-theme][data-tl-glass-effective="off"] [data-tl-composer] {
	background: var(--tl-glass-fill) !important;
}
`;
		//#endregion
