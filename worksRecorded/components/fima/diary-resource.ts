import type { ConstructionDiaryListRow } from "@/flows/default-construction/backend/diary-list-record";
import { mergeFimaCollaboration } from "@/lib/fima/diary-list-summary";
import {
	type FimaDiaryDelta,
	type FimaDiaryWorkspace,
	hydrateFimaDiaryRows,
	mergeFimaDiaryDelta,
} from "@/lib/fima/diary-workspace";

export function createFimaDiaryResource(
	loadView: () => Promise<unknown>,
	request: typeof fetch = (...args) => fetch(...args),
) {
	type State = {
		status: "idle" | "loading" | "ready" | "error";
		data: FimaDiaryWorkspace | null;
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
	};
	class AccessError extends Error {}
	const check = (response: Response) => {
		if (response.status === 401 || response.status === 403)
			throw new AccessError(
				"Piekļuve projektam ir mainīta. Atveriet projektu no jauna.",
			);
		if (!response.ok) throw new Error("Neizdevās ielādēt projekta izmaiņas.");
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
		patch(
			siteId: string,
			rows: (Partial<ConstructionDiaryListRow> & { id: string })[],
			removed: string[] = [],
		) {
			const state = entries.get(siteId);
			if (!state?.data) return;
			const changed = new Map(rows.map((row) => [row.id, row]));
			const deleted = new Set(removed);
			for (const id of [...changed.keys(), ...removed])
				edits.set(id, (edits.get(id) ?? 0) + 1);
			const next = state.data.rows
				.filter((row) => !deleted.has(row.id))
				.map((row) => {
					const patch = changed.get(row.id);
					if (!patch) return row;
					return {
						...row,
						...patch,
						...(patch.fimaCollaboration
							? {
									fimaCollaboration: mergeFimaCollaboration(
										row.fimaCollaboration,
										patch.fimaCollaboration,
									),
								}
							: {}),
					};
				});
			for (const row of rows)
				if (!next.some((value) => value.id === row.id))
					next.push(row as ConstructionDiaryListRow);
			publish(siteId, {
				...state,
				data: { ...state.data, rows: hydrateFimaDiaryRows(next) },
			});
		},
		load(siteId: string, force = false) {
			if (pending.has(siteId)) return pending.get(siteId) as Promise<void>;
			const state = entries.get(siteId) ?? empty;
			if (!force && state.status !== "idle") return Promise.resolve();
			const current = state.data;
			const before = new Map(edits);
			if (!current) publish(siteId, { ...state, status: "loading", error: "" });
			const work = (async () => {
				if (current) {
					const response = await request(
						`/api/fima/project-diary?project=${encodeURIComponent(siteId)}`,
						{
							cache: "no-store",
							headers: { "If-None-Match": `"${current.revision}"` },
						},
					);
					if (response.status === 304) {
						if (state.status !== "ready")
							publish(siteId, { ...state, status: "ready", error: "" });
						return;
					}
					check(response);
				}
				const [response] = await Promise.all([
					request("/api/fima/project-diary", {
						method: "POST",
						cache: "no-store",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							project: siteId,
							...(current
								? {
										known: {
											versions: current.versions,
											configVersion: current.configVersion,
										},
									}
								: {}),
						}),
					}),
					loadView(),
				]);
				check(response);
				const delta = (await response.json()) as FimaDiaryDelta & {
					bisEnabled: boolean;
					organizationLanguage: string | null;
				};
				if (delta.siteId !== siteId)
					throw new Error("Saņemti cita projekta ieraksti.");
				const latest = entries.get(siteId)?.data ?? current;
				let next: FimaDiaryWorkspace;
				if (latest) {
					const untouched = (id: string) =>
						(before.get(id) ?? 0) === (edits.get(id) ?? 0);
					const safe = {
						...delta,
						rows: delta.rows.filter((row) => untouched(row.id)),
						removed: delta.removed.filter(untouched),
						versions: Object.fromEntries(
							Object.entries(delta.versions).filter(([id]) => untouched(id)),
						),
					};
					next = mergeFimaDiaryDelta(latest, safe);
					if (
						safe.rows.length !== delta.rows.length ||
						safe.removed.length !== delta.removed.length
					)
						next.revision = "";
				} else {
					if (!delta.config) throw new Error("Nav projekta iestatījumu.");
					next = {
						...delta,
						config: delta.config,
						rows: hydrateFimaDiaryRows(delta.rows),
					};
				}
				publish(siteId, { status: "ready", data: next, error: "" });
			})()
				.catch((error) =>
					publish(siteId, {
						status: "error",
						data:
							error instanceof AccessError
								? null
								: (entries.get(siteId)?.data ?? null),
						error:
							error instanceof Error
								? error.message
								: "Neizdevās atjaunot projektu.",
					}),
				)
				.finally(() => pending.delete(siteId));
			pending.set(siteId, work);
			return work;
		},
	};
}
