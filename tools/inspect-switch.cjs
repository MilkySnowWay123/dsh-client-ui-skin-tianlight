const fs = require('node:fs')
const text = fs.readFileSync('D:/dsh-plugins/dsh-deep-whale/skin-manager/lib/index.js', 'utf8')

function show(needle, before, after, limit) {
  let from = 0
  let hits = 0
  while (hits < (limit ?? 2)) {
    const index = text.indexOf(needle, from)
    if (index < 0) break
    console.log(`\n===== "${needle}" @ ${index} =====`)
    console.log(text.slice(Math.max(0, index - (before ?? 200)), index + (after ?? 900)))
    from = index + needle.length
    hits += 1
  }
  if (hits === 0) console.log(`\n===== "${needle}" : none =====`)
}

show('function applyTarget', 100, 1800, 1)
show('MANAGED_HEADER', 200, 700, 1)
show('function writeManaged', 200, 1200, 1)
show('function discover', 200, 1400, 1)
show('bundleWired', 300, 500, 2)
show('disabled', 200, 300, 4)
