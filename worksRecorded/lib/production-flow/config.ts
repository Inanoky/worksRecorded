import { FLOW_MODULE_KEYS, type FlowModuleKey } from "@/lib/flows/types";

export const FLOW_CONFIG_ADMIN_USER_ID = "kp_d9afeea81ab6410c83507bd957997476";
export const ZTC_PRODUCTION_ORGANIZATION_ID = "21511437-f6ab-402b-aa2d-613110eb61da";
export const ZTC_PRODUCTION_SITE_ID = "4c26c435-dd19-49d7-ad60-981eb1eeaeff";

export type ProductionFlowFeatureKey =
  | "drawings"
  | "pause"
  | "productivityExport"
  | "payrollExport"
  | "additionalWorks";

export type ProductionFlowConfig = {
  key: string;
  baseFlowKey?: string;
  flowModuleKey: FlowModuleKey;
  name: string;
  description: string;
  enabled: boolean;
  isDefault?: boolean;
  organizationIds: string[];
  siteIds: string[];
  labels: {
    navigationTitle: string;
    navigationTitleLv: string;
    journalTitle: string;
    ratesTitle: string;
  };
  features: Record<ProductionFlowFeatureKey, boolean>;
  navigation: {
    hiddenProjectNavPaths: string[];
  };
  coefficients: {
    rows: Array<{
      code: string;
      task: string;
      defaultRate: string;
      unit: string;
    }>;
  };
  whatsapp: {
    pauseCommand: string;
    resumeCommand: string;
    changeProjectCommands: string[];
  };
  strategies: {
    whatsappWorker: "legacy-worker-v1" | "ztc-worker-v1";
    whatsappQuality: "none" | "ztc-quality-v1";
  };
  additionalWorks: {
    mode: "default" | "ztc-element-aware";
  };
};

export const DEFAULT_PRODUCTION_FLOW_CONFIG: ProductionFlowConfig = {
  key: "default-production",
  baseFlowKey: "default-production",
  flowModuleKey: FLOW_MODULE_KEYS.DEFAULT_PRODUCTION,
  name: "Default Production",
  description: "Reusable baseline for new production-flow customers.",
  enabled: true,
  isDefault: true,
  organizationIds: [],
  siteIds: [],
  labels: {
    navigationTitle: "Production journal",
    navigationTitleLv: "Ražošanas žurnāls",
    journalTitle: "Production journal",
    ratesTitle: "Work rates",
  },
  features: {
    drawings: true,
    pause: false,
    productivityExport: false,
    payrollExport: false,
    additionalWorks: true,
  },
  navigation: {
    hiddenProjectNavPaths: ["timesheets", "BIS"],
  },
  coefficients: {
    rows: [
      { code: "X", task: "X koeficients", defaultRate: "1.2", unit: "x" },
      { code: "X X", task: "X X koeficients", defaultRate: "1.5", unit: "x" },
    ],
  },
  whatsapp: {
    pauseCommand: "Pauze",
    resumeCommand: "Turpinu",
    changeProjectCommands: ["Change", "Project", "Projekts"],
  },
  strategies: {
    whatsappWorker: "legacy-worker-v1",
    whatsappQuality: "none",
  },
  additionalWorks: {
    mode: "default",
  },
};

export const ZTC_PRODUCTION_FLOW_CONFIG: ProductionFlowConfig = {
  ...DEFAULT_PRODUCTION_FLOW_CONFIG,
  key: "ztc-production",
  baseFlowKey: "default-production",
  flowModuleKey: FLOW_MODULE_KEYS.ZTC_PRODUCTION,
  name: "ZTC Production",
  description: "ZTC-specific production flow with drawings, pauses, productivity, and element-aware additional works.",
  isDefault: false,
  organizationIds: [ZTC_PRODUCTION_ORGANIZATION_ID],
  siteIds: [ZTC_PRODUCTION_SITE_ID],
  features: {
    drawings: true,
    pause: true,
    productivityExport: true,
    payrollExport: true,
    additionalWorks: true,
  },
  coefficients: {
    rows: [
      { code: "X", task: "X koeficients", defaultRate: "1.2", unit: "x" },
      { code: "X X", task: "X X koeficients", defaultRate: "1.5", unit: "x" },
      { code: "1", task: "1 koeficients", defaultRate: "1", unit: "x" },
      { code: "2", task: "2 koeficients", defaultRate: "1", unit: "x" },
      { code: "3", task: "3 koeficients", defaultRate: "1", unit: "x" },
      { code: "4", task: "4 koeficients", defaultRate: "1", unit: "x" },
      { code: "5", task: "5 koeficients", defaultRate: "1", unit: "x" },
      { code: "6", task: "6 koeficients", defaultRate: "1", unit: "x" },
    ],
  },
  additionalWorks: {
    mode: "ztc-element-aware",
  },
  strategies: {
    whatsappWorker: "ztc-worker-v1",
    whatsappQuality: "ztc-quality-v1",
  },
};

export const PRODUCTION_FLOW_CONFIGS = [
  DEFAULT_PRODUCTION_FLOW_CONFIG,
  ZTC_PRODUCTION_FLOW_CONFIG,
] as const satisfies readonly ProductionFlowConfig[];

export function getProductionFlowConfigs() {
  return [...PRODUCTION_FLOW_CONFIGS];
}

export function getProductionFlowConfigByKey(key: string) {
  return PRODUCTION_FLOW_CONFIGS.find((config) => config.key === key) ?? null;
}

export function getZtcProductionFlowConfig() {
  return ZTC_PRODUCTION_FLOW_CONFIG;
}

export function getProductionFlowPrimaryOrganizationId(config: ProductionFlowConfig) {
  return config.organizationIds[0] ?? "";
}

export function getProductionFlowPrimarySiteId(config: ProductionFlowConfig) {
  return config.siteIds[0] ?? "";
}

export function resolveProductionFlowConfig(args: {
  organizationId?: string | null;
  siteId?: string | null;
}) {
  const organizationId = args.organizationId ?? "";
  const siteId = args.siteId ?? "";

  return (
    PRODUCTION_FLOW_CONFIGS.find(
      (config) =>
        !config.isDefault &&
        config.enabled &&
        (config.organizationIds.includes(organizationId) || config.siteIds.includes(siteId)),
    ) ?? null
  );
}

export function isProductionFlowClient(args: {
  organizationId?: string | null;
  siteId?: string | null;
}) {
  return Boolean(resolveProductionFlowConfig(args));
}

export function getProductionFlowNavigationConfig(args: {
  organizationId?: string | null;
  siteId?: string | null;
}) {
  return resolveProductionFlowConfig(args) ?? null;
}

export function isLocalhostHost(host?: string | null) {
  const normalizedHost = String(host ?? "")
    .split(",")[0]
    .trim()
    .toLowerCase();

  return (
    normalizedHost === "localhost" ||
    normalizedHost.startsWith("localhost:") ||
    normalizedHost === "127.0.0.1" ||
    normalizedHost.startsWith("127.0.0.1:") ||
    normalizedHost === "::1" ||
    normalizedHost === "[::1]" ||
    normalizedHost.startsWith("[::1]:")
  );
}

export function canAccessFlowConfigAdmin(userId?: string | null, host?: string | null) {
  return userId === FLOW_CONFIG_ADMIN_USER_ID || isLocalhostHost(host);
}
