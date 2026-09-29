import { Resend } from "resend";
import { UTApi } from "uploadthing/server";
import { createHook, FatalError } from "workflow";
import { start } from "workflow/api";
import { createTgemInvoiceCaseRecord } from "@/lib/tgem-invoice-approval/create-case";
import {
	buildTgemInvoiceIdempotencyKey,
	isSupportedTgemInvoiceContentType,
	MAX_TGEM_INVOICE_BYTES,
	type TgemInvoiceSourceContext,
} from "@/lib/tgem-invoice-approval/intake";
import { processTgemInvoiceCase } from "@/lib/tgem-invoice-approval/process-case";
import { prisma } from "@/lib/utils/db";
import { getUploadThingUfsUrl } from "@/lib/utils/uploadthing-file-url";

const utapi = new UTApi();

export type TgemInvoiceProcessingInput = {
	invoiceCaseId: string;
	documentId: string;
};

type TgemInvoiceArchivedDuplicate = {
	invoiceCaseId: string;
	documentId: string | null;
	archived: true;
};

type InboundAttachment = {
	id: string;
	filename?: string;
	contentType: string;
	size: number;
};

type InboundEmail = {
	recipientAddresses: string[];
	sourceContext: TgemInvoiceSourceContext;
	attachments: InboundAttachment[];
	sender: string;
};

function requiredEnvironmentValue(name: string) {
	const value = process.env[name]?.trim();
	if (!value) throw new Error(`${name} is not configured`);
	return value;
}

function normalizeEmailAddress(value: string) {
	const bracketed = value.match(/<([^>]+)>/)?.[1] ?? value;
	return bracketed.trim().toLowerCase();
}

function normalizeFilename(
	filename: string | undefined,
	attachmentId: string,
	contentType: string,
) {
	const extension =
		contentType === "application/pdf"
			? "pdf"
			: contentType === "image/png"
				? "png"
				: contentType === "image/webp"
					? "webp"
					: "jpg";
	return (
		filename
			?.normalize("NFKC")
			.replace(/[^\p{L}\p{N}._-]+/gu, "-")
			.replace(/^\.+/, "")
			.slice(0, 180) || `invoice-${attachmentId}.${extension}`
	);
}

