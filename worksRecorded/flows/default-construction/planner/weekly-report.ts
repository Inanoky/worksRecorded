import type { loadConstructionWeek } from "@/server/actions/construction-planner";
import { addDays, type Comparison, comparePlans } from "./model";
import { getWeeklyReportMessages } from "./weekly-report-i18n";

export type WeeklyReport = Awaited<ReturnType<typeof loadConstructionWeek>> & {
	organizationLanguage?: string | null;
};
export type ReportRow = {
	cells: string[];
	status: Comparison["status"];
	note: string;
};
export type ReportDay = {
	date: string;
	title: string;
	summary: string;
	rows: ReportRow[];
};

export function weeklyReportDays(report: WeeklyReport): ReportDay[] {
	const t = getWeeklyReportMessages(report.organizationLanguage);
	const numberFormat = new Intl.NumberFormat(t.locale, {
		maximumFractionDigits: 20,
	});
	const costFormat = new Intl.NumberFormat(t.locale, {
		style: "currency",
		currency: "EUR",
	});
	const number = (value: number | null | undefined) =>
		value == null || value === 0 ? "—" : numberFormat.format(value);
	const money = (value: number | null | undefined) =>
		value == null ? "—" : costFormat.format(value);
	const statusLabels = t.status;
	const comparisons = comparePlans(report.plans, report.actuals, report.today);
	const byActual = new Map(
		comparisons.flatMap((row) => row.actualIds.map((id) => [id, row] as const)),
	);
	return Array.from({ length: 7 }, (_, index) => {
		const date = addDays(report.start, index);
		const actuals = report.actuals.filter((row) => row.date === date);
		const plans = report.plans.filter((row) => row.date === date);
		const seen = new Set<string>();
		const rows: ReportRow[] = actuals.map((actual) => {
			const comparison = byActual.get(actual.id);
			const repeated = comparison?.plan && seen.has(comparison.key);
			if (comparison) seen.add(comparison.key);
			return {
				cells: [
					actual.time || "—",
					actual.location || "—",
					repeated ? t.shared : (comparison?.plan?.work ?? "—"),
					actual.work || "—",
					actual.unit || "—",
					repeated ? t.shared : number(comparison?.plan?.quantity),
					number(actual.quantity),
					number(actual.workers),
					number(actual.hours),
					number(actual.manHours),
					money(actual.cost),
					actual.comments || "—",
				],
				status: comparison?.status ?? "unplanned",
				note: comparison
					? `${statusLabels[comparison.status]}${comparison.actualIds.length > 1 ? `\n${t.dailyTotal}: ${number(comparison.actualQuantity)} ${comparison.unit}` : ""}`
					: t.status.unplanned,
			};
		});
		for (const row of comparisons.filter(
			(item) => item.date === date && item.plan && !item.actualIds.length,
		)) {
			rows.push({
				cells: [
					"—",
					row.location || "—",
					row.plan?.work ?? "—",
					"—",
					row.unit || "—",
					number(row.plan?.quantity),
					"—",
					"—",
					"—",
					"—",
					"—",
					"—",
				],
				status: row.status,
				note: statusLabels[row.status],
			});
		}
		const costs = actuals.flatMap((row) =>
			row.cost == null ? [] : [row.cost],
		);
		return {
			date,
			title: new Intl.DateTimeFormat(t.locale, {
				weekday: "short",
				year: "numeric",
				month: "long",
				day: "numeric",
				timeZone: "UTC",
			}).format(new Date(date)),
			summary: `${t.tasks}: ${numberFormat.format(actuals.length)} · ${t.plannedTasks}: ${numberFormat.format(plans.length)} · ${t.dailyCost}: ${money(costs.length ? costs.reduce((sum, cost) => sum + cost, 0) : null)}`,
			rows,
		};
	});
}

export const reportColumns = [
	{ width: 4.5, align: "left" },
	{ width: 8, align: "left" },
	{ width: 13, align: "left" },
	{ width: 13, align: "left" },
	{ width: 4, align: "center" },
	{ width: 7, align: "center" },
	{ width: 7, align: "center" },
	{ width: 5, align: "center" },
	{ width: 5, align: "center" },
	{ width: 6, align: "center" },
	{ width: 7.5, align: "right" },
	{ width: 20, align: "left" },
] as const;

export function escapeReportText(value: string) {
	return value.replace(
		/[&<>"']/g,
		(char) =>
			({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
				char
			] ?? char,
	);
}
