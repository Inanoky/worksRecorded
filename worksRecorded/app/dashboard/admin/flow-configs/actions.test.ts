jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("next/headers", () => ({ headers: jest.fn() }));
jest.mock("next/navigation", () => ({
	notFound: jest.fn(() => {
		throw new Error("NEXT_NOT_FOUND");
	}),
}));
jest.mock("@/lib/flows/registry", () => ({ getFlowModuleByKey: jest.fn() }));
jest.mock("@/lib/flows/assignments-server", () => ({
	saveFlowAssignment: jest.fn(),
}));
jest.mock("@/lib/production-flow/config-server", () => ({
	saveProductionFlowConfigOverride: jest.fn(),
}));
jest.mock("@/lib/utils/db", () => ({
	prisma: {
		user: { findUnique: jest.fn(), update: jest.fn() },
		organization: { findUnique: jest.fn() },
	},
}));
jest.mock("@/lib/utils/requireUser", () => ({ requireUser: jest.fn() }));

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/utils/db";
import { requireUser } from "@/lib/utils/requireUser";
import { switchUserOrganizationAction } from "./actions";

describe("switchUserOrganizationAction", () => {
	const userId = "kp_2f5c0987b83a4162ac8819f6339534f8";

	function switchForm() {
		const formData = new FormData();
		formData.set("userId", userId);
		formData.set("organizationId", "new-org");
		return formData;
	}

	beforeEach(() => {
		jest.resetAllMocks();
		jest.mocked(notFound).mockImplementation(() => {
			throw new Error("NEXT_NOT_FOUND");
		});
		jest.mocked(headers).mockResolvedValue({
			get: () => "www.worksrecorded.com",
		} as never);
		jest.mocked(requireUser).mockResolvedValue({ id: userId } as never);
		jest.mocked(prisma.user.findUnique).mockResolvedValue({
			id: userId,
			email: "admin@example.com",
			organizationId: "old-org",
			organization: { name: "Old organization" },
		} as never);
		jest.mocked(prisma.organization.findUnique).mockResolvedValue({
			id: "new-org",
			name: "New organization",
		} as never);
	});

	it("allows this admin to switch and refreshes the dashboard layout and pages", async () => {
		await expect(
			switchUserOrganizationAction(null, switchForm()),
		).resolves.toMatchObject({ ok: true });
		expect(prisma.user.update).toHaveBeenCalledWith({
			where: { id: userId },
			data: {
				organizationId: "new-org",
				lastSelectedSiteIdforWhatsapp: null,
				siteManagerSelectIdforWhatsapp: null,
			},
		});
		expect(revalidatePath).toHaveBeenCalledWith("/dashboard", "layout");
		expect(revalidatePath).toHaveBeenCalledWith(
			"/dashboard/admin/flow-configs",
		);
	});

	it("does not refresh or update when the destination organization is missing", async () => {
		jest.mocked(prisma.organization.findUnique).mockResolvedValue(null);
		await expect(
			switchUserOrganizationAction(null, switchForm()),
		).resolves.toMatchObject({ ok: false });
		expect(prisma.user.update).not.toHaveBeenCalled();
		expect(revalidatePath).not.toHaveBeenCalled();
	});

	it("rejects regular users before accessing organization data", async () => {
		jest.mocked(requireUser).mockResolvedValue({ id: "regular-user" } as never);
		await expect(
			switchUserOrganizationAction(null, switchForm()),
		).rejects.toThrow("NEXT_NOT_FOUND");
		expect(prisma.user.findUnique).not.toHaveBeenCalled();
		expect(prisma.user.update).not.toHaveBeenCalled();
		expect(revalidatePath).not.toHaveBeenCalled();
	});
});
