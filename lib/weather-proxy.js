// Weather fallback proxy (v2.0.5, reworked in v2.2.12).
//
// The browser half fetches Open-Meteo directly. Some networks drop the TLS
// handshake to api.open-meteo.com for Chromium's TLS stack while the same host
// answers plain HTTP (and the OS TLS stack) normally. The desktop webview runs on
// the `dsh-app://` secure origin, so that half cannot downgrade the request itself
// — mixed content would be blocked. The host process has no such restriction, so
// the renderer asks this route and the host performs the request instead.
//
// Contract (read-only GET):
//   /skin-tianlight/_weather?latitude=..&longitude=..[&api=2]
//     200 { ok: true, apiVersion: 2, via: "direct" | "proxy",
//           transport: "https" | "http", payload: <open-meteo json> }
//     400 { ok: false, apiVersion: 2, error: "invalid" }        missing / out-of-range coordinates
//     429 { ok: false, apiVersion: 2, error: "busy" }           two upstream requests already in flight
//     502 { ok: false, apiVersion: 2, via, error: "network" | "timeout" }
//
// v2.2.12 changes (they all exist because a "refresh" used to take up to 10.5 s and
// then report a bare network error):
//   - HTTPS and plain HTTP now race each other; the first valid answer wins and the
//     other socket is destroyed. The old serial order paid the full HTTPS budget
//     (2.5 s) before even trying HTTP.
//   - The HTTPS budget is 6 s: a TLS handshake from mainland China to Open-Meteo
//     routinely takes more than 2.5 s, so the old budget cut the good transport off.
//   - The host now honours the system proxy (HTTPS_PROXY / HTTP_PROXY / ALL_PROXY,
//     any case, else the Windows "Internet Settings" registry values). Before this,
//     a user with Clash running had a renderer that could reach the API while the
//     host fallback was guaranteed to fail — the classic "refresh always fails".
//     `via` in the response tells which path was used.
//   - `apiVersion` lets the client detect a host route that is still running old
//     code after a skin update (Ctrl+F5 does not restart the host), so the hub can
//     ask for a full DSH restart instead of failing silently.
//
// Only the two coordinates leave the machine. Nothing is cached, logged or written:
// the route is a transport shim, not a second weather model. The upstream host is a
// constant (no caller-supplied URL), the path is built from validated numbers, and
// every request has a hard wall-clock deadline plus a response-size cap — so this
// cannot be turned into an open proxy.
import http from 'node:http'
import https from 'node:https'
import tls from 'node:tls'
import { execFile } from 'node:child_process'
import { sendJson } from './http-media.js'

const FORECAST_HOST = 'api.open-meteo.com'
const FORECAST_PATH = '/v1/forecast'
/** Exactly what the browser half asks for; keep the two in step. */
const CURRENT_FIELDS = 'temperature_2m,weather_code,is_day'
/** Bumped when the response/request contract changes (the client sends `api=2`). */
const API_VERSION = 2
/**
 * Per-transport budget. HTTPS gets the larger half: on the networks this route exists
 * for the TLS handshake is exactly what is slow, so a 2.5 s cap (v2.2.11) rejected
 * the only working transport. Both transports run concurrently now, so the budgets
 * are not additive.
 */
const TRANSPORT_TIMEOUT_MS = { https: 6000, http: 8000 }
/** The transport that worked last on this process; `null` until one succeeds. */
let preferredTransport = null
/** The current-conditions payload is ~600 bytes; anything near this is not weather. */
const MAX_BYTES = 64 * 1024
/**
 * One desktop page polls at most every few minutes, so two concurrent requests is
 * already generous (a second window, a retry after Ctrl+F5). The cap keeps a buggy or
 * hostile same-origin page from opening an unbounded number of outbound sockets.
 * One request = one slot even though it now starts two upstream transports.
 */
const MAX_INFLIGHT = 2
let inflight = 0
/** Proxy lookup is cached briefly: the registry/env do not change every second. */
const PROXY_CACHE_MS = 30000
const PROXY_ENV_KEYS = ['HTTPS_PROXY', 'https_proxy', 'HTTP_PROXY', 'http_proxy', 'ALL_PROXY', 'all_proxy']
const REGISTRY_KEY = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings'
let proxyCache = { value: null, at: 0 }

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
    '&timezone=auto' +
    // v2.3.0: the appearance module schedules light/dark on local sunrise and sunset.
    // Same upstream request, one extra daily block; nothing else about the route moves.
    '&daily=sunrise,sunset&forecast_days=1'
  )
}

/**
 * Parse one proxy spec: `host:port`, `http://host:port`, `http://user:pass@host:port`.
 * SOCKS is deliberately not supported (the weather fallback is plain HTTP CONNECT);
 * an unusable value returns null and the host behaves exactly as before.
 */
