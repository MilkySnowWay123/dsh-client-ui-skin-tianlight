		//#region wallpaper sidebar
		/**
		 * A dedicated left-edge sidebar for the wallpaper, kept apart from the
		 * typography card on purpose: one is a full-height browsing surface with
		 * thumbnails, the other a small draggable settings card. Sharing one host made
		 * both feel cramped and put unrelated controls in the same panel.
		 */
		function installWallpaperSidebar(ctx) {
			if (React === null || typeof ctx.inject !== "function") return () => {};

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
					label: "极光 · 暗角",
					desc: "ShaderToy 极光 + 暗角，冷色桌面",
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
					label: "音频极光 · 扫描线",
					desc: "麦克风律动 + 扫描线；需手动启用麦克风",
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
					label: "电影感 · 颗粒",
					desc: "保留当前壁纸，只加颗粒和暗角",
					value: {
						format: "tianlight-preset",
						version: 1,
						layers: { version: 2, slots: [presetSlot("preset", "grain", 0.38, "overlay"), presetSlot("preset", "vignette", 0.5, "multiply")] },
					},
				},
				{
					id: "night-glow",
					label: "冷夜 · 光晕",
					desc: "保留当前壁纸，叠加冷色光晕与扫描线",
					value: {
						format: "tianlight-preset",
						version: 1,
						layers: { version: 2, slots: [presetSlot("preset", "glow", 0.35, "screen"), presetSlot("preset", "scan", 0.18, "normal")] },
					},
				},
				{
					id: "clean",
					label: "纯净",
					desc: "清空两层叠加，回到干净壁纸",
					value: {
						format: "tianlight-preset",
						version: 1,
						layers: { version: 2, slots: [presetSlot("none", "none", 0.55, "normal"), presetSlot("none", "none", 0.55, "normal")] },
					},
				},
			];

			const WallpaperPanel = (props) => {
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
				// Optional engine availability, fetched once: the WE tab tells the truth
				// about scene support instead of rendering a dead card.
				const [engine, setEngine] = React.useState(null);
				const [engineProbe, setEngineProbe] = React.useState(0);
				React.useEffect(() => {
					let alive = true;
					void fetch(ASSET_BASE + "/_engines", { cache: "no-store" })
						.then((response) => (response.ok ? response.json() : null))
						.then((value) => {
							if (alive) setEngine(value ?? { webwallgl: false, adapter: false, sceneProjects: 0, stale: true });
						})
						.catch(() => {
							if (alive) setEngine({ webwallgl: false, adapter: false, sceneProjects: 0, stale: true });
						});
					return () => {
						alive = false;
					};
				}, [engineProbe]);
				const hostStale = engine !== null && engine.stale === true;
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
						? { mode: readLowPowerMode(), active: false, reason: "", detail: "" }
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
							setWeStatus("无法读取目录列表（宿主接口需重启 DSH 后才存在）");
						}
					})();
				};
				const saveWe = () => {
					setWeStatus("保存中…");
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
							setWeStatus("已保存 " + kept + " 个目录" + (kept < roots.length ? "（无效路径已忽略）" : ""));
							void listWallpapers().then((list) => {
								if (list !== null) setItems(list);
							});
						} catch {
							setWeStatus("保存失败：宿主接口需重启 DSH 后才存在");
						}
					})();
				};
				React.useEffect(() => {
					let alive = true;
					void listWallpapers().then((list) => {
						if (alive && list !== null) setItems(list);
					});
					return () => {
						alive = false;
					};
				}, []);
				const pick = (choice) => {
					if (wallpaperController !== null) wallpaperController.apply(choice);
					setActive(choice === null ? "" : choice.url);
					setActiveChoice(choice);
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
					if (slot === undefined || slot.kind === "none") return "关闭";
					if (slot.kind === "image") return slot.url === "" ? "图片（未选）" : "图片";
					return slot.preset === "none" ? "关闭" : LAYER_LABELS[slot.preset] ?? "预设";
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
				// ---- preset import / export ----
				const [presetText, setPresetText] = React.useState("");
				const [presetStatus, setPresetStatus] = React.useState("");
				const exportPreset = () => {
					setPresetText(
						JSON.stringify({
							format: "tianlight-preset",
							version: 1,
							zones: readZones(),
							glass: readGlass(),
							lowPower: readLowPowerMode(),
							wallpaper: readWallpaperChoice(),
							shader: shaderController.read(),
							layers: layerController.read(),
							playback: playbackController.read(),
							rotation: rotationController.read(),
						}),
					);
					setPresetStatus("已生成配方，复制这段分享给别人");
				};
				const applyPresetValue = (value) => {
					if (value === null || typeof value !== "object") return "导入失败：不是有效的配方";
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
						if (value.lowPower === "auto" || value.lowPower === "on" || value.lowPower === "off") {
							setPowerMode(value.lowPower);
							if (lowPowerController !== null) lowPowerController.set(value.lowPower);
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
					} catch {
						return "导入失败：配方内容无法应用";
					}
					return shaderRejected ? "配方已应用（着色器源码无效，已保留原设置）" : "配方已应用";
				};
				const importPreset = () => {
					try {
						const value = JSON.parse(presetText);
						setPresetStatus(applyPresetValue(value));
					} catch {
						setPresetStatus("导入失败：不是有效的配方文本");
					}
				};
				const applyCuratedPreset = (preset) => {
					setPresetText(JSON.stringify(preset.value));
					const status = applyPresetValue(preset.value);
					setPresetStatus(status === "配方已应用" ? "已应用精选：" + preset.label : status);
				};
				const applyDraft = async () => {
					const url = draft.trim();
					if (url === "") {
						setDraftNote("先粘贴一个图片或视频直链");
						return;
					}
					let parsed = null;
					try {
						parsed = new URL(url);
					} catch {
						parsed = null;
					}
					if (parsed === null || (parsed.protocol !== "http:" && parsed.protocol !== "https:")) {
						setDraftNote("地址要以 http:// 或 https:// 开头");
						return;
					}
					if (globalThis.location?.protocol === "https:" && parsed.protocol === "http:") {
						setDraftNote("当前页面是 HTTPS，浏览器会拦截 http 资源；请换用 https 地址");
						return;
					}
					setDraftBusy(true);
					setDraftNote("正在检查地址…");
					// Extension first; when the link is signed/extensionless, probe the media
					// itself instead of defaulting every unknown URL to "video" (which made
					// ordinary image CDN links fail).
					const clean = url.split(/[?#]/)[0];
					let kind = draftKind === "image" ? "image" : draftKind === "video" ? "video" : null;
					if (kind === null && /\.(png|jpe?g|webp|avif|gif|svg)$/i.test(clean)) kind = "image";
					else if (kind === null && /\.(mp4|webm|mov|m4v)$/i.test(clean)) kind = "video";
					else if (kind === null) kind = await probeUrlKind(url);
					if (kind === null) {
						setDraftBusy(false);
						setDraftNote("这不是可直接加载的图片/视频直链；请确认地址以 .jpg/.png/.mp4/.webm 等结尾，或手动选「图片 / 视频」。");
						return;
					}
					setComposer("url");
					setNote("");
					pick({ kind, url });
					setDraftBusy(false);
					setDraftNote("已应用：" + (kind === "image" ? "图片" : "视频") + " · " + (parsed.hostname || "远程地址"));
				};
				const applyShader = () => {
					const error = validateShaderSource(shader.source);
					if (error !== null) {
						setShaderStatus("编译失败：" + error);
						return;
					}
					shaderController.save(shader);
					setShaderStatus("已应用着色器");
					pick({ kind: "shader", url: "shader://live" });
				};
				const resetShader = () => {
					setShader({ ...SHADER_DEFAULTS });
					setShaderStatus("已恢复默认，点「应用着色器」生效");
				};
				const toggleAudio = async () => {
					if (audio.active) {
						audioController.stop("已停止音频");
						setAudioNote("");
						return;
					}
					setAudioNote("正在请求麦克风…");
					const result = await audioController.start();
					setAudioNote(result.ok === true ? "" : result.reason ?? "无法启用麦克风");
				};
				const useAudioPreset = () => {
					const preset = SHADER_PRESETS.find((entry) => entry.id === "audio");
					if (preset === undefined) return;
					setShader((current) => ({ ...current, preset: preset.id, source: preset.source }));
					setShaderStatus("已切到「音频极光」，点「应用着色器」生效");
				};
				// ---- video still-frame picker ----
				const requestFrames = () => {
					if (activeChoice === null || activeChoice.kind !== "video") return;
					const url = activeChoice.url;
					setFrameBusy(true);
					setFrameStatus("正在从视频取帧…");
					void sampleVideoFrames(url, 6).then((result) => {
						setFrameBusy(false);
						if (result.ok === true) {
							setFrames(result.frames);
							setFrameSource(url);
							setFrameStatus("点一帧设为静态壁纸（切走壁纸后需重新取帧）");
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
					setFrameStatus("已设为静态帧 " + Number(time).toFixed(1) + "s");
				};
				const resumeVideo = () => {
					if (activeChoice === null || activeChoice.kind !== "video") return;
					pick({ kind: "video", url: activeChoice.url });
					setFrameStatus("已恢复动态播放");
				};
				// ---- library helpers: one read path, one write path ----
				const metaOf = (item) => library.items[item.url] ?? { favorite: false, tags: [], hidden: false };
				const nameOf = (item) =>
					item.id.replace(/^ext:\d+:/, "").replace(/^uploads\//, "").replace(/^scene:\d+:/, "");
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
						setUploadNote("宿主路由仍是旧的（404）：多半是旧的 dsh web 进程还占着 3080，新进程启动失败。先结束旧进程再启动；点「重新检测」不必刷新页面。");
						return;
					}
					if (engine !== null && engine.upload !== undefined && engine.upload.writable === false) {
						setUploadNote("上传目录不可写：检查 skin-tianlight/assets/ 的写权限");
						return;
					}
					if (file.size > uploadLimit) {
						setUploadNote("超过 " + uploadLimitMb + "MB 上限；4K 长片请先压缩，或设置 TIANLIGHT_UPLOAD_MAX");
						return;
					}
					if (/\.(mp4|m4v|mov|webm|png|jpe?g|webp|avif|gif|svg)$/i.test(file.name) === false) {
						setUploadNote("只支持 mp4/webm/mov/m4v/png/jpg/webp/avif/gif/svg");
						return;
					}
					setUploadBusy(true);
					setUploadNote("上传中…");
					void (async () => {
						try {
							const response = await fetch(ASSET_BASE + "/_upload?name=" + encodeURIComponent(file.name), {
								method: "POST",
								headers: { "content-type": file.type || "application/octet-stream" },
								body: file,
							});
							const value = await response.json().catch(() => null);
							if (!response.ok) throw new Error(value?.error ?? String(response.status));
							setUploadNote("已上传：" + String(value?.item?.id ?? file.name).replace(/^uploads\//, ""));
							const list = await listWallpapers();
							if (list !== null) setItems(list);
						} catch (error) {
							setUploadNote("上传失败：" + String(error?.message ?? error));
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
				const isWeItem = (item) => item.url.includes("/ext/") === true || item.kind === "scene";
				const allCount = items.length;
				const visibleItems = items
					.filter((item) => (sourceTab === "all" ? true : sourceTab === "we" ? isWeItem(item) : !isWeItem(item)))
					.filter((item) => showHidden || metaOf(item).hidden !== true)
					.filter((item) => favoritesOnly === false || metaOf(item).favorite)
					.filter((item) => tagFilter.length === 0 || tagFilter.some((tag) => metaOf(item).tags.includes(tag)))
					.filter((item) => {
						const needle = query.trim().toLowerCase();
						if (needle === "") return true;
						return (nameOf(item) + " " + metaOf(item).tags.join(" ")).toLowerCase().includes(needle);
					})
					.map((item) => ({ item, meta: metaOf(item) }));
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
				const localCount = items.filter((item) => isWeItem(item) === false).length;
				const weCount = items.filter((item) => isWeItem(item)).length;
				const sceneCount = items.filter((item) => item.kind === "scene").length;
				const currentTitle = (() => {
					if (activeChoice === null) return "自动（按素材优先级）";
					if (activeChoice.kind === "scene") {
						const item = items.find((entry) => entry.url === activeChoice.url);
						return "场景 · " + (item !== undefined && item.title !== undefined ? item.title : activeChoice.url.slice(activeChoice.url.lastIndexOf("/") + 1));
					}
					if (activeChoice.kind === "shader") {
						const preset = SHADER_PRESETS.find((entry) => entry.id === shader.preset);
						return "ShaderToy · " + (preset === undefined ? "自定义代码" : preset.label);
					}
					const file = activeChoice.url.slice(activeChoice.url.lastIndexOf("/") + 1) || "未命名";
					const kind = activeChoice.kind === "image" ? "图片" : activeChoice.still !== undefined ? "视频静态帧" : "视频";
					return kind + " · " + file;
				})();
				const screenWidth = Math.round((globalThis.innerWidth || 0) * (globalThis.devicePixelRatio || 1));
				const screenHeight = Math.round((globalThis.innerHeight || 0) * (globalThis.devicePixelRatio || 1));
				const croppedWidth = Math.round((mediaInfo === null ? 0 : mediaInfo.width) * Number(cropInfo.w));
				const croppedHeight = Math.round((mediaInfo === null ? 0 : mediaInfo.height) * Number(cropInfo.h));
				let qualityNote = "";
				if (mediaInfo !== null && mediaInfo.state === "error") {
					qualityNote = "壁纸加载失败：请换一个文件，或检查编码/地址；皮肤会自动退回可播画面";
				} else if (mediaInfo !== null && mediaInfo.kind === "scene") {
					qualityNote =
						"画质：WebWallGL 实时场景" +
						(mediaInfo.fps > 0 ? " · 实测 " + mediaInfo.fps + "fps" : "") +
						(engine !== null && engine.webwallgl === false ? " · 引擎未就绪" : "");
				} else if (mediaInfo !== null && mediaInfo.kind === "shader") {
					qualityNote = "画质：程序化着色器，不受源分辨率影响";
				} else if (mediaInfo !== null && mediaInfo.width > 0 && mediaInfo.height > 0) {
					qualityNote =
						"画质：源 " +
						mediaInfo.width +
						"×" +
						mediaInfo.height +
						" · 当前裁切约 " +
						croppedWidth +
						"×" +
						croppedHeight +
						"px";
					const upscaled =
						zones.main.fit === "contain"
							? screenWidth > 0 && croppedWidth + 1 < screenWidth && croppedHeight + 1 < screenHeight
							: screenWidth > 0 && (croppedWidth + 1 < screenWidth || croppedHeight + 1 < screenHeight);
					qualityNote += upscaled ? " · 会放大，可能发糊" : " · 不需放大";
					if (mediaInfo.fps > 0) {
						qualityNote += " · 实测 " + mediaInfo.fps + "fps" + (mediaInfo.fps < 50 ? "（偏低）" : "");
					}
					if (mediaInfo.width >= 7680 || mediaInfo.height >= 4320) qualityNote += " · 8K 源可能被浏览器降采样";
					if (mediaInfo.duration > 0) {
						const minutes = Math.floor(mediaInfo.duration / 60);
						const seconds = String(mediaInfo.duration % 60).padStart(2, "0");
						qualityNote += " · 时长 " + minutes + ":" + seconds;
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
						? "系统开启了「减少动态效果」"
						: powerState.reason === "save-data"
							? "浏览器开启了流量节省"
							: powerState.reason === "battery"
								? powerState.detail || "电量偏低且未充电"
								: powerState.reason === "manual"
									? "手动开启省电"
									: "";
				const statusLabel = lowPowerActive
					? "省电暂停"
					: hasStaticFrame
						? "静态帧"
						: isBlocked
							? "自动播放被拦截"
							: isStalled
								? "画面卡住"
								: sceneBroken
									? "加载失败"
									: isImageWallpaper
										? "图片壁纸"
										: isBuffering
											? "加载中"
											: isMoving
												? isSceneWallpaper
													? "场景运行中"
													: isShaderWallpaper
														? "着色器运行中"
														: "动态播放中"
												: playState === "idle"
													? "未选择壁纸"
													: isPaused
														? "已暂停"
														: "已就绪";
				const statusTone = lowPowerActive || hasStaticFrame
					? "warn"
					: isBlocked || isStalled || sceneBroken
						? "alert"
						: isMoving
							? "live"
							: "idle";
				const statusHint = lowPowerActive
					? "省电自动暂停（" + (lowPowerReasonLabel || "省电模式") + "）；点按钮会关闭省电并恢复播放。"
					: hasStaticFrame
						? "当前固定在静态帧，刷新后仍保持；点「回到动态」恢复播放。"
						: isBlocked
							? "浏览器拦下了自动播放。点「播放动态」一次即可；之后回到页面会自动继续。"
							: isStalled
								? "已请求播放但没有新画面。点「重试」重新加载当前壁纸。"
								: sceneBroken
									? "解码或播放失败（" + (playReason || "未知原因") + "）；皮肤会自动退回可播画面。"
									: playState === "idle"
										? "还没有选择壁纸；从下面「来源」开始挑一张。"
										: isBuffering
										? "正在加载/解码，画面出现后会自动开始播放。"
										: isMoving
											? isSceneWallpaper
												? "WebWallGL 正在渲染 WE 场景；加载失败会自动退回视频/图片。"
												: isShaderWallpaper
													? "程序化着色器按当前渲染档位运行。"
													: "视频正在播放；切换页面会暂停、回来继续。"
											: isPaused
												? "已暂停在当前帧；点「继续播放」恢复。"
												: "画面已就绪。";
				const showPlaybackAction = isVideoWallpaper || isShaderWallpaper || isSceneWallpaper;
				const actionLabel = lowPowerActive
					? "关闭省电并播放"
					: hasStaticFrame
						? "回到动态"
						: isBlocked
							? "播放动态"
							: isStalled || sceneBroken
								? "重试"
								: isMoving
									? "暂停"
									: "继续播放";
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
						return " · 帧间隔抖动 " + mediaInfo.jitter + "ms" + (mediaInfo.jitter > 90 ? "（偏高）" : "");
					}
					return "";
				})();
				const listHint =
					composer === "url"
						? "把完整媒体直链粘到下面；不是网页地址。网络直链只播放，不下载进壁纸库。"
						: composer === "shader"
							? "先选预设或贴 GLSL，调好参数，再点「应用着色器」。"
							: sourceTab === "we"
								? "Wallpaper Engine：" +
									weCount +
									" 张" +
									(sceneCount > 0 ? "（场景 " + sceneCount + "）" : "") +
									"；目录在清单顶部「配置目录」里改，场景失败会自动降级。"
								: sourceTab === "local"
									? "本地与上传：" + localCount + " 张。点缩略图直接应用；4K/8K 也可直接点。"
									: "全部壁纸：" +
										allCount +
										" 张（本地 " +
										localCount +
										" / WE " +
										weCount +
										"）。点缩略图直接应用；上方可筛选，或从「网址 / WE 目录 / GLSL」导入。";
				const sourceValue =
					composer === "url"
						? "URL 地址"
						: composer === "shader"
							? "ShaderToy"
							: sourceTab === "we"
								? "Wallpaper Engine"
								: sourceTab === "local"
									? "本地/上传"
									: "全部";
				const listValue =
					composer === "url"
						? "粘贴地址"
						: composer === "shader"
							? "GLSL"
							: (sourceTab === "we" ? weCount : sourceTab === "local" ? localCount : allCount) + " 张";
				const framingValue = zones.main.zoom + "% · " + (zones.main.ratio === "auto" ? "自动" : zones.main.ratio);
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
					"玻璃 " +
					Math.round(glassLevel * 100) +
					"%" +
					(activeLayerLabels.length === 0 ? "" : " · " + activeLayerLabels.join(" + "));
				const performanceValue =
					(powerMode === "auto" ? "省电自动" : powerMode === "on" ? "省电开" : "省电关") +
					" · " +
					(fpsMode === "auto" ? "30fps" : fpsMode + "fps") +
					(rotation.on ? " · 轮播开" : "");
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
							React.createElement("div", { className: "tl-font-title" }, "壁纸"),
							React.createElement(
								"div",
								{ className: "tl-wall-view-switch" },
								[
									["pick", "选壁纸"],
									["advanced", "高级"],
								].map(([value, label]) =>
									React.createElement(
										"button",
										{
											key: value,
											type: "button",
											"data-active": view === value ? "" : undefined,
											onClick: () => {
												setView(value);
												// Simple view has no filter row; clear hidden filters so the list
												// cannot look mysteriously empty after leaving 高级.
												if (value === "pick") {
													setQuery("");
													setFavoritesOnly(false);
													setTagFilter([]);
													setShowHidden(false);
													setTagEditorUrl("");
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
									"aria-label": "关闭壁纸侧栏",
									onClick: () => {
										if (props !== undefined && typeof props.onClose === "function") props.onClose();
									},
								},
								"\u00d7",
							),
						),
						React.createElement(
							"div",
							{ className: "tl-wall-guide" },
							React.createElement(
								"p",
								{ className: "tl-wall-status", "data-tone": statusTone, title: statusHint },
								React.createElement("span", { className: "tl-wall-status-dot", "aria-hidden": "true" }),
								statusLabel,
							),
							React.createElement(
								"p",
								{ className: "tl-wall-current", title: activeChoice === null ? undefined : activeChoice.url },
								"当前壁纸：" + currentTitle,
							),
							// The pick view is one library: all sources are already in the grid,
							// so the default action is simply "click a thumbnail". These chips
							// only filter it; URL/GLSL/WE config are secondary import actions.
							view === "pick"
								? React.createElement(
										React.Fragment,
										null,
										React.createElement(
											"div",
											{ className: "tl-wall-filter-row" },
											[
												["all", "全部", allCount],
												["local", "本地", localCount],
												["we", "WE", weCount],
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
													label + " " + count,
												),
											),
										),
										React.createElement(
											"div",
											{ className: "tl-wall-import-row" },
											React.createElement(
												"button",
												{
													type: "button",
													className: "tl-wall-import-btn",
													"data-active": composer === "url" ? "" : undefined,
													onClick: () => {
													const next = composer === "url" ? "none" : "url";
													setComposer(next);
													const list = document.querySelector("[data-tl-wall-list]");
													if (list !== null) list.open = true;
													if (next === "url") {
														globalThis.setTimeout(() => {
															const input = document.querySelector("[data-tl-wall-url-input]");
															if (input !== null && typeof input.focus === "function") input.focus();
														}, 60);
													}
												},
												},
												composer === "url" ? "收起网址" : "网址导入",
											),
											React.createElement(
												"button",
												{
													type: "button",
													className: "tl-wall-import-btn",
													onClick: () => {
														setSourceTab("we");
														setComposer("none");
														const list = document.querySelector("[data-tl-wall-list]");
														if (list !== null) list.open = true;
														openWe();
													},
												},
												"WE 目录",
											),
											React.createElement(
												"button",
												{
													type: "button",
													className: "tl-wall-import-btn",
													"data-active": composer === "shader" ? "" : undefined,
													onClick: () => {
													const next = composer === "shader" ? "none" : "shader";
													setComposer(next);
													const list = document.querySelector("[data-tl-wall-list]");
													if (list !== null) list.open = true;
												},
												},
												composer === "shader" ? "收起 GLSL" : "GLSL",
											),
										),
									)
								: null,
							React.createElement(
								"p",
								{ className: "tl-wall-hint" },
								view === "pick" && statusTone === "live"
									? "点卡片立即生效；要调画面/外观点右上「高级」。"
									: statusHint,
							),
							view === "advanced" && qualityNote + qualityExtra !== ""
								? React.createElement(
										"p",
										{ className: "tl-wall-hint tl-wall-quality", title: qualityNote + qualityExtra },
										qualityNote + qualityExtra,
									)
								: null,
							showPlaybackAction
								? React.createElement(
										"div",
										{ className: "tl-wall-tabs" },
										React.createElement(
											"span",
											{ className: "tl-wall-label" },
											isMoving ? "播放中" : isBlocked ? "待恢复" : "播放",
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
						groupSummary("①", "来源（目录/代码）", sourceValue),
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
											(provider.id === "local" || provider.id === "we"
												? sourceTab === provider.id && composer === "none"
												: composer === provider.id)
												? ""
												: undefined,
										"data-tl-disabled": provider.available ? undefined : "",
										title: provider.available ? provider.note : provider.label + "：" + provider.note,
										onClick: () => {
											if (provider.id === "we") {
												// One click shows the WE selection, and the directory editor
												// only when nothing is configured yet.
												setSourceTab("we");
												setComposer("none");
												openWe();
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
									React.createElement("span", { className: "tl-source-note" }, provider.desc),
								),
							),
						),
						noteText === "" ? null : React.createElement("p", { className: "tl-wall-hint" }, noteText),
					),
					React.createElement(
						"details",
						{ className: "tl-wall-group", open: true, "data-tl-wall-list": "" },
						groupSummary("②", "壁纸清单", listValue),
						React.createElement("p", { className: "tl-wall-hint" }, listHint),
						// WE setup lives with the WE list, not behind ①. The pick view hides ①,
						// so keeping the directory editor there made it undiscoverable.
						sourceTab === "we" && composer === "none"
							? React.createElement(
									"div",
									{ className: "tl-wall-url" },
									React.createElement(
										"div",
										{ className: "tl-wall-tabs" },
										React.createElement("span", { className: "tl-wall-label" }, "WE 目录"),
										React.createElement(
											"button",
											{
												type: "button",
												className: "tl-font-option",
												onClick: () => {
													if (weOpen) setWeOpen(false);
													else openWe();
												},
											},
											weOpen ? "收起设置" : "配置目录",
										),
									),
									weOpen
										? React.createElement(
												"div",
												null,
												React.createElement(
													"p",
													{ className: "tl-wall-hint" },
													"把 Wallpaper Engine 的 projects 目录粘在这里，每行一个；只读，不修改原文件。",
												),
												React.createElement("textarea", {
													className: "tl-wall-textarea",
													rows: 3,
													placeholder: "每行一个绝对路径，例如 …/steamapps/workshop/content/431960/<项目ID>",
													value: weDraft,
													onChange: (event) => setWeDraft(event.target.value),
												}),
												React.createElement(
													"button",
													{ type: "button", className: "tl-font-reset", onClick: saveWe },
													"保存目录",
												),
												weStatus === "" ? null : React.createElement("p", { className: "tl-wall-hint" }, weStatus),
											)
										: React.createElement(
												"p",
												{ className: "tl-wall-hint" },
												"没有配置 WE 目录时，这里为空；点「配置目录」粘贴 Steam 的 431960 项目目录。",
											),
								)
							: null,
						composer !== "none"
							? null
							: React.createElement(
									"div",
									{ className: "tl-wall-library" },
							React.createElement(
								"div",
								{ className: "tl-wall-tabs" },
								React.createElement(
									"label",
									{
										className: "tl-wall-upload",
										"data-busy": uploadBusy ? "" : undefined,
										title: "上传后自动出现在本地清单；不会覆盖同名文件",
									},
									uploadBusy ? "上传中…" : "上传壁纸",
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
									hostStale ? "旧宿主仍占用端口" : "≤" + uploadLimitMb + "MB · 图片/视频",
								),
								hostStale
									? React.createElement(
											"button",
											{
												type: "button",
												className: "tl-font-option",
												onClick: () => {
													setUploadNote("正在重新检测宿主路由…");
													setEngineProbe((value) => value + 1);
												},
											},
											"重新检测",
										)
									: null,
							),
							uploadNote === "" ? null : React.createElement("p", { className: "tl-wall-hint" }, uploadNote),
							React.createElement("input", {
								className: "tl-font-input",
								type: "search",
								placeholder: "搜索名称或标签",
								"aria-label": "搜索壁纸",
								value: query,
								onChange: (event) => setQuery(event.target.value),
							}),
							React.createElement(
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
									"收藏",
								),
								hiddenCount === 0
									? null
									: React.createElement(
											"button",
											{
												type: "button",
												className: "tl-font-option",
												"data-active": showHidden ? "" : undefined,
												title: "隐藏只改变列表，不删除源文件",
												onClick: () => setShowHidden((value) => !value),
											},
											showHidden ? "隐藏中 " + hiddenCount : "显示隐藏 " + hiddenCount,
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
											"清除筛选",
										)
									: null,
							),
						),
						editingItem === null || composer !== "none"
							? null
							: React.createElement(
									"div",
									{ className: "tl-wall-url tl-wall-tag-editor" },
									React.createElement("p", { className: "tl-wall-hint" }, "标签：" + nameOf(editingItem)),
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
															title: "移除这个标签",
															onClick: () => removeTag(tag),
														},
														"#" + tag + " ×",
													),
												),
											),
									React.createElement("input", {
										className: "tl-font-input",
										type: "text",
										placeholder: "输入标签后回车，例如 夜景",
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
											"完成",
										),
									),
								),
						composer !== "none"
							? null
							: React.createElement(
									"div",
									{ className: "tl-wall-grid" },
							filtersActive
								? null
								: React.createElement(
										"button",
										{
											type: "button",
											className: "tl-wall-card",
											"data-active": active === "" ? "" : undefined,
											onClick: () => pick(null),
										},
										React.createElement("div", { className: "tl-wall-thumb tl-wall-auto" }, "自动"),
										React.createElement("span", { className: "tl-wall-name" }, "自动选择"),
										React.createElement("span", { className: "tl-wall-tags-mini" }, "按素材优先级"),
									),
							visibleItems.map(({ item, meta }) =>
								React.createElement(
									"div",
									{ key: item.id, className: "tl-wall-cell", "data-tl-hidden": meta.hidden ? "" : undefined },
									React.createElement(
										"button",
										{
											type: "button",
											className: "tl-wall-card",
											"data-active": active === item.url ? "" : undefined,
											onClick: () => pick({ kind: item.kind, url: item.url }),
										},
										React.createElement(
											"div",
											{ className: "tl-wall-thumb" },
											item.kind === "scene"
												? React.createElement("img", {
														src: item.preview || "",
														alt: item.title || nameOf(item),
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
													: React.createElement("img", { src: item.url, alt: nameOf(item), loading: "lazy" }),
										),
										React.createElement(
											"span",
											{ className: "tl-wall-name" },
											item.kind === "scene" && item.title !== undefined ? item.title : nameOf(item),
										),
										React.createElement(
											"span",
											{ className: "tl-wall-tags-mini" },
											[
												item.kind === "video" ? "视频" : item.kind === "scene" ? "场景 · WebWallGL" : "图片",
												formatBytes(item.bytes),
												...meta.tags.map((tag) => "#" + tag),
											]
												.filter((entry) => entry !== "")
												.join(" · "),
										),
									),
									React.createElement(
										"button",
										{
											type: "button",
											className: "tl-wall-hide",
											"data-active": meta.hidden ? "" : undefined,
											"aria-label": meta.hidden ? "恢复显示" : "隐藏",
											title: meta.hidden ? "恢复显示（不删除文件）" : "隐藏（不删除文件，也不打断当前播放）",
											onClick: () => updateMeta(item.url, { hidden: meta.hidden !== true }),
										},
										meta.hidden ? "显" : "隐",
									),
									React.createElement(
										"button",
										{
											type: "button",
											className: "tl-wall-fav",
											"data-active": meta.favorite ? "" : undefined,
											"aria-label": meta.favorite ? "取消收藏" : "收藏",
											title: meta.favorite ? "取消收藏" : "收藏",
											onClick: () => updateMeta(item.url, { favorite: meta.favorite === false }),
										},
										meta.favorite ? "★" : "☆",
									),
									React.createElement(
										"button",
										{
											type: "button",
											className: "tl-wall-tag-open",
											"aria-label": "编辑标签",
											title: "编辑标签",
											onClick: () => {
												setTagEditorUrl(item.url);
												setTagDraft("");
											},
										},
										"#",
									),
								),
							),
						),
						composer === "none" && filtersActive && visibleItems.length === 0
							? React.createElement(
									"p",
									{ className: "tl-wall-hint" },
									"没有匹配的壁纸：换个关键词，或清空收藏/标签筛选",
								)
							: null,
						composer === "none" && filtersActive === false && visibleItems.length === 0
							? React.createElement(
									"p",
									{ className: "tl-wall-hint" },
									sourceTab === "we"
										? "这个目录下没有可读的视频/场景：点上方「WE 目录」检查路径；没有 Wallpaper Engine 就用本地或上传。"
										: sourceTab === "all"
											? "还没有壁纸：点下方「上传壁纸」，或用上方「网址导入 / WE 目录 / GLSL」。"
											: "本地还没有壁纸：把图片/视频放进 skin-tianlight/assets/，刷新页面即可；也可以直接点「上传壁纸」。",
								)
							: null,
						composer === "url"
							? React.createElement(
									"p",
									{ className: "tl-wall-hint" },
									"只支持「能直接打开的媒体直链」：图片或视频地址，不是网页地址。网络直链直接播放，不下载到本机；要进壁纸库请用上传。",
								)
							: null,
						composer === "url"
							? React.createElement(
									"div",
									{ className: "tl-wall-url" },
									React.createElement(
										"div",
										{ className: "tl-wall-tabs" },
										React.createElement("span", { className: "tl-wall-label" }, "类型"),
										[["auto", "自动"], ["image", "图片"], ["video", "视频"]].map(([value, label]) =>
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
																setDraftNote("已从剪贴板粘贴，点「应用地址」或按回车");
																return;
															}
															setDraftNote("剪贴板是空的；请手动 Ctrl+V");
														} catch {
															setDraftNote("浏览器拒绝读取剪贴板；请手动 Ctrl+V");
														}
													})();
												},
											},
											"粘贴",
										),
									),
									React.createElement("input", {
										className: "tl-font-input",
										type: "url",
										"data-tl-wall-url-input": "",
										placeholder: "粘贴完整直链，例如 https://…/wallpaper.mp4",
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
										draftBusy ? "检查中…" : "应用地址",
									),
									React.createElement(
										"p",
										{ className: "tl-wall-hint" },
										draftNote === ""
											? "自动会先按扩展名判断，无扩展名时实际探测图片/视频；不确定就保持自动。"
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
										"ShaderToy 风格：不需要网站账号，也不抓取 shadertoy.com。① 选预设或贴 GLSL → ② 调速度/强度/色相 → ③ 点「应用着色器」。",
									),
									React.createElement(
										"p",
										{ className: "tl-wall-hint" },
										"可用 uniform：iTime / iResolution / iMouse / u_speed / u_intensity / u_hue / u_audio。",
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
											"音频响应：把麦克风实时电平送给 u_audio；只分析，不录音、不上传。",
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
												audio.busy ? "请求中…" : audio.active ? "停止音频" : "启用麦克风",
											),
											React.createElement(
												"button",
												{ type: "button", className: "tl-font-option", onClick: useAudioPreset },
												"用「音频极光」",
											),
										),
										React.createElement(
											"p",
											{ className: "tl-wall-hint" },
											audioNote ||
												audio.reason ||
												(audio.active
													? "音频响应中；关闭面板/省电/页面隐藏会自动停止。"
													: "未启用。先应用 ShaderToy 壁纸，再启用。"),
										),
									),
									React.createElement("textarea", {
										className: "tl-wall-textarea tl-wall-code",
										rows: 8,
										spellCheck: false,
										"aria-label": "着色器源码",
										value: shader.source,
										onChange: (event) => {
											setShader((current) => ({ ...current, preset: "custom", source: event.target.value }));
											setShaderStatus("");
										},
									}),
									React.createElement(
										"label",
										{ className: "tl-wall-slider" },
										React.createElement("span", null, "速度 " + shader.speed.toFixed(1) + "×"),
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
										React.createElement("span", null, "强度 " + shader.intensity.toFixed(2)),
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
										React.createElement("span", null, "色相 " + Math.round(shader.hue * 100) + "%"),
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
										React.createElement("button", { type: "button", className: "tl-font-reset", onClick: applyShader }, "应用着色器"),
										React.createElement("button", { type: "button", className: "tl-font-reset", onClick: resetShader }, "恢复默认"),
									),
									shaderStatus === "" ? null : React.createElement("p", { className: "tl-wall-hint" }, shaderStatus),
								)
							: null,
					),
					// ---- framing: ratio-locked crop, zoom and pan ----
					React.createElement(
						"details",
						{ className: "tl-wall-group", open: false, "data-tl-group": "advanced" },
						groupSummary("③", "画面", framingValue),
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
									key === "auto" ? "跟随窗口" : key,
								),
							),
						),
						React.createElement(
							"label",
							{ className: "tl-wall-slider" },
							React.createElement("span", null, "缩放 " + zones.main.zoom + "%"),
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
							React.createElement("span", null, "取景横向 " + zones.main.cx + (pannable ? "%" : "% · 当前画面未裁切")),
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
							React.createElement("span", null, "取景纵向 " + zones.main.cy + (pannable ? "%" : "% · 当前画面未裁切")),
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
							"窗口 " + ((globalThis.innerWidth || 16) / (globalThis.innerHeight || 9)).toFixed(2) + ":1" +
								(zones.main.ratio === "auto" ? " · 裁切跟随窗口" : " · 裁切 " + zones.main.ratio),
						),
						pannable
							? null
							: React.createElement(
									"p",
									{ className: "tl-wall-hint" },
									"取景滑杆只在画面被裁切时可用：提高缩放，或换一个与窗口不同的比例。",
								),
						React.createElement(
							"div",
							{ className: "tl-wall-url" },
							React.createElement(
								"p",
								{ className: "tl-wall-hint" },
								activeChoice === null
									? "静态帧：先显式选择一个视频壁纸（自动选择不支持取帧）"
									: activeChoice.kind !== "video"
										? "静态帧：只有视频壁纸支持取帧"
										: "静态帧：从当前视频取 6 帧，点一帧固定为静态壁纸",
							),
							activeChoice !== null && activeChoice.kind === "video"
								? React.createElement(
										"div",
										{ className: "tl-wall-tabs" },
										React.createElement(
											"button",
											{ type: "button", className: "tl-font-reset", disabled: frameBusy, onClick: requestFrames },
											frameBusy ? "取帧中…" : "生成帧预览",
										),
										activeChoice.still !== undefined
											? React.createElement(
													"button",
													{ type: "button", className: "tl-font-reset", onClick: resumeVideo },
													"回到动态",
												)
											: null,
									)
								: null,
							activeChoice !== null && activeChoice.kind === "video" && activeChoice.still !== undefined
								? React.createElement(
										"p",
										{ className: "tl-wall-hint" },
										"当前：静态帧 " + Number(activeChoice.still).toFixed(1) + "s（「回到动态」恢复播放）",
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
													title: "设为静态帧 " + Number(frame.time).toFixed(1) + "s",
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
										"播放控制：倍速/翻转只影响视频；60fps 源仍按源帧率，倍速会按比例改变实际帧率。",
									),
									React.createElement(
										"div",
										{ className: "tl-wall-tabs" },
										React.createElement("span", { className: "tl-wall-label" }, "倍速"),
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
											playback.paused ? "继续播放" : "暂停动态",
										),
										React.createElement(
											"button",
											{
												type: "button",
												className: "tl-font-option",
												"data-active": playback.flip ? "" : undefined,
												onClick: () => updatePlayback({ flip: playback.flip === false }),
											},
											"水平翻转",
										),
									),
									React.createElement(
										"div",
										{ className: "tl-wall-tabs" },
										React.createElement("span", { className: "tl-wall-label" }, "画面滤镜"),
										React.createElement(
											"button",
											{
												type: "button",
												className: "tl-font-option",
												"data-active": playback.filter.on ? "" : undefined,
												onClick: () => updatePlayback({ filter: { ...playback.filter, on: playback.filter.on === false } }),
											},
											playback.filter.on ? "已开启" : "默认关闭",
										),
									),
									React.createElement(
										"p",
										{ className: "tl-wall-hint" },
										playback.filter.on
											? "滤镜会多一层全屏合成；4K/60fps 下若掉帧，先关掉它。"
											: "滤镜默认关闭；开启后才对画面做亮度/对比度/饱和度调整。",
									),
									playback.filter.on
										? React.createElement(
												"div",
												null,
												[
													["brightness", "亮度"],
													["contrast", "对比度"],
													["saturate", "饱和度"],
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
						groupSummary("④", "外观", appearanceValue),
						// ---- glass opacity ----
						React.createElement(
							"label",
							{ className: "tl-wall-slider" },
							React.createElement("span", null, "玻璃不透明度 " + Math.round(glassLevel * 100) + "%"),
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
							React.createElement("span", { className: "tl-wall-label" }, "叠加槽"),
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
									(index === 0 ? "A（下）" : "B（上）") + " · " + layerSlotLabel(layerSlots[index]),
								),
							),
							React.createElement(
								"button",
								{ type: "button", className: "tl-font-option", onClick: swapLayers },
								"交换 A/B",
							),
						),
						React.createElement(
							"div",
							{ className: "tl-wall-tabs" },
							React.createElement("span", { className: "tl-wall-label" }, "类型"),
							[["none", "关闭"], ["preset", "预设"], ["image", "图片"]].map(([value, label]) =>
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
									React.createElement("span", { className: "tl-wall-label" }, "图案"),
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
											"aria-label": "本地图片叠加",
											value: items.some((item) => item.kind === "image" && item.url === selectedSlot.url) ? selectedSlot.url : "",
											onChange: (event) => updateLayerSlot(layerSlot, { kind: "image", url: event.target.value }),
										},
										React.createElement("option", { value: "" }, "选本地图片…"),
										items
											.filter((item) => item.kind === "image")
											.map((item) => React.createElement("option", { key: item.id, value: item.url }, item.id)),
									),
									React.createElement("input", {
										className: "tl-font-input",
										type: "url",
										placeholder: "或粘贴图片地址",
										value: selectedSlot.url,
										onChange: (event) => updateLayerSlot(layerSlot, { kind: "image", url: event.target.value }),
									}),
									React.createElement(
										"div",
										{ className: "tl-wall-tabs" },
										React.createElement("span", { className: "tl-wall-label" }, "图片适配"),
										[["cover", "填满"], ["contain", "完整"], ["stretch", "拉伸"]].map(([value, label]) =>
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
							? React.createElement("p", { className: "tl-wall-hint" }, "这一槽关闭；选「预设」或「图片」启用。")
							: React.createElement(
									"label",
									{ className: "tl-wall-slider" },
									React.createElement("span", null, "叠加不透明度 " + Math.round(selectedSlot.opacity * 100) + "%"),
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
									React.createElement("span", { className: "tl-wall-label" }, "混合"),
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
							"两层都叠在视频/图片/Shader 之上；纯 CSS，不增加解码；省电时保持静态。",
						),
						// ---- the only zone question that matters: separate or continuous ----
						React.createElement(
							"div",
							{ className: "tl-wall-tabs" },
							React.createElement("span", { className: "tl-wall-label" }, "侧栏壁纸"),
							[["no", "与主壁纸相同"], ["yes", "独立分开"]].map(([value, label]) =>
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
										"aria-label": "侧栏壁纸",
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
									React.createElement("option", { value: "" }, "侧栏：跟随主壁纸"),
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
						groupSummary("⑤", "自动/性能", performanceValue),
						React.createElement(
							"div",
							{ className: "tl-wall-tabs" },
							React.createElement("span", { className: "tl-wall-label" }, "省电"),
							[["auto", "自动"], ["on", "开"], ["off", "关"]].map(([value, label]) =>
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
							React.createElement("span", { className: "tl-wall-label" }, "渲染帧率"),
							[["auto", "自动"], ["60", "60"], ["30", "30"], ["15", "15"]].map(([value, label]) =>
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
							"帧率档位作用于 ShaderToy 渲染与侧栏镜像；视频走原生解码，按源帧率播放，60fps 源不需要设置。60fps 更耗电，省电设置优先。",
						),
						React.createElement(
							"p",
							{ className: "tl-wall-hint" },
							powerMode === "auto"
								? "自动：低电量、省流量或系统开启「减少动态效果」时，暂停动态壁纸并冻结装饰动画"
								: powerMode === "on"
									? "已暂停动态壁纸（停在当前帧），并冻结桌宠等装饰动画"
									: "始终播放动态壁纸，不再因电量或流量降级",
						),
						React.createElement(
							"div",
							{ className: "tl-wall-tabs" },
							React.createElement("span", { className: "tl-wall-label" }, "自动轮播"),
							React.createElement(
								"button",
								{
									type: "button",
									className: "tl-font-option",
									"data-active": rotation.on ? "" : undefined,
									onClick: () => updateRotation({ on: rotation.on === false }),
								},
								rotation.on ? "已开启" : "关闭",
							),
						),
						React.createElement(
							"div",
							{ className: "tl-wall-tabs" },
							React.createElement("span", { className: "tl-wall-label" }, "顺序"),
							[
								["sequence", "顺序"],
								["random", "随机"],
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
							React.createElement("span", { className: "tl-wall-label" }, "间隔"),
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
									seconds < 60 ? seconds + "s" : Math.round(seconds / 60) + "分",
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
								"只轮播收藏",
							),
						),
						React.createElement(
							"p",
							{ className: "tl-wall-hint" },
							rotation.on
								? "每 " +
										(rotation.interval < 60 ? rotation.interval + " 秒" : Math.round(rotation.interval / 60) + " 分钟") +
										"换一张；页面隐藏、省电或暂停播放时顺延，当前这张不会重复选中。"
								: "开启后自动轮换本地/WE 的图片与视频；隐藏的壁纸不参与，坏文件会跳过。",
						),
					),
					// ---- recipe: the whole panel configuration, exportable ----
					React.createElement(
						"details",
						{ className: "tl-wall-group", open: false, "data-tl-group": "advanced" },
						groupSummary("⑥", "保存/分享", "精选 · 导出/导入"),
						React.createElement(
							"div",
							{ className: "tl-wall-url" },
							React.createElement(
								"p",
								{ className: "tl-wall-hint" },
								"精选配方一键套用；也可导出/导入 JSON。壁纸 + 取景 + 播放 + 玻璃 + 叠加层 + 省电（含着色器源码与参数）。",
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
											title: preset.desc,
											onClick: () => applyCuratedPreset(preset),
										},
										React.createElement("span", { className: "tl-source-name" }, preset.label),
										React.createElement("span", { className: "tl-source-note" }, preset.desc),
									),
								),
							),
							React.createElement("textarea", {
								className: "tl-wall-textarea",
								rows: 3,
								placeholder: "{ format: tianlight-preset }",
								value: presetText,
								onChange: (event) => setPresetText(event.target.value),
							}),
							React.createElement(
								"div",
								{ className: "tl-wall-tabs" },
								React.createElement("button", { type: "button", className: "tl-font-reset", onClick: exportPreset }, "导出配方"),
								React.createElement("button", { type: "button", className: "tl-font-reset", onClick: importPreset }, "导入配方"),
							),
							presetStatus === "" ? null : React.createElement("p", { className: "tl-wall-hint" }, presetStatus),
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
								"恢复壁纸默认",
							),
						),
					),
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
			handle.title = "壁纸";
			handle.textContent = "壁纸";
			const body = document.body;
			if (body !== null) {
				body.appendChild(scrim);
				body.appendChild(host);
				body.appendChild(handle);
			}

			let root = null;
			let open = false;
			let tintTimer = 0;

			// ---- background tinted by the wallpaper's own hue ----
			const swatch = document.createElement("canvas");
			swatch.width = 32;
			swatch.height = 18;
			let swatchCtx = null;
			try {
				swatchCtx = swatch.getContext("2d", { willReadFrequently: true });
			} catch {
				swatchCtx = null;
			}
			const tintPanel = () => {
				if (swatchCtx === null) return;
				const still = wallpaperController === null ? null : wallpaperController.image;
				const video = document.querySelector("[data-tl-scene] > video");
				// The shader snapshot is a 2D canvas copied in the render task, so it stays
				// readable even though the WebGL buffer is not preserved.
				const shader = wallpaperController === null ? null : wallpaperController.shaderSwatch;
				const target =
					shader !== null && shader !== undefined
						? shader
						: still !== null && still !== undefined
							? still
							: video;
				if (target === null || target === undefined) return;
				if (target === video && video.readyState < 2) return;
				let data = null;
				try {
					swatchCtx.drawImage(target, 0, 0, swatch.width, swatch.height);
					data = swatchCtx.getImageData(0, 0, swatch.width, swatch.height).data;
				} catch {
					return;
				}
				let sin = 0;
				let cos = 0;
				let satSum = 0;
				let lightSum = 0;
				let weight = 0;
				for (let i = 0; i + 3 < data.length; i += 4) {
					const r = data[i] / 255;
					const g = data[i + 1] / 255;
					const b = data[i + 2] / 255;
					const max = Math.max(r, g, b);
					const min = Math.min(r, g, b);
					const delta = max - min;
					const light = (max + min) / 2;
					if (delta < 0.05 || light < 0.08 || light > 0.95) continue;
					const sat = light > 0.5 ? delta / (2 - max - min) : delta / (max + min);
					let hue;
					if (max === r) hue = ((g - b) / delta + (g < b ? 6 : 0)) * 60;
					else if (max === g) hue = ((b - r) / delta + 2) * 60;
					else hue = ((r - g) / delta + 4) * 60;
					const rad = (hue * Math.PI) / 180;
					const w = sat * (1 - Math.abs(light - 0.55) * 1.2);
					sin += Math.sin(rad) * w;
					cos += Math.cos(rad) * w;
					satSum += sat * w;
					lightSum += light * w;
					weight += w;
				}
				if (weight <= 0.001) return;
				const hue = Math.round((((Math.atan2(sin, cos) * 180) / Math.PI) + 360) % 360);
				const sat = Math.min(0.70, Math.max(0.32, (satSum / weight) * 1.3));
				const light = lightSum / weight;
				const dark = document.body !== null && document.body.hasAttribute(DARK_ATTR);
				// Deliberately saturated: at 12-20% saturation on a 94%-light surface the
				// panel looked untinted, which is the bug this replaced.
				const fillLight = dark ? 0.15 : 0.90;
				const fillSat = Math.round(Math.min(0.52, Math.max(0.18, sat)) * 100);
				const fill = "hsl(" + hue + " " + fillSat + "% " + Math.round(fillLight * 100) + "% / calc(0.94 * var(--tl-glass-m, 1)))";
				host.style.setProperty("--tl-panel-fill", fill);
				// The edge handle carries the same tint, so the wallpaper colour is visible
				// even with the panel closed.
				handle.style.setProperty("--tl-panel-fill", fill);
				host.style.setProperty(
					"--tl-accent",
					"hsl(" + hue + " " + Math.round(sat * 100) + "% " + Math.round((dark ? 0.66 : 0.44) * 100) + "%)",
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

			const setOpen = (next) => {
				open = next;
				if (open) {
					host.setAttribute("data-tl-open", "");
					scrim.setAttribute("data-tl-open", "");
					handle.setAttribute("data-tl-hidden", "");
					startTint();
					audioController.clearReason();
					// Re-clamp against the current viewport before showing.
					applyX(Math.min(offset, maxOffset()));
				} else {
					host.removeAttribute("data-tl-open");
					scrim.removeAttribute("data-tl-open");
					handle.removeAttribute("data-tl-hidden");
					stopTint();
					audioController.stop("面板已关闭，已停止音频");
				}
				if (!open || root !== null) return;
				try {
					root = require("react-dom/client").createRoot(host);
					root.render(React.createElement(WallpaperPanel, { onClose: () => setOpen(false) }));
				} catch {
					root = null;
				}
			};
			const onScrim = () => setOpen(false);
			const onHandle = () => setOpen(!open);
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
				scrim.removeEventListener("click", onScrim);
				handle.removeEventListener("click", onHandle);
				window.removeEventListener("resize", onResize);
				document.removeEventListener("pointerdown", onDragStart, true);
				document.removeEventListener("pointermove", onDragMove, true);
				document.removeEventListener("pointerup", onDragEnd, true);
				document.removeEventListener("pointercancel", onDragEnd, true);
				host.removeEventListener("pointerleave", onGlowLeave);
				stopTint();
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

