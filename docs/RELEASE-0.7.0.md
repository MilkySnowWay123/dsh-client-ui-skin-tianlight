# v0.7.0 · 职责通道（Duty Channel）

> 版本：`0.7.0`（`lib/client.js` 22 片段 / 909,466 字符；`BUILD`/`HOST_BUILD` = `0.7.0`）
> 定位：**角色包（Role Pack）职责层的桌宠呈现层**——让外部职责引擎把「审批/完成/喝水/…」动作变成桌宠旁带按钮的职责气泡，并把用户选择（等会儿/静音/休息时再说/额度）回传给引擎。
> **只改浏览器半**：宿主半路由未变；升级后 Ctrl+F5 即可。若面板提示“宿主半需重启”，那是新旧 build 标记不一致的提示（宿主代码只有常量变化），重启一次 DSH 即消除。
> 相关：[DUTY-CHANNEL.md](DUTY-CHANNEL.md) · [CHANGELOG.md](../CHANGELOG.md) · 角色包：`rolepack/quiet-writing-companion/`（`docs/ROLEPACK-DUTY.md`、`docs/ADAPTERS.md` §3.5）

## 1. 问题 → 根因 → 方案

**问题**：角色包职责层（`duties.json` + 确定性引擎）已经能决定「替用户盯什么、什么时候介入、被拒绝后怎么记住」，但没有呈现出口——桌宠 v0.6.0 只有装饰性互动，职责动作无处可去；DSH 页面本身又无法在 DSH 之外持续存在。

**根因**：桌宠是皮肤内部实现，没有对外接口；把职责引擎直接塞进皮肤又会把「角色/职责规范」与「某个皮肤实现」绑死。

**方案**：在皮肤里加一个**极小的、fail-closed 的职责通道**，只负责呈现与回传，不做任何调度决策：

- 入站：`globalThis.tianlightDuty.send(action)` 或 `document.dispatchEvent(new CustomEvent("tianlight:duty", { detail }))`
  - `interrupt`：职责气泡（文本 + ≤5 个按钮，TTL 默认 12s）
  - `speak`：普通短句气泡
  - `clear`：隐藏职责气泡
- 出站：`subscribe(fn)` 或 `tianlight:duty-action` 事件
  - `choice`：用户点击某按钮（`signalId/choiceId/at`）
  - `timeout`：TTL 到期未选择
- 诊断：`globalThis.tianlightDuty.status()`、`__dshTianlightInstance.duty()`

## 2. 实现

| 文件 | 变更 |
|---|---|
| `src/40-companion.js` | 职责气泡 DOM（`[data-tl-duty]`）与生命周期；`installDutyChannel()` / `normalizeDutyAction()` / `dutyChannelStatus()`；`companionDutyBridge`（可切换模块的桥接持有者）；zh/en 台词键 |
| `src/20-stylesheet.js` | 气泡 + 按钮样式，复用 `--tl-*` 变量 |
| `src/99-apply.js` | `install("ui-skin-tianlight: duty channel", …)`；实例诊断 `duty()` |
| `src/10-constants.js` | `HOST_BUILD = "0.7.0"` |
| `lib/index.js` | `BUILD = '0.7.0'`（仅常量） |
| `package.json` / `skin.json` | 版本 0.7.0；tagline/description/tags 更新 |
| `docs/DUTY-CHANNEL.md` | 新增契约文档 |
| `README.md` / `CHANGELOG.md` | 版本说明 |

安全与降级：

- fail-closed 校验：action 类型、`signalId`≤64、text≤200、choices 1..5（id≤40、label≤40）、ttl 0..120000；非法 → `{ok:false, reason:'invalid-action'}`，不触碰 DOM。
- 同伴模块关闭 → `{ok:false, reason:'companion-off'}`（恢复后自动可用）。
- 气泡文本用 `textContent`（不解析 HTML）；与普通台词 `[data-tl-say]` DOM 隔离、互不覆盖。
- 选项是原生 `<button>`（Tab/Enter/Space 可达）；点击/键盘/指针事件 `stopPropagation`，不触发拖拽或互动菜单。
- 卸载恢复上一个 `globalThis.tianlightDuty`（热重载/重复 apply 不泄漏）。

