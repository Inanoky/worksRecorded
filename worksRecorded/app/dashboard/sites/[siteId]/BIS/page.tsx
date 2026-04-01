import { prisma } from "@/lib/utils/db";
import { requireUser } from "@/lib/utils/requireUser";
import { revalidatePath } from "next/cache";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import MaterialsTableClient from "./Components/materials-table-client";
import { ensureUserBisAccessToken, getBisBaseUrl, getSiteBisConfig, getUserBisTokenByUserId, refreshBisAccessToken, requireBisAccessTokenForSite } from "@/server/actions/BIS/service";
import { bisFetch } from "@/server/actions/BIS/TestBisEnv/relay";

type BisApprover = {
  memberId: string;
  memberType: string | null;
  level: number | null;
  name: string | null;
  status: string | null;
};

const BIS_RECEIVED_MATERIAL_DELETE_JUSTIFICATION = "Deleted from WorksRecorded warehouse bulk deletion.";

async function fetchBisJson(path: string, accessToken: string, init?: RequestInit, allowRefresh = true) {
  let tokenToUse = accessToken;

  try {
    const user = await requireUser();
    const ensuredToken = await ensureUserBisAccessToken(user.id);
    if (ensuredToken?.accessToken) {
      tokenToUse = ensuredToken.accessToken;
    }
  } catch {
    // Fallback to provided accessToken for contexts where user isn't available.
  }

  const response = await bisFetch(getBisBaseUrl(), `${getBisBaseUrl()}${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.api+json",
      ...(init?.body ? { "Content-Type": "application/vnd.api+json" } : {}),
      Authorization: `Bearer ${tokenToUse}`,
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  const text = await response.text();
  let json: any = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = {};
  }

  if (response.status === 401 && allowRefresh) {
    try {
      const user = await requireUser();
      const latestToken = await getUserBisTokenByUserId(user.id);

      if (latestToken?.refreshToken) {
        const refreshed = await refreshBisAccessToken(user.id, latestToken.refreshToken);
        return fetchBisJson(path, refreshed.accessToken, init, false);
      }
    } catch (refreshError) {
      console.error("BIS access token refresh on 401 failed", refreshError);
    }
  }

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

type MaterialCategory = {
  id: string;
  material_kind: string;
  measurement: string | null;
  measurement_unit: string | null;
};

type MaterialMeasure = {
  id: string;
  name: string;
};

type MaterialType = {
  id: string;
  name: string;
  categoryName?: string | null;
  isHeader?: boolean;
};

type WarehouseBisSyncResult = {
  rows: Array<WarehouseMaterialRecord & { bisStatus: string | null; bisApprovers: BisApprover[] }>;
  materialConfigurations: MaterialCategory[];
  materialMeasures: MaterialMeasure[];
  materialTypes: MaterialType[];
};

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
  materialDate: Date | null;
  costCode: string | null;
  sourcePhoto: string | null;
  BISId: string | null;
  bisStatus: string | null;
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
    const normalizedStatus = details.status?.toLowerCase() ?? null;

    console.log("[Warehouse BIS] BIS record refresh succeeded", {
      recordId: material.id,
      bisId: material.BISId,
      bisStatus: details.status,
      approverCount: details.approvers.length,
    });

    if (normalizedStatus === "deleted") {
      await prisma.bISmaterialRecords.update({
        where: { id: material.id },
        data: { BISId: null, bisStatus: null },
      });

      console.log("[Warehouse BIS] Cleared stale BISId after deleted status", {
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

    await prisma.bISmaterialRecords.update({
      where: { id: material.id },
      data: { bisStatus: details.status },
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
        data: { BISId: null, bisStatus: null },
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
    bisStatus: material.bisStatus,
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

async function fetchBisPagedData(pathname: string, accessToken: string) {
  const results: any[] = [];
  let page = 1;
  const pageSize = 100;

  while (true) {
    const separator = pathname.includes("?") ? "&" : "?";
    const json = await fetchBisJson(
      `${pathname}${separator}page[number]=${page}&page[size]=${pageSize}`,
      accessToken,
    );
    const rows = Array.isArray(json?.data) ? json.data : [];

    if (!rows.length) {
      break;
    }

    results.push(...rows);

    const hasNextPage = Boolean(json?.links?.next);
    if (!hasNextPage && rows.length < pageSize) {
      break;
    }

    page += 1;
  }

  return results;
}

async function fetchWarehouseMaterialConfigurationData(siteId: string): Promise<{
  materialConfigurations: MaterialCategory[];
  materialMeasures: MaterialMeasure[];
  materialTypes: MaterialType[];
}> {
  const { accessToken, bisCaseId } = await requireBisAccessTokenForSite(siteId);

  const [materialsData, measuresData, materialTypesData] = await Promise.all([
    fetchBisPagedData(
      `/bisp/api/portal/bis_cases/${bisCaseId}/logbook/construction_materials`,
      accessToken,
    ),
    fetchBisPagedData(
      `/bisp/api/portal/classifiers?filter[typ_eq]=character_measures`,
      accessToken,
    ),
    fetchBisPagedData(
      `/bisp/api/portal/classifiers?filter[typ_eq]=logbook_construction_material`,
      accessToken,
    ),
  ]);

  const measurementMap = new Map<string, string>();
  for (const item of measuresData) {
    const code = item?.attributes?.code == null ? null : String(item.attributes.code);
    const name = item?.attributes?.name == null ? null : String(item.attributes.name);
    if (code && name) {
      measurementMap.set(code, name);
    }
  }

  const materialConfigurations = materialsData
    .map((item: any) => ({
      id: String(item?.id ?? ""),
      material_kind: String(item?.attributes?.material_kind ?? item?.attributes?.name ?? ""),
      measurement: item?.attributes?.measurement == null ? null : String(item.attributes.measurement),
      measurement_unit:
        item?.attributes?.measurement_unit == null
          ? measurementMap.get(String(item?.attributes?.measurement ?? "")) ?? null
          : String(item.attributes.measurement_unit),
    }))
    .filter((item: MaterialCategory) => item.id && item.material_kind)
    .sort((a, b) => a.material_kind.localeCompare(b.material_kind));

  const allowedMeasurementNames = new Set([
    "cm",
    "dienas",
    "gab",
    "ha",
    "kg",
    "km",
    "komplekts",
    "kv",
    "kva",
    "kw",
    "l",
    "m",
    "m2",
    "m3",
    "mēneši",
    "mm",
    "mm2",
    "stundas",
    "t",
  ]);

  const materialMeasures = Array.from(measurementMap.entries())
    .map(([id, name]) => ({ id, name }))
    .filter((item) => {
      const normalizedName = item.name.trim().replace(/\./g, "").toLowerCase();
      return allowedMeasurementNames.has(normalizedName);
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const materialTypes = materialTypesData
    .map((item: any) => ({
      id: item?.attributes?.code == null ? "" : String(item.attributes.code),
      name: item?.attributes?.name == null ? "" : String(item.attributes.name),
      categoryName:
        item?.attributes?.category_name == null
          ? null
          : String(item.attributes.category_name),
      isHeader: /^\d{2}$/.test(String(item?.attributes?.code ?? "")),
    }))
    .filter((item: MaterialType) => item.id && item.name)
    .sort((a, b) => a.id.localeCompare(b.id));

  return { materialConfigurations, materialMeasures, materialTypes };
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

  const res = await bisFetch(
    getBisBaseUrl(),
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

export async function createMaterialConfiguration(
  siteId: string,
  payload: {
    materialKind: string;
    materialType: string;
    manufacturer: string;
    measurement: string;
    attachments: Array<{
      name: string;
      mimeType: string;
      base64Data: string;
    }>;
  },
) {
  "use server";

  const materialKind = payload.materialKind.trim();
  const materialType = payload.materialType.trim();
  const manufacturer = payload.manufacturer.trim();
  const measurement = payload.measurement.trim();

  if (!materialKind) {
    throw new Error("Material kind is required");
  }

  if (!measurement) {
    throw new Error("Measurement is required");
  }
  if (!materialType) {
    throw new Error("Material type is required");
  }
  if (!manufacturer) {
    throw new Error("Manufacturer is required");
  }

  const { accessToken, bisCaseId } = await requireBisAccessTokenForSite(siteId);
  console.log("[Warehouse BIS] createMaterialConfiguration: start", {
    siteId,
    bisCaseId,
    materialKind,
    materialType,
    manufacturer,
    measurement,
    attachmentCount: payload.attachments.length,
  });

  const measureData = await fetchBisJson(
    `/bisp/api/portal/classifiers?filter[typ_eq]=character_measures`,
    accessToken,
  );
  const availableMeasurementCodes = new Set<string>();
  const measurementByCode = new Map<string, string>();
  const measurementById = new Map<string, string>();
  for (const item of Array.isArray(measureData?.data) ? measureData.data : []) {
    const id = item?.id == null ? null : String(item.id);
    const code = item?.attributes?.code == null ? null : String(item.attributes.code);
    if (code) availableMeasurementCodes.add(code);
    if (code && id) {
      measurementByCode.set(code, id);
      measurementById.set(id, code);
    }
  }

  const measurementCandidates = Array.from(
    new Set([
      measurement,
      measurementByCode.get(measurement),
      measurementById.get(measurement),
      process.env.BIS_DEFAULT_MEASUREMENT,
      "12",
    ].filter(Boolean) as string[]),
  );

  if (measurementCandidates.length === 0) {
    console.error("[Warehouse BIS] Measurement validation failed", {
      siteId,
      bisCaseId,
      measurement,
      allowedMeasurementsSample: Array.from(availableMeasurementCodes).slice(0, 30),
      allowedMeasurementsCount: availableMeasurementCodes.size,
    });
    throw new Error("Selected measurement is not available in BIS measurement list");
  }

  const attachedDocuments: Array<{ attributes: { uuid: string; code: string } }> = [];

  let caseConstructionRoundId: number | null = null;
  try {
    const caseJson = await fetchBisJson(
      `/bisp/api/portal/bis_cases/${bisCaseId}`,
      accessToken,
    );
    const rawRoundId =
      caseJson?.data?.attributes?.case_construction_round_id ??
      caseJson?.data?.attributes?.current_case_construction_round_id ??
      null;
    caseConstructionRoundId = rawRoundId == null ? null : Number(rawRoundId);
  } catch (error) {
    console.warn("[Warehouse BIS] Failed to fetch case construction round id", {
      siteId,
      bisCaseId,
      error: error instanceof Error ? error.message : error,
    });
  }

  for (const file of payload.attachments) {
    const bytes = Buffer.from(file.base64Data, "base64");
    const blob = new Blob([bytes], {
      type: file.mimeType || "application/octet-stream",
    });
    const form = new FormData();
    form.append("upload[file]", blob, file.name || "attachment");
    form.append("upload[obj_id]", crypto.randomUUID());

    const uploadResponse = await bisFetch(
      getBisBaseUrl(),
      `${getBisBaseUrl()}/bisp/api/portal/bis_cases/${bisCaseId}/logbook/shared_attached_document_attachments`,
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
      const text = await uploadResponse.text();
      throw new Error(`Failed to upload attachment to BIS: ${text || uploadResponse.status}`);
    }

    const uploaded = await uploadResponse.json();
    const tempUuid = uploaded?.data?.attributes?.temp_uuid
      ? String(uploaded.data.attributes.temp_uuid)
      : null;

    if (tempUuid) {
      attachedDocuments.push({
        attributes: {
          uuid: tempUuid,
          code: "compliance",
        },
      });
    }
  }

  let created: any;
  let lastError: unknown = null;
  for (const measurementCandidate of measurementCandidates) {
    const createPayload = {
      data: {
        type: "construction_material",
        attributes: {
          type: "construction_material",
          case_construction_round_id: caseConstructionRoundId,
          material_type: materialType,
          manufacturer,
          material_kind: materialKind,
          measurement: measurementCandidate,
          reusable: false,
          testing_obligatory: false,
        },
        relationships: attachedDocuments.length
          ? {
              attached_documents: {
                data: attachedDocuments,
              },
            }
          : undefined,
      },
    };

    console.log("[Warehouse BIS] createMaterialConfiguration payload preview", {
      siteId,
      bisCaseId,
      materialType,
      materialKind,
      measurementCandidate,
      attachedDocuments: attachedDocuments.length,
      caseConstructionRoundId,
    });

    try {
      created = await fetchBisJson(
        `/bisp/api/portal/bis_cases/${bisCaseId}/logbook/construction_materials`,
        accessToken,
        {
          method: "POST",
          body: JSON.stringify(createPayload),
        },
      );
      break;
    } catch (error) {
      lastError = error;
      console.error("[Warehouse BIS] createMaterialConfiguration failed", {
        siteId,
        bisCaseId,
        materialType,
        materialKind,
        measurementCandidate,
        attachmentCount: attachedDocuments.length,
        caseConstructionRoundId,
        error: error instanceof Error ? error.message : error,
      });
    }
  }

  if (!created) {
    throw (lastError instanceof Error ? lastError : new Error("Failed to create BIS material configuration"));
  }

  const material = created?.data;
  if (!material?.id) {
    throw new Error("BIS did not return a created material configuration");
  }

  const measurementMap = new Map<string, string>();
  for (const item of Array.isArray(measureData?.data) ? measureData.data : []) {
    const code = item?.attributes?.code == null ? null : String(item.attributes.code);
    const name = item?.attributes?.name == null ? null : String(item.attributes.name);
    if (code && name) {
      measurementMap.set(code, name);
    }
  }

  const category = {
    id: String(material.id),
    material_kind: String(material?.attributes?.material_kind ?? materialKind),
    measurement: material?.attributes?.measurement == null
      ? measurement
      : String(material.attributes.measurement),
    measurement_unit:
      material?.attributes?.measurement_unit == null
        ? measurementMap.get(
            material?.attributes?.measurement == null
              ? measurement
              : String(material.attributes.measurement),
          ) ?? measurementMap.get(measurement) ?? null
        : String(material.attributes.measurement_unit),
  };

  revalidatePath(`/dashboard/sites/${siteId}/BIS`);
  return { success: true as const, category };
}

export async function deleteWarehouseRecords(siteId: string, recordIds: string[]) {
  "use server";

  const ids = Array.from(new Set(recordIds.filter(Boolean)));
  if (!ids.length) {
    return { deletedIds: [] as string[] };
  }

  const materials = await prisma.bISmaterialRecords.findMany({
    where: {
      siteId,
      id: { in: ids },
    },
    select: {
      id: true,
      BISId: true,
      bisStatus: true,
    },
  });

  const rowsById = new Map(materials.map((material) => [material.id, material]));
  const bisBackedRows = materials.filter((material) => !!material.BISId);

  const user = await requireUser();
  const [site, userBisToken] = await Promise.all([
    getSiteBisConfig(siteId),
    ensureUserBisAccessToken(user.id),
  ]);
  const bisEnabled = Boolean(site?.bisCaseId && userBisToken?.accessToken);

  if (bisEnabled && bisBackedRows.length) {
    const { accessToken, bisCaseId } = await requireBisAccessTokenForSite(siteId);

    await Promise.all(
      bisBackedRows.map(async (material) => {
        if (!material.BISId) return;

        try {
          console.log("[Warehouse BIS] Deleting BIS-backed warehouse record", {
            siteId,
            recordId: material.id,
            bisId: material.BISId,
          });

          await fetchBisJson(
            `/bisp/api/portal/bis_cases/${bisCaseId}/logbook/received_construction_products/${material.BISId}`,
            accessToken,
            {
              method: "DELETE",
              body: JSON.stringify({
                data: {
                  type: "received_construction_product",
                  attributes: {
                    justification: BIS_RECEIVED_MATERIAL_DELETE_JUSTIFICATION,
                  },
                },
              }),
            },
          );
        } catch (error) {
          const status = typeof error === "object" && error && "status" in error
            ? Number((error as { status?: number }).status)
            : null;

          if (status === 404 || status === 403 || status === 422) {
            console.warn("[Warehouse BIS] Skipping BIS delete and continuing with local delete", {
              siteId,
              recordId: material.id,
              bisId: material.BISId,
              status,
              error,
            });
            return;
          }

          throw error;
        }
      }),
    );
  }

  await prisma.bISmaterialRecords.deleteMany({
    where: {
      siteId,
      id: { in: Array.from(rowsById.keys()) },
    },
  });

  revalidatePath(`/dashboard/sites/${siteId}/BIS`);
  return { deletedIds: Array.from(rowsById.keys()) };
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

export async function updateMaterialDate(recordId: string, materialDate: Date | null) {
  "use server";

  await prisma.bISmaterialRecords.update({
    where: { id: recordId },
    data: { materialDate },
  });

  return { success: true };
}

export async function updateQuantity(recordId: string, quantity: number | null) {
  "use server";

  await prisma.bISmaterialRecords.update({
    where: { id: recordId },
    data: { quantity },
  });

  return { success: true };
}

export async function updateMaterialDetails(
  recordId: string,
  payload: {
    name?: string | null;
    cost?: number | null;
    materialDate?: Date | null;
  },
) {
  "use server";

  const data: { name?: string | null; cost?: number | null; materialDate?: Date | null } = {};

  if ("name" in payload) data.name = payload.name ?? null;
  if ("cost" in payload) data.cost = payload.cost ?? null;
  if ("materialDate" in payload) data.materialDate = payload.materialDate ?? null;

  await prisma.bISmaterialRecords.update({
    where: { id: recordId },
    data,
  });

  return { success: true };
}

export async function attachCertificateToMaterialConfiguration(
  siteId: string,
  materialConfigurationId: string,
  payload: {
    name: string;
    mimeType: string;
    base64Data: string;
    code?: "compliance" | "agreement";
  },
) {
  "use server";

  const { accessToken, bisCaseId } = await requireBisAccessTokenForSite(siteId);
  const bytes = Buffer.from(payload.base64Data, "base64");
  const blob = new Blob([bytes], {
    type: payload.mimeType || "application/octet-stream",
  });
  const form = new FormData();
  form.append("upload[file]", blob, payload.name || "certificate");
  form.append("upload[obj_id]", crypto.randomUUID());

  const uploadResponse = await bisFetch(
    getBisBaseUrl(),
    `${getBisBaseUrl()}/bisp/api/portal/bis_cases/${bisCaseId}/logbook/shared_attached_document_attachments`,
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
    const text = await uploadResponse.text();
    throw new Error(`Failed to upload certificate to BIS: ${text || uploadResponse.status}`);
  }

  const uploadJson = await uploadResponse.json();
  const tempUuid = uploadJson?.data?.attributes?.temp_uuid
    ? String(uploadJson.data.attributes.temp_uuid)
    : null;

  if (!tempUuid) {
    throw new Error("BIS did not return certificate upload uuid");
  }

  const currentMaterial = await fetchBisJson(
    `/bisp/api/portal/bis_cases/${bisCaseId}/logbook/construction_materials/${materialConfigurationId}`,
    accessToken,
  );

  const existingDocuments = Array.isArray(currentMaterial?.data?.relationships?.attached_documents?.data)
    ? currentMaterial.data.relationships.attached_documents.data
    : [];

  const nextDocuments = [
    ...existingDocuments,
    {
      attributes: {
        uuid: tempUuid,
        code: payload.code || "compliance",
      },
    },
  ];

  await fetchBisJson(
    `/bisp/api/portal/bis_cases/${bisCaseId}/logbook/construction_materials/${materialConfigurationId}`,
    accessToken,
    {
      method: "PATCH",
      body: JSON.stringify({
        data: {
          id: materialConfigurationId,
          type: "construction_material",
          relationships: {
            attached_documents: {
              data: nextDocuments,
            },
          },
        },
      }),
    },
  );

  revalidatePath(`/dashboard/sites/${siteId}/BIS`);
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

export async function syncWarehouseBisRecords(siteId: string): Promise<WarehouseBisSyncResult> {
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
      materialDate: true,
      costCode: true,
      sourcePhoto: true,
      BISId: true,
      bisStatus: true,
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

  const [syncedMaterials, materialConfigurationData] = await Promise.all([
    Promise.all(materials.map((material) => resolveWarehouseBisState(material, accessToken, bisCaseId))),
    fetchWarehouseMaterialConfigurationData(siteId).catch((error) => {
      console.error("Failed to refresh BIS material configurations", error);
      return {
        materialConfigurations: [] as MaterialCategory[],
        materialMeasures: [] as MaterialMeasure[],
        materialTypes: [] as MaterialType[],
      };
    }),
  ]);

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
  return {
    rows: syncedMaterials,
    materialConfigurations: materialConfigurationData.materialConfigurations,
    materialMeasures: materialConfigurationData.materialMeasures,
    materialTypes: materialConfigurationData.materialTypes,
  };
}

async function ensureWarehouseBisIdentificationNumber(
  siteId: string,
  bisId: string,
  accessToken: string,
  bisCaseId: string,
) {
  const material = await prisma.bISmaterialRecords.findFirst({
    where: {
      siteId,
      BISId: bisId,
    },
    select: {
      id: true,
      name: true,
      quantity: true,
      categoryId: true,
    },
  });

  if (!material) {
    console.warn("[Warehouse BIS] No local material found for BIS approval sync", { siteId, bisId });
    return;
  }

  console.log("[Warehouse BIS] Ensuring BIS identification number before approval", {
    siteId,
    bisId,
    recordId: material.id,
    materialName: material.name,
    quantity: material.quantity,
    categoryId: material.categoryId,
  });

  const identificationNumber = material.name?.trim() ?? "";
  if (!identificationNumber || !material.categoryId || material.categoryId === "no_match") {
    console.warn("[Warehouse BIS] Skipping identification number sync due to missing local data", {
      siteId,
      bisId,
      recordId: material.id,
      identificationNumber,
      categoryId: material.categoryId,
    });
    return;
  }

  const payload = {
    data: {
      id: bisId,
      type: "received_construction_product",
      relationships: {
        detail: {
          data: {
            type: "received_construction_product",
            attributes: {
              construction_material_id: material.categoryId,
              quantity: material.quantity ?? 0,
              identification_number: identificationNumber,
              unknown_identification_number: false,
            },
          },
        },
      },
    },
  };

  console.log("[Warehouse BIS] Patching BIS record before approval", {
    siteId,
    bisId,
    payload,
  });

  await fetchBisJson(
    `/bisp/api/portal/bis_cases/${bisCaseId}/logbook/received_construction_products/${bisId}`,
    accessToken,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
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

  await ensureWarehouseBisIdentificationNumber(siteId, bisId, accessToken, bisCaseId);

  console.log("[Warehouse BIS] Submitting BIS record for approval", {
    siteId,
    bisId,
    approvers,
  });

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

  const nextStatus = json?.data?.attributes?.status ? String(json.data.attributes.status) : "submitted_to_approve";

  const materialRecord = await prisma.bISmaterialRecords.findFirst({
    where: {
      siteId,
      BISId: bisId,
    },
    select: { id: true },
  });

  if (materialRecord) {
    await prisma.bISmaterialRecords.update({
      where: { id: materialRecord.id },
      data: { bisStatus: nextStatus },
    });
  }

  return {
    status: nextStatus,
  };
}

export async function sendToBis(
  siteId: string,
  recordId: string,
  quantity: number,
  construction_material_id: string,
  sourcePhoto?: string,
  materialName?: string,
  materialDate?: Date | null,
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

  const eventDate = materialDate
    ? new Date(materialDate).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);

  const body = {
    data: {
      type: "received_construction_product",
      attributes: {
        event_date: eventDate,
        event_time_from: new Date().toTimeString().slice(0, 5),
      },
      relationships: {
        detail: {
          data: {
            type: "received_construction_product",
            attributes: {
              quantity,
              construction_material_id,
              identification_number: materialName?.trim() || null,
              unknown_identification_number: false,
            },
          },
        },
        attachments: {
          data: attachments,
        },
      },
    },
  };

  console.log("[Warehouse BIS] Sending material to BIS", {
    siteId,
    recordId,
    materialName,
    construction_material_id,
    quantity,
    body,
  });

  const res = await bisFetch(
    getBisBaseUrl(),
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
      data: {
        BISId: bisId,
        bisStatus: json?.data?.attributes?.status
          ? String(json.data.attributes.status)
          : "draft",
      },
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
    ensureUserBisAccessToken(user.id),
  ]);

  const bisEnabled = Boolean(site?.bisCaseId && userBisToken?.accessToken);

  const [materials, materialConfigurationData] = await Promise.all([
    prisma.bISmaterialRecords.findMany({
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
        materialDate: true,
        costCode: true,
        sourcePhoto: true,
        BISId: true,
        bisStatus: true,
      },
    }),
    bisEnabled ? fetchWarehouseMaterialConfigurationData(siteId).catch((error) => {
      console.error("Failed to load BIS material configurations", error);
      return {
        materialConfigurations: [] as MaterialCategory[],
        materialMeasures: [] as MaterialMeasure[],
        materialTypes: [] as MaterialType[],
      };
    }) : Promise.resolve({
      materialConfigurations: [] as MaterialCategory[],
      materialMeasures: [] as MaterialMeasure[],
      materialTypes: [] as MaterialType[],
    }),
  ]);

  // Keep initial page render fast by using stored DB state only.
  // BIS live refresh stays available through explicit sync actions in the UI.
  const materialsWithBisState = materials.map(withoutWarehouseBisState);

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
        materialConfigurations={materialConfigurationData.materialConfigurations}
        materialMeasures={materialConfigurationData.materialMeasures}
        materialTypes={materialConfigurationData.materialTypes}
        sendToBis={sendToBis}
        getPossibleApprovers={getPossibleWarehouseBisApprovers}
        submitToApproval={submitWarehouseRecordToBisApproval}
        syncBisRecords={syncWarehouseBisRecords}
        updateMaterialConfiguration={updateMaterialConfiguration}
        createMaterialConfiguration={createMaterialConfiguration}
        updateCostCode={updateCostCode}
        updateMaterialDate={updateMaterialDate}
        updateQuantity={updateQuantity}
        updateMaterialDetails={updateMaterialDetails}
        attachCertificate={attachCertificateToMaterialConfiguration}
        deleteRecords={deleteWarehouseRecords}
      />
    </div>
  );
}
