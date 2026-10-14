const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
require("dotenv").config({ quiet: true });
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const sql = fs.readFileSync(path.resolve(__dirname, "../prisma/migrations/20261014123000_separate_construction_feedback_domains/migration.sql"), "utf8");
const plain = (rows) => JSON.parse(JSON.stringify(rows));
const read = async (db) => ({ state: plain(await db.$queryRawUnsafe('SELECT * FROM "ConstructionDiaryFeedback" ORDER BY "siteId"')), history: plain(await db.$queryRawUnsafe('SELECT * FROM "ConstructionDiaryFeedbackVersion" ORDER BY "id"')), counts: await db.$queryRawUnsafe('SELECT (SELECT count(*) FROM "sitediaryrecords")::int AS diary, (SELECT count(*) FROM "BISmaterialRecords")::int AS materials, (SELECT count(*) FROM "ZTCrecords")::int AS ztc, (SELECT count(*) FROM "photos")::int AS photos, (SELECT count(*) FROM "ZtcPhoto")::int AS ztc_photos') });
(async () => {
  const before = await read(prisma);
  const target = path.resolve(__dirname, "../../outputs/feedback-domains-20261014");
  fs.mkdirSync(target, { recursive: true });
  fs.writeFileSync(path.join(target, `before-${Date.now()}.json`), JSON.stringify(before, null, 2), { flag: "wx" });
  let verified = false;
  try {
    await prisma.$transaction(async (tx) => {
      for (const statement of sql.split(";").map((value) => value.trim()).filter(Boolean)) await tx.$executeRawUnsafe(statement);
      const after = await read(tx);
      const stripDomain = (rows) => rows.map(({ domain, ...row }) => { assert.equal(domain, "diary"); return row; });
      assert.deepEqual(stripDomain(after.state), before.state);
      assert.deepEqual(stripDomain(after.history), before.history);
      assert.deepEqual(after.counts, before.counts);
      const site = await tx.site.findFirst({ select: { id: true } });
      const state = await tx.constructionDiaryFeedback.upsert({ where: { siteId_domain: { siteId: site.id, domain: "diary" } }, create: { siteId: site.id, domain: "diary" }, update: {} });
      const warehouse = await tx.constructionDiaryFeedback.create({ data: { siteId: site.id, domain: "warehouse", revision: 1, generatedPrompt: "warehouse-test" } });
      await tx.constructionDiaryFeedbackVersion.create({ data: { siteId: site.id, domain: "warehouse", revision: 1, kind: "test", generatedPrompt: warehouse.generatedPrompt, userInstructions: "", sourceRecordCount: 0 } });
      assert.deepEqual(await tx.constructionDiaryFeedback.findUnique({ where: { siteId_domain: { siteId: site.id, domain: "diary" } } }), state);
      assert.equal((await tx.constructionDiaryFeedbackVersion.findMany({ where: { siteId: site.id, domain: "warehouse" } })).length, 1);
      const rls = await tx.$queryRawUnsafe('SELECT relrowsecurity FROM pg_class WHERE oid IN (\'public."ConstructionDiaryFeedback"\'::regclass, \'public."ConstructionDiaryFeedbackVersion"\'::regclass)');
      assert(rls.every((row) => row.relrowsecurity));
      verified = true;
      throw new Error("feedback-domains-test-rollback");
    }, { timeout: 30000 });
  } catch (error) { if (error.message !== "feedback-domains-test-rollback") throw error; }
  assert(verified);
  assert.deepEqual(await read(prisma), before);
  console.log(JSON.stringify({ test: "passed-and-rolled-back", preservedStates: before.state.length, preservedVersions: before.history.length, counts: before.counts[0] }));
})().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
