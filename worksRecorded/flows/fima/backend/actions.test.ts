jest.mock("@/lib/utils/db", () => ({
	prisma: {
		site: { findUniqueOrThrow: jest.fn() },
		fimaImportBatch: { findUnique: jest.fn(), create: jest.fn() },
		fimaWorkRecord: {
			aggregate: jest.fn(),
			findMany: jest.fn(),
			createMany: jest.fn(),
			findFirstOrThrow: jest.fn(),
			updateMany: jest.fn(),
		},
		fimaWorkRevision: { create: jest.fn() },
		$queryRaw: jest.fn(),
		$transaction: jest.fn(),
	},
}));
jest.mock("./access", () => ({
	fimaAccess: jest.fn(async () => ({ userId: "user", organizationId: "org" })),
}));
jest.mock("./bis-client", () => ({ fimaBisClient: jest.fn() }));
jest.mock("@/server/actions/BIS/service", () => ({
	getBisBaseUrl: () => "https://example.test",
}));

import { prisma } from "@/lib/utils/db";
import { emptyProposal } from "../lib/records";
import {
	copyFimaCommonFields,
	importFimaRows,
	mergeFimaRows,
	saveFimaRecord,
} from "./actions";

const source = {
	file: "report.xlsx",
	sheet: "1-2",
	cell: "C17",
	raw: "KUCE raw",
	workers: ["Worker A", "Worker B"],
};
const proposal = {
	...emptyProposal("2026-09-01"),
	sourceWork: "Kompensacijas montāža",
	description: "Exact text",
	quantity: 2,
	rawMasts: "21-24",
	masts: ["21-24"],
	start: "19:00",
	end: "05:00",
};
const record = {
	id: "r1",
	siteId: "site",
	organizationId: "org",
	version: 2,
	localId: "FIMA-010",
	ordinal: 10,
	stage: "draft",
	proposal,
	sources: [source],
	bisId: null,
	managed: false,
};
beforeEach(() => {
	jest.clearAllMocks();
	(prisma.$transaction as jest.Mock).mockImplementation((fn) => fn(prisma));
	(prisma.site.findUniqueOrThrow as jest.Mock).mockResolvedValue({
		bisCaseId: "123",
	});
	(prisma.fimaImportBatch.findUnique as jest.Mock).mockResolvedValue(null);
	(prisma.fimaImportBatch.create as jest.Mock).mockResolvedValue({
		id: "batch",
	});
	(prisma.fimaWorkRecord.aggregate as jest.Mock).mockResolvedValue({
		_max: { ordinal: 20 },
	});
	(prisma.fimaWorkRecord.findMany as jest.Mock).mockResolvedValue([]);
	(prisma.fimaWorkRecord.findFirstOrThrow as jest.Mock).mockResolvedValue(
		record,
	);
	(prisma.fimaWorkRecord.updateMany as jest.Mock).mockResolvedValue({
		count: 1,
	});
});
test("repeated import is idempotent before any records are added", async () => {
	(prisma.fimaImportBatch.findUnique as jest.Mock).mockResolvedValue({
		id: "existing",
	});
	expect(
		await importFimaRows("site", "report.xlsx", [
			{ proposal, sources: [source], warning: "" },
		]),
	).toEqual({ count: 0, duplicate: true });
	expect(prisma.fimaWorkRecord.createMany).not.toHaveBeenCalled();
});
test("an imported existing BIS URL never grants mutation ownership", async () => {
	await importFimaRows("site", "report.xlsx", [
		{ proposal, sources: [source], warning: "", bisId: "777" },
	]);
	const data = (prisma.fimaWorkRecord.createMany as jest.Mock).mock.calls[0][0]
		.data[0];
	expect(data.localId).toBe("FIMA-021");
	expect(data.managed).toBe(false);
	expect(data.proposal.reviewed).toBe(false);
});
test("Excel updates must carry a current version", async () => {
	(prisma.fimaWorkRecord.findMany as jest.Mock).mockResolvedValue([record]);
	await expect(
		importFimaRows(
			"site",
			"report.xlsx",
			[
				{
					localId: "FIMA-010",
					version: 1,
					proposal,
					sources: [source],
					warning: "",
				},
			],
			true,
		),
	).rejects.toThrow("versija");
	expect(prisma.fimaWorkRecord.updateMany).not.toHaveBeenCalled();
});
test("Excel updates retain original source and structured material IDs", async () => {
	(prisma.fimaWorkRecord.findMany as jest.Mock).mockResolvedValue([
		{
			...record,
			proposal: {
				...proposal,
				materials: [
					{
						id: "99",
						name: "Material",
						unit: "gab.",
						quantity: 3,
						plannedQuantity: 3,
					},
				],
			},
		},
	]);
	await importFimaRows(
		"site",
		"edited.xlsx",
		[
			{
				localId: "FIMA-010",
				version: 2,
				proposal: {
					...proposal,
					description: "Revised",
					sourceWork: "Changed source",
				},
				sources: [source],
				warning: "",
			},
		],
		true,
	);
	const data = (prisma.fimaWorkRecord.updateMany as jest.Mock).mock.calls[0][0]
		.data;
	expect(data.proposal.sourceWork).toBe(proposal.sourceWork);
	expect(data.proposal.materials[0].id).toBe("99");
	expect(data.proposal.description).toBe("Revised");
	expect(data.proposal.reviewed).toBe(false);
	expect(data.sources).toBeUndefined();
});
test("original KUCE text cannot be overwritten by a forged save action", async () => {
	await expect(
		saveFimaRecord("r1", 2, { ...proposal, sourceWork: "altered" }, "draft"),
	).rejects.toThrow("nemainīgs");
	expect(prisma.fimaWorkRecord.updateMany).not.toHaveBeenCalled();
});
test("crew merge deduplicates named people without adding physical quantities", async () => {
	(prisma.fimaWorkRecord.findMany as jest.Mock).mockResolvedValue([
		record,
		{
			...record,
			id: "r2",
			ordinal: 11,
			localId: "FIMA-011",
			sources: [{ ...source, workers: ["Worker B", "Worker C"] }],
		},
	]);
	await mergeFimaRows(["r1", "r2"], null);
	const data = (prisma.fimaWorkRecord.updateMany as jest.Mock).mock.calls[0][0]
		.data;
	expect(data.proposal.workers).toBe(3);
	expect(data.proposal.quantity).toBe(2);
	expect(data.proposal.reviewed).toBe(false);
	expect(data.sources).toHaveLength(2);
});
test("crew merge rejects mismatched shifts before any update", async () => {
	(prisma.fimaWorkRecord.findMany as jest.Mock).mockResolvedValue([
		record,
		{ ...record, id: "r2", proposal: { ...proposal, start: "08:00" } },
	]);
	await expect(mergeFimaRows(["r1", "r2"], null)).rejects.toThrow("maiņa");
	expect(prisma.fimaWorkRecord.updateMany).not.toHaveBeenCalled();
});

