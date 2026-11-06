"use client";

import { memo } from "react";
import AiWidgetRag from "@/components/ai/AiChatLazy";
import { getJoyRideSteps } from "@/components/joyride/JoyRideSteps";
import TourRunner from "@/components/joyride/TourRunner";
import { RetainedViewPortal } from "@/components/providers/RetainedView";
import { ZtcProductionFlow } from "./ZtcProductionFlow";

export const ZtcNavigationProject = memo(function ZtcNavigationProject({
	siteId,
	organizationLanguage,
}: {
	siteId: string;
	organizationLanguage: string | null;
}) {
	return (
		<>
			<RetainedViewPortal>
				<div data-tour="key-metrics">
					<TourRunner
						steps={
							getJoyRideSteps(organizationLanguage)
								.steps_dashboard_siteid_dashboard
						}
						stepName="steps_dashboard_siteid_dashboard"
					/>
				</div>
			</RetainedViewPortal>
			<ZtcProductionFlow
				siteId={siteId}
				bisEnabled={false}
				organizationLanguage={organizationLanguage}
			/>
			<RetainedViewPortal>
				<AiWidgetRag siteId={siteId} />
			</RetainedViewPortal>
		</>
	);
});
