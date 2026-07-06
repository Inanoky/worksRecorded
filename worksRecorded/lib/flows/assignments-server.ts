"use server";

import { prisma } from "@/lib/utils/db";
import { getFlowModuleByKey } from "@/lib/flows/registry";
import type { FlowModuleKey } from "@/lib/flows/types";

export type FlowAssignmentRow = {
  organizationId: string;
  flowModuleKey: FlowModuleKey;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
};

function normalizeAssignment(row: {
  organizationId: string;
  flowModuleKey: string;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
} | null): FlowAssignmentRow | null {
  if (!row) return null;
  if (!getFlowModuleByKey(row.flowModuleKey)) return null;

  return {
    ...row,
    flowModuleKey: row.flowModuleKey as FlowModuleKey,
  };
}

export async function getFlowAssignments() {
  const rows = await prisma.flowAssignment.findMany({
    orderBy: { updatedAt: "desc" },
  });

  return rows.map(normalizeAssignment).filter((row): row is FlowAssignmentRow => Boolean(row));
}

export async function getFlowAssignmentForOrganization(organizationId?: string | null) {
  if (!organizationId) return null;
  const row = await prisma.flowAssignment.findUnique({
    where: { organizationId },
  });

  return normalizeAssignment(row);
}

export async function saveFlowAssignment(args: {
  organizationId: string;
  flowModuleKey: FlowModuleKey;
  enabled?: boolean;
}) {
  await prisma.flowAssignment.upsert({
    where: { organizationId: args.organizationId },
    create: {
      organizationId: args.organizationId,
      flowModuleKey: args.flowModuleKey,
      enabled: args.enabled ?? true,
    },
    update: {
      flowModuleKey: args.flowModuleKey,
      enabled: args.enabled ?? true,
    },
  });
}
