import { prisma } from "@/lib/utils/db";
import { requireWarehouseImportAccess } from "../backend/warehouse-import-upload";
import { LIMENI_ORGANIZATION_ID } from "../lib/diary-photos";
import {
	VISUAL_DOCUMENT_TYPE,
	VISUAL_LEASE_MS,
	type VisualState,
} from "./model";
import {
	appendVisualDiaryEvidence,
	createVisualDrawing,
	editVisualPolygon,
	listVisualDrawings,
	loadVisualDrawing,
	removeVisualDrawing,
	requireVisualAccess,
	resetVisualDrawing,
	saveVisualState,
} from "./store";

jest.mock("../backend/warehouse-import-upload", () => ({
	requireWarehouseImportAccess: jest.fn(),
}));
jest.mock("@/lib/utils/db", () => ({
	prisma: {
		$transaction: jest.fn(),
		$executeRaw: jest.fn(),
		sitediaryrecords: { findMany: jest.fn() },
		documents: {
			findMany: jest.fn(),
			create: jest.fn(),
			findFirst: jest.fn(),
			updateMany: jest.fn(),
			deleteMany: jest.fn(),
		},
	},
}));

beforeEach(() => {
	jest.clearAllMocks();
	jest
		.mocked(prisma.$transaction)
		.mockImplementation((async (callback: unknown) =>
			(callback as (tx: typeof prisma) => Promise<unknown>)(prisma)) as never);
	jest.mocked(prisma.documents.findMany).mockResolvedValue([]);
	jest.mocked(requireWarehouseImportAccess).mockResolvedValue({
		userId: "user",
		siteId: "site",
		organizationId: LIMENI_ORGANIZATION_ID,
	});
	jest
		.mocked(prisma.documents.create)
		.mockResolvedValue({ id: "drawing" } as never);
	jest.mocked(prisma.sitediaryrecords.findMany).mockResolvedValue([
		{
			id: "first",
			Location: " 1. STĀVS ",
			Works: "XPS",
			Comments: "Pabeigts",
			Photos: ["https://example.com/one.jpg"],
			Date: null,
			Amounts: 10,
			Units: "m2",
		},
		{
			id: "second",
			Location: "2. stāvs",
			Photos: ["https://example.com/two.jpg"],
		},
	] as never);
});

async function mockSavedDrawing() {
	await createVisualDrawing({
		userId: "user",
		siteId: "site",
		location: "1. stāvs",
		name: "plan.pdf",
		url: "https://a.ufs.sh/f/plan",
	});
	const data = jest.mocked(prisma.documents.create).mock.calls[0][0].data;
	const state = JSON.parse(data.description as string) as VisualState;
	state.status = "unlocated";
	state.processed = 1;
	state.unlocated = [{ evidenceId: "first:0", reason: "No match" }];
	state.error = "No match";
	const row = {
		...data,
		id: "drawing",
		description: JSON.stringify(state),
		createdAt: new Date(),
	};
	jest.mocked(prisma.documents.findFirst).mockResolvedValue(row as never);
	jest.mocked(prisma.documents.deleteMany).mockResolvedValue({ count: 1 });
	jest.mocked(prisma.documents.updateMany).mockResolvedValue({ count: 1 });
	return { row, state };
}

const uploadArgs = {
	userId: "user",
	siteId: "site",
	location: "1. stāvs",
	name: "new.pdf",
	url: "https://a.ufs.sh/f/new",
};

it("blocks duplicate location uploads including normalized names and stale replacement requests", async () => {
	const { row } = await mockSavedDrawing();
	jest.mocked(prisma.documents.findMany).mockResolvedValue([row] as never);
	jest.mocked(prisma.documents.create).mockClear();
	await expect(
		createVisualDrawing({ ...uploadArgs, location: " 1. STĀVS " }),
	).rejects.toThrow("jau ir rasējums");
	await expect(
		createVisualDrawing({ ...uploadArgs, replaceDrawingId: "stale" }),
	).rejects.toThrow("jau ir rasējums");
	expect(prisma.documents.create).not.toHaveBeenCalled();
	expect(prisma.$executeRaw).toHaveBeenCalled();
});

