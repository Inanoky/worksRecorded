import { z } from "zod";

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
export function readVisualSections(config: Record<string, unknown>) {
	const other = config.otherSettings;
	const raw =
		other && typeof other === "object" && !Array.isArray(other)
			? (other as Record<string, unknown>)[VISUAL_SECTIONS_KEY]
			: undefined;
	return visualSectionsSchema.parse(raw ?? []);
}
