import type {
	AnomalySeverity,
	EvalAnomaly,
	EvalStatus,
	NormalizedEvalItem,
	NormalizedEvalRun,
} from "./report-loader";

export type TaskVerdict = "a" | "b" | "tie" | "incomparable";

export type RunSummary = {
	runId: string;
	requestedModel: string | null;
	actualModels: string[];
	startedAt: string | null;
};

export type TaskComparison = {
	caseId: string;
	label: string;
	statusA: EvalStatus;
	statusB: EvalStatus;
	failedValidatorsA: Array<{ name: string; message: string }>;
	failedValidatorsB: Array<{ name: string; message: string }>;
	judgeStatusA: EvalStatus | "skipped";
	judgeStatusB: EvalStatus | "skipped";
	judgeImprovementsA: string[];
	judgeImprovementsB: string[];
	latencyMsA: number;
	latencyMsB: number;
	tokenTotalA: number | null;
	tokenTotalB: number | null;
	anomaliesA: EvalAnomaly[];
	anomaliesB: EvalAnomaly[];
	answerPreviewA: string;
	answerPreviewB: string;
	verdict: TaskVerdict;
	verdictReason: string;
};

export type AggregateTotals = {
	tasksWonA: number;
	tasksWonB: number;
	tasksTied: number;
	tasksIncomparable: number;
	deterministicFailuresA: number;
	deterministicFailuresB: number;
	deterministicWarningsA: number;
	deterministicWarningsB: number;
	judgeFailuresA: number;
	judgeFailuresB: number;
	judgeWarningsA: number;
	judgeWarningsB: number;
	totalLatencyMsA: number;
	totalLatencyMsB: number;
	averageLatencyMsA: number;
	averageLatencyMsB: number;
	totalTokensA: number;
	totalTokensB: number;
	criticalAnomaliesA: number;
	criticalAnomaliesB: number;
	warningAnomaliesA: number;
	warningAnomaliesB: number;
};

export type NormalizedEvalComparison = {
	runA: RunSummary;
	runB: RunSummary;
	flow: string;
	tasks: TaskComparison[];
	aggregate: AggregateTotals;
	winner: "a" | "b" | "tie";
	winnerReason: string;
};

const STATUS_RANK: Record<EvalStatus, number> = {
	pass: 3,
	warn: 2,
	fail: 1,
	unknown: 0,
};

function preview(value: string, maxLength = 160) {
	const compact = value.replace(/\s+/g, " ").trim();
	return compact.length <= maxLength
		? compact
		: `${compact.slice(0, maxLength)}...`;
}

function anomalyCountBySeverity(
	anomalies: EvalAnomaly[],
	severity: AnomalySeverity,
) {
	return anomalies.filter((anomaly) => anomaly.severity === severity).length;
}

function taskVerdict(
	statusA: EvalStatus,
	statusB: EvalStatus,
	latencyMsA: number,
	latencyMsB: number,
): { verdict: TaskVerdict; reason: string } {
	if (statusA === "unknown" || statusB === "unknown") {
		return {
			verdict: "incomparable",
			reason: "Status unknown on at least one side.",
		};
	}

	const rankA = STATUS_RANK[statusA];
	const rankB = STATUS_RANK[statusB];
	if (rankA > rankB)
		return { verdict: "a", reason: `Status ${statusA} beats ${statusB}.` };
	if (rankB > rankA)
		return { verdict: "b", reason: `Status ${statusB} beats ${statusA}.` };

	// tie on status: faster latency wins (lower is better)
	if (latencyMsA !== latencyMsB) {
		const faster = latencyMsA < latencyMsB ? "a" : "b";
		return {
			verdict: faster,
			reason: `Status tied (${statusA}); latency ${latencyMsA}ms vs ${latencyMsB}ms.`,
		};
	}

	return {
		verdict: "tie",
		reason: `Status and latency identical (${statusA}).`,
	};
}

function normalizeLatencyMs(value: unknown): number {
	return typeof value === "number" && Number.isFinite(value) && value >= 0
		? value
		: 0;
}

function normalizeTokens(value: unknown): number {
	return typeof value === "number" && Number.isFinite(value) && value >= 0
		? value
		: 0;
}

function summarizeRun(run: NormalizedEvalRun): RunSummary {
	return {
		runId: run.runId,
		requestedModel: run.requestedModel,
		actualModels: run.actualModels,
		startedAt: run.startedAt,
	};
}

/**
 * Compare two normalized eval runs. Items are matched by `item.id`
 * (dashboard multi-turn: `caseId:turnIndex`). When run B is missing a task
 * present in run A, the task is marked `incomparable` and excluded from the
 * aggregate win/tie counts.
 *
 * The winner is decided by a deterministic tiebreak ladder:
 *   1. tasks won
 *   2. fewer deterministic failures
 *   3. fewer judge failures, then fewer deterministic warnings, then fewer judge warnings
 *   4. fewer critical anomalies, then fewer warning anomalies
 *   5. lower total latency
 *   6. lower total tokens
 *   7. tie
 */
