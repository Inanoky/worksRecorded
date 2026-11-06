import {
	type DefaultConstructionCostRecord,
	getDefaultConstructionProductivitySettings,
} from "./site-diary-productivity-settings";
import {
	buildDefaultConstructionScopeSummary,
	type DefaultConstructionSummaryScope,
} from "./site-diary-summary";

export type CachedConstructionSummaryData = {
	rows: Array<
		DefaultConstructionCostRecord & {
			Date?: Date | string | null;
			Location?: string | null;
		}
	>;
	config: Record<string, unknown>;
};
export function cachedConstructionSummary(
	data: CachedConstructionSummaryData,
	scope: DefaultConstructionSummaryScope,
	value = "project",
) {
	const rows = data.rows
		.filter(
			(row) =>
				scope === "project" ||
				(scope === "location" ? row.Location === value : row.Works === value),
		)
		.map((row) => ({
			...row,
			Amounts:
				row.Amounts === "" ||
				row.Amounts == null ||
				!Number.isFinite(Number(row.Amounts))
					? null
					: Number(row.Amounts),
			...(row.beginSalaryAllocation
				? { evalMetadata: { beginSalaryAllocation: row.beginSalaryAllocation } }
				: {}),
		}));
	return buildDefaultConstructionScopeSummary({
		scope,
		value,
		rows,
		config: data.config,
		productivitySettings: getDefaultConstructionProductivitySettings(
			data.config,
		).works,
	});
}
