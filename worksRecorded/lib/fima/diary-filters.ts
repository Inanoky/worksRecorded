import { z } from "zod";
import { fimaStatuses, fimaStatusSchema } from "./diary-collaboration";

const presence = z.enum(["present", "missing"]);
export const fimaDiaryFilterSchema = z.object({
	review: fimaStatusSchema.or(z.literal("unassigned")).optional(),
	bis: presence.optional(),
	bisStatus: z
		.enum(["works_recorded", "draft", "pending", "approved"])
		.optional(),
	materials: presence.optional(),
	examples: presence.optional(),
});
export type FimaDiaryFilters = z.infer<typeof fimaDiaryFilterSchema>;
export const fimaDiaryFilterKeys = [
	"review",
	"bis",
	"bisStatus",
	"materials",
	"examples",
] as const;

export function readFimaDiaryFilters(value: unknown): FimaDiaryFilters {
	const normalized =
		value && typeof value === "object" && !Array.isArray(value)
			? Object.fromEntries(
					Object.entries(value).filter(([, item]) => item !== ""),
				)
			: value;
	const result = fimaDiaryFilterSchema.safeParse(normalized);
	return result.success ? result.data : {};
}

export const fimaDiaryFilterOptions = [
	{
		key: "review",
		label: "Rīcība",
		allLabel: "Visas rīcības",
		options: [
			...Object.entries(fimaStatuses).map(([value, label]) => ({
				value,
				label,
			})),
			{ value: "unassigned", label: "Bez rīcības" },
		],
	},
	{
		key: "bis",
		label: "BIS ieraksts",
		allLabel: "Visi BIS ieraksti",
		options: [
			{ value: "present", label: "Ar BIS ierakstu" },
			{ value: "missing", label: "Bez BIS ieraksta" },
		],
	},
	{
		key: "bisStatus",
		label: "BIS statuss",
		allLabel: "Visi statusi",
		options: [
			{ value: "works_recorded", label: "WorksRecorded" },
			{ value: "draft", label: "BIS sagatave" },
			{ value: "pending", label: "BIS gaida apstiprinājumu" },
			{ value: "approved", label: "BIS apstiprināts" },
		],
	},
	{
		key: "materials",
		label: "Materiāli",
		allLabel: "Visi materiāli",
		options: [
			{ value: "present", label: "Ar materiāliem" },
			{ value: "missing", label: "Bez materiāliem" },
		],
	},
	{
		key: "examples",
		label: "Paraugas",
		allLabel: "Visi paraugi",
		options: [
			{ value: "present", label: "Ar BIS paraugu" },
			{ value: "missing", label: "Bez BIS parauga" },
		],
	},
] as const;
