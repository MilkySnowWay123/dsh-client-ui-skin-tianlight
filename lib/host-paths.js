// Filesystem locations owned by the host half.
//
// `assets/` is package media; `state/` and `assets/derived/` are per-machine
// runtime data (both gitignored). One module derives every path from the plugin
// root, so no route module has to grow its own `../` arithmetic: a directory that
// is re-derived in two places is a directory that eventually disagrees with itself.

import { join, resolve } from 'node:path'
import { ASSET_DIR } from './media-types.js'

/** Plugin root (`lib/` is one level below it). */
export const PLUGIN_ROOT = resolve(ASSET_DIR, '..')
/** Package media: shipped defaults plus user uploads. */
export const ASSETS_DIR = ASSET_DIR
/** User uploads; also exported by `upload.js` for the upload route. */
export const UPLOADS_DIR = join(ASSET_DIR, 'uploads')
/** H.264 derivatives produced by the optional ffmpeg route. */
export const DERIVED_DIR = join(ASSET_DIR, 'derived')
/** Per-machine runtime state: settings, frame cache, import staging. */
export const STATE_DIR = join(PLUGIN_ROOT, 'state')
export const SETTINGS_FILE = join(STATE_DIR, 'settings.json')
export const FRAME_CACHE_DIR = join(STATE_DIR, 'frame-cache')
