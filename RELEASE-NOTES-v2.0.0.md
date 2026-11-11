# v2.0.0 · 正式版 · 桌宠 AI 对话接入 DSH 自带 LLM（宿主路由）

> **天光（TIANLIGHT）** for DSH 正式版：桌宠 AI 对话现在直接使用你在 DSH 里已配置好的模型——由 DSH 自带的 LLM 服务（`ctx.llm`）在宿主进程完成调用，浏览器半不接触任何凭据。对话气泡与角色中枢会标注「AI 回复 / 本地回复」，出错时按原因给出中文提示。
> 自本版起**仓库版本、GitHub 公开发布名称与 DSH 内安装版本统一为 v2.0.0**（此前的内部 `1.6.x` / 公开 `v1.0.x` 编号保留为历史）。
> **本版改动了宿主半：升级后必须重启 DSH 一次，再 Ctrl+F5。** 之后纯浏览器半更新仍只需 Ctrl+F5。

## ✨ 新功能

### 🤖 桌宠 AI 对话走 DSH 自带模型（宿主半新路由）
- 宿主新增 `POST /skin-tianlight/_pet-chat`：默认使用 DSH 的默认模型（`agentDefaultModel.currentSelection()`），也可只切换 provider；请求可覆盖 provider/model，但 provider 必须在 `llm.listProviders()` 内。
- 安全边界：仅 loopback Host（localhost/127.0.0.1/[::1]）、POST+JSON、请求体 ≤16KB、文本 ≤4000 字；**系统提示固定在服务端**；不传 `purpose`/`sessionId`/`tools`，**不创建会话、不调用工具、不读取 DSH 会话内容、不下发凭据**；`maxTokens ≤600`；20 秒截止；同一时刻只处理 1 个请求；客户端断开即中止。
- 推理档位：自动取该模型 `reasoning.efforts[0]`（最低档），没有档位信息则不传。
- `_engines.capabilities.petLlm` 报告 `{ available, reason, provider, model }`；未配置模型/宿主无 LLM 服务/宿主不可用时，中枢会显示具体原因。

### 🎛️ 角色中枢与气泡
- 宿主报告可用时，皮肤自动注册内置 `dsh` 适配器；**仍然需要你在角色中枢两步确认授权 `llm`**（提示会消耗你的模型额度），配额、长度上限、20s 超时与审计规则完全沿用；手动注册的适配器优先，不会被覆盖。
- 角色中枢新增 provider 下拉（默认「跟随 DSH 默认模型」，选项来自客户端 `remote.llm.listProviders()`；模型 id 跟随 DSH 默认）。
- 对话气泡与中枢对话记录显示 **「AI 回复 / 本地回复」**；失败按稳定错误码给中文提示：未配置模型、缺少凭据、余额不足、限流、超时、宿主不可用。
- 自主思考保持独立 **12 次/天** 预算，不占聊天配额，遵守静默/睡眠/专注，payload 不含聊天记录。

### 🩹 同时并入 v1.6.8 之后完成的「体检修复」批次（20 个提交）
- **握手/设置**：`HOST_API` 路由契约握手与 `BUILD` 解耦（宿主/浏览器半可独立刷新）；设置 PUT 合并 + revision CAS（409 返回权威快照且不覆盖在途编辑），聊天/念头/生活记忆/Agent 审计等数据键不进同步与导出包。
- **权限/桌宠**：medium/high 授权改为页面会话内存 + 一次性闭包 consent；Agent 桥读闭包状态；主动开口经 brain 同一闭包闸门；自主思考独立预算且 payload 不含聊天记录。
- **宿主安全**：WE 路由族与转码生命周期加固（loopback Host 白名单、`repkgPath` 仅 env/config、并发上限、断开终止、输出按来源命名、SVG CSP sandbox/nosniff）。
- **界面/渲染**：统一浮层栈（Esc 只关栈顶、Tab 只 trap 顶层）、角色中枢草稿恢复、破坏性操作两次确认；视频解码释放与迟到回调守卫、fps 判定证据化、镜像独立 `scale`；可读性护栏滞回与低电量边沿触发。
- **包/素材**：导出仅用户上传素材、内置演示媒体不再进包（约省 67MiB）；SVG 解析式被动过滤 + CSP；`.svg/.avif` 往返一致；重复实现合并/死代码清理；test/verify 环境确定性。
- **兼容性**：同一份构建支持 DSH 0.2.0 / 0.2.1 / 0.2.2（三线矩阵全 COMPATIBLE，bundles 72/77/86）；无版本分支。

## ✅ 验证

