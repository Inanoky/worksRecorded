import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import OpenAI from "openai";

import { prisma } from "@/lib/utils/db";
import { siteManagerAgentForSiteManagerRouteModelModel } from "@/server/ai-flows/ai-models-settings";
import { runWithSiteManagerAgentEvalContext } from "@/server/ai-flows/agents/whatsapp-agent/SiteManagerAgentForSiteManagerRoute/agent";
import {
  runWithStructuredSaveTrace,
  type StructuredSaveTraceEntry,
} from "@/server/ai-flows/agents/whatsapp-agent/SiteManagerAgentForSiteManagerRoute/structuredSaveTrace";
import {
  whatsappSiteManagerEvalCases,
  type WhatsAppSiteManagerEvalCase,
} from "./whatsapp-site-manager-cases";
import {
  type SavedSiteDiaryRecord,
  type WhatsAppTurnValidationResult,
  validateWhatsappSiteManagerRecord,
} from "./whatsapp-site-manager-validators";
import {
  getPersistedEvalRecordsFromTrace,
  selectNewestEvalRecord,
  selectRecordsForWhatsappEval,
} from "./whatsapp-site-manager-runner-utils";

type JudgeStatus = "pass" | "warn" | "fail" | "skipped";

type JudgeResult = {
  status: JudgeStatus;
  explanation: string;
  improvements: string[];
};

type CaseRunResult = {
  caseId: string;
  webhookMessageId: string;
  inputPreview: string;
  createdRecordIds: string[];
  selectedRecord: SavedSiteDiaryRecord | null;
  answer: string;
  requestedModel: string;
  actualModel: string | null;
  tokenUsage: unknown;
  finishReason: string | null;
  structuredSaveTrace: StructuredSaveTraceEntry[];
  deterministic: WhatsAppTurnValidationResult;
  judge: JudgeResult;
  latencyMs: number;
  threadId: string;
};

type LatencyCaseSummary = {
  caseId: string;
  latencyMs: number;
  threadId: string;
};

type WhatsAppSiteManagerEvalReport = {
  runId: string;
  flow: "whatsapp-site-manager";
  model: string;
  requestedModel: string;
  actualModels: string[];
  judgeModel: string | null;
  siteId: string;
  userId: string;
  startedAt: string;
  finishedAt: string;
  results: CaseRunResult[];
  latency: {
    slowThresholdMs: number;
    totalMs: number;
    averageMs: number;
    slowestCase: LatencyCaseSummary | null;
    casesOverThreshold: LatencyCaseSummary[];
  };
  summary: {
    cases: number;
    deterministicFailures: number;
    heuristicWarnings: number;
    heuristicFailures: number;
    judgeWarnings: number;
    judgeFailures: number;
  };
};

const GRAPH_API_PREFIX = "https://graph.facebook.com/";

const JudgeSchema = {
  parse(value: unknown): JudgeResult {
    const item = value as Partial<JudgeResult>;
    if (item.status === "pass" || item.status === "warn" || item.status === "fail") {
      return {
        status: item.status,
        explanation: String(item.explanation ?? ""),
        improvements: Array.isArray(item.improvements)
          ? item.improvements.filter((improvement) => typeof improvement === "string")
          : [],
      };
    }
    return {
      status: "warn",
      explanation: "Judge returned an unrecognized status.",
      improvements: [],
    };
  },
};

function hasArg(name: string) {
  return process.argv.includes(name);
}

function getRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required for real AI eval runs.`);
  }
  return value;
}

function preview(value: string, maxLength = 220) {
  const compact = value.replace(/\s+/g, " ").trim();
  return compact.length <= maxLength ? compact : `${compact.slice(0, maxLength)}...`;
}

function createRunId() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function getSlowThresholdMs() {
  const rawValue = process.env.AI_EVAL_SLOW_TURN_MS;
  if (!rawValue) return 15000;

  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error("AI_EVAL_SLOW_TURN_MS must be a positive number of milliseconds.");
  }

  return parsed;
}

function summarizeLatency(results: CaseRunResult[], slowThresholdMs: number) {
  const cases = results.map((item) => ({
    caseId: item.caseId,
    latencyMs: item.latencyMs,
    threadId: item.threadId,
  }));
  const totalMs = cases.reduce((total, item) => total + item.latencyMs, 0);
  const slowestCase =
    cases.length > 0
      ? cases.reduce((slowest, item) => (item.latencyMs > slowest.latencyMs ? item : slowest))
      : null;

  return {
    slowThresholdMs,
    totalMs,
    averageMs: cases.length > 0 ? Math.round(totalMs / cases.length) : 0,
    slowestCase,
    casesOverThreshold: cases.filter((item) => item.latencyMs >= slowThresholdMs),
  };
}

function parseJudgeJson(value: string): JudgeResult {
  try {
    return JudgeSchema.parse(JSON.parse(value));
  } catch {
    return {
      status: "warn",
      explanation: `Judge response was not valid JSON: ${preview(value, 300)}`,
      improvements: [],
    };
  }
}

function cloneWebhook(value: Record<string, unknown>) {
  return JSON.parse(JSON.stringify(value));
}

function firstMessage(payload: any) {
  return payload?.entry?.[0]?.changes?.[0]?.value?.messages?.[0] ?? null;
}

function firstValue(payload: any) {
  return payload?.entry?.[0]?.changes?.[0]?.value ?? null;
}

function textFromWebhook(payload: any) {
  const message = firstMessage(payload);
  return String(message?.text?.body ?? message?.image?.caption ?? "");
}

function prepareWebhookPayload(args: {
  evalCase: WhatsAppSiteManagerEvalCase;
  runId: string;
  businessPhoneNumberId: string;
  senderPhone: string;
  bsuid: string;
}) {
  const payload = cloneWebhook(args.evalCase.webhook);
  const value = firstValue(payload);
  const message = firstMessage(payload);
  const messageId = `wamid.eval.${args.runId}.${args.evalCase.id}`;

  if (!value || !message) {
    throw new Error(`Invalid WhatsApp eval webhook fixture for ${args.evalCase.id}.`);
  }

  value.metadata = {
    ...(value.metadata ?? {}),
    phone_number_id: args.businessPhoneNumberId,
  };
  value.contacts = [
    {
      ...(value.contacts?.[0] ?? {}),
      wa_id: args.senderPhone,
      user_id: args.bsuid,
    },
  ];
  message.from = args.senderPhone;
  message.from_user_id = args.bsuid;
  message.id = messageId;

  return {
    payload,
    messageId,
    inputText: textFromWebhook(payload),
  };
}

function installGraphApiFetchMock() {
  const originalFetch = global.fetch;

  global.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();
    if (url.startsWith(GRAPH_API_PREFIX)) {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!originalFetch) {
      throw new Error(`No fetch implementation available for ${url}.`);
    }

    return originalFetch(input, init);
  }) as typeof fetch;

  return () => {
    global.fetch = originalFetch;
  };
}

async function assertEvalPreconditions(args: { siteId: string; userId: string }) {
  const [user, settings] = await Promise.all([
    prisma.user.findUnique({
      where: { id: args.userId },
      select: {
        id: true,
        lastSelectedSiteIdforWhatsapp: true,
      },
    }),
    prisma.sitediarysettings.findUnique({
      where: { siteId: args.siteId },
      select: {
        id: true,
        schema: true,
      },
    }),
  ]);

  if (!user) {
    throw new Error(`AI_EVAL_USER_ID ${args.userId} was not found.`);
  }

  if (user.lastSelectedSiteIdforWhatsapp !== args.siteId) {
    throw new Error(
      `Eval user lastSelectedSiteIdforWhatsapp must be ${args.siteId}; got ${user.lastSelectedSiteIdforWhatsapp ?? "null"}.`,
    );
  }

  if (!settings?.schema) {
    throw new Error(`AI_EVAL_SITE_ID ${args.siteId} must have a site diary settings schema.`);
  }
}

async function seedEvalIdentity(args: {
  userId: string;
  businessPhoneNumberId: string;
  senderPhone: string;
  bsuid: string;
}) {
  const prismaAny = prisma as any;
  if (!prismaAny.whatsAppIdentity) {
    throw new Error("Prisma client does not expose whatsAppIdentity.");
  }

  await prismaAny.whatsAppIdentity.create({
    data: {
      provider: "meta",
      phone: args.senderPhone,
      waId: args.senderPhone,
      bsuid: args.bsuid,
      businessPhoneNumberId: args.businessPhoneNumberId,
      status: "active",
      userId: args.userId,
    },
  });
}

async function findCreatedRecords(args: {
  siteId: string;
  userId: string;
  startedAt: Date;
  inputText: string;
  runId: string;
  caseId: string;
}) {
  return prisma.sitediaryrecords.findMany({
    where: {
      siteId: args.siteId,
      userId: args.userId,
      createdAt: { gte: args.startedAt },
      OR: [
        {
          AND: [
            { evalMetadata: { path: ["isEval"], equals: true } },
            { evalMetadata: { path: ["flow"], equals: "whatsapp-site-manager" } },
            { evalMetadata: { path: ["runId"], equals: args.runId } },
            { evalMetadata: { path: ["caseId"], equals: args.caseId } },
          ],
        },
        {
          originalUserComment: {
            contains: args.inputText,
          },
        },
      ],
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      siteId: true,
      userId: true,
      workerId: true,
      Location: true,
      Works: true,
      Comments: true,
      originalUserComment: true,
      originalAudioUrl: true,
      WorkersInvolved: true,
      TimeInvolved: true,
      evalMetadata: true,
      createdAt: true,
    },
  });
}

async function cleanupPreviousEvalCaseRows(args: {
  siteId: string;
  userId: string;
  inputText: string;
  caseId: string;
}) {
  await prisma.sitediaryrecords.deleteMany({
    where: {
      siteId: args.siteId,
      userId: args.userId,
      AND: [
        { evalMetadata: { path: ["isEval"], equals: true } },
        { evalMetadata: { path: ["flow"], equals: "whatsapp-site-manager" } },
        { evalMetadata: { path: ["caseId"], equals: args.caseId } },
      ],
    },
  });

  await prisma.sitediaryrecords.deleteMany({
    where: {
      siteId: args.siteId,
      userId: args.userId,
      originalUserComment: {
        contains: args.inputText,
      },
    },
  });
}

async function cleanupEvalRows(args: {
  businessPhoneNumberId: string;
  recordIds: string[];
  runId: string;
  caseId: string;
}) {
  const prismaAny = prisma as any;
  await prisma.sitediaryrecords.deleteMany({
    where: {
      AND: [
        { evalMetadata: { path: ["isEval"], equals: true } },
        { evalMetadata: { path: ["flow"], equals: "whatsapp-site-manager" } },
        { evalMetadata: { path: ["runId"], equals: args.runId } },
        { evalMetadata: { path: ["caseId"], equals: args.caseId } },
      ],
    },
  });
  await prisma.sitediaryrecords.deleteMany({
    where: {
      id: { in: args.recordIds },
    },
  });
  if (prismaAny.whatsAppIdentity) {
    await prismaAny.whatsAppIdentity.deleteMany({
      where: {
        businessPhoneNumberId: args.businessPhoneNumberId,
      },
    });
  }
}

async function judgeRecord(args: {
  client: OpenAI;
  model: string;
  evalCase: WhatsAppSiteManagerEvalCase;
  inputText: string;
  record: SavedSiteDiaryRecord | null;
  deterministic: WhatsAppTurnValidationResult;
}): Promise<JudgeResult> {
  const response = await (args.client.responses.create as any)({
    model: args.model,
    input: [
      {
        role: "system",
        content:
          'You judge regression-test saved records for a construction SaaS WhatsApp site-manager assistant. Return strict JSON shaped as {"status":"pass"|"warn"|"fail","explanation":"...","improvements":["..."]}. Keep improvements advisory and concise. Use an empty improvements array when no useful improvement is needed. Fail fabricated details, wrong quantities, missing core facts, or unsafe persistence behavior.',
      },
      {
        role: "user",
        content: JSON.stringify({
          caseId: args.evalCase.id,
          intent: args.evalCase.intent,
          inputText: args.inputText,
          savedRecord: args.record,
          deterministicStatus: args.deterministic.status,
          deterministicResults: args.deterministic.results,
          heuristic: args.deterministic.heuristic,
        }),
      },
    ],
    text: {
      format: {
        type: "json_object",
      },
    },
  });

  return parseJudgeJson(String(response.output_text ?? ""));
}

async function main() {
  const dryRun = hasArg("--dry-run");
  const enableJudge = hasArg("--judge") || process.env.AI_EVAL_ENABLE_JUDGE === "true";

  if (dryRun) {
    console.log(`Loaded ${whatsappSiteManagerEvalCases.length} WhatsApp site-manager eval cases.`);
    return;
  }

  if (process.env.RUN_AI_EVALS !== "true") {
    throw new Error("Set RUN_AI_EVALS=true to run real AI evals.");
  }

  const siteId = getRequiredEnv("AI_EVAL_SITE_ID");
  const userId = getRequiredEnv("AI_EVAL_USER_ID");
  getRequiredEnv("OPENAI_API_KEY");
  getRequiredEnv("DATABASE_URL");
  process.env.META_ACCESS_TOKEN ||= "eval-meta-token";
  process.env.WEBHOOK_VERIFY_TOKEN ||= "eval-webhook-token";

  await assertEvalPreconditions({ siteId, userId });

  const runId = createRunId();
  const agentModel = process.env.AI_EVAL_AGENT_MODEL ?? siteManagerAgentForSiteManagerRouteModelModel;
  const slowThresholdMs = getSlowThresholdMs();
  const judgeModel = enableJudge ? process.env.AI_EVAL_JUDGE_MODEL ?? "gpt-4.1-mini" : null;
  const judgeClient = enableJudge ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
  const senderPhone = process.env.AI_EVAL_WHATSAPP_PHONE ?? "37129391891";
  const businessPhoneNumberId = `eval-business-phone-${runId}`;
  const restoreFetch = installGraphApiFetchMock();
  const { POST } = await import("@/app/api/webhook/meta/webhook/route");

  const startedAt = new Date().toISOString();
  const results: CaseRunResult[] = [];

  try {
    for (const evalCase of whatsappSiteManagerEvalCases) {
      const bsuid = `LV.eval.${runId}.${evalCase.id}`;
      const threadId = `eval:whatsapp-site-manager:${siteId}:${evalCase.id}:${runId}`;
      let createdRecordIds: string[] = [];
      const prepared = prepareWebhookPayload({
        evalCase,
        runId,
        businessPhoneNumberId,
        senderPhone,
        bsuid,
      });
      const evalTraceMetadata = {
        evalRunId: runId,
        evalCaseId: evalCase.id,
        evalMode: "real-meta-webhook-regression",
        webhookMessageId: prepared.messageId,
      };
      const evalTraceTags = [
        "eval",
        "eval:whatsapp-site-manager",
        `eval-run:${runId}`,
        `eval-case:${evalCase.id}`,
      ];
      const evalRecordMetadata = {
        isEval: true,
        flow: "whatsapp-site-manager",
        runId,
        caseId: evalCase.id,
        messageId: prepared.messageId,
        createdBy: "ai-eval-runner",
      };

      try {
        await cleanupPreviousEvalCaseRows({
          siteId,
          userId,
          inputText: prepared.inputText,
          caseId: evalCase.id,
        });

        await seedEvalIdentity({
          userId,
          businessPhoneNumberId,
          senderPhone,
          bsuid,
        });

        const started = Date.now();
        const caseStartedAt = new Date();
        const tracedRun = await runWithStructuredSaveTrace(() =>
          runWithSiteManagerAgentEvalContext(
            {
              threadId,
              model: agentModel,
              traceMetadata: evalTraceMetadata,
              traceTags: evalTraceTags,
              evalRecordMetadata,
            },
            () =>
              POST({
                json: async () => prepared.payload,
              } as Request),
          ),
        );
        const agentRun = tracedRun.result;
        const latencyMs = Date.now() - started;
        const response = agentRun.result;
        if (response.status !== 200) {
          throw new Error(`Webhook returned status ${response.status} for ${evalCase.id}.`);
        }

        const createdRecords = await findCreatedRecords({
          siteId,
          userId,
          startedAt: caseStartedAt,
          inputText: prepared.inputText,
          runId,
          caseId: evalCase.id,
        });
        const persistedRecords = getPersistedEvalRecordsFromTrace(tracedRun.entries);
        createdRecordIds = Array.from(
          new Set([...persistedRecords, ...createdRecords].map((record) => record.id)),
        );
        const recordsForValidation = selectRecordsForWhatsappEval({
          traceEntries: tracedRun.entries,
          fallbackRecords: createdRecords,
        });
        const selectedRecord = selectNewestEvalRecord(recordsForValidation);
        const deterministic = validateWhatsappSiteManagerRecord({
          evalCase,
          siteId,
          userId,
          record: selectedRecord,
          records: recordsForValidation,
        });
        const judge =
          judgeClient && judgeModel
            ? await judgeRecord({
                client: judgeClient,
                model: judgeModel,
                evalCase,
                inputText: prepared.inputText,
                record: selectedRecord,
                deterministic,
              })
            : {
                status: "skipped" as const,
                explanation: "Run with --judge or AI_EVAL_ENABLE_JUDGE=true to enable LLM judging.",
                improvements: [],
              };

        results.push({
          caseId: evalCase.id,
          webhookMessageId: prepared.messageId,
          inputPreview: preview(prepared.inputText),
          createdRecordIds,
          selectedRecord,
          answer: agentRun.details?.content ?? "",
          requestedModel: agentRun.details?.requestedModel ?? agentModel,
          actualModel: agentRun.details?.actualModel ?? null,
          tokenUsage: agentRun.details?.tokenUsage ?? null,
          finishReason: agentRun.details?.finishReason ?? null,
          structuredSaveTrace: tracedRun.entries,
          deterministic,
          judge,
          latencyMs,
          threadId,
        });

        const marker =
          deterministic.status === "fail" || judge.status === "fail"
            ? "FAIL"
            : deterministic.heuristic.status === "warn" || judge.status === "warn"
              ? "WARN"
              : "PASS";
        const latencyLabel = latencyMs >= slowThresholdMs ? `${latencyMs}ms, slow` : `${latencyMs}ms`;
        console.log(`[${marker}] ${evalCase.id} (${latencyLabel})`);
      } finally {
        await cleanupEvalRows({
          businessPhoneNumberId,
          recordIds: createdRecordIds,
          runId,
          caseId: evalCase.id,
        });
      }
    }
  } finally {
    restoreFetch();
  }

  const latency = summarizeLatency(results, slowThresholdMs);
  const actualModels = Array.from(
    new Set(results.map((item) => item.actualModel).filter((model): model is string => Boolean(model))),
  );

  const report: WhatsAppSiteManagerEvalReport = {
    runId,
    flow: "whatsapp-site-manager",
    model: agentModel,
    requestedModel: agentModel,
    actualModels,
    judgeModel,
    siteId,
    userId,
    startedAt,
    finishedAt: new Date().toISOString(),
    results,
    latency,
    summary: {
      cases: results.length,
      deterministicFailures: results.filter((item) => item.deterministic.status === "fail").length,
      heuristicWarnings: results.filter((item) => item.deterministic.heuristic.status === "warn").length,
      heuristicFailures: results.filter((item) => item.deterministic.heuristic.status === "fail").length,
      judgeWarnings: results.filter((item) => item.judge.status === "warn").length,
      judgeFailures: results.filter((item) => item.judge.status === "fail").length,
    },
  };

  const outputDir = path.join(process.cwd(), ".ai-eval-results");
  await mkdir(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, `whatsapp-site-manager-${runId}.json`);
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log(`Wrote ${outputPath}`);
  console.log(JSON.stringify(report.summary, null, 2));

  if (report.summary.deterministicFailures > 0 || report.summary.judgeFailures > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
