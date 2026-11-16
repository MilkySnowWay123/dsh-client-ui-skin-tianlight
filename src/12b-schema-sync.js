		//#region schema
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
			// v2.0.1: the author default appearance is applied only when nothing was ever
			// saved (local cache empty AND the host has no values). Remember the pre-state
			// before any write, because the default write itself makes local non-empty.
			const localKeysAtBootstrap = Object.keys(collectLocalSettings());
			let defaultKeysWritten = 0;
			// v2.0.1: a cold page can boot before the host half finishes binding its routes;
			// the first GET then answers with the SPA HTML (or 404) instead of JSON. Retry a
			// few times before degrading to local-only — otherwise the fresh-install defaults
			// would stay local for the whole session and never reach the host mirror.
			let result = null;
			let bootstrapAttempts = 0;
			for (let attempt = 0; attempt < 4; attempt += 1) {
				bootstrapAttempts += 1;
				result = await settingsRequest("GET", undefined, TL5_HOST_TIMEOUT_MS);
				if (result.ok === true) break;
				const transient =
					result.error === "host:bad-json" ||
					result.error === "host:network" ||
					result.status === 404 ||
					result.status === 405 ||
					result.status === 501;
				if (transient === false) break;
				if (attempt < 3) await new Promise((resolve) => window.setTimeout(resolve, 300 * (attempt + 1)));
			}
			if (result.ok === false) {
				settingsState.host = false;
				settingsState.lastError = result.error;
				settingsState.hostRouteMissing = result.status === 404 || result.status === 405 || result.status === 501;
				if (localKeysAtBootstrap.length === 0) defaultKeysWritten = tl5ApplyDefaultAppearance();
				settingsSyncStats = { localKeys: Object.keys(collectLocalSettings()).length, remoteKeys: 0, pushedKeys: 0 };
				tl5Diag("settings", { ...settingsStatus(), ...settingsSyncStats, defaultKeysWritten, bootstrapAttempts });
				settingsNotify();
				return;
			}
			const remote = result.data;
			if (remote.ok === false) {
				settingsState.host = false;
				settingsState.lastError = "host:rejected";
				if (localKeysAtBootstrap.length === 0) defaultKeysWritten = tl5ApplyDefaultAppearance();
				settingsSyncStats = { localKeys: Object.keys(collectLocalSettings()).length, remoteKeys: 0, pushedKeys: 0 };
				tl5Diag("settings", { ...settingsStatus(), ...settingsSyncStats, defaultKeysWritten, bootstrapAttempts });
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
			// v2.0.1 fresh install: nothing saved locally and nothing saved on the host, so
			// seed the author default appearance before the first push below. Any existing
			// setting (local or host) keeps this from ever overwriting the user's state.
			if (Object.keys(localBefore).length === 0 && remoteHasValues === false) {
				defaultKeysWritten = tl5ApplyDefaultAppearance();
			}
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
			tl5Diag("settings", { ...settingsStatus(), ...settingsSyncStats, pushRetried: pushed.retried, defaultKeysWritten, bootstrapAttempts });
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

		//#endregion
