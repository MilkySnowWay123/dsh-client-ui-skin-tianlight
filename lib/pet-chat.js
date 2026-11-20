// Host half of the companion AI chat bridge.
//
// The browser half cannot call a model: the only remotely exposed `llm` methods
// are listProviders / listConfigurableProviders / discoverModels. A model call
// must therefore happen here, on the Host, through the SAME `ctx.llm` service the
// product itself uses — so the companion spends the user's configured model and
// no credential ever reaches the page.
//
// One route, deliberately narrow:
//   POST /skin-tianlight/_pet-chat  { text, provider?, model? }
//   -> { ok:true, text, finish, model:{provider,model} } | { ok:false, code }
//
// v2.2.0 adds a second, read-only route so the role hub can offer the models each
// configured provider actually serves (Grok / Claude / any provider the user added
// through DSH's own model settings):
//   GET /skin-tianlight/_pet-models[?provider=<id>]
//   -> { ok:true, provider, models:[{id,name}] } | { ok:true, providers:[{id,name}] }
//   -> { ok:false, code }
// It reads only `llm.listProviders()` / `llm.listModels()` — the same catalogue the
// product's model picker reads — and returns metadata, never credentials.
//
// Safety properties (each has a test):
//   - loopback Host only, POST + JSON only, body <= 16 KiB, text <= 4000 chars;
//   - the system prompt is a constant IN THIS FILE, never supplied by the page;
//   - no tools, no session, no purpose, no sessionId: a hand-built one-shot
//     request cannot enter the Agent loop, so no tool can ever run;
//   - only the two messages below are sent (the page sends one bounded string);
//   - maxTokens is capped at 600, the lowest reasoning effort is selected when
//     the route advertises efforts, and the whole call has a 20 s deadline;
//   - one call at a time; a client disconnect aborts the model request.
//
// This module imports nothing: the route layer owns HTTP framing while the plugin
// diagnostics can unit-test this module with a fake llm service (see tools/test.mjs).

/** Hard cap for one request body, UTF-8 bytes. */
export const PET_CHAT_MAX_BODY_BYTES = 16 * 1024
/** Hard cap for the single user text forwarded to the model. */
export const PET_CHAT_MAX_CHARS = 4000
/** Output budget for one companion reply (the contract caps it at 600). */
export const PET_CHAT_MAX_TOKENS = 600
/** Whole-call deadline; the browser adapter also races at 20 s. */
export const PET_CHAT_TIMEOUT_MS = 20000
/**
 * v2.0.4 (M3): host-side call budget. The browser keeps its own (stricter, user
 * configurable) quota, but any same-origin script could call this route directly,
 * so the host enforces a ceiling of its own. Set just above the most the UI can ever
 * spend (user daily limit max 120 + 12 autonomous thoughts) so normal use never hits
 * it. Every accepted call counts, including failures and timeouts.
 */
export const PET_CHAT_HOST_PER_MINUTE = 8
export const PET_CHAT_HOST_PER_DAY = 140
/**
 * v2.2.0 model catalogue route: `llm.listModels()` may interrogate a catalog or a
 * custom gateway, so the route gets its own short deadline and a hard output cap.
 * The UI only ever needs a picker-sized list.
 */
export const PET_MODELS_TIMEOUT_MS = 5000
export const PET_MODELS_MAX = 200
export const PET_MODELS_MAX_PROVIDER_CHARS = 128
/**
 * v2.2.0 catalogue budget. `listModels()` can perform an outbound `GET /models`
 * against a user-configured gateway, so the read-only route must not become an
 * unbounded request amplifier: cache one answer per provider, coalesce concurrent
 * reads, and cap requests per minute (mirrors the chat route's host budget).
 */
export const PET_MODELS_CACHE_TTL_MS = 10000
export const PET_MODELS_NEGATIVE_TTL_MS = 5000
export const PET_MODELS_PER_MINUTE = 30

/**
 * Fixed system prompt. It must not be assembled from Host or page data: the page
 * only ever supplies the user text, and the persona/permissions text lives here.
 */
export const PET_CHAT_SYSTEM_PROMPT =
	'You are a quiet cat companion inside a desktop app. ' +
	'You have NO permissions and NO tools: you cannot run code or shell commands, read or write files, browse or use the network, install anything, approve requests, send messages for the user, or access app data. ' +
	'Never ask for secrets, passwords, API keys, tokens or personal data. ' +
	'Never output HTML, scripts, links or executable code. ' +
	'Never suggest dangerous or irreversible actions; if asked, refuse. ' +
	'Reply in one or two calm sentences, at most 600 characters, in the user\'s language. ' +
	'Never claim an action was performed.'

