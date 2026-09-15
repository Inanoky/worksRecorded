"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useProject } from "@/components/providers/ProjectProvider";
import { getFlowModuleUi } from "@/lib/flows/registry";
import { FLOW_MODULE_KEYS, type FlowModuleKey } from "@/lib/flows/types";
import { getProjectNavigationRuntimeForSite } from "@/lib/production-flow/runtime-server";
import {
	type GlobalNavLink,
	getNavLinks,
	getProjectNavLinks,
	type ProjectNavLink,
} from "./NavLinks";

type FlowNavigationConfig = {
	labels: {
		navigationTitle: string;
		navigationTitleLv: string;
	};
	navigation: {
		hiddenProjectNavPaths: string[];
	};
};

type ResolvedGlobalNavLink = GlobalNavLink & {
	isActive: boolean;
};

type ResolvedProjectNavLink = ProjectNavLink & {
	href: string;
	displayName: string;
	isActive: boolean;
};

type DashboardNavigationOptions = {
	organizationLanguage?: string | null;
	canAccessAiEvals?: boolean;
	canAccessFlowConfigAdmin?: boolean;
};

type ProjectNavigationRuntime = Awaited<
	ReturnType<typeof getProjectNavigationRuntimeForSite>
>;

const projectNavigationRuntimeCache = new Map<
	string,
	Promise<ProjectNavigationRuntime>
>();

