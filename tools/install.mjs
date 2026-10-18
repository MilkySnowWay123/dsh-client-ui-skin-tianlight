// One-shot installer: registers the skin as a profile bundle (the vendor shape),
// and removes the temporary hand-inserted patch rows so the row is owned by the
// bundle's own cordis.patch.yml instead of being registered twice.
import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs'

const PKG_NAME = '@dsh-external/dsh-client-ui-skin-tianlight'
const PROFILE = 'C:/Users/57579/.dsh/profiles/web'
const stamp = new Date().toISOString().replace(/[:.]/g, '-')

function backup(file) {
  const target = `${file}.${stamp}.bak`
  copyFileSync(file, target)
  return target
}

// ---- 1. profile package.json: add the bundle entry ----
const manifestPath = PROFILE + '/package.json'
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
const bundles = manifest.dsh?.profile?.bundles
if (!Array.isArray(bundles)) throw new Error('profile manifest has no dsh.profile.bundles')
if (bundles.includes(PKG_NAME)) {
  console.log('bundles: already registered')
} else {
  backup(manifestPath)
  bundles.push(PKG_NAME)
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8')
  console.log('bundles: registered ' + PKG_NAME)
}

// ---- 2. drop the temporary insert blocks (bundle patch now owns the row) ----
const INSERT_BLOCK = /\n*# tianlight skin row[\s\S]*?- id: ui-skin-tianlight\r?\n\s+name: '@dsh-external\/dsh-client-ui-skin-tianlight'\r?\n?/g
for (const patchPath of [PROFILE + '/cordis.patch.yml', 'C:/Users/57579/.dsh/cordis.patch.yml']) {
  if (!existsSync(patchPath)) {
    console.log('patch: missing ' + patchPath)
    continue
  }
  const before = readFileSync(patchPath, 'utf8')
  const after = before.replace(INSERT_BLOCK, '\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n'
  if (after === before) {
    console.log('patch: no temporary block in ' + patchPath)
    continue
  }
  backup(patchPath)
  writeFileSync(patchPath, after, 'utf8')
  console.log('patch: cleaned ' + patchPath)
}

console.log('\n--- profile package.json bundles ---')
console.log(JSON.parse(readFileSync(manifestPath, 'utf8')).dsh.profile.bundles.join('\n'))
console.log('\n--- profile cordis.patch.yml ---')
console.log(readFileSync(PROFILE + '/cordis.patch.yml', 'utf8'))
