"use client";

import { createContext, type ReactNode, useContext } from "react";

const Context = createContext(false);

export function ProjectLoadingProgressProvider({
	enabled,
	children,
}: {
	enabled: boolean;
	children: ReactNode;
}) {
	return <Context.Provider value={enabled}>{children}</Context.Provider>;
}

export function useProjectLoadingProgress() {
	return useContext(Context);
}
