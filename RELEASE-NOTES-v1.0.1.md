# v1.0.1 · 移除壁纸左上角常驻晨光装饰

> **遐蝶 · 天光（TIANLIGHT）** 的补丁版：修掉壁纸左上角那个「像太阳的东西」。公开版本名为 **v1.0.1**（仓库内部构建 `1.6.2`，`BUILD`/`HOST_BUILD` = `1.6.2`）。
> 纯视觉修复，不改任何其它功能；升级后 **Ctrl+F5** 即可，无需重新配置。

## 🐛 修复：壁纸左上角的「小太阳」

- **现象**：无论视频/图片/着色器/WebWallGL 场景/网页壁纸，左上角总有一团淡淡的晨光角标；切换壁纸后仍在，像常驻装饰。
- **根因**：皮肤自带的固定角落装饰——`src/30-wallpaper.js` 的内联 SVG `CREST_SVG`（"dawn burst"：白色光晕 + 放射光线 + 白色核心）。它在**每张壁纸重建场景层时都会创建一个节点并 append**，位置写死 `top: -120px; left: -140px`、`opacity: 0.42`（深色主题 `0.30`），与壁纸内容无关，所以观感就是一颗常驻小太阳。
- **修复**：删除该 SVG 常量、crest 节点创建代码，以及 `src/20-stylesheet.js` 中 `[data-tl-scene] > [data-tl-crest]` 的两条 CSS。场景层 DOM 顺序（`video → photo → shader → sceneFrame → webFrame → overlay ×2 → dim → veil`）不变，**veil 天空光渐变保留**；切换壁纸不再出现任何固定角标。

## 影响面

- **只影响视觉**：所有壁纸类型、所有液态玻璃档（`off` / soft / frosted / real）都不再出现该角标。
- **完全不变**：液态玻璃 v2、侧栏「新会话」按钮、DSH 主界面天气胶囊、桌宠/生活节奏、角色中枢、AI 权限与安全限额、宿主路由与设置。
- 原有自定义壁纸、取景、玻璃档位等设置全部保留，升级无需重新配置。

## ✅ 验证

- 静态链：build/build --check 26/26、test 67/67、structure --strict、audit（v1.6.2 新守卫 2 条：无 `CREST_SVG`/`[data-tl-crest]` 残留 / veil 天空光保留）、check-css、verify、i18n-audit（zh=en 1216 键）全绿。
- Node 级隔离冒烟：**626/626 PASS**（v1.6.1 的 622 条回归全保留 + 4 条新增 S74–S77：crest 移除 / 场景层顺序 / veil 保留 / `installScene` 无 crest），构建 sha `e39657bb…`（`lib/client.js` 1,300,780 B）；同一 build sha 复跑同样 626/626 PASS。
- 真浏览器级：升级后 Ctrl+F5，连续切换多张壁纸确认左上角无角标。

## 🔄 升级

- 覆盖安装目录后 **Ctrl+F5** 即可；本版没有宿主路由改动，通常**不需要重启 DSH**（若面板提示「宿主半待重启」，重启一次即消除）。
- 回滚：重新安装上一版本（v1.0.0 / 内部 1.6.1）+ Ctrl+F5。

## 🧾 许可

- 本仓库代码 MIT；`vendor/` 内第三方组件（WebWallGL MIT、we-wallpaper MIT、wcap Unlicense）随包保留各自许可。
