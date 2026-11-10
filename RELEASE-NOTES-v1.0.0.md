# v1.0.0 · 天光液态玻璃皮肤公开版

> **遐蝶 · 天光（TIANLIGHT）** 是 DSH（DeepSeek Harness）Web GUI 的新海诚式天光主题皮肤：全屏循环动态壁纸、液态玻璃界面、可拖拽的薄荷小猫桌宠、常驻角色中枢、AI 桌宠与受控的 DSH Agent 接入。
> 本 Release 的公开版本号为 **v1.0.0**（仓库内部构建 `1.6.1`，`BUILD`/`HOST_BUILD` = `1.6.1`；把内部多轮迭代合并为第一个公开版本）。
> 安装后**重启一次 DSH**，之后改浏览器半只需 Ctrl+F5。

## ✨ 亮点

- **液态玻璃 v2（OriginOS 7 风）**：更厚磨砂 + 更高饱和 + 多层 specular + 1px 亮/暗边 + 外柔光 + 细噪点 + hover/active 柔和回弹；三档（柔和 / 真实 / 磨砂）可切换，中枢内有**实时预览条**，切换立刻看到差异。
- **玻璃覆盖全部界面**：`depth != off` 时侧栏、设置、壁纸库、角色中枢、对话框、菜单、列表框、输入区、气泡、胶囊、提示、新会话按钮、天气胶囊统一玻璃化；**无壁纸场景时自动补一层玻璃兜底**；`off` 档零变化、低电量/15fps 自动降级、`prefers-reduced-motion` 停过渡。
- **侧栏「新会话」深色块修复**：接管 DSH 产品按钮 token（`--dsw-alias-button-elevated-fill` / hover / border），**所有深度档**皮肤化——关玻璃时也不再是一块深色块，开玻璃时是完整 v2 玻璃。
- **DSH 主界面天气胶囊**：主界面右上常驻浮动玻璃胶囊（不占布局），显示图标 + 温度/描述，点击/键盘直达角色中枢天气卡；五状态（未启用 / 无位置 / 等待 / 错误 / 有数据），**不自动启用、不新增网络请求**。
- **薄荷小猫桌宠**：可拖拽、会呼吸、靠近回应、互动菜单；虚拟时钟与每日作息、主动开口预算、跨会话记忆、专注计时；形象可替换为本机图片或 ≤32MiB 视频，一键恢复默认。
- **角色中枢（唯一入口）**：右键桌宠或桌宠菜单「角色中枢」打开——生活状态/节奏、液态玻璃、形象、AI 对话、AI Agent、权限总览、审计、天气卡、一键自检、应用内反馈；没有独立设置页/侧栏按钮。
- **AI 桌宠（严格权限）**：本地大脑 + 可选用户提供的 LLM 适配器；能力白名单、硬上限、审计环形、暂停开关；**`agent`（桌宠自主驱动 DSH）永久禁止**。
- **受控 DSH Agent 接入**：只发送你手写的问题到你就指定/新建的会话，仅 `list/create/prompt/follow`，不审批/不取消/不代操作；默认关闭、显式授权、可随时断开。
- **安全上限（v1.6.0 起上调）**：主动开口 12/50；本地 chat 20 次/分、1200 次/天、输入 1000 字；LLM 日 60（上限 120）/分钟 6/输入 1000/输出 1200 字/20s 超时；DSH Agent 日 30（上限 100）/输入 1000 字/回复 120s。**默认关闭、显式授权、可撤销、全程审计的权限模型不变。**
- **DSH 兼容**：同一份构建支持 DSH 0.2.0 / 0.2.1 / 0.2.2（运行时钩子分层降级）；zh/en 双语跟随 DSH 语言。

## 🧊 液态玻璃 v2 参数（`off` 不参与）

| 档位 | blur | saturate | 亮边/顶光 | 底光/暗边 | sheen | 噪点 | 观感 |
|---|---|---|---|---|---|---|---|
| `soft`（柔和，默认） | 11px | 1.30 | 0.30 | 0.14 | 0.40 | 0.035 | 轻磨砂、通透、日常 |
| `real`（真实） | 19px | 1.50 | 0.52 | 0.28 | 1.00 | 0.050 | 厚玻璃、强高光、层次最明显 |
| `frosted`（磨砂） | 26px | 0.95 | 0.55 | 0.08 | 0.12 | 0.120 | 强磨砂、低饱和、安静 |

