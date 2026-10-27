import {
	readSectionMappingSource,
	sectionMappingAnalysisPhotos,
} from "./section-mapping-source";

it("keeps originals attached while restricting future analysis to the measured child zone", () => {
	const photos = [
		"https://files.example/child.png",
		"https://files.example/original.jpg",
	];
	const metadata = {
		limeniSectionMapping: {
			version: 1,
			recordRef: "R068",
			section: "PA1.1",
			measuredM2: 113.27,
			markupUrl: photos[0],
		},
	};
	expect(sectionMappingAnalysisPhotos(photos, metadata)).toEqual([photos[0]]);
	expect(photos).toHaveLength(2);
	expect(sectionMappingAnalysisPhotos(photos, {})).toBe(photos);
	expect(
		sectionMappingAnalysisPhotos(photos, {
			limeniSectionMapping: {
				...metadata.limeniSectionMapping,
				markupUrl: "https://files.example/missing.png",
			},
		}),
	).toBe(photos);
});

it("exposes measurement sources without original payroll or geometry metadata", () => {
	const result = readSectionMappingSource({
		limeniSectionMapping: {
			version: 1,
			recordRef: "R068",
			section: "PA1.1",
			originalWork: "Screed",
			originalQuantity: 117,
			measuredM2: 113.27,
			measurementConfidence: "boundary-review",
			originalRecord: { privatePayroll: true },
			sources: [
				{ label: "Original", url: "https://files.example/original.jpg" },
				{ label: "Unsafe", url: "javascript:alert(1)" },
				{ label: "Local", url: "file:///private" },
			],
		},
	});
	expect(result).toEqual({
		recordRef: "R068",
		section: "PA1.1",
		originalWork: "Screed",
		originalQuantity: 117,
		measuredM2: 113.27,
		boundaryReview: true,
		sources: [{ label: "Original", url: "https://files.example/original.jpg" }],
	});
});

it("ignores malformed measurement metadata without affecting normal journal records", () => {
	for (const metadata of [
		undefined,
		{},
		{
			limeniSectionMapping: {
				version: 1,
				recordRef: "R001",
				section: "PA1.9",
				measuredM2: 1,
			},
		},
		{
			limeniSectionMapping: {
				version: 1,
				recordRef: "R001",
				section: "PA1.1",
				measuredM2: NaN,
			},
		},
	])
		expect(readSectionMappingSource(metadata)).toBeUndefined();
});

it("keeps WhatsApp sources and previous measurements visible after wall alignment", () => {
	const metadata = {
		limeniSectionMapping: {
			version: 1,
			recordRef: "R018",
			section: "PA1.6",
			measuredM2: 142.71,
			markupUrl: "https://files.example/aligned.png",
			wallAlignment: { version: 1, previousM2: 87.84, privateGeometry: true },
			sources: [
				{
					label: "Sienām piesaistītā zona",
					url: "https://files.example/aligned.png",
				},
				{
					label: "Oriģinālais WhatsApp marķējums",
					url: "https://files.example/whatsapp.jpg",
				},
			],
		},
	};
	const result = readSectionMappingSource(metadata);
	expect(result?.wallAlignment).toEqual({
		previousM2: 87.84,
		measuredM2: 142.71,
	});
	expect(result?.sources).toHaveLength(2);
	expect(result?.sources[1].url).toBe("https://files.example/whatsapp.jpg");
	expect(
		sectionMappingAnalysisPhotos(
			[
				"https://files.example/aligned.png",
				"https://files.example/whatsapp.jpg",
			],
			metadata,
		),
	).toEqual(["https://files.example/aligned.png"]);
});
