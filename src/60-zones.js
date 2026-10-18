		//#region zone framing
		/**
		 * Per-zone wallpaper framing. Two zones, independent settings:
		 *   main  the picture behind the conversation
		 *   rail  the workspace column, which usually wants a different crop
		 * Each zone picks fit (crop / whole picture / stretch), the focal point that
		 * survives the crop, a dim and a blur. That is the answer to "the video's
		 * aspect ratio does not match the window".
		 */
		const ZONE_KEY = "tianlight.zones";
		const ZONE_MODES = ["cover", "contain", "stretch"];
		/** Ratio presets. `null` follows the window, which is the "avoid imbalance" default. */
		const RATIOS = { auto: null, "16:9": 16 / 9, "16:10": 1.6, "4:3": 4 / 3, "1:1": 1, "21:9": 21 / 9, "9:16": 9 / 16 };
		const ZONE_DEFAULTS = {
			main: { fit: "cover", fx: 38, fy: 50, dim: 0, blur: 0, ratio: "auto", zoom: 100, cx: 50, cy: 50 },
			rail: { fit: "cover", fx: 50, fy: 50, dim: 16, blur: 0, url: "", kind: "video" },
		};
		let zoneController = null;
		/** Playback hook for the rail's own video, owned by installZoneFraming. */
		let railPlayback = null;

		/**
		 * The crop window, in source-normalised coordinates, that yields the chosen
		 * ratio. `w/h = R / frameRatio` keeps the VISIBLE window on ratio even when
		 * the window is not: cover absorbs the remainder, so no distortion appears.
		 */
		function cropWindow(zone) {
			const zoom = Math.min(3, Math.max(0.3, (Number(zone.zoom) || 100) / 100));
			const frameRatio = (globalThis.innerWidth || 16) / (globalThis.innerHeight || 9);
			const preset = RATIOS[zone.ratio] ?? null;
			const w = 1 / zoom;
			const h = 1 / zoom;
			let cropW = w;
			let cropH = h;
			if (preset !== null) {
				// Visible ratio = frameRatio * (cropW / cropH); solving for the preset gives
				// cropH = cropW * frameRatio / preset. When that overflows the source box,
				// BOTH sides shrink by the same factor, so the ratio survives the clamp.
				cropH = (cropW * frameRatio) / preset;
				const scale = Math.min(1, 1 / cropH, 1 / cropW);
				cropW *= scale;
				cropH *= scale;
			}
			return {
				w: cropW.toFixed(4),
				h: cropH.toFixed(4),
				x: ((1 - cropW) * (Math.min(100, Math.max(0, zone.cx ?? 50)) / 100)).toFixed(4),
				y: ((1 - cropH) * (Math.min(100, Math.max(0, zone.cy ?? 50)) / 100)).toFixed(4),
			};
		}

		const pct = (value, fallback, max) => {
			if (!Number.isFinite(value)) return fallback;
			return Math.min(max, Math.max(0, Math.round(value)));
		};

		function normalizeZones(raw) {
			// `separate` is the single user-facing switch; the per-zone numbers keep
			// sensible defaults and exist only so the two framings can differ at all.
			const model = { separate: false, main: { ...ZONE_DEFAULTS.main }, rail: { ...ZONE_DEFAULTS.rail } };
			if (raw === null || typeof raw !== "object") return model;
			if (typeof raw.separate === "boolean") model.separate = raw.separate;
			for (const name of ["main", "rail"]) {
				const saved = raw[name];
				if (saved === null || typeof saved !== "object") continue;
				const zone = model[name];
				if (ZONE_MODES.includes(saved.fit)) zone.fit = saved.fit;
				zone.fx = pct(saved.fx, zone.fx, 100);
				zone.fy = pct(saved.fy, zone.fy, 100);
				zone.dim = pct(saved.dim, zone.dim, 70);
				zone.blur = pct(saved.blur, zone.blur, 12);
				if (name === "main") {
					if (typeof saved.ratio === "string" && Object.prototype.hasOwnProperty.call(RATIOS, saved.ratio)) zone.ratio = saved.ratio;
					zone.zoom = Math.min(300, Math.max(30, pct(saved.zoom, zone.zoom, 300)));
					zone.cx = pct(saved.cx, zone.cx, 100);
					zone.cy = pct(saved.cy, zone.cy, 100);
				}
				if (name === "rail") {
					if (typeof saved.url === "string" && saved.url !== "") zone.url = saved.url;
					if (saved.kind === "image" || saved.kind === "video") zone.kind = saved.kind;
				}
			}
			return model;
		}

		function readZones() {
			try {
				const raw = JSON.parse(globalThis.localStorage.getItem(ZONE_KEY) ?? "null");
				return normalizeZones(raw);
			} catch {
				return normalizeZones(null);
			}
		}

		function saveZones(model) {
			try {
				globalThis.localStorage.setItem(ZONE_KEY, JSON.stringify(model));
			} catch {
				// storage may be blocked; the framing still applies for this session
			}
		}

		function applyZones(model) {
			const scene = document.querySelector("[data-tl-scene]");
			if (scene !== null) {
				const main = model.main;
				// object-fit uses `fill` for stretch; the still layer uses a pair of lengths.
				scene.style.setProperty("--tl-fit", main.fit === "stretch" ? "fill" : main.fit);
				scene.style.setProperty("--tl-fit-size", main.fit === "stretch" ? "100% 100%" : main.fit);
				scene.style.setProperty("--tl-focal-x", main.fx + "%");
				scene.style.setProperty("--tl-focal-y", main.fy + "%");
				scene.style.setProperty("--tl-zone-dim", String(main.dim / 100));
				scene.setAttribute("data-tl-fit", main.fit);
				const crop = cropWindow(main);
				scene.style.setProperty("--crop-w", crop.w);
				scene.style.setProperty("--crop-h", crop.h);
				scene.style.setProperty("--crop-x", crop.x);
				scene.style.setProperty("--crop-y", crop.y);
			}
			const rail = document.querySelector("[data-tl-rail]");
			if (rail !== null) {
				rail.style.setProperty("--tl-rail-blur", model.rail.blur + "px");
				rail.style.setProperty("--tl-rail-dim", String(model.rail.dim / 100));
			}
		}

		/**
		 * The rail mirrors the same media through a canvas instead of opening a second
		 * decoder: one video in memory, two independent framings.
		 */
		function installZoneFraming() {
			const rail = document.createElement("div");
			rail.setAttribute("data-tl-rail", "");
			const canvas = document.createElement("canvas");
			const shade = document.createElement("div");
			shade.setAttribute("data-tl-rail-dim", "");
			rail.append(canvas, shade);
			if (document.body !== null) document.body.appendChild(rail);

			const surface = canvas.getContext("2d");
			let zones = readZones();
			let raf = 0;
			let frame = 0;
			let lastWidth = -1;

			applyZones(zones);
			let separate = zones.separate === true;
			// The rail's own source, used only when the switch is on AND a file is chosen.
			// Empty means "mirror the main wallpaper", which costs no extra decode.
			let railSource = null;
			let railUrl = "";
			const releaseRailSource = () => {
				if (railSource !== null && railSource instanceof HTMLVideoElement) {
					railSource.pause();
					railSource.removeAttribute("src");
					railSource.load();
				}
				railSource = null;
				railUrl = "";
			};
			const useRailSource = (url, kind) => {
				if (url === "" || url === null) {
					releaseRailSource();
					return;
				}
				if (url === railUrl && railSource !== null) return;
				releaseRailSource();
				railUrl = url;
				if (kind === "image") {
					const image = new Image();
					image.src = url;
					railSource = image;
					return;
				}
				const video = document.createElement("video");
				video.muted = true;
				video.loop = true;
				video.playsInline = true;
				video.preload = "auto";
				video.setAttribute("muted", "");
				video.src = url;
				// Low power keeps the rail video parked; the supervisor resumes it when
				// the mode turns off.
				if (document.body === null || document.body.hasAttribute("data-tl-lowpower") === false) {
					void video.play().catch(() => {});
				}
				railSource = video;
			};
			railPlayback = {
				pause: () => {
					stopRailLoop();
					if (railSource instanceof HTMLVideoElement) railSource.pause();
				},
				resume: () => {
					if (separate) ensureRailLoop();
					if (railSource instanceof HTMLVideoElement && railSource.paused) {
						void railSource.play().catch(() => {});
					}
				},
			};
			zoneController = {
				read: () => ({ ...zones, separate }),
				apply: (model) => {
					zones = model;
					separate = model.separate === true;
					saveZones(model);
					applyZones(model);
					useRailSource(separate ? (model.rail.url ?? "") : "", model.rail.kind);
					// Turning the switch off must take the mirror down immediately rather
					// than waiting for the next bounds sample.
					if (separate) ensureRailLoop();
					else {
						stopRailLoop();
						rail.removeAttribute("data-tl-on");
					}
				},
			};
			useRailSource(separate ? (zones.rail.url ?? "") : "", zones.rail.kind);

			const tick = () => {
				raf = 0;
				frame += 1;
				// No rail, no loop: with "same as main wallpaper" the mirror used to run a
				// full rAF loop at 60Hz just to skip every draw. The main video keeps the
				// whole frame budget now.
				if (separate === false) {
					rail.removeAttribute("data-tl-on");
					return;
				}
				if (document.body !== null && document.body.hasAttribute("data-tl-lowpower")) return;
				// Bound the sidebar every 30 frames: it is stamped later than boot and its
				// width animates when the user collapses the rail.
				if (frame % 30 === 0) {
					const sidebar = document.querySelector("[data-tl-sidebar]");
					const width = sidebar instanceof HTMLElement ? Math.round(sidebar.getBoundingClientRect().width) : 0;
					const on = separate && width > 40;
					if (on !== (rail.getAttribute("data-tl-on") !== null)) {
						rail.toggleAttribute("data-tl-on", on);
					}
					if (on && width !== lastWidth) {
						lastWidth = width;
						rail.style.width = width + "px";
						const dpr = Math.min(2, globalThis.devicePixelRatio || 1);
						canvas.width = Math.max(1, Math.round(width * dpr));
						canvas.height = Math.max(1, Math.round(window.innerHeight * dpr));
						canvas.style.height = window.innerHeight + "px";
					}
				}
				// ~12 fps is plenty for a background panel and keeps the main video smooth.
				if (
					frame % railFrameStep() === 0 &&
					rail.getAttribute("data-tl-on") !== null &&
					surface !== null &&
					document.body !== null &&
					!document.body.hasAttribute("data-tl-lowpower")
				) {
					const shaderOn = document.querySelector("[data-tl-scene][data-tl-shader-on]") !== null;
					const still = wallpaperController === null ? null : wallpaperController.image;
					const video = document.querySelector("[data-tl-scene] > video");
					// A rail-specific file wins; otherwise the rail mirrors the main media. A
					// WebGL canvas cannot be read reliably from another task (the drawing buffer
					// is cleared after compositing), so an independent shader lets the main
					// scene show through and the stale mirror frame is cleared below.
					const source =
						shaderOn && railSource === null
							? null
							: railSource !== null
								? railSource
								: still !== null && still !== undefined
									? still
									: video;
					// Every branch must be handled by TYPE: a rail video has no `.complete`,
					// and an Image has no `readyState`.
					const isVideo = source instanceof HTMLVideoElement;
					const ready = isVideo ? source.readyState >= 2 : source !== null && source !== undefined && source.complete === true;
					if (ready) {
						const sw = isVideo ? source.videoWidth : source.naturalWidth;
						const sh = isVideo ? source.videoHeight : source.naturalHeight;
						if (sw > 0 && sh > 0) {
							const cw = canvas.width;
							const ch = canvas.height;
							const zone = zones.rail;
							surface.clearRect(0, 0, cw, ch);
							if (zone.fit === "stretch") {
								surface.drawImage(source, 0, 0, sw, sh, 0, 0, cw, ch);
							} else {
								const scale = zone.fit === "contain" ? Math.min(cw / sw, ch / sh) : Math.max(cw / sw, ch / sh);
								const dw = sw * scale;
								const dh = sh * scale;
								const dx = (cw - dw) * (zone.fx / 100);
								const dy = (ch - dh) * (zone.fy / 100);
								if (zone.fit === "contain") {
									surface.fillStyle = "#0a1420";
									surface.fillRect(0, 0, cw, ch);
								}
								surface.drawImage(source, dx, dy, dw, dh);
							}
						}
					} else if (shaderOn && railSource === null) {
						surface.clearRect(0, 0, canvas.width, canvas.height);
					}
				}
				raf = globalThis.requestAnimationFrame(tick);
			};
			const ensureRailLoop = () => {
				if (raf !== 0) return;
				raf = globalThis.requestAnimationFrame(tick);
			};
			const stopRailLoop = () => {
				if (raf !== 0) globalThis.cancelAnimationFrame(raf);
				raf = 0;
			};
			if (separate) ensureRailLoop();

			return () => {
				zoneController = null;
				railPlayback = null;
				stopRailLoop();
				releaseRailSource();
				rail.remove();
			};
		}
		//#endregion

