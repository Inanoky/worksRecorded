import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { Forma2ResultRow } from "@/flows/default-construction/lib/forma2-analytics";
import { DefaultConstructionForma2ContractEditor } from "./DefaultConstructionForma2ContractEditor";

const mockRefresh = jest.fn();
const mockUpdateContractPosition = jest.fn();

jest.mock("next/navigation", () => ({
	useRouter: () => ({ refresh: mockRefresh }),
}));

jest.mock(
	"@/flows/default-construction/backend/forma2-analytics-actions",
	() => ({
		updateDefaultConstructionForma2ContractPosition: (...args: unknown[]) =>
			mockUpdateContractPosition(...args),
	}),
);

jest.mock("sonner", () => ({
	toast: { success: jest.fn(), error: jest.fn() },
}));

const row: Forma2ResultRow = {
	id: "position-1",
	code: "1.1",
	categoryCode: "1",
	categoryName: "Category",
	name: "Wall work",
	kind: "work",
	parentId: null,
	sourceRow: 10,
	unit: "m2",
	plannedQuantity: 5,
	laborNormHoursPerUnit: null,
	hourlyRate: null,
	plannedWorkCost: 10,
	plannedMaterialCost: 20,
	plannedMechanismCost: 3,
	plannedTotalCost: 33,
	actualWorkCost: 0,
	actualMaterialCost: 0,
	actualMechanismCost: 0,
	actualTotalCost: 0,
	variance: 33,
	assignedRecords: 0,
};

describe("DefaultConstructionForma2ContractEditor", () => {
	beforeEach(() => {
		mockRefresh.mockReset();
		mockUpdateContractPosition.mockReset();
		mockUpdateContractPosition.mockResolvedValue({ position: row });
	});

	it("recalculates the total and saves edited contract values", async () => {
		render(
			<DefaultConstructionForma2ContractEditor siteId="site-1" row={row} />,
		);

		fireEvent.click(
			screen.getByRole("button", { name: "Edit contract values" }),
		);
		fireEvent.change(screen.getByLabelText("Contract work"), {
			target: { value: "-15" },
		});
		expect(screen.getByLabelText("Contract total")).toHaveValue(8);
		fireEvent.change(screen.getByLabelText("Contract total"), {
			target: { value: "-10" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Save" }));

		await waitFor(() =>
			expect(mockUpdateContractPosition).toHaveBeenCalledWith({
				siteId: "site-1",
				positionId: row.id,
				plannedQuantity: 5,
				plannedWorkCost: -15,
				plannedMaterialCost: 20,
				plannedMechanismCost: 3,
				plannedTotalCost: -10,
			}),
		);
		expect(mockRefresh).toHaveBeenCalledTimes(1);
	});
});
