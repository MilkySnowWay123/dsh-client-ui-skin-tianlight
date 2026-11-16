(function () {
	/**
	 * Fail-soft at the one point the skin cannot wrap in try/catch: the loader call is
	 * evaluated before any factory body runs, so a renamed or removed loader contract
	 * would throw an uncaught error owned by nobody. The guard reports the exact missing
	 * contract and returns, which keeps the rest of the page (and every other plugin's
	 * module) intact. It cannot recover a missing loader — the module simply cannot be
	 * registered — but it turns "skin silently absent + red console noise" into one
	 * named line. `tools/upgrade-check.mjs` checks the same contract against a new DSH
	 * build before it ships.
	 */
	var loader = typeof window === "object" && window !== null ? window.__ModuleLoader__ : null;
	if (loader === null || typeof loader !== "object" || typeof loader.load !== "function") {
		try {
			console.warn(
				"[ui-skin-tianlight] client module loader contract missing: expected window.__ModuleLoader__.load({ id, factory }) on this DSH build; the skin is not registered.",
			);
		} catch {
			// a page without a console is still a page
		}
		return;
	}
	loader.load({
		id: "dsh-client-ui-skin-tianlight",
		factory: (require) => {
			var module = { exports: {} };
			var exports = module.exports;
			Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
