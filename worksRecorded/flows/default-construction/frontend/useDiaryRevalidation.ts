"use client";

import { useEffect, useRef, useState } from "react";
import { DIARY_RECORD_UPDATED } from "../lib/diary-record-updated-event";

export function useDiaryRevalidation({
	enabled,
	active,
	blocked,
	lastLoaded,
	refresh,
	siteId,
}: {
	enabled: boolean;
	active: boolean;
	blocked: boolean;
	lastLoaded: { current: number };
	refresh: () => Promise<unknown>;
	siteId?: string;
}) {
	const pending = useRef(false);
	const lastAttempt = useRef(0);
	const [error, setError] = useState(false);
	const [invalidated, setInvalidated] = useState(false);
	useEffect(() => {
		const changed = (event: Event) => {
			if ((event as CustomEvent<{ siteId: string }>).detail.siteId !== siteId)
				return;
			lastLoaded.current = 0;
			lastAttempt.current = 0;
			setInvalidated(true);
		};
		window.addEventListener(DIARY_RECORD_UPDATED, changed);
		return () => window.removeEventListener(DIARY_RECORD_UPDATED, changed);
	}, [siteId, lastLoaded]);
	useEffect(() => {
		if (!enabled || !active || blocked) return;
		let cancelled = false;
		async function check() {
			if (
				cancelled ||
				document.visibilityState === "hidden" ||
				pending.current ||
				Date.now() - lastAttempt.current < 60_000 ||
				(!invalidated && Date.now() - lastLoaded.current < 60_000)
			)
				return;
			pending.current = true;
			lastAttempt.current = Date.now();
			try {
				await refresh();
				if (!cancelled) {
					setError(false);
					setInvalidated(false);
				}
			} catch {
				if (!cancelled) setError(true);
			} finally {
				pending.current = false;
			}
		}
		void check();
		const timer = window.setInterval(check, 60_000);
		window.addEventListener("focus", check);
		document.addEventListener("visibilitychange", check);
		return () => {
			cancelled = true;
			window.clearInterval(timer);
			window.removeEventListener("focus", check);
			document.removeEventListener("visibilitychange", check);
		};
	}, [enabled, active, blocked, lastLoaded, refresh, invalidated]);
	return error;
}
