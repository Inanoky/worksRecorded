import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import * as XLSX from "xlsx";
import {
	buildForma2AnalyticsView,
	type Forma2Position,
} from "../lib/forma2-analytics";
import { getForma2AnalyticsCopy } from "../lib/forma2-analytics-copy";
import { DefaultConstructionForma2Export } from "./DefaultConstructionForma2Export";

jest.mock("xlsx", () => ({
	...jest.requireActual("xlsx"),
	writeFile: jest.fn(),
}));
jest.mock("sonner", () => ({ toast: { error: jest.fn() } }));

describe("Forma 2 quantity export", () => {
	it.each(["en", "lv"])(
		"exports both numeric quantities and correctly aligned costs in %s",
		async (language) => {
			jest.mocked(XLSX.writeFile).mockClear();
			const position: Forma2Position = {
				id: "work",
				code: "1",
				categoryCode: "",
				categoryName: "",
				name: "Floor",
				kind: "work",
				parentId: null,
				sourceRow: 1,
				unit: "m2",
				plannedQuantity: 67,
				laborNormHoursPerUnit: null,
				hourlyRate: null,
				plannedWorkCost: 100,
				plannedMaterialCost: 0,
				plannedMechanismCost: 0,
				plannedTotalCost: 100,
			};
			const view = buildForma2AnalyticsView({
				positions: [position],
				sources: [
					{
						id: "diary",
						type: "work",
						selectedPositionId: position.id,
						label: "Floor",
						secondaryLabel: "",
						date: null,
						unit: "m2",
						quantity: 74.67,
						hours: null,
						actualCost: 120,
					},
				],
				allocations: [],
			});
			view.resultRows[0].excludedQuantityRecords = 1;
			const t = getForma2AnalyticsCopy(language);
			render(
				<DefaultConstructionForma2Export
					siteName="Test"
					document={null}
					rows={view.resultRows}
					organizationLanguage={language}
				/>,
			);
			fireEvent.click(screen.getByRole("button", { name: t.exportExcel }));
			await waitFor(() => expect(XLSX.writeFile).toHaveBeenCalledTimes(1));
			const workbook = jest.mocked(XLSX.writeFile).mock.calls[0][0];
			const sheet = workbook.Sheets["Forma 2"];
			expect(sheet.E4.v).toBe(t.contractQuantity);
			expect(sheet.F4.v).toBe(t.actualQuantity);
			expect(sheet.E5).toMatchObject({ v: 67, t: "n", z: "0.00" });
			expect(sheet.F5).toMatchObject({ v: 74.67, t: "n", z: "0.00" });
			expect(sheet.F5.c?.[0].t).toBe(
				t.quantityExcluded.replace("{count}", "1"),
			);
			expect(sheet.G5).toMatchObject({ v: 100, z: "€ #,##0.00" });
			expect(sheet.K5).toMatchObject({ v: 120, z: "€ #,##0.00" });
			expect(sheet.P5.v).toBe(1);
			expect(sheet.E6).toBeUndefined();
			expect(sheet.F6).toBeUndefined();
			expect(sheet["!autofilter"]?.ref).toBe("A4:P5");
			expect(sheet["!cols"]).toHaveLength(16);
		},
	);
});
