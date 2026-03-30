"use server";

import { prisma } from "@/lib/utils/db";
import { requireBisAccessTokenForSite, getBisBaseUrl } from "@/server/actions/BIS/service";
import { requireUser } from "@/lib/utils/requireUser";
import { parseExcelToTree } from "@/server/ai-flows/agents/settings/schema-upload/agent"; // Optional: if you want to refresh data on page
import { validateExcel } from "@/lib/utils/SiteDiary/Settings/validateSchema";
import { SavePhotoArgs, GetPhotosByDateArgs, Args } from "@/server/actions/types";
import { getOrganizationIdByUserId } from "./shared-actions";
import { getOrganizationIdByWorkerId } from "./shared-actions";
import { getUserFullNameById, getWorkerFullNameById } from "./whatsapp-actions";
import { Turret_Road } from "next/font/google";
import { isQuestionDotToken } from "typescript";

//nothing

function formatOriginalUserComment(originalUserComment?: string, fullName?: string | null) {
  const normalizedComment = originalUserComment?.trim();
  const normalizedFullName = fullName?.trim();

  if (!normalizedComment) return undefined;
  if (!normalizedFullName) return normalizedComment;

  if (normalizedComment.startsWith(`${normalizedFullName} :`)) {
    return normalizedComment;
  }

  return `${normalizedFullName} : ${normalizedComment}`;
}

//-------Loading config------------------------------

export async function getConfig(siteId: string) {
  const clientConfig = await prisma.site.findUnique({
    where: {
      id: siteId,
    },
    select: {
      siteDiaryRecordsMap: true,
    },
  });

  return clientConfig?.siteDiaryRecordsMap ?? null;
}

// Site diary records actions

export async function saveSiteDiaryRecord({
  rows,
  userId,
  workerId,
  siteId,
  originalUserComment,
}: {
  rows: any[];
  userId?: string;
  workerId?: string;
  siteId?: string;
  originalUserComment?: string;
}) {
  // 🪵 LOG: Initial inputs for context

  // NEW: Determine the entity and fetch the organization ID
  const entityId = workerId ?? userId;
  const isWorker = !!workerId;

  // 🪵 LOG: Derived entity info

  const fullName = entityId
    ? isWorker
      ? await getWorkerFullNameById(entityId)
      : await getUserFullNameById(entityId)
    : null;

  const formattedOriginalUserComment = formatOriginalUserComment(
    originalUserComment,
    fullName,
  );

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
    .filter((r) => r.Location || r.Works)
    .map((row, idx) => {
      const out = {
        // UPDATE: Conditionally set userId or workerId
        userId: userId ?? undefined,
        workerId: workerId ?? undefined,
        siteId: siteId ?? undefined,
        organizationId: org ?? undefined,

        Date: row.Date ? new Date(row.Date) : undefined,
        Date_Custom_1: row.Date_Custom_1 ? new Date(row.Date_Custom_1) : undefined,
        Date_Custom_2: row.Date_Custom_2 ? new Date(row.Date_Custom_2) : undefined,

        Location: row.Location || undefined,
        Location_Custom_1: row.Location_Custom_1 || undefined,
        Location_Custom_2: row.Location_Custom_2 || undefined,

        Works: row.Works || undefined,
        Works_Custom_1: row.Works_Custom_1 || undefined,
        Works_Custom_2: row.Works_Custom_2 || undefined,

        Comments: row.Comments || undefined,
        Comments_Custom_1: row.Comments_Custom_1 || undefined,
        Comments_Custom_2: row.Comments_Custom_2 || undefined,

        originalUserComment: formattedOriginalUserComment,

        Units: row.Units || undefined,
        Amounts: row.Amounts !== "" ? Number(row.Amounts) : undefined,
        WorkersInvolved:
          row.WorkersInvolved !== "" ? Number(row.WorkersInvolved) : undefined,
        TimeInvolved: row.TimeInvolved !== "" ? Number(row.TimeInvolved) : undefined,
        Photos: [],
      };

      // 🪵 LOG: Transformed row object
      console.log(
        `Transformed Row #${idx + 1} (Original Data: ${JSON.stringify({
          location: row.location,
          works: row.works,
        })}):`,
      );
      console.log(out);

      return out;
    });

  if (!toInsert.length) {
    console.log("--- saveSiteDiaryRecord END: No records to insert ---");
    return { ok: false, message: "No records to insert" };
  }

  try {
    await prisma.sitediaryrecords.createMany({ data: toInsert });

    return { ok: true, count: toInsert.length }; //Multitenant
  } catch (err: any) {
    return { ok: false, message: err.message };
  }
}

