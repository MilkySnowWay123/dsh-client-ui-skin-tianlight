# 天光 v2.2.6

一个小的视觉修正：**输入框卡片顶部原来有两条线**（0.5px 描边 + 内侧 1px 高光），内侧那条是一条不随圆角走的直亮线，看起来就像「对话框上面多了一条线」。这一版去掉内侧高光，只保留卡片本身的 0.5px 描边。

## 改了什么

- `[data-tl-composer]` 的 `box-shadow` 去掉 `inset 0 1px 0 var(--tl-glass-line)`（暗色变体同样移除），只留投影。
- 卡片的毛玻璃主体、圆角、0.5px 描边、输入区可读性都不变。
- 其他面板（设置 / 壁纸 / 中枢）的顶部内高光**没有动**——那里是整块面板的边缘，不会出现「一条悬空的线」。

## 回归防线

`tools/check-css.mjs` 新增断言：输入卡片只能有一条边，任何 `[data-tl-composer]` 卡片规则里再出现 `inset 0 1px 0` 即失败。

## 验证

- 静态链全绿（build 43 片段 / test 155 / structure / deps / audit / check-css / verify / i18n）。
- 真实 DSH 0.2.2-rc.3 + headless Edge 冒烟 8/8；`smoke-dsh.mjs` 新增 `--shot <file>` 可在通过后落一张整页截图，方便以后做像素级复核。

## 升级

**完全退出 DSH（含托盘图标）→ 重新打开 → 页面 Ctrl+F5。**
