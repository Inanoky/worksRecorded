const findFirst = jest.fn();
const updateMany = jest.fn();
const requireVisualAccess = jest.fn();
jest.mock("@/lib/utils/db", () => ({
	prisma: { documents: { findFirst, updateMany } },
}));
jest.mock("./store", () => ({ requireVisualAccess }));

import { persistVisualDrawingScale } from "./drawing-scale-store";

const state = {
	version: 1,
	location: "1. stāvs",
	status: "complete",
	pageCount: 2,
	processed: 0,
	evidence: [],
	marks: [],
	unlocated: [],
	error: null,
	lockedAt: null,
	attempts: [],
};
beforeEach(() => {
	jest.clearAllMocks();
	requireVisualAccess.mockResolvedValue({ organizationId: "limeni" });
	findFirst.mockResolvedValue({ description: JSON.stringify(state) });
	updateMany.mockResolvedValue({ count: 1 });
});

it("saves the page override with access checks and preserves the rest of the drawing", async () => {
	expect(
		await persistVisualDrawingScale("user", "site", "drawing", {
			page: 2,
			scale: 100,
			expected: null,
		}),
	).toEqual({ 2: 100 });
	expect(requireVisualAccess).toHaveBeenCalledWith("user", "site");
	expect(updateMany).toHaveBeenCalledWith({
		where: expect.objectContaining({
			id: "drawing",
			siteId: "site",
			organizationId: "limeni",
			description: JSON.stringify(state),
		}),
		data: { description: JSON.stringify({ ...state, pageScales: { 2: 100 } }) },
	});
});

it("refuses to overwrite another user's scale correction", async () => {
	findFirst.mockResolvedValue({
		description: JSON.stringify({ ...state, pageScales: { 1: 50 } }),
	});
	await expect(
		persistVisualDrawingScale("user", "site", "drawing", {
			page: 1,
			scale: 100,
			expected: null,
		}),
	).rejects.toThrow("citā logā");
	expect(updateMany).not.toHaveBeenCalled();
});

it("retries a concurrent drawing update and keeps unrelated changes", async () => {
	updateMany.mockResolvedValueOnce({ count: 0 });
	findFirst
		.mockResolvedValueOnce({ description: JSON.stringify(state) })
		.mockResolvedValueOnce({
			description: JSON.stringify({ ...state, pageScales: { 2: 20 } }),
		});
	expect(
		await persistVisualDrawingScale("user", "site", "drawing", {
			page: 1,
			scale: 100,
			expected: null,
		}),
	).toEqual({ 1: 100, 2: 20 });
});

it("can return a page to automatic detection and rejects invalid pages", async () => {
	findFirst.mockResolvedValue({
		description: JSON.stringify({ ...state, pageScales: { 1: 50, 2: 100 } }),
	});
	expect(
		await persistVisualDrawingScale("user", "site", "drawing", {
			page: 1,
			scale: null,
			expected: 50,
		}),
	).toEqual({ 2: 100 });
	await expect(
		persistVisualDrawingScale("user", "site", "drawing", {
			page: 3,
			scale: 100,
			expected: null,
		}),
	).rejects.toThrow("lapa nav atrasta");
});
