import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import {
	getDefaultConstructionForma2SplitDetails,
	saveDefaultConstructionForma2Allocations,
	saveDefaultConstructionForma2Split,
} from "../backend/forma2-analytics-actions";
import { DefaultConstructionForma2SplitEditor } from "./DefaultConstructionForma2SplitEditor";

jest.mock("sonner", () => ({
	toast: { error: jest.fn(), success: jest.fn() },
}));
jest.mock("../backend/forma2-analytics-actions", () => ({
	getDefaultConstructionForma2SplitDetails: jest.fn(),
	saveDefaultConstructionForma2Split: jest.fn(),
	saveDefaultConstructionForma2Allocations: jest.fn(),
	saveDefaultConstructionForma2MaterialRule: jest.fn(),
}));
const data = {
	source: {
		id: "invoice",
		label: "Concrete",
		quantity: 1.5,
		actualCost: 145.5,
		unit: "m3",
	},
	split: null,
	positionId: "a",
	expectedAllocation: "original",
	positionOptions: ["a", "b"].map((id) => ({
		id,
		code: id,
		name: `Position ${id}`,
		categoryName: "Concrete",
		kind: "work" as const,
		parentId: null,
		unit: "m3",
		plannedQuantity: id === "a" ? 10.5 : 20,
	})),
};
const onSaved = jest.fn();
beforeEach(() => {
	jest.clearAllMocks();
	jest.mocked(getDefaultConstructionForma2SplitDetails).mockResolvedValue(data);
	jest.mocked(saveDefaultConstructionForma2Split).mockResolvedValue({
		parts: [],
		remainingValue: 0,
		remainingCost: 0,
		remainingQuantity: 0,
	});
});

async function open() {
	render(
		<DefaultConstructionForma2SplitEditor
			siteId="site"
			sourceId="invoice"
			organizationLanguage="lv"
			onSaved={onSaved}
		/>,
	);
	fireEvent.click(screen.getByRole("button", { name: "Sadalīt" }));
	await screen.findByLabelText("Daudzums 1");
}

it("edits locally and saves 0.5 + 1 m3 only when Saglabāt is pressed", async () => {
	await open();
	fireEvent.change(screen.getByLabelText("Daudzums 1"), {
		target: { value: "0,5" },
	});
	expect(screen.getByText(/Nav piesaistīts:/).closest("p")).toHaveTextContent(
		"97,00",
	);
	fireEvent.click(screen.getByRole("button", { name: "Pievienot pozīciju" }));
	fireEvent.click(
		screen.getAllByRole("combobox", { name: "Piesaistīts pozīcijai" })[1],
	);
	fireEvent.click(screen.getByRole("button", { name: /b Position b/ }));
	expect(screen.getByLabelText("Daudzums 2")).toHaveValue("1");
	expect(saveDefaultConstructionForma2Split).not.toHaveBeenCalled();
	expect(saveDefaultConstructionForma2Allocations).not.toHaveBeenCalled();
	fireEvent.click(screen.getByRole("button", { name: "Saglabāt" }));
	await waitFor(() =>
		expect(saveDefaultConstructionForma2Split).toHaveBeenCalledWith({
			siteId: "site",
			sourceId: "invoice",
			expectedAllocation: "original",
			expectedQuantity: 1.5,
			expectedCost: 145.5,
			split: {
				mode: "quantity",
				parts: [
					{ positionId: "a", value: 0.5 },
					{ positionId: "b", value: 1 },
				],
			},
		}),
	);
	expect(onSaved).toHaveBeenCalledTimes(1);
});

it("blocks over-allocation and cancel leaves storage unchanged", async () => {
	await open();
	fireEvent.change(screen.getByLabelText("Daudzums 1"), {
		target: { value: "2" },
	});
	expect(screen.getByRole("button", { name: "Saglabāt" })).toBeDisabled();
	expect(screen.getByRole("alert")).toBeInTheDocument();
	fireEvent.click(screen.getByRole("button", { name: "Atcelt" }));
	expect(saveDefaultConstructionForma2Split).not.toHaveBeenCalled();
});

