import { readdirSync } from "node:fs";
import path from "node:path";

import { compareEvalRuns } from "@/lib/ai-evals/compare-runs";
import {
	loadEvalReports,
	type NormalizedEvalItem,
	type NormalizedEvalRun,
} from "@/lib/ai-evals/report-loader";

const RESULTS_DIR = path.join(process.cwd(), ".ai-eval-results");

function countReportsForFlowSync(flow: string): number {
	let count = 0;
	let entries: string[] = [];
	try {
		entries = readdirSync(RESULTS_DIR);
	} catch {
		return 0;
	}
	const prefix = `${flow}-`;
	for (const entry of entries) {
		if (entry.startsWith(prefix) && entry.endsWith(".json")) count++;
	}
	return count;
}

async function latestReportsByFlow(flow: string): Promise<NormalizedEvalRun[]> {
	const reports = await loadEvalReports(RESULTS_DIR);
	return reports
		.filter(
			(report) => report.flow === flow && report.flow !== "invalid-report",
		)
		.slice(0, 2);
}

function describeForFlow(flow: string) {
	const hasTwo = countReportsForFlowSync(flow) >= 2;
	const suite = hasTwo ? describe : describe.skip;

	suite(`compareEvalRuns against real ${flow} reports`, () => {
		let runA: NormalizedEvalRun;
		let runB: NormalizedEvalRun;

		beforeAll(async () => {
			const [a, b] = await latestReportsByFlow(flow);
			runA = a;
			runB = b;
		});

		it("loads two reports with matching flow", () => {
			expect(runA.flow).toBe(flow);
			expect(runB.flow).toBe(flow);
			expect(runA.runId).not.toBe(runB.runId);
		});

		it("produces one task per union of item ids", () => {
			const idsA = new Set(runA.items.map((item) => item.id));
			const idsB = new Set(runB.items.map((item) => item.id));
			const union = new Set([...idsA, ...idsB]);
			const comparison = compareEvalRuns(runA, runB);
			expect(comparison.tasks).toHaveLength(union.size);
		});

		it("partitions tasks into won/tied/incomparable matching the count", () => {
			const comparison = compareEvalRuns(runA, runB);
			const { tasksWonA, tasksWonB, tasksTied, tasksIncomparable } =
				comparison.aggregate;
			expect(tasksWonA + tasksWonB + tasksTied + tasksIncomparable).toBe(
				comparison.tasks.length,
			);
		});

		it("derives each task verdict from status + latency consistently", () => {
			const comparison = compareEvalRuns(runA, runB);
			for (const task of comparison.tasks) {
				if (task.verdict === "incomparable") {
					expect(task.statusA === "unknown" || task.statusB === "unknown").toBe(
						true,
					);
					continue;
				}
				const rankA = statusRank(task.statusA);
				const rankB = statusRank(task.statusB);
				if (rankA > rankB) expect(task.verdict).toBe("a");
				else if (rankB > rankA) expect(task.verdict).toBe("b");
				else if (task.latencyMsA !== task.latencyMsB) {
					expect(task.verdict).toBe(
						task.latencyMsA < task.latencyMsB ? "a" : "b",
					);
				} else {
					expect(task.verdict).toBe("tie");
				}
			}
		});

		it("aggregate totals equal the sum of item values", () => {
			const comparison = compareEvalRuns(runA, runB);
			expect(comparison.aggregate.totalLatencyMsA).toBe(sumLatency(runA.items));
			expect(comparison.aggregate.totalLatencyMsB).toBe(sumLatency(runB.items));
			expect(comparison.aggregate.totalTokensA).toBe(sumTokens(runA.items));
			expect(comparison.aggregate.totalTokensB).toBe(sumTokens(runB.items));
			expect(comparison.aggregate.averageLatencyMsA).toBeCloseTo(
				runA.items.length ? sumLatency(runA.items) / runA.items.length : 0,
				5,
			);
			expect(comparison.aggregate.averageLatencyMsB).toBeCloseTo(
				runB.items.length ? sumLatency(runB.items) / runB.items.length : 0,
				5,
			);
		});

		it("aggregate failure/anomaly counts match per-run item scans", () => {
			const comparison = compareEvalRuns(runA, runB);
			expect(comparison.aggregate.deterministicFailuresA).toBe(
				runA.items.filter((item) => item.status === "fail").length,
			);
			expect(comparison.aggregate.deterministicFailuresB).toBe(
				runB.items.filter((item) => item.status === "fail").length,
			);
			expect(comparison.aggregate.judgeFailuresA).toBe(
				runA.items.filter((item) => item.judgeStatus === "fail").length,
			);
			expect(comparison.aggregate.judgeFailuresB).toBe(
				runB.items.filter((item) => item.judgeStatus === "fail").length,
			);
			expect(comparison.aggregate.criticalAnomaliesA).toBe(
				runA.anomalies.filter((anomaly) => anomaly.severity === "critical")
					.length,
			);
			expect(comparison.aggregate.criticalAnomaliesB).toBe(
				runB.anomalies.filter((anomaly) => anomaly.severity === "critical")
					.length,
			);
		});

		it("winner matches a local re-derivation of the tiebreak ladder", () => {
			const comparison = compareEvalRuns(runA, runB);
			expect(comparison.winner).toBe(deriveWinner(comparison.aggregate));
		});

		it("preserves run metadata in the comparison header", () => {
			const comparison = compareEvalRuns(runA, runB);
			expect(comparison.runA.runId).toBe(runA.runId);
			expect(comparison.runB.runId).toBe(runB.runId);
			expect(comparison.runA.requestedModel).toBe(runA.requestedModel);
			expect(comparison.runB.requestedModel).toBe(runB.requestedModel);
			expect(comparison.flow).toBe(flow);
		});

		it("orders tasks with run A items first, then run-B-only items", () => {
			const comparison = compareEvalRuns(runA, runB);
			const idsA = runA.items.map((item) => item.id);
			const onlyB = runB.items
				.map((item) => item.id)
				.filter((id) => !idsA.includes(id));
			const taskIds = comparison.tasks.map((task) => task.caseId);
			const firstA = taskIds.slice(0, idsA.length);
			const rest = taskIds.slice(idsA.length);
			expect(rest).toEqual(onlyB.map((id) => id.split(":")[0]));
			expect(new Set(firstA).size).toBe(firstA.length);
		});
	});
}

