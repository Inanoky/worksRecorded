"use server";

import { revalidatePath } from "next/cache";
import {
  normalizeMaterialConfigurationTemplates,
  serializeMaterialConfigurationTemplates,
  type OrganizationMaterialConfigurationTemplate,
} from "@/lib/bis/material-configuration-templates";
import { getBisBaseUrl, ensureUserBisAccessToken } from "@/server/actions/BIS/service";
import { bisFetch } from "@/server/actions/BIS/TestBisEnv/relay";
import { prisma } from "@/lib/utils/db";
import { requireUser } from "@/lib/utils/requireUser";

async function requireOrganizationAccess(organizationId: string) {
  const user = await requireUser();
  const userOrg = await prisma.user.findUnique({
    where: { id: user.id },
    select: { organizationId: true },
  });

  if (!userOrg?.organizationId || userOrg.organizationId !== organizationId) {
    throw new Error("You do not have access to this organization.");
  }
}


type MaterialConfigurationTemplateOptions = {
  materialMeasures: Array<{ id: string; name: string }>;
  materialTypes: Array<{ id: string; name: string; categoryName?: string | null; isHeader?: boolean }>;
};

async function fetchBisClassifierData(path: string, accessToken: string) {
  const response = await bisFetch(getBisBaseUrl(), `${getBisBaseUrl()}${path}`, {
    headers: {
      Accept: "application/vnd.api+json",
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`BIS classifier request failed: ${response.status}`);
  }

  return response.json();
}

export async function getOrganizationMaterialConfigurationTemplates(organizationId: string) {
  await requireOrganizationAccess(organizationId);

  const rows = await prisma.$queryRawUnsafe<Array<{ bisMaterialConfigurationTemplates: unknown }>>(
    `SELECT "bisMaterialConfigurationTemplates" FROM "Organization" WHERE id = $1 LIMIT 1`,
    organizationId,
  );

  return normalizeMaterialConfigurationTemplates(rows[0]?.bisMaterialConfigurationTemplates);
}

export async function updateOrganizationMaterialConfigurationTemplates(
  organizationId: string,
  templates: OrganizationMaterialConfigurationTemplate[],
) {
  await requireOrganizationAccess(organizationId);

  const normalizedTemplates = serializeMaterialConfigurationTemplates(templates);

  await prisma.$executeRawUnsafe(
    `UPDATE "Organization" SET "bisMaterialConfigurationTemplates" = $1::jsonb WHERE id = $2`,
    JSON.stringify(normalizedTemplates),
    organizationId,
  );

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/sites");

  return { ok: true, templates: normalizedTemplates };
}


export async function getOrganizationMaterialConfigurationTemplateOptions(
  organizationId: string,
): Promise<MaterialConfigurationTemplateOptions> {
  const user = await requireUser();
  await requireOrganizationAccess(organizationId);

  const token = await ensureUserBisAccessToken(user.id);
  if (!token?.accessToken) {
    return { materialMeasures: [], materialTypes: [] };
  }

  try {
    const [measuresData, materialTypesData] = await Promise.all([
      fetchBisClassifierData(`/bisp/api/portal/classifiers?filter[typ_eq]=character_measures`, token.accessToken),
      fetchBisClassifierData(`/bisp/api/portal/classifiers?filter[typ_eq]=logbook_construction_material`, token.accessToken),
    ]);

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

    const materialMeasures = (Array.isArray(measuresData?.data) ? measuresData.data : [])
      .map((item: any) => ({
        id: item?.attributes?.code == null ? "" : String(item.attributes.code),
        name: item?.attributes?.name == null ? "" : String(item.attributes.name),
      }))
      .filter((item: { id: string; name: string }) => {
        const normalizedName = item.name.trim().replace(/\./g, "").toLowerCase();
        return item.id && item.name && allowedMeasurementNames.has(normalizedName);
      })
      .sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name));

    const materialTypes = (Array.isArray(materialTypesData?.data) ? materialTypesData.data : [])
      .map((item: any) => ({
        id: item?.attributes?.code == null ? "" : String(item.attributes.code),
        name: item?.attributes?.name == null ? "" : String(item.attributes.name),
        categoryName:
          item?.attributes?.category_name == null ? null : String(item.attributes.category_name),
        isHeader: /^\d{2}$/.test(String(item?.attributes?.code ?? "")),
      }))
      .filter((item: { id: string; name: string }) => item.id && item.name)
      .sort((a: { id: string }, b: { id: string }) => a.id.localeCompare(b.id));

    return { materialMeasures, materialTypes };
  } catch (error) {
    console.error("Failed to load BIS material template options", error);
    return { materialMeasures: [], materialTypes: [] };
  }
}
