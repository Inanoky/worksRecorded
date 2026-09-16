jest.mock("@kinde-oss/kinde-auth-nextjs/server", () => ({
	getKindeServerSession: () => ({
		getUser: jest.fn().mockResolvedValue({ id: "user" }),
	}),
}));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/lib/flows/resolve-flow-module-server", () => ({
	resolveFlowModuleKeyForRuntime: jest
		.fn()
		.mockResolvedValue("default-construction"),
}));
jest.mock("@/lib/utils/db", () => ({
	prisma: {
		user: { findUnique: jest.fn() },
		site: { findFirst: jest.fn(), updateMany: jest.fn() },
		constructionPlan: {
			findMany: jest.fn(),
			create: jest.fn(),
			updateMany: jest.fn(),
			findUniqueOrThrow: jest.fn(),
			deleteMany: jest.fn(),
		},
		sitediaryrecords: { findMany: jest.fn() },
		$transaction: jest.fn(),
	},
}));

import { deserialize, serialize } from "node:v8";
import { enableDefaultConstructionQuantityProfile } from "@/flows/default-construction/lib/quantity-plan-actual";
import { resolveFlowModuleKeyForRuntime } from "@/lib/flows/resolve-flow-module-server";
import { prisma } from "@/lib/utils/db";
import {
	deleteConstructionPlan,
	loadConstructionDiaryPlans,
	loadConstructionWeek,
	loadCurrentConstructionWeekReport,
	saveConstructionPlan,
	saveConstructionPlanBatch,
} from "./construction-planner";

