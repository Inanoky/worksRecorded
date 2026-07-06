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
  entryPoints: {
    frontend: [
      "flows/ztc-production/frontend.ts",
      "components/client-flows/ztc",
      "components/sitediary/ZTC",
    ],
    backend: [
      "flows/ztc-production/backend.ts",
      "app/api/webhook/meta/webhook/ZTC",
      "components/sitediary/ZTC/actions.ts",
    ],
  },
} satisfies FlowModuleDefinition;

