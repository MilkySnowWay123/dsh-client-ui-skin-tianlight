# 兼容性矩阵 · DSH 0.2.0 / 0.2.1 / 0.2.2

> 适用范围：`dsh-client-ui-skin-tianlight` **v2.0.2**（2026-11-12；v2.0.1 及更早的包名为 `@dsh-external/dsh-client-ui-skin-tianlight`，仅用于链接安装，不能发布到 npm）
> 目标：同一次构建同时支持 DSH **0.2.0、0.2.1、0.2.2** 三条运行时线（Web `dsh web` 与 Desktop 壳），
> 且不需要为版本维护多份产物。所有选择器都不写 DSH 构建哈希。
> v0.5.0 判定见 [RELEASE-0.5.0.md](RELEASE-0.5.0.md)（4 运行时 323/323 PASS + 旧宿主降级 17/17 PASS）；
> v0.5.1 见 [RELEASE-0.5.1.md](RELEASE-0.5.1.md)（387/387 PASS）；v0.5.2 是自检修复版
> （数据安全 / i18n / 面板体验），见 [RELEASE-0.5.2.md](RELEASE-0.5.2.md)；v0.5.3 是大修版
> （快捷壁纸 / 点击链路 / 语言解耦 / 情境安全默认，无新功能），见 [RELEASE-0.5.3.md](RELEASE-0.5.3.md)；
> **v0.6.0 接入本机 Wallpaper Engine 库（新宿主前缀 `/api/we-wallpaper` + 第 22 片段）**，
> 见 [RELEASE-0.6.0.md](RELEASE-0.6.0.md)。

## 1. 支持声明

| 项 | 值 |
|---|---|
| 支持范围 | `>=0.2.0-rc.1 <0.2.1-0 \|\| >=0.2.1-0 <0.2.2-0 \|\| >=0.2.2-0 <0.3.0-0`（同一串写进三处，见 §1b；0.2.x 的正式/rc/alpha 均放行，0.3.x 起被拦下） |
| 管理器展示值 | `dshCompatibility: "0.2.2rc1"`（skin-manager 只接受 `/^\d+\.\d+\.\d+rc\d+$/` 单串；它会安全忽略 `dshCompatibilityRange`） |
| 实测版本 | 0.2.0-rc.2 · 0.2.1-rc.3（历史 Desktop）· 0.2.1-rc.5（npm 运行时）· 0.2.2-rc.1（npm + Desktop） |
| 不承诺 | 0.3.x 及以后（需要先跑 `npm run compat` 与多版本 lab） |

`skin.json` 同时提供只读信息字段（skin-manager 会安全忽略未知字段）：

```json
"dshCompatibility": "0.2.2rc1",
"dshCompatibilityRange": ">=0.2.0-rc.1 <0.2.1-0 || >=0.2.1-0 <0.2.2-0 || >=0.2.2-0 <0.3.0-0",
"dshCompatibilityTested": ["0.2.0-rc.2", "0.2.1-rc.3", "0.2.1-rc.5", "0.2.2-rc.1"],
"version": "2.0.1"
```

`version` 由 `tools/release.mjs` 在发布时写入/更新（skin-manager 忽略未知字段）。

### 1b. 兼容性门禁在哪里生效（源码证据，v2.0.1 修订）

DSH 的插件兼容判断**不读 `skin.json`**，而在 `@deepseek-ai/dsh-app-boot` 的
`evaluatePluginCompatibility()` 里；`@deepseek-ai/dsh-plugin-manager` 在安装前、安装后和启动装载
bundle 时都会调用它（不兼容会被拒绝安装或跳过 bundle 并提示，可用 exact-version exemption 强制放行）。

| DSH 版本 | 判断字段 | 证据（npm 包内文件:行） |
|---|---|---|
| 0.2.0-rc.2 | 只读 `peerDependencies` 里的 `@deepseek-ai/dsh` / `@deepseek-ai/dsh-*`（无 `engines.dsh` 支持） | `dsh-app-boot/lib/index.js:252-306`（`unmetRequirements` 只遍历 peers） |
| 0.2.1-rc.5 | `engines.dsh` 存在则**独自**决定、忽略 peers；否则同上 peer 列表 | `dsh-app-boot/lib/index.js:252-326` |
| 0.2.2-rc.1 | 同 0.2.1 | `dsh-app-boot/lib/index.js:1070-1144` |

- 三个版本都用 `semver.satisfies(runtimeVersion, range, { includePrerelease: true })`，因此 rc/alpha
  预发布参与范围匹配（`satisfies()`：0.2.0 :300，0.2.1 :277，0.2.2 :1095）。
- 安装前预读：0.2.0 用 `pnpm view … peerDependencies`（`dsh-plugin-manager/lib/types/operations.js:126-140`），
  0.2.1/0.2.2 用 `pnpm view … engines peerDependencies`（`…/operations.js:184-209`）。
- **pnpm 不会自动安装 peer**：三个版本的 profile 模板固定 `nodeLinker: hoisted` + `autoInstallPeers: false`
  （`dsh-app-boot/lib/index.js` 的 `PROFILE_PNPM_WORKSPACE`；0.2.0 :563-567，0.2.1/0.2.2 相同），
  peer 声明只用于兼容判断，不会把官方包复制进 profile。
- awesome-dsh-plugin `contributing.md`：官方 `@deepseek-ai/*` 包用 `peerDependencies` 声明，并且范围要为
  每个 patch 元组写显式预发布分支（旧 `>=0.2.0-rc.1 <0.3.0` 会静默排除 0.2.1/0.2.2 的 rc 构建）。

结论：**同时**声明 `package.json` 的 `engines.dsh`（0.2.1/0.2.2 门禁）和两个官方包的
`peerDependencies`（0.2.0 门禁 + 官方依赖声明），`skin.json.dshCompatibilityRange` 保持同一串；
`tools/compat.mjs` 是唯一来源，`tools/audit.mjs` / `tools/verify.mjs` / `tools/test.mjs` 三处静态守卫强制一致。

