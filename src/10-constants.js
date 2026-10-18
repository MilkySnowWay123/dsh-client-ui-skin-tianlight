		//#region constants
		/** Asset prefix owned by this skin's host half (`lib/index.js`). */
		const ASSET_BASE = "/skin-tianlight";
		/** Body attribute that both scopes the stylesheet and drives teardown. */
		const BODY_ATTR = "data-dsh-tianlight";
		/** The product marks the dark theme on <body>; several rules and the wallpaper
		 *  palette sample key off it. */
		const DARK_ATTR = "data-ds-dark-theme";
		const PLUGIN_ID = "@dsh-external/dsh-client-ui-skin-tianlight";
		const CSS_TAG_ID = "ui-skin-tianlight/tianlight.css";
		const STORAGE_KEY = "dsh-tianlight:cat:v1";

		/**
		 * Render budget tiers, shared by the shader wallpaper, the rail mirror and the
		 * performance panel. Kept in constants because three regions consume it; the
		 * low-power supervisor still wins and freezes everything regardless of tier.
		 * "auto"/"30" use 30fps, "60" opts into 60fps, "15" halves both.
		 */
		const FPS_KEY = "tianlight.fps";
		const FPS_TIERS = ["auto", "60", "30", "15"];
		/** Mirrors the host's upload cap default; the panel prefers the host's live value. */
		const UPLOAD_LIMIT = 512 * 1024 * 1024;
		let renderTier = "auto";
		try {
			const saved = globalThis.localStorage?.getItem(FPS_KEY);
			if (FPS_TIERS.includes(saved)) renderTier = saved;
		} catch {
			renderTier = "auto";
		}
		function readRenderTier() {
			return renderTier;
		}
		function effectiveShaderFps() {
			return renderTier === "60" ? 60 : renderTier === "15" ? 15 : 30;
		}
		function railFrameStep() {
			return renderTier === "60" ? 3 : renderTier === "15" ? 10 : 5;
		}
		const renderTierController = {
			read: readRenderTier,
			set: (next) => {
				renderTier = FPS_TIERS.includes(next) ? next : "auto";
				try {
					globalThis.localStorage.setItem(FPS_KEY, renderTier);
				} catch {
					// persistence is optional; this session still uses the new tier
				}
			},
		};

		/**
		 * Wallpaper preference order. An entry may declare the codec MIME the
		 * browser must decode; HEVC is tried first, but an H.264 file stays behind
		 * it so an unsupported codec can never leave the page with no wallpaper.
		 */
		const VIDEO_CANDIDATES = [
			// Broad container/codec family only: a fully qualified profile string can
			// report "unsupported" on browsers that do decode HEVC, which would skip
			// the uploaded wallpaper for no reason.
			{ file: "bg-main.mp4", codec: 'video/mp4; codecs="hvc1"' },
			{ file: "bg-4k.mp4" },
			{ file: "bg-1080.mp4" },
		];
		/** Horizontal focal point of the character, per the composition brief. */
		const FOCAL_X = "38%";

		/**
		 * Developer-facing note. Deliberately NOT a network beacon: posting diagnostics
		 * to a route the running host has not loaded produced a 405 on every page load,
		 * which is noise in the user's console for no information.
		 */
		function note(stage, detail) {
			try {
				console.warn("[ui-skin-tianlight] " + stage, detail ?? "");
			} catch {
				// logging must never affect the page
			}
		}

		/**
		 * Shared React runtime. Optional: if the host does not expose it the skin
		 * still applies, it simply registers no extra controls.
		 */
		let React = null;
		try {
			React = require("react");
		} catch (error) {
			React = null;
			note("react-missing", { message: String(error?.message ?? error) });
		}
		//#endregion

