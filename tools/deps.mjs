// Dependency analysis for the browser half: which top-level names each fragment
// declares, and which names it borrows from another fragment.
//
// All 28 fragments are concatenated inside ONE factory closure (the loader contract
// is one ESM file, see tools/build.mjs), so every fragment can reach every other
// fragment's top-level `const` / `let` / `var` / `function` / `class`. That freedom is
// exactly the coupling this tool makes visible and bounds.
//
//   node tools/deps.mjs            # write docs/DEPS.md + tools/deps-baseline.json
//   node tools/deps.mjs --check     # fail on a cross-fragment reference the baseline does not list
//   node tools/deps.mjs --unused    # list top-level names nothing reads (dead code candidates)
//   node tools/deps.mjs --json      # machine-readable analysis on stdout (no writes)
//
// The analyzer is a small hand-written lexer, not a regex pass: the fragments contain
// large CSS / shader / HTML template literals and regular expressions, so strings,
// template substitutions, comments and regex literals must be skipped correctly or
// every token inside them would be mistaken for a reference. No npm dependencies.
//
// Exit codes: 0 ok, 1 --check found new references (or the baseline is missing), 2 usage.
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = dirname(HERE)
const BASELINE = join(ROOT, 'tools', 'deps-baseline.json')
const DOCS = join(ROOT, 'docs', 'DEPS.md')
const args = process.argv.slice(2)
const check = args.includes('--check')
const asJson = args.includes('--json')
const unusedOnly = args.includes('--unused')

// --- the fragment order is OWNED by tools/build.mjs --------------------------
// Duplicating the list here would let the two drift; read it from the builder and
// refuse to run when the shape it expects is gone.
function fragmentsFromBuild() {
  const source = readFileSync(join(HERE, 'build.mjs'), 'utf8')
  const block = /const FRAGMENTS = \[([\s\S]*?)\]/.exec(source)
  if (block === null) throw new Error('tools/build.mjs: cannot find the FRAGMENTS array')
  const names = [...block[1].matchAll(/'([^']+\.js)'/g)].map((match) => match[1])
  if (names.length === 0) throw new Error('tools/build.mjs: FRAGMENTS array is empty')
  return names
}

// --- lexer -------------------------------------------------------------------
const KEYWORDS_BEFORE_REGEX = new Set([
  'return', 'typeof', 'instanceof', 'in', 'of', 'new', 'delete', 'void', 'throw', 'case', 'do', 'else', 'yield', 'await',
])
const PUNCT_BEFORE_REGEX = new Set(['(', ',', '=', ':', '[', '!', '&', '|', '?', '{', '}', ';', '+', '-', '*', '%', '~', '^', '<', '>'])
const DECLARATION_KEYWORDS = new Set(['const', 'let', 'var'])

const isIdStart = (ch) => /[A-Za-z_$]/.test(ch)
const isIdPart = (ch) => /[A-Za-z0-9_$]/.test(ch)

/**
 * Tokenize one fragment. Strings, template literals (including `${}` substitutions),
 * comments and regex literals produce placeholder tokens, so no identifier inside
 * them can leak into the analysis.
 * @returns {{type: 'id'|'punct'|'num'|'literal', value: string}[]}
 */
