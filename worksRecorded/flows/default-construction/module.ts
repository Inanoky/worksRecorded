import { FLOW_MODULE_KEYS, type FlowModuleDefinition } from "@/lib/flows/types";

export const defaultConstructionFlowModule = {
  key: FLOW_MODULE_KEYS.DEFAULT_CONSTRUCTION,
  name: "Default Construction",
  description: "Baseline construction site diary flow.",
  category: "construction",
  clientFlowId: "default",
  configurableAreas: ["labels", "navigation", "site diary table"],
  ui: {
    showDashboardAiWidget: true,
    showSiteDiaryAiWidget: true,
    showPhotoExport: true,
  },
  entryPoints: {
    frontend: [
      "flows/default-construction/frontend.ts",
      "flows/default-construction/frontend",
    ],
    backend: [
      "flows/default-construction/backend.ts",
      "flows/default-construction/backend/site-manager-route.ts",
      "flows/default-production/backend/worker.ts",
    ],
  },
} satisfies FlowModuleDefinition;
