// app/actions/saveSiteDiaryRecords.ts
"use server";

import { prisma} from "@/app/utils/db";
import { revalidatePath } from "next/cache";
import {requireUser} from "@/app/utils/requireUser"; // Optional: if you want to refresh data on page

type SiteDiaryRow = {
  date: string; // ISO string or null
  location: string;
  works: string;
  comments: string;
  units: string;
  amounts: string | number;
  workers: string | number;
  hours: string | number;
};

type SaveArgs = {
  rows: SiteDiaryRow[];
  siteId: string | null;
};

export async function saveSiteDiaryRecords({ rows, userId, siteId }: SaveArgs) {

  const user = await requireUser();

  // Defensive: Only save if at least one row with location or works
  const toInsert = rows
    .filter((r) => r.location || r.works)
    .map((row) => ({
      userId: user.id ?? undefined,
      siteId: siteId ?? undefined,
      Date: row.date ? new Date(row.date) : undefined,
      Location: row.location || undefined,
      Works: row.works || undefined,
      Comments: row.comments || undefined,
      Units: row.units || undefined,
      Amounts: row.amounts ? Number(row.amounts) : undefined,
      WorkersInvolved: row.workers ? Number(row.workers) : undefined,
      TimeInvolved: row.hours ? Number(row.hours) : undefined,
      Photos: [],
    }));

  if (!toInsert.length) return { ok: false, message: "No records to insert" };

  // Bulk insert
  await prisma.sitediaryrecords.createMany({ data: toInsert });

  // Optionally, revalidate data on page
  // revalidatePath("/site-diary");

  return { ok: true, count: toInsert.length };
}


//This for celendar

type Args = {
  siteId: string;
  year: number;
  month: number; // 0-based (Jan = 0)
};

/** Returns array of day numbers (1,2,3...) with entries for a month */
export async function getFilledDays({ siteId, year, month }: Args): Promise<number[]> {
  const from = new Date(year, month, 1);
  const to = new Date(year, month + 1, 1);

  const records = await prisma.sitediaryrecords.findMany({
    where: {
      siteId,
      Date: { gte: from, lt: to },
    },
    select: { Date: true },
  });

  // Filter null Dates and return unique days in month
  const daysSet = new Set(
    records
      .filter((rec) => rec.Date)
      .map((rec) => new Date(rec.Date!).getDate())
  );

  return Array.from(daysSet);
}



// Fetch diary records for a date and site
export async function getSiteDiaryRecords({ siteId, date }) {
  // Get records for the *same day* (ignoring time)
  const start = new Date(date);
  start.setHours(0,0,0,0);
  const end = new Date(date);
  end.setHours(23,59,59,999);

  const records = await prisma.sitediaryrecords.findMany({
    where: {
      siteId,
      Date: {
        gte: start,
        lte: end,
      },
    },
    // Pick only the fields you use in your row
    select: {
      id: true,
      Date: true,
      Location: true,
      Works: true,
      Units: true,
      Amounts: true,
      WorkersInvolved: true,
      TimeInvolved: true,
      Comments: true,
    },
  });

  // Map to frontend row structure
  return records.map((rec) => ({
    id: rec.id,
    date: rec.Date,
    location: rec.Location || "",
    works: rec.Works || "",
    units: rec.Units || "",
    amounts: rec.Amounts?.toString() || "",
    workers: rec.WorkersInvolved?.toString() || "",
    hours: rec.TimeInvolved?.toString() || "",
    comments: rec.Comments || "",
  }));
}