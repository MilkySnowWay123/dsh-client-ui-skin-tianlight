// Creates one consistent snapshot of the live package plus src/ under backup/.
// restore.mjs picks the newest timestamp and restores the product and its sources
// together, so tools/build.mjs --check keeps passing after a rollback.
//
// Usage: node tools/snapshot.mjs
import { cpSync, copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = dirname(HERE)
const BACKUP = join(ROOT, 'backup')

const TARGETS = {
  client: 'lib/client.js',
  index: 'lib/index.js',
  package: 'package.json',
  skin: 'skin.json',
  // Host-half mechanisms. They are source files, not build output, so a rollback
  // that only restored index.js could leave it importing a missing module.
  media: 'lib/media-types.js',
  http: 'lib/http-media.js',
  upload: 'lib/upload.js',
  scene: 'lib/scene-project.js',
  frame: 'lib/scene-frame.html',
  // v0.5.0 host half: settings store, package import/export, pre-crop frame cache,
  // optional ffmpeg transcoding and the web-wallpaper project server.
  paths: 'lib/host-paths.js',
  settings: 'lib/settings-store.js',
  bundle: 'lib/bundle.js',
  cache: 'lib/media-cache.js',
  transcode: 'lib/transcode.js',
  webproject: 'lib/web-project.js',
  // v0.6.0: vendored Wallpaper Engine host bridge (scanner + scene.pkg decoder +
  // /api/we-wallpaper routes). Kept as a source module, so a rollback that only
  // restored index.js would otherwise import a missing file.
  wehost: 'lib/we-wallpaper/host.mjs',
}
const extFor = (rel) =>
  rel.endsWith('.json') ? 'json' : rel.endsWith('.html') ? 'html' : rel.endsWith('.mjs') ? 'mjs' : 'js'

const pad = (value) => String(value).padStart(2, '0')
const now = new Date()
const stamp =
  `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
  `-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`

// v0.5.0 modules are optional during the transition: a snapshot taken mid-rewrite
// still has to succeed for the files that exist.
const OPTIONAL = new Set(['settings', 'bundle', 'cache', 'transcode', 'webproject', 'wehost'])
for (const [kind, rel] of Object.entries(TARGETS)) {
  if (!existsSync(join(ROOT, rel))) {
    if (OPTIONAL.has(kind)) {
      console.log('snapshot: optional module not present yet: ' + rel)
      continue
    }
    console.error('snapshot refused: missing ' + rel)
    process.exit(1)
  }
}

mkdirSync(BACKUP, { recursive: true })
for (const [kind, rel] of Object.entries(TARGETS)) {
  if (!existsSync(join(ROOT, rel))) continue
  copyFileSync(join(ROOT, rel), join(BACKUP, `${kind}.${stamp}.${extFor(rel)}`))
}
const src = join(ROOT, 'src')
const srcSnapshot = join(BACKUP, `src.${stamp}`)
if (existsSync(src)) cpSync(src, srcSnapshot, { recursive: true })

console.log('snapshot ' + stamp)
console.log('  files: ' + Object.keys(TARGETS).join(', '))
console.log('  src:   ' + (existsSync(srcSnapshot) ? 'src.' + stamp : 'missing (product only)'))
