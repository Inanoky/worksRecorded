import { getDefaultConstructionQuantityComparison } from "@/flows/default-construction/lib/quantity-plan-actual";
import { prisma } from "@/lib/utils/db";
import {
	archiveVisualPlan,
	listVisualPlans,
	persistVisualPlan,
	restoreVisualPlan,
	VisualPlanConflictError,
} from "./planning-store";
import { loadVisualDrawing, requireVisualAccess } from "./store";

jest.mock("./store", () => ({
	loadVisualDrawing: jest.fn(),
	requireVisualAccess: jest.fn(),
}));
jest.mock("@/lib/utils/db", () => ({
	prisma: {
		$transaction: jest.fn(),
		$executeRaw: jest.fn(),
		site: { findFirst: jest.fn() },
		constructionPlan: {
			findMany: jest.fn(),
			findFirst: jest.fn(),
			create: jest.fn(),
			updateMany: jest.fn(),
			findUniqueOrThrow: jest.fn(),
		},
		constructionPlanRevision: { create: jest.fn() },
		visualPlanningContact: {
			findMany: jest.fn(),
			findFirst: jest.fn(),
		},
		sitediaryrecords: { findMany: jest.fn() },
	},
}));

const siteId = "33333333-3333-4333-8333-333333333333";
const drawingId = "22222222-2222-4222-8222-222222222222";
const planId = "11111111-1111-4111-8111-111111111111";
const organizationId = "58467603-196e-4661-83ff-fe26e4b0ff0b";
const geometry = {
	version: 1 as const,
	areas: [
		{
			id: "area-1",
			page: 1,
			polygon: [
				{ x: 0.1, y: 0.1 },
				{ x: 0.5, y: 0.1 },
				{ x: 0.5, y: 0.5 },
			],
		},
	],
};
const input = {
	siteId,
	drawingId,
	work: "XPS",
	location: "1. stāvs",
	unit: "m²",
	quantity: 100,
	startDate: "2026-10-12",
	endDate: "2026-10-18",
	geometry,
};

function stored(overrides: Record<string, unknown> = {}) {
	return {
		id: planId,
		siteId,
		planType: "visual_milestone",
		version: 1,
		visualDrawingId: drawingId,
		work: "XPS",
		location: "1. stāvs",
		unit: "m²",
		quantity: 100,
		startDate: new Date("2026-10-12"),
		date: new Date("2026-10-18"),
		visualPlanningContactId: null,
		matchKey: '["xps","1. stāvs","m2"]',
		visualAreas: geometry,
		geometryReviewRequired: false,
		archivedAt: null,
		archivedBy: null,
		createdBy: "user",
		updatedBy: "user",
		createdAt: new Date("2026-10-11"),
		updatedAt: new Date("2026-10-11"),
		...overrides,
	};
}

beforeEach(() => {
	jest.clearAllMocks();
	jest.useFakeTimers().setSystemTime(new Date("2026-10-15T10:00:00Z"));
	jest.mocked(loadVisualDrawing).mockResolvedValue({
		row: { organizationId },
		drawing: { state: { location: "1. stāvs" } },
	} as never);
	jest.mocked(requireVisualAccess).mockResolvedValue({
		userId: "user",
		siteId,
		organizationId,
	});
	jest.mocked(prisma.site.findFirst).mockResolvedValue({
		siteDiaryRecordsMap: {
			Works: { DropDownOptions: { XPS: "XPS", Smilts: "Smilts" } },
			Units: { DropDownOptions: { m2: "m²", m3: "m³" } },
			otherSettings: {
				defaultConstructionProductivity: {
					version: 4,
					works: [{ work: "XPS", unit: "m²", laborNormHoursPerUnit: null }],
				},
			},
		},
	} as never);
	jest
		.mocked(prisma.$transaction)
		.mockImplementation((async (callback: (tx: typeof prisma) => unknown) =>
			callback(prisma)) as never);
	jest.mocked(prisma.constructionPlan.findMany).mockResolvedValue([]);
	jest
		.mocked(prisma.constructionPlan.create)
		.mockResolvedValue(stored() as never);
	jest
		.mocked(prisma.constructionPlan.updateMany)
		.mockResolvedValue({ count: 1 });
	jest
		.mocked(prisma.constructionPlan.findUniqueOrThrow)
		.mockResolvedValue(stored() as never);
	jest
		.mocked(prisma.constructionPlanRevision.create)
		.mockResolvedValue({} as never);
	jest.mocked(prisma.sitediaryrecords.findMany).mockResolvedValue([]);
	jest.mocked(prisma.visualPlanningContact.findMany).mockResolvedValue([]);
	jest.mocked(prisma.visualPlanningContact.findFirst).mockResolvedValue(null);
});

