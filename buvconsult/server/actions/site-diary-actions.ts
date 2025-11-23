// app/actions/saveSiteDiaryRecords.ts
"use server";

import { prisma } from "@/lib/utils/db";
import { requireUser } from "@/lib/utils/requireUser";
import { parseExcelToTree } from "@/server/ai-flows/agents/settings/schema-upload/agent"; // Optional: if you want to refresh data on page
import { validateExcel } from "@/lib/utils/SiteDiary/Settings/validateSchema";
import { SavePhotoArgs, GetPhotosByDateArgs, Args } from "@/server/actions/types";
import { getOrganizationIdByUserId } from "./shared-actions";
import { getOrganizationIdByWorkerId } from "./shared-actions";



// Site diary records actions 

export async function saveSiteDiaryRecord({ rows, userId, workerId, siteId }) {
  // 🪵 LOG: Initial inputs for context
  console.log("--- saveSiteDiaryRecord START ---");
  console.log("Input Parameters:");
  console.log(`  userId: ${userId}`);
  console.log(`  workerId: ${workerId}`);
  console.log(`  siteId: ${siteId}`);
  console.log(`  rows received: ${rows.length}`);
  console.log("---------------------------------");

  // NEW: Determine the entity and fetch the organization ID
  const entityId = workerId ?? userId;
  const isWorker = !!workerId;

  // 🪵 LOG: Derived entity info
  console.log(`Derived Entity:`);
  console.log(`  isWorker (true if workerId is present): ${isWorker}`);
  console.log(`  entityId (workerId or userId): ${entityId}`);
  console.log("---------------------------------");

  let org = null;
  if (entityId) {
    // Assuming getOrganizationIdByWorkerId and getOrganizationIdByUserId exist
    // NEW: Use the appropriate lookup function based on whether workerId or userId is present
    if (isWorker) {
      org = await getOrganizationIdByWorkerId(entityId);
    } else {
      org = await getOrganizationIdByUserId(entityId);
    }

    // 🪵 LOG: Organization lookup result
    console.log(`Organization ID found: ${org}`);
  } else {
    // 🪵 LOG: No entity
    console.log("Organization ID skipped: No userId or workerId found.");
  }
  console.log("---------------------------------");

  // Make sure requireUser() is not triggering a redirect!
  // Defensive: Only save if at least one row with location or works
  const toInsert = rows
    .filter((r) => r.location || r.works)
    .map((row, idx) => {
      const out = {
        // UPDATE: Conditionally set userId or workerId
        userId: userId ?? undefined,
        workerId: workerId ?? undefined, // NEW
        siteId: siteId ?? undefined,
        organizationId: org ?? undefined,
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

      // 🪵 LOG: Transformed row object
      console.log(`Transformed Row #${idx + 1} (Original Data: ${JSON.stringify({ location: row.location, works: row.works })}):`);
      console.log(out);

      return out;
    });

  // 🪵 LOG: Filtering result
  console.log("---------------------------------");
  console.log(`Rows filtered and mapped: ${toInsert.length} (out of ${rows.length} received)`);

  if (!toInsert.length) {
    console.log("--- saveSiteDiaryRecord END: No records to insert ---");
    return { ok: false, message: "No records to insert" };
  }

  // 🪵 LOG: Final data to be inserted
  console.log("Final Data for prisma.sitediaryrecords.createMany:");
  console.log(toInsert);
  console.log("---------------------------------");

  // Bulk insert
  try {
    await prisma.sitediaryrecords.createMany({ data: toInsert });
    
    // 🪵 LOG: Successful insertion
    console.log(`Bulk insert successful. Count: ${toInsert.length}`);
    console.log("--- saveSiteDiaryRecord END: Success ---");

    // Optionally, revalidate data on page
    // revalidatePath("/site-diary");
    return { ok: true, count: toInsert.length }; //Multitenant

  } catch (err) {
    // 🪵 LOG: Error during insertion
    console.error("Database Insert Error:", err.message);
    console.log("--- saveSiteDiaryRecord END: Error ---");

    return { ok: false, message: err.message };
  }
}

export async function saveSiteDiaryRecordFromWeb({ rows, siteId }) {





  const user = await requireUser();
  const org = await getOrganizationIdByUserId(user.id)

  // Defensive: Only save if at least one row with location or works
  const toInsert = rows

    .map((row, idx) => {
      const out = {
        userId: user.id ?? undefined,
        siteId: siteId ?? undefined,
        organizationId: org ?? undefined,
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


  if (!toInsert.length) {

    return { ok: false, message: "No records to insert" };
  }

  // Bulk insert
  try {
    const dbResult = await prisma.sitediaryrecords.createMany({ data: toInsert });

  } catch (err) {

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

export async function deleteSiteDiaryRecord({ id }: { id: string }) {
  // id is the Prisma row ID (UUID)
  await prisma.sitediaryrecords.delete({
    where: { id },
  });
  return { success: true };
}


export async function getSiteDiaryRecord({ siteId, date }) {
  // Get records for the *same day* (ignoring time)
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

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


export async function getFilledDays({ siteId, year, month }: Args): Promise<number[]> {
  const from = new Date(year, month, 1);
  const to = new Date(year, month + 1, 1);

  // site diary records in month
  const records = await prisma.sitediaryrecords.findMany({
    where: {
      siteId,
      Date: { gte: from, lt: to },
    },
    select: { Date: true },
  });

  // photos in month (with a valid URL)
  const photos = await prisma.photos.findMany({
    where: {
      siteId,
      Date: { gte: from, lt: to },
      OR: [
        { URL: { not: null } },
        { fileUrl: { not: null } },
      ],
    },
    select: { Date: true },
  });

  // Collect unique day numbers
  const daysSet = new Set<number>();

  records.forEach((rec) => {
    if (rec.Date) daysSet.add(new Date(rec.Date).getDate());
  });

  photos.forEach((p) => {
    if (p.Date) daysSet.add(new Date(p.Date).getDate());
  });

  return Array.from(daysSet).sort((a, b) => a - b);
}



export async function saveSettingsToDB(formData: FormData) { //Multitenant

  const user = await requireUser();
  const org = await getOrganizationIdByUserId(user.id)

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


  // ✅ Download file buffer and validate
  const res = await fetch(fileUrl);
  if (!res.ok) throw new Error(`Failed to download file. HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());

  // Throws if invalid, otherwise returns true
  validateExcel(buf);
  console.log("✅ Excel validation passed");

  // 1) Run AI – normalize to an array before saving
  let schemaStr: string | null = null;
  try {
    const result = await parseExcelToTree(fileUrl, buf); // could be Node[] or { tree: Node[] }
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
    update: { fileUrl, schema: schemaStr, organizationId: org },
    create: { siteId, fileUrl, schema: schemaStr, organizationId: org },
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


export async function deleteSchemaBySiteId(formData: FormData) {
  const siteId = formData.get("siteId") as string;
  if (!siteId) throw new Error("siteId is required");

  await prisma.sitediarysettings.delete({
    where: { siteId },
  });

  return { success: true, siteId };
}


export async function getLocationsWorksFromSiteSchema(siteId: string, type: 'Location' | 'Work') {


  const schema = await getSiteDiarySchema({ siteId });

  function extractLocationNames(schema) {
    return schema.filter(node => node.type === "Location").map(node => node.name);

  }
  function extractWorkNames(schema) {
    const worksSet = new Set();
    function walk(node) {
      if (node.type === "Work") worksSet.add(node.name);
      node.children?.forEach(walk);
    }
    schema.forEach(walk);
    return Array.from(worksSet);
  }

  if (type === 'Location') {
    return extractLocationNames(schema);
  } else {
    return extractWorkNames(schema);





  }
}


export async function savePhoto({ //multitenant
  userId,
  // NEW: Destructure workerId
  workerId,
  siteId,
  url,
  fileUrl,
  comment,
  location,
  date,
}: SavePhotoArgs) {

  // NEW: Determine which ID to use for organization lookup and photo record
  const entityId = workerId ?? userId;
  const isWorker = !!workerId;

  // NEW: Use getOrganizationIdByWorkerId if it's a worker, otherwise use getOrganizationIdByUserId
  const org = entityId ?
    (isWorker ? await getOrganizationIdByWorkerId(entityId) : await getOrganizationIdByUserId(entityId))
    : null;


  // Normalize empties to null to satisfy Prisma's optional fields
  const rec = await prisma.photos.create({
    data: {
      Date: date ?? new Date(),
      URL: url ?? null,
      fileUrl: fileUrl ?? url ?? null,
      Comment: comment ?? null,
      Location: location ?? null,
      // UPDATE: Conditionally save userId or workerId
      userId: userId ?? null,
      workerId: workerId ?? null,
      siteId: siteId ?? null,
      organizationId: org
    },
  });

  return rec;
}

export async function getPhotosByDate({ siteId, startISO, endISO }: GetPhotosByDateArgs) {
  const start = new Date(startISO);
  const end = new Date(endISO);

  return prisma.photos.findMany({
    where: {
      siteId: siteId ?? undefined,
      Date: {
        gte: start,
        lt: end,
      },
    },
    orderBy: { Date: "desc" },
    select: {
      id: true,
      Date: true,
      URL: true,
      fileUrl: true,
      Comment: true,
      Location: true,
      siteId: true,
      userId: true,
    },
  });
}


export async function deletePhotoById(id: string) {
  // Optionally: add auth/ownership checks here
  await prisma.photos.delete({
    where: { id },
  });
  return { ok: true };
}


export async function getSitediaryRecordsBySiteIdForExcel(siteId: string) {
  if (!siteId) throw new Error("Missing siteId");

  return prisma.sitediaryrecords.findMany({
    where: { siteId },
    orderBy: [{ Date: "asc" }],
    select: {
      Date: true,
      Location: true,
      Works: true,
      Comments: true,
      Units: true,
      Amounts: true,
      WorkersInvolved: true,
      TimeInvolved: true,
      Photos: true,
      // add/remove fields as needed
      // id: true,
      // siteId: true,
    },
  })
}