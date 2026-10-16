import { fireEvent, render, screen } from "@testing-library/react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { getFimaWarehouseAvailability } from "@/server/actions/fima-warehouse";
import { FimaWarehouse } from "./FimaWarehouse";
import {
	FimaProjectWarehousePreload,
	FimaWarehousePreload,
	FimaWarehouseProvider,
} from "./FimaWarehouseProvider";

jest.mock("next/navigation", () => ({ usePathname: jest.fn() }));
jest.mock("@/server/actions/fima-warehouse", () => ({
	getFimaWarehouseAvailability: jest.fn(),
}));
beforeEach(() => {
	jest.resetAllMocks();
	jest.mocked(getFimaWarehouseAvailability).mockResolvedValue([
		{
			id: "m",
			label: "BIS material",
			measurementUnit: "gab.",
			deliveredQuantity: 10,
			usedQuantity: 2,
			availableQuantity: 8,
		},
	]);
});
function Project() {
	const [open, setOpen] = useState(false);
	return (
		<FimaWarehouseProvider>
			<FimaWarehousePreload siteId="project" />
			<button type="button" onClick={() => setOpen(true)}>
				Open warehouse
			</button>
			{open ? (
				<FimaWarehouse siteId="project" connected>
					Invoices
				</FimaWarehouse>
			) : null}
		</FimaWarehouseProvider>
	);
}
it("starts loading when the project opens and reuses the data when Noliktava is opened", async () => {
	render(<Project />);
	expect(getFimaWarehouseAvailability).toHaveBeenCalledWith("project");
	fireEvent.click(screen.getByRole("button", { name: "Open warehouse" }));
	expect(await screen.findByText("BIS material")).toBeInTheDocument();
	expect(getFimaWarehouseAvailability).toHaveBeenCalledTimes(1);
});
it("drops the previous user's material cache when the provider scope changes", async () => {
	const tree = (scope: string) => (
		<FimaWarehouseProvider key={scope}>
			<FimaWarehouse siteId="project" connected>
				Invoices
			</FimaWarehouse>
		</FimaWarehouseProvider>
	);
	const { rerender } = render(tree("member-one"));
	await screen.findByText("BIS material");
	jest.mocked(getFimaWarehouseAvailability).mockResolvedValue([]);
	rerender(tree("member-two"));
	expect(screen.queryByText("BIS material")).not.toBeInTheDocument();
	await screen.findByText("BIS nav pieejamu materiālu ar pozitīvu atlikumu.");
	expect(getFimaWarehouseAvailability).toHaveBeenCalledTimes(2);
});

it("preloads only the connected FIMA project in the current route", async () => {
	jest.mocked(usePathname).mockReturnValue("/dashboard/sites/project/BIS");
	const { rerender } = render(
		<FimaWarehouseProvider>
			<FimaProjectWarehousePreload siteIds={["project", "another"]} />
		</FimaWarehouseProvider>,
	);
	expect(getFimaWarehouseAvailability).toHaveBeenCalledTimes(1);
	expect(getFimaWarehouseAvailability).toHaveBeenCalledWith("project");
	jest.mocked(usePathname).mockReturnValue("/dashboard/all-projects");
	rerender(
		<FimaWarehouseProvider>
			<FimaProjectWarehousePreload siteIds={["project", "another"]} />
		</FimaWarehouseProvider>,
	);
	expect(getFimaWarehouseAvailability).toHaveBeenCalledTimes(1);
});
