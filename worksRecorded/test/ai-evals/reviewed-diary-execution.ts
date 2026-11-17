import OpenAI from "openai";
import { automaticallyAssignForma2Sources } from "@/flows/default-construction/backend/forma2-auto-assignment";
import { getCurrentForma2WorkSelections } from "@/flows/default-construction/backend/forma2-data-read";
import type { ConfigMap } from "@/flows/default-construction/backend/site-manager-agent/AIschemas";
import {
  getSiteManagerMetricsSnapshot,
  runWithSiteManagerAgentEvalContext,
} from "@/flows/default-construction/backend/site-manager-agent/runContext";
import { extractAndSaveSiteDiary } from "@/flows/default-construction/backend/site-manager-agent/tools";
import type {
  DefaultConstructionForma2State,
  Forma2ActualSource,
  Forma2Position,
} from "@/flows/default-construction/lib/forma2-analytics";
import { normalizeForma2WorkOptionKey } from "@/flows/default-construction/lib/forma2-work-options-manifest";
import { runWithSiteManagerToolContext } from "@/server/ai-flows/agents/whatsapp-agent/SiteManagerAgentForSiteManagerRoute/siteDiaryToolContext";
import { runWithWhatsappSourceContext } from "@/server/ai-flows/agents/whatsapp-agent/whatsappSourceContext";
import {
  type ReviewedDiaryCase,
  reviewedDiaryCorpus,
} from "./reviewed-diary-cases";
import { getReviewedDiaryModelSettings } from "./reviewed-diary-environment";
import type { ReviewedDiaryActualRow } from "./reviewed-diary-validators";

const text = (value: unknown) =>
  value == null || value === "" ? null : String(value);
const number = (value: unknown) =>
  value == null || value === ""
    ? null
    : Number.isFinite(Number(value))
      ? Number(value)
      : null;
