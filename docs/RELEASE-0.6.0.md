# v0.6.0 · Wallpaper Engine 库集成

> 版本：`0.6.0`（git `acb17a6`；`lib/client.js` **896,889 字符 / 930,994 字节 / 22 个片段**；`BUILD`/`HOST_BUILD` = `0.6.0`；
> `node tools/build.mjs --check` 22/22）
> 定位：**新功能版本**——把本机 Wallpaper Engine 库接入皮肤，做到「不用填目录、点一张就应用」。
> 静态链 build 22/22 / test **67/67** / structure --strict / audit / check-css / verify / i18n-audit 全绿。
> 运行时自检 W：v0.2.2 web **23/23 PASS**、v0.2.2 Desktop **23/23 PASS**（§6）。4-runtime 全量矩阵见
> `diag/skinlab/V060-VERDICT.md`（本版最终 run 仍在另一进程；发布时以该文件为准）。
> 相关：[RELEASE-0.5.3.md](RELEASE-0.5.3.md) · [COMPATIBILITY.md](COMPATIBILITY.md) ·
> [THIRD-PARTY.md](THIRD-PARTY.md) · [CHANGELOG.md](../CHANGELOG.md)

## 1. 问题 → 根因 → 方案

**问题**：v0.5.3 之前，要用 Wallpaper Engine 壁纸必须走「高级 ① 的 WE 目录」手动路径：用户要自己找到
Steam 工坊目录、粘贴路径，面板才能列出条目；对绝大多数用户来说等于「WE 壁纸不能用」。用户要求
「快捷选择壁纸、不要翻文件夹」。

**根因**：皮肤只有「用户给目录 → 扫描该目录」的能力，没有 **WE 安装发现 / 工坊库扫描 / 场景包解码**
能力，也不认识 Steam 的 `libraryfolders.vdf` 与 `projects/*` 布局。

**方案**：
1. **宿主半新增 WE 库模块**（`lib/we-wallpaper/host.mjs`，内嵌 MIT 的 dsh-we-wallpaper v0.4.0 host half）：
   自动发现 Steam/WE 安装 → 扫描 `steamapps/workshop/content/431960/<id>/project.json` 与
   `projects/{myprojects,defaultprojects}` → 依赖无关的纯 JS `scene.pkg`/TEX 解码出 4K 静态图；
2. **数据并入既有接口（additive，不改旧字段）**：`GET /_wallpapers` 末尾追加 WE 条目；
   `GET /_engines` 增加 `weLibrary:{found,count,root}` 与 `capabilities.weLibrary`；
3. **新增第二路由前缀** `GET|POST /api/we-wallpaper/*` 承载预览/媒体/场景包/网页/诊断/状态；
4. **客户端新增第 22 个片段** `src/72-we-library.js`：设置导航页 + 侧栏按钮 + 全屏浮层三入口，
   并在快捷选择器里自动显示 WE 卡片（无需配置）。

## 2. 宿主半：WE 自动检测与路由（真实本机结果）

| 项 | 实测（本机 WE 已安装，`D:\Steam`） |
|---|---|
| 库条目 | `_wallpapers` total **38** = 本地 **3** + WE **35**（workshop **16** / project **19**） |
| 类型分布 | scene **22** / video **7** / web **3** / other **3**；**11 条中文标题**原样保留 |
| 安装发现 | `_engines.weLibrary = {found:true, count:35, root:"d:\\steam\\steamapps\\common\\wallpaper_engine"}`，`capabilities.weLibrary = true` |
| 场景包解码 | `/pkg` 首次 78–1449ms、缓存后 **23ms**；**8/8** workshop scene.pkg 解出 4K PNG/JPEG（真实 33MB `.pkg` → 4.4MB 4K PNG） |
| 路由 | `/list` 200；`/preview`、`/media`（**Range 206**）、`/pkg`、`/web/<id>/index.html` 均可用；跨站请求 **403**、路径遍历 **400/403** |
| 测试 | `node tools/test.mjs` **67/67**（61 条旧 + 6 条 WE fixture） |

