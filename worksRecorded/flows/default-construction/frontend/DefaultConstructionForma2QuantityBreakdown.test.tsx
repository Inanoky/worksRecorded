import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { getDefaultConstructionForma2PositionQuantityDetails } from "../backend/forma2-analytics-actions";
import { DefaultConstructionForma2QuantityBreakdown } from "./DefaultConstructionForma2QuantityBreakdown";

jest.mock("../backend/forma2-analytics-actions", () => ({
	getDefaultConstructionForma2PositionQuantityDetails: jest.fn(),
}));

const props = {
	siteId: "site",
	positionId: "position",
	amount: 18,
	contractQuantity: 15,
	organizationLanguage: "en",
};
const details = {
	position: {
		id: "position",
		code: "1",
		name: "Floor",
		unit: "m2",
		plannedQuantity: 15,
	},
	calculatedTotal: 18,
	includedRecords: 1,
	excludedRecords: 1,
	records: [
		{
			id: "one",
			label: "Floor work",
			secondaryLabel: "First floor",
			date: "2026-09-02",
			unit: "m2",
			quantity: 12,
			reportedQuantity: 18,
			photos: ["https://example.com/diary.jpg"],
			plannedQuantity: 18,
			description: `Full diary description\n${"More detail. ".repeat(60)}Final detail.`,
			exclusion: null,
		},
		{
			id: "two",
			label: "Other work",
			secondaryLabel: "",
			date: null,
			unit: "m3",
			quantity: 9,
			reportedQuantity: null,
			photos: [],
			plannedQuantity: null,
			description: null,
			exclusion: "unit-mismatch" as const,
		},
	],
};

beforeEach(() => {
	jest.clearAllMocks();
	jest
		.mocked(getDefaultConstructionForma2PositionQuantityDetails)
		.mockResolvedValue(details);
});

it.each([
	[12, 15, "text-emerald-600"],
	[20, 15, "text-red-600"],
	[15, 15, "text-inherit"],
	[0, 15, "text-emerald-600"],
	[12, null, "text-inherit"],
	[0.1 + 0.2, 0.3, "text-inherit"],
])("colours %s against %s", (amount, contractQuantity, color) => {
	render(
		<DefaultConstructionForma2QuantityBreakdown
			{...props}
			amount={amount as number}
			contractQuantity={contractQuantity as number | null}
		/>,
	);
	expect(screen.getByRole("button")).toHaveClass(
		color as string,
		"cursor-pointer",
	);
	expect(
		getDefaultConstructionForma2PositionQuantityDetails,
	).not.toHaveBeenCalled();
});

it("shows a neutral dash without a request for a missing quantity", () => {
	render(
		<DefaultConstructionForma2QuantityBreakdown {...props} amount={null} />,
	);
	expect(screen.queryByRole("button")).not.toBeInTheDocument();
	expect(screen.getByText("—")).toBeInTheDocument();
});

it("opens the linked diary breakdown and explains excluded quantities", async () => {
	render(<DefaultConstructionForma2QuantityBreakdown {...props} />);
	fireEvent.click(screen.getByRole("button"));
	expect(await screen.findByText("Floor work")).toBeInTheDocument();
	expect(screen.getByText("First floor")).toBeInTheDocument();
	expect(
		screen.getByRole("columnheader", { name: "Planned quantity" }),
	).toBeInTheDocument();
	expect(screen.getByRole("cell", { name: "18 m2" })).toBeInTheDocument();
	expect(screen.getByRole("cell", { name: "12 m2" })).toBeInTheDocument();
	const description = screen.getByText(/Full diary description/);
	expect(description.textContent).toBe(details.records[0].description);
	expect(description).toHaveClass("whitespace-pre-wrap");
	expect(screen.getByText("Incompatible unit")).toBeInTheDocument();
	expect(screen.getByText("Included in total: 18 m2")).toBeInTheDocument();
	fireEvent.click(screen.getByRole("button", { name: "Report photo 1" }));
	expect(screen.getByRole("button", { name: "Zoom in" })).toBeInTheDocument();
	expect(
		getDefaultConstructionForma2PositionQuantityDetails,
	).toHaveBeenCalledWith({ siteId: "site", positionId: "position" });
});

it("shows loading and a localized failure without exposing backend errors", async () => {
	jest
		.mocked(getDefaultConstructionForma2PositionQuantityDetails)
		.mockRejectedValue(new Error("private backend error"));
	render(
		<DefaultConstructionForma2QuantityBreakdown
			{...props}
			organizationLanguage="lv"
		/>,
	);
	fireEvent.click(screen.getByRole("button"));
	expect(screen.getByRole("status")).toHaveTextContent("Ielādē detalizāciju");
	expect(await screen.findByRole("alert")).toHaveTextContent(
		"Neizdevās ielādēt",
	);
	expect(screen.queryByText("private backend error")).not.toBeInTheDocument();
});

it("loads fresh details after reopening", async () => {
	render(<DefaultConstructionForma2QuantityBreakdown {...props} />);
	fireEvent.click(screen.getByRole("button"));
	await screen.findByText("Floor work");
	fireEvent.click(screen.getByRole("button", { name: "Close" }));
	fireEvent.click(screen.getByRole("button"));
	await waitFor(() =>
		expect(
			getDefaultConstructionForma2PositionQuantityDetails,
		).toHaveBeenCalledTimes(2),
	);
});
