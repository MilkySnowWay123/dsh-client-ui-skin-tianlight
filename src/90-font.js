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
		/** v0.5.0 正文衬线预设：只作用于消息正文，不碰界面骨架。 */
		const READING_FAMILIES = [
			{ id: "system", label: "系统", stack: "" },
			{ id: "serif", label: "衬线", stack: 'Georgia, "Songti SC", "Noto Serif SC", "Songti TC", serif' },
		];
		/**
		 * v0.5.0 模型：旧字段（size/ui/code/weight/lead/track）原样保留，新增
		 * width/para/codeSize/serif。旧存档只有前六个字段，读取时缺省补默认值，
		 * 因此 v0.4 的 `tianlight.font.family` 可以无缝升级。
		 */
		const TYPO_DEFAULTS = {
			size: 14,
			ui: "system",
			code: "system",
			weight: "normal",
			lead: "normal",
			track: "normal",
			width: 860,
			para: 0.5,
			codeSize: 13,
			serif: "system",
		};
		const TYPO_WIDTH_MIN = 640;
		const TYPO_WIDTH_MAX = 1400;
		const TYPO_PARA_MIN = 0;
		const TYPO_PARA_MAX = 1.5;
		const TYPO_CODE_SIZE_MIN = 11;
		const TYPO_CODE_SIZE_MAX = 18;

		registerTl5Strings({
			zh: {
				"typo.title": "字体",
				"typo.subtitle": "{size}px · 界面 {ui} · 代码 {code}",
				"typo.close": "关闭字体面板",
				"typo.trigger": "字体设置（Alt+T）",
				"typo.preview": "夜色温柔 · Aa 0123",
				"typo.previewNote": "字重 {weight} · 行距 {lead} · 字距 {track}",
				"typo.section.size": "字号",
				"typo.section.family": "字族",
				"typo.section.typeset": "排版",
				"typo.section.content": "内容排版",
				"typo.section.readability": "可读性",
				"typo.uiSize": "界面字号",
				"typo.uiFamily": "界面",
				"typo.codeFamily": "代码",
				"typo.weight": "字重",
				"typo.lead": "行距",
				"typo.track": "字距",
				"typo.width": "内容宽度",
				"typo.para": "段落间距",
				"typo.codeSize": "代码字号",
				"typo.reading": "正文衬线",
				"typo.reset": "恢复默认",
				"typo.slider.size": "字号",
				"typo.slider.width": "内容宽度",
				"typo.slider.para": "段落间距",
				"typo.slider.codeSize": "代码字号",
				"typo.family.system": "系统",
				"typo.family.serif": "衬线",
				"typo.family.round": "圆体",
				"typo.family.mono": "等宽",
				"typo.codeFamily.system": "默认",
				"typo.codeFamily.mono": "Mono",
				"typo.codeFamily.consolas": "Consolas",
				"typo.weight.normal": "常规",
				"typo.weight.medium": "中等",
				"typo.weight.bold": "加粗",
				"typo.lead.tight": "紧凑",
				"typo.lead.normal": "标准",
				"typo.lead.loose": "宽松",
				"typo.track.tight": "紧凑",
				"typo.track.normal": "标准",
				"typo.track.loose": "宽松",
				"typo.reading.system": "系统",
				"typo.reading.serif": "衬线",
			},
			en: {
				"typo.title": "Typography",
				"typo.subtitle": "{size}px · UI {ui} · Code {code}",
				"typo.close": "Close typography panel",
				"typo.trigger": "Typography settings (Alt+T)",
				"typo.preview": "Night light · Aa 0123",
				"typo.previewNote": "Weight {weight} · Leading {lead} · Tracking {track}",
				"typo.section.size": "Size",
				"typo.section.family": "Family",
				"typo.section.typeset": "Typesetting",
				"typo.section.content": "Content layout",
				"typo.section.readability": "Readability",
				"typo.uiSize": "UI size",
				"typo.uiFamily": "UI",
				"typo.codeFamily": "Code",
				"typo.weight": "Weight",
				"typo.lead": "Leading",
				"typo.track": "Tracking",
				"typo.width": "Content width",
				"typo.para": "Paragraph gap",
				"typo.codeSize": "Code size",
				"typo.reading": "Reading serif",
				"typo.reset": "Reset",
				"typo.slider.size": "Font size",
				"typo.slider.width": "Content width",
				"typo.slider.para": "Paragraph spacing",
				"typo.slider.codeSize": "Code font size",
				"typo.family.system": "System",
				"typo.family.serif": "Serif",
				"typo.family.round": "Rounded",
				"typo.family.mono": "Monospace",
				"typo.codeFamily.system": "Default",
				"typo.codeFamily.mono": "Mono",
				"typo.codeFamily.consolas": "Consolas",
				"typo.weight.normal": "Regular",
				"typo.weight.medium": "Medium",
				"typo.weight.bold": "Semibold",
				"typo.lead.tight": "Tight",
				"typo.lead.normal": "Normal",
				"typo.lead.loose": "Loose",
				"typo.track.tight": "Tight",
				"typo.track.normal": "Normal",
				"typo.track.loose": "Loose",
				"typo.reading.system": "System",
				"typo.reading.serif": "Serif",
			},
		});

		/**
		 * D4 内容排版样式：只作用于桥接盖章的消息气泡与其 pre/code，
		 * 不改变界面骨架。变量由 applyTypography 写在 body 上，
		 * 未设置时回落到这里的默认值。
		 */
		registerTl5Css(String.raw`
body[data-dsh-tianlight] {
	--tl-content-width: 860px;
	--tl-para-gap: 0.5em;
	--tl-code-size: 13px;
	--tl-reading-family: inherit;
}
body[data-dsh-tianlight] [data-tl-bubble] {
	max-width: var(--tl-content-width);
	font-family: var(--tl-reading-family);
}
body[data-dsh-tianlight] [data-tl-bubble] p,
body[data-dsh-tianlight] [data-tl-bubble] ul,
body[data-dsh-tianlight] [data-tl-bubble] ol,
body[data-dsh-tianlight] [data-tl-bubble] blockquote,
body[data-dsh-tianlight] [data-tl-bubble] pre {
	margin-block: calc(var(--tl-para-gap) * 0.5);
}
body[data-dsh-tianlight] [data-tl-bubble] pre,
body[data-dsh-tianlight] [data-tl-bubble] code {
	font-size: var(--tl-code-size);
}
`);

		function clampTypographyNumber(value, min, max) {
			if (!Number.isFinite(value)) return null;
			return Math.min(max, Math.max(min, value));
		}

		/**
		 * 归一化一个（可能来自旧存档或配方的）排版模型。未知字段忽略，
		 * 缺失字段补默认值，数值全部夹到面板滑杆范围内，保证 UI 与 CSS 一致。
		 */
		function normalizeTypography(model) {
			const source = model !== null && typeof model === "object" ? model : {};
			const next = { ...TYPO_DEFAULTS };
			const size = clampTypographyNumber(source.size, 12, 22);
			if (size !== null) next.size = Math.round(size);
			if (FONT_FAMILIES.some((item) => item.id === source.ui)) next.ui = source.ui;
			if (CODE_FAMILIES.some((item) => item.id === source.code)) next.code = source.code;
			if (WEIGHTS.some((item) => item.id === source.weight)) next.weight = source.weight;
			if (LEADS.some((item) => item.id === source.lead)) next.lead = source.lead;
			if (TRACKS.some((item) => item.id === source.track)) next.track = source.track;
			const width = clampTypographyNumber(source.width, TYPO_WIDTH_MIN, TYPO_WIDTH_MAX);
			if (width !== null) next.width = Math.round(width);
			const para = clampTypographyNumber(source.para, TYPO_PARA_MIN, TYPO_PARA_MAX);
			if (para !== null) next.para = Math.round(para * 10) / 10;
			const codeSize = clampTypographyNumber(source.codeSize, TYPO_CODE_SIZE_MIN, TYPO_CODE_SIZE_MAX);
			if (codeSize !== null) next.codeSize = Math.round(codeSize);
			if (READING_FAMILIES.some((item) => item.id === source.serif)) next.serif = source.serif;
			return next;
		}

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
			return normalizeTypography(saved);
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
				body.style.removeProperty("--tl-content-width");
				body.style.removeProperty("--tl-para-gap");
				body.style.removeProperty("--tl-code-size");
				body.style.removeProperty("--tl-reading-family");
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
		 * them. The v0.5.0 content fields (width/para/codeSize/reading serif) are CSS
		 * variables consumed only under [data-tl-bubble], so the app skeleton keeps the
		 * product layout. `theme` is optional so a missing service still leaves families
		 * working. Signature kept compatible with v0.4.0 callers.
		 */
		function applyTypography(theme, model, persist) {
			const next = normalizeTypography(model);
			const ui = FONT_FAMILIES.find((item) => item.id === next.ui) ?? FONT_FAMILIES[0];
			const code = CODE_FAMILIES.find((item) => item.id === next.code) ?? CODE_FAMILIES[0];
			const reading = READING_FAMILIES.find((item) => item.id === next.serif) ?? READING_FAMILIES[0];
			const body = document.body;
			if (body !== null) {
				if (ui.stack === "") body.style.removeProperty("--dsw-font-family");
				else body.style.setProperty("--dsw-font-family", ui.stack);
				if (code.stack === "") body.style.removeProperty("--ds-font-family-code");
				else body.style.setProperty("--ds-font-family-code", code.stack);
				body.style.setProperty("--tl-content-width", next.width + "px");
				body.style.setProperty("--tl-para-gap", next.para + "em");
				body.style.setProperty("--tl-code-size", next.codeSize + "px");
				if (reading.stack === "") body.style.removeProperty("--tl-reading-family");
				else body.style.setProperty("--tl-reading-family", reading.stack);
			}
			const root = document.getElementById("root");
			if (root !== null) {
				root.style.fontWeight = (WEIGHTS.find((item) => item.id === next.weight) ?? WEIGHTS[0]).value;
				root.style.lineHeight = (LEADS.find((item) => item.id === next.lead) ?? LEADS[0]).value;
				root.style.letterSpacing = (TRACKS.find((item) => item.id === next.track) ?? TRACKS[0]).value;
			}
			if (theme !== undefined && typeof theme.setFontSize === "function") {
				try {
					theme.setFontSize(next.size);
				} catch {
					// the host may clamp or refuse; the stored value stays authoritative
				}
			}
			if (persist !== false) {
				try {
					globalThis.localStorage.setItem(FONT_STORAGE, JSON.stringify(next));
				} catch {
					// a failed write must never break the panel
				}
			}
			return next;
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
				const { t } = useTl5I18n();
				const [model, setModel] = React.useState(() => readTypography());
				const [legibility, setLegibility] = React.useState(() => legibilityController.snapshot());
				React.useEffect(() => legibilityController.subscribe(setLegibility), []);
				const tr = (key, fallback) => {
					const value = t(key);
					return value === key ? fallback : value;
				};
				const update = (patch) => {
					setModel((current) => {
						const next = { ...current, ...patch };
						applyTypography(theme, next, true);
						return next;
					});
				};
				const updateLegibility = (patch) => {
					legibilityController.apply(patch);
					setLegibility(legibilityController.snapshot());
				};
				const labelOf = (list, item, prefix) => (item === undefined ? "" : tr(prefix + "." + item.id, item.label));
				const optionLabel = (list, id, prefix) =>
					labelOf(list, list.find((item) => item.id === id) ?? list[0], prefix);
				const pills = (list, activeId, onPick, prefix) =>
					list.map((item) =>
						React.createElement(
							"button",
							{
								key: item.id,
								type: "button",
								className: "tl-font-option",
								"data-active": item.id === activeId ? "" : undefined,
								"aria-pressed": item.id === activeId ? "true" : "false",
								onClick: () => onPick(item.id),
							},
							labelOf(list, item, prefix),
						),
					);
				const row = (label, content) =>
					React.createElement(
						"div",
						{ className: "tl-font-row" },
						React.createElement("span", { className: "tl-font-label" }, label),
						content,
					);
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
				const sliderStyle = (value, min, max) => {
					const percent = Math.round(((value - min) / (max - min)) * 100);
					return {
						background:
							"linear-gradient(90deg, var(--tl-accent) 0%, color-mix(in srgb, var(--tl-accent) 45%, #ffffff) " +
							percent +
							"%, rgba(255, 255, 255, 0.16) " +
							percent +
							"%, rgba(255, 255, 255, 0.16) 100%)",
					};
				};
				const slider = (attributes) =>
					React.createElement(
						"div",
						{ className: "tl-font-slider" },
						React.createElement("input", {
							type: "range",
							min: attributes.min,
							max: attributes.max,
							step: attributes.step,
							value: attributes.value,
							className: "tl-font-range",
							"data-tl-field": attributes.field,
							"aria-label": attributes.label,
							style: sliderStyle(attributes.value, attributes.min, attributes.max),
							onChange: attributes.onChange,
						}),
						React.createElement("span", { className: "tl-font-value" }, attributes.valueText),
					);
				const legibilityStatus =
					legibility.sampled !== true
						? t("legibility.statusIdle")
						: legibility.boosted === true
							? t("legibility.statusBoosted", { ratio: legibility.ratio, threshold: legibility.threshold })
							: t("legibility.status", { ratio: legibility.ratio, threshold: legibility.threshold });
				const legibilityProgress = Math.round(
					((legibility.threshold - LEGIBILITY_THRESHOLD_MIN) / (LEGIBILITY_THRESHOLD_MAX - LEGIBILITY_THRESHOLD_MIN)) *
						100,
				);
				return React.createElement(
					"div",
					{ className: "tl-font-panel" },
					React.createElement(
						"div",
						{ className: "tl-font-head", "data-tl-font-drag": "" },
						React.createElement(
							"div",
							{ className: "tl-font-heading" },
							React.createElement("div", { className: "tl-font-title" }, t("typo.title")),
							React.createElement(
								"div",
								{ className: "tl-font-subtitle" },
								t("typo.subtitle", {
									size: model.size,
									ui: optionLabel(FONT_FAMILIES, model.ui, "typo.family"),
									code: optionLabel(CODE_FAMILIES, model.code, "typo.codeFamily"),
								}),
							),
						),
						React.createElement(
							"button",
							{
								type: "button",
								className: "tl-font-close",
								"data-tl-font-close": "",
								"aria-label": t("typo.close"),
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
						React.createElement("div", { className: "tl-font-preview-line" }, t("typo.preview")),
						React.createElement(
							"div",
							{ className: "tl-font-preview-note" },
							t("typo.previewNote", {
								weight: optionLabel(WEIGHTS, model.weight, "typo.weight"),
								lead: optionLabel(LEADS, model.lead, "typo.lead"),
								track: optionLabel(TRACKS, model.track, "typo.track"),
							}),
						),
					),
					section(
						t("typo.section.size"),
						row(
							t("typo.uiSize"),
							slider({
								field: "size",
								min: 12,
								max: 22,
								step: 1,
								value: model.size,
								label: t("typo.slider.size"),
								valueText: model.size + " px",
								onChange: (event) => update({ size: Number(event.target.value) }),
							}),
						),
					),
					section(
						t("typo.section.family"),
						row(
							t("typo.uiFamily"),
							React.createElement(
								"div",
								{ className: "tl-font-options", "data-tl-typo-ui": "" },
								pills(FONT_FAMILIES, model.ui, (id) => update({ ui: id }), "typo.family"),
							),
						),
						row(
							t("typo.codeFamily"),
							React.createElement(
								"div",
								{ className: "tl-font-options", "data-tl-typo-code": "" },
								pills(CODE_FAMILIES, model.code, (id) => update({ code: id }), "typo.codeFamily"),
							),
						),
					),
					section(
						t("typo.section.typeset"),
						row(
							t("typo.weight"),
							React.createElement(
								"div",
								{ className: "tl-font-options", "data-tl-typo-weight": "" },
								pills(WEIGHTS, model.weight, (id) => update({ weight: id }), "typo.weight"),
							),
						),
						row(
							t("typo.lead"),
							React.createElement(
								"div",
								{ className: "tl-font-options", "data-tl-typo-lead": "" },
								pills(LEADS, model.lead, (id) => update({ lead: id }), "typo.lead"),
							),
						),
						row(
							t("typo.track"),
							React.createElement(
								"div",
								{ className: "tl-font-options", "data-tl-typo-track": "" },
								pills(TRACKS, model.track, (id) => update({ track: id }), "typo.track"),
							),
						),
					),
					// ---- v0.5.0 content-only typography (messages & code) ----
					section(
						t("typo.section.content"),
						row(
							t("typo.width"),
							slider({
								field: "width",
								min: TYPO_WIDTH_MIN,
								max: TYPO_WIDTH_MAX,
								step: 20,
								value: model.width,
								label: t("typo.slider.width"),
								valueText: model.width + " px",
								onChange: (event) => update({ width: Number(event.target.value) }),
							}),
						),
						row(
							t("typo.para"),
							slider({
								field: "para",
								min: TYPO_PARA_MIN,
								max: TYPO_PARA_MAX,
								step: 0.1,
								value: model.para,
								label: t("typo.slider.para"),
								valueText: model.para + " em",
								onChange: (event) => update({ para: Number(event.target.value) }),
							}),
						),
						row(
							t("typo.codeSize"),
							slider({
								field: "codeSize",
								min: TYPO_CODE_SIZE_MIN,
								max: TYPO_CODE_SIZE_MAX,
								step: 1,
								value: model.codeSize,
								label: t("typo.slider.codeSize"),
								valueText: model.codeSize + " px",
								onChange: (event) => update({ codeSize: Number(event.target.value) }),
							}),
						),
						row(
							t("typo.reading"),
							React.createElement(
								"div",
								{ className: "tl-font-options", "data-tl-typo-serif": "" },
								pills(READING_FAMILIES, model.serif, (id) => update({ serif: id }), "typo.reading"),
							),
						),
					),
					// ---- v0.5.0 readability guard settings (D5) ----
					section(
						t("legibility.title"),
						row(
							t("legibility.guard"),
							React.createElement(
								"div",
								{ className: "tl-font-options", "data-tl-legibility-toggle": "" },
								React.createElement(
									"button",
									{
										type: "button",
										className: "tl-font-option",
										"data-active": legibility.enabled === true ? "" : undefined,
										"aria-pressed": legibility.enabled === true ? "true" : "false",
										onClick: () => updateLegibility({ enabled: true }),
									},
									t("common.on"),
								),
								React.createElement(
									"button",
									{
										type: "button",
										className: "tl-font-option",
										"data-active": legibility.enabled === true ? undefined : "",
										"aria-pressed": legibility.enabled === true ? "false" : "true",
										onClick: () => updateLegibility({ enabled: false }),
									},
									t("common.off"),
								),
							),
						),
						row(
							t("legibility.threshold"),
							slider({
								field: "legibility-threshold",
								min: LEGIBILITY_THRESHOLD_MIN,
								max: LEGIBILITY_THRESHOLD_MAX,
								step: 0.5,
								value: legibility.threshold,
								label: t("legibility.threshold"),
								valueText: legibility.threshold + ":1",
								onChange: (event) => updateLegibility({ threshold: Number(event.target.value) }),
							}),
						),
						React.createElement("p", { className: "tl-wall-hint", "data-tl-legibility-status": "" }, legibilityStatus),
						React.createElement("p", { className: "tl-wall-hint" }, t("legibility.hint")),
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
						t("typo.reset"),
					),
				);
			};

			const FontButton = () => {
				const { t } = useTl5I18n();
				return React.createElement(
					"button",
					{
						type: "button",
						className: "tl-font-trigger",
						title: t("typo.trigger"),
						"aria-label": t("typo.trigger"),
						"aria-keyshortcuts": "Alt+T",
						"aria-haspopup": "dialog",
						onClick: () => {
							toggleOverlay();
						},
					},
					"Aa",
				);
			};

			// Self-owned host, docked to the right edge and rendered with the same
			// component. The right-sidebar tab path depends on internal controller
			// contracts whose shape is not guaranteed across builds, and a settings
			// panel that silently opens nothing is worse than one the skin docks itself.
			let overlayRoot = null;
			// R5: non-modal layer — it receives Esc only while it is the top layer and
			// never gets a Tab trap (the DSH composer keeps its Tab order).
			let overlayDisposer = null;
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
			// ---- wallpaper-adaptive palette (shared sampler, S4) ----
			// The region that samples the wallpaper lives in 11-platform so the panel tint
			// and this panel cannot drift apart again; only the output formulas differ.
			let chromaTimer = 0;
			const adoptWallpaperPalette = () => {
				const palette = tl5SampleWallpaperPalette();
				if (palette === null) return;
				const darkMode = document.body !== null && document.body.hasAttribute(DARK_ATTR);
				const accentLight = darkMode ? 0.66 : 0.44;
				const fillLight = darkMode ? Math.min(0.20, 0.10 + palette.light * 0.10) : Math.max(0.90, 0.94 + palette.light * 0.04);
				host.style.setProperty("--tl-accent", "hsl(" + palette.hue + " " + Math.round(palette.sat * 100) + "% " + Math.round(accentLight * 100) + "%)");
				host.style.setProperty(
					"--tl-accent-soft",
					"hsl(" + palette.hue + " " + Math.round(palette.sat * 100) + "% " + Math.round(accentLight * 100) + "% / 0.18)",
				);
				host.style.setProperty(
					"--tl-line-strong",
					"hsl(" + palette.hue + " " + Math.round(Math.min(0.5, palette.sat) * 100) + "% " + Math.round((darkMode ? 0.62 : 0.42) * 100) + "% / 0.40)",
				);
				host.style.setProperty(
					"--tl-panel-fill",
					"hsl(" + palette.hue + " " + Math.round(Math.min(0.42, palette.sat * 0.55) * 100) + "% " + Math.round(fillLight * 100) + "% / calc(0.88 * var(--tl-glass-m, 1)))",
				);
			};
			const startChroma = () => {
				if (chromaTimer !== 0) return;
				adoptWallpaperPalette();
				// One delayed retry covers a video that has not decoded a frame yet at open
				// time. No polling: re-sampling a playing 4K video every 4s cost a visible
				// periodic hitch (the wallpaper panel was fixed the same way in v0.5.2); the
				// font panel keeps the palette it adopted, exactly like the wallpaper panel.
				chromaTimer = globalThis.setTimeout(() => {
					chromaTimer = 0;
					adoptWallpaperPalette();
				}, 1500);
			};
			const stopChroma = () => {
				if (chromaTimer === 0) return;
				globalThis.clearTimeout(chromaTimer);
				chromaTimer = 0;
			};

			const toggleOverlay = () => {
				// R8b (REV-R5 F1): never open this non-modal float beneath a higher modal.
				if (
					host.hidden === true &&
					typeof tl5OverlayOpenAllowed === "function" &&
					tl5OverlayOpenAllowed("font-panel") === false
				) {
					return;
				}
				host.hidden = !host.hidden;
				if (host.hidden) {
					// Closing mid-drag would leave the drag armed: the pointerup lands on a
					// hidden element, so the next reopen would follow the cursor without a
					// fresh grab.
					drag = null;
					host.removeAttribute("data-tl-dragging");
					stopChroma();
					if (overlayDisposer !== null) {
						try {
							overlayDisposer();
						} catch {
							// the stack is already torn down
						}
						overlayDisposer = null;
					}
					return;
				}
				startChroma();
				clampFontHost();
				if (overlayDisposer === null) {
					overlayDisposer = tl5OverlayRegister({
						id: "font-panel",
						modal: false,
						root: () => host,
						onEscape: () => toggleOverlay(),
					});
				}
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
				if (overlayDisposer !== null) {
					try {
						overlayDisposer();
					} catch {
						// the stack is already torn down
					}
					overlayDisposer = null;
				}
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
