import { prisma } from "@/lib/utils/db";
import { orgCheck } from "@/server/actions/shared-actions";
import {
	getDefaultConstructionForma2PositionCostDetails,
	getDefaultConstructionForma2SplitDetails,
	runDefaultConstructionForma2AutoAssignment,
	saveDefaultConstructionForma2Allocations,
	saveDefaultConstructionForma2Split,
} from "./forma2-analytics-actions";
import { automaticallyAssignForma2Sources } from "./forma2-auto-assignment";

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
		analytics: {
			findUnique: jest.fn(),
			updateMany: jest.fn(),
			upsert: jest.fn(),
		},
		bISmaterialRecords: { findFirst: jest.fn(), findMany: jest.fn() },
		site: { findUnique: jest.fn() },
		sitediaryrecords: { findMany: jest.fn() },
	},
}));

const position = {
	id: "a",
	code: "1",
	name: "Concrete",
	kind: "work",
	parentId: null,
	unit: "m3",
	plannedQuantity: 12.5,
	categoryName: "",
	plannedWorkCost: 0,
	plannedMaterialCost: 200,
	plannedMechanismCost: 0,
	plannedTotalCost: 200,
};
const initial = {
	defaultConstructionForma2: {
		version: 1,
		document: {
			id: "doc",
			fileName: "estimate.xlsx",
			positions: [position, { ...position, id: "b" }],
		},
		allocations: [
			{
				sourceId: "invoice",
				sourceType: "material",
				positionId: "a",
				method: "automatic",
				confidence: 0.9,
				assignedAt: "2026-09-25",
			},
		],
		materialRules: [],
	},
};
let root: typeof initial;
const originalClone = globalThis.structuredClone;
beforeAll(() => {
	globalThis.structuredClone = (value) => JSON.parse(JSON.stringify(value));
});
afterAll(() => {
	globalThis.structuredClone = originalClone;
});
beforeEach(() => {
	jest.clearAllMocks();
	root = structuredClone(initial);
	jest.mocked(orgCheck).mockResolvedValue({ organizationId: "org" } as never);
	jest
		.mocked(prisma.analytics.findUnique)
		.mockImplementation(
			() => Promise.resolve({ currentWeekProgress: root }) as never,
		);
	jest.mocked(prisma.analytics.updateMany).mockImplementation((args) => {
		root = args.data.currentWeekProgress as unknown as typeof root;
		return Promise.resolve({ count: 1 }) as never;
	});
	jest.mocked(prisma.bISmaterialRecords.findFirst).mockResolvedValue({
		id: "invoice",
		name: "Concrete",
		quantity: 1.5,
		cost: 145.5,
		measurementUnit: "m3",
	} as never);
	jest.mocked(prisma.bISmaterialRecords.findMany).mockResolvedValue([
		{
			id: "invoice",
			name: "Concrete",
			quantity: 1.5,
			cost: 145.5,
			measurementUnit: "m3",
		},
	] as never);
	jest.mocked(prisma.sitediaryrecords.findMany).mockResolvedValue([]);
	jest
		.mocked(prisma.site.findUnique)
		.mockResolvedValue({ name: "Site", siteDiaryRecordsMap: {} } as never);
});

async function input() {
	const data = await getDefaultConstructionForma2SplitDetails({
		siteId: "site",
		sourceId: "invoice",
	});
	return {
		siteId: "site",
		sourceId: "invoice",
		split: {
			mode: "quantity" as const,
			parts: [
				{ positionId: "a", value: 0.5 },
				{ positionId: "b", value: 1 },
			],
		},
		expectedAllocation: data.expectedAllocation,
		expectedCost: data.source.actualCost,
		expectedQuantity: data.source.quantity,
	};
}

