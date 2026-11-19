import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/utils/db";
import { isSuperUserId } from "@/lib/utils/super-user";
import { buildMaterialConsumption } from "./extract";
import {
	MATERIAL_CONSUMPTION_DOCUMENT_TYPE,
	materialObservationSchema,
	normalizeMaterialText,
} from "./model";

export const materialReviewSchema = z.object({
	version: z.literal(1),
	reviewedAt: z.string().datetime(),
	organizationId: z.string(),
	coverage: z.string(),
	projects: z
		.array(
			z.object({
				id: z.string(),
				name: z.string(),
				historical: z.boolean().optional(),
			}),
		)
		.default([]),
	observations: z.array(materialObservationSchema),
});

export const materialSourceSelect = {
	id: true,
	siteId: true,
	Date: true,
	Works: true,
	Comments: true,
	originalUserComment: true,
	Location: true,
	Photos: true,
	archivedAt: true,
	evalMetadata: true,
} satisfies Prisma.sitediaryrecordsSelect;

export function materialRecordsFingerprint(records: unknown[]) {
	function canonical(value: unknown): unknown {
		if (value instanceof Date) return value.toISOString();
		if (Array.isArray(value)) return value.map(canonical);
		if (value && typeof value === "object")
			return Object.fromEntries(
				Object.entries(value)
					.sort(([a], [b]) => a.localeCompare(b))
					.map(([key, item]) => [key, canonical(item)]),
			);
		return value;
	}
	const rows = records
		.map((value) => {
			const row = value as Record<string, unknown>;
			return { ...row, id: row.id, Photos: row.Photos ?? [] };
		})
		.sort((a, b) => String(a.id).localeCompare(String(b.id)));
	return createHash("sha256")
		.update(JSON.stringify(canonical(rows)))
		.digest("hex");
}

export async function saveReviewedMaterialConsumption(args: {
	userId: string;
	review: z.infer<typeof materialReviewSchema>;
	expectedFingerprint: string;
}) {
	const review = materialReviewSchema.parse(args.review);
	const description = JSON.stringify(review);
	const digest = createHash("sha256").update(description).digest("hex");
	const id = `material-consumption:${review.organizationId}:${digest}`;
	return prisma.$transaction(
		async (tx) => {
			const account = await tx.user.findUnique({
				where: { id: args.userId },
				select: { organizationId: true, status: true },
			});
			if (
				!account ||
				(account.status !== null && account.status !== "active") ||
				(account.organizationId !== review.organizationId &&
					!isSuperUserId(args.userId))
			)
				throw new Error("Material review access denied");
			const rows = await tx.sitediaryrecords.findMany({
				where: {
					organizationId: review.organizationId,
					Site: { organizationId: review.organizationId },
				},
				select: materialSourceSelect,
			});
			if (materialRecordsFingerprint(rows) !== args.expectedFingerprint)
				throw new Error(
					"Journal changed after material review; rebuild the review before saving",
				);
			const sites = await tx.site.findMany({
				where: { organizationId: review.organizationId },
				select: { id: true },
			});
			const allowed = new Set([
				...sites.map((site) => site.id),
				...review.projects
					.filter(
						(project) =>
							project.historical && project.id.startsWith("historical:"),
					)
					.map((project) => project.id),
			]);
			if (review.observations.some((entry) => !allowed.has(entry.siteId)))
				throw new Error(
					"Material review contains a project outside the organization",
				);
			const existing = await tx.documents.findFirst({
				where: { id, organizationId: review.organizationId },
				select: { id: true },
			});
			if (existing) return { id: existing.id, created: false };
			await tx.documents.create({
				data: {
					id,
					url: "",
					documentType: MATERIAL_CONSUMPTION_DOCUMENT_TYPE,
					documentName: "Materiālu patēriņa avotu pārbaude",
					description,
					organizationId: review.organizationId,
					siteId: null,
					userId: args.userId,
				},
			});
			return { id, created: true };
		},
		{ isolationLevel: "Serializable", timeout: 30_000 },
	);
}

export async function readMaterialConsumption(organizationId: string) {
	const [projects, records, documents] = await Promise.all([
		prisma.site.findMany({
			where: { organizationId },
			select: { id: true, name: true },
			orderBy: { name: "asc" },
		}),
		prisma.sitediaryrecords.findMany({
			where: { organizationId, Site: { organizationId } },
			select: materialSourceSelect,
			orderBy: [{ Date: "asc" }, { id: "asc" }],
		}),
		prisma.documents.findMany({
			where: {
				organizationId,
				siteId: null,
				documentType: MATERIAL_CONSUMPTION_DOCUMENT_TYPE,
			},
			orderBy: [{ createdAt: "desc" }, { id: "desc" }],
			take: 1,
			select: { description: true },
		}),
	]);
	let review: z.infer<typeof materialReviewSchema> | null = null;
	if (documents[0]) {
		try {
			const parsed = materialReviewSchema.safeParse(
				JSON.parse(documents[0].description),
			);
			if (parsed.success && parsed.data.organizationId === organizationId)
				review = parsed.data;
		} catch {}
	}
	const activeIds = new Set(
		records.filter((row) => !row.archivedAt).map((row) => row.id),
	);
	const remapped = new Map(
		(review?.projects ?? []).flatMap((project) => {
			const existing = projects.find(
				(site) =>
					normalizeMaterialText(site.name) ===
					normalizeMaterialText(project.name),
			);
			return existing ? [[project.id, existing.id] as const] : [];
		}),
	);
	const historical = (review?.projects ?? []).filter(
		(project) =>
			project.historical &&
			project.id.startsWith("historical:") &&
			!remapped.has(project.id),
	);
	const allProjects = [...projects, ...historical];
	const reviewed = review?.observations
		.filter(
			(entry) =>
				entry.recordIds.length === 0 ||
				entry.recordIds.some((id) => activeIds.has(id)),
		)
		.map((entry) => ({
			...entry,
			siteId: remapped.get(entry.siteId) ?? entry.siteId,
		}));
	return {
		projects: allProjects,
		entries: buildMaterialConsumption({
			records,
			projects: allProjects,
			reviewed,
		}),
		coverage:
			review?.coverage ??
			"Apkopoti būvdarbu žurnāla ziņojumi. Trūkstošie vai neskaidrie maisu skaiti norādīti pārbaudei.",
		reviewedAt: review?.reviewedAt ?? null,
		loadedAt: new Date().toISOString(),
	};
}
