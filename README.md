# 遐蝶 · 天光（TIANLIGHT）— DSH Web 皮肤插件

新海诚式的天光配色，全屏循环动态壁纸置于界面之下，玻璃质感面板、可拖拽的薄荷小猫桌宠，以及一套自建的排版与壁纸控制面板。

> 这是一个 **DSH（DeepSeek Harness）Web GUI 皮肤插件**，不是独立应用。它是一个标准 DSH bundle：`dsh.bundle.patch` 负责插入 `ui-skin-tianlight` 行，`dsh.client` 提供浏览器半；Web GUI 与 DSH Desktop 共用同一前端。
>
> 包名 `@dsh-external/dsh-client-ui-skin-tianlight` · 布线行 `ui-skin-tianlight` · body 属性 `data-dsh-tianlight`

## 特性

- **动态壁纸**：全屏循环视频，固定在图层最底，应用整体抬升一层
- **可替换壁纸**：任意 `mp4 / webm / mov / m4v / png / jpg / jpeg / webp / avif / gif / svg` 放进 `assets/` 自动识别；也可从「网址导入」粘贴远程直链（无扩展名会自动探测图片/视频，不是直链会明确报错）；格式限制见 [docs/FORMATS.md](docs/FORMATS.md)
- **静态帧**：从当前视频抓 6 帧，点一帧固定为静态壁纸，可一键回到动态；跨域 URL 会被浏览器拦取帧
- **一眼换壁纸**：默认打开就是**统一的混合壁纸库**（本地 + 上传 + WE 视频/场景），点缩略图立即应用；顶部 `全部 / 本地 / WE` 筛选，网址/WE 目录/GLSL 是导入链接，画面/外观/自动/保存收进「高级」
- **入口**：左侧「壁纸」标签可打开；标签被侧栏/任务栏挡住时，按 **Alt+W** 打开或关闭面板
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

本皮肤是**标准 DSH bundle**：`package.json` 的 `dsh.bundle.patch` 指向包内自带的 `cordis.patch.yml`，由它插入 `ui-skin-tianlight` 这一行；浏览器半由 `dsh.client` 提供。**只安装这一个包即可**，旧教程里的第二个 enable bundle（`@local/dsh-enable-tianlight`）已废弃，不要再装。

### DSH Desktop（0.2.1 及以上，单包安装）

1. 把本仓库目录（或解包后的 `dsh-client-ui-skin-tianlight-0.1.0/` 目录）放到任意位置，建议用纯 ASCII 路径。
2. 在 DSH Desktop 的**插件管理器**里选择「安装本地目录 / Install from local folder」，指向该目录。Desktop 的 profile（本版为 `desktop`）由 Electron 管理，**不要**手动编辑 profile 目录下的 `package.json` / `cordis.patch.yml`；安装器会以 `link:` 依赖引用本包，并且只登记 `@dsh-external/dsh-client-ui-skin-tianlight` 这一条 bundle。
3. 确认 `ui-skin-tianlight` 这一行处于 **enabled** 状态。该行由本包的 `cordis.patch.yml` 自带，profile 的 `cordis.patch.yml` 不需要、也不应该再手写同 id 的行（重复插入会重复挂载插件）。
4. 重启 DSH Desktop。之后只改浏览器半（`src/` → `lib/client.js`）时 Ctrl+F5 刷新即可，不用重启。

> **关键前提**：机器级 `$DSH_HOME/cordis.patch.yml`（Windows 默认 `%USERPROFILE%\.dsh\cordis.patch.yml`）的优先级**高于** bundle 自带的 patch。如果里面残留旧 skin-manager 生成的 `ui-skin-tianlight` + `disabled: true`，行的 enabled 会被覆盖、皮肤静默不出现——删掉该行再重启。处理见下方「故障排查」第 1 条。

### 命令行 `dsh web`（可选）

不用 Desktop 时，Web profile 也是同一种单包安装：把本包以目录链接或 `link:` 依赖放进 profile 的 `node_modules`，在 profile 的 `package.json` 里依赖本包，并在 `dsh.profile.bundles` 中登记 `@dsh-external/dsh-client-ui-skin-tianlight`。行仍由 bundle 自带的 patch 插入，不需要手写。

