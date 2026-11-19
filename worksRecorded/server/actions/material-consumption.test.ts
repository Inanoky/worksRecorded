import { readMaterialConsumption } from "@/lib/material-consumption/store";
import { prisma } from "@/lib/utils/db";
import { requireUser } from "@/lib/utils/requireUser";
import { getMaterialConsumption } from "./material-consumption";

jest.mock("@/lib/utils/db", () => ({
	prisma: { user: { findUnique: jest.fn() } },
}));
jest.mock("@/lib/utils/requireUser", () => ({ requireUser: jest.fn() }));
jest.mock("@/lib/material-consumption/store", () => ({
	readMaterialConsumption: jest.fn(),
}));

beforeEach(() => {
	jest.clearAllMocks();
	jest
		.mocked(requireUser)
		.mockResolvedValue({ id: "user" } as Awaited<
			ReturnType<typeof requireUser>
		>);
});

it("uses the authenticated account's organization rather than a client-supplied organization", async () => {
	jest
		.mocked(prisma.user.findUnique)
		.mockResolvedValue({ organizationId: "org-a", status: "active" } as never);
	jest.mocked(readMaterialConsumption).mockResolvedValue({
		projects: [],
		entries: [],
		coverage: "",
		reviewedAt: null,
		loadedAt: "",
	});
	await getMaterialConsumption();
	expect(readMaterialConsumption).toHaveBeenCalledWith("org-a");
});

it("rejects inactive and unassigned accounts before reading reports", async () => {
	for (const account of [
		{ organizationId: "org-a", status: "inactive" },
		{ organizationId: null, status: "active" },
		null,
	]) {
		jest.mocked(prisma.user.findUnique).mockResolvedValue(account as never);
		await expect(getMaterialConsumption()).rejects.toThrow("nav piekļuves");
	}
	expect(readMaterialConsumption).not.toHaveBeenCalled();
});
