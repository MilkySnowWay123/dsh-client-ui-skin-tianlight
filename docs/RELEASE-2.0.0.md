# v2.0.0 · 正式版：桌宠 AI 对话接入 DSH 自带模型（宿主路由）

> 版本：`2.0.0`（26 片段；`BUILD` = `2.0.0`，`HOST_API` = `2`）。自本版起**仓库版本、GitHub 公开发布名称与 DSH 内安装版本统一为 v2.0.0**（此前的内部 `1.6.x` / 公开 `v1.0.x` 编号保留为历史）。
> 本版只做一件事：让桌宠 AI 对话通过 **DeepSeek Harness 自带的 LLM 服务**（宿主 `ctx.llm`）调用你在 DSH 里已配置好的模型，并在气泡与角色中枢标注「AI 回复 / 本地回复」。同时并入 v1.6.8 之后完成、此前未发布的 20 个「体检修复」提交（详见 §2.3）。

## 1. 需要重启一次 DSH（重要）

本版**改动了宿主半**（`lib/index.js` 新增 `_pet-chat` 路由、`lib/pet-chat.js`、`_engines` 新增 `capabilities.petLlm`），所以更新插件后：

1. 退出并重新启动 DSH Desktop 一次（只 `Ctrl+F5` 刷新页面不够——旧宿主进程没有新路由）；
2. 重启后打开天光页面，`Ctrl+F5` 刷新一次浏览器半；
3. 之后纯浏览器半的更新仍只需 `Ctrl+F5`，不再需要重启（`HOST_API` 从 `1` 升到 `2`，旧宿主会显示“宿主半待重启”提示）。

## 2. 改了什么

### 2.1 宿主半（需要重启）

- 新增 `POST /skin-tianlight/_pet-chat`（`lib/pet-chat.js`）：
  - Host 头只允许 `localhost` / `127.0.0.1` / `[::1]`（沿用现有 loopback 同源闸门）；
  - 只接受 POST + `application/json`，请求体 ≤16KB，文本 ≤4000 字；
  - **系统提示固定在服务端**（浏览器不能改写）；
  - 默认用 `agentDefaultModel.currentSelection()`；允许请求覆盖 provider/model，但 provider 必须出现在 `llm.listProviders()` 里；
  - 用 `resolveModelInfo()` 取 `reasoning.efforts[0]` 作为最低推理档（取不到就不传）；
  - 通过 `ctx.llm.stream()` 调用，`maxTokens = 600`（≤600），20 秒截止（含请求体读取、模型元数据解析、流迭代全阶段），同一时刻只处理 1 个请求，客户端断开即 abort；
  - **不传** `purpose` / `sessionId` / `tools`；不创建会话、不调用任何工具、不读取 DSH 会话内容；
  - 只返回 `{ ok: true, text, finish, model }` 或 `{ ok: false, code }`；凭据只留在宿主进程。
- `_engines.capabilities.petLlm = { available, reason, provider, model }`：可用性 + 不可用原因 + 当前 DSH 默认 provider/model。原因包括 `no-llm-service` / `no-default-model` / `no-providers` / `unconfigured-model`。
- `HOST_API` 1 → 2；`lib/pet-chat.js` 加入发布 `files` 与发布工具（`build-dist` / `snapshot` / `restore`）。

### 2.2 浏览器半（`Ctrl+F5` 即可）

- 宿主报告可用时**自动注册内置适配器 `id: "dsh"`**，调用上面的路由；用户手动 `setLLM()` 的适配器优先，不会被覆盖；显式 `clearLLM()` 后本页面不再被后台探针自动重注册（刷新页面恢复）。
- **仍然必须由用户在角色中枢显式授予 `llm`**（两步确认、仅本页面会话有效）；授权提示明确写「会消耗你的模型额度」。成功/失败都写现有审计（提交 `reason` 稳定错误码）。
- 角色中枢 AI 区新增 **provider 选择**：默认「跟随 DSH 默认模型」；选项来自客户端 `remote.llm.listProviders()`（方案 A：只选 provider，模型 id 跟随 DSH 默认选择）；并显示宿主可用性/原因。
- 对话气泡与角色中枢记录显示 **「AI 回复 / 本地回复」**；出错时按错误码提示中文原因：未配置模型、缺少凭据、余额不足（quota）、限流、超时、宿主不可用。
- 保留现有全部配额与上限：日 60（可调至 120）、每分钟 6 次、输入 1000 字、输出 1200 字、20s 超时、本地回复 20/分 + 1200/天。
- 自主思考：沿用独立的 **12 次/天** 预算（不占聊天配额、遵守静默/睡眠/专注、payload 不含聊天记录），宿主可用且用户显式开启「LLM 自主思考」时才走模型。

