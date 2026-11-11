import { notFound, redirect } from "next/navigation";
import { after } from "next/server";
import { Suspense } from "react";
import AiWidgetRag from "@/components/ai/AiChatLazy";
import { ClientFlowDashboard } from "@/components/client-flows/ClientFlowDashboard";
import { getJoyRideSteps } from "@/components/joyride/JoyRideSteps";
import TourRunner from "@/components/joyride/TourRunner";
import { RegisterProjectPage } from "@/components/projects/ProjectRegistration";
import { withRetainedProjectPage } from "@/components/projects/withRetainedProjectPage";
import { getWorkspaceRouteContext } from "@/components/projects/workspace-access";
import {
	ClearRetainedDiary,
	RegisterLimeniDiary,
} from "@/flows/default-construction/frontend/RetainedLimeniDiary";
import { hasInlineDiaryPhotos } from "@/flows/default-construction/lib/diary-photos";
import { buildDefaultConstructionDiaryConfig } from "@/flows/default-construction/lib/diary-config";
import { readAuthorizedConstructionBootstrap } from "@/flows/default-construction/backend/construction-project-bootstrap";
import { getDashboardBisStatus } from "@/lib/bis/dashboard-status";
import { normalizeOrganizationLanguage } from "@/lib/dashboard-i18n";
import {
	getFlowModuleUi,
	shouldShowDashboardAiWidgetForFlowModule,
} from "@/lib/flows/registry";
import { resolveFlowModuleKeyForRuntime } from "@/lib/flows/resolve-flow-module-server";
import { FLOW_MODULE_KEYS } from "@/lib/flows/types";
import { prisma } from "@/lib/utils/db";
import { requireUser } from "@/lib/utils/requireUser";
import { isSuperUserId } from "@/lib/utils/super-user";
import {
	getOrganizationLanguageByUserId,
	getSiteOrganizationIdBySiteId,
	orgCheck,
} from "@/server/actions/shared-actions";
import { sendFirstProjectWelcomeTemplateForUserIfNeeded } from "@/server/onboarding/send-first-project-welcome-template";

export const maxDuration = 800;

function BisUnavailableNotice({ language }: { language: string }) {
	return (
		<output className="block rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
			{language === "en"
				? "BIS is temporarily unavailable. You can continue using the diary; your BIS connection is retained. Try again in a minute."
				: "BIS īslaicīgi nav pieejams. Žurnālu varat lietot kā parasti; BIS savienojums ir saglabāts. Mēģiniet vēlreiz pēc minūtes."}
		</output>
	);
}

function ProjectTour({ language }: { language: string }) {
	return (
		<div data-tour="key-metrics">
			<TourRunner
				steps={getJoyRideSteps(language).steps_dashboard_siteid_dashboard}
				stepName="steps_dashboard_siteid_dashboard"
			/>
		</div>
	);
}

