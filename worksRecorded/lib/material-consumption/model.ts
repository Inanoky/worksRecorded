import { z } from "zod";

export const MATERIAL_CONSUMPTION_DOCUMENT_TYPE =
	"material-consumption-review-v1";
export const MATERIAL_LABELS = {
	thermowhite_glue: "ThermoWhite līme",
	cement: "Cements",
	unknown: "Materiāls nav precizēts",
} as const;

export const materialObservationSchema = z.object({
	id: z.string().min(1),
	sourceKey: z.string().min(1),
	siteId: z.string().min(1),
	date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
	material: z.enum(["thermowhite_glue", "cement", "unknown"]),
	kind: z.enum(["consumed", "delivered", "balance", "returned"]),
	bags: z.number().finite().min(0).max(1_000_000).nullable(),
	status: z.enum(["reported", "needs_review"]),
	reason: z.string().nullable(),
	quote: z.string(),
	originalText: z.string(),
	recordIds: z.array(z.string()),
	sourceMessageIds: z.array(z.string()),
	reporter: z.string().nullable(),
	location: z.string().nullable(),
	photos: z.array(z.string()),
	basis: z.enum(["source", "metadata", "reviewed"]),
});

export type MaterialObservation = z.infer<typeof materialObservationSchema>;
export type Material = MaterialObservation["material"];
export type ConsumptionRecord = {
	id: string;
	siteId: string | null;
	Date?: string | Date | null;
	Works?: string | null;
	Comments?: string | null;
	originalUserComment?: string | null;
	Location?: string | null;
	Photos?: string[];
	archivedAt?: string | Date | null;
	evalMetadata?: unknown;
};
export type ConsumptionProject = {
	id: string;
	name: string;
	historical?: boolean;
};

export function objectValue(value: unknown): Record<string, unknown> {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

export function normalizeMaterialText(value: string) {
	return value
		.normalize("NFD")
		.replace(/[\u0300-\u036f\u200e\u200f\ufeff]/g, "")
		.toLowerCase();
}

export function materialSourceHash(value: string) {
	let a = 2166136261;
	let b = 5381;
	for (let i = 0; i < value.length; i++) {
		a = Math.imul(a ^ value.charCodeAt(i), 16777619);
		b = Math.imul(b, 33) ^ value.charCodeAt(i);
	}
	return `${(a >>> 0).toString(16)}${(b >>> 0).toString(16)}`;
}

export function materialSourceContent(value: string) {
	return normalizeMaterialText(value)
		.replace(/^.*?:\s*\[[^\]]+\]\s*[^:\n]*:\s*/gm, "")
		.replace(
			/<attached:[^>]*>|<this message was edited>|\[(?:attels|rasejums|saistitais rasejums)[^\]]*\]/g,
			"",
		)
		.replace(/[^a-z0-9]/g, "");
}

export function materialDate(value: string | Date | null | undefined) {
	if (!value) return null;
	const date = new Date(value);
	if (!Number.isFinite(date.getTime())) return null;
	return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Riga" }).format(
		date,
	);
}

export function summarizeMaterialConsumption(
	projects: ConsumptionProject[],
	entries: MaterialObservation[],
) {
	return projects.map((project) => {
		const rows = entries.filter((entry) => entry.siteId === project.id);
		const sum = (material: Material, kind: MaterialObservation["kind"]) =>
			Math.round(
				rows.reduce(
					(total, entry) =>
						total +
						(entry.material === material &&
						entry.kind === kind &&
						entry.status === "reported"
							? (entry.bags ?? 0)
							: 0),
					0,
				) * 1000,
			) / 1000;
		return {
			...project,
			thermowhiteBags: sum("thermowhite_glue", "consumed"),
			cementBags: sum("cement", "consumed"),
			thermowhiteDelivered: sum("thermowhite_glue", "delivered"),
			cementDelivered: sum("cement", "delivered"),
			reviewCount: rows.filter((entry) => entry.status === "needs_review")
				.length,
			reportCount: new Set(rows.map((entry) => entry.sourceKey)).size,
			lastDate:
				rows
					.map((entry) => entry.date)
					.sort()
					.at(-1) ?? null,
		};
	});
}
