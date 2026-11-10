		//#region accessibility
		/**
		 * D6 键盘与无障碍（type-i18n 工作流）：
		 *
		 *   - 壁纸面板 / 排版面板打开时：给宿主加 role="dialog" + aria-modal +
		 *     aria-label，Tab / Shift+Tab 在面板内循环，焦点进入第一个控件；
		 *     关闭时移除语义并把焦点还给触发按钮（Alt+W 行为仍由 70-sidebar
		 *     自己处理，本片段不重复）；
		 *   - 直播区 [data-tl-a11y-live] 播报面板开关与分区展开/收起；
		 *   - 全局快捷键集中在 TL5_SHORTCUTS 注册表；这里只新增 Alt+T
		 *     （打开/关闭排版面板），帮助分区（id "a11y"，order 860）列出全部
		 *     快捷键与焦点行为；
		 *   - 只补属性，不改产品自身 DOM 语义；所有监听器在 disposer 里成对移除。
		 */
		registerTl5Strings({
			zh: {
				"a11y.title": "键盘与无障碍",
				"a11y.summaryValue": "快捷键",
				"a11y.altWDesc": "打开 / 关闭壁纸面板",
				"a11y.altTDesc": "打开 / 关闭排版面板",
				"a11y.escDesc": "关闭当前面板",
				"a11y.tabDesc": "在当前面板内循环焦点",
				"a11y.trapNote": "面板打开时焦点被限制在面板内（Tab / Shift+Tab 循环）；Esc 关闭后焦点回到触发按钮。",
				"a11y.liveNote": "面板打开 / 关闭与分区展开 / 收起会通过读屏实时播报。",
				"a11y.dialogWall": "壁纸面板",
				"a11y.dialogFont": "排版面板",
				"a11y.announceOpen": "{name}已打开",
				"a11y.announceClose": "{name}已关闭",
				"a11y.announceSectionOpen": "分区「{name}」已展开",
				"a11y.announceSectionClose": "分区「{name}」已收起",
				"a11y.altTUnavailable": "排版面板当前不可用",
			},
			en: {
				"a11y.title": "Keyboard & accessibility",
				"a11y.summaryValue": "Shortcuts",
				"a11y.altWDesc": "Open / close the wallpaper panel",
				"a11y.altTDesc": "Open / close the typography panel",
				"a11y.escDesc": "Close the current panel",
				"a11y.tabDesc": "Cycle focus inside the current panel",
				"a11y.trapNote": "While a panel is open, Tab / Shift+Tab cycle inside it; Esc closes it and returns focus to the trigger.",
				"a11y.liveNote": "Panel open/close and section expand/collapse are announced to screen readers.",
				"a11y.dialogWall": "Wallpaper panel",
				"a11y.dialogFont": "Typography panel",
				"a11y.announceOpen": "{name} opened",
				"a11y.announceClose": "{name} closed",
				"a11y.announceSectionOpen": "Section \"{name}\" expanded",
				"a11y.announceSectionClose": "Section \"{name}\" collapsed",
				"a11y.altTUnavailable": "The typography panel is not available right now",
			},
		});

		registerTl5Css(String.raw`
body[data-dsh-tianlight] [data-tl-a11y-live] {
	position: fixed;
	width: 1px;
	height: 1px;
	margin: -1px;
	padding: 0;
	overflow: hidden;
	clip: rect(0 0 0 0);
	clip-path: inset(50%);
	white-space: nowrap;
	border: 0;
}
body[data-dsh-tianlight] .tl5-a11y-body {
	display: flex;
	flex-direction: column;
	gap: 7px;
	padding: 2px 2px 4px;
}
body[data-dsh-tianlight] .tl5-a11y-row {
	display: flex;
	align-items: baseline;
	justify-content: space-between;
	gap: 10px;
}
body[data-dsh-tianlight] .tl5-a11y-kbd {
	flex: none;
	min-width: 92px;
	padding: 2px 8px;
	border-radius: 7px;
	border: 0.5px solid var(--tl-line-strong);
	background: var(--tl-glass-fill);
	color: var(--tl-ink);
	font-family: var(--ds-font-family-code, monospace);
	font-size: 11px;
	line-height: 1.5;
	text-align: center;
}
body[data-dsh-tianlight] .tl5-a11y-desc {
	font-size: 12px;
	line-height: 1.45;
	color: var(--tl-ink-soft);
	text-align: right;
}
body[data-dsh-tianlight] .tl5-a11y-note {
	margin: 2px 0 0;
	font-size: 11px;
	line-height: 1.55;
	color: var(--tl-ink-faint);
}
`);

		const TL5_SHORTCUTS = [];
		function normalizeTl5Shortcut(shortcut) {
			if (shortcut === null || typeof shortcut !== "object" || typeof shortcut.run !== "function") return null;
			const spec =
				typeof shortcut.keys === "string"
					? shortcut.keys
					: typeof shortcut.key === "string"
						? shortcut.key
						: "";
			const parts = spec.toLowerCase().split("+").map((part) => part.trim()).filter((part) => part !== "");
			const key = parts.length === 0 ? "" : parts[parts.length - 1];
			if (key === "") return null;
			return {
				id: typeof shortcut.id === "string" && shortcut.id !== "" ? shortcut.id : "shortcut-" + (TL5_SHORTCUTS.length + 1),
				keys: spec,
				key,
				alt: parts.indexOf("alt") >= 0,
				ctrl: parts.indexOf("ctrl") >= 0 || parts.indexOf("control") >= 0,
				meta: parts.indexOf("meta") >= 0 || parts.indexOf("cmd") >= 0,
				shift: parts.indexOf("shift") >= 0,
				labelKey: typeof shortcut.labelKey === "string" ? shortcut.labelKey : "",
				run: shortcut.run,
			};
		}
		function registerTl5Shortcut(shortcut) {
			const entry = normalizeTl5Shortcut(shortcut);
			if (entry === null) return () => {};
			TL5_SHORTCUTS.push(entry);
			return () => {
				const index = TL5_SHORTCUTS.indexOf(entry);
				if (index >= 0) TL5_SHORTCUTS.splice(index, 1);
			};
		}
		function tl5Shortcuts() {
			return TL5_SHORTCUTS.slice();
		}

		/** “键盘与无障碍”帮助分区（壁纸面板扩展区，order 860）。 */
		const A11yHelpSection = () => {
			const { t } = useTl5I18n();
			const rows = [
				{ keys: "Alt+W", desc: t("a11y.altWDesc") },
				{ keys: "Alt+T", desc: t("a11y.altTDesc") },
				{ keys: "Esc", desc: t("a11y.escDesc") },
				{ keys: "Tab / Shift+Tab", desc: t("a11y.tabDesc") },
			];
			for (const shortcut of tl5Shortcuts()) {
				if (shortcut.id === "font-panel" || shortcut.labelKey === "") continue;
				rows.push({ keys: shortcut.keys, desc: t(shortcut.labelKey) });
			}
			return React.createElement(
				"details",
				{ className: "tl-wall-group", open: false, "data-tl-group": "a11y", "data-tl-a11y-help": "" },
				React.createElement(
					"summary",
					{ className: "tl-wall-group-summary" },
					React.createElement("span", { className: "tl-wall-step" }, "\u2328"),
					React.createElement("span", { className: "tl-wall-group-title" }, t("a11y.title")),
					React.createElement("span", { className: "tl-wall-summary-value" }, t("a11y.summaryValue")),
				),
				React.createElement(
					"div",
					{ className: "tl5-a11y-body" },
					rows.map((row) =>
						React.createElement(
							"div",
							{ className: "tl5-a11y-row", key: row.keys + "|" + row.desc },
							React.createElement("span", { className: "tl5-a11y-kbd" }, row.keys),
							React.createElement("span", { className: "tl5-a11y-desc" }, row.desc),
						),
					),
					React.createElement("p", { className: "tl5-a11y-note" }, t("a11y.trapNote")),
					React.createElement("p", { className: "tl5-a11y-note" }, t("a11y.liveNote")),
				),
			);
		};
		registerTl5PanelSection({
			id: "a11y",
			order: 860,
			title: "a11y.title",
			Component: A11yHelpSection,
		});

		const A11Y_FOCUSABLE =
			'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [contenteditable="true"], [tabindex]:not([tabindex="-1"])';

		function installAccessibility(ctx) {
			const body = document.body;
			if (body === null) return () => {};

			// ---- live region ----
			const live = document.createElement("div");
			live.setAttribute("data-tl-a11y-live", "");
			live.setAttribute("role", "status");
			live.setAttribute("aria-live", "polite");
			live.setAttribute("aria-atomic", "true");
			body.appendChild(live);
			let liveTimer = 0;
			const announce = (text) => {
				if (typeof text !== "string" || text === "") return;
				if (liveTimer !== 0) window.clearTimeout(liveTimer);
				// 清空后再写入：读屏器只播报变化的节点。
				live.textContent = "";
				liveTimer = window.setTimeout(() => {
					liveTimer = 0;
					live.textContent = text;
				}, 40);
			};

			let wallHost = null;
			let fontHost = null;
			const tracked = new Map();
			const returnFocus = new Map();
			const openOrder = [];
			const pendingFocus = new Map();

			const refreshHosts = () => {
				if (wallHost === null || wallHost.isConnected === false) wallHost = document.querySelector("[data-tl-wall]");
				if (fontHost === null || fontHost.isConnected === false) fontHost = document.querySelector("[data-tl-font-panel]");
			};
			const hostLabel = (host) => (host !== null && host === fontHost ? TL_T("a11y.dialogFont") : TL_T("a11y.dialogWall"));
			const isHostOpen = (host) => {
				if (host === null) return false;
				if (host === wallHost) return host.hasAttribute("data-tl-open");
				return host.hasAttribute("hidden") === false;
			};
			const triggerFor = (host) => {
				if (host !== null && host === fontHost) return document.querySelector(".tl-font-trigger");
				return document.querySelector("[data-tl-wall-handle]");
			};
			const focusables = (host) => {
				const list = [];
				for (const node of host.querySelectorAll(A11Y_FOCUSABLE)) {
					if (typeof node.focus !== "function") continue;
					if (node.getClientRects().length === 0) continue;
					list.push(node);
				}
				return list;
			};
			const clearPendingFocus = (host) => {
				const timer = pendingFocus.get(host);
				if (timer === undefined) return;
				window.clearTimeout(timer);
				pendingFocus.delete(host);
			};
			/** 面板内容是 React 异步挂载的：重试几次直到出现可聚焦控件。 */
			const focusFirst = (host, attempt) => {
				clearPendingFocus(host);
				const list = focusables(host);
				if (list.length > 0) {
					try {
						list[0].focus({ preventScroll: true });
					} catch {
						try {
							list[0].focus();
						} catch {
							// 元素已卸载：交给下一次观察
						}
					}
					return;
				}
				if (attempt >= 4) return;
				const timer = window.setTimeout(() => {
					pendingFocus.delete(host);
					if (isHostOpen(host)) focusFirst(host, attempt + 1);
				}, 120);
				pendingFocus.set(host, timer);
			};
			const setTriggerExpanded = (host, expanded) => {
				const trigger = triggerFor(host);
				if (trigger === null) return;
				try {
					trigger.setAttribute("aria-expanded", expanded === true ? "true" : "false");
				} catch {
					// a trigger that unmounted mid-close is fine
				}
			};
			const applyDialogSemantics = (host) => {
				try {
					host.setAttribute("role", "dialog");
					host.setAttribute("aria-modal", "true");
					host.setAttribute("aria-label", hostLabel(host));
				} catch (error) {
					note("a11y:dialog", error);
				}
			};
			const removeDialogSemantics = (host) => {
				try {
					if (host.getAttribute("role") === "dialog") host.removeAttribute("role");
					host.removeAttribute("aria-modal");
					host.removeAttribute("aria-label");
				} catch {
					// disconnected hosts do not need cleanup
				}
			};
			/** Esc / 快捷键统一从触发按钮点击关闭，复用各分区自己的关闭路径。 */
			const closeHost = (host) => {
				if (host !== null && host === fontHost) {
					const close = host.querySelector("[data-tl-font-close]");
					if (close !== null) {
						close.click();
						return;
					}
					const trigger = triggerFor(host);
					if (trigger !== null) trigger.click();
					return;
				}
				const scrim = document.querySelector("[data-tl-wall-scrim]");
				if (scrim !== null) {
					scrim.click();
					return;
				}
				const handle = document.querySelector("[data-tl-wall-handle]");
				if (handle !== null) handle.click();
			};
			const onHostOpen = (host) => {
				const active = document.activeElement;
				returnFocus.set(
					host,
					active !== null && active !== undefined && active !== body && typeof active.focus === "function" ? active : null,
				);
				if (openOrder.indexOf(host) < 0) openOrder.push(host);
				applyDialogSemantics(host);
				setTriggerExpanded(host, true);
				announce(TL_T("a11y.announceOpen", { name: hostLabel(host) }));
				focusFirst(host, 0);
			};
			const onHostClose = (host) => {
				clearPendingFocus(host);
				const index = openOrder.indexOf(host);
				if (index >= 0) openOrder.splice(index, 1);
				removeDialogSemantics(host);
				setTriggerExpanded(host, false);
				const previous = returnFocus.get(host) ?? null;
				returnFocus.delete(host);
				announce(TL_T("a11y.announceClose", { name: hostLabel(host) }));
				const otherOpen = openOrder.some(
					(entry) => entry !== null && entry !== host && entry.isConnected === true && isHostOpen(entry),
				);
				if (otherOpen) return;
				// Spec: focus goes back to the panel's trigger (the Aa / edge-tab button).
				// If that trigger is gone, fall back to whatever had focus when it opened.
				const triggerTarget = triggerFor(host);
				let target = null;
				if (
					triggerTarget !== null &&
					triggerTarget !== undefined &&
					triggerTarget.isConnected === true &&
					typeof triggerTarget.focus === "function"
				) {
					target = triggerTarget;
				} else if (previous !== null && previous.isConnected === true) {
					target = previous;
				}
				if (target !== null && target !== undefined && target.isConnected === true && typeof target.focus === "function") {
					try {
						target.focus({ preventScroll: true });
					} catch {
						try {
							target.focus();
						} catch {
							// focus target vanished: nothing to restore
						}
					}
				}
			};
			const syncHost = (host) => {
				if (host === null) return;
				const open = isHostOpen(host);
				const was = tracked.get(host) === true;
				if (open === was) return;
				tracked.set(host, open);
				if (open) onHostOpen(host);
				else onHostClose(host);
			};
			const syncStates = () => {
				refreshHosts();
				if (wallHost !== null && tracked.has(wallHost) === false) tracked.set(wallHost, false);
				if (fontHost !== null && tracked.has(fontHost) === false) tracked.set(fontHost, false);
				syncHost(wallHost);
				syncHost(fontHost);
				for (const host of [...tracked.keys()]) {
					if (host.isConnected === true) continue;
					tracked.delete(host);
					clearPendingFocus(host);
					const index = openOrder.indexOf(host);
					if (index >= 0) openOrder.splice(index, 1);
					returnFocus.delete(host);
				}
			};
			const activeHost = () => {
				for (let index = openOrder.length - 1; index >= 0; index -= 1) {
					const host = openOrder[index];
					if (host !== null && host.isConnected === true && isHostOpen(host)) return host;
				}
				return null;
			};

			// ---- global shortcuts (Alt+W stays owned by 70-sidebar) ----
			const disposeShortcut = registerTl5Shortcut({
				id: "font-panel",
				keys: "alt+t",
				labelKey: "a11y.altTDesc",
				run: () => {
					const host = document.querySelector("[data-tl-font-panel]");
					if (host === null) {
						announce(TL_T("a11y.altTUnavailable"));
						return;
					}
					if (host.hidden === false) {
						const close = host.querySelector("[data-tl-font-close]");
						if (close !== null) {
							close.click();
							return;
						}
					}
					const trigger = document.querySelector(".tl-font-trigger");
					if (trigger === null) {
						announce(TL_T("a11y.altTUnavailable"));
						return;
					}
					trigger.click();
				},
			});

			const onKeyDown = (event) => {
				if (event.defaultPrevented === true) return;
				if (event.altKey === true || event.ctrlKey === true || event.metaKey === true) {
					for (const shortcut of [...TL5_SHORTCUTS]) {
						if (shortcut.key === "") continue;
						if (
							event.altKey !== shortcut.alt ||
							event.ctrlKey !== shortcut.ctrl ||
							event.metaKey !== shortcut.meta ||
							event.shiftKey !== shortcut.shift
						) {
							continue;
						}
						if (String(event.key ?? "").toLowerCase() !== shortcut.key) continue;
						event.preventDefault();
						try {
							shortcut.run(event);
						} catch (error) {
							note("a11y:shortcut", error);
						}
						return;
					}
					return;
				}
				const host = activeHost();
				if (host === null) return;
				if (event.key === "Escape") {
					event.preventDefault();
					event.stopPropagation();
					closeHost(host);
					return;
				}
				if (event.key !== "Tab") return;
				const items = focusables(host);
				if (items.length === 0) {
					event.preventDefault();
					return;
				}
				const first = items[0];
				const last = items[items.length - 1];
				const current = document.activeElement;
				const inside = current !== null && current !== undefined && typeof host.contains === "function" && host.contains(current) === true;
				if (event.shiftKey === true) {
					if (inside === false || current === first) {
						event.preventDefault();
						try {
							last.focus();
						} catch {
							// element vanished between reads
						}
					}
				} else if (inside === false || current === last) {
					event.preventDefault();
					try {
						first.focus();
					} catch {
						// element vanished between reads
					}
				}
			};

			// ---- live announcements for section toggles ----
			const onToggle = (event) => {
				const target = event.target;
				if (!(target instanceof Element)) return;
				if (target.classList.contains("tl-wall-group") === false) return;
				if (target.closest("[data-tl-wall]") === null) return;
				const titleNode = target.querySelector(".tl-wall-group-title");
				const name = titleNode === null ? "" : String(titleNode.textContent ?? "").trim();
				announce(
					target.open === true
						? TL_T("a11y.announceSectionOpen", { name })
						: TL_T("a11y.announceSectionClose", { name }),
				);
			};

			// 语言变化时，把已打开面板的 aria-label 换成本地化名称。
			const unsubscribeI18n = subscribeTl5I18n(() => {
				for (const host of [wallHost, fontHost]) {
					if (host === null || host.isConnected !== true || isHostOpen(host) === false) continue;
					try {
						host.setAttribute("aria-label", hostLabel(host));
					} catch {
						// host removed during a language switch
					}
				}
			});

			// 两个观察者分开：attributes 只订阅可读性相关的少量属性（聊天流式渲染
			// 不触发），childList 只看 body 的直接子节点（两个面板宿主都是 body 子级）。
			const openObserver = new MutationObserver(() => syncStates());
			const treeObserver = new MutationObserver(() => syncStates());
			try {
				openObserver.observe(body, {
					attributes: true,
					subtree: true,
					attributeFilter: ["data-tl-open", "hidden"],
				});
				treeObserver.observe(body, { childList: true });
			} catch (error) {
				note("a11y:observer", error);
			}
			refreshHosts();
			syncStates();
			window.addEventListener("keydown", onKeyDown);
			document.addEventListener("toggle", onToggle, true);

			return () => {
				openObserver.disconnect();
				treeObserver.disconnect();
				window.removeEventListener("keydown", onKeyDown);
				document.removeEventListener("toggle", onToggle, true);
				if (typeof disposeShortcut === "function") disposeShortcut();
				if (typeof unsubscribeI18n === "function") unsubscribeI18n();
				if (liveTimer !== 0) {
					window.clearTimeout(liveTimer);
					liveTimer = 0;
				}
				for (const timer of pendingFocus.values()) window.clearTimeout(timer);
				pendingFocus.clear();
				for (const host of [...tracked.keys()]) {
					clearPendingFocus(host);
					removeDialogSemantics(host);
					setTriggerExpanded(host, false);
				}
				tracked.clear();
				returnFocus.clear();
				openOrder.length = 0;
				live.remove();
			};
		}
		//#endregion
