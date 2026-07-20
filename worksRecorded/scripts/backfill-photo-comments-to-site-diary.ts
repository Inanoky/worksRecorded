import "dotenv/config";
import { Prisma } from "@prisma/client";
import { extractAndSaveSiteDiary } from "@/flows/default-construction/backend/site-manager-agent/tools";
import { prisma } from "@/lib/utils/db";
import {
  buildPhotoCommentBackfillCandidateSql,
  buildPhotoCommentBackfillCountSql,
  getPhotoCommentBackfillSourceMessageId,
  normalizePhotoComment,
  type PhotoCommentBackfillArgs,
} from "@/lib/site-diary/photo-comment-backfill";
import { runWithWhatsappSourceContext } from "@/server/ai-flows/agents/whatsapp-agent/whatsappSourceContext";
import { runWithSiteManagerToolContext } from "@/server/ai-flows/agents/whatsapp-agent/SiteManagerAgentForSiteManagerRoute/siteDiaryToolContext";

type PhotoCommentRow = {
  id: string;
  Date: Date | null;
  Comment: string | null;
  URL: string | null;
  fileUrl: string | null;
};

type ScriptArgs = PhotoCommentBackfillArgs & {
  commit: boolean;
};

const DEFAULT_MIN_COMMENT_LENGTH = 25;

function readArg(name: string) {
  const inlinePrefix = `${name}=`;
  const inline = process.argv.find((arg) => arg.startsWith(inlinePrefix));
  if (inline) return inline.slice(inlinePrefix.length);

  const index = process.argv.indexOf(name);
  if (index >= 0) return process.argv[index + 1];

  return null;
}

function readFlag(name: string) {
  return process.argv.includes(name);
}

function parseDateArg(name: string) {
  const value = readArg(name);
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`Missing or invalid ${name}. Expected YYYY-MM-DD.`);
  }
  return value;
}

function parsePositiveIntegerArg(name: string, fallback: number) {
  const value = readArg(name);
  if (!value) return fallback;

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`Invalid ${name}. Expected a positive integer.`);
  }

  return parsed;
}

function parseArgs(): ScriptArgs {
  const siteId = readArg("--siteId");
  const userId = readArg("--userId");

  if (!siteId || !userId) {
    throw new Error(`Usage:
tsx scripts/backfill-photo-comments-to-site-diary.ts \\
  --siteId bd829e5b-b4c7-4972-8e97-3820efa7d0d4 \\
  --userId kp_3f771f0a837a440d84e8eb47cdbf918a \\
  --startDate 2026-05-01 \\
  --endDate 2026-07-30 \\
  --minCommentLength 25 \\
  [--commit]`);
  }

  const startDate = parseDateArg("--startDate");
  const endDate = parseDateArg("--endDate");

  if (startDate > endDate) {
    throw new Error("--startDate must be before or equal to --endDate.");
  }

  return {
    siteId,
    userId,
    startDate,
    endDate,
    minCommentLength: parsePositiveIntegerArg("--minCommentLength", DEFAULT_MIN_COMMENT_LENGTH),
    commit: readFlag("--commit"),
  };
}

function formatRigaDateForSiteDiary(value: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Riga",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).formatToParts(value);
  const values = Object.fromEntries(parts.map(({ type, value: partValue }) => [type, partValue]));
  return `${values.day}-${values.month}-${values.year}`;
}

function previewText(value: string, maxLength = 140) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 3)}...`;
}

function printSqlCheckpoints(args: PhotoCommentBackfillArgs) {
  console.log("Candidate count SQL:");
  console.log(buildPhotoCommentBackfillCountSql(args));
  console.log("");
  console.log("Candidate preview SQL:");
  console.log(buildPhotoCommentBackfillCandidateSql(args));
  console.log("");
  console.log("Completed backfills SQL:");
  console.log(`SELECT b."sourceMessageId", b."createdAt", b."originalText", count(r."id") AS diary_record_count
FROM "SiteDiarySaveBatch" b
LEFT JOIN "sitediaryrecords" r ON r."saveBatchId" = b."id"
WHERE b."siteId" = '${args.siteId.replace(/'/g, "''")}'
  AND b."userId" = '${args.userId.replace(/'/g, "''")}'
  AND b."sourceMessageId" LIKE 'photo-comment-backfill:%'
