import { useSyncExternalStore } from "react";
import type { LimeniProjectSnapshot } from "@/flows/default-construction/visual/project-snapshot-store";
import { getData, subscribe } from "./store";
export function useLimeniProjectData() {
	const data = useSyncExternalStore(subscribe, getData, getData);
	return {
		enabled: true,
		checkingCache: false,
		restored: true,
		snapshot: data.snapshot as unknown as LimeniProjectSnapshot,
		failed: false,
		denied: false,
		persistence: undefined,
	};
}
export function LimeniProjectData({ children }: { children: React.ReactNode }) {
	return children;
}
