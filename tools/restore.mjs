// Restores the newest snapshot from ../backup into the live package.
// Usage: node tools/restore.mjs [--list]
import { cpSync, existsSync, readdirSync, rmSync, copyFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = dirname(HERE)
const BACKUP = join(ROOT, 'backup')

const TARGETS = {
  client: join(ROOT, 'lib', 'client.js'),
  index: join(ROOT, 'lib', 'index.js'),
  package: join(ROOT, 'package.json'),
  skin: join(ROOT, 'skin.json'),
  media: join(ROOT, 'lib', 'media-types.js'),
  http: join(ROOT, 'lib', 'http-media.js'),
  upload: join(ROOT, 'lib', 'upload.js'),
  scene: join(ROOT, 'lib', 'scene-project.js'),
  frame: join(ROOT, 'lib', 'scene-frame.html'),
}
const extFor = (dest) => (dest.endsWith('.json') ? 'json' : dest.endsWith('.html') ? 'html' : 'js')

const listing = readdirSync(BACKUP).filter((name) =>
  /^(client|index|package|skin|media|http|upload|scene|frame)\.\d{8}-\d{6}\.(js|json|html)$/.test(name),
)
const srcListing = readdirSync(BACKUP).filter((name) => /^src\.\d{8}-\d{6}$/.test(name))
if (process.argv.includes('--list') || listing.length === 0) {
  console.log(listing.length === 0 && srcListing.length === 0 ? 'no snapshots' : 'snapshots:')
  for (const name of [...listing, ...srcListing].sort()) console.log('  ' + name)
  process.exit(0)
}

// group by the timestamp suffix so a restore is always a consistent set
const stamps = [...new Set(listing.map((n) => n.match(/(\d{8}-\d{6})/)[1]))].sort()
const stamp = stamps[stamps.length - 1]
let restored = 0
for (const [kind, dest] of Object.entries(TARGETS)) {
  const ext = extFor(dest)
  const name = `${kind}.${stamp}.${ext}`
  if (!existsSync(join(BACKUP, name))) {
    console.log('missing in snapshot: ' + name)
    continue
  }
  copyFileSync(join(BACKUP, name), dest)
  restored += 1
  console.log('restored ' + dest + ' <- ' + name)
}

// src/ is the browser half's source of truth now; a snapshot without it would leave
// the product and its sources disagreeing, which tools/build.mjs --check reports.
const srcSnapshot = join(BACKUP, 'src.' + stamp)
if (existsSync(srcSnapshot)) {
  rmSync(join(ROOT, 'src'), { recursive: true, force: true })
  cpSync(srcSnapshot, join(ROOT, 'src'), { recursive: true })
  console.log('restored ' + join(ROOT, 'src') + ' <- src.' + stamp)
} else {
  console.log('no src snapshot for ' + stamp + '; run node tools/build.mjs --check after restoring lib/client.js')
}

console.log(restored === 0 ? 'nothing restored' : `restored ${restored} file(s) from ${stamp}`)
