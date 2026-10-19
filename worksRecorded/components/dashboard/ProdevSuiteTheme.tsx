"use client";

import { useEffect } from "react";

export function ProdevSuiteTheme({ enabled }: { enabled: boolean }) {
	useEffect(() => {
		if (!enabled) return;
		document.documentElement.dataset.prodevSuite = "true";
		return () => {
			delete document.documentElement.dataset.prodevSuite;
		};
	}, [enabled]);
	return null;
}
