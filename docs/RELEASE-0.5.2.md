# v0.5.2 · 自检修复：设置数据安全、i18n 完整性、面板体验

> 版本：`0.5.2`（`BUILD` / `HOST_BUILD` 构建标记同步为 `0.5.2`）
> 定位：用户反馈三类问题——**(1) 语言/文案中英混杂；(2) 面板/分区错位、重叠、被裁切或打不开；
> (3) 设置与壁纸选择丢失、重启不恢复**——的专项修复版本。**0.5.2 不包含新功能**，只修 UI/数据安全/文案。
> 最终构建：git `fe32f7f`；`lib/client.js` **798,816 字符 / 829,659 字节 / 21 个片段**；工作树干净。
> 验证：静态链（含新增 `tools/i18n-audit.mjs`）全绿；运行时矩阵 **4/4 运行时 PASS，387/387 断言，
> 0 failed / 0 skipped / 0 console error**；三类用户问题自检 **7/7（语言）、81/81（布局，zh+en × 4 视口）、
> 10/10（设置持久化）**，Desktop 布局 10/10，旧宿主降级 17/17（§5.2）。
> 相关：逐项功能表 [docs/V050-FEATURES.md](V050-FEATURES.md) · 兼容性 [docs/COMPATIBILITY.md](COMPATIBILITY.md) ·
> 上一版 [RELEASE-0.5.1.md](RELEASE-0.5.1.md) · 更新日志 [CHANGELOG.md](../CHANGELOG.md)

## 1. 范围

- 三类用户反馈逐项修复，按 **问题 → 根因 → 修复 → 证据** 记录（§2–§4）。
- 无新功能、不新增宿主路由、不改选择器桥；fragment 数仍 21。
- 唯一新增文件是工具 `tools/i18n-audit.mjs`（已纳入 `npm run check` 与 CI）；另新增一个本地专用备份键
  `tianlight.backup.host`（不参与宿主同步）。

## 2. 问题一（最严重）：设置/壁纸选择丢失、重启不恢复

### 2.1 现象

用户反馈：更新/重启 DSH、换浏览器或某次宿主导入之后，皮肤设置（壁纸选择、玻璃、省电、排版、模块开关、
语言等）被清空或回到默认，看起来「设置没有保存/重启不恢复」。

### 2.2 根因

v0.5.0/v0.5.1 的 `applyHostSettings()` 在**宿主 revision 更新**时把宿主快照当作完整权威：
**宿主文件里没有的本地 `tianlight.*` 键会被删除**（`tl5RawRemove`）。只要宿主文件不完整——首次启动的空文件、
另一个浏览器写入的子集、一次失败的推送——本地完整设置就会被这段「以宿主为准」的逻辑清空。
这是数据丢失，不只是显示问题。

### 2.3 修复（`src/12-schema.js`）

| 规则 | v0.5.2 行为 |
|---|---|
| 宿主有的键 | 按宿主值落地（字符串覆盖） |
| 显式 `null` 墓碑 | **仍然删除本地键**——跨浏览器删除语义保留 |
| 宿主没有、本地独有的键 | **一律保留**，随后回推宿主（宿主重新变成超集），绝不反向清空本地 |
| 本地缓存为空而宿主有值 | 采纳宿主（避免「本地空 → push 一堆 null」把宿主也清空） |
| 采纳前备份 | 把导入前的本地可同步键写入 `tianlight.backup.host`（本地专用，`tianlight.backup.` 前缀被镜像层排除，**不参与宿主同步**；256KB 上限，超限按 key 截断并记诊断） |
| 恢复入口 | ⑦ 工程分区新增「恢复宿主导入前备份」：写回本地并立即推送宿主，显示「已恢复 N 项」 |
| bootstrap 推送 | 首启/迁移后全量推送；push 失败按需**重试一次**（1s，仅 network/5xx/超时；4xx/路由缺失不重试） |
| 可观测 | `tl5Diag("settings")` 记录 `{localKeys, remoteKeys, pushedKeys, pushRetried}`；`settingsStore.status()` 增加 `backup` / `recovered` |

### 2.4 证据（平台级，本机/单测）

