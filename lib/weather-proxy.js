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
//     429 { ok: false, error: "busy" }           two upstream requests already in flight
//     502 { ok: false, error: "network" | "timeout" }
//
// Only the two coordinates leave the machine. Nothing is cached, logged or written:
// the route is a transport shim, not a second weather model. The upstream host is a
// constant (no caller-supplied URL), the path is built from validated numbers, and
// every request has a hard wall-clock deadline plus a response-size cap — so this
// cannot be turned into an open proxy.
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
/**
 * One desktop page polls at most every few minutes, so two concurrent requests is
 * already generous (a second window, a retry after Ctrl+F5). The cap keeps a buggy or
 * hostile same-origin page from opening an unbounded number of outbound sockets.
 */
const MAX_INFLIGHT = 2
let inflight = 0

/** Trimmed, length/range-checked coordinate string, or null. */
function coordinate(value, limit) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  // A coordinate is never long; the cap also keeps Number() away from huge inputs.
  if (trimmed === '' || trimmed.length > 32) return null
  const number = Number(trimmed)
  if (Number.isFinite(number) === false || Math.abs(number) > limit) return null
  return String(Math.round(number * 10000) / 10000)
}

/** The only URL this route can request; coordinates are already validated. */
function forecastPath(latitude, longitude) {
  return (
    FORECAST_PATH +
    '?latitude=' +
    encodeURIComponent(latitude) +
    '&longitude=' +
    encodeURIComponent(longitude) +
    '&current=' +
    encodeURIComponent(CURRENT_FIELDS) +
    '&timezone=auto'
  )
}

/** One GET, resolved with the parsed JSON body. Errors carry a `code` for the caller. */
function requestJson(transport, path, timeoutMs, requestImpl) {
  return new Promise((resolve, reject) => {
    const secure = transport === 'https'
    const send = typeof requestImpl === 'function' ? requestImpl : (secure ? https : http).request
    let settled = false
    let deadline = null
    let request = null
    const finish = (error, value) => {
      if (settled) return
      settled = true
      if (deadline !== null) clearTimeout(deadline)
      if (error === null) resolve(value)
      else reject(error)
    }
    const onResponse = (response) => {
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
          try {
            if (request !== null) request.destroy()
          } catch {
            // already gone
          }
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
    }
    try {
      request = send(
        {
          host: FORECAST_HOST,
          port: secure ? 443 : 80,
          path,
          method: 'GET',
          headers: { accept: 'application/json', 'user-agent': 'tianlight-weather/2.0.5' },
        },
        onResponse,
      )
    } catch (error) {
      finish(error)
      return
    }
    // A hard wall-clock deadline: `request.setTimeout` only covers socket inactivity,
    // and a handshake that stalls after connect can sit well past the budget.
    deadline = setTimeout(() => {
      try {
        request.destroy()
      } catch {
        // already gone
      }
      finish(Object.assign(new Error('upstream timeout'), { code: 'timeout' }))
    }, timeoutMs)
    request.on('error', (error) => finish(error))
    request.end()
  })
}

/** GET /skin-tianlight/_weather — HTTPS first, then the same host over plain HTTP. */
export async function handleWeatherProxy(url, res, deps) {
  const latitude = coordinate(url.searchParams.get('latitude'), 90)
  const longitude = coordinate(url.searchParams.get('longitude'), 180)
  if (latitude === null || longitude === null) {
    sendJson(res, 400, { ok: false, error: 'invalid' })
    return
  }
  if (inflight >= MAX_INFLIGHT) {
    sendJson(res, 429, { ok: false, error: 'busy' })
    return
  }
  const request = deps !== null && typeof deps === 'object' && typeof deps.requestJson === 'function' ? deps.requestJson : requestJson
  const path = forecastPath(latitude, longitude)
  let timedOut = false
  inflight += 1
  try {
    // Remember whichever transport actually worked on this machine: on the networks
    // this route exists for, HTTPS never completes, so paying its budget on every
    // poll would keep the card stale for seconds each time. The other transport is
    // always kept as a fallback, so a recovery is picked up again.
    const order = preferredTransport === 'http' ? ['http', 'https'] : ['https', 'http']
    for (const transport of order) {
      try {
        const payload = await request(transport, path, TRANSPORT_TIMEOUT_MS[transport])
        if (payload === null || typeof payload !== 'object') continue
        preferredTransport = transport
        sendJson(res, 200, { ok: true, transport, payload })
        return
      } catch (error) {
        if (error !== null && error !== undefined && error.code === 'timeout') timedOut = true
      }
    }
    sendJson(res, 502, { ok: false, error: timedOut ? 'timeout' : 'network' })
  } finally {
    inflight -= 1
  }
}

/** Test surface: no runtime behaviour depends on these exports. */
export const __test = {
  FORECAST_HOST,
  FORECAST_PATH,
  TRANSPORT_TIMEOUT_MS,
  MAX_BYTES,
  MAX_INFLIGHT,
  coordinate,
  forecastPath,
  requestJson,
  resetInflight: () => {
    inflight = 0
    preferredTransport = null
  },
  inflight: () => inflight,
}
