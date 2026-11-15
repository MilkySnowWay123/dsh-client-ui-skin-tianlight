// Host routes: the `assets/` manifest, upload intake (POST `_upload`), the
// `uploads/` media prefix and the final asset fallback.
//
// Extracted from lib/index.js in v2.1.8. The fallback is exported separately because
// it is the last resort of the dispatch table, not a prefix route.
import { join } from 'node:path'
import { ASSET_DIR, SAFE_NAME } from '../media-types.js'
import { sendJson, sendText, servePath } from '../http-media.js'
import { receiveUpload, uploadPath } from '../upload.js'
import { listAssets } from './wallpaper.js'

export const exact = {
  _manifest: (ctx, req, res) => {
    sendJson(res, 200, { assets: listAssets() })
  },
  // Upload is the one write endpoint that is not JSON. It runs before the generic
  // GET/HEAD gate and owns its own body limits and response framing.
  _upload: (ctx, req, res, url) => {
    if (req.method !== 'POST') {
      sendText(res, 405, 'method not allowed')
      return
    }
    receiveUpload(req, res, url.searchParams.get('name'), sendJson)
  },
}

export const prefix = [
  [
    'uploads/',
    (ctx, req, res, rest) => {
      // User uploads: uploads/<fileName>, served through the same Range pipeline.
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
    },
  ],
]

/** Package-local assets: identical serving, path rooted at assets/. */
export function fallback(req, res, rest) {
  if (rest === '' || rest.includes('/') || SAFE_NAME.test(rest) === false) {
    sendText(res, 404, 'not found')
    return
  }
  servePath(req, res, join(ASSET_DIR, rest), rest)
}
