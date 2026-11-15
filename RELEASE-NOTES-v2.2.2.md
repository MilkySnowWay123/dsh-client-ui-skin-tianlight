# 天光 v2.2.2

液态玻璃第二次去白：从「低透明度白玻璃」改成**清透的透镜玻璃**，并修掉暗色主题下实时玻璃反而更白的问题。v2.2.1 保留 `0.12` 白色填充和面板 55% 混合，用户反馈亮色天空壁纸下仍像白雾；这一版把白色填充几乎去掉，玻璃的可见形体改由 `backdrop-filter`、SVG 透镜折射、1px 亮暗边和边缘高光提供。

## 改了什么

- **亮色主题填充**：玻璃填充 `0.20 → 0.05`（冷调 `rgb(205,228,250)`）；实时渲染下 `0.12 → 0.04`。面板填充 `0.68` 起（实时 0.56）；菜单遮罩 `0.54`（实时 0.50）。
- **暗色主题不再被亮色实时配方污染**：v2.2.1 的实时 override 不分主题地写入浅色填充，Windows 暗色模式 + 亮壁纸时会变成一层白雾（用户实际看到的就是这个）。v2.2.2 给暗色主题单独的**烟熏玻璃**配方：填充 `rgba(6,14,24,0.40)`、面板 `0.72`、backdrop `brightness(0.72)`，白色文字重新有足够对比。
- **真实透镜折射**：实时模式使用 SVG `feTurbulence + feDisplacementMap` 作为 `backdrop-filter` 的第一段（`url(#tl-glass-lens-filter) blur(...) saturate(...) brightness(...) contrast(...)`），背后的壁纸会像隔着玻璃一样轻微弯曲，而不是只被模糊。运行时先用 `globalThis.CSS.supports("backdrop-filter","url(#...)")` 探测；不支持时自动退回普通 blur（`data-tl-glass-lens-support="0"`），SVG 节点只在实时生效期间存在，关闭/省电即移除。
- **边缘厚度**：新增 `--tl-liquid-lens-shadow` 的宽幅内阴影；侧栏补 1px 亮右边框，输入区补更亮顶部内边与窄角度高光；白 specular 全局降到 soft `0.08` / real `0.12` / frosted `0.16`，实时下 `0.03`。
- **修复 live + depth 历史状态**：旧版本可能留下 `glassLive=1 + glassDepth=off`（按钮开着但深度关，实际不渲染）。现在安装/刷新检测到这对状态会自动提升为 `soft` 并持久化，实时开关真正生效。
- 气泡等文字承载面保留 `0.30` 填充下限。

## 验证

- `npm run check` 全绿（154 项测试）；`check-css` 新增 live 透镜/主题配方守卫。
- 真实 DSH 0.2.2-rc.3 + headless Edge：亮色与暗色主题、亮色天空壁纸各 15/15，含真实点击开关、15fps 即时压平/恢复、`data-tl-glass-lens-support=1`、provider/model 下拉与 mock Grok 请求。
- 只改浏览器半，升级后 `Ctrl+F5` 即可；宿主路由与 `HOST_API=3` 不变。
