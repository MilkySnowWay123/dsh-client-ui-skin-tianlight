# v0.5.0 · 可开关、可观测的天光工作台

> 版本：`0.5.0`（宿主 build `0.5.0`，`skin.json` → `dshCompatibility: "0.2.2rc1"`，
> `dshCompatibilityRange: ">=0.2.0-rc.1 <0.3.0"`）
> 目标：在 v0.4.0「一份构建同时适配 DSH 0.2.0 / 0.2.1 / 0.2.2」的底座上，
> 落地 P0–P4 一批可开关、可观测、可回滚的功能；**新增功能只依赖三条运行时线共有的稳定钩子**。
> 集成状态：git `72d72fe`，`lib/client.js` 724,684 字符 / 750,666 字节 / 21 个片段；完整静态链全 PASS（test 61/61）。
> 运行时矩阵：**4 个运行时全部 PASS（323/323 断言，0 failed / 0 skipped / 0 console error）**；旧宿主 × 新客户端降级 17/17 PASS。
> 逐项功能表：[docs/V050-FEATURES.md](V050-FEATURES.md) · 兼容性：[docs/COMPATIBILITY.md](COMPATIBILITY.md) · 更新日志：[CHANGELOG.md](../CHANGELOG.md)
>
> 后续版本：v0.5.1 已补齐本文「未纳入」的 C4 天气联动（默认关、Open-Meteo 免 key），
> 并做 A2/同伴文案/引擎 UI 打磨，见 [RELEASE-0.5.1.md](RELEASE-0.5.1.md)。

## 1. 这一版改了什么

一句话：皮肤从「固定功能集」变成**模块化工作台**——设置可跨浏览器同步、功能可开关、
渲染预算可观测、失败可降级、发布有工具链；同时不牺牲 v0.4.0 的三线兼容承诺。

- **同一份构建继续支持 DSH 0.2.0 / 0.2.1 / 0.2.2**：不新增版本分支，不写构建哈希；
  新增的联动/国际化只使用三条线都存在的稳定钩子（见 §6）。
- **可开关**：壁纸、特效、情境、音频、桌宠、推理滑杆、排版七个模块可在 ⑦ 工程分区关闭，
  关闭即移除 DOM/监听器（lab 已验证），再打开重新安装；面板/取景/可读性护栏是常驻基础设施。
- **可观测**：⑦ 工程分区只读显示 fps、抖动、档位、省电原因、缓存命中、特效开销；
  ⑨ 情境分区显示性能自适应状态与原因；⑪ 引擎分区显示分辨率变体、缓存、转码能力与自适应锁定。
- **可分享**：⑥ 的配方 v2（壁纸/取景/外观/播放/轮播/特效/情境/排版）可导出/导入 JSON、
  生成 `#tl=…` 分享链接、整包导入导出。
- **宿主半有变更**：新增设置存储、导入导出包、预裁剪缓存、可选转码、网页壁纸路由，
  所以更新后需要**重启一次 DSH**；之后只改浏览器半仍 Ctrl+F5。设置/缓存写在插件目录 `state/`
  （本机数据，git 忽略）。
- **C4 天气联动本版未纳入**——这是范围决定而不是缺陷（可选能力、默认关、需要外部 API key 与联网）。
  皮肤仍然完全离线可用。

## 2. 按阶段

> 面板扩展分区由注册表按 order 渲染在**「高级」视图显示**（pick 视图由 CSS 按 `data-tl-view` 隐藏，保持精简，属有意行为）：
> engineering(700) / effects(800) / context(810) / audio(820) / engine(830) / legibility(840) / a11y(860)。
> 本文中的 ⑦–⑪ 是阅读用的简称，最终以注册 id/order 为准。

### P0 · 工程地基（E1 / E2 / E3 / E4 / E6 + 渲染预算）

