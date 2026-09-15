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

function approvalStep(
	input: Pick<
		TgemDashboardData["invoices"][number]["approvalSteps"][number],
		| "id"
		| "stepOrder"
		| "approvalRound"
		| "roleKey"
		| "approverUserId"
		| "approverName"
		| "status"
	> &
		Partial<TgemDashboardData["invoices"][number]["approvalSteps"][number]>,
) {
	return {
		role: null,
		templateRevision: 1,
		minimumInvoiceTotal: null,
		thresholdCurrency: null,
		comment: null,
		decidedAt: null,
		...input,
	};
}

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

		const tabs = await screen.findAllByRole("tab");
		expect(tabs[0]).toHaveAccessibleName(/All invoices/);
		expect(tabs[0]).toHaveAttribute("aria-selected", "true");
		expect(screen.getByTestId("tgem-invoice-register")).toBeInTheDocument();
		fireEvent.click(screen.getByRole("tab", { name: "Approval workspace" }));
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
		expect(screen.getByTestId("tgem-document-viewport")).toHaveClass(
			"h-[600px]",
		);
		expect(screen.getByTestId("tgem-document-card")).toBeInTheDocument();
		expect(screen.queryByTestId("tgem-ocr-overlay")).not.toBeInTheDocument();
		expect(screen.queryByLabelText("Recognized text")).not.toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "Text version" }));
		expect(screen.getByTestId("tgem-ocr-text-version")).toBeInTheDocument();
		expect(
			screen.getByDisplayValue(/Invoice Date: 18\/01\/24/),
		).toBeInTheDocument();
		expect(
			screen.queryByRole("img", { name: "tgem-invoice-fixture.png" }),
		).not.toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "Document" }));
		expect(
			screen.getByRole("img", { name: "tgem-invoice-fixture.png" }),
		).toBeInTheDocument();
		expect(screen.getByText("Demo invoice created")).toBeInTheDocument();
		expect(screen.getByLabelText("Choose invoice")).toBeInTheDocument();
	});

	it("shows a searchable invoice register with a preview drawer", async () => {
		jest.mocked(getTgemInvoiceDashboardData).mockResolvedValue({
			...dashboardData,
			invoices: [
				{
					...dashboardData.invoices[0],
					status: "in_approval",
					approvalRound: 1,
					approvalSteps: [
						approvalStep({
							id: "approval-step-current",
							stepOrder: 1,
							approvalRound: 1,
							roleKey: "project_review",
							approverUserId: "user-1",
							approverName: "Anna Bērziņa",
							status: "current",
						}),
					],
				},
				{
					...dashboardData.invoices[0],
					id: "case-2",
					invoiceNumber: "TG-2026-0719",
					supplierName: "Riga Concrete SIA",
					supplierRegistrationNo: "40003000000",
					status: "approved",
					total: "980.5",
					documents: [],
					lines: [],
					approvalSteps: [],
					auditEvents: [],
				},
			],
		});

		render(
			<TgemInvoiceApprovalDashboard
				siteId="site-1"
				organizationLanguage="en"
			/>,
		);

		expect(
			await screen.findByTestId("tgem-invoice-register"),
		).toBeInTheDocument();
		expect(screen.getByRole("tab", { name: /All invoices/ })).toHaveAttribute(
			"aria-selected",
			"true",
		);
		expect(screen.getByText("Invoices shown: 2 / 2")).toBeInTheDocument();

		fireEvent.change(screen.getByLabelText("Search by number or supplier"), {
			target: { value: "Riga Concrete" },
		});
		expect(screen.getByText("Invoices shown: 1 / 2")).toBeInTheDocument();
		expect(
			screen.getByRole("button", {
				name: "Invoice preview: TG-2026-0719",
			}),
		).toBeInTheDocument();

		fireEvent.change(screen.getByLabelText("Search by number or supplier"), {
			target: { value: "" },
		});
		fireEvent.change(screen.getByLabelText("Status"), {
			target: { value: "approved" },
		});
		expect(screen.getByText("Invoices shown: 1 / 2")).toBeInTheDocument();
		fireEvent.change(screen.getByLabelText("Status"), {
			target: { value: "all" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Waiting for me" }));
		expect(screen.getByText("Invoices shown: 1 / 2")).toBeInTheDocument();

		fireEvent.click(
			screen.getByRole("button", {
				name: "Invoice preview: TG-2026-0718",
			}),
		);
		expect(screen.getByRole("dialog")).toBeInTheDocument();
		expect(screen.getByText("Invoice preview")).toBeInTheDocument();
		expect(screen.getByText("Step 1 / 1")).toBeInTheDocument();

		fireEvent.click(
			screen.getByRole("button", { name: "Open in approval workspace" }),
		);
		expect(
			screen.queryByTestId("tgem-invoice-register"),
		).not.toBeInTheDocument();
		expect(screen.getByTestId("tgem-invoice-case-1")).toBeInTheDocument();
		expect(
			screen.getByRole("tab", { name: "Approval workspace" }),
		).toHaveAttribute("aria-selected", "true");
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
			provider: "openai",
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
		fireEvent.click(screen.getByRole("button", { name: "Add approval step" }));
		fireEvent.change(screen.getByLabelText("Review focus 1"), {
			target: { value: "budget_approval" },
		});
		fireEvent.change(screen.getByLabelText("Approver 1"), {
			target: { value: "user-2" },
		});
		fireEvent.change(screen.getByLabelText("Role or step label (optional) 1"), {
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
		fireEvent.click(screen.getByRole("tab", { name: "Apstiprināšanas skats" }));
		expect(
			screen.getByRole("button", { name: "Teksta versija" }),
		).toBeInTheDocument();
		fireEvent.click(
			screen.getByRole("button", {
				name: "Pievienot apstiprināšanas soli",
			}),
		);

		expect(
			screen.getByRole("option", { name: "Projekta pārbaude" }),
		).toBeInTheDocument();
		expect(
			screen.getByText(/atpazītie apjomi, cenas un kopsummas/),
		).toBeInTheDocument();
		expect(screen.getByText("Jāpārbauda")).toBeInTheDocument();
		expect(screen.getByText("Daudzums:")).toBeInTheDocument();
		expect(screen.getByText("Vienības cena:")).toBeInTheDocument();
		expect(screen.getByText("Izmaksu kods:")).toBeInTheDocument();
		expect(screen.getByText("Kategorija:")).toBeInTheDocument();
		expect(
			screen.getByText("Izveidots demonstrācijas rēķins"),
		).toBeInTheDocument();
		fireEvent.click(screen.getByRole("tab", { name: /Visi rēķini/ }));
		expect(
			screen.getByLabelText("Meklēt pēc numura vai piegādātāja"),
		).toBeInTheDocument();
		expect(screen.getByText("Pašreizējais apstiprinātājs")).toBeInTheDocument();
	});

	it("localizes the invoice list and line items in Russian", async () => {
		jest.mocked(getTgemInvoiceDashboardData).mockResolvedValue(dashboardData);

		render(
			<TgemInvoiceApprovalDashboard
				siteId="site-1"
				organizationLanguage="ru"
			/>,
		);

		fireEvent.click(await screen.findByRole("tab", { name: "Согласование" }));
		expect(await screen.findByText("Требует проверки")).toBeInTheDocument();
		expect(screen.getByText("Количество:")).toBeInTheDocument();
		expect(screen.getByText("Цена за единицу:")).toBeInTheDocument();
		expect(screen.getByText("Код затрат:")).toBeInTheDocument();
		expect(screen.getByText("Категория:")).toBeInTheDocument();
		expect(
			screen.getByText("Создан демонстрационный счет"),
		).toBeInTheDocument();
		fireEvent.click(screen.getByRole("tab", { name: /Все счета/ }));
		expect(
			screen.getByLabelText("Поиск по номеру или поставщику"),
		).toBeInTheDocument();
		expect(screen.getByText("Текущий согласующий")).toBeInTheDocument();
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
			await screen.findByRole("tab", { name: "Approval workspace" }),
		);
		fireEvent.click(
			await screen.findByRole("button", { name: "Start approval path" }),
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
		fireEvent.click(screen.getByRole("button", { name: "Save coordinators" }));

		await waitFor(() => {
			expect(mockSaveWorkflowManagers).toHaveBeenCalledWith({
				siteId: "site-1",
				userIds: ["user-2"],
			});
		});
	});

	it("lets active organization members edit the sequence without manager status", async () => {
		jest.mocked(getTgemInvoiceDashboardData).mockResolvedValue({
			...dashboardData,
			approvalSetup: {
				...dashboardData.approvalSetup,
				canManageWorkflow: true,
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
		expect(screen.queryByText("Read only")).not.toBeInTheDocument();
		expect(screen.getByLabelText("Review focus 1")).toBeEnabled();
		expect(screen.getByLabelText("Approver 1")).toBeEnabled();
		expect(
			screen.getByRole("button", { name: "Save approval flow" }),
		).toBeInTheDocument();
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

		fireEvent.click(
			await screen.findByRole("tab", { name: "Approval workspace" }),
		);
		expect(
			await screen.findByText("skipped in a previous round"),
		).toBeInTheDocument();
		expect(screen.getByText(/Amount reference: 50000 EUR/)).toBeInTheDocument();
	});

	it("shows the current owner, final approver, remaining path, and prior rounds", async () => {
		jest.mocked(getTgemInvoiceDashboardData).mockResolvedValue({
			...dashboardData,
			currentUserId: "vjaceslavs",
			approvalSetup: {
				...dashboardData.approvalSetup,
				users: [
					{ id: "deivids", name: "Deivids", role: "Site manager" },
					{ id: "vjaceslavs", name: "VJACESLAVS", role: "Reviewer" },
					{ id: "aleksandrs", name: "Aleksandrs", role: "Director" },
				],
				template: {
					id: "template-2",
					revision: 2,
					currency: "EUR",
					steps: [
						{
							id: "template-step-1",
							stepOrder: 1,
							roleKey: "project_review",
							role: "Site manager review",
							approverUserId: "deivids",
							minimumInvoiceTotal: null,
						},
						{
							id: "template-step-2",
							stepOrder: 2,
							roleKey: "financial_review",
							role: "Second review",
							approverUserId: "vjaceslavs",
							minimumInvoiceTotal: null,
						},
						{
							id: "template-step-3",
							stepOrder: 3,
							roleKey: "senior_approval",
							role: "Main approval",
							approverUserId: "aleksandrs",
							minimumInvoiceTotal: null,
						},
					],
				},
			},
			invoices: [
				{
					...dashboardData.invoices[0],
					status: "in_approval",
					approvalRound: 2,
					approvalSteps: [
						approvalStep({
							id: "round-1-step-1",
							stepOrder: 1,
							approvalRound: 1,
							roleKey: "project_review",
							approverUserId: "deivids",
							approverName: "Deivids",
							status: "changes_requested",
							comment: "Correct the extracted unit prices",
							decidedAt: "2026-07-02T08:00:00.000Z",
						}),
						approvalStep({
							id: "round-2-step-1",
							stepOrder: 1,
							approvalRound: 2,
							roleKey: "project_review",
							role: "Site manager review",
							approverUserId: "deivids",
							approverName: "Deivids",
							status: "approved",
							comment: "Prices checked",
							decidedAt: "2026-07-03T08:00:00.000Z",
						}),
						approvalStep({
							id: "round-2-step-2",
							stepOrder: 2,
							approvalRound: 2,
							roleKey: "financial_review",
							role: "Second review",
							approverUserId: "vjaceslavs",
							approverName: "VJACESLAVS",
							status: "current",
						}),
						approvalStep({
							id: "round-2-step-3",
							stepOrder: 3,
							approvalRound: 2,
							roleKey: "senior_approval",
							role: "Main approval",
							approverUserId: "aleksandrs",
							approverName: "Aleksandrs",
							status: "waiting",
						}),
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

		fireEvent.click(
			await screen.findByRole("tab", { name: "Approval workspace" }),
		);
		expect(await screen.findByText("Currently with")).toBeInTheDocument();
		expect(screen.getByText(/Step 2 of 3/)).toBeInTheDocument();
		expect(screen.getByText("Final approver")).toBeInTheDocument();
		expect(screen.getAllByText("VJACESLAVS").length).toBeGreaterThan(1);
		expect(screen.getAllByText("Aleksandrs").length).toBeGreaterThan(1);
		expect(
			screen.getByRole("button", { name: "Approve and pass forward" }),
		).toBeInTheDocument();

		fireEvent.click(screen.getByText(/Previous approval-round history/));
		expect(
			screen.getByText("Correct the extracted unit prices"),
		).toBeInTheDocument();
	});
});
