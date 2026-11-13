// Host loader entry for the TIANLIGHT skin.
//
// The skin's browser half needs large binary assets (a looping video wallpaper
// and character art) that must NOT be inlined into `lib/client.js`. The client
// module carrier only serves bundles, so this host half owns one prefix route
// and streams files out of `assets/` with byte-range support, which is what lets
// `<video>` start playing before the whole file has arrived.

import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { basename, dirname, isAbsolute, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ASSET_DIR, IMAGE_EXT, ROUTE, SAFE_NAME, VIDEO_EXT, fileSize, mediaKindFromName, safeJoin } from './media-types.js'
import {
  DATA_ROOT,
  DATA_ROOT_DISPLAY,
  STATE_DIR,
  WE_ROOTS_FILE,
  configureHostPaths,
  dataRootForProfile,
  hasLegacyData,
  migrateLegacyHostData,
} from './host-paths.js'
import { parseRange, sendJson, sendText, servePath, serveTextFile } from './http-media.js'
import { listUploads, receiveUpload, uploadPath, uploadStatus } from './upload.js'
import { listSceneProjects, resolveSceneDir, sceneFilePath } from './scene-project.js'
import { handleSettings, readSettings } from './settings-store.js'
import { handleBundle, handleImport } from './bundle.js'
import { frameCacheStatus, handleFrameCache, handleFrameCacheStatus } from './media-cache.js'
import { derivedPath, ffmpegStatus, handleTranscode, handleTranscodeStatus, listDerived } from './transcode.js'
import { handleWebProject, listWebProjects } from './web-project.js'
import { buildFingerprint, formatFingerprintLine } from './fingerprint.js'
import {
	PET_CHAT_CODES,
	computePetLlmCapability,
	petChat,
} from './pet-chat.js'
import {
  disposeSceneVideoCapture,
  isAllowedLocalHost,
  listWeSkinItems,
  makeWeWallpaperHandler,
  weLibraryStatus,
  WE_API_PREFIX,
} from './we-wallpaper/host.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))

/** v0.6.0: the vendored Wallpaper Engine library bridge, mounted as a second prefix. */
const WE_HANDLER = makeWeWallpaperHandler()

/** Optional scene engine + its adapter page. Both may be absent in a slim install. */
const ENGINE_FILE = resolve(HERE, '..', 'vendor', 'webwallgl', 'webwallgl.global.min.js')
const SCENE_FRAME = resolve(HERE, 'scene-frame.html')

/**
 * Optional list of extra wallpaper directories (e.g. Wallpaper Engine projects).
 * v2.0.1: lives in the persistent data root (host-paths.js) so it survives plugin
 * uninstall/upgrade; the legacy `<plugin>/we-roots.json` is copied once at startup.
 */

/**
 * Host side of the `/skin-tianlight` route-contract handshake. The browser half
 * sends the value it expects (`_engines?api=`) and gets `stale: true` back when
 * this process speaks a different contract — the one case a Ctrl+F5 refresh cannot
 * fix by itself. Change it ONLY when a route in `handle()` changes shape; bumping
 * it with every release brought back the needless "restart DSH" hint. Keep in sync
 * with `HOST_API` in `src/10-constants.js`.
 */
const HOST_API = '2'

/**
 * Host build marker. Diagnostic only: `_engines` reports it and the bundle
 * manifest is stamped with it. The handshake no longer compares it, so a
 * browser-half-only update can run against an unchanged host process.
 */
const BUILD = '2.0.4'

function readRoots() {
  try {
    const value = JSON.parse(readFileSync(WE_ROOTS_FILE, 'utf8'))
    if (!Array.isArray(value)) return []
    // Absolute paths only: a relative entry would silently resolve against the DSH
    // process working directory, which is not the directory the user pointed at.
    return value
      .filter((entry) => typeof entry === 'string' && entry.trim() !== '' && isAbsolute(entry.trim()))
      .map((entry) => resolve(entry.trim()))
  } catch {
    return []
  }
}

/** Media files in the configured roots, addressed through the ext route. */
function listExternalWallpapers() {
  const items = []
  readRoots().forEach((root, index) => {
    let names = []
    try {
      names = readdirSync(root)
    } catch {
      return
    }
    for (const name of names) {
      if (SAFE_NAME.test(name) === false) continue
      const kind = mediaKindFromName(name)
      if (kind === null) continue
      // The root index is part of the id: two roots can hold the same file name, and a
      // duplicate React key silently drops a card from the grid.
      items.push({ id: 'ext:' + index + ':' + name, kind, url: ROUTE + '/ext/' + index + '/' + name, bytes: fileSize(join(root, name)) })
    }
  })
  return items
}