| 项 | 内容 | 用户能看到什么 |
|---|---|---|
| E1 宿主设置 | `GET/PUT/DELETE /skin-tianlight/_settings`，设置落盘插件目录 `state/settings.json`（原子写、单调 revision）；宿主不可用时退化为本地模式 | ⑦ 工程分区显示「宿主配置文件 / 浏览器本地缓存」、配置版本与「立即同步」；换浏览器/重装后设置还在 |
| E2 schema 迁移 | 旧 `tianlight.*` 键归一化到 schema v5，迁移前备份到 `tianlight.backup.v5`，一次会话只跑一次 | 升级后旧设置照常生效；面板显示「已迁移 / 无需迁移」 |
| E3 多窗口 | 宿主 revision + BroadcastChannel + `storage` 事件，最后写入者为准 | 同浏览器两个窗口，改一个另一个跟随 |
| E4 工程面板与模块开关 | 注册表渲染 ⑦；模块开关调用模块运行时的 enable/disable；渲染预算只读指标总线；语言开关 | ⑦ 里能关模块、看指标、切语言；关闭后对应 UI 立即消失 |
| E6 CI | Node 20 + Node 22 无依赖静态链（6 个分步）；tag 推送校验 tag 与 package.json 版本一致并出 pack artifact | 每次 push/PR 都能在 GitHub 上看到分项静态检查结果 |

### P1 · 数据与内容（D1 / D2 / D3 / D4）

| 项 | 内容 | 用户能看到什么 |
|---|---|---|
| D1 壁纸库 v2 | 排序（名称/类型/最近使用/收藏优先）、标签 facet 多选、隐藏/收藏计数、空状态复位 | ②/⑥ 更好找图；筛选空了会解释并给清除入口 |
| D2 导入/导出包 | 宿主流式 `.tgz` 导出（清单+设置+配方+上传壁纸）、校验后原子导入 | ⑥ 一键导出/导入整包，显示导入/跳过数量；**设置写入宿主后刷新页面统一生效**（有提示） |
| D3 配方分享链接 | 配方 JSON（`tianlight-recipe` v2）→ base64url → `#tl=…` | 复制一条链接就能分享外观；打开后先确认再应用；无效链接不改任何设置 |
| D4 排版增强 | 内容最大宽度、段距、代码字号、阅读字体 | Aa 面板（Alt+T）新增控件；只影响消息正文与代码块，不动应用骨架 |

### P2 · 情境与可读性（C1 / C2 / C3 / D5）

| 项 | 内容 | 用户能看到什么 |
|---|---|---|
| C1 时段自适应 | 按本地时钟 dawn/day/dusk/night 调整叠加层/玻璃/氛围/画面压暗，不换壁纸 | ⑨ 可开关；手动时段优先 |
| C2 专注联动 | 生成中 `[data-chat-running]` → 场景压暗+模糊，结束恢复 | ⑨ 可开关、可调压暗/模糊；不覆盖手动暂停 |
| C3 性能自适应 v2 | 按实测 fps/抖动自动降档（着色器 60→30→15、视频→静态帧），原因可读可锁定 | ⑨/⑪ 显示原因与锁定按钮；采样较粗（约 2s 一次，静态帧后 60s 再探测）；省电监管仍然优先 |
| D5 可读性护栏 | 面板打开/壁纸变化时采样亮度与对比度，不足时只提亮面板与文字阴影 | 亮壁纸下面板文字依然可读；阈值 3–7:1 可调、可关 |

### P3 · 特效与氛围（B1 / B2 / B3 / B4）

| 项 | 内容 | 用户能看到什么 |
|---|---|---|
| B1 鼠标视差 | 场景层随指针轻微位移，幅度可调 | ⑧ 可开关、默认关；低功耗/减少动效/掉帧自动禁用 |
| B2 点击特效 | 点击处水波纹或火花，单层 canvas、30fps 上限 | ⑧ 可开关、可换风格；面板/输入框内不触发 |
| B3 氛围层 | 雨 / 雪 / 光斑，低帧率粒子场、密度可调 | ⑧ 可开关；省电时冻结；与 ④ 叠加层互不覆盖 |
| B4 转场 | fade / slide / zoom / dissolve + 时长（200–1500ms） | 切壁纸更柔和；过渡中音频状态保持；始终有 fade 兜底；减少动效时跳过 |

