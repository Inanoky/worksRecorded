import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import type { TgemDashboardData } from "@/lib/tgem-invoice-approval/dashboard-types";
import {
	getTgemInvoiceDashboardData,
	runTgemInvoiceOcr,
} from "@/server/actions/tgem-invoice-actions";
import { TgemInvoiceApprovalDashboard } from "./TgemInvoiceApprovalDashboard";

const mockStartUpload = jest.fn();
const mockSaveApprovalTemplate = jest.fn();
const mockSaveWorkflowManagers = jest.fn();
const mockSubmitForApproval = jest.fn();
const mockDecideApproval = jest.fn();

jest.mock("@/server/actions/tgem-invoice-actions", () => ({
	getTgemInvoiceDashboardData: jest.fn(),
	runTgemInvoiceOcr: jest.fn(),
}));

jest.mock("@/server/actions/tgem-invoice-approval-actions", () => ({
	saveTgemApprovalTemplate: (...args: unknown[]) =>
		mockSaveApprovalTemplate(...args),
	saveTgemWorkflowManagers: (...args: unknown[]) =>
		mockSaveWorkflowManagers(...args),
	submitTgemInvoiceForApproval: (...args: unknown[]) =>
		mockSubmitForApproval(...args),
	decideTgemInvoiceApproval: (...args: unknown[]) =>
		mockDecideApproval(...args),
}));

jest.mock("@/lib/utils/UploadthingsComponents", () => ({
	useUploadThing: () => ({
		startUpload: (...args: unknown[]) => mockStartUpload(...args),
		isUploading: false,
	}),
}));

