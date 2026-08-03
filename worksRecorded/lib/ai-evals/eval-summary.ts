import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
	loadEvalReports,
	type NormalizedEvalItem,
	type NormalizedEvalRun,
} from "./report-loader";

const DEFAULT_FLOWS = [
	"dashboard-chat",
	"whatsapp-site-manager",
	"whatsapp-worker",
];

function getArgValue(name: string) {
	const index = process.argv.indexOf(name);
	return index >= 0 ? process.argv[index + 1] : undefined;
}

function selectedFlows() {
	const flow = getArgValue("--flow") ?? "all";
	if (flow === "all") return DEFAULT_FLOWS;
	return flow
		.split(",")
		.map((item) => item.trim())
		.filter(Boolean)
		.map((item) => (item === "dashboard" ? "dashboard-chat" : item));
}

function newestByFlow(reports: NormalizedEvalRun[], flows: string[]) {
	const selected: NormalizedEvalRun[] = [];
	for (const flow of flows) {
		const report = reports.find((item) => item.flow === flow);
		if (report) selected.push(report);
	}
	return selected;
}

function formatDate(value: string | null) {
	if (!value) return "unknown";
	return new Date(value).toISOString();
}

function formatMs(value: unknown) {
	return typeof value === "number" && Number.isFinite(value)
		? `${Math.round(value)}ms`
		: "n/a";
}

function preview(value: string, maxLength = 260) {
	const compact = value.replace(/\s+/g, " ").trim();
	if (!compact) return "n/a";
	return compact.length <= maxLength
		? compact
		: `${compact.slice(0, maxLength - 3)}...`;
}

function escapeCell(value: unknown) {
	return String(value ?? "")
		.replace(/\|/g, "\\|")
		.replace(/\r?\n/g, "<br>");
}

function countRunIssues(run: NormalizedEvalRun) {
	return {
		failedValidators: run.items.reduce(
			(total, item) => total + item.failedValidators.length,
			0,
		),
		warningValidators: run.items.reduce(
			(total, item) => total + item.warningValidators.length,
			0,
		),
		judgeFailures: run.items.filter((item) => item.judgeStatus === "fail")
			.length,
		judgeWarnings: run.items.filter((item) => item.judgeStatus === "warn")
			.length,
		criticalAnomalies: run.anomalies.filter(
			(item) => item.severity === "critical",
		).length,
		warningAnomalies: run.anomalies.filter(
			(item) => item.severity === "warning",
		).length,
	};
}

function needsReview(item: NormalizedEvalItem) {
	return (
		item.status === "fail" ||
		item.status === "warn" ||
		item.judgeStatus === "fail" ||
		item.judgeStatus === "warn" ||
		item.failedValidators.length > 0 ||
		item.warningValidators.length > 0 ||
		item.anomalies.length > 0
	);
}

function validatorMessages(item: NormalizedEvalItem) {
	return [...item.failedValidators, ...item.warningValidators]
		.map((validator) => {
			const label = validator.name || "validator";
			const severity = validator.severity ? `/${validator.severity}` : "";
			return `${label}${severity}: ${validator.message || "No message"}`;
		})
		.join("\n");
}

function judgeConclusion(item: NormalizedEvalItem) {
	const parts = [];
	if (item.judgeStatus !== "skipped" && item.judgeStatus !== "unknown") {
		parts.push(`status: ${item.judgeStatus}`);
	}
	if (item.judgeExplanation) parts.push(item.judgeExplanation);
	if (item.judgeImprovements.length) {
		parts.push(`improvements: ${item.judgeImprovements.join("; ")}`);
	}
	return parts.join("\n");
}

function anomalyMessages(item: NormalizedEvalItem) {
	return item.anomalies
		.map((anomaly) => `${anomaly.severity}/${anomaly.code}: ${anomaly.message}`)
		.join("\n");
}