it.each(["percent", "cost"] as const)(
	"reopens a saved %s split",
	async (mode) => {
		jest.mocked(getDefaultConstructionForma2SplitDetails).mockResolvedValue({
			...data,
			split: {
				mode,
				parts: [{ positionId: "a", value: mode === "percent" ? 50 : 72.75 }],
			},
		});
		render(
			<DefaultConstructionForma2SplitEditor
				siteId="site"
				sourceId="invoice"
				isSplit
				organizationLanguage="en"
				onSaved={onSaved}
			/>,
		);
		fireEvent.click(screen.getByRole("button", { name: "Edit split" }));
		expect(
			await screen.findByLabelText(
				mode === "percent" ? "Percentage 1" : "Amount (EUR) 1",
			),
		).toHaveValue(mode === "percent" ? "50" : "72.75");
		expect(screen.getByText(/Unallocated:/).closest("p")).toHaveTextContent(
			"72.75",
		);
		expect(screen.getByText("Contract quantity: 10.5 m3")).toBeInTheDocument();
	},
);

it("labels allocations and omits empty unit brackets", async () => {
	jest.mocked(getDefaultConstructionForma2SplitDetails).mockResolvedValue({
		...data,
		source: { ...data.source, unit: " " },
	});
	await open();
	expect(
		screen.getByRole("combobox", { name: "Sadalīt pēc" }),
	).toHaveTextContent(/^Daudzums$/);
	expect(screen.getByText(/Mērvienība nav norādīta/)).toBeInTheDocument();
	expect(screen.getByText("Tāmes pozīcija")).toBeInTheDocument();
	expect(screen.getByText("Piešķirtā summa")).toBeInTheDocument();
	expect(screen.getByText("Sadalīts pilnībā")).toBeInTheDocument();
	expect(screen.getByText("Līguma daudzums: 10,5 m3")).toBeInTheDocument();
	expect(screen.getByLabelText("Daudzums 1")).toHaveValue("1.5");
});

it("retains the draft and reports a failed save", async () => {
	jest
		.mocked(saveDefaultConstructionForma2Split)
		.mockRejectedValueOnce(new Error("Conflict"));
	await open();
	fireEvent.change(screen.getByLabelText("Daudzums 1"), {
		target: { value: "0.5" },
	});
	fireEvent.click(screen.getByRole("button", { name: "Saglabāt" }));
	await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Conflict"));
	expect(screen.getByLabelText("Daudzums 1")).toHaveValue("0.5");
	expect(onSaved).not.toHaveBeenCalled();
});

it("shows the selected position contract quantity and updates locally", async () => {
	await open();
	expect(screen.getByText("Līguma daudzums: 10,5 m3")).toBeInTheDocument();
	fireEvent.click(
		screen.getByRole("combobox", { name: "Piesaistīts pozīcijai" }),
	);
	fireEvent.click(screen.getByRole("button", { name: /b Position b/ }));
	expect(screen.getByText("Līguma daudzums: 20 m3")).toBeInTheDocument();
	expect(getDefaultConstructionForma2SplitDetails).toHaveBeenCalledTimes(1);
	expect(saveDefaultConstructionForma2Split).not.toHaveBeenCalled();
});

it.each([null, 0])(
	"distinguishes missing contract quantity from zero (%s)",
	async (plannedQuantity) => {
		jest.mocked(getDefaultConstructionForma2SplitDetails).mockResolvedValue({
			...data,
			positionOptions: data.positionOptions.map((option) => ({
				...option,
				plannedQuantity,
				unit: "m2",
			})),
		});
		await open();
		expect(
			screen.getByText(
				`Līguma daudzums: ${plannedQuantity == null ? "—" : "0 m2"}`,
			),
		).toBeInTheDocument();
	},
);
