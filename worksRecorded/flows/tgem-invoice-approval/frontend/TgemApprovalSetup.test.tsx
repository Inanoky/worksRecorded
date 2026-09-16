import {
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import type { TgemDashboardApprovalSetup } from "@/lib/tgem-invoice-approval/dashboard-types";
import { saveTgemApprovalTemplate } from "@/server/actions/tgem-invoice-approval-actions";
import { TgemApprovalSetup } from "./TgemApprovalSetup";

jest.mock("@/server/actions/tgem-invoice-approval-actions", () => ({
	saveTgemApprovalTemplate: jest.fn(),
	saveTgemWorkflowManagers: jest.fn(),
}));

const setup: TgemDashboardApprovalSetup = {
	canManageWorkflow: true,
	canManageWorkflowManagers: false,
	ownerUserId: "user-1",
	workflowManagerUserIds: [],
	users: [
		{ id: "user-1", name: "Anna", role: null },
		{ id: "user-2", name: "Jānis", role: null },
	],
	template: null,
};

describe("approval step roles", () => {
	beforeEach(() => jest.clearAllMocks());

	it("requires a role on every step and preserves roles when the sequence is reordered", async () => {
		const onSaved = jest.fn().mockResolvedValue(undefined);
		render(
			<TgemApprovalSetup
				siteId="site-1"
				setup={setup}
				organizationLanguage="lv"
				onSaved={onSaved}
			/>,
		);
		const add = screen.getByRole("button", {
			name: "Pievienot apstiprināšanas soli",
		});
		fireEvent.click(add);
		fireEvent.click(add);
		const firstRole = screen.getByRole("combobox", { name: "Loma 1" });
		const secondRole = screen.getByRole("combobox", { name: "Loma 2" });
		for (const field of [firstRole, secondRole]) {
			expect(field).toBeRequired();
			expect(
				within(field)
					.getAllByRole("option")
					.map((option) => option.textContent),
			).toEqual([
				"Izvēlieties lomu",
				"Valdes loceklis",
				"Finanšu direktors",
				"Grāmatvedis",
				"Projekta vadītājs",
				"Darba vadītājs",
			]);
		}
		expect(screen.queryByText("Pārbaudes fokuss")).not.toBeInTheDocument();
		expect(
			screen.queryByText(/Lomas vai soļa nosaukums/),
		).not.toBeInTheDocument();
		expect(
			screen.queryByText(/Pārbauda, vai rēķins attiecas uz projektu/),
		).not.toBeInTheDocument();
		fireEvent.change(firstRole, { target: { value: "Projekta vadītājs" } });
		fireEvent.change(screen.getByLabelText("Apstiprinātājs 1"), {
			target: { value: "user-1" },
		});
		fireEvent.change(screen.getByLabelText("Apstiprinātājs 2"), {
			target: { value: "user-2" },
		});
		fireEvent.click(
			screen.getByRole("button", { name: "Saglabāt apstiprināšanas plūsmu" }),
		);
		expect(
			screen.getByText("Izvēlieties lomu katrā apstiprināšanas solī."),
		).toBeInTheDocument();
		expect(saveTgemApprovalTemplate).not.toHaveBeenCalled();
		fireEvent.change(secondRole, { target: { value: "Valdes loceklis" } });
		fireEvent.click(screen.getByRole("button", { name: "Move step 2 up" }));
		expect(screen.getByLabelText("Loma 1")).toHaveValue("Valdes loceklis");
		expect(screen.getByLabelText("Loma 2")).toHaveValue("Projekta vadītājs");
		fireEvent.click(
			screen.getByRole("button", { name: "Saglabāt apstiprināšanas plūsmu" }),
		);
		await waitFor(() =>
			expect(saveTgemApprovalTemplate).toHaveBeenCalledWith({
				siteId: "site-1",
				currency: "EUR",
				steps: [
					{
						approverUserId: "user-2",
						roleKey: "project_review",
						roleLabel: "Valdes loceklis",
						minimumInvoiceTotal: "",
					},
					{
						approverUserId: "user-1",
						roleKey: "project_review",
						roleLabel: "Projekta vadītājs",
						minimumInvoiceTotal: "",
					},
				],
			}),
		);
		expect(onSaved).toHaveBeenCalledTimes(1);
	});

	it("requires selecting a supported role when editing a legacy template", () => {
		render(
			<TgemApprovalSetup
				siteId="site-1"
				setup={{
					...setup,
					template: {
						id: "template-1",
						revision: 1,
						currency: "EUR",
						steps: [
							{
								id: "step-1",
								stepOrder: 1,
								approverUserId: "user-1",
								roleKey: "financial_review",
								role: null,
								minimumInvoiceTotal: null,
							},
						],
					},
				}}
				organizationLanguage="en"
				onSaved={jest.fn()}
			/>,
		);
		expect(screen.getByLabelText("Role 1")).toHaveValue("");
		fireEvent.click(screen.getByRole("button", { name: "Save approval flow" }));
		expect(saveTgemApprovalTemplate).not.toHaveBeenCalled();
		expect(
			screen.getByText("Choose a role for every approval step."),
		).toBeInTheDocument();
	});
});
