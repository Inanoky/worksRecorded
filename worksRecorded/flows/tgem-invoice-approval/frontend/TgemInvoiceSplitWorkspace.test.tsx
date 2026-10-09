import {
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import type {
	TgemDashboardData,
	TgemDashboardInvoice,
} from "@/lib/tgem-invoice-approval/dashboard-types";

const mockSplitInvoice = jest.fn();

jest.mock("@/server/actions/tgem-invoice-split-actions", () => ({
	submitTgemInvoiceSplit: (...args: unknown[]) => mockSplitInvoice(...args),
}));

import { TgemInvoiceSplitWorkspace } from "./TgemInvoiceSplitWorkspace";

const projects: TgemDashboardData["projects"] = [
	{
		id: "project-original",
		name: "Original project",
		permissions: ["invoice.view", "invoice.assign_project"],
	},
	{
		id: "project-a",
		name: "Project A",
		permissions: ["invoice.view", "invoice.assign_project"],
	},
	{
		id: "project-b",
		name: "Project B",
		permissions: ["invoice.view", "invoice.assign_project"],
	},
	{
		id: "project-c",
		name: "Project C",
		permissions: ["invoice.view", "invoice.assign_project"],
	},
];

function invoice(
	overrides: Partial<TgemDashboardInvoice> = {},
): TgemDashboardInvoice {
	return {
		id: "invoice-1",
		permissions: ["invoice.view", "invoice.split"],
		project: { id: "project-original", name: "Original project" },
		source: "email",
		status: "needs_review",
		ocrStatus: "complete",
		extractionStatus: "complete",
		invoiceNumber: "INV-42",
		isNewestDuplicateInvoiceNumber: false,
		supplierName: "Supplier",
		supplierRegistrationNo: null,
		invoiceDate: "2026-10-01T00:00:00.000Z",
		dueDate: null,
		currency: "EUR",
		subtotal: "50.00",
		vat: "10.00",
		total: "60.00",
		bankAccount: null,
		reference: null,
		invoiceType: "debit",
		costCode: null,
		validationSummary: null,
		extractionSummary: null,
		fieldAnchors: {},
		receivedAt: "2026-10-01T00:00:00.000Z",
		approvedAt: null,
		paymentStatus: "unpaid",
		paidAt: null,
		createdAt: "2026-10-01T00:00:00.000Z",
		updatedAt: "2026-10-02T08:00:00.000Z",
		approvalRound: 0,
		documents: [],
		lines: [
			{
				id: "line-1",
				lineNumber: 1,
				description: "Materials",
				quantity: "2",
				unit: "pcs",
				unitPrice: "10",
				total: "20.00",
				currency: "EUR",
				costCode: null,
				category: null,
				suggestedCostCode: null,
				suggestedCategory: null,
				aiConfidence: 0.99,
			},
			{
				id: "line-2",
				lineNumber: 2,
				description: "Installation",
				quantity: "3",
				unit: "hours",
				unitPrice: "10",
				total: "30.00",
				currency: "EUR",
				costCode: null,
				category: null,
				suggestedCostCode: null,
				suggestedCategory: null,
				aiConfidence: 0.99,
			},
		],
		approvalSteps: [],
		auditEvents: [],
		...overrides,
	};
}

function renderWorkspace(options?: {
	invoice?: TgemDashboardInvoice;
	language?: string;
	onChanged?: jest.Mock;
}) {
	const onChanged =
		options?.onChanged ?? jest.fn().mockResolvedValue(undefined);
	render(
		<TgemInvoiceSplitWorkspace
			invoice={options?.invoice ?? invoice()}
			projects={projects}
			organizationLanguage={options?.language ?? "en"}
			onChanged={onChanged}
		/>,
	);
	return { onChanged };
}

function openWorkspace() {
	fireEvent.click(screen.getByRole("button", { name: "Split invoice" }));
	return screen.getByRole("dialog");
}

beforeEach(() => {
	jest.clearAllMocks();
	mockSplitInvoice.mockResolvedValue({
		ok: true,
		value: {
			parentInvoiceCaseId: "invoice-1",
			rootInvoiceCaseId: "invoice-1",
			children: [
				{
					id: "child-1",
					projectId: "project-a",
					kind: "allocated",
					generation: 1,
					total: "24",
					updatedAt: "2026-10-02T08:01:00.000Z",
				},
			],
			replayed: false,
		},
	});
});

it("moves a whole row and previews the untouched residual", async () => {
	const { onChanged } = renderWorkspace();
	const dialog = openWorkspace();
	fireEvent.click(
		within(dialog).getByRole("button", {
			name: "Whole line to Project A: Materials",
		}),
	);

	expect(within(dialog).getByText("Allocated")).toBeInTheDocument();
	expect(within(dialog).getByText("Remainder")).toBeInTheDocument();
	expect(within(dialog).getByText("Balanced")).toBeInTheDocument();
	fireEvent.click(
		within(dialog).getByRole("button", { name: "Confirm split" }),
	);

	await waitFor(() =>
		expect(mockSplitInvoice).toHaveBeenCalledWith({
			invoiceCaseId: "invoice-1",
			expectedUpdatedAt: "2026-10-02T08:00:00.000Z",
			destinationProjectIds: ["project-a"],
			residualProjectId: null,
			lineRequests: [{ lineId: "line-1", wholeProjectId: "project-a" }],
		}),
	);
	await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1));
});

