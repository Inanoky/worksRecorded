"use client";

import { Loader2 } from "lucide-react";
import { type MouseEvent, useEffect, useRef, useState } from "react";
import { FimaProjectNavigationLink } from "@/components/fima/FimaProjectNavigationLink";
import { useWorkspaceNavigation } from "@/components/projects/WorkspaceNavigation";
import { ProjectOpeningOverlay } from "@/components/providers/ProjectOpeningOverlay";
import { useProject } from "@/components/providers/ProjectProvider";
import { Button } from "@/components/ui/button";
import { prefetchConstructionProjectBootstrap } from "@/flows/default-construction/visual/project-sync-client";
import {
	loadOzoluClient,
	openOzoluProject,
} from "@/flows/demo/client/OzoluClient";
import { DEMO_SITE_ID } from "@/flows/demo/constants";
import { useProjectPreparationReset } from "./ProjectLoadingProgressProvider";

type CommonProps = {
	label?: string;
	loadingLabel?: string;
	prefetchConstructionBootstrap?: boolean;
	constructionBootstrapClickOnly?: boolean;
};

type Props = CommonProps &
	(
		| {
				projectId: string;
				projectName: string;
				href?: string;
		  }
		| {
				href: string;
				projectId?: never;
				projectName?: never;
		  }
	);

export default function OpenProjectButton({
	projectId,
	projectName,
	href: destination,
	label = "Open Project",
	loadingLabel = "Opening project...",
	prefetchConstructionBootstrap = false,
	constructionBootstrapClickOnly = false,
}: Props) {
	const { setProject, projectId: currentProjectId } = useProject();
	const resetProgress = useProjectPreparationReset(projectId ?? "");
	const [opening, setOpening] = useState(false);
	const workspace = useWorkspaceNavigation();
	const fallbackHref =
		destination ??
		(projectId ? `/dashboard/sites/${projectId}/dashboard` : "/dashboard");
	const href =
		!destination && projectId
			? (workspace?.store.preferredHref(projectId, fallbackHref) ??
				fallbackHref)
			: fallbackHref;
	const cached = workspace?.store.hasRoute(href) ?? false;
	const ozolu = projectId === DEMO_SITE_ID;
	const intentTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const canPrepareBootstrap = Boolean(
		prefetchConstructionBootstrap &&
			!constructionBootstrapClickOnly &&
			projectId &&
			!destination &&
			!cached &&
			!ozolu,
	);
	const clearIntentTimer = () => {
		if (!intentTimer.current) return;
		clearTimeout(intentTimer.current);
		intentTimer.current = null;
	};
	const prepareBootstrap = () => {
		clearIntentTimer();
		if (canPrepareBootstrap && projectId)
			void prefetchConstructionProjectBootstrap(projectId);
	};
	const scheduleBootstrap = () => {
		clearIntentTimer();
		if (!canPrepareBootstrap) return;
		intentTimer.current = setTimeout(prepareBootstrap, 180);
	};
	useEffect(() => {
		if (ozolu) void loadOzoluClient();
	}, [ozolu]);

	useEffect(
		() => () => {
			if (intentTimer.current) clearTimeout(intentTimer.current);
		},
		[],
	);

	useEffect(() => {
		if (!opening) return;
		const timeout = window.setTimeout(() => setOpening(false), 10_000);
		return () => window.clearTimeout(timeout);
	}, [opening]);

	const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
		if (
			event.button !== 0 ||
			event.ctrlKey ||
			event.metaKey ||
			event.shiftKey ||
			event.altKey
		)
			return;
		if (ozolu) {
			event.preventDefault();
			openOzoluProject();
			return;
		}
		if (opening) {
			event.preventDefault();
			return;
		}
		prepareBootstrap();
		if (!cached) setOpening(true);
		if (!cached && projectId && currentProjectId !== projectId) resetProgress();
		if (projectId && projectName) {
			setProject(projectId, projectName);
			try {
				window.localStorage.setItem("projectName", projectName);
			} catch {}
		}
	};

	return (
		<>
			<Button
				asChild
				className="w-full active:scale-95 active:bg-muted transition-transform"
				aria-disabled={opening}
			>
				<FimaProjectNavigationLink
					href={href}
					onClick={handleClick}
					onFocus={
						constructionBootstrapClickOnly ? undefined : scheduleBootstrap
					}
					onBlur={constructionBootstrapClickOnly ? undefined : clearIntentTimer}
					onMouseEnter={
						constructionBootstrapClickOnly ? undefined : scheduleBootstrap
					}
					onMouseLeave={
						constructionBootstrapClickOnly ? undefined : clearIntentTimer
					}
					onTouchStart={
						constructionBootstrapClickOnly ? undefined : prepareBootstrap
					}
				>
					{opening ? (
						<span className="inline-flex items-center gap-2">
							<Loader2 className="size-4 animate-spin" />
							{loadingLabel}
						</span>
					) : (
						label
					)}
				</FimaProjectNavigationLink>
			</Button>
			{opening ? (
				<ProjectOpeningOverlay label={loadingLabel} siteId={projectId} />
			) : null}
		</>
	);
}
