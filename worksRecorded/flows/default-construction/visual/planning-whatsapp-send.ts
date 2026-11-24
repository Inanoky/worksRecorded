import { createHash, randomUUID } from "node:crypto";
import { setTimeout as sleep } from "node:timers/promises";
import sharp from "sharp";
import { z } from "zod";
import { prisma } from "@/lib/utils/db";
import { getMetaGraphBaseUrl } from "@/lib/utils/whatsapp-helpers/meta/config";
import { normalizeMetaPhone } from "@/lib/utils/whatsapp-helpers/meta/sender";
import {
	getWhatsAppBusinessToken,
	VISUAL_WORK_TASK_PURPOSE,
} from "@/lib/whatsapp-business-numbers";
import { VISUAL_PLAN_TYPE, visualPlanAreasSchema } from "./planning-model";
import {
	normalizePlanningWhatsAppMessage,
	normalizePlanningWhatsAppTemplateText,
	PLANNING_WHATSAPP_MESSAGE_LIMIT,
	planningWhatsAppMessageWithReportingNote,
} from "./planning-whatsapp";
import {
	LIMENI_TASK_TEMPLATE,
	planningWhatsAppTemplateContent,
} from "./planning-whatsapp-templates";
import { requireVisualAccess } from "./store";
import {
	readWasenderMessageStatus,
	readWasenderSentActivity,
	sendWasenderGroupImage,
	WasenderApiError,
	wasenderGroupId,
} from "./wasender-connections-api";
import { requireConnectedWasenderSession } from "./wasender-connections-store";
import { resolveWasenderTaskRecipient } from "./wasender-groups-store";
import {
	discardWasenderTaskImages,
	stageWasenderTaskImage,
} from "./wasender-task-images";

export const WHATSAPP_TASK_MAX_BODY = 16_000_000;
const WHATSAPP_TASK_MAX_IMAGE = 5_000_000;
const WASENDER_IMAGE_INTERVAL_MS = 5000;
const WASENDER_MAX_RETRY_WAIT_MS = 60_000;
const WASENDER_MAX_RETRIES = 2;

const sendInputSchema = z
	.object({
		planId: z.string().uuid(),
		planVersion: z.number().int().positive(),
		recipient: z.string().transform((value) => normalizeMetaPhone(value)),
		groupId: wasenderGroupId.optional(),
		groupSender: z
			.string()
			.regex(/^\d{8,15}$/)
			.optional(),
		message: z
			.string()
			.transform(normalizePlanningWhatsAppMessage)
			.pipe(z.string().min(1).max(PLANNING_WHATSAPP_MESSAGE_LIMIT)),
		clientRequestId: z.string().uuid(),
		images: z
			.array(
				z
					.object({
						page: z.number().int().min(1).max(11),
						section: z.string().trim().min(1).max(120).optional(),
					})
					.strict(),
			)
			.min(1)
			.max(11),
	})
	.strict();

type SendResultItem = {
	ordinal: number;
	page: number;
	section: string | null;
	status: string;
	metaMessageId: string | null;
	error: string | null;
};

function safeProviderError(error: unknown) {
	return String(error instanceof Error ? error.message : error).slice(0, 2_000);
}

function userFacingProviderError() {
	return "Ziņu neizdevās nosūtīt. Pārbaudiet Meta numura un veidnes iestatījumus.";
}

function groupSendError(reason: string | null) {
	return reason === "WaSenderAPI request failed (429)"
		? "WaSenderAPI sūtīšanas limits ir sasniegts. Vēlāk atkārtojiet nenosūtītos attēlus."
		: "Ziņu neizdevās nosūtīt. Pārbaudiet WhatsApp grupas savienojumu.";
}

function wasenderRateLimited(error: unknown): error is WasenderApiError {
	return error instanceof WasenderApiError && error.status === 429;
}