it("archives all old versions of only the selected location before creating its replacement", async () => {
	const { row, state } = await mockSavedDrawing();
	jest.mocked(prisma.documents.findMany).mockResolvedValue([
		row,
		{ ...row, id: "older" },
		{
			...row,
			id: "other-floor",
			description: JSON.stringify({ ...state, location: "2. stāvs" }),
		},
	] as never);
	await createVisualDrawing({ ...uploadArgs, replaceDrawingId: "drawing" });
	expect(prisma.documents.updateMany).toHaveBeenCalledTimes(2);
	expect(prisma.documents.updateMany).toHaveBeenCalledWith({
		where: {
			id: "older",
			siteId: "site",
			organizationId: LIMENI_ORGANIZATION_ID,
			documentType: VISUAL_DOCUMENT_TYPE,
			description: row.description,
		},
		data: { documentType: `${VISUAL_DOCUMENT_TYPE}-archived` },
	});
	expect(prisma.documents.deleteMany).not.toHaveBeenCalled();
});

it("does not replace a drawing while its analysis is running", async () => {
	const { row, state } = await mockSavedDrawing();
	jest.mocked(prisma.documents.findMany).mockResolvedValue([
		{
			...row,
			description: JSON.stringify({ ...state, lockedAt: Date.now() }),
		},
	] as never);
	await expect(
		createVisualDrawing({ ...uploadArgs, replaceDrawingId: "drawing" }),
	).rejects.toThrow("Analīze vēl notiek");
	expect(prisma.documents.updateMany).not.toHaveBeenCalled();
});

it("shows only the newest legacy drawing per normalized location", async () => {
	const { row, state } = await mockSavedDrawing();
	jest.mocked(prisma.documents.findMany).mockResolvedValue([
		row,
		{
			...row,
			id: "older",
			description: JSON.stringify({ ...state, location: " 1. STĀVS " }),
		},
		{
			...row,
			id: "other-floor",
			description: JSON.stringify({ ...state, location: "2. stāvs" }),
		},
	] as never);
	expect(
		(await listVisualDrawings("user", "site")).drawings.map((item) => item.id),
	).toEqual(["drawing", "other-floor"]);
});

it("archives older duplicates on deletion so an old drawing cannot reappear", async () => {
	const { row } = await mockSavedDrawing();
	jest
		.mocked(prisma.documents.findMany)
		.mockResolvedValue([row, { ...row, id: "older" }] as never);
	await removeVisualDrawing("user", "site", "drawing");
	expect(prisma.documents.updateMany).toHaveBeenCalledWith(
		expect.objectContaining({
			where: expect.objectContaining({ id: "older" }),
			data: { documentType: `${VISUAL_DOCUMENT_TYPE}-archived` },
		}),
	);
	expect(prisma.documents.deleteMany).toHaveBeenCalledTimes(1);
});

async function mockEditableDrawing() {
	const { row, state } = await mockSavedDrawing();
	const polygon = [
		{ x: 0.1, y: 0.1 },
		{ x: 0.4, y: 0.1 },
		{ x: 0.4, y: 0.4 },
	];
	state.marks = [
		{
			id: "zone",
			evidenceId: "first:0",
			page: 1,
			layer: "xps",
			confidence: 0.8,
			polygon,
			anchors: ["A", "B"],
			explanation: "Located",
		},
	];
	row.description = JSON.stringify(state);
	return {
		row,
		state,
		edit: {
			markId: "zone",
			expectedPolygon: polygon,
			polygon: [{ x: 0.15, y: 0.1 }, ...polygon.slice(1)],
		},
	};
}

