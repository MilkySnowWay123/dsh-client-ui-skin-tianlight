# 天光 v2.2.12 —— 天气刷新修复（单飞、并发、代理、过期标记）

v2.2.11 修的是「成功但数值没变时界面不重绘」。这一版修的是用户真正报的那一批：
**手动刷新失败、旧数据长期挂着、慢网络一次刷新要等十几秒**。所有结论都先按第 1 节
实测，再改代码。

---

## 1. 实测（2026-11-17，本机真实网络）

### 1.1 怎么测的

这台机器上我拿不到 DevTools 会话（DSH 桌面版没有开调试端口，只有 Web GUI 的
`127.0.0.1:63029`），所以在页内跑 JS 的那一段改成了三条可复现的等价测量，全部是
真实网络、真实宿主进程、真实 localStorage：

1. **宿主兜底**：直接请求正在运行的 DSH 宿主路由
   `GET http://127.0.0.1:63029/skin-tianlight/_weather?latitude=23.1083&longitude=112.4912`。
   这是 v2.2.11 正在跑的宿主代码（插件更新后宿主路由要重启 DSH 才会换）。
2. **渲染层直连**：用 Node 的 TLS/HTTP 栈对 `api.open-meteo.com` 做同一请求，记录
   DNS、TLS 握手、https GET、http GET、undici fetch 的耗时与错误码。
3. **本地已存数据**：只读扫描
   `%APPDATA%\@deepseek-ai\dsh-desktop\Local Storage\leveldb`，取出当前
   `tianlight.weather` 的真实值（不写、不改）。

### 1.2 结果

| 测量 | 结果 |
| --- | --- |
| DNS `api.open-meteo.com` | 11–14 ms → `51.81.167.44`（阿里 DoH 返回同一 IP，不是本机劫持） |
| TLS 握手 `:443` | **>15 s 无响应**（超时） |
| https GET（明文对比） | 11.3 s 后 `ECONNRESET` |
| http GET（`api.open-meteo.com:80`） | 12.4 s 后 `ECONNRESET` |
| Node `fetch`（undici） | 10.6 s 后 `UND_ERR_CONNECT_TIMEOUT` |
| 正在跑宿主路由 `_weather`（v2.2.11） | **连续 3 次：`502 {"ok":false,"error":"timeout"}`，分别 10 687 / 10 705 / 10 521 ms** |
| 同一台机器 `geocoding-api.open-meteo.com` | **200，7.1 s**（能解析城市，因此「城市能解析、天气不动」可复现） |
| 系统代理 | 未启用：注册表 `ProxyEnable=0`、无 `HTTPS_PROXY/HTTP_PROXY/ALL_PROXY`、无 Clash 进程与 7890 端口监听 |
| 本地 `tianlight.weather` | `last.at = 1794843579101` = **2026-11-16 23:39:39 (+08)**，`lastError` 之后被写成 `"timeout"`；`tianlight.sync.revision` 已爬到 **1432** |

宿主 10.5 s 的构成正好是 v2.2.11 的串行预算：https 2.5 s 被掐掉 + http 8 s 超时。

### 1.3 改完之后同样的测量（新宿主路由，同一网络）

| 测量 | 结果 |
| --- | --- |
| 新 `_weather`（https 6 s / http 8 s 并发） | 连续 3 次 `502 {"ok":false,"apiVersion":2,"via":"direct","error":"timeout"}`，**8 057 / 8 006 / 8 004 ms**（不再是 10.5 s，且两个上游是并发的，不是相加） |
| 指向死端口的 `HTTPS_PROXY` | **4 ms** `502 {"ok":false,"apiVersion":2,"via":"proxy","error":"network"}` —— 证明宿主真的在读系统代理，而不是假装 |

### 1.4 必须说清的边界

- **这台机器现在任何一条路都到不了 `api.open-meteo.com`**（TLS 握手直接无响应，https、
  http 双双被重置），所以第 4 节验收里「三连刷新返回成功」在当前网络下**不可能**发生；
  新版能在 8 s 内给出明确原因（`timeout` / `host-stale`），不再用 `false` +「等待中」糊过去。
