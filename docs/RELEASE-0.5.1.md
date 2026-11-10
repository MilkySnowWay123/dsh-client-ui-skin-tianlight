# v0.5.1 · C4 天气联动、A2 实时节拍与 v0.5.0 收尾

> 版本：`0.5.1`（宿主 build `0.5.1`，`skin.json` → `dshCompatibility: "0.2.2rc1"`，
> `dshCompatibilityRange: ">=0.2.0-rc.1 <0.3.0"`，与 v0.5.0 相同）
> 构建：git `7282d94`；`lib/client.js` **768,962 字符 / 796,478 字节 / 21 个片段**；fragment 数不变（仍 21）。
> 运行时矩阵（verifier）：**4/4 运行时 PASS，387/387 断言，0 failed / 0 skipped / 0 console error**；
> 旧宿主 × 新客户端降级 **17/17 PASS**（见 §8.2 / §8.3）。
> 本版是 v0.5.0 的增量补丁：补齐 C4 天气联动、把 A2 节拍接到真实音频电平、修复同伴英文台词，
> 并清理 v0.5.0 遗留的 cosmetic 警告与引擎分区摘要截断。
> 逐项功能表：[docs/V050-FEATURES.md](V050-FEATURES.md) · 兼容性：[docs/COMPATIBILITY.md](COMPATIBILITY.md) · 更新日志：[CHANGELOG.md](../CHANGELOG.md)

## 1. 这一版改了什么

1. **C4 天气联动补齐**（v0.5.0 未纳入 → v0.5.1 实现，**默认关**）：`tianlight.weather` 独立模型，
   使用 **Open-Meteo 公共接口（免 API key）**；只把 WMO 天气码映射到 `effectsController` 的氛围层一个字段，
   不碰壁纸/叠加层/玻璃；面板块在 **⑨ 情境分区内**（不新增分区）。
2. **A2 真正驱动节拍**：系统音频回环激活时，用真实 audio level（~10Hz）驱动 Now Playing/回环两个节拍点；
   回环关闭时保留原装饰性脉冲；低功耗/减少动效冻结；无新增全局监听器。
3. **同伴英文台词修复**：台词改为持有 i18n key、显示时翻译；语言切换时**正在显示的气泡即时重译**；
   菜单/aria 全双语。
4. **消除 cosmetic 警告**：删除 `[ui-skin-tianlight] rheostat:render Object` 调试日志
   （v0.5.0 每个运行时 4–6 条该警告，v0.5.1 应为 0）。
5. **引擎分区 UI**：摘要改为紧凑短格式（不再省略号截断），完整缓存/自适应信息留在展开区；
   网页壁纸增加「暂停会卸载沙箱页面（项目内状态重置）」提示 + 截断的工程 URL（仅 kind=web）。

## 2. C4 天气联动（v0.5.1 实现，默认关、免 key、静默）

**模型**：`tianlight.weather` 独立持久化模型（`enabled/provider/city/latitude/longitude/intervalMin/last/lastError`），
与 `contextController` 分离，只驱动 `effectsController` 的 `ambience`/`ambienceDensity` 两个字段。

**位置来源**（三者都只由用户显式触发，绝不自动定位/自动弹权限）：
- 城市 geocoding：`https://geocoding-api.open-meteo.com/v1/search`（count=1、中文返回）；
- 手动经纬度：纬度 -90..90、经度 -180..180，四位小数归一化；
- 「使用当前位置」按钮：仅在点击时调用 `navigator.geolocation.getCurrentPosition`（timeout 8s、maximumAge 10min、
  `enableHighAccuracy:false`）。

**请求策略**：仅在 `enabled === true` **且**已有合法坐标时才请求
`https://api.open-meteo.com/v1/forecast?current=temperature_2m,weather_code,is_day&timezone=auto`；
- 轮询间隔 15 / 30 / 60 / 120 分钟（默认 30）；
- 页面隐藏时跳过轮询，恢复可见时立即刷新一次；
- 8 秒超时（AbortController）；单次失败最多 60 秒后重试一次（有界，不形成紧循环）；
- 所有失败**静默**：不弹窗、不抛错、保留上一次观测；面板状态行显示失败原因并继续按节奏重试；
- 关闭时同时清理 interval 与重试定时器 → **零请求、零定时器**；context 模块关闭（disposer）同理。

**天气 → 氛围映射**（只动氛围层，C1 的地盘不动）：

