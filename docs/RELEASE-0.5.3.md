# v0.5.3 · 大修版：快捷壁纸、点击无响应、语言与智能情境安全默认

> 版本：`0.5.3`（`BUILD` / `HOST_BUILD` 构建标记同步为 `0.5.3`；git `73b378d`；
> `lib/client.js` **827,150 字符 / 859,341 字节 / 21 个片段**；build --check 21/21）
> 定位：无新功能、但针对用户新反馈做**大修**——「切换语言存在问题」「部分功能不好（天气、智能情景）」
> 「壁纸界面几乎所有功能未响应或差劲」，以及明确要求「wallpaper 快捷选择壁纸——弹出 wallpaper 界面、
> 直观点击切换、不要快捷选择文件/翻文件夹，重做！」。
> 验证：静态链（含 `i18n-audit`）全绿；运行时矩阵 **4/4 运行时 PASS，387/387 断言，0 failed / 0 skipped /
> 0 console error**；真实鼠标 **P1–P5 39/39 PASS**；旧宿主降级 **17/17 PASS**（§8）。
> 相关：[RELEASE-0.5.2.md](RELEASE-0.5.2.md) · [COMPATIBILITY.md](COMPATIBILITY.md) ·
> [CHANGELOG.md](../CHANGELOG.md)

## 1. 范围

- **不是功能版本**：没有新增能力；核心是把与用户预期不符的交互/默认值/点击链路改成「直观、可点、安全」。
- 四块改造：**壁纸快捷选择重做**（§2）、**整页点击无响应**（§3）、**C3 自适应误冻结**（§4）、
  **语言切换只切皮肤文案**（§5）、**天气/智能情境安全默认**（§6）、**控制台静音**（§7）。
- 兼容：DSH 范围不变（`>=0.2.0-rc.1 <0.3.0`，0.2.0 / 0.2.1 / 0.2.2 同一构建）；无新宿主路由。
- **行为变更**（需在兼容性文档显式说明）：皮肤里的「中文 / English」现在**只切皮肤自己的文案**，
  **不再联动 DSH 界面语言**；要跟随 DSH 请选择「跟随 DSH」。

## 2. 壁纸快捷选择重做（用户明确要求）

### 2.1 现象

用户要求：打开壁纸界面应能**直观点缩略图切换壁纸**，不要一上来就是文件选择/翻文件夹/URL/WE/GLSL 导入，
也不要被这些设置项干扰。

### 2.2 修复

| 项 | v0.5.3 行为 |
|---|---|
| pick 视图 | 改为**纯视觉缩略图网格**：2 列大卡片、更大预览、使用中卡片高亮（`[data-active]` + 高亮边框）、点击立即切换并弹 toast「已切换：{name}」 |
| 文件/导入入口 | **pick 视图移除**上传壁纸、URL 导入、WE 目录配置、GLSL 编辑器等一切文件/导入行 —— 这些**只在「高级」保留** |
| 视图互切 | 面板头右侧「更多设置」→ 高级；高级顶部「返回快捷选择」→ pick；pick 视图的视图切换器隐藏，只留这一个出口 |
| 入口默认 | 边缘手柄 / **Alt+W** 打开面板默认进入**快捷选择**（每次打开重挂载，view 回到 pick、不保留上次过滤/编辑器状态） |
| 点击反馈 | 卡片点击是乐观高亮 + 立即应用；失败时回退高亮并在面板内显示错误（不会静默吞点击）；壁纸模块被关时给出「请先在高级开启壁纸模块」 |
| 其余保留 | pick 视图保留来源 chips（全部/本地/WE）、搜索、排序；加载中/失败重试沿用 v0.5.2（「加载中…」+ 1.2s 静默重试 + 行内重试） |

> 目标：用户打开面板 → 看到壁纸卡片 → 点一下 → 立即切换；高级里的导入/上传/参数仍然完整可访问，但不挡路。

## 3. 「壁纸界面几乎所有功能未响应」根因与修复

### 3.1 根因（诊断结论）

DSH 产品侧可能残留一个**视觉上已消失的全屏 modal mask**（`position:fixed`、`z-index:1000`、
`pointer-events:auto`；首启/陈旧弹层场景）。它不在视觉上可见，但会**吞掉所有真实鼠标点击**；
键盘路径（Alt+W、Tab、Esc）仍然可达 —— 这正好对应「面板点哪都没反应，但快捷键能开」。