**集成基线**：v0.5.1 = git `7282d94`，`lib/client.js` 768,962 字符 / 21 片段；完整静态链全 PASS（build --check、
test 61/61、structure --strict、audit、check-css、verify 全部 exit 0）。**v0.5.0 运行时矩阵已判定**：
4 个运行时 323/323 断言 PASS（0 failed / 0 skipped / 0 console error），旧宿主降级 17/17 PASS，见 §3.2。
**v0.5.1 运行时矩阵已判定**：4 个运行时 **387/387 断言 PASS**（web 96/96 ×3 + Desktop 99/99；0 failed /
0 skipped / 0 console error），旧宿主降级 17/17 PASS，见 §3.3。
**v0.5.2（已判定）**：git `fe32f7f`；`lib/client.js` 798,816 字符 / 829,659 字节 / 21 片段；静态链含 `i18n-audit`
全绿；运行时矩阵 **4/4 运行时 PASS，387/387 断言**（web 96/96 ×3 + Desktop 99/99；0 failed / 0 skipped /
0 console error），三类用户问题自检 A 7/7、B 81/81、C 10/10，Desktop 10/10，旧宿主降级 17/17，见 §3.4。
**v0.5.3（已判定）**：git `73b378d`；`lib/client.js` 827,150 字符 / 859,341 字节 / 21 片段；build --check 21/21；
静态链（含 `i18n-audit`）全绿；运行时矩阵 **4/4 运行时 PASS，387/387 断言**（web 96/96 ×3 + Desktop 99/99；
0 failed / 0 skipped / 0 console error），真实鼠标 **P1–P5 39/39 PASS**，旧宿主降级 **17/17 PASS**，见 §3.5。
**v0.6.0**：git `acb17a6`；`lib/client.js` 896,889 字符 / 930,994 字节 / **22 片段**；`BUILD`/`HOST_BUILD` = 0.6.0；
`build --check` **22/22**、`test` **67/67**、structure/audit/check-css/verify/i18n-audit 全绿；W 自检 v0.2.2 web /
Desktop 各 **23/23 PASS**；4-runtime 全量矩阵见 `diag/skinlab/V060-VERDICT.md`（§3.6）。

## 2. 依赖的稳定钩子（v0.5.0 / v0.5.1；v0.5.2 / v0.5.3 无新增；v0.6.0 additive）

v0.5.0 新增功能没有引入任何版本分支，只用到三条运行时线共有的钩子；v0.5.1 的增量
（C4 天气、A2 真实电平节拍、同伴台词重译）**没有新增 DSH 钩子或宿主路由**——C4 用标准 `fetch`
访问 Open-Meteo 公共接口，A2 复用既有 `audioController`，台词复用 13-i18n 既有 API。
**v0.5.2 是纯修复版**：数据安全/i18n/面板加载态都在既有片段与既有宿主路由内完成，**无新增钩子、无新路由、
不改选择器桥**。**v0.5.3 同样无新钩子/路由**：语言改为**只读 locale 服务**（不再 `setLocale`），
点击链路是纯 CSS z-index 与面板内部改动，快捷选择是 pick 视图重排。

| 钩子 / 契约 | 0.2.0 | 0.2.1 | 0.2.2 | 用途 | 缺失时 |
|---|---|---|---|---|---|
| `[data-chat-running]`（产品运行中标记） | 有 | 有 | 有 | C2 专注联动（生成中压暗+模糊场景） | 联动静默失效，播放/壁纸不受影响 |
| locale 服务（`dsh-client-locale` 包提供） | 有 | 有 | 有 | D7 zh/en 双语、跟随 DSH 语言 | 只切天光自己的文案，按浏览器语言兜底 |
| Slot 契约 + 产品 `data-*` + 类名分段名（`src/65-bridge.js`，v0.5.0 未改） | 有 | 有 | 有 | 既有 surface 发现；v0.5.0 没有新增桥接规则 | 沿用 v0.4.0 的分层降级 |
| 宿主 `webServer` + `register({kind:'prefix'})` | 有 | 有 | 有 | 新增 `_settings` / `_bundle` / `_import` / `_frame-cache` / `_transcode` / `_web-project` 路由；v0.6.0 增加第二前缀 `/api/we-wallpaper`（list/preview/media/pkg/web/scene-video/diagnostics/state） | 旧宿主上逐路由 404 → 客户端对应功能隐藏/退化（见 §5） |
| `slots` 服务（`settings.section` / `sidebar.footer.action`） | 有 | 有 | 有 | v0.6.0 的 WE 库设置导航页与侧栏按钮（additive；缺失时降级到 CustomEvent 浮层 + 诊断） | 缺 slots 时只保留浮层/事件入口，不阻塞 apply |
| `__ModuleLoader__.load` / `dsh.client` | 有 | 有 | 有 | 浏览器半加载契约（v0.5.0 未变） | 皮肤不出现（不阻塞 DSH） |

补充说明：

- **没有新增构建哈希**：v0.5.0 的 CSS 仍只认皮肤自己的 `data-tl-*`；选择器桥的发现顺序
  （Slot 契约 → 产品 `data-*` → 类名分段名）与 v0.4.0 相同。
- **宿主路由逐条降级**：`_settings` 不可用 → 设置本地模式；`_bundle`/`_import` → 导入导出入口隐藏；
  `_frame-cache` → 跳预裁剪直接实时帧；`_transcode` → 转码按钮隐藏；`_web-project` → 网页壁纸只显示预览并说明。
- **异步 apply 有超时边界**：宿主设置引导最多等待约 1.2s（AbortController），宿主慢/缺失都不会阻塞皮肤出现。
- **v0.5.1 唯一的外部网络能力是 C4 天气**：默认关；只有显式启用且已有城市/坐标后才请求 Open-Meteo
  （`geocoding-api.open-meteo.com` + `api.open-meteo.com`）——**免 API key、无账号、无遥测**，
  只发送城市名或坐标；关闭时零网络请求。「使用当前位置」是显式点击动作，绝不自动请求 geolocation。

### 2.1 网络与隐私（C4 天气，v0.5.1）

| 项 | 行为 |
|---|---|
| 关闭时 | 零网络请求、零定时器；不读取定位 |
| 启用前提 | 用户显式打开开关，且已有城市解析/手动坐标/显式「使用当前位置」三者之一 |
| 请求目标 | 仅 `https://geocoding-api.open-meteo.com/v1/search` 与 `https://api.open-meteo.com/v1/forecast` |
| 发送内容 | 城市名，或经纬度；不含壁纸、设置、账号或设备标识 |
| 凭据 / 遥测 | 无 API key、无账号、无遥测、无第三方统计 |
| 失败处理 | 8s 超时；单次失败最多 60s 后重试一次；全静默并保留上次观测 |
| DSH 兼容性影响 | 无：不新增宿主路由、不改选择器桥；离线/被墙时只是天气联动不可用，其余功能不受影响 |

### 2.2 设置数据安全（v0.5.2）

用户反馈「重启后设置/壁纸选择丢失」的根因是 v0.5.0/v0.5.1 的 `applyHostSettings()` 在宿主 revision 更新时
**删除宿主快照里没有的本地 `tianlight.*` 键**——宿主文件一旦不完整（首启空文件/其它浏览器子集/推送失败），
本地完整设置就会被清空。v0.5.2 的规则（`src/12-schema.js`）：

