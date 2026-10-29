// The stable host-surface hooks the runtime selector bridge relies on.
//
// Contract: these are version-independent by design —
//   * `data-*` attributes are owned by the DSH layout code itself, and
//   * CSS-module class names are `<hash>_<name>`; only the hash changes between
//     builds, so the SUFFIX is the stable part.
//
// The stylesheet in `src/20-stylesheet.js` never references a build hash; it uses
// the `data-tl-*` attributes that `src/65-bridge.js` stamps from these hooks.
// When a future DSH build renames one of them, `tools/hook-scan.mjs` reports it
// before a release, and the bridge (not the stylesheet) gets one small update.

export const DATA_HOOKS = [
  'data-composer-card',
  'data-sidebar-collapsed',
  'data-sidebar-right-panel',
  'data-trigger-menu',
]

// Forward-compatibility hooks: present in DSH 0.2.2-alpha builds, absent on
// 0.2.1.x. The bridge uses them when available and falls back to the suffix
// hooks above; a MISS here is informational, never a release blocker.
export const ADVISORY_HOOKS = [
  'data-message-bubble', // 0.2.2-alpha: chat bubbles moved to primitives
  'data-dockkit-pane', // 0.2.2-alpha: dockkit panes replace the `_pane` shell class
]

export const SUFFIX_HOOKS = [
  '_sidebarCol',
  '_sidebar',
  '_card',
  '_trigger',
  '_triggerLabel',
  '_triggerEffort',
  '_bubble',
  '_menu',
  '_panel',
  '_mask',
  '_surface',
  '_pane',
]

/** First class-like token containing the suffix, e.g. "mP3x-q_sidebarCol" for `_sidebar`. */
export function findSuffixToken(text, suffix) {
  // Mirror the bridge's `[class*='<suffix>']` matching: the suffix may sit inside a
  // longer token (`_pane_6nhg2_209`, `_sidebarCol`, `_surface_6nhg2_125`), which is
  // exactly why the bridge uses a substring match instead of a token suffix.
  const pattern = new RegExp('[A-Za-z0-9_-]*' + suffix + '[A-Za-z0-9_-]*')
  const match = pattern.exec(text)
  return match === null ? null : match[0]
}

// Keep this list and src/65-bridge.js in sync; hook-scan --self-check verifies the
// bridge source mentions every hook.
export const BRIDGE_SOURCE_HINTS = [
  ...DATA_HOOKS,
  ...ADVISORY_HOOKS,
  ...SUFFIX_HOOKS,
]
