		//#region life rhythm
		/**
		 * v1.0.0 character life engine: "when may the character speak first?"
		 *
		 * The companion used to be a single decoration with per-tick `Math.random()`.
		 * Giving it memory, a daily rhythm and a proactive budget is only useful if the
		 * budget is legible and adjustable, so this fragment owns one persisted state
		 * object and one API:
		 *
		 *   localStorage["tianlight.life.v1"]      rhythm + memory + budget + deferred queue
		 *   localStorage["tianlight.petMedia.v1"]  selected pet media id (raw string, null = default)
		 *   globalThis.tianlightLife (version 1)   status/configure/gate/media/proactive...
		 *   companionDutyBridge.lifeGate           duty channel asks before showing an interrupt
		 *   body[data-tl-life-period/energy/pet-media]  CSS observation points
		 *
		 * Design rules (all of them are acceptance criteria):
		 *   - Every public method is fail-open, never throws. A broken storage/fetch/DOM
		 *     must degrade the character, not the page.
		 *   - The virtual clock (`virtualOffsetMinutes`) only changes the period the
		 *     character *feels*; quiet hours, sleep and the daily budget use real local
		 *     time so a demo offset can never shift the user's actual interruptions.
		 *   - Gate priority is mute > quiet-hours > asleep > budget. Critical signals
		 *     (priority >= 90 or critical === true) may bypass ONLY the budget.
		 *   - Randomness is a deterministic hash of (day, hour, tick, talks). Tests and
		 *     support can reproduce "why did it stay silent" without a seeded PRNG.
		 */
		const LIFE_VERSION = 1;
		const LIFE_STATE_KEY = "tianlight.life.v1";
		const LIFE_MEDIA_KEY = "tianlight.petMedia.v1";
		const LIFE_CHANNEL = "tianlight.life";
		const LIFE_DEFERRED_MAX = 8;
		const LIFE_MEDIA_CAP_BYTES = 32 * 1024 * 1024;
		const LIFE_PROACTIVE_GAP_MS = 30 * 60 * 1000;
		/** Percent chance per 30s tick once the 30min gap has passed. */
		const LIFE_PROACTIVE_CHANCE = 12;
		const LIFE_TICK_MS = 30000;
		const LIFE_DEFAULT_CAP = 6;
		const LIFE_BUDGET_MAX = 20;
		const LIFE_MUTE_MAX_MS = 86400000;
		const LIFE_FOCUS_MINUTES = 25;
		const LIFE_FOCUS_MAX_MINUTES = 180;
		const LIFE_SAY_HOLD_MS = 3200;
		const LIFE_PERIODS = ["dawn", "morning", "noon", "afternoon", "dusk", "evening", "night"];
		const LIFE_PERIOD_LINE = {
			dawn: "life.line.dawn",
			morning: "life.line.morning",
			noon: "life.line.noon",
			afternoon: "life.line.afternoon",
			dusk: "life.line.dusk",
			evening: "life.line.evening",
			night: "life.line.night",
		};
		const LIFE_INTERACTION_BUCKET = { pat: "pats", feed: "feeds", play: "plays", talk: "talks", ack: "acks" };
		const LIFE_DEFAULT_MEDIA = {
			id: "default",
			kind: "image",
			url: ASSET_BASE + "/cat.png",
			name: "cat.png (default)",
			bytes: null,
		};

		// The character is a quiet writing partner: short lines, no exclamation
		// stacking, and every line maps to a moment of the day or to a shared memory.
		registerTl5Strings({
			zh: {
				"life.line.dawn": "天刚亮。先喝一口水，再开始吧。",
				"life.line.morning": "上午好。今天的字，慢慢写就行。",
				"life.line.noon": "中午了。记得吃饭，别空着肚子。",
				"life.line.afternoon": "午后容易发困。我陪你安静待一会儿。",
				"life.line.dusk": "天光在收。先保存一下手上的东西吧。",
				"life.line.evening": "晚上了。今天到这里也可以。",
				"life.line.night": "夜深了。我在这儿，不吵你。",
				"life.line.longAway": "好久不见。我一直在。",
				"life.line.focus": "专注时间。我不打扰你。",
				"life.line.done": "这一段完成了。起来走两步吧。",
				"life.line.water": "该喝水了。",
			},
			en: {
				"life.line.dawn": "First light. Water first, then words.",
				"life.line.morning": "Good morning. Take today's words slowly.",
				"life.line.noon": "Noon already. Don't skip lunch.",
				"life.line.afternoon": "The afternoon drags a little. I'll keep it quiet.",
				"life.line.dusk": "The light is going. Save your work first.",
				"life.line.evening": "Evening. Stopping here is fine too.",
				"life.line.night": "Late night. I'm here, quietly.",
				"life.line.longAway": "It's been a while. I'm still here.",
				"life.line.focus": "Focus time. I won't interrupt.",
				"life.line.done": "That part is done. Stretch for a moment.",
				"life.line.water": "Time for some water.",
			},
		});

		// One engine instance per page: the state is lazily (re)read from storage, the
		// media cache is synchronously available for the companion's first render.
		let lifeState = null;
		let lifeStateSaveNoted = false;
		let lifeMediaCache = null;
		let lifeMediaSelectedId = "default";
		let lifeChannel = null;
		let lifeInstanceId = "";
		let lifeInstanceSeq = 0;

		// ---- small helpers -------------------------------------------------------
		function lifeDoc() {
			try {
				return typeof document === "undefined" || document === null ? null : document;
			} catch (error) {
				return null;
			}
		}

		function lifeNumber(value, fallback) {
			const number = Number(value);
			return Number.isFinite(number) ? number : fallback;
		}

		function lifeClamp(value, min, max) {
			return Math.min(max, Math.max(min, value));
		}

		function lifeClampInt(value, min, max, fallback) {
			const number = Number(value);
			if (Number.isFinite(number) === false) return fallback;
			return lifeClamp(Math.round(number), min, max);
		}

		function lifeNonNegativeInt(value, fallback) {
			const number = lifeNumber(value, fallback);
			if (number <= 0) return 0;
			return Math.min(9007199254740991, Math.floor(number));
		}

		function lifeTimeString(value, fallback) {
			return typeof value === "string" && /^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(value) ? value : fallback;
		}

		function lifeParseHm(value) {
			const text = lifeTimeString(value, null);
			if (text === null) return null;
			const parts = text.split(":");
			return Number(parts[0]) * 60 + Number(parts[1]);
		}

		function lifeDayKeyOf(nowInput) {
			const now = lifeNumber(nowInput, Date.now());
			const date = new Date(now);
			const month = String(date.getMonth() + 1).padStart(2, "0");
			const day = String(date.getDate()).padStart(2, "0");
			return date.getFullYear() + "-" + month + "-" + day;
		}

		function lifeValidDayKey(value) {
			if (typeof value !== "string" || /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(value) === false) return false;
			const parts = value.split("-");
			const year = Number(parts[0]);
			const month = Number(parts[1]);
			const day = Number(parts[2]);
			if (month < 1 || month > 12 || day < 1 || day > 31) return false;
			const utc = new Date(Date.UTC(year, month - 1, day));
			return utc.getUTCFullYear() === year && utc.getUTCMonth() === month - 1 && utc.getUTCDate() === day;
		}

		function lifeDayNumber(dayKey) {
			if (lifeValidDayKey(dayKey) === false) return 0;
			const parts = dayKey.split("-");
			return Math.floor(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])) / 86400000);
		}

		// ---- persisted state -----------------------------------------------------
		function lifeFreshState(nowInput) {
			const now = lifeNumber(nowInput, Date.now());
			const dayKey = lifeDayKeyOf(now);
			return {
				version: LIFE_VERSION,
				createdAt: now,
				lastSeenAt: now,
				lastTalkAt: 0,
				dayKey,
				// Day of the last counted interaction, so a streak can survive reloads.
				lastDayKey: "",
				streakDays: 0,
				memory: { interactions: 0, pats: 0, feeds: 0, plays: 0, talks: 0, acks: 0 },
				budget: { dayKey, used: 0, cap: LIFE_DEFAULT_CAP },
				quiet: { enabled: true, start: "23:00", end: "08:00" },
				wake: "08:00",
				sleep: "23:00",
				virtualOffsetMinutes: 0,
				muteUntil: 0,
				focus: { active: false, endsAt: 0, minutes: LIFE_FOCUS_MINUTES },
				deferred: [],
				recentLines: [],
			};
		}

		function lifeSanitizeDeferred(raw) {
			const list = [];
			if (Array.isArray(raw) === false) return list;
			const seen = new Set();
			for (const candidate of raw) {
				if (candidate === null || typeof candidate !== "object") continue;
				const signalId = lifeValidSignalId(candidate.signalId);
				if (signalId === null || seen.has(signalId)) continue;
				if (candidate.action === null || typeof candidate.action !== "object") continue;
				seen.add(signalId);
				list.push({
					signalId,
					action: lifeCloneAction(candidate.action),
					queuedAt: lifeNonNegativeInt(candidate.queuedAt, 0),
					priority: lifeClampInt(candidate.priority, 0, 100, 50),
					dueAt: lifeNonNegativeInt(candidate.dueAt, 0),
				});
			}
			list.sort((left, right) => right.priority - left.priority);
			return list.slice(0, LIFE_DEFERRED_MAX);
		}

		function lifeSanitizeRecentLines(raw) {
			const lines = [];
			if (Array.isArray(raw) === false) return lines;
			for (const entry of raw) {
				if (typeof entry !== "string" || entry === "" || lines.includes(entry)) continue;
				lines.push(entry);
				if (lines.length >= 3) break;
			}
			return lines;
		}

		/** Merge any persisted shape into the v1 shape; unknown/invalid fields fall back. */
		function lifeNormalizeState(raw) {
			const now = Date.now();
			const state = lifeFreshState(now);
			const value = raw !== null && typeof raw === "object" && Array.isArray(raw) === false ? raw : null;
			if (value === null) return state;
			state.version = LIFE_VERSION;
			state.createdAt = lifeNonNegativeInt(value.createdAt, state.createdAt);
			state.lastSeenAt = lifeNonNegativeInt(value.lastSeenAt, state.lastSeenAt);
			state.lastTalkAt = lifeNonNegativeInt(value.lastTalkAt, 0);
			state.dayKey = lifeValidDayKey(value.dayKey) ? value.dayKey : state.dayKey;
			state.lastDayKey = lifeValidDayKey(value.lastDayKey) ? value.lastDayKey : "";
			state.streakDays = Math.min(1000000, lifeNonNegativeInt(value.streakDays, 0));

			const memory = value.memory !== null && typeof value.memory === "object" ? value.memory : {};
			for (const key of ["interactions", "pats", "feeds", "plays", "talks", "acks"]) {
				state.memory[key] = Math.min(1000000000, lifeNonNegativeInt(memory[key], 0));
			}

			const budget = value.budget !== null && typeof value.budget === "object" ? value.budget : {};
			state.budget.cap = lifeClampInt(budget.cap, 0, LIFE_BUDGET_MAX, LIFE_DEFAULT_CAP);
			state.budget.dayKey = lifeValidDayKey(budget.dayKey) ? budget.dayKey : state.dayKey;
			state.budget.used = Math.min(1000000, lifeNonNegativeInt(budget.used, 0));

			const quiet = value.quiet !== null && typeof value.quiet === "object" ? value.quiet : {};
			state.quiet = {
				enabled: typeof quiet.enabled === "boolean" ? quiet.enabled : true,
				start: lifeTimeString(quiet.start, "23:00"),
				end: lifeTimeString(quiet.end, "08:00"),
			};
			state.wake = lifeTimeString(value.wake, "08:00");
			state.sleep = lifeTimeString(value.sleep, "23:00");
			state.virtualOffsetMinutes = lifeClampInt(value.virtualOffsetMinutes, -720, 720, 0);
			state.muteUntil = lifeNonNegativeInt(value.muteUntil, 0);

			const focus = value.focus !== null && typeof value.focus === "object" ? value.focus : {};
			state.focus = {
				active: focus.active === true,
				endsAt: lifeNonNegativeInt(focus.endsAt, 0),
				minutes: lifeClampInt(focus.minutes, 1, LIFE_FOCUS_MAX_MINUTES, LIFE_FOCUS_MINUTES),
			};
			if (state.focus.active === true && state.focus.endsAt <= 0) state.focus.active = false;

			state.deferred = lifeSanitizeDeferred(value.deferred);
			state.recentLines = lifeSanitizeRecentLines(value.recentLines);
			return state;
		}

		function lifeReadStoredState() {
			let raw = null;
			try {
				const storage = globalThis.localStorage;
				if (storage !== null && storage !== undefined && typeof storage.getItem === "function") {
					raw = storage.getItem(LIFE_STATE_KEY);
				}
			} catch (error) {
				raw = null;
			}
			let parsed = null;
			if (typeof raw === "string" && raw !== "") {
				try {
					parsed = JSON.parse(raw);
				} catch (error) {
					parsed = null;
					note("life:parse", error);
				}
			}
			return lifeNormalizeState(parsed);
		}

		/** In-memory state is the source of truth; storage failures degrade to memory only. */
		function lifeEnsureState() {
			if (lifeState === null) {
				try {
					lifeState = lifeReadStoredState();
				} catch (error) {
					note("life:state-load", error);
					lifeState = lifeFreshState(Date.now());
				}
			}
			return lifeState;
		}

		function lifeSaveState() {
			const state = lifeState;
			if (state === null) return false;
			try {
				const storage = globalThis.localStorage;
				if (storage !== null && storage !== undefined && typeof storage.setItem === "function") {
					storage.setItem(LIFE_STATE_KEY, JSON.stringify(state));
				}
			} catch (error) {
				if (lifeStateSaveNoted === false) {
					lifeStateSaveNoted = true;
					note("life:persist", error);
				}
			}
			return true;
		}

		/** Daily counters roll over at local midnight; the deferred queue spans days. */
		function lifeEnsureDay(state, nowInput) {
			const now = lifeNumber(nowInput, Date.now());
			const dayKey = lifeDayKeyOf(now);
			let changed = false;
			if (state.budget.dayKey !== dayKey) {
				state.budget.dayKey = dayKey;
				state.budget.used = 0;
				changed = true;
			}
			if (state.dayKey !== dayKey) {
				state.dayKey = dayKey;
				changed = true;
			}
			if (changed) lifeSaveState();
			return state;
		}

		// ---- clock, wake/sleep and quiet hours ----------------------------------
		/**
		 * What the character *feels* it is (virtual offset applied). Used for lines and
		 * presentation only; gating always uses real local time.
		 */
		function lifePeriod(nowInput) {
			const state = lifeEnsureState();
			const now = lifeNumber(nowInput, Date.now());
			const offset = lifeClampInt(state.virtualOffsetMinutes, -720, 720, 0);
			const date = new Date(now + offset * 60000);
			const hour = date.getHours() + date.getMinutes() / 60;
			if (hour >= 5 && hour < 8) return "dawn";
			if (hour >= 8 && hour < 11) return "morning";
			if (hour >= 11 && hour < 14) return "noon";
			if (hour >= 14 && hour < 17) return "afternoon";
			if (hour >= 17 && hour < 19) return "dusk";
			if (hour >= 19 && hour < 22) return "evening";
			return "night";
		}

		/** Awake window from wake/sleep, midnight-crossing supported (23:00 -> 08:00). */
		function lifeAwake(nowInput) {
			const state = lifeEnsureState();
			const now = lifeNumber(nowInput, Date.now());
			const wake = lifeParseHm(state.wake);
			const sleep = lifeParseHm(state.sleep);
			if (wake === null || sleep === null || wake === sleep) return true;
			const date = new Date(now);
			const minutes = date.getHours() * 60 + date.getMinutes();
			if (wake < sleep) return minutes >= wake && minutes < sleep;
			return minutes >= wake || minutes < sleep;
		}

		function lifeInQuiet(nowInput) {
			const state = lifeEnsureState();
			if (state.quiet.enabled !== true) return false;
			const start = lifeParseHm(state.quiet.start);
			const end = lifeParseHm(state.quiet.end);
			if (start === null || end === null || start === end) return false;
			const now = lifeNumber(nowInput, Date.now());
			const date = new Date(now);
			const minutes = date.getHours() * 60 + date.getMinutes();
			if (start < end) return minutes >= start && minutes < end;
			return minutes >= start || minutes < end;
		}

		/** Next occurrence of a local HH:MM clock time, strictly after `now`. */
		function lifeNextClockAt(nowInput, hhmm) {
			const now = lifeNumber(nowInput, Date.now());
			const minutes = lifeParseHm(hhmm);
			if (minutes === null) return now;
			const date = new Date(now);
			const target = new Date(date.getFullYear(), date.getMonth(), date.getDate(), Math.floor(minutes / 60), minutes % 60, 0, 0);
			if (target.getTime() <= now) target.setDate(target.getDate() + 1);
			return target.getTime();
		}

		function lifeNextWakeAt(nowInput) {
			const state = lifeEnsureState();
			return lifeNextClockAt(nowInput, state.wake);
		}

		function lifeNextQuietEndAt(nowInput) {
			const state = lifeEnsureState();
			return lifeNextClockAt(nowInput, state.quiet.end);
		}

		// ---- duty gate + deferred queue -----------------------------------------
		function lifeValidSignalId(value) {
			if (typeof value !== "string") return null;
			const trimmed = value.trim();
			if (trimmed === "" || trimmed.length > 64) return null;
			return trimmed;
		}

		function lifePriorityOf(action) {
			if (action === null || typeof action !== "object") return 50;
			const priority = Number(action.priority);
			return Number.isFinite(priority) ? lifeClamp(Math.round(priority), 0, 100) : 50;
		}

		/** Critical may bypass the daily budget only; mute/quiet/asleep still win. */
		function lifeIsCritical(action) {
			if (action === null || typeof action !== "object") return false;
			if (action.critical === true) return true;
			const priority = Number(action.priority);
			return Number.isFinite(priority) && priority >= 90;
		}

		function lifeIsInterrupt(action) {
			if (action === null || typeof action !== "object") return false;
			if (action.type === "interrupt") return true;
			return typeof action.signalId === "string" && Array.isArray(action.choices);
		}

		function lifeCloneAction(action) {
			try {
				const text = JSON.stringify(action);
				if (typeof text === "string" && text.length > 0 && text.length <= 8192) {
					const copy = JSON.parse(text);
					if (copy !== null && typeof copy === "object") return copy;
				}
			} catch (error) {
				note("life:clone-action", error);
			}
			return {
				type: typeof action.type === "string" ? action.type : "interrupt",
				signalId: typeof action.signalId === "string" ? action.signalId.slice(0, 64) : "",
				text: typeof action.text === "string" ? action.text.slice(0, 200) : "",
				choices: [],
			};
		}

		function lifeQueueDeferred(state, action, now, dueAt) {
			const signalId = lifeValidSignalId(action.signalId);
			if (signalId === null) return;
			const list = state.deferred;
			const priority = lifePriorityOf(action);
			for (const item of list) {
				if (item.signalId !== signalId) continue;
				// Deduplicate by signalId: refresh the payload and raise priority/dueAt,
				// but keep the original queue position timestamp.
				item.action = lifeCloneAction(action);
				item.priority = Math.max(item.priority, priority);
				if (Number.isFinite(dueAt) && dueAt > 0) item.dueAt = Math.floor(dueAt);
				list.sort((left, right) => right.priority - left.priority);
				lifeSaveState();
				return;
			}
			list.push({
				signalId,
				action: lifeCloneAction(action),
				queuedAt: now,
				priority,
				dueAt: Number.isFinite(dueAt) && dueAt > 0 ? Math.floor(dueAt) : 0,
			});
			list.sort((left, right) => right.priority - left.priority);
			if (list.length > LIFE_DEFERRED_MAX) list.length = LIFE_DEFERRED_MAX;
			lifeSaveState();
		}

		/**
		 * The duty channel calls this for every inbound action (v1.1 contract).
		 * Returning `{ allow: false }` means "do not show now"; interrupts are queued
		 * for `replayDue()` instead. A non-critical allowed action consumes one unit of
		 * the daily budget, which is what makes the budget a real quota.
		 */
		function lifeGate(action) {
			try {
				const state = lifeEnsureState();
				const now = Date.now();
				lifeEnsureDay(state, now);
				const interrupt = lifeIsInterrupt(action);
				const critical = lifeIsCritical(action);
				if (state.muteUntil > now) {
					const dueAt = state.muteUntil;
					if (interrupt) lifeQueueDeferred(state, action, now, dueAt);
					return { allow: false, reason: "mute", dueAt };
				}
				if (lifeInQuiet(now)) {
					const dueAt = lifeNextQuietEndAt(now);
					if (interrupt) lifeQueueDeferred(state, action, now, dueAt);
					return { allow: false, reason: "quiet-hours", dueAt };
				}
				if (lifeAwake(now) === false) {
					const dueAt = lifeNextWakeAt(now);
					if (interrupt) lifeQueueDeferred(state, action, now, dueAt);
					return { allow: false, reason: "asleep", dueAt };
				}
				if (critical === false && state.budget.used >= state.budget.cap) {
					// The quota refreshes at the wake clock, so that is when a queued
					// reminder becomes meaningful again.
					const dueAt = lifeNextWakeAt(now);
					if (interrupt) lifeQueueDeferred(state, action, now, dueAt);
					return { allow: false, reason: "budget", dueAt };
				}
				if (critical === false && action !== null && typeof action === "object") {
					state.budget.used = Math.min(state.budget.cap, state.budget.used + 1);
					lifeSaveState();
				}
				return { allow: true };
			} catch (error) {
				note("life:gate", error);
				return { allow: false, reason: "internal-error" };
			}
		}

		/**
		 * Replay deferred interrupts whose window has arrived. Items without a dueAt
		 * are treated as immediately due. The queue is trimmed BEFORE the calls so a
		 * replay that synchronously re-queues a duplicate cannot loop forever.
		 */
		function lifeReplayDue(nowInput) {
			try {
				const state = lifeEnsureState();
				const now = lifeNumber(nowInput, Date.now());
				const deferred = state.deferred;
				if (deferred.length === 0) return { replayed: 0 };
				const due = [];
				const keep = [];
				for (const item of deferred) {
					const dueAt = lifeNumber(item.dueAt, 0);
					if (dueAt <= 0 || dueAt <= now) due.push(item);
					else keep.push(item);
				}
				if (due.length === 0) return { replayed: 0 };
				state.deferred = keep;
				let replayed = 0;
				for (const item of due) {
					replayed += 1;
					try {
						const duty = globalThis.tianlightDuty;
						if (duty !== null && duty !== undefined && typeof duty.replay === "function") duty.replay(item.action);
					} catch (error) {
						note("life:replay", error);
					}
				}
				lifeSaveState();
				return { replayed };
			} catch (error) {
				note("life:replay-due", error);
				return { replayed: 0 };
			}
		}

		// ---- focus timer ---------------------------------------------------------
		function lifeFocusActive(nowInput) {
			const state = lifeEnsureState();
			if (state.focus.active !== true) return false;
			const now = lifeNumber(nowInput, Date.now());
			return state.focus.endsAt > now;
		}

		function lifeFocusStatus() {
			try {
				const state = lifeEnsureState();
				const active = lifeFocusActive(Date.now());
				return { active, endsAt: active ? state.focus.endsAt : 0, minutes: state.focus.minutes };
			} catch (error) {
				note("life:focus-status", error);
				return { active: false, endsAt: 0, minutes: LIFE_FOCUS_MINUTES };
			}
		}

		function lifeFocusStart(minutes) {
			try {
				const state = lifeEnsureState();
				const now = Date.now();
				const value = Number(minutes);
				const length = Number.isFinite(value) && value > 0 ? lifeClampInt(value, 1, LIFE_FOCUS_MAX_MINUTES, LIFE_FOCUS_MINUTES) : LIFE_FOCUS_MINUTES;
				state.focus = { active: true, endsAt: now + length * 60000, minutes: length };
				lifeSaveState();
				lifeRefreshAttrs();
				lifeBroadcast("config");
				return lifeFocusStatus();
			} catch (error) {
				note("life:focus-start", error);
				return { active: false, endsAt: 0, minutes: LIFE_FOCUS_MINUTES };
			}
		}

		function lifeFocusStop() {
			try {
				const state = lifeEnsureState();
				state.focus = { active: false, endsAt: 0, minutes: lifeClampInt(state.focus.minutes, 1, LIFE_FOCUS_MAX_MINUTES, LIFE_FOCUS_MINUTES) };
				lifeSaveState();
				lifeRefreshAttrs();
				lifeBroadcast("config");
				return lifeFocusStatus();
			} catch (error) {
				note("life:focus-stop", error);
				return { active: false, endsAt: 0, minutes: LIFE_FOCUS_MINUTES };
			}
		}

		// ---- cross-session memory ------------------------------------------------
		/**
		 * `pat|feed|play|talk|ack` each bump their own bucket, the shared interaction
		 * counter and lastSeenAt; the streak advances once per local calendar day
		 * (consecutive days +1, a gap restarts at 1).
		 */
		function lifeNoteInteraction(kind) {
			try {
				const state = lifeEnsureState();
				const now = Date.now();
				lifeEnsureDay(state, now);
				const bucket = LIFE_INTERACTION_BUCKET[String(kind)];
				if (bucket === undefined) return lifeStatus();
				state.memory[bucket] = Math.min(1000000000, lifeNonNegativeInt(state.memory[bucket], 0) + 1);
				state.memory.interactions = Math.min(1000000000, lifeNonNegativeInt(state.memory.interactions, 0) + 1);
				state.lastSeenAt = now;
				const dayKey = lifeDayKeyOf(now);
				if (state.lastDayKey !== dayKey) {
					const previous = lifeValidDayKey(state.lastDayKey) ? state.lastDayKey : "";
					if (previous !== "" && lifeDayNumber(dayKey) - lifeDayNumber(previous) === 1) {
						state.streakDays = Math.min(1000000, lifeNonNegativeInt(state.streakDays, 0) + 1);
					} else {
						state.streakDays = 1;
					}
					state.lastDayKey = dayKey;
				}
				lifeSaveState();
				return lifeStatus();
			} catch (error) {
				note("life:interaction", error);
				return lifeStatus();
			}
		}

		// ---- proactive speaking --------------------------------------------------
		/**
		 * Deterministic pseudo-random roll (0..99). Hash inputs: local day, hour, the
		 * 30s tick counter and talks already given; a test can replay any moment.
		 */
		function lifeProactiveRoll(state, now, period) {
			const hour = new Date(now).getHours();
			const tick = Math.floor(now / LIFE_TICK_MS);
			const periodIndex = Math.max(0, LIFE_PERIODS.indexOf(period));
			let seed = 2166136261;
			for (const part of [lifeDayNumber(state.dayKey), hour, tick, periodIndex, lifeNonNegativeInt(state.memory.talks, 0)]) {
				seed ^= (part + 0x9e3779b9) >>> 0;
				seed = Math.imul(seed, 16777619) >>> 0;
			}
			return seed % 100;
		}

		function lifeLineCandidates(state, now, period) {
			const candidates = [];
			const periodLine = LIFE_PERIOD_LINE[period];
			if (typeof periodLine === "string") candidates.push(periodLine);
			const lastSeen = lifeNumber(state.lastSeenAt, 0);
			if (lastSeen === 0 || now - lastSeen >= 2 * 24 * 60 * 60 * 1000) candidates.push("life.line.longAway");
			if (lifeFocusActive(now)) candidates.push("life.line.focus");
			const talks = lifeNonNegativeInt(state.memory.talks, 0);
			if (talks > 0 && talks % 5 === 0) candidates.push("life.line.done");
			const hour = new Date(now).getHours();
			if (hour >= 9 && hour <= 21) candidates.push("life.line.water");
			const fresh = candidates.filter((key) => state.recentLines.includes(key) === false);
			return fresh.length > 0 ? fresh : candidates;
		}

		function lifePickLine(state, now, period) {
			const pool = lifeLineCandidates(state, now, period);
			if (pool.length === 0) return "life.line.morning";
			const tick = Math.floor(now / LIFE_TICK_MS);
			let seed = 0;
			for (const part of [tick, lifeDayNumber(state.dayKey), lifeNonNegativeInt(state.memory.talks, 0), pool.length]) {
				seed = (Math.imul(seed ^ (part + 0x9e3779b9), 16777619) >>> 0) % 1000003;
			}
			return pool[seed % pool.length];
		}

		/**
		 * One proactive attempt. Returns `{spoken, reason, key, line}` and never
		 * throws. Silence reasons are explicit so support can tell "asleep" from
		 * "rolled low" from "companion off".
		 */
		function lifeTryProactive(nowInput) {
			const result = { spoken: false, reason: "", key: "", line: "" };
			try {
				const state = lifeEnsureState();
				const now = lifeNumber(nowInput, Date.now());
				lifeEnsureDay(state, now);
				if (state.muteUntil > now) {
					result.reason = "mute";
					return result;
				}
				if (lifeInQuiet(now)) {
					result.reason = "quiet-hours";
					return result;
				}
				if (lifeAwake(now) === false) {
					result.reason = "asleep";
					return result;
				}
				if (lifeFocusActive(now)) {
					result.reason = "focus";
					return result;
				}
				if (state.budget.used >= state.budget.cap) {
					result.reason = "budget";
					return result;
				}
				if (state.lastTalkAt > 0 && now - state.lastTalkAt < LIFE_PROACTIVE_GAP_MS) {
					result.reason = "gap";
					return result;
				}
				const period = lifePeriod(now);
				const roll = lifeProactiveRoll(state, now, period);
				if (roll >= LIFE_PROACTIVE_CHANCE) {
					result.reason = "roll";
					return result;
				}
				const bridge = companionDutyBridge.api;
				if (bridge === null || bridge === undefined || typeof bridge.say !== "function") {
					result.reason = "no-companion";
					return result;
				}
				const key = lifePickLine(state, now, period);
				bridge.say(key, LIFE_SAY_HOLD_MS);
				state.budget.used = Math.min(state.budget.cap, state.budget.used + 1);
				state.memory.talks = Math.min(1000000000, lifeNonNegativeInt(state.memory.talks, 0) + 1);
				state.lastTalkAt = now;
				state.recentLines = [key, ...state.recentLines.filter((entry) => entry !== key)].slice(0, 3);
				lifeSaveState();
				result.spoken = true;
				result.key = key;
				result.line = TL_T(key);
				return result;
			} catch (error) {
				note("life:proactive", error);
				result.reason = "internal-error";
				return result;
			}
		}

		// ---- replaceable pet media ----------------------------------------------
		function lifeDefaultMedia() {
			return {
				id: LIFE_DEFAULT_MEDIA.id,
				kind: LIFE_DEFAULT_MEDIA.kind,
				url: LIFE_DEFAULT_MEDIA.url,
				name: LIFE_DEFAULT_MEDIA.name,
				bytes: null,
			};
		}

		function lifeReadStoredMediaId() {
			try {
				const storage = globalThis.localStorage;
				if (storage === null || storage === undefined || typeof storage.getItem !== "function") return null;
				const raw = storage.getItem(LIFE_MEDIA_KEY);
				if (typeof raw !== "string" || raw === "" || raw === "default") return null;
				return raw.slice(0, 512);
			} catch (error) {
				return null;
			}
		}

		function lifeWriteStoredMediaId(id) {
			try {
				const storage = globalThis.localStorage;
				if (storage === null || storage === undefined) return;
				if (id === null || id === undefined || id === "default") {
					if (typeof storage.removeItem === "function") storage.removeItem(LIFE_MEDIA_KEY);
					return;
				}
				if (typeof storage.setItem === "function") storage.setItem(LIFE_MEDIA_KEY, String(id));
			} catch (error) {
				note("life:media-persist", error);
			}
		}

		function lifeGuessMediaKind(url) {
			return /\.(mp4|webm|mov|m4v|mkv|avi)(\?|#|$)/i.test(String(url)) ? "video" : "image";
		}

		/** Rebuild a catalog URL from a persisted id (catalog may not have loaded yet). */
		function lifeGuessMediaUrl(id) {
			const text = String(id);
			if (text.startsWith("ext:")) {
				const parts = text.split(":");
				if (parts.length >= 3) return ASSET_BASE + "/ext/" + parts[1] + "/" + parts.slice(2).join(":");
			}
			if (text.startsWith("/")) return text;
			return ASSET_BASE + "/" + text;
		}

		/** Synchronous selection cache, so the companion can render before any fetch. */
		function lifeLoadMediaSelection() {
			try {
				const stored = lifeReadStoredMediaId();
				if (stored === null) {
					lifeMediaSelectedId = "default";
					lifeMediaCache = lifeDefaultMedia();
					return;
				}
				lifeMediaSelectedId = stored;
				lifeMediaCache = {
					id: stored,
					kind: lifeGuessMediaKind(stored),
					url: lifeGuessMediaUrl(stored),
					name: stored,
					bytes: null,
				};
			} catch (error) {
				note("life:media-load", error);
				lifeMediaSelectedId = "default";
				lifeMediaCache = lifeDefaultMedia();
			}
		}

		function lifeResolveMediaCache(items) {
			let selected = null;
			const stored = lifeMediaSelectedId === "default" ? null : lifeMediaSelectedId;
			if (stored !== null) {
				for (const item of items) {
					if (item.id === stored) {
						selected = item;
						break;
					}
				}
				if (selected === null) {
					// The chosen file was removed from the library: fall back to the
					// default art instead of leaving a broken <img>.
					lifeMediaSelectedId = "default";
					lifeWriteStoredMediaId(null);
				}
			}
			lifeMediaCache = selected === null ? lifeDefaultMedia() : {
				id: selected.id,
				kind: selected.kind,
				url: selected.url,
				name: selected.name,
				bytes: selected.bytes,
			};
			return lifeMediaCache;
		}

		function lifeMedia() {
			try {
				if (lifeMediaCache === null) lifeLoadMediaSelection();
				const cache = lifeMediaCache;
				if (cache === null) return null;
				return { id: cache.id, kind: cache.kind, url: cache.url, name: cache.name, bytes: cache.bytes };
			} catch (error) {
				note("life:media", error);
				return null;
			}
		}

		/** Safe cleanup helper for the shared catalog fetch. */
		function lifeMediaFetchError(error) {
			try {
				if (error !== null && error !== undefined && typeof error.message === "string") return error.message.slice(0, 200);
				return String(error).slice(0, 200);
			} catch (inner) {
				return "fetch-failed";
			}
		}

		/**
		 * Catalog of replaceable pet media: every non-Wallpaper-Engine image/video in
		 * the host `_wallpapers` list that fits the 32 MiB budget, with the default
		 * cat.png pinned first. Never throws; the caller always gets a usable list.
		 */
		async function lifeListMedia() {
			const items = [lifeDefaultMedia()];
			const rejected = [];
			const fail = (error) => ({ items, rejected, error });
			try {
				if (typeof fetch !== "function") return fail("fetch-unavailable");
				let response = null;
				try {
					response = await fetch(ASSET_BASE + "/_wallpapers", { cache: "no-store" });
				} catch (error) {
					return fail(lifeMediaFetchError(error));
				}
				if (response === null || response === undefined || response.ok !== true) {
					return fail("http-" + (response === null || response === undefined ? "none" : response.status));
				}
				let payload = null;
				try {
					payload = await response.json();
				} catch (error) {
					return fail("invalid-json");
				}
				const rawItems = payload !== null && typeof payload === "object" && Array.isArray(payload.items) ? payload.items : null;
				if (rawItems === null) return fail("invalid-catalog");
				const seen = new Set(["default"]);
				for (const raw of rawItems) {
					if (raw === null || typeof raw !== "object") continue;
					if (raw.source === "we") continue;
					if (raw.kind !== "image" && raw.kind !== "video") continue;
					const id = typeof raw.id === "string" && raw.id !== "" ? raw.id : typeof raw.url === "string" ? raw.url : "";
					const url = typeof raw.url === "string" && raw.url !== "" ? raw.url : "";
					if (id === "" || url === "" || seen.has(id)) continue;
					const bytes = Number(raw.bytes);
					if (Number.isFinite(bytes) === false) continue;
					const name = typeof raw.title === "string" && raw.title !== "" ? raw.title : id;
					if (bytes > LIFE_MEDIA_CAP_BYTES) {
						rejected.push({ name, bytes, reason: "over-32MiB" });
						continue;
					}
					seen.add(id);
					items.push({ id, kind: raw.kind, url, name, bytes });
				}
				lifeResolveMediaCache(items);
				return { items, rejected };
			} catch (error) {
				note("life:media-list", error);
				return fail(lifeMediaFetchError(error));
			}
		}

		function lifeSetMedia(idOrNull) {
			return lifeSetMediaAsync(idOrNull);
		}

		async function lifeSetMediaAsync(idOrNull) {
			try {
				const catalog = await lifeListMedia();
				if (typeof catalog.error === "string") return { ok: false, reason: "catalog-unavailable", error: catalog.error };
				const wanted =
					idOrNull === null || idOrNull === undefined || idOrNull === "default" || idOrNull === ""
						? "default"
						: String(idOrNull);
				let media = null;
				if (wanted === "default") {
					media = lifeDefaultMedia();
				} else {
					for (const item of catalog.items) {
						if (item !== null && item.id === wanted) {
							media = { id: item.id, kind: item.kind, url: item.url, name: item.name, bytes: item.bytes };
							break;
						}
					}
					if (media === null) return { ok: false, reason: "unknown-media" };
				}
				const isDefault = media.id === "default";
				lifeMediaSelectedId = isDefault ? "default" : media.id;
				lifeMediaCache = media;
				lifeWriteStoredMediaId(isDefault ? null : media.id);
				try {
					const doc = lifeDoc();
					if (doc !== null && doc.body !== null && doc.body !== undefined) {
						doc.body.setAttribute("data-tl-pet-media", media.id);
					}
				} catch (error) {
					note("life:media-attr", error);
				}
				try {
					const doc = lifeDoc();
					if (doc !== null && typeof doc.dispatchEvent === "function") {
						doc.dispatchEvent(new CustomEvent("tianlight:pet-media", { detail: { ...media } }));
					}
				} catch (error) {
					note("life:media-event", error);
				}
				lifeBroadcast("media");
				return { ok: true, media: { ...media } };
			} catch (error) {
				note("life:set-media", error);
				return { ok: false, reason: "internal-error", error: lifeMediaFetchError(error) };
			}
		}

		// ---- status / configuration ---------------------------------------------
		function lifeEnergy() {
			try {
				const doc = lifeDoc();
				const hidden = doc !== null && doc.hidden === true;
				let tier = "auto";
				try {
					tier = typeof readRenderTier === "function" ? readRenderTier() : "auto";
				} catch (error) {
					tier = "auto";
				}
				return tier === "15" || hidden ? "low" : "normal";
			} catch (error) {
				return "normal";
			}
		}

		function lifeFallbackStatus() {
			let dayKey = "";
			try {
				dayKey = lifeDayKeyOf(Date.now());
			} catch (error) {
				dayKey = "";
			}
			return {
				version: LIFE_VERSION,
				period: "night",
				awake: false,
				quiet: false,
				mutedUntil: 0,
				budget: { cap: LIFE_DEFAULT_CAP, used: 0, remaining: LIFE_DEFAULT_CAP, dayKey },
				config: {
					quiet: { enabled: true, start: "23:00", end: "08:00" },
					wake: "08:00",
					sleep: "23:00",
					virtualOffsetMinutes: 0,
					cap: LIFE_DEFAULT_CAP,
				},
				memory: { interactions: 0, pats: 0, feeds: 0, plays: 0, talks: 0, acks: 0, streakDays: 0, lastSeenAt: 0, lastTalkAt: 0 },
				focus: { active: false, endsAt: 0, minutes: LIFE_FOCUS_MINUTES },
				media: lifeMediaCache === null ? null : { ...lifeMediaCache },
				deferredCount: 0,
				energy: lifeEnergy(),
				virtualOffsetMinutes: 0,
			};
		}

		function lifeStatus() {
			try {
				const state = lifeEnsureState();
				const now = Date.now();
				lifeEnsureDay(state, now);
				const cap = lifeClampInt(state.budget.cap, 0, LIFE_BUDGET_MAX, LIFE_DEFAULT_CAP);
				const used = Math.max(0, Math.floor(lifeNumber(state.budget.used, 0)));
				const active = lifeFocusActive(now);
				const media = lifeMediaCache === null ? null : { ...lifeMediaCache };
				return {
					version: LIFE_VERSION,
					period: lifePeriod(now),
					awake: lifeAwake(now),
					quiet: lifeInQuiet(now),
					mutedUntil: state.muteUntil > now ? state.muteUntil : 0,
					budget: { cap, used, remaining: Math.max(0, cap - used), dayKey: state.budget.dayKey },
					config: {
						quiet: { enabled: state.quiet.enabled, start: state.quiet.start, end: state.quiet.end },
						wake: state.wake,
						sleep: state.sleep,
						virtualOffsetMinutes: state.virtualOffsetMinutes,
						cap,
					},
					memory: {
						interactions: state.memory.interactions,
						pats: state.memory.pats,
						feeds: state.memory.feeds,
						plays: state.memory.plays,
						talks: state.memory.talks,
						acks: state.memory.acks,
						streakDays: state.streakDays,
						lastSeenAt: state.lastSeenAt,
						lastTalkAt: state.lastTalkAt,
					},
					focus: { active, endsAt: active ? state.focus.endsAt : 0, minutes: state.focus.minutes },
					media,
					deferredCount: state.deferred.length,
					energy: lifeEnergy(),
					virtualOffsetMinutes: state.virtualOffsetMinutes,
				};
			} catch (error) {
				note("life:status", error);
				return lifeFallbackStatus();
			}
		}

		function lifeConfigure(patch) {
			try {
				const state = lifeEnsureState();
				const now = Date.now();
				lifeEnsureDay(state, now);
				if (patch === null || patch === undefined || typeof patch !== "object") return lifeStatus();
				let changed = false;
				const quiet = patch.quiet;
				if (quiet !== null && typeof quiet === "object") {
					if (typeof quiet.enabled === "boolean" && quiet.enabled !== state.quiet.enabled) {
						state.quiet.enabled = quiet.enabled;
						changed = true;
					}
					const start = lifeTimeString(quiet.start, null);
					if (start !== null && start !== state.quiet.start) {
						state.quiet.start = start;
						changed = true;
					}
					const end = lifeTimeString(quiet.end, null);
					if (end !== null && end !== state.quiet.end) {
						state.quiet.end = end;
						changed = true;
					}
				}
				if (patch.budgetDaily !== undefined) {
					const value = Number(patch.budgetDaily);
					if (Number.isFinite(value) && value >= 0 && value <= LIFE_BUDGET_MAX) {
						const next = Math.round(value);
						if (next !== state.budget.cap) {
							state.budget.cap = next;
							changed = true;
						}
					}
				}
				if (patch.wake !== undefined) {
					const next = lifeTimeString(patch.wake, null);
					if (next !== null && next !== state.wake) {
						state.wake = next;
						changed = true;
					}
				}
				if (patch.sleep !== undefined) {
					const next = lifeTimeString(patch.sleep, null);
					if (next !== null && next !== state.sleep) {
						state.sleep = next;
						changed = true;
					}
				}
				if (patch.virtualOffsetMinutes !== undefined) {
					const value = Number(patch.virtualOffsetMinutes);
					if (Number.isFinite(value) && value >= -720 && value <= 720) {
						const next = Math.round(value);
						if (next !== state.virtualOffsetMinutes) {
							state.virtualOffsetMinutes = next;
							changed = true;
						}
					}
				}
				if (changed) {
					lifeSaveState();
					lifeRefreshAttrs();
					lifeBroadcast("config");
				}
				return lifeStatus();
			} catch (error) {
				note("life:configure", error);
				return lifeStatus();
			}
		}

		/** `adjustBudget` moves the daily cap (the user-facing "more/less bubbles"). */
		function lifeAdjustBudget(delta) {
			try {
				const state = lifeEnsureState();
				const value = Number(delta);
				if (Number.isFinite(value) && value !== 0) {
					const next = lifeClampInt(state.budget.cap + value, 0, LIFE_BUDGET_MAX, LIFE_DEFAULT_CAP);
					if (next !== state.budget.cap) {
						state.budget.cap = next;
						lifeSaveState();
						lifeRefreshAttrs();
						lifeBroadcast("budget");
					}
				}
				return lifeStatus();
			} catch (error) {
				note("life:adjust-budget", error);
				return lifeStatus();
			}
		}

		function lifeMuteFor(ms) {
			try {
				const state = lifeEnsureState();
				const value = Number(ms);
				if (Number.isFinite(value)) {
					const duration = lifeClampInt(value, 0, LIFE_MUTE_MAX_MS, 0);
					state.muteUntil = duration === 0 ? 0 : Date.now() + duration;
					lifeSaveState();
					lifeBroadcast("mute");
				}
				return lifeStatus();
			} catch (error) {
				note("life:mute", error);
				return lifeStatus();
			}
		}

		// ---- presentation + cross-window sync ------------------------------------
		function lifeRefreshAttrs() {
			try {
				const doc = lifeDoc();
				if (doc === null || doc.body === null || doc.body === undefined) return;
				const now = Date.now();
				doc.body.setAttribute("data-tl-life-period", lifePeriod(now));
				doc.body.setAttribute("data-tl-life-energy", lifeEnergy());
				doc.body.setAttribute("data-tl-pet-media", lifeMediaCache === null ? "default" : lifeMediaCache.id);
			} catch (error) {
				note("life:attrs", error);
			}
		}

		function lifeBroadcast(type) {
			const channel = lifeChannel;
			if (channel === null) return;
			try {
				channel.postMessage({ source: lifeInstanceId, type, at: Date.now() });
			} catch (error) {
				note("life:broadcast", error);
			}
		}

		function lifeOnChannelMessage(event) {
			try {
				const data = event === null || event === undefined ? null : event.data;
				if (data === null || typeof data !== "object") return;
				if (typeof data.source === "string" && data.source === lifeInstanceId) return;
				const type = typeof data.type === "string" ? data.type : "";
				if (type !== "config" && type !== "budget" && type !== "mute" && type !== "media") return;
				// Another window changed the shared state: adopt its persisted copy and
				// repaint, so both windows agree without a reload.
				lifeState = lifeReadStoredState();
				lifeLoadMediaSelection();
				lifeRefreshAttrs();
				// Another window picked a different look: repaint this window's pet too.
				if (type === "media") {
					try {
						const doc = lifeDoc();
						if (doc !== null && typeof doc.dispatchEvent === "function") {
							doc.dispatchEvent(new CustomEvent("tianlight:pet-media", { detail: lifeMedia() }));
						}
					} catch (error) {
						note("life:media-broadcast", error);
					}
				}
			} catch (error) {
				note("life:channel-message", error);
			}
		}

		/** 30s loop: power-aware; hidden pages do nothing until visible again. */
		function lifeTick() {
			try {
				const doc = lifeDoc();
				if (doc !== null && doc.hidden === true) return;
				lifeReplayDue();
				lifeTryProactive();
				lifeRefreshAttrs();
			} catch (error) {
				note("life:tick", error);
			}
		}

		// ---- install / dispose ---------------------------------------------------
		function installLifeRhythm() {
			const cleanups = [];
			let disposed = false;
			const dispose = () => {
				if (disposed) return;
				disposed = true;
				for (const cleanup of cleanups.splice(0).reverse()) {
					try {
						cleanup();
					} catch (error) {
						note("life:dispose", error);
					}
				}
			};
			try {
				lifeInstanceSeq += 1;
				lifeInstanceId = "life-" + lifeInstanceSeq + "-" + Date.now();
				lifeState = lifeReadStoredState();
				lifeEnsureDay(lifeState, Date.now());
				// Persist the normalized shape once: a fresh install writes createdAt/
				// defaults, an old shape is migrated in place. Cross-window readers and
				// the next session then see exactly what this session sees.
				lifeSaveState();
				lifeLoadMediaSelection();
				const previousGlobal = globalThis.tianlightLife;
				const previousGate = companionDutyBridge.lifeGate;

				// 1) bridge: the duty channel reads this on every inbound action.
				const bridgeGate = (action) => lifeGate(action);
				companionDutyBridge.lifeGate = bridgeGate;
				cleanups.push(() => {
					if (companionDutyBridge.lifeGate !== bridgeGate) return;
					companionDutyBridge.lifeGate = previousGate === undefined ? null : previousGate;
				});

				// 2) observation attributes for the stylesheet / devtools.
				lifeRefreshAttrs();
				cleanups.push(() => {
					try {
						const doc = lifeDoc();
						if (doc === null || doc.body === null || doc.body === undefined) return;
						doc.body.removeAttribute("data-tl-life-period");
						doc.body.removeAttribute("data-tl-life-energy");
						doc.body.removeAttribute("data-tl-pet-media");
					} catch (error) {
						note("life:attrs-dispose", error);
					}
				});

				// 3) 30s rhythm tick (audit-visible window.setInterval/clearInterval pair).
				if (typeof window !== "undefined" && window !== null && typeof window.setInterval === "function") {
					const timer = window.setInterval(lifeTick, LIFE_TICK_MS);
					cleanups.push(() => {
						try {
							window.clearInterval(timer);
						} catch (error) {
							note("life:clear-timer", error);
						}
					});
				}

				// 4) visibility resume: refresh immediately, then run one full tick.
				const doc = lifeDoc();
				if (doc !== null && typeof doc.addEventListener === "function") {
					const onVisibility = () => {
						try {
							lifeRefreshAttrs();
							if (doc.hidden !== true) lifeTick();
						} catch (error) {
							note("life:visibility", error);
						}
					};
					doc.addEventListener("visibilitychange", onVisibility);
					cleanups.push(() => {
						try {
							doc.removeEventListener("visibilitychange", onVisibility);
						} catch (error) {
							note("life:visibility-dispose", error);
						}
					});
				}

				// 5) cross-window sync (optional; a missing BroadcastChannel is fine).
				try {
					if (typeof BroadcastChannel === "function") {
						const channel = new BroadcastChannel(LIFE_CHANNEL);
						channel.onmessage = lifeOnChannelMessage;
						lifeChannel = channel;
						cleanups.push(() => {
							try {
								channel.onmessage = null;
								channel.close();
							} catch (error) {
								note("life:channel-close", error);
							}
							if (lifeChannel === channel) lifeChannel = null;
						});
					}
				} catch (error) {
					lifeChannel = null;
					note("life:channel-open", error);
				}

				// 6) public API (strict v1 shape consumed by the settings page + pet).
				const api = {
					version: LIFE_VERSION,
					status: () => lifeStatus(),
					configure: (patch) => lifeConfigure(patch),
					adjustBudget: (delta) => lifeAdjustBudget(delta),
					muteFor: (ms) => lifeMuteFor(ms),
					gate: (action) => lifeGate(action),
					replayDue: (now) => lifeReplayDue(now),
					noteInteraction: (kind) => lifeNoteInteraction(kind),
					focusStart: (minutes) => lifeFocusStart(minutes),
					focusStop: () => lifeFocusStop(),
					focusStatus: () => lifeFocusStatus(),
					listMedia: () => lifeListMedia(),
					setMedia: (idOrNull) => lifeSetMedia(idOrNull),
					media: () => lifeMedia(),
					tryProactive: (now) => lifeTryProactive(now),
				};
				globalThis.tianlightLife = api;
				cleanups.push(() => {
					if (globalThis.tianlightLife !== api) return;
					if (previousGlobal === undefined) delete globalThis.tianlightLife;
					else globalThis.tianlightLife = previousGlobal;
				});
				return dispose;
			} catch (error) {
				note("life:install-failed", error);
				dispose();
				return dispose;
			}
		}
		//#endregion
