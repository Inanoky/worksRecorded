import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { prisma } from "@/lib/utils/db";
import { clickInAgentForWorkersModel } from "@/server/ai-flows/ai-models-settings";
import { runWithWorkerAgentEvalContext } from "@/server/ai-flows/agents/whatsapp-agent/ClockinAgentForWorkerRoute/agent";
import {
  whatsappWorkerEvalCases,
  type WhatsAppWorkerEvalCase,
} from "./whatsapp-worker-cases";
import {
  type CapturedMetaGraphMessage,
  type SavedTimelogRecord,
  type SavedWorkerDiaryRecord,
  type WhatsAppWorkerValidationResult,
  validateWhatsappWorkerCase,
} from "./whatsapp-worker-validators";

type CaseRunResult = {
  caseId: string;
  webhookMessageId: string;
  inputPreview: string;
  graphMessages: CapturedMetaGraphMessage[];
  createdDiaryRecordIds: string[];
  timelogRecordIds: string[];
  seededTimelogId: string | null;
  answer: string;
  requestedModel: string;
  actualModel: string | null;
  tokenUsage: unknown;
  finishReason: string | null;
  deterministic: WhatsAppWorkerValidationResult;
  latencyMs: number;
  threadId: string;
};

type LatencyCaseSummary = {
  caseId: string;
  latencyMs: number;
  threadId: string;
};

type WhatsAppWorkerEvalReport = {
  runId: string;
  flow: "whatsapp-worker";
  model: string;
  requestedModel: string;
  actualModels: string[];
  siteId: string;
  workerId: string;
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
  };
};

const GRAPH_API_PREFIX = "https://graph.facebook.com/";

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
  evalCase: WhatsAppWorkerEvalCase;
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
    throw new Error(`Invalid WhatsApp worker eval webhook fixture for ${args.evalCase.id}.`);
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

