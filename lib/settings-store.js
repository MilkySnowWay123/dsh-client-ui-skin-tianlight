// Host-authoritative settings store behind `_settings` (v0.5.0 contract §6).
//
// The browser half keeps localStorage as its synchronous cache; this JSON file is
// the cross-browser copy the client mirrors into (E1) and the only place a second
// window learns about the first window's write (E3, last write wins).
//
// Policy lives here so the route in index.js stays a dispatch line:
//   - only `tianlight.` / `dsh-tianlight:` keys, 64 keys max, string or null
//     values, 256 KB payload — the store is a settings mirror, not a file dump;
//   - `<plugin>/state/settings.json`, written via tmp+rename so a crash can never
//     leave half a JSON document behind;
//   - PUT merges: the client mirrors *changed* keys after the bootstrap push, so
//     replace-semantics would silently drop every key another window did not touch;
//   - revision only ever grows (last write wins, never a conflict error);
//   - a missing or corrupt file reads as empty defaults: losing the mirror must
//     not break the page, and the next PUT rewrites a clean document.

import { mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { SETTINGS_FILE } from './host-paths.js'
import { sendJson, sendText } from './http-media.js'

/** Schema generation owned by the `src/12-schema.js` migration (v5). */
export const SCHEMA_VERSION = 5
/** Hard cap for one PUT body and for the merged document. */
export const MAX_SETTINGS_BYTES = 256 * 1024
/** Hard cap for the number of mirrored localStorage keys. */
export const MAX_SETTING_KEYS = 64
/** A key is a localStorage key, not a path; this keeps a typo from becoming one. */
export const MAX_KEY_LENGTH = 160
export const SETTING_PREFIXES = ['tianlight.', 'dsh-tianlight:']
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/

/** Empty defaults: missing file, corrupt file and first boot all read as this. */
export function emptySettingsState() {
  return { schemaVersion: SCHEMA_VERSION, revision: 0, updatedAt: null, settings: {} }
}

/**
 * Only mirrored localStorage keys are accepted. Anything else (a path, a secret
 * from another origin, a key the client would later read back as its own) is a
 * 400 instead of a silent write.
 */
export function isSettingKey(value) {
  if (typeof value !== 'string') return false
  if (value.length < 2 || value.length > MAX_KEY_LENGTH) return false
  if (CONTROL_CHARS.test(value)) return false
  // The prefix alone is not a key: `tianlight.` would mirror an empty suffix.
  return SETTING_PREFIXES.some((prefix) => value.length > prefix.length && value.startsWith(prefix))
}

/** Coerce whatever is on disk into a valid state; never throws. */
export function sanitizeSettingsState(value) {
  const state = emptySettingsState()
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return state
  if (Number.isSafeInteger(value.revision) && value.revision >= 0) state.revision = value.revision
  if (typeof value.updatedAt === 'string' && value.updatedAt.length <= 40) state.updatedAt = value.updatedAt
  const settings = value.settings
  if (settings === null || typeof settings !== 'object' || Array.isArray(settings)) return state
  for (const key of Object.keys(settings)) {
    if (Object.keys(state.settings).length >= MAX_SETTING_KEYS) break
    if (isSettingKey(key) === false) continue
    const entry = settings[key]
    if (entry !== null && typeof entry !== 'string') continue
    state.settings[key] = entry
  }
  return state
}

/**
 * Validates one PUT body. Returns `{ok:true, settings, revision}` where revision
 * is the client's last-known number (used only for validation, never adopted
 * verbatim: the host counter must stay monotonic).
 */
export function validateSettingsPayload(raw) {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, status: 400, error: 'body must be a JSON object' }
  }
  const settings = raw.settings
  if (settings === null || typeof settings !== 'object' || Array.isArray(settings)) {
    return { ok: false, status: 400, error: 'settings must be an object' }
  }
  const entries = Object.entries(settings)
  if (entries.length > MAX_SETTING_KEYS) {
    return { ok: false, status: 413, error: 'at most ' + MAX_SETTING_KEYS + ' settings per request' }
  }
  const patch = {}
  for (const [key, value] of entries) {
    if (isSettingKey(key) === false) {
      return { ok: false, status: 400, error: 'settings keys must start with tianlight. or dsh-tianlight:' }
    }
    if (value !== null && typeof value !== 'string') {
      return { ok: false, status: 400, error: 'settings values must be strings or null' }
    }
    if (typeof value === 'string' && Buffer.byteLength(value) > MAX_SETTINGS_BYTES) {
      return { ok: false, status: 413, error: 'setting value too large' }
    }
    patch[key] = value
  }
  let revision = null
  if (raw.revision !== undefined) {
    if (!Number.isSafeInteger(raw.revision) || raw.revision < 0) {
      return { ok: false, status: 400, error: 'revision must be a non-negative integer' }
    }
    revision = raw.revision
  }
  return { ok: true, settings: patch, revision }
}

/**
 * Merge a validated patch onto the current map. Returns the merged map, or null
 * when the result would exceed the key/byte budget (the caller answers 413).
 */
export function mergeSettings(current, patch) {
  const settings = { ...current }
  for (const key of Object.keys(patch)) settings[key] = patch[key]
  const keys = Object.keys(settings)
  if (keys.length > MAX_SETTING_KEYS) return null
  if (Buffer.byteLength(JSON.stringify(settings)) > MAX_SETTINGS_BYTES) return null
  return settings
}

/** Read a state file; any failure is "empty defaults", never an exception. */
export function readSettingsFile(filePath) {
  try {
    return sanitizeSettingsState(JSON.parse(readFileSync(filePath, 'utf8')))
  } catch {
    return emptySettingsState()
  }
}

