import type { ComponentType } from "react";

import {
  DefaultProductionFlow as DefaultConstructionDashboardFlow,
  DefaultSiteDiaryFlow as DefaultConstructionSiteDiaryFlow,
} from "@/flows/default-construction/frontend";
import {
  DefaultProductionFlow,
  DefaultSiteDiaryFlow,
} from "@/flows/default-production/frontend";
import { TgemFlowPlaceholder } from "@/flows/tgem-invoice-approval/frontend";
import { ZtcProductionFlow, ZtcSiteDiaryFlow } from "@/flows/ztc-production/frontend";
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

export function getFlowFrontendModule(flowModuleKey?: FlowModuleKey | string | null) {
  return (
    FLOW_FRONTEND_MODULES[String(flowModuleKey ?? "")] ??
    FLOW_FRONTEND_MODULES[FLOW_MODULE_KEYS.DEFAULT_CONSTRUCTION]
  );
}
