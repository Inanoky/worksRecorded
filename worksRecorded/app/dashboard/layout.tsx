// worksRecorded\app\dashboard\layout.tsx

import { LogoutLink } from "@kinde-oss/kinde-auth-nextjs/components";
import { BadgeQuestionMark, CircleUser, X } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import type { ReactNode } from "react";
import { BbbuveSuiteLogo } from "@/components/dashboard/BbbuveSuiteLogo";
import { BbbuveSuiteTheme } from "@/components/dashboard/BbbuveSuiteTheme";
import {
	DashboardItems,
	DashboardProjectNavigation,
} from "@/components/dashboard/DashboardItems";
import {
	DashboardSettingsContent,
	DashboardSettingsProvider,
} from "@/components/dashboard/DashboardSettingsProvider";
import { LanguageFlagSwitcher } from "@/components/dashboard/LanguageFlagSwitcher";
import { LimeniSuiteLogo } from "@/components/dashboard/LimeniSuiteLogo";
import { LimeniSuiteTheme } from "@/components/dashboard/LimeniSuiteTheme";
import { ProdevSuiteLogo } from "@/components/dashboard/ProdevSuiteLogo";
import { ProdevSuiteTheme } from "@/components/dashboard/ProdevSuiteTheme";
import { ThemeToggle } from "@/components/dashboard/ThemeToggle";
import { clearUserTourAction } from "@/components/joyride/user-tour-action";
import { ProjectLoadingProgressProvider } from "@/components/providers/ProjectLoadingProgressProvider";
import { ProjectProvider } from "@/components/providers/ProjectProvider";
import { FimaSuiteLogo } from "@/components/sitediary/FimaSuiteLogo";
import { FimaSuiteTheme } from "@/components/sitediary/FimaSuiteTheme";
import {
	FimaProjectWarehousePreload,
	FimaWarehouseProvider,
} from "@/components/sitediary/FimaWarehouseProvider";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DiarySaveProvider } from "@/flows/default-construction/frontend/DiarySaveProvider";
import { LIMENI_ORGANIZATION_ID } from "@/flows/default-construction/lib/diary-photos";
import { isAiEvalUiEnabled } from "@/lib/ai-evals/local-gate";
import { isBbbuveOrganization } from "@/lib/branding/bbbuve";
import { isProdevOrganization } from "@/lib/branding/prodev";
import { getDashboardMessages } from "@/lib/dashboard-i18n";
import { isFimaDiary } from "@/lib/fima/diary-collaboration";
import { resolveFlowModuleKeyForRuntime } from "@/lib/flows/resolve-flow-module-server";
import { FLOW_MODULE_KEYS } from "@/lib/flows/types";
import { canAccessFlowConfigAdmin } from "@/lib/production-flow/config";
import {
	loadTgemAccessScope,
	visibleTgemSites,
} from "@/lib/tgem-invoice-approval/access";
import { hasAiEvalAccess } from "@/lib/utils/ai-context-access";
import { prisma } from "@/lib/utils/db";
import { isSuperUserId } from "@/lib/utils/super-user";
import {
	getOrganizationIdByUserId,
	getOrganizationLanguageByUserId,
	getUserEmailByUserId,
} from "@/server/actions/shared-actions";
import { MobileMenu } from "../../components/dashboard/MobileMenu";
import { requireUser } from "../../lib/utils/requireUser";

