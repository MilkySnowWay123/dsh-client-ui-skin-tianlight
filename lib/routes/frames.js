// Host routes: the frame cache, ffmpeg transcoding and the `derived/` media prefix.
// Extracted from lib/index.js in v2.1.8.
import { sendJson, sendText, servePath } from '../http-media.js'
import { derivedPath, handleTranscode, handleTranscodeStatus } from '../transcode.js'
import { handleFrameCache, handleFrameCacheStatus } from '../media-cache.js'

export const exact = {
  '_frame-cache': (ctx, req, res, url) => {
    handleFrameCache(req, res, url)
  },
  '_frame-cache/status': (ctx, req, res) => {
    handleFrameCacheStatus(req, res)
  },
  _transcode: (ctx, req, res, url) => {
    // R4B: async handler (ffmpeg probe/run). The route writes its own response.
    void handleTranscode(req, res, url).catch(() => {
      try {
        sendJson(res, 500, { ok: false, error: 'transcode failed' })
      } catch {
        // response already gone
      }
    })
  },
  '_transcode/status': (ctx, req, res) => {
    void handleTranscodeStatus(req, res).catch(() => {
      try {
        sendJson(res, 500, { ok: false, error: 'transcode-status-failed' })
      } catch {
        // response already gone
      }
    })
  },
}

export const prefix = [
  [
    'derived/',
    (ctx, req, res, rest) => {
      // ffmpeg derivatives: derived/<fileName>. Written only by `_transcode`.
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
    },
  ],
]
