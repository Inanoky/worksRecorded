import { headers } from "next/headers";
import { getFlowAssignments } from "@/lib/flows/assignments-server";
import { canAccessFlowConfigAdmin } from "@/lib/production-flow/config";
import { prisma } from "@/lib/utils/db";
import { requireUser } from "@/lib/utils/requireUser";
import { loadFlowConfigs } from "./load-settings";

jest.mock("next/headers", () => ({ headers: jest.fn() }));
jest.mock("next/navigation", () => ({
	notFound: () => {
		throw new Error("not found");
	},
}));
jest.mock("@/lib/utils/requireUser", () => ({ requireUser: jest.fn() }));
jest.mock("@/lib/production-flow/config", () => ({
	canAccessFlowConfigAdmin: jest.fn(),
}));
jest.mock("@/lib/flows/assignments-server", () => ({
	getFlowAssignments: jest.fn(),
}));
jest.mock("@/lib/flows/registry", () => ({ getFlowModules: () => [] }));
jest.mock("@/lib/utils/db", () => ({
	prisma: {
		organization: { findMany: jest.fn() },
		user: { findMany: jest.fn() },
	},
}));

beforeEach(() => {
	jest.resetAllMocks();
	jest.mocked(requireUser).mockResolvedValue({ id: "viewer" } as never);
	jest.mocked(headers).mockResolvedValue(
		new Headers({
			host: "internal",
			"x-forwarded-host": "www.worksrecorded.com",
		}) as never,
	);
	jest.mocked(prisma.organization.findMany).mockResolvedValue([]);
	jest.mocked(prisma.user.findMany).mockResolvedValue([]);
	jest.mocked(getFlowAssignments).mockResolvedValue([]);
});

it("checks the authenticated viewer and forwarded host before reading admin data", async () => {
	jest.mocked(canAccessFlowConfigAdmin).mockReturnValue(false);
	await expect(loadFlowConfigs()).rejects.toThrow("not found");
	expect(canAccessFlowConfigAdmin).toHaveBeenCalledWith(
		"viewer",
		"www.worksrecorded.com",
	);
	expect(prisma.organization.findMany).not.toHaveBeenCalled();
	expect(prisma.user.findMany).not.toHaveBeenCalled();
	expect(getFlowAssignments).not.toHaveBeenCalled();
});

it("returns settings only after the server authorizes the viewer", async () => {
	jest.mocked(canAccessFlowConfigAdmin).mockReturnValue(true);
	await expect(loadFlowConfigs()).resolves.toEqual({
		organizations: [],
		users: [],
		assignments: [],
		flowModules: [],
	});
	expect(prisma.organization.findMany).toHaveBeenCalledTimes(1);
	expect(prisma.user.findMany).toHaveBeenCalledTimes(1);
	expect(getFlowAssignments).toHaveBeenCalledTimes(1);
});

it("does not read data when authentication fails", async () => {
	jest.mocked(requireUser).mockRejectedValue(new Error("login required"));
	await expect(loadFlowConfigs()).rejects.toThrow("login required");
	expect(prisma.user.findMany).not.toHaveBeenCalled();
});
