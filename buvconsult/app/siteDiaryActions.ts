// app/actions/saveSiteDiaryRecords.ts
"use server";

import { prisma} from "@/app/utils/db";
import { revalidatePath } from "next/cache";
import {requireUser} from "@/app/utils/requireUser";
import {parseExcelToTree} from "@/components/AI/SiteDiary/agent"; // Optional: if you want to refresh data on page

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

export async function saveSiteDiaryRecords({ rows, userId, siteId }) {


  console.log("=== saveSiteDiaryRecords called ===");
  console.log("Input rows:", JSON.stringify(rows, null, 2));
  console.log("Input userId:", userId);
  console.log("Input siteId:", siteId);

  // Make sure requireUser() is not triggering a redirect!

  console.log("Authenticated user:", userId);

  // Defensive: Only save if at least one row with location or works
  const toInsert = rows
    .filter((r) => r.location || r.works)
    .map((row, idx) => {
      const out = {
        userId: userId ?? undefined,
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
      };
      console.log(`Prepared insert row ${idx}:`, out);
      return out;
    });

  console.log("Rows prepared for DB insert:", JSON.stringify(toInsert, null, 2));

  if (!toInsert.length) {
    console.log("No records to insert. Exiting early.");
    return { ok: false, message: "No records to insert" };
  }

  // Bulk insert
  try {
    const dbResult = await prisma.sitediaryrecords.createMany({ data: toInsert });
    console.log("Database createMany result:", dbResult);
  } catch (err) {
    console.error("Error inserting records into DB:", err);
    return { ok: false, message: err.message };
  }

  // Optionally, revalidate data on page
  // revalidatePath("/site-diary");

  console.log("Insert successful. Inserted:", toInsert.length, "records.");
  return { ok: true, count: toInsert.length };
}



export async function saveSiteDiaryRecordsFromWeb({ rows,  siteId }) {

  const user = await requireUser();
  const userId = user.id

  console.log("=== saveSiteDiaryRecords called ===");
  console.log("Input rows:", JSON.stringify(rows, null, 2));
  console.log("Input userId:", userId);
  console.log("Input siteId:", siteId);

  // Make sure requireUser() is not triggering a redirect!

  console.log("Authenticated user:", userId);

  // Defensive: Only save if at least one row with location or works
  const toInsert = rows
    .filter((r) => r.location || r.works)
    .map((row, idx) => {
      const out = {
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
      };
      console.log(`Prepared insert row ${idx}:`, out);
      return out;
    });

  console.log("Rows prepared for DB insert:", JSON.stringify(toInsert, null, 2));

  if (!toInsert.length) {
    console.log("No records to insert. Exiting early.");
    return { ok: false, message: "No records to insert" };
  }

  // Bulk insert
  try {
    const dbResult = await prisma.sitediaryrecords.createMany({ data: toInsert });
    console.log("Database createMany result:", dbResult);
  } catch (err) {
    console.error("Error inserting records into DB:", err);
    return { ok: false, message: err.message };
  }

  // Optionally, revalidate data on page
  // revalidatePath("/site-diary");

  console.log("Insert successful. Inserted:", toInsert.length, "records.");
  return { ok: true, count: toInsert.length };
}




export async function updateSiteDiaryRecord({ id, ...fields }) {
  console.log("=== updateSiteDiaryRecord called ===");
  console.log("Update ID:", id);
  console.log("Update fields:", JSON.stringify(fields, null, 2));
  try {
    const updated = await prisma.sitediaryrecords.update({
      where: { id },
      data: fields,
    });
    console.log("Update result:", updated);
    return { ok: true, record: updated };
  } catch (err) {
    console.error("Error updating record:", err);
    return { ok: false, message: err.message };
  }
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



//Delete functionality



export async function deleteSiteDiaryRecord({ id }: { id: string }) {
  // id is the Prisma row ID (UUID)
  await prisma.sitediaryrecords.delete({
    where: { id },
  });
  return { success: true };
}



export async function saveSettingsToDB(formData: FormData) {
  const siteId = formData.get("siteId") as string;
  let urls = formData.get("fileUrls");
  let fileUrl = "";

  if (Array.isArray(urls)) {
    fileUrl = urls[0] || "";
  } else if (typeof urls === "string") {
    try {
      const parsed = JSON.parse(urls);
      fileUrl = Array.isArray(parsed) ? (parsed[0] ?? "") : parsed;
    } catch {
      fileUrl = urls;
    }
  }

  if (!siteId || !fileUrl) {
    throw new Error("Missing siteId or fileUrl");
  }

  // 1) Run AI – normalize to an array before saving
  let schemaStr: string | null = null;
  try {
    const result = await parseExcelToTree(fileUrl); // could be Node[] or { tree: Node[] }
    const treeArray = Array.isArray(result) ? result : result?.tree;
    if (Array.isArray(treeArray)) {
      schemaStr = JSON.stringify(treeArray);
    } else {
      console.warn("AI returned unexpected shape; skipping schema save.");
    }
  } catch (err) {
    console.error("AI parse failed; saving fileUrl only:", err);
  }

  // 2) Upsert
  await prisma.sitediarysettings.upsert({
    where: { siteId },
    update: { fileUrl, schema: schemaStr },
    create: { siteId, fileUrl, schema: schemaStr },
  });

  return { success: true, siteId, fileUrl, schemaSaved: Boolean(schemaStr) };
}


export async function getSiteDiarySchema({ siteId }) {
  if (!siteId) return null;
  const settings = await prisma.sitediarysettings.findUnique({
    where: { siteId },
    select: { schema: true },
  });
  return settings?.schema ? JSON.parse(settings.schema) : null;
}