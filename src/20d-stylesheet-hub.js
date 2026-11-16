		//#region stylesheet
		const CSS_HUB = String.raw`/* Role-hub liquid-glass preview: a compact swatch that reflects the current depth
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
	/* v2.2.9: a scrim for a floating panel is not a modal. 0.42 read as "the whole
	   wallpaper went dark" when the hub opened; 0.18 keeps the focus cue. */
	background: rgba(6, 16, 28, 0.18);
	/* v2.2.5: no backdrop-filter on the full-screen scrim. It covered the whole window,
	   so opening the hub smeared the entire wallpaper instead of dimming it. */
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
/* v2.2.0 live-rendering switch: a status dot makes on/off readable without colour
   alone (the label text already carries the state). */
body[data-dsh-tianlight] [data-tl-hub] [data-tl-hub-glass-live]::before {
	content: "";
	display: inline-block;
	width: 6px;
	height: 6px;
	margin-right: 6px;
	border-radius: 999px;
	background: currentColor;
	opacity: 0.35;
	vertical-align: 1px;
}
body[data-dsh-tianlight] [data-tl-hub] [data-tl-hub-glass-live][data-active]::before {
	opacity: 1;
	background: #8ef0c8;
	box-shadow: 0 0 6px rgba(142, 240, 200, 0.9);
}
body[data-dsh-tianlight] [data-tl-hub] [data-tl-hub-glass-live-note] {
	flex: 1 1 190px;
	min-width: 150px;
	font: 400 11px/1.45 var(--ds-font-family, system-ui);
	color: var(--tl-ink-faint, var(--tl-ink-soft, var(--tl-ink)));
}
body[data-dsh-tianlight] [data-tl-hub] [data-tl-hub-glass-live][data-tl-hub-glass-live-state="degraded"] {
	opacity: 0.75;
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
	border-color: transparent !important;
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
	border-color: transparent;
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

/* ---- v1.6.4: hub media filenames, per-look action packs, companion AI chat ---- */
/* Native select popups on Windows draw option rows with the page colours; without
   this an option row can be white text on the default white popup. */
body[data-dsh-tianlight] [data-tl-hub] .tl-hub-select option {
	color: #16283c;
	background-color: #f6fbff;
}
body[data-dsh-tianlight][data-ds-dark-theme] [data-tl-hub] .tl-hub-select option {
	color: #eaf4ff;
	background-color: #16233a;
}
/* A way to read every filename without opening the select: one row per file, the
   active row marked, click to switch. */
body[data-dsh-tianlight] [data-tl-hub] .tl-hub-media-list {
	display: flex;
	flex-direction: column;
	gap: 3px;
	max-height: 190px;
	overflow: auto;
	padding: 4px;
	border-radius: 10px;
	background: rgba(8, 18, 30, 0.10);
}
body[data-dsh-tianlight] [data-tl-hub] [data-tl-hub-media-row] {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 8px;
	width: 100%;
	text-align: left;
	padding: 6px 9px;
	border-radius: 8px;
	background: transparent;
	color: var(--tl-ink-soft, var(--tl-ink));
	cursor: pointer;
}
body[data-dsh-tianlight] [data-tl-hub] [data-tl-hub-media-row]:hover {
	background: var(--tl-accent-soft);
	color: var(--tl-ink);
}
body[data-dsh-tianlight] [data-tl-hub] [data-tl-hub-media-row][data-selected] {
	background: var(--tl-accent-soft);
	color: var(--tl-ink);
	box-shadow: inset 0 0 0 1px var(--tl-accent);
}
body[data-dsh-tianlight] [data-tl-hub] .tl-hub-media-name {
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	font: 500 12px/1.4 var(--ds-font-family, system-ui);
}
body[data-dsh-tianlight] [data-tl-hub] .tl-hub-media-meta {
	flex: none;
	font: 500 10px/1.4 var(--ds-font-family, system-ui);
	color: var(--tl-ink-faint, var(--tl-ink-soft, var(--tl-ink)));
}
/* Per-look action pack editor. Labels are the cat-menu button text; lines are one
   reply per line and replace that look's canned replies. */
body[data-dsh-tianlight] [data-tl-hub] [data-tl-hub-media-pack] {
	display: flex;
	flex-direction: column;
	gap: 8px;
	margin-top: 10px;
	padding: 10px;
	border-radius: 12px;
	background: rgba(8, 18, 30, 0.12);
}
body[data-dsh-tianlight] [data-tl-hub] [data-tl-hub-pack-title] {
	margin: 0;
	font: 600 12px/1.4 var(--ds-font-family, system-ui);
	color: var(--tl-ink);
}
body[data-dsh-tianlight] [data-tl-hub] [data-tl-hub-pack-row] {
	display: flex;
	flex-direction: column;
	gap: 4px;
}
body[data-dsh-tianlight] [data-tl-hub] [data-tl-hub-pack-label],
body[data-dsh-tianlight] [data-tl-hub] textarea[data-tl-hub-pack-lines] {
	width: 100%;
	box-sizing: border-box;
	padding: 6px 9px;
	border-radius: 9px;
	border: 0.5px solid var(--tl-line-strong, rgba(255, 255, 255, 0.3));
	background: var(--tl-glass-fill, rgba(255, 255, 255, 0.12));
	color: var(--tl-ink);
	font: 500 12px/1.4 var(--ds-font-family, system-ui);
}
body[data-dsh-tianlight] [data-tl-hub] textarea[data-tl-hub-pack-lines] {
	resize: vertical;
	min-height: 38px;
}
body[data-dsh-tianlight] [data-tl-hub] [data-tl-hub-pack-actions] {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
}
body[data-dsh-tianlight] [data-tl-hub] [data-tl-hub-pack-status] {
	margin: 0;
	font: 400 11px/1.5 var(--ds-font-family, system-ui);
	color: var(--tl-ink-faint, var(--tl-ink-soft, var(--tl-ink)));
}
/* v1.6.8 autonomous-thinking card (src/76-role-hub.js): a compact control row,
   an opt-in speech switch and a short scrollable list of the latest thoughts. */
body[data-dsh-tianlight] [data-tl-hub] [data-tl-hub-mind] .tl-hub-mind-speak {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	font: 500 11px/1.4 var(--ds-font-family, system-ui);
	color: var(--tl-ink-soft, var(--tl-ink));
}
body[data-dsh-tianlight] [data-tl-hub] [data-tl-hub-mind] [data-tl-hub-mind-speak] {
	accent-color: var(--tl-accent);
}
body[data-dsh-tianlight] [data-tl-hub] [data-tl-hub-mind] .tl-hub-mind-thoughts {
	display: flex;
	flex-direction: column;
	gap: 6px;
	max-height: 180px;
	overflow: auto;
	margin-top: 4px;
	padding: 8px 9px;
	border-radius: 11px;
	background: rgba(8, 18, 30, 0.1);
}
body[data-dsh-tianlight] [data-tl-hub] [data-tl-hub-mind] .tl-hub-mind-thought {
	display: grid;
	grid-template-columns: auto auto 1fr;
	align-items: baseline;
	gap: 6px;
	font: 400 11px/1.5 var(--ds-font-family, system-ui);
	color: var(--tl-ink);
}
body[data-dsh-tianlight] [data-tl-hub] [data-tl-hub-mind] .tl-hub-mind-time {
	font: 600 10px/1.4 var(--ds-font-family, system-ui);
	color: var(--tl-ink-faint, var(--tl-ink-soft, var(--tl-ink)));
}
body[data-dsh-tianlight] [data-tl-hub] [data-tl-hub-mind] .tl-hub-mind-kind {
	font: 600 9px/1.3 var(--ds-font-family, system-ui);
	color: var(--tl-ink-faint, var(--tl-ink-soft, var(--tl-ink)));
	text-transform: uppercase;
	letter-spacing: 0.04em;
}
body[data-dsh-tianlight] [data-tl-hub] [data-tl-hub-mind] .tl-hub-mind-text {
	min-width: 0;
	white-space: pre-wrap;
	word-break: break-word;
}
body[data-dsh-tianlight] [data-tl-hub] [data-tl-hub-mind][data-tl-hub-mind-ready="false"] [data-tl-hub-mind-thoughts] {
	opacity: 0.6;
}
/* The cat menu grew from 7 to 8 actions: wrap instead of pushing buttons off the
   screen edge, and round the pill accordingly. */
body[data-dsh-tianlight] [data-tl-cat] > [data-tl-catmenu] {
	flex-wrap: wrap;
	justify-content: center;
	max-width: 238px;
	border-radius: 16px;
}
/* Chat replies can be longer than a casual line: wider, scrollable speech bubble. */
body[data-dsh-tianlight] [data-tl-cat] > [data-tl-say][data-tl-chat] {
	max-width: 300px;
	max-height: 190px;
	overflow: auto;
	text-align: left;
}
/* While the chat composer is open the speech bubble moves above it. */
body[data-dsh-tianlight] [data-tl-cat][data-tl-chat-open] > [data-tl-say] {
	bottom: calc(100% + 96px);
}
body[data-dsh-tianlight] [data-tl-cat] > [data-tl-catchat] {
	position: absolute;
	bottom: calc(100% + 10px);
	left: 50%;
	transform: translateX(-50%) translateY(4px);
	display: flex;
	flex-direction: column;
	gap: 6px;
	box-sizing: border-box;
	width: min(278px, calc(100vw - 24px));
	padding: 9px 10px;
	border-radius: 14px;
	background: var(--tl-overlay);
	color: var(--tl-ink);
	border: 0.5px solid var(--tl-line);
	box-shadow: 0 12px 30px rgba(8, 26, 44, 0.26);
	opacity: 0;
	pointer-events: none;
	z-index: 3;
	transition: opacity 160ms ease, transform 160ms ease;
}
body[data-dsh-tianlight] [data-tl-cat][data-tl-chat-open] > [data-tl-catchat] {
	opacity: 1;
	pointer-events: auto;
	transform: translateX(-50%) translateY(0);
}
body[data-dsh-tianlight] [data-tl-cat] > [data-tl-catchat] [data-tl-catchat-status] {
	min-height: 14px;
	font: 500 11px/1.4 var(--ds-font-family, system-ui);
	color: var(--tl-ink-soft, var(--tl-ink));
	white-space: pre-wrap;
	word-break: break-word;
}
body[data-dsh-tianlight] [data-tl-cat] > [data-tl-catchat] [data-tl-catchat-input] {
	width: 100%;
	box-sizing: border-box;
	padding: 7px 10px;
	border-radius: 10px;
	border: 0.5px solid var(--tl-line-strong, rgba(255, 255, 255, 0.3));
	background: var(--tl-glass-fill, rgba(255, 255, 255, 0.12));
	color: var(--tl-ink);
	font: 500 12px/1.4 var(--ds-font-family, system-ui);
}
body[data-dsh-tianlight] [data-tl-cat] > [data-tl-catchat] [data-tl-catchat-input]::placeholder {
	color: var(--tl-ink-faint, var(--tl-ink-soft, var(--tl-ink)));
}
body[data-dsh-tianlight] [data-tl-cat] > [data-tl-catchat] [data-tl-catchat-send] {
	align-self: flex-end;
	appearance: none;
	border: 0;
	padding: 6px 12px;
	border-radius: 999px;
	background: var(--tl-accent);
	color: #fff;
	font: 600 11px/1 var(--ds-font-family, system-ui);
	cursor: pointer;
}
body[data-dsh-tianlight] [data-tl-cat] > [data-tl-catchat] [data-tl-catchat-send]:disabled {
	opacity: 0.45;
	cursor: default;
}
body[data-dsh-tianlight] [data-tl-cat] > [data-tl-catchat][data-tl-busy] [data-tl-catchat-status] {
	opacity: 0.75;
}
/* v1.6.5: the composer header row pairs the status line with an explicit close
   button. Without it the panel looked like a dead end (it is opened from the pet
   menu, and that menu can sit off-screen when the pet is near a screen edge). */
body[data-dsh-tianlight] [data-tl-cat] > [data-tl-catchat] [data-tl-catchat-head] {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 8px;
}
body[data-dsh-tianlight] [data-tl-cat] > [data-tl-catchat] [data-tl-catchat-close] {
	appearance: none;
	border: 0;
	background: transparent;
	color: var(--tl-ink-soft, var(--tl-ink));
	font: 600 15px/1 var(--ds-font-family, system-ui);
	padding: 3px 8px;
	min-width: 24px;
	min-height: 24px;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	border-radius: 999px;
	cursor: pointer;
	flex: 0 0 auto;
}
body[data-dsh-tianlight] [data-tl-cat] > [data-tl-catchat] [data-tl-catchat-close]:hover,
body[data-dsh-tianlight] [data-tl-cat] > [data-tl-catchat] [data-tl-catchat-close]:focus-visible {
	background: var(--tl-accent-soft);
	color: var(--tl-ink);
}
/* The closed composer must be truly out of layout: the base rule above sets
   display:flex, which outranks the UA [hidden] rule, so without this the panel
   kept occupying layout/pointer space while invisible (the original hidden-attribute
   toggle was effectively a no-op). */
body[data-dsh-tianlight] [data-tl-cat] > [data-tl-catchat][hidden] {
	display: none !important;
}
/* Near the top of the viewport there is no room above the pet: the composer and
   the reply bubble flip below the pet instead of being clipped off-screen. */
body[data-dsh-tianlight] [data-tl-cat][data-tl-chat-flip] > [data-tl-catchat] {
	top: calc(100% + 10px);
	bottom: auto;
}
body[data-dsh-tianlight] [data-tl-cat][data-tl-chat-flip] > [data-tl-say] {
	top: calc(100% + 96px);
	bottom: auto;
}
@media (prefers-reduced-motion: reduce) {
	body[data-dsh-tianlight] [data-tl-cat] > [data-tl-catchat] {
		transition: none;
	}
}
/* v1.6.7 conversation history: a glass browser for past AI chat turns. The panel
   and the composer never open together, so both anchor above the pet; the panel
   is taller, so its conversation list and message area scroll instead of pushing
   the head or the close button off-screen. */
body[data-dsh-tianlight] [data-tl-cat] > [data-tl-cathist] {
	position: absolute;
	bottom: calc(100% + 10px);
	left: 50%;
	transform: translateX(-50%);
	display: flex;
	flex-direction: column;
	gap: 6px;
	box-sizing: border-box;
	width: min(320px, calc(100vw - 24px));
	max-height: 360px;
	padding: 9px 10px;
	border-radius: 14px;
	background: var(--tl-overlay);
	color: var(--tl-ink);
	border: 0.5px solid var(--tl-line);
	box-shadow: 0 12px 30px rgba(8, 26, 44, 0.26);
	z-index: 4;
}
/* Same [hidden] pin as the composer: the flex rule outranks the UA [hidden] rule,
   so without it the closed panel would keep occupying layout/pointer space. */
body[data-dsh-tianlight] [data-tl-cat] > [data-tl-cathist][hidden] {
	display: none !important;
}
body[data-dsh-tianlight] [data-tl-cat] > [data-tl-cathist] [data-tl-cathist-head] {
	display: flex;
	align-items: center;
	gap: 5px;
	flex: 0 0 auto;
}
body[data-dsh-tianlight] [data-tl-cat] > [data-tl-cathist] [data-tl-cathist-title] {
	flex: 1 1 auto;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	font: 600 11px/1.4 var(--ds-font-family, system-ui);
	color: var(--tl-ink);
}
body[data-dsh-tianlight] [data-tl-cat] > [data-tl-cathist] button {
	appearance: none;
	border: 0;
	border-radius: 999px;
	background: var(--tl-glass-fill, rgba(255, 255, 255, 0.12));
	color: var(--tl-ink);
	font: 600 10px/1 var(--ds-font-family, system-ui);
	padding: 5px 8px;
	cursor: pointer;
	flex: 0 0 auto;
}
body[data-dsh-tianlight] [data-tl-cat] > [data-tl-cathist] button:hover,
body[data-dsh-tianlight] [data-tl-cat] > [data-tl-cathist] button:focus-visible {
	background: var(--tl-accent-soft);
	color: var(--tl-ink);
}
body[data-dsh-tianlight] [data-tl-cat] > [data-tl-cathist] button:disabled {
	opacity: 0.4;
	cursor: default;
}
body[data-dsh-tianlight] [data-tl-cat] > [data-tl-cathist] [data-tl-cathist-new] {
	background: var(--tl-accent-soft);
	color: var(--tl-ink);
}
body[data-dsh-tianlight] [data-tl-cat] > [data-tl-cathist] [data-tl-cathist-delete] {
	color: var(--tl-ink-soft, var(--tl-ink));
}
body[data-dsh-tianlight] [data-tl-cat] > [data-tl-cathist] [data-tl-cathist-close] {
	min-width: 24px;
	min-height: 24px;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	padding: 3px 8px;
	font: 600 15px/1 var(--ds-font-family, system-ui);
	background: transparent;
}
body[data-dsh-tianlight] [data-tl-cat] > [data-tl-cathist] [data-tl-cathist-status] {
	flex: 0 0 auto;
	font: 500 10px/1.4 var(--ds-font-family, system-ui);
	color: var(--tl-ink-soft, var(--tl-ink));
}
body[data-dsh-tianlight] [data-tl-cat] > [data-tl-cathist] [data-tl-cathist-conv-list] {
	display: flex;
	flex-direction: column;
	gap: 4px;
	flex: 0 1 auto;
	max-height: 96px;
	overflow: auto;
}
body[data-dsh-tianlight] [data-tl-cat] > [data-tl-cathist] [data-tl-cathist-conv-list]:empty {
	display: none;
}
body[data-dsh-tianlight] [data-tl-cat] > [data-tl-cathist] [data-tl-cathist-conv] {
	width: 100%;
	box-sizing: border-box;
	text-align: left;
	padding: 5px 8px;
	border-radius: 9px;
	background: transparent;
	color: var(--tl-ink-soft, var(--tl-ink));
	font: 500 10px/1.35 var(--ds-font-family, system-ui);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
body[data-dsh-tianlight] [data-tl-cat] > [data-tl-cathist] [data-tl-cathist-conv][data-active] {
	background: var(--tl-accent-soft);
	color: var(--tl-ink);
}
body[data-dsh-tianlight] [data-tl-cat] > [data-tl-cathist] [data-tl-cathist-messages] {
	display: flex;
	flex-direction: column;
	gap: 6px;
	flex: 1 1 auto;
	min-height: 0;
	overflow: auto;
	padding-right: 2px;
}
body[data-dsh-tianlight] [data-tl-cat] > [data-tl-cathist] [data-tl-cathist-messages]:empty {
	display: none;
}
body[data-dsh-tianlight] [data-tl-cat] > [data-tl-cathist] [data-tl-cathist-msg] {
	display: flex;
	flex-direction: column;
	gap: 2px;
	box-sizing: border-box;
	max-width: 100%;
	padding: 5px 8px;
	border-radius: 10px;
	background: rgba(8, 18, 30, 0.1);
}
body[data-dsh-tianlight] [data-tl-cat] > [data-tl-cathist] [data-tl-cathist-msg][data-role="user"] {
	align-self: flex-end;
	background: var(--tl-accent-soft);
}
body[data-dsh-tianlight] [data-tl-cat] > [data-tl-cathist] [data-tl-cathist-msg][data-role="pet"] {
	align-self: flex-start;
}
body[data-dsh-tianlight] [data-tl-cat] > [data-tl-cathist] [data-tl-cathist-msg-head] {
	display: flex;
	align-items: center;
	gap: 6px;
}
body[data-dsh-tianlight] [data-tl-cat] > [data-tl-cathist] [data-tl-cathist-role] {
	flex: 1 1 auto;
	min-width: 0;
	font: 600 9px/1.3 var(--ds-font-family, system-ui);
	color: var(--tl-ink-faint, var(--tl-ink-soft, var(--tl-ink)));
}
body[data-dsh-tianlight] [data-tl-cat] > [data-tl-cathist] [data-tl-cathist-edit] {
	padding: 2px 7px;
	font: 600 9px/1 var(--ds-font-family, system-ui);
}
body[data-dsh-tianlight] [data-tl-cat] > [data-tl-cathist] [data-tl-cathist-text] {
	white-space: pre-wrap;
	word-break: break-word;
	font: 400 10.5px/1.5 var(--ds-font-family, system-ui);
	color: var(--tl-ink);
}
body[data-dsh-tianlight] [data-tl-cat] > [data-tl-cathist] [data-tl-cathist-edit-input] {
	width: 100%;
	box-sizing: border-box;
	padding: 5px 8px;
	border-radius: 8px;
	border: 0.5px solid var(--tl-line-strong, rgba(255, 255, 255, 0.3));
	background: var(--tl-glass-fill, rgba(255, 255, 255, 0.12));
	color: var(--tl-ink);
	font: 500 10.5px/1.4 var(--ds-font-family, system-ui);
}
body[data-dsh-tianlight] [data-tl-cat] > [data-tl-cathist] [data-tl-cathist-edit-actions] {
	display: flex;
	gap: 5px;
}
body[data-dsh-tianlight] [data-tl-cat] > [data-tl-cathist] [data-tl-cathist-empty],
body[data-dsh-tianlight] [data-tl-cat] > [data-tl-cathist] [data-tl-cathist-hint] {
	padding: 6px 2px;
	font: 400 10.5px/1.5 var(--ds-font-family, system-ui);
	color: var(--tl-ink-faint, var(--tl-ink-soft, var(--tl-ink)));
	text-align: center;
}
/* Near the top of the viewport there is no room above the pet: the panel flips
   below it, mirroring the composer's v1.6.6 data-tl-chat-flip behaviour. */
body[data-dsh-tianlight] [data-tl-cat][data-tl-hist-flip] > [data-tl-cathist] {
	top: calc(100% + 10px);
	bottom: auto;
}

/* ---- A · 破晓 opening animation ----
   The overlay lives outside #root and is entirely self-contained: no asset, no
   font download, no backdrop-filter, no layout animation. Motion is limited to
   transform / opacity / filter. The skin owns the visual, the runtime is owned by
   59-splash.js (it removes this node and every timer on skip, error and dispose). */
body[data-dsh-tianlight] [data-tl-splash] {
	position: fixed;
	inset: 0;
	z-index: 2147483000;
	overflow: hidden;
	isolation: isolate;
	contain: paint style;
	background: #05080F;
	color: #fff;
	direction: ltr;
	pointer-events: auto;
	cursor: default;
	user-select: none;
	-webkit-user-select: none;
	font-family: var(--ds-font-family, "Segoe UI", "Microsoft YaHei UI", "Microsoft YaHei", "PingFang SC", "Hiragino Sans GB", system-ui, sans-serif);
	-webkit-font-smoothing: antialiased;
	-moz-osx-font-smoothing: grayscale;
	text-rendering: geometricPrecision;
}
body[data-dsh-tianlight] [data-tl-splash] *,
body[data-dsh-tianlight] [data-tl-splash] *::before,
body[data-dsh-tianlight] [data-tl-splash] *::after {
	box-sizing: border-box;
}
body[data-dsh-tianlight] [data-tl-splash-sky] {
	position: absolute;
	inset: 0;
	opacity: 0;
	background:
		radial-gradient(ellipse 74% 64% at 50% 50%, rgba(63, 143, 224, 0.24) 0%, rgba(63, 143, 224, 0.075) 42%, rgba(5, 8, 15, 0) 73%),
		linear-gradient(180deg, rgba(5, 8, 15, 0) 24%, rgba(63, 143, 224, 0.055) 48%, rgba(5, 8, 15, 0) 76%);
	pointer-events: none;
}
body[data-dsh-tianlight] [data-tl-splash-dawn] {
	position: absolute;
	top: 47.6%;
	left: 50%;
	width: min(122vw, 2340px);
	height: min(76vh, 820px);
	opacity: 0;
	transform: translate3d(-50%, -50%, 0) scale(0.54, 0.18);
	transform-origin: 50% 50%;
	filter: blur(22px);
	background:
		radial-gradient(ellipse 45% 36% at 50% 50%, rgba(255, 214, 150, 0.2) 0%, rgba(127, 226, 255, 0.135) 19%, rgba(63, 143, 224, 0.11) 42%, rgba(63, 143, 224, 0.028) 62%, rgba(5, 8, 15, 0) 78%),
		linear-gradient(90deg, rgba(5, 8, 15, 0) 4%, rgba(63, 143, 224, 0.042) 28%, rgba(127, 226, 255, 0.06) 50%, rgba(63, 143, 224, 0.042) 72%, rgba(5, 8, 15, 0) 96%);
	pointer-events: none;
}
body[data-dsh-tianlight] [data-tl-splash-glow] {
	position: absolute;
	top: 44%;
	left: 0;
	right: 0;
	width: min(56vw, 1075px);
	height: 92px;
	margin: -46px auto 0;
	opacity: 0;
	transform: scaleX(0.2);
	transform-origin: 50% 50%;
	filter: blur(26px);
	background: radial-gradient(ellipse 50% 44% at 50% 50%, rgba(255, 214, 150, 0.34) 0%, rgba(127, 226, 255, 0.13) 34%, rgba(63, 143, 224, 0.05) 60%, rgba(5, 8, 15, 0) 80%);
	pointer-events: none;
}
body[data-dsh-tianlight] [data-tl-splash-line] {
	position: absolute;
	top: 44%;
	left: 0;
	right: 0;
	width: min(42vw, 806px);
	height: 1px;
	margin: 0 auto;
	transform: scaleX(0);
	transform-origin: 50% 50%;
	pointer-events: none;
}
body[data-dsh-tianlight] [data-tl-splash-line-core] {
	position: absolute;
	inset: 0;
	display: block;
	background: linear-gradient(90deg, rgba(255, 214, 150, 0) 0%, rgba(255, 214, 150, 0.22) 12%, rgba(255, 248, 231, 0.92) 50%, rgba(255, 214, 150, 0.22) 88%, rgba(255, 214, 150, 0) 100%);
	box-shadow:
		0 0 1px rgba(255, 255, 255, 0.9),
		0 0 12px rgba(255, 214, 150, 0.36),
		0 0 34px rgba(127, 226, 255, 0.16);
	transform-origin: 50% 50%;
}
body[data-dsh-tianlight] [data-tl-splash-center] {
	position: absolute;
	top: 54.3%;
	left: 50%;
	z-index: 2;
	display: flex;
	flex-direction: column;
	align-items: center;
	transform: translate3d(-50%, -50%, 0);
	text-align: center;
	pointer-events: none;
}
body[data-dsh-tianlight] [data-tl-splash-wordmark] {
	position: relative;
	display: inline-block;
	margin: 0;
	padding-left: 0.32em;
	font-size: clamp(76px, 6.56vw, 126px);
	font-weight: 300;
	line-height: 1;
	letter-spacing: 0.32em;
	color: #fff;
	white-space: nowrap;
	transform-origin: 50% 60%;
	opacity: 0;
}
body[data-dsh-tianlight] .tl-splash-word-base {
	display: inline-block;
}
body[data-dsh-tianlight] .tl-splash-char {
	display: inline-block;
	transform: translate3d(0, 0, 0);
}
body[data-dsh-tianlight] [data-tl-splash-small] {
	display: block;
	margin-top: clamp(23px, 1.56vw, 30px);
	padding-left: 0.4em;
	font-size: clamp(10px, 0.73vw, 14px);
	font-weight: 400;
	line-height: 1;
	letter-spacing: 0.4em;
	color: rgba(255, 255, 255, 0.64);
	text-transform: uppercase;
	white-space: nowrap;
	opacity: 0;
}
body[data-dsh-tianlight] .tl-splash-sheen {
	position: absolute;
	inset: 0;
	overflow: hidden;
	pointer-events: none;
	-webkit-mask-image: linear-gradient(90deg, transparent 0%, #000 30%, #000 70%, transparent 100%);
	mask-image: linear-gradient(90deg, transparent 0%, #000 30%, #000 70%, transparent 100%);
}
body[data-dsh-tianlight] [data-tl-splash-sheen-window] {
	position: absolute;
	top: 0;
	left: 0;
	display: block;
	width: 22%;
	height: 100%;
	overflow: hidden;
	clip-path: polygon(28% 0%, 100% 0%, 72% 100%, 0% 100%);
	transform: translate3d(-100%, 0, 0);
}
body[data-dsh-tianlight] [data-tl-splash-sheen-copy] {
	position: absolute;
	top: 0;
	left: 0;
	display: block;
	width: 454.5455%;
	height: 100%;
	padding-left: 0.32em;
	font: inherit;
	line-height: 1;
	letter-spacing: inherit;
	white-space: nowrap;
	color: transparent;
	background-image: linear-gradient(180deg, #ffffff 0%, #ecfdff 38%, #a9edff 72%, #7fe2ff 100%);
	-webkit-background-clip: text;
	background-clip: text;
	-webkit-text-fill-color: transparent;
	filter: drop-shadow(0 0 9px rgba(127, 226, 255, 0.22));
	transform: translate3d(22%, 0, 0);
}
body[data-dsh-tianlight] #root[data-tl-splash-blur] {
	will-change: filter, transform;
	transform-origin: 50% 50%;
}
body[data-dsh-tianlight] [data-tl-hub] .tl-hub-switch {
	display: inline-flex;
	align-items: center;
	gap: 9px;
	padding: 6px 12px 6px 7px;
	border-radius: 999px;
	background: var(--tl-accent-soft, rgba(255, 255, 255, 0.12));
	border: 0.5px solid var(--tl-line-strong, rgba(255, 255, 255, 0.3));
	color: var(--tl-ink);
	cursor: pointer;
	font: 600 12px/1.2 var(--ds-font-family, system-ui);
}
body[data-dsh-tianlight] [data-tl-hub] .tl-hub-switch-track {
	position: relative;
	display: inline-block;
	width: 34px;
	height: 20px;
	flex: 0 0 34px;
	border-radius: 999px;
	border: 0.5px solid rgba(255, 255, 255, 0.2);
	background: rgba(8, 18, 30, 0.28);
}
body[data-dsh-tianlight] [data-tl-hub] .tl-hub-switch-knob {
	position: absolute;
	top: 2px;
	left: 2px;
	width: 14px;
	height: 14px;
	border-radius: 50%;
	background: var(--tl-ink, #eaf3ff);
	transform: translate3d(0, 0, 0);
	transition: transform 180ms cubic-bezier(0.22, 1, 0.36, 1);
}
body[data-dsh-tianlight] [data-tl-hub] .tl-hub-switch[data-on="true"] .tl-hub-switch-track {
	border-color: var(--tl-accent, #7fb6ff);
	background: var(--tl-accent-soft, rgba(127, 182, 255, 0.16));
}
body[data-dsh-tianlight] [data-tl-hub] .tl-hub-switch[data-on="true"] .tl-hub-switch-knob {
	transform: translate3d(14px, 0, 0);
}
body[data-dsh-tianlight] [data-tl-hub] .tl-hub-switch[data-on="true"] .tl-hub-switch-label {
	color: var(--tl-accent, #7fb6ff);
}
body[data-dsh-tianlight] [data-tl-hub] .tl-hub-switch-label {
	min-width: 3em;
	text-align: left;
}
body[data-dsh-tianlight] [data-tl-hub] [data-tl-hub-splash-card] {
	border-color: var(--tl-line-strong, rgba(255, 255, 255, 0.28));
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
			tag.textContent = CSS + CSS_SHELL + CSS_GLASS + CSS_HUB + "\n" + tl5CssText();
			document.head.appendChild(tag);
			return () => {
				tag.remove();
			};
		}
		//#endregion