const siteId = "73bfa5f9-9e49-460e-876e-8d9eb58ba2cb";
const id = "58467603-196e-4661-83ff-fe26e4b0ff0b";
const config = {
	Works: { DropDownOptions: { Walls: "Walls" } },
	Location: { DropDownOptions: { Floor: "Floor" } },
	Units: { DropDownOptions: { m2: "m2" } },
	otherSettings: {},
};
const draft = {
	siteId,
	date: "2026-09-17",
	work: "Roof",
	location: "Attic",
	unit: "m3",
	quantity: 15,
};
const stored = { ...draft, id, version: 1, date: new Date(draft.date) };
describe("construction planner actions", () => {
	const originalClone = global.structuredClone;
	beforeAll(() => {
		global.structuredClone = (value) => deserialize(serialize(value));
	});
	afterAll(() => {
		global.structuredClone = originalClone;
	});
	beforeEach(() => {
		jest.clearAllMocks();
		jest.useFakeTimers().setSystemTime(new Date("2026-09-16T10:00:00Z"));
		jest
			.mocked(resolveFlowModuleKeyForRuntime)
			.mockResolvedValue("default-construction");
		jest
			.mocked(prisma.user.findUnique)
			.mockResolvedValue({ organizationId: "org", status: "active" } as never);
		jest.mocked(prisma.site.findFirst).mockResolvedValue({
			id: siteId,
			organizationId: "org",
			siteDiaryRecordsMap: config,
			updatedAt: new Date("2026-09-15"),
		} as never);
		jest.mocked(prisma.site.updateMany).mockResolvedValue({ count: 1 });
		jest
			.mocked(prisma.$transaction)
			.mockImplementation((async (callback: (tx: typeof prisma) => unknown) =>
				callback(prisma)) as never);
		jest
			.mocked(prisma.constructionPlan.create)
			.mockResolvedValue(stored as never);
		jest
			.mocked(prisma.constructionPlan.updateMany)
			.mockResolvedValue({ count: 1 });
		jest
			.mocked(prisma.constructionPlan.findUniqueOrThrow)
			.mockResolvedValue({ ...stored, version: 2 } as never);
		jest.mocked(prisma.constructionPlan.findMany).mockResolvedValue([]);
		jest.mocked(prisma.sitediaryrecords.findMany).mockResolvedValue([]);
		jest
			.mocked(prisma.constructionPlan.deleteMany)
			.mockResolvedValue({ count: 1 });
	});
	it("loads complete daily totals independently of diary pagination and excludes archived rows", async () => {
		jest
			.mocked(prisma.constructionPlan.findMany)
			.mockResolvedValue([stored] as never);
		jest.mocked(prisma.sitediaryrecords.findMany).mockResolvedValue([
			{
				id: "first",
				Date: new Date("2026-09-17T10:00:00Z"),
				Works: "Roof",
				Location: "Attic",
				Units: "m3",
				Amounts: 8,
			},
			{
				id: "second",
				Date: new Date("2026-09-16T21:30:00Z"),
				Works: "Roof",
				Location: "Attic",
				Units: "m3",
				Amounts: 9,
			},
			{
				id: "other-day",
				Date: new Date("2026-09-16T10:00:00Z"),
				Works: "Roof",
				Location: "Attic",
				Units: "m3",
				Amounts: 999,
			},
		] as never);
		expect(await loadConstructionDiaryPlans(siteId)).toMatchObject([
			{ actualQuantity: 17, status: "over", actualIds: ["first", "second"] },
		]);
		const query = jest.mocked(prisma.sitediaryrecords.findMany).mock
			.calls[0][0];
		expect(query).toMatchObject({ where: { siteId, archivedAt: null } });
		expect(query).not.toHaveProperty("take");
		expect(query).not.toHaveProperty("skip");
	});
	it("does not query actuals without any plans and enforces organization access", async () => {
		expect(await loadConstructionDiaryPlans(siteId)).toEqual([]);
		expect(prisma.sitediaryrecords.findMany).not.toHaveBeenCalled();
		jest.mocked(prisma.site.findFirst).mockResolvedValue(null);
		await expect(loadConstructionDiaryPlans(siteId)).rejects.toThrow(
			"Nav piekļuves",
		);
	});
	it("compares the factual profile value, not Amounts, in expanded diary cards", async () => {
		jest.mocked(prisma.site.findFirst).mockResolvedValue({
			id: siteId,
			organizationId: "org",
			siteDiaryRecordsMap: enableDefaultConstructionQuantityProfile(config),
		} as never);
		jest
			.mocked(prisma.constructionPlan.findMany)
			.mockResolvedValue([stored] as never);
		jest.mocked(prisma.sitediaryrecords.findMany).mockResolvedValue([
			{
				id: "actual",
				Date: new Date("2026-09-17T10:00:00Z"),
				Works: "Roof",
				Location: "Attic",
				Units: "m3",
				Amounts: 99,
				Comments_Custom_1: "12,5",
			},
		] as never);
		expect(await loadConstructionDiaryPlans(siteId)).toMatchObject([
			{ actualQuantity: 12.5, status: "under" },
		]);
	});
	afterEach(() => jest.useRealTimers());
	it("exports the current Riga week with all records, factual quantities and diary costs", async () => {
		jest.useFakeTimers().setSystemTime(new Date("2026-09-20T22:00:00Z"));
		jest.mocked(prisma.sitediaryrecords.findMany).mockResolvedValue([
			{
				id: "inside",
				Date: new Date("2026-09-20T21:30:00Z"),
				Works: "Walls",
				Amounts: 8,
				WorkersInvolved: 2,
				TimeInvolved: 3,
				Comments: "Done",
			},
			{ id: "outside", Date: new Date("2026-09-20T19:30:00Z"), Amounts: 999 },
		] as never);
		const result = await loadCurrentConstructionWeekReport(siteId);
		expect(result.start).toBe("2026-09-21");
		expect(result.actuals).toHaveLength(1);
		expect(result.actuals[0]).toMatchObject({
			id: "inside",
			workers: 2,
			hours: 3,
			manHours: 6,
			comments: "Done",
		});
		const query = jest.mocked(prisma.sitediaryrecords.findMany).mock
			.calls[0][0];
		expect(query).toMatchObject({ where: { siteId, archivedAt: null } });
		expect(query).not.toHaveProperty("take");
		expect(query).not.toHaveProperty("skip");
	});
	it("saves additions, edits and deletions in one transaction", async () => {
		const { siteId: _, ...row } = draft;
		const deletedId = "32d70b91-af15-4ddf-a017-41d9ad3ac933";
		expect(
			await saveConstructionPlanBatch({
				siteId,
				week: "2026-09-14",
				changes: [row, { ...row, id, version: 1, work: "Walls" }],
				deleted: [{ id: deletedId, version: 2 }],
			}),
		).toEqual({ ok: true });
		expect(prisma.$transaction).toHaveBeenCalledTimes(1);
		expect(prisma.constructionPlan.create).toHaveBeenCalledTimes(1);
		expect(prisma.constructionPlan.updateMany).toHaveBeenCalledTimes(1);
		expect(prisma.constructionPlan.deleteMany).toHaveBeenCalledWith({
			where: {
				id: deletedId,
				siteId,
				version: 2,
				site: { organizationId: "org" },
				date: {
					gt: new Date("2026-09-16"),
					gte: new Date("2026-09-14"),
					lt: new Date("2026-09-21"),
				},
			},
		});
	});
	it("rejects malformed, locked and cross-week batches before writing", async () => {
		const { siteId: _, ...row } = draft;
		const batch = { siteId, week: "2026-09-14", changes: [row], deleted: [] };
		for (const invalid of [
			{ changes: [{ ...row, date: "2026-09-16" }] },
			{ changes: [{ ...row, date: "2026-09-22" }] },
			{ changes: [{ ...row, id }] },
			{ changes: [{ ...row, id, version: 1 }], deleted: [{ id, version: 1 }] },
			{ changes: [{ ...row, quantity: -1 }] },
			{ changes: [{ ...row, siteId }] },
		])
			expect(
				await saveConstructionPlanBatch({ ...batch, ...invalid }),
			).toMatchObject({ ok: false });
		expect(prisma.$transaction).not.toHaveBeenCalled();
	});
	it("aborts the transaction on a stale delete without attempting remaining changes", async () => {
		const { siteId: _, ...row } = draft;
		jest
			.mocked(prisma.constructionPlan.deleteMany)
			.mockResolvedValue({ count: 0 });
		expect(
			await saveConstructionPlanBatch({
				siteId,
				week: "2026-09-14",
				changes: [row],
				deleted: [{ id, version: 1 }],
			}),
		).toMatchObject({ ok: false });
		expect(prisma.constructionPlan.create).not.toHaveBeenCalled();
	});
	it("rejects a batch for an inaccessible site", async () => {
		jest.mocked(prisma.site.findFirst).mockResolvedValue(null);
		expect(
			await saveConstructionPlanBatch({
				siteId,
				week: "2026-09-14",
				changes: [],
				deleted: [{ id, version: 1 }],
			}),
		).toMatchObject({ ok: false });
		expect(prisma.$transaction).not.toHaveBeenCalled();
	});
	it("creates a future plan and remembers dropdown additions atomically", async () => {
		expect(await saveConstructionPlan(draft)).toMatchObject({
			ok: true,
			plan: { id, work: "Roof" },
		});
		expect(prisma.site.updateMany).toHaveBeenCalledWith(
			expect.objectContaining({
				data: {
					siteDiaryRecordsMap: expect.objectContaining({
						Works: expect.objectContaining({
							DropDownOptions: expect.objectContaining({
								Roof: "Roof",
								Walls: "Walls",
							}),
						}),
						Location: expect.objectContaining({
							DropDownOptions: { Floor: "Floor", Attic: "Attic" },
						}),
						Units: expect.objectContaining({
							DropDownOptions: { m2: "m2", m3: "m3" },
						}),
					}),
				},
			}),
		);
		expect(prisma.constructionPlan.create).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					siteId,
					createdBy: "user",
					updatedBy: "user",
					quantity: 15,
				}),
			}),
		);
	});
	it.each(["2026-09-15", "2026-09-16"])(
		"rejects creation on locked date %s before any write",
		async (date) => {
			expect(await saveConstructionPlan({ ...draft, date })).toMatchObject({
				ok: false,
			});
			expect(prisma.$transaction).not.toHaveBeenCalled();
		},
	);
	it("guards the original date and version so past rows cannot be moved into the future", async () => {
		jest
			.mocked(prisma.constructionPlan.updateMany)
			.mockResolvedValue({ count: 0 });
		expect(
			await saveConstructionPlan({ ...draft, id, version: 1 }),
		).toMatchObject({ ok: false });
		expect(prisma.constructionPlan.updateMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id, siteId, version: 1, date: { gt: new Date("2026-09-16") } },
			}),
		);
		expect(prisma.constructionPlan.create).not.toHaveBeenCalled();
	});
	it("rejects inaccessible sites and other flows", async () => {
		jest.mocked(prisma.site.findFirst).mockResolvedValueOnce(null);
		expect(await saveConstructionPlan(draft)).toMatchObject({ ok: false });
		jest
			.mocked(resolveFlowModuleKeyForRuntime)
			.mockResolvedValue("ztc-production" as never);
		expect(await saveConstructionPlan(draft)).toMatchObject({ ok: false });
		expect(prisma.$transaction).not.toHaveBeenCalled();
		expect(prisma.site.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({ where: { id: siteId, organizationId: "org" } }),
		);
	});
	it("rejects invalid quantities, dates and extra diary fields", async () => {
		for (const values of [
			{ quantity: 0 },
			{ quantity: -1 },
			{ date: "2026-02-30" },
			{ Amounts: 30 },
		])
			expect(await saveConstructionPlan({ ...draft, ...values })).toMatchObject(
				{ ok: false },
			);
		expect(prisma.$transaction).not.toHaveBeenCalled();
	});
	it("protects deletes by site, organization, date and version", async () => {
		expect(await deleteConstructionPlan({ siteId, id, version: 1 })).toEqual({
			ok: true,
		});
		expect(prisma.constructionPlan.deleteMany).toHaveBeenCalledWith({
			where: {
				site: { organizationId: "org" },
				siteId,
				id,
				version: 1,
				date: { gt: new Date("2026-09-16") },
			},
		});
	});
	it("loads the full week of non-archived actuals without pagination", async () => {
		await loadConstructionWeek(siteId, "2026-09-16");
		const query = jest.mocked(prisma.sitediaryrecords.findMany).mock
			.calls[0][0];
		expect(query).toMatchObject({
			where: {
				siteId,
				archivedAt: null,
				Date: { gte: new Date("2026-09-13"), lt: new Date("2026-09-21") },
			},
		});
		expect(query).not.toHaveProperty("take");
	});
	it("reads actual quantity from the existing factual profile when enabled", async () => {
		const profile = enableDefaultConstructionQuantityProfile(
			structuredClone(config),
		);
		jest.mocked(prisma.site.findFirst).mockResolvedValue({
			id: siteId,
			organizationId: "org",
			siteDiaryRecordsMap: profile,
		} as never);
		jest.mocked(prisma.sitediaryrecords.findMany).mockResolvedValue([
			{
				id,
				Date: new Date("2026-09-15"),
				Works: "Walls",
				Location: "Floor",
				Units: "m2",
				Amounts: 10,
				Comments_Custom_1: "12.5",
				Comments: "Done",
			},
		] as never);
		expect(
			(await loadConstructionWeek(siteId, "2026-09-16")).actuals[0].quantity,
		).toBe(12.5);
	});
	it("includes local midnight actuals and excludes records outside the selected Riga week", async () => {
		jest.mocked(prisma.sitediaryrecords.findMany).mockResolvedValue([
			{ id: "inside", Date: new Date("2026-09-13T21:30:00Z"), Amounts: 5 },
			{ id: "before", Date: new Date("2026-09-13T20:30:00Z"), Amounts: 5 },
			{ id: "after", Date: new Date("2026-09-20T21:30:00Z"), Amounts: 5 },
		] as never);
		const result = await loadConstructionWeek(siteId, "2026-09-16");
		expect(result.actuals).toHaveLength(1);
		expect(result.actuals[0]).toMatchObject({
			id: "inside",
			date: "2026-09-14",
		});
	});
});
