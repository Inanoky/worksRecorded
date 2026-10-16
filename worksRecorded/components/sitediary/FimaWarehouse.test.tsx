import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { getFimaWarehouseAvailability } from "@/server/actions/fima-warehouse";
import { FimaWarehouse } from "./FimaWarehouse";

jest.mock("@/server/actions/fima-warehouse", () => ({
	getFimaWarehouseAvailability: jest.fn(),
}));
const material = {
	id: "123",
	label: "Slīdcaurule BFA-0000-ANC-0017",
	measurementUnit: "gab.",
	deliveredQuantity: 10,
	usedQuantity: 4,
	availableQuantity: 6,
};
beforeEach(() => {
	jest.resetAllMocks();
	jest.mocked(getFimaWarehouseAvailability).mockResolvedValue([material]);
});
it("loads current BIS availability on opening and keeps local invoices in their own view", async () => {
	render(
		<FimaWarehouse siteId="site" connected>
			<p>Invoice content</p>
		</FimaWarehouse>,
	);
	expect(await screen.findByText(material.label)).toBeInTheDocument();
	expect(getFimaWarehouseAvailability).toHaveBeenCalledWith("site");
	expect(screen.getByText("6")).toBeInTheDocument();
	expect(screen.queryByText("Invoice content")).not.toBeInTheDocument();
	fireEvent.change(screen.getByLabelText("Meklēt BIS materiālu"), {
		target: { value: "unknown" },
	});
	expect(
		screen.getByText("Atbilstoši materiāli nav atrasti."),
	).toBeInTheDocument();
	fireEvent.click(
		screen.getByRole("button", { name: "Saņemtie materiāli un rēķini" }),
	);
	expect(screen.getByText("Invoice content")).toBeInTheDocument();
});
it("retains the last successful availability and reports refresh failures", async () => {
	render(
		<FimaWarehouse siteId="site" connected>
			Invoices
		</FimaWarehouse>,
	);
	await screen.findByText(material.label);
	jest
		.mocked(getFimaWarehouseAvailability)
		.mockRejectedValue(new Error("BIS nav pieejams"));
	fireEvent.click(screen.getByRole("button", { name: "Atjaunot no BIS" }));
	await waitFor(() =>
		expect(screen.getByRole("alert")).toHaveTextContent("BIS nav pieejams"),
	);
	expect(screen.getByText(material.label)).toBeInTheDocument();
	expect(screen.getByRole("alert")).toHaveTextContent(
		"iepriekš ielādētie dati",
	);
});
it("does not request BIS data when no connection exists", () => {
	render(
		<FimaWarehouse siteId="site" connected={false}>
			Invoices
		</FimaWarehouse>,
	);
	expect(getFimaWarehouseAvailability).not.toHaveBeenCalled();
	expect(
		screen.getByRole("button", { name: "Atjaunot no BIS" }),
	).toBeDisabled();
});
