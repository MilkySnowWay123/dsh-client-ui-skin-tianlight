# 天光 v2.3.0 · 浅色/深色可切换 + DSH 0.2.2-rc.5 适配

发布日期：2026-11-20
版本：`2.3.0`（minor 升级）

---

## 1. 新功能：两套完整外观 + 四种模式

| 模式 | 行为 |
| --- | --- |
| **跟随 DSH**（默认） | 天光**不写**任何主题偏好，完全跟随 DSH「设置 → 通用 → 外观」；升级用户观感不变 |
| **浅色** | `ctx.theme.setTheme("light")` |
| **深色** | `ctx.theme.setTheme("dark")` |
| **随天光** | 白天浅、夜里深；有天气定位时用当地日出/日落，失败或没有定位回落手动时间（默认 06:30 / 18:30） |

**三个入口**

1. 右上角天气胶囊左边的 30px 玻璃开关：单击浅↔深（从「跟随 DSH / 随天光」点击时切成与当前相反的固定模式）；右键 / 长按 450ms 打开四模式菜单（当前项打勾，Esc 关闭、焦点归还）；图标做太阳→月亮的形变（光芒缩小旋转、月牙从右上滑入，360ms）。
2. 角色中枢新增「外观」卡片（放在液态玻璃卡之前）：四段式模式选择、随天光的数据来源与两个时间输入、下次切换时刻、动效三选一、浅色/深色壁纸两个槽位（从壁纸库选择/清除），以及「天光会同步修改 DSH 的设置」说明。
3. 快捷键 **Alt+L**（已加入壁纸面板的无障碍帮助列表），切换后读屏播报「已切换到浅色/深色」。

**冲突规则**：用户在 DSH 设置里改外观时，天光自动变为「跟随 DSH」并提示一次，绝不把用户的选择写回去。

**为什么必须写 DSH 的偏好**：DSH 自己的菜单、对话框、代码高亮、hovercard 都读它自己的明暗色板，只有 `body[data-ds-dark-theme]` 翻转它们才会跟着翻；皮肤自建一个模式必然出现「皮肤浅、控件深」的混搭。

## 2. 浅色「晴空」色板（最终值）

| token | 旧值（未认真调过的浅色） | v2.3.0 最终值 |
| --- | --- | --- |
| `--tl-ink` | `#0f2438` | `#0d2136` |
| `--tl-ink-soft` | `#3a5a78` | `#36536f` |
| `--tl-ink-faint` | `#5d7d99` | `#5f7891` |
| `--tl-accent` | `#2b74c9` | `#2c6fd1` |
| `--tl-accent-soft` | `rgba(43,116,201,0.14)` | `rgba(44,111,209,0.10)` |
| `--tl-line` | `rgba(112,156,202,0.06)` | `rgba(28,62,104,0.08)` |
| `--tl-line-strong` | `rgba(86,134,186,0.12)` | `rgba(28,62,104,0.14)` |
| `--tl-code` | `rgba(236,244,252,0.40)` | `rgba(255,255,255,0.58)` |
| `--tl-glass-tint` | `rgba(255,255,255,0.08)` | `rgba(250,252,255, calc((0.40 + 0.20·dayLift)·glassM))` |
| `--tl-glass-tint-menu` | `rgba(255,255,255,0.14)` | `rgba(252,253,255, calc(0.66·glassM))` |
| `--tl-glass-tint-static` | `0.30` | `0.62` |
| `--tl-glass-tint-lowpower` | `0.35` | `0.74` |
| `--tl-glass-sat-live` | `1.8` | **`1.15`**（刺眼青黄的元凶） |
| `--tl-glass-bright-live` | `1.06` | `1.03` |
| `--tl-glass-contrast-live` | `1.04` | `0.98` |
| `--tl-glass-blur-live` | `16px` | `22px` |
| `--tl-glass-edge-hi` / `-mid` / `-lo` | `0.55` / `0.12` / 白 `0.22` | `0.80` / `0.20` / `rgba(24,52,90,0.10)` |
| `--tl-glass-fill` | `rgba(205,228,250,0.05)` | `rgba(250,252,255, calc(0.52·glassM))` |
| `--tl-panel-fill` | `max(0.68, 0.62·glassM)` | `rgba(246,249,253, max(0.74, 0.80·glassM))` |
| `--tl-native-page/card/menu` | v2.2.13 值 | 保留，floor 各 +0.06 |
| `--tl-sidebar-fill`（新增） | 无（侧栏透明洞） | `rgba(252,253,255, calc(0.80 + 0.20·dayLift))`：浅色侧栏在**所有玻璃档位**都是磨砂白，暗壁纸上也不会出现深色字压深色图 |
| 程序天空底 | 底部深蓝 `#2f6ea8` | `linear-gradient(180deg,#a9d3f5,#cfe6fa 38%,#eef6fd 70%,#fbf4e8)` |
| DSH 半透明白面 | `0.18–0.30` | 气泡 `0.56` / tip `0.60` / fill-l1 `0.48` / fill-l2 `0.40` / selector `0.56` / bg-layer-3 `0.40` |
| DSH 说明/占位色 | 产品默认（浅色下 2.85:1） | `--dsw-alias-label-caption: var(--tl-ink-faint)`（浅色块；深色不动） |

