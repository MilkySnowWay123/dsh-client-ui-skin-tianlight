# 架构

这个插件是 **DSH Web 皮肤 + 一组自建控件**，不是独立应用。两半分工明确，升级风险各自可控。

## 两半

| 半 | 文件 | 运行位置 | 职责 |
|---|---|---|---|
| 宿主半 | `lib/index.js` + `http-media.js` / `media-types.js` / `upload.js` / `scene-project.js` / `scene-frame.html` | DSH 进程内 | 注册 `/skin-tianlight` 前缀路由：素材字节流（Range/206/416/ETag）、壁纸清单 `_wallpapers`、素材清单 `_manifest`、上传 `_upload`、场景清单/文件、WebWallGL 引擎与适配页 |
| 浏览器半 | `src/` → `lib/client.js` | Web 页面内 | 样式注入、壁纸场景（视频/图片/GLSL/场景 iframe）、桌宠、推理滑杆、六段壁纸面板（含收藏/标签/隐藏/上传/Shader/轮播）、字体面板、选择器桥接 |

浏览器半的产物必须是一个用 `window.__ModuleLoader__.load({ id, factory })` 封装的 ESM 单文件——这是加载器的契约，不是风格选择。源码按 region 拆在 `src/`，构建产物仍是这一份。

## 宿主半的分层

`lib/index.js` 只做「路由表 + 配置」；具体机制各自成模块，避免再次长回单文件：

```text
http-media.js    sendJson/sendText/parseRange/servePath/pipeFile（Range/ETag/HEAD 唯一实现）
media-types.js   MIME、扩展名白名单、SAFE_NAME、safeJoin、fileSize
upload.js        受控上传：文件名清洗、512MB 流式上限、.part-* 原子落盘、同名序号
scene-project.js WE 场景发现、逐段路径校验、场景文件扩展名白名单
scene-frame.html 沙箱适配页：加载 WebWallGL、mount、pause/resume、统计上报
```

引擎是 `vendor/webwallgl/` 的可选 MIT 依赖，**不内联进 client.js**；缺失时只是场景清单不可用，视频/图片/GLSL 不受影响。

## 浏览器半的分区

`src/` 片段按 `//#region` 分区，顺序即依赖顺序；产物 `lib/client.js` 保留同样的 region 标记（`tools/structure.mjs` 校验产物）。

```text
constants           常量：路由前缀、body 属性、存储键、渲染帧率档位、候选名单
stylesheet          整张样式表（模板字符串）+ installStyles
wallpaper           场景、视频/图片/GLSL/场景 iframe 四通道、播放状态总线、看门狗、静态帧、双槽叠加层、麦克风音频分析、壁纸解算、取色、收藏/标签/隐藏库、上传、自动轮播
companion           薄荷小猫：拖拽、呼吸、互动菜单、台词
reasoning rheostat  推理档位滑杆：远程契约读取、弹簧、乐观拖动
low power           省电自适应：电量/省流量/减少动效 → 暂停壁纸与镜像
glass opacity       玻璃总倍率（--tl-glass-m）
zone framing        取景裁切 + 侧栏 canvas 镜像（独立侧栏时按需 rAF）
selector bridge     结构发现 + 自盖章，抗哈希变更
wallpaper sidebar   壁纸面板（六段折叠、来源引导卡、六步摘要、粘性头、画质提示、顶部拖拽、精选配方）、拖动吸附、光效、取色
font panel          排版卡片：预览、字号/字族/排版分组、滚动上限
```

**规则**：新功能必须落在对应区域内；跨区共享的东西放 `constants`，不要从别的区偷函数。

## 源码与构建

`lib/client.js` 是产物，源码在 `src/`：按 region 切分的普通脚本片段（无 import/export），
由 `tools/build.mjs` 按显式顺序拼回同一个 factory 闭包。产物仍必须提交——profile 的
junction 直接加载它。

- `node tools/build.mjs`：重新生成 `lib/client.js`
- `node tools/build.mjs --check`：产物落后于 `src/` 时退出 1（`npm run check` 已包含）
- `node tools/build.mjs --out <file>`：构建到暂存路径（沙箱/打包环境用）
- 片段顺序只由 `build.mjs` 里的数组决定，不依赖文件系统排序

## 生命周期

`apply(ctx)` 是唯一入口，整体包在 `try/catch` 里——异常只记警告，绝不把插件标记为致命失败，因此**皮肤坏了也不会让 DSH 进不去**。

