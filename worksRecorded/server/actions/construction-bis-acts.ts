"use server";

import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { requireConstructionProjectAccess } from "@/flows/default-construction/backend/construction-project-access";
import { bisActionResult } from "@/lib/bis/action-result";
import { BisClientError, bisClient } from "@/lib/bis/client";
import {
	buildDiaryActPayload,
	type DiaryActInput,
	type DiaryActPreparation,
	diaryActSchema,
} from "@/lib/bis/diary-act";
import { bisNumericId } from "@/lib/bis/diary-references";
import { prisma } from "@/lib/utils/db";

const selection = z
	.object({
		siteId: z.string().uuid(),
		recordIds: z.array(z.string().uuid()).min(1).max(30),
		kind: z.enum(["certificate", "covered"]),
	})
	.strict();
type Client = Awaited<ReturnType<typeof bisClient>>;
type Operation = {
	requestId: string;
	fingerprint: string;
	status: string;
	actorId: string;
	recordIds: string[];
	caseId: string;
	kind: "certificate" | "covered";
	createdAt: string;
	id?: string;
	url?: string;
	error?: string;
};
const hash = (value: unknown) =>
	createHash("sha256").update(JSON.stringify(value)).digest("hex");

async function prepare(
	client: Client,
	recordIds: string[],
	kind: "certificate" | "covered",
	loadPlans = true,
): Promise<DiaryActPreparation> {
	if (new Set(recordIds).size !== recordIds.length)
		throw new Error("Ieraksti atlasē atkārtojas.");
	const records = await prisma.sitediaryrecords.findMany({
		where: { id: { in: recordIds }, siteId: client.site.id, archivedAt: null },
		select: { id: true, BISId: true },
	});
	if (
		records.length !== recordIds.length ||
		records.some((record) => !record.BISId)
	)
		throw new Error("Aktam drīkst pievienot tikai šī projekta BIS ierakstus.");
	if (new Set(records.map((record) => record.BISId)).size !== records.length)
		throw new Error(
			"Atlasē ir vairāki ieraksti ar vienu BIS saiti. Atlasiet to tikai vienu reizi.",
		);
	const round = client.site.bisConstructionRoundId;
	const roundQuery = `case_construction_round_id=${round ?? ""}`;
	const [available, estimates, previousActs] = await Promise.all([
		client.list(
			`${kind === "covered" ? "available_accomplished_works" : "accomplished_works"}?${roundQuery}`,
		),
		client.list("estimate_positions"),
		kind === "covered" && loadPlans
			? client.list(`covered_works_acceptance_acts?${roundQuery}`)
			: Promise.resolve([]),
	]);
	for (const record of records) {
		bisNumericId(record.BISId!);
		const remote = available.find(
			(row) => String(row.id) === record.BISId && row.type === "performed_work",
		);
		if (
			!remote ||
			remote.attributes?.status !== "approved" ||
			String(remote.attributes?.case_construction_round_id ?? "") !==
				String(round ?? "")
		)
			throw new Error(
				`BIS ieraksts ${record.BISId} nav apstiprināts vai nav pieejams šajā kārtā. Atjaunojiet žurnālu.`,
			);
	}
	const works = [];
	const sortedRecords = records.sort((a, b) => a.id.localeCompare(b.id));
	for (let offset = 0; offset < sortedRecords.length; offset += 5) {
		works.push(
			...(await Promise.all(
				sortedRecords.slice(offset, offset + 5).map(async (record) => {
					const [remote, detail, linked, materials, pages] = await Promise.all([
						client.request(`performed_works/${record.BISId}`),
						client.request(`performed_works/${record.BISId}/detail`),
						client.list(`performed_works/${record.BISId}/estimate_positions`),
						kind === "covered"
							? client.list(
									`performed_works/${record.BISId}/logbook_used_construction_materials`,
								)
							: Promise.resolve([]),
						kind === "covered"
							? client.list(`performed_works/${record.BISId}/project_documents`)
							: Promise.resolve([]),
					]);
					const a = remote.data?.attributes;
					if (
						a?.status !== "approved" ||
						String(a?.case_construction_round_id ?? "") !== String(round ?? "")
					)
						throw new Error(
							`BIS ieraksts ${record.BISId} vairs nav apstiprināts.`,
						);
					const attributes = detail.data?.attributes;
					const quantity =
						attributes?.quantity == null || attributes.quantity === ""
							? Number.NaN
							: Number(attributes.quantity);
					if (!Number.isFinite(quantity) || quantity < 0)
						throw new Error(`BIS ierakstam ${record.BISId} nav derīga apjoma.`);
					return {
						recordId: record.id,
						bisId: record.BISId!,
						description: String(a.description ?? record.BISId),
						date: String(a.event_date ?? ""),
						quantity,
						measurement: String(attributes?.measurement ?? ""),
						estimateId: String(linked[0]?.id ?? ""),
						...(kind === "covered"
							? {
									materialUses: materials
										.map((row) => ({
											id: String(
												row.attributes?.construction_material_id ?? "",
											),
											quantity:
												row.attributes?.quantity == null
													? Number.NaN
													: Number(row.attributes.quantity),
										}))
										.sort((a, b) => a.id.localeCompare(b.id)),
									projectPageIds: pages.map((row) => String(row.id)).sort(),
								}
							: {}),
					};
				}),
			)),
		);
	}
	const recentActs = previousActs
		.sort((a, b) =>
			String(b.attributes?.event_date ?? "").localeCompare(
				String(a.attributes?.event_date ?? ""),
			),
		)
		.slice(0, 20);
	const details: any[] = [];
	for (let offset = 0; offset < recentActs.length; offset += 5) {
		details.push(
			...(await Promise.all(
				recentActs
					.slice(offset, offset + 5)
					.map((act) =>
						client.request(
							`covered_works_acceptance_acts/${bisNumericId(String(act.id))}/detail`,
						),
					),
			)),
		);
	}
	const plans = [
		...new Map(
			details
				.filter((detail) => detail.data?.attributes?.logbook_case_act_id)
				.map((detail) => {
					const a = detail.data.attributes;
					return [
						String(a.logbook_case_act_id),
						{
							id: String(a.logbook_case_act_id),
							label: String(a.name || a.logbook_case_act_id),
						},
					] as const;
				}),
		).values(),
	];
	const scopedEstimates = estimates
		.filter((row) => {
			const a = row.attributes ?? {};
			const rounds = a.related_case_construction_round_ids ?? [];
			return (
				a.type === "element" &&
				(round == null ||
					(a.case_construction_round_id == null && rounds.length === 0) ||
					String(a.case_construction_round_id) === String(round) ||
					rounds.some((id: unknown) => String(id) === String(round)))
			);
		})
		.map((row) => ({
			id: String(row.id),
			label: [row.attributes.position_number, row.attributes.description]
				.filter(Boolean)
				.join(" · "),
			number: String(row.attributes.position_number ?? ""),
			description: String(row.attributes.description ?? ""),
			quantity:
				row.attributes.quantity == null
					? null
					: String(row.attributes.quantity),
			measure:
				row.attributes.measure == null ? null : String(row.attributes.measure),
		}));
	return {
		works,
		estimates: scopedEstimates,
		plans,
		revision: hash([client.bisCaseId, round, works, scopedEstimates]),
	};
}

