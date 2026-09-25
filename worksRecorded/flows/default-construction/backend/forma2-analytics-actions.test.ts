import { prisma } from "@/lib/utils/db";
import { orgCheck } from "@/server/actions/shared-actions";
import type { Forma2Position } from "../lib/forma2-analytics";
import { enableDefaultConstructionQuantityProfile } from "../lib/quantity-plan-actual";
import {
	getDefaultConstructionForma2MappingPage,
	getDefaultConstructionForma2PositionCostDetails,
	getDefaultConstructionForma2PositionQuantityDetails,
	getDefaultConstructionForma2Results,
	saveDefaultConstructionForma2Allocations,
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
		analytics: { findUnique: jest.fn(), upsert: jest.fn() },
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
		await expect(
			getDefaultConstructionForma2PositionCostDetails({
				siteId: "other-site",
				positionId: "position",
				costType: "total",
			}),
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

	it("persists a reviewed reassignment and refreshes both cost breakdowns without changing the diary", async () => {
		const other = { ...position, id: "other", code: "2", name: "Other work" };
		const stored = {
			currentWeekProgress: {
				defaultConstructionForma2: {
					version: 1,
					document: {
						id: "document",
						fileName: "estimate.xlsx",
						sheetName: "Estimate",
						importedAt: "2026-09-01",
						positions: [position, other],
					},
					allocations: [],
					materialRules: [],
				},
			},
		};
		jest
			.mocked(prisma.analytics.findUnique)
			.mockImplementation(() => Promise.resolve(stored) as never);
		jest.mocked(prisma.analytics.upsert).mockImplementation((args) => {
			stored.currentWeekProgress = args.update
				.currentWeekProgress as unknown as typeof stored.currentWeekProgress;
			return Promise.resolve({}) as never;
		});
		jest.mocked(prisma.site.findUnique).mockResolvedValue({
			name: "Site",
			siteDiaryRecordsMap: {
				Works: { DropDownOptions: { Floor: "Floor" } },
				otherSettings: {
					defaultConstructionForma2WorkSync: {
						documentId: "document",
						entries: [{ positionId: position.id, work: "Floor" }],
					},
					defaultConstructionProductivity: {
						version: 4,
						works: [
							{
								work: "Floor",
								unit: "m2",
								hourlyCost: 2,
								laborNormHoursPerUnit: 1,
								costCalculationMode: "output",
							},
						],
					},
				},
			},
		} as never);
		const before = await getDefaultConstructionForma2PositionCostDetails({
			siteId: "site",
			positionId: position.id,
			costType: "work",
		});
		expect(before.calculatedTotal).toBe(134);
		expect(before.positionOptions.map((option) => option.id)).toEqual([
			position.id,
			other.id,
		]);
		await saveDefaultConstructionForma2Allocations({
			siteId: "site",
			allocations: [
				{
					sourceId: "diary",
					sourceType: "work",
					positionId: other.id,
					method: "manual",
					overrideJournalPosition: true,
				},
			],
		});
		const oldDetails = await getDefaultConstructionForma2PositionCostDetails({
			siteId: "site",
			positionId: position.id,
			costType: "work",
		});
		const newDetails = await getDefaultConstructionForma2PositionCostDetails({
			siteId: "site",
			positionId: other.id,
			costType: "work",
		});
		expect(oldDetails.records).toHaveLength(0);
		expect(newDetails.calculatedTotal).toBe(134);
		expect(newDetails.records[0]).toMatchObject({
			id: "diary",
			label: "Floor",
			assignmentMethod: "manual",
			assignedPosition: { id: other.id },
		});
		expect(
			(await getDefaultConstructionForma2Results("site")).resultRows.map(
				(row) => row.actualWorkCost,
			),
		).toEqual([0, 134]);
	});

	it.each([
		"foreign-position",
		"foreign-record",
		"inaccessible-site",
		"incompatible-position",
	])("rejects reassignment to %s", async (scenario) => {
		if (scenario === "incompatible-position") {
			const stored = await prisma.analytics.findUnique({
				where: { siteId: "site" },
			});
			const data = structuredClone(stored) as unknown as {
				currentWeekProgress: {
					defaultConstructionForma2: {
						document: { positions: Forma2Position[] };
					};
				};
			};
			data.currentWeekProgress.defaultConstructionForma2.document.positions[0].kind =
				"material";
			jest.mocked(prisma.analytics.findUnique).mockResolvedValue(data as never);
		}
		if (scenario === "foreign-record")
			jest.mocked(prisma.sitediaryrecords.findMany).mockResolvedValue([]);
		if (scenario === "inaccessible-site")
			jest.mocked(orgCheck).mockResolvedValue(null as never);
		await expect(
			saveDefaultConstructionForma2Allocations({
				siteId: "site",
				allocations: [
					{
						sourceId: "diary",
						sourceType: "work",
						positionId:
							scenario === "foreign-position"
								? "other-site-position"
								: position.id,
						overrideJournalPosition: true,
					},
				],
			}),
		).rejects.toThrow();
		expect(prisma.analytics.upsert).not.toHaveBeenCalled();
	});
});
