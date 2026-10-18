# tools/

维护中的工具（README 与 `npm run` 引用）：

| 文件 | 用途 | 需要 DSH |
|---|---|---|
| `build.mjs` | 从 `src/` 片段拼装 `lib/client.js`（`--check` 校验产物不落后） | 否 |
| `test.mjs` | 纯逻辑回归测试（Range 解析、文件名安全、壁纸发现、上传/场景路径策略） | 否 |
| `structure.mjs` | 结构审计：分区顺序、`apply()` 顺序与 try/catch 边界 | 否 |
| `audit.mjs` | 静态审计：变量、监听器、定时器、Hook 顺序 | 否 |
| `check-css.mjs` | 样式结构检查 | 否 |
| `verify.mjs` | 路由/封装/清单契约断言（含上传、场景、引擎拒绝路径） | 否 |
| `upgrade-check.mjs` | DSH 升级后 15 项假设自检 | 是 |
| `resolve-selectors.mjs` | 哈希选择器体检（还在/失效/候选） | 是 |
| `pack.mjs` | 生成可分发目录 | 否 |
| `snapshot.mjs` | 存快照（产物 + 宿主模块 + `src/`）到 `backup/` | 否 |
| `restore.mjs` | 从 `backup/` 回滚（含宿主模块与 `src/`） | 否 |

一次性脚本（开发过程留下，保留作为历史记录，不参与检查链）：

| 文件 | 当时的用途 |
|---|---|
| `install.mjs` / `preflight.mjs` | 首次把皮肤接进 profile |
| `inspect-manager.cjs` / `inspect-switch.cjs` | 排查皮肤管理器的协议 |
| `probe-video.cjs` | 探测视频编码与可播放性 |
| `CatKeyer.cs` | 把白底桌宠图抠成透明 PNG（System.Drawing 泛洪） |
| `repair-encoding.mjs` | 修复一次 PowerShell 回写导致的 UTF-8 损坏 |
| `restore-disabled-rows.mjs` | 恢复被清空的插件行 |
| `rheostat.css` | 推理滑杆早期样式的暂存副本 |

`npm run check` 先跑 `build --check`，再跑第一张表里的静态工具；`npm run upgrade` 跑两个需要 DSH 的检查。

`src/` 是浏览器半的源码：按 region 切分的普通脚本片段（无 import/export），由 `build.mjs` 按显式顺序拼成单文件产物 `lib/client.js`。改代码的流程是：改 `src/` → `npm run build` → `npm run check`。快照用 `npm run snapshot`（产物和 `src/` 一次存齐），`npm run restore` 会一起恢复。
