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

/* ---- v1.0.0 liquid glass depth: off / frosted / soft / real ----
   The treatment lives on the scene layer (behind the product UI) as a STATIC
   surface stack: tiled grain + cool tint + diagonal sheen + top-left specular.
   R2 energy pass: the live backdrop-filter is gone from this layer.
   Blurring the whole viewport behind a playing 4K wallpaper re-ran the blur for
   every decoded video frame, for a treatment the period-adaptive overlay
   (--tl-period-dim 0.02-0.04) usually made nearly invisible. A static gradient /
   grain veil costs nothing per frame. Glass on the product's own bounded surfaces
   (composer, menus, pills) keeps its blur; those are small layers, not a
   full-screen composite. */
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
	/* The 1px light/dark inner edge trio and the outer soft glow, shared by every
	   surface so one box-shadow declaration composes the full v2 rim. The bottom
	   inset is the v2.2.0 "thickness" edge that keeps the glass from flattening
	   into a white sheet. */
	--tl-liquid-rim-shadow:
		inset 1px 1px 0 rgba(240, 249, 255, var(--tl-liquid-rim)),
		inset -1px -1px 0 rgba(4, 14, 28, calc(var(--tl-liquid-rim) * 0.55)),
		inset 0 -1px 0 rgba(4, 14, 28, calc(var(--tl-liquid-rim) * 0.40));
	/* A broad, soft inner edge is what makes a pane read as thick glass rather than a
	   tinted rectangle: the centre stays clear, the border gathers a little shadow. */
	--tl-liquid-lens-shadow:
		inset 0 0 22px rgba(8, 24, 42, 0.10),
		inset 0 0 60px rgba(8, 24, 42, 0.05);
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
body[data-dsh-tianlight] [data-tl-scene]::after {
	content: "";
	position: absolute;
	inset: -2%;
	pointer-events: none;
	z-index: 2;
	opacity: 1;
	background-image: var(--tl-liquid-surface);
	background-size: var(--tl-liquid-surface-size);
}
body[data-dsh-tianlight][data-tl-glass-effective="off"] [data-tl-scene]::after {
	display: none;
}
/* The scene layer is a static veil at every depth now, so low power has nothing
   extra to flatten here; the panel glass rules below keep their own low-power
   override. */
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
     backdrop-filter: the only full-size blur left is the scene-less fallback node
     (and that one exists on a bare page), while these surfaces already paint their
     own fill. A second full-size blur would re-composite on every video frame;
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
	/* v2.2.5: NO backdrop-filter here. This node is full-viewport, so a filter on it
	   blurs the entire wallpaper ("the background is all smeared"). The fallback still
	   paints the static grain/tint/specular recipe; it simply does not sample live. */
	box-shadow: var(--tl-liquid-rim-shadow);
}
body[data-dsh-tianlight][data-tl-glass-effective="off"] [data-tl-liquid-fallback] {
	display: none;
}
body[data-dsh-tianlight][data-tl-lowpower]:is([data-tl-glass-effective="soft"], [data-tl-glass-effective="frosted"], [data-tl-glass-effective="real"]) [data-tl-liquid-fallback] {
	background-image: linear-gradient(115deg, rgba(255, 255, 255, var(--tl-liquid-hi)) 0%, rgba(255, 255, 255, 0) 60%);
	background-size: auto;
	box-shadow: none;
}

/* Group A: heavy surfaces. Fill, v2 surface stack (tiled grain + cool tint + sheen +
   specular), 1px light/dark inner rim, outer soft glow and a light drop shadow.
   The sidebar column is the one place the depth adds a fill on purpose: it is a
   product surface that otherwise stays fully transparent, and "glass everywhere"
   is the point of this preset. The fill is mixed down so the wallpaper still reads
   through it. No extra backdrop-filter on these panels: the scene-less fallback
   node owns the one full-size blur, and a second one would re-composite the
   wallpaper behind every frame. */
