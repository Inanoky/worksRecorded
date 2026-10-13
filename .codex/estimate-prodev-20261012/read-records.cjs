const fs = require("node:fs");
const path = require("node:path");
const app = path.resolve(__dirname, "../../worksRecorded");
require(path.join(app, "node_modules/dotenv")).config({ path: path.join(app, ".env"), quiet: true });
const { PrismaClient } = require(path.join(app, "node_modules/@prisma/client"));
const prisma = new PrismaClient();
async function main() {
  const siteId = "c39cb04c-8ce5-477d-acd0-99586a82d850";
  const site = await prisma.site.findUnique({ where: { id: siteId }, select: { id: true, name: true, organizationId: true, siteDiaryRecordsMap: true } });
  if (!site || site.organizationId !== "17b1f970-a5bc-4cd5-a2a1-bf41ab554cb3") throw new Error("Project organization mismatch");
  const analytics = await prisma.analytics.findUnique({ where: { siteId } });
  const records = await prisma.sitediaryrecords.findMany({ where: { siteId, archivedAt: null }, orderBy: [{ Date: "asc" }, { id: "asc" }] });
  fs.writeFileSync(path.join(__dirname, "categorization-before.json"), JSON.stringify({ site, analytics, records }, null, 2));
  console.log(JSON.stringify(records.map(({ id, Date, Works, Units, Amounts, Comments, originalUserComment, Location, BISId, Comments_Custom_1, Works_Custom_1 }) => ({ id, Date, Works, Units, Amounts, Comments, originalUserComment, Location, BISId, Comments_Custom_1, Works_Custom_1 })), null, 2));
  console.log(JSON.stringify({ positions: analytics?.currentWeekProgress?.defaultConstructionForma2?.document?.positions?.length, records: records.length }));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