### P4 · 壁纸引擎（A1 / A2 / A3 / A4 / A5 / A6）

| 项 | 内容 | 用户能看到什么 |
|---|---|---|
| A1 系统音频回环 | 用户手势后 `getDisplayMedia({audio:true, video:true})`（只保留音轨），实时 AnalyserNode 分析；不录音、不上传 | ⑩ 在系统弹窗勾选「分享音频」后驱动音频响应着色器（`u_audio`）；不支持/被拒/无设备有明确提示 |
| A2 Now Playing | 只读 `navigator.mediaSession.metadata` | ⑩ 显示当前页面媒体标题/艺术家；没有就静默隐藏。播放状态只驱动一个装饰性圆点脉冲，**不是**真实音频节拍分析 |
| A3 网页壁纸 | WE `type:"web"`（或入口 `.html`）项目经 opaque-origin 沙箱 iframe 渲染 | WE 清单出现网页壁纸，失败/超时（20s）回落上一张；暂停/省电会卸载 iframe，**项目内部状态会丢失** |
| A4 动态分辨率 | `name.1080/1440/4k`（及 `-1080p` 等）变体按窗口宽 × DPR 自动选择 | 大屏自动更清晰，resize 后交叉淡入不黑屏；变体必须按文件名约定提供（不做内容探测） |
| A5 预裁剪缓存 | 可解码帧按窗口比例裁剪写入宿主 `state/frame-cache/`，命中/未命中可观测 | 再次打开同一壁纸首屏更快；⑪ 显示缓存状态并可清空；best-effort，失败直接实时帧 |
| A6 可选转码 | 本机有 ffmpeg 时 HEVC→H.264、GIF→MP4，输出 `assets/derived/` | ⑪ 对上传件显示转码按钮；没有 ffmpeg 就隐藏；失败/超时不覆盖源文件 |

### 其它（D6 / D7 / E5）

- **D6 键盘与无障碍**：壁纸/字体面板焦点陷阱、打开聚焦/关闭归还焦点、`role="dialog"` + `aria-modal` +
  `aria-label`、直播区播报；快捷键 Alt+W / Alt+T / Esc / Tab；行为不变。
- **D7 zh/en 双语**：接入 DSH locale 服务，⑦ 可切「跟随 DSH / 中文 / English」，无需刷新；
  显式选择同步切换 DSH 语言。本轮完成 322 处字面量转换、342 个 `lib.*` key；中文文案字节不变、
  代码层 0 处硬编码中文字面量。
- **E5 发布工具**：`node tools/release.mjs`（`npm run release`）一条命令完成版本自增 → 静态检查链 →
  快照 → CHANGELOG → 提交 → 注记 tag，并打印回滚步骤；拒绝脏工作树、拒绝重复 tag、不联网、不写 `state/`。
  本次集成只做了 dry-run 验证，没有实际打 tag。

## 3. 功能与降级速查

逐项行为、失败路径与代码位置见 **[docs/V050-FEATURES.md](V050-FEATURES.md)**。核心降级约定：

| 场景 | 降级结果 |
|---|---|
| 宿主进程是旧版本（无 v0.5.0 新路由） | `_settings` 404 → 设置本地模式；`_bundle` / `_import` / `_frame-cache` / `_transcode` / `_web-project` 404 → 对应入口自动隐藏或跳过，壁纸/面板/特效等客户端功能正常 |
| DSH 版本没有某个钩子（如 `[data-chat-running]` 或 locale 服务） | 联动/语言跟随静默失效；皮肤其余部分不受影响 |
| 浏览器不支持某项能力（`getDisplayMedia` / WebGL2 / 相关解码） | 功能显示「当前环境不支持」或隐藏，不抛错、不黑屏 |
| 本机没有 ffmpeg / 缓存目录不可写 / 缓存超限 | 转码按钮隐藏；缓存跳过；始终回落实时帧播放 |
| 网页壁纸暂停/省电 | iframe 被卸载，重新播放会重挂载，网页项目内部状态丢失（设计取舍） |
| 迁移/schema/宿主同步抛错 | 只记 `console.warn`，退化为本地模式；`apply()` 外层 try/catch 保证最坏结果是「皮肤不出现」，绝不是「DSH 进不去」 |

