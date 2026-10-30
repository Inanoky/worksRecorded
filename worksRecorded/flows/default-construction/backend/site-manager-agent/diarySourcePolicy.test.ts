import {
	canClarifyPreviousDiaryReport,
	isContextOnlyDiaryAmount,
	isMaterialOnlyDiaryClarification,
	normalizeDiarySourceRows,
} from "./diarySourcePolicy";

const config = {
	Works: {
		Type: "dropdown",
		DropDownOptions: { notes: "Piezīmes", ballast: "Balasts" },
	},
};

describe("diary source safeguards", () => {
	it("does not count tomorrow's 60 m3 as completed work", () => {
		const rows = normalizeDiarySourceRows(
			[
				{
					Date: "2026-10-26",
					Works: "Balasts",
					Amounts: 60,
					Units: "m3",
					Comments: "Izplanēt šķembu.",
				},
			],
			"Rīt paliek maza astīte balastam un jāizplanē 60m3 noraktā šķemba",
			config,
		);
		expect(rows[0]).toMatchObject({
			Works: "Piezīmes",
			Amounts: null,
			Units: null,
			TimeInvolved: null,
		});
		expect(rows[0].Comments).toContain("Plānots:");
	});
	it("keeps today's quantity when tomorrow's plan is in the same message", () => {
		const rows = normalizeDiarySourceRows(
			[
				{ Amounts: 100, Units: "m3", Works: "Balasts" },
				{ Amounts: 60, Units: "m3", Works: "Balasts" },
			],
			"Šodien iestrādāti 100m3. Rīt jāizplanē 60m3.",
			config,
		);
		expect(rows[0].Amounts).toBe(100);
		expect(rows[1]).toMatchObject({ Amounts: null, Works: "Piezīmes" });
	});
	it("uses the explicit completion date, not the receipt date", () => {
		expect(
			normalizeDiarySourceRows(
				[{ Date: "2026-10-28" }],
				"Objektā darbi pabeigti 27.10. Pl. 14:00.",
				config,
			)[0].Date,
		).toBe("2026-10-27T00:00:00.000Z");
	});
	it("keeps incompatible measured scope for review without inventing a unit conversion", () => {
		const catalog = {
			...config,
			otherSettings: {
				Type: "noRender",
				defaultConstructionProductivity: {
					works: [{ work: "Balasts", unit: "m3" }],
				},
			},
		};
		expect(
			normalizeDiarySourceRows(
				[{ Works: "Balasts", Amounts: 440, Units: "m2" }],
				"Pārplanēti 440m2 balasta",
				catalog,
			)[0],
		).toMatchObject({ Works: "Piezīmes", Amounts: 440, Units: "m2" });
		expect(
			normalizeDiarySourceRows(
				[{ Works: "Balasts", Amounts: 200, Units: "m³" }],
				"Iestrādāti 200m3 balasta",
				catalog,
			)[0].Works,
		).toBe("Balasts");
	});
	it("does not accept invalid explicit dates or redate unrelated rows", () => {
		expect(
			normalizeDiarySourceRows(
				[{ Date: "2026-10-28" }],
				"Pabeigts 31.02.2026.",
				config,
			)[0].Date,
		).toBe("2026-10-28");
		expect(
			normalizeDiarySourceRows(
				[{ Date: "2026-10-28" }, { Date: "2026-10-28" }],
				"Pabeigts 27.10.",
				config,
			).every((row) => row.Date === "2026-10-28"),
		).toBe(true);
	});
	it.each([
		{ Comments: "Laikapstākļi: apmācies, +12 °C.", Amounts: 12 },
		{ Comments: "10 stundas strādāja trīs cilvēki.", Amounts: 2 },
		{ Comments: "Pamatnes sagatavošana", Amounts: 2 },
	])("rejects non-quantity context: %j", (row) => {
		expect(
			isContextOnlyDiaryAmount(
				row,
				"6.perona 2.pamatnes sagatavošana. Laikapstākļi +12",
			),
		).toBe(true);
	});
	it("preserves legitimate measured quantities", () => {
		expect(
			isContextOnlyDiaryAmount(
				{ Amounts: 12, Units: "m3", Comments: "Iestrādāti 12 m3." },
				"Iestrādāti 12 m3, +12 °C.",
			),
		).toBe(false);
	});
	it("requires a recent single unclassified non-BIS report for material-only clarification", () => {
		const now = Date.now();
		const target = {
			batch: { createdAt: new Date(now - 60000) },
			records: [{ Works: "Piezīmes", Amounts: 100, BISId: null }],
		};
		expect(isMaterialOnlyDiaryClarification("Balasta.")).toBe(true);
		expect(isMaterialOnlyDiaryClarification("Iestrādāti 100m3 balasta")).toBe(
			false,
		);
		expect(canClarifyPreviousDiaryReport(target, now)).toBe(true);
		expect(
			canClarifyPreviousDiaryReport(
				{ ...target, batch: { createdAt: new Date(now - 3600000) } },
				now,
			),
		).toBe(false);
		expect(
			canClarifyPreviousDiaryReport(
				{ ...target, records: [...target.records, ...target.records] },
				now,
			),
		).toBe(false);
		expect(
			canClarifyPreviousDiaryReport(
				{ ...target, records: [{ ...target.records[0], BISId: "bis-1" }] },
				now,
			),
		).toBe(false);
	});
});
