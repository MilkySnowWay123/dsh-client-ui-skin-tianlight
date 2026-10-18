# 遐蝶 · 天光（TIANLIGHT）— DSH Web 皮肤插件

新海诚式的天光配色，全屏循环动态壁纸置于界面之下，玻璃质感面板、可拖拽的薄荷小猫桌宠，以及一套自建的排版与壁纸控制面板。

> 这是一个 **DSH（DeepSeek Harness）Web GUI 皮肤插件**，不是独立应用。它通过 `dsh.bundle.patch` + `dsh.client` 挂载进 Web 端。
>
> 包名 `@dsh-external/dsh-client-ui-skin-tianlight` · 布线行 `ui-skin-tianlight` · body 属性 `data-dsh-tianlight`

## 特性

- **动态壁纸**：全屏循环视频，固定在图层最底，应用整体抬升一层
- **可替换壁纸**：任意 `mp4 / webm / mov / m4v / png / jpg / jpeg / webp / avif / gif / svg` 放进 `assets/` 自动识别；也可从「网址导入」粘贴远程直链（无扩展名会自动探测图片/视频，不是直链会明确报错）；格式限制见 [docs/FORMATS.md](docs/FORMATS.md)
- **静态帧**：从当前视频抓 6 帧，点一帧固定为静态壁纸，可一键回到动态；跨域 URL 会被浏览器拦取帧
- **一眼换壁纸**：默认打开就是**统一的混合壁纸库**（本地 + 上传 + WE 视频/场景），点缩略图立即应用；顶部 `全部 / 本地 / WE` 筛选，网址/WE 目录/GLSL 是导入链接，画面/外观/自动/保存收进「高级」
- **WE 不难找**：点「WE 目录」直接展开配置；WE 筛选为空时也会自动展开「配置目录」，不需要先找来源卡
- **ShaderToy 风格壁纸**：本地 GLSL 片段着色器（`iTime` / `iResolution` / `iMouse` / 可选 `u_audio`），预设极光/星云/水波/音频极光，速度/强度/色相滑块；编译失败只提示、不换掉当前壁纸，30fps 上限
- **音频响应**：ShaderToy 的「音频极光」预设可接麦克风实时电平；只在手动启用后分析，不录音、不上传，关面板/省电/切走/页面隐藏自动释放
- **精选配方**：5 个内置卡片（极光暗角/音频极光/电影颗粒/冷夜光晕/纯净）一键套用，`presets/` 同时提供可分享 JSON；不联网
- **性能档位**：ShaderToy 与侧栏镜像可选 自动 / 60 / 30 / 15fps；视频按源帧率原生播放（60fps 源无需设置），顶部显示实测视频 FPS；独立侧栏关闭时镜像不跑 rAF
- **动态播放恢复**：面板顶部现在显示**真实播放状态**（动态播放中 / 已暂停 / 自动播放被拦截 / 省电暂停 / 静态帧 / 画面卡住 / 加载失败），并给出原因与一键恢复；任何一次点击/按键都能解锁浏览器的自动播放限制，另有 60 秒看门狗与「页面重新可见 / 窗口聚焦」重试
- **播放控制**：取景段支持暂停/继续（刷新后仍保持）、0.5–1.5x 倍速与水平翻转；只影响视频，按源帧率播放，不额外封顶
- **画面滤镜**：亮度 / 对比度 / 饱和度，**默认关闭**；开启后才有全屏合成成本，4K/60fps 掉帧时面板会提示先关掉
- **自动轮播**：顺序或随机、30 秒到 10 分钟、只轮播收藏；页面隐藏、省电或手动暂停时顺延；先准备下一张再切换，坏文件跳过；隐藏的壁纸不参与
- **壁纸库**：搜索 / 收藏 / 标签 / **隐藏与恢复**（只改列表，不删文件、不打断播放），卡片显示类型、文件大小；顶部显示当前视频的源分辨率、时长与实测 FPS/帧间隔抖动
- **面板不抖**：实测 FPS 每 1.8s 合批更新，质量行单行省略；取色只在打开时采样一次（+1.5s 重试），不再周期性从 4K 视频抓帧；拖拽松手丢到窗外也会自动收尾，点击标题不会再自己弹到边缘
- **上传壁纸**：面板内选择图片/视频，默认上限 **512MB**（`TIANLIGHT_UPLOAD_MAX` 可调）；宿主流式落盘到 `assets/uploads/`，只接受图片/视频扩展名，同名自动加 `-1` 而不是覆盖；中文/4K 文件名会清洗成可播放的 ASCII 名而不是直接拒绝
- **WebWallGL 场景**：可选的 Wallpaper Engine 场景通道（内置 MIT 的 WebWallGL 3.0，`vendor/webwallgl/`），在**沙箱 iframe**里实时渲染 `project.json` + `scene.pkg`；首帧超时/引擎失败自动退回上一张可播壁纸或视频
- **叠加层**：A/B 两槽，预设（暗角/颗粒/光晕/扫描线）或图片（本地/URL），不透明度 + 混合 + 交换层级，纯 CSS 叠在任意壁纸之上
- **玻璃面板**：输入框、气泡、菜单、设置面板统一半透明磨砂；设置面板刻意不做实时模糊以保证视频流畅
- **推理档位滑杆**：弹簧阻尼、连续拖拽、档位吸附，走官方 `remote.session.modelCatalog / selectModel`
- **排版面板（Aa）**：字号滑杆、界面字族、代码字族、字重、行距、字距、一键复位；新增实时预览、字号/字族/排版分组和滚动上限，可拖动、右上角关闭
- **壁纸自适应配色**：面板打开时从当前画面取一次主色推导强调色（不再每几秒重采样，避免 4K 视频周期性卡顿）
- **薄荷小猫**：可拖拽、会呼吸、靠近会回应、点击打开互动菜单
- **亮/暗双主题**：两套 token，均保持壁纸可见