- **「开着 Clash」那一半没能在真机上复现**：本机没有装代理客户端（上面已列证据），我不会
  替用户打开一个。代理路径改用了两个可复现的替代验证：真实本地 HTTP 代理下的完整成功
  链路（含绝对 URI 与 `via:"proxy"`），以及不动 TLS 握手的 CONNECT 隧道管线测试。用户
  开着代理时的行为由这两条测试 + 下面这条命令自证：

  ```powershell
  # Clash 运行中：应看到 via:"proxy"（或者 proxy 失败时 4ms 级的 network，而不是 10s 的 timeout）
  Probe-NetConnection 127.0.0.1 7890
  ```

- 页内那段 console 脚本仍然留在第 5 节，用户在开着代理的机器上可以直接跑，`refresh()`
  现在返回的是 `{ ok, error, transport, ms }`。

---

## 2. 每个问题的原因（一句话）

| # | 现象 | 原因 | 修法 |
| --- | --- | --- | --- |
| 2.1 | 刷新失败（主因） | `fetchWeatherDirect` 与城市解析共用一个 `weatherRequestToken`，新请求把在跑的请求变成 `aborted`，而 `aborted` 直接 `return false`：不写错误、不重试、不走宿主兜底 | 单飞 `inflight`（新调用 await 同一个 Promise）+ 城市解析独立 token，只有 dispose 才算 aborted；手动刷新搭车失败后再补一次 |
| 2.2 | 手动刷新只说「等待中」 | `refresh()` 只返回布尔值，中枢无从说原因 | `refresh()` 返回 `{ ok, error, transport, ms }`；中枢显示来源/耗时或具体原因（超时/不可达/宿主忙/上游状态码） |
| 2.3 | 失败把下一次补刷推迟一整轮 | `lastWeatherFetchAt` 在请求**开始**时写，失败也算 | 改为成功才写 `lastWeatherSuccessAt`；隐藏/遮挡时到点的重试只挂起、不消耗退避级数；补齐 visible / online / focus / 唤醒（60 s 时钟跳变 > 3 min）四条追平 |
| 2.4 | 慢网络最长 ~18.5 s | 直连 8 s → 宿主 https 2.5 s → 宿主 http 8 s 串行；`weatherDirectBlocked` 只在本页有效 | 客户端直连与宿主**并发**、宿主内 https/http **并发**，总预算 10 s，记住上次成功路线（cache.route）并让它先跑 |
| 2.5 | 宿主兜底不走系统代理 | `lib/weather-proxy.js` 用裸 `node:https/http`，不读代理；渲染层走系统代理能通、宿主必不通 | 读 `HTTPS_PROXY/HTTP_PROXY/ALL_PROXY`（大小写），Windows 再读注册表 `ProxyEnable/ProxyServer`；https 走 CONNECT 隧道，响应带 `via` |
| 2.6 | 旧数据没有过期标记 | 胶囊只要 `last` 存在且无 error 就显示 ready，昨天的温度看起来像实时 | `summary().stale`（2×间隔与 3 h 取小）；胶囊灰显 + 失败小标记；中枢分开展示「观测时间」和「最近成功请求」 |
| 2.7 | 重启后回到旧数据/旧报错 | 配置与读数同住同步键 `tianlight.weather`，宿主 revision 更高就整体采纳，旧 `last`/`lastError` 被盖回来；手动刷新还抬 revision | 拆成配置（同步）+ `tianlight.weather.cache`（读数，本机 DATA key，不进镜像），带一次性迁移 |
| 2.8 | 上游状态看不出 | 非 200 一律报 `network`；`payload.error` 的 reason 丢弃；宿主旧路由静默失败 | `upstream-<状态码>`；reason 进诊断；客户端带 `api=2`、宿主回 `apiVersion: 2`，旧宿主答不了时 `host-stale` + 中枢提示整退出重开 |

---

## 3. 改动清单

### 产品代码

