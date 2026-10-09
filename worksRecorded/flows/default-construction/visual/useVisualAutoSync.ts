"use client";

import { useEffect, useRef } from "react";

export function useVisualAutoSync({
	active,
	scope,
	blocked,
	sync,
}: {
	active: boolean;
	scope: string | null;
	blocked: boolean;
	sync: () => Promise<void>;
}) {
	const latest = useRef({ blocked, sync });
	useEffect(() => {
		latest.current = { blocked, sync };
	}, [blocked, sync]);
	useEffect(() => {
		if (!active || !scope) return;
		let lastStarted = 0;
		let inFlight = false;
		let disposed = false;
		async function update() {
			if (
				disposed ||
				document.visibilityState !== "visible" ||
				latest.current.blocked ||
				inFlight ||
				Date.now() - lastStarted < 10_000
			)
				return;
			lastStarted = Date.now();
			inFlight = true;
			try {
				await latest.current.sync();
			} finally {
				inFlight = false;
			}
		}
		const initial = setTimeout(() => void update(), 1000);
		const interval = setInterval(() => void update(), 30_000);
		const wake = () => void update();
		window.addEventListener("focus", wake);
		document.addEventListener("visibilitychange", wake);
		return () => {
			disposed = true;
			clearTimeout(initial);
			clearInterval(interval);
			window.removeEventListener("focus", wake);
			document.removeEventListener("visibilitychange", wake);
		};
	}, [active, scope]);
}
