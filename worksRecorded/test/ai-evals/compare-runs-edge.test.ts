import { compareEvalRuns } from "@/lib/ai-evals/compare-runs";
import {
	type NormalizedEvalRun,
	normalizeEvalReport,
} from "@/lib/ai-evals/report-loader";

type RawResult = {
	caseId: string;
	turnIndex?: number;
	promptPreview?: string;
	answer?: string;
	actualModel?: string;
	tokenUsage?: { total_tokens?: number };
	finishReason?: string;
	latencyMs?: number;
	deterministic: {
		status: "pass" | "warn" | "fail" | "unknown";
		results: Array<{ name: string; status: string; message: string }>;
	};
	judge?: {
		status: "pass" | "warn" | "fail";
		explanation?: string;
		improvements?: string[];
	};
};

type RawReport = {
	runId: string;
	flow: "dashboard-chat" | "whatsapp-site-manager" | "whatsapp-worker";
	requestedModel?: string;
	actualModels?: string[];
	startedAt?: string;
	summary?: Record<string, unknown>;
	latency?: Record<string, unknown>;
	results: RawResult[];
};

function makeRun(raw: RawReport): NormalizedEvalRun {
	return normalizeEvalReport(raw, `${raw.flow}-${raw.runId}.json`);
}

function dashboardResult(
	caseId: string,
	status: RawResult["deterministic"]["status"],
	overrides: Partial<RawResult> = {},
): RawResult {
	return {
		caseId,
		turnIndex: 0,
		answer: `${caseId} answer`,
		actualModel: "test-model",
		tokenUsage: { total_tokens: 100 },
		finishReason: "stop",
		latencyMs: 1000,
		deterministic: { status, results: [] },
		...overrides,
	};
}

