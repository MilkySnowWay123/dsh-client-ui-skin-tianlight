		//#region splash
		function installSplashFilm(options) {
			const opts = options !== null && typeof options === "object" ? options : {};
			if (typeof document === "undefined" || document.body === null) return null;
			const existing = document.getElementById("film");
			if (existing && existing.hasAttribute("data-tl-splash")) existing.remove();
			const host = document.createElement("div");
			host.id = "film";
			host.setAttribute("data-tl-splash", "");
			host.setAttribute("data-state", "loading");
			host.setAttribute("aria-hidden", "true");
			host.innerHTML = SPLASH_FILM_DOM;
			try {
				const buildLabel = host.querySelector(".tc-l0");
				if (buildLabel !== null) buildLabel.textContent = "TIANLIGHT " + TL_BUILD_VERSION;
			} catch {
				// a stripped DOM cannot print the build label; the film still runs
			}
			const style = document.createElement("style");
			style.setAttribute("data-tl-splash-film-style", "");
			style.textContent = SPLASH_FILM_CSS;
			host.appendChild(style);
			for (const id of Object.keys(SPLASH_FILM_SHADERS)) {
				const entry = SPLASH_FILM_SHADERS[id];
				const tag = document.createElement("script");
				tag.id = id;
				tag.type = entry.type === "vertex" ? "x-shader/x-vertex" : "x-shader/x-fragment";
				tag.textContent = entry.src;
				host.appendChild(tag);
			}
			const skipHint = host.querySelector("#skipHint");
			if (skipHint && typeof opts.skipText === "string" && opts.skipText !== "") skipHint.textContent = opts.skipText;
			// The film is opaque: hide the wallpaper and hold its video paused so the
			// 4K decoder does not compete with the shader. The wallpaper module installs
			// *after* the splash (scene and video do not exist yet at this point), and it
			// can start/retry playback later, so watch for the scene to appear and hold
			// every `play` while the film is active. On exit resume only the videos the
			// wallpaper actually asked to play; a user-paused wallpaper stays paused.
			let scene = document.querySelector("[data-tl-scene]");
			let sceneVisibility = scene ? scene.style.visibility : "";
			let sceneHidden = false;
			const heldVideos = [];
			const holdSceneVideo = (event) => {
				const video = event !== null && event !== undefined ? event.currentTarget : null;
				const entry = heldVideos.find((candidate) => candidate.video === video);
				if (entry === null || entry === undefined) return;
				entry.pausedByFilm = true;
				try {
					if (video.paused === false) video.pause();
				} catch {
					// a detached video freezes by itself
				}
			};
			const holdVideo = (video) => {
				if (heldVideos.some((candidate) => candidate.video === video)) return;
				const entry = { video, pausedByFilm: false };
				heldVideos.push(entry);
				try {
					if (video.paused === false) {
						entry.pausedByFilm = true;
						video.pause();
					}
					video.addEventListener("play", holdSceneVideo);
				} catch {
					// a video without listeners simply keeps its old behaviour
				}
			};
			const hideScene = (found) => {
				scene = found;
				if (sceneObserver !== null) {
					try {
						sceneObserver.disconnect();
					} catch {
						// ignore
					}
					sceneObserver = null;
				}
				if (sceneWatch !== 0) {
					try {
						globalThis.clearInterval(sceneWatch);
					} catch {
						// ignore
					}
					sceneWatch = 0;
				}
				sceneVisibility = found.style.visibility;
				try {
					found.style.visibility = "hidden";
					sceneHidden = true;
				} catch {
					// a stripped scene still gets the video hold below
				}
				for (const video of found.querySelectorAll("video")) holdVideo(video);
			};
			let sceneObserver = null;
			let sceneWatch = 0;
			if (scene !== null) {
				hideScene(scene);
			} else if (typeof MutationObserver === "function") {
				sceneObserver = new MutationObserver(() => {
					if (scene !== null) return;
					const found = document.querySelector("[data-tl-scene]");
					if (found !== null) hideScene(found);
				});
				try {
					sceneObserver.observe(document.body, { childList: true });
				} catch {
					sceneObserver = null;
				}
			}
			if (scene === null && sceneObserver === null && typeof globalThis.setInterval === "function") {
				sceneWatch = globalThis.setInterval(() => {
					if (scene !== null) return;
					const found = document.querySelector("[data-tl-scene]");
					if (found !== null) hideScene(found);
				}, 250);
			}
			const restoreScene = () => {
				if (sceneObserver !== null) {
					try {
						sceneObserver.disconnect();
					} catch {
						// ignore
					}
					sceneObserver = null;
				}
				if (sceneWatch !== 0) {
					try {
						globalThis.clearInterval(sceneWatch);
					} catch {
						// ignore
					}
					sceneWatch = 0;
				}
				if (scene !== null && sceneHidden === true) {
					try {
						scene.style.visibility = sceneVisibility;
					} catch {
						// ignore
					}
					sceneHidden = false;
				}
				for (const entry of heldVideos) {
					try {
						entry.video.removeEventListener("play", holdSceneVideo);
					} catch {
						// ignore
					}
					if (entry.pausedByFilm === true && entry.video.paused === true) {
						try {
							void entry.video.play().catch(() => {});
						} catch {
							// autoplay refusal is reported by the wallpaper controller
						}
					}
					entry.pausedByFilm = false;
				}
			};
			// Hide the whole DSH tree while the opaque film is playing; the app still
			// initialises, and the real panels are shown again just before the landing.
			const appRoot = document.getElementById("root");
			const rootVisibility = appRoot ? appRoot.style.visibility : "";
			if (appRoot) appRoot.style.visibility = "hidden";
			let rootTimer = 0;
			const restoreRoot = () => {
				if (rootTimer) { clearTimeout(rootTimer); rootTimer = 0; }
				if (appRoot) appRoot.style.visibility = rootVisibility;
				try { restoreScene(); } catch {}
			};
			rootTimer = setTimeout(restoreRoot, 16500);
			document.body.appendChild(host);
			let disposed = false;
			let hardTimer = 0;
			let fallbackTimer = 0;
			let api = null;
			/** Only errors thrown *by this skin's bundle* end the film early; a DSH
			 *  rejection or an unrelated extension error must not cut the opening. */
			const onPageError = (event) => {
				if (disposed) return;
				const source = String(event !== null && event !== undefined ? event.filename ?? "" : "");
				if (source.indexOf(PLUGIN_ID) < 0) return;
				finishOnce("error");
			};
			try {
				globalThis.addEventListener?.("error", onPageError);
			} catch {
				// no window guard: the hard stop below still owns the exit
			}
			const finishOnce = (reason) => {
				if (disposed) return;
				disposed = true;
				if (hardTimer) clearTimeout(hardTimer);
				if (fallbackTimer) clearTimeout(fallbackTimer);
				try { globalThis.removeEventListener?.("error", onPageError); } catch {}
				try { if (api) api.dispose(); else if (host.parentNode) host.parentNode.removeChild(host); } catch {}
				try { restoreScene(); } catch {}
				try { restoreRoot(); } catch {}
				if (globalThis.__tlSplashFilm === api) globalThis.__tlSplashFilm = null;
				if (typeof opts.onDone === "function") opts.onDone(reason || "done");
			};
			try {
				api = createSplashFilmRuntime({
					sound: opts.sound === true,
					onDone: () => finishOnce("done"),
					onFallback: (reason) => {
						if (typeof opts.onFallback === "function") opts.onFallback(reason || "fallback");
						if (disposed || fallbackTimer !== 0) return;
						fallbackTimer = setTimeout(() => {
							fallbackTimer = 0;
							finishOnce("fallback");
						}, 1800);
					},
				});
			} catch (error) {
				finishOnce("error");
				throw error;
			}
			try { globalThis.__tlSplashFilm = api; } catch {}
			hardTimer = setTimeout(() => finishOnce("timeout"), 23500);
			return {
				skip: () => { try { if (api) api.skip(); } catch {} },
				dispose: () => finishOnce("disposed"),
				status: () => (api ? api.state() : null),
			};
		}
		//#endregion
