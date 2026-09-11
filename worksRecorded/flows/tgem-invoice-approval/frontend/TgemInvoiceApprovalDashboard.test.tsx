import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import type { TgemDashboardData } from "@/lib/tgem-invoice-approval/dashboard-types";
import {
	getTgemInvoiceDashboardData,
	runTgemInvoiceOcr,
} from "@/server/actions/tgem-invoice-actions";
import { TgemInvoiceApprovalDashboard } from "./TgemInvoiceApprovalDashboard";

const mockStartUpload = jest.fn();

jest.mock("@/server/actions/tgem-invoice-actions", () => ({
	getTgemInvoiceDashboardData: jest.fn(),
	runTgemInvoiceOcr: jest.fn(),
}));

jest.mock("@/lib/utils/UploadthingsComponents", () => ({
	useUploadThing: () => ({
		startUpload: (...args: unknown[]) => mockStartUpload(...args),
		isUploading: false,
	}),
}));

const dashboardData: TgemDashboardData = {
	invoices: [
		{
			id: "case-1",
			source: "fixture",
			status: "needs_review",
			ocrStatus: "complete",
			extractionStatus: "complete",
			invoiceNumber: "TG-2026-0718",
			supplierName: "Baltic Electrical Systems SIA",
			supplierRegistrationNo: "40203188910",
			invoiceDate: "2026-07-01T00:00:00.000Z",
			dueDate: "2026-07-15T00:00:00.000Z",
			currency: "EUR",
			subtotal: "18420",
			vat: "3868.2",
			total: "22288.2",
			bankAccount: "LV80HABA0551047890201",
			reference: "Stage 2 electrical installation",
			validationSummary: null,
			extractionSummary: null,
			createdAt: "2026-07-01T00:00:00.000Z",
			documents: [
				{
					id: "document-1",
					contentType: "image/png",
					originalFilename: "tgem-invoice-fixture.png",
					storageProvider: "fixture",
					documentPath: "/api/tgem/invoices/case-1/documents/document-1",
					ocrPages: [
						{
							id: "ocr-page-1",
							pageNumber: 1,
							width: 3024,
							height: 4032,
							text: "Invoice Date: 18/01/24\nTotal incl. tax 216.00 GBP",
							blocks: [
								{
									text: "Invoice Date: 18/01/24",
									confidence: 0.97,
									left: 0.6,
									top: 0.31,
									width: 0.25,
									height: 0.02,
									polygon: [],
								},
							],
							status: "complete",
						},
					],
				},
			],
			lines: [
				{
					id: "line-1",
					lineNumber: 1,
					description: "Cable tray installation, level 2",
					quantity: "420",
					unit: "m",
					unitPrice: "18",
					total: "7560",
					currency: "EUR",
					suggestedCostCode: "1000-EL",
					suggestedCategory: "Electrical works",
					aiConfidence: 0.96,
				},
			],
			approvalSteps: [],
			auditEvents: [
				{
					id: "audit-1",
					actorType: "fixture",
					eventType: "fixture_created",
					fromStatus: null,
					toStatus: "needs_review",
					createdAt: "2026-07-01T00:00:00.000Z",
				},
			],
		},
	],
};

describe("TgemInvoiceApprovalDashboard", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("renders the authorized server-backed invoice fixture", async () => {
		jest.mocked(getTgemInvoiceDashboardData).mockResolvedValue(dashboardData);

		render(
			<TgemInvoiceApprovalDashboard
				siteId="site-1"
				organizationLanguage="en"
			/>,
		);

		expect(
			await screen.findByTestId("tgem-invoice-case-1"),
		).toBeInTheDocument();
		expect(
			screen.getAllByText("Baltic Electrical Systems SIA").length,
		).toBeGreaterThanOrEqual(2);
		expect(
			screen.getByText("Cable tray installation, level 2"),
		).toBeInTheDocument();
		expect(
			screen.getByRole("img", { name: "tgem-invoice-fixture.png" }),
		).toBeInTheDocument();
		expect(screen.getByTestId("tgem-ocr-overlay")).toBeInTheDocument();
		expect(
			screen.getByDisplayValue(/Invoice Date: 18\/01\/24/),
		).toBeInTheDocument();
		expect(screen.getByText("fixture created")).toBeInTheDocument();
		expect(screen.getByLabelText("Choose invoice")).toBeInTheDocument();
	});

	it("uploads an invoice, runs OCR, and enters the review-ready state", async () => {
		jest.mocked(getTgemInvoiceDashboardData).mockResolvedValue(dashboardData);
		mockStartUpload.mockResolvedValue([
			{
				serverData: {
					invoiceCaseId: "case-1",
					documentId: "document-1",
				},
			},
		]);
		jest.mocked(runTgemInvoiceOcr).mockResolvedValue({
			provider: "google-document-ai",
			pageCount: 1,
			lineItemCount: 5,
			warningCount: 1,
		});

		render(
			<TgemInvoiceApprovalDashboard
				siteId="site-1"
				organizationLanguage="en"
			/>,
		);

		const input = await screen.findByLabelText("Choose invoice");
		const file = new File(["invoice"], "materials.jpg", {
			type: "image/jpeg",
		});
		fireEvent.change(input, { target: { files: [file] } });

		await waitFor(() => {
			expect(mockStartUpload).toHaveBeenCalledWith([file], {
				siteId: "site-1",
			});
		});
		await waitFor(() => {
			expect(runTgemInvoiceOcr).toHaveBeenCalledWith({
				invoiceCaseId: "case-1",
				documentId: "document-1",
			});
		});
		expect(
			await screen.findByText(/The invoice is ready for review/),
		).toBeInTheDocument();
	});
});
