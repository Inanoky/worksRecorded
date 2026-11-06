import { resolveFlowModuleKeyForRuntime } from "@/lib/flows/resolve-flow-module-server";
import { FLOW_MODULE_KEYS } from "@/lib/flows/types";
import { prisma } from "@/lib/utils/db";
import { isSuperUserId } from "@/lib/utils/super-user";
import { requireWarehouseImportAccess } from "./warehouse-import-upload";

jest.mock("@/lib/utils/db", () => ({
	prisma: {
		user: { findUnique: jest.fn() },
		site: { findFirst: jest.fn() },
	},
}));
jest.mock("@/lib/flows/resolve-flow-module-server", () => ({
	resolveFlowModuleKeyForRuntime: jest.fn(),
}));
jest.mock("@/lib/utils/super-user", () => ({ isSuperUserId: jest.fn() }));

beforeEach(() => {
	jest.resetAllMocks();
	jest.mocked(isSuperUserId).mockReturnValue(false);
	jest.mocked(prisma.user.findUnique).mockResolvedValue({
		organizationId: "home-org",
		status: null,
	} as never);
	jest.mocked(prisma.site.findFirst).mockResolvedValue({
		id: "site",
		organizationId: "project-org",
	} as never);
	jest
		.mocked(resolveFlowModuleKeyForRuntime)
		.mockResolvedValue(FLOW_MODULE_KEYS.DEFAULT_CONSTRUCTION);
});

it("uses the existing super-user authorization and scopes flow and data to the project's organization", async () => {
	jest.mocked(isSuperUserId).mockReturnValue(true);
	await expect(requireWarehouseImportAccess("admin", "site")).resolves.toEqual({
		userId: "admin",
		siteId: "site",
		organizationId: "project-org",
	});
	expect(prisma.site.findFirst).toHaveBeenCalledWith({
		where: { id: "site" },
		select: { id: true, organizationId: true },
	});
	expect(resolveFlowModuleKeyForRuntime).toHaveBeenCalledWith({
		siteId: "site",
		organizationId: "project-org",
	});
});

it("keeps ordinary users restricted to their own organization", async () => {
	jest.mocked(prisma.site.findFirst).mockResolvedValue(null);
	await expect(
		requireWarehouseImportAccess("member", "site"),
	).rejects.toMatchObject({
		code: "FORBIDDEN",
	});
	expect(prisma.site.findFirst).toHaveBeenCalledWith({
		where: { id: "site", organizationId: "home-org" },
		select: { id: true, organizationId: true },
	});
	expect(resolveFlowModuleKeyForRuntime).not.toHaveBeenCalled();
});

it("allows an active member's own project with a legacy null status", async () => {
	jest.mocked(prisma.site.findFirst).mockResolvedValue({
		id: "site",
		organizationId: "home-org",
	} as never);
	await expect(requireWarehouseImportAccess("member", "site")).resolves.toEqual(
		{
			userId: "member",
			siteId: "site",
			organizationId: "home-org",
		},
	);
	expect(prisma.site.findFirst).toHaveBeenCalledWith({
		where: { id: "site", organizationId: "home-org" },
		select: { id: true, organizationId: true },
	});
});

it("rejects a mismatched organization even if the database returns a row outside the requested scope", async () => {
	await expect(
		requireWarehouseImportAccess("member", "site"),
	).rejects.toMatchObject({
		code: "FORBIDDEN",
	});
	expect(resolveFlowModuleKeyForRuntime).not.toHaveBeenCalled();
});

it("does not require a home organization for an existing active super-user", async () => {
	jest.mocked(isSuperUserId).mockReturnValue(true);
	jest.mocked(prisma.user.findUnique).mockResolvedValue({
		organizationId: null,
		status: "active",
	} as never);
	await expect(
		requireWarehouseImportAccess("admin", "site"),
	).resolves.toMatchObject({
		organizationId: "project-org",
	});
});

it.each([null, { organizationId: "home-org", status: "inactive" }])(
	"rejects missing or inactive users even when their ID is configured as a super-user",
	async (user) => {
		jest.mocked(isSuperUserId).mockReturnValue(true);
		jest.mocked(prisma.user.findUnique).mockResolvedValue(user as never);
		await expect(
			requireWarehouseImportAccess("admin", "site"),
		).rejects.toMatchObject({
			code: "FORBIDDEN",
		});
		expect(prisma.site.findFirst).not.toHaveBeenCalled();
	},
);

it("keeps the default-construction flow restriction for super-users", async () => {
	jest.mocked(isSuperUserId).mockReturnValue(true);
	jest
		.mocked(resolveFlowModuleKeyForRuntime)
		.mockResolvedValue("other-flow" as never);
	await expect(
		requireWarehouseImportAccess("admin", "site"),
	).rejects.toMatchObject({
		code: "FORBIDDEN",
	});
});

it("rejects projects without an organization", async () => {
	jest.mocked(isSuperUserId).mockReturnValue(true);
	jest
		.mocked(prisma.site.findFirst)
		.mockResolvedValue({ id: "site", organizationId: null } as never);
	await expect(
		requireWarehouseImportAccess("admin", "site"),
	).rejects.toMatchObject({
		code: "FORBIDDEN",
	});
	expect(resolveFlowModuleKeyForRuntime).not.toHaveBeenCalled();
});
