export const FLOW_MODULE_KEYS = {
  DEFAULT_CONSTRUCTION: "default-construction",
  DEFAULT_PRODUCTION: "default-production",
  ZTC_PRODUCTION: "ztc-production",
  TGEM_INVOICE_APPROVAL: "tgem-invoice-approval",
  SPRINKLER_ATTENDANCE: "sprinkler-attendance",
} as const;

export type BuiltInFlowModuleKey = (typeof FLOW_MODULE_KEYS)[keyof typeof FLOW_MODULE_KEYS];
export type FlowModuleKey = BuiltInFlowModuleKey | (string & {});

export type FlowModuleCategory = "construction" | "production" | "invoice-approval";

export type FlowModuleClientFlowId = "default" | "ztc" | "tgem";

export type FlowModuleDefinition = {
  key: FlowModuleKey;
  name: string;
  description: string;
  category: FlowModuleCategory;
  clientFlowId: FlowModuleClientFlowId;
  productionConfigKey?: string;
  configurableAreas: string[];
  ui?: {
    showDashboardAiWidget?: boolean;
    showSiteDiaryAiWidget?: boolean;
    hideCreateProject?: boolean;
    hideOrganizationMaterialSettings?: boolean;
    hideBisSettings?: boolean;
    hideSiteAreaSettings?: boolean;
    hideMemberReminderSettings?: boolean;
    hideMemberPhoneSettings?: boolean;
    hideMemberRoleSettings?: boolean;
    showPhotoExport?: boolean;
    settingsTitleVariant?: "default" | "adminPanel";
  };
  entryPoints: {
    frontend: string[];
    backend: string[];
  };
};