### 2.3 同时并入 v1.6.8 之后完成的「体检修复」批次（20 个提交）

v2.0.0 是 v1.6.8 标签之后第一个发布版本，因此同时包含 2026-11-11 完成的体检修复（记录见仓库外 `HANDOFF-2026-11-11-CHECKUP-FIXES.md`）：

- **握手/设置**：`HOST_API` 路由契约握手与 `BUILD` 解耦（宿主/浏览器半可独立刷新）；设置 PUT 合并 + revision CAS（409 返回权威快照且不覆盖在途编辑），聊天/念头/生活记忆/Agent 审计等数据键不进同步与导出包。
- **权限/桌宠**：medium/high 授权改为页面会话内存 + 一次性闭包 consent；Agent 桥读闭包状态；高风险能力真实闸门；主动开口经 brain 同一闭包闸门；自主思考独立 12 次/天预算且 payload 不含聊天记录。
- **宿主安全**：`/api/we-wallpaper` 路由族与转码生命周期加固（loopback Host 白名单、`repkgPath` 仅 env/config、并发上限、断开终止、输出按来源命名、SVG CSP sandbox/nosniff）。
- **界面/渲染**：统一浮层栈（Esc 只关栈顶、Tab 只 trap 顶层）、角色中枢草稿恢复、破坏性操作两次确认；视频解码释放与迟到回调 generation 守卫、fps 判定改为证据化、镜像独立 `scale`；可读性护栏滞回与低电量边沿触发。
- **包/素材**：导出仅用户上传素材、内置演示媒体不再进包（约省 67MiB）；SVG 解析式被动过滤 + CSP/nosniff；`.svg/.avif` 往返一致；重复实现合并/死代码清理；test/verify 环境确定性（不依赖仓库素材、零写入工作树）。
- 以上修复均已在本次静态链、三版本 compat、Node 测试与真实 Desktop 冒烟中覆盖；`HOST_API` 1→2 与 `BUILD` bump 也是本版需要重启一次 DSH 的原因之一。

## 3. 错误码 → 中文提示

| 稳定码 | 气泡/中枢提示 | 触发 |
|---|---|---|
| `unconfigured-model` | 未配置模型 | 宿主无可用 provider / DSH 默认模型不可路由 / provider 覆盖不在目录 |
| `missing-credential` | 缺少凭据 | `MISSING_CREDENTIAL` / `AUTH` / 账号未登录 |
| `quota` | 余额不足 | `QUOTA` / `ACCOUNT_QUOTA` |
| `rate-limit` | 限流 | `RATE_LIMIT` |
| `timeout` | 超时 | 20s 截止 / 请求被 abort |
| `host-unavailable` | 宿主不可用（可能需要重启 DSH） | `_engines` 探针失败 / 路由 404 / 宿主无 `llm` 服务 |
| `llm-error` | AI 暂时不可用 | 其他模型/传输失败 |

## 4. 验证与测试

- 静态链：`npm run check` 全绿（build check 26 片段、**test 113/113**、structure --strict、audit（新增 v2.0.0 守卫 6 条，无阻断）、check-css、verify、i18n-audit zh=en **1369** 键）。
- 三版本兼容：`npm run compat` 对 DSH 0.2.0-rc.2（72 bundles）/ 0.2.1-rc.5（77）/ 0.2.2-rc.1（86）三行均 **COMPATIBLE**；`upgrade-check` 三份均 `all upgrade assumptions hold`。
- 新增 Node 测试（`tools/test.mjs`，假 llm 服务，无需真实模型）：Host 头校验、方法/Content-Type/JSON/16KB/文本上限、provider/model 覆盖、并发拒绝（429 busy）、断开中止、20s 截止（含请求体卡住 / `resolveModelInfo` 挂起）、错误码映射、`_engines.capabilities.petLlm`、路由挂载 + 三个 loopback Host。
- 真实 DSH Desktop（本机 0.2.2-rc.1）实机：重启后 `_engines?api=2` 返回 `"api":"2","stale":false`，`capabilities.petLlm = {"available":true,"reason":null,"provider":"deepseek-account","model":"deepseek-flash"}`。
- 独立只读复核（临时副本跑完整链 + 真实 HTTP 探针）：PASS-WITH-NITS；全部 findings 已修复（deadline 覆盖 body/元数据/流、busy 释放、abort 不死等、audit 守卫、发布工具纳入新模块、clearLLM 语义等）。

