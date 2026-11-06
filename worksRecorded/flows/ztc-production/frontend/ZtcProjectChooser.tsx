"use client";

import Image from "next/image";
import { memo } from "react";
import { FimaProjectNavigationLink } from "@/components/fima/FimaProjectNavigationLink";
import { getJoyRideSteps } from "@/components/joyride/JoyRideSteps";
import TourRunner from "@/components/joyride/TourRunner";
import { RetainedViewPortal } from "@/components/providers/RetainedView";
import { buttonVariants } from "@/components/ui/button";
import {
	Card,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { getDashboardMessages } from "@/lib/dashboard-i18n";
import DefaultImage from "@/public/default.png";
import type { ZtcNavigationProject } from "./ZtcNavigationContext";

export const ZtcProjectChooser = memo(function ZtcProjectChooser({
	projects,
	language,
}: {
	projects: ZtcNavigationProject[];
	language: string | null;
}) {
	const t = getDashboardMessages(language);
	return (
		<div data-performance-ready="projects-list">
			{projects.length ? (
				<RetainedViewPortal>
					<TourRunner
						steps={getJoyRideSteps(language).steps_dashboard_sites_open_project}
						stepName="steps_dashboard_sites_open_project"
					/>
				</RetainedViewPortal>
			) : null}
			<h1 className="text-2xl font-semibold mb-5">{t.yourSites}</h1>
			{projects.length ? (
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 auto-rows-fr">
					{projects.map((project) => (
						<Card
							key={project.id}
							className="pt-0 flex flex-col h-full min-h-[380px]"
						>
							<Image
								src={project.imageUrl ?? DefaultImage}
								alt={project.name}
								className="rounded-t-lg object-cover w-full h-[200px]"
								width={400}
								height={200}
							/>
							<CardHeader>
								<CardTitle className="truncate">{project.name}</CardTitle>
								<CardDescription className="line-clamp-3">
									{project.description}
								</CardDescription>
							</CardHeader>
							<CardFooter className="mt-auto" data-tour="dashboard/page">
								<FimaProjectNavigationLink
									href={`/dashboard/sites/${project.id}/dashboard`}
									className={buttonVariants({ className: "w-full" })}
								>
									{t.openProject}
								</FimaProjectNavigationLink>
							</CardFooter>
						</Card>
					))}
				</div>
			) : (
				<div className="rounded-lg border border-dashed p-8 text-center">
					<h2 className="text-lg font-semibold">{t.emptyTitle}</h2>
					<p className="mt-2 text-sm text-muted-foreground">
						{t.emptyDescription}
					</p>
				</div>
			)}
		</div>
	);
});