| 规则 | 行为 | 兼容性影响 |
|---|---|---|
| 宿主有的键 | 按宿主值落地 | 无变化 |
| 显式 `null` 墓碑 | 仍删除本地键（跨浏览器删除语义保留） | 无变化 |
| 宿主没有、本地独有的键 | **保留**并回推宿主（宿主重新变超集），绝不反向清空本地 | 修复数据丢失 |
| 采纳前备份 | 本地可同步键写入 `tianlight.backup.host`；`tianlight.backup.` 前缀被镜像层排除，**只在本机、不参与宿主同步**；256KB 上限 | 新本地键，不发给宿主 |
| 恢复入口 | ⑦ 工程「恢复宿主导入前备份」写回本地并立即推宿主 | 纯客户端，无新路由 |
| bootstrap push | 首启全量推送；失败重试一次（1s，仅 network/5xx/超时；4xx/路由缺失不重试） | 无新接口 |

- 该修复**不改变设置键名、不改变 `_settings` 协议**，旧宿主/旧版本 DSH 上同样生效（纯客户端逻辑）。
- 备份键是**本地数据**：每台机器独立，不随宿主同步；恢复只覆盖备份内的键，不覆盖其它键。
- `tl5Diag("settings")` 增加 `{localKeys, remoteKeys, pushedKeys, pushRetried}`，`settingsStore.status()` 增加
  `backup` / `recovered`，便于诊断（运行时矩阵见 §3.4）。

### 2.3 行为变更与安全默认（v0.5.3）

| 项 | v0.5.3 行为 | 兼容性影响 |
|---|---|---|
| 皮肤语言 | 显式选「中文 / English」**只切皮肤文案**，绝不调用 `locale.setLocale()`；「跟随 DSH」仍订阅 `locale/change` | **行为变更**：不再联动 DSH 界面语言；用户要跟随宿主请选「跟随 DSH」 |
| 情境默认 | C1 时段外观 / C2 专注联动 / C3 性能自适应 / C4 天气默认 OFF；已持久化的合法选择保留 | 默认外观更稳定；老用户设置不被强制覆盖 |
| C1 影响 | 只做 \|亮度影响\| ≤6% 的小偏移，面板显示影响值 + 关闭按钮 | 视觉变化更小，可随时关 |
| C4 天气 | 折叠进「实验性功能（需要联网，Electron 下可能受网络策略限制）」，默认关且零请求；失败可读 + 重试 | 网络/隐私行为与 v0.5.1 一致，仅入口与默认更保守 |
| C3 采样 | 仅 visible & focused 时才采样；连续 5 次低样本且 ≥10s 才降档；5 分钟冷却；聚焦/恢复立即清除 | 不再在后台上冻结动态壁纸 |
| 本地键 | 新增 `tianlight.cache.known`（已捕获的帧缓存 key 列表） | 本地数据、不参与宿主同步 |
| 点击链路 | 皮肤浮层 z-index 1290–1320（scrim/面板/手柄/字体面板），保留标题栏安全区与键盘路径 | 不依赖产品 mask 是否存在；旧宿主/旧 DSH 同样生效 |

### 2.4 Wallpaper Engine 集成（v0.6.0）

| 契约 | 行为 | 兼容性影响 |
|---|---|---|
| 第二前缀 `/api/we-wallpaper/*` | 通过既有 `webServer.register({kind:'prefix'})` 追加注册；与 `/skin-tianlight` 并列，互不覆盖 | additive；旧宿主没有该前缀 → 客户端 404 即降级 |
| `_wallpapers` | 只在末尾追加 `source:"we"` 条目；旧条目顺序/id 不变；WE 不存在时零条目 | additive，不破坏旧客户端 |
| `_engines` | 增加 `weLibrary:{found,count,root}`；`capabilities.weLibrary` 是 WE 入口是否渲染的唯一依据 | additive；旧客户端忽略未知字段 |
| 同源/路径安全 | 放行 DSH Desktop `dsh-app://…` 与本机 `http(s)://127.0.0.1|localhost[:port]`；`Sec-Fetch-Site: cross-site` 与其它 Origin → 403；id 经扫描映射、逐段 containment（遍历 400/403） | 纯宿主侧；不改变 DSH 契约 |
| 场景动态缓存 | 可选、**Windows-only**（wcap + PowerShell）；非 Windows/缺 wcap/显式禁用 → `503 {error:"scene-video-unsupported", reason}` | 其它平台只显示高清静态，不影响应用 |
| 运行状态/缓存 | `<plugin>/state/we-wallpaper.json`、`state/we-wallpaper-cache/`（gitignored）；`TIANLIGHT_WE_HOME` 可覆盖；不读写 `~/.dsh` | 本机数据、不随发布包分发 |
| 旧宿主（v0.4.0）× 新客户端 | WE 路由 404 → WE 页面提示「宿主半尚未提供壁纸库接口，更新/重启 DSH 后重试」；面板/播放等其它功能正常 | **已知边界，未真机复验**；需重启 DSH 获得该前缀 |

## 3. 运行时验证矩阵（v0.5.0 / v0.5.1 / v0.5.2 / v0.5.3 / v0.6.0）

### 3.1 集成级（静态，v0.5.1 / v0.5.2 / v0.5.3 / v0.6.0 已确认）

| 检查 | 结果 | 证据 |
|---|---|---|
| v0.5.1 集成基线 | ✅ git `7282d94`；client 768,962 字符 / 796,478 字节 / 21 片段；`BUILD` / `HOST_BUILD` = 0.5.1 | `git show 7282d94 --stat`；`node tools/build.mjs --check` |
| 静态链（build --check / test 61/61 / structure --strict / audit / check-css / verify） | ✅ 全 PASS | 静态链输出 |
| v0.5.2 集成基线 | ✅ git `fe32f7f`；client 798,816 字符 / 829,659 字节 / 21 片段；`BUILD` / `HOST_BUILD` = 0.5.2；静态链含 i18n-audit 全 PASS（test 61/61） | `git show fe32f7f --stat`；`node tools/build.mjs --check` |
| v0.5.3 集成基线 | ✅ git `73b378d`；client 827,150 字符 / 859,341 字节 / 21 片段；`BUILD` / `HOST_BUILD` = 0.5.3；build --check 21/21；静态链含 i18n-audit 全 PASS（test 61/61） | `git show 73b378d --stat`；`node tools/build.mjs --check` |
| v0.6.0 集成基线 | ✅ git `acb17a6`；client 896,889 字符 / 930,994 字节 / 22 片段；`BUILD` / `HOST_BUILD` = 0.6.0；build --check 22/22、test 67/67、structure/audit/check-css/verify/i18n-audit 全绿；host WE 真实本机 35 条（`_wallpapers` 38、`_engines.weLibrary`） | `git show acb17a6 --stat`；`node tools/build.mjs --check`；`diag/skinlab/evidence/v060-we/` |
| 配方 v2 + `presets/*.json` 契约（v0.5.1 起未改） | ✅ 8 个配方文件（v0.4 3 + v0.5 5） | 本地验证 |
| v0.5.0 基线（历史） | ✅ git `72d72fe`；client 724,684 字符 / 750,666 字节 / 21 片段 | `git show 72d72fe --stat` |

