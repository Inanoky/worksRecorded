import type { FimaActsData, FimaActsVersions } from "@/lib/fima/act-register";
import { type FimaActsDelta, mergeFimaActsDelta } from "@/lib/fima/acts-sync";
import type { FimaResourcePersistence } from "./persistent-resource";
export function createFimaActsResource(
	loadData: (siteId: string) => Promise<FimaActsData>,
	loadView: () => Promise<unknown>,
	options: {
		persistence?: (siteId: string) => FimaResourcePersistence<FimaActsData>;
		loadDelta?: (
			siteId: string,
			known: FimaActsVersions,
		) => Promise<FimaActsDelta>;
	} = {},
) {
	type State = {
		status: "idle" | "loading" | "ready" | "error";
		data: FimaActsData | null;
		error: string;
	};
	const empty: State = { status: "idle", data: null, error: "" };
	const entries = new Map<string, State>();
	const pending = new Map<string, Promise<void>>();
	const listeners = new Set<() => void>();
	const edits = new Map<string, number>();
	const publish = (id: string, state: State) => {
		entries.set(id, state);
		for (const notify of listeners) notify();
		if (state.data)
			void options
				.persistence?.(id)
				.write(state.data)
				.catch(() => {});
	};
	return {
		subscribe: (notify: () => void) => {
			listeners.add(notify);
			return () => {
				listeners.delete(notify);
			};
		},
		get: (siteId: string) => entries.get(siteId) ?? empty,
		empty: () => empty,
		update: (data: FimaActsData) => {
			if (entries.get(data.siteId)?.data === data) return;
			edits.set(data.siteId, (edits.get(data.siteId) ?? 0) + 1);
			publish(data.siteId, { status: "ready", data, error: "" });
		},
		load(siteId: string, force = false) {
			if (pending.has(siteId)) return pending.get(siteId) as Promise<void>;
			const state = entries.get(siteId) ?? empty;
			if (!force && state.status !== "idle") return Promise.resolve();
			let current = state.data;
			const before = edits.get(siteId) ?? 0;
			if (!current) publish(siteId, { ...state, status: "loading", error: "" });
			const work = (async () => {
				if (!current && options.persistence) {
					const cached = await options
						.persistence(siteId)
						.read()
						.catch(() => undefined);
					if (
						cached?.siteId === siteId &&
						Array.isArray(cached.rows) &&
						Array.isArray(cached.choices)
					) {
						current = cached;
						publish(siteId, { status: "ready", data: current, error: "" });
					}
				}
				const view = loadView();
				if (current?.cache && options.loadDelta) {
					const [delta] = await Promise.all([
						options.loadDelta(siteId, current.cache),
						view,
					]);
					if (delta.kind === "denied") {
						await options.persistence?.(siteId).write(null);
						publish(siteId, {
							status: "error",
							data: null,
							error:
								"Piekļuve projektam ir mainīta. Atveriet projektu no jauna.",
						});
						return;
					}
					if ((edits.get(siteId) ?? 0) !== before) return;
					if (delta.kind === "unchanged") {
						if (entries.get(siteId)?.status !== "ready")
							publish(siteId, { status: "ready", data: current, error: "" });
						return;
					}
					publish(siteId, {
						status: "ready",
						data: mergeFimaActsDelta(current, delta),
						error: "",
					});
					return;
				}
				const [data] = await Promise.all([loadData(siteId), view]);
				if (data.siteId !== siteId)
					throw new Error("Saņemti cita projekta akti.");
				if ((edits.get(siteId) ?? 0) === before)
					publish(siteId, { status: "ready", data, error: "" });
			})()
				.catch((error) =>
					publish(siteId, {
						status: "error",
						data: entries.get(siteId)?.data ?? null,
						error:
							error instanceof Error
								? error.message
								: "Neizdevās ielādēt aktus.",
					}),
				)
				.finally(() => pending.delete(siteId));
			pending.set(siteId, work);
			return work;
		},
	};
}
