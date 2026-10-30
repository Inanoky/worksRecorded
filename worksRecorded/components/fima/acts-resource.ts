import type { FimaActsData } from "@/lib/fima/act-register";

export function createFimaActsResource(
	loadData: (siteId: string) => Promise<FimaActsData>,
	loadView: () => Promise<unknown>,
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
	const publish = (siteId: string, state: State) => {
		entries.set(siteId, state);
		for (const notify of listeners) notify();
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
		update: (data: FimaActsData) =>
			publish(data.siteId, { status: "ready", data, error: "" }),
		load(siteId: string, force = false) {
			if (pending.has(siteId)) return pending.get(siteId) as Promise<void>;
			const current = entries.get(siteId) ?? empty;
			if (!force && current.status !== "idle") return Promise.resolve();
			publish(siteId, { ...current, status: "loading", error: "" });
			const request = Promise.all([loadData(siteId), loadView()])
				.then(([data]) => {
					if (data.siteId !== siteId)
						throw new Error("Saņemti cita projekta akti.");
					publish(siteId, { status: "ready", data, error: "" });
				})
				.catch((error) =>
					publish(siteId, {
						status: "error",
						data: null,
						error:
							error instanceof Error
								? error.message
								: "Neizdevās ielādēt aktus.",
					}),
				)
				.finally(() => pending.delete(siteId));
			pending.set(siteId, request);
			return request;
		},
	};
}