body[data-dsh-tianlight]:is([data-tl-glass-effective="soft"], [data-tl-glass-effective="frosted"], [data-tl-glass-effective="real"]) :is([data-tl-sidebar], [data-tl-sidebar-col]) {
	background-color: color-mix(in srgb, var(--tl-glass-fill) 62%, transparent) !important;
	/* A lens, not a white sheet: one narrow specular streak at the top-left, one cool
	   refraction tint at the bottom-right, then the grain surface. The 1px bright
	   right edge is what makes it read as a glass pane. */
	background-image:
		linear-gradient(135deg, rgba(255, 255, 255, 0.10) 0%, rgba(255, 255, 255, 0) 26%),
		radial-gradient(120% 100% at 100% 100%, rgba(70, 150, 240, 0.10) 0%, rgba(70, 150, 240, 0) 62%),
		var(--tl-liquid-surface) !important;
	background-size: auto, auto, var(--tl-liquid-surface-size);
	border-right: 1px solid rgba(255, 255, 255, 0.45);
	box-shadow:
		var(--tl-liquid-rim-shadow),
		var(--tl-liquid-lens-shadow),
		var(--tl-liquid-glow-shadow),
		0 0 0 0.5px var(--tl-glass-line),
		0 10px 30px rgba(8, 26, 44, 0.14);
}
body[data-dsh-tianlight]:is([data-tl-glass-effective="soft"], [data-tl-glass-effective="frosted"], [data-tl-glass-effective="real"]) :is([data-tl-settings], [data-tl-wall]) {
	background-image:
		linear-gradient(135deg, rgba(255, 255, 255, 0.10) 0%, rgba(255, 255, 255, 0) 22%),
		var(--tl-liquid-surface) !important;
	background-size: auto, var(--tl-liquid-surface-size);
	border-color: var(--tl-glass-line);
	box-shadow:
		var(--tl-liquid-rim-shadow),
		var(--tl-liquid-lens-shadow),
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
	background-image:
		linear-gradient(135deg, rgba(255, 255, 255, 0.10) 0%, rgba(255, 255, 255, 0) 22%),
		var(--tl-liquid-surface);
	background-size: auto, var(--tl-liquid-surface-size);
	border-color: var(--tl-glass-line);
	box-shadow:
		var(--tl-liquid-rim-shadow),
		var(--tl-liquid-lens-shadow),
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
	background-image:
		linear-gradient(135deg, rgba(255, 255, 255, 0.10) 0%, rgba(255, 255, 255, 0) 18%),
		radial-gradient(120% 140% at 0% 0%, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0) 48%),
		var(--tl-liquid-surface) !important;
	background-size: auto, auto, var(--tl-liquid-surface-size);
	border-color: rgba(255, 255, 255, calc(var(--tl-liquid-hi) + 0.30)) !important;
	box-shadow:
		var(--tl-liquid-rim-shadow),
		var(--tl-liquid-lens-shadow),
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

/* ---- v2.2.0 real-time (live) glass ------------------------------------------
   The depth presets are a static veil by design (see the R2 note above). Live mode
   is the explicit opt-in that buys the real thing: the known glass surfaces get a
   backdrop-filter, so Chromium re-samples whatever wallpaper frame is behind them.
   It is gated on data-tl-glass-live-effective="on"; the installer writes that
   attribute only when the user turned live on AND the low-power / 15 fps guard is
   clear, so neither the default path nor a degraded path pays for a single extra
   compositing layer. Only the large, known skin surfaces are sampled: transcript
   bubbles stay fill-only (one live blur per bubble would re-composite per message). */
body[data-dsh-tianlight][data-ds-dark-theme] {
	--tl-liquid-live-bright: 1.02;
}
/* Live glass must be COLOUR from the wallpaper, not paint: strip most of the
   static white specular/fill and let the sampled backdrop carry the look. This is
   the direct answer to "enabling live glass makes everything too white". */
