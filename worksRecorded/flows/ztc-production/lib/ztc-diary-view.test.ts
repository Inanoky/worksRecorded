import { createZtcDiaryView } from "@/flows/ztc-production/lib/ztc-diary-view";
import { buildZtcScopeSummary } from "@/flows/ztc-production/lib/ztc-scope-summary";
import type { ZtcDiaryRow } from "@/flows/ztc-production/lib/ztc-site-diary-utils";

const rates = [
	{
		projectName: "Visi projekti",
		works: [
			{
				task: "Latojums 25x45",
				rate: "2",
				unit: "m2" as const,
				laborNorm: "0.2",
			},
		],
		additionalDetails: [
			{ task: "Kronšteins", rate: "3", unit: "gab" as const },
		],
	},
];
const row: ZtcDiaryRow = {
	id: "a",
	Date: "2026-11-04T10:00:00",
	Date_Custom_1: "2026-11-04T09:00:00",
	Date_Custom_2: "2026-11-04T10:00:00",
	Location: "Projekts A",
	Location_Custom_1: "Siena 1",
	Works: "Latojums 25x45",
	createdBy: "Jānis Bērziņš",
	Units: "m2",
	Amounts: "10",
	Location_Custom_2: "2",
	TimeInvolved: "1",
};
const rows: ZtcDiaryRow[] = [
	row,
	{
		...row,
		id: "b",
		Location_Custom_1: "Siena 2",
		createdBy: "Anna Kalniņa",
		Date: "2026-11-05T23:59:59",
	},
	{ ...row, id: "c", Location: "Projekts B", Location_Custom_1: "Siena 3" },
	{
		...row,
		id: "d",
		Works: "Kronšteins",
		Works_Custom_1: "Papilddetāļas",
		Units: "gab",
		Amounts: "2",
		Location_Custom_2: "3",
		Comments_Custom_2: JSON.stringify({ mainWork: "Latojums 25x45" }),
	},
];

describe("ZTC local diary view", () => {
	it("filters across the complete snapshot and restores it when filters are cleared", () => {
		const view = createZtcDiaryView(rows, rates);
		expect(
			view
				.select({
					projectName: "Projekts A",
					elementName: "Siena 1",
					workerName: "Jānis Bērziņš",
					workName: "Latojums 25x45",
				})
				.rows.map((row) => row.id),
		).toEqual(["a", "d"]);
		expect(view.select({ keyword: "Anna" }).rows.map((row) => row.id)).toEqual([
			"b",
		]);
		expect(
			view.select({
				projectName: "__ALL__",
				elementName: "__ALL__",
				workerName: "__ALL__",
				workName: "__ALL__",
				keyword: "",
			}).rows,
		).toEqual(rows);
		expect(
			view.summary({
				projectName: "__ALL__",
				elementName: "__ALL__",
				workerName: "__ALL__",
			}),
		).toBeNull();
	});

	it("keeps each filter's alternatives available while applying the other filters", () => {
		const view = createZtcDiaryView(rows, rates);
		const selected = view.select({
			projectName: "Projekts A",
			elementName: "Siena 1",
		});
		expect(selected.options).toEqual({
			projects: ["Projekts A"],
			elements: ["Siena 1", "Siena 2"],
			workers: ["Jānis Bērziņš"],
			works: ["Kronšteins", "Latojums 25x45"],
		});
		expect(view.select({ projectName: "Projekts A" }).options.projects).toEqual(
			["Projekts A", "Projekts B"],
		);
		expect(
			view.select({ workerName: "Jānis Bērziņš" }).options.workers,
		).toEqual(["Anna Kalniņa", "Jānis Bērziņš"]);
	});

	it("uses inclusive local date bounds without mutating the selected dates", () => {
		const dateFrom = new Date("2026-11-05T12:00:00");
		const dateTo = new Date("2026-11-05T12:00:00");
		const view = createZtcDiaryView(rows, rates);
		expect(view.select({ dateFrom, dateTo }).rows.map((row) => row.id)).toEqual(
			["b"],
		);
		expect(dateFrom.getHours()).toBe(12);
		expect(dateTo.getHours()).toBe(12);
		const summary = view.summary({
			workerName: "Anna Kalniņa",
			dateFrom,
			dateTo,
		});
		expect(summary).toMatchObject({
			worker: "Anna Kalniņa",
			filtered: true,
			rows: 1,
			hours: 1,
			money: 20,
		});
		expect(dateFrom.getHours()).toBe(12);
		expect(dateTo.getHours()).toBe(12);
	});

	it("summarizes all matching rows beyond the displayed page", () => {
		const source = Array.from({ length: 160 }, (_, index) => ({
			...row,
			id: `row-${index}`,
		}));
		const view = createZtcDiaryView(source, rates);
		expect(view.select({ projectName: "Projekts A" }).rows).toHaveLength(160);
		expect(view.summary({ projectName: "Projekts A" })).toMatchObject({
			rows: 160,
			hours: 160,
			money: 3200,
			technicalHours: 160,
		});
	});

	it("preserves project-wide totals and narrows worker totals by date and work", () => {
		const view = createZtcDiaryView(rows, rates);
		expect(
			view.summary({
				projectName: "Projekts A",
				dateFrom: "2026-11-05",
				keyword: "no match",
			}),
		).toMatchObject({ rows: 3, money: 46 });
		expect(
			view.summary({
				projectName: "Projekts A",
				workerName: "Anna Kalniņa",
				workName: "Latojums 25x45",
				dateFrom: "2026-11-05",
				dateTo: "2026-11-05",
			}),
		).toMatchObject({ rows: 1, money: 20, filtered: true });
		expect(view.summary({ projectName: "Projekts A" })).toEqual(
			buildZtcScopeSummary(rows, rates, { projectName: "Projekts A" }),
		);
	});

	it("uses updated rows and rates after a refresh or edit", () => {
		const changed = [{ ...row, Location_Custom_2: "4", TimeInvolved: "2" }];
		const changedRates = [
			{ ...rates[0], works: [{ ...rates[0].works[0], laborNorm: "0.5" }] },
		];
		const view = createZtcDiaryView(changed, changedRates);
		expect(view.summary({ projectName: "Projekts A" })).toMatchObject({
			rows: 1,
			money: 40,
			hours: 2,
			laborNormTotal: { planned: 0.5 },
		});
	});
});
