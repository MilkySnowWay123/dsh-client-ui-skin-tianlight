// Host routes: engine status (`_engines`), the optional WebWallGL script and the
// sandboxed scene iframe. Extracted from lib/index.js in v2.1.8.
//
// These handlers need identity owned by index.js (HOST_API / BUILD / the data
// diagnostic / the running profile), so the dispatch table passes a `host` object;
// the pure filesystem paths are passed the same way to keep the module relocatable.
import { existsSync } from 'node:fs'
import { frameCacheStatus } from '../media-cache.js'
import { sendJson, sendText, serveTextFile } from '../http-media.js'
import { computePetLlmCapability } from '../pet-chat.js'
import { listSceneProjects } from '../scene-project.js'
import { readSettings } from '../settings-store.js'
import { uploadStatus } from '../upload.js'
import { listWebProjects } from '../web-project.js'
import { ffmpegStatus } from '../transcode.js'
import { weLibraryStatus } from '../we-wallpaper/host.mjs'
import { readRoots } from './wallpaper.js'

/**
 * `_engines` payload. The capabilities block is how the browser half decides
 * whether to render settings sync, bundle import/export, the frame cache and the
 * optional transcode action at all: nothing is advertised that is not mounted.
 */
export async function engineStatus(url, ctx, host) {
  const expectedApi = url.searchParams.get('api')
  // Legacy fallback: clients shipped before HOST_API still send their build number.
  const expectedBuild = url.searchParams.get('build')
  // R4B: async ffmpeg probe — a cache miss must not block the host's event loop.
  const ffmpeg = await ffmpegStatus()
  const roots = readRoots()
  const diagnostic = host.dataDiagnostic()
  return {
    build: host.build,
    api: host.hostApi,
    // A new client states the route contract it speaks; only a contract mismatch
    // means it must not talk to this host. A client with no `api` (an old build)
    // keeps the historical build-number comparison; no handshake parameter at all
    // (curl, the diagnostics panel) is answered without a verdict.
    stale:
      expectedApi !== null
        ? expectedApi !== host.hostApi
        : expectedBuild === null
          ? undefined
          : expectedBuild !== host.build,
    webwallgl: existsSync(host.engineFile),
    adapter: existsSync(host.sceneFrame),
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
      mode: diagnostic.mode,
      dir: diagnostic.dir,
      legacyDataPending: diagnostic.legacyDataPending === true,
      migratedFromLegacy: diagnostic.migrated ?? 0,
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

export const exact = {
  // R4B: async because the ffmpeg probe no longer blocks the event loop.
  // v2.0.0: the Context rides along so `capabilities.petLlm` can read the optional
  // `llm` / `agentDefaultModel` services synchronously.
  _engines: (ctx, req, res, url, rest, host) => {
    void engineStatus(url, ctx, host).then(
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
  },
  '_engine/webwallgl.js': (ctx, req, res, url, rest, host) => {
    serveTextFile(req, res, host.engineFile, 'text/javascript; charset=utf-8')
  },
  '_scene-frame': (ctx, req, res, url, rest, host) => {
    // The iframe itself is sandboxed by the client; the CSP is the second lock:
    // opaque origin, no framing, no top navigation, no form posts.
    serveTextFile(req, res, host.sceneFrame, 'text/html; charset=utf-8', {
      'content-security-policy':
        "default-src 'none'; script-src * 'unsafe-inline' 'unsafe-eval'; style-src 'unsafe-inline'; connect-src *; img-src * data: blob:; media-src * blob:; font-src * data:; worker-src * blob:; frame-src 'none'; object-src 'none'; base-uri 'none'; sandbox allow-scripts",
      'referrer-policy': 'no-referrer',
    })
  },
}

export const prefix = []
