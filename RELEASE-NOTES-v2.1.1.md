# 天光 v2.1.1 · 减少动态效果覆盖

v2.1.0 有一个行为会让部分用户以为“开机动画没了”：当 Windows 关闭动画效果时，Chromium 报告 `prefers-reduced-motion: reduce`，插件按规范直接跳过长片，而且不写任何 splash 设置键。这一版加一个显式覆盖开关。

## 新开关

角色中枢 →「开机动画」→「减少动态效果时（无障碍覆盖）」：

- **遵守系统（默认）**：`prefers-reduced-motion: reduce` 时不播长片；
- **仍播放**：即使系统报告 reduce-motion，也按「长片/简洁」设置播放；
- 这是显式选择，不改变默认无障碍行为；
- **低电量仍然跳过**，覆盖只针对 reduce-motion。

设置键：`tianlight.splash.forceMotion`（`1` / `0`，默认 `0`）。旧用户不打开时行为与 2.1.0 相同。

## 适用场景

- Windows 设置 → 辅助功能 → 视觉效果 →「动画效果」关闭；
- 或「性能选项」里取消“窗口内的动画控件和元素”；
- 此时 `MinAnimate=0`，Chromium 报告 reduce-motion，v2.1.0 会静默跳过。

## 验证

- `build --check`、`test`（141 passed）、`structure --strict`、`audit`、`check-css`、`verify`、`i18n-audit` 全部通过。
- 新增测试：forceMotion 默认关闭、开关读写、reduced-motion + 覆盖允许播放、无覆盖仍跳过、低电量优先跳过。
- 角色中枢新增下拉，中英两套文案齐全。

## 升级

- 先完全退出 DSH，再安装/更新，然后重开 DSH 并 Ctrl+F5。
- 如果你的系统仍关闭动画效果：先到角色中枢打开“仍播放”，或直接在 Windows 里打开动画效果。
- 用户数据仍在 `$DSH_HOME/profiles/<profile>/tianlight/`，不会删除。

## 兼容

- v2.1.0 的 tag 已发布，不移动；本版是新的 `v2.1.1`。
- 默认行为保持无障碍优先；只有显式打开覆盖才播放。
