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

export type DashboardNavigationProject = {
	id: string;
	name: string;
	fimaActsEnabled?: boolean;
	fimaForma2Enabled?: boolean;
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
	fimaCollaborationEnabled?: boolean;
	availableProjects?: readonly DashboardNavigationProject[];
	organizationId?: string | null;
	organizationLanguage?: string | null;
	canAccessAiEvals?: boolean;
	canAccessFlowConfigAdmin?: boolean;
	flowModuleKey?: FlowModuleKey | null;
};

type ProjectNavigationRuntime = Awaited<
	ReturnType<typeof getProjectNavigationRuntimeForSite>
>;

const projectNavigationRuntimeCache = new Map<
	string,
	Promise<ProjectNavigationRuntime>
>();

export function useDashboardNavigation({
	fimaCollaborationEnabled = false,
	availableProjects,
	organizationId,
	organizationLanguage,
	canAccessAiEvals = false,
	canAccessFlowConfigAdmin = false,
	flowModuleKey = null,
}: DashboardNavigationOptions) {
	const { projectId, projectName, setProject } = useProject();
	const pathname = usePathname();
	const router = useRouter();
	const pathProjectId = getProjectIdFromPathname(pathname);
	const activeProjectId = pathProjectId || projectId;
	const [navigationRuntime, setNavigationRuntime] = useState<{
		siteId: string;
		data: ProjectNavigationRuntime;
	} | null>(null);
	const isProjectRoute = /^\/dashboard\/sites\/[^/]+/.test(pathname);
	const languageLabel = normalizeLanguageLabel(organizationLanguage);
	const knownProject = availableProjects?.find(
		(project) => project.id === activeProjectId,
	);
	const preloadedFimaName =
		knownProject?.fimaActsEnabled || knownProject?.fimaForma2Enabled
			? knownProject.name
			: "";
	const runtime =
		navigationRuntime?.siteId === activeProjectId
			? navigationRuntime.data
			: null;
	const productionNavigationConfig = runtime?.productionConfig ?? null;
	const activeFlowModuleKey =
		runtime?.flowModuleKey ??
		(knownProject?.fimaForma2Enabled
			? FLOW_MODULE_KEYS.DEFAULT_CONSTRUCTION
			: null);
	const showAnalytics =
		activeFlowModuleKey === FLOW_MODULE_KEYS.DEFAULT_CONSTRUCTION;
	const showVisual = runtime?.visualEnabled === true;
	const showFimaActs =
		fimaCollaborationEnabled && knownProject?.fimaActsEnabled === true;
	const activeProjectName =
		activeProjectId === projectId && projectName
			? projectName
			: runtime?.siteName || preloadedFimaName;

	const globalNavLinks = useMemo<ResolvedGlobalNavLink[]>(
		() =>
			getNavLinks(organizationLanguage, {
				canAccessAiEvals,
				canAccessFlowConfigAdmin,
				flowModuleKey,
				organizationId,
			}).map((item) => ({
				...item,
				isActive: pathname === item.href,
			})),
		[
			canAccessAiEvals,
			canAccessFlowConfigAdmin,
			flowModuleKey,
			organizationId,
			organizationLanguage,
			pathname,
		],
	);

	const baseProjectNavLinks = useMemo(
		() =>
			getProjectNavLinks(organizationLanguage, {
				showAnalytics,
				showVisual,
				showFimaActs,
			}),
		[organizationLanguage, showAnalytics, showVisual, showFimaActs],
	);

	useEffect(() => {
		if (!activeProjectId || !isProjectRoute) return;
		let cancelled = false;

		getProjectNavigationRuntime(activeProjectId)
			.then((runtime) => {
				if (cancelled) return;
				setNavigationRuntime({ siteId: activeProjectId, data: runtime });
				if (runtime?.siteName && activeProjectId !== projectId && !projectId) {
					setProject(activeProjectId, runtime.siteName);
				}
			})
			.catch(() => {
				if (cancelled) return;
				setNavigationRuntime({ siteId: activeProjectId, data: null });
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
