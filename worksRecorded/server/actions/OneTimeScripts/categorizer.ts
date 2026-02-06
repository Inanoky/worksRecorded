// server/actions/OneTimeScripts/categorizer.ts
import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import OpenAI from "openai";

const prisma = new PrismaClient();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const siteIdToAnalyze = "97e7fec4-3b34-4dd5-839f-fcd56072a2ee";
const BATCH_SIZE = 50;

type CostCodes = Record<string, string>;

function ordinalBatchLabel(i: number) {
  const n = i + 1;
  const suffix =
    n % 100 >= 11 && n % 100 <= 13
      ? "th"
      : n % 10 === 1
      ? "st"
      : n % 10 === 2
      ? "nd"
      : n % 10 === 3
      ? "rd"
      : "th";
  return `${n}${suffix}`;
}

function loadCostCodes(): CostCodes {
  const filePath = path.join(__dirname, "CostCodes.json");
  const raw = fs.readFileSync(filePath, "utf8");
  const parsed = JSON.parse(raw);
  return parsed as CostCodes;
}

function buildAllowedCodesText(costCodes: CostCodes) {
  return Object.entries(costCodes)
    .map(([code, rule]) => `- ${code}: ${rule}`)
    .join("\n");
}

function normalizeCode(code: string) {
  return code.trim();
}

async function categorizeBatch(
  costCodes: CostCodes,
  batch: Array<{
    id: string;
    item: string | null;
    itemDescription: string | null;
    commentsForUser: string | null;
    sellerName: string | null;
    invoiceNumber: string | null;
    unitOfMeasure: string | null;
    quantity: number | null;
    pricePerUnitOfMeasure: number | null;
    sum: number | null;
    currency: string | null;
  }>
): Promise<Record<string, string>> {
  const allowedCodes = Object.keys(costCodes);

  const system = `
You are categorizing construction invoice line items into a fixed set of cost codes.
You MUST choose exactly one code from the allowed list for each item.

Return ONLY valid JSON (no markdown).
JSON shape:
{
  "results": [
    { "id": "<invoiceItemId>", "category": "<exact cost code key from allowed list>" }
  ]
}

Rules:
- category MUST match one of the allowed codes EXACTLY.
- If uncertain, choose: "M600 - Other assembly cost".
- Do not invent codes.
`.trim();

  const user = `
Allowed cost codes and rules:
${buildAllowedCodesText(costCodes)}

Items to categorize:
${JSON.stringify(batch, null, 2)}
`.trim();

  const resp = await openai.chat.completions.create({
    model: "gpt-5.1",
    temperature: 0,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    response_format: { type: "json_object" },
  });

  const content = resp.choices[0]?.message?.content;
  if (!content) throw new Error("Empty OpenAI response.");

  const parsed = JSON.parse(content);
  if (!parsed?.results || !Array.isArray(parsed.results)) {
    throw new Error(`Unexpected JSON shape: ${content}`);
  }

  const idToCategory: Record<string, string> = {};
  for (const r of parsed.results) {
    const id = String(r?.id ?? "").trim();
    const cat = String(r?.category ?? "").trim();
    if (!id) continue;

    const normalized = normalizeCode(cat);
    idToCategory[id] = allowedCodes.includes(normalized)
      ? normalized
      : "M600 - Other assembly cost";
  }

  for (const item of batch) {
    if (!idToCategory[item.id]) {
      idToCategory[item.id] = "M600 - Other assembly cost";
    }
  }

  return idToCategory;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function processBatchByIds(
  batchIndex: number,
  totalBatches: number,
  ids: string[],
  costCodes: CostCodes
): Promise<{ batchIndex: number; updated: number }> {
  console.log(
    `processing ${ordinalBatchLabel(batchIndex)} batch out of ${totalBatches} batches...`
  );

  const batch = await prisma.invoiceItems.findMany({
    where: { id: { in: ids }, siteId: siteIdToAnalyze },
    select: {
      id: true,
      item: true,
      itemDescription: true,
      commentsForUser: true,
      sellerName: true,
      invoiceNumber: true,
      unitOfMeasure: true,
      quantity: true,
      pricePerUnitOfMeasure: true,
      sum: true,
      currency: true,
    },
    orderBy: { id: "asc" },
  });

  const idToCategory = await categorizeBatch(costCodes, batch);

  // ✅ updateMany prevents P2025 (updates 0 rows if missing)
  const updates = await Promise.all(
    Object.entries(idToCategory).map(([id, category]) =>
      prisma.invoiceItems.updateMany({
        where: { id },
        data: { category },
      })
    )
  );

  const updated = updates.reduce((acc, u) => acc + u.count, 0);
  return { batchIndex, updated };
}

async function main() {
  if (!process.env.OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY");

  const costCodes = loadCostCodes();

  // ✅ get stable snapshot of ids first
  const all = await prisma.invoiceItems.findMany({
    where: { siteId: siteIdToAnalyze },
    select: { id: true },
    orderBy: { id: "asc" },
  });

  const ids = all.map((x) => x.id);
  const total = ids.length;

  if (!total) {
    console.log("No InvoiceItems found for this site.");
    return;
  }

  const idBatches = chunk(ids, BATCH_SIZE);
  const totalBatches = idBatches.length;

  console.log(
    `Found ${total} InvoiceItems for siteId=${siteIdToAnalyze}. Batch size=${BATCH_SIZE}. Total batches=${totalBatches}.`
  );

  const promises = idBatches.map((batchIds, i) =>
    processBatchByIds(i, totalBatches, batchIds, costCodes)
  );

  const results = await Promise.allSettled(promises);

  let processed = 0;
  let failed = 0;

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (r.status === "fulfilled") {
      processed += r.value.updated;
      console.log(
        `batch ${ordinalBatchLabel(i)} done. updated ${r.value.updated}. total updated: ${processed}/${total}`
      );
    } else {
      failed++;
      console.error(`batch ${ordinalBatchLabel(i)} FAILED:`, r.reason);
    }
  }

  console.log(`DONE. updated=${processed}/${total}, failedBatches=${failed}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