另有噪点贴图尺寸（grain 180 / 140 / 110px）与 1px 亮暗边强度（rim 0.26 / 0.46 / 0.50），以及外柔光阴影；低电量/15fps 下所有档位统一压平到 blur ≤3px。

性能预算：每视口最多一层大面积实时模糊（大面板不叠第二层、气泡不逐项 blur）；低电量/15fps 压平到 blur ≤3px 并去掉阴影/噪点/动画。

## 📦 安装

本皮肤是**标准 DSH bundle**：`package.json` 的 `dsh.bundle.patch` 指向包内 `cordis.patch.yml`（插入 `ui-skin-tianlight` 行），`dsh.client` 提供浏览器半。**只安装这一个包即可。**

### DSH Desktop（0.2.0 / 0.2.1 / 0.2.2）

1. 下载/克隆本仓库到任意位置（建议纯 ASCII 路径）。
2. 在 DSH Desktop 的**插件管理器**选择「安装本地目录」，指向该目录，并确认 `ui-skin-tianlight` 为 **enabled**。
3. **重启 DSH Desktop 一次**。
4. 之后改浏览器半（`src/` → `lib/client.js`）只需 Ctrl+F5。

> 机器级 `$DSH_HOME/cordis.patch.yml`（Windows 默认 `%USERPROFILE%\.dsh\cordis.patch.yml`）优先级高于 bundle 自带 patch；若其中残留旧 skin-manager 生成的 `ui-skin-tianlight` + `disabled: true`，皮肤会静默不出现——删掉该行再重启。

### 命令行 `dsh web`（可选）

把本包以目录链接或 `link:` 依赖放进 profile 的 `node_modules`，在 profile `package.json` 依赖本包并在 `dsh.profile.bundles` 登记 `@dsh-external/dsh-client-ui-skin-tianlight`；行仍由 bundle 自带 patch 插入。

## 🔄 升级与回滚

- 升级：覆盖目录后 **重启一次 DSH** + Ctrl+F5；只有浏览器半变化时 Ctrl+F5 即可。
- 旧版设置/状态自动迁移（schema v5，原值备份在 `tianlight.backup.v5`）；`assets/uploads/` 与插件目录 `state/` 是本机用户数据，不随发布包分发。
- 回滚：重新安装上一版本目录 + 重启 DSH + Ctrl+F5。

## ✅ 验证

- 静态链：build/build --check 26/26、test 67/67、structure --strict、audit（4 条 v1.6.1 新守卫：新会话全档玻璃 / 玻璃 v2 配方 / 天气胶囊挂载 / 五状态+本地化）、check-css、verify、i18n-audit（zh=en 1216 键）全绿。
- Node 级隔离冒烟：**622/622 PASS**（v1.6.0 的 586 条回归全保留 + 36 条新增：N 新会话 11 / C 天气胶囊 16 / G 玻璃 v2 扩展 9），构建 sha `54b425d4…`（`lib/client.js` 1,301,872 B）；同一 build sha 复跑同样 622/622 PASS。
- 真浏览器级视觉（玻璃层次/新会话按钮/天气胶囊五状态）由用户 Ctrl+F5 后点验：本机自动化验收受沙箱限制（Edge Mojo 命名管道）。

## ⚠️ 已知边界

- 场景壁纸需要浏览器 WebGL2；网页壁纸在 opaque-origin 沙箱运行；失败自动降级到视频/图片。
- 上传壁纸单文件 ≤512MB（可调）；HEVC/GIF 需本机有 ffmpeg 才能转 H.264/MP4。
- 天气：默认**关**，只有你在角色中枢显式启用并定位后才请求 Open-Meteo（免 API key、无账号、无遥测）；失败静默保留上次观测；主界面天气胶囊只读本地摘要。
- 权限：`agent`（桌宠自主驱动 DSH 任务/工具/审批）**永久禁止**；`network/files/shell/approve/message/install` 为高风险、默认关闭、需显式授权，且皮肤**不内置实现**——只有你注册能力适配器后才会调用你的代码，全程审计、可撤销。

## 🧾 许可

- 本仓库代码 MIT。
- `vendor/webwallgl/`：MIT（WebWallGL 3.0）；`vendor/we-wallpaper/`：MIT（含上游说明）；`vendor/we-wallpaper/wcap/`：Unlicense。
- `assets/` 内演示素材版权归各自权利方，仅用于演示；可在 `.gitignore` 调整后自行替换。
