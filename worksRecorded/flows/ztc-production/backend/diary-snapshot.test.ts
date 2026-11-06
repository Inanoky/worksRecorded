import { deserialize, serialize } from "node:v8";

const mockFindMany = jest.fn();
const mockOrgCheck = jest.fn();
const mockLoadConfiguration = jest.fn();
const originalStructuredClone = global.structuredClone;

jest.mock("@/lib/utils/db", () => ({
	prisma: {
		ztcRecords: { findMany: (...args: unknown[]) => mockFindMany(...args) },
	},
}));
jest.mock("@/lib/utils/requireUser", () => ({
	requireUser: async () => ({ id: "user-a" }),
}));
jest.mock("@/lib/production-flow/runtime-server", () => ({
	resolveAdvancedProductionWorkflowContextForSite: async (siteId: string) => ({
		siteId,
		organizationId: "org-a",
	}),
}));
jest.mock("@/server/actions/shared-actions", () => ({
	orgCheck: (...args: unknown[]) => mockOrgCheck(...args),
}));
jest.mock("@/flows/ztc-production/lib/ztc-record-audit", () => ({}));
jest.mock("./site-configuration", () => ({
	loadZtcSiteConfiguration: (...args: unknown[]) =>
		mockLoadConfiguration(...args),
}));

import {
	getZtcDiarySnapshot,
	getZtcSiteDiaryRecords,
	getZtcWorkspaceSnapshot,
} from "./actions";

describe("ZTC diary snapshot", () => {
	beforeAll(() => {
		global.structuredClone = (value) => deserialize(serialize(value));
	});
	afterAll(() => {
		global.structuredClone = originalStructuredClone;
	});
	beforeEach(() => {
		jest.clearAllMocks();
		mockOrgCheck.mockResolvedValue({ organizationId: "org-a" });
		mockLoadConfiguration.mockResolvedValue(null);
	});

	it("loads every completed noncancelled record within the authorized organization", async () => {
		mockFindMany.mockResolvedValue(
			Array.from({ length: 160 }, (_, index) => ({
				id: String(index),
				Date: new Date("2026-11-04T10:00:00Z"),
				Works: "Latojums",
				Amounts: 10,
				TimeInvolved: 1,
				User: { firstName: "Jānis", lastName: "Bērziņš" },
				Photos: ["photo.jpg"],
				Comments_Custom_2: "metadata",
			})),
		);
		const result = await getZtcDiarySnapshot({ siteId: "site-a" });
		expect(mockOrgCheck).toHaveBeenCalledWith("user-a", "site-a");
		expect(result).toHaveLength(160);
		expect(result[0]).toMatchObject({
			id: "0",
			createdBy: "Jānis Bērziņš",
			Amounts: "10",
			TimeInvolved: "1",
			Photos: ["photo.jpg"],
			Comments_Custom_2: "metadata",
		});
		const query = mockFindMany.mock.calls[0][0];
		expect(query.where).toMatchObject({
			siteId: "site-a",
			organizationId: "org-a",
			Date_Custom_2: { not: null },
			AND: [expect.any(Object)],
		});
		expect(query.where).not.toHaveProperty("OR");
		expect(query).not.toHaveProperty("take");
		expect(query).not.toHaveProperty("skip");
		expect(query.select).toMatchObject({
			Photos: true,
			Comments_Custom_2: true,
			pausedAt: true,
			pauseIntervals: true,
		});
	});

	it("rejects access before reading records from another organization", async () => {
		mockOrgCheck.mockResolvedValue({ organizationId: "org-b" });
		await expect(getZtcDiarySnapshot({ siteId: "site-a" })).rejects.toThrow(
			"Jums nav piekļuves",
		);
		expect(mockFindMany).not.toHaveBeenCalled();
	});

	it("keeps day dialogs restricted to the requested date", async () => {
		mockFindMany.mockResolvedValue([]);
		await getZtcSiteDiaryRecords({ siteId: "site-a", date: "2026-11-04" });
		const query = mockFindMany.mock.calls[0][0];
		expect(query.where.OR).toHaveLength(2);
		expect(query.where.OR[0].Date.gte.getHours()).toBe(0);
		expect(query.where.OR[0].Date.lte.getHours()).toBe(23);
		expect(query.where.OR[1]).toHaveProperty("Date_Custom_1");
	});

	it("loads settings, rates, rows and project options with a single authorization check", async () => {
		mockFindMany.mockResolvedValue([
			{
				id: "one",
				Date: new Date(),
				Works: "Latojums",
				Location: "Projekts A",
			},
			{
				id: "two",
				Date: new Date(),
				Works: "Latojums",
				Location: "Projekts A",
			},
			{
				id: "three",
				Date: new Date(),
				Works: "Izkraušana",
				Location: "Papilddarbi",
			},
		]);
		const result = await getZtcWorkspaceSnapshot({ siteId: "site-a" });
		expect(result.status).toBe("ok");
		if (result.status !== "ok") throw new Error("Expected workspace");
		expect(result.data.rows).toHaveLength(3);
		expect(result.data.projectOptions).toEqual(["Projekts A"]);
		expect(result.data.rates.length).toBeGreaterThan(0);
		expect(result.data.config).toHaveProperty("otherSettings");
		expect(mockOrgCheck).toHaveBeenCalledTimes(1);
		expect(mockFindMany).toHaveBeenCalledTimes(1);
	});

	it("returns an explicit denial so the client can evict revoked cached data", async () => {
		mockOrgCheck.mockResolvedValue({ organizationId: "other" });
		await expect(
			getZtcWorkspaceSnapshot({ siteId: "site-a" }),
		).resolves.toEqual({ status: "denied" });
		expect(mockFindMany).not.toHaveBeenCalled();
	});

	it("does not confuse transient database failures with access revocation", async () => {
		mockFindMany.mockRejectedValueOnce(new Error("Database unavailable"));
		await expect(getZtcWorkspaceSnapshot({ siteId: "site-a" })).rejects.toThrow(
			"Database unavailable",
		);
	});
});