### 3.2 v0.5.0 运行时矩阵（verifier 判定，历史：全部 PASS）

最终矩阵 run：`diag/skinlab/runs/20261109-111509-v050-final-multiversion`（exit 0，5m55s；稳定副本
`diag/skinlab/evidence/multiversion-v050.json`），对 git `72d72fe` 构建执行：

| DSH | 运行方式 | v0.4.0 断言 | v0.5.0 断言 | 总计 | 判定 |
|---|---|---|---|---|---|
| 0.2.0-rc.2 | `dsh web`（npm，隔离 profile） | 38/38 | 42/42 | **80/80 PASS** | PASS |
| 0.2.1-rc.5 | `dsh web`（npm，隔离 profile） | 38/38 | 42/42 | **80/80 PASS** | PASS |
| 0.2.2-rc.1 | `dsh web`（npm，隔离 profile） | 38/38 | 42/42 | **80/80 PASS** | PASS |
| 0.2.2-rc.1 Desktop | app.asar CLI + 模拟 preload（40px 标题栏契约） | 41/41 | 42/42 | **83/83 PASS** | PASS |

- **0 failed / 0 skipped / 0 console errors / 0 exceptions**；四个运行时共用同一构建（`_engines.build = 0.5.0`，
  新握手 `stale:false`、错误 build 探针 `stale:true`）；每个运行时 v0.5.0 分组 **42/42**。
- Desktop 标题栏：`panelRect.top = 40px`、面板高 763px、关闭按钮 hit-test 通过。
- 面板/语言：高级视图 7 个扩展分区（engineering / effects / context / audio / engine / legibility / a11y）
  几何无重叠/无横向裁切；zh↔en 切换**无 reload**（`timeOrigin` 不变），D7 旧标签跟随切换并可恢复（4/4 运行时）。
- 模块开关：companion OFF → `[data-tl-cat]` / `[data-tl-say]` / `[data-tl-catmenu]` 归零且 state 镜像一致，
  ON 恢复（4/4 运行时）。
- 渲染预算：⑦ 工程分区只读区（fps/抖动/档位/省电/缓存/特效）正常渲染、无重叠；本矩阵不做逐帧数值 KPI 验收。
- 设置：localStorage → 宿主同步（revision 递增）→ 刷新后本地+宿主恢复（null tombstone 清理，4/4 运行时）。
- **旧宿主 × 新客户端降级**：run `diag/skinlab/runs/20261109-112228-v050-degraded-degraded2-multiversion`
  （稳定副本 `diag/skinlab/evidence/multiversion-v050-degraded.json`），**17/17 PASS，0 console error/exception**：
  `_engines?build=0.5.0` → `{build:"0.4.0", stale:true}` + 面板「宿主半待重启 DSH」提示；缺失路由 404 无挂起；
  设置本地模式；模块开关与壁纸播放正常。
- **证据**：`diag/skinlab/V050-VERDICT.md`（+ 副本 `diag/skinlab/evidence/v050/V050-VERDICT.md`）；
  run 内 `matrix.json`、`data/version-{v020,v0215,v022,vdesk}.json`、`logs/`；关键截图 50 张在
  `diag/skinlab/evidence/v050/shots/`，run 内 76 张已复核截图在 `shots/`；断言目录 `diag/skinlab/V050-MATRIX.md`。
- **已接受的残余风险**（verifier §6，不阻塞发布）：Desktop preload 为契约模拟、lab 语言启动态不确定、
  每个运行时 6 条装饰性 rheostat warning、引擎摘要省略号、少量旧桌宠台词可能仍为中文、headless 视口 1406×803、
  降级仅演练 v022-web、frame-cache 测试会清空可丢弃缓存、`state/` 运行后逐字节恢复。详见
  [RELEASE-0.5.0.md](RELEASE-0.5.0.md) §9。

### 3.3 v0.5.1 运行时矩阵（verifier 判定：全部 PASS）

矩阵 run：`diag/skinlab/runs/20261109-115146-v050-v051-multiversion`（exit 0，≈8m40s；稳定副本
`diag/skinlab/evidence/multiversion-v051.json`）。Run provenance：version 0.5.1，product 768,962 字符 /
796,478 字节 / 21 fragments，`gitDirty: []`，HEAD at run = `c437c68`（docs-only，product 提交 `7282d94`）。

| Runtime | v0.4.0 base | v0.5.0 group | v0.5.1 delta | 总计 | 判定 |
|---|---|---|---|---|---|
| 0.2.0-rc.2 | 38/38 | 42/42 | 16/16 | **96/96 PASS** | PASS |
| 0.2.1-rc.5 | 38/38 | 42/42 | 16/16 | **96/96 PASS** | PASS |
| 0.2.2-rc.1 web | 38/38 | 42/42 | 16/16 | **96/96 PASS** | PASS |
| 0.2.2-rc.1 Desktop | 41/41 | 42/42 | 16/16 | **99/99 PASS** | PASS |

- **387/387 断言 PASS；0 failed / 0 skipped / 0 console errors / 0 exceptions（failing ids: none）。**
  delta 组在 skin ≥ 0.5.1 时自动追加，v0.5.0 证据保持可比。
- 版本握手：`_engines?build=0.5.1` → `{build:"0.5.1", stale:false}`（4/4）。
- **C4 天气**：⑨ 内完整块（3 inputs + 9 buttons，含 15/30/60/120 分钟）；默认 `tianlight.weather=null`、
  控件禁用、状态「未启用（关闭时零网络请求）」；整页 reload + 面板渲染的 Network 捕获 **0 external /
  0 `*.open-meteo.com`**（4/4 运行时，64–67 条请求全为 127.0.0.1）。
- **A2 节拍**：markers 随产品发出；loopback off 时 0 driven / 0 冻结样式 / 0 beat hint（presence + idle-clean；
  headless 未真正打开系统音频选择器）。
- **引擎摘要**：zh `缓存 0/1 · 未降档` / en `cache 0/1 · ok`（无 CJK、无长计数器行）；无 web 壁纸时不显示 web 提示。
- **同伴台词**：English 下 aria + 4 个菜单按钮 + 气泡无 CJK（v022 探测时气泡已淡出，菜单/aria/英文文本仍断言；
  其余 3 个运行时断言了可见气泡）。
- **警告 / 日志**：`rheostat:render` 为 0；delta 窗口 0 console errors / 0 exceptions；语言恢复起始值（3× zh、v022 en）。
- **旧宿主 × 新客户端降级（v0.5.1 重跑）**：run
  `diag/skinlab/runs/20261109-120023-v050-degraded-v051degraded-multiversion`（稳定副本
  `diag/skinlab/evidence/multiversion-v051-degraded.json`），**17/17 PASS，0 console error/exception**；
  `stale:true` + 「宿主半待重启 DSH」提示、404 无挂起、模块开关/壁纸正常。
