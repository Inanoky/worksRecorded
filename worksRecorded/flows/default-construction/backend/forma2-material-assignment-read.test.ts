jest.mock("@/lib/utils/db", () => ({
	prisma: {
		analytics: { findUnique: jest.fn() },
	},
}));

import { DEFAULT_CONSTRUCTION_FORMA2_ANALYTICS_KEY } from "@/flows/default-construction/lib/forma2-analytics";
import { prisma } from "@/lib/utils/db";
import { readStoredDefaultConstructionForma2MaterialAssignments } from "./forma2-material-assignment-read";

describe("stored Forma2 material assignment reads", () => {
	beforeEach(() => {
		jest.resetAllMocks();
	});

	it("returns stored assignments without writing or resolving access again", async () => {
		jest.mocked(prisma.analytics.findUnique).mockResolvedValue({
			currentWeekProgress: {
				[DEFAULT_CONSTRUCTION_FORMA2_ANALYTICS_KEY]: {
					document: {
						id: "document-1",
						importedAt: "2026-11-09T00:00:00.000Z",
						positions: [
							{
								id: "position-1",
								code: "1",
								categoryCode: "",
								categoryName: "",
								name: "Cements",
								kind: "material",
								parentId: null,
								sourceRow: 1,
								unit: "kg",
								plannedQuantity: 10,
								laborNormHoursPerUnit: null,
								hourlyRate: null,
								plannedWorkCost: 0,
								plannedMaterialCost: 100,
								plannedMechanismCost: 0,
								plannedTotalCost: 100,
							},
						],
					},
					allocations: [
						{
							sourceType: "material",
							sourceId: "material-1",
							positionId: "position-1",
							method: "rule",
							confidence: 1,
							assignedAt: "2026-11-09T00:00:00.000Z",
						},
					],
					materialRules: [
						{
							id: "rule-1",
							normalizedName: "cements",
							displayName: "Cements",
							positionId: "position-1",
							createdAt: "2026-11-09T00:00:00.000Z",
						},
					],
				},
			},
		} as never);

		await expect(
			readStoredDefaultConstructionForma2MaterialAssignments("site-1", [
				{ id: "material-1", name: "Cements", invoiceNr: "INV-1" },
				{ id: "material-2", name: "Cements", invoiceNr: "INV-2" },
			]),
		).resolves.toMatchObject({
			enabled: true,
			assignments: [
				{
					sourceId: "material-1",
					positionId: "position-1",
					method: "rule",
				},
				{
					sourceId: "material-2",
					positionId: "position-1",
					method: "rule",
				},
			],
			positionOptions: [{ id: "position-1", name: "Cements" }],
		});
		expect(prisma.analytics.findUnique).toHaveBeenCalledTimes(1);
	});
});
