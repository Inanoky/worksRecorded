import type { Prisma } from "@prisma/client";
import { suggestForma2Position } from "../lib/forma2-analytics";
import { syncDiaryEditAssignments } from "./diary-forma2-sync";

jest.mock("../lib/forma2-analytics", () => {
	const actual = jest.requireActual("../lib/forma2-analytics");
	return { ...actual, suggestForma2Position: jest.fn() };
});
const analytics = { findUnique: jest.fn(), updateMany: jest.fn() };
const db = { analytics } as unknown as Prisma.TransactionClient;
const state = {
	version: 1,
	document: {
		id: "doc",
		positions: [{ id: "position", name: "XPS", kind: "work" }],
	},
	allocations: [
		{
			sourceType: "work",
			sourceId: "untouched",
			positionId: "manual-position",
			method: "manual",
		},
		{
			sourceType: "work",
			sourceId: "split",
			positionId: "position",
			split: {
				mode: "quantity",
				parts: [{ positionId: "position", value: 1 }],
			},
		},
	],
};
beforeEach(() => {
	jest.clearAllMocks();
	analytics.findUnique.mockResolvedValue({
		currentWeekProgress: {
			defaultConstructionForma2: state,
			unrelated: "preserved",
		},
	});
	analytics.updateMany.mockResolvedValue({ count: 1 });
	jest
		.mocked(suggestForma2Position)
		.mockReturnValue({ positionId: "position", confidence: 1 } as never);
});
it("does no analytics reads when work names have not changed", async () => {
	await syncDiaryEditAssignments(db, "site", []);
	expect(analytics.findUnique).not.toHaveBeenCalled();
});
it("writes all changed-work assignments once while preserving splits and unrelated manual links", async () => {
	await syncDiaryEditAssignments(db, "site", [
		{ id: "first", work: "XPS" },
		{ id: "second", work: "Sand" },
		{ id: "split", work: "New work" },
	]);
	expect(analytics.updateMany).toHaveBeenCalledTimes(1);
	const data = analytics.updateMany.mock.calls[0][0].data.currentWeekProgress;
	expect(data.unrelated).toBe("preserved");
	expect(data.defaultConstructionForma2.allocations).toEqual(
		expect.arrayContaining([
			expect.objectContaining({
				sourceId: "untouched",
				positionId: "manual-position",
			}),
			expect.objectContaining({ sourceId: "split", split: expect.any(Object) }),
			expect.objectContaining({ sourceId: "first" }),
			expect.objectContaining({ sourceId: "second" }),
		]),
	);
});
it("rejects concurrent analytics changes instead of overwriting them", async () => {
	analytics.updateMany.mockResolvedValue({ count: 0 });
	await expect(
		syncDiaryEditAssignments(db, "site", [{ id: "first", work: "XPS" }]),
	).rejects.toThrow("Forma 2 dati ir mainīti");
});
