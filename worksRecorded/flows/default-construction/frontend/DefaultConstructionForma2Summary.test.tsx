import { fireEvent, render, screen, within } from "@testing-library/react";
import { getDefaultConstructionForma2PositionCostDetails } from "../backend/forma2-analytics-actions";
import {
	buildForma2AnalyticsView,
	type Forma2Position,
} from "../lib/forma2-analytics";
import { DefaultConstructionForma2Summary } from "./DefaultConstructionForma2Summary";

jest.mock("next/navigation", () => ({
	useRouter: () => ({ refresh: jest.fn() }),
}));
jest.mock("../backend/forma2-analytics-actions", () => ({
	getDefaultConstructionForma2PositionCostDetails: jest.fn(),
	getDefaultConstructionForma2PositionQuantityDetails: jest.fn(),
	saveDefaultConstructionForma2Allocations: jest.fn(),
	saveDefaultConstructionForma2MaterialRule: jest.fn(),
	saveDefaultConstructionForma2ContractPosition: jest.fn(),
}));
jest.mock("./DefaultConstructionForma2PdfPreview", () => ({
	DefaultConstructionForma2PdfPreview: () => null,
}));

it("opens a PA section locally, retains drilldowns and shows one section label", () => {
	const base: Forma2Position = {
		id: "section",
		code: "PA1.1",
		name: "PA1.1",
		parentId: null,
		kind: "work",
		categoryCode: "",
		categoryName: "",
		sourceRow: 1,
		unit: "m2",
		plannedQuantity: null,
		laborNormHoursPerUnit: null,
		hourlyRate: null,
		plannedWorkCost: 0,
		plannedMaterialCost: 0,
		plannedMechanismCost: 0,
		plannedTotalCost: 0,
	};
	const view = buildForma2AnalyticsView({
		positions: [
			base,
			{
				...base,
				id: "child",
				parentId: "section",
				code: "",
				name: "PA1.1 - Screed",
				plannedQuantity: 100,
				plannedWorkCost: 200,
				plannedTotalCost: 200,
			},
		],
		sources: [],
		allocations: [],
	});
	render(
		<DefaultConstructionForma2Summary
			siteId="site"
			rows={view.resultRows}
			organizationLanguage="lv"
		/>,
	);
	const summary = screen.getByRole("region", { name: "Kopsavilkums" });
	const button = within(summary).getByRole("button", { name: "PA1.1" });
	expect(button).toHaveAttribute("aria-expanded", "false");
	expect(screen.queryByText("PA1.1 - Screed")).not.toBeInTheDocument();
	fireEvent.click(button);
	expect(screen.getByText("PA1.1 - Screed")).toBeVisible();
	expect(button).toHaveAttribute("aria-expanded", "true");
	expect(screen.getAllByText("200,00 €").length).toBeGreaterThan(1);
	expect(
		getDefaultConstructionForma2PositionCostDetails,
	).not.toHaveBeenCalled();
	fireEvent.click(button);
	expect(screen.queryByText("PA1.1 - Screed")).not.toBeInTheDocument();
});
