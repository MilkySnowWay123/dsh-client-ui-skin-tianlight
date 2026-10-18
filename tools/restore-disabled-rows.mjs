// Removes the stray `dsh-fix` disable block (which turned off this skin's row AND
// the core `ui-settings-general` row) from every user patch layer, leaving the
// skin-manager's own managed block untouched.
import { readFileSync, writeFileSync, existsSync, copyFileSync } from 'node:fs'

const PATCHES = [
  'C:/Users/57579/.dsh/profiles/web/cordis.patch.yml',
  'C:/Users/57579/.dsh/cordis.patch.yml',
]

const BLOCK = /# dsh-fix: disabled entry [^\n]*\n- id: "?[^"\n]+"?\n {2}disabled: (?:true|false)[ \t]*\n?/g

const stamp = new Date().toISOString().replace(/[:.]/g, '-')
let changed = 0

for (const path of PATCHES) {
  if (!existsSync(path)) {
    console.log('skip (missing): ' + path)
    continue
  }
  const before = readFileSync(path, 'utf8')
  let after = before.replace(BLOCK, '\n')
  after = after.replace(/\n{3,}/g, '\n\n').replace(/[ \t]+$/gm, '').trimEnd() + '\n'
  if (after === before) {
    console.log('unchanged: ' + path)
    continue
  }
  copyFileSync(path, path + '.' + stamp + '.bak')
  writeFileSync(path, after, 'utf8')
  changed += 1
  console.log('cleaned: ' + path)
}

console.log('\n--- profile patch now ---')
console.log(readFileSync(PATCHES[0], 'utf8'))
console.log('--- home patch now ---')
console.log(readFileSync(PATCHES[1], 'utf8'))
console.log('files changed: ' + changed)
