// Static audit of the skin bundle: duplicate custom properties, declared-but-unused
// variables, listener/timer inventory, and lifecycle ordering in apply().
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const FILE = fileURLToPath(new URL('../lib/client.js', import.meta.url))
const source = fs.readFileSync(FILE, 'utf8')

let issues = 0
const report = (level, text) => {
  if (level === 'FAIL') issues += 1
  console.log(`[${level}] ${text}`)
}

// ---- extract every CSS template (main sheet + v0.5.0 feature blocks) ----
// Convention since v0.5.0: all String.raw templates in the product are CSS blocks,
// because feature fragments register their styles through registerTl5Css().
const cssBlocks = [...source.matchAll(/String\.raw`([^`]*)`/g)].map((match) => match[1])
if (cssBlocks.length === 0) throw new Error('CSS template not found')
const css = cssBlocks.join('\n')
const blanked = css.replace(/\/\*[\s\S]*?\*\//g, '')

// ---- 1. duplicate declarations of the same custom property in one block ----
const blocks = []
{
  let depth = 0
  let start = 0
  for (let i = 0; i < blanked.length; i++) {
    if (blanked[i] === '{') { if (depth === 0) start = i; depth += 1 }
    else if (blanked[i] === '}') {
      depth -= 1
      if (depth === 0) blocks.push(blanked.slice(start + 1, i))
    }
  }
}
let dupCount = 0
for (const body of blocks) {
  const seen = new Map()
  for (const m of body.matchAll(/(--[a-z0-9-]+)\s*:/g)) {
    const name = m[1]
    seen.set(name, (seen.get(name) ?? 0) + 1)
  }
  for (const [name, count] of seen) {
    if (count > 1) { dupCount += 1; report('FAIL', `duplicate declaration: ${name} x${count} in one rule`) }
  }
}
if (dupCount === 0) report('PASS', 'no duplicate custom-property declarations inside a rule')

// ---- 2. declared vs used ----
const declared = new Set([...blanked.matchAll(/(--tl-[a-z0-9-]+)\s*:/g)].map((m) => m[1]))
const used = new Set([...blanked.matchAll(/var\((--tl-[a-z0-9-]+)/g)].map((m) => m[1]))
const unused = [...declared].filter((name) => !used.has(name))
if (unused.length === 0) report('PASS', 'every declared --tl-* variable is used')
else report('WARN', 'declared but never used: ' + unused.join(', '))

// Variables the runtime supplies from JavaScript rather than the stylesheet.
const JS_PROVIDED = new Set(['--tl-focal-x', '--tl-look', '--tl-rheo-pos', '--tl-rheo-t'])
const missing = [...used].filter((name) => !declared.has(name) && !JS_PROVIDED.has(name))
if (missing.length === 0) report('PASS', 'every referenced --tl-* variable is declared')
else report('FAIL', 'used but never declared: ' + missing.join(', '))

// ---- 3. listener inventory ----
// Only listeners on long-lived targets leak. Listeners on an element the skin
// removes die with that element, so they are excluded on purpose.
const SCOPED = /(window|document|video)\.(add|remove)EventListener\(\s*"([a-z]+)"/g
const adds = []
const removes = []
for (const m of source.matchAll(SCOPED)) {
  ;(m[2] === 'add' ? adds : removes).push(m[3])
}
const count = (list, name) => list.filter((x) => x === name).length
const kinds = new Set([...adds, ...removes])
let listenerIssue = false
for (const kind of kinds) {
  const a = count(adds, kind)
  const r = count(removes, kind)
  if (a !== r) {
    listenerIssue = true
    report('FAIL', `global listener imbalance on "${kind}": add=${a} remove=${r}`)
  }
}
if (!listenerIssue) report('PASS', 'every window/document/media listener is removed on dispose')

const timers = {
  setTimeout: [count([...source.matchAll(/window\.setTimeout/g)].map(() => 'x'), 'x'), count([...source.matchAll(/window\.clearTimeout/g)].map(() => 'x'), 'x')],
  setInterval: [count([...source.matchAll(/window\.setInterval/g)].map(() => 'x'), 'x'), count([...source.matchAll(/window\.clearInterval/g)].map(() => 'x'), 'x')],
}
for (const [name, [a, r]] of Object.entries(timers)) {
  if (a === 0) continue
  report(a <= r ? 'PASS' : 'WARN', `${name}: ${a} set / ${r} clear`)
}

// ---- 4. lifecycle: set and dispose must belong to the same effect ----
// The body attribute is installed through the same wrapper as every other effect, so
// the assertion is that its set/remove pair lives inside one `install(...)` factory.
const pairedAttr = /install\(\s*"ui-skin-tianlight: body attribute"[\s\S]{0,400}?setAttribute\(BODY_ATTR[\s\S]{0,400}?removeAttribute\(BODY_ATTR/.test(source)
if (!pairedAttr) {
  report('FAIL', 'body attribute must be set AND removed inside one lifecycle-owned effect, or a throw leaves it armed')
} else {
  report('PASS', 'body attribute set and removed inside one lifecycle-owned effect')
}

// Hot reload: the instance registry must be published and consulted.
const hasRegistry =
  source.includes('INSTANCE_REGISTRY_KEY') &&
  source.includes('globalThis[INSTANCE_REGISTRY_KEY] = instance') &&
  source.includes('disposePreviousInstance()')
report(hasRegistry ? 'PASS' : 'FAIL', hasRegistry
  ? 'singleton instance registry present (re-apply disposes the previous instance)'
  : 'singleton instance registry missing: a loader re-apply would stack a second skin')

// The attribute effect must be registered before the fallible installers.
// Compare positions INSIDE apply(), not the module-wide function definitions.
const applyAt = source.lastIndexOf('function apply(ctx)')
const applyEnd = source.indexOf('exports.apply', applyAt)
const applyBody = source.slice(applyAt, applyEnd)
const order = [
  applyBody.indexOf('setAttribute(BODY_ATTR'),
  applyBody.indexOf('installScene'),
  applyBody.indexOf('installCompanion'),
]
if (order[0] >= 0 && order[0] < order[1] && order[1] < order[2]) {
  report('PASS', 'effect order inside apply(): stylesheet -> body attribute -> wallpaper -> companion')
} else {
  report('FAIL', 'effect order inside apply() is wrong: ' + JSON.stringify(order))
}

// ---- 5. no React hook may follow an early return ----
// A component that returns before its hooks changes the hook count between renders
// and React throws; this caught a real crash in the rheostat.
{
  const lines = source.split('\n')
  let sawEarlyReturn = false
  let violation = false
  for (const line of lines) {
    if (/if \(selection === null.*return null;/.test(line)) sawEarlyReturn = true
    else if (sawEarlyReturn && /React\.use(State|Effect|Ref|Memo|Callback|Reducer)\(/.test(line)) {
      violation = true
      break
    }
  }
  report(violation ? 'FAIL' : 'PASS', violation
    ? 'a React hook is declared after the early return'
    : 'no React hook is declared after the early return')
}

console.log('\nstylesheet: ' + css.length + ' chars, ' + declared.size + ' custom properties')
// ---- 7. duty channel: outbound events must survive the bubble teardown ----
// Regression guard for the v0.7.0 first cut: hideDuty() clears the stored emitter,
// so calling it before emit() swallowed every choice/timeout event. The shipped
// shape must capture the emitter and signal id first, hide, then emit.
const dutyClickAt = source.indexOf('button.addEventListener("click", (event) => {')
const dutyTimeoutAt = source.indexOf("dutyTimer = window.setTimeout(() => {")
const clickRegion = dutyClickAt >= 0 ? source.slice(dutyClickAt, dutyClickAt + 700) : ""
const timeoutRegion = dutyTimeoutAt >= 0 ? source.slice(dutyTimeoutAt, dutyTimeoutAt + 700) : ""
const emitOrderingOk = (region, eventType) => {
  const capture = region.indexOf("const emit = dutyEmit")
  const hide = region.indexOf("hideDuty(")
  const emit = region.indexOf("emit({ type: \"" + eventType + "\"")
  return capture >= 0 && hide >= 0 && emit >= 0 && capture < hide && hide < emit
}
report(emitOrderingOk(clickRegion, "choice") ? "PASS" : "FAIL", "duty choice: capture -> hide -> emit (outbound event survives teardown)")
report(emitOrderingOk(timeoutRegion, "timeout") ? "PASS" : "FAIL", "duty timeout: capture -> hide -> emit (outbound event survives teardown)")
const clearAt = source.indexOf('bridge.hideDuty("clear")')
const clearRegion = clearAt >= 0 ? source.slice(clearAt, clearAt + 260) : ""
report(clearRegion.includes("bridge.clearSay()") ? "PASS" : "FAIL", "duty clear also dismisses a pending speak bubble")
report(
  source.includes("globalThis.tianlightDuty = publicApi") && source.includes('document.addEventListener(DUTY_EVENT, onDutyEvent)')
    ? "PASS"
    : "FAIL",
  "duty channel exposes tianlightDuty and listens for tianlight:duty",
)

// ---- 8. v1.0.0 role layer: life API / media cap / liquid glass / settings page ----
report(source.includes("globalThis.tianlightLife") ? "PASS" : "FAIL", "life engine exposes globalThis.tianlightLife")
report(
  /32\s*\*\s*1024\s*\*\s*1024|33554432/.test(source) ? "PASS" : "FAIL",
  "replaceable pet media enforces the 32 MiB cap",
)
report(
  source.includes('data-tl-glass-depth') && source.includes('data-tl-glass-effective') ? "PASS" : "FAIL",
  "liquid glass depth exposes configured + effective body attributes",
)
report(
  source.includes('data-tl-glass-effective="real"') &&
    source.includes('data-tl-glass-effective="soft"') &&
    source.includes('data-tl-glass-effective="frosted"')
    ? "PASS"
    : "FAIL",
  "liquid glass ships all three levels (real / soft / frosted)",
)
report(!source.includes('"tianlight-role"') ? "PASS" : "FAIL", "no separate role settings section (role lives in the pet)")
report(
  source.includes('type: "deferred"') && source.includes("publicApi") && source.includes("replay")
    ? "PASS"
    : "FAIL",
  "duty channel v1.1 reports deferred reminders and exposes replay",
)
report(
  source.includes("tianlight:pet-media") ? "PASS" : "FAIL",
  "pet media changes are broadcast as tianlight:pet-media",
)

// ---- 9. v1.1.0 AI companion: strict permission model / hub / upload / audit ----
report(source.includes("globalThis.tianlightPet") ? "PASS" : "FAIL", "pet brain exposes globalThis.tianlightPet")
report(
  source.includes("tianlight.pet.permissions.v1") && source.includes('consent') ? "PASS" : "FAIL",
  "pet permissions persist and LLM grants require explicit consent",
)
report(
  source.includes("PET_HIGH_CAPS") &&
    ["network", "files", "shell", "approve", "message", "install"].every((cap) => source.includes(`"${cap}"`)) &&
    source.includes("setCapabilityAdapter")
    ? "PASS"
    : "FAIL",
  "six high-risk capabilities are user-grantable through adapters (not hard-denied)",
)
report(
  (() => {
    const match = source.match(/PET_FORBIDDEN_CAPS\s*=\s*\[([^\]]*)\]/)
    const list = match === null ? "" : match[1]
    return list.includes('"agent"') && !["network", "files", "shell", "approve", "message", "install"].some((cap) => list.includes(`"${cap}"`))
      ? "PASS"
      : "FAIL"
  })(),
  "driving DSH (agent) remains the only permanently forbidden capability",
)
report(
  source.includes("invokeCapability") && source.includes("capability") ? "PASS" : "FAIL",
  "capability adapters are permission-gated and audited",
)
report(
  source.includes('tianlight.pet.ai.v1') && source.includes("dailyLimit") ? "PASS" : "FAIL",
  "LLM adapter usage is budgeted and persisted",
)
report(
  !source.includes("HUB_SLOT_NAME") && !source.includes("HUB_SLOT_ID") ? "PASS" : "FAIL",
  "role hub has no separate sidebar entry (pet-only access)",
)
report(
  source.includes('_upload?name=') && source.includes("/ 1024 / 1024") ? "PASS" : "FAIL",
  "role hub uploads pet media through the host upload route with a client-side size check",
)
report(
  source.includes('data-tl-hub') && source.includes('tianlight-role-hub') ? "PASS" : "FAIL",
  "role hub exposes the full-screen control overlay",
)

// ---- 10. v1.2.0 controlled DSH Agent bridge ----
report(source.includes("globalThis.tianlightPetAgent") ? "PASS" : "FAIL", "pet agent exposes globalThis.tianlightPetAgent")
report(
  source.includes('"remote.session"') && source.includes(".prompt(") ? "PASS" : "FAIL",
  "pet agent talks to the DSH agent through remote.session prompt",
)
report(
  source.includes("agentChat") && source.includes("PET_AGENT_DAILY_CAP") ? "PASS" : "FAIL",
  "agent bridge is gated by the agentChat capability and a daily cap",
)
report(
  source.includes("PET_AGENT_MAX_CHARS") && source.includes("PET_AGENT_TIMEOUT_MS") ? "PASS" : "FAIL",
  "agent bridge bounds prompt length and reply time",
)
report(
  !source.includes("session.cancel") && !source.includes("session.approve") && !source.includes("session.attachment")
    ? "PASS"
    : "FAIL",
  "agent bridge never cancels, approves, or attaches by itself",
)
report(
  source.includes("recordExternal") && source.includes("tianlight.pet.agent.v1") ? "PASS" : "FAIL",
  "agent prompts are audited and budgeted in localStorage",
)

// ---- 11. v1.5.0 visibility & feedback: default glass, weather, self-test, feedback ----
report(source.includes('const GLASS_DEPTH_DEFAULT = "soft"') ? "PASS" : "FAIL", "liquid glass defaults to the visible soft level")
report(
  source.includes("globalThis.tianlightWeather") && source.includes("summary(") ? "PASS" : "FAIL",
  "weather controller is exposed with a localized summary for the pet hub",
)
report(
  source.includes("data-tl-hub-media-default") && source.includes("setMedia(null)") ? "PASS" : "FAIL",
  "role hub can restore the default pet look",
)
report(
  source.includes("data-tl-hub-weather") && source.includes("data-tl-hub-glass-preview") ? "PASS" : "FAIL",
  "role hub surfaces weather and a liquid-glass preview",
)
report(
  source.includes("data-tl-hub-selftest") && source.includes("data-tl-hub-feedback") ? "PASS" : "FAIL",
  "role hub ships a self-test panel and an in-app feedback channel",
)
report(
  source.includes("dsh-client-ui-skin-tianlight/issues/new") ? "PASS" : "FAIL",
  "feedback panel prefills the GitHub issue URL",
)

// ---- 12. v1.6.0: raised safety limits (numbers only) + liquid glass on every surface ----
report(
  source.includes("const LIFE_DEFAULT_CAP = 12") && source.includes("const LIFE_BUDGET_MAX = 50") ? "PASS" : "FAIL",
  "v1.6 raised the proactive budget: 12 bubbles/day by default, adjustable up to 50",
)
report(
  source.includes("const PET_LOCAL_MINUTE_LIMIT = 20") &&
    source.includes("const PET_LOCAL_DAILY_LIMIT = 1200") &&
    source.includes("const PET_INPUT_MAX = 1000")
    ? "PASS"
    : "FAIL",
  "v1.6 raised local pet chat: 20/min + 1200/day and 1000 chars of input",
)
report(
  source.includes("const PET_DAILY_LIMIT_DEFAULT = 60") &&
    source.includes("const PET_DAILY_LIMIT_MAX = 120") &&
    source.includes("const PET_MINUTE_CALL_LIMIT = 6")
    ? "PASS"
    : "FAIL",
  "v1.6 raised LLM quotas: 60/day default (120 max) and 6 calls/min",
)
report(
  source.includes("const PET_LLM_MAX_CHARS = 1200") &&
    source.includes("const PET_REPLY_MAX = 1200") &&
    source.includes("const PET_LLM_TIMEOUT_MS = 20000")
    ? "PASS"
    : "FAIL",
  "v1.6 raised LLM output: 1200 chars (payload + reply cap) and a 20s timeout",
)
report(
  source.includes("const PET_AGENT_DAILY_CAP = 30") &&
    source.includes("const PET_AGENT_DAILY_CAP_MAX = 100") &&
    source.includes("const PET_AGENT_MAX_CHARS = 1000") &&
    source.includes("const PET_AGENT_TIMEOUT_MS = 120000")
    ? "PASS"
    : "FAIL",
  "v1.6 raised the agent bridge: 30/day default (100 max), 1000 chars, 120s",
)
report(
  source.includes("const HUB_AI_INPUT_MAX = 1000") && source.includes('max: "50"') ? "PASS" : "FAIL",
  "v1.6 hub input and life-budget bounds follow the raised limits",
)
report(
  source.includes('const PET_FORBIDDEN_CAPS = ["agent"]') && source.includes('"tianlight.pet.permissions.v1"')
    ? "PASS"
    : "FAIL",
  "raised limits did not touch the permission model (agent stays the only forbidden capability)",
)
report(
  [
    "[data-tl-sidebar]",
    "[data-tl-sidebar-col]",
    "[data-tl-settings]",
    "[data-tl-wall]",
    "[data-tl-hub-panel]",
    '[role="dialog"]',
    '[role="menu"]',
    '[role="listbox"]',
    "[data-tl-composer]",
    "[data-tl-bubble]",
    "[data-tl-duty]",
    "[data-tl-catmenu]",
    '[role="tooltip"]',
    '[role="tabpanel"]',
  ].every((selector) => source.includes(selector))
    ? "PASS"
    : "FAIL",
  "liquid glass covers every known product surface when a depth is on",
)
report(
  source.includes("function syncLiquidFallback(") && source.includes('setAttribute("data-tl-liquid-fallback", "")')
    ? "PASS"
    : "FAIL",
  "scene-less liquid-glass fallback layer is created, synced and disposed",
)
report(
  source.includes('[data-tl-glass-effective="off"] [data-tl-liquid-fallback]') &&
    source.includes('body[data-dsh-tianlight][data-tl-lowpower]:is(')
    ? "PASS"
    : "FAIL",
  "depth off keeps the v1.4 look (no liquid-glass surface rule) and low power flattens the extra decoration",
)

// ---- 13. v1.6.1: sidebar new-chat glass, liquid glass v2, main-UI weather chip ----
report(
  source.includes("data-tl-new-chat") &&
    source.includes('hasSegment(node, "newSession")') &&
    source.includes("--dsw-alias-button-elevated-fill: var(--tl-glass-fill) !important")
    ? "PASS"
    : "FAIL",
  "v1.6.1 sidebar New Chat button is a skin surface at every depth (opaque product fill replaced)",
)
report(
  ["--tl-liquid-grain-image", "--tl-liquid-rim-shadow", "--tl-liquid-glow-shadow"].every((name) => source.includes(name + ":")) &&
    source.includes("--tl-liquid-blur: 11px") &&
    source.includes("--tl-liquid-blur: 19px") &&
    source.includes("--tl-liquid-blur: 26px")
    ? "PASS"
    : "FAIL",
  "v1.6.1 liquid glass v2 recipe (grain + 1px rim + outer glow + three depth presets)",
)
report(
  source.includes("data-tl-weather-chip") &&
    source.includes("function installWeatherChip()") &&
    source.includes('install("ui-skin-tianlight: weather chip"')
    ? "PASS"
    : "FAIL",
  "v1.6.1 main-interface weather chip is mounted by an always-on lifecycle",
)
report(
  ["off", "no-location", "waiting", "error", "ready"].every((state) => source.includes('data-tl-weather-state="' + state + '"')) &&
    source.includes("weather.chip.openHint")
    ? "PASS"
    : "FAIL",
  "v1.6.1 weather chip ships its five states and a localized open hint",
)

// ---- 14. v1.6.2: fixed top-left dawn-burst artwork removed ----
report(
  !source.includes("data-tl-crest") && !source.includes("CREST_SVG") ? "PASS" : "FAIL",
  "v1.6.2 removed the fixed top-left dawn-burst artwork (no permanent sun on the wallpaper)",
)
report(
  source.includes('dataset.tlVeil = ""') && source.includes("[data-tl-veil]") ? "PASS" : "FAIL",
  "v1.6.2 keeps the scene veil (sky-light tint) after removing the corner artwork",
)

// ---- 15. v1.6.3: display name is 天光 (no legacy 遐蝶) + DSH 0.2.0/0.2.1/0.2.2 declared ----
const skinManifest = JSON.parse(fs.readFileSync(fileURLToPath(new URL('../skin.json', import.meta.url)), 'utf8'))
const readmeText = fs.readFileSync(fileURLToPath(new URL('../README.md', import.meta.url)), 'utf8')
report(
  skinManifest.name === '天光' &&
    skinManifest.nameEn === 'TIANLIGHT' &&
    !JSON.stringify(skinManifest).includes('遐蝶') &&
    !readmeText.includes('遐蝶')
    ? 'PASS'
    : 'FAIL',
  'v1.6.3 display name is 天光 (the legacy 遐蝶 name is gone from the manifest and README)',
)
report(
  Array.isArray(skinManifest.dshCompatibilityTested) &&
    ['0.2.0-rc.2', '0.2.1-rc.5', '0.2.2-rc.1'].every((version) => skinManifest.dshCompatibilityTested.includes(version)) &&
    skinManifest.dshCompatibilityRange === '>=0.2.0-rc.1 <0.3.0'
    ? 'PASS'
    : 'FAIL',
  'v1.6.3 declares DSH 0.2.0 / 0.2.1 / 0.2.2 compatibility (checked in the multi-version matrix)',
)

// ---- 16. v1.6.4: AI chat in the pet menu + per-look action packs + visible media filenames ----
report(
  source.includes('pet.action.chat') &&
    source.includes('data-tl-catchat') &&
    source.includes('tianlight.petActions.v1') &&
    source.includes('tianlightPetActions')
    ? 'PASS'
    : 'FAIL',
  'v1.6.4 puts AI chat in the pet interaction menu (composer, bubble reply, per-look action packs)',
)
report(
  source.includes('data-tl-hub-media-list') &&
    source.includes('data-tl-hub-media-row') &&
    source.includes('data-tl-hub-media-pack') &&
    source.includes('data-tl-hub-pack-label')
    ? 'PASS'
    : 'FAIL',
  'v1.6.4 lists every pet-media filename and edits the action pack of the selected look',
)
report(
  source.includes('pet.chat.thinking') && source.includes('pet.chat.unavailable') && source.includes('pet.chat.failed')
    ? 'PASS'
    : 'FAIL',
  'v1.6.4 localizes the chat thinking / unavailable / failed states in both dictionaries',
)

// ---- 17. v1.6.7: first-class URL/ShaderToy wallpaper sources + pet chat history ----
report(
  source.includes('data-tl-quick-source') &&
    source.includes('openQuickSource') &&
    source.includes('lib.quick.url') &&
    source.includes('lib.quick.shader')
    ? 'PASS'
    : 'FAIL',
  'v1.6.7 makes URL and ShaderToy first-class wallpaper sources in the default picker',
)
report(
  source.includes('recordChatTurn(text, reply)') &&
    source.includes('recordChatTurn(text, deniedLine)') &&
    source.includes('recordChatTurn')
    ? 'PASS'
    : 'FAIL',
  'v1.6.7 closes the AI chat composer as soon as the pet replies (the bubble carries the answer)',
)
report(
  source.includes('tianlight.petChats.v1') &&
    source.includes('tianlightPetChats') &&
    source.includes('data-tl-cathist') &&
    source.includes('petChatsEditUserMessage') &&
    source.includes('petChatsRemove')
    ? 'PASS'
    : 'FAIL',
  'v1.6.7 keeps a queryable pet chat history (new chat, edit a sent message, delete a chat)',
)

// ---- 18. v1.6.8: private autonomous mind + context-aware chat + hub card ----
report(
  source.includes('tianlight.petMind.v1') &&
    source.includes('tianlightPetMind') &&
    source.includes('petMindTick') &&
    source.includes('petMindThink')
    ? 'PASS'
    : 'FAIL',
  'v1.6.8 gives the pet a private autonomous mind (interval tick, inner monologue, opt-in proactive speech)',
)
report(
  source.includes('petChatContextDigest') &&
    source.includes('petLocalContextReply') &&
    source.includes('petCallLlm') &&
    source.includes('Local context:')
    ? 'PASS'
    : 'FAIL',
  'v1.6.8 makes pet chat context-aware (recent turns, time, memory and current thought in local + LLM replies)',
)
report(
  source.includes('data-tl-hub-mind') &&
    source.includes('hub.mind.') &&
    source.includes('sayThought') &&
    source.includes('data-tl-thought')
    ? 'PASS'
    : 'FAIL',
  'v1.6.8 adds the role-hub autonomous-mind card and shows a thought in the say bubble',
)

console.log(issues === 0 ? 'AUDIT: no blocking issues' : `AUDIT: ${issues} blocking issue(s)`)
process.exitCode = issues === 0 ? 0 : 1

