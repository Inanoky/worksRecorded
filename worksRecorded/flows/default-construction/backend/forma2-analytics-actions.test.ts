import { prisma } from "@/lib/utils/db";
import { orgCheck } from "@/server/actions/shared-actions";
import type { Forma2Position } from "../lib/forma2-analytics";
import { enableDefaultConstructionQuantityProfile } from "../lib/quantity-plan-actual";
import {
	getDefaultConstructionForma2MappingPage,
	getDefaultConstructionForma2Results,
} from "./forma2-analytics-actions";

jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/lib/utils/requireUser", () => ({
	requireUser: jest.fn(async () => ({ id: "user" })),
}));
jest.mock("@/server/actions/shared-actions", () => ({ orgCheck: jest.fn() }));
jest.mock("@/lib/flows/resolve-flow-module-server", () => ({
	resolveFlowModuleKeyForRuntime: jest.fn(async () => "default-construction"),
}));
jest.mock("./forma2-auto-assignment", () => ({
	automaticallyAssignForma2Sources: jest.fn(),
}));
jest.mock("@/lib/utils/db", () => ({
	prisma: {
		analytics: { findUnique: jest.fn() },
		site: { findUnique: jest.fn() },
		sitediaryrecords: { findMany: jest.fn(), count: jest.fn() },
		bISmaterialRecords: { findMany: jest.fn(), count: jest.fn() },
	},
}));

const position: Forma2Position = {
	id: "position",
	code: "1",
	categoryCode: "",
	categoryName: "",
	name: "Floor",
	kind: "work",
	parentId: null,
	sourceRow: 1,
	unit: "m2",
	plannedQuantity: 100,
	laborNormHoursPerUnit: null,
	hourlyRate: null,
	plannedWorkCost: 100,
	plannedMaterialCost: 0,
	plannedMechanismCost: 0,
	plannedTotalCost: 100,
};
const originalStructuredClone = globalThis.structuredClone;

describe("Forma 2 diary quantity loaders", () => {
	beforeAll(() => {
		globalThis.structuredClone = (value) => JSON.parse(JSON.stringify(value));
	});
	afterAll(() => {
		globalThis.structuredClone = originalStructuredClone;
	});
	beforeEach(() => {
		jest.clearAllMocks();
		jest.mocked(orgCheck).mockResolvedValue({ organizationId: "org" } as never);
		jest.mocked(prisma.analytics.findUnique).mockResolvedValue({
			currentWeekProgress: {
				defaultConstructionForma2: {
					version: 1,
					document: {
						id: "document",
						fileName: "estimate.xlsx",
						sheetName: "Estimate",
						importedAt: "2026-09-01",
						positions: [position],
					},
					allocations: [
						{
							sourceId: "diary",
							sourceType: "work",
							positionId: position.id,
							method: "manual",
							confidence: null,
							assignedAt: "2026-09-01",
						},
					],
					materialRules: [],
				},
			},
		} as never);
		jest.mocked(prisma.sitediaryrecords.findMany).mockResolvedValue([
			{
				id: "diary",
				Works: "Floor",
				Date: new Date("2026-09-02"),
				Units: "m2",
				Amounts: 67,
				Comments_Custom_1: "74.67",
				TimeInvolved: 5,
			},
		] as never);
		jest.mocked(prisma.sitediaryrecords.count).mockResolvedValue(1);
		jest.mocked(prisma.bISmaterialRecords.findMany).mockResolvedValue([]);
		jest.mocked(prisma.bISmaterialRecords.count).mockResolvedValue(0);
	});

	it.each([
		{ profile: true, mode: "output", quantity: 74.67, cost: 149.34 },
		{ profile: false, mode: "output", quantity: 67, cost: 134 },
		{ profile: true, mode: "hourly", quantity: 74.67, cost: 10 },
	])(
		"keeps results and mapping consistent for $profile / $mode",
		async ({ profile, mode, quantity, cost }) => {
			const config = {
				Works: { DropDownOptions: { Floor: "Floor" } },
				otherSettings: {
					defaultConstructionProductivity: {
						version: 4,
						works: [
							{
								work: "Floor",
								unit: "m2",
								hourlyCost: 2,
								laborNormHoursPerUnit: 1,
								costCalculationMode: mode,
							},
						],
					},
				},
			};
			jest.mocked(prisma.site.findUnique).mockResolvedValue({
				name: "Site",
				siteDiaryRecordsMap: profile
					? enableDefaultConstructionQuantityProfile(config)
					: config,
			} as never);
			const results = await getDefaultConstructionForma2Results("site");
			const mapping = await getDefaultConstructionForma2MappingPage({
				siteId: "site",
				assignment: "all",
				sourceType: "work",
			});
			expect(results.resultRows[0]).toMatchObject({
				plannedQuantity: 100,
				actualQuantity: quantity,
				actualWorkCost: cost,
			});
			expect(mapping.rows[0]).toMatchObject({ quantity, actualCost: cost });
			expect(prisma.sitediaryrecords.findMany).toHaveBeenCalledTimes(2);
			for (const [query] of jest.mocked(prisma.sitediaryrecords.findMany).mock
				.calls) {
				expect(query).toMatchObject({
					where: { siteId: "site", archivedAt: null },
					select: { Comments_Custom_1: true, Amounts: true },
				});
			}
		},
	);

	it("rejects inaccessible sites before reading diary data", async () => {
		jest.mocked(orgCheck).mockResolvedValue(null as never);
		await expect(
			getDefaultConstructionForma2Results("other-site"),
		).rejects.toThrow("Site not found");
		expect(prisma.sitediaryrecords.findMany).not.toHaveBeenCalled();
	});
});
