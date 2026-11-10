		//#region wallpaper sidebar
		/**
		 * A dedicated left-edge sidebar for the wallpaper, kept apart from the
		 * typography card on purpose: one is a full-height browsing surface with
		 * thumbnails, the other a small draggable settings card. Sharing one host made
		 * both feel cramped and put unrelated controls in the same panel.
		 */
		/**
		 * v0.5.0 面板新增文案（工作流 panel-library 自有前缀 `lib.`）。
		 * v0.4.0 的既有中文标签保持原样：skinlab 运行时矩阵按这些字符串断言
		 * （"壁纸" / "N 张" / "全部 3" / "WE 目录" / "查看全部壁纸"），
		 * 翻译它们会把布局验证变成语言相关，所以只给新增控件走 TL_T。
		 */
		registerTl5Strings({
			zh: {
				"lib.sort": "排序",
				"lib.sortName": "名称",
				"lib.sortKind": "类型",
				"lib.sortRecent": "最近使用",
				"lib.sortFavorites": "收藏优先",
				"lib.favorites": "收藏",
				"lib.hidden": "显示隐藏",
				"lib.hiddenOn": "隐藏中",
				"lib.filterClear": "清除筛选",
				"lib.filterEmpty": "没有匹配的壁纸：换关键词，或清空收藏/标签筛选",
				"lib.searchPlaceholder": "搜索名称、标签或类型",
				"lib.searchAria": "搜索壁纸",
				"lib.shareTitle": "分享链接",
				"lib.shareCopy": "复制分享链接",
				"lib.shareCopied": "已复制分享链接（只含配置，不含壁纸文件）",
				"lib.shareFailed": "复制失败，请手动选择下面的链接复制",
				"lib.shareHint": "分享链接包含当前壁纸、取景、外观、播放、轮播、特效、情境与排版；只有对方点「应用」才会写入设置。",
				"lib.shareDetected": "检测到共享配方（{n} 项）",
				"lib.shareApply": "应用",
				"lib.shareIgnore": "忽略",
				"lib.shareApplied": "共享配方已应用",
				"lib.shareIgnored": "已忽略共享配方（设置未改动）",
				"lib.shareInvalid": "分享链接无效，已忽略（未修改任何设置）",
				"lib.shareManual": "或手动复制这段链接：",
				"lib.shareLinkAria": "共享配方链接",
				"lib.shareLong": "链接较长（含着色器源码），部分聊天工具可能截断。",
				"lib.shareBuildFail": "生成分享链接失败：{reason}",
				"lib.bundleTitle": "导入 / 导出包",
				"lib.bundleHint": "包内含设置、配方与上传的壁纸；导出由宿主直接流式打包，不经过浏览器内存。",
				"lib.bundleExport": "导出包",
				"lib.bundleExportBusy": "准备下载…",
				"lib.bundleExportStarted": "已开始下载。若浏览器提示 404，说明宿主半还是旧版本，重启 DSH 后重试。",
				"lib.bundleExportFail": "导出失败：{reason}",
				"lib.bundleImport": "导入包",
				"lib.bundleImporting": "导入中…",
				"lib.bundleImportDone": "导入完成：新增 {imported} 个，跳过 {skipped} 个",
				"lib.bundleImportSettings": "设置已写入宿主，刷新页面后统一生效",
				"lib.bundleImportFail": "导入失败：{reason}",
				"lib.bundleImportSize": "包超过 {mb}MB 上限，请分开导入",
				"lib.bundleImportType": "只支持 .tgz / .tar.gz 包",
				"lib.bundleNoHost": "当前宿主没有提供打包接口：重启 DSH Desktop 后可用。",
				"lib.bundleProgress": "上传 {pct}%",
				"lib.recipeHint": "配方 v2 含壁纸、取景、外观、播放、轮播、特效、情境、可读性与排版（含着色器源码与参数）。",
				"lib.recipeExported": "已生成配方（v2），复制这段分享给别人",
				"lib.recipeBadText": "导入失败：不是有效的配方文本",
				"lib.recipeBadValue": "导入失败：不是有效的配方",
				"lib.exportRecipe": "导出配方",
				"lib.importRecipe": "导入配方",
				"lib.resetWallpaper": "恢复壁纸默认",
				"lib.recipePlaceholder": "{ format: \"tianlight-recipe\", version: 2 }",
				"lib.we.readFailed": "无法读取目录列表（宿主接口需重启 DSH 后才存在）",
				"lib.we.saving": "保存中…",
				"lib.we.savedPrefix": "已保存 ",
				"lib.we.savedDirs": " 个目录",
				"lib.punct.openParen": "（",
				"lib.we.savedSkipped": " 条无效/相对路径已忽略，需填绝对路径）",
				"lib.we.saveFailed": "保存失败：宿主接口需重启 DSH 后才存在",
				"lib.ctrl.off": "关闭",
				"lib.slot.imageUnset": "图片（未选）",
				"lib.kind.image": "图片",
				"lib.slot.preset": "预设",
				"lib.url.empty": "先粘贴一个图片或视频直链",
				"lib.url.scheme": "地址要以 http:// 或 https:// 开头",
				"lib.url.httpsBlocked": "当前页面是 HTTPS，浏览器会拦截 http 资源；请换用 https 地址",
				"lib.url.checking": "正在检查地址…",
				"lib.url.notMedia": "这不是可直接加载的图片/视频直链；请确认地址以 .jpg/.png/.mp4/.webm 等结尾，或手动选「图片 / 视频」。",
				"lib.url.applied": "已应用：",
				"lib.kind.video": "视频",
				"lib.url.remoteHost": "远程地址",
				"lib.shader.compileFailed": "编译失败：",
				"lib.shader.applied": "已应用着色器",
				"lib.shader.reset": "已恢复默认，点「应用着色器」生效",
				"lib.audio.stopped": "已停止音频",
				"lib.audio.requesting": "正在请求麦克风…",
				"lib.audio.failed": "无法启用麦克风",
				"lib.shader.audioPreset": "已切到「音频极光」，点「应用着色器」生效",
				"lib.frame.sampling": "正在从视频取帧…",
				"lib.frame.pickHint": "点一帧设为静态壁纸（切走壁纸后需重新取帧）",
				"lib.frame.pinned": "已设为静态帧 ",
				"lib.frame.resumed": "已恢复动态播放",
				"lib.upload.hostStale": "宿主半还是旧版本（页面已更新、进程未重启）：重启一次 DSH Desktop 后再上传；点「重新检测」可复查。",
				"lib.upload.notWritable": "上传目录不可写：检查 skin-tianlight/assets/ 的写权限",
				"lib.upload.tooBigPrefix": "超过 ",
				"lib.upload.tooBigSuffix": "MB 上限；4K 长片请先压缩，或设置 TIANLIGHT_UPLOAD_MAX",
				"lib.upload.types": "只支持 mp4/webm/mov/m4v/png/jpg/webp/avif/gif/svg",
				"lib.upload.busy": "上传中…",
				"lib.upload.done": "已上传：",
				"lib.upload.failed": "上传失败：",
				"lib.current.auto": "自动（按素材优先级）",
				"lib.current.scenePrefix": "场景 · ",
				"lib.current.customShader": "自定义代码",
				"lib.current.unnamed": "未命名",
				"lib.current.videoStill": "视频静态帧",
				"lib.quality.loadFailed": "壁纸加载失败：请换一个文件，或检查编码/地址；皮肤会自动退回可播画面",
				"lib.quality.scene": "画质：WebWallGL 实时场景",
				"lib.quality.measured": " · 实测 ",
				"lib.quality.engineNotReady": " · 引擎未就绪",
				"lib.quality.shader": "画质：程序化着色器，不受源分辨率影响",
				"lib.quality.source": "画质：源 ",
				"lib.quality.crop": " · 当前裁切约 ",
				"lib.quality.upscaled": " · 会放大，可能发糊",
				"lib.quality.native": " · 不需放大",
				"lib.quality.low": "（偏低）",
				"lib.quality.eightK": " · 8K 源可能被浏览器降采样",
				"lib.quality.duration": " · 时长 ",
				"lib.power.reducedMotion": "系统开启了「减少动态效果」",
				"lib.power.saveData": "浏览器开启了流量节省",
				"lib.power.battery": "电量偏低且未充电",
				"lib.power.manual": "手动开启省电",
				"lib.status.lowPower": "省电暂停",
				"lib.status.still": "静态帧",
				"lib.status.blocked": "自动播放被拦截",
				"lib.status.stalled": "画面卡住",
				"lib.status.failed": "加载失败",
				"lib.status.image": "图片壁纸",
				"lib.status.loading": "加载中",
				"lib.status.scene": "场景运行中",
				"lib.status.shader": "着色器运行中",
				"lib.status.playing": "动态播放中",
				"lib.status.idle": "未选择壁纸",
				"lib.status.paused": "已暂停",
				"lib.status.ready": "已就绪",
				"lib.hint.lowPowerPauseOpen": "省电自动暂停（",
				"lib.power.mode": "省电模式",
				"lib.hint.lowPowerPauseClose": "）；点按钮会关闭省电并恢复播放。",
				"lib.hint.still": "当前固定在静态帧，刷新后仍保持；点「回到动态」恢复播放。",
				"lib.hint.blocked": "浏览器拦下了自动播放。点「播放动态」一次即可；之后回到页面会自动继续。",
				"lib.hint.stalled": "已请求播放但没有新画面。点「重试」重新加载当前壁纸。",
				"lib.hint.decodeFailedOpen": "解码或播放失败（",
				"lib.common.unknownReason": "未知原因",
				"lib.hint.decodeFailedClose": "）；皮肤会自动退回可播画面。",
				"lib.hint.idle": "还没有选择壁纸；从下面「来源」开始挑一张。",
				"lib.hint.buffering": "正在加载/解码，画面出现后会自动开始播放。",
				"lib.hint.scene": "WebWallGL 正在渲染 WE 场景；加载失败会自动退回视频/图片。",
				"lib.hint.shader": "程序化着色器按当前渲染档位运行。",
				"lib.hint.videoPlaying": "视频正在播放；切换页面会暂停、回来继续。",
				"lib.hint.paused": "已暂停在当前帧；点「继续播放」恢复。",
				"lib.hint.ready": "画面已就绪。",
				"lib.action.lowPowerPlay": "关闭省电并播放",
				"lib.action.backToMotion": "回到动态",
				"lib.action.play": "播放动态",
				"lib.action.retry": "重试",
				"lib.action.pause": "暂停",
				"lib.action.resume": "继续播放",
				"lib.quality.jitter": " · 帧间隔抖动 ",
				"lib.quality.high": "（偏高）",
				"lib.listHint.url": "把完整媒体直链粘到下面；不是网页地址。网络直链只播放，不下载进壁纸库。",
				"lib.listHint.shader": "先选预设或贴 GLSL，调好参数，再点「应用着色器」。",
				"lib.listHint.weOpen": "Wallpaper Engine：",
				"lib.unit.items": " 张",
				"lib.listHint.weSceneOpen": "（场景 ",
				"lib.punct.closeParen": "）",
				"lib.listHint.weClose": "；目录在清单顶部「配置目录」里改，场景失败会自动降级。",
				"lib.listHint.local": "本地与上传：",
				"lib.listHint.localSuffix": " 张。点缩略图直接应用；4K/8K 也可直接点。",
				"lib.listHint.all": "全部壁纸：",
				"lib.listHint.allMiddle": " 张（本地 ",
				"lib.listHint.allSuffix": "）。点缩略图直接应用；上方可筛选，或从「网址 / WE 目录 / GLSL」导入。",
				"lib.list.loading": "加载中…",
				"lib.list.failed": "读取失败",
				"lib.list.loadingHint": "正在读取壁纸清单…",
				"lib.list.errNetwork": "无法读取壁纸清单：宿主接口不可用或网络错误",
				"lib.list.errHostStale": "无法读取壁纸清单：宿主半还是旧版本，重启 DSH Desktop 后重试",
				"lib.pick.more": "更多设置",
				"lib.pick.back": "返回快捷选择",
				"lib.pick.applied": "已切换：{name}",
				"lib.pick.failed": "切换失败：{reason}",
				"lib.pick.noScene": "壁纸场景未启用：请先在高级中开启壁纸模块",
				"lib.card.inUse": "使用中",
				"lib.source.url": "URL 地址",
				"lib.source.local": "本地/上传",
				"lib.source.all": "全部",
				"lib.source.engine": "壁纸引擎",
				"lib.we.detected": "Wallpaper Engine：已检测到 {n} 张（Steam 工坊 {steam} / 我的项目 {project}）",
				"lib.we.openLibrary": "打开壁纸库",
				"lib.we.openRequested": "已请求打开壁纸库",
				"lib.we.openFallback": "已请求打开壁纸库；若没有打开，请到 设置 → 壁纸",
				"lib.we.manual": "高级（手动路径）",
				"lib.we.manualHint": "仅用于自动检测不到的旧版目录；一般不需要设置。",
				"lib.we.autoDesc": "自动检测本机壁纸库（无需配置路径）",
				"lib.we.staticHint": "静态高清",
				"lib.we.staticHintTitle": "场景以静态高清图应用；动态缓存可在设置页选择「生成动态」",
				"lib.listHint.engine": "壁纸引擎：{n} 张（自动检测，点卡片直接应用；场景为静态高清）",
				"lib.listValue.pasteUrl": "粘贴地址",
				"lib.ctrl.auto": "自动",
				"lib.appearance.glassPrefix": "玻璃 ",
				"lib.perf.powerAuto": "省电自动",
				"lib.perf.powerOn": "省电开",
				"lib.perf.powerOff": "省电关",
				"lib.perf.rotationOn": " · 轮播开",
				"lib.panel.title": "壁纸",
				"lib.view.pick": "选壁纸",
				"lib.view.advanced": "高级",
				"lib.panel.close": "关闭壁纸侧栏",
				"lib.current.prefix": "当前壁纸：",
				"lib.source.localShort": "本地",
				"lib.label.playing": "播放中",
				"lib.label.unlock": "待恢复",
				"lib.label.play": "播放",
				"lib.group.sources": "来源（目录/代码）",
				"lib.punct.colon": "：",
				"lib.group.list": "壁纸清单",
				"lib.we.hint": "把 Wallpaper Engine 的 projects 目录粘在这里，每行一个；只读，不修改原文件。",
				"lib.we.placeholder": "每行一个绝对路径，例如 …/steamapps/workshop/content/431960/<项目ID>",
				"lib.we.save": "保存目录",
				"lib.upload.title": "上传后自动出现在本地清单；不会覆盖同名文件",
				"lib.upload.button": "上传壁纸",
				"lib.upload.hostStaleShort": "宿主半待重启 DSH",
				"lib.upload.limitSuffix": "MB · 图片/视频",
				"lib.upload.redetecting": "正在重新检测宿主路由…",
				"lib.upload.redetect": "重新检测",
				"lib.hiddenHint": "隐藏只改变列表，不删除源文件",
				"lib.tag.prefix": "标签：",
				"lib.tag.remove": "移除这个标签",
				"lib.tag.placeholder": "输入标签后回车，例如 夜景",
				"lib.common.done": "完成",
				"lib.card.autoTitle": "自动选择",
				"lib.card.autoNote": "按素材优先级",
				"lib.card.scene": "场景 · WebWallGL",
				"lib.card.unhide": "恢复显示",
				"lib.card.hide": "隐藏",
				"lib.card.unhideTitle": "恢复显示（不删除文件）",
				"lib.card.hideTitle": "隐藏（不删除文件，也不打断当前播放）",
				"lib.card.unhideShort": "显",
				"lib.card.hideShort": "隐",
				"lib.card.unfavorite": "取消收藏",
				"lib.card.favorite": "收藏",
				"lib.card.editTags": "编辑标签",
				"lib.empty.we": "这个来源下没有可读的视频/场景：旧版目录可在高级 ① 的「高级（手动路径）」里检查；自动检测的条目在「壁纸引擎」来源里。",
				"lib.empty.all": "还没有壁纸：点下方「上传壁纸」，或用上方「网址导入 / WE 目录 / GLSL」。",
				"lib.empty.local": "本地还没有壁纸：把图片/视频放进 skin-tianlight/assets/，刷新页面即可；也可以直接点「上传壁纸」。",
				"lib.empty.engine": "壁纸引擎没有可显示的壁纸：请在 设置 → 壁纸 里查看自动检测状态。",
				"lib.empty.showAll": "查看全部壁纸",
				"lib.url.hint": "只支持「能直接打开的媒体直链」：图片或视频地址，不是网页地址。网络直链直接播放，不下载到本机；要进壁纸库请用上传。",
				"lib.field.type": "类型",
				"lib.url.pasted": "已从剪贴板粘贴，点「应用地址」或按回车",
				"lib.url.clipboardEmpty": "剪贴板是空的；请手动 Ctrl+V",
				"lib.url.clipboardDenied": "浏览器拒绝读取剪贴板；请手动 Ctrl+V",
				"lib.url.paste": "粘贴",
				"lib.url.placeholder": "粘贴完整直链，例如 https://…/wallpaper.mp4",
				"lib.url.checkingShort": "检查中…",
				"lib.url.apply": "应用地址",
				"lib.url.autoHint": "自动会先按扩展名判断，无扩展名时实际探测图片/视频；不确定就保持自动。",
				"lib.quick.label": "快捷来源",
				"lib.quick.url": "URL 地址",
				"lib.quick.urlHint": "粘贴图片或视频直链",
				"lib.quick.shader": "ShaderToy 代码",
				"lib.quick.shaderHint": "选预设或贴 GLSL",
				"lib.shader.intro": "ShaderToy 风格：不需要网站账号，也不抓取 shadertoy.com。① 选预设或贴 GLSL → ② 调速度/强度/色相 → ③ 点「应用着色器」。",
				"lib.shader.uniforms": "可用 uniform：iTime / iResolution / iMouse / u_speed / u_intensity / u_hue / u_audio。",
				"lib.audio.hint": "音频响应：把麦克风实时电平送给 u_audio；只分析，不录音、不上传。",
				"lib.audio.requestingShort": "请求中…",
				"lib.audio.stop": "停止音频",
				"lib.audio.start": "启用麦克风",
				"lib.audio.usePreset": "用「音频极光」",
				"lib.audio.active": "音频响应中；关闭面板/省电/页面隐藏会自动停止。",
				"lib.audio.idle": "未启用。先应用 ShaderToy 壁纸，再启用。",
				"lib.shader.sourceAria": "着色器源码",
				"lib.shader.speed": "速度 ",
				"lib.shader.intensity": "强度 ",
				"lib.shader.hue": "色相 ",
				"lib.shader.apply": "应用着色器",
				"lib.shader.resetButton": "恢复默认",
				"lib.group.framing": "画面",
				"lib.framing.followWindow": "跟随窗口",
				"lib.framing.zoom": "缩放 ",
				"lib.framing.cx": "取景横向 ",
				"lib.framing.notCropped": "% · 当前画面未裁切",
				"lib.framing.cy": "取景纵向 ",
				"lib.framing.window": "窗口 ",
				"lib.framing.cropFollows": " · 裁切跟随窗口",
				"lib.framing.cropIs": " · 裁切 ",
				"lib.framing.hint": "取景滑杆只在画面被裁切时可用：提高缩放，或换一个与窗口不同的比例。",
				"lib.frame.needExplicit": "静态帧：先显式选择一个视频壁纸（自动选择不支持取帧）",
				"lib.frame.videoOnly": "静态帧：只有视频壁纸支持取帧",
				"lib.frame.hint": "静态帧：从当前视频取 6 帧，点一帧固定为静态壁纸",
				"lib.frame.busy": "取帧中…",
				"lib.frame.generate": "生成帧预览",
				"lib.frame.currentPrefix": "当前：静态帧 ",
				"lib.frame.currentSuffix": "s（「回到动态」恢复播放）",
				"lib.frame.set": "设为静态帧 ",
				"lib.playback.hint": "播放控制：倍速/翻转只影响视频；60fps 源仍按源帧率，倍速会按比例改变实际帧率。",
				"lib.playback.speed": "倍速",
				"lib.playback.pause": "暂停动态",
				"lib.playback.flip": "水平翻转",
				"lib.playback.filter": "画面滤镜",
				"lib.ctrl.on": "已开启",
				"lib.ctrl.offByDefault": "默认关闭",
				"lib.playback.filterOnHint": "滤镜会多一层全屏合成；4K/60fps 下若掉帧，先关掉它。",
				"lib.playback.filterOffHint": "滤镜默认关闭；开启后才对画面做亮度/对比度/饱和度调整。",
				"lib.filter.brightness": "亮度",
				"lib.filter.contrast": "对比度",
				"lib.filter.saturate": "饱和度",
				"lib.group.appearance": "外观",
				"lib.appearance.glassLabel": "玻璃不透明度 ",
				"lib.layer.slots": "叠加槽",
				"lib.layer.slotA": "A（下）",
				"lib.layer.slotB": "B（上）",
				"lib.layer.swap": "交换 A/B",
				"lib.layer.pattern": "图案",
				"lib.layer.imageAria": "本地图片叠加",
				"lib.layer.selectImage": "选本地图片…",
				"lib.layer.pasteImage": "或粘贴图片地址",
				"lib.layer.fit": "图片适配",
				"lib.layer.fitCover": "填满",
				"lib.layer.fitContain": "完整",
				"lib.layer.fitStretch": "拉伸",
				"lib.layer.offHint": "这一槽关闭；选「预设」或「图片」启用。",
				"lib.layer.opacity": "叠加不透明度 ",
				"lib.layer.blend": "混合",
				"lib.layer.hint": "两层都叠在视频/图片/Shader 之上；纯 CSS，不增加解码；省电时保持静态。",
				"lib.rail.title": "侧栏壁纸",
				"lib.rail.same": "与主壁纸相同",
				"lib.rail.separate": "独立分开",
				"lib.rail.follow": "侧栏：跟随主壁纸",
				"lib.group.performance": "自动/性能",
				"lib.perf.lowPower": "省电",
				"lib.ctrl.onShort": "开",
				"lib.ctrl.offShort": "关",
				"lib.perf.renderFps": "渲染帧率",
				"lib.perf.fpsHint": "帧率档位作用于 ShaderToy 渲染与侧栏镜像；视频走原生解码，按源帧率播放，60fps 源不需要设置。60fps 更耗电，省电设置优先。",
				"lib.perf.autoHint": "自动：低电量、省流量或系统开启「减少动态效果」时，暂停动态壁纸并冻结装饰动画",
				"lib.perf.onHint": "已暂停动态壁纸（停在当前帧），并冻结桌宠等装饰动画",
				"lib.perf.offHint": "始终播放动态壁纸，不再因电量或流量降级",
				"lib.rotation.title": "自动轮播",
				"lib.rotation.order": "顺序",
				"lib.rotation.random": "随机",
				"lib.rotation.interval": "间隔",
				"lib.unit.minutesShort": "分",
				"lib.rotation.favoritesOnly": "只轮播收藏",
				"lib.rotation.everyPrefix": "每 ",
				"lib.unit.secondsSuffix": " 秒",
				"lib.unit.minutesSuffix": " 分钟",
				"lib.rotation.onHint": "换一张；页面隐藏、省电或暂停播放时顺延，当前这张不会重复选中。",
				"lib.rotation.offHint": "开启后自动轮换本地/WE 的图片与视频；隐藏的壁纸不参与，坏文件会跳过。",
				"lib.group.recipe": "保存/分享",
				"lib.group.recipeValue": "精选 · 导出/导入",
				"lib.preset.aurora.label": "极光 · 暗角",
				"lib.preset.aurora.desc": "ShaderToy 极光 + 暗角，冷色桌面",
				"lib.preset.audioScan.label": "音频极光 · 扫描线",
				"lib.preset.audioScan.desc": "麦克风律动 + 扫描线；需手动启用麦克风",
				"lib.preset.cinemaGrain.label": "电影感 · 颗粒",
				"lib.preset.cinemaGrain.desc": "保留当前壁纸，只加颗粒和暗角",
				"lib.preset.nightGlow.label": "冷夜 · 光晕",
				"lib.preset.nightGlow.desc": "保留当前壁纸，叠加冷色光晕与扫描线",
				"lib.preset.clean.label": "纯净",
				"lib.preset.clean.desc": "清空两层叠加，回到干净壁纸",
				"lib.preset.applied": "已应用精选：{name}",
				"lib.recipeApplied": "配方已应用",
				"lib.recipeAppliedShader": "配方已应用（着色器源码无效，已保留原设置）",
				"lib.recipeBadApply": "导入失败：配方内容无法应用",
				"lib.handle.title": "壁纸（Alt+W）",
				"lib.handle.text": "壁纸",
				"lib.audio.stoppedOnClose": "面板已关闭，已停止音频",
				"lib.kind.scene": "场景",
				"lib.kind.shader": "着色器",
				"lib.kind.web": "网页",
				"lib.card.web": "网页 · WE web",
				"lib.status.web": "网页壁纸运行中",
				"lib.quality.web": "画质：网页壁纸（沙箱 iframe，分辨率随窗口）",
				"lib.hint.web": "网页壁纸在沙箱 iframe 里运行；隐藏页面、省电或关闭面板时暂停。",
				"lib.current.webPrefix": "网页 · ",
			},
			en: {
				"lib.sort": "Sort",
				"lib.sortName": "Name",
				"lib.sortKind": "Type",
				"lib.sortRecent": "Recent",
				"lib.sortFavorites": "Favorites first",
				"lib.favorites": "Favorites",
				"lib.hidden": "Show hidden",
				"lib.hiddenOn": "Hidden shown",
				"lib.filterClear": "Clear filters",
				"lib.filterEmpty": "No wallpapers match: change the keywords or clear the favorite/tag filters",
				"lib.searchPlaceholder": "Search name, tag or type",
				"lib.searchAria": "Search wallpapers",
				"lib.shareTitle": "Share link",
				"lib.shareCopy": "Copy share link",
				"lib.shareCopied": "Share link copied (config only, no media files)",
				"lib.shareFailed": "Copy failed — select the link below and copy it manually",
				"lib.shareHint": "The link carries the wallpaper, framing, appearance, playback, rotation, effects, context and typography config; it only writes settings when the receiver clicks Apply.",
				"lib.shareDetected": "Shared recipe detected ({n} items)",
				"lib.shareApply": "Apply",
				"lib.shareIgnore": "Ignore",
				"lib.shareApplied": "Shared recipe applied",
				"lib.shareIgnored": "Shared recipe ignored (nothing changed)",
				"lib.shareInvalid": "Invalid share link — ignored (nothing changed)",
				"lib.shareManual": "Or copy this link manually:",
				"lib.shareLinkAria": "Shared recipe link",
				"lib.shareLong": "The link is long (it embeds shader source); some chat tools may truncate it.",
				"lib.shareBuildFail": "Could not build the share link: {reason}",
				"lib.bundleTitle": "Bundle import / export",
				"lib.bundleHint": "The bundle holds settings, recipes and uploaded wallpapers; the host streams the export without buffering it in the page.",
				"lib.bundleExport": "Export bundle",
				"lib.bundleExportBusy": "Preparing download…",
				"lib.bundleExportStarted": "Download started. A 404 means the host half is still the old build — restart DSH and retry.",
				"lib.bundleExportFail": "Export failed: {reason}",
				"lib.bundleImport": "Import bundle",
				"lib.bundleImporting": "Importing…",
				"lib.bundleImportDone": "Import finished: {imported} added, {skipped} skipped",
				"lib.bundleImportSettings": "Settings were saved on the host; reload the page to apply them",
				"lib.bundleImportFail": "Import failed: {reason}",
				"lib.bundleImportSize": "The bundle exceeds the {mb}MB limit; split it and import in parts",
				"lib.bundleImportType": "Only .tgz / .tar.gz bundles are supported",
				"lib.bundleNoHost": "This host build exposes no bundle route — restart DSH Desktop to enable it.",
				"lib.bundleProgress": "Uploading {pct}%",
				"lib.recipeHint": "Recipe v2 carries the wallpaper, framing, appearance, playback, rotation, effects, context, legibility and typography config (including shader source and parameters).",
				"lib.recipeExported": "Recipe v2 generated — copy this to share it",
				"lib.recipeBadText": "Import failed: not valid recipe text",
				"lib.recipeBadValue": "Import failed: not a valid recipe",
				"lib.exportRecipe": "Export recipe",
				"lib.importRecipe": "Import recipe",
				"lib.resetWallpaper": "Reset wallpaper defaults",
				"lib.recipePlaceholder": "{ format: \"tianlight-recipe\", version: 2 }",
				"lib.we.readFailed": "Cannot read the folder list (restart DSH to enable the host route)",
				"lib.we.saving": "Saving…",
				"lib.we.savedPrefix": "Saved ",
				"lib.we.savedDirs": " folders",
				"lib.punct.openParen": " (",
				"lib.we.savedSkipped": " invalid/relative paths ignored — use absolute paths)",
				"lib.we.saveFailed": "Save failed: restart DSH to enable the host route",
				"lib.ctrl.off": "Off",
				"lib.slot.imageUnset": "Image (none selected)",
				"lib.kind.image": "Image",
				"lib.slot.preset": "Preset",
				"lib.url.empty": "Paste a direct image or video URL first",
				"lib.url.scheme": "The URL must start with http:// or https://",
				"lib.url.httpsBlocked": "This page is HTTPS, so the browser blocks http media; use an https URL",
				"lib.url.checking": "Checking the URL…",
				"lib.url.notMedia": "That is not a directly loadable image/video URL; use an address ending in .jpg/.png/.mp4/.webm, or pick Image/Video manually.",
				"lib.url.applied": "Applied: ",
				"lib.kind.video": "Video",
				"lib.url.remoteHost": "remote host",
				"lib.shader.compileFailed": "Compile failed: ",
				"lib.shader.applied": "Shader applied",
				"lib.shader.reset": "Defaults restored — click Apply shader to use them",
				"lib.audio.stopped": "Audio stopped",
				"lib.audio.requesting": "Requesting the microphone…",
				"lib.audio.failed": "Could not enable the microphone",
				"lib.shader.audioPreset": "Switched to Audio aurora — click Apply shader to use it",
				"lib.frame.sampling": "Extracting frames from the video…",
				"lib.frame.pickHint": "Click a frame to pin it as a still wallpaper (frames are lost after switching wallpapers)",
				"lib.frame.pinned": "Still frame pinned at ",
				"lib.frame.resumed": "Live playback restored",
				"lib.upload.hostStale": "The host half is still the old build (page updated, process not restarted): restart DSH Desktop, then upload again. Click Re-detect to re-check.",
				"lib.upload.notWritable": "The upload folder is not writable: check write permission on skin-tianlight/assets/",
				"lib.upload.tooBigPrefix": "Over ",
				"lib.upload.tooBigSuffix": "MB limit; compress 4K clips first or raise TIANLIGHT_UPLOAD_MAX",
				"lib.upload.types": "Only mp4/webm/mov/m4v/png/jpg/webp/avif/gif/svg are supported",
				"lib.upload.busy": "Uploading…",
				"lib.upload.done": "Uploaded: ",
				"lib.upload.failed": "Upload failed: ",
				"lib.current.auto": "Automatic (asset priority)",
				"lib.current.scenePrefix": "Scene · ",
				"lib.current.customShader": "Custom code",
				"lib.current.unnamed": "Untitled",
				"lib.current.videoStill": "Video still frame",
				"lib.quality.loadFailed": "Wallpaper failed to load: pick another file or check the codec/URL; the skin falls back to a playable frame",
				"lib.quality.scene": "Quality: WebWallGL real-time scene",
				"lib.quality.measured": " · measured ",
				"lib.quality.engineNotReady": " · engine not ready",
				"lib.quality.shader": "Quality: procedural shader, independent of source resolution",
				"lib.quality.source": "Quality: source ",
				"lib.quality.crop": " · current crop ≈ ",
				"lib.quality.upscaled": " · upscaled, may look soft",
				"lib.quality.native": " · no upscaling",
				"lib.quality.low": " (low)",
				"lib.quality.eightK": " · 8K sources may be downsampled",
				"lib.quality.duration": " · duration ",
				"lib.power.reducedMotion": "Reduced motion is on in the system",
				"lib.power.saveData": "Data saver is on in the browser",
				"lib.power.battery": "Battery is low and not charging",
				"lib.power.manual": "Low power turned on manually",
				"lib.status.lowPower": "Low-power pause",
				"lib.status.still": "Still frame",
				"lib.status.blocked": "Autoplay blocked",
				"lib.status.stalled": "Picture stalled",
				"lib.status.failed": "Load failed",
				"lib.status.image": "Image wallpaper",
				"lib.status.loading": "Loading",
				"lib.status.scene": "Scene running",
				"lib.status.shader": "Shader running",
				"lib.status.playing": "Playing",
				"lib.status.idle": "No wallpaper selected",
				"lib.status.paused": "Paused",
				"lib.status.ready": "Ready",
				"lib.hint.lowPowerPauseOpen": "Auto-paused by low power (",
				"lib.power.mode": "low power",
				"lib.hint.lowPowerPauseClose": "); click the button to turn low power off and resume playback.",
				"lib.hint.still": "Pinned to a still frame; it stays after a reload. Click Back to motion to resume playback.",
				"lib.hint.blocked": "The browser blocked autoplay. Click Play once; afterwards returning to the page resumes automatically.",
				"lib.hint.stalled": "Playback was requested but no new frame arrived. Click Retry to reload the current wallpaper.",
				"lib.hint.decodeFailedOpen": "Decode or playback failed (",
				"lib.common.unknownReason": "unknown reason",
				"lib.hint.decodeFailedClose": "); the skin falls back to a playable frame.",
				"lib.hint.idle": "No wallpaper selected yet; start from Sources below.",
				"lib.hint.buffering": "Loading/decoding; playback starts as soon as the picture appears.",
				"lib.hint.scene": "WebWallGL is rendering the WE scene; a failed load falls back to video/image.",
				"lib.hint.shader": "The procedural shader runs at the current render tier.",
				"lib.hint.videoPlaying": "The video is playing; switching pages pauses it and returning resumes.",
				"lib.hint.paused": "Paused on the current frame; click Resume playback to continue.",
				"lib.hint.ready": "The picture is ready.",
				"lib.action.lowPowerPlay": "Turn off low power and play",
				"lib.action.backToMotion": "Back to motion",
				"lib.action.play": "Play",
				"lib.action.retry": "Retry",
				"lib.action.pause": "Pause",
				"lib.action.resume": "Resume playback",
				"lib.quality.jitter": " · frame jitter ",
				"lib.quality.high": " (high)",
				"lib.listHint.url": "Paste the full media URL below; not a web page. Remote URLs play without being downloaded into the library.",
				"lib.listHint.shader": "Pick a preset or paste GLSL, tune the parameters, then click Apply shader.",
				"lib.listHint.weOpen": "Wallpaper Engine: ",
				"lib.unit.items": " items",
				"lib.listHint.weSceneOpen": " (scenes ",
				"lib.punct.closeParen": ")",
				"lib.listHint.weClose": "; change folders under Configure folders at the top of the list. Failed scenes fall back automatically.",
				"lib.listHint.local": "Local & uploads: ",
				"lib.listHint.localSuffix": " items. Click a thumbnail to apply it; 4K/8K are fine too.",
				"lib.listHint.all": "All wallpapers: ",
				"lib.listHint.allMiddle": " items (local ",
				"lib.listHint.allSuffix": "). Click a thumbnail to apply it, or filter above, or import from URL / WE folder / GLSL.",
				"lib.list.loading": "Loading…",
				"lib.list.failed": "Unavailable",
				"lib.list.loadingHint": "Loading the wallpaper list…",
				"lib.list.errNetwork": "Cannot read the wallpaper list: the host route or network failed",
				"lib.list.errHostStale": "Cannot read the wallpaper list: the host half is the old build — restart DSH Desktop and retry",
				"lib.pick.more": "More settings",
				"lib.pick.back": "Back to quick pick",
				"lib.pick.applied": "Switched to: {name}",
				"lib.pick.failed": "Switch failed: {reason}",
				"lib.pick.noScene": "Wallpaper scene is off: enable the Wallpaper module in Advanced",
				"lib.card.inUse": "In use",
				"lib.source.url": "URL",
				"lib.source.local": "Local/uploads",
				"lib.source.all": "All",
				"lib.source.engine": "Wallpaper Engine",
				"lib.we.detected": "Wallpaper Engine: {n} wallpapers detected (Steam Workshop {steam} / My projects {project})",
				"lib.we.openLibrary": "Open wallpaper library",
				"lib.we.openRequested": "Wallpaper library requested",
				"lib.we.openFallback": "Wallpaper library requested; if it did not open, go to Settings → Wallpaper",
				"lib.we.manual": "Advanced (manual path)",
				"lib.we.manualHint": "Only for legacy folders auto-detect cannot find; normally not needed.",
				"lib.we.autoDesc": "Auto-detects the local wallpaper library (no path setup)",
				"lib.we.staticHint": "Still HD",
				"lib.we.staticHintTitle": "Scenes apply as a still HD image; opt into Generate animated in the settings page",
				"lib.listHint.engine": "Wallpaper Engine: {n} wallpapers (auto-detected — click a card to apply; scenes are still-HD)",
				"lib.listValue.pasteUrl": "Paste URL",
				"lib.ctrl.auto": "Auto",
				"lib.appearance.glassPrefix": "Glass ",
				"lib.perf.powerAuto": "Low power auto",
				"lib.perf.powerOn": "Low power on",
				"lib.perf.powerOff": "Low power off",
				"lib.perf.rotationOn": " · rotation on",
				"lib.panel.title": "Wallpaper",
				"lib.view.pick": "Pick",
				"lib.view.advanced": "Advanced",
				"lib.panel.close": "Close the wallpaper sidebar",
				"lib.current.prefix": "Current wallpaper: ",
				"lib.source.localShort": "Local",
				"lib.label.playing": "Playing",
				"lib.label.unlock": "Needs a click",
				"lib.label.play": "Play",
				"lib.group.sources": "Sources (folders/code)",
				"lib.punct.colon": ": ",
				"lib.group.list": "Wallpaper list",
				"lib.we.hint": "Paste the Wallpaper Engine projects folders here, one per line; read-only, the original files are untouched.",
				"lib.we.placeholder": "One absolute path per line, e.g. …/steamapps/workshop/content/431960/<projectID>",
				"lib.we.save": "Save folders",
				"lib.upload.title": "Uploaded files appear in the local list; same-name files are not overwritten",
				"lib.upload.button": "Upload wallpaper",
				"lib.upload.hostStaleShort": "Host half needs a DSH restart",
				"lib.upload.limitSuffix": "MB · images/videos",
				"lib.upload.redetecting": "Re-checking the host routes…",
				"lib.upload.redetect": "Re-detect",
				"lib.hiddenHint": "Hiding only changes the list; source files are kept",
				"lib.tag.prefix": "Tags: ",
				"lib.tag.remove": "Remove this tag",
				"lib.tag.placeholder": "Type a tag and press Enter, e.g. night",
				"lib.common.done": "Done",
				"lib.card.autoTitle": "Automatic",
				"lib.card.autoNote": "Asset priority",
				"lib.card.scene": "Scene · WebWallGL",
				"lib.card.unhide": "Show again",
				"lib.card.hide": "Hide",
				"lib.card.unhideTitle": "Show again (files are kept)",
				"lib.card.hideTitle": "Hide (files kept, playback not interrupted)",
				"lib.card.unhideShort": "S",
				"lib.card.hideShort": "H",
				"lib.card.unfavorite": "Remove favorite",
				"lib.card.favorite": "Favorite",
				"lib.card.editTags": "Edit tags",
				"lib.empty.we": "No readable video/scene in this source: legacy folders can be checked under Advanced ① → Advanced (manual path); auto-detected items live under the Wallpaper Engine source.",
				"lib.empty.all": "No wallpapers yet: click Upload wallpaper below, or use Import URL / WE folder / GLSL above.",
				"lib.empty.local": "No local wallpapers yet: put images/videos into skin-tianlight/assets/ and reload, or click Upload wallpaper.",
				"lib.empty.engine": "No Wallpaper Engine wallpapers to show: check auto-detection in Settings → Wallpaper.",
				"lib.empty.showAll": "View all wallpapers",
				"lib.url.hint": "Only directly loadable media URLs: image or video addresses, not web pages. Remote URLs play without being downloaded; upload to add to the library.",
				"lib.field.type": "Type",
				"lib.url.pasted": "Pasted from the clipboard — click Apply URL or press Enter",
				"lib.url.clipboardEmpty": "The clipboard is empty; press Ctrl+V manually",
				"lib.url.clipboardDenied": "The browser refused clipboard access; press Ctrl+V manually",
				"lib.url.paste": "Paste",
				"lib.url.placeholder": "Paste a full direct URL, e.g. https://…/wallpaper.mp4",
				"lib.url.checkingShort": "Checking…",
				"lib.url.apply": "Apply URL",
				"lib.url.autoHint": "Auto checks the extension first and probes the media when there is none; keep Auto if unsure.",
				"lib.quick.label": "Quick sources",
				"lib.quick.url": "URL",
				"lib.quick.urlHint": "Direct image or video link",
				"lib.quick.shader": "ShaderToy",
				"lib.quick.shaderHint": "Preset or your own GLSL",
				"lib.shader.intro": "ShaderToy style: no account and no scraping. ① pick a preset or paste GLSL → ② tune speed/intensity/hue → ③ click Apply shader.",
				"lib.shader.uniforms": "Available uniforms: iTime / iResolution / iMouse / u_speed / u_intensity / u_hue / u_audio.",
				"lib.audio.hint": "Audio response: sends the live microphone level to u_audio; analysis only, never recorded or uploaded.",
				"lib.audio.requestingShort": "Requesting…",
				"lib.audio.stop": "Stop audio",
				"lib.audio.start": "Enable microphone",
				"lib.audio.usePreset": "Use Audio aurora",
				"lib.audio.active": "Audio response is live; closing the panel, low power or a hidden page stops it.",
				"lib.audio.idle": "Not enabled. Apply a ShaderToy wallpaper first.",
				"lib.shader.sourceAria": "Shader source",
				"lib.shader.speed": "Speed ",
				"lib.shader.intensity": "Intensity ",
				"lib.shader.hue": "Hue ",
				"lib.shader.apply": "Apply shader",
				"lib.shader.resetButton": "Reset defaults",
				"lib.group.framing": "Picture",
				"lib.framing.followWindow": "Fit window",
				"lib.framing.zoom": "Zoom ",
				"lib.framing.cx": "Framing X ",
				"lib.framing.notCropped": "% · not cropped",
				"lib.framing.cy": "Framing Y ",
				"lib.framing.window": "Window ",
				"lib.framing.cropFollows": " · crop follows the window",
				"lib.framing.cropIs": " · crop ",
				"lib.framing.hint": "Framing sliders only work when the picture is cropped: raise the zoom or pick a ratio different from the window.",
				"lib.frame.needExplicit": "Still frame: select a video wallpaper explicitly first (Automatic does not support frame picking)",
				"lib.frame.videoOnly": "Still frame: only video wallpapers support frame picking",
				"lib.frame.hint": "Still frame: take 6 frames from the current video; click one to pin it as the wallpaper",
				"lib.frame.busy": "Extracting frames…",
				"lib.frame.generate": "Generate frame preview",
				"lib.frame.currentPrefix": "Current: still frame ",
				"lib.frame.currentSuffix": "s (Back to motion resumes playback)",
				"lib.frame.set": "Pin still frame ",
				"lib.playback.hint": "Playback: speed/flip affect video only; a 60fps source keeps its rate and speed scales the effective frame rate.",
				"lib.playback.speed": "Speed",
				"lib.playback.pause": "Pause",
				"lib.playback.flip": "Flip horizontally",
				"lib.playback.filter": "Picture filter",
				"lib.ctrl.on": "On",
				"lib.ctrl.offByDefault": "Off by default",
				"lib.playback.filterOnHint": "The filter adds one full-screen composite; if 4K/60fps drops frames, turn it off first.",
				"lib.playback.filterOffHint": "The filter is off by default; enable it to adjust brightness/contrast/saturation.",
				"lib.filter.brightness": "Brightness",
				"lib.filter.contrast": "Contrast",
				"lib.filter.saturate": "Saturation",
				"lib.group.appearance": "Appearance",
				"lib.appearance.glassLabel": "Glass opacity ",
				"lib.layer.slots": "Overlay slots",
				"lib.layer.slotA": "A (lower)",
				"lib.layer.slotB": "B (upper)",
				"lib.layer.swap": "Swap A/B",
				"lib.layer.pattern": "Pattern",
				"lib.layer.imageAria": "Local image overlay",
				"lib.layer.selectImage": "Select a local image…",
				"lib.layer.pasteImage": "Or paste an image URL",
				"lib.layer.fit": "Image fit",
				"lib.layer.fitCover": "Fill",
				"lib.layer.fitContain": "Fit",
				"lib.layer.fitStretch": "Stretch",
				"lib.layer.offHint": "This slot is off; choose Preset or Image to enable it.",
				"lib.layer.opacity": "Overlay opacity ",
				"lib.layer.blend": "Blend",
				"lib.layer.hint": "Both slots sit above video/image/shader with pure CSS: no extra decoding, frozen under low power.",
				"lib.rail.title": "Rail wallpaper",
				"lib.rail.same": "Same as main",
				"lib.rail.separate": "Separate",
				"lib.rail.follow": "Rail: follow the main wallpaper",
				"lib.group.performance": "Auto / performance",
				"lib.perf.lowPower": "Low power",
				"lib.ctrl.onShort": "On",
				"lib.ctrl.offShort": "Off",
				"lib.perf.renderFps": "Render frame rate",
				"lib.perf.fpsHint": "The tier drives ShaderToy rendering and the rail mirror; video uses native decoding at its source rate, so a 60fps source needs no setting. 60fps costs more power; low-power settings win.",
				"lib.perf.autoHint": "Auto: on low battery, data saver or reduced motion, pause the animated wallpaper and freeze decorative animations",
				"lib.perf.onHint": "The animated wallpaper is paused on its current frame and decorative animations (companion etc.) are frozen",
				"lib.perf.offHint": "Always play the animated wallpaper; no battery/data downgrade",
				"lib.rotation.title": "Auto rotation",
				"lib.rotation.order": "Order",
				"lib.rotation.random": "Random",
				"lib.rotation.interval": "Interval",
				"lib.unit.minutesShort": "min",
				"lib.rotation.favoritesOnly": "Favorites only",
				"lib.rotation.everyPrefix": "Every ",
				"lib.unit.secondsSuffix": " s",
				"lib.unit.minutesSuffix": " min",
				"lib.rotation.onHint": "switch to the next one; it waits while the page is hidden, under low power or when playback is paused, and never repeats the current wallpaper.",
				"lib.rotation.offHint": "When on, rotate local/WE images and videos automatically; hidden wallpapers are excluded and broken files are skipped.",
				"lib.group.recipe": "Save / share",
				"lib.group.recipeValue": "Presets · export/import",
				"lib.preset.aurora.label": "Aurora · vignette",
				"lib.preset.aurora.desc": "ShaderToy aurora + vignette, cool desktop",
				"lib.preset.audioScan.label": "Audio aurora · scanlines",
				"lib.preset.audioScan.desc": "Microphone pulse + scanlines; enable the mic manually",
				"lib.preset.cinemaGrain.label": "Cinematic · grain",
				"lib.preset.cinemaGrain.desc": "Keep the current wallpaper, add grain + vignette only",
				"lib.preset.nightGlow.label": "Cold night · glow",
				"lib.preset.nightGlow.desc": "Keep the current wallpaper, add a cold glow + scanlines",
				"lib.preset.clean.label": "Clean",
				"lib.preset.clean.desc": "Clear both overlay slots for a clean wallpaper",
				"lib.preset.applied": "Applied preset: {name}",
				"lib.recipeApplied": "Recipe applied",
				"lib.recipeAppliedShader": "Recipe applied (invalid shader source; original settings kept)",
				"lib.recipeBadApply": "Import failed: the recipe could not be applied",
				"lib.handle.title": "Wallpaper (Alt+W)",
				"lib.handle.text": "Wallpaper",
				"lib.audio.stoppedOnClose": "Panel closed — audio stopped",
				"lib.kind.scene": "Scene",
				"lib.kind.shader": "Shader",
				"lib.kind.web": "Web",
				"lib.card.web": "Web · WE web",
				"lib.status.web": "Web wallpaper running",
				"lib.quality.web": "Quality: web wallpaper (sandboxed iframe, sized to the window)",
				"lib.hint.web": "The web wallpaper runs in a sandboxed iframe; it pauses when the page is hidden, under low power or when the panel closes.",
				"lib.current.webPrefix": "Web · ",
			},
		});

		/**
		 * v0.5.0 面板新增样式。整块必须落在 body[data-dsh-tianlight] 作用域下
		 * （agent-check / check-css 校验）；既有控件继续复用 v0.4.0 的类，
		 * 面板几何不变，只给新控件补最小样式。
		 */
		registerTl5Css(String.raw`
body[data-dsh-tianlight] .tl-wall-sort-row {
	display: flex;
	flex-wrap: wrap;
	gap: 4px 6px;
	align-items: center;
}
body[data-dsh-tianlight] .tl-wall-facet-row {
	display: flex;
	flex-wrap: wrap;
	gap: 4px;
	align-items: center;
}
body[data-dsh-tianlight] .tl-wall-share-strip {
	display: flex;
	flex-direction: column;
	gap: 6px;
	margin: 2px 0 4px;
	padding: 7px 9px;
	border-radius: 10px;
	border: 0.5px solid var(--tl-accent);
	background: color-mix(in srgb, var(--tl-accent) 12%, var(--tl-glass-fill));
	color: var(--tl-ink);
	font-size: 11px;
	line-height: 1.45;
}
body[data-dsh-tianlight] .tl-wall-share-strip[data-tone="warn"] {
	border-color: var(--tl-line-strong);
	background: var(--tl-glass-fill);
	color: var(--tl-ink-soft);
}
body[data-dsh-tianlight] .tl-wall-share-strip-text {
	margin: 0;
	font-weight: 600;
}
body[data-dsh-tianlight] .tl-wall-share-strip-actions {
	display: flex;
	flex-wrap: wrap;
	gap: 4px;
	align-items: center;
}
body[data-dsh-tianlight] .tl-wall-bundle-row {
	display: flex;
	flex-wrap: wrap;
	gap: 6px;
	align-items: center;
}
body[data-dsh-tianlight] .tl-wall-progress {
	width: 100%;
	height: 6px;
	accent-color: var(--tl-accent);
}
body[data-dsh-tianlight] .tl-wall-v05-note {
	margin: 0;
	font-size: 10px;
	line-height: 1.5;
	color: var(--tl-ink-faint);
}
/* v0.5.2: the English copy is longer than the Chinese one. Rows already wrap
   (.tl-wall-tabs does); long button/chip labels must wrap too instead of pushing
   the fixed-width panel wider (measured on the 296px sidebar). */
body[data-dsh-tianlight] [data-tl-wall] .tl-font-option,
body[data-dsh-tianlight] [data-tl-wall] .tl-wall-filter-chip,
body[data-dsh-tianlight] [data-tl-wall] .tl-wall-import-btn,
body[data-dsh-tianlight] [data-tl-wall] .tl-font-reset {
	max-width: 100%;
	white-space: normal;
	overflow-wrap: anywhere;
	word-break: break-word;
}
body[data-dsh-tianlight] [data-tl-wall] .tl-wall-tabs,
body[data-dsh-tianlight] [data-tl-wall] .tl-wall-import-row,
body[data-dsh-tianlight] [data-tl-wall] .tl-wall-sort-row,
body[data-dsh-tianlight] [data-tl-wall] .tl-wall-bundle-row,
body[data-dsh-tianlight] [data-tl-wall] .tl-wall-share-strip-actions,
body[data-dsh-tianlight] [data-tl-wall] .tl-wall-filter-row,
body[data-dsh-tianlight] [data-tl-wall] .tl-wall-filters {
	flex-wrap: wrap;
}
body[data-dsh-tianlight] [data-tl-wall] .tl-font-input,
body[data-dsh-tianlight] [data-tl-wall] .tl-font-select,
body[data-dsh-tianlight] [data-tl-wall] .tl-wall-textarea,
body[data-dsh-tianlight] [data-tl-wall] .tl-source-card {
	max-width: 100%;
	box-sizing: border-box;
	overflow-wrap: anywhere;
}
/* ---- v0.5.3 quick picker -------------------------------------------------
   The pick view is a wallpaper chooser, not a settings page: compact header,
   visual 2-column grid, no upload/import rows. The advanced view keeps the full
   v0.5.2 guide. All rules stay scoped to the skin body + panel. */
body[data-dsh-tianlight] [data-tl-wall] .tl-wall-more-settings {
	margin-left: auto;
	border-color: var(--tl-accent);
	background: color-mix(in srgb, var(--tl-accent) 14%, transparent);
	color: var(--tl-ink);
	font-weight: 600;
	padding: 4px 10px;
}
body[data-dsh-tianlight] [data-tl-wall] .tl-wall-more-settings:hover {
	background: color-mix(in srgb, var(--tl-accent) 22%, transparent);
}
body[data-dsh-tianlight] [data-tl-wall] .tl-wall-back-quick {
	border-color: var(--tl-accent);
	background: color-mix(in srgb, var(--tl-accent) 12%, transparent);
	color: var(--tl-ink);
	font-weight: 600;
}
body[data-dsh-tianlight] [data-tl-wall] .tl-wall-pick-status {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 6px;
	margin: 2px 0 0;
}
body[data-dsh-tianlight] [data-tl-wall] .tl-wall-pick-status .tl-wall-status {
	margin: 0;
}
body[data-dsh-tianlight] [data-tl-wall] .tl-wall-pick-error {
	margin: 0;
	width: 100%;
	font-size: 11px;
	line-height: 1.5;
	color: var(--tl-ink);
	border-left: 2px solid var(--tl-line-strong);
	padding-left: 6px;
}
/* In the pick view the sticky block is a compact bar; its guide only keeps the
   source chips (and a pending share-recipe strip). */
body[data-dsh-tianlight] [data-tl-wall] [data-tl-view="pick"] .tl-wall-guide {
	gap: 4px;
	margin-bottom: 0;
}
body[data-dsh-tianlight] [data-tl-wall] [data-tl-view="pick"] .tl-wall-view-switch {
	display: none;
}
body[data-dsh-tianlight] [data-tl-wall] [data-tl-view="pick"] .tl-wall-head {
	gap: 6px;
}
/* The grid is the body of the picker: two large columns, bigger previews. */
body[data-dsh-tianlight] [data-tl-wall] .tl-wall-grid-pick {
	gap: 10px;
	margin: 2px 0 0;
}
body[data-dsh-tianlight] [data-tl-wall] .tl-wall-grid-pick .tl-wall-cell > .tl-wall-card {
	padding: 7px;
	gap: 7px;
	border-radius: 14px;
}
body[data-dsh-tianlight] [data-tl-wall] .tl-wall-grid-pick .tl-wall-thumb {
	aspect-ratio: 4 / 3;
	border-radius: 10px;
}
/* "Click anywhere on the card switches": preview media must not eat the gesture. */
body[data-dsh-tianlight] [data-tl-wall] .tl-wall-grid-pick .tl-wall-thumb > img,
body[data-dsh-tianlight] [data-tl-wall] .tl-wall-grid-pick .tl-wall-thumb > video {
	pointer-events: none;
}
body[data-dsh-tianlight] [data-tl-wall] .tl-wall-grid-pick .tl-wall-name {
	font-size: 12px;
	font-weight: 600;
	line-height: 1.35;
	white-space: normal;
	overflow-wrap: anywhere;
}
body[data-dsh-tianlight] [data-tl-wall] .tl-wall-grid-pick .tl-wall-tags-mini {
	white-space: normal;
	line-height: 1.35;
}
body[data-dsh-tianlight] [data-tl-wall] .tl-wall-grid-pick .tl-wall-card[data-active] {
	border-color: var(--tl-accent);
	box-shadow: 0 0 0 2px color-mix(in srgb, var(--tl-accent) 40%, transparent);
}
body[data-dsh-tianlight] [data-tl-wall] .tl-wall-using {
	align-self: flex-start;
	padding: 1px 7px;
	border-radius: 999px;
	background: var(--tl-accent);
	color: #ffffff;
	font-size: 10px;
	font-weight: 700;
	line-height: 1.5;
	letter-spacing: 0.02em;
}
/* Transient "switched to …" feedback. The host is a transformed fixed layer, so a
   fixed toast is positioned against the panel itself. */
body[data-dsh-tianlight] [data-tl-wall] .tl-wall-toast {
	position: fixed;
	left: 14px;
	right: 14px;
	bottom: calc(18px + env(safe-area-inset-bottom, 0px));
	z-index: 6;
	padding: 8px 12px;
	border-radius: 12px;
	border: 0.5px solid var(--tl-glass-line);
	background: color-mix(in srgb, var(--tl-panel-fill) 92%, var(--tl-accent));
	color: var(--tl-ink);
	font-size: 12px;
	line-height: 1.4;
	box-shadow: 0 8px 24px rgba(8, 26, 48, 0.22);
	pointer-events: none;
	overflow-wrap: anywhere;
	animation: tl-wall-toast-in 0.16s ease-out;
}
@keyframes tl-wall-toast-in {
	from { opacity: 0; transform: translateY(6px); }
	to { opacity: 1; transform: translateY(0); }
}
/* ---- v0.6.0 Wallpaper Engine library ------------------------------------- */
/* Four source chips (all/local/legacy-WE/engine) must wrap inside the 296px panel
   instead of being squeezed into the old 3-column grid. */
body[data-dsh-tianlight] [data-tl-wall] .tl-wall-filter-row {
	display: flex;
	flex-wrap: wrap;
	gap: 4px;
}
body[data-dsh-tianlight] [data-tl-wall] .tl-wall-filter-row .tl-wall-filter-chip {
	flex: 0 1 auto;
	max-width: 100%;
}
body[data-dsh-tianlight] [data-tl-wall] .tl-we-auto {
	display: flex;
	flex-wrap: wrap;
	gap: 6px;
	align-items: center;
	margin: 2px 0 0;
}
body[data-dsh-tianlight] [data-tl-wall] .tl-we-auto-text {
	flex: 1 1 150px;
	min-width: 0;
	overflow-wrap: anywhere;
}
body[data-dsh-tianlight] [data-tl-wall] .tl-we-open-library {
	flex: 0 0 auto;
	border-color: var(--tl-accent);
	background: color-mix(in srgb, var(--tl-accent) 14%, transparent);
	color: var(--tl-ink);
	font-weight: 600;
}
body[data-dsh-tianlight] [data-tl-wall] .tl-we-open-library:hover {
	background: color-mix(in srgb, var(--tl-accent) 22%, transparent);
}
/* The manual-path fallback is a nested collapsed details; keep it quiet. */
body[data-dsh-tianlight] [data-tl-wall] .tl-we-manual {
	margin-top: 2px;
	padding: 5px 7px;
	border-style: dashed;
	background: transparent;
}
body[data-dsh-tianlight] [data-tl-wall] .tl-we-manual > summary {
	font-size: 11px;
	font-weight: 500;
	color: var(--tl-ink-soft);
}
body[data-dsh-tianlight] [data-tl-wall] .tl-we-manual-body {
	display: flex;
	flex-direction: column;
	gap: 6px;
}
body[data-dsh-tianlight] [data-tl-wall] .tl-wall-badge-hint {
	align-self: flex-start;
	padding: 0 6px;
	border-radius: 999px;
	border: 0.5px solid var(--tl-line-strong);
	color: var(--tl-ink-soft);
	font-size: 9px;
	font-weight: 600;
	line-height: 1.6;
	cursor: help;
}
`);

		/** v0.5.0 面板「最近使用」顺序：只记录用户主动选中的壁纸，供排序使用。 */
		const PANEL_RECENT_KEY = "tianlight.recent";
		/** v0.5.2: one silent list retry before the panel reports a failure (~1.2s). */
		const PANEL_LIST_RETRY_MS = 1200;
		function readPanelRecent() {
			try {
				const raw = JSON.parse(globalThis.localStorage?.getItem(PANEL_RECENT_KEY) ?? "null");
				if (!Array.isArray(raw)) return [];
				return [...new Set(raw.filter((url) => typeof url === "string" && url !== ""))].slice(0, 64);
			} catch {
				return [];
			}
		}

		/**
		 * v0.5.0 D3 分享链接：`#tl=<base64url(recipe json)>`。哈希不会发给宿主，
		 * 也不写任何设置；只有用户在确认条里点「应用」才会走 applyPresetValue
		 * 那套既有 normalizer。
		 */
		const PANEL_SHARE_FORMATS = ["tianlight-recipe", "tianlight-preset"];
		const PANEL_SHARE_KEYS = [
			"zones",
			"glass",
			"lowPower",
			"lowpower",
			"wallpaper",
			"shader",
			"layers",
			"playback",
			"rotation",
			"effects",
			"context",
			"legibility",
			"typography",
		];
		const PANEL_SHARE_MAX = 512 * 1024;
		/** D2 导入包上限：超过后先提示，绝不把大文件读进内存。 */
		const PANEL_BUNDLE_LIMIT = 256 * 1024 * 1024;

		function tl5Base64UrlEncode(text) {
			const bytes = new TextEncoder().encode(String(text));
			let binary = "";
			const chunk = 0x8000;
			for (let index = 0; index < bytes.length; index += chunk) {
				binary += String.fromCharCode.apply(null, bytes.subarray(index, index + chunk));
			}
			return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
		}

		function tl5Base64UrlDecode(data) {
			const padded = String(data)
				.replace(/-/g, "+")
				.replace(/_/g, "/");
			const withPad = padded + "=".repeat((4 - (padded.length % 4)) % 4);
			const binary = atob(withPad);
			const bytes = new Uint8Array(binary.length);
			for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
			return new TextDecoder().decode(bytes);
		}

		/** 只认 tianlight-recipe/preset 形状；返回 { recipe, count } 或 null。 */
		function readTl5RecipeObject(value) {
			if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
			const format = typeof value.format === "string" ? value.format : "";
			if (format !== "" && PANEL_SHARE_FORMATS.includes(format) === false) return null;
			const version = Number(value.version);
			if (!Number.isFinite(version) || version < 1 || version > 2) return null;
			let count = 0;
			for (const key of PANEL_SHARE_KEYS) {
				const present = value[key] !== undefined && value[key] !== null;
				if (present === false) continue;
				// lowPower / lowpower 是同一个字段的两种写法，只计一次。
				if (key === "lowpower" && value.lowPower !== undefined && value.lowPower !== null) continue;
				count += 1;
			}
			if (count === 0) return null;
			return { recipe: value, count };
		}

		function decodeTl5ShareRecipe(payload) {
			try {
				if (typeof payload !== "string" || payload.length < 8 || payload.length > PANEL_SHARE_MAX) return null;
				return readTl5RecipeObject(JSON.parse(tl5Base64UrlDecode(payload)));
			} catch {
				return null;
			}
		}

		function clearTl5ShareHash() {
			try {
				const location = globalThis.location;
				if (location === undefined || location === null) return;
				const clean = String(location.pathname ?? "") + String(location.search ?? "");
				if (typeof globalThis.history?.replaceState === "function") globalThis.history.replaceState(null, "", clean);
			} catch {
				// history may be unavailable; an un-cleared hash changes nothing
			}
		}

		/** 读取当前 URL 的 #tl=；非法链接立即清掉并只记一条警告，绝不写设置。 */
		function readTl5ShareHash() {
			try {
				const hash = String(globalThis.location?.hash ?? "");
				if (hash.startsWith("#tl=") === false) return null;
				const decoded = decodeTl5ShareRecipe(hash.slice(4));
				if (decoded === null) {
					note("share:invalid-link", {});
					clearTl5ShareHash();
					return null;
				}
				return decoded;
			} catch (error) {
				note("share:read-link", error);
				return null;
			}
		}

		function installWallpaperSidebar(ctx) {
			if (React === null || typeof ctx.inject !== "function") return () => {};

			/**
			 * Curated presets shipped with the skin. The same recipes live in
			 * presets/*.json as shareable copies; the panel uses this list so browsing
			 * the gallery never needs a network call.
			 */
			const PRESET_ZONES = {
				separate: false,
				main: { fit: "cover", ratio: "auto", zoom: 100, cx: 50, cy: 50, fx: 38, fy: 50, dim: 0, blur: 0 },
				rail: { fit: "cover", fx: 50, fy: 50, dim: 16, blur: 0, url: "", kind: "video" },
			};
			const presetSlot = (kind, preset, opacity, blend) => ({ kind, preset, url: "", fit: "cover", opacity, blend });
			const CURATED_PRESETS = [
				{
					id: "aurora-vignette",
					labelKey: "lib.preset.aurora.label",
					descKey: "lib.preset.aurora.desc",
					value: {
						format: "tianlight-preset",
						version: 1,
						zones: PRESET_ZONES,
						glass: 1,
						lowPower: "auto",
						wallpaper: { kind: "shader", url: "shader://live" },
						shader: { preset: "aurora", source: SHADER_SOURCES.aurora, speed: 1, intensity: 1, hue: 0.58 },
						layers: { version: 2, slots: [presetSlot("preset", "vignette", 0.45, "normal"), presetSlot("none", "none", 0.55, "normal")] },
					},
				},
				{
					id: "audio-scan",
					labelKey: "lib.preset.audioScan.label",
					descKey: "lib.preset.audioScan.desc",
					value: {
						format: "tianlight-preset",
						version: 1,
						zones: PRESET_ZONES,
						glass: 1,
						lowPower: "auto",
						wallpaper: { kind: "shader", url: "shader://live" },
						shader: { preset: "audio", source: SHADER_SOURCES.audio, speed: 1, intensity: 1, hue: 0.58 },
						layers: { version: 2, slots: [presetSlot("preset", "scan", 0.28, "screen"), presetSlot("preset", "glow", 0.22, "screen")] },
					},
				},
				{
					id: "cinema-grain",
					labelKey: "lib.preset.cinemaGrain.label",
					descKey: "lib.preset.cinemaGrain.desc",
					value: {
						format: "tianlight-preset",
						version: 1,
						layers: { version: 2, slots: [presetSlot("preset", "grain", 0.38, "overlay"), presetSlot("preset", "vignette", 0.5, "multiply")] },
					},
				},
				{
					id: "night-glow",
					labelKey: "lib.preset.nightGlow.label",
					descKey: "lib.preset.nightGlow.desc",
					value: {
						format: "tianlight-preset",
						version: 1,
						layers: { version: 2, slots: [presetSlot("preset", "glow", 0.35, "screen"), presetSlot("preset", "scan", 0.18, "normal")] },
					},
				},
				{
					id: "clean",
					labelKey: "lib.preset.clean.label",
					descKey: "lib.preset.clean.desc",
					value: {
						format: "tianlight-preset",
						version: 1,
						layers: { version: 2, slots: [presetSlot("none", "none", 0.55, "normal"), presetSlot("none", "none", 0.55, "normal")] },
					},
				},
			];

			const WallpaperPanel = (props) => {
				// v0.5.0: re-render on a language change. This hook is the first hook in
				// the component so the hook order stays fixed for its whole lifetime.
				const { t } = useTl5I18n();
				const [items, setItems] = React.useState([]);
				const [active, setActive] = React.useState(() => {
					const chosen = readWallpaperChoice();
					return chosen === null ? "" : chosen.url;
				});
				// The full choice, not just its URL: the frame picker needs kind + still.
				const [activeChoice, setActiveChoice] = React.useState(() => readWallpaperChoice());
				const [draft, setDraft] = React.useState("");
				const [draftKind, setDraftKind] = React.useState("auto");
				const [draftBusy, setDraftBusy] = React.useState(false);
				const [draftNote, setDraftNote] = React.useState("");
				const [noteText, setNote] = React.useState("");
				const [weOpen, setWeOpen] = React.useState(false);
				// The source row is a real tab: it owns the highlight and the list contents.
				// "local" shows assets/, "we" shows the WE roots, "url" swaps the grid for
				// the URL composer, and "shader" for the GLSL editor.
				// "all" is the default: the panel opens on a single wallpaper grid, not a
				// source questionnaire. local/we are filters; URL and GLSL are composers.
				const [sourceTab, setSourceTab] = React.useState("all");
				const [composer, setComposer] = React.useState("none");
				// Two surfaces, one panel: "pick" is just sources + the list; "advanced"
				// reveals the adjustment groups. The old six-section wall was the main
				// complaint, so the default view no longer shows it at all.
				const [view, setView] = React.useState("pick");
				// v0.5.3 quick picker: "更多设置"/"返回快捷选择" replace the old
				// discoverability hint; the pick view is a pure visual grid.
				const [toast, setToast] = React.useState(null);
				const [pickError, setPickError] = React.useState("");
				const showToast = (text) => {
					const next = { text, at: Date.now() };
					setToast(next);
					globalThis.setTimeout(() => {
						setToast((current) => (current !== null && current.at === next.at ? null : current));
					}, 1800);
				};
				// ---- library: search, favourites and tags ----
				const [library, setLibrary] = React.useState(() => wallpaperLibraryController.read());
				const [query, setQuery] = React.useState("");
				const [favoritesOnly, setFavoritesOnly] = React.useState(false);
				const [showHidden, setShowHidden] = React.useState(false);
				const [tagFilter, setTagFilter] = React.useState([]);
				const [tagEditorUrl, setTagEditorUrl] = React.useState("");
				const [tagDraft, setTagDraft] = React.useState("");
				const [uploadBusy, setUploadBusy] = React.useState(false);
				const [uploadNote, setUploadNote] = React.useState("");
				// ---- v0.5.2: wallpaper list loading / retry state ----
				// "loading" until the first _wallpapers answer (or its silent retry);
				// "error" only after both attempts failed, with an inline retry button.
				const [listState, setListState] = React.useState("loading");
				const [listAttempt, setListAttempt] = React.useState(0);
				const applyWallpaperList = (list) => {
					if (list === null) return;
					setItems(list);
					setListState("ready");
				};
				// ---- library v2: explicit sort + recent-use order ----
				const [sortMode, setSortMode] = React.useState("name");
				const [recentUrls, setRecentUrls] = React.useState(() => readPanelRecent());
				const rememberWallpaper = (url) => {
					if (typeof url !== "string" || url === "") return;
					setRecentUrls((current) => {
						const next = [url, ...current.filter((entry) => entry !== url)].slice(0, 64);
						try {
							globalThis.localStorage?.setItem(PANEL_RECENT_KEY, JSON.stringify(next));
						} catch {
							// usage order is a convenience, never a requirement
						}
						return next;
					});
				};
				// Optional engine availability, fetched once: the WE tab tells the truth
				// about scene support instead of rendering a dead card.
				const [engine, setEngine] = React.useState(null);
				const [engineProbe, setEngineProbe] = React.useState(0);
				React.useEffect(() => {
					let alive = true;
					// The build query is a host/client handshake: a host started from an older
					// plugin build answers `stale: true`, which the panel surfaces as a
					// "restart DSH" hint instead of a bare network error on upload.
					void fetch(ASSET_BASE + "/_engines?build=" + encodeURIComponent(HOST_BUILD), { cache: "no-store" })
						.then((response) => (response.ok ? response.json() : null))
						.then((value) => {
							if (alive) setEngine(value ?? { webwallgl: false, adapter: false, sceneProjects: 0, stale: true });
						})
						.catch(() => {
							if (alive) setEngine({ webwallgl: false, adapter: false, sceneProjects: 0, stale: true });
						});
					return () => {
						alive = false;
					};
				}, [engineProbe]);
				const hostStale = engine !== null && engine.stale === true;
				// ---- ShaderToy-style GLSL editor ----
				const [shader, setShader] = React.useState(() => shaderController.read());
				const [shaderStatus, setShaderStatus] = React.useState("");
				const [audio, setAudio] = React.useState(() => audioController.read());
				const [audioNote, setAudioNote] = React.useState("");
				React.useEffect(() => audioController.subscribe((next) => setAudio(next)), []);
				const readSceneMedia = () => {
					if (typeof document === "undefined") return null;
					const scene = document.querySelector("[data-tl-scene]");
					if (scene === null) return null;
					const width = Number(scene.dataset.tlWidth) || 0;
					const height = Number(scene.dataset.tlHeight) || 0;
					const fps = Number(scene.dataset.tlFps) || 0;
					const jitter = Number(scene.dataset.tlJitter) || 0;
					return {
						width,
						height,
						fps,
						jitter,
						duration: Number(scene.dataset.tlDuration) || 0,
						kind: scene.dataset.tlMedia ?? "",
						state: scene.dataset.tlState ?? "",
						play: scene.dataset.tlPlay ?? "",
						reason: scene.dataset.tlReason ?? "",
					};
				};
				const [mediaInfo, setMediaInfo] = React.useState(() => readSceneMedia());
				React.useEffect(() => {
					if (typeof document === "undefined" || typeof MutationObserver !== "function") return;
					const scene = document.querySelector("[data-tl-scene]");
					if (scene === null) return;
					// FPS/jitter mutate every second. Coalesce them so the panel does not
					// re-render (and re-wrap its quality line) on every video frame tick.
					let syncTimer = 0;
					let lastSync = 0;
					const sync = () => {
						if (syncTimer !== 0) return;
						const wait = Math.max(0, 1800 - (performance.now() - lastSync));
						syncTimer = globalThis.setTimeout(() => {
							syncTimer = 0;
							lastSync = performance.now();
							setMediaInfo(readSceneMedia());
						}, wait);
					};
					sync();
					const observer = new MutationObserver(sync);
					observer.observe(scene, {
						attributes: true,
						attributeFilter: [
							"data-tl-media",
							"data-tl-width",
							"data-tl-height",
							"data-tl-duration",
							"data-tl-state",
							"data-tl-play",
							"data-tl-reason",
							"data-tl-fps",
							"data-tl-jitter",
						],
					});
					return () => {
						observer.disconnect();
						if (syncTimer !== 0) globalThis.clearTimeout(syncTimer);
					};
				}, []);
				// Live playback/lownpower state. The scene publishes; the panel renders the
				// exact reason a wallpaper is parked instead of guessing from a boolean.
				// FPS changes arrive here every second; only status/reason are rendered from
				// this state, so a pure frame-rate tick must not re-render the whole panel
				// (that was a visible layout shimmer while reading).
				const [playStatus, setPlayStatus] = React.useState(() => sceneStatusController.read());
				React.useEffect(
					() =>
						sceneStatusController.subscribe((next) =>
							setPlayStatus((current) =>
								current.status === next.status && current.reason === next.reason ? current : next,
							),
						),
					[],
				);
				const [powerState, setPowerState] = React.useState(() => {
					const controller = lowPowerController;
					return controller === null || typeof controller.state !== "function"
						? { mode: readLowPowerMode(), active: false, reason: "", detail: "", detailKey: "", detailParams: null }
						: controller.state();
				});
				React.useEffect(() => {
					const controller = lowPowerController;
					if (controller === null || typeof controller.subscribe !== "function") return undefined;
					return controller.subscribe((next) => setPowerState(next));
				}, []);
				// ---- video static-frame picker ----
				const [frames, setFrames] = React.useState([]);
				const [frameSource, setFrameSource] = React.useState("");
				const [frameStatus, setFrameStatus] = React.useState("");
				const [frameBusy, setFrameBusy] = React.useState(false);
				const [weDraft, setWeDraft] = React.useState("");
				const [weStatus, setWeStatus] = React.useState("");
				const [weLibraryNote, setWeLibraryNote] = React.useState("");
				/**
				 * v0.6.0: the Wallpaper Engine library is a DSH settings page owned by
				 * src/72-we-library.js. The panel only requests it: a cancelable
				 * CustomEvent on window; a listener that handles it calls preventDefault().
				 * Without a listener the panel shows the "Settings → Wallpaper" fallback.
				 */
				const openWallpaperLibrary = () => {
					let handled = false;
					try {
						const event = new CustomEvent("tianlight:open-wallpaper-library", {
							bubbles: true,
							cancelable: true,
							detail: { source: "wallpaper-panel", engineCount },
						});
						handled = globalThis.dispatchEvent(event) === false || event.defaultPrevented === true;
					} catch (error) {
						note("we-library:open", error);
					}
					setWeLibraryNote(handled ? t("lib.we.openRequested") : t("lib.we.openFallback"));
				};
				const openWe = () => {
					setWeOpen(true);
					setNote("");
					void (async () => {
						try {
							const response = await fetch(ASSET_BASE + "/_we-roots", { cache: "no-store" });
							if (!response.ok) throw new Error(String(response.status));
							const value = await response.json();
							setWeDraft(Array.isArray(value.roots) ? value.roots.join("\n") : "");
						} catch {
							setWeStatus(t("lib.we.readFailed"));
						}
					})();
				};
				const saveWe = () => {
					setWeStatus(t("lib.we.saving"));
					void (async () => {
						try {
							const roots = weDraft
								.split(/\r?\n/)
								.map((line) => line.trim())
								.filter((line) => line !== "");
							const response = await fetch(ASSET_BASE + "/_we-roots", {
								method: "POST",
								headers: { "content-type": "application/json" },
								body: JSON.stringify(roots),
							});
							if (!response.ok) throw new Error(String(response.status));
							const value = await response.json();
							const kept = Array.isArray(value.roots) ? value.roots.length : 0;
							const skipped = Number(value.skipped) || 0;
							setWeStatus(
								t("lib.we.savedPrefix") +
									kept +
									t("lib.we.savedDirs") +
									(skipped > 0 ? t("lib.punct.openParen") + skipped + t("lib.we.savedSkipped") : ""),
							);
							void listWallpapers().then(applyWallpaperList);
						} catch {
							setWeStatus(t("lib.we.saveFailed"));
						}
					})();
				};
				// ---- v0.5.2: list load with one silent retry ----
				// The panel used to show "全部 0 / 0 张" forever when the first _wallpapers
				// request lost a race with the host (or hit a transient error). Now the
				// summary/hint say "加载中…" during the attempt, one retry happens after
				// ~1.2s, and only a second failure surfaces the reason + inline retry.
				React.useEffect(() => {
					let alive = true;
					let retryTimer = 0;
					const load = (attempt) => {
						void listWallpapers().then((list) => {
							if (alive === false) return;
							if (list !== null) {
								setItems(list);
								setListState("ready");
								return;
							}
							if (attempt === 0) {
								setListState("loading");
								retryTimer = globalThis.setTimeout(() => {
									retryTimer = 0;
									if (alive) load(1);
								}, PANEL_LIST_RETRY_MS);
								return;
							}
							setListState("error");
						});
					};
					setListState("loading");
					load(0);
					return () => {
						alive = false;
						if (retryTimer !== 0) globalThis.clearTimeout(retryTimer);
					};
				}, [listAttempt]);
				const pick = (choice) => {
					// The URL and ShaderToy editors call this from an async handler: report the
					// outcome instead of silently doing nothing (wallpaper module disabled) or
					// letting a scene exception strand the editor in its "applied" state.
					if (wallpaperController === null) return { ok: false, reason: null };
					try {
						wallpaperController.apply(choice);
					} catch (error) {
						note("wallpaper:pick", error);
						return { ok: false, reason: String(error?.message ?? error) };
					}
					setActive(choice === null ? "" : choice.url);
					setActiveChoice(choice);
					// v0.5.0: an explicit pick feeds the "最近使用" sort. Automatic
					// rotation deliberately does not, so the order stays the user's.
					if (choice !== null) rememberWallpaper(choice.url);
					return { ok: true };
				};
				/**
				 * v0.5.3: card click path. The ring is optimistic (state is set before the
				 * controller call, so the highlight lands in the same React batch), and a
				 * throwing controller reverts it and shows an inline error instead of
				 * silently swallowing the click.
				 */
				const pickCard = (choice, name) => {
					setPickError("");
					// A disabled wallpaper module leaves wallpaperController null: that is a
					// real failure the user must see, not a silent dead click.
					if (wallpaperController === null) {
						setPickError(t("lib.pick.noScene"));
						return;
					}
					const previousActive = active;
					const previousChoice = activeChoice;
					setActive(choice === null ? "" : choice.url);
					setActiveChoice(choice);
					try {
						wallpaperController.apply(choice);
						if (choice !== null) rememberWallpaper(choice.url);
						showToast(t("lib.pick.applied", { name }));
					} catch (error) {
						setActive(previousActive);
						setActiveChoice(previousChoice);
						setPickError(t("lib.pick.failed", { reason: String(error?.message ?? error) }));
					}
				};
				/**
				 * v1.6.7: URL and ShaderToy are first-class sources in the DEFAULT picker.
				 * Both editors live in the advanced view, so a quick-source click switches
				 * views, opens the matching composer and scrolls its editor into view. The
				 * editor is mounted one render later: the lookup runs in a timeout and a
				 * missing node (panel closed meanwhile) is a silent no-op.
				 */
				const openQuickSource = (id) => {
					setView("advanced");
					setComposer(id);
					setSourceTab("all");
					setNote("");
					setPickError("");
					if (id === "url") setDraftNote("");
					else setShaderStatus("");
					globalThis.setTimeout(() => {
						try {
							if (typeof document === "undefined") return;
							// The editors live inside the collapsible ② group: if the user collapsed
							// it earlier, scrolling to a hidden input does nothing. Opening it here
							// matches what the filter chips already do for the same group.
							const list = document.querySelector("[data-tl-wall-list]");
							if (list !== null) list.open = true;
							const target = document.querySelector(
								id === "url" ? "[data-tl-wall-url-input]" : "[data-tl-wall-shader-input]",
							);
							if (target !== null) target.scrollIntoView?.({ block: "nearest" });
						} catch {
							// scrolling is a convenience; a closed panel must not throw
						}
					}, 0);
				};
				// ---- the only zone question that matters: separate or continuous ----
				const [zones, setZones] = React.useState(() => readZones());
				// Pan only has meaning when the crop is smaller than the frame; at 100%
				// there is nothing off-screen to move into view.
				const cropInfo = cropWindow(zones.main);
				const pannable = Number(cropInfo.w) < 1 || Number(cropInfo.h) < 1;
				const [glassLevel, setGlassLevel] = React.useState(() => readGlass());
				const [layers, setLayers] = React.useState(() => layerController.read());
				const [playback, setPlayback] = React.useState(() => playbackController.read());
				const updatePlayback = (patch) => {
					const next = playbackController.apply({ ...playback, ...patch });
					setPlayback(next);
				};
				const pauseWallpaper = () => {
					updatePlayback({ paused: true });
				};
				const resumeWallpaper = () => {
					updatePlayback({ paused: false });
				};
				const [layerSlot, setLayerSlot] = React.useState(0);
				const layerSlots = layers.slots;
				const selectedSlot = layerSlots[layerSlot];
				const layerSlotLabel = (slot) => {
					if (slot === undefined || slot.kind === "none") return t("lib.ctrl.off");
					if (slot.kind === "image") return slot.url === "" ? t("lib.slot.imageUnset") : t("lib.kind.image");
					return slot.preset === "none" ? t("lib.ctrl.off") : LAYER_LABELS[slot.preset] ?? t("lib.slot.preset");
				};
				const updateLayerSlot = (index, patch) => {
					const slots = layerSlots.map((slot, position) => (position === index ? { ...slot, ...patch } : slot));
					const next = layerController.apply({ version: 2, slots });
					setLayers(next);
				};
				const swapLayers = () => {
					const next = layerController.apply({ version: 2, slots: [layerSlots[1], layerSlots[0]] });
					setLayers(next);
				};
				const [powerMode, setPowerMode] = React.useState(() => readLowPowerMode());
				const [fpsMode, setFpsMode] = React.useState(() => renderTierController.read());
				// ---- automatic rotation ----
				const [rotation, setRotation] = React.useState(() => rotationController.read());
				React.useEffect(() => rotationController.subscribe((next) => setRotation(next)), []);
				React.useEffect(
					() =>
						rotationController.observe((choice) => {
							if (choice === null) return;
							// Rotation writes the same source the picker does; mirror it into the
							// panel so "当前壁纸" never lags behind the scene.
							setActive(choice.url);
							setActiveChoice(choice);
						}),
					[],
				);
				const updateRotation = (patch) => setRotation(rotationController.apply({ ...rotation, ...patch }));
				// ---- recipe v2 import / export ----
				const [presetText, setPresetText] = React.useState("");
				const [presetStatus, setPresetStatus] = React.useState("");
				const resolveThemeService = () => {
					try {
						return typeof ctx?.get === "function" ? ctx.get("theme") : undefined;
					} catch {
						return undefined;
					}
				};
				/**
				 * Recipe v2 = v1 fields + the v0.5.0 sections. effects/context/legibility
				 * are declared in fragments that run before this one; readTypography /
				 * applyTypography are function declarations in the later font fragment, so
				 * they are only referenced through TYPE OF guards evaluated at click time
				 * (never at module scope), and every optional section is try/caught.
				 */
				const buildShareRecipe = () => {
					const recipe = {
						format: "tianlight-recipe",
						version: 2,
						zones: readZones(),
						glass: readGlass(),
						lowPower: readLowPowerMode(),
						wallpaper: readWallpaperChoice(),
						shader: shaderController.read(),
						layers: layerController.read(),
						playback: playbackController.read(),
						rotation: rotationController.read(),
					};
					// v1/v2 compatibility: v2 writes the contract's lowercase spelling as an
					// alias while lowPower stays the canonical field the apply path reads.
					recipe.lowpower = recipe.lowPower;
					try {
						if (typeof effectsController !== "undefined" && effectsController !== null && typeof effectsController.read === "function") {
							recipe.effects = effectsController.read();
						}
					} catch {
						// an optional section must never block the rest of the recipe
					}
					try {
						if (typeof contextController !== "undefined" && contextController !== null && typeof contextController.read === "function") {
							recipe.context = contextController.read();
						}
					} catch {
						// optional
					}
					try {
						if (typeof legibilityController !== "undefined" && legibilityController !== null && typeof legibilityController.read === "function") {
							recipe.legibility = legibilityController.read();
						}
					} catch {
						// optional
					}
					try {
						if (typeof readTypography === "function") recipe.typography = readTypography();
					} catch {
						// optional
					}
					return recipe;
				};
				const exportPreset = () => {
					try {
						setPresetText(JSON.stringify(buildShareRecipe()));
						setPresetStatus(t("lib.recipeExported"));
					} catch {
						setPresetStatus(t("lib.recipeBadValue"));
					}
				};
				const applyPresetValue = (value) => {
					if (value === null || typeof value !== "object") return "lib.recipeBadValue";
					let shaderRejected = false;
					try {
						// Re-validated by the existing readers: a hand-edited preset cannot push
						// values the UI itself would never produce.
						if (value.zones !== undefined) {
							const clean = normalizeZones(value.zones);
							setZones(clean);
							if (zoneController !== null) zoneController.apply(clean);
						}
						if (typeof value.glass === "number") {
							const next = Math.min(1.5, Math.max(0.35, value.glass));
							setGlassLevel(next);
							if (glassController !== null) glassController.apply(next);
						}
						// v2 export writes lowPower; v1-style links or hand edits may write
						// lowpower, so both spellings are accepted and normalized here.
						const lowPowerValue =
							value.lowPower === "auto" || value.lowPower === "on" || value.lowPower === "off"
								? value.lowPower
								: value.lowpower === "auto" || value.lowpower === "on" || value.lowpower === "off"
									? value.lowpower
									: null;
						if (lowPowerValue !== null) {
							setPowerMode(lowPowerValue);
							if (lowPowerController !== null) lowPowerController.set(lowPowerValue);
						}
						if (value.layers !== null && typeof value.layers === "object") {
							const clean = layerController.apply(value.layers);
							setLayers(clean);
						}
						if (value.playback !== null && typeof value.playback === "object") {
							const clean = playbackController.apply(value.playback);
							setPlayback(clean);
						}
						if (value.rotation !== null && typeof value.rotation === "object") {
							const clean = rotationController.apply(value.rotation);
							setRotation(clean);
						}
						// A recipe is the only way a shared shader travels; compile it here so a
						// broken paste cannot poison the saved settings.
						if (value.shader !== null && typeof value.shader === "object" && typeof value.shader.source === "string") {
							const error = validateShaderSource(value.shader.source);
							if (error === null) {
								const next = {
									preset: typeof value.shader.preset === "string" ? value.shader.preset : "custom",
									source: value.shader.source,
									speed: clampNumber(value.shader.speed, 0.1, 3, SHADER_DEFAULTS.speed),
									intensity: clampNumber(value.shader.intensity, 0, 2, SHADER_DEFAULTS.intensity),
									hue: clampNumber(value.shader.hue, 0, 1, SHADER_DEFAULTS.hue),
								};
								shaderController.save(next);
								setShader(next);
							} else {
								shaderRejected = true;
							}
						}
						if (value.wallpaper !== undefined && value.wallpaper !== null) {
							const verdict = resolveWallpaperChoice(value.wallpaper);
							if (verdict.ok === true) {
								setActive(verdict.choice.url);
								setActiveChoice(verdict.choice);
								if (wallpaperController !== null) wallpaperController.apply(verdict.choice);
							}
						}
						// ---- v0.5.0 recipe sections ----
						// Only keys the owning controller declares are copied, and only when
						// the source value has the declared type: a hand-edited share link can
						// never push a nested object into a boolean/enum slot.
						const patchOf = (source, defaults) => {
							const patch = {};
							if (source === null || typeof source !== "object" || defaults === null || typeof defaults !== "object") return patch;
							for (const key of Object.keys(defaults)) {
								if (Object.prototype.hasOwnProperty.call(source, key) === false) continue;
								if (typeof source[key] !== typeof defaults[key]) continue;
								patch[key] = source[key];
							}
							return patch;
						};
						const applyControllerPatch = (controller, defaults, source) => {
							if (typeof controller === "undefined" || controller === null || typeof controller.apply !== "function") return;
							const patch = patchOf(source, typeof defaults === "undefined" ? null : defaults);
							if (Object.keys(patch).length > 0) controller.apply(patch);
						};
						if (typeof effectsController !== "undefined") {
							applyControllerPatch(
								effectsController,
								typeof EFFECTS_DEFAULTS === "undefined" ? null : EFFECTS_DEFAULTS,
								value.effects,
							);
						}
						if (typeof contextController !== "undefined") {
							applyControllerPatch(
								contextController,
								typeof CONTEXT_DEFAULTS === "undefined" ? null : CONTEXT_DEFAULTS,
								value.context,
							);
						}
						if (typeof legibilityController !== "undefined") {
							applyControllerPatch(
								legibilityController,
								typeof LEGIBILITY_DEFAULTS === "undefined" ? null : LEGIBILITY_DEFAULTS,
								value.legibility,
							);
						}
						if (typeof readTypography === "function" && typeof applyTypography === "function") {
							const typography = value.typography;
							if (typography !== null && typeof typography === "object") {
								// Merge only fields the typography model actually declares, with a
								// matching type: v0.5.0 added fields (content width, paragraph
								// spacing, code size, reading family) travel without this panel
								// knowing their names, and a hand-edited link cannot invent keys.
								const current = readTypography();
								const next = { ...current };
								for (const key of Object.keys(current)) {
									if (Object.prototype.hasOwnProperty.call(typography, key) === false) continue;
									if (typeof typography[key] !== typeof current[key]) continue;
									next[key] = typography[key];
								}
								// Size is the one field the host API accepts directly: clamp it here
								// so a shared recipe cannot push an out-of-range font size.
								if (Number.isFinite(next.size)) next.size = Math.min(22, Math.max(12, Math.round(next.size)));
								applyTypography(resolveThemeService(), next, true);
							}
						}
					} catch {
						return "lib.recipeBadApply";
					}
					return shaderRejected ? "lib.recipeAppliedShader" : "lib.recipeApplied";
				};
				const importPreset = () => {
					try {
						const value = JSON.parse(presetText);
						setPresetStatus(t(applyPresetValue(value)));
					} catch {
						setPresetStatus(t("lib.recipeBadText"));
					}
				};
				const applyCuratedPreset = (preset) => {
					setPresetText(JSON.stringify(preset.value));
					const status = applyPresetValue(preset.value);
					setPresetStatus(
						status === "lib.recipeApplied" ? t("lib.preset.applied", { name: t(preset.labelKey) }) : t(status),
					);
				};
				// ---- v0.5.0 D3: share link (#tl=<base64url recipe v2>) ----
				const [shareLink, setShareLink] = React.useState("");
				const [shareNote, setShareNote] = React.useState("");
				// v0.5.3: shareStatus stores the i18n KEY (not the rendered string), so a
				// language switch re-renders it; no empty-deps translation cache is left.
				const [shareStatus, setShareStatus] = React.useState(() =>
					props !== undefined && props.shareRejected === true ? "lib.shareInvalid" : "",
				);
				// A recipe parsed from the URL (install time or a later open) is a pending
				// PROPOSAL: it is displayed in a confirm strip and never applied until the
				// user clicks 应用. Invalid links are dropped by readTl5ShareHash without
				// touching settings.
				const [sharedRecipe, setSharedRecipe] = React.useState(() =>
					props !== undefined && props.sharedRecipe !== undefined && props.sharedRecipe !== null
						? props.sharedRecipe
						: null,
				);
				React.useEffect(() => {
					if (sharedRecipe !== null) return;
					const hash = String(globalThis.location?.hash ?? "");
					if (hash.startsWith("#tl=") === false) return;
					const next = readTl5ShareHash();
					if (next === null) {
						setShareStatus("lib.shareInvalid");
						return;
					}
					pendingShare = next;
					setSharedRecipe(next);
				}, []);
				const copyShareLink = () => {
					try {
						const payload = tl5Base64UrlEncode(JSON.stringify(buildShareRecipe()));
						const location = globalThis.location;
						const base =
							String(location?.origin ?? "") + String(location?.pathname ?? "") + String(location?.search ?? "");
						const link = base + "#tl=" + payload;
						setShareLink(link);
						setShareNote(payload.length > 6000 ? t("lib.shareLong") : "");
						const clipboard = globalThis.navigator?.clipboard;
						if (clipboard !== null && clipboard !== undefined && typeof clipboard.writeText === "function") {
							void clipboard.writeText(link).then(
								() => setShareNote(t("lib.shareCopied")),
								() => setShareNote(t("lib.shareFailed")),
							);
						} else {
							// No async clipboard here: the textarea below is the manual fallback.
							setShareNote(t("lib.shareFailed"));
						}
					} catch (error) {
						setShareNote(t("lib.shareBuildFail", { reason: String(error?.message ?? error) }));
					}
				};
				const clearSharedRecipe = () => {
					pendingShare = null;
					clearTl5ShareHash();
					setSharedRecipe(null);
				};
				const applySharedRecipe = () => {
					if (sharedRecipe === null) return;
					try {
						setPresetStatus(t(applyPresetValue(sharedRecipe.recipe)));
						setShareStatus("lib.shareApplied");
					} catch {
						setShareStatus("lib.shareInvalid");
					}
					clearSharedRecipe();
				};
				const ignoreSharedRecipe = () => {
					clearSharedRecipe();
					setShareStatus("lib.shareIgnored");
				};
				// ---- v0.5.0 D2: bundle export / import (gated on host capabilities) ----
				const [bundleBusy, setBundleBusy] = React.useState(false);
				const [bundleNote, setBundleNote] = React.useState("");
				const [importBusy, setImportBusy] = React.useState(false);
				const [importPct, setImportPct] = React.useState(0);
				const [importNote, setImportNote] = React.useState("");
				const hostCapabilities =
					engine !== null && typeof engine.capabilities === "object" && engine.capabilities !== null
						? engine.capabilities
						: null;
				const hostCapability = (name) => {
					if (hostCapabilities === null) return false;
					const direct = hostCapabilities[name];
					if (typeof direct === "boolean") return direct;
					if (direct !== undefined && direct !== null) return direct !== false;
					const routes = hostCapabilities.routes;
					if (Array.isArray(routes)) return routes.includes(name);
					if (routes !== null && typeof routes === "object") {
						const entry = routes[name];
						if (typeof entry === "boolean") return entry;
						if (typeof entry === "string") return true;
					}
					// A host that publishes a capabilities object is new enough for the
					// v0.5.0 routes; only an explicit false hides a control.
					return true;
				};
				const bundleSupported = hostCapability("bundle") === true;
				const importSupported = hostCapability("import") === true;
				const exportBundle = () => {
					if (bundleBusy) return;
					setBundleBusy(true);
					setBundleNote(t("lib.bundleExportBusy"));
					try {
						// The host streams the tar.gz straight to the browser: a plain anchor
						// download never buffers the archive in page memory.
						const link = document.createElement("a");
						link.href = ASSET_BASE + "/_bundle?build=" + encodeURIComponent(HOST_BUILD);
						link.download = "tianlight-bundle-" + new Date().toISOString().slice(0, 10) + ".tgz";
						link.rel = "noopener";
						document.body.appendChild(link);
						link.click();
						link.remove();
						setBundleNote(t("lib.bundleExportStarted"));
					} catch (error) {
						setBundleNote(t("lib.bundleExportFail", { reason: String(error?.message ?? error) }));
					}
					globalThis.setTimeout(() => setBundleBusy(false), 400);
				};
				const importBundle = (event) => {
					const input = event.currentTarget;
					const file = input.files !== null && input.files.length > 0 ? input.files[0] : null;
					// Clear immediately so picking the same file twice still fires onChange.
					input.value = "";
					if (file === null || importBusy) return;
					if (/\.(tgz|tar\.gz)$/i.test(file.name) === false && /gzip/.test(file.type) === false) {
						setImportNote(t("lib.bundleImportType"));
						return;
					}
					if (file.size > PANEL_BUNDLE_LIMIT) {
						setImportNote(t("lib.bundleImportSize", { mb: Math.round(PANEL_BUNDLE_LIMIT / (1024 * 1024)) }));
						return;
					}
					setImportBusy(true);
					setImportPct(0);
					setImportNote(t("lib.bundleImporting"));
					try {
						// XHR (not fetch) because the upload progress bar is the only honest
						// signal for a large archive; failures never clear existing config.
						// The host accepts gzip/octet-stream and rejects anything else with 415.
						const xhr = new XMLHttpRequest();
						xhr.open("POST", ASSET_BASE + "/_import");
						const mime = String(file.type || "");
						xhr.setRequestHeader("content-type", /gzip/.test(mime) || /octet-stream/.test(mime) ? mime : "application/gzip");
						xhr.upload.onprogress = (progress) => {
							if (progress.lengthComputable && progress.total > 0) {
								setImportPct(Math.round((progress.loaded / progress.total) * 100));
							}
						};
						xhr.onerror = () => {
							setImportBusy(false);
							setImportNote(t("lib.bundleImportFail", { reason: "network" }));
						};
						xhr.onload = () => {
							setImportBusy(false);
							let value = null;
							try {
								value = JSON.parse(xhr.responseText);
							} catch {
								value = null;
							}
							if (xhr.status < 200 || xhr.status >= 300) {
								// JSON errors carry a message; plain-text failures (405/413/415)
								// are short enough to show verbatim.
								const plain = typeof xhr.responseText === "string" ? xhr.responseText.trim().slice(0, 160) : "";
								const reason =
									value !== null && typeof value.error === "string"
										? value.error
										: plain !== ""
											? plain
											: "HTTP " + xhr.status;
								setImportNote(t("lib.bundleImportFail", { reason }));
								return;
							}
							const imported = value !== null && Array.isArray(value.imported) ? value.imported.length : 0;
							const skipped = value !== null && Array.isArray(value.skipped) ? value.skipped.length : 0;
							setImportNote(t("lib.bundleImportDone", { imported, skipped }) + " · " + t("lib.bundleImportSettings"));
							// The settings layer owns the merge; this event is a notification for
							// anyone listening, and the manifest refresh is what the panel needs.
							if (value !== null && value.settings !== null && typeof value.settings === "object") {
								try {
									globalThis.dispatchEvent(
										new CustomEvent("tianlight:settings", { detail: { settings: value.settings, source: "bundle" } }),
									);
								} catch {
									// a notification is best effort
								}
								// Pull the freshly merged host settings into the browser mirror now;
								// a missing settings layer just means "reload applies them" instead.
								try {
									if (typeof settingsStore !== "undefined" && settingsStore !== null) {
										if (typeof settingsStore.bootstrap === "function") void settingsStore.bootstrap();
										else if (typeof settingsStore.forceSync === "function") void settingsStore.forceSync();
									}
								} catch {
									// the import already succeeded on the host
								}
							}
							void listWallpapers().then(applyWallpaperList);
							setEngineProbe((current) => current + 1);
						};
						xhr.send(file);
					} catch (error) {
						setImportBusy(false);
						setImportNote(t("lib.bundleImportFail", { reason: String(error?.message ?? error) }));
					}
				};
				const applyDraft = async () => {
					const url = draft.trim();
					if (url === "") {
						setDraftNote(t("lib.url.empty"));
						return;
					}
					let parsed = null;
					try {
						parsed = new URL(url);
					} catch {
						parsed = null;
					}
					if (parsed === null || (parsed.protocol !== "http:" && parsed.protocol !== "https:")) {
						setDraftNote(t("lib.url.scheme"));
						return;
					}
					if (globalThis.location?.protocol === "https:" && parsed.protocol === "http:") {
						setDraftNote(t("lib.url.httpsBlocked"));
						return;
					}
					setDraftBusy(true);
					setDraftNote(t("lib.url.checking"));
					// Extension first; when the link is signed/extensionless, probe the media
					// itself instead of defaulting every unknown URL to "video" (which made
					// ordinary image CDN links fail).
					const clean = url.split(/[?#]/)[0];
					let kind = draftKind === "image" ? "image" : draftKind === "video" ? "video" : null;
					if (kind === null && /\.(png|jpe?g|webp|avif|gif|svg)$/i.test(clean)) kind = "image";
					else if (kind === null && /\.(mp4|webm|mov|m4v)$/i.test(clean)) kind = "video";
					else if (kind === null) kind = await probeUrlKind(url);
					if (kind === null) {
						setDraftBusy(false);
						setDraftNote(t("lib.url.notMedia"));
						return;
					}
					setNote("");
					// Applying can legitimately fail (wallpaper module off, scene threw): only
					// claim success when the scene really took the choice.
					const result = pick({ kind, url });
					setDraftBusy(false);
					if (result.ok === false) {
						setDraftNote(
							result.reason === null
								? t("lib.pick.noScene")
								: t("lib.pick.failed", { reason: result.reason }),
						);
						return;
					}
					setDraftNote(t("lib.url.applied") + (kind === "image" ? t("lib.kind.image") : t("lib.kind.video")) + " · " + (parsed.hostname || t("lib.url.remoteHost")));
				};
				const applyShader = () => {
					const error = validateShaderSource(shader.source);
					if (error !== null) {
						setShaderStatus(t("lib.shader.compileFailed") + error);
						return;
					}
					shaderController.save(shader);
					// The shader settings are only half the switch: the composition kind must
					// reach the saved choice too, or a reload falls back to the old wallpaper.
					const result = pick({ kind: "shader", url: "shader://live" });
					if (result.ok === false) {
						setShaderStatus(
							result.reason === null
								? t("lib.pick.noScene")
								: t("lib.pick.failed", { reason: result.reason }),
						);
						return;
					}
					setShaderStatus(t("lib.shader.applied"));
				};
				const resetShader = () => {
					setShader({ ...SHADER_DEFAULTS });
					setShaderStatus(t("lib.shader.reset"));
				};
				const toggleAudio = async () => {
					if (audio.active) {
						audioController.stop(t("lib.audio.stopped"));
						setAudioNote("");
						return;
					}
					setAudioNote(t("lib.audio.requesting"));
					const result = await audioController.start();
					setAudioNote(result.ok === true ? "" : result.reason ?? t("lib.audio.failed"));
				};
				const useAudioPreset = () => {
					const preset = SHADER_PRESETS.find((entry) => entry.id === "audio");
					if (preset === undefined) return;
					setShader((current) => ({ ...current, preset: preset.id, source: preset.source }));
					setShaderStatus(t("lib.shader.audioPreset"));
				};
				// ---- video still-frame picker ----
				const requestFrames = () => {
					if (activeChoice === null || activeChoice.kind !== "video") return;
					const url = activeChoice.url;
					setFrameBusy(true);
					setFrameStatus(t("lib.frame.sampling"));
					void sampleVideoFrames(url, 6).then((result) => {
						setFrameBusy(false);
						if (result.ok === true) {
							setFrames(result.frames);
							setFrameSource(url);
							setFrameStatus(t("lib.frame.pickHint"));
						} else {
							setFrames([]);
							setFrameSource("");
							setFrameStatus(result.reason);
						}
					});
				};
				const applyFrame = (time) => {
					if (activeChoice === null || activeChoice.kind !== "video") return;
					pick({ kind: "video", url: activeChoice.url, still: time });
					setFrameStatus(t("lib.frame.pinned") + Number(time).toFixed(1) + "s");
				};
				const resumeVideo = () => {
					if (activeChoice === null || activeChoice.kind !== "video") return;
					pick({ kind: "video", url: activeChoice.url });
					setFrameStatus(t("lib.frame.resumed"));
				};
				// ---- library helpers: one read path, one write path ----
				const metaOf = (item) => library.items[item.url] ?? { favorite: false, tags: [], hidden: false };
				const nameOf = (item) =>
					item.id.replace(/^ext:\d+:/, "").replace(/^web:\d+:/, "").replace(/^uploads\//, "").replace(/^scene:\d+:/, "");
				// Kind is searchable and sortable in v2: "视频" matches every video even
				// when the file name is a hash, which is what a wall paper library needs.
				const kindLabelOf = (item) =>
					item.kind === "video"
						? t("lib.kind.video")
						: item.kind === "scene"
							? t("lib.kind.scene")
							: item.kind === "shader"
								? t("lib.kind.shader")
								: item.kind === "web"
									? t("lib.kind.web")
									: t("lib.kind.image");
				const kindRank = (item) => (item.kind === "image" ? 0 : item.kind === "video" ? 1 : item.kind === "scene" ? 2 : 3);
				// ---- v0.6.0: auto-detected Wallpaper Engine library items ----
				// host-core appends WE items to /_wallpapers; they are identified by
				// source:"we"/weId and must need no folder configuration at all.
				const isEngineItem = (item) =>
					item !== null &&
					typeof item === "object" &&
					(item.source === "we" || typeof item.weId === "string" || (typeof item.id === "string" && item.id.startsWith("we:")));
				const isLegacyWeItem = (item) =>
					isEngineItem(item) === false &&
					(item.url.includes("/ext/") === true || item.kind === "scene" || item.kind === "web");
				const engineSourceOf = (item) => {
					const raw = String(item.weSource ?? "").toLowerCase();
					if (raw === "steam" || raw === "workshop") return "steam";
					if (raw === "project" || raw === "local" || raw === "mine") return "project";
					// Tolerate a host that only distinguishes the roots via the item path/id.
					const sourceField = String(item.source ?? "").toLowerCase();
					if (sourceField === "steam" || sourceField === "workshop") return "steam";
					if (sourceField === "project" || sourceField === "local" || sourceField === "mine") return "project";
					const label = [item.weId, item.id, item.path, item.url]
						.filter((entry) => typeof entry === "string")
						.join(" ");
					return /steam|workshop|431960|steamapps/i.test(label) ? "steam" : "project";
				};
				const engineTypeOf = (item) => {
					const type = String(item.weType ?? "").toLowerCase();
					return type === "video" || type === "scene" || type === "web" || type === "image" ? type : "";
				};
				const engineLabelOf = (item) => {
					const type = engineTypeOf(item);
					if (type === "video") return t("lib.kind.video");
					if (type === "scene") return t("lib.kind.scene");
					if (type === "web") return t("lib.kind.web");
					if (type === "image") return t("lib.kind.image");
					return t("lib.source.engine");
				};
				const badgeOf = (item) =>
					isEngineItem(item)
						? engineLabelOf(item)
						: item.kind === "video"
							? t("lib.kind.video")
							: item.kind === "scene"
								? t("lib.card.scene")
								: item.kind === "web"
									? t("lib.card.web")
									: t("lib.kind.image");
				// All thumbnails prefer the host preview; a WE video preview must never be
				// replaced by the media URL (that would download the whole wallpaper).
				const previewOf = (item) => (typeof item.preview === "string" ? item.preview : "");
				const displayNameOf = (item) =>
					(isEngineItem(item) || item.kind === "scene" || item.kind === "web") &&
					typeof item.title === "string" &&
					item.title !== ""
						? item.title
						: nameOf(item);
				const updateMeta = (url, patch) => {
					const current = library.items[url] ?? { favorite: false, tags: [], hidden: false };
					const next = { ...current, ...patch };
					const nextItems = { ...library.items };
					if (next.favorite === false && next.tags.length === 0 && next.hidden !== true) delete nextItems[url];
					else nextItems[url] = next;
					const model = { items: nextItems };
					wallpaperLibraryController.write(model);
					setLibrary(model);
				};
				const formatBytes = (bytes) => {
					if (!Number.isFinite(bytes) || bytes <= 0) return "";
					const mb = bytes / (1024 * 1024);
					if (mb >= 1024) return (mb / 1024).toFixed(1) + "GB";
					return mb >= 1 ? mb.toFixed(1) + "MB" : Math.max(1, Math.round(bytes / 1024)) + "KB";
				};
				const uploadLimit =
					engine !== null && engine.upload !== undefined && Number.isFinite(engine.upload.max) ? engine.upload.max : UPLOAD_LIMIT;
				const uploadLimitMb = Math.round(uploadLimit / (1024 * 1024));
				const uploadWallpaper = (event) => {
					const input = event.currentTarget;
					const file = input.files !== null && input.files.length > 0 ? input.files[0] : null;
					// Clear immediately: picking the same file twice must still fire onChange.
					input.value = "";
					if (file === null) return;
					if (hostStale) {
						setUploadNote(t("lib.upload.hostStale"));
						return;
					}
					if (engine !== null && engine.upload !== undefined && engine.upload.writable === false) {
						setUploadNote(t("lib.upload.notWritable"));
						return;
					}
					if (file.size > uploadLimit) {
						setUploadNote(t("lib.upload.tooBigPrefix") + uploadLimitMb + t("lib.upload.tooBigSuffix"));
						return;
					}
					if (/\.(mp4|m4v|mov|webm|png|jpe?g|webp|avif|gif|svg)$/i.test(file.name) === false) {
						setUploadNote(t("lib.upload.types"));
						return;
					}
					setUploadBusy(true);
					setUploadNote(t("lib.upload.busy"));
					void (async () => {
						try {
							const response = await fetch(ASSET_BASE + "/_upload?name=" + encodeURIComponent(file.name), {
								method: "POST",
								headers: { "content-type": file.type || "application/octet-stream" },
								body: file,
							});
							const value = await response.json().catch(() => null);
							if (!response.ok) throw new Error(value?.error ?? String(response.status));
							setUploadNote(t("lib.upload.done") + String(value?.item?.id ?? file.name).replace(/^uploads\//, ""));
							applyWallpaperList(await listWallpapers());
						} catch (error) {
							setUploadNote(t("lib.upload.failed") + String(error?.message ?? error));
						} finally {
							setUploadBusy(false);
						}
					})();
				};
				const allTags = [
					...new Set(Object.values(library.items).flatMap((entry) => entry.tags ?? [])),
				].sort((left, right) => left.localeCompare(right));
				// A selected tag can outlive the last item that carried it (removed while the
				// filter is on); keep it in the row so it can still be switched off.
				const tagChoices = [...new Set([...allTags, ...tagFilter])].sort((left, right) => left.localeCompare(right));
				const filtersActive = query.trim() !== "" || favoritesOnly || tagFilter.length > 0;
				const hiddenCount = items.filter((item) => metaOf(item).hidden === true).length;
				const favoriteCount = items.filter((item) => metaOf(item).favorite === true).length;
				// v0.6.0 source tabs: all | local (our own assets/uploads) | we (legacy
				// WE folders from v0.5) | engine (auto-detected Wallpaper Engine library).
				const matchesSourceTab = (item) => {
					if (sourceTab === "all") return true;
					if (sourceTab === "we") return isLegacyWeItem(item);
					if (sourceTab === "engine") return isEngineItem(item);
					return isLegacyWeItem(item) === false && isEngineItem(item) === false;
				};
				const allCount = items.length;
				const visibleItems = items
					.filter(matchesSourceTab)
					.filter((item) => showHidden || metaOf(item).hidden !== true)
					.filter((item) => favoritesOnly === false || metaOf(item).favorite)
					// v2 facet semantics: multiple selected tags narrow the list (AND), so
					// "夜景 + 4K" finds the intersection instead of the union.
					.filter((item) => tagFilter.length === 0 || tagFilter.every((tag) => metaOf(item).tags.includes(tag)))
					.filter((item) => {
						const needle = query.trim().toLowerCase();
						if (needle === "") return true;
						// v0.6.0: WE items are searchable by their library title and weType
						// (video/scene/web/image) on top of the normal name/kind/tag haystack.
						return (
							displayNameOf(item) +
							" " +
							nameOf(item) +
							" " +
							kindLabelOf(item) +
							" " +
							(isEngineItem(item) ? engineLabelOf(item) + " " : "") +
							String(item.title ?? "") +
							" " +
							String(item.weType ?? "") +
							" " +
							item.kind +
							" " +
							item.id +
							" #" +
							metaOf(item).tags.join(" #")
						)
							.toLowerCase()
							.includes(needle);
					})
					.map((item) => ({ item, meta: metaOf(item) }));
				// v0.5.0 D1: sort is a pure view concern — the ② summary keeps reporting
				// "filtered / all" counts and the order is stable for every mode.
				const sortLibraryItems = (list) => {
					const copy = [...list];
					const byName = (left, right) =>
						displayNameOf(left.item).localeCompare(displayNameOf(right.item), "zh") || left.item.id.localeCompare(right.item.id);
					if (sortMode === "kind") {
						copy.sort((left, right) => kindRank(left.item) - kindRank(right.item) || byName(left, right));
					} else if (sortMode === "recent") {
						const rank = (entry) => {
							const index = recentUrls.indexOf(entry.item.url);
							return index < 0 ? Number.MAX_SAFE_INTEGER : index;
						};
						copy.sort((left, right) => rank(left) - rank(right) || byName(left, right));
					} else if (sortMode === "favorites") {
						copy.sort(
							(left, right) =>
								Number(right.meta.favorite === true) - Number(left.meta.favorite === true) || byName(left, right),
						);
					} else {
						copy.sort(byName);
					}
					return copy;
				};
				const sortedItems = sortLibraryItems(visibleItems);
				const editingItem = tagEditorUrl === "" ? null : items.find((item) => item.url === tagEditorUrl) ?? null;
				const editingMeta = editingItem === null ? { favorite: false, tags: [] } : metaOf(editingItem);
				const addTag = () => {
					if (editingItem === null) return;
					const tag = tagDraft.trim().slice(0, LIBRARY_TAG_LENGTH);
					if (tag === "" || editingMeta.tags.includes(tag)) {
						setTagDraft("");
						return;
					}
					updateMeta(editingItem.url, { tags: [...editingMeta.tags, tag].slice(0, LIBRARY_TAG_MAX) });
					setTagDraft("");
				};
				const removeTag = (tag) => {
					if (editingItem === null) return;
					updateMeta(editingItem.url, { tags: editingMeta.tags.filter((entry) => entry !== tag) });
				};
				// Plain-language orientation: what is showing now, and one sentence telling
				// the active source what to do next.
				const engineItems = items.filter(isEngineItem);
				const engineCount = engineItems.length;
				const engineSteamCount = engineItems.filter((item) => engineSourceOf(item) === "steam").length;
				const engineProjectCount = engineCount - engineSteamCount;
				const localCount = items.filter((item) => isLegacyWeItem(item) === false && isEngineItem(item) === false).length;
				const weCount = items.filter(isLegacyWeItem).length;
				const sceneCount = items.filter((item) => item.kind === "scene").length;
				const currentTitle = (() => {
					if (activeChoice === null) return t("lib.current.auto");
					const activeItem = items.find((entry) => entry.url === activeChoice.url) ?? null;
					if (activeItem !== null && isEngineItem(activeItem)) {
						return t("lib.source.engine") + " · " + displayNameOf(activeItem);
					}
					if (activeChoice.kind === "scene" || activeChoice.kind === "web") {
						const item = activeItem;
						const prefix = activeChoice.kind === "web" ? t("lib.current.webPrefix") : t("lib.current.scenePrefix");
						return prefix + (item !== undefined && item.title !== undefined ? item.title : activeChoice.url.slice(activeChoice.url.lastIndexOf("/") + 1));
					}
					if (activeChoice.kind === "shader") {
						const preset = SHADER_PRESETS.find((entry) => entry.id === shader.preset);
						return "ShaderToy · " + (preset === undefined ? t("lib.current.customShader") : preset.label);
					}
					const file = activeChoice.url.slice(activeChoice.url.lastIndexOf("/") + 1) || t("lib.current.unnamed");
					const kind = activeChoice.kind === "image" ? t("lib.kind.image") : activeChoice.still !== undefined ? t("lib.current.videoStill") : t("lib.kind.video");
					return kind + " · " + file;
				})();
				const screenWidth = Math.round((globalThis.innerWidth || 0) * (globalThis.devicePixelRatio || 1));
				const screenHeight = Math.round((globalThis.innerHeight || 0) * (globalThis.devicePixelRatio || 1));
				const croppedWidth = Math.round((mediaInfo === null ? 0 : mediaInfo.width) * Number(cropInfo.w));
				const croppedHeight = Math.round((mediaInfo === null ? 0 : mediaInfo.height) * Number(cropInfo.h));
				let qualityNote = "";
				if (mediaInfo !== null && mediaInfo.state === "error") {
					qualityNote = t("lib.quality.loadFailed");
				} else if (mediaInfo !== null && mediaInfo.kind === "scene") {
					qualityNote =
						t("lib.quality.scene") +
						(mediaInfo.fps > 0 ? t("lib.quality.measured") + mediaInfo.fps + "fps" : "") +
						(engine !== null && engine.webwallgl === false ? t("lib.quality.engineNotReady") : "");
				} else if (mediaInfo !== null && mediaInfo.kind === "shader") {
					qualityNote = t("lib.quality.shader");
				} else if (mediaInfo !== null && mediaInfo.kind === "web") {
					// A WE web project runs in 30-wallpaper's sandboxed iframe; this line only
					// reports it (the panel must never mount the iframe itself).
					qualityNote = t("lib.quality.web");
				} else if (mediaInfo !== null && mediaInfo.width > 0 && mediaInfo.height > 0) {
					qualityNote =
						t("lib.quality.source") +
						mediaInfo.width +
						"×" +
						mediaInfo.height +
						t("lib.quality.crop") +
						croppedWidth +
						"×" +
						croppedHeight +
						"px";
					const upscaled =
						zones.main.fit === "contain"
							? screenWidth > 0 && croppedWidth + 1 < screenWidth && croppedHeight + 1 < screenHeight
							: screenWidth > 0 && (croppedWidth + 1 < screenWidth || croppedHeight + 1 < screenHeight);
					qualityNote += upscaled ? t("lib.quality.upscaled") : t("lib.quality.native");
					if (mediaInfo.fps > 0) {
						qualityNote += t("lib.quality.measured") + mediaInfo.fps + "fps" + (mediaInfo.fps < 50 ? t("lib.quality.low") : "");
					}
					if (mediaInfo.width >= 7680 || mediaInfo.height >= 4320) qualityNote += t("lib.quality.eightK");
					if (mediaInfo.duration > 0) {
						const minutes = Math.floor(mediaInfo.duration / 60);
						const seconds = String(mediaInfo.duration % 60).padStart(2, "0");
						qualityNote += t("lib.quality.duration") + minutes + ":" + seconds;
					}
				}
				const lowPowerActive = powerState.active === true;
				const hasStaticFrame = activeChoice !== null && activeChoice.kind === "video" && activeChoice.still !== undefined;
				const isVideoWallpaper =
					activeChoice !== null ? activeChoice.kind === "video" : mediaInfo !== null && mediaInfo.kind === "video";
				const isShaderWallpaper =
					activeChoice !== null ? activeChoice.kind === "shader" : mediaInfo !== null && mediaInfo.kind === "shader";
				const isImageWallpaper =
					activeChoice !== null ? activeChoice.kind === "image" : mediaInfo !== null && mediaInfo.kind === "image";
				const isSceneWallpaper =
					activeChoice !== null ? activeChoice.kind === "scene" : mediaInfo !== null && mediaInfo.kind === "scene";
				const isWebWallpaper =
					activeChoice !== null ? activeChoice.kind === "web" : mediaInfo !== null && mediaInfo.kind === "web";
				// One vocabulary for "is the wallpaper actually moving", fed by the scene
				// bus rather than inferred from a paused DOM element.
				const playState = playStatus.status || (mediaInfo === null ? "" : mediaInfo.play);
				const playReason = playStatus.reason || (mediaInfo === null ? "" : mediaInfo.reason);
				const sceneBroken = playState === "error";
				const isBlocked = playState === "blocked";
				const isStalled = playState === "stalled";
				const isBuffering = playState === "loading" || playState === "buffering";
				const isMoving = playState === "playing";
				const isPaused = playState === "paused" || playState === "hidden" || playState === "ready";
				const lowPowerReasonLabel =
					powerState.reason === "reduced-motion"
						? t("lib.power.reducedMotion")
						: powerState.reason === "save-data"
							? t("lib.power.saveData")
							: powerState.reason === "battery"
								? // v0.5.2: 55-lowpower now hands back a language-neutral detail
									// ("15%") plus detailKey/detailParams, so the full sentence is
									// localized at render time (switching language re-renders it).
									typeof powerState.detailKey === "string" && powerState.detailKey !== ""
									? t(powerState.detailKey, powerState.detailParams ?? {})
									: powerState.detail || t("lib.power.battery")
								: powerState.reason === "manual"
									? t("lib.power.manual")
									: "";
				const statusLabel = lowPowerActive
					? t("lib.status.lowPower")
					: hasStaticFrame
						? t("lib.status.still")
						: isBlocked
							? t("lib.status.blocked")
							: isStalled
								? t("lib.status.stalled")
								: sceneBroken
									? t("lib.status.failed")
									: isImageWallpaper
										? t("lib.status.image")
										: isBuffering
											? t("lib.status.loading")
											: isMoving
												? isSceneWallpaper
													? t("lib.status.scene")
													: isShaderWallpaper
														? t("lib.status.shader")
														: isWebWallpaper
															? t("lib.status.web")
															: t("lib.status.playing")
												: playState === "idle"
													? t("lib.status.idle")
													: isPaused
														? t("lib.status.paused")
														: t("lib.status.ready");
				const statusTone = lowPowerActive || hasStaticFrame
					? "warn"
					: isBlocked || isStalled || sceneBroken
						? "alert"
						: isMoving
							? "live"
							: "idle";
				const statusHint = lowPowerActive
					? t("lib.hint.lowPowerPauseOpen") + (lowPowerReasonLabel || t("lib.power.mode")) + t("lib.hint.lowPowerPauseClose")
					: hasStaticFrame
						? t("lib.hint.still")
						: isBlocked
							? t("lib.hint.blocked")
							: isStalled
								? t("lib.hint.stalled")
								: sceneBroken
									? t("lib.hint.decodeFailedOpen") + (playReason || t("lib.common.unknownReason")) + t("lib.hint.decodeFailedClose")
									: playState === "idle"
										? t("lib.hint.idle")
										: isBuffering
										? t("lib.hint.buffering")
										: isMoving
											? isSceneWallpaper
												? t("lib.hint.scene")
												: isShaderWallpaper
													? t("lib.hint.shader")
													: isWebWallpaper
														? t("lib.hint.web")
														: t("lib.hint.videoPlaying")
											: isPaused
												? t("lib.hint.paused")
												: t("lib.hint.ready");
				const showPlaybackAction = isVideoWallpaper || isShaderWallpaper || isSceneWallpaper || isWebWallpaper;
				const actionLabel = lowPowerActive
					? t("lib.action.lowPowerPlay")
					: hasStaticFrame
						? t("lib.action.backToMotion")
						: isBlocked
							? t("lib.action.play")
							: isStalled || sceneBroken
								? t("lib.action.retry")
								: isMoving
									? t("lib.action.pause")
									: t("lib.action.resume");
				const playWallpaper = () => {
					if (lowPowerActive) {
						setPowerMode("off");
						if (lowPowerController !== null) lowPowerController.set("off");
					}
					if (hasStaticFrame) {
						updatePlayback({ paused: false });
						resumeVideo();
						return;
					}
					if (isMoving) {
						pauseWallpaper();
						return;
					}
					if (isStalled || sceneBroken) {
						// Reload the current source without changing the saved choice.
						if (wallpaperController !== null) wallpaperController.reload();
						else pick(activeChoice);
						return;
					}
					// Persisted resume: the controller applies it to the scene, so a reload
					// keeps the same intent instead of silently starting to play again.
					resumeWallpaper();
				};
				const qualityExtra = (() => {
					if (mediaInfo === null) return "";
					if (mediaInfo.jitter > 0 && mediaInfo.fps > 0) {
						return t("lib.quality.jitter") + mediaInfo.jitter + "ms" + (mediaInfo.jitter > 90 ? t("lib.quality.high") : "");
					}
					return "";
				})();
				const readyListHint =
					composer === "url"
						? t("lib.listHint.url")
						: composer === "shader"
							? t("lib.listHint.shader")
							: sourceTab === "engine"
								? t("lib.listHint.engine", { n: engineCount })
								: sourceTab === "we"
								? t("lib.listHint.weOpen") +
									weCount +
									t("lib.unit.items") +
									(sceneCount > 0 ? t("lib.listHint.weSceneOpen") + sceneCount + t("lib.punct.closeParen") : "") +
									t("lib.listHint.weClose")
								: sourceTab === "local"
									? t("lib.listHint.local") + localCount + t("lib.listHint.localSuffix")
									: t("lib.listHint.all") +
										allCount +
										t("lib.listHint.allMiddle") +
										localCount +
										" / WE " +
										weCount +
										t("lib.listHint.allSuffix");
				// v0.5.2 loading/retry gates the ② copy: the v0.5.1 strings below are only
				// used once the list state is "ready".
				const listErrorText = hostStale ? t("lib.list.errHostStale") : t("lib.list.errNetwork");
				const listHint =
					listState === "loading"
						? t("lib.list.loadingHint")
						: listState === "error"
							? listErrorText
							: readyListHint;
				const sourceValue =
					composer === "url"
						? t("lib.source.url")
						: composer === "shader"
							? "ShaderToy"
							: sourceTab === "engine"
								? t("lib.source.engine")
								: sourceTab === "we"
									? "Wallpaper Engine"
									: sourceTab === "local"
										? t("lib.source.local")
										: t("lib.source.all");
				const readyListValue =
					composer === "url"
						? t("lib.listValue.pasteUrl")
						: composer === "shader"
							? "GLSL"
							: sourceTab === "all" && filtersActive === false
								? allCount + t("lib.unit.items")
								: // A filtered list states both numbers: "0 / 3 张" is honest about
									// an empty WE filter, while a bare "0 张" next to chips reading
									// "全部 3" looked like the library had lost its wallpapers.
									visibleItems.length + " / " + allCount + t("lib.unit.items");
				const listValue =
					listState === "loading"
						? t("lib.list.loading")
						: listState === "error"
							? t("lib.list.failed")
							: readyListValue;
				const framingValue = zones.main.zoom + "% · " + (zones.main.ratio === "auto" ? t("lib.ctrl.auto") : zones.main.ratio);
				const activeLayerLabels = layerSlots
					.filter((slot) =>
						slot.kind === "preset"
							? slot.preset !== "none"
							: slot.kind === "image"
								? slot.url !== ""
								: false,
					)
					.map((slot) => layerSlotLabel(slot));
				const appearanceValue =
					t("lib.appearance.glassPrefix") +
					Math.round(glassLevel * 100) +
					"%" +
					(activeLayerLabels.length === 0 ? "" : " · " + activeLayerLabels.join(" + "));
				const performanceValue =
					(powerMode === "auto" ? t("lib.perf.powerAuto") : powerMode === "on" ? t("lib.perf.powerOn") : t("lib.perf.powerOff")) +
					" · " +
					(fpsMode === "auto" ? "30fps" : fpsMode + "fps") +
					(rotation.on ? t("lib.perf.rotationOn") : "");
				const groupSummary = (step, title, value) =>
					React.createElement(
						"summary",
						{ className: "tl-wall-group-summary" },
						React.createElement("span", { className: "tl-wall-step" }, step),
						React.createElement("span", { className: "tl-wall-group-title" }, title),
						React.createElement("span", { className: "tl-wall-summary-value" }, value),
					);
				return React.createElement(
					"div",
					{ className: "tl-wall-inner", "data-tl-view": view },
					React.createElement("div", { className: "tl-wall-glow", "data-tl-wall-glow": "" }),
					React.createElement(
						"div",
						{ className: "tl-wall-sticky", "data-tl-wall-drag": "" },
						React.createElement(
							"div",
							{ className: "tl-wall-head" },
							React.createElement("div", { className: "tl-font-title" }, t("lib.panel.title")),
							view === "pick"
								? React.createElement(
										"button",
										{
											type: "button",
											className: "tl-font-option tl-wall-more-settings",
											"data-tl-more-settings": "",
											onClick: () => setView("advanced"),
										},
										t("lib.pick.more"),
									)
								: null,
							React.createElement(
								"div",
								{ className: "tl-wall-view-switch" },
								[
									["pick", t("lib.view.pick")],
									["advanced", t("lib.view.advanced")],
								].map(([value, label]) =>
									React.createElement(
										"button",
										{
											key: value,
											type: "button",
											"data-active": view === value ? "" : undefined,
											onClick: () => {
												setView(value);
												setPickError("");
												// Simple view has no filter row; clear hidden filters so the list
												// cannot look mysteriously empty after leaving 高级.
												if (value === "pick") {
													setQuery("");
													setFavoritesOnly(false);
													setTagFilter([]);
													setShowHidden(false);
													setTagEditorUrl("");
													setComposer("none");
												}
											},
										},
										label,
									),
								),
							),
							React.createElement(
								"button",
								{
									type: "button",
									className: "tl-font-close",
									"aria-label": t("lib.panel.close"),
									onClick: () => {
										if (props !== undefined && typeof props.onClose === "function") props.onClose();
									},
								},
								"\u00d7",
							),
						),
						// v0.5.3 quick picker: one compact status line with an immediate
						// pause/resume; the full guide only belongs to the advanced view.
						view === "pick"
							? React.createElement(
									"div",
									{ className: "tl-wall-pick-status", "data-tl-pick-status": "" },
									React.createElement(
										"p",
										{ className: "tl-wall-status", "data-tone": statusTone, title: statusHint },
										React.createElement("span", { className: "tl-wall-status-dot", "aria-hidden": "true" }),
										statusLabel,
									),
									showPlaybackAction
										? React.createElement(
												"button",
												{ type: "button", className: "tl-font-option", "data-tone": statusTone, onClick: playWallpaper },
												actionLabel,
											)
										: null,
									pickError === "" ? null : React.createElement("p", { className: "tl-wall-pick-error", "data-tl-pick-error": "" }, pickError),
								)
							: null,
						React.createElement(
							"div",
							{ className: "tl-wall-guide" },
							view === "advanced"
								? React.createElement(
										"div",
										{ className: "tl-wall-tabs" },
										React.createElement(
											"button",
											{
												type: "button",
												className: "tl-font-option tl-wall-back-quick",
												"data-tl-back-quick": "",
												onClick: () => {
													setView("pick");
													setComposer("none");
													setPickError("");
												},
											},
											t("lib.pick.back"),
										),
									)
								: null,
							view === "advanced"
								? React.createElement(
										"p",
										{ className: "tl-wall-status", "data-tone": statusTone, title: statusHint },
										React.createElement("span", { className: "tl-wall-status-dot", "aria-hidden": "true" }),
										statusLabel,
									)
								: null,
							view === "advanced"
								? React.createElement(
										"p",
										{ className: "tl-wall-current", title: activeChoice === null ? undefined : activeChoice.url },
										t("lib.current.prefix") + currentTitle,
									)
								: null,
							// v0.5.0 D3: a #tl= recipe found in the URL is a PROPOSAL. This strip
							// is the only place that can turn it into settings (应用), and an
							// invalid link never reaches it at all.
							sharedRecipe === null
								? shareStatus === ""
									? null
									: React.createElement("p", { className: "tl-wall-v05-note" }, t(shareStatus))
								: React.createElement(
										"div",
										{ className: "tl-wall-share-strip", "data-tone": "accent" },
										React.createElement(
											"p",
											{ className: "tl-wall-share-strip-text" },
											t("lib.shareDetected", { n: sharedRecipe.count }),
										),
										React.createElement(
											"div",
											{ className: "tl-wall-share-strip-actions" },
											React.createElement(
												"button",
												{ type: "button", className: "tl-font-reset", onClick: applySharedRecipe },
												t("lib.shareApply"),
											),
											React.createElement(
												"button",
												{ type: "button", className: "tl-font-option", onClick: ignoreSharedRecipe },
												t("lib.shareIgnore"),
											),
										),
										React.createElement("p", { className: "tl-wall-hint" }, t("lib.shareHint")),
									),
							// v1.6.7: URL address and ShaderToy code are first-class routes in the
							// default view. They used to live only in 高级 → ① 来源, which the pick
							// view hides; this row sits OUTSIDE every [data-tl-group] container so
							// the pick-view hiding rules can never remove it.
							// The chips below only filter the library.
							view === "pick"
								? React.createElement(
										React.Fragment,
										null,
										React.createElement(
											"div",
											{
												className: "tl-wall-quick-source",
												"data-tl-quick-source": "",
												role: "group",
												"aria-label": t("lib.quick.label"),
											},
											[
												["url", t("lib.quick.url"), t("lib.quick.urlHint")],
												["shader", t("lib.quick.shader"), t("lib.quick.shaderHint")],
											].map(([id, label, hint]) =>
												React.createElement(
													"button",
													{
														key: id,
														type: "button",
														className: "tl-source-card tl-wall-quick-source-btn",
														"data-tl-quick-source": id,
														title: hint,
														onClick: () => openQuickSource(id),
													},
													React.createElement("span", { className: "tl-source-name" }, label),
													React.createElement("span", { className: "tl-source-note" }, hint),
												),
											),
										),
										React.createElement(
											"div",
											{ className: "tl-wall-filter-row" },
											[
												["all", t("lib.source.all"), allCount],
												["local", t("lib.source.localShort"), localCount],
												["we", "WE", weCount],
												["engine", t("lib.source.engine"), engineCount],
											].map(([value, label, count]) =>
												React.createElement(
													"button",
													{
														key: value,
														type: "button",
														className: "tl-wall-filter-chip",
														"data-active": sourceTab === value && composer === "none" ? "" : undefined,
														onClick: () => {
															setSourceTab(value);
															setComposer("none");
															setNote("");
															const list = document.querySelector("[data-tl-wall-list]");
															if (list !== null) list.open = true;
															if (value === "we" && weCount === 0) openWe();
														},
													},
													// Counts are only meaningful once the list actually loaded:
													// during loading/error the chips stay label-only instead of
													// claiming "全部 0" (the v0.5.1 "0 张 forever" complaint).
													listState === "ready" ? label + " " + count : label,
												),
											),
										),
									)
								: null,
							// v0.5.3: the pick view is a wallpaper picker, not a file/URL
							// importer — URL / WE / GLSL import links only exist in 高级.
							view === "advanced"
								? React.createElement("p", { className: "tl-wall-hint" }, statusHint)
								: null,
							view === "advanced" && qualityNote + qualityExtra !== ""
								? React.createElement(
										"p",
										{ className: "tl-wall-hint tl-wall-quality", title: qualityNote + qualityExtra },
										qualityNote + qualityExtra,
									)
								: null,
							view === "advanced" && showPlaybackAction
								? React.createElement(
										"div",
										{ className: "tl-wall-tabs tl-wall-play-row" },
										React.createElement(
											"span",
											{ className: "tl-wall-label" },
											isMoving ? t("lib.label.playing") : isBlocked ? t("lib.label.unlock") : t("lib.label.play"),
										),
										React.createElement(
											"button",
											{ type: "button", className: "tl-font-option", "data-tone": statusTone, onClick: playWallpaper },
											actionLabel,
										),
									)
								: null,
						),
					),
					// ---- sources: which catalog the list below is drawn from ----
					React.createElement(
						"details",
						{ className: "tl-wall-group", open: false, "data-tl-group": "sources" },
						groupSummary("①", t("lib.group.sources"), sourceValue),
						React.createElement(
							"div",
							{ className: "tl-source-grid" },
							PROVIDERS.map((provider) =>
								React.createElement(
									"button",
									{
										key: provider.id,
										type: "button",
										className: "tl-source-card",
										// The clicked source owns the highlight, including URL, which
										// has no list of its own but is still a real choice.
										"data-active":
											provider.available &&
											(provider.id === "local"
												? sourceTab === "local" && composer === "none"
												: provider.id === "we"
													? sourceTab === "engine" && composer === "none"
													: composer === provider.id)
												? ""
												: undefined,
										"data-tl-disabled": provider.available ? undefined : "",
										title:
											provider.id === "we"
												? t("lib.we.autoDesc")
												: provider.available
													? provider.note
													: provider.label + t("lib.punct.colon") + provider.note,
										onClick: () => {
											if (provider.id === "we") {
												// v0.6.0: no folder browsing. The auto-detected library lives
												// in the DSH settings page; ask it to open and filter the grid.
												setSourceTab("engine");
												setComposer("none");
												openWallpaperLibrary();
												return;
											}
											if (provider.id === "local") {
												setSourceTab("local");
												setComposer("none");
												setNote("");
												return;
											}
											if (provider.id === "url") {
												setComposer("url");
												setNote("");
												return;
											}
											if (provider.id === "shader") {
												setComposer("shader");
												setNote("");
												return;
											}
											if (!provider.available) {
												// An unavailable source stays a note on the current tab; it must
												// not steal the selection from the source that is showing.
												setNote(provider.label + " · " + provider.note);
												globalThis.setTimeout(() => setNote(""), 6000);
												return;
											}
											setSourceTab(provider.id);
											setNote("");
										},
									},
									React.createElement("span", { className: "tl-source-name" }, provider.label),
									React.createElement(
										"span",
										{ className: "tl-source-note" },
										provider.id === "we" ? t("lib.we.autoDesc") : provider.desc,
									),
								),
							),
						),
						// v0.6.0: Wallpaper Engine is auto-detected from the app's library; the
						// folder-path editor is now only a collapsed edge-case fallback.
						React.createElement(
							"div",
							{ className: "tl-wall-tabs tl-we-auto", "data-tl-we-auto": "" },
							React.createElement(
								"span",
								{ className: "tl-wall-hint tl-we-auto-text", "data-tl-we-detected": "" },
								t("lib.we.detected", { n: engineCount, steam: engineSteamCount, project: engineProjectCount }),
							),
							React.createElement(
								"button",
								{
									type: "button",
									className: "tl-font-option tl-we-open-library",
									"data-tl-open-library": "",
									onClick: openWallpaperLibrary,
								},
								t("lib.we.openLibrary"),
							),
						),
						weLibraryNote === ""
							? null
							: React.createElement("p", { className: "tl-wall-hint", "data-tl-we-note": "" }, weLibraryNote),
						React.createElement(
							"details",
							{
								className: "tl-wall-group tl-we-manual",
								open: false,
								"data-tl-group": "we-manual",
								"data-tl-we-manual": "",
							},
							React.createElement(
								"summary",
								{
									className: "tl-wall-group-summary",
									onClick: () => {
										if (weOpen === false) openWe();
									},
								},
								React.createElement("span", { className: "tl-wall-group-title" }, t("lib.we.manual")),
							),
							weOpen
								? React.createElement(
										"div",
										{ className: "tl-we-manual-body" },
										React.createElement("p", { className: "tl-wall-hint" }, t("lib.we.hint")),
										React.createElement("textarea", {
											className: "tl-wall-textarea",
											rows: 3,
											placeholder: t("lib.we.placeholder"),
											value: weDraft,
											onChange: (event) => setWeDraft(event.target.value),
										}),
										React.createElement(
											"button",
											{ type: "button", className: "tl-font-reset", onClick: saveWe },
											t("lib.we.save"),
										),
										weStatus === "" ? null : React.createElement("p", { className: "tl-wall-hint" }, weStatus),
									)
								: React.createElement("p", { className: "tl-wall-hint" }, t("lib.we.manualHint")),
						),
						noteText === "" ? null : React.createElement("p", { className: "tl-wall-hint" }, noteText),
					),
					React.createElement(
						"details",
						{ className: "tl-wall-group", open: true, "data-tl-wall-list": "" },
						groupSummary("②", t("lib.group.list"), listValue),
						// v0.5.3: the pick view is a pure visual grid — long hints only in 高级.
						view === "advanced" ? React.createElement("p", { className: "tl-wall-hint" }, listHint) : null,
						// v0.5.2: only after the silent retry failed does the panel admit an
						// error; the ② hint carries the reason and this row adds the retry.
						listState === "error"
							? React.createElement(
									"div",
									{ className: "tl-wall-empty tl-wall-list-error" },
									// In the pick view the long hint is hidden, so the reason lives
									// inside the error row instead (no silent failure).
									view === "pick" ? React.createElement("p", { className: "tl-wall-hint" }, listErrorText) : null,
									React.createElement(
										"button",
										{
											type: "button",
											className: "tl-font-option",
											onClick: () => setListAttempt((current) => current + 1),
										},
										t("lib.action.retry"),
									),
								)
							: null,
						// v0.6.0: the WE folder-path editor moved into ① as a collapsed
						// "Advanced (manual path)" fallback; auto-detection needs no config.
						composer !== "none"
							? null
							: React.createElement(
									"div",
									{ className: "tl-wall-library" },
							// v0.5.3: upload is an advanced-view action; the pick view must not
							// contain a file picker at all.
							view === "advanced"
								? React.createElement(
								"div",
								{ className: "tl-wall-tabs" },
								React.createElement(
									"label",
									{
										className: "tl-wall-upload",
										"data-busy": uploadBusy ? "" : undefined,
										title: t("lib.upload.title"),
									},
									uploadBusy ? t("lib.upload.busy") : t("lib.upload.button"),
									React.createElement("input", {
										type: "file",
										accept: "video/*,image/*",
										disabled: uploadBusy,
										onChange: uploadWallpaper,
										style: { display: "none" },
									}),
								),
								React.createElement(
									"span",
									{ className: "tl-wall-hint" },
									hostStale ? t("lib.upload.hostStaleShort") : "≤" + uploadLimitMb + t("lib.upload.limitSuffix"),
								),
								hostStale
									? React.createElement(
											"button",
											{
												type: "button",
												className: "tl-font-option",
												onClick: () => {
													setUploadNote(t("lib.upload.redetecting"));
													setEngineProbe((value) => value + 1);
												},
											},
											t("lib.upload.redetect"),
										)
									: null,
								)
								: null,
							view === "advanced" && uploadNote !== ""
								? React.createElement("p", { className: "tl-wall-hint" }, uploadNote)
								: null,
							React.createElement("input", {
								className: "tl-font-input",
								type: "search",
								placeholder: t("lib.searchPlaceholder"),
								"aria-label": t("lib.searchAria"),
								value: query,
								onChange: (event) => setQuery(event.target.value),
							}),
							// v0.5.0 D1: sort is its own labelled row, so the filter chips keep
							// their v0.4.0 shape ("全部 N" / "本地" / "WE") that skinlab asserts.
							React.createElement(
								"div",
								{ className: "tl-wall-sort-row", role: "group", "aria-label": t("lib.sort") },
								React.createElement("span", { className: "tl-wall-label" }, t("lib.sort")),
								[
									["name", t("lib.sortName")],
									["kind", t("lib.sortKind")],
									["recent", t("lib.sortRecent")],
									["favorites", t("lib.sortFavorites")],
								].map(([value, label]) =>
									React.createElement(
										"button",
										{
											key: value,
											type: "button",
											className: "tl-font-option",
											"data-active": sortMode === value ? "" : undefined,
											"aria-pressed": sortMode === value,
											onClick: () => setSortMode(value),
										},
										label,
									),
								),
							),
							// v0.5.3: favorites/tags/clear facets stay in 高级; the pick view keeps
							// only the source chips, search and sort.
							view === "advanced"
								? React.createElement(
								"div",
								{ className: "tl-wall-tabs tl-wall-filters" },
								React.createElement(
									"button",
									{
										type: "button",
										className: "tl-font-option",
										"data-active": favoritesOnly ? "" : undefined,
										"aria-pressed": favoritesOnly,
										onClick: () => setFavoritesOnly((value) => !value),
									},
									favoriteCount > 0 ? t("lib.favorites") + " " + favoriteCount : t("lib.favorites"),
								),
								hiddenCount === 0
									? null
									: React.createElement(
											"button",
											{
												type: "button",
												className: "tl-font-option",
												"data-active": showHidden ? "" : undefined,
												"aria-pressed": showHidden,
												title: t("lib.hiddenHint"),
												onClick: () => setShowHidden((value) => !value),
											},
											showHidden
												? t("lib.hiddenOn") + " " + hiddenCount
												: t("lib.hidden") + " " + hiddenCount,
										),
								tagChoices.map((tag) =>
									React.createElement(
										"button",
										{
											key: tag,
											type: "button",
											className: "tl-font-option",
											"data-active": tagFilter.includes(tag) ? "" : undefined,
											"aria-pressed": tagFilter.includes(tag),
											onClick: () =>
												setTagFilter((current) =>
													current.includes(tag)
														? current.filter((entry) => entry !== tag)
														: [...current, tag],
												),
										},
										"#" + tag,
									),
								),
								filtersActive
									? React.createElement(
											"button",
											{
												type: "button",
												className: "tl-font-option",
												onClick: () => {
													setQuery("");
													setFavoritesOnly(false);
													setTagFilter([]);
												},
											},
											t("lib.filterClear"),
										)
									: null,
								)
								: null,
						),
						editingItem === null || composer !== "none" || view !== "advanced"
							? null
							: React.createElement(
									"div",
									{ className: "tl-wall-url tl-wall-tag-editor" },
									React.createElement("p", { className: "tl-wall-hint" }, t("lib.tag.prefix") + nameOf(editingItem)),
									editingMeta.tags.length === 0
										? null
										: React.createElement(
												"div",
												{ className: "tl-wall-tabs" },
												editingMeta.tags.map((tag) =>
													React.createElement(
														"button",
														{
															key: tag,
															type: "button",
															className: "tl-font-option",
															title: t("lib.tag.remove"),
															onClick: () => removeTag(tag),
														},
														"#" + tag + " ×",
													),
												),
											),
									React.createElement("input", {
										className: "tl-font-input",
										type: "text",
										placeholder: t("lib.tag.placeholder"),
										value: tagDraft,
										onChange: (event) => setTagDraft(event.target.value),
										onKeyDown: (event) => {
											if (event.key === "Enter") {
												event.preventDefault();
												addTag();
											}
										},
									}),
									React.createElement(
										"div",
										{ className: "tl-wall-tabs" },
										React.createElement(
											"button",
											{
												type: "button",
												className: "tl-font-reset",
												onClick: () => {
													setTagEditorUrl("");
													setTagDraft("");
												},
											},
											t("lib.common.done"),
										),
									),
								),
						composer !== "none"
							? null
							: React.createElement(
									"div",
									{ className: view === "pick" ? "tl-wall-grid tl-wall-grid-pick" : "tl-wall-grid" },
							filtersActive
								? null
								: React.createElement(
										"button",
										{
											type: "button",
											className: "tl-wall-card",
											"data-tl-wall-card": "",
											"data-tl-auto-card": "",
											"data-active": active === "" ? "" : undefined,
											onClick: () => pickCard(null, t("lib.card.autoTitle")),
										},
										React.createElement("div", { className: "tl-wall-thumb tl-wall-auto" }, t("lib.ctrl.auto")),
										React.createElement("span", { className: "tl-wall-name" }, t("lib.card.autoTitle")),
										React.createElement("span", { className: "tl-wall-tags-mini" }, t("lib.card.autoNote")),
										active === "" ? React.createElement("span", { className: "tl-wall-using", "data-tl-in-use": "" }, t("lib.card.inUse")) : null,
									),
							sortedItems.map(({ item, meta }) =>
								React.createElement(
									"div",
									{ key: item.id, className: "tl-wall-cell", "data-tl-hidden": meta.hidden ? "" : undefined },
									React.createElement(
										"button",
										{
											type: "button",
											className: "tl-wall-card",
											"data-tl-wall-card": "",
											"data-tl-url": item.url,
											"data-tl-kind": item.kind,
											"data-tl-we-item": isEngineItem(item) ? "" : undefined,
											"data-tl-we-type": isEngineItem(item) ? engineTypeOf(item) || "unknown" : undefined,
											"data-active": active === item.url ? "" : undefined,
											onClick: () => pickCard({ kind: item.kind, url: item.url }, displayNameOf(item)),
										},
										React.createElement(
											"div",
											{ className: "tl-wall-thumb" },
											previewOf(item) !== ""
												? React.createElement("img", {
														// v0.6.0: every kind prefers the host preview; a WE video
														// must never be downloaded just to paint a thumbnail.
														src: previewOf(item),
														alt: displayNameOf(item),
														loading: "lazy",
														onError: (event) => {
															event.currentTarget.style.display = "none";
														},
													})
												: item.kind === "scene" || item.kind === "web"
													? React.createElement("img", {
															src: "",
															alt: displayNameOf(item),
															loading: "lazy",
															onError: (event) => {
																event.currentTarget.style.display = "none";
															},
														})
													: item.kind === "video"
														? React.createElement("video", {
																src: item.url + "#t=0.1",
																muted: true,
																preload: "metadata",
																playsInline: true,
																// A codec the browser cannot decode (e.g. HEVC) would
																// otherwise leave a black box that reads as "unreadable".
																onLoadedData: (event) => {
																	event.currentTarget.dataset.tlThumb = "";
																},
																onError: (event) => {
																	event.currentTarget.style.display = "none";
																},
															})
														: React.createElement("img", {
																src: item.url,
																alt: displayNameOf(item),
																loading: "lazy",
															}),
										),
										React.createElement("span", { className: "tl-wall-name" }, displayNameOf(item)),
										active === item.url
											? React.createElement("span", { className: "tl-wall-using", "data-tl-in-use": "" }, t("lib.card.inUse"))
											: null,
										React.createElement(
											"span",
											{ className: "tl-wall-tags-mini", "data-tl-badge": "" },
											[
												badgeOf(item),
												formatBytes(item.bytes),
												...meta.tags.map((tag) => "#" + tag),
											]
												.filter((entry) => entry !== "")
												.join(" · "),
										),
										isEngineItem(item) && engineTypeOf(item) === "scene"
											? React.createElement(
													"span",
													{ className: "tl-wall-badge-hint", "data-tl-static-hint": "", title: t("lib.we.staticHintTitle") },
													t("lib.we.staticHint"),
												)
											: null,
									),
									React.createElement(
										"button",
										{
											type: "button",
											className: "tl-wall-hide",
											"data-active": meta.hidden ? "" : undefined,
											"aria-label": meta.hidden ? t("lib.card.unhide") : t("lib.card.hide"),
											title: meta.hidden ? t("lib.card.unhideTitle") : t("lib.card.hideTitle"),
											onClick: () => updateMeta(item.url, { hidden: meta.hidden !== true }),
										},
										meta.hidden ? t("lib.card.unhideShort") : t("lib.card.hideShort"),
									),
									React.createElement(
										"button",
										{
											type: "button",
											className: "tl-wall-fav",
											"data-active": meta.favorite ? "" : undefined,
											"aria-label": meta.favorite ? t("lib.card.unfavorite") : t("lib.card.favorite"),
											title: meta.favorite ? t("lib.card.unfavorite") : t("lib.card.favorite"),
											onClick: () => updateMeta(item.url, { favorite: meta.favorite === false }),
										},
										meta.favorite ? "★" : "☆",
									),
									// Tag editing is an advanced-view action; its editor container is
									// hidden in the pick view, so rendering the "#" there made a
									// button that could not do anything.
									view === "advanced"
										? React.createElement(
												"button",
												{
													type: "button",
													className: "tl-wall-tag-open",
													"aria-label": t("lib.card.editTags"),
													title: t("lib.card.editTags"),
													onClick: () => {
														setTagEditorUrl(item.url);
														setTagDraft("");
													},
												},
												"#",
											)
										: null,
								),
							),
						),
						composer === "none" && listState === "ready" && filtersActive && visibleItems.length === 0
							? React.createElement(
									"div",
									{ className: "tl-wall-empty" },
									React.createElement("p", { className: "tl-wall-hint" }, t("lib.filterEmpty")),
									// Show exactly which filters are narrowing the list, in a
									// language-neutral form, so "0 张" never looks like data loss.
									React.createElement(
										"p",
										{ className: "tl-wall-v05-note" },
										[
											query.trim() === "" ? "" : "🔍 " + query.trim(),
											favoritesOnly ? "★" : "",
											tagFilter.length === 0 ? "" : tagFilter.map((tag) => "#" + tag).join(" + "),
										]
											.filter((entry) => entry !== "")
											.join(" · "),
									),
									React.createElement(
										"button",
										{
											type: "button",
											className: "tl-font-option",
											onClick: () => {
												setQuery("");
												setFavoritesOnly(false);
												setTagFilter([]);
												setShowHidden(false);
											},
										},
										t("lib.filterClear"),
									),
								)
							: null,
						composer === "none" && listState === "ready" && filtersActive === false && visibleItems.length === 0
							? React.createElement(
									"div",
									{ className: "tl-wall-empty" },
									React.createElement(
										"p",
										{ className: "tl-wall-hint" },
										sourceTab === "engine"
											? t("lib.empty.engine")
											: sourceTab === "we"
												? t("lib.empty.we")
												: sourceTab === "all"
													? t("lib.empty.all")
													: t("lib.empty.local"),
									),
									// A filtered-empty list must never be a dead end: one click goes
									// back to the full library (this was the "0 张 and no way out"
									// state when the panel reopened on a stale WE filter).
									sourceTab !== "all"
										? React.createElement(
												"button",
												{
													type: "button",
													className: "tl-font-option",
													onClick: () => {
														setSourceTab("all");
														setComposer("none");
														setNote("");
													},
												},
												t("lib.empty.showAll"),
											)
										: null,
								)
							: null,
						composer === "url"
							? React.createElement(
									"p",
									{ className: "tl-wall-hint" },
									t("lib.url.hint"),
								)
							: null,
						composer === "url"
							? React.createElement(
									"div",
									{ className: "tl-wall-url" },
									React.createElement(
										"div",
										{ className: "tl-wall-tabs" },
										React.createElement("span", { className: "tl-wall-label" }, t("lib.field.type")),
										[["auto", t("lib.ctrl.auto")], ["image", t("lib.kind.image")], ["video", t("lib.kind.video")]].map(([value, label]) =>
											React.createElement(
												"button",
												{
													key: value,
													type: "button",
													className: "tl-font-option",
													"data-active": draftKind === value ? "" : undefined,
													onClick: () => {
														setDraftKind(value);
														setDraftNote("");
													},
												},
												label,
											),
										),
										React.createElement(
											"button",
											{
												type: "button",
												className: "tl-font-option",
												onClick: () => {
													void (async () => {
														try {
															const text = await globalThis.navigator?.clipboard?.readText();
															if (typeof text === "string" && text.trim() !== "") {
																setDraft(text.trim());
																setDraftNote(t("lib.url.pasted"));
																return;
															}
															setDraftNote(t("lib.url.clipboardEmpty"));
														} catch {
															setDraftNote(t("lib.url.clipboardDenied"));
														}
													})();
												},
											},
											t("lib.url.paste"),
										),
									),
									React.createElement("input", {
										className: "tl-font-input",
										type: "url",
										"data-tl-wall-url-input": "",
										placeholder: t("lib.url.placeholder"),
										value: draft,
										onChange: (event) => {
											setDraft(event.target.value);
											setDraftNote("");
										},
										onKeyDown: (event) => {
											if (event.key === "Enter" && draftBusy === false) void applyDraft();
										},
									}),
									React.createElement(
										"button",
										{
											type: "button",
											className: "tl-font-reset",
											disabled: draftBusy,
											onClick: () => void applyDraft(),
										},
										draftBusy ? t("lib.url.checkingShort") : t("lib.url.apply"),
									),
									React.createElement(
										"p",
										{ className: "tl-wall-hint" },
										draftNote === ""
											? t("lib.url.autoHint")
											: draftNote,
									),
								)
							: null,
						composer === "shader"
							? React.createElement(
									"div",
									{ className: "tl-wall-url" },
									React.createElement(
										"p",
										{ className: "tl-wall-hint" },
										t("lib.shader.intro"),
									),
									React.createElement(
										"p",
										{ className: "tl-wall-hint" },
										t("lib.shader.uniforms"),
									),
									React.createElement(
										"div",
										{ className: "tl-wall-tabs" },
										SHADER_PRESETS.map((preset) =>
											React.createElement(
												"button",
												{
													key: preset.id,
													type: "button",
													className: "tl-font-option",
													"data-active": shader.preset === preset.id ? "" : undefined,
													onClick: () => {
														setShader((current) => ({ ...current, preset: preset.id, source: preset.source }));
														setShaderStatus("");
													},
												},
												preset.label,
											),
										),
									),
									React.createElement(
										"div",
										{ className: "tl-wall-url" },
										React.createElement(
											"p",
											{ className: "tl-wall-hint" },
											t("lib.audio.hint"),
										),
										React.createElement(
											"div",
											{ className: "tl-wall-tabs" },
											React.createElement(
												"button",
												{
													type: "button",
													className: "tl-font-option",
													"data-active": audio.active ? "" : undefined,
													disabled: audio.busy,
													onClick: toggleAudio,
												},
												audio.busy ? t("lib.audio.requestingShort") : audio.active ? t("lib.audio.stop") : t("lib.audio.start"),
											),
											React.createElement(
												"button",
												{ type: "button", className: "tl-font-option", onClick: useAudioPreset },
												t("lib.audio.usePreset"),
											),
										),
										React.createElement(
											"p",
											{ className: "tl-wall-hint" },
											audioNote ||
												audio.reason ||
												(audio.active
													? t("lib.audio.active")
													: t("lib.audio.idle")),
										),
									),
									React.createElement("textarea", {
										className: "tl-wall-textarea tl-wall-code",
										rows: 8,
										spellCheck: false,
										"aria-label": t("lib.shader.sourceAria"),
										// v1.6.7: the quick-source shader entry scrolls this editor into
										// view once the advanced view has mounted it.
										"data-tl-wall-shader-input": "",
										value: shader.source,
										onChange: (event) => {
											setShader((current) => ({ ...current, preset: "custom", source: event.target.value }));
											setShaderStatus("");
										},
									}),
									React.createElement(
										"label",
										{ className: "tl-wall-slider" },
										React.createElement("span", null, t("lib.shader.speed") + shader.speed.toFixed(1) + "×"),
										React.createElement("input", {
											type: "range",
											min: 0.1,
											max: 3,
											step: 0.1,
											value: shader.speed,
											onChange: (event) =>
												setShader((current) => ({ ...current, speed: Number(event.target.value) })),
										}),
									),
									React.createElement(
										"label",
										{ className: "tl-wall-slider" },
										React.createElement("span", null, t("lib.shader.intensity") + shader.intensity.toFixed(2)),
										React.createElement("input", {
											type: "range",
											min: 0,
											max: 2,
											step: 0.05,
											value: shader.intensity,
											onChange: (event) =>
												setShader((current) => ({ ...current, intensity: Number(event.target.value) })),
										}),
									),
									React.createElement(
										"label",
										{ className: "tl-wall-slider" },
										React.createElement("span", null, t("lib.shader.hue") + Math.round(shader.hue * 100) + "%"),
										React.createElement("input", {
											type: "range",
											min: 0,
											max: 1,
											step: 0.01,
											value: shader.hue,
											onChange: (event) =>
												setShader((current) => ({ ...current, hue: Number(event.target.value) })),
										}),
									),
									React.createElement(
										"div",
										{ className: "tl-wall-tabs" },
										React.createElement("button", { type: "button", className: "tl-font-reset", onClick: applyShader }, t("lib.shader.apply")),
										React.createElement("button", { type: "button", className: "tl-font-reset", onClick: resetShader }, t("lib.shader.resetButton")),
									),
									shaderStatus === "" ? null : React.createElement("p", { className: "tl-wall-hint" }, shaderStatus),
								)
							: null,
					),
					// ---- framing: ratio-locked crop, zoom and pan ----
					React.createElement(
						"details",
						{ className: "tl-wall-group", open: false, "data-tl-group": "advanced" },
						groupSummary("③", t("lib.group.framing"), framingValue),
						// ---- ratio-locked crop ----
						React.createElement(
							"div",
							{ className: "tl-wall-tabs" },
							Object.keys(RATIOS).map((key) =>
								React.createElement(
									"button",
									{
										key,
										type: "button",
										className: "tl-font-option",
										"data-active": zones.main.ratio === key ? "" : undefined,
										onClick: () => {
											const next = { ...zones, main: { ...zones.main, ratio: key } };
											setZones(next);
											if (zoneController !== null) zoneController.apply(next);
										},
									},
									key === "auto" ? t("lib.framing.followWindow") : key,
								),
							),
						),
						React.createElement(
							"label",
							{ className: "tl-wall-slider" },
							React.createElement("span", null, t("lib.framing.zoom") + zones.main.zoom + "%"),
							React.createElement("input", {
								type: "range",
								min: 30,
								max: 300,
								step: 5,
								value: zones.main.zoom,
								onChange: (event) => {
									const next = { ...zones, main: { ...zones.main, zoom: Number(event.target.value) } };
									setZones(next);
									if (zoneController !== null) zoneController.apply(next);
								},
							}),
						),
						React.createElement(
							"label",
							{ className: "tl-wall-slider" },
							React.createElement("span", null, t("lib.framing.cx") + zones.main.cx + (pannable ? "%" : t("lib.framing.notCropped"))),
							React.createElement("input", {
								type: "range",
								min: 0,
								max: 100,
								step: 1,
								value: zones.main.cx,
								disabled: pannable === false,
								onChange: (event) => {
									const next = { ...zones, main: { ...zones.main, cx: Number(event.target.value) } };
									setZones(next);
									if (zoneController !== null) zoneController.apply(next);
								},
							}),
						),
						React.createElement(
							"label",
							{ className: "tl-wall-slider" },
							React.createElement("span", null, t("lib.framing.cy") + zones.main.cy + (pannable ? "%" : t("lib.framing.notCropped"))),
							React.createElement("input", {
								type: "range",
								min: 0,
								max: 100,
								step: 1,
								value: zones.main.cy,
								disabled: pannable === false,
								onChange: (event) => {
									const next = { ...zones, main: { ...zones.main, cy: Number(event.target.value) } };
									setZones(next);
									if (zoneController !== null) zoneController.apply(next);
								},
							}),
						),
						React.createElement(
							"p",
							{ className: "tl-wall-hint" },
							t("lib.framing.window") + ((globalThis.innerWidth || 16) / (globalThis.innerHeight || 9)).toFixed(2) + ":1" +
								(zones.main.ratio === "auto" ? t("lib.framing.cropFollows") : t("lib.framing.cropIs") + zones.main.ratio),
						),
						pannable
							? null
							: React.createElement(
									"p",
									{ className: "tl-wall-hint" },
									t("lib.framing.hint"),
								),
						React.createElement(
							"div",
							{ className: "tl-wall-url" },
							React.createElement(
								"p",
								{ className: "tl-wall-hint" },
								activeChoice === null
									? t("lib.frame.needExplicit")
									: activeChoice.kind !== "video"
										? t("lib.frame.videoOnly")
										: t("lib.frame.hint"),
							),
							activeChoice !== null && activeChoice.kind === "video"
								? React.createElement(
										"div",
										{ className: "tl-wall-tabs" },
										React.createElement(
											"button",
											{ type: "button", className: "tl-font-reset", disabled: frameBusy, onClick: requestFrames },
											frameBusy ? t("lib.frame.busy") : t("lib.frame.generate"),
										),
										activeChoice.still !== undefined
											? React.createElement(
													"button",
													{ type: "button", className: "tl-font-reset", onClick: resumeVideo },
													t("lib.action.backToMotion"),
												)
											: null,
									)
								: null,
							activeChoice !== null && activeChoice.kind === "video" && activeChoice.still !== undefined
								? React.createElement(
										"p",
										{ className: "tl-wall-hint" },
										t("lib.frame.currentPrefix") + Number(activeChoice.still).toFixed(1) + t("lib.frame.currentSuffix"),
									)
								: null,
							frameStatus === "" ? null : React.createElement("p", { className: "tl-wall-hint" }, frameStatus),
							frameSource === "" || activeChoice === null || frameSource !== activeChoice.url || frames.length === 0
								? null
								: React.createElement(
										"div",
										{ className: "tl-frame-grid" },
										frames.map((frame) =>
											React.createElement(
												"button",
												{
													key: frame.time,
													type: "button",
													className: "tl-frame",
													title: t("lib.frame.set") + Number(frame.time).toFixed(1) + "s",
													onClick: () => applyFrame(frame.time),
												},
												React.createElement("img", { src: frame.dataUrl, alt: "" }),
												React.createElement("span", null, Number(frame.time).toFixed(1) + "s"),
											),
										),
									),
						),
						isVideoWallpaper
							? React.createElement(
									"div",
									{ className: "tl-wall-url" },
									React.createElement(
										"p",
										{ className: "tl-wall-hint" },
										t("lib.playback.hint"),
									),
									React.createElement(
										"div",
										{ className: "tl-wall-tabs" },
										React.createElement("span", { className: "tl-wall-label" }, t("lib.playback.speed")),
										[0.5, 1, 1.25, 1.5].map((speed) =>
											React.createElement(
												"button",
												{
													key: speed,
													type: "button",
													className: "tl-font-option",
													"data-active": playback.speed === speed ? "" : undefined,
													onClick: () => updatePlayback({ speed }),
												},
												speed + "x",
											),
										),
									),
									React.createElement(
										"div",
										{ className: "tl-wall-tabs" },
										React.createElement(
											"button",
											{
												type: "button",
												className: "tl-font-option",
												"data-active": playback.paused ? "" : undefined,
												onClick: () => updatePlayback({ paused: playback.paused === false }),
											},
											playback.paused ? t("lib.action.resume") : t("lib.playback.pause"),
										),
										React.createElement(
											"button",
											{
												type: "button",
												className: "tl-font-option",
												"data-active": playback.flip ? "" : undefined,
												onClick: () => updatePlayback({ flip: playback.flip === false }),
											},
											t("lib.playback.flip"),
										),
									),
									React.createElement(
										"div",
										{ className: "tl-wall-tabs" },
										React.createElement("span", { className: "tl-wall-label" }, t("lib.playback.filter")),
										React.createElement(
											"button",
											{
												type: "button",
												className: "tl-font-option",
												"data-active": playback.filter.on ? "" : undefined,
												onClick: () => updatePlayback({ filter: { ...playback.filter, on: playback.filter.on === false } }),
											},
											playback.filter.on ? t("lib.ctrl.on") : t("lib.ctrl.offByDefault"),
										),
									),
									React.createElement(
										"p",
										{ className: "tl-wall-hint" },
										playback.filter.on
											? t("lib.playback.filterOnHint")
											: t("lib.playback.filterOffHint"),
									),
									playback.filter.on
										? React.createElement(
												"div",
												null,
												[
													["brightness", t("lib.filter.brightness")],
													["contrast", t("lib.filter.contrast")],
													["saturate", t("lib.filter.saturate")],
												].map(([key, label]) =>
													React.createElement(
														"label",
														{ key, className: "tl-wall-slider" },
														React.createElement("span", null, label + " " + playback.filter[key] + "%"),
														React.createElement("input", {
															type: "range",
															min: 50,
															max: 150,
															step: 5,
															value: playback.filter[key],
															onChange: (event) =>
																updatePlayback({
																	filter: { ...playback.filter, [key]: Number(event.target.value) },
																}),
														}),
													),
												),
											)
										: null,
								)
							: null,
					),
					// ---- appearance: glass and the sidebar surface ----
					React.createElement(
						"details",
						{ className: "tl-wall-group", open: false, "data-tl-group": "advanced" },
						groupSummary("④", t("lib.group.appearance"), appearanceValue),
						// ---- glass opacity ----
						React.createElement(
							"label",
							{ className: "tl-wall-slider" },
							React.createElement("span", null, t("lib.appearance.glassLabel") + Math.round(glassLevel * 100) + "%"),
							React.createElement("input", {
								type: "range",
								min: 35,
								max: 150,
								step: 5,
								value: Math.round(glassLevel * 100),
								onChange: (event) => {
									const next = Number(event.target.value) / 100;
									setGlassLevel(next);
									if (glassController !== null) glassController.apply(next);
								},
							}),
						),
						// ---- two CSS overlay slots: no decoder, no timers ----
						React.createElement(
							"div",
							{ className: "tl-wall-tabs" },
							React.createElement("span", { className: "tl-wall-label" }, t("lib.layer.slots")),
							[0, 1].map((index) =>
								React.createElement(
									"button",
									{
										key: index,
										type: "button",
										className: "tl-font-option",
										"data-active": layerSlot === index ? "" : undefined,
										onClick: () => setLayerSlot(index),
									},
									(index === 0 ? t("lib.layer.slotA") : t("lib.layer.slotB")) + " · " + layerSlotLabel(layerSlots[index]),
								),
							),
							React.createElement(
								"button",
								{ type: "button", className: "tl-font-option", onClick: swapLayers },
								t("lib.layer.swap"),
							),
						),
						React.createElement(
							"div",
							{ className: "tl-wall-tabs" },
							React.createElement("span", { className: "tl-wall-label" }, t("lib.field.type")),
							[["none", t("lib.ctrl.off")], ["preset", t("lib.slot.preset")], ["image", t("lib.kind.image")]].map(([value, label]) =>
								React.createElement(
									"button",
									{
										key: value,
										type: "button",
										className: "tl-font-option",
										"data-active": selectedSlot.kind === value ? "" : undefined,
										onClick: () =>
											updateLayerSlot(layerSlot, {
												kind: value,
												preset: value === "preset" && selectedSlot.preset === "none" ? "vignette" : selectedSlot.preset,
											}),
									},
									label,
								),
							),
						),
						selectedSlot.kind === "preset"
							? React.createElement(
									"div",
									{ className: "tl-wall-tabs" },
									React.createElement("span", { className: "tl-wall-label" }, t("lib.layer.pattern")),
									Object.entries(LAYER_LABELS).map(([value, label]) =>
										React.createElement(
											"button",
											{
												key: value,
												type: "button",
												className: "tl-font-option",
												"data-active": selectedSlot.preset === value ? "" : undefined,
												onClick: () => updateLayerSlot(layerSlot, { kind: "preset", preset: value }),
											},
											label,
										),
									),
								)
							: null,
						selectedSlot.kind === "image"
							? React.createElement(
									"div",
									{ className: "tl-wall-url" },
									React.createElement(
										"select",
										{
											className: "tl-font-select",
											"aria-label": t("lib.layer.imageAria"),
											value: items.some((item) => item.kind === "image" && item.url === selectedSlot.url) ? selectedSlot.url : "",
											onChange: (event) => updateLayerSlot(layerSlot, { kind: "image", url: event.target.value }),
										},
										React.createElement("option", { value: "" }, t("lib.layer.selectImage")),
										items
											.filter((item) => item.kind === "image")
											.map((item) => React.createElement("option", { key: item.id, value: item.url }, item.id)),
									),
									React.createElement("input", {
										className: "tl-font-input",
										type: "url",
										placeholder: t("lib.layer.pasteImage"),
										value: selectedSlot.url,
										onChange: (event) => updateLayerSlot(layerSlot, { kind: "image", url: event.target.value }),
									}),
									React.createElement(
										"div",
										{ className: "tl-wall-tabs" },
										React.createElement("span", { className: "tl-wall-label" }, t("lib.layer.fit")),
										[["cover", t("lib.layer.fitCover")], ["contain", t("lib.layer.fitContain")], ["stretch", t("lib.layer.fitStretch")]].map(([value, label]) =>
											React.createElement(
												"button",
												{
													key: value,
													type: "button",
													className: "tl-font-option",
													"data-active": selectedSlot.fit === value ? "" : undefined,
													onClick: () => updateLayerSlot(layerSlot, { fit: value }),
												},
												label,
											),
										),
									),
								)
							: null,
						selectedSlot.kind === "none"
							? React.createElement("p", { className: "tl-wall-hint" }, t("lib.layer.offHint"))
							: React.createElement(
									"label",
									{ className: "tl-wall-slider" },
									React.createElement("span", null, t("lib.layer.opacity") + Math.round(selectedSlot.opacity * 100) + "%"),
									React.createElement("input", {
										type: "range",
										min: 0,
										max: 100,
										step: 1,
										value: Math.round(selectedSlot.opacity * 100),
										onChange: (event) => updateLayerSlot(layerSlot, { opacity: Number(event.target.value) / 100 }),
									}),
								),
						selectedSlot.kind === "none"
							? null
							: React.createElement(
									"div",
									{ className: "tl-wall-tabs" },
									React.createElement("span", { className: "tl-wall-label" }, t("lib.layer.blend")),
									Object.entries(LAYER_BLEND_LABELS).map(([value, label]) =>
										React.createElement(
											"button",
											{
												key: value,
												type: "button",
												className: "tl-font-option",
												"data-active": selectedSlot.blend === value ? "" : undefined,
												onClick: () => updateLayerSlot(layerSlot, { blend: value }),
											},
											label,
										),
									),
								),
						React.createElement(
							"p",
							{ className: "tl-wall-hint" },
							t("lib.layer.hint"),
						),
						// ---- the only zone question that matters: separate or continuous ----
						React.createElement(
							"div",
							{ className: "tl-wall-tabs" },
							React.createElement("span", { className: "tl-wall-label" }, t("lib.rail.title")),
							[["no", t("lib.rail.same")], ["yes", t("lib.rail.separate")]].map(([value, label]) =>
								React.createElement(
									"button",
									{
										key: value,
										type: "button",
										className: "tl-font-option",
										"data-active": zones.separate === (value === "yes") ? "" : undefined,
										onClick: () => {
											const next = { ...zones, separate: value === "yes" };
											setZones(next);
											if (zoneController !== null) zoneController.apply(next);
										},
									},
									label,
								),
							),
						),
						zones.separate === true
							? React.createElement(
									"select",
									{
										className: "tl-font-select",
										"aria-label": t("lib.rail.title"),
										value: zones.rail.url ?? "",
										onChange: (event) => {
											const url = event.target.value;
											const item = items.find((entry) => entry.url === url);
											const next = {
												...zones,
												rail: { ...zones.rail, url, kind: item === undefined ? "video" : item.kind },
											};
											setZones(next);
											if (zoneController !== null) zoneController.apply(next);
										},
									},
									React.createElement("option", { value: "" }, t("lib.rail.follow")),
									items.map((item) =>
										React.createElement("option", { key: item.id, value: item.url }, item.id),
									),
								)
							: null,
					),
					// ---- performance: render budget and battery saving ----
					React.createElement(
						"details",
						{ className: "tl-wall-group", open: false, "data-tl-group": "advanced" },
						groupSummary("⑤", t("lib.group.performance"), performanceValue),
						React.createElement(
							"div",
							{ className: "tl-wall-tabs" },
							React.createElement("span", { className: "tl-wall-label" }, t("lib.perf.lowPower")),
							[["auto", t("lib.ctrl.auto")], ["on", t("lib.ctrl.onShort")], ["off", t("lib.ctrl.offShort")]].map(([value, label]) =>
								React.createElement(
									"button",
									{
										key: value,
										type: "button",
										className: "tl-font-option",
										"data-active": powerMode === value ? "" : undefined,
										onClick: () => {
											setPowerMode(value);
											if (lowPowerController !== null) lowPowerController.set(value);
										},
									},
									label,
								),
							),
						),
						React.createElement(
							"div",
							{ className: "tl-wall-tabs" },
							React.createElement("span", { className: "tl-wall-label" }, t("lib.perf.renderFps")),
							[["auto", t("lib.ctrl.auto")], ["60", "60"], ["30", "30"], ["15", "15"]].map(([value, label]) =>
								React.createElement(
									"button",
									{
										key: value,
										type: "button",
										className: "tl-font-option",
										"data-active": fpsMode === value ? "" : undefined,
										onClick: () => {
											setFpsMode(value);
											renderTierController.set(value);
										},
									},
									value === "auto" ? label : label + "fps",
								),
							),
						),
						React.createElement(
							"p",
							{ className: "tl-wall-hint" },
							t("lib.perf.fpsHint"),
						),
						React.createElement(
							"p",
							{ className: "tl-wall-hint" },
							powerMode === "auto"
								? t("lib.perf.autoHint")
								: powerMode === "on"
									? t("lib.perf.onHint")
									: t("lib.perf.offHint"),
						),
						React.createElement(
							"div",
							{ className: "tl-wall-tabs" },
							React.createElement("span", { className: "tl-wall-label" }, t("lib.rotation.title")),
							React.createElement(
								"button",
								{
									type: "button",
									className: "tl-font-option",
									"data-active": rotation.on ? "" : undefined,
									onClick: () => updateRotation({ on: rotation.on === false }),
								},
								rotation.on ? t("lib.ctrl.on") : t("lib.ctrl.off"),
							),
						),
						React.createElement(
							"div",
							{ className: "tl-wall-tabs" },
							React.createElement("span", { className: "tl-wall-label" }, t("lib.rotation.order")),
							[
								["sequence", t("lib.rotation.order")],
								["random", t("lib.rotation.random")],
							].map(([value, label]) =>
								React.createElement(
									"button",
									{
										key: value,
										type: "button",
										className: "tl-font-option",
										"data-active": rotation.order === value ? "" : undefined,
										onClick: () => updateRotation({ order: value }),
									},
									label,
								),
							),
						),
						React.createElement(
							"div",
							{ className: "tl-wall-tabs" },
							React.createElement("span", { className: "tl-wall-label" }, t("lib.rotation.interval")),
							ROTATION_INTERVALS.map((seconds) =>
								React.createElement(
									"button",
									{
										key: seconds,
										type: "button",
										className: "tl-font-option",
										"data-active": rotation.interval === seconds ? "" : undefined,
										onClick: () => updateRotation({ interval: seconds }),
									},
									seconds < 60 ? seconds + "s" : Math.round(seconds / 60) + t("lib.unit.minutesShort"),
								),
							),
						),
						React.createElement(
							"div",
							{ className: "tl-wall-tabs" },
							React.createElement(
								"button",
								{
									type: "button",
									className: "tl-font-option",
									"data-active": rotation.favoritesOnly ? "" : undefined,
									onClick: () => updateRotation({ favoritesOnly: rotation.favoritesOnly === false }),
								},
								t("lib.rotation.favoritesOnly"),
							),
						),
						React.createElement(
							"p",
							{ className: "tl-wall-hint" },
							rotation.on
								? t("lib.rotation.everyPrefix") +
										(rotation.interval < 60 ? rotation.interval + t("lib.unit.secondsSuffix") : Math.round(rotation.interval / 60) + t("lib.unit.minutesSuffix")) +
										t("lib.rotation.onHint")
								: t("lib.rotation.offHint"),
						),
					),
					// ---- recipe: the whole panel configuration, exportable ----
					React.createElement(
						"details",
						{ className: "tl-wall-group", open: false, "data-tl-group": "advanced" },
						groupSummary("⑥", t("lib.group.recipe"), t("lib.group.recipeValue")),
						React.createElement(
							"div",
							{ className: "tl-wall-url" },
							React.createElement(
								"p",
								{ className: "tl-wall-hint" },
								t("lib.recipeHint"),
							),
							React.createElement(
								"div",
								{ className: "tl-source-grid" },
								CURATED_PRESETS.map((preset) =>
									React.createElement(
										"button",
										{
											key: preset.id,
											type: "button",
											className: "tl-source-card",
											title: t(preset.descKey),
											onClick: () => applyCuratedPreset(preset),
										},
										React.createElement("span", { className: "tl-source-name" }, t(preset.labelKey)),
										React.createElement("span", { className: "tl-source-note" }, t(preset.descKey)),
									),
								),
							),
							React.createElement("textarea", {
								className: "tl-wall-textarea",
								rows: 3,
								placeholder: t("lib.recipePlaceholder"),
								value: presetText,
								onChange: (event) => setPresetText(event.target.value),
							}),
							React.createElement(
								"div",
								{ className: "tl-wall-tabs" },
								React.createElement("button", { type: "button", className: "tl-font-reset", onClick: exportPreset }, t("lib.exportRecipe")),
								React.createElement("button", { type: "button", className: "tl-font-reset", onClick: importPreset }, t("lib.importRecipe")),
							),
							presetStatus === "" ? null : React.createElement("p", { className: "tl-wall-hint" }, presetStatus),
							// ---- v0.5.0 D3: copy a #tl=<recipe v2> share link ----
							React.createElement(
								"div",
								{ className: "tl-wall-url" },
								React.createElement("p", { className: "tl-wall-hint" }, t("lib.shareTitle") + " · v2"),
								React.createElement(
									"div",
									{ className: "tl-wall-tabs" },
									React.createElement(
										"button",
										{ type: "button", className: "tl-font-reset", onClick: copyShareLink },
										t("lib.shareCopy"),
									),
								),
								React.createElement("p", { className: "tl-wall-hint" }, t("lib.shareHint")),
								shareLink === ""
									? null
									: React.createElement(
											"div",
											null,
											React.createElement("p", { className: "tl-wall-v05-note" }, t("lib.shareManual")),
											React.createElement("textarea", {
												className: "tl-wall-textarea",
												rows: 2,
												readOnly: true,
												"aria-label": t("lib.shareLinkAria"),
												value: shareLink,
												onFocus: (event) => event.currentTarget.select(),
											}),
										),
								shareNote === "" ? null : React.createElement("p", { className: "tl-wall-hint" }, shareNote),
							),
							// ---- v0.5.0 D2: export / import the host bundle ----
							bundleSupported || importSupported
								? React.createElement(
										"div",
										{ className: "tl-wall-url" },
										React.createElement("p", { className: "tl-wall-hint" }, t("lib.bundleTitle")),
										React.createElement(
											"div",
											{ className: "tl-wall-bundle-row" },
											bundleSupported
												? React.createElement(
														"button",
														{
															type: "button",
															className: "tl-font-reset",
															disabled: bundleBusy,
															onClick: exportBundle,
														},
														bundleBusy ? t("lib.bundleExportBusy") : t("lib.bundleExport"),
													)
												: null,
											importSupported
												? React.createElement(
														"label",
														{ className: "tl-wall-upload", "data-busy": importBusy ? "" : undefined, title: t("lib.bundleImport") },
														importBusy ? t("lib.bundleImporting") : t("lib.bundleImport"),
														React.createElement("input", {
															type: "file",
															accept: ".tgz,.tar.gz,application/gzip,application/x-gzip",
															disabled: importBusy,
															onChange: importBundle,
															style: { display: "none" },
														}),
													)
												: null,
										),
										React.createElement("p", { className: "tl-wall-hint" }, t("lib.bundleHint")),
										importBusy
											? React.createElement("progress", {
													className: "tl-wall-progress",
													max: 100,
													value: importPct,
													"aria-label": t("lib.bundleImporting"),
												})
											: null,
										importBusy
											? React.createElement("p", { className: "tl-wall-v05-note" }, t("lib.bundleProgress", { pct: importPct }))
											: null,
										bundleNote === "" ? null : React.createElement("p", { className: "tl-wall-hint" }, bundleNote),
										importNote === "" ? null : React.createElement("p", { className: "tl-wall-hint" }, importNote),
									)
								: engine === null
									// State probe still in flight: show nothing rather than flashing
									// "host unavailable" for the first render.
									? null
									: React.createElement("p", { className: "tl-wall-hint" }, t("lib.bundleNoHost")),
							// Reset lives next to the recipe: both own the same zones and glass.
							React.createElement(
								"button",
								{
									type: "button",
									className: "tl-font-reset",
									onClick: () => {
										const next = {
											...zones,
											separate: false,
											main: { ...ZONE_DEFAULTS.main },
											rail: { ...ZONE_DEFAULTS.rail },
										};
										setZones(next);
										if (zoneController !== null) zoneController.apply(next);
										setGlassLevel(1);
										if (glassController !== null) glassController.apply(1);
									},
								},
								t("lib.resetWallpaper"),
							),
						),
					),
					// ---- v0.5.0 extension sections: every workstream registers its own
					// <details class="tl-wall-group"> component; the panel only mounts them
					// in registration order, after ⑥, inside this same scroll container.
					// ①-⑥ above stay untouched so the skinlab inventory/layout checks hold.
					...tl5PanelSections().map((section) =>
						React.createElement(section.Component, { key: "tl5-" + section.id }),
					),
					// v0.5.3: transient picker feedback ("已切换：…"/inline errors live in the
					// compact status row). Rendered last so it floats above the grid.
					toast === null || view !== "pick"
						? null
						: React.createElement("div", { className: "tl-wall-toast", "data-tl-toast": "", role: "status" }, toast.text),
				);
			};

			const scrim = document.createElement("div");
			scrim.setAttribute("data-tl-wall-scrim", "");
			const host = document.createElement("div");
			host.className = "tl-wall-sidebar";
			host.setAttribute("data-tl-wall", "");
			// The trigger lives on the viewport edge, NOT in the composer: the composer is
			// for talking to the model, and a wallpaper picker there crowded the input row.
			const handle = document.createElement("button");
			handle.type = "button";
			handle.setAttribute("data-tl-wall-handle", "");
			handle.setAttribute("aria-keyshortcuts", "Alt+W");
			// The handle lives outside the React panel; keep it on the same dictionary and
			// refresh it when the language changes (subscribeTl5I18n is disposed below).
			// v0.5.3 13-i18n can also auto-rewrite these via data-tl-i18n-*; both paths are
			// kept so older/newer i18n fragments behave the same.
			handle.setAttribute("data-tl-i18n-key", "lib.handle.text");
			handle.setAttribute("data-tl-i18n-title-key", "lib.handle.title");
			const refreshHandleCopy = () => {
				handle.title = TL_T("lib.handle.title");
				handle.textContent = TL_T("lib.handle.text");
			};
			refreshHandleCopy();
			const unsubscribeHandleI18n = subscribeTl5I18n(refreshHandleCopy);
			const body = document.body;
			if (body !== null) {
				body.appendChild(scrim);
				body.appendChild(host);
				body.appendChild(handle);
			}

			let root = null;
			let open = false;
			let tintTimer = 0;
			// v0.5.0 D3: a validated #tl= recipe waiting for the user's explicit decision.
			// Read once at install (page load with a shared link) and re-read on each open
			// by the panel; a decision clears both this and the hash.
			const hashAtInstall = String(globalThis.location?.hash ?? "");
			let pendingShare = hashAtInstall.startsWith("#tl=") ? readTl5ShareHash() : null;
			// A link that was present but rejected (invalid/oversized) is surfaced as a
			// single note when the panel opens: the hash is already cleared, no settings
			// were touched.
			const shareRejectedAtLoad = hashAtInstall.startsWith("#tl=") && pendingShare === null;

			// ---- background tinted by the wallpaper's own hue ----
			const swatch = document.createElement("canvas");
			swatch.width = 32;
			swatch.height = 18;
			let swatchCtx = null;
			try {
				swatchCtx = swatch.getContext("2d", { willReadFrequently: true });
			} catch {
				swatchCtx = null;
			}
			const tintPanel = () => {
				if (swatchCtx === null) return;
				const still = wallpaperController === null ? null : wallpaperController.image;
				const video = document.querySelector("[data-tl-scene] > video");
				// The shader snapshot is a 2D canvas copied in the render task, so it stays
				// readable even though the WebGL buffer is not preserved.
				const shader = wallpaperController === null ? null : wallpaperController.shaderSwatch;
				const target =
					shader !== null && shader !== undefined
						? shader
						: still !== null && still !== undefined
							? still
							: video;
				if (target === null || target === undefined) return;
				if (target === video && video.readyState < 2) return;
				let data = null;
				try {
					swatchCtx.drawImage(target, 0, 0, swatch.width, swatch.height);
					data = swatchCtx.getImageData(0, 0, swatch.width, swatch.height).data;
				} catch {
					return;
				}
				let sin = 0;
				let cos = 0;
				let satSum = 0;
				let lightSum = 0;
				let weight = 0;
				for (let i = 0; i + 3 < data.length; i += 4) {
					const r = data[i] / 255;
					const g = data[i + 1] / 255;
					const b = data[i + 2] / 255;
					const max = Math.max(r, g, b);
					const min = Math.min(r, g, b);
					const delta = max - min;
					const light = (max + min) / 2;
					if (delta < 0.05 || light < 0.08 || light > 0.95) continue;
					const sat = light > 0.5 ? delta / (2 - max - min) : delta / (max + min);
					let hue;
					if (max === r) hue = ((g - b) / delta + (g < b ? 6 : 0)) * 60;
					else if (max === g) hue = ((b - r) / delta + 2) * 60;
					else hue = ((r - g) / delta + 4) * 60;
					const rad = (hue * Math.PI) / 180;
					const w = sat * (1 - Math.abs(light - 0.55) * 1.2);
					sin += Math.sin(rad) * w;
					cos += Math.cos(rad) * w;
					satSum += sat * w;
					lightSum += light * w;
					weight += w;
				}
				if (weight <= 0.001) return;
				const hue = Math.round((((Math.atan2(sin, cos) * 180) / Math.PI) + 360) % 360);
				const sat = Math.min(0.70, Math.max(0.32, (satSum / weight) * 1.3));
				const light = lightSum / weight;
				const dark = document.body !== null && document.body.hasAttribute(DARK_ATTR);
				// Deliberately saturated: at 12-20% saturation on a 94%-light surface the
				// panel looked untinted, which is the bug this replaced.
				const fillLight = dark ? 0.15 : 0.90;
				const fillSat = Math.round(Math.min(0.52, Math.max(0.18, sat)) * 100);
				const fill = "hsl(" + hue + " " + fillSat + "% " + Math.round(fillLight * 100) + "% / max(0.96, calc(0.94 * var(--tl-glass-m, 1))))";
				host.style.setProperty("--tl-panel-fill", fill);
				// The edge handle carries the same tint, so the wallpaper colour is visible
				// even with the panel closed.
				handle.style.setProperty("--tl-panel-fill", fill);
				host.style.setProperty(
					"--tl-accent",
					"hsl(" + hue + " " + Math.round(sat * 100) + "% " + Math.round((dark ? 0.66 : 0.44) * 100) + "%)",
				);
			};
			const startTint = () => {
				if (tintTimer !== 0) return;
				tintPanel();
				// One delayed retry covers a video that has not decoded a frame yet at open
				// time. No polling: drawImage + getImageData from a 4K playing video every
				// few seconds caused a visible periodic hitch, which was reported as the
				// panel "shaking on its own".
				tintTimer = globalThis.setTimeout(() => {
					tintTimer = 0;
					tintPanel();
				}, 1500);
			};
			const stopTint = () => {
				if (tintTimer === 0) return;
				globalThis.clearTimeout(tintTimer);
				tintTimer = 0;
			};

			// ---- drag between edges, spring settle with a capped elastic overshoot ----
			const MAX_OVERSHOOT = 26;
			const RUBBER = 0.35;
			const MAX_VELOCITY = 1500;
			let offset = 0;
			let raf = 0;
			let drag = null;
			const panelWidth = () => host.offsetWidth || 296;
			const maxOffset = () => Math.max(0, globalThis.innerWidth - panelWidth());
			const applyX = (x) => {
				offset = x;
				host.style.transform = "translateX(" + x + "px)";
				// The border and shadow mirror whichever edge the panel settled on.
				if (x > 4) host.setAttribute("data-tl-side", "right");
				else host.removeAttribute("data-tl-side");
			};			/**
			 * Springs to one edge. Release velocity is clamped and the overshoot is
			 * hard-capped, so a violent flick cannot throw the panel across the screen.
			 */
			const settle = (target, velocity) => {
				if (raf !== 0) globalThis.cancelAnimationFrame(raf);
				const stiffness = 210;
				const damping = 26;
				const dt = 1 / 60;
				let pos = offset;
				let vel = Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, velocity)) / 60;
				const step = () => {
					vel += ((target - pos) * stiffness - vel * damping) * dt;
					pos += vel * dt;
					const over = pos - target;
					if (Math.abs(over) > MAX_OVERSHOOT) pos = target + Math.sign(over) * MAX_OVERSHOOT;
					if (Math.abs(target - pos) < 0.4 && Math.abs(vel) < 0.4) {
						applyX(target);
						raf = 0;
						return;
					}
					applyX(pos);
					raf = globalThis.requestAnimationFrame(step);
				};
				raf = globalThis.requestAnimationFrame(step);
			};
			// ---- moving light: follows the pointer, brightens with drag speed ----
			let glowNode = null;
			const updateGlow = (event, intensity) => {
				if (glowNode === null) glowNode = host.querySelector("[data-tl-wall-glow]");
				if (glowNode === null) return;
				const rect = host.getBoundingClientRect();
				if (rect.width === 0 || rect.height === 0) return;
				const x = Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100));
				const y = Math.max(0, Math.min(100, ((event.clientY - rect.top) / rect.height) * 100));
				glowNode.style.setProperty("--tl-glow-x", x.toFixed(1) + "%");
				glowNode.style.setProperty("--tl-glow-y", y.toFixed(1) + "%");
				glowNode.style.setProperty("--tl-glow-a", String(Math.max(0, Math.min(1, intensity))));
			};
			const onGlowLeave = () => {
				if (glowNode !== null) glowNode.style.setProperty("--tl-glow-a", "0");
			};

			/**
			 * Swallows exactly one upcoming click. Without it, finishing a drag that
			 * started on a wallpaper card would also "click" that card and switch the
			 * wallpaper by accident.
			 */
			const swallowNextClick = () => {
				const stop = (clickEvent) => {
					clickEvent.stopPropagation();
					clickEvent.preventDefault();
				};
				document.addEventListener("click", stop, true);
				// One cleanup path only: the timer always removes it, whether or not a
				// click arrived. Removing it in two places tripped the listener audit.
				globalThis.setTimeout(() => document.removeEventListener("click", stop, true), 80);
			};

			// Document-level capture: the panel is almost entirely made of card buttons,
			// and a host-scoped listener lost the gesture whenever a child consumed it.
			const onDragStart = (event) => {
				const target = event.target;
				if (!(target instanceof Element)) return;
				if (target.closest("[data-tl-wall]") === null) return;
				// Only the sticky title/guide block is a drag handle. The rest of the
				// panel is a normal scrolling surface; every interactive child (including
				// the dynamic-playback button) keeps its own click.
				if (target.closest("[data-tl-wall-drag]") === null) return;
				if (target.closest("button, a, input, textarea, select, summary") !== null) return;
				if (raf !== 0) {
					globalThis.cancelAnimationFrame(raf);
					raf = 0;
				}
				drag = {
					id: event.pointerId,
					startX: event.clientX,
					startOffset: offset,
					lastX: event.clientX,
					lastT: performance.now(),
					velocity: 0,
					moved: 0,
				};
				host.setAttribute("data-tl-dragging", "");
				event.preventDefault();
			};
			const onDragMove = (event) => {
				if (drag === null) {
					const target = event.target;
					if (target instanceof Element && target.closest("[data-tl-wall]") !== null) updateGlow(event, 0.34);
					return;
				}
				if (event.pointerId !== drag.id) return;
				// A pointerup delivered outside the window never reaches onDragEnd. Without
				// this check the panel keeps following the mouse with no button pressed,
				// which reads as the panel moving on its own.
				if ((event.buttons & 1) === 0) {
					onDragEnd(event);
					return;
				}
				const now = performance.now();
				const elapsed = Math.max(1, now - drag.lastT);
				drag.velocity = ((event.clientX - drag.lastX) / elapsed) * 1000;
				drag.lastX = event.clientX;
				drag.lastT = now;
				drag.moved = Math.max(drag.moved, Math.abs(event.clientX - drag.startX));
				updateGlow(event, Math.min(1, 0.25 + Math.abs(drag.velocity) / 1200));
				const raw = drag.startOffset + (event.clientX - drag.startX);
				const max = maxOffset();
				let x = raw;
				if (raw < 0) x = raw * RUBBER;
				else if (raw > max) x = max + (raw - max) * RUBBER;
				applyX(x);
			};
			const onDragEnd = (event) => {
				if (drag === null) return;
				const moved = drag.moved;
				const velocity = drag.velocity;
				drag = null;
				host.removeAttribute("data-tl-dragging");
				if (moved > 5) swallowNextClick();
				if (moved <= 4) {
					// A plain click on the title/guide must not spring the panel to an edge;
					// that made a stationary panel move "by itself" after any click.
					if (event !== undefined) event.preventDefault?.();
					return;
				}
				const max = maxOffset();
				// Only "near an edge" snaps; anywhere in the middle stays where it was
				// dropped. Always snapping to the nearest edge made every small drag spring
				// straight back, which reads as "the panel cannot be moved".
				const SNAP = 56;
				const clamped = Math.min(Math.max(offset, 0), max);
				let target = clamped;
				if (clamped <= SNAP) target = 0;
				else if (max - clamped <= SNAP) target = max;
				settle(target, velocity);
				if (event !== undefined) event.preventDefault?.();
			};
			document.addEventListener("pointerdown", onDragStart, true);
			document.addEventListener("pointermove", onDragMove, true);
			document.addEventListener("pointerup", onDragEnd, true);
			document.addEventListener("pointercancel", onDragEnd, true);
			host.addEventListener("pointerleave", onGlowLeave);

			// Each open remounts the panel component (via the React key), so the panel
			// always starts on the full library. The React state (source tab, filters, WE
			// editor) used to survive close/open for the whole page session: after the user
			// clicked "WE 目录" once, every later open came back to an empty WE filter with
			// "壁纸清单 0 张" and the directory editor expanded — the reported "wallpaper
			// panel is broken" state.
			let openSeq = 0;
			const renderPanel = () => {
				if (root === null) {
					try {
						root = require("react-dom/client").createRoot(host);
					} catch {
						root = null;
						return;
					}
				}
				openSeq += 1;
				try {
					root.render(
						React.createElement(WallpaperPanel, {
							key: "wall-panel-" + openSeq,
							onClose: () => setOpen(false),
							sharedRecipe: pendingShare,
							shareRejected: shareRejectedAtLoad,
						}),
					);
				} catch {
					// a failing render must not keep the panel in a half-open state
				}
			};
			const setOpen = (next) => {
				open = next;
				if (open) {
					host.setAttribute("data-tl-open", "");
					scrim.setAttribute("data-tl-open", "");
					handle.setAttribute("data-tl-hidden", "");
					startTint();
					audioController.clearReason();
					// Re-clamp against the current viewport before showing.
					applyX(Math.min(offset, maxOffset()));
					renderPanel();
				} else {
					host.removeAttribute("data-tl-open");
					scrim.removeAttribute("data-tl-open");
					handle.removeAttribute("data-tl-hidden");
					stopTint();
					audioController.stop(TL_T("lib.audio.stoppedOnClose"));
				}
			};
			const onScrim = () => setOpen(false);
			const onHandle = () => setOpen(!open);
			// The edge tab can be covered by the DSH sidebar / Windows taskbar.
			// A keyboard route must exist independently of that tab's position.
			const onKey = (event) => {
				if (event.altKey && event.ctrlKey === false && event.metaKey === false && (event.key === "w" || event.key === "W")) {
					event.preventDefault();
					setOpen(!open);
					return;
				}
				// Esc is the standard way out of a panel. Only claimed while the panel is open,
				// so dialogs and menus elsewhere keep their own Esc behaviour.
				if (event.key === "Escape" && open) {
					event.preventDefault();
					event.stopPropagation();
					setOpen(false);
				}
			};
			// A cached offset goes stale when the viewport shrinks: a panel pinned to the
			// right edge would sit outside the window until the next drag.
			const onResize = () => {
				if (!open) return;
				const max = maxOffset();
				if (offset > max) applyX(max);
			};
			scrim.addEventListener("click", onScrim);
			handle.addEventListener("click", onHandle);
			window.addEventListener("keydown", onKey, true);
			window.addEventListener("resize", onResize);
			applyX(0);

			return () => {
				scrim.removeEventListener("click", onScrim);
				handle.removeEventListener("click", onHandle);
				window.removeEventListener("keydown", onKey, true);
				window.removeEventListener("resize", onResize);
				document.removeEventListener("pointerdown", onDragStart, true);
				document.removeEventListener("pointermove", onDragMove, true);
				document.removeEventListener("pointerup", onDragEnd, true);
				document.removeEventListener("pointercancel", onDragEnd, true);
				host.removeEventListener("pointerleave", onGlowLeave);
				if (typeof unsubscribeHandleI18n === "function") unsubscribeHandleI18n();
				stopTint();
				if (raf !== 0) globalThis.cancelAnimationFrame(raf);
				try {
					if (root !== null) root.unmount();
				} catch {
					// an already-detached root is fine
				}
				host.remove();
				scrim.remove();
				handle.remove();
			};
		}
		//#endregion

