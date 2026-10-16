import {
	createHash,
	randomBytes,
	randomUUID,
	timingSafeEqual,
} from "node:crypto";
import sharp from "sharp";
import { UTApi } from "uploadthing/server";
import { z } from "zod";
import { prisma } from "@/lib/utils/db";
import { getUploadThingFileUrl } from "@/lib/utils/uploadthing-file-url";
import { LIMENI_ORGANIZATION_ID } from "../lib/diary-photos";
import { VISUAL_DOCUMENT_TYPE } from "./model";
import { VISUAL_PLAN_TYPE } from "./planning-model";
import {
	isShareImageUrl,
	planningShareSchema,
	SHARE_MAX_IMAGE,
	shareTokenSchema,
	VISUAL_SHARE_TYPE,
} from "./planning-share-model";
import { serializeVisualPlan } from "./planning-store";
import { readSectionDrawing } from "./section-drawing-store";
import { loadVisualDrawing, requireVisualAccess } from "./store";

const hash = (value: string) => createHash("sha256").update(value).digest();
const publishInput = z.object({
	planId: z.string().uuid(),
	version: z.number().int().positive(),
	pages: z.array(z.number().int().min(1).max(10)).min(1).max(10),
});

export async function publishVisualPlanningShare(
	userId: string,
	siteId: string,
	input: unknown,
	files: File[],
) {
	const access = await requireVisualAccess(userId, siteId);
	const params = publishInput.parse(input);
	const row = await prisma.constructionPlan.findFirst({
		where: {
			id: params.planId,
			siteId,
			planType: VISUAL_PLAN_TYPE,
			version: params.version,
			archivedAt: null,
		},
	});
	if (!row || !row.visualDrawingId || row.geometryReviewRequired)
		throw new Error(
			"Plāns ir mainīts vai nav pieejams. Saglabājiet un pārbaudiet plānu.",
		);
	const plan = serializeVisualPlan(row);
	await loadVisualDrawing(userId, siteId, row.visualDrawingId);
	const expectedPages = [
		...new Set(plan.geometry.areas.map((area) => area.page)),
	].sort((a, b) => a - b);
	if (
		JSON.stringify(expectedPages) !== JSON.stringify(params.pages) ||
		files.length !== expectedPages.length
	)
		throw new Error("Trūkst plāna zonu attēlu.");
	const uploads: File[] = [];
	for (const [index, file] of files.entries()) {
		if (
			file.type !== "image/jpeg" ||
			file.size < 4 ||
			file.size > SHARE_MAX_IMAGE
		)
			throw new Error("Nederīgs zonas attēls.");
		const normalized = await sharp(Buffer.from(await file.arrayBuffer()), {
			limitInputPixels: 4_000_000,
		})
			.rotate()
			.jpeg({ quality: 85 })
			.toBuffer();
		if (normalized.length > 600_000)
			throw new Error("Zonas attēls ir pārāk liels.");
		uploads.push(
			new File(
				[new Uint8Array(normalized)],
				`work-${plan.id}-${expectedPages[index]}.jpg`,
				{ type: "image/jpeg" },
			),
		);
	}
	const imageMetadata: Array<{ page: number; section?: string }> =
		expectedPages.map((page) => ({ page }));
	if (plan.geometry.section) {
		const site = await prisma.site.findFirst({
			where: { id: siteId, organizationId: access.organizationId },
			select: { name: true },
		});
		const drawing = await readSectionDrawing(site?.name, plan.geometry.section);
		if (drawing) {
			const bytes = await sharp(drawing.bytes)
				.rotate()
				.jpeg({ quality: 85 })
				.toBuffer();
			if (bytes.length > 600_000)
				throw new Error("Sekcijas rasējums ir pārāk liels.");
			uploads.push(
				new File([new Uint8Array(bytes)], `section-${drawing.code}.jpg`, {
					type: "image/jpeg",
				}),
			);
			imageMetadata.push({ page: 11, section: drawing.code });
		}
	}
	const storage = new UTApi();
	const uploaded = await storage.uploadFiles(uploads, { concurrency: 2 });
	const keys = uploaded.flatMap((item) =>
		item.data?.key ? [item.data.key] : [],
	);
	try {
		if (uploaded.length !== imageMetadata.length)
			throw new Error("Trūkst kopīgoto attēlu.");
		const images = uploaded.map((item, index) => {
			const url = getUploadThingFileUrl(item.data);
			if (item.error || !item.data || !url || !isShareImageUrl(url))
				throw new Error("Neizdevās saglabāt zonas attēlu.");
			return { ...imageMetadata[index], url, key: item.data.key };
		});
		const id = randomUUID();
		const secret = randomBytes(32).toString("hex");
		const snapshot = planningShareSchema.parse({
			version: 1,
			tokenHash: hash(secret).toString("hex"),
			planId: plan.id,
			planVersion: plan.version,
			drawingId: row.visualDrawingId,
			work: plan.work,
			location: plan.location,
			section: plan.geometry.section ?? null,
			quantity: plan.quantity,
			unit: plan.unit,
			startDate: plan.startDate,
			endDate: plan.endDate,
			images,
		});
		await prisma.$transaction(
			async (tx) => {
				const current = await tx.constructionPlan.findFirst({
					where: {
						id: plan.id,
						siteId,
						planType: VISUAL_PLAN_TYPE,
						version: plan.version,
						visualDrawingId: row.visualDrawingId,
						archivedAt: null,
					},
				});
				if (!current)
					throw new Error(
						"Plāns sagatavošanas laikā mainīts. Mēģiniet vēlreiz.",
					);
				await tx.documents.create({
					data: {
						id,
						siteId,
						organizationId: access.organizationId,
						userId,
						documentType: VISUAL_SHARE_TYPE,
						documentName: "Kopīgots darba uzdevums",
						url: images[0].url,
						description: JSON.stringify(snapshot),
					},
				});
			},
			{ isolationLevel: "Serializable" },
		);
		return { token: `${id}.${secret}` };
	} catch (error) {
		if (keys.length) await storage.deleteFiles(keys).catch(() => undefined);
		throw error;
	}
}

