export const CLIENT_FLOW_IDS = {
  DEFAULT: "default",
  ZTC: "ztc",
  TGEM: "tgem",
} as const;

export type ClientFlowId = (typeof CLIENT_FLOW_IDS)[keyof typeof CLIENT_FLOW_IDS];

export const ZTC_ORGANIZATION_ID = "21511437-f6ab-402b-aa2d-613110eb61da";
export const ZTC_SITE_ID = "4c26c435-dd19-49d7-ad60-981eb1eeaeff";
export const TGEM_ORGANIZATION_ID = "a65149d2-8881-4c39-bb50-4134fd8c6219";