export async function saveSiteDiaryRecordFromWeb({ rows, siteId }) {
  const user = await requireUser();
  const org = await getOrganizationIdByUserId(user.id);

  // Defensive: Only save if at least one row with location or works
  const toInsert = rows.map((row, idx) => {
    const out = {
      userId: user.id ?? undefined,
      siteId: siteId ?? undefined,
      organizationId: org ?? undefined,

      Date: row.Date ? new Date(row.Date) : undefined,
      Date_Custom_1: row.Date_Custom_1 ? new Date(row.Date_Custom_1) : undefined,
      Date_Custom_2: row.Date_Custom_2 ? new Date(row.Date_Custom_2) : undefined,
      Location: row.Location || undefined,
      Location_Custom_1: row.Location_Custom_1 || undefined,
      Location_Custom_2: row.Location_Custom_2 || undefined,
      Works: row.Works || undefined,
      Works_Custom_1: row.Works_Custom_1 || undefined,
      Works_Custom_2: row.Works_Custom_2 || undefined,
      Comments: row.Comments || undefined,
      Comments_Custom_1: row.Comments_Custom_1 || undefined,
      Comments_Custom_2: row.Comments_Custom_2 || undefined,
      Units: row.Units || undefined,
      Amounts: row.Amounts !== "" ? Number(row.Amounts) : undefined,
      WorkersInvolved:
        row.WorkersInvolved !== "" ? Number(row.WorkersInvolved) : undefined,
      TimeInvolved: row.TimeInvolved !== "" ? Number(row.TimeInvolved) : undefined,
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
  } catch (err: any) {
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
  } catch (err: any) {
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
      Date_Custom_1: true,
      Date_Custom_2: true,
      Location: true,
      Location_Custom_1: true,
      Location_Custom_2: true,
      Works: true,
      Works_Custom_1: true,
      Works_Custom_2: true,

      Units: true,
      Amounts: true,
      WorkersInvolved: true,
      TimeInvolved: true,
      Comments: true,
      Comments_Custom_1: true,
      Comments_Custom_2: true,
      originalUserComment: true,

      // >>> START: NEW FIELDS for 'Created by' logic
      userId: true, // Keep userId for update payload
      workerId: true, // Keep workerId for update payload
      User: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
      Worker: {
        select: {
          name: true,
          surname: true,
        },
      },
      // <<< END: NEW FIELDS
    },
  });

  // Helper function to build the full name from parts
  const formatCreatorName = (
    firstName: string | null | undefined,
    lastName: string | null | undefined,
  ): string => {
    const parts = [];
    if (firstName) parts.push(firstName);
    if (lastName) parts.push(lastName);
    return parts.join(" ");
  };

  // Map to frontend row structure
  return records.map((rec) => {
    let createdBy = "";

    if (rec.User) {
      // Created by User
      createdBy = formatCreatorName(rec.User.firstName, rec.User.lastName);
    } else if (rec.Worker) {
      // Created by Worker
      createdBy = formatCreatorName(rec.Worker.name, rec.Worker.surname);
    }

    return {
      id: rec.id,
      Date: rec.Date,
      Date_Custom_1: rec.Date_Custom_1,
      Date_Custom_2: rec.Date_Custom_2,

      Location: rec.Location || "",
      Location_Custom_1: rec.Location_Custom_1 || "",
      Location_Custom_2: rec.Location_Custom_2 || "",

      Works: rec.Works || "",
      Works_Custom_1: rec.Works_Custom_1 || "",
      Works_Custom_2: rec.Works_Custom_2 || "",

      Units: rec.Units || "",
      Amounts: rec.Amounts?.toString() || "",
      WorkersInvolved: rec.WorkersInvolved?.toString() || "",
      TimeInvolved: rec.TimeInvolved?.toString() || "",

      Comments: rec.Comments || "",
      Comments_Custom_1: rec.Comments_Custom_1 || "",
      Comments_Custom_2: rec.Comments_Custom_2 || "",
      originalUserComment: rec.originalUserComment || "",

      // >>> NEW FIELD
      createdBy: createdBy || "N/A",
      // <<< NEW FIELD
    };
  });
}

