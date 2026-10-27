"use client";

import { useEffect } from "react";

export function LimeniSuiteTheme({ enabled }: { enabled: boolean }) {
	useEffect(() => {
		if (!enabled) return;
		document.documentElement.dataset.limeniSuite = "true";
		return () => {
			delete document.documentElement.dataset.limeniSuite;
		};
	}, [enabled]);
	return null;
}
