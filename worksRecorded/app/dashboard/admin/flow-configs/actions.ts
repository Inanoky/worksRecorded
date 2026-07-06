"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { getFlowModuleByKey } from "@/lib/flows/registry";
import { saveFlowAssignment } from "@/lib/flows/assignments-server";
import {
  canAccessFlowConfigAdmin,
  getProductionFlowConfigByKey,
} from "@/lib/production-flow/config";
import { saveProductionFlowConfigOverride } from "@/lib/production-flow/config-server";
import { prisma } from "@/lib/utils/db";
import { requireUser } from "@/lib/utils/requireUser";

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function requireFlowConfigAdmin() {
  const user = await requireUser();
  const requestHeaders = await headers();
  if (
    !canAccessFlowConfigAdmin(
      user.id,
      requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host"),
    )
  ) {
    notFound();
  }
}

export type AssignFlowState = {
  ok: boolean;
  message: string;
} | null;

export async function assignFlowToOrganizationAction(
  _previousState: AssignFlowState,
  formData: FormData,
): Promise<AssignFlowState> {
  await requireFlowConfigAdmin();

  try {
    const organizationId = String(formData.get("organizationId") ?? "").trim();
    const flowModuleKey = String(formData.get("flowModuleKey") ?? "").trim();
    if (!organizationId) throw new Error("Missing organization.");
    if (!flowModuleKey) throw new Error("Missing flow module.");

    const flowModule = getFlowModuleByKey(flowModuleKey);
    if (!flowModule) throw new Error("Unknown flow module.");

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, name: true },
    });
    if (!organization) throw new Error("Organization not found.");

    await saveFlowAssignment({
      organizationId: organization.id,
      flowModuleKey: flowModule.key,
      enabled: true,
    });

    if (flowModule.productionConfigKey) {
      const baseFlow = getProductionFlowConfigByKey(flowModule.productionConfigKey);
      if (!baseFlow) throw new Error("Unknown production config for selected flow module.");

      const organizationSlug = slugify(organization.name) || organization.id.slice(0, 8);
      const key = `org-${organizationSlug}-${baseFlow.key}`;

      await saveProductionFlowConfigOverride(key, {
        baseFlowKey: baseFlow.key,
        flowModuleKey: flowModule.key,
        isDefault: false,
        enabled: true,
        organizationIds: [organization.id],
        siteIds: [],
        name: `${organization.name} ${flowModule.name}`,
        description: `Organization assignment for ${flowModule.name}.`,
      });
    }

    revalidatePath("/dashboard/admin/flow-configs");
    return {
      ok: true,
      message: `Assigned ${flowModule.name} to ${organization.name}.`,
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Failed to save flow assignment.",
    };
  }
}
