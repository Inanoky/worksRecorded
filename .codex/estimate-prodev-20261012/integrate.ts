import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { isDeepStrictEqual } from "node:util";
import { syncDefaultConstructionForma2WorkOptions } from "../../worksRecorded/flows/default-construction/lib/forma2-work-options-sync";
import {
  getDefaultConstructionForma2SourceByWork,
  getDefaultConstructionForma2WorkSyncManifest,
  normalizeForma2WorkOptionKey,
} from "../../worksRecorded/flows/default-construction/lib/forma2-work-options-manifest";
import {
  buildForma2AnalyticsView,
  createForma2PositionId,
  type Forma2Position,
  normalizeDefaultConstructionForma2State,
} from "../../worksRecorded/flows/default-construction/lib/forma2-analytics";
import { getDefaultConstructionProductivitySettings } from "../../worksRecorded/flows/default-construction/lib/site-diary-productivity-settings";

const directory = path.resolve("../.codex/estimate-prodev-20261012");
const requireApp = createRequire(path.resolve("package.json"));
requireApp("dotenv").config({ quiet: true });
const { PrismaClient, Prisma } = requireApp("@prisma/client");
const prisma = new PrismaClient();
const siteId = "c39cb04c-8ce5-477d-acd0-99586a82d850";
const organizationId = "17b1f970-a5bc-4cd5-a2a1-bf41ab554cb3";
const sourceFile = "g:/My Drive/worksRecorded/companies/ProDev/Technical Task/L6_BIS (02.10.-09.10. ).xlsx";
const expectedCounts = [19, 15, 8, 24, 27, 24, 4, 12, 53, 40, 24, 64];
const text = (value: unknown) => String(value ?? "").replace(/\s+/g, " ").trim();
const key = (value: unknown) => text(value).toLocaleLowerCase("lv");

function prepare(before: any, sheets: Array<{ name: string; values: unknown[][] }>) {
  const root = structuredClone(before.analytics.currentWeekProgress);
  const state = normalizeDefaultConstructionForma2State(root.defaultConstructionForma2);
  assert(state.document);
  const oldPositions = state.document.positions;
  const positions: Forma2Position[] = [];
  const sourceEntries: any[] = [];
  const preservedQuantityOverrides: any[] = [];
  const sheetSummary: any[] = [];
  const usedOldIds = new Set<string>();
  for (let number = 1; number <= 12; number += 1) {
    const sheet = sheets.find(s => s.name.toLowerCase() === `${number}a`);
    assert(sheet, `Missing sheet ${number}a`);
    const rows = sheet.values;
    assert.deepEqual(rows[11].slice(0, 5), ["Nr.p.k.", "Kods", "Darba nosaukums", "Mērvienība", "Daudzums"]);
    const categoryCode = `${number}A`;
    const existing = oldPositions.filter(p => key(p.categoryCode) === key(categoryCode));
    const categoryName = existing[0]?.categoryName ?? `${categoryCode} - ${text(rows[1][2])}`;
    let section = text(rows[1][2]);
    let count = 0;
    for (let index = 12; index < rows.length; index += 1) {
      const row = rows[index];
      if (/^Tiešās izmaksas kopā/i.test(text(row[0]))) break;
      const name = text(row[2]);
      const unit = text(row[3]);
      const quantity = row[4];
      if (name && !unit && quantity == null) { section = name; continue; }
      if (!name && !unit && quantity == null) continue;
      assert(name && unit && typeof quantity === "number" && Number.isFinite(quantity) && quantity >= 0, `Incomplete position ${sheet.name}!${index + 1}`);
      const matches = existing.filter(p => key(p.name) === key(name.slice(0, 500)) && key(p.unit) === key(unit));
      const old = matches.find(p => !usedOldIds.has(p.id));
      if (existing.length) assert(old, `Cannot preserve existing position ${sheet.name}!${index + 1}`);
      const code = typeof row[0] === "number" ? String(row[0]) : "Papildarbs";
      const position: Forma2Position = old ? structuredClone(old) : {
        id: `${sheet.name}:${createForma2PositionId({ kind: "work", code, name, sourceRow: index + 1 })}`,
        code,
        categoryCode,
        categoryName,
        name,
        kind: "work",
        parentId: null,
        sourceRow: index + 1,
        unit,
        plannedQuantity: quantity,
        laborNormHoursPerUnit: null,
        hourlyRate: null,
        plannedWorkCost: 0,
        plannedMaterialCost: 0,
        plannedMechanismCost: 0,
        plannedTotalCost: 0,
      };
      assert(position.name.length <= 500 && position.id.length <= 180);
      if (old) {
        usedOldIds.add(old.id);
        if (old.plannedQuantity !== quantity) preservedQuantityOverrides.push({ positionId: old.id, sheet: sheet.name, sourceRow: index + 1, sourceQuantity: quantity, retainedQuantity: old.plannedQuantity });
      }
      positions.push(position);
      sourceEntries.push({ positionId: position.id, sheet: sheet.name, row: index + 1, section, originalNumber: row[0] ?? null, sourceCode: row[1] ?? null, name, unit, sourceQuantity: quantity, notes: row.slice(5).map((value, i) => ({ column: i + 6, text: text(value) })).filter(note => note.text) });
      count += 1;
    }
    assert.equal(count, expectedCounts[number - 1], `Wrong count in ${sheet.name}`);
    assert.equal(existing.length, existing.length ? count : 0);
    sheetSummary.push({ sheet: sheet.name, title: text(rows[1][2]), positions: count, preserved: existing.length, added: count - existing.length });
  }
  assert.equal(positions.length, 314);
  assert.equal(usedOldIds.size, oldPositions.length);
  assert.equal(new Set(positions.map(p => p.id)).size, positions.length);
  const document = { ...state.document, fileName: path.basename(sourceFile), sheetName: "1a–12a", positions };
  const nextState = { ...state, document };
  root.defaultConstructionForma2 = nextState;
  root.estimateImportSource = { version: 1, fileName: document.fileName, sha256: createHash("sha256").update(fs.readFileSync(sourceFile)).digest("hex"), importedAt: new Date().toISOString(), sheets: sheetSummary, entries: sourceEntries, preservedQuantityOverrides };
  const sync = syncDefaultConstructionForma2WorkOptions({ config: before.site.siteDiaryRecordsMap, documentId: document.id, positions });
  assert.equal(sync.removedWorks, 0);
  const manifest = getDefaultConstructionForma2WorkSyncManifest(sync.config);
  assert.equal(manifest?.entries.length, 314);
  assert.equal(new Set(manifest?.entries.map(entry => normalizeForma2WorkOptionKey(entry.work))).size, 314);
  const links = getDefaultConstructionForma2SourceByWork(sync.config);
  const oldManifest = getDefaultConstructionForma2WorkSyncManifest(before.site.siteDiaryRecordsMap);
  for (const old of oldManifest?.entries ?? []) assert.equal(links.get(normalizeForma2WorkOptionKey(old.work))?.positionId, old.positionId);
  const rates = getDefaultConstructionProductivitySettings(sync.config).works;
  const oldRates = getDefaultConstructionProductivitySettings(before.site.siteDiaryRecordsMap).works;
  for (const old of oldRates) assert.deepEqual(rates.find(rate => rate.work === old.work), old);
  for (const position of positions) {
    const entry = manifest?.entries.find(entry => entry.positionId === position.id);
    assert(entry);
    const rate = rates.find(rate => rate.work === entry.work);
    assert(rate && rate.unit === position.unit);
  }
  assert.deepEqual(nextState.allocations, state.allocations);
  assert.deepEqual(nextState.materialRules, state.materialRules);
  for (const old of oldPositions) assert.deepEqual(positions.find(p => p.id === old.id), old);
  for (const position of positions.filter(p => !usedOldIds.has(p.id))) {
    const entry = manifest!.entries.find(entry => entry.positionId === position.id)!;
    const view = buildForma2AnalyticsView({ positions, allocations: [], sources: [{ id: "test", type: "work", label: entry.work, selectedPositionId: links.get(normalizeForma2WorkOptionKey(entry.work))!.positionId, secondaryLabel: "", date: null, unit: position.unit, quantity: 1, reportedQuantity: 1, hours: null, actualCost: null }] });
    assert.equal(view.resultRows.find(p => p.id === position.id)?.actualQuantity, 1);
  }
  return { root, config: sync.config, summary: { siteId, siteName: before.site.name, positions: positions.length, preservedPositions: usedOldIds.size, addedPositions: positions.length - usedOldIds.size, importedRateLinks: manifest!.entries.length, rateOptions: rates.length, preservedAllocations: state.allocations.length, preservedQuantityOverrides, sheetSummary } };
}

