// Vendored host half of `dsh-we-wallpaper` (MIT), adapted for the TIANLIGHT skin.
//
// Upstream: https://github.com/pbadgpmeb22791-sketch/dsh-we-wallpaper (v0.4.0,
// commit 61ccaa2), `lib/index.js` built from the repo's TypeScript sources.
// The framework-free scanner, the dependency-free `.pkg`/TEX decoder and the
// HTTP route family are kept; the cordis/settings plugin wiring and the upstream
// client half are not. The skin mounts this route family on its own second web
// prefix (`/api/we-wallpaper`) via `makeWeWallpaperHandler`, and reuses the
// scanner for the panel's `_wallpapers` / `_engines` payloads.
//
// `lib/we-wallpaper/README.md` records the exact modifications and the MIT
// notice; `lib/we-wallpaper/LICENSE` is the upstream license text. The optional
// scene-video recorder under `vendor/we-wallpaper/wcap/` is Unlicense (public
// domain), see `vendor/we-wallpaper/wcap/LICENSE`.
//
// Local adaptations (grep "TIANLIGHT" for every added seam):
//   - runtime state + preview/scene-video cache live under `<plugin>/state/`
//     (or `TIANLIGHT_WE_HOME`), never in `~/.dsh`;
//   - the wcap tools resolve to `<plugin>/vendor/we-wallpaper/wcap/`;
//   - scene `.pkg` extraction also covers local (non-workshop) projects;
//   - scene-video generation answers a clear 503 when the recorder is missing,
//     when not running on Windows, or when TIANLIGHT_WE_DISABLE_SCENE_VIDEO=1;
//   - scanner + state helpers are exported for the skin's host routes.