/** Stable failure codes shared with the browser adapter (docs/AI-PET-PERMISSIONS.md). */
export const PET_CHAT_CODES = Object.freeze({
	INVALID_REQUEST: 'invalid-request',
	TOO_LARGE: 'too-large',
	BUSY: 'busy',
	UNCONFIGURED_MODEL: 'unconfigured-model',
	PROVIDER_NOT_ALLOWED: 'provider-not-allowed',
	TIMEOUT: 'timeout',
	ABORTED: 'aborted',
	HOST_UNAVAILABLE: 'host-unavailable',
	MISSING_CREDENTIAL: 'missing-credential',
	QUOTA: 'quota',
	RATE_LIMIT: 'rate-limit',
	LLM_ERROR: 'llm-error',
	MODELS_UNAVAILABLE: 'models-unavailable',
	// v2.3.0 / DSH 0.2.2-rc.5: the provider's content-safety filter declined the
	// topic. It is not a gateway failure, so it gets its own code and HTTP 422.
	REFUSED: 'refused',
})

/** DSH `LlmFailure.code` -> stable companion code. */
const FAILURE_CODE_MAP = Object.freeze({
	MISSING_CREDENTIAL: PET_CHAT_CODES.MISSING_CREDENTIAL,
	INVALID_CREDENTIAL: PET_CHAT_CODES.MISSING_CREDENTIAL,
	AUTH: PET_CHAT_CODES.MISSING_CREDENTIAL,
	ACCOUNT_SIGN_IN_REQUIRED: PET_CHAT_CODES.MISSING_CREDENTIAL,
	ACCOUNT_TOKEN_INVALID: PET_CHAT_CODES.MISSING_CREDENTIAL,
	QUOTA: PET_CHAT_CODES.QUOTA,
	ACCOUNT_QUOTA: PET_CHAT_CODES.QUOTA,
	RATE_LIMIT: PET_CHAT_CODES.RATE_LIMIT,
	TIMEOUT: PET_CHAT_CODES.TIMEOUT,
	ABORTED: PET_CHAT_CODES.TIMEOUT,
	NO_ADAPTER: PET_CHAT_CODES.UNCONFIGURED_MODEL,
	UNKNOWN_MODEL: PET_CHAT_CODES.UNCONFIGURED_MODEL,
	MODEL_UNSUPPORTED: PET_CHAT_CODES.UNCONFIGURED_MODEL,
	UNSUPPORTED_REASONING_EFFORT: PET_CHAT_CODES.UNCONFIGURED_MODEL,
	// v2.3.0: DSH 0.2.2-rc.5 reports a content-safety refusal as CONTENT_REFUSED
	// (before rc.5 it surfaced as MALFORMED_RESPONSE / a generic error).
	CONTENT_REFUSED: PET_CHAT_CODES.REFUSED,
})

/**
 * Map one provider failure code to the companion vocabulary. Unknown codes keep
 * the request opaque: the page only needs a category, never provider internals.
 * @param rawCode - `failure.code` reported by a finish chunk (unknown type accepted).
 * @returns one of {@link PET_CHAT_CODES} provider-failure codes.
 */
export function mapProviderFailureCode(rawCode) {
	if (typeof rawCode !== 'string' || rawCode === '') return PET_CHAT_CODES.LLM_ERROR
	const mapped = FAILURE_CODE_MAP[rawCode]
	if (mapped !== undefined) return mapped
	if (/^INVALID_MODEL/.test(rawCode)) return PET_CHAT_CODES.UNCONFIGURED_MODEL
	return PET_CHAT_CODES.LLM_ERROR
}

const HEADERS = Object.freeze({
	'content-type': 'application/json; charset=utf-8',
	'cache-control': 'no-store',
	'x-content-type-options': 'nosniff',
})

const ABORT_TOKEN = Object.freeze({ aborted: true })

/** Read a guarded Context property without letting a throwing getter escape. */
function safeService(ctx, name) {
	try {
		return ctx !== null && ctx !== undefined && typeof ctx.get === 'function' ? ctx.get(name) : undefined
	} catch {
		return undefined
	}
}

