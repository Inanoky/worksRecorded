import { resolveFlowModuleKeyForRuntime } from "@/lib/flows/resolve-flow-module-server";
import { prisma } from "@/lib/utils/db";
import {
	getSitePhotoStore,
	getUserPhotoStore,
	photoStoreForFlow,
} from "./flow-photo-store";

jest.mock("@/lib/utils/db", () => ({
	prisma: {
		photos: { findMany: jest.fn() },
		ztcPhoto: { findMany: jest.fn() },
		site: { findUnique: jest.fn() },
		user: { findUnique: jest.fn() },
	},
}));
jest.mock("@/lib/flows/resolve-flow-module-server", () => ({
	resolveFlowModuleKeyForRuntime: jest.fn(),
}));

beforeEach(() => jest.clearAllMocks());

it("routes construction photos without accessing production storage", async () => {
	jest
		.mocked(resolveFlowModuleKeyForRuntime)
		.mockResolvedValue("default-construction");
	expect(
		await getSitePhotoStore({
			siteId: "limeni-site",
			organizationId: "limeni",
		}),
	).toBe(prisma.photos);
	expect(prisma.ztcPhoto.findMany).not.toHaveBeenCalled();
});

it.each(["ztc-production", "default-production"])(
	"routes %s photos to independent production storage",
	async (flow) => {
		jest.mocked(resolveFlowModuleKeyForRuntime).mockResolvedValue(flow);
		expect(
			await getSitePhotoStore({
				siteId: "production-site",
				organizationId: "production",
			}),
		).toBe(prisma.ztcPhoto);
		expect(prisma.photos.findMany).not.toHaveBeenCalled();
	},
);

it("uses the requested project for a cross-organization administrator", async () => {
	jest
		.mocked(prisma.site.findUnique)
		.mockResolvedValue({ organizationId: "production" } as never);
	jest
		.mocked(resolveFlowModuleKeyForRuntime)
		.mockResolvedValue("ztc-production");
	expect(await getUserPhotoStore("administrator", "production-site")).toBe(
		prisma.ztcPhoto,
	);
	expect(prisma.user.findUnique).not.toHaveBeenCalled();
	expect(resolveFlowModuleKeyForRuntime).toHaveBeenCalledWith({
		siteId: "production-site",
		organizationId: "production",
	});
});

it("uses the matching transaction delegate", () => {
	const tx = { photos: {}, ztcPhoto: {} };
	expect(photoStoreForFlow(true, tx as never)).toBe(tx.ztcPhoto);
	expect(photoStoreForFlow(false, tx as never)).toBe(tx.photos);
});