export async function getSitediaryRecordsBySiteIdForExcel(siteId: string) {
  if (!siteId) throw new Error("Missing siteId");

  const records = await prisma.sitediaryrecords.findMany({
    where: { siteId },
    orderBy: [{ createdAt: "desc" }],
    select: {
      id: true,
      createdAt: true,
      Date: true,
      createdAt: true,
      Date_Custom_1: true,
      Date_Custom_2: true,

      Location: true,
      Location_Custom_1: true,
      Location_Custom_2: true,

      Works: true,
      Works_Custom_1: true,
      Works_Custom_2: true,

      Comments: true,
      Comments_Custom_1: true,
      Comments_Custom_2: true,

      Units: true,
      Amounts: true,
      WorkersInvolved: true,
      TimeInvolved: true,
      Photos: true,
      BISId: true,
      originalUserComment: true,

      // createdBy support
      User: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
      Worker: {
        select: {
          name: true,
          surname: true,
        },
      },
    },
  });

  console.log("[getSitediaryRecordsBySiteIdForExcel] fetched records:", records.length);
  console.log(
    "[getSitediaryRecordsBySiteIdForExcel] sample createdAt values:",
    records.slice(0, 10).map((r) => ({
      id: r.id,
      Date: r.Date,
      createdAt: r.createdAt,
    })),
  );

  const formatCreatorName = (
    firstName: string | null | undefined,
    lastName: string | null | undefined,
  ): string => {
    const parts: string[] = [];
    if (firstName) parts.push(firstName);
    if (lastName) parts.push(lastName);
    return parts.join(" ");
  };

  return records.map((rec) => {
    let createdBy = "";

    if (rec.User) {
      createdBy = formatCreatorName(rec.User.firstName, rec.User.lastName);
    } else if (rec.Worker) {
      createdBy = formatCreatorName(rec.Worker.name, rec.Worker.surname);
    }

    return {
      id: rec.id,
      createdAt: rec.createdAt,
      Date: rec.Date,
      createdAt: rec.createdAt,
      Date_Custom_1: rec.Date_Custom_1,
      Date_Custom_2: rec.Date_Custom_2,

      Location: rec.Location || "",
      Location_Custom_1: rec.Location_Custom_1 || "",
      Location_Custom_2: rec.Location_Custom_2 || "",

      Works: rec.Works || "",
      Works_Custom_1: rec.Works_Custom_1 || "",
      Works_Custom_2: rec.Works_Custom_2 || "",

      Comments: rec.Comments || "",
      Comments_Custom_1: rec.Comments_Custom_1 || "",
      Comments_Custom_2: rec.Comments_Custom_2 || "",

      Units: rec.Units || "",
      Amounts: rec.Amounts?.toString() || "",
      WorkersInvolved: rec.WorkersInvolved?.toString() || "",
      TimeInvolved: rec.TimeInvolved?.toString() || "",

      Photos: rec.Photos ?? [],
      BISId: rec.BISId || null,
      originalUserComment: rec.originalUserComment || "",

      createdBy: createdBy || "N/A",
    };
  });
}

export type BisPerformedWorkMaterialSelection = {
  constructionMaterialId: string;
  quantity: number;
};

export type BisPerformedWorkAttachmentSelection = {
  url: string;
};

