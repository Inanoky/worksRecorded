const mockRequireUser = jest.fn();
const mockResolveFlow = jest.fn();
const mockRevalidate = jest.fn();
const mockPrisma = {
	user: { findFirst: jest.fn() },
	site: { deleteMany: jest.fn() },
};
jest.mock("@/lib/utils/db", () => ({ prisma: mockPrisma }));
jest.mock("@/lib/utils/requireUser", () => ({
	requireUser: () => mockRequireUser(),
}));
jest.mock("@/lib/flows/resolve-flow-module-server", () => ({
	resolveFlowModuleKeyForRuntime: (...args: unknown[]) =>
		mockResolveFlow(...args),
}));
jest.mock("next/cache", () => ({
	revalidatePath: (...args: unknown[]) => mockRevalidate(...args),
}));

import { FLOW_MODULE_KEYS } from "@/lib/flows/types";
import { deleteTgemProject } from "./tgem-project-actions";

beforeEach(() => {
	jest.resetAllMocks();
	mockRequireUser.mockResolvedValue({ id: "user-1" });
	mockPrisma.user.findFirst.mockResolvedValue({ organizationId: "org-1" });
	mockResolveFlow.mockResolvedValue(FLOW_MODULE_KEYS.TGEM_INVOICE_APPROVAL);
	mockPrisma.site.deleteMany.mockResolvedValue({ count: 1 });
});

it("deletes only the selected project in the active user's TGEM organization", async () => {
	await expect(deleteTgemProject("site-1")).resolves.toEqual({ ok: true });
	expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
		where: { id: "user-1", status: "active" },
		select: { organizationId: true },
	});
	expect(mockResolveFlow).toHaveBeenCalledWith({ organizationId: "org-1" });
	expect(mockPrisma.site.deleteMany).toHaveBeenCalledWith({
		where: { id: "site-1", organizationId: "org-1" },
	});
	expect(mockRevalidate).toHaveBeenCalledWith("/dashboard/sites");
	expect(mockRevalidate).toHaveBeenCalledWith("/dashboard/invoices");
});

it("requires authentication", async () => {
	mockRequireUser.mockRejectedValue(new Error("Unauthorized"));
	await expect(deleteTgemProject("site-1")).rejects.toThrow("Unauthorized");
	expect(mockPrisma.site.deleteMany).not.toHaveBeenCalled();
});

it.each([null, { organizationId: null }])(
	"rejects missing active membership: %j",
	async (user) => {
		mockPrisma.user.findFirst.mockResolvedValue(user);
		await expect(deleteTgemProject("site-1")).resolves.toEqual({
			ok: false,
			error: "access_denied",
		});
		expect(mockPrisma.site.deleteMany).not.toHaveBeenCalled();
	},
);

it("rejects other flows", async () => {
	mockResolveFlow.mockResolvedValue(FLOW_MODULE_KEYS.DEFAULT_CONSTRUCTION);
	await expect(deleteTgemProject("site-1")).resolves.toEqual({
		ok: false,
		error: "access_denied",
	});
	expect(mockPrisma.site.deleteMany).not.toHaveBeenCalled();
});

it("does not report success for missing or foreign projects", async () => {
	mockPrisma.site.deleteMany.mockResolvedValue({ count: 0 });
	await expect(deleteTgemProject("foreign-site")).resolves.toEqual({
		ok: false,
		error: "access_denied",
	});
	expect(mockPrisma.site.deleteMany).toHaveBeenCalledWith({
		where: { id: "foreign-site", organizationId: "org-1" },
	});
	expect(mockRevalidate).not.toHaveBeenCalled();
});

it.each(["", "   "])("rejects invalid IDs: %j", async (id) => {
	await expect(deleteTgemProject(id)).resolves.toEqual({
		ok: false,
		error: "invalid_input",
	});
	expect(mockPrisma.site.deleteMany).not.toHaveBeenCalled();
});

it("does not report success when deletion fails", async () => {
	mockPrisma.site.deleteMany.mockRejectedValue(
		new Error("Database unavailable"),
	);
	await expect(deleteTgemProject("site-1")).rejects.toThrow(
		"Database unavailable",
	);
	expect(mockRevalidate).not.toHaveBeenCalled();
});