function tokenize(text) {
  const tokens = []
  let index = 0
  const length = text.length

  const push = (type, value) => tokens.push({ type, value })
  const lastSignificant = () => (tokens.length === 0 ? null : tokens[tokens.length - 1])
  const regexAllowed = () => {
    const previous = lastSignificant()
    if (previous === null) return true
    if (previous.type === 'id') return KEYWORDS_BEFORE_REGEX.has(previous.value)
    if (previous.type === 'punct') return PUNCT_BEFORE_REGEX.has(previous.value)
    return false
  }

  const skipLineComment = () => {
    while (index < length && text[index] !== '\n') index += 1
  }
  const skipBlockComment = () => {
    index += 2
    while (index < length && !(text[index] === '*' && text[index + 1] === '/')) index += 1
    index += 2
  }
  const readString = (quote) => {
    index += 1
    while (index < length) {
      const ch = text[index]
      if (ch === '\\') {
        index += 2
        continue
      }
      index += 1
      if (ch === quote) return
    }
  }
  const readRegex = () => {
    index += 1
    while (index < length) {
      const ch = text[index]
      if (ch === '\\') {
        index += 2
        continue
      }
      index += 1
      if (ch === '/') break
      if (ch === '\n') break // a stray division sign, not a regex
    }
    while (index < length && /[a-z]/i.test(text[index])) index += 1
  }

  /**
   * Scan code. In substitution mode (`stopAtBrace`) an unmatched `}` ends the
   * substitution instead of being emitted as punctuation.
   */
  function readCode(stopAtBrace) {
    let braceDepth = 0
    while (index < length) {
      const ch = text[index]
      const next = text[index + 1]
      if (ch === '/' && next === '/') {
        skipLineComment()
        continue
      }
      if (ch === '/' && next === '*') {
        skipBlockComment()
        continue
      }
      if (ch === "'" || ch === '"') {
        readString(ch)
        push('literal', '')
        continue
      }
      if (ch === '`') {
        readTemplate()
        push('literal', '')
        continue
      }
      if (ch === '/' && regexAllowed()) {
        readRegex()
        push('literal', '')
        continue
      }
      if (stopAtBrace && ch === '}') {
        if (braceDepth === 0) {
          index += 1
          return
        }
        braceDepth -= 1
        push('punct', ch)
        index += 1
        continue
      }
      if (ch === '{' && stopAtBrace) braceDepth += 1
      if (isIdStart(ch)) {
        const start = index
        index += 1
        while (index < length && isIdPart(text[index])) index += 1
        push('id', text.slice(start, index))
        continue
      }
      if (/[0-9]/.test(ch)) {
        const start = index
        index += 1
        while (index < length && /[0-9a-fA-FxXoObBeE_.+-]/.test(text[index])) {
          // stop a numeric literal at the next token that cannot continue a number
          if (/[+-]/.test(text[index]) && !/[eE]/.test(text[index - 1])) break
          index += 1
        }
        push('num', text.slice(start, index))
        continue
      }
      // Whitespace is not a token: emitting it would split declarator lists and hide
      // every `const NAME = ...` from the declaration reader.
      if (/\s/.test(ch)) {
        index += 1
        continue
      }
      push('punct', ch)
      index += 1
    }
  }

  function readTemplate() {
    index += 1
    while (index < length) {
      const ch = text[index]
      if (ch === '\\') {
        index += 2
        continue
      }
      if (ch === '`') {
        index += 1
        return
      }
      if (ch === '$' && text[index + 1] === '{') {
        index += 2
        readCode(true)
        continue
      }
      index += 1
    }
  }

  readCode(false)
  return tokens
}

// --- declarations ------------------------------------------------------------
/**
 * Collect the bindings of one `const` / `let` / `var` statement starting at `start`.
 * Handles several declarators (`const a = 1, b = 2`) and destructuring patterns, and
 * walks initializers only to keep bracket depth honest.
 * @returns {{names: string[], next: number}}
 */
