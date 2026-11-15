// Host loader entry for the TIANLIGHT skin.
//
// The skin's browser half needs large binary assets (a looping video wallpaper
// and character art) that must NOT be inlined into `lib/client.js`. The client
// module carrier only serves bundles, so this host half owns one prefix route
// and streams files out of `assets/` with byte-range support, which is what lets
// `<video>` start playing before the whole file has arrived.
//
// v2.1.8: `handle()` used to be one 255-line if-chain. The route bodies now live in
// `lib/routes/<domain>.js` (each exports `{ exact, prefix }`), and this file owns only
// the pieces that must not move: the two same-origin fences, the identity constants
// (`HOST_API`, `BUILD`), the persistent-data bootstrap, and one ordered dispatch table.
// The order of that table is the order the old if-chain evaluated, including the
// GET/HEAD gate that sits between the write routes and the read routes.

import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { IMAGE_EXT, ROUTE, SAFE_NAME, VIDEO_EXT, fileSize, safeJoin } from './media-types.js'
import {
  DATA_ROOT,
  DATA_ROOT_DISPLAY,
  STATE_DIR,
  configureHostPaths,
  hasLegacyData,
  migrateLegacyHostData,
} from './host-paths.js'
import { parseRange, sendText } from './http-media.js'
import { readSettings } from './settings-store.js'
import { PET_CHAT_CODES, computePetLlmCapability, petChat } from './pet-chat.js'
import {
  disposeSceneVideoCapture,
  isAllowedLocalHost,
  listWeSkinItems,
  makeWeWallpaperHandler,
  weLibraryStatus,
  WE_API_PREFIX,
} from './we-wallpaper/host.mjs'
import * as wallpaperRoutes from './routes/wallpaper.js'
import * as mediaRoutes from './routes/media.js'
import * as engineRoutes from './routes/engine.js'
import * as settingsRoutes from './routes/settings.js'
import * as framesRoutes from './routes/frames.js'
import * as petRoutes from './routes/pet.js'
import * as weatherRoutes from './routes/weather.js'
import * as sceneRoutes from './routes/scene.js'
import * as webprojectRoutes from './routes/webproject.js'

const HERE = dirname(fileURLToPath(import.meta.url))

/** v0.6.0: the vendored Wallpaper Engine library bridge, mounted as a second prefix. */
const WE_HANDLER = makeWeWallpaperHandler()

/** Optional scene engine + its adapter page. Both may be absent in a slim install. */
const ENGINE_FILE = resolve(HERE, '..', 'vendor', 'webwallgl', 'webwallgl.global.min.js')
const SCENE_FRAME = resolve(HERE, 'scene-frame.html')

/**
 * Host side of the `/skin-tianlight` route-contract handshake. The browser half
 * sends the value it expects (`_engines?api=`) and gets `stale: true` back when
 * this process speaks a different contract — the one case a Ctrl+F5 refresh cannot
 * fix by itself. Change it ONLY when a route in the dispatch table changes shape;
 * bumping it with every release brought back the needless "restart DSH" hint. Keep
 * in sync with `HOST_API` in `src/10-constants.js`.
 */
const HOST_API = '2'

/**
 * Host build marker. Diagnostic only: `_engines` reports it and the bundle
 * manifest is stamped with it. The handshake no longer compares it, so a
 * browser-half-only update can run against an unchanged host process.
 */
const BUILD = '2.1.8'

/**
 * Identity handed to the route modules that need it. `HOST_API`/`BUILD` stay in this
 * file on purpose (release.mjs and audit.mjs grep them here); the getters keep the
 * live persistent-data diagnostic reachable without moving its state out.
 */
const HOST = {
  hostApi: HOST_API,
  build: BUILD,
  engineFile: ENGINE_FILE,
  sceneFrame: SCENE_FRAME,
  dataDiagnostic: () => dataDiagnostic,
  activeProfile: () => activeProfile,
}

