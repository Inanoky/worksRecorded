"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
	loadFimaActRecords,
	loadFimaActSites,
	loadFimaActs,
	lockFimaActSite,
	saveFimaActRegister,
} from "@/flows/default-construction/backend/fima-acts";
import {
	actChoices,
	actKey,
	allocateFimaActNumbers,
	fimaActReferenceSchema,
	readFimaActRegister,
	readTrackedFimaActs,
} from "@/lib/fima/act-register";
import {
	fimaStatuses,
	fimaStatusSchema,
	isFimaDiary,
} from "@/lib/fima/diary-collaboration";
import { prisma } from "@/lib/utils/db";
import { requireUser } from "@/lib/utils/requireUser";
import { orgCheck } from "@/server/actions/shared-actions";

const scopeSchema = z.object({ siteId: z.string().uuid() });
const mutationSchema = scopeSchema
	.extend({
		collection: z.string().regex(/^[a-z][a-z_]*_acts$/),
		id: z.string().regex(/^\d+$/),
		expectedRevision: z.number().int().nonnegative(),
		requestId: z.string().uuid(),
	})
	.and(
		z.discriminatedUnion("kind", [
			z.object({
				kind: z.literal("examples"),
				examples: z.array(fimaActReferenceSchema).max(20),
			}),
			z.object({
				kind: z.literal("comment"),
				text: z.string().trim().min(1).max(4000),
			}),
			z.object({
				kind: z.literal("status"),
				status: fimaStatusSchema.nullable(),
			}),
		]),
	);
async function requireScope(siteId: string) {
	const user = await requireUser();
	const allowed = await orgCheck(user.id, siteId);
	if (!allowed || !allowed.organizationId)
		throw new Error("Nav piekļuves projektam.");
	const site = await prisma.site.findFirst({
		where: { id: siteId, organizationId: allowed.organizationId },
		select: { bisCaseId: true, siteDiaryRecordsMap: true },
	});
	if (!site?.bisCaseId || !isFimaDiary(site.siteDiaryRecordsMap))
		throw new Error("FIMA akti šajā projektā nav pieejami.");
	return {
		user,
		organizationId: allowed.organizationId,
		caseId: site.bisCaseId,
		config: site.siteDiaryRecordsMap,
	};
}
export async function getFimaActsForSite(siteId: string) {
	scopeSchema.parse({ siteId });
	const scope = await requireScope(siteId);
	const data = await loadFimaActs(scope.organizationId, siteId, {
		assignNumbers: true,
	});
	if (!data) throw new Error("FIMA akti šajā projektā nav pieejami.");
	return data;
}
export async function getFimaActSetting(args: {
	siteId: string;
	collection: string;
	id: string;
}) {
	const input = scopeSchema
		.extend({
			collection: z.string().regex(/^[a-z][a-z_]*_acts$/),
			id: z.string().regex(/^\d+$/),
		})
		.parse(args);
	const scope = await requireScope(input.siteId);
	const setting = readFimaActRegister(scope.config).entries[
		actKey(input.collection, input.id)
	];
	if (!setting) throw new Error("Akts nav pieejams.");
	return setting;
}
export async function getFimaActReferenceDetail(args: {
	siteId: string;
	reference: z.input<typeof fimaActReferenceSchema>;
}) {
	const input = scopeSchema
		.extend({ reference: fimaActReferenceSchema })
		.parse(args);
	const scope = await requireScope(input.siteId);
	const source = await prisma.site.findFirst({
		where: {
			id: input.reference.siteId,
			organizationId: scope.organizationId,
			bisCaseId: input.reference.caseId,
		},
		select: { siteDiaryRecordsMap: true },
	});
	if (!source || !isFimaDiary(source.siteDiaryRecordsMap))
		throw new Error("Parauga akts nav pieejams.");
	const data = await loadFimaActs(scope.organizationId, input.reference.siteId);
	const row = data?.rows.find(
		(act) =>
			act.collection === input.reference.collection &&
			act.id === input.reference.id,
	);
	if (!row) throw new Error("Parauga akts nav pieejams.");
	return row;
}
export async function saveFimaActSettings(
	args: z.input<typeof mutationSchema>,
) {
	const input = mutationSchema.parse(args);
	const scope = await requireScope(input.siteId);
	const actor = await prisma.user.findUnique({
		where: { id: scope.user.id },
		select: { firstName: true, lastName: true, email: true },
	});
	const actorName =
		[actor?.firstName, actor?.lastName].filter(Boolean).join(" ") ||
		actor?.email ||
		scope.user.id;
	const result = await prisma.$transaction(async (db) => {
		const site = await lockFimaActSite(db, scope.organizationId, input.siteId);
		if (site.bisCaseId !== scope.caseId)
			throw new Error("Projekta BIS lieta ir mainīta. Atjaunojiet datus.");
		const records = await loadFimaActRecords(
			db,
			scope.organizationId,
			input.siteId,
		);
		const acts = readTrackedFimaActs(site, records);
		const key = actKey(input.collection, input.id);
		if (!acts.some((act) => act.key === key))
			throw new Error("Akts šajā projektā nav pieejams.");
		const register = allocateFimaActNumbers(
			readFimaActRegister(site.config),
			acts.map((act) => act.key),
		);
		const current = register.entries[key];
		if (current.history.some((event) => event.requestId === input.requestId))
			return current;
		if (current.revision !== input.expectedRevision)
			throw new Error(
				"Akts ir mainīts. Atjaunojiet datus un mēģiniet vēlreiz.",
			);
		let examples = current.examples;
		let text = input.kind === "comment" ? input.text : "";
		if (input.kind === "status")
			text = `${current.status ? fimaStatuses[current.status] : "Nav atzīmes"} → ${input.status ? fimaStatuses[input.status] : "Nav atzīmes"}`;
		if (input.kind === "examples") {
			const sites = await loadFimaActSites(db, scope.organizationId);
			const choices = sites.flatMap((source) =>
				actChoices(
					source,
					source.id === site.id ? acts : readTrackedFimaActs(source),
				),
			);
			examples = input.examples.filter(
				(reference, index, array) =>
					array.findIndex(
						(item) =>
							item.siteId === reference.siteId &&
							item.collection === reference.collection &&
							item.id === reference.id,
					) === index,
			);
			const selected = examples.map((reference) =>
				choices.find(
					(choice) =>
						choice.siteId === reference.siteId &&
						choice.caseId === reference.caseId &&
						choice.collection === reference.collection &&
						choice.id === reference.id,
				),
			);
			if (
				selected.some(
					(choice) =>
						!choice ||
						!["approved", "approving"].includes(choice.status) ||
						(choice.siteId === site.id &&
							actKey(choice.collection, choice.id) === key),
				)
			)
				throw new Error(
					"Izvēlieties pieejamu apstiprinātu vai apstiprināšanā esošu parauga aktu.",
				);
			text = selected.length
				? selected
						.map((choice) => choice?.number || `BIS ${choice?.id}`)
						.join("; ")
				: "Bez parauga";
		}
		const next = {
			...current,
			...(input.kind === "status" ? { status: input.status } : {}),
			revision: current.revision + 1,
			examples,
			history: [
				...current.history,
				{
					id: crypto.randomUUID(),
					requestId: input.requestId,
					kind: input.kind,
					text,
					at: new Date().toISOString(),
					actorId: scope.user.id,
					actorName,
				},
			],
		};
		register.entries[key] = next;
		await saveFimaActRegister(db, scope.organizationId, input.siteId, register);
		return next;
	});
	revalidatePath(`/dashboard/sites/${input.siteId}/acts`);
	return result;
}
