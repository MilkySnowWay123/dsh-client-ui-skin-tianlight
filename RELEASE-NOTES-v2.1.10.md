# 天光 v2.1.10

缺陷修正版：不新增功能、不改画面。修掉发布前审计发现的三个问题，全部在工具链/巡检侧；皮肤本身除版本号常量外与 2.1.9 相同。

## 修好了什么

- **发布预检漏掉 i18n 审计**：`tools/release.mjs` 的检查链注释写着“与 `npm run check` 完全一致”，实际少了 `tools/i18n-audit.mjs`，可能把中英文案不完整的包发出去。现在已补齐，顺序与 `package.json` 一致。
- **npm 发布工具在 Windows 上用 shell 跑 git**：`tools/npm-publish.mjs` 对 `git` 也开了 `shell: true`，Node 24 会报 `DEP0190`，而且参数是拼接而不是转义。现在只有 npm 的 `.cmd` 兜底才使用 shell，git 始终直接执行。
- **巡检可能“零检查也变绿”**：`tools/canary-matrix.mjs` 在 `skin.json` 的 `dshCompatibilityTested` 为空、或一行都没解析出来时仍然以 0 退出，workflow 会显示成功但什么都没测。现在这两种情况直接失败，并写明原因。

## 没有变的东西

- 除版本号常量（影片标题显示的版本）外，皮肤代码与 2.1.9 相同：画面、行为、`tianlight.*` 设置键、`<profile>/tianlight/` 数据格式全部不变，不需要迁移。
- 安装包仍是 57 个文件；npm 包与 GitHub Release 的 `SHA256SUMS.txt` 一致（57/57）。
- 147 项测试、结构检查、审计、依赖门禁、i18n 审计全部通过。

## 升级方式

- 这一版只改工具链与巡检配置：**已经装 2.1.9 的用户不需要为此升级**。
- 要更新的话：npm latest / 插件管理器；装完**完全退出 DSH 再重开**，然后页面 `Ctrl+F5`。