it("allocates a concrete quantity across multiple destinations", () => {
	renderWorkspace({
		invoice: invoice({
			subtotal: "100.00",
			vat: "21.00",
			total: "121.00",
			lines: [
				{
					...invoice().lines[0],
					quantity: "10",
					unitPrice: "10",
					total: "100.00",
				},
			],
		}),
	});
	const dialog = openWorkspace();
	fireEvent.click(within(dialog).getByRole("button", { name: "Add project" }));
	fireEvent.change(
		within(dialog).getByLabelText("Quantity for Project A: Materials"),
		{ target: { value: "3" } },
	);
	fireEvent.change(
		within(dialog).getByLabelText("Quantity for Project B: Materials"),
		{ target: { value: "2" } },
	);

	expect(within(dialog).getAllByText("Allocated")).toHaveLength(2);
	expect(within(dialog).getByText("Remainder")).toBeInTheDocument();
	expect(
		within(dialog).getByRole("button", { name: "Confirm split" }),
	).toBeEnabled();
});

it("accepts a localized decimal quantity and submits its normalized value", async () => {
	renderWorkspace();
	const dialog = openWorkspace();
	fireEvent.change(
		within(dialog).getByLabelText("Quantity for Project A: Materials"),
		{ target: { value: "1,5" } },
	);

	expect(within(dialog).getByText("Balanced")).toBeInTheDocument();
	expect(
		within(dialog).getByRole("button", { name: "Confirm split" }),
	).toBeEnabled();
	fireEvent.click(
		within(dialog).getByRole("button", { name: "Confirm split" }),
	);

	await waitFor(() =>
		expect(mockSplitInvoice).toHaveBeenCalledWith(
			expect.objectContaining({
				lineRequests: [
					{
						lineId: "line-1",
						allocations: [{ projectId: "project-a", quantity: "1.5" }],
					},
				],
			}),
		),
	);
});

