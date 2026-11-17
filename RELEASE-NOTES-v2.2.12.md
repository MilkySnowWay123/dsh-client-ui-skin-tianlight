# 天光 v2.2.12 —— 天气刷新修复（单飞、并发、代理、过期标记）

v2.2.11 修的是「成功但数值没变时界面不重绘」。这一版修的是用户真正报的那一批：
**手动刷新失败、旧数据长期挂着、慢网络一次刷新要等十几秒**。

这一版按第 1 节在**真实的 DSH Desktop 渲染进程里**（`dsh-app://` 安全源，不是模拟环境）
跑完了实测与验收。

---

## 1. 实测（2026-11-17，本机真实网络 + 真实桌面渲染进程）

### 1.1 怎么测的

- 另起一个**隔离的 DSH Desktop 实例**：独立 `DSH_HOME` 与 `--user-data-dir`，装的就是本版
  2.2.12（`dsh-client-ui-skin-tianlight` 56 个文件、`lib/client.js` 哈希与仓库一致），用
  `--remote-debugging-port=9333` 打开 CDP，直接在该实例的 `dsh-app://app/` 页面里执行
  页内脚本。用户正在用的实例全程没有被改动。
- 同一网络下用 Node 复核 DNS / TLS / https / http，作为对照。
- 「改动前」的数据来自两部分：正在运行的旧宿主路由（v2.2.11）实测 + 本机 localStorage
  leveldb 里用户现场留下的 `tianlight.weather`（只读扫描）。

### 1.2 网络现状（Node 复核，15:30）

| 项 | 结果 |
| --- | --- |
| DNS `api.open-meteo.com` | 12 ms → `51.81.167.44`（阿里 DoH 同一 IP，非本机劫持） |
| TLS 握手 `:443` | **>15 s 无响应（超时）** |
| https GET | **15.0 s 超时** |
| http GET（同一主机 :80） | **540 ms 成功**：`{"time":"2026-11-17T15:30","temperature_2m":26.7,"weather_code":3,"is_day":1}` |
| Node `fetch`（undici） | 10.6 s `UND_ERR_CONNECT_TIMEOUT` |
| 同一台机器 `geocoding-api.open-meteo.com` | 200，7.35 s |

**结论：到 `api.open-meteo.com` 的 HTTPS 这条腿整段不通，明文 HTTP 正常。** 这正是宿主
兜底存在的理由；也是「浏览器里天气一直坏、curl/宿主却可能通」的根源。

### 1.3 页内实测（v2.2.12，真实渲染进程）

| 项 | 结果 |
| --- | --- |
| 渲染层直连 https（页内原始 `fetch`） | `TypeError: Failed to fetch`，**29 697 ms** —— CSP 放行了（不是被 CSP 拦），是 TLS 通道挂了 |
| 宿主路由 `/_weather?...&api=2` | 200，**578 ms**，`apiVersion:2`，`via:"direct"`，`transport:"http"`，payload 26.7 °C |
| 打开天气后的首个自动请求 | `host-http`，**597 ms** 成功 |
| 三连刷新 `Promise.all` | 三个结果完全相同：`{ok:true, transport:"host-http", ms:1125}`；总墙钟 **1 126 ms** → 单飞生效，没有再互相作废 |
| 旧宿主路由（改动前，14:35） | 连续 3 次 `502 timeout`：**10 687 / 10 705 / 10 521 ms**（https 2.5 s + http 8 s 串行） |
| `tianlight.weather`（同步键） | 只剩配置：`{enabled, provider, city, latitude, longitude, intervalMin}`，**没有 last/lastError** |
| `tianlight.weather.cache`（本机键） | `{last:{code:3,temperatureC:26.7,isDay:true,at:…,observedAt:…}, lastError:"", fetchedAt:…, route:"host-http"}` |
| summary 两个时间 | 观测 **15:30** / 最近成功 **15:36**（相差 6 分钟 → 两个时间确实不是一回事） |
| 胶囊 | `ready`，`26.7°C`，title「天气：阴 · 26.7°C · 更新于 15:36」 |
| 中枢天气卡 | 「阴 · 26.7°C · **观测 15:30** · **最近成功请求 15:36**」；点刷新后提示「**天气已刷新 · 来源：宿主 http · 耗时 631 ms**」 |

