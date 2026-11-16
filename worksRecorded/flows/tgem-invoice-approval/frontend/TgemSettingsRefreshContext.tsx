"use client";

import { createContext, useContext } from "react";

export const TgemSettingsRefreshContext = createContext<
	(() => Promise<void>) | null
>(null);

export function useTgemSettingsRefresh() {
	return useContext(TgemSettingsRefreshContext);
}
