"use client";

import { usePathname } from "next/navigation";
import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useState,
	useSyncExternalStore,
} from "react";
import { getFimaWarehouseAvailability } from "@/server/actions/fima-warehouse";

type Material = Awaited<
	ReturnType<typeof getFimaWarehouseAvailability>
>[number];
type Snapshot = {
	rows: Material[];
	loading: boolean;
	error: string;
	loadedAt: string | null;
};
const empty: Snapshot = { rows: [], loading: false, error: "", loadedAt: null };
function createStore() {
	const entries = new Map<string, Snapshot>();
	const pending = new Map<string, Promise<void>>();
	const listeners = new Set<() => void>();
	const publish = (siteId: string, value: Snapshot) => {
		entries.set(siteId, value);
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
		load: (siteId: string, force = false) => {
			const inFlight = pending.get(siteId);
			if (inFlight) return inFlight;
			const current = entries.get(siteId) ?? empty;
			if (
				!force &&
				current.loadedAt &&
				Date.now() - Date.parse(current.loadedAt) < 5 * 60 * 1000
			)
				return Promise.resolve();
			publish(siteId, { ...current, loading: true, error: "" });
			const request = getFimaWarehouseAvailability(siteId)
				.then((rows) =>
					publish(siteId, {
						rows,
						loading: false,
						error: "",
						loadedAt: new Date().toISOString(),
					}),
				)
				.catch((cause) =>
					publish(siteId, {
						...current,
						loading: false,
						error:
							cause instanceof Error
								? cause.message
								: "Neizdevās ielādēt BIS materiālus.",
					}),
				)
				.finally(() => pending.delete(siteId));
			pending.set(siteId, request);
			return request;
		},
	};
}
const Context = createContext<ReturnType<typeof createStore> | null>(null);
export function FimaWarehouseProvider({ children }: { children: ReactNode }) {
	const [store] = useState(createStore);
	return <Context.Provider value={store}>{children}</Context.Provider>;
}
export function useFimaWarehouseAvailability(
	siteId: string,
	enabled = true,
	{ refreshStale = true }: { refreshStale?: boolean } = {},
) {
	const provided = useContext(Context);
	const [fallback] = useState(createStore);
	const store = provided ?? fallback;
	const getSnapshot = useCallback(() => store.get(siteId), [store, siteId]);
	const state = useSyncExternalStore(store.subscribe, getSnapshot, () => empty);
	useEffect(() => {
		if (enabled && siteId && (refreshStale || !store.get(siteId).loadedAt))
			void store.load(siteId);
	}, [store, siteId, enabled, refreshStale]);
	const refresh = useCallback(() => store.load(siteId, true), [store, siteId]);
	return { ...state, refresh };
}
export function FimaWarehousePreload({ siteId }: { siteId: string }) {
	useFimaWarehouseAvailability(siteId);
	return null;
}

export function FimaProjectWarehousePreload({
	siteIds,
}: {
	siteIds: string[];
}) {
	const pathname = usePathname();
	const siteId = /^\/dashboard\/sites\/([^/]+)(?:\/|$)/.exec(pathname)?.[1];
	return siteId && siteIds.includes(siteId) ? (
		<FimaWarehousePreload key={siteId} siteId={siteId} />
	) : null;
}