### 3.2 修复

| 修复 | 内容 |
|---|---|
| 皮肤表面抬升 | 皮肤自有浮层统一抬到产品 mask 之上、应用菜单之下：`scrim z-index:1290`、壁纸面板 `1300`、边缘手柄 `1310`、字体面板 `1320`（1290–1320 区间） |
| 不遮菜单 | 面板/遮罩仍从 Desktop 标题栏下方开始（`html[data-windows-titlebar]:not([data-fullscreen])` 安全区），z-index 抬升不会盖住 DSH 原生菜单 |
| 键盘路径保留 | Alt+W / Esc / Tab / 焦点陷阱行为不变（z-index 只影响命中层，不影响键盘） |
| 真实鼠标验证 | 注入产品 stale mask（`z-index:1000`）后仍可点：**P1–P5 39/39 PASS**（真实鼠标，见 §8.3） |

### 3.3 给用户的行动建议（若仍遇到整页点击无响应）

1. 按 **Esc** 关闭 DSH 当前弹窗/菜单；或直接**重启 DSH**（清理残留 mask）；
2. 再点面板右上「**更多设置**」（或按 Alt+W 重新打开）；
3. 如果只有个别控件不响应，请提供**截图 + 分区名**（工程无法从日志复现个案）。

## 4. C3 自适应误冻结修复

### 4.1 现象与证据

live 控制台出现 `adaptive:video-static` / `adaptive:probe` / `adaptive:cleared (resume)` 的循环；
背景/遮挡窗口的实测 FPS 接近 0，旧逻辑据此把视频降为静态帧，用户看到「动态壁纸自己冻住」。

### 4.2 修复

- **默认关闭**：新配置 `adaptive: false`（安全默认）；**旧用户已持久化的选择保留**（迁移安全），
  不会升级后被强行打开或关闭。
- **仅 visible & focused 采样**：`document.hidden`/不可见/窗口失焦/低功耗/用户手动暂停时**不采样、不降档**。
- **严格判定**：连续 **5 次**低样本（FPS < 15 或抖动 > 180）且跨度 **≥ 10s** 才降档；恢复需连续 5 次 ≥ 28fps。
- **冷却**：降档后 **5 分钟**才允许再次探测（`ADAPTIVE_PROBE_COOLDOWN_MS`；最多 15 个探针样本）。
- **日志**：只在状态变化时记一条，不再逐样本/逐探针刷 `adaptive:*`。
- **即时恢复**：窗口重新聚焦 / 页面恢复可见 / 用户手势恢复时**立即清除自动降档**（不再残留冻结帧）。
- **⑪ 引擎分区**：增加「自动降档可能冻结动态壁纸：如果画面停住，用下面的『锁定自适应』关闭它」提示 +
  一键锁定按钮；仅在自动降档实际 armed 时显示。

## 5. 语言切换修复

### 5.1 根因

旧实现里，用户在皮肤里显式选「中文 / English」会调用 DSH `locale.setLocale()`，把**整个 DSH 界面语言**
一起切走 → 整页重渲染/闪动/面板状态丢失，看起来像「切换语言有问题」。

### 5.2 修复

| 项 | v0.5.3 行为 |
|---|---|
| 显式选择 | **只切天光自己的文案**；绝不调用 `locale.setLocale()`，不写宿主 locale、不改 `html lang`/DSH 界面语言 |
| 跟随 DSH | 选「跟随 DSH」时仍通过 locale 服务订阅 `locale/change`，宿主语言变了皮肤跟着变 |
| 提示文案 | 语言行提示更新为「只切换皮肤文案；要跟随 DSH 请选『跟随 DSH』」 |
| 非 React 文案 | 新契约：给节点加 `data-tl-i18n-key`（刷新 `textContent`）或 `data-tl-i18n-title-key`（刷新 `title`），语言变化时统一刷新（`tl5ApplyI18nDom`） |
| 限制说明 | 该刷新是**语言事件时刻**的统一扫描：事件之后新建、且没有走上述契约的节点不会被自动翻译；React 组件应使用 `useTl5I18n()` 保证重渲染 |

