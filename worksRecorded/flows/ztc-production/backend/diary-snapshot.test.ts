const mockFindMany = jest.fn();
const mockOrgCheck = jest.fn();

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
jest.mock("./site-configuration", () => ({}));

import { getZtcDiarySnapshot, getZtcSiteDiaryRecords } from "./actions";

describe("ZTC diary snapshot", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockOrgCheck.mockResolvedValue({ organizationId: "org-a" });
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
});
