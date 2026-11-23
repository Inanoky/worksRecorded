import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/utils/db";
import { sendMetaGraphMessage } from "@/lib/utils/whatsapp-helpers/meta/sender";

const CLAIMED = "invoice_processing_notification_claimed";
const ACCEPTED = "invoice_processing_notification_accepted";
const FAILED = "invoice_processing_notification_failed";
const EXPIRED = "invoice_processing_notification_expired";
const FINISHED = "invoice_processing_job_finished";
const STARTED = "invoice_processing_started";
const LEASE_MS = 120_000;
const WINDOW_MS = 24 * 60 * 60 * 1000;

function record(value: unknown): Record<string, unknown> {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

export async function notifyTgemInvoiceProcessing(
	invoiceCaseId: string,
	processingFailed = false,
) {
	const invoice = await prisma.tgemInvoiceCase.findUnique({
		where: { id: invoiceCaseId },
		select: { uploadDraftId: true, source: true },
	});
	if (!invoice?.uploadDraftId || invoice.source !== "whatsapp")
		return { outcome: "not_applicable" };
	const draftId = invoice.uploadDraftId;
	const claim = await prisma.$transaction(
		async (tx) => {
			await tx.$queryRaw(
				Prisma.sql`SELECT "id" FROM "TgemInvoiceUploadDraft" WHERE "id" = ${draftId} FOR UPDATE`,
			);
			const draft = await tx.tgemInvoiceUploadDraft.findUnique({
				where: { id: draftId },
				select: {
					source: true,
					status: true,
					organizationId: true,
					businessPhoneNumberId: true,
					sender: true,
					updatedAt: true,
					site: { select: { name: true } },
					invoices: {
						orderBy: { id: "asc" },
						select: {
							id: true,
							status: true,
							ocrStatus: true,
							extractionStatus: true,
							archivedAt: true,
							packageReviewRequired: true,
							_count: { select: { documents: true } },
							auditEvents: {
								where: { eventType: { in: [STARTED, FINISHED] } },
								orderBy: { createdAt: "desc" },
								take: 2,
								select: { eventType: true, createdAt: true },
							},
						},
					},
				},
			});
			if (
				!draft ||
				draft.source !== "whatsapp" ||
				draft.status !== "submitted" ||
				!draft.invoices.length
			)
				return { outcome: "not_applicable" } as const;
			if (draft.invoices.some((item) => item.archivedAt))
				return { outcome: "archived" } as const;
			const current = draft.invoices.find((item) => item.id === invoiceCaseId);
			const settled = (item: (typeof draft.invoices)[number]) => {
				const started = item.auditEvents.find(
					(event) => event.eventType === STARTED,
				);
				const finished = item.auditEvents.find(
					(event) => event.eventType === FINISHED,
				);
				return Boolean(
					finished && (!started || finished.createdAt >= started.createdAt),
				);
			};
			if (
				current &&
				!settled(current) &&
				(processingFailed
					? current.status === "failed_processing"
					: current.status !== "received" &&
						current.status !== "processing" &&
						current.ocrStatus === "complete" &&
						current.extractionStatus === "complete")
			) {
				const finished = await tx.tgemInvoiceAuditEvent.create({
					data: {
						invoiceCaseId,
						organizationId: draft.organizationId,
						actorType: "system",
						eventType: FINISHED,
						payload: { outcome: processingFailed ? "failed" : "complete" },
					},
					select: { eventType: true, createdAt: true },
				});
				current.auditEvents.unshift(finished);
			}
			if (
				draft.invoices.some(
					(item) =>
						!settled(item) ||
						(item.status !== "failed_processing" &&
							(item.status === "received" ||
								item.status === "processing" ||
								item.ocrStatus !== "complete" ||
								item.extractionStatus !== "complete")),
				)
			)
				return { outcome: "waiting" } as const;
			const outcomeKey = JSON.stringify(
				draft.invoices.map((item) => [
					item.id,
					item.auditEvents
						.find((event) => event.eventType === STARTED)
						?.createdAt.toISOString(),
					item.status === "failed_processing",
				]),
			);
			const first = draft.invoices[0];
			const history = await tx.tgemInvoiceAuditEvent.findMany({
				where: {
					invoiceCaseId: first.id,
					eventType: { in: [CLAIMED, ACCEPTED, FAILED, EXPIRED] },
				},
				orderBy: { createdAt: "desc" },
				take: 20,
				select: { eventType: true, payload: true, createdAt: true },
			});
			if (
				history.some(
					(event) =>
						event.eventType === ACCEPTED &&
						record(event.payload).outcomeKey === outcomeKey,
				)
			)
				return { outcome: "already_sent" } as const;
			const audit = {
				invoiceCaseId: first.id,
				organizationId: draft.organizationId,
				actorType: "system",
			};
			if (Date.now() - draft.updatedAt.getTime() >= WINDOW_MS) {
				if (!history.some((event) => event.eventType === EXPIRED))
					await tx.tgemInvoiceAuditEvent.create({
						data: {
							...audit,
							eventType: EXPIRED,
							payload: { uploadDraftId: draftId },
						},
					});
				return { outcome: "window_expired" } as const;
			}
			const latest = history.find(
				(event) =>
					event.eventType === CLAIMED &&
					record(event.payload).outcomeKey === outcomeKey,
			);
			if (
				latest &&
				Date.now() - latest.createdAt.getTime() < LEASE_MS &&
				!history.some(
					(event) =>
						event.eventType === FAILED &&
						record(event.payload).attemptId ===
							record(latest.payload).attemptId,
				)
			)
				return { outcome: "busy" } as const;
			const attemptId = randomUUID();
			await tx.tgemInvoiceAuditEvent.create({
				data: {
					...audit,
					eventType: CLAIMED,
					payload: { uploadDraftId: draftId, attemptId, outcomeKey },
				},
			});
			const failedCount = draft.invoices.filter(
				(item) => item.status === "failed_processing",
			).length;
			const documentCount = draft.invoices.reduce(
				(sum, item) => sum + item._count.documents,
				0,
			);
			const invoiceCount = draft.invoices.length;
			const project = draft.site.name.slice(0, 200);
			const text = failedCount
				? `Dokumentu apstrāde projektā “${project}” pabeigta. Veiksmīgi apstrādāti rēķini: ${invoiceCount - failedCount}/${invoiceCount}. ${failedCount === 1 ? "Vienu rēķinu neizdevās apstrādāt" : `${failedCount} rēķinus neizdevās apstrādāt`}. Faili ir saglabāti; pārbaudiet tos TGEM rēķinu panelī.`
				: `${documentCount === 1 ? "Dokuments ir veiksmīgi apstrādāts un saglabāts" : `Visi ${documentCount} dokumenti ir veiksmīgi apstrādāti un saglabāti`} ${invoiceCount === 1 ? "kā viens rēķins" : `kā ${invoiceCount} atsevišķi rēķini`} projektā “${project}”. ${invoiceCount === 1 ? "Rēķins ir pieejams" : "Rēķini ir pieejami"} TGEM rēķinu panelī.${draft.invoices.some((item) => item.packageReviewRequired) ? " Pirms apstiprināšanas pārbaudiet atpazītos datus." : ""}`;
			return {
				outcome: "send",
				audit,
				attemptId,
				outcomeKey,
				text,
				sender: draft.sender,
				businessPhoneNumberId: draft.businessPhoneNumberId,
			} as const;
		},
		{ timeout: 15_000 },
	);
	if (claim.outcome !== "send") return claim;
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), 15_000);
	let payload: Record<string, unknown>;
	try {
		const response = await sendMetaGraphMessage({
			businessPhoneNumberId: claim.businessPhoneNumberId,
			recipient: claim.sender,
			body: { type: "text", text: { body: claim.text } },
			signal: controller.signal,
		});
		payload = record(await response.json().catch(() => null));
	} catch (error) {
		const code =
			error instanceof Error
				? /"code"\s*:\s*(\d+)/.exec(error.message)?.[1]
				: undefined;
		await prisma.tgemInvoiceAuditEvent.create({
			data: {
				...claim.audit,
				eventType: FAILED,
				payload: {
					uploadDraftId: draftId,
					attemptId: claim.attemptId,
					errorCode: code ?? null,
				},
			},
		});
		if (code === "131047") return { outcome: "window_expired" };
		throw error;
	} finally {
		clearTimeout(timeout);
	}
	const messages = Array.isArray(payload.messages) ? payload.messages : [];
	const id = record(messages[0]).id;
	await prisma.tgemInvoiceAuditEvent.create({
		data: {
			...claim.audit,
			eventType: ACCEPTED,
			payload: {
				uploadDraftId: draftId,
				attemptId: claim.attemptId,
				outcomeKey: claim.outcomeKey,
				metaMessageId: typeof id === "string" ? id : null,
			},
		},
	});
	return { outcome: "sent" };
}
