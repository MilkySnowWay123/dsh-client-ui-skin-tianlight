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
				"lib.bundleHint": "包内含设置、配方和你上传的壁纸（assets/uploads，含 svg/avif，导入端同样支持；svg 必须是静态图片，不能含脚本/外链）。随插件发布的内置演示素材不重复打包（包更小），导入时也会跳过旧包里的内置素材；导出由宿主直接流式打包，不经过浏览器内存。",
				"lib.bundleExport": "导出包",
				"lib.bundleExportBusy": "准备下载…",
				"lib.bundleExportStarted": "已开始下载。若浏览器提示 404，说明宿主半还是旧版本，重启 DSH 后重试。",
				"lib.bundleExportFail": "导出失败：{reason}",
				"lib.bundleImport": "导入包",
				"lib.bundleImporting": "导入中…",
				"lib.bundleImportConfirmNote": "导入会合并包里的设置、配方与壁纸，可能覆盖当前配置；再次点击「确认导入」选择文件。",
				"lib.bundleImportConfirmAction": "确认导入…",
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
				"lib.bundle.note": "自带壁纸是紫调人物循环（bg-4k.mp4）；想要「新海诚式天空」，在「URL 地址」粘贴天空视频，或把天空视频放进 assets/ 再刷新。",
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
				"lib.bundleHint": "The bundle holds settings, recipes and the wallpapers YOU uploaded (assets/uploads, including svg/avif — the importer accepts them too; SVG must be a passive image with no scripts or external references). Demo media shipped with the plugin is not re-packaged (smaller bundles) and is skipped when importing older bundles; the host streams the export without buffering it in the page.",
				"lib.bundleExport": "Export bundle",
				"lib.bundleExportBusy": "Preparing download…",
				"lib.bundleExportStarted": "Download started. A 404 means the host half is still the old build — restart DSH and retry.",
				"lib.bundleExportFail": "Export failed: {reason}",
				"lib.bundleImport": "Import bundle",
				"lib.bundleImporting": "Importing…",
				"lib.bundleImportConfirmNote": "Importing merges the bundle's settings, recipes and wallpapers and may overwrite the current config; click “Confirm import” again to pick the file.",
				"lib.bundleImportConfirmAction": "Confirm import…",
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
				"lib.bundle.note": "The bundled wallpaper is the purple character loop (bg-4k.mp4); for a Makoto Shinkai daylight sky, paste a sky video under URL or drop one into assets/ and reload.",
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

		/**
		 * v0.5.0 面板「最近使用」顺序：只记录用户主动选中的壁纸，供排序使用。
		 * S4: the list itself is shared with the WE library (11-platform tl5ReadRecent /
		 * tl5RememberRecent) so two writers cannot overwrite each other's semantics.
		 */
		/** v0.5.2: one silent list retry before the panel reports a failure (~1.2s). */
		const PANEL_LIST_RETRY_MS = 1200;
		function readPanelRecent() {
			return tl5ReadRecent();
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
		//#endregion
