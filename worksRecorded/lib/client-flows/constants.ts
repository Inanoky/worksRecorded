import {
  ZTC_PRODUCTION_ORGANIZATION_ID,
  ZTC_PRODUCTION_SITE_ID,
} from "@/lib/production-flow/config";

export const CLIENT_FLOW_IDS = {
  DEFAULT: "default",
  ZTC: "ztc",
  TGEM: "tgem",
} as const;

export type ClientFlowId = (typeof CLIENT_FLOW_IDS)[keyof typeof CLIENT_FLOW_IDS];

export const ZTC_ORGANIZATION_ID = ZTC_PRODUCTION_ORGANIZATION_ID;
export const ZTC_SITE_ID = ZTC_PRODUCTION_SITE_ID;
export const TGEM_ORGANIZATION_ID = "a65149d2-8881-4c39-bb50-4134fd8c6219";
