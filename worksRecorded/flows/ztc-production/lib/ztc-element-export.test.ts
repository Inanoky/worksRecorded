import { buildZtcElementCostRows } from "@/flows/ztc-production/lib/ztc-element-export";

function drawingMetadata(elementName: string, totalAreaM2: number) {
	return JSON.stringify({
		type: "ztc_drawing_context",
		elements: [{ elementName, totalAreaM2, works: [] }],
	});
}

describe("buildZtcElementCostRows", () => {
	it("exports one row per element with its latest area and total cost", () => {
		const rows = buildZtcElementCostRows([
			{
				Date: "2026-07-01T08:00:00.000Z",
				Location: "Project A",
				Location_Custom_1: "3S-10",
				Works: "Task A",
				Units: "m2",
				Amounts: 5,
				Location_Custom_2: 2,
				Comments_Custom_2: drawingMetadata("3S-10", 9.5),
			},
			{
				Date: "2026-07-02T08:00:00.000Z",
				Location: "Project A",
				Location_Custom_1: "3S-10",
				Works: "Task B",
				Units: "st",
				TimeInvolved: 2,
				Location_Custom_2: 3,
				Comments_Custom_2: drawingMetadata("3S-10", 10),
			},
			{
				Date: "2026-07-01T08:00:00.000Z",
				Location: "Project A",
				Location_Custom_1: "3S-2",
				Works: "Task A",
				Units: "m2",
				Amounts: 4,
				Location_Custom_2: 2,
				Comments_Custom_2: drawingMetadata("3S-2", 8),
			},
		]);

		expect(rows).toEqual([
			{
				Projekts: "Project A",
				Elements: "3S-2",
				"Platība, m²": 8,
				"Izmaksas, €": 8,
				"Izmaksas uz m², €/m²": 1,
			},
			{
				Projekts: "Project A",
				Elements: "3S-10",
				"Platība, m²": 10,
				"Izmaksas, €": 16,
				"Izmaksas uz m², €/m²": 1.6,
			},
		]);
	});

	it("includes metadata-only elements with zero cost", () => {
		const metadata = JSON.stringify({
			type: "ztc_drawing_context",
			elements: [
				{ elementName: "3S-50", totalAreaM2: 25.11, works: [] },
				{ elementName: "35-50", totalAreaM2: 25.11, works: [] },
			],
		});

		expect(
			buildZtcElementCostRows([
				{
					Date: "2026-07-01T08:00:00.000Z",
					Location: "Project A",
					Location_Custom_1: "3S-50",
					Works: "Task",
					Units: "m2",
					Amounts: 5,
					Location_Custom_2: 2,
					Comments_Custom_2: metadata,
				},
			]),
		).toEqual([
			{
				Projekts: "Project A",
				Elements: "3S-50",
				"Platība, m²": 25.11,
				"Izmaksas, €": 10,
				"Izmaksas uz m², €/m²": 0.4,
			},
			{
				Projekts: "Project A",
				Elements: "35-50",
				"Platība, m²": 25.11,
				"Izmaksas, €": 0,
				"Izmaksas uz m², €/m²": 0,
			},
		]);
	});

	it("keeps the same element in different projects separate", () => {
		const rows = buildZtcElementCostRows([
			{
				Date: "2026-07-01T08:00:00.000Z",
				Location: "Project A",
				Location_Custom_1: "E-1",
				Works: "Task",
				Units: "m2",
				Amounts: 2,
				Location_Custom_2: 3,
				Comments_Custom_2: drawingMetadata("E-1", 4),
			},
			{
				Date: "2026-07-01T08:00:00.000Z",
				Location: "Project B",
				Location_Custom_1: "E-1",
				Works: "Task",
				Units: "m2",
				Amounts: 5,
				Location_Custom_2: 2,
				Comments_Custom_2: drawingMetadata("E-1", 5),
			},
		]);

		expect(rows).toEqual([
			expect.objectContaining({
				Projekts: "Project A",
				Elements: "E-1",
				"Platība, m²": 4,
				"Izmaksas, €": 6,
			}),
			expect.objectContaining({
				Projekts: "Project B",
				Elements: "E-1",
				"Platība, m²": 5,
				"Izmaksas, €": 10,
			}),
		]);
	});

	it("excludes standalone additional-work buckets", () => {
		expect(
			buildZtcElementCostRows([
				{
					Date: "2026-07-01T08:00:00.000Z",
					Location: "Papilddarbi",
					Location_Custom_1: "Project A",
					Works: "Standalone work",
					Units: "st",
					TimeInvolved: 2,
					Location_Custom_2: 10,
				},
				{
					Date: "2026-07-01T08:00:00.000Z",
					Location: "Project A",
					Location_Custom_1: "Papilddarbi",
					Works: "Unattached work",
					Units: "st",
					TimeInvolved: 2,
					Location_Custom_2: 10,
				},
			]),
		).toEqual([]);
	});
});