## 3. 验证

静态链（worktree `feat/duty-channel`）：`build 22/22`、`test 67/67`、`structure --strict`、`audit`（监听器/setTimeout 配对、effect 顺序 + **职责通道出站顺序回归守卫**）、`check-css`、`verify`、`i18n-audit`（zh/en 860 键）全绿。

Node 级契约冒烟（真实构建代码 + fake DOM；`diag/skinlab/dutycheck-node-smoke.mjs`，证据 `diag/skinlab/runs/20261110-131518-v070-after-fix-node-smoke/`）：**54/54 PASS**（A–G + 静态契约），其中出站 `choice`/`timeout`、subscribe、`document` 事件、`clear` 清理 speak 气泡均通过；旧构建快照对照 **43/54 FAIL**（`runs/20261110-131516-v070-before-fix-node-smoke/`）确认并复现了「`hideDuty` 清空 emitter 导致出站丢失」缺陷，修复为「先捕获 emitter/signal → hide → emit」，并用 `tools/audit.mjs` 增加顺序回归守卫。

浏览器级（隔离 DSH 实例 + headless Edge + 真实 CDP 鼠标）**本会话沙箱无法执行**：Edge 在命名管道被拒（`mojo ... platform_channel.cc:187 Access denied (0x5)`）下 <1s 退出，CDP 不可达；隔离 DSH 实例本身可正常启动（私有 DSH_HOME、lab 端口、live 58827 前后 PID 不变）。真浏览器 harness 已就绪，需非沙箱执行环境补跑：

```bash
node diag/skinlab/dutycheck.mjs --version v022 --skin-dir "<此 skin 目录>" --label v070-duty
# 或 --version vdesk
```

该项标注为「环境受限、待补跑」，不计为产品失败。

## 4. 兼容 / 边界

- 支持范围不变：`>=0.2.0-rc.1 <0.3.0`（同一构建继续支持 DSH 0.2.0 / 0.2.1 / 0.2.2）。
- 旧宿主 × 新客户端：宿主路由未变，职责通道可用；握手 `stale:true` 只影响面板提示。
- 旧客户端 × 新宿主：不受影响。
- 已知边界：真实信号源采集（DSH session/审批 → 职责层事件）与审批结果回传（approve/deny）不在本通道范围；职责气泡由外部代码主动调用。

## 5. 回滚

```bash
git checkout v0.6.0 -- .   # 或 git reset --hard v0.6.0
node tools/build.mjs
```

## 6. 运维记录（验收期间事故与恢复）

- **事故**：隔离 lab harness 在浏览器级验收尝试中把皮肤目录以 junction 接到测试 profile，清理时递归删除了 junction 目标内容，导致主工作区 `assets/` 下 4 个 git 跟踪的演示素材（`bg-main.mp4` / `bg-4k.mp4` / `cat.png` / `README.md`）被删。用户 `assets/uploads/2.mp4` 未受影响；`state/`、`src/`、`lib/`、`docs/` 等未受影响。
- **为什么 git status 没报警**：这 4 个文件此前被标记为 `skip-worktree`（大素材常用做法），删除不显示为 dirty。
- **恢复**：`git update-index --no-skip-worktree <4 files>` + `git checkout -- assets`；恢复后逐文件校验 `git hash-object` 与 `HEAD:<path>` 完全一致，`git status` 干净；只读探针确认 live 宿主 `_manifest` 重新列出素材、`/cat.png` 200。
- **教训（写入流程）**：lab 若用 junction 指向真实皮肤目录，清理必须只删 junction 本身（`cmd /c rmdir` / `fs.rmSync` on the link, never recursive through it），或改为真实复制；测试不得直接写 live 工作区。后续隔离验收一律使用复制目录，junction 仅用于只读大素材且清理前先断开。
`
