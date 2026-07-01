import {
  CLIENT_FLOW_IDS,
  TGEM_ORGANIZATION_ID,
  ZTC_ORGANIZATION_ID,
  ZTC_SITE_ID,
  type ClientFlowId,
} from "@/lib/client-flows/constants";

export function resolveClientFlow(args: {
  organizationId?: string | null;
  siteId?: string | null;
}): ClientFlowId {
  if (args.organizationId === TGEM_ORGANIZATION_ID) {
    return CLIENT_FLOW_IDS.TGEM;
  }

  if (args.organizationId === ZTC_ORGANIZATION_ID || args.siteId === ZTC_SITE_ID) {
    return CLIENT_FLOW_IDS.ZTC;
  }

  return CLIENT_FLOW_IDS.DEFAULT;
}
