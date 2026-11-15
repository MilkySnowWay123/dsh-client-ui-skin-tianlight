# 天光 v2.1.6

这一版不加新功能、不改画面，只把「底座」压住：DSH 新版本有没有坏我们的钩子，从这一版开始每天自动检查。

## 改了什么

- **补测 DSH 0.2.2-rc.2 / rc.3 / 0.2.2-alpha.3**：三个版本都用 `compat-matrix`、`hook-scan --self-check`、`upgrade-check` 实跑过，全部 COMPATIBLE / 全部钩子存在 / 所有升级假设成立。`skin.json` 的 `dshCompatibilityTested` 已补上这三个版本，`dshCompatibility` 前移到 `0.2.2rc3`。
- **每天自动巡检**：新增 `.github/workflows/dsh-canary.yml`，每天 03:17 UTC 解析 npm 的 `next` / `alpha` 与「最新已测版本」三行，各跑一遍上面三个工具；不在兼容范围内会自动开 issue（同标题只追加评论）。
- **真实 DSH 冒烟**：新增 `tools/smoke-dsh.mjs`，在一个一次性 DSH home 里起 `dsh web`，用 headless Chrome 检查：皮肤属性存在、控制台没有本插件报错、开屏关闭时输入框 10 秒内出现、长片 25 秒内结束且 `#root` 可见。
- **0.3 策略写进文档**：`docs/COMPATIBILITY.md` 新增第 10 节，明确上限继续锁在 `<0.3.0-0`，并附 `dsh-app-boot` 源码行号证据：不兼容的插件是「整层跳过、不加载」，不是只警告。

## 没有变的东西

- 长片、简洁版、液态玻璃、桌宠、天气、壁纸全部没有行为或画面变化。
- `tianlight.*` 设置键与 `<profile>/tianlight/` 文件格式不变，不需要迁移。
- 测试仍是 147 项，全部通过；`npm run check` 全绿。

## 升级方式

- npm：`npx dsh-client-ui-skin-tianlight@latest`
- 或在 DSH 插件管理器里更新。
- 这次没有改宿主路由：装完重开一次 DSH，页面 `Ctrl+F5` 即可。