function stripHtml(value: string | null) {
	return value
		?.replace(/<style[\s\S]*?<\/style>/gi, " ")
		.replace(/<script[\s\S]*?<\/script>/gi, " ")
		.replace(/<[^>]+>/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

export async function loadTgemInboundEmailStep(
	emailId: string,
): Promise<InboundEmail> {
	"use step";

	const resend = new Resend(requiredEnvironmentValue("RESEND_API_KEY"));
	const [emailResponse, attachmentResponse] = await Promise.all([
		resend.emails.receiving.get(emailId, { html_format: "cid" }),
		resend.emails.receiving.attachments.list({ emailId }),
	]);
	if (emailResponse.error) {
		throw new Error(
			`Resend email retrieval failed: ${emailResponse.error.message}`,
		);
	}
	if (attachmentResponse.error) {
		throw new Error(
			`Resend attachment listing failed: ${attachmentResponse.error.message}`,
		);
	}
	if (!emailResponse.data || !attachmentResponse.data) {
		throw new Error("Resend returned incomplete email data");
	}

	const email = emailResponse.data;
	return {
		recipientAddresses: [...email.received_for, ...email.to]
			.map(normalizeEmailAddress)
			.filter(Boolean),
		sourceContext: {
			sender: email.from.slice(0, 320),
			subject: email.subject.slice(0, 500),
			cc: (email.cc ?? []).slice(0, 20).map((value) => value.slice(0, 320)),
			description: (email.text ?? stripHtml(email.html) ?? "").slice(0, 8_000),
		},
		attachments: attachmentResponse.data.data
			.filter(
				(attachment) =>
					isSupportedTgemInvoiceContentType(attachment.content_type) &&
					attachment.size <= MAX_TGEM_INVOICE_BYTES,
			)
			.map((attachment) => ({
				id: attachment.id,
				filename: attachment.filename,
				contentType: attachment.content_type,
				size: attachment.size,
			})),
		sender: email.from,
	};
}

loadTgemInboundEmailStep.maxRetries = 4;

export async function resolveTgemInboundOrganizationStep(
	recipientAddresses: string[],
) {
	"use step";

	const mailboxes = await prisma.tgemInboundMailbox.findMany({
		where: {
			address: { in: recipientAddresses, mode: "insensitive" },
			enabled: true,
		},
		select: { organizationId: true },
	});
	const organizationIds = [
		...new Set(mailboxes.map((mailbox) => mailbox.organizationId)),
	];
	if (organizationIds.length === 0) {
		throw new FatalError(
			"No enabled TGEM mailbox matches the inbound recipient",
		);
	}
	if (organizationIds.length > 1) {
		throw new FatalError(
			"Inbound recipients match multiple TGEM organizations",
		);
	}

	const organizationId = organizationIds[0];
	const flowAssignment = await prisma.flowAssignment.findFirst({
		where: {
			organizationId,
			flowModuleKey: "tgem-invoice-approval",
			enabled: true,
		},
		select: { organizationId: true },
	});
	if (!flowAssignment) {
		throw new FatalError("The inbound mailbox organization does not use TGEM");
	}
	return organizationId;
}

resolveTgemInboundOrganizationStep.maxRetries = 4;

export async function storeTgemInboundAttachmentStep(input: {
	emailId: string;
	organizationId: string;
	sender: string;
	sourceContext: TgemInvoiceSourceContext;
	attachment: InboundAttachment;
}): Promise<TgemInvoiceProcessingInput | TgemInvoiceArchivedDuplicate> {
	"use step";

	const sourceMessageId = `${input.emailId}:${input.attachment.id}`;
	const idempotencyKey = buildTgemInvoiceIdempotencyKey({
		organizationId: input.organizationId,
		source: "email",
		sourceMessageId,
	});
	const existingCase = await prisma.tgemInvoiceCase.findUnique({
		where: { idempotencyKey },
		select: {
			id: true,
			archivedAt: true,
			documents: {
				orderBy: { createdAt: "asc" },
				take: 1,
				select: { id: true },
			},
		},
	});
	const existingDocument = existingCase?.documents[0];
	if (existingCase?.archivedAt) {
		return {
			invoiceCaseId: existingCase.id,
			documentId: existingDocument?.id ?? null,
			archived: true,
		};
	}
	if (existingCase && existingDocument) {
		return {
			invoiceCaseId: existingCase.id,
			documentId: existingDocument.id,
		};
	}

	const resend = new Resend(requiredEnvironmentValue("RESEND_API_KEY"));
	const { data, error } = await resend.emails.receiving.attachments.get({
		emailId: input.emailId,
		id: input.attachment.id,
	});
	if (error) {
		throw new Error(`Resend attachment retrieval failed: ${error.message}`);
	}
	if (!data) throw new Error("Resend returned no attachment URL");

	const filename = normalizeFilename(
		input.attachment.filename,
		input.attachment.id,
		input.attachment.contentType,
	);
	const downloadResponse = await fetch(data.download_url);
	if (!downloadResponse.ok) {
		throw new Error(
			`Resend attachment download failed: ${downloadResponse.status}`,
		);
	}
	const content = await downloadResponse.arrayBuffer();
	if (content.byteLength > MAX_TGEM_INVOICE_BYTES) {
		throw new FatalError("Invoice attachment exceeds the 16 MB limit");
	}
	const uploaded = await utapi.uploadFiles(
		new File([content], filename, { type: input.attachment.contentType }),
	);
	if (uploaded.error || !uploaded.data) {
		throw new Error(uploaded.error?.message || "Invoice upload failed");
	}
	const ufsUrl = getUploadThingUfsUrl(uploaded.data);
	if (!ufsUrl) throw new Error("Invoice upload returned no permanent URL");

	const invoiceCase = await createTgemInvoiceCaseRecord(prisma, {
		organizationId: input.organizationId,
		siteId: null,
		submittedByUserId: null,
		source: "email",
		sourceMessageId,
		sourceSender: input.sender,
		sourceContext: input.sourceContext,
		storageFile: { ufsUrl },
		storageKey: uploaded.data.key,
		originalFilename: filename,
		contentType: input.attachment.contentType,
		byteSize: input.attachment.size,
		sha256: null,
	});
	const document = invoiceCase.documents[0];
	if (!document) throw new Error("Invoice document was not created");
	return { invoiceCaseId: invoiceCase.id, documentId: document.id };
}

storeTgemInboundAttachmentStep.maxRetries = 4;

export async function processTgemInvoiceStep(
	input: TgemInvoiceProcessingInput,
) {
	"use step";

	const document = await prisma.tgemInvoiceDocument.findFirst({
		where: { id: input.documentId, invoiceCaseId: input.invoiceCaseId },
		select: {
			id: true,
			canonicalUrl: true,
			contentType: true,
			byteSize: true,
			invoiceCase: {
				select: {
					id: true,
					organizationId: true,
					siteId: true,
					submittedByUserId: true,
					source: true,
					status: true,
					archivedAt: true,
				},
			},
		},
	});
	if (!document)
		throw new FatalError("Queued TGEM invoice document was not found");
	if (document.invoiceCase.archivedAt) {
		return {
			invoiceCaseId: document.invoiceCase.id,
			status: "archived",
			skipped: true,
		};
	}
	if (
		!["received", "failed_processing"].includes(document.invoiceCase.status)
	) {
		return {
			invoiceCaseId: document.invoiceCase.id,
			status: document.invoiceCase.status,
			skipped: true,
		};
	}

	return processTgemInvoiceCase({
		invoiceCaseId: document.invoiceCase.id,
		documentId: document.id,
		organizationId: document.invoiceCase.organizationId,
		siteId: document.invoiceCase.siteId,
		actorUserId: document.invoiceCase.submittedByUserId,
		actorType:
			document.invoiceCase.source === "whatsapp"
				? "whatsapp"
				: document.invoiceCase.source === "email"
					? "email"
					: "user",
		source:
			document.invoiceCase.source === "whatsapp" ||
			document.invoiceCase.source === "email"
				? document.invoiceCase.source
				: "dashboard",
		content: async () => {
			const response = await fetch(document.canonicalUrl);
			if (!response.ok) {
				throw new Error(
					`Could not download the TGEM invoice document: ${response.status}`,
				);
			}
			return Buffer.from(await response.arrayBuffer());
		},
		contentType: document.contentType,
		byteSize: document.byteSize,
	});
}

processTgemInvoiceStep.maxRetries = 4;

export async function processTgemInvoiceWorkflow(
	input: TgemInvoiceProcessingInput,
) {
	"use workflow";

	using ownership = createHook({
		token: `tgem-invoice:${input.invoiceCaseId}:${input.documentId}`,
	});
	const conflict = await ownership.getConflict();
	if (conflict) {
		return { status: "duplicate", ownerRunId: conflict.runId };
	}
	return processTgemInvoiceStep(input);
}

async function spawnTgemInvoiceProcessingStep(
	inputs: TgemInvoiceProcessingInput[],
) {
	"use step";

	return Promise.all(
		inputs.map(async (input) => {
			const run = await start(processTgemInvoiceWorkflow, [input]);
			return run.runId;
		}),
	);
}

spawnTgemInvoiceProcessingStep.maxRetries = 4;

export async function processTgemInboundEmailWorkflow(emailId: string) {
	"use workflow";

	using ownership = createHook({ token: `tgem-email:${emailId}` });
	const conflict = await ownership.getConflict();
	if (conflict) {
		return { status: "duplicate", ownerRunId: conflict.runId };
	}

	const inbound = await loadTgemInboundEmailStep(emailId);
	const organizationId = await resolveTgemInboundOrganizationStep(
		inbound.recipientAddresses,
	);
	const queuedCases: TgemInvoiceProcessingInput[] = [];
	for (const attachment of inbound.attachments) {
		const queuedCase = await storeTgemInboundAttachmentStep({
			emailId,
			organizationId,
			sender: inbound.sender,
			sourceContext: inbound.sourceContext,
			attachment,
		});
		if (!("archived" in queuedCase)) queuedCases.push(queuedCase);
	}
	const processingRunIds = await spawnTgemInvoiceProcessingStep(queuedCases);
	return {
		status: "queued",
		emailId,
		invoiceCaseIds: queuedCases.map((item) => item.invoiceCaseId),
		processingRunIds,
	};
}