GROUP BY b."id"
ORDER BY b."createdAt";`);
  console.log("");
}

async function loadCandidates(args: PhotoCommentBackfillArgs) {
  return prisma.$queryRaw<PhotoCommentRow[]>(Prisma.sql`
    SELECT
      p."id",
      p."Date",
      p."Comment",
      p."URL",
      p."fileUrl"
    FROM "photos" p
    WHERE p."siteId" = ${args.siteId}
      AND p."userId" = ${args.userId}
      AND p."Date" >= ${`${args.startDate} 00:00:00`}::timestamp
      AND p."Date" < (${args.endDate}::date + interval '1 day')
      AND nullif(trim(p."Comment"), '') IS NOT NULL
      AND char_length(trim(p."Comment")) >= ${args.minCommentLength}
      AND NOT EXISTS (
        SELECT 1
        FROM "SiteDiarySaveBatch" b
        WHERE b."sourceMessageId" = concat('photo-comment-backfill:', p."id")
      )
    ORDER BY p."Date", p."createdAt";
  `);
}

function printCandidateRows(candidates: PhotoCommentRow[]) {
  console.log(`Candidate count: ${candidates.length}`);
  for (const row of candidates) {
    const comment = normalizePhotoComment(row.Comment);
    console.log(JSON.stringify({
      photoId: row.id,
      date: row.Date?.toISOString() ?? null,
      commentLength: comment.length,
      commentPreview: previewText(comment),
      url: row.fileUrl ?? row.URL,
      sourceMessageId: getPhotoCommentBackfillSourceMessageId(row.id),
    }));
  }
}

async function processCandidate(args: {
  row: PhotoCommentRow;
  siteId: string;
  userId: string;
}) {
  const comment = normalizePhotoComment(args.row.Comment);
  const sourceMessageId = getPhotoCommentBackfillSourceMessageId(args.row.id);
  const existingBatch = await prisma.siteDiarySaveBatch.findUnique({
    where: { sourceMessageId },
    select: { id: true },
  });

  if (existingBatch) {
    return {
      status: "skipped_existing_batch",
      sourceMessageId,
      count: 0,
    };
  }

  if (!args.row.Date) {
    return {
      status: "skipped_missing_date",
      sourceMessageId,
      count: 0,
    };
  }

  const requestedDate = formatRigaDateForSiteDiary(args.row.Date);
  const result = await runWithWhatsappSourceContext(
    { messageId: sourceMessageId },
    () => runWithSiteManagerToolContext(
      {
        siteId: args.siteId,
        userId: args.userId,
        originalUserComment: comment,
      },
      () => extractAndSaveSiteDiary({
        question: comment,
        requestedDate,
        allowFallback: true,
      }),
    ),
  );

  return {
    status: result.action,
    sourceMessageId,
    ok: result.ok,
    count: result.count,
    requestedDate,
    intentConfidence: result.intentConfidence ?? null,
    intentReason: result.intentReason ?? null,
    recordIds: result.records?.map((record: any) => record.id).filter(Boolean) ?? [],
  };
}

async function main() {
  const args = parseArgs();
  const { commit, ...filterArgs } = args;

  printSqlCheckpoints(filterArgs);

  const candidates = await loadCandidates(filterArgs);
  printCandidateRows(candidates);

  if (!commit) {
    console.log("");
    console.log("Dry-run complete. Re-run with --commit to process these candidates.");
    return;
  }

  console.log("");
  console.log(`Commit mode: processing ${candidates.length} photo comments.`);

  const summary = {
    processed: 0,
    saved: 0,
    skipped: 0,
    fallback: 0,
    clarify: 0,
    correction: 0,
    failed: 0,
  };

  for (const [index, row] of candidates.entries()) {
    const comment = normalizePhotoComment(row.Comment);
    console.log("");
    console.log(`[${index + 1}/${candidates.length}] ${row.id} ${previewText(comment, 100)}`);

    try {
      const result = await processCandidate({
        row,
        siteId: args.siteId,
        userId: args.userId,
      });

      summary.processed += 1;
      if (result.status === "save_new_report" && result.ok) summary.saved += result.count ?? 0;
      else if (String(result.status).startsWith("skipped_")) summary.skipped += 1;
      else if (result.status === "fallback") summary.fallback += 1;
      else if (result.status === "clarify") summary.clarify += 1;
      else if (result.status === "correct_existing_report") summary.correction += 1;

      console.log(JSON.stringify(result, null, 2));
    } catch (error) {
      summary.failed += 1;
      console.error(JSON.stringify({
        status: "failed",
        photoId: row.id,
        message: error instanceof Error ? error.message : String(error),
      }, null, 2));
    }
  }

  console.log("");
  console.log("Backfill summary:");
  console.log(JSON.stringify(summary, null, 2));
}

if (process.argv[1]?.endsWith("backfill-photo-comments-to-site-diary.ts")) {
  main()
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
