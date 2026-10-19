import { prisma } from "@/lib/utils/db";
import { requireUser } from "@/lib/utils/requireUser";
import { orgCheck } from "@/server/actions/shared-actions";
import { getFimaDiaryFilterOptions } from "./fima-diary-filter-options";

jest.mock("@/lib/utils/db", () => ({
	prisma: { sitediaryrecords: { groupBy: jest.fn() } },
}));
jest.mock("@/lib/utils/requireUser", () => ({ requireUser: jest.fn() }));
jest.mock("@/server/actions/shared-actions", () => ({ orgCheck: jest.fn() }));
const siteId = "c39cb04c-8ce5-477d-acd0-99586a82d850";
beforeEach(() => {
	jest.resetAllMocks();
	jest.mocked(requireUser).mockResolvedValue({ id: "member" } as never);
	jest.mocked(orgCheck).mockResolvedValue({ organizationId: "fima" } as never);
});

it("loads work and location options from all active project records without pagination", async () => {
	jest
		.mocked(prisma.sitediaryrecords.groupBy)
		.mockResolvedValueOnce([
			{ Works: "Page 1 work" },
			{ Works: "Page 3 work" },
			{ Works: null },
			{ Works: "" },
		] as never)
		.mockResolvedValueOnce([
			{ Location: "Floor 9" },
			{ Location: "Floor 1" },
		] as never);
	await expect(getFimaDiaryFilterOptions(siteId)).resolves.toEqual({
		works: ["Page 1 work", "Page 3 work"],
		locations: ["Floor 1", "Floor 9"],
	});
	expect(orgCheck).toHaveBeenCalledWith("member", siteId);
	const where = {
		archivedAt: null,
		siteId,
		Site: {
			organizationId: "fima",
			siteDiaryRecordsMap: {
				path: ["otherSettings", "fimaCollaboration"],
				equals: true,
			},
		},
	};
	expect(prisma.sitediaryrecords.groupBy).toHaveBeenNthCalledWith(1, {
		by: ["Works"],
		where,
	});
	expect(prisma.sitediaryrecords.groupBy).toHaveBeenNthCalledWith(2, {
		by: ["Location"],
		where,
	});
});

it("denies access before reading filter options", async () => {
	jest.mocked(orgCheck).mockResolvedValue(false);
	await expect(getFimaDiaryFilterOptions(siteId)).rejects.toThrow(
		"Nav piekļuves",
	);
	expect(prisma.sitediaryrecords.groupBy).not.toHaveBeenCalled();
});
