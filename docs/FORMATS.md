# 壁纸格式适配

## 支持矩阵

| 格式 | 宿主 MIME | 主要限制 | 备注 |
|---|---|---|---|
| `.mp4` H.264/AVC | `video/mp4` | 最稳，几乎所有浏览器 | 推荐日常使用 |
| `.mp4` H.265/HEVC | `video/mp4` | 取决于浏览器/硬件；Chrome 常不支持 | 8K/HEVC 先用系统播放器确认 |
| `.webm` VP8/VP9 | `video/webm` | Chrome / Edge / Firefox 较好，Safari 较新版本 | AV1 WebM 也看浏览器 |
| `.mov` | `video/quicktime` | 容器不等于编码；ProRes/HEVC 常解不了 | H.264 MOV 也看浏览器 |
| `.m4v` | `video/mp4` | 通常等同 MP4 | 适合 H.264 |
| `.png` / `.jpg` / `.jpeg` | 对应图片 MIME | 基本都支持 | 大图会占内存 |
| `.webp` | `image/webp` | 现代浏览器 | 支持静态/动图 |
| `.avif` | `image/avif` | 现代浏览器；旧内核不支持 | 失败会回退到上一张可播画面 |
| `.gif` | `image/gif` | 基本都支持 | 作为背景会动画 |
| `.svg` | `image/svg+xml` | 基本都支持 | 背景图里的脚本不会执行 |
| WE 场景目录（`project.json` + `scene.pkg`） | 不经过 `<video>`，由 `/skin-tianlight/_scene-project/` 供字节 | 浏览器需支持 WebGL2；场景脚本/模型/粒子由 WebWallGL 解释 | 可选通道；失败自动退回上一张可播壁纸或视频 |

**不支持**：HEIC/HEIF、MKV、ProRes MOV 等需要系统级解码的格式。请先转成 MP4(H.264) / WebM / PNG / WebP。

## 场景壁纸（WebWallGL）

- 目录来源：壁纸面板 → Wallpaper Engine → 配置 roots；宿主扫描 roots 下含 `project.json` 的子目录。
- 只收 `type: "scene"`；目录名需为 ASCII（数字工坊 ID 最典型），`file` 指向 `scene.pkg` 或松散 `scene.json`。
- 渲染发生在**沙箱 iframe**（`sandbox="allow-scripts"`，CSP 再封一层），场景文件经 `/skin-tianlight/_scene-project/...` 以 CORS 提供；子路径逐段校验，只放行媒体/资产扩展名。
- 降级链：引擎首帧 → 上一张可播壁纸 → 自动选择（视频/图片）→ 内置渐变。首帧预算 20 秒，超时会明确报错而不是黑屏。
- 引擎是 `vendor/webwallgl/` 的 MIT WebWallGL 3.0；缺失时清单只显示预览图，不假装能渲染。

## 上传

- 面板 → 清单 → 「上传壁纸」，单文件 ≤512MB（`TIANLIGHT_UPLOAD_MAX` 可调）；只收图片/视频扩展名；宿主流式写入 `assets/uploads/`，先写 `.part-*` 再改名，失败不会出现在清单里。
- 更大的 4K 长片：启动宿主前设置字节数，例如 PowerShell `$env:TIANLIGHT_UPLOAD_MAX=1073741824`（1GB）再 `dsh web`；面板会从 `_engines` 读到新的上限。
- 中文/带空格文件名会被清洗成可播放的 ASCII 名（`4K壁纸.mp4` → `4K.mp4`，纯中文名 → `upload-<stamp>.mp4`），不会因为名字被拒。
- 同名不覆盖：自动变成 `name-1.ext`、`name-2.ext`…；上传的文件与本地壁纸走同一条 Range 播放管道。

## 自动选择与编码探测

- 顺序：用户手动选择 → `bg-main.mp4` → `bg-4k.mp4` → `bg-1080.mp4` → 其它视频 → 第一张图片 → 内置渐变。
- `bg-main.mp4` 会被当作 HEVC 做一次 `canPlayType` 兼容探测；浏览器明确不支持 HEVC 时，自动选择会跳过它，避免空白。
- **代价**：如果你把 H.264 4K 文件命名为 `bg-main.mp4`，而浏览器又不报告 HEVC 支持，自动可能跳过它。**要强制使用某个文件，请直接在清单里点它的卡片**；保存的选择会绕过自动探测。
- 视频解码失败时：先试下一个候选，再回退到上一张真正出过帧的壁纸；图片解码失败同样回退到上一张。

## URL 地址

- 有明确扩展名时自动判断图片/视频。
- **无扩展名的 CDN 地址**：用地址框上方的「类型：自动 / 图片 / 视频」手动指定。
- 跨域视频可以播放；跨域图片可以显示，但因画布污染，面板取色会保持默认色。

## 8K 与画质

- 4K/8K 文件下采样到屏幕通常比 720p 清晰；前提是浏览器/硬件真的解码了该分辨率。
- 8K 可能被浏览器自动降采样，或直接掉帧；面板顶部会显示源分辨率和当前裁切尺寸。
- 4K/8K 在集显机器上可能掉帧，实际观感要按机器取舍。

## 失败表现

壁纸面板顶部会显示：

- `画质：源 W×H · 当前裁切约 W×Hpx · 不需放大 / 会放大，可能发糊 · 实测 60fps`
- `壁纸加载失败：请换一个文件，或检查编码/地址；皮肤会自动退回可播画面`

宿主 MIME 已覆盖 `.mp4 / .m4v / .mov / .webm / .webp / .avif / .gif / .png / .jpg / .jpeg / .svg / .json`。
