import {
	getUploadThingUfsUrl,
	type UploadThingUrlLike,
} from "@/lib/utils/uploadthing-file-url";

const TEMPORARY_META_HOST = "lookaside.fbsbx.com";

export const TGEM_INVOICE_STORAGE_PROVIDER = "uploadthing" as const;

export type TgemInvoiceStorageMetadata = {
	storageProvider: typeof TGEM_INVOICE_STORAGE_PROVIDER;
	canonicalUrl: string;
};

export function getPersistableTgemInvoiceUrl(
	file: UploadThingUrlLike | null | undefined,
) {
	const url = getUploadThingUfsUrl(file);
	if (!url) {
		throw new Error(
			"TGEM invoice storage requires a permanent UploadThing ufsUrl",
		);
	}

	const parsed = new URL(url);
	if (parsed.hostname === TEMPORARY_META_HOST) {
		throw new Error(
			"Temporary Meta media URLs cannot be persisted for TGEM invoices",
		);
	}

	if (parsed.protocol !== "https:") {
		throw new Error("TGEM invoice storage URLs must use HTTPS");
	}

	return url;
}

export function toTgemInvoiceStorageMetadata(
	file: UploadThingUrlLike | null | undefined,
): TgemInvoiceStorageMetadata {
	return {
		storageProvider: TGEM_INVOICE_STORAGE_PROVIDER,
		canonicalUrl: getPersistableTgemInvoiceUrl(file),
	};
}

export function getTgemInvoiceDocumentPath(
	invoiceCaseId: string,
	documentId: string,
) {
	return `/api/tgem/invoices/${encodeURIComponent(invoiceCaseId)}/documents/${encodeURIComponent(documentId)}`;
}
