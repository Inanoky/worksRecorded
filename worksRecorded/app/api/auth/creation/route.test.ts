const mockGetUser = jest.fn();
const mockEnsureTgemAccessDefaults = jest.fn();
const mockRedirect = jest.fn((url: string) => ({ url }));
const mockTransactionClient = {
	organization: { create: jest.fn() },
	user: { delete: jest.fn(), create: jest.fn() },
};
const mockPrisma = {
	user: { findUnique: jest.fn(), findFirst: jest.fn() },
	$transaction: jest.fn(),
};

jest.mock("@kinde-oss/kinde-auth-nextjs/server", () => ({
	getKindeServerSession: () => ({ getUser: mockGetUser }),
}));
jest.mock("next/server", () => ({
	NextResponse: { redirect: (url: string) => mockRedirect(url) },
}));
jest.mock("@/lib/tgem-invoice-approval/access", () => ({
	ensureTgemAccessDefaults: (...args: unknown[]) =>
		mockEnsureTgemAccessDefaults(...args),
}));
jest.mock("@/lib/utils/db", () => ({ prisma: mockPrisma }));

import { GET } from "./route";

describe("auth creation", () => {
	beforeEach(() => {
		jest.resetAllMocks();
		jest.spyOn(console, "log").mockImplementation(() => undefined);
		mockGetUser.mockResolvedValue({
			id: "user-1",
			email: "user@example.com",
			given_name: "Anna",
			family_name: "Bērziņa",
			picture: null,
		});
		mockPrisma.$transaction.mockImplementation(
			(callback: (tx: typeof mockTransactionClient) => unknown) =>
				callback(mockTransactionClient),
		);
		mockEnsureTgemAccessDefaults.mockResolvedValue(null);
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it("provisions a pending TGEM user inside the activation transaction", async () => {
		mockPrisma.user.findUnique.mockResolvedValue(null);
		mockPrisma.user.findFirst.mockResolvedValue({
			id: "pending-1",
			organizationId: "org-1",
		});
		mockTransactionClient.user.create.mockResolvedValue({
			id: "user-1",
			organizationId: "org-1",
		});

		await GET();

		expect(mockEnsureTgemAccessDefaults).toHaveBeenCalledWith(
			mockTransactionClient,
			{
				organizationId: "org-1",
				actorUserId: "user-1",
				userIds: ["user-1"],
			},
		);
		expect(mockRedirect).toHaveBeenCalledWith(
			"http://localhost:3000/dashboard",
		);
	});

	it("keeps new non-TGEM account creation unchanged when provisioning is a no-op", async () => {
		mockPrisma.user.findUnique.mockResolvedValue(null);
		mockPrisma.user.findFirst.mockResolvedValue(null);
		mockTransactionClient.organization.create.mockResolvedValue({
			id: "org-new",
		});
		mockTransactionClient.user.create.mockResolvedValue({
			id: "user-1",
			organizationId: "org-new",
		});

		await GET();

		expect(mockEnsureTgemAccessDefaults).toHaveBeenCalledWith(
			mockTransactionClient,
			expect.objectContaining({ organizationId: "org-new" }),
		);
		expect(mockRedirect).toHaveBeenCalledWith(
			"http://localhost:3000/dashboard/welcome",
		);
	});

	it("does not complete activation when provisioning fails", async () => {
		mockPrisma.user.findUnique.mockResolvedValue(null);
		mockPrisma.user.findFirst.mockResolvedValue({
			id: "pending-1",
			organizationId: "org-1",
		});
		mockTransactionClient.user.create.mockResolvedValue({
			id: "user-1",
			organizationId: "org-1",
		});
		mockEnsureTgemAccessDefaults.mockRejectedValue(
			new Error("provisioning failed"),
		);

		await expect(GET()).rejects.toThrow("provisioning failed");
		expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
		expect(mockRedirect).not.toHaveBeenCalled();
	});

	it("does not recreate deliberately removed access for an existing user", async () => {
		mockPrisma.user.findUnique.mockResolvedValue({
			id: "user-1",
			organizationId: "org-1",
		});

		await GET();

		expect(mockEnsureTgemAccessDefaults).not.toHaveBeenCalled();
		expect(mockPrisma.$transaction).not.toHaveBeenCalled();
	});
});
