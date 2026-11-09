"use client";

import { useEffect } from "react";

export function OceltSuiteTheme({ enabled }: { enabled: boolean }) {
	useEffect(() => {
		if (!enabled) return;
		document.documentElement.dataset.oceltSuite = "true";
		return () => {
			delete document.documentElement.dataset.oceltSuite;
		};
	}, [enabled]);
	return null;
}
