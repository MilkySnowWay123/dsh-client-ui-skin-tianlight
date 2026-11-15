# 天光 v2.1.9

工具修正版：让每日巡检在 GitHub runner 上真正跑通。皮肤代码与 2.1.8 完全相同，画面、行为、设置、数据格式都没有变化。

## 修好了什么

- **每日巡检能解析版本了**：`tools/canary-matrix.mjs` 在 GitHub runner 的 Node toolcache 布局下找不到 npm CLI——它返回了第一个「以 `.js` 结尾」的候选路径，却没检查文件是否存在，导致每次巡检都在 `resolve` 这一步以 `MODULE_NOT_FOUND` 失败。现在候选必须真实存在。
- **巡检解析失败也会开 issue**：此前只有 compat job 会报 issue，解析失败会留下一个没人跟进的红色 run；现在 `resolve` job 失败同样会开/追加一条 issue。
- **冒烟 job 装上中日韩字体**：裸 ubuntu runner 没有 CJK 字体，长片的字形遮罩（天光 / TIANLIGHT）会渲染为空并记录 `glyph mask empty`，随后回退简洁版；冒烟因此误判「插件报错」。安装 `fonts-noto-cjk` 后长片能真正渲染，四条断言测的是真实效果。

## 没有变的东西

- 皮肤代码与 2.1.8 逐字节相同（只改了 `tools/` 与 `.github/workflows/`）。
- 安装包仍是 57 个文件；npm 包与 Release `SHA256SUMS.txt` 一致（57/57）。

## 升级方式

- npm：`npx dsh-client-ui-skin-tianlight@latest`
- 这一版只改 CI 工具与巡检配置：**已经装 2.1.8 的话不需要为此升级**；若升级，`Ctrl+F5` 即可，不需要退出 DSH。
