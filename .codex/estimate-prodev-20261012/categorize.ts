import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { isDeepStrictEqual } from "node:util";
import { getDefaultConstructionForma2WorkSyncManifest, getDefaultConstructionForma2SourceByWork, normalizeForma2WorkOptionKey } from "../../worksRecorded/flows/default-construction/lib/forma2-work-options-manifest";
import { buildForma2AnalyticsView } from "../../worksRecorded/flows/default-construction/lib/forma2-analytics";
import { getForma2QuantityExclusion } from "../../worksRecorded/flows/default-construction/lib/forma2-quantities";

const requireApp = createRequire(path.resolve("package.json"));
requireApp("dotenv").config({ quiet: true });
const { PrismaClient, Prisma } = requireApp("@prisma/client");
const prisma = new PrismaClient();
const directory = path.resolve("../.codex/estimate-prodev-20261012");
const siteId = "c39cb04c-8ce5-477d-acd0-99586a82d850";
const organizationId = "17b1f970-a5bc-4cd5-a2a1-bf41ab554cb3";
const clean = (value: any) => JSON.parse(JSON.stringify(value));
const decisions = [
  ["28fd8972-e43e-488f-ae83-19b73d4ed0cb", "work:11:vedinasanas-restes-fasade-vtk-100-diametrs-100mm:43", "Aprakstā norādīta VTK 100 komplektu uzstādīšana."],
  ["20fbb04c-89f1-4c9e-a8d1-80dd6059d71b", "work:11:jumta-attirisana-un-sagatavosana-renovacijai-att:134", "Jumta attīrīšana no gaisa pūšļiem, nevis cokola tīrīšana; precīza darba sakritība."],
  ["363baa73-050d-462a-aab5-db4d719445d9", "work:4:sienu-un-griest-siltinasana-limetas-akmens-vates:152", "Pagraba pārseguma siltināšana ar 100 mm akmens vates plātnēm."],
  ["3be65da3-43ec-430c-bf8b-3cbed85beaee", "work:papildarbs:apdares-cementa-skiedru-plaksnes-montaza-emerald:96", "550 m2 cementa šķiedru plākšņu montāža no 25.09. līdz 09.10. sakrīt ar 5a!F23:G23: EMERALD 300 + 250 m2 tajā pašā periodā."],
  ["5dfb78b6-9802-4af5-a5fb-c8572ea09d8d", "work:2:skunisu-sienu-augstumu-samazinasana-un-nostiprin:150", "Lietotāja pēdējais labojums un aktuālais komentārs norāda šķūnīšu sienu augstuma samazināšanu un nostiprināšanu, nevis sākotnējo koka brusu montāžu."],
  ["634e77c3-3061-4bc9-a4ef-02fa00817cb8", "work:3:virsmu-sagatavosana-siltinasanai-esoso-komunikac:151", "Pagraba pārseguma gruntēšana ietilpst 7A virsmu sagatavošanas pozīcijā, nevis 5A pagraba sienu gruntēšanā."],
  ["87346752-0d20-45de-8959-3f9c7eaf6baa", "work:3:virsmu-sagatavosana-siltinasanai-esoso-komunikac:151", "Pēdējais labojums norāda pagraba pārseguma virsmas sagatavošanu siltināšanai. Datubāzē daudzums un mērvienība nav norādīti; tie netiek mainīti."],
  ["e8e95232-e18e-4e74-8bfb-61c6a87b6073", "work:papildarbs:ventilejamas-fasades-aluminija-karkasa-elementi-:94", "Ventilējamās fasādes alumīnija karkasa kronšteini, arī logu un durvju ailēm; darba teksts un 120 m2 periodā 25.09.–02.10. sakrīt ar 5a!J21."],
  ["f80dc93f-f378-4e94-8ea0-cec95a80766a", "work:11:vedinasanas-restes-fasade-vtk-100-diametrs-100mm:43", "VTK-100 montāža; darba nosaukums un 30 gabalu apjoms sakrīt ar logu tāmes VTK 100 pozīciju."],
  ["3006ab67-ec55-4545-a5d3-c72da8a15319", "work:11:vedinasanas-restes-fasade-vtk-100-diametrs-100mm:43", "Aprakstā norādīta VTK 100 komplektu uzstādīšana. Abus ierakstus ar 5 gabaliem saglabā, jo kopā tie veido ziņojuma 10 gabalus."],
];

