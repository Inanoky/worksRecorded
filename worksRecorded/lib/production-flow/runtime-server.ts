"use server";

import { FLOW_MODULE_KEYS } from "@/lib/flows/types";
import { resolveProductionFlowConfigForRuntime } from "@/lib/production-flow/config-server";
import { prisma } from "@/lib/utils/db";

export type ProductionFlowRuntimeContext = {
  organizationId: string;
  siteId: string;
};

export async function isZtcProductionFlowRuntime(args: {
  organizationId?: string | null;
  siteId?: string | null;
}) {
  const config = await resolveProductionFlowConfigForRuntime(args);
  return config?.flowModuleKey === FLOW_MODULE_KEYS.ZTC_PRODUCTION;
}

export async function resolveZtcProductionContextForSite(siteId?: string | null) {
  if (!siteId) return null;

  const site = await prisma.site.findUnique({
    where: { id: siteId },
    select: { id: true, organizationId: true },
  });
  if (!site?.organizationId) return null;

  const isZtc = await isZtcProductionFlowRuntime({
    organizationId: site.organizationId,
    siteId: site.id,
  });
  if (!isZtc) return null;

  return {
    organizationId: site.organizationId,
    siteId: site.id,
  } satisfies ProductionFlowRuntimeContext;
}

export async function resolveZtcProductionContextForWorker(worker: {
  organizationId?: string | null;
  siteId?: string | null;
}) {
  if (worker.siteId) {
    const siteContext = await resolveZtcProductionContextForSite(worker.siteId);
    if (siteContext) return siteContext;
  }

  const organizationId = worker.organizationId ?? "";
  if (!organizationId) return null;

  const assignedConfig = await resolveProductionFlowConfigForRuntime({
    organizationId,
    siteId: worker.siteId,
  });
  if (assignedConfig?.flowModuleKey !== FLOW_MODULE_KEYS.ZTC_PRODUCTION) return null;

  const configuredSiteId =
    worker.siteId && assignedConfig.siteIds.includes(worker.siteId)
      ? worker.siteId
      : assignedConfig.siteIds[0];
  if (configuredSiteId) {
    return {
      organizationId,
      siteId: configuredSiteId,
    } satisfies ProductionFlowRuntimeContext;
  }

  const firstSite = await prisma.site.findFirst({
    where: { organizationId },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (!firstSite) return null;

  return {
    organizationId,
    siteId: firstSite.id,
  } satisfies ProductionFlowRuntimeContext;
}

export async function getProductionFlowNavigationConfigForSite(siteId?: string | null) {
  if (!siteId) return null;
  const site = await prisma.site.findUnique({
    where: { id: siteId },
    select: { organizationId: true },
  });

  return resolveProductionFlowConfigForRuntime({
    organizationId: site?.organizationId ?? null,
    siteId,
  });
}
