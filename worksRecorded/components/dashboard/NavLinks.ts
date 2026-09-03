import type { LucideIcon } from "lucide-react";
import {
	ChartNoAxesCombined,
	Clock8,
	HardHat,
	Package,
	ReceiptText,
	SlidersHorizontal,
	Wrench,
} from "lucide-react";
import {
	getNavigationMessages,
	normalizeOrganizationLanguage,
} from "@/lib/dashboard-i18n";

export type GlobalNavLink = {
	name: string;
	href: string;
	icon: LucideIcon;
};

export type ProjectNavLink = {
	name: string;
	description: string;
	href: string;
	path: string;
	icon: LucideIcon;
	priority: "primary" | "utility";
	dataTour?: string;
};

export function getNavLinks(
	language?: string | null,
	options?: { canAccessAiEvals?: boolean; canAccessFlowConfigAdmin?: boolean },
): GlobalNavLink[] {
	const t = getNavigationMessages(normalizeOrganizationLanguage(language));

	const links: GlobalNavLink[] = [
		{ name: t.projects, href: "/dashboard/sites", icon: HardHat },
		{ name: t.organizationSettings, href: "/dashboard/settings", icon: Wrench },
	];

	if (options?.canAccessAiEvals) {
		links.push({
			name: "AI Evals",
			href: "/dev/ai-evals",
			icon: ChartNoAxesCombined,
		});
	}

	if (options?.canAccessFlowConfigAdmin) {
		links.push({
			name: "Flow configs",
			href: "/dashboard/admin/flow-configs",
			icon: SlidersHorizontal,
		});
	}

	return links;
}

export function getProjectNavLinks(
	language?: string | null,
	options?: { showAnalytics?: boolean },
): ProjectNavLink[] {
	const organizationLanguage = normalizeOrganizationLanguage(language);
	const t = getNavigationMessages(organizationLanguage);
	const descriptions = getProjectNavigationDescriptions(organizationLanguage);

	const links: ProjectNavLink[] = [
		{
			name: t.siteDiary,
			description: descriptions.siteDiary,
			href: "/dashboard/dashboard",
			path: "dashboard",
			icon: ReceiptText,
			priority: "primary",
			dataTour: "nav-site-diary",
		},
		...(options?.showAnalytics
			? [
					{
						name: t.analytics,
						description: descriptions.analytics,
						href: "/dashboard/analytics",
						path: "analytics",
						icon: ChartNoAxesCombined,
						priority: "primary" as const,
					},
				]
			: []),
		{
			name: t.timesheets,
			description: descriptions.timesheets,
			href: "/dashboard/timesheets",
			path: "timesheets",
			icon: Clock8,
			priority: "primary",
		},
		{
			name: t.warehouse,
			description: descriptions.warehouse,
			href: "/dashboard/BIS",
			path: "BIS",
			icon: Package,
			priority: "primary",
		},
		{
			name:
				organizationLanguage === "lv"
					? "Projekta iestatījumi"
					: "Project settings",
			description: descriptions.settings,
			href: "/dashboard/settings",
			path: "settings",
			icon: Wrench,
			priority: "utility",
		},
	];

	return links;
}

function getProjectNavigationDescriptions(language: "en" | "lv") {
	return language === "lv"
		? {
				siteDiary:
					"Pārskatiet, pievienojiet un pārvaldiet šī projekta ikdienas būvdarbu ierakstus.",
				analytics:
					"Sagatavojiet un pārskatiet Forma 2 apjomus un projekta progresa kopsavilkumus.",
				timesheets:
					"Sekojiet darbinieku stundām, apmeklējumam un darba laika ierakstiem.",
				warehouse:
					"Pārvaldiet projekta materiālus, noliktavas kustību un BIS materiālu ierakstus.",
				settings:
					"Konfigurējiet šo projektu, integrācijas un projekta iestatījumus.",
			}
		: {
				siteDiary:
					"Review, add, and manage daily construction journal records for this project.",
				analytics:
					"Prepare and review Forma 2 production quantities and project progress summaries.",
				timesheets:
					"Track worker hours, attendance, and time records for this project.",
				warehouse:
					"Manage project materials, warehouse movements, and BIS-related material records.",
				settings:
					"Configure this project, integrations, and project-specific preferences.",
			};
}