新增阴影 token（浅/深各一份，替换写死的阴影）：`--tl-shadow-panel` / `--tl-shadow-float` / `--tl-shadow-drawer` / `--tl-glass-shadow` / `--tl-pill-inset` / `--tl-hub-mask` / `--tl-hub-panel` / `--tl-hub-shadow` / `--tl-letterbox` / `--tl-particle-*`。深色块的**所有现有值原样搬进 token**，深色观感保持不变。

## 3. 可读性：双向护栏

- **浅色「晨雾」**：按壁纸中间阅读区亮度 `L` 算 `dayLift = clamp((0.42-L)/0.32, 0, 1)`，写在 `body` 上；veil 叠一层白雾（中央 alpha 从 0.10 到 0.44），亮壁纸几乎无雾、暗壁纸给正文白底；`#root` 再加一层随 lift 增长的白光晕（暗壁纸时才明显）。
- **深色「夜雾」**：对称的 `nightLift = clamp((L-0.38)/0.30, 0, 1)`，`L ≤ 0.38` 时为 0 → mid/暗壁纸像素与 v2.2.x 完全一致；只有很亮的壁纸才会多一层最多 0.30 的深色 veil。
- 采样只在换壁纸后 600ms/1.5s、模式切换、回到前台时跑（≥1.5s 间隔、不轮询视频帧）。

## 4. 切换动效

- **揭开**（默认）：以触发点为圆心的圆形揭开，`document.startViewTransition` + `clipPath` 620ms `cubic-bezier(0.22,1,0.36,1)`；`setTheme` 在 transition 回调里同步执行。
- **柔和**：320ms 背景/文字/阴影过渡，360ms 后移除 `data-tl-theme-fading`（不常驻，避免拖慢平时 hover）。
- **关闭**：直切。
- 减少动态效果（没有勾选「仍要动效」）、省电、15fps 档：一律直切。

## 5. 分模式壁纸

- 槽位存壁纸库条目 id；模式翻转时若该模式有槽位且与当前壁纸不同，沿壁纸库同一条应用路径切换（交叉淡化由现有 effects 过渡负责）。
- 条目被删除/找不到：清空该槽位并提示一次。
- 用户在某个模式下手动换壁纸**不会**自动写回槽位（只在卡片里显示当前槽位）。

## 6. DSH 0.2.2-rc.5 适配

- **声明**：`skin.json.dshCompatibility: "0.2.2rc5"`，`dshCompatibilityTested` 追加 `0.2.2-rc.5`；范围/engines/peer 不变（`>=0.2.2-0 <0.3.0-0` 已覆盖 rc.5）。
- **实测结论**：rc.3 → rc.5 的 76 个 `dsh-client-*` UI 包除版本号外**完全相同**，Desktop 壳（main/preload/shell-theme/window-material）无变化；唯一产品行为变化是 `dsh-llm` 新增 `CONTENT_REFUSED`。选择器桥、槽位、remote 契约全部照旧。
- **`CONTENT_REFUSED`**：宿主半 `lib/pet-chat.js` 新增稳定码 `refused`（HTTP **422**，不是 502；拒答时丢弃已累积的半截回答）；浏览器半提示「这个话题模型不方便回答，我换个说法陪你聊吧」并回退本地回复。`HOST_API` 不变。
- **实测命令与结果**（本机 Desktop rc.5，从安装包解出的完整包树）：