body[data-dsh-tianlight]:not([data-ds-dark-theme])[data-tl-glass-live-effective="on"] {
	--tl-glass-fill: rgba(205, 228, 250, calc(0.04 * var(--tl-glass-m, 1)));
	--tl-panel-fill: rgba(235, 245, 255, max(0.56, calc(0.50 * var(--tl-glass-m, 1))));
	--tl-overlay: rgba(235, 245, 255, 0.50);
	--tl-liquid-hi: 0.03;
	--tl-liquid-lo: 0.01;
	--tl-liquid-noise: 0.015;
	--tl-liquid-sheen: 0.06;
	--tl-liquid-rim: 0.35;
}
/* Dark theme must stay dark: the light live fill above was the exact cause of the
   "white haze" on a dark UI. The pane is smoked glass with a cool specular edge. */
body[data-dsh-tianlight][data-ds-dark-theme][data-tl-glass-live-effective="on"] {
	/* Smoked glass, not a bright pane: a bright wallpaper is darkened by the pane and
	   the backdrop filter, so white text keeps its contrast and the pane reads as glass. */
	--tl-glass-fill: rgba(6, 14, 24, calc(0.40 * var(--tl-glass-m, 1)));
	--tl-panel-fill: rgba(8, 16, 28, max(0.72, calc(0.66 * var(--tl-glass-m, 1))));
	--tl-overlay: rgba(8, 16, 28, 0.70);
	--tl-liquid-hi: 0.08;
	--tl-liquid-lo: 0.01;
	--tl-liquid-noise: 0.02;
	--tl-liquid-sheen: 0.16;
	--tl-liquid-rim: 0.36;
	--tl-liquid-live-blur: 6px;
	--tl-liquid-live-bright: 0.72;
	--tl-liquid-live-sat: 1.35;
	--tl-liquid-live-contrast: 1.06;
}
@supports ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
	/* v2.2.5: NEVER put a backdrop-filter on the sidebar containers. DSH Desktop's
	   sidebar toggle is position:fixed; left:12px; top:6px inside the sidebar column
	   (dsh-client-ui-sidebar), and a filtered ancestor becomes its containing block —
	   the toggle then lands on the brand mark instead of the title strip, which is the
	   "sidebar icon overlaps the product logo / no way to restore the sidebar" report. The sidebar keeps the static recipe (fills below) and simply does not
	   sample the wallpaper live; the composer keeps its ::before for the same reason.
	   tools/check-css.mjs fails if a data-tl-sidebar selector comes back into this list. */
	/* v2.2.5: no live filter on the large panels either. The wallpaper behind them
	   must stay crisp — a backdrop blur on a panel that covers half the window makes
	   the whole scene look out of focus. Live mode only adjusts their fill; the real
	   sampling stays on the composer and the small floating controls. */
	body[data-dsh-tianlight][data-tl-glass-live-effective="on"] :is([data-tl-settings], [data-tl-wall]) {
		background-color: color-mix(in srgb, var(--tl-panel-fill) 55%, transparent) !important;
	}
	body[data-dsh-tianlight][data-tl-glass-live-effective="on"] [data-tl-hub] [data-tl-hub-panel] {
		background-color: color-mix(in srgb, var(--tl-overlay) 52%, transparent) !important;
	}
	body[data-dsh-tianlight][data-tl-glass-live-effective="on"] :is([data-tl-sidebar], [data-tl-sidebar-col]) {
		background-color: color-mix(in srgb, var(--tl-glass-fill) 30%, transparent) !important;
	}
	/* Dark mode needs more of the smoked fill: 30% of a dark tint over a bright
	   wallpaper is still a bright pane. */
	body[data-dsh-tianlight][data-ds-dark-theme][data-tl-glass-live-effective="on"] :is([data-tl-sidebar], [data-tl-sidebar-col]) {
		background-color: color-mix(in srgb, var(--tl-glass-fill) 82%, transparent) !important;
	}
	body[data-dsh-tianlight][data-ds-dark-theme][data-tl-glass-live-effective="on"] :is([data-tl-settings], [data-tl-wall]) {
		background-color: color-mix(in srgb, var(--tl-panel-fill) 74%, transparent) !important;
	}
	body[data-dsh-tianlight][data-ds-dark-theme][data-tl-glass-live-effective="on"] [data-tl-hub] [data-tl-hub-panel] {
		background-color: color-mix(in srgb, var(--tl-overlay) 78%, transparent) !important;
	}
	/* Composer keeps its ::before ownership (a filter on the card itself would
	   re-anchor its non-portaled tooltips); live only makes that one layer real. */
	body[data-dsh-tianlight][data-tl-glass-live-effective="on"] [data-tl-composer]::before {
		-webkit-backdrop-filter: blur(var(--tl-liquid-live-blur)) saturate(var(--tl-liquid-live-sat)) brightness(var(--tl-liquid-live-bright)) contrast(var(--tl-liquid-live-contrast));
		backdrop-filter: blur(var(--tl-liquid-live-blur)) saturate(var(--tl-liquid-live-sat)) brightness(var(--tl-liquid-live-bright)) contrast(var(--tl-liquid-live-contrast));
	}
	/* Small floating surfaces upgrade their existing bounded blur; none of them
	   gains a filter it did not already carry at a non-off depth. */
	body[data-dsh-tianlight][data-tl-glass-live-effective="on"] :is([data-tl-menu], [data-tl-model], [data-tl-new-chat], [data-tl-weather-chip], [data-tl-rheo][data-tl-rheo-empty], [data-tl-glass-preview]) {
		-webkit-backdrop-filter: blur(var(--tl-liquid-live-blur)) saturate(var(--tl-liquid-live-sat)) brightness(var(--tl-liquid-live-bright)) contrast(var(--tl-liquid-live-contrast));
		backdrop-filter: blur(var(--tl-liquid-live-blur)) saturate(var(--tl-liquid-live-sat)) brightness(var(--tl-liquid-live-bright)) contrast(var(--tl-liquid-live-contrast));
	}
	/* v2.2.2 lens: Chromium accepts an SVG filter inside backdrop-filter, so the
	   wallpaper behind the glass is gently bent, not merely blurred. v2.2.5 keeps it on
	   the composer only: the lens is a bounded effect, and bending a half-window panel
	   also bends the wallpaper the user is looking at. The installer adds
	   data-tl-glass-lens-support="1" only after CSS.supports proves it. */
	body[data-dsh-tianlight][data-tl-glass-lens-support="1"][data-tl-glass-live-effective="on"] [data-tl-composer]::before {
		-webkit-backdrop-filter: url(#tl-glass-lens-filter) blur(var(--tl-liquid-live-blur)) saturate(var(--tl-liquid-live-sat)) brightness(var(--tl-liquid-live-bright)) contrast(var(--tl-liquid-live-contrast));
		backdrop-filter: url(#tl-glass-lens-filter) blur(var(--tl-liquid-live-blur)) saturate(var(--tl-liquid-live-sat)) brightness(var(--tl-liquid-live-bright)) contrast(var(--tl-liquid-live-contrast));
	}
	/* The role-hub preview is the control's own feedback: live makes it clear at a
	   glance, including a tiny moving-wallpaper feel from the real backdrop. */
	body[data-dsh-tianlight] [data-tl-hub] [data-tl-glass-preview][data-live="on"] {
		box-shadow:
			inset 0 1px 0 rgba(235, 247, 255, calc(var(--tl-liquid-hi) + 0.10)),
			var(--tl-liquid-rim-shadow),
			0 0 0 0.5px rgba(120, 190, 255, 0.35),
			var(--tl-liquid-glow-shadow);
	}
}

`;
		//#endregion
