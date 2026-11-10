# v1.0.0 · 角色生活节奏 · 可替换形象 · 液态玻璃

> 版本：`1.0.0`（`lib/client.js` **24 片段**；`BUILD`/`HOST_BUILD` = `1.0.0`）
> 定位：**正式版**——桌宠从"单一装饰"升级为**多功能角色智能体**：有虚拟时钟、每日作息、主动开口预算与跨会话记忆；形象可换成图片或 ≤32 MiB 视频；新增可选**液态玻璃**（真实/柔和/磨砂三档）；并做了一轮节能与稳定性优化。
> 本次**无宿主路由改动**（桌面/网页共用浏览器半）：升级后 Ctrl+F5 即可；若面板提示"宿主半需重启"（新旧 build 标记），重启一次 DSH 即消除。
> 相关：[DUTY-CHANNEL.md](DUTY-CHANNEL.md) · [CHANGELOG.md](../CHANGELOG.md) · 角色包：`rolepack/quiet-writing-companion/`（`docs/ROLEPACK-DUTY.md`）

## 1. 角色智能体：生活节奏（方向三）

主动性只有两种来源（事件触发 / 定时触发）时，角色很容易变成机械打扰。v1.0.0 给角色一份**可理解、可调节的主动性预算**：

| 能力 | 实现 |
|---|---|
| 虚拟时钟 | `virtualOffsetMinutes`（-720..720）只改变角色"感知的时间段"，不影响真实预算窗口 |
| 每日作息 | `wake`/`sleep`（默认 08:00/23:00）+ `quiet` 静默时段（默认启用，23:00–08:00）；时间段 dawn/morning/noon/afternoon/dusk/evening/night 驱动台词与行为 |
| 主动开口配额 | 每日上限（默认 6，可 0–20 调节）+ 最小间隔 30min；只在清醒、非静默、非专注、预算未耗尽时开口 |
| 跨会话记忆 | `localStorage[tianlight.life.v1]`：互动/摸摸/喂食/逗猫棒/交谈计数、连续天数、上次见面/交谈；跨窗口 BroadcastChannel 同步 |
| 职责闸门 | 外部 `tianlightDuty.send(interrupt)` 先过生活闸门：静默/睡眠/静音/预算不足 → 入延迟队列（≤8 条、去重、按优先级），到窗口由生活引擎 `tianlightDuty.replay()` 自动补发；出站 `{type:"deferred"}` 告知调用方 |
| 用户控制面 | 桌宠菜单新增「静音 1 小时」「专注 25 分钟」；设置页「角色 / 生活」可调静默时段、每日额度、作息、虚拟时钟、专注 |
| 角色行为 | 日常问候/久别/专注/深夜/完成等台词（`life.line.*`，zh/en），主动开口走生活预算；专注期间不自言自语 |

对外 API：`globalThis.tianlightLife`（`status/configure/adjustBudget/muteFor/gate/noteInteraction/focusStart/focusStop/listMedia/setMedia/tryProactive`），桌宠菜单与设置页共用同一套状态。

## 2. 可替换桌宠形象（图片或 ≤32 MiB 视频）

- 设置页「角色 / 生活 → 桌宠形象」可从本地壁纸库选择**图片或视频**（`_wallpapers` 目录，`kind=image|video`，**单文件 ≤32 MiB**；超限素材列出并拒绝）。
- 视频会以**静音循环、无控件**方式渲染在桌宠位（`<video muted autoplay loop playsinline>`）；图片走 `<img>`；切换即时生效（`tianlight:pet-media` 事件），无需刷新、无需改代码。
- 默认形象仍是 `assets/cat.png`（缺失时回退内联 SVG 小猫）；选择持久化在 `localStorage[tianlight.petMedia.v1]`。
- 说明：素材只在本机加载，不上传、不联网（宿主 `_wallpapers` 目录来自本机 assets/uploads 与本地壁纸目录）。

## 3. 液态玻璃：真实 / 柔和 / 磨砂（可选，默认关闭）

- 在壁纸与界面之间增加一层液态玻璃处理（`[data-tl-scene]::after`）：镜面高光渐变 + backdrop blur/saturate，不阻塞交互（`pointer-events:none`）。
- 三档：`真实`（高光最强、模糊 6px、饱和 1.42，慢速流光）、`柔和`（模糊 3px、饱和 1.18）、`磨砂`（模糊 14px、低饱和 + 噪点质感）；默认 `关闭`，保持 v0.7 观感与能耗。
- **节能自动降级**：15fps 渲染档或低电量模式下，`真实`自动降为 `柔和`，低电量下进一步压到 2px 模糊并停掉流光动画；`prefers-reduced-motion` 关闭动画。
- 设置页一键切换；`__dshTianlightInstance.glass()` 可查当前/实际档位。

## 4. 节能与稳定性

- 生活引擎定时器 30s，页面隐藏时跳过；visibilitychange 恢复。
- 桌宠 idle 定时器自适应：15fps 渲染档每 2 tick 才执行一次原有逻辑；隐藏/拖拽/菜单打开时跳过。
- 液态玻璃仅在开启时创建合成层，低电量自动压平；`off` 时 `::after` 不渲染（display:none），无额外合成开销。
- 状态写盘只在变化时发生；所有 storage/DOM 操作 try/catch；延迟队列上限 8，避免内存增长；新监听器全部成对清理（audit 校验）。
- 音频/壁纸/低电量/可读性等既有节能策略不变。

