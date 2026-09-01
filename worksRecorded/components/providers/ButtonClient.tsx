"use client";

import { Loader2 } from "lucide-react";
import { type MouseEvent, useEffect, useState } from "react";
import { ProjectOpeningOverlay } from "@/components/providers/ProjectOpeningOverlay";
import { useProject } from "@/components/providers/ProjectProvider";
import { Button } from "@/components/ui/button";

type CommonProps = {
	label?: string;
	loadingLabel?: string;
};

type Props = CommonProps &
	(
		| {
				projectId: string;
				projectName: string;
				href?: never;
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
}: Props) {
	const { setProject } = useProject();
	const [opening, setOpening] = useState(false);
	const href = destination ?? `/dashboard/sites/${projectId}/dashboard`;

	useEffect(() => {
		if (!opening) return;
		const timeout = window.setTimeout(() => setOpening(false), 10_000);
		return () => window.clearTimeout(timeout);
	}, [opening]);

	const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
		if (opening) {
			event.preventDefault();
			return;
		}
		setOpening(true);
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
				<a href={href} onClick={handleClick}>
					{opening ? (
						<span className="inline-flex items-center gap-2">
							<Loader2 className="size-4 animate-spin" />
							{loadingLabel}
						</span>
					) : (
						label
					)}
				</a>
			</Button>
			{opening ? <ProjectOpeningOverlay label={loadingLabel} /> : null}
		</>
	);
}
