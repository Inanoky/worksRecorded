const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
require("dotenv").config({ quiet: true });
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const sql = fs.readFileSync(path.resolve(__dirname, "../prisma/migrations/20261014103000_construction_diary_feedback/migration.sql"), "utf8");
const countSql = 'SELECT (SELECT count(*) FROM "sitediaryrecords")::int AS construction, (SELECT count(*) FROM "ZTCrecords")::int AS production, (SELECT count(*) FROM "photos")::int AS construction_photos, (SELECT count(*) FROM "ZtcPhoto")::int AS production_photos';

(async () => {
  const before = await prisma.$queryRawUnsafe(countSql);
  let rollbackReached = false;
  try {
    await prisma.$transaction(async (tx) => {
      for (const statement of sql.split(";").map((item) => item.trim()).filter(Boolean)) await tx.$executeRawUnsafe(statement);
      const tables = await tx.$queryRawUnsafe('SELECT relname, relrowsecurity FROM pg_class WHERE oid IN (\'public."ConstructionDiaryFeedback"\'::regclass, \'public."ConstructionDiaryFeedbackVersion"\'::regclass)');
      assert.equal(tables.length, 2);
      assert(tables.every((table) => table.relrowsecurity));
      const site = await tx.site.findFirst({ select: { id: true } });
      assert(site);
      await tx.constructionDiaryFeedback.create({ data: { siteId: site.id, revision: 1, generatedPrompt: "migration-test" } });
      await tx.constructionDiaryFeedbackVersion.create({ data: { siteId: site.id, revision: 1, kind: "test", generatedPrompt: "migration-test", userInstructions: "", sourceRecordCount: 0 } });
      const unique = await tx.$queryRawUnsafe('SELECT indexname FROM pg_indexes WHERE tablename = \'ConstructionDiaryFeedbackVersion\' AND indexname = \'ConstructionDiaryFeedbackVersion_siteId_revision_key\'');
      assert.equal(unique.length, 1);
      assert.deepEqual(await tx.$queryRawUnsafe(countSql), before);
      rollbackReached = true;
      throw new Error("feedback-migration-test-rollback");
    }, { timeout: 30000 });
  } catch (error) {
    if (error.message !== "feedback-migration-test-rollback") throw error;
  }
  assert(rollbackReached);
  assert.deepEqual(await prisma.$queryRawUnsafe(countSql), before);
  const absent = await prisma.$queryRawUnsafe('SELECT to_regclass(\'public."ConstructionDiaryFeedback"\')::text AS feedback, to_regclass(\'public."ConstructionDiaryFeedbackVersion"\')::text AS versions');
  assert.equal(absent[0].feedback, null);
  assert.equal(absent[0].versions, null);
  console.log(JSON.stringify({ migrationTest: "passed-and-rolled-back", preserved: before[0] }));
})().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
