		//#region reasoning rheostat
		/**
		 * A draggable detent rail for the session's reasoning effort, mounted beside
		 * the composer's existing controls.
		 *
		 * It is strictly additive and fail-safe: it reads the live selection from the
		 * `modelSelection` projection, writes through the same `session.selectModel`
		 * remote the shipped picker uses, and renders `null` when any of that is
		 * unavailable. A missing hook or a failed catalog never disturbs the composer.
		 */
		function installEffortRheostat(ctx) {
			if (React === null) {
				note("rheostat:react-missing", {});
				return () => {};
			}
			if (typeof ctx.inject !== "function") {
				note("rheostat:no-inject", {});
				return () => {};
			}
			// `slots` is published by a plugin that activates AFTER this one, so an eager
			// ctx.get('slots') during apply() is undefined on every boot and the control
			// silently never registered. Wait for the service instead of probing once.
			return ctx.inject(["slots"], (scoped) => {
				const slots = scoped.get("slots");
				if (slots === undefined) {
					note("rheostat:slots-missing", {});
					return () => {};
				}
				return registerRheostat(scoped, slots);
			});
		}

		function registerRheostat(ctx, slots) {
			// `remote` is a guarded context property, and ctx.inject(["remote"]) never fires
			// for it. The legal ways in: the loader injection declared in package.json
			// (dsh.client.inject -> api-remotes), a dotted "remote.session" service key, or
			// a guarded get(). Probe every path and use whichever answers.
			let remoteScope = null;
			let sessionScope = null;
			const disposeRemote = ctx.inject(["remote"], (scoped) => {
				remoteScope = scoped;
				return () => {
					remoteScope = null;
				};
			});
			const disposeSession = ctx.inject(["remote.session"], (scoped) => {
				sessionScope = scoped;
				return () => {
					sessionScope = null;
				};
			});
			/** The session remote namespace: the object carrying modelCatalog/selectModel. */
			const resolveRemoteSession = () => {
				if (sessionScope !== null) {
					try {
						const direct = sessionScope.get("remote.session");
						if (direct !== undefined) return direct;
					} catch {
						// fall through to the next path
					}
				}
				if (remoteScope !== null) {
					try {
						const viaScope = remoteScope.remote;
						if (viaScope?.session !== undefined) return viaScope.session;
					} catch {
						// fall through
					}
				}
				for (const key of ["remote.session", "remote"]) {
					try {
						const value = ctx.get(key);
						if (value?.modelCatalog !== undefined) return value;
						if (value?.session?.modelCatalog !== undefined) return value.session;
					} catch {
						// guarded access; keep probing
					}
				}
				return undefined;
			};

			/** Rail insets in px; must match [data-tl-rheo-track] in the stylesheet. */
			const RAIL_LEFT = 12;
			const RAIL_RIGHT = 40;
			let warnedRender = false;
			const FAULT_LABELS = {
				loading: "读取中",
				"no-remote": "未连接",
				error: "读取失败",
				rejected: "被拒绝",
				"no-efforts": "无档位",
			};
			const LABELS = {
				minimal: "极简",
				low: "低",
				medium: "中",
				high: "高",
				max: "最高",
				none: "关闭",
			};

			/**
			 * Effort levels for the selected model, read from the host catalog.
			 * @returns `{ ids, names, defaultEffort }`, or null when this model declares none.
			 *
			 * The catalog is NOT a flat group list: every entry is `{ kind, group }`, and
			 * the value to send back is `effort.id` (not a guessed label). Both mistakes
			 * made the control write values the host rejected, so the level never changed.
			 */
			const readEfforts = (catalog, selection) => {
				const groups = catalog?.groups;
				if (!Array.isArray(groups) || selection === null) return null;
				const collect = (model) => {
					const efforts = model?.reasoning?.efforts;
					if (!Array.isArray(efforts) || efforts.length < 2) return null;
					const ids = [];
					const names = {};
					for (const effort of efforts) {
						if (typeof effort === "string") {
							ids.push(effort);
							continue;
						}
						if (typeof effort?.id !== "string") continue;
						ids.push(effort.id);
						if (typeof effort.name === "string" && effort.name !== "") names[effort.id] = effort.name;
					}
					if (ids.length < 2) return null;
					const defaultEffort =
						typeof model.reasoning?.defaultEffort === "string" ? model.reasoning.defaultEffort : null;
					return { ids, names, defaultEffort };
				};
				const flat = [];
				for (const entry of groups) {
					const group = entry?.group === undefined ? entry : entry.group;
					for (const model of group?.models ?? []) flat.push({ group, model });
				}
				// Exact provider+model first...
				for (const { group, model } of flat) {
					if (group?.id !== selection.provider || model?.id !== selection.model) continue;
					const found = collect(model);
					if (found !== null) return found;
				}
				// ...then model alone: a provider id may be aliased between the settings
				// file and the live registry, and refusing the match hid a valid scale.
				for (const { model } of flat) {
					if (model?.id !== selection.model) continue;
					const found = collect(model);
					if (found !== null) return found;
				}
				return null;
			};

			function Rheostat(props) {
				const sessionId = props.sessionId;
				const useProjection = props.useProjection;
				const snapshot = typeof useProjection === "function" ? useProjection("modelSelection") : null;
				const selection = snapshot?.next ?? snapshot?.lastUsed ?? null;
				if (!warnedRender) {
					warnedRender = true;
					note("rheostat:render", {
						hookPresent: typeof useProjection === "function",
						snapshotKeys: snapshot === null ? null : Object.keys(snapshot).slice(0, 8),
						hasSelection: selection !== null,
						sessionId: typeof sessionId === "string",
					});
				}

				// Empty until the host catalog answers. Sending guessed effort ids was exactly
				// what made the control look alive while the level never changed.
				const [levels, setLevels] = React.useState([]);
				const [labels, setLabels] = React.useState({});
				const [defaultEffort, setDefaultEffort] = React.useState(null);
				// Some conversations have no explicit selection yet. The catalog carries the
				// default one, which is what the host would use anyway — falling back to it
				// is why this no longer renders "未就绪" in a fresh chat.
				const [catalogDefault, setCatalogDefault] = React.useState(null);
				// Why the scale is missing, surfaced in the placeholder so the failure names
				// itself instead of needing devtools.
				const [fault, setFault] = React.useState("loading");
				const [busy, setBusy] = React.useState(false);
				// The continuous position is written straight to the DOM node. Driving it
				// through React state re-rendered the component every frame, which is what
				// made the motion stutter; React now re-renders only on discrete changes.
				const dragRef = React.useRef(null);
				// `draggingRef` is the ONLY authority for whether pointer moves count.
				const draggingRef = React.useRef(false);
				const [held, setHeld] = React.useState(false);
				// Seeded lazily inside the effect: committedPos is declared further down, so
				// referencing it in a useRef initializer would hit the temporal dead zone.
				const springRef = React.useRef(null);
				const railRef = React.useRef(null);
				const applyPos = React.useCallback((value) => {
					const node = railRef.current;
					if (node === null) return;
					// A non-finite value invalidates `left: calc(...)`, which collapses the rail
					// into a distorted layout — sanitize before it reaches the stylesheet.
					const safe = Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
					node.style.setProperty("--tl-rheo-pos", String(safe));
				}, []);

				const active = selection ?? catalogDefault;
				const provider = active?.provider;
				const model = active?.model;

				// Switching conversations reuses the same component instance. Without this
				// reset the previous session's scale, fault text and drag state leak into
				// the new one, which is exactly how the control "breaks in another chat".
				const sessionRef = React.useRef(sessionId);
				React.useEffect(() => {
					if (sessionRef.current === sessionId) return;
					sessionRef.current = sessionId;
					setLevels([]);
					setLabels({});
					setDefaultEffort(null);
					setFault("loading");
					setDragIndex(null);
					setBusy(false);
					springRef.current = null;
				}, [sessionId]);

				React.useEffect(() => {
					let alive = true;
					let attempt = 0;
					let timer = 0;

					const run = async () => {
						if (!alive) return;
						try {
							const session = resolveRemoteSession();
							// `remote.session` is mounted asynchronously by the api-remotes plugin:
							// running once was a race that always lost, and the failure looked final.
							if (session === undefined || typeof session.modelCatalog !== "function") {
								throw new Error("remote.session.modelCatalog 尚未挂载");
							}
							const response = await session.modelCatalog();
							if (!alive) return;
							if (response?.ok !== true) {
								setFault("rejected");
								return;
							}
							const def = response.value?.default;
							const defaultSelection =
								def !== undefined && typeof def.provider === "string" && typeof def.model === "string"
									? {
											provider: def.provider,
											model: def.model,
											// The host also reports which effort it would apply; dropping it
											// made the knob guess between the model default and the highest.
											reasoningEffort: typeof def.reasoningEffort === "string" ? def.reasoningEffort : undefined,
										}
									: null;
							if (alive) setCatalogDefault(defaultSelection);
							const chosen = selection !== null ? selection : defaultSelection;
							const found =
								chosen === null ? null : readEfforts(response.value, { provider: chosen.provider, model: chosen.model });
							if (found === null) {
								setFault("no-efforts");
								return;
							}
							setFault(null);
							setLevels(found.ids);
							setLabels(found.names);
							setDefaultEffort(found.defaultEffort);
						} catch (error) {
							if (!alive) return;
							attempt += 1;
							if (attempt <= 12) {
								timer = window.setTimeout(run, 500);
								return;
							}
							const message = error instanceof Error ? error.message : String(error);
							setFault("err:" + message);
						}
					};

					void run();
					return () => {
						alive = false;
						if (timer !== 0) window.clearTimeout(timer);
					};
				}, [provider, model, sessionId]);

				// Null-safe derivation so every hook below runs on every render: a component
				// may not return before its hooks, or React rejects the changing count.
				const currentIndex =
					active === null || levels.length === 0
						? 0
						: Math.max(
								0,
								levels.indexOf(
									active.reasoningEffort ?? defaultEffort ?? levels[levels.length - 1],
								),
							);
				const steps = levels.length - 1;
				const committedPos = steps > 0 ? currentIndex / steps : 0;
				const dragging = held;
				// Only the detent index re-renders (label + aria); the continuous position
				// lives in the node's custom property.
				const [dragIndex, setDragIndex] = React.useState(null);
				const nearest = dragIndex === null ? currentIndex : dragIndex;
				const [pulse, setPulse] = React.useState(0);
				React.useEffect(() => {
					setPulse((n) => n + 1);
				}, [nearest]);
				React.useEffect(() => {
					if (dragging) return undefined;
					if (springRef.current === null) springRef.current = { pos: committedPos, vel: 0 };
					// Paint the seeded position before the first frame so the bead never
					// appears at the left edge and then jump into place.
					applyPos(springRef.current.pos);
					let raf = 0;
					// Near-critical damping (zeta ~0.96): a short overshoot, then settle.
					// Lower damping / higher stiffness is what made it wobble violently.
					const stiffness = 170;
					const damping = 25;
					const dt = 1 / 60;
					let pos = springRef.current.pos;
					let vel = 0;
					const step = () => {
						const target = committedPos;
						vel += ((target - pos) * stiffness - vel * damping) * dt;
						pos += vel * dt;
						const settled = Math.abs(target - pos) < 0.001 && Math.abs(vel) < 0.001;
						springRef.current = { pos: settled ? target : pos, vel: settled ? 0 : vel };
						applyPos(settled ? target : pos);
						if (!settled) raf = requestAnimationFrame(step);
					};
					raf = requestAnimationFrame(step);
					return () => cancelAnimationFrame(raf);
				}, [committedPos, dragging, applyPos]);

				// All hooks are above this line: an early return before any hook would make
				// the hook count change when the selection arrives, which React rejects.
				// Every non-working state renders something legible: a hairline at low
				// opacity is invisible on a bright wallpaper, which is how the control
				// appeared to "not exist" instead of reporting why.
				if (active === null || sessionId === undefined) {
					return React.createElement(
						"div",
						{ "data-tl-rheo": "", "data-tl-rheo-empty": "", title: "推理等级：未读取到当前会话的模型选择" },
						React.createElement("span", { "data-tl-rheo-empty-text": "" }, "推理 · 未就绪"),
					);
				}
				if (levels.length < 2) {
					const raw = FAULT_LABELS[fault] ?? (typeof fault === "string" && fault.startsWith("err:") ? fault.slice(4) : fault);
					const reason = typeof raw === "string" && raw.startsWith("err:") ? raw.slice(4) : (raw ?? "无档位");
					return React.createElement(
						"div",
						{ "data-tl-rheo": "", "data-tl-rheo-empty": "", title: "推理等级：" + reason },
						React.createElement("span", { "data-tl-rheo-empty-text": "" }, "推理 · " + reason),
					);
				}

				const commit = (target) => {
					if (busy || target === currentIndex) return;
					const session = resolveRemoteSession();
					if (typeof session?.selectModel !== "function") {
						note("rheostat:write-unavailable", {});
						return;
					}
					setBusy(true);
					Promise.resolve(
						session.selectModel({
							sessionId,
							provider: active.provider,
							model: active.model,
							reasoningEffort: levels[target],
						}),
					)
						.catch(() => {})
						.finally(() => setBusy(false));
				};

				const ratioAt = (clientX) => {
					const rail = railRef.current;
					if (rail === null) return committedPos;
					const rect = rail.getBoundingClientRect();
					const usable = rect.width - RAIL_LEFT - RAIL_RIGHT;
					if (usable <= 0) return committedPos;
					return Math.min(1, Math.max(0, (clientX - rect.left - RAIL_LEFT) / usable));
				};

				const onPointerDown = (event) => {
					if (event.button !== undefined && event.button !== 0) return;
					draggingRef.current = true;
					setHeld(true);
					railRef.current?.setPointerCapture?.(event.pointerId);
					const ratio = ratioAt(event.clientX);
					dragRef.current = ratio;
					applyPos(ratio);
					setDragIndex(steps > 0 ? Math.round(ratio * steps) : 0);
					event.preventDefault();
				};
				const onPointerMove = (event) => {
					// Only the held pointer moves the control; after release the spring owns it.
					if (!draggingRef.current) return;
					const ratio = ratioAt(event.clientX);
					dragRef.current = ratio;
					applyPos(ratio);
					const index = steps > 0 ? Math.round(ratio * steps) : 0;
					setDragIndex((current) => (current === index ? current : index));
				};
				const onPointerUp = (event) => {
					railRef.current?.releasePointerCapture?.(event.pointerId);
					const wasHeld = draggingRef.current;
					draggingRef.current = false;
					setHeld(false);
					const releasePos = dragRef.current;
					dragRef.current = null;
					setDragIndex(null);
					if (!wasHeld || releasePos === null) return;
					const target = steps > 0 ? Math.round(Math.min(1, Math.max(0, releasePos)) * steps) : 0;
					// Hand the exact release point to the spring so the settle starts where the
					// finger left off instead of snapping first.
					springRef.current = { pos: releasePos, vel: 0 };
					applyPos(releasePos);
					if (target !== currentIndex) commit(target);
				};

				const label = labels[levels[currentIndex]] ?? LABELS[levels[currentIndex]] ?? levels[currentIndex];
				const activeLabel = labels[levels[nearest]] ?? LABELS[levels[nearest]] ?? levels[nearest];
				return React.createElement(
					"div",
					{
						ref: railRef,
						"data-tl-rheo": "",
						"data-tl-busy": busy ? "" : undefined,
						"data-tl-drag": dragging ? "" : undefined,
						role: "slider",
						tabIndex: 0,
						"aria-label": "推理等级",
						"aria-valuemin": 0,
						"aria-valuemax": steps,
						"aria-valuenow": nearest,
						"aria-valuetext": activeLabel,
						title: "推理等级：" + label,
						onPointerDown,
						onPointerMove,
						onPointerUp,
						onPointerCancel: onPointerUp,
						onKeyDown: (event) => {
							if (event.key === "ArrowRight" || event.key === "ArrowUp") {
								event.preventDefault();
								commit(Math.min(steps, currentIndex + 1));
							} else if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
								event.preventDefault();
								commit(Math.max(0, currentIndex - 1));
							}
						},
					},
					React.createElement("span", { "data-tl-rheo-track": "" }),
					React.createElement("span", { "data-tl-rheo-fill": "" }),
					React.createElement("span", { "data-tl-rheo-halo": "" }),
					React.createElement("span", { "data-tl-rheo-bead": "" }),
					React.createElement("span", { key: "p" + pulse, "data-tl-rheo-pulse": "" }),
					React.createElement("span", { key: "l" + nearest, "data-tl-rheo-label": "" }, activeLabel),
				);
			}

			const disposeSlots = slots.inject("conversation.input.right", () => {
				return slots.register(
					{ name: "conversation.input.right", id: "ui-skin-tianlight:rheostat", order: -10 },
					Rheostat,
				);
			});
			// Both scopes are owned by this activation; leaking either leaves a stale
			// remote scope or a registered cell behind after the skin is switched off.
			return () => {
				if (typeof disposeSlots === "function") disposeSlots();
				if (typeof disposeRemote === "function") disposeRemote();
				if (typeof disposeSession === "function") disposeSession();
			};
		}
		//#endregion