it("appends new linked photos without replacing snapshots, manual zones or completed progress", async () => {
	const { row, state } = await mockEditableDrawing();
	state.marks[0].editedAt = "2026-09-25T10:00:00Z";
	state.marks[0].editedBy = "editor";
	row.description = JSON.stringify(state);
	jest.mocked(prisma.documents.create).mockClear();
	jest.mocked(prisma.sitediaryrecords.findMany).mockResolvedValue([
		{
			id: "first",
			Location: "1. stāvs",
			Works: "Changed",
			Comments: "Changed",
			Photos: ["https://example.com/new.jpg", "https://example.com/one.jpg"],
			Date: null,
			Amounts: 12,
			Units: "m2",
		},
		{
			id: "new-record",
			Location: " 1. STĀVS ",
			Works: "XPS",
			Comments: "New work",
			Photos: ["https://example.com/third.jpg"],
			Date: new Date("2026-09-28"),
			Amounts: 5,
			Units: "m2",
		},
		{
			id: "elsewhere",
			Location: "2. stāvs",
			Photos: ["https://example.com/other.jpg"],
		},
	] as never);
	const result = await appendVisualDiaryEvidence("user", "site", "drawing");
	expect(result.addedCount).toBe(2);
	expect(result.drawing.id).toBe("drawing");
	expect(result.drawing.state.evidence[0]).toEqual(state.evidence[0]);
	expect(result.drawing.state.marks).toEqual(state.marks);
	expect(result.drawing.state.unlocated).toEqual(state.unlocated);
	expect(result.drawing.state.attempts).toEqual(state.attempts);
	expect(result.drawing.state.processed).toBe(1);
	expect(result.drawing.state.imageProgress).toEqual([
		{ evidenceId: "first:0", status: "complete", error: null },
		...result.drawing.state.evidence
			.slice(1)
			.map((item) => ({ evidenceId: item.id, status: "pending", error: null })),
	]);
	expect(
		new Set(result.drawing.state.evidence.map((item) => item.id)).size,
	).toBe(3);
	expect(prisma.documents.create).not.toHaveBeenCalled();
	expect(prisma.documents.deleteMany).not.toHaveBeenCalled();
	expect(prisma.documents.updateMany).toHaveBeenCalledTimes(1);
	const update = jest.mocked(prisma.documents.updateMany).mock.calls[0][0];
	expect(update.where).toMatchObject({
		id: "drawing",
		description: row.description,
		organizationId: LIMENI_ORGANIZATION_ID,
	});
	expect(JSON.parse(update.data.description as string)).toEqual(
		result.drawing.state,
	);
	row.description = JSON.stringify(result.drawing.state);
	jest.mocked(prisma.documents.updateMany).mockClear();
	expect(
		(await appendVisualDiaryEvidence("user", "site", "drawing")).addedCount,
	).toBe(0);
	expect(prisma.documents.updateMany).not.toHaveBeenCalled();
});

it("removes deleted sources and their zones even without new photos", async () => {
	await mockEditableDrawing();
	jest.mocked(prisma.sitediaryrecords.findMany).mockResolvedValue([]);
	const result = await appendVisualDiaryEvidence("user", "site", "drawing");
	expect(result.addedCount).toBe(0);
	expect(result.removedCount).toBe(1);
	expect(result.drawing.state).toMatchObject({
		evidence: [],
		marks: [],
		unlocated: [],
		processed: 0,
		imageProgress: [],
	});
	expect(prisma.documents.updateMany).toHaveBeenCalledTimes(1);
});

it("reanalyzes even the same URL if it was deleted and then reattached", async () => {
	const { row } = await mockEditableDrawing();
	const records = await prisma.sitediaryrecords.findMany();
	jest.mocked(prisma.sitediaryrecords.findMany).mockResolvedValue([]);
	const removed = await appendVisualDiaryEvidence("user", "site", "drawing");
	row.description = JSON.stringify(removed.drawing.state);
	jest.mocked(prisma.sitediaryrecords.findMany).mockResolvedValue(records);
	const readded = await appendVisualDiaryEvidence("user", "site", "drawing");
	expect(readded.addedCount).toBe(1);
	expect(readded.drawing.state.marks).toEqual([]);
	expect(readded.drawing.state.processed).toBe(0);
	expect(readded.drawing.state.imageProgress?.[0].status).toBe("pending");
	expect(readded.drawing.state.evidence[0].id).not.toBe("first:0");
});

