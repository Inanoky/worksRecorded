const mockEnsureTgemAccessDefaults = jest.fn();
const mockRemoveTgemUserAccessForOrganization = jest.fn();
const mockPrisma = {
	user: { findUnique: jest.fn(), update: jest.fn() },
	organization: { findUnique: jest.fn() },
	flowAssignment: { upsert: jest.fn() },
	$transaction: jest.fn(),
};

jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("next/headers", () => ({ headers: jest.fn() }));
jest.mock("next/navigation", () => ({
	notFound: jest.fn(() => {
		throw new Error("NEXT_NOT_FOUND");
	}),
}));
jest.mock("@/lib/flows/registry", () => ({ getFlowModuleByKey: jest.fn() }));
jest.mock("@/lib/tgem-invoice-approval/access", () => ({
	ensureTgemAccessDefaults: (...args: unknown[]) =>
		mockEnsureTgemAccessDefaults(...args),
	removeTgemUserAccessForOrganization: (...args: unknown[]) =>
		mockRemoveTgemUserAccessForOrganization(...args),
}));
jest.mock("@/lib/production-flow/config-server", () => ({
	saveProductionFlowConfigOverride: jest.fn(),
}));
jest.mock("@/lib/utils/db", () => ({
	prisma: mockPrisma,
}));
jest.mock("@/lib/utils/requireUser", () => ({ requireUser: jest.fn() }));

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getFlowModuleByKey } from "@/lib/flows/registry";
import { prisma } from "@/lib/utils/db";
import { requireUser } from "@/lib/utils/requireUser";
import {
	assignFlowToOrganizationAction,
	switchUserOrganizationAction,
} from "./actions";

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
		mockPrisma.$transaction.mockImplementation(
			(callback: (tx: typeof mockPrisma) => unknown) => callback(mockPrisma),
		);
		mockEnsureTgemAccessDefaults.mockResolvedValue(null);
		mockRemoveTgemUserAccessForOrganization.mockResolvedValue({
			organizationMembershipsRemoved: 0,
			siteMembershipsRemoved: 0,
		});
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
		expect(mockRemoveTgemUserAccessForOrganization).toHaveBeenCalledWith(
			mockPrisma,
			expect.objectContaining({
				organizationId: "old-org",
				userId,
			}),
		);
		expect(mockEnsureTgemAccessDefaults).toHaveBeenCalledWith(
			mockPrisma,
			expect.objectContaining({
				organizationId: "new-org",
				userIds: [userId],
			}),
		);
		expect(revalidatePath).toHaveBeenCalledWith("/dashboard", "layout");
		expect(revalidatePath).toHaveBeenCalledWith(
			"/dashboard/admin/flow-configs",
		);
	});

	it("assigns the TGEM flow and provisions defaults in one transaction", async () => {
		jest.mocked(getFlowModuleByKey).mockReturnValue({
			key: "tgem-invoice-approval",
			name: "TGEM",
			category: "invoice",
		} as never);
		const formData = new FormData();
		formData.set("organizationId", "new-org");
		formData.set("flowModuleKey", "tgem-invoice-approval");

		await expect(
			assignFlowToOrganizationAction(null, formData),
		).resolves.toMatchObject({ ok: true });
		expect(mockPrisma.flowAssignment.upsert).toHaveBeenCalledWith({
			where: { organizationId: "new-org" },
			create: {
				organizationId: "new-org",
				flowModuleKey: "tgem-invoice-approval",
				enabled: true,
			},
			update: { flowModuleKey: "tgem-invoice-approval", enabled: true },
		});
		expect(mockEnsureTgemAccessDefaults).toHaveBeenCalledWith(
			mockPrisma,
			expect.objectContaining({ organizationId: "new-org" }),
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

	it("keeps the organization move and TGEM provisioning in one transaction", async () => {
		mockEnsureTgemAccessDefaults.mockRejectedValue(
			new Error("provisioning failed"),
		);

		await expect(
			switchUserOrganizationAction(null, switchForm()),
		).resolves.toEqual({ ok: false, message: "provisioning failed" });
		expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
		expect(prisma.user.update).toHaveBeenCalled();
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
