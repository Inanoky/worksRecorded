import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/utils/db";
import { sendMetaGraphMessage } from "@/lib/utils/whatsapp-helpers/meta/sender";
import { getWhatsappSourceContext } from "@/server/ai-flows/agents/whatsapp-agent/whatsappSourceContext";
import {
	assertZtcMessageActive,
	getZtcMessageRecoveryContext,
	withZtcMessageRecoveryContext,
	ZtcMessageDeadlineError,
} from "./message-recovery-context";

export const ZTC_TECHNICAL_FAILURE_REPLY =
	"Atvainojiet, šobrīd sistēmā ir tehniski traucējumi. Turpiniet sūtīt ziņas un foto kā parasti — nav jāgaida sistēmas atbilde. Jūsu iesūtīto informāciju apstrādāsim vēlāk.";

export const ZTC_MESSAGE_BUDGET_MS = 240_000;

export class ZtcMessageRetentionError extends Error {
	constructor() {
		super("Could not retain the ZTC message for later review");
		this.name = "ZtcMessageRetentionError";
	}
}

type RecoveryMessage = {
	worker: { id: string; organizationId?: string | null; siteId?: string | null };
	message: { id: string; type?: string; [key: string]: unknown };
	metadata: Record<string, unknown>;
	businessPhoneNumberId: string;
	recipient: string | null;
};

async function sendFailureReply(args: RecoveryMessage, retained: boolean) {
	if (!args.recipient) return;
	try {
		await sendMetaGraphMessage({
			businessPhoneNumberId: args.businessPhoneNumberId,
			recipient: args.recipient,
			body: {
				text: {
					body: retained
						? ZTC_TECHNICAL_FAILURE_REPLY
						: "Atvainojiet, šobrīd sistēmā ir tehniski traucējumi. Šīs ziņas saņemšanu vēl nevaram apstiprināt. Lūdzu, saglabājiet ziņu un foto pie sevis — nosūtīšana būs jāatkārto, kad sistēma atkal darbosies.",
				},
			},
		});
	} catch (error) {
		console.error("[ZTC recovery] failure reply could not be sent", {
			messageId: args.message.id,
			workerId: args.worker.id,
			error,
		});
	}
}

async function updateRecoveryStatus(status: string, error?: unknown) {
	const context = getZtcMessageRecoveryContext();
	if (!context) return;
	const details = JSON.stringify({
		...(error !== undefined
			? { lastError: error instanceof Error ? error.message : String(error) }
			: {}),
		statusChangedAt: new Date().toISOString(),
	});
	await prisma.$executeRaw`
    UPDATE "ZtcInboundMediaBatch"
    SET "status" = ${status}, "items" = "items" || ${details}::jsonb, "updatedAt" = NOW()
    WHERE "mode" = 'ztc_recovery'
      AND "workerId" = ${context.workerId}
      AND "lastMessageId" = ANY(${context.messageIds}::text[])
      AND "status" <> 'completed'
  `;
}

export async function retainZtcMessageFormData(formData: FormData) {
	const context = getZtcMessageRecoveryContext();
	if (!context) return;
	assertZtcMessageActive();
	const messageId = String(formData.get("MessageId") ?? "");
	const entries = Array.from(formData.entries()).map(([key, value]) => [
		key,
		typeof value === "string" ? value : value.name,
	]);
	await prisma.$executeRaw`
    UPDATE "ZtcInboundMediaBatch"
    SET "items" = "items" || ${JSON.stringify({ formData: entries })}::jsonb, "updatedAt" = NOW()
    WHERE "mode" = 'ztc_recovery' AND "workerId" = ${context.workerId}
      AND "lastMessageId" = ${messageId}
  `;
}

