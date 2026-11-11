		//#region pet agent
		/**
		 * v1.2.0 DSH Agent bridge — the pet talks to a REAL DSH Agent.
		 *
		 * This is the highest-risk capability in the skin, so it is deliberately
		 * narrow and governed:
		 *   - capability `agentChat` (medium, default OFF) is owned by the pet brain;
		 *     `connect/chat` refuse unless the user explicitly granted it;
		 *   - the pet only ever sends a prompt the user typed in the role hub; it
		 *     never prompts on its own (no timers, no life/duty hook), never
		 *     approves/cancels anything, and calls no other session operations;
		 *   - one in-flight prompt, <=30 prompts/day, <=1000 chars, 120s reply window;
		 *   - every send is audited locally and mirrored into `tianlightPet.audit`;
		 *   - the target session is explicitly chosen by the user: either a brand
		 *     new "pet session" or one existing session from the user's list;
		 *   - prompt text is prefixed with a fixed soft guard asking the Agent to
		 *     answer only (the Agent's own tool permissions still apply — the hub
		 *     shows this warning, and the user can revoke/unplug at any time).
		 *
		 * Transport: the injected `remote.session` Client Remote
		 * (list/create/prompt/follow) from `@deepseek-ai/dsh-api-session-controller`.
		 * All calls are defensive: the service may be unmounted, the Host may be
		 * older, or the reply stream may be shaped differently — the chat then
		 * degrades to "sent, open the session to read" instead of failing hard.
		 *
		 * R4A security pass (v0.6.1): authorization is read from the brain fragment's
		 * closure state (`petAgentChatAllowed`), never from a replaceable global; the
		 * `agentChat` grant is session-memory only (reload = re-authorize); listing
		 * DSH sessions also requires it; and the only thing published on
		 * `globalThis.tianlightPetAgent` is a frozen read-only status/audit surface —
		 * connect/chat/list live in the same-closure `petAgentInternal` the role hub
		 * calls directly.
		 */
		const PET_AGENT_VERSION = 1;
		const PET_AGENT_KEY = "tianlight.pet.agent.v1";
		const PET_AGENT_DAILY_CAP = 30;
		/** Upper bound for a persisted daily cap (old saves clamp into 1..100). */
		const PET_AGENT_DAILY_CAP_MAX = 100;
		const PET_AGENT_MAX_CHARS = 1000;
		const PET_AGENT_TIMEOUT_MS = 120000;
		const PET_AGENT_AUDIT_MAX = 30;
		const PET_AGENT_SESSIONS_MAX = 20;

		let petAgentRemoteSession = null;
		let petAgentWorkspace = null;
		let petAgentState = null;
		let petAgentAudit = [];
		let petAgentPending = false;
		let petAgentAbort = null;

		const petAgentDoc = () => (typeof document === "undefined" ? null : document);

		function petAgentReadState() {
			const dayKey = petAgentDayKey();
			let stored = null;
			try {
				const raw = globalThis.localStorage?.getItem(PET_AGENT_KEY);
				if (typeof raw === "string" && raw.length > 0) {
					const parsed = JSON.parse(raw);
					if (parsed !== null && typeof parsed === "object") stored = parsed;
				}
			} catch (error) {
				note("pet-agent:read-state", error);
			}
			const cap = Math.min(PET_AGENT_DAILY_CAP_MAX, Math.max(1, Math.floor(Number(stored?.cap) || PET_AGENT_DAILY_CAP)));
			const sameDay = stored?.dayKey === dayKey;
			return {
				version: PET_AGENT_VERSION,
				dayKey,
				used: sameDay ? Math.max(0, Math.floor(Number(stored?.used) || 0)) : 0,
				cap,
				targetMode: stored?.targetMode === "existing" ? "existing" : "new",
				sessionId: typeof stored?.sessionId === "string" && stored.sessionId.length > 0 ? stored.sessionId : null,
				title: typeof stored?.title === "string" && stored.title.length > 0 ? stored.title : null,
			};
		}

		function petAgentSaveState() {
			try {
				globalThis.localStorage?.setItem(
					PET_AGENT_KEY,
					JSON.stringify({
						version: PET_AGENT_VERSION,
						dayKey: petAgentState?.dayKey ?? petAgentDayKey(),
						used: petAgentState?.used ?? 0,
						cap: petAgentState?.cap ?? PET_AGENT_DAILY_CAP,
						targetMode: petAgentState?.targetMode ?? "new",
						sessionId: petAgentState?.sessionId ?? null,
						title: petAgentState?.title ?? null,
					}),
				);
			} catch (error) {
				note("pet-agent:save-state", error);
			}
		}

		function petAgentEnsureState() {
			const next = petAgentReadState();
			if (petAgentState === null || petAgentState.dayKey !== next.dayKey) {
				petAgentState = next;
				return petAgentState;
			}
			petAgentState.used = next.used;
			petAgentState.cap = next.cap;
			return petAgentState;
		}

		function petAgentDayKey() {
			if (typeof Date !== "undefined") {
				const date = new Date();
				return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
			}
			return "day";
		}

		/**
		 * R4A: authorization is decided from the brain's CLOSURE state in
		 * src/44-pet-brain.js, never by reading a replaceable global. A same-page
		 * script can overwrite `globalThis.tianlightPet` (or this fragment's read-only
		 * global) but it cannot change `petGrants` / `petPaused`.
		 */
		function petAgentPermitted() {
			try {
				return petAgentChatAllowed() === true;
			} catch (error) {
				note("pet-agent:permission", error);
				return false;
			}
		}

		function petAgentMirrorAudit(entry) {
			petAgentAudit.unshift(entry);
			if (petAgentAudit.length > PET_AGENT_AUDIT_MAX) petAgentAudit.length = PET_AGENT_AUDIT_MAX;
			try {
				// Same-closure audit path (src/44-pet-brain.js). The pre-R4A code called
				// `globalThis.tianlightPet.recordExternal`, which a same-page script could
				// replace to suppress or forge audit entries.
				petRecordExternal({
					action: "agent",
					cap: "agentChat",
					ok: entry.ok === true,
					reason: entry.reason,
					source: "pet-agent",
					chars: entry.chars,
				});
			} catch (error) {
				note("pet-agent:mirror-audit", error);
			}
		}

		/** RemoteResult unwrapping: accept { ok, value } and bare value shapes. */
		function petAgentUnwrap(result) {
			if (result === null || result === undefined) return null;
			if (result.ok === false) return null;
			if (Object.prototype.hasOwnProperty.call(result, "ok")) return result.value ?? null;
			if (Object.prototype.hasOwnProperty.call(result, "value")) return result.value;
			return result;
		}

		function petAgentRemote() {
			return petAgentRemoteSession;
		}

		/**
		 * List the user's DSH sessions. R4A: this also requires the `agentChat`
		 * capability — session titles/working directories are user data, and the
		 * pre-R4A code exposed the list with no grant at all.
		 */
		async function petAgentListSessions() {
			if (!petAgentPermitted()) return { ok: false, reason: "permission", sessions: [] };
			const remote = petAgentRemote();
			if (remote === null || remote === undefined || typeof remote.list !== "function") {
				return { ok: false, reason: "agent-unavailable", sessions: [] };
			}
			try {
				const value = petAgentUnwrap(await remote.list({}));
				const items = value !== null && value !== undefined && Array.isArray(value.items) ? value.items : [];
				const sessions = [];
				for (const item of items.slice(0, PET_AGENT_SESSIONS_MAX)) {
					if (item === null || item === undefined || typeof item.sessionId !== "string") continue;
					sessions.push({
						id: item.sessionId,
						title: typeof item.title === "string" && item.title.length > 0 ? item.title : item.sessionId.slice(0, 8),
						running: item.running === true,
						agentAvailable: item.agentAvailable === true,
						cwd: typeof item.cwd === "string" && item.cwd.length > 0 ? item.cwd : undefined,
					});
				}
				return { ok: true, sessions };
			} catch (error) {
				note("pet-agent:list", error);
				return { ok: false, reason: "list-failed", sessions: [] };
			}
		}

		function petAgentStatus() {
			const state = petAgentEnsureState();
			const remote = petAgentRemote();
			const permission = petAgentPermitted();
			let paused = false;
			try {
				paused = petAgentPaused() === true;
			} catch {
				paused = false; // a stripped harness must still render a status
			}
			return {
				version: PET_AGENT_VERSION,
				available: remote !== null && typeof remote === "object" && typeof remote.prompt === "function",
				connected: state.sessionId !== null && remote !== null,
				sessionId: state.sessionId,
				sessionTitle: state.title,
				targetMode: state.targetMode,
				budget: {
					cap: state.cap,
					used: state.used,
					remaining: Math.max(0, state.cap - state.used),
					dayKey: state.dayKey,
				},
				pending: petAgentPending,
				lastError: petAgentLastError,
				permission,
				paused,
			};
		}

		let petAgentLastError = null;

		async function petAgentRefreshSessions() {
			const result = await petAgentListSessions();
			return result;
		}

		async function petAgentConnect(options) {
			const state = petAgentEnsureState();
			if (!petAgentPermitted()) {
				petAgentMirrorAudit({ at: Date.now(), action: "agent", cap: "agentChat", ok: false, reason: "permission" });
				return { ok: false, reason: "permission" };
			}
			const remote = petAgentRemote();
			if (remote === null || remote === undefined) return { ok: false, reason: "agent-unavailable" };
			const mode = options !== null && options !== undefined && options.mode === "existing" ? "existing" : "new";
			try {
				if (mode === "existing") {
					const requested = typeof options?.sessionId === "string" ? options.sessionId : "";
					if (requested.length === 0) return { ok: false, reason: "session-required" };
					const listed = await petAgentListSessions();
					const known = (listed.sessions ?? []).find((item) => item.id === requested);
					if (known === undefined) return { ok: false, reason: "unknown-session" };
					state.sessionId = known.id;
					state.title = known.title;
					state.targetMode = "existing";
					petAgentSaveState();
					petAgentMirrorAudit({ at: Date.now(), action: "agent", cap: "agentChat", ok: true, reason: "connect-existing" });
					return { ok: true, sessionId: state.sessionId };
				}
				let created = null;
				if (typeof remote.create === "function") {
					created = petAgentUnwrap(await remote.create({}));
					if (created === null || typeof created.sessionId !== "string") {
						const listed = await petAgentListSessions();
						const latest = listed.sessions?.[0];
						if (latest !== undefined) {
							created = petAgentUnwrap(await remote.create(latest.cwd === undefined ? {} : { cwd: latest.cwd }));
						}
					}
				}
				if (created === null || typeof created.sessionId !== "string") {
					return { ok: false, reason: "create-failed" };
				}
				state.sessionId = created.sessionId;
				state.title = typeof created.agentPreset === "string" ? "pet · " + created.agentPreset : "pet session";
				state.targetMode = "new";
				petAgentSaveState();
				petAgentMirrorAudit({ at: Date.now(), action: "agent", cap: "agentChat", ok: true, reason: "connect-new" });
				return { ok: true, sessionId: state.sessionId };
			} catch (error) {
				note("pet-agent:connect", error);
				petAgentLastError = "connect-failed";
				return { ok: false, reason: "connect-failed" };
			}
		}

		function petAgentDisconnect() {
			const state = petAgentEnsureState();
			state.sessionId = null;
			state.title = null;
			petAgentSaveState();
			petAgentMirrorAudit({ at: Date.now(), action: "agent", cap: "agentChat", ok: true, reason: "disconnect" });
			return { ok: true };
		}

		/** Soft guard prepended to every pet prompt. Not a security boundary — the
		 *  Agent's real tool permissions are the Host's; this only discourages
		 *  unrequested tool work. */
		function petAgentPromptText(text) {
			return "【天光桌宠 · 用户主动提问】请只回答，不要执行工具、不要请求审批、不要修改文件，除非用户在本条消息里明确要求。\n\n" + text;
		}

		/** Best-effort text accumulation from a follow stream. Unknown chunk shapes
		 *  are ignored; the caller falls back to "open the session". */
		function petAgentCollectText(node, out) {
			if (node === null || node === undefined || out.length > 4000) return;
			if (typeof node === "string") {
				if (node.length > 0 && node.length < 4000) out.push(node);
				return;
			}
			if (Array.isArray(node)) {
				for (const entry of node) petAgentCollectText(entry, out);
				return;
			}
			if (typeof node !== "object") return;
			const type = typeof node.type === "string" ? node.type : "";
			if (type === "text" || type === "text-delta" || type === "textDelta" || type === "assistant-text" || type === "output_text") {
				if (typeof node.text === "string") out.push(node.text);
				if (typeof node.delta === "string") out.push(node.delta);
				return;
			}
			for (const key of ["text", "delta", "content", "chunk", "parts"]) {
				if (node[key] !== undefined) petAgentCollectText(node[key], out);
			}
		}

		async function petAgentCollectReply(remote, sessionId, signal) {
			if (typeof remote.follow !== "function") return null;
			let handle = null;
			try {
				handle = remote.follow({ address: { kind: "session", sessionId }, assistantStream: true }, signal);
			} catch (error) {
				note("pet-agent:follow-open", error);
				return null;
			}
			if (handle === null || handle === undefined) return null;
			const pieces = [];
			const consumeFrame = (frame) => {
				if (frame === null || typeof frame !== "object") return;
				if (frame.type === "assistant-stream" && frame.frame !== undefined) {
					petAgentCollectText(frame.frame, pieces);
				} else if (frame.type === "snapshot" && Array.isArray(frame.records)) {
					// Fallback: only inspect trailing assistant messages, never user text.
					for (const record of frame.records.slice(-6)) {
						const event = record?.event;
						if (event === null || event === undefined) continue;
						if (typeof event.type === "string" && event.type.includes("assistant")) petAgentCollectText(event.data, pieces);
					}
				}
			};
			try {
				const iterable = handle[Symbol.asyncIterator] ? handle : handle.stream ?? handle.frames;
				if (iterable !== null && iterable !== undefined && typeof iterable[Symbol.asyncIterator] === "function") {
					for await (const frame of iterable) {
						if (signal.aborted) break;
						consumeFrame(frame);
					}
				} else if (typeof handle.subscribe === "function") {
					await new Promise((resolve) => {
						let done = false;
						const finish = () => {
							if (done) return;
							done = true;
							resolve();
						};
						signal.addEventListener("abort", finish, { once: true });
						try {
							handle.subscribe((frame) => consumeFrame(frame), finish);
						} catch (error) {
							note("pet-agent:follow-subscribe", error);
							finish();
						}
						setTimeout(finish, PET_AGENT_TIMEOUT_MS);
					});
				}
			} catch (error) {
				note("pet-agent:follow-read", error);
			} finally {
				try {
					if (typeof handle.close === "function") handle.close();
					else if (typeof handle.release === "function") handle.release();
				} catch (error) {
					note("pet-agent:follow-close", error);
				}
			}
			const text = pieces.join("").replace(/\s+/g, " ").trim();
			return text.length > 0 ? text.slice(0, 1200) : null;
		}

		async function petAgentChat(text) {
			const state = petAgentEnsureState();
			if (!petAgentPermitted()) {
				petAgentMirrorAudit({ at: Date.now(), action: "agent", cap: "agentChat", ok: false, reason: "permission" });
				return { ok: false, reason: "permission" };
			}
			if (text === null || text === undefined || typeof text !== "string") return { ok: false, reason: "invalid-input" };
			const trimmed = text.trim();
			if (trimmed.length === 0) return { ok: false, reason: "empty" };
			if (state.used >= state.cap) {
				petAgentMirrorAudit({ at: Date.now(), action: "agent", cap: "agentChat", ok: false, reason: "daily-quota" });
				return { ok: false, reason: "daily-quota" };
			}
			if (petAgentPending) return { ok: false, reason: "busy" };
			if (state.sessionId === null) return { ok: false, reason: "not-connected" };
			const remote = petAgentRemote();
			if (remote === null || typeof remote.prompt !== "function") return { ok: false, reason: "agent-unavailable" };
			const clipped = trimmed.length > PET_AGENT_MAX_CHARS ? trimmed.slice(0, PET_AGENT_MAX_CHARS) : trimmed;
			petAgentPending = true;
			petAgentAbort = typeof AbortController === "function" ? new AbortController() : null;
			const timeoutTimer = setTimeout(() => petAgentAbort?.abort(), PET_AGENT_TIMEOUT_MS);
			try {
				const requestId =
					typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
						? crypto.randomUUID()
						: `pet-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
				const accepted = petAgentUnwrap(
					await remote.prompt({
						requestId,
						sessionId: state.sessionId,
						mode: "queue",
						content: [{ type: "text", text: petAgentPromptText(clipped) }],
						clientTimeZone: Intl?.DateTimeFormat?.().resolvedOptions?.().timeZone,
					}),
				);
				if (accepted === null) {
					petAgentLastError = "prompt-rejected";
					petAgentMirrorAudit({ at: Date.now(), action: "agent", cap: "agentChat", ok: false, reason: "prompt-rejected", chars: clipped.length });
					return { ok: false, reason: "prompt-rejected" };
				}
				state.used += 1;
				petAgentSaveState();
				petAgentMirrorAudit({ at: Date.now(), action: "agent", cap: "agentChat", ok: true, reason: "sent", chars: clipped.length });
				const reply = await petAgentCollectReply(remote, state.sessionId, petAgentAbort?.signal ?? new AbortController().signal);
				return { ok: true, sent: true, reply, sessionId: state.sessionId, budget: { used: state.used, cap: state.cap } };
			} catch (error) {
				note("pet-agent:chat", error);
				petAgentLastError = "prompt-failed";
				petAgentMirrorAudit({ at: Date.now(), action: "agent", cap: "agentChat", ok: false, reason: "prompt-failed", chars: clipped.length });
				return { ok: false, reason: "prompt-failed" };
			} finally {
				clearTimeout(timeoutTimer);
				petAgentPending = false;
				petAgentAbort = null;
			}
		}

		function petAgentOpenSession() {
			// R8 (REV-R4A F4): opening the connected session is part of the Agent channel;
			// it needs the same session-only agentChat grant as connect/chat/list.
			if (!petAgentPermitted()) return { ok: false, reason: "permission" };
			const state = petAgentEnsureState();
			if (state.sessionId === null) return { ok: false, reason: "not-connected" };
			try {
				const workspace = petAgentWorkspace ?? ctxGetWorkspace();
				if (workspace !== null && workspace !== undefined && typeof workspace.openSession === "function") {
					workspace.openSession(state.sessionId);
					return { ok: true };
				}
			} catch (error) {
				note("pet-agent:open-session", error);
			}
			return { ok: false, reason: "workspace-unavailable" };
		}

		/** The install closure stores ctx; a tiny helper keeps openSession honest
		 *  when the uiWorkspace service is injected lazily. */
		let petAgentCtx = null;
		function ctxGetWorkspace() {
			if (petAgentCtx === null) return petAgentWorkspace;
			try {
				const viaGet = typeof petAgentCtx.get === "function" ? petAgentCtx.get("uiWorkspace") : undefined;
				if (viaGet !== undefined) return viaGet;
			} catch (error) {
				note("pet-agent:get-workspace", error);
			}
			return petAgentWorkspace;
		}

		/** Bounded read projection shared by the read-only global and the closure API. */
		function petAgentAuditSlice(limit) {
			const size = Number.isFinite(Number(limit)) ? Math.max(0, Math.min(PET_AGENT_AUDIT_MAX, Math.floor(Number(limit)))) : 10;
			return petAgentAudit.slice(0, size);
		}

		/**
		 * R4A: same-closure API for the role hub. The privileged methods (connect /
		 * list / chat / disconnect / open) live HERE only; `globalThis.tianlightPetAgent`
		 * is a frozen read-only status surface (see installPetAgent). A same-page
		 * script that replaces any global therefore cannot reach them. Every privileged
		 * method still re-checks `petAgentPermitted()` on each call.
		 */
		const petAgentInternal = Object.freeze({
			status: () => petAgentStatus(),
			refreshSessions: () => petAgentRefreshSessions(),
			connect: (options) => petAgentConnect(options),
			disconnect: () => petAgentDisconnect(),
			chat: (text) => petAgentChat(text),
			openSession: () => petAgentOpenSession(),
			audit: (limit) => petAgentAuditSlice(limit),
		});

		function installPetAgent(ctx) {
			const cleanups = [];
			petAgentCtx = ctx ?? null;
			petAgentState = petAgentReadState();
			petAgentAudit = [];
			petAgentLastError = null;
			let readOnlyApi = null;
			let disposed = false;
			const dispose = () => {
				if (disposed) return;
				disposed = true;
				try {
					petAgentAbort?.abort();
				} catch (error) {
					note("pet-agent:abort-on-dispose", error);
				}
				petAgentPending = false;
				for (const cleanup of cleanups.splice(0).reverse()) {
					try {
						// post-2.0.0 fix: `ctx.inject()` returns a cordis Fiber (PromiseLike with
						// `.dispose()`), not a disposer function, while older hosts returned a
						// function. Accept both shapes; a plain `cleanup()` used to throw
						// "cleanup is not a function" on every teardown and left the injected
						// remote.session / uiWorkspace scopes mounted.
						if (typeof cleanup === "function") {
							cleanup();
						} else if (cleanup !== null && cleanup !== undefined && typeof cleanup.dispose === "function") {
							const result = cleanup.dispose();
							if (result !== null && result !== undefined && typeof result.catch === "function") {
								result.catch((error) => note("pet-agent:dispose", error));
							}
						}
					} catch (error) {
						note("pet-agent:dispose", error);
					}
				}
				// Only the read-only surface this instance published is removed.
				if (readOnlyApi !== null && globalThis.tianlightPetAgent === readOnlyApi) {
					try {
						delete globalThis.tianlightPetAgent;
					} catch (error) {
						note("pet-agent:delete-global", error);
					}
				}
				readOnlyApi = null;
				petAgentCtx = null;
			};
			try {
				if (ctx !== null && ctx !== undefined && typeof ctx.inject === "function") {
					const disposeRemote = ctx.inject(["remote.session"], (scoped) => {
						try {
							const direct = scoped.get?.("remote.session");
							if (direct !== undefined) petAgentRemoteSession = direct;
							else if (scoped.remote?.session !== undefined) petAgentRemoteSession = scoped.remote.session;
						} catch (error) {
							note("pet-agent:inject-remote", error);
						}
						return () => {
							petAgentRemoteSession = null;
						};
					});
					cleanups.push(disposeRemote);
					const disposeWorkspace = ctx.inject(["uiWorkspace"], (scoped) => {
						try {
							const direct = scoped.get?.("uiWorkspace");
							if (direct !== undefined) petAgentWorkspace = direct;
						} catch (error) {
							note("pet-agent:inject-workspace", error);
						}
						return () => {
							petAgentWorkspace = null;
						};
					});
					cleanups.push(disposeWorkspace);
				}
				// R4A: publish ONLY a frozen read-only status surface. Privileged methods
				// live in the same-closure `petAgentInternal` object the role hub uses;
				// keeping connect/chat off every global removes the pre-R4A entry point
				// while diagnostics (99-apply) and the docs' status contract still work.
				readOnlyApi = Object.freeze({
					__petAgentReadOnly: true,
					version: PET_AGENT_VERSION,
					status: () => petAgentStatus(),
					audit: (limit) => petAgentAuditSlice(limit),
				});
				globalThis.tianlightPetAgent = readOnlyApi;
				return dispose;
			} catch (error) {
				note("pet-agent:install-failed", error);
				dispose();
				return dispose;
			}
		}
		//#endregion
