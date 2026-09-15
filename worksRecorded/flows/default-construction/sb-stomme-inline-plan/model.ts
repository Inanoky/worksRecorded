import { z } from "zod";

export const SB_STOMME_ORGANIZATION_ID = "73bfa5f9-9e49-460e-876e-8d9eb58ba2cb";
export const SB_PLAN_FIELDS = {
	plannedWork: "Works_Custom_1",
	plannedAmount: "Comments_Custom_2",
	weather: "Works_Custom_2",
} as const;
export const SB_PLAN_LABELS = {
	plannedWork: "Ieplānoti darbi",
	actualWork: "Faktiskie darbi",
	plannedAmount: "Daudzums (plāns)",
	actualAmount: "Daudzums (fakts)",
	weather: "Weather",
};
export type SbPlanField = keyof typeof SB_PLAN_FIELDS;
export type SbPlanValues = Record<SbPlanField, string | null>;
const planValuesSchema = z
	.object({
		plannedWork: z.string().max(4000).nullable(),
		plannedAmount: z.string().max(4000).nullable(),
		weather: z.string().max(4000).nullable(),
	})
	.strict();
export const sbPlanEditSchema = z
	.object({
		recordId: z.string().min(1).max(100),
		values: planValuesSchema,
		expected: planValuesSchema,
	})
	.strict();
export function normalizeSbPlanValue(field: SbPlanField, value: string) {
	const text = value.trim();
	if (!text) return null;
	if (field === "plannedAmount") {
		if (!/^\d+(?:[.,]\d+)?$/.test(text))
			throw new Error("Norādiet derīgu, nenegatīvu daudzumu.");
		const amount = Number(text.replace(",", "."));
		if (!Number.isFinite(amount) || amount > 1e9)
			throw new Error("Daudzums ir pārāk liels.");
		return String(amount);
	}
	if (text.length > 200) throw new Error("Teksts ir pārāk garš.");
	return text;
}
export function readSbPlan(record: {
	Works_Custom_1?: string | null;
	Works_Custom_2?: string | null;
	Comments_Custom_2?: string | null;
}): SbPlanValues {
	return {
		plannedWork: record.Works_Custom_1 ?? null,
		plannedAmount: record.Comments_Custom_2 ?? null,
		weather: record.Works_Custom_2 ?? null,
	};
}

export function sbPlannedQuantity(value: string | null | undefined) {
	try {
		const normalized = normalizeSbPlanValue("plannedAmount", value ?? "");
		return normalized == null ? null : Number(normalized);
	} catch {
		return null;
	}
}