const date = (value: unknown) => {
  if (!value) return null;
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime())
    ? null
    : parsed.toISOString().slice(0, 10);
};
export async function executeReviewedDiaryCase(
  evalCase: ReviewedDiaryCase,
  scope: { siteId: string; userId: string; runId: string },
) {
  const steps: Record<string, unknown>[] = [];
  const positions: Forma2Position[] = reviewedDiaryCorpus.project.positions.map(
    (position) => ({
      ...position,
      plannedQuantity: null,
      laborNormHoursPerUnit: null,
      hourlyRate: null,
      plannedWorkCost: 0,
      plannedMaterialCost: 0,
      plannedMechanismCost: 0,
      plannedTotalCost: 0,
    }),
  );
  const config = structuredClone(
    reviewedDiaryCorpus.project.config,
  ) as ConfigMap;
  const state: DefaultConstructionForma2State = {
    version: 1,
    document: {
      id: reviewedDiaryCorpus.project.documentId,
      fileName: "reviewed-eval-catalog",
      sheetName: "Forma2",
      importedAt: "2026-11-16T00:00:00.000Z",
      positions,
    },
    allocations: [],
    materialRules: [],
  };
  const selections = getCurrentForma2WorkSelections(config, state);
  const unitContext = positions
    .filter((position) => position.kind === "work")
    .map(
      (position) =>
        `${position.code} ${position.categoryName} ${position.name}: ${position.unit}`,
    )
    .join("\n");
  const [year, month, day] = evalCase.receivedDateISO.split("-");
  const run = await runWithSiteManagerAgentEvalContext(
    {
      evalRecordMetadata: {
        isEval: true,
        flow: "diary-reviewed",
        caseId: evalCase.id,
        runId: scope.runId,
      },
    },
    async () => {
      const extraction = await runWithSiteManagerToolContext(
        {
          siteId: scope.siteId,
          userId: scope.userId,
          originalUserComment: evalCase.sourceText,
          originalMessage: evalCase.sourceText,
        },
        () =>
          runWithWhatsappSourceContext(
            {
              messageId: `eval:reviewed:${scope.runId}:${evalCase.id}`,
              messageType: "text",
            },
            () =>
              extractAndSaveSiteDiary({
                question: evalCase.sourceText,
                requestedDate: `${day}-${month}-${year}`,
                persist: false,
                validateBeforeReturning: true,
                allowFallback: false,
                evaluationContext: {
                  ...getReviewedDiaryModelSettings(),
                  checkerModel: getReviewedDiaryModelSettings("checker"),
                  onStep: (step) =>
                    steps.push(JSON.parse(JSON.stringify(step))),
                  config,
                  language: "lv",
                  extractionContext: {
                    text: `Projekta Forma2 darbu mērvienības:\n${unitContext}\nNav iepriekšējo ziņu vai izlaboto atbilžu piemēru. Iepriekšējās atbildes nav šīs atskaites faktu avots.`,
                    metadata: {
                      recentRecordCount: 0,
                      hasExplicitContextReference: false,
                      schemaOptionCount: selections.workOptions.length,
                      truncated: false,
                    },
                  },
                },
              }),
          ),
      );
      return { extraction, metrics: getSiteManagerMetricsSnapshot() };
    },
  );
  const rawRows = run.result.extraction.rows ?? [];
  const sources: Forma2ActualSource[] = rawRows.map((row, index) => ({
    id: `output-${index + 1}`,
    type: "work",
    label: String(row.Works ?? ""),
    secondaryLabel: String(row.Location ?? ""),
    unit: String(row.Units ?? ""),
    date: date(row.Date),
    quantity: number(row.Amounts),
    hours: number(row.TimeInvolved),
    actualCost: null,
    selectedPositionId:
      selections.positionByWorkKey.get(
        normalizeForma2WorkOptionKey(row.Works),
      ) ?? null,
  }));
  const matcherCalls: Array<{
    model: string;
    durationMs: number;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  }> = [];
  const client = new OpenAI({ maxRetries: 0 });
  const matcherClient = {
    responses: {
      parse: async (...args: Parameters<typeof client.responses.parse>) => {
        const started = Date.now();
        const response = await client.responses.parse(...args);
        matcherCalls.push({
          model: response.model,
          durationMs: Date.now() - started,
          inputTokens: response.usage?.input_tokens ?? 0,
          outputTokens: response.usage?.output_tokens ?? 0,
          totalTokens: response.usage?.total_tokens ?? 0,
        });
        return response;
      },
    },
  } as OpenAI;
  const allocations = run.result.extraction.ok
    ? await automaticallyAssignForma2Sources({
        sources,
        positions,
        existingAllocations: [],
        openai: matcherClient,
      })
    : [];
  const rows: ReviewedDiaryActualRow[] = sources.map((source, index) => ({
    id: source.id,
    dateISO: source.date,
    work: text(rawRows[index].Works),
    location: text(rawRows[index].Location),
    comment: text(rawRows[index].Comments),
    amount: source.quantity,
    unit: text(rawRows[index].Units),
    workers: number(rawRows[index].WorkersInvolved),
    hours: source.hours,
    forma2PositionId:
      source.selectedPositionId ??
      allocations.find((allocation) => allocation.sourceId === source.id)
        ?.positionId ??
      null,
  }));
  const metrics = run.result.metrics;
  return {
    rows,
    rawRows,
    extractionSucceeded: run.result.extraction.ok,
    extractionMessage: run.result.extraction.content,
    steps,
    metrics: {
      ...metrics,
      modelCalls: [...metrics.modelCalls, ...matcherCalls],
      aggregateTokenUsage: matcherCalls.reduce(
        (total, call) => ({
          inputTokens: total.inputTokens + call.inputTokens,
          outputTokens: total.outputTokens + call.outputTokens,
          totalTokens: total.totalTokens + call.totalTokens,
        }),
        metrics.aggregateTokenUsage,
      ),
    },
  };
}
