import { parseZtcLaborNormNumber } from "@/flows/ztc-production/lib/ztc-labor-norm";
import type { ZtcRateProject } from "@/flows/ztc-production/lib/ztc-rate-resolver";
import {
	resolveZtcRateTaskForRow,
	ztcRowMatchesConfiguredWorkFilter,
} from "@/flows/ztc-production/lib/ztc-rate-resolver";
import {
	buildZtcLaborNormSummaryRows,
	buildZtcLaborNormTotalSummary,
	buildZtcProductivitySummary,
	getZtcElementTotalAreaM2,
	getZtcPayrollValues,
	getZtcProjectTotalAreaM2,
	hasZtcPlannedLaborNorm as hasZtcSummaryPlannedLaborNorm,
	isZtcAdditionalDetailsRow as isZtcSummaryAdditionalDetailsRow,
	isZtcAdditionalWorkRow as isZtcSummaryAdditionalWorkRow,
	isZtcQualityRow as isZtcSummaryQualityRow,
	type ZtcDiaryRow,
} from "@/flows/ztc-production/lib/ztc-site-diary-utils";

export type ZtcScopeFilters = {
	projectName?: string | null;
	elementName?: string | null;
	workerName?: string | null;
	dateFrom?: string | Date | null;
	dateTo?: string | Date | null;
	workName?: string | null;
	keyword?: string | null;
};

function normalizeDate(value: unknown) {
	if (!value) return undefined;
	const date = new Date(String(value));
	return Number.isNaN(date.getTime()) ? undefined : date;
}

