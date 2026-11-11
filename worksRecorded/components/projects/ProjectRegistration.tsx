"use client";

import { usePathname, useSearchParams } from "next/navigation";
import type { LimeniProjectSnapshot } from "@/flows/default-construction/visual/project-snapshot-store";
import {
	createContext,
	type ReactNode,
	useContext,
	useLayoutEffect,
} from "react";
import { WorkspaceNavigationContext } from "./WorkspaceNavigation";
import {
	retainProjectFlow,
	type WorkspaceDescriptor,
	type WorkspaceStore,
} from "./workspace-store";

const Registration = createContext<WorkspaceDescriptor | null>(null);
export function RegisterWorkspaceRoot({
	href,
	enabled = true,
	children,
}: {
	href: string;
	enabled?: boolean;
	children: ReactNode;
}) {
	const context = useContext(WorkspaceNavigationContext);
	useLayoutEffect(() => {
		if (context && enabled) context.store.registerRoot(href, children);
	}, [context, enabled, href, children]);
	return context && enabled ? null : children;
}
export function RegisterProjectWorkspace({
	descriptor,
	children,
}: {
	descriptor: WorkspaceDescriptor;
	children: ReactNode;
}) {
	const context = useContext(WorkspaceNavigationContext);
	const enabled = !!context && retainProjectFlow(descriptor.flowModuleKey);
	useLayoutEffect(() => {
		if (enabled) context.store.register(descriptor);
	}, [enabled, context, descriptor]);
	return (
		<Registration.Provider value={enabled ? descriptor : null}>
			{children}
		</Registration.Provider>
	);
}
export function RegisterProjectPage({
	siteId,
	href,
	children,
	initialDiary,
}: {
	siteId: string;
	href: string;
	children: ReactNode;
	initialDiary?: LimeniProjectSnapshot;
}) {
	const context = useContext(WorkspaceNavigationContext);
	const descriptor = useContext(Registration);
	if (!context || descriptor?.siteId !== siteId) return children;
	return (
		<ManagedPage
			store={context.store}
			descriptor={descriptor}
			href={href}
			initialDiary={initialDiary}
		>
			{children}
		</ManagedPage>
	);
}
function ManagedPage({
	store,
	descriptor,
	href,
	children,
	initialDiary,
}: {
	store: WorkspaceStore;
	descriptor: WorkspaceDescriptor;
	href: string;
	children: ReactNode;
	initialDiary?: LimeniProjectSnapshot;
}) {
	const pathname = usePathname();
	const query = useSearchParams().toString();
	const current = `${pathname}${query ? `?${query}` : ""}`;
	useLayoutEffect(() => {
		store.registerRoute(
			descriptor,
			href,
			children,
			current === href,
			initialDiary,
		);
	}, [store, descriptor, href, current, children, initialDiary]);
	return null;
}
