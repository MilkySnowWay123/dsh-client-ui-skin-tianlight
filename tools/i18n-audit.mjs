// i18n completeness audit for the single client bundle.
//
// The client registers zh/en dictionaries at two moments: most fragments at
// factory-evaluation time, a few (settings.*) lazily when their installer runs.
// This tool evaluates the product once, optionally runs the lazy registration
// hook it exposes, then compares every statically referenced key with both
// dictionaries and flags language leaks:
//
//   - a referenced key missing from zh or en (raw key shown to the user),
//   - an en value containing CJK (Chinese leaking into the English UI),
//   - a zh value that is pure ASCII English (English-only copy in the zh UI),
//     except an explicit allowlist of brand/tech tokens and language names.
//
//   node tools/i18n-audit.mjs
//
// Exit code 0 = complete, 1 = at least one blocking gap (missing key / CJK en).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = dirname(HERE)
const PRODUCT = join(ROOT, 'lib', 'client.js')
const TMP = join(tmpdir(), 'dsh-tianlight-i18n-audit')

const source = readFileSync(PRODUCT, 'utf8')
const instrumented = source.replace(
  'exports.apply = apply;',
  [
    'exports.apply = apply;',
    '\t\texports.__i18nAudit = {',
    '\t\t\tstrings: TL5_STRINGS,',
    '\t\t\tregisterLazy: function () {',
    '\t\t\t\ttry { registerSchemaStrings(); } catch (error) { /* older builds may not have it */ }',
    '\t\t\t},',
    '\t\t};',
  ].join('\n'),
)
mkdirSync(TMP, { recursive: true })
const instrumentedPath = join(TMP, 'i18n-audit-client.mjs')
writeFileSync(instrumentedPath, instrumented)

let loaded = null
globalThis.window = { __ModuleLoader__: { load: (spec) => { loaded = spec } } }
await import(pathToFileURL(instrumentedPath).href + '?stamp=' + Date.now())
const exportsObj = loaded.factory(() => {
  throw new Error('no imports expected')
})
if (exportsObj.__i18nAudit === undefined) {
  console.error('i18n audit: product does not expose the audit hook (stale build?)')
  process.exit(1)
}
const audit = exportsObj.__i18nAudit
audit.registerLazy()

const zh = audit.strings.zh
const en = audit.strings.en
const zhKeys = new Set(Object.keys(zh))
const enKeys = new Set(Object.keys(en))

/** Keys assembled at call sites (e.g. "ctx." + period); expand known families. */
const DYNAMIC_FAMILIES = {
  'ctx.': ['dawn', 'day', 'dusk', 'night'],
  'lang.': ['auto', 'zh', 'en'],
  'fx.': ['none', 'rain', 'snow', 'spots'],
}

/** Collect key literals and dynamic-family prefixes from the product source. */
const used = new Map()
const addUsed = (key, where) => {
  if (key.endsWith('.') && DYNAMIC_FAMILIES[key] !== undefined) {
    for (const suffix of DYNAMIC_FAMILIES[key]) used.set(key + suffix, where)
    return
  }
  used.set(key, where)
}
for (const match of source.matchAll(/TL_T\(\s*"([^"]+)"/g)) addUsed(match[1], 'TL_T')
for (const match of source.matchAll(/TL_T\(\s*"([^"]+)"\s*\+/g)) addUsed(match[1], 'TL_T+')
for (const match of source.matchAll(/(?<![A-Za-z0-9_$.])t\(\s*"([a-z][A-Za-z0-9_.-]*\.[A-Za-z0-9_.-]*\.?)"/g)) addUsed(match[1], 't')
for (const match of source.matchAll(/(?<![A-Za-z0-9_$.])t\(\s*"([a-z][A-Za-z0-9_.-]*\.)"\s*\+/g)) addUsed(match[1], 't+')

const missingZh = []
const missingEn = []
for (const [key, where] of used) {
  if (zhKeys.has(key) === false) missingZh.push(key + ' (' + where + ')')
  if (enKeys.has(key) === false) missingEn.push(key + ' (' + where + ')')
}
const onlyZh = [...zhKeys].filter((key) => enKeys.has(key) === false)
const onlyEn = [...enKeys].filter((key) => zhKeys.has(key) === false)

const CJK = /[\u4e00-\u9fff]/
// Brand/tech tokens and language names legitimately stay ASCII in the zh UI.
const ASCII_ZH_ALLOWLIST = new Set([
  'lang.en',
  'lang.zh',
  'audio.nowPlaying',
  'lib.recipePlaceholder',
  'typo.codeFamily.mono',
  'typo.codeFamily.consolas',
  'typo.codeFamily.system',
  'wp.we.label', // product brand name, intentionally untranslated
])
// The language option for Chinese is intentionally shown as "中文" in English mode.
const EN_CJK_ALLOWLIST = new Set(['lang.zh'])
const enWithCjk = [...enKeys].filter((key) => EN_CJK_ALLOWLIST.has(key) === false && CJK.test(en[key]))
const zhAscii = [...zhKeys].filter(
  (key) => ASCII_ZH_ALLOWLIST.has(key) === false && /^[\x00-\x7F]+$/.test(zh[key]) && /[A-Za-z]{3,}/.test(zh[key]),
)

const blocking = missingZh.length > 0 || missingEn.length > 0 || enWithCjk.length > 0 || onlyZh.length > 0 || onlyEn.length > 0

console.log('i18n audit')
console.log('  registered keys: zh=' + zhKeys.size + ' en=' + enKeys.size + ' referenced=' + used.size)
console.log('  missing in zh: ' + (missingZh.length === 0 ? 'none' : missingZh.join(', ')))
console.log('  missing in en: ' + (missingEn.length === 0 ? 'none' : missingEn.join(', ')))
console.log('  only zh: ' + (onlyZh.length === 0 ? 'none' : onlyZh.join(', ')))
console.log('  only en: ' + (onlyEn.length === 0 ? 'none' : onlyEn.join(', ')))
console.log('  en values containing CJK: ' + (enWithCjk.length === 0 ? 'none' : enWithCjk.join(', ')))
console.log('  zh values that are pure ASCII English (allowlisted excluded): ' + (zhAscii.length === 0 ? 'none' : zhAscii.join(', ')))
console.log(blocking ? 'I18N AUDIT: gaps found' : 'I18N AUDIT: complete')
process.exitCode = blocking ? 1 : 0
