import { FLOW_MODULE_KEYS, type FlowModuleDefinition } from "@/lib/flows/types";

export const ztcProductionFlowModule = {
  key: FLOW_MODULE_KEYS.ZTC_PRODUCTION,
  name: "ZTC Production",
  description: "ZTC production flow with drawing extraction, pauses, productivity exports, and ZTC WhatsApp handlers.",
  category: "production",
  clientFlowId: "ztc",
  productionConfigKey: "ztc-production",
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
    hideMemberPhoneSettings: true,
    hideMemberRoleSettings: true,
    settingsTitleVariant: "adminPanel",
  },
  entryPoints: {
    frontend: [
      "flows/ztc-production/frontend.ts",
      "flows/ztc-production/frontend",
      "flows/ztc-production/lib",
    ],
    backend: [
      "flows/ztc-production/backend.ts",
      "flows/ztc-production/backend/whatsapp-worker.ts",
      "flows/ztc-production/backend/whatsapp-quality.ts",
      "flows/ztc-production/backend/actions.ts",
    ],
  },
} satisfies FlowModuleDefinition;
