"use server";

import defaultConfig from "@/components/sitediary/configs/defaultConfig.json";
import { getDefaultConstructionProductivitySettings } from "@/flows/default-construction/lib/site-diary-productivity-settings";
import { requireUser } from "@/lib/utils/requireUser";
import { prisma } from "@/lib/utils/db";
import { orgCheck } from "@/server/actions/shared-actions";
import {
  buildDefaultConstructionScopeSummary,
  type DefaultConstructionSummaryScope,
} from "@/flows/default-construction/lib/site-diary-summary";

export async function getDefaultConstructionScopeSummary(args: {
  siteId: string;
  scope: DefaultConstructionSummaryScope;
  value: string;
}) {
  const user = await requireUser();
  await orgCheck(user.id, args.siteId);

  const value = String(args.value ?? "").trim();
  if (!value) throw new Error("Summary value is required");

  const [site, rows] = await Promise.all([
    prisma.site.findUnique({
      where: { id: args.siteId },
      select: { siteDiaryRecordsMap: true },
    }),
    prisma.sitediaryrecords.findMany({
      where: {
        siteId: args.siteId,
        archivedAt: null,
        ...(args.scope === "location" ? { Location: value } : { Works: value }),
      },
      orderBy: [{ Date: "asc" }, { createdAt: "asc" }],
      select: {
        Date: true,
        Location: true,
        Works: true,
        Units: true,
        Amounts: true,
        WorkersInvolved: true,
        TimeInvolved: true,
      },
    }),
  ]);

  if (!site) throw new Error("Site not found");
  const config =
    site.siteDiaryRecordsMap && typeof site.siteDiaryRecordsMap === "object"
      ? (site.siteDiaryRecordsMap as Record<string, any>)
      : (defaultConfig as Record<string, any>);
  const productivitySettings = getDefaultConstructionProductivitySettings(config);

  return buildDefaultConstructionScopeSummary({
    scope: args.scope,
    value,
    rows,
    productivitySettings: productivitySettings.works,
  });
}
