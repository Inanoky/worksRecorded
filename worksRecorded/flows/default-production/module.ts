import { FLOW_MODULE_KEYS, type FlowModuleDefinition } from "@/lib/flows/types";

export const defaultProductionFlowModule = {
  key: FLOW_MODULE_KEYS.DEFAULT_PRODUCTION,
  name: "Default Production",
  description: "Reusable production flow baseline for new production customers.",
  category: "production",
  clientFlowId: "default",
  productionConfigKey: "default-production",
  configurableAreas: ["labels", "features", "rates", "exports", "WhatsApp commands"],
  ui: {
    showDashboardAiWidget: true,
    showSiteDiaryAiWidget: false,
    hideCreateProject: true,
    hideOrganizationMaterialSettings: true,
    hideBisSettings: true,
    hideSiteAreaSettings: true,
    hideMemberReminderSettings: true,
  },
  entryPoints: {
    frontend: [
      "flows/default-production/frontend.ts",
      "flows/default-production/frontend",
    ],
    backend: [
      "flows/default-production/backend.ts",
      "flows/default-production/backend/worker.ts",
      "flows/default-production/backend/worker-route.ts",
    ],
  },
} satisfies FlowModuleDefinition;