每个功能都是一个 `ctx.effect(fn, label)`，`fn` 返回清理函数。注册顺序固定：

```text
stylesheet -> glass opacity -> low power -> selector bridge -> body 属性
-> 壁纸 -> 分区取景 -> 桌宠 -> 推理滑杆 -> 字体面板 -> 壁纸侧栏
```

`body` 属性在自己的 effect 里成对设置/移除，并且在壁纸、桌宠等可能抛错的安装器之前注册。

壁纸 effect 内部还拥有：播放状态总线、60 秒看门狗、场景 iframe 的超时/消息监听、轮播定时器。它们的清理都挂在 `installScene` 返回的 disposer 上（`clearRetry` / `clearInterval` / `removeEventListener` / `stopSceneFrame`），`audit.mjs` 会核对监听器与定时器平衡。

## 数据流

```text
宿主路由  --fetch-->  壁纸解算  --choice-->  场景（video / photo / shader / scene iframe）
                                     |
                                     +--> 取色（canvas 32x18）--> CSS 变量 --> 面板/光效
                                     +--> 播放状态总线 --> 顶部状态行 / 恢复按钮
                                     +--> 轮播（可见且未暂停时按间隔换源）
上传 --POST /_upload--> assets/uploads/ --> _wallpapers --> 清单
WE roots --> _wallpapers(scene) --> 场景 iframe(_scene-frame) --> WebWallGL --> postMessage 状态
localStorage  保存：壁纸选择、取景、玻璃、省电、收藏/标签/隐藏、排版模型、面板位置、播放/滤镜、轮播、桌宠状态
```

写入侧（推理档位）走 `remote.session.selectModel`，读取侧走 `modelCatalog`；两者都在 `tools/verify.mjs` 的契约断言里。

## 不变量（会被自动校验）

| 不变量 | 校验者 |
|---|---|
| 分区齐全且顺序正确 | `structure.mjs` |
| 产物与 `src/` 一致 | `build.mjs --check`（`npm run check`） |
| `apply()` 的 effect 顺序 | `structure.mjs` + `audit.mjs` |
| `apply()` 的 try/catch 边界 | `structure.mjs` |
| 全局监听器/定时器成对释放 | `audit.mjs` |
| 无 Hook 在 early return 之后 | `audit.mjs` |
| `--tl-*` 变量声明与使用一致 | `audit.mjs` |
| 素材路由的 Range/穿越/HEAD 行为 | `test.mjs` + `verify.mjs` |
| 上传的文件名/大小/扩展名/穿越拒绝 | `test.mjs` + `verify.mjs` |
| 场景目录发现、逐段包含、扩展名白名单 | `test.mjs` + `verify.mjs` |
| 引擎/适配页存在且带 CSP | `verify.mjs` |
| 场景 iframe 的 `event.source` 校验 | 代码审计（`onSceneMessage`） |
| 皮肤对当前 DSH 的 15 项假设 | `upgrade-check.mjs` |
| 哈希选择器是否仍存在 | `resolve-selectors.mjs` |

## 升级策略（四层）

1. `apply()` 的 try/catch —— 绝不炸穿页面
2. `upgrade-check.mjs` —— 15 项假设，分 FAIL（致命）/ WARN（降级）
3. `resolve-selectors.mjs` —— 哈希失效时报告候选
4. **结构桥接** —— 按结构发现元素并盖 `data-tl-*`，哈希变了样式仍生效

第 4 层是长期方向：随着桥接稳定，硬编码哈希可以逐步删掉。

## 长期路线

- [x] 把 `lib/client.js` 拆成 `src/` 多模块 + 构建步骤（加载器仍只吃单文件产物）
- [ ] 客户端纯逻辑（取色数学、弹簧积分）抽成可单测模块
- [ ] 桥接覆盖率提升到全部表面后，删除硬编码哈希选择器
- [x] 删除 `lib/index.js` 中已无调用方的 `_diag` 路由
- [x] 宿主拆出 http/media/upload/scene 模块，引擎作为可选 vendor
- [x] 播放状态总线 + 看门狗 + 轮播 + 隐藏/上传
- [ ] 客户端纯逻辑（取色数学、弹簧积分、轮播选片）抽成可单测模块
- [ ] 给 CI 加一条：DSH 新版本发布时自动跑 `upgrade-check.mjs`
