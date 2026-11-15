# 片段依赖（由 `tools/deps.mjs` 生成，不要手改）

28 个片段被拼进同一个工厂闭包（加载约定是"一个插件一个 ESM 文件"，见 `tools/build.mjs` 开头），
所以每个片段的顶层名字对其他片段都是可见的。本文件把这份耦合摊开：**哪些名字被哪个片段声明、被谁引用、跨了哪些边**。

改完 `src/` 之后：

```bash
node tools/deps.mjs          # 重新生成 docs/DEPS.md 与 tools/deps-baseline.json
node tools/deps.mjs --check  # 只检查（npm run check 里的那一步）
```

`--check` 的规则：出现 baseline 里没有的跨片段引用 → 失败，并报出"哪个片段用了谁、声明在哪、几次"；
引用变少 → 只提示刷新 baseline。这条检查是"别再往同一个闭包里堆"的机械保障，不是风格建议。

## 1. 统计

| 指标 | 数值 |
| --- | --- |
| 片段数 | 28 |
| 共享顶层名字 | 1151（声明点 1151） |
| 跨片段引用（去重） | 300 |
| 跨片段引用（出现次数） | 2233 |
| 依赖边 | 124 |

## 2. 片段表

| 片段 | region | 声明数 | 顶层引用数 | 依赖的片段（名字数） | 被哪些片段依赖（名字数） |
| --- | --- | --- | --- | --- | --- |
| `00-envelope.js` |  | 0 | 4 | — | — |
| `10-constants.js` | constants | 22 | 25 | — | `11-platform` (1), `12-schema` (3), `13-i18n` (2), `20-stylesheet` (2), `30-wallpaper` (3), `31-engine-extra` (3), `32-effects` (2), `35-context` (3), `40-companion` (3), `42-life` (3), `44-pet-brain` (4), `50-rheostat` (2), `55-lowpower` (1), `57-glass` (2), `58-legibility` (3), `59-splash` (2), `59b-splash-film` (2), `60-zones` (1), `70-sidebar` (8), `72-we-library` (3), `76-role-hub` (3), `90-font` (2), `95-a11y` (2), `99-apply` (3) |
| `11-platform.js` | platform | 53 | 419 | `10-constants` (1), `30-wallpaper` (1) | `12-schema` (6), `13-i18n` (1), `20-stylesheet` (1), `30-wallpaper` (3), `31-engine-extra` (5), `32-effects` (5), `35-context` (5), `40-companion` (1), `42-life` (1), `58-legibility` (3), `59-splash` (1), `70-sidebar` (8), `72-we-library` (4), `76-role-hub` (2), `90-font` (4), `95-a11y` (4), `99-apply` (7) |
| `12-schema.js` | schema | 114 | 1308 | `10-constants` (3), `11-platform` (6), `13-i18n` (5) | `13-i18n` (1), `70-sidebar` (1), `76-role-hub` (1), `99-apply` (3) |
| `13-i18n.js` | i18n | 19 | 137 | `10-constants` (2), `11-platform` (1), `12-schema` (1) | `12-schema` (5), `30-wallpaper` (2), `31-engine-extra` (3), `32-effects` (2), `35-context` (4), `40-companion` (3), `42-life` (2), `44-pet-brain` (2), `50-rheostat` (3), `55-lowpower` (2), `58-legibility` (2), `59-splash` (1), `70-sidebar` (4), `72-we-library` (4), `76-role-hub` (2), `90-font` (2), `95-a11y` (4), `99-apply` (3) |
| `20-stylesheet.js` | stylesheet | 2 | 17 | `10-constants` (2), `11-platform` (1) | `99-apply` (1) |
| `30-wallpaper.js` | wallpaper | 187 | 1195 | `10-constants` (3), `11-platform` (3), `13-i18n` (2), `31-engine-extra` (1), `35-context` (1), `55-lowpower` (1) | `11-platform` (1), `31-engine-extra` (6), `32-effects` (1), `35-context` (1), `40-companion` (1), `55-lowpower` (2), `58-legibility` (1), `60-zones` (1), `70-sidebar` (24), `72-we-library` (2), `99-apply` (1) |
| `31-engine-extra.js` | wallpaper engine extras | 27 | 638 | `10-constants` (3), `11-platform` (5), `13-i18n` (3), `30-wallpaper` (6), `32-effects` (1), `35-context` (1) | `30-wallpaper` (1), `99-apply` (1) |
| `32-effects.js` | ambient effects | 14 | 703 | `10-constants` (2), `11-platform` (5), `13-i18n` (2), `30-wallpaper` (1), `55-lowpower` (1) | `31-engine-extra` (1), `35-context` (1), `70-sidebar` (2), `99-apply` (1) |
| `35-context.js` | smart context | 59 | 1606 | `10-constants` (3), `11-platform` (5), `13-i18n` (4), `30-wallpaper` (1), `32-effects` (1), `57-glass` (1) | `30-wallpaper` (1), `31-engine-extra` (1), `70-sidebar` (2), `99-apply` (2) |
| `40-companion.js` | companion | 70 | 1596 | `10-constants` (3), `11-platform` (1), `13-i18n` (3), `30-wallpaper` (1), `44-pet-brain` (2) | `42-life` (1), `44-pet-brain` (2), `99-apply` (3) |
| `42-life.js` | life rhythm | 91 | 888 | `10-constants` (3), `11-platform` (1), `13-i18n` (2), `40-companion` (1), `44-pet-brain` (1) | `99-apply` (1) |
| `44-pet-brain.js` | pet brain | 190 | 1823 | `10-constants` (4), `13-i18n` (2), `40-companion` (2), `55-lowpower` (1), `57-glass` (1) | `40-companion` (2), `42-life` (1), `48-pet-agent` (3), `76-role-hub` (2), `99-apply` (1) |
| `48-pet-agent.js` | pet agent | 39 | 437 | `44-pet-brain` (3) | `76-role-hub` (1), `99-apply` (1) |
| `50-rheostat.js` | reasoning rheostat | 2 | 308 | `10-constants` (2), `13-i18n` (3) | `99-apply` (1) |
| `55-lowpower.js` | low power | 4 | 162 | `10-constants` (1), `13-i18n` (2), `30-wallpaper` (2), `60-zones` (1) | `30-wallpaper` (1), `32-effects` (1), `44-pet-brain` (1), `59-splash` (1), `70-sidebar` (2), `99-apply` (1) |
| `57-glass.js` | glass opacity | 15 | 100 | `10-constants` (2) | `35-context` (1), `44-pet-brain` (1), `70-sidebar` (2), `76-role-hub` (1), `99-apply` (3) |
| `58-legibility.js` | legibility | 24 | 320 | `10-constants` (3), `11-platform` (3), `13-i18n` (2), `30-wallpaper` (1) | `70-sidebar` (2), `90-font` (3), `99-apply` (1) |
| `59-splash.js` | splash | 42 | 402 | `10-constants` (2), `11-platform` (1), `13-i18n` (1), `55-lowpower` (1), `59b-splash-film` (1) | `76-role-hub` (6), `99-apply` (2) |
| `59b-splash-film.js` | splash | 5 | 799 | `10-constants` (2) | `59-splash` (1) |
| `60-zones.js` | zone framing | 13 | 196 | `10-constants` (1), `30-wallpaper` (1) | `55-lowpower` (1), `70-sidebar` (5), `99-apply` (1) |
| `65-bridge.js` | selector bridge | 2 | 151 | — | `99-apply` (2) |
| `70-sidebar.js` | wallpaper sidebar | 13 | 1334 | `10-constants` (8), `11-platform` (8), `12-schema` (1), `13-i18n` (4), `30-wallpaper` (24), `32-effects` (2), `35-context` (2), `55-lowpower` (2), `57-glass` (2), `58-legibility` (2), `60-zones` (5), `90-font` (2) | `99-apply` (1) |
| `72-we-library.js` | we library | 57 | 634 | `10-constants` (3), `11-platform` (4), `13-i18n` (4), `30-wallpaper` (2) | `99-apply` (1) |
| `76-role-hub.js` | role hub | 55 | 3123 | `10-constants` (3), `11-platform` (2), `12-schema` (1), `13-i18n` (2), `44-pet-brain` (2), `48-pet-agent` (1), `57-glass` (1), `59-splash` (6) | `99-apply` (1) |
| `90-font.js` | font panel | 20 | 420 | `10-constants` (2), `11-platform` (4), `13-i18n` (2), `58-legibility` (3) | `70-sidebar` (2), `99-apply` (1) |
| `95-a11y.js` | accessibility | 7 | 349 | `10-constants` (2), `11-platform` (4), `13-i18n` (4) | `99-apply` (1) |
| `99-apply.js` | apply | 5 | 234 | `10-constants` (3), `11-platform` (7), `12-schema` (3), `13-i18n` (3), `20-stylesheet` (1), `30-wallpaper` (1), `31-engine-extra` (1), `32-effects` (1), `35-context` (2), `40-companion` (3), `42-life` (1), `44-pet-brain` (1), `48-pet-agent` (1), `50-rheostat` (1), `55-lowpower` (1), `57-glass` (3), `58-legibility` (1), `59-splash` (2), `60-zones` (1), `65-bridge` (2), `70-sidebar` (1), `72-we-library` (1), `76-role-hub` (1), `90-font` (1), `95-a11y` (1) | — |