function readVarDeclaration(tokens, start) {
  const names = []
  let index = start
  let inInitializer = false
  let nest = 0
  let pattern = null // null | 'object' | 'array'

  while (index < tokens.length) {
    const token = tokens[index]
    if (token.type === 'punct') {
      const value = token.value
      if (pattern !== null) {
        if ((pattern === 'object' && value === '}') || (pattern === 'array' && value === ']')) {
          pattern = null
          index += 1
          continue
        }
        if (value === '{' || value === '[') nest += 1
        if (value === '}' || value === ']') nest -= 1
        if (value === ':' && nest === 0 && pattern === 'object') {
          // `{ key: binding }` — the key was already skipped (see the id branch)
          index += 1
          continue
        }
        index += 1
        continue
      }
      if (inInitializer) {
        if (value === '(' || value === '[' || value === '{') nest += 1
        else if (value === ')' || value === ']' || value === '}') {
          if (nest === 0) break
          nest -= 1
        } else if ((value === ',' || value === ';') && nest === 0) {
          if (value === ';') break
          inInitializer = false
          index += 1
          continue
        }
        index += 1
        continue
      }
      if (value === '=') {
        inInitializer = true
        index += 1
        continue
      }
      if (value === '{' || value === '[') {
        pattern = value === '{' ? 'object' : 'array'
        index += 1
        continue
      }
      if (value === ',' || value === ';') {
        if (value === ';') break
        index += 1
        continue
      }
      // `const` without a declarator is not valid javascript; stop to stay honest.
      break
    }
    if (token.type === 'id') {
      if (inInitializer) {
        index += 1
        continue
      }
      // or (const x of list) / or (const k in object): of and in end the
      // binding list. Treating them as further declarator names would both invent a
      // declaration and hide the iterated expression as a read.
      if (pattern === null && (token.value === 'of' || token.value === 'in')) break
      if (pattern === 'object') {
        const following = tokens[index + 1]
        const isKey = following !== undefined && following.type === 'punct' && (following.value === ':' || following.value === '(')
        if (isKey) {
          index += 1
          continue
        }
        names.push({ name: token.value, tokenIndex: index })
        index += 1
        continue
      }
      names.push({ name: token.value, tokenIndex: index })
      index += 1
      continue
    }
    index += 1
  }
  return { names, next: index }
}

/**
 * Walk one fragment: its top-level declarations (depth 0 = the shared factory
 * scope), every name it declares at any depth, and every identifier it reads.
 *
 * Reads are collected at EVERY depth on purpose: a function body inside fragment A
 * that reads a top-level name from fragment B is exactly the coupling this baseline
 * bounds, and most real references live inside functions. Names the fragment declares
 * itself (top level, local `const`, function/class names, parameters, catch bindings
 * and single-identifier arrow parameters) are excluded, so a local variable that
 * shadows a shared name is not misreported as a cross-fragment reference.
 *
 * Known conservative approximation: the name set is per fragment, not per lexical
 * scope, so a fragment that declares a local `x` in one function hides a legitimate
 * reference to some other fragment's top-level `x` in a different function. That
 * direction is safe for the baseline (it can miss a reference, never invent one).
 * @returns {{declares: {name: string, offset: number}[], uses: {name: string, offset: number}[]}}
 */
