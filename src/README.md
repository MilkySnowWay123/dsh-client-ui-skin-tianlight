# src/ · 浏览器半源码

这里不是独立模块：所有片段由 [`tools/build.mjs`](../tools/build.mjs) 按固定顺序拼进同一个
factory 闭包，产物是 `lib/client.js`（加载器的单文件契约）。**不要直接改 `lib/client.js`**，
下次构建会覆盖它。

片段是普通脚本片段（没有 import/export），共享同一个闭包作用域；`//#region` 标记随片段保留，
所以 `tools/structure.mjs` 仍然校验产物里的分区顺序。

| 片段 | 内容 |
|---|---|
| `00-envelope.js` | `window.__ModuleLoader__.load({ id, factory })` 外壳（module/exports） |
| `10-constants.js` | 路由前缀、body 属性、存储键、渲染帧率档位、候选名单、React 引导 |
| `20-stylesheet.js` | 整张样式表（`String.raw`）+ `installStyles` |
| `30-wallpaper.js` | 场景、视频/图片/GLSL 三通道、静态帧、双槽叠加层、麦克风音频分析、壁纸解算、取色、收藏/标签库、着色器校验与 WebGL 渲染器 |
| `40-companion.js` | 薄荷小猫：拖拽、呼吸、互动菜单、台词 |
| `50-rheostat.js` | 推理档位滑杆 |
| `55-lowpower.js` | 省电自适应 |
| `57-glass.js` | 玻璃总倍率 |
| `60-zones.js` | 取景裁切 + 侧栏 canvas 镜像（独立侧栏时按需 rAF） |
| `65-bridge.js` | 结构发现 + 自盖章 |
| `70-sidebar.js` | 六段壁纸面板、来源引导卡、六步摘要、粘性头、画质提示、顶部拖拽、精选配方、来源真 tab（本地/URL/WE/Shader）、拖动吸附、光效、取色 |
| `90-font.js` | 字体面板：预览、字号/字族/排版分组、滚动上限 |
| `99-apply.js` | `apply(ctx)` effect 注册、导出、信封收尾 |

## 改代码流程

```bash
# 1. 改 src/ 里的片段（不要改 lib/client.js）
node tools/build.mjs          # 2. 重新生成 lib/client.js
npm run check                 # 3. build --check + 五件套
```

快照用 `npm run snapshot`（产物和 `src/` 一起存），回滚用 `npm run restore`。

## 纪律

- 一次只改一处，构建后立刻跑 `npm run check`。
- 中文文件只用编辑工具或 Node 写 UTF-8，不要用 PowerShell 回写。
- CSS 在 `20-stylesheet.js` 的模板字符串里，注释中不能出现反引号。
