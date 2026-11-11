		//#region schema
		/**
		 * v0.5.0 设置分层（由 platform-core 工作流实现；v0.5.2 增加数据安全）：
		 *
		 *   1. schema 迁移：把 v0.4.0 及更早的 `tianlight.*` 存储键归一化到
		 *      `TL5_SCHEMA_VERSION`，迁移前的原始值先备份到 `tianlight.backup.v5`。
		 *   2. 宿主设置：GET/PUT `/skin-tianlight/_settings`。宿主文件是跨浏览器
		 *      的权威副本；本地 localStorage 仍是同步读缓存，读写通过镜像层同步
		 *      （300ms 去抖，只 PUT 变化的键，宿主按 key 合并）。
		 *   3. 多窗口一致：BroadcastChannel("tianlight.settings") + `storage` 事件，
		 *      最后写入者为准；外部写入不再回声，也不再次镜像。
		 *   4. 运行时对齐：迁移/宿主导入之后，把在片段加载期读过 localStorage 的
		 *      模块开关与语言同步到其控制器（其余功能由各自 install 期读取）。
		 *   5. v0.5.2 数据安全（用户反馈“重启后设置丢失”）：
		 *      - 采纳宿主快照时【绝不删除宿主里没有的本地键】（宿主文件可能是子集/
		 *        不完整），本地独有键保留后立即回推宿主，使宿主重新变成超集；
		 *        只有显式 null 墓碑才删除本地键（跨浏览器删除语义保留）；
		 *      - 采纳前把导入前的本地设置备份到 `tianlight.backup.host`（本地专用，
		 *        mirror 因 tianlight.backup. 前缀天然排除）；宿主快照是子集时若确实
		 *        改过本地值，面板“恢复宿主导入前备份”可一键恢复；
		 *      - bootstrap 的 push 失败按需重试一次（1s，仅网络/5xx/超时）；
		 *      - tl5Diag("settings") 记录 {localKeys, remoteKeys, pushedKeys} 计数，
		 *        供 verifier 断言“首启全量推送 / 采纳后回推”。
		 *   6. v0.6.1 revision 冲突检测 + 数据键隔离：
		 *      - PUT 带 expectedRevision（本窗口最后看到的宿主 revision）。宿主不一致
		 *        返回 409 + 当前权威完整 settings；客户端先合并、再重推自己的差异，
		 *        不静默覆盖另一个窗口刚写的键。旧宿主只返 revision、旧客户端不带
		 *        expectedRevision 时都保持 last-write-wins 兼容。
		 *      - 宿主 PUT 200 现在返回合并后的完整 settings，客户端以响应为准落地
		 *        本地镜像（不再只把 revision 推高）。
		 *      - 聊天记录/自主念头/生活记忆/Agent 审计等“数据”键（TL5_DATA_KEYS）不参与
		 *        宿主同步、不进导出包、导入包也不会写回宿主；它们只留在 localStorage。
		 *
		 * 生命周期：
		 *   bootstrapSettingsRuntime(body)  apply() 里 await：先迁移、再接管宿主配置。
		 *                                   任何失败都退化为本地模式，绝不抛穿 apply()。
		 *   installSettingsRuntime(body)    镜像层安装器（always-on effect），返回幂等
		 *                                   disposer：还原被补丁的 localStorage 方法、
		 *                                   关闭 BroadcastChannel、移除监听与定时器。
		 *
		 * 契约（其他片段依赖）：
		 *   settingsStore.status()      -> { host, revision, pending, lastError, conflicts,
		 *                                   migrated:[key], schema:{from,to},
		 *                                   backup:boolean, recovered:number }
		 *   settingsStore.bootstrap()   -> Promise<void>（失败不抛，退化为本地模式）
		 *   settingsStore.forceSync()   -> Promise<boolean>
		 *   settingsStore.recoverBackup() -> Promise<boolean>（写回 tianlight.backup.host）
		 *   settingsStore.subscribe(fn) -> unsubscribe
		 *   schemaRuntime.report()      -> { from, to, migrated:[key], failed:[key] }
		 *   schemaRuntime.migrate()     -> 同 report（一次会话只跑一次，幂等）
		 *
		 * “设置”的定义：所有 `tianlight.` / `dsh-tianlight:` 前缀的字符串键，但本机
		 * 元数据（schema / backup / sync.revision）与数据键（TL5_DATA_KEYS）除外 ——
		 * 见 tl5SyncableKey()。
		 */
		const TL5_SCHEMA_KEY = "tianlight.schema";
		const TL5_SCHEMA_VERSION = 5;
		const TL5_SETTINGS_ROUTE = ASSET_BASE + "/_settings";
		const TL5_SYNC_REVISION_KEY = "tianlight.sync.revision";
		const TL5_SETTINGS_PREFIXES = ["tianlight.", "dsh-tianlight:"];
		/** 迁移前的原始值备份。永不参与宿主同步（否则备份会被复制到每一台机器）。 */
		const TL5_BACKUP_KEY = "tianlight.backup.v5";
		const TL5_BACKUP_MAX_BYTES = 1024 * 1024;
		/**
		 * 宿主导入（adoption）前的本地设置备份。v0.5.2 数据安全：宿主快照可能是
		 * 子集/不完整，落地前先留一份本地可同步键，供面板“恢复宿主导入前备份”。
		 * 前缀 `tianlight.backup.` 已被 tl5SyncableKey() 排除，所以永不参与镜像。
		 */
		const TL5_HOST_BACKUP_KEY = "tianlight.backup.host";
		const TL5_HOST_BACKUP_MAX_BYTES = 256 * 1024;
		/** bootstrap push 失败后的唯一一次重试延迟（仅网络/5xx/超时重试）。 */
		const TL5_PUSH_RETRY_DELAY_MS = 1000;
		/** 只属于本机的元数据：不同步；schema/revision 由本文件单独维护。 */
		const TL5_META_EXACT = [TL5_SCHEMA_KEY, TL5_BACKUP_KEY, TL5_SYNC_REVISION_KEY];
		const TL5_META_PREFIXES = ["tianlight.backup.", "tianlight.sync."];
		/**
		 * 本机数据键（v0.6.1）：聊天记录、自主念头、生活记忆与 Agent 审计日志属于
		 * “数据”，不是设置。它们可能很大（聊天记录本身就很容易超过宿主 256KB 上限，
		 * 一旦超限整批 PUT 都会被 413 拒绝），而且只应留在写出它的浏览器里：不参与
		 * 宿主镜像、不进入导出包、导入包也不会把它们写回宿主。键名保持不变（改名
		 * 会让已有数据失联），宿主 lib/settings-store.js 的 DATA_SETTING_KEYS 与这里
		 * 一一对应（tools/audit.mjs 断言两份清单一致）。
		 */
		const TL5_DATA_KEYS = [
			"tianlight.petChats.v1",
			"tianlight.petMind.v1",
			"tianlight.life.v1",
			"tianlight.pet.agent.v1",
			"tianlight.cache.known",
		];
		function tl5DataKey(key) {
			return TL5_DATA_KEYS.indexOf(key) >= 0;
		}
		/** 导入（bootstrap 的 GET）超时按契约 1200ms；PUT 允许更大一点。 */
		const TL5_HOST_TIMEOUT_MS = 1200;
		const TL5_HOST_WRITE_TIMEOUT_MS = 4000;
		const TL5_MIRROR_DEBOUNCE_MS = 300;
		const TL5_MIRROR_RETRY_MS = 3000;
		const TL5_MIRROR_RETRY_MAX = 2;
		/** 写冲突（409）后的重推次数上限：合并宿主快照后重算差异再推一次。 */
		const TL5_CONFLICT_RETRY_MAX = 1;
		/** 镜像批次遇到 409 的最大重试次数；超过后保留本地更新等下一次同步。 */
		const TL5_MIRROR_CONFLICT_MAX = 2;
		const TL5_BC_NAME = "tianlight.settings";
		/** 语言模式；与 13-i18n.js 的 LANGUAGE_MODES 同值（那里是 let/const，不能前置读取）。 */
		const TL5_LANGUAGE_MODES = ["auto", "zh", "en"];

		/* ================= 文案（i18n） =================
		 * 本片段的顶层在 13-i18n.js 之前执行，所以这里只存数据；注册动作放在
		 * bootstrapSettingsRuntime() / installSettingsRuntime() 里（那时 13 已初始化）。
		 * 只补 13-i18n.js 基础字典里没有的 key，已有 key 直接复用。 */
		const TL5_SCHEMA_STRINGS = {
			zh: {
				"settings.schemaVersion": "schema 版本",
				"settings.schemaFromTo": "v{from} → v{to}",
				"settings.available": "可用",
				"settings.unavailable": "不可用",
				"settings.resident": "常驻",
				"settings.fps": "帧率",
				"settings.jitter": "抖动",
				"settings.tier": "渲染档位",
				"settings.lowPower": "省电",
				"settings.cache": "静态帧缓存",
				"settings.cacheRate": "缓存命中率",
				"settings.effectsLayer": "特效层",
				"settings.updated": "更新于",
				"settings.lastError": "最近错误",
				"settings.activeModules": "活动模块",
				"settings.capabilityHost": "宿主设置",
				"settings.capabilityRuntime": "运行时诊断",
				"settings.none": "—",
				"settings.syncing": "同步中…",
				"settings.syncHint": "宿主不可用时配置保存在浏览器本地；宿主恢复后点“立即同步”合并。",
				"settings.diagHint": "控制台可读 __dshTianlightInstance.modules() / settings()。",
				"settings.backup": "导入前备份",
				"settings.recoverBackup": "恢复宿主导入前备份",
				"settings.recovered": "已恢复 {n} 项",
				"settings.recoverEmpty": "没有可恢复的备份",
			},
			en: {
				"settings.schemaVersion": "Schema version",
				"settings.schemaFromTo": "v{from} → v{to}",
				"settings.available": "Available",
				"settings.unavailable": "Unavailable",
				"settings.resident": "Always on",
				"settings.fps": "FPS",
				"settings.jitter": "Jitter",
				"settings.tier": "Render tier",
				"settings.lowPower": "Low power",
				"settings.cache": "Frame cache",
				"settings.cacheRate": "Cache hit rate",
				"settings.effectsLayer": "Effects layer",
				"settings.updated": "Updated",
				"settings.lastError": "Last error",
				"settings.activeModules": "Active modules",
				"settings.capabilityHost": "Host settings",
				"settings.capabilityRuntime": "Runtime diagnostics",
				"settings.none": "—",
				"settings.syncing": "Syncing…",
				"settings.syncHint": "Without a host, settings stay in this browser; press Sync now once the host returns.",
				"settings.diagHint": "Console: __dshTianlightInstance.modules() / settings().",
				"settings.backup": "Pre-import backup",
				"settings.recoverBackup": "Restore pre-import backup",
				"settings.recovered": "Restored {n} item(s)",
				"settings.recoverEmpty": "No backup to restore",
			},
		};

		function registerSchemaStrings() {
			// registerTl5Strings 是 13-i18n.js 的函数声明（会提升），但它引用的
			// TL5_STRINGS 是 const；正常调用点都在 apply() 之后，不存在 TDZ 问题。
			try {
				registerTl5Strings(TL5_SCHEMA_STRINGS);
			} catch (error) {
				note("settings:strings", error);
			}
		}

		/* ================= 通用小工具（全部带 tl5 前缀，避免与别的片段重名） ================= */

		/** localStorage 可能被浏览器策略禁用（SecurityError）。每次访问都兜底。 */
		function tl5Storage() {
			try {
				return globalThis.localStorage ?? null;
			} catch {
				return null;
			}
		}

		/** 枚举 localStorage 的键；枚举失败（权限/配额异常）时返回空数组。 */
		function tl5StorageKeys(storage) {
			const keys = [];
			try {
				if (typeof storage.key === "function" && typeof storage.length === "number") {
					for (let index = 0; index < storage.length; index += 1) {
						const key = storage.key(index);
						if (typeof key === "string") keys.push(key);
					}
					return keys;
				}
			} catch {
				return [];
			}
			try {
				return Object.keys(storage).filter((key) => typeof key === "string");
			} catch {
				return [];
			}
		}

		function tl5IsPlainObject(value) {
			return value !== null && typeof value === "object" && Array.isArray(value) === false;
		}

		function tl5Json(value) {
			return JSON.stringify(value);
		}

		function tl5Clamp(number, min, max) {
			return Math.min(max, Math.max(min, number));
		}

		/**
		 * 一个键是否属于“设置”。
		 * 本机元数据（schema / backup / revision）必须排除：它们要么由迁移维护，
		 * 要么是每台机器自己的水位线，不能被别的浏览器覆盖。
		 */
		function tl5SyncableKey(key) {
			if (typeof key !== "string" || key === "") return false;
			if (TL5_META_EXACT.indexOf(key) >= 0) return false;
			for (const prefix of TL5_META_PREFIXES) {
				if (key.startsWith(prefix)) return false;
			}
			// v0.6.1: per-browser data (chat / thoughts / life memory / audit) never
			// travels through the host mirror or a bundle; it stays in localStorage.
			if (tl5DataKey(key)) return false;
			for (const prefix of TL5_SETTINGS_PREFIXES) {
				// 前缀本身不是键（宿主 lib/settings-store.js 也把 "tianlight." 判为 400）。
				if (key.length > prefix.length && key.startsWith(prefix)) return true;
			}
			return false;
		}

		/* ================= E2：schema 迁移框架 =================
		 *
		 * 每条迁移只做“旧形状 → 当前形状”的结构搬运，并保留未知字段：
		 *   - 已经是当前形状的值原样不动（返回 null，不产生写入）；
		 *   - 损坏的 JSON 记入 failed，原件不动（读取方本来就会退化到默认值）；
		 *   - 迁移前把被改写的原始字符串一次性备份进 `tianlight.backup.v5`，容量上限 1MB；
		 *   - 无论成败最后都写入 `tianlight.schema = "5"`，保证跨刷新只迁移一次。
		 *
		 * 迁移表是唯一的“旧键清单”。新增 v5 键（effects/context/legibility/transition）
		 * 在 v0.4.0 不存在，因此只做 JSON 对象校验，不做改写。
		 */

		const TL5_FILTER_DEFAULTS = { on: false, brightness: 100, contrast: 100, saturate: 100 };
		const TL5_ROTATION_INTERVALS = [30, 60, 120, 300, 600];
		const TL5_RAIL_DEFAULTS = { fit: "cover", fx: 50, fy: 50, dim: 16, blur: 0, url: "", kind: "video" };
		const TL5_ZONE_LEGACY_FIELDS = ["zoom", "ratio", "cx", "cy", "fx", "fy", "fit", "dim", "blur"];
		const TL5_FONT_DEFAULTS = { size: 14, ui: "system", code: "system", weight: "normal", lead: "normal", track: "normal" };

		/** 旧版壁纸可能只有 url；按扩展名猜一个 kind（读侧仍会把未知 kind 兜成 video）。 */
		function tl5GuessMediaKind(url) {
			// S4: shared client media-kind detection; `.bmp` stays image here because old
			// settings may reference it even though the upload sink no longer accepts it.
			const kind = tl5MediaKindFromName(url);
			if (kind === "image") return "image";
			const path = String(url).split("?")[0].split("#")[0].toLowerCase();
			if (/\.bmp$/.test(path)) return "image";
			return "video";
		}

		/** `tianlight.wallpaper`：纯 URL 字符串 / 缺 kind 的对象 → {kind,url,still?}。 */
		function repairWallpaperSetting(raw) {
			const value = JSON.parse(raw);
			if (typeof value === "string" && value !== "") {
				return tl5Json({ kind: tl5GuessMediaKind(value), url: value });
			}
			if (tl5IsPlainObject(value) === false) return null;
			if (typeof value.url !== "string" || value.url === "") return null;
			if (typeof value.kind === "string" && value.kind !== "") return null;
			return tl5Json({ ...value, kind: tl5GuessMediaKind(value.url) });
		}

		/** `tianlight.playback`：filter 旧版是布尔或平铺字段；speed 旧版可能是字符串。 */
		function repairPlaybackSetting(raw) {
			const value = JSON.parse(raw);
			if (tl5IsPlainObject(value) === false) return null;
			const next = { ...value };
			let changed = false;
			if (typeof next.filter === "boolean") {
				next.filter = { ...TL5_FILTER_DEFAULTS, on: next.filter === true };
				changed = true;
			} else if (next.filter === undefined) {
				const legacyKeys = ["on", "brightness", "contrast", "saturate"];
				if (legacyKeys.some((key) => next[key] !== undefined)) {
					const filter = { ...TL5_FILTER_DEFAULTS };
					if (next.on === true) filter.on = true;
					for (const key of ["brightness", "contrast", "saturate"]) {
						const number = Number(next[key]);
						if (Number.isFinite(number)) filter[key] = Math.round(number);
					}
					next.filter = filter;
					for (const key of legacyKeys) delete next[key];
					changed = true;
				}
			}
			if (typeof next.speed === "string" && next.speed.trim() !== "") {
				const speed = Number(next.speed);
				if (Number.isFinite(speed)) {
					next.speed = speed;
					changed = true;
				}
			}
			return changed ? tl5Json(next) : null;
		}

		function tl5NearestInterval(seconds) {
			let best = TL5_ROTATION_INTERVALS[0];
			for (const candidate of TL5_ROTATION_INTERVALS) {
				if (Math.abs(candidate - seconds) < Math.abs(best - seconds)) best = candidate;
			}
			return best;
		}

		/** `tianlight.rotation`：interval 可能是 "2m"/"120s"/"120"；order "shuffle" → "random"。 */
		function repairRotationSetting(raw) {
			const value = JSON.parse(raw);
			if (tl5IsPlainObject(value) === false) return null;
			const next = { ...value };
			let changed = false;
			if (typeof next.interval === "string") {
				const match = next.interval.trim().toLowerCase().match(/^(\d+(?:\.\d+)?)\s*(s|sec|secs|秒|m|min|mins|分|分钟)?$/);
				if (match !== null) {
					const amount = Number(match[1]);
					const unit = match[2] ?? "";
					const minutes = unit === "m" || unit === "min" || unit === "mins" || unit === "分" || unit === "分钟";
					next.interval = tl5NearestInterval(minutes ? amount * 60 : amount);
					changed = true;
				}
			}
			if (next.order === "shuffle") {
				next.order = "random";
				changed = true;
			}
			return changed ? tl5Json(next) : null;
		}

		/** `tianlight.library`：v0.3 之前是收藏 URL 数组 / {favorites:[...]} → {items:{url:meta}}。 */
		function repairLibrarySetting(raw) {
			const value = JSON.parse(raw);
			if (Array.isArray(value)) {
				const items = {};
				for (const url of value) {
					if (typeof url === "string" && url !== "") items[url] = { favorite: true, tags: [], hidden: false };
				}
				return tl5Json({ items });
			}
			if (tl5IsPlainObject(value) === false) return null;
			if (Array.isArray(value.favorites) && value.items === undefined) {
				const items = {};
				for (const url of value.favorites) {
					if (typeof url === "string" && url !== "") items[url] = { favorite: true, tags: [], hidden: false };
				}
				const next = { ...value, items };
				delete next.favorites;
				return tl5Json(next);
			}
			return null;
		}

		/** `tianlight.zones`：v0.3 的平铺取景对象 → {separate,main,rail}。 */
		function repairZonesSetting(raw) {
			const value = JSON.parse(raw);
			if (tl5IsPlainObject(value) === false) return null;
			if (tl5IsPlainObject(value.main) || tl5IsPlainObject(value.rail) || typeof value.separate === "boolean") return null;
			const legacy = TL5_ZONE_LEGACY_FIELDS.filter((key) => value[key] !== undefined);
			if (legacy.length === 0) return null;
			const main = {};
			for (const key of legacy) main[key] = value[key];
			const next = { ...value, separate: false, main, rail: { ...TL5_RAIL_DEFAULTS } };
			for (const key of legacy) delete next[key];
			return tl5Json(next);
		}

		/** `tianlight.glass`：当前是裸数字字符串；JSON 数字/对象是旧格式，越界值夹到 0.35–1.5。 */
		function repairGlassSetting(raw) {
			const number = Number(raw);
			if (Number.isFinite(number)) {
				const clamped = tl5Clamp(number, 0.35, 1.5);
				return clamped === number ? null : String(clamped);
			}
			try {
				const value = JSON.parse(raw);
				if (tl5IsPlainObject(value)) {
					const candidate = Number(value.value ?? value.level ?? value.opacity);
					if (Number.isFinite(candidate)) return String(tl5Clamp(candidate, 0.35, 1.5));
				}
			} catch {
				// 非 JSON 文本：按损坏值重置为默认 1
			}
			return "1";
		}

		/** `tianlight.lowpower`：布尔 true/false → on/off；manual → on。 */
		function repairLowPowerSetting(raw) {
			if (raw === "on" || raw === "off" || raw === "auto") return null;
			if (raw === "true") return "on";
			if (raw === "false") return "off";
			try {
				const value = JSON.parse(raw);
				if (value === true) return "on";
				if (value === false) return "off";
				if (value === "on" || value === "off" || value === "auto") return value;
				if (value === "manual") return "on";
				if (value === "battery" || value === "auto-battery") return "auto";
			} catch {
				// 非 JSON 文本
			}
			return raw === "manual" ? "on" : null;
		}

		/** `tianlight.fps`：数字/"30fps"/"high" 等旧写法归一到 auto/60/30/15。 */
		function repairFpsSetting(raw) {
			if (raw === "auto" || raw === "60" || raw === "30" || raw === "15") return null;
			try {
				const value = JSON.parse(raw);
				if (typeof value === "string" || typeof value === "number") return repairFpsSetting(String(value));
			} catch {
				// 非 JSON 文本，按下面的文本规则处理
			}
			const text = String(raw).trim().toLowerCase().replace(/fps$/, "");
			const number = Number(text);
			if (Number.isFinite(number)) {
				if (number >= 45) return "60";
				if (number >= 22) return "30";
				return "15";
			}
			if (text === "high") return "60";
			if (text === "low" || text === "battery") return "15";
			return null;
		}

		/** `tianlight.shader`：旧版是纯 preset 字符串，但源码无法在这里恢复；只让损坏 JSON 记 failed。 */
		function repairShaderSetting(raw) {
			const value = JSON.parse(raw);
			if (tl5IsPlainObject(value)) return null;
			return null;
		}

		/** 槽位只做结构搬运；值域校验交给 30-wallpaper.js 的 normalizeLayerSlot（避免删掉新预设）。 */
		function tl5CleanLayerSlot(value) {
			const slot = { kind: "none", preset: "none", url: "", fit: "cover", opacity: 0.55, blend: "normal" };
			if (tl5IsPlainObject(value) === false) return slot;
			for (const key of Object.keys(slot)) {
				if (value[key] !== undefined) slot[key] = value[key];
			}
			return slot;
		}

		/** `tianlight.layers`：v1 单对象/数组 → {version:2,slots:[A,B]}。 */
		function repairLayersSetting(raw) {
			const value = JSON.parse(raw);
			if (Array.isArray(value)) {
				return tl5Json({ version: 2, slots: [tl5CleanLayerSlot(value[0]), tl5CleanLayerSlot(value[1])] });
			}
			if (tl5IsPlainObject(value) === false) return null;
			if (Array.isArray(value.slots)) {
				if (value.version === 2) return null;
				return tl5Json({ ...value, version: 2 });
			}
			// v1：单对象就是一个叠加层 → 放进 A 槽，B 槽补默认值。
			return tl5Json({ version: 2, slots: [tl5CleanLayerSlot(value), tl5CleanLayerSlot(undefined)] });
		}

		/** `tianlight.font.family`：旧版只存字族 id（纯文本或 JSON 字符串）→ 完整排版对象。 */
		function repairFontFamilySetting(raw) {
			let value;
			try {
				value = JSON.parse(raw);
			} catch {
				value = undefined;
			}
			if (tl5IsPlainObject(value)) return null;
			if (typeof value === "string" && /^[a-z][a-z0-9-]{0,31}$/.test(value)) {
				return tl5Json({ ...TL5_FONT_DEFAULTS, ui: value });
			}
			if (value === undefined && /^[a-z][a-z0-9-]{0,31}$/.test(raw)) {
				return tl5Json({ ...TL5_FONT_DEFAULTS, ui: raw });
			}
			return null;
		}

		function tl5PxNumber(value) {
			if (typeof value === "number") return Number.isFinite(value) ? value : null;
			if (typeof value !== "string") return null;
			const match = value.trim().match(/^(-?\d+(?:\.\d+)?)(?:px)?$/i);
			return match === null ? null : Number(match[1]);
		}

		/** `tianlight.font.position`：{x,y} / "120px" 字符串 → {left,top} 数字。 */
		function repairFontPositionSetting(raw) {
			let value;
			try {
				value = JSON.parse(raw);
			} catch {
				return null;
			}
			if (tl5IsPlainObject(value) === false) return null;
			const next = { ...value };
			let changed = false;
			for (const pair of [["left", "x"], ["top", "y"]]) {
				const axis = pair[0];
				const legacyAxis = pair[1];
				const parsed = tl5PxNumber(next[axis]);
				if (parsed !== null && typeof next[axis] !== "number") {
					next[axis] = parsed;
					changed = true;
				}
				if (next[axis] === undefined && tl5PxNumber(next[legacyAxis]) !== null) {
					next[axis] = tl5PxNumber(next[legacyAxis]);
					delete next[legacyAxis];
					changed = true;
				}
			}
			return changed ? tl5Json(next) : null;
		}

		/** 桌宠 `dsh-tianlight:cat:v1`：补齐 mood 默认值，字符串数字转数字，left/top → x/y。 */
		function repairCompanionSetting(raw) {
			let value;
			try {
				value = JSON.parse(raw);
			} catch {
				return null;
			}
			if (tl5IsPlainObject(value) === false) return null;
			const next = { ...value };
			let changed = false;
			if (next.mood === undefined) {
				next.mood = 62;
				changed = true;
			} else if (typeof next.mood === "string" && Number.isFinite(Number(next.mood))) {
				next.mood = Number(next.mood);
				changed = true;
			}
			for (const pair of [["x", "left"], ["y", "top"]]) {
				const axis = pair[0];
				const legacyAxis = pair[1];
				if (next[axis] === undefined && Number.isFinite(next[legacyAxis])) {
					next[axis] = next[legacyAxis];
					delete next[legacyAxis];
					changed = true;
				} else if (typeof next[axis] === "string" && Number.isFinite(Number(next[axis]))) {
					next[axis] = Number(next[axis]);
					changed = true;
				}
			}
			return changed ? tl5Json(next) : null;
		}

		/** `tianlight.modules`：数组（启用名单）/ "true" 字符串 → 布尔对象；缺省模块由读取方补默认 true。 */
		function repairModulesSetting(raw) {
			let value;
			try {
				value = JSON.parse(raw);
			} catch {
				return null;
			}
			if (Array.isArray(value)) {
				const state = {};
				for (const def of MODULE_DEFS) {
					state[def.id] = def.switchable === false ? true : value.indexOf(def.id) >= 0;
				}
				return tl5Json(state);
			}
			if (tl5IsPlainObject(value) === false) return null;
			let changed = false;
			const next = { ...value };
			for (const def of MODULE_DEFS) {
				const saved = next[def.id];
				if (saved === "true" || saved === "false") {
					next[def.id] = saved === "true";
					changed = true;
				} else if (saved !== undefined && typeof saved !== "boolean") {
					next[def.id] = saved === 1 || saved === "on" || saved === "enabled";
					changed = true;
				}
			}
			return changed ? tl5Json(next) : null;
		}

		/** `tianlight.language`：JSON 字符串 `"zh"` → 裸值 zh。 */
		function repairLanguageSetting(raw) {
			if (TL5_LANGUAGE_MODES.indexOf(raw) >= 0) return null;
			try {
				const value = JSON.parse(raw);
				if (typeof value === "string" && TL5_LANGUAGE_MODES.indexOf(value) >= 0) return value;
			} catch {
				// 非 JSON 文本
			}
			return null;
		}

		/** v5 新键（effects/context/legibility/transition）：只校验是 JSON 对象，形状归各自控制器。 */
		function repairJsonObjectSetting(raw) {
			const value = JSON.parse(raw);
			if (tl5IsPlainObject(value)) return null;
			return null;
		}

		/** `tianlight.sync.revision`：非负整数文本；其他写法带上限重置。 */
		function repairSyncRevisionSetting(raw) {
			if (/^\d+$/.test(raw)) return null;
			const number = Number(raw);
			if (Number.isInteger(number) && number >= 0) return String(number);
			return "0";
		}

		const TL5_MIGRATIONS = [
			{ key: "tianlight.wallpaper", repair: repairWallpaperSetting },
			{ key: "tianlight.playback", repair: repairPlaybackSetting },
			{ key: "tianlight.rotation", repair: repairRotationSetting },
			{ key: "tianlight.library", repair: repairLibrarySetting },
			{ key: "tianlight.zones", repair: repairZonesSetting },
			{ key: "tianlight.glass", repair: repairGlassSetting },
			{ key: "tianlight.lowpower", repair: repairLowPowerSetting },
			{ key: "tianlight.fps", repair: repairFpsSetting },
			{ key: "tianlight.shader", repair: repairShaderSetting },
			{ key: "tianlight.layers", repair: repairLayersSetting },
			{ key: "tianlight.font.family", repair: repairFontFamilySetting },
			{ key: "tianlight.font.position", repair: repairFontPositionSetting },
			{ key: STORAGE_KEY, repair: repairCompanionSetting },
			{ key: "tianlight.modules", repair: repairModulesSetting },
			{ key: "tianlight.language", repair: repairLanguageSetting },
			{ key: "tianlight.effects", repair: repairJsonObjectSetting },
			{ key: "tianlight.context", repair: repairJsonObjectSetting },
			{ key: "tianlight.legibility", repair: repairJsonObjectSetting },
			{ key: "tianlight.transition", repair: repairJsonObjectSetting },
			{ key: TL5_SYNC_REVISION_KEY, repair: repairSyncRevisionSetting },
		];

		/**
		 * 备份被改写的原始值，一次迁移只写一次；已有备份里存在的键不覆盖
		 * （保留最早的原件）。超过 1MB 时从后往前放弃，并记入诊断。
		 */
		function tl5BackupOriginals(storage, originals) {
			if (originals.size === 0) return;
			let backup = {};
			let existing = null;
			try {
				existing = storage.getItem(TL5_BACKUP_KEY);
			} catch {
				existing = null;
			}
			if (existing !== null && existing !== "") {
				try {
					const parsed = JSON.parse(existing);
					if (tl5IsPlainObject(parsed)) backup = parsed;
				} catch {
					// 备份本身损坏：本次迁移重建一份（原件只此一份，优先保住本次数据）
					backup = {};
				}
			}
			let bytes = tl5Json(backup).length;
			let added = 0;
			for (const pair of originals) {
				const key = pair[0];
				const raw = pair[1];
				if (Object.prototype.hasOwnProperty.call(backup, key)) continue;
				const cost = tl5Json(key).length + tl5Json(raw).length + 4;
				if (bytes + cost > TL5_BACKUP_MAX_BYTES) {
					tl5Diag("settings", { backupSkipped: key });
					continue;
				}
				backup[key] = raw;
				bytes += cost;
				added += 1;
			}
			if (added === 0) return;
			try {
				storage.setItem(TL5_BACKUP_KEY, tl5Json(backup));
			} catch (error) {
				note("settings:backup", error);
			}
		}

		/** 读取已存的 schema 版本；缺失/损坏一律视为迁移前（0）。 */
		function readStoredSchemaVersion(storage) {
			let raw = null;
			try {
				raw = storage.getItem(TL5_SCHEMA_KEY);
			} catch {
				return 0;
			}
			if (raw === null || raw === "") return 0;
			const direct = Number(raw);
			if (Number.isInteger(direct) && direct >= 0) return direct;
			try {
				const parsed = JSON.parse(raw);
				if (tl5IsPlainObject(parsed)) {
					const version = Number(parsed.version);
					if (Number.isInteger(version) && version >= 0) return version;
				}
			} catch {
				// 损坏的版本标记：当作迁移前处理一次
			}
			return 0;
		}

		/** 实际执行一遍迁移（每会话一次）。任何单键失败只记录，不中断其他键。 */
		function executeSchemaMigrations() {
			const report = { from: 0, to: TL5_SCHEMA_VERSION, migrated: [], failed: [] };
			const storage = tl5Storage();
			if (storage === null) {
				report.failed.push("storage");
				return report;
			}
			report.from = readStoredSchemaVersion(storage);
			// schema 已是当前版本：直接跳过。等价于“每个浏览器只迁移一次”。
			if (report.from >= TL5_SCHEMA_VERSION) return report;
			const rewrites = new Map();
			const originals = new Map();
			for (const entry of TL5_MIGRATIONS) {
				let raw = null;
				try {
					raw = storage.getItem(entry.key);
				} catch {
					report.failed.push(entry.key);
					continue;
				}
				if (raw === null || raw === "") continue;
				try {
					const next = entry.repair(raw);
					if (typeof next === "string" && next !== raw) {
						rewrites.set(entry.key, next);
						originals.set(entry.key, raw);
					}
				} catch {
					// 损坏的 JSON / 未知旧形状：保留原件，读取方会退化到默认值。
					report.failed.push(entry.key);
				}
			}
			try {
				tl5BackupOriginals(storage, originals);
			} catch (error) {
				note("settings:backup", error);
			}
			for (const pair of rewrites) {
				try {
					storage.setItem(pair[0], pair[1]);
					report.migrated.push(pair[0]);
				} catch {
					report.failed.push(pair[0]);
				}
			}
			// 即使有失败键也盖章：否则每次刷新都会重新尝试同一批损坏值。
			try {
				storage.setItem(TL5_SCHEMA_KEY, String(TL5_SCHEMA_VERSION));
			} catch {
				report.failed.push(TL5_SCHEMA_KEY);
			}
			return report;
		}

		let schemaReport = null;

		const schemaRuntime = {
			report: () =>
				schemaReport === null
					? { from: 0, to: TL5_SCHEMA_VERSION, migrated: [], failed: [] }
					: {
							from: schemaReport.from,
							to: schemaReport.to,
							migrated: schemaReport.migrated.slice(),
							failed: schemaReport.failed.slice(),
						},
			migrate: () => {
				if (schemaReport === null) {
					try {
						schemaReport = executeSchemaMigrations();
					} catch (error) {
						note("settings:migrate", error);
						schemaReport = { from: 0, to: TL5_SCHEMA_VERSION, migrated: [], failed: ["*"] };
					}
					tl5Diag("settings", { migrated: schemaReport.migrated, failed: schemaReport.failed, from: schemaReport.from, to: schemaReport.to });
				}
				return schemaRuntime.report();
			},
		};

		/* ================= E1/E3：宿主设置 + 本地镜像 + 多窗口 ================= */

		function tl5ReadSyncRevision() {
			const storage = tl5Storage();
			if (storage === null) return 0;
			try {
				const number = Number(storage.getItem(TL5_SYNC_REVISION_KEY));
				return Number.isInteger(number) && number >= 0 ? number : 0;
			} catch {
				return 0;
			}
		}

		const settingsState = {
			host: false,
			revision: tl5ReadSyncRevision(),
			/** 宿主最近一次报告的 revision（乐观锁 expectedRevision 的基准）。 */
			hostRevision: 0,
			/**
			 * REV-R3 B1: the last authoritative host snapshot we have seen
			 * (`key -> string|null`), or null before the first GET/PUT reply. A 409
			 * merge uses it to tell "the host changed this key under us" from "the
			 * conflict was on a different key"; only the former lets the host win.
			 */
			knownRemote: null,
			/** 本会话写冲突（409）次数，仅诊断用。 */
			conflicts: 0,
			pending: 0,
			lastError: "",
			/** 宿主 404/405/501：路由不存在（旧版本宿主），不要每次写入都重试。 */
			hostRouteMissing: false,
			/** tianlight.backup.host 是否存在可用备份（bootstrap/安装时刷新，避免 status 反复解析）。 */
			backup: false,
			/** 最近一次 recoverBackup 恢复的键数（面板显示“已恢复 N 项”）。 */
			recovered: 0,
		};
		/** bootstrap push 的计数，供 verifier 断言“首启全量推送”。 */
		let settingsSyncStats = { localKeys: 0, remoteKeys: 0, pushedKeys: 0 };
		const settingsSubscribers = new Set();
		/** 本窗口的随机 id：BroadcastChannel 不回放自己的消息。 */
		const settingsInstanceId = "tl5-" + Math.random().toString(36).slice(2, 10) + "-" + Date.now().toString(36);

		const settingsMirror = {
			installed: false,
			storage: null,
			originalSet: null,
			originalRemove: null,
			restore: null,
			eventTarget: null,
			onStorage: null,
			channel: null,
			onChannelMessage: null,
			timer: 0,
			queue: new Map(),
			inFlight: 0,
			retries: 0,
			/** 本批次连续写冲突（409）次数；成功一次即清零。 */
			conflicts: 0,
		};
		/** 对齐运行时状态时置位：写入本地但不进镜像队列（值本来就来自宿主/迁移）。 */
		let settingsSuppressMirror = false;

		function settingsStatus() {
			const report = schemaRuntime.report();
			return {
				host: settingsState.host,
				revision: settingsState.revision,
				pending: settingsState.pending,
				lastError: settingsState.lastError,
				/** 本会话写冲突次数（409）：0 表示没有别的窗口抢写过。 */
				conflicts: settingsState.conflicts,
				migrated: report.migrated,
				schema: { from: report.from, to: report.to },
				/** 是否存在 tianlight.backup.host 备份（面板“恢复宿主导入前备份”按钮）。 */
				backup: settingsState.backup === true,
				/** 最近一次 recoverBackup 的恢复项数（0 表示本会话还没恢复过）。 */
				recovered: settingsState.recovered,
			};
		}

		function settingsNotify() {
			tl5Diag("settings", settingsStatus());
			if (settingsSubscribers.size === 0) return;
			const snapshot = settingsStatus();
			for (const listener of [...settingsSubscribers]) {
				try {
					listener(snapshot);
				} catch (error) {
					note("settings:subscriber", error);
				}
			}
		}

		/**
		 * 宿主设置协议 `_settings`（v0.5.0 起；v0.6.1 additive 扩展）：
		 *   GET   200 { ok, schemaVersion, revision, updatedAt, settings }
		 *   PUT   body { revision?, expectedRevision?, settings }
		 *     - expectedRevision（可选）＝本客户端“最后看到的宿主 revision”。
		 *       与宿主当前一致才写入并返回 200 { ok, revision, updatedAt, settings }
		 *       （settings 是合并后的权威完整镜像，客户端以它落地本地）；
		 *       不一致返回 409 { ok:false, conflict:true, revision, updatedAt, settings }，
		 *       settings 是宿主当前权威快照；客户端先合并它，再用新 revision 重推自己
		 *       的本地差异（不会静默覆盖另一个窗口刚写的键）。
		 *     - 旧客户端不带 expectedRevision → 宿主保持 last-write-wins（兼容）；
		 *     - 旧宿主 200 只返 { revision, updatedAt }，没有 settings 字段 →
		 *       客户端走兼容分支，只采纳 revision（保持 v0.5.2 行为）。
		 *   DELETE 200 { ok, revision, updatedAt, settings:{} }
		 *
		 * 一次宿主请求。所有失败（网络、超时、非 2xx、坏 JSON）都折叠成
		 * { ok:false, status, error }，调用方不需要 try/catch。
		 */
		async function settingsRequest(method, payload, timeoutMs) {
			if (typeof fetch !== "function") return { ok: false, status: 0, error: "host:no-fetch" };
			const controller = typeof AbortController === "function" ? new AbortController() : null;
			let timer = 0;
			if (controller !== null) {
				timer = window.setTimeout(() => {
					try {
						controller.abort();
					} catch {
						// already settled
					}
				}, timeoutMs);
			}
			try {
				const response = await fetch(TL5_SETTINGS_ROUTE, {
					method: method,
					headers: { "Content-Type": "application/json", Accept: "application/json" },
					body: payload === undefined ? undefined : JSON.stringify(payload),
					signal: controller === null ? undefined : controller.signal,
					credentials: "same-origin",
					cache: "no-store",
				});
				const status = Number(response?.status ?? 0);
				if (response === null || response === undefined) {
					return { ok: false, status: 0, error: "host:network", data: null };
				}
				if (response.ok !== true) {
					// 409 carries the host's authoritative settings so the caller can
					// merge and retry; parse the error body when the host sent JSON.
					let errorData = null;
					try {
						const parsed = await response.json();
						if (tl5IsPlainObject(parsed)) errorData = parsed;
					} catch {
						errorData = null;
					}
					return { ok: false, status: status, error: "host:" + String(status === 0 ? "network" : status), data: errorData };
				}
				let data = null;
				try {
					data = await response.json();
				} catch {
					return { ok: false, status: status, error: "host:bad-json", data: null };
				}
				if (tl5IsPlainObject(data) === false) return { ok: false, status: status, error: "host:bad-json", data: null };
				return { ok: true, status: status, data: data };
			} catch (error) {
				const aborted = controller !== null && controller.signal !== undefined && controller.signal.aborted === true;
				return { ok: false, status: 0, error: aborted ? "host:timeout" : "host:network" };
			} finally {
				if (timer !== 0) {
					window.clearTimeout(timer);
					timer = 0;
				}
			}
		}

		/** 收集本机全部“设置”键（同步镜像的源）。 */
		function collectLocalSettings() {
			const map = {};
			const storage = tl5Storage();
			if (storage === null) return map;
			for (const key of tl5StorageKeys(storage)) {
				if (tl5SyncableKey(key) === false) continue;
				try {
					const value = storage.getItem(key);
					if (typeof value === "string") map[key] = value;
				} catch {
					// 单个键读失败不影响其余键
				}
			}
			return map;
		}

		/** 宿主返回的 settings 只接受合法键与 string|null 值。 */
		function sanitizeRemoteSettings(raw) {
			const map = {};
			if (tl5IsPlainObject(raw) === false) return map;
			for (const key of Object.keys(raw)) {
				if (tl5SyncableKey(key) === false) continue;
				const value = raw[key];
				if (typeof value === "string") map[key] = value;
				else if (value === null) map[key] = null;
			}
			return map;
		}

		/** 计算本地 → 宿主的差异；null 表示删除（远端存在而本地没有的键）。 */
		function buildSettingsPush(local, remote) {
			const push = {};
			let changed = false;
			const keys = new Set([...Object.keys(local), ...Object.keys(remote)]);
			for (const key of keys) {
				const left = Object.prototype.hasOwnProperty.call(local, key) ? local[key] : null;
				const right = Object.prototype.hasOwnProperty.call(remote, key) ? remote[key] : null;
				if (left === right) continue;
				push[key] = left;
				changed = true;
			}
			return changed ? push : null;
		}

		/** 绕过镜像层写 localStorage（外部值落地 / 元数据写入都必须用这些）。 */
		function tl5RawSet(storage, key, value) {
			const mirror = settingsMirror;
			if (mirror.installed === true && mirror.storage === storage && typeof mirror.originalSet === "function") {
				return mirror.originalSet.call(storage, key, value);
			}
			return storage.setItem(key, value);
		}

		function tl5RawRemove(storage, key) {
			const mirror = settingsMirror;
			if (mirror.installed === true && mirror.storage === storage && typeof mirror.originalRemove === "function") {
				return mirror.originalRemove.call(storage, key);
			}
			return storage.removeItem(key);
		}

		function tl5WriteSyncRevision(revision) {
			settingsState.revision = revision;
			const storage = tl5Storage();
			if (storage === null) return;
			try {
				const text = String(revision);
				if (storage.getItem(TL5_SYNC_REVISION_KEY) === text) return; // 避免无意义的 storage 事件
				tl5RawSet(storage, TL5_SYNC_REVISION_KEY, text);
			} catch (error) {
				note("settings:revision-write", error);
			}
		}

		/** 外部来源（宿主/BC/storage 事件）的配置落地：不回声、不镜像。 */
		function applyExternalSettings(patch, source) {
			const storage = tl5Storage();
			if (storage === null || tl5IsPlainObject(patch) === false) return 0;
			const changedKeys = [];
			for (const key of Object.keys(patch)) {
				if (tl5SyncableKey(key) === false) continue;
				const value = patch[key];
				// 外部写入是“最后写入者”，把还在去抖队列里的本地旧值丢掉。
				settingsMirror.queue.delete(key);
				let current = null;
				try {
					current = storage.getItem(key);
				} catch {
					continue;
				}
				try {
					if (value === null) {
						if (current !== null) {
							tl5RawRemove(storage, key);
							changedKeys.push(key);
						}
					} else if (typeof value === "string" && current !== value) {
						tl5RawSet(storage, key, value);
						changedKeys.push(key);
					}
				} catch (error) {
					note("settings:external-write", { key, error });
				}
			}
			if (settingsMirror.installed === true) {
				settingsState.pending = settingsMirror.queue.size + settingsMirror.inFlight;
			}
			if (changedKeys.length > 0) {
				settingsNotify();
				dispatchSettingsEvent(source, changedKeys);
			}
			return changedKeys.length;
		}

		/* ---- 宿主导入前的本地备份（v0.5.2 数据安全） ---- */

		/** tianlight.backup.host 是否可用（存在且至少一个键）。只在 bootstrap/安装/恢复时调用。 */
		function tl5HostBackupAvailable() {
			const storage = tl5Storage();
			if (storage === null) return false;
			try {
				const raw = storage.getItem(TL5_HOST_BACKUP_KEY);
				if (raw === null || raw === "") return false;
				const parsed = JSON.parse(raw);
				return tl5IsPlainObject(parsed) && Object.keys(parsed).length > 0;
			} catch {
				return false;
			}
		}

		function tl5RefreshBackupFlag() {
			settingsState.backup = tl5HostBackupAvailable();
		}

		/**
		 * 把导入前的本地可同步键写进 tianlight.backup.host（本地专用，mirror 已排除）。
		 * 256KB 上限：超限时按 key 截断并记诊断——宁可少备份，也不写超大值。
		 */
		function tl5WriteHostBackup(storage, map) {
			try {
				const keys = Object.keys(map);
				if (keys.length === 0) return;
				let text = tl5Json(map);
				if (text.length > TL5_HOST_BACKUP_MAX_BYTES) {
					const trimmed = {};
					let bytes = 2;
					for (const key of keys) {
						const cost = tl5Json(key).length + tl5Json(map[key]).length + 4;
						if (bytes + cost > TL5_HOST_BACKUP_MAX_BYTES) break;
						trimmed[key] = map[key];
						bytes += cost;
					}
					text = tl5Json(trimmed);
					tl5Diag("settings", { hostBackupTruncated: true });
				}
				storage.setItem(TL5_HOST_BACKUP_KEY, text);
				settingsState.backup = true;
			} catch (error) {
				note("settings:host-backup", error);
			}
		}

		/**
		 * 宿主 revision 更新时的落地（v0.5.2 数据安全规则）：
		 *   - 宿主里有的键按宿主值落地；显式 null 是删除墓碑，仍然删除本地
		 *     （跨浏览器删除传播靠它）；
		 *   - 宿主里没有的本地键一律保留！宿主文件可能是子集/不完整，绝不能反过来
		 *     清空用户本地设置。调用方随后会把本地独有键 push 回宿主（宿主变超集）；
		 *   - 落地前若真的会改本地值，先把改动前的本地可同步键备份到
		 *     tianlight.backup.host（面板可一键恢复）。
		 * options.respectQueue：PUT 响应里的权威快照落地时，本地仍在去抖队列里的键
		 * 是更新的本地编辑，不能被稍旧的快照覆盖（否则会丢刚改的值）。
		 * options.protectKeys：REV-R3 B1——409 合并时传入“在途中”的 batch 键集合，
		 * 这些键由冲突解决逻辑（settingsResolveConflictBatch）逐个判定后再落地，
		 * 不能被快照直接回滚。
		 * 返回真正变化的键（用于 tianlight:settings 事件与诊断）。
		 */
		function applyHostSettings(remoteMap, options) {
			const storage = tl5Storage();
			if (storage === null) return [];
			const protectQueue = options !== null && typeof options === "object" && options.respectQueue === true;
			const protectKeys =
				options !== null && typeof options === "object" && options.protectKeys instanceof Set ? options.protectKeys : null;
			const skipKey = (key) =>
				(protectQueue === true && settingsMirror.queue.has(key)) || (protectKeys !== null && protectKeys.has(key));
			const changedKeys = [];
			// 1) 只读地算出会变化哪些键（决定是否需要备份），不先动任何值。
			for (const key of Object.keys(remoteMap)) {
				if (tl5SyncableKey(key) === false) continue;
				if (skipKey(key)) continue;
				const value = remoteMap[key];
				if (value !== null && typeof value !== "string") continue;
				let current = null;
				try {
					current = storage.getItem(key);
				} catch {
					continue;
				}
				if (value === null ? current !== null : current !== value) changedKeys.push(key);
			}
			if (changedKeys.length === 0) {
				settingsState.pending = settingsMirror.queue.size + settingsMirror.inFlight;
				return changedKeys;
			}
			// 2) 备份“导入前”的本地设置（只备份真正会被改动的那一次）。
			tl5WriteHostBackup(storage, collectLocalSettings());
			// 3) 这些键的宿主快照是权威值：丢掉还没推送的本地旧值；本地独有键的队列保留。
			for (const key of changedKeys) settingsMirror.queue.delete(key);
			// 4) 只应用宿主里存在的键；本地独有的键保持原样（不删除）。
			for (const key of changedKeys) {
				const value = remoteMap[key];
				try {
					if (value === null) tl5RawRemove(storage, key);
					else tl5RawSet(storage, key, value);
				} catch (error) {
					note("settings:host-write", { key, error });
				}
			}
			settingsState.pending = settingsMirror.queue.size + settingsMirror.inFlight;
			settingsNotify();
			return changedKeys;
		}

		/**
		 * 采纳 PUT 响应里的权威快照（协议 v0.6.1）。
		 * - 宿主返回 settings → 先记录 knownRemote（下一次 409 的对比基准），再按
		 *   v0.5.2 规则落地本地（respectQueue：本地待推送的更新编辑优先；
		 *   options.protectKeys：在途 batch 键留给冲突解决逻辑，见 REV-R3 B1）；
		 * - 旧宿主只返 revision → 只采纳 revision（兼容分支，返回 null）。
		 * 返回宿主快照的本地投影（旧宿主/坏响应为 null）。
		 */
		function settingsAdoptPutResponse(data, options) {
			if (tl5IsPlainObject(data) === false) return null;
			const revision = Math.max(0, Math.floor(Number(data.revision) || 0));
			settingsState.hostRevision = revision;
			if (revision > settingsState.revision) settingsState.revision = revision;
			tl5WriteSyncRevision(settingsState.revision);
			if (tl5IsPlainObject(data.settings) === false) return null;
			const remoteMap = sanitizeRemoteSettings(data.settings);
			// Record the authoritative snapshot BEFORE applying it: callers pass their
			// pre-conflict knownRemote separately, and this becomes the next baseline.
			settingsSetKnownRemote(remoteMap);
			applyHostSettings(remoteMap, {
				respectQueue: true,
				protectKeys: options !== null && typeof options === "object" && options.protectKeys instanceof Set ? options.protectKeys : null,
			});
			return remoteMap;
		}

		/**
		 * 409 合并后把本窗口这一批本地编辑重新排进镜像队列。
		 * 只重排“仍然等于本地当前值”的键：如果合并进来的宿主快照已经把同名键改成
		 * 另一个窗口刚写的值，就保留宿主值（再推回旧值等于静默覆盖他人改动）。
		 */
		function settingsReapplyBatch(batch) {
			const storage = tl5Storage();
			for (const pair of batch) {
				const key = pair[0];
				const value = pair[1];
				if (tl5SyncableKey(key) === false) continue;
				let current = null;
				try {
					current = storage === null ? null : storage.getItem(key);
				} catch {
					continue;
				}
				if (current !== value) continue;
				settingsMirror.queue.set(key, value);
			}
			settingsState.pending = settingsMirror.queue.size + settingsMirror.inFlight;
		}

		/** 宿主快照键值读取（区分“不存在”与“显式 null 墓碑”）。 */
		function settingsSnapshotHas(map, key) {
			return map !== null && map !== undefined && tl5IsPlainObject(map) && Object.prototype.hasOwnProperty.call(map, key);
		}

		function settingsSnapshotValue(map, key) {
			return settingsSnapshotHas(map, key) ? map[key] : undefined;
		}

		/** 记录最近一次已知的宿主权威快照（浅拷贝；null 表示还没见过宿主）。 */
		function settingsSetKnownRemote(map) {
			settingsState.knownRemote = map === null || map === undefined ? null : { ...map };
		}

		/**
		 * REV-R3 B1: the in-flight batch keeps priority over a 409 snapshot for keys
		 * the host did NOT change. `batch` is [key,value] pairs (null = our tombstone).
		 * Returns the pairs that must be retried.
		 */
		function settingsResolveConflictBatch(batch, adopted, knownBefore) {
			const keep = [];
			const hostWins = {};
			for (const pair of batch) {
				const key = pair[0];
				const value = pair[1];
				if (tl5SyncableKey(key) === false) continue;
				const hostValue = settingsSnapshotValue(adopted, key);
				const knownValue = settingsSnapshotValue(knownBefore, key);
				if (hostValue === knownValue) {
					// The host still holds the value we last saw for this key: the 409
					// came from another key, so our local edit must survive and retry.
					keep.push([key, value]);
					continue;
				}
				// Another window really changed this key: host value wins (never
				// overwrite it). `undefined` means the host removed the key, i.e. a
				// tombstone for the local mirror.
				hostWins[key] = hostValue === undefined ? null : hostValue;
			}
			const winners = Object.keys(hostWins);
			if (winners.length > 0) {
				// R8 (REV-R3B M-1): a key the user edited AGAIN while this request was in
				// flight has already been re-queued by the local mirror; applying the older
				// host value over it would lose that newest local edit. Leave those keys to
				// the normal queue/retry path (last-local-write wins with the new revision).
				const hostOnly = {};
				for (const key of winners) {
					if (settingsMirror.queue.has(key)) continue;
					hostOnly[key] = hostWins[key];
				}
				if (Object.keys(hostOnly).length > 0) {
					// Reuse the v0.5.2 adoption path (backup + notify + queue cleanup).
					applyHostSettings(hostOnly);
				}
			}
			// Kept keys were protected from adoption, so the local value is still ours;
			// re-queue them (settingsReapplyBatch also skips a key a newer local edit
			// already replaced, preserving last-local-write).
			settingsReapplyBatch(keep);
			return keep;
		}

		/**
		 * 外部应用后广播 `tianlight:settings` CustomEvent（bubbles:true，所以挂在
		 * body 上时 window/document 的监听也能收到）。detail = {source, keys}。
		 */
		function dispatchSettingsEvent(source, keys) {
			try {
				let target = null;
				if (typeof document !== "undefined" && document !== null && document.body !== null) target = document.body;
				else if (settingsMirror.eventTarget !== null && settingsMirror.eventTarget !== undefined) target = settingsMirror.eventTarget;
				else if (typeof globalThis.window !== "undefined") target = globalThis.window;
				if (target === null || target === undefined || typeof target.dispatchEvent !== "function") return;
				const EventCtor = typeof globalThis.CustomEvent === "function" ? globalThis.CustomEvent : null;
				if (EventCtor === null) return;
				target.dispatchEvent(new EventCtor("tianlight:settings", { bubbles: true, detail: { source: source, keys: keys.slice() } }));
			} catch (error) {
				note("settings:event", error);
			}
		}

		/* ---- bootstrap 期间的 push（含一次重试与计数诊断） ---- */

		/** push 失败是否值得重试一次：只重试网络/超时/5xx，4xx 是宿主明确拒绝。 */
		function tl5SettingsPushRetryable(result) {
			if (result === null || typeof result !== "object") return false;
			if (result.status === 0) return true;
			return result.status >= 500;
		}

		/** 延迟；用 window.setTimeout（audit.mjs 统计 window.setTimeout/clearTimeout）。 */
		function tl5Delay(ms) {
			return new Promise((resolve) => {
				window.setTimeout(resolve, ms);
			});
		}

		/**
		 * 把本地与宿主的差异 PUT 上去（宿主按 key merge：字符串覆盖、null 删除）。
		 * 协议 v0.6.1：带 expectedRevision；宿主回 409 时先合并它返回的权威快照，
		 * 再重算差异并重推一次（TL5_CONFLICT_RETRY_MAX），不会静默覆盖另一个窗口
		 * 刚写的键。网络/超时/5xx 仍只重试一次；4xx/路由缺失不重试。
		 * 返回 { ok, pushedKeys, retried, conflicts }；pushedKeys 含 null 墓碑条数。
		 */
		async function settingsPushDiff(local, remoteMap) {
			let push = buildSettingsPush(local, remoteMap);
			if (push === null) return { ok: true, pushedKeys: 0, retried: false, conflicts: 0 };
			const pushedKeys = Object.keys(push).length;
			let retried = false;
			let conflicts = 0;
			for (;;) {
				const payload = () => ({
					revision: settingsState.revision,
					expectedRevision: settingsState.hostRevision,
					settings: push,
				});
				const send = () => settingsRequest("PUT", payload(), TL5_HOST_WRITE_TIMEOUT_MS);
				let put = await send();
				if (put.ok === false && retried === false && tl5SettingsPushRetryable(put)) {
					retried = true;
					await tl5Delay(TL5_PUSH_RETRY_DELAY_MS);
					put = await send();
				}
				if (put.ok === true) {
					settingsAdoptPutResponse(put.data);
					settingsState.host = true;
					settingsState.hostRouteMissing = false;
					settingsState.lastError = "";
					return { ok: true, pushedKeys, retried, conflicts };
				}
				if (put.status === 409) {
					conflicts += 1;
					settingsState.conflicts += 1;
					// REV-R3 B1: the reply snapshot may still hold the OLD host value of a
					// key we are pushing (the conflict came from another key). Capture the
					// pre-conflict baseline, adopt while protecting our in-flight push keys,
					// then let the host win only for keys it actually changed.
					const knownBefore = settingsState.knownRemote;
					const pushKeys = new Set(Object.keys(push));
					const adopted = settingsAdoptPutResponse(put.data, { protectKeys: pushKeys });
					settingsState.host = true;
					if (adopted === null || conflicts > TL5_CONFLICT_RETRY_MAX) {
						// 宿主没给可合并的快照，或冲突持续：本批放弃重推，本地值继续生效，
						// 下一个同步周期（bootstrap/立即同步/新编辑）会再试。
						settingsState.lastError = "host:conflict";
						return { ok: false, pushedKeys, retried, conflicts };
					}
					const hostWins = {};
					for (const key of pushKeys) {
						const hostValue = settingsSnapshotValue(adopted, key);
						if (hostValue === settingsSnapshotValue(knownBefore, key)) continue;
						hostWins[key] = hostValue === undefined ? null : hostValue;
					}
					if (Object.keys(hostWins).length > 0) applyHostSettings(hostWins);
					// 合并了另一个窗口的改动之后重算差异：本地独有/未被宿主改动的键仍在
					// 差异里（会重推），被宿主改过的键已落地为宿主值（不再推回旧值）。
					const nextPush = buildSettingsPush(collectLocalSettings(), adopted);
					if (nextPush === null) {
						settingsState.lastError = "";
						return { ok: true, pushedKeys, retried, conflicts };
					}
					push = nextPush;
					continue;
				}
				settingsState.lastError = put.error;
				if (put.status === 404 || put.status === 405 || put.status === 501) {
					settingsState.host = false;
					settingsState.hostRouteMissing = true;
				} else if (put.status === 400 || put.status === 412 || put.status === 413) {
					// 宿主拒绝本批（键/大小/版本冲突）：本批放弃，本地值继续生效。
					settingsState.host = true;
				}
				return { ok: false, pushedKeys, retried, conflicts };
			}
		}

		/**
		 * bootstrap：GET 宿主配置（v0.5.2 数据安全版）。
		 *   宿主 revision > 本地  → 宿主权威：只落地宿主里有的键（null 墓碑删除本地），
		 *                          本地独有键保留，随后回推给宿主（宿主重新变成超集）；
		 *   本地缓存为空 + 宿主有值 → 当作“新浏览器/本地被清空”，同样采纳宿主，绝不反向清空宿主；
		 *   宿主 revision <= 本地 → 本地权威：把差异推给宿主（含 null 删除远端孤键）。
		 * push 失败按需重试一次（1s）。宿主不可达只记 lastError，本地模式继续可用。
		 * 结束时写 tl5Diag("settings", {localKeys, remoteKeys, pushedKeys, ...})，
		 * 供 verifier 断言“首启全量推送 / 采纳后回推”。
		 */
		async function settingsBootstrap() {
			const storage = tl5Storage();
			if (storage === null) {
				settingsState.host = false;
				settingsState.lastError = "storage:blocked";
				settingsSyncStats = { localKeys: 0, remoteKeys: 0, pushedKeys: 0 };
				settingsNotify();
				return;
			}
			const result = await settingsRequest("GET", undefined, TL5_HOST_TIMEOUT_MS);
			if (result.ok === false) {
				settingsState.host = false;
				settingsState.lastError = result.error;
				settingsState.hostRouteMissing = result.status === 404 || result.status === 405 || result.status === 501;
				settingsSyncStats = { localKeys: Object.keys(collectLocalSettings()).length, remoteKeys: 0, pushedKeys: 0 };
				tl5Diag("settings", { ...settingsStatus(), ...settingsSyncStats });
				settingsNotify();
				return;
			}
			const remote = result.data;
			if (remote.ok === false) {
				settingsState.host = false;
				settingsState.lastError = "host:rejected";
				settingsSyncStats = { localKeys: Object.keys(collectLocalSettings()).length, remoteKeys: 0, pushedKeys: 0 };
				tl5Diag("settings", { ...settingsStatus(), ...settingsSyncStats });
				settingsNotify();
				return;
			}
			const remoteMap = sanitizeRemoteSettings(remote.settings);
			const remoteRevision = Math.max(0, Math.floor(Number(remote.revision) || 0));
			// REV-R3 B1: the GET snapshot is the baseline a later 409 compares against.
			settingsSetKnownRemote(remoteMap);
			// Optimistic-lock base: the revision the host just reported. The local
			// watermark (settingsState.revision) may be higher after a host reset, and
			// sending that as expectedRevision would make every PUT conflict.
			settingsState.hostRevision = remoteRevision;
			const remoteSchema = Number(remote.schemaVersion);
			settingsState.host = true;
			settingsState.hostRouteMissing = false;
			if (Number.isFinite(remoteSchema) && remoteSchema > TL5_SCHEMA_VERSION) {
				// 宿主来自更新的插件版本：不用未知形状覆盖本地，等插件升级后再合并。
				if (remoteRevision > settingsState.revision) settingsState.revision = remoteRevision;
				settingsState.lastError = "host:schema-newer";
				settingsSyncStats = {
					localKeys: Object.keys(collectLocalSettings()).length,
					remoteKeys: Object.keys(remoteMap).length,
					pushedKeys: 0,
				};
				tl5Diag("settings", { ...settingsStatus(), ...settingsSyncStats });
				settingsNotify();
				return;
			}
			const localBefore = collectLocalSettings();
			const remoteHasValues = Object.keys(remoteMap).some((key) => remoteMap[key] !== null);
			// 本地缓存完全为空而宿主有值：即使 revision 不高于本地也采纳宿主。
			// 反向（本地空 → push 一堆 null）会把宿主也清空，属于数据丢失，必须避免。
			const adoptHost = remoteRevision > settingsState.revision || (Object.keys(localBefore).length === 0 && remoteHasValues);
			if (adoptHost) {
				const changed = applyHostSettings(remoteMap);
				tl5WriteSyncRevision(Math.max(settingsState.revision, remoteRevision));
				settingsState.lastError = "";
				// 模块开关/语言在片段加载期就缓存过 localStorage，这里对齐一次。
				reconcileSettingsConsumers(["tianlight.modules", "tianlight.language"]);
				if (changed.length > 0) dispatchSettingsEvent("host", changed);
			}
			// 无论谁权威，都把本地相对宿主的差异推上去：
			//  - 首启/迁移后：remoteMap 为空 → 全量推送；
			//  - 宿主较新：宿主键已落地，本地独有键在这里回推，宿主恢复为超集。
			const local = collectLocalSettings();
			const pushed = await settingsPushDiff(local, remoteMap);
			settingsSyncStats = {
				localKeys: Object.keys(local).length,
				remoteKeys: Object.keys(remoteMap).length,
				pushedKeys: pushed.pushedKeys,
			};
			tl5RefreshBackupFlag();
			tl5Diag("settings", { ...settingsStatus(), ...settingsSyncStats, pushRetried: pushed.retried });
			settingsNotify();
		}

		/** 同浏览器多窗口广播；没有 BroadcastChannel 时静默降级（storage 事件仍在）。 */
		function settingsPostBroadcast(message) {
			const channel = settingsMirror.channel;
			if (channel === null) return;
			try {
				channel.postMessage({ type: "tl5-settings", source: settingsInstanceId, at: Date.now(), ...message });
			} catch (error) {
				note("settings:broadcast-post", error);
			}
		}

		function settingsOnBroadcast(event) {
			const data = event === null || event === undefined ? null : event.data;
			if (tl5IsPlainObject(data) === false || data.type !== "tl5-settings") return;
			if (data.source === settingsInstanceId) return;
			applyExternalSettings(data.settings, "broadcast");
			const revision = Math.max(0, Math.floor(Number(data.revision) || 0));
			if (revision > settingsState.revision) {
				tl5WriteSyncRevision(revision);
				settingsNotify();
			}
			// Another window confirmed a host-authorized revision: it is the best
			// optimistic-lock base for this window's next PUT (a window that only ever
			// listened would otherwise send a stale expectedRevision and eat a 409).
			if (data.host === true && revision > settingsState.hostRevision) settingsState.hostRevision = revision;
		}

		function settingsOnStorage(event) {
			if (event === null || typeof event !== "object") return;
			const key = event.key;
			if (key === TL5_SYNC_REVISION_KEY) {
				const revision = Math.max(0, Math.floor(Number(event.newValue) || 0));
				if (revision > settingsState.revision) {
					settingsState.revision = revision;
					settingsNotify();
				}
				// REV-R3 M1: without BroadcastChannel the storage event is the only place
				// a same-browser window learns the confirmed host revision. Raise the
				// optimistic-lock base too, or every next PUT would eat a needless 409.
				if (revision > settingsState.hostRevision) settingsState.hostRevision = revision;
				return;
			}
			if (typeof key !== "string") return;
			if (tl5SyncableKey(key) === false) return;
			const patch = {};
			patch[key] = typeof event.newValue === "string" ? event.newValue : null;
			const applied = applyExternalSettings(patch, "storage");
			if (applied === 0) {
				// localStorage 是共享存储区，值通常已经在本窗口生效；等值检查会跳过写入。
				// 这里仍然派发事件，让监听方刷新界面。
				dispatchSettingsEvent("storage", [key]);
				settingsNotify();
			}
		}

		/** 本地写入进入去抖队列（键被补丁方法调用时触发）。 */
		function queueSettingsMirror(key, rawValue) {
			const mirror = settingsMirror;
			if (mirror.installed === false) return;
			if (tl5SyncableKey(key) === false) return;
			const value = typeof rawValue === "string" ? rawValue : rawValue === null ? null : String(rawValue);
			mirror.queue.set(key, value);
			// REV-R3 M2: a fresh local edit starts a new retry budget. Without this a
			// batch that exhausted TL5_MIRROR_CONFLICT_MAX would keep the counter above
			// the limit and never auto-retry again.
			mirror.conflicts = 0;
			settingsState.pending = mirror.queue.size + mirror.inFlight;
			settingsNotify();
			if (mirror.timer !== 0) window.clearTimeout(mirror.timer);
			mirror.timer = window.setTimeout(() => {
				mirror.timer = 0;
				void settingsFlushMirror().catch((error) => note("settings:mirror", error));
			}, TL5_MIRROR_DEBOUNCE_MS);
		}

		/**
		 * 把去抖队列 PUT 给宿主。成功则采纳响应里的权威快照、更新 revision 并 BC 广播；
		 * 409（另一个窗口先写）先合并宿主快照，再把本窗口仍未被宿主接管的编辑重排进
		 * 队列、用新 revision 重试（TL5_MIRROR_CONFLICT_MAX 次，不静默覆盖他人改动）；
		 * 400/412/413（宿主拒绝本批）丢弃队列但本地值继续生效；
		 * 网络/5xx 重试 TL5_MIRROR_RETRY_MAX 次后丢弃并记录。
		 */
		async function settingsFlushMirror() {
			const mirror = settingsMirror;
			if (mirror.installed === false) return false;
			if (mirror.timer !== 0) {
				window.clearTimeout(mirror.timer);
				mirror.timer = 0;
			}
			if (mirror.queue.size === 0) return settingsState.host;
			const batch = new Map(mirror.queue);
			mirror.queue.clear();
			mirror.inFlight = batch.size;
			settingsState.pending = mirror.inFlight;
			settingsNotify();
			const payload = {};
			for (const pair of batch) payload[pair[0]] = pair[1];
			let ok = false;
			try {
				if (settingsState.hostRouteMissing === true && settingsState.host === false) {
					// 旧版本宿主没有这条路由：不再每次写入都 404，只做同浏览器多窗口同步。
					settingsPostBroadcast({ revision: settingsState.revision, settings: payload, host: false });
					ok = true;
				} else {
					const put = await settingsRequest(
						"PUT",
						{ revision: settingsState.revision, expectedRevision: settingsState.hostRevision, settings: payload },
						TL5_HOST_WRITE_TIMEOUT_MS,
					);
					if (put.ok === true) {
						ok = true;
						// The reply carries the host's merged full map: adopt it instead of
						// only raising the local counter (protocol v0.6.1).
						settingsAdoptPutResponse(put.data);
						mirror.conflicts = 0;
						settingsState.host = true;
						settingsState.hostRouteMissing = false;
						settingsState.lastError = "";
						settingsPostBroadcast({ revision: settingsState.revision, settings: payload, host: true });
					} else if (put.status === 409) {
						// Another window wrote between our last read and this PUT.
						// REV-R3 B1: the snapshot may carry the OLD host value of keys in
						// our in-flight batch (conflict from another key) — those keys are
						// protected from adoption and re-queued, so our edit is never
						// silently rolled back. Only keys the host really changed lose to
						// the host value (never overwrite the other window).
						mirror.conflicts += 1;
						settingsState.conflicts += 1;
						settingsState.host = true;
						const knownBefore = settingsState.knownRemote;
						const batchEntries = [...batch.entries()];
						const adopted = settingsAdoptPutResponse(put.data, { protectKeys: new Set(batch.keys()) });
						mirror.inFlight = 0;
						if (adopted === null) {
							// Old/malformed host answered 409 without a mergeable snapshot:
							// keep the local values and let a later sync retry.
							settingsReapplyBatch(batchEntries);
						} else {
							settingsResolveConflictBatch(batchEntries, adopted, knownBefore);
						}
						// Only an actually pending retry is an error state; a conflict fully
						// resolved in the host's favour is consistent again.
						settingsState.lastError = mirror.queue.size > 0 ? "host:conflict" : "";
						if (mirror.conflicts <= TL5_MIRROR_CONFLICT_MAX && mirror.queue.size > 0 && mirror.timer === 0) {
							mirror.timer = window.setTimeout(() => {
								mirror.timer = 0;
								void settingsFlushMirror().catch((error) => note("settings:mirror-conflict", error));
							}, TL5_MIRROR_DEBOUNCE_MS);
						}
						settingsNotify();
						return false;
					} else {
						settingsState.lastError = put.error;
						if (put.status === 404 || put.status === 405 || put.status === 501) {
							settingsState.host = false;
							settingsState.hostRouteMissing = true;
						} else if (put.status === 400 || put.status === 412 || put.status === 413) {
							// 宿主拒绝（键前缀/大小/版本冲突）：丢弃本批，本地值仍然生效。
							settingsState.host = true;
						} else if (mirror.retries < TL5_MIRROR_RETRY_MAX) {
							mirror.retries += 1;
							for (const pair of batch) {
								if (mirror.queue.has(pair[0]) === false) mirror.queue.set(pair[0], pair[1]);
							}
							mirror.inFlight = 0;
							settingsState.pending = mirror.queue.size;
							if (mirror.timer === 0) {
								mirror.timer = window.setTimeout(() => {
									mirror.timer = 0;
									void settingsFlushMirror().catch((error) => note("settings:mirror-retry", error));
								}, TL5_MIRROR_RETRY_MS);
							}
							settingsNotify();
							return false;
						}
					}
				}
			} catch (error) {
				settingsState.lastError = "sync:exception";
				note("settings:mirror", error);
			}
			mirror.inFlight = 0;
			mirror.retries = 0;
			settingsState.pending = mirror.queue.size;
			settingsNotify();
			return ok;
		}

		/* ---- 被补丁的 localStorage 方法（模块级，便于 dispose 后仍能安全转发） ---- */
		function patchedStorageSetItem(key, value) {
			const mirror = settingsMirror;
			const original = mirror.originalSet;
			const result = typeof original === "function" ? original.call(this, key, value) : undefined;
			if (mirror.installed === true && this === mirror.storage && settingsSuppressMirror === false) queueSettingsMirror(key, value);
			return result;
		}

		function patchedStorageRemoveItem(key) {
			const mirror = settingsMirror;
			const original = mirror.originalRemove;
			const result = typeof original === "function" ? original.call(this, key) : undefined;
			if (mirror.installed === true && this === mirror.storage && settingsSuppressMirror === false) queueSettingsMirror(key, null);
			return result;
		}

		/**
		 * 把“片段加载期就同步读过 localStorage”的两个消费者对齐一次。
		 *
		 * 本片段的迁移/宿主导入都发生在 apply() 里，而 11-platform.js 的模块状态、
		 * 13-i18n.js 的语言模式是在 bundle 求值时读取的；不对齐的话，宿主刚导入的
		 * 值要等下一次刷新才生效。这里只碰有公共控制器的两处（模块开关 / 语言），
		 * effects/context/legibility 的缓存属于各自片段的 install 期，不在本文件处理。
		 * 读取值与缓存一致时不产生任何写入；写入用 settingsSuppressMirror 抑制镜像，
		 * 避免“把刚导入的值又 PUT 回宿主”造成 revision 空转。
		 */
		function reconcileSettingsConsumers(keys) {
			if (Array.isArray(keys) === false || keys.length === 0) return;
			const storage = tl5Storage();
			if (storage === null) return;
			try {
				settingsSuppressMirror = true;
				if (keys.indexOf("tianlight.modules") >= 0) {
					try {
						const raw = storage.getItem("tianlight.modules");
						const parsed = raw === null || raw === "" ? null : JSON.parse(raw);
						if (tl5IsPlainObject(parsed)) {
							for (const def of MODULE_DEFS) {
								if (def.switchable === false) continue;
								if (parsed[def.id] === undefined) continue;
								if (parsed[def.id] === moduleController.isEnabled(def.id)) continue;
								moduleController.set(def.id, parsed[def.id] === true);
							}
						}
					} catch (error) {
						note("settings:reconcile-modules", error);
					}
				}
				if (keys.indexOf("tianlight.language") >= 0) {
					try {
						const raw = storage.getItem("tianlight.language");
						const mode = typeof raw === "string" ? raw : "";
						if (TL5_LANGUAGE_MODES.indexOf(mode) >= 0 && tl5Language().mode !== mode) setTl5Language(mode);
					} catch (error) {
						note("settings:reconcile-language", error);
					}
				}
			} finally {
				settingsSuppressMirror = false;
			}
		}

		/**
		 * 安装镜像层（always-on effect）。返回幂等 disposer：
		 *   还原 localStorage.setItem/removeItem、关闭 BroadcastChannel、
		 *   移除 window storage 监听、清掉去抖/重试定时器与待发送队列。
		 */
		function installSettingsRuntime(body) {
			registerSchemaStrings();
			if (settingsMirror.installed === true) return () => {};
			const storage = tl5Storage();
			if (storage === null) {
				if (settingsState.lastError === "") settingsState.lastError = "storage:blocked";
				settingsNotify();
				return () => {};
			}
			const originalSet = storage.setItem;
			const originalRemove = storage.removeItem;
			if (typeof originalSet !== "function" || typeof originalRemove !== "function") return () => {};
			settingsMirror.originalSet = originalSet;
			settingsMirror.originalRemove = originalRemove;
			settingsMirror.storage = storage;
			settingsMirror.eventTarget = body !== null && body !== undefined ? body : null;
			// 优先给 localStorage 实例自身定义属性（只影响本实例、可完全还原且不污染
			// Storage.prototype）；个别环境不允许时退回原型补丁，并用 this 判断作用域。
			let patchMode = "none";
			let ownSet = null;
			let ownRemove = null;
			let prototype = null;
			let protoSet = null;
			let protoRemove = null;
			try {
				ownSet = Object.getOwnPropertyDescriptor(storage, "setItem");
				ownRemove = Object.getOwnPropertyDescriptor(storage, "removeItem");
				Object.defineProperty(storage, "setItem", { configurable: true, writable: true, value: patchedStorageSetItem });
				Object.defineProperty(storage, "removeItem", { configurable: true, writable: true, value: patchedStorageRemoveItem });
				patchMode = "instance";
			} catch (error) {
				// 实例补丁只成功了一半时先回滚，再退回原型补丁（避免留下半补丁状态）。
				try {
					if (ownSet !== undefined && ownSet !== null) Object.defineProperty(storage, "setItem", ownSet);
					else delete storage.setItem;
					if (ownRemove !== undefined && ownRemove !== null) Object.defineProperty(storage, "removeItem", ownRemove);
					else delete storage.removeItem;
				} catch {
					// best effort: 原型补丁仍能接管，restore() 只还原原型
				}
				patchMode = "prototype";
			}
			if (patchMode === "prototype") {
				try {
					prototype = Object.getPrototypeOf(storage);
					if (prototype === null || prototype === undefined) {
						settingsMirror.storage = null;
						settingsMirror.originalSet = null;
						settingsMirror.originalRemove = null;
						return () => {};
					}
					protoSet = Object.getOwnPropertyDescriptor(prototype, "setItem");
					protoRemove = Object.getOwnPropertyDescriptor(prototype, "removeItem");
					prototype.setItem = patchedStorageSetItem;
					prototype.removeItem = patchedStorageRemoveItem;
				} catch (error) {
					note("settings:patch-storage", error);
					settingsMirror.storage = null;
					settingsMirror.originalSet = null;
					settingsMirror.originalRemove = null;
					return () => {};
				}
			}
			settingsMirror.restore = () => {
				try {
					if (patchMode === "instance") {
						if (ownSet !== undefined && ownSet !== null) Object.defineProperty(storage, "setItem", ownSet);
						else delete storage.setItem;
						if (ownRemove !== undefined && ownRemove !== null) Object.defineProperty(storage, "removeItem", ownRemove);
						else delete storage.removeItem;
					} else if (prototype !== null) {
						if (protoSet !== undefined && protoSet !== null) Object.defineProperty(prototype, "setItem", protoSet);
						else delete prototype.setItem;
						if (protoRemove !== undefined && protoRemove !== null) Object.defineProperty(prototype, "removeItem", protoRemove);
						else delete prototype.removeItem;
					}
				} catch (error) {
					note("settings:unpatch-storage", error);
				}
			};
			settingsMirror.installed = true;
			settingsMirror.onStorage = (event) => {
				try {
					settingsOnStorage(event);
				} catch (error) {
					note("settings:storage-event", error);
				}
			};
			window.addEventListener("storage", settingsMirror.onStorage);
			try {
				if (typeof BroadcastChannel === "function") {
					settingsMirror.channel = new BroadcastChannel(TL5_BC_NAME);
					settingsMirror.onChannelMessage = (event) => {
						try {
							settingsOnBroadcast(event);
						} catch (error) {
							note("settings:broadcast", error);
						}
					};
					settingsMirror.channel.addEventListener("message", settingsMirror.onChannelMessage);
				}
			} catch (error) {
				settingsMirror.channel = null;
				settingsMirror.onChannelMessage = null;
				note("settings:broadcast-open", error);
			}
			// 备份可能是在 bootstrap（镜像安装前）写下的；安装时刷新一次面板按钮状态。
			tl5RefreshBackupFlag();
			settingsNotify();
			return () => {
				if (settingsMirror.installed === false) return;
				settingsMirror.installed = false;
				if (settingsMirror.timer !== 0) {
					window.clearTimeout(settingsMirror.timer);
					settingsMirror.timer = 0;
				}
				settingsMirror.queue.clear();
				settingsMirror.inFlight = 0;
				settingsMirror.conflicts = 0;
				settingsState.pending = 0;
				// REV-R3: a re-installed runtime must not compare a 409 against a stale
				// snapshot from the previous page session.
				settingsState.knownRemote = null;
				if (settingsMirror.onStorage !== null) {
					window.removeEventListener("storage", settingsMirror.onStorage);
					settingsMirror.onStorage = null;
				}
				if (settingsMirror.channel !== null) {
					try {
						if (settingsMirror.onChannelMessage !== null) {
							settingsMirror.channel.removeEventListener("message", settingsMirror.onChannelMessage);
						}
					} catch (error) {
						note("settings:broadcast-off", error);
					}
					try {
						settingsMirror.channel.close();
					} catch (error) {
						note("settings:broadcast-close", error);
					}
					settingsMirror.channel = null;
				}
				settingsMirror.onChannelMessage = null;
				if (typeof settingsMirror.restore === "function") {
					settingsMirror.restore();
					settingsMirror.restore = null;
				}
				settingsMirror.storage = null;
				settingsMirror.originalSet = null;
				settingsMirror.originalRemove = null;
				settingsMirror.eventTarget = null;
				settingsNotify();
			};
		}

		/** 立即同步：先把待发送队列推出去，再跑一轮完整 bootstrap；返回是否成功。 */
		async function settingsForceSync() {
			try {
				await settingsFlushMirror();
				await settingsBootstrap();
				// bootstrap 的 push 是直连 PUT；这里再兜一次队列（例如恢复备份后排队写入）。
				await settingsFlushMirror();
				const ok = settingsState.host === true && settingsState.lastError === "";
				tl5Diag("settings", { forceSync: ok, at: Date.now() });
				settingsNotify();
				return ok;
			} catch (error) {
				note("settings:force-sync", error);
				settingsState.lastError = "sync:exception";
				settingsNotify();
				return false;
			}
		}

		/**
		 * 把 tianlight.backup.host（宿主导入前的本地设置）写回本地并推给宿主。
		 * 正常路径：镜像层已安装 → 用 localStorage.setItem 走正常去抖镜像，随后
		 * 立即 flush 一次，让“恢复”马上同步到宿主；备份键本身保留，可再次恢复。
		 * 返回 Promise<boolean>（存在备份并完成恢复尝试为 true）；恢复键数写入
		 * settingsState.recovered，面板据此显示“已恢复 N 项”。
		 */
		async function settingsRecoverBackup() {
			const storage = tl5Storage();
			if (storage === null) return false;
			let map = null;
			try {
				const raw = storage.getItem(TL5_HOST_BACKUP_KEY);
				if (raw === null || raw === "") return false;
				const parsed = JSON.parse(raw);
				if (tl5IsPlainObject(parsed)) map = parsed;
			} catch (error) {
				note("settings:recover-read", error);
				return false;
			}
			if (map === null) return false;
			const restoredKeys = [];
			try {
				for (const key of Object.keys(map)) {
					if (tl5SyncableKey(key) === false) continue;
					const value = map[key];
					if (typeof value !== "string") continue;
					let current = null;
					try {
						current = storage.getItem(key);
					} catch {
						continue;
					}
					if (current === value) continue;
					try {
						// 已安装镜像时走补丁后的 setItem（自动排队推送）；否则绕过镜像直接写。
						if (settingsMirror.installed === true) storage.setItem(key, value);
						else tl5RawSet(storage, key, value);
						restoredKeys.push(key);
					} catch (error) {
						note("settings:recover-write", { key, error });
					}
				}
				settingsState.recovered = restoredKeys.length;
				if (restoredKeys.length > 0) {
					if (settingsMirror.installed === true) {
						await settingsFlushMirror();
					} else {
						const payload = {};
						for (const key of restoredKeys) payload[key] = map[key];
						const sendRecover = () =>
							settingsRequest(
								"PUT",
								{ revision: settingsState.revision, expectedRevision: settingsState.hostRevision, settings: payload },
								TL5_HOST_WRITE_TIMEOUT_MS,
							);
						let recoverPut = await sendRecover();
						if (recoverPut.ok === false && recoverPut.status === 409) {
							// Explicit user action (restore): merge the other window's state,
							// then re-assert the backup values on top and retry once.
							settingsAdoptPutResponse(recoverPut.data);
							settingsState.conflicts += 1;
							recoverPut = await sendRecover();
						}
						if (recoverPut.ok === true) settingsAdoptPutResponse(recoverPut.data);
					}
					dispatchSettingsEvent("recover", restoredKeys);
				}
				tl5Diag("settings", { recovered: restoredKeys.length, at: Date.now() });
				settingsNotify();
				return true;
			} catch (error) {
				note("settings:recover", error);
				return false;
			}
		}

		const settingsStore = {
			status: () => settingsStatus(),
			bootstrap: async () => {
				try {
					await settingsBootstrap();
				} catch (error) {
					note("settings:bootstrap", error);
					settingsState.lastError = "bootstrap:exception";
					settingsNotify();
				}
			},
			forceSync: async () => {
				try {
					return await settingsForceSync();
				} catch (error) {
					note("settings:force-sync", error);
					return false;
				}
			},
			recoverBackup: async () => {
				try {
					return await settingsRecoverBackup();
				} catch (error) {
					note("settings:recover", error);
					return false;
				}
			},
			subscribe: (listener) => {
				if (typeof listener !== "function") return () => {};
				settingsSubscribers.add(listener);
				return () => settingsSubscribers.delete(listener);
			},
		};

		/**
		 * apply() 里 await 的入口：注册文案 → 迁移 → 接管宿主配置 → 记诊断。
		 * 每一步单独兜底，绝不抛出（否则会把插件 fibre 标记为失败）。
		 */
		async function bootstrapSettingsRuntime(body) {
			registerSchemaStrings();
			try {
				schemaRuntime.migrate();
			} catch (error) {
				note("settings:migrate", error);
			}
			try {
				await settingsStore.bootstrap();
			} catch (error) {
				note("settings:bootstrap", error);
			}
			// 迁移（schema 归一化）也可能改变模块/语言缓存值；这里兜一次底。
			try {
				reconcileSettingsConsumers(["tianlight.modules", "tianlight.language"]);
			} catch (error) {
				note("settings:reconcile", error);
			}
			try {
				tl5Diag("settings", settingsStatus());
			} catch {
				// diagnostics must never break apply
			}
			return body;
		}

		/* ================= E4：工程面板分区 =================
		 * 只注册一个分区（id "engineering"，order 700）。根节点沿用壁纸面板的
		 * <details class="tl-wall-group"> + groupSummary 视觉语言，内容全部只读或
		 * 走公共控制器（moduleController / settingsStore / subscribeTl5Metrics）。 */

		function tl5ModuleLabel(def) {
			const text = TL_T(def.labelKey);
			return text === def.labelKey && typeof def.fallback === "string" ? def.fallback : text;
		}

		function tl5ModuleDesc(def) {
			const text = TL_T(def.descKey);
			return text === def.descKey ? "" : text;
		}

		function EngineeringPanelSection() {
			// 语言变化时 useTl5I18n 会让本组件重渲染；mode/setLanguage 同时用于语言开关。
			const i18n = useTl5I18n();
			const t = i18n.t;
			const mode = i18n.mode;
			const setLanguage = i18n.setLanguage;
			const [status, setStatus] = React.useState(() => settingsStore.status());
			const [metrics, setMetrics] = React.useState(() => ({ ...TL5_METRICS }));
			const [modules, setModules] = React.useState(() => moduleController.list());
			const [busy, setBusy] = React.useState(false);
			const [recoverBusy, setRecoverBusy] = React.useState(false);
			/** 最近一次“恢复宿主导入前备份”的结果（transient：仅在本次面板挂载内显示）。 */
			const [recoverNote, setRecoverNote] = React.useState("");
			React.useEffect(() => settingsStore.subscribe((next) => setStatus(next)), []);
			React.useEffect(() => subscribeTl5Metrics((next) => setMetrics({ ...next })), []);
			React.useEffect(() => moduleController.subscribe(() => setModules(moduleController.list())), []);

			const schema = schemaRuntime.report();
			const summaryValue = status.host
				? (status.pending > 0 ? t("settings.pending") : t("settings.synced")) + " · v" + status.revision
				: t("settings.offline");

			const renderRows = (rows) => {
				const children = [];
				for (const row of rows) {
					children.push(React.createElement("span", { key: "k-" + row.label, className: "tl5-eng-key" }, row.label));
					children.push(
						React.createElement("span", { key: "v-" + row.label, className: "tl5-eng-value", "data-tone": row.tone, title: row.value }, row.value),
					);
				}
				return React.createElement("div", { className: "tl5-eng-grid" }, children);
			};

			const onForceSync = () => {
				if (busy) return;
				setBusy(true);
				settingsStore
					.forceSync()
					.then((ok) => {
						setBusy(false);
						setStatus(settingsStore.status());
						if (ok === false) note("settings:force-sync-failed", settingsStore.status().lastError);
					})
					.catch((error) => {
						setBusy(false);
						note("settings:force-sync", error);
					});
			};

			/** 恢复宿主导入前的本地备份（v0.5.2 数据安全）：写回本地并立即推宿主。 */
			const onRecover = () => {
				if (recoverBusy || busy) return;
				if (settingsStore.status().backup !== true) {
					setRecoverNote(t("settings.recoverEmpty"));
					return;
				}
				setRecoverBusy(true);
				setRecoverNote("");
				settingsStore
					.recoverBackup()
					.then((ok) => {
						setRecoverBusy(false);
						const next = settingsStore.status();
						setStatus(next);
						setRecoverNote(ok ? t("settings.recovered", { n: next.recovered }) : t("settings.recoverEmpty"));
					})
					.catch((error) => {
						setRecoverBusy(false);
						setRecoverNote(t("common.failed"));
						note("settings:recover", error);
					});
			};

			const toggleModule = (id) => {
				const def = moduleController.list().find((entry) => entry.id === id);
				if (def === undefined) return;
				moduleController.set(id, def.enabled === false);
				setModules(moduleController.list());
			};

			const effects = tl5IsPlainObject(metrics.effects) ? metrics.effects : { active: 0, fps: 0, budget: "auto" };
			const cacheTotal = Number(metrics.cacheHit) + Number(metrics.cacheMiss);
			const metricsFresh = Number(metrics.updatedAt) > 0;

			let instance = null;
			let runtimeModules = null;
			try {
				instance = globalThis.__dshTianlightInstance ?? null;
				if (instance !== null && typeof instance.modules === "function") runtimeModules = instance.modules();
			} catch {
				instance = null;
				runtimeModules = null;
			}
			let runtimeModuleCount = t("settings.none");
			if (runtimeModules !== null && Array.isArray(runtimeModules.active) && Array.isArray(runtimeModules.definitions)) {
				runtimeModuleCount = runtimeModules.active.length + " / " + runtimeModules.definitions.length;
			}

			const languageButton = (id, label) =>
				React.createElement(
					"button",
					{
						key: id,
						type: "button",
						className: "tl-font-option",
						"data-active": mode === id ? "" : undefined,
						"aria-pressed": mode === id ? "true" : "false",
						onClick: () => setLanguage(id),
					},
					label,
				);
			// 完整字面量 key（不做 "lang." + id 拼接），i18n 静态自检才能看见它们。
			const languageRow = [
				languageButton("auto", t("lang.auto")),
				languageButton("zh", t("lang.zh")),
				languageButton("en", t("lang.en")),
			];

			const moduleRows = modules.map((def) =>
				React.createElement(
					"div",
					{ key: def.id, className: "tl5-eng-module" },
					React.createElement("span", { className: "tl5-eng-module-label", title: tl5ModuleDesc(def) }, tl5ModuleLabel(def)),
					def.switchable === false
						? React.createElement(
								"button",
								{ type: "button", className: "tl-font-option", disabled: true, "data-tl-disabled": "" },
								t("settings.resident"),
							)
						: React.createElement(
								"button",
								{
									type: "button",
									className: "tl-font-option",
									"data-active": def.enabled ? "" : undefined,
									"aria-pressed": def.enabled ? "true" : "false",
									onClick: () => toggleModule(def.id),
								},
								def.enabled ? t("common.on") : t("common.off"),
							),
				),
			);

			const migrationValue = schema.migrated.length > 0 ? schema.migrated.join(", ") : t("settings.nothing");
			const failedValue = schema.failed.length > 0 ? schema.failed.join(", ") : t("settings.none");

			return React.createElement(
				"details",
				{ className: "tl-wall-group", "data-tl-group": "engineering", open: false },
				React.createElement(
					"summary",
					{ className: "tl-wall-group-summary" },
					React.createElement("span", { className: "tl-wall-step" }, "⑦"),
					React.createElement("span", { className: "tl-wall-group-title" }, t("section.engineering")),
					React.createElement("span", { className: "tl-wall-summary-value", title: t("section.engineeringHint") }, summaryValue),
				),
				React.createElement(
					"div",
					{ className: "tl5-eng" },
					// ---- 语言 ----
					React.createElement(
						"div",
						{ className: "tl5-eng-block" },
						React.createElement("p", { className: "tl5-eng-label" }, t("lang.title")),
						React.createElement("div", { className: "tl-font-options" }, languageRow),
						React.createElement("p", { className: "tl-wall-hint" }, t("lang.hint")),
					),
					// ---- 宿主设置同步 ----
					React.createElement(
						"div",
						{ className: "tl5-eng-block" },
						React.createElement("p", { className: "tl5-eng-label" }, t("settings.title")),
						renderRows([
							{
								label: t("settings.host"),
								value: status.host ? t("settings.available") : t("settings.unavailable"),
								tone: status.host ? undefined : "warn",
							},
							{ label: t("settings.revision"), value: "v" + status.revision },
							{ label: t("settings.pending"), value: String(status.pending) },
							{ label: t("settings.backup"), value: status.backup ? t("settings.available") : t("settings.none") },
							{ label: t("settings.lastError"), value: status.lastError === "" ? t("settings.none") : status.lastError, tone: status.lastError === "" ? undefined : "alert" },
						]),
						React.createElement(
							"div",
							{ className: "tl-wall-tabs" },
							React.createElement(
								"button",
								{
									type: "button",
									className: "tl-font-option",
									disabled: busy || recoverBusy,
									onClick: onForceSync,
									"data-tone": status.lastError === "" ? undefined : "warn",
								},
								busy ? t("settings.syncing") : t("settings.force"),
							),
							// v0.5.2 数据安全：宿主快照是子集时本地键不删；若导入确实改过值，
							// 这里可以一键恢复“导入前”的本地设置。
							React.createElement(
								"button",
								{
									type: "button",
									className: "tl-font-option",
									disabled: busy || recoverBusy || status.backup !== true,
									"data-tone": status.backup ? "warn" : undefined,
									onClick: onRecover,
								},
								recoverBusy ? t("settings.syncing") : t("settings.recoverBackup"),
							),
						),
						React.createElement(
							"p",
							{ className: "tl-wall-hint" },
							recoverNote !== "" ? recoverNote : status.host ? t("settings.synced") : t("settings.offline") + " " + t("settings.syncHint"),
						),
					),
					// ---- schema 迁移 ----
					React.createElement(
						"div",
						{ className: "tl5-eng-block" },
						React.createElement("p", { className: "tl5-eng-label" }, t("settings.migrateTitle")),
						renderRows([
							{
								label: t("settings.schemaVersion"),
								value: t("settings.schemaFromTo", { from: schema.from, to: schema.to }),
							},
							{ label: t("settings.migrated"), value: migrationValue },
							{ label: t("common.failed"), value: failedValue, tone: schema.failed.length > 0 ? "alert" : undefined },
						]),
						React.createElement("p", { className: "tl-wall-hint" }, t("settings.migrateHint")),
					),
					// ---- 模块开关 ----
					React.createElement(
						"div",
						{ className: "tl5-eng-block" },
						React.createElement("p", { className: "tl5-eng-label" }, t("settings.modules")),
						React.createElement("div", { className: "tl5-eng-modules" }, moduleRows),
						React.createElement("p", { className: "tl-wall-hint" }, t("settings.modulesHint")),
					),
					// ---- 渲染预算（只读） ----
					React.createElement(
						"div",
						{ className: "tl5-eng-block" },
						React.createElement("p", { className: "tl5-eng-label" }, t("settings.budget")),
						renderRows([
							{ label: t("settings.fps"), value: metricsFresh ? Math.round(Number(metrics.fps) || 0) + " fps" : t("settings.none") },
							{ label: t("settings.jitter"), value: metricsFresh ? Math.round(Number(metrics.jitter) || 0) + " ms" : t("settings.none") },
							{ label: t("settings.tier"), value: String(metrics.tier ?? "auto") },
							{
								label: t("settings.lowPower"),
								value: metrics.lowPower
									? t("common.on") + (typeof metrics.lowPowerReason === "string" && metrics.lowPowerReason !== "" ? " · " + metrics.lowPowerReason : "")
									: t("common.off"),
								tone: metrics.lowPower ? "warn" : undefined,
							},
							{ label: t("settings.cache"), value: Number(metrics.cacheHit) + " / " + Number(metrics.cacheMiss) },
							{ label: t("settings.cacheRate"), value: cacheTotal > 0 ? Math.round((Number(metrics.cacheHit) / cacheTotal) * 100) + "%" : t("settings.none") },
							{
								label: t("settings.effectsLayer"),
								value: Number(effects.active) + " · " + Math.round(Number(effects.fps) || 0) + " fps · " + String(effects.budget ?? "auto"),
							},
							{ label: t("settings.updated"), value: metricsFresh ? new Date(Number(metrics.updatedAt)).toLocaleTimeString() : t("settings.none") },
						]),
						React.createElement("p", { className: "tl-wall-hint" }, t("settings.budgetHint")),
					),
					// ---- 诊断 ----
					React.createElement(
						"div",
						{ className: "tl5-eng-block" },
						React.createElement("p", { className: "tl5-eng-label" }, t("settings.diag")),
						renderRows([
							{ label: t("settings.capabilityHost"), value: status.host ? t("settings.available") : t("settings.unavailable") },
							{ label: t("settings.capabilityRuntime"), value: instance === null ? t("settings.unavailable") : t("settings.available") },
							{ label: t("settings.activeModules"), value: runtimeModuleCount },
							{ label: t("settings.revision"), value: "v" + status.revision },
							{ label: t("settings.lastError"), value: status.lastError === "" ? t("settings.none") : status.lastError, tone: status.lastError === "" ? undefined : "alert" },
						]),
						React.createElement("p", { className: "tl-wall-hint" }, t("settings.diagHint")),
					),
				),
			);
		}

		// 唯一的分区注册：order 700 排在壁纸面板 ①–⑥ 之后（其他功能分区 800+）。
		registerTl5PanelSection({ id: "engineering", order: 700, title: "section.engineering", Component: EngineeringPanelSection });

		/** 工程分区样式（tl5-eng-*）。全部作用域在 body[data-dsh-tianlight] 下。 */
		registerTl5Css(String.raw`
	body[data-dsh-tianlight] .tl5-eng {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	body[data-dsh-tianlight] .tl5-eng-block {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	body[data-dsh-tianlight] .tl5-eng-label {
		margin: 0;
		font-size: 10px;
		font-weight: 600;
		letter-spacing: 0.06em;
		color: var(--tl-ink-faint);
	}
	body[data-dsh-tianlight] .tl5-eng-grid {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 2px 10px;
		font-size: 11px;
	}
	body[data-dsh-tianlight] .tl5-eng-key {
		color: var(--tl-ink-soft);
		white-space: nowrap;
	}
	body[data-dsh-tianlight] .tl5-eng-value {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		text-align: right;
		color: var(--tl-ink);
		font-variant-numeric: tabular-nums;
	}
	body[data-dsh-tianlight] .tl5-eng-value[data-tone="warn"] {
		color: color-mix(in srgb, #e8b45a 82%, var(--tl-ink));
	}
	body[data-dsh-tianlight] .tl5-eng-value[data-tone="alert"] {
		color: color-mix(in srgb, #e8776b 82%, var(--tl-ink));
	}
	body[data-dsh-tianlight] .tl5-eng-modules {
		display: flex;
		flex-direction: column;
		gap: 3px;
	}
	body[data-dsh-tianlight] .tl5-eng-module {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 12px;
		color: var(--tl-ink);
	}
	body[data-dsh-tianlight] .tl5-eng-module-label {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		color: var(--tl-ink-soft);
	}
	body[data-dsh-tianlight] .tl5-eng-module > button {
		flex: none;
		min-width: 44px;
		padding: 2px 10px;
		font-size: 11px;
	}
`);
		//#endregion
