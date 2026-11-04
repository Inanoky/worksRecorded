import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

type PerformanceReport = {
	runLabel?: string;
	results: Array<{
		metrics: Record<string, number>;
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

async function loadReport(path: string) {
	return JSON.parse(await readFile(resolve(path), "utf8")) as PerformanceReport;
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
		const change = ((afterP75 - beforeP75) / beforeP75) * 100;
		const verdict =
			change <= -10
				? "improved"
				: change >= 10
					? "regressed"
					: "no clear change";
		return `| ${metric} | ${beforeP75} | ${afterP75} | ${change > 0 ? "+" : ""}${change.toFixed(1)}% | ${verdict} |`;
	});

	console.log(
		[
			"# Production performance comparison",
			"",
			`Before: ${before.runLabel ?? beforePath}`,
			`After: ${after.runLabel ?? afterPath}`,
			"",
			"| Metric | Before P75 ms | After P75 ms | Change | Verdict |",
			"| --- | ---: | ---: | ---: | --- |",
			...rows,
		].join("\n"),
	);
}

void main();