## 5. 真实 DSH Desktop 手测清单（发布前必须做）

1. **重启后能力上报**：重启 DSH + `Ctrl+F5`，控制台执行
   `fetch('/skin-tianlight/_engines?api=2').then(r=>r.json()).then(j=>console.log(j.api, j.capabilities.petLlm))`
   → `api` 为 `"2"`，`petLlm.available` 为 `true`，`provider/model` 与「设置 → 模型」里的默认模型一致。
2. **未授权时仍是本地回复**：打开桌宠对话，不授权 LLM 发一句 → 气泡显示「本地回复」，角色中枢 AI 区显示适配器 `dsh` 但 LLM 未授权；`window.tianlightPet.status().llm.host` 显示可用。
3. **授权后真的得到模型回复**：角色中枢 → AI → 点两次「授权 LLM」→ 再发一句有上下文的话（例如「用一句话安慰我，今天很累」）→ 气泡首行显示「AI 回复」，内容应明显不是本地模板；`window.tianlightPet.status().llm.usedToday` 增加 1；审计出现 `action:"llm", ok:true, source:"llm"`。
4. **未配置模型时的提示**：在 DSH 设置里把模型配置换成不可用/删除默认模型（或在没有配置模型的干净 profile 里测试）→ 重启/刷新后角色中枢显示「未配置模型」；桌宠气泡回退「本地回复」并附「未配置模型，已用本地回复」；宿主 `capabilities.petLlm.available=false, reason="unconfigured-model"`。
5. **缺少凭据**：清掉/填错 DeepSeek API Key（或用未登录的 account 路由）→ 发一句 → 气泡提示「缺少凭据，已用本地回复」，审计 `reason:"missing-credential"`。
6. **限流/余额不足**（有条件时）：连续快速发送触发 `RATE_LIMIT`，或使用无余额 key 触发 `QUOTA` → 提示对应中文原因，本地仍有回复。
7. **超时**：断开网络或选一个响应极慢的 provider → 20 秒内返回超时提示（`时长 < 25s`），不卡死界面；`llm.usedToday` 按尝试计数。
8. **并发**：在控制台快速连续调用两次
   `fetch('/skin-tianlight/_pet-chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({text:'ping'})})`
   → 第二个返回 `{"ok":false,"code":"busy"}`（429）。
9. **断开中止**：发一句后立刻关闭/刷新页面 → 宿主日志无未捕获异常；再次打开可正常对话（宿主并发门已释放）。
10. **provider 选择**：角色中枢 provider 下拉切到另一个已注册 provider → 发一句 → 仍能回复；重启后选择保留（存 `tianlight.pet.llmProvider.v1`），且模型 id 仍跟随 DSH 默认。
11. **气泡/中枢来源标注**：授权前发一句（本地）→「本地回复」；授权后发一句（模型）→「AI 回复」；中枢对话记录同样显示来源。
12. **回归**：暂停/恢复、清空对话、历史记录、Agent 区、权限总览、其他卡片均不受影响；`_engines` 其他 capabilities 不变。

## 7. 发布验收结果（v2.0.0）

