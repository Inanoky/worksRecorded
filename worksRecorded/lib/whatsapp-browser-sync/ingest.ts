import { Prisma } from "@prisma/client";
import defaultConfigLV from "@/components/sitediary/configs/defaultConfigLV_27042026.json";
import { enableDefaultConstructionQuantityProfile } from "@/flows/default-construction/lib/quantity-plan-actual";
import { defaultProgram } from "@/lib/utils/DefaultProgram";
import { prisma } from "@/lib/utils/db";
import { type BrowserDiaryParser, createBrowserDiaryParser } from "./parser";
import {
	averageThicknessMm,
	calculateActualArea,
	chooseExistingProject,
	chooseExistingWork,
	getWorkConfiguration,
} from "./rules";
import type { BrowserDiaryEntry, BrowserWhatsappIngest } from "./schema";

const SITE_DIARY_MEDIA_PURPOSE = "site_diary";

class BrowserSyncNeedsReviewError extends Error {}

function dateAtNoonUtc(date: string | null, fallback: Date) {
	const fallbackDate = fallback.toISOString().slice(0, 10);
	const value = date ?? fallbackDate;
	return new Date(`${value}T12:00:00.000Z`);
}

function formatLatvianTimestamp(value: Date) {
	const date = new Intl.DateTimeFormat("lv-LV", {
		timeZone: "Europe/Riga",
		day: "numeric",
		month: "2-digit",
		year: "numeric",
	}).format(value);
	const time = new Intl.DateTimeFormat("lv-LV", {
		timeZone: "Europe/Riga",
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
	}).format(value);
	return { date, time };
}

export function formatBrowserOriginalComment(payload: BrowserWhatsappIngest) {
	return payload.sourceMessages
		.map((message) => {
			const sentAt = new Date(message.sentAt);
			const { date, time } = formatLatvianTimestamp(sentAt);
			const phone = message.senderPhone ? ` ${message.senderPhone}` : "";
			const mediaSuffix =
				message.attachmentIndexes.length > 0
					? `\n[${message.attachmentIndexes.length} attēls/i]`
					: "";
			return `${message.senderName} : [${time}, ${date}]${phone}: ${message.text}${mediaSuffix}`;
		})
		.join("\n\n");
}

function averageSentAt(payload: BrowserWhatsappIngest) {
	const first = payload.sourceMessages[0];
	return first ? new Date(first.sentAt) : new Date();
}

function attachmentUrlsForEntry(
	entry: BrowserDiaryEntry,
	payload: BrowserWhatsappIngest,
) {
	const requested = entry.attachmentIndexes
		.map((index) => payload.attachments[index]?.url)
		.filter((url): url is string => Boolean(url));
	if (requested.length > 0) return [...new Set(requested)];
	if (payload.sourceMessages.length === 1) {
		return [
			...new Set(payload.attachments.map((attachment) => attachment.url)),
		];
	}
	return [];
}

function buildComments(args: {
	entry: BrowserDiaryEntry;
	actualArea: number | null;
	selectedWork: string | null;
}) {
	const { entry, actualArea, selectedWork } = args;
	const details = [entry.workText];
	if (entry.plannedAreaM2 != null)
		details.push(`Plāns: ${entry.plannedAreaM2} m².`);
	if (entry.bagCount != null) details.push(`Maisi: ${entry.bagCount}.`);
	const thickness = averageThicknessMm(entry);
	if (thickness != null) details.push(`Vidējais biezums: ${thickness} mm.`);
	if (actualArea != null) details.push(`Fakts: ${actualArea} m².`);
	if (selectedWork) details.push(`Darba likme: ${selectedWork}.`);
	if (entry.notes) details.push(entry.notes);
	return details.join(" ");
}

async function ensureSite(args: {
	tx: Prisma.TransactionClient;
	organizationId: string;
	requestedName: string;
	userId: string;
}) {
	const projects = await args.tx.site.findMany({
		where: { organizationId: args.organizationId },
		select: {
			id: true,
			name: true,
			description: true,
			siteDiaryRecordsMap: true,
		},
	});
	const existing = chooseExistingProject(args.requestedName, projects);
	if (existing) return { ...existing, created: false };

	const created = await args.tx.site.create({
		data: {
			name: args.requestedName,
			description: args.requestedName,
			subdirectory: args.requestedName,
			userId: args.userId,
			organizationId: args.organizationId,
			siteDiaryRecordsMap: enableDefaultConstructionQuantityProfile(
				structuredClone(defaultConfigLV),
			) as Prisma.InputJsonValue,
			sitediarysettings: {
				create: {
					userId: args.userId,
					organizationId: args.organizationId,
					schema: JSON.stringify(defaultProgram),
				},
			},
		},
		select: {
			id: true,
			name: true,
			description: true,
			siteDiaryRecordsMap: true,
		},
	});
	return { ...created, created: true };
}

