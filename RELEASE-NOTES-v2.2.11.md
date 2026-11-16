# 天光 v2.2.11

修复「天气不会变成实时新信息」的显示 bug。天气请求本身一直是正常发出的。

## 原因

真实配置（肇庆市 23.1083, 112.4912）：

- `tianlight.weather` 中 `enabled=true`、`lastError=""`；
- 最近成功时间 `2026-11-16 19:17:24`；
- Open-Meteo 同时返回 `temperature_2m=22.6`、`weather_code=53`，与本地记录一致。

问题不在网络，而在客户端刷新路径：

1. 自动轮询（interval / 切回可见）成功；
2. 返回的 code、温度、isDay 与上一次完全相同；
3. 旧代码把 `weatherFreshAt` 更新为当前时间，然后直接 `return true`；
4. 它既没有调用 `weatherController.apply()`（为了不写同步快照、不抬高宿主 revision），也没有调用任何通知；
5. 天气胶囊/角色中枢订阅不到变化，只能继续显示旧的「更新于 19:17」；
6. 只有数值真的变了，或用户点「立即刷新」走 `source === "manual"` 分支时，界面才会更新。

所以看起来像「天气不动了」，实际是**成功但数值未变时的 UI 通知缺失**。

## 修复

- `weatherController.touch()`：只调用 `weatherNotify()`，不写 localStorage / 宿主设置、不抬高 revision。
- 自动轮询命中 `unchanged` 分支时调用 `touch()`，再更新氛围。
- 胶囊和中枢继续通过订阅取 `summary().updatedAt`，该字段本来就是 `max(last.at, weatherFreshAt)`，现在会真正刷新。
- 手动刷新行为不变，仍然写快照。

## 说明：为什么天气数值可能不变

Open-Meteo 的 `current` 数据大约 15 分钟一档；轮询间隔可选 15 / 30 / 60 / 120 分钟。如果连续两次取到同一个 code 和温度，界面温度不变是正常的，但「更新于」现在会显示最近一次成功请求时间。想更快看到变化，可在角色中枢把轮询间隔改为 15 分钟并点「立即刷新」。

## 验证

- `npm run check`：156 tests / 0 failed（新增 weather touch 回归断言）。
- 构建、CSS/audit/verify/i18n 全通过。
- 本轮不改壁纸、玻璃、布局、权限或天气接口。

## 升级

完全退出 DSH（含托盘图标）→ 重新打开 → 页面 Ctrl+F5。
