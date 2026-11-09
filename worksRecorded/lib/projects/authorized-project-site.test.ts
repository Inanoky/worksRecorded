const mockFindFirst = jest.fn();
const mockIsSuperUser = jest.fn();

jest.mock("server-only", () => ({}), { virtual: true });
jest.mock("@/lib/utils/db", () => ({
	prisma: {
		site: { findFirst: (...args: unknown[]) => mockFindFirst(...args) },
	},
}));
jest.mock("@/lib/utils/super-user", () => ({
	isSuperUserId: (...args: unknown[]) => mockIsSuperUser(...args),
}));

import { getAuthorizedProjectSite } from "./authorized-project-site";

beforeEach(() => {
	jest.clearAllMocks();
	mockIsSuperUser.mockReturnValue(false);
});

it("loads access and project configuration in one organization-scoped query", async () => {
	mockFindFirst.mockResolvedValue({ id: "site", organizationId: "org" });

	await expect(getAuthorizedProjectSite("user", "site")).resolves.toEqual({
		id: "site",
		organizationId: "org",
	});
	expect(mockFindFirst).toHaveBeenCalledWith({
		where: {
			id: "site",
			organization: { users: { some: { id: "user" } } },
		},
		select: {
			id: true,
			name: true,
			organizationId: true,
			bisCaseId: true,
			siteDiaryRecordsMap: true,
		},
	});
});

it("preserves direct site access for configured superusers", async () => {
	mockIsSuperUser.mockReturnValue(true);
	mockFindFirst.mockResolvedValue(null);

	await getAuthorizedProjectSite("superuser", "site");

	expect(mockFindFirst).toHaveBeenCalledWith(
		expect.objectContaining({ where: { id: "site" } }),
	);
});
