// app/[...]/page.tsx  (Server Component)

import { notFound } from "next/navigation";
import AiWidgetRag from "@/components/ai/AiChatLazy";
import { ClientFlowSiteDiary } from "@/components/client-flows/ClientFlowSiteDiary";
import { getJoyRideSteps } from "@/components/joyride/JoyRideSteps";

import TourRunner from "@/components/joyride/TourRunner";
import { shouldShowSiteDiaryAiWidgetForFlowModule } from "@/lib/flows/registry";
import { resolveFlowModuleKeyForRuntime } from "@/lib/flows/resolve-flow-module-server";
import { requireUser } from "@/lib/utils/requireUser";
import { orgCheck } from "@/server/actions/shared-actions";

export default async function Home({ params }: { params: { siteId: string } }) {
	const { siteId } = await params;
	const user = await requireUser();
	const siteCheck = await orgCheck(user.id, siteId);
	if (!siteCheck) {
		notFound();
	}
	const flowModuleKey = await resolveFlowModuleKeyForRuntime({
		organizationId: siteCheck.organizationId ?? null,
		siteId,
	});
	const showAiWidget = shouldShowSiteDiaryAiWidgetForFlowModule(flowModuleKey);

	return (
		<div>
			<TourRunner
				steps={getJoyRideSteps("en").steps_dashboard_siteid_site_diary}
				stepName="steps_dashboard_siteid_site_diary"
			/>

			<ClientFlowSiteDiary flowModuleKey={flowModuleKey} siteId={siteId} />

			{showAiWidget ? <AiWidgetRag siteId={siteId} /> : null}
		</div>
	);
}
