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
				"hub.glass.previewHint": "默认柔和；真实更明显、磨砂最安静；低电量/15fps 自动降级。",
				"hub.glass.preview": "当前：{depth} · 实际：{effective}",
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
				"hub.glass.previewHint": "Soft is the default; Real is the most visible, Frosted the quietest; auto-lowered on low power or 15fps.",
				"hub.glass.preview": "Current: {depth} · effective: {effective}",
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

		/**
		 * Install the full-screen role hub (pet menu / right-click are the entry points).
		 * Returns a disposer that closes (and fully removes) an open overlay and restores
		 * the previous `globalThis.tianlightRoleHub`.
		 */
		function installRoleHub(ctx) {
			// The hub has no DSH slots/settings entries since v1.3.0; the pet is the entry.
			// `ctx` is only used to resolve the read-only remote.llm provider catalog (plan A).
			let disposed = false;
			let openState = false;
			let rootEl = null;
			// R8c (REV-R8 F2): capture-phase click/change fence that disarms a pending
			// destructive confirmation whenever the user acts anywhere else in the hub.
			let confirmCaptureDisposer = null;
			let ui = null;
			let timer = 0;
			let triggerEl = null;
			let mediaCache = null;
			let mediaBusy = false;
			/** One look switch in flight (double click / row + Apply must not race). */
			let mediaApplying = false;
			/** Effective pack last loaded by the editor (for "did this row have custom value?"). */
			let loadedPack = null;
			let chatBusy = false;
			let llmPending = false;
			// v1.6.8 autonomous-thinking card state (read-through only).
			let mindBusy = false;
			let lastError = "";
			// v1.2.0 experimental agent card state (all read-through, no second source).
			let agentStatusCache = null;
			let agentPermPending = false;
			let agentBusy = false;
			let agentTargetSignature = "";
			// The bridge returns the session catalog from refreshSessions() (status keeps
			// only the connected session), so cache the last successful listing here.
			let agentSessionsCache = [];
			// v1.4.0 permission rows that are armed for their second consent click.
			const permConfirmPending = new Map();
			// R5 destructive actions use the same "click twice" arming pattern.
			let packResetPending = false;
			let mindClearPending = false;
			// R8b (REV-R5 6): an armed destructive confirmation expires after 5s, and any
			// other card action disarms it — so "arm, then click elsewhere, then click the
			// same button once" can never execute a destructive action by accident.
			let packResetArmTimer = 0;
			let mindClearArmTimer = 0;
			// True while the rhythm card holds edits not yet applied (draft protection).
			let lifeDraftActive = false;
			// The shared overlay stack disposes through this handle.
			let overlayDisposer = null;
			// v1.5.0 weather / selftest state.
			let weatherBusy = false;
			let selftestBusy = false;
			const selftestResults = [];
			const logEntries = [];

			const setLastError = (stage, error) => {
				lastError = String(error?.message ?? error);
				note("role-hub:" + stage, error);
			};
			/** Run an async UI task without ever leaving an unhandled rejection behind. */
			const runAsync = (task) => {
				try {
					const result = task();
					if (result !== null && result !== undefined && typeof result.catch === "function") {
						result.catch((error) => setLastError("async", error));
					}
				} catch (error) {
					setLastError("async-sync", error);
				}
			};

			// ---- plan A: DSH LLM provider read (the hub only chooses a provider) ----
			// `remote.llm` is a READ-ONLY client remote namespace mounted asynchronously
			// by api-remotes, so an eager ctx.get() at apply() time is usually undefined.
			// The legal ways in mirror the existing remote.session resolver: the dotted
			// "remote.llm" service key, the injected scope (+ scoped.remote.llm), or the
			// guarded "remote" context property. Exactly one remote method is ever called:
			// listProviders() — no model/session/prompt method is reachable from here.
			let hubLlmServiceScope = null;
			let hubLlmRemoteScope = null;
			const hubLlmInjectDisposers = [];
			/** `{ ok, providers, reason }` of the first read; null until it completes. */
			let hubLlmProvidersCache = null;
			let hubLlmProvidersBusy = false;
			/** Signature guard: rebuild `<select>` options only when the data changed. */
			let hubLlmProviderSignature = "";
			try {
				if (ctx !== null && ctx !== undefined && typeof ctx.inject === "function") {
					hubLlmInjectDisposers.push(
						ctx.inject(["remote.llm"], (scoped) => {
							hubLlmServiceScope = scoped;
							return () => {
								hubLlmServiceScope = null;
							};
						}),
					);
					hubLlmInjectDisposers.push(
						ctx.inject(["remote"], (scoped) => {
							hubLlmRemoteScope = scoped;
							return () => {
								hubLlmRemoteScope = null;
							};
						}),
					);
				}
			} catch (error) {
				note("role-hub:llm-inject", error);
			}
			const hubHasListProviders = (candidate) =>
				candidate !== null && candidate !== undefined && typeof candidate.listProviders === "function";
			/** The `remote.llm` namespace, or null when no resolution path answers (plan A). */
			const hubRemoteLlm = () => {
				// 1) the dotted service key, when the loader already mounted it
				try {
					const direct = ctx !== null && ctx !== undefined && typeof ctx.get === "function" ? ctx.get("remote.llm") : undefined;
					if (hubHasListProviders(direct)) return direct;
				} catch (error) {
					note("role-hub:llm-get", error);
				}
				// 2) the injected "remote.llm" scope: scoped.get(...) then scoped.remote.llm
				if (hubLlmServiceScope !== null) {
					try {
						const scopedDirect = typeof hubLlmServiceScope.get === "function" ? hubLlmServiceScope.get("remote.llm") : undefined;
						if (hubHasListProviders(scopedDirect)) return scopedDirect;
					} catch (error) {
						note("role-hub:llm-scoped-get", error);
					}
					try {
						const scopedRemote = hubLlmServiceScope.remote?.llm;
						if (hubHasListProviders(scopedRemote)) return scopedRemote;
					} catch (error) {
						note("role-hub:llm-scoped-remote", error);
					}
				}
				// 3) the injected "remote" scope: scoped.remote.llm
				if (hubLlmRemoteScope !== null) {
					try {
						const scopedRemote = hubLlmRemoteScope.remote?.llm;
						if (hubHasListProviders(scopedRemote)) return scopedRemote;
					} catch (error) {
						note("role-hub:llm-remote-scope", error);
					}
				}
				// 4) the guarded "remote" context property: ctx.get("remote")?.llm
				try {
					const remote = ctx !== null && ctx !== undefined && typeof ctx.get === "function" ? ctx.get("remote") : undefined;
					if (hubHasListProviders(remote?.llm)) return remote.llm;
				} catch (error) {
					note("role-hub:llm-remote-get", error);
				}
				// 5) page-plugin contexts expose the namespace directly (`ctx.remote.llm`),
				// which is how the shipped settings section reads the provider directory.
				try {
					const directRemote = ctx !== null && ctx !== undefined ? ctx.remote?.llm : undefined;
					if (hubHasListProviders(directRemote)) return directRemote;
				} catch (error) {
					note("role-hub:llm-ctx-remote", error);
				}
				return null;
			};
			/**
			 * Read the provider catalog. Never rejects and never throws: a missing
			 * namespace or a host-side refusal degrades to `{ok:false}` so the picker can
			 * honestly fall back to "follow the DSH default model" only.
			 */
			const hubListProviders = async () => {
				const remoteLlm = hubRemoteLlm();
				if (remoteLlm === null) return { ok: false, providers: [], reason: "unavailable" };
				let result = null;
				try {
					result = await remoteLlm.listProviders();
				} catch (error) {
					note("role-hub:llm-providers", error);
					return { ok: false, providers: [], reason: "error" };
				}
				if (result !== null && typeof result === "object" && result.ok === false) {
					return { ok: false, providers: [], reason: typeof result.reason === "string" && result.reason !== "" ? result.reason : "unavailable" };
				}
				// Accepted shapes: a bare array, `{value:[...]}` (remote RPC envelope), or
				// a tolerant `{providers:[...]}`. Anything else is a failed read.
				const raw = Array.isArray(result) ? result : Array.isArray(result?.value) ? result.value : Array.isArray(result?.providers) ? result.providers : null;
				if (raw === null) return { ok: false, providers: [], reason: "unexpected-result" };
				const seen = new Set();
				const providers = [];
				for (const entry of raw) {
					if (entry === null || typeof entry !== "object") continue;
					const id = typeof entry.id === "string" ? entry.id.trim() : "";
					if (id === "" || seen.has(id)) continue;
					seen.add(id);
					const name = typeof entry.name === "string" && entry.name.trim() !== "" ? entry.name.trim() : id;
					providers.push({ id, name });
					if (providers.length >= HUB_LLM_PROVIDERS_MAX) break;
				}
				return { ok: true, providers, reason: "" };
			};
			/** Localized fallback hint for a model-failure code; 44 owns the shared copy. */
			const hubLlmHintText = (code) => {
				if (typeof code !== "string" || code === "") return "";
				try {
					if (typeof petLlmHintText === "function") {
						const shared = petLlmHintText(code);
						if (typeof shared === "string" && shared !== "") return shared;
					}
				} catch (error) {
					note("role-hub:llm-hint", error);
				}
				const kind = Object.prototype.hasOwnProperty.call(HUB_AI_LLM_HINT_KEYS, code) ? code : "default";
				return TL_T(HUB_AI_LLM_HINT_KEYS[kind]);
			};

			// ---- R8b (REV-R5 6): destructive-confirm arming with expiry -----------------
			const CONFIRM_ARM_TIMEOUT_MS = 5000;
			const disarmPackReset = () => {
				if (packResetArmTimer !== 0) {
					window.clearTimeout(packResetArmTimer);
					packResetArmTimer = 0;
				}
				packResetPending = false;
				if (ui !== null && ui.packReset !== null && ui.packReset !== undefined) {
					ui.packReset.textContent = TL_T("hub.media.pack.reset");
					ui.packReset.removeAttribute("data-tl-hub-confirm");
				}
			};
			const disarmMindClear = () => {
				if (mindClearArmTimer !== 0) {
					window.clearTimeout(mindClearArmTimer);
					mindClearArmTimer = 0;
				}
				mindClearPending = false;
				if (ui !== null && ui.mindClear !== null && ui.mindClear !== undefined) {
					ui.mindClear.textContent = TL_T("hub.mind.clear");
					ui.mindClear.removeAttribute("data-tl-hub-confirm");
				}
			};
			/** Disarm both destructive confirmations (any other card action calls this). */
			const disarmPendingConfirms = () => {
				if (packResetPending === true) disarmPackReset();
				if (mindClearPending === true) disarmMindClear();
			};
			const armPackReset = () => {
				packResetPending = true;
				if (packResetArmTimer !== 0) window.clearTimeout(packResetArmTimer);
				packResetArmTimer = window.setTimeout(() => {
					packResetArmTimer = 0;
					disarmPackReset();
				}, CONFIRM_ARM_TIMEOUT_MS);
				if (ui !== null && ui.packReset !== null && ui.packReset !== undefined) {
					ui.packReset.textContent = TL_T("hub.media.pack.resetConfirm");
					ui.packReset.setAttribute("data-tl-hub-confirm", "true");
				}
				setPackStatus(TL_T("hub.media.pack.resetConfirmNote"));
			};
			const armMindClear = () => {
				mindClearPending = true;
				if (mindClearArmTimer !== 0) window.clearTimeout(mindClearArmTimer);
				mindClearArmTimer = window.setTimeout(() => {
					mindClearArmTimer = 0;
					disarmMindClear();
				}, CONFIRM_ARM_TIMEOUT_MS);
				if (ui !== null && ui.mindClear !== null && ui.mindClear !== undefined) {
					ui.mindClear.textContent = TL_T("hub.mind.clearConfirm");
					ui.mindClear.setAttribute("data-tl-hub-confirm", "true");
				}
				setMindNote(TL_T("hub.mind.clearConfirmNote"));
			};

			// ---- close / focus / Esc ------------------------------------------------
			const restoreFocus = (target) => {
				if (target === null || target === undefined || typeof target.focus !== "function") return;
				try {
					target.focus();
				} catch {
					// focus is best effort
				}
			};
			const close = () => {
				// R5: closing (Esc included) persists unfinished chat / rhythm edits first, so
				// a single Esc can never silently discard them; reopening restores the draft.
				saveHubDraft();
				// R8b (REV-R5 6): closing also clears the destructive-confirm timers/arms.
				if (packResetArmTimer !== 0) {
					window.clearTimeout(packResetArmTimer);
					packResetArmTimer = 0;
				}
				if (mindClearArmTimer !== 0) {
					window.clearTimeout(mindClearArmTimer);
					mindClearArmTimer = 0;
				}
				lifeDraftActive = false;
				llmPending = false;
				agentPermPending = false;
				agentBusy = false;
				chatBusy = false;
				mindBusy = false;
				mediaApplying = false;
				loadedPack = null;
				packResetPending = false;
				mindClearPending = false;
				permConfirmPending.clear();
				const win = hubBrowserWindow();
				if (timer !== 0) {
					if (win !== null) win.clearInterval(timer);
					timer = 0;
				}
				const previousFocus = triggerEl;
				triggerEl = null;
				// R8c (REV-R8 F2): the capture fence lives exactly as long as the panel.
				if (confirmCaptureDisposer !== null) {
					try {
						confirmCaptureDisposer();
					} catch {
						// the panel DOM is going away anyway
					}
					confirmCaptureDisposer = null;
				}
				if (rootEl !== null) {
					try {
						rootEl.remove();
					} catch (error) {
						setLastError("close-remove", error);
					}
					rootEl = null;
				}
				ui = null;
				openState = false;
				// R5: leave the shared stack; if another layer was registered on top of the
				// hub in the meantime, removing this entry keeps that layer's position.
				if (overlayDisposer !== null) {
					try {
						overlayDisposer();
					} catch {
						// the stack is already torn down
					}
					overlayDisposer = null;
				}
				// Reopening the hub builds a fresh <select>; the cached render signature
				// must not suppress the first fill (v1.2 A73 regression guard).
				agentTargetSignature = "";
				// plan A: same guard for the provider picker built by the new overlay. The
				// provider-list result stays cached (one read per install, not per open).
				hubLlmProviderSignature = "";
				try {
					if (typeof document !== "undefined" && document !== null && document.body !== null && document.body !== undefined) {
						document.body.removeAttribute("data-tl-hub-open");
					}
				} catch (error) {
					setLastError("close-attr", error);
				}
				restoreFocus(previousFocus);
			};

			// ---- status card --------------------------------------------------------
			const refreshFocusButton = (status) => {
				if (ui === null) return;
				const life = hubLifeEngine();
				const button = ui.focusButton;
				if (life === null) {
					button.disabled = true;
					button.textContent = TL_T("hub.focus.start");
					return;
				}
				button.disabled = false;
				const active = hubTry(() => life.focusStatus?.()?.active === true, false, "focus-status");
				button.textContent = active ? TL_T("hub.focus.stop") : TL_T("hub.focus.start");
				button.setAttribute("data-tl-hub-focus-active", active === true ? "true" : "false");
			};
			const refreshMuteButton = (status) => {
				if (ui === null) return;
				const life = hubLifeEngine();
				const button = ui.muteButton;
				if (life === null) {
					button.disabled = true;
					button.textContent = TL_T("hub.mute.start");
					return;
				}
				button.disabled = false;
				const muted = status !== null && typeof status === "object" && Number.isFinite(status.mutedUntil) && status.mutedUntil > Date.now();
				button.textContent = muted ? TL_T("hub.mute.active") : TL_T("hub.mute.start");
			};
			const refreshStatus = () => {
				if (ui === null) return;
				const life = hubLifeEngine();
				const status = life !== null ? hubTry(() => life.status?.(), null, "life-status") : null;
				const pet = hubPetBrain();
				const petStatus = pet !== null ? hubTry(() => pet.status?.(), null, "pet-status") : null;
				ui.statusNote.textContent = status === null ? TL_T("hub.status.unavailable") : "";
				ui.statusCard.setAttribute("data-tl-hub-status-ready", status === null ? "false" : "true");
				if (status !== null) {
					ui.periodValue.textContent = hubPeriodLabel(status.period);
					ui.awakeValue.textContent = status.awake === true ? TL_T("hub.awake.yes") : TL_T("hub.awake.no");
					ui.quietValue.textContent = status.quiet === true ? TL_T("hub.quiet.on") : TL_T("hub.quiet.off");
					const budget = status.budget !== null && typeof status.budget === "object" ? status.budget : {};
					const used = Number.isFinite(budget.used) ? Math.max(0, Math.floor(budget.used)) : 0;
					const cap = Number.isFinite(budget.cap) ? Math.max(0, Math.floor(budget.cap)) : 0;
					ui.budgetValue.textContent = used + "/" + cap;
					const memory = status.memory !== null && typeof status.memory === "object" ? status.memory : {};
					const streak = Number.isFinite(memory.streakDays) ? Math.max(0, Math.floor(memory.streakDays)) : 0;
					ui.streakValue.textContent = TL_T("hub.unit.days", { n: streak });
				} else {
					for (const value of [ui.periodValue, ui.awakeValue, ui.quietValue, ui.budgetValue, ui.streakValue]) value.textContent = "—";
				}
				let aiState = TL_T("hub.ai.unavailable");
				if (pet !== null) aiState = petStatus !== null && petStatus.paused === true ? TL_T("hub.ai.pausedNote") : TL_T("hub.ai.ready");
				ui.aiValue.textContent = aiState;
				refreshFocusButton(status);
				refreshMuteButton(status);
			};

			// ---- life rhythm settings (absorbed from the deleted settings page) ----
			const setLifeNote = (text) => {
				if (ui !== null && ui.lifeNote !== null && ui.lifeNote !== undefined) ui.lifeNote.textContent = text;
			};
			const lifeConfigInputs = () => {
				if (ui === null) return [];
				return [ui.lifeQuietEnabled, ui.lifeQuietStart, ui.lifeQuietEnd, ui.lifeBudget, ui.lifeWake, ui.lifeSleep, ui.lifeVirtual, ui.lifeApply].filter(
					(input) => input !== null && input !== undefined,
				);
			};
			/** True while the user is typing in one of the rhythm inputs (4s tick skips it). */
			const isLifeConfigEditing = () => {
				try {
					if (ui === null) return false;
					const active = typeof document !== "undefined" && document !== null ? document.activeElement : null;
					if (active === null || active === undefined) return false;
					return lifeConfigInputs().some((input) => input === active);
				} catch {
					return false;
				}
			};
			const refreshLifeConfig = (force) => {
				if (ui === null) return;
				const life = hubLifeEngine();
				const inputs = lifeConfigInputs();
				if (life === null) {
					for (const input of inputs) input.disabled = true;
					if (ui.lifeMemory !== null && ui.lifeMemory !== undefined) ui.lifeMemory.textContent = "";
					setLifeNote(TL_T("hub.life.unavailable"));
					return;
				}
				if (force !== true && (isLifeConfigEditing() || lifeDraftActive === true)) return;
				const status = hubTry(() => life.status?.(), null, "life-config-status");
				const config = status !== null && typeof status === "object" && status.config !== null && typeof status.config === "object" ? status.config : null;
				if (config === null) {
					for (const input of inputs) input.disabled = true;
					setLifeNote(TL_T("hub.life.unavailable"));
					return;
				}
				for (const input of inputs) input.disabled = false;
				const quiet = config.quiet !== null && typeof config.quiet === "object" ? config.quiet : {};
				ui.lifeQuietEnabled.checked = quiet.enabled !== false;
				ui.lifeQuietStart.value = typeof quiet.start === "string" ? quiet.start : "23:00";
				ui.lifeQuietEnd.value = typeof quiet.end === "string" ? quiet.end : "08:00";
				ui.lifeBudget.value = String(Number.isFinite(config.cap) ? Math.max(0, Math.min(50, Math.round(config.cap))) : 12);
				ui.lifeWake.value = typeof config.wake === "string" ? config.wake : "08:00";
				ui.lifeSleep.value = typeof config.sleep === "string" ? config.sleep : "23:00";
				ui.lifeVirtual.value = String(Number.isFinite(config.virtualOffsetMinutes) ? Math.max(-720, Math.min(720, Math.round(config.virtualOffsetMinutes))) : 0);
				const memory = status.memory !== null && typeof status.memory === "object" ? status.memory : {};
				const numberOrZero = (value) => (Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0);
				ui.lifeMemory.textContent =
					TL_T("hub.life.memory", {
						interactions: numberOrZero(memory.interactions),
						pats: numberOrZero(memory.pats),
						feeds: numberOrZero(memory.feeds),
						plays: numberOrZero(memory.plays),
						streak: numberOrZero(memory.streakDays),
					}) +
					" · " +
					TL_T("hub.life.lastSeen", { time: hubDateTime(memory.lastSeenAt) });
			};
			const applyLifeConfig = () => {
				disarmPendingConfirms();
				const life = hubLifeEngine();
				if (ui === null) return;
				if (life === null || typeof life.configure !== "function") {
					setLifeNote(TL_T("hub.life.unavailable"));
					return;
				}
				const timeOk = (value) => typeof value === "string" && /^\d{2}:\d{2}$/.test(value);
				let invalid = false;
				const patch = { quiet: { enabled: ui.lifeQuietEnabled.checked === true } };
				const quietStart = String(ui.lifeQuietStart.value ?? "");
				if (timeOk(quietStart)) patch.quiet.start = quietStart;
				else invalid = true;
				const quietEnd = String(ui.lifeQuietEnd.value ?? "");
				if (timeOk(quietEnd)) patch.quiet.end = quietEnd;
				else invalid = true;
				const budget = Number(ui.lifeBudget.value);
				if (Number.isFinite(budget) && budget >= 0 && budget <= 50) patch.budgetDaily = Math.round(budget);
				else invalid = true;
				const wake = String(ui.lifeWake.value ?? "");
				if (timeOk(wake)) patch.wake = wake;
				else invalid = true;
				const sleep = String(ui.lifeSleep.value ?? "");
				if (timeOk(sleep)) patch.sleep = sleep;
				else invalid = true;
				const virtual = Number(ui.lifeVirtual.value);
				if (Number.isFinite(virtual) && virtual >= -720 && virtual <= 720) patch.virtualOffsetMinutes = Math.round(virtual);
				else invalid = true;
				try {
					life.configure(patch);
				} catch (error) {
					setLastError("life-configure", error);
					setLifeNote(TL_T("hub.life.invalid"));
					return;
				}
				setLifeNote(invalid === true ? TL_T("hub.life.invalid") : TL_T("hub.life.saved"));
				if (invalid !== true) {
					lifeDraftActive = false;
					clearHubLifeDraft();
				}
				refreshStatus();
				// R5: an invalid apply must not overwrite what the user is editing with the
				// last saved config (it stays a draft); a valid apply reloads the saved values.
				refreshLifeConfig(invalid !== true);
				refreshAi();
			};

			// ---- R5 unsaved-content draft (Esc/close must never discard input) ----------
			/**
			 * Drafts live in sessionStorage on purpose: per-tab, never mirrored to the host
			 * settings store and never exported in a bundle (the localStorage settings
			 * mirror would sync a `tianlight.*` key). Surviving a reload of the same tab is
			 * enough for the close/reopen flow this protects.
			 */
			const hubDraftStorage = () => {
				try {
					const win = hubBrowserWindow();
					return win !== null && win.sessionStorage !== undefined && win.sessionStorage !== null ? win.sessionStorage : null;
				} catch {
					return null;
				}
			};
			const readHubDraft = () => {
				try {
					const storage = hubDraftStorage();
					if (storage === null) return null;
					const raw = storage.getItem(HUB_DRAFT_KEY);
					if (raw === null || raw === "") return null;
					const value = JSON.parse(raw);
					return value !== null && typeof value === "object" && Array.isArray(value) === false ? value : null;
				} catch {
					return null;
				}
			};
			const writeHubDraft = (draft) => {
				try {
					const storage = hubDraftStorage();
					if (storage === null) return;
					const chat = typeof draft?.chat === "string" ? draft.chat : "";
					const life = draft?.life !== null && typeof draft?.life === "object" ? draft.life : null;
					if (chat === "" && life === null) {
						storage.removeItem(HUB_DRAFT_KEY);
						return;
					}
					storage.setItem(HUB_DRAFT_KEY, JSON.stringify({ chat, life }));
				} catch {
					// draft persistence is best effort
				}
			};
			/** Current rhythm-input values, or null when the card is unavailable/disabled. */
			const lifeDraftNow = () => {
				if (ui === null) return null;
				const inputs = lifeConfigInputs();
				if (inputs.length === 0 || inputs.some((input) => input.disabled === true)) return null;
				return {
					quietEnabled: ui.lifeQuietEnabled.checked === true,
					quietStart: String(ui.lifeQuietStart.value ?? ""),
					quietEnd: String(ui.lifeQuietEnd.value ?? ""),
					budget: String(ui.lifeBudget.value ?? ""),
					wake: String(ui.lifeWake.value ?? ""),
					sleep: String(ui.lifeSleep.value ?? ""),
					virtual: String(ui.lifeVirtual.value ?? ""),
				};
			};
			/** Mark the rhythm card dirty (input/change listeners are attached in buildOverlay). */
			const markLifeDraft = () => {
				lifeDraftActive = true;
			};
			const saveHubDraft = () => {
				if (ui === null) return;
				const chat = typeof ui.chatInput?.value === "string" ? ui.chatInput.value.trim().slice(0, HUB_AI_INPUT_MAX) : "";
				// Only persist rhythm values the user actually touched; untouched inputs
				// mirror the engine config and would otherwise produce a false "restored".
				writeHubDraft({ chat, life: lifeDraftActive === true ? lifeDraftNow() : null });
			};
			const restoreHubDraft = () => {
				if (ui === null) return;
				const draft = readHubDraft();
				if (draft === null) return;
				let restored = false;
				if (typeof draft.chat === "string" && draft.chat !== "" && ui.chatInput !== null && ui.chatInput !== undefined) {
					ui.chatInput.value = draft.chat.slice(0, HUB_AI_INPUT_MAX);
					restored = true;
				}
				const life = draft.life !== null && typeof draft.life === "object" ? draft.life : null;
				if (life !== null) {
					const inputs = lifeConfigInputs();
					if (inputs.length > 0 && inputs.every((input) => input.disabled === false)) {
						if (typeof life.quietStart === "string") ui.lifeQuietStart.value = life.quietStart;
						if (typeof life.quietEnd === "string") ui.lifeQuietEnd.value = life.quietEnd;
						if (typeof life.wake === "string") ui.lifeWake.value = life.wake;
						if (typeof life.sleep === "string") ui.lifeSleep.value = life.sleep;
						if (typeof life.budget === "string") ui.lifeBudget.value = life.budget;
						if (typeof life.virtual === "string") ui.lifeVirtual.value = life.virtual;
						if (typeof life.quietEnabled === "boolean") ui.lifeQuietEnabled.checked = life.quietEnabled;
						lifeDraftActive = true;
						restored = true;
					}
				}
				if (restored === true) setLifeNote(TL_T("hub.draft.restored"));
			};
			/** Drop only the rhythm part after a successful save (chat draft kept). */
			const clearHubLifeDraft = () => {
				const draft = readHubDraft();
				if (draft === null) return;
				writeHubDraft({ chat: typeof draft.chat === "string" ? draft.chat : "", life: null });
			};

			// ---- glass card ---------------------------------------------------------
			const refreshGlass = () => {
				if (ui === null) return;
				const controller = hubGlassDepthController();
				let depth = "off";
				let effective = "off";
				if (controller !== null) {
					depth = hubTry(() => controller.read(), "off", "glass-read");
					effective = hubTry(() => controller.effective(), depth, "glass-effective");
				}
				for (const level of HUB_GLASS_LEVELS) {
					const button = ui.glassButtons[level];
					if (button === undefined) continue;
					button.disabled = controller === null;
					if (controller !== null && depth === level) {
						button.setAttribute("data-active", "");
						button.setAttribute("aria-pressed", "true");
					} else {
						button.removeAttribute("data-active");
						button.setAttribute("aria-pressed", "false");
					}
				}
				const syncGlassPreview = () => {
					if (ui === null || ui.glassPreview === null || ui.glassPreview === undefined) return;
					ui.glassPreview.setAttribute("data-tl-glass-preview", depth);
					ui.glassPreview.setAttribute("data-depth", depth);
					ui.glassPreview.setAttribute("data-effective", effective);
					if (ui.glassPreviewLabel !== null && ui.glassPreviewLabel !== undefined) {
						ui.glassPreviewLabel.textContent = TL_T("hub.glass.preview", { depth: hubGlassLabel(depth), effective: hubGlassLabel(effective) });
					}
				};
				if (controller === null) {
					ui.glassEffective.textContent = TL_T("hub.glass.unavailable");
					syncGlassPreview();
					return;
				}
				ui.glassEffective.textContent =
					depth === effective
						? TL_T("hub.glass.effective", { depth: hubGlassLabel(depth) })
						: TL_T("hub.glass.lowered", { depth: hubGlassLabel(depth), effective: hubGlassLabel(effective) });
				syncGlassPreview();
			};
			const applyGlass = (level) => {
				const controller = hubGlassDepthController();
				if (controller === null || typeof controller.apply !== "function") {
					if (ui !== null) ui.glassEffective.textContent = TL_T("hub.glass.unavailable");
					return;
				}
				hubTry(() => controller.apply(level), null, "glass-apply");
				refreshGlass();
			};

			// ---- media card ---------------------------------------------------------
			const setMediaStatus = (text) => {
				if (ui !== null) ui.mediaStatus.textContent = text;
			};
			const setUploadStatus = (text) => {
				if (ui !== null) ui.uploadStatus.textContent = text;
			};
			/** Media id the hub is editing now; an unfilled <select> falls back to the built-in look. */
			const currentMediaId = () => {
				if (ui === null) return "default";
				const value = ui.mediaSelect !== null && ui.mediaSelect !== undefined ? ui.mediaSelect.value : "";
				return typeof value === "string" && value !== "" ? value : "default";
			};
			/** A look switch must never overlap a catalog reload or another switch. */
			const mediaLocked = () => mediaBusy === true || mediaApplying === true;
			/** Disable/enable every filename row so a double click cannot start two switches. */
			const syncMediaRowDisabled = () => {
				if (ui === null || ui.mediaList === null || ui.mediaList === undefined) return;
				const locked = mediaLocked();
				for (const row of ui.mediaList.children) {
					if (row === null || typeof row !== "object") continue;
					row.disabled = locked;
				}
			};
			/** v1.6.4: mark the row of the *effective* look in the always-visible name list. */
			const syncMediaListSelection = (selected) => {
				if (ui === null || ui.mediaList === null || ui.mediaList === undefined) return;
				for (const row of ui.mediaList.children) {
					if (row === null || typeof row !== "object" || typeof row.getAttribute !== "function") continue;
					if (row.getAttribute("data-media-id") === selected) {
						row.setAttribute("data-selected", "");
						row.setAttribute("aria-pressed", "true");
					} else {
						row.removeAttribute("data-selected");
						row.setAttribute("aria-pressed", "false");
					}
				}
			};
			/** Re-read the life status so the selected highlight never lies. */
			const refreshMediaListSelection = () => {
				if (ui === null) return;
				const life = hubLifeEngine();
				const status = life !== null ? hubTry(() => life.status?.(), null, "media-list-status") : null;
				let selected = "default";
				if (status !== null && status.media !== null && typeof status.media === "object" && typeof status.media.id === "string") selected = status.media.id;
				syncMediaListSelection(selected);
			};
			/**
			 * v1.6.4: the always-visible look list. The native <select> options were
			 * unreadable (only the current one showed), so every look is a button row
			 * with its file name + kind/size; clicking a row applies that look through
			 * exactly the same path as the Apply button (set it on the <select> first).
			 */
			const renderMediaList = (items, selected) => {
				if (ui === null || ui.mediaList === null || ui.mediaList === undefined) return;
				const list = ui.mediaList;
				list.textContent = "";
				const appendRow = (mediaId, name, meta) => {
					const row = hubCreate("button", {
						type: "button",
						className: "tl-hub-media-row",
						"data-tl-hub-media-row": "",
						"data-media-id": mediaId,
						title: name,
						"aria-label": name,
						"aria-pressed": "false",
					});
					row.appendChild(hubCreate("span", { className: "tl-hub-media-name" }, name));
					row.appendChild(hubCreate("span", { className: "tl-hub-media-meta" }, meta));
					row.disabled = mediaLocked();
					row.addEventListener("click", () => runAsync(() => selectMediaFromList(mediaId)));
					list.appendChild(row);
				};
				appendRow("default", TL_T("hub.media.default"), "");
				for (const item of items) {
					if (item === null || typeof item !== "object" || typeof item.id !== "string" || item.id === "" || item.id === "default") continue;
					const bytes = Number(item.bytes);
					const kind = item.kind === "video" ? "video" : "image";
					const meta = Number.isFinite(bytes) && bytes > 0 ? kind + " · " + Math.round(bytes / 1024) + " KB" : kind;
					appendRow(item.id, String(item.name ?? item.id), meta);
				}
				syncMediaListSelection(selected);
			};
			/** Row click: mirror the choice into the <select>, then run the existing apply path. */
			const selectMediaFromList = async (mediaId) => {
				if (ui === null || mediaLocked() === true) return;
				try {
					ui.mediaSelect.value = mediaId;
				} catch (error) {
					note("role-hub:media-list-select", error);
				}
				await applySelectedMedia();
			};
			const refreshMedia = async () => {
				if (ui === null || mediaBusy === true) return;
				const life = hubLifeEngine();
				if (life === null || typeof life.listMedia !== "function") {
					if (ui !== null) {
						ui.mediaSelect.disabled = true;
						ui.mediaApply.disabled = true;
						ui.mediaUpload.disabled = true;
						ui.mediaDefault.disabled = true;
						if (ui.mediaList !== null && ui.mediaList !== undefined) ui.mediaList.textContent = "";
					}
					setMediaStatus(TL_T("hub.media.unavailable"));
					await loadEffectivePack();
					return;
				}
				mediaBusy = true;
				// No look switch may start while the catalog is being rebuilt.
				ui.mediaApply.disabled = true;
				syncMediaRowDisabled();
				setMediaStatus(TL_T("hub.loading"));
				try {
					let result = null;
					try {
						result = await life.listMedia();
					} catch (error) {
						setLastError("media-list", error);
						result = { items: [], rejected: [], error: String(error?.message ?? error) };
					}
					mediaCache = result;
					if (ui === null) return;
					const items = Array.isArray(result?.items) ? result.items : [];
					const rejected = Array.isArray(result?.rejected) ? result.rejected : [];
					const select = ui.mediaSelect;
					select.textContent = "";
					select.appendChild(hubCreate("option", { value: "default" }, TL_T("hub.media.default")));
					for (const item of items) {
						if (item === null || typeof item !== "object" || typeof item.id !== "string" || item.id === "default") continue;
						const bytes = Number(item.bytes);
						const meta = Number.isFinite(bytes) && bytes > 0 ? " · " + Math.round(bytes / 1024) + " KB" : "";
						const kind = item.kind === "video" ? "video" : "image";
						select.appendChild(hubCreate("option", { value: item.id }, String(item.name ?? item.id) + meta + " · " + kind));
					}
					let selected = "default";
					const status = hubTry(() => life.status?.(), null, "media-status");
					if (status !== null && status.media !== null && typeof status.media === "object" && typeof status.media.id === "string") selected = status.media.id;
					select.value = selected;
					select.disabled = false;
					ui.mediaApply.disabled = false;
					ui.mediaUpload.disabled = typeof fetch !== "function";
					ui.mediaDefault.disabled = selected === "default";
					setMediaStatus(items.length <= 1 ? TL_T("hub.media.empty") : "");
					ui.mediaRejected.textContent =
						rejected.length === 0
							? ""
							: TL_T("hub.media.rejected", { names: rejected.map((item) => String(item?.name ?? item?.id ?? "?")).join(", ") });
					// v1.6.4: keep the always-visible filename list and the pack editor in
					// sync with the just-loaded catalog / effective look.
					renderMediaList(items, selected);
					await loadEffectivePack();
				} catch (error) {
					setLastError("media-render", error);
				} finally {
					mediaBusy = false;
					if (ui !== null) {
						// Re-arm only when no switch is still in flight (upload path can
						// overlap a longer catalog reload).
						ui.mediaApply.disabled = mediaApplying === true;
						syncMediaRowDisabled();
					}
				}
			};
			const applySelectedMedia = async () => {
				disarmPendingConfirms();
				const life = hubLifeEngine();
				// A switch is ignored while the catalog reloads or another switch runs.
				if (ui === null || mediaApplying === true || mediaBusy === true) return;
				if (life === null || typeof life.setMedia !== "function") {
					setMediaStatus(TL_T("hub.media.unavailable"));
					return;
				}
				const target = ui;
				const id = typeof ui.mediaSelect.value === "string" ? ui.mediaSelect.value : "default";
				// v1.6.4: lock the Apply button and every filename row until this one
				// switch settles (double click / row + Apply must not race).
				mediaApplying = true;
				ui.mediaApply.disabled = true;
				syncMediaRowDisabled();
				try {
					const result = await life.setMedia(id === "default" ? null : id);
					if (ui !== target) return;
					if (result !== null && typeof result === "object" && result.ok === true) {
						const media = result.media !== null && typeof result.media === "object" ? result.media : {};
						setMediaStatus(TL_T("hub.media.applied", { name: String(media.name ?? id) }));
						// v1.6.4: the effective look changed -> move the list highlight and
						// load that look's action pack into the editor.
						refreshMediaListSelection();
						await loadEffectivePack();
					} else {
						setMediaStatus(TL_T("hub.media.failed", { reason: hubReasonLabel(result?.reason, HUB_MEDIA_REASON_KEYS) }));
					}
				} catch (error) {
					setLastError("media-apply", error);
					if (ui === target) setMediaStatus(TL_T("hub.media.failed", { reason: String(error?.message ?? error) }));
				} finally {
					mediaApplying = false;
					if (ui === target) {
						ui.mediaApply.disabled = false;
						syncMediaRowDisabled();
					}
				}
				if (ui === target) refreshStatus();
			};
			/** v1.5.0 "restore default look": setMedia(null), then refresh catalog + note. */
			const restoreDefaultMedia = async () => {
				disarmPendingConfirms();
				const life = hubLifeEngine();
				if (ui === null) return;
				if (life === null || typeof life.setMedia !== "function") {
					setMediaStatus(TL_T("hub.media.unavailable"));
					return;
				}
				ui.mediaDefault.disabled = true;
				try {
					const result = await life.setMedia(null);
					if (result !== null && typeof result === "object" && result.ok === false) {
						setMediaStatus(TL_T("hub.media.failed", { reason: hubReasonLabel(result.reason, HUB_MEDIA_REASON_KEYS) }));
					} else {
						await refreshMedia();
						setMediaStatus(TL_T("hub.media.defaultRestored"));
					}
				} catch (error) {
					setLastError("media-default", error);
					setMediaStatus(TL_T("hub.media.failed", { reason: String(error?.message ?? error) }));
				} finally {
					refreshStatus();
				}
			};
			/**
			 * v2.0.1 "restore the author's default appearance": write the appearance keys of
			 * presets/tianlight-default.json (embedded into the client at build time), then
			 * reload once so every fragment re-reads them exactly like a fresh install. Chat,
			 * permissions, weather and uploaded media files are never touched. Two clicks are
			 * required (same destructive-action convention as the other resets).
			 */
			let appearanceResetArmedAt = 0;
			let appearanceResetDisarmTimer = 0;
			const resetDefaultAppearance = () => {
				disarmPendingConfirms();
				const now = Date.now();
				const win = hubBrowserWindow();
				if (now - appearanceResetArmedAt > 5000) {
					appearanceResetArmedAt = now;
					if (ui !== null && ui.appearanceNote !== null) {
						ui.appearanceNote.textContent = TL_T("hub.appearance.confirm");
						ui.appearanceNote.setAttribute("data-tl-armed", "");
					}
					if (win !== null && typeof win.setTimeout === "function") {
						appearanceResetDisarmTimer = win.setTimeout(() => {
							appearanceResetArmedAt = 0;
							if (ui !== null && ui.appearanceNote !== null) {
								ui.appearanceNote.textContent = TL_T("hub.appearance.hint");
								ui.appearanceNote.removeAttribute("data-tl-armed");
							}
						}, 5000);
					}
					return;
				}
				appearanceResetArmedAt = 0;
				if (win !== null && typeof win.clearTimeout === "function" && appearanceResetDisarmTimer !== 0) {
					win.clearTimeout(appearanceResetDisarmTimer);
					appearanceResetDisarmTimer = 0;
				}
				const written = tl5ApplyDefaultAppearance();
				if (ui !== null && ui.appearanceNote !== null) {
					ui.appearanceNote.textContent = TL_T("hub.appearance.done", { n: String(written) });
					ui.appearanceNote.removeAttribute("data-tl-armed");
				}
				if (win !== null && typeof win.setTimeout === "function") {
					win.setTimeout(() => {
						try {
							win.location.reload();
						} catch (error) {
							setLastError("appearance-reload", error);
						}
					}, 700);
				}
			};
			const uploadPetMedia = async (file) => {
				if (typeof fetch !== "function") return { ok: false, status: 0, reason: TL_T("hub.upload.noFetch") };
				const name = typeof file.name === "string" && file.name !== "" ? file.name : "pet-media";
				const headers = {};
				if (typeof file.type === "string" && file.type !== "") headers["Content-Type"] = file.type;
				let response = null;
				try {
					response = await fetch(ASSET_BASE + "/_upload?name=" + encodeURIComponent(name), { method: "POST", headers, body: file });
				} catch (error) {
					return { ok: false, status: 0, reason: String(error?.message ?? error) };
				}
				let payload = null;
				try {
					payload = await response.json();
				} catch {
					payload = null;
				}
				if (response.ok !== true) {
					const reason = payload !== null && typeof payload === "object" && typeof payload.error === "string" ? payload.error : "HTTP " + String(response.status);
					return { ok: false, status: response.status, reason };
				}
				const item = payload !== null && typeof payload === "object" && payload.item !== null && typeof payload.item === "object" ? payload.item : null;
				if (item === null || typeof item.id !== "string" || item.id === "") return { ok: false, status: response.status, reason: "invalid-response" };
				return { ok: true, status: response.status, item };
			};
			const handleUploadPicked = async () => {
				if (ui === null) return;
				const input = ui.uploadInput;
				const files = input.files;
				const file = files !== null && files !== undefined && files.length > 0 ? files[0] : null;
				try {
					input.value = "";
				} catch {
					// some browsers keep the selection; harmless
				}
				if (file === null || file === undefined) return;
				// S4: shared upload pre-flight (same formats/limits as the wallpaper panel).
				const uploadVerdict = tl5ValidateUploadFile(file, HUB_UPLOAD_MAX_BYTES);
				if (uploadVerdict.ok !== true) {
					if (uploadVerdict.code === "too-big") {
						setUploadStatus(TL_T("hub.upload.tooBig", { size: (Number(file.size) / 1024 / 1024).toFixed(1) }));
					} else if (uploadVerdict.code === "type") {
						setUploadStatus(TL_T("hub.upload.type"));
					} else {
						setUploadStatus(TL_T("hub.upload.empty"));
					}
					return;
				}
				ui.mediaUpload.disabled = true;
				setUploadStatus(TL_T("hub.upload.uploading"));
				try {
					const uploaded = await uploadPetMedia(file);
					if (uploaded.ok !== true) {
						setUploadStatus(TL_T("hub.upload.rejected", { status: uploaded.status, reason: uploaded.reason }));
						return;
					}
					await refreshMedia();
					const applied = uploaded.item;
					const life = hubLifeEngine();
					if (life !== null && typeof life.setMedia === "function") {
						try {
							await life.setMedia(applied.id);
						} catch (error) {
							note("role-hub:upload-set-media", error);
						}
						if (ui !== null) {
							try {
								ui.mediaSelect.value = applied.id;
							} catch {
								// selection is cosmetic
							}
						}
					}
					setUploadStatus(TL_T("hub.upload.done", { name: String(applied.name ?? applied.id) }));
					// v1.6.4: reflect the freshly uploaded look and load its action pack.
					refreshMediaListSelection();
					await loadEffectivePack();
					refreshStatus();
				} catch (error) {
					setLastError("upload", error);
					setUploadStatus(TL_T("hub.upload.failed", { reason: String(error?.message ?? error) }));
				} finally {
					if (ui !== null) ui.mediaUpload.disabled = false;
				}
			};

			// ---- action pack editor (v1.6.4, globalThis.tianlightPetActions) -------
			const setPackStatus = (text) => {
				if (ui !== null && ui.packStatus !== null && ui.packStatus !== undefined) ui.packStatus.textContent = text;
			};
			const packControls = () => {
				if (ui === null) return [];
				const nodes = [ui.packSave, ui.packReset];
				for (const actionId of HUB_PACK_ACTIONS) {
					if (ui.packLabels !== null && ui.packLabels !== undefined) nodes.push(ui.packLabels[actionId]);
					if (ui.packLines !== null && ui.packLines !== undefined) nodes.push(ui.packLines[actionId]);
				}
				return nodes.filter((node) => node !== null && node !== undefined);
			};
			const setPackEnabled = (enabled) => {
				for (const node of packControls()) node.disabled = enabled !== true;
			};
			/** The companion-side store, or null when this companion build has no action API. */
			const packApi = () => {
				const actions = hubPetActions();
				if (actions === null) return null;
				const usable = typeof actions.get === "function" && typeof actions.set === "function" && typeof actions.clear === "function";
				return usable === true ? actions : null;
			};
			/** Textarea -> one trimmed non-empty reply per line (the documented pack shape). */
			const splitPackLines = (value) => {
				const result = [];
				for (const line of String(value ?? "").split(/\r?\n/)) {
					const text = line.trim();
					if (text !== "") result.push(text);
				}
				return result;
			};
			/**
			 * The companion keeps built-in labels/lines as i18n keys and resolves them
			 * when the menu renders; the editor must show the same readable text.
			 * Custom (literal) text passes through unchanged.
			 */
			const packDisplayText = (value) => {
				const text = typeof value === "string" ? value : "";
				if (text === "") return "";
				const translated = TL_T(text);
				return translated !== text ? translated : text;
			};
			const fillPackInputs = (pack) => {
				if (ui === null) return;
				for (const actionId of HUB_PACK_ACTIONS) {
					const row = pack !== null && typeof pack === "object" && pack[actionId] !== null && typeof pack[actionId] === "object" ? pack[actionId] : null;
					const label = row !== null && typeof row.label === "string" ? packDisplayText(row.label) : "";
					const lines = row !== null && Array.isArray(row.lines) ? row.lines.filter((line) => typeof line === "string").map(packDisplayText) : [];
					ui.packLabels[actionId].value = label;
					ui.packLines[actionId].value = lines.filter((line) => line !== "").join("\n");
				}
			};
			/** Exact reply-line comparison (for "unchanged vs this look's defaults"). */
			const packLinesEqual = (left, right) => left.length === right.length && left.every((line, index) => line === right[index]);
			/** One action of any effective pack in the same display form the editor shows. */
			const packDisplayRow = (pack, actionId) => {
				const row = pack !== null && typeof pack === "object" && pack[actionId] !== null && typeof pack[actionId] === "object" ? pack[actionId] : null;
				if (row === null) return null;
				const label = typeof row.label === "string" ? packDisplayText(row.label).trim() : "";
				const lines = Array.isArray(row.lines)
					? row.lines
							.filter((line) => typeof line === "string")
							.map((line) => packDisplayText(line).trim())
							.filter((line) => line !== "")
					: [];
				return { label, lines };
			};
			/**
			 * Load the current look's effective pack (get) into the editor. Also gates the
			 * whole editor: an old companion without `tianlightPetActions` shows the
			 * unavailable note and disables every input/button.
			 */
			const loadEffectivePack = async () => {
				const target = ui;
				if (target === null) return;
				loadedPack = null;
				const actions = packApi();
				setPackEnabled(actions !== null);
				if (actions === null) {
					fillPackInputs(null);
					setPackStatus(TL_T("hub.media.pack.unavailable"));
					return;
				}
				let pack = null;
				try {
					pack = await actions.get(currentMediaId());
				} catch (error) {
					note("role-hub:pack-get", error);
					pack = null;
				}
				// The hub may have been closed (or closed and reopened) while get resolved.
				if (ui !== target) return;
				loadedPack = pack !== null && typeof pack === "object" ? pack : null;
				fillPackInputs(loadedPack);
				setPackStatus("");
			};
			/** Save the editor into the current look's pack; the pet menu reads it next open. */
			const savePack = async () => {
				disarmPendingConfirms();
				const target = ui;
				if (target === null) return;
				const actions = packApi();
				if (actions === null) {
					setPackEnabled(false);
					setPackStatus(TL_T("hub.media.pack.unavailable"));
					return;
				}
				const mediaId = currentMediaId();
				// Read + validate the three editors first. The companion clips oversized
				// input silently; an explicit invalid note is honest and keeps the UI value.
				const edited = {};
				for (const actionId of HUB_PACK_ACTIONS) {
					const label = String(target.packLabels[actionId].value ?? "").trim();
					const lines = splitPackLines(target.packLines[actionId].value);
					if (lines.length > HUB_PACK_LINES_MAX || lines.some((line) => Array.from(line).length > HUB_PACK_LINE_MAX)) {
						setPackStatus(TL_T("hub.media.pack.invalid"));
						return;
					}
					edited[actionId] = { label, lines };
				}
				// H1: submit ONLY actions that really differ from this look's localized
				// defaults; untouched rows stay out of the payload so they keep following
				// the default text across language switches. The companion keeps customs
				// for omitted actions, so a row being reset (cleared, or edited back to
				// the default text) is sent empty to let the companion drop that override.
				const defaults = hubTry(() => (typeof actions.defaults === "function" ? actions.defaults() : null), null, "pack-defaults");
				const changed = {};
				let changedCount = 0;
				for (const actionId of HUB_PACK_ACTIONS) {
					const value = edited[actionId];
					const defaultsDisplay = packDisplayRow(defaults, actionId);
					const currentDisplay = packDisplayRow(loadedPack, actionId);
					const hadCustom =
						defaultsDisplay !== null &&
						currentDisplay !== null &&
						(currentDisplay.label !== defaultsDisplay.label || packLinesEqual(currentDisplay.lines, defaultsDisplay.lines) === false);
					const empty = value.label === "" && value.lines.length === 0;
					const sameAsDefault =
						empty === false && defaultsDisplay !== null && value.label === defaultsDisplay.label && packLinesEqual(value.lines, defaultsDisplay.lines);
					if (empty === true || sameAsDefault === true) {
						// Untouched / reset row: omitted unless a stale override must be removed.
						if (hadCustom === true) {
							changed[actionId] = { label: "", lines: [] };
							changedCount += 1;
						}
						continue;
					}
					changed[actionId] = value;
					changedCount += 1;
				}
				let result = null;
				try {
					if (changedCount === 0) {
						// Nothing differs from the defaults: drop any frozen custom pack.
						result = await actions.clear(mediaId);
					} else {
						result = await actions.set(mediaId, changed);
					}
				} catch (error) {
					note(changedCount === 0 ? "role-hub:pack-clear-default" : "role-hub:pack-set", error);
					if (ui === target) setPackStatus(TL_T("hub.media.pack.invalid"));
					return;
				}
				if (ui !== target) return;
				if (result !== null && typeof result === "object" && result.ok === false) {
					setPackStatus(TL_T("hub.media.pack.invalid"));
					return;
				}
				// Success: reload what the companion actually stored, then confirm.
				await loadEffectivePack();
				if (ui !== target) return;
				setPackStatus(TL_T("hub.media.pack.saved"));
			};
			/** Drop the custom pack for the current look, reload, then confirm. */
			const resetPack = async () => {
				const target = ui;
				if (target === null) return;
				const actions = packApi();
				if (actions === null) {
					setPackEnabled(false);
					setPackStatus(TL_T("hub.media.pack.unavailable"));
					return;
				}
				let result = null;
				try {
					result = await actions.clear(currentMediaId());
				} catch (error) {
					note("role-hub:pack-clear", error);
					if (ui === target) setPackStatus(TL_T("hub.media.pack.invalid"));
					return;
				}
				if (ui !== target) return;
				if (result !== null && typeof result === "object" && result.ok === false) {
					setPackStatus(TL_T("hub.media.pack.invalid"));
					return;
				}
				await loadEffectivePack();
				if (ui !== target) return;
				setPackStatus(TL_T("hub.media.pack.resetDone"));
			};

			// ---- weather card (v1.5.0, globalThis.tianlightWeather) -----------------
			const setWeatherNote = (text) => {
				if (ui !== null && ui.weatherNote !== null && ui.weatherNote !== undefined) ui.weatherNote.textContent = text;
			};
			/**
			 * Render the weather snapshot with the v1.5 precedence:
			 * disabled -> unmounted (!runtime) -> no location -> error -> ready -> waiting.
			 * `text` is already localized by the engine, so prefer it and only append the
			 * raw error code for diagnostics.
			 */
			const refreshWeather = () => {
				if (ui === null) return;
				const weather = hubWeather();
				const snapshot = hubWeatherSnapshot(weather);
				let state = "unavailable";
				let statusText = TL_T("hub.weather.unavailable");
				if (weather !== null) {
					if (snapshot === null) {
						state = "error";
						statusText = TL_T("hub.weather.error", { reason: TL_T("hub.weather.reason.default") });
					} else if (snapshot.enabled !== true) {
						state = "disabled";
						statusText = snapshot.text !== "" ? snapshot.text : TL_T("hub.weather.disabled");
					} else if (snapshot.runtime !== true) {
						// The module is exposed early but its context runtime is not mounted yet.
						state = "unavailable";
						statusText = snapshot.text !== "" ? snapshot.text : TL_T("hub.weather.unavailable");
					} else if (snapshot.hasLocation !== true) {
						state = "noLocation";
						statusText = snapshot.text !== "" ? snapshot.text : TL_T("hub.weather.noLocation");
					} else if (snapshot.error !== "") {
						state = "error";
						const reason = hubReasonLabel(snapshot.error, HUB_WEATHER_REASON_KEYS, "hub.weather.reason.default");
						statusText = snapshot.text !== "" ? snapshot.text : TL_T("hub.weather.error", { reason });
						statusText += " (" + snapshot.error + ")";
					} else if (snapshot.last !== null) {
						state = "normal";
						const at = snapshot.updatedAt !== null ? snapshot.updatedAt : snapshot.last !== null && Number.isFinite(snapshot.last.at) ? snapshot.last.at : 0;
						const base = snapshot.text !== "" ? snapshot.text : TL_T("hub.weather.state.normal");
						statusText = at > 0 ? base + " · " + TL_T("hub.weather.updated", { time: hubDateTime(at) }) : base;
					} else {
						state = "waiting";
						statusText = snapshot.text !== "" ? snapshot.text : TL_T("hub.weather.waiting");
					}
				}
				ui.weatherStatus.textContent = statusText;
				ui.weatherStatus.setAttribute("data-tl-hub-weather-state", state);
				ui.weatherStatus.setAttribute("data-tl-weather-state", TL_T(HUB_WEATHER_STATE_KEYS[state] ?? "hub.weather.state.unavailable"));
				const interactive = weather !== null && weatherBusy !== true;
				ui.weatherEnabled.disabled = interactive !== true;
				ui.weatherEnabled.checked = snapshot !== null && snapshot.enabled === true;
				for (const node of [ui.weatherCity, ui.weatherResolve, ui.weatherLat, ui.weatherLon, ui.weatherCoords, ui.weatherLocate, ui.weatherRefresh]) {
					if (node !== null && node !== undefined) node.disabled = interactive !== true;
				}
			};
			/** Shared busy/feedback wrapper for every weather action. */
			const runWeatherAction = async (busyKey, task) => {
				const weather = hubWeather();
				if (weather === null) {
					setWeatherNote(TL_T("hub.weather.unavailable"));
					return;
				}
				weatherBusy = true;
				if (busyKey !== "") setWeatherNote(TL_T(busyKey));
				refreshWeather();
				try {
					await task(weather);
				} catch (error) {
					setLastError("weather", error);
					setWeatherNote(TL_T("hub.weather.failed", { reason: String(error?.message ?? error) }));
				} finally {
					weatherBusy = false;
					refreshWeather();
				}
			};
			const onWeatherEnabled = () => {
				const enabled = ui !== null && ui.weatherEnabled.checked === true;
				runAsync(() =>
					runWeatherAction("", async (weather) => {
						if (typeof weather.apply !== "function") {
							setWeatherNote(TL_T("hub.weather.failed", { reason: TL_T("hub.weather.reason.default") }));
							return;
						}
						weather.apply({ enabled });
						setWeatherNote(enabled ? TL_T("hub.weather.enabledOn") : TL_T("hub.weather.enabledOff"));
					}),
				);
			};
			const onWeatherResolve = () => {
				runAsync(() =>
					runWeatherAction("hub.weather.resolving", async (weather) => {
						if (ui === null) return;
						const city = String(ui.weatherCity.value ?? "").trim();
						if (city === "") {
							setWeatherNote(TL_T("hub.weather.invalidCity"));
							return;
						}
						if (typeof weather.resolveCity !== "function") {
							setWeatherNote(TL_T("hub.weather.failed", { reason: TL_T("hub.weather.reason.default") }));
							return;
						}
						const result = await weather.resolveCity(city);
						if (result !== null && typeof result === "object" && result.ok === true) {
							const name = typeof result.name === "string" && result.name !== "" ? result.name : city;
							setWeatherNote(TL_T("hub.weather.cityResolved", { name }));
						} else {
							const reason =
								result !== null && typeof result === "object" && typeof result.error === "string" && result.error !== ""
									? result.error
									: TL_T("hub.weather.reason.default");
							setWeatherNote(TL_T("hub.weather.resolveFailed", { reason }));
						}
					}),
				);
			};
			const onWeatherCoords = () => {
				runAsync(() =>
					runWeatherAction("", async (weather) => {
						if (ui === null) return;
						const lat = Number(ui.weatherLat.value);
						const lon = Number(ui.weatherLon.value);
						if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
							setWeatherNote(TL_T("hub.weather.invalidCoords"));
							return;
						}
						if (typeof weather.setManualLocation !== "function") {
							setWeatherNote(TL_T("hub.weather.failed", { reason: TL_T("hub.weather.reason.default") }));
							return;
						}
						const result = weather.setManualLocation(lat, lon);
						if (result !== null && typeof result === "object" && result.ok === false) {
							const reason = typeof result.error === "string" && result.error !== "" ? result.error : TL_T("hub.weather.reason.default");
							setWeatherNote(TL_T("hub.weather.failed", { reason }));
						} else {
							setWeatherNote(TL_T("hub.weather.applied"));
						}
					}),
				);
			};
			const onWeatherLocate = () => {
				runAsync(() =>
					runWeatherAction("hub.weather.locating", async (weather) => {
						if (typeof weather.useCurrentLocation !== "function") {
							setWeatherNote(TL_T("hub.weather.failed", { reason: TL_T("hub.weather.reason.default") }));
							return;
						}
						const result = await weather.useCurrentLocation();
						if (result !== null && typeof result === "object" && result.ok === false) {
							const reason = typeof result.error === "string" && result.error !== "" ? result.error : TL_T("hub.weather.reason.default");
							setWeatherNote(TL_T("hub.weather.failed", { reason }));
						} else {
							setWeatherNote(TL_T("hub.weather.applied"));
						}
					}),
				);
			};
			const onWeatherRefresh = () => {
				runAsync(() =>
					runWeatherAction("hub.loading", async (weather) => {
						if (typeof weather.refresh !== "function") {
							setWeatherNote(TL_T("hub.weather.failed", { reason: TL_T("hub.weather.reason.default") }));
							return;
						}
						const fresh = await weather.refresh();
						setWeatherNote(fresh === true ? TL_T("hub.weather.refreshed") : TL_T("hub.weather.waiting"));
					}),
				);
			};

			// ---- AI card ------------------------------------------------------------
			const setAiNote = (text) => {
				if (ui !== null) ui.aiNote.textContent = text;
			};
			/**
			 * plan A: fold `status.llm` into the adapter line. Priority (Lead-approved):
			 * (a) the host probe ran and reports itself unavailable -> explain WHY via
			 * `hub.ai.host.<reason>` (this is what makes the "restart DSH -> unconfigured
			 * model" case visible even though session-only `llm` grants reset on reload);
			 * (b) the built-in host adapter is live -> provider / model; (c) a user adapter
			 * is registered -> its id; (d) otherwise the local-only fallback. Old brains
			 * without `routing` keep the pre-plan-A line, so the hub never regresses on a
			 * stripped harness.
			 */
			const hubAdapterLine = (status) => {
				const pet = hubPetBrain();
				const available = pet !== null;
				if (available !== true) return { text: TL_T("hub.ai.unavailable"), state: "unavailable" };
				const llm =
					status !== null && typeof status === "object" && status.llm !== null && typeof status.llm === "object" ? status.llm : null;
				const routing = llm !== null && typeof llm.routing === "string" ? llm.routing : "";
				const host = llm !== null && llm.host !== null && typeof llm.host === "object" ? llm.host : null;
				const hostProvider = host !== null && typeof host.provider === "string" && host.provider !== "" ? host.provider : "";
				const hostModel = host !== null && typeof host.model === "string" && host.model !== "" ? host.model : "";
				const adapterId = hubAdapterId(status);
				// (a) the host answered the probe and cannot serve a model: name the reason.
				if (host !== null && host.checked === true && host.available !== true) {
					const reason = typeof host.reason === "string" ? host.reason : "";
					const known = Object.prototype.hasOwnProperty.call(HUB_AI_HOST_REASON_KEYS, reason);
					return { text: TL_T(known ? HUB_AI_HOST_REASON_KEYS[reason] : "hub.ai.host.unknown"), state: "host" };
				}
				// (b) the built-in "dsh" adapter is live (the model follows the DSH default).
				if (routing === "dsh") {
					return {
						text: TL_T("hub.ai.adapterDsh", {
							provider: hostProvider === "" ? TL_T("hub.ai.llm.unknown") : hostProvider,
							model: hostModel === "" ? TL_T("hub.ai.llm.unknown") : hostModel,
						}),
						state: "dsh",
					};
				}
				// (c) a user-registered adapter (routing === "adapter" on the new brain; the
				// adapter id alone on an older/partial status shape).
				if (adapterId !== null) return { text: TL_T("hub.ai.adapter", { adapter: adapterId }), state: "adapter" };
				// (d) no adapter at all: the companion is on the local brain.
				return { text: TL_T("hub.ai.adapterNone"), state: "none" };
			};
			/**
			 * plan A provider picker. Option 0 is always the DSH default (the model itself
			 * follows the DSH default selection); the remaining options come from
			 * remote.llm.listProviders() and carry `{id,name}`. Options are rebuilt only
			 * when their content changes (the hub polls status every 4s).
			 */
			const renderProviderSelect = (status) => {
				if (ui === null || ui.llmProvider === null || ui.llmProvider === undefined) return;
				const select = ui.llmProvider;
				const pet = hubPetBrain();
				const canSet = pet !== null && typeof pet.setLlmProvider === "function";
				const cache = hubLlmProvidersCache;
				const providers = cache !== null && cache.ok === true ? cache.providers : [];
				const llm = status !== null && typeof status === "object" && status.llm !== null && typeof status.llm === "object" ? status.llm : null;
				const host = llm !== null && llm.host !== null && typeof llm.host === "object" ? llm.host : null;
				const hostProvider = host !== null && typeof host.provider === "string" && host.provider !== "" ? host.provider : TL_T("hub.ai.llm.unknown");
				const hostModel = host !== null && typeof host.model === "string" && host.model !== "" ? host.model : TL_T("hub.ai.llm.unknown");
				const followLabel = TL_T("hub.ai.llm.followDefault") + " (" + hostProvider + " / " + hostModel + ")";
				const selected = llm !== null && typeof llm.provider === "string" ? llm.provider : "";
				const signature = followLabel + "|" + providers.map((provider) => provider.id).join(",") + "|" + (canSet ? "1" : "0");
				if (signature !== hubLlmProviderSignature) {
					hubLlmProviderSignature = signature;
					select.textContent = "";
					select.appendChild(hubCreate("option", { value: "" }, followLabel));
					for (const provider of providers) select.appendChild(hubCreate("option", { value: provider.id }, provider.name));
				}
				// A stored provider that is missing from a failed/empty list cannot be
				// rendered as an option; the picker honestly shows "follow default" while
				// the brain keeps the saved choice (a later successful read restores it).
				const known = providers.some((provider) => provider.id === selected);
				select.value = selected !== "" && known ? selected : "";
				select.disabled = canSet === false;
				select.setAttribute("data-tl-hub-llm-provider-count", String(providers.length));
				select.setAttribute(
					"data-tl-hub-llm-provider-state",
					cache === null ? "loading" : cache.ok === true ? (providers.length === 0 ? "empty" : "listed") : "unavailable",
				);
			};
			/** One model-fallback hint line, shared by the AI note (44 localizes the copy). */
			const setLlmHintNote = (code) => {
				const hint = hubLlmHintText(code);
				if (hint !== "") setAiNote(hint);
			};
			/** Re-read the host model capability (44 owns the probe); no-op without 44. */
			const refreshHostLlmStatus = () => {
				const pet = hubPetBrain();
				if (pet === null || typeof pet.refreshHostLlm !== "function") return;
				runAsync(async () => {
					await hubTry(async () => pet.refreshHostLlm(), null, "llm-host-refresh");
					refreshAi();
				});
			};
			/** One debounced provider-list read per hub install (single flight, cached). */
			const ensureLlmProviders = () => {
				if (hubLlmProvidersBusy === true || hubLlmProvidersCache !== null) return;
				hubLlmProvidersBusy = true;
				runAsync(async () => {
					try {
						hubLlmProvidersCache = await hubListProviders();
					} finally {
						hubLlmProvidersBusy = false;
					}
					refreshAi();
				});
			};
			/** Persist the chosen provider through the brain's same-closure bridge. */
			const onProviderChange = async (event) => {
				// R8 (REV-R4A F2): a script-dispatched change is not a user preference.
				if (isSyntheticUserEvent(event)) return;
				disarmPendingConfirms();
				const pet = hubPetBrain();
				if (pet === null || typeof pet.setLlmProvider !== "function") {
					setAiNote(TL_T("hub.ai.llm.providerFailed"));
					return;
				}
				const value =
					ui !== null && ui.llmProvider !== null && ui.llmProvider !== undefined && typeof ui.llmProvider.value === "string"
						? ui.llmProvider.value
						: "";
				let result = null;
				try {
					result = await pet.setLlmProvider(value === "" ? null : value);
				} catch (error) {
					note("role-hub:llm-provider", error);
					result = null;
				}
				setAiNote(result !== null && result !== undefined && result.ok === false ? TL_T("hub.ai.llm.providerFailed") : TL_T("hub.ai.llm.providerSaved"));
				refreshAi();
			};
			const appendLog = (entry) => {
				logEntries.push(entry);
				while (logEntries.length > HUB_LOG_MAX) logEntries.shift();
				renderLog();
			};
			const renderLog = () => {
				if (ui === null) return;
				const box = ui.logBox;
				box.textContent = "";
				if (logEntries.length === 0) {
					box.appendChild(hubCreate("p", { className: "tl-hub-note tl-hub-hint" }, TL_T("hub.ai.logEmpty")));
					return;
				}
				for (const entry of logEntries) {
					let text = "";
					let role = "pet";
					let source = "local";
					if (entry.role === "user") {
						role = "user";
						source = "user";
						text = TL_T("hub.ai.you") + ": " + String(entry.text ?? "");
					} else if (entry.ok === true) {
						source = entry.source === "llm" ? "llm" : entry.source === "agent" ? "agent" : "local";
						const sourceKey = source === "llm" ? "hub.ai.source.llm" : source === "agent" ? "hub.agent.source" : "hub.ai.source.local";
						text = TL_T("hub.ai.pet") + " · " + TL_T(sourceKey) + ": " + String(entry.text ?? "");
					} else {
						role = "denied";
						source = "denied";
						text = TL_T("hub.ai.pet") + " · " + TL_T("hub.ai.source.denied") + ": " + hubReasonLabel(entry.reason, HUB_AI_REASON_KEYS, "hub.ai.reason.default");
					}
					box.appendChild(hubCreate("p", { className: "tl-hub-log-row", "data-tl-hub-log-row": role, "data-role": role, "data-source": source }, text));
				}
			};
			/**
			 * Two-step consent for the LLM capability: the first click only arms the
			 * confirmation (button turns into "click again to confirm"), the second click
			 * grants with the explicit consent token the brain requires. No native dialog,
			 * so the flow is identical in the desktop webview and in tests.
			 */
			const confirmLlmGrant = () => {
				if (llmPending === true) {
					llmPending = false;
					return true;
				}
				llmPending = true;
				setAiNote(TL_T("hub.ai.llm.confirm"));
				return false;
			};
			const setPermStatus = (text) => {
				if (ui !== null && ui.permStatus !== null && ui.permStatus !== undefined) ui.permStatus.textContent = text;
			};
			/**
			 * v1.4.0 permission board: safe rows toggle directly, medium/high rows arm on
			 * the first click and only grant with the explicit consent token on the second
			 * click; `agent` (driving DSH) stays permanently denied and read-only.
			 */
			const refreshPermissions = (rows) => {
				if (ui === null) return;
				const box = ui.permRows;
				box.textContent = "";
				let hasHigh = false;
				if (!Array.isArray(rows) || rows.length === 0) {
					box.appendChild(hubCreate("p", { className: "tl-hub-note tl-hub-hint", "data-tl-hub-perm-empty": "" }, TL_T("hub.perm.unavailable")));
					if (ui.permHighWarning !== null && ui.permHighWarning !== undefined) ui.permHighWarning.hidden = true;
					return;
				}
				const seen = new Set();
				for (const row of rows) {
					if (row === null || typeof row !== "object" || typeof row.id !== "string" || seen.has(row.id)) continue;
					seen.add(row.id);
					const risk = row.risk === "forbidden" ? "forbidden" : row.risk === "high" ? "high" : row.risk === "medium" ? "medium" : "safe";
					if (risk === "high") hasHigh = true;
					const line = hubCreate("div", { className: "tl-hub-perm-row", "data-tl-hub-perm-row": row.id, "data-risk": risk });
					line.appendChild(hubCreate("span", { className: "tl-hub-perm-name" }, TL_T(HUB_CAP_KEYS[row.id] ?? "hub.perm.unknown")));
					line.appendChild(hubCreate("span", { className: "tl-hub-perm-risk", "data-risk": risk }, TL_T(HUB_RISK_KEYS[risk])));
					if (risk === "forbidden") {
						// v1.4.0: driving DSH is the only permanently denied capability.
						const denied = row.id === "agent" ? TL_T("hub.perm.agentForbidden") : TL_T("hub.perm.risk.forbidden");
						line.appendChild(hubCreate("span", { className: "tl-hub-perm-state", "data-tl-hub-perm-state": "forbidden" }, denied));
						box.appendChild(line);
						continue;
					}
					const granted = row.granted === true;
					if (granted === true) permConfirmPending.delete(row.id);
					// R4A: adapter-based capabilities must not read as a plain "granted".
					// LLM and the six high-risk caps only do something when the user
					// registers an adapter (and the skin itself never invokes one), so the
					// row says "no adapter (not enabled)" / "manual call only" instead.
					const adapterBased = row.adapter !== undefined;
					const hasAdapter = row.adapter === true;
					let stateText = granted ? TL_T("hub.perm.granted") : TL_T("hub.perm.notGranted");
					let stateKind = granted ? "granted" : "not-granted";
					if (granted === true && adapterBased === true) {
						if (hasAdapter === true) {
							stateText = risk === "high" ? TL_T("hub.perm.stateManual") : TL_T("hub.perm.granted");
							stateKind = "granted-adapter";
						} else {
							stateText = TL_T("hub.perm.stateNoAdapter");
							stateKind = "granted-no-adapter";
						}
					}
					line.appendChild(hubCreate("span", { className: "tl-hub-perm-state", "data-tl-hub-perm-state": stateKind }, stateText));
					const grantable = row.grantable !== false;
					const pending = permConfirmPending.get(row.id) === true;
					if (granted === true) {
						const button = hubCreate("button", { type: "button", className: "tl-hub-btn tl-hub-perm-btn", "data-tl-hub-perm-revoke": row.id }, TL_T("hub.perm.revoke"));
						if (grantable) button.addEventListener("click", () => runAsync(() => revokePermission(row.id)));
						else button.disabled = true;
						line.appendChild(button);
					} else if (grantable) {
						const label = pending === true ? TL_T("hub.perm.confirmHigh") : risk === "safe" ? TL_T("hub.perm.grant") : TL_T("hub.perm.grantHigh");
						const button = hubCreate("button", { type: "button", className: "tl-hub-btn tl-hub-perm-btn", "data-tl-hub-perm-grant": row.id }, label);
						button.addEventListener("click", (event) => {
							if (isSyntheticUserEvent(event)) return;
							runAsync(() => requestPermissionGrant(row.id, risk, event));
						});
						line.appendChild(button);
						if (pending === true && (risk === "medium" || risk === "high")) {
							line.appendChild(
								hubCreate(
									"span",
									{ className: "tl-hub-perm-note", "data-tl-hub-perm-note": row.id },
									risk === "high" ? TL_T("hub.perm.highWarning") : TL_T("hub.perm.mediumNote"),
								),
							);
						}
					}
					box.appendChild(line);
				}
				if (ui.permHighWarning !== null && ui.permHighWarning !== undefined) ui.permHighWarning.hidden = hasHigh !== true;
			};
			const requestPermissionGrant = async (id, risk, event) => {
				if (isSyntheticUserEvent(event)) return;
				const pet = hubPetBrain();
				if (pet === null || typeof pet.grant !== "function") return;
				if (risk !== "safe" && permConfirmPending.get(id) !== true) {
					// First click only arms the confirmation; nothing is granted yet.
					permConfirmPending.set(id, true);
					setPermStatus(risk === "high" ? TL_T("hub.perm.highWarning") : TL_T("hub.perm.mediumNote"));
					refreshAi();
					return;
				}
				permConfirmPending.delete(id);
				// R4A: the brain only accepts a one-shot consent ticket minted in its own
				// closure (a fixed string was replayable by any page script before).
				let options;
				if (risk === "safe") {
					options = undefined;
				} else {
					const ticket = typeof pet.requestConsent === "function" ? pet.requestConsent(id) : null;
					if (ticket === null) {
						setPermStatus(TL_T("hub.perm.grantFailed", { reason: TL_T("hub.agent.reason.consent") }));
						refreshAi();
						return;
					}
					options = { consent: ticket };
				}
				let result = null;
				try {
					result = await pet.grant(id, options);
				} catch (error) {
					setLastError("perm-grant", error);
					setPermStatus(TL_T("hub.perm.grantFailed", { reason: String(error?.message ?? error) }));
					refreshAi();
					return;
				}
				if (result !== null && typeof result === "object" && result.ok === false) {
					setPermStatus(
						TL_T("hub.perm.grantFailed", { reason: hubReasonLabel(result.reason, HUB_AGENT_GRANT_REASON_KEYS, "hub.agent.reason.default") }),
					);
				} else {
					setPermStatus(TL_T("hub.perm.grantedNote"));
				}
				refreshAi();
			};
			const revokePermission = async (id) => {
				const pet = hubPetBrain();
				if (pet === null || typeof pet.revoke !== "function") return;
				permConfirmPending.delete(id);
				let result = null;
				try {
					result = await pet.revoke(id);
				} catch (error) {
					setLastError("perm-revoke", error);
					setPermStatus(TL_T("hub.perm.revokeFailed", { reason: String(error?.message ?? error) }));
					refreshAi();
					return;
				}
				if (result !== null && typeof result === "object" && result.ok === false) {
					setPermStatus(
						TL_T("hub.perm.revokeFailed", { reason: hubReasonLabel(result.reason, HUB_AGENT_GRANT_REASON_KEYS, "hub.agent.reason.default") }),
					);
				} else {
					setPermStatus(TL_T("hub.perm.revoked"));
				}
				refreshAi();
			};
			const onLlmClick = async (event) => {
				// R8 (REV-R4A F2): a script-dispatched click must not grant LLM/consent.
				if (isSyntheticUserEvent(event)) return;
				disarmPendingConfirms();
				const pet = hubPetBrain();
				if (pet === null) return;
				const rows = await hubTry(async () => pet.permissions?.(), null, "perm-rows");
				const llmRow = Array.isArray(rows) ? rows.find((row) => row !== null && typeof row === "object" && row.id === "llm") : null;
				if (llmRow !== null && llmRow.granted === true) {
					await hubTry(async () => pet.revoke?.("llm"), null, "llm-revoke");
					setAiNote(TL_T("hub.ai.llm.revoked"));
					refreshAi();
					return;
				}
				if (llmRow !== null && llmRow.grantable === false) return;
				if (confirmLlmGrant() !== true) {
					refreshAi();
					return;
				}
				// R4A: same-closure one-shot consent ticket instead of a fixed string.
				const llmTicket = typeof pet.requestConsent === "function" ? pet.requestConsent("llm") : null;
				if (llmTicket === null) {
					llmPending = false;
					setAiNote(TL_T("hub.agent.reason.consent"));
					refreshAi();
					return;
				}
				const result = await hubTry(async () => pet.grant?.("llm", { consent: llmTicket }), null, "llm-grant");
				llmPending = false;
				setAiNote(result === null || result === undefined || result.ok !== false ? TL_T("hub.ai.llm.granted") : TL_T("hub.ai.unavailable"));
				refreshAi();
			};
			const togglePause = async () => {
				const pet = hubPetBrain();
				if (pet === null) return;
				const status = await hubTry(async () => pet.status?.(), null, "pause-status");
				const paused = status !== null && typeof status === "object" && status.paused === true;
				await hubTry(async () => (paused ? pet.resume?.() : pet.pause?.()), null, paused ? "resume" : "pause");
				setAiNote(paused ? TL_T("hub.ai.resumedNote") : TL_T("hub.ai.pausedNote"));
				refreshAi();
			};
			// ---- v1.6.8 autonomous-thinking card -----------------------------------
			// The hub is a read-through control surface for globalThis.tianlightPetMind
			// (src/44-pet-brain.js): no second source of truth, every handler awaits the
			// engine and then re-reads status. Missing API => card disabled + note.
			const setMindNote = (text) => {
				if (ui !== null && ui.mindStatus !== null && ui.mindStatus !== undefined) ui.mindStatus.textContent = text;
			};
			const hubMindReasonLabel = (reason) => {
				const key = Object.prototype.hasOwnProperty.call(HUB_MIND_REASON_KEYS, reason) ? HUB_MIND_REASON_KEYS[reason] : "hub.mind.reason.internal";
				return TL_T(key);
			};
			const mindStatusOf = () => {
				const mind = hubPetMind();
				if (mind === null || typeof mind.status !== "function") return null;
				const status = hubTry(() => mind.status(), null, "mind-status");
				return status !== null && typeof status === "object" ? status : null;
			};
			const refreshMind = () => {
				if (ui === null) return;
				const mind = hubPetMind();
				const available = mind !== null && typeof mind.status === "function";
				const status = available ? mindStatusOf() : null;
				const enabled = status !== null && status.enabled === true;
				const brain = hubPetBrain();
				const brainStatus = brain !== null && typeof brain.status === "function" ? hubTry(() => brain.status(), null, "mind-brain-status") : null;
				const brainPaused = brainStatus !== null && typeof brainStatus === "object" && brainStatus.paused === true;
				const interval =
					status !== null && Number.isFinite(status.intervalMin) && HUB_MIND_INTERVALS.indexOf(status.intervalMin) >= 0
						? status.intervalMin
						: 15;
				const thoughts = available && typeof mind.thoughts === "function" ? hubTry(() => mind.thoughts(), null, "mind-thoughts") : null;
				const list = Array.isArray(thoughts) ? thoughts.slice(0, 5) : [];
				const thoughtCount =
					status !== null && Number.isFinite(status.thoughtCount) ? Math.max(0, Math.floor(status.thoughtCount)) : list.length;
				ui.mindCard.setAttribute("data-tl-hub-mind-ready", available ? "true" : "false");
				ui.mindCard.setAttribute("data-tl-hub-mind-enabled", enabled ? "true" : "false");
				ui.mindToggle.disabled = available === false;
				ui.mindToggle.textContent = enabled ? TL_T("hub.mind.disable") : TL_T("hub.mind.enable");
				ui.mindInterval.disabled = available === false || enabled === false;
				ui.mindInterval.value = String(interval);
				ui.mindSpeak.disabled = available === false || enabled === false;
				ui.mindSpeak.checked = status === null || status.autonomousSpeech !== false;
				ui.mindLlm.disabled = available === false || enabled === false;
				ui.mindLlm.checked = status !== null && status.llmAssist === true;
				ui.mindThink.disabled = available === false || enabled === false || mindBusy === true;
				ui.mindClear.disabled = available === false || thoughtCount === 0;
				ui.mindThoughts.textContent = "";
				if (available === false) {
					ui.mindThoughts.appendChild(
						hubCreate("p", { className: "tl-hub-note tl-hub-hint", "data-tl-hub-mind-empty": "unavailable" }, TL_T("hub.mind.unavailable")),
					);
				} else if (list.length === 0) {
					ui.mindThoughts.appendChild(hubCreate("p", { className: "tl-hub-note tl-hub-hint", "data-tl-hub-mind-empty": "true" }, TL_T("hub.mind.empty")));
				} else {
					for (const entry of list) {
						if (entry === null || typeof entry !== "object" || typeof entry.text !== "string") continue;
						const kindText = entry.kind === "llm" ? TL_T("hub.mind.kind.llm") : TL_T("hub.mind.kind.local");
						ui.mindThoughts.appendChild(
							hubCreate("div", { className: "tl-hub-mind-thought", "data-tl-hub-mind-thought": entry.kind === "llm" ? "llm" : "local" }, [
								hubCreate("span", { className: "tl-hub-mind-time", "data-tl-hub-mind-time": "" }, hubClock(entry.at)),
								hubCreate("span", { className: "tl-hub-mind-kind", "data-tl-hub-mind-kind": "" }, kindText),
								hubCreate("span", { className: "tl-hub-mind-text", "data-tl-hub-mind-text": "" }, entry.text),
							]),
						);
					}
				}
				if (available === false) setMindNote(TL_T("hub.mind.unavailable"));
				else if (brainPaused === true) setMindNote(TL_T("hub.mind.paused"));
				else if (enabled === false) setMindNote(TL_T("hub.mind.disabledNote"));
				else {
					const budgetUsed = status !== null && Number.isFinite(status.llmUsedToday) ? Math.max(0, Math.floor(status.llmUsedToday)) : 0;
					const budgetCap = status !== null && Number.isFinite(status.llmDailyLimit) ? Math.max(0, Math.floor(status.llmDailyLimit)) : 0;
					const llmSuffix =
						status !== null && status.llmAssist === true && budgetCap > 0
							? " · " + TL_T("hub.mind.llmBudget", { used: budgetUsed, budget: budgetCap })
							: "";
					if (status !== null && Number.isFinite(status.lastThinkAt) && status.lastThinkAt > 0) {
						setMindNote(TL_T("hub.mind.status", { n: interval, count: thoughtCount, time: hubClock(status.lastThinkAt) }) + llmSuffix);
					} else {
						setMindNote(TL_T("hub.mind.statusNever", { n: interval }) + llmSuffix);
					}
				}
			};
			const onMindToggle = async () => {
				disarmPendingConfirms();
				const mind = hubPetMind();
				if (mind === null) return;
				const status = mindStatusOf();
				if (status !== null && status.enabled === true) {
					await hubTry(async () => mind.disable?.(), null, "mind-disable");
					refreshMind();
					setMindNote(TL_T("hub.mind.disabledNote"));
					return;
				}
				const interval = Number(ui !== null ? ui.mindInterval.value : 15);
				const speak = ui !== null && ui.mindSpeak.checked === true;
				const llmAssist = ui !== null && ui.mindLlm.checked === true;
				await hubTry(async () => mind.enable?.({ intervalMin: HUB_MIND_INTERVALS.indexOf(interval) >= 0 ? interval : 15, autonomousSpeech: speak, llmAssist }), null, "mind-enable");
				refreshMind();
			};
			const onMindInterval = async () => {
				const mind = hubPetMind();
				if (mind === null || ui === null) return;
				const status = mindStatusOf();
				if (status === null || status.enabled !== true) return;
				const interval = Number(ui.mindInterval.value);
				if (HUB_MIND_INTERVALS.indexOf(interval) < 0) return;
				await hubTry(async () => mind.enable?.({ intervalMin: interval }), null, "mind-interval");
				refreshMind();
			};
			const onMindSpeak = async () => {
				const mind = hubPetMind();
				if (mind === null || ui === null) return;
				const status = mindStatusOf();
				if (status === null || status.enabled !== true) return;
				await hubTry(async () => mind.enable?.({ autonomousSpeech: ui.mindSpeak.checked === true }), null, "mind-speak");
				refreshMind();
			};
			const onMindLlm = async () => {
				disarmPendingConfirms();
				const mind = hubPetMind();
				if (mind === null || ui === null) return;
				const status = mindStatusOf();
				if (status === null || status.enabled !== true) return;
				await hubTry(async () => mind.enable?.({ llmAssist: ui.mindLlm.checked === true }), null, "mind-llm");
				refreshMind();
			};
			const onMindThink = async () => {
				disarmPendingConfirms();
				const mind = hubPetMind();
				if (mind === null || typeof mind.thinkNow !== "function" || mindBusy === true) return;
				mindBusy = true;
				refreshMind();
				setMindNote(TL_T("hub.mind.thinking"));
				const result = await hubTry(async () => mind.thinkNow(), null, "mind-think");
				mindBusy = false;
				refreshMind();
				if (result !== null && typeof result === "object" && result.ok === true) {
					setMindNote(result.spoken === true ? TL_T("hub.mind.thinkSpoken") : TL_T("hub.mind.thinkDone"));
				} else {
					const reason = result !== null && typeof result === "object" && typeof result.reason === "string" ? result.reason : "internal";
					setMindNote(TL_T("hub.mind.thinkSkipped", { reason: hubMindReasonLabel(reason) }));
				}
			};
			const onMindClear = async () => {
				const mind = hubPetMind();
				if (mind === null || typeof mind.clearThoughts !== "function") return;
				await hubTry(async () => mind.clearThoughts(), null, "mind-clear");
				refreshMind();
				setMindNote(TL_T("hub.mind.cleared"));
			};
			const renderAudit = () => {
				if (ui === null) return;
				const pet = hubPetBrain();
				const box = ui.auditBox;
				box.textContent = "";
				if (pet === null || typeof pet.audit !== "function") {
					box.appendChild(hubCreate("p", { className: "tl-hub-note tl-hub-hint" }, TL_T("hub.audit.unavailable")));
					return;
				}
				const list = hubTry(() => pet.audit(HUB_AUDIT_LIMIT), null, "audit");
				if (!Array.isArray(list) || list.length === 0) {
					box.appendChild(hubCreate("p", { className: "tl-hub-note tl-hub-hint" }, TL_T("hub.audit.empty")));
					return;
				}
				for (const entry of list.slice(0, HUB_AUDIT_LIMIT)) {
					if (entry === null || typeof entry !== "object") continue;
					const ok = entry.ok === true;
					const parts = [hubClock(entry.at), String(entry.action ?? "—"), String(entry.cap ?? "—"), ok ? TL_T("hub.audit.ok") : TL_T("hub.audit.deny")];
					if (typeof entry.reason === "string" && entry.reason !== "") parts.push(hubReasonLabel(entry.reason, HUB_AI_REASON_KEYS, "hub.ai.reason.default"));
					if (typeof entry.source === "string" && entry.source !== "") parts.push(entry.source);
					box.appendChild(hubCreate("div", { className: "tl-hub-audit-row", "data-tl-hub-audit-row": String(entry.action ?? ""), "data-ok": ok ? "true" : "false" }, parts.join(" · ")));
				}
			};
			const refreshAi = () => {
				if (ui === null) return;
				const pet = hubPetBrain();
				const available = pet !== null;
				const status = available ? hubTry(() => pet.status?.(), null, "ai-status") : null;
				const paused = status !== null && typeof status === "object" && status.paused === true;
				ui.pauseButton.disabled = !available;
				ui.pauseButton.textContent = paused ? TL_T("hub.ai.resume") : TL_T("hub.ai.pause");
				ui.chatInput.disabled = !available;
				ui.chatSend.disabled = !available || chatBusy === true;
				const rows = available && typeof pet.permissions === "function" ? hubTry(() => pet.permissions(), null, "permissions") : null;
				const llmRow = Array.isArray(rows) ? rows.find((row) => row !== null && typeof row === "object" && row.id === "llm") : null;
				const llmGrantedFromStatus =
					status !== null && typeof status === "object" && status.llm !== null && typeof status.llm === "object" && status.llm.granted === true;
				const llmGranted = llmGrantedFromStatus || (llmRow !== null && llmRow.granted === true);
				ui.llmButton.disabled = !available || (llmRow !== null && llmRow.grantable === false);
				ui.llmButton.textContent = llmPending === true ? TL_T("hub.ai.llm.confirmShort") : llmGranted ? TL_T("hub.ai.llm.revoke") : TL_T("hub.ai.llm.grant");
				ui.llmButton.setAttribute("data-tl-hub-llm-granted", llmGranted ? "true" : "false");
				// plan A: one adapter line for the built-in DSH model, a custom adapter, an
				// unavailable host (with its reason) or the local-only fallback.
				const adapterLine = hubAdapterLine(status);
				ui.adapter.textContent = adapterLine.text;
				ui.adapter.setAttribute("data-tl-hub-adapter-state", adapterLine.state);
				renderProviderSelect(status);
				ensureLlmProviders();
				if (!available) setAiNote(TL_T("hub.ai.unavailable"));
				else if (paused) setAiNote(TL_T("hub.ai.pausedNote"));
				else if (ui.aiNote.textContent === TL_T("hub.ai.pausedNote") || ui.aiNote.textContent === TL_T("hub.ai.unavailable")) setAiNote("");
				// A failed provider-list read explains the default-only picker, but never
				// overwrites a more recent note (typed error, saved provider, denied turn).
				if (hubLlmProvidersCache !== null && hubLlmProvidersCache.ok !== true && ui.aiNote.textContent === "") {
					setAiNote(TL_T("hub.ai.llm.providerUnavailable"));
				}
				refreshPermissions(rows);
				renderAudit();
			};
			// ---- AI Agent card (experimental DSH session bridge, v1.2.0) -------------
			const setAgentNote = (text) => {
				if (ui !== null && ui.agentNote !== null && ui.agentNote !== undefined) ui.agentNote.textContent = text;
			};
			const renderAgentTargets = (sessions, status) => {
				if (ui === null) return;
				const select = ui.agentTarget;
				const list = Array.isArray(sessions) ? sessions : [];
				const signature = list
					.map((session) =>
						session !== null && typeof session === "object"
							? String(session.id ?? "") + ":" + (session.running === true ? "1" : "0") + ":" + String(session.title ?? "")
							: "",
					)
					.join("|");
				if (signature === agentTargetSignature && select.children.length > 0) return;
				agentTargetSignature = signature;
				const previous = typeof select.value === "string" ? select.value : "";
				select.textContent = "";
				select.appendChild(hubCreate("option", { value: HUB_AGENT_TARGET_NEW }, TL_T("hub.agent.target.new")));
				for (const session of list) {
					if (session === null || typeof session !== "object" || typeof session.id !== "string" || session.id === "") continue;
					const title = typeof session.title === "string" && session.title !== "" ? session.title : session.id.slice(0, 8);
					const label = session.running === true ? title + " · " + TL_T("hub.agent.target.running") : title;
					select.appendChild(hubCreate("option", { value: session.id }, label));
				}
				let next = HUB_AGENT_TARGET_NEW;
				for (const option of select.children) {
					if (previous !== "" && option.value === previous) {
						next = previous;
						break;
					}
				}
				if (next === HUB_AGENT_TARGET_NEW && status !== null && typeof status === "object" && status.connected === true && typeof status.sessionId === "string") {
					for (const option of select.children) {
						if (option.value === status.sessionId) {
							next = status.sessionId;
							break;
						}
					}
				}
				select.value = next;
			};
			const cacheAgentSessions = (result) => {
				if (result !== null && typeof result === "object" && result.ok === true && Array.isArray(result.sessions)) {
					agentSessionsCache = result.sessions;
				}
			};
			const refreshAgent = () => {
				if (ui === null) return;
				const agent = hubPetAgent();
				const status = agent !== null && typeof agent.status === "function" ? hubTry(() => agent.status(), null, "agent-status") : null;
				agentStatusCache = status !== null && typeof status === "object" ? status : null;
				const available = agent !== null && agentStatusCache !== null && agentStatusCache.available === true;
				const permission = available === true && hubAgentPermission(agentStatusCache) === true;
				const connected = permission === true && agentStatusCache.connected === true;
				let text = TL_T("hub.agent.status.unavailable");
				if (available === true) {
					if (permission !== true) text = TL_T("hub.agent.status.unauthorized");
					else if (connected !== true) text = TL_T("hub.agent.status.unconnected");
					else {
						const title =
							typeof agentStatusCache.sessionTitle === "string" && agentStatusCache.sessionTitle !== ""
								? agentStatusCache.sessionTitle
								: typeof agentStatusCache.sessionId === "string" && agentStatusCache.sessionId !== ""
									? agentStatusCache.sessionId.slice(0, 8)
									: TL_T("hub.agent.target.new");
						text = TL_T("hub.agent.status.connected", { title });
					}
					const budget = agentStatusCache.budget !== null && typeof agentStatusCache.budget === "object" ? agentStatusCache.budget : {};
					const used = Number.isFinite(budget.used) ? Math.max(0, Math.floor(budget.used)) : 0;
					const cap = Number.isFinite(budget.cap) ? Math.max(0, Math.floor(budget.cap)) : 0;
					text += " · " + TL_T("hub.agent.status.budget", { used, cap });
					if (agentStatusCache.pending === true) text += " · " + TL_T("hub.agent.status.pending");
				}
				if (ui.agentStatus !== null && ui.agentStatus !== undefined) {
					ui.agentStatus.textContent = text;
					ui.agentStatus.setAttribute("data-tl-hub-agent-available", available === true ? "true" : "false");
				}
				ui.agentPerm.disabled = available !== true;
				ui.agentPerm.textContent =
					agentPermPending === true ? TL_T("hub.agent.perm.confirmShort") : permission === true ? TL_T("hub.agent.perm.revoke") : TL_T("hub.agent.perm.grant");
				ui.agentPerm.setAttribute("data-tl-hub-agent-granted", permission === true ? "true" : "false");
				ui.agentTarget.disabled = available !== true || agentBusy === true;
				renderAgentTargets(agentSessionsCache, agentStatusCache);
				ui.agentConnect.disabled = available !== true || permission !== true || agentBusy === true;
				ui.agentDisconnect.disabled = connected !== true || agentBusy === true;
				ui.agentOpen.disabled = connected !== true;
			};
			/** True when the next chat turn must go to the DSH session instead of the brain. */
			const agentRouteReady = () => {
				const agent = hubPetAgent();
				return (
					agent !== null &&
					agentStatusCache !== null &&
					agentStatusCache.available === true &&
					hubAgentPermission(agentStatusCache) === true &&
					agentStatusCache.connected === true &&
					typeof agent.chat === "function"
				);
			};
			const refreshAgentSessions = async () => {
				const agent = hubPetAgent();
				if (agent === null || typeof agent.refreshSessions !== "function") return;
				try {
					cacheAgentSessions(await agent.refreshSessions());
				} catch (error) {
					note("role-hub:agent-sessions", error);
				}
				refreshAgent();
			};
			/**
			 * Two-step consent for taking the experimental agent route (same safe pattern
			 * as the LLM switch): the first click arms, the second grants with the
			 * explicit consent token the brain requires; revoke is direct.
			 */
			const confirmAgentGrant = () => {
				if (agentPermPending === true) {
					agentPermPending = false;
					return true;
				}
				agentPermPending = true;
				setAgentNote(TL_T("hub.agent.perm.confirm"));
				return false;
			};
			const onAgentPermClick = async (event) => {
				// R8 (REV-R4A F2): synthetic clicks do not count as the user's consent.
				if (isSyntheticUserEvent(event)) return;
				disarmPendingConfirms();
				const pet = hubPetBrain();
				const granted = hubAgentPermission(agentStatusCache) === true;
				if (granted === true) {
					if (pet !== null && typeof pet.revoke === "function") {
						try {
							await pet.revoke("agentChat");
						} catch (error) {
							note("role-hub:agent-revoke", error);
						}
					}
					setAgentNote(TL_T("hub.agent.perm.revoked"));
					refreshAgent();
					refreshAi();
					return;
				}
				if (confirmAgentGrant() !== true) {
					refreshAgent();
					return;
				}
				if (pet === null || typeof pet.grant !== "function") {
					setAgentNote(TL_T("hub.agent.status.unavailable"));
					refreshAgent();
					return;
				}
				let message = TL_T("hub.agent.perm.granted");
				try {
					// R4A: consent is a one-shot closure ticket, not the old fixed string.
					const ticket = typeof pet.requestConsent === "function" ? pet.requestConsent("agentChat") : null;
					if (ticket === null) {
						message = TL_T("hub.agent.perm.denied", { reason: hubReasonLabel("consent-required", HUB_AGENT_GRANT_REASON_KEYS, "hub.agent.reason.default") });
					} else {
						const result = await pet.grant("agentChat", { consent: ticket });
						if (result !== null && typeof result === "object" && result.ok === false) {
							message = TL_T("hub.agent.perm.denied", {
								reason: hubReasonLabel(result.reason, HUB_AGENT_GRANT_REASON_KEYS, "hub.agent.reason.default"),
							});
						}
					}
				} catch (error) {
					note("role-hub:agent-grant", error);
					message = TL_T("hub.agent.perm.denied", { reason: String(error?.message ?? error) });
				}
				setAgentNote(message);
				refreshAgent();
				refreshAi();
			};
			const onAgentConnect = async (event) => {
				// R8 (REV-R4A F2): connecting the Agent channel needs a real user gesture.
				if (isSyntheticUserEvent(event)) return;
				disarmPendingConfirms();
				const agent = hubPetAgent();
				if (ui === null) return;
				if (agent === null || typeof agent.connect !== "function") {
					setAgentNote(TL_T("hub.agent.status.unavailable"));
					return;
				}
				const target = typeof ui.agentTarget.value === "string" ? ui.agentTarget.value : HUB_AGENT_TARGET_NEW;
				const options = target === HUB_AGENT_TARGET_NEW || target === "" ? { mode: "new" } : { mode: "existing", sessionId: target };
				agentBusy = true;
				refreshAgent();
				setAgentNote(TL_T("hub.agent.busy"));
				try {
					const result = await agent.connect(options);
					if (result !== null && typeof result === "object" && result.ok === true) {
						const sessionId = typeof result.sessionId === "string" ? result.sessionId : "";
						setAgentNote(TL_T("hub.agent.connect.ok", { title: sessionId === "" ? TL_T("hub.agent.target.new") : sessionId.slice(0, 8) }));
						if (typeof agent.refreshSessions === "function") {
							try {
								cacheAgentSessions(await agent.refreshSessions());
							} catch (error) {
								note("role-hub:agent-sessions", error);
							}
						}
					} else {
						const reason = result !== null && typeof result === "object" && typeof result.reason === "string" ? result.reason : "";
						setAgentNote(TL_T("hub.agent.connect.failed", { reason: hubReasonLabel(reason, HUB_AGENT_REASON_KEYS, "hub.agent.reason.default") }));
					}
				} catch (error) {
					note("role-hub:agent-connect", error);
					setAgentNote(TL_T("hub.agent.connect.failed", { reason: String(error?.message ?? error) }));
				} finally {
					agentBusy = false;
					refreshAgent();
					refreshAi();
				}
			};
			const onAgentDisconnect = async () => {
				const agent = hubPetAgent();
				if (agent === null || typeof agent.disconnect !== "function") return;
				agentBusy = true;
				refreshAgent();
				try {
					await agent.disconnect();
					setAgentNote(TL_T("hub.agent.disconnected"));
				} catch (error) {
					note("role-hub:agent-disconnect", error);
				} finally {
					agentBusy = false;
					refreshAgent();
				}
			};
			const onAgentOpen = async () => {
				const agent = hubPetAgent();
				if (agent === null || typeof agent.openSession !== "function") {
					setAgentNote(TL_T("hub.agent.status.unavailable"));
					return;
				}
				try {
					const result = await agent.openSession();
					if (result !== null && typeof result === "object" && result.ok === false) {
						setAgentNote(TL_T("hub.agent.open.failed", { reason: hubReasonLabel(result.reason, HUB_AGENT_REASON_KEYS, "hub.agent.reason.default") }));
					}
				} catch (error) {
					note("role-hub:agent-open", error);
					setAgentNote(TL_T("hub.agent.open.failed", { reason: String(error?.message ?? error) }));
				}
			};
			const sendChat = async (event) => {
				// R8 (REV-R4A F2): sending into the Agent channel is a user gesture; a
				// script-dispatched click/keydown is ignored. The hub's own input is not a
				// substitute for the product composer and remains untouched by this guard.
				if (isSyntheticUserEvent(event)) return;
				disarmPendingConfirms();
				const pet = hubPetBrain();
				if (ui === null || pet === null || typeof pet.chat !== "function" || chatBusy === true) return;
				const raw = typeof ui.chatInput.value === "string" ? ui.chatInput.value : "";
				const text = raw.trim().slice(0, HUB_AI_INPUT_MAX);
				if (text === "") {
					setAiNote(TL_T("hub.ai.empty"));
					return;
				}
				// v1.2.0: an explicitly granted + connected DSH session takes the turn;
				// otherwise the turn stays on the local/LLM brain (unchanged v1.1 path).
				const useAgent = agentRouteReady();
				const agent = hubPetAgent();
				chatBusy = true;
				ui.chatSend.disabled = true;
				setAiNote(TL_T("hub.ai.thinking"));
				appendLog({ role: "user", at: Date.now(), text });
				try {
					if (useAgent === true && agent !== null) {
						const result = await agent.chat(text);
						const ok = result !== null && typeof result === "object" ? result.ok === true : false;
						const reply = result !== null && typeof result === "object" && typeof result.reply === "string" ? result.reply : "";
						if (ok === true) {
							if (reply !== "") appendLog({ role: "pet", at: Date.now(), source: "agent", ok: true, text: reply });
							else appendLog({ role: "pet", at: Date.now(), source: "agent", ok: true, text: TL_T("hub.agent.sent") });
							setAiNote("");
							ui.chatInput.value = "";
						} else {
							const reason = result !== null && typeof result === "object" && typeof result.reason === "string" ? result.reason : "";
							appendLog({ role: "pet", at: Date.now(), source: "agent", ok: false, reason });
							setAiNote(TL_T("hub.agent.chat.failed", { reason: hubReasonLabel(reason, HUB_AGENT_REASON_KEYS, "hub.agent.reason.default") }));
						}
					} else {
						const result = await pet.chat(text);
						const parsed = hubChatResult(result);
						// The log's `source` already renders as "AI 回复" / "本地回复".
						appendLog({ role: "pet", at: Date.now(), source: parsed.source, ok: parsed.ok, text: parsed.text, reason: parsed.reason });
						if (parsed.ok === true) {
							// plan A: a local fallback after a model failure says WHY (missing
							// credential, quota, timeout, host restart, ...) instead of "usually off".
							if (parsed.llmError !== "") setLlmHintNote(parsed.llmError);
							else setAiNote("");
						} else {
							setAiNote(TL_T("hub.ai.denied", { reason: hubReasonLabel(parsed.reason, HUB_AI_REASON_KEYS, "hub.ai.reason.default") }));
						}
						ui.chatInput.value = "";
					}
				} catch (error) {
					setLastError("chat", error);
					appendLog({ role: "pet", at: Date.now(), source: useAgent === true ? "agent" : "error", ok: false, reason: String(error?.message ?? error) });
					setAiNote(TL_T("hub.ai.failed", { reason: String(error?.message ?? error) }));
				} finally {
					chatBusy = false;
					if (ui !== null) ui.chatSend.disabled = ui.chatInput.disabled;
					renderLog();
					refreshAi();
					refreshAgent();
				}
			};

			// ---- self-test (v1.5.0) -------------------------------------------------
			const setSelftestNote = (text) => {
				if (ui !== null && ui.selftestNote !== null && ui.selftestNote !== undefined) ui.selftestNote.textContent = text;
			};
			const withSelftestTimeout = (promise, ms) => {
				const win = hubBrowserWindow();
				if (win === null || typeof win.setTimeout !== "function") return Promise.resolve(promise);
				return new Promise((resolve, reject) => {
					let timer = 0;
					const settle = (fn, value) => {
						if (timer !== 0) {
							try {
								win.clearTimeout(timer);
							} catch {
								// the host already cleared it
							}
							timer = 0;
						}
						fn(value);
					};
					try {
						timer = win.setTimeout(() => resolve({ timeout: true }), ms);
					} catch {
						resolve(promise);
						return;
					}
					Promise.resolve(promise).then(
						(value) => settle(resolve, value),
						(error) => settle(reject, error),
					);
				});
			};
			const selftestFail = (detail) => ({ ok: false, detail });
			const selftestError = (error) => ({ ok: false, detail: TL_T("hub.selftest.detail.error", { reason: String(error?.message ?? error) }) });
			// ---- version fingerprint (v2.0.1) --------------------------------------
			// `_fingerprint` reports the exact installed build: version, git commit,
			// lib/client.js sha256, HOST_API, DSH version and install method. The
			// self-test and feedback panels show the same one-line form the GitHub issue
			// template requires, and the feedback JSON carries the whole object.
			let fingerprintCache = null;
			let fingerprintAt = 0;
			let fingerprintPending = null;
			const loadFingerprint = async (force) => {
				const now = Date.now();
				if (force !== true && fingerprintCache !== null && now - fingerprintAt < 60000) return fingerprintCache;
				if (fingerprintPending !== null && force !== true) return fingerprintPending;
				fingerprintPending = (async () => {
					try {
						const response = await fetch(ASSET_BASE + "/_fingerprint", { cache: "no-store" });
						if (response.ok !== true) return null;
						const value = await response.json();
						if (value === null || typeof value !== "object" || typeof value.line !== "string") return null;
						fingerprintCache = value;
						fingerprintAt = Date.now();
						return value;
					} catch {
						return null;
					} finally {
						fingerprintPending = null;
					}
				})();
				return fingerprintPending;
			};
			const fingerprintLine = () => (fingerprintCache !== null && typeof fingerprintCache.line === "string" ? fingerprintCache.line : TL_T("hub.fingerprint.unavailable"));
			const renderFingerprint = () => {
				if (ui === null) return;
				const line = fingerprintLine();
				if (ui.selftestFingerprint !== null && ui.selftestFingerprint !== undefined) ui.selftestFingerprint.textContent = line;
				if (ui.feedbackFingerprint !== null && ui.feedbackFingerprint !== undefined) ui.feedbackFingerprint.textContent = line;
			};
			const refreshFingerprint = () => {
				void loadFingerprint(false).then(renderFingerprint);
			};
			const copyFingerprint = async () => {
				if (fingerprintCache === null) await loadFingerprint(true);
				if (fingerprintCache === null) {
					setSelftestNote(TL_T("hub.fingerprint.unavailable"));
					return;
				}
				const copied = await hubCopyText(fingerprintCache.line);
				setSelftestNote(copied === true ? TL_T("hub.fingerprint.copied") : TL_T("hub.selftest.copyFailed"));
			};
			const selftestCheckDefs = [
				{
					id: "life",
					run: async () => {
						const life = hubLifeEngine();
						if (life === null || typeof life.status !== "function") return selftestFail(TL_T("hub.selftest.detail.missing"));
						const status = hubTry(() => life.status(), null, "selftest-life");
						if (status === null || typeof status !== "object") return selftestFail(TL_T("hub.selftest.detail.empty"));
						return { ok: status.version === 1 || typeof status.period === "string", detail: TL_T("hub.selftest.detail.ok") };
					},
				},
				{
					id: "pet",
					run: async () => {
						const pet = hubPetBrain();
						if (pet === null || typeof pet.status !== "function") return selftestFail(TL_T("hub.selftest.detail.missing"));
						const status = hubTry(() => pet.status(), null, "selftest-pet");
						if (status === null || typeof status !== "object") return selftestFail(TL_T("hub.selftest.detail.empty"));
						const rows = typeof pet.permissions === "function" ? hubTry(() => pet.permissions(), null, "selftest-perms") : null;
						const count = Array.isArray(rows) ? rows.length : 0;
						return { ok: count > 0, detail: count + " caps" };
					},
				},
				{
					id: "glass",
					run: async () => {
						const controller = hubGlassDepthController();
						if (controller === null || typeof controller.read !== "function" || typeof controller.effective !== "function") {
							return selftestFail(TL_T("hub.selftest.detail.missing"));
						}
						const depth = hubTry(() => controller.read(), null, "selftest-glass");
						const effective = hubTry(() => controller.effective(), null, "selftest-glass");
						const valid = HUB_GLASS_LEVELS.includes(depth) && HUB_GLASS_LEVELS.includes(effective);
						return { ok: valid, detail: String(depth) + " / " + String(effective) };
					},
				},
				{
					id: "media",
					run: async () => {
						const life = hubLifeEngine();
						if (life === null || typeof life.listMedia !== "function") return selftestFail(TL_T("hub.selftest.detail.missing"));
						try {
							const result = await withSelftestTimeout(life.listMedia(), 4000);
							if (result !== null && typeof result === "object" && result.timeout === true) return selftestFail(TL_T("hub.selftest.detail.error", { reason: "timeout" }));
							if (result === null || typeof result !== "object" || Array.isArray(result.items) === false) return selftestFail(TL_T("hub.selftest.detail.empty"));
							return { ok: true, detail: result.items.length + " items" };
						} catch (error) {
							return selftestError(error);
						}
					},
				},
				{
					id: "weather",
					run: async () => {
						const weather = hubWeather();
						if (weather === null || typeof weather.summary !== "function") return selftestFail(TL_T("hub.selftest.detail.missing"));
						const snapshot = hubWeatherSnapshot(weather);
						if (snapshot === null) return selftestFail(TL_T("hub.selftest.detail.empty"));
						const detail = snapshot.text !== "" ? snapshot.text : TL_T("hub.selftest.detail.empty");
						return { ok: typeof snapshot.runtime === "boolean", detail };
					},
				},
				{
					id: "agent",
					run: async () => {
						const agent = hubPetAgent();
						if (agent === null || typeof agent.status !== "function") return selftestFail(TL_T("hub.selftest.detail.missing"));
						const status = hubTry(() => agent.status(), null, "selftest-agent");
						if (status === null || typeof status !== "object") return selftestFail(TL_T("hub.selftest.detail.empty"));
						return { ok: typeof status.available === "boolean", detail: status.available === true ? "available" : "unavailable" };
					},
				},
				{
					id: "hub",
					run: async () => {
						const hubStatus = hubTry(() => status(), null, "selftest-hub");
						if (hubStatus === null || typeof hubStatus !== "object") return selftestFail(TL_T("hub.selftest.detail.empty"));
						const ok = typeof hubStatus.version === "number" && hubStatus.dependencies !== null && typeof hubStatus.dependencies === "object";
						return { ok, detail: TL_T("hub.selftest.detail.ok") };
					},
				},
			];
			const renderSelftest = () => {
				if (ui === null) return;
				const box = ui.selftestList;
				box.textContent = "";
				let pass = 0;
				let fail = 0;
				for (const result of selftestResults) {
					if (result.ok === true) pass += 1;
					else fail += 1;
					box.appendChild(
						hubCreate("div", { className: "tl-hub-selftest-row", "data-tl-hub-selftest-item": result.id, "data-ok": result.ok === true ? "true" : "false" }, [
							hubCreate("span", { className: "tl-hub-selftest-name" }, TL_T(HUB_SELFTEST_ITEM_KEYS[result.id] ?? "hub.selftest.unknown")),
							hubCreate("span", { className: "tl-hub-selftest-state", "data-ok": result.ok === true ? "true" : "false" }, result.ok === true ? TL_T("hub.selftest.pass") : TL_T("hub.selftest.fail")),
							hubCreate("span", { className: "tl-hub-selftest-detail" }, String(result.detail ?? "")),
						]),
					);
				}
				ui.selftestSummary.textContent =
					selftestResults.length === 0 ? TL_T("hub.selftest.empty") : TL_T("hub.selftest.summary", { pass, fail });
			};
			const selftestText = () => {
				let pass = 0;
				let fail = 0;
				const lines = [];
				lines.push(TL_T("hub.fingerprint.title") + ": " + fingerprintLine());
				for (const result of selftestResults) {
					if (result.ok === true) pass += 1;
					else fail += 1;
					lines.push(TL_T(HUB_SELFTEST_ITEM_KEYS[result.id] ?? "hub.selftest.unknown") + ": " + (result.ok === true ? TL_T("hub.selftest.pass") : TL_T("hub.selftest.fail")) + " · " + String(result.detail ?? ""));
				}
				lines.push(TL_T("hub.selftest.summary", { pass, fail }));
				return lines.join("\n");
			};
			const runSelftest = async () => {
				if (selftestBusy === true || ui === null) return;
				selftestBusy = true;
				ui.selftestRun.disabled = true;
				ui.selftestCopy.disabled = true;
				setSelftestNote(TL_T("hub.selftest.running"));
				selftestResults.length = 0;
				renderSelftest();
				for (const def of selftestCheckDefs) {
					let result = null;
					try {
						result = await def.run();
					} catch (error) {
						result = selftestError(error);
					}
					selftestResults.push({
						id: def.id,
						ok: result !== null && result.ok === true,
						detail: result !== null && typeof result.detail === "string" ? result.detail : "",
					});
					renderSelftest();
				}
				setSelftestNote("");
				selftestBusy = false;
				if (ui !== null) {
					ui.selftestRun.disabled = false;
					ui.selftestCopy.disabled = false;
				}
			};
			const copySelftest = async () => {
				if (selftestBusy === true) return;
				if (selftestResults.length === 0) await runSelftest();
				const copied = await hubCopyText(selftestText());
				setSelftestNote(copied === true ? TL_T("hub.selftest.copied") : TL_T("hub.selftest.copyFailed"));
			};

			// ---- feedback panel (v1.5.0) -------------------------------------------
			const setFeedbackStatus = (text) => {
				if (ui !== null && ui.feedbackStatus !== null && ui.feedbackStatus !== undefined) ui.feedbackStatus.textContent = text;
			};
			const buildFeedbackPayload = () => {
				const life = hubLifeEngine();
				const pet = hubPetBrain();
				const glassController = hubGlassDepthController();
				const weather = hubWeather();
				const agent = hubPetAgent();
				const lifeStatus = life !== null ? hubTry(() => life.status?.(), null, "feedback-life") : null;
				const petStatus = pet !== null ? hubTry(() => pet.status?.(), null, "feedback-pet") : null;
				const petPermissions = pet !== null && typeof pet.permissions === "function" ? hubTry(() => pet.permissions(), null, "feedback-perms") : null;
				const glass =
					glassController !== null
						? {
								depth: hubTry(() => glassController.read(), "unknown", "feedback-glass"),
								effective: hubTry(() => glassController.effective(), "unknown", "feedback-glass"),
							}
						: null;
				const agentStatus = agent !== null ? hubTry(() => agent.status?.(), null, "feedback-agent") : null;
				const hubStatus = hubTry(() => status(), null, "feedback-hub");
				let userAgent = "";
				try {
					userAgent = String(typeof navigator !== "undefined" && navigator !== null ? navigator.userAgent ?? "" : "").slice(0, 200);
				} catch {
					userAgent = "";
				}
				const note = ui !== null && ui.feedbackText !== null && ui.feedbackText !== undefined ? String(ui.feedbackText.value ?? "").trim() : "";
				return {
					schema: "tianlight-feedback@1",
					at: new Date().toISOString(),
					version: hubVersionString(),
					fingerprint: fingerprintCache,
					fingerprintLine: fingerprintLine(),
					userAgent,
					note,
					hub: hubStatus,
					life: lifeStatus,
					pet: { status: petStatus, permissions: petPermissions },
					glass,
					weather: hubWeatherSnapshot(weather),
					agent: agentStatus,
				};
			};
			const onFeedbackCopy = () => {
				runAsync(async () => {
					setFeedbackStatus(TL_T("hub.loading"));
					let text = "";
					try {
						text = JSON.stringify(buildFeedbackPayload(), null, 2);
					} catch (error) {
						setFeedbackStatus(TL_T("hub.feedback.copyFailed"));
						return;
					}
					const copied = await hubCopyText(text);
					setFeedbackStatus(copied === true ? TL_T("hub.feedback.copied") : TL_T("hub.feedback.copyFailed"));
				});
			};
			const onFeedbackIssue = () => {
				try {
					const payload = buildFeedbackPayload();
					const note = payload.note !== "" ? payload.note : TL_T("hub.feedback.issueBody");
					let json = "";
					try {
						json = JSON.stringify(payload, null, 2).slice(0, 6000);
					} catch {
						json = "";
					}
					const body = note + "\n\n```json\n" + json + "\n```";
					const url =
						"https://github.com/MilkySnowWay123/dsh-client-ui-skin-tianlight/issues/new?title=" +
						encodeURIComponent(TL_T("hub.feedback.issueTitle")) +
						"&body=" +
						encodeURIComponent(body);
					const win = hubBrowserWindow();
					if (win === null || typeof win.open !== "function") {
						setFeedbackStatus(TL_T("hub.feedback.unsupported"));
						return;
					}
					const opened = win.open(url, "_blank", "noopener,noreferrer");
					setFeedbackStatus(opened === null || opened === undefined ? TL_T("hub.feedback.issueBlocked") : TL_T("hub.feedback.issueOpened"));
				} catch (error) {
					setLastError("feedback-issue", error);
					setFeedbackStatus(TL_T("hub.feedback.issueBlocked"));
				}
			};
			const onFeedbackDownload = () => {
				try {
					const filename = "tianlight-feedback-" + Date.now() + ".json";
					const result = hubDownloadJson(buildFeedbackPayload(), filename);
					if (result !== null && typeof result === "object" && result.ok === true) {
						setFeedbackStatus(TL_T("hub.feedback.downloaded", { name: result.name }));
					} else {
						const rawReason = result !== null && typeof result === "object" && typeof result.reason === "string" ? result.reason : "";
						const reason = rawReason === "" || rawReason === "unsupported" ? TL_T("hub.feedback.unsupported") : rawReason;
						setFeedbackStatus(TL_T("hub.feedback.downloadFailed", { reason }));
					}
				} catch (error) {
					setLastError("feedback-download", error);
					setFeedbackStatus(TL_T("hub.feedback.downloadFailed", { reason: String(error?.message ?? error) }));
				}
			};

			// ---- overlay build ------------------------------------------------------
			const buildOverlay = () => {
				const state = { glassButtons: {} };
				const root = hubCreate("div", {
					"data-tl-hub": "",
					id: HUB_DOM_ID,
					className: "tl-hub",
					role: "dialog",
					"aria-modal": "true",
					"aria-label": TL_T("hub.title"),
				});
				const mask = hubCreate("div", { "data-tl-hub-mask": "", className: "tl-hub-mask", "aria-hidden": "true" });
				mask.addEventListener("click", () => close());
				const panel = hubCreate("div", { "data-tl-hub-panel": "", className: "tl-hub-panel" });
				const head = hubCreate("div", { "data-tl-hub-head": "", className: "tl-hub-head" }, [
					hubCreate("h2", { className: "tl-hub-title" }, TL_T("hub.title")),
				]);
				const closeButton = hubCreate(
					"button",
					{ type: "button", "data-tl-hub-close": "", className: "tl-hub-close", "aria-label": TL_T("hub.close"), title: TL_T("hub.close") },
					"×",
				);
				closeButton.addEventListener("click", () => close());
				head.appendChild(closeButton);
				state.closeButton = closeButton;
				const body = hubCreate("div", { "data-tl-hub-body": "", className: "tl-hub-body" });

				// a) life status + quick controls
				const statusCard = hubCreate("section", { "data-tl-hub-status": "", className: "tl-hub-card tl-hub-status" }, [
					hubCreate("h3", { className: "tl-hub-card-title" }, TL_T("hub.status.title")),
				]);
				const statusGrid = hubCreate("div", { className: "tl-hub-status-grid" });
				const addStatusValue = (labelKey, slotName) => {
					statusGrid.appendChild(hubCreate("span", { className: "tl-hub-status-key" }, TL_T(labelKey) + "："));
					const value = hubCreate("span", { className: "tl-hub-status-value", "data-tl-hub-status-value": slotName });
					statusGrid.appendChild(value);
					statusGrid.appendChild(hubCreate("span", { className: "tl-hub-status-sep", "aria-hidden": "true" }, " · "));
					return value;
				};
				state.periodValue = addStatusValue("hub.status.period", "period");
				state.awakeValue = addStatusValue("hub.status.awake", "awake");
				state.quietValue = addStatusValue("hub.status.quiet", "quiet");
				state.budgetValue = addStatusValue("hub.status.budget", "budget");
				state.streakValue = addStatusValue("hub.status.streak", "streak");
				state.aiValue = addStatusValue("hub.status.ai", "ai");
				state.statusCard = statusCard;
				state.statusNote = hubCreate("p", { className: "tl-hub-note tl-hub-hint", "data-tl-hub-status-note": "" }, "");
				statusCard.appendChild(statusGrid);
				statusCard.appendChild(state.statusNote);
				const quickRow = hubCreate("div", { className: "tl-hub-row" });
				state.focusButton = hubCreate("button", { type: "button", "data-tl-hub-focus": "", className: "tl-hub-btn" }, TL_T("hub.focus.start"));
				state.focusButton.addEventListener("click", () => {
					const life = hubLifeEngine();
					if (life === null) return;
					const active = hubTry(() => life.focusStatus?.()?.active === true, false, "focus-click");
					hubTry(() => (active ? life.focusStop?.() : life.focusStart?.(25)), null, "focus-toggle");
					refreshStatus();
				});
				state.muteButton = hubCreate("button", { type: "button", "data-tl-hub-mute": "", className: "tl-hub-btn" }, TL_T("hub.mute.start"));
				state.muteButton.addEventListener("click", () => {
					const life = hubLifeEngine();
					if (life === null) return;
					hubTry(() => life.muteFor?.(3600000), null, "mute");
					setAiNote("");
					refreshStatus();
				});
				quickRow.appendChild(state.focusButton);
				quickRow.appendChild(state.muteButton);
				statusCard.appendChild(quickRow);
				body.appendChild(statusCard);

				// a2) life rhythm settings (v1.3.0: moved out of the deleted settings page)
				const lifeCard = hubCreate("section", { "data-tl-hub-life-config": "", className: "tl-hub-card tl-hub-life" }, [
					hubCreate("h3", { className: "tl-hub-card-title" }, TL_T("hub.life.title")),
				]);
				const lifeQuietRow = hubCreate("div", { className: "tl-hub-row" });
				lifeQuietRow.appendChild(hubCreate("span", { className: "tl-hub-status-key" }, TL_T("hub.life.quiet") + "："));
				state.lifeQuietEnabled = hubCreate("input", {
					type: "checkbox",
					"data-tl-hub-quiet-enabled": "",
					className: "tl-hub-check",
					"aria-label": TL_T("hub.life.quietOn"),
				});
				lifeQuietRow.appendChild(state.lifeQuietEnabled);
				state.lifeQuietStart = hubCreate("input", {
					type: "time",
					"data-tl-hub-quiet-start": "",
					className: "tl-hub-input tl-hub-time",
					"aria-label": TL_T("hub.life.quietStart"),
				});
				lifeQuietRow.appendChild(state.lifeQuietStart);
				lifeQuietRow.appendChild(hubCreate("span", { className: "tl-hub-status-key" }, "→"));
				state.lifeQuietEnd = hubCreate("input", {
					type: "time",
					"data-tl-hub-quiet-end": "",
					className: "tl-hub-input tl-hub-time",
					"aria-label": TL_T("hub.life.quietEnd"),
				});
				lifeQuietRow.appendChild(state.lifeQuietEnd);
				lifeCard.appendChild(lifeQuietRow);
				const lifeRhythmRow = hubCreate("div", { className: "tl-hub-row" });
				lifeRhythmRow.appendChild(hubCreate("span", { className: "tl-hub-status-key" }, TL_T("hub.life.budget") + "："));
				state.lifeBudget = hubCreate("input", {
					type: "number",
					min: "0",
					max: "50",
					step: "1",
					"data-tl-hub-budget": "",
					className: "tl-hub-input tl-hub-num",
					"aria-label": TL_T("hub.life.budget"),
				});
				lifeRhythmRow.appendChild(state.lifeBudget);
				lifeRhythmRow.appendChild(hubCreate("span", { className: "tl-hub-status-key" }, TL_T("hub.life.wake") + "："));
				state.lifeWake = hubCreate("input", {
					type: "time",
					"data-tl-hub-wake": "",
					className: "tl-hub-input tl-hub-time",
					"aria-label": TL_T("hub.life.wake"),
				});
				lifeRhythmRow.appendChild(state.lifeWake);
				lifeRhythmRow.appendChild(hubCreate("span", { className: "tl-hub-status-key" }, TL_T("hub.life.sleep") + "："));
				state.lifeSleep = hubCreate("input", {
					type: "time",
					"data-tl-hub-sleep": "",
					className: "tl-hub-input tl-hub-time",
					"aria-label": TL_T("hub.life.sleep"),
				});
				lifeRhythmRow.appendChild(state.lifeSleep);
				lifeCard.appendChild(lifeRhythmRow);
				const lifeApplyRow = hubCreate("div", { className: "tl-hub-row" });
				lifeApplyRow.appendChild(hubCreate("span", { className: "tl-hub-status-key" }, TL_T("hub.life.virtual") + "："));
				state.lifeVirtual = hubCreate("input", {
					type: "number",
					min: "-720",
					max: "720",
					step: "15",
					"data-tl-hub-virtual-offset": "",
					className: "tl-hub-input tl-hub-num",
					"aria-label": TL_T("hub.life.virtual"),
				});
				lifeApplyRow.appendChild(state.lifeVirtual);
				state.lifeApply = hubCreate("button", { type: "button", "data-tl-hub-life-apply": "", className: "tl-hub-btn" }, TL_T("hub.life.apply"));
				state.lifeApply.addEventListener("click", () => runAsync(applyLifeConfig));
				lifeApplyRow.appendChild(state.lifeApply);
				lifeCard.appendChild(lifeApplyRow);
				// R5: typing in any rhythm field marks an unsaved draft so the 4s refresh
				// never overwrites it, and closing (Esc included) persists it.
				for (const input of [
					state.lifeQuietEnabled,
					state.lifeQuietStart,
					state.lifeQuietEnd,
					state.lifeBudget,
					state.lifeWake,
					state.lifeSleep,
					state.lifeVirtual,
				]) {
					if (input === null || input === undefined) continue;
					input.addEventListener("input", markLifeDraft);
					input.addEventListener("change", markLifeDraft);
				}
				state.lifeMemory = hubCreate("p", { className: "tl-hub-hint", "data-tl-hub-memory": "" }, "");
				lifeCard.appendChild(state.lifeMemory);
				state.lifeNote = hubCreate("p", { className: "tl-hub-hint", "data-tl-hub-life-note": "", role: "status" }, "");
				lifeCard.appendChild(state.lifeNote);
				body.appendChild(lifeCard);

				// a3) weather (v1.5.0): the weather engine owns networking + geolocation
				const weatherCard = hubCreate("section", { "data-tl-hub-weather": "", className: "tl-hub-card tl-hub-weather" }, [
					hubCreate("h3", { className: "tl-hub-card-title" }, TL_T("hub.weather.title")),
					hubCreate("p", { className: "tl-hub-note tl-hub-hint" }, TL_T("hub.weather.hint")),
				]);
				state.weatherStatus = hubCreate(
					"p",
					{ className: "tl-hub-note tl-hub-hint", "data-tl-hub-weather-status": "", role: "status" },
					TL_T("hub.weather.unavailable"),
				);
				weatherCard.appendChild(state.weatherStatus);
				const weatherEnableRow = hubCreate("div", { className: "tl-hub-row" });
				weatherEnableRow.appendChild(hubCreate("span", { className: "tl-hub-status-key" }, TL_T("hub.weather.enable") + "："));
				state.weatherEnabled = hubCreate("input", {
					type: "checkbox",
					"data-tl-hub-weather-enabled": "",
					className: "tl-hub-check",
					"aria-label": TL_T("hub.weather.enable"),
				});
				state.weatherEnabled.addEventListener("change", () => runAsync(onWeatherEnabled));
				weatherEnableRow.appendChild(state.weatherEnabled);
				weatherCard.appendChild(weatherEnableRow);
				const weatherCityRow = hubCreate("div", { className: "tl-hub-row" });
				weatherCityRow.appendChild(hubCreate("span", { className: "tl-hub-status-key" }, TL_T("hub.weather.city") + "："));
				state.weatherCity = hubCreate("input", {
					type: "text",
					"data-tl-hub-weather-city": "",
					className: "tl-hub-input",
					placeholder: TL_T("hub.weather.cityPlaceholder"),
					"aria-label": TL_T("hub.weather.city"),
				});
				weatherCityRow.appendChild(state.weatherCity);
				state.weatherResolve = hubCreate("button", { type: "button", "data-tl-hub-weather-resolve": "", className: "tl-hub-btn" }, TL_T("hub.weather.resolve"));
				state.weatherResolve.addEventListener("click", () => runAsync(onWeatherResolve));
				weatherCityRow.appendChild(state.weatherResolve);
				weatherCard.appendChild(weatherCityRow);
				const weatherCoordsRow = hubCreate("div", { className: "tl-hub-row" });
				weatherCoordsRow.appendChild(hubCreate("span", { className: "tl-hub-status-key" }, TL_T("hub.weather.lat") + "："));
				state.weatherLat = hubCreate("input", {
					type: "number",
					step: "0.0001",
					min: "-90",
					max: "90",
					"data-tl-hub-weather-lat": "",
					className: "tl-hub-input tl-hub-num",
					"aria-label": TL_T("hub.weather.lat"),
				});
				weatherCoordsRow.appendChild(state.weatherLat);
				weatherCoordsRow.appendChild(hubCreate("span", { className: "tl-hub-status-key" }, TL_T("hub.weather.lon") + "："));
				state.weatherLon = hubCreate("input", {
					type: "number",
					step: "0.0001",
					min: "-180",
					max: "180",
					"data-tl-hub-weather-lon": "",
					className: "tl-hub-input tl-hub-num",
					"aria-label": TL_T("hub.weather.lon"),
				});
				weatherCoordsRow.appendChild(state.weatherLon);
				state.weatherCoords = hubCreate("button", { type: "button", "data-tl-hub-weather-coords": "", className: "tl-hub-btn" }, TL_T("hub.weather.coords"));
				state.weatherCoords.addEventListener("click", () => runAsync(onWeatherCoords));
				weatherCoordsRow.appendChild(state.weatherCoords);
				weatherCard.appendChild(weatherCoordsRow);
				const weatherActionsRow = hubCreate("div", { className: "tl-hub-row" });
				state.weatherLocate = hubCreate("button", { type: "button", "data-tl-hub-weather-locate": "", className: "tl-hub-btn" }, TL_T("hub.weather.locate"));
				state.weatherLocate.addEventListener("click", () => runAsync(onWeatherLocate));
				weatherActionsRow.appendChild(state.weatherLocate);
				state.weatherRefresh = hubCreate("button", { type: "button", "data-tl-hub-weather-refresh": "", className: "tl-hub-btn" }, TL_T("hub.weather.refresh"));
				state.weatherRefresh.addEventListener("click", () => runAsync(onWeatherRefresh));
				weatherActionsRow.appendChild(state.weatherRefresh);
				weatherCard.appendChild(weatherActionsRow);
				state.weatherNote = hubCreate("p", { className: "tl-hub-note tl-hub-hint", "data-tl-hub-weather-note": "", role: "status" }, "");
				weatherCard.appendChild(state.weatherNote);
				body.appendChild(weatherCard);

				// b) liquid glass
				const glassCard = hubCreate("section", { "data-tl-hub-glass-card": "", className: "tl-hub-card" }, [
					hubCreate("h3", { className: "tl-hub-card-title" }, TL_T("hub.glass.title")),
				]);
				const glassRow = hubCreate("div", { className: "tl-hub-choices" });
				for (const level of HUB_GLASS_LEVELS) {
					const button = hubCreate("button", { type: "button", className: "tl-hub-choice", "data-tl-hub-glass": level, "aria-pressed": "false" }, TL_T(HUB_GLASS_LABEL_KEYS[level]));
					button.addEventListener("click", () => applyGlass(level));
					state.glassButtons[level] = button;
					glassRow.appendChild(button);
				}
				glassCard.appendChild(glassRow);
				state.glassPreview = hubCreate(
					"div",
					{ className: "tl-hub-glass-preview", "data-tl-glass-preview": "off", "data-tl-hub-glass-preview": "", "data-depth": "off" },
					"",
				);
				state.glassPreviewLabel = hubCreate("span", { className: "tl-hub-glass-preview-label", "data-tl-glass-preview-label": "" }, "");
				state.glassPreview.appendChild(state.glassPreviewLabel);
				glassCard.appendChild(state.glassPreview);
				state.glassEffective = hubCreate("p", { className: "tl-hub-note tl-hub-hint", "data-tl-hub-glass-effective": "" }, "");
				glassCard.appendChild(state.glassEffective);
				glassCard.appendChild(hubCreate("p", { className: "tl-hub-note tl-hub-hint", "data-tl-hub-glass-hint": "" }, TL_T("hub.glass.previewHint")));
				// v2.0.1: one-click "author's default look" (appearance keys only).
				const appearanceRow = hubCreate("div", { className: "tl-hub-row" });
				state.appearanceReset = hubCreate("button", { type: "button", "data-tl-hub-appearance-reset": "", className: "tl-hub-btn" }, TL_T("hub.appearance.reset"));
				state.appearanceReset.addEventListener("click", () => resetDefaultAppearance());
				appearanceRow.appendChild(state.appearanceReset);
				glassCard.appendChild(appearanceRow);
				state.appearanceNote = hubCreate("p", { className: "tl-hub-note tl-hub-hint", "data-tl-hub-appearance-note": "", role: "status" }, TL_T("hub.appearance.hint"));
				glassCard.appendChild(state.appearanceNote);
				body.appendChild(glassCard);

				// c) companion look: catalog select + local upload
				const mediaCard = hubCreate("section", { "data-tl-hub-media-card": "", className: "tl-hub-card" }, [
					hubCreate("h3", { className: "tl-hub-card-title" }, TL_T("hub.media.title")),
					hubCreate("p", { className: "tl-hub-note tl-hub-hint" }, TL_T("hub.upload.hint")),
				]);
				const mediaRow = hubCreate("div", { className: "tl-hub-row" });
				state.mediaSelect = hubCreate("select", { "data-tl-hub-media": "", className: "tl-hub-select", "aria-label": TL_T("hub.media.select") });
				// v1.6.4: choosing another value in the (still supported) select reloads
				// the action pack editor for that look.
				state.mediaSelect.addEventListener("change", () => runAsync(loadEffectivePack));
				state.mediaApply = hubCreate("button", { type: "button", "data-tl-hub-media-apply": "", className: "tl-hub-btn" }, TL_T("hub.media.apply"));
				state.mediaApply.addEventListener("click", () => runAsync(applySelectedMedia));
				mediaRow.appendChild(state.mediaSelect);
				mediaRow.appendChild(state.mediaApply);
				state.mediaDefault = hubCreate("button", { type: "button", "data-tl-hub-media-default": "", className: "tl-hub-btn" }, TL_T("hub.media.restoreDefault"));
				state.mediaDefault.addEventListener("click", () => runAsync(restoreDefaultMedia));
				mediaRow.appendChild(state.mediaDefault);
				mediaCard.appendChild(mediaRow);
				// v1.6.4: always-visible filename list (the native select hid the names).
				mediaCard.appendChild(hubCreate("p", { className: "tl-hub-note tl-hub-hint", "data-tl-hub-media-list-hint": "" }, TL_T("hub.media.listHint")));
				state.mediaList = hubCreate("div", { "data-tl-hub-media-list": "", className: "tl-hub-media-list" });
				mediaCard.appendChild(state.mediaList);
				const uploadRow = hubCreate("div", { className: "tl-hub-row" });
				state.uploadInput = hubCreate("input", {
					type: "file",
					accept: "image/*,video/*",
					"data-tl-hub-upload-input": "",
					className: "tl-hub-file",
					hidden: true,
				});
				state.uploadInput.addEventListener("change", () => runAsync(handleUploadPicked));
				state.mediaUpload = hubCreate("button", { type: "button", "data-tl-hub-upload": "", className: "tl-hub-btn" }, TL_T("hub.upload.button"));
				state.mediaUpload.addEventListener("click", () => {
					try {
						state.uploadInput.click();
					} catch (error) {
						setLastError("upload-pick", error);
					}
				});
				uploadRow.appendChild(state.mediaUpload);
				uploadRow.appendChild(state.uploadInput);
				mediaCard.appendChild(uploadRow);
				state.mediaStatus = hubCreate("p", { className: "tl-hub-note tl-hub-hint", "data-tl-hub-media-status": "" }, "");
				state.mediaRejected = hubCreate("p", { className: "tl-hub-note tl-hub-hint", "data-tl-hub-media-rejected": "" }, "");
				mediaCard.appendChild(state.mediaStatus);
				mediaCard.appendChild(state.mediaRejected);
				state.uploadStatus = hubCreate("p", { className: "tl-hub-note tl-hub-hint", "data-tl-hub-upload-status": "", role: "status" }, "");
				mediaCard.appendChild(state.uploadStatus);
				// v1.6.4: per-look action pack editor. The companion owns the data
				// (globalThis.tianlightPetActions), so the hub only reads/writes it.
				const packSection = hubCreate("section", { "data-tl-hub-media-pack": "", className: "tl-hub-media-pack" }, [
					hubCreate("h4", { className: "tl-hub-pack-title", "data-tl-hub-pack-title": "" }, TL_T("hub.media.pack.title")),
					hubCreate("p", { className: "tl-hub-note tl-hub-hint" }, TL_T("hub.media.pack.hint")),
				]);
				state.packLabels = {};
				state.packLines = {};
				for (const actionId of HUB_PACK_ACTIONS) {
					const labelKey = HUB_PACK_LABEL_KEYS[actionId] ?? "hub.media.pack.labelPet";
					const actionRow = hubCreate("div", { className: "tl-hub-pack-row", "data-tl-hub-pack-row": actionId });
					state.packLabels[actionId] = hubCreate("input", {
						type: "text",
						className: "tl-hub-input tl-hub-pack-label",
						"data-tl-hub-pack-label": actionId,
						maxlength: String(HUB_PACK_LABEL_MAX),
						placeholder: TL_T(labelKey),
						"aria-label": TL_T(labelKey),
					});
					state.packLines[actionId] = hubCreate("textarea", {
						className: "tl-hub-input tl-hub-textarea tl-hub-pack-lines",
						"data-tl-hub-pack-lines": actionId,
						rows: "2",
						placeholder: TL_T("hub.media.pack.linesPlaceholder"),
						"aria-label": TL_T(labelKey),
					});
					actionRow.appendChild(state.packLabels[actionId]);
					actionRow.appendChild(state.packLines[actionId]);
					packSection.appendChild(actionRow);
				}
				const packButtons = hubCreate("div", { className: "tl-hub-pack-actions", "data-tl-hub-pack-actions": "" });
				state.packSave = hubCreate("button", { type: "button", className: "tl-hub-btn", "data-tl-hub-pack-save": "" }, TL_T("hub.media.pack.save"));
				state.packSave.addEventListener("click", () => runAsync(savePack));
				state.packReset = hubCreate("button", { type: "button", className: "tl-hub-btn", "data-tl-hub-pack-reset": "" }, TL_T("hub.media.pack.reset"));
				// R5/R8b: destructive reset arms on the first click (5s expiry, disarmed by
				// any other card action) and only runs on the second click.
				state.packReset.addEventListener("click", () => {
					if (packResetPending !== true) {
						armPackReset();
						return;
					}
					disarmPackReset();
					runAsync(resetPack);
				});
				packButtons.appendChild(state.packSave);
				packButtons.appendChild(state.packReset);
				packSection.appendChild(packButtons);
				state.packStatus = hubCreate("p", { className: "tl-hub-note tl-hub-hint", "data-tl-hub-pack-status": "", role: "status" }, "");
				packSection.appendChild(state.packStatus);
				mediaCard.appendChild(packSection);
				body.appendChild(mediaCard);

				// d) AI chat + permissioned actions
				const aiCard = hubCreate("section", { "data-tl-hub-ai": "", className: "tl-hub-card tl-hub-ai" }, [
					hubCreate("h3", { className: "tl-hub-card-title" }, TL_T("hub.ai.title")),
					hubCreate("p", { className: "tl-hub-note tl-hub-hint" }, TL_T("hub.ai.hint")),
				]);
				const aiRow = hubCreate("div", { className: "tl-hub-row" });
				state.pauseButton = hubCreate("button", { type: "button", "data-tl-hub-pause": "", className: "tl-hub-btn" }, TL_T("hub.ai.pause"));
				state.pauseButton.addEventListener("click", () => runAsync(togglePause));
				state.llmButton = hubCreate("button", { type: "button", "data-tl-hub-perm": "llm", className: "tl-hub-btn", "data-tl-hub-llm-granted": "false" }, TL_T("hub.ai.llm.grant"));
				state.llmButton.addEventListener("click", (event) => runAsync(() => onLlmClick(event)));
				aiRow.appendChild(state.pauseButton);
				aiRow.appendChild(state.llmButton);
				aiCard.appendChild(aiRow);
				state.adapter = hubCreate("p", { className: "tl-hub-note tl-hub-hint", "data-tl-hub-adapter": "" }, TL_T("hub.ai.unavailable"));
				aiCard.appendChild(state.adapter);
				// plan A: only the provider is chosen here; the model follows the DSH
				// default selection. The label is redrawn by the shared i18n DOM sweep.
				const providerRow = hubCreate("div", { className: "tl-hub-row tl-hub-llm-provider-row", "data-tl-hub-llm-provider-row": "" });
				state.llmProviderLabel = hubCreate(
					"span",
					{ className: "tl-hub-hint", "data-tl-i18n-key": "hub.ai.llm.providerLabel" },
					TL_T("hub.ai.llm.providerLabel"),
				);
				state.llmProvider = hubCreate("select", {
					"data-tl-hub-llm-provider": "",
					className: "tl-hub-select",
					"aria-label": TL_T("hub.ai.llm.providerLabel"),
				});
				state.llmProvider.addEventListener("change", (event) => runAsync(() => onProviderChange(event)));
				providerRow.appendChild(state.llmProviderLabel);
				providerRow.appendChild(state.llmProvider);
				aiCard.appendChild(providerRow);
				state.aiNote = hubCreate("p", { className: "tl-hub-note tl-hub-hint", "data-tl-hub-ai-note": "", role: "status" }, "");
				aiCard.appendChild(state.aiNote);
				const chatRow = hubCreate("div", { className: "tl-hub-row" });
				state.chatInput = hubCreate("input", {
					type: "text",
					"data-tl-hub-chat-input": "",
					className: "tl-hub-input",
					maxlength: String(HUB_AI_INPUT_MAX),
					placeholder: TL_T("hub.ai.inputPlaceholder"),
					"aria-label": TL_T("hub.ai.inputPlaceholder"),
				});
				state.chatInput.addEventListener("keydown", (event) => {
					if (event === null || event === undefined || event.key !== "Enter") return;
					if (typeof event.preventDefault === "function") event.preventDefault();
					runAsync(() => sendChat(event));
				});
				state.chatSend = hubCreate("button", { type: "button", "data-tl-hub-chat-send": "", className: "tl-hub-btn" }, TL_T("hub.ai.send"));
				state.chatSend.addEventListener("click", (event) => runAsync(() => sendChat(event)));
				chatRow.appendChild(state.chatInput);
				chatRow.appendChild(state.chatSend);
				aiCard.appendChild(chatRow);
				state.logBox = hubCreate("div", { "data-tl-hub-log": "", className: "tl-hub-log", role: "log", "aria-live": "polite" });
				aiCard.appendChild(state.logBox);
				body.appendChild(aiCard);

				// d1) v1.6.8 autonomous thinking (fully agentic companion, opt-in):
				// enable/pause, interval, autonomous-speech switch, "think now", the
				// latest five thoughts and one status line. Read-through only.
				const mindCard = hubCreate("section", { "data-tl-hub-mind": "", className: "tl-hub-card tl-hub-mind" }, [
					hubCreate("h3", { className: "tl-hub-card-title" }, TL_T("hub.mind.title")),
					hubCreate("p", { className: "tl-hub-note tl-hub-hint" }, TL_T("hub.mind.hint")),
				]);
				state.mindCard = mindCard;
				const mindRow = hubCreate("div", { className: "tl-hub-row" });
				state.mindToggle = hubCreate(
					"button",
					{ type: "button", "data-tl-hub-mind-toggle": "", className: "tl-hub-btn", "data-tl-hub-mind-enabled": "false" },
					TL_T("hub.mind.enable"),
				);
				state.mindToggle.addEventListener("click", () => runAsync(onMindToggle));
				mindRow.appendChild(state.mindToggle);
				state.mindInterval = hubCreate("select", {
					"data-tl-hub-mind-interval": "",
					className: "tl-hub-select",
					"aria-label": TL_T("hub.mind.interval"),
				});
				for (const minutes of HUB_MIND_INTERVALS) {
					state.mindInterval.appendChild(hubCreate("option", { value: String(minutes) }, TL_T("hub.mind.intervalValue", { n: minutes })));
				}
				state.mindInterval.value = "15";
				state.mindInterval.addEventListener("change", () => runAsync(onMindInterval));
				mindRow.appendChild(state.mindInterval);
				const mindSpeakBox = hubCreate("span", { className: "tl-hub-mind-speak" });
				state.mindSpeak = hubCreate("input", { type: "checkbox", "data-tl-hub-mind-speak": "" });
				state.mindSpeak.checked = true;
				state.mindSpeak.addEventListener("change", () => runAsync(onMindSpeak));
				mindSpeakBox.appendChild(state.mindSpeak);
				mindSpeakBox.appendChild(hubCreate("span", { className: "tl-hub-mind-speak-label" }, TL_T("hub.mind.speak")));
				mindRow.appendChild(mindSpeakBox);
				// S1: separate opt-in for LLM inner monologue (independent daily budget).
				const mindLlmBox = hubCreate("span", { className: "tl-hub-mind-speak", title: TL_T("hub.mind.llmHint") });
				state.mindLlm = hubCreate("input", { type: "checkbox", "data-tl-hub-mind-llm": "" });
				state.mindLlm.addEventListener("change", () => runAsync(onMindLlm));
				mindLlmBox.appendChild(state.mindLlm);
				mindLlmBox.appendChild(hubCreate("span", { className: "tl-hub-mind-speak-label" }, TL_T("hub.mind.llm")));
				mindRow.appendChild(mindLlmBox);
				mindCard.appendChild(mindRow);
				const mindActionRow = hubCreate("div", { className: "tl-hub-row" });
				state.mindThink = hubCreate("button", { type: "button", "data-tl-hub-mind-think": "", className: "tl-hub-btn" }, TL_T("hub.mind.think"));
				state.mindThink.addEventListener("click", () => runAsync(onMindThink));
				mindActionRow.appendChild(state.mindThink);
				state.mindClear = hubCreate("button", { type: "button", "data-tl-hub-mind-clear": "", className: "tl-hub-btn" }, TL_T("hub.mind.clear"));
				// R5/R8b: clearing thoughts cannot be undone; arm with expiry before running.
				state.mindClear.addEventListener("click", () => {
					if (mindClearPending !== true) {
						armMindClear();
						return;
					}
					disarmMindClear();
					runAsync(onMindClear);
				});
				mindActionRow.appendChild(state.mindClear);
				mindCard.appendChild(mindActionRow);
				state.mindThoughts = hubCreate("div", {
					"data-tl-hub-mind-thoughts": "",
					className: "tl-hub-mind-thoughts",
					role: "log",
					"aria-live": "polite",
				});
				mindCard.appendChild(state.mindThoughts);
				state.mindStatus = hubCreate("p", { className: "tl-hub-note tl-hub-hint", "data-tl-hub-mind-status": "", role: "status" }, "");
				mindCard.appendChild(state.mindStatus);
				body.appendChild(mindCard);

				// d2) experimental DSH Agent bridge (v1.2.0): permissioned hand-off of the
				// user's typed sentence to a user-selected DSH session. Never auto-triggers.
				const agentCard = hubCreate("section", { "data-tl-hub-agent": "", className: "tl-hub-card tl-hub-agent" }, [
					hubCreate("h3", { className: "tl-hub-card-title" }, TL_T("hub.agent.title")),
				]);
				state.agentStatus = hubCreate("p", { className: "tl-hub-hint", "data-tl-hub-agent-status": "", role: "status" }, TL_T("hub.agent.status.unavailable"));
				agentCard.appendChild(state.agentStatus);
				const agentPermRow = hubCreate("div", { className: "tl-hub-row" });
				state.agentPerm = hubCreate("button", { type: "button", "data-tl-hub-agent-perm": "", className: "tl-hub-btn", "data-tl-hub-agent-granted": "false" }, TL_T("hub.agent.perm.grant"));
				state.agentPerm.addEventListener("click", (event) => runAsync(() => onAgentPermClick(event)));
				agentPermRow.appendChild(state.agentPerm);
				agentCard.appendChild(agentPermRow);
				const agentTargetRow = hubCreate("div", { className: "tl-hub-row" });
				state.agentTarget = hubCreate("select", { "data-tl-hub-agent-target": "", className: "tl-hub-select", "aria-label": TL_T("hub.agent.target.label") });
				state.agentConnect = hubCreate("button", { type: "button", "data-tl-hub-agent-connect": "", className: "tl-hub-btn" }, TL_T("hub.agent.connect"));
				state.agentConnect.addEventListener("click", (event) => runAsync(() => onAgentConnect(event)));
				state.agentDisconnect = hubCreate("button", { type: "button", "data-tl-hub-agent-disconnect": "", className: "tl-hub-btn" }, TL_T("hub.agent.disconnect"));
				state.agentDisconnect.addEventListener("click", () => runAsync(onAgentDisconnect));
				state.agentOpen = hubCreate("button", { type: "button", "data-tl-hub-agent-open": "", className: "tl-hub-btn" }, TL_T("hub.agent.open"));
				state.agentOpen.addEventListener("click", () => runAsync(onAgentOpen));
				agentTargetRow.appendChild(state.agentTarget);
				agentTargetRow.appendChild(state.agentConnect);
				agentTargetRow.appendChild(state.agentDisconnect);
				agentTargetRow.appendChild(state.agentOpen);
				agentCard.appendChild(agentTargetRow);
				state.agentNote = hubCreate("p", { className: "tl-hub-hint", "data-tl-hub-agent-note": "", role: "status" }, "");
				agentCard.appendChild(state.agentNote);
				state.agentHint = hubCreate("p", { className: "tl-hub-hint", "data-tl-hub-agent-hint": "" }, TL_T("hub.agent.hint"));
				agentCard.appendChild(state.agentHint);
				body.appendChild(agentCard);

				// e) permission overview (v1.4.0: safe / medium / 6 grantable high / agent denied)
				const permCard = hubCreate("section", { "data-tl-hub-perms": "", className: "tl-hub-card" }, [
					hubCreate("h3", { className: "tl-hub-card-title" }, TL_T("hub.perm.title")),
					hubCreate("p", { className: "tl-hub-note tl-hub-hint" }, TL_T("hub.perm.hint")),
					hubCreate("p", { className: "tl-hub-perm-note", "data-tl-hub-perm-session-only": "" }, TL_T("hub.perm.sessionOnly")),
				]);
				state.permHighWarning = hubCreate("p", { className: "tl-hub-perm-note", "data-tl-hub-perm-high-warning": "" }, TL_T("hub.perm.highWarning"));
				state.permHighWarning.hidden = true;
				permCard.appendChild(state.permHighWarning);
				state.permRows = hubCreate("div", { className: "tl-hub-perm", "data-tl-hub-perm-list": "" });
				permCard.appendChild(state.permRows);
				state.permStatus = hubCreate("p", { className: "tl-hub-perm-note", "data-tl-hub-perm-status": "", role: "status" }, "");
				permCard.appendChild(state.permStatus);
				body.appendChild(permCard);

				// f) audit + settings hint
				const auditCard = hubCreate("section", { "data-tl-hub-audit-card": "", className: "tl-hub-card" }, [
					hubCreate("h3", { className: "tl-hub-card-title" }, TL_T("hub.audit.title")),
				]);
				state.auditBox = hubCreate("div", { "data-tl-hub-audit": "", className: "tl-hub-audit" });
				auditCard.appendChild(state.auditBox);
				body.appendChild(auditCard);

				// g) self-test + feedback (v1.5.0): diagnostics the user can attach to a report
				const selftestCard = hubCreate("section", { "data-tl-hub-selftest-card": "", className: "tl-hub-card" }, [
					hubCreate("h3", { className: "tl-hub-card-title" }, TL_T("hub.selftest.title")),
					hubCreate("p", { className: "tl-hub-note tl-hub-hint" }, TL_T("hub.selftest.hint")),
				]);
				state.selftestFingerprint = hubCreate("p", { className: "tl-hub-note tl-hub-fingerprint", "data-tl-hub-fingerprint-selftest": "", role: "status" }, TL_T("hub.fingerprint.title") + "：" + TL_T("hub.fingerprint.unavailable"));
				selftestCard.appendChild(state.selftestFingerprint);
				selftestCard.appendChild(hubCreate("p", { className: "tl-hub-note tl-hub-hint", "data-tl-hub-fingerprint-hint": "" }, TL_T("hub.fingerprint.hint")));
				const selftestRow = hubCreate("div", { className: "tl-hub-row" });
				state.selftestRun = hubCreate("button", { type: "button", "data-tl-hub-selftest": "", className: "tl-hub-btn" }, TL_T("hub.selftest.run"));
				state.selftestRun.addEventListener("click", () => runAsync(runSelftest));
				selftestRow.appendChild(state.selftestRun);
				state.selftestCopy = hubCreate("button", { type: "button", "data-tl-hub-selftest-copy": "", className: "tl-hub-btn" }, TL_T("hub.selftest.copy"));
				state.selftestCopy.addEventListener("click", () => runAsync(copySelftest));
				selftestRow.appendChild(state.selftestCopy);
				state.fingerprintCopy = hubCreate("button", { type: "button", "data-tl-hub-fingerprint-copy": "", className: "tl-hub-btn" }, TL_T("hub.fingerprint.copy"));
				state.fingerprintCopy.addEventListener("click", () => runAsync(copyFingerprint));
				selftestRow.appendChild(state.fingerprintCopy);
				selftestCard.appendChild(selftestRow);
				state.selftestSummary = hubCreate("p", { className: "tl-hub-note tl-hub-hint", "data-tl-hub-selftest-summary": "" }, TL_T("hub.selftest.empty"));
				selftestCard.appendChild(state.selftestSummary);
				state.selftestList = hubCreate("div", { className: "tl-hub-selftest-list", "data-tl-hub-selftest-list": "" }, "");
				selftestCard.appendChild(state.selftestList);
				state.selftestNote = hubCreate("p", { className: "tl-hub-note tl-hub-hint", "data-tl-hub-selftest-note": "", role: "status" }, "");
				selftestCard.appendChild(state.selftestNote);
				body.appendChild(selftestCard);
				const feedbackCard = hubCreate("section", { "data-tl-hub-feedback": "", className: "tl-hub-card tl-hub-feedback" }, [
					hubCreate("h3", { className: "tl-hub-card-title" }, TL_T("hub.feedback.title")),
					hubCreate("p", { className: "tl-hub-note tl-hub-hint" }, TL_T("hub.feedback.hint")),
				]);
				state.feedbackFingerprint = hubCreate("p", { className: "tl-hub-note tl-hub-fingerprint", "data-tl-hub-fingerprint-feedback": "", role: "status" }, TL_T("hub.fingerprint.title") + "：" + TL_T("hub.fingerprint.unavailable"));
				feedbackCard.appendChild(state.feedbackFingerprint);
				state.feedbackText = hubCreate("textarea", {
					"data-tl-hub-feedback-text": "",
					className: "tl-hub-input tl-hub-textarea",
					placeholder: TL_T("hub.feedback.placeholder"),
					"aria-label": TL_T("hub.feedback.placeholder"),
					rows: "3",
				});
				feedbackCard.appendChild(state.feedbackText);
				const feedbackRow = hubCreate("div", { className: "tl-hub-row" });
				state.feedbackCopy = hubCreate("button", { type: "button", "data-tl-hub-feedback-copy": "", className: "tl-hub-btn" }, TL_T("hub.feedback.copy"));
				state.feedbackCopy.addEventListener("click", () => onFeedbackCopy());
				feedbackRow.appendChild(state.feedbackCopy);
				state.feedbackIssue = hubCreate("button", { type: "button", "data-tl-hub-feedback-issue": "", className: "tl-hub-btn" }, TL_T("hub.feedback.issue"));
				state.feedbackIssue.addEventListener("click", () => onFeedbackIssue());
				feedbackRow.appendChild(state.feedbackIssue);
				state.feedbackDownload = hubCreate("button", { type: "button", "data-tl-hub-feedback-download": "", className: "tl-hub-btn" }, TL_T("hub.feedback.download"));
				state.feedbackDownload.addEventListener("click", () => onFeedbackDownload());
				feedbackRow.appendChild(state.feedbackDownload);
				feedbackCard.appendChild(feedbackRow);
				state.feedbackStatus = hubCreate("p", { className: "tl-hub-note tl-hub-hint", "data-tl-hub-feedback-status": "", role: "status" }, "");
				feedbackCard.appendChild(state.feedbackStatus);
				body.appendChild(feedbackCard);
				body.appendChild(hubCreate("p", { className: "tl-hub-hint", "data-tl-hub-settings-hint": "" }, TL_T("hub.settingsHint")));

				panel.appendChild(head);
				panel.appendChild(body);
				root.appendChild(mask);
				root.appendChild(panel);
				state.root = root;
				return state;
			};

			// ---- refresh all / open ------------------------------------------------
			const refreshAll = () => {
				if (openState !== true || ui === null) return;
				hubTry(refreshStatus, null, "refresh-status");
				hubTry(() => refreshLifeConfig(false), null, "refresh-life-config");
				hubTry(refreshWeather, null, "refresh-weather");
				hubTry(refreshGlass, null, "refresh-glass");
				hubTry(refreshAi, null, "refresh-ai");
				hubTry(refreshMind, null, "refresh-mind");
				hubTry(refreshAgent, null, "refresh-agent");
			};
			const open = () => {
				if (disposed === true) return false;
				if (openState === true && rootEl !== null) return true;
				if (typeof document === "undefined" || document === null || document.body === null || document.body === undefined) {
					setLastError("open-no-document", new Error("document is unavailable"));
					return false;
				}
				try {
					triggerEl = document.activeElement !== undefined ? document.activeElement : null;
					ui = buildOverlay();
					rootEl = ui.root;
					document.body.appendChild(rootEl);
					document.body.setAttribute("data-tl-hub-open", "");
					openState = true;
					// R8c (REV-R8 F2): any click/change anywhere in the hub disarms an old
					// destructive confirmation before the card handler runs — except a click
					// on the already-armed confirm button itself (its own handler performs the
					// second step). Capture phase is what makes "arm → click elsewhere → click
					// again" impossible for EVERY card action, not just the ten wired by hand.
					const hubElement = rootEl;
					const onAnyCardAction = (event) => {
						const target = event !== null && event !== undefined ? event.target : null;
						const armedButton =
							target !== null && target !== undefined && typeof target.closest === "function"
								? target.closest("[data-tl-hub-confirm='true']")
								: null;
						if (armedButton !== null) return;
						disarmPendingConfirms();
					};
					hubElement.addEventListener("click", onAnyCardAction, true);
					hubElement.addEventListener("change", onAnyCardAction, true);
					confirmCaptureDisposer = () => {
						hubElement.removeEventListener("click", onAnyCardAction, true);
						hubElement.removeEventListener("change", onAnyCardAction, true);
					};
					const win = hubBrowserWindow();
					// R5: the shared overlay stack owns Esc/Tab for this modal. Its
					// onEscape calls close(), which persists the draft before teardown.
					if (overlayDisposer === null) {
						overlayDisposer = tl5OverlayRegister({
							id: "role-hub",
							modal: true,
							root: () => rootEl,
							onEscape: () => close(),
						});
					}
					refreshStatus();
					refreshFingerprint();
					lifeDraftActive = false;
					refreshLifeConfig(true);
					// Restore unfinished edits AFTER the rhythm card has been filled from
					// the engine, otherwise the refresh would overwrite the draft.
					restoreHubDraft();
					refreshWeather();
					refreshGlass();
					refreshAi();
					// plan A: re-probe the host model capability on every open (44 owns the
					// probe; it degrades to a no-op when the brain build predates it).
					refreshHostLlmStatus();
					refreshMind();
					refreshAgent();
					// The pack editor is loaded after the catalog pass (sequentially, so a
					// slow listMedia can never overwrite it with a stale look's pack).
					runAsync(async () => {
						await refreshMedia();
						await loadEffectivePack();
					});
					runAsync(refreshAgentSessions);
					if (win !== null) timer = win.setInterval(refreshAll, HUB_REFRESH_MS);
					try {
						ui.closeButton.focus();
					} catch (error) {
						setLastError("focus", error);
					}
					return true;
				} catch (error) {
					setLastError("open", error);
					hubTry(() => close(), null, "open-cleanup");
					return false;
				}
			};
			const status = () => ({
				version: HUB_VERSION,
				open: openState === true,
				mounted: rootEl !== null,
				dependencies: {
					document: typeof document !== "undefined" && document !== null && document.body !== null && document.body !== undefined,
					life: hubLifeEngine() !== null,
					pet: hubPetBrain() !== null,
					mind: hubPetMind() !== null,
					agent: hubPetAgent() !== null,
					glass: hubGlassDepthController() !== null,
					weather: (() => {
						const snapshot = hubWeatherSnapshot();
						return snapshot !== null && snapshot.runtime === true;
					})(),
				},
				features: {
					mediaDefault: true,
					glassPreview: true,
					weather: true,
					selftest: true,
					feedback: true,
					mindThinking: true,
				},
				logCount: logEntries.length,
				lastError: lastError,
			});

			const api = {
				version: HUB_VERSION,
				open: () => hubTry(open, false, "api-open"),
				close: () => hubTry(close, undefined, "api-close"),
				status,
			};
			const previousGlobal = hubTry(() => globalThis.tianlightRoleHub, undefined, "api-previous");
			try {
				globalThis.tianlightRoleHub = api;
			} catch (error) {
				setLastError("api-publish", error);
			}
			// v1.3.0: no DSH slots / settings-page registration. The pet menu and the pet
			// context menu call this global directly.

			return () => {
				if (disposed === true) return;
				disposed = true;
				hubTry(() => close(), null, "dispose-close");
				// plan A: release the injected remote scopes (no listener outlives the hub).
				// ctx.inject() returns a cordis Fiber (PromiseLike), not a disposer function;
				// accept either shape and never let teardown throw.
				for (const disposeLlmScope of hubLlmInjectDisposers.splice(0).reverse()) {
					try {
						if (typeof disposeLlmScope === "function") disposeLlmScope();
						else if (disposeLlmScope !== null && disposeLlmScope !== undefined && typeof disposeLlmScope.dispose === "function") disposeLlmScope.dispose();
					} catch (error) {
						note("role-hub:llm-inject-dispose", error);
					}
				}
				hubLlmServiceScope = null;
				hubLlmRemoteScope = null;
				hubLlmProvidersCache = null;
				hubLlmProvidersBusy = false;
				hubLlmProviderSignature = "";
				try {
					if (globalThis.tianlightRoleHub === api) {
						if (previousGlobal === undefined) delete globalThis.tianlightRoleHub;
						else globalThis.tianlightRoleHub = previousGlobal;
					}
				} catch (error) {
					setLastError("dispose-api", error);
				}
				rootEl = null;
				ui = null;
				triggerEl = null;
				agentStatusCache = null;
				agentTargetSignature = "";
				agentSessionsCache = [];
				selftestResults.length = 0;
				weatherBusy = false;
				selftestBusy = false;
				logEntries.length = 0;
			};
		}
		//#endregion