## 3. 跨片段引用清单

| 来自 | 名字 | 声明于 | 次数 |
| --- | --- | --- | --- |
| `11-platform.js` | `note` | `10-constants.js` | 5 |
| `11-platform.js` | `wallpaperController` | `30-wallpaper.js` | 2 |
| `12-schema.js` | `ASSET_BASE` | `10-constants.js` | 1 |
| `12-schema.js` | `moduleController` | `11-platform.js` | 8 |
| `12-schema.js` | `React` | `10-constants.js` | 46 |
| `12-schema.js` | `registerTl5Css` | `11-platform.js` | 1 |
| `12-schema.js` | `registerTl5PanelSection` | `11-platform.js` | 1 |
| `12-schema.js` | `registerTl5Strings` | `13-i18n.js` | 1 |
| `12-schema.js` | `setTl5Language` | `13-i18n.js` | 1 |
| `12-schema.js` | `STORAGE_KEY` | `10-constants.js` | 1 |
| `12-schema.js` | `subscribeTl5Metrics` | `11-platform.js` | 1 |
| `12-schema.js` | `TL_T` | `13-i18n.js` | 2 |
| `12-schema.js` | `tl5Diag` | `11-platform.js` | 11 |
| `12-schema.js` | `tl5Language` | `13-i18n.js` | 1 |
| `12-schema.js` | `tl5MediaKindFromName` | `11-platform.js` | 1 |
| `12-schema.js` | `useTl5I18n` | `13-i18n.js` | 1 |
| `13-i18n.js` | `note` | `10-constants.js` | 4 |
| `13-i18n.js` | `React` | `10-constants.js` | 2 |
| `13-i18n.js` | `TL5_SCHEMA_STRINGS` | `12-schema.js` | 2 |
| `13-i18n.js` | `tl5Diag` | `11-platform.js` | 1 |
| `20-stylesheet.js` | `CSS_TAG_ID` | `10-constants.js` | 2 |
| `20-stylesheet.js` | `PLUGIN_ID` | `10-constants.js` | 1 |
| `20-stylesheet.js` | `tl5CssText` | `11-platform.js` | 1 |
| `30-wallpaper.js` | `ASSET_BASE` | `10-constants.js` | 12 |
| `30-wallpaper.js` | `contextController` | `35-context.js` | 4 |
| `30-wallpaper.js` | `effectiveShaderFps` | `10-constants.js` | 4 |
| `30-wallpaper.js` | `FOCAL_X` | `10-constants.js` | 1 |
| `30-wallpaper.js` | `lowPowerController` | `55-lowpower.js` | 3 |
| `30-wallpaper.js` | `moduleController` | `11-platform.js` | 4 |
| `30-wallpaper.js` | `publishTl5Metrics` | `11-platform.js` | 1 |
| `30-wallpaper.js` | `registerTl5Strings` | `13-i18n.js` | 1 |
| `30-wallpaper.js` | `TL_T` | `13-i18n.js` | 67 |
| `30-wallpaper.js` | `tl5Diag` | `11-platform.js` | 7 |
| `30-wallpaper.js` | `transitionController` | `31-engine-extra.js` | 4 |
| `31-engine-extra.js` | `adaptiveController` | `30-wallpaper.js` | 7 |
| `31-engine-extra.js` | `ASSET_BASE` | `10-constants.js` | 4 |
| `31-engine-extra.js` | `audioController` | `30-wallpaper.js` | 34 |
| `31-engine-extra.js` | `contextController` | `35-context.js` | 11 |
| `31-engine-extra.js` | `effectsController` | `32-effects.js` | 4 |
| `31-engine-extra.js` | `forgetCatalog` | `30-wallpaper.js` | 2 |
| `31-engine-extra.js` | `frameCacheController` | `30-wallpaper.js` | 4 |
| `31-engine-extra.js` | `moduleController` | `11-platform.js` | 12 |
| `31-engine-extra.js` | `note` | `10-constants.js` | 2 |
| `31-engine-extra.js` | `React` | `10-constants.js` | 81 |
| `31-engine-extra.js` | `readWallpaperChoice` | `30-wallpaper.js` | 2 |
| `31-engine-extra.js` | `registerTl5Css` | `11-platform.js` | 1 |
| `31-engine-extra.js` | `registerTl5PanelSection` | `11-platform.js` | 2 |
| `31-engine-extra.js` | `registerTl5Strings` | `13-i18n.js` | 1 |
| `31-engine-extra.js` | `subscribeTl5Metrics` | `11-platform.js` | 2 |
| `31-engine-extra.js` | `TL_T` | `13-i18n.js` | 7 |
| `31-engine-extra.js` | `tl5Diag` | `11-platform.js` | 5 |
| `31-engine-extra.js` | `useTl5I18n` | `13-i18n.js` | 2 |
| `31-engine-extra.js` | `wallpaperController` | `30-wallpaper.js` | 3 |
| `32-effects.js` | `lowPowerController` | `55-lowpower.js` | 3 |
| `32-effects.js` | `note` | `10-constants.js` | 2 |
| `32-effects.js` | `publishTl5Metrics` | `11-platform.js` | 1 |
| `32-effects.js` | `React` | `10-constants.js` | 25 |
| `32-effects.js` | `registerTl5Css` | `11-platform.js` | 1 |
| `32-effects.js` | `registerTl5PanelSection` | `11-platform.js` | 1 |
| `32-effects.js` | `registerTl5Strings` | `13-i18n.js` | 1 |
| `32-effects.js` | `sceneStatusController` | `30-wallpaper.js` | 1 |
| `32-effects.js` | `subscribeTl5Metrics` | `11-platform.js` | 1 |
| `32-effects.js` | `tl5Diag` | `11-platform.js` | 1 |
| `32-effects.js` | `useTl5I18n` | `13-i18n.js` | 1 |
| `35-context.js` | `ASSET_BASE` | `10-constants.js` | 1 |
| `35-context.js` | `effectsController` | `32-effects.js` | 5 |
| `35-context.js` | `glassController` | `57-glass.js` | 9 |
| `35-context.js` | `layerController` | `30-wallpaper.js` | 4 |
| `35-context.js` | `moduleController` | `11-platform.js` | 3 |
| `35-context.js` | `note` | `10-constants.js` | 18 |
| `35-context.js` | `React` | `10-constants.js` | 62 |
| `35-context.js` | `registerTl5Css` | `11-platform.js` | 1 |
| `35-context.js` | `registerTl5PanelSection` | `11-platform.js` | 1 |
| `35-context.js` | `registerTl5Strings` | `13-i18n.js` | 1 |
| `35-context.js` | `subscribeTl5I18n` | `13-i18n.js` | 1 |
| `35-context.js` | `TL_T` | `13-i18n.js` | 47 |
| `35-context.js` | `TL5_DIAG` | `11-platform.js` | 1 |
| `35-context.js` | `tl5Diag` | `11-platform.js` | 3 |
| `35-context.js` | `useTl5I18n` | `13-i18n.js` | 1 |
| `40-companion.js` | `note` | `10-constants.js` | 53 |
| `40-companion.js` | `petBrainInternal` | `44-pet-brain.js` | 3 |
| `40-companion.js` | `petLlmHintText` | `44-pet-brain.js` | 2 |
| `40-companion.js` | `readRenderTier` | `10-constants.js` | 1 |
| `40-companion.js` | `registerTl5Strings` | `13-i18n.js` | 1 |
| `40-companion.js` | `resolveCompanionArt` | `30-wallpaper.js` | 1 |
| `40-companion.js` | `STORAGE_KEY` | `10-constants.js` | 2 |
| `40-companion.js` | `subscribeTl5I18n` | `13-i18n.js` | 1 |
| `40-companion.js` | `TL_T` | `13-i18n.js` | 47 |
| `40-companion.js` | `tl5OverlayRegister` | `11-platform.js` | 2 |
| `42-life.js` | `ASSET_BASE` | `10-constants.js` | 4 |
| `42-life.js` | `companionDutyBridge` | `40-companion.js` | 10 |
| `42-life.js` | `note` | `10-constants.js` | 36 |
| `42-life.js` | `petBrainInternal` | `44-pet-brain.js` | 6 |
| `42-life.js` | `readRenderTier` | `10-constants.js` | 2 |
| `42-life.js` | `registerTl5Strings` | `13-i18n.js` | 1 |
| `42-life.js` | `TL_T` | `13-i18n.js` | 1 |
| `42-life.js` | `tl5MediaKindFromName` | `11-platform.js` | 1 |
| `44-pet-brain.js` | `ASSET_BASE` | `10-constants.js` | 2 |
| `44-pet-brain.js` | `companionDutyBridge` | `40-companion.js` | 3 |
| `44-pet-brain.js` | `glassDepthController` | `57-glass.js` | 6 |
| `44-pet-brain.js` | `HOST_API` | `10-constants.js` | 1 |
| `44-pet-brain.js` | `lowPowerController` | `55-lowpower.js` | 4 |
| `44-pet-brain.js` | `petChatsRecentContext` | `40-companion.js` | 2 |
| `44-pet-brain.js` | `readRenderTier` | `10-constants.js` | 2 |
| `44-pet-brain.js` | `registerTl5Strings` | `13-i18n.js` | 1 |
| `44-pet-brain.js` | `rememberHostIdentity` | `10-constants.js` | 1 |
| `44-pet-brain.js` | `TL_T` | `13-i18n.js` | 65 |
| `48-pet-agent.js` | `petAgentChatAllowed` | `44-pet-brain.js` | 1 |
| `48-pet-agent.js` | `petAgentPaused` | `44-pet-brain.js` | 1 |
| `48-pet-agent.js` | `petRecordExternal` | `44-pet-brain.js` | 1 |
| `50-rheostat.js` | `note` | `10-constants.js` | 4 |
| `50-rheostat.js` | `React` | `10-constants.js` | 31 |
| `50-rheostat.js` | `registerTl5Strings` | `13-i18n.js` | 1 |
| `50-rheostat.js` | `TL_T` | `13-i18n.js` | 1 |
| `50-rheostat.js` | `useTl5I18n` | `13-i18n.js` | 1 |
| `55-lowpower.js` | `audioController` | `30-wallpaper.js` | 2 |
| `55-lowpower.js` | `note` | `10-constants.js` | 2 |
| `55-lowpower.js` | `railPlayback` | `60-zones.js` | 4 |
| `55-lowpower.js` | `registerTl5Strings` | `13-i18n.js` | 1 |
| `55-lowpower.js` | `scenePlayback` | `30-wallpaper.js` | 4 |
| `55-lowpower.js` | `TL_T` | `13-i18n.js` | 1 |
| `57-glass.js` | `note` | `10-constants.js` | 2 |
| `57-glass.js` | `readRenderTier` | `10-constants.js` | 1 |
| `58-legibility.js` | `DARK_ATTR` | `10-constants.js` | 1 |
| `58-legibility.js` | `note` | `10-constants.js` | 6 |
| `58-legibility.js` | `React` | `10-constants.js` | 20 |
| `58-legibility.js` | `registerTl5Css` | `11-platform.js` | 1 |
| `58-legibility.js` | `registerTl5PanelSection` | `11-platform.js` | 1 |
| `58-legibility.js` | `registerTl5Strings` | `13-i18n.js` | 1 |
| `58-legibility.js` | `tl5Diag` | `11-platform.js` | 2 |
| `58-legibility.js` | `useTl5I18n` | `13-i18n.js` | 1 |
| `58-legibility.js` | `wallpaperController` | `30-wallpaper.js` | 1 |
| `59-splash.js` | `BODY_ATTR` | `10-constants.js` | 2 |
| `59-splash.js` | `installSplashFilm` | `59b-splash-film.js` | 2 |
| `59-splash.js` | `lowPowerController` | `55-lowpower.js` | 3 |
| `59-splash.js` | `note` | `10-constants.js` | 8 |
| `59-splash.js` | `TL_T` | `13-i18n.js` | 2 |
| `59-splash.js` | `tl5Diag` | `11-platform.js` | 12 |
| `59b-splash-film.js` | `PLUGIN_ID` | `10-constants.js` | 1 |
| `59b-splash-film.js` | `TL_BUILD_VERSION` | `10-constants.js` | 2 |
| `60-zones.js` | `railFrameStep` | `10-constants.js` | 1 |
| `60-zones.js` | `wallpaperController` | `30-wallpaper.js` | 2 |
| `70-sidebar.js` | `applyTypography` | `90-font.js` | 2 |
| `70-sidebar.js` | `ASSET_BASE` | `10-constants.js` | 6 |
| `70-sidebar.js` | `audioController` | `30-wallpaper.js` | 6 |
| `70-sidebar.js` | `clampNumber` | `30-wallpaper.js` | 3 |
| `70-sidebar.js` | `CONTEXT_DEFAULTS` | `35-context.js` | 2 |
| `70-sidebar.js` | `contextController` | `35-context.js` | 6 |
| `70-sidebar.js` | `cropWindow` | `60-zones.js` | 1 |
| `70-sidebar.js` | `DARK_ATTR` | `10-constants.js` | 1 |
| `70-sidebar.js` | `EFFECTS_DEFAULTS` | `32-effects.js` | 2 |
| `70-sidebar.js` | `effectsController` | `32-effects.js` | 6 |
| `70-sidebar.js` | `glassController` | `57-glass.js` | 6 |
| `70-sidebar.js` | `HOST_API` | `10-constants.js` | 1 |
| `70-sidebar.js` | `LAYER_BLEND_LABELS` | `30-wallpaper.js` | 1 |
| `70-sidebar.js` | `LAYER_LABELS` | `30-wallpaper.js` | 2 |
| `70-sidebar.js` | `layerController` | `30-wallpaper.js` | 5 |
| `70-sidebar.js` | `LEGIBILITY_DEFAULTS` | `58-legibility.js` | 2 |
| `70-sidebar.js` | `legibilityController` | `58-legibility.js` | 6 |
| `70-sidebar.js` | `LIBRARY_TAG_LENGTH` | `30-wallpaper.js` | 1 |
| `70-sidebar.js` | `LIBRARY_TAG_MAX` | `30-wallpaper.js` | 1 |
| `70-sidebar.js` | `listWallpapers` | `30-wallpaper.js` | 4 |
| `70-sidebar.js` | `lowPowerController` | `55-lowpower.js` | 8 |
| `70-sidebar.js` | `normalizeZones` | `60-zones.js` | 1 |
| `70-sidebar.js` | `note` | `10-constants.js` | 4 |
| `70-sidebar.js` | `playbackController` | `30-wallpaper.js` | 4 |
| `70-sidebar.js` | `probeUrlKind` | `30-wallpaper.js` | 1 |
| `70-sidebar.js` | `PROVIDERS` | `30-wallpaper.js` | 1 |
| `70-sidebar.js` | `RATIOS` | `60-zones.js` | 1 |
| `70-sidebar.js` | `React` | `10-constants.js` | 360 |
| `70-sidebar.js` | `readGlass` | `57-glass.js` | 2 |
| `70-sidebar.js` | `readLowPowerMode` | `55-lowpower.js` | 3 |
| `70-sidebar.js` | `readTypography` | `90-font.js` | 4 |
| `70-sidebar.js` | `readWallpaperChoice` | `30-wallpaper.js` | 3 |
| `70-sidebar.js` | `readZones` | `60-zones.js` | 2 |
| `70-sidebar.js` | `registerTl5Css` | `11-platform.js` | 1 |
| `70-sidebar.js` | `registerTl5Strings` | `13-i18n.js` | 1 |
| `70-sidebar.js` | `rememberHostIdentity` | `10-constants.js` | 1 |
| `70-sidebar.js` | `renderTierController` | `10-constants.js` | 2 |
| `70-sidebar.js` | `resolveWallpaperChoice` | `30-wallpaper.js` | 1 |
| `70-sidebar.js` | `ROTATION_INTERVALS` | `30-wallpaper.js` | 1 |
| `70-sidebar.js` | `rotationController` | `30-wallpaper.js` | 6 |
| `70-sidebar.js` | `sampleVideoFrames` | `30-wallpaper.js` | 1 |
| `70-sidebar.js` | `sceneStatusController` | `30-wallpaper.js` | 2 |
| `70-sidebar.js` | `settingsStore` | `12-schema.js` | 6 |
| `70-sidebar.js` | `SHADER_DEFAULTS` | `30-wallpaper.js` | 3 |
| `70-sidebar.js` | `SHADER_PRESETS` | `30-wallpaper.js` | 3 |
| `70-sidebar.js` | `SHADER_SOURCES` | `30-wallpaper.js` | 2 |
| `70-sidebar.js` | `shaderController` | `30-wallpaper.js` | 4 |
| `70-sidebar.js` | `subscribeTl5I18n` | `13-i18n.js` | 1 |
| `70-sidebar.js` | `TL_T` | `13-i18n.js` | 3 |
| `70-sidebar.js` | `tl5MediaKindFromName` | `11-platform.js` | 1 |
| `70-sidebar.js` | `tl5OverlayOpenAllowed` | `11-platform.js` | 2 |
| `70-sidebar.js` | `tl5OverlayRegister` | `11-platform.js` | 1 |
| `70-sidebar.js` | `tl5ReadRecent` | `11-platform.js` | 1 |
| `70-sidebar.js` | `tl5RememberRecent` | `11-platform.js` | 1 |
| `70-sidebar.js` | `tl5SampleWallpaperPalette` | `11-platform.js` | 1 |
| `70-sidebar.js` | `tl5ValidateUploadFile` | `11-platform.js` | 1 |
| `70-sidebar.js` | `UPLOAD_LIMIT` | `10-constants.js` | 1 |
| `70-sidebar.js` | `useTl5I18n` | `13-i18n.js` | 1 |
| `70-sidebar.js` | `validateShaderSource` | `30-wallpaper.js` | 2 |
| `70-sidebar.js` | `wallpaperController` | `30-wallpaper.js` | 8 |
| `70-sidebar.js` | `wallpaperLibraryController` | `30-wallpaper.js` | 2 |
| `70-sidebar.js` | `zoneController` | `60-zones.js` | 16 |
| `72-we-library.js` | `ASSET_BASE` | `10-constants.js` | 1 |
| `72-we-library.js` | `note` | `10-constants.js` | 18 |
| `72-we-library.js` | `React` | `10-constants.js` | 67 |
| `72-we-library.js` | `readWallpaperChoice` | `30-wallpaper.js` | 2 |
| `72-we-library.js` | `registerTl5Css` | `11-platform.js` | 1 |
| `72-we-library.js` | `registerTl5Strings` | `13-i18n.js` | 1 |
| `72-we-library.js` | `subscribeTl5I18n` | `13-i18n.js` | 2 |
| `72-we-library.js` | `TL_T` | `13-i18n.js` | 14 |
| `72-we-library.js` | `tl5Diag` | `11-platform.js` | 12 |
| `72-we-library.js` | `tl5OverlayRegister` | `11-platform.js` | 1 |
| `72-we-library.js` | `tl5RememberRecent` | `11-platform.js` | 1 |
| `72-we-library.js` | `useTl5I18n` | `13-i18n.js` | 4 |
| `72-we-library.js` | `wallpaperController` | `30-wallpaper.js` | 4 |
| `76-role-hub.js` | `ASSET_BASE` | `10-constants.js` | 2 |
| `76-role-hub.js` | `glassDepthController` | `57-glass.js` | 2 |
| `76-role-hub.js` | `HOST_API` | `10-constants.js` | 3 |
| `76-role-hub.js` | `hostIdentity` | `10-constants.js` | 5 |
| `76-role-hub.js` | `petAgentInternal` | `48-pet-agent.js` | 3 |
| `76-role-hub.js` | `petBrainInternal` | `44-pet-brain.js` | 3 |
| `76-role-hub.js` | `petLlmHintText` | `44-pet-brain.js` | 2 |
| `76-role-hub.js` | `readSplashForceMotion` | `59-splash.js` | 2 |
| `76-role-hub.js` | `readSplashSound` | `59-splash.js` | 2 |
| `76-role-hub.js` | `readSplashStyle` | `59-splash.js` | 2 |
| `76-role-hub.js` | `registerTl5Strings` | `13-i18n.js` | 1 |
| `76-role-hub.js` | `setSplashForceMotion` | `59-splash.js` | 1 |
| `76-role-hub.js` | `setSplashSound` | `59-splash.js` | 1 |
| `76-role-hub.js` | `setSplashStyle` | `59-splash.js` | 1 |
| `76-role-hub.js` | `TL_T` | `13-i18n.js` | 410 |
| `76-role-hub.js` | `tl5ApplyDefaultAppearance` | `12-schema.js` | 1 |
| `76-role-hub.js` | `tl5OverlayRegister` | `11-platform.js` | 1 |
| `76-role-hub.js` | `tl5ValidateUploadFile` | `11-platform.js` | 1 |
| `90-font.js` | `DARK_ATTR` | `10-constants.js` | 1 |
| `90-font.js` | `LEGIBILITY_THRESHOLD_MAX` | `58-legibility.js` | 2 |
| `90-font.js` | `LEGIBILITY_THRESHOLD_MIN` | `58-legibility.js` | 3 |
| `90-font.js` | `legibilityController` | `58-legibility.js` | 4 |
| `90-font.js` | `React` | `10-constants.js` | 35 |
| `90-font.js` | `registerTl5Css` | `11-platform.js` | 1 |
| `90-font.js` | `registerTl5Strings` | `13-i18n.js` | 1 |
| `90-font.js` | `tl5OverlayOpenAllowed` | `11-platform.js` | 2 |
| `90-font.js` | `tl5OverlayRegister` | `11-platform.js` | 1 |
| `90-font.js` | `tl5SampleWallpaperPalette` | `11-platform.js` | 1 |
| `90-font.js` | `useTl5I18n` | `13-i18n.js` | 2 |
| `95-a11y.js` | `note` | `10-constants.js` | 3 |
| `95-a11y.js` | `React` | `10-constants.js` | 11 |
| `95-a11y.js` | `registerTl5Css` | `11-platform.js` | 1 |
| `95-a11y.js` | `registerTl5PanelSection` | `11-platform.js` | 1 |
| `95-a11y.js` | `registerTl5Strings` | `13-i18n.js` | 1 |
| `95-a11y.js` | `subscribeTl5I18n` | `13-i18n.js` | 1 |
| `95-a11y.js` | `TL_T` | `13-i18n.js` | 8 |
| `95-a11y.js` | `tl5OverlayModalAbove` | `11-platform.js` | 2 |
| `95-a11y.js` | `tl5OverlayOpenAllowed` | `11-platform.js` | 4 |
| `95-a11y.js` | `useTl5I18n` | `13-i18n.js` | 1 |
| `99-apply.js` | `BODY_ATTR` | `10-constants.js` | 3 |
| `99-apply.js` | `bootstrapSettingsRuntime` | `12-schema.js` | 1 |
| `99-apply.js` | `createModuleRuntime` | `11-platform.js` | 1 |
| `99-apply.js` | `CSS_TAG_ID` | `10-constants.js` | 1 |
| `99-apply.js` | `detectDshFeatures` | `65-bridge.js` | 1 |
| `99-apply.js` | `dutyChannelStatus` | `40-companion.js` | 1 |
| `99-apply.js` | `glassDepthController` | `57-glass.js` | 3 |
| `99-apply.js` | `installAccessibility` | `95-a11y.js` | 1 |
| `99-apply.js` | `installAudioRuntime` | `31-engine-extra.js` | 1 |
| `99-apply.js` | `installCompanion` | `40-companion.js` | 1 |
| `99-apply.js` | `installContextRuntime` | `35-context.js` | 1 |
| `99-apply.js` | `installDutyChannel` | `40-companion.js` | 1 |
| `99-apply.js` | `installEffectsLayer` | `32-effects.js` | 1 |
| `99-apply.js` | `installEffortRheostat` | `50-rheostat.js` | 1 |
| `99-apply.js` | `installFontPanel` | `90-font.js` | 1 |
| `99-apply.js` | `installGlassDepth` | `57-glass.js` | 1 |
| `99-apply.js` | `installGlassOpacity` | `57-glass.js` | 1 |
| `99-apply.js` | `installI18nRuntime` | `13-i18n.js` | 1 |
| `99-apply.js` | `installLegibilityGuard` | `58-legibility.js` | 1 |
| `99-apply.js` | `installLifeRhythm` | `42-life.js` | 1 |
| `99-apply.js` | `installLowPower` | `55-lowpower.js` | 1 |
| `99-apply.js` | `installPetAgent` | `48-pet-agent.js` | 1 |
| `99-apply.js` | `installPetBrain` | `44-pet-brain.js` | 1 |
| `99-apply.js` | `installRoleHub` | `76-role-hub.js` | 1 |
| `99-apply.js` | `installScene` | `30-wallpaper.js` | 1 |
| `99-apply.js` | `installSelectorBridge` | `65-bridge.js` | 1 |
| `99-apply.js` | `installSettingsRuntime` | `12-schema.js` | 1 |
| `99-apply.js` | `installSplashEntry` | `59-splash.js` | 1 |
| `99-apply.js` | `installStyles` | `20-stylesheet.js` | 1 |
| `99-apply.js` | `installWallpaperSidebar` | `70-sidebar.js` | 1 |
| `99-apply.js` | `installWeatherChip` | `35-context.js` | 1 |
| `99-apply.js` | `installWeLibrary` | `72-we-library.js` | 1 |
| `99-apply.js` | `installZoneFraming` | `60-zones.js` | 1 |
| `99-apply.js` | `moduleController` | `11-platform.js` | 6 |
| `99-apply.js` | `note` | `10-constants.js` | 14 |
| `99-apply.js` | `settingsStore` | `12-schema.js` | 1 |
| `99-apply.js` | `splashStatus` | `59-splash.js` | 1 |
| `99-apply.js` | `syncModulesAttr` | `11-platform.js` | 1 |
| `99-apply.js` | `TL5_DIAG` | `11-platform.js` | 1 |
| `99-apply.js` | `TL5_METRICS` | `11-platform.js` | 1 |
| `99-apply.js` | `TL5_MODULES_ATTR` | `11-platform.js` | 2 |
| `99-apply.js` | `tl5ActiveLanguage` | `13-i18n.js` | 1 |
| `99-apply.js` | `tl5Diag` | `11-platform.js` | 1 |
| `99-apply.js` | `tl5Language` | `13-i18n.js` | 1 |

