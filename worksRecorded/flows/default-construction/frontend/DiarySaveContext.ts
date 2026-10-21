"use client";

import {
	createContext,
	useContext,
	useEffect,
	useMemo,
	useSyncExternalStore,
} from "react";
import type {
	DiarySaveQueue,
	DiarySaveSnapshot,
} from "../lib/diary-save-queue";

const emptySnapshot: DiarySaveSnapshot = {
	items: [],
	savingId: null,
	error: null,
	lastSavedAt: null,
	confirmed: { rows: [], createdIds: [] },
	confirmedRevisions: {},
	revision: 0,
};
const subscribeEmpty = () => () => {};
export const getEmpty = () => emptySnapshot;
export const Context = createContext<
	((siteId: string) => DiarySaveQueue | null) | null
>(null);

export function useDiarySaveQueue(siteId: string | null, enabled: boolean) {
	const get = useContext(Context);
	const queue = useMemo(
		() => (enabled && siteId ? (get?.(siteId) ?? null) : null),
		[get, siteId, enabled],
	);
	const snapshot = useSyncExternalStore(
		queue?.subscribe ?? subscribeEmpty,
		queue?.getSnapshot ?? getEmpty,
		getEmpty,
	);
	useEffect(() => {
		if (queue)
			window.dispatchEvent(new Event("construction-diary-queue-created"));
	}, [queue]);
	return { queue, snapshot };
}
