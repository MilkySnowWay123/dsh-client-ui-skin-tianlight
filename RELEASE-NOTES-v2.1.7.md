# 天光 v2.1.7

这一版是重构，用户应该感觉不到任何变化：把浏览器半的内部耦合量出来、把重复的开机动画决策合成一处。

## 改了什么

- **片段依赖成为可见、可守约的事实**：新增 `tools/deps.mjs`（自写词法扫描，跳过字符串/模板/注释/正则），生成 `docs/DEPS.md` 与 `tools/deps-baseline.json`。当前 28 个片段共享 1,149 个顶层名字、306 条跨片段引用、124 条依赖边。`npm run check` 会拒绝 baseline 里没有的**新**跨片段引用，并提示引用变少时刷新 baseline。
- **开机动画的重复决策合并**：`splashDecision()`、`splashPlan()`、`installSplashEntry()` 原本各自实现一遍 style / 每会话一次 / 减少动态（含 forceMotion 覆盖）/ 低电量判断，现在只有 `splashPlan()` 决策，另外两处只做映射。
- **删掉两个没人读的顶层名字**（`TL5_VERSION`、`petAgentDoc`，全仓库 grep 仅声明一条）。`SPLASH_FILM_DURATION_MS` / `SPLASH_FILM_HARD_STOP_MS` 保留，因为测试通过插桩断言它们。
- **决策表测试**：新增 16 行「输入 → 结果」表（四档 style × 今日是否已播 × 减少动态 × forceMotion × 低电量）+ 2 行非法值 + 6 个入口用例；合并前后都是 147 项全绿。

## 没有变的东西

- 画面、行为、设置键、用户数据格式全部不变。
- `lib/client.js` 由 1,787,820 字节变为 1,787,785 字节（纯重构 + 两个死名字），冒烟脚本对「2.1.6 构建」和「本构建」各跑一次，结果一致。
- 安装包仍是 48 个文件。

## 升级方式

- npm：`npx dsh-client-ui-skin-tianlight@latest`
- 只改了浏览器半：装好后页面 `Ctrl+F5` 即可，不需要退出 DSH。