/**
 * Availability snapshot for `_engines.capabilities.petLlm`.
 *
 * Synchronous on purpose: this runs on every engine-status probe and must never
 * call `resolveModelInfo` (an adapter may fetch its catalog). It answers the three
 * questions the UI needs: is the Host LLM service mounted, does it have a
 * registered provider, and is the DSH default selection routable.
 * @param ctx - Host plugin context (may be a stripped test stand-in).
 * @returns `{ available, reason, provider, model }`; reason is null when available.
 */
export function computePetLlmCapability(ctx) {
	const llm = safeService(ctx, 'llm')
	if (
		llm === undefined ||
		llm === null ||
		typeof llm.stream !== 'function' ||
		typeof llm.listProviders !== 'function'
	) {
		return { available: false, reason: 'no-llm-service', provider: null, model: null }
	}
	const defaults = safeService(ctx, 'agentDefaultModel')
	if (defaults === undefined || defaults === null || typeof defaults.currentSelection !== 'function') {
		return { available: false, reason: 'no-default-model', provider: null, model: null }
	}
	let selection = null
	try {
		selection = defaults.currentSelection()
	} catch {
		return { available: false, reason: 'no-default-model', provider: null, model: null }
	}
	const provider = typeof selection?.provider === 'string' ? selection.provider.trim() : ''
	const model = typeof selection?.model === 'string' ? selection.model.trim() : ''
	if (provider === '' || model === '') {
		return { available: false, reason: 'unconfigured-model', provider: provider === '' ? null : provider, model: model === '' ? null : model }
	}
	let providers = null
	try {
		providers = llm.listProviders()
	} catch {
		providers = null
	}
	if (Array.isArray(providers) === false || providers.length === 0) {
		return { available: false, reason: 'no-providers', provider, model }
	}
	const routable = providers.some((entry) => entry !== null && typeof entry === 'object' && entry.id === provider)
	if (routable === false) return { available: false, reason: 'unconfigured-model', provider, model }
	return { available: true, reason: null, provider, model }
}

function isJsonRequest(req) {
	const contentType = String(req?.headers?.['content-type'] ?? '').toLowerCase()
	return contentType.includes('application/json')
}

/** Resolve `{ text }` | `{ tooLarge:true }` | `{ error:true }` from the request stream. */
function readBody(req, limit) {
	return new Promise((resolve) => {
		let settled = false
		let size = 0
		const chunks = []
		const finish = (value) => {
			if (settled) return
			settled = true
			resolve(value)
		}
		req.on('data', (chunk) => {
			if (settled) return
			size += chunk.length
			if (size > limit) {
				finish({ tooLarge: true })
				return
			}
			chunks.push(chunk)
		})
		req.on('end', () => finish({ text: Buffer.concat(chunks).toString('utf8') }))
		req.on('error', () => finish({ error: true }))
	})
}

/**
 * Create the route runtime. One instance is mounted by lib/index.js; tests create
 * their own with a fake Context and a short deadline.
 * @param options - `{ timeoutMs?, maxBodyBytes?, maxChars? }` overrides (tests only).
 * @returns `{ handle, status }`.
 */