export async function retainZtcUploadedMedia(
	publicUrl: string | null,
	contentType: string,
) {
	const context = getZtcMessageRecoveryContext();
	if (!context || !publicUrl) return;
	const item = JSON.stringify([{ url: publicUrl, contentType }]);
	await prisma.$executeRaw`
    UPDATE "ZtcInboundMediaBatch"
    SET "items" = jsonb_set("items", '{uploadedMedia}',
      COALESCE("items"->'uploadedMedia', '[]'::jsonb) || ${item}::jsonb), "updatedAt" = NOW()
    WHERE "mode" = 'ztc_recovery' AND "workerId" = ${context.workerId}
      AND "lastMessageId" = ANY(${context.messageIds}::text[])
  `;
}

export async function runWithZtcMessageRecovery(
	args: RecoveryMessage,
	run: () => Promise<void>,
) {
	try {
		await prisma.ztcInboundMediaBatch.create({
			data: {
				id: randomUUID(),
				batchKey: `ztc_recovery:${args.message.id}`,
				workerId: args.worker.id,
				organizationId: args.worker.organizationId ?? null,
				mode: "ztc_recovery",
				status: "processing",
				items: JSON.parse(
					JSON.stringify({
						kind: "ztc_message_recovery",
						version: 1,
						siteId: args.worker.siteId ?? null,
						message: args.message,
						metadata: args.metadata,
						businessPhoneNumberId: args.businessPhoneNumberId,
						recipient: args.recipient,
					}),
				),
				lastMessageId: args.message.id,
				processAfter: new Date(),
			},
		});
	} catch (error) {
		if (
			error &&
			typeof error === "object" &&
			"code" in error &&
			error.code === "P2002"
		) {
			await sendFailureReply(args, true);
			throw new Error("ZTC message is already retained; review before replay");
		}
		console.error("[ZTC recovery] could not retain incoming message", {
			messageId: args.message.id,
			workerId: args.worker.id,
			error,
		});
		await sendFailureReply(args, false);
		throw new ZtcMessageRetentionError();
	}

	const now = Date.now();
	const arrival = getWhatsappSourceContext().webhookStartedAtMs;
	const startedAt =
		typeof arrival === "number" && Number.isFinite(arrival)
			? Math.min(arrival, now)
			: now;
	const context = {
		workerId: args.worker.id,
		messageIds: [args.message.id],
		deadline: startedAt + ZTC_MESSAGE_BUDGET_MS,
		stopped: false,
		awaitingBatch: false,
	};

	return withZtcMessageRecoveryContext(context, async () => {
		let timer: ReturnType<typeof setTimeout> | undefined;
		try {
			assertZtcMessageActive();
			const deadline = new Promise<never>((_, reject) => {
				timer = setTimeout(
					() => {
						context.stopped = true;
						reject(new ZtcMessageDeadlineError());
					},
					Math.max(0, context.deadline - Date.now()),
				);
			});
			await Promise.race([
				(async () => {
					const backlog = await prisma.ztcInboundMediaBatch.findFirst({
						where: {
							workerId: args.worker.id,
							mode: "ztc_recovery",
							lastMessageId: { not: args.message.id },
							OR: [
								{ status: "pending_review" },
								{
									status: { in: ["processing", "awaiting_batch"] },
									updatedAt: { lt: new Date(Date.now() - 300_000) },
								},
							],
						},
						select: { id: true },
					});
					assertZtcMessageActive();
					if (backlog)
						throw new Error("Earlier ZTC message requires recovery review");
					await run();
				})(),
				deadline,
			]);
			assertZtcMessageActive();
			await updateRecoveryStatus(
				context.awaitingBatch ? "awaiting_batch" : "completed",
			);
		} catch (error) {
			context.stopped = true;
			await updateRecoveryStatus("pending_review", error).catch(
				(storageError) => {
					console.error(
						"[ZTC recovery] status update failed; original message retained",
						{
							messageIds: context.messageIds,
							workerId: args.worker.id,
							error: storageError,
						},
					);
				},
			);
			await sendFailureReply(args, true);
			throw error;
		} finally {
			clearTimeout(timer);
		}
	});
}