function analyzeFragment(text) {
  const tokens = tokenize(text)
  const declares = []
  const locallyDeclared = new Set()
  const bindingTokens = new Set()
  const uses = []
  let depth = 0

  /** Collect parameter names of a `(...)` list starting at `start`; returns its end index. */
  const readParameters = (start) => {
    let index = start
    if (tokens[index] === undefined || tokens[index].type !== 'punct' || tokens[index].value !== '(') return start
    index += 1
    let nest = 0
    while (index < tokens.length) {
      const token = tokens[index]
      if (token.type === 'punct') {
        if (token.value === '(' || token.value === '[' || token.value === '{') nest += 1
        else if (token.value === ')' || token.value === ']' || token.value === '}') {
          if (nest === 0 && token.value === ')') return index
          nest = Math.max(0, nest - 1)
        }
        index += 1
        continue
      }
      if (token.type === 'id') {
        const following = tokens[index + 1]
        const isKey = following !== undefined && following.type === 'punct' && following.value === ':'
        if (!isKey) locallyDeclared.add(token.value)
      }
      index += 1
    }
    return index
  }

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]
    if (token.type === 'punct') {
      if (token.value === '{') depth += 1
      else if (token.value === '}') depth = Math.max(0, depth - 1)
      continue
    }
    if (token.type !== 'id') continue

    const previous = tokens[index - 1]
    const beforePrevious = tokens[index - 2]
    const following = tokens[index + 1]
    // ...name is a spread read, not a member access. A spread tokenizes as three
    // '.' punctuation marks, so the identifier's previous token is '.' too; the token
    // before it tells the two apart.
    const isSpread = previous !== undefined && beforePrevious !== undefined && previous.value === '.' && beforePrevious.value === '.'
    const isMemberAccess = previous !== undefined && previous.type === 'punct' && (previous.value === '.' || previous.value === '?.') && isSpread === false
    // `{ key: value }` — the key is not a reference. A ternary consequent followed by
    // `:` is skipped too; that direction only loses a reference, never invents one.
    const isObjectKey = following !== undefined && following.type === 'punct' && following.value === ':'
    const isArrowParameter = following !== undefined && following.type === 'punct' && following.value === '=>'

    if (DECLARATION_KEYWORDS.has(token.value)) {
      const declaration = readVarDeclaration(tokens, index + 1)
      for (const binding of declaration.names) {
        locallyDeclared.add(binding.name)
        bindingTokens.add(binding.tokenIndex)
        if (depth === 0) declares.push({ name: binding.name, offset: index })
      }
      // Do NOT jump past the declaration: the initializer is ordinary code that may
      // read other fragments' names, and the loop is what records those reads.
      continue
    }
    if (token.value === 'function' || token.value === 'class') {
      const nameToken = tokens[index + 1]
      if (nameToken !== undefined && nameToken.type === 'id') {
        locallyDeclared.add(nameToken.value)
        if (depth === 0) declares.push({ name: nameToken.value, offset: index })
        readParameters(index + 2)
      } else if (nameToken !== undefined && nameToken.type === 'punct' && nameToken.value === '(') {
        readParameters(index + 1)
      }
      continue
    }
    if (token.value === 'catch') {
      readParameters(index + 1)
      continue
    }
    if (isArrowParameter) {
      locallyDeclared.add(token.value)
      continue
    }
    if (isMemberAccess || isObjectKey) continue
    // A declaration's own binding identifier is not a read of itself.
    if (bindingTokens.has(index)) continue
    uses.push({ name: token.value, offset: index })
  }
  const filtered = uses.filter((use) => !locallyDeclared.has(use.name))
  // rawUses keeps every read (including names this fragment shadows) for --unused;
  // uses is the coupling view the baseline records.
  return { declares, uses: filtered, rawUses: uses.map((use) => use.name) }
}

// --- analysis ----------------------------------------------------------------
const FRAGMENTS = fragmentsFromBuild()
const fragments = FRAGMENTS.map((name) => {
  const path = join(ROOT, 'src', name)
  if (!existsSync(path)) throw new Error('missing fragment: src/' + name)
  const text = readFileSync(path, 'utf8')
  const region = /\/\/#region\s+([^\r\n]+)/.exec(text)
  const analysis = analyzeFragment(text)
  return { name, region: region === null ? '' : region[1].trim(), ...analysis }
})

/** name -> fragment that declares it at the shared top level. */
const declaredIn = new Map()
const duplicates = []
for (const fragment of fragments) {
  for (const { name } of fragment.declares) {
    if (declaredIn.has(name)) duplicates.push({ name, first: declaredIn.get(name), again: fragment.name })
    else declaredIn.set(name, fragment.name)
  }
}

const order = new Map(fragments.map((fragment, index) => [fragment.name, index]))

/** Read count per declared name across every fragment, including its own reads. */
const usage = new Map()
for (const fragment of fragments) {
  for (const name of fragment.rawUses) usage.set(name, (usage.get(name) ?? 0) + 1)
}
/** Top-level names no fragment reads at all — dead-code candidates, verified by grep before deletion. */
const unused = fragments
  .flatMap((fragment) =>
    fragment.declares
      .filter((declaration) => (usage.get(declaration.name) ?? 0) === 0)
      .map((declaration) => ({ name: declaration.name, fragment: fragment.name })),
  )
  .sort((a, b) => order.get(a.fragment) - order.get(b.fragment) || a.name.localeCompare(b.name))

