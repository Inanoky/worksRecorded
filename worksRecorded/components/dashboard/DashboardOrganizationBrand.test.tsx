import { render, screen } from "@testing-library/react";
import { FLOW_MODULE_KEYS } from "@/lib/flows/types";
import { DashboardOrganizationBrand } from "./DashboardOrganizationBrand";

describe("DashboardOrganizationBrand", () => {
	it("shows a larger proportional TGEM logo without a surrounding border", () => {
		render(
			<DashboardOrganizationBrand
				flowModuleKey={FLOW_MODULE_KEYS.TGEM_INVOICE_APPROVAL}
			/>,
		);
		const logo = screen.getByRole("img", { name: "TGEM" });
		expect(logo).toHaveAttribute(
			"sizes",
			"(min-width: 1024px) 240px, (min-width: 640px) 192px, 144px",
		);
		expect(logo).toHaveClass("object-cover", "object-[center_45%]");
		expect(logo.parentElement).toHaveClass(
			"h-12",
			"w-36",
			"sm:h-16",
			"sm:w-48",
			"lg:h-20",
			"lg:w-60",
			"bg-white",
		);
		expect(logo.parentElement).not.toHaveClass("border");
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
