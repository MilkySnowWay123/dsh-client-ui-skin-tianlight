// Host routes: the companion AI chat bridge and its read-only model catalogue.
// Extracted from lib/index.js in v2.1.8; the catalogue was added in v2.2.0.
import { petChat, petModels } from '../pet-chat.js'

export const exact = {
  // v2.0.0: the companion AI chat bridge. It owns method/body/response framing and
  // resolves the optional Host `llm` / `agentDefaultModel` services per request, so
  // a non-Web or older Host simply reports `{ ok:false, code }` instead of failing
  // the plugin fibre. Must stay before the generic GET/HEAD gate (it is a POST).
  '_pet-chat': (ctx, req, res) => {
    petChat.handle(ctx, req, res)
  },
  // v2.2.0: model ids per DSH provider, for the role hub's provider+model picker.
  // Read-only metadata; same-origin fence and the GET/HEAD gate are owned by index.js.
  '_pet-models': (ctx, req, res, url) => {
    petModels.handle(ctx, req, res, url)
  },
}

export const prefix = []
