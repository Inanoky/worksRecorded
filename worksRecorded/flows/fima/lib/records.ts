import { z } from "zod";

export const materialSchema = z.object({
	id: z.string().max(100),
	name: z.string().max(2000),
	unit: z.string().max(100),
	quantity: z.number().finite().nonnegative(),
	plannedQuantity: z.number().finite().nonnegative().nullable().default(null),
});
export const drawingSchema = z.object({
	id: z.string().regex(/^\d+$/),
	title: z.string().max(1000),
	sheet: z.string().max(100).default(""),
	revision: z.string().max(100).default(""),
});
export const proposalSchema = z.object({
	date: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/)
		.refine(
			(v) =>
				!Number.isNaN(Date.parse(v)) &&
				new Date(v).toISOString().slice(0, 10) === v,
			"Nederīgs datums",
		),
	sourceWork: z.string().max(10000),
	description: z.string().max(10000),
	rawMasts: z.string().max(2000).default(""),
	masts: z.array(z.string().max(80)).max(500).default([]),
	quantity: z.number().finite().nonnegative().nullable(),
	measurement: z.string().max(50),
	unit: z.string().max(100),
	workers: z.number().int().nonnegative().max(10000).nullable(),
	start: z.string().regex(/^$|^(?:[01]\d|2[0-3]):[0-5]\d$/),
	end: z.string().regex(/^$|^(?:[01]\d|2[0-3]):[0-5]\d$/),
	responsibleId: z.string().max(100).default(""),
	responsibleType: z.string().max(100).default(""),
	buildingIds: z.array(z.string().regex(/^\d+$/)).max(100).default([]),
	materials: z.array(materialSchema).max(200).default([]),
	drawings: z.array(drawingSchema).max(100).default([]),
	evidence: z
		.array(
			z.object({
				title: z.string().max(2000),
				url: z
					.string()
					.max(2000)
					.refine(
						(v) => !v || /^https:\/\//.test(v),
						"Nepieciešama HTTPS saite",
					)
					.default(""),
				detail: z.string().max(10000).default(""),
			}),
		)
		.max(100)
		.default([]),
	spans: z
		.array(
			z.object({
				id: z.string().max(100).optional(),
				from: z.string().max(80),
				to: z.string().max(80),
				metres: z.number().positive().finite(),
				drawing: z.string().min(1).max(2000),
			}),
		)
		.max(1000)
		.default([]),
	notes: z.string().max(20000).default(""),
	materialSource: z.string().max(20000).default(""),
	reviewed: z.boolean().default(false),
	authorMode: z.enum(["browser", "api"]).default("browser"),
});
export type Proposal = z.infer<typeof proposalSchema>;
export type Source = {
	file: string;
	sheet: string;
	cell: string;
	raw: string;
	crew?: string;
	workers?: string[];
};
export type FimaRow = {
	id: string;
	localId: string;
	siteId: string;
	version: number;
	stage: string;
	proposal: Proposal;
	sources: Source[];
	bisId: string | null;
	bisCaseId: string | null;
	bisStatus: string | null;
	managed: boolean;
	snapshot: any;
	updatedAt: string;
};
export function emptyProposal(
	date = new Date().toISOString().slice(0, 10),
): Proposal {
	return proposalSchema.parse({
		date,
		sourceWork: "",
		description: "",
		quantity: null,
		measurement: "",
		unit: "",
		workers: null,
		start: "",
		end: "",
	});
}
export function editUrl(id: string, base = "https://bis.gov.lv") {
	if (!/^\d+$/.test(id)) throw new Error("Nederīgs BIS ID");
	return `${base}/bisp/lv/portal/logbooks/performed_works/${id}/edit?entry_ids%5B%5D=${id}`;
}
export function parseMasts(raw: string) {
	return [
		...new Set(
			(raw.toUpperCase().match(/\d{1,2}-\d{1,3}(?:[A-Z]+\d*)?/g) ?? []).map(
				(v) => v.replace(/^(\d+-)0+(\d)/, "$1$2"),
			),
		),
	];
}
export function normalizeWork(value: string) {
	return value
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.replace(/\s+/g, " ")
		.trim();
}
export function spanLength(spans: Proposal["spans"]) {
	if (!spans.length) throw new Error("Nav laidumu");
	const seen = new Set<string>();
	for (let i = 0; i < spans.length; i++) {
		const s = spans[i];
		const key = [s.from, s.to].sort().join("|");
		if (seen.has(key) || (i > 0 && spans[i - 1].to !== s.from))
			throw new Error("Laidumu maršruts pārtrūkst vai atkārtojas");
		if (!(s.metres > 0) || !s.drawing.trim())
			throw new Error("Laidumam vajadzīgs garums un rasējums");
		seen.add(key);
	}
	return Math.round(spans.reduce((a, s) => a + s.metres, 0) * 100) / 100;
}
export function readiness(p: Proposal) {
	const errors: string[] = [];
	if (!p.description.trim()) errors.push("Nav BIS darbu apraksta");
	if (p.quantity === null || p.quantity <= 0)
		errors.push("Nav pozitīva darbu apjoma");
	if (!p.measurement) errors.push("Nav BIS mērvienības");
	if (p.workers === null) errors.push("Nav darbinieku skaita");
	if (!p.start || !p.end) errors.push("Nav maiņas sākuma/beigu laika");
	if (!/^\d+$/.test(p.responsibleId) || !p.responsibleType)
		errors.push("Nav atbildīgās personas");
	if (!p.buildingIds.length) errors.push("Nav būvniecības objekta");
	if (!p.reviewed) errors.push("Priekšlikums nav pārbaudīts");
	if (p.materials.some((m) => !/^\d+$/.test(m.id)))
		errors.push("Materiālam nav BIS kataloga ID");
	if (new Set(p.materials.map((m) => m.id)).size !== p.materials.length)
		errors.push("Atkārtots materiāls");
	if (new Set(p.drawings.map((d) => d.id)).size !== p.drawings.length)
		errors.push("Atkārtots rasējums");
	if (p.spans.length) {
		try {
			if (p.measurement !== "29" || p.quantity !== spanLength(p.spans))
				errors.push("Darbu apjoms neatbilst laidumu summai metros");
		} catch (e) {
			errors.push((e as Error).message);
		}
	}
	return errors;
}
export function canWrite(
	row: Pick<FimaRow, "bisId" | "managed" | "bisStatus">,
) {
	return !row.bisId || (row.managed && row.bisStatus === "draft");
}
export function buildPayload(p: Proposal, roundId: string | null) {
	const errors = readiness(p);
	if (errors.length) throw new Error(errors.join("; "));
	return {
		data: {
			type: "performed_work",
			attributes: {
				event_date: p.date,
				event_time_from: p.start,
				event_time_to: p.end,
				responsible_person_id: Number(p.responsibleId),
				responsible_person_type: p.responsibleType,
				description: p.description,
				...(roundId ? { case_construction_round_id: roundId } : {}),
				project_document_ids: p.drawings.map((d) => Number(d.id)),
			},
			relationships: {
				detail: {
					data: {
						type: "performed_work",
						attributes: {
							quantity: p.quantity,
							measurement: p.measurement,
							employees: p.workers,
						},
					},
				},
				case_buildings: {
					data: p.buildingIds.map((id) => ({ type: "case_building", id })),
				},
				logbook_used_construction_materials: {
					data: p.materials.map((m) => ({
						type: "construction_materials_join",
						attributes: {
							construction_material_id: m.id,
							quantity: m.quantity,
						},
					})),
				},
			},
		},
	};
}
export function comparableReference(ref: any) {
	return {
		description: ref.description,
		date: ref.event_date?.from,
		start: ref.event_time?.from,
		end: ref.event_time?.to,
		quantity: Number(ref.detail?.quantity?.count),
		measurement: String(ref.detail?.quantity?.measurement),
		workers: Number(ref.detail?.employees),
		responsibleId: String(ref.responsible_person?.id),
		buildings: (ref.case_buildings ?? []).map((b: any) => String(b.id)).sort(),
		drawings: (ref.project_documents ?? [])
			.map((d: any) => String(d.id))
			.sort(),
	};
}
export function verifyReference(p: Proposal, ref: any) {
	if (
		ref.multi_day_work === true ||
		(ref.event_date?.to && ref.event_date.to !== p.date)
	)
		return false;
	const expected = {
		description: p.description,
		date: p.date,
		start: p.start,
		end: p.end,
		quantity: p.quantity,
		measurement: p.measurement,
		workers: p.workers,
		responsibleId: p.responsibleId,
		buildings: [...p.buildingIds].sort(),
		drawings: p.drawings.map((d) => d.id).sort(),
	};
	return JSON.stringify(expected) === JSON.stringify(comparableReference(ref));
}

export function materialPatch(
	materials: Proposal["materials"],
	existing: {
		id: string;
		attributes: {
			construction_material_id: string | number;
			quantity: number | string;
		};
	}[],
) {
	const ids = existing.map((m) =>
		String(m.attributes.construction_material_id),
	);
	if (new Set(ids).size !== ids.length)
		throw new Error(
			"BIS ierakstā atkārtojas materiāls. Vispirms pārbaudiet materiālu rindas BIS.",
		);
	return [
		...materials.map((m) => {
			const previous = existing.find(
				(e) => String(e.attributes.construction_material_id) === m.id,
			);
			return {
				type: "construction_materials_join",
				...(previous ? { id: previous.id } : {}),
				attributes: { construction_material_id: m.id, quantity: m.quantity },
			};
		}),
		...existing
			.filter(
				(e) =>
					!materials.some(
						(m) => m.id === String(e.attributes.construction_material_id),
					),
			)
			.map((e) => ({
				type: "construction_materials_join",
				id: e.id,
				attributes: { _destroy: true },
			})),
	];
}
