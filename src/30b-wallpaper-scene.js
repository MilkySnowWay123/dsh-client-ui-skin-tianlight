		//#region wallpaper
		/**
		 * Builds the wallpaper stack beneath the application. Returns a disposer
		 * that removes every node and listener this activation created.
		 */
		function installScene() {
			const scene = document.createElement("div");
			scene.dataset.tlScene = "";
			scene.setAttribute("aria-hidden", "true");

			const video = document.createElement("video");
			video.muted = true;
			video.loop = true;
			video.autoplay = true;
			video.playsInline = true;
			video.preload = "auto";
			video.disablePictureInPicture = true;
			video.setAttribute("muted", "");
			video.setAttribute("playsinline", "");
			video.style.setProperty("--tl-focal-x", FOCAL_X);
			scene.appendChild(video);

			// Still-image layer. Same slot as the video (painted under the veil by DOM
			// order), so an image wallpaper needs no second scene or code path.
			const photo = document.createElement("div");
			photo.dataset.tlPhoto = "";
			photo.hidden = true;
			scene.appendChild(photo);

			// Third channel: a WebGL canvas painted between the still layer and the veil,
			// so the veil keeps working over procedural wallpaper frames.
			const shaderCanvas = document.createElement("canvas");
			shaderCanvas.dataset.tlShader = "";
			shaderCanvas.hidden = true;
			scene.appendChild(shaderCanvas);

			// Optional fourth channel: a sandboxed adapter page that runs WebWallGL for
			// WE scene projects. Same layer position as the shader canvas; only one of
			// video / photo / shader / scene frame is visible at a time.
			const sceneFrame = document.createElement("iframe");
			sceneFrame.dataset.tlSceneFrame = "";
			sceneFrame.hidden = true;
			sceneFrame.setAttribute("sandbox", "allow-scripts");
			sceneFrame.setAttribute("allow", "autoplay");
			sceneFrame.setAttribute("referrerpolicy", "no-referrer");
			sceneFrame.setAttribute("title", "Wallpaper Engine scene");
			scene.appendChild(sceneFrame);

			// Fifth channel: a WE `type:"web"` project. Deliberately a SECOND iframe with
			// its own protocol-less lifecycle; the WebWallGL adapter contract must not be
			// reused here. `allow-scripts` WITHOUT `allow-same-origin` gives the project an
			// opaque origin, so it cannot touch this page or DSH's origin storage.
			const webFrame = document.createElement("iframe");
			webFrame.dataset.tlWeb = "";
			webFrame.hidden = true;
			webFrame.setAttribute("sandbox", "allow-scripts");
			webFrame.setAttribute("allow", "autoplay");
			webFrame.setAttribute("referrerpolicy", "no-referrer");
			webFrame.setAttribute("title", "Web wallpaper");
			scene.appendChild(webFrame);

			// Overlay stack: two CSS-only slots above all media, below the veil.
			for (const index of [0, 1]) {
				const overlay = document.createElement("div");
				overlay.dataset.tlOverlay = "";
				overlay.dataset.tlOverlaySlot = String(index);
				scene.appendChild(overlay);
			}
			applyLayers(scene, readLayers());

			// Zone dim lives above the media but under the veil: the CSS rule existed but
			// no element carried `data-tl-dim`, so the 外观 → 暗化 slider silently did
			// nothing. It multiplies nothing (translucent black), so it costs one layer.
			const dim = document.createElement("div");
			dim.dataset.tlDim = "";
			scene.appendChild(dim);

			const veil = document.createElement("div");
			veil.dataset.tlVeil = "";
			scene.appendChild(veil);

			document.body.insertBefore(scene, document.body.firstChild);
			applyPlayback(scene, readPlayback());

			const disposers = [];

			const markReady = () => {
				video.dataset.tlReady = "";
				// B4: the incoming layer has a decodable frame NOW; that is when the
				// transition starts, never when the request was merely issued.
				startTransition();
			};
			// Two attributes on purpose: `data-tl-state` is the coarse legacy contract the
			// quality line already keys off; `data-tl-play` is the detailed state the
			// recovery bar needs. `data-tl-reason` keeps the failure inspectable from
			// devtools and from the panel without a console.
			const report = (state, playState, reason) => {
				scene.dataset.tlState = state;
				scene.dataset.tlPlay = playState ?? state;
				if (reason === undefined || reason === "") scene.removeAttribute("data-tl-reason");
				else scene.dataset.tlReason = reason;
				publishSceneStatus({ status: playState ?? state, reason: reason ?? "" });
			};
			// ---- ShaderToy-style GLSL channel ----
			// One program, one loop, ~30 fps, pixel ratio capped at 1.25: a fullscreen
			// fragment shader is the most expensive wallpaper, so it runs only while the
			// shader channel is actually active and the page is visible.
			let shaderRenderer = null;
			let shaderActive = false;
			let currentChoice = null;
			// R6 B: monotonically increasing origin token. Every async load callback checks
			// it so a late success/failure from an older request cannot overwrite a newer
			// selection (and a within-generation re-render still updates normally).
			let sourceGeneration = 0;
			let lastGoodChoice = null;
			let shaderRaf = 0;
			let shaderLast = 0;
			let shaderSource = "";
			let shaderParams = readShaderSettings();
			let shaderMouse = [0.5, 0.5];
			// Static-frame mode: a paused video at `still` seconds. The token invalidates
			// pending seek listeners when the user switches wallpaper mid-seek.
			let videoStill = null;
			let videoStillToken = 0;
			let fpsHandle = 0;
			let fpsStart = 0;
			let fpsFrames = 0;
			let fpsLastFrame = 0;
			let fpsMaxGap = 0;
			// R6 C: playback-quality counters at the start of the current fps window; their
			// deltas are the dropped-frame evidence used instead of raw presented fps.
			let fpsQualityTotal = 0;
			let fpsQualityDropped = 0;
			// R8b (REV-R6 F1): quality counters are element-lifetime totals, so a new
			// probe window snapshots them first and the FIRST window only establishes the
			// baseline (no dropped-frame verdict) — otherwise accumulated history from a
			// previous source/element state looked like a fresh burst of dropped frames.
			let fpsQualityPrimed = false;
			let fpsQualityWindows = 0;
			let stillSeekHandler = null;
			let stillMetaHandler = null;
			// Playback ownership. A pause has an owner: the user (survives visibility),
			// the low-power supervisor, the page being hidden, or a source switch. Only a
			// user pause is remembered across a visibility change.
			let userPaused = false;
			let playBlocked = false;
			let playToken = 0;
			let playAttempts = 0;
			let lastAttemptAt = 0;
			let retryTimer = 0;
			let watchdogTimer = 0;
			let lastFrameAt = 0;
			let heldFrame = "";
			// ---- A3 web wallpaper state ----
			let webActive = false;
			let webTimer = 0;
			let webParked = false;
			// ---- B4 transition state ----
			let transitionTimer = 0;
			let transitionPreset = "fade";
			let transitionDuration = 600;
			// ---- A4 dynamic resolution ----
			let pendingSeekTo = null;
			let resizeTimer = 0;
			let variantToken = 0;
			// ---- C3 adaptive v2 sampler ----
			let adaptiveTimer = 0;
			let adaptiveStill = false;
			let adaptiveStillAt = 0;
			let adaptiveProbe = false;
			let adaptiveLevel = 0;
			let adaptiveLow = 0;
			let adaptiveHigh = 0;
			let adaptiveSamples = 0;
			let adaptiveReason = "";
			// v0.5.3: timestamp of the first low sample in the current streak + the last
			// measured values (for the readable downgrade reason) + the last logged gate.
			let adaptiveLowSince = 0;
			let adaptiveLastFps = 0;
			let adaptiveLastJitter = 0;
			let adaptiveLastPerfLow = false;
			let adaptiveGateKey = "";
			let shaderFrameTicks = 0;
			let shaderWindowStart = 0;
			let shaderLastPaint = 0;
			let shaderMaxGap = 0;
			let shaderProbeAt = 0;
			// ---- A5 frame cache bookkeeping ----
			let cachePrimeToken = 0;
			const clearStillHandlers = () => {
				if (stillSeekHandler !== null) {
					video.removeEventListener("seeked", stillSeekHandler);
					stillSeekHandler = null;
				}
				if (stillMetaHandler !== null) {
					video.removeEventListener("loadedmetadata", stillMetaHandler);
					stillMetaHandler = null;
				}
			};
			/**
			 * R6 A: release the video decoder when the scene stops showing a video.
			 * `hidden` alone keeps a 4K decoder and its buffered data alive. Clearing
			 * `src` + `load()` frees them; the next video switch reassigns `src`, so
			 * switching back still reloads normally. All samplers (58/60/70/90) also
			 * skip a hidden/released video.
			 */
			const releaseVideo = () => {
				// R8b (REV-R6 F3): drop the current source generation's handlers too.
				unbindVideoEvents();
				try {
					video.pause();
				} catch {
					// a detached element cannot throw anything worth surfacing
				}
				video.hidden = true;
				video.removeAttribute("data-tl-ready");
				video.removeAttribute("data-tl-perf");
				clearStillHandlers();
				video.removeAttribute("src");
				try {
					video.load();
				} catch {
					// releasing a detached media element is best effort
				}
				stopFpsProbe();
				scene.removeAttribute("data-tl-fps");
				scene.removeAttribute("data-tl-jitter");
				scene.removeAttribute("data-tl-perf");
				publishSceneStatus({ fps: 0, jitter: 0 });
			};
			// A 32x18 2D copy made in the same task as the draw: the WebGL buffer is not
			// preserved, so this is the only reliable source for the panel tint/sidebar.
			const shaderSwatch = document.createElement("canvas");
			shaderSwatch.width = 32;
			shaderSwatch.height = 18;
			let shaderSwatchCtx = null;
			try {
				shaderSwatchCtx = shaderSwatch.getContext("2d", { willReadFrequently: true });
			} catch {
				shaderSwatchCtx = null;
			}
			let shaderSwatchTick = 0;
			const snapshotShader = () => {
				if (shaderSwatchCtx === null) return;
				try {
					shaderSwatchCtx.drawImage(shaderCanvas, 0, 0, shaderSwatch.width, shaderSwatch.height);
				} catch {
					// a lost context must not break the loop
				}
			};
			const shaderPixelRatio = () => Math.min(1.25, Math.max(1, globalThis.devicePixelRatio || 1));
			/** C3: the adaptive sampler may lower the shader budget below the saved tier. */
			function effectiveShaderCap() {
				const base = effectiveShaderFps();
				return adaptiveLevel > 0 ? Math.min(base, adaptiveLevel) : base;
			}
			function paintShader(now) {
				if (shaderRenderer === null) return;
				const ratio = shaderPixelRatio();
				shaderRenderer.resize(globalThis.innerWidth * ratio, globalThis.innerHeight * ratio);
				shaderRenderer.render(now / 1000, shaderParams, shaderMouse, audioController.level());
				// Real rendered fps for the adaptive sampler: the render tier is only the
				// requested budget, not what the GPU managed.
				shaderFrameTicks += 1;
				if (shaderLastPaint > 0) {
					const gap = now - shaderLastPaint;
					if (gap > shaderMaxGap) shaderMaxGap = gap;
				}
				shaderLastPaint = now;
			}
			function stopShaderLoop() {
				if (shaderRaf !== 0) globalThis.cancelAnimationFrame(shaderRaf);
				shaderRaf = 0;
			}
			function startShaderLoop() {
				if (shaderActive === false || shaderRenderer === null || shaderRaf !== 0) return;
				const step = (now) => {
					shaderRaf = 0;
					if (shaderActive === false || document.hidden) return;
					if (document.body !== null && document.body.hasAttribute("data-tl-lowpower")) return;
					if (now - shaderLast >= 1000 / effectiveShaderCap()) {
						shaderLast = now;
						try {
							paintShader(now);
						} catch (error) {
							note("shader:render", error);
							return;
						}
						shaderSwatchTick += 1;
						if (shaderSwatchTick % 60 === 0) snapshotShader();
					}
					shaderRaf = globalThis.requestAnimationFrame(step);
				};
				shaderRaf = globalThis.requestAnimationFrame(step);
			}
			// A lost GPU context must degrade to the scene gradient instead of leaving a
			// frozen/black canvas; the saved ShaderToy choice means re-applying rebuilds it.
			const onShaderContextLost = (event) => {
				event.preventDefault();
				shaderActive = false;
				stopShaderLoop();
				if (shaderRenderer !== null) {
					try {
						shaderRenderer.dispose();
					} catch {
						// the context is already gone
					}
				}
				shaderRenderer = null;
				shaderSource = "";
				shaderCanvas.hidden = true;
				scene.removeAttribute("data-tl-shader-on");
				if (wallpaperController !== null) wallpaperController.shaderSwatch = null;
				audioController.stop(TL_T("audio.stopContext"));
				report("error", "error", "context-lost");
				note("shader:context-lost");
			};
			const onShaderContextRestored = () => {
				note("shader:context-restored");
			};
			shaderCanvas.addEventListener("webglcontextlost", onShaderContextLost);
			shaderCanvas.addEventListener("webglcontextrestored", onShaderContextRestored);
			disposers.push(() => {
				shaderCanvas.removeEventListener("webglcontextlost", onShaderContextLost);
				shaderCanvas.removeEventListener("webglcontextrestored", onShaderContextRestored);
			});
			const onShaderPointer = (event) => {
				if (shaderActive === false) return;
				shaderMouse = [
					Math.min(1, Math.max(0, event.clientX / (globalThis.innerWidth || 1))),
					Math.min(1, Math.max(0, 1 - event.clientY / (globalThis.innerHeight || 1))),
				];
			};
			window.addEventListener("pointermove", onShaderPointer, { passive: true });

			// ---- optional scene channel (WebWallGL adapter in a sandboxed iframe) ----
			// The adapter owns the engine; this side owns policy: first-frame timeout,
			// strict source check on postMessage, pause/resume, and the fallback chain.
			let sceneFrameActive = false;
			let sceneFrameTimer = 0;
			let sceneFrameLastStats = 0;
			// R8b (REV-R6 F2): one token per scene mount; the adapter echoes it and the
			// parent rejects late messages from an older mount (about:blank reuse).
			let sceneFrameToken = "";
			let sceneFrameMountSeq = 0;
			const postSceneFrame = (payload) => {
				if (sceneFrameActive === false) return;
				try {
					sceneFrame.contentWindow?.postMessage({ __tlCommand: true, ...payload }, "*");
				} catch {
					// a torn-down frame is not an error worth surfacing
				}
			};
			const clearSceneFrameTimer = () => {
				if (sceneFrameTimer !== 0) {
					window.clearTimeout(sceneFrameTimer);
					sceneFrameTimer = 0;
				}
			};
			const stopSceneFrame = () => {
				sceneFrameActive = false;
				clearSceneFrameTimer();
				sceneFrameLastStats = 0;
				// R8b (REV-R6 F2): invalidate the mount token before navigating away, so a
				// message queued by the old document cannot match the about:blank frame.
				sceneFrameToken = "";
				if (sceneFrame.dataset !== undefined) delete sceneFrame.dataset.tlSceneToken;
				sceneFrame.hidden = true;
				scene.removeAttribute("data-tl-scene-fps");
				scene.removeAttribute("data-tl-fps");
				try {
					sceneFrame.src = "about:blank";
				} catch {
					// detaching a frame is best effort
				}
			};
			const failSceneFrame = (reason) => {
				if (sceneFrameActive === false) return;
				const failed = currentChoice;
				const failGeneration = sourceGeneration;
				stopSceneFrame();
				report("error", "error", reason);
				if (
					lastGoodChoice !== null &&
					(currentChoice === null || lastGoodChoice.url !== currentChoice.url || lastGoodChoice.kind !== currentChoice.kind)
				) {
					const restore = lastGoodChoice;
					lastGoodChoice = null;
					applyWallpaper(restore);
					return;
				}
				// No known-good source: let the automatic chain pick a playable wallpaper
				// instead of leaving the scene gradient behind a failure message.
				void resolveAutoWallpaper().then((fallback) => {
					// R6 B: a slow automatic fallback must not replace a newer selection.
					if (failGeneration === sourceGeneration && fallback !== null && (failed === null || fallback.url !== failed.url)) applyWallpaper(fallback);
				});
			};
			const onSceneMessage = (event) => {
				if (sceneFrameActive === false) return;
				if (event.source !== sceneFrame.contentWindow) return;
				const data = event.data;
				if (data === null || typeof data !== "object" || data.__tlScene !== true) return;
				// R8b (REV-R6 F2): only the current mount's token is accepted.
				if (sceneFrameToken === "" || data.token !== sceneFrameToken) return;
				if (data.type === "ready") {
					clearSceneFrameTimer();
					sceneFrameLastStats = performance.now();
					if (currentChoice === null || currentChoice.kind !== "scene") return;
					lastGoodChoice = currentChoice;
					// A persisted pause, low power or a hidden tab must win over the engine's
					// autoplay; the adapter already starts paused when asked via query.
					if (userPaused || hasLowPower() || document.hidden) {
						postSceneFrame({ type: "pause" });
						if (userPaused) report("paused", "paused", "user");
						else if (hasLowPower()) report("paused", "lowpower", "lowpower");
						else report("paused", "hidden");
						return;
					}
					startTransition();
					report("ready", "playing");
					// The mount URL may carry `paused=1` from an earlier state; an explicit
					// resume is idempotent and makes the visible state authoritative.
					postSceneFrame({ type: "resume" });
					return;
				}
				if (data.type === "error") {
					failSceneFrame(String(data.reason ?? "scene-error").slice(0, 240));
					return;
				}
				if (data.type === "stats") {
					sceneFrameLastStats = performance.now();
					if (userPaused || hasLowPower() || document.hidden) return;
					const fps = Math.max(0, Math.round(Number(data.fps) || 0));
					if (fps > 0) {
						scene.dataset.tlFps = String(fps);
						publishSceneStatus({ fps });
					}
				}
			};
			window.addEventListener("message", onSceneMessage);
			disposers.push(() => {
				window.removeEventListener("message", onSceneMessage);
				stopSceneFrame();
			});
			const mountSceneFrame = (choice) => {
				stopSceneFrame();
				sceneFrameActive = true;
				sceneFrame.hidden = false;
				scene.dataset.tlMedia = "scene";
				scene.dataset.tlFile = choice.url.slice(choice.url.lastIndexOf("/") + 1) || "scene";
				report("loading", "loading");
				sceneFrameLastStats = performance.now();
				sceneFrameTimer = window.setTimeout(() => failSceneFrame("scene-timeout"), 20000);
				const fps = effectiveShaderFps();
				const paused = userPaused || hasLowPower() || document.hidden;
				scene.setAttribute("data-tl-scene-fps", String(fps));
				sceneFrameMountSeq += 1;
				sceneFrameToken = "s" + String(sceneFrameMountSeq) + "-" + Date.now().toString(36);
				sceneFrame.dataset.tlSceneToken = sceneFrameToken;
				sceneFrame.src =
					ASSET_BASE +
					"/_scene-frame?project=" +
					encodeURIComponent(choice.url) +
					"&fps=" +
					String(fps) +
					"&token=" +
					encodeURIComponent(sceneFrameToken) +
					(paused ? "&paused=1" : "");
			};

			// ---- A3 web wallpaper: mount / park / fail ----
			const clearWebTimer = () => {
				if (webTimer !== 0) {
					window.clearTimeout(webTimer);
					webTimer = 0;
				}
			};
			/** Navigating away is the only reliable stop for a sandboxed project. */
			const unloadWebFrame = () => {
				webFrame.hidden = true;
				scene.removeAttribute("data-tl-web-on");
				try {
					webFrame.src = "about:blank";
				} catch {
					// detaching a frame is best effort
				}
			};
			const stopWebWallpaper = () => {
				webActive = false;
				webParked = false;
				clearWebTimer();
				unloadWebFrame();
			};
			const parkWebWallpaper = (owner) => {
				if (webActive === false) return;
				webActive = false;
				webParked = true;
				clearWebTimer();
				unloadWebFrame();
				if (owner === "user") report("paused", "paused", "user");
				else if (hasLowPower()) report("paused", "lowpower", "lowpower");
				else if (document.hidden) report("paused", "hidden");
				else report("paused", "paused");
			};
			const onWebLoad = () => {
				if (webActive === false) return;
				let loadedSrc = "";
				try {
					loadedSrc = String(webFrame.src ?? "");
				} catch {
					loadedSrc = "";
				}
				// The park path loads about:blank; that is not a rendered wallpaper.
				if (loadedSrc === "" || loadedSrc.startsWith("about:")) return;
				clearWebTimer();
				if (currentChoice === null || currentChoice.kind !== "web") return;
				// R6 B: a late load from a previous web choice (about:blank / old project)
				// must not mark the new one ready. Compare against the expected absolute URL.
				let expectedSrc = "";
				try {
					expectedSrc = new URL(webWallpaperSrc(currentChoice.url), globalThis.location?.href ?? "http://localhost/").href;
				} catch {
					expectedSrc = "";
				}
				if (expectedSrc === "" || loadedSrc !== expectedSrc) return;
				lastGoodChoice = currentChoice;
				webParked = false;
				scene.dataset.tlWidth = String(Math.round(globalThis.innerWidth || 0));
				scene.dataset.tlHeight = String(Math.round(globalThis.innerHeight || 0));
				scene.removeAttribute("data-tl-duration");
				if (userPaused || hasLowPower() || document.hidden) {
					parkWebWallpaper(userPaused ? "user" : hasLowPower() ? "lowpower" : "hidden");
					return;
				}
				markReady();
				report("ready", "playing");
				startTransition();
			};
			const onWebError = () => {
				if (webActive === false) return;
				failWebWallpaper("web-error");
			};
			const failWebWallpaper = (reason) => {
				if (webActive === false && webParked === false) return;
				const failed = currentChoice;
				const failGeneration = sourceGeneration;
				stopWebWallpaper();
				report("error", "error", reason);
				if (
					lastGoodChoice !== null &&
					(failed === null || lastGoodChoice.url !== failed.url || lastGoodChoice.kind !== failed.kind)
				) {
					const restore = lastGoodChoice;
					lastGoodChoice = null;
					applyWallpaper(restore);
					return;
				}
				// No known-good source: the automatic chain must replace the failure, never a
				// blank scene gradient behind an error message.
				void resolveAutoWallpaper().then((fallback) => {
					// R6 B: don't let a slow fallback overtake a newer user selection.
					if (failGeneration === sourceGeneration && fallback !== null && (failed === null || fallback.url !== failed.url)) applyWallpaper(fallback);
				});
			};
			const mountWebWallpaper = (choice) => {
				const src = webWallpaperSrc(choice.url);
				stopSceneFrame();
				stopWebWallpaper();
				if (src === "") {
					report("error", "error", "web-url");
					return;
				}
				webParked = false;
				scene.dataset.tlMedia = "web";
				// A persisted pause / low power / hidden tab must not load (and immediately
				// discard) a whole sandboxed project; park first, mount on resume.
				if (userPaused || hasLowPower() || document.hidden) {
					webActive = false;
					webParked = true;
					unloadWebFrame();
					if (userPaused) report("paused", "paused", "user");
					else if (hasLowPower()) report("paused", "lowpower", "lowpower");
					else report("paused", "hidden");
					return;
				}
				webActive = true;
				webFrame.hidden = false;
				scene.setAttribute("data-tl-web-on", "");
				report("loading", "loading");
				// A sandboxed 404 page still fires `load`, so probe the route first: a host
				// without `_web-project` must fall back at once instead of after 20 seconds.
				void fetch(src, { method: "HEAD", cache: "no-store" })
					.then((response) => {
						// Only a definitive "route/file missing" fails here; a host that
						// answers HEAD with 405 must still get its chance via the iframe load.
						if (response.status !== 404 && response.status !== 410 && response.status !== 501) return;
						// R6 B: a late HEAD reply for an older web choice must not fail a newer one.
						if (currentChoice === choice) failWebWallpaper("web-http-" + response.status);
					})
					.catch(() => {
						if (currentChoice === choice) failWebWallpaper("web-http");
					});
				webTimer = window.setTimeout(() => failWebWallpaper("web-timeout"), 20000);
				try {
					webFrame.src = src;
				} catch {
					failWebWallpaper("web-load");
				}
			};
			webFrame.addEventListener("load", onWebLoad);
			webFrame.addEventListener("error", onWebError);
			disposers.push(() => {
				webFrame.removeEventListener("load", onWebLoad);
				webFrame.removeEventListener("error", onWebError);
				stopWebWallpaper();
			});

			// ---- B4 transitions: preset + duration around every source swap ----
			/**
			 * The preset lives in transitionController (31-engine-extra). Reading it here,
			 * lazily, keeps 30 independent of fragment evaluation order: the controller is
			 * referenced only when a wallpaper actually swaps.
			 */
			function readTransitionSettings() {
				let state = null;
				try {
					if (typeof transitionController !== "undefined" && transitionController !== null && typeof transitionController.read === "function") {
						state = transitionController.read();
					}
				} catch {
					state = null;
				}
				const preset = state !== null && typeof state.preset === "string" ? state.preset : "fade";
				const duration = state !== null && Number.isFinite(state.durationMs) ? state.durationMs : 600;
				return {
					preset: ["fade", "slide", "zoom", "dissolve"].includes(preset) ? preset : "fade",
					durationMs: Math.min(1500, Math.max(200, Math.round(duration))),
				};
			}
			function transitionsAllowed() {
				if (hasLowPower()) return false;
				try {
					if (typeof globalThis.matchMedia === "function" && globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches === true) {
						return false;
					}
				} catch {
					// a missing matchMedia is not a reason to disable transitions
				}
				return true;
			}
			function clearTransition() {
				if (transitionTimer !== 0) {
					window.clearTimeout(transitionTimer);
					transitionTimer = 0;
				}
				scene.removeAttribute("data-tl-transition");
			}
			/** The outgoing still is done: drop its role so the layer settles hidden. */
			function finishHeldPhoto() {
				if (photo.dataset.tlPhotoRole !== "held") return;
				photo.removeAttribute("data-tl-photo-role");
				if (currentChoice === null || currentChoice.kind !== "image") {
					photo.removeAttribute("data-tl-ready");
					photo.hidden = true;
					photo.style.removeProperty("background-image");
				}
			}
			/**
			 * Called when the incoming source is actually decodable. Starting here (not at
			 * request time) means the animation never plays against a still-black layer.
			 */
			function startTransition() {
				clearTransition();
				if (transitionsAllowed() === false) {
					finishHeldPhoto();
					return;
				}
				scene.style.setProperty("--tl-tx-ms", transitionDuration + "ms");
				void scene.offsetHeight; // restart a still-running CSS animation on a fast switch
				scene.setAttribute("data-tl-transition", transitionPreset);
				transitionTimer = window.setTimeout(() => {
					transitionTimer = 0;
					scene.removeAttribute("data-tl-transition");
					finishHeldPhoto();
				}, transitionDuration + 80);
			}
			function requestTransition() {
				const settings = readTransitionSettings();
				transitionPreset = settings.preset;
				transitionDuration = settings.durationMs;
				clearTransition();
			}

			// ---- A5 frame cache: pre-paint under a loading video ----
			/**
			 * The cached still is only used while there is no live frame yet: once the
			 * real video decodes, `releaseHeldFrame` fades the photo layer out.
			 */
			function primeFrameCache(choice) {
				if (choice === null || choice.kind !== "video") return;
				const token = (cachePrimeToken += 1);
				void frameCacheController.lookup(choice).then((cached) => {
					if (cached === null || token !== cachePrimeToken) return;
					if (currentChoice === null || currentChoice.url !== choice.url) return;
					if (video.readyState >= 2 || heldFrame !== "") return;
					heldFrame = "cache";
					photo.dataset.tlPhotoRole = "held";
					photo.style.backgroundImage = 'url("' + cached.url.replace(/["\\)]/g, "") + '")';
					photo.dataset.tlReady = "";
					photo.hidden = false;
					// Diagnostic only: a note() here would log on every wallpaper load.
					tl5Diag("cache", { prepaint: cached.key });
				});
			}

			// ---- A4 dynamic resolution: pick / switch the encode of the logical wallpaper ----
			function syncResolutionDataset() {
				const label = resolutionLabel();
				if (scene.dataset.tlResolution !== label) scene.dataset.tlResolution = label;
			}
			function applyVariantDatasets(resolved) {
				if (resolved === null) {
					scene.removeAttribute("data-tl-variant");
					scene.removeAttribute("data-tl-variants");
					return;
				}
				scene.dataset.tlVariant = resolved.tier;
				scene.dataset.tlVariants = resolved.tiers.join(",");
			}
			function variantForChoice(choice, items) {
				if (choice === null || typeof choice !== "object" || choice.kind !== "video") return null;
				return resolveVariantChoice(choice, groupVariantItems(items));
			}
			/** Switches encode without touching the saved choice (logical wallpaper stays). */
			function switchVariant(nextChoice) {
				if (currentChoice === null || currentChoice.kind !== "video") return;
				const seek = video.currentTime;
				applyWallpaper(nextChoice, {
					seekTo: Number.isFinite(seek) ? seek : null,
					variantSwitch: true,
				});
			}
			async function maybeApplyVariant(choice) {
				const token = (variantToken += 1);
				syncResolutionDataset();
				if (choice === null || typeof choice !== "object" || choice.kind !== "video") {
					applyVariantDatasets(null);
					return;
				}
				const items = await readCatalog();
				if (token !== variantToken) return;
				if (currentChoice === null || currentChoice.kind !== "video") return;
				if (items === null) {
					applyVariantDatasets(null);
					return;
				}
				const resolved = variantForChoice(currentChoice, items);
				applyVariantDatasets(resolved);
				if (resolved === null || resolved.changed === false) return;
				if (currentChoice.url !== choice.url) return;
				if (videoStill !== null || userPaused || hasLowPower() || document.hidden) return;
				switchVariant(resolved.choice);
			}
			async function onResolutionSettled() {
				syncResolutionDataset();
				if (currentChoice === null || currentChoice.kind !== "video") return;
				if (videoStill !== null || userPaused || hasLowPower() || document.hidden) return;
				if (video.readyState === 0) return;
				const items = await readCatalog();
				if (items === null || currentChoice === null || currentChoice.kind !== "video") return;
				const resolved = variantForChoice(currentChoice, items);
				applyVariantDatasets(resolved);
				if (resolved !== null && resolved.changed) switchVariant(resolved.choice);
			}
			let resizeRaf = 0;
			const onWindowResize = () => {
				// The window may resize for many frames; one coalesced handler is enough.
				if (resizeRaf !== 0) return;
				resizeRaf = globalThis.requestAnimationFrame(() => {
					resizeRaf = 0;
					syncResolutionDataset();
				});
				if (resizeTimer !== 0) window.clearTimeout(resizeTimer);
				resizeTimer = window.setTimeout(() => {
					resizeTimer = 0;
					void onResolutionSettled();
				}, 400);
			};
			window.addEventListener("resize", onWindowResize, { passive: true });

			// ---- C3 performance-adaptive v2 ----
			/** Context/module/lock gate: false means "do not touch the scene". */
			function adaptiveAllowed() {
				try {
					if (
						typeof moduleController !== "undefined" &&
						moduleController !== null &&
						typeof moduleController.isEnabled === "function" &&
						moduleController.isEnabled("context") === false
					) {
						return false;
					}
				} catch {
					// a missing module layer means the context switch cannot veto; allow
				}
				let context = null;
				try {
					if (typeof contextController !== "undefined" && contextController !== null && typeof contextController.state === "function") {
						context = contextController.state();
					}
				} catch {
					context = null;
				}
				if (context === null || typeof context !== "object") return true;
				if (context.adaptive === false) return false;
				if (context.adaptiveLocked === true) return false;
				return true;
			}
			function publishAdaptiveStatus(reasonText, level, kind, fps, jitter) {
				adaptiveReason = reasonText;
				scene.dataset.tlAdaptive = reasonText;
				publishAdaptive({ active: true, kind, level, reason: reasonText, fps, jitter });
			}
			/**
			 * Restores the un-adapted state. Called when the context toggle/lock turns the
			 * sampler off, when the user explicitly resumes, and after sustained recovery.
			 */
			function clearAdaptive(why, silent) {
				const wasActive = adaptiveStill || adaptiveLevel !== 0 || adaptiveReason !== "";
				// Called on every wallpaper switch and every sampler tick while disabled;
				// once there is nothing to restore this must cost no DOM/diag writes.
				if (wasActive === false) return;
				adaptiveStill = false;
				adaptiveProbe = false;
				adaptiveLevel = 0;
				adaptiveLow = 0;
				adaptiveLowSince = 0;
				adaptiveHigh = 0;
				adaptiveSamples = 0;
				adaptiveStillAt = 0;
				adaptiveReason = "";
				scene.removeAttribute("data-tl-adaptive");
				publishAdaptive({ ...ADAPTIVE_DEFAULTS });
				if (wasActive === false) return;
				note("adaptive:cleared", why);
				if (silent === true || currentChoice === null) return;
				if (currentChoice.kind === "shader") {
					if (shaderActive && !video.paused) report("playing", "playing");
					return;
				}
				if (currentChoice.kind === "video") {
					if (userPaused || hasLowPower() || document.hidden) return;
					attemptPlay("adaptive");
				}
			}
			/**
			 * Video -> static frame at the current time: a paused element freezes for free.
			 * v0.5.3: every park resets the probe clock, so a failed probe re-parks and then
			 * waits the full 5 minute cooldown instead of chaining downgrades.
			 */
			function downgradeVideoToStatic(fps, jitter, why, perfLow) {
				const wasStill = adaptiveStill;
				adaptiveStill = true;
				adaptiveStillAt = performance.now();
				adaptiveProbe = false;
				adaptiveLow = 0;
				adaptiveLowSince = 0;
				adaptiveHigh = 0;
				adaptiveSamples = 0;
				// R6 C: a dropped-frame downgrade must not claim "low fps" (the source may
				// legitimately be 12fps); the reason names the real evidence instead.
				const reason =
					perfLow === true
						? TL_T("engine.adaptive.perfReason")
						: TL_T("engine.adaptive.staticReason", { fps: Math.round(fps) });
				try {
					video.pause();
				} catch {
					// a detached video cannot throw anything worth surfacing
				}
				publishAdaptiveStatus(reason, 0, "video", fps, jitter);
				report("still", "still", reason);
				// One note per state transition only (v0.5.3: no per-sample/per-probe spam).
				if (wasStill === false) note("adaptive:video-static", { fps: Math.round(fps), jitter, why: why ?? "sustained-low" });
			}
			function limitShaderFps(fps, jitter, cap) {
				const previous = adaptiveLevel;
				adaptiveLevel = Math.max(15, Math.round(cap));
				const reason = TL_T("engine.adaptive.fpsReason", { fps: Math.round(fps), cap: adaptiveLevel });
				publishAdaptiveStatus(reason, adaptiveLevel, "shader", fps, jitter);
				publishSceneStatus({ reason });
				scene.dataset.tlReason = reason;
				if (previous !== adaptiveLevel) note("adaptive:shader-fps", { fps: Math.round(fps), cap: adaptiveLevel });
			}
			/** Samples the channels that can actually be measured right now. */
			function collectAdaptiveSample() {
				if (sceneFrameActive) {
					const fps = Number(scene.dataset.tlFps) || 0;
					return fps > 0 ? { fps, jitter: 0 } : null;
				}
				if (currentChoice !== null && currentChoice.kind === "shader" && shaderActive) {
					const now = performance.now();
					const elapsed = now - (shaderWindowStart || now - 2000);
					shaderWindowStart = now;
					const fps = elapsed > 200 ? Math.round((shaderFrameTicks * 1000) / elapsed) : 0;
					const jitter = Math.round(shaderMaxGap);
					shaderFrameTicks = 0;
					shaderMaxGap = 0;
					return fps > 0 ? { fps, jitter } : null;
				}
				if (currentChoice !== null && currentChoice.kind === "video" && video.paused === false) {
					const fps = Number(scene.dataset.tlFps) || 0;
					const jitter = Number(scene.dataset.tlJitter) || 0;
					// R6 C: the probe's dropped-frame verdict travels with the sample; the
					// sampler must not treat a low source frame rate as a slow renderer.
					return fps > 0 ? { fps, jitter, perfLow: scene.dataset.tlPerf === "low" } : null;
				}
				return null;
			}
			/**
			 * v0.5.3 sampling gate: a background/occluded/minimized window reports near-zero
			 * fps, which is what froze the live 4K wallpaper in v0.5.2. Never sample there.
			 */
			function adaptiveEligible() {
				let focused = true;
				try {
					focused = typeof document.hasFocus === "function" ? document.hasFocus() === true : true;
				} catch {
					focused = false;
				}
				const hidden = document.hidden === true;
				const visible = hidden === false && (document.visibilityState === undefined || document.visibilityState === "visible");
				const lowPower = hasLowPower();
				// The opaque opening film hides the wallpaper and holds its decoder; any
				// frame-rate/dropped-frame sample taken behind it describes the film's GPU
				// budget, not the wallpaper's. Sampling there downgraded a healthy 4K video
				// to a still frame for five minutes (seen on a software renderer). Both
				// splashes carry [data-tl-splash]; the orphan is purged on the next apply.
				let splashOverlay = false;
				try {
					splashOverlay = document.body !== null && document.querySelector("[data-tl-splash]") !== null;
				} catch {
					splashOverlay = false;
				}
				return {
					eligible: focused && visible && lowPower === false && userPaused === false && splashOverlay === false,
					focused,
					visible,
					hidden,
					lowPower,
					userPaused,
					splashOverlay,
				};
			}
			function adaptiveTick() {
				if (scene.isConnected === false) return;
				if (adaptiveAllowed() === false) {
					// The module switch / the user's adaptive toggle or lock is authoritative:
					// park an automatic downgrade instead of keeping it stuck.
					clearAdaptive("context-off");
					return;
				}
				if (currentChoice === null) return;
				// A loading/buffering frame-rate sample describes network/decode, not GPU
				// headroom; acting on it would downgrade a wallpaper that is merely fetching.
				if (scene.dataset.tlPlay === "loading" || scene.dataset.tlPlay === "buffering") return;
				const gate = adaptiveEligible();
				const gateKey =
					(gate.focused ? "f" : "-") +
					(gate.visible ? "v" : "-") +
					(gate.lowPower ? "l" : "-") +
					(gate.userPaused ? "u" : "-") +
					(gate.splashOverlay ? "s" : "-") +
					(gate.eligible ? "1" : "0");
				if (gateKey !== adaptiveGateKey) {
					adaptiveGateKey = gateKey;
					// Focus/visibility included in the diagnostics payload; only on change.
					tl5Diag("engine", { adaptiveGate: gate });
				}
				const now = performance.now();
				const sample = gate.eligible ? collectAdaptiveSample() : null;
				if (sample !== null) {
					adaptiveLastFps = Number(sample.fps) || 0;
					adaptiveLastJitter = Number(sample.jitter) || 0;
					adaptiveLastPerfLow = typeof sample.perfLow === "boolean" ? sample.perfLow : false;
					adaptiveSamples += 1;
					if (adaptiveSampleIsLow(sample)) {
						if (adaptiveLow === 0) adaptiveLowSince = now;
						adaptiveLow += 1;
					} else {
						adaptiveLow = 0;
						adaptiveLowSince = 0;
					}
					const sampleHealthy =
						typeof sample.perfLow === "boolean" ? sample.perfLow !== true : Number(sample.fps) >= ADAPTIVE_RECOVER_FPS;
					adaptiveHigh = sampleHealthy ? adaptiveHigh + 1 : 0;
				}
				const decision = adaptiveDecision({
					eligible: gate.eligible,
					autoAllowed: true,
					kind: currentChoice.kind,
					still: adaptiveStill,
					probe: adaptiveProbe,
					now,
					stillAt: adaptiveStillAt,
					sample,
					lowStreak: adaptiveLow,
					lowSince: adaptiveLowSince,
					highStreak: adaptiveHigh,
					samples: adaptiveSamples,
					level: adaptiveLevel,
				});
				if (decision.action === "start-probe") {
					adaptiveProbe = true;
					adaptiveStill = false;
					adaptiveStillAt = now;
					adaptiveLow = 0;
					adaptiveLowSince = 0;
					adaptiveHigh = 0;
					adaptiveSamples = 0;
					attemptPlay("adaptive-probe");
					// Routine bookkeeping: diag only, no console note (v0.5.3 quiet console).
					tl5Diag("engine", { adaptiveProbe: { startedAt: now, cooldownMs: ADAPTIVE_PROBE_COOLDOWN_MS } });
					return;
				}
				if (decision.action === "probe-fail") {
					// Re-park; downgradeVideoToStatic resets stillAt => full new cooldown.
					downgradeVideoToStatic(adaptiveLastFps, adaptiveLastJitter, "probe-failed", adaptiveLastPerfLow);
					return;
				}
				if (decision.action === "recover") {
					adaptiveProbe = false;
					clearAdaptive("recovered");
					return;
				}
				if (decision.action === "downgrade") {
					downgradeVideoToStatic(adaptiveLastFps, adaptiveLastJitter, "sustained-low", adaptiveLastPerfLow);
					return;
				}
				if (currentChoice.kind === "shader" && (decision.action === "limit-shader" || decision.action === "raise-shader")) {
					const base = effectiveShaderFps();
					const current = adaptiveLevel > 0 ? adaptiveLevel : base;
					if (decision.action === "limit-shader") {
						const nextCap = Math.max(15, Math.round(current / 2));
						if (nextCap < current) limitShaderFps(adaptiveLastFps, adaptiveLastJitter, nextCap);
					} else {
						const restored = Math.min(base, adaptiveLevel * 2);
						if (restored >= base) clearAdaptive("shader-recovered");
						else limitShaderFps(adaptiveLastFps, adaptiveLastJitter, restored);
					}
					return;
				}
				// Shader 15fps probe: 5 minute cooldown (v0.5.3, was 60s); diag only.
				if (
					currentChoice.kind === "shader" &&
					adaptiveLevel > 0 &&
					adaptiveLevel <= 15 &&
					gate.eligible &&
					now - shaderProbeAt >= ADAPTIVE_PROBE_COOLDOWN_MS
				) {
					shaderProbeAt = now;
					limitShaderFps(adaptiveLastFps, adaptiveLastJitter, Math.min(effectiveShaderFps(), 30));
				}
			}
			function bindAdaptiveHooks() {
				adaptiveHooks = {
					sync: () => {
						if (scene.isConnected === false) return;
						adaptiveTick();
					},
				};
			}
			bindAdaptiveHooks();
			adaptiveTimer = window.setInterval(adaptiveTick, 2000);
			disposers.push(() => {
				if (adaptiveTimer !== 0) {
					window.clearInterval(adaptiveTimer);
					adaptiveTimer = 0;
				}
				adaptiveHooks = null;
				adaptiveStill = false;
				adaptiveProbe = false;
				adaptiveLevel = 0;
				adaptiveReason = "";
				scene.removeAttribute("data-tl-adaptive");
				publishAdaptive({ ...ADAPTIVE_DEFAULTS });
			});

			/**
			 * The moving wallpaper is the whole point of this skin, so
			 * prefers-reduced-motion only trims decorative CSS animation; it must
			 * never silently park the video on its first frame.
			 *
			 * Low power is the one exception: while the body carries the attribute the
			 * play requests are refused, so a visibility change, a new source or the
			 * autoplay retry cannot silently undo the saving.
			 */
			function hasLowPower() {
				return document.body !== null && document.body.hasAttribute("data-tl-lowpower");
			}
			function wantsPlayback() {
				return (
					currentChoice !== null &&
					currentChoice.kind === "video" &&
					videoStill === null &&
					adaptiveStill === false &&
					userPaused === false &&
					video.hidden === false &&
					document.hidden === false &&
					hasLowPower() === false
				);
			}
			function clearRetry() {
				if (retryTimer !== 0) {
					window.clearTimeout(retryTimer);
					retryTimer = 0;
				}
			}
			function scheduleRetry(delay) {
				if (retryTimer !== 0) return;
				retryTimer = window.setTimeout(() => {
					retryTimer = 0;
					attemptPlay("retry");
				}, delay);
			}
			/**
			 * One place where playback is requested, so the promise's rejection reason can
			 * become visible state instead of a console line. Autoplay rejection is NOT an
			 * error: the browser is waiting for a gesture, and the panel shows that button.
			 * AbortError is a source-switch race and retries by itself.
			 */
			function attemptPlay(source) {
				if (wantsPlayback() === false) return;
				// An explicit click is the one signal that may retry a blocked source.
				if (
					playBlocked === true &&
					source !== "gesture" &&
					source !== "focus" &&
					source !== "visible" &&
					source !== "user"
				) {
					return;
				}
				lastAttemptAt = performance.now();
				playAttempts += 1;
				try {
					// Some browsers reset muted when the element is re-created by the media
					// pipeline; re-assert it so a muted wallpaper is never treated as audible.
					video.muted = true;
				} catch {
					// muting is best effort; the element is already muted by construction
				}
				let promise = null;
				try {
					promise = video.play();
				} catch (error) {
					report("error", "error", String(error?.name ?? "play-failed"));
					return;
				}
				if (promise === null || typeof promise.then !== "function") return;
				const token = (playToken += 1);
				promise
					.then(() => {
						if (token !== playToken) return;
						playBlocked = false;
						playAttempts = 0;
						if (video.paused === false) report("playing", "playing");
					})
					.catch((error) => {
						if (token !== playToken) return;
						const name = String(error?.name ?? "");
						if (name === "AbortError") {
							// A source swap interrupted this request; the new load owns the state.
							scheduleRetry(350);
							return;
						}
						if (name === "NotAllowedError") {
							playBlocked = true;
							report("paused", "blocked", "autoplay");
							note("video:autoplay-blocked", { source });
							return;
						}
						report("error", "error", name === "" ? "play-failed" : name);
						note("video:play-failed", { source, name });
					});
			}
			function start() {
				if (hasLowPower()) return;
				if (sceneFrameActive) return;
				// C3: a static-frame downgrade owns the paused state; the watchdog and a
				// visibility change must not silently undo it.
				if (adaptiveStill) return;
				if (videoStill !== null) return;
				if (shaderActive) {
					startShaderLoop();
					return;
				}
				if (video.hidden || currentChoice === null || currentChoice.kind !== "video") return;
				if (video.paused) attemptPlay("start");
			}
			// The pause must freeze on the current frame: a video element does that for
			// free, which is why low-power mode costs nothing to render.
			scenePlayback = {
				pause: (owner) => {
					if (owner === "user") userPaused = true;
					if (currentChoice !== null && currentChoice.kind === "web") {
						parkWebWallpaper(owner);
						return;
					}
					if (sceneFrameActive) {
						postSceneFrame({ type: "pause" });
						scene.removeAttribute("data-tl-fps");
						if (owner === "user") report("paused", "paused", "user");
						else if (hasLowPower()) report("paused", "lowpower", "lowpower");
						else report("paused", document.hidden ? "hidden" : "paused");
						return;
					}
					stopShaderLoop();
					try {
						video.pause();
					} catch {
						// a detached video cannot throw anything worth surfacing
					}
					if (owner === "user") report("paused", "paused", "user");
					else if (hasLowPower()) report("paused", "lowpower", "lowpower");
					else report("paused", document.hidden ? "hidden" : "paused");
				},
				resume: (owner) => {
					// Low-power/visibility may ask for a resume; a standing user pause wins.
					if (owner !== "user" && readPlayback().paused === true) return;
					userPaused = false;
					// Any resume request (user pause toggle, low-power exit) overrules the
					// static-frame downgrade; the sampler re-evaluates on the next tick.
					if (owner === "user" || adaptiveStill) clearAdaptive("resume");
					if (currentChoice !== null && currentChoice.kind === "web") {
						if (hasLowPower() || document.hidden) return;
						if (webActive === false) mountWebWallpaper(currentChoice);
						report("playing", "playing");
						return;
					}
					if (sceneFrameActive) {
						postSceneFrame({ type: "resume" });
						report("playing", "playing");
						return;
					}
					if (shaderActive) {
						startShaderLoop();
						report("playing", "playing");
						return;
					}
					if (video.hidden || currentChoice === null || currentChoice.kind !== "video") return;
					attemptPlay("user");
				},
				state: () => sceneStatus,
			};
			// The supervisor installs before the scene (it sets the attribute early), so
			// ask it to re-apply now that there is a playback target to pause.
			if (lowPowerController !== null && typeof lowPowerController.sync === "function") lowPowerController.sync();
			/** Keep the last visible frame over the next load so switching never blinks. */
			function releaseHeldFrame() {
				if (heldFrame === "") return;
				heldFrame = "";
				// Fade, don't cut: the photo sits above the video, so removing `data-tl-ready`
				// starts its 900ms opacity transition while the video fades in underneath.
				photo.removeAttribute("data-tl-ready");
			}
			function holdCurrentFrame() {
				if (video.hidden || video.readyState < 2 || video.videoWidth <= 0) return;
				try {
					const scale = Math.min(1, 960 / video.videoWidth);
					const canvas = document.createElement("canvas");
					canvas.width = Math.max(2, Math.round(video.videoWidth * scale));
					canvas.height = Math.max(2, Math.round(video.videoHeight * scale));
					const context = canvas.getContext("2d");
					if (context === null) return;
					context.drawImage(video, 0, 0, canvas.width, canvas.height);
					const frame = canvas.toDataURL("image/jpeg", 0.6);
					if (frame === "" || frame === "data:,") return;
					heldFrame = frame;
					// The role tells the transition CSS which direction this layer animates:
					// "held" is the OUTGOING still, "media" is a still wallpaper being shown.
					photo.dataset.tlPhotoRole = "held";
					photo.style.backgroundImage = 'url("' + frame + '")';
					photo.dataset.tlReady = "";
					photo.hidden = false;
				} catch {
					// A cross-origin frame taints the canvas; the scene gradient holds instead.
					heldFrame = "";
				}
			}
			/**
			 * Switching from a STILL wallpaper to a video has no video frame to capture;
			 * the already-visible photo layer is the outgoing snapshot instead.
			 */
			function captureHeldFromPhoto() {
				if (heldFrame !== "") return;
				if (photo.dataset.tlPhotoRole !== "media" || photo.hidden) return;
				heldFrame = "previous-image";
				photo.dataset.tlPhotoRole = "held";
				photo.dataset.tlReady = "";
			}
			const stopFpsProbe = () => {
				if (fpsHandle !== 0 && typeof video.cancelVideoFrameCallback === "function") {
					try {
						video.cancelVideoFrameCallback(fpsHandle);
					} catch {
						// an already-finished callback is fine
					}
				}
				fpsHandle = 0;
				fpsStart = 0;
				fpsFrames = 0;
				fpsLastFrame = 0;
				fpsMaxGap = 0;
				fpsQualityTotal = 0;
				fpsQualityDropped = 0;
				fpsQualityPrimed = false;
				fpsQualityWindows = 0;
			};
			/**
			 * R6 C: measure presented frames AND playback-quality evidence. The source's
			 * own frame rate is content (a 12fps animation, a 24fps clip at 0.5x), so raw
			 * presented fps must never be the downgrade signal. `data-tl-perf="low"` is
			 * set only for real dropped-frame / huge-gap evidence; 32-effects keys its
			 * freeze decision off that attribute instead of the fps floor.
			 */
			const startFpsProbe = () => {
				if (typeof video.requestVideoFrameCallback !== "function" || fpsHandle !== 0 || video.paused) return;
				if (fpsQualityPrimed === false) {
					// R8b (REV-R6 F1): take the baseline at the start of a new probe window.
					try {
						const base = typeof video.getVideoPlaybackQuality === "function" ? video.getVideoPlaybackQuality() : null;
						fpsQualityTotal = base === null || base === undefined ? 0 : Math.max(0, Math.floor(Number(base.totalVideoFrames) || 0));
						fpsQualityDropped = base === null || base === undefined ? 0 : Math.max(0, Math.floor(Number(base.droppedVideoFrames) || 0));
					} catch {
						fpsQualityTotal = 0;
						fpsQualityDropped = 0;
					}
					fpsQualityPrimed = true;
					fpsQualityWindows = 0;
				}
				const probe = (now) => {
					fpsHandle = 0;
					if (
						currentChoice === null ||
						currentChoice.kind !== "video" ||
						video.hidden === true ||
						video.paused ||
						document.hidden
					) {
						return;
					}
					// Frames are flowing again: a previous stall report must not stick.
					if (scene.dataset.tlPlay === "stalled") report("playing", "playing");
					lastFrameAt = now;
					if (fpsLastFrame !== 0) {
						const gap = now - fpsLastFrame;
						if (gap > fpsMaxGap) fpsMaxGap = gap;
					}
					fpsLastFrame = now;
					if (fpsStart === 0) {
						fpsStart = now;
						fpsFrames = 0;
					}
					fpsFrames += 1;
					const elapsed = now - fpsStart;
					if (elapsed >= 1000) {
						const presented = Math.max(0, Math.round((fpsFrames * 1000) / elapsed));
						const rate = Number.isFinite(video.playbackRate) && video.playbackRate > 0 ? video.playbackRate : 1;
						// Normalize by speed: a 24fps clip at 0.5x presents 12 frames/s, which is
						// not a performance problem.
						const sourceFps = rate === 1 ? presented : Math.max(0, Math.round(presented / rate));
						const jitter = Math.max(0, Math.round(fpsMaxGap));
						let total = 0;
						let dropped = 0;
						try {
							const quality = typeof video.getVideoPlaybackQuality === "function" ? video.getVideoPlaybackQuality() : null;
							if (quality !== null && quality !== undefined) {
								total = Math.max(0, Math.floor(Number(quality.totalVideoFrames) || 0));
								dropped = Math.max(0, Math.floor(Number(quality.droppedVideoFrames) || 0));
							}
						} catch {
							total = 0;
							dropped = 0;
						}
						const deltaTotal = Math.max(0, total - fpsQualityTotal);
						const deltaDropped = Math.max(0, dropped - fpsQualityDropped);
						fpsQualityTotal = total;
						fpsQualityDropped = dropped;
						// R8b (REV-R6 F1): the first window after a (re)baseline only records
						// the counters; judging starts from the second window.
						if (fpsQualityWindows === 0) {
							fpsQualityWindows = 1;
							scene.dataset.tlFps = String(sourceFps);
							scene.dataset.tlJitter = String(jitter);
							publishSceneStatus({ fps: sourceFps, jitter });
							fpsStart = now;
							fpsFrames = 0;
							fpsMaxGap = 0;
							fpsHandle = video.requestVideoFrameCallback(probe);
							return;
						}
						fpsQualityWindows += 1;
						const expectedGap = sourceFps > 0 ? 1000 / sourceFps : 0;
						const gapEvidence = expectedGap > 0 && jitter > Math.max(ADAPTIVE_VIDEO_GAP_MS, expectedGap * 4);
						const dropEvidence =
							deltaTotal >= 30 && deltaDropped >= ADAPTIVE_VIDEO_DROP_MIN && deltaDropped / deltaTotal > ADAPTIVE_VIDEO_DROP_RATIO;
						const perfLow = gapEvidence || dropEvidence;
						scene.dataset.tlFps = String(sourceFps);
						scene.dataset.tlJitter = String(jitter);
						if (perfLow) scene.dataset.tlPerf = "low";
						else scene.removeAttribute("data-tl-perf");
						publishSceneStatus({ fps: sourceFps, jitter });
						fpsStart = now;
						fpsFrames = 0;
						fpsMaxGap = 0;
					}
					fpsHandle = video.requestVideoFrameCallback(probe);
				};
				fpsHandle = video.requestVideoFrameCallback(probe);
			};
			const onLoaded = () => {
				// R6 B: ignore a load event that belongs to a channel we already left.
				if (currentChoice === null || currentChoice.kind !== "video" || video.hidden === true) return;
				// A resolution switch keeps the playback position instead of restarting the
				// video from zero; only a real wallpaper change starts at the beginning.
				if (pendingSeekTo !== null) {
					const target = pendingSeekTo;
					pendingSeekTo = null;
					try {
						if (Number.isFinite(video.duration) && video.duration > 0) {
							video.currentTime = Math.min(Math.max(0, target), Math.max(0, video.duration - 0.05));
						}
					} catch {
						// seeking before metadata is best effort; playback continues anyway
					}
				}
				// The new source has a frame: the held previous frame has done its job.
				// Keeping it past this point would show the OLD wallpaper over a new one
				// that failed to autoplay, which reads as "the switch did nothing".
				releaseHeldFrame();
				if (video.videoWidth > 0 && video.videoHeight > 0) {
					scene.dataset.tlWidth = String(video.videoWidth);
					scene.dataset.tlHeight = String(video.videoHeight);
				}
				if (Number.isFinite(video.duration) && video.duration > 0) {
					scene.dataset.tlDuration = String(Math.round(video.duration));
				}
				if (currentChoice !== null) lastGoodChoice = currentChoice;
				if (!video.paused) startFpsProbe();
				applyPlayback(scene, readPlayback());
				markReady();
				report("ready", userPaused ? "paused" : video.paused ? "ready" : "playing", userPaused ? "user" : "");
				// A5: snapshot this frame for the next load of the same wallpaper.
				const captured = currentChoice;
				if (captured !== null && captured.kind === "video" && video.readyState >= 2) {
					captureFrameCache(captured, video, () => currentChoice !== null && currentChoice.url === captured.url);
				}
				start();
			};
			const onPlaying = () => {
				if (currentChoice === null || currentChoice.kind !== "video" || video.hidden === true) return;
				releaseHeldFrame();
				lastFrameAt = performance.now();
				playBlocked = false;
				playAttempts = 0;
				report("playing", "playing");
				startFpsProbe();
			};
			const onPause = () => {
				if (currentChoice === null || currentChoice.kind !== "video" || video.hidden === true) return;
				stopFpsProbe();
				scene.removeAttribute("data-tl-fps");
				scene.removeAttribute("data-tl-jitter");
				// R6 C: a paused video has no dropped-frame verdict; leaving a stale "low"
				// would keep the effect layer frozen for no measured reason.
				scene.removeAttribute("data-tl-perf");
				publishSceneStatus({ fps: 0, jitter: 0 });
				// C3 paused the video itself; the reason must survive this event.
				if (adaptiveStill) {
					report("still", "still", adaptiveReason);
					return;
				}
				if (hasLowPower()) report("paused", "lowpower", "lowpower");
				else if (document.hidden) report("paused", "hidden");
				else if (userPaused) report("paused", "paused", "user");
				else report(video.ended ? "ended" : "paused", "paused");
			};
			const onWaiting = () => {
				if (currentChoice === null || currentChoice.kind !== "video" || video.hidden === true) return;
				if (userPaused || hasLowPower() || document.hidden) return;
				report("loading", "buffering");
			};
			const onError = () => {
				// R6 B: a released/retired video must not trigger the fallback chain.
				if (currentChoice === null || currentChoice.kind !== "video" || video.hidden === true) return;
				const src = video.getAttribute("src");
				if (src === null || src === "") return;
				const code = video.error?.code;
				stopFpsProbe();
				scene.removeAttribute("data-tl-fps");
				scene.removeAttribute("data-tl-jitter");
				// Keep the failure inspectable from devtools instead of failing silent.
				console.error("[ui-skin-tianlight] wallpaper error", code, video.currentSrc || video.src);
				report("error", "error", code === undefined ? "decode" : "media-" + code);
				// Try the next candidate once, then restore the last source that actually
				// produced a frame. A missing/unsupported replacement must never leave the
				// background blank while a known-good wallpaper is still available.
				const index = VIDEO_CANDIDATES.findIndex(
					(candidate) => video.currentSrc.endsWith(candidate.file) || video.src.endsWith(candidate.file),
				);
				const next = VIDEO_CANDIDATES[index + 1];
				if (index >= 0 && next !== undefined) {
					video.src = ASSET_BASE + "/" + next.file;
					start();
					return;
				}
				if (
					lastGoodChoice !== null &&
					(currentChoice === null || lastGoodChoice.url !== currentChoice.url || lastGoodChoice.kind !== currentChoice.kind)
				) {
					const restore = lastGoodChoice;
					lastGoodChoice = null;
					applyWallpaper(restore);
				}
			};
			const onVisibility = () => {
				if (document.hidden) {
					if (sceneFrameActive) postSceneFrame({ type: "pause" });
					video.pause();
					// A web project cannot be frozen from outside: unload it, remount on show.
					if (currentChoice !== null && currentChoice.kind === "web") parkWebWallpaper("hidden");
					report("paused", "hidden");
				} else if (userPaused === false) {
					// v0.5.3: an automatic C3 downgrade measured while the tab was hidden is
					// stale; a visible tab must not come back to a frozen frame.
					clearAdaptive("visible");
					if (sceneFrameActive) {
						postSceneFrame({ type: "resume" });
						report("playing", "playing");
					}
					if (currentChoice !== null && currentChoice.kind === "web" && !hasLowPower() && webActive === false) {
						mountWebWallpaper(currentChoice);
					}
					start();
				}
			};
			const onResumeSignal = () => {
				if (document.hidden || userPaused) return;
				// v0.5.3: refocusing the window clears any automatic downgrade immediately;
				// C3 may only downgrade again after a fresh focused 5-sample/10s streak.
				clearAdaptive("refocus");
				if (sceneFrameActive) {
					postSceneFrame({ type: "resume" });
					report("playing", "playing");
				}
				if (currentChoice !== null && currentChoice.kind === "web" && !hasLowPower() && webActive === false) {
					mountWebWallpaper(currentChoice);
				}
				start();
			};
			// A gesture anywhere on the page is enough to satisfy the autoplay policy, but
			// only if we hear it. Capture phase keeps a host handler that calls
			// stopPropagation() from swallowing the unlock.
			const onUserGesture = () => {
				if (document.hidden) return;
				if (userPaused) return;
				playBlocked = false;
				if (video.paused && wantsPlayback()) attemptPlay("gesture");
			};
			const watchdogTick = () => {
				if (scene.isConnected === false) return;
				// A web project reports nothing: its only health signal is the mount
				// timeout, so the video watchdog must stay out of its way.
				if (currentChoice !== null && currentChoice.kind === "web") return;
				if (sceneFrameActive) {
					// The adapter posts stats every second; silence while "playing" means the
					// engine loop died. Surface it so the panel offers 重试 instead of a
					// frozen picture that still claims to be live.
					if (
						scene.dataset.tlPlay === "playing" &&
						sceneFrameLastStats > 0 &&
						performance.now() - sceneFrameLastStats > 6000
					) {
						report("playing", "stalled", "scene-no-stats");
					}
					return;
				}
				if (wantsPlayback() && video.paused && video.readyState >= 2) {
					if (playBlocked) return;
					if (performance.now() - lastAttemptAt < 1500) return;
					if (playAttempts >= 4) {
						report("paused", "stalled", "play-timeout");
						return;
					}
					attemptPlay("watchdog");
					return;
				}
				if (
					video.paused === false &&
					video.readyState >= 2 &&
					lastFrameAt > 0 &&
					performance.now() - lastFrameAt > 2500
				) {
					report("playing", "stalled", "no-frame");
				}
			};

			// R8b (REV-R6 F3): per-source-generation video event binding. The old code
			// registered handlers once with the element, so an event emitted by the previous
			// source could act on the next one during a switch (A→B window).
			let videoEventBinding = null;
			const unbindVideoEvents = () => {
				if (videoEventBinding === null) return;
				for (const [name, handler] of Object.entries(videoEventBinding.handlers)) {
					video.removeEventListener(name, handler);
				}
				videoEventBinding = null;
			};
			const bindVideoEvents = (generation) => {
				unbindVideoEvents();
				const guard = (handler) => (event) => {
					// First line: the event must belong to the source that installed the binding.
					if (generation !== sourceGeneration) return;
					handler(event);
				};
				const handlers = {
					loadeddata: guard(onLoaded),
					playing: guard(onPlaying),
					pause: guard(onPause),
					waiting: guard(onWaiting),
					canplay: guard(start),
					error: guard(onError),
				};
				for (const [name, handler] of Object.entries(handlers)) video.addEventListener(name, handler);
				videoEventBinding = { generation, handlers };
			};

			document.addEventListener("visibilitychange", onVisibility);
			window.addEventListener("pointerdown", onUserGesture, { capture: true, passive: true });
			window.addEventListener("keydown", onUserGesture, { capture: true });
			window.addEventListener("touchstart", onUserGesture, { capture: true, passive: true });
			window.addEventListener("focus", onResumeSignal);
			window.addEventListener("pageshow", onResumeSignal);
			watchdogTimer = window.setInterval(watchdogTick, 2500);

			disposers.push(() => {
				clearRetry();
				if (watchdogTimer !== 0) {
					window.clearInterval(watchdogTimer);
					watchdogTimer = 0;
				}
				// R8b: the per-source-generation binding owns the video handlers; removing
				// them here is what the static listener pairing sees as the matching remove.
				unbindVideoEvents();
				document.removeEventListener("visibilitychange", onVisibility);
				window.removeEventListener("pointerdown", onUserGesture, { capture: true });
				window.removeEventListener("keydown", onUserGesture, { capture: true });
				window.removeEventListener("touchstart", onUserGesture, { capture: true });
				window.removeEventListener("focus", onResumeSignal);
				window.removeEventListener("pageshow", onResumeSignal);
				window.removeEventListener("pointermove", onShaderPointer);
			});

			const applyWallpaper = (choice, options) => {
				if (!scene.isConnected) return;
				// R6 B: all async callbacks capture this token; anything that resolves after
				// a newer applyWallpaper() is stale and must not touch the scene.
				sourceGeneration += 1;
				const generation = sourceGeneration;
				clearRetry();
				stopFpsProbe();
				scene.removeAttribute("data-tl-fps");
				scene.removeAttribute("data-tl-jitter");
				scene.removeAttribute("data-tl-perf");
				requestTransition();
				// C3: a new source gets a clean adaptive baseline (silent: the old source is
				// on its way out and must not be resumed just to be replaced).
				clearAdaptive("source-switch", true);
				adaptiveLastPerfLow = false;
				shaderFrameTicks = 0;
				shaderWindowStart = 0;
				shaderLastPaint = 0;
				shaderMaxGap = 0;
				// A4: preserving the playback position is what makes a resolution switch
				// invisible instead of "the wallpaper restarted".
				pendingSeekTo =
					options !== null && options !== undefined && Number.isFinite(options.seekTo) ? options.seekTo : null;
				// Every source switch starts from a clean playback intent: a blocked or
				// runtime-paused state belongs to the OLD source. A PERSISTED pause is the
				// exception — it is the user's standing choice and survives a reload.
				userPaused = readPlayback().paused === true;
				playBlocked = false;
				playAttempts = 0;
				publishSceneStatus({ fps: 0, jitter: 0 });
				if (choice === null) {
					currentChoice = null;
					stopSceneFrame();
					stopWebWallpaper();
					// R6 A: no source at all still releases the video decoder.
					releaseVideo();
					applyVariantDatasets(null);
					scene.removeAttribute("data-tl-media");
					scene.removeAttribute("data-tl-width");
					scene.removeAttribute("data-tl-height");
					scene.removeAttribute("data-tl-duration");
					if (wallpaperController !== null) {
						wallpaperController.image = null;
						wallpaperController.shaderSwatch = null;
					}
					report("no-source", "idle");
					return;
				}
				// Route every request through the provider gate: an unsupported source
				// reports why instead of leaving the previous wallpaper silently in place.
				const verdict = resolveWallpaperChoice(choice);
				if (verdict.ok === false) {
					report("unsupported", "error", "unsupported");
					note("wallpaper:unsupported", verdict.reason);
					return;
				}
				choice = verdict.choice;
				// A4: if the catalog is already warm, pick the right encode before mounting.
				choice = pickCachedVariant(choice);
				currentChoice = choice;
				scene.dataset.tlMedia = choice.kind;
				scene.removeAttribute("data-tl-width");
				scene.removeAttribute("data-tl-height");
				scene.removeAttribute("data-tl-duration");
				videoStillToken += 1;
				videoStill = null;
				clearStillHandlers();
				if (choice.kind !== "video") applyVariantDatasets(null);
				if (choice.kind !== "shader") audioController.stop(TL_T("audio.stopSwitch"));
				// Any non-scene source retires the optional scene frame first.
				if (choice.kind !== "scene") stopSceneFrame();
				// A3: the web project owns its own iframe; it is not one of the media
				// channels, so the other four are retired before it mounts.
				if (choice.kind === "web") {
					shaderActive = false;
					stopShaderLoop();
					shaderCanvas.hidden = true;
					scene.removeAttribute("data-tl-shader-on");
					// R6 A: leaving the video channel releases its decoder, not just hides it.
					releaseVideo();
					heldFrame = "";
					photo.hidden = true;
					photo.removeAttribute("data-tl-ready");
					photo.removeAttribute("data-tl-photo-role");
					photo.style.removeProperty("background-image");
					if (wallpaperController !== null) {
						wallpaperController.image = null;
						wallpaperController.shaderSwatch = null;
					}
					applyVariantDatasets(null);
					syncResolutionDataset();
					mountWebWallpaper(choice);
					return;
				}
				// Every other source retires a mounted web project (scripts must stop).
				stopWebWallpaper();
				if (choice.kind === "scene") {
					shaderActive = false;
					stopShaderLoop();
					shaderCanvas.hidden = true;
					scene.removeAttribute("data-tl-shader-on");
					// R6 A: scene channel does not use the video element; release it.
					releaseVideo();
					heldFrame = "";
					photo.hidden = true;
					photo.removeAttribute("data-tl-ready");
					photo.style.removeProperty("background-image");
					if (wallpaperController !== null) {
						wallpaperController.image = null;
						wallpaperController.shaderSwatch = null;
					}
					mountSceneFrame(choice);
					return;
				}
				if (choice.kind === "shader") {
					// R6 A: the shader canvas replaces the video; free the decoder.
					releaseVideo();
					heldFrame = "";
					photo.hidden = true;
					photo.removeAttribute("data-tl-ready");
					photo.style.removeProperty("background-image");
					if (wallpaperController !== null) wallpaperController.image = null;
					report("loading", "loading");
					if (shaderRenderer === null) shaderRenderer = createShaderRenderer(shaderCanvas);
					if (shaderRenderer === null) {
						// No WebGL: fall back to the normal catalog instead of a blank scene.
						report("error", "error", "no-webgl");
						note("shader:no-webgl", {});
						const fallbackGeneration = generation;
						void resolveAutoWallpaper().then((fallback) => {
							if (fallbackGeneration === sourceGeneration) applyWallpaper(fallback);
						});
						return;
					}
					shaderParams = readShaderSettings();
					if (shaderParams.source !== shaderSource) {
						const error = shaderRenderer.apply(shaderParams.source);
						if (error !== null) {
							// Keep the saved choice so the panel can fix it after the fallback.
							report("error", "error", "shader-compile");
							note("shader:compile", { error });
							shaderActive = false;
							stopShaderLoop();
							shaderCanvas.hidden = true;
							scene.removeAttribute("data-tl-shader-on");
							const fallbackGeneration = generation;
							void resolveAutoWallpaper().then((fallback) => {
								if (fallbackGeneration === sourceGeneration) applyWallpaper(fallback);
							});
							return;
						}
						shaderSource = shaderParams.source;
					}
					shaderCanvas.hidden = false;
					scene.setAttribute("data-tl-shader-on", "");
					scene.dataset.tlFile = "shader";
					shaderActive = true;
					shaderLast = performance.now();
					try {
						paintShader(shaderLast);
					} catch (error) {
						note("shader:render", error);
					}
					// C3 measures real rendered frames from a fresh window per source.
					shaderFrameTicks = 0;
					shaderMaxGap = 0;
					shaderLastPaint = 0;
					shaderWindowStart = performance.now();
					snapshotShader();
					if (wallpaperController !== null) wallpaperController.shaderSwatch = shaderSwatch;
					if (currentChoice !== null) lastGoodChoice = currentChoice;
					start();
					startTransition();
					report("ready", "playing");
					return;
				}
				// Leaving the shader channel: stop its loop before a media layer takes over.
				shaderActive = false;
				stopShaderLoop();
				shaderCanvas.hidden = true;
				scene.removeAttribute("data-tl-shader-on");
				if (wallpaperController !== null) wallpaperController.shaderSwatch = null;
				const file = choice.url.slice(choice.url.lastIndexOf("/") + 1);
				if (choice.kind === "image") {
					// R6 A: the still-image channel replaces the video; free the decoder.
					releaseVideo();
					heldFrame = "";
					report("loading", "loading");
					photo.hidden = false;
					// A still wallpaper IS the photo layer; transitions animate it IN.
					photo.dataset.tlPhotoRole = "media";
					scene.dataset.tlFile = file;
					// Preload separately: marking ready on the div would flash the empty
					// layer before the bytes arrive.
					const probe = new Image();
					probe.onload = () => {
						// R6 B: a late image from an older request must not flip the scene to
						// "ready" (or overwrite the new source's width/height/last-good).
						if (generation !== sourceGeneration) return;
						if (probe.naturalWidth > 0 && probe.naturalHeight > 0) {
							scene.dataset.tlWidth = String(probe.naturalWidth);
							scene.dataset.tlHeight = String(probe.naturalHeight);
						}
						if (currentChoice !== null) lastGoodChoice = currentChoice;
						photo.dataset.tlReady = "";
						markReady();
						// A5: an image wallpaper is also a valid cache snapshot.
						const captured = choice;
						captureFrameCache(captured, probe, () => currentChoice !== null && currentChoice.url === captured.url);
						report("ready", "ready");
					};
					probe.onerror = () => {
						if (generation !== sourceGeneration) return;
						report("error", "error", "image-decode");
						// AVIF/SVG/WebP support varies; fall back to the last good wallpaper
						// instead of leaving a blank still layer.
						if (
							lastGoodChoice !== null &&
							(currentChoice === null || lastGoodChoice.url !== currentChoice.url || lastGoodChoice.kind !== currentChoice.kind)
						) {
							const restore = lastGoodChoice;
							lastGoodChoice = null;
							applyWallpaper(restore);
						}
					};
					probe.src = choice.url;
					// Kept for the palette sampler: a still wallpaper is not a <video>.
					if (wallpaperController !== null) wallpaperController.image = probe;
					photo.style.backgroundImage = 'url("' + choice.url.replace(/["\\)]/g, "") + '")';
					applyVariantDatasets(null);
					syncResolutionDataset();
					return;
				}
				// Hold the last decoded frame while the next video loads: the element goes
				// blank the moment `load()` runs, and the scene gradient alone reads as a
				// flicker on every switch.
				holdCurrentFrame();
				captureHeldFromPhoto();
				if (heldFrame === "") {
					photo.hidden = true;
					photo.removeAttribute("data-tl-ready");
					photo.removeAttribute("data-tl-photo-role");
					photo.style.removeProperty("background-image");
				}
				if (wallpaperController !== null) wallpaperController.image = null;
				video.hidden = false;
				video.removeAttribute("data-tl-ready");
				report("loading", "loading");
				const still = Number.isFinite(choice.still) ? Math.max(0, choice.still) : null;
				videoStill = still;
				const stillToken = videoStillToken;
				video.autoplay = still === null && userPaused === false;
				if (userPaused) report("paused", "paused", "user");
				// R8b (REV-R6 F3): bind this source's handlers BEFORE the src change; the
				// previous binding is removed, so late A events cannot touch B.
				bindVideoEvents(sourceGeneration);
				video.src = choice.url;
				video.load();
				// Which file actually won: readable from devtools when diagnosing decode.
				scene.dataset.tlFile = file;
				// A5 + A4: cached still paints under the loading video; the shared catalog
				// then decides whether a better encode exists for this window.
				primeFrameCache(choice);
				void maybeApplyVariant(choice);
				if (still === null) {
					start();
					return;
				}
				const settleStill = () => {
					stillSeekHandler = null;
					if (stillToken !== videoStillToken) return;
					try {
						video.pause();
					} catch {
						// a detached video cannot throw anything worth surfacing
					}
					markReady();
					report("ready", "still");
				};
				const seekStill = () => {
					stillMetaHandler = null;
					if (stillToken !== videoStillToken) return;
					const target = Math.min(still, Math.max(0, (video.duration || still) - 0.05));
					if (video.readyState >= 2 && Math.abs(video.currentTime - target) < 0.01) {
						settleStill();
						return;
					}
					stillSeekHandler = settleStill;
					video.addEventListener("seeked", settleStill, { once: true });
					try {
						video.currentTime = target;
					} catch {
						settleStill();
					}
				};
				if (video.readyState >= 1) seekStill();
				else {
					stillMetaHandler = seekStill;
					video.addEventListener("loadedmetadata", stillMetaHandler, { once: true });
				}
			};
			wallpaperController = {
				image: null,
				shaderSwatch: null,
				apply: (choice) => {
					saveWallpaperChoice(choice);
					applyWallpaper(choice);
				},
				/** Re-run the CURRENT source without touching the saved choice. */
				reload: () => {
					if (currentChoice !== null) applyWallpaper(currentChoice);
				},
			};
			rotationRuntime = createRotationRuntime({
				model: readRotation(),
				list: listRotationCandidates,
				apply: (choice) => {
					if (wallpaperController !== null) wallpaperController.apply(choice);
				},
				current: () => currentChoice,
				isStill: () => videoStill !== null,
				prepare: prepareWallpaper,
			});
			syncResolutionDataset();
			void (async () => {
				// The catalog decides the encode: waiting for it once means the very first
				// mount already uses the window-appropriate variant (no reload on start).
				await readCatalog();
				const initial = await resolveWallpaper();
				// R6 B: a wallpaper the user picked while the catalog was still loading
				// must win over the boot-time automatic resolution.
				if (currentChoice === null) applyWallpaper(initial);
			})();

			return () => {
				clearStillHandlers();
				clearRetry();
				releaseHeldFrame();
				audioController.stop(TL_T("audio.stopSkin"));
				stopFpsProbe();
				stopShaderLoop();
				// Teardown of everything the engine extras mounted or scheduled: after this
				// the scene DOM is gone and no stray fetch/timer may touch it.
				currentChoice = null;
				cachePrimeToken += 1;
				cancelFrameCacheCapture();
				releaseFrameCacheUrls();
				clearTransition();
				stopWebWallpaper();
				if (resizeTimer !== 0) {
					window.clearTimeout(resizeTimer);
					resizeTimer = 0;
				}
				if (resizeRaf !== 0) {
					globalThis.cancelAnimationFrame(resizeRaf);
					resizeRaf = 0;
				}
				window.removeEventListener("resize", onWindowResize);
				for (const dispose of disposers) dispose();
				if (shaderRenderer !== null) shaderRenderer.dispose();
				shaderRenderer = null;
				wallpaperController = null;
				if (rotationRuntime !== null) {
					rotationRuntime.stop();
					rotationRuntime = null;
				}
				scenePlayback = null;
				publishSceneStatus({ status: "idle", reason: "", fps: 0, jitter: 0 });
				video.pause();
				video.removeAttribute("src");
				video.load();
				scene.remove();
			};
		}
		//#endregion
