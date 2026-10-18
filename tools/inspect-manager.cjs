const fs = require('node:fs')

const files = {
  host: 'D:/dsh-plugins/dsh-deep-whale/skin-manager/lib/index.js',
  client: 'D:/dsh-plugins/dsh-deep-whale/skin-manager/lib/client.js',
  protocol: 'D:/dsh-plugins/dsh-deep-whale/skin-manager/lib/protocol.js',
}

const needles = [
  '不是 Git 仓库',
  '构建指纹',
  'skin.build',
  'bundleWired',
  'git',
  'fingerprint',
  'sourceCommit',
  'repository',
]

for (const [label, file] of Object.entries(files)) {
  const text = fs.readFileSync(file, 'utf8')
  console.log('\n########## ' + label + ' (' + text.length + ' chars) ##########')
  for (const needle of needles) {
    let from = 0
    let hits = 0
    while (hits < 3) {
      const index = text.indexOf(needle, from)
      if (index < 0) break
      console.log(`\n--- "${needle}" @ ${index} ---`)
      console.log(text.slice(Math.max(0, index - 320), index + 520))
      from = index + needle.length
      hits += 1
    }
    if (hits === 0) console.log(`\n--- "${needle}" : none ---`)
  }
}