import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, createReadStream, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { basename, dirname, extname, isAbsolute, join, resolve, sep } from "node:path";
import { deflateSync } from "node:zlib";
//#region src/pkg-tex.ts
/**
* Wallpaper Engine scene.pkg → background image extractor.
*
* The package format (validated against a real 3000925581 scene.pkg and
* cross-checked with the RePKG C# implementation, MIT, notscuffed/repkg):
*
*   [u32 magicLen][magic "PKGVxxxx"] [u32 entryCount]
*   entries: [u32 nameLen][name][u32 dataOffset][u32 dataLength] ...
*   data area starts right after the table; each entry's bytes live at
*   dataStart + dataOffset.
*
* JSON entries are plain text; texture entries are TEX files:
*
*   "TEXV0005\0" "TEXI0001\0"
*   header: u32 format, u32 flags, u32 textureW, u32 textureH,
*           u32 imageW, u32 imageH, u32 unk
*   image container: "TEXB0003\0" u32 imageCount u32 freeImageFormat
*   per image: u32 mipmapCount, then per mipmap:
*     u32 width, u32 height, u32 isLz4, u32 decompressedLen, u32 byteLen, bytes
*
* This module decodes the largest texture to RGBA and encodes it as PNG
* (Node's zlib) — no external dependencies, pure functions, unit-testable.
* DXT decoding is a TypeScript port of the LibSquish-derived C# code in
* RePKG (MIT, copyright Xalcon @ mmowned.com, see file header).
*/
/** Parse the package directory table. Null when the layout is unsupported. */
function parsePackage(buf) {
	if (buf.length < 16) return null;
	const magicLen = readU32(buf, 0);
	if (magicLen <= 0 || magicLen > 32 || 4 + magicLen + 4 > buf.length) return null;
	const magic = utf8(buf, 4, 4 + magicLen);
	const entryCount = readU32(buf, 4 + magicLen);
	if (entryCount <= 0 || entryCount > 4096) return null;
	const entries = [];
	let pos = 4 + magicLen + 4;
	for (let i = 0; i < entryCount; i++) {
		if (pos + 8 > buf.length) return null;
		const nameLen = readU32(buf, pos);
		if (nameLen <= 0 || nameLen > 512 || pos + 4 + nameLen + 8 > buf.length) return null;
		const name = utf8(buf, pos + 4, pos + 4 + nameLen);
		const offset = readU32(buf, pos + 4 + nameLen);
		const length = readU32(buf, pos + 4 + nameLen + 4);
		entries.push({
			name,
			offset,
			length,
			abs: 0
		});
		pos += 4 + nameLen + 8;
	}
	const dataStart = pos;
	for (const entry of entries) {
		entry.abs = dataStart + entry.offset;
		if (!Number.isSafeInteger(entry.abs) || entry.abs < dataStart || entry.abs + entry.length > buf.length) return null;
	}
	return {
		magic,
		entries,
		dataStart,
		size: buf.length
	};
}
/** Read a NUL-terminated string (max length); '' when no terminator found. */
function readNString(buf, pos, max) {
	let end = pos;
	const limit = Math.min(pos + max, buf.length);
	while (end < limit && buf[end] !== 0) end++;
	return utf8(buf, pos, end);
}
/** Parse a TEX header from an absolute position. Null when invalid. */
function parseTexHeader(buf, abs) {
	if (abs + 8 > buf.length) return null;
	const magic1 = readNString(buf, abs, 16);
	if (magic1 !== "TEXV0005") return null;
	const magic2 = readNString(buf, abs + magic1.length + 1, 16);
	if (magic2 !== "TEXI0001") return null;
	const p = abs + magic1.length + 1 + magic2.length + 1;
	if (p + 28 > buf.length) return null;
	const format = readU32(buf, p);
	const flags = readU32(buf, p + 4);
	const textureWidth = readU32(buf, p + 8);
	const textureHeight = readU32(buf, p + 12);
	const imageWidth = readU32(buf, p + 16);
	const imageHeight = readU32(buf, p + 20);
	if (textureWidth === 0 || textureHeight === 0 || textureWidth > 16384 || textureHeight > 16384) return null;
	return {
		format,
		flags,
		textureWidth,
		textureHeight,
		imageWidth,
		imageHeight
	};
}
/** Enumerate texture entries of a package (entries whose data starts with TEXV0005). */
function findTexCandidates(buf, pkg) {
	const out = [];
	for (const entry of pkg.entries) {
		if (entry.abs + entry.length > buf.length) continue;
		const header = parseTexHeader(buf, entry.abs);
		if (header === null) continue;
		out.push({
			name: entry.name,
			...header,
			abs: entry.abs,
			length: entry.length
		});
	}
	return out;
}
/** Decode an LZ4 block (the K4os LZ4Codec.Decode contract: known output length). */
function lz4BlockDecode(src, outLen) {
	const out = new Uint8Array(outLen);
	let ip = 0;
	let op = 0;
	const readByte = () => ip < src.length ? src[ip++] : -1;
	try {
		while (ip < src.length) {
			const token = readByte();
			if (token < 0) break;
			let litLen = token >> 4;
			if (litLen === 15) {
				let b;
				do {
					b = readByte();
					if (b < 0) throw new Error("lz4: truncated literal length");
					litLen += b;
				} while (b === 255);
			}
			if (op + litLen > outLen || ip + litLen > src.length) throw new Error("lz4: literal overflow");
			out.set(src.subarray(ip, ip + litLen), op);
			ip += litLen;
			op += litLen;
			if (ip >= src.length) break;
			const offset = readByte() | readByte() << 8;
			if (offset === 0 || offset > op) throw new Error("lz4: invalid offset");
			let matchLen = (token & 15) + 4;
			if ((token & 15) === 15) {
				let b;
				do {
					b = readByte();
					if (b < 0) throw new Error("lz4: truncated match length");
					matchLen += b;
				} while (b === 255);
			}
			if (op + matchLen > outLen) throw new Error("lz4: match overflow");
			for (let i = 0; i < matchLen; i++) out[op + i] = out[op + i - offset];
			op += matchLen;
		}
		return op === outLen ? out : null;
	} catch {
		return null;
	}
}
/** R8 (1 byte/pixel) → RGBA. */
function decodeR8(src, w, h) {
	const out = new Uint8Array(w * h * 4);
	for (let i = 0; i < w * h; i++) {
		const v = src[i] ?? 0;
		out[i * 4] = v;
		out[i * 4 + 1] = v;
		out[i * 4 + 2] = v;
		out[i * 4 + 3] = 255;
	}
	return out;
}
/** RG88 (2 bytes/pixel) → RGBA; WE semantics: color = (G,G,G,R) i.e. R is alpha. */
function decodeRg88(src, w, h) {
	const out = new Uint8Array(w * h * 4);
	for (let i = 0; i < w * h; i++) {
		const r = src[i * 2] ?? 0;
		const g = src[i * 2 + 1] ?? 0;
		out[i * 4] = g;
		out[i * 4 + 1] = g;
		out[i * 4 + 2] = g;
		out[i * 4 + 3] = r;
	}
	return out;
}
function unpack565(block, pos, codes, codePos) {
	const value = block[pos] | block[pos + 1] << 8;
	const red = value >> 11 & 31;
	const green = value >> 5 & 63;
	const blue = value & 31;
	codes[codePos] = red << 3 | red >> 2;
	codes[codePos + 1] = green << 2 | green >> 4;
	codes[codePos + 2] = blue << 3 | blue >> 2;
	codes[codePos + 3] = 255;
	return value;
}
/** Decompress one 4x4 block into rgba (16*4 bytes), dxt1 = 8-byte, dxt3/5 = 16-byte. */
function decompressBlock(rgba, block, blockPos, dxt1, dxt3, dxt5) {
	const colorBlockPos = dxt3 || dxt5 ? blockPos + 8 : blockPos;
	const codes = /* @__PURE__ */ new Uint8Array(16);
	const a = unpack565(block, colorBlockPos, codes, 0);
	const b = unpack565(block, colorBlockPos + 2, codes, 4);
	for (let i = 0; i < 3; i++) {
		const c = codes[i];
		const d = codes[4 + i];
		if (dxt1 && a <= b) {
			codes[8 + i] = c + d >> 1;
			codes[12 + i] = 0;
		} else {
			codes[8 + i] = (2 * c + d) / 3;
			codes[12 + i] = (c + 2 * d) / 3;
		}
	}
	codes[11] = 255;
	codes[15] = dxt1 && a <= b ? 0 : 255;
	for (let i = 0; i < 4; i++) {
		const packed = block[colorBlockPos + 4 + i];
		rgba[i * 4] = codes[4 * (packed & 3)];
		rgba[i * 4 + 1] = codes[4 * (packed & 3) + 1];
		rgba[i * 4 + 2] = codes[4 * (packed & 3) + 2];
		rgba[i * 4 + 3] = codes[4 * (packed & 3) + 3];
		rgba[4 + i * 4] = codes[4 * (packed >> 2 & 3)];
		rgba[4 + i * 4 + 1] = codes[4 * (packed >> 2 & 3) + 1];
		rgba[4 + i * 4 + 2] = codes[4 * (packed >> 2 & 3) + 2];
		rgba[4 + i * 4 + 3] = codes[4 * (packed >> 2 & 3) + 3];
		rgba[8 + i * 4] = codes[4 * (packed >> 4 & 3)];
		rgba[8 + i * 4 + 1] = codes[4 * (packed >> 4 & 3) + 1];
		rgba[8 + i * 4 + 2] = codes[4 * (packed >> 4 & 3) + 2];
		rgba[8 + i * 4 + 3] = codes[4 * (packed >> 4 & 3) + 3];
		rgba[12 + i * 4] = codes[4 * (packed >> 6 & 3)];
		rgba[12 + i * 4 + 1] = codes[4 * (packed >> 6 & 3) + 1];
		rgba[12 + i * 4 + 2] = codes[4 * (packed >> 6 & 3) + 2];
		rgba[12 + i * 4 + 3] = codes[4 * (packed >> 6 & 3) + 3];
	}
	if (dxt3) for (let i = 0; i < 8; i++) {
		const quant = block[blockPos + i];
		const lo = quant & 15;
		const hi = quant & 240;
		rgba[8 * i + 3] = lo | lo << 4;
		rgba[8 * i + 7] = hi | hi >> 4;
	}
	else if (dxt5) {
		const alpha0 = block[blockPos];
		const alpha1 = block[blockPos + 1];
		const codesA = /* @__PURE__ */ new Uint8Array(8);
		codesA[0] = alpha0;
		codesA[1] = alpha1;
		if (alpha0 <= alpha1) {
			for (let i = 1; i < 5; i++) codesA[1 + i] = ((5 - i) * alpha0 + i * alpha1) / 5;
			codesA[6] = 0;
			codesA[7] = 255;
		} else for (let i = 1; i < 7; i++) codesA[i + 1] = ((7 - i) * alpha0 + i * alpha1) / 7;
		let srcPos = 2;
		let idxPos = 0;
		for (let i = 0; i < 2; i++) {
			let value = 0;
			for (let j = 0; j < 3; j++) value |= block[blockPos + srcPos++] << 8 * j;
			for (let j = 0; j < 8; j++) {
				const index = value >> 3 * j & 7;
				rgba[4 * idxPos + 3] = codesA[index];
				idxPos++;
			}
		}
	}
}
/** Decode a DXT1/3/5 texture into RGBA8888. */
function decodeDxt(w, h, src, format) {
	const out = new Uint8Array(w * h * 4);
	const bytesPerBlock = format === "dxt1" ? 8 : 16;
	const dxt1 = format === "dxt1";
	const dxt3 = format === "dxt3";
	const dxt5 = format === "dxt5";
	const block = /* @__PURE__ */ new Uint8Array(16);
	let srcPos = 0;
	for (let y = 0; y < h; y += 4) for (let x = 0; x < w; x += 4) {
		if (srcPos + bytesPerBlock > src.length) break;
		block.set(src.subarray(srcPos, srcPos + bytesPerBlock));
		const rgba = /* @__PURE__ */ new Uint8Array(64);
		decompressBlock(rgba, block, 0, dxt1, dxt3, dxt5);
		let pixel = 0;
		for (let py = 0; py < 4; py++) for (let px = 0; px < 4; px++) {
			const sx = x + px;
			const sy = y + py;
			if (sx < w && sy < h) {
				const target = 4 * (w * sy + sx);
				out[target] = rgba[pixel];
				out[target + 1] = rgba[pixel + 1];
				out[target + 2] = rgba[pixel + 2];
				out[target + 3] = rgba[pixel + 3];
			}
			pixel += 4;
		}
		srcPos += bytesPerBlock;
	}
	return out;
}
const CRC_TABLE = (() => {
	const table = /* @__PURE__ */ new Uint32Array(256);
	for (let n = 0; n < 256; n++) {
		let c = n;
		for (let k = 0; k < 8; k++) c = c & 1 ? 3988292384 ^ c >>> 1 : c >>> 1;
		table[n] = c >>> 0;
	}
	return table;
})();
function crc32(bytes) {
	let c = 4294967295;
	for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 255] ^ c >>> 8;
	return (c ^ 4294967295) >>> 0;
}
function pngChunk(type, data) {
	const typeBytes = new TextEncoder().encode(type);
	const out = new Uint8Array(12 + data.length);
	const view = new DataView(out.buffer);
	view.setUint32(0, data.length);
	out.set(typeBytes, 4);
	out.set(data, 8);
	view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
	return out;
}
/** Encode RGBA8888 pixels as a PNG (8-bit, color type 6, zlib deflate). */
function rgbaToPng(width, height, rgba) {
	const ihdr = /* @__PURE__ */ new Uint8Array(13);
	const view = new DataView(ihdr.buffer);
	view.setUint32(0, width);
	view.setUint32(4, height);
	ihdr[8] = 8;
	ihdr[9] = 6;
	ihdr[10] = 0;
	ihdr[11] = 0;
	ihdr[12] = 0;
	const raw = new Uint8Array(height * (1 + width * 4));
	for (let y = 0; y < height; y++) {
		raw[y * (1 + width * 4)] = 0;
		raw.set(rgba.subarray(y * width * 4, (y + 1) * width * 4), y * (1 + width * 4) + 1);
	}
	const idat = deflateSync(raw, { level: 6 });
	const parts = [
		new Uint8Array([
			137,
			80,
			78,
			71,
			13,
			10,
			26,
			10
		]),
		pngChunk("IHDR", ihdr),
		pngChunk("IDAT", idat),
		pngChunk("IEND", /* @__PURE__ */ new Uint8Array(0))
	];
	const total = parts.reduce((sum, part) => sum + part.length, 0);
	const out = new Uint8Array(total);
	let pos = 0;
	for (const part of parts) {
		out.set(part, pos);
		pos += part.length;
	}
	return out;
}
/** Crop RGBA to imageW x imageH (top-left, matching ImageSharp Crop). */
function cropRgba(rgba, texW, texH, imageW, imageH) {
	if (texW === imageW && texH === imageH) return rgba;
	const out = new Uint8Array(imageW * imageH * 4);
	for (let y = 0; y < imageH; y++) for (let x = 0; x < imageW; x++) {
		const src = 4 * (texW * y + x);
		const dst = 4 * (imageW * y + x);
		out[dst] = rgba[src];
		out[dst + 1] = rgba[src + 1];
		out[dst + 2] = rgba[src + 2];
		out[dst + 3] = rgba[src + 3];
	}
	return out;
}
/** FreeImage format ids used inside TEXB0003 containers (u32-unsigned reads). */
const FIF_UNKNOWN = 4294967295;
const FIF_JPEG = 2;
const FIF_PNG = 13;
/** Read one mipmap record (V1/V2+3/V4) at pos; returns the record + next pos. */
function readMipmap(buf, p, version) {
	if (version === 1) {
		if (p + 12 > buf.length) return null;
		const width = readU32(buf, p);
		const height = readU32(buf, p + 4);
		const byteCount = readU32(buf, p + 8);
		if (byteCount > 512 * 1024 * 1024 || p + 12 + byteCount > buf.length) return null;
		return {
			width,
			height,
			data: buf.subarray(p + 12, p + 12 + byteCount),
			next: p + 12 + byteCount
		};
	}
	if (p + 20 > buf.length) return null;
	const width = readU32(buf, p);
	const height = readU32(buf, p + 4);
	const isLz4 = readU32(buf, p + 8) === 1;
	const decompressedLen = readU32(buf, p + 12);
	const byteCount = readU32(buf, p + 16);
	if (byteCount > 512 * 1024 * 1024 || p + 20 + byteCount > buf.length) return null;
	let data = buf.subarray(p + 20, p + 20 + byteCount);
	if (isLz4) {
		const decoded = lz4BlockDecode(data, decompressedLen);
		if (decoded === null) return null;
		data = decoded;
	}
	return {
		width,
		height,
		data,
		next: p + 20 + byteCount
	};
}
/**
* Decode one TEX entry's first image / first mipmap. Embedded image
* containers (FIF_PNG / FIF_JPEG) pass the bytes through; raw containers
* decode per the TEX format (RGBA8888 / DXT1/3/5 / RG88 / R8).
*/
function decodeTexEntry(buf, texAbs, header) {
	let p = texAbs + 18 + 28;
	const containerMagic = readNString(buf, p, 16);
	if (!containerMagic.startsWith("TEXB")) return null;
	p += containerMagic.length + 1;
	const imageCount = readU32(buf, p);
	p += 4;
	if (imageCount === 0 || imageCount > 64) return null;
	const version = Number(containerMagic.slice(4)) || 1;
	let imageFormat = FIF_UNKNOWN;
	if (version >= 3) {
		imageFormat = readU32(buf, p);
		p += 4;
	}
	if (version >= 4) p += 4;
	const mipmapCount = readU32(buf, p);
	p += 4;
	if (mipmapCount === 0 || mipmapCount > 64) return null;
	const mipmap = readMipmap(buf, p, version === 1 ? 1 : 2);
	if (mipmap === null) return null;
	const width = header.imageWidth || mipmap.width;
	const height = header.imageHeight || mipmap.height;
	if (imageFormat === FIF_PNG || imageFormat === FIF_JPEG) return {
		kind: "image",
		bytes: mipmap.data,
		mime: imageFormat === FIF_PNG ? "image/png" : "image/jpeg",
		width: mipmap.width || width,
		height: mipmap.height || height
	};
	const format = imageFormat === FIF_UNKNOWN ? header.format : imageFormat;
	let rgba = null;
	switch (format) {
		case 0:
			if (mipmap.data.length >= mipmap.width * mipmap.height * 4) rgba = mipmap.data.subarray(0, mipmap.width * mipmap.height * 4);
			break;
		case 4:
			rgba = decodeDxt(mipmap.width, mipmap.height, mipmap.data, "dxt5");
			break;
		case 6:
			rgba = decodeDxt(mipmap.width, mipmap.height, mipmap.data, "dxt3");
			break;
		case 7:
			rgba = decodeDxt(mipmap.width, mipmap.height, mipmap.data, "dxt1");
			break;
		case 8:
			if (mipmap.data.length >= mipmap.width * mipmap.height * 2) rgba = decodeRg88(mipmap.data, mipmap.width, mipmap.height);
			break;
		case 9:
			if (mipmap.data.length >= mipmap.width * mipmap.height) rgba = decodeR8(mipmap.data, mipmap.width, mipmap.height);
			break;
		default: return null;
	}
	if (rgba === null) return null;
	return {
		kind: "rgba",
		rgba: cropRgba(rgba, mipmap.width, mipmap.height, width, height),
		width,
		height
	};
}
/**
* Normalize a package-internal path for case-insensitive matching.
*/
function normalizePkgPath(value) {
	return value.replace(/\\/g, "/").replace(/^\.\//, "").replace(/\/+/g, "/").toLowerCase();
}
/** Parse one bounded JSON package entry. */
function parseJsonEntry(buf, entry) {
	if (entry === void 0 || entry.length <= 0 || entry.length > 16 * 1024 * 1024) return null;
	try {
		const raw = JSON.parse(utf8(buf, entry.abs, entry.abs + entry.length).replace(/^\uFEFF/, ""));
		return typeof raw === "object" && raw !== null && !Array.isArray(raw) ? raw : null;
	} catch {
		return null;
	}
}
/** Parse a Wallpaper Engine vector string's first two finite values. */
function vec2(value) {
	const parts = typeof value === "string" ? value.trim().split(/\s+/).map(Number) : Array.isArray(value) ? value.slice(0, 2).map(Number) : [];
	return parts.length >= 2 && Number.isFinite(parts[0]) && Number.isFinite(parts[1]) ? [parts[0], parts[1]] : null;
}
/** Wallpaper Engine visibility can be a boolean or a user-property object. */
function isVisible(value) {
	if (value === false) return false;
	if (typeof value === "object" && value !== null && !Array.isArray(value)) return value.value !== false;
	return true;
}
/** Resolve a texture name from model -> material -> texture references. */
function resolveModelTexture(buf, entries, modelPath) {
	const modelKey = normalizePkgPath(modelPath);
	const model = parseJsonEntry(buf, entries.get(modelKey));
	if (model === null || typeof model.material !== "string") return null;
	const materialPath = normalizePkgPath(model.material);
	const material = parseJsonEntry(buf, entries.get(materialPath));
	if (material === null || !Array.isArray(material.passes)) return null;
	for (const pass of material.passes) {
		if (typeof pass !== "object" || pass === null || Array.isArray(pass)) continue;
		const textures = pass.textures;
		if (!Array.isArray(textures)) continue;
		for (const texture of textures) {
			if (typeof texture !== "string" || texture.trim() === "") continue;
			const clean = normalizePkgPath(texture).replace(/\.tex$/i, "");
			const matched = [
				`${materialPath.includes("/") ? materialPath.slice(0, materialPath.lastIndexOf("/")) : ""}/${clean}.tex`,
				`${clean}.tex`,
				`materials/${clean}.tex`
			].map(normalizePkgPath).find((candidate) => entries.has(candidate));
			if (matched !== void 0) return entries.get(matched)?.name ?? null;
		}
	}
	return null;
}
/**
* Return scene-graph texture references in preference order. The score favors
* visible image objects matching the orthographic canvas, neutral parallax,
* early render order and explicit background/backdrop names.
*/
function findSceneBackgroundTextures(buf, pkg) {
	const entries = new Map(pkg.entries.map((entry) => [normalizePkgPath(entry.name), entry]));
	const scene = parseJsonEntry(buf, entries.get("scene.json"));
	if (scene === null || !Array.isArray(scene.objects)) return [];
	const objects = scene.objects;
	const general = typeof scene.general === "object" && scene.general !== null && !Array.isArray(scene.general) ? scene.general : {};
	const projection = typeof general.orthogonalprojection === "object" && general.orthogonalprojection !== null && !Array.isArray(general.orthogonalprojection) ? general.orthogonalprojection : {};
	const canvasWidth = typeof projection.width === "number" && projection.width > 0 ? projection.width : 1920;
	const canvasHeight = typeof projection.height === "number" && projection.height > 0 ? projection.height : 1080;
	const canvasRatio = canvasWidth / canvasHeight;
	const ranked = [];
	objects.forEach((raw, index) => {
		if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return;
		const object = raw;
		if (!isVisible(object.visible) || typeof object.image !== "string") return;
		const imagePath = normalizePkgPath(object.image);
		if (imagePath.includes("/util/") || imagePath.includes("composelayer") || imagePath.includes("fullscreenlayer")) return;
		const texture = resolveModelTexture(buf, entries, object.image);
		if (texture === null) return;
		const size = vec2(object.size);
		const width = Math.abs(size?.[0] ?? canvasWidth);
		const height = Math.abs(size?.[1] ?? canvasHeight);
		if (width <= 0 || height <= 0) return;
		const ratio = width / height;
		const sizeFit = Math.min(width / canvasWidth, canvasWidth / width) * Math.min(height / canvasHeight, canvasHeight / height);
		const ratioFit = Math.max(0, 1 - Math.abs(Math.log(ratio / canvasRatio)));
		const parallax = vec2(object.parallaxDepth);
		const neutralDepth = parallax !== null && Math.abs(parallax[0]) <= .001 && Math.abs(parallax[1]) <= .001 ? .5 : 0;
		const name = typeof object.name === "string" ? object.name.toLowerCase() : "";
		const nameBonus = /background|backdrop|背景|底图|背景图/.test(name) ? 4 : 0;
		const orderBonus = (objects.length - index) / Math.max(1, objects.length) * .1;
		ranked.push({
			texture,
			score: nameBonus + sizeFit * 3 + ratioFit * 2 + neutralDepth + orderBonus
		});
	});
	ranked.sort((a, b) => b.score - a.score);
	return [...new Set(ranked.map((item) => item.texture))];
}
/** Decode one selected candidate to an image response. */
function decodeCandidate(buf, candidate) {
	const decoded = decodeTexEntry(buf, candidate.abs, candidate);
	if (decoded === null) return null;
	return decoded.kind === "image" ? {
		bytes: decoded.bytes,
		mime: decoded.mime,
		width: decoded.width,
		height: decoded.height
	} : {
		bytes: rgbaToPng(decoded.width, decoded.height, decoded.rgba),
		mime: "image/png",
		width: decoded.width,
		height: decoded.height
	};
}
/**
* Extract the most background-like texture of a scene.pkg and report why it
* was selected. Scene graph references win; aspect scoring is the fallback.
*
* Scenes are a stack of textures (background, character, hair, masks) with
* no direct "background" marker in scene.json, so the heuristic scores
* candidates by pixel area times an aspect-ratio bonus: landscape
* (16:9-ish) textures are overwhelmingly the background plate, while
* portrait character sprites score low. Embedded-image textures (FIF_PNG /
* FIF_JPEG) are returned as-is; raw formats are decoded and PNG-encoded.
* Returns null when nothing decodes.
*/
function extractBackgroundWithDiagnostics(buf, opts = {}) {
	const pkg = parsePackage(buf);
	if (pkg === null) return null;
	const candidates = findTexCandidates(buf, pkg);
	const byName = new Map(candidates.map((candidate) => [normalizePkgPath(candidate.name), candidate]));
	for (const selectedTex of findSceneBackgroundTextures(buf, pkg)) {
		const candidate = byName.get(normalizePkgPath(selectedTex));
		if (candidate === void 0) continue;
		const decoded = decodeCandidate(buf, candidate);
		if (decoded !== null) return {
			...decoded,
			source: "scene-graph",
			selectedTex: candidate.name,
			packageMagic: pkg.magic
		};
	}
	if (opts.heuristic === false) return null;
	let best = null;
	let bestScore = 0;
	for (const candidate of candidates) {
		const width = candidate.imageWidth || candidate.textureWidth;
		const height = candidate.imageHeight || candidate.textureHeight;
		if (width === 0 || height === 0) continue;
		const ratio = width / height;
		const aspectScore = Math.max(0, 1 - Math.abs(ratio - 16 / 9) / 1.2);
		const score = width * height * aspectScore;
		if (score <= bestScore) continue;
		const decoded = decodeCandidate(buf, candidate);
		if (decoded === null) continue;
		best = {
			...decoded,
			source: "heuristic",
			selectedTex: candidate.name,
			packageMagic: pkg.magic
		};
		bestScore = score;
	}
	return best;
}
/** Backwards-compatible image-only extraction API. */
function extractBackgroundPng(buf) {
	return extractBackgroundWithDiagnostics(buf);
}
function readU32(buf, pos) {
	return (buf[pos] | buf[pos + 1] << 8 | buf[pos + 2] << 16 | buf[pos + 3] << 24) >>> 0;
}
function utf8(buf, start, end) {
	return new TextDecoder("utf-8", { fatal: false }).decode(buf.subarray(start, end));
}
//#endregion
//#region src/pkg-preview.ts
/**
* Safe scene.pkg background extraction and cache. Resolution order:
* scene graph -> optional user-installed RePKG -> built-in heuristic.
*/
const CACHE_DIR_NAME = "we-wallpaper-cache";
const CACHE_VERSION = 2;
const MAX_PKG_BYTES = 1024 * 1024 * 1024;
const MAX_EXTRACTED_IMAGE_BYTES = 256 * 1024 * 1024;
const REPKG_TIMEOUT_MS = 3e4;
/** TIANLIGHT: cache root = `<runtimeHome>/we-wallpaper-cache` (or a passed home). */
function cacheDir(home = "") {
	return join(home !== "" ? home : runtimeHome(), CACHE_DIR_NAME);
}
// TIANLIGHT: these helpers take the cache key (numeric workshop id, or a hash
// for local projects), not necessarily a workshop id.
function cachedFilePath(cacheKey, home = "") {
	return join(cacheDir(home), cacheKey);
}
function cachedMetaPath(cacheKey, home = "") {
	return join(cacheDir(home), `${cacheKey}.json`);
}
function readCacheMeta(cacheKey, home = "") {
	try {
		const raw = JSON.parse(readFileSync(cachedMetaPath(cacheKey, home), "utf8"));
		if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null;
		const record = raw;
		if (record.version !== CACHE_VERSION) return null;
		const mime = record.mime === "image/jpeg" ? "image/jpeg" : record.mime === "image/png" ? "image/png" : null;
		const source = record.source === "scene-graph" || record.source === "repkg" || record.source === "heuristic" ? record.source : null;
		const sceneMode = record.sceneMode === "static-hd" || record.sceneMode === "animated-first" ? record.sceneMode : null;
		if (mime === null || source === null || sceneMode === null) return null;
		const number = (value) => typeof value === "number" && Number.isFinite(value) ? value : 0;
		return {
			version: CACHE_VERSION,
			mime,
			width: number(record.width),
			height: number(record.height),
			at: number(record.at),
			pkgMtimeMs: number(record.pkgMtimeMs),
			pkgSize: number(record.pkgSize),
			sceneMode,
			source,
			selectedTex: typeof record.selectedTex === "string" ? record.selectedTex : null,
			packageMagic: typeof record.packageMagic === "string" ? record.packageMagic : null,
			fallbackReason: typeof record.fallbackReason === "string" ? record.fallbackReason : null
		};
	} catch {
		return null;
	}
}
/**
 * TIANLIGHT: the scene.pkg for one scanner entry. Workshop projects keep it in
 * the workshop content dir; local projects (projects/myprojects|defaultprojects)
 * keep it in the project dir itself (or at `entry.file` when that names a
 * .pkg). Local loose-scene projects (`scene.json`) legitimately have none.
 */
function scenePkgForEntry(entry, workshopDirs) {
	const candidates = [];
	if (typeof entry?.workshopId === "string" && /^\d+$/.test(entry.workshopId)) {
		for (const dir of workshopDirs) candidates.push(join(dir, entry.workshopId, "scene.pkg"));
	}
	if (typeof entry?.file === "string" && /\.pkg$/i.test(entry.file) && !/[\\/]/.test(entry.file)) candidates.push(join(entry.dir, entry.file));
	candidates.push(join(entry.dir, "scene.pkg"));
	for (const candidate of candidates) {
		if (existsSync(candidate)) return candidate;
	}
	return null;
}
/**
 * TIANLIGHT: stable cache-file key for an entry. Workshop ids are numeric; local
 * ids are directory names that may contain spaces/CJK, so they are hashed to a
 * plain filename segment.
 */
function cacheKeyForEntry(entry) {
	if (/^\d+$/.test(entry.id)) return entry.id;
	return "local-" + createHash("sha1").update(entry.id + "\u0000" + entry.dir).digest("hex").slice(0, 20);
}
function imageInfo(bytes, extension) {
	if (extension === ".png" && bytes.length >= 24 && bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71) {
		const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
		return {
			mime: "image/png",
			width: view.getUint32(16),
			height: view.getUint32(20)
		};
	}
	if ((extension === ".jpg" || extension === ".jpeg") && bytes.length >= 4 && bytes[0] === 255 && bytes[1] === 216) {
		let pos = 2;
		while (pos + 9 < bytes.length) {
			if (bytes[pos] !== 255) {
				pos++;
				continue;
			}
			const marker = bytes[pos + 1];
			const length = bytes[pos + 2] << 8 | bytes[pos + 3];
			if (length < 2 || pos + 2 + length > bytes.length) break;
			if (marker >= 192 && marker <= 195 || marker >= 197 && marker <= 199 || marker >= 201 && marker <= 203 || marker >= 205 && marker <= 207) return {
				mime: "image/jpeg",
				height: bytes[pos + 5] << 8 | bytes[pos + 6],
				width: bytes[pos + 7] << 8 | bytes[pos + 8]
			};
			pos += 2 + length;
		}
	}
	return null;
}
function listImageFiles(dir) {
	const out = [];
	const visit = (current, depth) => {
		if (depth > 3 || out.length >= 4096) return;
		let entries;
		try {
			entries = readdirSync(current, { withFileTypes: true });
		} catch {
			return;
		}
		for (const entry of entries) {
			const abs = join(current, entry.name);
			if (entry.isDirectory()) visit(abs, depth + 1);
			else if ([
				".png",
				".jpg",
				".jpeg"
			].includes(extname(entry.name).toLowerCase())) out.push(abs);
			if (out.length >= 4096) return;
		}
	};
	visit(dir, 0);
	return out;
}
function baseTextureName(value) {
	return basename(value.replace(/\\/g, "/")).replace(/\.(tex|png|jpe?g)$/i, "").toLowerCase();
}
function isUsableRePkg(value) {
	if (value === "" || !isAbsolute(value)) return false;
	try {
		return statSync(value, { throwIfNoEntry: false })?.isFile() === true;
	} catch {
		return false;
	}
}
function runRePkgExtractor(repkgPath, pkgPath, outputDir, preferredTex, spawnImpl = spawnSync) {
	const executable = repkgPath.trim();
	if (executable === "") return {
		image: null,
		selectedTex: null,
		reason: "repkg-not-configured"
	};
	if (!isAbsolute(executable)) return {
		image: null,
		selectedTex: null,
		reason: "repkg-path-not-absolute"
	};
	if (!isUsableRePkg(executable)) return {
		image: null,
		selectedTex: null,
		reason: "repkg-executable-not-found"
	};
	mkdirSync(outputDir, { recursive: true });
	let result;
	try {
		result = spawnImpl(executable, [
			"extract",
			"-e",
			"tex",
			"-s",
			"-o",
			outputDir,
			"--overwrite",
			pkgPath
		], {
			encoding: "utf8",
			windowsHide: true,
			timeout: REPKG_TIMEOUT_MS,
			maxBuffer: 1024 * 1024
		});
	} catch {
		return {
			image: null,
			selectedTex: null,
			reason: "repkg-launch-failed"
		};
	}
	if (result.error?.message.toLowerCase().includes("timeout")) return {
		image: null,
		selectedTex: null,
		reason: "repkg-timeout"
	};
	if (result.error !== void 0 || result.status !== 0) return {
		image: null,
		selectedTex: null,
		reason: "repkg-extract-failed"
	};
	const preferredName = preferredTex === null ? null : baseTextureName(preferredTex);
	let best = null;
	for (const file of listImageFiles(outputDir)) {
		const stat = statSync(file, { throwIfNoEntry: false });
		if (stat === void 0 || !stat.isFile() || stat.size <= 0 || stat.size > MAX_EXTRACTED_IMAGE_BYTES) continue;
		let bytes;
		try {
			bytes = readFileSync(file);
		} catch {
			continue;
		}
		const info = imageInfo(bytes, extname(file).toLowerCase());
		if (info === null || info.width <= 0 || info.height <= 0) continue;
		const exact = preferredName !== null && baseTextureName(file) === preferredName;
		const ratio = info.width / info.height;
		const aspectScore = Math.max(0, 1 - Math.abs(ratio - 16 / 9) / 1.2);
		const score = (exact ? Number.MAX_SAFE_INTEGER / 2 : 0) + info.width * info.height * aspectScore;
		if (best === null || score > best.score) best = {
			file,
			info,
			score
		};
	}
	if (best === null) return {
		image: null,
		selectedTex: null,
		reason: "repkg-produced-no-image"
	};
	return {
		image: {
			bytes: readFileSync(best.file),
			mime: best.info.mime,
			width: best.info.width,
			height: best.info.height
		},
		selectedTex: preferredTex ?? basename(best.file),
		reason: null
	};
}
function previewFromMeta(cacheKey, meta, home, cacheHit) {
	return {
		file: cachedFilePath(cacheKey, home),
		mime: meta.mime,
		width: meta.width,
		height: meta.height,
		source: meta.source,
		selectedTex: meta.selectedTex,
		packageMagic: meta.packageMagic,
		fallbackReason: meta.fallbackReason,
		cacheHit
	};
}
function resolvePkgPreviewDetailed(entry, workshopDirs, opts = {}) {
	const home = opts.home ?? "";
	const now = opts.now ?? Date.now();
	const sceneMode = opts.sceneMode ?? "static-hd";
	const repkgPath = opts.repkgPath?.trim() ?? "";
	// TIANLIGHT: entry-based instead of workshop-id-based, so local scene.pkg
	// projects extract exactly like workshop ones.
	const cacheKey = cacheKeyForEntry(entry);
	const pkgPath = scenePkgForEntry(entry, workshopDirs);
	const baseDiagnostics = {
		workshopId: entry.workshopId,
		pkgFound: pkgPath !== null,
		pkgPath,
		pkgSize: null,
		pkgMtimeMs: null,
		repkgConfigured: repkgPath !== "",
		repkgUsable: isUsableRePkg(repkgPath),
		source: null,
		selectedTex: null,
		packageMagic: null,
		fallbackReason: pkgPath === null ? "scene-package-not-found" : null,
		cacheHit: false
	};
	if (pkgPath === null) return {
		preview: null,
		diagnostics: baseDiagnostics
	};
	const pkgStat = statSync(pkgPath, { throwIfNoEntry: false });
	if (pkgStat === void 0 || !pkgStat.isFile() || pkgStat.size <= 0 || pkgStat.size > MAX_PKG_BYTES) return {
		preview: null,
		diagnostics: {
			...baseDiagnostics,
			fallbackReason: "scene-package-size-invalid"
		}
	};
	baseDiagnostics.pkgSize = pkgStat.size;
	baseDiagnostics.pkgMtimeMs = pkgStat.mtimeMs;
	const meta = readCacheMeta(cacheKey, home);
	const file = cachedFilePath(cacheKey, home);
	if (meta !== null && existsSync(file) && meta.pkgMtimeMs === pkgStat.mtimeMs && meta.pkgSize === pkgStat.size && meta.sceneMode === sceneMode) {
		const preview = previewFromMeta(cacheKey, meta, home, true);
		return {
			preview,
			diagnostics: {
				...baseDiagnostics,
				source: preview.source,
				selectedTex: preview.selectedTex,
				packageMagic: preview.packageMagic,
				fallbackReason: preview.fallbackReason,
				cacheHit: true
			}
		};
	}
	let buf;
	try {
		buf = readFileSync(pkgPath);
	} catch {
		return {
			preview: null,
			diagnostics: {
				...baseDiagnostics,
				fallbackReason: "scene-package-read-failed"
			}
		};
	}
	const pkg = parsePackage(buf);
	if (pkg === null) return {
		preview: null,
		diagnostics: {
			...baseDiagnostics,
			fallbackReason: "scene-package-unsupported"
		}
	};
	let extraction = extractBackgroundWithDiagnostics(buf, { heuristic: false });
	let source = extraction?.source ?? null;
	let selectedTex = extraction?.selectedTex ?? findSceneBackgroundTextures(buf, pkg)[0] ?? null;
	let fallbackReason = extraction === null ? "scene-graph-texture-unavailable" : null;
	let image = extraction;
	const repkgTmp = join(cacheDir(home), `.repkg-${cacheKey}-${process.pid}-${now}`);
	if (image === null) try {
		const repkg = runRePkgExtractor(repkgPath, pkgPath, repkgTmp, selectedTex, opts.spawnImpl);
		if (repkg.image !== null) {
			image = repkg.image;
			source = "repkg";
			selectedTex = repkg.selectedTex ?? selectedTex;
		} else fallbackReason = `${fallbackReason};${repkg.reason ?? "repkg-failed"}`;
	} finally {
		try {
			rmSync(repkgTmp, {
				recursive: true,
				force: true
			});
		} catch {}
	}
	if (image === null) {
		extraction = extractBackgroundWithDiagnostics(buf);
		if (extraction !== null) {
			image = extraction;
			source = extraction.source;
			selectedTex = extraction.selectedTex;
			fallbackReason = `${fallbackReason};heuristic-fallback`;
		}
	}
	if (image === null || source === null) return {
		preview: null,
		diagnostics: {
			...baseDiagnostics,
			packageMagic: pkg.magic,
			selectedTex,
			fallbackReason: `${fallbackReason};no-decodable-background`
		}
	};
	const nextMeta = {
		version: CACHE_VERSION,
		mime: image.mime,
		width: image.width,
		height: image.height,
		at: now,
		pkgMtimeMs: pkgStat.mtimeMs,
		pkgSize: pkgStat.size,
		sceneMode,
		source,
		selectedTex,
		packageMagic: pkg.magic,
		fallbackReason
	};
	try {
		mkdirSync(cacheDir(home), { recursive: true });
		const tmp = `${file}.tmp-${process.pid}`;
		writeFileSync(tmp, image.bytes);
		renameSync(tmp, file);
		writeFileSync(cachedMetaPath(cacheKey, home), JSON.stringify(nextMeta), "utf8");
		return {
			preview: previewFromMeta(cacheKey, nextMeta, home, false),
			diagnostics: {
				...baseDiagnostics,
				source,
				selectedTex,
				packageMagic: pkg.magic,
				fallbackReason,
				cacheHit: false
			}
		};
	} catch {
		return {
			preview: null,
			diagnostics: {
				...baseDiagnostics,
				fallbackReason: "cache-write-failed"
			}
		};
	}
}
function resolvePkgPreview(entry, workshopDirs, opts = {}) {
	return resolvePkgPreviewDetailed(entry, workshopDirs, opts).preview;
}
/** Fallback capture size when the physical monitor size cannot be probed. */
const SCENE_VIDEO_WIDTH = 1920;
const SCENE_VIDEO_HEIGHT = 1080;
let activeRecorder = null;
let activeLocation = null;
let activeInstall = null;
const statuses = /* @__PURE__ */ new Map();
function now() {
	return (/* @__PURE__ */ new Date()).toISOString();
}
function sceneVideoDir(home = "") {
	return join(cacheDir(home), "hd-video");
}
function sceneVideoCachePath(id, home = "") {
	return join(sceneVideoDir(home), `${id}.mp4`);
}
function sceneVideoMetaPath(id, home = "") {
	return join(sceneVideoDir(home), `${id}.json`);
}
function projectMtime(entry) {
	return statSync(join(entry.dir, "project.json"), { throwIfNoEntry: false })?.mtimeMs ?? -1;
}
function readValidMeta(entry, home = "") {
	const video = sceneVideoCachePath(entry.id, home);
	const metaPath = sceneVideoMetaPath(entry.id, home);
	try {
		const stat = statSync(video);
		if (!stat.isFile() || stat.size < 512 * 1024) return null;
		const raw = JSON.parse(readFileSync(metaPath, "utf8"));
		if (raw.version !== 2 || raw.id !== entry.id || raw.projectMtimeMs !== projectMtime(entry) || typeof raw.width !== "number" || !Number.isInteger(raw.width) || raw.width < 640 || typeof raw.height !== "number" || !Number.isInteger(raw.height) || raw.height < 480 || typeof raw.createdAt !== "string") return null;
		return raw;
	} catch {
		return null;
	}
}
function baseStatus(entry, phase) {
	return {
		id: entry.id,
		phase,
		progress: phase === "ready" ? 100 : 0,
		file: phase === "ready" ? sceneVideoCachePath(entry.id) : null,
		width: SCENE_VIDEO_WIDTH,
		height: SCENE_VIDEO_HEIGHT,
		duration: 12,
		error: null,
		startedAt: null,
		updatedAt: now()
	};
}
function getSceneVideoStatus(entry) {
	const current = statuses.get(entry.id);
	if (current?.phase === "capturing" || current?.phase === "error") return { ...current };
	const meta = readValidMeta(entry);
	if (meta !== null) {
		const ready = {
			...baseStatus(entry, "ready"),
			width: meta.width,
			height: meta.height
		};
		statuses.set(entry.id, ready);
		return { ...ready };
	}
	return { ...current ?? baseStatus(entry, "idle") };
}
/**
 * TIANLIGHT: plugin root. This file lives at `<plugin>/lib/we-wallpaper/host.mjs`
 * (upstream it was `<plugin>/lib/index.js`, hence the extra `dirname`).
 */
function packageRoot() {
	return dirname(dirname(dirname(fileURLToPath(import.meta.url))));
}
/**
 * TIANLIGHT: runtime home for state + caches. Upstream wrote into `~/.dsh`;
 * the skin keeps its per-machine runtime data inside the gitignored plugin
 * `state/` dir, with `TIANLIGHT_WE_HOME` as an explicit override (tests,
 * sandboxes). Nothing here touches the user's existing `~/.dsh` files.
 */
function runtimeHome() {
	const override = process.env.TIANLIGHT_WE_HOME;
	if (typeof override === "string" && override.trim() !== "") return resolve(override.trim());
	return join(packageRoot(), "state");
}
/** TIANLIGHT: the vendored recorder/adapter tools ship under `vendor/`. */
function bundledTool(name) {
	return join(packageRoot(), "vendor", "we-wallpaper", "wcap", name);
}
/** TIANLIGHT: whether scene-video recording can even be attempted here. */
function sceneVideoUnsupportedReason() {
	if (process.env.TIANLIGHT_WE_DISABLE_SCENE_VIDEO === "1") return "disabled-by-configuration";
	if (process.platform !== "win32") return "windows-required";
	for (const name of ["wcap-x64.exe", "scene-capture-desktop.ps1", "send-window-capture-hotkey.ps1"]) {
		if (!existsSync(bundledTool(name))) return "wcap-tool-not-found";
	}
	return null;
}
function weExecutable(install) {
	for (const name of ["wallpaper64.exe", "wallpaper32.exe"]) {
		const candidate = join(install.root, name);
		if (existsSync(candidate)) return candidate;
	}
	return null;
}
/**
* Windows PowerShell with an absolute path: the packaged desktop host runs
* with a minimal PATH where a bare `powershell.exe` may not resolve.
*/
function powershellExecutable() {
	const absolute = join(process.env.SystemRoot ?? process.env.windir ?? "C:\\Windows", "System32", "WindowsPowerShell", "v1.0", "powershell.exe");
	return existsSync(absolute) ? absolute : "powershell.exe";
}
/** The primary monitor's physical pixel size (DPI-aware probe). */
async function probeMonitorSize() {
	try {
		const out = spawnSync(powershellExecutable(), [
			"-NoProfile",
			"-NonInteractive",
			"-WindowStyle",
			"Hidden",
			"-ExecutionPolicy",
			"Bypass",
			"-File",
			bundledTool("scene-capture-desktop.ps1"),
			"-Action",
			"monitor"
		], {
			encoding: "utf8",
			shell: false,
			windowsHide: true,
			timeout: 1e4
		});
		const match = /^(\d{2,5})x(\d{2,5})\s*$/m.exec(out.stdout ?? "");
		if (out.status === 0 && match !== null) {
			const width = Number(match[1]);
			const height = Number(match[2]);
			if (width >= 640 && height >= 480) return {
				width,
				height
			};
		}
	} catch {}
	return {
		width: SCENE_VIDEO_WIDTH,
		height: SCENE_VIDEO_HEIGHT
	};
}
function delay(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
/** The deterministic recorder configuration written beside the runtime exe. */
function wcapIni(outputFolder, seconds = 12, width = SCENE_VIDEO_WIDTH, height = SCENE_VIDEO_HEIGHT) {
	const pixels = width * height;
	return `[wcap]\nMouseCursor=0\nOnlyClientArea=1\nShowRecordingBorder=0\nKeepRoundedWindowCorners=0\nIncludeSecondaryWindows=0\nHardwareEncoder=1\nHardwarePreferIntegrated=0\nOutputFolder=${outputFolder}\nOpenFolder=0\nFragmentedOutput=0\nEnableLimitLength=1\nEnableLimitSize=0\nLimitLength=${seconds}\nLimitSize=500\nGammaCorrectResize=1\nImprovedColorConversion=1\nVideoCodec=H264\nVideoProfile=High\nVideoMaxWidth=${width}\nVideoMaxHeight=${height}\nVideoMaxFramerate=30\nVideoBitrate=${pixels > 2560 * 1440 ? 24e3 : pixels > 1920 * 1080 ? 2e4 : 16e3}\nCaptureAudio=0\nApplicationLocalAudio=0\nAudioCodec=AAC\nAudioChannels=2\nAudioSamplerate=48000\nAudioBitrate=160\nShortcutMonitor=0\nShortcutWindow=167772204\nShortcutRegion=0\n`;
}
function newestMp4(dir) {
	try {
		return readdirSync(dir).filter((name) => name.toLowerCase().endsWith(".mp4")).map((name) => ({
			file: join(dir, name),
			stat: statSync(join(dir, name))
		})).filter(({ stat }) => stat.isFile()).sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs)[0]?.file ?? null;
	} catch {
		return null;
	}
}
function updateProgress(id, progress) {
	const status = statuses.get(id);
	if (status === void 0 || status.phase !== "capturing") return;
	status.progress = Math.max(status.progress, Math.min(95, Math.round(progress)));
	status.updatedAt = now();
}
/** Run one bundled scene-capture-desktop.ps1 action; null when it fails. */
function runDesktopScript(action, title, width, height) {
	try {
		const args = [
			"-NoProfile",
			"-NonInteractive",
			"-WindowStyle",
			"Hidden",
			"-ExecutionPolicy",
			"Bypass",
			"-File",
			bundledTool("scene-capture-desktop.ps1"),
			"-Action",
			action
		];
		if (action === "present") args.push("-Title", title, "-Width", String(width ?? 0), "-Height", String(height ?? 0));
		const out = spawnSync(powershellExecutable(), args, {
			encoding: "utf8",
			shell: false,
			windowsHide: true,
			timeout: 1e4
		});
		return out.status === 0 ? (out.stdout ?? "").trim() : null;
	} catch {
		return null;
	}
}
async function runCapture(entry, install) {
	// TIANLIGHT: never spawn the recorder when the platform/tools/config cannot
	// support it (tests and non-Windows hosts must degrade, not crash).
	const unsupportedReason = sceneVideoUnsupportedReason();
	if (unsupportedReason !== null) throw new Error(`scene-video-unsupported:${unsupportedReason}`);
	const executable = weExecutable(install);
	if (executable === null) throw new Error("wallpaper-engine-executable-not-found");
	const bundledWcap = bundledTool("wcap-x64.exe");
	const hotkeyScript = bundledTool("send-window-capture-hotkey.ps1");
	if (!existsSync(bundledWcap) || !existsSync(hotkeyScript)) throw new Error("wcap-tool-not-found");
	const monitor = await probeMonitorSize();
	const cacheRoot = sceneVideoDir();
	const runtimeDir = join(cacheRoot, "runtime");
	const jobDir = join(cacheRoot, `.job-${entry.id}-${process.pid}-${Date.now()}`);
	mkdirSync(runtimeDir, { recursive: true });
	mkdirSync(jobDir, { recursive: true });
	const runtimeWcap = join(runtimeDir, "wcap-x64.exe");
	copyFileSync(bundledWcap, runtimeWcap);
	writeFileSync(join(runtimeDir, "wcap-x64.ini"), wcapIni(jobDir, 12, monitor.width, monitor.height), "utf8");
	const location = `DSH-WE-Record-${entry.id}`;
	activeLocation = location;
	activeInstall = install;
	try {
		activeRecorder = spawn(runtimeWcap, [], {
			cwd: runtimeDir,
			windowsHide: true,
			stdio: "ignore"
		});
		await delay(700);
		if (activeRecorder.exitCode !== null) throw new Error("wcap-unavailable-or-already-running");
		updateProgress(entry.id, 5);
		const open = spawnSync(executable, [
			"-control",
			"openWallpaper",
			"-file",
			join(entry.dir, "project.json"),
			"-playInWindow",
			location,
			"-width",
			String(monitor.width),
			"-height",
			String(monitor.height),
			"-x",
			"0",
			"-y",
			"0",
			"-activate",
			"-borderless"
		], {
			encoding: "utf8",
			shell: false,
			windowsHide: true,
			timeout: 8e3
		});
		if (open.status !== 0) throw new Error(`wallpaper-engine-open-failed:${open.status ?? "unknown"}`);
		await delay(2200);
		updateProgress(entry.id, 10);
		const presented = runDesktopScript("present", location, monitor.width, monitor.height);
		if (presented !== "ok") throw new Error(`scene-window-present-failed:${presented ?? "script-error"}`);
		await delay(600);
		updateProgress(entry.id, 15);
		const hotkey = spawnSync(powershellExecutable(), [
			"-NoProfile",
			"-NonInteractive",
			"-WindowStyle",
			"Hidden",
			"-ExecutionPolicy",
			"Bypass",
			"-File",
			hotkeyScript
		], {
			encoding: "utf8",
			shell: false,
			windowsHide: true,
			timeout: 8e3
		});
		if (hotkey.status !== 0) throw new Error(`wcap-hotkey-failed:${hotkey.status ?? "unknown"}`);
		for (let second = 0; second < 16; second += 1) {
			await delay(1e3);
			updateProgress(entry.id, 15 + (second + 1) / 16 * 75);
			const candidate = newestMp4(jobDir);
			if (second >= 12 && candidate !== null) {
				const stat = statSync(candidate);
				await delay(600);
				if (statSync(candidate).size === stat.size && stat.size >= 512 * 1024) break;
			}
		}
		const recorded = newestMp4(jobDir);
		if (recorded === null || statSync(recorded).size < 512 * 1024) throw new Error("wcap-output-not-found");
		const finalPath = sceneVideoCachePath(entry.id);
		const tempPath = `${finalPath}.tmp-${process.pid}`;
		copyFileSync(recorded, tempPath);
		rmSync(finalPath, { force: true });
		renameSync(tempPath, finalPath);
		const meta = {
			version: 2,
			id: entry.id,
			projectMtimeMs: projectMtime(entry),
			width: monitor.width,
			height: monitor.height,
			duration: 12,
			createdAt: now()
		};
		writeFileSync(sceneVideoMetaPath(entry.id), JSON.stringify(meta), "utf8");
		statuses.set(entry.id, {
			...baseStatus(entry, "ready"),
			width: meta.width,
			height: meta.height
		});
	} finally {
		runDesktopScript("restore", location);
		spawnSync(executable, [
			"-control",
			"closeWallpaper",
			"-location",
			location
		], {
			encoding: "utf8",
			shell: false,
			windowsHide: true,
			timeout: 8e3
		});
		if (activeRecorder !== null && activeRecorder.exitCode === null) activeRecorder.kill();
		activeRecorder = null;
		activeLocation = null;
		activeInstall = null;
		rmSync(jobDir, {
			recursive: true,
			force: true
		});
	}
}
/** Start a capture in the background or return the existing cache/job. */
function requestSceneVideo(entry, install) {
	if (entry.type !== "scene") return {
		...baseStatus(entry, "error"),
		error: "scene-video-requires-scene"
	};
	const existing = getSceneVideoStatus(entry);
	if (existing.phase === "ready" || existing.phase === "capturing") return existing;
	if ([...statuses.values()].some((status) => status.phase === "capturing")) return {
		...baseStatus(entry, "error"),
		error: "scene-video-capture-busy"
	};
	const capturing = {
		...baseStatus(entry, "capturing"),
		startedAt: now(),
		progress: 1
	};
	statuses.set(entry.id, capturing);
	runCapture(entry, install).catch((error) => {
		statuses.set(entry.id, {
			...baseStatus(entry, "error"),
			error: error instanceof Error ? error.message : String(error),
			startedAt: capturing.startedAt
		});
	});
	return { ...capturing };
}
/** Stop a running recorder and close its temporary WE window on plugin unload. */
function disposeSceneVideoCapture() {
	// TIANLIGHT: only restore the desktop when a capture session actually ran;
	// an idle tear-down must not spawn PowerShell at all.
	const hadSession = activeRecorder !== null || activeLocation !== null || activeInstall !== null;
	if (activeRecorder !== null && activeRecorder.exitCode === null) activeRecorder.kill();
	activeRecorder = null;
	if (hadSession && process.platform === "win32" && existsSync(bundledTool("scene-capture-desktop.ps1"))) try {
		spawnSync(powershellExecutable(), [
			"-NoProfile",
			"-NonInteractive",
			"-WindowStyle",
			"Hidden",
			"-ExecutionPolicy",
			"Bypass",
			"-File",
			bundledTool("scene-capture-desktop.ps1"),
			"-Action",
			"restore"
		], {
			encoding: "utf8",
			shell: false,
			windowsHide: true,
			timeout: 1e4
		});
	} catch {}
	if (activeInstall !== null && activeLocation !== null) {
		const executable = weExecutable(activeInstall);
		if (executable !== null) spawnSync(executable, [
			"-control",
			"closeWallpaper",
			"-location",
			activeLocation
		], {
			encoding: "utf8",
			shell: false,
			windowsHide: true,
			timeout: 8e3
		});
	}
	activeLocation = null;
	activeInstall = null;
}
//#endregion
//#region src/state.ts
/**
* Plugin-owned state: the wallpaper selection + display options, persisted in
* `~/.dsh/we-wallpaper.json` (DSH_HOME aware), the same pattern dsh-pet uses
* for pet.json. The web settings seam (dsh-host-apiproxy) only exposes a
* hardcoded namespace allowlist, so a plugin cannot rely on it — its own
* state file is the single source of truth for the selection, surviving page
* reloads and dsh restarts.
*/
/** Defaults when no state file exists. */
const DEFAULT_STATE = {
	selectedId: "",
	scrim: 25,
	translucency: 50,
	fit: "cover",
	sharpen: 40,
	sceneMode: "animated-first",
	repkgPath: "",
	animatedPreviews: true
};
/** TIANLIGHT: state home = `<runtimeHome>` (upstream defaulted to `~/.dsh`). */
function dshHome(home = "") {
	if (home !== "") return home;
	return runtimeHome();
}
/** The state file path. */
function stateFilePath(home = "") {
	return join(dshHome(home), "we-wallpaper.json");
}
/** Clamp/coerce one raw section into a valid WeState (unknown fields dropped). */
function normalizeState(raw) {
	const record = typeof raw === "object" && raw !== null && !Array.isArray(raw) ? raw : {};
	const selectedId = typeof record.selectedId === "string" ? record.selectedId : DEFAULT_STATE.selectedId;
	const scrim = typeof record.scrim === "number" && Number.isFinite(record.scrim) ? Math.max(0, Math.min(100, Math.round(record.scrim))) : DEFAULT_STATE.scrim;
	const translucency = typeof record.translucency === "number" && Number.isFinite(record.translucency) ? Math.max(0, Math.min(90, Math.round(record.translucency))) : DEFAULT_STATE.translucency;
	const fit = record.fit === "contain" ? "contain" : "cover";
	const sharpen = typeof record.sharpen === "number" && Number.isFinite(record.sharpen) ? Math.max(0, Math.min(100, Math.round(record.sharpen))) : DEFAULT_STATE.sharpen;
	const sceneMode = record.sceneMode === "static-hd" ? "static-hd" : record.sceneMode === "animated-first" ? "animated-first" : record.animatedPreviews === false ? "static-hd" : "animated-first";
	return {
		selectedId,
		scrim,
		translucency,
		fit,
		sharpen,
		sceneMode,
		repkgPath: typeof record.repkgPath === "string" ? record.repkgPath.trim().slice(0, 2048) : DEFAULT_STATE.repkgPath,
		animatedPreviews: sceneMode === "animated-first"
	};
}
/** Read the persisted state (defaults when absent or unreadable). */
function readState(home = "") {
	const file = stateFilePath(home);
	if (!existsSync(file)) return { ...DEFAULT_STATE };
	try {
		return normalizeState(JSON.parse(readFileSync(file, "utf8").replace(/^\uFEFF/, "")));
	} catch {
		return { ...DEFAULT_STATE };
	}
}
/**
* Merge a partial section into the persisted state (atomic replace) and
* return the next full state. Unknown fields are dropped; invalid values
* clamp to the schema bounds.
*/
function writeState(section, home = "") {
	const patch = typeof section === "object" && section !== null ? section : {};
	const compatibility = patch.sceneMode === void 0 && typeof patch.animatedPreviews === "boolean" ? { sceneMode: patch.animatedPreviews ? "animated-first" : "static-hd" } : {};
	const next = normalizeState({
		...readState(home),
		...patch,
		...compatibility
	});
	const file = stateFilePath(home);
	mkdirSync(dirname(file), { recursive: true });
	const tmp = `${file}.tmp-${process.pid}`;
	writeFileSync(tmp, JSON.stringify(next, null, 2), "utf8");
	renameSync(tmp, file);
	return next;
}
//#endregion
//#region src/we-scanner.ts
/**
* Wallpaper Engine library scanner — the framework-free core of the host half.
*
* Discovers the Wallpaper Engine install (env override -> Steam registry ->
* libraryfolders.vdf -> well-known defaults), enumerates the workshop
* (steamapps/workshop/content/431960/<id>) plus local projects
* (projects/myprojects, projects/defaultprojects), and reads each
* `project.json` into a flat wallpaper entry list.
*
* Everything here is pure node:fs — no cordis, no web server — so the scan
* and discovery logic are unit-testable with throwaway directories.
*/
/** Steam workshop app id of Wallpaper Engine. */
const WORKSHOP_APP_ID = "431960";
/** Spawn `reg.exe` and read one value; null when the key/value is absent. */
function regQueryDefault(key, name) {
	try {
		const out = spawnSync(join(process.env.SystemRoot ?? process.env.windir ?? "C:\\Windows", "System32", "reg.exe"), [
			"query",
			key,
			"/v",
			name
		], {
			encoding: "utf8",
			windowsHide: true,
			timeout: 5e3
		});
		if (out.status !== 0) return null;
		const match = /REG_SZ\s+(.+?)\s*$/.exec(out.stdout ?? "");
		return match !== null ? match[1].trim() : null;
	} catch {
		return null;
	}
}
/** Parse steamapps/libraryfolders.vdf `"path" "..."` entries. */
function parseLibraryFolders(vdf) {
	const out = [];
	for (const match of vdf.matchAll(/"path"\s*"([^"]+)"/g)) out.push(match[1].replace(/\\\\/g, "\\"));
	return out;
}
/** Whether a directory looks like a Wallpaper Engine root. */
function looksLikeWeRoot(dir) {
	return existsSync(join(dir, "wallpaper64.exe")) || existsSync(join(dir, "config.json")) || existsSync(join(dir, "projects"));
}
/**
* The candidate Steam roots: registry (HKCU + HKLM), every library folder
* listed in libraryfolders.vdf, and the well-known default install dirs.
* @param opts - injectable env / registry seam (tests).
*/
function steamRootCandidates(opts = {}) {
	const env = opts.env ?? process.env;
	const query = opts.queryReg ?? regQueryDefault;
	const roots = /* @__PURE__ */ new Set();
	for (const [key, name] of [["HKCU\\Software\\Valve\\Steam", "SteamPath"], ["HKLM\\SOFTWARE\\WOW6432Node\\Valve\\Steam", "InstallPath"]]) {
		const value = query(key, name);
		if (value !== null && value !== "") roots.add(value);
	}
	for (const root of [...roots]) {
		const vdfPath = join(root, "steamapps", "libraryfolders.vdf");
		if (!existsSync(vdfPath)) continue;
		try {
			for (const folder of parseLibraryFolders(readFileSync(vdfPath, "utf8"))) if (folder !== "") roots.add(folder);
		} catch {}
	}
	const pf = env.ProgramFiles ?? "C:\\Program Files";
	const pf86 = env["ProgramFiles(x86)"] ?? "C:\\Program Files (x86)";
	roots.add(join(pf86, "Steam"));
	roots.add(join(pf, "Steam"));
	return [...roots];
}
/**
* The workshop content dir for app 431960 under one Steam library root.
* @param steamRoot - one library folder.
*/
function workshopDirOf(steamRoot) {
	return join(steamRoot, "steamapps", "workshop", "content", WORKSHOP_APP_ID);
}
/**
* Locate the Wallpaper Engine install.
*
* Resolution order: `DSH_WE_DIR` env override, then every Steam root's
* `steamapps/common/wallpaper_engine`. The workshop dirs come from every
* library folder (WE and its workshop content may live on different disks).
* @param opts - injectable env / registry seam / steam roots (tests).
*/
function discoverWeInstall(opts = {}) {
	const env = opts.env ?? process.env;
	const override = (env["DSH_WE_DIR"] ?? "").trim();
	let root = null;
	let steamRoots;
	if (override !== "") {
		if (looksLikeWeRoot(override)) root = override;
		steamRoots = [];
	} else {
		steamRoots = opts.steamRoots ?? steamRootCandidates({
			env,
			queryReg: opts.queryReg
		});
		for (const steam of steamRoots) {
			const candidate = join(steam, "steamapps", "common", "wallpaper_engine");
			if (looksLikeWeRoot(candidate)) {
				root = candidate;
				break;
			}
		}
	}
	if (root === null) return null;
	const workshops = /* @__PURE__ */ new Set();
	for (const steam of steamRoots) {
		const ws = workshopDirOf(steam);
		if (existsSync(ws)) workshops.add(ws);
	}
	if (override !== "") {
		const ws = workshopDirOf(dirname(dirname(dirname(root))));
		if (existsSync(ws)) workshops.add(ws);
	}
	return {
		root,
		workshops: [...workshops],
		projects: {
			myprojects: join(root, "projects", "myprojects"),
			defaultprojects: join(root, "projects", "defaultprojects")
		}
	};
}
/** Normalize a raw project.json type into a media kind. */
function normalizeKind(raw) {
	const type = raw.trim().toLowerCase();
	if (type === "video" || type === "videowallpaper") return "video";
	if (type === "web" || type === "webwallpaper") return "web";
	if (type === "scene" || type === "scenewallpaper") return "scene";
	if (type === "image" || type === "imagewallpaper") return "image";
	if (type === "audio" || type === "audioreactive") return "audio";
	return "other";
}
/** Parse one project.json into the fields the GUI needs. Null = not a wallpaper. */
function parseProjectJson(text) {
	try {
		const raw = JSON.parse(text.replace(/^\uFEFF/, ""));
		if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null;
		const record = raw;
		const title = typeof record.title === "string" ? record.title.trim() : "";
		const file = typeof record.file === "string" ? record.file.trim() : "";
		const preview = typeof record.preview === "string" ? record.preview.trim() : "";
		const workshopid = typeof record.workshopid === "string" ? record.workshopid.trim() : null;
		return {
			title: title !== "" ? title : "(untitled)",
			type: normalizeKind(typeof record.type === "string" ? record.type : ""),
			file,
			preview,
			workshopid: workshopid !== "" ? workshopid : null
		};
	} catch {
		return null;
	}
}
/**
* The absolute dirs WE currently runs on the desktop, read from the root
* config.json (newer UI) and config/config.json (classic UI). Matching is
* case-insensitive (Windows paths).
* @param weRoot - the WE install root.
*/
function activeOnDesktopDirs(weRoot) {
	const files = /* @__PURE__ */ new Set();
	const dirs = /* @__PURE__ */ new Set();
	for (const configPath of [join(weRoot, "config.json"), join(weRoot, "config", "config.json")]) {
		if (!existsSync(configPath)) continue;
		try {
			const raw = JSON.parse(readFileSync(configPath, "utf8").replace(/^\uFEFF/, ""));
			if (typeof raw !== "object" || raw === null || Array.isArray(raw)) continue;
			const record = raw;
			const espoir = record.Espoir;
			const espoirGeneral = typeof espoir === "object" && espoir !== null ? espoir.general : void 0;
			const wallpaperConfig = typeof espoirGeneral === "object" && espoirGeneral !== null ? espoirGeneral.wallpaperconfig : void 0;
			const selected = typeof wallpaperConfig === "object" && wallpaperConfig !== null ? wallpaperConfig.selectedwallpapers : void 0;
			if (typeof selected === "object" && selected !== null) for (const monitor of Object.values(selected)) {
				const file = typeof monitor === "object" && monitor !== null ? monitor.file : void 0;
				if (typeof file === "string" && file !== "") files.add(file);
			}
			const classicWallpapers = record.wallpapers;
			if (Array.isArray(classicWallpapers)) for (const entry of classicWallpapers) {
				const directory = typeof entry === "object" && entry !== null ? entry.directory : void 0;
				if (typeof directory === "string" && directory !== "") dirs.add(directory);
			}
		} catch {}
	}
	const out = /* @__PURE__ */ new Set();
	for (const file of files) out.add(dirname(file.replace(/\\/g, "/")).toLowerCase());
	for (const dir of dirs) out.add(dir.replace(/\\/g, "/").toLowerCase());
	return out;
}
/** Safe readdir: [] on any failure. */
function readdirSafe(dir) {
	try {
		return readdirSync(dir);
	} catch {
		return [];
	}
}
/** Whether a path is an existing directory. */
function isDir(dir) {
	try {
		return statSync(dir).isDirectory();
	} catch {
		return false;
	}
}
/**
* Enumerate every wallpaper of an install: workshop content + local projects.
* Entries are deduped by id; missing/broken project.json files are skipped.
* @param install - the discovered install.
* @param activeDirs - active-on-desktop dir set (from {@link activeOnDesktopDirs});
*   defaults to reading the WE config.
*/
function scanWallpapers(install, activeDirs = activeOnDesktopDirs(install.root)) {
	const entries = [];
	const seen = /* @__PURE__ */ new Set();
	const add = (dir, source, workshopId) => {
		const projectPath = join(dir, "project.json");
		if (!existsSync(projectPath)) return;
		let meta;
		try {
			meta = parseProjectJson(readFileSync(projectPath, "utf8"));
		} catch {
			return;
		}
		if (meta === null) return;
		const id = workshopId ?? `local-${basename(dir)}`;
		if (seen.has(id)) return;
		seen.add(id);
		entries.push({
			id,
			title: meta.title,
			type: meta.type,
			file: meta.file,
			preview: meta.preview,
			dir,
			source,
			workshopId,
			activeOnDesktop: activeDirs.has(dir.replace(/\\/g, "/").toLowerCase())
		});
	};
	for (const workshop of install.workshops) for (const sub of readdirSafe(workshop)) add(join(workshop, sub), "workshop", sub);
	for (const [base, source] of [[install.projects.myprojects, "myprojects"], [install.projects.defaultprojects, "defaultprojects"]]) for (const sub of readdirSafe(base)) {
		const dir = join(base, sub);
		if (!isDir(dir)) continue;
		add(dir, source, null);
	}
	entries.sort((a, b) => a.title.localeCompare(b.title, void 0, { numeric: true }));
	return entries;
}
//#endregion
//#region src/routes.ts
/**
* dsh-we-wallpaper HTTP routes — the browser half talks to the host through
* plain same-origin endpoints:
*
*   GET  /api/we-wallpaper/list          — wallpaper library (id/title/type/source)
*   GET  /api/we-wallpaper/state         — persisted selection + options
*   POST /api/we-wallpaper/state         — persist selection + options
*   GET  /api/we-wallpaper/preview/<id>  — the local wallpaper preview image
*   GET  /api/we-wallpaper/hd/<id>       — the Steam workshop HD preview (cached)
*   GET  /api/we-wallpaper/media/<id>    — the main media file (video/image/audio)
*   GET  /api/we-wallpaper/web/<id>/<path> — static files of a web wallpaper
*   POST /api/we-wallpaper/scene-video/generate/<id> — build cached HD loop
*   GET  /api/we-wallpaper/scene-video/status/<id>   — generation status
*   GET  /api/we-wallpaper/scene-video/media/<id>    — cached HD loop
*
* The selection persists in `~/.dsh/we-wallpaper.json` (src/state.ts).
* Every route rejects cross-site requests (Sec-Fetch-Site / Origin fence) so
* a malicious webpage cannot probe local files through a localhost CSRF
* request; ids are resolved against the scan map (never used as raw paths)
* and web-file paths are traversal-guarded.
*/
/** Browser-facing base path of the plugin API. */
const WE_API_PREFIX = "/api/we-wallpaper";
/** Common preview fallback names when project.json names none (or a missing file). */
const PREVIEW_FALLBACKS = [
	"preview.jpg",
	"preview.png",
	"preview.gif",
	"preview.webp",
	"preview.jpeg"
];
/** Extension -> content type. */
const MIME = {
	".mp4": "video/mp4",
	".webm": "video/webm",
	".mov": "video/quicktime",
	".m4v": "video/x-m4v",
	".mkv": "video/x-matroska",
	".jpg": "image/jpeg",
	".jpeg": "image/jpeg",
	".png": "image/png",
	".gif": "image/gif",
	".webp": "image/webp",
	".bmp": "image/bmp",
	".svg": "image/svg+xml",
	".html": "text/html; charset=utf-8",
	".htm": "text/html; charset=utf-8",
	".js": "text/javascript; charset=utf-8",
	".mjs": "text/javascript; charset=utf-8",
	".css": "text/css; charset=utf-8",
	".json": "application/json; charset=utf-8",
	".xml": "application/xml",
	".txt": "text/plain; charset=utf-8",
	".wav": "audio/wav",
	".mp3": "audio/mpeg",
	".ogg": "audio/ogg",
	".m4a": "audio/mp4",
	".flac": "audio/flac",
	".woff": "font/woff",
	".woff2": "font/woff2",
	".ttf": "font/ttf",
	".otf": "font/otf",
	".pkg": "application/octet-stream",
	".mpkg": "application/octet-stream",
	".exe": "application/octet-stream"
};
/** Content type for a file path. */
function mimeFor(file) {
	return MIME[extname(file).toLowerCase()] ?? "application/octet-stream";
}
let scanCache = null;
/** Fingerprint of everything the scan reads (mtimeMs of the roots). */
function scanKey(install) {
	if (install === null) return "none";
	const parts = [install.root];
	for (const dir of [
		...install.workshops,
		install.projects.myprojects,
		install.projects.defaultprojects
	]) {
		const stat = statSync(dir, { throwIfNoEntry: false });
		parts.push(`${dir}:${stat?.mtimeMs ?? -1}`);
	}
	return parts.join("|");
}
/** Scan with a mtime-keyed cache; never throws (WE absent = empty library). */
let discoveryCache = null;
/**
 * TIANLIGHT: discovery spawns `reg.exe` queries, so it is cached for a few
 * seconds (the entry scan itself is mtime-keyed by loadScan below). The env
 * override is part of the key so `DSH_WE_DIR` changes take effect immediately.
 */
function currentInstall() {
	const override = String(process.env.DSH_WE_DIR ?? "").trim();
	const stamp = Date.now();
	if (discoveryCache !== null && discoveryCache.override === override && stamp - discoveryCache.at < 5000) return discoveryCache.install;
	const install = discoverWeInstall();
	discoveryCache = { override, at: stamp, install };
	return install;
}
function loadScan() {
	const install = currentInstall();
	const key = scanKey(install);
	if (scanCache !== null && scanCache.key === key) return scanCache.result;
	const wallpapers = install !== null ? scanWallpapers(install) : [];
	const byId = /* @__PURE__ */ new Map();
	for (const wallpaper of wallpapers) byId.set(wallpaper.id, wallpaper);
	const result = {
		install,
		wallpapers,
		byId
	};
	scanCache = {
		key,
		result
	};
	return result;
}
/** One JSON response. */
function json(res, status, body) {
	res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
	res.end(JSON.stringify(body));
}
/** Require GET/HEAD (plus an optional extra method) or answer 405. */
function requireMethod(req, res, extra) {
	if (req.method === "GET" || req.method === "HEAD" || req.method === extra) return true;
	json(res, 405, {
		ok: false,
		error: "method-not-allowed"
	});
	return false;
}
/** Same-origin fence (ported from the skin-center route family). */
function isSameOriginRequest(req) {
	const site = req.headers["sec-fetch-site"];
	if (typeof site === "string" && site === "cross-site") return false;
	const origin = req.headers.origin;
	if (typeof origin === "string" && origin !== "" && origin !== "null") {
		const host = req.headers.host;
		if (typeof host !== "string" || host === "") return false;
		try {
			if (new URL(origin).host !== host) return false;
		} catch {
			return false;
		}
	}
	return true;
}
/** Reject cross-site requests with 403. */
function requireSameOrigin(req, res) {
	try {
		const site = String(req.headers?.['sec-fetch-site'] ?? '')
		const origin = String(req.headers?.origin ?? '')
		if (site === 'cross-site') {
			json(res, 403, { ok: false, error: 'cross-site-request-rejected' })
			return false
		}
		if (origin !== '' && !origin.startsWith('dsh-app://') && !/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(origin)) {
			json(res, 403, { ok: false, error: 'cross-site-request-rejected' })
			return false
		}
		return true
	} catch {
		return true
	}
}
/** Read a JSON request body (bounded). */
function readJsonBody(req) {
	return new Promise((resolveBody, reject) => {
		let size = 0;
		const chunks = [];
		req.on("data", (chunk) => {
			size += chunk.length;
			if (size > 64 * 1024) {
				reject(/* @__PURE__ */ new Error("body-too-large"));
				queueMicrotask(() => req.destroy());
				return;
			}
			chunks.push(chunk);
		});
		req.on("end", () => {
			if (chunks.length === 0) {
				resolveBody({});
				return;
			}
			try {
				resolveBody(JSON.parse(Buffer.concat(chunks).toString("utf8")));
			} catch {
				reject(/* @__PURE__ */ new Error("invalid-json"));
			}
		});
		req.on("error", reject);
	});
}
/** Decode the id path segment; null when it is not a plain segment. */
function decodeIdSegment(raw) {
	try {
		const decoded = decodeURIComponent(raw);
		if (decoded === "" || decoded.includes("/") || decoded.includes("\\") || decoded.includes("\0")) return null;
		return decoded;
	} catch {
		return null;
	}
}
/**
* Resolve a web-wallpaper request path inside its wallpaper dir. Returns the
* absolute target file when every segment stays inside `base` (defaulting to
* index.html), null on traversal.
* @param base - the wallpaper dir (absolute).
* @param segments - decoded path segments after the wallpaper id.
*/
function resolveWebTarget(base, segments) {
	const resolvedBase = resolve(base);
	const target = resolve(join(resolvedBase, ...segments.length > 0 ? segments : ["index.html"]));
	if (target !== resolvedBase && !target.startsWith(resolvedBase + sep)) return null;
	return target;
}
/**
* Stream a local file with single-range support (video seeking needs it).
* @param req - the request (Range header read when present).
* @param res - the response.
* @param abs - absolute file path.
* @param cacheControl - cache directive (default no-cache).
*/
function serveFile(req, res, abs, cacheControl = "no-cache") {
	const stat = statSync(abs, { throwIfNoEntry: false });
	if (stat === void 0 || !stat.isFile()) {
		json(res, 404, {
			ok: false,
			error: "file-not-found"
		});
		return;
	}
	const total = stat.size;
	const headers = {
		"content-type": mimeFor(abs),
		"accept-ranges": "bytes",
		"cache-control": cacheControl,
		"x-content-type-options": "nosniff"
	};
	if (req.method === "HEAD") {
		res.writeHead(200, {
			...headers,
			"content-length": String(total)
		});
		res.end();
		return;
	}
	const range = req.headers.range;
	if (typeof range === "string") {
		const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
		if (match !== null) {
			let start = match[1] === "" ? void 0 : Number(match[1]);
			let end = match[2] === "" ? void 0 : Number(match[2]);
			if (start === void 0 && end !== void 0) {
				start = Math.max(0, total - end);
				end = total - 1;
			} else {
				start = start ?? 0;
				end = end === void 0 ? total - 1 : Math.min(end, total - 1);
			}
			if (start > end || start >= total) {
				res.writeHead(416, { "content-range": `bytes */${total}` });
				res.end();
				return;
			}
			res.writeHead(206, {
				...headers,
				"content-range": `bytes ${start}-${end}/${total}`,
				"content-length": String(end - start + 1)
			});
			createReadStream(abs, {
				start,
				end
			}).pipe(res);
			return;
		}
	}
	res.writeHead(200, {
		...headers,
		"content-length": String(total)
	});
	createReadStream(abs).pipe(res);
}
/** A GET route wrapping one handler, fenced to same-origin requests. */
function getRoute(path, handler) {
	return {
		kind: "exact",
		path,
		handler: (req, res) => {
			if (!requireMethod(req, res)) return;
			if (!requireSameOrigin(req, res)) return;
			handler(req, res);
		}
	};
}
/** Resolve one wallpaper id to its entry; answers 404 when unknown. */
function resolveEntry(req, res, rawId) {
	const id = decodeIdSegment(rawId);
	if (id === null) {
		json(res, 400, {
			ok: false,
			error: "invalid-wallpaper-id"
		});
		return null;
	}
	const entry = loadScan().byId.get(id);
	if (entry === void 0) {
		json(res, 404, {
			ok: false,
			error: "wallpaper-not-found"
		});
		return null;
	}
	return entry;
}
/** Resolve the preview file of an entry (project.json preview or fallbacks). */
function previewFileOf(entry) {
	const candidates = entry.preview !== "" ? [entry.preview, ...PREVIEW_FALLBACKS] : PREVIEW_FALLBACKS;
	for (const name of candidates) {
		if (name.includes("/") || name.includes("\\")) continue;
		const abs = join(entry.dir, name);
		if (existsSync(abs)) return abs;
	}
	return null;
}
/**
* Build the route family.
* @returns the WebRoute list (register each with ctx.webServer).
*/
function makeWeWallpaperRoutes() {
	return [
		{
			kind: "exact",
			path: `${WE_API_PREFIX}/state`,
			handler: (req, res) => {
				if (!requireMethod(req, res, "POST")) return Promise.resolve();
				if (!requireSameOrigin(req, res)) return Promise.resolve();
				if (req.method === "GET" || req.method === "HEAD") {
					const body = JSON.stringify({
						ok: true,
						state: readState()
					});
					if (req.method === "HEAD") {
						res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
						res.end();
					} else {
						res.writeHead(200, {
							"content-type": "application/json; charset=utf-8",
							"content-length": String(Buffer.byteLength(body))
						});
						res.end(body);
					}
					return Promise.resolve();
				}
				return readJsonBody(req).then((body) => {
					json(res, 200, {
						ok: true,
						state: writeState(body)
					});
				}, (error) => {
					json(res, 400, {
						ok: false,
						error: error instanceof Error ? error.message : String(error)
					});
				});
			}
		},
		getRoute(`${WE_API_PREFIX}/list`, (_req, res) => {
			const { install, wallpapers } = loadScan();
			json(res, 200, {
				ok: true,
				found: install !== null,
				root: install?.root ?? null,
				count: wallpapers.length,
				wallpapers: wallpapers.map((entry) => ({
					previewKind: (() => {
						const preview = previewFileOf(entry);
						return preview !== null && [
							".mp4",
							".webm",
							".mov",
							".m4v"
						].includes(extname(preview).toLowerCase()) ? "video" : preview === null ? "none" : "image";
					})(),
					id: entry.id,
					title: entry.title,
					type: entry.type,
					source: entry.source,
					workshopId: entry.workshopId,
					activeOnDesktop: entry.activeOnDesktop
				}))
			});
		}),
		{
			kind: "prefix",
			path: `${WE_API_PREFIX}/scene-video/generate`,
			handler: (req, res) => {
				if (req.method !== "POST") {
					json(res, 405, {
						ok: false,
						error: "method-not-allowed"
					});
					return Promise.resolve();
				}
				if (!requireSameOrigin(req, res)) return Promise.resolve();
				const entry = resolveEntry(req, res, req.url?.slice(`/api/we-wallpaper/scene-video/generate/`.length).split("?")[0] ?? "");
				if (entry === null) return Promise.resolve();
				const { install } = loadScan();
				if (install === null) {
					json(res, 503, {
						ok: false,
						error: "wallpaper-engine-not-found"
					});
					return Promise.resolve();
				}
				// TIANLIGHT: answer 503 up front instead of starting a background job
				// that can only fail later (and must never spawn a process in tests).
				const unsupportedReason = sceneVideoUnsupportedReason();
				if (unsupportedReason !== null) {
					json(res, 503, {
						ok: false,
						error: "scene-video-unsupported",
						reason: unsupportedReason
					});
					return Promise.resolve();
				}
				let status;
				try {
					status = requestSceneVideo(entry, install);
				} catch {
					json(res, 503, {
						ok: false,
						error: "scene-video-unsupported"
					});
					return Promise.resolve();
				}
				json(res, status.phase === "error" ? 503 : 202, {
					ok: status.phase !== "error",
					status
				});
				return Promise.resolve();
			}
		},
		{
			kind: "prefix",
			path: `${WE_API_PREFIX}/scene-video/status`,
			handler: (req, res) => {
				if (!requireMethod(req, res)) return;
				if (!requireSameOrigin(req, res)) return;
				const entry = resolveEntry(req, res, req.url?.slice(`/api/we-wallpaper/scene-video/status/`.length).split("?")[0] ?? "");
				if (entry === null) return;
				json(res, 200, {
					ok: true,
					status: getSceneVideoStatus(entry)
				});
			}
		},
		{
			kind: "prefix",
			path: `${WE_API_PREFIX}/scene-video/media`,
			handler: (req, res) => {
				if (!requireMethod(req, res)) return;
				if (!requireSameOrigin(req, res)) return;
				const entry = resolveEntry(req, res, req.url?.slice(`/api/we-wallpaper/scene-video/media/`.length).split("?")[0] ?? "");
				if (entry === null) return;
				const status = getSceneVideoStatus(entry);
				if (status.phase !== "ready" || status.file === null) {
					json(res, 404, {
						ok: false,
						error: "scene-video-not-ready",
						status
					});
					return;
				}
				serveFile(req, res, status.file, "public, max-age=86400");
			}
		},
		{
			kind: "prefix",
			path: `${WE_API_PREFIX}/preview`,
			handler: (req, res) => {
				if (!requireMethod(req, res)) return;
				if (!requireSameOrigin(req, res)) return;
				const entry = resolveEntry(req, res, req.url?.slice(`/api/we-wallpaper/preview/`.length).split("?")[0] ?? "");
				if (entry === null) return;
				const file = previewFileOf(entry);
				if (file === null) {
					json(res, 404, {
						ok: false,
						error: "preview-not-found"
					});
					return;
				}
				serveFile(req, res, file, "public, max-age=300");
			}
		},
		{
			kind: "prefix",
			path: `${WE_API_PREFIX}/media`,
			handler: (req, res) => {
				if (!requireMethod(req, res)) return;
				if (!requireSameOrigin(req, res)) return;
				const entry = resolveEntry(req, res, req.url?.slice(`/api/we-wallpaper/media/`.length).split("?")[0] ?? "");
				if (entry === null) return;
				if (entry.file === "" || entry.file.includes("/") || entry.file.includes("\\")) {
					json(res, 400, {
						ok: false,
						error: "wallpaper-has-no-media-file"
					});
					return;
				}
				const abs = join(entry.dir, entry.file);
				if (!existsSync(abs)) {
					json(res, 404, {
						ok: false,
						error: "media-file-not-found"
					});
					return;
				}
				serveFile(req, res, abs);
			}
		},
		{
			kind: "prefix",
			path: `${WE_API_PREFIX}/pkg`,
			handler: (req, res) => {
				if (!requireMethod(req, res)) return;
				if (!requireSameOrigin(req, res)) return;
				const entry = resolveEntry(req, res, req.url?.slice(`/api/we-wallpaper/pkg/`.length).split("?")[0] ?? "");
				if (entry === null) return;
				// TIANLIGHT: local projects can carry a scene.pkg too, so the route no
				// longer requires a numeric workshop id.
				const { install } = loadScan();
				const state = readState();
				const preview = install !== null ? resolvePkgPreview(entry, install.workshops, {
					sceneMode: state.sceneMode,
					repkgPath: state.repkgPath
				}) : null;
				if (preview === null || !existsSync(preview.file)) {
					json(res, 404, {
						ok: false,
						error: "pkg-preview-unavailable"
					});
					return;
				}
				res.writeHead(200, {
					"content-type": preview.mime,
					"content-length": String(statSync(preview.file).size),
					"cache-control": "public, max-age=2592000",
					"x-we-preview-kind": "image",
					"x-we-preview-source": preview.source,
					"x-we-selected-texture": encodeURIComponent(preview.selectedTex ?? "")
				});
				createReadStream(preview.file).pipe(res);
			}
		},
		{
			kind: "prefix",
			path: `${WE_API_PREFIX}/diagnostics`,
			handler: (req, res) => {
				if (!requireMethod(req, res)) return;
				if (!requireSameOrigin(req, res)) return;
				const entry = resolveEntry(req, res, req.url?.slice(`/api/we-wallpaper/diagnostics/`.length).split("?")[0] ?? "");
				if (entry === null) return;
				const { install } = loadScan();
				if (install === null) {
					json(res, 200, {
						ok: true,
						id: entry.id,
						type: entry.type,
						sceneVideo: getSceneVideoStatus(entry),
						diagnostics: {
							pkgFound: false,
							fallbackReason: "wallpaper-engine-not-found"
						}
					});
					return;
				}
				const state = readState();
				const resolution = resolvePkgPreviewDetailed(entry, install.workshops, {
					sceneMode: state.sceneMode,
					repkgPath: state.repkgPath
				});
				json(res, 200, {
					ok: true,
					id: entry.id,
					type: entry.type,
					sceneMode: state.sceneMode,
					sceneVideo: getSceneVideoStatus(entry),
					preview: resolution.preview === null ? null : {
						mime: resolution.preview.mime,
						width: resolution.preview.width,
						height: resolution.preview.height
					},
					diagnostics: resolution.diagnostics
				});
			}
		},
		{
			kind: "prefix",
			path: `${WE_API_PREFIX}/web`,
			handler: (req, res) => {
				if (!requireMethod(req, res)) return;
				if (!requireSameOrigin(req, res)) return;
				const [rawId, ...rawSegments] = (req.url?.slice(`/api/we-wallpaper/web/`.length).split("?")[0] ?? "").split("/");
				const entry = resolveEntry(req, res, rawId);
				if (entry === null) return;
				const segments = [];
				for (const raw of rawSegments) {
					if (raw === "") continue;
					try {
						const decoded = decodeURIComponent(raw);
						if (decoded.includes("\0")) throw new Error("nul");
						segments.push(decoded);
					} catch {
						json(res, 400, {
							ok: false,
							error: "invalid-path"
						});
						return;
					}
				}
				const target = resolveWebTarget(entry.dir, segments);
				if (target === null) {
					json(res, 403, {
						ok: false,
						error: "path-outside-wallpaper"
					});
					return;
				}
				if (!existsSync(target)) {
					json(res, 404, {
						ok: false,
						error: "file-not-found"
					});
					return;
				}
				serveFile(req, res, target);
			}
		}
	];
}
//#endregion
/**
 * TIANLIGHT: path into this route family for one wallpaper id. Ids are opaque
 * (numeric workshop ids or `local-*` names), so every one is escaped.
 */
function weApiUrl(kind, id, tail = "") {
	return `${WE_API_PREFIX}/${kind}/${encodeURIComponent(id)}${tail}`;
}
/** Media file of an entry when it is a plain filename inside the project dir. */
function mediaFileOf(entry) {
	const file = typeof entry?.file === "string" ? entry.file.trim() : "";
	if (file === "" || file.includes("/") || file.includes("\\")) return null;
	const abs = join(entry.dir, file);
	return existsSync(abs) ? abs : null;
}
/** The web entry page filename (project.file) restricted to a plain .html name. */
function webEntryFile(entry) {
	const file = typeof entry?.file === "string" ? entry.file.trim().replace(/\\/g, "/") : "";
	if (file === "" || file.includes("/") || file.includes("..")) return "index.html";
	return /\.html?$/i.test(file) ? file : "index.html";
}
/** True when the entry's preview is an image the browser can put in <img>. */
function imagePreviewUrl(entry) {
	const file = previewFileOf(entry);
	if (file === null) return "";
	const ext = extname(file).toLowerCase();
	if (![".png", ".jpg", ".jpeg", ".webp", ".gif"].includes(ext)) return "";
	return weApiUrl("preview", entry.id);
}
/** Best-known byte size for a card, 0 when it cannot be determined cheaply. */
function entryBytes(entry) {
	try {
		if (entry.type === "scene") {
			const pkgPath = scenePkgForEntry(entry, loadScan().install?.workshops ?? []);
			return pkgPath === null ? 0 : statSync(pkgPath).size;
		}
		const media = mediaFileOf(entry);
		if (media !== null) return statSync(media).size;
		const preview = previewFileOf(entry);
		return preview === null ? 0 : statSync(preview).size;
	} catch {
		return 0;
	}
}
/**
 * TIANLIGHT: the Wallpaper Engine library as skin `_wallpapers` items.
 *
 * Mapping (see docs/RELEASE-0.6.0.md):
 *   video  -> kind video, url media/<id>
 *   image  -> kind image, url media/<id>
 *   web    -> kind web,   url web/<id>/<entry html>
 *   scene  -> kind image, url pkg/<id> when a scene.pkg is extractable, else the
 *             preview image (local loose-scene projects have no package)
 *   audio / unknown -> kind image over the preview (static degradation)
 * Items are deduped by the scanner id and keep the original (often Chinese)
 * title untouched. Every item carries `source:"we"`, `weId`, `weType` and
 * `weSource: "workshop"|"project"`; `preview` is present only when an image
 * preview file exists (the panel renders its own fallback otherwise).
 * Never throws: a broken library just yields no items.
 */
function listWeSkinItems() {
	try {
		const { install, wallpapers } = loadScan();
		if (install === null) return [];
		const items = [];
		const seen = new Set();
		for (const entry of wallpapers) {
			if (seen.has(entry.id)) continue;
			seen.add(entry.id);
			// weSource lets the panel split the grid into "Steam 工坊" vs
			// "我的项目" counters without guessing from the id shape.
			const base = {
				id: `we:${entry.id}`,
				weId: entry.id,
				weType: entry.type === "" ? "other" : entry.type,
				weSource: entry.source === "workshop" ? "workshop" : "project",
				title: entry.title,
				source: "we",
				bytes: entryBytes(entry),
			};
			// The preview field is optional: entries without a usable image preview
			// omit it entirely and the panel renders its own fallback.
			const previewUrl = imagePreviewUrl(entry);
			if (previewUrl !== "") base.preview = previewUrl;
			if (entry.type === "video" || entry.type === "image") {
				const media = mediaFileOf(entry);
				if (media !== null) {
					items.push({ ...base, kind: entry.type, url: weApiUrl("media", entry.id) });
					continue;
				}
			}
			if (entry.type === "web") {
				items.push({ ...base, kind: "web", url: weApiUrl("web", entry.id, "/" + encodeURIComponent(webEntryFile(entry))) });
				continue;
			}
			if (entry.type === "scene") {
				const pkgPath = scenePkgForEntry(entry, install.workshops);
				items.push({ ...base, kind: "image", url: pkgPath !== null ? weApiUrl("pkg", entry.id) : weApiUrl("preview", entry.id) });
				continue;
			}
			if (previewUrl !== "") items.push({ ...base, kind: "image", url: previewUrl });
		}
		return items;
	} catch {
		return [];
	}
}
/** TIANLIGHT: `_engines.weLibrary` — additive status, never throws. */
function weLibraryStatus() {
	try {
		const { install, wallpapers } = loadScan();
		return {
			found: install !== null,
			count: wallpapers.length,
			root: install?.root ?? null,
		};
	} catch {
		return { found: false, count: 0, root: null };
	}
}
/**
 * TIANLIGHT: single dispatcher for the whole route family. The web-server carrier
 * matches on the `/api/we-wallpaper` prefix and passes the request through
 * unchanged; this picks the exact/prefix route by pathname (query ignored for
 * matching, still available to the handlers through req.url).
 */
function makeWeWallpaperHandler() {
	const routes = makeWeWallpaperRoutes();
	return (req, res) => {
		let pathname = "/";
		try {
			pathname = new URL(typeof req.url === "string" ? req.url : "/", "http://localhost").pathname;
		} catch {
			pathname = String(req.url ?? "/").split("?")[0];
		}
		for (const route of routes) {
			const matched = route.kind === "exact" ? pathname === route.path : pathname === route.path || pathname.startsWith(route.path + "/");
			if (!matched) continue;
			try {
				const result = route.handler(req, res);
				if (result !== null && typeof result === "object" && typeof result.catch === "function") {
					result.catch(() => {
						try {
							json(res, 500, { ok: false, error: "we-wallpaper-internal-error" });
						} catch {}
					});
				}
			} catch {
				try {
					json(res, 500, { ok: false, error: "we-wallpaper-internal-error" });
				} catch {}
			}
			return;
		}
		json(res, 404, { ok: false, error: "not-found" });
	};
}
const __we = {
	makeWeWallpaperRoutes,
	makeWeWallpaperHandler,
	WE_API_PREFIX,
	readState,
	writeState,
	disposeSceneVideoCapture,
	listWeSkinItems,
	weLibraryStatus,
};
export { makeWeWallpaperRoutes, makeWeWallpaperHandler, WE_API_PREFIX, readState, writeState, disposeSceneVideoCapture, listWeSkinItems, weLibraryStatus };
export default __we;
