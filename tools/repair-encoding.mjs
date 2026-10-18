// Repairs the UTF-8 damage caused by a PowerShell Get-Content/Set-Content round trip.
// Every Chinese string in the skin was mangled; the intended text is known exactly,
// so each damaged line is replaced in place (indentation preserved, line count kept).
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const FILE = fileURLToPath(new URL('../lib/client.js', import.meta.url))
const lines = readFileSync(FILE, 'utf8').split('\n')

/** line number (1-based) -> { mustInclude, text } */
const FIXES = {
  747: { mustInclude: 'only trims decorative CSS animation', text: '* prefers-reduced-motion only trims decorative CSS animation; it must' },
  853: { mustInclude: 'near: [', text: 'near: ["喵？", "你靠得好近…", "（歪头）", "薄荷味的风？"],' },
  854: { mustInclude: 'pet: [', text: 'pet: ["呼噜呼噜…", "再摸摸嘛～", "唔…舒服", "耳朵不可以揪啦"],' },
  855: { mustInclude: 'feed: [', text: 'feed: ["是小鱼干！", "薄荷味儿的最好吃", "还想再来一条"],' },
  856: { mustInclude: 'play: [', text: 'play: ["逗猫棒！接住！", "啪！抓住了", "再来一次！"],' },
  857: { mustInclude: 'nap: [', text: 'nap: ["zzZ…", "困了…", "先眯一会儿"],' },
  858: { mustInclude: 'idle: [', text: 'idle: ["……有点无聊", "看着窗外的云", "今天天光真好", "陪我待会儿？"],' },
  896: { mustInclude: 'Matches the installed artwork', text: '// Matches the installed artwork (1130x569, about 2:1); keep in sync with the' },
  910: { mustInclude: 'root.setAttribute("aria-label"', text: 'root.setAttribute("aria-label", "薄荷小猫：可拖拽，点击打开互动菜单");' },
  941: { mustInclude: '{ id: "pet", label:', text: '{ id: "pet", label: "摸摸", mood: 8 },' },
  942: { mustInclude: '{ id: "feed", label:', text: '{ id: "feed", label: "喂食", mood: 12 },' },
  943: { mustInclude: '{ id: "play", label:', text: '{ id: "play", label: "逗猫棒", mood: 6 },' },
  944: { mustInclude: '{ id: "nap", label:', text: '{ id: "nap", label: "小睡", mood: 2 },' },
  1163: { mustInclude: 'later(() => say(', text: 'later(() => say("喵～我来啦", 2600), 700);' },
  1215: { mustInclude: 'the guard was firing', text: '// fix for the guarded remote access; the guard was firing on every call.' },
  1238: { mustInclude: 'loading:', text: 'loading: "读取中",' },
  1239: { mustInclude: '"no-remote":', text: '"no-remote": "未连接",' },
  1240: { mustInclude: 'error:', text: 'error: "读取失败",' },
  1241: { mustInclude: 'rejected:', text: 'rejected: "被拒绝",' },
  1242: { mustInclude: '"no-efforts":', text: '"no-efforts": "无档位",' },
  1245: { mustInclude: 'minimal:', text: 'minimal: "极简",' },
  1246: { mustInclude: 'low:', text: 'low: "低",' },
  1247: { mustInclude: 'medium:', text: 'medium: "中",' },
  1248: { mustInclude: 'high:', text: 'high: "高",' },
  1249: { mustInclude: 'max:', text: 'max: "最高",' },
  1250: { mustInclude: 'none:', text: 'none: "关闭",' },
  1333: { mustInclude: 'settle animation after release', text: '// settle animation after release; a real bug, not a styling nit.' },
  1358: { mustInclude: 'throw new Error(', text: 'throw new Error("remote.session.modelCatalog 尚未挂载");' },
  1451: { mustInclude: 'data-tl-rheo-empty', text: '{ "data-tl-rheo": "", "data-tl-rheo-empty": "", title: "推理等级：未读取到当前会话的模型选择" },' },
  1452: { mustInclude: 'data-tl-rheo-empty-text', text: 'React.createElement("span", { "data-tl-rheo-empty-text": "" }, "推理 · 未就绪"),' },
  1457: { mustInclude: 'const reason = typeof raw', text: 'const reason = typeof raw === "string" && raw.startsWith("err:") ? raw.slice(4) : (raw ?? "无档位");' },
  1460: { mustInclude: 'data-tl-rheo-empty', text: '{ "data-tl-rheo": "", "data-tl-rheo-empty": "", title: "推理等级：" + reason },' },
  1461: { mustInclude: 'data-tl-rheo-empty-text', text: 'React.createElement("span", { "data-tl-rheo-empty-text": "" }, "推理 · " + reason),' },
  1535: { mustInclude: '"aria-label":', text: '"aria-label": "推理等级",' },
  1540: { mustInclude: 'title:', text: 'title: "推理等级：" + label,' },
}

let changed = 0
const failures = []
for (const [number, fix] of Object.entries(FIXES)) {
  const index = Number(number) - 1
  const original = lines[index]
  if (original === undefined) {
    failures.push(number + ': line missing')
    continue
  }
  if (!original.includes(fix.mustInclude)) {
    failures.push(number + ': anchor not found -> ' + original.trim().slice(0, 60))
    continue
  }
  const indent = /^\s*/.exec(original)[0]
  lines[index] = indent + fix.text
  changed += 1
}

if (failures.length > 0) {
  console.log('ABORTED, no write. failures:')
  for (const failure of failures) console.log('  ' + failure)
  process.exit(1)
}

writeFileSync(FILE, lines.join('\n'), 'utf8')
console.log('repaired lines: ' + changed)

const text = readFileSync(FILE, 'utf8')
const leftover = text.split('\n').filter((line) => /[\uFFFD]/.test(line))
console.log('replacement chars left: ' + leftover.length)
