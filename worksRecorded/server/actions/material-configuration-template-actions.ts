"use server";

import { revalidatePath } from "next/cache";
import {
  normalizeMaterialConfigurationTemplates,
  serializeMaterialConfigurationTemplates,
  type OrganizationMaterialConfigurationTemplate,
} from "@/lib/bis/material-configuration-templates";
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
