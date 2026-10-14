import { createPerfTrace } from "@/lib/observability/perf";
import { requireUser } from "@/lib/utils/requireUser";
import {
	saveVisualPolygon as legacySaveVisualPolygon,
	saveVisualPolygonPatch as saveVisualPolygon,
} from "./actions";
import { PolygonSaveConflictError } from "./polygon-edit";
import { editVisualPolygon, loadVisualDrawing } from "./store";

jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/lib/utils/requireUser", () => ({ requireUser: jest.fn() }));
jest.mock("./store", () => ({
	editVisualPolygon: jest.fn(),
	loadVisualDrawing: jest.fn(),
}));
jest.mock("./planning-store", () => ({}));
jest.mock("./layer-store", () => ({}));
const trace = {
	measure: jest.fn(async (_phase: string, task: () => unknown) => task()),
	end: jest.fn(),
	fail: jest.fn(),
};
jest.mock("@/lib/observability/perf", () => ({
	createPerfTrace: jest.fn(() => trace),
}));

beforeEach(() => {
	jest.clearAllMocks();
	jest.mocked(requireUser).mockResolvedValue({ id: "user" } as never);
});

it("returns a compact polygon acknowledgement and records session/response/save timings", async () => {
	const result = {
		drawingId: "drawing",
		markId: "mark",
		polygon: [
			{ x: 0, y: 0 },
			{ x: 1, y: 0 },
			{ x: 1, y: 1 },
		],
		editedAt: "2026-10-13",
		editedBy: "user",
		mutationId: null,
	};
	jest.mocked(editVisualPolygon).mockResolvedValue(result);
	const response = await saveVisualPolygon("site", "drawing", {
		markId: "mark",
	});
	expect(response).toEqual({ ok: true, result });
	expect(editVisualPolygon).toHaveBeenCalledWith(
		"user",
		"site",
		"drawing",
		{ markId: "mark" },
		trace,
	);
	expect(trace.measure.mock.calls.map(([phase]) => phase)).toEqual([
		"session",
		"response",
	]);
	expect(trace.end).toHaveBeenCalledWith({
		status: 200,
		extra: {
			drawingId: "drawing",
			markId: "mark",
			responseBytes: expect.any(Number),
		},
	});
	expect(createPerfTrace).toHaveBeenCalledWith(
		expect.objectContaining({ category: "action", siteId: "site" }),
	);
});

it("returns reviewable conflicts and hides internal errors without claiming a failed edit was saved", async () => {
	jest
		.mocked(editVisualPolygon)
		.mockRejectedValueOnce(
			new PolygonSaveConflictError("Zona jau ir mainīta."),
		);
	expect(await saveVisualPolygon("site", "drawing", {})).toEqual({
		ok: false,
		code: "conflict",
		error: "Zona jau ir mainīta.",
	});
	jest
		.mocked(editVisualPolygon)
		.mockRejectedValueOnce(new Error("Database credentials must never leak"));
	const failed = await saveVisualPolygon("site", "drawing", {});
	expect(failed).toMatchObject({ ok: false, code: "error" });
	expect(JSON.stringify(failed)).not.toContain("credentials");
	expect(trace.end).not.toHaveBeenCalled();
	expect(trace.fail).toHaveBeenCalledTimes(2);
});

it("requires authentication before reading or changing geometry", async () => {
	jest
		.mocked(requireUser)
		.mockRejectedValueOnce(new Error("Authentication required"));
	await expect(saveVisualPolygon("site", "drawing", {})).rejects.toThrow(
		"Authentication required",
	);
	expect(editVisualPolygon).not.toHaveBeenCalled();
});

it("preserves the full-drawing save response for already-open legacy clients", async () => {
	const drawing = { id: "drawing", state: { marks: [] } };
	jest.mocked(loadVisualDrawing).mockResolvedValue({ drawing } as never);
	expect(await legacySaveVisualPolygon("site", "drawing", {})).toBe(drawing);
	expect(editVisualPolygon).toHaveBeenCalledWith("user", "site", "drawing", {});
});
