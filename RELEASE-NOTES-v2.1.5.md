# 天光 v2.1.5

这次不改画面、不改功能，只修一个发布一致性问题。

## 修好了什么

- **npm 包和 GitHub Release 现在逐字节一致。** 2.1.4 的 npm 包是在 Windows 工作树上打的，其中 4 个文本文件（两个 `LICENSE`、两个 Wallpaper Engine 截图脚本）带着 CRLF 换行；GitHub Release 在 Linux 上打包，是 LF。结果是按 Release 的 `SHA256SUMS.txt` 校验 npm 包只有 44/48。
- 2.1.5 在 `tools/pack.mjs` 打完包后统一把文本文件归一为 LF，媒体和可执行文件保持原字节。现在 npm 包与 Release 的 48 个文件逐字节一致，`verify-install` 可以 48/48。
- 测试从 146 增加到 147：覆盖 CRLF 文本重写、二进制文件不被改动、以及打包入口确实调用了归一化。

## 没有变的东西

- 长片、简洁版、液态玻璃、桌宠、天气、壁纸都没有行为或画面变化。
- `tianlight.*` 设置键、`<profile>/tianlight/` 文件格式不变，不需要迁移。
- 安装包还是 48 个文件、约 18.3 MB；演示壁纸仍是 2.1.4 的 4K 版。

## 升级方式

- npm：`npx dsh-client-ui-skin-tianlight@latest`
- 或在 DSH 插件管理器里更新。
- 升级前退出 DSH；装完重开一次，页面 Ctrl+F5。这次没有改宿主路由，但版本常量随包更新，重开一次最稳妥。
