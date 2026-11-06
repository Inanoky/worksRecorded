"use client";

import { FimaProjectNavigationLink } from "@/components/fima/FimaProjectNavigationLink";
import { useWorkspaceNavigation } from "@/components/projects/WorkspaceNavigation";
import type { MouseEvent } from "react";
import { useEffect, useState } from "react";
import { ProjectOpeningOverlay } from "@/components/providers/ProjectOpeningOverlay";
import { useProject } from "@/components/providers/ProjectProvider";
import { useProjectPreparationReset } from "./ProjectLoadingProgressProvider";

type ProjectNavigationLinkProps = {
	projectId: string;
	projectName: string;
	loadingLabel: string;
};

export function ProjectNavigationLink({
	projectId,
	projectName,
	loadingLabel,
}: ProjectNavigationLinkProps) {
	const { setProject, projectId: currentProjectId } = useProject();
	const resetProgress = useProjectPreparationReset(projectId);
	const [opening, setOpening] = useState(false);
	const workspace = useWorkspaceNavigation();
	const href = workspace?.store.preferredHref(projectId, `/dashboard/sites/${projectId}/dashboard`) ?? `/dashboard/sites/${projectId}/dashboard`;
	const cached = workspace?.store.hasRoute(href) ?? false;

	useEffect(() => {
		if (!opening) return;
		const timeout = window.setTimeout(() => setOpening(false), 10_000);
		return () => window.clearTimeout(timeout);
	}, [opening]);

	function handleClick(event: MouseEvent<HTMLAnchorElement>) {
		if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
		if (opening) {
			event.preventDefault();
			return;
		}

		if (!cached) setOpening(true);
		if (!cached && currentProjectId !== projectId) resetProgress();
		setProject(projectId, projectName);
		try {
			window.localStorage.setItem("projectName", projectName);
		} catch {}
	}

	return (
		<>
			<FimaProjectNavigationLink
				href={href}
				onClick={handleClick}
				aria-busy={opening}
				className="text-primary underline-offset-4 hover:underline"
			>
				{projectName}
			</FimaProjectNavigationLink>
			{opening ? (
				<ProjectOpeningOverlay label={loadingLabel} siteId={projectId} />
			) : null}
		</>
	);
}
