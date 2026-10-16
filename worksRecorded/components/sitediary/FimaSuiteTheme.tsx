"use client";

import { useEffect } from "react";

export function FimaSuiteTheme({ enabled }: { enabled: boolean }) {
	useEffect(() => {
		if (!enabled) return;
		document.documentElement.dataset.fimaSuite = "true";
		return () => {
			delete document.documentElement.dataset.fimaSuite;
		};
	}, [enabled]);
	return null;
}