export function compareEvalRuns(
	runA: NormalizedEvalRun,
	runB: NormalizedEvalRun,
): NormalizedEvalComparison {
	const itemsByA = new Map<string, NormalizedEvalItem>();
	for (const item of runA.items) itemsByA.set(item.id, item);

	const itemsByB = new Map<string, NormalizedEvalItem>();
	for (const item of runB.items) itemsByB.set(item.id, item);

	// Stable order: A's item order first, then any B-only items.
	const orderedIds: string[] = [];
	const seen = new Set<string>();
	for (const item of runA.items) {
		if (!seen.has(item.id)) {
			orderedIds.push(item.id);
			seen.add(item.id);
		}
	}
	for (const item of runB.items) {
		if (!seen.has(item.id)) {
			orderedIds.push(item.id);
			seen.add(item.id);
		}
	}

	const tasks: TaskComparison[] = orderedIds.map((id) => {
		const a = itemsByA.get(id);
		const b = itemsByB.get(id);

		if (!a || !b) {
			const present = a ?? b;
			return {
				caseId: present?.caseId ?? id,
				label: present?.label ?? id,
				statusA: a ? a.status : "unknown",
				statusB: b ? b.status : "unknown",
				failedValidatorsA: a
					? a.failedValidators.map((v) => ({
							name: v.name,
							message: v.message,
						}))
					: [],
				failedValidatorsB: b
					? b.failedValidators.map((v) => ({
							name: v.name,
							message: v.message,
						}))
					: [],
				judgeStatusA: a ? a.judgeStatus : "skipped",
				judgeStatusB: b ? b.judgeStatus : "skipped",
				judgeImprovementsA: a ? a.judgeImprovements : [],
				judgeImprovementsB: b ? b.judgeImprovements : [],
				latencyMsA: a ? a.latencyMs : 0,
				latencyMsB: b ? b.latencyMs : 0,
				tokenTotalA: a ? a.tokenTotal : null,
				tokenTotalB: b ? b.tokenTotal : null,
				anomaliesA: a ? a.anomalies : [],
				anomaliesB: b ? b.anomalies : [],
				answerPreviewA: a ? preview(a.answer) : "",
				answerPreviewB: b ? preview(b.answer) : "",
				verdict: "incomparable",
				verdictReason: "Task missing on one side.",
			};
		}

		const { verdict, reason } = taskVerdict(
			a.status,
			b.status,
			a.latencyMs,
			b.latencyMs,
		);

		return {
			caseId: a.caseId,
			label: a.label,
			statusA: a.status,
			statusB: b.status,
			failedValidatorsA: a.failedValidators.map((v) => ({
				name: v.name,
				message: v.message,
			})),
			failedValidatorsB: b.failedValidators.map((v) => ({
				name: v.name,
				message: v.message,
			})),
			judgeStatusA: a.judgeStatus,
			judgeStatusB: b.judgeStatus,
			judgeImprovementsA: a.judgeImprovements,
			judgeImprovementsB: b.judgeImprovements,
			latencyMsA: a.latencyMs,
			latencyMsB: b.latencyMs,
			tokenTotalA: a.tokenTotal,
			tokenTotalB: b.tokenTotal,
			anomaliesA: a.anomalies,
			anomaliesB: b.anomalies,
			answerPreviewA: preview(a.answer),
			answerPreviewB: preview(b.answer),
			verdict,
			verdictReason: reason,
		};
	});

	const comparable = tasks.filter((task) => task.verdict !== "incomparable");
	const tasksWonA = comparable.filter((task) => task.verdict === "a").length;
	const tasksWonB = comparable.filter((task) => task.verdict === "b").length;
	const tasksTied = comparable.filter((task) => task.verdict === "tie").length;
	const tasksIncomparable = tasks.length - comparable.length;

	function failedCount(items: NormalizedEvalItem[]) {
		return items.filter((item) => item.status === "fail").length;
	}
	function warningCount(items: NormalizedEvalItem[]) {
		return items.filter((item) => item.status === "warn").length;
	}
	function judgeFailCount(items: NormalizedEvalItem[]) {
		return items.filter((item) => item.judgeStatus === "fail").length;
	}
	function judgeWarnCount(items: NormalizedEvalItem[]) {
		return items.filter((item) => item.judgeStatus === "warn").length;
	}
	function totalLatency(items: NormalizedEvalItem[]) {
		return items.reduce(
			(total, item) => total + normalizeLatencyMs(item.latencyMs),
			0,
		);
	}
	function totalTokens(items: NormalizedEvalItem[]) {
		return items.reduce(
			(total, item) => total + normalizeTokens(item.tokenTotal),
			0,
		);
	}

	const latencyA = totalLatency(runA.items);
	const latencyB = totalLatency(runB.items);
	const tokensA = totalTokens(runA.items);
	const tokensB = totalTokens(runB.items);

	const aggregate: AggregateTotals = {
		tasksWonA,
		tasksWonB,
		tasksTied,
		tasksIncomparable,
		deterministicFailuresA: failedCount(runA.items),
		deterministicFailuresB: failedCount(runB.items),
		deterministicWarningsA: warningCount(runA.items),
		deterministicWarningsB: warningCount(runB.items),
		judgeFailuresA: judgeFailCount(runA.items),
		judgeFailuresB: judgeFailCount(runB.items),
		judgeWarningsA: judgeWarnCount(runA.items),
		judgeWarningsB: judgeWarnCount(runB.items),
		totalLatencyMsA: latencyA,
		totalLatencyMsB: latencyB,
		averageLatencyMsA: runA.items.length ? latencyA / runA.items.length : 0,
		averageLatencyMsB: runB.items.length ? latencyB / runB.items.length : 0,
		totalTokensA: tokensA,
		totalTokensB: tokensB,
		criticalAnomaliesA: anomalyCountBySeverity(runA.anomalies, "critical"),
		criticalAnomaliesB: anomalyCountBySeverity(runB.anomalies, "critical"),
		warningAnomaliesA: anomalyCountBySeverity(runA.anomalies, "warning"),
		warningAnomaliesB: anomalyCountBySeverity(runB.anomalies, "warning"),
	};

	const winner = decideWinner(aggregate);

	return {
		runA: summarizeRun(runA),
		runB: summarizeRun(runB),
		flow: runA.flow,
		tasks,
		aggregate,
		winner: winner.winner,
		winnerReason: winner.reason,
	};
}

