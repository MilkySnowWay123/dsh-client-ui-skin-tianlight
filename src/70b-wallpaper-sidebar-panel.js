		//#region wallpaper sidebar

			/**
			 * Curated presets shipped with the skin. The same recipes live in
			 * presets/*.json as shareable copies; the panel uses this list so browsing
			 * the gallery never needs a network call.
			 */
			const PRESET_ZONES = {
				separate: false,
				main: { fit: "cover", ratio: "auto", zoom: 100, cx: 50, cy: 50, fx: 38, fy: 50, dim: 0, blur: 0 },
				rail: { fit: "cover", fx: 50, fy: 50, dim: 16, blur: 0, url: "", kind: "video" },
			};
			const presetSlot = (kind, preset, opacity, blend) => ({ kind, preset, url: "", fit: "cover", opacity, blend });
			const CURATED_PRESETS = [
				{
					id: "aurora-vignette",
					labelKey: "lib.preset.aurora.label",
					descKey: "lib.preset.aurora.desc",
					value: {
						format: "tianlight-preset",
						version: 1,
						zones: PRESET_ZONES,
						glass: 1,
						lowPower: "auto",
						wallpaper: { kind: "shader", url: "shader://live" },
						shader: { preset: "aurora", source: SHADER_SOURCES.aurora, speed: 1, intensity: 1, hue: 0.58 },
						layers: { version: 2, slots: [presetSlot("preset", "vignette", 0.45, "normal"), presetSlot("none", "none", 0.55, "normal")] },
					},
				},
				{
					id: "audio-scan",
					labelKey: "lib.preset.audioScan.label",
					descKey: "lib.preset.audioScan.desc",
					value: {
						format: "tianlight-preset",
						version: 1,
						zones: PRESET_ZONES,
						glass: 1,
						lowPower: "auto",
						wallpaper: { kind: "shader", url: "shader://live" },
						shader: { preset: "audio", source: SHADER_SOURCES.audio, speed: 1, intensity: 1, hue: 0.58 },
						layers: { version: 2, slots: [presetSlot("preset", "scan", 0.28, "screen"), presetSlot("preset", "glow", 0.22, "screen")] },
					},
				},
				{
					id: "cinema-grain",
					labelKey: "lib.preset.cinemaGrain.label",
					descKey: "lib.preset.cinemaGrain.desc",
					value: {
						format: "tianlight-preset",
						version: 1,
						layers: { version: 2, slots: [presetSlot("preset", "grain", 0.38, "overlay"), presetSlot("preset", "vignette", 0.5, "multiply")] },
					},
				},
				{
					id: "night-glow",
					labelKey: "lib.preset.nightGlow.label",
					descKey: "lib.preset.nightGlow.desc",
					value: {
						format: "tianlight-preset",
						version: 1,
						layers: { version: 2, slots: [presetSlot("preset", "glow", 0.35, "screen"), presetSlot("preset", "scan", 0.18, "normal")] },
					},
				},
				{
					id: "clean",
					labelKey: "lib.preset.clean.label",
					descKey: "lib.preset.clean.desc",
					value: {
						format: "tianlight-preset",
						version: 1,
						layers: { version: 2, slots: [presetSlot("none", "none", 0.55, "normal"), presetSlot("none", "none", 0.55, "normal")] },
					},
				},
			];

			const WallpaperPanel = (props) => {
				// v0.5.0: re-render on a language change. This hook is the first hook in
				// the component so the hook order stays fixed for its whole lifetime.
				const { t } = useTl5I18n();
				const [items, setItems] = React.useState([]);
				const [active, setActive] = React.useState(() => {
					const chosen = readWallpaperChoice();
					return chosen === null ? "" : chosen.url;
				});
				// The full choice, not just its URL: the frame picker needs kind + still.
				const [activeChoice, setActiveChoice] = React.useState(() => readWallpaperChoice());
				const [draft, setDraft] = React.useState("");
				const [draftKind, setDraftKind] = React.useState("auto");
				const [draftBusy, setDraftBusy] = React.useState(false);
				const [draftNote, setDraftNote] = React.useState("");
				const [noteText, setNote] = React.useState("");
				const [weOpen, setWeOpen] = React.useState(false);
				// The source row is a real tab: it owns the highlight and the list contents.
				// "local" shows assets/, "we" shows the WE roots, "url" swaps the grid for
				// the URL composer, and "shader" for the GLSL editor.
				// "all" is the default: the panel opens on a single wallpaper grid, not a
				// source questionnaire. local/we are filters; URL and GLSL are composers.
				const [sourceTab, setSourceTab] = React.useState("all");
				const [composer, setComposer] = React.useState("none");
				// Two surfaces, one panel: "pick" is just sources + the list; "advanced"
				// reveals the adjustment groups. The old six-section wall was the main
				// complaint, so the default view no longer shows it at all.
				const [view, setView] = React.useState("pick");
				// v0.5.3 quick picker: "更多设置"/"返回快捷选择" replace the old
				// discoverability hint; the pick view is a pure visual grid.
				const [toast, setToast] = React.useState(null);
				const [pickError, setPickError] = React.useState("");
				const showToast = (text) => {
					const next = { text, at: Date.now() };
					setToast(next);
					globalThis.setTimeout(() => {
						setToast((current) => (current !== null && current.at === next.at ? null : current));
					}, 1800);
				};
				// ---- library: search, favourites and tags ----
				const [library, setLibrary] = React.useState(() => wallpaperLibraryController.read());
				const [query, setQuery] = React.useState("");
				const [favoritesOnly, setFavoritesOnly] = React.useState(false);
				const [showHidden, setShowHidden] = React.useState(false);
				const [tagFilter, setTagFilter] = React.useState([]);
				const [tagEditorUrl, setTagEditorUrl] = React.useState("");
				const [tagDraft, setTagDraft] = React.useState("");
				const [uploadBusy, setUploadBusy] = React.useState(false);
				const [uploadNote, setUploadNote] = React.useState("");
				// ---- v0.5.2: wallpaper list loading / retry state ----
				// "loading" until the first _wallpapers answer (or its silent retry);
				// "error" only after both attempts failed, with an inline retry button.
				const [listState, setListState] = React.useState("loading");
				const [listAttempt, setListAttempt] = React.useState(0);
				const applyWallpaperList = (list) => {
					if (list === null) return;
					setItems(list);
					setListState("ready");
				};
				// ---- library v2: explicit sort + recent-use order ----
				const [sortMode, setSortMode] = React.useState("name");
				const [recentUrls, setRecentUrls] = React.useState(() => readPanelRecent());
				const rememberWallpaper = (url) => {
					if (typeof url !== "string" || url === "") return;
					// S4: one shared recent-list implementation (also used by the WE library);
					// the panel mirrors the returned order into React state.
					setRecentUrls(tl5RememberRecent(url));
				};
				// Optional engine availability, fetched once: the WE tab tells the truth
				// about scene support instead of rendering a dead card.
				const [engine, setEngine] = React.useState(null);
				const [engineProbe, setEngineProbe] = React.useState(0);
				React.useEffect(() => {
					let alive = true;
					// The api query is the host/client route-contract handshake: a host that
					// speaks a different contract answers `stale: true`, which the panel
					// surfaces as a "restart DSH" hint instead of a bare network error. The
					// host build number is diagnostics only, so a browser-half update no
					// longer demands a restart.
					void fetch(ASSET_BASE + "/_engines?api=" + encodeURIComponent(HOST_API), { cache: "no-store" })
						.then((response) => (response.ok ? response.json() : null))
						.then((value) => {
							rememberHostIdentity(value);
							if (alive) setEngine(value ?? { webwallgl: false, adapter: false, sceneProjects: 0, unreachable: true });
						})
						.catch(() => {
							// A failed request is NOT "host too old": the host may be healthy and
							// the network (or a reload) transiently broken. Track it separately so
							// the panel never tells the user to restart DSH for a network blip.
							if (alive) setEngine({ webwallgl: false, adapter: false, sceneProjects: 0, unreachable: true });
						});
					return () => {
						alive = false;
					};
				}, [engineProbe]);
				const hostStale = engine !== null && engine.stale === true;
				const hostUnreachable = engine !== null && engine.unreachable === true;
				// ---- ShaderToy-style GLSL editor ----
				const [shader, setShader] = React.useState(() => shaderController.read());
				const [shaderStatus, setShaderStatus] = React.useState("");
				const [audio, setAudio] = React.useState(() => audioController.read());
				const [audioNote, setAudioNote] = React.useState("");
				React.useEffect(() => audioController.subscribe((next) => setAudio(next)), []);
				const readSceneMedia = () => {
					if (typeof document === "undefined") return null;
					const scene = document.querySelector("[data-tl-scene]");
					if (scene === null) return null;
					const width = Number(scene.dataset.tlWidth) || 0;
					const height = Number(scene.dataset.tlHeight) || 0;
					const fps = Number(scene.dataset.tlFps) || 0;
					const jitter = Number(scene.dataset.tlJitter) || 0;
					return {
						width,
						height,
						fps,
						jitter,
						duration: Number(scene.dataset.tlDuration) || 0,
						kind: scene.dataset.tlMedia ?? "",
						state: scene.dataset.tlState ?? "",
						play: scene.dataset.tlPlay ?? "",
						reason: scene.dataset.tlReason ?? "",
					};
				};
				const [mediaInfo, setMediaInfo] = React.useState(() => readSceneMedia());
				React.useEffect(() => {
					if (typeof document === "undefined" || typeof MutationObserver !== "function") return;
					const scene = document.querySelector("[data-tl-scene]");
					if (scene === null) return;
					// FPS/jitter mutate every second. Coalesce them so the panel does not
					// re-render (and re-wrap its quality line) on every video frame tick.
					let syncTimer = 0;
					let lastSync = 0;
					const sync = () => {
						if (syncTimer !== 0) return;
						const wait = Math.max(0, 1800 - (performance.now() - lastSync));
						syncTimer = globalThis.setTimeout(() => {
							syncTimer = 0;
							lastSync = performance.now();
							setMediaInfo(readSceneMedia());
						}, wait);
					};
					sync();
					const observer = new MutationObserver(sync);
					observer.observe(scene, {
						attributes: true,
						attributeFilter: [
							"data-tl-media",
							"data-tl-width",
							"data-tl-height",
							"data-tl-duration",
							"data-tl-state",
							"data-tl-play",
							"data-tl-reason",
							"data-tl-fps",
							"data-tl-jitter",
						],
					});
					return () => {
						observer.disconnect();
						if (syncTimer !== 0) globalThis.clearTimeout(syncTimer);
					};
				}, []);
				// Live playback/lownpower state. The scene publishes; the panel renders the
				// exact reason a wallpaper is parked instead of guessing from a boolean.
				// FPS changes arrive here every second; only status/reason are rendered from
				// this state, so a pure frame-rate tick must not re-render the whole panel
				// (that was a visible layout shimmer while reading).
				const [playStatus, setPlayStatus] = React.useState(() => sceneStatusController.read());
				React.useEffect(
					() =>
						sceneStatusController.subscribe((next) =>
							setPlayStatus((current) =>
								current.status === next.status && current.reason === next.reason ? current : next,
							),
						),
					[],
				);
				const [powerState, setPowerState] = React.useState(() => {
					const controller = lowPowerController;
					return controller === null || typeof controller.state !== "function"
						? { mode: readLowPowerMode(), active: false, reason: "", detail: "", detailKey: "", detailParams: null }
						: controller.state();
				});
				React.useEffect(() => {
					const controller = lowPowerController;
					if (controller === null || typeof controller.subscribe !== "function") return undefined;
					return controller.subscribe((next) => setPowerState(next));
				}, []);
				// ---- video static-frame picker ----
				const [frames, setFrames] = React.useState([]);
				const [frameSource, setFrameSource] = React.useState("");
				const [frameStatus, setFrameStatus] = React.useState("");
				const [frameBusy, setFrameBusy] = React.useState(false);
				const [weDraft, setWeDraft] = React.useState("");
				const [weStatus, setWeStatus] = React.useState("");
				const [weLibraryNote, setWeLibraryNote] = React.useState("");
				/**
				 * v0.6.0: the Wallpaper Engine library is a DSH settings page owned by
				 * src/72-we-library.js. The panel only requests it: a cancelable
				 * CustomEvent on window; a listener that handles it calls preventDefault().
				 * Without a listener the panel shows the "Settings → Wallpaper" fallback.
				 */
				const openWallpaperLibrary = () => {
					let handled = false;
					try {
						const event = new CustomEvent("tianlight:open-wallpaper-library", {
							bubbles: true,
							cancelable: true,
							detail: { source: "wallpaper-panel", engineCount },
						});
						handled = globalThis.dispatchEvent(event) === false || event.defaultPrevented === true;
					} catch (error) {
						note("we-library:open", error);
					}
					setWeLibraryNote(handled ? t("lib.we.openRequested") : t("lib.we.openFallback"));
				};
				const openWe = () => {
					setWeOpen(true);
					setNote("");
					void (async () => {
						try {
							const response = await fetch(ASSET_BASE + "/_we-roots", { cache: "no-store" });
							if (!response.ok) throw new Error(String(response.status));
							const value = await response.json();
							setWeDraft(Array.isArray(value.roots) ? value.roots.join("\n") : "");
						} catch {
							setWeStatus(t("lib.we.readFailed"));
						}
					})();
				};
				const saveWe = () => {
					setWeStatus(t("lib.we.saving"));
					void (async () => {
						try {
							const roots = weDraft
								.split(/\r?\n/)
								.map((line) => line.trim())
								.filter((line) => line !== "");
							const response = await fetch(ASSET_BASE + "/_we-roots", {
								method: "POST",
								headers: { "content-type": "application/json" },
								body: JSON.stringify(roots),
							});
							if (!response.ok) throw new Error(String(response.status));
							const value = await response.json();
							const kept = Array.isArray(value.roots) ? value.roots.length : 0;
							const skipped = Number(value.skipped) || 0;
							setWeStatus(
								t("lib.we.savedPrefix") +
									kept +
									t("lib.we.savedDirs") +
									(skipped > 0 ? t("lib.punct.openParen") + skipped + t("lib.we.savedSkipped") : ""),
							);
							void listWallpapers().then(applyWallpaperList);
						} catch {
							setWeStatus(t("lib.we.saveFailed"));
						}
					})();
				};
				// ---- v0.5.2: list load with one silent retry ----
				// The panel used to show "全部 0 / 0 张" forever when the first _wallpapers
				// request lost a race with the host (or hit a transient error). Now the
				// summary/hint say "加载中…" during the attempt, one retry happens after
				// ~1.2s, and only a second failure surfaces the reason + inline retry.
				React.useEffect(() => {
					let alive = true;
					let retryTimer = 0;
					const load = (attempt) => {
						void listWallpapers().then((list) => {
							if (alive === false) return;
							if (list !== null) {
								setItems(list);
								setListState("ready");
								return;
							}
							if (attempt === 0) {
								setListState("loading");
								retryTimer = globalThis.setTimeout(() => {
									retryTimer = 0;
									if (alive) load(1);
								}, PANEL_LIST_RETRY_MS);
								return;
							}
							setListState("error");
						});
					};
					setListState("loading");
					load(0);
					return () => {
						alive = false;
						if (retryTimer !== 0) globalThis.clearTimeout(retryTimer);
					};
				}, [listAttempt]);
				const pick = (choice) => {
					// The URL and ShaderToy editors call this from an async handler: report the
					// outcome instead of silently doing nothing (wallpaper module disabled) or
					// letting a scene exception strand the editor in its "applied" state.
					if (wallpaperController === null) return { ok: false, reason: null };
					try {
						wallpaperController.apply(choice);
					} catch (error) {
						note("wallpaper:pick", error);
						return { ok: false, reason: String(error?.message ?? error) };
					}
					setActive(choice === null ? "" : choice.url);
					setActiveChoice(choice);
					// v0.5.0: an explicit pick feeds the "最近使用" sort. Automatic
					// rotation deliberately does not, so the order stays the user's.
					if (choice !== null) rememberWallpaper(choice.url);
					return { ok: true };
				};
				/**
				 * v0.5.3: card click path. The ring is optimistic (state is set before the
				 * controller call, so the highlight lands in the same React batch), and a
				 * throwing controller reverts it and shows an inline error instead of
				 * silently swallowing the click.
				 */
				const pickCard = (choice, name) => {
					setPickError("");
					// A disabled wallpaper module leaves wallpaperController null: that is a
					// real failure the user must see, not a silent dead click.
					if (wallpaperController === null) {
						setPickError(t("lib.pick.noScene"));
						return;
					}
					const previousActive = active;
					const previousChoice = activeChoice;
					setActive(choice === null ? "" : choice.url);
					setActiveChoice(choice);
					try {
						wallpaperController.apply(choice);
						if (choice !== null) rememberWallpaper(choice.url);
						showToast(t("lib.pick.applied", { name }));
					} catch (error) {
						setActive(previousActive);
						setActiveChoice(previousChoice);
						setPickError(t("lib.pick.failed", { reason: String(error?.message ?? error) }));
					}
				};
				/**
				 * v1.6.7: URL and ShaderToy are first-class sources in the DEFAULT picker.
				 * Both editors live in the advanced view, so a quick-source click switches
				 * views, opens the matching composer and scrolls its editor into view. The
				 * editor is mounted one render later: the lookup runs in a timeout and a
				 * missing node (panel closed meanwhile) is a silent no-op.
				 */
				const openQuickSource = (id) => {
					setView("advanced");
					setComposer(id);
					setSourceTab("all");
					setNote("");
					setPickError("");
					if (id === "url") setDraftNote("");
					else setShaderStatus("");
					globalThis.setTimeout(() => {
						try {
							if (typeof document === "undefined") return;
							// The editors live inside the collapsible ② group: if the user collapsed
							// it earlier, scrolling to a hidden input does nothing. Opening it here
							// matches what the filter chips already do for the same group.
							const list = document.querySelector("[data-tl-wall-list]");
							if (list !== null) list.open = true;
							const target = document.querySelector(
								id === "url" ? "[data-tl-wall-url-input]" : "[data-tl-wall-shader-input]",
							);
							if (target !== null) target.scrollIntoView?.({ block: "nearest" });
						} catch {
							// scrolling is a convenience; a closed panel must not throw
						}
					}, 0);
				};
				// ---- the only zone question that matters: separate or continuous ----
				const [zones, setZones] = React.useState(() => readZones());
				// Pan only has meaning when the crop is smaller than the frame; at 100%
				// there is nothing off-screen to move into view.
				const cropInfo = cropWindow(zones.main);
				const pannable = Number(cropInfo.w) < 1 || Number(cropInfo.h) < 1;
				const [glassLevel, setGlassLevel] = React.useState(() => readGlass());
				const [layers, setLayers] = React.useState(() => layerController.read());
				const [playback, setPlayback] = React.useState(() => playbackController.read());
				const updatePlayback = (patch) => {
					const next = playbackController.apply({ ...playback, ...patch });
					setPlayback(next);
				};
				const pauseWallpaper = () => {
					updatePlayback({ paused: true });
				};
				const resumeWallpaper = () => {
					updatePlayback({ paused: false });
				};
				const [layerSlot, setLayerSlot] = React.useState(0);
				const layerSlots = layers.slots;
				const selectedSlot = layerSlots[layerSlot];
				const layerSlotLabel = (slot) => {
					if (slot === undefined || slot.kind === "none") return t("lib.ctrl.off");
					if (slot.kind === "image") return slot.url === "" ? t("lib.slot.imageUnset") : t("lib.kind.image");
					return slot.preset === "none" ? t("lib.ctrl.off") : LAYER_LABELS[slot.preset] ?? t("lib.slot.preset");
				};
				const updateLayerSlot = (index, patch) => {
					const slots = layerSlots.map((slot, position) => (position === index ? { ...slot, ...patch } : slot));
					const next = layerController.apply({ version: 2, slots });
					setLayers(next);
				};
				const swapLayers = () => {
					const next = layerController.apply({ version: 2, slots: [layerSlots[1], layerSlots[0]] });
					setLayers(next);
				};
				const [powerMode, setPowerMode] = React.useState(() => readLowPowerMode());
				const [fpsMode, setFpsMode] = React.useState(() => renderTierController.read());
				// ---- automatic rotation ----
				const [rotation, setRotation] = React.useState(() => rotationController.read());
				React.useEffect(() => rotationController.subscribe((next) => setRotation(next)), []);
				React.useEffect(
					() =>
						rotationController.observe((choice) => {
							if (choice === null) return;
							// Rotation writes the same source the picker does; mirror it into the
							// panel so "当前壁纸" never lags behind the scene.
							setActive(choice.url);
							setActiveChoice(choice);
						}),
					[],
				);
				const updateRotation = (patch) => setRotation(rotationController.apply({ ...rotation, ...patch }));
				// ---- recipe v2 import / export ----
				const [presetText, setPresetText] = React.useState("");
				const [presetStatus, setPresetStatus] = React.useState("");
				// v2.3.0: the one shared accessor from the platform theme bridge. A private
				// ctx.get("theme") probe here ran at panel mount (a different time than the
				// bridge's injection) and could disagree with it after a hot reload.
				const resolveThemeService = () => tl5ThemeService() ?? undefined;
				/**
				 * Recipe v2 = v1 fields + the v0.5.0 sections. effects/context/legibility
				 * are declared in fragments that run before this one; readTypography /
				 * applyTypography are function declarations in the later font fragment, so
				 * they are only referenced through TYPE OF guards evaluated at click time
				 * (never at module scope), and every optional section is try/caught.
				 */
				const buildShareRecipe = () => {
					const recipe = {
						format: "tianlight-recipe",
						version: 2,
						zones: readZones(),
						glass: readGlass(),
						lowPower: readLowPowerMode(),
						wallpaper: readWallpaperChoice(),
						shader: shaderController.read(),
						layers: layerController.read(),
						playback: playbackController.read(),
						rotation: rotationController.read(),
					};
					// v1/v2 compatibility: v2 writes the contract's lowercase spelling as an
					// alias while lowPower stays the canonical field the apply path reads.
					recipe.lowpower = recipe.lowPower;
					try {
						if (typeof effectsController !== "undefined" && effectsController !== null && typeof effectsController.read === "function") {
							recipe.effects = effectsController.read();
						}
					} catch {
						// an optional section must never block the rest of the recipe
					}
					try {
						if (typeof contextController !== "undefined" && contextController !== null && typeof contextController.read === "function") {
							recipe.context = contextController.read();
						}
					} catch {
						// optional
					}
					try {
						if (typeof legibilityController !== "undefined" && legibilityController !== null && typeof legibilityController.read === "function") {
							recipe.legibility = legibilityController.read();
						}
					} catch {
						// optional
					}
					try {
						if (typeof readTypography === "function") recipe.typography = readTypography();
					} catch {
						// optional
					}
					return recipe;
				};
				const exportPreset = () => {
					try {
						setPresetText(JSON.stringify(buildShareRecipe()));
						setPresetStatus(t("lib.recipeExported"));
					} catch {
						setPresetStatus(t("lib.recipeBadValue"));
					}
				};
				const applyPresetValue = (value) => {
					if (value === null || typeof value !== "object") return "lib.recipeBadValue";
					let shaderRejected = false;
					try {
						// Re-validated by the existing readers: a hand-edited preset cannot push
						// values the UI itself would never produce.
						if (value.zones !== undefined) {
							const clean = normalizeZones(value.zones);
							setZones(clean);
							if (zoneController !== null) zoneController.apply(clean);
						}
						if (typeof value.glass === "number") {
							const next = Math.min(1.5, Math.max(0.35, value.glass));
							setGlassLevel(next);
							if (glassController !== null) glassController.apply(next);
						}
						// v2 export writes lowPower; v1-style links or hand edits may write
						// lowpower, so both spellings are accepted and normalized here.
						const lowPowerValue =
							value.lowPower === "auto" || value.lowPower === "on" || value.lowPower === "off"
								? value.lowPower
								: value.lowpower === "auto" || value.lowpower === "on" || value.lowpower === "off"
									? value.lowpower
									: null;
						if (lowPowerValue !== null) {
							setPowerMode(lowPowerValue);
							if (lowPowerController !== null) lowPowerController.set(lowPowerValue);
						}
						if (value.layers !== null && typeof value.layers === "object") {
							const clean = layerController.apply(value.layers);
							setLayers(clean);
						}
						if (value.playback !== null && typeof value.playback === "object") {
							const clean = playbackController.apply(value.playback);
							setPlayback(clean);
						}
						if (value.rotation !== null && typeof value.rotation === "object") {
							const clean = rotationController.apply(value.rotation);
							setRotation(clean);
						}
						// A recipe is the only way a shared shader travels; compile it here so a
						// broken paste cannot poison the saved settings.
						if (value.shader !== null && typeof value.shader === "object" && typeof value.shader.source === "string") {
							const error = validateShaderSource(value.shader.source);
							if (error === null) {
								const next = {
									preset: typeof value.shader.preset === "string" ? value.shader.preset : "custom",
									source: value.shader.source,
									speed: clampNumber(value.shader.speed, 0.1, 3, SHADER_DEFAULTS.speed),
									intensity: clampNumber(value.shader.intensity, 0, 2, SHADER_DEFAULTS.intensity),
									hue: clampNumber(value.shader.hue, 0, 1, SHADER_DEFAULTS.hue),
								};
								shaderController.save(next);
								setShader(next);
							} else {
								shaderRejected = true;
							}
						}
						if (value.wallpaper !== undefined && value.wallpaper !== null) {
							const verdict = resolveWallpaperChoice(value.wallpaper);
							if (verdict.ok === true) {
								setActive(verdict.choice.url);
								setActiveChoice(verdict.choice);
								if (wallpaperController !== null) wallpaperController.apply(verdict.choice);
							}
						}
						// ---- v0.5.0 recipe sections ----
						// Only keys the owning controller declares are copied, and only when
						// the source value has the declared type: a hand-edited share link can
						// never push a nested object into a boolean/enum slot.
						const patchOf = (source, defaults) => {
							const patch = {};
							if (source === null || typeof source !== "object" || defaults === null || typeof defaults !== "object") return patch;
							for (const key of Object.keys(defaults)) {
								if (Object.prototype.hasOwnProperty.call(source, key) === false) continue;
								if (typeof source[key] !== typeof defaults[key]) continue;
								patch[key] = source[key];
							}
							return patch;
						};
						const applyControllerPatch = (controller, defaults, source) => {
							if (typeof controller === "undefined" || controller === null || typeof controller.apply !== "function") return;
							const patch = patchOf(source, typeof defaults === "undefined" ? null : defaults);
							if (Object.keys(patch).length > 0) controller.apply(patch);
						};
						if (typeof effectsController !== "undefined") {
							applyControllerPatch(
								effectsController,
								typeof EFFECTS_DEFAULTS === "undefined" ? null : EFFECTS_DEFAULTS,
								value.effects,
							);
						}
						if (typeof contextController !== "undefined") {
							applyControllerPatch(
								contextController,
								typeof CONTEXT_DEFAULTS === "undefined" ? null : CONTEXT_DEFAULTS,
								value.context,
							);
						}
						if (typeof legibilityController !== "undefined") {
							applyControllerPatch(
								legibilityController,
								typeof LEGIBILITY_DEFAULTS === "undefined" ? null : LEGIBILITY_DEFAULTS,
								value.legibility,
							);
						}
						if (typeof readTypography === "function" && typeof applyTypography === "function") {
							const typography = value.typography;
							if (typography !== null && typeof typography === "object") {
								// Merge only fields the typography model actually declares, with a
								// matching type: v0.5.0 added fields (content width, paragraph
								// spacing, code size, reading family) travel without this panel
								// knowing their names, and a hand-edited link cannot invent keys.
								const current = readTypography();
								const next = { ...current };
								for (const key of Object.keys(current)) {
									if (Object.prototype.hasOwnProperty.call(typography, key) === false) continue;
									if (typeof typography[key] !== typeof current[key]) continue;
									next[key] = typography[key];
								}
								// Size is the one field the host API accepts directly: clamp it here
								// so a shared recipe cannot push an out-of-range font size.
								if (Number.isFinite(next.size)) next.size = Math.min(22, Math.max(12, Math.round(next.size)));
								applyTypography(resolveThemeService(), next, true);
							}
						}
					} catch {
						return "lib.recipeBadApply";
					}
					return shaderRejected ? "lib.recipeAppliedShader" : "lib.recipeApplied";
				};
				const importPreset = () => {
					try {
						const value = JSON.parse(presetText);
						setPresetStatus(t(applyPresetValue(value)));
					} catch {
						setPresetStatus(t("lib.recipeBadText"));
					}
				};
				const applyCuratedPreset = (preset) => {
					setPresetText(JSON.stringify(preset.value));
					const status = applyPresetValue(preset.value);
					setPresetStatus(
						status === "lib.recipeApplied" ? t("lib.preset.applied", { name: t(preset.labelKey) }) : t(status),
					);
				};
				// ---- v0.5.0 D3: share link (#tl=<base64url recipe v2>) ----
				const [shareLink, setShareLink] = React.useState("");
				const [shareNote, setShareNote] = React.useState("");
				// v0.5.3: shareStatus stores the i18n KEY (not the rendered string), so a
				// language switch re-renders it; no empty-deps translation cache is left.
				const [shareStatus, setShareStatus] = React.useState(() =>
					props !== undefined && props.shareRejected === true ? "lib.shareInvalid" : "",
				);
				// A recipe parsed from the URL (install time or a later open) is a pending
				// PROPOSAL: it is displayed in a confirm strip and never applied until the
				// user clicks 应用. Invalid links are dropped by readTl5ShareHash without
				// touching settings.
				const [sharedRecipe, setSharedRecipe] = React.useState(() =>
					props !== undefined && props.sharedRecipe !== undefined && props.sharedRecipe !== null
						? props.sharedRecipe
						: null,
				);
				React.useEffect(() => {
					if (sharedRecipe !== null) return;
					const hash = String(globalThis.location?.hash ?? "");
					if (hash.startsWith("#tl=") === false) return;
					const next = readTl5ShareHash();
					if (next === null) {
						setShareStatus("lib.shareInvalid");
						return;
					}
					pendingShare = next;
					setSharedRecipe(next);
				}, []);
				const copyShareLink = () => {
					try {
						const payload = tl5Base64UrlEncode(JSON.stringify(buildShareRecipe()));
						const location = globalThis.location;
						const base =
							String(location?.origin ?? "") + String(location?.pathname ?? "") + String(location?.search ?? "");
						const link = base + "#tl=" + payload;
						setShareLink(link);
						setShareNote(payload.length > 6000 ? t("lib.shareLong") : "");
						const clipboard = globalThis.navigator?.clipboard;
						if (clipboard !== null && clipboard !== undefined && typeof clipboard.writeText === "function") {
							void clipboard.writeText(link).then(
								() => setShareNote(t("lib.shareCopied")),
								() => setShareNote(t("lib.shareFailed")),
							);
						} else {
							// No async clipboard here: the textarea below is the manual fallback.
							setShareNote(t("lib.shareFailed"));
						}
					} catch (error) {
						setShareNote(t("lib.shareBuildFail", { reason: String(error?.message ?? error) }));
					}
				};
				const clearSharedRecipe = () => {
					pendingShare = null;
					clearTl5ShareHash();
					setSharedRecipe(null);
				};
				const applySharedRecipe = () => {
					if (sharedRecipe === null) return;
					try {
						setPresetStatus(t(applyPresetValue(sharedRecipe.recipe)));
						setShareStatus("lib.shareApplied");
					} catch {
						setShareStatus("lib.shareInvalid");
					}
					clearSharedRecipe();
				};
				const ignoreSharedRecipe = () => {
					clearSharedRecipe();
					setShareStatus("lib.shareIgnored");
				};
				// ---- v0.5.0 D2: bundle export / import (gated on host capabilities) ----
				const [bundleBusy, setBundleBusy] = React.useState(false);
				const [bundleNote, setBundleNote] = React.useState("");
				const [importBusy, setImportBusy] = React.useState(false);
				const [importPct, setImportPct] = React.useState(0);
				const [importNote, setImportNote] = React.useState("");
				// R5: importing merges settings/recipes/wallpapers (destructive), so the
				// label arms first and the file picker only opens on the second click.
				const [importArmed, setImportArmed] = React.useState(false);
				const hostCapabilities =
					engine !== null && typeof engine.capabilities === "object" && engine.capabilities !== null
						? engine.capabilities
						: null;
				const hostCapability = (name) => {
					if (hostCapabilities === null) return false;
					const direct = hostCapabilities[name];
					if (typeof direct === "boolean") return direct;
					if (direct !== undefined && direct !== null) return direct !== false;
					const routes = hostCapabilities.routes;
					if (Array.isArray(routes)) return routes.includes(name);
					if (routes !== null && typeof routes === "object") {
						const entry = routes[name];
						if (typeof entry === "boolean") return entry;
						if (typeof entry === "string") return true;
					}
					// A host that publishes a capabilities object is new enough for the
					// v0.5.0 routes; only an explicit false hides a control.
					return true;
				};
				const bundleSupported = hostCapability("bundle") === true;
				const importSupported = hostCapability("import") === true;
				const exportBundle = () => {
					if (bundleBusy) return;
					setBundleBusy(true);
					setBundleNote(t("lib.bundleExportBusy"));
					try {
						// The host streams the tar.gz straight to the browser: a plain anchor
						// download never buffers the archive in page memory. The query that
						// used to carry the client build marker is gone: the host ignores
						// `_bundle` search parameters and the route contract is the handshake.
						const link = document.createElement("a");
						link.href = ASSET_BASE + "/_bundle";
						link.download = "tianlight-bundle-" + new Date().toISOString().slice(0, 10) + ".tgz";
						link.rel = "noopener";
						document.body.appendChild(link);
						link.click();
						link.remove();
						setBundleNote(t("lib.bundleExportStarted"));
					} catch (error) {
						setBundleNote(t("lib.bundleExportFail", { reason: String(error?.message ?? error) }));
					}
					globalThis.setTimeout(() => setBundleBusy(false), 400);
				};
				const importBundle = (event) => {
					const input = event.currentTarget;
					const file = input.files !== null && input.files.length > 0 ? input.files[0] : null;
					// Clear immediately so picking the same file twice still fires onChange.
					input.value = "";
					setImportArmed(false);
					if (file === null || importBusy) return;
					if (/\.(tgz|tar\.gz)$/i.test(file.name) === false && /gzip/.test(file.type) === false) {
						setImportNote(t("lib.bundleImportType"));
						return;
					}
					if (file.size > PANEL_BUNDLE_LIMIT) {
						setImportNote(t("lib.bundleImportSize", { mb: Math.round(PANEL_BUNDLE_LIMIT / (1024 * 1024)) }));
						return;
					}
					setImportBusy(true);
					setImportPct(0);
					setImportNote(t("lib.bundleImporting"));
					try {
						// XHR (not fetch) because the upload progress bar is the only honest
						// signal for a large archive; failures never clear existing config.
						// The host accepts gzip/octet-stream and rejects anything else with 415.
						const xhr = new XMLHttpRequest();
						xhr.open("POST", ASSET_BASE + "/_import");
						const mime = String(file.type || "");
						xhr.setRequestHeader("content-type", /gzip/.test(mime) || /octet-stream/.test(mime) ? mime : "application/gzip");
						xhr.upload.onprogress = (progress) => {
							if (progress.lengthComputable && progress.total > 0) {
								setImportPct(Math.round((progress.loaded / progress.total) * 100));
							}
						};
						xhr.onerror = () => {
							setImportBusy(false);
							setImportNote(t("lib.bundleImportFail", { reason: "network" }));
						};
						xhr.onload = () => {
							setImportBusy(false);
							let value = null;
							try {
								value = JSON.parse(xhr.responseText);
							} catch {
								value = null;
							}
							if (xhr.status < 200 || xhr.status >= 300) {
								// JSON errors carry a message; plain-text failures (405/413/415)
								// are short enough to show verbatim.
								const plain = typeof xhr.responseText === "string" ? xhr.responseText.trim().slice(0, 160) : "";
								const reason =
									value !== null && typeof value.error === "string"
										? value.error
										: plain !== ""
											? plain
											: "HTTP " + xhr.status;
								setImportNote(t("lib.bundleImportFail", { reason }));
								return;
							}
							const imported = value !== null && Array.isArray(value.imported) ? value.imported.length : 0;
							const skipped = value !== null && Array.isArray(value.skipped) ? value.skipped.length : 0;
							setImportNote(t("lib.bundleImportDone", { imported, skipped }) + " · " + t("lib.bundleImportSettings"));
							// The settings layer owns the merge; this event is a notification for
							// anyone listening, and the manifest refresh is what the panel needs.
							if (value !== null && value.settings !== null && typeof value.settings === "object") {
								try {
									globalThis.dispatchEvent(
										new CustomEvent("tianlight:settings", { detail: { settings: value.settings, source: "bundle" } }),
									);
								} catch {
									// a notification is best effort
								}
								// Pull the freshly merged host settings into the browser mirror now;
								// a missing settings layer just means "reload applies them" instead.
								try {
									if (typeof settingsStore !== "undefined" && settingsStore !== null) {
										if (typeof settingsStore.bootstrap === "function") void settingsStore.bootstrap();
										else if (typeof settingsStore.forceSync === "function") void settingsStore.forceSync();
									}
								} catch {
									// the import already succeeded on the host
								}
							}
							void listWallpapers().then(applyWallpaperList);
							setEngineProbe((current) => current + 1);
						};
						xhr.send(file);
					} catch (error) {
						setImportBusy(false);
						setImportNote(t("lib.bundleImportFail", { reason: String(error?.message ?? error) }));
					}
				};
				const applyDraft = async () => {
					const url = draft.trim();
					if (url === "") {
						setDraftNote(t("lib.url.empty"));
						return;
					}
					let parsed = null;
					try {
						parsed = new URL(url);
					} catch {
						parsed = null;
					}
					if (parsed === null || (parsed.protocol !== "http:" && parsed.protocol !== "https:")) {
						setDraftNote(t("lib.url.scheme"));
						return;
					}
					if (globalThis.location?.protocol === "https:" && parsed.protocol === "http:") {
						setDraftNote(t("lib.url.httpsBlocked"));
						return;
					}
					setDraftBusy(true);
					setDraftNote(t("lib.url.checking"));
					// Extension first; when the link is signed/extensionless, probe the media
					// itself instead of defaulting every unknown URL to "video" (which made
					// ordinary image CDN links fail).
					const clean = url.split(/[?#]/)[0];
					let kind = draftKind === "image" ? "image" : draftKind === "video" ? "video" : null;
					if (kind === null) kind = tl5MediaKindFromName(clean);
					if (kind === null) kind = await probeUrlKind(url);
					if (kind === null) {
						setDraftBusy(false);
						setDraftNote(t("lib.url.notMedia"));
						return;
					}
					setNote("");
					// Applying can legitimately fail (wallpaper module off, scene threw): only
					// claim success when the scene really took the choice.
					const result = pick({ kind, url });
					setDraftBusy(false);
					if (result.ok === false) {
						setDraftNote(
							result.reason === null
								? t("lib.pick.noScene")
								: t("lib.pick.failed", { reason: result.reason }),
						);
						return;
					}
					setDraftNote(t("lib.url.applied") + (kind === "image" ? t("lib.kind.image") : t("lib.kind.video")) + " · " + (parsed.hostname || t("lib.url.remoteHost")));
				};
				const applyShader = () => {
					const error = validateShaderSource(shader.source);
					if (error !== null) {
						setShaderStatus(t("lib.shader.compileFailed") + error);
						return;
					}
					shaderController.save(shader);
					// The shader settings are only half the switch: the composition kind must
					// reach the saved choice too, or a reload falls back to the old wallpaper.
					const result = pick({ kind: "shader", url: "shader://live" });
					if (result.ok === false) {
						setShaderStatus(
							result.reason === null
								? t("lib.pick.noScene")
								: t("lib.pick.failed", { reason: result.reason }),
						);
						return;
					}
					setShaderStatus(t("lib.shader.applied"));
				};
				const resetShader = () => {
					setShader({ ...SHADER_DEFAULTS });
					setShaderStatus(t("lib.shader.reset"));
				};
				const toggleAudio = async () => {
					if (audio.active) {
						audioController.stop(t("lib.audio.stopped"));
						setAudioNote("");
						return;
					}
					setAudioNote(t("lib.audio.requesting"));
					const result = await audioController.start();
					setAudioNote(result.ok === true ? "" : result.reason ?? t("lib.audio.failed"));
				};
				const useAudioPreset = () => {
					const preset = SHADER_PRESETS.find((entry) => entry.id === "audio");
					if (preset === undefined) return;
					setShader((current) => ({ ...current, preset: preset.id, source: preset.source }));
					setShaderStatus(t("lib.shader.audioPreset"));
				};
				// ---- video still-frame picker ----
				const requestFrames = () => {
					if (activeChoice === null || activeChoice.kind !== "video") return;
					const url = activeChoice.url;
					setFrameBusy(true);
					setFrameStatus(t("lib.frame.sampling"));
					void sampleVideoFrames(url, 6).then((result) => {
						setFrameBusy(false);
						if (result.ok === true) {
							setFrames(result.frames);
							setFrameSource(url);
							setFrameStatus(t("lib.frame.pickHint"));
						} else {
							setFrames([]);
							setFrameSource("");
							setFrameStatus(result.reason);
						}
					});
				};
				const applyFrame = (time) => {
					if (activeChoice === null || activeChoice.kind !== "video") return;
					pick({ kind: "video", url: activeChoice.url, still: time });
					setFrameStatus(t("lib.frame.pinned") + Number(time).toFixed(1) + "s");
				};
				const resumeVideo = () => {
					if (activeChoice === null || activeChoice.kind !== "video") return;
					pick({ kind: "video", url: activeChoice.url });
					setFrameStatus(t("lib.frame.resumed"));
				};
				// ---- library helpers: one read path, one write path ----
				const metaOf = (item) => library.items[item.url] ?? { favorite: false, tags: [], hidden: false };
				const nameOf = (item) =>
					item.id.replace(/^ext:\d+:/, "").replace(/^web:\d+:/, "").replace(/^uploads\//, "").replace(/^scene:\d+:/, "");
				// Kind is searchable and sortable in v2: "视频" matches every video even
				// when the file name is a hash, which is what a wall paper library needs.
				const kindLabelOf = (item) =>
					item.kind === "video"
						? t("lib.kind.video")
						: item.kind === "scene"
							? t("lib.kind.scene")
							: item.kind === "shader"
								? t("lib.kind.shader")
								: item.kind === "web"
									? t("lib.kind.web")
									: t("lib.kind.image");
				const kindRank = (item) => (item.kind === "image" ? 0 : item.kind === "video" ? 1 : item.kind === "scene" ? 2 : 3);
				// ---- v0.6.0: auto-detected Wallpaper Engine library items ----
				// host-core appends WE items to /_wallpapers; they are identified by
				// source:"we"/weId and must need no folder configuration at all.
				const isEngineItem = (item) =>
					item !== null &&
					typeof item === "object" &&
					(item.source === "we" || typeof item.weId === "string" || (typeof item.id === "string" && item.id.startsWith("we:")));
				const isLegacyWeItem = (item) =>
					isEngineItem(item) === false &&
					(item.url.includes("/ext/") === true || item.kind === "scene" || item.kind === "web");
				const engineSourceOf = (item) => {
					const raw = String(item.weSource ?? "").toLowerCase();
					if (raw === "steam" || raw === "workshop") return "steam";
					if (raw === "project" || raw === "local" || raw === "mine") return "project";
					// Tolerate a host that only distinguishes the roots via the item path/id.
					const sourceField = String(item.source ?? "").toLowerCase();
					if (sourceField === "steam" || sourceField === "workshop") return "steam";
					if (sourceField === "project" || sourceField === "local" || sourceField === "mine") return "project";
					const label = [item.weId, item.id, item.path, item.url]
						.filter((entry) => typeof entry === "string")
						.join(" ");
					return /steam|workshop|431960|steamapps/i.test(label) ? "steam" : "project";
				};
				const engineTypeOf = (item) => {
					const type = String(item.weType ?? "").toLowerCase();
					return type === "video" || type === "scene" || type === "web" || type === "image" ? type : "";
				};
				const engineLabelOf = (item) => {
					const type = engineTypeOf(item);
					if (type === "video") return t("lib.kind.video");
					if (type === "scene") return t("lib.kind.scene");
					if (type === "web") return t("lib.kind.web");
					if (type === "image") return t("lib.kind.image");
					return t("lib.source.engine");
				};
				const badgeOf = (item) =>
					isEngineItem(item)
						? engineLabelOf(item)
						: item.kind === "video"
							? t("lib.kind.video")
							: item.kind === "scene"
								? t("lib.card.scene")
								: item.kind === "web"
									? t("lib.card.web")
									: t("lib.kind.image");
				// All thumbnails prefer the host preview; a WE video preview must never be
				// replaced by the media URL (that would download the whole wallpaper).
				const previewOf = (item) => (typeof item.preview === "string" ? item.preview : "");
				const displayNameOf = (item) =>
					(isEngineItem(item) || item.kind === "scene" || item.kind === "web") &&
					typeof item.title === "string" &&
					item.title !== ""
						? item.title
						: nameOf(item);
				const updateMeta = (url, patch) => {
					const current = library.items[url] ?? { favorite: false, tags: [], hidden: false };
					const next = { ...current, ...patch };
					const nextItems = { ...library.items };
					if (next.favorite === false && next.tags.length === 0 && next.hidden !== true) delete nextItems[url];
					else nextItems[url] = next;
					const model = { items: nextItems };
					wallpaperLibraryController.write(model);
					setLibrary(model);
				};
				/** v2.3.0: record this library entry as the light/dark slot wallpaper. */
				const assignAppearanceSlot = (slot, id) => {
					const api = globalThis.tianlightAppearance;
					if (api === null || api === undefined || typeof api.apply !== "function") return;
					try {
						api.apply({ wallpapers: { [slot]: id } });
						setNote(
							t("appearance.wallpaper.applySlot", {
								slot: slot === "dark" ? t("appearance.mode.dark") : t("appearance.mode.light"),
							}),
						);
					} catch (error) {
						note("wallpaper:appearance-slot", error);
					}
				};
				const formatBytes = (bytes) => {
					if (!Number.isFinite(bytes) || bytes <= 0) return "";
					const mb = bytes / (1024 * 1024);
					if (mb >= 1024) return (mb / 1024).toFixed(1) + "GB";
					return mb >= 1 ? mb.toFixed(1) + "MB" : Math.max(1, Math.round(bytes / 1024)) + "KB";
				};
				const uploadLimit =
					engine !== null && engine.upload !== undefined && Number.isFinite(engine.upload.max) ? engine.upload.max : UPLOAD_LIMIT;
				const uploadLimitMb = Math.round(uploadLimit / (1024 * 1024));
				const uploadWallpaper = (event) => {
					const input = event.currentTarget;
					const file = input.files !== null && input.files.length > 0 ? input.files[0] : null;
					// Clear immediately: picking the same file twice must still fire onChange.
					input.value = "";
					if (file === null) return;
					if (hostStale) {
						setUploadNote(t("lib.upload.hostStale"));
						return;
					}
					if (hostUnreachable) {
						setUploadNote(t("lib.engine.unreachable"));
						return;
					}
					if (engine !== null && engine.upload !== undefined && engine.upload.writable === false) {
						setUploadNote(t("lib.upload.notWritable"));
						return;
					}
					// S4: shared upload pre-flight (same format set/limits as the role hub).
					const uploadVerdict = tl5ValidateUploadFile(file, uploadLimit);
					if (uploadVerdict.ok !== true) {
						if (uploadVerdict.code === "too-big") {
							setUploadNote(t("lib.upload.tooBigPrefix") + uploadLimitMb + t("lib.upload.tooBigSuffix"));
						} else {
							setUploadNote(t("lib.upload.types"));
						}
						return;
					}
					setUploadBusy(true);
					setUploadNote(t("lib.upload.busy"));
					void (async () => {
						try {
							const response = await fetch(ASSET_BASE + "/_upload?name=" + encodeURIComponent(file.name), {
								method: "POST",
								headers: { "content-type": file.type || "application/octet-stream" },
								body: file,
							});
							const value = await response.json().catch(() => null);
							if (!response.ok) throw new Error(value?.error ?? String(response.status));
							setUploadNote(t("lib.upload.done") + String(value?.item?.id ?? file.name).replace(/^uploads\//, ""));
							applyWallpaperList(await listWallpapers());
						} catch (error) {
							setUploadNote(t("lib.upload.failed") + String(error?.message ?? error));
						} finally {
							setUploadBusy(false);
						}
					})();
				};
				const allTags = [
					...new Set(Object.values(library.items).flatMap((entry) => entry.tags ?? [])),
				].sort((left, right) => left.localeCompare(right));
				// A selected tag can outlive the last item that carried it (removed while the
				// filter is on); keep it in the row so it can still be switched off.
				const tagChoices = [...new Set([...allTags, ...tagFilter])].sort((left, right) => left.localeCompare(right));
				const filtersActive = query.trim() !== "" || favoritesOnly || tagFilter.length > 0;
				const hiddenCount = items.filter((item) => metaOf(item).hidden === true).length;
				const favoriteCount = items.filter((item) => metaOf(item).favorite === true).length;
				// v0.6.0 source tabs: all | local (our own assets/uploads) | we (legacy
				// WE folders from v0.5) | engine (auto-detected Wallpaper Engine library).
				const matchesSourceTab = (item) => {
					if (sourceTab === "all") return true;
					if (sourceTab === "we") return isLegacyWeItem(item);
					if (sourceTab === "engine") return isEngineItem(item);
					return isLegacyWeItem(item) === false && isEngineItem(item) === false;
				};
				const allCount = items.length;
				const visibleItems = items
					.filter(matchesSourceTab)
					.filter((item) => showHidden || metaOf(item).hidden !== true)
					.filter((item) => favoritesOnly === false || metaOf(item).favorite)
					// v2 facet semantics: multiple selected tags narrow the list (AND), so
					// "夜景 + 4K" finds the intersection instead of the union.
					.filter((item) => tagFilter.length === 0 || tagFilter.every((tag) => metaOf(item).tags.includes(tag)))
					.filter((item) => {
						const needle = query.trim().toLowerCase();
						if (needle === "") return true;
						// v0.6.0: WE items are searchable by their library title and weType
						// (video/scene/web/image) on top of the normal name/kind/tag haystack.
						return (
							displayNameOf(item) +
							" " +
							nameOf(item) +
							" " +
							kindLabelOf(item) +
							" " +
							(isEngineItem(item) ? engineLabelOf(item) + " " : "") +
							String(item.title ?? "") +
							" " +
							String(item.weType ?? "") +
							" " +
							item.kind +
							" " +
							item.id +
							" #" +
							metaOf(item).tags.join(" #")
						)
							.toLowerCase()
							.includes(needle);
					})
					.map((item) => ({ item, meta: metaOf(item) }));
				// v0.5.0 D1: sort is a pure view concern — the ② summary keeps reporting
				// "filtered / all" counts and the order is stable for every mode.
				const sortLibraryItems = (list) => {
					const copy = [...list];
					const byName = (left, right) =>
						displayNameOf(left.item).localeCompare(displayNameOf(right.item), "zh") || left.item.id.localeCompare(right.item.id);
					if (sortMode === "kind") {
						copy.sort((left, right) => kindRank(left.item) - kindRank(right.item) || byName(left, right));
					} else if (sortMode === "recent") {
						const rank = (entry) => {
							const index = recentUrls.indexOf(entry.item.url);
							return index < 0 ? Number.MAX_SAFE_INTEGER : index;
						};
						copy.sort((left, right) => rank(left) - rank(right) || byName(left, right));
					} else if (sortMode === "favorites") {
						copy.sort(
							(left, right) =>
								Number(right.meta.favorite === true) - Number(left.meta.favorite === true) || byName(left, right),
						);
					} else {
						copy.sort(byName);
					}
					return copy;
				};
				const sortedItems = sortLibraryItems(visibleItems);
				const editingItem = tagEditorUrl === "" ? null : items.find((item) => item.url === tagEditorUrl) ?? null;
				const editingMeta = editingItem === null ? { favorite: false, tags: [] } : metaOf(editingItem);
				const addTag = () => {
					if (editingItem === null) return;
					const tag = tagDraft.trim().slice(0, LIBRARY_TAG_LENGTH);
					if (tag === "" || editingMeta.tags.includes(tag)) {
						setTagDraft("");
						return;
					}
					updateMeta(editingItem.url, { tags: [...editingMeta.tags, tag].slice(0, LIBRARY_TAG_MAX) });
					setTagDraft("");
				};
				const removeTag = (tag) => {
					if (editingItem === null) return;
					updateMeta(editingItem.url, { tags: editingMeta.tags.filter((entry) => entry !== tag) });
				};
				// Plain-language orientation: what is showing now, and one sentence telling
				// the active source what to do next.
				const engineItems = items.filter(isEngineItem);
				const engineCount = engineItems.length;
				const engineSteamCount = engineItems.filter((item) => engineSourceOf(item) === "steam").length;
				const engineProjectCount = engineCount - engineSteamCount;
				const localCount = items.filter((item) => isLegacyWeItem(item) === false && isEngineItem(item) === false).length;
				const weCount = items.filter(isLegacyWeItem).length;
				const sceneCount = items.filter((item) => item.kind === "scene").length;
				const currentTitle = (() => {
					if (activeChoice === null) return t("lib.current.auto");
					const activeItem = items.find((entry) => entry.url === activeChoice.url) ?? null;
					if (activeItem !== null && isEngineItem(activeItem)) {
						return t("lib.source.engine") + " · " + displayNameOf(activeItem);
					}
					if (activeChoice.kind === "scene" || activeChoice.kind === "web") {
						const item = activeItem;
						const prefix = activeChoice.kind === "web" ? t("lib.current.webPrefix") : t("lib.current.scenePrefix");
						return prefix + (item !== undefined && item.title !== undefined ? item.title : activeChoice.url.slice(activeChoice.url.lastIndexOf("/") + 1));
					}
					if (activeChoice.kind === "shader") {
						const preset = SHADER_PRESETS.find((entry) => entry.id === shader.preset);
						return "ShaderToy · " + (preset === undefined ? t("lib.current.customShader") : preset.label);
					}
					const file = activeChoice.url.slice(activeChoice.url.lastIndexOf("/") + 1) || t("lib.current.unnamed");
					const kind = activeChoice.kind === "image" ? t("lib.kind.image") : activeChoice.still !== undefined ? t("lib.current.videoStill") : t("lib.kind.video");
					return kind + " · " + file;
				})();
				const screenWidth = Math.round((globalThis.innerWidth || 0) * (globalThis.devicePixelRatio || 1));
				const screenHeight = Math.round((globalThis.innerHeight || 0) * (globalThis.devicePixelRatio || 1));
				const croppedWidth = Math.round((mediaInfo === null ? 0 : mediaInfo.width) * Number(cropInfo.w));
				const croppedHeight = Math.round((mediaInfo === null ? 0 : mediaInfo.height) * Number(cropInfo.h));
				let qualityNote = "";
				if (mediaInfo !== null && mediaInfo.state === "error") {
					qualityNote = t("lib.quality.loadFailed");
				} else if (mediaInfo !== null && mediaInfo.kind === "scene") {
					qualityNote =
						t("lib.quality.scene") +
						(mediaInfo.fps > 0 ? t("lib.quality.measured") + mediaInfo.fps + "fps" : "") +
						(engine !== null && engine.webwallgl === false ? t("lib.quality.engineNotReady") : "");
				} else if (mediaInfo !== null && mediaInfo.kind === "shader") {
					qualityNote = t("lib.quality.shader");
				} else if (mediaInfo !== null && mediaInfo.kind === "web") {
					// A WE web project runs in 30-wallpaper's sandboxed iframe; this line only
					// reports it (the panel must never mount the iframe itself).
					qualityNote = t("lib.quality.web");
				} else if (mediaInfo !== null && mediaInfo.width > 0 && mediaInfo.height > 0) {
					qualityNote =
						t("lib.quality.source") +
						mediaInfo.width +
						"×" +
						mediaInfo.height +
						t("lib.quality.crop") +
						croppedWidth +
						"×" +
						croppedHeight +
						"px";
					const upscaled =
						zones.main.fit === "contain"
							? screenWidth > 0 && croppedWidth + 1 < screenWidth && croppedHeight + 1 < screenHeight
							: screenWidth > 0 && (croppedWidth + 1 < screenWidth || croppedHeight + 1 < screenHeight);
					qualityNote += upscaled ? t("lib.quality.upscaled") : t("lib.quality.native");
					if (mediaInfo.fps > 0) {
						qualityNote += t("lib.quality.measured") + mediaInfo.fps + "fps" + (mediaInfo.fps < 50 ? t("lib.quality.low") : "");
					}
					if (mediaInfo.width >= 7680 || mediaInfo.height >= 4320) qualityNote += t("lib.quality.eightK");
					if (mediaInfo.duration > 0) {
						const minutes = Math.floor(mediaInfo.duration / 60);
						const seconds = String(mediaInfo.duration % 60).padStart(2, "0");
						qualityNote += t("lib.quality.duration") + minutes + ":" + seconds;
					}
				}
				const lowPowerActive = powerState.active === true;
				const hasStaticFrame = activeChoice !== null && activeChoice.kind === "video" && activeChoice.still !== undefined;
				const isVideoWallpaper =
					activeChoice !== null ? activeChoice.kind === "video" : mediaInfo !== null && mediaInfo.kind === "video";
				const isShaderWallpaper =
					activeChoice !== null ? activeChoice.kind === "shader" : mediaInfo !== null && mediaInfo.kind === "shader";
				const isImageWallpaper =
					activeChoice !== null ? activeChoice.kind === "image" : mediaInfo !== null && mediaInfo.kind === "image";
				const isSceneWallpaper =
					activeChoice !== null ? activeChoice.kind === "scene" : mediaInfo !== null && mediaInfo.kind === "scene";
				const isWebWallpaper =
					activeChoice !== null ? activeChoice.kind === "web" : mediaInfo !== null && mediaInfo.kind === "web";
				// One vocabulary for "is the wallpaper actually moving", fed by the scene
				// bus rather than inferred from a paused DOM element.
				const playState = playStatus.status || (mediaInfo === null ? "" : mediaInfo.play);
				const playReason = playStatus.reason || (mediaInfo === null ? "" : mediaInfo.reason);
				const sceneBroken = playState === "error";
				const isBlocked = playState === "blocked";
				const isStalled = playState === "stalled";
				const isBuffering = playState === "loading" || playState === "buffering";
				const isMoving = playState === "playing";
				const isPaused = playState === "paused" || playState === "hidden" || playState === "ready";
				const lowPowerReasonLabel =
					powerState.reason === "reduced-motion"
						? t("lib.power.reducedMotion")
						: powerState.reason === "save-data"
							? t("lib.power.saveData")
							: powerState.reason === "battery"
								? // v0.5.2: 55-lowpower now hands back a language-neutral detail
									// ("15%") plus detailKey/detailParams, so the full sentence is
									// localized at render time (switching language re-renders it).
									typeof powerState.detailKey === "string" && powerState.detailKey !== ""
									? t(powerState.detailKey, powerState.detailParams ?? {})
									: powerState.detail || t("lib.power.battery")
								: powerState.reason === "manual"
									? t("lib.power.manual")
									: "";
				const statusLabel = lowPowerActive
					? t("lib.status.lowPower")
					: hasStaticFrame
						? t("lib.status.still")
						: isBlocked
							? t("lib.status.blocked")
							: isStalled
								? t("lib.status.stalled")
								: sceneBroken
									? t("lib.status.failed")
									: isImageWallpaper
										? t("lib.status.image")
										: isBuffering
											? t("lib.status.loading")
											: isMoving
												? isSceneWallpaper
													? t("lib.status.scene")
													: isShaderWallpaper
														? t("lib.status.shader")
														: isWebWallpaper
															? t("lib.status.web")
															: t("lib.status.playing")
												: playState === "idle"
													? t("lib.status.idle")
													: isPaused
														? t("lib.status.paused")
														: t("lib.status.ready");
				const statusTone = lowPowerActive || hasStaticFrame
					? "warn"
					: isBlocked || isStalled || sceneBroken
						? "alert"
						: isMoving
							? "live"
							: "idle";
				const statusHint = lowPowerActive
					? t("lib.hint.lowPowerPauseOpen") + (lowPowerReasonLabel || t("lib.power.mode")) + t("lib.hint.lowPowerPauseClose")
					: hasStaticFrame
						? t("lib.hint.still")
						: isBlocked
							? t("lib.hint.blocked")
							: isStalled
								? t("lib.hint.stalled")
								: sceneBroken
									? t("lib.hint.decodeFailedOpen") + (playReason || t("lib.common.unknownReason")) + t("lib.hint.decodeFailedClose")
									: playState === "idle"
										? t("lib.hint.idle")
										: isBuffering
										? t("lib.hint.buffering")
										: isMoving
											? isSceneWallpaper
												? t("lib.hint.scene")
												: isShaderWallpaper
													? t("lib.hint.shader")
													: isWebWallpaper
														? t("lib.hint.web")
														: t("lib.hint.videoPlaying")
											: isPaused
												? t("lib.hint.paused")
												: t("lib.hint.ready");
				const showPlaybackAction = isVideoWallpaper || isShaderWallpaper || isSceneWallpaper || isWebWallpaper;
				const actionLabel = lowPowerActive
					? t("lib.action.lowPowerPlay")
					: hasStaticFrame
						? t("lib.action.backToMotion")
						: isBlocked
							? t("lib.action.play")
							: isStalled || sceneBroken
								? t("lib.action.retry")
								: isMoving
									? t("lib.action.pause")
									: t("lib.action.resume");
				const playWallpaper = () => {
					if (lowPowerActive) {
						setPowerMode("off");
						if (lowPowerController !== null) lowPowerController.set("off");
					}
					if (hasStaticFrame) {
						updatePlayback({ paused: false });
						resumeVideo();
						return;
					}
					if (isMoving) {
						pauseWallpaper();
						return;
					}
					if (isStalled || sceneBroken) {
						// Reload the current source without changing the saved choice.
						if (wallpaperController !== null) wallpaperController.reload();
						else pick(activeChoice);
						return;
					}
					// Persisted resume: the controller applies it to the scene, so a reload
					// keeps the same intent instead of silently starting to play again.
					resumeWallpaper();
				};
				const qualityExtra = (() => {
					if (mediaInfo === null) return "";
					if (mediaInfo.jitter > 0 && mediaInfo.fps > 0) {
						return t("lib.quality.jitter") + mediaInfo.jitter + "ms" + (mediaInfo.jitter > 90 ? t("lib.quality.high") : "");
					}
					return "";
				})();
				const readyListHint =
					composer === "url"
						? t("lib.listHint.url")
						: composer === "shader"
							? t("lib.listHint.shader")
							: sourceTab === "engine"
								? t("lib.listHint.engine", { n: engineCount })
								: sourceTab === "we"
								? t("lib.listHint.weOpen") +
									weCount +
									t("lib.unit.items") +
									(sceneCount > 0 ? t("lib.listHint.weSceneOpen") + sceneCount + t("lib.punct.closeParen") : "") +
									t("lib.listHint.weClose")
								: sourceTab === "local"
									? t("lib.listHint.local") + localCount + t("lib.listHint.localSuffix")
									: t("lib.listHint.all") +
										allCount +
										t("lib.listHint.allMiddle") +
										localCount +
										" / WE " +
										weCount +
										t("lib.listHint.allSuffix");
				// v0.5.2 loading/retry gates the ② copy: the v0.5.1 strings below are only
				// used once the list state is "ready".
				const listErrorText = hostStale ? t("lib.list.errHostStale") : t("lib.list.errNetwork");
				const listHint =
					listState === "loading"
						? t("lib.list.loadingHint")
						: listState === "error"
							? listErrorText
							: readyListHint;
				const sourceValue =
					composer === "url"
						? t("lib.source.url")
						: composer === "shader"
							? "ShaderToy"
							: sourceTab === "engine"
								? t("lib.source.engine")
								: sourceTab === "we"
									? "Wallpaper Engine"
									: sourceTab === "local"
										? t("lib.source.local")
										: t("lib.source.all");
				const readyListValue =
					composer === "url"
						? t("lib.listValue.pasteUrl")
						: composer === "shader"
							? "GLSL"
							: sourceTab === "all" && filtersActive === false
								? allCount + t("lib.unit.items")
								: // A filtered list states both numbers: "0 / 3 张" is honest about
									// an empty WE filter, while a bare "0 张" next to chips reading
									// "全部 3" looked like the library had lost its wallpapers.
									visibleItems.length + " / " + allCount + t("lib.unit.items");
				const listValue =
					listState === "loading"
						? t("lib.list.loading")
						: listState === "error"
							? t("lib.list.failed")
							: readyListValue;
				const framingValue = zones.main.zoom + "% · " + (zones.main.ratio === "auto" ? t("lib.ctrl.auto") : zones.main.ratio);
				const activeLayerLabels = layerSlots
					.filter((slot) =>
						slot.kind === "preset"
							? slot.preset !== "none"
							: slot.kind === "image"
								? slot.url !== ""
								: false,
					)
					.map((slot) => layerSlotLabel(slot));
				const appearanceValue =
					t("lib.appearance.glassPrefix") +
					Math.round(glassLevel * 100) +
					"%" +
					(activeLayerLabels.length === 0 ? "" : " · " + activeLayerLabels.join(" + "));
				const performanceValue =
					(powerMode === "auto" ? t("lib.perf.powerAuto") : powerMode === "on" ? t("lib.perf.powerOn") : t("lib.perf.powerOff")) +
					" · " +
					(fpsMode === "auto" ? "30fps" : fpsMode + "fps") +
					(rotation.on ? t("lib.perf.rotationOn") : "");
				const groupSummary = (step, title, value) =>
					React.createElement(
						"summary",
						{ className: "tl-wall-group-summary" },
						React.createElement("span", { className: "tl-wall-step" }, step),
						React.createElement("span", { className: "tl-wall-group-title" }, title),
						React.createElement("span", { className: "tl-wall-summary-value" }, value),
					);
				return React.createElement(
					"div",
					{ className: "tl-wall-inner", "data-tl-view": view },
					React.createElement("div", { className: "tl-wall-glow", "data-tl-wall-glow": "" }),
					React.createElement(
						"div",
						{ className: "tl-wall-sticky", "data-tl-wall-drag": "" },
						React.createElement(
							"div",
							{ className: "tl-wall-head" },
							React.createElement("div", { className: "tl-font-title" }, t("lib.panel.title")),
							view === "pick"
								? React.createElement(
										"button",
										{
											type: "button",
											className: "tl-font-option tl-wall-more-settings",
											"data-tl-more-settings": "",
											onClick: () => setView("advanced"),
										},
										t("lib.pick.more"),
									)
								: null,
							React.createElement(
								"div",
								{ className: "tl-wall-view-switch" },
								[
									["pick", t("lib.view.pick")],
									["advanced", t("lib.view.advanced")],
								].map(([value, label]) =>
									React.createElement(
										"button",
										{
											key: value,
											type: "button",
											"data-active": view === value ? "" : undefined,
											onClick: () => {
												setView(value);
												setPickError("");
												// Simple view has no filter row; clear hidden filters so the list
												// cannot look mysteriously empty after leaving 高级.
												if (value === "pick") {
													setQuery("");
													setFavoritesOnly(false);
													setTagFilter([]);
													setShowHidden(false);
													setTagEditorUrl("");
													setComposer("none");
												}
											},
										},
										label,
									),
								),
							),
							React.createElement(
								"button",
								{
									type: "button",
									className: "tl-font-close",
									"aria-label": t("lib.panel.close"),
									onClick: () => {
										if (props !== undefined && typeof props.onClose === "function") props.onClose();
									},
								},
								"\u00d7",
							),
						),
						// v0.5.3 quick picker: one compact status line with an immediate
						// pause/resume; the full guide only belongs to the advanced view.
						view === "pick"
							? React.createElement(
									"div",
									{ className: "tl-wall-pick-status", "data-tl-pick-status": "" },
									React.createElement(
										"p",
										{ className: "tl-wall-status", "data-tone": statusTone, title: statusHint },
										React.createElement("span", { className: "tl-wall-status-dot", "aria-hidden": "true" }),
										statusLabel,
									),
									showPlaybackAction
										? React.createElement(
												"button",
												{ type: "button", className: "tl-font-option", "data-tone": statusTone, onClick: playWallpaper },
												actionLabel,
											)
										: null,
									pickError === "" ? null : React.createElement("p", { className: "tl-wall-pick-error", "data-tl-pick-error": "" }, pickError),
								)
							: null,
						React.createElement(
							"div",
							{ className: "tl-wall-guide" },
							view === "advanced"
								? React.createElement(
										"div",
										{ className: "tl-wall-tabs" },
										React.createElement(
											"button",
											{
												type: "button",
												className: "tl-font-option tl-wall-back-quick",
												"data-tl-back-quick": "",
												onClick: () => {
													setView("pick");
													setComposer("none");
													setPickError("");
												},
											},
											t("lib.pick.back"),
										),
									)
								: null,
							view === "advanced"
								? React.createElement(
										"p",
										{ className: "tl-wall-status", "data-tone": statusTone, title: statusHint },
										React.createElement("span", { className: "tl-wall-status-dot", "aria-hidden": "true" }),
										statusLabel,
									)
								: null,
							view === "advanced"
								? React.createElement(
										"p",
										{ className: "tl-wall-current", title: activeChoice === null ? undefined : activeChoice.url },
										t("lib.current.prefix") + currentTitle,
									)
								: null,
							// v0.5.0 D3: a #tl= recipe found in the URL is a PROPOSAL. This strip
							// is the only place that can turn it into settings (应用), and an
							// invalid link never reaches it at all.
							sharedRecipe === null
								? shareStatus === ""
									? null
									: React.createElement("p", { className: "tl-wall-v05-note" }, t(shareStatus))
								: React.createElement(
										"div",
										{ className: "tl-wall-share-strip", "data-tone": "accent" },
										React.createElement(
											"p",
											{ className: "tl-wall-share-strip-text" },
											t("lib.shareDetected", { n: sharedRecipe.count }),
										),
										React.createElement(
											"div",
											{ className: "tl-wall-share-strip-actions" },
											React.createElement(
												"button",
												{ type: "button", className: "tl-font-reset", onClick: applySharedRecipe },
												t("lib.shareApply"),
											),
											React.createElement(
												"button",
												{ type: "button", className: "tl-font-option", onClick: ignoreSharedRecipe },
												t("lib.shareIgnore"),
											),
										),
										React.createElement("p", { className: "tl-wall-hint" }, t("lib.shareHint")),
									),
							// v1.6.7: URL address and ShaderToy code are first-class routes in the
							// default view. They used to live only in 高级 → ① 来源, which the pick
							// view hides; this row sits OUTSIDE every [data-tl-group] container so
							// the pick-view hiding rules can never remove it.
							// The chips below only filter the library.
							view === "pick"
								? React.createElement(
										React.Fragment,
										null,
										React.createElement(
											"div",
											{
												className: "tl-wall-quick-source",
												"data-tl-quick-source": "",
												role: "group",
												"aria-label": t("lib.quick.label"),
											},
											[
												["url", t("lib.quick.url"), t("lib.quick.urlHint")],
												["shader", t("lib.quick.shader"), t("lib.quick.shaderHint")],
											].map(([id, label, hint]) =>
												React.createElement(
													"button",
													{
														key: id,
														type: "button",
														className: "tl-source-card tl-wall-quick-source-btn",
														"data-tl-quick-source": id,
														title: hint,
														onClick: () => openQuickSource(id),
													},
													React.createElement("span", { className: "tl-source-name" }, label),
													React.createElement("span", { className: "tl-source-note" }, hint),
												),
											),
										),
										React.createElement(
											"div",
											{ className: "tl-wall-filter-row" },
											[
												["all", t("lib.source.all"), allCount],
												["local", t("lib.source.localShort"), localCount],
												["we", "WE", weCount],
												["engine", t("lib.source.engine"), engineCount],
											].map(([value, label, count]) =>
												React.createElement(
													"button",
													{
														key: value,
														type: "button",
														className: "tl-wall-filter-chip",
														"data-active": sourceTab === value && composer === "none" ? "" : undefined,
														onClick: () => {
															setSourceTab(value);
															setComposer("none");
															setNote("");
															const list = document.querySelector("[data-tl-wall-list]");
															if (list !== null) list.open = true;
															if (value === "we" && weCount === 0) openWe();
														},
													},
													// Counts are only meaningful once the list actually loaded:
													// during loading/error the chips stay label-only instead of
													// claiming "全部 0" (the v0.5.1 "0 张 forever" complaint).
													listState === "ready" ? label + " " + count : label,
												),
											),
										),
									)
								: null,
							// v0.5.3: the pick view is a wallpaper picker, not a file/URL
							// importer — URL / WE / GLSL import links only exist in 高级.
							view === "advanced"
								? React.createElement("p", { className: "tl-wall-hint" }, statusHint)
								: null,
							view === "advanced" && qualityNote + qualityExtra !== ""
								? React.createElement(
										"p",
										{ className: "tl-wall-hint tl-wall-quality", title: qualityNote + qualityExtra },
										qualityNote + qualityExtra,
									)
								: null,
							view === "advanced" && showPlaybackAction
								? React.createElement(
										"div",
										{ className: "tl-wall-tabs tl-wall-play-row" },
										React.createElement(
											"span",
											{ className: "tl-wall-label" },
											isMoving ? t("lib.label.playing") : isBlocked ? t("lib.label.unlock") : t("lib.label.play"),
										),
										React.createElement(
											"button",
											{ type: "button", className: "tl-font-option", "data-tone": statusTone, onClick: playWallpaper },
											actionLabel,
										),
									)
								: null,
						),
					),
					// ---- sources: which catalog the list below is drawn from ----
					React.createElement(
						"details",
						{ className: "tl-wall-group", open: false, "data-tl-group": "sources" },
						groupSummary("①", t("lib.group.sources"), sourceValue),
						React.createElement(
							"div",
							{ className: "tl-source-grid" },
							PROVIDERS.map((provider) =>
								React.createElement(
									"button",
									{
										key: provider.id,
										type: "button",
										className: "tl-source-card",
										// The clicked source owns the highlight, including URL, which
										// has no list of its own but is still a real choice.
										"data-active":
											provider.available &&
											(provider.id === "local"
												? sourceTab === "local" && composer === "none"
												: provider.id === "we"
													? sourceTab === "engine" && composer === "none"
													: composer === provider.id)
												? ""
												: undefined,
										"data-tl-disabled": provider.available ? undefined : "",
										title:
											provider.id === "we"
												? t("lib.we.autoDesc")
												: provider.available
													? provider.note
													: provider.label + t("lib.punct.colon") + provider.note,
										onClick: () => {
											if (provider.id === "we") {
												// v0.6.0: no folder browsing. The auto-detected library lives
												// in the DSH settings page; ask it to open and filter the grid.
												setSourceTab("engine");
												setComposer("none");
												openWallpaperLibrary();
												return;
											}
											if (provider.id === "local") {
												setSourceTab("local");
												setComposer("none");
												setNote("");
												return;
											}
											if (provider.id === "url") {
												setComposer("url");
												setNote("");
												return;
											}
											if (provider.id === "shader") {
												setComposer("shader");
												setNote("");
												return;
											}
											if (!provider.available) {
												// An unavailable source stays a note on the current tab; it must
												// not steal the selection from the source that is showing.
												setNote(provider.label + " · " + provider.note);
												globalThis.setTimeout(() => setNote(""), 6000);
												return;
											}
											setSourceTab(provider.id);
											setNote("");
										},
									},
									React.createElement("span", { className: "tl-source-name" }, provider.label),
									React.createElement(
										"span",
										{ className: "tl-source-note" },
										provider.id === "we" ? t("lib.we.autoDesc") : provider.desc,
									),
								),
							),
						),
						// Bundled vs. recommended: the shipped wallpaper is a purple character
						// loop, while the product promise is a Makoto Shinkai daylight sky. Say
						// which is which so a fresh install cannot read as a bait-and-switch.
						React.createElement(
							"p",
							{ className: "tl-wall-hint", "data-tl-wall-bundle-note": "" },
							t("lib.bundle.note"),
						),
						// v0.6.0: Wallpaper Engine is auto-detected from the app's library; the
						// folder-path editor is now only a collapsed edge-case fallback.
						React.createElement(
							"div",
							{ className: "tl-wall-tabs tl-we-auto", "data-tl-we-auto": "" },
							React.createElement(
								"span",
								{ className: "tl-wall-hint tl-we-auto-text", "data-tl-we-detected": "" },
								t("lib.we.detected", { n: engineCount, steam: engineSteamCount, project: engineProjectCount }),
							),
							React.createElement(
								"button",
								{
									type: "button",
									className: "tl-font-option tl-we-open-library",
									"data-tl-open-library": "",
									onClick: openWallpaperLibrary,
								},
								t("lib.we.openLibrary"),
							),
						),
						weLibraryNote === ""
							? null
							: React.createElement("p", { className: "tl-wall-hint", "data-tl-we-note": "" }, weLibraryNote),
						React.createElement(
							"details",
							{
								className: "tl-wall-group tl-we-manual",
								open: false,
								"data-tl-group": "we-manual",
								"data-tl-we-manual": "",
							},
							React.createElement(
								"summary",
								{
									className: "tl-wall-group-summary",
									onClick: () => {
										if (weOpen === false) openWe();
									},
								},
								React.createElement("span", { className: "tl-wall-group-title" }, t("lib.we.manual")),
							),
							weOpen
								? React.createElement(
										"div",
										{ className: "tl-we-manual-body" },
										React.createElement("p", { className: "tl-wall-hint" }, t("lib.we.hint")),
										React.createElement("textarea", {
											className: "tl-wall-textarea",
											rows: 3,
											placeholder: t("lib.we.placeholder"),
											value: weDraft,
											onChange: (event) => setWeDraft(event.target.value),
										}),
										React.createElement(
											"button",
											{ type: "button", className: "tl-font-reset", onClick: saveWe },
											t("lib.we.save"),
										),
										weStatus === "" ? null : React.createElement("p", { className: "tl-wall-hint" }, weStatus),
									)
								: React.createElement("p", { className: "tl-wall-hint" }, t("lib.we.manualHint")),
						),
						noteText === "" ? null : React.createElement("p", { className: "tl-wall-hint" }, noteText),
					),
					React.createElement(
						"details",
						{ className: "tl-wall-group", open: true, "data-tl-wall-list": "" },
						groupSummary("②", t("lib.group.list"), listValue),
						// v0.5.3: the pick view is a pure visual grid — long hints only in 高级.
						view === "advanced" ? React.createElement("p", { className: "tl-wall-hint" }, listHint) : null,
						// v0.5.2: only after the silent retry failed does the panel admit an
						// error; the ② hint carries the reason and this row adds the retry.
						listState === "error"
							? React.createElement(
									"div",
									{ className: "tl-wall-empty tl-wall-list-error" },
									// In the pick view the long hint is hidden, so the reason lives
									// inside the error row instead (no silent failure).
									view === "pick" ? React.createElement("p", { className: "tl-wall-hint" }, listErrorText) : null,
									React.createElement(
										"button",
										{
											type: "button",
											className: "tl-font-option",
											onClick: () => setListAttempt((current) => current + 1),
										},
										t("lib.action.retry"),
									),
								)
							: null,
						// v0.6.0: the WE folder-path editor moved into ① as a collapsed
						// "Advanced (manual path)" fallback; auto-detection needs no config.
						composer !== "none"
							? null
							: React.createElement(
									"div",
									{ className: "tl-wall-library" },
							// v0.5.3: upload is an advanced-view action; the pick view must not
							// contain a file picker at all.
							view === "advanced"
								? React.createElement(
								"div",
								{ className: "tl-wall-tabs" },
								React.createElement(
									"label",
									{
										className: "tl-wall-upload",
										"data-busy": uploadBusy ? "" : undefined,
										title: t("lib.upload.title"),
									},
									uploadBusy ? t("lib.upload.busy") : t("lib.upload.button"),
									React.createElement("input", {
										type: "file",
										accept: "video/*,image/*",
										disabled: uploadBusy,
										onChange: uploadWallpaper,
										style: { display: "none" },
									}),
								),
								React.createElement(
									"span",
									{ className: "tl-wall-hint" },
									hostStale
										? t("lib.upload.hostStaleShort")
											: hostUnreachable
												? t("lib.engine.unreachableShort")
												: "≤" + uploadLimitMb + t("lib.upload.limitSuffix"),
								),
								hostStale || hostUnreachable
									? React.createElement(
											"button",
											{
												type: "button",
												className: "tl-font-option",
												onClick: () => {
													setUploadNote(t("lib.upload.redetecting"));
													setEngineProbe((value) => value + 1);
												},
											},
											t("lib.upload.redetect"),
										)
									: null,
								)
								: null,
							view === "advanced" && uploadNote !== ""
								? React.createElement("p", { className: "tl-wall-hint" }, uploadNote)
								: null,
							React.createElement("input", {
								className: "tl-font-input",
								type: "search",
								placeholder: t("lib.searchPlaceholder"),
								"aria-label": t("lib.searchAria"),
								value: query,
								onChange: (event) => setQuery(event.target.value),
							}),
							// v0.5.0 D1: sort is its own labelled row, so the filter chips keep
							// their v0.4.0 shape ("全部 N" / "本地" / "WE") that skinlab asserts.
							React.createElement(
								"div",
								{ className: "tl-wall-sort-row", role: "group", "aria-label": t("lib.sort") },
								React.createElement("span", { className: "tl-wall-label" }, t("lib.sort")),
								[
									["name", t("lib.sortName")],
									["kind", t("lib.sortKind")],
									["recent", t("lib.sortRecent")],
									["favorites", t("lib.sortFavorites")],
								].map(([value, label]) =>
									React.createElement(
										"button",
										{
											key: value,
											type: "button",
											className: "tl-font-option",
											"data-active": sortMode === value ? "" : undefined,
											"aria-pressed": sortMode === value,
											onClick: () => setSortMode(value),
										},
										label,
									),
								),
							),
							// v0.5.3: favorites/tags/clear facets stay in 高级; the pick view keeps
							// only the source chips, search and sort.
							view === "advanced"
								? React.createElement(
								"div",
								{ className: "tl-wall-tabs tl-wall-filters" },
								React.createElement(
									"button",
									{
										type: "button",
										className: "tl-font-option",
										"data-active": favoritesOnly ? "" : undefined,
										"aria-pressed": favoritesOnly,
										onClick: () => setFavoritesOnly((value) => !value),
									},
									favoriteCount > 0 ? t("lib.favorites") + " " + favoriteCount : t("lib.favorites"),
								),
								hiddenCount === 0
									? null
									: React.createElement(
											"button",
											{
												type: "button",
												className: "tl-font-option",
												"data-active": showHidden ? "" : undefined,
												"aria-pressed": showHidden,
												title: t("lib.hiddenHint"),
												onClick: () => setShowHidden((value) => !value),
											},
											showHidden
												? t("lib.hiddenOn") + " " + hiddenCount
												: t("lib.hidden") + " " + hiddenCount,
										),
								tagChoices.map((tag) =>
									React.createElement(
										"button",
										{
											key: tag,
											type: "button",
											className: "tl-font-option",
											"data-active": tagFilter.includes(tag) ? "" : undefined,
											"aria-pressed": tagFilter.includes(tag),
											onClick: () =>
												setTagFilter((current) =>
													current.includes(tag)
														? current.filter((entry) => entry !== tag)
														: [...current, tag],
												),
										},
										"#" + tag,
									),
								),
								filtersActive
									? React.createElement(
											"button",
											{
												type: "button",
												className: "tl-font-option",
												onClick: () => {
													setQuery("");
													setFavoritesOnly(false);
													setTagFilter([]);
												},
											},
											t("lib.filterClear"),
										)
									: null,
								)
								: null,
						),
						editingItem === null || composer !== "none" || view !== "advanced"
							? null
							: React.createElement(
									"div",
									{ className: "tl-wall-url tl-wall-tag-editor" },
									React.createElement("p", { className: "tl-wall-hint" }, t("lib.tag.prefix") + nameOf(editingItem)),
									editingMeta.tags.length === 0
										? null
										: React.createElement(
												"div",
												{ className: "tl-wall-tabs" },
												editingMeta.tags.map((tag) =>
													React.createElement(
														"button",
														{
															key: tag,
															type: "button",
															className: "tl-font-option",
															title: t("lib.tag.remove"),
															onClick: () => removeTag(tag),
														},
														"#" + tag + " ×",
													),
												),
											),
									React.createElement("input", {
										className: "tl-font-input",
										type: "text",
										placeholder: t("lib.tag.placeholder"),
										value: tagDraft,
										onChange: (event) => setTagDraft(event.target.value),
										onKeyDown: (event) => {
											if (event.key === "Enter") {
												event.preventDefault();
												addTag();
											}
										},
									}),
									React.createElement(
										"div",
										{ className: "tl-wall-tabs" },
										React.createElement(
											"button",
											{
												type: "button",
												className: "tl-font-reset",
												onClick: () => {
													setTagEditorUrl("");
													setTagDraft("");
												},
											},
											t("lib.common.done"),
										),
									),
								),
						composer !== "none"
							? null
							: React.createElement(
									"div",
									{ className: view === "pick" ? "tl-wall-grid tl-wall-grid-pick" : "tl-wall-grid" },
							filtersActive
								? null
								: React.createElement(
										"button",
										{
											type: "button",
											className: "tl-wall-card",
											"data-tl-wall-card": "",
											"data-tl-auto-card": "",
											"data-active": active === "" ? "" : undefined,
											onClick: () => pickCard(null, t("lib.card.autoTitle")),
										},
										React.createElement("div", { className: "tl-wall-thumb tl-wall-auto" }, t("lib.ctrl.auto")),
										React.createElement("span", { className: "tl-wall-name" }, t("lib.card.autoTitle")),
										React.createElement("span", { className: "tl-wall-tags-mini" }, t("lib.card.autoNote")),
										active === "" ? React.createElement("span", { className: "tl-wall-using", "data-tl-in-use": "" }, t("lib.card.inUse")) : null,
									),
							sortedItems.map(({ item, meta }) =>
								React.createElement(
									"div",
									{ key: item.id, className: "tl-wall-cell", "data-tl-hidden": meta.hidden ? "" : undefined },
									React.createElement(
										"button",
										{
											type: "button",
											className: "tl-wall-card",
											"data-tl-wall-card": "",
											"data-tl-url": item.url,
											"data-tl-kind": item.kind,
											"data-tl-we-item": isEngineItem(item) ? "" : undefined,
											"data-tl-we-type": isEngineItem(item) ? engineTypeOf(item) || "unknown" : undefined,
											"data-active": active === item.url ? "" : undefined,
											onClick: () => pickCard({ kind: item.kind, url: item.url }, displayNameOf(item)),
										},
										React.createElement(
											"div",
											{ className: "tl-wall-thumb" },
											previewOf(item) !== ""
												? React.createElement("img", {
														// v0.6.0: every kind prefers the host preview; a WE video
														// must never be downloaded just to paint a thumbnail.
														src: previewOf(item),
														alt: displayNameOf(item),
														loading: "lazy",
														onError: (event) => {
															event.currentTarget.style.display = "none";
														},
													})
												: item.kind === "scene" || item.kind === "web"
													? React.createElement("img", {
															src: "",
															alt: displayNameOf(item),
															loading: "lazy",
															onError: (event) => {
																event.currentTarget.style.display = "none";
															},
														})
													: item.kind === "video"
														? React.createElement("video", {
																src: item.url + "#t=0.1",
																muted: true,
																preload: "metadata",
																playsInline: true,
																// A codec the browser cannot decode (e.g. HEVC) would
																// otherwise leave a black box that reads as "unreadable".
																onLoadedData: (event) => {
																	event.currentTarget.dataset.tlThumb = "";
																},
																onError: (event) => {
																	event.currentTarget.style.display = "none";
																},
															})
														: React.createElement("img", {
																src: item.url,
																alt: displayNameOf(item),
																loading: "lazy",
															}),
										),
										React.createElement("span", { className: "tl-wall-name" }, displayNameOf(item)),
										active === item.url
											? React.createElement("span", { className: "tl-wall-using", "data-tl-in-use": "" }, t("lib.card.inUse"))
											: null,
										React.createElement(
											"span",
											{ className: "tl-wall-tags-mini", "data-tl-badge": "" },
											[
												badgeOf(item),
												formatBytes(item.bytes),
												...meta.tags.map((tag) => "#" + tag),
											]
												.filter((entry) => entry !== "")
												.join(" · "),
										),
										isEngineItem(item) && engineTypeOf(item) === "scene"
											? React.createElement(
													"span",
													{ className: "tl-wall-badge-hint", "data-tl-static-hint": "", title: t("lib.we.staticHintTitle") },
													t("lib.we.staticHint"),
												)
											: null,
									),
									React.createElement(
										"button",
										{
											type: "button",
											className: "tl-wall-hide",
											"data-active": meta.hidden ? "" : undefined,
											"aria-label": meta.hidden ? t("lib.card.unhide") : t("lib.card.hide"),
											title: meta.hidden ? t("lib.card.unhideTitle") : t("lib.card.hideTitle"),
											onClick: () => updateMeta(item.url, { hidden: meta.hidden !== true }),
										},
										meta.hidden ? t("lib.card.unhideShort") : t("lib.card.hideShort"),
									),
									React.createElement(
										"button",
										{
											type: "button",
											className: "tl-wall-fav",
											"data-active": meta.favorite ? "" : undefined,
											"aria-label": meta.favorite ? t("lib.card.unfavorite") : t("lib.card.favorite"),
											title: meta.favorite ? t("lib.card.unfavorite") : t("lib.card.favorite"),
											onClick: () => updateMeta(item.url, { favorite: meta.favorite === false }),
										},
										meta.favorite ? "★" : "☆",
									),
									// v2.3.0: per-mode wallpaper slots. ☀ / ☾ assign this entry as the
									// light / dark wallpaper the appearance card switches to.
									React.createElement(
										"button",
										{
											type: "button",
											className: "tl-wall-slot",
											"data-slot": "light",
											"aria-label": t("appearance.wallpaper.applySlot", { slot: t("appearance.mode.light") }),
											title: t("appearance.wallpaper.applySlot", { slot: t("appearance.mode.light") }),
											onClick: () => assignAppearanceSlot("light", item.id),
										},
										"\u2600",
									),
									React.createElement(
										"button",
										{
											type: "button",
											className: "tl-wall-slot",
											"data-slot": "dark",
											"aria-label": t("appearance.wallpaper.applySlot", { slot: t("appearance.mode.dark") }),
											title: t("appearance.wallpaper.applySlot", { slot: t("appearance.mode.dark") }),
											onClick: () => assignAppearanceSlot("dark", item.id),
										},
										"\u263e",
									),
									// Tag editing is an advanced-view action; its editor container is
									// hidden in the pick view, so rendering the "#" there made a
									// button that could not do anything.
									view === "advanced"
										? React.createElement(
												"button",
												{
													type: "button",
													className: "tl-wall-tag-open",
													"aria-label": t("lib.card.editTags"),
													title: t("lib.card.editTags"),
													onClick: () => {
														setTagEditorUrl(item.url);
														setTagDraft("");
													},
												},
												"#",
											)
										: null,
								),
							),
						),
						composer === "none" && listState === "ready" && filtersActive && visibleItems.length === 0
							? React.createElement(
									"div",
									{ className: "tl-wall-empty" },
									React.createElement("p", { className: "tl-wall-hint" }, t("lib.filterEmpty")),
									// Show exactly which filters are narrowing the list, in a
									// language-neutral form, so "0 张" never looks like data loss.
									React.createElement(
										"p",
										{ className: "tl-wall-v05-note" },
										[
											query.trim() === "" ? "" : "🔍 " + query.trim(),
											favoritesOnly ? "★" : "",
											tagFilter.length === 0 ? "" : tagFilter.map((tag) => "#" + tag).join(" + "),
										]
											.filter((entry) => entry !== "")
											.join(" · "),
									),
									React.createElement(
										"button",
										{
											type: "button",
											className: "tl-font-option",
											onClick: () => {
												setQuery("");
												setFavoritesOnly(false);
												setTagFilter([]);
												setShowHidden(false);
											},
										},
										t("lib.filterClear"),
									),
								)
							: null,
						composer === "none" && listState === "ready" && filtersActive === false && visibleItems.length === 0
							? React.createElement(
									"div",
									{ className: "tl-wall-empty" },
									React.createElement(
										"p",
										{ className: "tl-wall-hint" },
										sourceTab === "engine"
											? t("lib.empty.engine")
											: sourceTab === "we"
												? t("lib.empty.we")
												: sourceTab === "all"
													? t("lib.empty.all")
													: t("lib.empty.local"),
									),
									// A filtered-empty list must never be a dead end: one click goes
									// back to the full library (this was the "0 张 and no way out"
									// state when the panel reopened on a stale WE filter).
									sourceTab !== "all"
										? React.createElement(
												"button",
												{
													type: "button",
													className: "tl-font-option",
													onClick: () => {
														setSourceTab("all");
														setComposer("none");
														setNote("");
													},
												},
												t("lib.empty.showAll"),
											)
										: null,
								)
							: null,
						composer === "url"
							? React.createElement(
									"p",
									{ className: "tl-wall-hint" },
									t("lib.url.hint"),
								)
							: null,
						composer === "url"
							? React.createElement(
									"div",
									{ className: "tl-wall-url" },
									React.createElement(
										"div",
										{ className: "tl-wall-tabs" },
										React.createElement("span", { className: "tl-wall-label" }, t("lib.field.type")),
										[["auto", t("lib.ctrl.auto")], ["image", t("lib.kind.image")], ["video", t("lib.kind.video")]].map(([value, label]) =>
											React.createElement(
												"button",
												{
													key: value,
													type: "button",
													className: "tl-font-option",
													"data-active": draftKind === value ? "" : undefined,
													onClick: () => {
														setDraftKind(value);
														setDraftNote("");
													},
												},
												label,
											),
										),
										React.createElement(
											"button",
											{
												type: "button",
												className: "tl-font-option",
												onClick: () => {
													void (async () => {
														try {
															const text = await globalThis.navigator?.clipboard?.readText();
															if (typeof text === "string" && text.trim() !== "") {
																setDraft(text.trim());
																setDraftNote(t("lib.url.pasted"));
																return;
															}
															setDraftNote(t("lib.url.clipboardEmpty"));
														} catch {
															setDraftNote(t("lib.url.clipboardDenied"));
														}
													})();
												},
											},
											t("lib.url.paste"),
										),
									),
									React.createElement("input", {
										className: "tl-font-input",
										type: "url",
										"data-tl-wall-url-input": "",
										placeholder: t("lib.url.placeholder"),
										value: draft,
										onChange: (event) => {
											setDraft(event.target.value);
											setDraftNote("");
										},
										onKeyDown: (event) => {
											if (event.key === "Enter" && draftBusy === false) void applyDraft();
										},
									}),
									React.createElement(
										"button",
										{
											type: "button",
											className: "tl-font-reset",
											disabled: draftBusy,
											onClick: () => void applyDraft(),
										},
										draftBusy ? t("lib.url.checkingShort") : t("lib.url.apply"),
									),
									React.createElement(
										"p",
										{ className: "tl-wall-hint" },
										draftNote === ""
											? t("lib.url.autoHint")
											: draftNote,
									),
								)
							: null,
						composer === "shader"
							? React.createElement(
									"div",
									{ className: "tl-wall-url" },
									React.createElement(
										"p",
										{ className: "tl-wall-hint" },
										t("lib.shader.intro"),
									),
									React.createElement(
										"p",
										{ className: "tl-wall-hint" },
										t("lib.shader.uniforms"),
									),
									React.createElement(
										"div",
										{ className: "tl-wall-tabs" },
										SHADER_PRESETS.map((preset) =>
											React.createElement(
												"button",
												{
													key: preset.id,
													type: "button",
													className: "tl-font-option",
													"data-active": shader.preset === preset.id ? "" : undefined,
													onClick: () => {
														setShader((current) => ({ ...current, preset: preset.id, source: preset.source }));
														setShaderStatus("");
													},
												},
												preset.label,
											),
										),
									),
									React.createElement(
										"div",
										{ className: "tl-wall-url" },
										React.createElement(
											"p",
											{ className: "tl-wall-hint" },
											t("lib.audio.hint"),
										),
										React.createElement(
											"div",
											{ className: "tl-wall-tabs" },
											React.createElement(
												"button",
												{
													type: "button",
													className: "tl-font-option",
													"data-active": audio.active ? "" : undefined,
													disabled: audio.busy,
													onClick: toggleAudio,
												},
												audio.busy ? t("lib.audio.requestingShort") : audio.active ? t("lib.audio.stop") : t("lib.audio.start"),
											),
											React.createElement(
												"button",
												{ type: "button", className: "tl-font-option", onClick: useAudioPreset },
												t("lib.audio.usePreset"),
											),
										),
										React.createElement(
											"p",
											{ className: "tl-wall-hint" },
											audioNote ||
												audio.reason ||
												(audio.active
													? t("lib.audio.active")
													: t("lib.audio.idle")),
										),
									),
									React.createElement("textarea", {
										className: "tl-wall-textarea tl-wall-code",
										rows: 8,
										spellCheck: false,
										"aria-label": t("lib.shader.sourceAria"),
										// v1.6.7: the quick-source shader entry scrolls this editor into
										// view once the advanced view has mounted it.
										"data-tl-wall-shader-input": "",
										value: shader.source,
										onChange: (event) => {
											setShader((current) => ({ ...current, preset: "custom", source: event.target.value }));
											setShaderStatus("");
										},
									}),
									React.createElement(
										"label",
										{ className: "tl-wall-slider" },
										React.createElement("span", null, t("lib.shader.speed") + shader.speed.toFixed(1) + "×"),
										React.createElement("input", {
											type: "range",
											min: 0.1,
											max: 3,
											step: 0.1,
											value: shader.speed,
											onChange: (event) =>
												setShader((current) => ({ ...current, speed: Number(event.target.value) })),
										}),
									),
									React.createElement(
										"label",
										{ className: "tl-wall-slider" },
										React.createElement("span", null, t("lib.shader.intensity") + shader.intensity.toFixed(2)),
										React.createElement("input", {
											type: "range",
											min: 0,
											max: 2,
											step: 0.05,
											value: shader.intensity,
											onChange: (event) =>
												setShader((current) => ({ ...current, intensity: Number(event.target.value) })),
										}),
									),
									React.createElement(
										"label",
										{ className: "tl-wall-slider" },
										React.createElement("span", null, t("lib.shader.hue") + Math.round(shader.hue * 100) + "%"),
										React.createElement("input", {
											type: "range",
											min: 0,
											max: 1,
											step: 0.01,
											value: shader.hue,
											onChange: (event) =>
												setShader((current) => ({ ...current, hue: Number(event.target.value) })),
										}),
									),
									React.createElement(
										"div",
										{ className: "tl-wall-tabs" },
										React.createElement("button", { type: "button", className: "tl-font-reset", onClick: applyShader }, t("lib.shader.apply")),
										React.createElement("button", { type: "button", className: "tl-font-reset", onClick: resetShader }, t("lib.shader.resetButton")),
									),
									shaderStatus === "" ? null : React.createElement("p", { className: "tl-wall-hint" }, shaderStatus),
								)
							: null,
					),
					// ---- framing: ratio-locked crop, zoom and pan ----
					React.createElement(
						"details",
						{ className: "tl-wall-group", open: false, "data-tl-group": "advanced" },
						groupSummary("③", t("lib.group.framing"), framingValue),
						// ---- ratio-locked crop ----
						React.createElement(
							"div",
							{ className: "tl-wall-tabs" },
							Object.keys(RATIOS).map((key) =>
								React.createElement(
									"button",
									{
										key,
										type: "button",
										className: "tl-font-option",
										"data-active": zones.main.ratio === key ? "" : undefined,
										onClick: () => {
											const next = { ...zones, main: { ...zones.main, ratio: key } };
											setZones(next);
											if (zoneController !== null) zoneController.apply(next);
										},
									},
									key === "auto" ? t("lib.framing.followWindow") : key,
								),
							),
						),
						React.createElement(
							"label",
							{ className: "tl-wall-slider" },
							React.createElement("span", null, t("lib.framing.zoom") + zones.main.zoom + "%"),
							React.createElement("input", {
								type: "range",
								min: 30,
								max: 300,
								step: 5,
								value: zones.main.zoom,
								onChange: (event) => {
									const next = { ...zones, main: { ...zones.main, zoom: Number(event.target.value) } };
									setZones(next);
									if (zoneController !== null) zoneController.apply(next);
								},
							}),
						),
						React.createElement(
							"label",
							{ className: "tl-wall-slider" },
							React.createElement("span", null, t("lib.framing.cx") + zones.main.cx + (pannable ? "%" : t("lib.framing.notCropped"))),
							React.createElement("input", {
								type: "range",
								min: 0,
								max: 100,
								step: 1,
								value: zones.main.cx,
								disabled: pannable === false,
								onChange: (event) => {
									const next = { ...zones, main: { ...zones.main, cx: Number(event.target.value) } };
									setZones(next);
									if (zoneController !== null) zoneController.apply(next);
								},
							}),
						),
						React.createElement(
							"label",
							{ className: "tl-wall-slider" },
							React.createElement("span", null, t("lib.framing.cy") + zones.main.cy + (pannable ? "%" : t("lib.framing.notCropped"))),
							React.createElement("input", {
								type: "range",
								min: 0,
								max: 100,
								step: 1,
								value: zones.main.cy,
								disabled: pannable === false,
								onChange: (event) => {
									const next = { ...zones, main: { ...zones.main, cy: Number(event.target.value) } };
									setZones(next);
									if (zoneController !== null) zoneController.apply(next);
								},
							}),
						),
						React.createElement(
							"p",
							{ className: "tl-wall-hint" },
							t("lib.framing.window") + ((globalThis.innerWidth || 16) / (globalThis.innerHeight || 9)).toFixed(2) + ":1" +
								(zones.main.ratio === "auto" ? t("lib.framing.cropFollows") : t("lib.framing.cropIs") + zones.main.ratio),
						),
						pannable
							? null
							: React.createElement(
									"p",
									{ className: "tl-wall-hint" },
									t("lib.framing.hint"),
								),
						React.createElement(
							"div",
							{ className: "tl-wall-url" },
							React.createElement(
								"p",
								{ className: "tl-wall-hint" },
								activeChoice === null
									? t("lib.frame.needExplicit")
									: activeChoice.kind !== "video"
										? t("lib.frame.videoOnly")
										: t("lib.frame.hint"),
							),
							activeChoice !== null && activeChoice.kind === "video"
								? React.createElement(
										"div",
										{ className: "tl-wall-tabs" },
										React.createElement(
											"button",
											{ type: "button", className: "tl-font-reset", disabled: frameBusy, onClick: requestFrames },
											frameBusy ? t("lib.frame.busy") : t("lib.frame.generate"),
										),
										activeChoice.still !== undefined
											? React.createElement(
													"button",
													{ type: "button", className: "tl-font-reset", onClick: resumeVideo },
													t("lib.action.backToMotion"),
												)
											: null,
									)
								: null,
							activeChoice !== null && activeChoice.kind === "video" && activeChoice.still !== undefined
								? React.createElement(
										"p",
										{ className: "tl-wall-hint" },
										t("lib.frame.currentPrefix") + Number(activeChoice.still).toFixed(1) + t("lib.frame.currentSuffix"),
									)
								: null,
							frameStatus === "" ? null : React.createElement("p", { className: "tl-wall-hint" }, frameStatus),
							frameSource === "" || activeChoice === null || frameSource !== activeChoice.url || frames.length === 0
								? null
								: React.createElement(
										"div",
										{ className: "tl-frame-grid" },
										frames.map((frame) =>
											React.createElement(
												"button",
												{
													key: frame.time,
													type: "button",
													className: "tl-frame",
													title: t("lib.frame.set") + Number(frame.time).toFixed(1) + "s",
													onClick: () => applyFrame(frame.time),
												},
												React.createElement("img", { src: frame.dataUrl, alt: "" }),
												React.createElement("span", null, Number(frame.time).toFixed(1) + "s"),
											),
										),
									),
						),
						isVideoWallpaper
							? React.createElement(
									"div",
									{ className: "tl-wall-url" },
									React.createElement(
										"p",
										{ className: "tl-wall-hint" },
										t("lib.playback.hint"),
									),
									React.createElement(
										"div",
										{ className: "tl-wall-tabs" },
										React.createElement("span", { className: "tl-wall-label" }, t("lib.playback.speed")),
										[0.5, 1, 1.25, 1.5].map((speed) =>
											React.createElement(
												"button",
												{
													key: speed,
													type: "button",
													className: "tl-font-option",
													"data-active": playback.speed === speed ? "" : undefined,
													onClick: () => updatePlayback({ speed }),
												},
												speed + "x",
											),
										),
									),
									React.createElement(
										"div",
										{ className: "tl-wall-tabs" },
										React.createElement(
											"button",
											{
												type: "button",
												className: "tl-font-option",
												"data-active": playback.paused ? "" : undefined,
												onClick: () => updatePlayback({ paused: playback.paused === false }),
											},
											playback.paused ? t("lib.action.resume") : t("lib.playback.pause"),
										),
										React.createElement(
											"button",
											{
												type: "button",
												className: "tl-font-option",
												"data-active": playback.flip ? "" : undefined,
												onClick: () => updatePlayback({ flip: playback.flip === false }),
											},
											t("lib.playback.flip"),
										),
									),
									React.createElement(
										"div",
										{ className: "tl-wall-tabs" },
										React.createElement("span", { className: "tl-wall-label" }, t("lib.playback.filter")),
										React.createElement(
											"button",
											{
												type: "button",
												className: "tl-font-option",
												"data-active": playback.filter.on ? "" : undefined,
												onClick: () => updatePlayback({ filter: { ...playback.filter, on: playback.filter.on === false } }),
											},
											playback.filter.on ? t("lib.ctrl.on") : t("lib.ctrl.offByDefault"),
										),
									),
									React.createElement(
										"p",
										{ className: "tl-wall-hint" },
										playback.filter.on
											? t("lib.playback.filterOnHint")
											: t("lib.playback.filterOffHint"),
									),
									playback.filter.on
										? React.createElement(
												"div",
												null,
												[
													["brightness", t("lib.filter.brightness")],
													["contrast", t("lib.filter.contrast")],
													["saturate", t("lib.filter.saturate")],
												].map(([key, label]) =>
													React.createElement(
														"label",
														{ key, className: "tl-wall-slider" },
														React.createElement("span", null, label + " " + playback.filter[key] + "%"),
														React.createElement("input", {
															type: "range",
															min: 50,
															max: 150,
															step: 5,
															value: playback.filter[key],
															onChange: (event) =>
																updatePlayback({
																	filter: { ...playback.filter, [key]: Number(event.target.value) },
																}),
														}),
													),
												),
											)
										: null,
								)
							: null,
					),
					// ---- appearance: glass and the sidebar surface ----
					React.createElement(
						"details",
						{ className: "tl-wall-group", open: false, "data-tl-group": "advanced" },
						groupSummary("④", t("lib.group.appearance"), appearanceValue),
						// ---- glass opacity ----
						React.createElement(
							"label",
							{ className: "tl-wall-slider" },
							React.createElement("span", null, t("lib.appearance.glassLabel") + Math.round(glassLevel * 100) + "%"),
							React.createElement("input", {
								type: "range",
								min: 35,
								max: 150,
								step: 5,
								value: Math.round(glassLevel * 100),
								onChange: (event) => {
									const next = Number(event.target.value) / 100;
									setGlassLevel(next);
									if (glassController !== null) glassController.apply(next);
								},
							}),
						),
						// ---- two CSS overlay slots: no decoder, no timers ----
						React.createElement(
							"div",
							{ className: "tl-wall-tabs" },
							React.createElement("span", { className: "tl-wall-label" }, t("lib.layer.slots")),
							[0, 1].map((index) =>
								React.createElement(
									"button",
									{
										key: index,
										type: "button",
										className: "tl-font-option",
										"data-active": layerSlot === index ? "" : undefined,
										onClick: () => setLayerSlot(index),
									},
									(index === 0 ? t("lib.layer.slotA") : t("lib.layer.slotB")) + " · " + layerSlotLabel(layerSlots[index]),
								),
							),
							React.createElement(
								"button",
								{ type: "button", className: "tl-font-option", onClick: swapLayers },
								t("lib.layer.swap"),
							),
						),
						React.createElement(
							"div",
							{ className: "tl-wall-tabs" },
							React.createElement("span", { className: "tl-wall-label" }, t("lib.field.type")),
							[["none", t("lib.ctrl.off")], ["preset", t("lib.slot.preset")], ["image", t("lib.kind.image")]].map(([value, label]) =>
								React.createElement(
									"button",
									{
										key: value,
										type: "button",
										className: "tl-font-option",
										"data-active": selectedSlot.kind === value ? "" : undefined,
										onClick: () =>
											updateLayerSlot(layerSlot, {
												kind: value,
												preset: value === "preset" && selectedSlot.preset === "none" ? "vignette" : selectedSlot.preset,
											}),
									},
									label,
								),
							),
						),
						selectedSlot.kind === "preset"
							? React.createElement(
									"div",
									{ className: "tl-wall-tabs" },
									React.createElement("span", { className: "tl-wall-label" }, t("lib.layer.pattern")),
									Object.entries(LAYER_LABELS).map(([value, label]) =>
										React.createElement(
											"button",
											{
												key: value,
												type: "button",
												className: "tl-font-option",
												"data-active": selectedSlot.preset === value ? "" : undefined,
												onClick: () => updateLayerSlot(layerSlot, { kind: "preset", preset: value }),
											},
											label,
										),
									),
								)
							: null,
						selectedSlot.kind === "image"
							? React.createElement(
									"div",
									{ className: "tl-wall-url" },
									React.createElement(
										"select",
										{
											className: "tl-font-select",
											"aria-label": t("lib.layer.imageAria"),
											value: items.some((item) => item.kind === "image" && item.url === selectedSlot.url) ? selectedSlot.url : "",
											onChange: (event) => updateLayerSlot(layerSlot, { kind: "image", url: event.target.value }),
										},
										React.createElement("option", { value: "" }, t("lib.layer.selectImage")),
										items
											.filter((item) => item.kind === "image")
											.map((item) => React.createElement("option", { key: item.id, value: item.url }, item.id)),
									),
									React.createElement("input", {
										className: "tl-font-input",
										type: "url",
										placeholder: t("lib.layer.pasteImage"),
										value: selectedSlot.url,
										onChange: (event) => updateLayerSlot(layerSlot, { kind: "image", url: event.target.value }),
									}),
									React.createElement(
										"div",
										{ className: "tl-wall-tabs" },
										React.createElement("span", { className: "tl-wall-label" }, t("lib.layer.fit")),
										[["cover", t("lib.layer.fitCover")], ["contain", t("lib.layer.fitContain")], ["stretch", t("lib.layer.fitStretch")]].map(([value, label]) =>
											React.createElement(
												"button",
												{
													key: value,
													type: "button",
													className: "tl-font-option",
													"data-active": selectedSlot.fit === value ? "" : undefined,
													onClick: () => updateLayerSlot(layerSlot, { fit: value }),
												},
												label,
											),
										),
									),
								)
							: null,
						selectedSlot.kind === "none"
							? React.createElement("p", { className: "tl-wall-hint" }, t("lib.layer.offHint"))
							: React.createElement(
									"label",
									{ className: "tl-wall-slider" },
									React.createElement("span", null, t("lib.layer.opacity") + Math.round(selectedSlot.opacity * 100) + "%"),
									React.createElement("input", {
										type: "range",
										min: 0,
										max: 100,
										step: 1,
										value: Math.round(selectedSlot.opacity * 100),
										onChange: (event) => updateLayerSlot(layerSlot, { opacity: Number(event.target.value) / 100 }),
									}),
								),
						selectedSlot.kind === "none"
							? null
							: React.createElement(
									"div",
									{ className: "tl-wall-tabs" },
									React.createElement("span", { className: "tl-wall-label" }, t("lib.layer.blend")),
									Object.entries(LAYER_BLEND_LABELS).map(([value, label]) =>
										React.createElement(
											"button",
											{
												key: value,
												type: "button",
												className: "tl-font-option",
												"data-active": selectedSlot.blend === value ? "" : undefined,
												onClick: () => updateLayerSlot(layerSlot, { blend: value }),
											},
											label,
										),
									),
								),
						React.createElement(
							"p",
							{ className: "tl-wall-hint" },
							t("lib.layer.hint"),
						),
						// ---- the only zone question that matters: separate or continuous ----
						React.createElement(
							"div",
							{ className: "tl-wall-tabs" },
							React.createElement("span", { className: "tl-wall-label" }, t("lib.rail.title")),
							[["no", t("lib.rail.same")], ["yes", t("lib.rail.separate")]].map(([value, label]) =>
								React.createElement(
									"button",
									{
										key: value,
										type: "button",
										className: "tl-font-option",
										"data-active": zones.separate === (value === "yes") ? "" : undefined,
										onClick: () => {
											const next = { ...zones, separate: value === "yes" };
											setZones(next);
											if (zoneController !== null) zoneController.apply(next);
										},
									},
									label,
								),
							),
						),
						zones.separate === true
							? React.createElement(
									"select",
									{
										className: "tl-font-select",
										"aria-label": t("lib.rail.title"),
										value: zones.rail.url ?? "",
										onChange: (event) => {
											const url = event.target.value;
											const item = items.find((entry) => entry.url === url);
											const next = {
												...zones,
												rail: { ...zones.rail, url, kind: item === undefined ? "video" : item.kind },
											};
											setZones(next);
											if (zoneController !== null) zoneController.apply(next);
										},
									},
									React.createElement("option", { value: "" }, t("lib.rail.follow")),
									items.map((item) =>
										React.createElement("option", { key: item.id, value: item.url }, item.id),
									),
								)
							: null,
					),
					// ---- performance: render budget and battery saving ----
					React.createElement(
						"details",
						{ className: "tl-wall-group", open: false, "data-tl-group": "advanced" },
						groupSummary("⑤", t("lib.group.performance"), performanceValue),
						React.createElement(
							"div",
							{ className: "tl-wall-tabs" },
							React.createElement("span", { className: "tl-wall-label" }, t("lib.perf.lowPower")),
							[["auto", t("lib.ctrl.auto")], ["on", t("lib.ctrl.onShort")], ["off", t("lib.ctrl.offShort")]].map(([value, label]) =>
								React.createElement(
									"button",
									{
										key: value,
										type: "button",
										className: "tl-font-option",
										"data-active": powerMode === value ? "" : undefined,
										onClick: () => {
											setPowerMode(value);
											if (lowPowerController !== null) lowPowerController.set(value);
										},
									},
									label,
								),
							),
						),
						React.createElement(
							"div",
							{ className: "tl-wall-tabs" },
							React.createElement("span", { className: "tl-wall-label" }, t("lib.perf.renderFps")),
							[["auto", t("lib.ctrl.auto")], ["60", "60"], ["30", "30"], ["15", "15"]].map(([value, label]) =>
								React.createElement(
									"button",
									{
										key: value,
										type: "button",
										className: "tl-font-option",
										"data-active": fpsMode === value ? "" : undefined,
										onClick: () => {
											setFpsMode(value);
											renderTierController.set(value);
										},
									},
									value === "auto" ? label : label + "fps",
								),
							),
						),
						React.createElement(
							"p",
							{ className: "tl-wall-hint" },
							t("lib.perf.fpsHint"),
						),
						React.createElement(
							"p",
							{ className: "tl-wall-hint" },
							powerMode === "auto"
								? t("lib.perf.autoHint")
								: powerMode === "on"
									? t("lib.perf.onHint")
									: t("lib.perf.offHint"),
						),
						React.createElement(
							"div",
							{ className: "tl-wall-tabs" },
							React.createElement("span", { className: "tl-wall-label" }, t("lib.rotation.title")),
							React.createElement(
								"button",
								{
									type: "button",
									className: "tl-font-option",
									"data-active": rotation.on ? "" : undefined,
									onClick: () => updateRotation({ on: rotation.on === false }),
								},
								rotation.on ? t("lib.ctrl.on") : t("lib.ctrl.off"),
							),
						),
						React.createElement(
							"div",
							{ className: "tl-wall-tabs" },
							React.createElement("span", { className: "tl-wall-label" }, t("lib.rotation.order")),
							[
								["sequence", t("lib.rotation.order")],
								["random", t("lib.rotation.random")],
							].map(([value, label]) =>
								React.createElement(
									"button",
									{
										key: value,
										type: "button",
										className: "tl-font-option",
										"data-active": rotation.order === value ? "" : undefined,
										onClick: () => updateRotation({ order: value }),
									},
									label,
								),
							),
						),
						React.createElement(
							"div",
							{ className: "tl-wall-tabs" },
							React.createElement("span", { className: "tl-wall-label" }, t("lib.rotation.interval")),
							ROTATION_INTERVALS.map((seconds) =>
								React.createElement(
									"button",
									{
										key: seconds,
										type: "button",
										className: "tl-font-option",
										"data-active": rotation.interval === seconds ? "" : undefined,
										onClick: () => updateRotation({ interval: seconds }),
									},
									seconds < 60 ? seconds + "s" : Math.round(seconds / 60) + t("lib.unit.minutesShort"),
								),
							),
						),
						React.createElement(
							"div",
							{ className: "tl-wall-tabs" },
							React.createElement(
								"button",
								{
									type: "button",
									className: "tl-font-option",
									"data-active": rotation.favoritesOnly ? "" : undefined,
									onClick: () => updateRotation({ favoritesOnly: rotation.favoritesOnly === false }),
								},
								t("lib.rotation.favoritesOnly"),
							),
						),
						React.createElement(
							"p",
							{ className: "tl-wall-hint" },
							rotation.on
								? t("lib.rotation.everyPrefix") +
										(rotation.interval < 60 ? rotation.interval + t("lib.unit.secondsSuffix") : Math.round(rotation.interval / 60) + t("lib.unit.minutesSuffix")) +
										t("lib.rotation.onHint")
								: t("lib.rotation.offHint"),
						),
					),
					// ---- recipe: the whole panel configuration, exportable ----
					React.createElement(
						"details",
						{ className: "tl-wall-group", open: false, "data-tl-group": "advanced" },
						groupSummary("⑥", t("lib.group.recipe"), t("lib.group.recipeValue")),
						React.createElement(
							"div",
							{ className: "tl-wall-url" },
							React.createElement(
								"p",
								{ className: "tl-wall-hint" },
								t("lib.recipeHint"),
							),
							React.createElement(
								"div",
								{ className: "tl-source-grid" },
								CURATED_PRESETS.map((preset) =>
									React.createElement(
										"button",
										{
											key: preset.id,
											type: "button",
											className: "tl-source-card",
											title: t(preset.descKey),
											onClick: () => applyCuratedPreset(preset),
										},
										React.createElement("span", { className: "tl-source-name" }, t(preset.labelKey)),
										React.createElement("span", { className: "tl-source-note" }, t(preset.descKey)),
									),
								),
							),
							React.createElement("textarea", {
								className: "tl-wall-textarea",
								rows: 3,
								placeholder: t("lib.recipePlaceholder"),
								value: presetText,
								onChange: (event) => setPresetText(event.target.value),
							}),
							React.createElement(
								"div",
								{ className: "tl-wall-tabs" },
								React.createElement("button", { type: "button", className: "tl-font-reset", onClick: exportPreset }, t("lib.exportRecipe")),
								React.createElement("button", { type: "button", className: "tl-font-reset", onClick: importPreset }, t("lib.importRecipe")),
							),
							presetStatus === "" ? null : React.createElement("p", { className: "tl-wall-hint" }, presetStatus),
							// ---- v0.5.0 D3: copy a #tl=<recipe v2> share link ----
							React.createElement(
								"div",
								{ className: "tl-wall-url" },
								React.createElement("p", { className: "tl-wall-hint" }, t("lib.shareTitle") + " · v2"),
								React.createElement(
									"div",
									{ className: "tl-wall-tabs" },
									React.createElement(
										"button",
										{ type: "button", className: "tl-font-reset", onClick: copyShareLink },
										t("lib.shareCopy"),
									),
								),
								React.createElement("p", { className: "tl-wall-hint" }, t("lib.shareHint")),
								shareLink === ""
									? null
									: React.createElement(
											"div",
											null,
											React.createElement("p", { className: "tl-wall-v05-note" }, t("lib.shareManual")),
											React.createElement("textarea", {
												className: "tl-wall-textarea",
												rows: 2,
												readOnly: true,
												"aria-label": t("lib.shareLinkAria"),
												value: shareLink,
												onFocus: (event) => event.currentTarget.select(),
											}),
										),
								shareNote === "" ? null : React.createElement("p", { className: "tl-wall-hint" }, shareNote),
							),
							// ---- v0.5.0 D2: export / import the host bundle ----
							bundleSupported || importSupported
								? React.createElement(
										"div",
										{ className: "tl-wall-url" },
										React.createElement("p", { className: "tl-wall-hint" }, t("lib.bundleTitle")),
										React.createElement(
											"div",
											{ className: "tl-wall-bundle-row" },
											bundleSupported
												? React.createElement(
														"button",
														{
															type: "button",
															className: "tl-font-reset",
															disabled: bundleBusy,
															onClick: exportBundle,
														},
														bundleBusy ? t("lib.bundleExportBusy") : t("lib.bundleExport"),
													)
												: null,
											importSupported
												? React.createElement(
														"label",
														{
															className: "tl-wall-upload",
															"data-busy": importBusy ? "" : undefined,
															"data-tl-import-armed": importArmed ? "true" : undefined,
															title: importArmed ? t("lib.bundleImportConfirmNote") : t("lib.bundleImport"),
															onClick: (event) => {
																if (importArmed === true) {
																	setImportArmed(false);
																	return;
																}
																// First click only arms the destructive import; the picker
																// opens on the second click.
																event.preventDefault();
																setImportArmed(true);
																setImportNote(t("lib.bundleImportConfirmNote"));
															},
														},
														importBusy
															? t("lib.bundleImporting")
															: importArmed
																? t("lib.bundleImportConfirmAction")
																: t("lib.bundleImport"),
														React.createElement("input", {
															type: "file",
															accept: ".tgz,.tar.gz,application/gzip,application/x-gzip",
															disabled: importBusy,
															onChange: importBundle,
															style: { display: "none" },
														}),
													)
												: null,
										),
										React.createElement("p", { className: "tl-wall-hint" }, t("lib.bundleHint")),
										importBusy
											? React.createElement("progress", {
													className: "tl-wall-progress",
													max: 100,
													value: importPct,
													"aria-label": t("lib.bundleImporting"),
												})
											: null,
										importBusy
											? React.createElement("p", { className: "tl-wall-v05-note" }, t("lib.bundleProgress", { pct: importPct }))
											: null,
										bundleNote === "" ? null : React.createElement("p", { className: "tl-wall-hint" }, bundleNote),
										importNote === "" ? null : React.createElement("p", { className: "tl-wall-hint" }, importNote),
									)
								: engine === null
									// State probe still in flight: show nothing rather than flashing
									// "host unavailable" for the first render.
									? null
									: React.createElement("p", { className: "tl-wall-hint" }, t("lib.bundleNoHost")),
							// Reset lives next to the recipe: both own the same zones and glass.
							React.createElement(
								"button",
								{
									type: "button",
									className: "tl-font-reset",
									onClick: () => {
										const next = {
											...zones,
											separate: false,
											main: { ...ZONE_DEFAULTS.main },
											rail: { ...ZONE_DEFAULTS.rail },
										};
										setZones(next);
										if (zoneController !== null) zoneController.apply(next);
										setGlassLevel(1);
										if (glassController !== null) glassController.apply(1);
									},
								},
								t("lib.resetWallpaper"),
							),
						),
					),
					// ---- v0.5.0 extension sections: every workstream registers its own
					// <details class="tl-wall-group"> component; the panel only mounts them
					// in registration order, after ⑥, inside this same scroll container.
					// ①-⑥ above stay untouched so the skinlab inventory/layout checks hold.
					...tl5PanelSections().map((section) =>
						React.createElement(section.Component, { key: "tl5-" + section.id }),
					),
					// v0.5.3: transient picker feedback ("已切换：…"/inline errors live in the
					// compact status row). Rendered last so it floats above the grid.
					toast === null || view !== "pick"
						? null
						: React.createElement("div", { className: "tl-wall-toast", "data-tl-toast": "", role: "status" }, toast.text),
				);
			};

			const scrim = document.createElement("div");
			scrim.setAttribute("data-tl-wall-scrim", "");
			const host = document.createElement("div");
			host.className = "tl-wall-sidebar";
			host.setAttribute("data-tl-wall", "");
			// The trigger lives on the viewport edge, NOT in the composer: the composer is
			// for talking to the model, and a wallpaper picker there crowded the input row.
			const handle = document.createElement("button");
			handle.type = "button";
			handle.setAttribute("data-tl-wall-handle", "");
			handle.setAttribute("aria-keyshortcuts", "Alt+W");
			// The handle lives outside the React panel; keep it on the same dictionary and
			// refresh it when the language changes (subscribeTl5I18n is disposed below).
			// v0.5.3 13-i18n can also auto-rewrite these via data-tl-i18n-*; both paths are
			// kept so older/newer i18n fragments behave the same.
			handle.setAttribute("data-tl-i18n-key", "lib.handle.text");
			handle.setAttribute("data-tl-i18n-title-key", "lib.handle.title");
			const refreshHandleCopy = () => {
				handle.title = TL_T("lib.handle.title");
				handle.textContent = TL_T("lib.handle.text");
			};
			refreshHandleCopy();
			const unsubscribeHandleI18n = subscribeTl5I18n(refreshHandleCopy);
			const body = document.body;
			if (body !== null) {
				body.appendChild(scrim);
				body.appendChild(host);
				body.appendChild(handle);
			}

			let root = null;
			let open = false;
			let tintTimer = 0;
			// R5: one entry in the shared overlay stack while the panel is open, so Esc
			// closes the top layer and the modal Tab trap belongs to the stack.
			let overlayDisposer = null;
			// v0.5.0 D3: a validated #tl= recipe waiting for the user's explicit decision.
			// Read once at install (page load with a shared link) and re-read on each open
			// by the panel; a decision clears both this and the hash.
			const hashAtInstall = String(globalThis.location?.hash ?? "");
			let pendingShare = hashAtInstall.startsWith("#tl=") ? readTl5ShareHash() : null;
			// A link that was present but rejected (invalid/oversized) is surfaced as a
			// single note when the panel opens: the hash is already cleared, no settings
			// were touched.
			const shareRejectedAtLoad = hashAtInstall.startsWith("#tl=") && pendingShare === null;

			// ---- background tinted by the wallpaper's own hue (shared sampler, S4) ----
			const tintPanel = () => {
				const palette = tl5SampleWallpaperPalette();
				if (palette === null) return;
				// v2.3.0: read the live scheme through the platform helper; a scheme flip
				// re-runs tintPanel via tl5OnScheme (registered below), so the panel tint and
				// accent never keep the previous mode's colours.
				const dark = tl5Scheme() === "dark";
				// v2.2.9: a TINT, not a fill. The old max(0.96, ...) made the glass opacity
				// slider inert and turned the panel into coloured plastic. The blur layer
				// and the tint now share the same low alpha range as every other pane.
				const fillLight = dark ? 0.18 : 0.92;
				const fillSat = Math.round(Math.min(0.52, Math.max(0.18, palette.sat)) * 100);
				const alpha = dark ? "calc(0.24 * var(--tl-glass-m, 1))" : "calc(0.10 * var(--tl-glass-m, 1))";
				const fill = "hsl(" + palette.hue + " " + fillSat + "% " + Math.round(fillLight * 100) + "% / " + alpha + ")";
				host.style.setProperty("--tl-wall-tint", fill);
				// The edge handle carries the same tint, so the wallpaper colour is visible
				// even with the panel closed.
				handle.style.setProperty("--tl-wall-tint", fill);
				host.style.setProperty(
					"--tl-accent",
					"hsl(" + palette.hue + " " + Math.round(palette.sat * 100) + "% " + Math.round((dark ? 0.66 : 0.44) * 100) + "%)",
				);
			};
			const startTint = () => {
				if (tintTimer !== 0) return;
				tintPanel();
				// One delayed retry covers a video that has not decoded a frame yet at open
				// time. No polling: drawImage + getImageData from a 4K playing video every
				// few seconds caused a visible periodic hitch, which was reported as the
				// panel "shaking on its own".
				tintTimer = globalThis.setTimeout(() => {
					tintTimer = 0;
					tintPanel();
				}, 1500);
			};
			const stopTint = () => {
				if (tintTimer === 0) return;
				globalThis.clearTimeout(tintTimer);
				tintTimer = 0;
			};
			// v2.3.0: a scheme flip re-tints the panel/handle from the LIVE scheme (the
			// wallpaper hue stays, the light/dark lightness swaps) without reopening.
			const disposeSchemeTint = typeof tl5OnScheme === "function" ? tl5OnScheme(() => tintPanel()) : () => {};

			// ---- drag between edges, spring settle with a capped elastic overshoot ----
			const MAX_OVERSHOOT = 26;
			const RUBBER = 0.35;
			const MAX_VELOCITY = 1500;
			let offset = 0;
			let raf = 0;
			let drag = null;
			const panelWidth = () => host.offsetWidth || 296;
			const maxOffset = () => Math.max(0, globalThis.innerWidth - panelWidth());
			const applyX = (x) => {
				offset = x;
				host.style.transform = "translateX(" + x + "px)";
				// The border and shadow mirror whichever edge the panel settled on.
				if (x > 4) host.setAttribute("data-tl-side", "right");
				else host.removeAttribute("data-tl-side");
			};			/**
			 * Springs to one edge. Release velocity is clamped and the overshoot is
			 * hard-capped, so a violent flick cannot throw the panel across the screen.
			 */
			const settle = (target, velocity) => {
				if (raf !== 0) globalThis.cancelAnimationFrame(raf);
				const stiffness = 210;
				const damping = 26;
				const dt = 1 / 60;
				let pos = offset;
				let vel = Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, velocity)) / 60;
				const step = () => {
					vel += ((target - pos) * stiffness - vel * damping) * dt;
					pos += vel * dt;
					const over = pos - target;
					if (Math.abs(over) > MAX_OVERSHOOT) pos = target + Math.sign(over) * MAX_OVERSHOOT;
					if (Math.abs(target - pos) < 0.4 && Math.abs(vel) < 0.4) {
						applyX(target);
						raf = 0;
						return;
					}
					applyX(pos);
					raf = globalThis.requestAnimationFrame(step);
				};
				raf = globalThis.requestAnimationFrame(step);
			};
			// ---- moving light: follows the pointer, brightens with drag speed ----
			let glowNode = null;
			const updateGlow = (event, intensity) => {
				if (glowNode === null) glowNode = host.querySelector("[data-tl-wall-glow]");
				if (glowNode === null) return;
				const rect = host.getBoundingClientRect();
				if (rect.width === 0 || rect.height === 0) return;
				const x = Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100));
				const y = Math.max(0, Math.min(100, ((event.clientY - rect.top) / rect.height) * 100));
				glowNode.style.setProperty("--tl-glow-x", x.toFixed(1) + "%");
				glowNode.style.setProperty("--tl-glow-y", y.toFixed(1) + "%");
				glowNode.style.setProperty("--tl-glow-a", String(Math.max(0, Math.min(1, intensity))));
			};
			const onGlowLeave = () => {
				if (glowNode !== null) glowNode.style.setProperty("--tl-glow-a", "0");
			};

			/**
			 * Swallows exactly one upcoming click. Without it, finishing a drag that
			 * started on a wallpaper card would also "click" that card and switch the
			 * wallpaper by accident.
			 */
			const swallowNextClick = () => {
				const stop = (clickEvent) => {
					clickEvent.stopPropagation();
					clickEvent.preventDefault();
				};
				document.addEventListener("click", stop, true);
				// One cleanup path only: the timer always removes it, whether or not a
				// click arrived. Removing it in two places tripped the listener audit.
				globalThis.setTimeout(() => document.removeEventListener("click", stop, true), 80);
			};

			// Document-level capture: the panel is almost entirely made of card buttons,
			// and a host-scoped listener lost the gesture whenever a child consumed it.
			const onDragStart = (event) => {
				const target = event.target;
				if (!(target instanceof Element)) return;
				if (target.closest("[data-tl-wall]") === null) return;
				// Only the sticky title/guide block is a drag handle. The rest of the
				// panel is a normal scrolling surface; every interactive child (including
				// the dynamic-playback button) keeps its own click.
				if (target.closest("[data-tl-wall-drag]") === null) return;
				if (target.closest("button, a, input, textarea, select, summary") !== null) return;
				if (raf !== 0) {
					globalThis.cancelAnimationFrame(raf);
					raf = 0;
				}
				drag = {
					id: event.pointerId,
					startX: event.clientX,
					startOffset: offset,
					lastX: event.clientX,
					lastT: performance.now(),
					velocity: 0,
					moved: 0,
				};
				host.setAttribute("data-tl-dragging", "");
				event.preventDefault();
			};
			const onDragMove = (event) => {
				if (drag === null) {
					const target = event.target;
					if (target instanceof Element && target.closest("[data-tl-wall]") !== null) updateGlow(event, 0.34);
					return;
				}
				if (event.pointerId !== drag.id) return;
				// A pointerup delivered outside the window never reaches onDragEnd. Without
				// this check the panel keeps following the mouse with no button pressed,
				// which reads as the panel moving on its own.
				if ((event.buttons & 1) === 0) {
					onDragEnd(event);
					return;
				}
				const now = performance.now();
				const elapsed = Math.max(1, now - drag.lastT);
				drag.velocity = ((event.clientX - drag.lastX) / elapsed) * 1000;
				drag.lastX = event.clientX;
				drag.lastT = now;
				drag.moved = Math.max(drag.moved, Math.abs(event.clientX - drag.startX));
				updateGlow(event, Math.min(1, 0.25 + Math.abs(drag.velocity) / 1200));
				const raw = drag.startOffset + (event.clientX - drag.startX);
				const max = maxOffset();
				let x = raw;
				if (raw < 0) x = raw * RUBBER;
				else if (raw > max) x = max + (raw - max) * RUBBER;
				applyX(x);
			};
			const onDragEnd = (event) => {
				if (drag === null) return;
				const moved = drag.moved;
				const velocity = drag.velocity;
				drag = null;
				host.removeAttribute("data-tl-dragging");
				if (moved > 5) swallowNextClick();
				if (moved <= 4) {
					// A plain click on the title/guide must not spring the panel to an edge;
					// that made a stationary panel move "by itself" after any click.
					if (event !== undefined) event.preventDefault?.();
					return;
				}
				const max = maxOffset();
				// Only "near an edge" snaps; anywhere in the middle stays where it was
				// dropped. Always snapping to the nearest edge made every small drag spring
				// straight back, which reads as "the panel cannot be moved".
				const SNAP = 56;
				const clamped = Math.min(Math.max(offset, 0), max);
				let target = clamped;
				if (clamped <= SNAP) target = 0;
				else if (max - clamped <= SNAP) target = max;
				settle(target, velocity);
				if (event !== undefined) event.preventDefault?.();
			};
			document.addEventListener("pointerdown", onDragStart, true);
			document.addEventListener("pointermove", onDragMove, true);
			document.addEventListener("pointerup", onDragEnd, true);
			document.addEventListener("pointercancel", onDragEnd, true);
			host.addEventListener("pointerleave", onGlowLeave);

			// Each open remounts the panel component (via the React key), so the panel
			// always starts on the full library. The React state (source tab, filters, WE
			// editor) used to survive close/open for the whole page session: after the user
			// clicked "WE 目录" once, every later open came back to an empty WE filter with
			// "壁纸清单 0 张" and the directory editor expanded — the reported "wallpaper
			// panel is broken" state.
			let openSeq = 0;
			const renderPanel = () => {
				if (root === null) {
					try {
						root = require("react-dom/client").createRoot(host);
					} catch {
						root = null;
						return;
					}
				}
				openSeq += 1;
				try {
					root.render(
						React.createElement(WallpaperPanel, {
							key: "wall-panel-" + openSeq,
							onClose: () => setOpen(false),
							sharedRecipe: pendingShare,
							shareRejected: shareRejectedAtLoad,
						}),
					);
				} catch {
					// a failing render must not keep the panel in a half-open state
				}
			};
			/**
			 * Closing unmounts the panel's React tree instead of only hiding the host.
			 * A hidden tree keeps every partition mounted: the panel's 1.8s media/fps
			 * observer, the audio section's 100ms beat timer, the engine section's 2s
			 * poll, the context section's 2s readout interval and the engineering
			 * section's settings/metrics subscriptions all kept running behind a closed
			 * panel (the reported "the skin still uses CPU after closing it").
			 * `root.render(null)` runs every effect cleanup and leaves the root reusable;
			 * the next open re-renders a fresh tree through the key above, and the
			 * persistent state lives in controllers/localStorage (re-read on mount).
			 */
			const unmountPanel = () => {
				if (root === null) return;
				try {
					root.render(null);
				} catch {
					// a failing unmount must not keep the panel in a half-open state
				}
			};
			const setOpen = (next) => {
				// R8b (REV-R5 F1): opening underneath a higher modal would be invisible yet
				// steal the keyboard stack top; the open entry points no-op instead.
				if (next === true && typeof tl5OverlayOpenAllowed === "function" && tl5OverlayOpenAllowed("wallpaper-panel") === false) return;
				open = next;
				if (open) {
					host.setAttribute("data-tl-open", "");
					scrim.setAttribute("data-tl-open", "");
					handle.setAttribute("data-tl-hidden", "");
					startTint();
					audioController.clearReason();
					// Re-clamp against the current viewport before showing.
					applyX(Math.min(offset, maxOffset()));
					renderPanel();
					if (overlayDisposer === null) {
						overlayDisposer = tl5OverlayRegister({
							id: "wallpaper-panel",
							modal: true,
							root: () => host,
							onEscape: () => setOpen(false),
						});
					}
				} else {
					host.removeAttribute("data-tl-open");
					scrim.removeAttribute("data-tl-open");
					handle.removeAttribute("data-tl-hidden");
					stopTint();
					audioController.stop(TL_T("lib.audio.stoppedOnClose"));
					// Stop every partition timer/subscription: unmount, do not hide.
					unmountPanel();
					if (overlayDisposer !== null) {
						try {
							overlayDisposer();
						} catch {
							// the stack is already torn down
						}
						overlayDisposer = null;
					}
				}
			};
			const onScrim = () => setOpen(false);
			const onHandle = () => setOpen(!open);
			// Alt+W is registered in the TL5_SHORTCUTS registry (95-a11y), which ignores
			// key auto-repeat and editable targets; Esc is owned by the overlay stack.
			// This fragment only keeps the viewport re-clamp below.
			// A cached offset goes stale when the viewport shrinks: a panel pinned to the
			// right edge would sit outside the window until the next drag.
			const onResize = () => {
				if (!open) return;
				const max = maxOffset();
				if (offset > max) applyX(max);
			};
			scrim.addEventListener("click", onScrim);
			handle.addEventListener("click", onHandle);
			window.addEventListener("resize", onResize);
			applyX(0);

			return () => {
				if (overlayDisposer !== null) {
					try {
						overlayDisposer();
					} catch {
						// the stack is already torn down
					}
					overlayDisposer = null;
				}
				scrim.removeEventListener("click", onScrim);
				handle.removeEventListener("click", onHandle);
				window.removeEventListener("resize", onResize);
				document.removeEventListener("pointerdown", onDragStart, true);
				document.removeEventListener("pointermove", onDragMove, true);
				document.removeEventListener("pointerup", onDragEnd, true);
				document.removeEventListener("pointercancel", onDragEnd, true);
				host.removeEventListener("pointerleave", onGlowLeave);
				if (typeof unsubscribeHandleI18n === "function") unsubscribeHandleI18n();
				stopTint();
				try {
					disposeSchemeTint();
				} catch {
					// the shared observer may already be gone
				}
				if (raf !== 0) globalThis.cancelAnimationFrame(raf);
				try {
					if (root !== null) root.unmount();
				} catch {
					// an already-detached root is fine
				}
				host.remove();
				scrim.remove();
				handle.remove();
			};
		}
		//#endregion
