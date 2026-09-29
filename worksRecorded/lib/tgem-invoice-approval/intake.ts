import {
	getPersistableTgemInvoiceUrl,
	type TgemInvoiceStorageMetadata,
} from "@/lib/tgem-invoice-approval/storage";
import type { UploadThingUrlLike } from "@/lib/utils/uploadthing-file-url";

export const TGEM_INVOICE_SOURCES = ["dashboard", "whatsapp", "email"] as const;
export type TgemInvoiceSource = (typeof TGEM_INVOICE_SOURCES)[number];
export const TGEM_INVOICE_CONTENT_TYPES = [
	"application/pdf",
	"image/jpeg",
	"image/png",
	"image/webp",
] as const;
export const MAX_TGEM_INVOICE_BYTES = 16 * 1024 * 1024;

export type TgemInvoiceSourceContext = {
	sender?: string | null;
	subject?: string | null;
	cc?: string[];
	description?: string | null;
};

export type TgemInvoiceIntakeInput = {
	organizationId: string;
	siteId?: string | null;
	submittedByUserId?: string | null;
	source: TgemInvoiceSource;
	sourceMessageId?: string | null;
	sourceSender?: string | null;
	storageFile: UploadThingUrlLike;
	storageKey?: string | null;
	originalFilename: string;
	contentType: string;
	byteSize?: number | null;
	sha256?: string | null;
	sourceContext?: TgemInvoiceSourceContext | null;
};

export type TgemInvoiceIntakeRecord = {
	organizationId: string;
	siteId: string | null;
	submittedByUserId: string | null;
	idempotencyKey: string;
	source: TgemInvoiceSource;
	sourceMessageId: string | null;
	sourceSender: string | null;
	sourceContext: TgemInvoiceSourceContext | null;
	status: "received";
	ocrStatus: "pending";
	extractionStatus: "pending";
	document: TgemInvoiceStorageMetadata & {
		storageKey: string | null;
		originalFilename: string;
		contentType: string;
		byteSize: number | null;
		sha256: string | null;
		source: TgemInvoiceSource;
	};
};

export function buildTgemInvoiceIdempotencyKey(input: {
	organizationId: string;
	source: TgemInvoiceSource;
	sourceMessageId?: string | null;
	storageKey?: string | null;
	canonicalUrl?: string | null;
}) {
	const sourceIdentifier =
		input.sourceMessageId || input.storageKey || input.canonicalUrl;
	if (!sourceIdentifier) {
		throw new Error(
			"TGEM invoice intake requires a source message ID or storage identifier",
		);
	}

	return `tgem-invoice:${input.organizationId}:${input.source}:${sourceIdentifier}`;
}

export function isSupportedTgemInvoiceContentType(contentType: string) {
	const normalized = contentType.trim().toLowerCase();
	return TGEM_INVOICE_CONTENT_TYPES.some(
		(supportedType) => supportedType === normalized,
	);
}

export function normalizeTgemInvoiceIntake(
	input: TgemInvoiceIntakeInput,
): TgemInvoiceIntakeRecord {
	const originalFilename = input.originalFilename.trim();
	const contentType = input.contentType.trim().toLowerCase();

	if (!input.organizationId.trim()) {
		throw new Error("TGEM invoice intake requires an organization ID");
	}
	if (!originalFilename) {
		throw new Error("TGEM invoice intake requires an original filename");
	}
	if (!isSupportedTgemInvoiceContentType(contentType)) {
		throw new Error(
			`Unsupported TGEM invoice content type: ${contentType || "<empty>"}`,
		);
	}

	const canonicalUrl = getPersistableTgemInvoiceUrl(input.storageFile);
	const idempotencyKey = buildTgemInvoiceIdempotencyKey({
		organizationId: input.organizationId,
		source: input.source,
		sourceMessageId: input.sourceMessageId,
		storageKey: input.storageKey,
		canonicalUrl,
	});

	return {
		organizationId: input.organizationId,
		siteId: input.siteId ?? null,
		submittedByUserId: input.submittedByUserId ?? null,
		idempotencyKey,
		source: input.source,
		sourceMessageId: input.sourceMessageId ?? null,
		sourceSender: input.sourceSender ?? null,
		sourceContext: input.sourceContext ?? null,
		status: "received",
		ocrStatus: "pending",
		extractionStatus: "pending",
		document: {
			storageProvider: "uploadthing",
			canonicalUrl,
			storageKey: input.storageKey ?? null,
			originalFilename,
			contentType,
			byteSize: input.byteSize ?? null,
			sha256: input.sha256 ?? null,
			source: input.source,
		},
	};
}