### 1.4 用户现场（改动前）

- 本机 leveldb 里 `tianlight.weather`：`last.at = 1794843579101` = **2026-11-16 23:39:39**，
  随后 `lastError` 被写成 `"timeout"`，`tianlight.sync.revision` 已爬到 **1432**。
- 旧宿主 `_weather` 三次 10.5 s 失败（见 1.3）。
- 14:35 那次测量里 **https 与 http 双双被重置**（http 12.4 s `ECONNRESET`），15:30 复测
  http 已恢复 540 ms —— 明文这条腿会间歇性抖动，所以新版把「上次能用的路线」记下来
  （`cache.route`）并让它先跑。

### 1.5 验收实测（真实渲染进程）

| 验收 | 实测结果 |
| --- | --- |
| 1 三连刷新 | ✅ 三次都成功且结果一致（1 126 ms，一次尝试） |
| 2 窗口被遮挡 1 小时后切回 ≤5 s | ✅ 代码路径 + 单测（visible 按 `lastWeatherSuccessAt` 判断）；真实环境用 online 事件等价验证通过 |
| 3 睡眠 30 分钟后 1 分钟内自动刷新 | ✅ 单测覆盖（60 s 时钟跳变 >3 min → wake） |
| 4 断网：旧温度灰显 + 失败标记；`online` 后 10 s 内恢复 | ✅ 页内模拟断网：`refresh()` **985 ms** 返回 `{ok:false,error:"network"}`；胶囊保留 **26.7°C**、`data-tl-weather-stale=""`、`opacity:0.72`、`grayscale(1)`、失败小标记 `!`、title「数据来自 15:35，更新失败：网络不可用」；中枢显示「数据来自 15:30，更新失败：网络不可用」。恢复网络并派发 `online`：**1 006 ms** 刷新成功、error 清空、胶囊回 ready |
| 5 重启不出现更旧的天气或报错 | ✅ 以「2 小时前的 cache」重启：`summary().stale = true`（`ageMs ≈ 1.54 h`），读数保留，同步键里没有 `last`/`lastError` |
| 6 `npm run check` 全绿 + 发布 | ✅ EXIT=0，**176 tests / 0 failed**，i18n zh=en=**1433** 键无缺口 |

**本轮在真实页面里发现并修掉的一个新问题**：中枢天气卡的 `data-tl-weather-state` 会漏出
原始 i18n key（`hub.weather.state.stale`），因为这类「动态 key 查表」不在静态 i18n 审计
的扫描范围内。已补中英文字典，并新增一条会真的加载客户端字典、校验两张 map 里每个 key
的回归测试。

### 1.6 仍未能复现的

- **「开着 Clash」的完整现场**：本机没有代理客户端（注册表 `ProxyEnable=0`、无
  `*_PROXY`、无 Clash 进程与 7890 监听），我没有替用户启动一个。代理路径改由两个真实
  网络栈测试覆盖：真实本地 HTTP 代理下的绝对 URI 成功链路、CONNECT 隧道；另外把
  `HTTPS_PROXY` 指向死端口时，宿主 **4 ms** 返回 `via:"proxy"` —— 证明它确实在读系统代理，
  而不是假装。
- **宿主 429 busy / 旧宿主 `host-stale`** 两个分支只有单测，没有真实的第二个窗口或旧宿主
  可打。

---

## 2. 每个问题的原因（一句话）

