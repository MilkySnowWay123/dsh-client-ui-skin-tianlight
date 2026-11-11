// Static audit of the skin bundle: duplicate custom properties, declared-but-unused
// variables, listener/timer inventory, and lifecycle ordering in apply().
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  DSH_COMPAT_MUST_MATCH,
  DSH_COMPAT_MUST_NOT_MATCH,
  DSH_COMPAT_RANGE,
  LEGACY_BROAD_RANGE,
  OFFICIAL_PEER_PACKAGES,
  satisfies,
} from './compat.mjs'

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
report(source.includes("globalThis.tianlightPet") ? "PASS" : "FAIL", "pet brain exposes globalThis.tianlightPet (documented console surface)")
// R4A: medium/high grants are session-memory only and use a one-shot closure
// consent ticket; the pre-R4A contract persisted the bits and accepted the fixed
// string "user-explicit", which any page script could replay.
report(
  source.includes("const PET_SESSION_ONLY_CAPS") &&
    /for \(const cap of PET_SAFE_CAPS\)[\s\S]{0,200}?grants\[cap\] = source\[cap\]/.test(source) &&
    source.includes("sessionOnly: PET_SESSION_ONLY_CAPS.slice()") &&
    !source.includes('consent !== "user-explicit"')
    ? "PASS"
    : "FAIL",
  "medium/high grants are session-memory only (never loaded from localStorage; reload re-asks)",
)
report(
  source.includes("function petRequestUiConsent(") &&
    source.includes("petConsentTicketValid(consent, id)") &&
    source.includes("ticket !== petConsentTicket") &&
    source.includes("petConsentTicket = null;")
    ? "PASS"
    : "FAIL",
  "medium/high grants require a one-shot closure consent ticket from the role hub (no fixed string)",
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
  source.includes("invokeCapability") &&
    source.includes('reason: "adapter-missing"') &&
    source.includes('reason: "permission"') &&
    source.includes("petAudit(\"capability\"")
    ? "PASS"
    : "FAIL",
  "capability adapters are permission-gated and audited (grant -> paused -> adapter-missing)",
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
// R4A: the pre-R4A assertion was "exposes globalThis.tianlightPetAgent", i.e. the
// privileged connect/chat surface WAS the global (and its permission check read
// globalThis.tianlightPet.status). The contract is inverted now: the global is a
// frozen read-only status/audit surface, privileged methods live in the closure.
report(
  source.includes("const petAgentInternal = Object.freeze(") &&
    source.includes("__petAgentReadOnly: true") &&
    !source.includes("globalThis.tianlightPetAgent = api")
    ? "PASS"
    : "FAIL",
  "pet agent keeps connect/chat/list in the closure; the global is read-only status only",
)
report(
  (() => {
    const start = source.indexOf("//#region pet agent")
    const end = start >= 0 ? source.indexOf("//#endregion", start) : -1
    const region = start >= 0 && end > start ? source.slice(start, end) : ""
    const authAt = region.indexOf("function petAgentPermitted()")
    if (authAt < 0) return false
    const tail = region.slice(authAt)
    const close = tail.indexOf("\n\t\t}")
    const fnText = close > 0 ? tail.slice(0, close) : tail.slice(0, 300)
    return fnText.includes("petAgentChatAllowed()") && fnText.includes("globalThis.tianlightPet") === false
  })(),
  "agent authorization reads the brain closure, never a replaceable global",
)
report(
  /if \(!petAgentPermitted\(\)\) return \{ ok: false, reason: "permission", sessions: \[\] \}/.test(source)
    ? "PASS"
    : "FAIL",
  "listing DSH sessions also requires the agentChat grant",
)
report(
  /function hubPetAgent\(\) \{[\s\S]{0,700}?petAgentInternal/.test(source) &&
    /function hubPetBrain\(\) \{[\s\S]{0,700}?petBrainInternal/.test(source)
    ? "PASS"
    : "FAIL",
  "role hub calls the same-closure bridges instead of the replaceable globals",
)
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
  source.includes("petRecordExternal") && source.includes("tianlight.pet.agent.v1") ? "PASS" : "FAIL",
  "agent prompts are audited (same-closure ring) and budgeted in localStorage",
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
const packageManifest = JSON.parse(fs.readFileSync(fileURLToPath(new URL('../package.json', import.meta.url)), 'utf8'))
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
    skinManifest.dshCompatibilityRange === DSH_COMPAT_RANGE &&
    packageManifest.engines?.dsh === DSH_COMPAT_RANGE &&
    OFFICIAL_PEER_PACKAGES.every((name) => packageManifest.peerDependencies?.[name] === DSH_COMPAT_RANGE)
    ? 'PASS'
    : 'FAIL',
  'v1.6.3 declares DSH 0.2.0 / 0.2.1 / 0.2.2 compatibility (checked in the multi-version matrix)',
)
report(
  DSH_COMPAT_MUST_MATCH.every((version) => satisfies(version, DSH_COMPAT_RANGE)) &&
    DSH_COMPAT_MUST_NOT_MATCH.every((version) => satisfies(version, DSH_COMPAT_RANGE) === false) &&
    // regression evidence for the bug this guarded: the old broad range silently
    // excluded every 0.2.1-* / 0.2.2-* prerelease build under default semver.
    satisfies('0.2.1-rc.5', LEGACY_BROAD_RANGE) === false &&
    satisfies('0.3.0-rc.1', DSH_COMPAT_RANGE) === false
    ? 'PASS'
    : 'FAIL',
  'v2.0.1 DSH range has explicit prerelease branches (0.2.x incl. rc/alpha matches; 0.3.x blocked)',
)

// ---- v2.0.1: author default appearance (preset file <-> embedded client constant) ----
const defaultAppearanceFile = JSON.parse(fs.readFileSync(fileURLToPath(new URL('../presets/tianlight-default.json', import.meta.url)), 'utf8'))
const defaultAppearanceEmbedded = /const TL5_DEFAULT_APPEARANCE_JSON = String\.raw`([^`]+)`/.exec(source)
report(
  defaultAppearanceFile.format === 'tianlight-default-appearance' &&
    defaultAppearanceFile.version === 1 &&
    defaultAppearanceEmbedded !== null &&
    JSON.stringify(JSON.parse(defaultAppearanceEmbedded[1])) === JSON.stringify(defaultAppearanceFile.appearance) &&
    JSON.parse(defaultAppearanceFile.appearance['tianlight.wallpaper']).url === '/skin-tianlight/bg-4k.mp4' &&
    Object.prototype.hasOwnProperty.call(defaultAppearanceFile.appearance, 'tianlight.weather') === false &&
    source.includes('function tl5ApplyDefaultAppearance()') &&
    source.includes('localBefore.length === 0 && remoteHasValues === false') &&
    source.includes('data-tl-hub-appearance-reset')
    ? 'PASS'
    : 'FAIL',
  'v2.0.1 author default appearance: preset file == embedded constant, fresh-install only, hub restore present',
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
    // S1: manual chat still sends its bounded local digest; the payload label moved from
    // "Local context:" to "Bounded local context:" when the private mind got its own digest.
    source.includes('Bounded local context:')
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

// ---- 18b. v2.0.0: the companion reaches DSH's own LLM through a narrow host route ----
// The browser cannot call a model (`remote.llm` is read-only), so the host half owns
// one POST route with fixed server-side framing; the page only ever sees text/code.
const petChatSource = fs.readFileSync(fileURLToPath(new URL('../lib/pet-chat.js', import.meta.url)), 'utf8')
const petChatHostSource = fs.readFileSync(fileURLToPath(new URL('../lib/index.js', import.meta.url)), 'utf8')
report(
  petChatHostSource.includes("rest === '_pet-chat'") &&
    petChatHostSource.includes('petChat.handle(ctx, req, res)') &&
    petChatHostSource.includes('petLlm: computePetLlmCapability(ctx)') &&
    petChatHostSource.includes('isAllowedLocalHost(req.headers?.host)')
    ? 'PASS'
    : 'FAIL',
  'v2.0.0 host half exposes POST _pet-chat behind the loopback Host fence and reports capabilities.petLlm',
)
report(
  petChatSource.includes('PET_CHAT_MAX_BODY_BYTES = 16 * 1024') &&
    petChatSource.includes('PET_CHAT_MAX_CHARS = 4000') &&
    petChatSource.includes('PET_CHAT_MAX_TOKENS = 600') &&
    petChatSource.includes('PET_CHAT_TIMEOUT_MS = 20000') &&
    petChatSource.includes('PET_CHAT_SYSTEM_PROMPT') &&
    petChatSource.includes("maxTokens: PET_CHAT_MAX_TOKENS") &&
    /system:\s*PET_CHAT_SYSTEM_PROMPT/.test(petChatSource) &&
    petChatSource.includes('if (busy === true)') &&
    petChatSource.includes("res.on('close', onClose)") &&
    petChatSource.includes('controller.abort()')
    ? 'PASS'
    : 'FAIL',
  'v2.0.0 pet chat route is bounded (16KB/4000 chars/600 tokens/20s), one-at-a-time, abortable and pins the system prompt',
)
report(
  /messages:\s*\[\{\s*role:\s*'user'/.test(petChatSource) &&
    /^\s*tools:/m.test(petChatSource) === false &&
    /^\s*sessionId:/m.test(petChatSource) === false &&
    /^\s*purpose:/m.test(petChatSource) === false &&
    petChatSource.includes('in-use session') === false &&
    petChatSource.includes('apiKey') === false
    ? 'PASS'
    : 'FAIL',
  'v2.0.0 model request carries one user message only (no tools/session/purpose/credential access)',
)
report(
  (() => {
    const at = source.indexOf('PET_HOST_LLM_ROUTE')
    const region = at >= 0 ? source.slice(at, at + 24000) : ''
    return (
      at >= 0 &&
      region.includes('petHostLlmProbe') &&
      region.includes('petHostLlmChat') &&
      /id:\s*"dsh"/.test(region) &&
      region.includes('petLlmHintText') &&
      /capabilities\s*\??\.\s*petLlm/.test(region) &&
      region.includes('pet.chat.source.ai') &&
      region.includes('pet.chat.source.local')
    )
  })()
    ? 'PASS'
    : 'FAIL',
  'v2.0.0 browser half probes petLlm and auto-registers the built-in "dsh" adapter with AI/local labels + hints',
)
report(
  source.includes('data-tl-hub-llm-provider') &&
    source.includes('remote.llm') &&
    source.includes('listProviders') &&
    source.includes('hub.ai.llmHint') &&
    source.includes('AI 回复') &&
    source.includes('本地回复')
    ? 'PASS'
    : 'FAIL',
  'v2.0.0 role hub selects a provider through remote.llm.listProviders and labels AI vs local replies',
)
const petPermissionsDoc = fs.readFileSync(fileURLToPath(new URL('../docs/AI-PET-PERMISSIONS.md', import.meta.url)), 'utf8')
const petReleaseDoc = fs.readFileSync(fileURLToPath(new URL('../docs/RELEASE-2.0.0.md', import.meta.url)), 'utf8')
report(
  petPermissionsDoc.includes('_pet-chat') &&
    petPermissionsDoc.includes('重启') &&
    petPermissionsDoc.includes('AI 回复') &&
    petPermissionsDoc.includes('capabilities.petLlm') &&
    petReleaseDoc.includes('重启') &&
    petReleaseDoc.includes('_pet-chat')
    ? 'PASS'
    : 'FAIL',
  'v2.0.0 AI-PET-PERMISSIONS + release notes document the built-in DSH model channel and the one-time DSH restart',
)

// ---- 19. HOST_API route-contract handshake (not a release version) ----
const hostSource = fs.readFileSync(fileURLToPath(new URL('../lib/index.js', import.meta.url)), 'utf8')
const releaseSource = fs.readFileSync(fileURLToPath(new URL('./release.mjs', import.meta.url)), 'utf8')
const publicReleaseSource = fs.readFileSync(fileURLToPath(new URL('./public-release.mjs', import.meta.url)), 'utf8')
const clientApi = source.match(/const HOST_API = "([^"]+)"/)
const hostApi = hostSource.match(/const HOST_API = '([^']+)'/)
report(
  clientApi !== null && hostApi !== null && clientApi[1] === hostApi[1] ? 'PASS' : 'FAIL',
  'HOST_API route-contract marker is identical in lib/index.js and lib/client.js',
)
report(
  source.includes('/_engines?api=" + encodeURIComponent(HOST_API)') ? 'PASS' : 'FAIL',
  'the panel probes _engines with api=HOST_API (a release build number must not gate the handshake)',
)
report(
  /hostStale\s*=\s*engine\s*!==\s*null\s*&&\s*engine\.stale\s*===\s*true/.test(source) ? 'PASS' : 'FAIL',
  'the panel derives hostStale only from the host payload (a failed probe is never "host too old")',
)
report(
  /catch\(\(\) => \{[\s\S]{0,400}?unreachable: true/.test(source) &&
    /hostUnreachable\s*=\s*engine\s*!==\s*null\s*&&\s*engine\.unreachable\s*===\s*true/.test(source)
    ? 'PASS'
    : 'FAIL',
  'a failed engine probe is reported as unreachable (network copy), not as a stale host',
)
// R8 (REV-R1 M4): assert the release tools cannot rewrite/assign the handshake
// marker directly, instead of relying on the fragile "filename string absent" check.
// (HOST_API is a hand-edited route contract; release scripts only patch versions.)
report(
  /HOST_API\s*[:=]/.test(releaseSource) === false &&
    /HOST_API\s*[:=]/.test(publicReleaseSource) === false &&
    /replace(?:All)?\([^)]*HOST_API/.test(releaseSource) === false &&
    /replace(?:All)?\([^)]*HOST_API/.test(publicReleaseSource) === false &&
    /HOST_API[^\n]*\.replace/.test(releaseSource) === false &&
    /HOST_API[^\n]*\.replace/.test(publicReleaseSource) === false &&
    releaseSource.includes('10-constants.js') === false &&
    publicReleaseSource.includes('10-constants.js') === false
    ? 'PASS'
    : 'FAIL',
  'release tooling never assigns/rewrites the HOST_API handshake (hand-edited route contract only)',
)

// ---- 20. R2 energy pass: static scene veil, throttled bridge, unmounted panel ----
// A) The scene layer used to carry a full-viewport live backdrop-filter (and a 22s
// infinite sheen animation at the "real" depth): it re-composited on every decoded
// wallpaper frame. The static surface stack must stay, the live filter / animation
// and its keyframes must not come back. Panel-level glass is bounded and stays.
report(
  !source.includes("@keyframes tl-liquid-sheen") && !source.includes("animation: tl-liquid-sheen") ? "PASS" : "FAIL",
  "the 22s full-viewport scene sheen animation is gone (it repainted forever)",
)
report(
  /\[data-tl-scene\]::after[\s\S]{0,400}?backdrop-filter/.test(source) ? "FAIL" : "PASS",
  "the scene layer no longer carries a live backdrop-filter over the whole viewport",
)
report(
  /\[data-tl-scene\]::after \{[\s\S]{0,300}?background-image: var\(--tl-liquid-surface\)/.test(source) ? "PASS" : "FAIL",
  "the scene layer still paints the static liquid-glass grain/colour veil",
)
report(
  /\[data-tl-composer\]::before[\s\S]{0,500}?backdrop-filter/.test(source) &&
    /\[data-tl-liquid-fallback\][\s\S]{0,500}?backdrop-filter/.test(source)
    ? "PASS"
    : "FAIL",
  "panel glass and the scene-less fallback keep their bounded live blur (depth semantics unchanged)",
)
// B) The selector bridge must no longer run a full document scan from the mutation
// rAF: added nodes are stamped incrementally and the full pass is a >=500ms fallback.
report(
  source.includes("const FULL_SCAN_INTERVAL_MS = 500") &&
    source.includes("Math.max(0, FULL_SCAN_INTERVAL_MS - (Date.now() - lastFullAt))")
    ? "PASS"
    : "FAIL",
  "the bridge's full document pass is throttled to >= 500ms",
)
report(
  source.includes("for (const node of record.addedNodes)") &&
    source.includes("for (const node of root.querySelectorAll(SURFACE_SELECTOR))")
    ? "PASS"
    : "FAIL",
  "the bridge stamps only added subtrees (bounded query, never the whole document)",
)
report(
  /requestAnimationFrame\(\(\) => \{[\s\S]{0,300}?stampAll\(/.test(source) ? "FAIL" : "PASS",
  "no animation-frame callback runs the full document scan (the per-frame cost is gone)",
)
report(
  /observer\.disconnect\(\);[\s\S]{0,400}?globalThis\.cancelAnimationFrame\(frame\)[\s\S]{0,160}?globalThis\.clearTimeout\(fullTimer\)/.test(source) &&
    source.includes("if (node.isConnected === false) stamped.delete(node)")
    ? "PASS"
    : "FAIL",
  "bridge dispose stops the observer/timer/frame, and detached nodes are swept by isConnected",
)
// C) The closed wallpaper panel must unmount its React tree: hiding it kept the audio
// (100ms), engine (2s) and context (2s) partition timers plus fps/settings
// subscriptions alive. The same root is reused on the next open (no second createRoot).
report(
  source.includes("const unmountPanel = () =>") &&
    /root\.render\(null\)/.test(source) &&
    /audioController\.stop\(TL_T\("lib\.audio\.stoppedOnClose"\)\);[\s\S]{0,300}?unmountPanel\(\);/.test(source)
    ? "PASS"
    : "FAIL",
  "closing the wallpaper panel unmounts the React tree (partition timers/subscriptions stop)",
)
// The font panel's palette used to be re-sampled with getImageData every 4s; it now
// adopts once plus one delayed retry, like the wallpaper panel.
report(
  !source.includes("setInterval(adoptWallpaperPalette") &&
    /const startChroma = \(\) => \{[\s\S]{0,500}?globalThis\.setTimeout\(\(\) => \{[\s\S]{0,200}?adoptWallpaperPalette\(\);/.test(source) &&
    /const stopChroma = \(\) => \{[\s\S]{0,240}?globalThis\.clearTimeout\(chromaTimer\);/.test(source)
    ? "PASS"
    : "FAIL",
  "the font panel samples its wallpaper palette once (one delayed retry), not every 4s",
)

// ---- 21. R3 settings sync: conflict detection, data isolation, quiet weather ----
const hostStoreSource = fs.readFileSync(fileURLToPath(new URL('../lib/settings-store.js', import.meta.url)), 'utf8')
const bundleSource = fs.readFileSync(fileURLToPath(new URL('../lib/bundle.js', import.meta.url)), 'utf8')
const pickKeys = (block) => [...block.matchAll(/'([^']+)'|"([^"]+)"/g)].map((match) => match[1] ?? match[2]).filter((key) => key.startsWith('tianlight.'))
const clientDataKeys = /const TL5_DATA_KEYS = \[([\s\S]*?)\];/.exec(source)
const hostDataKeys = /export const DATA_SETTING_KEYS = Object\.freeze\(\[([\s\S]*?)\]\)/.exec(hostStoreSource)
const clientKeys = clientDataKeys === null ? [] : pickKeys(clientDataKeys[1])
const hostKeys = hostDataKeys === null ? [] : pickKeys(hostDataKeys[1])
report(
  clientKeys.length > 0 && clientKeys.length === hostKeys.length && clientKeys.every((key) => hostKeys.includes(key)) ? 'PASS' : 'FAIL',
  'the host and client data-key exclusion lists agree (' + clientKeys.length + ' keys)',
)
for (const key of ['tianlight.petChats.v1', 'tianlight.petMind.v1', 'tianlight.life.v1', 'tianlight.pet.agent.v1']) {
  report(clientKeys.includes(key) ? 'PASS' : 'FAIL', 'per-browser data key is excluded from sync/export: ' + key)
}
report(
  source.includes('if (tl5DataKey(key)) return false;') ? 'PASS' : 'FAIL',
  'the client mirror treats the data keys as non-syncable (no PUT, no tombstone, no BC echo)',
)
report(
  hostStoreSource.includes('function stripDataSettings(') && bundleSource.includes('stripDataSettings(') && hostStoreSource.includes('isDataSettingKey(key)')
    ? 'PASS'
    : 'FAIL',
  'host and bundle export/import strip per-browser data keys (old files and old bundles included)',
)
// PUT protocol v0.6.1: optional expectedRevision -> 409 + authoritative state; the
// success reply now carries the merged settings map (the old revision-only reply is
// still tolerated by the client's compatibility branch).
report(
  hostStoreSource.includes('expectedRevision !== null') && hostStoreSource.includes('status: 409') && /conflict: true,/.test(hostStoreSource)
    ? 'PASS'
    : 'FAIL',
  'host PUT implements optional expectedRevision compare-and-swap with a 409 reply',
)
report(
  /sendJson\(res, 200, \{ ok: true, revision: result\.revision, updatedAt: result\.updatedAt, settings: result\.settings \}\)/.test(hostStoreSource)
    ? 'PASS'
    : 'FAIL',
  'host PUT replies with the merged authoritative settings map (not just a revision)',
)
report(
  source.includes('expectedRevision: settingsState.hostRevision') &&
    source.includes('function settingsAdoptPutResponse(') &&
    /put\.status === 409/.test(source) &&
    source.includes('settingsAdoptPutResponse(put.data)')
    ? 'PASS'
    : 'FAIL',
  'client sends expectedRevision, adopts the PUT reply map, and merges on 409 before retrying',
)
report(
  source.includes('if (tl5IsPlainObject(data.settings) === false) return null;')
    ? 'PASS'
    : 'FAIL',
  'client keeps an old-host compatibility branch (revision-only PUT reply has no settings map)',
)
// v0.5.2 data-safety invariants must survive the conflict work: subset adoption
// keeps local-only keys, explicit null tombstones still delete, backup/meta keys
// still bypass the mirror, and the size caps are unchanged.
report(
  /for \(const key of Object\.keys\(remoteMap\)\) \{[\s\S]{0,500}?changedKeys\.push\(key\)/.test(source) &&
    source.includes('if (value === null) tl5RawRemove(storage, key);')
    ? 'PASS'
    : 'FAIL',
  'v0.5.2 adoption invariant kept: host keys only, explicit null tombstones still delete',
)
report(
  source.includes('const TL5_HOST_BACKUP_KEY = "tianlight.backup.host";') &&
    source.includes('const TL5_META_PREFIXES = ["tianlight.backup.", "tianlight.sync."];') &&
    hostStoreSource.includes('MAX_SETTINGS_BYTES = 256 * 1024') &&
    hostStoreSource.includes('MAX_SETTING_KEYS = 64') &&
    source.includes('new BroadcastChannel(TL5_BC_NAME)')
    ? 'PASS'
    : 'FAIL',
  'v0.5.2 limits preserved: backup/meta keys exempt, 256 KB / 64 keys, multi-window channel',
)
// C) Weather: no forced request on visibility, and an unchanged automatic fetch
// must not rewrite the synced snapshot (and so must not bump the settings revision).
report(
  source.includes('let lastWeatherFetchAt = 0;') &&
    source.includes('const weatherValuesEqual = (left, right) =>') &&
    source.includes('fetchWeather("visible")') &&
    !source.includes('reconcileWeather(true)')
    ? 'PASS'
    : 'FAIL',
  'weather only refreshes on visibility when stale, and never rewrites an unchanged snapshot',
)

// ---- 22. R4A pet-security closure: no privilege through replaceable globals ----
// The attack model is a same-page script (another plugin, console paste, malicious
// import) that replaces globals. Every assertion below fails if privilege can be
// reached again through one of those replacements.
const readOnlyGlobal = /readOnlyApi = Object\.freeze\(\{([\s\S]*?)\}\)/.exec(source)
const readOnlyBody = readOnlyGlobal === null ? '' : readOnlyGlobal[1]
report(
  readOnlyBody !== '' && /(?:^|[\s,{])(?:connect|chat|refreshSessions|openSession|disconnect)\s*:/.test(readOnlyBody) === false
    ? 'PASS'
    : 'FAIL',
  'the pet-agent global carries no connect/chat/list methods (read-only status surface only)',
)
report(
  source.includes('petBrainInternal') && /brain = petBrainInternal/.test(source)
    ? 'PASS'
    : 'FAIL',
  'companion chat and the role hub read the brain through the same-closure bridge',
)
report(
  source.includes('function petScrubPersistedPermissions(') &&
    /for \(const cap of PET_SAFE_CAPS\) persisted\[cap\] = petGrants\[cap\] === true;/.test(source) &&
    source.includes('sessionOnly: PET_SESSION_ONLY_CAPS.slice()')
    ? 'PASS'
    : 'FAIL',
  'only safe capability bits are persisted; legacy medium/high bits are scrubbed on install',
)
report(
  source.includes('"hub.perm.sessionOnly"') &&
    source.includes('"hub.perm.stateNoAdapter"') &&
    source.includes('"hub.perm.stateManual"') &&
    source.includes('granted-no-adapter') &&
    source.includes('row.adapter !== undefined')
    ? 'PASS'
    : 'FAIL',
  'the permission board labels adapter-less grants honestly (no adapter / manual only / session-only)',
)
report(
  bundleSource.includes('BUNDLE_SECRET_SETTINGS') &&
    bundleSource.includes("'tianlight.pet.permissions.v1'") &&
    bundleSource.includes('stripBundleSecretSettings(map)') &&
    bundleSource.includes('stripBundleStateSecrets(stripDataSettings(')
    ? 'PASS'
    : 'FAIL',
  'bundles strip the capability document on export AND import (no permission smuggling)',
)
const permissionsDoc = fs.readFileSync(fileURLToPath(new URL('../docs/AI-PET-PERMISSIONS.md', import.meta.url)), 'utf8')
report(
  permissionsDoc.includes('页面会话内存') &&
    permissionsDoc.includes('无适配器') &&
    permissionsDoc.includes('一次性') &&
    permissionsDoc.includes('agentChat') &&
    permissionsDoc.includes('重载')
    ? 'PASS'
    : 'FAIL',
  'docs/AI-PET-PERMISSIONS.md documents session-only grants, one-shot consent and honest adapter state',
)

// ---- 23. R3-B (REV-R3 B1): 409 merges must not roll back the in-flight batch ----
// The knownRemote snapshot is the "did the host really change this key" oracle; the
// in-flight batch keys are protected from adoption and only lose to the host when the
// host value actually moved since we last saw it (data-safety invariant §3.3).
report(
  source.includes('knownRemote: null,') &&
    source.includes('function settingsSetKnownRemote(') &&
    source.includes('settingsSetKnownRemote(remoteMap);') &&
    (source.match(/settingsSetKnownRemote\(remoteMap\);/g) ?? []).length >= 2
    ? 'PASS'
    : 'FAIL',
  'the client keeps the last known host snapshot and refreshes it on GET and PUT replies',
)
report(
  source.includes('options.protectKeys instanceof Set') &&
    source.includes('settingsAdoptPutResponse(put.data, { protectKeys: pushKeys })') &&
    source.includes('settingsAdoptPutResponse(put.data, { protectKeys: new Set(batch.keys()) })')
    ? 'PASS'
    : 'FAIL',
  'both 409 paths protect the in-flight/diff keys from the reply snapshot',
)
report(
  source.includes('function settingsResolveConflictBatch(') &&
    source.includes('if (hostValue === knownValue) {') &&
    source.includes('settingsResolveConflictBatch(batchEntries, adopted, knownBefore)')
    ? 'PASS'
    : 'FAIL',
  'a 409 keeps our edit when the host value is unchanged, and lets the host win on a real same-key change',
)
report(
  source.includes('if (revision > settingsState.hostRevision) settingsState.hostRevision = revision;') &&
    source.includes('if (data.host === true && revision > settingsState.hostRevision) settingsState.hostRevision = revision;') &&
    (source.match(/mirror\.conflicts = 0;/g) ?? []).length >= 2
    ? 'PASS'
    : 'FAIL',
  'REV-R3 MINORs: storage-event revision raises hostRevision; a new batch resets the conflict retry budget',
)

// ---- 24. R4B host hardening: repkgPath, Host allowlist, async I/O, transcodes ----
const weHostSource = fs.readFileSync(fileURLToPath(new URL('../lib/we-wallpaper/host.mjs', import.meta.url)), 'utf8')
const transcodeSource = fs.readFileSync(fileURLToPath(new URL('../lib/transcode.js', import.meta.url)), 'utf8')
report(
  hostSource.includes('async function buildEngineStatus(') &&
    hostSource.includes('await ffmpegStatus()') &&
    hostSource.includes("isAllowedLocalHost(req.headers?.host)") &&
    hostSource.includes('isAllowedLocalHost,') &&
    /function isAllowedLocalHost\(/.test(weHostSource) &&
    weHostSource.includes('name === "localhost"') &&
    weHostSource.includes('name === "127.0.0.1"') &&
    weHostSource.includes('name === "[::1]"')
    ? 'PASS'
    : 'FAIL',
  'R4B: both same-origin fences enforce the loopback Host allowlist; engine status probes ffmpeg asynchronously',
)
report(
  weHostSource.includes('const REPKG_ENV_KEYS = ["TIANLIGHT_REPKG_PATH", "REPKG_PATH"]') &&
    weHostSource.includes('function normalizeRepkgPath(') &&
    weHostSource.includes('if (key === "repkgPath" || key === "animatedPreviews") continue;') &&
    weHostSource.includes('repkgPath: normalizeRepkgPath(record.repkgPath)') &&
    // R8b shape change: the validator now classifies the rejection reason instead of
    // returning a bare "". The security rule (UNC rejected) is unchanged.
    weHostSource.includes('return { path: "", reason: "network-path" }') &&
    weHostSource.includes('REPKG_NAME_RE.test(basename(trimmed))')
    ? 'PASS'
    : 'FAIL',
  'R4B: repkgPath is env/config-only (HTTP writes ignored); UNC/dir/non-RePKG names are rejected',
)
const repkgAt = weHostSource.indexOf('async function runRePkgExtractor(')
const repkgRegion = repkgAt >= 0 ? weHostSource.slice(repkgAt, repkgAt + 6000) : ''
const pkgPreviewAt = weHostSource.indexOf('async function resolvePkgPreviewDetailed(')
const pkgPreviewRegion = pkgPreviewAt >= 0 ? weHostSource.slice(pkgPreviewAt, pkgPreviewAt + 8000) : ''
report(
  repkgRegion.includes('runRePkgProcess(') &&
    repkgRegion.includes('spawnSync') === false &&
    pkgPreviewRegion.includes('await readFile(pkgPath)') &&
    pkgPreviewRegion.includes('readFileSync(pkgPath)') === false &&
    pkgPreviewRegion.includes('await runRePkgExtractor(') &&
    transcodeSource.includes('function probeFfmpeg(') &&
    transcodeSource.includes("spawn(command, ['-version']") &&
    transcodeSource.includes('spawnSync(') === false
    ? 'PASS'
    : 'FAIL',
  'R4B: scene packages, RePKG and the ffmpeg probe run asynchronously (no readFileSync(pkgPath)/spawnSync in those paths)',
)
report(
  transcodeSource.includes('export const TRANSCODE_MAX_CONCURRENT = 2') &&
    transcodeSource.includes('activeTranscodes') &&
    transcodeSource.includes('new AbortController()') &&
    transcodeSource.includes("res.once?.('close', onClose)") &&
    transcodeSource.includes('signal: controller.signal') &&
    transcodeSource.includes('controller.signal.aborted === true')
    ? 'PASS'
    : 'FAIL',
  'R4B: transcodes are capped, aborted when the client disconnects, and the temp file is dropped',
)
report(
  transcodeSource.includes('export function resolveTranscodeSourceInfo(') &&
    transcodeSource.includes('kind + \'-\'') &&
    transcodeSource.includes('derivedOutputName(source, sourceInfo.kind)') &&
    /derivedOutputName\('sky\.mp4', 'assets'\)[\s\S]{0,80}?assets-sky\.h264\.mp4/.test(fs.readFileSync(fileURLToPath(new URL('./test.mjs', import.meta.url)), 'utf8'))
    ? 'PASS'
    : 'FAIL',
  'R4B: derived output keys include the source directory (assets/x.mp4 != uploads/x.mp4)',
)

// ---- 25. R5 keyboard & unified overlay stack ----
// Esc/Tab ownership is one registry in 11-platform; every panel registers there,
// no module-level capture handler consumes Esc anymore, and only modal layers trap
// Tab. The old independent handlers must stay gone (their absence is the regression
// guard for "Esc closed the wrong layer").
const overlayIds = ['wallpaper-panel', 'we-library-overlay', 'role-hub', 'font-panel', 'pet-chat', 'pet-history']
report(
  source.includes('function tl5OverlayRegister(') &&
    source.includes('function tl5OverlayOnKeyDown(') &&
    source.includes('window.addEventListener("keydown", tl5OverlayOnKeyDown, true)') &&
    source.includes('window.removeEventListener("keydown", tl5OverlayOnKeyDown, true)') &&
    overlayIds.every((id) => source.includes('id: "' + id + '"')) &&
    source.includes('top.onEscape')
    ? 'PASS'
    : 'FAIL',
  'one shared overlay stack owns Esc (top layer only) and exists in 11-platform',
)
report(
  source.includes('window.addEventListener("keydown", onKey, true)') === false &&
    source.includes('win.addEventListener("keydown", onKeyDown)') === false &&
    source.includes('if (overlayOpen === false) return;') === false &&
    source.includes('if (openState !== true) return;') === false &&
    source.includes('document.addEventListener("keydown", onDocumentKeyDown, true)') === false &&
    source.includes('event.altKey && event.ctrlKey === false') === false
    ? 'PASS'
    : 'FAIL',
  'no module keeps its own capture Esc / Alt+W handler (they used to swallow or double-close)',
)
const a11yStart = source.indexOf('//#region accessibility')
const a11yEnd = a11yStart >= 0 ? source.indexOf('//#endregion', a11yStart) : -1
const a11yRegion = a11yStart >= 0 && a11yEnd > a11yStart ? source.slice(a11yStart, a11yEnd) : ''
report(
  a11yRegion.includes('event.key === "Escape"') === false &&
    a11yRegion.includes('event.key !== "Tab"') === false &&
    a11yRegion.includes('stopPropagation') === false &&
    a11yRegion.includes('if (host === wallHost) host.setAttribute("aria-modal", "true")') &&
    // R8b: the focus handoff is now conditional on no higher modal being open.
    a11yRegion.includes('focusFirst(host, 0)') &&
    a11yRegion.includes('tl5OverlayModalAbove("wallpaper-panel")')
    ? 'PASS'
    : 'FAIL',
  'a11y no longer traps Esc/Tab; the non-modal typography float gets no aria-modal and no forced focus',
)
report(
  source.includes('id: "wallpaper-panel"') &&
    source.includes('keys: "alt+w"') &&
    source.includes('event.repeat === true') &&
    // R8b: real target via composedPath + any contenteditable/role=textbox counts.
    source.includes('event.composedPath') &&
    source.includes('isContentEditable === true') &&
    source.includes('[role="textbox"]') &&
    source.includes('modal: true') &&
    source.includes('modal: false')
    ? 'PASS'
    : 'FAIL',
  'Alt+W lives in the TL5_SHORTCUTS registry and ignores key repeat / editable targets',
)
report(
  source.includes('hub.media.pack.resetConfirm') &&
    source.includes('hub.mind.clearConfirm') &&
    source.includes('lib.bundleImportConfirmAction') &&
    source.includes('if (packResetPending !== true)') &&
    source.includes('if (mindClearPending !== true)') &&
    source.includes('if (importArmed === true)')
    ? 'PASS'
    : 'FAIL',
  'destructive actions (action-pack reset, clear thoughts, bundle import) reuse a click-twice confirmation',
)
report(
  source.includes('tianlight.hub.draft.v1') &&
    source.includes('const saveHubDraft = () => {') &&
    source.includes('const restoreHubDraft = () => {') &&
    /const close = \(\) => \{[\s\S]{0,400}?saveHubDraft\(\);/.test(source) &&
    source.includes('hub.draft.restored') &&
    source.includes('lifeDraftActive')
    ? 'PASS'
    : 'FAIL',
  'closing the role hub (Esc included) persists unfinished chat / rhythm edits and restores them on reopen',
)

// ---- 26. R6 wallpaper switching correctness (4K release / stale callbacks / fps) ----
report(
  /const releaseVideo = \(\) => \{[\s\S]{0,900}?video\.removeAttribute\("src"\);[\s\S]{0,200}?video\.load\(\);/.test(source) &&
    (source.match(/releaseVideo\(\);/g) ?? []).length >= 4 &&
    // S4: the two panel palette copies merged into one shared sampler, so three
    // independent hidden-video guards remain (legibility, zones mirror, shared palette).
    (source.match(/sceneVideo\.hidden === false/g) ?? []).length >= 3 &&
    (source.match(/sceneVideo\.currentSrc !== ""/g) ?? []).length >= 3 &&
    (source.match(/tl5SampleWallpaperPalette\(\)/g) ?? []).length >= 2
    ? 'PASS'
    : 'FAIL',
  'R6 A: leaving the video channel frees the decoder; all palette/mirror samplers skip a hidden or released video',
)
report(
  source.includes('let sourceGeneration = 0;') &&
    (source.match(/if \(generation !== sourceGeneration\) return;/g) ?? []).length >= 2 &&
    (source.match(/failGeneration === sourceGeneration/g) ?? []).length >= 2 &&
    (source.match(/fallbackGeneration === sourceGeneration/g) ?? []).length >= 2
    ? 'PASS'
    : 'FAIL',
  'R6 B: late image/scene/web/shader callbacks are generation-guarded against a newer selection',
)
report(
  source.includes('getVideoPlaybackQuality') &&
    source.includes('ADAPTIVE_VIDEO_DROP_RATIO') &&
    source.includes('Math.round(presented / rate)') &&
    source.includes('if (typeof sample.perfLow === "boolean") return sample.perfLow === true;') &&
    source.includes('scene.dataset.tlPerf = "low"') &&
    source.includes('"scene-perf"') &&
    source.includes('fx.frozenScenePerf')
    ? 'PASS'
    : 'FAIL',
  'R6 C: video fps is normalized/diagnostic; only dropped-frame evidence may freeze or downgrade',
)
report(
  source.includes('function supportsIndividualScale()') &&
    source.includes('scene.style.setProperty("--tl-flip"') &&
    source.includes('scale: var(--tl-flip, 1 1);') &&
    source.includes('video.style.removeProperty("transform")')
    ? 'PASS'
    : 'FAIL',
  'R6 D: the mirror uses the independent scale property so transition transforms compose with it',
)

// ---- 27. R7: verification harnesses are environment-independent ----
const verifySource = fs.readFileSync(fileURLToPath(new URL('./verify.mjs', import.meta.url)), 'utf8')
const testSource = fs.readFileSync(fileURLToPath(new URL('./test.mjs', import.meta.url)), 'utf8')
const fixtureSource = fs.readFileSync(fileURLToPath(new URL('./media-fixtures.mjs', import.meta.url)), 'utf8')
report(
  verifySource.includes('process.env.FFMPEG_PATH = FORCED_FFMPEG') &&
    verifySource.includes('const ORIGINAL_FFMPEG_PATH = process.env.FFMPEG_PATH') &&
    verifySource.includes('R7: verify pins ffmpeg to a guaranteed-absent path') &&
    verifySource.includes("assert.equal(value.ffmpeg, false)")
    ? 'PASS'
    : 'FAIL',
  'R7: verify pins ffmpeg to a guaranteed-absent path before exercising the host (deterministic on any machine)',
)
report(
  verifySource.includes('function snapshotTree()') &&
    verifySource.includes('const TREE_BEFORE = snapshotTree()') &&
    verifySource.includes('const TREE_AFTER = snapshotTree()') &&
    verifySource.includes('verify did not write the plugin working tree') &&
    verifySource.includes("'assets', 'derived', 'bg-4k.h264.mp4'")
    ? 'PASS'
    : 'FAIL',
  'R7: verify snapshots the plugin tree and asserts no transcode derivative was written',
)
report(
  fixtureSource.includes('export function makeMediaFixture(') &&
    fixtureSource.includes('mkdtempSync(') &&
    fixtureSource.includes('TINY_MP4') &&
    fixtureSource.includes('TINY_PNG') &&
    testSource.includes("from './media-fixtures.mjs'") &&
    // assembled at runtime so this guard's own accounting does not match itself
    testSource.includes('items.length > 0, ' + "'existing sources still list'") === false &&
    testSource.includes('items.some((item) => item.source' + " !== 'we')") === false
    ? 'PASS'
    : 'FAIL',
  'R7: test.mjs generates temp media fixtures and has no repo-asset presence assertions',
)

// ---- 28. R8 (REV-R4A/R3B/R2/R1 follow-ups): security + minor hardening ----
// A1: the published diagnostics object must not expose the live cordis ctx/fiber;
// teardown stays closure-owned with a legacy (pre-R8 ctx-carrying) compatibility path.
const instanceAt = source.indexOf('instance = {')
const instanceEnd = instanceAt < 0 ? -1 : source.indexOf('globalThis[INSTANCE_REGISTRY_KEY] = instance;', instanceAt)
const instanceLiteral = instanceAt >= 0 && instanceEnd > instanceAt ? source.slice(instanceAt, instanceEnd) : ''
report(
  instanceLiteral !== '' &&
    /(?:^|\n)\s*ctx\s*,/.test(instanceLiteral) === false &&
    /\bctx:\s*ctx\b/.test(instanceLiteral) === false &&
    /__dshTianlightInstance\s*\.\s*ctx\b/.test(source) === false &&
    source.includes('const ownerCtx = ctx;') &&
    source.includes('teardownOwnedInstance') &&
    source.includes('previous.dispose()')
    ? 'PASS'
    : 'FAIL',
  'A1: __dshTianlightInstance publishes no live ctx/fiber; teardown is closure-owned and legacy-instance compatible',
)
// A2: recordExternal is internal-only (agent bridge uses petBrainInternal); the public
// brain API keeps the read-only audit() surface only.
const brainApiAt = source.indexOf('globalThis.tianlightPet = api')
const brainApiStart = brainApiAt < 0 ? -1 : source.lastIndexOf('api = {', brainApiAt)
const publishedBrainApiLiteral = brainApiStart < 0 || brainApiAt < brainApiStart ? '' : source.slice(brainApiStart, brainApiAt)
report(
  publishedBrainApiLiteral !== '' &&
    /recordExternal\s*:/.test(publishedBrainApiLiteral) === false &&
    source.includes('recordExternal: (entry) => petRecordExternal(entry),') &&
    /petAgentMirrorAudit[\s\S]{0,600}?petRecordExternal\(/.test(source)
    ? 'PASS'
    : 'FAIL',
  'A2: recordExternal stays internal (petBrainInternal) — the public tianlightPet global exposes no audit-write path',
)
// A3: opening the connected session needs the same session-only grant as the rest.
report(
  (() => {
    const at = source.indexOf('function petAgentOpenSession()')
    if (at < 0) return false
    const body = source.slice(at, at + 320)
    return body.includes('if (!petAgentPermitted())') && body.includes('reason: "permission"')
  })()
    ? 'PASS'
    : 'FAIL',
  'A3: petAgentOpenSession requires the agentChat grant (same gate as connect/chat/list)',
)
// A4: script-dispatched (untrusted) events do not count as user consent at the
// role hub's permission/Agent entries.
report(
  source.includes('function isSyntheticUserEvent(') &&
    source.includes('event === undefined || event === null || event.isTrusted === false') === false &&
    source.includes('isSyntheticUserEvent(event)') &&
    /onLlmClick = async \(event\)/.test(source) &&
    /onAgentPermClick = async \(event\)/.test(source) &&
    /onAgentConnect = async \(event\)/.test(source) &&
    /sendChat = async \(event\)/.test(source)
    ? 'PASS'
    : 'FAIL',
  'A4: synthetic clicks are ignored on role-hub consent / Agent connect / send entry points',
)
// A5 (post-2.0.0): ctx.inject() returns a cordis Fiber in current hosts; teardown must
// dispose both Fiber (.dispose()) and legacy function shapes. The bare cleanup() call
// produced "pet-agent:dispose TypeError: cleanup is not a function" and leaked the
// injected remote.session / uiWorkspace scopes on every feature teardown.
report(
  (() => {
    const petAgentAt = source.indexOf('function installPetAgent(')
    if (petAgentAt < 0) return false
    const at = source.indexOf('for (const cleanup of cleanups.splice(0).reverse())', petAgentAt)
    if (at < 0) return false
    const body = source.slice(at, at + 1200)
    return (
      body.includes('typeof cleanup === "function"') &&
      body.includes('typeof cleanup.dispose === "function"') &&
      body.includes('pet-agent:dispose')
    )
  })()
    ? 'PASS'
    : 'FAIL',
  'A5: pet-agent teardown disposes both function-shaped and Fiber-shaped ctx.inject results',
)
// B1: a same-key edit made while the request is in flight stays queued and retries.
report(
  /for \(const key of winners\) \{[\s\S]{0,160}?settingsMirror\.queue\.has\(key\)\) continue;/.test(source)
    ? 'PASS'
    : 'FAIL',
  'B1: REV-R3B MINOR — host-wins adoption skips keys with a newer queued local edit (last-local-write)',
)
// B2: hidden tabs do not accumulate per-node work; coming back runs one merged pass.
report(
  source.includes('document.hidden === true') &&
    source.includes('document.addEventListener("visibilitychange", onVisibilityChange)') &&
    source.includes('document.removeEventListener("visibilitychange", onVisibilityChange)') &&
    source.includes('pendingRoots.length > 2000') &&
    /if \(hidden === true\) \{[\s\S]{0,120}?sweepPending = true;/.test(source)
    ? 'PASS'
    : 'FAIL',
  'B2: background tabs cap pending work; visibilitychange triggers one merged flush/full scan',
)
// B3: hostIdentity.api (reported by _engines) is actually consumed by the feedback label.
report(
  /if \(hostIdentity\.build !== ""\) return hostIdentity\.build;[\s\S]{0,400}?hostIdentity\.api !== ""\) return "api " \+ hostIdentity\.api;/.test(
    source,
  )
    ? 'PASS'
    : 'FAIL',
  'B3: hubVersionString reads the reported hostIdentity.api before falling back to the compiled HOST_API',
)

// ---- 29. R8b (REV-R4B/R5/R6 follow-ups): robustness + layering + probe hardening ----
// R4B 1: the disconnect listener must be installed BEFORE the ffmpeg probe await, and
// the route must bail out when the socket died while probing.
const closeListenerAt = transcodeSource.indexOf("res.once?.('close', onClose)")
const probeAwaitAt = transcodeSource.indexOf('await probeStatus(detectOptions)')
report(
  closeListenerAt >= 0 &&
    probeAwaitAt > closeListenerAt &&
    transcodeSource.includes('res.destroyed === true') &&
    transcodeSource.includes('res.writableEnded === true') &&
    transcodeSource.includes('ffmpegStatusImpl')
    ? 'PASS'
    : 'FAIL',
  'R4B 1: transcode listens for client disconnect before the ffmpeg probe and bails out after it',
)
// R4B 2: Host allowlist runs before the desktop app-scheme trust in both fences.
const indexHostFenceAt = hostSource.indexOf('isAllowedLocalHost(req.headers?.host)')
const indexAppTrustAt = hostSource.indexOf("origin.startsWith('dsh-app://')")
const weHostFenceAt = weHostSource.indexOf('isAllowedLocalHost(')
const weAppTrustAt = weHostSource.indexOf('dsh-app://')
report(
  indexHostFenceAt >= 0 && indexAppTrustAt > indexHostFenceAt && weHostFenceAt >= 0 && weAppTrustAt > weHostFenceAt
    ? 'PASS'
    : 'FAIL',
  'R4B 2: both request fences check the Host allowlist before trusting dsh-app://',
)
// R4B 3: an invalid env value falls through to the next source and is reported.
report(
  weHostSource.includes('function classifyRepkgPath(') &&
    weHostSource.includes('function configuredRepkgPath(stored)') &&
    /if \(result\.path !== ""\) return \{ path: result\.path, rejected \};/.test(weHostSource) &&
    weHostSource.includes('repkgRejected') &&
    weHostSource.includes('not-repkg-executable')
    ? 'PASS'
    : 'FAIL',
  'R4B 3: invalid RePKG env/config values fall through to the next source and report repkgRejected',
)
// R5 4-8: layering fence, Esc repeat guard, hardened editable detection, arm expiry.
report(
  source.includes('function tl5OverlayModalAbove(') &&
    source.includes('function tl5OverlayOpenAllowed(') &&
    source.includes('event.repeat === true') &&
    source.includes('composedPath') &&
    source.includes('[role="textbox"]') &&
    source.includes('CONFIRM_ARM_TIMEOUT_MS') &&
    source.includes('disarmPendingConfirms') &&
    source.includes('tl5OverlayHas') === false &&
    source.includes('tl5OverlayOpenAllowed("wallpaper-panel")') &&
    source.includes('tl5OverlayOpenAllowed("font-panel")') &&
    source.includes('tl5OverlayModalAbove("wallpaper-panel")')
    ? 'PASS'
    : 'FAIL',
  'R5 4-8: modal layering fence, Esc repeat guard, composedPath editor detection, destructive-arm expiry',
)
// R6 9-11: fps probe baseline, scene iframe per-mount token, per-generation video events.
const sceneFrameSource = fs.readFileSync(fileURLToPath(new URL('../lib/scene-frame.html', import.meta.url)), 'utf8')
report(
  source.includes('fpsQualityPrimed') &&
    source.includes('fpsQualityWindows') &&
    source.includes('sceneFrameToken') &&
    source.includes('data.token !== sceneFrameToken') &&
    /bindVideoEvents\(sourceGeneration\)/.test(source) &&
    source.includes('if (generation !== sourceGeneration) return;') &&
    sceneFrameSource.includes('const mountToken = params.get("token") || "";') &&
    sceneFrameSource.includes('Object.assign({ __tlScene: true, token: mountToken }, payload)')
    ? 'PASS'
    : 'FAIL',
  'R6 9-11: fps probe baselines first, scene messages carry a per-mount token, video events are generation-guarded',
)

// ---- 30. S1: autonomous speech and the private mind respect the user's controls ----
// Proactive speech goes through the brain's pause/proactive verdict and the life gate;
// the deferred queue is postponed while paused and replayed afterwards.
const proactiveAt = source.indexOf('function lifeTryProactive(')
const proactiveRegion = proactiveAt >= 0 ? source.slice(proactiveAt, proactiveAt + 5000) : ''
const replayAt = source.indexOf('function lifeReplayDue(')
const replayRegion = replayAt >= 0 ? source.slice(replayAt, replayAt + 2600) : ''
report(
  proactiveRegion.includes('petBrainInternal.proactiveVerdict') &&
    proactiveRegion.includes('proactiveVerdict.allowed !== true') &&
    replayRegion.includes('petBrainInternal.isPaused()') &&
    replayRegion.includes('LIFE_PAUSE_REPLAY_MS') &&
    replayRegion.includes('companionDutyBridge.dutyReplay') &&
    source.includes('function petProactiveVerdict(') &&
    source.includes('petPaused === true') &&
    source.includes('petGranted("proactive") !== true') &&
    source.includes('isPaused: () => petPaused === true')
    ? 'PASS'
    : 'FAIL',
  'S1: proactive speech is pause + proactive-grant + life-gate gated; deferred interrupts wait for resume',
)
// Autonomous thinking observes quiet/sleep/focus gates, never borrows the user chat
// quota, and its LLM payload carries no chat history.
const mindSafetyAt = source.indexOf('function petMindSafety(')
const mindSafetyRegion = mindSafetyAt >= 0 ? source.slice(mindSafetyAt, mindSafetyAt + 900) : ''
const mindDigestAt = source.indexOf('function petMindDigest(')
const mindDigestEnd = mindDigestAt >= 0 ? source.indexOf('function petMindComposeThought(', mindDigestAt) : -1
const mindDigestRegion = mindDigestAt >= 0 && mindDigestEnd > mindDigestAt ? source.slice(mindDigestAt, mindDigestEnd) : ''
report(
  mindSafetyRegion.includes('"quiet-hours"') &&
    mindSafetyRegion.includes('"asleep"') &&
    mindSafetyRegion.includes('"focus"') &&
    source.includes('function petMindLlmBudget(') &&
    source.includes('PET_MIND_LLM_DAILY_LIMIT') &&
    source.includes('meter === "mind"') &&
    source.includes('petMindLlmCharge(') &&
    mindDigestRegion.includes('context.messages') === false &&
    mindDigestRegion.includes('lastUserTopic') === false &&
    mindDigestRegion.includes('lastPetText') === false
    ? 'PASS'
    : 'FAIL',
  'S1: autonomous thinking is life-gate aware, uses an independent daily budget, and its LLM payload carries no chat history',
)
// Hub: same-closure mind bridge, visible LLM opt-in/usage, docs promise updated.
const hubMindAt = source.indexOf('function hubPetMind()')
const hubMindRegion = hubMindAt >= 0 ? source.slice(hubMindAt, hubMindAt + 700) : ''
const petDocs = fs.readFileSync(fileURLToPath(new URL('../docs/AI-PET-PERMISSIONS.md', import.meta.url)), 'utf8')
report(
  hubMindRegion.includes('brain.mind.status') &&
    source.includes('data-tl-hub-mind-llm') &&
    source.includes('"hub.mind.llmBudget"') &&
    source.includes('"hub.mind.reason.quiet"') &&
    petDocs.includes('独立预算') &&
    petDocs.includes('12 次/天') &&
    petDocs.includes('不发送') &&
    petDocs.includes('chat history') === false
    ? 'PASS'
    : 'FAIL',
  'S1: role hub exposes the separate LLM mind switch/budget, and AI-PET-PERMISSIONS documents the gates and data promise',
)

// ---- 31. S2: stable legibility decision + edge-triggered low power ----
// The guard must decide from the ORIGINAL panel fill (never the boosted computed
// background) and use a hysteresis band so evaluations around the threshold cannot
// flip the boost on/off every frame.
const legibilityEvalAt = source.indexOf('const shouldBoost = legibilityShouldBoost(')
report(
  source.includes('const LEGIBILITY_HYSTERESIS = 0.25;') &&
    source.includes('function legibilityShouldBoost(ratio, threshold, enabled, alreadyBoosted)') &&
    source.includes('const readBaseFill = (host, dark, fallbackFill) =>') &&
    source.includes('getPropertyValue("--tl-panel-fill")') &&
    legibilityEvalAt > 0 &&
    source.includes('legibilityShouldBoost(ratio, settings.threshold, settings.enabled, boosted)') &&
    source.includes('fill = parseCssColor(style.backgroundColor) ?? fallbackFill') === false
    ? 'PASS'
    : 'FAIL',
  'S2: legibility decisions use the original (un-boosted) panel fill with hysteresis, not the boosted background',
)
// REV-S2 F2/F6: the base cache key must include theme + both panel tokens (same-theme
// changes become visible while boosted), and install must clear a residual boost.
report(
  source.includes('function legibilityBaseCacheKey(dark, panelToken, inlineFill)') &&
    source.includes('host.style.getPropertyValue("--tl-panel-fill")') &&
    source.includes('baseKey === key') &&
    source.includes('baseFillDark') === false &&
    /REV-S2 F6[\s\S]{0,320}?body\.removeAttribute\("data-tl-legibility"\)/.test(source)
    ? 'PASS'
    : 'FAIL',
  'REV-S2 F2/F6: the original-fill cache tracks theme+token changes and install clears a residual boost attribute',
)
// Battery events are edge-triggered: ordinary percent changes must not re-run
// pause/resume, and a hidden page must never be resumed by the low-power supervisor.
const lowPowerApplyAt = source.indexOf('const apply = (syncTargets) => {')
const lowPowerRegion = lowPowerApplyAt >= 0 ? source.slice(lowPowerApplyAt, lowPowerApplyAt + 9000) : ''
report(
  lowPowerRegion.includes('const entered = nextActive === true && active === false;') &&
    lowPowerRegion.includes('const left = nextActive === false && active === true;') &&
    lowPowerRegion.includes('const stateChanged = nextActive !== active || nextReason !== reason;') &&
    // REV-S2 F1: only targets the supervisor paused are resumed, and only when visible.
    source.includes('const pausedTargets = new Set();') &&
    source.includes('const resumePausedTargets = () => {') &&
    lowPowerRegion.includes('if (document.hidden !== true) resumePausedTargets();') &&
    lowPowerRegion.includes('if (active === false) resumePausedTargets();') &&
    lowPowerRegion.includes('document.addEventListener("visibilitychange", onVisibilityChange)') &&
    lowPowerRegion.includes('sync: () => apply(true)') &&
    source.includes('apply(false)')
    ? 'PASS'
    : 'FAIL',
  'S2: low power is edge-triggered (entered/left), no-op on ordinary battery changes, and hidden pages resume only after visibility',
)

// ---- 32. S3: bundle format parity, uploads-only export, SVG safety ----
// One shared media table drives both directions: export no longer ships .svg/.avif
// that the importer silently drops.
const mediaTypesSource = fs.readFileSync(fileURLToPath(new URL('../lib/media-types.js', import.meta.url)), 'utf8')
const listBundleAt = bundleSource.indexOf('export function listBundleWallpapers(')
const listBundleRegion = listBundleAt >= 0 ? bundleSource.slice(listBundleAt, listBundleAt + 2200) : ''
report(
  bundleSource.includes('export const IMPORT_EXT = new Set([...VIDEO_EXT, ...IMAGE_EXT])') &&
    mediaTypesSource.includes("'.avif'") &&
    mediaTypesSource.includes("'.svg'") &&
    bundleSource.includes('if (IMPORT_EXT.has(ext)) {') &&
    bundleSource.includes("return { kind: 'wallpaper', base, legacyRoot: segments.length === 2 }")
    ? 'PASS'
    : 'FAIL',
  'S3: bundle export/import share one format table (.svg/.avif round-trip instead of being silently skipped)',
)
// The shipped demo media is not exported; legacy bundles carrying it are skipped
// on import instead of copied into uploads as duplicates.
report(
  listBundleRegion !== '' &&
    listBundleRegion.includes('readdirSync(uploadDir)') &&
    listBundleRegion.includes("'wallpapers/uploads/'") &&
    // Uploads are user content even with a demo basename; only the OLD flat layout
    // (legacyRoot) is treated as shipped demo media on import.
    listBundleRegion.includes('isBundleBuiltinMedia(name)') === false &&
    bundleSource.includes('export function isBundleBuiltinMedia(base)') &&
    bundleSource.includes('legacyRoot: segments.length === 2') &&
    bundleSource.includes('classified.legacyRoot === true && isBundleBuiltinMedia(classified.base)') &&
    bundleSource.includes("policy: 'user-uploads-only'")
    ? 'PASS'
    : 'FAIL',
  'S3: bundles export user uploads only; old-layout built-in demo media is skipped instead of duplicated on import',
)
// SVG is accepted in both directions but only as a passive image document. S3b:
// the parser is namespace/character-reference aware (allow-list, not a regex blacklist),
// and the serving layer adds CSP sandbox + nosniff as defense in depth.
const uploadSource = fs.readFileSync(fileURLToPath(new URL('../lib/upload.js', import.meta.url)), 'utf8')
const httpMediaSource = fs.readFileSync(fileURLToPath(new URL('../lib/http-media.js', import.meta.url)), 'utf8')
report(
  mediaTypesSource.includes('export function isSafeSvgBuffer(buffer)') &&
    mediaTypesSource.includes('function decodeXmlCharRefs(text)') &&
    mediaTypesSource.includes('const SVG_DENY_ELEMENTS = new Set([') &&
    mediaTypesSource.includes('external href') === false &&
    mediaTypesSource.includes("'external ' + lower + ' reference'") &&
    mediaTypesSource.includes('CDATA section') &&
    mediaTypesSource.includes('processing instruction') &&
    mediaTypesSource.includes('named entity') &&
    mediaTypesSource.includes('SVG_MAX_BYTES') &&
    uploadSource.includes('isSafeSvgBuffer(Buffer.concat(svgProbe))') &&
    bundleSource.includes('isSafeSvgBuffer(raw)') &&
    bundleSource.includes("collected.skipped.push(entry.name + ' (unsafe SVG: ' + verdict.reason + ')')") &&
    httpMediaSource.includes('const isSvg = type === \'image/svg+xml\'') &&
    httpMediaSource.includes('sandbox; default-src') &&
    httpMediaSource.includes("baseHeaders['x-content-type-options'] = 'nosniff'") &&
    source.includes('lib.bundleHint') &&
    source.includes('assets/uploads')
    ? 'PASS'
    : 'FAIL',
  'S3b: SVGs are passive-only via a namespace/char-ref-aware allow-list; serving adds CSP sandbox + nosniff; old unsafe bundle SVGs are skipped',
)

// ---- 33. S4: dedupe (one implementation per concept) + dead-code removal ----
const hostPathsSource = fs.readFileSync(fileURLToPath(new URL('../lib/host-paths.js', import.meta.url)), 'utf8')
// A1/A2: the panel tint and the font-panel chroma share one palette sampler; the
// wallpaper panel and the WE library share one recent list (same key, same semantics).
report(
  source.includes('function tl5SampleWallpaperPalette()') &&
    (source.match(/tl5SampleWallpaperPalette\(\)/g) ?? []).length >= 2 &&
    (source.match(/Math\.atan2\(sin, cos\)/g) ?? []).length === 1 &&
    source.includes('function tl5RememberRecent(') &&
    source.includes('tl5RememberRecent(url)') &&
    source.includes('function tl5ReadRecent(') &&
    source.includes('weReadLast') === false &&
    source.includes('WE_RECENT_KEY') === false
    ? 'PASS'
    : 'FAIL',
  'S4: one shared palette sampler and one shared recent-wallpaper list (panel + WE library agree)',
)
// A3/A6: one upload pre-flight and one media-kind table; the two panels and the life
// engine use them instead of their own extension lists.
report(
  source.includes('function tl5ValidateUploadFile(file, maxBytes)') &&
    (source.match(/tl5ValidateUploadFile\(/g) ?? []).length >= 3 &&
    source.includes('function tl5MediaKindFromName(name)') &&
    (source.match(/tl5MediaKindFromName\(/g) ?? []).length >= 4 &&
    source.includes('/\\.(mp4|m4v|mov|webm|png|jpe?g|webp|avif|gif|svg)$/i') === false &&
    source.includes('lifeGuessMediaKind') &&
    mediaTypesSource.includes('export function mediaKindFromName(name)') &&
    hostSource.includes('mediaKindFromName(name)')
    ? 'PASS'
    : 'FAIL',
  'S4: one shared upload pre-flight and one media-kind table (client + host), no duplicated extension lists',
)
// A4: mic and system-audio share the analyser-graph tail; only acquisition differs.
report(
  source.includes('async function attachAudioGraph(Context, stream, token, options)') &&
    (source.match(/attachAudioGraph\(Context, stream, token, \{/g) ?? []).length === 2 &&
    (source.match(/context\.createMediaStreamSource\(stream\)/g) ?? []).length === 1 &&
    /async function startAudio\(\) \{[\s\S]{0,2600}?attachAudioGraph\(Context, stream, token, \{ fftSize: 1024/.test(source) &&
    /async function startSystemAudio\(options\) \{[\s\S]{0,4200}?attachAudioGraph\(Context, stream, token, \{ fftSize: 2048/.test(source)
    ? 'PASS'
    : 'FAIL',
  'S4: mic and system audio share one analyser-graph implementation (source-specific acquisition/copy kept)',
)
// A5: both host halves parse Range through lib/http-media.js.
report(
  weHostSource.includes('import { parseRange } from "../http-media.js"') &&
    weHostSource.includes('const range = parseRange(req.headers.range, total)') &&
    weHostSource.includes('/^bytes=(\\d*)-(\\d*)$/') === false
    ? 'PASS'
    : 'FAIL',
  'S4: the WE host streams ranges through the shared http-media parser (no second Range implementation)',
)
// B: dead code removed; every removed symbol had zero non-definition references.
report(
  source.includes('transitionController.apply') === false &&
    source.includes('transitionController.subscribe') === false &&
    source.includes('transitionSubscribers') === false &&
    source.includes('weLibraryController') === false &&
    /function petAgentStatus\(\) \{[\s\S]{0,1400}?sessions: \[\]/.test(source) === false &&
    hostPathsSource.includes('export const PLUGIN_ROOT') === false &&
    hostPathsSource.includes('export const ASSETS_DIR') === false &&
    hostPathsSource.includes('export const UPLOADS_DIR') === false
    ? 'PASS'
    : 'FAIL',
  'S4: dead controller methods/fields and unused host-path exports are gone (grep-verified, no behavior change)',
)

// S3b decision: scene-project keeps `.svg` (WE scenes legitimately use SVG textures)
// but those responses go through the same servePath CSP sandbox/nosniff fence and are
// only fetched by the sandboxed adapter; no separate SVG execution surface remains.
const sceneProjectSource = fs.readFileSync(fileURLToPath(new URL('../lib/scene-project.js', import.meta.url)), 'utf8')
report(
  sceneProjectSource.includes("'.svg',") &&
    hostSource.includes("rest.startsWith('_scene-project/')") &&
    hostSource.includes('servePath(req, res, filePath, basename(filePath)') &&
    httpMediaSource.includes('sandbox; default-src')
    ? 'PASS'
    : 'FAIL',
  'S3b: scene-project SVG support is kept but served through the same CSP-sandboxed path (no executable same-origin surface)',
)

// S2c (REV-S2b F1/NIT3): stale playback objects are filtered on resume, and the base
// cache key is length-prefixed so token text containing separators cannot collide.
report(
  source.includes('const isCurrentTarget = (target) => target === scenePlayback || target === railPlayback;') &&
    source.includes('const prunePausedTargets = () => {') &&
    source.includes('if (isCurrentTarget(target) === false) continue;') &&
    source.includes('prunePausedTargets();') &&
    source.includes('REPLACED or detached by its own') &&
    source.includes('return theme.length + ":" + theme + ":" + tokenText.length') &&
    source.includes('Length-prefixed join')
    ? 'PASS'
    : 'FAIL',
  'S2c: low power resumes only current playback targets (stale replaced/detached objects ignored) and the base cache key is collision-safe',
)

// S3c: the passive-SVG filter is CSS-comment aware and rejects string-shaped URLs in
// CSS functions/declarations (`image-set("https://…")`, `@font-face{src:…}`), plus
// unquoted/raw-scheme attribute forms that are invalid XML but browser-defensive.
report(
  mediaTypesSource.includes('function stripCssComments(text)') &&
    mediaTypesSource.includes('function svgStyleThreat(text)') &&
    mediaTypesSource.includes('external URL in CSS') &&
    mediaTypesSource.includes('data: URL in CSS') &&
    mediaTypesSource.includes('unquoted attribute') &&
    mediaTypesSource.includes('raw URL scheme in attributes') &&
    mediaTypesSource.includes('stripCssComments(decodeXmlCharRefs(rawValue))') &&
    mediaTypesSource.includes('svgStyleThreat(value)')
    ? 'PASS'
    : 'FAIL',
  'S3c: passive-SVG filter strips CSS comments and rejects string-URL CSS forms plus unquoted/raw-scheme attributes',
)
// S3c: the vendored WE host serves SVG through the same CSP sandbox/nosniff fence
// (all writeHead paths share the base headers).
report(
  weHostSource.includes('const type = mimeFor(abs);') &&
    weHostSource.includes('if (type === "image/svg+xml") {') &&
    weHostSource.includes("headers[\"content-security-policy\"] = \"sandbox; default-src 'none'") &&
    (weHostSource.match(/\.\.\.headers/g) ?? []).length >= 4
    ? 'PASS'
    : 'FAIL',
  'S3c: the WE host serveFile applies the servePath SVG CSP sandbox and carries it on HEAD/206/200/416',
)

// S3d: CSS-comment stripping must stay CSS-local. A global strip would erase
// `/*<script>…*/` before the structural scan and silently ACCEPT executable markup.
report(
  mediaTypesSource.includes('text = stripCssComments(text)') === false &&
    mediaTypesSource.includes('S3d (REV of 553ff4f)') &&
    mediaTypesSource.includes('function svgStyleThreat(text)') &&
    mediaTypesSource.includes('stripCssComments(decodeXmlCharRefs(rawValue))') &&
    mediaTypesSource.includes('function svgTextThreat(text)') &&
    mediaTypesSource.includes('const value = stripCssComments(text)')
    ? 'PASS'
    : 'FAIL',
  'S3d: CSS-comment stripping is CSS-local only; wrapped /*<script>*/ tags are still rejected by the structural scan',
)

console.log(issues === 0 ? 'AUDIT: no blocking issues' : `AUDIT: ${issues} blocking issue(s)`)
process.exitCode = issues === 0 ? 0 : 1