const references = new Map()
for (const fragment of fragments) {
  for (const use of fragment.uses) {
    const owner = declaredIn.get(use.name)
    if (owner === undefined || owner === fragment.name) continue
    const key = fragment.name + '\u0000' + use.name + '\u0000' + owner
    const current = references.get(key)
    if (current === undefined) references.set(key, { from: fragment.name, name: use.name, declaredIn: owner, count: 1 })
    else current.count += 1
  }
}
const referenceList = [...references.values()].sort(
  (a, b) => order.get(a.from) - order.get(b.from) || a.name.localeCompare(b.name) || order.get(a.declaredIn) - order.get(b.declaredIn),
)
const edges = new Map()
for (const reference of referenceList) {
  const key = reference.from + '\u0000' + reference.declaredIn
  const current = edges.get(key)
  if (current === undefined) edges.set(key, { from: reference.from, to: reference.declaredIn, count: reference.count, names: 1 })
  else {
    current.count += reference.count
    current.names += 1
  }
}
const edgeList = [...edges.values()].sort((a, b) => order.get(a.from) - order.get(b.from) || order.get(a.to) - order.get(b.to))

const stats = {
  fragments: fragments.length,
  declarations: declaredIn.size,
  declarationSites: fragments.reduce((sum, fragment) => sum + fragment.declares.length, 0),
  references: referenceList.length,
  referenceOccurrences: referenceList.reduce((sum, reference) => sum + reference.count, 0),
  edges: edgeList.length,
  unused: unused.length,
}

if (asJson) {
  console.log(JSON.stringify({ fragments: fragments.map((fragment) => ({ name: fragment.name, region: fragment.region, declares: fragment.declares.length, uses: fragment.uses.length })), stats, duplicates, unused, references: referenceList, edges: edgeList }, null, 2))
  process.exit(0)
}

if (unusedOnly) {
  console.log('deps unused: ' + unused.length + ' top-level name(s) no fragment reads')
  for (const entry of unused) console.log('  - ' + entry.name + '  (' + entry.fragment + ')')
  process.exit(0)
}

// --- --check -----------------------------------------------------------------
function readBaseline() {
  if (!existsSync(BASELINE)) return null
  try {
    return JSON.parse(readFileSync(BASELINE, 'utf8'))
  } catch (error) {
    throw new Error('tools/deps-baseline.json is not valid JSON: ' + (error instanceof Error ? error.message : String(error)))
  }
}

const keyOf = (reference) => reference.from + '\u0000' + reference.name + '\u0000' + reference.declaredIn

if (check) {
  const baseline = readBaseline()
  if (baseline === null) {
    console.error('deps check: tools/deps-baseline.json is missing; run: node tools/deps.mjs')
    process.exit(1)
  }
  const known = new Set((baseline.references ?? []).map(keyOf))
  const current = new Set(referenceList.map(keyOf))
  const added = referenceList.filter((reference) => !known.has(keyOf(reference)))
  const removed = (baseline.references ?? []).filter((reference) => !current.has(keyOf(reference)))
  const duplicatesKnown = (baseline.duplicates ?? []).length

  if (added.length > 0) {
    console.error('deps check: ' + added.length + ' new cross-fragment reference(s) — a fragment reached into another fragment\'s top level:')
    for (const reference of added) console.error(`  - ${reference.from} uses "${reference.name}" declared in ${reference.declaredIn} (${reference.count}x)`)
    console.error('')
    console.error('Move the shared value into the fragment that owns it, pass it explicitly, or —')
    console.error('when the new edge is intentional — refresh the reviewed baseline: node tools/deps.mjs')
    process.exit(1)
  }
  if (removed.length > 0) {
    console.log('deps check: ' + removed.length + ' baseline reference(s) no longer exist; the coupling decreased. Refresh the baseline: node tools/deps.mjs')
  }
  if (duplicatesKnown > 0) console.log('deps check: baseline records ' + duplicatesKnown + ' duplicate top-level declaration(s)')
  console.log(`deps check: OK (${stats.references} cross-fragment reference(s), ${stats.edges} edge(s), ${stats.declarations} shared name(s))`)
  process.exit(0)
}

