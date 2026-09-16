import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
	saveTgemCostCode,
	setTgemCostCodeActive,
} from "@/server/actions/tgem-cost-code-actions";
import { TgemCostCodeSettings } from "./TgemCostCodeSettings";

jest.mock("next/navigation", () => ({
	useRouter: () => ({ refresh: jest.fn() }),
}));

jest.mock("@/server/actions/tgem-invoice-approval-actions", () => ({
	saveTgemApprovalTemplate: jest.fn(),
	saveTgemWorkflowManagers: jest.fn(),
}));

jest.mock("@/server/actions/tgem-cost-code-actions", () => ({
	saveTgemCostCode: jest.fn(),
	setTgemCostCodeActive: jest.fn(),
}));

describe("TgemCostCodeSettings", () => {
	beforeEach(() => {
		jest.clearAllMocks();
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
