import { notFound, redirect } from "next/navigation";
import { after } from "next/server";
import AiWidgetRag from "@/components/ai/AiChatLazy";
import { ClientFlowDashboard } from "@/components/client-flows/ClientFlowDashboard";
import { getJoyRideSteps } from "@/components/joyride/JoyRideSteps";
import TourRunner from "@/components/joyride/TourRunner";
import {
	ClearRetainedDiary,
	RegisterLimeniDiary,
} from "@/flows/default-construction/frontend/RetainedLimeniDiary";
import { hasInlineDiaryPhotos } from "@/flows/default-construction/lib/diary-photos";
import { getDashboardBisStatus } from "@/lib/bis/dashboard-status";
import {
	getFlowModuleUi,
	shouldShowDashboardAiWidgetForFlowModule,
} from "@/lib/flows/registry";
import { resolveFlowModuleKeyForRuntime } from "@/lib/flows/resolve-flow-module-server";
import { FLOW_MODULE_KEYS } from "@/lib/flows/types";
import { requireUser } from "@/lib/utils/requireUser";
import { isSuperUserId } from "@/lib/utils/super-user";
import {
	getOrganizationLanguageByUserId,
	getSiteOrganizationIdBySiteId,
	orgCheck,
} from "@/server/actions/shared-actions";
import { sendFirstProjectWelcomeTemplateForUserIfNeeded } from "@/server/onboarding/send-first-project-welcome-template";

export const maxDuration = 800;

export default async function InvoiceRoute({
	params,
}: {
	params: Promise<{ siteId: string }>;
}) {
	const { siteId } = await params;

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
	const bisStatus = await getDashboardBisStatus(
		user.id,
		siteId,
		!getFlowModuleUi(flowModuleKey).hideBisSettings,
	);

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

	return (
		<>
			{bisStatus.unavailable ? (
				<output className="block rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
					{organizationLanguage === "en"
						? "BIS is temporarily unavailable. You can continue using the diary; your BIS connection is retained. Try again in a minute."
						: "BIS īslaicīgi nav pieejams. Žurnālu varat lietot kā parasti; BIS savienojums ir saglabāts. Mēģiniet vēlreiz pēc minūtes."}
				</output>
			) : null}
			<div data-tour="key-metrics">
				<TourRunner
					steps={
						getJoyRideSteps(organizationLanguage)
							.steps_dashboard_siteid_dashboard
					}
					stepName="steps_dashboard_siteid_dashboard"
				/>
			</div>

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
