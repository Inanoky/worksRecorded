import {
	act,
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from "@testing-library/react";

import type { TgemDashboardData } from "@/lib/tgem-invoice-approval/dashboard-types";
import {
	getTgemInvoiceDashboardData,
	runTgemInvoiceOcr,
} from "@/server/actions/tgem-invoice-actions";
import { TgemCostCodeSettings } from "./TgemCostCodeSettings";

jest.mock("@/server/actions/tgem-project-actions", () => ({
	deleteTgemProject: jest.fn(),
}));

import { TgemInvoiceApprovalDashboard } from "./TgemInvoiceApprovalDashboard";

const mockRefresh = jest.fn();
jest.mock("next/navigation", () => ({
	useRouter: () => ({ refresh: mockRefresh }),
}));

const mockStartUpload = jest.fn();
const mockSaveApprovalTemplate = jest.fn();
const mockSaveWorkflowManagers = jest.fn();
const mockSubmitForApproval = jest.fn();
const mockDecideApproval = jest.fn();
const mockAssignProject = jest.fn();
const mockUpdateInvoiceAccounting = jest.fn();
const mockUpdateInvoiceDetail = jest.fn();
const mockDeleteInvoices = jest.fn();
const mockDownloadInvoiceWorkbook = jest.fn();

jest.mock("@/lib/tgem-invoice-approval/register-export", () => ({
	downloadTgemInvoiceWorkbook: (...args: unknown[]) =>
		mockDownloadInvoiceWorkbook(...args),
}));

jest.mock("@/server/actions/tgem-invoice-delete-actions", () => ({
	deleteTgemInvoices: (...args: unknown[]) => mockDeleteInvoices(...args),
}));

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
	assignTgemInvoiceProject: (...args: unknown[]) => mockAssignProject(...args),
}));

jest.mock("@/server/actions/tgem-cost-code-actions", () => ({
	updateTgemInvoiceAccounting: (...args: unknown[]) =>
		mockUpdateInvoiceAccounting(...args),
}));

jest.mock("@/server/actions/tgem-invoice-details-actions", () => ({
	updateTgemInvoiceDetail: (...args: unknown[]) =>
		mockUpdateInvoiceDetail(...args),
}));

jest.mock("@/lib/utils/UploadthingsComponents", () => ({
	useUploadThing: () => ({
		startUpload: (...args: unknown[]) => mockStartUpload(...args),
		isUploading: false,
	}),
}));