新增路由前缀 `/api/we-wallpaper`（与 `/skin-tianlight` 并列，独立注册；isolation/service 缺失时不影响旧功能）：

| 路由 | 方法 | 用途 |
|---|---|---|
| `/list`、`/state` | GET / POST | 库清单；持久化选择与显示选项（`state/we-wallpaper.json`） |
| `/preview/<id>` | GET/HEAD | 预览图/预览视频 |
| `/media/<id>` | GET/HEAD | 视频/图片/音频，支持 **Range** |
| `/pkg/<id>` | GET | 纯 JS 解出的高清场景背景（缓存） |
| `/web/<id>/<path>` | GET/HEAD | 网页壁纸静态文件（默认 `index.html`，逐段 containment） |
| `/diagnostics/<id>` | GET | 单个场景/动态缓存的诊断 |
| `/scene-video/generate|status|media/<id>` | POST/GET | 可选动态缓存（见 §4） |

**安全**：所有路由拒绝 `Sec-Fetch-Site: cross-site` 与非本机 Origin（DSH Desktop 的 `dsh-app://…` 和
`http(s)://127.0.0.1|localhost[:port]` 放行）；id 只经扫描结果映射，**从不作为原始路径**；运行状态与缓存
写在插件 gitignored `state/`（`TIANLIGHT_WE_HOME` 可覆盖），不读写上游用户文件。

## 3. 客户端：第 22 个片段与三入口

`src/72-we-library.js`（第 22 个片段，构建顺序第 19）提供三个入口，任何 slots 服务缺失时
降级为「诊断 + 事件路径」，不会打崩 `apply()`：

1. **设置导航页**：`slots` `settings.section`，id `tianlight-wallpaper`，顺序 120，标题「壁纸 / Wallpaper」；
2. **侧栏功能按钮**：`slots` `sidebar.footer.action`（Settings 旁），点击打开全屏浮层；
3. **全屏浮层**：`z-index:2600`，`×` / `Esc` / 点 mask 关闭；另有 `CustomEvent("tianlight:open-wallpaper-library")`
   事件入口（高级 ①「打开壁纸库」按钮走此路径；浮层不可用时按钮给出「去设置」兜底提示）。

页面能力：自动列表（无需配置）、预览网格、搜索（标题/ID）、类型筛选（video/scene/web/image）、刷新、
使用中高亮、toast；点击卡片应用：

| 类型 | 应用目标 |
|---|---|
| video | `/api/we-wallpaper/media/<id>` |
| image | `/api/we-wallpaper/media/<id>` |
| web | `/api/we-wallpaper/web/<id>/index.html`（沙箱） |
| scene | `/api/we-wallpaper/pkg/<id>`（高清静态）；无 pkg → `/diagnostics/<id>` → `/preview/<id>` 回退 |

**快捷选择器**：WE 卡片自动出现（「壁纸引擎 35」chip）、缩略图**优先使用宿主真实 preview**、
带 video/scene/web 徽标、场景卡片提示「静态高清」；真实鼠标点卡即应用 + toast + 使用中移动。
**高级 ①**：自动检测行（总数 + Steam 工坊/project 拆分）+「打开壁纸库」按钮；旧手动目录编辑折叠为
`高级（手动路径）` 兜底。

## 4. 场景动态缓存（可选，Windows-only）

场景默认以**高清静态图**应用；用户可在设置页对单张场景请求「生成动态」：

- `POST /scene-video/generate/<id>` 启动 12s H.264 捕获（WE + `vendor/we-wallpaper/wcap/` 的
  `wcap-x64.exe` + PowerShell），随后轮询 `/scene-video/status/<id>`（真实
  `{ok, status:{phase,progress,error}}`）并在完成后取 `/scene-video/media/<id>`；
- 非 Windows / wcap 缺失 / `TIANLIGHT_WE_DISABLE_SCENE_VIDEO=1` 时返回 **503 `scene-video-unsupported`
  + 可读 reason**，其余功能不受影响；缓存可复用。
- 仓库测试套件用 disable 标志跳过捕获（不会在维护者桌面弹窗）。

