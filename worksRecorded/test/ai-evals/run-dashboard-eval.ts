import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import OpenAI from "openai";

import { orchestratingAgentV2ModelModel } from "@/server/ai-flows/ai-models-settings";
import { runWithLangSmithTraceFlush } from "./ai-eval-runner-lifecycle";
import { dashboardEvalCases } from "./dashboard-cases";
import { TurnValidationResult, validateEvalTurn } from "./validators";

type JudgeStatus = "pass" | "warn" | "fail" | "skipped";

type JudgeResult = {
  status: JudgeStatus;
  explanation: string;
  improvements: string[];
};

type TurnRunResult = {
  caseId: string;
  turnIndex: number;
  promptPreview: string;
  answer: string;
  requestedModel: string;
  actualModel: string | null;
  tokenUsage: unknown;
  finishReason: string | null;
  deterministic: TurnValidationResult;
  judge: JudgeResult;
  latencyMs: number;
  threadId: string;
};

type LatencyTurnSummary = {
  caseId: string;
  turnIndex: number;
  latencyMs: number;
  threadId: string;
};

type DashboardEvalReport = {
  runId: string;
  flow: "dashboard-chat";
  model: string;
  requestedModel: string;
  actualModels: string[];
  judgeModel: string | null;
  siteId: string;
  userId: string;
  startedAt: string;
  finishedAt: string;
  results: TurnRunResult[];
  latency: {
    slowThresholdMs: number;
    totalMs: number;
    averageMs: number;
    slowestTurn: LatencyTurnSummary | null;
    turnsOverThreshold: LatencyTurnSummary[];
  };
  summary: {
    turns: number;
    deterministicFailures: number;
    judgeWarnings: number;
    judgeFailures: number;
  };
};

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