it("restarts using current diary links instead of deleted photo snapshots", async () => {
	await mockEditableDrawing();
	jest.mocked(prisma.sitediaryrecords.findMany).mockResolvedValue([]);
	const result = await resetVisualDrawing("user", "site", "drawing");
	expect(result.state.evidence).toEqual([]);
	expect(result.state.marks).toEqual([]);
});

it("treats a replacement photo as fresh evidence and never carries over the old zone", async () => {
	await mockEditableDrawing();
	jest.mocked(prisma.sitediaryrecords.findMany).mockResolvedValue([
		{
			id: "first",
			Location: "1. stāvs",
			Works: "XPS",
			Comments: "",
			Photos: ["https://example.com/readded.jpg"],
			Date: null,
			Amounts: 10,
			Units: "m2",
		},
	] as never);
	const result = await appendVisualDiaryEvidence("user", "site", "drawing");
	expect(result).toMatchObject({ addedCount: 1, removedCount: 1 });
	expect(result.drawing.state).toMatchObject({
		marks: [],
		processed: 0,
		status: "paused",
		unlocated: [],
	});
	expect(result.drawing.state.imageProgress?.[0].status).toBe("pending");
	expect(result.drawing.state.evidence[0].id).not.toBe("first:0");
});

it("rejects updates during analysis and concurrent changes without overwriting saved data", async () => {
	const { row, state } = await mockSavedDrawing();
	state.lockedAt = Date.now();
	row.description = JSON.stringify(state);
	await expect(
		appendVisualDiaryEvidence("user", "site", "drawing"),
	).rejects.toThrow("Analīze vēl notiek");
	expect(prisma.documents.updateMany).not.toHaveBeenCalled();
	state.lockedAt = null;
	state.evidence = [];
	row.description = JSON.stringify(state);
	jest.mocked(prisma.documents.updateMany).mockResolvedValue({ count: 0 });
	await expect(
		appendVisualDiaryEvidence("user", "site", "drawing"),
	).rejects.toThrow("jau tiek atjaunināta");
});

it("rejects exceeding the total photo limit without changing the drawing", async () => {
	const { row, state } = await mockSavedDrawing();
	state.evidence = Array.from({ length: 200 }, (_, i) => ({
		...state.evidence[0],
		id: `old:${i}`,
		photoUrl: `https://example.com/old-${i}.jpg`,
	}));
	row.description = JSON.stringify(state);
	jest.mocked(prisma.sitediaryrecords.findMany).mockResolvedValue([
		{
			id: "first",
			Location: "1. stāvs",
			Works: "XPS",
			Comments: "",
			Date: null,
			Amounts: 10,
			Units: "m2",
			Photos: [
				...state.evidence.map((item) => item.photoUrl),
				"https://example.com/new.jpg",
			],
		},
	] as never);
	await expect(
		appendVisualDiaryEvidence("user", "site", "drawing"),
	).rejects.toThrow("vairāk nekā 200");
	expect(prisma.documents.updateMany).not.toHaveBeenCalled();
});

it("saves only polygon geometry with editor attribution and keeps diary evidence intact", async () => {
	const { state, edit } = await mockEditableDrawing();
	const updated = await editVisualPolygon("user", "site", "drawing", edit);
	expect(updated.state.evidence).toEqual(state.evidence);
	expect(updated.state.marks[0]).toMatchObject({
		polygon: edit.polygon,
		editedBy: "user",
		editedAt: expect.any(String),
		evidenceId: "first:0",
		layer: "xps",
	});
	expect(prisma.documents.updateMany).toHaveBeenCalledTimes(1);
});

