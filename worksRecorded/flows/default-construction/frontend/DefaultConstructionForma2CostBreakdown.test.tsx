import {
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import { toast } from "sonner";
import {
	getDefaultConstructionForma2PositionCostDetails,
	saveDefaultConstructionForma2Allocations,
} from "../backend/forma2-analytics-actions";
import { DefaultConstructionForma2CostBreakdown } from "./DefaultConstructionForma2CostBreakdown";

const mockRefresh = jest.fn();
jest.mock("next/navigation", () => ({
	useRouter: () => ({ refresh: mockRefresh }),
}));
jest.mock("sonner", () => ({
	toast: { error: jest.fn(), success: jest.fn() },
}));
jest.mock("../backend/forma2-analytics-actions", () => ({
	getDefaultConstructionForma2PositionCostDetails: jest.fn(),
	saveDefaultConstructionForma2Allocations: jest.fn(),
	saveDefaultConstructionForma2MaterialRule: jest.fn(),
}));

function details(type: "work" | "material" = "work") {
	return {
		position: { id: "old", code: "1", name: "Original position" },
		costType: "total" as const,
		calculatedTotal: 120,
		assignedRecords: 1,
		pricedRecords: 1,
		unpricedRecords: 0,
		positionOptions: [
			{
				id: "old",
				code: "1",
				name: "Original position",
				categoryName: "",
				kind: "work" as const,
				parentId: null,
				unit: "m2",
			},
			{
				id: "new",
				code: "2",
				name: "New position",
				categoryName: "",
				kind: "work" as const,
				parentId: null,
				unit: "m2",
			},
			{
				id: "material",
				code: "3",
				name: "Material position",
				categoryName: "",
				kind: "material" as const,
				parentId: "new",
				unit: "m2",
			},
		],
		records: [
			{
				id: "record",
				type,
				label: "Original diary work",
				secondaryLabel: "Floor 1",
				date: "2026-09-25",
				unit: "m2",
				quantity: 10,
				isSplit: false,
				hours: null,
				hourlyRate: null,
				unitRate: 12,
				costCalculationMode: "output" as const,
				actualCost: 120,
				assignmentMethod: "automatic" as const,
				assignmentConfidence: 1,
				assignedPosition: { id: "old", code: "1", name: "Original position" },
			},
		],
	};
}

beforeEach(() => {
	jest.clearAllMocks();
	jest
		.mocked(getDefaultConstructionForma2PositionCostDetails)
		.mockResolvedValue(details());
	jest
		.mocked(saveDefaultConstructionForma2Allocations)
		.mockResolvedValue({ savedAllocations: 1 });
});

function openDetails() {
	render(
		<DefaultConstructionForma2CostBreakdown
			siteId="site"
			positionId="old"
			costType="total"
			amount={120}
			organizationLanguage="en"
		/>,
	);
	fireEvent.click(screen.getByRole("button"));
	return screen.findByRole("combobox", { name: "Assigned position" });
}

it.each(["work", "material"] as const)(
	"moves a %s cost from the breakdown and refreshes report totals",
	async (type) => {
		jest
			.mocked(getDefaultConstructionForma2PositionCostDetails)
			.mockResolvedValueOnce(details(type))
			.mockResolvedValueOnce({
				...details(type),
				calculatedTotal: 0,
				assignedRecords: 0,
				pricedRecords: 0,
				records: [],
			});
		fireEvent.click(await openDetails());
		expect(
			screen.queryByRole("button", { name: "Unassigned" }),
		).not.toBeInTheDocument();
		if (type === "work")
			expect(
				screen.queryByRole("button", { name: /Material position/ }),
			).not.toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: /2 New position/ }));
		await waitFor(() =>
			expect(saveDefaultConstructionForma2Allocations).toHaveBeenCalledWith({
				siteId: "site",
				allocations: [
					{
						sourceType: type,
						sourceId: "record",
						positionId: "new",
						method: "manual",
						overrideJournalPosition: true,
					},
				],
			}),
		);
		await waitFor(() => expect(mockRefresh).toHaveBeenCalledTimes(1));
		expect(
			within(screen.getByRole("dialog")).queryByText("Original diary work"),
		).not.toBeInTheDocument();
		expect(
			screen.getByText("No records are included in this amount."),
		).toBeInTheDocument();
	},
);

it("keeps the current cost and position when saving fails", async () => {
	jest
		.mocked(saveDefaultConstructionForma2Allocations)
		.mockRejectedValueOnce(new Error("Save failed"));
	fireEvent.click(await openDetails());
	fireEvent.click(screen.getByRole("button", { name: /2 New position/ }));
	await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Save failed"));
	expect(screen.getByText("Original diary work")).toBeInTheDocument();
	expect(screen.getByRole("combobox")).toHaveTextContent("Original position");
	expect(mockRefresh).not.toHaveBeenCalled();
});

it("loads fresh details each time the dialog is reopened", async () => {
	await openDetails();
	fireEvent.click(screen.getByRole("button", { name: "Close" }));
	fireEvent.click(screen.getByRole("button"));
	await waitFor(() =>
		expect(
			getDefaultConstructionForma2PositionCostDetails,
		).toHaveBeenCalledTimes(2),
	);
});

it("uses Latvian labels in the review dropdown", async () => {
	render(
		<DefaultConstructionForma2CostBreakdown
			siteId="site"
			positionId="old"
			costType="total"
			amount={120}
			organizationLanguage="lv"
		/>,
	);
	fireEvent.click(screen.getByRole("button"));
	fireEvent.click(
		await screen.findByRole("combobox", { name: "Piesaistīts pozīcijai" }),
	);
	expect(screen.getByPlaceholderText("Meklēt pozīciju...")).toBeInTheDocument();
});
