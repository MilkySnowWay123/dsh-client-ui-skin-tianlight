# 精选配方（presets/）

面板「⑥ 保存/分享」里的内置卡片是**规范来源**（`src/70-sidebar.js` 的 `CURATED_PRESETS`，不联网）；
这里的 JSON 是可直接复制/分享的配方副本。把文件内容粘贴进面板的「导入配方」文本框，或生成分享链接
（`#tl=…`）发给别人即可。所有配方都不联网、不上传、不收集数据。

## v0.4.0 配方（`tianlight-preset` v1）

| 文件 | 内容 |
|---|---|
| `cinema-grain.json` | 保留当前壁纸，只叠加颗粒 + 暗角 |
| `night-glow.json` | 保留当前壁纸，叠加冷色光晕 + 扫描线 |
| `clean.json` | 清空两层叠加，回到干净壁纸 |

## v0.5.0 配方（`tianlight-preset` v2）

v2 在 v1 字段（`zones` / `glass` / `lowPower` / `wallpaper` / `shader` / `layers` / `playback` / `rotation`）之外，
增加 `effects` / `context` / `legibility` / `typography` 四个可选段；导入端只按各控制器的默认字段
**逐键同类型校验**后应用，非法字段忽略，不会把坏值写进设置。

| 文件 | 内容 | 依赖的新能力 |
|---|---|---|
| `cinema-night.json` | 夜晚电影感：雨声氛围（视觉雨幕）、dissolve 转场、颗粒+暗角、固定夜间外观 | B3 氛围 / B4 转场 / C1 时段 |
| `dawn-light.json` | 清晨天光：光斑氛围、轻微视差、暖色光晕、固定黎明外观 | B1 视差 / B3 氛围 / C1 时段 |
| `focus-quiet.json` | 专注安静：生成中压暗+模糊场景（专注联动）、清空叠加、更高的可读性阈值 | C2 专注 / D5 可读性 |
| `tech-scan.json` | 科技扫描：火花点击特效、扫描线+光晕、zoom 转场 | B2 点击 / B4 转场 |
| `paper-reading.json` | 纸感阅读：衬线阅读字体、12 号以上正文、较宽内容栏与段距、轻暗角 | D4 排版增强 / D5 可读性 |

## 使用与兼容

- 面板「⑥ 保存/分享 → 导入配方」粘贴 JSON；或把整个文件内容存成自己的配方副本。
- `format` 接受 `tianlight-preset` 与 `tianlight-recipe`（分享链接用的格式），`version` 1–2。
- **v0.4.0 面板**导入 v2 配方时会忽略不认识的 `effects` / `context` / `legibility` / `typography` 段，
  其余（叠加层、玻璃、省电等）照常应用；不会报错。
- `manualPeriod` 只在 `context.timeOfDay=true` 时生效：非 `auto` 表示固定该时段外观，不再随时钟变化。
- 配方只写配置，不包含任何壁纸/媒体文件；分享链接也不含文件，只含配置。
