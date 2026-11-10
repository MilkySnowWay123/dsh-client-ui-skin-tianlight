# v0.3.0 · 适配 DSH Desktop 0.2.1-rc.3 的彻底修复

> 版本：`0.3.0`（宿主 build `0.3.0`，`skin.json` → `dshCompatibility: "0.2.1rc3"`）
> 触发问题：「现在皮肤插件好像不适配当前 dsh 版本了」「界面存在重复堆叠，壁纸界面功能错误未响应」
> 验证方式：隔离 DSH 实例 + Edge headless CDP（`diag/skinlab/`）+ 真实窗口截图

## 1. 根因（全部已复现并修复）

| # | 症状 | 根因 | 修复 |
|---|---|---|---|
| 1 | 面板标题、「选壁纸/高级」、关闭按钮在桌面端点不到；菜单文字画在面板头上 | DSH Desktop preload 在 `<html>` 写 `data-windows-titlebar` + `--dsh-windows-titlebar-height:40px`，并注入 z-index 1100 的固定菜单层；面板 `position:fixed;top:0;z-index:58` 正好在 40px 头带里 | 新增 `html[data-windows-titlebar]:not([data-fullscreen])` 安全区规则：面板/遮罩从标题栏下开始，把手按内容区视觉居中，字体面板 `top: max(12vh, 标题栏+12px)` |
| 2 | 打开面板显示「② 壁纸清单 0 张」，但筛选条是「全部 3 / 本地 3」；WE 目录编辑器顶在库列表上 | 面板 React root 首次打开才创建、关闭不卸载，`sourceTab=we` 在整页会话里永久保留 | 每次打开用递增 React key 重挂载面板（状态回到「全部/选壁纸」）；计数改为「可见 / 全部 张」；空筛选给「查看全部壁纸」出口 |
| 3 | 「重复堆叠」的套娃玻璃/边框（模型胶囊、菜单、气泡） | 选择器桥用 `[class*='_trigger']` 逐节点盖章：一个模型选择器内的 trigger/triggerIcon/triggerLabel/svg/anchor 全被盖章 → 8 层胶囊；`_bubble`/`_menu` 同理；且与桌宠自有的 `data-tl-bubble`/`data-tl-menu` 撞名 | 桥改为「下划线分段名精确匹配 + 只盖最外层 + 槽位作用域」（`data-slot="conversation.input.model"`、`data-slot="sidebar"`）；桌宠改用 `data-tl-say` / `data-tl-catmenu`；气泡不再叠加实时 blur，菜单只保留一层 |
| 4 | 重载后两只猫、两个推理滑杆/两个 Aa；旧实例残留监听与定时器；旧清理可能误删新实例的样式 | 旧守卫只按 7 个选择器删 DOM，且 `[data-tl-companion]` 全仓 0 命中（真实属性是 `[data-tl-cat]`）；slot 注册与 window/document 监听不受 DOM 删除影响；`installStyles` 复用 style 时返回空清理 | 单例注册表 `globalThis.__dshTianlightInstance`：新实例 apply 先 `dispose()` 旧实例（优先 dispose 旧 cordis fiber，slot 一并清理），每个效果清理幂等；删除旧守卫；孤儿 host 清理只作为旧版本升级兜底 |
| 5 | 玻璃倍率调低后面板能透出后面的侧栏文字，像「文字重复叠了两层」 | `--tl-panel-fill` 直接乘 `--tl-glass-m`（0.35 时只剩 0.33 不透明度） | 面板/菜单填充加可读性下限（暗色 ≥0.96、亮色 ≥0.90、取色填充 ≥0.96）；玻璃滑杆只影响输入框等小表面 |
| 6 | 简单视图点「隐」后卡片消失、找不到恢复；「#」按钮没反应 | CSS 在 pick 视图把 `.tl-wall-filters` 与 `.tl-wall-tag-editor` 整体隐藏 | pick 视图保留筛选行（含「显示隐藏 N」恢复入口），只隐藏标签编辑器；卡片上的「#」只在高级视图渲染 |
| 7 | 面板底部卡片贴边 | 面板 `bottom:0` 且内容只有 14px 内边距 | 内层增加 `18px + safe-area-inset-bottom` 底部安全区 |

## 2. 顺带完成的「彻底更新」

- **取消面板记忆态**：不再保留上次来源/筛选/WE 编辑器；面板打开永远是可用状态。
- **Esc 关闭**：面板打开时 `Esc` 关闭（不干扰其它弹层）。
- **计数语义**：「② 壁纸清单 3 张」；筛选/搜索后显示「可见 / 全部 张」。
- **宿主半加固（需重启 DSH 生效）**：
  - `_we-roots`：仅接受 `application/json`；只收绝对路径（相对路径计入 `skipped`，不再 resolve 到进程 CWD）；超过 8KB 返回 413 而非断连。
  - `_engines`：返回真实 `build`；客户端带 `?build=` 时返回 `stale`，页面已更新而宿主未重启时面板提示「重启一次 DSH Desktop」。
  - 上传同名并发：用 `link()` 原子占名代替 `rename()`，撞名自动顺延 `-1/-2`，不再覆盖或 500。
- **自检升级**：`structure` 增加「单例注册表 / 禁止死选择器」不变量；`audit` 增加 teardown 校验；`check-css` 增加标题栏安全区与填充下限校验；`hooks/hook-scan/upgrade-check` 增加 `data-slot` 与槽位名钩子；`verify` 增加 build 握手断言。
- **删除**：重复的 composer/settings/sidebar CSS 块（约 30 行死规则）、已失效的「哈希选择器为主路径」注释、错误的 `[data-tl-companion]` 守卫。

## 3. 兼容性说明

- 目标 DSH：**0.2.1-rc.3**（本机 Desktop 实测）。桥接对 rc.4 / rc.5 / 0.2.2-alpha.2 的钩子预检仍全 PASS。
- CSS 仍不含任何 DSH 构建哈希；所有产品表面只通过 `data-slot` / 产品 `data-*` / 类名分段名/后缀发现。
- 浏览器半更新：**Ctrl+F5** 即生效。宿主半更新（上传/WE 目录/handshake）：需要**重启一次 DSH Desktop**。

## 4. 验证记录

- `node tools/build.mjs --check`、`test`(24)、`structure --strict`、`audit`、`check-css`、`verify`：全 PASS。
- `upgrade-check`（真实 app.asar 0.2.1-rc.3）：全 PASS（含新增 slot 钩子）。
- `hook-scan --dsh <真实安装> --self-check`：全 PASS。
- 隔离实例 CDP：14/14 断言 PASS（default / panel / titlebar / close），`data-tl-model` 8→1、`data-tl-menu` 只标弹层、桌宠/气泡属性分离。
- 单例 teardown：`dispose()` 后所有 host 计数为 0、无残留 `data-tl-*`、无 console error；随后页面重载恢复为每个 1。
- 低玻璃：`--tl-glass-m: 0.35` 时面板填充仍为 0.9 不透明度（下限已提高到 0.96，真实窗口 Ctrl+F5 后复验：面板不再透出侧栏文字）。
- 真实窗口（DSH Desktop 0.2.1-rc.3，Ctrl+F5 后截图）：面板从标题栏下方开始、标题/视图切换/关闭可点，「全部 3 / 本地 3 / WE 0」、`② 壁纸清单 3 张`、3 张卡片、模型胶囊单层。证据：`diag/skinlab/evidence/live-v030b-panel.png`。