afterEach(() => jest.useRealTimers());

it("preserves project section assignments in stored geometry and audit revisions", async () => {
	const site = await prisma.site.findFirst({ where: { id: siteId } });
	const config = site?.siteDiaryRecordsMap as Record<string, unknown>;
	jest
		.mocked(prisma.site.findFirst)
		.mockResolvedValue({
			siteDiaryRecordsMap: {
				...config,
				otherSettings: {
					...(config.otherSettings as object),
					limeniVisualSections: ["A"],
				},
			},
		} as never);
	const selected = { ...geometry, section: "A" };
	jest
		.mocked(prisma.constructionPlan.create)
		.mockResolvedValue(stored({ visualAreas: selected }) as never);
	expect(
		await persistVisualPlan("user", { ...input, geometry: selected }),
	).toMatchObject({ geometry: selected });
	expect(prisma.constructionPlan.create).toHaveBeenCalledWith({
		data: expect.objectContaining({ visualAreas: selected }),
	});
	expect(prisma.constructionPlanRevision.create).toHaveBeenCalledWith(
		expect.objectContaining({
			data: expect.objectContaining({
				snapshot: expect.objectContaining({ geometry: selected }),
			}),
		}),
	);
});

it("rejects sections that do not belong to the project before any plan write", async () => {
	await expect(
		persistVisualPlan("user", {
			...input,
			geometry: { ...geometry, section: "Unknown" },
		}),
	).rejects.toThrow("sekciju");
	expect(prisma.constructionPlan.create).not.toHaveBeenCalled();
});

it("creates a visual milestone and its audit snapshot in one transaction", async () => {
	const result = await persistVisualPlan("user", input);
	expect(result).toMatchObject({ id: planId, work: "XPS", quantity: 100 });
	expect(prisma.constructionPlan.create).toHaveBeenCalledWith({
		data: expect.objectContaining({
			siteId,
			planType: "visual_milestone",
			startDate: new Date("2026-10-12"),
			date: new Date("2026-10-18"),
			visualDrawingId: drawingId,
			visualAreas: geometry,
		}),
	});
	expect(prisma.constructionPlanRevision.create).toHaveBeenCalledWith({
		data: expect.objectContaining({
			planId,
			version: 1,
			action: "create",
			actorId: "user",
		}),
	});
});

it("assigns only a contact that belongs to the same project", async () => {
	const contactId = "55555555-5555-4555-8555-555555555555";
	jest.mocked(prisma.visualPlanningContact.findFirst).mockResolvedValue({
		archivedAt: null,
	} as never);
	jest
		.mocked(prisma.constructionPlan.create)
		.mockResolvedValue(stored({ visualPlanningContactId: contactId }) as never);

	const result = await persistVisualPlan("user", { ...input, contactId });

	expect(prisma.visualPlanningContact.findFirst).toHaveBeenCalledWith({
		where: { id: contactId, siteId },
		select: { archivedAt: true },
	});
	expect(prisma.constructionPlan.create).toHaveBeenCalledWith({
		data: expect.objectContaining({ visualPlanningContactId: contactId }),
	});
	expect(result.contactId).toBe(contactId);
});

it("rejects an overlapping active item and returns the conflicting plan", async () => {
	jest.mocked(prisma.constructionPlan.findMany).mockResolvedValue([
		stored({
			id: "44444444-4444-4444-8444-444444444444",
			startDate: new Date("2026-10-18"),
			date: new Date("2026-10-20"),
		}),
	] as never);
	await expect(persistVisualPlan("user", input)).rejects.toMatchObject({
		constructor: VisualPlanConflictError,
		conflict: { id: "44444444-4444-4444-8444-444444444444" },
	});
	expect(prisma.constructionPlan.create).not.toHaveBeenCalled();
});

