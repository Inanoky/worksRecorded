"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils/utils";
import { useDashboardNavigation } from "./useDashboardNavigation";

export function MobileMenu({
	organizationLanguage,
	canAccessAiEvals = false,
	canAccessFlowConfigAdmin = false,
}: {
	organizationLanguage?: string | null;
	canAccessAiEvals?: boolean;
	canAccessFlowConfigAdmin?: boolean;
}) {
	const {
		globalNavLinks,
		isProjectRoute,
		projectId,
		projectName,
		projectNavLinks,
	} = useDashboardNavigation({
		organizationLanguage,
		canAccessAiEvals,
		canAccessFlowConfigAdmin,
	});
	const labels = getMobileMenuLabels(organizationLanguage);

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

function getMobileMenuLabels(language?: string | null) {
	return String(language ?? "")
		.toLowerCase()
		.startsWith("lv")
		? { workspace: "Darba vide" }
		: { workspace: "Workspace" };
}