- **证据**：`diag/skinlab/V051-VERDICT.md`、`diag/skinlab/V051-MATRIX.md`；run 内 `matrix.json`、
  `data/version-*.json`、`logs/`、`shots/`（23 PNG/运行时）；`evidence/v051/`（20 张 delta 截图 + 脚本快照）。
- **已接受残余风险**（verifier §6，不阻塞）：天气只验证默认关路径（在线逻辑由 mock 测试覆盖）；A2 未真正激活
  系统音频回环（presence/idle-clean 断言）；v022 同伴气泡探测时已淡出（菜单/aria/文本仍断言）；旧宿主降级只在
  v022 web 重跑；v0.5.0 残余风险仍适用。详见 [RELEASE-0.5.1.md](RELEASE-0.5.1.md) §8.3。

### 3.4 v0.5.2 运行时矩阵（verifier 判定：全部 PASS）

矩阵 run：`diag/skinlab/runs/20261109-125936-v050-v052-multiversion`（exit 0，≈10m40s；稳定副本
`diag/skinlab/evidence/multiversion-v052.json`）。Run provenance：git `fe32f7f` / 798,816 字符 /
829,659 字节 / 21 fragments / tree clean。

| Runtime | v0.4.0 base | v0.5.0 group | v0.5.1 delta | 总计 | 判定 |
|---|---|---|---|---|---|
| 0.2.0-rc.2 | 38/38 | 42/42 | 16/16 | **96/96 PASS** | PASS |
| 0.2.1-rc.5 | 38/38 | 42/42 | 16/16 | **96/96 PASS** | PASS |
| 0.2.2-rc.1 web | 38/38 | 42/42 | 16/16 | **96/96 PASS** | PASS |
| 0.2.2-rc.1 Desktop | 41/41 | 42/42 | 16/16 | **99/99 PASS** | PASS |

- **387/387 断言 PASS；0 failed / 0 skipped / 0 console errors / 0 exceptions**；handshake
  `_engines?build=0.5.2` → `{build:"0.5.2", stale:false}`、错误 build 探针 `stale:true`；Desktop 面板 `top = 40px`。
- **三类用户问题自检**（v0.5.2 判定）：
  - A 混合语言：**7/7 PASS**（zh 面板 0 英文泄漏、en 面板 0 中文泄漏；pre-fix 构建泄漏 7 处，baseline `20261109-123724-baseline-scA3` 仅审计）——`runs/20261109-125548-baseline-v052A-multiversion`；
  - B/B2 布局：**81/81 PASS**（4 视口 × zh+en × 7 分区；无重叠/裁切/横向溢出；字体面板/边缘手柄/双面板）——`runs/20261109-125621-baseline-v052B-multiversion`；Desktop **10/10**——`runs/20261109-130728-baseline-v052Bdesk-multiversion`；
  - C 设置持久化：**10/10 PASS**（写入→宿主 rev21；杀进程重启保留；新浏览器导入；子集宿主 rev74 → 本地键保留、宿主回填 rev75 超集 8 键、`tianlight.backup.host` 写 7 键、status `{host:true,backup:true}`；pre-fix 基线 7/10 复现删除 bug，保留作审计）——`runs/20261109-125428-baseline-v052C2-multiversion`。
  - 旧宿主降级（v0.5.2 client × v0.4.0 host）：**17/17 PASS，0 console error**——`runs/20261109-125849-v050-degraded-v052degraded-multiversion`。
- **i18n-audit**：registered zh=787 / en=787，referenced 619；missing zh/en、only zh/en、en-CJK 均为 **none**
  （allowlist 仅 `lang.zh` 与 `wp.we.label`）。
- **证据**：`diag/skinlab/V052-VERDICT.md`、`diag/skinlab/V052-SELFCHECK.md`；run 内 `matrix.json`、
  `data/version-*.json`、`logs/`、`shots/`（96 PNG = 24/运行时）；`evidence/multiversion-v052.json`、
  `evidence/multiversion-v052-degraded.json`、`evidence/v052/`（57 张 curated 截图 + 脚本快照）。
- **已接受残余风险**（verifier §6，不阻塞）：Desktop preload 契约模拟、headless 视口 1406×803、lab 语言启动态
  不确定、C4 仅验证默认关/A2 回环未真正激活、子集宿主为直接编辑模拟、同伴气泡时序、reduce-motion 冻结环境、
  字体面板仅两个尺寸、frame-cache 清空可丢弃缓存。详见 [RELEASE-0.5.2.md](RELEASE-0.5.2.md) §5.3。

### 3.5 v0.5.3 运行时矩阵（verifier 判定：全部 PASS）

最终构建 `73b378d` / 827,150 字符 / 859,341 字节 / 21 片段；4 个 runtime **分别跑**（隔离 `DSH_HOME`/浏览器 profile），
每个最终 run 的 `matrix.json` 记录 `skinBuild:{version:"0.5.3", productChars:827150, gitCommit:"73b378d…", gitDirty:[]}`。

| Runtime | v0.4.0 base | v0.5.0 group | v0.5.1 delta | 总计 | 判定 | Run（`diag/skinlab/`） |
|---|---|---|---|---|---|---|
| 0.2.0-rc.2 | 38/38 | 42/42 | 16/16 | **96/96 PASS** | PASS | `runs/20261109-184439-v050-v053-v020-multiversion` |
| 0.2.1-rc.5 | 38/38 | 42/42 | 16/16 | **96/96 PASS** | PASS | `runs/20261109-184903-v050-v053-v0215-multiversion` |
| 0.2.2-rc.1 web | 38/38 | 42/42 | 16/16 | **96/96 PASS** | PASS | `runs/20261109-185207-v050-v053-v022-multiversion` |
| 0.2.2-rc.1 Desktop | 41/41 | 42/42 | 16/16 | **99/99 PASS** | PASS | `runs/20261109-185555-v050-v053-vdesk-multiversion` |

- **387/387 断言 PASS；0 failed / 0 skipped / 0 console errors / 0 exceptions**；handshake `_engines build = 0.5.3`、
  `?build=0.5.3` → `{build:"0.5.3", stale:false}`、stale 探针 `stale:true`；Desktop 面板 `top = 40px`。
- 运行方式说明：本机单条 `--all` 曾因用户重启 live DSH 触发 lab-side node boot 超时；lab boot 超时 120s→300s 后
  每个 runtime 干净通过（无产品失败）。v0215 早期一次 94/96 为 lab flake（reload mount race + 产品网络 blip），
  干净重跑 96/96，非回归。