/** Atomic replace: the durable document is either the old one or the new one. */
export function writeSettingsFile(filePath, state) {
  const dir = dirname(filePath)
  mkdirSync(dir, { recursive: true })
  const tempPath = filePath + '.tmp-' + process.pid + '-' + Math.random().toString(36).slice(2)
  try {
    writeFileSync(tempPath, JSON.stringify(state, null, 2), 'utf8')
    renameSync(tempPath, filePath)
  } catch (error) {
    try {
      unlinkSync(tempPath)
    } catch {
      // the temp file may never have been created
    }
    throw error
  }
}

/**
 * One settings document. The class takes its file path so tests (and a second
 * plugin instance in the same process) never touch the installed `state/` tree.
 */
export class SettingsStore {
  constructor(filePath = SETTINGS_FILE) {
    this.filePath = filePath
  }

  read() {
    return readSettingsFile(this.filePath)
  }

  /** Merge one validated PUT body. Never throws: fs failures become a 500 result. */
  put(rawPayload) {
    const validated = validateSettingsPayload(rawPayload)
    if (validated.ok !== true) return validated
    const current = this.read()
    const merged = mergeSettings(current.settings, validated.settings)
    if (merged === null) {
      return { ok: false, status: 413, error: 'settings store would exceed ' + MAX_SETTING_KEYS + ' keys or ' + MAX_SETTINGS_BYTES + ' bytes' }
    }
    const next = {
      schemaVersion: SCHEMA_VERSION,
      revision: Math.max(current.revision, validated.revision ?? 0) + 1,
      updatedAt: new Date().toISOString(),
      settings: merged,
    }
    try {
      writeSettingsFile(this.filePath, next)
    } catch {
      return { ok: false, status: 500, error: 'cannot write the settings file' }
    }
    return { ok: true, revision: next.revision, updatedAt: next.updatedAt, settings: next.settings }
  }

  /** DELETE `_settings`: empty the mirror but keep the revision monotonic. */
  clear() {
    const current = this.read()
    const next = {
      schemaVersion: SCHEMA_VERSION,
      revision: current.revision + 1,
      updatedAt: new Date().toISOString(),
      settings: {},
    }
    try {
      writeSettingsFile(this.filePath, next)
    } catch {
      return { ok: false, status: 500, error: 'cannot write the settings file' }
    }
    return { ok: true, revision: next.revision, updatedAt: next.updatedAt }
  }
}

export const settingsStore = new SettingsStore()

/** Full state for routes that embed it (`_bundle`) and for `_engines.revision`. */
export function readSettings() {
  return settingsStore.read()
}

/**
 * Streaming JSON body reader with a hard byte cap. A lying Content-Length cannot
 * buy extra bytes: the cap is enforced on the chunks, not on the header.
 */
function readJsonBody(req, res, limitBytes, onValue) {
  const contentType = String(req.headers['content-type'] ?? '').toLowerCase()
  if (contentType.includes('application/json') === false) {
    sendText(res, 415, 'expected application/json')
    req.resume()
    return
  }
  const declared = Number(req.headers['content-length'])
  if (Number.isFinite(declared) && declared > limitBytes) {
    sendText(res, 413, 'settings payload too large (max ' + Math.round(limitBytes / 1024) + ' KB)')
    req.resume()
    return
  }
  const chunks = []
  let size = 0
  let settled = false
  req.on('data', (chunk) => {
    if (settled) return
    size += chunk.length
    if (size > limitBytes) {
      settled = true
      chunks.length = 0
      sendText(res, 413, 'settings payload too large (max ' + Math.round(limitBytes / 1024) + ' KB)')
      req.resume()
      return
    }
    chunks.push(chunk)
  })
  req.on('end', () => {
    if (settled) return
    settled = true
    let value
    try {
      value = JSON.parse(Buffer.concat(chunks).toString('utf8'))
    } catch {
      sendText(res, 400, 'invalid JSON settings payload')
      return
    }
    onValue(value)
  })
  req.on('error', () => {
    if (settled) return
    settled = true
    try {
      res.destroy()
    } catch {
      // the socket may already be gone
    }
  })
}

/** GET/HEAD (read), PUT (merge), DELETE (reset). Anything else is a 405. */
export function handleSettings(req, res, store = settingsStore) {
  const method = req.method
  if (method === 'GET' || method === 'HEAD') {
    const state = store.read()
    const payload = {
      ok: true,
      schemaVersion: state.schemaVersion,
      revision: state.revision,
      updatedAt: state.updatedAt,
      settings: state.settings,
    }
    if (method === 'HEAD') {
      res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
      res.end()
      return
    }
    sendJson(res, 200, payload)
    return
  }
  if (method === 'PUT') {
    readJsonBody(req, res, MAX_SETTINGS_BYTES, (value) => {
      const result = store.put(value)
      if (result.ok === true) sendJson(res, 200, { ok: true, revision: result.revision, updatedAt: result.updatedAt })
      else sendJson(res, result.status ?? 500, { ok: false, error: result.error ?? 'cannot save the settings' })
    })
    return
  }
  if (method === 'DELETE') {
    // A DELETE body (unusual, but legal) must be discarded so the socket is
    // not left waiting for a request that already got its answer.
    req.resume()
    const result = store.clear()
    if (result.ok === true) sendJson(res, 200, { ok: true, revision: result.revision, updatedAt: result.updatedAt, settings: {} })
    else sendJson(res, result.status ?? 500, { ok: false, error: result.error ?? 'cannot reset the settings' })
    return
  }
  sendText(res, 405, 'method not allowed')
}
