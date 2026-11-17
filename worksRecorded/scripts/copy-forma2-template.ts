import "dotenv/config";
import { deepStrictEqual } from "node:assert";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { Prisma, PrismaClient } from "@prisma/client";
import { z } from "zod";
import { normalizeDiaryReviewPhone } from "../flows/default-construction/lib/diary-review-pilot";
import { prepareForma2TemplateCopy } from "../flows/default-construction/lib/forma2-template-copy";

const db = new PrismaClient();
const argument = (name: string) =>
  process.argv
    .find((value) => value.startsWith(`--${name}=`))
    ?.slice(name.length + 3);
const apply = process.argv.includes("--apply");

async function main() {
  const sourceId = z.string().uuid().parse(argument("source"));
  const targetId = z.string().uuid().parse(argument("target"));
  const pilotPhone = argument("pilot-phone");
  const pilotUserId = z.string().min(1).parse(argument("pilot-user"));
  if (sourceId === targetId) throw new Error("Source and target must differ");
  const select = {
    id: true,
    organizationId: true,
    userId: true,
    siteDiaryRecordsMap: true,
    analytics: { select: { id: true, currentWeekProgress: true } },
  } as const;
  const sites = await db.site.findMany({
    where: { id: { in: [sourceId, targetId] } },
    select,
  });
  const source = sites.find((site) => site.id === sourceId);
  const target = sites.find((site) => site.id === targetId);
  if (!source || !target || !target.organizationId || !pilotPhone)
    throw new Error("Missing source or target");
  const user = await db.user.findUnique({
    where: { id: pilotUserId },
    select: { organizationId: true, phone: true },
  });
  if (
    user?.organizationId !== target.organizationId ||
    normalizeDiaryReviewPhone(user?.phone) !==
      normalizeDiaryReviewPhone(pilotPhone)
  )
    throw new Error("Pilot user does not match target tenant and phone");
  const plan = prepareForma2TemplateCopy({
    sourceSiteId: sourceId,
    sourceRoot: source.analytics?.currentWeekProgress,
    targetRoot: target.analytics?.currentWeekProgress,
    targetConfig: target.siteDiaryRecordsMap,
    documentId: randomUUID(),
    copiedAt: new Date().toISOString(),
    pilotPhone,
    pilotUserId,
  });
  if (!apply) {
    console.log(
      JSON.stringify({
        mode: "preview",
        sourceId,
        targetId,
        positions: plan.positions,
        importedWorks: plan.importedWorks,
        copiesFactualAllocations: false,
      }),
    );
    return;
  }
  const backupDir =
    argument("backup-dir") ??
    `/private/tmp/forma2-template-copy-${randomUUID()}`;
  await mkdir(backupDir, { recursive: true, mode: 0o700 });
  const backup = join(backupDir, `${targetId}.json`);
  await writeFile(
    backup,
    JSON.stringify({ source, target, copiedAt: new Date().toISOString() }),
    { flag: "wx", mode: 0o600 },
  );
  await db.$transaction(
    async (tx) => {
      const current = await tx.site.findMany({
        where: { id: { in: [sourceId, targetId] } },
        select,
      });
      if (
        JSON.stringify(current.find((site) => site.id === sourceId)) !==
          JSON.stringify(source) ||
        JSON.stringify(current.find((site) => site.id === targetId)) !==
          JSON.stringify(target)
      )
        throw new Error("Project data changed after preview");
      await tx.analytics.upsert({
        where: { siteId: targetId },
        create: {
          siteId: targetId,
          currentWeekProgress: plan.root as Prisma.InputJsonObject,
        },
        update: { currentWeekProgress: plan.root as Prisma.InputJsonObject },
      });
      await tx.site.update({
        where: { id: targetId },
        data: { siteDiaryRecordsMap: plan.config as Prisma.InputJsonObject },
      });
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      timeout: 15000,
    },
  );
  const verified = await db.site.findUniqueOrThrow({
    where: { id: targetId },
    select,
  });
  deepStrictEqual(
    verified.analytics?.currentWeekProgress,
    JSON.parse(JSON.stringify(plan.root)),
  );
  deepStrictEqual(
    verified.siteDiaryRecordsMap,
    JSON.parse(JSON.stringify(plan.config)),
  );
  deepStrictEqual(
    await db.site.findUniqueOrThrow({ where: { id: sourceId }, select }),
    source,
  );
  console.log(
    JSON.stringify({
      mode: "applied",
      targetId,
      organizationId: target.organizationId,
      positions: plan.positions,
      importedWorks: plan.importedWorks,
      backup,
    }),
  );
}

main()
  .catch((error: unknown) => {
    console.error(
      JSON.stringify({
        error:
          error instanceof Prisma.PrismaClientKnownRequestError
            ? error.code
            : error instanceof z.ZodError
              ? "INVALID_ARGUMENTS"
              : "COPY_FAILED",
      }),
    );
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