export async function prepareConstructionBisAct(
	input: z.infer<typeof selection>,
) {
	const value = selection.parse(input);
	const client = await bisClient(value.siteId);
	await requireConstructionProjectAccess(client.userId, value.siteId);
	return prepare(client, value.recordIds, value.kind);
}

async function updateOperations<T>(
	siteId: string,
	update: (operations: Operation[]) => { operations: Operation[]; result: T },
) {
	return prisma.$transaction(async (tx) => {
		const rows = await tx.$queryRaw<
			{ siteDiaryRecordsMap: Record<string, any> | null }[]
		>`SELECT "siteDiaryRecordsMap" FROM public."Site" WHERE id=${siteId} FOR UPDATE`;
		if (!rows[0]) throw new Error("Projekts nav atrasts.");
		const config = rows[0].siteDiaryRecordsMap ?? {};
		const settings = config.otherSettings ?? {};
		const operations: Operation[] = Array.isArray(
			settings.bisDiaryActOperations,
		)
			? settings.bisDiaryActOperations
			: [];
		const next = update(operations);
		if (next.operations !== operations)
			await tx.site.update({
				where: { id: siteId },
				data: {
					siteDiaryRecordsMap: {
						...config,
						otherSettings: {
							...settings,
							bisDiaryActOperations: next.operations,
						},
					} as unknown as Prisma.InputJsonValue,
				},
			});
		return next.result;
	});
}