## 6. 天气 / 智能情境安全默认

### 6.1 修复

- **安全默认全 OFF**：`timeOfDay=false`、`focusLink=false`、`adaptive=false`、`weather.enabled=false`；
  模块本体仍默认启用（开关还在），但所有会改变外观或联网的子功能默认关。
- **迁移安全**：只有缺失/非法字段才落到新默认；**已持久化的合法用户选择保留**（升级不强行改用户设置）。
- **C1 时段外观保守化**：只做很小亮度偏移——玻璃 ±≤0.04、场景压暗 ≤0.04，**合成后 |影响| ≤ 6%**；
  不碰壁纸选择、不加模糊/filter；面板显示「影响：壁纸亮度 ±x%」并给关闭按钮。
- **C4 天气折叠进「实验性功能（需要联网，Electron 下可能受网络策略限制）」**：默认关、零网络请求；
  失败给出可读原因 + 重试；保留 v0.5.1 的免 key/隐私声明。
- **⑨ 恢复默认**：一键关闭时段外观、专注联动、性能自适应与天气，恢复默认参数。

## 7. 控制台静音（frame-cache / 音频）

- **frame-cache miss 不再产生 404 控制台错误**：本地维护「本 profile 实际捕获过的 key」列表
  （`tianlight.cache.known`，最多 60 个、持久化）；未知 key 直接按本地 miss 处理、**不发网络请求**；
  只有已知 key 才探测缓存（fetch + blob URL，替代 `<img src>`，避免资源加载错误）。
- **捕获延迟 2500ms**：等首帧绘制后再抓帧，且只在页面**可见、非低电量**时执行。
- **`audio:system-failed` 只在用户触发时告警**：自动路径（页面隐藏/低功耗停止等）只写诊断，不刷控制台。

## 8. 验证与证据（verifier 判定）

**结论**：4/4 运行时 **387/387 断言 PASS**（0 failed / 0 skipped / 0 console error）；
真实鼠标 **P1–P5 39/39 PASS**；旧宿主 × 新客户端降级 **17/17 PASS**。

### 8.1 最终构建与静态链

| 项 | 值 |
|---|---|
| git | **`73b378d`**（`73b378d3838cb5b919c995cb41fd7ff867765121`） |
| 版本 / 标记 | `0.5.3`（`package.json` / `skin.json`；`BUILD` / `HOST_BUILD` = `0.5.3`） |
| 产物 | `lib/client.js` **827,150 字符 / 859,341 字节 / 21 个片段**；`node tools/build.mjs --check` → 21/21 |
| Provenance | 每个最终 run 的 `matrix.json` → `skinBuild:{version:"0.5.3", productChars:827150, gitCommit:"73b378d…", gitDirty:[]}` |
| 静态链 | build --check / test 61/61 / structure --strict / audit / check-css / verify / **i18n-audit** 全 exit 0 |

### 8.2 运行时矩阵（4 个 runtime 分别跑，全部 PASS）

| Runtime | v0.4.0 base | v0.5.0 group | v0.5.1 delta | 总计 | 判定 | Run |
|---|---|---|---|---|---|---|
| DSH 0.2.0-rc.2（npm web） | 38/38 | 42/42 | 16/16 | **96/96 PASS** | PASS | `diag/skinlab/runs/20261109-184439-v050-v053-v020-multiversion` |
| DSH 0.2.1-rc.5（npm web） | 38/38 | 42/42 | 16/16 | **96/96 PASS** | PASS | `diag/skinlab/runs/20261109-184903-v050-v053-v0215-multiversion` |
| DSH 0.2.2-rc.1（npm web） | 38/38 | 42/42 | 16/16 | **96/96 PASS** | PASS | `diag/skinlab/runs/20261109-185207-v050-v053-v022-multiversion` |
| DSH 0.2.2-rc.1 Desktop | 41/41 | 42/42 | 16/16 | **99/99 PASS** | PASS | `diag/skinlab/runs/20261109-185555-v050-v053-vdesk-multiversion` |