function createPacedWasenderSender() {
	let nextSendAt = 0;
	let retryCount = 0;
	let remainingRetryWait = WASENDER_MAX_RETRY_WAIT_MS;
	return async (...args: Parameters<typeof sendWasenderGroupImage>) => {
		while (true) {
			const wait = nextSendAt - Date.now();
			if (wait > 0) await sleep(wait);
			try {
				return await sendWasenderGroupImage(...args);
			} catch (error) {
				if (!wasenderRateLimited(error) || retryCount >= WASENDER_MAX_RETRIES)
					throw error;
				const delay = Math.max(
					WASENDER_IMAGE_INTERVAL_MS,
					error.retryAfterMs ?? WASENDER_IMAGE_INTERVAL_MS * 2 ** retryCount,
				);
				if (delay > remainingRetryWait) throw error;
				retryCount++;
				remainingRetryWait -= delay;
				nextSendAt = Date.now() + delay;
			} finally {
				nextSendAt = Math.max(
					nextSendAt,
					Date.now() + WASENDER_IMAGE_INTERVAL_MS,
				);
			}
		}
	};
}

class WhatsAppProviderError extends Error {
	constructor(
		message: string,
		public readonly code?: number,
	) {
		super(message);
	}
}

async function graphJson(args: {
	url: string;
	token: string;
	init: RequestInit;
}) {
	const response = await fetch(args.url, {
		...args.init,
		headers: {
			Authorization: `Bearer ${args.token}`,
			...(args.init.headers ?? {}),
		},
	});
	const payload = await response.json().catch(() => null);
	if (!response.ok)
		throw new WhatsAppProviderError(
			`Meta request failed (${response.status}): ${JSON.stringify(payload)}`,
			payload?.error?.code,
		);
	return payload;
}

async function normalizeTaskImage(file: File) {
	const normalized = await sharp(Buffer.from(await file.arrayBuffer()), {
		limitInputPixels: 4_000_000,
	})
		.rotate()
		.jpeg({ quality: 88 })
		.toBuffer();
	if (!normalized.length || normalized.length > WHATSAPP_TASK_MAX_IMAGE)
		throw new Error("Invalid WhatsApp task image size");
	return new File([new Uint8Array(normalized)], "work-task.jpg", {
		type: "image/jpeg",
	});
}

async function uploadMetaImage(args: {
	businessPhoneNumberId: string;
	token: string;
	file: File;
}) {
	const form = new FormData();
	form.set("messaging_product", "whatsapp");
	form.set("file", args.file);
	const payload = await graphJson({
		url: `${getMetaGraphBaseUrl()}/${args.businessPhoneNumberId}/media`,
		token: args.token,
		init: { method: "POST", body: form },
	});
	if (typeof payload?.id !== "string") throw new Error("Meta media ID missing");
	return payload.id as string;
}

async function sendTemplate(args: {
	businessPhoneNumberId: string;
	token: string;
	templateName: string;
	templateLanguage: string;
	recipient: string;
	objectName: string;
	message: string;
	total: number;
	mediaId: string;
	section?: string | null;
}) {
	const content = planningWhatsAppTemplateContent(args);
	const payload = await graphJson({
		url: `${getMetaGraphBaseUrl()}/${args.businessPhoneNumberId}/messages`,
		token: args.token,
		init: {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				messaging_product: "whatsapp",
				recipient_type: "individual",
				to: args.recipient,
				type: "template",
				template: {
					name: content.name,
					language: { code: args.templateLanguage },
					components: [
						{
							type: "header",
							parameters: [{ type: "image", image: { id: args.mediaId } }],
						},
						...(content.parameters.length
							? [{ type: "body", parameters: content.parameters }]
							: []),
					],
				},
			}),
		},
	});
	const id = payload?.messages?.[0]?.id;
	if (typeof id !== "string") throw new Error("Meta message ID missing");
	return id as string;
}

async function resultForSend(sendId: string) {
	const send = await prisma.whatsAppTaskSend.findUniqueOrThrow({
		where: { id: sendId },
		include: { items: { orderBy: { ordinal: "asc" } } },
	});
	return {
		sendId: send.id,
		status: send.status as "sent" | "partial" | "failed" | "processing",
		items: send.items.map(
			(item): SendResultItem => ({
				ordinal: item.ordinal,
				page: item.page,
				section: item.section,
				status: item.status,
				metaMessageId: item.metaMessageId,
				error:
					item.status === "failed"
						? send.provider !== "meta"
							? groupSendError(item.providerError)
							: userFacingProviderError()
						: null,
			}),
		),
	};
}

