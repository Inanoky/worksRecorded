import type { TgemInvoiceSource } from "@/lib/tgem-invoice-approval/intake";

export type TgemInvoiceTraceStage = "request" | "intake" | "processing";

const SOURCE_LABELS: Record<TgemInvoiceSource, string> = {
	dashboard: "Web",
	whatsapp: "WhatsApp",
	email: "Email",
};

export function buildTgemInvoiceLangSmithConfig(input: {
	stage: TgemInvoiceTraceStage;
	source: TgemInvoiceSource;
}) {
	const channel = input.source === "dashboard" ? "dashboard" : input.source;
	const stageLabel =
		input.stage === "request"
			? "Request"
			: input.stage === "intake"
				? "Intake"
				: "Processing";

	return {
		name: `TGEM ${SOURCE_LABELS[input.source]} Invoice ${stageLabel}`,
		run_type: "chain",
		tags: [
			"works-recorded",
			"tgem-invoice",
			"flow:tgem-invoice-approval",
			`workflow:tgem-invoice:${input.stage}`,
			`source:${input.source}`,
			`channel:${channel}`,
		],
		metadata: {
			app: "works-recorded",
			flow: "tgem-invoice-approval",
			workflowId: `tgem-invoice:${input.stage}`,
			source: input.source,
			channel,
		},
	};
}

export function buildTgemInvoiceIntakeTraceInput(input: {
	organizationId: string;
	siteId?: string | null;
	submittedByUserId?: string | null;
	source: TgemInvoiceSource;
	sourceMessageId?: string | null;
	storageKey?: string | null;
	contentType: string;
	byteSize?: number | null;
}) {
	return {
		organizationId: input.organizationId,
		siteId: input.siteId ?? null,
		userId: input.submittedByUserId ?? null,
		source: input.source,
		contentType: input.contentType,
		byteSize: input.byteSize ?? null,
		hasSourceMessageId: Boolean(input.sourceMessageId),
		hasStorageKey: Boolean(input.storageKey),
	};
}

export function buildTgemInvoiceIntakeTraceOutput(output: unknown) {
	const record =
		output && typeof output === "object"
			? (output as Record<string, unknown>)
			: {};
	const documents = Array.isArray(record.documents) ? record.documents : [];

	return {
		invoiceCaseId: typeof record.id === "string" ? record.id : null,
		status: typeof record.status === "string" ? record.status : null,
		documentCount: documents.length,
	};
}

export function buildTgemInvoiceProcessingTraceInput(input: {
	invoiceCaseId: string;
	documentId: string;
	organizationId: string;
	siteId?: string | null;
	actorUserId: string;
	actorType: "user" | "whatsapp";
	source: TgemInvoiceSource;
	content: Buffer | (() => Promise<Buffer>);
	contentType: string;
	byteSize?: number | null;
}) {
	return {
		invoiceCaseId: input.invoiceCaseId,
		documentId: input.documentId,
		organizationId: input.organizationId,
		siteId: input.siteId ?? null,
		userId: input.actorUserId,
		actorType: input.actorType,
		source: input.source,
		contentType: input.contentType,
		byteSize:
			input.byteSize ??
			(Buffer.isBuffer(input.content) ? input.content.byteLength : null),
		contentAccess: Buffer.isBuffer(input.content) ? "buffer" : "deferred",
	};
}

export function buildTgemInvoiceProcessingTraceOutput(output: unknown) {
	const record =
		output && typeof output === "object"
			? (output as Record<string, unknown>)
			: {};

	return {
		provider: typeof record.provider === "string" ? record.provider : null,
		pageCount: typeof record.pageCount === "number" ? record.pageCount : null,
		lineItemCount:
			typeof record.lineItemCount === "number" ? record.lineItemCount : null,
		warningCount:
			typeof record.warningCount === "number" ? record.warningCount : null,
	};
}
