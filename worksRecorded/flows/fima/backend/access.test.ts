jest.mock("@/lib/utils/db", () => ({
	prisma: { user: { findUnique: jest.fn() }, site: { findFirst: jest.fn() } },
}));
jest.mock("@/lib/utils/requireUser", () => ({
	requireUser: jest.fn(async () => ({ id: "u" })),
}));
jest.mock("@/lib/flows/resolve-flow-module-server", () => ({
	resolveFlowModuleKeyForRuntime: jest.fn(),
}));

import { resolveFlowModuleKeyForRuntime } from "@/lib/flows/resolve-flow-module-server";
import { prisma } from "@/lib/utils/db";
import { fimaAccess } from "./access";

beforeEach(() => {
	jest.clearAllMocks();
	(prisma.user.findUnique as jest.Mock).mockResolvedValue({
		organizationId: "org",
	});
	jest.mocked(resolveFlowModuleKeyForRuntime).mockResolvedValue("fima");
});
test("rejects another organization's site before loading business data", async () => {
	(prisma.site.findFirst as jest.Mock).mockResolvedValue(null);
	await expect(fimaAccess("other-site")).rejects.toThrow("Projekts nav");
	expect(prisma.site.findFirst).toHaveBeenCalledWith(
		expect.objectContaining({
			where: { id: "other-site", organizationId: "org" },
		}),
	);
});
test("does not grant FIMA access solely because a user can use admin tools", async () => {
	jest
		.mocked(resolveFlowModuleKeyForRuntime)
		.mockResolvedValue("default-construction");
	await expect(fimaAccess()).rejects.toThrow("FIMA organizācijas");
});
