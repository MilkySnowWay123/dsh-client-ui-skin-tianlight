# 天光 v2.2.9

液态玻璃改成「通透真玻璃」，修掉开侧栏/开壁纸面板时整窗发暗、发糊，并处理一批遮罩、可读性、透镜与编码缺陷。

## 一句话原因

- **整窗发暗**：桥把产品 `frame[data-sidebar-collapsed]`（整个应用外框）误标成 `data-tl-sidebar`，20c 的侧栏玻璃规则因此铺满全屏；外框 0.66/0.72 黑 + 左栏再叠 0.66/0.72，左栏合成接近 0.9 黑。
- **整窗发糊**：同一批规则里的全屏颗粒、底部暗渐变和 22px/60px 内阴影暗角；另有 `[data-tl-scene]::after` 的全屏玻璃雾面，覆盖整张壁纸，并与 35-context 的时段 `::after` 抢同一个伪元素。
- **不通透**：大面板没有 backdrop-filter，只能靠 0.66–0.96 的高不透明填充；壁纸面板取色写入 `max(0.96, ...)`，玻璃透明度滑杆实际失效。
- **透镜错位**：SVG 宿主 0×0，`feImage` 用 100% + 默认 userSpaceOnUse，得到不可靠的位移图；整块径向图被拉伸到任意长宽比，宽 composer 中间也在弯。

## 诊断（DSH 0.2.2-rc.3 + 真实 DSH web，1280×900，headless Edge）

状态：深度 real、实时开、暗色、侧栏收起/展开、壁纸面板 Alt+W 开/关。Console 跑第 1 节脚本后确认：

| 状态 | 全屏且有填充/滤镜的节点 | 数值 | 结论 |
| --- | --- | --- | --- |
| 侧栏收起 | `div.mP3x-q_frame[data-rightbar-collapsed][data-sidebar-collapsed][data-tl-sidebar]` | `background rgba(8,15,26,0.72)`，1280×900 | 整窗被外框玻璃规则压暗；复现 P0 |
| 侧栏展开 | 同一 frame | 无 `data-tl-sidebar`、背景透明 | 说明属性只在收起态挂上，正好解释「开/关侧栏时整窗闪暗」 |
| 一直存在 | `[data-tl-sidebar-col]` | `rgba(8,15,26,0.72)` | 左栏与外框叠加后接近 0.9 黑 |
| 一直存在 | `[data-tl-scene]::after` | 全屏颗粒 + 冷色 + 底部暗渐变 | 整张壁纸蒙雾，问题 2.2 |
| 壁纸面板开 | `[data-tl-wall-scrim]` | `rgba(10,22,38,0.18)`，1280×900 | 打开面板时整窗再暗一层 |
| 壁纸面板开 | `[data-tl-wall]` | 内联 `--tl-panel-fill` 合成 0.96+ | 面板像色块，滑杆无效 |
| 角色中枢开 | `[data-tl-hub-mask]` | `rgba(6,16,28,0.42)` | 遮罩偏重 |
| 首次登录模态 | `._mask_*::after` | `rgba(3,8,16,0.55)` | 产品遮罩 token 过重；已压到 ≤0.20 |
| composer | `::before` | `url(#tl-glass-lens-filter) blur(6px) ...` | 滤镜存在但 SVG filter 可能未创建；见透镜修复 |

补充：产品 `--dsw-mask-blur` 已是 `none`；在 0.2.2 web 上没有发现绕过 token 的硬编码全屏 `backdrop-filter`。产品遮罩的暗色仍来自 `--dsw-alias-bg-mask-*`，v2.2.9 把两套主题都压到 0.12/0.20。

## 改了什么

### 1. P0：侧栏状态不再当绘制目标

- `src/65-bridge.js`
  - 删除 `[data-sidebar-collapsed] → data-tl-sidebar` 的映射；
  - 增加 `isTooWide()`：宽度 > 视口 50% 的节点不标 `data-tl-sidebar-col`；
  - 侧栏只认 `[data-slot="sidebar"]` 与 `_sidebarCol`，并受宽度保险限制；
  - 产品状态写到 `body[data-tl-sidebar-state="collapsed|expanded"]`，卸载时删除。