export async function getBisCaseAvailableMaterials(siteId: string) {
  const { accessToken, bisCaseId: bisCase } = await requireBisAccessTokenForSite(siteId);

  const baseUrl = getBisBaseUrl();

  // 12I7-092: received construction products list
  const receivedResponse = await fetch(
    `${baseUrl}/bisp/api/portal/bis_cases/${bisCase}/logbook/received_construction_products?page[number]=1&page[size]=200`,
    {
      headers: {
        Accept: "application/vnd.api+json",
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    },
  );

  if (!receivedResponse.ok) {
    const text = await receivedResponse.text();
    throw new Error(text || "Failed to fetch BIS received construction products");
  }

  const receivedJson = await receivedResponse.json();
  const approvedReceivedItems = (Array.isArray(receivedJson?.data) ? receivedJson.data : []).filter(
    (item: any) => item?.attributes?.status === "approved",
  );

  // Build metadata (label/unit) and total delivered quantity by construction_material_id
  // from approved 12I7-092 details.
  const approvedMaterialMeta = new Map<string, { label: string; measurementUnit: string | null }>();
  const deliveredByMaterial = new Map<string, number>();

  const approvedDetails = await Promise.all(
    approvedReceivedItems.map(async (item: any) => {
      const logbookId = String(item?.id ?? "");
      if (!logbookId) return null;

      const detailResponse = await fetch(
        `${baseUrl}/bisp/api/portal/bis_cases/${bisCase}/logbook/received_construction_products/${logbookId}/detail`,
        {
          headers: {
            Accept: "application/vnd.api+json",
            Authorization: `Bearer ${accessToken}`,
          },
          cache: "no-store",
        },
      );

      if (!detailResponse.ok) return null;

      const detailJson = await detailResponse.json();
      const detail = detailJson?.data?.attributes;
      const constructionMaterialId = String(detail?.construction_material_id ?? "");
      if (!constructionMaterialId) return null;

      return {
        constructionMaterialId,
        deliveredQuantity: Number(detail?.quantity ?? 0),
        label:
          item?.attributes?.material_name ||
          detail?.material_kind ||
          `Material #${constructionMaterialId}`,
        measurementUnit: detail?.measurement ? String(detail.measurement) : null,
      };
    }),
  );

  for (const detail of approvedDetails) {
    if (!detail) continue;

    if (!approvedMaterialMeta.has(detail.constructionMaterialId)) {
      approvedMaterialMeta.set(detail.constructionMaterialId, {
        label: detail.label,
        measurementUnit: detail.measurementUnit,
      });
    }

    deliveredByMaterial.set(
      detail.constructionMaterialId,
      (deliveredByMaterial.get(detail.constructionMaterialId) ?? 0) + detail.deliveredQuantity,
    );
  }

  // 12I7-184: used materials list (quantity already used in logbook records)
  const availableResponse = await fetch(
    `${baseUrl}/bisp/api/portal/bis_cases/${bisCase}/logbook/available_used_materials?page[number]=1&page[size]=200`,
    {
      headers: {
        Accept: "application/vnd.api+json",
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    },
  );

  if (!availableResponse.ok) {
    const text = await availableResponse.text();
    throw new Error(text || "Failed to fetch BIS available used materials");
  }

  const availableJson = await availableResponse.json();
  const availableItems = Array.isArray(availableJson?.data) ? availableJson.data : [];

  const usedByMaterial = new Map<string, number>();
  for (const item of availableItems) {
    const materialId = String(item?.attributes?.construction_material_id ?? "");
    if (!materialId) continue;

    usedByMaterial.set(
      materialId,
      (usedByMaterial.get(materialId) ?? 0) + Number(item?.attributes?.quantity ?? 0),
    );
  }

  // Remaining = approved delivered (12I7-092 detail.quantity) - used (12I7-184 quantity)
  return Array.from(deliveredByMaterial.entries())
    .map(([materialId, deliveredQuantity]) => {
      if (!approvedMaterialMeta.has(materialId)) return null;

      const meta = approvedMaterialMeta.get(materialId)!;
      const usedQuantity = usedByMaterial.get(materialId) ?? 0;
      const remaining = Math.max(0, deliveredQuantity - usedQuantity);

      return {
        id: materialId,
        label: meta.label,
        measurementUnit: meta.measurementUnit,
        deliveredQuantity: Number(deliveredQuantity.toFixed(3)),
        usedQuantity: Number(usedQuantity.toFixed(3)),
        availableQuantity: Number(remaining.toFixed(3)),
      };
    })
    .filter((item: any) => item && item.availableQuantity > 0)
    .sort((a: any, b: any) => String(a.label).localeCompare(String(b.label)));
}

export async function getSiteGalleryAttachments(siteId: string) {
  if (!siteId) return [];

  const photos = await prisma.photos.findMany({
    where: {
      siteId,
      OR: [{ fileUrl: { not: null } }, { URL: { not: null } }],
    },
    orderBy: { Date: "desc" },
    take: 200,
    select: {
      id: true,
      fileUrl: true,
      URL: true,
      Date: true,
      Comment: true,
    },
  });

  return photos
    .map((photo) => ({
      id: photo.id,
      url: photo.fileUrl || photo.URL || "",
      date: photo.Date,
      comment: photo.Comment,
    }))
    .filter((photo) => Boolean(photo.url));
}

export async function sendSiteDiaryRecordToBis(
  recordId: string,
  options?: {
    materials?: BisPerformedWorkMaterialSelection[];
    attachments?: BisPerformedWorkAttachmentSelection[];
  },
) {
  if (!recordId) throw new Error("Missing site diary record id");

  const recordSite = await prisma.sitediaryrecords.findUnique({
    where: { id: recordId },
    select: { siteId: true },
  });

  if (!recordSite?.siteId) {
    throw new Error("Site diary record is not assigned to a site");
  }

  const { accessToken, bisCaseId: bisCase } = await requireBisAccessTokenForSite(recordSite.siteId);

  const diaryRecord = await prisma.sitediaryrecords.findUnique({
    where: { id: recordId },
    select: {
      id: true,
      Date: true,
      Works: true,
      Location: true,
      Comments: true,
      WorkersInvolved: true,
      Amounts: true,
    },
  });

  if (!diaryRecord) {
    throw new Error("Site diary record not found");
  }

  const baseUrl = getBisBaseUrl();

  const eventDate = (diaryRecord.Date ?? new Date()).toISOString().slice(0, 10);
  const eventTimeFrom = new Date().toTimeString().slice(0, 5);

  const detailAttributes = {
    employees: Number(diaryRecord.WorkersInvolved ?? 1),
    quantity: Number(diaryRecord.Amounts ?? 1),
    measurement: Number(process.env.BIS_DEFAULT_MEASUREMENT ?? 12),
  };

  const attachments: Array<{ type: "shared_attachments"; uuid: string }> = [];

  for (const selectedAttachment of options?.attachments ?? []) {
    const tempUuid = await uploadLogbookAttachmentToBis({
      photoUrl: selectedAttachment.url,
      accessToken,
      baseUrl,
      bisCase,
      attachmentPath: "performed_work_attachments",
    });

    if (tempUuid) {
      attachments.push({ type: "shared_attachments", uuid: tempUuid });
    }
  }

  const logbookUsedConstructionMaterials = (options?.materials ?? [])
    .filter((item) => item.constructionMaterialId)
    .map((item) => ({
      type: "construction_materials_join",
      attributes: {
        construction_material_id: item.constructionMaterialId,
        quantity: String(Number(item.quantity ?? 0)),
      },
    }));

  const descriptionParts = [
    diaryRecord.Works ? `Works: ${diaryRecord.Works}` : null,
    diaryRecord.Location ? `Location: ${diaryRecord.Location}` : null,
    diaryRecord.Comments ? `Comments: ${diaryRecord.Comments}` : null,
  ].filter(Boolean);

  const payload = {
    data: {
      type: "performed_work",
      attributes: {
        event_date: eventDate,
        event_time_from: eventTimeFrom,
        case_construction_round_id: null,
        responsible_person_id: 2759822,
        responsible_person_type: "construction_member",
        description:
          descriptionParts.join("; ") || "Site diary entry sent from worksRecorded",
      },
      relationships: {
        detail: {
          data: {
            type: "performed_work",
            attributes: detailAttributes,
          },
        },
        attachments: {
          data: attachments,
        },
        logbook_used_construction_materials: {
          data: logbookUsedConstructionMaterials,
        },
      },
    },
  };

  const res = await fetch(
    `${baseUrl}/bisp/api/portal/bis_cases/${bisCase}/logbook/performed_works`,
    {
      method: "POST",
      headers: {
        Accept: "application/vnd.api+json",
        "Content-Type": "application/vnd.api+json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    },
  );

  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  if (!res.ok) {
    throw new Error(
      json?.errors?.[0]?.detail || json?.error || "Failed to send site diary to BIS",
    );
  }

  const bisId = json?.data?.id ? String(json.data.id) : null;

  if (bisId) {
    await prisma.sitediaryrecords.update({
      where: { id: recordId },
      data: { BISId: bisId },
    });
  }

  return {
    success: true,
    bisId,
    response: json,
  };
}

async function uploadLogbookAttachmentToBis({
  photoUrl,
  accessToken,
  baseUrl,
  bisCase,
  attachmentPath,
}: {
  photoUrl: string;
  accessToken: string;
  baseUrl: string;
  bisCase: string;
  attachmentPath: string;
}): Promise<string | null> {
  if (!photoUrl) return null;

  const fileResponse = await fetch(photoUrl, { cache: "no-store" });
  if (!fileResponse.ok) {
    console.warn(`Skipping BIS upload. Unable to download attachment: ${photoUrl}`);
    return null;
  }

  const arrayBuffer = await fileResponse.arrayBuffer();
  const blob = new Blob([arrayBuffer], {
    type: fileResponse.headers.get("content-type") || "image/jpeg",
  });

  const form = new FormData();
  form.append("upload[file]", blob, "attachment.jpg");
  form.append("upload[obj_id]", crypto.randomUUID());

  const uploadResponse = await fetch(
    `${baseUrl}/bisp/api/portal/bis_cases/${bisCase}/logbook/${attachmentPath}`,
    {
      method: "POST",
      headers: {
        Accept: "application/vnd.api+json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: form,
      cache: "no-store",
    },
  );

  if (!uploadResponse.ok) {
    const errText = await uploadResponse.text();
    console.warn(`Skipping BIS attachment. Upload failed: ${errText}`);
    return null;
  }

  const json = await uploadResponse.json();
  return json?.data?.attributes?.temp_uuid ?? null;
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
      OR: [{ URL: { not: null } }, { fileUrl: { not: null } }],
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

export async function saveSettingsToDB(formData: FormData) {
  //Multitenant

  const user = await requireUser();
  const org = await getOrganizationIdByUserId(user.id);

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

export async function getLocationsWorksFromSiteSchema(
  siteId: string,
  type: "Location" | "Work",
) {
  const schema = await getSiteDiarySchema({ siteId });

  function extractLocationNames(schema) {
    return schema.filter((node) => node.type === "Location").map((node) => node.name);
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

  if (type === "Location") {
    return extractLocationNames(schema);
  } else {
    return extractWorkNames(schema);
  }
}

export async function savePhoto({
  userId,
  workerId,
  siteId,
  url,
  fileUrl,
  comment,
  location,
  date,
}: SavePhotoArgs) {
  console.log("=== savePhoto() CALLED ===");

  console.log("Incoming args:", {
    userId,
    workerId,
    siteId,
    url,
    fileUrl,
    comment,
    location,
    date,
  });

  // Determine entity identity & mode
  const entityId = workerId ?? userId;
  const isWorker = !!workerId;

  console.log("Entity identification:", {
    entityId,
    isWorkerMode: isWorker ? "WORKER" : "USER",
  });

  // Fetch organization
  let org = null;
  if (entityId) {
    try {
      org = isWorker
        ? await getOrganizationIdByWorkerId(entityId)
        : await getOrganizationIdByUserId(entityId);

      console.log("Resolved organizationId:", org);
    } catch (err) {
      console.error("Error resolving organization ID:", err);
    }
  } else {
    console.warn("No entityId provided → organizationId will be NULL");
  }

  // Prepare data for Prisma
  const data = {
    Date: date ?? new Date(),
    URL: url ?? null,
    fileUrl: fileUrl ?? url ?? null,
    Comment: comment ?? null,
    Location: location ?? null,
    userId: userId ?? null,
    workerId: workerId ?? null,
    siteId: siteId ?? null,
    organizationId: org,
  };

  console.log("Prisma create payload:", data);

  try {
    const rec = await prisma.photos.create({ data });
    console.log("Photo saved successfully:", rec);
    return rec;
  } catch (err) {
    console.error("❌ Error saving photo:", err);
    throw err;
  }
}

export async function getPhotosByDate({
  siteId,
  startISO,
  endISO,
}: GetPhotosByDateArgs) {
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

const PHOTOS_PER_PAGE = 30;
/**
 * Fetches a paginated list of photos for a given site ID, optionally filtered by date range.
 * @param siteId The ID of the site (project).
 * @param page The current page number (1-based index).
 * @param startDate Optional starting date for the filter (inclusive).
 * @param endDate Optional ending date for the filter (inclusive).
 * @returns A promise that resolves to an object containing photos and the total count.
 */
export async function getAllPhotos(
  siteId: string,
  page: number,
  startDate?: Date,
  endDate?: Date,
) {
  try {
    const skip = (page - 1) * PHOTOS_PER_PAGE;

    // Build the WHERE clause
    let dateFilter = {};
    if (startDate && endDate) {
      // Ensure both ends of the range are used for filtering
      dateFilter = {
        Date: {
          gte: startDate,
          lte: endDate,
        },
      };
    }

    const whereClause = {
      siteId: siteId,
      ...dateFilter,
    };

    // 1. Fetch the photos for the current page
    const photos = await prisma.photos.findMany({
      where: whereClause,
      orderBy: {
        Date: "desc",
      },
      skip: skip,
      take: PHOTOS_PER_PAGE,
      select: {
        id: true,
        fileUrl: true,
        Date: true,
        Comment: true,
        Location: true,
      },
    });

    // 2. Get the total count of all photos for pagination logic
    const totalCount = await prisma.photos.count({
      where: whereClause,
    });

    const filteredPhotos = photos.filter((photo) => photo.fileUrl !== null);

    return {
      photos: filteredPhotos,
      totalCount: totalCount,
    };
  } catch (error) {
    console.error(`Failed to fetch photos for siteId ${siteId}:`, error);
    throw new Error("Could not retrieve paginated project photos.");
  }
}