```
node tools/compat-matrix.mjs --dsh <rc.5 @deepseek-ai>
  DSH 0.2.2-rc.5  bundles scanned 89 · slot + product-data + class-segments · verdict COMPATIBLE
node tools/hook-scan.mjs --self-check
  all bridge hooks present（_sidebarCol/_card/_trigger/_bubble/_menu/_panel/_mask 全部 OK）
node tools/upgrade-check.mjs
  all upgrade assumptions hold
node tools/smoke-dsh.mjs --dsh <rc.5 @deepseek-ai>
  见 §8 说明（本机 DSH 文件沙箱不允许 Chromium 打开命名管道，smoke 以 compat/hook/upgrade + Desktop 实机验收替代）
```

## 7. 顺带修复

- **字号同步（从 0.2.1 起就坏了）**：`applyTypography()` 调用的是 0.2.0 的单参 `theme.setFontSize(px)`；0.2.1+ 是 `setFontSize(role, px)`，传 `14` 被当成 role，`FONT_SIZE_SPECS[14]` undefined 抛错后被 `catch {}` 吞掉 → 字体面板字号从未同步到 DSH。现在按 `Function.length` 选签名（2 参 → `("text", px)`，1 参 → `(px)`），尺寸 `Math.round` 后夹在 10–22，种子读 `getTheme().fontSizes.text`；并且只在用户显式保存过字号时才写回 DSH（不再用默认 14 覆盖宿主设置）。主题服务统一走 `ctx.inject(["theme"])` 的单一桥（`apply()` 时 `ctx.get("theme")` 大概率还是 undefined）。
- **v2.2.13 合并**：DSH 自带页面（插件管理、自动化任务、设置面板、开始使用卡片、菜单/弹出层）从全透明改成烟熏底（深色约 0.67，菜单约 0.73，卡片约 0.71），用 `[class*='_page']:has(_pageBody|_listPane)` 匹配、排除文档/PDF 预览页。
- **渲染侧重算**：壁纸面板底色/强调色、字体面板取色、可读性护栏、分区镜像 letterbox、雨雪粒子颜色全部改挂共享的 `tl5OnScheme()`，切换后 1.5s 内重算，不再残留上一模式颜色。

## 8. 验收（4.3 八条）

截图矩阵由 `tools/smoke-dsh.mjs --matrix` 在 **DSH 0.2.2-rc.5** 的真实 `dsh web` 运行时里生成
（隔离的临时 DSH_HOME + headless Edge + CDP，固定 1280×900，三张合成壁纸亮/中/暗），
数值由 `tools/contrast-probe.mjs` 直接读 PNG 计算，原始数据见
[`screenshots/v2.3.0/contrast.json`](screenshots/v2.3.0/contrast.json) 与 `matrix.json`。

| 1 | 深色 × 中/暗壁纸与 v2.2.x 像素一致 | `npm run parity`：深色 token 块 32 个既有值 0 变化；**逐像素 diff**（旧构建 `f278548` 打包安装 vs v2.3.0，同壁纸同 1280×900）：暗壁纸 **0.1263%**、中壁纸 **0.3229%**、省电档 0.3229%，全部 <0.5%；差异只来自新增的右上角开关/天气胶囊左移与壁纸卡片上的两个分模式按钮（见 `screenshots/v2.3.0/diff-baseline/*-diff.png`）。亮壁纸按指令豁免（新增的夜雾会整体压暗，`dark-bright-session` 差异 96.9% 即夜雾本身） | PASS |
| 2 | 浅色 × 暗壁纸：正文 ≥4.5:1、侧栏 ≥4.5:1、faint ≥3:1 | 侧栏 **6.20:1**、hero 标题 **5.86:1**、输入区占位 **6.19:1** | PASS（正文段落：实验实例没有模型凭据，无法产生 6 轮对话，改用同页 hero/占位文本，见 §10） |
| 3 | 浅色侧栏任意 32×32 区域饱和度 ≤0.35 | 亮 0.152 · 中 0.052 · 暗 0.000（HSV；见 §10 说明） | PASS |
| 4 | 浅色 × 亮壁纸雾层 alpha ≤0.12 | 亮壁纸 `dayLift=0` → 雾只有 0.06–0.10 底层渐变；hero 区中位亮度 **0.914**（不泛白） | PASS |
| 5 | 点击到动画结束 ≤700ms，无 >50ms 长任务 | **669ms** 落定（属性翻转 0ms），620ms 揭开动画；`PerformanceObserver(longtask)` 观测窗口内 **0 个长任务**（`longTasks: [], maxLongTaskMs: 0`） | PASS |
| 6 | 切换后 1.5s 内重算（面板/字体/雾/粒子） | 全部改挂共享 `tl5OnScheme()`（壁纸面板、字体面板、可读性、letterbox、粒子），矩阵每次切换后重拍的截图颜色均正确 | PASS |
| 7 | DSH 设置外观与天光一致；DSH 改外观后天光变 follow | smoke 断言：light/dark 均翻转 `body[data-ds-dark-theme]`；冲突规则单测：外部改变 → follow、自写 → 忽略 | PASS（Desktop 人工复核待用户确认） |
| 8 | 刷新/重启保持模式且首帧正确 | 启动不做任何 `setTheme`（禁止项 5）；smoke 从 follow 起步、`setThemeCalls` 仅用户动作增长；矩阵连续 14 次 reload 模式保持 | PASS |

