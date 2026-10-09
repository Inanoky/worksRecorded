import { analyzeVisualBatch } from "./analyze";
import {
	VISUAL_LEASE_MS,
	type VisualDrawing,
	visualStateSchema,
} from "./model";
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
const originalVisualModel = process.env.LIMENI_VISUAL_MODEL;

it("keeps the last valid polygon after a changed source fails analysis", async () => {
	drawing.state.marks = [{ ...mark, id: "old-zone", layer: "xps" }];
	drawing.state.imageProgress = [
		{ evidenceId: photo.id, status: "pending", error: null },
	];
	drawing.state.status = "paused";
	mockParse.mockRejectedValue(new Error("timeout"));
	const result = await analyzeVisualBatch("user", "site", "drawing");
	expect(result.state.status).toBe("failed");
	expect(result.state.marks).toEqual([
		{ ...mark, id: "old-zone", layer: "xps" },
	]);
});

it("replaces rather than duplicates the prior polygon after successful reanalysis", async () => {
	drawing.state.marks = [{ ...mark, id: "old-zone", layer: "xps" }];
	drawing.state.imageProgress = [
		{ evidenceId: photo.id, status: "pending", error: null },
	];
	drawing.state.status = "paused";
	mockParse.mockResolvedValue({
		output_parsed: { marks: [mark], unlocated: [] },
	});
	const result = await analyzeVisualBatch("user", "site", "drawing");
	expect(result.state.marks).toHaveLength(1);
	expect(result.state.marks[0].id).not.toBe("old-zone");
});

afterEach(() => {
	if (originalVisualModel === undefined) delete process.env.LIMENI_VISUAL_MODEL;
	else process.env.LIMENI_VISUAL_MODEL = originalVisualModel;
});

beforeEach(() => {
	jest.clearAllMocks();
	delete process.env.LIMENI_VISUAL_MODEL;
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
	jest.mocked(saveVisualState).mockImplementation(async (row, state) => ({
		...row,
		description: JSON.stringify(visualStateSchema.parse(state)),
	}));
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
		evidenceId: photo.id,
		status: "complete",
		inputTokens: 100,
		outputTokens: 50,
		userId: "user",
		rawOutput: "result",
	});
	const lastSave = await jest.mocked(saveVisualState).mock.results.at(-1)
		?.value;
	expect(JSON.parse(lastSave.description).attempts[0].evidenceId).toBe(
		photo.id,
	);
	expect(result.state.lockedAt).toBeNull();
});

it("analyzes appended evidence only and preserves previous manually edited zones", async () => {
	const edited = {
		...mark,
		id: "edited",
		layer: "xps" as const,
		editedAt: "2026-09-25T10:00:00Z",
		editedBy: "editor",
	};
	drawing.state.marks = [edited];
	drawing.state.evidence.push({
		...photo,
		id: "new-photo",
		recordId: "new-record",
	});
	drawing.state.processed = 1;
	drawing.state.status = "paused";
	drawing.state.imageProgress = [
		{ evidenceId: photo.id, status: "complete", error: null },
		{ evidenceId: "new-photo", status: "pending", error: null },
	];
	mockParse.mockResolvedValue({
		id: "response",
		output_parsed: {
			marks: [{ ...mark, evidenceId: "new-photo" }],
			unlocated: [],
		},
	});
	const result = await analyzeVisualBatch("user", "site", "drawing");
	expect(mockParse).toHaveBeenCalledTimes(1);
	expect(result.state.marks).toContainEqual(edited);
	expect(result.state.marks).toHaveLength(2);
	expect(result.state.processed).toBe(2);
	expect(result.state.attempts[0].evidenceId).toBe("new-photo");
});

it("uses GPT-6 Sol with medium reasoning by default", async () => {
	const result = await analyzeVisualBatch("user", "site", "drawing");
	expect(mockParse).toHaveBeenCalledWith(
		expect.objectContaining({
			model: "gpt-6-sol",
			reasoning: { effort: "medium" },
		}),
		{ timeout: 150_000 },
	);
	expect(result.state.attempts[0].model).toBe("gpt-6-sol");
});

