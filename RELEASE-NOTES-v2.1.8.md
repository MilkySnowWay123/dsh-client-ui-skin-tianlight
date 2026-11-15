# 天光 v2.1.8

本版是**文档修正版**：代码与 2.1.7 相同，只修正 2.1.7 的发布说明与变更日志，并补齐发布校验结果。

## 为什么要发这一版

开发顺序上，四个阶段的改动都在 2.1.6 之后一次性进入了 `dev`，所以 2.1.7 的安装包实际上已经包含第三阶段的「宿主路由拆分」和第四阶段的「架构文档重写」（57 个文件），但 2.1.7 的发布说明与 CHANGELOG 只写了第二阶段，还写着「安装包仍是 48 个文件」。

按本仓库的发布规则（已发布的 tag 永不移动、永不重打；坏版本用新的版本号修正，见 `PUBLISH.md`），用 2.1.8 修正记录，而不是改 2.1.7 的 tag。

## 2.1.7 / 2.1.8 实际包含的内容

- **宿主路由拆分**：`lib/index.js` 原 255 行的 `handle()` if 链拆成 `lib/routes/{wallpaper,media,engine,settings,frames,pet,weather,scene,webproject}.js`，每个只导出 `{ exact, prefix }`；`index.js` 保留两道同源检查、`HOST_API`/`BUILD`、持久化数据初始化、一张有序派发表和 `bindRoutes`/`apply`。
- **等价验证**：`tools/host-fuzz.mjs` 对 2.1.7 之前的构建与本构建发 122 个请求，状态码、9 个契约响应头与归一化响应体全部一致。
- **架构文档**：`ARCHITECTURE.md` 重写为「v2.1.8 现状」，旧流水账移到 `docs/HISTORY.md`；`tools/structure.mjs --strict` 会拒绝未被文档覆盖的片段/模块/路由。
- **打包**：安装包 57 个文件；npm 包与 GitHub Release 的 `SHA256SUMS.txt` 逐字节一致（57/57）。

## 没有变的东西

- 代码与 2.1.7 相同：没有行为、画面、设置键或 `<profile>/tianlight/` 数据格式变化。
- 所有宿主路由的路径、方法、同源规则与响应格式完全不变。

## 升级方式

- npm：`npx dsh-client-ui-skin-tianlight@latest`
- 从 2.1.6 或更早升级：宿主半已在 2.1.7/2.1.8 中变化，**先完全退出 DSH（含托盘图标）再重开**，然后页面 `Ctrl+F5`。
- 已经装 2.1.7 的用户：装 2.1.8 后只需 `Ctrl+F5`。
