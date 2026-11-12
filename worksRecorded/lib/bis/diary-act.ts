import { z } from "zod";
import { bisNumericId } from "./diary-references";

export const diaryActSchema = z
	.object({
		siteId: z.string().uuid(),
		requestId: z.string().uuid(),
		recordIds: z.array(z.string().uuid()).min(1).max(30),
		kind: z.enum(["certificate", "covered"]),
		eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
		eventTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
		name: z.string().trim().max(200),
		description: z.string().trim().max(5000),
		mark: z.string().trim().max(50),
		code: z.string().trim().max(50),
		caseActId: z.string().regex(/^$|^[1-9]\d*$/),
		estimateByRecord: z.record(z.string(), z.string()),
		revision: z.string().min(1),
	})
	.strict()
	.superRefine((value, ctx) => {
		const date = new Date(`${value.eventDate}T00:00:00Z`);
		if (
			!Number.isFinite(date.getTime()) ||
			date.toISOString().slice(0, 10) !== value.eventDate
		)
			ctx.addIssue({
				code: "custom",
				path: ["eventDate"],
				message: "Nederīgs akta datums.",
			});
		if (
			value.kind === "covered" &&
			(!value.name || !value.description || !value.caseActId)
		)
			ctx.addIssue({
				code: "custom",
				message:
					"Norādiet akta nosaukumu, aprakstu un BIS pieņemšanas darbu plāna pozīciju.",
			});
	});

export type DiaryActInput = z.infer<typeof diaryActSchema>;
export type DiaryActWork = {
	recordId: string;
	bisId: string;
	description: string;
	date: string;
	quantity: number;
	measurement: string;
	estimateId: string;
	materialUses?: { id: string; quantity: number }[];
	projectPageIds?: string[];
};
export type DiaryActEstimate = {
	id: string;
	label: string;
	number: string;
	description: string;
	quantity: string | null;
	measure: string | null;
};
export type DiaryActPreparation = {
	revision: string;
	works: DiaryActWork[];
	estimates: DiaryActEstimate[];
	plans: { id: string; label: string }[];
};

export function buildDiaryActPayload(
	input: DiaryActInput,
	preparation: DiaryActPreparation,
	round: string | number | null,
) {
	const dates = preparation.works.map((work) => work.date).sort();
	if (input.eventDate < dates[dates.length - 1])
		throw new Error("Akta datums nevar būt pirms izvēlētajiem darbiem.");
	for (const work of preparation.works) {
		bisNumericId(work.bisId);
		if (!Number.isFinite(work.quantity) || work.quantity < 0)
			throw new Error("BIS darbam nav derīga apjoma.");
	}
	const type =
		input.kind === "covered"
			? "covered_works_acceptance_act"
			: "accomplished_work_certificate";
	const relationships: Record<string, unknown> = {};
	if (input.kind === "covered") {
		relationships.detail = {
			data: {
				type,
				attributes: {
					logbook_case_act_id: bisNumericId(input.caseActId),
					name: input.name,
					description: input.description,
					...(input.mark ? { mark: input.mark } : {}),
					...(input.code ? { code: input.code } : {}),
				},
			},
		};
		const materials = new Map<string, number>();
		const pages = new Set<string>();
		for (const work of preparation.works) {
			for (const material of work.materialUses ?? []) {
				bisNumericId(material.id);
				if (!Number.isFinite(material.quantity) || material.quantity < 0)
					throw new Error("Nederīgs BIS materiāla apjoms.");
				materials.set(
					material.id,
					(materials.get(material.id) ?? 0) + material.quantity,
				);
			}
			for (const id of work.projectPageIds ?? []) pages.add(id);
		}
		if (materials.size)
			relationships.used_materials = {
				data: [...materials].map(([id, quantity]) => ({
					type: "construction_materials_join",
					attributes: {
						construction_material_id: bisNumericId(id),
						quantity: String(quantity),
					},
				})),
			};
		if (pages.size)
			relationships.project_pages = {
				data: [...pages].map((id) => ({
					type: "project_pages_join",
					attributes: { project_page_id: bisNumericId(id) },
				})),
			};
		relationships.accomplished_works = {
			data: preparation.works.map((work) => ({
				type: "logbooks_join",
				attributes: {
					child_id: bisNumericId(work.bisId),
					quantity: String(work.quantity),
				},
			})),
		};
	} else {
		relationships.detail = {
			data: {
				type,
				attributes: { date_from: dates[0], date_to: dates[dates.length - 1] },
			},
		};
		const groups = new Map<string, DiaryActWork[]>();
		for (const work of preparation.works) {
			const id = input.estimateByRecord[work.recordId] || work.estimateId;
			if (!preparation.estimates.some((estimate) => estimate.id === id))
				throw new Error(
					`Izvēlieties BIS tāmes pozīciju darbam: ${work.description}`,
				);
			groups.set(id, [...(groups.get(id) ?? []), work]);
		}
		relationships.certificate_details = {
			data: [...groups].map(([id, works]) => {
				const estimate = preparation.estimates.find((item) => item.id === id)!;
				if (
					estimate.measure &&
					works.some(
						(work) => work.measurement && work.measurement !== estimate.measure,
					)
				)
					throw new Error(
						`Darba un tāmes mērvienības nesakrīt: ${estimate.label}`,
					);
				return {
					type: "accomplished_work_certificate_detail",
					attributes: {
						estimate_position_id: bisNumericId(id),
						estimate_number: estimate.number,
						estimate_description: estimate.description,
						estimate_quantity: estimate.quantity,
						estimate_measure: estimate.measure,
						quantity: String(
							works.reduce((sum, work) => sum + work.quantity, 0),
						),
						previous_quantity: null,
						remaining_quantity: null,
						accomplished_work_ids: works.map((work) =>
							bisNumericId(work.bisId),
						),
					},
				};
			}),
		};
	}
	return {
		data: {
			type,
			attributes: {
				event_date: input.eventDate,
				event_time_from: input.eventTime,
				case_construction_round_id:
					round == null ? null : bisNumericId(String(round)),
			},
			relationships,
		},
	};
}
