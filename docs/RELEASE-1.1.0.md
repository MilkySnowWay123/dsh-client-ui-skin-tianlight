# v1.1.0 · 角色中枢 + AI 桌宠（严格权限）+ 形象上传

> 版本：`1.1.0`（`lib/client.js` **26 片段**；`BUILD`/`HOST_BUILD` = `1.1.0`）
> 主题：把 v1.0 备好的能力**显性化**（侧栏「角色」+ 全屏「角色中枢」），把桌宠从“生活节奏智能体”升级为**有严格权限边界的 AI 桌宠**，并补完形象替换与未完成项。
> 本次**无宿主路由改动**：升级后 Ctrl+F5 即可；若面板提示“宿主半需重启”（build 标记），重启一次 DSH 即消除。
> 相关：[AI-PET-PERMISSIONS.md](AI-PET-PERMISSIONS.md)（权限规范）· [DUTY-CHANNEL.md](DUTY-CHANNEL.md) · [RELEASE-1.0.0.md](RELEASE-1.0.0.md) · 角色包 `rolepack/quiet-writing-companion/`

## 1. 角色中枢（把已备功能显现）

- **侧栏 footer 按钮「角色」**（窄栏只显示 ◐ 图标），一键打开**全屏角色中枢**（`[data-tl-hub]`，z-index 2601，×/Esc/遮罩关闭，焦点还原）。
- 一屏管理：
  - **生活状态**：时段、清醒/静默、今日主动 used/cap、连续天数、AI 状态；每 4s 刷新（打开期间）。
  - **专注 25 分钟 / 静音 1 小时** 快捷操作。
  - **液态玻璃**：关闭 / 磨砂 / 柔和 / 真实，当前档高亮，显示实际生效档（低电量自动降级）。
  - **桌宠形象**：列表选择 + **本地上传图片/视频（≤32MiB）**，上传后即时切换。
  - **AI 对话**：与桌宠聊天（本地大脑或已授权的 LLM 适配器），显示来源/拒绝原因；暂停/恢复；LLM 授权开关（二次确认）。
  - **权限总览**：safe/medium/forbidden 三档；7 项永久禁止只读展示。
  - **审计**：最近 8 条放行/拒绝记录。
  - **设置页提示**：完整配置仍在 DSH 设置 →「角色 / 生活」。
- API：`globalThis.tianlightRoleHub = { version:1, open(), close(), status() }`；实例诊断 `__dshTianlightInstance.hub()`。

## 2. AI 桌宠（严格权限）

实现：`src/44-pet-brain.js`；规范：[AI-PET-PERMISSIONS.md](AI-PET-PERMISSIONS.md)。

- **本地大脑**（默认，无需任何外部服务）：12 类意图（问候/帮助/状态/专注/静音/玻璃/形象/记忆/作息/权限/兜底），中英双语、短句、安静语气；能查询真实生活状态与记忆，不假装拥有执行权。
- **可选 LLM 适配器**：用户/宿主注册 `window.tianlightPetLLM`，并**显式授权**后才可调用；硬上限：日 20（≤50）/分钟 3/输入 280/输出 600 字/12s 超时/固定安全系统提示/只发当前一句/去 HTML/失败回退本地。
- **严格边界**：能力白名单 + 7 项**永久禁止**（agent/network/files/shell/approve/message/install），不可授予；大脑自身零网络、零文件、零 DSH 工具调用。
- **可审计、可暂停**：每次放行/拒绝写审计（环形 60）；暂停开关持久化，暂停后不回复不调适配器。
- API：`globalThis.tianlightPet`（`status/permissions/grant/revoke/chat/say/setLLM/clearLLM/pause/resume/audit/maybeProactive`，version 1）；实例诊断 `__dshTianlightInstance.pet()`。

## 3. 形象替换补完

- 之前只能从本地壁纸库选；现在角色中枢支持**从本机直接上传**图片或视频（`POST /skin-tianlight/_upload?name=…`，客户端先校验 ≤32MiB，服务端大小/类型再校验），上传后立即可选可切。
- 仍支持默认 `cat.png`/内联 SVG 兜底；视频静音循环；选择持久化；跨窗口同步切换。