| 场景 | 观测结果 |
|---|---|
| 首次启动、宿主为空（6 个可同步键） | 6 键**全量推送**（pushedKeys = 6） |
| 二次加载 | **不重复推送**（pushedKeys = 0） |
| 宿主是子集且 revision 更高 | 本地 **6/6 保留**并回推宿主；导入前备份 `tianlight.backup.host` = **451 B** |
| 宿主快照含显式 `null` 墓碑 | 该本地键**仍被删除**（跨浏览器删除语义不变） |
| PUT 失败一次 | 重试后成功（共 2 次尝试） |
| 面板「恢复宿主导入前备份」 | **恢复 1 项**（recovered = 1），随后同步宿主 |

> 运行时矩阵（真实 DSH 内）见 §5.2；上表为平台级/本机验证，运行时自检 C（10/10）进一步在真实 DSH 进程上确认：
> 宿主 rev74 子集（仅 `font.family`）→ 本地键保留、宿主回填为 rev75 超集（8 键）、`tianlight.backup.host` 写 7 键、
> status `{host:true, backup:true}`；pre-fix 基线 7/10 复现了删除 bug（保留作审计）。

## 3. 问题二：语言/文案中英混杂

### 3.1 现象

切到 English 后，部分界面仍出现中文：引擎自适应原因、壁纸来源/图层/着色器提示、省电原因、音频停止原因等；
少数动态拼接的文案无法被静态检查发现。

### 3.2 根因

1. `engine.adaptive.staticReason` / `engine.adaptive.fpsReason` **只有 zh 字典**，en 模式下 `TL_T` 回退中文；
2. `30-wallpaper.js` 的 provider / layer / shader 提示与 `55-lowpower.js` 的电池 detail、音频 stop 文案**直出中文**；
3. `ctx.*` 等 key 用 `"ctx." + period` 动态拼接，**绕过静态审计**（看起来像缺 key 或无法检查）；
4. `12-schema.js` 的 `settings.*` 字典因片段顺序只能在**运行时**注册，工厂期静态审计看不到。

### 3.3 修复

| 修复 | 内容 |
|---|---|
| 补全双语 key | `engine.adaptive.staticReason/fpsReason`、`engine.adaptiveLine`、`lowpower.batteryDetail/audioStopped`、`audio.*`（stopHidden 等）、`wp.*`（provider/layer/blend/shader preset/错误/选择提示）、`ctx.*` 等 en/zh 全量补齐 |
| `30-wallpaper.js` 全面 getter 化 | provider 卡片、图层/混合标签、ShaderToy 预设标签改为 **getter**，渲染时 `TL_T` 读取；完整字面量 key 映射表（`PROVIDER_KEYS` / `SHADER_PRESET_KEYS`），未知 id 不渲染 raw key |
| `55-lowpower.js` 结构化 detail | `state()` 增加 `detailKey` / `detailParams`，`detail` 保持语言中立（如 `15%`）；面板渲染时 `t(detailKey, detailParams)`，旧消费者显示 `15%` 也不会漏中文 |
| 动态拼接改字面量 | `35-context.js` 时段文案改为完整字面量 switch；`70-sidebar.js` 语言按钮用完整 key；`31` 自适应行改用 `engine.adaptiveLine` 参数化 |
| 工厂期注册 schema 字典 | `13-i18n.js` 在工厂期 `registerTl5Strings(TL5_SCHEMA_STRINGS)`，静态审计可见 `settings.*` |
| 新增 `tools/i18n-audit.mjs` | 静态扫描产品代码中的 `TL_T`/`t` 字面量 key（含已知动态家族 `ctx.` / `lang.` / `fx.`），与 zh/en 字典比对；**缺 key、仅一种语言、en 值含 CJK 即 exit 1**；zh 纯 ASCII 英文为报告项（品牌/技术白名单例外）。已加入 `npm run check` 与 CI |
| CI | `.github/workflows/check.yml` 增加 `i18n audit` 步骤（Node 20 + 22 都跑） |

### 3.4 证据

| 检查 | 结果 |
|---|---|
| `node tools/i18n-audit.mjs` | ✅ 全绿：registered **zh=787 / en=787**，referenced **619**；missing zh/en **none**、only zh/en **none**、en 含 CJK **none**；zh 纯英文为报告项，allowlist 仅 `lang.zh`（语言名）与 `wp.we.label`（品牌名） |
| `npm run check` | ✅ 静态链包含 i18n-audit（build --check / test 61/61 / structure --strict / audit / check-css / verify / i18n-audit） |
| 修复点核对 | engine adaptive 原因 en 文案存在；30 provider/layer/shader 为 getter；55 `detailKey` 结构化；35/70 无 `"ctx." +`、`"lang." +` 拼接；13 工厂期注册 schema 字典 |
| 运行时自检 A（混合语言） | ✅ **7/7 PASS**：zh 面板 0 英文泄漏、en 面板 0 中文泄漏（pre-fix 构建泄漏 7 处：① Sources 正文+5 处 tooltip、④ Appearance layer/blend 标签；baseline `20261109-123724-baseline-scA3` 仅作审计） |

