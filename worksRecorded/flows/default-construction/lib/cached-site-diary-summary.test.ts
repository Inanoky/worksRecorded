import { mapConstructionDiaryListRecord } from "../backend/diary-list-record";
import { cachedConstructionSummary } from "./cached-site-diary-summary";
import { getDefaultConstructionProductivitySettings } from "./site-diary-productivity-settings";
import { buildDefaultConstructionScopeSummary } from "./site-diary-summary";

const config = {
	otherSettings: {
		beginSalaryAllocation: {
			costSource: "begin-report",
			sourceReportId: "report",
			planSha256: "plan",
		},
	},
};
const rows = [
	{ Works: "Floor", Location: "A", Amounts: 10 },
	{ Works: "Floor", Location: "B", Amounts: 20 },
	{ Works: "Walls", Location: "B", Amounts: 30 },
].map((r, index) => ({
	...r,
	id: String(index),
	Date: new Date("2026-11-06"),
	Units: "m2",
	WorkersInvolved: 2,
	TimeInvolved: 8,
	evalMetadata: {
		beginSalaryAllocation: {
			kind: "begin-salary-allocation:v1",
			currency: "EUR",
			sourceReportId: "report",
			planSha256: "plan",
			totalCents: 1000,
		},
	},
}));
it.each([
	["project", "project"],
	["location", "A"],
	["work", "Floor"],
] as const)(
	"matches server-side %s calculations from persisted compact rows",
	(scope, value) => {
		const selected = rows.filter(
			(row) =>
				scope === "project" ||
				(scope === "location" ? row.Location === value : row.Works === value),
		);
		expect(
			cachedConstructionSummary(
				{ rows: rows.map(mapConstructionDiaryListRecord), config },
				scope,
				value,
			),
		).toEqual(
			buildDefaultConstructionScopeSummary({
				scope,
				value,
				rows: selected,
				config,
				productivitySettings:
					getDefaultConstructionProductivitySettings(config).works,
			}),
		);
	},
);
