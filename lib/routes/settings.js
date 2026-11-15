// Host routes: settings persistence, bundle import/export and the installed-build
// fingerprint. Extracted from lib/index.js in v2.1.8.
import { buildFingerprint, formatFingerprintLine } from '../fingerprint.js'
import { sendJson, sendText } from '../http-media.js'
import { handleBundle, handleImport } from '../bundle.js'
import { handleSettings } from '../settings-store.js'

export const exact = {
  // v0.5.0 host routes (contract §6 order). Each module owns its method gate and its
  // own failure status: the shared GET/HEAD gate would turn every write route into a
  // blanket 405.
  _settings: (ctx, req, res) => {
    handleSettings(req, res)
  },
  _bundle: (ctx, req, res, url, rest, host) => {
    handleBundle(req, res, { build: host.build })
  },
  _import: (ctx, req, res) => {
    handleImport(req, res)
  },
  _fingerprint: (ctx, req, res, url, rest, host) => {
    // v2.0.1: exact installed-build identity for the hub's self-test / feedback panels.
    // Additive route; it carries versions, hashes and the install method only — never a
    // machine path (the profile dir is reported symbolically at most by `dataMode`).
    if (req.method !== 'GET') {
      sendText(res, 405, 'method not allowed')
      return
    }
    const fingerprint = buildFingerprint({ hostApi: host.hostApi, profile: host.activeProfile(), dataMode: host.dataDiagnostic().mode })
    sendJson(res, 200, { ...fingerprint, line: formatFingerprintLine(fingerprint) })
  },
}

export const prefix = []
