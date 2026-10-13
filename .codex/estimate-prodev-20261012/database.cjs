const fs = require("node:fs");
const path = require("node:path");
const app = path.resolve(__dirname, "../../worksRecorded");
require(path.join(app, "node_modules/dotenv")).config({ path: path.join(app, ".env"), quiet: true });
const { PrismaClient } = require(path.join(app, "node_modules/@prisma/client"));
const prisma = new PrismaClient();
async function main() {
  const id = "c39cb04c-8ce5-477d-acd0-99586a82d850";
  const site = await prisma.site.findUnique({ where: { id }, select: { id: true, name: true, organizationId: true, siteDiaryRecordsMap: true, organization: { select: { id: true, name: true } } } });
  if (!site || site.organizationId !== "17b1f970-a5bc-4cd5-a2a1-bf41ab554cb3") throw new Error("Project/organization mismatch");
  const analytics = await prisma.analytics.findUnique({ where: { siteId: id } });
  const flows = await prisma.flowAssignment.findMany({ where: { organizationId: site.organizationId } });
  const records = await prisma.sitediaryrecords.findMany({ where: { siteId: id }, select: { id: true, Works: true, Units: true, Amounts: true } });
  const data = { site, analytics, flows, records };
  fs.writeFileSync(path.join(__dirname, "before.json"), JSON.stringify(data, null, 2));
  const config = site.siteDiaryRecordsMap || {};
  console.log(JSON.stringify({ site: { id: site.id, name: site.name, organization: site.organization }, flows, works: config.Works, otherSettings: config.otherSettings, forma2: analytics?.currentWeekProgress?.defaultConstructionForma2, recordCount: records.length, recordWorks: [...new Set(records.map(r => r.Works))] }, null, 2));
}
main().catch(e => { console.error(e.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