export default async function DashboardLayout({
	children,
}: {
	children: ReactNode;
}) {
	const user = await requireUser();
	const userId = user.id;
	const isSuperUser = isSuperUserId(userId);
	const [email, organizationLanguage, accountOrganizationId] = await Promise.all([
		getUserEmailByUserId(user.id),
		getOrganizationLanguageByUserId(user.id),
		getOrganizationIdByUserId(user.id),
	]);
	const organizationId = isSuperUser ? null : accountOrganizationId;
	const t = getDashboardMessages(organizationLanguage);
	const canAccessAiEvals = hasAiEvalAccess(userId) && isAiEvalUiEnabled();
	const requestHeaders = await headers();
	const canAccessFlowConfigs = canAccessFlowConfigAdmin(
		userId,
		requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host"),
	);
	const [allHeaderProjects, flowModuleKey, organization] = await Promise.all([
		prisma.site.findMany({
			where: isSuperUser ? {} : { organizationId: organizationId ?? "" },
				select: { id: true, name: true, organizationId: true, siteDiaryRecordsMap: true, bisCaseId: true },
			orderBy: { createdAt: "desc" },
		}),
		isSuperUser
			? Promise.resolve(null)
			: resolveFlowModuleKeyForRuntime({ organizationId }),
		!isSuperUser && organizationId
			? prisma.organization.findUnique({ where: { id: organizationId }, select: { name: true } })
			: Promise.resolve(null),
	]);
	const fimaCollaborationEnabled = !isSuperUser && allHeaderProjects.some((project) => isFimaDiary(project.siteDiaryRecordsMap));
	const limeniSuiteEnabled =
		!isSuperUser &&
		!fimaCollaborationEnabled &&
		organizationId === LIMENI_ORGANIZATION_ID;
	const prodevSuiteEnabled =
		!isSuperUser &&
		!fimaCollaborationEnabled &&
		!limeniSuiteEnabled &&
		isProdevOrganization(organization?.name);
	const bbbuveSuiteEnabled =
		!isSuperUser &&
		!fimaCollaborationEnabled &&
		!limeniSuiteEnabled &&
		!prodevSuiteEnabled &&
		isBbbuveOrganization(organization?.name);
	const suiteClassName = fimaCollaborationEnabled
		? "fima-suite"
		: limeniSuiteEnabled
			? "limeni-suite"
			: prodevSuiteEnabled
				? "prodev-suite"
				: bbbuveSuiteEnabled
					? "bbbuve-suite"
					: "";
	const suiteLabel = limeniSuiteEnabled
		? "WorksRecorded — Līmenī business suite"
		: prodevSuiteEnabled
			? "WorksRecorded — ProDev business suite"
			: bbbuveSuiteEnabled
				? "WorksRecorded — BB BŪVE business suite"
				: undefined;
	let headerProjects = allHeaderProjects.map(({ siteDiaryRecordsMap, bisCaseId, ...project }) => ({...project, fimaActsEnabled: Boolean(bisCaseId && isFimaDiary(siteDiaryRecordsMap))}));
	if (
		flowModuleKey === FLOW_MODULE_KEYS.TGEM_INVOICE_APPROVAL &&
		organizationId
	) {
		const access = await loadTgemAccessScope(prisma, {
			userId,
			organizationId,
		});
		headerProjects = access ? visibleTgemSites(access, headerProjects) : [];
	}

	return (
		<ProjectProvider userId={userId}>
			<ProjectLoadingProgressProvider
				key={`${userId}:${organizationId}`}
				enabled={flowModuleKey === FLOW_MODULE_KEYS.DEFAULT_CONSTRUCTION}
				cacheScope={`${userId}:${organizationId ?? "admin"}`}
				visualPreloadSites={allHeaderProjects
					.filter((project) => project.organizationId === LIMENI_ORGANIZATION_ID)
					.map((project) => project.id)}
			>
			<FimaWarehouseProvider key={`${userId}-${organizationId ?? ""}`}>
				<FimaSuiteTheme enabled={fimaCollaborationEnabled} />
				<ProdevSuiteTheme enabled={prodevSuiteEnabled} />
				<LimeniSuiteTheme enabled={limeniSuiteEnabled} />
				<BbbuveSuiteTheme enabled={bbbuveSuiteEnabled} />
				{fimaCollaborationEnabled ? (
					<FimaProjectWarehousePreload
						siteIds={allHeaderProjects.filter(project => project.bisCaseId && isFimaDiary(project.siteDiaryRecordsMap)).map(project => project.id)}
					/>
				) : null}
			<DiarySaveProvider key={userId} userId={userId} projects={headerProjects} language={organizationLanguage}>
			<DashboardSettingsProvider
				key={JSON.stringify([userId, accountOrganizationId, organizationLanguage, flowModuleKey, canAccessFlowConfigs])}
				canAccessFlowConfigs={canAccessFlowConfigs}
				organizationLanguage={organizationLanguage}
			>
			<section className={`${suiteClassName} min-h-screen w-full flex flex-col`}>
				{/* CSS-only modal (hash :target) */}
				<style>{`
          #contact-modal {
            opacity: 0;
            pointer-events: none;
            transform: translateY(6px);
            transition: opacity 160ms ease, transform 160ms ease;
          }
          #contact-modal:target {
            opacity: 1;
            pointer-events: auto;
            transform: translateY(0);
          }
        `}</style>

				<header data-dashboard-header className="sticky top-0 z-40 flex flex-col border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
					<div className="flex h-14 w-full items-center justify-between gap-3 px-4 lg:px-8">
						<div className="flex min-w-0 flex-1 items-center gap-3">
							<div className="lg:hidden">
								<MobileMenu
									organizationLanguage={organizationLanguage}
									canAccessAiEvals={canAccessAiEvals}
									canAccessFlowConfigAdmin={canAccessFlowConfigs}
									flowModuleKey={flowModuleKey}
									availableProjects={headerProjects}
									fimaCollaborationEnabled={fimaCollaborationEnabled}
								/>
							</div>

							<Link
								href="/"
								aria-label={suiteLabel}
								className="flex items-center gap-2 font-semibold shrink-0"
							>
								{limeniSuiteEnabled ? (
									<LimeniSuiteLogo />
								) : prodevSuiteEnabled ? (
									<ProdevSuiteLogo />
								) : bbbuveSuiteEnabled ? (
									<BbbuveSuiteLogo />
								) : (
									<FimaSuiteLogo enabled={fimaCollaborationEnabled} />
								)}
							</Link>

							<nav className="ml-2 hidden min-w-0 flex-1 items-center lg:flex">
								<DashboardItems
									userEmail={email}
									organizationLanguage={organizationLanguage}
									canAccessAiEvals={canAccessAiEvals}
									canAccessFlowConfigAdmin={canAccessFlowConfigs}
									flowModuleKey={flowModuleKey}
								/>
							</nav>
						</div>

						<div className="flex items-center gap-x-2 lg:gap-x-3 shrink-0">
							<div className="hidden md:block max-w-[220px] truncate rounded-full border bg-muted/40 px-3 py-1 text-xs text-muted-foreground">
								{email}
							</div>
							<LanguageFlagSwitcher currentLanguage={organizationLanguage} />
							<ThemeToggle />

							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button
										variant="secondary"
										size="icon"
										className="rounded-full size-8 lg:size-10"
									>
										<CircleUser className="h-4 w-4 lg:h-5 lg:w-5" />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end">
									<DropdownMenuItem asChild>
										<LogoutLink>{t.logOut}</LogoutLink>
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>

							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button
										variant="secondary"
										size="icon"
										className="rounded-full size-8 lg:size-10"
									>
										<BadgeQuestionMark className="h-4 w-4 lg:h-5 lg:w-5" />
									</Button>
								</DropdownMenuTrigger>

								<DropdownMenuContent align="end">
									<DropdownMenuItem asChild>
										<form action={clearUserTourAction}>
											<button type="submit" className="w-full text-left">
												Repeat Tutorial
											</button>
										</form>
									</DropdownMenuItem>

									<DropdownMenuItem asChild>
										<a href="#contact-modal" className="w-full text-left">
											Contact us
										</a>
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						</div>
					</div>

					<DashboardProjectNavigation
						availableProjects={headerProjects}
						fimaCollaborationEnabled={fimaCollaborationEnabled}
						organizationLanguage={organizationLanguage}
						canAccessAiEvals={canAccessAiEvals}
						canAccessFlowConfigAdmin={canAccessFlowConfigs}
						flowModuleKey={flowModuleKey}
					/>
				</header>

				{/* Contact modal */}
				<div
					id="contact-modal"
					className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 p-4"
					aria-label="Contact us dialog"
					role="dialog"
					aria-modal="true"
				>
					<div className="w-full max-w-md max-h-[85vh] overflow-y-auto rounded-xl border bg-background shadow-lg">
						<div className="flex items-center justify-between border-b px-4 py-3">
							<div className="font-semibold">Contact us</div>
							<a
								href="#"
								aria-label="Close"
								className="inline-flex items-center justify-center rounded-md p-2 hover:bg-muted"
							>
								<X className="h-4 w-4" />
							</a>
						</div>

						<div className="space-y-3 px-4 py-4 sm:px-5">
							<div className="text-sm leading-relaxed text-muted-foreground">
								Contact us any time if you have any questions or problems.
							</div>
							<div className="space-y-2">
								<div className="text-sm">
									<div className="text-muted-foreground">Email</div>
									<a
										className="block max-w-full break-all text-sm font-medium underline underline-offset-4 sm:break-words"
										href="mailto:vjaceslavs.gromatovics@buvconsult.com"
									>
										vjaceslavs.gromatovics@buvconsult.com
									</a>
								</div>

								<div className="text-sm">
									<div className="text-muted-foreground">Phone</div>
									<a
										className="font-medium underline underline-offset-4"
										href="tel:+37124885690"
									>
										+37124885690
									</a>
								</div>
							</div>

							<div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
								<a href="#" className="inline-flex">
									<Button variant="secondary" className="w-full sm:w-auto">
										Close
									</Button>
								</a>
								<a
									href="mailto:vjaceslavs.gromatovics@buvconsult.com"
									className="inline-flex"
								>
									<Button className="w-full sm:w-auto">Email us</Button>
								</a>
							</div>
						</div>
					</div>
				</div>

				{/* Main content */}
				<main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
					<DashboardSettingsContent>{children}</DashboardSettingsContent>
				</main>
			</section>
			</DashboardSettingsProvider>
			</DiarySaveProvider>
			</FimaWarehouseProvider>
		</ProjectLoadingProgressProvider>
		</ProjectProvider>
	);
}
