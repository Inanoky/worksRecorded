export type TgemOcrProvider = "google-document-ai" | "openai";

export const TGEM_INVOICE_TYPES = ["debit", "credit", "receipt"] as const;

export type TgemInvoiceType = (typeof TGEM_INVOICE_TYPES)[number];

export type TgemOcrPoint = {
	x: number;
	y: number;
};

export type TgemOcrBlock = {
	text: string;
	confidence: number | null;
	kind: "token" | "line";
	readingOrder: number;
	left: number;
	top: number;
	width: number;
	height: number;
	polygon: TgemOcrPoint[];
};

export type TgemOcrSourceAnchor = {
	pageNumber: number;
	left: number;
	top: number;
	width: number;
	height: number;
	polygon: TgemOcrPoint[];
};

export type TgemOcrPage = {
	pageNumber: number;
	width: number | null;
	height: number | null;
	text: string;
	blocks: TgemOcrBlock[];
	status: "complete" | "failed";
	errorMessage?: string;
};

export type TgemInvoiceOcrField = {
	rawText: string;
	value: string | number | null;
	confidence: number | null;
	sourceAnchor: TgemOcrSourceAnchor | null;
};

export type TgemInvoiceOcrLineItem = {
	productCode: string | null;
	description: string | null;
	quantity: number | null;
	unit: string | null;
	unitPrice: number | null;
	total: number | null;
	currency: string | null;
	confidence: number | null;
	sourceText: string;
};

export type TgemInvoiceOcrResult = {
	provider: TgemOcrProvider;
	pages: TgemOcrPage[];
	fields: Record<string, TgemInvoiceOcrField>;
	lineItems: TgemInvoiceOcrLineItem[];
};
