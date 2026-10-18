// Builds a distributable copy of the skin that does NOT modify the installed
// package. Code only: the game artwork (wallpaper video, character PNG) is
// user-supplied and deliberately excluded, so the artifact is redistributable.
// Usage: node tools/build-dist.mjs [version]
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, rmSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = dirname(HERE)
const VERSION = process.argv[2] ?? '0.1.0'
const OUT = join(ROOT, 'dist', 'package')

if (existsSync(OUT)) rmSync(OUT, { recursive: true, force: true })
mkdirSync(join(OUT, 'lib'), { recursive: true })
mkdirSync(join(OUT, 'assets'), { recursive: true })

// 1. publishable manifest: no `private`, versioned, explicit file list
const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))
delete pkg.private
pkg.version = VERSION
pkg.description = 'Tianlight skin for the DSH web GUI: a looping video wallpaper behind the whole interface, a Shinkai-style daylight palette, and a draggable chibi-cat desktop companion.'
pkg.keywords = ['dsh', 'dsh-plugin', 'dsh-skin', 'theme', 'wallpaper']
pkg.files = ['lib', 'assets/README.txt', 'cordis.patch.yml', 'skin.json', 'README.md', 'LICENSE']
writeFileSync(join(OUT, 'package.json'), JSON.stringify(pkg, null, 2) + '\n', 'utf8')

// 2. runtime files
for (const name of ['skin.json', 'cordis.patch.yml']) {
  copyFileSync(join(ROOT, name), join(OUT, name))
}
for (const name of ['index.js', 'client.js']) {
  copyFileSync(join(ROOT, 'lib', name), join(OUT, 'lib', name))
}
copyFileSync(join(ROOT, 'README.md'), join(OUT, 'README.md'))

// 3. asset slot documentation instead of the artwork itself
writeFileSync(
  join(OUT, 'assets', 'README.txt'),
  [
    'Drop your own media here; the skin reads this directory at runtime.',
    '',
    '  bg-main.mp4   wallpaper video, preferred slot (H.264 or HEVC)',
    '  bg-4k.mp4     fallback wallpaper, must be H.264',
    '  bg-1080.mp4   extra fallback',
    '  cat.png       companion art, transparent PNG, roughly 2:1',
    '',
    'With no files present the skin falls back to a sky gradient and the',
    'built-in vector cat, so it still works out of the box.',
    '',
  ].join('\n'),
  'utf8',
)

// 4. license for the code half
writeFileSync(
  join(OUT, 'LICENSE'),
  [
    'MIT License',
    '',
    'Copyright (c) 2026 the Tianlight skin authors',
    '',
    'Permission is hereby granted, free of charge, to any person obtaining a copy',
    'of this software and associated documentation files (the "Software"), to deal',
    'in the Software without restriction, including without limitation the rights',
    'to use, copy, modify, merge, publish, distribute, sublicense, and/or sell',
    'copies of the Software, and to permit persons to whom the Software is',
    'furnished to do so, subject to the following conditions:',
    '',
    'The above copyright notice and this permission notice shall be included in all',
    'copies or substantial portions of the Software.',
    '',
    'THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR',
    'IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,',
    'FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE',
    'AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER',
    'LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,',
    'OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE',
    'SOFTWARE.',
    '',
    'The artwork slot (assets/) is intentionally empty: any wallpaper video or',
    'character art you add is your own responsibility and is not covered by this',
    'license.',
    '',
  ].join('\n'),
  'utf8',
)

console.log('built: ' + OUT)
console.log('version: ' + VERSION)
console.log('files:')
for (const rel of ['package.json', 'skin.json', 'cordis.patch.yml', 'lib/index.js', 'lib/client.js', 'README.md', 'LICENSE', 'assets/README.txt']) {
  const full = join(OUT, rel)
  console.log('  ' + rel + '  ' + (existsSync(full) ? readFileSync(full).length + ' B' : 'MISSING'))
}