async function InvoiceRoute({
	params,
}: {
	params: Promise<{ siteId: string }>;
}) {
	const { siteId } = await params;
	const routeContext = await getWorkspaceRouteContext(siteId);
	if (routeContext.descriptor.constructionWorkspace) {
		const { descriptor, organizationLanguage } = routeContext;
		if (descriptor.name) {
			after(async () => {
				try {
					await sendFirstProjectWelcomeTemplateForUserIfNeeded({
						userId: descriptor.userId,
						siteId,
						projectName: descriptor.name,
					});
				} catch (error) {
					console.error("[dashboard] deferred onboarding message failed", {
						siteId,
						error,
					});
				}
			});
		}
		return (
			<>
				<ProjectTour language={organizationLanguage} />
				{shouldShowDashboardAiWidgetForFlowModule(descriptor.flowModuleKey) ? (
					<AiWidgetRag siteId={siteId} />
				) : null}
			</>
		);
	}

	// --- Group 2: User Check ---
	const user = await requireUser();

	const isSuperAdmin = isSuperUserId(user.id);

	let onboardingProjectName = "";
	let siteOrganizationId: string | null = null;
	if (!isSuperAdmin) {
		const site = await orgCheck(user.id, siteId);
		if (!site) notFound();
		onboardingProjectName = site.name;
		siteOrganizationId = site.organizationId ?? null;
	} else {
		siteOrganizationId = await getSiteOrganizationIdBySiteId(siteId);
	}
	const [flowModuleKey, organizationLanguage] = await Promise.all([
		resolveFlowModuleKeyForRuntime({
			organizationId: siteOrganizationId,
			siteId,
		}),
		getOrganizationLanguageByUserId(user.id),
	]);

	if (flowModuleKey === FLOW_MODULE_KEYS.TGEM_INVOICE_APPROVAL) {
		redirect(`/dashboard/invoices?project=${encodeURIComponent(siteId)}`);
	}
	const fimaProject = await (flowModuleKey ===
		FLOW_MODULE_KEYS.DEFAULT_CONSTRUCTION && siteOrganizationId
		? prisma.site.findFirst({
				where: {
					id: siteId,
					bisCaseId: { not: "" },
					organizationId: siteOrganizationId,
					siteDiaryRecordsMap: {
						path: ["otherSettings", "fimaCollaboration"],
						equals: true,
					},
				},
				select: { id: true },
			})
		: null);

	if (onboardingProjectName) {
		after(async () => {
			try {
				await sendFirstProjectWelcomeTemplateForUserIfNeeded({
					userId: user.id,
					siteId,
					projectName: onboardingProjectName,
				});
			} catch (error) {
				console.error("[dashboard] deferred onboarding message failed", {
					siteId,
					error,
				});
			}
		});
	}
	if (fimaProject) return null;
	const bisStatus = await getDashboardBisStatus(
		user.id,
		siteId,
		!getFlowModuleUi(flowModuleKey).hideBisSettings,
	);

	return (
		<>
			{bisStatus.unavailable ? (
				<BisUnavailableNotice language={organizationLanguage} />
			) : null}
			<ProjectTour language={organizationLanguage} />

			{flowModuleKey === FLOW_MODULE_KEYS.DEFAULT_CONSTRUCTION &&
			hasInlineDiaryPhotos(siteOrganizationId) &&
			siteOrganizationId ? (
				<RegisterLimeniDiary
					siteId={siteId}
					userId={user.id}
					organizationId={siteOrganizationId}
					bisEnabled={bisStatus.enabled}
					organizationLanguage={organizationLanguage}
				/>
			) : (
				<>
					<ClearRetainedDiary />
					<ClientFlowDashboard
						key={siteId}
						flowModuleKey={flowModuleKey}
						siteId={siteId}
						bisEnabled={bisStatus.enabled}
						organizationLanguage={organizationLanguage}
					/>
				</>
			)}
			{shouldShowDashboardAiWidgetForFlowModule(flowModuleKey) ? (
				<AiWidgetRag siteId={siteId} />
			) : null}
		</>
	);
}

const RetainedDashboard = withRetainedProjectPage(InvoiceRoute, "dashboard");

async function StreamedProjectTab({
	siteId,
	view,
	language,
}: {
	siteId: string;
	view: "BIS" | "timesheets";
	language: string;
}) {
	const params = Promise.resolve({ siteId });
	try {
		if (view === "BIS") {
			const { MaterialsPage } = await import("../BIS/page");
			return await MaterialsPage({ params });
		}
		const { AddWorkerPage } = await import("../timesheets/page");
		return await AddWorkerPage({ params });
	} catch {
		return (
			<a href={`/dashboard/sites/${siteId}/${view}`} className="underline">
				{language === "lv" ? "Ielādēt vēlreiz" : "Reload this tab"}
			</a>
		);
	}
}

export default async function ProjectDashboard(
	props: Parameters<typeof InvoiceRoute>[0],
) {
	const { siteId } = await props.params;
	const context = await getWorkspaceRouteContext(siteId);
	const { descriptor, organizationLanguage } = context;
	if (!descriptor.constructionWorkspace || !descriptor.organizationId)
		return RetainedDashboard(props);
	const language = normalizeOrganizationLanguage(organizationLanguage);
	const initialDiary = await readAuthorizedConstructionBootstrap(
		descriptor.userId,
		siteId,
		{
			organizationId: descriptor.organizationId,
			organizationLanguage: language,
			bisCaseId: context.bisCaseId,
			diaryConfig: buildDefaultConstructionDiaryConfig({
				...context,
				organizationId: descriptor.organizationId,
			}),
		},
	);
	const base = `/dashboard/sites/${siteId}`;
	return (
		<>
			<RegisterProjectPage
				siteId={siteId}
				href={`${base}/dashboard`}
				initialDiary={initialDiary}
			>
				{await InvoiceRoute(props)}
			</RegisterProjectPage>
			{(["BIS", "timesheets"] as const).map((view) => (
				<RegisterProjectPage
					key={view}
					siteId={siteId}
					href={`${base}/${view}`}
				>
					<Suspense
						fallback={
							<p role="status">{language === "lv" ? "Ielādē…" : "Loading…"}</p>
						}
					>
						<StreamedProjectTab
							siteId={siteId}
							view={view}
							language={language}
						/>
					</Suspense>
				</RegisterProjectPage>
			))}
		</>
	);
}