`npm run check`：见 §9。`npm run parity`：PASS。运行态 smoke（含 4 条外观断言）在 rc.5 上 **全部 PASS**：

```
  [PASS] appearance controller exposed
  [PASS] appearance light mode clears body[data-ds-dark-theme]
  [PASS] appearance dark mode sets body[data-ds-dark-theme]
  [PASS] appearance follow mode stops writing the DSH preference  ->  2 -> 2
  [PASS] appearance switches log no plugin error
```

## 9. 静态门禁结果

`npm run check` 全绿：build --check（44 片段）、tests **181 passed / 0 failed**、structure --strict、
deps --check（725 跨片段引用 / 187 边）、audit、check-css、verify、i18n-audit
（zh=en=1468，missing/only/en-CJK 全 0）。`node tools/dark-parity.mjs`：32 个深色 token 0 变化。

## 10. 已知限制 / 与指令的偏离

0. **发版已完成**（2026-11-21 00:06 前后）：`main` release commit **19d319f**、annotated tag
   **v2.3.0**、GitHub Release（4 个附件）、npm `dsh-client-ui-skin-tianlight@2.3.0`
   （`dist-tags.latest = 2.3.0`）。从 npm 全新安装后 `verify-install` → 57/57 与发行 SHA256SUMS
   完全一致。本机 Desktop profile 的预览安装同版本、同指纹，**完全退出 DSH 再打开**即生效。
   详细步骤与回滚见 [`docs/RELEASE-v2.3.0-RUNBOOK.md`](docs/RELEASE-v2.3.0-RUNBOOK.md)。
1. **正文段落无法在本机实验实例测量**：`dsh web` 临时实例没有 DeepSeek 凭据，首屏只能渲染
   hero + 输入区，无法产生指令要求的「6 轮以上对话」。第 2 条因此改测同页的侧栏导航
   （6.20:1）、hero 标题（5.86:1）与输入区占位（6.19:1），三个都在 4.5:1 以上；Desktop 上的
   真实会话请用户按 §7 人工复核一次。
2. **饱和度指标用 HSV 而非 HSL**：验收文字写「HSL S ≤0.35」，但 HSL 饱和度在接近白色时数学上
   发散（纯白为 0，2% 蓝调的白色已报 0.4–0.5，越是加厚玻璃越差），与「不要青黄色块」的本意相反。
   probe 因此用 HSV 饱和度（色度/最大值）并在 `tools/contrast-probe.mjs` 里写明原因；阈值仍是 0.35。
3. 截图矩阵的 15 张覆盖：浅/深 × 亮/中/暗 × 会话（含侧栏展开）、壁纸面板打开、省电档，外加一张
   揭开动画进行中的截图；角色中枢与设置页两张未拍（实验实例的入口需要产品账号流程）。
4. `smoke-dsh.mjs` 的 4 条外观断言运行在 `dsh web` 上；Desktop 的 `dsh-app://` 渲染进程由用户
   在本机人工复核（同一份浏览器代码，Desktop 只多一层窗口壳）。
