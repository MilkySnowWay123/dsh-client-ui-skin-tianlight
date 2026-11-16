# 天光 v2.2.10

这是一个 **npm 补发版**：代码与 [v2.2.9](RELEASE-NOTES-v2.2.9.md) 的最终 GitHub Release 完全一致，仅版本号与构建元数据不同。

## 为什么需要补发

- v2.2.9 在 npm 发布处理期间被 registry 固定为一个较早的构建；npm 不允许覆盖已存在的版本。
- 当前 npm 账户没有可用的 2FA 接收器，无法执行已公开版本的 `npm unpublish`（npm 对 bypass-2FA token 的限制）。
- 因此用新的 patch 版本 **2.2.10** 交付最终代码；GitHub 侧也打 `v2.2.10`，保持 npm 包与 Release 附件一致。

## 与 npm 2.2.9 旧 tarball 的差异

- 浅色 `#root` 的白色文字光晕（`rgba(255,255,255,.62/.42)`）改为深色淡阴影（`rgba(10,30,50,.24/.16)`）。
- 删除已不再使用的 `--tl-liquid-lens-shadow` 旧 token。
- 修正 `lib/index.js` 两处历史注释乱码。
- 没有行为、布局、壁纸、权限或配置变更。

## 包含的 v2.2.9 全部修复

- 侧栏 frame 不再被标成 `data-tl-sidebar`；`data-sidebar-collapsed` 只作 `body[data-tl-sidebar-state]`。
- 删除整窗颗粒/暗角、场景层玻璃雾面、壁纸面板 0.18 遮罩；hub 遮罩降到 0.18；产品遮罩 token 压到 0.12/0.20。
- 大面板改为低 alpha tint + `::before` backdrop-filter + `::after` 渐变边缘光；宿主本体零 filter/transform/will-change。
- 壁纸面板取色不再写 `max(0.96, ...)`，玻璃滑杆生效。
- 可读性护栏从 0.97 实色改为 alpha ≤0.40 tint + 更强 blur。
- composer 透镜按实际像素生成圆角边缘带位移图，中心零位移。
- 实时默认、低电量/15fps 全量去 blur、浅色文字阴影、编码修复。

## 验证（与 2.2.9 最终代码相同）

- `npm run check`：**156 tests / 0 failed**，CSS/audit/verify/i18n 全通过。
- `verify-install`：57/57 文件与 `SHA256SUMS.txt` 一致。
- 侧栏外像素变化：抽样点 0.00%，区域均值最大 0.42%。
- 低电量/15fps：全页 `backdrop-filter` 数量 0。
- 4K 视频 10s：2.2.8 基线 120.0 fps / 600 帧 / 丢帧 0；2.2.10 与 2.2.9 最终版相同 120.1 fps / 601 帧 / 丢帧 0。
- 截图：[screenshots/v2.2.9/](screenshots/v2.2.9)（视觉与 2.2.10 相同）。

## 升级

完全退出 DSH（含托盘图标）→ 重新打开 → 页面 Ctrl+F5。

npm 2.2.9 已标记 deprecated，请使用 **2.2.10**。