const dashboardData: TgemDashboardData = {
	currentUserId: "user-1",
	costCodes: [
		{ id: "cost-code-1", code: "A123", name: "Administrative expense" },
		{ id: "cost-code-2", code: "021C", name: "Materials expense" },
	],
	projects: [
		{ id: "site-1", name: "Riga office" },
		{ id: "site-2", name: "Jurmala warehouse" },
	],
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
			project: { id: "site-1", name: "Riga office" },
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
			invoiceType: "debit",
			costCode: null,
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
			receivedAt: "2026-07-01T00:00:00.000Z",
			approvedAt: null,
			createdAt: "2026-07-01T00:00:00.000Z",
			updatedAt: "2026-07-01T00:00:00.000Z",
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
					costCode: null,
					category: null,
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

const baseApprovalSetup = dashboardData.approvalSetup;
if (!baseApprovalSetup) throw new Error("Expected approval setup test data");

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
		mockDeleteInvoices
			.mockReset()
			.mockImplementation(async (targets: { id: string }[]) => ({
				ok: true,
				deletedIds: targets.map((item) => item.id),
			}));
		mockDownloadInvoiceWorkbook.mockReset().mockResolvedValue(undefined);
		mockUpdateInvoiceDetail
			.mockReset()
			.mockImplementation(async (input: { value: string }) => ({
				ok: true,
				value: input.value.trim() || null,
				updatedAt: "2026-09-16T12:00:00.000Z",
				unchanged: false,
			}));
		window.history.replaceState(null, "", "/");
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
		mockAssignProject.mockResolvedValue({
			invoiceCaseId: "case-1",
			project: { id: "site-1", name: "Riga office" },
			status: "needs_review",
			unchanged: false,
		});
		mockUpdateInvoiceAccounting.mockResolvedValue({
			invoiceCaseId: "case-1",
			unchanged: false,
		});
	});

	it("requires confirmation for single deletion and supports cancellation", async () => {
		jest.mocked(getTgemInvoiceDashboardData).mockResolvedValue(dashboardData);
		render(<TgemInvoiceApprovalDashboard organizationLanguage="en" />);
		const row = await screen.findByTestId("tgem-register-invoice-case-1");
		fireEvent.click(
			within(row).getByRole("button", { name: "Delete invoice: TG-2026-0718" }),
		);
		const dialog = screen.getByRole("alertdialog");
		expect(
			within(dialog).getByText("Are you sure you want to delete?"),
		).toBeInTheDocument();
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		expect(mockDeleteInvoices).not.toHaveBeenCalled();
		fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
		expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
		expect(mockDeleteInvoices).not.toHaveBeenCalled();
		fireEvent.click(
			within(row).getByRole("button", { name: "Delete invoice: TG-2026-0718" }),
		);
		fireEvent.click(screen.getByRole("button", { name: "Yes, delete" }));
		await waitFor(() =>
			expect(mockDeleteInvoices).toHaveBeenCalledWith([
				{ id: "case-1", updatedAt: dashboardData.invoices[0].updatedAt },
			]),
		);
		await waitFor(() =>
			expect(
				screen.queryByTestId("tgem-register-invoice-case-1"),
			).not.toBeInTheDocument(),
		);
		expect(screen.getByRole("status")).toHaveTextContent("Invoices deleted: 1");
	});

	it("puts checkboxes first and bulk-deletes only the current filtered selection", async () => {
		const invoices = [
			dashboardData.invoices[0],
			{ ...dashboardData.invoices[0], id: "case-2", invoiceNumber: "SECOND" },
		];
		jest
			.mocked(getTgemInvoiceDashboardData)
			.mockResolvedValue({ ...dashboardData, invoices });
		render(<TgemInvoiceApprovalDashboard organizationLanguage="en" />);
		await screen.findByTestId("tgem-invoice-register");
		const table = screen.getByRole("table");
		const selectAll = within(table).getByRole("checkbox", {
			name: "Select all visible invoices",
		});
		expect(
			screen.queryByRole("button", { name: /Delete selected/ }),
		).not.toBeInTheDocument();
		expect(
			within(screen.getAllByRole("columnheader")[0]).getByRole("checkbox"),
		).toBe(selectAll);
		fireEvent.click(
			within(screen.getByTestId("tgem-register-invoice-case-1")).getByRole(
				"checkbox",
			),
		);
		expect(selectAll).toHaveAttribute("data-state", "indeterminate");
		expect(
			screen.getByRole("button", { name: "Delete selected (1)" }),
		).toBeVisible();
		fireEvent.click(
			within(screen.getByTestId("tgem-register-invoice-case-1")).getByRole(
				"checkbox",
			),
		);
		expect(
			screen.queryByRole("button", { name: /Delete selected/ }),
		).not.toBeInTheDocument();
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		fireEvent.click(selectAll);
		expect(
			screen.getByRole("button", { name: "Delete selected (2)" }),
		).toBeEnabled();
		fireEvent.change(
			screen.getByRole("textbox", {
				name: "Search number, supplier, registration, reference, or bank account",
			}),
			{ target: { value: "SECOND" } },
		);
		expect(
			screen.queryByRole("button", { name: /Delete selected/ }),
		).not.toBeInTheDocument();
		fireEvent.click(selectAll);
		fireEvent.click(
			screen.getByRole("button", { name: "Delete selected (1)" }),
		);
		expect(mockDeleteInvoices).not.toHaveBeenCalled();
		expect(screen.getByRole("alertdialog")).not.toHaveTextContent(
			"TG-2026-0718",
		);
		fireEvent.click(screen.getByRole("button", { name: "Yes, delete" }));
		await waitFor(() =>
			expect(mockDeleteInvoices).toHaveBeenCalledWith([
				{ id: "case-2", updatedAt: invoices[1].updatedAt },
			]),
		);
	});

	it("submits all checked invoices together", async () => {
		const invoices = [
			dashboardData.invoices[0],
			{ ...dashboardData.invoices[0], id: "case-2", invoiceNumber: "SECOND" },
		];
		jest
			.mocked(getTgemInvoiceDashboardData)
			.mockResolvedValue({ ...dashboardData, invoices });
		render(<TgemInvoiceApprovalDashboard organizationLanguage="en" />);
		await screen.findByTestId("tgem-invoice-register");
		fireEvent.click(
			within(screen.getByRole("table")).getByRole("checkbox", {
				name: "Select all visible invoices",
			}),
		);
		fireEvent.click(
			screen.getByRole("button", { name: "Delete selected (2)" }),
		);
		fireEvent.click(screen.getByRole("button", { name: "Yes, delete" }));
		await waitFor(() =>
			expect(mockDeleteInvoices).toHaveBeenCalledWith(
				invoices.map(({ id, updatedAt }) => ({ id, updatedAt })),
			),
		);
	});

	it("retains records and confirmation when deletion fails, allowing retry", async () => {
		jest.mocked(getTgemInvoiceDashboardData).mockResolvedValue(dashboardData);
		mockDeleteInvoices.mockRejectedValueOnce(
			new Error("Private database details"),
		);
		render(<TgemInvoiceApprovalDashboard organizationLanguage="en" />);
		const row = await screen.findByTestId("tgem-register-invoice-case-1");
		fireEvent.click(
			within(row).getByRole("button", { name: "Delete invoice: TG-2026-0718" }),
		);
		fireEvent.click(screen.getByRole("button", { name: "Yes, delete" }));
		expect(await screen.findByRole("alert")).toHaveTextContent(
			"Could not delete invoices. Please try again.",
		);
		expect(
			screen.queryByText("Private database details"),
		).not.toBeInTheDocument();
		expect(row).toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "Yes, delete" }));
		await waitFor(() =>
			expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument(),
		);
	});

	it("supports mobile deletion with Latvian confirmation and guards pending requests", async () => {
		jest.mocked(getTgemInvoiceDashboardData).mockResolvedValue(dashboardData);
		let complete: (value: unknown) => void = () => {};
		mockDeleteInvoices.mockImplementationOnce(
			() =>
				new Promise((resolve) => {
					complete = resolve;
				}),
		);
		render(<TgemInvoiceApprovalDashboard organizationLanguage="lv" />);
		const mobile = await screen.findByTestId(
			"tgem-register-mobile-invoice-case-1",
		);
		const card = mobile.parentElement;
		if (!card) throw new Error("Expected mobile invoice card");
		expect(within(card).getByRole("checkbox")).toBeInTheDocument();
		fireEvent.click(
			within(card).getByRole("button", { name: "Dzēst rēķinu: TG-2026-0718" }),
		);
		expect(screen.getByRole("alertdialog")).toHaveTextContent(
			"Vai tiešām vēlaties dzēst?",
		);
		fireEvent.click(screen.getByRole("button", { name: "Jā, dzēst" }));
		expect(screen.getByRole("button", { name: "Dzēš…" })).toBeDisabled();
		expect(screen.getByRole("button", { name: "Atcelt" })).toBeDisabled();
		fireEvent.click(screen.getByRole("button", { name: "Dzēš…" }));
		expect(mockDeleteInvoices).toHaveBeenCalledTimes(1);
		await act(async () => complete({ ok: true, deletedIds: ["case-1"] }));
	});

	it("renders the authorized server-backed invoice fixture", async () => {
		jest.mocked(getTgemInvoiceDashboardData).mockResolvedValue(dashboardData);

		render(
			<TgemInvoiceApprovalDashboard
				siteId="site-1"
				initialView="approval"
				organizationLanguage="en"
			/>,
		);

		expect(await screen.findByTestId("tgem-invoice-case-1")).toHaveClass(
			"border-[#7CA5E8]",
			"bg-[#F1F6FF]",
			"shadow-[inset_3px_0_0_#214EA3]",
		);
		expect(
			screen.getAllByText("Baltic Electrical Systems SIA").length,
		).toBeGreaterThanOrEqual(2);
		expect(
			screen.getByText("Cable tray installation, level 2"),
		).toBeInTheDocument();
		expect(screen.getByText("Total excl. VAT")).toBeInTheDocument();
		expect(screen.getByText("€18,420.00")).toBeInTheDocument();
		expect(
			screen.getByRole("img", { name: "tgem-invoice-fixture.png" }),
		).toBeInTheDocument();
		expect(screen.getByTestId("tgem-document-viewport")).toHaveClass(
			"h-[600px]",
		);
		expect(screen.getByTestId("tgem-document-card")).toBeInTheDocument();
		expect(screen.getByTestId("tgem-document-title-icon")).toHaveClass(
			"text-tgem-primary",
		);
		expect(screen.getByTestId("tgem-approval-title-icon")).toHaveClass(
			"text-tgem-primary",
		);
		expect(
			screen.getByRole("region", { name: "Invoice image viewer" }),
		).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Zoom in" })).toBeInTheDocument();
		expect(screen.queryByTestId("tgem-ocr-overlay")).not.toBeInTheDocument();
		expect(screen.queryByLabelText("Recognized text")).not.toBeInTheDocument();
		const textVersionButton = screen.getByRole("button", {
			name: "Text version",
		});
		expect(textVersionButton).toHaveClass(
			"bg-tgem-primary/10",
			"text-tgem-primary",
		);
		fireEvent.click(textVersionButton);
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

	it.each(
		[
			{
				field: "invoiceNumber",
				label: "Invoice number",
				initial: "TG-2026-0718",
				value: "CORRECTED-42",
			},
			{
				field: "invoiceDate",
				label: "Invoice date",
				initial: "2026-07-01",
				value: "2026-09-16",
			},
			{
				field: "dueDate",
				label: "Due date",
				initial: "2026-07-15",
				value: "2026-09-30",
			},
		].flatMap((detail) =>
			(["approval", "register"] as const).map((view) => ({ ...detail, view })),
		),
	)(
		"edits AI-interpreted $field in $view only on explicit click and saves that field",
		async ({ field, label, initial, value, view }) => {
			jest.mocked(getTgemInvoiceDashboardData).mockResolvedValue(dashboardData);
			render(
				<TgemInvoiceApprovalDashboard
					siteId="site-1"
					initialView={view}
					organizationLanguage="en"
				/>,
			);
			if (view === "register") {
				fireEvent.click(
					await screen.findByRole("button", {
						name: "Invoice preview: TG-2026-0718",
					}),
				);
			}
			const edit = await screen.findByRole("button", {
				name: `Edit: ${label}`,
			});
			expect(
				screen.queryByLabelText(label, { selector: "input" }),
			).not.toBeInTheDocument();
			fireEvent.click(edit);
			const input = screen.getByLabelText(label, { selector: "input" });
			expect(input).toHaveValue(initial);
			expect(input).toHaveFocus();
			fireEvent.change(input, { target: { value } });
			fireEvent.click(screen.getByRole("button", { name: `Save: ${label}` }));
			await waitFor(() =>
				expect(mockUpdateInvoiceDetail).toHaveBeenCalledWith({
					invoiceCaseId: "case-1",
					field,
					value,
					expectedUpdatedAt: dashboardData.invoices[0].updatedAt,
				}),
			);
			await waitFor(() =>
				expect(
					screen.queryByLabelText(label, { selector: "input" }),
				).not.toBeInTheDocument(),
			);
			expect(screen.getByText("Saved.")).toBeVisible();
		},
	);

	it("shows localized edit controls and allows clearing an optional date", async () => {
		jest.mocked(getTgemInvoiceDashboardData).mockResolvedValue(dashboardData);
		render(
			<TgemInvoiceApprovalDashboard
				siteId="site-1"
				initialView="approval"
				organizationLanguage="lv"
			/>,
		);
		fireEvent.click(
			await screen.findByRole("button", { name: "Rediģēt: Apmaksas termiņš" }),
		);
		fireEvent.change(
			screen.getByLabelText("Apmaksas termiņš", { selector: "input" }),
			{ target: { value: "" } },
		);
		fireEvent.click(
			screen.getByRole("button", { name: "Saglabāt: Apmaksas termiņš" }),
		);
		await waitFor(() =>
			expect(mockUpdateInvoiceDetail).toHaveBeenCalledWith(
				expect.objectContaining({ field: "dueDate", value: "" }),
			),
		);
		expect(await screen.findByText("Saglabāts.")).toBeVisible();
	});

	it("keeps failed edits for retry without exposing internal errors", async () => {
		jest.mocked(getTgemInvoiceDashboardData).mockResolvedValue(dashboardData);
		mockUpdateInvoiceDetail.mockRejectedValueOnce(
			new Error("Internal database failure"),
		);
		render(
			<TgemInvoiceApprovalDashboard
				siteId="site-1"
				initialView="approval"
				organizationLanguage="en"
			/>,
		);
		fireEvent.click(
			await screen.findByRole("button", { name: "Edit: Invoice number" }),
		);
		fireEvent.change(screen.getByRole("textbox", { name: "Invoice number" }), {
			target: { value: "Retry-number" },
		});
		fireEvent.click(
			screen.getByRole("button", { name: "Save: Invoice number" }),
		);
		expect(await screen.findByText("Could not save. Try again.")).toBeVisible();
		expect(
			screen.queryByText("Internal database failure"),
		).not.toBeInTheDocument();
		expect(screen.getByRole("textbox", { name: "Invoice number" })).toHaveValue(
			"Retry-number",
		);
		fireEvent.click(
			screen.getByRole("button", { name: "Save: Invoice number" }),
		);
		expect(await screen.findByText("Saved.")).toBeVisible();
		expect(mockUpdateInvoiceDetail).toHaveBeenCalledTimes(2);
	});

	it("cancels without saving and supports Escape", async () => {
		jest.mocked(getTgemInvoiceDashboardData).mockResolvedValue(dashboardData);
		render(
			<TgemInvoiceApprovalDashboard
				siteId="site-1"
				initialView="approval"
				organizationLanguage="en"
			/>,
		);
		fireEvent.click(
			await screen.findByRole("button", { name: "Edit: Invoice number" }),
		);
		fireEvent.change(screen.getByRole("textbox", { name: "Invoice number" }), {
			target: { value: "Unsaved" },
		});
		fireEvent.click(
			screen.getByRole("button", { name: "Cancel: Invoice number" }),
		);
		fireEvent.click(
			screen.getByRole("button", { name: "Edit: Invoice number" }),
		);
		expect(screen.getByRole("textbox", { name: "Invoice number" })).toHaveValue(
			"TG-2026-0718",
		);
		fireEvent.keyDown(screen.getByRole("textbox", { name: "Invoice number" }), {
			key: "Escape",
		});
		expect(
			screen.queryByRole("textbox", { name: "Invoice number" }),
		).not.toBeInTheDocument();
		expect(mockUpdateInvoiceDetail).not.toHaveBeenCalled();
	});

	it("keeps the draft after a stale-version rejection and shows recovery guidance", async () => {
		jest.mocked(getTgemInvoiceDashboardData).mockResolvedValue(dashboardData);
		mockUpdateInvoiceDetail.mockResolvedValue({ ok: false, error: "conflict" });
		render(
			<TgemInvoiceApprovalDashboard
				siteId="site-1"
				initialView="approval"
				organizationLanguage="en"
			/>,
		);
		fireEvent.click(
			await screen.findByRole("button", { name: "Edit: Invoice number" }),
		);
		fireEvent.change(screen.getByRole("textbox", { name: "Invoice number" }), {
			target: { value: "Keep draft" },
		});
		fireEvent.click(
			screen.getByRole("button", { name: "Save: Invoice number" }),
		);
		expect(
			await screen.findByText(
				"This invoice changed. Cancel and reopen the edit before saving.",
			),
		).toBeVisible();
		expect(screen.getByRole("textbox", { name: "Invoice number" })).toHaveValue(
			"Keep draft",
		);
	});

	it("does not erase an open edit or update its captured version when the dashboard polls", async () => {
		jest.useFakeTimers();
		try {
			jest.mocked(getTgemInvoiceDashboardData).mockResolvedValue(dashboardData);
			render(
				<TgemInvoiceApprovalDashboard
					siteId="site-1"
					initialView="approval"
					organizationLanguage="en"
				/>,
			);
			await act(async () => {
				await Promise.resolve();
			});
			fireEvent.click(
				screen.getByRole("button", { name: "Edit: Invoice number" }),
			);
			fireEvent.change(
				screen.getByRole("textbox", { name: "Invoice number" }),
				{ target: { value: "My draft" } },
			);
			jest.mocked(getTgemInvoiceDashboardData).mockResolvedValue({
				...dashboardData,
				invoices: [
					{
						...dashboardData.invoices[0],
						invoiceNumber: "Other edit",
						updatedAt: "2026-09-16T14:00:00.000Z",
					},
				],
			});
			await act(async () => {
				jest.advanceTimersByTime(5000);
			});
			expect(
				screen.getByRole("textbox", { name: "Invoice number" }),
			).toHaveValue("My draft");
			fireEvent.click(
				screen.getByRole("button", { name: "Save: Invoice number" }),
			);
			await act(async () => {
				await Promise.resolve();
			});
			expect(mockUpdateInvoiceDetail).toHaveBeenCalledWith(
				expect.objectContaining({
					value: "My draft",
					expectedUpdatedAt: dashboardData.invoices[0].updatedAt,
				}),
			);
		} finally {
			jest.useRealTimers();
		}
	});

	it("disables edits while AI processing is running", async () => {
		jest.mocked(getTgemInvoiceDashboardData).mockResolvedValue({
			...dashboardData,
			invoices: [{ ...dashboardData.invoices[0], status: "processing" }],
		});
		render(
			<TgemInvoiceApprovalDashboard
				siteId="site-1"
				initialView="approval"
				organizationLanguage="en"
			/>,
		);
		expect(
			await screen.findByRole("button", { name: "Edit: Invoice number" }),
		).toBeDisabled();
		expect(
			screen.getByRole("button", { name: "Edit: Invoice date" }),
		).toBeDisabled();
		expect(
			screen.getByRole("button", { name: "Edit: Due date" }),
		).toBeDisabled();
	});

	it("reports a successful save separately from a failed refresh", async () => {
		jest
			.mocked(getTgemInvoiceDashboardData)
			.mockResolvedValueOnce(dashboardData)
			.mockRejectedValue(new Error("Read unavailable"));
		render(
			<TgemInvoiceApprovalDashboard
				siteId="site-1"
				initialView="approval"
				organizationLanguage="en"
			/>,
		);
		fireEvent.click(
			await screen.findByRole("button", { name: "Edit: Invoice number" }),
		);
		fireEvent.change(screen.getByRole("textbox", { name: "Invoice number" }), {
			target: { value: "Saved-number" },
		});
		fireEvent.click(
			screen.getByRole("button", { name: "Save: Invoice number" }),
		);
		expect(
			await screen.findByText(
				"Changes saved, but the view could not refresh. Reload the page.",
			),
		).toBeVisible();
		expect(screen.getByText("Saved-number")).toBeVisible();
		expect(mockUpdateInvoiceDetail).toHaveBeenCalledTimes(1);
	});

	it("places TGEM branding beside the invoice-approval page heading", async () => {
		jest.mocked(getTgemInvoiceDashboardData).mockResolvedValue(dashboardData);
		render(
			<TgemInvoiceApprovalDashboard
				siteId="site-1"
				initialView="approval"
				organizationLanguage="lv"
			/>,
		);
		const heading = screen.getByRole("heading", {
			name: "Rēķinu apstiprināšana",
		});
		const logo = screen.getByRole("img", { name: "TGEM" });
		expect(heading.parentElement?.parentElement).toContainElement(logo);
		expect(heading.parentElement?.parentElement).toHaveClass("justify-between");
		await screen.findByRole("button", { name: "Rediģēt: Rēķina numurs" });
	});

	it("updates invoice debit or credit type and organization cost code", async () => {
		jest.mocked(getTgemInvoiceDashboardData).mockResolvedValue(dashboardData);

		render(
			<TgemInvoiceApprovalDashboard
				siteId="site-1"
				initialView="approval"
				organizationLanguage="en"
			/>,
		);

		const editType = await screen.findByRole("button", {
			name: "Edit invoice type",
		});
		expect(screen.getByText("Debit invoice")).toBeInTheDocument();
		expect(
			screen.queryByRole("combobox", { name: "Invoice type" }),
		).not.toBeInTheDocument();
		expect(screen.queryByText("Reference")).not.toBeInTheDocument();
		expect(
			screen.queryByText("Accounting classification"),
		).not.toBeInTheDocument();
		expect(
			screen.getByText("Invoice type").parentElement?.parentElement,
		).toHaveClass("rounded-md", "border", "bg-background");
		expect(
			screen.getByText("Cost code").parentElement?.parentElement,
		).toHaveClass("rounded-md", "border", "bg-background");
		fireEvent.click(editType);
		fireEvent.change(
			await screen.findByRole("combobox", { name: "Invoice type" }),
			{
				target: { value: "credit" },
			},
		);
		fireEvent.change(screen.getByRole("combobox", { name: "Cost code" }), {
			target: { value: "A123" },
		});
		fireEvent.click(
			screen.getByRole("button", { name: "Save classification" }),
		);

		await waitFor(() =>
			expect(mockUpdateInvoiceAccounting).toHaveBeenCalledWith({
				invoiceCaseId: "case-1",
				invoiceType: "credit",
				costCode: "A123",
				expectedUpdatedAt: "2026-07-01T00:00:00.000Z",
			}),
		);
	});

	it.each([
		{
			language: "en",
			codes: [],
			help: "About cost codes",
			message:
				"No cost codes have been added yet. Add them in Project settings to select a code for this invoice.",
			link: "Open Project settings",
		},
		{
			language: "lv",
			codes: [],
			help: "Par izmaksu kodiem",
			message:
				"Vēl nav pievienots neviens izmaksu kods. Pievienojiet tos projekta iestatījumos, lai varētu izvēlēties kodu rēķinam.",
			link: "Atvērt projekta iestatījumus",
		},
		{
			language: "en",
			codes: dashboardData.costCodes,
			help: "About cost codes",
			message:
				"Customize your organization’s cost codes and their meanings in Project settings.",
			link: "Open Project settings",
		},
	])(
		"shows localized cost-code help and a project-aware settings link: $language",
		async ({ language, codes, help, message, link }) => {
			jest
				.mocked(getTgemInvoiceDashboardData)
				.mockResolvedValue({ ...dashboardData, costCodes: codes });
			render(
				<TgemInvoiceApprovalDashboard
					siteId="site-1"
					initialView="approval"
					organizationLanguage={language}
				/>,
			);
			const trigger = await screen.findByRole("button", { name: help });
			expect(screen.queryByText(message)).not.toBeInTheDocument();
			fireEvent.click(trigger);
			expect(await screen.findByText(message)).toBeVisible();
			expect(screen.getByRole("link", { name: link })).toHaveAttribute(
				"href",
				"/dashboard/invoices/settings?project=site-1",
			);
			fireEvent.keyDown(screen.getByRole("dialog", { name: help }), {
				key: "Escape",
			});
			await waitFor(() =>
				expect(
					screen.queryByRole("link", { name: link }),
				).not.toBeInTheDocument(),
			);
		},
	);

	it("cancels a type edit without discarding the manually selected cost code", async () => {
		jest.mocked(getTgemInvoiceDashboardData).mockResolvedValue(dashboardData);
		render(
			<TgemInvoiceApprovalDashboard
				siteId="site-1"
				initialView="approval"
				organizationLanguage="en"
			/>,
		);
		fireEvent.click(
			await screen.findByRole("button", { name: "Edit invoice type" }),
		);
		fireEvent.change(screen.getByRole("combobox", { name: "Invoice type" }), {
			target: { value: "credit" },
		});
		fireEvent.change(screen.getByRole("combobox", { name: "Cost code" }), {
			target: { value: "A123" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Cancel type edit" }));
		expect(
			screen.queryByRole("combobox", { name: "Invoice type" }),
		).not.toBeInTheDocument();
		expect(screen.getByText("Debit invoice")).toBeInTheDocument();
		expect(screen.getByRole("combobox", { name: "Cost code" })).toHaveValue(
			"A123",
		);
		fireEvent.click(
			screen.getByRole("button", { name: "Save classification" }),
		);
		await waitFor(() =>
			expect(mockUpdateInvoiceAccounting).toHaveBeenCalledWith(
				expect.objectContaining({ invoiceType: "debit", costCode: "A123" }),
			),
		);
	});

	it.each(["Supplier", "Invoice date", "Due date", "Total"])(
		"toggles sorting from the %s column header",
		async (label) => {
			const high = {
				...dashboardData.invoices[0],
				id: "high",
				invoiceNumber: "INV-10",
				project: { id: "p2", name: "Zulu" },
				supplierName: "Zulu",
				invoiceDate: "2026-09-01T00:00:00.000Z",
				dueDate: "2026-09-30T00:00:00.000Z",
				total: "1000",
				status: "in_approval",
				approvalRound: 1,
				approvalSteps: [
					approvalStep({
						id: "step-high",
						stepOrder: 1,
						roleKey: "project_review",
						approverUserId: "user-1",
						approverName: "Zane",
						status: "current",
						approvalRound: 1,
					}),
				],
			};
			const low = {
				...high,
				id: "low",
				invoiceNumber: "INV-2",
				project: { id: "p1", name: "Alpha" },
				supplierName: "Alpha",
				invoiceDate: "2025-12-31T00:00:00.000Z",
				dueDate: "2026-01-01T00:00:00.000Z",
				total: "9",
				status: "approved",
				approvalSteps: [
					approvalStep({
						id: "step-low",
						stepOrder: 1,
						roleKey: "project_review",
						approverUserId: "user-2",
						approverName: "Anna",
						status: "current",
						approvalRound: 1,
					}),
				],
			};
			jest
				.mocked(getTgemInvoiceDashboardData)
				.mockResolvedValue({ ...dashboardData, invoices: [high, low] });
			render(
				<TgemInvoiceApprovalDashboard
					siteId="site-1"
					organizationLanguage="en"
				/>,
			);
			const button = await screen.findByRole("button", {
				name: `Sort ascending: ${label}`,
			});
			const order = () =>
				screen
					.getAllByTestId(/^tgem-register-invoice-/)
					.map((row) => row.getAttribute("data-testid"));
			expect(order()).toEqual([
				"tgem-register-invoice-high",
				"tgem-register-invoice-low",
			]);
			fireEvent.click(button);
			expect(button.closest("th")).toHaveAttribute("aria-sort", "ascending");
			expect(order()).toEqual([
				"tgem-register-invoice-low",
				"tgem-register-invoice-high",
			]);
			fireEvent.click(
				screen.getByRole("button", { name: `Sort descending: ${label}` }),
			);
			expect(button.closest("th")).toHaveAttribute("aria-sort", "descending");
			expect(order()).toEqual([
				"tgem-register-invoice-high",
				"tgem-register-invoice-low",
			]);
		},
	);

	it("keeps the hidden sort fields as plain columns and removes their mobile sort options", async () => {
		render(
			<TgemInvoiceApprovalDashboard
				siteId="site-1"
				organizationLanguage="en"
			/>,
		);
		await screen.findByTestId("tgem-invoice-register");
		for (const label of [
			"Invoice number",
			"Project",
			"Status",
			"Current approver",
		]) {
			const header = screen.getByRole("columnheader", { name: label });
			expect(within(header).queryByRole("button")).not.toBeInTheDocument();
			expect(header).not.toHaveAttribute("aria-sort");
			expect(
				within(screen.getByLabelText("Sort by")).queryByRole("option", {
					name: label,
				}),
			).not.toBeInTheDocument();
		}
		expect(
			within(screen.getByLabelText("Sort by"))
				.getAllByRole("option")
				.map((option) => option.textContent),
		).toEqual([
			"Default order",
			"Supplier",
			"Invoice date",
			"Due date",
			"Total",
		]);
	});

	it("places selection before cost code and shows saved prices without VAT on desktop and mobile", async () => {
		jest.mocked(getTgemInvoiceDashboardData).mockResolvedValue({
			...dashboardData,
			invoices: [
				{
					...dashboardData.invoices[0],
					id: "coded",
					costCode: "A123",
					subtotal: "100",
					total: "121",
				},
				{
					...dashboardData.invoices[0],
					id: "empty",
					costCode: null,
					subtotal: null,
				},
				{
					...dashboardData.invoices[0],
					id: "zero",
					costCode: "021C",
					subtotal: "0",
				},
			],
		});
		render(
			<TgemInvoiceApprovalDashboard
				siteId="site-1"
				organizationLanguage="en"
			/>,
		);
		await screen.findByTestId("tgem-invoice-register");
		expect(
			screen
				.getAllByRole("columnheader")
				.slice(1, 3)
				.map((header) => header.textContent),
		).toEqual(["Cost code", "Invoice number"]);
		expect(
			screen.getByRole("columnheader", { name: "Price without VAT" }),
		).toBeInTheDocument();
		const cells = within(
			screen.getByTestId("tgem-register-invoice-coded"),
		).getAllByRole("cell");
		expect(within(cells[0]).getByRole("checkbox")).toBeInTheDocument();
		expect(cells[1]).toHaveTextContent("A123");
		expect(cells[7].textContent).toMatch(/100\.00/);
		expect(cells[8].textContent).toMatch(/121\.00/);
		const emptyCells = within(
			screen.getByTestId("tgem-register-invoice-empty"),
		).getAllByRole("cell");
		expect(emptyCells[1]).toHaveTextContent("—");
		expect(emptyCells[7]).toHaveTextContent("—");
		expect(
			within(screen.getByTestId("tgem-register-invoice-zero")).getAllByRole(
				"cell",
			)[7].textContent,
		).toMatch(/0\.00/);
		const mobile = within(
			screen.getByTestId("tgem-register-mobile-invoice-coded"),
		);
		expect(mobile.getByText("Cost code: A123")).toBeInTheDocument();
		expect(mobile.getByText(/Price without VAT/).textContent).toMatch(
			/100\.00/,
		);
	});

	it("applies sorting to filtered invoices and the mobile cards, with a default-order reset", async () => {
		jest.mocked(getTgemInvoiceDashboardData).mockResolvedValue({
			...dashboardData,
			invoices: [
				{
					...dashboardData.invoices[0],
					id: "large",
					invoiceNumber: "Large",
					total: "1000",
				},
				{
					...dashboardData.invoices[0],
					id: "small",
					invoiceNumber: "Small",
					total: "9",
				},
				{
					...dashboardData.invoices[0],
					id: "excluded",
					invoiceNumber: "Excluded",
					total: "1",
					supplierName: "Other supplier",
				},
			],
		});
		render(
			<TgemInvoiceApprovalDashboard
				siteId="site-1"
				organizationLanguage="en"
			/>,
		);
		await screen.findByTestId("tgem-invoice-register");
		fireEvent.change(
			screen.getByLabelText(
				"Search number, supplier, registration, reference, or bank account",
			),
			{
				target: { value: "Baltic" },
			},
		);
		fireEvent.change(screen.getByLabelText("Sort by"), {
			target: { value: "total" },
		});
		const mobileOrder = () =>
			screen
				.getAllByTestId(/^tgem-register-mobile-invoice-/)
				.map((row) => row.getAttribute("data-testid"));
		expect(mobileOrder()).toEqual([
			"tgem-register-mobile-invoice-small",
			"tgem-register-mobile-invoice-large",
		]);
		expect(screen.getByText("Invoices shown: 2 / 3")).toBeVisible();
		fireEvent.click(screen.getByRole("button", { name: "Sort descending" }));
		expect(mobileOrder()).toEqual([
			"tgem-register-mobile-invoice-large",
			"tgem-register-mobile-invoice-small",
		]);
		fireEvent.change(screen.getByLabelText("Sort by"), {
			target: { value: "" },
		});
		expect(
			screen.queryByRole("button", { name: "Sort ascending" }),
		).not.toBeInTheDocument();
		expect(mobileOrder()).toEqual([
			"tgem-register-mobile-invoice-large",
			"tgem-register-mobile-invoice-small",
		]);
	});

	it("edits type and cost code in the drawer and refreshes both the drawer and register", async () => {
		const refreshed = {
			...dashboardData,
			invoices: [
				{
					...dashboardData.invoices[0],
					invoiceType: "credit" as const,
					costCode: "A123",
					updatedAt: "2026-09-16T12:00:00.000Z",
				},
			],
		};
		jest
			.mocked(getTgemInvoiceDashboardData)
			.mockResolvedValueOnce(dashboardData)
			.mockResolvedValue(refreshed);
		render(
			<TgemInvoiceApprovalDashboard
				siteId="site-1"
				organizationLanguage="en"
			/>,
		);
		fireEvent.click(
			await screen.findByRole("button", {
				name: "Invoice preview: TG-2026-0718",
			}),
		);
		const drawer = within(screen.getByRole("dialog"));
		expect(drawer.getByText("Invoice details")).toBeInTheDocument();
		expect(drawer.getByText("Debit invoice")).toBeInTheDocument();
		expect(
			drawer.queryByRole("combobox", { name: "Invoice type" }),
		).not.toBeInTheDocument();
		fireEvent.click(drawer.getByRole("button", { name: "About cost codes" }));
		expect(
			screen.getByRole("link", { name: "Open Project settings" }),
		).toHaveAttribute("href", "/dashboard/invoices/settings?project=site-1");
		fireEvent.keyDown(
			screen.getByRole("link", { name: "Open Project settings" }),
			{ key: "Escape" },
		);
		expect(screen.getByRole("dialog")).toBeInTheDocument();
		fireEvent.click(drawer.getByRole("button", { name: "Edit invoice type" }));
		fireEvent.change(drawer.getByRole("combobox", { name: "Invoice type" }), {
			target: { value: "credit" },
		});
		fireEvent.change(drawer.getByRole("combobox", { name: "Cost code" }), {
			target: { value: "A123" },
		});
		fireEvent.click(
			drawer.getByRole("button", { name: "Save classification" }),
		);
		await waitFor(() =>
			expect(mockUpdateInvoiceAccounting).toHaveBeenCalledWith({
				invoiceCaseId: "case-1",
				invoiceType: "credit",
				costCode: "A123",
				expectedUpdatedAt: dashboardData.invoices[0].updatedAt,
			}),
		);
		await waitFor(() =>
			expect(
				drawer.queryByRole("combobox", { name: "Invoice type" }),
			).not.toBeInTheDocument(),
		);
		expect(drawer.getByText("Credit invoice")).toBeVisible();
		expect(drawer.getByRole("combobox", { name: "Cost code" })).toHaveValue(
			"A123",
		);
		expect(
			within(screen.getByTestId("tgem-register-invoice-case-1")).getAllByRole(
				"cell",
				{ hidden: true },
			)[1],
		).toHaveTextContent("A123");
	});

	it("keeps the drawer open when cancelling a number edit", async () => {
		jest.mocked(getTgemInvoiceDashboardData).mockResolvedValue(dashboardData);
		render(
			<TgemInvoiceApprovalDashboard
				siteId="site-1"
				organizationLanguage="en"
			/>,
		);
		fireEvent.click(
			await screen.findByRole("button", {
				name: "Invoice preview: TG-2026-0718",
			}),
		);
		fireEvent.click(
			screen.getByRole("button", { name: "Edit: Invoice number" }),
		);
		const input = screen.getByRole("textbox", { name: "Invoice number" });
		fireEvent.change(input, { target: { value: "Unsaved" } });
		fireEvent.keyDown(input, { key: "Escape" });
		expect(screen.getByRole("dialog")).toBeInTheDocument();
		expect(
			screen.queryByRole("textbox", { name: "Invoice number" }),
		).not.toBeInTheDocument();
		expect(mockUpdateInvoiceDetail).not.toHaveBeenCalled();
	});

	it("blocks number and date edits in the drawer during processing", async () => {
		jest.mocked(getTgemInvoiceDashboardData).mockResolvedValue({
			...dashboardData,
			invoices: [
				{
					...dashboardData.invoices[0],
					status: "processing",
					extractionStatus: "processing",
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
			await screen.findByRole("button", {
				name: "Invoice preview: TG-2026-0718",
			}),
		);
		for (const label of ["Invoice number", "Invoice date", "Due date"]) {
			expect(
				screen.getByRole("button", { name: `Edit: ${label}` }),
			).toBeDisabled();
		}
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
		expect(screen.getByTestId("tgem-invoice-upload-icon")).toHaveClass(
			"bg-[#F1F6FF]",
			"text-tgem-primary",
		);
		expect(screen.getByText("Choose invoice").closest("label")).toHaveClass(
			"border-tgem-primary",
			"bg-tgem-primary",
			"text-white",
			"hover:bg-tgem-primary-hover",
			"shadow-sm",
		);
		expect(screen.getByText("Invoices shown: 2 / 2")).toBeInTheDocument();
		expect(screen.getByTestId("tgem-invoice-scope")).toHaveClass(
			"border-tgem-primary/20",
			"bg-tgem-primary/10",
		);

		fireEvent.change(
			screen.getByLabelText(
				"Search number, supplier, registration, reference, or bank account",
			),
			{
				target: { value: "Riga Concrete" },
			},
		);
		expect(screen.getByText("Invoices shown: 1 / 2")).toBeInTheDocument();
		expect(
			screen.getByRole("button", {
				name: "Invoice preview: TG-2026-0719",
			}),
		).toBeInTheDocument();

		fireEvent.change(
			screen.getByLabelText(
				"Search number, supplier, registration, reference, or bank account",
			),
			{
				target: { value: "" },
			},
		);
		fireEvent.click(screen.getByRole("button", { name: "Status" }));
		const statusOptionSearch = screen.getByRole("searchbox", {
			name: "Search options: Status",
		});
		fireEvent.change(statusOptionSearch, { target: { value: "approved" } });
		expect(
			screen.queryByRole("checkbox", { name: "In approval" }),
		).not.toBeInTheDocument();
		fireEvent.click(screen.getByRole("checkbox", { name: "Approved" }));
		expect(screen.getByText("Invoices shown: 1 / 2")).toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "Clear: Status" }));
		expect(screen.getByText("Invoices shown: 2 / 2")).toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "Waiting for me" }));
		expect(screen.getByText("Invoices shown: 1 / 2")).toBeInTheDocument();

		fireEvent.click(
			screen.getByRole("button", {
				name: "Invoice preview: TG-2026-0718",
			}),
		);
		expect(screen.getByRole("dialog")).toBeInTheDocument();
		expect(screen.getByText("Invoice preview")).toBeInTheDocument();
		expect(screen.getByTestId("tgem-invoice-project-label")).toHaveClass(
			"border-tgem-primary/20",
			"bg-tgem-primary/10",
		);
		expect(
			screen.getByRole("region", { name: "Invoice image viewer" }),
		).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Zoom in" })).toBeInTheDocument();
		expect(screen.getByText("Step 1 / 1")).toBeInTheDocument();

		const openApprovalButton = screen.getByRole("button", {
			name: "Open in approval workspace",
		});
		expect(openApprovalButton).toHaveClass("bg-tgem-primary");
		fireEvent.click(openApprovalButton);
		expect(
			screen.queryByTestId("tgem-invoice-register"),
		).not.toBeInTheDocument();
		expect(screen.getByTestId("tgem-invoice-case-1")).toBeInTheDocument();
		expect(window.location.search).toBe("?view=approval");
	});

	it("exports the sorted filtered rows regardless of checkbox selection", async () => {
		const secondInvoice = {
			...dashboardData.invoices[0],
			id: "case-2",
			invoiceNumber: "SECOND",
			supplierName: "Alpha Supplier",
			reference: "Other reference",
			total: "980.5",
			documents: [],
			lines: [],
			approvalSteps: [],
			auditEvents: [],
		};
		jest.mocked(getTgemInvoiceDashboardData).mockResolvedValue({
			...dashboardData,
			invoices: [dashboardData.invoices[0], secondInvoice],
		});
		render(
			<TgemInvoiceApprovalDashboard
				siteId="site-1"
				organizationLanguage="en"
			/>,
		);
		await screen.findByTestId("tgem-invoice-register");
		fireEvent.click(
			screen.getAllByRole("checkbox", {
				name: "Select invoice: TG-2026-0718",
			})[0],
		);
		fireEvent.click(
			screen.getByRole("button", { name: "Sort ascending: Supplier" }),
		);
		const exportButton = screen.getByRole("button", {
			name: "Export invoices: 2",
		});
		expect(exportButton).toHaveClass(
			"border-tgem-primary/30",
			"bg-tgem-primary/10",
			"shadow-sm",
		);
		fireEvent.click(exportButton);
		await waitFor(() => expect(mockDownloadInvoiceWorkbook).toHaveBeenCalled());
		expect(
			mockDownloadInvoiceWorkbook.mock.calls[0][0].map(
				(row: TgemDashboardData["invoices"][number]) => row.id,
			),
		).toEqual(["case-2", "case-1"]);

		mockDownloadInvoiceWorkbook.mockClear();
		fireEvent.change(
			screen.getByLabelText(
				"Search number, supplier, registration, reference, or bank account",
			),
			{ target: { value: "Stage 2 electrical" } },
		);
		expect(
			await screen.findByText("Invoices shown: 1 / 2"),
		).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: "Delete selected (1)" }),
		).not.toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "Export invoices: 1" }));
		await waitFor(() =>
			expect(mockDownloadInvoiceWorkbook).toHaveBeenCalledWith(
				[dashboardData.invoices[0]],
				expect.objectContaining({ language: "en" }),
			),
		);
	});

	it("keeps review-needed amber while processing is blue", async () => {
		jest.mocked(getTgemInvoiceDashboardData).mockResolvedValue({
			...dashboardData,
			invoices: [
				{ ...dashboardData.invoices[0], status: "needs_review" },
				{
					...dashboardData.invoices[0],
					id: "case-processing",
					invoiceNumber: "PROCESSING-1",
					status: "processing",
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

		const reviewRow = await screen.findByTestId("tgem-register-invoice-case-1");
		const processingRow = screen.getByTestId(
			"tgem-register-invoice-case-processing",
		);
		expect(within(reviewRow).getByText("Needs review")).toHaveClass(
			"bg-amber-50",
			"text-amber-700",
		);
		expect(within(processingRow).getByText("Processing")).toHaveClass(
			"bg-[#EEF4FF]",
			"text-tgem-primary",
		);
	});

	it("applies advanced ranges, shows removable chips, and preserves filters across views", async () => {
		jest.mocked(getTgemInvoiceDashboardData).mockResolvedValue({
			...dashboardData,
			invoices: [
				dashboardData.invoices[0],
				{
					...dashboardData.invoices[0],
					id: "case-2",
					invoiceNumber: "LOW",
					total: "100",
					subtotal: "80",
					documents: [],
					lines: [],
					approvalSteps: [],
					auditEvents: [],
				},
			],
		});
		const { rerender } = render(
			<TgemInvoiceApprovalDashboard
				siteId="site-1"
				initialView="register"
				organizationLanguage="en"
			/>,
		);
		await screen.findByTestId("tgem-invoice-register");
		const reservedFilterSlot = screen.getByTestId("tgem-active-filter-slot");
		expect(reservedFilterSlot).toBeEmptyDOMElement();
		expect(reservedFilterSlot).toHaveClass("min-h-7");
		fireEvent.click(screen.getByRole("button", { name: "More filters" }));
		fireEvent.change(screen.getByLabelText("Total incl. VAT: Minimum amount"), {
			target: { value: "20000" },
		});
		expect(screen.getByTestId("tgem-active-filter-slot")).toBe(
			reservedFilterSlot,
		);
		expect(screen.getByText("Invoices shown: 1 / 2")).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Total incl. VAT: 20000–…" }),
		).toBeInTheDocument();

		rerender(
			<TgemInvoiceApprovalDashboard
				siteId="site-1"
				initialView="approval"
				organizationLanguage="en"
			/>,
		);
		await screen.findByTestId("tgem-invoice-case-1");
		rerender(
			<TgemInvoiceApprovalDashboard
				siteId="site-1"
				initialView="register"
				organizationLanguage="en"
			/>,
		);
		expect(
			await screen.findByText("Invoices shown: 1 / 2"),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Total incl. VAT: 20000–…" }),
		).toBeInTheDocument();

		rerender(
			<TgemInvoiceApprovalDashboard
				siteId="site-2"
				initialView="register"
				organizationLanguage="en"
			/>,
		);
		expect(
			await screen.findByText("Invoices shown: 2 / 2"),
		).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: "Total incl. VAT: 20000–…" }),
		).not.toBeInTheDocument();
	});

	it("hides the dedicated WhatsApp processing panel while refresh continues", async () => {
		jest.useFakeTimers();
		const whatsappInvoice: TgemDashboardData["invoices"][number] = {
			...dashboardData.invoices[0],
			id: "case-whatsapp",
			source: "whatsapp",
			status: "processing",
			ocrStatus: "processing",
			extractionStatus: "pending",
			invoiceNumber: null,
			supplierName: null,
			documents: [
				{
					...dashboardData.invoices[0].documents[0],
					id: "document-whatsapp",
					contentType: "application/pdf",
					originalFilename: "whatsapp-invoice.pdf",
					ocrPages: [],
				},
			],
			lines: [],
			approvalSteps: [],
			auditEvents: [],
		};
		jest
			.mocked(getTgemInvoiceDashboardData)
			.mockResolvedValueOnce({
				...dashboardData,
				invoices: [whatsappInvoice],
			})
			.mockResolvedValue(dashboardData);

		const { unmount } = render(
			<TgemInvoiceApprovalDashboard
				siteId="site-1"
				organizationLanguage="en"
			/>,
		);

		try {
			await act(async () => {
				await Promise.resolve();
			});
			expect(
				screen.queryByTestId("tgem-whatsapp-processing"),
			).not.toBeInTheDocument();

			await act(async () => {
				jest.advanceTimersByTime(5_000);
				await Promise.resolve();
			});
			expect(getTgemInvoiceDashboardData).toHaveBeenCalledTimes(2);
			expect(
				screen.queryByTestId("tgem-whatsapp-processing"),
			).not.toBeInTheDocument();
		} finally {
			unmount();
			jest.useRealTimers();
		}
	});

	it("switches one dashboard between all projects and a project-specific flow", async () => {
		const allProjectsData: TgemDashboardData = {
			...dashboardData,
			approvalSetup: null,
			invoices: [
				dashboardData.invoices[0],
				{
					...dashboardData.invoices[0],
					id: "case-unassigned",
					invoiceNumber: "TG-UNASSIGNED",
					project: null,
				},
			],
		};
		jest
			.mocked(getTgemInvoiceDashboardData)
			.mockResolvedValueOnce(allProjectsData)
			.mockResolvedValue({
				...dashboardData,
				invoices: [
					{
						...dashboardData.invoices[0],
						project: { id: "site-2", name: "Jurmala warehouse" },
					},
				],
			});

		const { rerender } = render(
			<TgemInvoiceApprovalDashboard
				initialProjectFilter={null}
				organizationLanguage="en"
			/>,
		);

		expect(
			(await screen.findAllByText("TG-UNASSIGNED")).length,
		).toBeGreaterThan(0);
		expect(
			screen.getByRole("columnheader", { name: "Project" }),
		).toBeInTheDocument();
		expect(getTgemInvoiceDashboardData).toHaveBeenCalledWith(null);
		expect(screen.getByTestId("tgem-invoice-scope")).toHaveTextContent(
			"Invoice scope: All projects",
		);
		expect(screen.queryByRole("button", { name: "Approval setup" })).toBeNull();
		expect(screen.getByLabelText("Choose invoice")).toBeDisabled();
		expect(screen.queryByLabelText("Project")).toBeNull();
		expect(screen.queryByLabelText("Show invoices")).toBeNull();

		window.history.replaceState(null, "", "/?project=site-2");
		rerender(
			<TgemInvoiceApprovalDashboard
				initialProjectFilter="site-2"
				organizationLanguage="en"
			/>,
		);
		await waitFor(() => {
			expect(getTgemInvoiceDashboardData).toHaveBeenLastCalledWith("site-2");
		});
		expect(screen.getByLabelText("Choose invoice")).toBeEnabled();
		expect(screen.queryByRole("button", { name: "Approval setup" })).toBeNull();
		expect(screen.getByTestId("tgem-invoice-scope")).toHaveTextContent(
			"Invoice scope: Jurmala warehouse",
		);
		expect(window.location.search).toBe("?project=site-2");
	});

	it("assigns an unassigned invoice to a project with its current version", async () => {
		const unassignedInvoice = {
			...dashboardData.invoices[0],
			project: null,
		};
		jest.mocked(getTgemInvoiceDashboardData).mockResolvedValue({
			...dashboardData,
			approvalSetup: null,
			invoices: [unassignedInvoice],
		});

		render(
			<TgemInvoiceApprovalDashboard
				initialProjectFilter="unassigned"
				initialView="approval"
				organizationLanguage="en"
			/>,
		);
		fireEvent.change(await screen.findByLabelText("Assign project"), {
			target: { value: "site-2" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Save project" }));

		await waitFor(() => {
			expect(mockAssignProject).toHaveBeenCalledWith({
				invoiceCaseId: "case-1",
				projectId: "site-2",
				expectedUpdatedAt: "2026-07-01T00:00:00.000Z",
			});
		});
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
			<TgemCostCodeSettings
				initialCostCodes={[]}
				selectedProject={dashboardData.projects[0]}
				approvalSetup={baseApprovalSetup}
				organizationLanguage="en"
			/>,
		);

		fireEvent.click(screen.getByRole("button", { name: "Approval flow" }));
		fireEvent.click(screen.getByRole("button", { name: "Add approval step" }));
		fireEvent.change(screen.getByLabelText("Role 1"), {
			target: { value: "Finanšu direktors" },
		});
		fireEvent.change(screen.getByLabelText("Approver 1"), {
			target: { value: "user-2" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Save approval flow" }));

		await waitFor(() => {
			expect(mockSaveApprovalTemplate).toHaveBeenCalledWith({
				siteId: "site-1",
				currency: "EUR",
				steps: [
					{
						approverUserId: "user-2",
						roleKey: "project_review",
						roleLabel: "Finanšu direktors",
						minimumInvoiceTotal: "",
					},
				],
			});
		});
	});

	it("localizes TGEM approval responsibilities in Latvian", async () => {
		jest.mocked(getTgemInvoiceDashboardData).mockResolvedValue(dashboardData);

		const { rerender } = render(
			<TgemCostCodeSettings
				initialCostCodes={[]}
				selectedProject={dashboardData.projects[0]}
				approvalSetup={baseApprovalSetup}
				organizationLanguage="lv"
			/>,
		);

		fireEvent.click(
			screen.getByRole("button", { name: "Apstiprināšanas plūsma" }),
		);
		fireEvent.click(
			screen.getByRole("button", {
				name: "Pievienot apstiprināšanas soli",
			}),
		);

		expect(
			screen.getByRole("option", { name: "Projekta vadītājs" }),
		).toBeInTheDocument();
		expect(screen.getByLabelText("Loma 1")).toBeRequired();
		expect(
			screen.queryByLabelText("Pārbaudes fokuss 1"),
		).not.toBeInTheDocument();
		expect(
			screen.queryByText(/atpazītie apjomi, cenas un kopsummas/),
		).not.toBeInTheDocument();
		rerender(
			<TgemInvoiceApprovalDashboard
				siteId="site-1"
				initialView="approval"
				organizationLanguage="lv"
			/>,
		);
		expect(
			await screen.findByRole("button", { name: "Teksta versija" }),
		).toBeInTheDocument();
		expect(screen.getByText("Jāpārbauda")).toBeInTheDocument();
		expect(screen.getByText("Daudzums:")).toBeInTheDocument();
		expect(screen.getByText("Vienības cena:")).toBeInTheDocument();
		expect(screen.getByText("Izmaksu kods:")).toBeInTheDocument();
		expect(screen.getByText("Kategorija:")).toBeInTheDocument();
		expect(screen.getByText("Kopā Bez PVN")).toBeInTheDocument();
		expect(
			screen.getByText("Izveidots demonstrācijas rēķins"),
		).toBeInTheDocument();
		rerender(
			<TgemInvoiceApprovalDashboard
				siteId="site-1"
				initialView="register"
				organizationLanguage="lv"
			/>,
		);
		expect(
			await screen.findByLabelText(
				"Meklēt numuru, piegādātāju, reģistrācijas numuru, atsauci vai kontu",
			),
		).toBeInTheDocument();
		expect(
			screen.getByRole("columnheader", {
				name: "Pašreizējais apstiprinātājs",
			}),
		).toBeInTheDocument();
	});

	it("localizes the invoice list and line items in Russian", async () => {
		jest.mocked(getTgemInvoiceDashboardData).mockResolvedValue(dashboardData);

		const { rerender } = render(
			<TgemInvoiceApprovalDashboard
				siteId="site-1"
				initialView="approval"
				organizationLanguage="ru"
			/>,
		);

		expect(await screen.findByText("Требует проверки")).toBeInTheDocument();
		expect(screen.getByText("Количество:")).toBeInTheDocument();
		expect(screen.getByText("Цена за единицу:")).toBeInTheDocument();
		expect(screen.getByText("Код затрат:")).toBeInTheDocument();
		expect(screen.getByText("Категория:")).toBeInTheDocument();
		expect(
			screen.getByText("Создан демонстрационный счет"),
		).toBeInTheDocument();
		rerender(
			<TgemInvoiceApprovalDashboard
				siteId="site-1"
				initialView="register"
				organizationLanguage="ru"
			/>,
		);
		expect(
			await screen.findByLabelText(
				"Поиск по номеру, поставщику, регистрации, ссылке или счёту",
			),
		).toBeInTheDocument();
		expect(
			screen.getByRole("columnheader", {
				name: "Текущий согласующий",
			}),
		).toBeInTheDocument();
	});

	it("submits a review-ready invoice through the configured flow", async () => {
		const configuredData: TgemDashboardData = {
			...dashboardData,
			approvalSetup: {
				...baseApprovalSetup,
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
				initialView="approval"
				organizationLanguage="en"
			/>,
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
			<TgemCostCodeSettings
				initialCostCodes={[]}
				selectedProject={dashboardData.projects[0]}
				approvalSetup={baseApprovalSetup}
				organizationLanguage="en"
			/>,
		);

		fireEvent.click(screen.getByRole("button", { name: "Approval flow" }));
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
		const memberData: TgemDashboardData = {
			...dashboardData,
			approvalSetup: {
				...baseApprovalSetup,
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
		};

		render(
			<TgemCostCodeSettings
				initialCostCodes={[]}
				selectedProject={dashboardData.projects[0]}
				approvalSetup={memberData.approvalSetup}
				organizationLanguage="en"
			/>,
		);

		expect(screen.queryByText("Read only")).not.toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "Approval flow" }));
		expect(screen.getByLabelText("Role 1")).toBeEnabled();
		expect(screen.getByLabelText("Approver 1")).toBeEnabled();
		expect(
			screen.getByRole("button", { name: "Save approval flow" }),
		).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: "Save coordinators" }),
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
				initialView="approval"
				organizationLanguage="en"
			/>,
		);

		expect(
			await screen.findByText("skipped in a previous round"),
		).toBeInTheDocument();
		expect(screen.getByTestId("tgem-approval-route-summary")).toHaveClass(
			"border-[#B8CDF1]",
			"bg-[#EEF4FF]",
		);
		expect(screen.getByText(/Amount reference: 50000 EUR/)).toBeInTheDocument();
	});

	it.each([
		{ decision: "approve", label: "Approve and pass forward", fails: false },
		{ decision: "request_changes", label: "Request changes", fails: false },
		{ decision: "reject", label: "Reject", fails: false },
		{ decision: "reject", label: "Reject", fails: true },
	])(
		"shows a spinner only on $decision until processing finishes (failure=$fails)",
		async ({ decision, label, fails }) => {
			const data: TgemDashboardData = {
				...dashboardData,
				invoices: [
					{
						...dashboardData.invoices[0],
						status: "in_approval",
						approvalRound: 1,
						approvalSteps: [
							approvalStep({
								id: "current-step",
								stepOrder: 1,
								approvalRound: 1,
								roleKey: "project_review",
								role: "Projekta vadītājs",
								approverUserId: "user-1",
								approverName: "Anna",
								status: "current",
							}),
						],
					},
				],
			};
			let finishDecision!: () => void;
			let failDecision!: (error: Error) => void;
			const decisionPromise = new Promise<void>((resolve, reject) => {
				finishDecision = resolve;
				failDecision = reject;
			});
			let finishRefresh!: (value: TgemDashboardData) => void;
			const refreshPromise = new Promise<TgemDashboardData>((resolve) => {
				finishRefresh = resolve;
			});
			mockDecideApproval.mockReturnValueOnce(decisionPromise);
			jest.mocked(getTgemInvoiceDashboardData).mockResolvedValueOnce(data);
			if (!fails)
				jest
					.mocked(getTgemInvoiceDashboardData)
					.mockReturnValueOnce(refreshPromise);
			render(
				<TgemInvoiceApprovalDashboard
					siteId="site-1"
					initialView="approval"
					organizationLanguage="en"
				/>,
			);
			const button = await screen.findByRole("button", { name: label });
			const buttons = [
				"Approve and pass forward",
				"Request changes",
				"Reject",
			].map((name) => screen.getByRole("button", { name }));
			fireEvent.change(screen.getByLabelText("Comment"), {
				target: { value: "Please check the total" },
			});
			fireEvent.click(button);
			expect(button).toHaveAttribute("aria-busy", "true");
			expect(button.querySelector(".animate-spin")).toBeInTheDocument();
			for (const other of buttons) {
				expect(other).toBeDisabled();
				if (other !== button)
					expect(other.querySelector(".animate-spin")).not.toBeInTheDocument();
			}
			fireEvent.click(button);
			expect(mockDecideApproval).toHaveBeenCalledTimes(1);
			expect(mockDecideApproval).toHaveBeenCalledWith({
				invoiceCaseId: "case-1",
				decision,
				comment: "Please check the total",
			});
			if (fails) {
				await act(async () => {
					failDecision(new Error("Decision failed"));
				});
				expect(screen.getByText("Decision failed")).toBeInTheDocument();
			} else {
				await act(async () => {
					finishDecision();
				});
				expect(button).toBeDisabled();
				expect(button.querySelector(".animate-spin")).toBeInTheDocument();
				await act(async () => {
					finishRefresh(data);
				});
			}
			expect(button.querySelector(".animate-spin")).not.toBeInTheDocument();
			expect(button).toHaveAttribute("aria-busy", "false");
			for (const other of buttons) expect(other).toBeEnabled();
		},
	);

	it("shows the current owner, final approver, remaining path, and prior rounds", async () => {
		jest.mocked(getTgemInvoiceDashboardData).mockResolvedValue({
			...dashboardData,
			currentUserId: "vjaceslavs",
			approvalSetup: {
				...baseApprovalSetup,
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
				initialView="approval"
				organizationLanguage="en"
			/>,
		);

		expect(await screen.findByText("Currently with")).toBeInTheDocument();
		expect(screen.getByTestId("tgem-approval-route-summary")).toHaveClass(
			"border-[#B8CDF1]",
			"bg-[#EEF4FF]",
		);
		expect(
			screen.getByTestId("tgem-approval-step-circle-round-2-step-1"),
		).toHaveClass("border-[#159447]", "bg-[#159447]", "text-white");
		expect(
			screen.getByTestId("tgem-approval-step-circle-round-2-step-2"),
		).toHaveClass("border-tgem-primary", "bg-tgem-primary", "text-white");
		expect(
			screen.getByTestId("tgem-approval-step-circle-round-2-step-3"),
		).toHaveClass("border-slate-300", "bg-white", "text-slate-600");
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
