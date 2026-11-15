// Host route: the companion AI chat bridge. Extracted from lib/index.js in v2.1.8.
import { petChat } from '../pet-chat.js'

export const exact = {
  // v2.0.0: the companion AI chat bridge. It owns method/body/response framing and
  // resolves the optional Host `llm` / `agentDefaultModel` services per request, so
  // a non-Web or older Host simply reports `{ ok:false, code }` instead of failing
  // the plugin fibre. Must stay before the generic GET/HEAD gate (it is a POST).
  '_pet-chat': (ctx, req, res) => {
    petChat.handle(ctx, req, res)
  },
}

export const prefix = []
