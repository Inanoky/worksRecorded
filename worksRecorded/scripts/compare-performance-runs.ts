import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

type PerformanceReport = {
	runLabel?: string;
	projectId?: string;
	benchmark?: {
		id: string;
		flowKey: string | null;
		scenario: string;
		projectName: string | null;
		projectId: string | undefined;
		expectedProjectApiPath: string | null;
	};
	results: Array<{
		metrics: Record<string, number>;
		networkRequests?: Array<{
			journeyPhase: string;
			url: string;
			method: string;
			durationMs: number;
			responseBytes: number | null;
			cacheStatus: string | null;
			failure: string | null;
		}>;
	}>;
};

function percentile(values: number[], percentileValue: number) {
	const sorted = [...values].sort((left, right) => left - right);
	const index = Math.ceil((percentileValue / 100) * sorted.length) - 1;
	return sorted[Math.max(0, index)];
}

function metricValues(report: PerformanceReport, metric: string) {
	return report.results
		.map((result) => result.metrics[metric])
		.filter((value): value is number => value !== undefined);
}

function changeSummary(beforeValue: number, afterValue: number) {
	if (beforeValue === 0) {
		return {
			change: afterValue === 0 ? "0.0%" : "—",
			verdict: afterValue === 0 ? "no clear change" : "regressed",
		};
	}
	const change = ((afterValue - beforeValue) / beforeValue) * 100;
	return {
		change: `${change > 0 ? "+" : ""}${change.toFixed(1)}%`,
		verdict:
			change <= -10
				? "improved"
				: change >= 10
					? "regressed"
					: "no clear change",
	};
}

function requestGroups(report: PerformanceReport) {
	const groups = new Map<string, number[]>();
	for (const result of report.results) {
		for (const request of result.networkRequests ?? []) {
			if (request.failure !== null) continue;
			const key = `${request.method} ${request.url}`;
			groups.set(key, [...(groups.get(key) ?? []), request.durationMs]);
		}
	}
	return groups;
}

function networkMeasureValues(report: PerformanceReport) {
	const values = new Map<string, number[]>();
	for (const result of report.results) {
		const requests = result.networkRequests ?? [];
		const successful = requests.filter((request) => request.failure === null);
		const failed = requests.filter((request) => request.failure !== null);
		const measures = new Map<string, number>([
			[
				"Successful response MB",
				successful.reduce(
					(total, request) => total + (request.responseBytes ?? 0),
					0,
				) / 1_000_000,
			],
			["Failed or cancelled requests", failed.length],
			[
				"ORB-blocked requests",
				failed.filter((request) =>
					request.failure?.includes("ERR_BLOCKED_BY_ORB"),
				).length,
			],
			[
				"WorksRecorded cache MISS requests",
				successful.filter(
					(request) =>
						request.url.startsWith("https://www.worksrecorded.com") &&
						request.cacheStatus === "MISS",
				).length,
			],
		]);
		const phaseBytes = new Map<string, number>();
		for (const request of successful) {
			phaseBytes.set(
				request.journeyPhase,
				(phaseBytes.get(request.journeyPhase) ?? 0) +
					(request.responseBytes ?? 0),
			);
		}
		for (const [phase, bytes] of phaseBytes) {
			measures.set(`Phase MB: ${phase}`, bytes / 1_000_000);
		}
		for (const [measure, value] of measures) {
			values.set(measure, [...(values.get(measure) ?? []), value]);
		}
	}
	return values;
}

async function loadReport(path: string) {
	return JSON.parse(await readFile(resolve(path), "utf8")) as PerformanceReport;
}

function reportIdentity(report: PerformanceReport) {
	return {
		benchmarkId: report.benchmark?.id ?? "legacy-customer-journey",
		projectId: report.benchmark?.projectId ?? report.projectId,
		flowKey: report.benchmark?.flowKey ?? null,
		scenario: report.benchmark?.scenario ?? "projects-diary-warehouse",
	};
}

