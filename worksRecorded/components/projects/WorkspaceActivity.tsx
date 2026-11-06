"use client";

import {
	Activity,
	createContext,
	type ReactNode,
	useContext,
	useEffect,
	useId,
} from "react";

export const WorkspaceActivityContext = createContext({
	active: true,
	managed: false,
	protect: (_token: string, _dirty: boolean) => {},
});
const ViewActivity = createContext(true);
export function useWorkspaceActive() {
	return useContext(WorkspaceActivityContext).active;
}
export function useWorkspaceVisible() {
	const active = useWorkspaceActive();
	const visible = useContext(ViewActivity);
	return active && visible;
}
export function useWorkspaceManaged() {
	return useContext(WorkspaceActivityContext).managed;
}
export function WorkspaceView({
	active,
	children,
}: {
	active: boolean;
	children: ReactNode;
}) {
	return (
		<ViewActivity.Provider value={active}>{children}</ViewActivity.Provider>
	);
}
export function useWorkspaceProtection(dirty: boolean) {
	const { protect } = useContext(WorkspaceActivityContext);
	const token = useId();
	useEffect(() => {
		protect(token, dirty);
		return () => protect(token, false);
	}, [dirty, protect, token]);
}
export function WorkspacePortalActivity({ children }: { children: ReactNode }) {
	const active = useWorkspaceVisible();
	const managed = useWorkspaceManaged();
	return managed ? (
		<Activity mode={active ? "visible" : "hidden"}>{children}</Activity>
	) : (
		children
	);
}
