		//#region role hub
		/**
		 * v1.3.0「角色中枢」：角色能力的唯一控制面，入口只有桌宠本身。
		 *
		 * 入口（v1.3.0 起不再有侧栏按钮/设置页）：
		 *   - 右键桌宠（src/40-companion.js 的 contextmenu）
		 *   - 桌宠菜单第 7 项「角色中枢」
		 *   - globalThis.tianlightRoleHub = { version:1, open(), close(), status() }
		 *
		 * 浮层是**普通 DOM**（打开时创建、关闭时整体移除）：生活状态、生活节奏设置、
		 * 专注/静音、液态玻璃、可替换形象（列表 + 本机上传）、AI 对话与权限/暂停、
		 * 实验 Agent、审计。所有能力都通过既有运行时 API 调用，这里不持有第二个事实源：
		 *   - globalThis.tianlightLife   生活节奏/专注/静音/形象（src/42-life.js）
		 *   - petBrainInternal           AI 大脑/权限/审计（src/44-pet-brain.js 的同闭包桥；
		 *                                R4A 起不再读可被同页脚本替换的 globalThis.tianlightPet）
		 *   - globalThis.tianlightPetMind 自主思考引擎（src/44-pet-brain.js，v1.6.8）
		 *   - petAgentInternal           受控 DSH Agent 通道（src/48-pet-agent.js 的同闭包桥）；
		 *                                globalThis.tianlightPetAgent 只剩只读 status/audit
		 *   - glassDepthController       液态玻璃三档（src/57-glass.js）
		 *   - POST ASSET_BASE/_upload    本机图片/视频上传（宿主已有路由，≤32 MiB）
		 *
		 * 任依赖缺失 → 对应卡片显示「不可用」，其它卡片照常。不写 CSS：Lead 的样式表
		 * 按 data-tl-hub-* 属性与 .tl-hub-* 类名统一落样式。
		 */
		registerTl5Strings({
			zh: {
				"hub.title": "角色中枢",
				"hub.close": "关闭",
				"hub.draft.restored": "已恢复上次未保存的聊天 / 作息草稿。",
				"hub.settingsHint": "生活节奏设置已并入本页，不再单独列出。",
				"hub.loading": "载入中…",
				"hub.unavailable": "不可用",
				"hub.status.title": "生活状态",
				"hub.status.period": "时段",
				"hub.status.awake": "状态",
				"hub.status.quiet": "静默",
				"hub.status.budget": "今日主动",
				"hub.status.streak": "连续天数",
				"hub.status.ai": "AI 状态",
				"hub.status.unavailable": "生活引擎未就绪，状态暂不可用。",
				"hub.life.title": "生活节奏设置",
				"hub.life.quiet": "静默时段",
				"hub.life.quietOn": "启用静默",
				"hub.life.quietStart": "静默开始",
				"hub.life.quietEnd": "静默结束",
				"hub.life.budget": "每日主动开口上限",
				"hub.life.wake": "起床",
				"hub.life.sleep": "睡觉",
				"hub.life.virtual": "虚拟时钟偏移（分钟）",
				"hub.life.apply": "保存生活节奏",
				"hub.life.saved": "生活节奏已保存。",
				"hub.life.invalid": "部分输入无效，已忽略；有效项已保存。",
				"hub.life.memory": "记忆：互动 {interactions} · 摸摸 {pats} · 喂食 {feeds} · 逗猫棒 {plays} · 连续 {streak} 天",
				"hub.life.lastSeen": "上次见面：{time}",
				"hub.life.unavailable": "生活引擎未就绪，生活设置不可用。",
				"hub.period.dawn": "黎明",
				"hub.period.morning": "上午",
				"hub.period.noon": "正午",
				"hub.period.afternoon": "午后",
				"hub.period.dusk": "黄昏",
				"hub.period.evening": "晚上",
				"hub.period.night": "深夜",
				"hub.period.unknown": "未知时段",
				"hub.awake.yes": "清醒",
				"hub.awake.no": "睡眠",
				"hub.quiet.on": "静默中",
				"hub.quiet.off": "可开口",
				"hub.unit.days": "{n} 天",
				"hub.focus.start": "开始专注 25 分钟",
				"hub.focus.stop": "结束专注",
				"hub.mute.start": "静音 1 小时",
				"hub.mute.active": "静音中",
				"hub.mute.done": "已静音 1 小时。",
				"hub.glass.title": "液态玻璃",
				"hub.glass.off": "关闭",
				"hub.glass.frosted": "磨砂",
				"hub.glass.soft": "柔和",
				"hub.glass.real": "真实",
				"hub.glass.effective": "当前档：{depth}",
				"hub.glass.lowered": "当前档：{depth}（实际 {effective}，已自动降级）",
				"hub.glass.unavailable": "玻璃控制器未就绪。",
				"hub.glass.done": "玻璃质感：{depth}",
				"hub.glass.previewHint": "深度默认关闭；选择「柔和 / 真实 / 磨砂」后实时渲染默认开启，逐帧采样壁纸、更耗电；可手动关闭改为省电的静态玻璃。低电量与 15fps 会自动移除全部模糊并加深底色。",
				"hub.glass.preview": "当前：{depth} · 实际：{effective}",
				"hub.glass.previewLive": "当前：{depth} · 实时采样 · 实际：{effective}",
				"hub.glass.live": "实时渲染",
				"hub.glass.liveOffHint": "关闭：静态玻璃，省电",
				"hub.glass.liveOnHint": "已开启（推荐）：逐帧采样背后的壁纸，更耗电",
				"hub.glass.liveDegraded": "已开启：省电/15fps 下暂不采样",
				"hub.glass.liveNeedsDepth": "先选择一个玻璃档位",
				"hub.splash.title": "开机动画",
				"hub.splash.on": "已开启",
				"hub.splash.off": "已关闭",
				"hub.splash.aria": "开机动画设置",
				"hub.splash.style": "播放方式",
				"hub.splash.longOnce": "长片（每天第一次）",
				"hub.splash.long": "长片（每次打开）",
				"hub.splash.simple": "简洁",
				"hub.splash.offOption": "关闭",
				"hub.splash.skip": "点击这里跳过",
				"hub.splash.sound": "开机音效",
				"hub.splash.soundOff": "关（默认）",
				"hub.splash.soundOn": "开",
				"hub.splash.motion": "减少动态效果时（无障碍覆盖）",
				"hub.splash.motionOff": "遵守系统（默认）",
				"hub.splash.motionOn": "仍播放",
				"hub.splash.motionHint": "默认遵守系统的“减少动态效果”。打开“仍播放”会覆盖系统设置；低电量时仍会跳过。",
				"hub.splash.hint": "默认每天第一次播长片，之后播简洁版；Ctrl+F5 刷新不重播。系统减少动态效果或省电时自动跳过；长片可随时点击或按 Esc 跳过。",
				"hub.appearance.reset": "恢复默认外观",
				"hub.appearance.hint": "恢复作者的默认外观（壁纸/玻璃档位/排版/特效/桌宠形象）；不会动聊天、权限、天气与你上传的壁纸文件。",
				"hub.appearance.confirm": "再次点击确认恢复默认外观：现有外观设置会被覆盖（聊天/权限/天气不受影响）。",
				"hub.appearance.done": "已恢复默认外观（{n} 项），正在刷新…",
				"hub.media.title": "桌宠形象",
				"hub.media.select": "选择形象",
				"hub.media.apply": "应用形象",
				"hub.media.default": "默认形象（cat.png）",
				"hub.media.applied": "形象已切换：{name}",
				"hub.media.empty": "本地壁纸库暂无可用素材，可先上传。",
				"hub.media.rejected": "已忽略超过 32 MiB 的素材：{names}",
				"hub.media.unavailable": "生活引擎未就绪，暂时不能换形象。",
				"hub.media.failed": "切换失败：{reason}",
				"hub.media.defaultRestored": "已恢复默认形象。",
				"hub.media.restoreDefault": "恢复默认形象",
				"hub.media.reason.unknown": "素材已不在库中",
				"hub.media.reason.catalog": "素材列表暂不可用",
				"hub.media.reason.internal": "内部错误",
				"hub.media.reason.default": "未知原因",
				"hub.media.listHint": "所有形象都列在下面，文件名一直可见；点任意一行即可切换。",
				"hub.media.pack.title": "动作包（当前形象）",
				"hub.media.pack.hint": "为当前选中的形象修改动作名与回复；保存后桌宠菜单立即生效，点「恢复默认」可去掉自定义。",
				"hub.media.pack.labelPet": "摸摸动作名",
				"hub.media.pack.labelFeed": "喂食动作名",
				"hub.media.pack.labelPlay": "逗猫棒动作名",
				"hub.media.pack.linesPlaceholder": "一行一条回复",
				"hub.media.pack.save": "保存动作包",
				"hub.media.pack.saved": "动作包已保存，桌宠菜单已更新。",
				"hub.media.pack.reset": "恢复默认动作包",
				"hub.media.pack.resetConfirm": "再次点击确认重置",
				"hub.media.pack.resetConfirmNote": "重置会删除当前形象的自定义动作包，且无法撤销；再次点击按钮确认。",
				"hub.media.pack.resetDone": "已恢复默认动作包。",
				"hub.media.pack.invalid": "动作包不合法：请检查动作名或回复内容后重试。",
				"hub.media.pack.unavailable": "桌宠动作接口未就绪，动作包暂不可编辑。",
				"hub.upload.button": "上传图片 / 视频",
				"hub.upload.hint": "从本机选择图片或视频（≤32 MiB），上传后立即生效。",
				"hub.upload.uploading": "上传中…",
				"hub.upload.done": "已上传并切换：{name}",
				"hub.upload.tooBig": "文件超过 32 MiB（{size} MiB），未上传。",
				"hub.upload.type": "不支持的文件格式：请选择图片或视频。",
				"hub.upload.empty": "空文件不能上传。",
				"hub.upload.rejected": "上传被拒绝（{status}）：{reason}",
				"hub.upload.failed": "上传失败：{reason}",
				"hub.upload.noFetch": "当前环境不支持上传。",
				"hub.ai.title": "AI 对话",
				"hub.ai.hint": "桌宠只做陪伴与提醒：不会主动联网、读写文件或代替你操作；只有你在本页明确授权 LLM 后，对话才会用你配置的 DSH 模型（会消耗你的模型额度）。",
				"hub.ai.pause": "暂停 AI",
				"hub.ai.resume": "恢复 AI",
				"hub.ai.pausedNote": "已暂停：桌宠暂不回复。",
				"hub.ai.resumedNote": "已恢复。",
				"hub.ai.ready": "待命",
				"hub.ai.unavailable": "AI 大脑未接入，对话不可用。",
				"hub.ai.adapter": "适配器：{adapter}",
				"hub.ai.adapterNone": "未注册（本地大脑）",
				"hub.ai.adapterDsh": "DSH 模型（{provider} / {model}）",
				"hub.ai.llm.grant": "授权 LLM",
				"hub.ai.llm.revoke": "撤销 LLM",
				"hub.ai.llm.confirm": "允许桌宠调用你在 DSH 里配置的模型？会消耗你的模型额度；只发送当前这句话和桌宠的本地上下文，仍有每日、速率与超时上限。",
				"hub.ai.llm.confirmShort": "再次点击确认",
				"hub.ai.llm.granted": "已授权 LLM。",
				"hub.ai.llm.revoked": "已撤销 LLM。",
				"hub.ai.llm.providerLabel": "桌宠使用的模型提供方",
				"hub.ai.llm.followDefault": "跟随 DSH 默认模型",
				"hub.ai.llm.unknown": "未知",
				"hub.ai.llm.providerSaved": "已更新模型提供方。",
				"hub.ai.llm.providerFailed": "无法更新模型提供方。",
				"hub.ai.llm.providerUnavailable": "无法读取 DSH 模型提供方列表，暂时只能跟随默认。",
				"hub.ai.llm.modelLabel": "桌宠使用的模型",
				"hub.ai.llm.followModel": "跟随 DSH 默认模型（{model}）",
				"hub.ai.llm.followProviderModel": "该提供方的首个模型（由宿主自动选择）",
				"hub.ai.llm.firstModel": "首个模型（宿主自动选择）",
				"hub.ai.llm.modelSaved": "已更新模型。",
				"hub.ai.llm.modelFailed": "无法更新模型。",
				"hub.ai.llm.modelUnavailable": "读取不到该提供方的模型列表，暂时由宿主自动选择。",
				"hub.ai.llm.modelEmpty": "该提供方暂时没有可用模型。",
				"hub.ai.llm.savedUnavailable": "已保存但当前不可用：{model}",
				"hub.ai.llm.providerHint": "Grok / Claude 等国际模型：先在 DSH 设置 → 模型里添加提供商——Claude 选内置 anthropic 并填入 API 密钥；Grok 选「自定义模型 API」，地址 https://api.x.ai/v1、协议 OpenAI Chat Completions、填入 xAI 密钥。回到这里就能在提供方和模型下拉框里选到它。",
				"hub.ai.host.unconfigured-model": "未配置模型：请先在 DSH 设置里配置模型。",
				"hub.ai.host.no-llm-service": "宿主未提供 LLM 服务。",
				"hub.ai.host.no-providers": "宿主没有可用的模型提供方。",
				"hub.ai.host.host-unavailable": "宿主不可用（可能需要重启 DSH 一次）。",
				"hub.ai.host.unknown": "尚未检测到宿主模型状态。",
				"hub.ai.llmHint.unconfiguredModel": "未配置模型，已用本地回复",
				"hub.ai.llmHint.missingCredential": "缺少凭据，已用本地回复",
				"hub.ai.llmHint.quota": "模型额度不足，已用本地回复",
				"hub.ai.llmHint.rateLimit": "模型限流，已用本地回复",
				"hub.ai.llmHint.timeout": "模型响应超时，已用本地回复",
				"hub.ai.llmHint.hostUnavailable": "宿主不可用（可能需要重启 DSH），已用本地回复",
				"hub.ai.llmHint.default": "AI 暂时不可用，已用本地回复",
				"hub.ai.inputPlaceholder": "和桌宠说点什么…",
				"hub.ai.send": "发送",
				"hub.ai.empty": "先说一句话吧。",
				"hub.ai.thinking": "思考中…",
				"hub.ai.failed": "对话失败：{reason}",
				"hub.ai.denied": "桌宠拒绝了：{reason}",
				"hub.ai.you": "你",
				"hub.ai.pet": "桌宠",
				"hub.ai.logEmpty": "还没有对话。",
				"hub.ai.source.local": "本地回复",
				"hub.ai.source.llm": "AI 回复",
				"hub.ai.source.denied": "拒绝",
				"hub.ai.reason.paused": "AI 已暂停",
				"hub.ai.reason.permission": "权限未授权",
				"hub.ai.reason.rateLimit": "太快了，稍后再试",
				"hub.ai.reason.invalid": "输入不合法",
				"hub.ai.reason.empty": "没有输入内容",
				"hub.ai.reason.disabled": "AI 已关闭",
				"hub.ai.reason.timeout": "适配器超时",
				"hub.ai.reason.companionOff": "桌宠不在身边",
				"hub.ai.reason.internal": "内部错误",
				"hub.ai.reason.default": "暂时不能聊",
				// v1.6.8「自主思考」卡片（桌宠完全智能体）。
				"hub.mind.title": "自主思考",
				"hub.mind.hint": "让桌宠按自己的节奏想一想（默认本地生成，不联网）。只在已启用、页面可见、非低电量、AI 未暂停，且不在静默/睡眠/专注时段运行；开口还要过主动开口授权与既有预算。",
				"hub.mind.enable": "启用思考",
				"hub.mind.disable": "暂停思考",
				"hub.mind.interval": "思考间隔",
				"hub.mind.intervalValue": "{n} 分钟",
				"hub.mind.speak": "自主开口",
				"hub.mind.llm": "LLM 自主思考",
				"hub.mind.llmHint": "用你的 LLM 适配器生成念头：独立日额度，不占聊天日配额；请求只含此刻的触发语境，不含聊天记录。关闭即回到本地模板。",
				"hub.mind.llmBudget": "LLM 念头 {used}/{budget}（独立额度）",
				"hub.mind.think": "现在想一下",
				"hub.mind.thinking": "正在想…",
				"hub.mind.thinkDone": "想到了一点。",
				"hub.mind.thinkSpoken": "想到一点，也说给你听了。",
				"hub.mind.thinkSkipped": "这次没有想：{reason}",
				"hub.mind.clear": "清空想法",
				"hub.mind.clearConfirm": "再次点击确认清空",
				"hub.mind.clearConfirmNote": "清空后无法恢复；再次点击按钮确认。",
				"hub.mind.cleared": "想法已清空。",
				"hub.mind.empty": "还没有想法，点「现在想一下」试试。",
				"hub.mind.unavailable": "自主思考引擎未就绪（请确认 AI 大脑已启用）。",
				"hub.mind.paused": "AI 已暂停：自主思考不会运行。",
				"hub.mind.disabledNote": "自主思考已暂停。",
				"hub.mind.status": "间隔 {n} 分钟 · 共 {count} 条 · 最近 {time}",
				"hub.mind.statusNever": "间隔 {n} 分钟 · 还没想过",
				"hub.mind.reason.paused": "AI 已暂停",
				"hub.mind.reason.disabled": "未启用",
				"hub.mind.reason.hidden": "页面不可见",
				"hub.mind.reason.lowpower": "低电量",
				"hub.mind.reason.busy": "正在思考",
				"hub.mind.reason.denied": "AI 拒绝",
				"hub.mind.reason.quiet": "静默时段",
				"hub.mind.reason.asleep": "睡眠时段",
				"hub.mind.reason.focus": "专注时段",
				"hub.mind.reason.llmBudget": "LLM 念头额度已用完（聊天不受影响）",
				"hub.mind.reason.cooldown": "还没到间隔",
				"hub.mind.reason.internal": "内部错误",
				"hub.mind.kind.llm": "LLM 生成",
				"hub.mind.kind.local": "本地",
				"hub.perm.title": "权限总览",
				"hub.perm.hint": "安全与需确认能力可直接管理；6 项高风险能力默认关闭、可显式授权（皮肤不内置实现，需你另行提供适配器）；驱动 DSH 永远禁止。",
				"hub.perm.risk.safe": "安全",
				"hub.perm.risk.medium": "需确认",
				"hub.perm.risk.high": "高风险",
				"hub.perm.risk.forbidden": "永久禁止",
				"hub.perm.granted": "已授权",
				"hub.perm.notGranted": "未授权",
				"hub.perm.grant": "授权",
				"hub.perm.grantHigh": "授权（需确认）",
				"hub.perm.confirmHigh": "再次点击确认",
				"hub.perm.highWarning": "高风险能力本身不内置实现：未注册适配器时这里显示「无适配器（未启用）」，不会发生任何调用；即使注册了适配器，桌宠也只有在你已授权并手动调用 invokeCapability 时才会使用你的适配器。每次调用都写审计、可随时撤销。授权只在本页面会话内有效，刷新/重载后需重新授权。驱动 DSH 永远禁止。",
				"hub.perm.mediumNote": "该能力需要显式同意；再次点击确认后生效。",
				"hub.perm.revoke": "撤销",
				"hub.perm.revoked": "已撤销。",
				"hub.perm.grantedNote": "已授权。",
				"hub.perm.grantFailed": "授权失败：{reason}",
				"hub.perm.revokeFailed": "撤销失败：{reason}",
				"hub.perm.agentForbidden": "永久禁止（驱动 DSH）",
				"hub.perm.unavailable": "权限模型未接入。",
				"hub.perm.unknown": "未知能力",
				"hub.cap.chat": "对话",
				"hub.cap.memory": "记忆",
				"hub.cap.focus": "专注",
				"hub.cap.media": "形象",
				"hub.cap.remind": "职责提醒",
				"hub.cap.proactive": "主动开口",
				"hub.cap.llm": "LLM 适配器",
				"hub.cap.agent": "驱动 DSH",
				"hub.cap.network": "直接联网",
				"hub.cap.files": "读写文件",
				"hub.cap.shell": "执行命令",
				"hub.cap.approve": "代审批",
				"hub.cap.message": "代发消息",
				"hub.cap.install": "安装插件",
				"hub.weather.title": "天气",
				"hub.weather.hint": "天气由独立天气引擎提供；未启用或没有位置时不会联网请求。",
				"hub.weather.unavailable": "天气引擎未接入。",
				"hub.weather.disabled": "天气未启用。",
				"hub.weather.waiting": "等待天气数据…",
				"hub.weather.noLocation": "还没有位置：输入城市解析，或使用当前定位。",
				"hub.weather.error": "天气获取失败：{reason}",
				"hub.weather.normal": "{description} · {temperature}°C · 更新于 {time}",
				"hub.weather.updated": "更新于 {time}",
				"hub.weather.cityResolved": "城市已设为 {name}。",
				"hub.weather.unknown": "未知天气",
				"hub.weather.location": "位置：{name}",
				"hub.weather.enable": "启用天气",
				"hub.weather.city": "城市",
				"hub.weather.cityPlaceholder": "城市名（如 上海）",
				"hub.weather.resolve": "解析城市",
				"hub.weather.lat": "纬度",
				"hub.weather.lon": "经度",
				"hub.weather.coords": "应用坐标",
				"hub.weather.locate": "使用当前定位",
				"hub.weather.refresh": "刷新天气",
				"hub.weather.locating": "正在定位…",
				"hub.weather.resolving": "正在解析城市…",
				"hub.weather.applied": "天气设置已更新。",
				"hub.weather.enabledOn": "天气已启用。",
				"hub.weather.enabledOff": "天气已停用。",
				"hub.weather.invalidCity": "请先输入城市。",
				"hub.weather.invalidCoords": "坐标不合法：纬度 -90..90、经度 -180..180。",
				"hub.weather.resolveFailed": "无法解析城市：{reason}",
				"hub.weather.refreshed": "天气已刷新。",
				"hub.weather.failed": "操作失败：{reason}",
				"hub.weather.reason.default": "未知原因",
				"hub.weather.reason.network": "网络不可用",
				"hub.weather.reason.timeout": "请求超时",
				"hub.weather.reason.invalid": "响应不合法",
				"hub.weather.reason.geocode": "城市解析失败",
				"hub.weather.reason.geolocation": "定位不可用",
				"hub.weather.reason.unavailable": "天气服务不可用",
				"hub.weather.state.unavailable": "不可用",
				"hub.weather.state.disabled": "未启用",
				"hub.weather.state.noLocation": "无位置",
				"hub.weather.state.waiting": "等待数据",
				"hub.weather.state.error": "错误",
				"hub.weather.state.normal": "正常",
				"hub.selftest.title": "功能自检",
				"hub.selftest.hint": "逐项检查中枢依赖的运行时接口是否正常，反馈问题时可附上结果。",
				"hub.selftest.run": "运行自检",
				"hub.selftest.running": "检查中…",
				"hub.selftest.copy": "复制结果",
				"hub.selftest.copied": "自检结果已复制。",
				"hub.selftest.copyFailed": "复制失败：请手动选择文本。",
				"hub.selftest.pass": "通过",
				"hub.selftest.fail": "失败",
				"hub.selftest.summary": "{pass} 项通过 / {fail} 项失败",
				"hub.selftest.empty": "还没有运行自检。",
				"hub.selftest.item.life": "生活引擎",
				"hub.selftest.item.pet": "AI 大脑/权限",
				"hub.selftest.item.glass": "玻璃控制器",
				"hub.selftest.item.media": "形象媒体库",
				"hub.selftest.item.weather": "天气",
				"hub.selftest.item.agent": "AI Agent（实验）",
				"hub.selftest.item.hub": "中枢自身",
				"hub.selftest.unknown": "未知项",
				"hub.selftest.detail.ok": "正常",
				"hub.selftest.detail.missing": "未接入",
				"hub.selftest.detail.empty": "无数据",
				"hub.selftest.detail.error": "异常：{reason}",
				"hub.feedback.title": "反馈",
				"hub.feedback.hint": "把环境与功能状态一起发给作者（不含对话内容/文件）；也可直接打开 GitHub Issue。",
				"hub.feedback.placeholder": "遇到了什么问题？（可留空，使用默认模板）",
				"hub.feedback.copy": "复制反馈信息",
				"hub.feedback.copied": "反馈信息已复制。",
				"hub.feedback.copyFailed": "复制失败：请手动选择文本。",
				"hub.feedback.issue": "打开 GitHub Issue",
				"hub.feedback.issueOpened": "已打开 GitHub Issue 页面。",
				"hub.feedback.issueBlocked": "浏览器拦截了弹窗，请允许弹窗后重试。",
				"hub.feedback.issueTitle": "[天光 v1.5] 角色中枢反馈",
				"hub.feedback.issueBody": "请描述问题或期望，并附上下方复制的反馈信息。",
				"hub.feedback.download": "下载 JSON",
				"hub.feedback.downloaded": "已下载 {name}。",
				"hub.feedback.downloadFailed": "下载失败：{reason}",
				"hub.feedback.unsupported": "当前环境不支持该操作。",
				"hub.feedback.version": "版本：{version}",
				"hub.fingerprint.title": "版本指纹",
				"hub.fingerprint.hint": "版本 · git commit · lib/client.js sha256 前 12 位 · HOST_API · DSH 版本 · 安装方式。反馈时请原样粘贴这一行。",
				"hub.fingerprint.unavailable": "版本指纹不可用（宿主半未响应；升级后需重启 DSH 一次）。",
				"hub.fingerprint.copy": "复制指纹",
				"hub.fingerprint.copied": "版本指纹已复制。",
				"hub.audit.title": "审计",
				"hub.audit.empty": "暂无记录。",
				"hub.audit.unavailable": "审计未接入。",
				"hub.audit.ok": "放行",
				"hub.audit.deny": "拒绝",
				"hub.cap.agentChat": "Agent 会话",
				"hub.agent.title": "AI Agent（实验）",
				"hub.agent.hint": "实验功能：只把你手动输入的这句话发到你选择的 DSH 会话；不会自动触发、不会代审批、不驱动工具。默认关闭，需显式授权；授权只在本页面会话内有效，刷新/重载后需重新授权。",
				"hub.agent.status.unavailable": "Agent 通道不可用（未挂载或 remote.session 不可用）。",
				"hub.agent.status.unauthorized": "未授权：先允许「Agent 会话」。",
				"hub.agent.status.unconnected": "未连接会话",
				"hub.agent.status.connected": "已连接：{title}",
				"hub.agent.status.budget": "今日预算 {used}/{cap}",
				"hub.agent.status.pending": "等待回复…",
				"hub.agent.perm.grant": "授权 Agent 会话",
				"hub.agent.perm.revoke": "撤销 Agent 授权",
				"hub.agent.perm.confirm": "允许桌宠把你手动输入的这句话发送到 DSH 会话？只发送你输入的文本，不会自动触发，可随时撤销。",
				"hub.agent.perm.confirmShort": "再次点击确认",
				"hub.agent.perm.granted": "已授权 Agent 会话。",
				"hub.agent.perm.revoked": "已撤销 Agent 授权。",
				"hub.agent.perm.denied": "授权失败：{reason}",
				"hub.agent.target.label": "目标会话",
				"hub.agent.target.new": "新建桌宠会话",
				"hub.agent.target.running": "运行中",
				"hub.agent.connect": "连接",
				"hub.agent.disconnect": "断开",
				"hub.agent.open": "打开会话",
				"hub.agent.connect.ok": "已连接：{title}",
				"hub.agent.connect.failed": "连接失败：{reason}",
				"hub.agent.disconnected": "已断开。",
				"hub.agent.open.failed": "打开失败：{reason}",
				"hub.agent.sent": "已发送到会话，点「打开会话」查看。",
				"hub.agent.source": "Agent 会话",
				"hub.agent.chat.failed": "Agent 发送失败：{reason}",
				"hub.agent.busy": "处理中…",
				"hub.agent.reason.unavailable": "通道不可用",
				"hub.agent.reason.permission": "未授权 Agent 会话",
				"hub.agent.reason.notConnected": "未连接会话",
				"hub.agent.reason.paused": "AI 已暂停",
				"hub.agent.reason.budget": "今日 Agent 预算已用完",
				"hub.agent.reason.rateLimited": "太快了，稍后再试",
				"hub.agent.reason.invalidInput": "输入不合法",
				"hub.agent.reason.sendFailed": "发送失败",
				"hub.agent.reason.unknownCap": "大脑版本不支持该权限",
				"hub.agent.reason.hardDenied": "该权限被永久禁止",
				"hub.agent.reason.consent": "需要显式同意",
				"hub.agent.reason.sessionRequired": "先选择一个会话",
				"hub.agent.reason.unknownSession": "会话不存在或不在此列表",
				"hub.agent.reason.createFailed": "创建会话失败",
				"hub.agent.reason.connectFailed": "连接失败",
				"hub.agent.reason.dailyQuota": "今日 Agent 预算已用完",
				"hub.agent.reason.busy": "上一条还在发送中",
				"hub.agent.reason.promptRejected": "会话拒绝了这条发送",
				"hub.agent.reason.promptFailed": "发送到会话失败",
				"hub.agent.reason.listFailed": "会话列表不可用",
				"hub.agent.reason.workspaceUnavailable": "当前没有可用工作区",
				"hub.agent.reason.internal": "内部错误",
				"hub.agent.reason.default": "暂时不能发送",
			},
			en: {
				"hub.title": "Character hub",
				"hub.close": "Close",
				"hub.draft.restored": "Restored the unsaved chat / rhythm draft from last time.",
				"hub.settingsHint": "Life-rhythm settings now live on this page; there is no separate page anymore.",
				"hub.loading": "Loading…",
				"hub.unavailable": "Unavailable",
				"hub.status.title": "Life now",
				"hub.status.period": "Period",
				"hub.status.awake": "State",
				"hub.status.quiet": "Quiet",
				"hub.status.budget": "Proactive today",
				"hub.status.streak": "Streak",
				"hub.status.ai": "AI state",
				"hub.status.unavailable": "Life engine is not ready; status is unavailable.",
				"hub.life.title": "Life rhythm settings",
				"hub.life.quiet": "Quiet hours",
				"hub.life.quietOn": "Enable quiet hours",
				"hub.life.quietStart": "Quiet starts",
				"hub.life.quietEnd": "Quiet ends",
				"hub.life.budget": "Proactive bubbles per day",
				"hub.life.wake": "Wake",
				"hub.life.sleep": "Sleep",
				"hub.life.virtual": "Virtual clock offset (minutes)",
				"hub.life.apply": "Save rhythm",
				"hub.life.saved": "Life rhythm saved.",
				"hub.life.invalid": "Some inputs were invalid and ignored; the valid ones were saved.",
				"hub.life.memory": "Memory: interactions {interactions} · pats {pats} · feeds {feeds} · play {plays} · streak {streak}d",
				"hub.life.lastSeen": "Last seen: {time}",
				"hub.life.unavailable": "Life engine unavailable; rhythm settings are off.",
				"hub.period.dawn": "Dawn",
				"hub.period.morning": "Morning",
				"hub.period.noon": "Noon",
				"hub.period.afternoon": "Afternoon",
				"hub.period.dusk": "Dusk",
				"hub.period.evening": "Evening",
				"hub.period.night": "Night",
				"hub.period.unknown": "Unknown",
				"hub.awake.yes": "Awake",
				"hub.awake.no": "Asleep",
				"hub.quiet.on": "Quiet",
				"hub.quiet.off": "Open",
				"hub.unit.days": "{n}d",
				"hub.focus.start": "Start 25m focus",
				"hub.focus.stop": "Stop focus",
				"hub.mute.start": "Mute 1h",
				"hub.mute.active": "Muted",
				"hub.mute.done": "Muted for an hour.",
				"hub.glass.title": "Liquid glass",
				"hub.glass.off": "Off",
				"hub.glass.frosted": "Frosted",
				"hub.glass.soft": "Soft",
				"hub.glass.real": "Real",
				"hub.glass.effective": "Depth: {depth}",
				"hub.glass.lowered": "Depth: {depth} (effective {effective}, auto-lowered)",
				"hub.glass.unavailable": "Glass control is unavailable.",
				"hub.glass.done": "Glass depth: {depth}",
				"hub.glass.previewHint": "Depth is off by default; picking Soft, Real or Frosted turns Live on by default. Live samples the wallpaper every frame and costs more power; switch it off for static, power-saving glass. Low power and 15fps remove every backdrop blur and deepen the tint.",
				"hub.glass.preview": "Current: {depth} · effective: {effective}",
				"hub.glass.previewLive": "Current: {depth} · live sampling · effective: {effective}",
				"hub.glass.live": "Live rendering",
				"hub.glass.liveOffHint": "Off: static glass, saves power",
				"hub.glass.liveOnHint": "On (recommended): samples the wallpaper every frame; costs more power",
				"hub.glass.liveDegraded": "On: paused while low power / 15 fps",
				"hub.glass.liveNeedsDepth": "Choose a glass level first",
				"hub.splash.title": "Opening animation",
				"hub.splash.on": "On",
				"hub.splash.off": "Off",
				"hub.splash.aria": "Opening animation settings",
				"hub.splash.style": "Playback",
				"hub.splash.longOnce": "Film (first launch each day)",
				"hub.splash.long": "Film (every launch)",
				"hub.splash.simple": "Compact",
				"hub.splash.offOption": "Off",
				"hub.splash.skip": "Click here to skip",
				"hub.splash.sound": "Opening sound",
				"hub.splash.soundOff": "Off (default)",
				"hub.splash.soundOn": "On",
				"hub.splash.motion": "Under reduced motion (accessibility override)",
				"hub.splash.motionOff": "Respect system (default)",
				"hub.splash.motionOn": "Play anyway",
				"hub.splash.motionHint": "By default the splash respects the system reduce-motion setting. \"Play anyway\" overrides it; low power still skips.",
				"hub.splash.hint": "The film plays on the first launch of each day, then the compact version; Ctrl+F5 does not replay it. Skipped under reduced motion or low power; click or Esc skips the film.",
				"hub.appearance.reset": "Restore default appearance",
				"hub.appearance.hint": "Restores the author's default look (wallpaper / glass depth / typography / effects / companion look); chat, permissions, weather and your uploaded wallpaper files are untouched.",
				"hub.appearance.confirm": "Click again to restore the default appearance: current appearance settings will be overwritten (chat / permissions / weather are untouched).",
				"hub.appearance.done": "Default appearance restored ({n} keys); reloading…",
				"hub.media.title": "Companion look",
				"hub.media.select": "Choose look",
				"hub.media.apply": "Apply look",
				"hub.media.default": "Default (cat.png)",
				"hub.media.applied": "Look switched: {name}",
				"hub.media.empty": "No usable media yet; upload one first.",
				"hub.media.rejected": "Skipped items over 32 MiB: {names}",
				"hub.media.unavailable": "Life engine unavailable; the look cannot change now.",
				"hub.media.failed": "Could not switch: {reason}",
				"hub.media.defaultRestored": "Restored the default look.",
				"hub.media.restoreDefault": "Restore default look",
				"hub.media.reason.unknown": "The item is no longer in the library",
				"hub.media.reason.catalog": "The media catalog is unavailable",
				"hub.media.reason.internal": "Internal error",
				"hub.media.reason.default": "Unknown reason",
				"hub.media.listHint": "Every look is listed below with its file name always visible; click a row to switch.",
				"hub.media.pack.title": "Action pack (current look)",
				"hub.media.pack.hint": "Customize the action labels and replies for the selected look; saving applies to the pet menu right away, and Reset removes the customization.",
				"hub.media.pack.labelPet": "Pet action label",
				"hub.media.pack.labelFeed": "Feed action label",
				"hub.media.pack.labelPlay": "Wand action label",
				"hub.media.pack.linesPlaceholder": "One reply per line",
				"hub.media.pack.save": "Save action pack",
				"hub.media.pack.saved": "Action pack saved; the pet menu is updated.",
				"hub.media.pack.reset": "Reset action pack",
				"hub.media.pack.resetConfirm": "Click again to reset",
				"hub.media.pack.resetConfirmNote": "Resetting deletes the custom action pack for the current look and cannot be undone; click the button again to confirm.",
				"hub.media.pack.resetDone": "Action pack restored to the default.",
				"hub.media.pack.invalid": "The action pack is invalid: check the labels or replies and try again.",
				"hub.media.pack.unavailable": "The pet action API is not ready, so the action pack cannot be edited.",
				"hub.upload.button": "Upload image / video",
				"hub.upload.hint": "Pick an image or video from this machine (<=32 MiB); it applies right away.",
				"hub.upload.uploading": "Uploading…",
				"hub.upload.done": "Uploaded and applied: {name}",
				"hub.upload.tooBig": "File is over 32 MiB ({size} MiB); not uploaded.",
				"hub.upload.type": "Unsupported file type: pick an image or a video.",
				"hub.upload.empty": "Empty files cannot be uploaded.",
				"hub.upload.rejected": "Upload rejected ({status}): {reason}",
				"hub.upload.failed": "Upload failed: {reason}",
				"hub.upload.noFetch": "Uploading is not supported here.",
				"hub.ai.title": "AI chat",
				"hub.ai.hint": "The companion only chats and reminds: it never goes online, touches files or acts for you on its own. Only after you explicitly allow LLM in this page session does chat use your configured DSH model (and your model quota).",
				"hub.ai.pause": "Pause AI",
				"hub.ai.resume": "Resume AI",
				"hub.ai.pausedNote": "Paused: the companion will not reply.",
				"hub.ai.resumedNote": "Resumed.",
				"hub.ai.ready": "Ready",
				"hub.ai.unavailable": "AI brain is unavailable; chat is off.",
				"hub.ai.adapter": "Adapter: {adapter}",
				"hub.ai.adapterNone": "none (local brain)",
				"hub.ai.adapterDsh": "DSH model ({provider} / {model})",
				"hub.ai.llm.grant": "Allow LLM",
				"hub.ai.llm.revoke": "Revoke LLM",
				"hub.ai.llm.confirm": "Allow the companion to call the model you configured in DSH? This consumes your model quota; only the current sentence and the companion's local context are sent, with daily, rate and timeout caps.",
				"hub.ai.llm.confirmShort": "Click again to confirm",
				"hub.ai.llm.granted": "LLM allowed.",
				"hub.ai.llm.revoked": "LLM revoked.",
				"hub.ai.llm.providerLabel": "Model provider for the companion",
				"hub.ai.llm.followDefault": "Follow the DSH default model",
				"hub.ai.llm.unknown": "unknown",
				"hub.ai.llm.providerSaved": "Model provider updated.",
				"hub.ai.llm.providerFailed": "Could not update the model provider.",
				"hub.ai.llm.providerUnavailable": "Could not read the DSH provider list; only the default is available.",
				"hub.ai.llm.modelLabel": "Model for the companion",
				"hub.ai.llm.followModel": "Follow the DSH default model ({model})",
				"hub.ai.llm.followProviderModel": "This provider's first model (chosen by the host)",
				"hub.ai.llm.firstModel": "First model (chosen by the host)",
				"hub.ai.llm.modelSaved": "Model updated.",
				"hub.ai.llm.modelFailed": "Could not update the model.",
				"hub.ai.llm.modelUnavailable": "Could not read this provider's model list; the host will pick one for now.",
				"hub.ai.llm.modelEmpty": "This provider has no models right now.",
				"hub.ai.llm.savedUnavailable": "Saved but unavailable now: {model}",
				"hub.ai.llm.providerHint": "Grok / Claude and other international models: add the provider in DSH Settings → Models — Claude uses the built-in anthropic entry with its API key; Grok uses Custom model API with base URL https://api.x.ai/v1, protocol OpenAI Chat Completions and the xAI key. Then pick it in the provider and model selectors here.",
				"hub.ai.host.unconfigured-model": "No model configured: configure one in DSH settings first.",
				"hub.ai.host.no-llm-service": "The host exposes no LLM service.",
				"hub.ai.host.no-providers": "The host has no available model provider.",
				"hub.ai.host.host-unavailable": "Host unavailable (a DSH restart may be needed).",
				"hub.ai.host.unknown": "Host model status not detected yet.",
				"hub.ai.llmHint.unconfiguredModel": "No model is configured; replied locally",
				"hub.ai.llmHint.missingCredential": "Missing credentials; replied locally",
				"hub.ai.llmHint.quota": "Model quota is exhausted; replied locally",
				"hub.ai.llmHint.rateLimit": "The model is rate-limited; replied locally",
				"hub.ai.llmHint.timeout": "The model timed out; replied locally",
				"hub.ai.llmHint.hostUnavailable": "The host is unavailable (a DSH restart may be needed); replied locally",
				"hub.ai.llmHint.default": "AI is unavailable right now; replied locally",
				"hub.ai.inputPlaceholder": "Say something to the companion…",
				"hub.ai.send": "Send",
				"hub.ai.empty": "Type something first.",
				"hub.ai.thinking": "Thinking…",
				"hub.ai.failed": "Chat failed: {reason}",
				"hub.ai.denied": "Declined: {reason}",
				"hub.ai.you": "You",
				"hub.ai.pet": "Pet",
				"hub.ai.logEmpty": "No messages yet.",
				"hub.ai.source.local": "Local reply",
				"hub.ai.source.llm": "AI reply",
				"hub.ai.source.denied": "denied",
				"hub.ai.reason.paused": "AI is paused",
				"hub.ai.reason.permission": "Permission not granted",
				"hub.ai.reason.rateLimit": "Too fast; try later",
				"hub.ai.reason.invalid": "Invalid input",
				"hub.ai.reason.empty": "Nothing was typed",
				"hub.ai.reason.disabled": "AI is disabled",
				"hub.ai.reason.timeout": "Adapter timed out",
				"hub.ai.reason.companionOff": "The companion is not around",
				"hub.ai.reason.internal": "Internal error",
				"hub.ai.reason.default": "Not available right now",
				// v1.6.8 autonomous thinking card (fully agentic companion).
				"hub.mind.title": "Autonomous thinking",
				"hub.mind.hint": "Let the companion think at its own pace (local template by default, no network). It only runs when enabled, the page is visible, no low-power mode is on, the AI is not paused, and quiet hours / sleep / focus sessions are inactive; speaking still needs the proactive grant and the existing budget.",
				"hub.mind.enable": "Enable thinking",
				"hub.mind.disable": "Pause thinking",
				"hub.mind.interval": "Interval",
				"hub.mind.intervalValue": "{n} min",
				"hub.mind.speak": "Speak autonomously",
				"hub.mind.llm": "LLM thinking",
				"hub.mind.llmHint": "Generate thoughts with your LLM adapter: separate daily budget, never charged to the user chat quota; the payload carries only this moment's trigger context, no chat history. Off = local template.",
				"hub.mind.llmBudget": "LLM thoughts {used}/{budget} (separate budget)",
				"hub.mind.think": "Think now",
				"hub.mind.thinking": "Thinking…",
				"hub.mind.thinkDone": "Had a thought.",
				"hub.mind.thinkSpoken": "Had a thought — and said it aloud.",
				"hub.mind.thinkSkipped": "No thought this time: {reason}",
				"hub.mind.clear": "Clear thoughts",
				"hub.mind.clearConfirm": "Click again to clear",
				"hub.mind.clearConfirmNote": "Clearing cannot be undone; click the button again to confirm.",
				"hub.mind.cleared": "Thoughts cleared.",
				"hub.mind.empty": "No thoughts yet — try \"Think now\".",
				"hub.mind.unavailable": "The thinking engine is unavailable (make sure the AI brain is enabled).",
				"hub.mind.paused": "AI is paused: autonomous thinking will not run.",
				"hub.mind.disabledNote": "Autonomous thinking is paused.",
				"hub.mind.status": "Every {n} min · {count} thoughts · last {time}",
				"hub.mind.statusNever": "Every {n} min · no thoughts yet",
				"hub.mind.reason.paused": "AI is paused",
				"hub.mind.reason.disabled": "not enabled",
				"hub.mind.reason.hidden": "page hidden",
				"hub.mind.reason.lowpower": "low power",
				"hub.mind.reason.busy": "already thinking",
				"hub.mind.reason.denied": "refused by the AI",
				"hub.mind.reason.quiet": "quiet hours",
				"hub.mind.reason.asleep": "sleep hours",
				"hub.mind.reason.focus": "focus session",
				"hub.mind.reason.llmBudget": "LLM thought budget used up (chat is unaffected)",
				"hub.mind.reason.cooldown": "interval not reached",
				"hub.mind.reason.internal": "internal error",
				"hub.mind.kind.llm": "LLM",
				"hub.mind.kind.local": "local",
				"hub.perm.title": "Permissions",
				"hub.perm.hint": "Safe and confirm-only capabilities can be managed here; the six high-risk capabilities are off by default and can be explicitly allowed (the skin ships no implementation; you must provide an adapter); driving DSH stays permanently denied.",
				"hub.perm.risk.safe": "Safe",
				"hub.perm.risk.medium": "Needs confirmation",
				"hub.perm.risk.high": "High risk",
				"hub.perm.risk.forbidden": "Permanently denied",
				"hub.perm.granted": "Allowed",
				"hub.perm.notGranted": "Not allowed",
				"hub.perm.grant": "Allow",
				"hub.perm.grantHigh": "Allow (confirm)",
				"hub.perm.confirmHigh": "Click again to confirm",
				"hub.perm.highWarning": "High-risk capabilities have no built-in implementation: without a registered adapter the row reads “No adapter (not enabled)” and nothing can run; even with an adapter, the companion only uses it when you have allowed the capability and manually call invokeCapability. Every call is audited and you can revoke anytime. Grants last for this page session only — a reload asks again. Driving DSH stays permanently denied.",
				"hub.perm.mediumNote": "This capability needs explicit consent; click again to confirm.",
				"hub.perm.revoke": "Revoke",
				"hub.perm.revoked": "Revoked.",
				"hub.perm.grantedNote": "Allowed.",
				"hub.perm.grantFailed": "Could not allow: {reason}",
				"hub.perm.revokeFailed": "Could not revoke: {reason}",
				"hub.perm.agentForbidden": "Permanently denied (drives DSH)",
				"hub.perm.unavailable": "Permission model unavailable.",
				"hub.perm.unknown": "Unknown capability",
				"hub.cap.chat": "Chat",
				"hub.cap.memory": "Memory",
				"hub.cap.focus": "Focus",
				"hub.cap.media": "Look",
				"hub.cap.remind": "Reminders",
				"hub.cap.proactive": "Proactive",
				"hub.cap.llm": "LLM adapter",
				"hub.cap.agent": "Drive DSH",
				"hub.cap.network": "Network",
				"hub.cap.files": "Files",
				"hub.cap.shell": "Shell",
				"hub.cap.approve": "Approve",
				"hub.cap.message": "Message",
				"hub.cap.install": "Install",
				"hub.weather.title": "Weather",
				"hub.weather.hint": "Weather comes from a separate weather engine; nothing is requested while disabled or without a location.",
				"hub.weather.unavailable": "Weather engine is not available.",
				"hub.weather.disabled": "Weather is off.",
				"hub.weather.waiting": "Waiting for weather data…",
				"hub.weather.noLocation": "No location yet: resolve a city or use your current location.",
				"hub.weather.error": "Weather failed: {reason}",
				"hub.weather.normal": "{description} · {temperature}°C · updated {time}",
				"hub.weather.updated": "updated {time}",
				"hub.weather.cityResolved": "City set to {name}.",
				"hub.weather.unknown": "Unknown weather",
				"hub.weather.location": "Location: {name}",
				"hub.weather.enable": "Enable weather",
				"hub.weather.city": "City",
				"hub.weather.cityPlaceholder": "City name (e.g. Shanghai)",
				"hub.weather.resolve": "Resolve city",
				"hub.weather.lat": "Latitude",
				"hub.weather.lon": "Longitude",
				"hub.weather.coords": "Apply coordinates",
				"hub.weather.locate": "Use current location",
				"hub.weather.refresh": "Refresh weather",
				"hub.weather.locating": "Locating…",
				"hub.weather.resolving": "Resolving city…",
				"hub.weather.applied": "Weather settings updated.",
				"hub.weather.enabledOn": "Weather enabled.",
				"hub.weather.enabledOff": "Weather disabled.",
				"hub.weather.invalidCity": "Type a city first.",
				"hub.weather.invalidCoords": "Invalid coordinates: latitude -90..90, longitude -180..180.",
				"hub.weather.resolveFailed": "Could not resolve the city: {reason}",
				"hub.weather.refreshed": "Weather refreshed.",
				"hub.weather.failed": "Action failed: {reason}",
				"hub.weather.reason.default": "unknown reason",
				"hub.weather.reason.network": "network unavailable",
				"hub.weather.reason.timeout": "request timed out",
				"hub.weather.reason.invalid": "invalid response",
				"hub.weather.reason.geocode": "could not resolve the city",
				"hub.weather.reason.geolocation": "geolocation unavailable",
				"hub.weather.reason.unavailable": "weather service unavailable",
				"hub.weather.state.unavailable": "unavailable",
				"hub.weather.state.disabled": "off",
				"hub.weather.state.noLocation": "no location",
				"hub.weather.state.waiting": "waiting",
				"hub.weather.state.error": "error",
				"hub.weather.state.normal": "ok",
				"hub.selftest.title": "Self-test",
				"hub.selftest.hint": "Checks the runtime interfaces the hub depends on; attach the result when reporting an issue.",
				"hub.selftest.run": "Run self-test",
				"hub.selftest.running": "Checking…",
				"hub.selftest.copy": "Copy result",
				"hub.selftest.copied": "Self-test result copied.",
				"hub.selftest.copyFailed": "Copy failed: select the text manually.",
				"hub.selftest.pass": "PASS",
				"hub.selftest.fail": "FAIL",
				"hub.selftest.summary": "{pass} passed / {fail} failed",
				"hub.selftest.empty": "The self-test has not run yet.",
				"hub.selftest.item.life": "Life engine",
				"hub.selftest.item.pet": "AI brain / permissions",
				"hub.selftest.item.glass": "Glass controller",
				"hub.selftest.item.media": "Media library",
				"hub.selftest.item.weather": "Weather",
				"hub.selftest.item.agent": "AI Agent",
				"hub.selftest.item.hub": "Role hub",
				"hub.selftest.unknown": "Unknown item",
				"hub.selftest.detail.ok": "ok",
				"hub.selftest.detail.missing": "not available",
				"hub.selftest.detail.empty": "no data",
				"hub.selftest.detail.error": "error: {reason}",
				"hub.feedback.title": "Feedback",
				"hub.feedback.hint": "Send the environment and feature state to the author (no conversation or files); you can also open a GitHub issue directly.",
				"hub.feedback.placeholder": "What went wrong? (optional; the default template is used when empty)",
				"hub.feedback.copy": "Copy feedback",
				"hub.feedback.copied": "Feedback copied.",
				"hub.feedback.copyFailed": "Copy failed: select the text manually.",
				"hub.feedback.issue": "Open GitHub issue",
				"hub.feedback.issueOpened": "Opened the GitHub issue page.",
				"hub.feedback.issueBlocked": "The browser blocked the popup; allow popups and retry.",
				"hub.feedback.issueTitle": "[Tianlight v1.5] Role hub feedback",
				"hub.feedback.issueBody": "Describe the problem or expectation and attach the copied feedback below.",
				"hub.feedback.download": "Download JSON",
				"hub.feedback.downloaded": "Downloaded {name}.",
				"hub.feedback.downloadFailed": "Download failed: {reason}",
				"hub.feedback.unsupported": "This action is not supported in this environment.",
				"hub.feedback.version": "Version: {version}",
				"hub.fingerprint.title": "Build fingerprint",
				"hub.fingerprint.hint": "Version · git commit · first 12 of lib/client.js sha256 · HOST_API · DSH version · install method. Paste this line as-is when reporting an issue.",
				"hub.fingerprint.unavailable": "Fingerprint unavailable (the host half did not answer; restart DSH once after an upgrade).",
				"hub.fingerprint.copy": "Copy fingerprint",
				"hub.fingerprint.copied": "Build fingerprint copied.",
				"hub.audit.title": "Audit",
				"hub.audit.empty": "No records yet.",
				"hub.audit.unavailable": "Audit unavailable.",
				"hub.audit.ok": "ok",
				"hub.audit.deny": "denied",
				"hub.cap.agentChat": "Agent chat",
				"hub.agent.title": "AI Agent (experimental)",
				"hub.agent.hint": "Experimental: only the sentence you type here is sent to the DSH session you pick; nothing is triggered automatically, nothing approves, no tools are driven. Off by default; explicit consent required, and the grant lasts for this page session only — a reload asks again.",
				"hub.agent.status.unavailable": "Agent channel unavailable (not mounted or remote.session is unavailable).",
				"hub.agent.status.unauthorized": "Not allowed yet: allow Agent chat first.",
				"hub.agent.status.unconnected": "No session connected",
				"hub.agent.status.connected": "Connected: {title}",
				"hub.agent.status.budget": "Daily budget {used}/{cap}",
				"hub.agent.status.pending": "Waiting for a reply…",
				"hub.agent.perm.grant": "Allow agent chat",
				"hub.agent.perm.revoke": "Revoke agent access",
				"hub.agent.perm.confirm": "Allow the companion to send the sentence you type to a DSH session? Only your typed text is sent, nothing is triggered automatically, and you can revoke anytime.",
				"hub.agent.perm.confirmShort": "Click again to confirm",
				"hub.agent.perm.granted": "Agent chat allowed.",
				"hub.agent.perm.revoked": "Agent access revoked.",
				"hub.agent.perm.denied": "Could not allow: {reason}",
				"hub.agent.target.label": "Target session",
				"hub.agent.target.new": "New pet session",
				"hub.agent.target.running": "running",
				"hub.agent.connect": "Connect",
				"hub.agent.disconnect": "Disconnect",
				"hub.agent.open": "Open session",
				"hub.agent.connect.ok": "Connected: {title}",
				"hub.agent.connect.failed": "Could not connect: {reason}",
				"hub.agent.disconnected": "Disconnected.",
				"hub.agent.open.failed": "Could not open: {reason}",
				"hub.agent.sent": "Sent to the session; use Open session to read the reply.",
				"hub.agent.source": "Agent session",
				"hub.agent.chat.failed": "Agent send failed: {reason}",
				"hub.agent.busy": "Working…",
				"hub.agent.reason.unavailable": "Channel unavailable",
				"hub.agent.reason.permission": "Agent chat not allowed",
				"hub.agent.reason.notConnected": "No session connected",
				"hub.agent.reason.paused": "AI is paused",
				"hub.agent.reason.budget": "Daily agent budget reached",
				"hub.agent.reason.rateLimited": "Too fast; try later",
				"hub.agent.reason.invalidInput": "Invalid input",
				"hub.agent.reason.sendFailed": "Send failed",
				"hub.agent.reason.unknownCap": "This brain build does not know the capability",
				"hub.agent.reason.hardDenied": "This capability is permanently denied",
				"hub.agent.reason.consent": "Explicit consent required",
				"hub.agent.reason.sessionRequired": "Pick a session first",
				"hub.agent.reason.unknownSession": "Session missing or not in the list",
				"hub.agent.reason.createFailed": "Could not create the session",
				"hub.agent.reason.connectFailed": "Connection failed",
				"hub.agent.reason.dailyQuota": "Daily agent budget reached",
				"hub.agent.reason.busy": "The previous message is still sending",
				"hub.agent.reason.promptRejected": "The session rejected this prompt",
				"hub.agent.reason.promptFailed": "Could not send to the session",
				"hub.agent.reason.listFailed": "Session list unavailable",
				"hub.agent.reason.workspaceUnavailable": "No workspace is available",
				"hub.agent.reason.internal": "Internal error",
				"hub.agent.reason.default": "Not available right now",
			},
		});

		const HUB_VERSION = 1;
		/** 打开期间的状态轮询周期（关闭即停，见 installRoleHub 的 disposer）。 */
		const HUB_REFRESH_MS = 4000;
		/** 本机上传的客户端上限；宿主 _upload 还会再校验一次大小与类型。 */
		const HUB_UPLOAD_MAX_BYTES = 32 * 1024 * 1024;
		const HUB_AI_INPUT_MAX = 1000;
		const HUB_LOG_MAX = 50;
		const HUB_AUDIT_LIMIT = 8;
		const HUB_GLASS_LEVELS = ["off", "frosted", "soft", "real"];
		/** Overlay root id (the hub itself; there is no sidebar/settings entry anymore). */
		const HUB_DOM_ID = "tianlight-role-hub";
		/**
		 * R5: unsaved-content draft (unfinished chat line + edited rhythm fields). Esc
		 * closes the hub but must never discard what the user typed; we persist the
		 * draft (sessionStorage: per tab, never synced/exported) when the hub closes and
		 * restore it on the next open. Chosen over a close-confirmation dialog because it
		 * never blocks a modal close and cannot auto-apply half-edited/invalid values.
		 */
		const HUB_DRAFT_KEY = "tianlight.hub.draft.v1";
		const HUB_PERIOD_KEYS = {
			dawn: "hub.period.dawn",
			morning: "hub.period.morning",
			noon: "hub.period.noon",
			afternoon: "hub.period.afternoon",
			dusk: "hub.period.dusk",
			evening: "hub.period.evening",
			night: "hub.period.night",
		};
		const HUB_GLASS_LABEL_KEYS = {
			off: "hub.glass.off",
			frosted: "hub.glass.frosted",
			soft: "hub.glass.soft",
			real: "hub.glass.real",
		};
		const HUB_RISK_KEYS = {
			safe: "hub.perm.risk.safe",
			medium: "hub.perm.risk.medium",
			high: "hub.perm.risk.high",
			forbidden: "hub.perm.risk.forbidden",
		};
		const HUB_CAP_KEYS = {
			chat: "hub.cap.chat",
			memory: "hub.cap.memory",
			focus: "hub.cap.focus",
			media: "hub.cap.media",
			remind: "hub.cap.remind",
			proactive: "hub.cap.proactive",
			llm: "hub.cap.llm",
			agentChat: "hub.cap.agentChat",
			agent: "hub.cap.agent",
			network: "hub.cap.network",
			files: "hub.cap.files",
			shell: "hub.cap.shell",
			approve: "hub.cap.approve",
			message: "hub.cap.message",
			install: "hub.cap.install",
		};
		const HUB_MEDIA_REASON_KEYS = {
			"unknown-media": "hub.media.reason.unknown",
			"catalog-unavailable": "hub.media.reason.catalog",
			"internal-error": "hub.media.reason.internal",
		};
		/** v1.6.4 per-look action packs: the three menu actions and their label keys. */
		const HUB_PACK_ACTIONS = ["pet", "feed", "play"];
		const HUB_PACK_LABEL_KEYS = {
			pet: "hub.media.pack.labelPet",
			feed: "hub.media.pack.labelFeed",
			play: "hub.media.pack.labelPlay",
		};
		const HUB_PACK_LABEL_MAX = 24;
		/** Companion-side caps (src/40-companion.js): the hub rejects instead of clipping. */
		const HUB_PACK_LINE_MAX = 120;
		const HUB_PACK_LINES_MAX = 8;
		/** Static key map for every weather state (the i18n audit scans literals). */
		const HUB_WEATHER_STATE_KEYS = {
			unavailable: "hub.weather.state.unavailable",
			disabled: "hub.weather.state.disabled",
			noLocation: "hub.weather.state.noLocation",
			waiting: "hub.weather.state.waiting",
			error: "hub.weather.state.error",
			normal: "hub.weather.state.normal",
		};
		/** Raw summary().error codes from the weather engine (not localized by it). */
		const HUB_WEATHER_REASON_KEYS = {
			network: "hub.weather.reason.network",
			timeout: "hub.weather.reason.timeout",
			invalid: "hub.weather.reason.invalid",
			geocode: "hub.weather.reason.geocode",
			geolocation: "hub.weather.reason.geolocation",
			unavailable: "hub.weather.reason.unavailable",
		};
		/** Static key map for the seven self-test rows. */
		const HUB_SELFTEST_ITEM_KEYS = {
			life: "hub.selftest.item.life",
			pet: "hub.selftest.item.pet",
			glass: "hub.selftest.item.glass",
			media: "hub.selftest.item.media",
			weather: "hub.selftest.item.weather",
			agent: "hub.selftest.item.agent",
			hub: "hub.selftest.item.hub",
		};
		const HUB_AI_REASON_KEYS = {
			paused: "hub.ai.reason.paused",
			permission: "hub.ai.reason.permission",
			"rate-limit": "hub.ai.reason.rateLimit",
			"invalid-input": "hub.ai.reason.invalid",
			empty: "hub.ai.reason.empty",
			disabled: "hub.ai.reason.disabled",
			timeout: "hub.ai.reason.timeout",
			"companion-off": "hub.ai.reason.companionOff",
			"internal-error": "hub.ai.reason.internal",
		};
		/**
		 * plan A: a model call that fell back to a local reply surfaces one of these
		 * stable codes (44 maps them for the bubble; the hub keeps its own copy so the
		 * AI card still explains a fallback in a stripped harness without 44).
		 */
		const HUB_AI_LLM_HINT_KEYS = {
			"unconfigured-model": "hub.ai.llmHint.unconfiguredModel",
			"missing-credential": "hub.ai.llmHint.missingCredential",
			quota: "hub.ai.llmHint.quota",
			"rate-limit": "hub.ai.llmHint.rateLimit",
			timeout: "hub.ai.llmHint.timeout",
			"host-unavailable": "hub.ai.llmHint.hostUnavailable",
			default: "hub.ai.llmHint.default",
		};
		/** Host capability reasons (`status.llm.host.reason`) → AI card adapter line. */
		const HUB_AI_HOST_REASON_KEYS = {
			"unconfigured-model": "hub.ai.host.unconfigured-model",
			"no-default-model": "hub.ai.host.unconfigured-model",
			"no-llm-service": "hub.ai.host.no-llm-service",
			"no-providers": "hub.ai.host.no-providers",
			"host-unavailable": "hub.ai.host.host-unavailable",
			unknown: "hub.ai.host.unknown",
		};
		/** Cap on `<select>` provider options (a pathological host list must not flood). */
		const HUB_LLM_PROVIDERS_MAX = 20;
		/** v1.6.8 thinking engine: allowed intervals (mirrors tianlightPetMind). */
		const HUB_MIND_INTERVALS = [5, 10, 15, 30];
		/** Every refusal/skip reason the thinking engine can return. */
		const HUB_MIND_REASON_KEYS = {
			paused: "hub.mind.reason.paused",
			disabled: "hub.mind.reason.disabled",
			hidden: "hub.mind.reason.hidden",
			lowpower: "hub.mind.reason.lowpower",
			"low-power": "hub.mind.reason.lowpower",
			busy: "hub.mind.reason.busy",
			denied: "hub.mind.reason.denied",
			"proactive-denied": "hub.mind.reason.denied",
			"quiet-hours": "hub.mind.reason.quiet",
			asleep: "hub.mind.reason.asleep",
			focus: "hub.mind.reason.focus",
			"llm-budget": "hub.mind.reason.llmBudget",
			cooldown: "hub.mind.reason.cooldown",
			"internal-error": "hub.mind.reason.internal",
			internal: "hub.mind.reason.internal",
		};
		/** `[data-tl-hub-agent-target]` value for "create a new pet session". */
		const HUB_AGENT_TARGET_NEW = "__new__";
		const HUB_AGENT_REASON_KEYS = {
			unavailable: "hub.agent.reason.unavailable",
			"agent-unavailable": "hub.agent.reason.unavailable",
			"not-authorized": "hub.agent.reason.permission",
			"agent-permission": "hub.agent.reason.permission",
			permission: "hub.agent.reason.permission",
			"not-connected": "hub.agent.reason.notConnected",
			"no-session": "hub.agent.reason.notConnected",
			"session-required": "hub.agent.reason.sessionRequired",
			"unknown-session": "hub.agent.reason.unknownSession",
			"create-failed": "hub.agent.reason.createFailed",
			"connect-failed": "hub.agent.reason.connectFailed",
			"list-failed": "hub.agent.reason.listFailed",
			"workspace-unavailable": "hub.agent.reason.workspaceUnavailable",
			"daily-quota": "hub.agent.reason.dailyQuota",
			budget: "hub.agent.reason.budget",
			quota: "hub.agent.reason.budget",
			busy: "hub.agent.reason.busy",
			paused: "hub.agent.reason.paused",
			"rate-limit": "hub.agent.reason.rateLimited",
			"rate-limited": "hub.agent.reason.rateLimited",
			"invalid-input": "hub.agent.reason.invalidInput",
			empty: "hub.agent.reason.invalidInput",
			"prompt-rejected": "hub.agent.reason.promptRejected",
			"prompt-failed": "hub.agent.reason.promptFailed",
			"send-failed": "hub.agent.reason.sendFailed",
			"internal-error": "hub.agent.reason.internal",
		};
		const HUB_AGENT_GRANT_REASON_KEYS = {
			"unknown-capability": "hub.agent.reason.unknownCap",
			"hard-denied": "hub.agent.reason.hardDenied",
			"consent-required": "hub.agent.reason.consent",
			"internal-error": "hub.agent.reason.internal",
		};

		function hubLifeEngine() {
			try {
				return globalThis.tianlightLife !== null && globalThis.tianlightLife !== undefined ? globalThis.tianlightLife : null;
			} catch {
				return null;
			}
		}

		/**
		 * R4A: the UI reads the brain through the same-closure bridge, not
		 * `globalThis.tianlightPet` (a same-page script can replace that global).
		 * Falls back to the documented global only in a stripped harness where the
		 * brain fragment is absent.
		 */
		function hubPetBrain() {
			try {
				if (typeof petBrainInternal !== "undefined" && petBrainInternal !== null) return petBrainInternal;
			} catch {
				// TDZ / stripped harness: fall through to the global
			}
			try {
				return globalThis.tianlightPet !== null && globalThis.tianlightPet !== undefined ? globalThis.tianlightPet : null;
			} catch {
				return null;
			}
		}

		/** v1.6.8 private-thinking engine; prefer the same-closure brain bridge (S1). */
		function hubPetMind() {
			try {
				const brain = hubPetBrain();
				if (brain !== null && brain.mind !== undefined && brain.mind !== null && typeof brain.mind.status === "function") {
					return brain.mind;
				}
			} catch {
				// fall through to the documented global in a stripped harness
			}
			try {
				return globalThis.tianlightPetMind !== null && globalThis.tianlightPetMind !== undefined ? globalThis.tianlightPetMind : null;
			} catch {
				return null;
			}
		}

		/**
		 * The v1.2.0 experimental DSH Agent bridge (src/48-pet-agent.js). R4A: read
		 * the same-closure `petAgentInternal` object (privileged methods live only
		 * there); `globalThis.tianlightPetAgent` is now a frozen read-only status
		 * surface and is never used for connect/list/chat.
		 */
		function hubPetAgent() {
			try {
				if (typeof petAgentInternal !== "undefined" && petAgentInternal !== null) return petAgentInternal;
			} catch {
				// TDZ / stripped harness: fall through to the read-only global
			}
			try {
				return globalThis.tianlightPetAgent !== null && globalThis.tianlightPetAgent !== undefined ? globalThis.tianlightPetAgent : null;
			} catch {
				return null;
			}
		}

		/**
		 * v1.6.4 per-look action packs: the companion (src/40-companion.js) publishes
		 * `globalThis.tianlightPetActions = { get(mediaId), set(mediaId, pack), clear(mediaId) }`.
		 * Optional: an older companion simply has no editor.
		 */
		function hubPetActions() {
			try {
				return globalThis.tianlightPetActions !== null && globalThis.tianlightPetActions !== undefined ? globalThis.tianlightPetActions : null;
			} catch {
				return null;
			}
		}

		/** The v1.5.0 weather controller bridge (`globalThis.tianlightWeather`); optional. */
		function hubWeather() {
			try {
				return globalThis.tianlightWeather !== null && globalThis.tianlightWeather !== undefined ? globalThis.tianlightWeather : null;
			} catch {
				return null;
			}
		}

		/** The glass depth controller is a closure `let` in src/57-glass.js (null before install). */
		function hubGlassDepthController() {
			try {
				return glassDepthController !== null && glassDepthController !== undefined ? glassDepthController : null;
			} catch {
				return null;
			}
		}

		/** Browser window, or null in a Node/SSR-ish run: every window use is guarded. */
		function hubBrowserWindow() {
			try {
				return typeof window !== "undefined" && window !== null ? window : null;
			} catch {
				return null;
			}
		}

		/** Call an optional runtime hook; never let a dependency throw through the UI. */
		function hubTry(fn, fallback, stage) {
			try {
				return fn();
			} catch (error) {
				if (stage !== undefined) note(stage, error);
				return fallback;
			}
		}

		/**
		 * R8 (REV-R4A F2): a synthetic (script-dispatched) click is not user consent.
		 * Real clicks have isTrusted=true; `element.click()` from a page script does not.
		 * Only the consent/Agent-connect/Agent-send entry points consult this — the
		 * product's own composer is untouched.
		 */
		function isSyntheticUserEvent(event) {
			return event !== undefined && event !== null && event.isTrusted === false;
		}

		/** Is the medium `agentChat` capability granted? Agent status is authoritative. */
		function hubAgentPermission(status) {
			if (status !== null && typeof status === "object" && typeof status.permission === "boolean") return status.permission;
			const pet = hubPetBrain();
			if (pet === null || typeof pet.permissions !== "function") return false;
			const rows = hubTry(() => pet.permissions(), null, "agent-permission");
			if (!Array.isArray(rows)) return false;
			const row = rows.find((entry) => entry !== null && typeof entry === "object" && entry.id === "agentChat");
			return row !== null && row !== undefined && row.granted === true;
		}

		function hubPeriodLabel(period) {
			const key = HUB_PERIOD_KEYS[period];
			return key === undefined ? TL_T("hub.period.unknown") : TL_T(key);
		}

		function hubGlassLabel(level) {
			const key = HUB_GLASS_LABEL_KEYS[level];
			return key === undefined ? TL_T("hub.unavailable") : TL_T(key);
		}

		function hubReasonLabel(reason, keyMap, fallbackKey) {
			const text = typeof reason === "string" ? reason : "";
			if (text === "") return TL_T(fallbackKey ?? "hub.ai.reason.default");
			if (keyMap !== undefined && keyMap[text] !== undefined) return TL_T(keyMap[text]);
			return text;
		}

		/** Extract the LLM adapter id from a pet status object (shape is adapter-agnostic). */
		function hubAdapterId(status) {
			if (status === null || typeof status !== "object") return null;
			const candidates = [
				status.adapter !== null && typeof status.adapter === "object" ? status.adapter.id : undefined,
				status.llm !== null && typeof status.llm === "object" ? status.llm.adapter !== null && typeof status.llm.adapter === "object" ? status.llm.adapter.id : undefined : undefined,
				status.llm !== null && typeof status.llm === "object" ? status.llm.adapterId : undefined,
				status.adapterId,
				status.llmAdapterId,
				status.llmAdapter !== null && typeof status.llmAdapter === "object" ? status.llmAdapter.id : undefined,
			];
			for (const candidate of candidates) {
				if (typeof candidate === "string" && candidate !== "") return candidate;
			}
			return null;
		}

		function hubClock(at) {
			const value = Number(at);
			if (!Number.isFinite(value) || value <= 0) return "—";
			try {
				return new Date(value).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
			} catch {
				return "—";
			}
		}

		function hubDateTime(at) {
			const value = Number(at);
			if (!Number.isFinite(value) || value <= 0) return "—";
			try {
				return new Date(value).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
			} catch {
				return "—";
			}
		}

		/**
		 * Skin/host identity for feedback payloads. Diagnostic instance first, then
		 * the host build reported on `_engines` (the client no longer carries a build
		 * marker of its own), then the route-contract marker so a report never claims
		 * a build number it did not read.
		 */
		function hubVersionString() {
			try {
				const instance = globalThis.__dshTianlightInstance;
				if (instance !== null && instance !== undefined) {
					if (typeof instance.version === "string" && instance.version !== "") return instance.version;
					if (typeof instance.build === "string" && instance.build !== "") return instance.build;
				}
			} catch {
				// diagnostics are optional
			}
			if (hostIdentity.build !== "") return hostIdentity.build;
			// R8 (REV-R1 M1): `hostIdentity.api` was previously written but never read.
			// Prefer it over the compiled HOST_API fallback so a report names the API the
			// host actually reported, not just the contract this client was built with.
			if (typeof hostIdentity.api === "string" && hostIdentity.api !== "") return "api " + hostIdentity.api;
			try {
				if (typeof HOST_API === "string" && HOST_API !== "") return "api " + HOST_API;
			} catch {
				// the constant may be absent in a stripped harness
			}
			return "unknown";
		}

		/** Normalize the documented v1.5 weather snapshot (never throws). */
		function hubWeatherSnapshot(weather) {
			const controller = weather !== null && weather !== undefined ? weather : hubWeather();
			if (controller === null) return null;
			const snapshot = hubTry(() => (typeof controller.summary === "function" ? controller.summary() : null), null, "weather-summary");
			if (snapshot === null || typeof snapshot !== "object") return null;
			const last = snapshot.last !== null && typeof snapshot.last === "object" ? snapshot.last : null;
			return {
				enabled: snapshot.enabled === true,
				hasLocation: snapshot.hasLocation === true,
				runtime: snapshot.runtime === true,
				last,
				text: typeof snapshot.text === "string" ? snapshot.text : "",
				error: typeof snapshot.error === "string" ? snapshot.error : "",
				updatedAt: Number.isFinite(snapshot.updatedAt) ? snapshot.updatedAt : null,
			};
		}

		/** Clipboard write with a textarea fallback (both paths are best effort). */
		async function hubCopyText(text) {
			const payload = typeof text === "string" ? text : String(text ?? "");
			try {
				const navigatorRef = typeof navigator !== "undefined" ? navigator : null;
				if (navigatorRef !== null && navigatorRef.clipboard !== null && navigatorRef.clipboard !== undefined && typeof navigatorRef.clipboard.writeText === "function") {
					await navigatorRef.clipboard.writeText(payload);
					return true;
				}
			} catch {
				// fall through to the textarea path
			}
			try {
				const doc = typeof document !== "undefined" && document !== null ? document : null;
				if (doc === null || doc.body === null || doc.body === undefined) return false;
				const area = doc.createElement("textarea");
				area.value = payload;
				area.setAttribute("readonly", "");
				area.className = "tl-hub-copy-fallback";
				doc.body.appendChild(area);
				try {
					if (typeof area.select === "function") area.select();
					if (typeof area.setSelectionRange === "function") area.setSelectionRange(0, payload.length);
				} catch {
					// selection is best effort
				}
				let copied = false;
				try {
					copied = typeof doc.execCommand === "function" ? doc.execCommand("copy") === true : false;
				} catch {
					copied = false;
				}
				area.remove();
				return copied;
			} catch {
				return false;
			}
		}

		/** Download a JSON payload (Blob + object URL, always revoked). */
		function hubDownloadJson(payload, filename) {
			try {
				const doc = typeof document !== "undefined" && document !== null ? document : null;
				const BlobCtor = typeof Blob !== "undefined" ? Blob : null;
				const URLApi = typeof URL !== "undefined" ? URL : null;
				if (doc === null || BlobCtor === null || URLApi === null || typeof URLApi.createObjectURL !== "function") {
					return { ok: false, reason: "unsupported" };
				}
				const text = JSON.stringify(payload, null, 2);
				const blob = new BlobCtor([text], { type: "application/json" });
				const url = URLApi.createObjectURL(blob);
				let anchor = null;
				try {
					anchor = doc.createElement("a");
					anchor.href = url;
					anchor.download = filename;
					anchor.rel = "noopener";
					if (doc.body !== null && doc.body !== undefined) doc.body.appendChild(anchor);
					if (typeof anchor.click === "function") anchor.click();
					return { ok: true, name: filename };
				} finally {
					try {
						if (anchor !== null && typeof anchor.remove === "function") anchor.remove();
					} catch {
						// node already gone
					}
					try {
						URLApi.revokeObjectURL(url);
					} catch {
						// revoke is best effort
					}
				}
			} catch (error) {
				return { ok: false, reason: String(error?.message ?? error) };
			}
		}

		/**
		 * Normalize chat() results from the parallel pet-brain implementation. The
		 * documented contract is `chat(text)`, and the UI accepts both a plain string
		 * reply and `{ok,text,source,denied,reason,llmError}` so the hub is not coupled
		 * to one internal return shape. `llmError` is the stable code of a failed model
		 * call whose turn fell back to a local reply (plan A); it is always a string
		 * here so the AI card can show the matching hint.
		 */
		function hubChatResult(result) {
			if (typeof result === "string") {
				return { ok: result !== "", text: result, source: "local", reason: "", llmError: "" };
			}
			if (result === null || typeof result !== "object") {
				return { ok: false, text: "", source: "denied", reason: "internal-error", llmError: "" };
			}
			const text = typeof result.text === "string" ? result.text : typeof result.reply === "string" ? result.reply : typeof result.message === "string" ? result.message : "";
			const denied = result.denied === true || result.ok === false || (text === "" && result.ok !== true);
			const source = denied === true ? "denied" : typeof result.source === "string" && result.source !== "" ? result.source : "local";
			const reason = typeof result.reason === "string" ? result.reason : "";
			const llmError = typeof result.llmError === "string" && result.llmError !== "" ? result.llmError : "";
			return { ok: denied === false, text, source, reason, llmError };
		}

		/** Small DOM factory for the overlay (plain DOM; no React inside the dialog). */
		function hubCreate(tag, attrs, children) {
			const node = document.createElement(tag);
			if (attrs !== null && typeof attrs === "object") {
				for (const name of Object.keys(attrs)) {
					const value = attrs[name];
					if (value === undefined || value === null || value === false) continue;
					if (name === "text") node.textContent = String(value);
					else if (name === "className") node.className = String(value);
					else if (name === "value") node.value = value;
					else if (name === "onClick" && typeof value === "function") node.addEventListener("click", value);
					else if (name === "onChange" && typeof value === "function") node.addEventListener("change", value);
					else if (name === "onKeyDown" && typeof value === "function") node.addEventListener("keydown", value);
					else node.setAttribute(name, value === true ? "" : String(value));
				}
			}
			if (Array.isArray(children)) {
				for (const child of children) {
					if (child !== null && child !== undefined) node.appendChild(child);
				}
			} else if (children !== undefined && children !== null) {
				node.textContent = String(children);
			}
			return node;
		}

		//#endregion
