import { readFile } from "node:fs/promises";
import path from "node:path";
import {
	sectionDrawingDirectoryForProject,
	sectionDrawingForProject,
} from "./section-catalog";

export async function readSectionDrawing(
	projectName: string | undefined,
	section: string,
) {
	const drawing = sectionDrawingForProject(projectName, section);
	const directory = sectionDrawingDirectoryForProject(projectName);
	if (!drawing || !directory) return null;
	const bytes = await readFile(
		path.join(
			process.cwd(),
			"assets",
			"visual-sections",
			directory,
			drawing.file,
		),
	);
	return { ...drawing, bytes };
}
