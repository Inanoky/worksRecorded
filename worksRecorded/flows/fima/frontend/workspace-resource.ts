import type { FimaResourcePersistence } from "@/components/fima/persistent-resource";
import type {
	getFimaWorkspaceActivity,
	getFimaWorkspaceSync,
} from "../backend/client";
import {
	type FimaWorkspaceSnapshot,
	mergeFimaWorkspace,
} from "../lib/workspace-sync";

export function createFimaWorkspaceResource(
	scope: string,
	load: (
		known?: FimaWorkspaceSnapshot["cache"],
	) => ReturnType<typeof getFimaWorkspaceSync>,
	persistence: FimaResourcePersistence<FimaWorkspaceSnapshot>,
	check?: (revision: string) => ReturnType<typeof getFimaWorkspaceActivity>,
) {
	const empty = { data: null as FimaWorkspaceSnapshot | null, error: "" };
	let state = empty;
	let pending: Promise<FimaWorkspaceSnapshot | null> | undefined;
	let restored = false;
	let closed = false;
	const listeners = new Set<() => void>();
	const publish = (next: typeof state) => {
		if (closed) return;
		state = next;
		for (const notify of listeners) notify();
	};
	return {
		get: () => state,
		empty: () => empty,
		subscribe: (notify: () => void) => {
			listeners.add(notify);
			return () => {
				listeners.delete(notify);
			};
		},
		close: () => {
			closed = true;
		},
		refresh(force = false): Promise<FimaWorkspaceSnapshot | null> {
			if (pending)
				return force
					? pending.catch(() => null).then(() => this.refresh())
					: pending;
			pending = (async () => {
				if (!restored) {
					restored = true;
					const cached = await persistence.read().catch(() => undefined);
					if (
						cached?.scope === scope &&
						cached.cache &&
						Array.isArray(cached.records)
					)
						publish({ data: cached, error: "" });
				}
				if (closed) return null;
				if (state.data && check) {
					const activity = await check(state.data.cache.revision);
					if (closed) return null;
					if (activity.kind === "denied" || activity.scope !== scope) {
						publish({
							data: null,
							error: "Piekļuve reģistram ir mainīta. Piesakieties vēlreiz.",
						});
						await persistence.write(null);
						return null;
					}
					if (activity.kind === "unchanged") {
						if (state.error) publish({ ...state, error: "" });
						return state.data;
					}
				}
				const response = await load(state.data?.cache);
				if (closed) return null;
				if (response.kind === "denied") {
					publish({
						data: null,
						error: "Piekļuve reģistram ir mainīta. Piesakieties vēlreiz.",
					});
					await persistence.write(null);
					return null;
				}
				if (response.kind === "unchanged") {
					if (response.scope !== scope) {
						publish({
							data: null,
							error: "Sesija ir mainīta. Piesakieties vēlreiz.",
						});
						await persistence.write(null);
						return null;
					}
					if (state.error) publish({ ...state, error: "" });
					return state.data;
				}
				if (response.delta.scope !== scope) {
					publish({
						data: null,
						error: "Sesija ir mainīta. Piesakieties vēlreiz.",
					});
					await persistence.write(null);
					return null;
				}
				const data = mergeFimaWorkspace(state.data, response.delta);
				publish({ data, error: "" });
				await persistence.write(data).catch(() => {});
				return data;
			})()
				.catch((error) => {
					publish({
						...state,
						error:
							error instanceof Error
								? error.message
								: "Neizdevās atjaunot reģistru.",
					});
					throw error;
				})
				.finally(() => {
					pending = undefined;
				});
			return pending;
		},
	};
}
