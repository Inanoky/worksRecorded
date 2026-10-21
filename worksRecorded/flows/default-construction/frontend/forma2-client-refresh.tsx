"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext } from "react";

export const Forma2RefreshContext = createContext<(() => void) | null>(null);
export const FORMA2_CHANGED = "works-recorded:forma2-changed";

export function useForma2Refresh(siteId: string) {
	const refresh = useContext(Forma2RefreshContext);
	const router = useRouter();
	return useCallback(() => {
		window.dispatchEvent(
			new CustomEvent(FORMA2_CHANGED, { detail: { siteId } }),
		);
		if (!refresh) router.refresh();
	}, [refresh, router, siteId]);
}