function parseProxy(value) {
  if (typeof value !== 'string') return null
  const text = value.trim()
  if (text === '' || text.length > 512) return null
  const match = /^(?:([a-z][a-z0-9+.-]*):\/\/)?(?:([^:@\s/]+):([^@\s/]*)@)?(\[[^\]]+\]|[^:/\s]+):(\d{1,5})\/?$/i.exec(text)
  if (match === null) return null
  const scheme = (match[1] === undefined ? 'http' : match[1]).toLowerCase()
  if (scheme !== 'http' && scheme !== 'https') return null
  const port = Number(match[5])
  if (Number.isFinite(port) === false || port <= 0 || port > 65535) return null
  const auth =
    match[2] === undefined ? '' : 'Basic ' + Buffer.from(match[2] + ':' + (match[3] === undefined ? '' : match[3])).toString('base64')
  return { host: match[4].replace(/^\[/, '').replace(/\]$/, ''), port, scheme, auth }
}

/** `ProxyServer` can be `host:port` or `http=host:port;https=host:port`. */
function proxyFromServerValue(value) {
  const text = typeof value === 'string' ? value.trim() : ''
  if (text === '') return null
  if (text.includes('=') === false) return parseProxy(text)
  const entries = new Map()
  for (const part of text.split(';')) {
    const index = part.indexOf('=')
    if (index <= 0) continue
    entries.set(part.slice(0, index).trim().toLowerCase(), part.slice(index + 1).trim())
  }
  for (const key of ['https', 'http']) {
    if (entries.has(key) === false) continue
    const parsed = parseProxy(entries.get(key))
    if (parsed !== null) return parsed
  }
  return null
}

/** First usable `*_PROXY` environment variable (any case), or null. */
function proxyFromEnv(env) {
  if (env === null || env === undefined || typeof env !== 'object') return null
  for (const key of PROXY_ENV_KEYS) {
    const parsed = parseProxy(env[key])
    if (parsed !== null) return parsed
  }
  return null
}

/** `reg query` output → proxy config. Only an ENABLED proxy is honoured. */
function parseRegistryQuery(text) {
  const output = typeof text === 'string' ? text : ''
  if (/ProxyEnable\s+REG_DWORD\s+0x1\b/i.test(output) === false) return null
  const server = /ProxyServer\s+REG_SZ\s+(.+)/i.exec(output)
  if (server === null) return null
  return proxyFromServerValue(server[1].trim())
}

function queryWindowsProxy() {
  return new Promise((resolve) => {
    if (process.platform !== 'win32') {
      resolve(null)
      return
    }
    try {
      // Asynchronous on purpose: this runs on the host event loop. A 1.5 s cap keeps a
      // hung `reg.exe` from delaying the weather response.
      execFile('reg', ['query', REGISTRY_KEY], { timeout: 1500, windowsHide: true }, (error, stdout) => {
        resolve(error ? null : parseRegistryQuery(String(stdout === undefined || stdout === null ? '' : stdout)))
      })
    } catch {
      resolve(null)
    }
  })
}

/**
 * The proxy to use, or null for a direct connection. `deps.proxy` (tests) wins over
 * the environment, and the registry is only consulted when no env var is set.
 */
async function resolveProxy(deps) {
  if (deps !== null && deps !== undefined && typeof deps === 'object') {
    if (typeof deps.proxy === 'function') return deps.proxy()
    if (deps.proxy !== undefined && deps.proxy !== null) {
      const injected = typeof deps.proxy === 'string' ? parseProxy(deps.proxy) : deps.proxy
      return injected !== null && typeof injected === 'object' && Number.isFinite(Number(injected.port)) ? injected : null
    }
  }
  const now = Date.now()
  if (proxyCache.at !== 0 && now - proxyCache.at < PROXY_CACHE_MS) return proxyCache.value
  let proxy = proxyFromEnv(process.env)
  if (proxy === null) proxy = await queryWindowsProxy()
  proxyCache = { value: proxy, at: Date.now() }
  return proxy
}

