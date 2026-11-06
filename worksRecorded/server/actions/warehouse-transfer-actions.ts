"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/utils/db";
import { requireUser } from "@/lib/utils/requireUser";
import { orgCheck } from "@/server/actions/shared-actions";

export type WarehouseTransferTarget = {
  id: string;
  name: string;
};

export async function getWarehouseTransferTargets(
  sourceSiteId: string
): Promise<WarehouseTransferTarget[]> {
  if (!sourceSiteId) throw new Error("Missing source project id");

  const user = await requireUser();
  const sourceSite = await orgCheck(user.id, sourceSiteId);
  if (!sourceSite || !sourceSite.organizationId) {
    throw new Error("Source project not found");
  }

  return prisma.site.findMany({
    where: {
      organizationId: sourceSite.organizationId,
      id: { not: sourceSiteId },
    },
    orderBy: [{ name: "asc" }, { createdAt: "desc" }],
    select: { id: true, name: true },
  });
}

export async function moveWarehouseRecordsToProject({
  sourceSiteId,
  targetSiteId,
  recordIds,
}: {
  sourceSiteId: string;
  targetSiteId: string;
  recordIds: string[];
}) {
  if (!sourceSiteId) throw new Error("Missing source project id");
  if (!targetSiteId) throw new Error("Missing target project id");
  if (sourceSiteId === targetSiteId) {
    throw new Error("Choose a different target project");
  }

  const uniqueRecordIds = Array.from(new Set(recordIds.filter(Boolean)));
  if (!uniqueRecordIds.length) throw new Error("No warehouse records selected");

  const user = await requireUser();
  const [sourceSite, targetSite] = await Promise.all([
    orgCheck(user.id, sourceSiteId),
    orgCheck(user.id, targetSiteId),
  ]);

  if (!sourceSite || !sourceSite.organizationId) {
    throw new Error("Source project not found");
  }
  if (!targetSite || !targetSite.organizationId) {
    throw new Error("Target project not found");
  }
  if (sourceSite.organizationId !== targetSite.organizationId) {
    throw new Error("Target project must belong to the same organization");
  }

  const result = await prisma.$transaction(async (tx) => {
    const records = await tx.bISmaterialRecords.findMany({
      where: {
        id: { in: uniqueRecordIds },
        siteId: sourceSiteId,
      },
      select: { id: true, BISId: true },
    });

    if (records.length !== uniqueRecordIds.length) {
      throw new Error("Some selected warehouse records were not found");
    }
    if (records.some((record) => record.BISId)) {
      throw new Error(
        "Records already sent to BIS cannot be moved to another project"
      );
    }

    const moved = await tx.bISmaterialRecords.updateMany({
      where: {
        id: { in: uniqueRecordIds },
        siteId: sourceSiteId,
        BISId: null,
      },
      data: {
        siteId: targetSiteId,
        orgId: targetSite.organizationId,
      },
    });

    if (moved.count !== uniqueRecordIds.length) {
      throw new Error("Some selected warehouse records could not be moved");
    }

    return {
      count: moved.count,
      movedIds: uniqueRecordIds,
      targetSiteId,
    };
  });

  revalidatePath(`/dashboard/sites/${sourceSiteId}/BIS`);
  revalidatePath(`/dashboard/sites/${targetSiteId}/BIS`);
  return result;
}
