"use server";

import { revalidatePath } from "next/cache";
import {
  BEGIN_ORGANIZATION_ID,
  BEGIN_STORAGE_MARKER,
  type BeginDay,
  parseBeginDay,
} from "@/lib/begin-hours";
import { persistBeginHours } from "@/lib/begin-hours-server";
import { prisma } from "@/lib/utils/db";
import { requireUser } from "@/lib/utils/requireUser";
import { orgCheck } from "@/server/actions/shared-actions";

async function authorize(siteId: string) {
  const user = await requireUser();
  const site = await orgCheck(user.id, siteId);
  if (!site) throw new Error("Nav piekļuves objektam.");
  return { user, site, enabled: site.organizationId === BEGIN_ORGANIZATION_ID };
}

const storageWhere = (siteId?: string) => ({
  organizationId: BEGIN_ORGANIZATION_ID,
  ...(siteId ? { siteId } : {}),
  archiveReason: BEGIN_STORAGE_MARKER,
  archivedAt: { not: null },
});

export async function getBeginHours(siteId: string) {
  const access = await authorize(siteId);
  if (!access.enabled)
    return {
      enabled: false,
      days: [] as BeginDay[],
      diaryDates: [] as string[],
    };
  const records = await prisma.sitediaryrecords.findMany({
    where: storageWhere(siteId),
    select: { Comments_Custom_2: true },
    orderBy: { Date: "desc" },
  });
  const diaryRecords = await prisma.sitediaryrecords.findMany({
    where: {
      siteId,
      organizationId: BEGIN_ORGANIZATION_ID,
      archivedAt: null,
      Date: { not: null },
    },
    select: { Date: true },
    distinct: ["Date"],
  });
  const diaryDates = diaryRecords.map((record) =>
    new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Riga" }).format(
      record.Date ?? new Date(0),
    ),
  );
  return {
    enabled: true,
    diaryDates,
    days: records.map((record) => {
      const day = parseBeginDay(record.Comments_Custom_2);
      return { ...day, history: [] };
    }),
  };
}

export async function importBeginHours(args: {
  siteId: string;
  snapshot: string;
  objects: string[];
  expectedRevision?: string;
}) {
  const { user, enabled } = await authorize(args.siteId);
  if (!enabled)
    throw new Error("Begin imports šai organizācijai nav iespējots.");
  const result = await persistBeginHours({
    ...args,
    importedBy: user.id,
    userId: user.id,
  });
  if (result.saved) revalidatePath(`/dashboard/sites/${args.siteId}`);
  return result;
}
