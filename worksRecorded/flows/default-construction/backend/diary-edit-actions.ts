"use server";

import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { resolveFlowModuleKeyForRuntime } from "@/lib/flows/resolve-flow-module-server";
import { FLOW_MODULE_KEYS } from "@/lib/flows/types";
import { createPerfTrace } from "@/lib/observability/perf";
import { prisma } from "@/lib/utils/db";
import { requireUser } from "@/lib/utils/requireUser";
import { orgCheck } from "@/server/actions/shared-actions";
import {
	type DiaryEditChanges,
	diaryEditRow,
	diaryEditSelect,
} from "../lib/diary-edit";
import {
	hasDefaultConstructionQuantityProfile,
	normalizeActualQuantityForStorage,
} from "../lib/quantity-plan-actual";
import { syncDiaryEditAssignments } from "./diary-forma2-sync";

const text = z.string().max(1500).nullable().optional();
const number = z.preprocess(
	(value) => (value === "" ? null : value),
	z.coerce.number().finite().min(-1e9).max(1e9).nullable().optional(),
);
const fields = z
	.object({
		Date: z.coerce.date().nullable().optional(),
		Date_Custom_1: z.coerce.date().nullable().optional(),
		Date_Custom_2: z.coerce.date().nullable().optional(),
		Location: text,
		Location_Custom_1: text,
		Location_Custom_2: text,
		Works: text,
		Works_Custom_1: text,
		Works_Custom_2: text,
		Comments: text,
		Comments_Custom_1: text,
		Comments_Custom_2: text,
		Units: z.string().max(100).nullable().optional(),
		Amounts: number,
		WorkersInvolved: number,
		TimeInvolved: number,
	})
	.strict();
const inputSchema = z
	.object({
		siteId: z.string().uuid(),
		updates: z
			.array(z.object({ id: z.string().min(1).max(128), fields }))
			.max(200),
		creates: z
			.array(z.object({ clientId: z.string().uuid(), fields }))
			.max(200),
	})
	.refine((input) => input.updates.length + input.creates.length <= 200);

