# v1.6.6 · 正式版：修复「×」在默认位置被视口裁掉 · 面板水平夹取 + 自适应翻转

> 版本：`1.6.6`（`lib/client.js` **26 片段**；`BUILD`/`HOST_BUILD` = `1.6.6`）
> 本版是**正式版**（公开命名 **v1.0.5**）：v1.6.5 修好了“退不出去”（Esc/点空白/点桌宠），但独立复审发现新「×」关闭按钮在桌宠**默认靠右位置**时几乎完全在视口外——v1.6.4 起面板本来就右溢约 32px，新按钮是最右元素，正好被裁。v1.6.6 把面板水平夹取进视口，并让顶部翻转按面板实测高度判断。**仅浏览器半逻辑改动**，无新增权限/网络通道/宿主路由；因版本常量 bump，升级请 **Ctrl+F5 + 重启 DSH 一次**以消除宿主半 stale 提示。

## 1. 概述与公开命名

- 内部版本 `1.6.6`，GitHub 公开构建命名为 **v1.0.5（正式版）**；同一份构建，`BUILD`/`HOST_BUILD` 均为 `1.6.6`。
- 26 片段不变（逻辑只改 `src/40-companion.js` + `src/20-stylesheet.js`；版本常量另改 `src/10-constants.js`、`lib/index.js`、`package.json`、`skin.json`、feedback 模板）。
- i18n 键总数不变（**1246**，本版没有新增文案）。

## 2. 问题与修复

### 2.1 根因（复审发现）

- 桌宠默认位置 `x = innerWidth - PET_WIDTH - 32`（150 宽 → 左边缘距右屏 182px），root 宽 150。
- 对话面板宽 278px，`left:50%` + `translateX(-50%)` 以桌宠中心居中：面板右缘 = `x + 75 + 139 = innerWidth + 32`，即**右侧 32px 被视口裁掉**。
- 「×」在 head 行最右（右侧 padding 10px、按钮约 26px 宽）→ 实际只有约 0–4px 在屏内，**默认位置几乎看不见**；发送按钮同样被裁掉一截（v1.6.4 起就存在）。
- 顶部翻转阈值固定 `y < 96`：新增 head 行后面板高约 100–105px，桌宠 y 在 96–~115 时面板顶部/× 会被裁。

### 2.2 修复内容

1. **面板水平夹取（`clampChat`）**：打开对话、窗口 resize、拖拽桌宠结束后，先按样式表默认测量面板真实宽度，再把左边缘夹取到 `[8, innerWidth - width - 8]`；桌宠居中时面板保持居中，靠右/靠左时自动平移，**「×」与发送按钮始终完整可见、可点**。零布局环境（Node fake DOM）保持 CSS 默认，不影响测试。
2. **顶部翻转自适应**：打开时读取面板实测高度，阈值改为 `height + 18`（当前约 120px；零布局环境回退 118），新增按钮行后不再裁到顶部；翻转属性 `data-tl-chat-flip` 语义不变。
3. **关闭按钮点击区域加大**：`×` 最小 24×24px、字号 15px，仍保留悬停/键盘焦点高亮与中英文 `aria-label`。

## 3. 验证

- 静态链：build/build --check 26/26、test 67/67、structure --strict、audit（`AUDIT: no blocking issues`）、check-css、verify、i18n-audit（zh=en 1246，referenced 941）全绿；日志 `diag/skinlab/runs/v166-static-chain.log`（8 步全部 exit 0）。
- Node 冒烟：**698/698 PASS**（v1.6.5 的 695 条回归全保留 + 新增 3 条：T27 水平夹取行为（右溢出/左溢出/居中三种 fake-rect 场景 + 源码静态契约）、T28 自适应翻转（高度 102 时 y=104 翻转、y=140 不翻转）、S95 五处版本标记；S 段 94→95、T 段 26→28），构建 sha `fc7a66701d99933c778a153f0965385a36e571a3fb762fd452c0819fbdb3eba1`（`lib/client.js` 1,361,720 B / 1,318,601 字符，26 片段，version 1.6.6）；证据 `diag/skinlab/runs/20261110-212246-v166-v166-node-smoke/`（REPORT.md、data/report.json、698 条 `data/assertions.json`、`fragments/` 含 `companion.js`、`logs/static-chain.log`）。
- 分段：R 58/58、H 54/54、L 19/19、M 18/18、S **95/95**、P 62/62、U 64/64、A 79/79、E 15/15、HIGH 46/46、W 26/26、X 32/32、N 11/11、C 16/16、G 32/32、Q 27/27、T **28/28**、B 16/16。
- 复跑确定性：同一 build sha 再跑一次同样 **698/698 PASS**，证据 `diag/skinlab/runs/20261110-212259-v166-v166-node-smoke/`。
- 真浏览器级（用户点验，Ctrl+F5 + 重启 DSH 后）：默认位置点桌宠 →「AI 对话」→ 确认「×」完整可见并点击关闭；把桌宠拖到屏幕左/右边缘重复；拖到屏幕顶部附近确认面板翻到下方且不裁顶。

## 4. 兼容性

- DSH **0.2.0-rc.2 / 0.2.1-rc.5 / 0.2.2-rc.1** 三线矩阵结论**不变**（全 `COMPATIBLE`，见 [docs/COMPATIBILITY.md](docs/COMPATIBILITY.md) §6.1）；本版没有新增 DSH 契约依赖，也没有宿主半路由/钩子改动。
- 用户设置、形象、动作包与 `state/` 数据无迁移成本；聊天相关的权限、暂停、配额、审计与失败回退语义完全不变。

## 5. 升级 / 回滚 / 仓库

- 升级：**Ctrl+F5** 即可获得夹取/翻转修复（仅浏览器半）；因 `BUILD`/`HOST_BUILD` = `1.6.6`，**重启 DSH 一次**可让宿主半同步并消除 stale 提示。
- 回滚：`git reset --hard v1.6.5 && node tools/build.mjs`，再 Ctrl+F5 + 重启 DSH。
- 仓库：内部 tag 为 `v1.6.6`；`github-upload/` 镜像以公开命名 **v1.0.5（正式版）** 上传；公开 Release 说明见 `diag/tmp/github-release-v1.0.5.md`。公开包因版本常量不同会重新构建，其 `lib/client.js` sha 与内部构建不同（代码相同）。
