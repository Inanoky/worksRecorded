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



export async function GetRecordsFromDB(siteId: string) {
  const user = await requireUser();

  const raw = await prisma.projectdiaryrecord.findMany({
    where: {
      userId: user.id,
      siteId,
    },
    include: {
      Site: { select: { name: true } },
      User: { select: { firstName: true, lastName: true } },
    },
    orderBy: { Date: "desc" }, // ✅ newest first
  });

  return raw.map((row, idx) => {
    let formattedDate = "";
    if (row.Date) {
      const d = new Date(row.Date);

      const datePart = d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });

      const timePart = d.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false, // 24h format
      });

      formattedDate = `Date: ${datePart} Time: ${timePart}`;
    }

    return {
      id: idx + 1,
      date: formattedDate,
      record: row.Record ?? "",
      Project: row.Site?.name ?? "",
      User: [row.User?.firstName, row.User?.lastName].filter(Boolean).join(" "),
      Delete : ""
    };
  });
}
