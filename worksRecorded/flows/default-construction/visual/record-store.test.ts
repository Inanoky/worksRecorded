import { prisma } from "@/lib/utils/db";
import { syncDefaultConstructionForma2WorkAssignments } from "../backend/forma2-analytics-actions";
import { VISUAL_DOCUMENT_TYPE, type VisualState } from "./model";
import { attachVisualRecordAreas, createVisualRecord } from "./record-store";
import { requireVisualAccess } from "./store";

jest.mock("@/lib/utils/db", () => ({
	prisma: {
		$transaction: jest.fn(),
		documents: { findFirst: jest.fn(), updateMany: jest.fn() },
		sitediaryrecords: {
			findFirst: jest.fn(),
			findUnique: jest.fn(),
			create: jest.fn(),
			updateMany: jest.fn(),
		},
	},
}));
jest.mock("./store", () => ({ requireVisualAccess: jest.fn() }));
jest.mock("../backend/forma2-analytics-actions", () => ({
	syncDefaultConstructionForma2WorkAssignments: jest.fn(),
}));

const record = {
	id: "c2203b2d-21a5-4c2c-aeca-ad1162e08290",
	date: "2026-10-19",
	work: "XPS",
	quantity: 85,
	unit: "m2",
	comments: "Pabeigts",
	areas: [
		{
			id: "area-1",
			page: 1,
			polygon: [
				{ x: 0.1, y: 0.1 },
				{ x: 0.4, y: 0.1 },
				{ x: 0.4, y: 0.4 },
			],
		},
	],
};
const state: VisualState = {
	version: 1,
	location: "1. stāvs",
	status: "uploaded",
	pageCount: 1,
	processed: 0,
	evidence: [],
	marks: [],
	unlocated: [],
	attempts: [],
	error: null,
	lockedAt: null,
};
const row = {
	id: "drawing",
	documentName: "plan.pdf",
	createdAt: new Date("2026-10-01"),
	description: JSON.stringify(state),
};

beforeEach(() => {
	jest.clearAllMocks();
	jest
		.mocked(requireVisualAccess)
		.mockResolvedValue({ organizationId: "org" } as never);
	jest.mocked(prisma.documents.findFirst).mockResolvedValue(row as never);
	jest.mocked(prisma.documents.updateMany).mockResolvedValue({ count: 1 });
	jest.mocked(prisma.sitediaryrecords.findUnique).mockResolvedValue(null);
	jest
		.mocked(prisma.$transaction)
		.mockImplementation((async (
			callback: (tx: typeof prisma) => Promise<unknown>,
		) => callback(prisma)) as never);
});

it("saves a diary entry and its manual polygon in one scoped transaction, ready without AI analysis", async () => {
	const result = await createVisualRecord("user", "site", "drawing", record);
	expect(prisma.documents.findFirst).toHaveBeenCalledWith({
		where: {
			id: "drawing",
			siteId: "site",
			organizationId: "org",
			documentType: VISUAL_DOCUMENT_TYPE,
		},
	});
	expect(prisma.sitediaryrecords.create).toHaveBeenCalledWith({
		data: expect.objectContaining({
			id: record.id,
			userId: "user",
			organizationId: "org",
			siteId: "site",
			Location: "1. stāvs",
			Works: "XPS",
			Amounts: 85,
			Photos: [],
			Date: new Date("2026-10-19"),
		}),
	});
	expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
		isolationLevel: "Serializable",
	});
	expect(prisma.documents.updateMany).toHaveBeenCalledWith(
		expect.objectContaining({
			where: expect.objectContaining({
				description: row.description,
				siteId: "site",
				organizationId: "org",
			}),
		}),
	);
	expect(result.drawing.state.evidence[0]).toMatchObject({
		recordId: record.id,
		manual: true,
		photoUrl: "",
	});
	expect(result.drawing.state.marks[0]).toMatchObject({
		id: result.markId,
		evidenceId: result.drawing.state.evidence[0].id,
		polygon: record.areas[0].polygon,
		editedBy: "user",
	});
	expect(result.drawing.state.imageProgress).toEqual([
		{ evidenceId: `${record.id}:manual`, status: "complete", error: null },
	]);
	expect(result.drawing.state.status).toBe("complete");
	expect(syncDefaultConstructionForma2WorkAssignments).toHaveBeenCalledWith({
		siteId: "site",
		records: [{ id: record.id, work: "XPS" }],
	});
});

it("recognizes a retry after a lost response without creating another record or polygon", async () => {
	const first = await createVisualRecord("user", "site", "drawing", record);
	jest.mocked(prisma.documents.findFirst).mockResolvedValue({
		...row,
		description: JSON.stringify(first.drawing.state),
	} as never);
	jest.mocked(prisma.sitediaryrecords.findUnique).mockResolvedValue({
		...jest.mocked(prisma.sitediaryrecords.create).mock.calls[0][0].data,
		archivedAt: null,
	} as never);
	const again = await createVisualRecord("user", "site", "drawing", record);
	expect(again.markId).toBe(first.markId);
	expect(prisma.sitediaryrecords.create).toHaveBeenCalledTimes(1);
	expect(prisma.documents.updateMany).toHaveBeenCalledTimes(1);
	await expect(
		createVisualRecord("user", "site", "drawing", { ...record, quantity: 86 }),
	).rejects.toThrow("jau ir saglabāts");
});

