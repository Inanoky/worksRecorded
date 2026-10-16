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
