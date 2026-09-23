import {
	normalizeVisualLocation,
	type VisualEvidence,
	validateVisualMatches,
	workLayer,
} from "./model";

const evidence: VisualEvidence = {
	id: "record:0",
	recordId: "record",
	photoUrl: "https://example.com/photo.jpg",
	work: "Smilts līdzināšana",
	location: "1. stāvs",
	description: "Pabeigts marķētais laukums",
	date: "2026-09-23",
	amount: 40,
	unit: "m2",
};
const match = {
	evidenceId: evidence.id,
	page: 1,
	confidence: 0.96,
	polygon: [
		{ x: 0.1, y: 0.2 },
		{ x: 0.3, y: 0.2 },
		{ x: 0.3, y: 0.4 },
	],
	anchors: ["Ass A/1", "Kāpņu telpa"],
	explanation: "Atbilst asīm un kāpnēm.",
};

describe("Visual geometry and source guards", () => {
	it("rejects self-intersecting polygons even with nonzero area", () => {
		const polygon = [
			{ x: 0, y: 0 },
			{ x: 1, y: 1 },
			{ x: 0, y: 1 },
			{ x: 1, y: 0 },
			{ x: 1, y: 0.2 },
		];
		expect(
			validateVisualMatches(
				{ marks: [{ ...match, polygon }], unlocated: [] },
				[evidence],
				1,
			).marks,
		).toEqual([]);
	});
	it.each([
		["Smilts 20mm", "sand"],
		["XPS 150mm", "xps"],
		["Estrich", "estrich"],
		["Sausā betona grīda", "estrich"],
		["Hidroizolācija plēve", "film"],
		["ThermoWhite", "thermowhite"],
		["Cits darbs", "other"],
	])("colours %s consistently", (work, layer) =>
		expect(workLayer(work)).toBe(layer),
	);
	it("keeps only known evidence and derives the layer from the diary", () => {
		const result = validateVisualMatches(
			{
				marks: [match, { ...match, evidenceId: "another-site" }],
				unlocated: [],
			},
			[evidence],
			1,
		);
		expect(result.marks).toHaveLength(1);
		expect(result.marks[0].layer).toBe("sand");
		expect(result.unlocated).toEqual([]);
	});
	it.each([
		{ confidence: 0.5 },
		{ page: 2 },
		{ anchors: ["A1", "a1"] },
		{
			polygon: [
				{ x: 0, y: 0 },
				{ x: 0, y: 0 },
				{ x: 0, y: 0 },
			],
		},
	])("does not display ungrounded geometry %p", (override) => {
		const result = validateVisualMatches(
			{ marks: [{ ...match, ...override }], unlocated: [] },
			[evidence],
			1,
		);
		expect(result.marks).toEqual([]);
		expect(result.unlocated[0].evidenceId).toBe(evidence.id);
	});
	it("rejects out-of-page coordinates", () =>
		expect(() =>
			validateVisualMatches(
				{
					marks: [
						{
							...match,
							polygon: [
								{ x: -1, y: 0 },
								{ x: 1, y: 0 },
								{ x: 1, y: 1 },
							],
						},
					],
					unlocated: [],
				},
				[evidence],
				1,
			),
		).toThrow());
	it("returns all omitted and unrelated photos as unlocated", () => {
		const result = validateVisualMatches(
			{
				marks: [],
				unlocated: [{ evidenceId: evidence.id, reason: "Cita ēka." }],
			},
			[evidence, { ...evidence, id: "second" }],
			1,
		);
		expect(result.unlocated).toHaveLength(2);
		expect(result.unlocated[0].reason).toBe("Cita ēka.");
	});
	it("normalizes spaces and case but does not merge floors", () => {
		expect(normalizeVisualLocation("  1.   STĀVS ")).toBe("1. stāvs");
		expect(normalizeVisualLocation("2. stāvs")).not.toBe(
			normalizeVisualLocation("1. stāvs"),
		);
	});
});
