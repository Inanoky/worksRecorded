import {
	buildForma2AnalyticsView,
	type Forma2Position,
} from "./forma2-analytics";
import {
	buildForma2SectionSummaries,
	forma2PositionLabel,
} from "./forma2-section-summary";

const position = (
	id: string,
	parentId: string | null,
	amount: number,
): Forma2Position => ({
	id,
	parentId,
	code: parentId ? "" : "PA1.1",
	categoryCode: "",
	categoryName: "",
	name: parentId ? id : "PA1.1",
	kind: "work",
	sourceRow: 1,
	unit: "m2",
	plannedQuantity: 10,
	laborNormHoursPerUnit: null,
	hourlyRate: null,
	plannedWorkCost: amount,
	plannedMaterialCost: 0,
	plannedMechanismCost: 0,
	plannedTotalCost: amount,
});

it("sums section contract lines and counts rolled-up actual spending once", () => {
	const view = buildForma2AnalyticsView({
		positions: [
			position("section", null, 0),
			position("screed", "section", 200),
			position("film", "section", 50),
		],
		sources: [
			{
				id: "record",
				type: "work",
				label: "screed",
				secondaryLabel: "",
				date: null,
				unit: "m2",
				quantity: 10,
				hours: null,
				actualCost: 60,
			},
		],
		allocations: [
			{
				sourceId: "record",
				sourceType: "work",
				positionId: "screed",
				method: "manual",
				confidence: 1,
				assignedAt: "2026-10-27",
			},
		],
	});
	const [section] = buildForma2SectionSummaries(view.resultRows);
	expect(section.totals.plannedTotalCost).toBe(250);
	expect(section.totals.actualTotalCost).toBe(60);
	expect(section.totals.variance).toBe(190);
	expect(section.children.map((row) => row.id)).toEqual(["screed", "film"]);
});

it("shows a section code once and keeps work descriptions", () => {
	expect(forma2PositionLabel({ code: "PA1.1", name: "PA1.1" })).toBe("PA1.1");
	expect(forma2PositionLabel({ code: "PA1.1", name: "PA1.1 - Screed" })).toBe(
		"PA1.1 - Screed",
	);
	expect(forma2PositionLabel({ code: "7", name: "Film" })).toBe("7 Film");
});