async function main() {
  const before = JSON.parse(fs.readFileSync(path.join(directory, "before.json"), "utf8"));
  const sheets = JSON.parse(fs.readFileSync(path.join(directory, "sheets.json"), "utf8"));
  assert.equal(before.site.organizationId, organizationId);
  assert.equal(before.site.id, siteId);
  const result = prepare(before, sheets);
  fs.writeFileSync(path.join(directory, "preview.json"), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result.summary, null, 2));
  if (!process.argv.includes("--apply")) return;
  await prisma.$transaction(async (tx: any) => {
    const site = await tx.site.findUnique({ where: { id: siteId }, select: { organizationId: true, siteDiaryRecordsMap: true } });
    const analytics = await tx.analytics.findUnique({ where: { siteId } });
    assert(site && site.organizationId === organizationId);
    assert(isDeepStrictEqual(site.siteDiaryRecordsMap, before.site.siteDiaryRecordsMap), "Rates changed since preview; aborting");
    assert(isDeepStrictEqual(analytics?.currentWeekProgress, before.analytics.currentWeekProgress), "Forma 2 changed since preview; aborting");
    const siteChange = await tx.site.updateMany({ where: { id: siteId, organizationId, siteDiaryRecordsMap: { equals: before.site.siteDiaryRecordsMap } }, data: { siteDiaryRecordsMap: result.config } });
    assert.equal(siteChange.count, 1);
    const estimateChange = await tx.analytics.updateMany({ where: { siteId, currentWeekProgress: { equals: before.analytics.currentWeekProgress } }, data: { currentWeekProgress: result.root } });
    assert.equal(estimateChange.count, 1);
    const savedSite = await tx.site.findUnique({ where: { id: siteId }, select: { siteDiaryRecordsMap: true } });
    const savedAnalytics = await tx.analytics.findUnique({ where: { siteId }, select: { currentWeekProgress: true } });
    assert(isDeepStrictEqual(savedSite.siteDiaryRecordsMap, result.config));
    assert(isDeepStrictEqual(savedAnalytics.currentWeekProgress, result.root));
    console.log("Imported and read back successfully");
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 20000 });
  const records = await prisma.sitediaryrecords.findMany({ where: { siteId }, select: { id: true, Works: true, Units: true, Amounts: true } });
  assert.deepEqual(records.sort((a: any,b: any) => a.id.localeCompare(b.id)), before.records.sort((a: any,b: any) => a.id.localeCompare(b.id)));
  fs.writeFileSync(path.join(directory, "result.json"), JSON.stringify({ ...result.summary, verifiedAt: new Date().toISOString(), diaryRecordsUnchanged: records.length }, null, 2));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