async function main() {
  const before = JSON.parse(fs.readFileSync(path.join(directory, "categorization-before.json"), "utf8"));
  assert.equal(before.site.id, siteId);
  assert.equal(before.site.organizationId, organizationId);
  const config = before.site.siteDiaryRecordsMap;
  const root = structuredClone(before.analytics.currentWeekProgress);
  const state = root.defaultConstructionForma2;
  const manifest = getDefaultConstructionForma2WorkSyncManifest(config);
  const byWork = getDefaultConstructionForma2SourceByWork(config);
  assert(manifest && manifest.documentId === state.document.id);
  const mappings = decisions.map(([id, positionId, reason]) => {
    const record = before.records.find((r: any) => r.id === id);
    const position = state.document.positions.find((p: any) => p.id === positionId);
    const entry = manifest.entries.find(entry => entry.positionId === positionId);
    assert(record && position && entry);
    assert(Object.values(config.Works.DropDownOptions).includes(entry.work));
    assert.equal(byWork.get(normalizeForma2WorkOptionKey(entry.work))?.positionId, positionId);
    if (record.Amounts != null && record.Units) assert.equal(getForma2QuantityExclusion(record.Amounts, record.Units, position.unit), null);
    return { id, positionId, oldWorks: record.Works, newWorks: entry.work, reason, categoryCode: position.categoryCode, positionName: position.name };
  });
  assert.equal(mappings.length, before.records.length);
  assert.equal(new Set(mappings.map(m => m.id)).size, mappings.length);
  const changedIds = new Set(mappings.map(m => m.id));
  const changedAt = new Date().toISOString();
  state.allocations = [
    ...state.allocations.filter((a: any) => a.sourceType !== "work" || !changedIds.has(a.sourceId)),
    ...mappings.map(m => ({ sourceType: "work", sourceId: m.id, positionId: m.positionId, method: "manual", confidence: null, assignedAt: changedAt })),
  ];
  const history = root.estimateWorkRecategorizationHistory ?? [];
  assert(Array.isArray(history));
  root.estimateWorkRecategorizationHistory = [...history, { version: 1, changedAt, origin: "user_requested_review", siteId, documentId: state.document.id, mappings }];
  const sources = before.records.map((r: any) => {
    const m = mappings.find(m => m.id === r.id)!;
    return { id: r.id, type: "work" as const, selectedPositionId: byWork.get(normalizeForma2WorkOptionKey(m.newWorks))!.positionId, label: m.newWorks, secondaryLabel: r.Location ?? "", date: r.Date, unit: r.Units ?? "", quantity: r.Amounts, reportedQuantity: r.Amounts, hours: r.TimeInvolved, actualCost: null };
  });
  const view = buildForma2AnalyticsView({ positions: state.document.positions, allocations: state.allocations, sources, includeSuggestions: false });
  assert.equal(view.summary.assignedRecords, 10);
  assert.equal(view.summary.unassignedRecords, 0);
  for (const m of mappings) assert.equal(view.mappingRows.find(row => row.id === m.id)!.assignedPositionId, m.positionId);
  const summary = { siteId, records: mappings.length, changedWorkNames: mappings.filter(m => m.oldWorks !== m.newWorks).length, assignedRecords: view.summary.assignedRecords, mappings, quantitySummary: view.resultRows.filter(row => row.assignedRecords).map(row => ({ id: row.id, categoryCode: row.categoryCode, name: row.name, actualQuantity: row.actualQuantity, excludedQuantityRecords: row.excludedQuantityRecords, assignedRecords: row.assignedRecords })) };
  fs.writeFileSync(path.join(directory, "categorization-preview.json"), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
  if (!process.argv.includes("--apply")) return;
  await prisma.$transaction(async (tx: any) => {
    const site = await tx.site.findUnique({ where: { id: siteId }, select: { organizationId: true, siteDiaryRecordsMap: true } });
    const analytics = await tx.analytics.findUnique({ where: { siteId }, select: { currentWeekProgress: true } });
    const records = await tx.sitediaryrecords.findMany({ where: { siteId, archivedAt: null }, orderBy: [{ Date: "asc" }, { id: "asc" }] });
    assert.equal(site.organizationId, organizationId);
    assert(isDeepStrictEqual(site.siteDiaryRecordsMap, config), "Work configuration changed; aborting");
    assert(isDeepStrictEqual(analytics.currentWeekProgress, before.analytics.currentWeekProgress), "Estimate changed; aborting");
    assert(isDeepStrictEqual(clean(records), before.records), "Records changed; aborting");
    for (const m of mappings) {
      const result = await tx.sitediaryrecords.updateMany({ where: { id: m.id, siteId, archivedAt: null, Works: m.oldWorks }, data: { Works: m.newWorks } });
      assert.equal(result.count, 1);
    }
    const changed = await tx.analytics.updateMany({ where: { siteId, currentWeekProgress: { equals: before.analytics.currentWeekProgress } }, data: { currentWeekProgress: root } });
    assert.equal(changed.count, 1);
    const after = await tx.sitediaryrecords.findMany({ where: { siteId, archivedAt: null }, orderBy: [{ Date: "asc" }, { id: "asc" }] });
    const expected = before.records.map((r: any) => ({ ...r, Works: mappings.find(m => m.id === r.id)!.newWorks }));
    assert(isDeepStrictEqual(clean(after), expected), "Unexpected change beyond Works");
    const saved = await tx.analytics.findUnique({ where: { siteId }, select: { currentWeekProgress: true } });
    assert(isDeepStrictEqual(saved.currentWeekProgress, root));
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 20000 });
  fs.writeFileSync(path.join(directory, "categorization-result.json"), JSON.stringify({ ...summary, verifiedAt: new Date().toISOString(), quantitiesCommentsPhotosAndBisUnchanged: true }, null, 2));
  console.log("Applied and verified: 10 local work names and Forma 2 links updated; all other record fields unchanged.");
}

main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