function decideWinner(totals: AggregateTotals): {
	winner: "a" | "b" | "tie";
	reason: string;
} {
	if (totals.tasksWonA !== totals.tasksWonB) {
		const winner = totals.tasksWonA > totals.tasksWonB ? "a" : "b";
		return {
			winner,
			reason: `More tasks won (${totals.tasksWonA} vs ${totals.tasksWonB}).`,
		};
	}
	if (totals.deterministicFailuresA !== totals.deterministicFailuresB) {
		const winner =
			totals.deterministicFailuresA < totals.deterministicFailuresB ? "a" : "b";
		return {
			winner,
			reason: `Fewer deterministic failures (${totals.deterministicFailuresA} vs ${totals.deterministicFailuresB}).`,
		};
	}
	if (totals.judgeFailuresA !== totals.judgeFailuresB) {
		const winner = totals.judgeFailuresA < totals.judgeFailuresB ? "a" : "b";
		return {
			winner,
			reason: `Fewer judge failures (${totals.judgeFailuresA} vs ${totals.judgeFailuresB}).`,
		};
	}
	if (totals.deterministicWarningsA !== totals.deterministicWarningsB) {
		const winner =
			totals.deterministicWarningsA < totals.deterministicWarningsB ? "a" : "b";
		return {
			winner,
			reason: `Fewer deterministic warnings (${totals.deterministicWarningsA} vs ${totals.deterministicWarningsB}).`,
		};
	}
	if (totals.judgeWarningsA !== totals.judgeWarningsB) {
		const winner = totals.judgeWarningsA < totals.judgeWarningsB ? "a" : "b";
		return {
			winner,
			reason: `Fewer judge warnings (${totals.judgeWarningsA} vs ${totals.judgeWarningsB}).`,
		};
	}
	if (totals.criticalAnomaliesA !== totals.criticalAnomaliesB) {
		const winner =
			totals.criticalAnomaliesA < totals.criticalAnomaliesB ? "a" : "b";
		return {
			winner,
			reason: `Fewer critical anomalies (${totals.criticalAnomaliesA} vs ${totals.criticalAnomaliesB}).`,
		};
	}
	if (totals.warningAnomaliesA !== totals.warningAnomaliesB) {
		const winner =
			totals.warningAnomaliesA < totals.warningAnomaliesB ? "a" : "b";
		return {
			winner,
			reason: `Fewer warning anomalies (${totals.warningAnomaliesA} vs ${totals.warningAnomaliesB}).`,
		};
	}
	if (totals.totalLatencyMsA !== totals.totalLatencyMsB) {
		const winner = totals.totalLatencyMsA < totals.totalLatencyMsB ? "a" : "b";
		return {
			winner,
			reason: `Lower total latency (${totals.totalLatencyMsA}ms vs ${totals.totalLatencyMsB}ms).`,
		};
	}
	if (totals.totalTokensA !== totals.totalTokensB) {
		const winner = totals.totalTokensA < totals.totalTokensB ? "a" : "b";
		return {
			winner,
			reason: `Lower total tokens (${totals.totalTokensA} vs ${totals.totalTokensB}).`,
		};
	}
	return { winner: "tie", reason: "All aggregate metrics identical." };
}