// --- write baseline + docs ---------------------------------------------------
const baseline = {
  schema: 1,
  generator: 'tools/deps.mjs',
  note: 'Reviewed cross-fragment top-level references. Regenerate deliberately with `node tools/deps.mjs`; `npm run check` fails on any reference missing here.',
  totals: stats,
  references: referenceList,
}
writeFileSync(BASELINE, JSON.stringify(baseline, null, 2) + '\n', 'utf8')

const escapeCell = (value) => String(value).replace(/\|/g, '\\|')
const fragmentRows = fragments
  .map((fragment) => {
    const outgoing = edgeList.filter((edge) => edge.from === fragment.name)
    const incoming = edgeList.filter((edge) => edge.to === fragment.name)
    const dependencies = outgoing.map((edge) => `\`${edge.to.replace(/\.js$/, '')}\` (${edge.names})`).join(', ') || '—'
    const dependents = incoming.map((edge) => `\`${edge.from.replace(/\.js$/, '')}\` (${edge.names})`).join(', ') || '—'
    return `| \`${fragment.name}\` | ${escapeCell(fragment.region)} | ${fragment.declares.length} | ${fragment.uses.length} | ${dependencies} | ${dependents} |`
  })
  .join('\n')

const referenceRows = referenceList
  .map((reference) => `| \`${reference.from}\` | \`${reference.name}\` | \`${reference.declaredIn}\` | ${reference.count} |`)
  .join('\n')

const edgeRows = edgeList
  .map((edge) => `| \`${edge.from}\` | \`${edge.to}\` | ${edge.names} | ${edge.count} |`)
  .join('\n')

const docs = `# 片段依赖（由 \`tools/deps.mjs\` 生成，不要手改）

28 个片段被拼进同一个工厂闭包（加载约定是"一个插件一个 ESM 文件"，见 \`tools/build.mjs\` 开头），
所以每个片段的顶层名字对其他片段都是可见的。本文件把这份耦合摊开：**哪些名字被哪个片段声明、被谁引用、跨了哪些边**。

改完 \`src/\` 之后：

\`\`\`bash
node tools/deps.mjs          # 重新生成 docs/DEPS.md 与 tools/deps-baseline.json
node tools/deps.mjs --check  # 只检查（npm run check 里的那一步）
\`\`\`

\`--check\` 的规则：出现 baseline 里没有的跨片段引用 → 失败，并报出"哪个片段用了谁、声明在哪、几次"；
引用变少 → 只提示刷新 baseline。这条检查是"别再往同一个闭包里堆"的机械保障，不是风格建议。

## 1. 统计

| 指标 | 数值 |
| --- | --- |
| 片段数 | ${stats.fragments} |
| 共享顶层名字 | ${stats.declarations}（声明点 ${stats.declarationSites}） |
| 跨片段引用（去重） | ${stats.references} |
| 跨片段引用（出现次数） | ${stats.referenceOccurrences} |
| 依赖边 | ${stats.edges} |

## 2. 片段表

| 片段 | region | 声明数 | 顶层引用数 | 依赖的片段（名字数） | 被哪些片段依赖（名字数） |
| --- | --- | --- | --- | --- | --- |
${fragmentRows}

## 3. 跨片段引用清单

| 来自 | 名字 | 声明于 | 次数 |
| --- | --- | --- | --- |
${referenceRows}

## 4. 依赖边

| 来自 | 指向 | 名字数 | 次数 |
| --- | --- | --- | --- |
${edgeRows}
`
writeFileSync(DOCS, docs, 'utf8')

console.log('deps: ' + stats.fragments + ' fragments, ' + stats.declarations + ' shared name(s), ' + stats.references + ' cross-fragment reference(s), ' + stats.edges + ' edge(s)')
if (duplicates.length > 0) {
  console.log('deps: WARNING ' + duplicates.length + ' duplicate top-level declaration(s):')
  for (const duplicate of duplicates) console.log(`  - "${duplicate.name}" in ${duplicate.first} and again in ${duplicate.again}`)
}
console.log('wrote docs/DEPS.md and tools/deps-baseline.json')