it("updates only the expected active version and records the new revision", async () => {
	jest
		.mocked(prisma.constructionPlan.findUniqueOrThrow)
		.mockResolvedValue(stored({ version: 2, quantity: 125 }) as never);
	const result = await persistVisualPlan("user", {
		...input,
		id: planId,
		version: 1,
		quantity: 125,
	});
	expect(result).toMatchObject({ version: 2, quantity: 125 });
	expect(prisma.constructionPlan.updateMany).toHaveBeenCalledWith({
		where: {
			id: planId,
			siteId,
			planType: "visual_milestone",
			version: 1,
			archivedAt: null,
		},
		data: expect.objectContaining({ version: { increment: 1 } }),
	});
	expect(prisma.constructionPlanRevision.create).toHaveBeenCalledWith({
		data: expect.objectContaining({ action: "update", version: 2 }),
	});
});

it("loads live progress from the start date and respects factual quantities", async () => {
	jest
		.mocked(prisma.constructionPlan.findMany)
		.mockResolvedValue([stored()] as never);
	jest.mocked(prisma.visualPlanningContact.findMany).mockResolvedValue([
		{
			id: "55555555-5555-4555-8555-555555555555",
			siteId,
			name: "Anna Bērziņa",
			phone: "37120000000",
			archivedAt: null,
			createdAt: new Date("2026-10-11"),
			updatedAt: new Date("2026-10-11"),
		},
	] as never);
	jest.mocked(prisma.sitediaryrecords.findMany).mockResolvedValue([
		{
			id: "actual",
			Date: new Date("2026-10-14T10:00:00Z"),
			Works: "XPS",
			Location: "1. stāvs",
			Units: "m²",
			Amounts: 60,
			Comments_Custom_1: null,
		},
	] as never);
	const result = await listVisualPlans("user", siteId, drawingId);
	expect(result.plans[0]).toMatchObject({
		id: planId,
		progress: {
			actualIds: ["actual"],
			actualQuantity: 60,
			progressPercent: 60,
			status: "active",
		},
	});
	expect(result.contacts).toEqual([
		expect.objectContaining({
			name: "Anna Bērziņa",
			phone: "37120000000",
		}),
	]);
	expect(prisma.sitediaryrecords.findMany).toHaveBeenCalledWith(
		expect.objectContaining({
			where: expect.objectContaining({
				siteId,
				organizationId,
				archivedAt: null,
				Date: { gte: new Date("2026-10-11") },
			}),
		}),
	);
	expect(getDefaultConstructionQuantityComparison).toBeDefined();
});

it("archives without deleting and restores only when no active item conflicts", async () => {
	jest
		.mocked(prisma.constructionPlan.findUniqueOrThrow)
		.mockResolvedValueOnce(
			stored({
				version: 2,
				archivedAt: new Date("2026-10-15T10:00:00Z"),
			}) as never,
		)
		.mockResolvedValueOnce(stored({ version: 3 }) as never);
	const archived = await archiveVisualPlan("user", {
		siteId,
		id: planId,
		version: 1,
	});
	expect(archived.archivedAt).toBe("2026-10-15T10:00:00.000Z");
	expect(prisma.constructionPlan.updateMany).toHaveBeenCalledWith(
		expect.objectContaining({
			data: expect.objectContaining({
				archivedBy: "user",
				version: { increment: 1 },
			}),
		}),
	);
	jest
		.mocked(prisma.constructionPlan.findFirst)
		.mockResolvedValue(stored({ version: 2, archivedAt: new Date() }) as never);
	jest.mocked(prisma.constructionPlan.findMany).mockResolvedValue([]);
	const restored = await restoreVisualPlan("user", {
		siteId,
		id: planId,
		version: 2,
	});
	expect(restored).toMatchObject({ version: 3, archivedAt: null });
	expect(prisma.constructionPlanRevision.create).toHaveBeenLastCalledWith({
		data: expect.objectContaining({ action: "restore", version: 3 }),
	});
});