/** CONNECT tunnel + TLS handshake, resolved with the TLS socket. */
function openTunnel(proxy, timeoutMs, tlsImpl) {
  return new Promise((resolve, reject) => {
    const authority = FORECAST_HOST + ':443'
    const headers = { host: authority }
    if (proxy.auth !== '' && proxy.auth !== undefined) headers['proxy-authorization'] = proxy.auth
    let settled = false
    const finish = (error, value) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      if (error === null) resolve(value)
      else reject(error)
    }
    const timer = setTimeout(() => {
      if (settled) return
      settled = true
      try {
        request.destroy()
      } catch {
        // already gone
      }
      reject(Object.assign(new Error('proxy connect timeout'), { code: 'timeout' }))
    }, timeoutMs)
    let request = null
    try {
      request = http.request({ host: proxy.host, port: proxy.port, method: 'CONNECT', path: authority, headers })
    } catch (error) {
      finish(error)
      return
    }
    request.on('connect', (response, socket, head) => {
      // A proxy that resets the tunnel would otherwise emit an uncaught 'error' on the
      // raw socket and take the host process down; every tunnel socket is guarded.
      socket.on('error', (error) => finish(error))
      if (settled === true) {
        try {
          socket.destroy()
        } catch {
          // already gone
        }
        return
      }
      if (response.statusCode !== 200) {
        try {
          socket.destroy()
        } catch {
          // already gone
        }
        finish(Object.assign(new Error('proxy refused the tunnel'), { code: 'status' }))
        return
      }
      if (head !== undefined && head !== null && head.length > 0) socket.unshift(head)
      let secureSocket = null
      try {
        secureSocket = tlsImpl.connect({ socket, servername: FORECAST_HOST })
      } catch (error) {
        finish(error)
        return
      }
      secureSocket.once('error', (error) => {
        try {
          secureSocket.destroy()
        } catch {
          // already gone
        }
        finish(error)
      })
      secureSocket.once('secureConnect', () => finish(null, secureSocket))
    })
    request.on('error', (error) => finish(error))
    request.end()
  })
}

/**
 * One GET, resolved with the parsed JSON body. Errors carry a `code` for the caller.
 * With a proxy, HTTPS goes through a CONNECT tunnel and plain HTTP uses the
 * absolute-URI form; without a proxy the behaviour is the pre-2.2.12 one.
 */
