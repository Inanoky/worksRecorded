import { FLOW_MODULE_KEYS, type FlowModuleDefinition } from "@/lib/flows/types";

export const defaultProductionFlowModule = {
  key: FLOW_MODULE_KEYS.DEFAULT_PRODUCTION,
  name: "Default Production",
  description: "Reusable production flow baseline for new production customers.",
  category: "production",
  clientFlowId: "default",
  productionConfigKey: "default-production",
  configurableAreas: ["labels", "features", "rates", "exports", "WhatsApp commands"],
  entryPoints: {
    frontend: [
      "flows/default-production/frontend.ts",
      "flows/default-construction/frontend",
    ],
    backend: [
      "flows/default-production/backend.ts",
    ],
  },
} satisfies FlowModuleDefinition;
