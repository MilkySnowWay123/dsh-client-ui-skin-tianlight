const fs = require('node:fs')
const text = fs.readFileSync('D:/dsh-plugins/dsh-deep-whale/skin-manager/lib/index.js', 'utf8')

function all(needle, before = 150, after = 1400, limit = 2) {
  let from = 0
  let hits = 0
  while (hits < limit) {
    const index = text.indexOf(needle, from)
    if (index < 0) break
    console.log(`\n===== "${needle}" @ ${index} =====`)
    console.log(text.slice(Math.max(0, index - before), index + after))
    from = index + needle.length
    hits += 1
  }
  if (hits === 0) console.log(`\n===== "${needle}" : none =====`)
}

all('SKIN_MANAGER_ROUTE =', 0, 200, 1)
all('function useSkin', 100, 1500, 1)
all('function ensureSafeInitialState', 100, 1600, 1)
all('function enabledSkins', 100, 900, 1)
all('function patchTargetsForProfile', 100, 900, 1)
all('function sameOrigin', 100, 600, 1)
