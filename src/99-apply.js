		//#region apply
		/**
		 * One page can outlive one plugin instance: the loader re-applies a bundle when a
		 * patch/profile changes, and a hot reload can mount the new fibre before the old
		 * one is disposed. Every skin instance therefore publishes a single disposer on
		 * `globalThis` and the next instance calls it before installing anything.
		 *
		 * Why not "remove the [data-tl-*] hosts and re-apply" (the old guard)? Removing
		 * DOM nodes does not stop the old instance: its window/document listeners, its
		 * MutationObserver, its timers and its slot registrations stay alive, so the old
		 * companion kept living as a second cat and the old pointer handlers kept eating
		 * clicks. Worse, a late disposal of the old instance could remove the NEW
		 * instance's body attribute and stylesheet. The registry below disposes effects
		 * in reverse install order and is idempotent, so a later cordis disposal is a
		 * no-op instead of a second teardown.
		 */
		const INSTANCE_REGISTRY_KEY = "__dshTianlightInstance";

		/**
		 * Tear one instance down completely.
		 *
		 * R8 (REV-R4A F1): NEW instances publish only a closure-owned `dispose()` and
		 * never expose the live cordis `ctx`/fiber on `globalThis` (a same-page script
		 * could otherwise reach the live context through the diagnostics registry and
		 * inject services such as `remote.session`, bypassing the Agent authorization
		 * model). This helper stays for OLD instances that may still be sitting in the
		 * registry after a hot reload: they carry their own `ctx` (pre-R8 shape) or
		 * their own `dispose()` closure.
		 */
		function teardownInstance(instance) {
			if (instance === undefined || instance === null) return;
			if (globalThis[INSTANCE_REGISTRY_KEY] === instance) globalThis[INSTANCE_REGISTRY_KEY] = null;
			// R8+ object: its own closure owns ctx/fiber/effects. Delegate instead of
			// duplicating the teardown bookkeeping.
			if ((instance.ctx === undefined || instance.ctx === null) && typeof instance.dispose === "function") {
				try {
					instance.dispose();
				} catch (error) {
					note("apply:dispose-failed", error);
				}
				return;
			}
			const fiber = instance.ctx === undefined ? undefined : instance.ctx.fiber;
			if (fiber !== undefined && fiber !== null && typeof fiber.dispose === "function") {
				try {
					fiber.dispose();
				} catch (error) {
					note("apply:fiber-dispose-failed", error);
				}
			}
			try {
				instance.disposeEffects();
			} catch (error) {
				note("apply:dispose-failed", error);
			}
		}

		function disposePreviousInstance() {
			const previous = globalThis[INSTANCE_REGISTRY_KEY];
			if (previous === undefined || previous === null) return;
			// Each instance owns its teardown: a pre-R8 registry object disposes its own
			// ctx.fiber, an R8 object disposes through its closure. The generic helper is
			// only a fallback for an exotic registry value (e.g. a half-written object).
			if (typeof previous.dispose === "function") {
				try {
					previous.dispose();
				} catch (error) {
					note("apply:previous-dispose-failed", error);
				}
				if (globalThis[INSTANCE_REGISTRY_KEY] === previous) globalThis[INSTANCE_REGISTRY_KEY] = null;
				return;
			}
			teardownInstance(previous);
		}

		/**
		 * Remove hosts an OLDER skin build may have left behind (no registry, or a build
		 * whose disposer failed). The new instance owns fresh nodes from here on, so this
		 * only ever runs before installing; it is deliberately not a substitute for the
		 * registry above.
		 */
		function purgeOrphanHosts(body) {
			try {
				for (const selector of [
					"[data-tl-scene]",
					"[data-tl-rail]",
					"[data-tl-cat]",
					"[data-tl-wall]",
					"[data-tl-wall-scrim]",
					"[data-tl-wall-handle]",
					"[data-tl-font-panel]",
					// v0.5.0 layers: a previous build may have left these behind when a
					// module was disabled mid-session or a disposer failed.
					"[data-tl-fx]",
					"[data-tl-ambient]",
					"[data-tl-legibility]",
					"[data-tl-web]",
					"[data-tl-a11y-live]",
					"[data-tl-splash]",
				]) {
					for (const node of document.querySelectorAll(selector)) node.remove();
				}
				// A crashed old splash may have left the reveal filter animation on #root.
				try {
					const appRoot = document.getElementById("root");
					if (appRoot !== null) {
						appRoot.removeAttribute("data-tl-splash-blur");
						for (const animation of appRoot.getAnimations?.() ?? []) {
							if (animation !== null && animation !== undefined && animation.id === "tl-splash-reveal") animation.cancel();
						}
					}
				} catch (error) {
					note("apply:purge-splash", error);
				}
				const staleStyle = document.querySelector(
					"style[data-plugin-css=" + JSON.stringify(CSS_TAG_ID) + "]",
				);
				if (staleStyle !== null) staleStyle.remove();
				body.removeAttribute(BODY_ATTR);
				body.removeAttribute(TL5_MODULES_ATTR);
				body.removeAttribute("data-tl-lang");
				body.removeAttribute("data-tl-legibility");
			} catch (error) {
				note("apply:purge-failed", error);
			}
		}

		async function apply(ctx) {
			// Hard boundary: a DSH upgrade can change the DOM or a service without notice,
			// and an exception thrown out of apply() marks the plugin fibre failed.
			// Catch everything here so a skin defect can never take the page down with it —
			// the worst case is "no skin", never "no DSH".
			try {
				const body = document.body;
				if (body === null) {
					note("apply:no-body", {});
					return;
				}
				disposePreviousInstance();
				purgeOrphanHosts(body);

				// Every installer goes through here so this instance can be torn down from
				// outside cordis (the hot-reload case). `live` makes each disposer idempotent:
				// cordis disposal after a registry teardown is a no-op, never a double free.
				// The returned disposer is what the v0.5.0 module runtime uses to switch a
				// feature OFF at runtime (DOM + listeners gone, no reload).
				const cleanups = [];
				const install = (label, factory) => {
					let dispose = null;
					try {
						ctx.effect(() => {
							const result = factory();
							let live = true;
							const teardown = () => {
								if (!live) return;
								live = false;
								const index = cleanups.indexOf(teardown);
								if (index >= 0) cleanups.splice(index, 1);
								try {
									if (typeof result === "function") result();
								} catch (error) {
									note("apply:dispose-failed", { label, error });
								}
							};
							// Diagnostics only: the label makes a teardown debuggable from the
							// console (`__dshTianlightInstance.labels()`), and disposeLabel()
							// lets a developer tear down one feature without a reload.
							teardown.label = label;
							cleanups.push(teardown);
							dispose = teardown;
							return teardown;
						}, label);
					} catch (error) {
						note("apply:install-failed", { label, error });
						return null;
					}
					const registered = dispose;
					if (registered === null) return null;
					return () => {
						try {
							registered();
						} catch (error) {
							note("apply:dispose-failed", { label, error });
						}
					};
				};

				// R8 (REV-R4A F1): the owning cordis ctx/fiber stays inside this closure. The
				// published diagnostics object below deliberately has no `ctx` property, so a
				// same-page script cannot reach the live context and inject services
				// (remote.session etc.) through the registry object.
				// Teardown clears the registry first, disposes the owning fiber (transactional:
				// it also unregisters every slot cell), then the effect list as a fallback —
				// idempotent, so a later cordis disposal is a no-op instead of a double free.
				const ownerCtx = ctx;
				let instanceTornDown = false;
				let instance = null;
				const teardownOwnedInstance = () => {
					if (instanceTornDown === true) return;
					instanceTornDown = true;
					if (globalThis[INSTANCE_REGISTRY_KEY] === instance) globalThis[INSTANCE_REGISTRY_KEY] = null;
					const fiber = ownerCtx === undefined || ownerCtx === null ? undefined : ownerCtx.fiber;
					if (fiber !== undefined && fiber !== null && typeof fiber.dispose === "function") {
						try {
							fiber.dispose();
						} catch (error) {
							note("apply:fiber-dispose-failed", error);
						}
					}
					try {
						if (instance !== null && typeof instance.disposeEffects === "function") instance.disposeEffects();
					} catch (error) {
						note("apply:dispose-failed", error);
					}
				};
				instance = {
					dispose() {
						teardownOwnedInstance();
					},
					/** Effect-list teardown only; `dispose()` is the public entry point. */
					disposeEffects() {
						for (const dispose of cleanups.splice(0)) {
							try {
								dispose();
							} catch (error) {
								note("apply:dispose-failed", error);
							}
						}
					},
					labels() {
						return cleanups.map((dispose) => dispose.label);
					},
					disposeLabel(label) {
						const target = cleanups.find((dispose) => dispose.label === label);
						if (target === undefined) return false;
						target();
						return true;
					},
					// ---- v0.5.0 runtime surfaces (read-only diagnostics) ----
					modules: () => ({
						state: moduleController.state(),
						active: moduleController.active(),
						definitions: moduleController.list().map((def) => def.id),
					}),
					settings: () => {
						try {
							return settingsStore.status();
						} catch {
							return null;
						}
					},
					metrics: () => TL5_METRICS,
					diag: () => TL5_DIAG,
					i18n: () => tl5Language(),
					duty: () => dutyChannelStatus(),
					life: () => {
						try {
							return globalThis.tianlightLife?.status?.() ?? null;
						} catch {
							return null;
						}
					},
					glass: () => {
						try {
							return glassDepthController === null ? null : { depth: glassDepthController.read(), effective: glassDepthController.effective() };
						} catch {
							return null;
						}
					},
					pet: () => {
						try {
							return globalThis.tianlightPet?.status?.() ?? null;
						} catch {
							return null;
						}
					},
					agent: () => {
						try {
							return globalThis.tianlightPetAgent?.status?.() ?? null;
						} catch {
							return null;
						}
					},
					hub: () => {
						try {
							return globalThis.tianlightRoleHub?.status?.() ?? null;
						} catch {
							return null;
						}
					},
					splash: () => {
						try {
							return splashStatus();
						} catch {
							return null;
						}
					},
				};
				// Support diagnostics: which hook layer does this DSH build render?
				// Lazy on purpose — plugin apply runs before the shell mounts the product UI,
				// so a value sampled here would report every hook missing. The getter is
				// evaluated when a support engineer reads it from the console, long after
				// the UI mounted, and never rendered into the product DOM.
				Object.defineProperty(instance, "features", {
					enumerable: true,
					configurable: true,
					get() {
						try {
							return detectDshFeatures();
						} catch {
							return null;
						}
					},
				});
				globalThis[INSTANCE_REGISTRY_KEY] = instance;

				// ---- settings: migrate local schema + adopt the host config BEFORE any
				// installer reads localStorage. Failures degrade to local-only mode and
				// must never block the skin from applying. ----
				await bootstrapSettingsRuntime(body);

				// ---- always-on core ----
				install("ui-skin-tianlight: stylesheet", () => installStyles());
				install("ui-skin-tianlight: glass opacity", () => installGlassOpacity());
				install("ui-skin-tianlight: glass depth", () => installGlassDepth());
				install("ui-skin-tianlight: low power", () => installLowPower());
				install("ui-skin-tianlight: i18n", () => installI18nRuntime(ctx));
				install("ui-skin-tianlight: selector bridge", () => installSelectorBridge());
				// Set and dispose the scoping attribute in ONE effect registered before any
				// fallible work: if a feature throws, the attribute must still have an owner
				// that removes it, or the skin CSS stays armed for the page.
				install("ui-skin-tianlight: body attribute", () => {
					body.setAttribute(BODY_ATTR, "");
					body.setAttribute("data-tl-lang", tl5ActiveLanguage);
					syncModulesAttr();
					return () => {
						body.removeAttribute(BODY_ATTR);
						body.removeAttribute(TL5_MODULES_ATTR);
						body.removeAttribute("data-tl-lang");
						body.removeAttribute("data-tl-legibility");
					};
				});
				// Settings mirroring is infrastructure, not a module: it keeps the host
				// settings file and the other windows in sync for every feature. The
				// one-shot migration/host-adoption already ran above; this effect owns
				// the persistent write mirror + BroadcastChannel only.
				install("ui-skin-tianlight: settings sync", () => installSettingsRuntime(body));

				// ---- A · 破晓 opening overlay ------------------------------------
				// The overlay owns its own fixed layer outside #root. It is installed
				// before the switchable modules and never waits for the wallpaper or a
				// product resource; this call is synchronous and the hard-stop timer is
				// armed before any animation starts. Skipped for reduced motion / low
				// power / a disabled setting, and at most once per browser session.
				install("ui-skin-tianlight: splash", () => installSplashEntry());

				// ---- switchable modules: installed in MODULE_DEFS order ----
				const runtime = createModuleRuntime(install);
				runtime.define("wallpaper", "module: wallpaper", () => installScene());
				runtime.define("zones", "module: zones", () => installZoneFraming());
				runtime.define("effects", "module: effects", () => installEffectsLayer());
				runtime.define("context", "module: context", () => installContextRuntime(ctx));
				runtime.define("audio", "module: audio", () => installAudioRuntime(ctx));
				runtime.define("companion", "module: companion", () => installCompanion());
				runtime.define("rheostat", "module: rheostat", () => installEffortRheostat(ctx));
				runtime.define("typography", "module: typography", () => installFontPanel(ctx));
				runtime.define("legibility", "module: legibility", () => installLegibilityGuard());
				runtime.define("panel", "module: panel", () => installWallpaperSidebar(ctx));
				moduleController.attach(runtime);
				runtime.syncAll();
				tl5Diag("engine", { modules: moduleController.state(), active: moduleController.active() });

				// ---- v0.6.0 Wallpaper Engine library (always on, additive) ----
				// Registers the DSH settings page + the sidebar footer button and mounts the
				// full-screen library overlay. Degrades to diagnostics when the host half or
				// the slots service is unavailable, so it must not live inside a module switch.
				install("ui-skin-tianlight: we library", () => installWeLibrary(ctx));

				// ---- v0.7.0 duty channel (client half only, no DSH restart) ----
				// Always-on infrastructure installed after the module runtime so the
				// companion is already mounted when it is enabled. The channel itself
				// degrades to `companion-off` when the companion module is switched off.
				install("ui-skin-tianlight: duty channel", () => installDutyChannel());

				// ---- v1.6.1 weather chip (always on, no DSH restart) ----
				// The chip reads weatherController.summary() from the factory closure and opens
				// the role hub, so it must stay outside the switchable context module: with the
				// context module off, summary().runtime is false and the chip degrades to its
				// neutral off state (zero network requests, never auto-enables weather).
				install("ui-skin-tianlight: weather chip", () => installWeatherChip());

				// ---- v1.0.0 character life layer ----
				// The life engine owns the virtual clock / daily rhythm / proactive budget,
				// gates duty interrupts, resolves replaceable pet media and persists the
				// cross-session memory. It installs after the module runtime so a disabled
				// companion degrades cleanly, and the settings page only needs `slots`.
				install("ui-skin-tianlight: life rhythm", () => installLifeRhythm());

				// ---- v1.1.0 AI companion layer ----
				// The brain is the single owner of proactive rights: a strict capability
				// allowlist, an optional user-granted LLM adapter with hard budgets, an
				// audit log and a kill switch. The hub is the visible control plane.
				install("ui-skin-tianlight: pet brain", () => installPetBrain());
				install("ui-skin-tianlight: pet agent", () => installPetAgent(ctx));
				install("ui-skin-tianlight: role hub", () => installRoleHub(ctx));

				// ---- keyboard/a11y is always on and installs AFTER the panel host exists ----
				install("ui-skin-tianlight: accessibility", () => installAccessibility(ctx));

				// The module runtime is exposed for the engineering panel's "reinstall"
				// diagnostics and for hot-reload teardown.
				instance.moduleRuntime = runtime;
			} catch (error) {
				note("apply:failed", error);
			}
		}

		exports.apply = apply;
		return module.exports;
	}
});