function startRequestJson(transport, path, timeoutMs, requestImpl, proxy, tlsImpl) {
  const secure = transport === 'https'
  let request = null
  let settled = false
  let cancelled = false
  const state = { destroy: () => {} }
  const promise = new Promise((resolve, reject) => {
    let deadline = null
    const finish = (error, value) => {
      if (settled) return
      settled = true
      if (deadline !== null) clearTimeout(deadline)
      if (error === null) {
        resolve(value)
        return
      }
      if (cancelled === false && request !== null) {
        try {
          request.destroy()
        } catch {
          // already gone
        }
      }
      reject(error)
    }
    state.destroy = () => {
      cancelled = true
      finish(Object.assign(new Error('cancelled'), { code: 'cancelled' }))
    }
    const onResponse = (response) => {
      if (response.statusCode !== 200) {
        response.resume()
        finish(Object.assign(new Error(`upstream status ${response.statusCode}`), { code: 'status', status: response.statusCode }))
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
    const headers = { accept: 'application/json', 'user-agent': 'tianlight-weather/2.2.12' }
    // A hard wall-clock deadline for the WHOLE attempt (tunnel included):
    // `request.setTimeout` only covers socket inactivity, and a handshake that stalls
    // after connect can sit well past the budget.
    deadline = setTimeout(() => {
      try {
        if (request !== null) request.destroy()
      } catch {
        // already gone
      }
      finish(Object.assign(new Error('upstream timeout'), { code: 'timeout' }))
    }, timeoutMs)
    const begin = () => {
      if (settled === true) return
      if (typeof requestImpl === 'function') {
        // Injected transport (tests / diagnostics): same signature as the built-in.
        request = requestImpl(
          {
            host: FORECAST_HOST,
            port: secure ? 443 : 80,
            path,
            method: 'GET',
            headers,
          },
          onResponse,
        )
      } else if (proxy === null || proxy === undefined) {
        request = (secure ? https : http).request(
          {
            host: FORECAST_HOST,
            port: secure ? 443 : 80,
            path,
            method: 'GET',
            headers,
          },
          onResponse,
        )
      } else if (secure === true) {
        openTunnel(proxy, timeoutMs, tlsImpl).then((socket) => {
          if (settled === true) {
            try {
              socket.destroy()
            } catch {
              // already gone
            }
            return
          }
          // HTTP over the tunnel's TLS socket: createConnection is honoured when no
          // agent is supplied (an explicit `agent: false` would ignore it).
          request = http.request(
            {
              host: FORECAST_HOST,
              port: 443,
              path,
              method: 'GET',
              headers,
              createConnection: () => socket,
            },
            onResponse,
          )
          request.on('error', (error) => finish(error))
          request.end()
        }, (error) => finish(error))
        return
      } else {
        // Plain HTTP through an HTTP proxy: absolute-URI request to the proxy itself.
        request = http.request(
          {
            host: proxy.host,
            port: proxy.port,
            path: 'http://' + FORECAST_HOST + path,
            method: 'GET',
            headers: Object.assign({ host: FORECAST_HOST }, proxy.auth === '' ? {} : { 'proxy-authorization': proxy.auth }),
          },
          onResponse,
        )
      }
      request.on('error', (error) => finish(error))
      request.end()
    }
    begin()
  })
  return { promise, destroy: () => state.destroy() }
}

/** Promise-only wrapper (the historical test surface). */
function requestJson(transport, path, timeoutMs, requestImpl, proxy, tlsImpl) {
  return startRequestJson(transport, path, timeoutMs, requestImpl, proxy, tlsImpl).promise
}

/**
 * GET /skin-tianlight/_weather — HTTPS and plain HTTP race; first valid answer wins.
 * `via` reports whether the host went direct or through the system proxy.
 */
export async function handleWeatherProxy(url, res, deps) {
  const latitude = coordinate(url.searchParams.get('latitude'), 90)
  const longitude = coordinate(url.searchParams.get('longitude'), 180)
  if (latitude === null || longitude === null) {
    sendJson(res, 400, { ok: false, apiVersion: API_VERSION, error: 'invalid' })
    return
  }
  if (inflight >= MAX_INFLIGHT) {
    sendJson(res, 429, { ok: false, apiVersion: API_VERSION, error: 'busy' })
    return
  }
  const path = forecastPath(latitude, longitude)
  const injected = deps !== null && typeof deps === 'object' && typeof deps.requestJson === 'function' ? deps.requestJson : null
  const tlsImpl = deps !== null && typeof deps === 'object' && deps.tls !== null && typeof deps.tls === 'object' && typeof deps.tls.connect === 'function' ? deps.tls : tls
  let via = 'direct'
  let timedOut = false
  inflight += 1
  try {
    let proxy = null
    try {
      proxy = injected === null ? await resolveProxy(deps) : null
    } catch {
      proxy = null
    }
    via = proxy === null ? 'direct' : 'proxy'
    // Remember whichever transport actually worked on this machine: on the networks
    // this route exists for, HTTPS never completes, so paying its budget before even
    // trying HTTP would keep the card stale for seconds each poll. Both always start;
    // the remembered order only breaks ties and shapes the budgets.
    const order = preferredTransport === 'http' ? ['http', 'https'] : ['https', 'http']
    const attempts = order.map((transport) => {
      const started = Date.now()
      let handle = null
      if (injected === null) {
        handle = startRequestJson(transport, path, TRANSPORT_TIMEOUT_MS[transport], null, proxy, tlsImpl)
      } else {
        // An injected transport must not be able to throw through the route.
        let promise = null
        try {
          promise = Promise.resolve(injected(transport, path, TRANSPORT_TIMEOUT_MS[transport]))
        } catch (error) {
          promise = Promise.reject(error)
        }
        handle = { promise, destroy: () => {} }
      }
      return {
        transport,
        started,
        destroy: handle.destroy,
        result: handle.promise.then(
          (payload) => ({ ok: true, transport, payload, ms: Date.now() - started }),
          (error) => ({
            ok: false,
            transport,
            error: error !== null && error !== undefined && error.code === 'timeout' ? 'timeout' : 'network',
            ms: Date.now() - started,
          }),
        ),
      }
    })
    let settled = false
    const winner = await new Promise((resolve) => {
      let remaining = attempts.length
      for (const attempt of attempts) {
        attempt.result.then((result) => {
          remaining -= 1
          if (settled === true) return
          if (result.ok === true && result.payload !== null && typeof result.payload === 'object') {
            settled = true
            resolve(result)
          } else if (remaining <= 0) {
            settled = true
            resolve(result)
          }
        })
      }
    })
    for (const attempt of attempts) {
      if (attempt.transport !== winner.transport && attempt.destroy !== undefined) attempt.destroy()
    }
    if (winner.ok === true && winner.payload !== null && typeof winner.payload === 'object') {
      preferredTransport = winner.transport
      sendJson(res, 200, { ok: true, apiVersion: API_VERSION, via, transport: winner.transport, payload: winner.payload })
      return
    }
    if (winner.error === 'timeout') timedOut = true
    sendJson(res, 502, { ok: false, apiVersion: API_VERSION, via, error: timedOut ? 'timeout' : 'network' })
  } finally {
    inflight -= 1
  }
}

/** Test surface: no runtime behaviour depends on these exports. */
export const __test = {
  FORECAST_HOST,
  FORECAST_PATH,
  API_VERSION,
  TRANSPORT_TIMEOUT_MS,
  MAX_BYTES,
  MAX_INFLIGHT,
  PROXY_ENV_KEYS,
  coordinate,
  forecastPath,
  parseProxy,
  proxyFromServerValue,
  proxyFromEnv,
  parseRegistryQuery,
  resolveProxy,
  requestJson,
  startRequestJson,
  resetInflight: () => {
    inflight = 0
    preferredTransport = null
    proxyCache = { value: null, at: 0 }
  },
  resetProxyCache: () => {
    proxyCache = { value: null, at: 0 }
  },
  inflight: () => inflight,
  preferredTransport: () => preferredTransport,
}