- `src/35-context.js`
  - 新增 `WEATHER_CACHE_KEY`、`WEATHER_CACHE_DEFAULTS`、`WEATHER_API_VERSION`、
    `WEATHER_HOST_TIMEOUT_MS`、`WEATHER_TOTAL_BUDGET_MS`、`WEATHER_RACE_HEAD_START_MS`、
    `WEATHER_BUSY_WAIT_MS`、`WEATHER_WAKE_GAP_MS`、`WEATHER_STALE_FACTOR/_MAX_MS`、
    `WEATHER_ROUTES`、`WEATHER_UPSTREAM_PATTERN`
  - 配置/读数分家：`weatherConfigFromState`、`weatherCacheFromState`、`readWeatherCache`、
    `writeWeatherCache`、`writeWeatherConfig`、`migrateLegacyWeatherReadings`；
    `weatherController.apply` 只把配置写同步键、读数写缓存键
  - `normalizeWeatherLast` 增加 `observedAt`；`normalizeWeatherForecast` 记录
    `payload.error/reason`；新增 `weatherObservedTime`（解析 `current.time`）
  - 新增 `weatherStaleInfo`（纯函数）、`weatherErrorReason`；`weatherSummary` 增加
    `stale/ageMs/staleAfterMs/observedAt/freshAt/route/intervalMin/reading/errorReason`
  - 胶囊：`weatherChipState` 增加 `stale` 态、`weatherChipVisibleParts/Detail/Glyph`
    同步支持；`installWeatherChip` 写 `data-tl-weather-stale` + 内联灰显 + 失败小标记
  - **新增 `createWeatherRuntime(deps)`**：单飞、直连/宿主并发赛跑、10 s 总预算、
    429 busy 等待重试、`upstream-<码>`、`host-stale`、退避阶梯、隐藏挂起、
    visible/online/focus/wake 追平；`installContextRuntime` 只负责接线与 dispose
  - `weatherController.refresh()` 返回值升级（`weatherRuntime` 未挂载时返回
    `{ ok:false, error:"unavailable" }`）
- `src/76b-role-hub-install.js`：`refreshWeather` 双时间 + stale/失败标记 + `host-stale`
  提示；`onWeatherRefresh` 用新的 `{ ok, error, transport, ms }` 说清来源与原因
- `src/76-role-hub.js`：新增 12 条中英文案（`hub.weather.reason.busy/hostStale/upstream`、
  `refreshedVia`、`refreshFailed`、`route.*`、`observed`、`recentSuccess`、`staleData`、
  `staleFailed`、`restartHint`、`state.stale`），`HUB_WEATHER_STATE_KEYS/REASON_KEYS`
  与 `hubWeatherSnapshot` 扩展
- `lib/weather-proxy.js`：https/http 并发（https 预算 2.5 s → 6 s，先到先用、输家销毁）、
  系统代理（环境变量 + Windows 注册表、CONNECT 隧道、`Proxy-Authorization`）、
  响应加 `apiVersion`/`via`、隧道 socket 错误兜底

### 为了让「读数不同步」真的成立而必须动的两行清单（超出题目列表，理由见 2.7）

- `src/12-schema.js`：`TL5_DATA_KEYS` 增加 `"tianlight.weather.cache"`
- `lib/settings-store.js`：`DATA_SETTING_KEYS` 增加 `"tianlight.weather.cache"`
  （两份清单由 `tools/audit.mjs` 断言一致，不同步改会 400/被镜像）

### 测试与工具

- `tools/test.mjs`：+17 条断言（单飞、手动搭车、水位线、隐藏退避、并发赛跑、429、
  host-stale、缓存迁移与写入隔离、stale 阈值、胶囊 stale、DATA key、宿主并发赛跑、
  代理解析、绝对 URI 代理、CONNECT 隧道、中枢文案），并把 v2.2.11 的 touch 断言改到新路径
- `tools/audit.mjs`：把已失效的 `lastWeatherFetchAt` 静态断言改成
  `lastWeatherSuccessAt` + `dueFetch("visible")`（同一条不变量的新证据）

---

## 4. 验收