> **本版新增宿主路由**（上传 / 场景 / 引擎适配页），所以安装或更新后需要**重启一次 DSH**；之后只改 `src/` 的浏览器半仍只需 Ctrl+F5。场景目录来自壁纸面板里配置的 WE roots。

> `assets/uploads/` 是**用户数据**（面板「上传壁纸」落盘的图片/视频），不属于发布包，也不随仓库提交；发布或迁移时请自行保留/备份。发布包（`node tools/pack.mjs`）默认只含代码、清单（`package.json` / `skin.json` / `cordis.patch.yml`）、`lib/`、`vendor/`、`presets/` 与 `assets/README.md`，不含 `assets/uploads/`；默认演示素材需要 `--with-assets` 才会带上。

## 故障排查

### 1. 皮肤不出现，`ui-skin-tianlight` 被禁用（home patch 覆盖）

机器级 `$DSH_HOME/cordis.patch.yml`（Windows 默认 `%USERPROFILE%\.dsh\cordis.patch.yml`）的优先级高于 bundle 自带的 patch。检查其中是否有一条旧 skin-manager 生成的：

```yaml
- id: ui-skin-tianlight
  disabled: true
```

有的话整段删掉（或把 `disabled` 改为 `false`）后重启 DSH。这个旧行通常是以前用 Web 皮肤管理器安装时留下的；一个 profile 里只应有一条 `ui-skin-tianlight` 行，不要靠 home patch 再写一遍，避免管理器以后重写 home patch 又把 Desktop 禁用。

### 2. 端口 / origin 变化后设置“像丢了”

皮肤状态（壁纸选择、玻璃透明度、排版、省电、收藏等）存在浏览器 `localStorage` 里，按 **origin**（协议 + 主机 + 端口）隔离。DSH 换了端口、从 Web profile 换到 Desktop profile、或用另一个地址打开，都会读到新 origin 的默认值。回到原来的地址/端口即可恢复；确实换了 origin 就在新 origin 里重新设置一次——这不是皮肤丢配置。

### 3. Windows 上视频壁纸自动暂停，面板显示「省电暂停」

Windows 开启「减少动态效果 / Reduce motion」后，皮肤省电模式（auto）会跟随 `prefers-reduced-motion` 自动暂停动态壁纸。面板点「关闭省电并播放」，或把省电模式设为关；也可以到 Windows 设置 → 辅助功能 → 视觉效果 → 动画效果 关闭「减少动态效果」。这不是加载失败。

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
| 测试版本 | DSH Desktop `0.2.1-rc.3`（单包安装）；Web profile 走同一套安装 |
| 最低要求 | 支持 `dsh.client` 的版本（`0.1.5` 起） |
| 宿主注入缺失 | 宿主半对 `webServer` 等注入按可选处理，缺失时挂起而非报错 |
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
- **仓库完整版附带默认演示素材**：`assets/bg-main.mp4`、`assets/bg-4k.mp4`、`assets/cat.png`（约 70MB）；`assets/uploads/` 与其它自加素材不提交。替换或再分发前请确认你有使用权，缺失时以渐变兜底
- 桌宠形象与视频版权归各自权利方；如果只想要轻量代码仓库，删除这三个文件即可

## 已知取舍

- 暗色主题下清除侧栏内部的悬停/选中底色，用于消灭一块无法溯源的纯黑区域
- 设置面板不做实时背景模糊：全屏视频上叠两层 `backdrop-filter` 会明显掉帧
- 壁纸取色对跨域图片会被浏览器阻止（画布污染），此时保持默认配色
- 面板取色只在打开时采样一次，不再随循环视频持续变色；这是用少量视觉变化换掉 4K 视频上的周期性卡顿
- 实测 FPS 每 1.8s 更新一次并固定单行，数字变化不会把面板撑高；如果仍看到画面本身抖动，先看顶部「帧间隔抖动」数值