async function reconcileWasenderReceipts(
	sendId: string,
	session: { token: string; providerSessionId: number },
) {
	const queued = await prisma.whatsAppTaskSendItem.findMany({
		where: { sendId, status: "queued" },
		include: { wasenderImage: { select: { tokenHash: true } } },
	});
	const receipts = await Promise.all(
		queued.flatMap((item) => {
			const messageId = item.wasenderMessageId;
			if (!messageId) return [];
			return readWasenderMessageStatus(session.token, messageId)
				.catch(() => null)
				.then((code) => ({ item, messageId, code }));
		}),
	);
	const awaitingIds = receipts
		.filter(({ code }) => code === 1 || code === null)
		.map(({ messageId }) => messageId);
	const sentActivity = await readWasenderSentActivity(
		session.providerSessionId,
		awaitingIds,
	).catch(() => null);
	await Promise.all(
		receipts.map(async ({ item, messageId, code }) => {
			const now = new Date();
			const status =
				code === 0
					? "failed"
					: code === 2 || sentActivity?.has(messageId)
						? "sent"
						: code === 3
							? "delivered"
							: code === 4 || code === 5
								? "read"
								: null;
			if (!status) return;
			const updated = await prisma.whatsAppTaskSendItem.updateMany({
				where: {
					id: item.id,
					status: "queued",
					wasenderMessageId: messageId,
				},
				data: {
					status,
					...(status === "failed"
						? {
								failedAt: now,
								providerError: "WaSenderAPI failed to send the image",
							}
						: { sentAt: now }),
					...(["delivered", "read"].includes(status)
						? { deliveredAt: now }
						: {}),
					...(status === "read" ? { readAt: now } : {}),
				},
			});
			if (updated.count && item.wasenderImage)
				await discardWasenderTaskImages(
					[item.id],
					item.wasenderImage.tokenHash,
				).catch(() => {});
		}),
	);
}

async function finishSend(sendId: string) {
	const completed = await prisma.whatsAppTaskSendItem.findMany({
		where: { sendId },
	});
	const sent = completed.filter((item) =>
		["sent", "delivered", "read"].includes(item.status),
	).length;
	const failed = completed.filter((item) => item.status === "failed").length;
	const status =
		sent === completed.length
			? "sent"
			: failed === completed.length
				? "failed"
				: sent + failed === completed.length
					? "partial"
					: "processing";
	await prisma.whatsAppTaskSend.update({
		where: { id: sendId },
		data: { status, completedAt: status === "processing" ? null : new Date() },
	});
	return resultForSend(sendId);
}

export async function refreshWasenderTaskSend(
	userId: string,
	siteId: string,
	sendId: string,
) {
	const { organizationId } = await requireVisualAccess(userId, siteId);
	const send = await prisma.whatsAppTaskSend.findFirst({
		where: {
			id: sendId,
			siteId,
			organizationId,
			senderUserId: userId,
			provider: "wasender",
		},
	});
	if (!send?.wasenderConnectionId) return null;
	if (send.status !== "processing") return resultForSend(send.id);
	const session = await requireConnectedWasenderSession(
		{ userId, organizationId },
		send.wasenderConnectionId,
	);
	await reconcileWasenderReceipts(send.id, session);
	return finishSend(send.id);
}

