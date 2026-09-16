import { render, screen } from "@testing-library/react";
import { FLOW_MODULE_KEYS } from "@/lib/flows/types";
import { DashboardOrganizationBrand } from "./DashboardOrganizationBrand";

describe("DashboardOrganizationBrand", () => {
	it("shows the TGEM logo at compact responsive sizes", () => {
		render(
			<DashboardOrganizationBrand
				flowModuleKey={FLOW_MODULE_KEYS.TGEM_INVOICE_APPROVAL}
			/>,
		);
		const logo = screen.getByRole("img", { name: "TGEM" });
		expect(logo).toHaveAttribute("sizes", "(min-width: 640px) 160px, 120px");
		expect(logo).toHaveClass("object-cover", "object-[center_45%]");
		expect(logo.parentElement).toHaveClass(
			"h-10",
			"w-30",
			"sm:h-13",
			"sm:w-40",
			"bg-white",
		);
	});

	it.each([
		FLOW_MODULE_KEYS.DEFAULT_CONSTRUCTION,
		FLOW_MODULE_KEYS.DEFAULT_PRODUCTION,
		FLOW_MODULE_KEYS.ZTC_PRODUCTION,
		null,
		undefined,
	])("does not add TGEM branding to other dashboards: %s", (flowModuleKey) => {
		render(<DashboardOrganizationBrand flowModuleKey={flowModuleKey} />);
		expect(screen.queryByRole("img", { name: "TGEM" })).not.toBeInTheDocument();
	});
});
