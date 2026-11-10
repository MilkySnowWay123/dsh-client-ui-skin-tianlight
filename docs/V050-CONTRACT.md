# v0.5.0 并行开发契约

> 本文是多个工作流同时改 `src/` 时的接口契约。任何一方都不得改动别人的
> fragment 文件，也不得把功能塞进自己的文件之外。所有扩展点都在
> `src/11-platform.js` / `src/13-i18n.js` / `src/12-schema.js` 定义。

## 1. 分片所有权（write scope）

| 文件 | 所有者 | 区域 |
|---|---|---|
| `src/00-envelope.js` `10-constants.js` `11-platform.js` `13-i18n.js` `20-stylesheet.js` `99-apply.js` `tools/build.mjs` `tools/structure.mjs` `tools/audit.mjs` `tools/check-css.mjs` `tools/verify.mjs` | Lead | — |
| `src/12-schema.js` | platform-core | schema |
| `lib/index.js` `lib/*.js`（宿主）`tools/test.mjs` | host-core | 宿主 |
| `src/40-companion.js` `src/50-rheostat.js`（仅 i18n 文案） | type-i18n | — |
| `src/30-wallpaper.js` `src/31-engine-extra.js` | wallpaper-engine | wallpaper / wallpaper engine extras |
| `src/32-effects.js` `src/35-context.js` | effects-context | ambient effects / smart context |
| `src/70-sidebar.js` | panel-library | wallpaper sidebar |
| `src/58-legibility.js` `src/90-font.js` `src/95-a11y.js` | type-i18n | legibility / font panel / accessibility |
| `docs/**` `presets/**` `.github/**` `tools/release.mjs`（新增） | release-docs（后期） | — |

**只改自己的文件。** 需要别的文件加一行钩子时，用消息告诉 Lead，由 Lead 改。

## 2. 注册表（src/11-platform.js）

```js
// 模块开关
moduleController.state() / isEnabled(id) / set(id, boolean) / subscribe(fn) / list()
// 面板扩展分区：Component 无 props，自己渲染 <details class="tl-wall-group">
registerTl5PanelSection({ id, order, title: "section.xxx", Component })
// 样式块：CSS 必须全部以 body[data-dsh-tianlight] 作用域开头
registerTl5Css(String.raw`
body[data-dsh-tianlight] ... { ... }
`)
// 指标 / 诊断（面板工程分区只读）
publishTl5Metrics({ fps, jitter, tier, lowPower, ... })
subscribeTl5Metrics(fn)
tl5Diag("effects", { ... })
```

## 3. i18n（src/13-i18n.js）

```js
registerTl5Strings({ zh: { "panel.foo": "…" }, en: { "panel.foo": "…" } }) // 顶层调用
TL_T("panel.foo", { n: 3 })                   // 组件外/内都可用
const { t, lang, mode, setLanguage } = useTl5I18n() // React 组件内，语言变化自动重渲染
```
新 UI 的所有文案都必须走 `TL_T`/`t`，key 前缀按分区（`fx.*` `ctx.*` `audio.*`
`lib.*` `settings.*` `typo.*` `a11y.*`）。旧文案可以保留中文，但新增文案一律双语。

## 4. 设置（src/12-schema.js，platform-core 实现）

```js
schemaRuntime.report()   // { from, to, migrated:[key], failed:[key] }
settingsStore.status()   // { host, revision, pending, lastError, migrated }
settingsStore.bootstrap() / forceSync() / subscribe(fn)
```
其他片段**继续同步读 localStorage**（迁移与宿主导入在 apply 里 await 完成），
写入继续用 `localStorage.setItem`，镜像层自动同步到宿主。宿主设置权威字段是
`localStorage` 里的 `tianlight.*` / `dsh-tianlight:*` 字符串，原样保存。

## 5. DOM 约定（不要抢别人的选择器）

