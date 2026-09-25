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
jest.mock("./DefaultConstructionForma2PdfPreview", () => ({
	DefaultConstructionForma2PdfPreview: ({
		url,
		title,
	}: {
		url: string;
		title: string;
	}) => <div title={`Invoice preview: ${title}`} data-source-url={url} />,
}));
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
				invoiceUrl: null as string | null,
				invoiceNumber: null as string | null,
				supplierName: null as string | null,
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
	return screen
		.findAllByRole("combobox", { name: "Assigned position" })
		.then((items) => items[0]);
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
		fireEvent.click(screen.getByRole("button", { name: /2\. New position/ }));
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
	fireEvent.click(screen.getByRole("button", { name: /2\. New position/ }));
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

it("simplifies material details and provides the original invoice preview", async () => {
	const result = details("material");
	result.records[0].invoiceUrl = "https://example.com/invoice.pdf";
	result.records[0].secondaryLabel = "Supplier · INV-123";
	result.records[0].supplierName = "Supplier";
	result.records[0].invoiceNumber = "INV-123";
	jest
		.mocked(getDefaultConstructionForma2PositionCostDetails)
		.mockResolvedValue(result);
	await openDetails();
	expect(screen.getByText("Calculated total")).toBeInTheDocument();
	expect(screen.queryByText("Included records")).not.toBeInTheDocument();
	expect(screen.queryByText("Without calculable cost")).not.toBeInTheDocument();
	expect(screen.queryByText("Material")).not.toBeInTheDocument();
	expect(screen.getByText("Supplier")).toBeInTheDocument();
	expect(
		within(screen.getAllByRole("row")[1]).getAllByRole("cell")[2],
	).toHaveTextContent("INV-123");
	expect(screen.getAllByText("1. Original position")).toHaveLength(2);
	expect(screen.getByRole("combobox").parentElement).toHaveClass("flex-nowrap");
	expect(screen.getByRole("combobox").parentElement).not.toHaveClass(
		"flex-wrap",
		"[&>button]:basis-full",
	);
	expect(
		screen.queryByTitle("Invoice preview: INV-123"),
	).not.toBeInTheDocument();
	fireEvent.click(
		screen.getByRole("button", { name: "Open invoice: INV-123" }),
	);
	expect(screen.getByTitle("Invoice preview: INV-123")).toHaveAttribute(
		"data-source-url",
		"https://example.com/invoice.pdf",
	);
	expect(
		screen.getByRole("link", { name: "Open original in new tab" }),
	).toHaveAttribute("href", "https://example.com/invoice.pdf");
	expect(screen.getByRole("dialog")).toHaveClass("sm:max-w-[1600px]");
	fireEvent.click(screen.getByRole("button", { name: "Close preview" }));
	expect(
		screen.queryByTitle("Invoice preview: INV-123"),
	).not.toBeInTheDocument();
	expect(screen.getByRole("dialog")).toHaveClass("sm:max-w-[1240px]");
});

it("does not show an invoice link when no document is attached", async () => {
	jest
		.mocked(getDefaultConstructionForma2PositionCostDetails)
		.mockResolvedValue(details("material"));
	await openDetails();
	expect(
		screen.queryByRole("button", { name: /Open invoice/ }),
	).not.toBeInTheDocument();
});

it("switches the adjacent preview without reloading cost details", async () => {
	const result = details("material");
	result.records = ["INV-1", "INV-2"].map((invoiceNumber) => ({
		...result.records[0],
		id: invoiceNumber,
		invoiceNumber,
		invoiceUrl: `https://example.com/${invoiceNumber}.pdf`,
	}));
	jest
		.mocked(getDefaultConstructionForma2PositionCostDetails)
		.mockResolvedValue(result);
	await openDetails();
	fireEvent.click(screen.getByRole("button", { name: "Open invoice: INV-1" }));
	fireEvent.click(screen.getByRole("button", { name: "Open invoice: INV-2" }));
	expect(screen.getByTitle("Invoice preview: INV-2")).toHaveAttribute(
		"data-source-url",
		"https://example.com/INV-2.pdf",
	);
	expect(screen.queryByTitle("Invoice preview: INV-1")).not.toBeInTheDocument();
	expect(getDefaultConstructionForma2PositionCostDetails).toHaveBeenCalledTimes(
		1,
	);
});

it.each([
	{
		mode: "output" as const,
		type: "material" as const,
		quantity: 1.5,
		hours: null,
		expectedUnit: "m2",
		expectedQuantity: "1.5",
	},
	{
		mode: "hourly" as const,
		type: "work" as const,
		quantity: 10,
		hours: 7,
		expectedUnit: "h",
		expectedQuantity: "7",
	},
	{
		mode: "output" as const,
		type: "work" as const,
		quantity: 0,
		hours: null,
		expectedUnit: "m2",
		expectedQuantity: "0",
	},
])(
	"shows separate unit and quantity columns for $type / $mode",
	async ({ mode, type, quantity, hours, expectedUnit, expectedQuantity }) => {
		const result = details(type);
		jest
			.mocked(getDefaultConstructionForma2PositionCostDetails)
			.mockResolvedValue({
				...result,
				records: [
					{ ...result.records[0], costCalculationMode: mode, quantity, hours },
				],
			});
		await openDetails();
		expect(
			screen.getAllByRole("columnheader").map((header) => header.textContent),
		).toEqual([
			"Date",
			"Record",
			"Invoice no.",
			"Assigned position",
			"Unit",
			"Quantity",
			"Cost",
		]);
		const cells = within(screen.getAllByRole("row")[1]).getAllByRole("cell");
		expect(cells[4]).toHaveTextContent(expectedUnit);
		expect(cells[5]).toHaveTextContent(expectedQuantity);
		expect(screen.queryByText("Automatic")).not.toBeInTheDocument();
		expect(screen.getByRole("dialog")).toHaveClass("sm:max-w-[1240px]");
	},
);