export function useDashboardNavigation({
	organizationLanguage,
	canAccessAiEvals = false,
	canAccessFlowConfigAdmin = false,
}: DashboardNavigationOptions) {
	const { projectId, projectName, setProject } = useProject();
	const pathname = usePathname();
	const router = useRouter();
	const pathProjectId = getProjectIdFromPathname(pathname);
	const activeProjectId = pathProjectId || projectId;
	const [productionNavigationConfig, setProductionNavigationConfig] =
		useState<FlowNavigationConfig | null>(null);
	const [activeFlowModuleKey, setActiveFlowModuleKey] =
		useState<FlowModuleKey | null>(null);
	const [showAnalytics, setShowAnalytics] = useState(false);
	const isProjectRoute = /^\/dashboard\/sites\/[^/]+/.test(pathname);
	const languageLabel = normalizeLanguageLabel(organizationLanguage);
	const [runtimeProjectName, setRuntimeProjectName] = useState("");
	const activeProjectName =
		activeProjectId === projectId && projectName
			? projectName
			: runtimeProjectName;

	const globalNavLinks = useMemo<ResolvedGlobalNavLink[]>(
		() =>
			getNavLinks(organizationLanguage, {
				canAccessAiEvals,
				canAccessFlowConfigAdmin,
			}).map((item) => ({
				...item,
				isActive: pathname === item.href,
			})),
		[
			canAccessAiEvals,
			canAccessFlowConfigAdmin,
			organizationLanguage,
			pathname,
		],
	);

	const baseProjectNavLinks = useMemo(
		() =>
			getProjectNavLinks(organizationLanguage, {
				showAnalytics,
			}),
		[organizationLanguage, showAnalytics],
	);

	useEffect(() => {
		let cancelled = false;
		if (!activeProjectId || !isProjectRoute) {
			setProductionNavigationConfig(null);
			setActiveFlowModuleKey(null);
			setShowAnalytics(false);
			setRuntimeProjectName("");
			return;
		}

		getProjectNavigationRuntime(activeProjectId)
			.then((runtime) => {
				if (cancelled) return;
				setProductionNavigationConfig(runtime?.productionConfig ?? null);
				setActiveFlowModuleKey(runtime?.flowModuleKey ?? null);
				setShowAnalytics(
					runtime?.flowModuleKey === FLOW_MODULE_KEYS.DEFAULT_CONSTRUCTION,
				);
				setRuntimeProjectName(runtime?.siteName ?? "");
				if (runtime?.siteName && activeProjectId !== projectId && !projectId) {
					setProject(activeProjectId, runtime.siteName);
				}
			})
			.catch(() => {
				if (cancelled) return;
				setProductionNavigationConfig(null);
				setActiveFlowModuleKey(null);
				setShowAnalytics(false);
				setRuntimeProjectName("");
			});

		return () => {
			cancelled = true;
		};
	}, [activeProjectId, isProjectRoute, projectId, setProject]);

	const flowModuleUi = getFlowModuleUi(activeFlowModuleKey);
	const flowHiddenProjectNavPaths = flowModuleUi.hiddenProjectNavPaths;
	const hiddenProjectNavPaths = useMemo(
		() =>
			new Set([
				...(productionNavigationConfig?.navigation.hiddenProjectNavPaths ?? []),
				...(flowHiddenProjectNavPaths ?? []),
			]),
		[flowHiddenProjectNavPaths, productionNavigationConfig],
	);

	const configuredProductionJournalLabel = productionNavigationConfig
		? languageLabel === "lv"
			? productionNavigationConfig.labels.navigationTitleLv
			: productionNavigationConfig.labels.navigationTitle
		: languageLabel === "lv"
			? "Būvdarbu žurnāls"
			: "Construction journal";
	const flowProjectNavigation = flowModuleUi.projectNavigation;

	const projectNavLinks = useMemo<ResolvedProjectNavLink[]>(
		() =>
			baseProjectNavLinks
				.filter((item) => !hiddenProjectNavPaths.has(item.path))
				.map((item) => {
					const href = `/dashboard/sites/${activeProjectId}/${item.path}`;
					const flowNavigationItem = flowProjectNavigation?.[item.path];
					const flowLabel = flowNavigationItem
						? languageLabel === "lv"
							? flowNavigationItem.labelLv || flowNavigationItem.label
							: flowNavigationItem.label
						: null;
					const flowDescription = flowNavigationItem
						? languageLabel === "lv"
							? flowNavigationItem.descriptionLv ||
								flowNavigationItem.description
							: flowNavigationItem.description
						: null;
					const displayName =
						flowLabel ??
						(item.path === "dashboard"
							? configuredProductionJournalLabel
							: item.name);
					return {
						...item,
						description: flowDescription || item.description,
						href,
						displayName,
						isActive: pathname === href,
					};
				}),
		[
			baseProjectNavLinks,
			configuredProductionJournalLabel,
			flowProjectNavigation,
			hiddenProjectNavPaths,
			languageLabel,
			pathname,
			activeProjectId,
		],
	);

	const primaryProjectNavLinks = useMemo(
		() => projectNavLinks.filter((item) => item.priority === "primary"),
		[projectNavLinks],
	);

	const utilityProjectNavLinks = useMemo(
		() => projectNavLinks.filter((item) => item.priority === "utility"),
		[projectNavLinks],
	);

	useEffect(() => {
		const isAboveProject =
			pathname === "/dashboard" || pathname === "/dashboard/sites";
		if (isAboveProject && (projectId || projectName)) setProject("", "");
	}, [pathname, projectId, projectName, setProject]);

	useEffect(() => {
		globalNavLinks.forEach((item) => {
			router.prefetch(item.href);
		});
		if (!activeProjectId || !isProjectRoute) return;
		projectNavLinks.forEach((item) => {
			router.prefetch(item.href);
		});
	}, [
		activeProjectId,
		globalNavLinks,
		isProjectRoute,
		projectNavLinks,
		router,
	]);

	return {
		globalNavLinks,
		isProjectRoute,
		pathname,
		primaryProjectNavLinks,
		projectId: activeProjectId,
		projectName: activeProjectName,
		projectNavLinks,
		router,
		utilityProjectNavLinks,
	};
}

function getProjectIdFromPathname(pathname: string) {
	return /^\/dashboard\/sites\/([^/]+)/.exec(pathname)?.[1] ?? "";
}

function getProjectNavigationRuntime(projectId: string) {
	const cached = projectNavigationRuntimeCache.get(projectId);
	if (cached) return cached;

	const runtime = getProjectNavigationRuntimeForSite(projectId).catch(
		(error) => {
			projectNavigationRuntimeCache.delete(projectId);
			throw error;
		},
	);
	projectNavigationRuntimeCache.set(projectId, runtime);
	return runtime;
}

function normalizeLanguageLabel(language?: string | null) {
	return String(language ?? "")
		.toLowerCase()
		.startsWith("lv")
		? "lv"
		: "en";
}
