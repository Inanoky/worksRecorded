import type { Forma2ActualSource } from "./forma2-analytics";

export function forma2UnmatchedBeginSources(
	config: Record<string, any>,
): Forma2ActualSource[] {
	const payroll = config.otherSettings?.beginSalaryAllocation;
	if (payroll?.costSource !== "begin-report" || !payroll.unmatchedPositionId)
		return [];
	const included = new Set(payroll.includedUnmatchedSourceIds ?? []);
	return (
		Array.isArray(payroll.unallocated) ? payroll.unallocated : []
	).flatMap((row: any) => {
		if (!included.has(row.sourceId) || !Number.isSafeInteger(row.costCents))
			return [];
		const [day, month, year] = String(row.date ?? "").split(".");
		return [
			{
				id: `begin:${payroll.sourceReportId}:${row.sourceId}`,
				type: "work" as const,
				selectedPositionId: payroll.unmatchedPositionId,
				label: `Begin · ${row.worker} · ${row.sourceCell}`,
				secondaryLabel: [row.workType, row.comment, row.reason]
					.filter(Boolean)
					.join(" · "),
				date:
					year && month && day ? `${year}-${month}-${day}T00:00:00.000Z` : null,
				unit: "h",
				quantity: null,
				reportedQuantity: null,
				hours:
					typeof row.sourceMinutes === "number" ? row.sourceMinutes / 60 : null,
				costSource: "begin-report" as const,
				actualCost: row.costCents / 100,
			},
		];
	});
}
