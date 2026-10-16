import { z } from "zod";
import { sectionCatalogForProject } from "./section-catalog";

export const VISUAL_SECTIONS_KEY = "limeniVisualSections";
export const visualSectionSchema = z.string().trim().min(1).max(120);
export const visualSectionsSchema = z.array(visualSectionSchema).max(100);
export function sectionKey(value: string) {
	return value
		.normalize("NFKC")
		.trim()
		.replace(/\s+/g, " ")
		.toLocaleLowerCase("lv");
}
export function readVisualSections(
	config: Record<string, unknown>,
	projectName?: string,
) {
	const other = config.otherSettings;
	const raw =
		other && typeof other === "object" && !Array.isArray(other)
			? (other as Record<string, unknown>)[VISUAL_SECTIONS_KEY]
			: undefined;
	const items = [
		...sectionCatalogForProject(projectName).map((item) => item.code),
		...visualSectionsSchema.parse(raw ?? []),
	];
	const unique = new Map<string, string>();
	for (const item of items)
		if (!unique.has(sectionKey(item))) unique.set(sectionKey(item), item);
	return [...unique.values()];
}