export function createPetChat(options = {}) {
	const timeoutMs =
		Number.isFinite(options.timeoutMs) && options.timeoutMs > 0 ? Math.floor(options.timeoutMs) : PET_CHAT_TIMEOUT_MS
	const maxBodyBytes =
		Number.isFinite(options.maxBodyBytes) && options.maxBodyBytes > 0
			? Math.floor(options.maxBodyBytes)
			: PET_CHAT_MAX_BODY_BYTES
	const maxChars = Number.isFinite(options.maxChars) && options.maxChars > 0 ? Math.floor(options.maxChars) : PET_CHAT_MAX_CHARS
	const perMinute =
		Number.isFinite(options.perMinute) && options.perMinute > 0 ? Math.floor(options.perMinute) : PET_CHAT_HOST_PER_MINUTE
	const perDay = Number.isFinite(options.perDay) && options.perDay > 0 ? Math.floor(options.perDay) : PET_CHAT_HOST_PER_DAY
	const now = typeof options.now === 'function' ? options.now : () => Date.now()
	let busy = false
	/** Accepted-call timestamps of the last minute + the per-local-day counter. */
	let recent = []
	let dayKey = ''
	let dayCount = 0
	const localDayKey = (ms) => {
		const d = new Date(ms)
		return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
	}
	/** Reserve one call from the host budget; false when the minute or day is spent. */
	const takeBudget = () => {
		const t = now()
		recent = recent.filter((stamp) => t - stamp < 60000)
		const key = localDayKey(t)
		if (key !== dayKey) {
			dayKey = key
			dayCount = 0
		}
		if (recent.length >= perMinute || dayCount >= perDay) return false
		recent.push(t)
		dayCount += 1
		return true
	}

	/**
	 * Handle one request. Never throws, never rejects; the response body is always
	 * either the success object or `{ ok:false, code }`.
	 * @param ctx - Host plugin context exposing the optional `llm` / `agentDefaultModel`.
	 * @param req - node:http request.
	 * @param res - node:http response.
	 */
	function handle(ctx, req, res) {
		let responded = false
		let disconnected = false
		let acquired = false
		let controller = null
		let timer = 0
		let timedOut = false
		let resolveDisconnect = null
		const disconnectedPromise = new Promise((resolve) => {
			resolveDisconnect = resolve
		})
		const respond = (status, body) => {
			if (responded === true || disconnected === true) return
			responded = true
			try {
				res.writeHead(status, HEADERS)
				res.end(JSON.stringify(body))
			} catch {
				// the peer is gone; nothing to report
			}
		}
		const onClose = () => {
			if (responded === true) return
			disconnected = true
			try {
				controller?.abort()
			} catch {
				// abort is best effort
			}
			resolveDisconnect?.()
		}
		try {
			res.on('close', onClose)
		} catch {
			// a stripped response object cannot be watched for disconnects
		}
		const release = () => {
			if (timer !== 0) {
				clearTimeout(timer)
				timer = 0
			}
			if (acquired === true) {
				acquired = false
				busy = false
			}
			try {
				res.removeListener('close', onClose)
			} catch {
				// nothing to remove
			}
		}

		void (async () => {
			try {
				if (String(req?.method ?? 'GET').toUpperCase() !== 'POST') {
					req?.resume?.()
					respond(405, { ok: false, code: PET_CHAT_CODES.INVALID_REQUEST })
					return
				}
				if (isJsonRequest(req) === false) {
					req?.resume?.()
					respond(415, { ok: false, code: PET_CHAT_CODES.INVALID_REQUEST })
					return
				}
				const declared = Number(req?.headers?.['content-length'])
				if (Number.isFinite(declared) && declared > maxBodyBytes) {
					req?.resume?.()
					respond(413, { ok: false, code: PET_CHAT_CODES.TOO_LARGE })
					return
				}
				if (busy === true) {
					req?.resume?.()
					respond(429, { ok: false, code: PET_CHAT_CODES.BUSY })
					return
				}
				if (takeBudget() === false) {
					req?.resume?.()
					respond(429, { ok: false, code: PET_CHAT_CODES.RATE_LIMIT })
					return
				}
				busy = true
				acquired = true
				controller = new AbortController()
				timer = setTimeout(() => {
					timedOut = true
					try {
						controller.abort()
					} catch {
						// already aborted
					}
				}, timeoutMs)
				// One promise covers BOTH the deadline and any abort (client disconnect):
				// the body read, model-info resolution and stream iteration all race it, so
				// no adapter or stalled socket can hold the one-at-a-time gate forever.
				const aborted = new Promise((resolve) => {
					const onAbort = () => resolve(ABORT_TOKEN)
					if (controller.signal.aborted === true) {
						onAbort()
						return
					}
					try {
						controller.signal.addEventListener('abort', onAbort, { once: true })
					} catch {
						// a stand-in signal may not support listeners; the races below then rely on the callee
					}
				})
				const read = await Promise.race([readBody(req, maxBodyBytes), disconnectedPromise.then(() => null), aborted])
				if (disconnected === true) return
				if (read === null) return
				if (read === ABORT_TOKEN) {
					// The deadline also covers a stalled body: drop the socket so the gate is
					// released even when the peer never finishes its request.
					try {
						req.destroy?.()
					} catch {
						// already gone
					}
					respond(504, { ok: false, code: PET_CHAT_CODES.TIMEOUT })
					return
				}
				if (read.tooLarge === true) {
					respond(413, { ok: false, code: PET_CHAT_CODES.TOO_LARGE })
					return
				}
				if (read.error === true || typeof read.text !== 'string') {
					respond(400, { ok: false, code: PET_CHAT_CODES.INVALID_REQUEST })
					return
				}
				let payload = null
				try {
					payload = JSON.parse(read.text)
				} catch {
					payload = null
				}
				if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) {
					respond(400, { ok: false, code: PET_CHAT_CODES.INVALID_REQUEST })
					return
				}
				const text = typeof payload.text === 'string' ? payload.text.trim() : ''
				if (text === '' || Array.from(text).length > maxChars) {
					respond(text === '' ? 400 : 413, {
						ok: false,
						code: text === '' ? PET_CHAT_CODES.INVALID_REQUEST : PET_CHAT_CODES.TOO_LARGE,
					})
					return
				}
				const llm = safeService(ctx, 'llm')
				if (
					llm === undefined ||
					llm === null ||
					typeof llm.stream !== 'function' ||
					typeof llm.listProviders !== 'function'
				) {
					respond(503, { ok: false, code: PET_CHAT_CODES.HOST_UNAVAILABLE })
					return
				}
				const defaults = safeService(ctx, 'agentDefaultModel')
				if (defaults === undefined || defaults === null || typeof defaults.currentSelection !== 'function') {
					respond(409, { ok: false, code: PET_CHAT_CODES.UNCONFIGURED_MODEL })
					return
				}
				let selection = null
				try {
					selection = defaults.currentSelection()
				} catch {
					selection = null
				}
				const defaultProvider = typeof selection?.provider === 'string' ? selection.provider.trim() : ''
				const defaultModel = typeof selection?.model === 'string' ? selection.model.trim() : ''
				let providers = null
				try {
					providers = llm.listProviders()
				} catch {
					providers = null
				}
				if (Array.isArray(providers) === false || providers.length === 0) {
					respond(409, { ok: false, code: PET_CHAT_CODES.UNCONFIGURED_MODEL })
					return
				}
				const providerOverride =
					typeof payload.provider === 'string' && payload.provider.trim() !== '' ? payload.provider.trim() : ''
				const requestedProvider = providerOverride !== '' ? providerOverride : defaultProvider
				if (requestedProvider === '') {
					respond(409, { ok: false, code: PET_CHAT_CODES.UNCONFIGURED_MODEL })
					return
				}
				const providerRoutable = providers.some(
					(entry) => entry !== null && typeof entry === 'object' && entry.id === requestedProvider,
				)
				if (requestedProvider.length > 128 || providerRoutable === false) {
					// An explicit override to an unknown route is a caller error; a broken
					// DSH default selection is an unconfigured-model condition the UI explains.
					const code =
						providerOverride !== '' ? PET_CHAT_CODES.PROVIDER_NOT_ALLOWED : PET_CHAT_CODES.UNCONFIGURED_MODEL
					respond(providerOverride !== '' ? 400 : 409, { ok: false, code })
					return
				}
				// v2.2.0: provider and model are chosen together now (Grok / Claude and any
				// other DSH-configured route). Priority: the explicit model from the page,
				// then the DSH default model when its provider is the requested one, then
				// the provider's own first catalog entry. The last branch is what makes a
				// provider-only override work when the DSH default model belongs elsewhere.
				let model = typeof payload.model === 'string' && payload.model.trim() !== '' ? payload.model.trim() : ''
				if (model === '') {
					if (requestedProvider === defaultProvider && defaultModel !== '') model = defaultModel
					else if (typeof llm.listModels === 'function') {
						let catalogTimer = 0
						const catalogTimeout = new Promise((resolve) => {
							catalogTimer = setTimeout(() => resolve(ABORT_TOKEN), PET_MODELS_TIMEOUT_MS)
						})
						// `.catch` keeps a late rejection from becoming an unhandled rejection
						// after this race was already lost.
						const listed = Promise.resolve()
							.then(() => llm.listModels(requestedProvider))
							.catch(() => null)
						const catalog = await Promise.race([listed, catalogTimeout, aborted])
						if (catalogTimer !== 0) clearTimeout(catalogTimer)
						if (disconnected === true) return
						if (catalog === ABORT_TOKEN || timedOut === true) {
							respond(504, { ok: false, code: PET_CHAT_CODES.TIMEOUT })
							return
						}
						if (Array.isArray(catalog)) {
							for (const entry of catalog) {
								if (entry === null || typeof entry !== 'object') continue
								const id = typeof entry.id === 'string' ? entry.id.trim() : ''
								if (id !== '' && id.length <= 200) {
									model = id
									break
								}
							}
						}
					}
					if (model === '') {
						respond(409, { ok: false, code: PET_CHAT_CODES.UNCONFIGURED_MODEL })
						return
					}
				}
				if (model.length > 200) {
					respond(400, { ok: false, code: PET_CHAT_CODES.INVALID_REQUEST })
					return
				}
				// Lowest advertised reasoning effort; a route without effort metadata
				// sends none (never a guess, which the adapter would reject).
				let reasoningEffort
				// Race the metadata lookup against the deadline: an adapter that ignores the
				// signal must not hold the one-at-a-time gate. `.catch` keeps a late rejection
				// from becoming an unhandled rejection after the race was already lost.
				const infoPromise = Promise.resolve()
					.then(() => llm.resolveModelInfo(requestedProvider, model, controller.signal))
					.catch(() => null)
				const info = await Promise.race([infoPromise, aborted])
				if (disconnected === true) return
				if (info === ABORT_TOKEN || timedOut === true) {
					respond(504, { ok: false, code: PET_CHAT_CODES.TIMEOUT })
					return
				}
				if (info === null || info === undefined) {
					// The route exists but the model does not: a stale picker or a removed
					// model is an actionable "choose another model", not a provider outage.
					respond(409, { ok: false, code: PET_CHAT_CODES.UNCONFIGURED_MODEL })
					return
				}
				const efforts = info?.reasoning?.efforts
				if (Array.isArray(efforts) && efforts.length > 0) {
					const first = efforts[0]
					if (first !== null && typeof first === 'object' && typeof first.id === 'string' && first.id !== '') {
						reasoningEffort = first.id
					}
				}
				if (disconnected === true) return
				if (timedOut === true) {
					respond(504, { ok: false, code: PET_CHAT_CODES.TIMEOUT })
					return
				}
				const request = {
					provider: requestedProvider,
					model,
					system: PET_CHAT_SYSTEM_PROMPT,
					messages: [{ role: 'user', content: [{ type: 'text', text }] }],
					maxTokens: PET_CHAT_MAX_TOKENS,
					signal: controller.signal,
				}
				if (reasoningEffort !== undefined) request.reasoningEffort = reasoningEffort
				let assembled = ''
				let finishKind = 'stop'
				let failure = null
				const iterator = llm.stream(request)[Symbol.asyncIterator]()
				try {
					for (;;) {
						const step = await Promise.race([iterator.next(), aborted])
						if (step === ABORT_TOKEN) {
							// Respond FIRST (the caller below): an async generator's return()
							// waits for the in-flight next(), so awaiting it before responding
							// could stall the deadline on an abort-ignoring stream. Cleanup is
							// fire-and-forget best effort.
							failure = timedOut === true ? PET_CHAT_CODES.TIMEOUT : PET_CHAT_CODES.ABORTED
							try {
								const cleanup = iterator.return?.()
								if (cleanup !== null && typeof cleanup === 'object' && typeof cleanup.then === 'function') {
									void cleanup.then(
										() => {},
										() => {},
									)
								}
							} catch {
								// iterator cleanup is best effort
							}
							break
						}
						if (step.done === true) break
						const chunk = step.value
						if (chunk === null || typeof chunk !== 'object') continue
						if (chunk.type === 'text-delta' && typeof chunk.text === 'string' && chunk.text !== '') {
							if (assembled.length < PET_CHAT_MAX_CHARS) assembled = (assembled + chunk.text).slice(0, PET_CHAT_MAX_CHARS)
							continue
						}
						if (chunk.type === 'finish') {
							const reason = chunk.reason !== null && typeof chunk.reason === 'object' ? chunk.reason : {}
							if (reason.kind === 'error') failure = mapProviderFailureCode(reason.failure?.code)
							else if (reason.kind === 'aborted') failure = timedOut === true ? PET_CHAT_CODES.TIMEOUT : PET_CHAT_CODES.ABORTED
							else if (typeof reason.kind === 'string' && reason.kind !== '') finishKind = reason.kind
							break
						}
					}
				} finally {
					// The one-shot abort waiter is collected with this scope; nothing to detach.
				}
				if (disconnected === true) return
				if (failure !== null) {
					if (failure === PET_CHAT_CODES.REFUSED) {
						// A refusal is terminal: the partial answer the adapter already streamed
						// (if any) reads as a cut-off completion, so it is discarded here. The
						// failure body never carries text; this reset keeps that true by design.
						assembled = ''
					}
					const status =
						failure === PET_CHAT_CODES.TIMEOUT
							? 504
							: failure === PET_CHAT_CODES.ABORTED
								? 400
								: failure === PET_CHAT_CODES.REFUSED
									? 422
									: 502
					respond(status, { ok: false, code: failure })
					return
				}
				respond(200, {
					ok: true,
					text: assembled,
					finish: finishKind,
					model: { provider: requestedProvider, model },
				})
			} catch {
				respond(502, { ok: false, code: PET_CHAT_CODES.LLM_ERROR })
			} finally {
				release()
			}
		})()
	}

	return {
		handle,
		status: () => ({ busy }),
	}
}