const dashboardData: TgemDashboardData = {
	currentUserId: "user-1",
	approvalSetup: {
		canManageWorkflow: true,
		canManageWorkflowManagers: true,
		ownerUserId: "user-1",
		workflowManagerUserIds: [],
		users: [
			{ id: "user-1", name: "Anna Bērziņa", role: "Project manager" },
			{ id: "user-2", name: "Jānis Ozols", role: "Accountant" },
		],
		template: null,
	},
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
			fieldAnchors: {
				invoiceDate: {
					pageNumber: 1,
					left: 0.6,
					top: 0.31,
					width: 0.25,
					height: 0.02,
					polygon: [],
				},
			},
			createdAt: "2026-07-01T00:00:00.000Z",
			approvalRound: 0,
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
									kind: "token",
									readingOrder: 0,
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
		mockSaveApprovalTemplate.mockResolvedValue({ id: "template-1" });
		mockSaveWorkflowManagers.mockResolvedValue({
			siteId: "site-1",
			userIds: [],
		});
		mockSubmitForApproval.mockResolvedValue({
			invoiceCaseId: "case-1",
			approvalRound: 1,
		});
		mockDecideApproval.mockResolvedValue({
			invoiceCaseId: "case-1",
			decision: "approve",
		});
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
		expect(screen.getByTitle("Invoice Date: 18/01/24")).toHaveAttribute(
			"data-ocr-kind",
			"token",
		);
		fireEvent.click(
			screen.getByRole("button", {
				name: "Show in document: Invoice date",
			}),
		);
		expect(
			screen.getByTestId("tgem-field-source-highlight"),
		).toBeInTheDocument();
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

	it("configures an explicit project approval sequence", async () => {
		jest.mocked(getTgemInvoiceDashboardData).mockResolvedValue(dashboardData);

		render(
			<TgemInvoiceApprovalDashboard
				siteId="site-1"
				organizationLanguage="en"
			/>,
		);

		fireEvent.click(
			await screen.findByRole("button", { name: "Approval setup" }),
		);
		fireEvent.click(screen.getByRole("button", { name: "Add checkpoint" }));
		fireEvent.change(screen.getByLabelText("Responsibility type 1"), {
			target: { value: "budget_approval" },
		});
		fireEvent.change(screen.getByLabelText("Choose responsible person 1"), {
			target: { value: "user-2" },
		});
		fireEvent.change(screen.getByLabelText("Custom job title (optional) 1"), {
			target: { value: "Commercial manager" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Save approval flow" }));

		await waitFor(() => {
			expect(mockSaveApprovalTemplate).toHaveBeenCalledWith({
				siteId: "site-1",
				currency: "EUR",
				steps: [
					{
						approverUserId: "user-2",
						roleKey: "budget_approval",
						roleLabel: "Commercial manager",
						minimumInvoiceTotal: "",
					},
				],
			});
		});
	});

	it("localizes TGEM approval responsibilities in Latvian", async () => {
		jest.mocked(getTgemInvoiceDashboardData).mockResolvedValue(dashboardData);

		render(
			<TgemInvoiceApprovalDashboard
				siteId="site-1"
				organizationLanguage="lv"
			/>,
		);

		fireEvent.click(
			await screen.findByRole("button", {
				name: "Apstiprināšanas iestatījumi",
			}),
		);
		fireEvent.click(
			screen.getByRole("button", { name: "Pievienot kontroles punktu" }),
		);

		expect(
			screen.getByRole("option", { name: "Projekta pārbaude" }),
		).toBeInTheDocument();
		expect(
			screen.getByText(/Apstiprina piegādi, apjomus, projektu/),
		).toBeInTheDocument();
	});

	it("submits a review-ready invoice through the configured flow", async () => {
		const configuredData: TgemDashboardData = {
			...dashboardData,
			approvalSetup: {
				...dashboardData.approvalSetup,
				template: {
					id: "template-1",
					revision: 1,
					currency: "EUR",
					steps: [
						{
							id: "template-step-1",
							stepOrder: 1,
							roleKey: "budget_approval",
							role: "Commercial manager",
							approverUserId: "user-2",
							minimumInvoiceTotal: null,
						},
					],
				},
			},
		};
		jest.mocked(getTgemInvoiceDashboardData).mockResolvedValue(configuredData);

		render(
			<TgemInvoiceApprovalDashboard
				siteId="site-1"
				organizationLanguage="en"
			/>,
		);

		fireEvent.click(
			await screen.findByRole("button", { name: "Send for approval" }),
		);
		await waitFor(() => {
			expect(mockSubmitForApproval).toHaveBeenCalledWith({
				invoiceCaseId: "case-1",
			});
		});
	});

	it("lets the project owner grant TGEM workflow-manager access", async () => {
		jest.mocked(getTgemInvoiceDashboardData).mockResolvedValue(dashboardData);

		render(
			<TgemInvoiceApprovalDashboard
				siteId="site-1"
				organizationLanguage="en"
			/>,
		);

		fireEvent.click(
			await screen.findByRole("button", { name: "Approval setup" }),
		);
		const managerCheckbox = screen.getByRole("checkbox", {
			name: /Jānis Ozols/,
		});
		fireEvent.click(managerCheckbox);
		fireEvent.click(screen.getByRole("button", { name: "Save managers" }));

		await waitFor(() => {
			expect(mockSaveWorkflowManagers).toHaveBeenCalledWith({
				siteId: "site-1",
				userIds: ["user-2"],
			});
		});
	});

	it("shows workflow configuration read-only to ordinary organization members", async () => {
		jest.mocked(getTgemInvoiceDashboardData).mockResolvedValue({
			...dashboardData,
			approvalSetup: {
				...dashboardData.approvalSetup,
				canManageWorkflow: false,
				canManageWorkflowManagers: false,
				template: {
					id: "template-1",
					revision: 1,
					currency: "EUR",
					steps: [
						{
							id: "template-step-1",
							stepOrder: 1,
							roleKey: "financial_review",
							role: "Accountant",
							approverUserId: "user-2",
							minimumInvoiceTotal: null,
						},
					],
				},
			},
		});

		render(
			<TgemInvoiceApprovalDashboard
				siteId="site-1"
				organizationLanguage="en"
			/>,
		);

		fireEvent.click(
			await screen.findByRole("button", { name: "Approval setup" }),
		);
		expect(screen.getByText("Read only")).toBeInTheDocument();
		expect(screen.getByLabelText("Responsibility type 1")).toBeDisabled();
		expect(screen.getByLabelText("Choose responsible person 1")).toBeDisabled();
		expect(
			screen.queryByRole("button", { name: "Save approval flow" }),
		).not.toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: "Save managers" }),
		).not.toBeInTheDocument();
	});

	it("shows conditional approval thresholds and skipped checkpoints", async () => {
		jest.mocked(getTgemInvoiceDashboardData).mockResolvedValue({
			...dashboardData,
			invoices: [
				{
					...dashboardData.invoices[0],
					status: "in_approval",
					approvalRound: 1,
					approvalSteps: [
						{
							id: "approval-step-1",
							stepOrder: 1,
							approvalRound: 1,
							roleKey: "budget_approval",
							role: "Commercial manager",
							approverUserId: "user-2",
							approverName: "Jānis Ozols",
							templateRevision: 2,
							minimumInvoiceTotal: null,
							thresholdCurrency: null,
							status: "current",
							comment: null,
							decidedAt: null,
						},
						{
							id: "approval-step-2",
							stepOrder: 2,
							approvalRound: 1,
							roleKey: "senior_approval",
							role: "Company owner",
							approverUserId: "user-3",
							approverName: "Ilze Kalniņa",
							templateRevision: 2,
							minimumInvoiceTotal: "50000",
							thresholdCurrency: "EUR",
							status: "skipped",
							comment: null,
							decidedAt: null,
						},
					],
				},
			],
		});

		render(
			<TgemInvoiceApprovalDashboard
				siteId="site-1"
				organizationLanguage="en"
			/>,
		);

		expect(await screen.findByText("not required")).toBeInTheDocument();
		expect(screen.getByText(/Required from 50000 EUR/)).toBeInTheDocument();
		expect(
			screen.getByText(/Authorizes high-value invoices/),
		).toBeInTheDocument();
	});
});