## 安装

```text
1. 把本目录放到任意位置，链接进 profile：
   mklink /J "%USERPROFILE%\.dsh\profiles\web\node_modules\@dsh-external\dsh-client-ui-skin-tianlight" "D:\path\to\skin-tianlight"
2. profile 的 package.json 登记：
   "dsh": { "profile": { "bundles": ["@dsh-external/dsh-client-ui-skin-tianlight"] } }
3. profile 的 cordis.patch.yml 插入：
   - id: ui-skin-tianlight
     name: '@dsh-external/dsh-client-ui-skin-tianlight'
     disabled: false
4. 重启 DSH 后 Ctrl+F5
```

> **本版新增宿主路由**（上传 / 场景 / 引擎适配页），所以安装或更新后需要**重启一次 `dsh web`**；之后只改 `src/` 的浏览器半仍只需 Ctrl+F5。上传目录是 `assets/uploads/`，场景目录来自壁纸面板里配置的 WE roots。

## 壁纸

来源优先级从高到低：

1. **手动选择**：壁纸面板 → 清单卡片（本地 / 上传 / WE 视频图片 / WE 场景 / URL / ShaderToy）
2. **自动**：`bg-main.mp4` → `bg-4k.mp4` → 其它视频 → 第一张图片 → 内置渐变

替换壁纸**不需要改代码**，放文件即可：

```text
assets/
  bg-main.mp4     ← 首选视频
  bg-4k.mp4       ← 备选 / 4K
  rain.webp       ← 图片也可以，会作为静态壁纸
  cat.png         ← 桌宠素材，不参与壁纸候选
```

缺文件时逐级降级，**不会白屏**。

## 兼容性

| 项 | 说明 |
|---|---|
| 测试版本 | DSH `0.2.0-rc.2`（Web） |
| 最低要求 | 支持 `dsh.client` 的版本（`0.1.5` 起） |
| 非 Web profile | 宿主半对 `webServer` 等注入，缺失时挂起而非报错 |
| 服务缺失 | `theme` / `layout` / `slots` / `remote` 全部按可选处理 |
| 类名变更 | 选择器使用构建哈希类名，失效即静默降级为半透明，不破坏布局 |
| 换版本 | 改 `skin.json` 的 `dshCompatibility` 即可 |
| 场景壁纸 | 需要浏览器 WebGL2；`project.json` 的 `type` 为 `scene`，目录名需为 ASCII；引擎或首帧失败会自动降级，不影响视频/图片 |
| 上传 | 单文件 ≤512MB（可调），只收图片/视频；文件名会清洗，同名自动加序号 |

### 升级 DSH 后必做

```bash
node tools/upgrade-check.mjs    # 逐项校验皮肤对当前 DSH 的全部假设
```

