import { defaultConstructionFlowModule } from "@/flows/default-construction/module";
import { defaultProductionFlowModule } from "@/flows/default-production/module";
import { sprinklerAttendanceFlowModule } from "@/flows/sprinkler-attendance/module";
import { tgemInvoiceApprovalFlowModule } from "@/flows/tgem-invoice-approval/module";
import { ztcProductionFlowModule } from "@/flows/ztc-production/module";
import type {
  FlowModuleClientFlowId,
  FlowModuleDefinition,
  FlowModuleKey,
} from "@/lib/flows/types";

export const FLOW_MODULES: readonly FlowModuleDefinition[] = [
  defaultConstructionFlowModule,
  defaultProductionFlowModule,
  ztcProductionFlowModule,
  tgemInvoiceApprovalFlowModule,
  sprinklerAttendanceFlowModule,
];

export function getFlowModules() {
  return [...FLOW_MODULES];
}

export function getFlowModuleUi(key?: string | null) {
  return getFlowModuleByKey(key)?.ui ?? {};
}

export function getAssignableProductionFlowModules() {
  return FLOW_MODULES.filter((module) => module.category === "production" && module.productionConfigKey);
}

export function getFlowModuleByKey(key?: string | null) {
  return FLOW_MODULES.find((module) => module.key === key) ?? null;
}

export function getFlowModuleByProductionConfigKey(key?: string | null) {
  return FLOW_MODULES.find((module) => module.productionConfigKey === key) ?? null;
}

export function getClientFlowIdForFlowModuleKey(key?: string | null): FlowModuleClientFlowId {
  const module = getFlowModuleByKey(key);
  return module?.clientFlowId ?? "default";
}

export function shouldShowDashboardAiWidgetForFlowModule(key?: string | null) {
  return getFlowModuleByKey(key)?.ui?.showDashboardAiWidget ?? true;
}

export function shouldShowSiteDiaryAiWidgetForFlowModule(key?: string | null) {
  return getFlowModuleByKey(key)?.ui?.showSiteDiaryAiWidget ?? false;
}

export function isFlowModuleKey(value: string): value is FlowModuleKey {
  return Boolean(getFlowModuleByKey(value));
}
