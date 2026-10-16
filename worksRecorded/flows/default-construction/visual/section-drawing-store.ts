import { readFile } from "node:fs/promises";
import path from "node:path";
import { sectionDrawingForProject } from "./section-catalog";

export async function readSectionDrawing(
	projectName: string | undefined,
	section: string,
) {
	const drawing = sectionDrawingForProject(projectName, section);
	if (!drawing) return null;
	const bytes = await readFile(
		path.join(
			process.cwd(),
			"assets",
			"visual-sections",
			"ar-701",
			drawing.file,
		),
	);
	return { ...drawing, bytes };
}