function summarizeLatency(results: TurnRunResult[], slowThresholdMs: number) {
  const turns = results.map((item) => ({
    caseId: item.caseId,
    turnIndex: item.turnIndex,
    latencyMs: item.latencyMs,
    threadId: item.threadId,
  }));
  const totalMs = turns.reduce((total, item) => total + item.latencyMs, 0);
  const slowestTurn =
    turns.length > 0
      ? turns.reduce((slowest, item) => (item.latencyMs > slowest.latencyMs ? item : slowest))
      : null;

  return {
    slowThresholdMs,
    totalMs,
    averageMs: turns.length > 0 ? Math.round(totalMs / turns.length) : 0,
    slowestTurn,
    turnsOverThreshold: turns.filter((item) => item.latencyMs >= slowThresholdMs),
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

async function judgeAnswer(args: {
  client: OpenAI;
  model: string;
  caseId: string;
  intent: string;
  prompt: string;
  answer: string;
  deterministic: TurnValidationResult;
}): Promise<JudgeResult> {
  const response = await (args.client.responses.create as any)({
    model: args.model,
    input: [
      {
        role: "system",
        content:
          'You judge regression-test answers for a construction SaaS AI assistant. Return strict JSON shaped as {"status":"pass"|"warn"|"fail","explanation":"...","improvements":["..."]}. Keep improvements advisory and concise. Use an empty improvements array when no useful improvement is needed. Fail unsafe save confirmations, fabricated facts, or answers that ignore missing context.',
      },
      {
        role: "user",
        content: JSON.stringify({
          caseId: args.caseId,
          intent: args.intent,
          prompt: args.prompt,
          answer: args.answer,
          deterministicStatus: args.deterministic.status,
          deterministicResults: args.deterministic.results,
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
    console.log(`Loaded ${dashboardEvalCases.length} dashboard eval cases.`);
    console.log(
      `Validated ${dashboardEvalCases.reduce((count, item) => count + item.turns.length, 0)} turns.`,
    );
    return;
  }

  if (process.env.RUN_AI_EVALS !== "true") {
    throw new Error("Set RUN_AI_EVALS=true to run real AI evals.");
  }

  const siteId = getRequiredEnv("AI_EVAL_SITE_ID");
  const userId = getRequiredEnv("AI_EVAL_USER_ID");
  getRequiredEnv("OPENAI_API_KEY");
  getRequiredEnv("DATABASE_URL");

  const runId = createRunId();
  const agentModel = process.env.AI_EVAL_AGENT_MODEL ?? orchestratingAgentV2ModelModel;
  const slowThresholdMs = getSlowThresholdMs();
  const judgeModel = enableJudge ? process.env.AI_EVAL_JUDGE_MODEL ?? "gpt-4.1-mini" : null;
  const judgeClient = enableJudge ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
  const { runOrchestratingAgentV2Detailed } = await import(
    "@/server/ai-flows/agents/orchestrating-agent-v2/agent"
  );

  const startedAt = new Date().toISOString();
  const results: TurnRunResult[] = [];

  for (const evalCase of dashboardEvalCases) {
    const threadId = `eval:dashboard-chat:${siteId}:${evalCase.id}:${runId}`;

    for (const [turnIndex, turn] of evalCase.turns.entries()) {
      const started = Date.now();
      const agentResult = await runOrchestratingAgentV2Detailed(turn.prompt, siteId, {
          userId,
          threadId,
          readOnlyTools: true,
          model: agentModel,
          traceMetadata: {
            evalRunId: runId,
            evalCaseId: evalCase.id,
            evalTurn: turnIndex,
            evalMode: "real-model-context-regression",
          },
        });
      const answer = agentResult.content;
      const latencyMs = Date.now() - started;
      const deterministic = validateEvalTurn(evalCase, turn, answer, turnIndex);
      const judge =
        judgeClient && judgeModel
          ? await judgeAnswer({
              client: judgeClient,
              model: judgeModel,
              caseId: evalCase.id,
              intent: evalCase.intent,
              prompt: turn.prompt,
              answer,
              deterministic,
            })
          : {
              status: "skipped" as const,
              explanation: "Run with --judge or AI_EVAL_ENABLE_JUDGE=true to enable LLM judging.",
              improvements: [],
            };

      results.push({
        caseId: evalCase.id,
        turnIndex,
        promptPreview: preview(turn.prompt),
        answer,
        requestedModel: agentResult.requestedModel,
        actualModel: agentResult.actualModel,
        tokenUsage: agentResult.tokenUsage,
        finishReason: agentResult.finishReason,
        deterministic,
        judge,
        latencyMs,
        threadId,
      });

      const marker =
        deterministic.status === "fail" || judge.status === "fail"
          ? "FAIL"
          : judge.status === "warn"
            ? "WARN"
            : "PASS";
      const latencyLabel = latencyMs >= slowThresholdMs ? `${latencyMs}ms, slow` : `${latencyMs}ms`;
      console.log(
        `[${marker}] ${evalCase.id} turn ${turnIndex + 1}/${evalCase.turns.length} (${latencyLabel})`,
      );
    }
  }

  const latency = summarizeLatency(results, slowThresholdMs);
  const actualModels = Array.from(
    new Set(results.map((item) => item.actualModel).filter((model): model is string => Boolean(model))),
  );

  const report: DashboardEvalReport = {
    runId,
    flow: "dashboard-chat",
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
      turns: results.length,
      deterministicFailures: results.filter((item) => item.deterministic.status === "fail")
        .length,
      judgeWarnings: results.filter((item) => item.judge.status === "warn").length,
      judgeFailures: results.filter((item) => item.judge.status === "fail").length,
    },
  };

  const outputDir = path.join(process.cwd(), ".ai-eval-results");
  await mkdir(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, `dashboard-${runId}.json`);
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log(`Wrote ${outputPath}`);
  console.log(JSON.stringify(report.summary, null, 2));

  if (report.summary.deterministicFailures > 0 || report.summary.judgeFailures > 0) {
    process.exitCode = 1;
  }
}

runWithLangSmithTraceFlush(main).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
