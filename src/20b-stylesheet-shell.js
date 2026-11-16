		//#region stylesheet
		const CSS_SHELL = String.raw`/* ---- raise the application above the wallpaper ---- */
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
	/* v2.2.6: no inset top highlight. The 1px inner line did not follow the top border
	   radius visibly and read as a second, stray line above the input. The 0.5px border
	   is the only edge the card needs; the ::before layer keeps the frosted body. */
	box-shadow: 0 10px 34px rgba(8, 28, 52, 0.22) !important;
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
	/* Same rule as the light card: the drop shadow only, no 1px top highlight. */
	box-shadow: 0 10px 34px rgba(0, 0, 0, 0.45) !important;
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
/* v1.6.7: URL address and ShaderToy code are first-class sources of the default
   wallpaper picker, not advanced-only entries any more. Two compact cards sit
   above the filter chips; the cards reuse the .tl-source-card base look, so only
   the layout and the text wrapping are new. */
body[data-dsh-tianlight] .tl-wall-quick-source {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 6px;
	margin: 2px 0 3px;
}
body[data-dsh-tianlight] .tl-wall-quick-source .tl-source-card {
	min-width: 0;
	white-space: normal;
	overflow-wrap: anywhere;
}
body[data-dsh-tianlight] .tl-wall-quick-source .tl-source-card:hover,
body[data-dsh-tianlight] .tl-wall-quick-source .tl-source-card:focus-visible {
	border-color: var(--tl-accent);
	color: var(--tl-ink);
}
body[data-dsh-tianlight] .tl-wall-quick-source .tl-source-note {
	white-space: normal;
	overflow-wrap: anywhere;
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
/* ---- overlay stack: two CSS-only layers above the wallpaper, below the veil ---- */
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
	/* v2.2.8: the divider tokens dropped to near-invisible, but a scrollbar must stay
	   usable. This is a control, not a decorative line, so it keeps its own alphas. */
	background: rgba(140, 180, 220, 0.38);
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

`;
		//#endregion