export function buildZtcScopeSummary(
	source: ZtcDiaryRow[],
	defaultRates: ZtcRateProject[],
	args: ZtcScopeFilters,
	resolveRateTask = (row: ZtcDiaryRow) =>
		resolveZtcRateTaskForRow(row, defaultRates),
) {
	const projectName = String(args.projectName ?? "").trim();
	const elementName = String(args.elementName ?? "").trim();
	const workerName = String(args.workerName ?? "").trim();
	const workName = String(args.workName ?? "").trim();
	const keyword = String(args.keyword ?? "")
		.trim()
		.toLowerCase();
	const dateFrom = normalizeDate(args.dateFrom);
	const dateTo = normalizeDate(args.dateTo);
	const dateFilter: Record<string, Date> = {};
	if (dateFrom) {
		dateFrom.setHours(0, 0, 0, 0);
		dateFilter.gte = dateFrom;
	}
	if (dateTo) {
		dateTo.setHours(23, 59, 59, 999);
		dateFilter.lte = dateTo;
	}
	if (
		!projectName &&
		!elementName &&
		!workerName &&
		!workName &&
		!keyword &&
		Object.keys(dateFilter).length === 0
	)
		return null;

	const mappedRows = source.filter((row) => {
		if (projectName && row.Location !== projectName) return false;
		if (elementName && row.Location_Custom_1 !== elementName) return false;
		const date = new Date(row.Date).getTime();
		if (dateFilter.gte && date < dateFilter.gte.getTime()) return false;
		if (dateFilter.lte && date > dateFilter.lte.getTime()) return false;
		return true;
	});
	const normalizedWorkerName = workerName.toLowerCase();
	let rows = workerName
		? mappedRows.filter(
				(row) =>
					String(row.createdBy ?? "")
						.trim()
						.toLowerCase() === normalizedWorkerName,
			)
		: mappedRows;
	if (keyword) {
		rows = rows.filter((row) =>
			[
				row.Works,
				row.Location,
				row.Location_Custom_1,
				row.createdBy,
				row.Comments,
				row.Units,
			]
				.filter(Boolean)
				.join(" ")
				.toLowerCase()
				.includes(keyword),
		);
	}
	if (workName) {
		rows = rows.filter((row) =>
			ztcRowMatchesConfiguredWorkFilter(row, workName, defaultRates),
		);
	}
	const elementTotalAreaM2 = elementName
		? getZtcElementTotalAreaM2(rows, elementName)
		: null;
	const projectTotalAreaM2 = projectName
		? getZtcProjectTotalAreaM2(rows, projectName)
		: null;
	const resolvedRates = new Map<
		ZtcDiaryRow,
		ReturnType<typeof resolveRateTask>
	>();
	const resolveRateTaskFromRates = (row: ZtcDiaryRow) => {
		if (!resolvedRates.has(row)) resolvedRates.set(row, resolveRateTask(row));
		return resolvedRates.get(row);
	};
	const resolvePlannedLaborNormFromRates = (row: ZtcDiaryRow) =>
		parseZtcLaborNormNumber(resolveRateTaskFromRates(row)?.entry.laborNorm);
	const totals = rows.reduce(
		(acc, row) => {
			const payroll = getZtcPayrollValues(row);
			acc.hours += payroll.hours;
			const isTechnicalRow =
				!isZtcSummaryQualityRow(row) &&
				!isZtcSummaryAdditionalWorkRow(row) &&
				!isZtcSummaryAdditionalDetailsRow(row);
			if (
				isTechnicalRow &&
				hasZtcSummaryPlannedLaborNorm(row, resolvePlannedLaborNormFromRates)
			) {
				acc.technicalHours += payroll.hours;
			}
			acc.money += payroll.sum;
			if (
				elementName &&
				elementTotalAreaM2 == null &&
				payroll.amountM2 > acc.elementM2
			) {
				acc.elementM2 = payroll.amountM2;
			}
			return acc;
		},
		{ hours: 0, technicalHours: 0, money: 0, elementM2: 0 },
	);

	const relatedAdditionalRows = Array.from(
		rows
			.reduce(
				(groups, row) => {
					const type = isZtcSummaryAdditionalDetailsRow(row)
						? "Papilddetāļas"
						: isZtcSummaryAdditionalWorkRow(row)
							? "Papilddarbi"
							: null;
					if (!type) return groups;

					const task = String(row.Works ?? "").trim() || "—";
					const unit = String(row.Units ?? "").trim() || "—";
					const key = `${type}::${task}::${unit}`;
					const payroll = getZtcPayrollValues(row);
					const existing = groups.get(key) ?? {
						type,
						task,
						unit,
						amount: 0,
						hours: 0,
						sum: 0,
					};

					existing.amount += payroll.amountM2;
					existing.hours += payroll.hours;
					existing.sum += payroll.sum;
					groups.set(key, existing);
					return groups;
				},
				new Map<
					string,
					{
						type: string;
						task: string;
						unit: string;
						amount: number;
						hours: number;
						sum: number;
					}
				>(),
			)
			.values(),
	)
		.map((row) => ({
			...row,
			amount: Number(row.amount.toFixed(2)),
			hours: Number(row.hours.toFixed(2)),
			sum: Number(row.sum.toFixed(2)),
		}))
		.sort(
			(a, b) =>
				a.type.localeCompare(b.type, "lv") ||
				a.task.localeCompare(b.task, "lv"),
		);

	const scopeAreaM2 = elementName
		? (elementTotalAreaM2 ?? (totals.elementM2 > 0 ? totals.elementM2 : null))
		: projectName
			? projectTotalAreaM2
			: null;

	return {
		project: projectName || null,
		element: elementName || null,
		worker: workerName || null,
		filtered: Boolean(
			workName || keyword || Object.keys(dateFilter).length > 0,
		),
		rows: rows.length,
		hours: totals.hours,
		technicalHours: Number(totals.technicalHours.toFixed(2)),
		money: totals.money,
		costPerM2:
			scopeAreaM2 != null && scopeAreaM2 > 0
				? Number((totals.money / scopeAreaM2).toFixed(2))
				: null,
		productivity: workerName ? buildZtcProductivitySummary(rows) : null,
		elementM2: elementName
			? (elementTotalAreaM2 ?? totals.elementM2)
			: projectName
				? projectTotalAreaM2
				: null,
		laborNormRows: buildZtcLaborNormSummaryRows(rows, {
			requirePlannedLaborNorm: true,
			resolvePlannedLaborNorm: resolvePlannedLaborNormFromRates,
			resolveCanonicalTask: (row) =>
				resolveRateTaskFromRates(row)?.canonicalTask,
		}),
		laborNormTotal: buildZtcLaborNormTotalSummary(rows, {
			plannedAmountM2: scopeAreaM2,
			actualAmountM2: scopeAreaM2,
			requirePlannedLaborNorm: true,
			resolvePlannedLaborNorm: resolvePlannedLaborNormFromRates,
			resolveCanonicalTask: (row) =>
				resolveRateTaskFromRates(row)?.canonicalTask,
		}),
		relatedAdditionalRows,
	};
}
