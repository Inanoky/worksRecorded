"use client";

import { createContext, useContext } from "react";

export type ZtcNavigationProject = {
	id: string;
	name: string;
	description: string | null;
	imageUrl: string | null;
};

export const ZtcNavigationContext = createContext<{
	canNavigate: (href: string) => boolean;
	navigate: (
		href: string,
		options?: { replace?: boolean; scroll?: boolean },
	) => boolean;
} | null>(null);

export function useZtcNavigation() {
	return useContext(ZtcNavigationContext);
}

export function ztcNavigationTarget(
	href: string,
	projects: readonly ZtcNavigationProject[],
) {
	if (href === "/dashboard" || href === "/dashboard/sites")
		return { href: "/dashboard", siteId: null };
	const match = /^\/dashboard\/sites\/([^/]+)\/dashboard$/.exec(href);
	const project = match && projects.find((item) => item.id === match[1]);
	return project ? { href, siteId: project.id } : null;
}
