import { createHash, randomUUID } from "node:crypto";
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
} from "./planning-whatsapp";
import {
	LIMENI_TASK_TEMPLATE,
	limeniSectionTemplateName,
	planningWhatsAppTemplateContent,
} from "./planning-whatsapp-templates";
import { requireVisualAccess } from "./store";

export const WHATSAPP_TASK_MAX_BODY = 16_000_000;
const WHATSAPP_TASK_MAX_IMAGE = 5_000_000;

const sendInputSchema = z
	.object({
		planId: z.string().uuid(),
		planVersion: z.number().int().positive(),
		recipient: z.string().transform((value) => normalizeMetaPhone(value)),
		message: z
			.string()
			.transform(normalizePlanningWhatsAppMessage)
			.pipe(z.string().min(1).max(900)),
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

async function uploadMetaImage(args: {
	businessPhoneNumberId: string;
	token: string;
	file: File;
}) {
	const normalized = await sharp(Buffer.from(await args.file.arrayBuffer()), {
		limitInputPixels: 4_000_000,
	})
		.rotate()
		.jpeg({ quality: 88 })
		.toBuffer();
	if (!normalized.length || normalized.length > WHATSAPP_TASK_MAX_IMAGE)
		throw new Error("Invalid WhatsApp task image size");
	const form = new FormData();
	form.set("messaging_product", "whatsapp");
	form.set(
		"file",
		new File([new Uint8Array(normalized)], "work-task.jpg", {
			type: "image/jpeg",
		}),
	);
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
				error: item.status === "failed" ? userFacingProviderError() : null,
			}),
		),
	};
}

export async function sendVisualPlanningWhatsAppTask(args: {
	userId: string;
	siteId: string;
	input: unknown;
	files: File[];
}) {
	const input = sendInputSchema.parse(args.input);
	if (!input.recipient || !/^\d{8,15}$/.test(input.recipient))
		throw new Error("Nederīgs saņēmēja tālruņa numurs.");
	const recipient = input.recipient;
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

	const businessNumber = await prisma.whatsAppBusinessNumber.findFirst({
		where: {
			organizationId: access.organizationId,
			purpose: VISUAL_WORK_TASK_PURPOSE,
			active: true,
		},
	});
	if (!businessNumber)
		throw new Error("Limeni WhatsApp numurs nav aktivizēts.");
	if (businessNumber.templateName === LIMENI_TASK_TEMPLATE && geometry.section)
		limeniSectionTemplateName(geometry.section);
	const token = getWhatsAppBusinessToken(businessNumber.credentialProfile);
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
			send.recipient !== input.recipient ||
			normalizePlanningWhatsAppMessage(send.message) !== input.message ||
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
		send = await prisma.whatsAppTaskSend.create({
			data: {
				id: randomUUID(),
				idempotencyKey,
				organizationId: access.organizationId,
				siteId: args.siteId,
				planId: input.planId,
				planVersion: input.planVersion,
				senderUserId: args.userId,
				recipient: input.recipient,
				message: input.message,
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
	for (const item of items) {
		if (item.status !== "pending" && item.status !== "failed") continue;
		await prisma.whatsAppTaskSendItem.update({
			where: { id: item.id },
			data: { status: "processing", providerError: null, failedAt: null },
		});
		try {
			const mediaId = await uploadMetaImage({
				businessPhoneNumberId: businessNumber.businessPhoneNumberId,
				token,
				file: args.files[item.ordinal],
			});
			const label = item.section
				? `Sekcija ${item.section}`
				: `PDF lapa ${item.page}`;
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
					: normalizePlanningWhatsAppTemplateText(input.message),
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
			await prisma.whatsAppTaskSendItem.update({
				where: { id: item.id },
				data: {
					status: "failed",
					providerError: safeProviderError(error),
					failedAt: new Date(),
				},
			});
		}
	}

	const completed = await prisma.whatsAppTaskSendItem.findMany({
		where: { sendId: send.id },
	});
	const sentCount = completed.filter((item) => item.status === "sent").length;
	const failedCount = completed.filter(
		(item) => item.status === "failed",
	).length;
	const status =
		sentCount === completed.length
			? "sent"
			: sentCount > 0 && failedCount > 0
				? "partial"
				: failedCount === completed.length
					? "failed"
					: "processing";
	await prisma.whatsAppTaskSend.update({
		where: { id: send.id },
		data: {
			status,
			completedAt: status === "processing" ? null : new Date(),
		},
	});
	return resultForSend(send.id);
}
