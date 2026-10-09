import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
	saveTgemCostCode,
	setTgemCostCodeActive,
} from "@/server/actions/tgem-cost-code-actions";
import {
	saveTgemPersonApprovalFlow,
	saveTgemSubmitterApprovalFlow,
} from "@/server/actions/tgem-invoice-approval-actions";
import { TgemCostCodeSettings } from "./TgemCostCodeSettings";

jest.mock("next/navigation", () => ({
	useRouter: () => ({ refresh: jest.fn() }),
}));

jest.mock("@/server/actions/tgem-project-actions", () => ({
	deleteTgemProject: jest.fn(),
}));

jest.mock("@/server/actions/tgem-invoice-approval-actions", () => ({
	saveTgemApprovalTemplate: jest.fn(),
	saveTgemPersonApprovalFlow: jest.fn(),
	saveTgemSubmitterApprovalFlow: jest.fn(),
	saveTgemWorkflowManagers: jest.fn(),
}));

jest.mock("@/server/actions/tgem-cost-code-actions", () => ({
	saveTgemCostCode: jest.fn(),
	setTgemCostCodeActive: jest.fn(),
}));

describe("TgemCostCodeSettings", () => {
	it("offers deletion only for an explicitly deletable project", () => {
		const { rerender } = render(
			<TgemCostCodeSettings initialCostCodes={[]} organizationLanguage="en" />,
		);
		expect(screen.queryByRole("button", { name: "Delete project" })).toBeNull();
		rerender(
			<TgemCostCodeSettings
				initialCostCodes={[]}
				organizationLanguage="en"
				selectedProject={{ id: "site-1", name: "Project 1" }}
			/>,
		);
		expect(screen.queryByRole("button", { name: "Delete project" })).toBeNull();
		rerender(
			<TgemCostCodeSettings
				initialCostCodes={[]}
				organizationLanguage="en"
				selectedProject={{ id: "site-1", name: "Project 1" }}
				deletableProject={{ id: "site-1", name: "Project 1" }}
			/>,
		);
		expect(
			screen.getByRole("button", { name: "Delete project" }),
		).toBeInTheDocument();
		rerender(
			<TgemCostCodeSettings initialCostCodes={[]} organizationLanguage="en" />,
		);
		expect(screen.queryByRole("button", { name: "Delete project" })).toBeNull();
	});

	it("renders project access immediately before project deletion", () => {
		render(
			<TgemCostCodeSettings
				initialCostCodes={[]}
				organizationLanguage="en"
				selectedProject={{ id: "site-1", name: "Project 1" }}
				deletableProject={{ id: "site-1", name: "Project 1" }}
			>
				<div>Project access</div>
			</TgemCostCodeSettings>,
		);

		const access = screen.getByText("Project access");
		const deleteButton = screen.getByRole("button", { name: "Delete project" });
		expect(
			access.compareDocumentPosition(deleteButton) &
				Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy();
	});
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("shows TGEM branding on the right side of the Project settings heading", () => {
		render(
			<TgemCostCodeSettings initialCostCodes={[]} organizationLanguage="en" />,
		);
		const heading = screen.getByRole("heading", { name: "Project settings" });
		const logo = screen.getByRole("img", { name: "TGEM" });
		expect(
			heading.parentElement?.parentElement?.parentElement,
		).toContainElement(logo);
		expect(heading.parentElement?.parentElement?.parentElement).toHaveClass(
			"justify-between",
		);
	});

	it("requires a header-selected project for approval configuration", () => {
		render(
			<TgemCostCodeSettings initialCostCodes={[]} organizationLanguage="en" />,
		);
		fireEvent.click(screen.getByRole("button", { name: "Approval flow" }));
		expect(
			screen.getByText(
				"Select a specific project in the header to configure its approval sequence.",
			),
		).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: "Add approval step" }),
		).toBeNull();
		expect(screen.getByText("Cost-code catalog")).toBeInTheDocument();
	});

	it("assigns a reusable people flow to an exact submitter", async () => {
		jest.mocked(saveTgemSubmitterApprovalFlow).mockResolvedValue({
			userId: "user-1",
			flowId: "flow-1",
		});
		render(
			<TgemCostCodeSettings
				initialCostCodes={[]}
				organizationLanguage="en"
				submitterFlowSettings={{
					users: [
						{
							id: "user-1",
							name: "Anna Bērziņa",
							role: "Site manager",
							email: "anna@example.com",
							phone: "+37120000000",
							flowId: null,
						},
					],
					flows: [
						{
							id: "flow-1",
							name: "Management flow",
							currency: "EUR",
							steps: [],
						},
					],
				}}
			/>,
		);
		fireEvent.click(screen.getByRole("button", { name: "Approval flow" }));
		fireEvent.change(
			screen.getByRole("combobox", {
				name: "Flows by submitter: Anna Bērziņa",
			}),
			{ target: { value: "flow-1" } },
		);

		await waitFor(() =>
			expect(saveTgemSubmitterApprovalFlow).toHaveBeenCalledWith({
				userId: "user-1",
				flowId: "flow-1",
			}),
		);
	});

	it("creates a people flow before assigning it", async () => {
		jest.mocked(saveTgemPersonApprovalFlow).mockResolvedValue({
			id: "flow-1",
			name: "Office invoices",
			currency: "EUR",
			steps: [
				{
					id: "step-1",
					stepOrder: 1,
					roleKey: "financial_review",
					role: "Grāmatvedis",
					approverUserId: "user-1",
					minimumInvoiceTotal: null,
				},
			],
		});
		render(
			<TgemCostCodeSettings
				initialCostCodes={[]}
				organizationLanguage="en"
				submitterFlowSettings={{
					users: [
						{
							id: "user-1",
							name: "Anna Bērziņa",
							role: "Accountant",
							email: "anna@example.com",
							phone: null,
							flowId: null,
						},
					],
					flows: [],
				}}
			/>,
		);
		fireEvent.click(screen.getByRole("button", { name: "Approval flow" }));
		fireEvent.click(screen.getByRole("button", { name: "New people flow" }));
		fireEvent.change(
			screen.getByPlaceholderText("For example, Office invoices"),
			{
				target: { value: "Office invoices" },
			},
		);
		fireEvent.change(screen.getByRole("combobox", { name: "Role 1" }), {
			target: { value: "Grāmatvedis" },
		});
		fireEvent.change(screen.getByRole("combobox", { name: "Approver 1" }), {
			target: { value: "user-1" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Save flow" }));

		await waitFor(() =>
			expect(saveTgemPersonApprovalFlow).toHaveBeenCalledWith({
				name: "Office invoices",
				currency: "EUR",
				steps: [
					{
						approverUserId: "user-1",
						roleKey: "project_review",
						roleLabel: "Grāmatvedis",
						minimumInvoiceTotal: "",
					},
				],
			}),
		);
		expect(
			(await screen.findAllByText("Office invoices")).length,
		).toBeGreaterThan(0);
	});

	it("adds an organization cost code and its meaning", async () => {
		jest.mocked(saveTgemCostCode).mockResolvedValue({
			id: "cost-code-1",
			code: "A123",
			name: "Administrative expense",
			isActive: true,
		});

		render(
			<TgemCostCodeSettings initialCostCodes={[]} organizationLanguage="en" />,
		);
		fireEvent.click(screen.getByRole("button", { name: "Cost-code catalog" }));

		fireEvent.change(screen.getByPlaceholderText("For example, A123"), {
			target: { value: "a123" },
		});
		fireEvent.change(
			screen.getByPlaceholderText("For example, Administrative expense"),
			{ target: { value: "Administrative expense" } },
		);
		fireEvent.click(screen.getByRole("button", { name: "Add code" }));

		await waitFor(() =>
			expect(saveTgemCostCode).toHaveBeenCalledWith({
				code: "A123",
				name: "Administrative expense",
			}),
		);
		expect(await screen.findByDisplayValue("A123")).toBeInTheDocument();
	});

	it("archives an active cost code without deleting it", async () => {
		jest.mocked(setTgemCostCodeActive).mockResolvedValue({
			id: "cost-code-1",
			isActive: false,
		});

		render(
			<TgemCostCodeSettings
				initialCostCodes={[
					{
						id: "cost-code-1",
						code: "021C",
						name: "Materials expense",
						isActive: true,
					},
				]}
				organizationLanguage="en"
			/>,
		);
		fireEvent.click(screen.getByRole("button", { name: "Cost-code catalog" }));

		fireEvent.click(screen.getByRole("button", { name: "Archive" }));

		await waitFor(() =>
			expect(setTgemCostCodeActive).toHaveBeenCalledWith({
				id: "cost-code-1",
				isActive: false,
			}),
		);
		expect(await screen.findByText("Archived codes · 1")).toBeInTheDocument();
	});

	it("opens sections independently and preserves edits after collapsing", () => {
		render(
			<TgemCostCodeSettings initialCostCodes={[]} organizationLanguage="en" />,
		);
		const approvalToggle = screen.getByRole("button", {
			name: "Approval flow",
		});
		const costCodeToggle = screen.getByRole("button", {
			name: "Cost-code catalog",
		});
		expect(approvalToggle).toHaveAttribute("aria-expanded", "false");
		expect(costCodeToggle).toHaveAttribute("aria-expanded", "false");
		expect(screen.getByPlaceholderText("For example, A123")).not.toBeVisible();
		fireEvent.click(costCodeToggle);
		fireEvent.change(screen.getByPlaceholderText("For example, A123"), {
			target: { value: "A123" },
		});
		fireEvent.click(approvalToggle);
		expect(costCodeToggle).toHaveAttribute("aria-expanded", "true");
		fireEvent.click(costCodeToggle);
		expect(approvalToggle).toHaveAttribute("aria-expanded", "true");
		expect(screen.getByPlaceholderText("For example, A123")).not.toBeVisible();
		fireEvent.click(costCodeToggle);
		expect(screen.getByDisplayValue("A123")).toBeVisible();
	});
});
