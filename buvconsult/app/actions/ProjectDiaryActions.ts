// app/actions/saveProjectDiaryRecord.ts
"use server";

import {requireUser} from "@/app/utils/requireUser";

import { prisma } from "@/app/utils/db";

type Params = {
  userId: string;
  siteId: string;
  date: Date;
  record?: string | null;
};

export async function saveProjectDiaryRecord({
  userId,
  siteId,
  date,
  record = null,
}: Params) {
  try {
    if (!userId || !siteId || !date) {
      return "something went wrong";
    }

    await prisma.projectdiaryrecord.create({
      data: {
        userId,
        siteId,
        Date: date,
        Record: record,
      },
    });

    return "successfully saved to database";
  } catch (err) {
    console.error("❌ Error saving ProjectDiaryRecord:", err);
    return "something went wrong";
  }
}


// app/actions/ProjectDiaryActions.ts


export async function GetRecordsFromDB(siteId: string) {
  const user = await requireUser();

  const raw = await prisma.projectdiaryrecord.findMany({
    where: { userId: user.id, siteId },
    select: {
      id: true,       // ✅ real PK (keep it)
      siteId: true,   // helpful for sanity checks
      Date: true,
      Record: true,
      Site: { select: { name: true } },
      User: { select: { firstName: true, lastName: true } },
    },
    orderBy: { Date: "desc" },
  });

  return raw.map((row, idx) => {
    let formattedDate = "";
    if (row.Date) {
      const d = new Date(row.Date);
      const datePart = d.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
      const timePart = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
      formattedDate = `Date: ${datePart} Time: ${timePart}`;
    }

    return {
      id: row.id,                         // ✅ used by GenericTable for actions
      date: formattedDate,                // UI field
      record: row.Record ?? "",           // UI field (lowercase)
      Project: row.Site?.name ?? "",
      User: [row.User?.firstName, row.User?.lastName].filter(Boolean).join(" "),
    };
  });
}

