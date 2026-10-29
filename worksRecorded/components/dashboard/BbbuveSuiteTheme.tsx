"use client";

import { useEffect } from "react";

export function BbbuveSuiteTheme({ enabled }: { enabled: boolean }) {
	useEffect(() => {
		if (!enabled) return;
		document.documentElement.dataset.bbbuveSuite = "true";
		return () => {
			delete document.documentElement.dataset.bbbuveSuite;
		};
	}, [enabled]);
	return null;
}
