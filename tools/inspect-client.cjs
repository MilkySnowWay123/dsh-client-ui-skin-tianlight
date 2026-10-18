const fs = require('node:fs')
const text = fs.readFileSync('D:/dsh-plugins/dsh-deep-whale/skin-manager/lib/client.js', 'utf8')

function all(needle, before = 300, after = 800, limit = 3) {
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

all('无法切换', 300, 700, 3)
all('已适配', 300, 600, 2)
all('source === "none"', 300, 700, 3)
all('"none"', 250, 500, 4)