## 5. 新功能（除上面三项外）

- **专注计时（25min）**：桌宠菜单或设置页启动/结束；专注期间角色不主动开口；结束可被完成/休息台词接住。
- **互动记忆与连续天数**：摸摸/喂食/逗猫棒/交谈计数、连续见面天数、上次见面时间（设置页展示）。
- **"等会儿/静音"的全局记忆**：v0.7 的职责气泡选择与 v1.0 的生活预算/静默联动（选择"静音 1 小时"同时抑制角色主动开口）。
- **角色设置页**（DSH 设置 →「角色 / 生活」）：形象、生活节奏、玻璃质感、记忆与专注一页管理；slots 缺失时页面自动消失但桌宠/API 不受影响。
- **诊断入口**：`__dshTianlightInstance.life()` / `.glass()` / `.duty()`。

## 6. 实现与文件

| 文件 | 变更 |
|---|---|
| `src/42-life.js`（新） | 生活节奏引擎、虚拟时钟、预算、跨会话记忆、延迟队列、媒体解析、i18n 台词 |
| `src/40-companion.js` | 图片/视频可替换形象、菜单「静音/专注」、职责通道 v1.1（lifeGate/deferred/replay）、idle 节能、i18n |
| `src/74-life-settings.js`（新） | 设置页「角色 / 生活」（slots `settings.section` id `tianlight-role`） |
| `src/57-glass.js` | 液态玻璃三档控制器（持久化、低电量降级、body 属性） |
| `src/20-stylesheet.js` | 视频形象、6 项菜单换行、液态玻璃三档 CSS、角色设置页样式 |
| `src/99-apply.js` | 安装 life rhythm / glass depth / life settings；实例诊断 `life()`/`glass()` |
| `src/10-constants.js`、`lib/index.js` | `HOST_BUILD`/`BUILD` = 1.0.0 |
| `package.json` / `skin.json` | 版本 1.0.0、tagline/description/tags |
| `docs/DUTY-CHANNEL.md` | v1.1：生活闸门、deferred、replay、媒体事件、生活 API 摘要 |
| `README.md` / `CHANGELOG.md` | v1.0.0 说明 |

## 7. 验证

- 静态链（worktree）：build **24/24**、test **67/67**、structure --strict、audit（含职责出站顺序守卫 + 生活/玻璃静态守卫）、check-css、verify、i18n-audit（zh/en 全配对）。
- 契约冒烟：v0.7 职责通道 54/54 PASS 继续复用；v1.0 新增 `tianlightLife` 生活/媒体/玻璃的 Node 级契约冒烟（fake DOM/storage/fetch），覆盖 status 形状、gate 四种 reason、deferred 入队/去重/容量、replay 回放、32 MiB 过滤、媒体切换事件、玻璃档位降级、设置页静态接线。
- 浏览器级（隔离 DSH + headless Edge + 真实鼠标）仍受本会话沙箱限制（Edge Mojo 管道拒绝访问），harness 已就绪待非沙箱环境补跑：`node diag/skinlab/dutycheck.mjs --version v022 --skin-dir <skin>`。

## 8. 兼容 / 回滚

- 支持范围不变：`>=0.2.0-rc.1 <0.3.0`（0.2.0 / 0.2.1 / 0.2.2 同一构建）。
- 旧客户端 × 新宿主、新客户端 × 旧宿主均正常（无宿主路由/协议改动；仅 build 标记更新）。
- 旧数据自动兼容：`tianlight.life.v1` / `tianlight.glassDepth` / `tianlight.petMedia.v1` 均为新键，缺失按默认；旧皮肤设置文件、壁纸库、职责通道行为不变。
- 回滚：`git reset --hard v0.7.0 && node tools/build.mjs`，再 Ctrl+F5。

## 9. 运维记录（验收期间事故与恢复，再次发生）

- **事故**：发布验收期间主工作区 `assets/` 下 4 个 git 跟踪演示素材（`bg-main.mp4` / `bg-4k.mp4` / `cat.png` / `README.md`）再次被删除；`git status` 不显示（此前这些文件带 `skip-worktree` 标记）。`assets/uploads/2.mp4`（用户数据）、`state/`、`src/`、`lib/`、`presets/`、`vendor/` 未受影响。
- **根因（已定位并清除）**：`diag/tmp/` 下多个历史隔离 lab 皮肤目录（`mixed-oldhost`、`verifier-skin*`）用 **junction** 指向 live 皮肤目录的 `assets/`、`presets/`、`vendor/`；任何对这些测试目录的递归清理都会跟随 junction 删掉 live 目标。本轮共发现并 **unlink 15 个危险 junction**（只删链接、不删目标），现在 `diag/tmp` 下已无指向 live 的 junction。
- **恢复**：`git update-index --no-skip-worktree <4 files>` + `git checkout -- assets`；逐文件 `git hash-object` 与 `HEAD` 一致，`git status` 干净；live 宿主只读探针 `_manifest` 恢复 5 项、`/cat.png` 200；全静态链复跑全绿。
- **加固**：4 个素材的 `skip-worktree` 标记已清除（今后删除会显示在 `git status`）；后续 lab 一律使用**真实复制**目录，禁止把 junction 指向 live 皮肤目录；清理脚本先 `cmd /c rmdir` 断链再删。
```
