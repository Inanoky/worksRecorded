import { FLOW_MODULE_KEYS, type FlowModuleDefinition } from "@/lib/flows/types";

export const defaultProductionFlowModule = {
  key: FLOW_MODULE_KEYS.DEFAULT_PRODUCTION,
  name: "Default Production",
  description: "Reusable production workflow with drawing extraction, pauses, productivity exports, quality checks, and WhatsApp handlers.",
  category: "production",
  clientFlowId: "ztc",
  productionConfigKey: "default-production",
  configurableAreas: [
    "labels",
    "features",
    "rates",
    "coefficients",
    "additional works",
    "exports",
    "WhatsApp strategies",
  ],
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
      "flows/default-production/lib",
    ],
    backend: [
      "flows/default-production/backend.ts",
      "flows/default-production/backend/worker.ts",
      "flows/default-production/backend/worker-route.ts",
      "flows/default-production/backend/whatsapp-worker.ts",
      "flows/default-production/backend/whatsapp-quality.ts",
      "flows/default-production/backend/actions.ts",
    ],
  },
} satisfies FlowModuleDefinition;
