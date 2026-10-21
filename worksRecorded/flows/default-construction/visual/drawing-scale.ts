import type { PDFDocumentProxy } from "pdfjs-dist";
import { isSimplePolygon, polygonArea } from "./model";
import type { VisualPlanArea } from "./planning-model";

export type DrawingPageMeasurement = {
	width: number;
	height: number;
	scales: number[];
};

export function drawingScaleLabels(text: string) {
	const result = new Set<number>();
	for (const match of text
		.normalize("NFKC")
		.matchAll(/(?<![\d:])1\s*[:∶]\s*(\d+(?:[.,]\d+)?)(?![\d.,])/gu)) {
		const scale = Number(match[1].replace(",", "."));
		if (Number.isFinite(scale) && scale >= 1 && scale <= 10_000)
			result.add(scale);
	}
	return [...result].sort((left, right) => left - right);
}

export function parseDrawingScale(value: string) {
	const normalized = value.trim().replace(",", ".");
	const match = /^(?:1\s*[:∶]\s*)?(\d+(?:\.\d+)?)$/.exec(normalized);
	const scale = match ? Number(match[1]) : Number.NaN;
	return Number.isFinite(scale) && scale >= 1 && scale <= 10_000 ? scale : null;
}

export async function readDrawingPageMeasurement(
	pdf: PDFDocumentProxy,
	page: number,
): Promise<DrawingPageMeasurement> {
	const documentPage = await pdf.getPage(page);
	const viewport = documentPage.getViewport({ scale: 1 });
	let scales: number[] = [];
	try {
		const content = await documentPage.getTextContent();
		scales = drawingScaleLabels(
			content.items.map((item) => ("str" in item ? item.str : "")).join(" "),
		);
	} catch {}
	return { width: viewport.width, height: viewport.height, scales };
}

export function resolvedDrawingScale(
	measurement: DrawingPageMeasurement | undefined,
	override?: number,
) {
	return (
		override ??
		(measurement?.scales.length === 1 ? measurement.scales[0] : null)
	);
}

type Point = { x: number; y: number };

export function polygonUnionArea(polygons: Point[][]) {
	if (!polygons.length) return 0;
	if (polygons.length === 1) return polygonArea(polygons[0]);
	const edges = polygons.flatMap((polygon, group) =>
		polygon.map((a, index) => ({
			a,
			b: polygon[(index + 1) % polygon.length],
			group,
		})),
	);
	const cuts = new Set(
		polygons.flatMap((polygon) => polygon.map((point) => point.x)),
	);
	for (let i = 0; i < edges.length; i++) {
		const first = edges[i];
		for (let j = i + 1; j < edges.length; j++) {
			const second = edges[j];
			if (first.group === second.group) continue;
			const dx = first.b.x - first.a.x,
				dy = first.b.y - first.a.y;
			const ex = second.b.x - second.a.x,
				ey = second.b.y - second.a.y;
			const determinant = dx * ey - dy * ex;
			if (Math.abs(determinant) < 1e-12) continue;
			const x = second.a.x - first.a.x,
				y = second.a.y - first.a.y;
			const t = (x * ey - y * ex) / determinant;
			const u = (x * dy - y * dx) / determinant;
			if (t > 0 && t < 1 && u > 0 && u < 1) cuts.add(first.a.x + t * dx);
		}
	}
	const xs = [...cuts].sort((a, b) => a - b);
	let area = 0;
	for (let i = 1; i < xs.length; i++) {
		const x = (xs[i - 1] + xs[i]) / 2;
		const intervals: Array<[number, number]> = [];
		for (const polygon of polygons) {
			const ys: number[] = [];
			for (let j = 0; j < polygon.length; j++) {
				const a = polygon[j],
					b = polygon[(j + 1) % polygon.length];
				if ((a.x <= x && b.x > x) || (b.x <= x && a.x > x))
					ys.push(a.y + ((x - a.x) * (b.y - a.y)) / (b.x - a.x));
			}
			ys.sort((a, b) => a - b);
			for (let j = 0; j + 1 < ys.length; j += 2)
				intervals.push([ys[j], ys[j + 1]]);
		}
		intervals.sort((a, b) => a[0] - b[0]);
		let length = 0,
			start = 0,
			end = 0;
		for (const interval of intervals) {
			if (interval[0] > end) {
				length += end - start;
				start = interval[0];
			}
			end = Math.max(end, interval[1]);
		}
		area += (length + end - start) * (xs[i] - xs[i - 1]);
	}
	return area;
}

export function measuredPlanningArea(
	areas: VisualPlanArea[],
	measurements: Record<number, DrawingPageMeasurement>,
	overrides: Record<string, number>,
) {
	let total = 0;
	for (const page of new Set(areas.map((area) => area.page))) {
		const measurement = measurements[page];
		const scale = resolvedDrawingScale(measurement, overrides[page]);
		if (!measurement || !scale) return null;
		const polygons = areas
			.filter((area) => area.page === page)
			.map((area) => {
				const polygon = area.polygon.filter(
					(point, i) =>
						i === 0 ||
						Math.hypot(
							point.x - area.polygon[i - 1].x,
							point.y - area.polygon[i - 1].y,
						) > 1e-9,
				);
				const first = polygon[0],
					last = polygon.at(-1);
				return first &&
					last &&
					Math.hypot(first.x - last.x, first.y - last.y) <= 1e-9
					? polygon.slice(0, -1)
					: polygon;
			});
		if (
			polygons.some(
				(polygon) => polygon.length < 3 || !isSimplePolygon(polygon),
			)
		)
			return null;
		total +=
			polygonUnionArea(polygons) *
			measurement.width *
			measurement.height *
			((scale * 0.0254) / 72) ** 2;
	}
	return total;
}

export function isAreaUnit(unit: string) {
	return /^m(?:2|²|\^2)$/i.test(unit.trim());
}

export function roundedArea(area: number) {
	return Math.round((area + Number.EPSILON) * 100) / 100;
}