export async function saveDefaultConstructionDiaryEdits(
	args: z.input<typeof inputSchema>,
) {
	const parsed = inputSchema.safeParse(args);
	if (!parsed.success)
		throw new Error(
			"Pārbaudiet ierakstu datumus, skaitļus un ievadītos laukus.",
		);
	const input = parsed.data;
	const trace = createPerfTrace({
		route: "construction-diary-batch-save",
		category: "action",
		siteId: input.siteId,
	});
	try {
		const user = await requireUser();
		const site = await orgCheck(user.id, input.siteId);
		if (
			!site ||
			(await resolveFlowModuleKeyForRuntime({
				siteId: input.siteId,
				organizationId: site.organizationId,
			})) !== FLOW_MODULE_KEYS.DEFAULT_CONSTRUCTION
		)
			throw new Error("Nav piekļuves būvdarbu žurnālam.");
		const config = await prisma.site.findUnique({
			where: { id: input.siteId },
			select: { siteDiaryRecordsMap: true },
		});
		const quantityProfile = hasDefaultConstructionQuantityProfile(
			config?.siteDiaryRecordsMap as Record<string, unknown> | null,
		);
		const ids = [
			...input.updates.map((row) => row.id),
			...input.creates.map((row) => row.clientId),
		];
		if (new Set(ids).size !== ids.length)
			throw new Error("Ierakstu identifikatori atkārtojas.");
		const normalize = (value: z.output<typeof fields>) => {
			const data = Object.fromEntries(
				Object.entries(value).filter(([, value]) => value !== undefined),
			);
			if (quantityProfile && Object.hasOwn(data, "Comments_Custom_1"))
				data.Comments_Custom_1 = normalizeActualQuantityForStorage(
					data.Comments_Custom_1,
				);
			return data;
		};
		const result = await prisma.$transaction(
			async (tx) => {
				const existing = await tx.sitediaryrecords.findMany({
					where: { id: { in: ids } },
					select: {
						...diaryEditSelect,
						User: false,
						Worker: false,
						Photos: false,
						BISId: false,
						bisStatus: false,
						originalUserComment: false,
						originalAudioUrl: false,
						siteId: true,
						organizationId: true,
						userId: true,
						archivedAt: true,
					},
				});
				const byId = new Map(existing.map((row) => [row.id, row]));
				for (const row of existing)
					if (
						row.siteId !== input.siteId ||
						(row.organizationId !== null &&
							row.organizationId !== site.organizationId) ||
						row.archivedAt
					)
						throw new Error("Ieraksts nav pieejams šajā projektā.");
				for (const row of input.updates)
					if (!byId.has(row.id))
						throw new Error(
							"Ieraksts vairs nav pieejams. Atjaunojiet žurnālu.",
						);
				const assignments: { id: string; work: string | null }[] = [];
				const updates = [...input.updates];
				const creates: Prisma.sitediaryrecordsCreateManyInput[] = [];
				for (const row of input.creates) {
					const prior = byId.get(row.clientId);
					if (prior) {
						if (prior.userId !== user.id)
							throw new Error("Jaunā ieraksta identifikators jau izmantots.");
						updates.push({ id: row.clientId, fields: row.fields });
					} else {
						const data = normalize(row.fields);
						if (!(data.Date instanceof Date))
							throw new Error("Jaunam ierakstam jānorāda datums.");
						creates.push({
							...data,
							id: row.clientId,
							siteId: input.siteId,
							organizationId: site.organizationId,
							userId: user.id,
							Photos: [],
						});
						assignments.push({
							id: row.clientId,
							work: row.fields.Works ?? null,
						});
					}
				}
				for (const row of updates) {
					const prior = byId.get(row.id);
					if (!prior) throw new Error("Ieraksts nav atrasts.");
					const data = Object.fromEntries(
						Object.entries(normalize(row.fields)).filter(([key, value]) => {
							const previous = prior[key as keyof typeof prior];
							return previous instanceof Date && value instanceof Date
								? previous.getTime() !== value.getTime()
								: previous !== value;
						}),
					);
					if (!Object.keys(data).length) continue;
					const changed = await tx.sitediaryrecords.updateMany({
						where: {
							id: row.id,
							siteId: input.siteId,
							OR: [
								{ organizationId: site.organizationId },
								{ organizationId: null },
							],
							archivedAt: null,
						},
						data,
					});
					if (changed.count !== 1)
						throw new Error("Ieraksts vairs nav pieejams.");
					if (Object.hasOwn(data, "Works"))
						assignments.push({ id: row.id, work: row.fields.Works ?? null });
				}
				if (creates.length)
					await tx.sitediaryrecords.createMany({ data: creates });
				if (assignments.length)
					await trace.measure("forma2Sync", () =>
						syncDiaryEditAssignments(tx, input.siteId, assignments),
					);
				const saved = await tx.sitediaryrecords.findMany({
					where: { id: { in: ids }, siteId: input.siteId, archivedAt: null },
					select: diaryEditSelect,
				});
				return {
					rows: saved.map(diaryEditRow),
					createdIds: input.creates.map((row) => row.clientId),
				} satisfies DiaryEditChanges;
			},
			{ timeout: 15000 },
		);
		if (ids.length)
			revalidatePath(`/dashboard/sites/${input.siteId}/analytics`);
		trace.end({
			status: 200,
			extra: { updated: input.updates.length, created: input.creates.length },
		});
		return result;
	} catch (error) {
		trace.fail(error, { status: 500 });
		throw new Error(
			error instanceof Error && !("code" in error)
				? error.message
				: "Neizdevās saglabāt žurnālu. Mēģiniet vēlreiz.",
		);
	}
}