- `src/20c-stylesheet-glass.js`
  - 所有绘制型 `:is([data-tl-sidebar], [data-tl-sidebar-col])` 只剩 `[data-tl-sidebar-col]`；
  - 左栏 0.66/0.72 全屏黑底删除，改为 0.20（暗）/0.08（浅）tint + `::before` 模糊；
  - 删除全屏 `--tl-liquid-lens-shadow`（22px/60px 内暗角）与全屏颗粒。
- `src/20b-stylesheet-shell.js`：透明规则保留，但只针对 `[data-tl-sidebar-col]`。
- `src/60-zones.js`、`src/59c-splash-film-runtime.js`：量左栏宽度和片头取景都改查 `[data-tl-sidebar-col]`。
- `tools/check-css.mjs` / `tools/test.mjs` / `tools/audit.mjs`：新增「绘制型 `[data-tl-sidebar]` 不得存在」「frame/场景/遮罩不得 blur」「宿主不得 filter/backdrop-filter/transform/will-change」回归。

### 2. 场景层与遮罩

- 删除 `[data-tl-scene]::after` 的玻璃雾面；`::after` 只保留时段暗化，冲突消失。
- `[data-tl-wall-scrim]` 改为 `background: transparent`，保留点击拦截/点空白关闭。
- 角色中枢遮罩 0.42 → 0.18。
- 产品遮罩 token：浅色 0.12/0.20，暗色 0.12/0.20；`--dsw-mask-blur` 继续 `none`。
- `35-context` 的「专注联动」默认仍是关；面板文案改为明确写「会压暗并模糊整张壁纸」。

### 3. 真玻璃：宿主上色、`::before` 模糊、`::after` 边缘光

适用：`[data-tl-sidebar-col]`、`[data-tl-wall]`、`[data-tl-settings]`、`[data-tl-hub-panel]`、`[data-tl-menu]`、composer。

- 宿主：`isolation: isolate` + 低 alpha tint + 体积阴影；**没有任何 filter/backdrop-filter/transform/will-change**。
- `::before`：`inset:0; border-radius:inherit; z-index:-1` 上放 `backdrop-filter`，不是 fixed 子元素的祖先，侧栏开关/tooltip 不会重锚。
- `::after`：1px 渐变边框 + `mask-composite: exclude`，左上 0.55 浅/0.28 暗，右下回光；没有均匀白线，也跟随圆角。
- 数值：
  - 浅色 tint 0.08（菜单 0.14），`blur(16px) saturate(1.8) brightness(1.06)`；
  - 暗色 tint 0.20（菜单 0.30），`blur(18px) saturate(1.6) brightness(0.92)`；
  - soft 10px/1.5；frosted 26px/1.2 + tint +0.06 + 细颗粒；off 维持 v2.2.8；
  - 实时关闭/低电量/15fps：tint 0.35/0.50，全部 `backdrop-filter: none`。
- 透明度滑杆继续走 `--tl-glass-m`；壁纸面板取色改为低 alpha `--tl-wall-tint`，不再写 `max(0.96, ...)`。
- 可读性护栏：`0.97` 实色改为 alpha ≤0.40 的 tint + 更强 blur（`max(28px, 当前档)`）；释放条件与缓存键逻辑保留。
- 浅色全局文字：`#root` 的白色 0.62/0.42 光晕改为深色淡阴影（0.24/0.16），不再让亮壁纸整屏发灰。
- 实时默认：深度非 `off` 且 localStorage 没有显式 `0` 时默认开启（`storedLive === null ? true : storedLive`）；显式关闭保持关闭。角色中枢文案同步说明能耗。

### 4. 透镜