## 4. 验证证据

### 4.1 集成级（静态链，已确认）

| 检查 | 结果 | 证据 |
|---|---|---|
| 最终产物 | ✅ `git 72d72fe`（`72d72febf607a21223937f6b6b67308f6e8fade9`）；`lib/client.js` **724,684 字符 / 750,666 字节 / 21 个片段**；宿主 `lib/` 12 个文件（index 路由 + 11 个机制模块） | `git show 72d72fe --stat`；`node tools/build.mjs --check`（"21 fragments match lib/client.js"） |
| `npm run check` 静态链 | ✅ build --check / test **61/61** / structure --strict / audit / check-css / verify 全部 exit 0 | 静态链输出 |
| CI | Node 20 + Node 22 分步静态链；tag 校验 + pack artifact（配置就绪，GitHub Actions 需推送后跑） | `.github/workflows/check.yml` |
| 配方 v2 导入契约 + presets | ✅ 8 个配方（5 个 v0.5 + 3 个 v0.4）字段/类型/枚举全部通过 | `presets/README.md`；本地验证脚本 |
| 发布工具（E5） | ✅ 工具就绪、`--dry-run` 验证（拒绝脏树/重复 tag/低版本；不联网、不写 `state/`）；**本版 tag 尚未切**（由 Lead 在发布流程中切） | `tools/release.mjs`；`package.json` scripts |

### 4.2 运行时矩阵（verifier 判定：全部 PASS）

最终矩阵 run：`diag/skinlab/runs/20261109-111509-v050-final-multiversion`（exit 0，5m55s；稳定副本
`diag/skinlab/evidence/multiversion-v050.json`），对 `72d72fe` 的真实仓库构建执行：

| 运行时 | 启动方式 | v0.4.0 断言 | v0.5.0 断言 | 总计 | 判定 |
|---|---|---|---|---|---|
| DSH 0.2.0-rc.2 | `dsh web`（npm，隔离 profile） | 38/38 | 42/42 | **80/80 PASS** | PASS |
| DSH 0.2.1-rc.5 | `dsh web`（npm，隔离 profile） | 38/38 | 42/42 | **80/80 PASS** | PASS |
| DSH 0.2.2-rc.1 | `dsh web`（npm，隔离 profile） | 38/38 | 42/42 | **80/80 PASS** | PASS |
| DSH 0.2.2-rc.1 Desktop | app.asar CLI + 模拟 preload（40px 标题栏契约） | 41/41 | 42/42 | **83/83 PASS** | PASS |

- **0 failed / 0 skipped / 0 console errors / 0 exceptions**；四个运行时共用同一份构建（`_engines.build = 0.5.0`，
  新握手 `stale:false`、错误 build 探针 `stale:true`）。每个运行时 v0.5.0 分组 **42/42**。
- Desktop 标题栏：`panelRect.top = 40px`、面板高 763px、关闭按钮 hit-test 通过
  （`titlebar-contract-injected` / `panel-titlebar-clearance` / `panel-close-not-covered`）。

