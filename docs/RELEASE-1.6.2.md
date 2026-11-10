# v1.6.2 · 移除壁纸左上角固定晨光装饰

> 版本：`1.6.2`（`lib/client.js` **26 片段**；`BUILD`/`HOST_BUILD` = `1.6.2`）
> 针对你的反馈：「壁纸左上角总有一个像太阳的东西」→ 已定位为皮肤自带的固定角落装饰并**整段移除**。本轮为**纯视觉修复**：不改液态玻璃、天气胶囊、桌宠/中枢、权限与限额，也不动宿主路由。
> 无宿主路由改动：Ctrl+F5 即可；`BUILD`/`HOST_BUILD` 同步为 1.6.2（仅 build 标记），若面板提示宿主半需重启，重启一次 DSH 即消除。

## 1. 问题与根因

- **现象**：无论用视频、图片、着色器、WebWallGL 场景还是网页壁纸，左上角都有一团淡淡的「太阳/晨光」角标；切换壁纸后它仍然存在，看起来像常驻装饰而不是壁纸内容。
- **根因**：`src/30-wallpaper.js` 的 `CREST_SVG`——一段内联 SVG「dawn burst」（径向白色光晕 + 4 条放射光线 + 白色核心）——在**每张壁纸重建场景层时都会创建一个 crest 节点并 append 到场景层**，且位置固定为 `top: -120px; left: -140px; width/height: 520px; opacity: 0.42`（深色主题 `0.30`）。它不属于任何壁纸素材，所以与壁纸内容无关、永远出现在同一位置，观感就是「一颗常驻小太阳」。

## 2. 修复

- `src/30-wallpaper.js`：删除 `CREST_SVG` 常量与创建 crest 节点、`scene.appendChild(crest)` 的代码；同步更新相关注释（不再出现 crest 说法）。
- `src/20-stylesheet.js`：删除 `[data-tl-scene] > [data-tl-crest]` 两条规则（浅色 `opacity: 0.42` / 深色 `0.30`）；overlay 注释同步改为「below the veil」。
- **场景层 DOM 顺序保持不变**：`video → photo → shader → sceneFrame → webFrame → overlay ×2 → dim → veil`；**veil 渐变保留**（仍提供天空光色与明暗过渡），只是不再有任何固定在左上角的元素。
- 切换/重建壁纸时不再 append 任何固定角标；自定义壁纸、取景、玻璃档位等既有设置全部保留。

## 3. 影响面

- **仅视觉**：所有壁纸类型、所有液态玻璃档（`off` / soft / frosted / real）都不再出现该左上角角标。
- **不涉及**：液态玻璃 v2 配方、侧栏「新会话」按钮、DSH 主界面天气胶囊、桌宠/生活节奏、角色中枢、AI 权限与安全限额、宿主路由与设置数据。
- 兼容旧行为：veil 渐变仍在，天空光/暗化观感不受影响；升级后无需重新配置。

## 4. 验证

- 静态链：build/build --check 26/26、test 67/67、structure --strict、audit（v1.6.2 新守卫 2 条：无 `CREST_SVG`/`[data-tl-crest]` 残留 + veil 天空光保留）、check-css、verify、i18n-audit（zh=en 1216 键，referenced 928）全绿；日志 `diag/skinlab/runs/v162-static-chain.log`（9,160 B，evidence 内 42 条 green 行）。
- Node 冒烟：**626/626 PASS**（v1.6.1 的 622 条回归 + 新增 4 条：crest 移除 / 场景层顺序 / veil 保留 / `installScene` 无 crest，S 段 73→77），构建 sha `e39657bb8b470a06246630a78e1b30c06277474b60cad78d746b54646469b7ff`（`lib/client.js` 1,300,780 B / 1,258,324 字符，26 片段，version 1.6.2）；证据 `diag/skinlab/runs/20261110-191809-v162-v162-node-smoke/`（REPORT.md、data/report.json、626 条 `data/assertions.json`、`fragments/` 含 `wallpaper-scene-stack.js`、`logs/static-chain.log`）。
- 分段：R 58/58、H 54/54、L 19/19、M 18/18、S **77/77**、P 62/62、U 54/54、A 79/79、E 15/15、HIGH 46/46、W 26/26、X 32/32、N 11/11、C 16/16、G 32/32、Q 27/27。
- 复跑确定性：同一 build sha 再跑一次同样 626/626 PASS，证据目录 `diag/skinlab/runs/20261110-191753-v162-v162-node-smoke/`。
- 真浏览器级：Ctrl+F5 后连续切换多张壁纸，确认左上角不再出现角标（本会话沙箱限制自动化浏览器验收不可用）。

## 5. 升级 / 回滚 / 仓库

- 升级：Ctrl+F5；本版无宿主路由改动（仅 `BUILD`/`HOST_BUILD` build 标记同步为 1.6.2）；若中枢/面板提示宿主半需重启，重启一次 DSH 即消除。
- 回滚：`git reset --hard v1.6.1 && node tools/build.mjs`，再 Ctrl+F5。
- 仓库：内部 tag 为 `v1.6.2`；**`github-upload/` 镜像以公开命名 `v1.0.1` 上传**（用户要求：上传物与发布说明叫 v1.0.1，内部构建是 1.6.2）；本会话无凭据、**未 push**，公开 GitHub Release 说明草稿见 `diag/tmp/github-release-v1.0.1.md`。