- **GitHub 下载验收（独立复核）**：tag `v2.0.0` 与 `package.json` 版本一致（`v` + `2.0.0`）；`git clone --filter=blob:none --sparse --branch v2.0.0` 11s 成功，codeload `tar.gz` HEAD 200。下载副本按 CI 同款静态链：build --check 26 片段、test 113/113（剔除 67.5 MiB 演示媒体的稀疏下载为 112/113，仅“媒体文件存在”断言缺失，补占位即 113/113）、structure --strict、audit 无阻断、check-css、verify 57 项、i18n zh=en 1369，全 PASS；`pack` 产物 39 文件 / 3,137.2 KiB，版本 2.0.0、HOST_API 2、无机器相关绝对路径。
- **隔离安装运行（独立复核）**：全新临时 `DSH_HOME` + DSH 0.2.2-rc.1，把下载包按 bundle + junction 安装，headless Edge 验收 **32/32 PASS**：页面应用皮肤（`body[data-dsh-tianlight]`、样式与 UI 挂载、26 slots、reload 后重新应用）；`_engines?api=2` → `api:"2", build:"2.0.0", stale:false, capabilities.petLlm` 对象；`_pet-chat` JSON 契约与 400/405/`provider-not-allowed` 负例正确；**0 uncaught exception / 0 console error**（仅有排除演示媒体的预期 404）。干净 profile 无凭据时返回 `502 missing-credential`（设计内错误码，不是下载/安装缺陷）。
- **运行中的真实 DSH Desktop 路由冒烟**：`POST /skin-tianlight/_pet-chat` 真实模型调用 200（`deepseek-account / deepseek-flash`，1.3–3.9s，`finish:"stop"`）；非法 JSON 400、错误 Content-Type 415、非 loopback Host 403。
- **DSH 插件市场条目验收（独立复核）**：awesome-dsh-plugin 条目（PR #7956 merged，后由 #14030 刷新）通过全部规则——文件名/URL/name/`theme` 分类、en+zh 描述与引号规则、仓库根 `package.json` 的 `dsh.bundle.patch` + `dsh.client`、`cordis.patch.yml`、仓库未归档/含 `dsh-plugin` topic/满足年龄/非 first-party、生成的 README 行与 YAML 一致。市场 schema 无版本字段，访客安装仓库 HEAD 即 v2.0.0，**无需更新 PR**（可选仅刷新描述）。
- **Windows 换行修复**：新增仓库根 `.gitattributes`（`* text=auto eol=lf`），避免 Windows `core.autocrlf=true` 检出把 `lib/client.js` 转成 CRLF 导致 `build --check` 假失败；安装/运行本身不受影响。
- **运行期稳定性修复（post-2.0.0 运行矩阵发现，已并入本版）**：`pet-agent` 的 teardown 会把 `ctx.inject()` 的返回值当函数调用，而当前 DSH 返回 cordis Fiber（`.dispose()`）——旧代码每次卸载都会打印 `pet-agent:dispose TypeError: cleanup is not a function` 并残留注入的 `remote.session`/`uiWorkspace` scope。现同时支持函数与 Fiber 形状（含 rejected-promise 保护），新增 A5 审计守卫与回归测试；`npm run check` 复跑全绿。
- 证据目录：`diag/tmp/release-verify-github/EVIDENCE.md`（下载/静态链/隔离运行）与 `diag/tmp/release-verify-market/`（市场条目逐条校验，含 PR/README/仓库元数据证据）。

## 6. 升级 / 回滚 / 仓库

- 本地生效：**重启 DSH 一次 + `Ctrl+F5`**（宿主半路由 + `HOST_API`/`BUILD` bump）。
- 回滚：`git reset --hard v1.6.8 && node tools/build.mjs`，再重启 DSH + `Ctrl+F5`；公开版回滚到 v1.0.7（内部 1.6.8）。
- 仓库：tag 为 `v2.0.0`（内部仓库与 GitHub 公开仓库同号）；`github-upload/` 镜像以 **v2.0.0（正式版）** 上传，公开 Release 说明见 `RELEASE-NOTES-v2.0.0.md`；`INTERNAL-BUILD.json` 记录同号映射。历史版本（内部 `1.6.x` / 公开 `v1.0.x`）的 tag 与 Release 保留为历史记录。
- 兼容性：同一份构建支持 DSH 0.2.0 / 0.2.1 / 0.2.2（三线矩阵全 COMPATIBLE）；本版无 DSH 版本分支，不使用 `prepareCall` 的 `configure` 参数、不传 `purpose`/`sessionId`，因此三版统一走 `stream()`。
- 已知限制（不阻塞本版）：provider 覆盖只切换 provider、模型 id 固定跟随 DSH 默认（方案 A）；若所选 provider 不支持该模型 id，会回退本地并提示「未配置模型」；客户端 `remote.llm` 只读，无法在页面直接列模型目录。
