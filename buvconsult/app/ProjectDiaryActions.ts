// app/actions/saveProjectDiaryRecord.ts
"use server";

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