| # | 验收项 | 状态 |
| --- | --- | --- |
| 1 | 三连刷新都返回成功或**明确的失败原因** | ✅ 自动化：3 个并发 `refresh()` 只发一次尝试、结果一致；失败给出 `timeout/network/upstream-429/busy/host-stale`。⚠️ 本机网络下三条路都不通，真机只能是明确失败（8 s） |
| 2 | 被遮挡 1 小时后切回，5 秒内「最近成功请求」更新 | ✅ 代码路径 + 单测（visible 追平）；⚠️ 本机无可用上游，切回后 8 s 内给出失败原因，无法看到"更新成功" |
| 3 | 睡眠 30 分钟唤醒后 1 分钟内自动刷新 | ✅ 60 s 时钟跳变 > 3 min → wake → 过期即刷（单测覆盖）；同样受上游不可达限制 |
| 4 | 断网显示旧温度（灰显）+ 失败标记；`online` 后 10 秒内刷新 | ✅ 单测：`lastError` 存在时 `online` 立即请求；stale 胶囊保留温度。⚠️ 同上 |
| 5 | 重启 DSH 不出现更旧的天气/报错 | ✅ 单测：读数只在本机 cache，宿主 map 采纳不会覆盖；迁移把旧读数搬进 cache 并清同步键 |
| 6 | `npm run check` 全绿，发布 2.2.12 + 发布说明 | ✅ `npm run check` EXIT=0（175 tests / 0 failed，i18n 1432 键全对），本文即发布说明 |

---

## 5. 页内复测脚本（开着代理时用）

```js
const LAT = 23.1083, LON = 112.4912;
console.log('summary', tianlightWeather.summary());
console.log('stored', JSON.parse(localStorage.getItem('tianlight.weather')));
console.log('cache', JSON.parse(localStorage.getItem('tianlight.weather.cache')));
const t0 = performance.now();
fetch(`https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=temperature_2m,weather_code,is_day&timezone=auto`, { cache: 'no-store' })
  .then(r => r.json()).then(j => console.log('direct ok', Math.round(performance.now() - t0), 'ms', j.current))
  .catch(e => console.log('direct FAIL', Math.round(performance.now() - t0), 'ms', e));
const t1 = performance.now();
fetch(`/skin-tianlight/_weather?latitude=${LAT}&longitude=${LON}&api=2`, { cache: 'no-store' })
  .then(r => r.json()).then(j => console.log('host', Math.round(performance.now() - t1), 'ms', j.apiVersion, j.via, j.transport, j.error, j.payload?.current));
Promise.all([tianlightWeather.refresh(), tianlightWeather.refresh(), tianlightWeather.refresh()]).then(r => console.log('3x refresh', r));
```

期望：`stored` 里**没有** `last`/`lastError`；`cache` 里有读数与 `route`；`3x refresh`
三次是同一个结果；成功时 `transport` 是 `direct` 或 `host-https`/`host-http`。

---

## 6. 已知未改的问题

1. **上游本身被网络挡住时无解**：`api.open-meteo.com` 的 IP 在当前线路被重置，只有代理能救。
   版本内没有加备用域名/镜像（会改变数据来源与隐私约定，需要产品决定）。
2. **`_weather` 只支持 HTTP 代理**：SOCKS（Clash 的混合端口默认也开 HTTP，所以够用）会被
   忽略；需要 SOCKS 得再加一层实现。
3. **没有实现「多窗口共享一次上游请求」**：宿主 429 busy 时客户端会等待并重试一次，但两个
   窗口同时轮询仍可能各发一次（上限是宿主 `MAX_INFLIGHT=2`）。
4. **`weather.chip` 的灰显是内联样式**：样式片段（`20d-stylesheet-hub.js`）不在本次允许
   改动范围内，`data-tl-weather-stale` 已留好钩子，后续可搬进 CSS。
5. **旧宿主的 `apiVersion` 缺失只在"答不了"时才报 `host-stale`**：旧宿主真能取到数据时仍然
   采用它的 payload（宁可用数据也不强行报错），版本差异记进诊断。
6. **`lib/client.js` 与 `README` 的发布文案**由 `tools/release.mjs` 维护；本次按你的清单
   手改版本号并重建，`git commit/tag/npm publish` 未执行（需要你的凭据与决定）。

---

## 7. 升级

完全退出 DSH（含托盘图标）→ 重新打开 → 页面 Ctrl+F5。

> 宿主侧 `lib/weather-proxy.js` 改了：只刷新页面会继续跑旧宿主路由，中枢会提示
> 「请完全退出 DSH 后重开」。