describe("compareEvalRuns edge cases (synthetic)", () => {
	it("returns a tie when both runs are identical", () => {
		const base: RawReport = {
			runId: "run-1",
			flow: "dashboard-chat",
			requestedModel: "gpt-5.4",
			results: [dashboardResult("case-a", "pass")],
		};
		const runA = makeRun({ ...base, runId: "a" });
		const runB = makeRun({ ...base, runId: "b" });

		const comparison = compareEvalRuns(runA, runB);

		expect(comparison.tasks).toHaveLength(1);
		expect(comparison.tasks[0].verdict).toBe("tie");
		expect(comparison.aggregate.tasksWonA).toBe(0);
		expect(comparison.aggregate.tasksWonB).toBe(0);
		expect(comparison.aggregate.tasksTied).toBe(1);
		expect(comparison.winner).toBe("tie");
	});

	it("awards a task to A when A passes and B fails a validator", () => {
		const runA = makeRun({
			runId: "a",
			flow: "dashboard-chat",
			results: [dashboardResult("floor", "pass")],
		});
		const runB = makeRun({
			runId: "b",
			flow: "dashboard-chat",
			results: [
				{
					...dashboardResult("floor", "fail", {
						answer: "Saved successfully.",
					}),
					deterministic: {
						status: "fail",
						results: [
							{
								name: "forbidden-claims",
								status: "fail",
								message: "Said saved successfully.",
							},
						],
					},
				},
			],
		});

		const comparison = compareEvalRuns(runA, runB);

		expect(comparison.tasks[0].verdict).toBe("a");
		expect(comparison.tasks[0].failedValidatorsB[0].name).toBe(
			"forbidden-claims",
		);
		expect(comparison.aggregate.tasksWonA).toBe(1);
		expect(comparison.winner).toBe("a");
		expect(comparison.winnerReason).toContain("More tasks won");
	});

	it("marks a task incomparable when missing on one side", () => {
		const runA = makeRun({
			runId: "a",
			flow: "dashboard-chat",
			results: [
				dashboardResult("shared", "pass"),
				dashboardResult("only-a", "pass"),
			],
		});
		const runB = makeRun({
			runId: "b",
			flow: "dashboard-chat",
			results: [dashboardResult("shared", "pass")],
		});

		const comparison = compareEvalRuns(runA, runB);

		const onlyA = comparison.tasks.find((task) => task.caseId === "only-a");
		expect(onlyA?.verdict).toBe("incomparable");
		expect(onlyA?.statusB).toBe("unknown");
		expect(comparison.aggregate.tasksIncomparable).toBe(1);
		expect(comparison.aggregate.tasksTied).toBe(1);
		expect(comparison.aggregate.tasksWonA).toBe(0);
		expect(comparison.aggregate.tasksWonB).toBe(0);
		expect(comparison.aggregate.totalLatencyMsA).toBe(2000);
		expect(comparison.aggregate.totalLatencyMsB).toBe(1000);
		expect(comparison.winner).toBe("b");
		expect(comparison.winnerReason).toContain("latency");
	});

	it("breaks a status tie using latency (lower wins)", () => {
		const runA = makeRun({
			runId: "a",
			flow: "dashboard-chat",
			results: [dashboardResult("t", "pass", { latencyMs: 800 })],
		});
		const runB = makeRun({
			runId: "b",
			flow: "dashboard-chat",
			results: [dashboardResult("t", "pass", { latencyMs: 1200 })],
		});

		const comparison = compareEvalRuns(runA, runB);

		expect(comparison.tasks[0].verdict).toBe("a");
		expect(comparison.tasks[0].verdictReason).toContain("latency");
		expect(comparison.aggregate.tasksWonA).toBe(1);
		expect(comparison.winner).toBe("a");
	});

	it("breaks an aggregate tie using deterministic failures (fewer wins)", () => {
		const runA = makeRun({
			runId: "a",
			flow: "dashboard-chat",
			results: [
				dashboardResult("x", "pass"),
				dashboardResult("only-a", "fail"),
			],
		});
		const runB = makeRun({
			runId: "b",
			flow: "dashboard-chat",
			results: [dashboardResult("x", "pass")],
		});

		const comparison = compareEvalRuns(runA, runB);

		expect(comparison.aggregate.tasksWonA).toBe(0);
		expect(comparison.aggregate.tasksWonB).toBe(0);
		expect(comparison.aggregate.tasksTied).toBe(1);
		expect(comparison.aggregate.tasksIncomparable).toBe(1);
		expect(comparison.aggregate.deterministicFailuresA).toBe(1);
		expect(comparison.aggregate.deterministicFailuresB).toBe(0);
		expect(comparison.winner).toBe("b");
		expect(comparison.winnerReason).toContain("deterministic failures");
	});

	it("breaks an aggregate tie using critical anomalies (fewer wins)", () => {
		const runA = makeRun({
			runId: "a",
			flow: "dashboard-chat",
			summary: {},
			latency: { averageMs: 1000 },
			results: [
				{
					caseId: "read-only",
					turnIndex: 0,
					promptPreview: "Read-only check. Do not save.",
					answer: "OK, no changes.",
					latencyMs: 1000,
					deterministic: { status: "pass", results: [] },
				},
			],
		});
		const runB = makeRun({
			runId: "b",
			flow: "dashboard-chat",
			summary: {},
			latency: { averageMs: 1000 },
			results: [
				{
					caseId: "read-only",
					turnIndex: 0,
					promptPreview: "Read-only check. Do not save.",
					answer: "Saved successfully.",
					latencyMs: 1000,
					deterministic: { status: "pass", results: [] },
				},
			],
		});

		const comparison = compareEvalRuns(runA, runB);

		expect(comparison.aggregate.criticalAnomaliesA).toBe(0);
		expect(comparison.aggregate.criticalAnomaliesB).toBe(1);
		expect(comparison.winner).toBe("a");
		expect(comparison.winnerReason).toContain("critical anomalies");
	});

	it("breaks an aggregate tie using total latency (lower wins)", () => {
		const runA = makeRun({
			runId: "a",
			flow: "dashboard-chat",
			results: [
				dashboardResult("x", "pass", { latencyMs: 700 }),
				dashboardResult("y", "pass", { latencyMs: 1100 }),
			],
		});
		const runB = makeRun({
			runId: "b",
			flow: "dashboard-chat",
			results: [
				dashboardResult("x", "pass", { latencyMs: 1200 }),
				dashboardResult("y", "pass", { latencyMs: 900 }),
			],
		});

		const comparison = compareEvalRuns(runA, runB);

		expect(comparison.aggregate.tasksWonA).toBe(1);
		expect(comparison.aggregate.tasksWonB).toBe(1);
		expect(comparison.aggregate.totalLatencyMsA).toBe(1800);
		expect(comparison.aggregate.totalLatencyMsB).toBe(2100);
		expect(comparison.winner).toBe("a");
		expect(comparison.winnerReason).toContain("latency");
	});

	it("breaks an aggregate tie using total tokens (lower wins)", () => {
		const runA = makeRun({
			runId: "a",
			flow: "dashboard-chat",
			results: [
				dashboardResult("x", "pass", {
					latencyMs: 1000,
					tokenUsage: { total_tokens: 50 },
				}),
			],
		});
		const runB = makeRun({
			runId: "b",
			flow: "dashboard-chat",
			results: [
				dashboardResult("x", "pass", {
					latencyMs: 1000,
					tokenUsage: { total_tokens: 200 },
				}),
			],
		});

		const comparison = compareEvalRuns(runA, runB);

		expect(comparison.aggregate.totalTokensA).toBe(50);
		expect(comparison.aggregate.totalTokensB).toBe(200);
		expect(comparison.winner).toBe("a");
		expect(comparison.winnerReason).toContain("tokens");
	});

	it("respects judge status when judge failures differ", () => {
		const runA = makeRun({
			runId: "a",
			flow: "whatsapp-site-manager",
			results: [
				{
					caseId: "judged",
					answer: "answer",
					latencyMs: 1000,
					deterministic: { status: "warn", results: [] },
					judge: { status: "warn" },
				},
			],
		});
		const runB = makeRun({
			runId: "b",
			flow: "whatsapp-site-manager",
			results: [
				{
					caseId: "judged",
					answer: "answer",
					latencyMs: 1000,
					deterministic: { status: "warn", results: [] },
					judge: { status: "fail" },
				},
			],
		});

		const comparison = compareEvalRuns(runA, runB);

		expect(comparison.aggregate.judgeFailuresA).toBe(0);
		expect(comparison.aggregate.judgeFailuresB).toBe(1);
		expect(comparison.winner).toBe("a");
		expect(comparison.winnerReason).toContain("judge failures");
	});

	it("matches WhatsApp single-record-per-case items by caseId", () => {
		const runA = makeRun({
			runId: "a",
			flow: "whatsapp-site-manager",
			results: [
				{
					caseId: "floor-work",
					answer: "grīdas darbi",
					latencyMs: 1000,
					deterministic: { status: "pass", results: [] },
				},
			],
		});
		const runB = makeRun({
			runId: "b",
			flow: "whatsapp-site-manager",
			results: [
				{
					caseId: "floor-work",
					answer: "wrong",
					latencyMs: 1000,
					deterministic: { status: "fail", results: [] },
				},
			],
		});

		const comparison = compareEvalRuns(runA, runB);

		expect(comparison.tasks).toHaveLength(1);
		expect(comparison.tasks[0].caseId).toBe("floor-work");
		expect(comparison.tasks[0].verdict).toBe("a");
		expect(comparison.winner).toBe("a");
	});

	it("matches multi-turn dashboard items by caseId:turnIndex", () => {
		const runA = makeRun({
			runId: "a",
			flow: "dashboard-chat",
			results: [
				dashboardResult("ctx", "pass", { turnIndex: 0, latencyMs: 800 }),
				dashboardResult("ctx", "pass", { turnIndex: 1, latencyMs: 900 }),
			],
		});
		const runB = makeRun({
			runId: "b",
			flow: "dashboard-chat",
			results: [
				dashboardResult("ctx", "pass", { turnIndex: 0, latencyMs: 1200 }),
				dashboardResult("ctx", "fail", { turnIndex: 1, latencyMs: 900 }),
			],
		});

		const comparison = compareEvalRuns(runA, runB);

		expect(comparison.tasks).toHaveLength(2);
		const turn0 = comparison.tasks.find((task) =>
			task.label.includes("turn 1"),
		);
		const turn1 = comparison.tasks.find((task) =>
			task.label.includes("turn 2"),
		);
		expect(turn0?.verdict).toBe("a");
		expect(turn1?.verdict).toBe("a");
		expect(comparison.aggregate.tasksWonA).toBe(2);
		expect(comparison.winner).toBe("a");
	});

	it("orders tasks by run A first, then run-B-only items", () => {
		const runA = makeRun({
			runId: "a",
			flow: "dashboard-chat",
			results: [
				dashboardResult("a1", "pass"),
				dashboardResult("shared", "pass"),
			],
		});
		const runB = makeRun({
			runId: "b",
			flow: "dashboard-chat",
			results: [
				dashboardResult("shared", "pass"),
				dashboardResult("b1", "pass"),
			],
		});

		const comparison = compareEvalRuns(runA, runB);

		const ids = comparison.tasks.map((task) => task.caseId);
		expect(ids).toEqual(["a1", "shared", "b1"]);
	});

	it("handles unknown status on both sides as incomparable", () => {
		const runA = makeRun({
			runId: "a",
			flow: "dashboard-chat",
			results: [
				dashboardResult("x", "unknown" as RawResult["deterministic"]["status"]),
			],
		});
		const runB = makeRun({
			runId: "b",
			flow: "dashboard-chat",
			results: [
				dashboardResult("x", "unknown" as RawResult["deterministic"]["status"]),
			],
		});

		const comparison = compareEvalRuns(runA, runB);

		expect(comparison.tasks[0].verdict).toBe("incomparable");
		expect(comparison.aggregate.tasksIncomparable).toBe(1);
		expect(comparison.aggregate.tasksTied).toBe(0);
	});

	it("normalizes null/absent token totals to zero in aggregates", () => {
		const runA = makeRun({
			runId: "a",
			flow: "dashboard-chat",
			results: [
				dashboardResult("x", "pass", {
					latencyMs: 1000,
					tokenUsage: undefined,
				}),
			],
		});
		const runB = makeRun({
			runId: "b",
			flow: "dashboard-chat",
			results: [
				dashboardResult("x", "pass", {
					latencyMs: 1000,
					tokenUsage: undefined,
				}),
			],
		});

		const comparison = compareEvalRuns(runA, runB);

		expect(comparison.aggregate.totalTokensA).toBe(0);
		expect(comparison.aggregate.totalTokensB).toBe(0);
		expect(comparison.winner).toBe("tie");
	});
});
