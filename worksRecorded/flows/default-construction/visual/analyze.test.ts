import { analyzeVisualBatch } from "./analyze";
import { VISUAL_LEASE_MS, type VisualDrawing } from "./model";
import { loadVisualPdf } from "./pdf";
import { loadVisualDrawing, saveVisualState } from "./store";

const mockParse = jest.fn();
jest.mock("openai", () => ({
	__esModule: true,
	default: jest.fn(() => ({ responses: { parse: mockParse } })),
}));
jest.mock("./store", () => ({
	loadVisualDrawing: jest.fn(),
	saveVisualState: jest.fn(),
}));
jest.mock("./pdf", () => ({ loadVisualPdf: jest.fn() }));

const photo = {
	id: "record:0",
	recordId: "record",
	photoUrl: "https://example.com/photo.jpg",
	work: "XPS",
	location: "1. stāvs",
	description: "Pabeigts",
	date: null,
	amount: 10,
	unit: "m2",
};
const mark = {
	evidenceId: photo.id,
	page: 1,
	confidence: 0.95,
	polygon: [
		{ x: 0.1, y: 0.1 },
		{ x: 0.4, y: 0.1 },
		{ x: 0.4, y: 0.4 },
	],
	anchors: ["Ass 1", "Kāpnes"],
	explanation: "Atbilst",
};
let drawing: VisualDrawing;

beforeEach(() => {
	jest.clearAllMocks();
	drawing = {
		id: "drawing",
		name: "plan.pdf",
		createdAt: "2026-09-23",
		state: {
			version: 1,
			location: "1. stāvs",
			status: "uploaded",
			pageCount: null,
			processed: 0,
			evidence: [photo],
			marks: [],
			unlocated: [],
			error: null,
			lockedAt: null,
			attempts: [],
		},
	};
	jest.mocked(loadVisualDrawing).mockImplementation(
		async () =>
			({
				row: {
					id: "drawing",
					siteId: "site",
					organizationId: "org",
					description: "old",
					url: "https://a.ufs.sh/f/plan",
					documentName: "plan.pdf",
				},
				drawing,
			}) as never,
	);
	jest
		.mocked(saveVisualState)
		.mockImplementation(async (row) => ({ ...row, description: "locked" }));
	jest
		.mocked(loadVisualPdf)
		.mockResolvedValue({ bytes: Buffer.from("%PDF-1.7"), pageCount: 1 });
	mockParse.mockResolvedValue({
		id: "response",
		usage: { input_tokens: 100, output_tokens: 50 },
		output_text: "result",
		output_parsed: { marks: [mark], unlocated: [] },
	});
});

it("persists a generation before calling AI and stores provenance, usage and results", async () => {
	const result = await analyzeVisualBatch("user", "site", "drawing");
	expect(jest.mocked(saveVisualState).mock.invocationCallOrder[0]).toBeLessThan(
		mockParse.mock.invocationCallOrder[0],
	);
	expect(result.state.status).toBe("complete");
	expect(result.state.marks[0]).toMatchObject({
		layer: "xps",
		evidenceId: photo.id,
	});
	expect(result.state.attempts[0]).toMatchObject({
		status: "complete",
		inputTokens: 100,
		outputTokens: 50,
		userId: "user",
		rawOutput: "result",
	});
	expect(result.state.lockedAt).toBeNull();
});

it("returns the explicit cannot-locate error when no image matches", async () => {
	mockParse.mockResolvedValue({
		output_parsed: {
			marks: [],
			unlocated: [{ evidenceId: photo.id, reason: "Cita ēka" }],
		},
	});
	const result = await analyzeVisualBatch("user", "site", "drawing");
	expect(result.state.status).toBe("unlocated");
	expect(result.state.error).toContain("Nevar atrast darbus");
	expect(result.state.marks).toEqual([]);
});

it("saves partial progress and resumes only the remaining photo batch", async () => {
	drawing.state.evidence = Array.from({ length: 7 }, (_, index) => ({
		...photo,
		id: `photo-${index}`,
	}));
	mockParse.mockResolvedValue({ output_parsed: { marks: [], unlocated: [] } });
	expect(
		(await analyzeVisualBatch("user", "site", "drawing")).state.processed,
	).toBe(6);
	expect(drawing.state.status).toBe("paused");
	await analyzeVisualBatch("user", "site", "drawing");
	expect(drawing.state.processed).toBe(7);
	expect(
		mockParse.mock.calls[1][0].input[0].content.filter(
			(item: { type: string }) => item.type === "input_image",
		),
	).toHaveLength(1);
});

it("retains the cursor on timeout and allows retry without losing previous results", async () => {
	mockParse.mockRejectedValue(new Error("timeout"));
	const result = await analyzeVisualBatch("user", "site", "drawing");
	expect(result.state).toMatchObject({
		status: "failed",
		processed: 0,
		lockedAt: null,
	});
	expect(result.state.attempts[0].status).toBe("failed");
	expect(saveVisualState).toHaveBeenCalledTimes(2);
});

it("prevents duplicate active analysis", async () => {
	drawing.state.lockedAt = Date.now();
	await expect(analyzeVisualBatch("user", "site", "drawing")).rejects.toThrow(
		"jau notiek",
	);
	expect(mockParse).not.toHaveBeenCalled();
});

it("recovers an expired lease", async () => {
	drawing.state.lockedAt = Date.now() - VISUAL_LEASE_MS - 1;
	drawing.state.status = "running";
	expect(
		(await analyzeVisualBatch("user", "site", "drawing")).state.status,
	).toBe("complete");
});

it("does not call AI again for a completed drawing", async () => {
	drawing.state.status = "complete";
	await analyzeVisualBatch("user", "site", "drawing");
	expect(mockParse).not.toHaveBeenCalled();
});
