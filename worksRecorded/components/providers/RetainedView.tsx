"use client";

import { Activity, createContext, type ReactNode, useContext } from "react";

const Visibility = createContext<boolean | null>(null);

export function RetainedView({
	active,
	children,
}: {
	active: boolean;
	children: ReactNode;
}) {
	return (
		<Visibility.Provider value={active}>
			<div hidden={!active} inert={!active}>
				{children}
			</div>
		</Visibility.Provider>
	);
}

export function useRetainedViewActive() {
	return useContext(Visibility) ?? true;
}

export function RetainedViewPortal({ children }: { children: ReactNode }) {
	const active = useContext(Visibility);
	return active === null ? (
		children
	) : (
		<Activity mode={active ? "visible" : "hidden"}>{children}</Activity>
	);
}
