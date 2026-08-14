import {
	applyZtcElementNameChange,
	applyZtcProjectNameChange,
	updateZtcMetadataElementName,
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

describe("updateZtcMetadataElementName", () => {
	it("renames an unseen element while preserving its drawing data", () => {
		const original = {
			type: "ztc_drawing_context",
			projectName: "dz. eka. auto nojume (rd)",
			elements: [
				{
					elementName: "J-2-1",
					totalAreaM2: 3.82,
					works: [
						{
							name: "R1/T1 - Difūzijas membrāna Solitex",
							amountM2: 3.82,
							complexityCode: "1",
						},
					],
				},
			],
			ztcLaborNormHoursPerUnit: 0.06,
		};

		const updated = JSON.parse(
			String(
				updateZtcMetadataElementName(JSON.stringify(original), "J-2-1", "J-21"),
			),
		);

		expect(updated).toEqual({
			...original,
			elements: [{ ...original.elements[0], elementName: "J-21" }],
		});
	});

	it("preserves row values when applying an element correction", () => {
		const row = {
			Location_Custom_1: "J-2-1",
			Works: "R1/T1 - Difūzijas membrāna Solitex",
			Amounts: "3.82",
			Location_Custom_2: "0.9",
			Units: "m2",
			__ztcLaborNorm: "0.06",
			Comments_Custom_2: JSON.stringify({
				type: "ztc_drawing_context",
				elements: [{ elementName: "J-2-1", totalAreaM2: 3.82 }],
			}),
		};

		const updated = applyZtcElementNameChange(row, "J-21");

		expect(updated).toEqual({
			...row,
			Location_Custom_1: "J-21",
			Comments_Custom_2: JSON.stringify({
				type: "ztc_drawing_context",
				elements: [{ elementName: "J-21", totalAreaM2: 3.82 }],
			}),
		});
	});

	it("adds a server-side correction audit after the client metadata rename", () => {
		const updated = JSON.parse(
			String(
				updateZtcMetadataElementName(
					JSON.stringify({
						type: "ztc_drawing_context",
						elements: [{ elementName: "J-21" }],
					}),
					"J-2-1",
					"J-21",
					{
						correctedAt: "2026-08-14T10:00:00.000Z",
						correctedBy: "user-1",
					},
				),
			),
		);

		expect(updated.ztcElementCorrections).toEqual([
			{
				from: "J-2-1",
				to: "J-21",
				correctedAt: "2026-08-14T10:00:00.000Z",
				correctedBy: "user-1",
			},
		]);
	});
});
