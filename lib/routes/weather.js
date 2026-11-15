// Host route: the weather proxy. Extracted from lib/index.js in v2.1.8.
import { sendJson, sendText } from '../http-media.js'
import { handleWeatherProxy } from '../weather-proxy.js'

export const exact = {
  _weather: (ctx, req, res, url) => {
    // v2.0.5: transport shim for networks where the renderer's TLS handshake to
    // Open-Meteo is dropped. Read-only, no state, no caching. GET only: a HEAD has
    // no body to return but would still spend an outbound request.
    if (req.method !== 'GET') {
      sendText(res, 405, 'method not allowed')
      return
    }
    void handleWeatherProxy(url, res).catch(() => {
      try {
        sendJson(res, 502, { ok: false, error: 'network' })
      } catch {
        // response already gone
      }
    })
  },
}

export const prefix = []