它会检查：客户端模块加载器与静态种子（`react` / `react-dom/client`）、启动载荷、5 个构建哈希选择器、`modelCatalog` / `selectModel` 契约、两个注入包、`slots` 与 `theme` 服务包。

- `FAIL` = 致命：皮肤可能完全加载不出来，必须改代码适配
- `WARN` = 降级：只丢某个视觉细节，页面仍正常

**安全性设计**：`apply()` 整体被 `try/catch` 包住。即使某个假设在未来版本上崩了，最坏结果是"皮肤不出现"，**绝不会让 DSH 进不去**——异常被吞掉并写进 `console.warn`，不会把插件标记为致命失败。

## 配置

| 变量 | 默认（亮 / 暗） | 作用 |
|---|---|---|
| `--tl-panel-fill` | `0.84` / `0.88` | 模态面板填充，越大越实 |
| `--tl-glass-fill` | `0.30` / `0.38` | 玻璃表面填充 |
| `--tl-glass-blur` | `12px` / `14px` | 玻璃模糊半径（仅小面积表面使用） |
| `--tl-shell` | `0` | 全局表面透明度，`0` = 100% 壁纸 |
| `--tl-overlay` | `0.82` / `0.84` | 菜单/弹层遮罩 |
| `--tl-accent` | `#2b74c9` | 强调色（面板内由壁纸取色覆盖） |

推理滑杆手感：`stiffness`（170）、`damping`（25）——越大越干脆 / 越不弹。

## 目录结构

```text
lib/index.js          宿主半：路由表（素材 / 清单 / 上传 / 场景 / 引擎）
lib/http-media.js     宿主半：Range / ETag / HEAD / 流式响应
lib/media-types.js    宿主半：共享 MIME、扩展名、路径包含检查
lib/upload.js         宿主半：受控上传（512MB 上限、安全文件名、原子落盘）
lib/scene-project.js  宿主半：WE 场景目录发现 + 逐段路径校验
lib/scene-frame.html  沙箱适配页：加载 WebWallGL 并和父页面通信
lib/client.js         浏览器半产物：由 src/ 拼装，不要直接改
src/                  浏览器半源码：按 region 切分的片段
vendor/webwallgl/     MIT 的 WebWallGL 3.0 引擎（可选，不内联进 client.js）
cordis.patch.yml      插件行插入
skin.json             皮肤管理器清单
assets/               壁纸与桌宠素材（可选）
tools/                构建、审计、打包、回滚脚本
```

## 开发

改代码请改 `src/`：`lib/client.js` 是构建产物，直接改会被下次构建覆盖。

```bash
node tools/build.mjs        # 从 src/ 生成 lib/client.js（改完源码先跑）
node tools/build.mjs --check # 校验产物没落后（npm run check 已包含）
node tools/test.mjs         # 纯逻辑回归测试（Range 解析、文件名安全、壁纸发现）
node tools/upgrade-check.mjs # DSH 升级后的兼容性自检（见上一节）
node tools/resolve-selectors.mjs # 哈希选择器体检：哪个还在、哪个失效、候选是谁
node tools/audit.mjs        # 静态审计：变量/监听器/定时器/Hook 顺序
node tools/check-css.mjs    # 样式结构检查
node tools/verify.mjs       # 路由、封装、清单契约断言
node tools/pack.mjs         # 生成可分发目录（默认不含大体积素材）
node tools/snapshot.mjs     # 存快照（lib 产物 + src/）
node tools/restore.mjs      # 从 backup/ 回滚到最近快照（含 src/）
```

## 许可与素材

- 代码：MIT（见 `LICENSE`）
- **仓库不附带第三方游戏素材或视频**：请自备你有权使用的文件，缺失时以渐变兜底
- 桌宠形象与视频版权归各自权利方，请勿随插件再分发

## 已知取舍

- 暗色主题下清除侧栏内部的悬停/选中底色，用于消灭一块无法溯源的纯黑区域
- 设置面板不做实时背景模糊：全屏视频上叠两层 `backdrop-filter` 会明显掉帧
- 壁纸取色对跨域图片会被浏览器阻止（画布污染），此时保持默认配色
- 面板取色只在打开时采样一次，不再随循环视频持续变色；这是用少量视觉变化换掉 4K 视频上的周期性卡顿
- 实测 FPS 每 1.8s 更新一次并固定单行，数字变化不会把面板撑高；如果仍看到画面本身抖动，先看顶部「帧间隔抖动」数值
