import { VISUAL_DOCUMENT_TYPE, visualStateSchema } from "../visual/model";
import {
	PREVIEW_DOCUMENT_TYPE,
	readPreparedPreview,
} from "../visual/prepared-preview-model";
import { previewSource } from "../visual/preview-revision";
import { mergeZoneGeometry } from "../visual/zone-geometry";
import { measuredZoneGeometry } from "../visual/zone-measurement";

type DrawingDocument = {
	id: string;
	documentType: string;
	documentName: string;
	description: string;
	url: string;
	createdAt: Date | string;
};

export type Forma2DrawingQuantity = {
	quantity: number | null;
	drawingIds: string[];
};

export function usesForma2DrawingQuantities(config: Record<string, any>) {
	return config.otherSettings?.forma2Accuracy?.quantitySource === "drawing";
}

export function readForma2DrawingQuantities(documents: DrawingDocument[]) {
	const result = new Map<string, Forma2DrawingQuantity>();
	const newest = [...documents].sort(
		(a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
	);
	const locations = new Set<string>();
	for (const drawing of newest) {
		if (drawing.documentType !== VISUAL_DOCUMENT_TYPE) continue;
		let parsed: unknown;
		try {
			parsed = JSON.parse(drawing.description);
		} catch {
			continue;
		}
		const validated = visualStateSchema.safeParse(parsed);
		if (!validated.success) continue;
		const state = validated.data;
		const location = state.location
			.normalize("NFKC")
			.trim()
			.toLocaleLowerCase("lv");
		if (locations.has(location)) continue;
		locations.add(location);
		const preview = newest.flatMap((doc) => {
			if (
				doc.documentType !== PREVIEW_DOCUMENT_TYPE ||
				doc.documentName !== drawing.id
			)
				return [];
			const value = readPreparedPreview(doc.description);
			return value?.source === previewSource(drawing.url) ? [value] : [];
		})[0];
		const recordIds = new Map(
			state.evidence.map((source) => [source.id, source.recordId]),
		);
		for (const recordId of new Set(recordIds.values())) {
			const marks = state.marks.filter(
				(mark) => recordIds.get(mark.evidenceId) === recordId,
			);
			let quantity: number | null = marks.length ? 0 : null;
			for (const page of new Set(marks.map((mark) => mark.page))) {
				const measurement = preview?.pages.find((item) => item.page === page);
				try {
					const geometry = mergeZoneGeometry(
						marks
							.filter((mark) => mark.page === page)
							.map((mark) => mark.polygon),
					);
					const area = measuredZoneGeometry(
						geometry,
						0,
						measurement,
						state.pageScales?.[page],
					).zoneArea;
					if (area === null) {
						quantity = null;
						break;
					}
					quantity = (quantity ?? 0) + area;
				} catch {
					quantity = null;
					break;
				}
			}
			const previous = result.get(recordId);
			result.set(recordId, {
				quantity:
					quantity === null || previous?.quantity === null
						? null
						: Number(((previous?.quantity ?? 0) + quantity).toFixed(6)),
				drawingIds: [...(previous?.drawingIds ?? []), drawing.id],
			});
		}
	}
	return result;
}
