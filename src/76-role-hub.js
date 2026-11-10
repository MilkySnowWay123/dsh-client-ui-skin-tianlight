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
		 *   - globalThis.tianlightPet    AI 大脑/权限/审计（src/44-pet-brain.js）
		 *   - globalThis.tianlightPetAgent 受控 DSH Agent 通道（src/48-pet-agent.js）
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
				"hub.upload.button": "上传图片 / 视频",
				"hub.upload.hint": "从本机选择图片或视频（≤32 MiB），上传后立即生效。",
				"hub.upload.uploading": "上传中…",
				"hub.upload.done": "已上传并切换：{name}",
				"hub.upload.tooBig": "文件超过 32 MiB（{size} MiB），未上传。",
				"hub.upload.empty": "空文件不能上传。",
				"hub.upload.rejected": "上传被拒绝（{status}）：{reason}",
				"hub.upload.failed": "上传失败：{reason}",
				"hub.upload.noFetch": "当前环境不支持上传。",
				"hub.ai.title": "AI 对话",
				"hub.ai.hint": "桌宠只做陪伴与提醒：不联网、不读写文件、不代你操作。",
				"hub.ai.pause": "暂停 AI",
				"hub.ai.resume": "恢复 AI",
				"hub.ai.pausedNote": "已暂停：桌宠暂不回复。",
				"hub.ai.resumedNote": "已恢复。",
				"hub.ai.ready": "待命",
				"hub.ai.unavailable": "AI 大脑未接入，对话不可用。",
				"hub.ai.adapter": "适配器：{adapter}",
				"hub.ai.adapterNone": "未注册（本地大脑）",
				"hub.ai.llm.grant": "授权 LLM",
				"hub.ai.llm.revoke": "撤销 LLM",
				"hub.ai.llm.confirm": "允许桌宠调用你提供的 LLM 适配器？只发送当前这句话，且有每日、速率与超时上限。",
				"hub.ai.llm.confirmShort": "再次点击确认",
				"hub.ai.llm.granted": "已授权 LLM。",
				"hub.ai.llm.revoked": "已撤销 LLM。",
				"hub.ai.inputPlaceholder": "和桌宠说点什么…",
				"hub.ai.send": "发送",
				"hub.ai.empty": "先说一句话吧。",
				"hub.ai.thinking": "思考中…",
				"hub.ai.failed": "对话失败：{reason}",
				"hub.ai.denied": "桌宠拒绝了：{reason}",
				"hub.ai.you": "你",
				"hub.ai.pet": "桌宠",
				"hub.ai.logEmpty": "还没有对话。",
				"hub.ai.source.local": "本地",
				"hub.ai.source.llm": "LLM 适配器",
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
				"hub.perm.highWarning": "高风险能力本身不内置实现：只有你在控制台/扩展里注册了对应能力适配器后，桌宠才可能在已授权时调用；每次调用都会审计，可随时撤销。驱动 DSH 永远禁止。",
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
				"hub.audit.title": "审计",
				"hub.audit.empty": "暂无记录。",
				"hub.audit.unavailable": "审计未接入。",
				"hub.audit.ok": "放行",
				"hub.audit.deny": "拒绝",
				"hub.cap.agentChat": "Agent 会话",
				"hub.agent.title": "AI Agent（实验）",
				"hub.agent.hint": "实验功能：只把你手动输入的这句话发到你选择的 DSH 会话；不会自动触发、不会代审批、不驱动工具。默认关闭，需显式授权。",
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
				"hub.upload.button": "Upload image / video",
				"hub.upload.hint": "Pick an image or video from this machine (<=32 MiB); it applies right away.",
				"hub.upload.uploading": "Uploading…",
				"hub.upload.done": "Uploaded and applied: {name}",
				"hub.upload.tooBig": "File is over 32 MiB ({size} MiB); not uploaded.",
				"hub.upload.empty": "Empty files cannot be uploaded.",
				"hub.upload.rejected": "Upload rejected ({status}): {reason}",
				"hub.upload.failed": "Upload failed: {reason}",
				"hub.upload.noFetch": "Uploading is not supported here.",
				"hub.ai.title": "AI chat",
				"hub.ai.hint": "The companion only chats and reminds: no network, no files, no actions.",
				"hub.ai.pause": "Pause AI",
				"hub.ai.resume": "Resume AI",
				"hub.ai.pausedNote": "Paused: the companion will not reply.",
				"hub.ai.resumedNote": "Resumed.",
				"hub.ai.ready": "Ready",
				"hub.ai.unavailable": "AI brain is unavailable; chat is off.",
				"hub.ai.adapter": "Adapter: {adapter}",
				"hub.ai.adapterNone": "none (local brain)",
				"hub.ai.llm.grant": "Allow LLM",
				"hub.ai.llm.revoke": "Revoke LLM",
				"hub.ai.llm.confirm": "Allow the companion to call your LLM adapter? Only the current sentence is sent, with daily, rate and timeout caps.",
				"hub.ai.llm.confirmShort": "Click again to confirm",
				"hub.ai.llm.granted": "LLM allowed.",
				"hub.ai.llm.revoked": "LLM revoked.",
				"hub.ai.inputPlaceholder": "Say something to the companion…",
				"hub.ai.send": "Send",
				"hub.ai.empty": "Type something first.",
				"hub.ai.thinking": "Thinking…",
				"hub.ai.failed": "Chat failed: {reason}",
				"hub.ai.denied": "Declined: {reason}",
				"hub.ai.you": "You",
				"hub.ai.pet": "Pet",
				"hub.ai.logEmpty": "No messages yet.",
				"hub.ai.source.local": "local",
				"hub.ai.source.llm": "LLM",
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
				"hub.perm.highWarning": "High-risk capabilities have no built-in implementation: the companion can only use them once you register an adapter in the console or an extension; every call is audited and you can revoke anytime. Driving DSH stays permanently denied.",
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
				"hub.audit.title": "Audit",
				"hub.audit.empty": "No records yet.",
				"hub.audit.unavailable": "Audit unavailable.",
				"hub.audit.ok": "ok",
				"hub.audit.deny": "denied",
				"hub.cap.agentChat": "Agent chat",
				"hub.agent.title": "AI Agent (experimental)",
				"hub.agent.hint": "Experimental: only the sentence you type here is sent to the DSH session you pick; nothing is triggered automatically, nothing approves, no tools are driven. Off by default; explicit consent required.",
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
		const HUB_AI_INPUT_MAX = 280;
		const HUB_LOG_MAX = 50;
		const HUB_AUDIT_LIMIT = 8;
		const HUB_GLASS_LEVELS = ["off", "frosted", "soft", "real"];
		/** Overlay root id (the hub itself; there is no sidebar/settings entry anymore). */
		const HUB_DOM_ID = "tianlight-role-hub";
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

		function hubPetBrain() {
			try {
				return globalThis.tianlightPet !== null && globalThis.tianlightPet !== undefined ? globalThis.tianlightPet : null;
			} catch {
				return null;
			}
		}

		/** The v1.2.0 experimental DSH Agent bridge (src/48-pet-agent.js); optional. */
		function hubPetAgent() {
			try {
				return globalThis.tianlightPetAgent !== null && globalThis.tianlightPetAgent !== undefined ? globalThis.tianlightPetAgent : null;
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

		/** Skin/bundle version for feedback payloads (diagnostic instance first, then BUILD). */
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
			try {
				if (typeof HOST_BUILD === "string" && HOST_BUILD !== "") return HOST_BUILD;
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
		 * reply and `{ok,text,source,denied,reason}` so the hub is not coupled to one
		 * internal return shape.
		 */
		function hubChatResult(result) {
			if (typeof result === "string") {
				return { ok: result !== "", text: result, source: "local", reason: "" };
			}
			if (result === null || typeof result !== "object") {
				return { ok: false, text: "", source: "denied", reason: "internal-error" };
			}
			const text = typeof result.text === "string" ? result.text : typeof result.reply === "string" ? result.reply : typeof result.message === "string" ? result.message : "";
			const denied = result.denied === true || result.ok === false || (text === "" && result.ok !== true);
			const source = denied === true ? "denied" : typeof result.source === "string" && result.source !== "" ? result.source : "local";
			const reason = typeof result.reason === "string" ? result.reason : "";
			return { ok: denied === false, text, source, reason };
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
			void ctx;
			let disposed = false;
			let openState = false;
			let rootEl = null;
			let ui = null;
			let timer = 0;
			let triggerEl = null;
			let mediaCache = null;
			let mediaBusy = false;
			let chatBusy = false;
			let llmPending = false;
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
				llmPending = false;
				agentPermPending = false;
				agentBusy = false;
				chatBusy = false;
				permConfirmPending.clear();
				const win = hubBrowserWindow();
				if (timer !== 0) {
					if (win !== null) win.clearInterval(timer);
					timer = 0;
				}
				if (win !== null) {
					try {
						win.removeEventListener("keydown", onKeyDown);
					} catch (error) {
						setLastError("close-listener", error);
					}
				}
				const previousFocus = triggerEl;
				triggerEl = null;
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
				// Reopening the hub builds a fresh <select>; the cached render signature
				// must not suppress the first fill (v1.2 A73 regression guard).
				agentTargetSignature = "";
				try {
					if (typeof document !== "undefined" && document !== null && document.body !== null && document.body !== undefined) {
						document.body.removeAttribute("data-tl-hub-open");
					}
				} catch (error) {
					setLastError("close-attr", error);
				}
				restoreFocus(previousFocus);
			};
			const onKeyDown = (event) => {
				if (openState !== true) return;
				const key = event !== null && event !== undefined ? event.key : "";
				if (key !== "Escape" && key !== "Esc") return;
				try {
					if (typeof event.preventDefault === "function") event.preventDefault();
				} catch {
					// preventDefault is best effort
				}
				close();
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
				if (force !== true && isLifeConfigEditing()) return;
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
				ui.lifeBudget.value = String(Number.isFinite(config.cap) ? Math.max(0, Math.min(20, Math.round(config.cap))) : 6);
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
				if (Number.isFinite(budget) && budget >= 0 && budget <= 20) patch.budgetDaily = Math.round(budget);
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
				refreshStatus();
				refreshLifeConfig(true);
				refreshAi();
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
			const refreshMedia = async () => {
				if (ui === null || mediaBusy === true) return;
				const life = hubLifeEngine();
				if (life === null || typeof life.listMedia !== "function") {
					if (ui !== null) {
						ui.mediaSelect.disabled = true;
						ui.mediaApply.disabled = true;
						ui.mediaUpload.disabled = true;
						ui.mediaDefault.disabled = true;
					}
					setMediaStatus(TL_T("hub.media.unavailable"));
					return;
				}
				mediaBusy = true;
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
				} catch (error) {
					setLastError("media-render", error);
				} finally {
					mediaBusy = false;
				}
			};
			const applySelectedMedia = async () => {
				const life = hubLifeEngine();
				if (ui === null) return;
				if (life === null || typeof life.setMedia !== "function") {
					setMediaStatus(TL_T("hub.media.unavailable"));
					return;
				}
				const id = typeof ui.mediaSelect.value === "string" ? ui.mediaSelect.value : "default";
				ui.mediaApply.disabled = true;
				try {
					const result = await life.setMedia(id === "default" ? null : id);
					if (result !== null && typeof result === "object" && result.ok === true) {
						const media = result.media !== null && typeof result.media === "object" ? result.media : {};
						setMediaStatus(TL_T("hub.media.applied", { name: String(media.name ?? id) }));
					} else {
						setMediaStatus(TL_T("hub.media.failed", { reason: hubReasonLabel(result?.reason, HUB_MEDIA_REASON_KEYS) }));
					}
				} catch (error) {
					setLastError("media-apply", error);
					setMediaStatus(TL_T("hub.media.failed", { reason: String(error?.message ?? error) }));
				} finally {
					if (ui !== null) ui.mediaApply.disabled = false;
				}
				refreshStatus();
			};
			/** v1.5.0 "restore default look": setMedia(null), then refresh catalog + note. */
			const restoreDefaultMedia = async () => {
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
				const size = Number(file.size);
				if (!Number.isFinite(size) || size <= 0) {
					setUploadStatus(TL_T("hub.upload.empty"));
					return;
				}
				if (size > HUB_UPLOAD_MAX_BYTES) {
					setUploadStatus(TL_T("hub.upload.tooBig", { size: (size / 1024 / 1024).toFixed(1) }));
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
					refreshStatus();
				} catch (error) {
					setLastError("upload", error);
					setUploadStatus(TL_T("hub.upload.failed", { reason: String(error?.message ?? error) }));
				} finally {
					if (ui !== null) ui.mediaUpload.disabled = false;
				}
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
					line.appendChild(hubCreate("span", { className: "tl-hub-perm-state" }, granted ? TL_T("hub.perm.granted") : TL_T("hub.perm.notGranted")));
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
						button.addEventListener("click", () => runAsync(() => requestPermissionGrant(row.id, risk)));
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
			const requestPermissionGrant = async (id, risk) => {
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
				const options = risk === "safe" ? undefined : { consent: "user-explicit" };
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
			const onLlmClick = async () => {
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
				const result = await hubTry(async () => pet.grant?.("llm", { consent: "user-explicit" }), null, "llm-grant");
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
				const adapterId = hubAdapterId(status);
				ui.adapter.textContent = available
					? TL_T("hub.ai.adapter", { adapter: adapterId === null ? TL_T("hub.ai.adapterNone") : adapterId })
					: TL_T("hub.ai.unavailable");
				if (!available) setAiNote(TL_T("hub.ai.unavailable"));
				else if (paused) setAiNote(TL_T("hub.ai.pausedNote"));
				else if (ui.aiNote.textContent === TL_T("hub.ai.pausedNote") || ui.aiNote.textContent === TL_T("hub.ai.unavailable")) setAiNote("");
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
				const statusSessions = agentStatusCache !== null && Array.isArray(agentStatusCache.sessions) ? agentStatusCache.sessions : [];
				renderAgentTargets(statusSessions.length > 0 ? statusSessions : agentSessionsCache, agentStatusCache);
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
			const onAgentPermClick = async () => {
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
					const result = await pet.grant("agentChat", { consent: "user-explicit" });
					if (result !== null && typeof result === "object" && result.ok === false) {
						message = TL_T("hub.agent.perm.denied", {
							reason: hubReasonLabel(result.reason, HUB_AGENT_GRANT_REASON_KEYS, "hub.agent.reason.default"),
						});
					}
				} catch (error) {
					note("role-hub:agent-grant", error);
					message = TL_T("hub.agent.perm.denied", { reason: String(error?.message ?? error) });
				}
				setAgentNote(message);
				refreshAgent();
				refreshAi();
			};
			const onAgentConnect = async () => {
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
			const sendChat = async () => {
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
						appendLog({ role: "pet", at: Date.now(), source: parsed.source, ok: parsed.ok, text: parsed.text, reason: parsed.reason });
						if (parsed.ok === true) setAiNote("");
						else setAiNote(TL_T("hub.ai.denied", { reason: hubReasonLabel(parsed.reason, HUB_AI_REASON_KEYS, "hub.ai.reason.default") }));
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
					max: "20",
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
				body.appendChild(glassCard);

				// c) companion look: catalog select + local upload
				const mediaCard = hubCreate("section", { "data-tl-hub-media-card": "", className: "tl-hub-card" }, [
					hubCreate("h3", { className: "tl-hub-card-title" }, TL_T("hub.media.title")),
					hubCreate("p", { className: "tl-hub-note tl-hub-hint" }, TL_T("hub.upload.hint")),
				]);
				const mediaRow = hubCreate("div", { className: "tl-hub-row" });
				state.mediaSelect = hubCreate("select", { "data-tl-hub-media": "", className: "tl-hub-select", "aria-label": TL_T("hub.media.select") });
				state.mediaApply = hubCreate("button", { type: "button", "data-tl-hub-media-apply": "", className: "tl-hub-btn" }, TL_T("hub.media.apply"));
				state.mediaApply.addEventListener("click", () => runAsync(applySelectedMedia));
				mediaRow.appendChild(state.mediaSelect);
				mediaRow.appendChild(state.mediaApply);
				state.mediaDefault = hubCreate("button", { type: "button", "data-tl-hub-media-default": "", className: "tl-hub-btn" }, TL_T("hub.media.restoreDefault"));
				state.mediaDefault.addEventListener("click", () => runAsync(restoreDefaultMedia));
				mediaRow.appendChild(state.mediaDefault);
				mediaCard.appendChild(mediaRow);
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
				state.llmButton.addEventListener("click", () => runAsync(onLlmClick));
				aiRow.appendChild(state.pauseButton);
				aiRow.appendChild(state.llmButton);
				aiCard.appendChild(aiRow);
				state.adapter = hubCreate("p", { className: "tl-hub-note tl-hub-hint", "data-tl-hub-adapter": "" }, TL_T("hub.ai.unavailable"));
				aiCard.appendChild(state.adapter);
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
					runAsync(sendChat);
				});
				state.chatSend = hubCreate("button", { type: "button", "data-tl-hub-chat-send": "", className: "tl-hub-btn" }, TL_T("hub.ai.send"));
				state.chatSend.addEventListener("click", () => runAsync(sendChat));
				chatRow.appendChild(state.chatInput);
				chatRow.appendChild(state.chatSend);
				aiCard.appendChild(chatRow);
				state.logBox = hubCreate("div", { "data-tl-hub-log": "", className: "tl-hub-log", role: "log", "aria-live": "polite" });
				aiCard.appendChild(state.logBox);
				body.appendChild(aiCard);

				// d2) experimental DSH Agent bridge (v1.2.0): permissioned hand-off of the
				// user's typed sentence to a user-selected DSH session. Never auto-triggers.
				const agentCard = hubCreate("section", { "data-tl-hub-agent": "", className: "tl-hub-card tl-hub-agent" }, [
					hubCreate("h3", { className: "tl-hub-card-title" }, TL_T("hub.agent.title")),
				]);
				state.agentStatus = hubCreate("p", { className: "tl-hub-hint", "data-tl-hub-agent-status": "", role: "status" }, TL_T("hub.agent.status.unavailable"));
				agentCard.appendChild(state.agentStatus);
				const agentPermRow = hubCreate("div", { className: "tl-hub-row" });
				state.agentPerm = hubCreate("button", { type: "button", "data-tl-hub-agent-perm": "", className: "tl-hub-btn", "data-tl-hub-agent-granted": "false" }, TL_T("hub.agent.perm.grant"));
				state.agentPerm.addEventListener("click", () => runAsync(onAgentPermClick));
				agentPermRow.appendChild(state.agentPerm);
				agentCard.appendChild(agentPermRow);
				const agentTargetRow = hubCreate("div", { className: "tl-hub-row" });
				state.agentTarget = hubCreate("select", { "data-tl-hub-agent-target": "", className: "tl-hub-select", "aria-label": TL_T("hub.agent.target.label") });
				state.agentConnect = hubCreate("button", { type: "button", "data-tl-hub-agent-connect": "", className: "tl-hub-btn" }, TL_T("hub.agent.connect"));
				state.agentConnect.addEventListener("click", () => runAsync(onAgentConnect));
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
				const selftestRow = hubCreate("div", { className: "tl-hub-row" });
				state.selftestRun = hubCreate("button", { type: "button", "data-tl-hub-selftest": "", className: "tl-hub-btn" }, TL_T("hub.selftest.run"));
				state.selftestRun.addEventListener("click", () => runAsync(runSelftest));
				selftestRow.appendChild(state.selftestRun);
				state.selftestCopy = hubCreate("button", { type: "button", "data-tl-hub-selftest-copy": "", className: "tl-hub-btn" }, TL_T("hub.selftest.copy"));
				state.selftestCopy.addEventListener("click", () => runAsync(copySelftest));
				selftestRow.appendChild(state.selftestCopy);
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
					const win = hubBrowserWindow();
					if (win !== null) {
						try {
							win.addEventListener("keydown", onKeyDown);
						} catch (error) {
							setLastError("open-listener", error);
						}
					}
					refreshStatus();
					refreshLifeConfig(true);
					refreshWeather();
					refreshGlass();
					refreshAi();
					refreshAgent();
					runAsync(refreshMedia);
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