| 交叉验收 | 结果 |
|---|---|
| 面板/分区：①–⑥ + 高级视图 7 个扩展分区（engineering / effects / context / audio / engine / legibility / a11y），无重叠、无横向裁切；×/Esc 关闭 | ✅ 4/4 运行时 |
| 语言：zh↔en 切换立即生效、**无 reload**（`timeOrigin` 不变）、D7 旧标签跟随切换并可恢复；English 模式面板头/筛选/分区文案正确 | ✅ 4/4 运行时 |
| 模块开关：companion OFF → `[data-tl-cat]` / `[data-tl-say]` / `[data-tl-catmenu]` 归零、state 镜像一致；ON 恢复 | ✅ 4/4 运行时 |
| 渲染预算：⑦ 工程分区只读区（fps/抖动/档位/省电/缓存/特效）正常渲染、无重叠；本矩阵不做逐帧数值 KPI 验收 | ✅ 4/4 运行时 |
| 设置持久化：localStorage → 宿主同步（revision 递增）→ 刷新后本地+宿主恢复（null tombstone 清理） | ✅ 4/4 运行时 |
| 焦点联动（C2）、特效层（B1–B3）、音频分区空态（A2 不占位） | ✅ 4/4 运行时 |

**证据**：`diag/skinlab/V050-VERDICT.md`（判定与矩阵说明；证据副本 `diag/skinlab/evidence/v050/V050-VERDICT.md`）；
逐运行时完整 facts/断言：run 内 `matrix.json`、`data/version-{v020,v0215,v022,vdesk}.json`、`logs/`；
关键截图 50 张在 `diag/skinlab/evidence/v050/shots/`，run 内 76 张已复核截图在 `shots/`；
断言目录与运行说明见 `diag/skinlab/V050-MATRIX.md`。

### 4.3 旧宿主 × 新客户端降级（新交付场景）

run：`diag/skinlab/runs/20261109-112228-v050-degraded-degraded2-multiversion`（exit 0；稳定副本
`diag/skinlab/evidence/multiversion-v050-degraded.json`）——浏览器半 = 当前 v0.5.0 client，宿主半 = v0.4.0（git `4b4316f`）。

| 事实 | 观测 |
|---|---|
| 结果 | **17/17 PASS，0 console error / 0 exception** |
| 握手 | `_engines?build=0.5.0` → `{build:"0.4.0", stale:true}`；面板显示「宿主半待重启 DSH + 重新检测」 |
| 缺失路由 | `_settings` / `_frame-cache/status` / `_transcode/status` / `_bundle` / `_web-project/*` 均 404 且无挂起；网络错误有界（8 条预期 404，4s 观察窗不增长） |
| 设置模式 | `instance.settings()` → `{host:false, revision:0, lastError:"host:404"}`（本地模式），皮肤其余功能正常 |
| 既有功能 | 面板可开、7 个扩展分区照常渲染、壁纸 `data-tl-state="playing"`、模块开关（companion OFF/ON）可用 |
| 日志 | 0 errors / 0 exceptions（客户端捕获缺宿主失败，不泄漏未处理 rejection） |

**证据**：该 run 的 `matrix.json`、`data/version-v022.json`、5 张 `shots/`（含 `degraded-engineering.png` 的重启提示）。

> verifier 判定：**ALL FOUR RUNTIMES PASS — 323/323 assertions, 0 failures, 0 skips**，外加旧宿主降级 17/17 PASS。
> 已接受的残余风险（不阻塞发布）见 §9。

## 5. 生效方式（重要）

**宿主半有变更**（新增 `_settings` / `_bundle` / `_import` / `_frame-cache` / `_transcode` / `_web-project`，
`_engines` 扩展 `webProjects` / `ffmpeg` / `cache` / `settings` / `capabilities`），所以安装/更新 v0.5.0 后需要：

1. **重启一次 DSH**（Desktop 退出重开；`dsh web` 结束旧进程再启动）；
2. 页面 **Ctrl+F5**（浏览器半）。
   之后只改浏览器半（`src/` → `lib/client.js`）时，照旧 Ctrl+F5，不用重启。