/**
 * The dispatch table. Three ordered lookups plus the final asset fallback:
 *   1. write routes run BEFORE the GET/HEAD gate (they are POST/PUT and own framing),
 *   2. the gate rejects every other non-read method with the historical 405,
 *   3. read routes run after it,
 *   4. prefixes are matched in the original order,
 *   5. anything left is a package-local asset name.
 * Order inside each map is insertion order, i.e. the order of the old if-chain.
 */
const EXACT_BEFORE_GATE = new Map([
  ['_we-roots', wallpaperRoutes.exact['_we-roots']],
  ['_settings', settingsRoutes.exact._settings],
  ['_bundle', settingsRoutes.exact._bundle],
  ['_import', settingsRoutes.exact._import],
  ['_frame-cache', framesRoutes.exact['_frame-cache']],
  ['_frame-cache/status', framesRoutes.exact['_frame-cache/status']],
  ['_transcode', framesRoutes.exact._transcode],
  ['_transcode/status', framesRoutes.exact['_transcode/status']],
  ['_pet-chat', petRoutes.exact['_pet-chat']],
  ['_upload', mediaRoutes.exact._upload],
])

const EXACT_AFTER_GATE = new Map([
  ['_manifest', mediaRoutes.exact._manifest],
  ['_wallpapers', wallpaperRoutes.exact._wallpapers],
  ['_engines', engineRoutes.exact._engines],
  ['_weather', weatherRoutes.exact._weather],
  ['_fingerprint', settingsRoutes.exact._fingerprint],
  ['_engine/webwallgl.js', engineRoutes.exact['_engine/webwallgl.js']],
  ['_scene-frame', engineRoutes.exact['_scene-frame']],
])

const PREFIX_ROUTES = [
  ...sceneRoutes.prefix,
  ...webprojectRoutes.prefix,
  ...mediaRoutes.prefix,
  ...framesRoutes.prefix,
  ...wallpaperRoutes.prefix,
]

/**
 * Same-origin fence for this plugin's host routes. The skin page itself is the
 * only legitimate caller; any other local site must not be able to drive
 * `_transcode` (writes derived media), `_settings`/`_import`/`_bundle` (writes
 * state) just because this server listens on localhost. Requests without an
 * Origin header (same-document GETs, curl, the desktop app's own client) pass; a
 * foreign Origin, a non-http(s) scheme, or a cross-site Sec-Fetch-Site on a write
 * is rejected. The desktop webview's own scheme is trusted because it is the app.
 *
 * A sandboxed (opaque-origin) wallpaper iframe is not "same origin" to Fetch
 * Metadata: its own subresource GETs arrive as Sec-Fetch-Site: cross-site and a
 * CORS fetch adds Origin: null. Those read-only requests are fenced out except for
 * the wallpaper channels the app itself loads (engine script, scene/web projects),
 * listed in SANDBOXED_READ_PATHS. Writes never get this exemption.
 */
const SANDBOXED_READ_PATHS = ['/_engine/webwallgl.js', '/_scene-project/', '/_web-project/', '/_scene-frame']

function isSandboxedRead(req) {
  const method = String(req.method ?? 'GET').toUpperCase()
  if (method !== 'GET' && method !== 'HEAD') return false
  // Normalise with the WHATWG URL parser: it resolves `..` and `%2e%2e`, so a
  // request cannot tunnel through an allowed prefix into another host route.
  let pathname
  try {
    pathname = new URL(String(req.url ?? '/'), 'http://localhost').pathname
  } catch {
    return false
  }
  const prefix = String(ROUTE)
  return SANDBOXED_READ_PATHS.some((suffix) =>
    suffix.endsWith('/') ? pathname.startsWith(prefix + suffix) : pathname === prefix + suffix,
  )
}