function installGraphApiFetchMock(capturedMessages: CapturedMetaGraphMessage[]) {
  const originalFetch = global.fetch;

  global.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();
    if (url.startsWith(GRAPH_API_PREFIX)) {
      let body: Record<string, unknown> = {};
      if (typeof init?.body === "string") {
        try {
          body = JSON.parse(init.body);
        } catch {
          body = { rawBody: init.body };
        }
      }

      capturedMessages.push({ url, body: redactGraphMessageBody(body) });

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

function redactGraphMessageBody(value: unknown): Record<string, unknown> {
  const redact = (item: unknown): unknown => {
    if (typeof item === "string") {
      return item.replace(/([?&]token=)[^&\s"]+/g, "$1[redacted]");
    }

    if (Array.isArray(item)) return item.map(redact);

    if (item && typeof item === "object") {
      return Object.fromEntries(
        Object.entries(item as Record<string, unknown>).map(([key, nested]) => {
          if ((key === "to" || key === "recipient") && typeof nested === "string") {
            return [key, "[redacted]"];
          }

          return [key, redact(nested)];
        }),
      );
    }

    return item;
  };

  const redacted = redact(value);
  return redacted && typeof redacted === "object" && !Array.isArray(redacted)
    ? (redacted as Record<string, unknown>)
    : {};
}

async function assertEvalPreconditions(args: { siteId: string; workerId: string }) {
  const [worker, settings] = await Promise.all([
    prisma.workers.findUnique({
      where: { id: args.workerId },
      select: {
        id: true,
        phone: true,
        siteId: true,
        isClockedIn: true,
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

  if (!worker) {
    throw new Error(`AI_EVAL_WORKER_ID ${args.workerId} was not found.`);
  }

  if (worker.siteId !== args.siteId) {
    throw new Error(`Eval worker siteId must be ${args.siteId}; got ${worker.siteId ?? "null"}.`);
  }

  if (!worker.phone) {
    throw new Error(`AI_EVAL_WORKER_ID ${args.workerId} must have a phone number.`);
  }

  if (!settings?.schema) {
    throw new Error(`AI_EVAL_SITE_ID ${args.siteId} must have a site diary settings schema.`);
  }

  return worker;
}

async function seedEvalIdentity(args: {
  workerId: string;
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
      workerId: args.workerId,
    },
  });
}

async function setupWorkerCase(args: {
  evalCase: WhatsAppWorkerEvalCase;
  siteId: string;
  workerId: string;
}) {
  await prisma.workers.update({
    where: { id: args.workerId },
    data: { isClockedIn: args.evalCase.setup.workerClockedIn },
  });

  if (!args.evalCase.setup.seedOpenTimelog) return null;

  const record = await prisma.timelog.create({
    data: {
      workerId: args.workerId,
      siteId: args.siteId,
      date: new Date(),
      clockIn: new Date(Date.now() - 60 * 60 * 1000),
      clockOut: null,
    },
    select: { id: true },
  });

  return record.id;
}

async function findWorkerDiaryRecords(args: {
  siteId: string;
  workerId: string;
  startedAt: Date;
  inputText: string;
  runId: string;
  caseId: string;
}) {
  return prisma.sitediaryrecords.findMany({
    where: {
      siteId: args.siteId,
      createdAt: { gte: args.startedAt },
      OR: [
        {
          AND: [
            { evalMetadata: { path: ["isEval"], equals: true } },
            { evalMetadata: { path: ["flow"], equals: "whatsapp-worker" } },
            { evalMetadata: { path: ["runId"], equals: args.runId } },
            { evalMetadata: { path: ["caseId"], equals: args.caseId } },
          ],
        },
        {
          workerId: args.workerId,
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
      evalMetadata: true,
      createdAt: true,
    },
  });
}

async function findTimelogRecords(args: {
  siteId: string;
  workerId: string;
  startedAt: Date;
  seededTimelogId: string | null;
}) {
  return prisma.timelog.findMany({
    where: {
      siteId: args.siteId,
      workerId: args.workerId,
      OR: [
        args.seededTimelogId ? { id: args.seededTimelogId } : undefined,
        { createdAt: { gte: args.startedAt } },
      ].filter((item): item is NonNullable<typeof item> => Boolean(item)),
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      workerId: true,
      siteId: true,
      clockIn: true,
      clockOut: true,
      createdAt: true,
    },
  });
}

async function cleanupPreviousEvalCaseRows(args: {
  siteId: string;
  workerId: string;
  inputText: string;
  caseId: string;
}) {
  await prisma.sitediaryrecords.deleteMany({
    where: {
      siteId: args.siteId,
      workerId: args.workerId,
      AND: [
        { evalMetadata: { path: ["isEval"], equals: true } },
        { evalMetadata: { path: ["flow"], equals: "whatsapp-worker" } },
        { evalMetadata: { path: ["caseId"], equals: args.caseId } },
      ],
    },
  });

  await prisma.sitediaryrecords.deleteMany({
    where: {
      siteId: args.siteId,
      workerId: args.workerId,
      originalUserComment: {
        contains: args.inputText,
      },
    },
  });
}

async function cleanupEvalRows(args: {
  businessPhoneNumberId: string;
  diaryRecordIds: string[];
  timelogRecordIds: string[];
  runId: string;
  caseId: string;
}) {
  const prismaAny = prisma as any;
  await prisma.sitediaryrecords.deleteMany({
    where: {
      AND: [
        { evalMetadata: { path: ["isEval"], equals: true } },
        { evalMetadata: { path: ["flow"], equals: "whatsapp-worker" } },
        { evalMetadata: { path: ["runId"], equals: args.runId } },
        { evalMetadata: { path: ["caseId"], equals: args.caseId } },
      ],
    },
  });
  await prisma.sitediaryrecords.deleteMany({
    where: {
      id: { in: args.diaryRecordIds },
    },
  });
  await prisma.timelog.deleteMany({
    where: {
      id: { in: args.timelogRecordIds },
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

function normalizeSenderPhone(phone: string) {
  return phone.replace(/^whatsapp:/i, "").replace(/^\+/, "");
}

async function main() {
  const dryRun = hasArg("--dry-run");

  if (dryRun) {
    console.log(`Loaded ${whatsappWorkerEvalCases.length} WhatsApp worker eval cases.`);
    return;
  }

  if (process.env.RUN_AI_EVALS !== "true") {
    throw new Error("Set RUN_AI_EVALS=true to run real AI evals.");
  }

  const siteId = getRequiredEnv("AI_EVAL_SITE_ID");
  const workerId = getRequiredEnv("AI_EVAL_WORKER_ID");
  getRequiredEnv("OPENAI_API_KEY");
  getRequiredEnv("DATABASE_URL");
  process.env.META_ACCESS_TOKEN ||= "eval-meta-token";
  process.env.WEBHOOK_VERIFY_TOKEN ||= "eval-webhook-token";

  const worker = await assertEvalPreconditions({ siteId, workerId });
  const originalWorkerClockedIn = worker.isClockedIn ?? false;

  const runId = createRunId();
  const agentModel = process.env.AI_EVAL_AGENT_MODEL ?? clickInAgentForWorkersModel;
  const slowThresholdMs = getSlowThresholdMs();
  const senderPhone = normalizeSenderPhone(worker.phone!);
  const businessPhoneNumberId = `eval-worker-business-phone-${runId}`;
  const capturedMessages: CapturedMetaGraphMessage[] = [];
  const restoreFetch = installGraphApiFetchMock(capturedMessages);
  const { POST } = await import("@/app/api/webhook/meta/webhook/route");

  const startedAt = new Date().toISOString();
  const results: CaseRunResult[] = [];

  try {
    for (const evalCase of whatsappWorkerEvalCases) {
      const bsuid = `LV.eval.worker.${runId}.${evalCase.id}`;
      const threadId = `eval:whatsapp-worker:${siteId}:${workerId}:${evalCase.id}:${runId}`;
      let createdDiaryRecordIds: string[] = [];
      let timelogRecordIds: string[] = [];
      let seededTimelogId: string | null = null;
      const caseGraphStart = capturedMessages.length;
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
        evalMode: "real-meta-webhook-worker-regression",
        webhookMessageId: prepared.messageId,
      };
      const evalTraceTags = [
        "eval",
        "eval:whatsapp-worker",
        `eval-run:${runId}`,
        `eval-case:${evalCase.id}`,
      ];
      const evalRecordMetadata = {
        isEval: true,
        flow: "whatsapp-worker",
        runId,
        caseId: evalCase.id,
        messageId: prepared.messageId,
        createdBy: "ai-eval-runner",
      };

      try {
        await cleanupPreviousEvalCaseRows({
          siteId,
          workerId,
          inputText: prepared.inputText,
          caseId: evalCase.id,
        });

        seededTimelogId = await setupWorkerCase({ evalCase, siteId, workerId });
        if (seededTimelogId) timelogRecordIds.push(seededTimelogId);

        await seedEvalIdentity({
          workerId,
          businessPhoneNumberId,
          senderPhone,
          bsuid,
        });

        const started = Date.now();
        const caseStartedAt = new Date();
        const agentRun = await runWithWorkerAgentEvalContext(
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
        );
        const latencyMs = Date.now() - started;
        const response = agentRun.result;

        const diaryRecords = await findWorkerDiaryRecords({
          siteId,
          workerId,
          startedAt: caseStartedAt,
          inputText: prepared.inputText,
          runId,
          caseId: evalCase.id,
        });
        createdDiaryRecordIds = diaryRecords.map((record) => record.id);

        const timelogRecords = await findTimelogRecords({
          siteId,
          workerId,
          startedAt: caseStartedAt,
          seededTimelogId,
        });
        timelogRecordIds = Array.from(
          new Set([...timelogRecordIds, ...timelogRecords.map((record) => record.id)]),
        );

        const workerAfter = await prisma.workers.findUnique({
          where: { id: workerId },
          select: {
            id: true,
            isClockedIn: true,
          },
        });
        const graphMessages = capturedMessages.slice(caseGraphStart);

        const deterministic = validateWhatsappWorkerCase({
          evalCase,
          responseStatus: response.status,
          siteId,
          workerId,
          diaryRecords: diaryRecords as SavedWorkerDiaryRecord[],
          timelogRecords: timelogRecords as SavedTimelogRecord[],
          graphMessages,
          workerAfter,
          seededTimelogId,
        });

        results.push({
          caseId: evalCase.id,
          webhookMessageId: prepared.messageId,
          inputPreview: preview(prepared.inputText),
          graphMessages,
          createdDiaryRecordIds,
          timelogRecordIds,
          seededTimelogId,
          answer: agentRun.details?.content ?? "",
          requestedModel: agentRun.details?.requestedModel ?? agentModel,
          actualModel: agentRun.details?.actualModel ?? null,
          tokenUsage: agentRun.details?.tokenUsage ?? null,
          finishReason: agentRun.details?.finishReason ?? null,
          deterministic,
          latencyMs,
          threadId,
        });

        const marker =
          deterministic.status === "fail"
            ? "FAIL"
            : deterministic.heuristic.status === "warn"
              ? "WARN"
              : "PASS";
        const latencyLabel = latencyMs >= slowThresholdMs ? `${latencyMs}ms, slow` : `${latencyMs}ms`;
        console.log(`[${marker}] ${evalCase.id} (${latencyLabel})`);
      } finally {
        await cleanupEvalRows({
          businessPhoneNumberId,
          diaryRecordIds: createdDiaryRecordIds,
          timelogRecordIds,
          runId,
          caseId: evalCase.id,
        });
      }
    }
  } finally {
    restoreFetch();
    await prisma.workers
      .update({
        where: { id: workerId },
        data: { isClockedIn: originalWorkerClockedIn },
      })
      .catch((error) => {
        console.error("Failed to restore eval worker clock state", error);
      });
  }

  const latency = summarizeLatency(results, slowThresholdMs);
  const actualModels = Array.from(
    new Set(results.map((item) => item.actualModel).filter((model): model is string => Boolean(model))),
  );

  const report: WhatsAppWorkerEvalReport = {
    runId,
    flow: "whatsapp-worker",
    model: agentModel,
    requestedModel: agentModel,
    actualModels,
    siteId,
    workerId,
    startedAt,
    finishedAt: new Date().toISOString(),
    results,
    latency,
    summary: {
      cases: results.length,
      deterministicFailures: results.filter((item) => item.deterministic.status === "fail").length,
      heuristicWarnings: results.filter((item) => item.deterministic.heuristic.status === "warn").length,
      heuristicFailures: results.filter((item) => item.deterministic.heuristic.status === "fail").length,
    },
  };

  const outputDir = path.join(process.cwd(), ".ai-eval-results");
  await mkdir(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, `whatsapp-worker-${runId}.json`);
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log(`Wrote ${outputPath}`);
  console.log(JSON.stringify(report.summary, null, 2));

  if (report.summary.deterministicFailures > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