export async function sendVisualPlanningWhatsAppTask(args: {
	userId: string;
	siteId: string;
	input: unknown;
	files: File[];
}) {
	const input = sendInputSchema.parse(args.input);
	if (Boolean(input.groupId) !== Boolean(input.groupSender))
		throw new Error("Nederīgs WhatsApp grupas saņēmējs.");
	const recipient = input.groupId ?? input.recipient;
	if (!recipient || (!input.groupId && !/^\d{8,15}$/.test(recipient)))
		throw new Error("Nederīgs saņēmēja tālruņa numurs.");
	if (args.files.length !== input.images.length)
		throw new Error("Trūkst darba uzdevuma attēlu.");
	for (const file of args.files) {
		if (
			!file.type.startsWith("image/") ||
			file.size < 4 ||
			file.size > WHATSAPP_TASK_MAX_IMAGE
		)
			throw new Error("Nederīgs darba uzdevuma attēls.");
	}
	const imageHashes = await Promise.all(
		args.files.map(async (file) =>
			createHash("sha256")
				.update(Buffer.from(await file.arrayBuffer()))
				.digest("hex"),
		),
	);

	const access = await requireVisualAccess(args.userId, args.siteId);
	const plan = await prisma.constructionPlan.findFirst({
		where: {
			id: input.planId,
			siteId: args.siteId,
			planType: VISUAL_PLAN_TYPE,
			version: input.planVersion,
			archivedAt: null,
			geometryReviewRequired: false,
		},
		include: { site: { select: { name: true } } },
	});
	if (!plan) throw new Error("Plāns ir mainīts vai nav pieejams.");
	const geometry = visualPlanAreasSchema.parse(plan.visualAreas);
	const expected = [...new Set(geometry.areas.map((area) => area.page))]
		.sort((left, right) => left - right)
		.map((page) => ({ page, section: undefined as string | undefined }));
	if (geometry.section) expected.push({ page: 11, section: geometry.section });
	if (JSON.stringify(expected) !== JSON.stringify(input.images))
		throw new Error("Attēli neatbilst saglabātā plāna zonām.");

	const group =
		input.groupId && input.groupSender
			? await resolveWasenderTaskRecipient(
					{
						organizationId: access.organizationId,
						userId: args.userId,
						siteId: args.siteId,
					},
					input.groupId,
					input.groupSender,
				)
			: null;
	const businessNumber = group
		? null
		: await prisma.whatsAppBusinessNumber.findFirst({
				where: {
					organizationId: access.organizationId,
					purpose: VISUAL_WORK_TASK_PURPOSE,
					active: true,
				},
			});
	if (!group && !businessNumber)
		throw new Error("Limeni WhatsApp numurs nav aktivizēts.");
	const token = businessNumber
		? getWhatsAppBusinessToken(businessNumber.credentialProfile)
		: null;
	const message = planningWhatsAppMessageWithReportingNote(input.message);
	const idempotencyKey = `${access.organizationId}:${input.clientRequestId}`;
	let send = await prisma.whatsAppTaskSend.findUnique({
		where: { idempotencyKey },
		include: { items: true },
	});
	if (send) {
		const existingItems = [...send.items].sort(
			(left, right) => left.ordinal - right.ordinal,
		);
		if (
			send.siteId !== args.siteId ||
			send.planId !== input.planId ||
			send.planVersion !== input.planVersion ||
			send.recipient !== recipient ||
			send.provider !== (group ? "wasender" : "meta") ||
			(group &&
				(send.senderUserId !== args.userId ||
					send.senderAddress !== group.phone ||
					send.wasenderConnectionId !== group.connectionId)) ||
			planningWhatsAppMessageWithReportingNote(send.message) !== message ||
			existingItems.length !== input.images.length ||
			existingItems.some(
				(item, ordinal) =>
					item.page !== input.images[ordinal].page ||
					item.section !== (input.images[ordinal].section ?? null) ||
					item.imageSha256 !== imageHashes[ordinal],
			)
		)
			throw new Error("Nosūtīšanas pieprasījums neatbilst sākotnējam saturam.");
	} else {
		if (!message) throw new Error("Ievadiet darba uzdevuma ziņu.");
		if (message.length > PLANNING_WHATSAPP_MESSAGE_LIMIT)
			throw new Error(
				`Ziņa kopā ar piezīmi pārsniedz ${PLANNING_WHATSAPP_MESSAGE_LIMIT} rakstzīmes.`,
			);
		send = await prisma.whatsAppTaskSend.create({
			data: {
				id: randomUUID(),
				idempotencyKey,
				organizationId: access.organizationId,
				siteId: args.siteId,
				planId: input.planId,
				planVersion: input.planVersion,
				senderUserId: args.userId,
				recipient,
				...(group
					? {
							provider: "wasender",
							recipientLabel: group.group.name,
							senderAddress: group.phone,
							wasenderConnectionId: group.connectionId,
						}
					: {}),
				message,
				items: {
					create: input.images.map((image, ordinal) => ({
						ordinal,
						page: image.page,
						section: image.section ?? null,
						imageSha256: imageHashes[ordinal],
					})),
				},
			},
			include: { items: true },
		});
	}

	const items = [...send.items].sort(
		(left, right) => left.ordinal - right.ordinal,
	);
	const sendGroupImage = createPacedWasenderSender();
	if (group) await discardWasenderTaskImages([]).catch(() => {});
	for (const item of items) {
		if (group && item.status === "processing") break;
		if (item.status !== "pending" && item.status !== "failed") continue;
		const data = { status: "processing", providerError: null, failedAt: null };
		if (group) {
			const claim = await prisma.whatsAppTaskSendItem.updateMany({
				where: { id: item.id, status: { in: ["pending", "failed"] } },
				data,
			});
			if (!claim.count) break;
		} else {
			await prisma.whatsAppTaskSendItem.update({
				where: { id: item.id },
				data,
			});
		}
		let attemptedGroupSend = false;
		try {
			const file = await normalizeTaskImage(args.files[item.ordinal]);
			const label = item.section
				? `Sekcija ${item.section}`
				: `PDF lapa ${item.page}`;
			if (group) {
				const imageUrl = await stageWasenderTaskImage(item.id, file);
				attemptedGroupSend = true;
				const wasenderMessageId = await sendGroupImage(
					group.token,
					recipient,
					item.ordinal === 0 ? send.message : label,
					imageUrl,
				);
				await prisma.whatsAppTaskSendItem.update({
					where: { id: item.id },
					data: { status: "queued", wasenderMessageId },
				});
				continue;
			}
			if (!businessNumber || !token) throw new Error("Meta sender unavailable");
			const mediaId = await uploadMetaImage({
				businessPhoneNumberId: businessNumber.businessPhoneNumberId,
				token,
				file,
			});
			const metaMessageId = await sendTemplate({
				businessPhoneNumberId: businessNumber.businessPhoneNumberId,
				token,
				templateName: businessNumber.templateName,
				templateLanguage: businessNumber.templateLanguage,
				recipient,
				objectName:
					businessNumber.templateName === LIMENI_TASK_TEMPLATE
						? plan.site.name
						: `${plan.site.name} — ${label}`,
				message: item.section
					? item.section
					: normalizePlanningWhatsAppTemplateText(send.message),
				total: item.section ? 1 : items.length,
				mediaId,
				section: item.section,
			});
			await prisma.whatsAppTaskSendItem.update({
				where: { id: item.id },
				data: {
					status: "sent",
					metaMediaId: mediaId,
					metaMessageId,
					sentAt: new Date(),
				},
			});
		} catch (error) {
			const uncertain =
				attemptedGroupSend &&
				!(
					error instanceof WasenderApiError &&
					error.status >= 400 &&
					error.status < 500 &&
					error.status !== 408
				);
			if (group && !uncertain)
				await discardWasenderTaskImages([item.id]).catch(() => {});
			await prisma.whatsAppTaskSendItem.update({
				where: { id: item.id },
				data: {
					status: uncertain ? "unknown" : "failed",
					providerError:
						group && !(error instanceof WasenderApiError)
							? "WaSenderAPI send could not be confirmed"
							: safeProviderError(error),
					failedAt: uncertain ? null : new Date(),
				},
			});
			if (group && wasenderRateLimited(error)) break;
		}
	}

	if (group) await reconcileWasenderReceipts(send.id, group);
	return finishSend(send.id);
}
