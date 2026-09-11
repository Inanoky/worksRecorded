export type TgemDashboardOcrBlock = {
	text: string;
	confidence: number | null;
	left: number;
	top: number;
	width: number;
	height: number;
	polygon: Array<{ x: number; y: number }>;
};

export type TgemDashboardInvoiceDocument = {
	id: string;
	contentType: string;
	originalFilename: string;
	storageProvider: string;
	documentPath: string;
	ocrPages: Array<{
		id: string;
		pageNumber: number;
		width: number | null;
		height: number | null;
		text: string | null;
		blocks: TgemDashboardOcrBlock[];
		status: string;
	}>;
};

export type TgemDashboardInvoice = {
	id: string;
	source: string;
	status: string;
	ocrStatus: string;
	extractionStatus: string;
	invoiceNumber: string | null;
	supplierName: string | null;
	supplierRegistrationNo: string | null;
	invoiceDate: string | null;
	dueDate: string | null;
	currency: string | null;
	subtotal: string | null;
	vat: string | null;
	total: string | null;
	bankAccount: string | null;
	reference: string | null;
	validationSummary: unknown;
	extractionSummary: unknown;
	createdAt: string;
	documents: TgemDashboardInvoiceDocument[];
	lines: Array<{
		id: string;
		lineNumber: number;
		description: string | null;
		quantity: string | null;
		unit: string | null;
		unitPrice: string | null;
		total: string | null;
		currency: string | null;
		suggestedCostCode: string | null;
		suggestedCategory: string | null;
		aiConfidence: number | null;
	}>;
	approvalSteps: Array<{
		id: string;
		stepOrder: number;
		role: string;
		status: string;
		comment: string | null;
		decidedAt: string | null;
	}>;
	auditEvents: Array<{
		id: string;
		actorType: string;
		eventType: string;
		fromStatus: string | null;
		toStatus: string | null;
		createdAt: string;
	}>;
};

export type TgemDashboardData = {
	invoices: TgemDashboardInvoice[];
};
