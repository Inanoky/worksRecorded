import { prisma } from "@/lib/utils/db";

export type TrustedBisScope = {
  siteId: string;
  userId: string;
};

export type BisConnectionOverride = {
  status: "not-connected" | "case-not-selected" | "ready";
  siteName?: string;
  caseNumber?: string;
  caseName?: string;
};

export async function getBisConnectionStatus(
  scope: TrustedBisScope,
  options: { connectionOverride?: BisConnectionOverride } = {},
) {
  if (options.connectionOverride) {
    const override = options.connectionOverride;
    return {
      status: override.status,
      source: "ai-eval-override",
      liveBisVerified: false,
      siteName: override.siteName ?? "AI Eval Site",
      bisCase: override.status === "ready" ? {
        number: override.caseNumber ?? "EVAL-BIS-001",
        name: override.caseName ?? "AI Eval BIS Case",
        stage: null,
      } : null,
      constructionRound: null,
    };
  }

  const rows = await prisma.$queryRaw<Array<{
        siteId: string;
        siteName: string;
        bisCaseId: string | null;
        bisCaseNumber: string | null;
        bisCaseName: string | null;
        bisCaseStage: string | null;
        bisConstructionRoundId: string | null;
        bisConstructionRoundName: string | null;
        bisConstructionRoundNumber: number | null;
        bisConstructionRoundStatus: string | null;
        hasBisToken: boolean;
  }>>`
        SELECT
          site.id AS "siteId",
          site.name AS "siteName",
          site."bisCaseId",
          site."bisCaseNumber",
          site."bisCaseName",
          site."bisCaseStage",
          site."bisConstructionRoundId",
          site."bisConstructionRoundName",
          site."bisConstructionRoundNumber",
          site."bisConstructionRoundStatus",
          EXISTS (
            SELECT 1 FROM "BisToken" token WHERE token."userId" = ${scope.userId}
          ) AS "hasBisToken"
        FROM "Site" site
        WHERE site.id = ${scope.siteId}
        LIMIT 1
  `;

  const site = rows[0];
  if (!site) return { status: "no-active-site" as const };
  const status = !site.hasBisToken
    ? "not-connected"
    : !site.bisCaseId
      ? "case-not-selected"
      : "ready";

  return {
    status,
    source: "worksrecorded-local-database",
    liveBisVerified: false,
    siteName: site.siteName,
    bisCase: site.bisCaseId ? {
      number: site.bisCaseNumber,
      name: site.bisCaseName,
      stage: site.bisCaseStage,
    } : null,
    constructionRound: site.bisConstructionRoundId ? {
      number: site.bisConstructionRoundNumber,
      name: site.bisConstructionRoundName,
      status: site.bisConstructionRoundStatus,
    } : null,
  };
}

export async function readBisMaterialRecords(
  scope: TrustedBisScope,
  { search = "", limit = 10 }: { search?: string; limit?: number } = {},
) {
  const pattern = `%${search}%`;
  const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>`
        SELECT
          id, name, quantity, "measurementUnit", "categoryName", "costCode",
          "invoiceNr", "invoiceDate", "materialDate", "supplierName",
          cost, "BISId", "bisStatus", "createdAt"
        FROM "BISmaterialRecords"
        WHERE "siteId" = ${scope.siteId}
          AND (
            ${search} = '' OR
            COALESCE(name, '') ILIKE ${pattern} OR
            COALESCE("categoryName", '') ILIKE ${pattern} OR
            COALESCE("invoiceNr", '') ILIKE ${pattern} OR
            COALESCE("costCode", '') ILIKE ${pattern} OR
            COALESCE("supplierName", '') ILIKE ${pattern}
          )
        ORDER BY "createdAt" DESC
        LIMIT ${limit}
  `;
  return { count: rows.length, records: rows };
}

export async function readSiteDiaryBisStatuses(
  scope: TrustedBisScope,
  {
    submission = "all",
    search = "",
    limit = 10,
  }: {
    submission?: "all" | "sent" | "not-sent";
    search?: string;
    limit?: number;
  } = {},
) {
  const pattern = `%${search}%`;
  const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>`
        SELECT id, "Date", "Location", "Works", "Comments", "BISId", "bisStatus", "createdAt"
        FROM "sitediaryrecords"
        WHERE "siteId" = ${scope.siteId}
          AND "archivedAt" IS NULL
          AND (${submission} = 'all'
            OR (${submission} = 'sent' AND "BISId" IS NOT NULL)
            OR (${submission} = 'not-sent' AND "BISId" IS NULL))
          AND (${search} = ''
            OR COALESCE("Works", '') ILIKE ${pattern}
            OR COALESCE("Location", '') ILIKE ${pattern}
            OR COALESCE("Comments", '') ILIKE ${pattern})
        ORDER BY COALESCE("Date", "createdAt") DESC
        LIMIT ${limit}
  `;
  return { count: rows.length, records: rows };
}