| WMO 天气码 | 氛围 |
|---|---|
| 雨类（51–57/61–67/80–82/95–99） | `rain`，密度 0.55 |
| 雪类（71–77/85–86） | `snow`，密度 0.5 |
| 晴（0）且白天 | `spots`，密度 0.2 |
| 其它 | `none`，密度 0 |

**面板**：C4 块在 ⑨ 情境分区内部（标题「天气联动」），含开关、城市、当前定位、经纬度、轮询间隔、立即刷新、
状态行与隐私说明；**没有新增分区 id/order**，fragment 数仍为 21。

**与 C1 同时开启**：C1（时段自适应）与 C4 都会写 `effectsController.ambience`，**最后写入者为准**；
面板会显示冲突提示，文档建议不要同时开启（要天气就关时段自适应，或反之）。

**隐私与网络**：关闭时**零网络请求**；启用后只请求上述两个 Open-Meteo 公开接口，只发送城市名或坐标，
**无 API key、无账号、无遥测、不上传壁纸与设置**。失败不会重试到其它第三方域名。

## 3. A2 真正驱动节拍（v0.5.1）

- 系统音频回环激活（`audio.mode === "system"` 且 `active`）时，⑩ 音频分区的两个节拍点由**真实 analyser 电平**
  驱动：`window.setInterval(paint, 100)`（~10Hz，**不是 60Hz rAF**），把电平映射为 `scale/opacity`；
- 回环关闭/未启用时清空驱动属性，回到原有 `[data-tl-beat]` 装饰性播放脉冲；
- 低功耗（`body[data-tl-lowpower]`）或 `prefers-reduced-motion` 时冻结（CSS + 逻辑双重）；
- 新增「系统音频节拍（实时）」状态文本；interval 在组件卸载/disposer 时清理，无新增 window/document 监听器。

## 4. 同伴英文台词修复（v0.5.1）

- 台词以 i18n key 保存（如 `pet.hello`），**显示时**才 `TL_T` 翻译；语言切换时若气泡正在显示，
  会立即重译（旧实现只在调用那一刻翻译，英文模式下会残留中文，v0.5.0 截图里的「喵～我来啦」即此问题）；
- 互动菜单按钮、桌宠 `aria-label`、气泡提示全部走双语 key；切换语言不重建 DOM、不重置位置。

## 5. 消除 cosmetic 警告（v0.5.1）

- 删除 `note("rheostat:render", { … })` 一次性调试日志（v0.5.0 每次运行 4–6 条 `rheostat:render Object` 警告）；
- 其余 `note(...)` 调用去掉多余的空对象参数（只影响调试输出，无行为变化）；
- 静态链与运行时断言不依赖这些日志；v0.5.1 预期 console warning 为 0（真实验证由 verifier 复核）。

## 6. 引擎分区 UI（v0.5.1）

- **摘要紧凑化**：摘要行改为 `缓存 {hit}/{miss} · {自适应状态}`（状态为 未降档/降档中/已锁定/自适应关），
  不再出现 v0.5.0 的省略号截断；完整缓存条目/大小/命中率与自适应原因仍在展开区；
- **网页壁纸提示**：当前壁纸 `kind=web` 时，展开区显示
  「网页壁纸：暂停会卸载沙箱页面（项目内状态会重置）。」以及工程 URL；
- **工程 URL 截断**：超过 56 字符时中间截断（前 30 + `…` + 后 22），完整 URL 在 `title` 悬浮提示里；
  非 web 壁纸不显示这两行。

## 7. 版本与构建

| 项 | 值 |
|---|---|
| 版本 | `0.5.1`（`package.json` / `skin.json`） |
| 宿主/客户端 build 标记 | `BUILD = '0.5.1'` / `HOST_BUILD = "0.5.1"` |
| git | `7282d94`（v0.5.0 `v0.5.0` tag 之后） |
| 产物 | `lib/client.js` 768,962 字符 / 796,478 字节 / 21 个片段 |
| 静态链 | build --check / test 61/61 / structure --strict / audit / check-css / verify 全 exit 0 |
| 宿主半 | 无新增路由；只有 build 标记从 0.5.0 → 0.5.1 |
| DSH 范围 | `>=0.2.0-rc.1 <0.3.0`，同一份构建继续支持 0.2.0 / 0.2.1 / 0.2.2 |

v0.5.0 的功能与兼容性结论见 [RELEASE-0.5.0.md](RELEASE-0.5.0.md)；本版不改变那张功能表，只补 C4 并做上述打磨。

