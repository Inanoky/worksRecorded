import { previewSource } from "../visual/preview-revision";
import { readForma2DrawingQuantities } from "./forma2-drawing-quantities";

const rectangle = (left: number, right: number) => [
	{ x: left, y: 0 },
	{ x: right, y: 0 },
	{ x: right, y: 1 },
	{ x: left, y: 1 },
];
function documents(scales = [100], override?: number) {
	const drawing = {
		id: "drawing",
		documentType: "limeni-visual-v1",
		documentName: "Floor",
		url: "https://example.com/floor.pdf",
		createdAt: "2026-10-28",
		description: JSON.stringify({
			version: 1,
			location: "1. stāvs",
			status: "complete",
			pageCount: 1,
			processed: 1,
			evidence: [
				{
					id: "e",
					recordId: "record",
					photoUrl: "",
					manual: true,
					work: "Work",
					location: "1. stāvs",
					description: "",
					date: null,
					amount: 999,
					unit: "m2",
				},
			],
			marks: [rectangle(0, 0.75), rectangle(0.25, 1)].map((polygon, i) => ({
				id: String(i),
				evidenceId: "e",
				layer: "Work",
				page: 1,
				polygon,
				confidence: 1,
				anchors: ["one", "two"],
				explanation: "",
			})),
			unlocated: [],
			error: null,
			lockedAt: null,
			attempts: [],
			...(override ? { pageScales: { 1: override } } : {}),
		}),
	};
	const preview = {
		id: "preview",
		documentType: "limeni-visual-preview-v1",
		documentName: "drawing",
		url: "",
		createdAt: "2026-10-28",
		description: JSON.stringify({
			version: 1,
			source: previewSource(drawing.url),
			pages: [
				{
					page: 1,
					width: 720,
					height: 720,
					scales,
					url: "https://example.com/page.png",
				},
			],
		}),
	};
	return [drawing, preview];
}

it("measures the union, rather than adding overlapping polygons or using the reported amount", () => {
	expect(
		readForma2DrawingQuantities(documents()).get("record")?.quantity,
	).toBeCloseTo(645.16, 5);
});
it("does not invent a quantity when the label is ambiguous or the preview is missing", () => {
	expect(
		readForma2DrawingQuantities(documents([50, 100])).get("record")?.quantity,
	).toBeNull();
	expect(
		readForma2DrawingQuantities(documents().slice(0, 1)).get("record")
			?.quantity,
	).toBeNull();
});
it("honours a user scale override and ignores previews from an earlier PDF", () => {
	expect(
		readForma2DrawingQuantities(documents([50, 100], 50)).get("record")
			?.quantity,
	).toBeCloseTo(161.29, 5);
	const docs = documents();
	docs[0].url = "https://example.com/replacement.pdf";
	expect(readForma2DrawingQuantities(docs).get("record")?.quantity).toBeNull();
});
it("uses only the newest drawing for a floor", () => {
	const docs = documents();
	const old = { ...docs[0], id: "old", createdAt: "2026-10-27" };
	expect(
		readForma2DrawingQuantities([...docs, old]).get("record")?.drawingIds,
	).toEqual(["drawing"]);
});