页面里的 build 握手机制（`_engines` 的 `build` + `stale`）会在「页面已更新而宿主仍是旧进程」时提示重启 DSH，
不会把缺路由报成神秘网络错误。旧宿主上各新功能的降级见 §3（旧宿主 × 新客户端已实测 **17/17 PASS**，见 §4.3）。
`state/`（设置、帧缓存、导入 staging）与 `assets/derived/`（转码产物）是**本机运行时数据**，git 忽略、不随发布包分发。

## 6. 兼容性（v0.5.0 专项）

- **范围与实测清单不变**：`>=0.2.0-rc.1 <0.3.0`；0.2.0-rc.2 / 0.2.1-rc.3 / 0.2.1-rc.5 / 0.2.2-rc.1。
- **新功能只依赖稳定钩子**：
  - `[data-chat-running]`（C2 专注联动）：0.2.0 / 0.2.1 / 0.2.2 三条线均存在；
  - locale 服务（D7 双语）：三条线均提供；
  - 选择器桥 `src/65-bridge.js`：v0.5.0 **没有修改**发现顺序或选择器，CSS 继续零哈希依赖；
  - 宿主 `webServer` 前缀路由契约与三条线一致（v0.4.0 已实测）。
- **旧宿主静默降级**：新增宿主路由在旧 host 上 404，客户端按功能逐个隐藏/退化，不影响既有功能；
  该场景已在 v0.2.2 Web 运行时实测 17/17 PASS（§4.3）。
- **设置兼容**：`_settings` 只接受 `tianlight.*` / `dsh-tianlight:*` 前缀字符串，最大 256KB、最多 64 键；
  宿主文件缺失/损坏时返回空默认，不阻断 apply；schema 迁移幂等，可重复启动。
- **不新增构建哈希**：CSS 只认皮肤自己的 `data-tl-*`；扩展分区通过 `data-tl-view` 门控，不依赖产品类名。

## 7. 回滚

发布时由 `tools/release.mjs` 生成：一个 release commit + 一个注记 tag（`v0.5.0`）+ 一份 `backup/` 快照。

```bash
# A. 未推送前（本地回退）
git tag -d v0.5.0
git reset --hard HEAD~1          # 回到 release 之前的提交
# 只撤掉 release 写入的文件：
git checkout -- package.json skin.json src/10-constants.js lib/index.js lib/client.js
rm CHANGELOG.md                  # 若该文件是这次 release 新建的

# B. 已推送后
git push origin :refs/tags/v0.5.0   # 删远端 tag
git revert --no-edit <release-commit>   # 用 revert 而不是 force-push

# C. 用快照回退（最近一次快照 = 本次 release 状态；回 release 之前请用 git）
npm run restore                  # 恢复 backup/ 最新快照（含 src/ 与宿主模块）
```

`node tools/release.mjs --dry-run` 会打印同样的回滚步骤。快照目录：`backup/<stamp>` 与 `backup/src.<stamp>`（git 忽略）。

## 8. 已知限制与未纳入

- **C4 天气联动：未纳入**——这是范围决定而不是缺陷（可选能力、默认关、需要外部 API key 与联网；本版不请求网络）。
- **宿主半需重启一次**：新增/变更的宿主路由只在 DSH 进程重启后生效；只更新浏览器半时 Ctrl+F5 即可。
  旧宿主上客户端会逐项隐藏/退化，不报错。
- **`state/` 是本机运行时数据**：设置、帧缓存、导入 staging 都写在插件目录 `state/`，git 忽略、不随包分发；
  清理它等于重置缓存/宿主副本（本地设置仍可回升）。
- **A1 系统音频回环**：需要 `getDisplayMedia` + 用户手势，并在系统弹窗里勾选「分享音频」；
  浏览器/系统对系统音频支持不一，不支持时显示明确状态，不录音、不留存；只驱动着色器 `u_audio`。