async function ensureGalleryPhotos(args: {
	tx: Prisma.TransactionClient;
	organizationId: string;
	siteId: string;
	userId: string;
	date: Date;
	urls: string[];
	comment: string;
}) {
	const dayStart = new Date(args.date);
	dayStart.setUTCHours(0, 0, 0, 0);
	const dayEnd = new Date(dayStart);
	dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

	for (const url of args.urls) {
		const existing = await args.tx.photos.findFirst({
			where: {
				siteId: args.siteId,
				mediaPurpose: SITE_DIARY_MEDIA_PURPOSE,
				Date: { gte: dayStart, lt: dayEnd },
				OR: [{ URL: url }, { fileUrl: url }],
			},
			select: { id: true },
		});
		if (existing) continue;
		await args.tx.photos.create({
			data: {
				Date: args.date,
				URL: url,
				fileUrl: url,
				mediaPurpose: SITE_DIARY_MEDIA_PURPOSE,
				Comment: args.comment,
				Location: null,
				userId: args.userId,
				workerId: null,
				siteId: args.siteId,
				organizationId: args.organizationId,
			},
		});
	}
}

export type BrowserWhatsappIngestResult = {
	status: "created" | "duplicate" | "needs_review";
	recordIds: string[];
	projectIds: string[];
	createdProjectIds: string[];
	ambiguity: string | null;
};