it("rejects stale polygon edits and unknown zones", async () => {
	const { edit } = await mockEditableDrawing();
	await expect(
		editVisualPolygon("user", "site", "drawing", {
			...edit,
			expectedPolygon: edit.polygon,
		}),
	).rejects.toThrow("Zona jau ir mainīta");
	await expect(
		editVisualPolygon("user", "site", "drawing", {
			...edit,
			markId: "missing",
		}),
	).rejects.toThrow("Zona nav atrasta");
	expect(prisma.documents.updateMany).not.toHaveBeenCalled();
});

it("rejects invalid geometry and edits during active analysis", async () => {
	const { edit, row, state } = await mockEditableDrawing();
	for (const polygon of [
		[
			{ x: -0.1, y: 0 },
			{ x: 1, y: 0 },
			{ x: 1, y: 1 },
		],
		[
			{ x: 0, y: 0 },
			{ x: 1, y: 1 },
			{ x: 0, y: 1 },
			{ x: 1, y: 0 },
		],
	])
		await expect(
			editVisualPolygon("user", "site", "drawing", { ...edit, polygon }),
		).rejects.toThrow();
	row.description = JSON.stringify({ ...state, lockedAt: Date.now() });
	await expect(
		editVisualPolygon("user", "site", "drawing", edit),
	).rejects.toThrow("Analīze vēl notiek");
	expect(prisma.documents.updateMany).not.toHaveBeenCalled();
});

it("deletes only the authorized visual record with concurrency protection", async () => {
	const { row } = await mockSavedDrawing();
	await removeVisualDrawing("user", "site", "drawing");
	expect(prisma.documents.deleteMany).toHaveBeenCalledWith({
		where: {
			id: "drawing",
			siteId: "site",
			organizationId: LIMENI_ORGANIZATION_ID,
			documentType: VISUAL_DOCUMENT_TYPE,
			description: row.description,
		},
	});
	expect(requireWarehouseImportAccess).toHaveBeenLastCalledWith("user", "site");
});

it("restarts the same drawing from the first image without changing its sources", async () => {
	const { row, state } = await mockSavedDrawing();
	state.imageProgress = state.evidence.map((item) => ({
		evidenceId: item.id,
		status: "complete",
		error: null,
	}));
	jest
		.mocked(prisma.documents.findFirst)
		.mockResolvedValue({ ...row, description: JSON.stringify(state) } as never);
	const result = await resetVisualDrawing("user", "site", "drawing");
	expect(result.id).toBe("drawing");
	expect(result.state).toMatchObject({
		status: "uploaded",
		processed: 0,
		marks: [],
		unlocated: [],
		error: null,
		lockedAt: null,
		evidence: state.evidence,
	});
	expect(result.state.imageProgress).toBeUndefined();
	expect(prisma.documents.create).toHaveBeenCalledTimes(1);
	expect(prisma.documents.updateMany).toHaveBeenCalledWith(
		expect.objectContaining({
			where: expect.objectContaining({ description: JSON.stringify(state) }),
		}),
	);
});

it.each([removeVisualDrawing, resetVisualDrawing])(
	"blocks mutations during active analysis",
	async (mutate) => {
		const { row, state } = await mockSavedDrawing();
		state.lockedAt = Date.now();
		jest.mocked(prisma.documents.findFirst).mockResolvedValue({
			...row,
			description: JSON.stringify(state),
		} as never);
		await expect(mutate("user", "site", "drawing")).rejects.toThrow(
			"vēl notiek",
		);
		expect(prisma.documents.deleteMany).not.toHaveBeenCalled();
		expect(prisma.documents.updateMany).not.toHaveBeenCalled();
	},
);

it.each([removeVisualDrawing, resetVisualDrawing])(
	"rejects mutations without organization access",
	async (mutate) => {
		jest
			.mocked(requireWarehouseImportAccess)
			.mockRejectedValue(new Error("Denied"));
		await expect(mutate("user", "site", "drawing")).rejects.toThrow("Denied");
		expect(prisma.documents.deleteMany).not.toHaveBeenCalled();
		expect(prisma.documents.updateMany).not.toHaveBeenCalled();
	},
);