/**
 * Read-only model catalogue runtime for the role hub's model picker.
 *
 * The browser cannot call `llm.listModels()` (it is not a Remote method), so this
 * same-origin GET route exposes only the metadata a `<select>` needs. It never
 * touches credentials, sessions or tools, and it is not part of a model call.
 * @param options - `{ timeoutMs?, maxModels? }` overrides (tests only).
 * @returns `{ handle }`.
 */
export function createPetModels(options = {}) {
	const timeoutMs =
		Number.isFinite(options.timeoutMs) && options.timeoutMs > 0
			? Math.floor(options.timeoutMs)
			: PET_MODELS_TIMEOUT_MS
	const maxModels =
		Number.isFinite(options.maxModels) && options.maxModels > 0 ? Math.floor(options.maxModels) : PET_MODELS_MAX
	const cacheTtlMs =
		Number.isFinite(options.cacheTtlMs) && options.cacheTtlMs >= 0 ? Math.floor(options.cacheTtlMs) : PET_MODELS_CACHE_TTL_MS
	const negativeTtlMs =
		Number.isFinite(options.negativeTtlMs) && options.negativeTtlMs >= 0
			? Math.floor(options.negativeTtlMs)
			: PET_MODELS_NEGATIVE_TTL_MS
	const perMinute =
		Number.isFinite(options.perMinute) && options.perMinute > 0 ? Math.floor(options.perMinute) : PET_MODELS_PER_MINUTE
	const now = typeof options.now === 'function' ? options.now : () => Date.now()
	const timeoutToken = Object.freeze({ timeout: true })
	/** provider -> `{ until, models }`; `models === null` is a short negative cache. */
	const cache = new Map()
	/** provider -> in-flight normalized catalogue promise (single-flight). */
	const inflight = new Map()
	/** Accepted request timestamps in the last minute. */
	let recent = []
	const readProvider = (url) => {
		try {
			const raw = url?.searchParams?.get?.('provider')
			return typeof raw === 'string' ? raw.trim() : ''
		} catch {
			return ''
		}
	}
	const metaOf = (entries) => {
		const result = []
		for (const entry of entries) {
			if (result.length >= maxModels) break
			if (entry === null || typeof entry !== 'object') continue
			const id = typeof entry.id === 'string' ? entry.id.trim() : ''
			if (id === '' || id.length > 200) continue
			const name = typeof entry.name === 'string' && entry.name.trim() !== '' ? entry.name.trim().slice(0, 200) : id
			result.push({ id, name })
		}
		return result
	}
	/** Reserve one catalogue request from this runtime's minute budget. */
	const takeBudget = () => {
		const t = now()
		recent = recent.filter((stamp) => t - stamp < 60000)
		if (recent.length >= perMinute) return false
		recent.push(t)
		return true
	}
	/** Start (or join) one provider catalogue read; always resolves to models|null. */
	const loadCatalogue = (llm, provider) => {
		const pending = inflight.get(provider)
		if (pending !== undefined) return pending
		const promise = Promise.resolve()
			.then(() => llm.listModels(provider))
			.then((listed) => (Array.isArray(listed) ? metaOf(listed) : null))
			.catch(() => null)
		inflight.set(provider, promise)
		const clear = () => inflight.delete(provider)
		void promise.then(clear, clear)
		return promise
	}
	/**
	 * Handle one catalogue read. Never throws; always answers a JSON body.
	 * @param ctx - Host plugin context (may be a stripped test stand-in).
	 * @param req - node:http request.
	 * @param res - node:http response.
	 * @param url - parsed request URL.
	 */
	function handle(ctx, req, res, url) {
		let responded = false
		let closed = false
		let resolveClosed = null
		const closedPromise = new Promise((resolve) => {
			resolveClosed = resolve
		})
		const onClose = () => {
			closed = true
			resolveClosed?.()
		}
		try {
			res.on('close', onClose)
		} catch {
			// a stripped response object cannot be watched for disconnects
		}
		const settle = () => {
			try {
				res.removeListener('close', onClose)
			} catch {
				// nothing to remove
			}
		}
		const respond = (status, body) => {
			if (responded) return
			responded = true
			settle()
			if (closed === true) return
			try {
				res.writeHead(status, HEADERS)
				res.end(JSON.stringify(body))
			} catch {
				// the peer is gone; nothing to report
			}
		}
		void (async () => {
			try {
				const method = String(req?.method ?? 'GET').toUpperCase()
				if (method !== 'GET' && method !== 'HEAD') {
					req?.resume?.()
					respond(405, { ok: false, code: PET_CHAT_CODES.INVALID_REQUEST })
					return
				}
				const llm = safeService(ctx, 'llm')
				if (llm === undefined || llm === null || typeof llm.listProviders !== 'function') {
					respond(503, { ok: false, code: PET_CHAT_CODES.HOST_UNAVAILABLE })
					return
				}
				if (takeBudget() === false) {
					respond(429, { ok: false, code: PET_CHAT_CODES.RATE_LIMIT })
					return
				}
				let providers = null
				try {
					providers = llm.listProviders()
				} catch {
					providers = null
				}
				if (Array.isArray(providers) === false || providers.length === 0) {
					respond(409, { ok: false, code: PET_CHAT_CODES.UNCONFIGURED_MODEL })
					return
				}
				const provider = readProvider(url)
				if (provider === '') {
					const list = []
					for (const entry of providers) {
						if (list.length >= maxModels) break
						if (entry === null || typeof entry !== 'object') continue
						const id = typeof entry.id === 'string' ? entry.id.trim() : ''
						if (id === '' || id.length > PET_MODELS_MAX_PROVIDER_CHARS) continue
						const name = typeof entry.name === 'string' && entry.name.trim() !== '' ? entry.name.trim().slice(0, 200) : id
						list.push({ id, name })
					}
					respond(200, { ok: true, providers: list })
					return
				}
				if (provider.length > PET_MODELS_MAX_PROVIDER_CHARS) {
					respond(400, { ok: false, code: PET_CHAT_CODES.INVALID_REQUEST })
					return
				}
				const known = providers.some((entry) => entry !== null && typeof entry === 'object' && entry.id === provider)
				if (known === false) {
					respond(400, { ok: false, code: PET_CHAT_CODES.PROVIDER_NOT_ALLOWED })
					return
				}
				if (typeof llm.listModels !== 'function') {
					respond(501, { ok: false, code: PET_CHAT_CODES.MODELS_UNAVAILABLE })
					return
				}
				const cached = cache.get(provider)
				if (cached !== undefined && now() < cached.until) {
					if (cached.models === null) {
						respond(502, { ok: false, code: PET_CHAT_CODES.MODELS_UNAVAILABLE })
						return
					}
					respond(200, { ok: true, provider, models: cached.models })
					return
				}
				let timer = 0
				const timedOut = new Promise((resolve) => {
					timer = setTimeout(() => resolve(timeoutToken), timeoutMs)
				})
				// A late rejection after the timeout must never become an unhandled
				// rejection; the catalogue read is best effort by contract. Concurrent
				// callers for the same provider share ONE outbound `listModels()`.
				const models = await Promise.race([loadCatalogue(llm, provider), timedOut, closedPromise])
				if (timer !== 0) clearTimeout(timer)
				if (closed === true) return
				if (models === timeoutToken) {
					cache.set(provider, { until: now() + negativeTtlMs, models: null })
					respond(504, { ok: false, code: PET_CHAT_CODES.MODELS_UNAVAILABLE })
					return
				}
				if (models === undefined) {
					cache.set(provider, { until: now() + negativeTtlMs, models: null })
					respond(502, { ok: false, code: PET_CHAT_CODES.MODELS_UNAVAILABLE })
					return
				}
				if (models === null) {
					cache.set(provider, { until: now() + negativeTtlMs, models: null })
					respond(502, { ok: false, code: PET_CHAT_CODES.MODELS_UNAVAILABLE })
					return
				}
				cache.set(provider, { until: now() + cacheTtlMs, models })
				respond(200, { ok: true, provider, models })
			} catch {
				respond(502, { ok: false, code: PET_CHAT_CODES.MODELS_UNAVAILABLE })
			}
		})()
	}
	return { handle }
}

/** One shared runtime for the plugin route (module-level so the concurrency gate is global). */
export const petChat = createPetChat()

/** One shared read-only catalogue runtime for the plugin route. */
export const petModels = createPetModels()
