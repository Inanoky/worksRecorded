import { z } from "zod";

export const fimaStatuses = {
	do_not_create: "Netaisīt",
	needs_changes: "Labot",
	ready_for_approval: "Sūtīt uz apstiprināšanu",
} as const;
export const fimaStatusSchema = z.enum([
	"do_not_create",
	"needs_changes",
	"ready_for_approval",
]);
export const fimaMaterialSchema = z.object({
	id: z.string().min(1).max(128),
	label: z.string().min(1).max(2000),
	unit: z.string().max(100),
	quantity: z.number().finite().positive().max(1e9),
});
export type FimaMaterial = z.infer<typeof fimaMaterialSchema>;
export type FimaEvent = {
	id: string;
	kind: "comment" | "status" | "materials";
	actorId: string;
	actorName: string;
	at: string;
	text: string;
};
export type FimaCollaboration = {
	version: number;
	status: keyof typeof fimaStatuses | null;
	materials: FimaMaterial[];
	history: FimaEvent[];
	bisMaterials?: {
		fetchedAt: string;
		entries: { bisId: string; caseId: string; materials: FimaMaterial[] }[];
	};
};
export const fimaVirtualFields = [
	"FimaComments",
	"FimaBisCase",
	"FimaMaterials",
	"FimaReviewStatus",
];
export function readFimaCollaboration(metadata: unknown): FimaCollaboration {
	const value = (metadata as { fimaCollaboration?: FimaCollaboration } | null)
		?.fimaCollaboration;
	return { version: 0, status: null, materials: [], history: [], ...value };
}
export function isFimaDiary(config: unknown) {
	return (
		(config as { otherSettings?: { fimaCollaboration?: unknown } } | null)
			?.otherSettings?.fimaCollaboration === true
	);
}
export function withFimaDiaryColumns(
	config: Record<
		string,
		Record<string, unknown> & { customSettings?: Record<string, unknown> }
	>,
	caseNumber: string | null,
	caseId: string | null = null,
) {
	if (!isFimaDiary(config)) return config;
	const result = { ...config };
	result.otherSettings = {
		...result.otherSettings,
		fitDiaryTableToWidth: true,
		hideCreatedAtInSiteList: true,
		bisCaseNumber: caseNumber,
		bisCaseId: caseId,
		preferConfigDisplayNames: true,
	};
	for (const field of ["WorkersInvolved", "TimeInvolved"]) {
		if (result[field])
			result[field] = {
				...result[field],
				customSettings: {
					...result[field].customSettings,
					displayinSiteList: "no",
				},
			};
	}
	const specs: [string, string, number, number][] = [
		["FimaReviewStatus", "Rīcība", 1000, 135],
		["FimaBisCase", "BIS lietas Nr.", 1.5, 100],
		["FimaMaterials", "Materiāli", 7.5, 155],
		["FimaComments", "Komentāri", 9.5, 145],
	];
	for (const [key, label, order, width] of specs)
		result[key] = {
			Type: "noRender",
			DisplayName: label,
			customSettings: {
				displayinSiteList: "yes",
				displayinSiteListOrder: order,
				displayinSiteListWidth: width,
				cellWidth: width,
				forceDisplayName: true,
			},
		};
	return result;
}
export function appendFimaEvent(
	state: FimaCollaboration,
	event: FimaEvent,
	patch: Partial<Pick<FimaCollaboration, "status" | "materials">>,
	expectedVersion?: number,
) {
	if (state.history.some((item) => item.id === event.id)) return state;
	if (expectedVersion !== undefined && state.version !== expectedVersion)
		throw new Error(
			"Ieraksts ir mainīts. Atjaunojiet datus un mēģiniet vēlreiz.",
		);
	return {
		...state,
		...patch,
		version: state.version + 1,
		history: [...state.history, event],
	};
}
export function parseBisRecordMaterials(
	rows: unknown[],
	reference: unknown,
): FimaMaterial[] {
	const data = z
		.array(
			z.object({
				id: z.union([z.string(), z.number()]),
				attributes: z.object({
					construction_material_id: z.union([z.string(), z.number()]),
					quantity: z.union([z.string(), z.number()]),
				}),
			}),
		)
		.parse(rows);
	const refs = z
		.object({
			used_construction_materials: z
				.array(
					z.object({ id: z.union([z.string(), z.number()]), name: z.string() }),
				)
				.optional(),
		})
		.parse(reference);
	const names = new Map(
		(refs.used_construction_materials ?? []).map((r) => [String(r.id), r.name]),
	);
	return data.map((row) => {
		const id = String(row.attributes.construction_material_id);
		const label = names.get(String(row.id));
		const quantity = Number(row.attributes.quantity);
		if (!label || !Number.isFinite(quantity))
			throw new Error("BIS materiālu dati ir nepilnīgi.");
		return { id, label, quantity, unit: "" };
	});
}
