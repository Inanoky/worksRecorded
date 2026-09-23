import { prisma } from "@/lib/utils/db";
import { orgCheck } from "@/server/actions/shared-actions";
import type { Forma2Position } from "../lib/forma2-analytics";
import { enableDefaultConstructionQuantityProfile } from "../lib/quantity-plan-actual";
import {
	getDefaultConstructionForma2MappingPage,
	getDefaultConstructionForma2PositionQuantityDetails,
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
		jest
			.mocked(prisma.site.findUnique)
			.mockResolvedValue({ name: "Site", siteDiaryRecordsMap: {} } as never);
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
				Photos: ["https://example.com/diary.jpg"],
				Comments: `First line\n${"Full description. ".repeat(60)}Last line`,
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
				actualQuantity: 67,
				actualWorkCost: cost,
			});
			expect(mapping.rows[0]).toMatchObject({ quantity, actualCost: cost });
			expect(prisma.sitediaryrecords.findMany).toHaveBeenCalledTimes(2);
			const details = await getDefaultConstructionForma2PositionQuantityDetails(
				{ siteId: "site", positionId: position.id },
			);
			expect(details).toMatchObject({
				calculatedTotal: 67,
				includedRecords: 1,
				excludedRecords: 0,
				records: [
					{
						id: "diary",
						quantity,
						reportedQuantity: 67,
						photos: ["https://example.com/diary.jpg"],
						exclusion: null,
						plannedQuantity: profile ? 67 : null,
						description: `First line\n${"Full description. ".repeat(60)}Last line`,
					},
				],
			});
			expect(prisma.sitediaryrecords.findMany).toHaveBeenLastCalledWith(
				expect.objectContaining({
					select: expect.objectContaining({ Comments: true, Photos: true }),
				}),
			);
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
		await expect(
			getDefaultConstructionForma2PositionQuantityDetails({
				siteId: "other-site",
				positionId: "position",
			}),
		).rejects.toThrow("Site not found");
		expect(prisma.sitediaryrecords.findMany).not.toHaveBeenCalled();
	});

	it.each([
		{ quantity: null, unit: "m2", exclusion: "missing-quantity", total: null },
		{ quantity: 12, unit: "m3", exclusion: "unit-mismatch", total: null },
		{ quantity: 0, unit: "m²", exclusion: null, total: 0 },
	])(
		"explains exclusions and preserves zero: $exclusion / $quantity",
		async ({ quantity, unit, exclusion, total }) => {
			jest.mocked(prisma.sitediaryrecords.findMany).mockResolvedValue([
				{
					id: "diary",
					Works: "Floor",
					Date: new Date("2026-09-02"),
					Units: unit,
					Amounts: quantity,
					Location: "First floor",
				},
				{ id: "unassigned", Works: "Floor", Units: "m2", Amounts: 999 },
			] as never);
			const details = await getDefaultConstructionForma2PositionQuantityDetails(
				{ siteId: "site", positionId: position.id },
			);
			expect(details.calculatedTotal).toBe(total);
			expect(details.excludedRecords).toBe(exclusion ? 1 : 0);
			expect(details.records).toHaveLength(1);
			expect(details.records[0]).toMatchObject({
				quantity,
				unit,
				exclusion,
				secondaryLabel: "First floor",
			});
		},
	);

	it("rejects a position outside the site's document", async () => {
		await expect(
			getDefaultConstructionForma2PositionQuantityDetails({
				siteId: "site",
				positionId: "other-position",
			}),
		).rejects.toThrow("Forma 2 position was not found");
	});
});
