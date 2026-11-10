# v1.3.0 · 角色入口收进桌宠（不再单独列出）

> 版本：`1.3.0`（`lib/client.js` **26 片段**；`BUILD`/`HOST_BUILD` = `1.3.0`）
> 主题：按你的要求，**不再单独列出「角色」入口**——删掉设置页里的「角色 / 生活」页、也删掉侧栏 footer 的「角色」按钮；全部功能收进桌宠：**右键桌宠**（或桌宠菜单「角色中枢」）打开角色中枢，生活节奏设置也并入中枢。
> 本次无宿主路由改动：升级后 Ctrl+F5 即可；若提示"宿主半需重启"（build 标记），重启一次 DSH 即消除。

## 1. 入口变化

| 之前 | 现在 |
|---|---|
| 设置页「角色 / 生活」独立一项（`settings.section` id `tianlight-role`） | **移除**（`src/74-life-settings.js` 删除，26 片段） |
| 侧栏 footer「角色」按钮（弱化版 ◐） | **移除**（`sidebar.footer.action` 注册删除，不再与壁纸库按钮并排） |
| —— | **桌宠：右键直接打开角色中枢**（保留） |
| —— | **桌宠菜单新增「角色中枢」**（第 7 项，点击即开） |

现在唯一入口就是桌宠本身：右键，或点桌宠 →「角色中枢」。不再有独立列表项/按钮。

## 2. 功能不丢：设置并入中枢

被删除的设置页内容全部并入角色中枢：

- **生活节奏设置卡片（新增）**：静默时段开关 + 起止时间、每日主动开口上限、起床/睡觉时间、虚拟时钟偏移、应用按钮；记忆统计（互动/摸摸/喂食/逗猫棒/连续天数/上次见面）。
- 中枢原有：生活状态、专注 25min、静音 1h、液态玻璃四档、形象列表 + 本机上传（≤32MiB）、AI 对话、AI Agent（受控，`agentChat`）、权限总览（15 行）、审计。
- API 不变：`globalThis.tianlightRoleHub.open()/close()/status()`；桌宠菜单/右键均调用它。`globalThis.tianlightLife.configure()` 仍是底层配置源。

## 3. 验证

- 静态链：build **26/26**、test 67/67、structure --strict、audit（新增「无独立角色设置页 / 中枢无侧栏入口」守卫，更新 v1.1 旧守卫）、check-css、verify、i18n（1104 键）全绿。
- Node 冒烟：**410/410 PASS**（R 58 + H 54 + L 19 + M 18 + S 51 + P 62 + U 54 + A 79 + E 15），构建 sha `88BC4955…`；证据 `diag/skinlab/runs/20261110-162603-v130-v130-node-smoke/`。
  - E 段专测本轮收敛：菜单 7 项且第 7 项「角色中枢」开 hub、右键入口保留、无侧栏按钮/无独立设置页、`pet.action.hub` 中英齐全、中枢生活设置卡 11 个属性与 apply 参数、聚焦输入不被 4s tick 覆盖、无 life 降级。
- 真浏览器级仍受本会话沙箱限制（Edge Mojo 命名管道），harness 就绪待非沙箱补跑。

## 4. 升级 / 回滚 / 仓库

- 升级：Ctrl+F5；宿主无路由变化；提示宿主半需重启时重启一次 DSH。
- 回滚：`git reset --hard v1.2.0 && node tools/build.mjs`，再 Ctrl+F5。
- 仓库：`github-upload/` 同步 v1.3.0（tag），推送方式：
  - `$env:GH_TOKEN="github_pat_xxx"; powershell -NoProfile -ExecutionPolicy Bypass -File diag\tmp\publish-v130.ps1`
  - 或 GitHub Desktop / 网页上传（勿带 `.git`）