## 8. 验证证据

### 8.1 集成级（已确认，静态）

| 检查 | 结果 | 证据 |
|---|---|---|
| 最终产物 | ✅ git `7282d94`；`lib/client.js` 768,962 字符 / 796,478 字节 / 21 个片段；`BUILD` / `HOST_BUILD` 标记均为 0.5.1 | `git show 7282d94 --stat`、`node tools/build.mjs --check` |
| `npm run check` 静态链 | ✅ build --check / test 61/61 / structure --strict / audit / check-css / verify 全 exit 0 | 静态链输出 |
| 测试更新 | ✅ `tools/test.mjs` 的 build 握手断言改为从 `package.json` 读取版本（版本自增不会再让旧断言失败）；`tools/verify.mjs` 更新为 0.5.1 | diff `7282d94` |

### 8.2 运行时矩阵（verifier 判定：全部 PASS）

矩阵 run：`diag/skinlab/runs/20261109-115146-v050-v051-multiversion`（exit 0，≈8m40s；稳定副本
`diag/skinlab/evidence/multiversion-v051.json`）。Run provenance：version `0.5.1`，product **768,962 字符 /
796,478 字节 / 21 fragments**，`gitDirty: []`，HEAD at run = `c437c68`（docs-only，product 提交为 `7282d94`）。

| Runtime | v0.4.0 base | v0.5.0 group | v0.5.1 delta | 总计 | 判定 |
|---|---|---|---|---|---|
| DSH 0.2.0-rc.2（npm web） | 38/38 | 42/42 | 16/16 | **96/96 PASS** | PASS |
| DSH 0.2.1-rc.5（npm web） | 38/38 | 42/42 | 16/16 | **96/96 PASS** | PASS |
| DSH 0.2.2-rc.1（npm web） | 38/38 | 42/42 | 16/16 | **96/96 PASS** | PASS |
| DSH 0.2.2-rc.1 Desktop（CLI/app.asar + 模拟 preload） | 41/41 | 42/42 | 16/16 | **99/99 PASS** | PASS |

**总计 387/387 断言 PASS；0 failed / 0 skipped / 0 console errors / 0 exceptions（failing ids: none）。**
v0.5.1 delta 组（16 条/运行时）在 skin ≥ 0.5.1 时自动追加，v0.5.0 证据保持可比。

| 交叉验收（4/4 运行时） | 观测 |
|---|---|
| 版本握手 | `_engines?build=0.5.1` → `{build:"0.5.1", stale:false}` |
| C4 天气块 | ⑨ 情境分区内渲染完整块（3 inputs + 9 buttons，含 15/30/60/120 分钟）；默认 `tianlight.weather=null`；控件禁用、状态「未启用（关闭时零网络请求）」/ `Off (zero network requests while off)` |
| C4 零外部请求 | 一次整页 reload + 面板/天气渲染的 CDP Network 捕获：**0 external / 0 `*.open-meteo.com`**（64–67 条请求全为 127.0.0.1；lab 按设计不启用天气） |
| A2 节拍 | markers 随产品发出（`data-tl-audio-dot` / `data-tl-audio-driven` / `.tl5-audio-beat`）；loopback off 时 **0 driven、0 冻结样式、0 beat hint**（presence + idle-clean；headless 无法打开系统音频选择器） |
| 引擎摘要 | zh `缓存 0/1 · 未降档` / en `cache 0/1 · ok`（英文无 CJK、无长计数器行）；无 `kind=web` 壁纸时 web-pause hint 不渲染 |
| 同伴台词 | 切 English 后 `[data-tl-cat]` aria + 4 个菜单按钮 + 触发的气泡均无 CJK（v022 探测时气泡已淡出，菜单/aria/英文文本仍断言；其余 3 个运行时断言了可见气泡） |
| 警告 / 日志 | `rheostat:render` 为 **0**；delta 窗口 0 console errors / 0 exceptions |
| 语言恢复 | 每个运行时恢复起始语言/模式（3× zh、v022 profile 起始 en） |

**旧宿主 × 新客户端降级（v0.5.1 重跑）**：run
`diag/skinlab/runs/20261109-120023-v050-degraded-v051degraded-multiversion`（稳定副本
`diag/skinlab/evidence/multiversion-v051-degraded.json`）——host 半 v0.4.0 + browser 半 v0.5.1：
**17/17 PASS，0 console error/exception**；`_engines?build=0.5.1` → `{build:"0.4.0", stale:true}` + 面板
「宿主半待重启 DSH」提示；`_settings` / `_frame-cache/status` / `_transcode/status` / `_bundle` / `_web-project`
均 404 且无挂起；`_wallpapers` 200；模块开关/壁纸播放正常；网络噪音有界（8 条预期 404，无增长）。

