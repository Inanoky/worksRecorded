"use server";

import { createHash, randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/utils/db";
import { getBisBaseUrl } from "@/server/actions/BIS/service";
import {
	canWrite,
	emptyProposal,
	type FimaRow,
	normalizeWork,
	proposalSchema,
	readiness,
	type Source,
} from "../lib/records";
import { fimaAccess } from "./access";
import { fimaBisClient } from "./bis-client";

const json = (v: unknown) =>
	JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue;
function row(r: any): FimaRow {
	return {
		...r,
		proposal: proposalSchema.parse(r.proposal),
		sources: r.sources,
		createdAt: undefined,
		updatedAt: r.updatedAt.toISOString(),
	};
}
const sourceSchema = z.object({
	file: z.string().max(500),
	sheet: z.string().max(100),
	cell: z.string().max(100),
	raw: z.string().max(50000),
	crew: z.string().max(100).optional(),
	workers: z.array(z.string().max(500)).max(1000).optional(),
});

export async function getFimaWorkspace(siteId?: string) {
	const a = await fimaAccess(siteId);
	const [sites, records, templates, operations] = await Promise.all([
		prisma.site.findMany({
			where: { organizationId: a.organizationId },
			select: { id: true, name: true, bisCaseId: true, bisCaseName: true },
			orderBy: { name: "asc" },
		}),
		prisma.fimaWorkRecord.findMany({
			where: {
				organizationId: a.organizationId,
				...(siteId ? { siteId } : {}),
			},
			orderBy: { ordinal: "asc" },
			take: 5001,
		}),
		prisma.fimaWorkTemplate.findMany({
			where: { organizationId: a.organizationId },
			orderBy: { sourceWork: "asc" },
		}),
		prisma.fimaBisOperation.findMany({
			where: {
				organizationId: a.organizationId,
				...(siteId ? { record: { siteId } } : {}),
			},
			select: {
				id: true,
				recordId: true,
				kind: true,
				status: true,
				error: true,
				createdAt: true,
			},
			orderBy: { createdAt: "desc" },
			take: 100,
		}),
	]).catch((error) => {
		if (error?.code === "P2021")
			throw new Error(
				"FIMA reģistrs vēl nav aktivizēts. Administratoram jāpiemēro FIMA datubāzes migrācija.",
			);
		throw error;
	});
	return {
		bisBase: getBisBaseUrl(),
		sites,
		records: records.slice(0, 5000).map(row),
		truncated: records.length > 5000,
		templates: json(templates) as any,
		operations: operations.map((o) => ({
			...o,
			createdAt: o.createdAt.toISOString(),
		})),
	};
}

export async function importFimaRows(
	siteId: string,
	fileName: string,
	input: unknown,
	updateExisting = false,
) {
	const a = await fimaAccess(siteId);
	const rows = z
		.array(
			z.object({
				caseName: z.string().max(2000).optional(),
				localId: z
					.string()
					.regex(/^FIMA-\d+$/)
					.optional(),
				version: z.number().int().positive().optional(),
				proposal: proposalSchema,
				sources: z.array(sourceSchema).min(1).max(100),
				bisId: z.string().regex(/^\d+$/).optional(),
				warning: z.string().max(2000),
			}),
		)
		.min(1)
		.max(2000)
		.parse(input);
	const serialized = JSON.stringify(rows);
	if (Buffer.byteLength(serialized, "utf8") > 900000)
		throw new Error(
			"Vienā importā pārāk daudz datu. Sadaliet atskaiti pa projektiem vai dienām.",
		);
	const hash = createHash("sha256")
		.update(
			JSON.stringify(
				rows.map((r) => ({
					...r,
					sources: r.sources.map(({ file, ...s }) => s),
				})),
			),
		)
		.digest("hex");
	const site = await prisma.site.findUniqueOrThrow({
		where: { id: siteId },
		select: { bisCaseId: true },
	});
	return prisma.$transaction(
		async (tx) => {
			await tx.$queryRaw`SELECT id FROM "Organization" WHERE id=${a.organizationId} FOR UPDATE`;
			const existing = await tx.fimaImportBatch.findUnique({
				where: {
					organizationId_siteId_fileHash: {
						organizationId: a.organizationId,
						siteId,
						fileHash: hash,
					},
				},
			});
			if (existing) return { count: 0, duplicate: true };
			const batch = await tx.fimaImportBatch.create({
				data: {
					organizationId: a.organizationId,
					siteId,
					fileName: fileName.slice(0, 500),
					fileHash: hash,
					source: json(rows),
					createdBy: a.userId,
				},
			});
			let ordinal =
				(
					await tx.fimaWorkRecord.aggregate({
						where: { organizationId: a.organizationId },
						_max: { ordinal: true },
					})
				)._max.ordinal ?? 0;
			const used = new Set<string>();
			for (const r of rows) {
				if (r.localId) {
					if (used.has(r.localId)) throw new Error(`Atkārtots ID ${r.localId}`);
					used.add(r.localId);
					ordinal = Math.max(ordinal, Number(r.localId.slice(5)));
				}
			}
			const duplicates = await tx.fimaWorkRecord.findMany({
				where: { organizationId: a.organizationId, localId: { in: [...used] } },
			});
			if (duplicates.length && !updateExisting)
				throw new Error(
					`${duplicates[0].localId} jau ir reģistrā. Atzīmējiet versiju pārbaudītu labojumu importu vai labojiet esošo rindu.`,
				);
			for (const existing of duplicates) {
				const incoming = rows.find((r) => r.localId === existing.localId)!;
				if (
					existing.siteId !== siteId ||
					incoming.version !== existing.version ||
					!canWrite(existing) ||
					["executing", "unknown", "merged"].includes(existing.stage)
				)
					throw new Error(
						`${existing.localId}: versija, projekts vai BIS aizsardzība neļauj importēt labojumu`,
					);
				const old = proposalSchema.parse(existing.proposal),
					p = incoming.proposal;
				const proposal = {
					...old,
					description: p.description,
					date: p.date,
					rawMasts: p.rawMasts,
					masts: p.masts,
					quantity: p.quantity,
					measurement: p.measurement || old.measurement,
					unit: p.unit,
					workers: p.workers,
					start: p.start,
					end: p.end,
					notes: p.notes,
					reviewed: false,
				};
				const updated = await tx.fimaWorkRecord.updateMany({
					where: {
						id: existing.id,
						version: incoming.version,
						stage: existing.stage,
					},
					data: {
						proposal: json(proposalSchema.parse(proposal)),
						stage: "draft",
						version: { increment: 1 },
						updatedBy: a.userId,
					},
				});
				if (updated.count !== 1)
					throw new Error("Vienlaicīga izmaiņa importa laikā");
				await tx.fimaWorkRevision.create({
					data: {
						recordId: existing.id,
						version: existing.version,
						actorId: a.userId,
						action: `import:${batch.id}`,
						snapshot: json(existing),
					},
				});
			}
			const newRows = rows.filter(
				(r) => !duplicates.some((e) => e.localId === r.localId),
			);
			await tx.fimaWorkRecord.createMany({
				data: newRows.map((r) => {
					const id = r.localId ?? `FIMA-${String(++ordinal).padStart(3, "0")}`;
					return {
						id: randomUUID(),
						organizationId: a.organizationId,
						siteId,
						batchId: batch.id,
						localId: id,
						ordinal: Number(id.slice(5)),
						proposal: json(
							proposalSchema.parse({
								...r.proposal,
								reviewed: false,
								notes: [r.proposal.notes, r.warning].filter(Boolean).join("\n"),
							}),
						),
						sources: json(r.sources),
						bisId: r.bisId ?? null,
						stage: r.bisId ? "recorded" : "draft",
						bisCaseId: r.bisId ? site.bisCaseId : null,
						managed: false,
						createdBy: a.userId,
						updatedBy: a.userId,
					};
				}),
			});
			return { count: rows.length, duplicate: false };
		},
		{ timeout: 30000 },
	);
}

export async function saveFimaRecord(
	id: string,
	version: number,
	input: unknown,
	stage: "draft" | "ready" | "hold",
) {
	const a = await fimaAccess();
	const p = proposalSchema.parse(input);
	if (!["draft", "ready", "hold"].includes(stage))
		throw new Error("Nederīgs statuss");
	if (stage === "ready" && readiness(p).length)
		throw new Error(readiness(p).join("; "));
	return prisma.$transaction(async (tx) => {
		const r = await tx.fimaWorkRecord.findFirstOrThrow({
			where: { id, organizationId: a.organizationId },
		});
		if (
			r.version !== version ||
			["executing", "unknown", "merged"].includes(r.stage)
		)
			throw new Error(
				"Rinda mainīta vai tiek apstrādāta. Atjaunojiet pārskatu.",
			);
		if (
			(r.sources as unknown as Source[]).length &&
			p.sourceWork !== proposalSchema.parse(r.proposal).sourceWork
		)
			throw new Error("KUCE avota teksts ir nemainīgs");
		if (r.bisId && !canWrite(r))
			throw new Error(
				"Šis BIS ieraksts ir aizsargāts. Pārbaudiet ierakstu BIS.",
			);
		const changed = await tx.fimaWorkRecord.updateMany({
			where: { id, organizationId: a.organizationId, version, stage: r.stage },
			data: {
				proposal: json(p),
				stage,
				version: { increment: 1 },
				updatedBy: a.userId,
			},
		});
		if (changed.count !== 1)
			throw new Error("Vienlaicīga izmaiņa; atjaunojiet datus");
		await tx.fimaWorkRevision.create({
			data: {
				recordId: id,
				version,
				actorId: a.userId,
				action: "edit",
				snapshot: json(r),
			},
		});
		return true;
	});
}

export async function addFimaRecord(siteId: string) {
	const a = await fimaAccess(siteId);
	return prisma.$transaction(async (tx) => {
		await tx.$queryRaw`SELECT id FROM "Organization" WHERE id=${a.organizationId} FOR UPDATE`;
		const ordinal =
			((
				await tx.fimaWorkRecord.aggregate({
					where: { organizationId: a.organizationId },
					_max: { ordinal: true },
				})
			)._max.ordinal ?? 0) + 1;
		const r = await tx.fimaWorkRecord.create({
			data: {
				organizationId: a.organizationId,
				siteId,
				localId: `FIMA-${String(ordinal).padStart(3, "0")}`,
				ordinal,
				proposal: json(emptyProposal()),
				sources: [],
				createdBy: a.userId,
				updatedBy: a.userId,
			},
		});
		return r.id;
	});
}

export async function saveFimaTemplate(id: string, description: string) {
	const a = await fimaAccess();
	const r = await prisma.fimaWorkRecord.findFirstOrThrow({
		where: { id, organizationId: a.organizationId },
	});
	const p = proposalSchema.parse(r.proposal);
	if (!p.reviewed || !p.sourceWork.trim() || !p.evidence.length)
		throw new Error(
			"Veidnei vajadzīgs pārbaudīts darbs un salīdzinājuma avots",
		);
	if (!description.trim() || description.length > 10000)
		throw new Error("Nederīgs veidnes apraksts");
	const data = {
		sourceWork: p.sourceWork,
		description,
		evidence: json(p.evidence),
		createdBy: a.userId,
	};
	await prisma.fimaWorkTemplate.upsert({
		where: {
			organizationId_workKey: {
				organizationId: a.organizationId,
				workKey: normalizeWork(p.sourceWork),
			},
		},
		create: {
			...data,
			organizationId: a.organizationId,
			workKey: normalizeWork(p.sourceWork),
		},
		update: data,
	});
}

export async function getFimaHistory(id: string) {
	const a = await fimaAccess();
	await prisma.fimaWorkRecord.findFirstOrThrow({
		where: { id, organizationId: a.organizationId },
	});
	return json(
		await prisma.fimaWorkRevision.findMany({
			where: { recordId: id },
			orderBy: { createdAt: "desc" },
			take: 50,
		}),
	) as any;
}

export async function getFimaCaseResources(siteId: string) {
	await fimaAccess(siteId);
	const bis = await fimaBisClient(siteId);
	const paths = [
		"available_responsible_persons",
		"case_buildings",
		"available_used_materials",
		"project",
	];
	const results = await Promise.allSettled(
		paths.map((p) =>
			bis.list(
				p === "case_buildings"
					? `/bisp/api/portal/bis_cases/${bis.bisCaseId}/case_buildings?page[size]=100`
					: `${p === "available_used_materials" ? "construction_materials" : p}?page[size]=100`,
			),
		),
	);
	const data: Record<string, any> = {
		caseId: bis.bisCaseId,
		base: bis.base,
		errors: [],
	};
	results.forEach((r, i) => {
		data[paths[i]] = r.status === "fulfilled" ? r.value : [];
		if (r.status === "rejected")
			data.errors.push(`${paths[i]}: ${r.reason.message}`);
	});
	data.measures = await bis.list(
		"/bisp/api/portal/classifiers?filter[typ_eq]=character_measures&page[size]=100",
	);
	return data;
}

export async function searchFimaBisHistory(siteId: string, query: string) {
	await fimaAccess(siteId);
	const bis = await fimaBisClient(siteId);
	if (query.trim().length < 3 || query.length > 200)
		throw new Error("Ievadiet 3–200 rakstzīmes");
	const list = await bis.list(
		`performed_works?search[description_or_justification]=${encodeURIComponent(query)}&page[size]=100`,
	);
	return list
		.slice(0, 100)
		.map((r) => ({ id: r.id, ...r.attributes, caseId: bis.bisCaseId }));
}

export async function searchFimaKuceHistory(query: string) {
	const a = await fimaAccess();
	const key = normalizeWork(query);
	if (key.length < 3 || key.length > 200)
		throw new Error("Ievadiet vismaz 3 rakstzīmes");
	const records = await prisma.fimaWorkRecord.findMany({
		where: {
			organizationId: a.organizationId,
			proposal: {
				path: ["sourceWork"],
				string_contains: query.trim(),
				mode: "insensitive",
			},
		},
		take: 100,
		orderBy: { updatedAt: "desc" },
	});
	return records.map(row);
}

export async function mergeFimaRows(ids: string[], workers: number | null) {
	const a = await fimaAccess();
	if (ids.length < 2 || ids.length > 20 || new Set(ids).size !== ids.length)
		throw new Error("Izvēlieties 2–20 dažādas rindas");
	if (workers !== null && (!Number.isInteger(workers) || workers < 0))
		throw new Error("Nederīgs darbinieku skaits");
	return prisma.$transaction(async (tx) => {
		await tx.$queryRaw`SELECT id FROM "Organization" WHERE id=${a.organizationId} FOR UPDATE`;
		const records = await tx.fimaWorkRecord.findMany({
			where: { id: { in: ids }, organizationId: a.organizationId },
			orderBy: { ordinal: "asc" },
		});
		if (
			records.length !== ids.length ||
			records.some(
				(r) => r.bisId || !["draft", "ready", "hold"].includes(r.stage),
			)
		)
			throw new Error(
				"Apvienot var tikai vietējos priekšlikumus bez BIS ieraksta",
			);
		const first = records[0],
			p = proposalSchema.parse(first.proposal);
		for (const r of records) {
			const q = proposalSchema.parse(r.proposal);
			if (
				r.siteId !== first.siteId ||
				q.date !== p.date ||
				q.start !== p.start ||
				q.end !== p.end ||
				normalizeWork(q.sourceWork) !== normalizeWork(p.sourceWork)
			)
				throw new Error("Atšķiras projekts, datums, maiņa vai darba veids");
		}
		const sources = records.flatMap((r) => r.sources as unknown as Source[]);
		const named = sources.every((s) => s.workers?.length);
		const count = named
			? new Set(
					sources
						.flatMap((s) => s.workers!)
						.map((n) => n.trim().toLocaleLowerCase()),
				).size
			: workers;
		const masts = [
			...new Set(
				records.flatMap((r) => proposalSchema.parse(r.proposal).masts),
			),
		];
		for (const r of records) {
			const updated = await tx.fimaWorkRecord.updateMany({
				where: { id: r.id, version: r.version, stage: r.stage },
				data:
					r.id === first.id
						? {
								sources: json(sources),
								proposal: json(
									proposalSchema.parse({
										...p,
										masts,
										rawMasts: masts.join(", "),
										workers: count,
										reviewed: false,
										notes: `${p.notes}\nApvienots: ${records.map((r) => r.localId).join(", ")}. Darbu apjoms nav summēts; pārbaudiet.`,
									}),
								),
								stage: "draft",
								version: { increment: 1 },
								updatedBy: a.userId,
							}
						: {
								stage: "merged",
								version: { increment: 1 },
								updatedBy: a.userId,
							},
			});
			if (updated.count !== 1)
				throw new Error("Rinda mainījās apvienošanas laikā");
			await tx.fimaWorkRevision.create({
				data: {
					recordId: r.id,
					version: r.version,
					actorId: a.userId,
					action: `merge:${first.id}`,
					snapshot: json(r),
				},
			});
		}
		return first.id;
	});
}
export async function copyFimaCommonFields(
	sourceId: string,
	targets: { id: string; version: number }[],
	useTemplates: boolean,
) {
	const a = await fimaAccess();
	if (
		!targets.length ||
		targets.length > 200 ||
		new Set(targets.map((t) => t.id)).size !== targets.length
	)
		throw new Error("Izvēlieties 1–200 dažādas rindas");
	return prisma.$transaction(
		async (tx) => {
			const source = await tx.fimaWorkRecord.findFirstOrThrow({
				where: { id: sourceId, organizationId: a.organizationId },
			});
			const defaults = proposalSchema.parse(source.proposal);
			if (!defaults.responsibleId || !defaults.buildingIds.length)
				throw new Error(
					"Avota rindā vispirms saglabājiet atbildīgo personu un būvniecības objektus",
				);
			const rows = await tx.fimaWorkRecord.findMany({
				where: {
					id: { in: targets.map((t) => t.id) },
					organizationId: a.organizationId,
				},
			});
			if (
				rows.length !== targets.length ||
				rows.some(
					(r) =>
						r.siteId !== source.siteId ||
						r.version !== targets.find((t) => t.id === r.id)?.version ||
						!canWrite(r) ||
						["executing", "unknown", "merged"].includes(r.stage),
				)
			)
				throw new Error(
					"Rindas mainītas, aizsargātas vai pieder dažādiem projektiem",
				);
			const templates = useTemplates
				? await tx.fimaWorkTemplate.findMany({
						where: { organizationId: a.organizationId },
					})
				: [];
			for (const r of rows) {
				const p = proposalSchema.parse(r.proposal),
					template = templates.find(
						(t) => t.workKey === normalizeWork(p.sourceWork),
					);
				const description =
					!p.description.trim() && template
						? template.description
								.replaceAll("{masts}", p.masts.join(", "))
								.replaceAll("{date}", p.date)
						: p.description;
				const proposal = {
					...p,
					responsibleId: defaults.responsibleId,
					responsibleType: defaults.responsibleType,
					buildingIds: defaults.buildingIds,
					drawings: defaults.drawings,
					description,
					reviewed: false,
					evidence:
						description !== p.description && template
							? [
									...p.evidence,
									...proposalSchema.shape.evidence.parse(template.evidence),
								]
							: p.evidence,
				};
				const n = await tx.fimaWorkRecord.updateMany({
					where: { id: r.id, version: r.version, stage: r.stage },
					data: {
						proposal: json(proposalSchema.parse(proposal)),
						stage: "draft",
						version: { increment: 1 },
						updatedBy: a.userId,
					},
				});
				if (n.count !== 1)
					throw new Error("Vienlaicīga izmaiņa; atjaunojiet reģistru");
				await tx.fimaWorkRevision.create({
					data: {
						recordId: r.id,
						version: r.version,
						actorId: a.userId,
						action: `common-fields:${source.localId}`,
						snapshot: json(r),
					},
				});
			}
			return rows.length;
		},
		{ timeout: 30000 },
	);
}
