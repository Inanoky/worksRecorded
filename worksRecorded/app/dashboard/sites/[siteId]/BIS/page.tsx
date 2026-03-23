import { prisma } from "@/lib/utils/db";
import { requireUser } from "@/lib/utils/requireUser";
import { revalidatePath } from "next/cache";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import MaterialsTableClient from "./Components/materials-table-client";
import { getBisBaseUrl, getSiteBisConfig, getUserBisTokenByUserId, requireBisAccessTokenForSite } from "@/server/actions/BIS/service";

type BisApprover = {
  memberId: string;
  memberType: string | null;
  level: number | null;
  name: string | null;
  status: string | null;
};

async function fetchBisJson(path: string, accessToken: string, init?: RequestInit) {
  const response = await fetch(`${getBisBaseUrl()}${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.api+json",
      ...(init?.body ? { "Content-Type": "application/vnd.api+json" } : {}),
      Authorization: `Bearer ${accessToken}`,
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  const text = await response.text();
  const json = text ? JSON.parse(text) : {};

  if (!response.ok) {
    const error = new Error(json?.errors?.[0]?.detail || json?.error || "BIS request failed") as Error & { status?: number };
    error.status = response.status;
    throw error;
  }

  return json;
}

async function fetchReceivedConstructionProductDetails(accessToken: string, bisCaseId: string, bisId: string) {
  const [recordJson, approversJson] = await Promise.all([
    fetchBisJson(`/bisp/api/portal/bis_cases/${bisCaseId}/logbook/received_construction_products/${bisId}`, accessToken),
    fetchBisJson(`/bisp/api/portal/bis_cases/${bisCaseId}/logbook/received_construction_products/${bisId}/approvers`, accessToken),
  ]);

  const approvers = (Array.isArray(approversJson?.data) ? approversJson.data : []).map((item: any) => ({
    memberId: String(item?.attributes?.member_id ?? item?.id ?? ""),
    memberType: item?.attributes?.member_type ?? null,
    level: item?.attributes?.level == null ? null : Number(item.attributes.level),
    name:
      item?.attributes?.member_name ??
      item?.attributes?.name ??
      item?.attributes?.full_name ??
      item?.attributes?.approver_name ??
      null,
    status: item?.attributes?.status ?? null,
  }));

  return {
    status: recordJson?.data?.attributes?.status ? String(recordJson.data.attributes.status) : null,
    approvers,
  };
}

type WarehouseMaterialRecord = {
  id: string;
  name: string | null;
  quantity: number | null;
  categoryId: string | null;
  categoryName: string | null;
  measurementUnitId: string | null;
  measurementUnit: string | null;
  cost: number | null;
  invoiceNr: string | null;
  invoiceDate: Date | null;
  costCode: string | null;
  sourcePhoto: string | null;
  BISId: string | null;
};

async function resolveWarehouseBisState(
  material: WarehouseMaterialRecord,
  accessToken: string,
  bisCaseId: string,
) {
  if (!material.BISId) {
    console.log("[Warehouse BIS] Skipping BIS refresh for local-only record", {
      recordId: material.id,
    });
    return {
      ...material,
      bisStatus: null,
      bisApprovers: [],
    };
  }

  console.log("[Warehouse BIS] Refreshing BIS record", {
    recordId: material.id,
    bisId: material.BISId,
    bisCaseId,
  });

  try {
    const details = await fetchReceivedConstructionProductDetails(accessToken, bisCaseId, material.BISId);

    console.log("[Warehouse BIS] BIS record refresh succeeded", {
      recordId: material.id,
      bisId: material.BISId,
      bisStatus: details.status,
      approverCount: details.approvers.length,
    });

    return {
      ...material,
      bisStatus: details.status,
      bisApprovers: details.approvers,
    };
  } catch (error) {
    const status = typeof error === "object" && error && "status" in error
      ? Number((error as { status?: number }).status)
      : null;

    console.error("[Warehouse BIS] BIS record refresh failed", {
      recordId: material.id,
      bisId: material.BISId,
      bisCaseId,
      status,
      error,
    });

    if (status === 404) {
      await prisma.bISmaterialRecords.update({
        where: { id: material.id },
        data: { BISId: null },
      });

      console.log("[Warehouse BIS] Cleared stale BISId after 404", {
        recordId: material.id,
        previousBisId: material.BISId,
      });

      return {
        ...material,
        BISId: null,
        bisStatus: null,
        bisApprovers: [],
      };
    }

    throw error;
  }
}

function withoutWarehouseBisState(material: WarehouseMaterialRecord) {
  return {
    ...material,
    bisStatus: null,
    bisApprovers: [],
  };
}

async function loadWarehouseBisState(
  materials: WarehouseMaterialRecord[],
  accessToken: string,
  bisCaseId: string,
) {
  try {
    return await Promise.all(
      materials.map((material) => resolveWarehouseBisState(material, accessToken, bisCaseId)),
    );
  } catch (error) {
    const status = typeof error === "object" && error && "status" in error
      ? Number((error as { status?: number }).status)
      : null;

    if (status === 403) {
      return materials.map(withoutWarehouseBisState);
    }

    throw error;
  }
}

async function uploadPhotoToBis(photoUrl: string, accessToken: string, bisCaseId: string) {
  const baseUrl = getBisBaseUrl();

  const imgResp = await fetch(photoUrl, { cache: "no-store" });
  const buffer = await imgResp.arrayBuffer();

  const blob = new Blob([buffer], {
    type: imgResp.headers.get("content-type") || "image/jpeg",
  });

  const form = new FormData();
  form.append("upload[file]", blob, "photo.jpg");
  form.append("upload[obj_id]", crypto.randomUUID());

  const res = await fetch(
    `${baseUrl}/bisp/api/portal/bis_cases/${bisCaseId}/logbook/received_construction_product_attachments`,
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

  if (!res.ok) {
    throw new Error("Failed to upload photo to BIS");
  }

  const json = await res.json();
  return json?.data?.attributes?.temp_uuid as string | undefined;
}

export async function updateMaterialConfiguration(
  recordId: string,
  config: {
    categoryId: string;
    categoryName: string;
    measurementUnitId: string;
    measurementUnit: string;
  },
) {
  "use server";

  await prisma.bISmaterialRecords.update({
    where: { id: recordId },
    data: {
      categoryId: config.categoryId,
      categoryName: config.categoryName,
      measurementUnitId: config.measurementUnitId,
      measurementUnit: config.measurementUnit,
    },
  });

  return { success: true };
}

export async function updateCostCode(recordId: string, costCode: string | null) {
  "use server";

  await prisma.bISmaterialRecords.update({
    where: { id: recordId },
    data: {
      costCode,
    },
  });

  return { success: true };
}

export async function getPossibleWarehouseBisApprovers(siteId: string, bisId: string) {
  "use server";

  const { accessToken, bisCaseId } = await requireBisAccessTokenForSite(siteId);

  const json = await fetchBisJson(
    `/bisp/api/portal/bis_cases/${bisCaseId}/logbook/received_construction_products/${bisId}/possible_approvers`,
    accessToken,
  );

  return (Array.isArray(json?.data) ? json.data : []).map((item: any) => ({
    memberId: String(item?.attributes?.member_id ?? item?.id ?? ""),
    memberType: item?.attributes?.member_type ?? null,
    level: item?.attributes?.level == null ? null : Number(item.attributes.level),
    name:
      item?.attributes?.member_name ??
      item?.attributes?.name ??
      item?.attributes?.full_name ??
      item?.attributes?.approver_name ??
      null,
    status: item?.attributes?.status ?? null,
  }));
}

export async function syncWarehouseBisRecords(siteId: string) {
  "use server";

  console.log("[Warehouse BIS] syncWarehouseBisRecords started", { siteId });
  const { accessToken, bisCaseId } = await requireBisAccessTokenForSite(siteId);

  const materials = await prisma.bISmaterialRecords.findMany({
    where: {
      siteId,
      BISId: { not: null },
    },
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

  console.log("[Warehouse BIS] syncWarehouseBisRecords fetched candidate rows", {
    siteId,
    bisCaseId,
    materialCount: materials.length,
    materials: materials.map((material) => ({
      id: material.id,
      BISId: material.BISId,
    })),
  });

  const syncedMaterials = await Promise.all(
    materials.map((material) => resolveWarehouseBisState(material, accessToken, bisCaseId)),
  );

  console.log("[Warehouse BIS] syncWarehouseBisRecords completed", {
    siteId,
    syncedMaterialCount: syncedMaterials.length,
    syncedMaterials: syncedMaterials.map((material) => ({
      id: material.id,
      BISId: material.BISId,
      bisStatus: material.bisStatus,
    })),
  });

  revalidatePath(`/dashboard/sites/${siteId}/BIS`);
  return syncedMaterials;
}

export async function submitWarehouseRecordToBisApproval(
  siteId: string,
  bisId: string,
  approvers: Array<{ memberId: string; memberType: string | null; level: number | null }>,
) {
  "use server";

  const { accessToken, bisCaseId } = await requireBisAccessTokenForSite(siteId);

  if (!approvers.length) {
    throw new Error("Select at least one approver");
  }

  const json = await fetchBisJson(
    `/bisp/api/portal/bis_cases/${bisCaseId}/logbook/received_construction_products/${bisId}/submit_to_approve`,
    accessToken,
    {
      method: "PATCH",
      body: JSON.stringify({
        data: {
          type: "received_construction_product",
          relationships: {
            approvers: {
              data: approvers.map((approver) => ({
                type: "approver",
                attributes: {
                  member_id: Number(approver.memberId),
                  member_type: approver.memberType,
                  level: approver.level,
                },
              })),
            },
          },
        },
      }),
    },
  );

  return {
    status: json?.data?.attributes?.status ? String(json.data.attributes.status) : "submitted_to_approve",
  };
}

export async function sendToBis(
  siteId: string,
  recordId: string,
  quantity: number,
  construction_material_id: string,
  sourcePhoto?: string,
) {
  "use server";

  const { accessToken, bisCaseId } = await requireBisAccessTokenForSite(siteId);
  const baseUrl = getBisBaseUrl();
  const attachments: Array<{ type: string; uuid: string }> = [];

  if (sourcePhoto) {
    const temp_uuid = await uploadPhotoToBis(sourcePhoto, accessToken, bisCaseId);

    if (temp_uuid) {
      await new Promise((r) => setTimeout(r, 1000));
      attachments.push({
        type: "shared_attachments",
        uuid: temp_uuid,
      });
    }
  }

  const body = {
    data: {
      type: "received_construction_product",
      attributes: {
        event_date: new Date().toISOString().slice(0, 10),
        event_time_from: new Date().toTimeString().slice(0, 5),
      },
      relationships: {
        detail: {
          data: {
            type: "received_construction_product",
            attributes: {
              quantity,
              construction_material_id,
            },
          },
        },
        attachments: {
          data: attachments,
        },
      },
    },
  };

  const res = await fetch(
    `${baseUrl}/bisp/api/portal/bis_cases/${bisCaseId}/logbook/received_construction_products`,
    {
      method: "POST",
      headers: {
        Accept: "application/vnd.api+json",
        "Content-Type": "application/vnd.api+json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
      cache: "no-store",
    },
  );

  const json = await res.json();
  const bisId = json?.data?.id;

  if (bisId) {
    await prisma.bISmaterialRecords.update({
      where: { id: recordId },
      data: { BISId: bisId },
    });
  }

  return json;
}

export default async function MaterialsPage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;
  const user = await requireUser();

  const [site, userBisToken] = await Promise.all([
    getSiteBisConfig(siteId),
    getUserBisTokenByUserId(user.id),
  ]);

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

  const bisEnabled = Boolean(site?.bisCaseId && userBisToken?.accessToken);
  const materialsWithBisState = bisEnabled
    ? await loadWarehouseBisState(
        materials,
        userBisToken!.accessToken,
        site!.bisCaseId!,
      ).catch((error) => {
        console.error("Failed to load BIS warehouse record state", error);
        return materials.map(withoutWarehouseBisState);
      })
    : materials.map(withoutWarehouseBisState);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Warehouse</h1>
        <p className="text-sm text-muted-foreground">
          Review all warehouse material records here. BIS sending, approval, and sync actions appear when BIS is connected and this site is linked to a BIS case.
        </p>
      </div>

      {!bisEnabled ? (
        <Card>
          <CardHeader>
            <CardTitle>Warehouse is available without BIS</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            You can review warehouse records even when BIS is disconnected. Connect BIS and select a site case in Settings to enable BIS material mapping, send-to-BIS, and approval actions.
          </CardContent>
        </Card>
      ) : null}

      <MaterialsTableClient
        siteId={siteId}
        bisEnabled={bisEnabled}
        materials={materialsWithBisState}
        sendToBis={sendToBis}
        getPossibleApprovers={getPossibleWarehouseBisApprovers}
        submitToApproval={submitWarehouseRecordToBisApproval}
        syncBisRecords={syncWarehouseBisRecords}
        updateMaterialConfiguration={updateMaterialConfiguration}
        updateCostCode={updateCostCode}
      />
    </div>
  );
}
