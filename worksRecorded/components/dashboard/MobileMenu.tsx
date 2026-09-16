"use client";

import { Building2, Check, Menu } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FLOW_MODULE_KEYS, type FlowModuleKey } from "@/lib/flows/types";
import { cn } from "@/lib/utils/utils";
import {
	getTgemProjectNavigationLabels,
	getTgemWorkspaceNavLinks,
} from "./NavLinks";
import { useDashboardNavigation } from "./useDashboardNavigation";

export function MobileMenu({
	organizationLanguage,
	canAccessAiEvals = false,
	canAccessFlowConfigAdmin = false,
	flowModuleKey = null,
	availableProjects = [],
}: {
	organizationLanguage?: string | null;
	canAccessAiEvals?: boolean;
	canAccessFlowConfigAdmin?: boolean;
	flowModuleKey?: FlowModuleKey | null;
	availableProjects?: Array<{ id: string; name: string }>;
}) {
	const {
		globalNavLinks,
		isProjectRoute,
		pathname,
		projectId,
		projectName,
		projectNavLinks,
	} = useDashboardNavigation({
		organizationLanguage,
		canAccessAiEvals,
		canAccessFlowConfigAdmin,
		flowModuleKey,
	});
	const searchParams = useSearchParams();
	const labels = getMobileMenuLabels(organizationLanguage);
	const isTgem = flowModuleKey === FLOW_MODULE_KEYS.TGEM_INVOICE_APPROVAL;
	const isApprovalView =
		pathname === "/dashboard/invoices" &&
		searchParams.get("view") === "approval";
	const tgemWorkspaceLinks = isTgem
		? getTgemWorkspaceNavLinks(organizationLanguage).map((item) => ({
				...item,
				isActive:
					item.view === "approval"
						? isApprovalView
						: pathname === "/dashboard/invoices" && !isApprovalView,
			}))
		: [];
	const tgemProjectLabels =
		getTgemProjectNavigationLabels(organizationLanguage);
	const activeProjectFilter = searchParams.get("project");
	const tgemProjectOptions = [
		{ id: null, name: tgemProjectLabels.allProjects },
		{ id: "unassigned", name: tgemProjectLabels.unassigned },
		...availableProjects,
	];

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" size="icon" className="rounded-full">
					<Menu className="h-5 w-5" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				align="start"
				className="max-h-[80vh] w-72 overflow-y-auto"
			>
				<DropdownMenuLabel>{labels.workspace}</DropdownMenuLabel>
				{isTgem ? (
					<>
						<DropdownMenuSeparator />
						<DropdownMenuLabel>{tgemProjectLabels.projects}</DropdownMenuLabel>
						{tgemProjectOptions.map((project) => {
							const href = getTgemInvoiceProjectHref(
								project.id,
								isApprovalView,
							);
							const isSelected = (activeProjectFilter ?? null) === project.id;
							return (
								<DropdownMenuItem key={project.id ?? "all"} asChild>
									<Link href={href} prefetch>
										<Check
											className={cn(
												"size-4",
												isSelected ? "opacity-100" : "opacity-0",
											)}
										/>
										<span className="min-w-0 truncate">{project.name}</span>
									</Link>
								</DropdownMenuItem>
							);
						})}
						<DropdownMenuItem asChild>
							<Link href="/dashboard/sites" prefetch>
								<Building2 className="size-4" />
								{tgemProjectLabels.manageProjects}
							</Link>
						</DropdownMenuItem>
						<DropdownMenuSeparator />
					</>
				) : null}
				{tgemWorkspaceLinks.map((item) => (
					<DropdownMenuItem key={item.view} asChild>
						<Link
							href={item.href}
							prefetch
							className={cn(
								"flex w-full items-center gap-2",
								item.isActive ? "text-primary" : "text-muted-foreground",
							)}
						>
							<item.icon className="size-4" />
							<span className="min-w-0 truncate">{item.name}</span>
						</Link>
					</DropdownMenuItem>
				))}
				{globalNavLinks.map((item) => (
					<DropdownMenuItem key={item.name} asChild>
						<Link
							href={item.href}
							prefetch
							className={cn(
								"flex w-full items-center gap-2",
								item.isActive ? "text-primary" : "text-muted-foreground",
							)}
						>
							<item.icon className="size-4" />
							<span className="min-w-0 truncate">{item.name}</span>
						</Link>
					</DropdownMenuItem>
				))}

				{projectName && projectId && isProjectRoute ? (
					<>
						<DropdownMenuSeparator />
						<DropdownMenuLabel className="min-w-0">
							<span className="block truncate">{projectName}</span>
						</DropdownMenuLabel>
						{projectNavLinks.map((item) => (
							<DropdownMenuItem key={item.path} asChild>
								<Link
									href={item.href}
									prefetch
									data-tour={item.dataTour}
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
					</>
				) : null}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function getTgemInvoiceProjectHref(
	projectFilter: string | null,
	isApprovalView: boolean,
) {
	const searchParams = new URLSearchParams();
	if (projectFilter) searchParams.set("project", projectFilter);
	if (isApprovalView) searchParams.set("view", "approval");
	const query = searchParams.toString();
	return `/dashboard/invoices${query ? `?${query}` : ""}`;
}

function getMobileMenuLabels(language?: string | null) {
	return String(language ?? "")
		.toLowerCase()
		.startsWith("lv")
		? { workspace: "Darba vide" }
		: { workspace: "Workspace" };
}