function isSameOriginRequest(req) {
  const method = String(req.method ?? 'GET').toUpperCase()
  const readOnly = method === 'GET' || method === 'HEAD'
  const origin = req.headers?.origin
  const site = req.headers?.['sec-fetch-site']
  const crossSite = typeof site === 'string' && site === 'cross-site'
  // R4B/R8b: DNS-rebinding fence FIRST, then the desktop webview's trusted scheme.
  // The old order trusted `dsh-app://` before checking Host, so a forged Host next to
  // an app-scheme Origin slipped through here while the WE fence rejected it. Order is
  // now identical in both fences (Host allowlist -> dsh-app trust).
  //
  // The server only listens on loopback, so a present Host must be localhost /
  // 127.0.0.1 / [::1] (any port). A missing Host is not a browser: HTTP/1.0, curl and
  // the in-process test clients send none, and browsers always do, so "absent" cannot
  // be a rebinding attempt.
  if (isAllowedLocalHost(req.headers?.host) === false) return false
  // The desktop webview is the app itself; its custom scheme is trusted (and the real
  // app still sends a loopback Host, so the check above does not hurt it).
  if (typeof origin === 'string' && (origin.startsWith('dsh-app://') || origin.startsWith('dsh://'))) return true
  if ((crossSite || origin === 'null') && readOnly && isSandboxedRead(req)) return true
  if (typeof origin === 'string' && origin !== '' && origin !== 'null') {
    const host = req.headers?.host
    if (typeof host !== 'string' || host === '') return false
    try {
      const parsed = new URL(origin)
      if ((parsed.protocol !== 'http:' && parsed.protocol !== 'https:') || parsed.host !== host) return false
    } catch {
      return false
    }
  } else if (origin === 'null') {
    // An opaque origin may read its own wallpaper assets (handled above), but it
    // must never reach a write route.
    return false
  }
  if (crossSite && readOnly === false) return false
  if (typeof site === 'string' && site !== '' && site !== 'same-origin' && site !== 'none' && site !== 'same-site') return false
  return true
}

function handle(ctx, req, res) {
  if (isSameOriginRequest(req) === false) {
    sendText(res, 403, 'forbidden')
    return
  }
  const url = new URL(req.url ?? '/', 'http://localhost')
  let rest = url.pathname
  if (rest.startsWith(ROUTE)) rest = rest.slice(ROUTE.length)
  rest = rest.replace(/^\/+/, '')

  const early = EXACT_BEFORE_GATE.get(rest)
  if (early !== undefined) {
    early(ctx, req, res, url, rest, HOST)
    return
  }

  // Each write route above owns its method gate and its own failure status: this
  // shared gate would turn every write route into a blanket 405.
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    sendText(res, 405, 'method not allowed')
    return
  }

  const late = EXACT_AFTER_GATE.get(rest)
  if (late !== undefined) {
    late(ctx, req, res, url, rest, HOST)
    return
  }

  for (const [prefix, handler] of PREFIX_ROUTES) {
    if (rest.startsWith(prefix)) {
      handler(ctx, req, res, rest, url, HOST)
      return
    }
  }

  mediaRoutes.fallback(req, res, rest)
}

/**
 * Registers both prefix routes on the web-server carrier: the skin's own asset
 * routes and the vendored Wallpaper Engine library bridge. The carrier service is
 * optional from this row's point of view (it is absent in non-Web profiles), so
 * it is resolved through `get()` and re-entered once injected. One effect owns
 * both registrations, so disposal also stops a running scene-video recorder.
 */
function bindRoutes(ctx) {
  const carrier = ctx.get('webServer')
  if (carrier === undefined) {
    ctx.inject(['webServer'], (webCtx) => bindRoutes(webCtx))
    return
  }
  ctx.effect(
    () => {
      // The WE prefix is registered first on purpose: tools/verify.mjs captures
      // the *last* registered handler as the skin route, and that harness
      // contract predates this second prefix. A real carrier is a route map and
      // does not care about order.
      const disposeWe = carrier.register({ kind: 'prefix', path: WE_API_PREFIX, handler: WE_HANDLER })
      // The skin handler is bound to this plugin context so write routes (the pet
      // chat bridge) can resolve optional Host services at request time.
      const disposeSkin = carrier.register({ kind: 'prefix', path: ROUTE, handler: (req, res) => handle(ctx, req, res) })
      return () => {
        try {
          if (typeof disposeWe === 'function') disposeWe()
        } catch {
          // carrier may have removed it already
        }
        try {
          if (typeof disposeSkin === 'function') disposeSkin()
        } catch {
          // carrier may have removed it already
        }
        try {
          disposeSceneVideoCapture()
        } catch {
          // teardown must never throw out of the skin's disposer
        }
      }
    },
    'ui-skin-tianlight: asset + we-wallpaper routes',
  )
}