it("allows restarting after a processing lease expires", async () => {
	const { row, state } = await mockSavedDrawing();
	state.lockedAt = Date.now() - VISUAL_LEASE_MS - 1;
	jest
		.mocked(prisma.documents.findFirst)
		.mockResolvedValue({ ...row, description: JSON.stringify(state) } as never);
	expect(
		(await resetVisualDrawing("user", "site", "drawing")).state.lockedAt,
	).toBeNull();
});

it("reports a concurrent change instead of silently deleting", async () => {
	await mockSavedDrawing();
	jest.mocked(prisma.documents.deleteMany).mockResolvedValue({ count: 0 });
	await expect(removeVisualDrawing("user", "site", "drawing")).rejects.toThrow(
		"jau ir mainīts",
	);
});

it("rejects non-Limeni organizations", async () => {
	jest.mocked(requireWarehouseImportAccess).mockResolvedValue({
		userId: "user",
		siteId: "site",
		organizationId: "other",
	});
	await expect(requireVisualAccess("user", "site")).rejects.toThrow(
		"nav pieejams",
	);
	expect(prisma.documents.create).not.toHaveBeenCalled();
});

it("snapshots only the selected location and enforces site/org/archive scope", async () => {
	await createVisualDrawing({
		userId: "user",
		siteId: "site",
		location: "1. stāvs",
		name: "Plan.pdf",
		url: "https://a.ufs.sh/f/plan",
	});
	expect(prisma.sitediaryrecords.findMany).toHaveBeenCalledWith(
		expect.objectContaining({
			where: expect.objectContaining({
				siteId: "site",
				organizationId: LIMENI_ORGANIZATION_ID,
				archivedAt: null,
			}),
		}),
	);
	const data = jest.mocked(prisma.documents.create).mock.calls[0][0].data;
	const state = JSON.parse(data.description as string) as VisualState;
	expect(state.evidence.map((item) => item.recordId)).toEqual(["first"]);
	expect(data.documentType).toBe(VISUAL_DOCUMENT_TYPE);
});

it("does not save a drawing with no linked photos in the location", async () => {
	await expect(
		createVisualDrawing({
			userId: "user",
			siteId: "site",
			location: "3. stāvs",
			name: "Plan.pdf",
			url: "https://a.ufs.sh/f/plan",
		}),
	).rejects.toThrow("Nevar atrast darbus");
	expect(prisma.documents.create).not.toHaveBeenCalled();
});

it("scopes reads to the requested site and organization", async () => {
	jest.mocked(prisma.documents.findFirst).mockResolvedValue(null);
	await expect(
		loadVisualDrawing("user", "site", "other-drawing"),
	).rejects.toThrow("nav atrasts");
	expect(prisma.documents.findFirst).toHaveBeenCalledWith({
		where: {
			id: "other-drawing",
			siteId: "site",
			organizationId: LIMENI_ORGANIZATION_ID,
			documentType: VISUAL_DOCUMENT_TYPE,
		},
	});
});

it("uses compare-and-swap to prevent concurrent results overwriting one another", async () => {
	await createVisualDrawing({
		userId: "user",
		siteId: "site",
		location: "1. stāvs",
		name: "Plan.pdf",
		url: "https://a.ufs.sh/f/plan",
	});
	const state = JSON.parse(
		jest.mocked(prisma.documents.create).mock.calls[0][0].data
			.description as string,
	);
	jest.mocked(prisma.documents.updateMany).mockResolvedValue({ count: 0 });
	await expect(
		saveVisualState(
			{
				id: "drawing",
				siteId: "site",
				organizationId: LIMENI_ORGANIZATION_ID,
				description: "old-state",
			},
			state,
		),
	).rejects.toThrow("jau tiek atjaunināta");
	expect(prisma.documents.updateMany).toHaveBeenCalledWith(
		expect.objectContaining({
			where: expect.objectContaining({
				description: "old-state",
				siteId: "site",
			}),
		}),
	);
});