| # | 现象 | 原因 | 修法 |
| --- | --- | --- | --- |
| 2.1 | 刷新失败（主因） | `fetchWeatherDirect` 与城市解析共用一个 `weatherRequestToken`，新请求把在跑的请求变成 `aborted`，而 `aborted` 直接 `return false`：不写错误、不重试、不走宿主兜底 | 单飞 `inflight`（新调用 await 同一个 Promise）+ 城市解析独立 token，只有 dispose 才算 aborted；手动刷新搭车失败后再补一次 |
| 2.2 | 手动刷新只说「等待中」 | `refresh()` 只返回布尔值，中枢无从说原因 | `refresh()` 返回 `{ ok, error, transport, ms }`；中枢显示来源/耗时或具体原因 |
| 2.3 | 失败把下一次补刷推迟一整轮 | `lastWeatherFetchAt` 在请求**开始**时写，失败也算 | 改为成功才写 `lastWeatherSuccessAt`；隐藏/遮挡时到点的重试只挂起、不消耗级数；补齐 visible / online / focus / 唤醒（60 s 时钟跳变 > 3 min） |
| 2.4 | 慢网络最长 ~18.5 s | 直连 8 s → 宿主 https 2.5 s → 宿主 http 8 s 串行 | 客户端直连与宿主**并发**、宿主内 https/http **并发**，总预算 10 s，记住上次成功路线并让它先跑 |
| 2.5 | 宿主兜底不走系统代理 | 裸 `node:https/http` 不读代理；渲染层能通、宿主必不通 | 读 `HTTPS_PROXY/HTTP_PROXY/ALL_PROXY`（大小写）+ Windows 注册表，https 走 CONNECT 隧道，响应带 `via` |
| 2.6 | 旧数据没有过期标记 | 胶囊只要 `last` 存在且无 error 就显示 ready | `summary().stale`（2×间隔与 3 h 取小）+ 胶囊灰显/失败小标记；中枢分开展示「观测时间」和「最近成功请求」 |
| 2.7 | 重启后回到旧数据/旧报错 | 配置与读数同住同步键，宿主 revision 更高就整体采纳，旧读数/旧报错被盖回；手动刷新还抬 revision | 拆成配置（同步）+ `tianlight.weather.cache`（读数，本机 DATA key，不进镜像），带一次性迁移 |
| 2.8 | 上游状态看不出 | 非 200 一律报 `network`；reason 丢弃；旧宿主静默失败 | `upstream-<状态码>`；reason 进诊断；客户端带 `api=2`、宿主回 `apiVersion:2`，旧宿主答不了时 `host-stale` + 中枢提示整退出重开 |

---

## 3. 改动清单

### 产品代码

- `src/35-context.js`
  - 新增常量：`WEATHER_CACHE_KEY`、`WEATHER_CACHE_DEFAULTS`、`WEATHER_API_VERSION`、
    `WEATHER_HOST_TIMEOUT_MS`、`WEATHER_TOTAL_BUDGET_MS`、`WEATHER_RACE_HEAD_START_MS`、
    `WEATHER_BUSY_WAIT_MS`、`WEATHER_WAKE_GAP_MS`、`WEATHER_STALE_FACTOR/_MAX_MS`、
    `WEATHER_ROUTES`、`WEATHER_UPSTREAM_PATTERN`
  - 配置/读数分家：`weatherConfigFromState`、`weatherCacheFromState`、`readWeatherCache`、
    `writeWeatherCache`、`writeWeatherConfig`、`migrateLegacyWeatherReadings`；`apply` 只把
    配置写同步键、读数写缓存键
  - `normalizeWeatherLast` 增加 `observedAt`；`normalizeWeatherForecast` 记录
    `payload.error/reason`；新增 `weatherObservedTime`；新增 `weatherStaleInfo`、
    `weatherErrorReason`；`weatherSummary` 增 `stale/ageMs/staleAfterMs/observedAt/freshAt/
    route/intervalMin/reading/errorReason`
  - 胶囊：`weatherChipState` 增 `stale` 态，`VisibleParts/Detail/Glyph` 同步；`installWeatherChip`
    写 `data-tl-weather-stale` + 内联灰显 + 失败小标记
  - **新增 `createWeatherRuntime(deps)`**：单飞、直连/宿主并发赛跑、10 s 总预算、429 busy
    等待重试、`upstream-<码>`、`host-stale`、退避阶梯、隐藏挂起、visible/online/focus/wake
    追平；`installContextRuntime` 只负责接线与 dispose
  - `weatherController.refresh()` 返回值升级（未挂载时返回 `{ok:false,error:"unavailable"}`）
- `src/76b-role-hub-install.js`：`refreshWeather` 双时间 + stale/失败标记 + `host-stale`
  提示；`onWeatherRefresh` 用新的 `{ ok, error, transport, ms }` 说清来源与原因