function listAssets() {
  try {
    return readdirSync(ASSET_DIR).filter((name) => SAFE_NAME.test(name))
  } catch {
    return []
  }
}

/** The companion art is not a wallpaper candidate. */
const COMPANION = 'cat.png'

/**
 * Every file in `assets/` a user could reasonably drop in as a wallpaper. Drop a
 * file, reload, it appears in the list: no config, no manifest edit. Videos rank
 * first because the skin is built around a moving picture, stills are the fallback.
 */
function listWallpapers() {
  const items = []
  for (const name of listAssets()) {
    if (name === COMPANION) continue
    const kind = mediaKindFromName(name)
    if (kind === null) continue
    items.push({ id: name, kind, url: ROUTE + '/' + name, bytes: fileSize(join(ASSET_DIR, name)) })
  }
  // Uploads are ordinary wallpapers once they land, so they share one sorted
  // catalog instead of a second list the panel would have to merge.
  const combined = [...items, ...listUploads()]
  combined.sort((a, b) => (a.kind === b.kind ? a.id.localeCompare(b.id) : a.kind === 'video' ? -1 : 1))
  return combined
}

/**
 * Stores the extra wallpaper roots. Accepts only absolute paths that currently
 * resolve to a directory, capped at 20 entries: the file is a configuration, not a
 * filesystem browser, so a bad payload is rejected instead of written.
 * Relative entries are dropped (not resolved against the process CWD), a body over
 * the cap gets a 413 instead of a dropped connection, and the request must be JSON.
 */
function writeRoots(req, res) {
  const contentType = String(req.headers['content-type'] ?? '').toLowerCase()
  if (contentType.includes('application/json') === false) {
    sendText(res, 415, 'expected application/json')
    req.resume()
    return
  }
  const chunks = []
  let size = 0
  let oversized = false
  req.on('data', (chunk) => {
    if (oversized) return
    size += chunk.length
    if (size > 8192) {
      oversized = true
      sendText(res, 413, 'roots payload too large')
      req.resume()
      return
    }
    chunks.push(chunk)
  })
  req.on('end', () => {
    if (oversized) return
    let roots
    let skipped = 0
    try {
      const value = JSON.parse(Buffer.concat(chunks).toString('utf8'))
      if (!Array.isArray(value)) throw new Error('expected an array')
      const accepted = []
      for (const entry of value) {
        if (typeof entry !== 'string' || entry.trim() === '') continue
        const candidate = entry.trim()
        if (isAbsolute(candidate) === false) {
          skipped += 1
          continue
        }
        try {
          if (statSync(candidate).isDirectory()) accepted.push(resolve(candidate))
          else skipped += 1
        } catch {
          skipped += 1
        }
      }
      roots = accepted.slice(0, 20)
      writeFileSync(WE_ROOTS_FILE, JSON.stringify(roots, null, 2), 'utf8')
    } catch {
      sendText(res, 400, 'invalid roots payload')
      return
    }
    sendJson(res, 200, { roots, skipped })
  })
  req.on('error', () => {
    try {
      res.destroy()
    } catch {
      // ignore
    }
  })
}

/**
 * `_engines` payload. The capabilities block is how the browser half decides
 * whether to render settings sync, bundle import/export, the frame cache and the
 * optional transcode action at all: nothing is advertised that is not mounted.
 */
