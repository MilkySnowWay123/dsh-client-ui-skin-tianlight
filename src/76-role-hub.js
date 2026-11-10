		//#region role hub
		/**
		 * v1.1.0「角色中枢」：把 v1.0 备好的能力显现出来的唯一控制面。
		 *
		 * 入口：
		 *   - 侧栏 footer 的「角色」按钮（slots `sidebar.footer.action`，React 小组件；
		 *     窄栏只显示 ◐ 图标，宽栏显示「◐ 角色」）
		 *   - globalThis.tianlightRoleHub = { version:1, open(), close(), status() }
		 *   - 事件 `tianlight:open-role-hub`（供皮肤面板/控制台触发）
		 *
		 * 浮层是**普通 DOM**（打开时创建、关闭时整体移除）：生活状态、专注/静音、
		 * 液态玻璃、可替换形象（列表 + 本机上传）、AI 对话与权限/暂停、审计。所有
		 * 能力都通过既有运行时 API 调用，这里不持有第二个事实源：
		 *   - globalThis.tianlightLife   生活节奏/专注/静音/形象（src/42-life.js）
		 *   - globalThis.tianlightPet    AI 大脑/权限/审计（src/44-pet-brain.js）
		 *   - glassDepthController       液态玻璃三档（src/57-glass.js）
		 *   - POST ASSET_BASE/_upload    本机图片/视频上传（宿主已有路由，≤32 MiB）
		 *
		 * 任依赖缺失 → 对应卡片显示「不可用」，其它卡片照常；slots/React 缺失只
		 * 影响侧栏按钮，控制台/全局 API 仍然可用。不写 CSS：Lead 的样式表按
		 * data-tl-hub-* 属性与 .tl-hub-* 类名统一落样式。
		 */
		registerTl5Strings({
			zh: {
				"hub.sidebar.label": "角色",
				"hub.open": "打开角色中枢",
				"hub.title": "角色中枢",
				"hub.close": "关闭",
				"hub.settingsHint": "完整设置仍在「设置 → 角色 / 生活」。",
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
				"hub.media.title": "桌宠形象",
				"hub.media.select": "选择形象",
				"hub.media.apply": "应用形象",
				"hub.media.default": "默认形象（cat.png）",
				"hub.media.applied": "形象已切换：{name}",
				"hub.media.empty": "本地壁纸库暂无可用素材，可先上传。",
				"hub.media.rejected": "已忽略超过 32 MiB 的素材：{names}",
				"hub.media.unavailable": "生活引擎未就绪，暂时不能换形象。",
				"hub.media.failed": "切换失败：{reason}",
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
				"hub.perm.hint": "只有白名单内的能力可用；7 项高风险能力永久禁止，不可授权。",
				"hub.perm.risk.safe": "安全",
				"hub.perm.risk.medium": "敏感",
				"hub.perm.risk.forbidden": "永久禁止",
				"hub.perm.granted": "已授权",
				"hub.perm.notGranted": "未授权",
				"hub.perm.grant": "授权",
				"hub.perm.revoke": "撤销",
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
				"hub.audit.title": "审计",
				"hub.audit.empty": "暂无记录。",
				"hub.audit.unavailable": "审计未接入。",
				"hub.audit.ok": "放行",
				"hub.audit.deny": "拒绝",
			},
			en: {
				"hub.sidebar.label": "Role",
				"hub.open": "Open the character hub",
				"hub.title": "Character hub",
				"hub.close": "Close",
				"hub.settingsHint": "Full settings live under Settings → Role / Life.",
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
				"hub.media.title": "Companion look",
				"hub.media.select": "Choose look",
				"hub.media.apply": "Apply look",
				"hub.media.default": "Default (cat.png)",
				"hub.media.applied": "Look switched: {name}",
				"hub.media.empty": "No usable media yet; upload one first.",
				"hub.media.rejected": "Skipped items over 32 MiB: {names}",
				"hub.media.unavailable": "Life engine unavailable; the look cannot change now.",
				"hub.media.failed": "Could not switch: {reason}",
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
				"hub.perm.hint": "Only allowlisted capabilities work; seven high-risk ones are permanently denied.",
				"hub.perm.risk.safe": "Safe",
				"hub.perm.risk.medium": "Sensitive",
				"hub.perm.risk.forbidden": "Permanently denied",
				"hub.perm.granted": "Allowed",
				"hub.perm.notGranted": "Not allowed",
				"hub.perm.grant": "Allow",
				"hub.perm.revoke": "Revoke",
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
				"hub.audit.title": "Audit",
				"hub.audit.empty": "No records yet.",
				"hub.audit.unavailable": "Audit unavailable.",
				"hub.audit.ok": "ok",
				"hub.audit.deny": "denied",
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
		const HUB_SLOT_NAME = "sidebar.footer.action";
		const HUB_SLOT_ID = "tianlight-role-hub";
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
		/** Set by installRoleHub; the React sidebar button and console API call it. */
		let roleHubOpenImpl = null;

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

		/** Sidebar footer button: label + ◐ when wide, icon only in the 56px rail. */
		function RoleHubButton(props) {
			const wide = props !== null && props !== undefined && props.wide === true;
			const { t } = useTl5I18n();
			const label = t("hub.sidebar.label");
			return React.createElement(
				"button",
				{
					type: "button",
					className: "tl-hub-nav-btn",
					"data-tl-hub-nav": "",
					"data-tl-hub-nav-wide": wide === true ? "true" : "false",
					title: label,
					"aria-label": label,
					onClick: () => {
						if (roleHubOpenImpl !== null) {
							roleHubOpenImpl();
							return;
						}
						try {
							if (typeof globalThis.dispatchEvent === "function" && typeof globalThis.CustomEvent === "function") {
								globalThis.dispatchEvent(new globalThis.CustomEvent("tianlight:open-role-hub"));
							}
						} catch {
							// no overlay path available; the global API still works
						}
					},
				},
				React.createElement("span", { className: "tl-hub-nav-icon", "aria-hidden": "true" }, "◐"),
				wide === true ? React.createElement("span", { className: "tl-hub-nav-label" }, label) : null,
			);
		}

		/**
		 * Install the sidebar entry + the full-screen role hub. Returns a disposer that
		 * unregisters the slot, closes (and fully removes) an open overlay and restores
		 * the previous `globalThis.tianlightRoleHub`.
		 */
		function installRoleHub(ctx) {
			let disposed = false;
			let openState = false;
			let rootEl = null;
			let ui = null;
			let timer = 0;
			let triggerEl = null;
			let slotService = null;
			let disposeSlots = () => {};
			let mediaCache = null;
			let mediaBusy = false;
			let chatBusy = false;
			let llmPending = false;
			let lastError = "";
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
				chatBusy = false;
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
				if (controller === null) {
					ui.glassEffective.textContent = TL_T("hub.glass.unavailable");
					return;
				}
				ui.glassEffective.textContent =
					depth === effective
						? TL_T("hub.glass.effective", { depth: hubGlassLabel(depth) })
						: TL_T("hub.glass.lowered", { depth: hubGlassLabel(depth), effective: hubGlassLabel(effective) });
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
					if (entry.role === "user") {
						role = "user";
						text = TL_T("hub.ai.you") + ": " + String(entry.text ?? "");
					} else if (entry.ok === true) {
						const sourceKey = entry.source === "llm" ? "hub.ai.source.llm" : "hub.ai.source.local";
						text = TL_T("hub.ai.pet") + " · " + TL_T(sourceKey) + ": " + String(entry.text ?? "");
					} else {
						role = "denied";
						text = TL_T("hub.ai.pet") + " · " + TL_T("hub.ai.source.denied") + ": " + hubReasonLabel(entry.reason, HUB_AI_REASON_KEYS, "hub.ai.reason.default");
					}
					box.appendChild(hubCreate("p", { className: "tl-hub-log-row", "data-tl-hub-log-row": role, "data-role": role }, text));
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
			const refreshPermissions = (rows) => {
				if (ui === null) return;
				const box = ui.permRows;
				box.textContent = "";
				if (!Array.isArray(rows) || rows.length === 0) {
					box.appendChild(hubCreate("p", { className: "tl-hub-note tl-hub-hint", "data-tl-hub-perm-empty": "" }, TL_T("hub.perm.unavailable")));
					return;
				}
				const seen = new Set();
				for (const row of rows) {
					if (row === null || typeof row !== "object" || typeof row.id !== "string" || seen.has(row.id)) continue;
					seen.add(row.id);
					const risk = row.risk === "forbidden" ? "forbidden" : row.risk === "medium" ? "medium" : "safe";
					const line = hubCreate("div", { className: "tl-hub-perm-row", "data-tl-hub-perm-row": row.id, "data-risk": risk });
					line.appendChild(hubCreate("span", { className: "tl-hub-perm-name" }, TL_T(HUB_CAP_KEYS[row.id] ?? "hub.perm.unknown")));
					line.appendChild(hubCreate("span", { className: "tl-hub-perm-risk", "data-risk": risk }, TL_T(HUB_RISK_KEYS[risk])));
					if (risk === "forbidden") {
						line.appendChild(hubCreate("span", { className: "tl-hub-perm-state", "data-tl-hub-perm-state": "forbidden" }, TL_T("hub.perm.risk.forbidden")));
					} else {
						line.appendChild(hubCreate("span", { className: "tl-hub-perm-state" }, row.granted === true ? TL_T("hub.perm.granted") : TL_T("hub.perm.notGranted")));
						const granted = row.granted === true;
						const button = hubCreate(
							"button",
							{
								type: "button",
								className: "tl-hub-btn tl-hub-perm-btn",
								"data-tl-hub-perm-toggle": row.id,
								disabled: row.grantable === false,
							},
							granted ? TL_T("hub.perm.revoke") : TL_T("hub.perm.grant"),
						);
						if (row.grantable !== false) button.addEventListener("click", () => runAsync(() => togglePermission(row.id, granted)));
						line.appendChild(button);
					}
					box.appendChild(line);
				}
			};
			const togglePermission = async (id, granted) => {
				const pet = hubPetBrain();
				if (pet === null) return;
				if (granted === true) {
					await hubTry(async () => pet.revoke?.(id), null, "perm-revoke");
					refreshAi();
					return;
				}
				if (id === "llm" && confirmLlmGrant() !== true) {
					refreshAi();
					return;
				}
				const options = id === "llm" ? { consent: "user-explicit" } : undefined;
				await hubTry(async () => pet.grant?.(id, options), null, "perm-grant");
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
			const sendChat = async () => {
				const pet = hubPetBrain();
				if (ui === null || pet === null || typeof pet.chat !== "function" || chatBusy === true) return;
				const raw = typeof ui.chatInput.value === "string" ? ui.chatInput.value : "";
				const text = raw.trim().slice(0, HUB_AI_INPUT_MAX);
				if (text === "") {
					setAiNote(TL_T("hub.ai.empty"));
					return;
				}
				chatBusy = true;
				ui.chatSend.disabled = true;
				setAiNote(TL_T("hub.ai.thinking"));
				appendLog({ role: "user", at: Date.now(), text });
				try {
					const result = await pet.chat(text);
					const parsed = hubChatResult(result);
					appendLog({ role: "pet", at: Date.now(), source: parsed.source, ok: parsed.ok, text: parsed.text, reason: parsed.reason });
					if (parsed.ok === true) setAiNote("");
					else setAiNote(TL_T("hub.ai.denied", { reason: hubReasonLabel(parsed.reason, HUB_AI_REASON_KEYS, "hub.ai.reason.default") }));
					ui.chatInput.value = "";
				} catch (error) {
					setLastError("chat", error);
					appendLog({ role: "pet", at: Date.now(), source: "error", ok: false, reason: String(error?.message ?? error) });
					setAiNote(TL_T("hub.ai.failed", { reason: String(error?.message ?? error) }));
				} finally {
					chatBusy = false;
					if (ui !== null) ui.chatSend.disabled = ui.chatInput.disabled;
					renderLog();
					refreshAi();
				}
			};

			// ---- overlay build ------------------------------------------------------
			const buildOverlay = () => {
				const state = { glassButtons: {} };
				const root = hubCreate("div", {
					"data-tl-hub": "",
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
				state.glassEffective = hubCreate("p", { className: "tl-hub-note tl-hub-hint", "data-tl-hub-glass-effective": "" }, "");
				glassCard.appendChild(state.glassEffective);
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

				// e) permission overview (safe / medium / 7 permanently denied)
				const permCard = hubCreate("section", { "data-tl-hub-perms": "", className: "tl-hub-card" }, [
					hubCreate("h3", { className: "tl-hub-card-title" }, TL_T("hub.perm.title")),
					hubCreate("p", { className: "tl-hub-note tl-hub-hint" }, TL_T("hub.perm.hint")),
				]);
				state.permRows = hubCreate("div", { className: "tl-hub-perm", "data-tl-hub-perm-list": "" });
				permCard.appendChild(state.permRows);
				body.appendChild(permCard);

				// f) audit + settings hint
				const auditCard = hubCreate("section", { "data-tl-hub-audit-card": "", className: "tl-hub-card" }, [
					hubCreate("h3", { className: "tl-hub-card-title" }, TL_T("hub.audit.title")),
				]);
				state.auditBox = hubCreate("div", { "data-tl-hub-audit": "", className: "tl-hub-audit" });
				auditCard.appendChild(state.auditBox);
				body.appendChild(auditCard);
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
				hubTry(refreshGlass, null, "refresh-glass");
				hubTry(refreshAi, null, "refresh-ai");
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
					refreshGlass();
					refreshAi();
					runAsync(refreshMedia);
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
					glass: hubGlassDepthController() !== null,
					slots: slotService !== null,
					react: React !== null,
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
			const openBridge = () => api.open();
			roleHubOpenImpl = openBridge;

			// ---- sidebar slot registration -----------------------------------------
			if (React !== null && typeof ctx !== "undefined" && ctx !== null && typeof ctx.inject === "function") {
				try {
					const injected = ctx.inject(["slots"], (scoped) => {
						if (disposed === true) return () => {};
						const scopedSlots = scoped !== null && scoped !== undefined && typeof scoped.get === "function" ? scoped.get("slots") : undefined;
						const slots = scopedSlots !== undefined && scopedSlots !== null ? scopedSlots : scoped !== null && scoped !== undefined ? scoped.slots : undefined;
						if (slots === undefined || slots === null || typeof slots.inject !== "function" || typeof slots.register !== "function") {
							setLastError("no-slots", new Error("slots service is unavailable"));
							return () => {};
						}
						slotService = slots;
						let slotHandle = null;
						let slotDispose = () => {};
						try {
							const injectedSlot = slots.inject(HUB_SLOT_NAME, () => {
								try {
									slotHandle = slots.register(
										{ name: HUB_SLOT_NAME, id: HUB_SLOT_ID, order: 130, label: () => TL_T("hub.sidebar.label") },
										RoleHubButton,
									);
								} catch (error) {
									slotHandle = null;
									setLastError("slot-register", error);
								}
								return () => {
									if (slotHandle === null) return;
									const handle = slotHandle;
									slotHandle = null;
									try {
										handle();
									} catch (error) {
										setLastError("slot-release", error);
									}
								};
							});
							if (typeof injectedSlot === "function") slotDispose = injectedSlot;
						} catch (error) {
							setLastError("slot-inject", error);
						}
						return () => {
							try {
								slotDispose();
							} catch (error) {
								setLastError("slot-dispose", error);
							}
							slotService = null;
						};
					});
					if (typeof injected === "function") disposeSlots = injected;
				} catch (error) {
					setLastError("slots-inject", error);
				}
			} else if (React === null) {
				note("role-hub:no-react", {});
			} else {
				note("role-hub:no-ctx", {});
			}

			return () => {
				if (disposed === true) return;
				disposed = true;
				hubTry(() => close(), null, "dispose-close");
				hubTry(() => disposeSlots(), null, "dispose-slots");
				if (roleHubOpenImpl === openBridge) roleHubOpenImpl = null;
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
				logEntries.length = 0;
			};
		}
		//#endregion
