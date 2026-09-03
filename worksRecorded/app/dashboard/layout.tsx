// worksRecorded\app\dashboard\layout.tsx

import { LogoutLink } from "@kinde-oss/kinde-auth-nextjs/components";
import { BadgeQuestionMark, CircleUser, X } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import type { ReactNode } from "react";
import {
	DashboardItems,
	DashboardProjectNavigation,
} from "@/components/dashboard/DashboardItems";
import { LanguageFlagSwitcher } from "@/components/dashboard/LanguageFlagSwitcher";
import { ThemeToggle } from "@/components/dashboard/ThemeToggle";
import { clearUserTourAction } from "@/components/joyride/user-tour-action";
import { ProjectProvider } from "@/components/providers/ProjectProvider";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { isAiEvalUiEnabled } from "@/lib/ai-evals/local-gate";
import { getDashboardMessages } from "@/lib/dashboard-i18n";
import { canAccessFlowConfigAdmin } from "@/lib/production-flow/config";
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
	const [email, organizationLanguage, organizationId] = await Promise.all([
		getUserEmailByUserId(user.id),
		getOrganizationLanguageByUserId(user.id),
		isSuperUser ? Promise.resolve(null) : getOrganizationIdByUserId(user.id),
	]);
	const t = getDashboardMessages(organizationLanguage);
	const canAccessAiEvals = hasAiEvalAccess(userId) && isAiEvalUiEnabled();
	const requestHeaders = await headers();
	const canAccessFlowConfigs = canAccessFlowConfigAdmin(
		userId,
		requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host"),
	);
	const headerProjects = await prisma.site.findMany({
		where: isSuperUser ? {} : { organizationId: organizationId ?? "" },
		select: { id: true, name: true },
		orderBy: { createdAt: "desc" },
	});

	return (
		<ProjectProvider userId={userId}>
			<section className="min-h-screen w-full flex flex-col">
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

				<header className="sticky top-0 z-40 flex flex-col border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
					<div className="flex h-14 w-full items-center justify-between gap-3 px-4 lg:px-8">
						<div className="flex min-w-0 flex-1 items-center gap-3">
							<div className="lg:hidden">
								<MobileMenu
									organizationLanguage={organizationLanguage}
									canAccessAiEvals={canAccessAiEvals}
									canAccessFlowConfigAdmin={canAccessFlowConfigs}
								/>
							</div>

							<Link
								href="/"
								className="flex items-center gap-2 font-semibold shrink-0"
							>
								<h3 className="text-xl lg:text-2xl tracking-tight">
									Works<span className="text-green-700">Recorded</span>
								</h3>
							</Link>

							<nav className="ml-2 hidden min-w-0 flex-1 items-center lg:flex">
								<DashboardItems
									userEmail={email}
									organizationLanguage={organizationLanguage}
									canAccessAiEvals={canAccessAiEvals}
									canAccessFlowConfigAdmin={canAccessFlowConfigs}
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
						organizationLanguage={organizationLanguage}
						canAccessAiEvals={canAccessAiEvals}
						canAccessFlowConfigAdmin={canAccessFlowConfigs}
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
					{children}
				</main>
			</section>
		</ProjectProvider>
	);
}
