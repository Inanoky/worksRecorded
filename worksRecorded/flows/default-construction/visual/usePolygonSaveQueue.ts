"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { saveVisualPolygonPatch } from "./actions";
import type { PolygonSaveResult } from "./polygon-edit";
import { PolygonSaveQueue } from "./polygon-save-queue";

export function usePolygonSaveQueue(
	siteId: string,
	userId: string | undefined,
	onSaved: (result: PolygonSaveResult) => void,
) {
	const queue = useMemo(
		() =>
			new PolygonSaveQueue(
				(drawingId, edit) => saveVisualPolygonPatch(siteId, drawingId, edit),
				onSaved,
				userId,
			),
		[siteId, userId, onSaved],
	);
	const state = useSyncExternalStore(
		queue.subscribe,
		queue.getSnapshot,
		queue.getSnapshot,
	);
	useEffect(() => {
		if (!userId) return;
		const key = `limeni.visual.polygon-saves:v1:${userId}:${siteId}`;
		try {
			queue.attachStorage(sessionStorage.getItem(key), (value) => {
				if (value) sessionStorage.setItem(key, value);
				else sessionStorage.removeItem(key);
			});
		} catch {}
		return () => queue.detachStorage();
	}, [siteId, userId, queue]);
	useEffect(() => {
		if (!state.items.length) return;
		const beforeUnload = (event: BeforeUnloadEvent) => {
			event.preventDefault();
			event.returnValue = "";
		};
		const leaving = (event: MouseEvent) => {
			if (!(event.target instanceof Element)) return;
			const anchor = event.target.closest("a[href]");
			if (
				!(anchor instanceof HTMLAnchorElement) ||
				anchor.target === "_blank" ||
				anchor.hasAttribute("download") ||
				event.ctrlKey ||
				event.metaKey ||
				event.shiftKey ||
				event.altKey ||
				event.button !== 0
			)
				return;
			const target = new URL(anchor.href, window.location.href);
			if (
				target.origin === window.location.origin &&
				(target.pathname === `/dashboard/sites/${siteId}` ||
					target.pathname.startsWith(`/dashboard/sites/${siteId}/`))
			)
				return;
			if (
				!window.confirm(
					"Ir nesaglabāti zonu labojumi. Vai tiešām vēlaties atstāt projektu?",
				)
			) {
				event.preventDefault();
				event.stopPropagation();
			}
		};
		window.addEventListener("beforeunload", beforeUnload);
		document.addEventListener("click", leaving, true);
		return () => {
			window.removeEventListener("beforeunload", beforeUnload);
			document.removeEventListener("click", leaving, true);
		};
	}, [siteId, state.items.length]);
	return { queue, state };
}