it("preserves the visual-only model override with medium reasoning", async () => {
	process.env.LIMENI_VISUAL_MODEL = " gpt-5.4 ";
	const result = await analyzeVisualBatch("user", "site", "drawing");
	expect(mockParse).toHaveBeenCalledWith(
		expect.objectContaining({
			model: "gpt-5.4",
			reasoning: { effort: "medium" },
		}),
		expect.anything(),
	);
	expect(result.state.attempts[0].model).toBe("gpt-5.4");
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

it("saves approximate stripe regions while leaving unrelated photos unlocated", async () => {
	drawing.state.evidence.push({
		...photo,
		id: "delivery",
		work: "Materiālu piegāde",
	});
	mockParse.mockResolvedValue({
		output_parsed: {
			marks: [
				{
					...mark,
					confidence: 0.6,
					explanation: "Aptuveni pēc svītrām; robežas pielāgotas gaitenim.",
				},
			],
			unlocated: [
				{ evidenceId: "delivery", reason: "Piegādes foto bez darbu atzīmēm." },
			],
		},
	});
	const result = await analyzeVisualBatch("user", "site", "drawing");
	expect(result.state.status).toBe("complete");
	expect(result.state.marks).toHaveLength(1);
	expect(result.state.marks[0].confidence).toBe(0.6);
	expect(result.state.unlocated).toEqual([
		{ evidenceId: "delivery", reason: "Piegādes foto bez darbu atzīmēm." },
	]);
	expect(mockParse.mock.calls[0][0].instructions).toContain(
		"Do not require closed outlines or ideal stripes",
	);
	expect(mockParse.mock.calls[0][0].instructions).toContain(
		"Transfer the INTENDED WORK ZONE, not a pixel-perfect copy of the source ink",
	);
	expect(mockParse.mock.calls[0][0].instructions).toContain(
		"Preserve clearly partial-room coverage, openings and excluded areas",
	);
});

it("processes all images in one request with one model call per image", async () => {
	drawing.state.evidence = Array.from({ length: 7 }, (_, index) => ({
		...photo,
		id: `photo-${index}`,
	}));
	mockParse.mockResolvedValue({ output_parsed: { marks: [], unlocated: [] } });
	expect(
		(await analyzeVisualBatch("user", "site", "drawing")).state.processed,
	).toBe(7);
	expect(drawing.state.status).toBe("unlocated");
	await analyzeVisualBatch("user", "site", "drawing");
	expect(drawing.state.processed).toBe(7);
	expect(mockParse).toHaveBeenCalledTimes(7);
	expect(loadVisualPdf).toHaveBeenCalledTimes(1);
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
	expect(result.state.imageProgress?.[0]).toMatchObject({
		status: "failed",
		error: expect.stringContaining("laika limitu"),
	});
	expect(saveVisualState).toHaveBeenCalledTimes(4);
});

it("starts every image concurrently, saves out of order and retries only failures", async () => {
	drawing.state.evidence = [0, 1, 2].map((i) => ({
		...photo,
		id: `photo-${i}`,
	}));
	const completions: Array<{
		resolve: (value: unknown) => void;
		reject: (error: Error) => void;
	}> = [];
	const snapshots: VisualDrawing["state"][] = [];
	jest.mocked(saveVisualState).mockImplementation(async (row, state) => {
		snapshots.push(JSON.parse(JSON.stringify(state)));
		return { ...row, description: JSON.stringify(state) };
	});
	mockParse.mockImplementation(
		() =>
			new Promise((resolve, reject) => completions.push({ resolve, reject })),
	);
	const run = analyzeVisualBatch("user", "site", "drawing");
	await new Promise((resolve) => setTimeout(resolve, 0));
	expect(completions).toHaveLength(3);
	completions[2].resolve({
		id: "third",
		output_text: "result",
		output_parsed: {
			marks: [{ ...mark, evidenceId: "photo-2" }],
			unlocated: [],
		},
	});
	await new Promise((resolve) => setTimeout(resolve, 0));
	expect(snapshots.at(-1)).toMatchObject({ status: "running", processed: 1 });
	expect(snapshots.at(-1)?.marks[0].evidenceId).toBe("photo-2");
	completions[0].reject(new Error("timeout"));
	completions[1].resolve({
		id: "second",
		output_text: "result",
		output_parsed: {
			marks: [],
			unlocated: [{ evidenceId: "photo-1", reason: "Cita ēka" }],
		},
	});
	await run;
	expect(drawing.state).toMatchObject({
		status: "failed",
		processed: 2,
		lockedAt: null,
	});
	expect(drawing.state.imageProgress?.map((item) => item.status)).toEqual([
		"failed",
		"complete",
		"complete",
	]);
	mockParse.mockResolvedValue({
		id: "retry",
		output_text: "result",
		output_parsed: {
			marks: [{ ...mark, evidenceId: "photo-0" }],
			unlocated: [],
		},
	});
	await analyzeVisualBatch("user", "site", "drawing");
	expect(mockParse).toHaveBeenCalledTimes(4);
	expect(mockParse.mock.calls[3][0].input[0].content[2].text).toContain(
		'"evidenceId":"photo-0"',
	);
	expect(drawing.state.processed).toBe(3);
	expect(drawing.state.marks).toHaveLength(2);
	expect(drawing.state.unlocated).toHaveLength(1);
	expect(drawing.state.status).toBe("complete");
});

it("serializes incremental writes using the latest saved version", async () => {
	drawing.state.evidence = Array.from({ length: 12 }, (_, i) => ({
		...photo,
		id: `photo-${i}`,
	}));
	let stored = "old";
	let writing = false;
	jest.mocked(saveVisualState).mockImplementation(async (row, state) => {
		expect(writing).toBe(false);
		expect(row.description).toBe(stored);
		writing = true;
		const description = JSON.stringify(state);
		await new Promise((resolve) => setTimeout(resolve, 0));
		stored = description;
		writing = false;
		return { ...row, description };
	});
	await analyzeVisualBatch("user", "site", "drawing");
	expect(JSON.parse(stored).processed).toBe(12);
	expect(saveVisualState).toHaveBeenCalledTimes(15);
});

it("resumes legacy cursor-based progress without reanalyzing saved images", async () => {
	drawing.state.evidence.push({ ...photo, id: "remaining" });
	drawing.state.processed = 1;
	drawing.state.status = "paused";
	await analyzeVisualBatch("user", "site", "drawing");
	expect(mockParse).toHaveBeenCalledTimes(1);
	expect(mockParse.mock.calls[0][0].input[0].content[2].text).toContain(
		'"evidenceId":"remaining"',
	);
	expect(drawing.state.processed).toBe(2);
});

it("does not blame the PDF for rate limits", async () => {
	mockParse.mockRejectedValue({
		status: 429,
		message: "sensitive provider details",
	});
	await analyzeVisualBatch("user", "site", "drawing");
	expect(drawing.state.attempts[0].error).toContain("pieprasījumu limits");
	expect(JSON.stringify(drawing.state)).not.toContain("sensitive provider");
	expect(drawing.state.imageProgress?.[0].error).not.toContain("PDF");
});

it("reports PDF preparation failure without sending any image to AI", async () => {
	jest.mocked(loadVisualPdf).mockRejectedValue(new Error("Invalid PDF"));
	await analyzeVisualBatch("user", "site", "drawing");
	expect(mockParse).not.toHaveBeenCalled();
	expect(drawing.state).toMatchObject({
		status: "failed",
		processed: 0,
		lockedAt: null,
		error: expect.stringContaining("PDF"),
	});
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
