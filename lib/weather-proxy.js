// Weather fallback proxy (v2.0.5).
//
// The browser half fetches Open-Meteo directly. Some networks drop the TLS
// handshake to api.open-meteo.com for Chromium's TLS stack while the same host
// answers plain HTTP (and the OS TLS stack) normally. The desktop webview runs on
// the `dsh-app://` secure origin, so that half cannot downgrade the request itself
// — mixed content would be blocked. The host process has no such restriction, so
// the renderer asks this route and the host performs the request instead.
//
// Contract (read-only GET):
//   /skin-tianlight/_weather?latitude=..&longitude=..
//     200 { ok: true, transport: "https" | "http", payload: <open-meteo json> }
//     400 { ok: false, error: "invalid" }        missing / out-of-range coordinates
//     502 { ok: false, error: "network" | "timeout" }
//
// Only the two coordinates leave the machine. Nothing is cached, logged or written:
// the route is a transport shim, not a second weather model.
import http from 'node:http'
import https from 'node:https'
import { sendJson } from './http-media.js'

const FORECAST_HOST = 'api.open-meteo.com'
const FORECAST_PATH = '/v1/forecast'
/** Exactly what the browser half asks for; keep the two in step. */
const CURRENT_FIELDS = 'temperature_2m,weather_code,is_day'
/**
 * Per-transport budget. HTTPS gets a short one: when it is the broken transport it
 * never completes, and every wasted second here is a second the weather card shows
 * the previous reading. Plain HTTP gets a generous one because it is the fallback
 * of last resort and the host process may be busy (cold DNS, GC pause) when it runs.
 */
const TRANSPORT_TIMEOUT_MS = { https: 2500, http: 8000 }
/** The transport that worked last on this process; `null` until one succeeds. */
let preferredTransport = null
/** The current-conditions payload is ~600 bytes; anything near this is not weather. */
const MAX_BYTES = 64 * 1024

/** Trimmed, range-checked coordinate string, or null. */
function coordinate(value, limit) {
  if (typeof value !== 'string' || value.trim() === '') return null
  const number = Number(value)
  if (Number.isFinite(number) === false || Math.abs(number) > limit) return null
  return String(Math.round(number * 10000) / 10000)
}

/** One GET, resolved with the parsed JSON body. Errors carry a `code` for the caller. */
function requestJson(transport, path, timeoutMs) {
  return new Promise((resolve, reject) => {
    const secure = transport === 'https'
    let settled = false
    let deadline = null
    const finish = (error, value) => {
      if (settled) return
      settled = true
      if (deadline !== null) clearTimeout(deadline)
      if (error === null) resolve(value)
      else reject(error)
    }
    const request = (secure ? https : http).request(
      {
        host: FORECAST_HOST,
        port: secure ? 443 : 80,
        path,
        method: 'GET',
        headers: { accept: 'application/json', 'user-agent': 'tianlight-weather/2.0.5' },
      },
      (response) => {
        if (response.statusCode !== 200) {
          response.resume()
          finish(Object.assign(new Error(`upstream status ${response.statusCode}`), { code: 'status' }))
          return
        }
        const chunks = []
        let size = 0
        response.on('data', (chunk) => {
          size += chunk.length
          if (size > MAX_BYTES) {
            request.destroy()
            finish(Object.assign(new Error('upstream payload too large'), { code: 'oversize' }))
            return
          }
          chunks.push(chunk)
        })
        response.on('end', () => {
          try {
            finish(null, JSON.parse(Buffer.concat(chunks).toString('utf8')))
          } catch {
            finish(Object.assign(new Error('upstream payload is not json'), { code: 'json' }))
          }
        })
        response.on('error', (error) => finish(error))
      },
    )
    // A hard wall-clock deadline: `request.setTimeout` only covers socket inactivity,
    // and a handshake that stalls after connect can sit well past the budget.
    deadline = setTimeout(() => {
      request.destroy()
      finish(Object.assign(new Error('upstream timeout'), { code: 'timeout' }))
    }, timeoutMs)
    request.on('error', (error) => finish(error))
    request.end()
  })
}

/** GET /skin-tianlight/_weather — HTTPS first, then the same host over plain HTTP. */
export async function handleWeatherProxy(url, res) {
  const latitude = coordinate(url.searchParams.get('latitude'), 90)
  const longitude = coordinate(url.searchParams.get('longitude'), 180)
  if (latitude === null || longitude === null) {
    sendJson(res, 400, { ok: false, error: 'invalid' })
    return
  }
  const path =
    FORECAST_PATH +
    '?latitude=' +
    encodeURIComponent(latitude) +
    '&longitude=' +
    encodeURIComponent(longitude) +
    '&current=' +
    encodeURIComponent(CURRENT_FIELDS) +
    '&timezone=auto'
  let timedOut = false
  // Remember whichever transport actually worked on this machine: on the networks
  // this route exists for, HTTPS never completes, so paying its budget on every
  // poll would keep the card stale for seconds each time. The other transport is
  // always kept as a fallback, so a recovery is picked up again.
  const order = preferredTransport === 'http' ? ['http', 'https'] : ['https', 'http']
  for (const transport of order) {
    try {
      const payload = await requestJson(transport, path, TRANSPORT_TIMEOUT_MS[transport])
      if (payload === null || typeof payload !== 'object') continue
      preferredTransport = transport
      sendJson(res, 200, { ok: true, transport, payload })
      return
    } catch (error) {
      if (error !== null && error !== undefined && error.code === 'timeout') timedOut = true
    }
  }
  sendJson(res, 502, { ok: false, error: timedOut ? 'timeout' : 'network' })
}
