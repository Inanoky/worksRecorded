"use client";

import { useEffect, useRef, useState } from "react";

export function useDiaryRevalidation({
	enabled,
	active,
	blocked,
	lastLoaded,
	refresh,
}: {
	enabled: boolean;
	active: boolean;
	blocked: boolean;
	lastLoaded: { current: number };
	refresh: () => Promise<unknown>;
}) {
	const pending = useRef(false);
	const lastAttempt = useRef(0);
	const [error, setError] = useState(false);
	useEffect(() => {
		if (!enabled || !active || blocked) return;
		let cancelled = false;
		async function check() {
			if (
				cancelled ||
				document.visibilityState === "hidden" ||
				pending.current ||
				Date.now() - lastAttempt.current < 60_000 ||
				Date.now() - lastLoaded.current < 60_000
			)
				return;
			pending.current = true;
			lastAttempt.current = Date.now();
			try {
				await refresh();
				if (!cancelled) setError(false);
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
	}, [enabled, active, blocked, lastLoaded, refresh]);
	return error;
}