async function main() {
	const beforePath = process.argv[2];
	const afterPath = process.argv[3];

	if (!beforePath || !afterPath) {
		throw new Error(
			"Usage: npm run perf:compare -- <before-report.json> <after-report.json>",
		);
	}

	const [before, after] = await Promise.all([
		loadReport(beforePath),
		loadReport(afterPath),
	]);
	const beforeIdentity = reportIdentity(before);
	const afterIdentity = reportIdentity(after);
	if (
		beforeIdentity.benchmarkId !== afterIdentity.benchmarkId ||
		beforeIdentity.projectId !== afterIdentity.projectId ||
		beforeIdentity.flowKey !== afterIdentity.flowKey ||
		beforeIdentity.scenario !== afterIdentity.scenario
	) {
		throw new Error(
			`Cannot compare different benchmark targets: ${JSON.stringify(beforeIdentity)} vs ${JSON.stringify(afterIdentity)}.`,
		);
	}
	const metricNames = Array.from(
		new Set(
			[before, after].flatMap((report) =>
				report.results.flatMap((result) => Object.keys(result.metrics)),
			),
		),
	).sort();

	const rows = metricNames.map((metric) => {
		const beforeValues = metricValues(before, metric);
		const afterValues = metricValues(after, metric);
		if (beforeValues.length === 0 || afterValues.length === 0) {
			return `| ${metric} | — | — | — | insufficient samples |`;
		}
		const beforeP75 = percentile(beforeValues, 75);
		const afterP75 = percentile(afterValues, 75);
		const summary = changeSummary(beforeP75, afterP75);
		return `| ${metric} | ${beforeP75} | ${afterP75} | ${summary.change} | ${summary.verdict} |`;
	});
	const beforeRequestGroups = requestGroups(before);
	const afterRequestGroups = requestGroups(after);
	const requestRows = Array.from(beforeRequestGroups.entries())
		.flatMap(([request, beforeValues]) => {
			const afterValues = afterRequestGroups.get(request);
			if (beforeValues.length < 2 || !afterValues || afterValues.length < 2) {
				return [];
			}
			const beforeP75 = percentile(beforeValues, 75);
			const afterP75 = percentile(afterValues, 75);
			if (beforeP75 < 500 && afterP75 < 500) return [];
			const summary = changeSummary(beforeP75, afterP75);
			return [
				{
					request,
					beforeSamples: beforeValues.length,
					afterSamples: afterValues.length,
					beforeP75,
					afterP75,
					summary,
				},
			];
		})
		.sort((left, right) => right.beforeP75 - left.beforeP75)
		.slice(0, 30)
		.map(
			(row) =>
				`| ${row.request} | ${row.beforeSamples} | ${row.afterSamples} | ${row.beforeP75} | ${row.afterP75} | ${row.summary.change} | ${row.summary.verdict} |`,
		);
	const beforeNetworkMeasures = networkMeasureValues(before);
	const afterNetworkMeasures = networkMeasureValues(after);
	const networkMeasureRows = Array.from(beforeNetworkMeasures.entries())
		.flatMap(([measure, beforeValues]) => {
			const afterValues = afterNetworkMeasures.get(measure);
			if (!afterValues?.length) return [];
			const beforeP75 = percentile(beforeValues, 75);
			const afterP75 = percentile(afterValues, 75);
			const summary = changeSummary(beforeP75, afterP75);
			return [
				`| ${measure} | ${beforeP75.toFixed(2)} | ${afterP75.toFixed(2)} | ${summary.change} | ${summary.verdict} |`,
			];
		})
		.sort();

	console.log(
		[
			"# Production performance comparison",
			"",
			`Benchmark ID: ${beforeIdentity.benchmarkId}`,
			`Flow: ${beforeIdentity.flowKey ?? "unspecified"}`,
			`Scenario: ${beforeIdentity.scenario}`,
			`Project ID: ${beforeIdentity.projectId ?? "unspecified"}`,
			`Before: ${before.runLabel ?? beforePath}`,
			`After: ${after.runLabel ?? afterPath}`,
			"",
			"| Metric | Before P75 ms | After P75 ms | Change | Verdict |",
			"| --- | ---: | ---: | ---: | --- |",
			...rows,
			"",
			"## Network request timing",
			"",
			"Only successful request groups with at least two samples in each report and a P75 of at least 500 ms are included.",
			"",
			"| Request | Before samples | After samples | Before P75 ms | After P75 ms | Change | Verdict |",
			"| --- | ---: | ---: | ---: | ---: | ---: | --- |",
			...requestRows,
			"",
			"## Network volume and failures",
			"",
			"| Measure | Before P75 | After P75 | Change | Verdict |",
			"| --- | ---: | ---: | ---: | --- |",
			...networkMeasureRows,
		].join("\n"),
	);
}

void main();
