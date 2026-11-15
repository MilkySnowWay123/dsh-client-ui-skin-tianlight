# 天光 v2.2.0

功能版：液态玻璃新增**实时渲染**开关并修掉整体泛白；桌宠 AI 的模型选择从「只能换 provider」升级为 **provider + model**，可接入 Grok / Claude 等 DSH 已配置的国际模型。本版改动了宿主半（新路由 + `_pet-chat` 的 model 解析），**`HOST_API` 2 → 3**；升级后必须**完全退出 DSH（含托盘）再打开**，然后 `Ctrl+F5`，否则旧宿主会收到 `stale` 提示。

## 液态玻璃：实时渲染 + 去泛白

- **实时渲染按钮**：角色中枢 →「液态玻璃」新增开关，默认关闭。打开后侧栏、设置面板、壁纸库、角色中枢、输入区、菜单、模型胶囊、天气胶囊等已知玻璃面会加真实的 `backdrop-filter`，逐帧采样背后的壁纸；壁纸在动，玻璃里的画面跟着动，不再只是静态高光。
- **泛白修复**：旧配方在同一个像素上叠最高 `0.52` 的白色 specular 与 `0.30` 的白色填充，亮色壁纸下看起来像一层灰白雾。新版把三档 specular 降到 `0.17 / 0.24 / 0.30`，白色填充改成冷色调并下调 alpha，加入底部暗边和更低的白色 veil；壁纸颜色更透、更饱和。
- **能耗契约不变**：实时渲染是显式 opt-in；低电量或 15fps 渲染档会自动暂停采样，按钮保留开启状态并显示「省电/15fps 下暂不采样」；关闭或降级时零额外合成层。场景层仍保持静态 veil，不会回到全视口无差别 blur。
- 新键 `tianlight.glassLive`（`1`/`0`，默认 `0`）；「恢复默认外观」会把实时渲染一并关掉。

## 桌宠 AI：Grok / Claude 等国际模型

- **provider + model 两级选择**：角色中枢 →「AI 对话」新增模型下拉框。provider 决定读哪份模型目录，model 决定真正发给哪条路由；默认两者都「跟随 DSH 默认」，不选就保持旧行为。
- **接入方式**：先在 **DSH 设置 → 模型**里添加提供商——Claude 选内置 `anthropic` 并填 API 密钥；Grok 选「自定义模型 API」，地址 `https://api.x.ai/v1`、协议 `OpenAI Chat Completions`、填 xAI 密钥。回到角色中枢即可在 provider/model 下拉框看到 `anthropic` / `xai` 及其真实模型 id。
- **宿主解析顺序**：显式 model → 同 provider 的 DSH 默认模型 → 该 provider 模型目录第一项；解析前用 `resolveModelInfo()` 校验模型属于该 provider，不匹配返回 `unconfigured-model`，不再把 DeepSeek 的模型 id 发给 Anthropic。
- **新路由**：`GET /skin-tianlight/_pet-models?provider=<id>`，同源围栏、只读、5s 截止、最多 200 项，只返回模型 id/名称，不读凭据、不建会话、不发推理请求。`POST /skin-tianlight/_pet-chat` 新增可选 `model` 字段。
- 新键 `tianlight.pet.llmModel.v1`（模型 id，默认跟随 DSH 默认）；切换 provider 会清空旧 model，避免把 A 提供方的模型 id 发给 B。
- 权限、配额、固定系统提示、20s 截止、审计与「驱动 DSH 永久禁止」全部不变。

## 兼容与验证

- 支持 DSH 0.2.0 / 0.2.1 / 0.2.2（含 rc/alpha），上限仍锁在 `<0.3.0-0`。
- `npm run check` 全绿（build / test / structure / deps / audit / css / verify / i18n）；**154 项测试**（新增 live 玻璃、15fps 联动、模型目录/缓存/限流/单飞、`_pet-models` 真实挂载与围栏、默认外观重置等断言）。
- 真实 DSH 0.2.2-rc.3 + headless Edge：皮肤应用、简洁开机、长片 18.5s、无插件控制台错误全部通过；亮色与暗色壁纸各跑一轮 14/14，包括实时渲染开关（真实点击）、15fps 切换即时压平/恢复、provider+model 下拉、`_pet-models` 目录、以及本地 mock 的 OpenAI 兼容 provider 收到的 `mock-grok` 请求体。
- `tools/host-fuzz.mjs` 对 v2.1.10 的 122 个场景全部一致（状态码、9 个契约响应头、归一化响应体）；`HOST_API` 2→3 的契约差异按设计不计入路由等价。
- 桌面端升级：**完全退出 DSH（含托盘）→ 重开 → `Ctrl+F5`**。宿主半有新路由，只刷新页面不够。

## 已知边界

- 实时渲染在大面板上会让 Chromium 每帧重新采样壁纸，耗电高于静态档；这是显式开关的取舍，低电量会自动暂停。`backdrop-filter` 还会让面板成为 `position:fixed` 后代的包含块；DSH 0.2.2-rc.3 下实测侧栏/输入区正常，若未来产品版本在面板内部渲染非 portal 的浮层并出现错位，关闭实时渲染即可恢复。
- 模型列表由 DSH 的适配器提供；个别中转站不实现 `GET /models` 时下拉框可能为空，此时宿主会自动选该 provider 目录第一项，也可以在 DSH 设置里手动补模型。
- 皮肤自身仍不保存任何 API Key；密钥由 DSH 的凭据系统管理。
