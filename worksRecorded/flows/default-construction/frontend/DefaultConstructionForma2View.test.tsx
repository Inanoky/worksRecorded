import { fireEvent, render, screen, within } from "@testing-library/react";
import { DefaultConstructionForma2View } from "./DefaultConstructionForma2View";

jest.mock("next/navigation", () => ({ useRouter: () => ({}) }));
jest.mock("../backend/forma2-analytics-actions", () => ({}));
jest.mock("./DefaultConstructionForma2Import", () => ({
	DefaultConstructionForma2Import: () => null,
}));
jest.mock("./DefaultConstructionForma2TableScroll", () => ({
	DefaultConstructionForma2TableScroll: ({
		children,
	}: {
		children: React.ReactNode;
	}) => children,
}));

it("shows assigned acts, FIMA BIS badges, and quantities by unit when a Forma 2 row expands", () => {
	const positionId = "console";
	const row = {
		id: positionId,
		code: "01",
		categoryCode: "",
		categoryName: "",
		name: "Konsoles montāža",
		kind: "work" as const,
		parentId: null,
		sourceRow: 1,
		unit: "komplekts",
		plannedQuantity: 40,
		laborNormHoursPerUnit: null,
		hourlyRate: null,
		plannedWorkCost: 60,
		plannedMaterialCost: 30,
		plannedMechanismCost: 10,
		plannedTotalCost: 100,
		actualQuantity: 30,
		excludedQuantityRecords: 0,
		actualWorkCost: 30,
		actualMaterialCost: 20,
		actualMechanismCost: 15,
		actualTotalCost: 65,
		variance: 35,
		assignedRecords: 3,
	};
	render(
		<DefaultConstructionForma2View
			siteId="site"
			organizationLanguage="lv"
			data={{
				isDemo: true,
				siteName: "Olaine stacija",
				document: null,
				resultRows: [row],
				clientCosts: { positions: [row], sources: [], allocations: [] },
				actCoverage: {
					caseId: "668714",
					documentId: "demo",
					coveredByPosition: { [positionId]: 22 },
					acts: [
						["00033", "approved"],
						["00034", "approving"],
						["00035", "draft"],
					].map(([label, status]) => ({
						key: label,
						label,
						title: null,
						status,
						positionId,
						url: `https://bis.gov.lv/${label}`,
						matchedWorks: 1,
						nativeWorks: 1,
						workQuantities:
							label === "00033"
								? [
										{
											id: "200",
											number: "696",
											quantity: 8,
											unit: "komplekts",
										},
										{
											id: "201",
											number: "699",
											quantity: 14,
											unit: "komplekts",
										},
										{ id: "202", number: "700", quantity: 1.5, unit: "m" },
									]
								: [],
					})),
				},
			}}
		/>,
	);
	const trigger = screen.getByRole("button", { name: /Konsoles montāža/ });
	const position = trigger.closest("tr");
	expect(position).not.toBeNull();
	expect(
		within(position as HTMLElement).getByRole("cell", { name: /^65,00\s*€$/ }),
	).toBeVisible();
	expect(trigger).toHaveAttribute("aria-expanded", "false");
	expect(screen.queryByRole("link", { name: "00033" })).not.toBeInTheDocument();
	expect(screen.queryByText(/Ar aktiem/)).not.toBeInTheDocument();

	fireEvent.click(
		within(position as HTMLElement).getByRole("cell", { name: "komplekts" }),
	);
	expect(trigger).toHaveAttribute("aria-expanded", "true");
	expect(screen.getByRole("link", { name: "00033" })).toHaveAttribute(
		"href",
		"https://bis.gov.lv/00033",
	);
	expect(screen.getByText("BIS apstiprināts")).toHaveClass("bg-emerald-50");
	expect(screen.getByText("BIS gaida apstiprinājumu")).toHaveClass("bg-sky-50");
	expect(screen.getByText("BIS melnraksts")).toHaveClass("bg-blue-50");
	expect(screen.getByText("22 komplekts · 1,5 m")).toBeVisible();
	expect(screen.getByText("Darbu apjomi")).toBeVisible();
	const workDetails = screen.getByText("Darbu apjomi").closest("details");
	expect(workDetails).not.toBeNull();
	(workDetails as HTMLDetailsElement).open = true;
	expect(screen.getByRole("link", { name: "BIS Nr. 696" })).toHaveAttribute(
		"href",
		"https://bis.gov.lv/bisp/lv/portal/logbooks/performed_works/200/edit?entry_ids%5B%5D=200",
	);
	expect(screen.getByText("8 komplekts")).toBeVisible();

	fireEvent.click(trigger);
	expect(trigger).toHaveAttribute("aria-expanded", "false");
	expect(screen.queryByRole("link", { name: "00034" })).not.toBeInTheDocument();
});
