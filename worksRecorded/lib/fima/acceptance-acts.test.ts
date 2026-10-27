import {
	createFimaActCoverageReader,
	type FimaActCoverageIndex,
	formatFimaActCoverage,
	getFimaAcceptanceActUrl,
} from "./acceptance-acts";

const index: FimaActCoverageIndex = {
	version: 1,
	caseId: "668714",
	fetchedAt: "2026-10-27T10:00:00Z",
	collections: ["other_acceptance_acts"],
	acts: [
		{
			id: "101",
			collection: "other_acceptance_acts",
			number: "KT-00016",
			date: "2026-10-07",
			status: "approved",
			works: [
				{ id: "587", quantity: 3 },
				{ id: "630", quantity: 1 },
			],
		},
		{
			id: "102",
			collection: "other_acceptance_acts",
			number: "KT-00023",
			date: "2026-10-15",
			status: "approving",
			works: [{ id: "587", quantity: 1 }],
		},
	],
};
const config = { otherSettings: { fimaBisActCoverage: index } };

it("matches exact work IDs, returns multiple acts, and preserves included quantities and actual statuses", () => {
	const read = createFimaActCoverageReader(config, "668714");
	const result = read([{ id: "587", number: "32" }]);
	expect(result?.acts.map((act) => act.id)).toEqual(["102", "101"]);
	expect(result?.acts[0]).toMatchObject({
		status: "approving",
		works: [{ id: "587", number: "32", quantity: 1 }],
	});
	expect(result?.acts[1].works).toEqual([
		{ id: "587", number: "32", quantity: 3 },
	]);
	expect(read([{ id: "58", number: "587" }])?.acts).toEqual([]);
});

it("deduplicates an act covering several current BIS links without including unrelated work quantities", () => {
	const result = createFimaActCoverageReader(
		config,
		"668714",
	)([
		{ id: "587", number: "32" },
		{ id: "630", number: "44" },
		{ id: "587", number: "32" },
	]);
	expect(result?.acts).toHaveLength(2);
	expect(result?.acts[1].works).toHaveLength(2);
});

it.each([
	null,
	{},
	{ otherSettings: { fimaBisActCoverage: { ...index, caseId: "668708" } } },
])(
	"distinguishes an unchecked or differently linked project from a verified empty result",
	(value) =>
		expect(
			createFimaActCoverageReader(
				value,
				"668714",
			)([{ id: "587", number: "32" }]),
		).toBeUndefined(),
);

it("formats status-labelled exports and constructs only fixed-origin numeric act links", () => {
	expect(
		formatFimaActCoverage(
			createFimaActCoverageReader(
				config,
				"668714",
			)([{ id: "587", number: "32" }]),
		),
	).toBe("KT-00023 · Nodots apstiprināšanā\nKT-00016 · Apstiprināts");
	expect(getFimaAcceptanceActUrl("other_acceptance_acts", "101")).toBe(
		"https://bis.gov.lv/bisp/lv/portal/logbooks/other_acceptance_acts/101/edit",
	);
	expect(getFimaAcceptanceActUrl("https://example.com", "101")).toBeNull();
	expect(
		getFimaAcceptanceActUrl("other_acceptance_acts", "javascript:alert(1)"),
	).toBeNull();
});
