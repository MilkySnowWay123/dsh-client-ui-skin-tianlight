# SPLIT-PLAN（精简版）：8 个大片段的拆分结论

> 只读分析，只新增本文件。行号相对**拆分前原文件**。快照：HEAD `dee5470` + 工作树 2026-11-16 10:5x。
> 落地工具：`tools/split-fragment.mjs`（`--out name:from:to` 可重复，先 dry-run；强制同名 region、连续区间、切点必须是
> 空行或两 tab 顶层声明/注释；`--replace` 让首片沿用原文件名）。**region 名重复是允许的**（59-splash/59b 先例），
> `build.mjs` 的 REGIONS、`structure.mjs` 的区域顺序（`indexOf` 取首次出现）都不用改；只需在 `FRAGMENTS` 按序插名字、
> 在 `ARCHITECTURE.md` 片段表每个新文件补一行（`--strict` 要求被提到）。

## 0. 结论总表

| 原文件（行数/KiB） | 现状 | 还能机械切？ | 切后最大文件 |
|---|---|---|---|
| `12-schema.js` 2523/102.8 | 已拆 12/12b/12c（668、2148） | 否（已拆） | 59.5K（12b-schema-sync） |
| `20-stylesheet.js` 3785/141.5 | 未动 | **能，3 刀**（需 wrapper+1 行代码） | 43.0K |
| `30-wallpaper.js` 4509/173.0 | 已拆 30/30b（2468） | 能，再 3 刀 | 78.5K（installScene 本身） |
| `40-companion.js` 2804/108.7 | 已拆 40/40b/40c（950、2585） | 能，再 2 刀 | 63.4K（installCompanion 本身） |
| `44-pet-brain.js` 3093/133.0 | 已拆 44/44b/44c/44d（427、1570、2274） | 能，再 2 刀换边界 | 41.9K（按建议 834/1417 切） |
| `59b-splash-film.js` 1732/108.3 | 未动 | **能，2 刀** | 65.8K（createSplashFilmRuntime） |
| `70-sidebar.js` 5006/207.2 | 已拆 70/70b（1142） | 能，再 2 刀（数据层） | 148.7K（installWallpaperSidebar 本身） |
| `76-role-hub.js` 5221/249.8 | 已拆 76/76b（1415） | 能，再 1 刀（数据层） | 176.8K（installRoleHub 本身） |

一句话：**12/30/40 已按同一切点落地；20、59b 收益最大且未动；70b/76b 已是单函数，顶层切分到顶，只能靠阶段 2 重构。**

## 1. 能按顶层声明机械拆的 vs 拆不动的

**能（切点都是空行/两 tab 顶层声明或注释，`split-fragment.mjs` 可直接执行）**
- `12-schema.js`：契约/修复/迁移（1–852）｜同步运行时（853–2148）｜工程面板（2149–2522）。已按 668/2148 落地，只差第一刀。
- `20-stylesheet.js`：CSS 是纯数据，切点取在 `@media/@supports` 之外的完整规则间：448/1755/2514；四片 18.8/39.8/39.8/43.0K。
  不能直接用工具（列 0 的 CSS 行不是合法起点），需手工把后三片包成 `const CSS_SHELL/CSS_GLASS/CSS_HUB = String.raw\`…\`;`，
  并把 `installStyles` 里唯一一行改成 `CSS + CSS_SHELL + CSS_GLASS + CSS_HUB + "\n" + tl5CssText()`。
  **不要用 `registerTl5Css` 拆主表**：注册块排在 12-schema 的工程 CSS 之后，会改变原有层叠顺序。
- `30-wallpaper.js`：再切 1019/1587/2138/2468 → 40.9/20.1/21.7/11.9/78.5K；`installScene`（2468–4507）只能整段搬。
- `40-companion.js`：已切 950/2585，还可切 226/505 → 9.6/11.2/16.1/63.4/8.4K；`installCompanion` 只能整段搬。
- `44-pet-brain.js`：可按 834/1417/2273 切（38.2/22.4/37.2/31.5K），把「权限/同意/限流/审计」独立成 44b；已施工版本用的是 427/1570。
- `59b-splash-film.js`：2 刀 → 素材（CSS/DOM/SHADERS）34.7K｜runtime 65.8K｜install 7.8K。第 2 刀要从**空行 16** 起
  （17 行是 3 tab 缩进的函数，工具只认空行/两 tab 起点），让 16 行空行归下一片即可。