- **387/387；0 failed ids / 0 skips / 0 console errors / 0 exceptions**；handshake
  `_engines build = 0.5.3`、`_engines?build=0.5.3` → `{build:"0.5.3", stale:false}`，错误 build 探针 `stale:true`；
  Desktop 标题栏面板 `top = 40px`、关闭键 hit-test 在面板内。
- 运行方式：最终数字来自**逐个 runtime 单独跑**（同一冻结 skin、隔离 `DSH_HOME`/浏览器 profile）——
  本机单条 `--all` 曾因用户重启 live DSH 导致 lab-side node boot 超时；把 lab boot 超时从 120s 提到 300s
  后每个 runtime 均干净通过，**没有任何产品失败**。v0215 早期一次 94/96 是 lab flake（reload mount race +
  产品网络 blip），干净重跑为 96/96，**不是回归**。
- 矩阵已按 `isV053Plus()` 分支更新：v0.5.3 的 pick 视图无 WE 编辑器（改用来源 chip 过滤并断言重开复位契约）；
  v0.5.1 天气组在 v0.5.3 上先展开 ⑨ 的 `experimental` 子区再探测，并接受「关闭时输入可编辑、动作按钮禁用」的新形状；
  **历史 v0.5.0–v0.5.2 断言全部保留**。

### 8.3 P1–P5 真实鼠标 / 行为自检（39/39 PASS）

Run：`diag/skinlab/runs/20261109-190045-baseline-v053P-final-multiversion`（冻结的 `73b378d` skin，v022 web，真实 CDP 鼠标）。
逐项证据见 `V053-SELFCHECK.md`。

| 阶段 | 结果 | 关键观测 |
|---|---|---|
| **P1 picker 真实鼠标回归** | **15/15** | 边缘手柄打开面板默认 **pick** 视图；pick 无可见上传/文件选择、无 URL/WE/GLSL 导入行、无 WE 编辑器、无 facet 行；2 列网格 4 张 `[data-tl-wall-card]` 卡（`2.mp4`、`bg-4k.mp4`、`bg-main.mp4` + 自动）；**真实点击 `2.mp4`**（`elementFromPoint` = 卡内 `DIV.tl-wall-thumb`）→ 场景 `bg-4k.mp4 → 2.mp4`、宿主壁纸 `/skin-tianlight/uploads/2.mp4`、toast **“Switched to: 2.mp4”**、`[data-tl-in-use]` 移动；「更多设置」→ 高级（① 来源、② 清单、上传、「返回快捷选择」）并可返回；Alt+W 可开关 |
| **P2 stale 产品 mask 硬化** | **5/5** | 注入全屏产品 mask（`position:fixed; inset:0; z-index:1000; pointer-events:auto`）后，皮肤层（面板 **1300** / 手柄 **1310** / scrim **1290** / 字体面板 **1320**）仍可点：真实点击把手柄/卡片切换 `2.mp4 → bg-4k.mp4`；移除 mask 后无残留 |
| **P3 语言隔离** | **8/8** | 真实点击 中文/English/跟随 DSH：只切皮肤文案（`body[data-tl-lang]`、面板标题）——**产品文案与 `document.documentElement.lang` 在显式模式下保持不变**、不重载、面板不关闭/不重挂载、0 console error；显式模式不被宿主 locale 覆盖；auto 跟随宿主；显式选择刷新后持久 |
| **P4 控制台 / 自适应 / frame-cache / 音频** | **4/4** | 5s idle 窗口：**0 warnings / 0 errors / 0 exceptions**；无 `adaptive:*` 循环；无 `_frame-cache` 404；无 idle audio 警告 |
| **P5 天气 / 智能情境** | **7/7** | 天气折叠在 `experimental`（默认收起）、默认 OFF 且 **0 个 Open-Meteo 请求**；真实打开开关；真实城市搜索「上海」发起 Open-Meteo geocoding 请求（lab 出网被 abort，记录为失败、保留上一状态、无 console error）；C1/C2 开关干净恢复；`Restore defaults` 重置天气与情境模型 |

### 8.4 旧宿主 × 新客户端降级（17/17 PASS）