- 矩阵按 `isV053Plus()` 分支更新：v0.5.3 pick 无 WE 编辑器（来源 chip 过滤 + 重开复位契约）；v0.5.1 天气组在
  v0.5.3 上先展开 ⑨ `experimental` 子区、接受「关闭时输入可编辑/动作按钮禁用」新形状；**历史 v0.5.0–v0.5.2 断言保留**。
- **真实鼠标 P1–P5 39/39 PASS**（run `runs/20261109-190045-baseline-v053P-final-multiversion`）：
  P1 picker 真实鼠标 15/15（默认 pick、无可见上传/导入、2 列 4 卡、真实点击切换+toast+使用中移动、高级互切、Alt+W）；
  P2 stale mask 5/5（注入 z-index:1000 全屏 mask 后皮肤 1300/1310/1290/1320 仍可点）；
  P3 语言隔离 8/8（只切皮肤、产品文案/`html lang` 不变、不重载、不被宿主覆盖、跟随 DSH、刷新持久）；
  P4 console 4/4（5s idle 0 warnings/errors、无 adaptive 循环、无 frame-cache 404、无 idle audio）；
  P5 天气/情境 7/7（折叠 experimental 默认关+0 请求、开启后城市「上海」请求并优雅失败、C1/C2 恢复、Restore defaults 生效）。
- **旧宿主 × 新客户端降级 17/17 PASS**（run `runs/20261109-185855-v050-degraded-v053degraded-multiversion`）：
  stale:true + 重启提示、404 无挂起、本地配置模式、面板/开关/播放正常、0 console error。
- **证据**：`diag/skinlab/V053-VERDICT.md`、`diag/skinlab/V053-SELFCHECK.md`；
  `diag/skinlab/evidence/v053/`（`matrices/matrix-v053-*.json`、`selfcheck/matrix-v053-P.json` + `v053-P-facts.json`、
  42 张截图、脚本快照、`live-input-v052/`）。
- **已接受残余风险**（verifier §6，不阻塞）：Desktop preload 契约模拟、headless 1406×803、lab 出网 abort 导致天气
  只验证「请求发起+优雅失败」、pick DOM 仍挂一个不可见 file input（高级路径）、部分 headless 处于 reduce-motion、
  lab boot 较慢（仅调高超时）、冻结副本 `gitDirty=[]` 指产品树。详见 [RELEASE-0.5.3.md](RELEASE-0.5.3.md) §8.6。

### 3.6 v0.6.0 运行时矩阵（WE 集成）

最终构建 `acb17a6` / 896,889 字符 / 930,994 字节 / 22 片段；`BUILD`/`HOST_BUILD` = 0.6.0。

| 检查 | 结果 | 证据 |
|---|---|---|
| 静态链 | ✅ build --check **22/22**、test **67/67**、structure/audit/check-css/verify/i18n-audit 全绿 | 静态链输出 |
| W 自检 v0.2.2 web | ✅ **23/23 PASS**：settings/slots 注册、侧栏按钮、真实 host 预览、真实鼠标点卡应用+toast+使用中、浮层开/关、console clean | `diag/skinlab/runs/20261109-225043-baseline-v060final2-multiversion` |
| W 自检 v0.2.2 Desktop | ✅ **23/23 PASS** | `diag/skinlab/runs/20261109-230039-baseline-v060deskW-multiversion` |
| Host 真实本机 WE | `_wallpapers` 38（本地 3 + WE 35：workshop 16 / project 19；scene 22 / video 7 / web 3 / other 3；11 中文标题）；`_engines.weLibrary={found:true,count:35,root:"d:\\steam\\…"}` + `capabilities.weLibrary`；`/list` 200、`/preview`、`/media` Range 206、`/pkg`、`/web` 可用；跨站 403、遍历 400/403；8/8 workshop scene.pkg 解 4K（33MB→4.4MB，首次 78–1449ms/缓存 23ms）；test 67/67（61+6 WE fixture） | `diag/skinlab/evidence/v060-we/`（`WE-RESULTS.json`、`matrix-v060-we.json`、shots） |
| 4-runtime 全量矩阵 | 见 `diag/skinlab/V060-VERDICT.md`（verifier 最终判定；本表 W 自检为其中已完成部分） | `diag/skinlab/V060-VERDICT.md` |
| 旧宿主 × 新客户端 | 已知边界：WE 路由 404 → WE 页面提示「宿主半需重启/更新」，其它功能正常；**未真机复验** | 见 §2.4 |

## 4. 运行时验证矩阵（v0.4.0，历史实测）

| DSH | 运行方式 | host `_engines.build` | 客户端应用 | host 数（应为 1） | 壁纸面板 | console error/exception |
|---|---|---|---|---|---|---|
| 0.2.0-rc.2 | `dsh web`（npx 运行时） | 0.4.0 | ✅ `body[data-dsh-tianlight]` | 全部 1 | ✅ 全部 3 / 清单 3 张 | 0 / 0 |
| 0.2.1-rc.5 | `dsh web`（npm 运行时） | 0.4.0 | ✅ | 全部 1 | ✅ 全部 3 / 清单 3 张 | 0 / 0 |
| 0.2.2-rc.1 | `dsh web`（npm 运行时） | 0.4.0 | ✅ | 全部 1 | ✅ 全部 3 / 清单 3 张 | 0 / 0 |
| 0.2.2-rc.1 | **DSH Desktop（当前实机）** | 0.3.0→重启后 0.4.0 | ✅（真机截图） | 全部 1 | ✅ 标题栏安全区、无重复玻璃层 | 无目视异常 |
| 0.2.1-rc.3 | Desktop（2026-11-09 升级前） | 0.3.0 | ✅ 14/14 + 34/34 断言 | 全部 1 | ✅ | 0 / 0 |

证据：`diag/skinlab/evidence/compat-v020-rc2-page.png`、`compat-v021-rc5-page.png`、
`compat-v022-rc1-page.png`；逐版本 DOM/features JSON 在 `diag/tmp/multiver/<ver>/check.json`；
0.2.1-rc.3 的完整断言报告见 `diag/skinlab/VERIFY-0.3.0.md`；0.2.2 Desktop 真机截图见
`diag/skinlab/evidence/live-v0*.png`。

## 5. 旧宿主 / 旧版本降级表（v0.5.0 新增）

