"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext } from "react";

export const SettingsRefreshContext = createContext<(() => void) | null>(null);

export function useRefreshSettings() {
	const refresh = useContext(SettingsRefreshContext);
	const { refresh: refreshRoute } = useRouter();
	return useCallback(() => {
		if (refresh) refresh();
		else refreshRoute();
	}, [refresh, refreshRoute]);
}
