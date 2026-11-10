# v1.6.1 · 液态玻璃 v2 + 新会话栏玻璃化 + 主界面天气胶囊

> 版本：`1.6.1`（`lib/client.js` **26 片段**；`BUILD`/`HOST_BUILD` = `1.6.1`）
> 本轮三件事：① 侧栏「新会话」按钮在深色主题下是一块与皮肤不协调的**深色块**（产品按钮 token 皮肤没接管）→ **全档位修复**，`depth-on` 再加完整玻璃；② 液态玻璃升级 **v2**（参考 OriginOS 7：更厚磨砂 + 更高饱和 + 多层 specular + 1px 亮/暗边 + 外柔光 + 细噪点 + 柔和回弹），并覆盖新会话按钮与天气胶囊；③ **DSH 主界面右上角新增常驻天气胶囊**（点击直达角色中枢天气卡）。
> 无宿主路由改动：Ctrl+F5 即可；`BUILD`/`HOST_BUILD` 同步为 1.6.1（仅 build 标记），若面板提示宿主半需重启，重启一次 DSH 即消除。

## 1. 侧栏「新会话」深色块修复

- **现象**：DSH 侧栏「新会话」按钮在深色主题下是一块突兀的深色块，与天光玻璃面板不协调；关掉液态玻璃（off）时最明显。
- **根因**：该按钮由 DSH 产品自身的 button token 着色——`--dsw-alias-button-elevated-fill`（填充）、`--dsw-alias-button-floating-hover`（hover）、`--dsw-alias-border-l3`（描边）——皮肤此前既没接管这组 token，也没给该按钮打锚点，所以玻璃/主题都覆盖不到它。
- **修复**：
  - `src/65-bridge.js`：selector bridge 增加识别 `[class*='_newSession']` 且类名分段含 `newSession` 的按钮（侧栏与 titlebar 变体），打锚点 `data-tl-new-chat`；保持 outermost / stamped / cleanup 规则一致，`dispose()` 清除该属性，不误标普通按钮、不标超大容器。
  - `src/20-stylesheet.js`：`[data-tl-new-chat]` 在**所有深度档**皮肤化——透明/玻璃填充 + 0.5px 描边 + 主题文字色、hover 用 accent-soft、`focus-visible` 可见；**off 档也不再是深色块**（这是本版唯一在 off 下也生效的修复）。
  - `depth = soft | frosted | real`：在基础皮肤化之上套用完整液态玻璃 **v2**（specular 高光 / 1px 亮暗边 / 外柔光 / 柔和回弹）。
  - 产品 token 覆盖块（`--dsw-alias-*`）补 `--dsw-alias-button-elevated-fill` / `--dsw-alias-button-floating-hover`（安全前提下），同类产品按钮的深色块一并被皮肤接管。

## 2. 液态玻璃 v2（OriginOS 7 风格）

参考 OriginOS 7 的「厚磨砂 + 通透高光」观感，把 v1.6 的玻璃从「一层模糊 + 一条高光」升级为多层次的液态质感：

- **更厚磨砂**：三档 blur 与 saturate 整体上调（见下表），磨砂档同时保留低饱和的"纸感"。
- **多层 specular**：左上径向高光 + 对角 sheen 叠加，右下冷色 tint 补足通透感，随档位增强；`real` 档高光最强。
- **1px 亮/暗边**：新增 `--tl-liquid-rim`，用 inset 1px 亮边 + 底部暗边勾勒玻璃边缘（`--tl-liquid-rim-shadow`），取代单一 inset 高光。
- **外柔光**：阴影从"轻投影"改为"外柔光（`--tl-liquid-glow-shadow`）+ 深投影"两层，玻璃像浮在壁纸上。
- **细噪点**：新增 `--tl-liquid-grain`（噪点贴图尺寸，极低透明度的 feTurbulence SVG data URI，`--tl-liquid-grain-image`），模拟真实磨砂颗粒；`off` 与低电量不渲染。
- **柔和回弹**：hover/active 的位移与亮度变化走柔和的 spring 过渡（`prefers-reduced-motion` 下关闭）。
- **新增表面**：侧栏「新会话」按钮 `[data-tl-new-chat]`、主界面天气胶囊 `[data-tl-weather-chip]` 纳入 v2 分组与降级规则；v1.6 的全部分组 A/B、场景兜底层 fallback、中枢玻璃预览条同步升级到 v2 配方。
- **变量**：沿用 `--tl-liquid-blur/sat/hi/lo/noise/sheen`，新增 `--tl-liquid-grain`（噪点尺寸）/ `--tl-liquid-rim`（亮暗边强度）及派生的 `--tl-liquid-surface` / `--tl-liquid-surface-size` / `--tl-liquid-grain-image` / `--tl-liquid-rim-shadow` / `--tl-liquid-glow-shadow`。

三档参数（`off` 不参与）：

| 档位 | blur | saturate | hi（亮边/顶光） | lo（底光/暗边） | sheen | noise | grain（噪点尺寸） | rim（1px 亮/暗边） | 观感 |
|---|---|---|---|---|---|---|---|---|---|
| `soft`（柔和，默认） | 11px | 1.30 | 0.30 | 0.14 | 0.40 | 0.035 | 180px | 0.26 | 轻磨砂、通透、日常 |
| `real`（真实） | 19px | 1.50 | 0.52 | 0.28 | 1.00 | 0.050 | 140px | 0.46 | 厚玻璃、强高光、层次最明显 |
| `frosted`（磨砂） | 26px | 0.95 | 0.55 | 0.08 | 0.12 | 0.120 | 110px | 0.50 | 强磨砂、低饱和、安静 |

