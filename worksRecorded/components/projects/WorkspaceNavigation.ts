"use client";

import { createContext, useContext, useSyncExternalStore } from "react";
import type { WorkspaceStore } from "./workspace-store";

export const WorkspaceNavigationContext = createContext<{
	store: WorkspaceStore;
	navigate: (
		href: string,
		options?: { replace?: boolean; scroll?: boolean },
	) => boolean;
} | null>(null);
const subscribeEmpty = () => () => {};
const empty: readonly unknown[] = [];
const getEmpty = () => empty;
export function useWorkspaceNavigation() {
	const value = useContext(WorkspaceNavigationContext);
	useSyncExternalStore(
		value?.store.subscribe ?? subscribeEmpty,
		value?.store.getSnapshot ?? getEmpty,
		getEmpty,
	);
	return value;
}
