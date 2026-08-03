import { loadEvalReports, type NormalizedEvalRun } from "./report-loader";

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
		.filter(Boolean);
}

function newestByFlow(reports: NormalizedEvalRun[], flows: string[]) {
	const selected: NormalizedEvalRun[] = [];
	for (const flow of flows) {
		const report = reports.find((item) => item.flow === flow);
		if (!report) throw new Error(`No AI eval report found for flow ${flow}.`);
		selected.push(report);
	}
	return selected;
}

async function main() {
	const reportsDir = getArgValue("--results-dir");
	const flows = selectedFlows();
	const reports = await loadEvalReports(reportsDir);
	const selected = newestByFlow(reports, flows);

	let criticalFailures = 0;
	let warnings = 0;

	console.log("AI eval deployment gate:");
	for (const report of selected) {
		const criticalAnomalies = report.anomalies.filter(
			(item) => item.severity === "critical",
		).length;
		const warningAnomalies = report.anomalies.filter(
			(item) => item.severity === "warning",
		).length;
		const warningValidators = report.items.reduce(
			(count, item) => count + item.warningValidators.length,
			0,
		);
		const failedValidators = report.items.reduce(
			(count, item) => count + item.failedValidators.length,
			0,
		);
		const flowFailed = report.status === "fail" || criticalAnomalies > 0;
		if (flowFailed) criticalFailures += 1;
		if (
			report.status === "warn" ||
			warningAnomalies > 0 ||
			warningValidators > 0
		)
			warnings += 1;

		console.log(
			JSON.stringify(
				{
					flow: report.flow,
					runId: report.runId,
					status: report.status,
					failedValidators,
					warningValidators,
					criticalAnomalies,
					warningAnomalies,
					fileName: report.fileName,
				},
				null,
				2,
			),
		);
	}

	console.log(
		JSON.stringify(
			{
				result:
					criticalFailures > 0
						? "FAIL"
						: warnings > 0
							? "PASS_WITH_WARNINGS"
							: "PASS",
				checkedFlows: flows,
				criticalFailures,
				warnings,
			},
			null,
			2,
		),
	);

	if (criticalFailures > 0) process.exitCode = 1;
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