/**
 * v2.0.1 persistent user data (see lib/host-paths.js header for the evidence).
 * The DSH host provides `profileContext` (`hostCtx.provide("profileContext", …)` in its
 * profile-boot on 0.2.0 / 0.2.1 / 0.2.2) with the running profile's absolute `dir`, so
 * plugin data lives in `<profile.dir>/tianlight` and survives plugin uninstall/upgrade.
 * Legacy plugin-directory data is copied once and never deleted.
 *
 * Never throws: a missing/broken profileContext simply keeps the legacy locations.
 */
function initialisePersistentData(ctx) {
  let profile = null
  try {
    profile = typeof ctx?.get === 'function' ? ctx.get('profileContext') : null
  } catch {
    profile = null
  }
  const profileDir = profile !== null && profile !== undefined && typeof profile.dir === 'string' ? profile.dir : ''
  activeProfile = profile !== null && profile !== undefined ? profile : null
  const root = configureHostPaths(profileDir)
  if (root === null) {
    return { mode: 'legacy', root: null, dir: DATA_ROOT_DISPLAY, migration: null, legacyDataPending: hasLegacyData() }
  }
  // The vendored Wallpaper Engine bridge keeps state/caches under its runtime home;
  // point it at the same persistent state dir unless the user set an explicit override.
  const weOverride = process.env.TIANLIGHT_WE_HOME
  if (typeof weOverride !== 'string' || weOverride.trim() === '') process.env.TIANLIGHT_WE_HOME = STATE_DIR
  const migration = migrateLegacyHostData()
  const migrated = migration !== null ? migration.actions.length : 0
  if (migrated > 0) {
    console.log(
      '[ui-skin-tianlight] copied legacy user data to ' + DATA_ROOT_DISPLAY + ' (' + migrated + ' item(s); old files kept)',
    )
  }
  return { mode: 'persistent', root, dir: DATA_ROOT_DISPLAY, migration, legacyDataPending: false, migrated }
}

/** Last data-initialisation diagnostic, exposed through `_engines` for verification. */
let dataDiagnostic = { mode: 'legacy', dir: DATA_ROOT_DISPLAY, legacyDataPending: false, migrated: 0 }
/** The running DSH profileContext, captured for the fingerprint route. */
let activeProfile = null

function apply(ctx) {
  dataDiagnostic = initialisePersistentData(ctx)
  bindRoutes(ctx)
}

export { apply }
/**
 * Test hooks. The loader only ever calls `apply`, so extra named exports are inert
 * at runtime; they exist so the pure logic (range parsing, wallpaper discovery,
 * engine capabilities) can be regression-tested without booting DSH.
 */
export const __test = {
  parseRange,
  listWallpapers: wallpaperRoutes.listWallpapers,
  listAssets: wallpaperRoutes.listAssets,
  safeJoin,
  readRoots: wallpaperRoutes.readRoots,
  SAFE_NAME,
  VIDEO_EXT,
  IMAGE_EXT,
  fileSize,
  // v2.0.0 companion AI chat bridge (see lib/pet-chat.js).
  // `engineStatus(url)` keeps its old one-argument form; pass a fake Context as the
  // second argument to exercise `capabilities.petLlm` (tests do exactly that).
  engineStatus: (url, ctx) => engineRoutes.engineStatus(url, ctx, HOST),
  petChat: petChat.handle,
  petChatStatus: petChat.status,
  petLlmCapability: computePetLlmCapability,
  petChatCodes: PET_CHAT_CODES,
  isSameOriginRequest,
  readSettings,
  // v0.6.0 WE library bridge (re-exported so tests need one import).
  listWeSkinItems,
  weLibraryStatus,
}