- `70-sidebar.js`：数据层 3 刀 751/1028/1142 → i18n 表 45.5K｜CSS 8.6K｜share/recipe helper 4.0K｜面板 148.7K。
- `76-role-hub.js`：数据层 1 刀 860 → i18n 表 51.1K｜常量/只读模型 22.0K｜安装器 176.8K。

**拆不动（顶层只有一个函数/组件，内部状态全部走闭包）**
- `installRoleHub`（76c，3800 行/176.8K）：状态卡、生活、玻璃、开场、媒体、动作包、天气、AI、思考、Agent、自检、
  反馈、overlay、dispose 全是它的嵌套闭包，共享 `ui/openState/refs/refresh*`。
- `installWallpaperSidebar`（70b，3855 行/148.7K）：来源/取景/玻璃/性能/配方/分享/扩展分区/拖拽/光效同理，共享 React root 与面板状态。
- `installScene`（30e，2038 行/78.5K）与 `installCompanion`（40d，1634 行/63.4K）：DOM/媒体/事件/dispose 都在一个闭包里。
- `createSplashFilmRuntime`（59c，1490 行/65.8K）：WebGL/Canvas/WAAPI 状态机，能整体成一片、不能再切。
- **为什么拆不动**：这些不是「多个独立声明排在一起」，而是单个函数体；机械切行会切断 `const`/`let` 作用域并留下半个大括号，
  工具会拒绝（起点不是空行/顶层声明）。**前置重构**：①给安装器传入显式上下文对象（`ui`、`set*`、`refresh*`、`dispose` 集合），
  ②把每张卡片 builder 提成顶层 `function buildXxxCard(ctx)`，③React 面板按卡片拆组件并把共享状态提升到 Provider/Context，
  ④逐块搬事件解绑与 `aria`/CSP 逻辑，最后才可能切成 5–10 个文件。

## 2. 已执行的 6 刀 vs 我的建议边界（一致性）

- **12-schema → 12/12b-schema-sync/12c-schema-eng**：切点 668/2148，我建议 853/2148。差异只在第一刀：落地版把
  `TL5_MIGRATIONS`（迁移表）也归到同步片，`12b` 59.5K；建议版 53.4K。两者都是后→前引用，安全，**建议保留落地版**。
- **30-wallpaper → 30/30b-wallpaper-scene**：切点 2468，正是我 4 刀里的最后一刀（installScene），**完全一致**；我的
  1019/1587/2138 三刀未做，做了也只把 helper 拆开，峰值仍是 78.5K。
- **40-companion → 40/40b-install/40c-duty**：切点 950/2585，正是我 4 刀里的第 3、4 刀，**完全一致**；226/505 两刀未做，
  做了峰值仍是 63.4K。
- **70-sidebar → 70/70b-panel**：切点 1142，正是我第 3 刀，**一致**；751（CSS）、1028（share helper）未做。
- **76-role-hub → 76/76b-install**：切点 1415，正是我第 2 刀，**一致**；860（i18n 表 vs 常量/模型）未做。
- **44-pet-brain → 44/44b-pet-state/44c-pet-llm/44d-pet-mind**：切点 427/1570/2274，与我的 834/1417/2273 不同——落地版把
  「宿主 LLM 桥+状态+权限+审计」并成 47.5K 的 `44b-pet-state`，把「适配器+对话+上下文」并成 28.5K 的 `44c-pet-llm`；
  边界仍是业务边界，可接受；若想峰值 <42K，再按 834/1417 重切（注意已存在的 44b/44c/44d 文件名不能复用）。

## 3. 剩余最大文件的下一步与风险

1. **`76b-role-hub-install.js` 176.8K（下一步：阶段 2，唯一出路）**
   把 `buildOverlay` 内的卡片 builder 提成顶层函数，按现有分区注释切：L1773 状态、L1830 生活设置、L2040 玻璃、L2150 开场、
   L2179 媒体、L2545 动作包、L2747 天气、L2916 AI、L3445 思考、L3669 Agent、L3980 自检、L4014 指纹、L4213 反馈、L4317 overlay。
   风险：`ui`/`set*`/`refresh*` 的解构面很大；dispose 必须仍由外层统一回收（`confirmCaptureDisposer`、轮询 timer、全局
   `tianlightRoleHub` 还原）；`test.mjs` 对 hub 文案/`hub.*` 键的文本断言在卡片体内，搬家时别改字符串。