| 缺失能力 | 依赖它的功能 | 用户看到什么 | 是否影响其它功能 |
|---|---|---|---|
| `_settings`（旧宿主） | E1 宿主设置、E2 迁移结果上报 | ⑦ 显示「宿主不可用，暂用本地存储」；设置仍保存在本浏览器 | 否 |
| `_bundle` / `_import` | D2 导入/导出包 | 入口隐藏；已有壁纸与设置正常 | 否 |
| `_frame-cache` | A5 预裁剪缓存 | 首屏直接实时帧（略慢），无报错 | 否 |
| `_transcode` / 本机无 ffmpeg | A6 可选转码 | 转码按钮隐藏；HEVC/GIF 原文件仍可尝试播放 | 否 |
| `_web-project` | A3 网页壁纸 | WE 清单只显示预览并说明当前宿主不支持 | 否 |
| `/api/we-wallpaper/*`（v0.6.0 第二前缀，旧宿主无） | Wallpaper Engine 库页面/浮层 | 页面显示「宿主半尚未提供壁纸库接口，更新/重启 DSH 后重试」；快捷选择器仍只显示旧来源 | 否（面板/播放/设置正常） |
| `[data-chat-running]` | C2 专注联动 | 联动不触发 | 否 |
| locale 服务 | D7 双语跟随 | 只切插件文案，按浏览器语言兜底 | 否 |
| 浏览器无 `getDisplayMedia` | A1 系统音频回环 | 显示「当前环境不支持」；手动麦克风音频 v1 若已存在则按原路径 | 否 |

## 6. 静态钩子矩阵（`npm run compat`）

v0.4.0 的扫描基线（三份安装 + Desktop asar 全部 `COMPATIBLE`）：

```text
DSH 0.2.0-rc.2    72 bundles   COMPATIBLE   slot + product-data + class-segments
DSH 0.2.1-rc.5    77 bundles   COMPATIBLE   slot + product-data + class-segments
DSH 0.2.2-rc.1    86 bundles   COMPATIBLE   slot + product-data + class-segments
DSH 0.2.2-rc.1 asar（Desktop 实机安装）  COMPATIBLE
```

v0.5.0、v0.5.1、v0.5.2 都没有改动选择器桥与钩子清单（v0.5.1 的 C4 只用标准 `fetch`，不新增宿主路由；
v0.5.2 的数据安全/i18n/面板修复全部在既有片段与既有路由内完成）。v0.5.0 的三条线运行时矩阵已全部 PASS（§3.2），
v0.5.1 也已全部 PASS（§3.3），v0.5.2 同样全部 PASS（§3.4），v0.5.3 同样全部 PASS（§3.5），v0.6.0 的 W 自检与
host 真实本机结果见 §3.6。本次没有新的静态
compat-matrix 输出；如需重新生成，按 §9 运行 `npm run compat` 与 `node tools/hook-scan.mjs --self-check`。
如需重新生成，按 §9 运行 `npm run compat` 与 `node tools/hook-scan.mjs --self-check`。

- `data-slot`、`data-slot="sidebar"`、`data-slot="conversation.input.model"`：三条线都由
  renderer 输出（0.2.2 不再单独发行 `dsh-client-ui-slots` 包，SlotCore 由 renderer 提供，API 相同）。
- 产品 `data-*`：`data-composer-card` / `data-sidebar-collapsed` / `data-trigger-menu` 全版本在；
  `data-message-bubble` 仅 0.2.2 出现（0.2.1.x 由 `_bubble` 段兜底，正是 v0.3.0 已做的"前进兼容"）。
  v0.5.0 的 C2 另外依赖 `[data-chat-running]`，三条线都在，已由 Lead 的钩子核对确认。
- 类名分段：`_sidebarCol` / `_card` / `_trigger(Label/Effort)` / `_bubble` / `_menu` / `_panel`+`_mask`
  全版本存在；0.2.0 与 0.2.2 的壳类名仍是 `hash_name` 形状（如 `Sixlwa_bubble`、`pI_x6G_sidebarCol`），
  0.2.1+ 的包级类名同样是 `hash_name`；桥用"下划线后按段名精确匹配"，两种形状都覆盖，
  且嵌套 wrapper（`cardHead`/`triggerIcon`/`menuAnchor`/0.2.2 的 `bubbleWidth`）会被"最外层"规则排除。
- 客户端契约：`__ModuleLoader__.load({id,factory})`、`__DSH_BOOT__`、react/react-dom/client 静态种子、
  `dsh.client.inject`/`platform` 三条线的解析代码逐字节一致。
- 宿主契约：`webServer` 服务 + `register({kind:'exact'|'prefix', path, handler})`、
  `ctx.get('webServer')` / `ctx.inject(['webServer'])` 在 0.2.0 与 0.2.2 相同；三条线实机路由均 200。
- Slot API：`ctx.inject(['slots'])`、`slots.inject(key, cb)`、`slots.register({name,id,order}, Component)`
  在 0.2.0/0.2.1/0.2.2 相同（0.2.2 的渲染器实现与 0.2.0 同源）。

### 6.1 2026-11-10 三线实测（v1.6.3 实证）

对三份真实安装（npm 缓存 / 本机 diag/versions 目录）重新跑 `tools/compat-matrix.mjs`、`tools/hook-scan.mjs`、
`tools/upgrade-check.mjs`，证据在 `diag/skinlab/evidence/compat-v163/`（`matrix.json` + 每版本各一份
`hookscan-<ver>.log` / `upgrade-check-<ver>.log`）：

| DSH 版本 | bundles | 钩子层 | slot / 产品 data / 类名分段 | 客户端契约 | verdict |
|---|---|---|---|---|---|
| 0.2.0-rc.2 | 72 | slot + product-data + class-segments | 全在（advisory `data-message-bubble` 无 → `_bubble` 兜底） | 11/11 true | **COMPATIBLE** |
| 0.2.1-rc.5 | 77 | slot + product-data + class-segments | 全在（advisory `data-message-bubble` 无 → `_bubble` 兜底） | 11/11 true | **COMPATIBLE** |
| 0.2.2-rc.1 | 86 | slot + product-data + class-segments | 全在（advisory `data-message-bubble` 有 → 前进钩子生效） | 11/11 true | **COMPATIBLE** |

- `hookscan-*.log` 三份结论均为 `all bridge hooks present`；`upgrade-check-*.log` 三份均为 `all upgrade assumptions hold`。
- `matrix.json` 的 `missing` 三行均为空；`data-message-bubble` 仅 0.2.2 出现（与 §6 既有判断一致），由 `_bubble` 段兜底吸收。
- **结论**：三条线共用同一份构建与同一套 CSS，**无需版本 if 分支**——桥按「Slot 契约 → 产品 `data-*` → 类名分段」分层发现（§7），本次实测确认该策略对 0.2.0 / 0.2.1 / 0.2.2 同时成立。

## 7. 适配策略：分层发现，而不是版本分支

`src/65-bridge.js` 在运行时按以下顺序找宿主表面，命中哪层用哪层：

1. **Slot 契约**（最稳）：`data-slot="sidebar"` → 左栏，`data-slot="conversation.input.model"` → 模型胶囊作用域；
2. **产品 `data-*`**：`data-composer-card` → 输入卡，`data-sidebar-collapsed` → 侧栏根，
   `data-trigger-menu` → 浮层菜单，`data-message-bubble`（0.2.2+）→ 消息气泡；