## 4. 问题三：面板/分区错位、重叠、被裁切或打不开

### 4.1 现象

首次打开壁纸面板时清单显示 0 张（像坏了）；简单视图找不到更多设置入口；英文长标签在按钮/胶囊里挤压或
被裁切；低电量原因显示中文；窄视口或 Desktop 标题栏下分区可能重叠/被裁切。

### 4.2 根因

1. 首次打开清单时没有「加载中」态；第一次拉取失败也没有重试入口 → 用户看到「0 张」以为坏；
2. pick（简单）视图缺少「更多设置在『高级』」的指引；
3. 英文文案普遍更长，按钮/chip 未允许换行，窄容器里被挤压/裁切；
4. 低电量 detail 是直出中文字符串（同时是 i18n 问题）；
5. 分区布局需要跨视口 + Desktop 标题栏自检才能证明「不重叠/不裁切/可展开」。

### 4.3 修复

| 修复 | 内容 |
|---|---|
| 清单加载态 | 首次打开显示「加载中… / 正在读取壁纸清单…」；失败先 **1.2s 静默重试一次**；两次都失败才显示错误 + 行内「重试」按钮；宿主 build 过旧显示「重启 DSH Desktop 后重试」 |
| pick 视图指引 | 简单视图新增「更多设置（…）在右上『高级』」提示（仅一行 note，不新增分区） |
| 英文长标签兜底 | 按钮/chip 允许换行（`white-space: normal; overflow-wrap: anywhere; flex-wrap: wrap`），不再被裁切 |
| 低电量 detail | 55 改为 `detailKey` + 参数，面板渲染时本地化 |
| 布局自检 | 4 视口（1292×826@2 / 1406×803 / 1024×700 / 900×650）× **zh + en**，7 个扩展分区全部可展开、无重叠/裁切/横向溢出（**B/B2 81/81 断言**）+ Desktop 标题栏 **10/10** |

### 4.4 证据（布局自检，v0.5.2 判定）

| 检查 | 结果 |
|---|---|
| 4 视口 × zh+en × 7 个扩展分区 | ✅ **81/81 PASS**：面板 `0,0,321,h` 在视口内、`panel.scrollWidth 310 == clientWidth 310`、7 分区可展开、无重叠（10px 间距）、0 裁切样本、pick 视图隐藏扩展分区、摘要未截断、⑦ 英文行不溢出 |
| 字体面板 / 边缘手柄 / 双面板 | ✅ PASS：字体面板在两个测试尺寸均在视口内、Esc 关闭并归还焦点（`Aa`）；边缘手柄关闭时可见可点、打开时隐藏；双面板可同时使用 |
| Desktop 标题栏（模拟 preload） | ✅ **10/10 PASS**（面板 `top = 40px`，关闭键命中在面板内） |
| 用户侧 | 自检覆盖 4 组视口/DPI 与 zh+en；若仍看到具体位置问题，需要用户提供**截图 + 分区名**（工程无法从日志复现个案） |

## 5. 版本、构建与验证

### 5.1 版本与静态链

| 项 | 值 |
|---|---|
| 版本 | `0.5.2`（`package.json` / `skin.json`；`BUILD` / `HOST_BUILD` 同步为 `0.5.2`） |
| 构建 | ✅ git `fe32f7f`；`lib/client.js` **798,816 字符 / 829,659 字节 / 21 个片段**；运行矩阵时工作树干净（`gitDirty: []`） |
| 宿主半 | 无新增路由；只有 build 标记变化 |
| 静态链 | ✅ build --check（21/21）/ test 61/61 / structure --strict / audit / check-css / verify / **i18n-audit** 全 exit 0 |
| 工具/CI | `tools/i18n-audit.mjs` 新增并加入 `npm run check`；CI（Node 20 + 22）执行 `i18n audit` 步骤 |
| 发布工具（E5） | ✅ 工具就绪、`--dry-run` 已验证；**本版 tag 尚未切**（由 Lead 在发布流程中切） |