## 4. 依赖边

| 来自 | 指向 | 名字数 | 次数 |
| --- | --- | --- | --- |
| `11-platform.js` | `10-constants.js` | 1 | 5 |
| `11-platform.js` | `30-wallpaper.js` | 1 | 2 |
| `12-schema.js` | `10-constants.js` | 3 | 48 |
| `12-schema.js` | `11-platform.js` | 6 | 23 |
| `12-schema.js` | `13-i18n.js` | 5 | 6 |
| `13-i18n.js` | `10-constants.js` | 2 | 6 |
| `13-i18n.js` | `11-platform.js` | 1 | 1 |
| `13-i18n.js` | `12-schema.js` | 1 | 2 |
| `20-stylesheet.js` | `10-constants.js` | 2 | 3 |
| `20-stylesheet.js` | `11-platform.js` | 1 | 1 |
| `30-wallpaper.js` | `10-constants.js` | 3 | 17 |
| `30-wallpaper.js` | `11-platform.js` | 3 | 12 |
| `30-wallpaper.js` | `13-i18n.js` | 2 | 68 |
| `30-wallpaper.js` | `31-engine-extra.js` | 1 | 4 |
| `30-wallpaper.js` | `35-context.js` | 1 | 4 |
| `30-wallpaper.js` | `55-lowpower.js` | 1 | 3 |
| `31-engine-extra.js` | `10-constants.js` | 3 | 87 |
| `31-engine-extra.js` | `11-platform.js` | 5 | 22 |
| `31-engine-extra.js` | `13-i18n.js` | 3 | 10 |
| `31-engine-extra.js` | `30-wallpaper.js` | 6 | 52 |
| `31-engine-extra.js` | `32-effects.js` | 1 | 4 |
| `31-engine-extra.js` | `35-context.js` | 1 | 11 |
| `32-effects.js` | `10-constants.js` | 2 | 27 |
| `32-effects.js` | `11-platform.js` | 5 | 5 |
| `32-effects.js` | `13-i18n.js` | 2 | 2 |
| `32-effects.js` | `30-wallpaper.js` | 1 | 1 |
| `32-effects.js` | `55-lowpower.js` | 1 | 3 |
| `35-context.js` | `10-constants.js` | 3 | 81 |
| `35-context.js` | `11-platform.js` | 5 | 9 |
| `35-context.js` | `13-i18n.js` | 4 | 50 |
| `35-context.js` | `30-wallpaper.js` | 1 | 4 |
| `35-context.js` | `32-effects.js` | 1 | 5 |
| `35-context.js` | `57-glass.js` | 1 | 9 |
| `40-companion.js` | `10-constants.js` | 3 | 56 |
| `40-companion.js` | `11-platform.js` | 1 | 2 |
| `40-companion.js` | `13-i18n.js` | 3 | 49 |
| `40-companion.js` | `30-wallpaper.js` | 1 | 1 |
| `40-companion.js` | `44-pet-brain.js` | 2 | 5 |
| `42-life.js` | `10-constants.js` | 3 | 42 |
| `42-life.js` | `11-platform.js` | 1 | 1 |
| `42-life.js` | `13-i18n.js` | 2 | 2 |
| `42-life.js` | `40-companion.js` | 1 | 10 |
| `42-life.js` | `44-pet-brain.js` | 1 | 6 |
| `44-pet-brain.js` | `10-constants.js` | 4 | 6 |
| `44-pet-brain.js` | `13-i18n.js` | 2 | 66 |
| `44-pet-brain.js` | `40-companion.js` | 2 | 5 |
| `44-pet-brain.js` | `55-lowpower.js` | 1 | 4 |
| `44-pet-brain.js` | `57-glass.js` | 1 | 6 |
| `48-pet-agent.js` | `44-pet-brain.js` | 3 | 3 |
| `50-rheostat.js` | `10-constants.js` | 2 | 35 |
| `50-rheostat.js` | `13-i18n.js` | 3 | 3 |
| `55-lowpower.js` | `10-constants.js` | 1 | 2 |
| `55-lowpower.js` | `13-i18n.js` | 2 | 2 |
| `55-lowpower.js` | `30-wallpaper.js` | 2 | 6 |
| `55-lowpower.js` | `60-zones.js` | 1 | 4 |
| `57-glass.js` | `10-constants.js` | 2 | 3 |
| `58-legibility.js` | `10-constants.js` | 3 | 27 |
| `58-legibility.js` | `11-platform.js` | 3 | 4 |
| `58-legibility.js` | `13-i18n.js` | 2 | 2 |
| `58-legibility.js` | `30-wallpaper.js` | 1 | 1 |
| `59-splash.js` | `10-constants.js` | 2 | 10 |
| `59-splash.js` | `11-platform.js` | 1 | 12 |
| `59-splash.js` | `13-i18n.js` | 1 | 2 |
| `59-splash.js` | `55-lowpower.js` | 1 | 3 |
| `59-splash.js` | `59b-splash-film.js` | 1 | 2 |
| `59b-splash-film.js` | `10-constants.js` | 2 | 3 |
| `60-zones.js` | `10-constants.js` | 1 | 1 |
| `60-zones.js` | `30-wallpaper.js` | 1 | 2 |
| `70-sidebar.js` | `10-constants.js` | 8 | 376 |
| `70-sidebar.js` | `11-platform.js` | 8 | 9 |
| `70-sidebar.js` | `12-schema.js` | 1 | 6 |
| `70-sidebar.js` | `13-i18n.js` | 4 | 6 |
| `70-sidebar.js` | `30-wallpaper.js` | 24 | 67 |
| `70-sidebar.js` | `32-effects.js` | 2 | 8 |
| `70-sidebar.js` | `35-context.js` | 2 | 8 |
| `70-sidebar.js` | `55-lowpower.js` | 2 | 11 |
| `70-sidebar.js` | `57-glass.js` | 2 | 8 |
| `70-sidebar.js` | `58-legibility.js` | 2 | 8 |
| `70-sidebar.js` | `60-zones.js` | 5 | 21 |
| `70-sidebar.js` | `90-font.js` | 2 | 6 |
| `72-we-library.js` | `10-constants.js` | 3 | 86 |
| `72-we-library.js` | `11-platform.js` | 4 | 15 |
| `72-we-library.js` | `13-i18n.js` | 4 | 21 |
| `72-we-library.js` | `30-wallpaper.js` | 2 | 6 |
| `76-role-hub.js` | `10-constants.js` | 3 | 10 |
| `76-role-hub.js` | `11-platform.js` | 2 | 2 |
| `76-role-hub.js` | `12-schema.js` | 1 | 1 |
| `76-role-hub.js` | `13-i18n.js` | 2 | 411 |
| `76-role-hub.js` | `44-pet-brain.js` | 2 | 5 |
| `76-role-hub.js` | `48-pet-agent.js` | 1 | 3 |
| `76-role-hub.js` | `57-glass.js` | 1 | 2 |
| `76-role-hub.js` | `59-splash.js` | 6 | 9 |
| `90-font.js` | `10-constants.js` | 2 | 36 |
| `90-font.js` | `11-platform.js` | 4 | 5 |
| `90-font.js` | `13-i18n.js` | 2 | 3 |
| `90-font.js` | `58-legibility.js` | 3 | 9 |
| `95-a11y.js` | `10-constants.js` | 2 | 14 |
| `95-a11y.js` | `11-platform.js` | 4 | 8 |
| `95-a11y.js` | `13-i18n.js` | 4 | 11 |
| `99-apply.js` | `10-constants.js` | 3 | 18 |
| `99-apply.js` | `11-platform.js` | 7 | 13 |
| `99-apply.js` | `12-schema.js` | 3 | 3 |
| `99-apply.js` | `13-i18n.js` | 3 | 3 |
| `99-apply.js` | `20-stylesheet.js` | 1 | 1 |
| `99-apply.js` | `30-wallpaper.js` | 1 | 1 |
| `99-apply.js` | `31-engine-extra.js` | 1 | 1 |
| `99-apply.js` | `32-effects.js` | 1 | 1 |
| `99-apply.js` | `35-context.js` | 2 | 2 |
| `99-apply.js` | `40-companion.js` | 3 | 3 |
| `99-apply.js` | `42-life.js` | 1 | 1 |
| `99-apply.js` | `44-pet-brain.js` | 1 | 1 |
| `99-apply.js` | `48-pet-agent.js` | 1 | 1 |
| `99-apply.js` | `50-rheostat.js` | 1 | 1 |
| `99-apply.js` | `55-lowpower.js` | 1 | 1 |
| `99-apply.js` | `57-glass.js` | 3 | 5 |
| `99-apply.js` | `58-legibility.js` | 1 | 1 |
| `99-apply.js` | `59-splash.js` | 2 | 2 |
| `99-apply.js` | `60-zones.js` | 1 | 1 |
| `99-apply.js` | `65-bridge.js` | 2 | 2 |
| `99-apply.js` | `70-sidebar.js` | 1 | 1 |
| `99-apply.js` | `72-we-library.js` | 1 | 1 |
| `99-apply.js` | `76-role-hub.js` | 1 | 1 |
| `99-apply.js` | `90-font.js` | 1 | 1 |
| `99-apply.js` | `95-a11y.js` | 1 | 1 |