3. **类名分段**：`_sidebarCol` / `_card`+输入控件 / `_trigger*`（仅在模型槽内）/
   `_bubble` / `_menu` / `_panel`+`_mask`（旧设置面板形态）。

规则：**只标记最外层**同类节点、段名精确匹配、设置面板有面积保险。
这样 0.2.0（旧类名、无 0.2.2 气泡钩子）与 0.2.2（新钩子）共用同一份 CSS，0.2.1 不受影响。

**版本差异不需要 if 分支**：Desktop 标题栏安全区是 CSS 条件
（`html[data-windows-titlebar]:not([data-fullscreen])`），Web 模式无该属性 → `top:0`；
`desktopChrome` 只在 `features` 诊断里体现。v0.5.0 / v0.5.1 的模块开关/工程面板同样按注册表渲染，不按版本分支；
v0.5.1 的天气/A2/台词改动都在既有分区与既有控制器内完成，没有新增桥接规则；v0.5.3 的 z-index 抬升、
语言只读、快捷选择重排同样不新增桥接规则。

## 8. 已知差异与限制

| 项 | 影响 | 处置 |
|---|---|---|
| 0.2.2 新增 12 个 `--dsw-*` token（6 个 `illustration-*`、3 个 `static-neutral-bluish-*`、2 个 `static-violet-*`、`state-done-primary`） | 皮肤没有覆盖它们，产品自己的插图/静态色保持不变 | 不覆盖更安全；若未来某插图底色需要透明化，再逐项加 |
| 0.2.2 移除 `--dsw-hovercard-bg`、`--dsw-specific-sidebar-nav-item-hover` | 皮肤对后者的 `!important` 覆盖在 0.2.2 上无效（变量已无人使用） | 无害；保留以兼容 0.2.0/0.2.1 |
| 0.2.0 / 0.2.1 的 **Desktop 壳** | 本机已无这两个 Desktop 安装，无法实机复验标题栏安全区 | 标题栏契约在三条线的 layout/sidebar 包中都存在；Web 模式已验证；需要时按 `:not([data-fullscreen])` 条件在旧 Desktop 上回归 |
| 0.2.2-alpha.2 | 已由静态扫描覆盖（renderer/frontend 哈希与 rc.1 一致） | 以 rc.1 为代表；alpha.3 同理 |
| WebWallGL/网页壁纸场景 | 只做路由/引擎 smoke（本机无 WE 目录） | 更换 DSH 大版本后建议配置一个 WE 工程复验 |
| Desktop 标题栏高度 | 由 preload 写 `--dsh-windows-titlebar-height`（0.2.1/0.2.2 为 40px） | CSS 使用变量而非硬编码 |
| C4 天气联动（v0.5.1） | 默认关；开启且已定位后请求 Open-Meteo 公共接口（免 API key、无账号、无遥测；无 SLA） | 失败静默并保留上次观测；关闭时零请求；与 C1 同时开时最后写入者为准（面板有冲突提示） |
| 设置数据安全（v0.5.2） | 宿主子集/不完整不再清空本地设置；导入前备份 `tianlight.backup.host`（本地键、不参与宿主同步、256KB 上限） | 宿主有的键权威、显式 null 仍删除、本地独有键保留并回推；⑦ 可「恢复宿主导入前备份」 |
| Wallpaper Engine 库（v0.6.0） | 自动检测本机 Steam/WE 库并解码 scene.pkg 4K 静态图；`/api/we-wallpaper/*` 第二前缀；运行状态/缓存在插件 `state/` | 只读本机、不联网；未装 WE 时空态；旧宿主 404 → 重启/更新提示 |
| 场景动态缓存（v0.6.0） | **Windows-only**（wcap + PowerShell）；非 Windows/缺 wcap/显式禁用 → 503 `scene-video-unsupported` + reason | 其它平台只显示高清静态场景，不影响应用；仓库测试跳过捕获 |
| 旧宿主 × 新客户端 WE（v0.6.0） | WE 路由 404 → 页面提示重启/更新，其它功能正常；**未真机复验** | 升级后重启 DSH 一次；旧宿主只保留手动 WE 目录兜底 |
| 皮肤语言解耦（v0.5.3，行为变更） | 显式「中文 / English」只切皮肤文案，不再调用 DSH `locale.setLocale()`；DSH 界面语言由 DSH 设置决定 | 要跟随宿主请选「跟随 DSH」（仍订阅 `locale/change`）；旧用户无需改配置 |
| 情境安全默认（v0.5.3） | C1 时段外观 / C2 专注联动 / C3 性能自适应 / C4 天气默认 OFF；已持久化选择保留 | 需要时在 ⑨ 手动开启；⑨ 有「恢复默认」 |
| 产品残留 modal mask（v0.5.3） | DSH 产品可能留下不可见全屏 mask（`z-index:1000`、`pointer-events:auto`）吞掉真实鼠标点击，键盘仍可用 | 皮肤浮层抬到 1290–1320 并保留键盘路径；仍异常时按 Esc/重启 DSH 清理产品弹窗残留 |
| A1 系统音频 / A6 ffmpeg | 依赖浏览器/系统/本机能力 | 有则用、无则降级并在面板说明，不是安装依赖 |

## 9. 如何复验（换 DSH 版本前先跑）

```powershell
cd "D:\DeepSeek Harness(2)\tianlight"

# 1) 静态：把每一份要支持的 DSH 安装目录都扫一遍（普通目录用 node；app.asar 用 Electron-as-Node）
node tools/compat-matrix.mjs --dsh <dsh>/node_modules/@deepseek-ai --dsh <另一份>/node_modules/@deepseek-ai

# 2) 桥接/契约自检（当前 profile 安装）
node tools/upgrade-check.mjs && node tools/hook-scan.mjs --self-check

# 3) 仓库自检（CI 同款，Node 20/22 均可）
npm run check                      # 静态链（build/test/structure/audit/check-css/verify + i18n-audit）
node tools/agent-check.mjs         # 多工作流并行时的单分片快速检查（构建到 diag/tmp，不碰 lib/client.js）

# 4) 运行时矩阵（隔离实例 + Edge CDP；需要本机有多版本运行时）
node "D:\DeepSeek Harness(2)\diag\skinlab\run.mjs" --scenarios default,panel,close,stamps
```

未来 DSH 0.3.x 出现后的升级流程：
`compat-matrix` 若报 `INCOMPATIBLE` → 只改 `src/65-bridge.js` 的发现选择器（CSS 不动）→
在旧/新两版上各跑一次运行时矩阵 → 更新本文件、`tools/compat.mjs` 里的范围（它会同步到
`package.json` 的 `engines.dsh` + 官方包 `peerDependencies` 与 `skin.json.dshCompatibilityRange`）。
