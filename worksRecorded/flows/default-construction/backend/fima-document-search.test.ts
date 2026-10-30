const queryRaw = jest.fn();
jest.mock("@/lib/utils/db", () => ({ prisma: { $queryRaw: queryRaw } }));

import { findFimaDocumentRecordIds } from "./fima-document-search";

const coverage = {
	version: 1,
	caseId: "668714",
	fetchedAt: "2026-10-29T10:00:00Z",
	acts: [
		{
			id: "900",
			collection: "other_acceptance_acts",
			number: "KT-668714-2026-00021",
			status: "approved",
			date: "2026-10-20",
			works: [{ id: "100", quantity: 1 }],
		},
	],
};
const rows = [
	{
		id: "current",
		siteId: "project",
		BISId: "100",
		metadata: { kuceImport: { bisLinks: [{ id: "100", number: "681" }] } },
	},
	{
		id: "replaced",
		siteId: "project",
		BISId: "200",
		metadata: {
			kuceImport: {
				bisLinks: [
					{ id: "100", number: "681" },
					{ id: "200", number: "682" },
				],
			},
		},
	},
	{
		id: "receipt",
		siteId: "project",
		BISId: "300",
		metadata: {
			fimaMaterialReceiptPlan: {
				bisRecords: [
					{ id: "300", number: "91", type: "received_construction_product" },
				],
			},
		},
	},
	{
		id: "dated-receipt",
		siteId: "project",
		BISId: null,
		metadata: {
			fimaBisDraftCreation20261029: {
				records: [
					{ id: "100", number: "92", type: "received_construction_product" },
				],
			},
		},
	},
	{ id: "other-case", siteId: "other", BISId: "100", metadata: null },
	{
		id: "example-only",
		siteId: "project",
		BISId: null,
		metadata: {
			fimaCollaboration: {
				examples: { entries: [{ id: "100", number: "681" }] },
			},
		},
	},
	{
		id: "snapshot",
		siteId: "project",
		BISId: "400",
		metadata: {
			fimaCollaboration: {
				bisMaterials: { entries: [{ bisId: "400", number: "683" }] },
			},
		},
	},
];
beforeEach(() => {
	queryRaw.mockReset();
	queryRaw.mockResolvedValueOnce([
		{ id: "project", bisCaseId: "668714", coverage },
		{ id: "other", bisCaseId: "668708", coverage },
	]);
	queryRaw.mockResolvedValueOnce(rows);
});
it.each([undefined, "", "FIMA-003383"])(
	"does not add document queries for %s",
	async (keyword) => {
		expect(await findFimaDocumentRecordIds("org", keyword)).toEqual([]);
		expect(queryRaw).not.toHaveBeenCalled();
	},
);
it("matches actual current BIS numbers and snapshots, excluding replaced links and examples", async () => {
	expect(await findFimaDocumentRecordIds("org", "68", "project")).toEqual([
		"current",
		"replaced",
		"snapshot",
	]);
	expect(queryRaw.mock.calls[0].slice(1)).toEqual([
		"org",
		"project",
		"project",
	]);
});
it("matches an Act only to current performed works in its own case", async () => {
	expect(
		await findFimaDocumentRecordIds("org", "kt-668714-2026-00021"),
	).toEqual(["current"]);
});
it("searches material receipts without treating their IDs as performed-work Act coverage", async () => {
	expect(await findFimaDocumentRecordIds("org", "92")).toEqual([
		"dated-receipt",
	]);
});
it("does not load record links for ordinary text without a matching Act", async () => {
	expect(await findFimaDocumentRecordIds("org", "night")).toEqual([]);
	expect(queryRaw).toHaveBeenCalledTimes(1);
});
