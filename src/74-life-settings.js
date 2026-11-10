		//#region life settings
		/**
		 * v1.0.0 role page (slots `settings.section`, id `tianlight-role`).
		 *
		 * One page for the character layer: replaceable pet media (image or video
		 * <=32 MiB), life rhythm (quiet hours / wake-sleep / daily proactive budget /
		 * virtual clock), liquid-glass depth, memory stats and a focus timer. Every
		 * control talks to the same runtime APIs the pet uses, so there is no second
		 * source of truth:
		 *   - globalThis.tianlightLife (life rhythm + media, src/42-life.js)
		 *   - glassDepthController        (off/frosted/soft/real, src/57-glass.js)
		 *   - globalThis.tianlightDuty    (bubble channel, read-only stats here)
		 *
		 * Slots/React missing => the page silently degrades (diagnostics only); the
		 * pet and the console APIs keep working.
		 */
		registerTl5Strings({
			zh: {
				"role.section.label": "角色 / 生活",
				"role.title": "角色 · 生活节奏",
				"role.intro": "桌宠不只是装饰：它有作息、有主动开口的预算，也能换成你自己的图片或短视频形象。这里的所有设置都即时生效。",
				"role.media.title": "桌宠形象",
				"role.media.hint": "支持本地壁纸库中的图片或视频（≤32 MiB）。视频会静音循环播放；换图/换视频不需要改代码。",
				"role.media.default": "默认形象（cat.png）",
				"role.media.apply": "应用形象",
				"role.media.applied": "形象已切换：{name}",
				"role.media.tooBig": "以下素材超过 32 MiB，已忽略：{names}",
				"role.media.empty": "本地壁纸库暂无可用素材；先在上传壁纸里添加图片/视频。",
				"role.life.title": "生活节奏",
				"role.life.quiet": "静默时段",
				"role.life.quietOn": "启用",
				"role.life.start": "开始",
				"role.life.end": "结束",
				"role.life.budget": "每日主动开口上限",
				"role.life.wake": "起床",
				"role.life.sleep": "睡觉",
				"role.life.virtual": "虚拟时钟偏移（分钟）",
				"role.life.apply": "保存生活节奏",
				"role.life.saved": "已保存。",
				"role.life.status": "现在是 {period} · 今日主动 {used}/{cap} 次 · {quiet}",
				"role.life.quietActive": "静默中",
				"role.life.quietOff": "可开口",
				"role.life.deferred": "被推迟的职责提醒：{n} 条",
				"role.glass.title": "玻璃液态质感",
				"role.glass.hint": "在壁纸与界面之间加一层液态玻璃。真实最通透、柔和更稳、磨砂最安静；低电量或 15fps 时自动降级。",
				"role.glass.off": "关闭",
				"role.glass.frosted": "磨砂",
				"role.glass.soft": "柔和",
				"role.glass.real": "真实",
				"role.glass.applied": "质感：{depth}（实际 {effective}）",
				"role.memory.title": "记忆与专注",
				"role.memory.stats": "互动 {interactions} · 摸摸 {pats} · 喂食 {feeds} · 逗猫棒 {plays} · 连续 {streak} 天",
				"role.memory.lastSeen": "上次见面：{time}",
				"role.focus.start": "开始 25 分钟专注",
				"role.focus.stop": "结束专注",
				"role.focus.active": "专注中，剩余 {minutes} 分钟",
				"role.focus.idle": "未在专注",
				"role.memory.hint": "专注期间角色不会主动开口；职责气泡（审批等）不受影响。",
			},
			en: {
				"role.section.label": "Role / Life",
				"role.title": "Role · Life rhythm",
				"role.intro": "The companion is more than decoration: it keeps a daily rhythm, has a proactive-speaking budget, and can wear your own image or short video. Everything here applies immediately.",
				"role.media.title": "Companion look",
				"role.media.hint": "Pick an image or video from the local wallpaper library (<=32 MiB). Videos loop muted; no code change needed.",
				"role.media.default": "Default (cat.png)",
				"role.media.apply": "Apply look",
				"role.media.applied": "Look applied: {name}",
				"role.media.tooBig": "Over 32 MiB, ignored: {names}",
				"role.media.empty": "No usable media in the local library yet; upload an image or video first.",
				"role.life.title": "Life rhythm",
				"role.life.quiet": "Quiet hours",
				"role.life.quietOn": "Enabled",
				"role.life.start": "Start",
				"role.life.end": "End",
				"role.life.budget": "Proactive bubbles per day",
				"role.life.wake": "Wake",
				"role.life.sleep": "Sleep",
				"role.life.virtual": "Virtual clock offset (minutes)",
				"role.life.apply": "Save rhythm",
				"role.life.saved": "Saved.",
				"role.life.status": "Now {period} · proactive today {used}/{cap} · {quiet}",
				"role.life.quietActive": "quiet",
				"role.life.quietOff": "open",
				"role.life.deferred": "Deferred duty reminders: {n}",
				"role.glass.title": "Liquid glass",
				"role.glass.hint": "A liquid-glass pass between wallpaper and UI. Real is the clearest, soft the safest, frosted the quietest; degrades automatically on low power or 15fps.",
				"role.glass.off": "Off",
				"role.glass.frosted": "Frosted",
				"role.glass.soft": "Soft",
				"role.glass.real": "Real",
				"role.glass.applied": "Depth: {depth} (effective {effective})",
				"role.memory.title": "Memory & focus",
				"role.memory.stats": "Interactions {interactions} · pats {pats} · feeds {feeds} · play {plays} · streak {streak}d",
				"role.memory.lastSeen": "Last seen: {time}",
				"role.focus.start": "Start 25m focus",
				"role.focus.stop": "Stop focus",
				"role.focus.active": "Focused, {minutes}m left",
				"role.focus.idle": "Not focusing",
				"role.memory.hint": "The character stays quiet while you focus; duty bubbles (approvals) are unaffected.",
			},
		});

		const ROLE_PAGE_ID = "tianlight-role";
		const ROLE_GLASS_LABEL_KEYS = { off: "role.glass.off", frosted: "role.glass.frosted", soft: "role.glass.soft", real: "role.glass.real" };

		function roleLifeStatus() {
			try {
				return globalThis.tianlightLife?.status?.() ?? null;
			} catch (error) {
				note("role-life:status", error);
				return null;
			}
		}

		function roleGlassDepth() {
			try {
				if (glassDepthController === null) return { depth: "off", effective: "off" };
				return { depth: glassDepthController.read(), effective: glassDepthController.effective() };
			} catch (error) {
				note("role-life:glass", error);
				return { depth: "off", effective: "off" };
			}
		}

		function formatWhen(value) {
			if (!value) return "—";
			try {
				const date = new Date(value);
				if (Number.isNaN(date.getTime())) return "—";
				return date.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
			} catch {
				return "—";
			}
		}

		function RoleSettingsPage() {
			const ReactImpl = React;
			const h = ReactImpl.createElement;
			const [status, setStatus] = React.useState(() => roleLifeStatus());
			const [glass, setGlass] = React.useState(() => roleGlassDepth());
			const [mediaState, setMediaState] = React.useState(null);
			const [mediaId, setMediaId] = React.useState(() => {
				try {
					return globalThis.localStorage?.getItem("tianlight.petMedia.v1") ?? "default";
				} catch {
					return "default";
				}
			});
			const [notice, setNotice] = React.useState("");
			const [busy, setBusy] = React.useState(false);
			const [quietEnabled, setQuietEnabled] = React.useState(() => roleLifeStatus()?.config?.quiet?.enabled !== false);
			const [quietStart, setQuietStart] = React.useState(() => roleLifeStatus()?.config?.quiet?.start ?? "23:00");
			const [quietEnd, setQuietEnd] = React.useState(() => roleLifeStatus()?.config?.quiet?.end ?? "08:00");
			const [budgetDaily, setBudgetDaily] = React.useState(() => roleLifeStatus()?.config?.cap ?? 6);
			const [wake, setWake] = React.useState(() => roleLifeStatus()?.config?.wake ?? "08:00");
			const [sleep, setSleep] = React.useState(() => roleLifeStatus()?.config?.sleep ?? "23:00");
			const [virtualOffset, setVirtualOffset] = React.useState(() => roleLifeStatus()?.config?.virtualOffsetMinutes ?? 0);

			const refresh = () => {
				const next = roleLifeStatus();
				setStatus(next);
				setGlass(roleGlassDepth());
				if (next?.config !== undefined) {
					setQuietEnabled(next.config.quiet?.enabled !== false);
					setQuietStart(next.config.quiet?.start ?? "23:00");
					setQuietEnd(next.config.quiet?.end ?? "08:00");
					setBudgetDaily(next.config.cap ?? 6);
					setWake(next.config.wake ?? "08:00");
					setSleep(next.config.sleep ?? "23:00");
					setVirtualOffset(next.config.virtualOffsetMinutes ?? 0);
				}
			};

			React.useEffect(() => {
				let alive = true;
				const loadMedia = async () => {
					try {
						const result = await globalThis.tianlightLife?.listMedia?.();
						if (alive && result !== undefined) setMediaState(result);
					} catch (error) {
						if (alive) setMediaState({ items: [], rejected: [], error: String(error?.message ?? error) });
					}
				};
				void loadMedia();
				const timer = window.setInterval(() => {
					if (!alive) return;
					refresh();
				}, 4000);
				return () => {
					alive = false;
					window.clearInterval(timer);
				};
			}, []);

			const applyMedia = async () => {
				setBusy(true);
				try {
					const result = await globalThis.tianlightLife?.setMedia?.(mediaId === "default" ? null : mediaId);
					if (result?.ok === true) setNotice(TL_T("role.media.applied", { name: result.media?.name ?? mediaId }));
					else if (result?.reason === "unknown-media") setNotice(TL_T("role.media.empty"));
					else setNotice(TL_T("role.media.empty"));
				} catch (error) {
					setNotice(String(error?.message ?? error));
				} finally {
					setBusy(false);
					refresh();
				}
			};
			const applyLife = () => {
				try {
					globalThis.tianlightLife?.configure?.({
						quiet: { enabled: quietEnabled, start: quietStart, end: quietEnd },
						budgetDaily: Number(budgetDaily),
						wake,
						sleep,
						virtualOffsetMinutes: Number(virtualOffset),
					});
					setNotice(TL_T("role.life.saved"));
				} catch (error) {
					setNotice(String(error?.message ?? error));
				}
				refresh();
			};
			const applyGlass = (next) => {
				try {
					glassDepthController?.apply?.(next);
					setGlass(roleGlassDepth());
					setNotice(TL_T("role.glass.applied", { depth: TL_T(ROLE_GLASS_LABEL_KEYS[next]), effective: roleGlassDepth().effective }));
				} catch (error) {
					setNotice(String(error?.message ?? error));
				}
			};
			const focusAction = () => {
				try {
					const active = globalThis.tianlightLife?.focusStatus?.()?.active === true;
					if (active) globalThis.tianlightLife?.focusStop?.();
					else globalThis.tianlightLife?.focusStart?.(25);
				} catch (error) {
					setNotice(String(error?.message ?? error));
				}
				refresh();
			};
			const life = status;
			const memory = life?.memory ?? {};
			const focus = life?.focus ?? {};
			const quiet = life?.quiet === true;
			const deferred = life?.deferredCount ?? 0;
			const mediaItems = mediaState?.items ?? [];
			const rejected = mediaState?.rejected ?? [];
			const glassLevels = ["off", "frosted", "soft", "real"];
			return h(
				"div",
				{ className: "tl-role-page" },
				h("h3", null, TL_T("role.title")),
				h("p", null, TL_T("role.intro")),
				notice === "" ? null : h("p", { className: "tl-role-note", role: "status" }, notice),
				// ---- pet media ----
				h(
					"div",
					{ className: "tl-role-card" },
					h("h3", null, TL_T("role.media.title")),
					h("p", null, TL_T("role.media.hint")),
					h(
						"div",
						{ className: "tl-role-row" },
						h("label", null, TL_T("role.media.default")),
						h(
							"select",
							{ value: mediaId, onChange: (event) => setMediaId(event.target.value), "aria-label": TL_T("role.media.title") },
							mediaItems.map((item) =>
								h(
									"option",
									{ key: item.id, value: item.id },
									item.bytes === null ? item.name : `${item.name} · ${Math.round(item.bytes / 1024)} KB · ${item.kind}`,
								),
							),
						),
						h("button", { type: "button", disabled: busy, onClick: () => void applyMedia() }, TL_T("role.media.apply")),
					),
					rejected.length === 0
						? null
						: h("p", { className: "tl-role-note" }, TL_T("role.media.tooBig", { names: rejected.map((item) => item.name).join(", ") })),
					mediaItems.length === 0 ? h("p", { className: "tl-role-note" }, TL_T("role.media.empty")) : null,
				),
				// ---- life rhythm ----
				h(
					"div",
					{ className: "tl-role-card" },
					h("h3", null, TL_T("role.life.title")),
					h(
						"p",
						null,
						TL_T("role.life.status", {
							period: life?.period ?? "—",
							used: life?.budget?.used ?? 0,
							cap: life?.budget?.cap ?? budgetDaily,
							quiet: quiet ? TL_T("role.life.quietActive") : TL_T("role.life.quietOff"),
						}),
					),
					h(
						"div",
						{ className: "tl-role-row" },
						h("label", null, TL_T("role.life.quiet")),
						h("input", { type: "checkbox", checked: quietEnabled, onChange: (event) => setQuietEnabled(event.target.checked) }),
						h("span", null, TL_T("role.life.quietOn")),
						h("input", { type: "time", value: quietStart, onChange: (event) => setQuietStart(event.target.value), "aria-label": TL_T("role.life.start") }),
						h("span", null, "→"),
						h("input", { type: "time", value: quietEnd, onChange: (event) => setQuietEnd(event.target.value), "aria-label": TL_T("role.life.end") }),
					),
					h(
						"div",
						{ className: "tl-role-row" },
						h("label", null, TL_T("role.life.budget")),
						h("input", { type: "number", min: 0, max: 20, step: 1, value: budgetDaily, onChange: (event) => setBudgetDaily(event.target.value) }),
						h("label", null, TL_T("role.life.wake")),
						h("input", { type: "time", value: wake, onChange: (event) => setWake(event.target.value) }),
						h("label", null, TL_T("role.life.sleep")),
						h("input", { type: "time", value: sleep, onChange: (event) => setSleep(event.target.value) }),
					),
					h(
						"div",
						{ className: "tl-role-row" },
						h("label", null, TL_T("role.life.virtual")),
						h("input", { type: "number", min: -720, max: 720, step: 15, value: virtualOffset, onChange: (event) => setVirtualOffset(event.target.value) }),
						h("button", { type: "button", onClick: applyLife }, TL_T("role.life.apply")),
					),
					deferred > 0 ? h("p", { className: "tl-role-note" }, TL_T("role.life.deferred", { n: deferred })) : null,
				),
				// ---- liquid glass ----
				h(
					"div",
					{ className: "tl-role-card" },
					h("h3", null, TL_T("role.glass.title")),
					h("p", null, TL_T("role.glass.hint")),
					h(
						"div",
						{ className: "tl-role-choices" },
						glassLevels.map((level) =>
							h(
								"button",
								{
									key: level,
									type: "button",
									"data-active": glass.depth === level ? "" : undefined,
									"aria-pressed": glass.depth === level,
									onClick: () => applyGlass(level),
								},
								TL_T(ROLE_GLASS_LABEL_KEYS[level]),
							),
						),
					),
					h("p", { className: "tl-role-note" }, TL_T("role.glass.applied", { depth: TL_T(ROLE_GLASS_LABEL_KEYS[glass.depth]), effective: glass.effective })),
				),
				// ---- memory + focus ----
				h(
					"div",
					{ className: "tl-role-card" },
					h("h3", null, TL_T("role.memory.title")),
					h(
						"div",
						{ className: "tl-role-stats" },
						h("span", null, TL_T("role.memory.stats", {
							interactions: memory.interactions ?? 0,
							pats: memory.pats ?? 0,
							feeds: memory.feeds ?? 0,
							plays: memory.plays ?? 0,
							streak: memory.streakDays ?? 0,
						})),
						h("span", null, TL_T("role.memory.lastSeen", { time: formatWhen(memory.lastSeenAt) })),
					),
					h("p", null, TL_T("role.memory.hint")),
					h(
						"div",
						{ className: "tl-role-row" },
						h("span", null, focus.active === true ? TL_T("role.focus.active", { minutes: Math.max(0, Math.round((focus.endsAt - Date.now()) / 60000)) }) : TL_T("role.focus.idle")),
						h("button", { type: "button", onClick: focusAction }, focus.active === true ? TL_T("role.focus.stop") : TL_T("role.focus.start")),
					),
				),
			);
		}

		/**
		 * Register the role page in DSH settings. Missing slots/React => no page,
		 * everything else (pet, life API, duty channel) keeps working.
		 */
		function installLifeSettings(ctx) {
			if (React === null) {
				note("role-life:no-react", {});
				return () => {};
			}
			if (ctx === undefined || ctx === null || typeof ctx.inject !== "function") {
				note("role-life:no-ctx", {});
				return () => {};
			}
			let dispose = () => {};
			try {
				const injected = ctx.inject(["slots"], (scoped) => {
					const scopedSlots = scoped !== null && scoped !== undefined && typeof scoped.get === "function" ? scoped.get("slots") : undefined;
					const slots = scopedSlots !== undefined && scopedSlots !== null ? scopedSlots : scoped?.slots;
					if (slots === undefined || slots === null || typeof slots.register !== "function") {
						note("role-life:no-slots", {});
						return () => {};
					}
					const disposers = [];
					try {
						disposers.push(
							slots.inject("settings.section", () =>
								slots.register(
									{ name: "settings.section", id: ROLE_PAGE_ID, order: 110, label: () => TL_T("role.section.label") },
									RoleSettingsPage,
								),
							),
						);
					} catch (error) {
						note("role-life:section-failed", error);
					}
					return () => {
						for (const entry of disposers) {
							try {
								if (typeof entry === "function") entry();
							} catch (error) {
								note("role-life:dispose", error);
							}
						}
					};
				});
				if (typeof injected === "function") dispose = injected;
			} catch (error) {
				note("role-life:inject-failed", error);
			}
			return () => {
				try {
					dispose();
				} catch (error) {
					note("role-life:dispose-failed", error);
				}
			};
		}
		//#endregion
