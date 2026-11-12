import { z } from "zod";

const optionalText = (max: number) =>
	z
		.string()
		.trim()
		.max(max)
		.transform((value) => value || null);
const date = z
	.string()
	.regex(/^\d{4}-\d{2}-\d{2}$/)
	.refine((value) => {
		const parsed = new Date(`${value}T00:00:00Z`);
		return (
			Number.isFinite(parsed.getTime()) &&
			parsed.toISOString().slice(0, 10) === value
		);
	}, "Nederīgs datums.");

export const manualMaterialSchema = z
	.object({
		id: z.string().uuid(),
		siteId: z.string().uuid(),
		name: z.string().trim().min(1, "Ievadiet materiāla nosaukumu.").max(120),
		quantity: z.number().finite().min(0).max(1_000_000),
		measurementUnit: z.string().trim().min(1, "Ievadiet mērvienību.").max(20),
		cost: z.number().finite().min(0).max(10_000_000).nullable(),
		materialDate: date,
		invoiceDate: date.nullable(),
		invoiceNr: optionalText(120),
		supplierName: optionalText(200),
	})
	.strict();

export type ManualMaterialInput = z.input<typeof manualMaterialSchema>;