- `npm run check` 全绿：build --check 26/26、**test 113/113**、structure --strict、audit（新增 v2.0.0 守卫 6 条，无阻断）、check-css、verify、i18n-audit（zh=en **1369** 键）。
- `npm run compat` 三版本全 **COMPATIBLE**，`upgrade-check` 三份均 `all upgrade assumptions hold`。
- 新增 Node 测试（假 llm 服务，无需真实模型）：Host 头/方法/Content-Type/16KB/文本上限、provider/model 覆盖、并发 429 busy、断开中止、20s 截止（含请求体卡住与元数据挂起）、错误码映射、`capabilities.petLlm`、路由挂载 + 三个 loopback Host。
- 本机 DSH Desktop 0.2.2-rc.1 实机：重启后 `_engines?api=2` 返回 `"api":"2","stale":false`、`capabilities.petLlm.available=true`（`deepseek-account / deepseek-flash`）。
- 发布前对 GitHub 下载物做了干净副本验收：解压 → `npm run check` → `tools/build-dist.mjs` / `tools/pack.mjs` → 隔离 DSH 安装启动与页面冒烟（结果随 Release 附注）。

## 🔄 升级 / 回滚

- 升级：**重启 DSH 一次 + Ctrl+F5**（宿主半路由与 `HOST_API`/`BUILD` bump）。
- 回滚：重新安装上一发布版（v1.0.7 / 内部 1.6.8）+ Ctrl+F5 + 重启 DSH。

## 🔧 兼容性

- 同一份构建支持 DSH **0.2.0 / 0.2.1 / 0.2.2**（`>=0.2.0-rc.1 <0.3.0`）。
- 语言：zh / en 跟随 DSH；本版新增 9 个 `pet.chat.*` 双语键（zh=en **1369**）。
- 用户设置、形象、动作包、对话历史与 `state/` 数据无迁移成本；权限/配额/审计语义不变。

## 🧾 许可

- 本仓库代码 MIT；`vendor/` 内第三方组件（WebWallGL MIT、we-wallpaper MIT、wcap Unlicense）随包保留各自许可。

## 🩹 运行期稳定性修复（并入本版）

- 修复 pet-agent teardown 对 Fiber 型 ctx.inject() 返回值的清理：旧版每次功能卸载都会打印 pet-agent:dispose TypeError: cleanup is not a function 并残留注入的 emote.session / uiWorkspace scope；现同时支持函数与 Fiber（.dispose()）两种形状，并新增 A5 审计守卫与回归测试。
- 新增仓库根 .gitattributes（* text=auto eol=lf）：Windows core.autocrlf=true 检出不再把 lib/client.js 转成 CRLF，
ode tools/build.mjs --check 不会假失败（安装/运行本来不受影响）。

## 🧪 发布验收（独立复核）

- **GitHub 下载**：tag 2.0.0 与 package.json 版本一致；git clone --filter=blob:none --sparse 11s 成功、codeload 	ar.gz HEAD 200。下载副本按 CI 同款链路全绿：build --check 26 片段、test 113/113、structure --strict、audit 无阻断、check-css、verify 57 项、i18n zh=en 1369；pack 产物 39 文件 / 3,137 KiB、版本 2.0.0、HOST_API 2、无机器路径。
- **隔离安装与运行**：全新临时 DSH_HOME + DSH 0.2.2-rc.1，把下载包安装为 bundle + junction，headless Edge 验收 **32/32 PASS**：皮肤应用（ody[data-dsh-tianlight]、样式/UI/26 slots、reload 后重新应用）；_engines?api=2 → pi:"2", build:"2.0.0", stale:false, capabilities.petLlm 对象；_pet-chat 契约与负例正确；**0 uncaught exception / 0 console error**（仅排除演示媒体的预期 404）。干净 profile 无凭据时返回 502 missing-credential（设计内错误码）。
- **真实 DSH Desktop 冒烟**：POST /skin-tianlight/_pet-chat 真实模型调用 200（deepseek-account / deepseek-flash，1.3–3.9s，inish:"stop"）；坏 JSON 400、错误 Content-Type 415、非 loopback Host 403。
- **DSH 插件市场条目**：awesome-dsh-plugin 条目（PR #7956 merged，后由 #14030 刷新）通过全部规则（文件名/URL/name/theme 分类/双语描述与引号、根 package.json 的 dsh.bundle.patch + dsh.client、cordis.patch.yml、仓库元数据、生成的 README 行一致）；市场无版本字段，访客安装仓库 HEAD 即 v2.0.0，**无需更新 PR**（可选仅刷新描述）。
- **已知非阻塞项**：sparse 下载未拉取 57MB 演示媒体（按 git blob OID 校验完整性，真实视频/PNG 播放未覆盖）；本地 Node 24 验证与 CI Node 20/22 存在版本差异（CI 已全绿）。