### 5.2 运行时矩阵（verifier 判定：全部 PASS）

矩阵 run：`diag/skinlab/runs/20261109-125936-v050-v052-multiversion`（exit 0，≈10m40s；稳定副本
`diag/skinlab/evidence/multiversion-v052.json`）。Run provenance：`fe32f7f` / 798,816 字符 / 829,659 字节 /
21 fragments / tree clean。

| Runtime | v0.4.0 base | v0.5.0 group | v0.5.1 delta | 总计 | 判定 |
|---|---|---|---|---|---|
| DSH 0.2.0-rc.2（npm web） | 38/38 | 42/42 | 16/16 | **96/96 PASS** | PASS |
| DSH 0.2.1-rc.5（npm web） | 38/38 | 42/42 | 16/16 | **96/96 PASS** | PASS |
| DSH 0.2.2-rc.1（npm web） | 38/38 | 42/42 | 16/16 | **96/96 PASS** | PASS |
| DSH 0.2.2-rc.1 Desktop | 41/41 | 42/42 | 16/16 | **99/99 PASS** | PASS |

- **387/387 断言 PASS；0 failed / 0 skipped / 0 console errors / 0 exceptions**；handshake
  `_engines?build=0.5.2` → `{build:"0.5.2", stale:false}`，错误 build 探针 `stale:true`；
  Desktop 标题栏面板 `top = 40px`、关闭键 hit-test 通过。
- v0.5.0/v0.5.1 分组在 0.5.2 上保持绿色（上表 38+42+16 / 41+42+16）。

| 用户问题 | 自检 | 结果 | 证据 run |
|---|---|---|---|
| 中英文案混杂 | A：zh 面板英文泄漏 + en 面板中文泄漏（①–⑥ + 7 扩展分区，正文/title/aria/placeholder） | ✅ **7/7 PASS**：zh 0 英文泄漏、en **0 中文泄漏**（pre-fix 构建泄漏 7 处：① Sources 正文+5 tooltip、④ Appearance layer/blend；baseline `20261109-123724-baseline-scA3` 仅审计） | `runs/20261109-125548-baseline-v052A-multiversion` |
| 面板布局 | B/B2：4 视口（1292×826@2 / 1406×803 / 1024×700 / 900×650）× zh+en × 7 分区；字体面板/边缘手柄/双面板 | ✅ **81/81 PASS**：面板在视口内、`scrollWidth == clientWidth`、7 分区可展开、10px 间距无重叠、0 裁切、摘要未截断、⑦ 英文行不溢出；字体面板 Esc 归还焦点、手柄可见/可点、双面板不重叠 | `runs/20261109-125621-baseline-v052B-multiversion` |
| 设置持久化 | C：写入→宿主 PUT；杀进程重启；新浏览器导入宿主；**子集宿主**（rev74 仅 `font.family`） | ✅ **10/10 PASS**：C1 宿主 rev21 + DOM 生效；C2 重启全部保留；C2b 新浏览器从宿主导入；C3 本地键保留、宿主回填 rev75 超集（8 键）、`tianlight.backup.host` 写 7 键、status `{host:true, backup:true}`（pre-fix 基线 **7/10** 复现删除 bug，`20261109-125214-baseline-v052C-multiversion` 保留作审计） | `runs/20261109-125428-baseline-v052C2-multiversion` |
| Desktop 布局 | vdesk B：标题栏 clearance + zh 布局矩阵 | ✅ **10/10 PASS**（面板 top 40px） | `runs/20261109-130728-baseline-v052Bdesk-multiversion` |
| 旧宿主降级 | v0.5.2 client × v0.4.0 host（模拟 Ctrl+F5 未重启） | ✅ **17/17 PASS，0 console error**：stale:true + 「宿主半待重启 DSH」提示、缺路由 404 无挂起、模块开关/壁纸播放正常 | `runs/20261109-125849-v050-degraded-v052degraded-multiversion` |

**证据**：`diag/skinlab/V052-VERDICT.md`、`diag/skinlab/V052-SELFCHECK.md`；矩阵 run 内 `matrix.json`
（含 `skinBuild` / `skinState.restore`）、`data/version-{v020,v0215,v022,vdesk}.json`、`logs/`、`shots/`
（96 PNG = 24/运行时）；稳定副本 `diag/skinlab/evidence/multiversion-v052.json`、
`evidence/multiversion-v052-degraded.json`、`evidence/v052/`（57 张 curated 截图 + 脚本快照 + selfcheck matrices）。

