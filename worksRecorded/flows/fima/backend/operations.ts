"use server";

import { createHash, randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/utils/db";
import {
	buildPayload,
	canWrite,
	materialPatch,
	proposalSchema,
	verifyReference,
} from "../lib/records";
import { fimaAccess } from "./access";
import { FimaBisError, fimaBisClient } from "./bis-client";

const json = (v: unknown) =>
	JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue;
function materialsMatch(
	expected: { id: string; quantity: number }[],
	actual: any[],
) {
	const normalize = (a: { id: string; quantity: number }[]) =>
		a.map((m) => `${m.id}:${m.quantity}`).sort();
	return (
		JSON.stringify(normalize(expected)) ===
		JSON.stringify(
			normalize(
				actual.map((m) => ({
					id: String(m.attributes.construction_material_id),
					quantity: Number(m.attributes.quantity),
				})),
			),
		)
	);
}
async function remote(
	bis: Awaited<ReturnType<typeof fimaBisClient>>,
	id: string,
) {
	const path = `performed_works/${id}`;
	const [record, reference, materials] = await Promise.all([
		bis.request(path),
		bis.request(`${path}/reference_data`),
		bis.list(`${path}/logbook_used_construction_materials`),
	]);
	return { record, reference, materials };
}

export async function executeFimaBis(
	id: string,
	version: number,
	kind: "create" | "update" | "zero",
	acceptApiCreator: boolean,
) {
	const a = await fimaAccess();
	const r = await prisma.fimaWorkRecord.findFirstOrThrow({
		where: { id, organizationId: a.organizationId },
	});
	await fimaAccess(r.siteId);
	if (!["create", "update", "zero"].includes(kind))
		throw new Error("Nederīga darbība");
	if (
		r.version !== version ||
		["executing", "unknown", "merged"].includes(r.stage)
	)
		throw new Error("Rinda mainīta vai jau tiek apstrādāta");
	if (!canWrite(r))
		throw new Error(
			"Cita autora vai apstiprināšanai nodots BIS ieraksts ir aizsargāts",
		);
	const p = proposalSchema.parse(r.proposal);
	if (
		kind === "create" &&
		(r.bisId ||
			r.stage !== "ready" ||
			p.authorMode !== "api" ||
			!acceptApiCreator)
	)
		throw new Error(
			"API izveidei izvēlieties pārbaudītu priekšlikumu un apstipriniet BIS sistēmas lietotāja autorību",
		);
	if (kind !== "create" && !r.bisId) throw new Error("Nav BIS ieraksta");
	if (kind === "update" && r.stage !== "ready")
		throw new Error("Pirms atjaunošanas pārbaudiet priekšlikumu");
	const bis = await fimaBisClient(r.siteId);
	if (r.bisCaseId && r.bisCaseId !== bis.bisCaseId)
		throw new Error(
			"Projekta BIS lieta ir mainīta; vispirms atrisiniet piesaisti",
		);
	let before: any = null;
	if (r.bisId) {
		before = await remote(bis, r.bisId);
		if (before.record.data.attributes.status !== "draft")
			throw new Error("BIS ieraksts vairs nav sagatave");
		const previous = r.snapshot as any;
		if (
			!previous ||
			JSON.stringify(before.reference) !== JSON.stringify(previous.reference) ||
			JSON.stringify(before.materials) !== JSON.stringify(previous.materials)
		)
			throw new Error(
				"BIS saturs mainīts ārpus WorksRecorded. Atjaunojiet statusu un pārskatiet izmaiņas.",
			);
	}
	let payload: any;
	if (kind === "zero")
		payload = {
			data: {
				type: "performed_work",
				id: r.bisId,
				relationships: {
					logbook_used_construction_materials: {
						data: before.materials.map((m: any) => ({
							type: "construction_materials_join",
							id: m.id,
							attributes: {
								construction_material_id: m.attributes.construction_material_id,
								quantity: 0,
							},
						})),
					},
				},
			},
		};
	else {
		payload = buildPayload(p, bis.site.bisConstructionRoundId);
		const [people, buildings, drawings, materials] = await Promise.all([
			bis.list("available_responsible_persons?page[size]=100"),
			bis.list(
				`/bisp/api/portal/bis_cases/${bis.bisCaseId}/case_buildings?page[size]=100`,
			),
			p.drawings.length
				? bis.list("project?page[size]=100")
				: Promise.resolve([]),
			p.materials.length
				? bis.list("construction_materials?page[size]=100")
				: Promise.resolve([]),
		]);
		if (
			!people.some(
				(x) =>
					String(x.attributes?.responsible_person_id) === p.responsibleId &&
					x.attributes?.responsible_person_type === p.responsibleType,
			)
		)
			throw new Error("Atbildīgā persona nav pieejama šajā BIS lietā");
		if (p.buildingIds.some((id) => !buildings.some((b) => String(b.id) === id)))
			throw new Error("Būvniecības objekts nav šajā BIS lietā");
		if (p.drawings.some((d) => !drawings.some((x) => String(x.id) === d.id)))
			throw new Error("Rasējums nav šajā BIS lietā");
		if (
			p.materials.some(
				(m) =>
					!materials.some(
						(x) =>
							String(x.id) === m.id ||
							String(x.attributes?.construction_material_id) === m.id,
					),
			)
		)
			throw new Error("Materiāls nav šīs BIS lietas katalogā");
		if (kind === "create") {
			const candidates = await bis.list(
				`performed_works?search[event_date]=${p.date.split("-").reverse().join(".")}&search[event_date_until]=${p.date.split("-").reverse().join(".")}&page[size]=100`,
			);
			if (candidates.some((x) => x.attributes?.description === p.description))
				throw new Error(
					"BIS šajā datumā jau ir ieraksts ar tādu pašu aprakstu. Pārbaudiet un piesaistiet esošo.",
				);
		} else {
			payload.data.id = r.bisId;
			payload.data.relationships.logbook_used_construction_materials.data =
				materialPatch(p.materials, before.materials);
		}
	}
	const opId = randomUUID();
	await prisma.$transaction(async (tx) => {
		const lock = await tx.fimaWorkRecord.updateMany({
			where: { id, organizationId: a.organizationId, version, stage: r.stage },
			data: {
				stage: "executing",
				version: { increment: 1 },
				updatedBy: a.userId,
			},
		});
		if (lock.count !== 1) throw new Error("Rinda mainīta; atjaunojiet datus");
		await tx.fimaBisOperation.create({
			data: {
				id: opId,
				recordId: id,
				organizationId: a.organizationId,
				requestKey: `${id}:${version}:${kind}`,
				dedupeKey:
					kind === "create"
						? createHash("sha256")
								.update(
									JSON.stringify([
										a.organizationId,
										bis.bisCaseId,
										p.date,
										p.description.trim(),
									]),
								)
								.digest("hex")
						: null,
				actorId: a.userId,
				kind,
				status: "executing",
				request: json({ payload, before, proposal: p, caseId: bis.bisCaseId }),
			},
		});
		await tx.fimaWorkRevision.create({
			data: {
				recordId: id,
				version,
				actorId: a.userId,
				action: kind,
				snapshot: json(r),
			},
		});
	});
	let target = r.bisId;
	let acknowledged = false;
	try {
		const result = await bis.request(
			`performed_works${target ? `/${target}` : ""}`,
			kind === "create" ? "POST" : "PATCH",
			payload,
		);
		acknowledged = true;
		if (kind === "create") {
			target = String(result?.data?.id ?? "");
			if (!/^\d+$/.test(target)) throw new Error("BIS neatgrieza ieraksta ID");
			await prisma.fimaWorkRecord.update({
				where: { id },
				data: { bisId: target, bisCaseId: bis.bisCaseId, managed: true },
			});
		}
		const after = await remote(bis, target!);
		if (after.record.data.attributes.status !== "draft")
			throw new Error("Negaidīts BIS statuss pēc saglabāšanas");
		if (kind === "zero") {
			const withoutMaterials = (v: any) => {
				const copy = { ...v };
				delete copy.used_construction_materials;
				return copy;
			};
			if (
				JSON.stringify(withoutMaterials(before.reference)) !==
				JSON.stringify(withoutMaterials(after.reference))
			)
				throw new Error("Mainījies arī ieraksta saturs; nepieciešama pārbaude");
			if (
				!materialsMatch(
					before.materials.map((m: any) => ({
						id: String(m.attributes.construction_material_id),
						quantity: 0,
					})),
					after.materials,
				)
			)
				throw new Error(
					"BIS neapstiprināja nulles daudzumu visām materiālu rindām",
				);
		} else if (
			!verifyReference(p, after.reference) ||
			!materialsMatch(p.materials, after.materials)
		)
			throw new Error(
				"BIS saglabātais saturs neatbilst priekšlikumam; nepieciešama pārbaude",
			);
		await prisma.$transaction([
			prisma.fimaBisOperation.update({
				where: { id: opId },
				data: { status: "verified", result: json(after) },
			}),
			prisma.fimaWorkRecord.update({
				where: { id },
				data: {
					stage: "recorded",
					bisStatus: "draft",
					snapshot: json(after),
					...(kind === "zero"
						? {
								proposal: json({
									...p,
									materials: p.materials.map((m) => ({ ...m, quantity: 0 })),
								}),
							}
						: {}),
				},
			}),
		]);
		return { id, bisId: target, status: "verified" };
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "BIS operācija pārtraukta";
		const rejected =
			!acknowledged &&
			error instanceof FimaBisError &&
			[400, 401, 403, 404, 422].includes(error.status);
		await prisma.$transaction([
			prisma.fimaBisOperation.update({
				where: { id: opId },
				data: {
					status: rejected ? "rejected" : "unknown",
					error: message,
					...(rejected ? { dedupeKey: null } : {}),
				},
			}),
			prisma.fimaWorkRecord.update({
				where: { id },
				data: { stage: rejected ? "hold" : "unknown" },
			}),
		]);
		throw new Error(
			`${message}. ${rejected ? "BIS noraidīja pieprasījumu. Izlabojiet priekšlikumu un pārbaudiet vēlreiz." : "Operācija netiks automātiski atkārtota; salīdziniet ar BIS."}`,
		);
	}
}

export async function refreshFimaBis(id: string) {
	const a = await fimaAccess();
	const r = await prisma.fimaWorkRecord.findFirstOrThrow({
		where: { id, organizationId: a.organizationId },
	});
	await fimaAccess(r.siteId);
	const pending = ["executing", "unknown"].includes(r.stage);
	if (r.stage === "executing" && Date.now() - r.updatedAt.getTime() < 300000)
		throw new Error(
			"Operācija vēl var darboties. Pārbaudiet atkārtoti pēc piecām minūtēm.",
		);
	if (!r.bisId) {
		if (!pending) throw new Error("Nav piesaistīta BIS ieraksta");
		await prisma.$transaction(async (tx) => {
			const n = await tx.fimaWorkRecord.updateMany({
				where: { id, version: r.version },
				data: {
					stage: "unknown",
					version: { increment: 1 },
					updatedBy: a.userId,
				},
			});
			if (n.count !== 1) throw new Error("Rinda mainīta");
			await tx.fimaBisOperation.updateMany({
				where: { recordId: id, status: "executing" },
				data: {
					status: "unknown",
					error: "Pārtraukta darbība bez saņemta BIS ID; jāpārbauda BIS.",
				},
			});
			await tx.fimaWorkRevision.create({
				data: {
					recordId: id,
					version: r.version,
					actorId: a.userId,
					action: "recover",
					snapshot: json(r),
				},
			});
		});
		return { needsLink: true };
	}
	const bis = await fimaBisClient(r.siteId);
	if (r.bisCaseId && r.bisCaseId !== bis.bisCaseId)
		throw new Error("BIS lieta neatbilst piesaistei");
	const current = await remote(bis, r.bisId);
	const op = pending
		? await prisma.fimaBisOperation.findFirst({
				where: { recordId: id, status: { in: ["executing", "unknown"] } },
				orderBy: { createdAt: "desc" },
			})
		: null;
	const changedExternally =
		!pending &&
		r.managed &&
		JSON.stringify(r.snapshot) !== JSON.stringify(current);
	let recoveredProposal: unknown = changedExternally
		? { ...proposalSchema.parse(r.proposal), reviewed: false }
		: undefined;
	if (pending) {
		if (!op)
			throw new Error(
				"Trūkst operācijas žurnāla; nepieciešama manuāla pārbaude",
			);
		const request = op.request as any;
		const proposal = proposalSchema.parse(request.proposal);
		const verified =
			op.kind === "zero"
				? materialsMatch(
						request.before.materials.map((m: any) => ({
							id: String(m.attributes.construction_material_id),
							quantity: 0,
						})),
						current.materials,
					) &&
					JSON.stringify({
						...request.before.reference,
						used_construction_materials: [],
					}) ===
						JSON.stringify({
							...current.reference,
							used_construction_materials: [],
						})
				: verifyReference(proposal, current.reference) &&
					materialsMatch(proposal.materials, current.materials);
		if (!verified)
			throw new Error(
				"BIS saturs neatbilst pieprasījumam. Operācija netiks atkārtota; pārbaudiet BIS manuāli.",
			);
		if (op.kind === "zero")
			recoveredProposal = {
				...proposal,
				materials: proposal.materials.map((m) => ({ ...m, quantity: 0 })),
			};
	}
	await prisma.$transaction(async (tx) => {
		const n = await tx.fimaWorkRecord.updateMany({
			where: { id, version: r.version },
			data: {
				snapshot: json(current),
				bisCaseId: bis.bisCaseId,
				bisStatus: current.record.data.attributes.status,
				stage: pending ? "recorded" : changedExternally ? "draft" : r.stage,
				version: { increment: 1 },
				updatedBy: a.userId,
				...(recoveredProposal ? { proposal: json(recoveredProposal) } : {}),
			},
		});
		if (n.count !== 1) throw new Error("Rinda mainīta atjaunošanas laikā");
		if (op)
			await tx.fimaBisOperation.update({
				where: { id: op.id },
				data: { status: "verified", result: json(current), error: null },
			});
		await tx.fimaWorkRevision.create({
			data: {
				recordId: id,
				version: r.version,
				actorId: a.userId,
				action: "sync",
				snapshot: json(r),
			},
		});
	});
	return { needsLink: false };
}

export async function linkFimaBis(id: string, version: number, bisId: string) {
	if (!/^\d+$/.test(bisId))
		throw new Error("Ievadiet BIS ieraksta ID no saites");
	const a = await fimaAccess();
	const r = await prisma.fimaWorkRecord.findFirstOrThrow({
		where: { id, organizationId: a.organizationId },
	});
	await fimaAccess(r.siteId);
	if (
		r.bisId ||
		r.version !== version ||
		["executing", "merged"].includes(r.stage)
	)
		throw new Error("Rinda mainīta vai tai jau ir BIS saite");
	const bis = await fimaBisClient(r.siteId);
	const current = await remote(bis, bisId);
	const p = proposalSchema.parse(r.proposal);
	if (
		!verifyReference(p, current.reference) ||
		!materialsMatch(p.materials, current.materials)
	)
		throw new Error("BIS saturs vai materiāli neatbilst priekšlikumam");
	await prisma.$transaction(async (tx) => {
		const n = await tx.fimaWorkRecord.updateMany({
			where: { id, version },
			data: {
				bisId,
				bisCaseId: bis.bisCaseId,
				bisStatus: current.record.data.attributes.status,
				snapshot: json(current),
				managed: false,
				stage: "recorded",
				version: { increment: 1 },
				updatedBy: a.userId,
			},
		});
		if (n.count !== 1) throw new Error("Rinda mainīta piesaistes laikā");
		await tx.fimaWorkRevision.create({
			data: {
				recordId: id,
				version,
				actorId: a.userId,
				action: "link",
				snapshot: json(r),
			},
		});
		await tx.fimaBisOperation.updateMany({
			where: { recordId: id, status: "unknown" },
			data: { status: "reconciled", result: json(current) },
		});
	});
}

export async function inspectFimaBis(siteId: string, bisId: string) {
	await fimaAccess(siteId);
	if (!/^\d+$/.test(bisId)) throw new Error("Nederīgs BIS ID");
	const bis = await fimaBisClient(siteId);
	const result = await remote(bis, bisId);
	return { ...result, base: bis.base, caseId: bis.bisCaseId };
}
