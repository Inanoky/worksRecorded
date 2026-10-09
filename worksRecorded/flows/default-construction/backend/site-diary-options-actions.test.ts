import { isZtcProductionFlowRuntime } from "@/lib/production-flow/runtime-server";
import { prisma } from "@/lib/utils/db";
import { requireUser } from "@/lib/utils/requireUser";
import { orgCheck } from "@/server/actions/shared-actions";
import {
	getDefaultConstructionSiteDiaryOptions,
	saveDefaultConstructionSiteDiaryOptions,
} from "./site-diary-options-actions";

jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/lib/utils/db", () => ({
	prisma: { site: { findUnique: jest.fn(), update: jest.fn() } },
}));
jest.mock("@/lib/utils/requireUser", () => ({ requireUser: jest.fn() }));
jest.mock("@/server/actions/shared-actions", () => ({ orgCheck: jest.fn() }));
jest.mock("@/lib/production-flow/runtime-server", () => ({
	isZtcProductionFlowRuntime: jest.fn(),
}));

const originalClone = global.structuredClone;
beforeAll(() => {
	global.structuredClone = (value) => JSON.parse(JSON.stringify(value));
});
afterAll(() => {
	global.structuredClone = originalClone;
});

beforeEach(() => {
	jest.resetAllMocks();
	jest.mocked(requireUser).mockResolvedValue({ id: "user" } as never);
	jest.mocked(orgCheck).mockResolvedValue({ organizationId: "org" } as never);
});

it("refuses production settings without reading or writing construction configuration", async () => {
	jest.mocked(isZtcProductionFlowRuntime).mockResolvedValue(true);
	await expect(
		getDefaultConstructionSiteDiaryOptions("ztc-site"),
	).rejects.toThrow("Production settings");
	await expect(
		saveDefaultConstructionSiteDiaryOptions({
			siteId: "ztc-site",
			locations: [],
			works: [],
		}),
	).rejects.toThrow("Production settings");
	expect(prisma.site.findUnique).not.toHaveBeenCalled();
	expect(prisma.site.update).not.toHaveBeenCalled();
});

it("preserves construction settings access", async () => {
	jest.mocked(isZtcProductionFlowRuntime).mockResolvedValue(false);
	jest
		.mocked(prisma.site.findUnique)
		.mockResolvedValue({ siteDiaryRecordsMap: null } as never);
	await expect(
		getDefaultConstructionSiteDiaryOptions("limeni-site"),
	).resolves.toBeDefined();
	expect(prisma.site.findUnique).toHaveBeenCalledWith({
		where: { id: "limeni-site" },
		select: { siteDiaryRecordsMap: true },
	});
});

it("rejects denied project access before flow resolution", async () => {
	jest.mocked(orgCheck).mockResolvedValue(false as never);
	await expect(getDefaultConstructionSiteDiaryOptions("site")).rejects.toThrow(
		"Project access denied",
	);
	expect(isZtcProductionFlowRuntime).not.toHaveBeenCalled();
});