it("splits the whole invoice evenly across two new projects and the original", async () => {
	renderWorkspace({
		invoice: invoice({
			subtotal: "100.00",
			vat: "21.00",
			total: "121.00",
			lines: [
				{
					...invoice().lines[0],
					quantity: "1",
					unitPrice: "100",
					total: "100.00",
				},
			],
		}),
	});
	const dialog = openWorkspace();
	fireEvent.click(within(dialog).getByRole("button", { name: "Add project" }));
	fireEvent.click(
		within(dialog).getByRole("button", { name: "Whole invoice %" }),
	);
	fireEvent.click(within(dialog).getByRole("button", { name: "Split evenly" }));

	expect(within(dialog).getByLabelText("Percentage for Project A")).toHaveValue(
		"33.33",
	);
	expect(within(dialog).getByLabelText("Percentage for Project B")).toHaveValue(
		"33.33",
	);
	expect(
		within(dialog).getByText("Original project keeps: 33.34%"),
	).toBeInTheDocument();
	expect(within(dialog).getByText("Balanced")).toBeInTheDocument();

	fireEvent.click(
		within(dialog).getByRole("button", { name: "Confirm split" }),
	);
	await waitFor(() =>
		expect(mockSplitInvoice).toHaveBeenCalledWith(
			expect.objectContaining({
				invoicePercentageAllocations: [
					{ projectId: "project-a", percentage: "33.33" },
					{ projectId: "project-b", percentage: "33.33" },
				],
				lineRequests: [],
			}),
		),
	);
});

it("splits an individual item by a percentage with two-decimal validation", () => {
	renderWorkspace();
	const dialog = openWorkspace();
	fireEvent.click(within(dialog).getByRole("button", { name: "Line item %" }));
	const percentageInput = within(dialog).getByLabelText(
		"Percentage for Project A: Materials",
	);
	fireEvent.change(percentageInput, { target: { value: "33.333" } });
	expect(
		within(dialog).getByText(
			"A percentage can have at most two decimal places.",
		),
	).toBeInTheDocument();
	fireEvent.change(percentageInput, { target: { value: "33,33" } });
	expect(within(dialog).getByText("Balanced")).toBeInTheDocument();
});

it("requires a manual source quantity before partially splitting a missing count", () => {
	renderWorkspace({
		invoice: invoice({
			subtotal: "40.00",
			vat: "8.40",
			total: "48.40",
			lines: [
				{
					...invoice().lines[0],
					quantity: null,
					total: "40.00",
				},
			],
		}),
	});
	const dialog = openWorkspace();
	fireEvent.change(
		within(dialog).getByLabelText("Quantity for Project A: Materials"),
		{ target: { value: "1" } },
	);
	expect(
		within(dialog).getByText(
			"Enter the source quantity for the partially split line.",
		),
	).toBeInTheDocument();
	expect(
		within(dialog).getByRole("button", { name: "Confirm split" }),
	).toBeDisabled();

	fireEvent.change(
		within(dialog).getByLabelText("Enter source quantity: Materials"),
		{ target: { value: "4" } },
	);
	expect(within(dialog).getByText("Balanced")).toBeInTheDocument();
});

it("requires and uses a residual project for an unassigned invoice", async () => {
	renderWorkspace({ invoice: invoice({ project: null }) });
	const dialog = openWorkspace();
	fireEvent.click(
		within(dialog).getByRole("button", {
			name: "Whole line to Original project: Materials",
		}),
	);
	expect(
		within(dialog).getByText("Choose a project for the remainder."),
	).toBeInTheDocument();
	fireEvent.change(within(dialog).getByLabelText("Remainder project"), {
		target: { value: "project-a" },
	});
	expect(within(dialog).getByText("Balanced")).toBeInTheDocument();
	fireEvent.click(
		within(dialog).getByRole("button", { name: "Confirm split" }),
	);
	await waitFor(() =>
		expect(mockSplitInvoice).toHaveBeenCalledWith(
			expect.objectContaining({ residualProjectId: "project-a" }),
		),
	);
});

it("blocks over-allocation before calling the server", () => {
	renderWorkspace();
	const dialog = openWorkspace();
	fireEvent.change(
		within(dialog).getByLabelText("Quantity for Project A: Materials"),
		{ target: { value: "3" } },
	);
	expect(
		within(dialog).getByText(
			"The allocated quantity exceeds the source quantity.",
		),
	).toBeInTheDocument();
	expect(
		within(dialog).getByRole("button", { name: "Confirm split" }),
	).toBeDisabled();
	expect(mockSplitInvoice).not.toHaveBeenCalled();
});