function statusRank(status: string): number {
	if (status === "pass") return 3;
	if (status === "warn") return 2;
	if (status === "fail") return 1;
	return 0;
}

function sumLatency(items: NormalizedEvalItem[]): number {
	return items.reduce((total, item) => total + (item.latencyMs || 0), 0);
}

function sumTokens(items: NormalizedEvalItem[]): number {
	return items.reduce((total, item) => total + (item.tokenTotal || 0), 0);
}

function deriveWinner(totals: {
	tasksWonA: number;
	tasksWonB: number;
	deterministicFailuresA: number;
	deterministicFailuresB: number;
	judgeFailuresA: number;
	judgeFailuresB: number;
	judgeWarningsA: number;
	judgeWarningsB: number;
	criticalAnomaliesA: number;
	criticalAnomaliesB: number;
	warningAnomaliesA: number;
	warningAnomaliesB: number;
	totalLatencyMsA: number;
	totalLatencyMsB: number;
	totalTokensA: number;
	totalTokensB: number;
}): "a" | "b" | "tie" {
	const pick = (aBetter: boolean, bBetter: boolean): "a" | "b" | null =>
		aBetter ? "a" : bBetter ? "b" : null;

	const steps: Array<"a" | "b" | null> = [
		pick(
			totals.tasksWonA > totals.tasksWonB,
			totals.tasksWonB > totals.tasksWonA,
		),
		pick(
			totals.deterministicFailuresA < totals.deterministicFailuresB,
			totals.deterministicFailuresB < totals.deterministicFailuresA,
		),
		pick(
			totals.judgeFailuresA < totals.judgeFailuresB,
			totals.judgeFailuresB < totals.judgeFailuresA,
		),
		pick(
			totals.judgeWarningsA < totals.judgeWarningsB,
			totals.judgeWarningsB < totals.judgeWarningsA,
		),
		pick(
			totals.criticalAnomaliesA < totals.criticalAnomaliesB,
			totals.criticalAnomaliesB < totals.criticalAnomaliesA,
		),
		pick(
			totals.warningAnomaliesA < totals.warningAnomaliesB,
			totals.warningAnomaliesB < totals.warningAnomaliesA,
		),
		pick(
			totals.totalLatencyMsA < totals.totalLatencyMsB,
			totals.totalLatencyMsB < totals.totalLatencyMsA,
		),
		pick(
			totals.totalTokensA < totals.totalTokensB,
			totals.totalTokensB < totals.totalTokensA,
		),
	];

	for (const step of steps) {
		if (step) return step;
	}
	return "tie";
}

describeForFlow("dashboard-chat");
describeForFlow("whatsapp-site-manager");
describeForFlow("whatsapp-worker");
