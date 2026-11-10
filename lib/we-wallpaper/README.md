# Vendored: dsh-we-wallpaper host half (MIT)

`host.mjs` is the host half of the MIT-licensed **dsh-we-wallpaper** plugin,
vendored so the TIANLIGHT skin can browse and apply the user's local
[Wallpaper Engine](https://store.steampowered.com/app/431960) library with **no
folder configuration**.

| | |
|---|---|
| Upstream | <https://github.com/pbadgpmeb22791-sketch/dsh-we-wallpaper> |
| Version / commit | `0.4.0` @ `61ccaa2` (restructure commit that promoted v0.4.0 to the repo root) |
| Source file | upstream `lib/index.js`, built from the repo's TypeScript sources |
| License | MIT — see [LICENSE](LICENSE) (copyright "dsh-we-wallpaper contributors") |
| Vendored as | `lib/we-wallpaper/host.mjs` (single ESM file, Node built-ins only) |

The upstream **client half** (`lib/client.js`, the official plugin settings card)
is not vendored: our skin's own client renders the cards from `_wallpapers` and
mounts the wallpaper itself.

## What the vendored module provides

- **WE install discovery**: `DSH_WE_DIR` override → Steam registry
  (`HKCU\Software\Valve\Steam` / `HKLM\...\Valve\Steam`) →
  `steamapps/libraryfolders.vdf` → well-known default install dirs.
- **Library scan**: `steamapps/workshop/content/431960/<id>/project.json` plus
  local projects (`projects/myprojects`, `projects/defaultprojects`), deduped by
  id, sorted by title. Chinese/any Unicode titles are passed through untouched.
- **Dependency-free `scene.pkg` decoder** (`pkg-tex` region): parses the package
  table, walks the scene graph for the background texture, decodes TEX (DXT1/3/5,
  RGBA/RGB/R8/RG88, embedded PNG/JPEG) and encodes a PNG with `node:zlib`. The
  first `/pkg/<id>` request caches the extracted HD image.
- **Scene-video recorder integration** (optional, Windows-only): `wcap` +
  PowerShell presentation scripts under `vendor/we-wallpaper/wcap/`.
- **HTTP route family** `/api/we-wallpaper/*` (list/state/preview/media/pkg/web/
  diagnostics/scene-video) with a same-origin request fence and per-segment path
  containment.

## Modifications made for TIANLIGHT (grep `TIANLIGHT` in `host.mjs`)

1. **Plugin wiring removed** (done by the Lead while producing the bundle): no
   cordis schema/settings/client registration; module exports plain functions.
2. **Same-origin fence relaxed** for the DSH Desktop webview origins
   (`dsh-app://…`) and `http(s)://127.0.0.1|localhost[:port]`; `Sec-Fetch-Site:
   cross-site` and any other origin still answer 403.
3. **Runtime home moved** from `~/.dsh` into the plugin's gitignored `state/`
   directory (`state/we-wallpaper.json`, `state/we-wallpaper-cache/`), with
   `TIANLIGHT_WE_HOME` as an explicit override for tests/sandboxes. No upstream
   user file is read or written.
4. **wcap tools** resolve to `<plugin>/vendor/we-wallpaper/wcap/`
   (`packageRoot()` is three levels up because this file lives in
   `lib/we-wallpaper/`, not `lib/`).
5. **Local project `.pkg` support**: `scenePkgForEntry()` also looks inside the
   project directory, so `projects/*` scene packages extract like workshop ones;
   local loose-scene projects (`scene.json`, no package) fall back to their
   preview image.
6. **Scene-video hardening**: `sceneVideoUnsupportedReason()` answers a clear
   `503 {error:"scene-video-unsupported", reason:…}` when the recorder is
   missing, the platform is not Windows, or
   `TIANLIGHT_WE_DISABLE_SCENE_VIDEO=1`; disposal only runs the PowerShell
   restore on Windows.
7. **Discovery cache**: `currentInstall()` memoises registry/Steam discovery for
   5 s (the entry scan itself stays mtime-keyed upstream).
8. **Skin integration exports**: `listWeSkinItems()` maps the scanner to the
   skin's `_wallpapers` shape, `weLibraryStatus()` feeds
   `_engines.weLibrary`, and `makeWeWallpaperHandler()` is the single prefix
   dispatcher mounted by `lib/index.js`. Every appended item looks like:

   ```js
   {
     id: "we:<weId>", weId, kind: "video"|"image"|"web",
     weType: "video"|"image"|"web"|"scene"|"audio"|"other",
     weSource: "workshop"|"project",      // Steam 431960 vs local projects/
     title,                                // original title, Chinese preserved
     url: "/api/we-wallpaper/{media|pkg|web}/<id>…",
     preview: "/api/we-wallpaper/preview/<id>", // optional; omitted when none
     bytes, source: "we",
   }
   ```

   `scene` cards use `/pkg/<id>` when a package is extractable, otherwise the
   preview image; `audio`/unknown types degrade to the preview image.

## Routes (mounted at `/api/we-wallpaper`)

| Route | Method | Purpose |
|---|---|---|
| `/state` | GET/POST | persisted selection + display options (`state/we-wallpaper.json`) |
| `/list` | GET | `{found,root,count,wallpapers[{id,title,type,source,workshopId,previewKind,activeOnDesktop}]}` |
| `/preview/<id>` | GET/HEAD | project preview image (or video preview) |
| `/media/<id>` | GET/HEAD | video/image/audio media file, byte ranges supported |
| `/pkg/<id>` | GET | extracted HD scene background (pure-JS `.pkg` decode, cached) |
| `/web/<id>/<path>` | GET/HEAD | static files of a web wallpaper (`index.html` default, traversal-guarded) |
| `/diagnostics/<id>` | GET | pkg/scene-video diagnostics for one wallpaper |
| `/scene-video/generate/<id>` | POST | start a 12 s H.264 capture of a scene via Wallpaper Engine + wcap |
| `/scene-video/status/<id>` | GET | capture job status |
| `/scene-video/media/<id>` | GET | cached capture MP4 |

Every route rejects `Sec-Fetch-Site: cross-site` and non-local `Origin` headers
with 403; ids are resolved through the scan map (never used as raw paths).

## Scene-video support matrix

| Condition | Behaviour |
|---|---|
| Windows + Wallpaper Engine + vendored `wcap` files | capture can be requested; WE opens the scene in a temporary borderless window, wcap records 12 s, cache is reused afterwards |
| `wcap` files missing / non-Windows / `TIANLIGHT_WE_DISABLE_SCENE_VIDEO=1` | `POST /scene-video/generate/<id>` → `503 scene-video-unsupported` with a reason; everything else keeps working |
| cap never requested | scenes are shown through the static HD `/pkg/<id>` image (the v0.6.0 default) |

`scene-video` spawns `wcap-x64.exe` + `powershell.exe`; it is deliberately never
exercised by the repository test suite (the tests run with the disable flag set),
because it would open windows on the maintainer's desktop.

## `vendor/we-wallpaper/wcap/`

| File | Origin | License |
|---|---|---|
| `wcap-x64.exe` | upstream `tools/wcap/wcap-x64.exe` (window capture tool) | Unlicense (public domain), see `LICENSE` |
| `scene-capture-desktop.ps1` | upstream `tools/wcap/` | Unlicense |
| `send-window-capture-hotkey.ps1` | upstream `tools/wcap/` | Unlicense |

The upstream `tools/wcap/LICENSE` (Unlicense text) is vendored verbatim next to
the binaries; the MIT license of the route module itself is in
[LICENSE](LICENSE).
