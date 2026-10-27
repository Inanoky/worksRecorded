export type SectionMappingSource = {
	recordRef: string;
	section: string;
	originalWork: string;
	originalQuantity: number | null;
	measuredM2: number;
	boundaryReview: boolean;
	sources: { label: string; url: string }[];
};

function objectValue(value: unknown): Record<string, unknown> | undefined {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: undefined;
}

export function sectionMappingAnalysisPhotos(
	photos: string[],
	metadata: unknown,
): string[] {
	if (!readSectionMappingSource(metadata)) return photos;
	const mapping = objectValue(objectValue(metadata)?.limeniSectionMapping);
	return typeof mapping?.markupUrl === "string" &&
		photos.includes(mapping.markupUrl)
		? [mapping.markupUrl]
		: photos;
}

export function readSectionMappingSource(
	metadata: unknown,
): SectionMappingSource | undefined {
	const raw = objectValue(objectValue(metadata)?.limeniSectionMapping);
	if (
		raw?.version !== 1 ||
		typeof raw.measuredM2 !== "number" ||
		!Number.isFinite(raw.measuredM2) ||
		raw.measuredM2 < 0
	)
		return;
	if (
		typeof raw.recordRef !== "string" ||
		typeof raw.section !== "string" ||
		!/^R\d{3}$/.test(raw.recordRef) ||
		!/^PA1\.[1267]$/.test(raw.section)
	)
		return;
	const sources = Array.isArray(raw.sources)
		? raw.sources
				.flatMap((value: unknown) => {
					const source = objectValue(value);
					if (
						typeof source?.url !== "string" ||
						typeof source?.label !== "string"
					)
						return [];
					try {
						const url = new URL(source.url);
						return url.protocol === "https:" && !url.username && !url.password
							? [{ label: source.label.slice(0, 240), url: url.href }]
							: [];
					} catch {
						return [];
					}
				})
				.slice(0, 30)
		: [];
	return {
		recordRef: raw.recordRef,
		section: raw.section,
		originalWork:
			typeof raw.originalWork === "string"
				? raw.originalWork.slice(0, 500)
				: "",
		originalQuantity:
			typeof raw.originalQuantity === "number" &&
			Number.isFinite(raw.originalQuantity)
				? raw.originalQuantity
				: null,
		measuredM2: raw.measuredM2,
		boundaryReview: raw.measurementConfidence === "boundary-review",
		sources,
	};
}
