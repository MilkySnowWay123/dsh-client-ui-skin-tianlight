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
	let busy = false

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
				if (defaultProvider === '' || defaultModel === '') {
					respond(409, { ok: false, code: PET_CHAT_CODES.UNCONFIGURED_MODEL })
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
				const providerOverride =
					typeof payload.provider === 'string' && payload.provider.trim() !== '' ? payload.provider.trim() : ''
				const requestedProvider = providerOverride !== '' ? providerOverride : defaultProvider
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
				const model =
					typeof payload.model === 'string' && payload.model.trim() !== '' ? payload.model.trim() : defaultModel
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
					const status =
						failure === PET_CHAT_CODES.TIMEOUT ? 504 : failure === PET_CHAT_CODES.ABORTED ? 400 : 502
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

/** One shared runtime for the plugin route (module-level so the concurrency gate is global). */
export const petChat = createPetChat()