- **A2 Now Playing**：只读 MediaSession 元数据；没有元数据就隐藏；圆点脉冲是装饰性的，不做真实节拍分析。
- **A3 网页壁纸**：仅支持 WE 目录中 `project.json` 声明为 `web`（或 `file` 为 `.html`）的项目；
  网页内容在 opaque-origin 沙箱中运行，不能访问 DSH 页面；暂停/省电卸载 iframe，重挂载后项目状态丢失。
- **A4 动态分辨率**：变体按 `name.1080` / `name.1440` / `name.4k`（及 `-1080p` 等）命名约定识别；
  未命名的单文件按原始分辨率播放；不做内容探测/自动转码。
- **A5 预裁剪缓存**：单帧上限 8MB、缓存目录容量有上限（LRU），画布污染/写盘失败时跳过；best-effort，可清空。
- **A6 转码**：仅在本机检测到 `ffmpeg` 时可用（可用 `FFMPEG_PATH` 指定）；失败/超时（10 分钟）不覆盖源文件。
- **C3 自适应降档较粗**：约 2s 采样；降为静态帧后 60s 才再探测恢复；可手动锁定。
- **面板扩展分区只在「高级」视图显示**（pick 视图由 CSS 隐藏，保持精简，属有意行为）。
- **D2 导入包里的设置刷新后统一生效**（宿主持久化，面板有提示）。
- **特效预算**：B1/B2/B3 共用一个总开关与一条低功耗冻结路径，不做全屏 60Hz canvas；
  `prefers-reduced-motion` / 省电 / 掉帧时自动冻结或关闭。
- **设置面板仍不做实时背景模糊**（4K 视频上会掉帧），与 v0.4.0 一致。

## 9. 已接受的残余风险（verifier 判定，不阻塞发布）

以下来自 `diag/skinlab/V050-VERDICT.md` §6；均不构成阻塞缺陷，发布时如实记录：

1. **Desktop preload 是契约模拟**：`vdesk` 运行时用「document-start 注入标题栏属性 + 模拟 40px 条」复现 Desktop 契约
   （与 v0.4.0 矩阵同法）；真实 Electron preload 由 Lead 在真机窗口验证，无 CDP 端口时无法做真实窗口 console 断言。
2. **lab 语言状态跨运行不确定**：隔离 profile 可能以 zh 或 en 启动；v0.5.0 语言用例只恢复起始语言、不强制 zh。
   v022 最终 run 恰好以 English 启动（也覆盖了 zh 方向），其余三个运行时覆盖 zh→en。v0.4.0 面板断言因此
   对 zh/en 都容忍（`0 / 3 张` 与 `items`、`全部 3` 与 `All 3`、`/WE/i` 导入按钮）。
3. **每个运行时 6 条 console warning**（`[ui-skin-tianlight] rheostat:render Object`，v0.4.0 起既有的装饰性噪音）
   与降级场景里的 8 条网络日志错误（故意探测的 404 路由）——都不计为 console error/exception，不代表皮肤失败。
4. **引擎分区 summary 省略号**（`0 entries · 0 B · hits 0 / m…`）是已接受的摘要裁剪；完整数值在分区正文。
5. **少量既有桌宠台词在 English 模式下可能仍为中文**（契约允许旧文案保留中文；新 UI 文案已全部双语），
   属于未来可清理项，不是缺陷。
6. **headless Edge 视口 1406×803 @1× DPI**：几何断言是最小值/矩形检查，不是像素快照；其它 DPI/窗口尺寸下像素布局会偏移。
7. **旧宿主 × 新客户端只在 v022 web 上演练**：同一 client bundle 与 host 回退代码与版本无关，但没有单独模拟
   旧宿主 + Desktop 的组合。
8. **`_frame-cache` roundtrip 会清空帧缓存**（DELETE 是契约路由）：缓存是可丢弃的优化，测试后 entries 为 0。
9. **lab 在运行中会写 `tianlight/state/settings.json`**（宿主半行为），矩阵结束后**逐字节恢复**；该文件是
   gitignored 运行时数据。若要做「纯净发布」，打包前删除 `tianlight/state/` 即可。
