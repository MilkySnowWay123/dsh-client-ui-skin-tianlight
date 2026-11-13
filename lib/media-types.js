// Shared media policy for the TIANLIGHT host half.
//
// These tables used to live inside index.js. They are shared by the asset route,
// the wallpaper catalog and the upload sink, and a second copy of an extension
// list is exactly how "the upload accepted a format the player cannot decode"
// bugs happen. One table, imported by every route.

import { realpathSync, statSync } from 'node:fs'
import { dirname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
/** Package-local binary directory; uploads live one level below it. */
export const ASSET_DIR = resolve(HERE, '..', 'assets')

export const ROUTE = '/skin-tianlight'

export const MIME = {
  '.mp4': 'video/mp4',
  '.m4v': 'video/mp4',
  '.mov': 'video/quicktime',
  '.webm': 'video/webm',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  // Web-wallpaper (A3) documents and their subresources. `x-content-type-options:
  // nosniff` is set on those responses, so a wrong/absent type would break the
  // page; the table is the one place that decides it.
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.wasm': 'application/wasm',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
}

export const VIDEO_EXT = new Set(['.mp4', '.webm', '.mov', '.m4v'])
export const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.avif', '.gif', '.svg'])

/**
 * S4: one "video or image?" helper for the host half. Callers used to repeat the
 * same two-Set conditional; a new format added here then applies everywhere.
 * Returns 'video' | 'image' | null for a file name or extension-bearing path.
 */
export function mediaKindFromName(name) {
  const text = String(name ?? '')
  const dot = text.lastIndexOf('.')
  if (dot < 0) return null
  const ext = text.slice(dot).toLowerCase()
  if (VIDEO_EXT.has(ext)) return 'video'
  if (IMAGE_EXT.has(ext)) return 'image'
  return null
}

/** One path segment only: no separators, no traversal, no hidden control chars. */
export const SAFE_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*$/

/**
 * SVG is an executable document when navigated to directly (event handlers,
 * <script>, external references). The skin accepts SVG wallpapers, but only as a
 * passive image.
 *
 * S3b (REV-S3): the previous regular-expression blacklist was bypassable with XML
 * namespace prefixes (`<svg:script>`), character references (`&#106;avascript:`),
 * feImage/CSS encoded external URLs, `<!DOCTYPE SYSTEM>` and nested data: URLs.
 * This version parses the document into tags/attributes instead:
 *   - namespace prefixes are stripped (localName matching),
 *   - numeric character references are decoded before any inspection,
 *   - dangerous elements/attributes are rejected by ALLOW-list (unknown local
 *     names are allowed only when they are not in the deny sets below),
 *   - every URL-bearing attribute may only reference a local `#fragment`,
 *   - style text/attributes are scanned for @import / external url() / expression,
 *   - doctypes, entities, PIs (except a leading XML declaration) and CDATA are
 *     refused, as are unknown named entities.
 * The 4 MB bound applies before any parsing. Upload and bundle import share it.
 */
export const SVG_MAX_BYTES = 4 * 1024 * 1024

const SVG_DENY_ELEMENTS = new Set([
	'script',
	'foreignobject',
	'iframe',
	'embed',
	'object',
	'handler',
	'set',
	'animate',
	'animatemotion',
	'animatetransform',
	'discard',
	'mpath',
	'base',
	'meta',
	'link',
])
const SVG_URL_ATTRS = new Set(['href', 'src', 'poster', 'action', 'formaction', 'xml:base', 'base'])
const SVG_NAMED_ENTITIES = new Set(['amp', 'lt', 'gt', 'quot', 'apos'])

/** Decode XML numeric character references for inspection (never for output). */
function decodeXmlCharRefs(text) {
	return String(text).replace(/&#(x[0-9a-fA-F]+|[0-9]+);/g, (_match, body) => {
		try {
			const code = body[0] === 'x' || body[0] === 'X' ? Number.parseInt(body.slice(1), 16) : Number.parseInt(body, 10)
			if (Number.isFinite(code) === false || code <= 0 || code > 0x10ffff) return '\uFFFD'
			if (code >= 0xd800 && code <= 0xdfff) return '\uFFFD'
			return String.fromCodePoint(code)
		} catch {
			return '\uFFFD'
		}
	})
}