function renderRunTable(runs: NormalizedEvalRun[]) {
	const lines = [
		"| Flow | Status | Run ID | Model | Items | Failures | Warnings | Anomalies | Report |",
		"| --- | --- | --- | --- | ---: | ---: | ---: | ---: | --- |",
	];

	for (const run of runs) {
		const issues = countRunIssues(run);
		lines.push(
			`| ${escapeCell(run.flow)} | ${escapeCell(run.status)} | ${escapeCell(run.runId)} | ${escapeCell(run.model ?? run.requestedModel ?? "n/a")} | ${run.items.length} | ${issues.failedValidators + issues.judgeFailures} | ${issues.warningValidators + issues.judgeWarnings} | ${issues.criticalAnomalies + issues.warningAnomalies} | ${escapeCell(run.fileName)} |`,
		);
	}

	return lines.join("\n");
}

function renderReviewItems(runs: NormalizedEvalRun[]) {
	const reviewItems = runs.flatMap((run) =>
		run.items.filter(needsReview).map((item) => ({ run, item })),
	);

	if (!reviewItems.length)
		return "No failed, warned, or anomalous tasks found.";

	const lines = [
		"| Flow | Task | Status | Failed validators | Judge conclusion | Anomalies | Input | Answer / outbound |",
		"| --- | --- | --- | --- | --- | --- | --- | --- |",
	];

	for (const { run, item } of reviewItems) {
		const answer = item.answer || item.outboundMessages.join("\n\n");
		lines.push(
			`| ${escapeCell(run.flow)} | ${escapeCell(item.label)} | ${escapeCell(`${item.status} / judge ${item.judgeStatus}`)} | ${escapeCell(validatorMessages(item) || "n/a")} | ${escapeCell(judgeConclusion(item) || "n/a")} | ${escapeCell(anomalyMessages(item) || "n/a")} | ${escapeCell(preview(item.input))} | ${escapeCell(preview(answer))} |`,
		);
	}

	return lines.join("\n");
}

function renderReport(runs: NormalizedEvalRun[], missingFlows: string[]) {
	const status = runs.some((run) => run.status === "fail")
		? "FAIL"
		: runs.some((run) => run.status === "warn")
			? "PASS_WITH_WARNINGS"
			: runs.length
				? "PASS"
				: "NO_REPORTS";
	const started = runs
		.map((run) => run.startedAt)
		.filter((value): value is string => Boolean(value))
		.sort()[0];
	const finished = runs
		.map((run) => run.finishedAt)
		.filter((value): value is string => Boolean(value))
		.sort();
	const finishedAt = finished[finished.length - 1];

	return [
		"# AI Eval Report",
		"",
		`**Status:** ${status}`,
		`**Reports:** ${runs.length}`,
		`**Started:** ${formatDate(started ?? null)}`,
		`**Finished:** ${formatDate(finishedAt ?? null)}`,
		missingFlows.length
			? `**Missing requested flows:** ${missingFlows.join(", ")}`
			: "",
		"",
		"## Run Summary",
		"",
		runs.length ? renderRunTable(runs) : "No reports were generated.",
		"",
		"## Failed / Needs Review Tasks",
		"",
		renderReviewItems(runs),
		"",
		"## Latency",
		"",
		...runs.map(
			(run) =>
				`- ${run.flow}: average ${formatMs(run.latency.averageMs)}, total ${formatMs(run.latency.totalMs)}`,
		),
		"",
		"Raw JSON reports are available in the `ai-eval-results` artifact.",
	].join("\n");
}

async function main() {
	const reportsDir = getArgValue("--results-dir");
	const flows = selectedFlows();
	const reports = await loadEvalReports(reportsDir);
	const selected = newestByFlow(reports, flows);
	const selectedFlowSet = new Set(selected.map((run) => run.flow));
	const missingFlows = flows.filter((flow) => !selectedFlowSet.has(flow));
	const markdown = `${renderReport(selected, missingFlows)}\n`;
	const outputDir = reportsDir ?? path.join(process.cwd(), ".ai-eval-results");

	await mkdir(outputDir, { recursive: true });
	await writeFile(path.join(outputDir, "summary.md"), markdown, "utf8");
	console.log(markdown);
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
