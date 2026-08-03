import {
	applyZtcProjectNameChange,
	updateZtcMetadataProjectName,
} from "@/flows/ztc-production/lib/ztc-project-edit";

describe("updateZtcMetadataProjectName", () => {
	it.each(["ztc_drawing_context", "ztc_quality_check"])(
		"changes only the project name for %s metadata",
		(type) => {
			const original = {
				type,
				projectName: "OCR project",
				elementName: "1S-111-2",
				checkedWork: "R3/T3 - Latojums 25x50",
				elements: [
					{
						elementName: "1S-111-2",
						works: [{ name: "R3/T3 - Latojums 25x50", amountM2: 12.5 }],
					},
				],
			};

			expect(
				JSON.parse(
					String(
						updateZtcMetadataProjectName(
							JSON.stringify(original),
							"dz. eka. auto nojume (rd)",
						),
					),
				),
			).toEqual({
				...original,
				projectName: "dz. eka. auto nojume (rd)",
			});
		},
	);

	it("leaves unrelated or invalid metadata untouched", () => {
		expect(updateZtcMetadataProjectName('{"type":"other"}', "Project B")).toBe(
			'{"type":"other"}',
		);
		expect(updateZtcMetadataProjectName("not-json", "Project B")).toBe(
			"not-json",
		);
	});

	it("preserves every other journal field when changing the project", () => {
		const row = {
			Location: "OCR project",
			Location_Custom_1: "1S-111-2",
			Works: "Kvalitātes kontrole",
			Amounts: "12.5",
			Location_Custom_2: "1.2",
			__ztcLaborNorm: "0.08",
			Comments: "Panelis pieņemts",
			Photos: ["drawing.jpg", "quality.jpg"],
			Comments_Custom_2: JSON.stringify({
				type: "ztc_quality_check",
				projectName: "OCR project",
				checkedWork: "R3/T3 - Latojums 25x50",
			}),
		};

		const updated = applyZtcProjectNameChange(row, "dz. eka. auto nojume (rd)");

		expect(updated).toEqual({
			...row,
			Location: "dz. eka. auto nojume (rd)",
			Comments_Custom_2: JSON.stringify({
				type: "ztc_quality_check",
				projectName: "dz. eka. auto nojume (rd)",
				checkedWork: "R3/T3 - Latojums 25x50",
			}),
		});
	});
});
