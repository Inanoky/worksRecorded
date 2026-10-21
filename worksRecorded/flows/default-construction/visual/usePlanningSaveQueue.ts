"use client";

import { useEffect, useSyncExternalStore } from "react";
import { saveVisualPlanningItem } from "./actions";
import type { VisualClientCache } from "./visual-client-cache";

export function usePlanningSaveQueue(
	cache: VisualClientCache,
	siteId: string,
	userId?: string,
) {
	const queue = cache.getPlanningSaveQueue(saveVisualPlanningItem);
	const state = useSyncExternalStore(
		queue.subscribe,
		queue.getSnapshot,
		queue.getSnapshot,
	);
	useEffect(() => {
		if (!userId) return;
		const key = `limeni.visual.planning-saves:v1:${userId}:${siteId}`;
		try {
			queue.attachStorage(sessionStorage.getItem(key), (value) => {
				if (value) sessionStorage.setItem(key, value);
				else sessionStorage.removeItem(key);
			});
		} catch {}
		return () => queue.detachStorage();
	}, [queue, siteId, userId]);
	useEffect(() => {
		if (!state.length) return;
		const beforeUnload = (event: BeforeUnloadEvent) => {
			event.preventDefault();
			event.returnValue = "";
		};
		window.addEventListener("beforeunload", beforeUnload);
		return () => window.removeEventListener("beforeunload", beforeUnload);
	}, [state.length]);
	return { queue, state };
}
