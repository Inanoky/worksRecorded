import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { renderEvalReportHtml } from "@/lib/ai-evals/html-report";
import { normalizeEvalReport } from "@/lib/ai-evals/report-loader";
import {
  formatEvalSelectionSummary,
  selectEvalCases,
} from "./eval-case-selection";
import {
  reviewedDiaryCases,
  reviewedDiaryCorpus,
} from "./reviewed-diary-cases";
import {
  assertReviewedDiaryEnvironment,
  getReviewedDiaryModelSettings,
} from "./reviewed-diary-environment";
import { validateReviewedDiaryCase } from "./reviewed-diary-validators";

async function main() {
  const selection = selectEvalCases({ cases: reviewedDiaryCases });
  console.log("Pārskatīto dienasgrāmatas ierakstu/Forma2 eval kopa:");
  for (const line of formatEvalSelectionSummary(selection)) console.log(line);
  if (process.argv.includes("--dry-run") || process.argv.includes("--list")) {
    for (const evalCase of selection.selectedCases)
      console.log(
        `${evalCase.id}: ${evalCase.expectedRecords.length} sagaidāmie ieraksti; ${evalCase.sourceText.slice(0, 100)}`,
      );
    return;
  }
  const { siteId, userId } = assertReviewedDiaryEnvironment();
  const modelSettings = getReviewedDiaryModelSettings();
  const checkerSettings = getReviewedDiaryModelSettings("checker");
  console.log(
    `Extractor model: ${modelSettings.model ?? "default"}; reasoning: ${modelSettings.reasoningEffort ?? "medium"}`,
  );
  console.log(
    `Checker model: ${checkerSettings.model ?? "default"}; reasoning: ${checkerSettings.reasoningEffort ?? "medium"}`,
  );
  process.env.LANGCHAIN_TRACING_V2 = "false";
  process.env.LANGSMITH_TRACING = "false";
  const { executeReviewedDiaryCase } = await import(
    "./reviewed-diary-execution"
  );
  const runId = `reviewed-${new Date().toISOString().replace(/[:.]/g, "-")}`;
  const startedAt = new Date().toISOString();
  const results = [];
  for (const evalCase of selection.selectedCases) {
    const started = Date.now();
    try {
      const result = await executeReviewedDiaryCase(evalCase, {
        siteId,
        userId,
        runId,
      });
      const deterministic = validateReviewedDiaryCase(
        evalCase,
        result.rows,
        reviewedDiaryCorpus.project.positions,
      );
      if (!result.extractionSucceeded) {
        deterministic.results.push({
          name: "extraction-succeeded",
          status: "fail",
          severity: "critical",
          message: String(
            result.steps?.findLast((step) => step.phase === "failure")
              ?.reason ??
              result.extractionMessage ??
              "Extractor/checker neatgrieza droši saglabājamu rezultātu.",
          ),
        });
        deterministic.status = "fail";
        deterministic.criticalFailures += 1;
      }
      results.push({
        caseId: evalCase.id,
        turnIndex: 0,
        inputPreview: evalCase.sourceText,
        answer: JSON.stringify(result.rows),
        createdRecordIds: [],
        actualModel:
          result.metrics.modelCalls[0] &&
          "actualModel" in result.metrics.modelCalls[0]
            ? result.metrics.modelCalls[0].actualModel
            : null,
        requestedModel: result.metrics.modelCalls[0]?.model ?? null,
        latencyMs: Date.now() - started,
        deterministic,
        ...result.metrics,
        structuredSaveTrace: [
          {
            rawRecords: result.rawRows,
            mappedRows: result.rows,
            expectedRecords: evalCase.expectedRecords,
            persistedRecords: [],
            stages: result.steps ?? [],
          },
        ],
      });
      console.log(`[${deterministic.status.toUpperCase()}] ${evalCase.id}`);
    } catch (error) {
      results.push({
        caseId: evalCase.id,
        turnIndex: 0,
        inputPreview: evalCase.sourceText,
        answer: "",
        latencyMs: Date.now() - started,
        structuredSaveTrace: [
          {
            expectedRecords: evalCase.expectedRecords,
            mappedRows: [],
            persistedRecords: [],
          },
        ],
        deterministic: {
          status: "fail",
          results: [
            {
              name: "execution",
              status: "fail",
              severity: "critical",
              message:
                error instanceof Error ? error.message : "Execution failed",
            },
          ],
        },
      });
      console.log(`[FAIL] ${evalCase.id}`);
    }
  }
  const failures = results.filter(
    (result) => result.deterministic.status === "fail",
  ).length;
  const totalMs = results.reduce((sum, result) => sum + result.latencyMs, 0);
  const report = {
    runId,
    flow: "diary-reviewed",
    model:
      results.find((result) => "requestedModel" in result)?.requestedModel ??
      null,
    requestedModel:
      results.find((result) => "requestedModel" in result)?.requestedModel ??
      null,
    actualModels: [
      ...new Set(
        results.flatMap((result) =>
          "actualModel" in result && result.actualModel
            ? [result.actualModel]
            : [],
        ),
      ),
    ],
    startedAt,
    finishedAt: new Date().toISOString(),
    databaseWrites: false,
    extractorModelSettings: modelSettings,
    checkerModelSettings: checkerSettings,
    whatsappReplies: false,
    corpusProvenance: reviewedDiaryCorpus.provenance,
    summary: {
      cases: results.length,
      deterministicFailures: failures,
      deterministicCriticalFailures: failures,
    },
    latency: { totalMs, averageMs: totalMs / results.length },
    results,
  };
  const directoryIndex = process.argv.indexOf("--results-dir");
  if (directoryIndex >= 0 && !process.argv[directoryIndex + 1]) {
    throw new Error("--results-dir requires a value.");
  }
  const directory = path.resolve(
    directoryIndex >= 0
      ? process.argv[directoryIndex + 1]
      : path.join(process.cwd(), ".ai-eval-results"),
  );
  await mkdir(directory, { recursive: true });
  const file = path.join(directory, `diary-reviewed-${runId}.json`);
  await writeFile(file, JSON.stringify(report, null, 2));
  const html = renderEvalReportHtml(
    normalizeEvalReport(report, path.basename(file)),
  );
  const htmlFile = file.replace(/\.json$/, ".html");
  const latestHtmlFile = path.join(directory, "diary-reviewed-latest.html");
  await writeFile(htmlFile, html);
  await writeFile(latestHtmlFile, html);
  console.log(`Report: ${file}`);
  console.log(`HTML: ${htmlFile}`);
  console.log(`Latest HTML: ${latestHtmlFile}`);
  if (failures) process.exitCode = 1;
}
main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "Reviewed diary eval failed",
  );
  process.exitCode = 1;
});