- **性能与降级**：每视口最多一层大面积 live blur（大面板不加第二层、气泡不逐项加 blur，与 v1.6 预算一致）；`[data-tl-lowpower]`（低电量/15fps）压平到 blur ≤3px、去阴影/噪点/动画；`prefers-reduced-motion` 关闭过渡与回弹；**`off` 零变化**（仅 §1 的新会话深色块修复生效，其余保持 v1.4 前观感）。

## 3. DSH 主界面天气胶囊

- **位置**：DSH 主界面右上角的常驻浮动胶囊（不占布局、不遮挡内容），定位 `top: calc(var(--dsh-windows-titlebar-height, 0px) + var(--dsh-frame-top-clearance, 48px) + 8px)`、`right: 14px`、`z-index: 96`；外观为 v2 玻璃胶囊（`off` 档退化为中性玻璃胶囊）。
- **内容**：天气图标 + 温度 + 描述三段（`[data-tl-weather-icon]` / `[data-tl-weather-temp]` / `[data-tl-weather-desc]`），`aria-label`/`title` 使用天气摘要的本地化 7 键；`data-tl-weather-state` 标记状态。
- **状态机**（`data-tl-weather-state`）：`off`（未启用/运行时未挂载，显示中性「天气」提示）、`no-location`（已启用但无位置）、`waiting`（等待首帧数据）、`error`（请求失败，标题/aria 显示原因，底层保留上次观测）、`ready`（有当前天气，显示温度/描述）。状态文案与 aria 均 zh/en 双语（i18n key `weather.chip.*`）。
- **数据来源**：优先订阅 `globalThis.tianlightWeather`（`weatherController.subscribe()`），无订阅能力时 60s 轮询 `summary()`；语言切换时订阅 `subscribeTl5I18n` 刷新文案。**不自动 enable、不新增网络请求**——联网仍只由中枢天气卡的显式启用 + 定位触发（Open-Meteo，免 key）。
- **交互**：点击 / `Enter` / `Space` → 打开角色中枢（`globalThis.tianlightRoleHub?.open?.()`）看天气卡与设置；不新增权限、不新增网络路径。
- **生命周期**：由 `installWeatherChip()` 创建与销毁——节点只创建一次、幂等复用；`dispose()` 移除节点、退订、清 interval/监听；由 `src/99-apply.js` 常驻安装，不依赖 context 模块开关。

## 4. 验证

- 静态链：build/build --check 26/26、test 67/67、structure --strict、audit（v1.6.1 新守卫 4 条：新会话全档玻璃 / 玻璃 v2 配方 / 天气胶囊挂载 / 五状态+本地化）、check-css、verify、i18n-audit（zh=en 1216 键，referenced 928）全绿；日志 `diag/skinlab/runs/v161-static-chain.log`（8,976 B，evidence 内 40 条 green 行）。
- Node 冒烟：**622/622 PASS**（v1.6.0 的 586 条回归 + 36 条新增：N 新会话 11、C 天气胶囊 16、G 玻璃 v2 扩展 9），构建 sha `54b425d49a0eed6a86d6a7c41c617073d8be12ecb6eda8b688249d012f21294f`（`lib/client.js` 1,301,872 B / 1,259,416 字符，26 片段，version 1.6.1）；证据 `diag/skinlab/runs/20261110-184557-v161-v161-node-smoke/`（REPORT.md、data/report.json、622 条 `data/assertions.json`、`fragments/`（含 `selector-bridge.js`、`weather-chip.js`、`glass-all.css`）、`logs/static-chain.log`）。
- 分段：R 58/58、H 54/54、L 19/19、M 18/18、S 73/73、P 62/62、U 54/54、A 79/79、E 15/15、HIGH 46/46、W 26/26、X 32/32、N（新会话深色块修复）11/11、C（主界面天气胶囊）16/16、G（GLASS-ALL，v2 扩展）32/32、Q（LIMITS）27/27。
- 复跑确定性：同一 build sha 再跑一次同样 622/622 PASS，证据目录 `diag/skinlab/runs/20261110-184540-v161-v161-node-smoke/`。
- 真浏览器级视觉由你 Ctrl+F5 后点验（重点：侧栏「新会话」在深色/浅色主题与 off/soft/real 各档、右上天气胶囊五种状态、液态玻璃 v2 的高光/噪点/回弹）；本会话沙箱限制导致自动化浏览器验收不可用（Edge Mojo 命名管道）。

## 5. 升级 / 回滚 / 仓库

- 升级：Ctrl+F5；本版无宿主路由改动（仅 `BUILD`/`HOST_BUILD` build 标记同步为 1.6.1）；若中枢/面板提示宿主半需重启，重启一次 DSH 即消除。
- 回滚：`git reset --hard v1.6.0 && node tools/build.mjs`，再 Ctrl+F5。
- 仓库：内部 tag 为 `v1.6.1`；**`github-upload/` 镜像以公开命名 `v1.0.0` 上传**（用户要求：上传物与发布说明叫 v1.0.0，内部构建是 1.6.1）；本会话无凭据、**未 push**，GitHub Release 发布说明草稿见 `diag/tmp/github-release-v1.0.0.md`。
