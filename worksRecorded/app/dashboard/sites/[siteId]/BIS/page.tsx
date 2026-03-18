import { prisma } from "@/lib/utils/db";
import MaterialsTableClient from "./Components/materials-table-client";
import { bisFetch } from "@/lib/bis/service";
import { readBisSiteSettings } from "@/lib/bis/site-settings";
import { revalidatePath } from "next/cache";

async function getSiteBisCaseId(siteId: string) {
  const site = await prisma.site.findUnique({
    where: { id: siteId },
    select: { siteDiaryRecordsMap: true },
  });

  return readBisSiteSettings(site?.siteDiaryRecordsMap).selectedCaseId;
}

async function uploadPhotoToBis(photoUrl: string) {
  const photoResponse = await fetch(photoUrl, { cache: "no-store" });
  const buffer = await photoResponse.arrayBuffer();
  const blob = new Blob([buffer], { type: photoResponse.headers.get("content-type") || "image/jpeg" });
  const form = new FormData();
  form.append("upload[file]", blob, "photo.jpg");
  form.append("upload[obj_id]", crypto.randomUUID());
  return form;
}

export async function updateMaterialConfiguration(
  recordId: string,
  config: {
    categoryId: string;
    categoryName: string;
    measurementUnitId: string;
    measurementUnit: string;
  }
) {
  "use server";
  await prisma.bISmaterialRecords.update({ where: { id: recordId }, data: config });
  return { success: true as const };
}

export async function updateCostCode(recordId: string, costCode: string | null) {
  "use server";
  await prisma.bISmaterialRecords.update({ where: { id: recordId }, data: { costCode } });
  return { success: true as const };
}

export async function createMaterial(siteId: string, payload: { name: string; quantity: number; cost?: number | null; invoiceNr?: string | null }) {
  "use server";
  await prisma.bISmaterialRecords.create({ data: { siteId, name: payload.name, quantity: payload.quantity, cost: payload.cost ?? null, invoiceNr: payload.invoiceNr ?? null } });
  revalidatePath(`/dashboard/sites/${siteId}/BIS`);
  return { success: true as const };
}

export async function deleteMaterial(siteId: string, recordId: string) {
  "use server";
  const material = await prisma.bISmaterialRecords.findUnique({ where: { id: recordId } });
  if (!material) throw new Error("Material not found.");

  const bisCase = await getSiteBisCaseId(siteId);
  if (material.BISId && bisCase) {
    const response = await bisFetch(`/bisp/api/portal/bis_cases/${bisCase}/logbook/received_construction_products/${material.BISId}`, {
      method: "DELETE",
    });

    if (!response.ok && response.status !== 404) {
      throw new Error("Failed to delete material from BIS.");
    }
  }

  await prisma.bISmaterialRecords.delete({ where: { id: recordId } });
  revalidatePath(`/dashboard/sites/${siteId}/BIS`);
  return { success: true as const };
}