- 按 composer 实际像素尺寸生成位移图：只在距边缘 16px 的带内沿法线位移，中心 128/128 零位移。
- `feImage` 写像素 `x/y/width/height`，`filterUnits="userSpaceOnUse"`；每个元素只有一个 filter id，关闭实时/卸载时销毁。
- 首屏 composer 尚未挂载时，250ms 重试至多 20 次，仅在实际创建 filter 后写 `data-tl-glass-lens-support="1"`，避免 CSS 引用不存在的 filter。
- 修掉 57-glass 注释乱码；`tools/repair-encoding.mjs` 全仓检查通过（见验证）。

## 验证

- `npm run build`：43 fragments 成功；`node --check lib/client.js` 通过。
- `npm run check`：全绿（见最终发布记录）。
- 真实 DSH 0.2.2-rc.3 / headless Edge 1280×900：
  - 侧栏点击展开/收起：开关从 244,22,28×28（展开）变为 10,18,36×36（收起），位置与关闭皮肤时一致；Web 快捷键 **Ctrl+Alt+B** 实测可开合（面板打开时快捷键按设计不响应）；Ctrl+B 是 Desktop 快捷键，本 headless web 运行时不适用。
  - 侧栏外区域像素变化（暂停 4K 视频后取同一帧；浅色静态天空 + 暗色夜景各一组）：抽样点 **0.00%**，区域均值最大 **0.42%**（要求 <3%）；
  - 全屏节点列表里没有任何新增的填充/滤镜，frame 背景为 `rgba(10,18,32,0)`；
  - 侧栏收起时 `data-tl-sidebar` 不再出现在 frame，`data-tl-sidebar-state=collapsed`；
  - 壁纸面板 scrim 计算值为 `rgba(0,0,0,0)`；
  - 暗色面板取色 `hsl(240 52% 18% / calc(0.24 * var(--tl-glass-m)))`，滑杆生效；
  - `data-tl-lowpower` 与 `data-tl-render-tier="15"` 下，全页非 none 的 backdrop-filter 数量均为 **0**；
  - lens filter 在 composer 挂载后创建：`filter x=0 y=0 width=712 height=116 filterUnits=userSpaceOnUse`，feImage 同尺寸，scale 24；侧栏收起后 composer 变宽为 815×116，filter 跟随 ResizeObserver 更新。
  - **4K 视频性能**（同一 headless Edge，深度 real + 实时开 + 左栏展开 + 壁纸面板打开，10 s）：2.2.8 基线 rAF **120.0 fps** / 视频帧 **600** / 丢帧 **0**；2.2.9 rAF **120.1 fps** / 视频帧 **601** / 丢帧 **0**，不低于改前。
- 截图：[`screenshots/v2.2.9/`](screenshots/v2.2.9)（浅色亮天空与暗色夜景的侧栏展开/收起、实时开/关、壁纸面板、低电量）。
- `npm run pack` → `npm run verify-install`：57/57 个文件与 `SHA256SUMS.txt` 一致。
- `npm run npm:publish:dry`：通过（57 files，tarball 18.3 MB）；正式 `npm publish` 需要账户 2FA 一次性验证码。

## 已知限制

- 4K 视频上的逐帧代价：v2.2.9 默认实时，只有明显示意才开启（深度非 off）。低电量/15fps 自动全部关掉模糊，tint 加深保证可读。
- 仍保留了小胶囊（模型/推理/新会话/天气/中枢预览）的宿主 blur，它们不承载 position:fixed 后代，且体量小；大面板已全部迁到 `::before`。若后续要做完全统一的「所有宿主零滤镜」，需要再给这些小控件加伪元素层。
- 侧栏第一帧的 backdrop-filter 是否采样到壁纸，取决于产品是否在祖先上设置 filter/opacity；本次实测祖先链干净（frame、#root 无 filter），若某产品版本改了祖先，玻璃会退化成纯 tint，需要在兼容矩阵中加测。

## 升级

完全退出 DSH（含托盘图标）→ 重新打开 → 页面 Ctrl+F5。