it("explains an invoice header mismatch instead of showing a generic allocation error", () => {
	renderWorkspace({
		invoice: invoice({ subtotal: "50.00", vat: "10.00", total: "70.00" }),
		language: "lv",
	});
	fireEvent.click(screen.getByRole("button", { name: "Sadalīt rēķinu" }));
	const dialog = screen.getByRole("dialog");
	fireEvent.click(
		within(dialog).getByRole("button", {
			name: "Visa pozīcija projektam Project A: Materials",
		}),
	);

	expect(
		within(dialog).getByText(
			"Rēķina summa bez PVN un PVN nesakrīt ar kopējo summu. Pirms sadalīšanas izlabojiet rēķina kopsummas.",
		),
	).toBeInTheDocument();
	expect(
		within(dialog).queryByText(
			"Pabeidziet derīgu pozīciju sadalījumu, lai turpinātu.",
		),
	).not.toBeInTheDocument();
});

it("disables competing controls while confirmation is pending", async () => {
	let finish!: (value: unknown) => void;
	mockSplitInvoice.mockReturnValue(
		new Promise((resolve) => {
			finish = resolve;
		}),
	);
	renderWorkspace();
	const dialog = openWorkspace();
	fireEvent.click(
		within(dialog).getByRole("button", {
			name: "Whole line to Project A: Materials",
		}),
	);
	fireEvent.click(
		within(dialog).getByRole("button", { name: "Confirm split" }),
	);

	const pendingButton = within(dialog).getByRole("button", {
		name: "Splitting…",
	});
	expect(pendingButton).toBeDisabled();
	expect(pendingButton).toHaveAttribute("aria-busy", "true");
	expect(within(dialog).getByRole("button", { name: "Cancel" })).toBeDisabled();
	expect(
		within(dialog).getByLabelText("Quantity for Project A: Materials"),
	).toBeDisabled();

	finish({ ok: true, value: {} });
	await waitFor(() =>
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
	);
});

it("refreshes the invoice after an optimistic conflict", async () => {
	const onChanged = jest.fn().mockResolvedValue(undefined);
	mockSplitInvoice.mockResolvedValue({ ok: false, error: "conflict" });
	renderWorkspace({ onChanged });
	const dialog = openWorkspace();
	fireEvent.click(
		within(dialog).getByRole("button", {
			name: "Whole line to Project A: Materials",
		}),
	);
	fireEvent.click(
		within(dialog).getByRole("button", { name: "Confirm split" }),
	);

	expect(
		await within(dialog).findByText(
			"The invoice changed while this workspace was open. Data was refreshed; open the split again.",
		),
	).toBeInTheDocument();
	expect(onChanged).toHaveBeenCalledTimes(1);
});

it("provides Latvian and Russian workspace copy", () => {
	const first = render(
		<TgemInvoiceSplitWorkspace
			invoice={invoice()}
			projects={projects}
			organizationLanguage="lv"
			onChanged={jest.fn().mockResolvedValue(undefined)}
		/>,
	);
	expect(
		screen.getByRole("button", { name: "Sadalīt rēķinu" }),
	).toBeInTheDocument();
	first.unmount();
	render(
		<TgemInvoiceSplitWorkspace
			invoice={invoice()}
			projects={projects}
			organizationLanguage="ru"
			onChanged={jest.fn().mockResolvedValue(undefined)}
		/>,
	);
	expect(
		screen.getByRole("button", { name: "Разделить счёт" }),
	).toBeInTheDocument();
});

it("keeps the split action unavailable for a decided invoice", () => {
	renderWorkspace({ invoice: invoice({ status: "approved" }) });
	expect(screen.getByRole("button", { name: "Split invoice" })).toBeDisabled();
});