**证据**：`diag/skinlab/V051-VERDICT.md`、`diag/skinlab/V051-MATRIX.md`；run 内 `matrix.json`、
`data/version-{v020,v0215,v022,vdesk}.json`（`facts.v051`）、`logs/`、`shots/`（23 PNG/运行时）；
稳定副本 `diag/skinlab/evidence/multiversion-v051.json`、`evidence/multiversion-v051-degraded.json`、
`evidence/v051/`（脚本快照 + matrix copy + 20 张 delta 截图）。

### 8.3 已接受残余风险（verifier §6，不阻塞发布）

1. **天气只验证了"默认关"路径**：lab 按设计不启用天气（离线环境是一等公民），零外部请求/禁用控件/状态行已断言；
   在线轮询与解析逻辑由实现侧 mock 单测覆盖，未在 lab 里做真实天气结果断言。
2. **A2 只验证"已发出 + idle-clean"**：headless 浏览器无法打开系统音频选择器，回环未真正激活；
   "真实电平驱动"是代码路径确认（markers 与 `audioController` 同源），非像素观测。
3. **v022 的同伴气泡在探测时已淡出**（`bubbleVisible:false`）：该运行时对 menu/aria/英文文本做了断言，
   其余 3 个运行时断言了可见气泡；显示时 i18n 刷新路径相同。
4. **旧宿主降级只在 v022 web 上重跑**（同一 client bundle 跨运行时一致；Desktop + 旧宿主组合未单独模拟）。
5. **v0.5.0 的残余风险仍然适用**：Desktop preload 为契约模拟；lab profile 语言启动态不确定（两个方向都覆盖）；
   headless 视口 1406×803；引擎摘要文本依赖实时指标（断言检查紧凑形态，不检查固定数值）。

## 9. 生效方式

- v0.5.1 **没有新增宿主路由**，但宿主 build 标记从 `0.5.0` 变为 `0.5.1`：只 Ctrl+F5 更新浏览器半时，
  页面会提示「宿主半待重启 DSH」（握手 `stale:true`），**功能不受影响**；想消除提示请**重启一次 DSH**。
- 之后只改浏览器半（`src/` → `lib/client.js`）时照旧 Ctrl+F5。
- `state/`（设置、帧缓存、导入 staging）与 `assets/derived/` 仍是本机运行时数据，git 忽略。

## 10. 已知限制

- **C4 依赖外网**：Open-Meteo 是公共免费接口，可能限流/变更/不可达；失败时保留上次观测并静默重试，
  不影响壁纸与其它功能。无 SLA、无 API key、无遥测。
- **C4 定位权限**：浏览器只在 HTTPS 或 localhost 下提供 geolocation；「使用当前位置」必须由用户点击，
  拒绝后只能改用手动坐标/城市名。
- **C4 与 C1 冲突**：两者都写氛围层，同时开启时最后写入者为准（面板有提示，建议二选一）。
- **A2 节拍**：~10Hz 的视觉近似（不是音频分析仪），只在系统音频回环激活时驱动；麦克风路径不驱动该节拍。
- **同伴文案**：新台词全双语；历史/极少数既有短语仍可能是中文（v0.5.0 残余风险的延续，不阻塞）。
- **引擎摘要**：紧凑格式省略了完整缓存数值，完整信息在展开区；web 提示只在网页壁纸时出现。
- **v0.5.0 的既有取舍不变**：见 [RELEASE-0.5.0.md](RELEASE-0.5.0.md) §8/§9。

## 11. 回滚

发布时由 `tools/release.mjs` 生成 release commit + 注记 tag + `backup/` 快照；本版**尚未打 tag**。

```bash
# 未推送前：回到 v0.5.0 的 release 提交
git tag -d v0.5.1        # 若已切
git reset --hard v0.5.0
# 或只撤掉 release 写入的文件
git checkout -- package.json skin.json src/10-constants.js lib/index.js lib/client.js CHANGELOG.md

# 已推送后
git push origin :refs/tags/v0.5.1
git revert --no-edit <release-commit>

# 快照
npm run restore          # 最近一次快照 = 本次 release 状态（回 release 之前请用 git）
```
