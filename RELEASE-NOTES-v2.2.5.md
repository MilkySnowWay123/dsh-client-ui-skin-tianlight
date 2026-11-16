# 天光 v2.2.5

紧急修复上一版之后暴露的两个界面问题：**侧栏开关被玻璃压住、收起后找不到恢复**，以及**液态玻璃把整张壁纸糊掉**。两处都在 CSS，逻辑没动。

## 侧栏：开关被拖进栏里，压在品牌图标上

- **现象**：左边的侧栏开关图标和产品 logo 重合；收起侧栏后不知道点哪里恢复。
- **原因**：DSH Desktop 把侧栏开关渲染成 `position: fixed; left: 12px; top: 6px` 的按钮，按钮在侧栏容器内部。皮肤的实时玻璃给栏容器加了 `backdrop-filter`——**带 filter 的祖先会成为 fixed 子元素的包含块**，开关于是从标题条被拖到栏内，正好压在品牌图标上。
- **修复**：侧栏容器不再有任何 `backdrop-filter`（静态玻璃配方与实时填充保留）。开关回到标题条左下角原位。
- **随手可用**：任何时候 **`Ctrl+B`**（Desktop）或 `Ctrl+Alt+B`（Web）开合左侧栏。

## 玻璃：不再应用到全局，壁纸保持清晰

- **现象**：开启实时玻璃后背景壁纸整体发糊。
- **原因**：三处大面积/全屏层带了 `backdrop-filter`——无场景时的全屏 `liquid-fallback` 节点（`fixed; inset:0`，直接模糊整张壁纸）、角色中枢的全屏遮罩（3px 全屏模糊），以及设置 / 壁纸 / 中枢三个大面板（半屏模糊）。
- **修复**：这四类层不再有任何 blur，只保留色调、描边、内阴影与颗粒质感。**实时采样只保留在输入框卡片和小组件**（菜单、模型胶囊、天气胶囊、新会话按钮、推理滑杆）——也就是「玻璃是控件的一层质感，不是给整张壁纸加滤镜」。
- 低电量 / 15fps 的自动暂停、缺键默认 `off` 都保持不变。

## 回归防线

- `tools/check-css.mjs`：任何全屏/大面板（`liquid-fallback`、`hub-mask`、`settings`、`wall`、`hub-panel`、`sidebar*`）出现 `backdrop-filter` 即失败；侧栏选择器回到过滤列表也失败。
- `tools/audit.mjs` / `tools/test.mjs`：钉住 fallback 与中枢遮罩必须无模糊、输入框必须保留有界模糊。

## 验证

- 静态链全绿：`build --check` 43 片段、`test` 155/155、`structure --strict`、`deps --check`、`audit`、`check-css`、`verify`、`i18n-audit`。
- 真实 DSH 0.2.2-rc.3 + headless Edge 冒烟 8/8（含 `glass defaults to off`、长片 20s 结束、插件零 console error）。
- **升级方式：完全退出 DSH（含托盘图标）→ 重新打开 → 页面 Ctrl+F5**；只刷新不重启可能仍是旧构建。