export async function approveMaterial(siteId: string, recordId: string) {
  "use server";
  const material = await prisma.bISmaterialRecords.findUnique({ where: { id: recordId }, select: { BISId: true } });
  const bisCase = await getSiteBisCaseId(siteId);
  if (!material?.BISId || !bisCase) throw new Error("Material is not linked to a BIS record.");

  const response = await bisFetch(`/bisp/api/portal/bis_cases/${bisCase}/logbook/received_construction_products/${material.BISId}/approve`, {
    method: "POST",
    body: JSON.stringify({ data: { action: "approve" } }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Failed to approve material in BIS.");
  }

  return { success: true as const };
}

export async function syncMaterials(siteId: string) {
  "use server";
  const bisCase = await getSiteBisCaseId(siteId);
  if (!bisCase) throw new Error("Select a BIS case first.");

  const response = await bisFetch(`/bisp/api/portal/bis_cases/${bisCase}/logbook/received_construction_products?page[number]=1&page[size]=200`);
  const json = await response.json();
  if (!response.ok) throw new Error(json?.errors?.[0]?.detail || "Failed to sync BIS materials.");

  for (const item of Array.isArray(json?.data) ? json.data : []) {
    const bisId = String(item?.id ?? "");
    if (!bisId) continue;
    await prisma.bISmaterialRecords.upsert({
      where: { id: `${siteId}-${bisId}` },
      update: {
        BISId: bisId,
        name: item?.attributes?.material_name ?? item?.attributes?.doc_number ?? "BIS material",
        quantity: Number(item?.attributes?.quantity ?? 0),
      },
      create: {
        id: `${siteId}-${bisId}`,
        siteId,
        BISId: bisId,
        name: item?.attributes?.material_name ?? item?.attributes?.doc_number ?? "BIS material",
        quantity: Number(item?.attributes?.quantity ?? 0),
      },
    });
  }

  revalidatePath(`/dashboard/sites/${siteId}/BIS`);
  return { success: true as const };
}

export async function sendToBis(recordId: string, quantity: number, construction_material_id: string, sourcePhoto?: string) {
  "use server";
  const material = await prisma.bISmaterialRecords.findUnique({ where: { id: recordId }, select: { siteId: true } });
  if (!material?.siteId) throw new Error("Material is missing site id.");
  const bisCase = await getSiteBisCaseId(material.siteId);
  if (!bisCase) throw new Error("Select a BIS case first.");

  const attachments: Array<{ type: string; uuid: string }> = [];
  if (sourcePhoto) {
    const form = await uploadPhotoToBis(sourcePhoto);
    const uploadResponse = await bisFetch(`/bisp/api/portal/bis_cases/${bisCase}/logbook/received_construction_product_attachments`, { method: "POST", body: form as any, headers: {} });
    const uploadJson = await uploadResponse.json();
    const uuid = uploadJson?.data?.attributes?.temp_uuid;
    if (uuid) attachments.push({ type: "shared_attachments", uuid });
  }

  const response = await bisFetch(`/bisp/api/portal/bis_cases/${bisCase}/logbook/received_construction_products`, {
    method: "POST",
    body: JSON.stringify({
      data: {
        type: "received_construction_product",
        attributes: {
          event_date: new Date().toISOString().slice(0, 10),
          event_time_from: new Date().toISOString().slice(11, 16),
        },
        relationships: {
          detail: { data: { type: "received_construction_product", attributes: { quantity, construction_material_id } } },
          attachments: { data: attachments },
        },
      },
    }),
  });

  const json = await response.json();
  if (!response.ok) throw new Error(json?.errors?.[0]?.detail || "Failed to send material to BIS.");
  const bisId = json?.data?.id ? String(json.data.id) : null;
  if (bisId) await prisma.bISmaterialRecords.update({ where: { id: recordId }, data: { BISId: bisId } });
  return json;
}

export default async function MaterialsPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  const site = await prisma.site.findUnique({ where: { id: siteId }, select: { siteDiaryRecordsMap: true } });
  const bisCaseId = readBisSiteSettings(site?.siteDiaryRecordsMap).selectedCaseId;

  const materials = await prisma.bISmaterialRecords.findMany({
    where: { siteId },
    orderBy: [{ invoiceDate: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      quantity: true,
      categoryId: true,
      categoryName: true,
      measurementUnitId: true,
      measurementUnit: true,
      cost: true,
      invoiceNr: true,
      invoiceDate: true,
      costCode: true,
      sourcePhoto: true,
      BISId: true,
    },
  });

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">BIS Materials</h1>
        <p className="text-sm text-muted-foreground">Review records, sync them with BIS, create local material rows, and send or approve entries in the selected BIS case.</p>
        <p className="mt-2 text-sm text-muted-foreground">Active BIS case: {bisCaseId ?? "Not selected"}</p>
      </div>

      <MaterialsTableClient
        siteId={siteId}
        materials={materials}
        sendToBis={sendToBis}
        updateMaterialConfiguration={updateMaterialConfiguration}
        updateCostCode={updateCostCode}
        createMaterial={createMaterial}
        deleteMaterial={deleteMaterial}
        syncMaterials={syncMaterials}
        approveMaterial={approveMaterial}
      />
    </div>
  );
}