| 层 | 属性 | 所有者 |
|---|---|---|
| 场景 | `[data-tl-scene]` | 30-wallpaper |
| 特效 canvas（视差/点击/氛围） | `[data-tl-fx]` | 32-effects |
| 网页壁纸 iframe | `[data-tl-web]` | 31-engine-extra |
| 可读性护栏标记 | `body[data-tl-legibility]` | 58-legibility |
| a11y 直播区 | `[data-tl-a11y-live]` | 95-a11y |
| 模块状态 | `body[data-tl-modules="wallpaper effects …"]` | 11-platform |
| 语言 | `body[data-tl-lang="zh|en"]` | 13-i18n |

## 6. 宿主路由契约（host-core 实现，client 消费）

前缀 `/skin-tianlight`：

| 路由 | 方法 | 说明 |
|---|---|---|
| `_settings` | GET | `{ok, schemaVersion, revision, updatedAt, settings:{key:string|null}}` |
| `_settings` | PUT | body `{revision?, settings:{key:string|null}}`；只接受 `tianlight.` / `dsh-tianlight:` 前缀；最大 256KB；原子写 `<plugin>/state/settings.json`；返回 `{revision, updatedAt}` |
| `_bundle` | GET | 导出 tar.gz：`manifest.json`（版本/时间/启用模块/配方）+ `settings.json` + `wallpapers/*`；流式 |
| `_import` | POST | body=tgz 字节；校验路径/大小/扩展名；解到 `assets/uploads/` 与设置；返回 `{imported:[], skipped:[], settings:{...}}` |
| `_frame-cache?key=` | GET/HEAD | 预裁剪静态帧（JPEG/WebP），未命中 404 |
| `_frame-cache?key=` | POST | 原始图片字节；上限 8MB；原子落盘 `state/frame-cache/` |
| `_frame-cache` | DELETE | 清空缓存，返回 `{cleared, bytes}` |
| `_frame-cache/status` | GET | `{entries, bytes, hits, misses, maxBytes}` |
| `_transcode` | POST | `?name=`，仅在 ffmpeg 存在时可用；返回 `{ok, output, note}`；缺失 501 |
| `_transcode/status` | GET | `{ffmpeg, version}` |
| `_web-project/<rootIndex>/<dir>/...` | GET | WE web 项目文件；CSP `sandbox allow-scripts`；路径逐段校验 |
| `_engines` | GET | 追加 `ffmpeg, cache:{...}, settings:{revision}, capabilities` |

`_engines.build` 必须是 `0.5.0`（与 `src/10-constants.js` 的 `HOST_BUILD` 一致）。
所有新模块先在 `tools/test.mjs` 里加纯函数单测。

## 7. 编码与检查纪律

- 只改自己的 fragment；改完跑 `node tools/agent-check.mjs`（构建到
  `diag/tmp/agent-check-client.mjs`，不碰 `lib/client.js`）。
- 不要运行 `npm run check`（共享产物会因别人未完成的分片而红）；Lead 负责整合构建。
- **不要用 PowerShell 写中文**；用文件工具或 Node。
- 新增长生命周期监听器/定时器必须成对清理（`audit.mjs` 会数
  `window/document.add/removeEventListener`、`window.setTimeout/clearTimeout`）。
  倾向用 `window.setTimeout` 而不是 `globalThis.setTimeout`（前者被审计覆盖）。
- 异常只记 `note("[ui-skin-tianlight] …")`，绝不让单功能抛穿 `apply()`。
- 一次只改一处，改完立刻 `node tools/agent-check.mjs`。
- 提交由 Lead 统一做；不要 git commit / git checkout / git revert。
- 大文件/媒体不要加到 repo；测试用临时目录（`diag/tmp/`）。

## 8. 共同验收

1. 模块关闭后无对应 DOM、无监听器残留（`dispose` 可重复调用）。
2. 低功耗/`prefers-reduced-motion` 时不产生持续 rAF。
3. 每个新路由有失败路径（400/404/413/415/501），不把堆栈回给浏览器。
4. 面板新增分区在 `body[data-dsh-tianlight]` 下，Esc/Alt+W 行为不变。
5. 三个 DSH 版本（0.2.0-rc.2 / 0.2.1-rc.5 / 0.2.2-rc.1）共用同一份构建，不写版本分支。
