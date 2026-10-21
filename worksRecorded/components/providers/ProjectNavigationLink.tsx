"use client";

import Link from "next/link";
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

	useEffect(() => {
		if (!opening) return;
		const timeout = window.setTimeout(() => setOpening(false), 10_000);
		return () => window.clearTimeout(timeout);
	}, [opening]);

	function handleClick(event: MouseEvent<HTMLAnchorElement>) {
		if (opening) {
			event.preventDefault();
			return;
		}

		setOpening(true);
		if (currentProjectId !== projectId) resetProgress();
		setProject(projectId, projectName);
		try {
			window.localStorage.setItem("projectName", projectName);
		} catch {}
	}

	return (
		<>
			<Link
				href={`/dashboard/sites/${projectId}/dashboard`}
				onClick={handleClick}
				aria-busy={opening}
				className="text-primary underline-offset-4 hover:underline"
			>
				{projectName}
			</Link>
			{opening ? (
				<ProjectOpeningOverlay label={loadingLabel} siteId={projectId} />
			) : null}
		</>
	);
}