it("rejects inaccessible drawings, analysis locks and out-of-page geometry before creating records", async () => {
	jest.mocked(prisma.documents.findFirst).mockResolvedValueOnce(null);
	await expect(
		createVisualRecord("user", "site", "drawing", record),
	).rejects.toThrow("nav pieejams");
	jest.mocked(prisma.documents.findFirst).mockResolvedValueOnce({
		...row,
		description: JSON.stringify({ ...state, lockedAt: Date.now() }),
	} as never);
	await expect(
		createVisualRecord("user", "site", "drawing", record),
	).rejects.toThrow("analīze");
	await expect(
		createVisualRecord("user", "site", "drawing", {
			...record,
			areas: [{ ...record.areas[0], page: 2 }],
		}),
	).rejects.toThrow("ārpus");
	expect(prisma.sitediaryrecords.create).not.toHaveBeenCalled();
});

it("fails the transaction on a concurrent drawing change and does not run post-save assignment", async () => {
	jest.mocked(prisma.documents.updateMany).mockResolvedValueOnce({ count: 0 });
	await expect(
		createVisualRecord("user", "site", "drawing", record),
	).rejects.toThrow("jau ir mainīts");
	expect(syncDefaultConstructionForma2WorkAssignments).not.toHaveBeenCalled();
});

it("validates dates and polygon geometry and requires access before opening a transaction", async () => {
	await expect(
		createVisualRecord("user", "site", "drawing", {
			...record,
			date: "2026-02-30",
		}),
	).rejects.toThrow();
	await expect(
		createVisualRecord("user", "site", "drawing", {
			...record,
			areas: [{ ...record.areas[0], polygon: [] }],
		}),
	).rejects.toThrow();
	jest
		.mocked(requireVisualAccess)
		.mockRejectedValueOnce(new Error("Forbidden"));
	await expect(
		createVisualRecord("user", "site", "drawing", record),
	).rejects.toThrow("Forbidden");
	expect(prisma.$transaction).not.toHaveBeenCalled();
});

it("attaches to an accessible existing journal record atomically without modifying its quantities, costs, message or photos", async () => {
	const original = {
		id: "existing",
		Works: "PA1.3 - ThermoWhite",
		Location: "1. stāvs",
		Date: new Date("2026-10-20"),
		Amounts: 420,
		Units: "m2",
		Comments: "Apstrādāts",
		originalUserComment: "WhatsApp oriģināls",
		Photos: ["https://example.com/original.jpg"],
	};
	jest
		.mocked(prisma.sitediaryrecords.findFirst)
		.mockResolvedValue(original as never);
	const input = { id: record.id, recordId: "existing", areas: record.areas };
	const first = await attachVisualRecordAreas("user", "site", "drawing", input);
	expect(prisma.sitediaryrecords.findFirst).toHaveBeenCalledWith({
		where: {
			id: "existing",
			siteId: "site",
			organizationId: "org",
			archivedAt: null,
		},
	});
	expect(first.drawing.state.marks[0].evidenceId).toBe("existing:manual");
	expect(first.drawing.state.evidence[0]).toMatchObject({
		work: original.Works,
		amount: 420,
		date: original.Date.toISOString(),
	});
	expect(prisma.sitediaryrecords.create).not.toHaveBeenCalled();
	expect(prisma.sitediaryrecords.updateMany).not.toHaveBeenCalled();
	expect(syncDefaultConstructionForma2WorkAssignments).not.toHaveBeenCalled();
	jest.mocked(prisma.documents.findFirst).mockResolvedValue({
		...row,
		description: JSON.stringify(first.drawing.state),
	} as never);
	const again = await attachVisualRecordAreas("user", "site", "drawing", input);
	expect(again).toEqual(first);
	expect(prisma.documents.updateMany).toHaveBeenCalledTimes(1);
});
it("rejects inaccessible, archived or wrong-floor record attachments before changing geometry", async () => {
	jest.mocked(prisma.sitediaryrecords.findFirst).mockResolvedValue(null);
	await expect(
		attachVisualRecordAreas("user", "site", "drawing", {
			id: record.id,
			recordId: "private",
			areas: record.areas,
		}),
	).rejects.toThrow("nav pieejams");
	jest
		.mocked(prisma.sitediaryrecords.findFirst)
		.mockResolvedValue({ id: "other-floor", Location: "2. stāvs" } as never);
	await expect(
		attachVisualRecordAreas("user", "site", "drawing", {
			id: record.id,
			recordId: "other-floor",
			areas: record.areas,
		}),
	).rejects.toThrow("šīs lokācijas");
	expect(prisma.documents.updateMany).not.toHaveBeenCalled();
});

it("remembers an attachment after its geometry changes and does not recreate it after deletion", async () => {
	jest.mocked(prisma.sitediaryrecords.findFirst).mockResolvedValue({
		id: "existing",
		Works: "XPS",
		Location: "",
		Date: null,
		Amounts: 10,
		Units: "m2",
		Comments: "",
		Photos: [],
	} as never);
	const input = { id: record.id, recordId: "existing", areas: record.areas };
	const first = await attachVisualRecordAreas("user", "site", "drawing", input);
	first.drawing.state.marks[0].polygon = [
		{ x: 0.2, y: 0.1 },
		{ x: 0.5, y: 0.1 },
		{ x: 0.5, y: 0.4 },
	];
	jest.mocked(prisma.documents.findFirst).mockResolvedValue({
		...row,
		description: JSON.stringify(first.drawing.state),
	} as never);
	expect(
		(await attachVisualRecordAreas("user", "site", "drawing", input)).drawing
			.state.marks,
	).toEqual(first.drawing.state.marks);
	first.drawing.state.marks = [];
	jest.mocked(prisma.documents.findFirst).mockResolvedValue({
		...row,
		description: JSON.stringify(first.drawing.state),
	} as never);
	await expect(
		attachVisualRecordAreas("user", "site", "drawing", input),
	).rejects.toThrow("dzēsta");
	expect(prisma.documents.updateMany).toHaveBeenCalledTimes(1);
});
