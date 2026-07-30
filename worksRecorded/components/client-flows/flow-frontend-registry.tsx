"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import { FLOW_MODULE_KEYS, type FlowModuleKey } from "@/lib/flows/types";

export type FlowDashboardProps = {
	siteId: string;
	bisEnabled: boolean;
	organizationLanguage?: string | null;
};

export type FlowSiteDiaryProps = {
	siteId: string;
};

export type FlowFrontendModule = {
	Dashboard: ComponentType<FlowDashboardProps>;
	SiteDiary: ComponentType<FlowSiteDiaryProps>;
};

const flowLoading = () => (
	<div className="space-y-3" aria-busy="true">
		<div className="h-12 animate-pulse rounded-xl bg-muted" />
		<div className="h-64 animate-pulse rounded-xl bg-muted" />
	</div>
);

const DefaultConstructionDashboardFlow = dynamic<FlowDashboardProps>(
	() =>
		import("@/flows/default-construction/frontend/DefaultProductionFlow").then(
			(module) => module.DefaultProductionFlow,
		),
	{ loading: flowLoading },
);
const DefaultConstructionSiteDiaryFlow = dynamic<FlowSiteDiaryProps>(
	() =>
		import("@/flows/default-construction/frontend/DefaultSiteDiaryFlow").then(
			(module) => module.DefaultSiteDiaryFlow,
		),
	{ loading: flowLoading },
);
const DefaultProductionFlow = dynamic<FlowDashboardProps>(
	() =>
		import("@/flows/default-production/frontend/DefaultProductionFlow").then(
			(module) => module.DefaultProductionFlow,
		),
	{ loading: flowLoading },
);
const DefaultSiteDiaryFlow = dynamic<FlowSiteDiaryProps>(
	() =>
		import("@/flows/default-production/frontend/DefaultSiteDiaryFlow").then(
			(module) => module.DefaultSiteDiaryFlow,
		),
	{ loading: flowLoading },
);
const ZtcProductionFlow = dynamic<FlowDashboardProps>(
	() =>
		import("@/flows/ztc-production/frontend/ZtcProductionFlow").then(
			(module) => module.ZtcProductionFlow,
		),
	{ loading: flowLoading },
);
const ZtcSiteDiaryFlow = dynamic<FlowSiteDiaryProps>(
	() =>
		import("@/flows/ztc-production/frontend/ZtcSiteDiaryFlow").then(
			(module) => module.ZtcSiteDiaryFlow,
		),
	{ loading: flowLoading },
);
const TgemFlowPlaceholder = dynamic(
	() =>
		import("@/flows/tgem-invoice-approval/frontend").then(
			(module) => module.TgemFlowPlaceholder,
		),
	{ loading: flowLoading },
);

function TgemDashboard() {
	return <TgemFlowPlaceholder />;
}

function TgemSiteDiary() {
	return <TgemFlowPlaceholder />;
}

export const FLOW_FRONTEND_MODULES: Record<string, FlowFrontendModule> = {
	[FLOW_MODULE_KEYS.DEFAULT_CONSTRUCTION]: {
		Dashboard: DefaultConstructionDashboardFlow,
		SiteDiary: DefaultConstructionSiteDiaryFlow,
	},
	[FLOW_MODULE_KEYS.DEFAULT_PRODUCTION]: {
		Dashboard: DefaultProductionFlow,
		SiteDiary: DefaultSiteDiaryFlow,
	},
	[FLOW_MODULE_KEYS.ZTC_PRODUCTION]: {
		Dashboard: ZtcProductionFlow,
		SiteDiary: ZtcSiteDiaryFlow,
	},
	[FLOW_MODULE_KEYS.TGEM_INVOICE_APPROVAL]: {
		Dashboard: TgemDashboard,
		SiteDiary: TgemSiteDiary,
	},
};

export function getFlowFrontendModule(
	flowModuleKey?: FlowModuleKey | string | null,
) {
	return (
		FLOW_FRONTEND_MODULES[String(flowModuleKey ?? "")] ??
		FLOW_FRONTEND_MODULES[FLOW_MODULE_KEYS.DEFAULT_CONSTRUCTION]
	);
}
