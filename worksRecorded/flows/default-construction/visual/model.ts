import { z } from "zod";

export const VISUAL_DOCUMENT_TYPE = "limeni-visual-v1";
export const VISUAL_BATCH_SIZE = 6;
export const VISUAL_MAX_PHOTOS = 200;
export const VISUAL_MAX_BYTES = 16 * 1024 * 1024;
export const VISUAL_MAX_PAGES = 10;
export const VISUAL_LEASE_MS = 210_000;

export const visualLayers = {
	sand: { label: "Smilts", color: "#16a34a" },
	xps: { label: "XPS", color: "#eab308" },
	estrich: { label: "Estrich / betons", color: "#dc2626" },
	film: { label: "Plēve / hidroizolācija", color: "#2563eb" },
	thermowhite: { label: "ThermoWhite", color: "#ea580c" },
	other: { label: "Citi darbi", color: "#9333ea" },
} as const;
export type VisualLayer = keyof typeof visualLayers;

export function workLayer(work: string): VisualLayer {
	const name = work.normalize("NFKC").toLowerCase();
	if (/xps/.test(name)) return "xps";
	if (/thermo|putupolistirola gran/.test(name)) return "thermowhite";
	if (/smilt|sand/.test(name)) return "sand";
	if (/estrich|beton|klona/.test(name)) return "estrich";
	if (/plēv|plev|hidroizol/.test(name)) return "film";
	return "other";
}

const pointSchema = z.object({
	x: z.number().min(0).max(1),
	y: z.number().min(0).max(1),
});
export const visualEvidenceSchema = z.object({
	id: z.string(),
	recordId: z.string(),
	photoUrl: z.string().url(),
	work: z.string(),
	location: z.string(),
	description: z.string(),
	date: z.string().nullable(),
	amount: z.number().nullable(),
	unit: z.string(),
});
export type VisualEvidence = z.infer<typeof visualEvidenceSchema>;

export const visualMatchSchema = z.object({
	evidenceId: z.string(),
	page: z.number().int().positive(),
	polygon: z.array(pointSchema).min(3).max(40),
	confidence: z.number().min(0).max(1),
	anchors: z.array(z.string().min(1).max(400)).min(2).max(6),
	explanation: z.string().max(1500),
});
export const visualAnalysisSchema = z.object({
	marks: z.array(visualMatchSchema).max(80),
	unlocated: z
		.array(z.object({ evidenceId: z.string(), reason: z.string().max(1000) }))
		.max(200),
});
export type VisualMark = z.infer<typeof visualMatchSchema> & {
	id: string;
	layer: VisualLayer;
	editedAt?: string;
	editedBy?: string;
};

export const visualStateSchema = z.object({
	version: z.literal(1),
	location: z.string().min(1).max(200),
	status: z.enum([
		"uploaded",
		"running",
		"paused",
		"complete",
		"unlocated",
		"failed",
	]),
	pageCount: z.number().int().positive().nullable(),
	processed: z.number().int().nonnegative(),
	evidence: z.array(visualEvidenceSchema).max(VISUAL_MAX_PHOTOS),
	marks: z.array(
		visualMatchSchema.extend({
			id: z.string(),
			layer: z.enum(["sand", "xps", "estrich", "film", "thermowhite", "other"]),
			editedAt: z.string().optional(),
			editedBy: z.string().optional(),
		}),
	),
	unlocated: visualAnalysisSchema.shape.unlocated,
	error: z.string().nullable(),
	lockedAt: z.number().nullable(),
	attempts: z.array(
		z.object({
			id: z.string(),
			startedAt: z.string(),
			userId: z.string(),
			rawOutput: z.string().nullable(),
			endedAt: z.string().nullable(),
			model: z.string(),
			status: z.enum(["running", "complete", "failed"]),
			inputTokens: z.number().nullable(),
			outputTokens: z.number().nullable(),
			responseId: z.string().nullable(),
		}),
	),
});
export type VisualState = z.infer<typeof visualStateSchema>;
export type VisualDrawing = {
	id: string;
	name: string;
	createdAt: string;
	state: VisualState;
};

export function normalizeVisualLocation(location: string) {
	return location
		.normalize("NFKC")
		.trim()
		.replace(/\s+/g, " ")
		.toLocaleLowerCase("lv");
}

export function polygonArea(points: { x: number; y: number }[]) {
	return (
		Math.abs(
			points.reduce((area, point, i) => {
				const next = points[(i + 1) % points.length];
				return area + point.x * next.y - next.x * point.y;
			}, 0),
		) / 2
	);
}

export function validateVisualMatches(
	raw: unknown,
	evidence: VisualEvidence[],
	pageCount: number,
) {
	const parsed = visualAnalysisSchema.parse(raw);
	const evidenceById = new Map(evidence.map((item) => [item.id, item]));
	const marks: VisualMark[] = [];
	for (const mark of parsed.marks) {
		const source = evidenceById.get(mark.evidenceId);
		if (
			!source ||
			!source.work.trim() ||
			mark.page > pageCount ||
			new Set(mark.anchors.map(normalizeVisualLocation)).size < 2 ||
			polygonArea(mark.polygon) < 0.00001 ||
			!isSimplePolygon(mark.polygon)
		)
			continue;
		marks.push({
			...mark,
			id: `${mark.evidenceId}:${marks.length}`,
			layer: workLayer(source.work),
		});
	}
	const located = new Set(marks.map((mark) => mark.evidenceId));
	const unlocated = evidence
		.filter((item) => !located.has(item.id))
		.map((item) => ({
			evidenceId: item.id,
			reason:
				parsed.unlocated.find((issue) => issue.evidenceId === item.id)
					?.reason ||
				"Nepietiek pierādījumu, lai droši noteiktu darbu vietu rasējumā.",
		}));
	return { marks, unlocated };
}

export function isSimplePolygon(points: { x: number; y: number }[]) {
	const orientation = (
		a: (typeof points)[number],
		b: (typeof points)[number],
		c: (typeof points)[number],
	) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
	const between = (
		a: (typeof points)[number],
		b: (typeof points)[number],
		c: (typeof points)[number],
	) =>
		c.x >= Math.min(a.x, b.x) &&
		c.x <= Math.max(a.x, b.x) &&
		c.y >= Math.min(a.y, b.y) &&
		c.y <= Math.max(a.y, b.y);
	for (let i = 0; i < points.length; i++) {
		const a = points[i];
		const b = points[(i + 1) % points.length];
		for (let j = i + 1; j < points.length; j++) {
			if (j === i + 1 || (i === 0 && j === points.length - 1)) continue;
			const c = points[j];
			const d = points[(j + 1) % points.length];
			const ac = orientation(a, b, c),
				ad = orientation(a, b, d),
				ca = orientation(c, d, a),
				cb = orientation(c, d, b);
			if (
				(ac * ad < 0 && ca * cb < 0) ||
				(ac === 0 && between(a, b, c)) ||
				(ad === 0 && between(a, b, d)) ||
				(ca === 0 && between(c, d, a)) ||
				(cb === 0 && between(c, d, b))
			)
				return false;
		}
	}
	return true;
}
