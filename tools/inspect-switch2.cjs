const fs = require('node:fs')
const text = fs.readFileSync('D:/dsh-plugins/dsh-deep-whale/skin-manager/lib/index.js', 'utf8')

function all(needle, before = 250, after = 900, limit = 4) {
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

all('applyTarget', 200, 1500, 3)
all('switchPatch(', 300, 1100, 3)
all('renderManagedBlock(', 300, 500, 3)
all('function packageNames', 100, 700, 1)