2. **`70b-wallpaper-sidebar-panel.js` 148.7K（下一步：阶段 2）**
   按分区提卡片：L1258 库、L1316 着色器编辑、L1407 帧选、L1590 分区、L1628 轮换、L1643 配方、L1858 分享、L1929 打包、
   L2206 WE 库、L3818 取景、L4074 玻璃、L4295 性能、L4479 分享、L4511 打包、L4610 扩展、L4708 拖拽、L4749 光效。
   风险：React root 只有一次创建/卸载（`renderPanel`/`unmountPanel`），拆组件不能改变 mount 语义；`registerTl5Css` 块
   必须连内容原样保留（`check-css` 逐块查括号/作用域/层叠）；`tl5OverlayRegister` 的 open/close 仍由外层控制。
3. **`20-stylesheet.js` 141.5K（收益最大、直接可做）**：按第 1 节 4 片切，最大 43.0K。风险：每块 `String.raw` 必须独立
   括号平衡、规则仍 `body[data-dsh-tianlight]` 作用域（`check-css` 逐块 + 合并后都查）；`--dsw-alias-*` 13 个 token、
   dark 块、reduced-motion、live-glass 断言都在前两片；切完必须跑 `node tools/check-css.mjs`。
4. **`59b-splash-film.js` 108.3K（直接可做）**：3 片，最大 65.8K。风险：`test.mjs` 用
   `function createSplashFilmRuntime`→`function installSplashFilm` 的源码区间做 stub 替换，切在两者之间会让该区间多两条
   region 注释（注释无害，替换后仍是合法 JS）；A 测试取**第一个** `//#region splash`（59-splash 在前，安全）；
   `check-css` 只扫 `String.raw`，这两个是普通字符串，不受影响。若想更稳，可把 runtime+install 合成一刀（73.6K）。
5. **其余补充刀（可选）**：`12b` 59.5K 可在 `settingsBootstrap` 再切（当前 12b 内约 L800）→ 两片 ~27K；`30` 三刀后峰值
   78.5K；`40` 两刀后峰值 63.4K；`44` 按 834/1417 峰值 41.9K。**注意** `44` 的 `let petMindState = petMindFallbackState()`
   会跨片调用后片的函数——函数声明同产物提升，安全；若改成 `const … = () =>` 就会 TDZ。

## 4. 跨文件通用风险与验证

- **初始化顺序**：所有建议切点已仿真，只有后→前引用（安全）；唯一的顶层前→后引用是 44 的 `petMindFallbackState()`（函数提升，安全）。
- **deps**：拆片让 `from` 改名，`tools/deps-baseline.json` 必须 `node tools/deps.mjs` 重生成（本次预计约 456 条新引用行、
  120 条旧行消失，其中大量只是改名，另有 `note/ASSET_BASE/HOST_API` 等被本地同名遮蔽的引用被**揭示**，属预期）。新增跨片边
  已列在第 1、2 节；`docs/DEPS.md` 随同生成。
- **structure**：每个新文件都要进 `FRAGMENTS`（紧跟原文件、顺序不变）并在 `ARCHITECTURE.md` 片段表加一行；REGIONS/区域顺序不用改。
- **test/audit 切片**：`test.mjs` 只切第一个 `//#region splash`（59-splash 在前）、`audit.mjs` 切 `pet agent`/`accessibility`，
  本计划都不碰；`test.mjs` 不读 `src/`（只有 10-constants 例外），拆片只改产物里的注释行。
- **i18n**：`i18n-audit` 扫整条产品文本并求值产品；拆片不改文本，但 `registerSchemaStrings` 懒注册钩子必须仍在 12-schema 首片。
- **每拆 1–2 个文件**：`node tools/build.mjs && node tools/build.mjs --check && node tools/structure.mjs --strict &&
  node tools/deps.mjs && node tools/deps.mjs --check && node tools/test.mjs`；20 加 `node tools/check-css.mjs`，12/44/70/76 加
  `node tools/i18n-audit.mjs`。**最后全链 `npm run check`**。顺序：20 → 59b → 44 补刀 → 30/40 补刀 → 70/76（只做数据层，函数留给阶段 2）。