it("includes contract quantities and estimate units in split details", async () => {
	const details = await getDefaultConstructionForma2SplitDetails({
		siteId: "site",
		sourceId: "invoice",
	});
	expect(details.positionOptions).toEqual(
		expect.arrayContaining([
			expect.objectContaining({ id: "a", plannedQuantity: 12.5, unit: "m3" }),
		]),
	);
});

it("preserves a manual split saved while AI assignment was in flight", async () => {
	const draft = await input();
	jest
		.mocked(automaticallyAssignForma2Sources)
		.mockImplementationOnce(async () => {
			await saveDefaultConstructionForma2Split(draft);
			return [
				{
					...initial.defaultConstructionForma2.allocations[0],
					positionId: "b",
				},
			] as never;
		});
	await runDefaultConstructionForma2AutoAssignment("site");
	const saved = await getDefaultConstructionForma2SplitDetails({
		siteId: "site",
		sourceId: "invoice",
	});
	expect(saved.split?.parts).toEqual(draft.split.parts);
	expect(root.defaultConstructionForma2.allocations).toHaveLength(1);
	expect(prisma.analytics.upsert).not.toHaveBeenCalled();
});

it("saves only allocations, reopens the split, and reconciles both cost panels", async () => {
	await saveDefaultConstructionForma2Split(await input());
	expect(prisma.analytics.updateMany).toHaveBeenCalledWith(
		expect.objectContaining({
			where: { siteId: "site", currentWeekProgress: { equals: initial } },
		}),
	);
	const reopened = await getDefaultConstructionForma2SplitDetails({
		siteId: "site",
		sourceId: "invoice",
	});
	expect(reopened.split).toMatchObject({
		mode: "quantity",
		basisTotal: 1.5,
		parts: [
			{ positionId: "a", value: 0.5 },
			{ positionId: "b", value: 1 },
		],
	});
	const a = await getDefaultConstructionForma2PositionCostDetails({
		siteId: "site",
		positionId: "a",
		costType: "material",
	});
	const b = await getDefaultConstructionForma2PositionCostDetails({
		siteId: "site",
		positionId: "b",
		costType: "material",
	});
	expect(a).toMatchObject({
		calculatedTotal: 48.5,
		records: [{ quantity: 0.5, isSplit: true, actualCost: 48.5 }],
	});
	expect(b).toMatchObject({
		calculatedTotal: 97,
		records: [{ quantity: 1, isSplit: true, actualCost: 97 }],
	});
});

it.each(["quantity", "position", "stale", "cost", "source", "access"])(
	"rejects invalid %s without writing",
	async (scenario) => {
		const args = await input();
		if (scenario === "quantity") args.split.parts[0].value = 2;
		if (scenario === "position") args.split.parts[0].positionId = "foreign";
		if (scenario === "stale") args.expectedAllocation = "outdated";
		if (scenario === "cost") args.expectedCost = 999;
		if (scenario === "source")
			jest.mocked(prisma.bISmaterialRecords.findFirst).mockResolvedValue(null);
		if (scenario === "access")
			jest.mocked(orgCheck).mockResolvedValue(null as never);
		await expect(saveDefaultConstructionForma2Split(args)).rejects.toThrow();
		expect(prisma.analytics.updateMany).not.toHaveBeenCalled();
	},
);

it("rejects concurrent allocation changes instead of overwriting them", async () => {
	const args = await input();
	jest.mocked(prisma.analytics.updateMany).mockResolvedValueOnce({ count: 0 });
	await expect(saveDefaultConstructionForma2Split(args)).rejects.toThrow(
		"Piesaistes ir mainījušās",
	);
});

it("protects saved splits from whole-line assignment controls", async () => {
	await saveDefaultConstructionForma2Split(await input());
	await expect(
		saveDefaultConstructionForma2Allocations({
			siteId: "site",
			allocations: [
				{ sourceId: "invoice", sourceType: "material", positionId: "b" },
			],
		}),
	).rejects.toThrow("sadalījums");
	expect(prisma.analytics.upsert).not.toHaveBeenCalled();
});