export async function ingestBrowserWhatsappMessage(
	payload: BrowserWhatsappIngest,
	parser: BrowserDiaryParser = createBrowserDiaryParser(),
): Promise<BrowserWhatsappIngestResult> {
	const storedPayload = JSON.parse(
		JSON.stringify(payload),
	) as Prisma.InputJsonValue;
	const claimed = await prisma.whatsappBrowserMessage
		.create({
			data: {
				idempotencyKey: payload.idempotencyKey,
				organizationId: payload.organizationId,
				groupName: payload.groupName,
				senderName: payload.sourceMessages[0]?.senderName ?? null,
				senderPhone: payload.sourceMessages[0]?.senderPhone ?? null,
				sentAt: averageSentAt(payload),
				rawText: payload.sourceMessages
					.map((message) => message.text)
					.join("\n\n"),
				payload: storedPayload,
				status: "processing",
			},
			select: { id: true },
		})
		.catch(async (error) => {
			if (
				!(error instanceof Prisma.PrismaClientKnownRequestError) ||
				error.code !== "P2002"
			) {
				throw error;
			}
			const existing = await prisma.whatsappBrowserMessage.findUniqueOrThrow({
				where: { idempotencyKey: payload.idempotencyKey },
				select: { id: true, status: true, updatedAt: true },
			});
			const staleBefore = new Date(Date.now() - 30 * 60 * 1_000);
			const retryable =
				existing.status === "failed" ||
				(existing.status === "processing" && existing.updatedAt < staleBefore);
			if (!retryable) return null;
			const reclaimed = await prisma.whatsappBrowserMessage.updateMany({
				where: {
					id: existing.id,
					OR: [
						{ status: "failed" },
						{ status: "processing", updatedAt: { lt: staleBefore } },
					],
				},
				data: {
					status: "processing",
					payload: storedPayload,
					lastError: null,
					completedAt: null,
				},
			});
			return reclaimed.count === 1 ? { id: existing.id } : null;
		});

	if (!claimed) {
		const existing = await prisma.whatsappBrowserMessage.findUniqueOrThrow({
			where: { idempotencyKey: payload.idempotencyKey },
			select: { recordIds: true, projectIds: true, ambiguity: true },
		});
		return {
			status: "duplicate",
			recordIds: existing.recordIds,
			projectIds: existing.projectIds,
			createdProjectIds: [],
			ambiguity: existing.ambiguity,
		};
	}

	try {
		const [projects, user] = await Promise.all([
			prisma.site.findMany({
				where: { organizationId: payload.organizationId },
				select: { name: true },
				orderBy: { name: "asc" },
			}),
			prisma.user.findFirst({
				where: { organizationId: payload.organizationId },
				select: { id: true },
				orderBy: { createdAt: "asc" },
			}),
		]);
		if (!user)
			throw new Error("Organization has no user available for diary ownership");

		const originalUserComment = formatBrowserOriginalComment(payload);
		const existingRecords = await prisma.sitediaryrecords.findMany({
			where: {
				organizationId: payload.organizationId,
				originalUserComment,
			},
			select: { id: true, siteId: true },
		});
		if (existingRecords.length > 0) {
			const projectIds = [
				...new Set(
					existingRecords
						.map((record) => record.siteId)
						.filter((siteId): siteId is string => Boolean(siteId)),
				),
			];
			const recordIds = existingRecords.map((record) => record.id);
			await prisma.whatsappBrowserMessage.update({
				where: { id: claimed.id },
				data: {
					status: "completed",
					recordIds,
					projectIds,
					completedAt: new Date(),
				},
			});
			return {
				status: "duplicate",
				recordIds,
				projectIds,
				createdProjectIds: [],
				ambiguity: null,
			};
		}

		const extraction = await parser({
			payload,
			projectNames: projects.map((project) => project.name),
		});
		if (extraction.entries.length === 0) {
			await prisma.whatsappBrowserMessage.update({
				where: { id: claimed.id },
				data: {
					status: "needs_review",
					ambiguity: extraction.ambiguity ?? "No diary entries were extracted",
					completedAt: new Date(),
				},
			});
			return {
				status: "needs_review",
				recordIds: [],
				projectIds: [],
				createdProjectIds: [],
				ambiguity: extraction.ambiguity ?? "No diary entries were extracted",
			};
		}

		const transactionResult = await prisma.$transaction(async (tx) => {
			const recordIds: string[] = [];
			const projectIds = new Set<string>();
			const createdProjectIds = new Set<string>();

			for (const entry of extraction.entries) {
				const site = await ensureSite({
					tx,
					organizationId: payload.organizationId,
					requestedName: entry.projectName,
					userId: user.id,
				});
				projectIds.add(site.id);
				if (site.created) createdProjectIds.add(site.id);

				const configuration = getWorkConfiguration(site.siteDiaryRecordsMap);
				const selectedWork = chooseExistingWork(entry, configuration);
				if (!selectedWork) {
					throw new BrowserSyncNeedsReviewError(
						`Project ${site.name} has no matching existing work position for: ${entry.workText}`,
					);
				}
				const actualArea = calculateActualArea({
					entry,
					projectName: site.name,
					selectedWork,
				});
				const date = dateAtNoonUtc(entry.workDate, averageSentAt(payload));
				const photoUrls = attachmentUrlsForEntry(entry, payload);
				const record = await tx.sitediaryrecords.create({
					data: {
						userId: user.id,
						siteId: site.id,
						organizationId: payload.organizationId,
						Date: date,
						Location: entry.location,
						Works: selectedWork,
						Units:
							entry.plannedAreaM2 != null || actualArea != null ? "m2" : null,
						Amounts: entry.plannedAreaM2,
						Comments_Custom_1: actualArea == null ? null : String(actualArea),
						WorkersInvolved: entry.workerCount,
						TimeInvolved: entry.hours,
						Comments: buildComments({ entry, actualArea, selectedWork }),
						originalUserComment,
						Photos: photoUrls,
					},
					select: { id: true },
				});
				recordIds.push(record.id);

				await ensureGalleryPhotos({
					tx,
					organizationId: payload.organizationId,
					siteId: site.id,
					userId: user.id,
					date,
					urls: photoUrls,
					comment: originalUserComment,
				});
			}

			return {
				recordIds,
				projectIds: [...projectIds],
				createdProjectIds: [...createdProjectIds],
			};
		});

		await prisma.whatsappBrowserMessage.update({
			where: { id: claimed.id },
			data: {
				status: extraction.ambiguity ? "completed_with_warning" : "completed",
				recordIds: transactionResult.recordIds,
				projectIds: transactionResult.projectIds,
				ambiguity: extraction.ambiguity,
				completedAt: new Date(),
				lastError: null,
			},
		});

		return {
			status: "created",
			...transactionResult,
			ambiguity: extraction.ambiguity,
		};
	} catch (error) {
		if (error instanceof BrowserSyncNeedsReviewError) {
			await prisma.whatsappBrowserMessage.update({
				where: { id: claimed.id },
				data: {
					status: "needs_review",
					ambiguity: error.message,
					completedAt: new Date(),
				},
			});
			return {
				status: "needs_review",
				recordIds: [],
				projectIds: [],
				createdProjectIds: [],
				ambiguity: error.message,
			};
		}
		await prisma.whatsappBrowserMessage.update({
			where: { id: claimed.id },
			data: {
				status: "failed",
				lastError: String(error instanceof Error ? error.message : error).slice(
					0,
					2_000,
				),
				completedAt: new Date(),
			},
		});
		throw error;
	}
}