async function buildEngineStatus(url, ctx) {
  const expectedApi = url.searchParams.get('api')
  // Legacy fallback: clients shipped before HOST_API still send their build number.
  const expectedBuild = url.searchParams.get('build')
  // R4B: async ffmpeg probe — a cache miss must not block the host's event loop.
  const ffmpeg = await ffmpegStatus()
  const roots = readRoots()
  return {
    build: BUILD,
    api: HOST_API,
    // A new client states the route contract it speaks; only a contract mismatch
    // means it must not talk to this host. A client with no `api` (an old build)
    // keeps the historical build-number comparison; no handshake parameter at all
    // (curl, the diagnostics panel) is answered without a verdict.
    stale:
      expectedApi !== null
        ? expectedApi !== HOST_API
        : expectedBuild === null
          ? undefined
          : expectedBuild !== BUILD,
    webwallgl: existsSync(ENGINE_FILE),
    adapter: existsSync(SCENE_FRAME),
    sceneProjects: listSceneProjects(roots).length,
    webProjects: listWebProjects(roots).length,
    upload: uploadStatus(),
    ffmpeg: ffmpeg.ffmpeg,
    cache: frameCacheStatus(),
    settings: { revision: readSettings().revision },
    // v2.0.1 (additive): where user data lives — symbolic, never an absolute machine
    // path. `mode: legacy` only happens when the host exposes no profileContext
    // (test harness/old host); a tarball upgrade then simply stays on the old layout.
    data: {
      mode: dataDiagnostic.mode,
      dir: dataDiagnostic.dir,
      legacyDataPending: dataDiagnostic.legacyDataPending === true,
      migratedFromLegacy: dataDiagnostic.migrated ?? 0,
    },
    // v0.6.0 (additive): local Wallpaper Engine library discovery. `found:false`
    // with `count:0` is the honest answer for a machine without WE.
    weLibrary: weLibraryStatus(),
    capabilities: {
      settings: true,
      bundle: true,
      frameCache: true,
      transcode: ffmpeg.ffmpeg,
      webWallpapers: true,
      weLibrary: true,
      // v2.0.0: the companion AI chat bridge. Synchronous availability only:
      // provider/model come from the Host's current default selection, and the
      // browser auto-registers its built-in adapter only when `available` is true.
      petLlm: computePetLlmCapability(ctx),
    },
  }
}

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

  if (rest === '_we-roots') {
    if (req.method === 'POST') writeRoots(req, res)
    else sendJson(res, 200, { roots: readRoots() })
    return
  }

  // ---- v0.5.0 host routes (contract §6 order) ----
  // Each module owns its method gate and its own failure status: the shared
  // GET/HEAD gate below would turn every write route into a blanket 405.
  if (rest === '_settings') {
    handleSettings(req, res)
    return
  }
  if (rest === '_bundle') {
    handleBundle(req, res, { build: BUILD })
    return
  }
  if (rest === '_import') {
    handleImport(req, res)
    return
  }
  if (rest === '_frame-cache') {
    handleFrameCache(req, res, url)
    return
  }
  if (rest === '_frame-cache/status') {
    handleFrameCacheStatus(req, res)
    return
  }
  if (rest === '_transcode') {
    // R4B: async handler (ffmpeg probe/run). The route writes its own response.
    void handleTranscode(req, res, url).catch(() => {
      try {
        sendJson(res, 500, { ok: false, error: 'transcode failed' })
      } catch {
        // response already gone
      }
    })
    return
  }
  if (rest === '_transcode/status') {
    void handleTranscodeStatus(req, res).catch(() => {
      try {
        sendJson(res, 500, { ok: false, error: 'transcode-status-failed' })
      } catch {
        // response already gone
      }
    })
    return
  }

  // v2.0.0: the companion AI chat bridge. It owns method/body/response framing and
  // resolves the optional Host `llm` / `agentDefaultModel` services per request, so
  // a non-Web or older Host simply reports `{ ok:false, code }` instead of failing
  // the plugin fibre. Must stay before the generic GET/HEAD gate (it is a POST).
  if (rest === '_pet-chat') {
    petChat.handle(ctx, req, res)
    return
  }

  // Upload is the one write endpoint that is not JSON. It has to run before the
  // GET/HEAD gate, and it owns its own body limits and response framing.
  if (rest === '_upload') {
    if (req.method !== 'POST') {
      sendText(res, 405, 'method not allowed')
      return
    }
    receiveUpload(req, res, url.searchParams.get('name'), sendJson)
    return
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    sendText(res, 405, 'method not allowed')
    return
  }

  if (rest === '_manifest') {
    sendJson(res, 200, { assets: listAssets() })
    return
  }

  if (rest === '_wallpapers') {
    sendJson(res, 200, {
      items: [
        ...listWallpapers(),
        ...listExternalWallpapers(),
        ...listSceneProjects(readRoots()),
        ...listWebProjects(readRoots()),
        ...listDerived(),
        // v0.6.0: the real Wallpaper Engine library, appended so every existing
        // source keeps its position/id even when WE is absent (then: no items).
        ...listWeSkinItems(),
      ],
    })
    return
  }

  // ---- optional WebWallGL scene engine ----
  if (rest === '_engines') {
    // R4B: async because the ffmpeg probe no longer blocks the event loop.
    // v2.0.0: the Context rides along so `capabilities.petLlm` can read the optional
    // `llm` / `agentDefaultModel` services synchronously.
    void buildEngineStatus(url, ctx).then(
      (body) => {
        try {
          sendJson(res, 200, body)
        } catch {
          // response already gone
        }
      },
      () => {
        try {
          sendText(res, 500, 'engine status failed')
        } catch {
          // response already gone
        }
      },
    )
    return
  }
  if (rest === '_fingerprint') {
    // v2.0.1: exact installed-build identity for the hub's self-test / feedback panels.
    // Additive route; it carries versions, hashes and the install method only — never a
    // machine path (the profile dir is reported symbolically at most by `dataMode`).
    if (req.method !== 'GET') {
      sendText(res, 405, 'method not allowed')
      return
    }
    const fingerprint = buildFingerprint({ hostApi: HOST_API, profile: activeProfile, dataMode: dataDiagnostic.mode })
    sendJson(res, 200, { ...fingerprint, line: formatFingerprintLine(fingerprint) })
    return
  }
  if (rest === '_engine/webwallgl.js') {
    serveTextFile(req, res, ENGINE_FILE, 'text/javascript; charset=utf-8')
    return
  }
  if (rest === '_scene-frame') {
    // The iframe itself is sandboxed by the client; the CSP is the second lock:
    // opaque origin, no framing, no top navigation, no form posts.
    serveTextFile(req, res, SCENE_FRAME, 'text/html; charset=utf-8', {
      'content-security-policy':
        "default-src 'none'; script-src * 'unsafe-inline' 'unsafe-eval'; style-src 'unsafe-inline'; connect-src *; img-src * data: blob:; media-src * blob:; font-src * data:; worker-src * blob:; frame-src 'none'; object-src 'none'; base-uri 'none'; sandbox allow-scripts",
      'referrer-policy': 'no-referrer',
    })
    return
  }
  // Scene project files. Each path segment is validated again; only media/asset
  // extensions are served, and CORS is open because the adapter is opaque-origin.
  if (rest.startsWith('_scene-project/')) {
    const parts = rest.split('/')
    const index = Number(parts[1])
    const dirName = parts[2]
    const projectDir = resolveSceneDir(readRoots(), index, dirName)
    const filePath = projectDir === null ? null : sceneFilePath(projectDir, parts.slice(3))
    if (filePath === null) {
      sendText(res, 404, 'not found')
      return
    }
    servePath(req, res, filePath, basename(filePath), {
      'access-control-allow-origin': '*',
      'cross-origin-resource-policy': 'cross-origin',
    })
    return
  }

  // Wallpaper Engine web projects (A3): an opaque-origin page plus its assets.
  // Segment validation happens inside the module again; discovery is not a gate.
  if (rest.startsWith('_web-project/')) {
    handleWebProject(req, res, rest, readRoots())
    return
  }

  // User uploads: uploads/<fileName>, served through the same Range pipeline.
  if (rest.startsWith('uploads/')) {
    const parts = rest.split('/')
    if (parts.length !== 2) {
      sendText(res, 404, 'not found')
      return
    }
    const filePath = uploadPath(parts[1])
    if (filePath === null) {
      sendText(res, 404, 'not found')
      return
    }
    servePath(req, res, filePath, parts[1])
    return
  }

  // ffmpeg derivatives: derived/<fileName>. Written only by `_transcode`.
  if (rest.startsWith('derived/')) {
    const parts = rest.split('/')
    if (parts.length !== 2) {
      sendText(res, 404, 'not found')
      return
    }
    const filePath = derivedPath(parts[1])
    if (filePath === null) {
      sendText(res, 404, 'not found')
      return
    }
    servePath(req, res, filePath, parts[1])
    return
  }

  // Extra wallpaper roots, addressed as ext/<rootIndex>/<fileName>.
  if (rest.startsWith('ext/')) {
    const parts = rest.split('/')
    const index = Number(parts[1])
    const roots = readRoots()
    if (parts.length !== 3 || Number.isInteger(index) === false || index < 0 || index >= roots.length) {
      sendText(res, 404, 'not found')
      return
    }
    const filePath = safeJoin(roots[index], parts[2])
    if (filePath === null) {
      sendText(res, 404, 'not found')
      return
    }
    servePath(req, res, filePath, parts[2])
    return
  }

  if (rest === '' || rest.includes('/') || SAFE_NAME.test(rest) === false) {
    sendText(res, 404, 'not found')
    return
  }

  serveAsset(req, res, rest)
}

/** Package-local assets: identical serving, path rooted at assets/. */
function serveAsset(req, res, name) {
  servePath(req, res, join(ASSET_DIR, name), name)
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
  listWallpapers,
  listAssets,
  safeJoin,
  readRoots,
  SAFE_NAME,
  VIDEO_EXT,
  IMAGE_EXT,
  fileSize,
  // v2.0.0 companion AI chat bridge (see lib/pet-chat.js).
  // `engineStatus(url)` keeps its old one-argument form; pass a fake Context as the
  // second argument to exercise `capabilities.petLlm` (tests do exactly that).
  engineStatus: (url, ctx) => buildEngineStatus(url, ctx),
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
