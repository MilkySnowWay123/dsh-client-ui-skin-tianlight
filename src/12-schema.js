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
		 * Author default appearance (v2.0.1): exported from the author's live settings and
		 * filtered to appearance keys only (see presets/tianlight-default.json, which
		 * tools/test.mjs keeps identical to this constant). Applied ONLY on a fresh install
		 * with no saved settings; existing user settings are never overwritten. The hub's
		 * "restore default appearance" button reuses the same map.
		 */
		const TL5_DEFAULT_APPEARANCE_JSON = String.raw`{"tianlight.wallpaper":"{\"kind\":\"video\",\"url\":\"/skin-tianlight/bg-4k.mp4\"}","tianlight.zones":"{\"separate\":false,\"main\":{\"fit\":\"cover\",\"fx\":38,\"fy\":50,\"dim\":0,\"blur\":0,\"ratio\":\"auto\",\"zoom\":100,\"cx\":50,\"cy\":50},\"rail\":{\"fit\":\"cover\",\"fx\":50,\"fy\":50,\"dim\":16,\"blur\":0,\"url\":\"\",\"kind\":\"video\"}}","tianlight.layers":"{\"version\":2,\"slots\":[{\"kind\":\"preset\",\"preset\":\"vignette\",\"url\":\"\",\"fit\":\"cover\",\"opacity\":0.08,\"blend\":\"normal\"},{\"kind\":\"none\",\"preset\":\"none\",\"url\":\"\",\"fit\":\"cover\",\"opacity\":0,\"blend\":\"normal\"}]}","tianlight.glass":"0.98","tianlight.glassDepth":"off","tianlight.glassLive":"0","tianlight.font.family":"{\"size\":14,\"ui\":\"system\",\"code\":\"system\",\"weight\":\"normal\",\"lead\":\"normal\",\"track\":\"normal\"}","tianlight.effects":"{\"enabled\":true,\"parallax\":false,\"parallaxStrength\":0.4,\"click\":false,\"clickStyle\":\"ripple\",\"ambience\":\"none\",\"ambienceDensity\":0.5,\"transition\":\"fade\",\"transitionMs\":600,\"budget\":\"auto\"}","tianlight.context":"{\"enabled\":true,\"timeOfDay\":false,\"manualPeriod\":\"auto\",\"focusLink\":false,\"focusDim\":40,\"focusBlur\":6,\"adaptive\":true,\"adaptiveLocked\":false}","tianlight.legibility":"{\"enabled\":true,\"threshold\":4.5,\"boost\":0.12}","tianlight.playback":"{\"speed\":1,\"flip\":false,\"paused\":false,\"filter\":{\"on\":false,\"brightness\":100,\"contrast\":100,\"saturate\":100}}","tianlight.petMedia.v1":null}`;

		/** Parsed author default appearance map (raw host-compatible setting values). */
		function tl5DefaultAppearance() {
			try {
				const parsed = JSON.parse(TL5_DEFAULT_APPEARANCE_JSON);
				return tl5IsPlainObject(parsed) ? parsed : null;
			} catch {
				return null;
			}
		}

		/**
		 * Write the author default appearance into localStorage. Callers decide whether this
		 * is allowed (fresh install / explicit hub reset); this helper only writes and never
		 * deletes user data outside its own appearance keys. Returns keys actually changed.
		 */
		function tl5ApplyDefaultAppearance() {
			const storage = tl5Storage();
			const defaults = tl5DefaultAppearance();
			if (storage === null || defaults === null) return 0;
			let written = 0;
			for (const key of Object.keys(defaults)) {
				const raw = defaults[key];
				try {
					if (raw === null) {
						if (storage.getItem(key) !== null) {
							storage.removeItem(key);
							written += 1;
						}
					} else if (storage.getItem(key) !== raw) {
						storage.setItem(key, raw);
						written += 1;
					}
				} catch {
					// a blocked key must not stop the rest
				}
			}
			return written;
		}
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
			// v2.2.12: 天气读数（last/lastError/fetchedAt/route）只属于写出它的浏览器。
			// 和配置分开存，宿主 map 再新也盖不回旧报错，手动刷新也不再抬 revision。
			"tianlight.weather.cache",
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

		//#endregion