/** Strip CSS comments so `@im/**​/port` or `u/**​/rl(` cannot hide from the checks. */
function stripCssComments(text) {
	return String(text).replace(/\/\*[\s\S]*?\*\//g, '')
}

/** Reject CSS/text constructs that can load or execute external content. */
function svgTextThreat(text) {
	const value = stripCssComments(text)
	if (/@import/i.test(value)) return 'CSS @import'
	if (/expression\s*\(/i.test(value)) return 'CSS expression()'
	if (/\b(?:java|vb)script\s*:/i.test(value)) return 'script URL'
	if (/\bdata\s*:\s*text\/html/i.test(value)) return 'data:text/html'
	if (/\\/.test(value)) return 'CSS backslash escape'
	const urlPattern = /url\s*\(\s*([^)]*)\)/gi
	let match = urlPattern.exec(value)
	while (match !== null) {
		const target = match[1].trim().replace(/^['"]|['"]$/g, '').trim()
		if (target.startsWith('#') === false) return 'external url() resource'
		match = urlPattern.exec(value)
	}
	return null
}

/**
 * CSS-value-aware threat check for `<style>` bodies and `style` attributes:
 * comments are removed first, then any external URL in ANY CSS function/declaration
 * form is rejected (`image-set("https://…")`, `@font-face{src:"https://…"}`,
 * `filter:url(//…)`, bare `https:`/`//`/`data:`/`javascript:` inside a value, etc.).
 * Local `#fragment` references remain allowed.
 */
function svgStyleThreat(text) {
	const value = stripCssComments(text)
	if (/@import/i.test(value)) return 'CSS @import'
	if (/expression\s*\(/i.test(value)) return 'CSS expression()'
	if (/\b(?:java|vb)script\s*:/i.test(value)) return 'script URL'
	if (/\bdata\s*:/i.test(value)) return 'data: URL in CSS'
	if (/(?:https?:|\/\/)/i.test(value)) return 'external URL in CSS'
	if (/\\/.test(value)) return 'CSS backslash escape'
	const urlPattern = /url\s*\(\s*([^)]*)\)/gi
	let match = urlPattern.exec(value)
	while (match !== null) {
		const target = match[1].trim().replace(/^['"]|['"]$/g, '').trim()
		if (target.startsWith('#') === false) return 'external url() resource'
		match = urlPattern.exec(value)
	}
	return null
}

export function isSafeSvgBuffer(buffer) {
	if (Buffer.isBuffer(buffer) === false || buffer.length === 0) return { ok: false, reason: 'empty' }
	if (buffer.length > SVG_MAX_BYTES) return { ok: false, reason: 'svg is larger than ' + Math.round(SVG_MAX_BYTES / (1024 * 1024)) + ' MB' }
	let text = buffer.toString('utf8')
	if (text.includes('\u0000')) return { ok: false, reason: 'NUL byte' }
	// Character references are decoded FIRST: `&#106;avascript:`/`&#x6a;avascript&#x3a;`
	// and `<svg:script>` must be judged by what they actually spell.
	text = decodeXmlCharRefs(text).replace(/<!--[\s\S]*?-->/g, ' ')
	// S3d (REV of 553ff4f): do NOT strip CSS comments globally here. A CSS comment is
	// NOT an XML comment — `/*<script>alert(1)</script>*/` in SVG text still contains a
	// real <script> element and the browser executes it. CSS-comment stripping happens
	// only where a value is genuinely CSS (svgStyleThreat, style attribute values), so
	// `@im/**/port` / `u/**/rl(` stay covered without hiding tags from the scan below.
	if (/<!\s*(?:DOCTYPE|ENTITY)\b/i.test(text)) return { ok: false, reason: 'XML DOCTYPE/ENTITY' }
	if (/<!\[CDATA\[/i.test(text)) return { ok: false, reason: 'CDATA section' }
	const piPattern = /<\?([\s\S]*?)\?>/g
	let pi = piPattern.exec(text)
	while (pi !== null) {
		// A leading XML declaration is benign; any other processing instruction is not
		// (xml-stylesheet can load an external resource). The `xml` token must be a real
		// declaration (`<?xml version=...`), not the `xml-stylesheet` prefix.
		if (/^\s*xml(?:\s|$)/i.test(pi[1]) === false) return { ok: false, reason: 'processing instruction' }
		pi = piPattern.exec(text)
	}
	// Unknown named entities can hide content; predefined XML entities are fine.
	const entityPattern = /&([A-Za-z][A-Za-z0-9_-]*);/g
	let entity = entityPattern.exec(text)
	while (entity !== null) {
		if (SVG_NAMED_ENTITIES.has(entity[1]) === false) return { ok: false, reason: 'named entity' }
		entity = entityPattern.exec(text)
	}
	// v2.0.4 (M1): a raw `>` inside a quoted attribute value (`alt=">"`) used to end
	// the tag early so the attributes after it were never inspected. Two layers now:
	// a document-wide raw scan that does not depend on where a tag ends, and a tag
	// scanner whose attribute part consumes whole quoted strings.
	if (/[\s/"']on[a-z]+\s*=/i.test(text)) return { ok: false, reason: 'inline event handler' }
	for (const denied of SVG_DENY_ELEMENTS) {
		if (new RegExp('<\\s*(?:[A-Za-z_][\\w.-]*:)?' + denied + '(?![\\w.:-])', 'i').test(text)) {
			return { ok: false, reason: 'dangerous element: ' + denied }
		}
	}
	const tagPattern = /<\s*\/?\s*([A-Za-z_][\w.-]*:)?([A-Za-z_][\w.-]*)((?:[^>"']|"[^"]*"|'[^']*')*?)>/g
	let firstLocalName = ''
	let match = tagPattern.exec(text)
	while (match !== null) {
		const localName = match[2].toLowerCase()
		if (firstLocalName === '') firstLocalName = localName
		if (SVG_DENY_ELEMENTS.has(localName)) return { ok: false, reason: 'dangerous element: ' + localName }
		const attrText = match[3]
		// Malformed/unquoted handlers are not parseable XML, but reject the raw shape too.
		if (/\bon[a-z]+\s*=/i.test(attrText)) return { ok: false, reason: 'inline event handler' }
		// Defensive raw checks: an unquoted XML attribute would be rejected by a real XML
		// parser, but the browser fallback may still interpret it — never pass these.
		if (/(?:href|src|style)\s*=\s*[^"'\s>]/i.test(attrText)) return { ok: false, reason: 'unquoted attribute' }
		if (/\b(?:javascript|vbscript|data)\s*:/i.test(attrText)) return { ok: false, reason: 'raw URL scheme in attributes' }
		const attrPattern = /([A-Za-z_][\w.:-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g
		let attr = attrPattern.exec(attrText)
		while (attr !== null) {
			const attrName = attr[1]
			const attrLocal = attrName.includes(':') ? attrName.slice(attrName.lastIndexOf(':') + 1) : attrName
			const lower = attrLocal.toLowerCase()
			if (/^on[a-z]/.test(lower)) return { ok: false, reason: 'inline event handler' }
			const rawValue = attr[2] !== undefined ? attr[2] : attr[3] !== undefined ? attr[3] : ''
			const value = stripCssComments(decodeXmlCharRefs(rawValue))
			const compact = value.replace(/[\s\u0000-\u001f]/g, '')
			if (SVG_URL_ATTRS.has(lower) || lower === 'href') {
				// Only a same-document fragment is a passive reference. Everything else
				// (javascript:, vbscript:, data:, http(s):, //host, relative paths) is
				// rejected — `data:` is deliberately not allowed even for raster MIME
				// because nested SVG can smuggle active content.
				if (compact.startsWith('#') === false) return { ok: false, reason: 'external ' + lower + ' reference' }
			}
			const valueThreat = lower === 'style' ? svgStyleThreat(value) : svgTextThreat(value)
			if (valueThreat !== null) return { ok: false, reason: valueThreat }
			if (/url\s*\(/i.test(value) && /url\s*\(\s*['"]?\s*#/i.test(value) === false) {
				return { ok: false, reason: 'external url() resource' }
			}
			attr = attrPattern.exec(attrText)
		}
		match = tagPattern.exec(text)
	}
	if (firstLocalName !== 'svg') return { ok: false, reason: 'not an svg document' }
	const stylePattern = /<style\b[^>]*>([\s\S]*?)<\/style>/gi
	let style = stylePattern.exec(text)
	while (style !== null) {
		const styleThreat = svgStyleThreat(decodeXmlCharRefs(style[1]))
		if (styleThreat !== null) return { ok: false, reason: styleThreat }
		style = stylePattern.exec(text)
	}
	return { ok: true, reason: null }
}

/**
 * v2.0.4 (M2): true when the REAL path of `target` (symlinks and Windows junctions
 * resolved) is `root` itself or inside the real path of `root`. Lexical checks
 * (`resolve()` + startsWith) cannot see links; this one can. A path that cannot be
 * resolved (missing, permission) is reported as outside — callers fail closed.
 */
export function realPathInside(root, target) {
  try {
    const realRoot = realpathSync.native(root)
    const realTarget = realpathSync.native(target)
    const fold = (value) => (process.platform === 'win32' ? value.toLowerCase() : value)
    const prefix = realRoot.endsWith(sep) ? realRoot : realRoot + sep
    return fold(realTarget) === fold(realRoot) || fold(realTarget).startsWith(fold(prefix))
  } catch {
    return false
  }
}

/**
 * Resolves `name` inside `root` and proves the result stays inside it: `..` and
 * separators are refused by SAFE_NAME plus a lexical prefix test, and an existing
 * entry must also resolve (through any symlink/junction) to a real path inside the
 * real root (v2.0.4; before that the comment claimed this but the code did not).
 */
export function safeJoin(root, name) {
  if (typeof name !== 'string' || SAFE_NAME.test(name) === false) return null
  const joined = resolve(root, name)
  const prefix = root.endsWith(sep) ? root : root + sep
  if (joined.startsWith(prefix) === false) return null
  let exists = false
  try {
    statSync(joined)
    exists = true
  } catch {
    exists = false
  }
  if (exists && realPathInside(root, joined) === false) return null
  return joined
}

/** Card metadata: size is cheap (one stat) and lets the library show real weight. */
export function fileSize(filePath) {
  try {
    const info = statSync(filePath)
    return info.isFile() ? info.size : 0
  } catch {
    return 0
  }
}