export async function createConstructionBisAct(input: DiaryActInput) {
	const parsed = diaryActSchema.safeParse(input);
	if (!parsed.success)
		throw new Error(
			parsed.error.issues[0]?.message ?? "Pārbaudiet akta datus.",
		);
	const value = parsed.data;
	const client = await bisClient(value.siteId);
	await requireConstructionProjectAccess(client.userId, value.siteId);
	const { requestId, revision, ...intent } = value;
	const fingerprint = hash([
		client.bisCaseId,
		client.site.bisConstructionRoundId,
		{
			...intent,
			eventTime: undefined,
			recordIds: [...intent.recordIds].sort(),
		},
	]);
	const existing = await updateOperations(value.siteId, (operations) => ({
		operations,
		result: operations.find(
			(operation) =>
				operation.requestId === requestId ||
				operation.fingerprint === fingerprint,
		),
	}));
	if (
		existing?.requestId === requestId &&
		existing.fingerprint !== fingerprint &&
		existing.status !== "failed"
	)
		throw new Error(
			"Pieprasījuma dati mainīti. Atveriet akta izveidi no jauna.",
		);
	if (existing?.status === "complete")
		return { id: existing.id!, url: existing.url! };
	if (existing && existing.status !== "failed")
		throw new Error(
			"Iepriekšējais akta izveides pieprasījums vēl nav apstiprināts. Pirms atkārtotas izveides pārbaudiet BIS aktu sarakstu.",
		);
	const preparation = await prepare(client, value.recordIds, value.kind, false);
	if (revision !== preparation.revision)
		throw new Error(
			"BIS dati mainījušies. Aizveriet logu un pārskatiet aktu no jauna.",
		);
	const payload = buildDiaryActPayload(
		value,
		preparation,
		client.site.bisConstructionRoundId,
	);
	const operation: Operation = {
		requestId,
		fingerprint,
		status: "executing",
		actorId: client.userId,
		recordIds: value.recordIds,
		caseId: client.bisCaseId,
		kind: value.kind,
		createdAt: new Date().toISOString(),
	};
	await updateOperations(value.siteId, (operations) => {
		if (
			operations.some(
				(old) =>
					((old.fingerprint === fingerprint || old.requestId === requestId) &&
						old.status !== "failed") ||
					(old.caseId === client.bisCaseId &&
						old.kind === value.kind &&
						["executing", "unknown"].includes(old.status) &&
						old.recordIds.some((id) => value.recordIds.includes(id))),
			)
		)
			throw new Error("Akta izveide jau sākta. Pārbaudiet BIS aktu sarakstu.");
		return {
			operations: [
				...operations.filter((old) => old.requestId !== requestId),
				operation,
			],
			result: null,
		};
	});
	const collection =
		value.kind === "covered"
			? "covered_works_acceptance_acts"
			: "accomplished_work_certificates";
	let result: { id: string; url: string };
	try {
		const remote = await client.request(collection, "POST", payload);
		const id = String(remote?.data?.id ?? "");
		bisNumericId(id);
		result = {
			id,
			url: `${client.base}/bisp/lv/portal/logbooks/${collection}/${id}/edit`,
		};
	} catch (error) {
		const failed =
			error instanceof BisClientError &&
			[400, 401, 403, 404, 422].includes(error.status);
		await updateOperations(value.siteId, (operations) => ({
			operations: operations.map((old) =>
				old.requestId === requestId
					? {
							...old,
							status: failed ? "failed" : "unknown",
							error: error instanceof Error ? error.message : "BIS kļūda",
						}
					: old,
			),
			result: null,
		}));
		if (failed) throw error;
		throw new Error(
			"BIS neatgrieza drošu akta izveides apstiprinājumu. Pirms atkārtotas izveides pārbaudiet BIS aktu sarakstu.",
		);
	}
	try {
		await updateOperations(value.siteId, (operations) => ({
			operations: operations.map((old) =>
				old.requestId === requestId
					? { ...old, status: "complete", ...result }
					: old,
			),
			result: null,
		}));
	} catch {
		return {
			...result,
			warning:
				"Akts izveidots BIS, taču vietējo vēsturi neizdevās atjaunot. Neveidojiet aktu atkārtoti.",
		};
	}
	return result;
}

export async function reviewConstructionBisAct(
	input: z.infer<typeof selection>,
) {
	return bisActionResult(() => prepareConstructionBisAct(input));
}
export async function submitConstructionBisAct(input: DiaryActInput) {
	return bisActionResult(() => createConstructionBisAct(input));
}
