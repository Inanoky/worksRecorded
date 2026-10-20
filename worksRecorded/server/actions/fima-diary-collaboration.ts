"use server";

import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { buildFimaExampleSourceWhere } from "@/flows/default-construction/backend/fima-example-sources";
import { fimaBisRecordNumber } from "@/lib/fima/bis-record-links";
import {
	appendFimaEvent,
	fimaMaterialSchema,
	fimaStatuses,
	fimaStatusSchema,
	isFimaDiary,
	parseBisRecordMaterials,
	readFimaCollaboration,
} from "@/lib/fima/diary-collaboration";
import { prisma } from "@/lib/utils/db";
import { requireUser } from "@/lib/utils/requireUser";
import {
	getBisBaseUrl,
	requireBisAccessTokenForSite,
} from "@/server/actions/BIS/service";
import { bisFetch } from "@/server/actions/BIS/TestBisEnv/relay";
import { orgCheck } from "@/server/actions/shared-actions";
import { getBisCaseAvailableMaterials } from "@/server/actions/site-diary-actions";

const scopeSchema = z.object({
	siteId: z.string().uuid(),
	recordId: z.string().min(1).max(128),
});
const mutationSchema = scopeSchema.extend({ requestId: z.string().uuid() }).and(
	z.discriminatedUnion("kind", [
		z.object({
			kind: z.literal("comment"),
			text: z.string().trim().min(1).max(4000),
		}),
		z.object({
			kind: z.literal("status"),
			status: fimaStatusSchema.nullable(),
			expectedVersion: z.number().int().nonnegative(),
		}),
		z.object({
			kind: z.literal("materials"),
			materials: z.array(fimaMaterialSchema).max(100),
			expectedVersion: z.number().int().nonnegative(),
		}),
	]),
);
async function requireScope(input: z.infer<typeof scopeSchema>) {
	const user = await requireUser();
	const allowed = await orgCheck(user.id, input.siteId);
	if (!allowed) throw new Error("Nav piekļuves projektam.");
	const [site, actor] = await Promise.all([
		prisma.site.findUnique({
			where: { id: input.siteId },
			select: {
				organizationId: true,
				siteDiaryRecordsMap: true,
				bisCaseId: true,
			},
		}),
		prisma.user.findUnique({
			where: { id: user.id },
			select: { firstName: true, lastName: true, email: true },
		}),
	]);
	if (!site || !isFimaDiary(site.siteDiaryRecordsMap))
		throw new Error("Sadarbības rīki šajā projektā nav ieslēgti.");
	const record = await prisma.sitediaryrecords.findFirst({
		where: {
			id: input.recordId,
			siteId: input.siteId,
			organizationId: site.organizationId,
			archivedAt: null,
		},
		select: { id: true, evalMetadata: true, BISId: true },
	});
	if (!record) throw new Error("Ieraksts nav pieejams šajā projektā.");
	return {
		user,
		site,
		record,
		actorName:
			[actor?.firstName, actor?.lastName].filter(Boolean).join(" ") ||
			actor?.email ||
			user.id,
	};
}
export async function getFimaDiaryCollaboration(
	args: z.input<typeof scopeSchema>,
) {
	const input = scopeSchema.parse(args);
	return readFimaCollaboration((await requireScope(input)).record.evalMetadata);
}
export async function getFimaExampleSource(
	args: z.input<typeof scopeSchema> & { bisId: string; sourceRecordId: string },
) {
	const input = scopeSchema
		.extend({
			bisId: z.string().regex(/^\d+$/).max(32),
			sourceRecordId: z.string().min(1).max(128),
		})
		.parse(args);
	const scope = await requireScope(input);
	const examples = readFimaCollaboration(scope.record.evalMetadata).examples;
	if (!examples?.entries.some((entry) => entry.id === input.bisId))
		throw new Error("BIS paraugs šim ierakstam nav pieejams.");
	if (!scope.site.organizationId) throw new Error("Nav piekļuves projektam.");
	const source = await prisma.sitediaryrecords.findFirst({
		where: {
			...buildFimaExampleSourceWhere(scope.site.organizationId, [input.bisId]),
			id: input.sourceRecordId,
		},
		select: {
			id: true,
			siteId: true,
			fimaNumber: true,
			Works: true,
			Works_Custom_1: true,
			Date: true,
			Location: true,
			originalUserComment: true,
			Site: { select: { name: true } },
		},
	});
	if (!source) throw new Error("KUCE avots vairs nav pieejams.");
	return source;
}
export async function getFimaAvailableMaterials(
	args: z.input<typeof scopeSchema>,
) {
	const input = scopeSchema.parse(args);
	await requireScope(input);
	return getBisCaseAvailableMaterials(input.siteId);
}
export async function saveFimaDiaryCollaboration(
	args: z.input<typeof mutationSchema>,
) {
	const input = mutationSchema.parse(args);
	const scope = await requireScope(input);
	if (
		input.kind === "materials" &&
		new Set(input.materials.map((m) => m.id)).size !== input.materials.length
	)
		throw new Error("Materiāls sarakstā atkārtojas.");
	if (input.kind === "materials" && input.materials.length) {
		const available = await getBisCaseAvailableMaterials(input.siteId);
		for (const material of input.materials) {
			const canonical = available.find((item) => item?.id === material.id);
			if (!canonical || material.quantity > canonical.availableQuantity)
				throw new Error(
					"Materiāls vai norādītais daudzums šajā BIS lietā vairs nav pieejams. Atjaunojiet materiālu sarakstu.",
				);
			material.label = canonical.label;
			material.unit = canonical.measurementUnit ?? "";
		}
	}
	const state = await prisma.$transaction(async (tx) => {
		const rows = await tx.$queryRaw<
			{ evalMetadata: Prisma.JsonValue }[]
		>`SELECT "evalMetadata" FROM "sitediaryrecords" WHERE id=${input.recordId} AND "siteId"=${input.siteId} AND "organizationId"=${scope.site.organizationId} AND "archivedAt" IS NULL FOR UPDATE`;
		if (rows.length !== 1) throw new Error("Ieraksts vairs nav pieejams.");
		const metadata = (rows[0].evalMetadata ?? {}) as Prisma.JsonObject;
		const current = readFimaCollaboration(metadata);
		const text =
			input.kind === "comment"
				? input.text
				: input.kind === "status"
					? `Rīcība: ${input.status ? fimaStatuses[input.status] : "Nav atzīmes"}`
					: `Sagatavotie materiāli: ${input.materials.map((m) => `${m.label} — ${m.quantity} ${m.unit}`).join("; ") || "nav"}`;
		const next = appendFimaEvent(
			current,
			{
				id: input.requestId,
				kind: input.kind,
				actorId: scope.user.id,
				actorName: scope.actorName,
				at: new Date().toISOString(),
				text,
				...(input.kind === "status"
					? { previousStatus: current.status, status: input.status }
					: {}),
			},
			input.kind === "status"
				? { status: input.status }
				: input.kind === "materials"
					? { materials: input.materials, materialsNote: null }
					: {},
			input.kind === "comment" ? undefined : input.expectedVersion,
		);
		await tx.sitediaryrecords.update({
			where: { id: input.recordId },
			data: {
				evalMetadata: {
					...metadata,
					fimaCollaboration: next,
				} as unknown as Prisma.InputJsonObject,
			},
		});
		return next;
	});
	revalidatePath(`/dashboard/sites/${input.siteId}/dashboard`);
	return state;
}
export async function refreshFimaBisMaterials(
	args: z.input<typeof scopeSchema>,
) {
	const input = scopeSchema.parse(args);
	const scope = await requireScope(input);
	const metadata = scope.record.evalMetadata as {
		kuceImport?: {
			bisLinks?: { id: string; caseId: string; number?: string | null }[];
		};
	} | null;
	const references = [...(metadata?.kuceImport?.bisLinks ?? [])];
	if (
		scope.record.BISId &&
		scope.site.bisCaseId &&
		!references.some((r) => r.id === scope.record.BISId)
	)
		references.push({ id: scope.record.BISId, caseId: scope.site.bisCaseId });
	if (!references.length) throw new Error("Ierakstam vēl nav BIS saites.");
	const accessible = await prisma.site.findMany({
		where: {
			organizationId: scope.site.organizationId,
			bisCaseId: { in: references.map((r) => r.caseId) },
		},
		select: { id: true, bisCaseId: true },
	});
	const entries = [];
	for (const ref of references) {
		const target = accessible.find((s) => s.bisCaseId === ref.caseId);
		if (!target || !/^\d+$/.test(ref.id))
			throw new Error("BIS atsauces lieta nav pieejama organizācijai.");
		const { accessToken } = await requireBisAccessTokenForSite(target.id);
		const base = getBisBaseUrl();
		const path = `${base}/bisp/api/portal/bis_cases/${ref.caseId}/logbook/performed_works/${ref.id}`;
		const get = async (url: string) => {
			const res = await bisFetch(base, url, {
				headers: {
					Authorization: `Bearer ${accessToken}`,
					Accept: "application/vnd.api+json",
				},
				cache: "no-store",
				signal: AbortSignal.timeout(30000),
			});
			if (!res.ok)
				throw new Error(
					`BIS materiālus nevar ielādēt (${res.status}). Saglabātie dati nav mainīti.`,
				);
			return res.json();
		};
		const [list, reference, recordData] = await Promise.all([
			get(`${path}/logbook_used_construction_materials`),
			get(`${path}/reference_data`),
			fimaBisRecordNumber(ref.number) ? Promise.resolve(null) : get(path),
		]);
		if (!Array.isArray(list.data) || list.links?.next)
			throw new Error("BIS atgrieza nepilnīgu materiālu sarakstu.");
		entries.push({
			bisId: ref.id,
			caseId: ref.caseId,
			number:
				fimaBisRecordNumber(recordData?.data?.attributes?.doc_number) ??
				fimaBisRecordNumber(ref.number),
			materials: parseBisRecordMaterials(list.data, reference),
		});
	}
	const snapshot = { fetchedAt: new Date().toISOString(), entries };
	await prisma.$executeRaw`UPDATE "sitediaryrecords" SET "evalMetadata"=jsonb_set(COALESCE("evalMetadata",'{}'::jsonb),'{fimaCollaboration}',COALESCE("evalMetadata"->'fimaCollaboration','{}'::jsonb)||jsonb_build_object('bisMaterials',${JSON.stringify(snapshot)}::jsonb),true) WHERE id=${input.recordId} AND "siteId"=${input.siteId} AND "organizationId"=${scope.site.organizationId} AND "archivedAt" IS NULL`;
	return getFimaDiaryCollaboration(input);
}
