"use server";

import { z } from "zod";
import { prisma } from "@/lib/utils/db";
import { requireUser } from "@/lib/utils/requireUser";
import { orgCheck } from "@/server/actions/shared-actions";
import {
	DIARY_FEEDBACK_DOMAINS,
	DIARY_FEEDBACK_MAX_PROMPT,
	type DiaryFeedbackDomain,
	type DiaryFeedbackSnapshot,
} from "../lib/diary-feedback";
import {
	assertDiaryFeedbackProject,
	hasRecentDiaryFeedbackActivity,
	refreshDiaryFeedback,
} from "./diary-feedback";

async function authorize(siteId: string) {
	z.string().uuid().parse(siteId);
	const user = await requireUser();
	if (!(await orgCheck(user.id, siteId)))
		throw new Error("Nav piekļuves projektam.");
	await assertDiaryFeedbackProject(siteId);
	return user;
}

export async function getConstructionDiaryFeedback(
	siteId: string,
	beforeRevision?: number,
	domain: DiaryFeedbackDomain = "diary",
) {
	z.enum(DIARY_FEEDBACK_DOMAINS).parse(domain);
	await authorize(siteId);
	if (beforeRevision !== undefined)
		z.number().int().positive().parse(beforeRevision);
	const state = await prisma.constructionDiaryFeedback.findUnique({
		where: { siteId_domain: { siteId, domain } },
	});
	const versions = await prisma.constructionDiaryFeedbackVersion.findMany({
		where: {
			siteId,
			domain,
			...(beforeRevision ? { revision: { lt: beforeRevision } } : {}),
		},
		orderBy: { revision: "desc" },
		take: 21,
	});
	const snapshot: DiaryFeedbackSnapshot = {
		revision: state?.revision || 0,
		generatedPrompt: state?.generatedPrompt || "",
		userInstructions: state?.userInstructions || "",
		sourceRecordCount: state?.sourceRecordCount || 0,
		checkedAt: state?.checkedAt?.toISOString() || null,
		updatedAt: state?.updatedAt?.toISOString() || null,
		busy: Boolean(state?.leaseUntil && state.leaseUntil.getTime() > Date.now()),
		active: await hasRecentDiaryFeedbackActivity(siteId, domain),
	};
	return {
		snapshot,
		history: versions.slice(0, 20).map((version) => ({
			...version,
			createdAt: version.createdAt.toISOString(),
		})),
		hasMore: versions.length > 20,
	};
}

export async function saveConstructionDiaryFeedback(args: {
	siteId: string;
	expectedRevision: number;
	userInstructions: string;
	domain?: DiaryFeedbackDomain;
}) {
	const input = z
		.object({
			siteId: z.string().uuid(),
			domain: z.enum(DIARY_FEEDBACK_DOMAINS).default("diary"),
			expectedRevision: z.number().int().nonnegative(),
			userInstructions: z.string().max(DIARY_FEEDBACK_MAX_PROMPT),
		})
		.parse(args);
	const user = await authorize(input.siteId);
	await prisma.constructionDiaryFeedback.upsert({
		where: { siteId_domain: { siteId: input.siteId, domain: input.domain } },
		create: { siteId: input.siteId, domain: input.domain },
		update: {},
	});
	await prisma.$transaction(async (tx) => {
		const state = await tx.constructionDiaryFeedback.findUniqueOrThrow({
			where: { siteId_domain: { siteId: input.siteId, domain: input.domain } },
		});
		const changed = await tx.constructionDiaryFeedback.updateMany({
			where: {
				siteId: input.siteId,
				domain: input.domain,
				revision: input.expectedRevision,
			},
			data: {
				userInstructions: input.userInstructions.trim(),
				revision: input.expectedRevision + 1,
				generationToken: null,
				leaseUntil: null,
				checkedAt: null,
				sourceFingerprint: null,
			},
		});
		if (!changed.count)
			throw new Error(
				"Palīgs ir mainīts citā logā. Ielādējiet jaunāko versiju un saglabājiet vēlreiz.",
			);
		await tx.constructionDiaryFeedbackVersion.create({
			data: {
				siteId: input.siteId,
				domain: input.domain,
				revision: input.expectedRevision + 1,
				kind: "manual",
				actorId: user.id,
				generatedPrompt: state.generatedPrompt,
				userInstructions: input.userInstructions.trim(),
				sourceFingerprint: state.sourceFingerprint,
				sourceRecordCount: state.sourceRecordCount,
			},
		});
	});
	return getConstructionDiaryFeedback(input.siteId, undefined, input.domain);
}

export async function restoreConstructionDiaryFeedback(args: {
	siteId: string;
	versionId: string;
	expectedRevision: number;
	domain?: DiaryFeedbackDomain;
}) {
	const input = z
		.object({
			siteId: z.string().uuid(),
			versionId: z.string().uuid(),
			domain: z.enum(DIARY_FEEDBACK_DOMAINS).default("diary"),
			expectedRevision: z.number().int().nonnegative(),
		})
		.parse(args);
	const user = await authorize(input.siteId);
	await prisma.$transaction(async (tx) => {
		const version = await tx.constructionDiaryFeedbackVersion.findFirst({
			where: {
				id: input.versionId,
				siteId: input.siteId,
				domain: input.domain,
			},
		});
		if (!version) throw new Error("Versija nav atrasta šajā projektā.");
		const data = {
			generatedPrompt: version.generatedPrompt,
			userInstructions: version.userInstructions,
			sourceFingerprint: version.sourceFingerprint,
			sourceRecordCount: version.sourceRecordCount,
			revision: input.expectedRevision + 1,
		};
		const changed = await tx.constructionDiaryFeedback.updateMany({
			where: {
				siteId: input.siteId,
				domain: input.domain,
				revision: input.expectedRevision,
			},
			data: {
				...data,
				checkedAt: null,
				generationToken: null,
				leaseUntil: null,
			},
		});
		if (!changed.count)
			throw new Error(
				"Palīgs ir mainīts citā logā. Ielādējiet jaunāko versiju un mēģiniet vēlreiz.",
			);
		await tx.constructionDiaryFeedbackVersion.create({
			data: {
				siteId: input.siteId,
				domain: input.domain,
				...data,
				kind: "restored",
				actorId: user.id,
			},
		});
	});
	return getConstructionDiaryFeedback(input.siteId, undefined, input.domain);
}

export async function refreshConstructionDiaryFeedback(
	siteId: string,
	domain: DiaryFeedbackDomain = "diary",
) {
	z.enum(DIARY_FEEDBACK_DOMAINS).parse(domain);
	const user = await authorize(siteId);
	const state = await prisma.constructionDiaryFeedback.findUnique({
		where: { siteId_domain: { siteId, domain } },
	});
	if (state?.checkedAt && Date.now() - state.checkedAt.getTime() < 60_000)
		throw new Error("Palīgs tikko atjaunots. Lūdzu, uzgaidiet vienu minūti.");
	const status = await refreshDiaryFeedback(siteId, true, user.id, domain);
	return {
		...(await getConstructionDiaryFeedback(siteId, undefined, domain)),
		status,
	};
}