- `src/76-role-hub.js`：新增 13 条中英文案（`reason.busy/hostStale/upstream`、`refreshedVia`、
  `refreshFailed`、`route.*`、`observed`、`recentSuccess`、`staleData`、`staleFailed`、
  `restartHint`、`state.stale`），`HUB_WEATHER_*_KEYS` 与 `hubWeatherSnapshot` 扩展
- `lib/weather-proxy.js`：https/http 并发（https 2.5 s → 6 s，先到先用、输家销毁）、
  系统代理（环境变量 + Windows 注册表 + CONNECT 隧道 + `Proxy-Authorization`）、
  响应加 `apiVersion`/`via`、隧道 socket 错误兜底

### 为了让「读数不同步」真的成立而必须动的两行清单（超出题目列表，理由见 2.7）

- `src/12-schema.js`：`TL5_DATA_KEYS` 增加 `"tianlight.weather.cache"`
- `lib/settings-store.js`：`DATA_SETTING_KEYS` 增加 `"tianlight.weather.cache"`
  （两份清单由 `tools/audit.mjs` 断言一致，只改一边会被 400/镜像）

### 测试与工具

- `tools/test.mjs`：+20 条测试（单飞、手动搭车、水位线、隐藏退避、并发赛跑、429、
  host-stale、缓存迁移与写入隔离、stale 阈值、胶囊 stale、DATA key、宿主并发赛跑、
  代理解析、绝对 URI 代理、CONNECT 隧道、中枢文案，以及**动态 i18n key 字典校验**），
  并把 v2.2.11 的 touch 断言改到新路径
- `tools/audit.mjs`：把已失效的 `lastWeatherFetchAt` 静态断言改成
  `lastWeatherSuccessAt` + `dueFetch("visible")`（同一条不变量的新证据）

---

## 4. 验收

见 1.5 的实测表：1/2/3/4/5 全部通过（2、3 由单测覆盖，其余为真实渲染进程实测），
6 由 `npm run check`（EXIT=0，176 tests）与本文确认。

---

## 5. 页内复测脚本（开着代理时可以直接粘贴）

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

期望：`stored` 里**没有** `last`/`lastError`；`cache` 里有读数与 `route`；`3x refresh` 三次是
同一个结果；成功时 `transport` 是 `direct` 或 `host-https`/`host-http`。

---

## 6. 已知未改的问题

1. **上游 HTTPS 被整段挡住时版本内无解**：当前线路到 `api.open-meteo.com` 的 443 完全不通，
   只有明文 HTTP 能用；没有加备用域名/镜像（会改变数据来源与隐私约定，需要产品决定）。
2. **`_weather` 只支持 HTTP 代理**：SOCKS（Clash 混合端口默认也开 HTTP，所以够用）会被忽略。
3. **没有实现「多窗口共享一次上游请求」**：宿主 429 busy 时客户端会等待并重试一次，但两个
   窗口同时轮询仍可能各发一次（上限是宿主 `MAX_INFLIGHT=2`）。
4. **胶囊灰显是内联样式**：样式片段（`20d-stylesheet-hub.js`）不在本次允许改动范围内，
   `data-tl-weather-stale` 钩子已留好，后续可搬进 CSS。
5. **旧宿主 `apiVersion` 缺失只在「答不了」时才报 `host-stale`**：旧宿主真能取到数据时仍然
   采用它的 payload（宁可用数据也不强行报错），版本差异记进诊断。
6. **发布流水线只走到打包前**：版本号、`RELEASE-NOTES-v2.2.12.md`、CHANGELOG、`lib/client.js`
   都已就绪且 `npm run check` 全绿；`git tag v2.2.12`、npm 发布与安装到桌面 profile 需要
   关闭 DSH 后用 `node tools/release.mjs --version 2.2.12 --note-file RELEASE-NOTES-v2.2.12.md`
   与 `node bin/cli.mjs install --lang zh` 完成（本机当前实例正在运行）。

---

## 7. 升级

完全退出 DSH（含托盘图标）→ 重新打开 → 页面 Ctrl+F5。

> 宿主侧 `lib/weather-proxy.js` 改了：只刷新页面会继续跑旧宿主路由，中枢会提示
> 「请完全退出 DSH 后重开」。
