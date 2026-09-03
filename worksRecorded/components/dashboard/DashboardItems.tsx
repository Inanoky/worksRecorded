"use client";

import { Building2, ChevronDown, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useProject } from "@/components/providers/ProjectProvider";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils/utils";
import { getNavLinks } from "./NavLinks";
import { useDashboardNavigation } from "./useDashboardNavigation";

export function DashboardItems({
	organizationLanguage,
	canAccessAiEvals = false,
	canAccessFlowConfigAdmin = false,
}: {
	userEmail?: string | null;
	organizationLanguage?: string | null;
	canAccessAiEvals?: boolean;
	canAccessFlowConfigAdmin?: boolean;
}) {
	const pathname = usePathname();
	const router = useRouter();
	const globalNavLinks = useMemo(
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

	return (
		<div className="flex min-w-0 items-center gap-1">
			{globalNavLinks.map((item) => (
				<Tooltip key={item.name}>
					<TooltipTrigger asChild>
						<Link
							href={item.href}
							prefetch
							aria-label={item.name}
							title={item.name}
							onMouseEnter={() => router.prefetch(item.href)}
							className={cn(
								item.isActive
									? "border-primary/30 bg-primary/10 text-primary"
									: "border-transparent bg-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground",
								"flex h-9 max-w-[240px] shrink-0 items-center gap-2 rounded-md border px-2.5 text-sm transition-colors",
							)}
						>
							<item.icon className="size-4 shrink-0" />
							<span className="hidden min-w-0 truncate xl:inline-block">
								{item.name}
							</span>
						</Link>
					</TooltipTrigger>
					<TooltipContent className="xl:hidden">{item.name}</TooltipContent>
				</Tooltip>
			))}
		</div>
	);
}

export function DashboardProjectNavigation({
	availableProjects = [],
	organizationLanguage,
	canAccessAiEvals = false,
	canAccessFlowConfigAdmin = false,
}: {
	availableProjects?: ProjectSwitcherOption[];
	organizationLanguage?: string | null;
	canAccessAiEvals?: boolean;
	canAccessFlowConfigAdmin?: boolean;
}) {
	const {
		isProjectRoute,
		pathname,
		primaryProjectNavLinks,
		projectId,
		projectName,
		router,
		utilityProjectNavLinks,
	} = useDashboardNavigation({
		organizationLanguage,
		canAccessAiEvals,
		canAccessFlowConfigAdmin,
	});
	const labels = getProjectNavigationLabels(organizationLanguage);
	const { setProject } = useProject();

	if (!projectName || !projectId || !isProjectRoute) return null;

	return (
		<div className="hidden min-h-[54px] w-full items-center gap-2 border-t bg-muted/25 px-4 py-1.5 lg:flex lg:px-8">
			<ProjectSwitcher
				activeProjectId={projectId}
				activeProjectName={projectName}
				availableProjects={availableProjects}
				isActive={isProjectOverviewRoute(projectId, pathname)}
				labels={labels}
				onPrefetch={(href) => router.prefetch(href)}
				onSelectProject={setProject}
				pathname={pathname}
			/>

			<div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
				{primaryProjectNavLinks.map((item) => (
					<ProjectNavLink
						key={item.path}
						item={item}
						onPrefetch={() => router.prefetch(item.href)}
					/>
				))}
			</div>

			{utilityProjectNavLinks.length > 0 ? (
				<div className="hidden shrink-0 items-center gap-1.5 2xl:flex">
					{utilityProjectNavLinks.map((item) => (
						<ProjectNavLink
							key={item.path}
							item={item}
							onPrefetch={() => router.prefetch(item.href)}
							compact
						/>
					))}
				</div>
			) : null}

			{utilityProjectNavLinks.length > 0 ? (
				<ProjectMoreMenu
					labels={labels}
					links={utilityProjectNavLinks}
					onPrefetch={(href) => router.prefetch(href)}
				/>
			) : null}
		</div>
	);
}

type ResolvedProjectLink = ReturnType<
	typeof useDashboardNavigation
>["projectNavLinks"][number];

type ProjectSwitcherOption = {
	id: string;
	name: string;
};

const projectNavItemClasses =
	"inline-flex h-10 min-w-0 items-center gap-2 rounded-lg border px-3.5 text-[13px] font-medium leading-none whitespace-nowrap transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-out focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-green-500/20 focus-visible:border-green-500 active:translate-y-px dark:focus-visible:ring-emerald-400/25 dark:focus-visible:border-emerald-400";
const projectNavItemIdleClasses =
	"border-gray-300 bg-transparent text-gray-600 hover:border-gray-400 hover:bg-transparent hover:text-gray-800 dark:border-slate-600 dark:bg-transparent dark:text-slate-300 dark:hover:border-slate-500 dark:hover:bg-transparent dark:hover:text-slate-100";
const projectNavItemLabelClasses =
	"border-gray-300 bg-transparent text-gray-600 dark:border-slate-600 dark:bg-transparent dark:text-slate-400";
const projectNavItemActiveClasses =
	"border-green-300 bg-green-50 text-green-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] dark:border-emerald-500/45 dark:bg-emerald-500/12 dark:text-emerald-300 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]";
const projectNavIconClasses = "size-4 shrink-0";
const projectNavLabelClasses = "min-w-0 overflow-hidden text-ellipsis";

function ProjectSwitcher({
	activeProjectId,
	activeProjectName,
	availableProjects,
	isActive,
	labels,
	onPrefetch,
	onSelectProject,
	pathname,
}: {
	activeProjectId: string;
	activeProjectName: string;
	availableProjects: ProjectSwitcherOption[];
	isActive: boolean;
	labels: { more: string; project: string; switchProject: string };
	onPrefetch: (href: string) => void;
	onSelectProject: (id: string, name: string) => void;
	pathname: string;
}) {
	const [open, setOpen] = useState(false);
	const projects = normalizeProjectSwitcherOptions(
		availableProjects,
		activeProjectId,
		activeProjectName,
	);

	if (projects.length <= 1) {
		return (
			<div
				className={cn(
					projectNavItemClasses,
					isActive ? projectNavItemActiveClasses : projectNavItemLabelClasses,
					"w-auto max-w-[320px] shrink-0 cursor-default justify-start",
				)}
				aria-current={isActive ? "page" : undefined}
			>
				<Building2 className={projectNavIconClasses} />
				<span className={projectNavLabelClasses}>{activeProjectName}</span>
			</div>
		);
	}

	return (
		<DropdownMenu open={open} onOpenChange={setOpen}>
			<DropdownMenuTrigger asChild>
				<button
					type="button"
					className={cn(
						projectNavItemClasses,
						isActive ? projectNavItemActiveClasses : projectNavItemIdleClasses,
						"w-auto max-w-[320px] shrink-0 justify-start",
					)}
					aria-label={labels.switchProject}
					aria-current={isActive ? "page" : undefined}
				>
					<Building2 className={projectNavIconClasses} />
					<span className={projectNavLabelClasses}>{activeProjectName}</span>
					<ChevronDown
						className={cn(
							"size-3.5 shrink-0 transition-transform duration-150 ease-out",
							open ? "rotate-180" : "rotate-0",
						)}
					/>
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="start" className="w-72">
				<DropdownMenuLabel>{labels.switchProject}</DropdownMenuLabel>
				<DropdownMenuSeparator />
				{projects.map((project) => {
					const href = getProjectSwitchHref(project.id, pathname);
					return (
						<DropdownMenuItem key={project.id} asChild>
							<Link
								href={href}
								prefetch
								aria-current={
									project.id === activeProjectId ? "page" : undefined
								}
								onClick={() => onSelectProject(project.id, project.name)}
								onMouseEnter={() => onPrefetch(href)}
								className={cn(
									"flex w-full min-w-0 items-center gap-2",
									project.id === activeProjectId
										? "text-primary"
										: "text-muted-foreground",
								)}
							>
								<Building2 className="size-4 shrink-0" />
								<span className="min-w-0 truncate">{project.name}</span>
							</Link>
						</DropdownMenuItem>
					);
				})}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function ProjectNavLink({
	compact = false,
	item,
	onPrefetch,
}: {
	compact?: boolean;
	item: ResolvedProjectLink;
	onPrefetch: () => void;
}) {
	return (
		<Tooltip delayDuration={700}>
			<TooltipTrigger asChild>
				<Link
					href={item.href}
					prefetch
					aria-label={item.displayName}
					onMouseEnter={onPrefetch}
					data-tour={item.dataTour}
					aria-current={item.isActive ? "page" : undefined}
					className={cn(
						projectNavItemClasses,
						item.isActive
							? projectNavItemActiveClasses
							: projectNavItemIdleClasses,
						compact
							? "w-auto max-w-[220px] shrink-0"
							: "w-auto max-w-[300px] shrink",
					)}
				>
					<item.icon className={projectNavIconClasses} />
					<span className={projectNavLabelClasses}>{item.displayName}</span>
				</Link>
			</TooltipTrigger>
			<TooltipContent
				side="bottom"
				align="start"
				sideOffset={8}
				className="max-w-[260px] text-balance px-3 py-2 text-xs leading-relaxed"
			>
				{item.description}
			</TooltipContent>
		</Tooltip>
	);
}

function ProjectMoreMenu({
	labels,
	links,
	onPrefetch,
}: {
	labels: { more: string; project: string };
	links: ResolvedProjectLink[];
	onPrefetch: (href: string) => void;
}) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<button
					type="button"
					className={cn(
						projectNavItemClasses,
						projectNavItemIdleClasses,
						"shrink-0 2xl:hidden",
					)}
					aria-label={labels.more}
				>
					<MoreHorizontal className={projectNavIconClasses} />
					<span className={projectNavLabelClasses}>{labels.more}</span>
					<ChevronDown className="size-4 shrink-0" />
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-56">
				<DropdownMenuLabel>{labels.project}</DropdownMenuLabel>
				<DropdownMenuSeparator />
				{links.map((item) => (
					<DropdownMenuItem key={item.path} asChild>
						<Link
							href={item.href}
							prefetch
							onMouseEnter={() => onPrefetch(item.href)}
							className={cn(
								"flex w-full items-center gap-2",
								item.isActive ? "text-primary" : "text-muted-foreground",
							)}
						>
							<item.icon className="size-4" />
							<span className="min-w-0 truncate">{item.displayName}</span>
						</Link>
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function getProjectSwitchHref(projectId: string, pathname: string) {
	const projectPath = /^\/dashboard\/sites\/[^/]+(?:\/([^?#]+))?/.exec(
		pathname,
	)?.[1];
	return `/dashboard/sites/${projectId}/${projectPath || "dashboard"}`;
}

function isProjectOverviewRoute(projectId: string, pathname: string) {
	return pathname === `/dashboard/sites/${projectId}`;
}

function normalizeProjectSwitcherOptions(
	availableProjects: ProjectSwitcherOption[],
	activeProjectId: string,
	activeProjectName: string,
) {
	const projects = availableProjects.some(
		(project) => project.id === activeProjectId,
	)
		? availableProjects
		: [{ id: activeProjectId, name: activeProjectName }, ...availableProjects];
	return projects.filter((project) => project.id && project.name);
}

function getProjectNavigationLabels(language?: string | null) {
	return String(language ?? "")
		.toLowerCase()
		.startsWith("lv")
		? { more: "Vairāk", project: "Projekts", switchProject: "Mainīt projektu" }
		: { more: "More", project: "Project", switchProject: "Switch project" };
}