export async function loadPublicVisualWork(token: string) {
	if (!shareTokenSchema.safeParse(token).success) return null;
	const [id, secret] = token.split(".");
	if (!z.string().uuid().safeParse(id).success) return null;
	const row = await prisma.documents.findFirst({
		where: {
			id,
			documentType: VISUAL_SHARE_TYPE,
			organizationId: LIMENI_ORGANIZATION_ID,
		},
	});
	if (!row || !row.siteId) return null;
	let parsed: ReturnType<typeof planningShareSchema.safeParse>;
	try {
		parsed = planningShareSchema.safeParse(JSON.parse(row.description));
	} catch {
		return null;
	}
	if (
		!parsed.success ||
		!timingSafeEqual(Buffer.from(parsed.data.tokenHash, "hex"), hash(secret))
	)
		return null;
	const snapshot = parsed.data;
	if (!snapshot.images.every((image) => isShareImageUrl(image.url)))
		return null;
	const [plan, drawing, site] = await Promise.all([
		prisma.constructionPlan.findFirst({
			where: {
				id: snapshot.planId,
				siteId: row.siteId,
				planType: VISUAL_PLAN_TYPE,
				archivedAt: null,
			},
			select: { id: true },
		}),
		prisma.documents.findFirst({
			where: {
				id: snapshot.drawingId,
				siteId: row.siteId,
				organizationId: LIMENI_ORGANIZATION_ID,
				documentType: VISUAL_DOCUMENT_TYPE,
			},
			select: { id: true },
		}),
		prisma.site.findFirst({
			where: { id: row.siteId, organizationId: LIMENI_ORGANIZATION_ID },
			select: { id: true },
		}),
	]);
	if (!plan || !drawing || !site) return null;
	return snapshot;
}

export async function revokeVisualPlanningShare(
	userId: string,
	siteId: string,
	token: string,
) {
	const access = await requireVisualAccess(userId, siteId);
	if (!shareTokenSchema.safeParse(token).success)
		throw new Error("Nederīga saite.");
	await prisma.documents.deleteMany({
		where: {
			id: token.split(".")[0],
			siteId,
			organizationId: access.organizationId,
			documentType: VISUAL_SHARE_TYPE,
		},
	});
}
