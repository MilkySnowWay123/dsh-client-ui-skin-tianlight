		function apply(ctx) {
			// Hard boundary: a DSH upgrade can change the DOM or a service without notice,
			// and an exception thrown out of apply() marks the plugin fibre failed. Catch
			// everything here so a skin defect can never take the page down with it — the
			// worst case is "no skin", never "no DSH".
			try {
				const body = document.body;
				if (body === null) {
					note("apply:no-body", {});
					return;
				}
				ctx.effect(() => installStyles(), "ui-skin-tianlight: stylesheet");
				ctx.effect(() => installGlassOpacity(), "ui-skin-tianlight: glass opacity");
				ctx.effect(() => installLowPower(), "ui-skin-tianlight: low power");
				ctx.effect(() => installSelectorBridge(), "ui-skin-tianlight: selector bridge");
				// Set and dispose the scoping attribute in ONE effect registered before any
				// fallible work: if the scene or companion throws, the attribute must still
				// have an owner that removes it, or the skin CSS stays armed for the page.
				ctx.effect(
					() => {
						body.setAttribute(BODY_ATTR, "");
						return () => {
							body.removeAttribute(BODY_ATTR);
						};
					},
					"ui-skin-tianlight: body attribute",
				);
				ctx.effect(() => installScene(), "ui-skin-tianlight: wallpaper");
				ctx.effect(() => installZoneFraming(), "ui-skin-tianlight: zone framing");
				ctx.effect(() => installCompanion(), "ui-skin-tianlight: companion");
				ctx.effect(() => installEffortRheostat(ctx), "ui-skin-tianlight: reasoning rheostat");
				ctx.effect(() => installFontPanel(ctx), "ui-skin-tianlight: font panel");
				ctx.effect(() => installWallpaperSidebar(ctx), "ui-skin-tianlight: wallpaper sidebar");
			} catch (error) {
				note("apply:failed", error);
			}
		}

		exports.apply = apply;
		return module.exports;
	}
});
