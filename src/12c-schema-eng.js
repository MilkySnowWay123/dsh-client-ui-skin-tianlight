		//#region schema
		/* ================= E4：工程面板分区 =================
		 * 只注册一个分区（id "engineering"，order 700）。根节点沿用壁纸面板的
		 * <details class="tl-wall-group"> + groupSummary 视觉语言，内容全部只读或
		 * 走公共控制器（moduleController / settingsStore / subscribeTl5Metrics）。 */

		function tl5ModuleLabel(def) {
			const text = TL_T(def.labelKey);
			return text === def.labelKey && typeof def.fallback === "string" ? def.fallback : text;
		}

		function tl5ModuleDesc(def) {
			const text = TL_T(def.descKey);
			return text === def.descKey ? "" : text;
		}

		function EngineeringPanelSection() {
			// 语言变化时 useTl5I18n 会让本组件重渲染；mode/setLanguage 同时用于语言开关。
			const i18n = useTl5I18n();
			const t = i18n.t;
			const mode = i18n.mode;
			const setLanguage = i18n.setLanguage;
			const [status, setStatus] = React.useState(() => settingsStore.status());
			const [metrics, setMetrics] = React.useState(() => ({ ...TL5_METRICS }));
			const [modules, setModules] = React.useState(() => moduleController.list());
			const [busy, setBusy] = React.useState(false);
			const [recoverBusy, setRecoverBusy] = React.useState(false);
			/** 最近一次“恢复宿主导入前备份”的结果（transient：仅在本次面板挂载内显示）。 */
			const [recoverNote, setRecoverNote] = React.useState("");
			React.useEffect(() => settingsStore.subscribe((next) => setStatus(next)), []);
			React.useEffect(() => subscribeTl5Metrics((next) => setMetrics({ ...next })), []);
			React.useEffect(() => moduleController.subscribe(() => setModules(moduleController.list())), []);

			const schema = schemaRuntime.report();
			const summaryValue = status.host
				? (status.pending > 0 ? t("settings.pending") : t("settings.synced")) + " · v" + status.revision
				: t("settings.offline");

			const renderRows = (rows) => {
				const children = [];
				for (const row of rows) {
					children.push(React.createElement("span", { key: "k-" + row.label, className: "tl5-eng-key" }, row.label));
					children.push(
						React.createElement("span", { key: "v-" + row.label, className: "tl5-eng-value", "data-tone": row.tone, title: row.value }, row.value),
					);
				}
				return React.createElement("div", { className: "tl5-eng-grid" }, children);
			};

			const onForceSync = () => {
				if (busy) return;
				setBusy(true);
				settingsStore
					.forceSync()
					.then((ok) => {
						setBusy(false);
						setStatus(settingsStore.status());
						if (ok === false) note("settings:force-sync-failed", settingsStore.status().lastError);
					})
					.catch((error) => {
						setBusy(false);
						note("settings:force-sync", error);
					});
			};

			/** 恢复宿主导入前的本地备份（v0.5.2 数据安全）：写回本地并立即推宿主。 */
			const onRecover = () => {
				if (recoverBusy || busy) return;
				if (settingsStore.status().backup !== true) {
					setRecoverNote(t("settings.recoverEmpty"));
					return;
				}
				setRecoverBusy(true);
				setRecoverNote("");
				settingsStore
					.recoverBackup()
					.then((ok) => {
						setRecoverBusy(false);
						const next = settingsStore.status();
						setStatus(next);
						setRecoverNote(ok ? t("settings.recovered", { n: next.recovered }) : t("settings.recoverEmpty"));
					})
					.catch((error) => {
						setRecoverBusy(false);
						setRecoverNote(t("common.failed"));
						note("settings:recover", error);
					});
			};

			const toggleModule = (id) => {
				const def = moduleController.list().find((entry) => entry.id === id);
				if (def === undefined) return;
				moduleController.set(id, def.enabled === false);
				setModules(moduleController.list());
			};

			const effects = tl5IsPlainObject(metrics.effects) ? metrics.effects : { active: 0, fps: 0, budget: "auto" };
			const cacheTotal = Number(metrics.cacheHit) + Number(metrics.cacheMiss);
			const metricsFresh = Number(metrics.updatedAt) > 0;

			let instance = null;
			let runtimeModules = null;
			try {
				instance = globalThis.__dshTianlightInstance ?? null;
				if (instance !== null && typeof instance.modules === "function") runtimeModules = instance.modules();
			} catch {
				instance = null;
				runtimeModules = null;
			}
			let runtimeModuleCount = t("settings.none");
			if (runtimeModules !== null && Array.isArray(runtimeModules.active) && Array.isArray(runtimeModules.definitions)) {
				runtimeModuleCount = runtimeModules.active.length + " / " + runtimeModules.definitions.length;
			}

			const languageButton = (id, label) =>
				React.createElement(
					"button",
					{
						key: id,
						type: "button",
						className: "tl-font-option",
						"data-active": mode === id ? "" : undefined,
						"aria-pressed": mode === id ? "true" : "false",
						onClick: () => setLanguage(id),
					},
					label,
				);
			// 完整字面量 key（不做 "lang." + id 拼接），i18n 静态自检才能看见它们。
			const languageRow = [
				languageButton("auto", t("lang.auto")),
				languageButton("zh", t("lang.zh")),
				languageButton("en", t("lang.en")),
			];

			const moduleRows = modules.map((def) =>
				React.createElement(
					"div",
					{ key: def.id, className: "tl5-eng-module" },
					React.createElement("span", { className: "tl5-eng-module-label", title: tl5ModuleDesc(def) }, tl5ModuleLabel(def)),
					def.switchable === false
						? React.createElement(
								"button",
								{ type: "button", className: "tl-font-option", disabled: true, "data-tl-disabled": "" },
								t("settings.resident"),
							)
						: React.createElement(
								"button",
								{
									type: "button",
									className: "tl-font-option",
									"data-active": def.enabled ? "" : undefined,
									"aria-pressed": def.enabled ? "true" : "false",
									onClick: () => toggleModule(def.id),
								},
								def.enabled ? t("common.on") : t("common.off"),
							),
				),
			);

			const migrationValue = schema.migrated.length > 0 ? schema.migrated.join(", ") : t("settings.nothing");
			const failedValue = schema.failed.length > 0 ? schema.failed.join(", ") : t("settings.none");

			return React.createElement(
				"details",
				{ className: "tl-wall-group", "data-tl-group": "engineering", open: false },
				React.createElement(
					"summary",
					{ className: "tl-wall-group-summary" },
					React.createElement("span", { className: "tl-wall-step" }, "⑦"),
					React.createElement("span", { className: "tl-wall-group-title" }, t("section.engineering")),
					React.createElement("span", { className: "tl-wall-summary-value", title: t("section.engineeringHint") }, summaryValue),
				),
				React.createElement(
					"div",
					{ className: "tl5-eng" },
					// ---- 语言 ----
					React.createElement(
						"div",
						{ className: "tl5-eng-block" },
						React.createElement("p", { className: "tl5-eng-label" }, t("lang.title")),
						React.createElement("div", { className: "tl-font-options" }, languageRow),
						React.createElement("p", { className: "tl-wall-hint" }, t("lang.hint")),
					),
					// ---- 宿主设置同步 ----
					React.createElement(
						"div",
						{ className: "tl5-eng-block" },
						React.createElement("p", { className: "tl5-eng-label" }, t("settings.title")),
						renderRows([
							{
								label: t("settings.host"),
								value: status.host ? t("settings.available") : t("settings.unavailable"),
								tone: status.host ? undefined : "warn",
							},
							{ label: t("settings.revision"), value: "v" + status.revision },
							{ label: t("settings.pending"), value: String(status.pending) },
							{ label: t("settings.backup"), value: status.backup ? t("settings.available") : t("settings.none") },
							{ label: t("settings.lastError"), value: status.lastError === "" ? t("settings.none") : status.lastError, tone: status.lastError === "" ? undefined : "alert" },
						]),
						React.createElement(
							"div",
							{ className: "tl-wall-tabs" },
							React.createElement(
								"button",
								{
									type: "button",
									className: "tl-font-option",
									disabled: busy || recoverBusy,
									onClick: onForceSync,
									"data-tone": status.lastError === "" ? undefined : "warn",
								},
								busy ? t("settings.syncing") : t("settings.force"),
							),
							// v0.5.2 数据安全：宿主快照是子集时本地键不删；若导入确实改过值，
							// 这里可以一键恢复“导入前”的本地设置。
							React.createElement(
								"button",
								{
									type: "button",
									className: "tl-font-option",
									disabled: busy || recoverBusy || status.backup !== true,
									"data-tone": status.backup ? "warn" : undefined,
									onClick: onRecover,
								},
								recoverBusy ? t("settings.syncing") : t("settings.recoverBackup"),
							),
						),
						React.createElement(
							"p",
							{ className: "tl-wall-hint" },
							recoverNote !== "" ? recoverNote : status.host ? t("settings.synced") : t("settings.offline") + " " + t("settings.syncHint"),
						),
					),
					// ---- schema 迁移 ----
					React.createElement(
						"div",
						{ className: "tl5-eng-block" },
						React.createElement("p", { className: "tl5-eng-label" }, t("settings.migrateTitle")),
						renderRows([
							{
								label: t("settings.schemaVersion"),
								value: t("settings.schemaFromTo", { from: schema.from, to: schema.to }),
							},
							{ label: t("settings.migrated"), value: migrationValue },
							{ label: t("common.failed"), value: failedValue, tone: schema.failed.length > 0 ? "alert" : undefined },
						]),
						React.createElement("p", { className: "tl-wall-hint" }, t("settings.migrateHint")),
					),
					// ---- 模块开关 ----
					React.createElement(
						"div",
						{ className: "tl5-eng-block" },
						React.createElement("p", { className: "tl5-eng-label" }, t("settings.modules")),
						React.createElement("div", { className: "tl5-eng-modules" }, moduleRows),
						React.createElement("p", { className: "tl-wall-hint" }, t("settings.modulesHint")),
					),
					// ---- 渲染预算（只读） ----
					React.createElement(
						"div",
						{ className: "tl5-eng-block" },
						React.createElement("p", { className: "tl5-eng-label" }, t("settings.budget")),
						renderRows([
							{ label: t("settings.fps"), value: metricsFresh ? Math.round(Number(metrics.fps) || 0) + " fps" : t("settings.none") },
							{ label: t("settings.jitter"), value: metricsFresh ? Math.round(Number(metrics.jitter) || 0) + " ms" : t("settings.none") },
							{ label: t("settings.tier"), value: String(metrics.tier ?? "auto") },
							{
								label: t("settings.lowPower"),
								value: metrics.lowPower
									? t("common.on") + (typeof metrics.lowPowerReason === "string" && metrics.lowPowerReason !== "" ? " · " + metrics.lowPowerReason : "")
									: t("common.off"),
								tone: metrics.lowPower ? "warn" : undefined,
							},
							{ label: t("settings.cache"), value: Number(metrics.cacheHit) + " / " + Number(metrics.cacheMiss) },
							{ label: t("settings.cacheRate"), value: cacheTotal > 0 ? Math.round((Number(metrics.cacheHit) / cacheTotal) * 100) + "%" : t("settings.none") },
							{
								label: t("settings.effectsLayer"),
								value: Number(effects.active) + " · " + Math.round(Number(effects.fps) || 0) + " fps · " + String(effects.budget ?? "auto"),
							},
							{ label: t("settings.updated"), value: metricsFresh ? new Date(Number(metrics.updatedAt)).toLocaleTimeString() : t("settings.none") },
						]),
						React.createElement("p", { className: "tl-wall-hint" }, t("settings.budgetHint")),
					),
					// ---- 诊断 ----
					React.createElement(
						"div",
						{ className: "tl5-eng-block" },
						React.createElement("p", { className: "tl5-eng-label" }, t("settings.diag")),
						renderRows([
							{ label: t("settings.capabilityHost"), value: status.host ? t("settings.available") : t("settings.unavailable") },
							{ label: t("settings.capabilityRuntime"), value: instance === null ? t("settings.unavailable") : t("settings.available") },
							{ label: t("settings.activeModules"), value: runtimeModuleCount },
							{ label: t("settings.revision"), value: "v" + status.revision },
							{ label: t("settings.lastError"), value: status.lastError === "" ? t("settings.none") : status.lastError, tone: status.lastError === "" ? undefined : "alert" },
						]),
						React.createElement("p", { className: "tl-wall-hint" }, t("settings.diagHint")),
					),
				),
			);
		}

		// 唯一的分区注册：order 700 排在壁纸面板 ①–⑥ 之后（其他功能分区 800+）。
		registerTl5PanelSection({ id: "engineering", order: 700, title: "section.engineering", Component: EngineeringPanelSection });

		/** 工程分区样式（tl5-eng-*）。全部作用域在 body[data-dsh-tianlight] 下。 */
		registerTl5Css(String.raw`
	body[data-dsh-tianlight] .tl5-eng {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	body[data-dsh-tianlight] .tl5-eng-block {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	body[data-dsh-tianlight] .tl5-eng-label {
		margin: 0;
		font-size: 10px;
		font-weight: 600;
		letter-spacing: 0.06em;
		color: var(--tl-ink-faint);
	}
	body[data-dsh-tianlight] .tl5-eng-grid {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 2px 10px;
		font-size: 11px;
	}
	body[data-dsh-tianlight] .tl5-eng-key {
		color: var(--tl-ink-soft);
		white-space: nowrap;
	}
	body[data-dsh-tianlight] .tl5-eng-value {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		text-align: right;
		color: var(--tl-ink);
		font-variant-numeric: tabular-nums;
	}
	body[data-dsh-tianlight] .tl5-eng-value[data-tone="warn"] {
		color: color-mix(in srgb, #e8b45a 82%, var(--tl-ink));
	}
	body[data-dsh-tianlight] .tl5-eng-value[data-tone="alert"] {
		color: color-mix(in srgb, #e8776b 82%, var(--tl-ink));
	}
	body[data-dsh-tianlight] .tl5-eng-modules {
		display: flex;
		flex-direction: column;
		gap: 3px;
	}
	body[data-dsh-tianlight] .tl5-eng-module {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 12px;
		color: var(--tl-ink);
	}
	body[data-dsh-tianlight] .tl5-eng-module-label {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		color: var(--tl-ink-soft);
	}
	body[data-dsh-tianlight] .tl5-eng-module > button {
		flex: none;
		min-width: 44px;
		padding: 2px 10px;
		font-size: 11px;
	}
`);
		//#endregion