## 4. 未完成项状态

| 项 | 状态 |
|---|---|
| v1.0 能力显现 | ✅ 本次（角色中枢 + 侧栏入口） |
| AI 桌宠 + 权限规范 | ✅ 本次（本地大脑 + LLM 适配器 + 权限矩阵 + 审计/暂停） |
| 形象上传替换 | ✅ 本次 |
| 真实浏览器级验收 | ⏳ 本会话沙箱阻断（Edge Mojo 命名管道），harness 就绪待非沙箱环境 |
| GitHub 仓库正式更新 | ⏳ 本会话无凭据（无 token、SSH 被沙箱拒绝）；本地镜像与推送脚本已备（见 §7） |
| 真实 DSH 信号源（任务/审批事件） | ⏳ 未做；需新权限与新契约，另行规范 |

## 5. 节能与稳定性

- 中枢关闭即销毁 DOM/定时器/监听器；打开期间只 4s 轮询一次状态。
- 大脑无常驻定时器；配额/暂停/审计只在调用时读写。
- 本轮同时保留 v1.0 的 hidden 跳过、idle 降频、玻璃低电量降级、写盘去重等策略。

## 6. 验证

- 静态链（worktree）：build **26/26**、test **67/67**、structure --strict、audit（新增 v1.1 权限/中枢/上传守卫）、check-css、verify、i18n-audit 全绿。
- Node 契约冒烟：v1.0 的 169/169 回归 + 新增 HUB/BRAIN 段（权限矩阵、forbidden 不可授予、consent、LLM 配额/限流/超时回退/HTML 清理、暂停、审计、中枢 DOM/关闭/焦点/上传校验/对话拒绝、依赖缺失降级）。
- 真浏览器级仍受本会话沙箱限制（同 v1.0 说明）。

## 8. 运维注意（本轮发现的真实根因）

- 天光工作区此前被配置了 **sparse checkout**（`.git/info/sparse-checkout` 只包含 `.github/docs/lib/presets/src/tools/vendor`，未包含 `assets/`）。git 会把 `assets/` 下的 4 个演示素材标记为 skip-worktree，并在任何 `checkout`/merge/read-tree 后**按稀疏规则裁掉**它们——表现为“素材莫名消失、`git status` 不报警”，与任何 lab 清理无关。
- 本轮已执行 `git sparse-checkout disable` 恢复 `core.sparseCheckout=false`，4 个素材（`bg-main.mp4`/`bg-4k.mp4`/`cat.png`/`README.md`）恢复且与 `HEAD` 的 blob hash 一致，`git ls-files -v` 不再有 `S` 标记；随后全静态链（含 verify 的 HEAD/Range 检查）全绿。`diag/tmp` 下指向 live 的 15 个历史 junction 已在 v1.0 期间一并清除。
- 若未来再次出现素材被裁，先查 `git config --get core.sparseCheckout`；不可再用 `skip-worktree` 掩盖，恢复：`git sparse-checkout disable && git checkout -- assets`，再跑 `node tools/build.mjs --check && node tools/verify.mjs`。

## 9. 升级 / 回滚 / 仓库

- 升级：拉取后 Ctrl+F5；宿主无路由变化；若提示宿主半需重启，重启一次 DSH。
- 回滚：`git reset --hard v1.0.0 && node tools/build.mjs`，再 Ctrl+F5。
- 仓库：`github-upload/` 镜像更新为 v1.1.0（含 tag），推送方式：
  - `$env:GH_TOKEN="github_pat_xxx"; powershell -NoProfile -ExecutionPolicy Bypass -File diag\tmp\publish-v110.ps1`
  - 或 GitHub Desktop 打开 `github-upload` → Push origin main（含 tag v1.1.0）
  - 或网页拖拽 `github-upload` 内容（勿带 `.git`）
