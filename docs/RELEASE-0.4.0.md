# v0.4.0 · 同时适配 DSH 0.2.0 / 0.2.1 / 0.2.2

> 版本：`0.4.0`（宿主 build `0.4.0`，`skin.json` → `dshCompatibility: "0.2.2rc1"`，
> `dshCompatibilityRange: ">=0.2.0-rc.1 <0.3.0"`）
> 目标：一份构建同时支持 DSH 0.2.0、0.2.1、0.2.2 三条运行时线，不加版本分支、不写构建哈希。
> 详细矩阵与复验命令：[docs/COMPATIBILITY.md](COMPATIBILITY.md)

## 1. 结论：桥接本身已经跨版本，v0.4.0 补的是"可证明"与"可诊断"

v0.3.0 的选择器桥（`src/65-bridge.js`）已经是"Slot 契约 → 产品 `data-*` → 类名分段名"的分层发现，
恰好覆盖 0.2.0/0.2.1/0.2.2 的 DOM 差异，因此**桥接、滑杆/字体槽位、单例清理、宿主路由四个核心
模块无需改代码**。v0.4.0 把"应该兼容"变成"每一版都实测过、错误可自查"：

- 三条线真实运行时（`dsh web`）逐个启动并加载皮肤：客户端应用、host 单例、面板/壁纸库、
  0 console error；Desktop 实机（0.2.2-rc.1）真机截图复验。
- 新增 `tools/compat-matrix.mjs`：一次扫描任意多份 DSH 安装，输出每版的钩子层、
  契约与 `COMPATIBLE / INCOMPATIBLE` 判定；已对 0.2.0-rc.2、0.2.1-rc.5、0.2.2-rc.1
  及 Desktop 的 app.asar 全部 PASS。
- 新增运行时诊断：`globalThis.__dshTianlightInstance.features`（懒计算）报告当前 DSH
  实际渲染了哪层钩子（slotMarkers / modelSlot / composerCard / sidebarCollapsed /
  messageBubble / classNaming / desktopChrome），以后"某版本上皮肤样式不生效"可以一条
  控制台命令定位到缺失的钩子层。
- `skin.json` 增加 `dshCompatibilityRange` + `dshCompatibilityTested`（skin-manager 只读
  `dshCompatibility` 单串并安全忽略未知字段，因此管理器 UI 不受影响）。

## 2. 各版本的行为差异（都不需要 if 分支）

| 差异 | 0.2.0 | 0.2.1 | 0.2.2 | 皮肤的处理 |
|---|---|---|---|---|
| `data-slot` 槽位标记 | 有 | 有 | 有 | 首选层：左栏 + 模型槽作用域 |
| `data-message-bubble` | 无 | 无 | 有 | 0.2.0/0.2.1 用 `_bubble` 段兜底 |
| `data-sidebar-collapsed` | Web 无 | Desktop 有 | Web 无 | 左栏透明由 `_sidebarCol`/slot 兜底；根透明有无都不影响目视 |
| 类名形状 | `hash_name` | `hash_name` | `hash_name`（壳） | 桥按下划线分段名匹配，两种形状都覆盖 |
| 桌面标题栏契约 | 有（layout 包引用） | 有 | 有 | CSS 条件 `html[data-windows-titlebar]:not([data-fullscreen])` |
| 新增/移除主题 token | — | — | +12 / -2 | 不覆盖新 token（产品自绘）；旧 token 覆盖在 0.2.2 上无害 |
| `dsh-client-ui-slots` 包 | 独立 | 独立 | 并入 renderer | 桥按服务名 `slots` 使用，不依赖包名 |

## 3. 验证记录

| 检查 | 结果 |
|---|---|
| `node tools/compat-matrix.mjs`（0.2.0-rc.2 / 0.2.1-rc.5 / 0.2.2-rc.1） | 3/3 **COMPATIBLE** |
| `node tools/compat-matrix.mjs`（Desktop app.asar，Electron-as-Node） | **COMPATIBLE**（0.2.2-rc.1） |
| 真实运行时 CDP（0.2.0-rc.2 / 0.2.1-rc.5 / 0.2.2-rc.1） | 客户端应用 ✅；host 各 1；面板「全部 3 / 清单 3 张」；0 error / 0 exception |
| `npm run check`（build/test/structure/audit/check-css/verify） | 全 PASS |
| `upgrade-check` + `hook-scan --self-check` | 全 PASS |
| Desktop 0.2.2-rc.1 真机 Ctrl+F5 | 皮肤完整；面板在标题栏下方；壁纸/玻璃/桌宠/滑杆正常 |

## 4. 兼容性承诺与升级流程

- 承诺范围：`>=0.2.0-rc.1 <0.3.0`。0.2.x 的补丁/rc 升级（如 0.2.1-rc.5 → 0.2.1-rc.6）不应破坏
  兼容；DSH 0.3.x 发布后需先跑 `npm run compat`：
  - 全 `COMPATIBLE` → 更新 `dshCompatibilityRange` 即可；
  - 出现 `MISS` → 只改 `src/65-bridge.js` 的发现选择器（CSS 不动），再跑多版本运行时矩阵；
  - `hook-scan`/`upgrade-check` 继续作为当前安装的常规回归。
- 不再把"某个版本的哈希类名"写进 CSS：v0.2.0 起 CSS 已零哈希依赖，本版继续维持。

## 5. 对用户的实际影响

- 现在升级/回退 DSH 0.2.0 ↔ 0.2.1 ↔ 0.2.2 都不需要重新安装或改皮肤：浏览器半 Ctrl+F5 即生效。
- 宿主半（上传并发、WE 目录校验、build 握手）只有在 DSH 进程重启后才更新；页面会显示
  「宿主半待重启 DSH」（`_engines` build 握手），重启一次即可。
- 如果未来某版本皮肤没有生效，打开 DevTools Console 执行
  `__dshTianlightInstance.features`，把结果连同 `npm run compat -- --dsh <安装目录>` 输出一起反馈。
