import { prisma } from "@/lib/utils/db";

export const VISUAL_WORK_TASK_PURPOSE = "visual_work_tasks";
export const ARCHIVE_TEXT_ONLY_MODE = "archive_text_only";
export const LIMENI_CREDENTIAL_PROFILE = "limeni-dedicated";

export function getWhatsAppBusinessToken(credentialProfile: string) {
	if (credentialProfile !== LIMENI_CREDENTIAL_PROFILE)
		throw new Error("Unsupported WhatsApp credential profile");
	const token = process.env.LIMENI_META_ACCESS_TOKEN;
	if (!token) throw new Error("Missing LIMENI_META_ACCESS_TOKEN");
	return token;
}

export async function getActiveWhatsAppBusinessNumber(
	businessPhoneNumberId: string | null | undefined,
) {
	if (!businessPhoneNumberId) return null;
	if (!prisma.whatsAppBusinessNumber) return null;
	return prisma.whatsAppBusinessNumber.findFirst({
		where: { businessPhoneNumberId, active: true },
	});
}

export function sanitizeInboundWhatsAppText(value: unknown) {
	if (typeof value !== "string") return null;
	const filtered = Array.from(value)
		.filter((character) => {
			const code = character.charCodeAt(0);
			return (
				character === "\n" || character === "\t" || (code >= 32 && code !== 127)
			);
		})
		.join("")
		.trim()
		.slice(0, 4096);
	return filtered || null;
}

const deliveryRank: Record<string, number> = {
	sent: 1,
	delivered: 2,
	read: 3,
};

export async function persistWhatsAppTaskStatus(status: unknown) {
	const value =
		typeof status === "object" && status !== null
			? (status as Record<string, unknown>)
			: {};
	const metaMessageId =
		typeof value.id === "string" && value.id ? value.id : null;
	const nextStatus =
		typeof value.status === "string" ? value.status.toLowerCase() : null;
	if (!metaMessageId || !nextStatus) return false;
	if (!prisma.whatsAppTaskSendItem) return false;
	const item = await prisma.whatsAppTaskSendItem.findUnique({
		where: { metaMessageId },
	});
	if (!item || item.status === "failed") return false;
	if (
		nextStatus === "failed" &&
		(item.status === "delivered" || item.status === "read")
	)
		return false;
	if (
		nextStatus !== "failed" &&
		(!deliveryRank[nextStatus] ||
			deliveryRank[nextStatus] <= (deliveryRank[item.status] ?? 0))
	)
		return false;
	const now = new Date();
	const error = Array.isArray(value.errors)
		? JSON.stringify(value.errors).slice(0, 2_000)
		: null;
	await prisma.whatsAppTaskSendItem.update({
		where: { id: item.id },
		data: {
			status: nextStatus,
			...(nextStatus === "sent" ? { sentAt: item.sentAt ?? now } : {}),
			...(nextStatus === "delivered" ? { deliveredAt: now } : {}),
			...(nextStatus === "read" ? { readAt: now } : {}),
			...(nextStatus === "failed"
				? { failedAt: now, providerError: error ?? "Meta delivery failed" }
				: {}),
		},
	});
	if (nextStatus === "failed") {
		const sendItems = await prisma.whatsAppTaskSendItem.findMany({
			where: { sendId: item.sendId },
			select: { status: true },
		});
		const failedCount = sendItems.filter(
			(sendItem) => sendItem.status === "failed",
		).length;
		await prisma.whatsAppTaskSend.update({
			where: { id: item.sendId },
			data: {
				status: failedCount === sendItems.length ? "failed" : "partial",
				completedAt: now,
			},
		});
	}
	return true;
}
