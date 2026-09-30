import type { Prisma } from "@prisma/client";
import { deleteVisualPhotoEvidence } from "./delete-photo-evidence";
import { VISUAL_DOCUMENT_TYPE, type VisualState } from "./model";
import { pruneVisualEvidence } from "./prune-evidence";

const evidence = ["old", "keep"].map((id) => ({
	id,
	recordId: id,
	photoUrl: `https://example.com/${id}`,
	work: "XPS",
	location: "floor",
	description: "",
	date: null,
	amount: 1,
	unit: "m2",
}));
function fixture(): VisualState {
	return {
		version: 1,
		location: "floor",
		status: "complete",
		pageCount: 1,
		processed: 2,
		evidence,
		marks: evidence.map((item) => ({
			id: `zone-${item.id}`,
			evidenceId: item.id,
			page: 1,
			layer: "xps",
			confidence: 0.8,
			anchors: ["A", "B"],
			explanation: "done",
			polygon: [
				{ x: 0, y: 0 },
				{ x: 1, y: 0 },
				{ x: 1, y: 1 },
			],
			editedBy: "user",
		})),
		unlocated: [{ evidenceId: "old", reason: "partial" }],
		error: null,
		lockedAt: null,
		attempts: [],
	};
}

it("keeps other sources, manual polygons and audit attempts; repairs legacy progress", () => {
	const state = fixture();
	const next = pruneVisualEvidence(state, (item) => item.id !== "old");
	expect(next.marks).toEqual([state.marks[1]]);
	expect(next.evidence).toEqual([state.evidence[1]]);
	expect(next.unlocated).toEqual([]);
	expect(next.processed).toBe(1);
	expect(next.imageProgress).toEqual([
		{ evidenceId: "keep", status: "complete", error: null },
	]);
	expect(next.attempts).toEqual(state.attempts);
	expect(pruneVisualEvidence(state, () => true)).toBe(state);
	expect(state.evidence).toHaveLength(2);
});

it("clears stale running work and allows retry without restoring removed sources", () => {
	const state = fixture();
	state.imageProgress = evidence.map((item) => ({
		evidenceId: item.id,
		status: "running",
		error: null,
	}));
	state.lockedAt = 1;
	const next = pruneVisualEvidence(state, (item) => item.id !== "old");
	expect(next).toMatchObject({
		lockedAt: null,
		processed: 0,
		status: "paused",
	});
	expect(next.imageProgress?.[0].status).toBe("pending");
});

it("locks scoped drawings and removes only matching URLs with compare-and-swap", async () => {
	const description = JSON.stringify(fixture());
	const query = jest.fn().mockResolvedValue([{ id: "drawing", description }]);
	const update = jest.fn().mockResolvedValue({ count: 1 });
	const tx = {
		$queryRaw: query,
		documents: { updateMany: update },
	} as unknown as Prisma.TransactionClient;
	await deleteVisualPhotoEvidence(tx, "site", "org", [evidence[0].photoUrl]);
	expect(query.mock.calls[0].slice(1)).toEqual([
		"site",
		"org",
		VISUAL_DOCUMENT_TYPE,
	]);
	expect(query.mock.calls[0][0].join("?")).toContain("FOR UPDATE");
	expect(query.mock.calls[0][0].join("?")).toContain('FROM "Documents"');
	expect(update.mock.calls[0][0].where).toEqual({
		id: "drawing",
		siteId: "site",
		organizationId: "org",
		documentType: VISUAL_DOCUMENT_TYPE,
		description,
	});
	expect(
		JSON.parse(update.mock.calls[0][0].data.description).marks,
	).toHaveLength(1);
	update.mockClear();
	await deleteVisualPhotoEvidence(tx, "site", "org", [
		"https://example.com/unrelated",
	]);
	expect(update).not.toHaveBeenCalled();
	update.mockResolvedValue({ count: 0 });
	await expect(
		deleteVisualPhotoEvidence(tx, "site", "org", [evidence[0].photoUrl]),
	).rejects.toThrow("Drawing changed");
});

it("rejects deletion of an active source so analysis cannot resurrect it", async () => {
	const state = { ...fixture(), lockedAt: Date.now(), status: "running" };
	const update = jest.fn();
	const tx = {
		$queryRaw: jest
			.fn()
			.mockResolvedValue([
				{ id: "drawing", description: JSON.stringify(state) },
			]),
		documents: { updateMany: update },
	} as unknown as Prisma.TransactionClient;
	await expect(
		deleteVisualPhotoEvidence(tx, "site", "org", [evidence[0].photoUrl]),
	).rejects.toThrow("Analīze vēl notiek");
	expect(update).not.toHaveBeenCalled();
});