test("bulk common fields retain work quantities and reset review", async () => {
	(prisma.fimaWorkRecord.findFirstOrThrow as jest.Mock).mockResolvedValue({
		...record,
		proposal: {
			...proposal,
			responsibleId: "7",
			responsibleType: "logbooks_responsible_person",
			buildingIds: ["8"],
			drawings: [{ id: "9", title: "Drawing", sheet: "A", revision: "2" }],
		},
	});
	(prisma.fimaWorkRecord.findMany as jest.Mock).mockResolvedValue([record]);
	await copyFimaCommonFields("source", [{ id: "r1", version: 2 }], false);
	const data = (prisma.fimaWorkRecord.updateMany as jest.Mock).mock.calls[0][0]
		.data;
	expect(data.proposal.quantity).toBe(2);
	expect(data.proposal.description).toBe("Exact text");
	expect(data.proposal.responsibleId).toBe("7");
	expect(data.proposal.drawings[0].id).toBe("9");
	expect(data.proposal.reviewed).toBe(false);
});
test("bulk common fields reject records in another project", async () => {
	(prisma.fimaWorkRecord.findFirstOrThrow as jest.Mock).mockResolvedValue({
		...record,
		proposal: { ...proposal, responsibleId: "7", buildingIds: ["8"] },
	});
	(prisma.fimaWorkRecord.findMany as jest.Mock).mockResolvedValue([
		{ ...record, siteId: "other" },
	]);
	await expect(
		copyFimaCommonFields("source", [{ id: "r1", version: 2 }], false),
	).rejects.toThrow("dažādiem projektiem");
	expect(prisma.fimaWorkRecord.updateMany).not.toHaveBeenCalled();
});
