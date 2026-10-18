// Final pre-flight: prove the profile can resolve the skin package and its
// client/skin exports, and align the skin-manager's managed block with the row
// that is actually enabled (tianlight), so a restart cannot be overridden.
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { createRequire } from 'node:module'

const PROFILE_DIR = 'C:/Users/57579/.dsh/profiles/web'
const PKG = '@dsh-external/dsh-client-ui-skin-tianlight'
const WIRING = 'ui-skin-tianlight'

let bad = 0
const requireFromProfile = createRequire(PROFILE_DIR + '/package.json')
for (const specifier of [PKG, PKG + '/client', PKG + '/skin.json', PKG + '/package.json']) {
  try {
    console.log('RESOLVES  ' + specifier + '  ->  ' + requireFromProfile.resolve(specifier))
  } catch (error) {
    bad += 1
    console.log('UNRESOLVED  ' + specifier + '  ::  ' + error.code)
  }
}

// Align the managed block with the active row.
for (const patchPath of [PROFILE_DIR + '/cordis.patch.yml', 'C:/Users/57579/.dsh/cordis.patch.yml']) {
  if (!existsSync(patchPath)) continue
  let text = readFileSync(patchPath, 'utf8')
  if (text.includes(WIRING)) {
    console.log('managed block already lists ' + WIRING)
    continue
  }
  const endMarker = '# --- end dsh-skin managed ---'
  if (!text.includes(endMarker)) {
    console.log('no managed block in ' + patchPath)
    continue
  }
  text = text.replace(endMarker, `- id: ${WIRING}\n  disabled: false\n${endMarker}`)
  writeFileSync(patchPath, text, 'utf8')
  console.log('managed block updated: ' + patchPath)
}

console.log('\n--- profile cordis.patch.yml ---')
console.log(readFileSync(PROFILE_DIR + '/cordis.patch.yml', 'utf8'))
process.exitCode = bad === 0 ? 0 : 1
