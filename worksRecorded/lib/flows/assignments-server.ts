"use server";

import { prisma } from "@/lib/utils/db";
import { getFlowModuleByKey } from "@/lib/flows/registry";
import type { FlowModuleKey } from "@/lib/flows/types";

const TABLE_NAME = '"FlowAssignment"';

export type FlowAssignmentRow = {
  organizationId: string;
  flowModuleKey: FlowModuleKey;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
};

async function ensureFlowAssignmentTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
      "organizationId" TEXT PRIMARY KEY,
      "flowModuleKey" TEXT NOT NULL,
      "enabled" BOOLEAN NOT NULL DEFAULT TRUE,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

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
  await ensureFlowAssignmentTable();
  const rows = await prisma.$queryRawUnsafe<Array<{
    organizationId: string;
    flowModuleKey: string;
    enabled: boolean;
    createdAt: Date;
    updatedAt: Date;
  }>>(`
    SELECT "organizationId", "flowModuleKey", "enabled", "createdAt", "updatedAt"
    FROM ${TABLE_NAME}
    ORDER BY "updatedAt" DESC
  `);

  return rows.map(normalizeAssignment).filter((row): row is FlowAssignmentRow => Boolean(row));
}

export async function getFlowAssignmentForOrganization(organizationId?: string | null) {
  if (!organizationId) return null;
  await ensureFlowAssignmentTable();
  const rows = await prisma.$queryRawUnsafe<Array<{
    organizationId: string;
    flowModuleKey: string;
    enabled: boolean;
    createdAt: Date;
    updatedAt: Date;
  }>>(
    `
      SELECT "organizationId", "flowModuleKey", "enabled", "createdAt", "updatedAt"
      FROM ${TABLE_NAME}
      WHERE "organizationId" = $1
      LIMIT 1
    `,
    organizationId,
  );

  return normalizeAssignment(rows[0] ?? null);
}

export async function saveFlowAssignment(args: {
  organizationId: string;
  flowModuleKey: FlowModuleKey;
  enabled?: boolean;
}) {
  await ensureFlowAssignmentTable();
  await prisma.$executeRawUnsafe(
    `
      INSERT INTO ${TABLE_NAME} ("organizationId", "flowModuleKey", "enabled", "updatedAt")
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      ON CONFLICT ("organizationId")
      DO UPDATE SET
        "flowModuleKey" = EXCLUDED."flowModuleKey",
        "enabled" = EXCLUDED."enabled",
        "updatedAt" = CURRENT_TIMESTAMP
    `,
    args.organizationId,
    args.flowModuleKey,
    args.enabled ?? true,
  );
}