## 5. 兼容 / 安全 / 许可

- **旧宿主（v0.4.0）× 新客户端**：WE 路由 404 → WE 页面显示「宿主半尚未提供壁纸库接口 / 更新或重启
  DSH 后重试」，皮肤面板的壁纸选择与其他功能正常；**该组合未做真机复验，标为已知边界**。
- **必须重启 DSH 一次**（v0.6.0 新增 host 路由）；之后只改浏览器半 Ctrl+F5 即可。
- 旧接口 additive：`_wallpapers` 只在末尾追加、旧条目顺序/ID 不变；`_engines` 只加字段；
  `capabilities.weLibrary` 是入口是否渲染的唯一依据。WE 未安装时 `{found:false,count:0}`，不报错。
- `TEX`/`pkg` 解码在 Node 内置模块内完成，无外部依赖、无网络请求；仅扫描本机 Steam 目录。
- 第三方与许可：[docs/THIRD-PARTY.md](THIRD-PARTY.md)（MIT dsh-we-wallpaper、Unlicense wcap、
  RePKG MIT 实现依据、MIT WebWallGL）；`lib/we-wallpaper/LICENSE` 与 `vendor/we-wallpaper/wcap/LICENSE`
  随仓库与发布包分发。

## 6. 验证与证据

| 项 | 结果 | 证据 |
|---|---|---|
| 最终构建 | git `acb17a6`；896,889 字符 / 930,994 字节 / 22 片段；`build --check` **22/22** | `node tools/build.mjs --check` |
| 静态链 | build / **test 67/67** / structure --strict / audit / check-css / verify / i18n-audit 全绿 | 静态链输出 |
| Host 真实本机 | `_wallpapers` 38（本地 3 + WE 35）；`_engines.weLibrary` 与 `capabilities.weLibrary`；路由 200/Range 206/403/400；8/8 scene 4K | `diag/skinlab/evidence/v060-we/`（`WE-RESULTS.json`、`matrix-v060-we.json`、shots） |
| W 自检 v0.2.2 web | **23/23 PASS**（settings/slots 注册、侧栏按钮、真实 host 预览、真实鼠标点卡应用+toast+使用中、浮层开关、console clean） | `diag/skinlab/runs/20261109-225043-baseline-v060final2-multiversion` |
| W 自检 v0.2.2 Desktop | **23/23 PASS** | `diag/skinlab/runs/20261109-230039-baseline-v060deskW-multiversion` |
| 4-runtime 全量矩阵 | 见 `diag/skinlab/V060-VERDICT.md`（HOST 侧最终判定由 verifier 回填） | `diag/skinlab/V060-VERDICT.md` |
| 旧宿主 × 新客户端 | 已知边界：WE 路由 404 → 页面提示重启/更新；未真机复验 | 见 §5 |

## 7. 已知限制

- 动态场景缓存 **Windows-only**（wcap + PowerShell）；其它平台只显示高清静态场景（不影响应用）。
- 首次 `/pkg` 解码较慢（本机 78–1449ms，视包大小），之后走缓存 23ms；超大 `.pkg` 受 1GB 上限保护。
- WE 未安装/未启动 Steam 时库为空（`found:false`），不生成假条目；手动路径仍可在高级 ① 兜底。
- 旧宿主只有客户端时 WE 库不可用（显示重启提示）；其余功能正常。
- `state/`、预览/场景缓存是本机数据（gitignore），迁移/备份请按需保留。
- Desktop preload/真实窗口差异、lab 出网等历史残余风险仍适用（见 [RELEASE-0.5.3.md](RELEASE-0.5.3.md) §8.6）。

## 8. 升级 / 回滚

- 升级：覆盖安装 → **重启 DSH 一次**（新 host 路由）→ Ctrl+F5；之后浏览器半更新只需 Ctrl+F5。
- 回滚：`git reset --hard v0.5.3`（或 `npm run restore` 到最近快照）；`state/` 与 WE 缓存不属于发布产物。
- 本版**尚未打 tag**（由发布流程统一打 `v0.6.0`）。