### 5.3 已接受残余风险（verifier §6，不阻塞发布）

1. **Desktop preload 为契约模拟**（document-start 注入标题栏属性 + 模拟 40px 条）；真实窗口 console 断言需要 CDP 端口。
2. **headless Edge 视口 1406×803**（布局矩阵用模拟其它尺寸/DPI）；几何断言是数值最小值，不是像素快照。
3. **lab 语言启动态不确定**（A/B 会恢复起始语言；zh→en 与 en→zh 两个方向在不同运行时都覆盖）。
4. **C4 天气只验证默认关**（0 外部请求）；A2 回环未在 headless 中真正激活（presence/idle-clean 断言，驱动路径由同一 `audioController` 状态代码路径确认）。
5. **子集宿主数据丢失场景**是直接编辑 `state/settings.json` 模拟第二个浏览器，证明采纳/回填/备份契约，不是真实多设备同步。
6. **同伴气泡无 CJK** 依赖 proximity 行/超时（菜单/aria 确定性断言；气泡在可见时采样）。
7. **部分 headless 运行带 reduce-motion/low-power 标记**（环境面板冻结），只影响环境截图，不影响布局/文本。
8. **字体面板布局**只在 900×650 与 1292×826@2 两个尺寸断言；其它尺寸未逐项矩阵化。
9. **`_frame-cache` roundtrip 会清空可丢弃缓存**；降级场景的 8 条网络日志错误是预期 404，不是 console error。

## 6. 生效方式

- **纯浏览器半修复**：没有新增宿主路由；设置安全逻辑、i18n 文案、面板加载态都在 `lib/client.js`，
  **Ctrl+F5 即生效**。
- build 标记从 `0.5.1` 变为 `0.5.2`：只刷新浏览器时页面会提示「宿主半待重启 DSH」（功能不受影响），
  想消除提示请**重启一次 DSH**。
- 数据安全逻辑加载即生效；`tianlight.backup.host` 是**本地键**，不参与宿主同步。

## 7. 已知限制与注意

- **0.5.2 不含新功能**：C4 天气、A2 节拍等行为与 v0.5.1 相同（见 [RELEASE-0.5.1.md](RELEASE-0.5.1.md)）。
- **备份是本地专用**：`tianlight.backup.host` 不参与宿主同步（每台机器独立），256KB 上限；
  「恢复宿主导入前备份」只在存在备份时可用；恢复只覆盖备份内的键，之后仍按正常镜像同步到宿主。
- **恢复范围**：备份只保存「宿主导入前」的本地可同步键；更早版本已经丢失的数据不在备份里，无法自动找回。
- **设置规则**：宿主有的键权威、本地独有键保留并回推、显式 null 仍是删除墓碑——见 §2.3。
- **i18n-audit 边界**：只审计静态字面量 key 与已知动态家族（`ctx.`/`lang.`/`fx.`）；新增代码若使用运行时拼接，
  需要改成字面量才能被审计。zh 纯英文检测是报告项（白名单除外），不阻塞。
- **布局自检边界**：4 视口 + Desktop 标题栏的断言覆盖「可展开/重叠/裁切/横向溢出」，但不能代替用户真实环境；
  如仍异常请提供截图 + 分区名。
- **v0.5.0 / v0.5.1 的既有取舍与残余风险仍适用**：见 [RELEASE-0.5.1.md](RELEASE-0.5.1.md) §8.3 与
  [RELEASE-0.5.0.md](RELEASE-0.5.0.md) §9。

## 8. 回滚

发布时由 `tools/release.mjs` 生成 release commit + 注记 tag + `backup/` 快照；本版**尚未打 tag**。

```bash
# 未推送前：回到 v0.5.1 的 release 提交
git tag -d v0.5.2        # 若已切
git reset --hard v0.5.1
# 或只撤掉 release 写入的文件
git checkout -- package.json skin.json src/10-constants.js lib/index.js lib/client.js CHANGELOG.md

# 已推送后
git push origin :refs/tags/v0.5.2
git revert --no-edit <release-commit>

# 快照
npm run restore          # 最近一次快照 = 本次 release 状态（回 release 之前请用 git）
```
