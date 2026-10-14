import { validateZtcDrawingProjectCode } from "./ztc-drawing-project-code";

describe("ZTC title-block project codes", () => {
	const drawing = {
		projectName: "SP",
		hasReadableProjectName: true,
		qualityOk: true,
		issue: null,
		elementName: "1S-i01",
		totalAreaM2: 11.07,
	};
	it.each([
		"SP",
		"sp",
		" AB ",
		"ĀB",
		"H13",
		"h13",
		" H13 ",
		"S1",
		"AM2",
		"Ā12",
	])(
		"accepts a readable project code %s without changing panel data",
		(projectName) => {
			const input = { ...drawing, projectName };
			expect(validateZtcDrawingProjectCode(input)).toEqual(input);
		},
	);
	it.each([
		null,
		"",
		"S",
		"SPX",
		"13",
		"1S-i01",
		"B1-2R1-1",
		"H 13",
		"H13?",
		"H12345",
		"HOUSE13",
		"Zemgales Prospekts 11 (ZP)",
	])("rejects missing or non-code project values %s", (projectName) => {
		expect(validateZtcDrawingProjectCode({ ...drawing, projectName })).toEqual({
			...drawing,
			projectName: null,
			hasReadableProjectName: false,
			qualityOk: false,
			issue: expect.stringContaining("projekta kodu"),
		});
	});
	it("does not override an existing quality rejection", () => {
		const input = {
			...drawing,
			projectName: "H13",
			qualityOk: false,
			issue: "Blurry work list",
		};
		expect(validateZtcDrawingProjectCode(input)).toEqual(input);
	});
	it("does not make an unreadable H13 header readable", () => {
		const input = {
			...drawing,
			projectName: "H13",
			hasReadableProjectName: false,
			qualityOk: false,
			issue: "Unclear header",
		};
		expect(validateZtcDrawingProjectCode(input)).toEqual(input);
	});
});
