import { prisma } from "@/lib/utils/db";
import { organizationPlanningContacts } from "./organization-contacts";

jest.mock("@/lib/utils/db", () => ({
	prisma: { user: { findMany: jest.fn() }, workers: { findMany: jest.fn() } },
}));

it("reads scoped organization members and workers and excludes missing numbers and inactive members", async () => {
	jest.mocked(prisma.user.findMany).mockResolvedValue([
		{
			id: "user-1",
			firstName: "Anna",
			lastName: "Bērziņa",
			phone: "+371 20000000",
			status: "active",
		},
		{
			id: "user-2",
			firstName: "Inactive",
			lastName: "Person",
			phone: "37121111111",
			status: "inactive",
		},
		{
			id: "user-3",
			firstName: "No",
			lastName: "Phone",
			phone: null,
			status: "active",
		},
	] as never);
	jest
		.mocked(prisma.workers.findMany)
		.mockResolvedValue([
			{ id: "worker-1", name: "Jānis", surname: "Ozols", phone: "37122222222" },
		] as never);
	expect(await organizationPlanningContacts("org")).toEqual([
		{
			id: "member:user-1",
			name: "Anna Bērziņa",
			phone: "37120000000",
			archivedAt: null,
		},
		{
			id: "worker:worker-1",
			name: "Jānis Ozols",
			phone: "37122222222",
			archivedAt: null,
		},
	]);
	expect(prisma.user.findMany).toHaveBeenCalledWith(
		expect.objectContaining({ where: { organizationId: "org" } }),
	);
	expect(prisma.workers.findMany).toHaveBeenCalledWith(
		expect.objectContaining({
			where: {
				OR: [
					{ organizationId: "org" },
					{ organizationId: null, Site: { organizationId: "org" } },
				],
			},
		}),
	);
});