Run：`diag/skinlab/runs/20261109-185855-v050-degraded-v053degraded-multiversion`（browser 半 0.5.3、host 半 v0.4.0，
模拟 Ctrl+F5 未重启 DSH）：**17/17 PASS**，0 console errors。皮肤应用、host 单例、面板打开（v0.5.3 pick 布局 3 项）、
所有分区渲染、①–⑥ ×/Esc 正常；`_settings`/`_frame-cache/status`/`_transcode/status`/`_bundle`/`_web-project` → 404 无挂起；
`_wallpapers` → 200；`_engines?build=0.5.3` → `{build:"0.4.0", stale:true}` + 重启提示；设置本地模式；模块开关可用；壁纸播放；
网络噪音有界。

### 8.5 证据

- **矩阵**：`diag/skinlab/evidence/v053/matrices/matrix-v053-{v020,v0215,v022,vdesk,degraded}.json`（含 `skinBuild`
  provenance 与 `skinState.restore`）；源 run 见 §8.2/§8.4。
- **自检 P**：`runs/20261109-190045-baseline-v053P-final-multiversion/matrix.json` →
  `evidence/v053/selfcheck/matrix-v053-P.json` + `v053-P-facts.json`；截图 `evidence/v053/shots/P-*`。
- **文档/截图**：`diag/skinlab/V053-VERDICT.md`、`diag/skinlab/V053-SELFCHECK.md`；
  `diag/skinlab/evidence/v053/`（matrices/*.json、selfcheck、**42 张截图**、脚本快照、`live-input-v052/`）。
- 矩阵 run 内另有每 runtime 的 `matrix.json`、`data/version-*.json`、`logs/`、`shots/`。

### 8.6 已接受残余风险（verifier §6，不阻塞发布）

1. Desktop preload 为契约模拟（document-start 注入标题栏属性 + 40px 条）；真实窗口 console 断言需要 CDP 端口。
2. headless Edge 视口 1406×803；picker 网格在真实窗口/DPI 下像素会偏移（几何断言为数值最小值）。
3. lab 网络出网会 abort 跨域 Open-Meteo 请求；天气流程通过「请求已发起 + 优雅失败提示」验证，不是真实预报成功。
4. pick DOM 仍挂载一个隐藏的 `input[type=file]`（高级导入路径），在 pick 中不可见、不可点（已断言）。
5. 部分 headless 运行处于 `prefers-reduced-motion` 低功耗模式（截图里氛围层冻结），布局/文案不受影响。
6. lab runtime boot 在负载下较慢（数十秒~2 分钟）；仅调高 lab 超时，无产品变更。
7. 冻结副本 provenance：矩阵 `gitDirty=[]` 指产品树；验证时工作树里的文档编辑不属于运行时产物。

## 9. 兼容性与行为变更

- **DSH 范围不变**：同一份构建继续支持 0.2.0 / 0.2.1 / 0.2.2（`>=0.2.0-rc.1 <0.3.0`），无新宿主路由。
- **行为变更（重要）**：皮肤语言显式选择**不再联动 DSH 界面语言**；DSH 语言由 DSH 自己的设置决定。
  如果用户希望皮肤跟随 DSH，请选择「跟随 DSH」。
- **默认值变更**：C1 时段外观 / C2 专注联动 / C3 性能自适应 / C4 天气默认 OFF；
  **已持久化的合法选择保留**，不强制覆盖老用户。
- **新增本地键**：`tianlight.cache.known`（已捕获帧缓存 key 列表，本地数据、不参与宿主同步）。
- `tianlight.backup.host`（v0.5.2）与设置数据安全规则不变。
- 旧 v0.5.0/v0.5.1/v0.5.2 的既有取舍与残余风险仍适用（见 [RELEASE-0.5.2.md](RELEASE-0.5.2.md) §5.3）。

## 10. 回滚

发布时由 `tools/release.mjs` 生成 release commit + 注记 tag + `backup/` 快照；本版**尚未打 tag**。

```bash
# 未推送前：回到 v0.5.2 的 release 提交
git tag -d v0.5.3        # 若已切
git reset --hard v0.5.2
# 或只撤掉 release 写入的文件
git checkout -- package.json skin.json src/10-constants.js lib/index.js lib/client.js CHANGELOG.md

# 已推送后
git push origin :refs/tags/v0.5.3
git revert --no-edit <release-commit>

# 快照
npm run restore          # 最近一次快照 = 本次 release 状态（回 release 之前请用 git）
```
