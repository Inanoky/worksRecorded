import {
	sectionCatalogForProject,
	sectionDrawingForProject,
} from "./section-catalog";
import { readSectionDrawing } from "./section-drawing-store";
import { readVisualSections, VISUAL_SECTIONS_KEY } from "./sections";

it("offers all 18 reviewed details only for the drawing's project and preserves custom options", () => {
	expect(sectionCatalogForProject("Šmerļa iela 3")).toHaveLength(18);
	expect(
		readVisualSections(
			{ otherSettings: { [VISUAL_SECTIONS_KEY]: ["pa1.6", "Custom"] } },
			"Šmerļa iela 3",
		),
	).toHaveLength(19);
	expect(sectionCatalogForProject("Other project")).toEqual([]);
	expect(sectionDrawingForProject("Other project", "PA1.6")).toBeUndefined();
});

it("serves only the selected crop and never treats a section value as a file path", async () => {
	const drawing = await readSectionDrawing("Šmerļa iela 3", "PA1.6");
	expect(drawing?.code).toBe("PA1.6");
	expect(drawing?.bytes.subarray(0, 8).toString("hex")).toBe(
		"89504e470d0a1a0a",
	);
	expect(await readSectionDrawing("Šmerļa iela 3", "../../.env")).toBeNull();
	expect(await readSectionDrawing("Other project", "PA1.6")).toBeNull();
});

it("offers the 24 Raudas detail variants only for the matching project", () => {
	for (const name of [
		"Raudas iela, Tukums",
		"Raudas iela 16",
		"Raudas iela 16, Tukums",
	]) {
		const sections = sectionCatalogForProject(name);
		expect(sections).toHaveLength(24);
		expect(new Set(sections.map((item) => item.code)).size).toBe(24);
		expect(sections.map((item) => item.code)).toEqual(
			expect.arrayContaining([
				"PT-01*",
				"PT-03-1",
				"PT-03-2",
				"PT-03-3",
				"PT-15",
			]),
		);
		expect(readVisualSections({}, name)).toHaveLength(24);
	}
	expect(sectionDrawingForProject("Šmerļa iela 3", "PT-03-1")).toBeUndefined();
	expect(
		sectionDrawingForProject("Raudas iela, Tukums", "PA1.6"),
	).toBeUndefined();
	expect(sectionCatalogForProject("Raudas iela 160")).toEqual([]);
});

it("loads every Raudas crop and retains its source drawing provenance", async () => {
	for (const section of sectionCatalogForProject("Raudas iela, Tukums")) {
		const drawing = await readSectionDrawing(
			"Raudas iela, Tukums",
			section.code,
		);
		expect(drawing?.bytes.subarray(0, 8).toString("hex")).toBe(
			"89504e470d0a1a0a",
		);
		expect(section).toEqual(
			expect.objectContaining({
				sourceSha256: expect.stringMatching(/^[a-f0-9]{64}$/),
				sourcePage: 1,
				sourceUrl: expect.stringContaining(
					"/9504975c-5121-4c26-b1d9-181477ccc72d/plans/",
				),
			}),
		);
	}
	expect(
		await readSectionDrawing("Raudas iela, Tukums", "../../ar-701/PA1.6.png"),
	).toBeNull();
});
