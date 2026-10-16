import { prisma } from "@/lib/utils/db";
import { requireUser } from "@/lib/utils/requireUser";
import { orgCheck } from "@/server/actions/shared-actions";
import { getBisCaseAvailableMaterials } from "@/server/actions/site-diary-actions";
import { getFimaWarehouseAvailability } from "./fima-warehouse";

jest.mock("@/lib/utils/db", () => ({
	prisma: { site: { findUnique: jest.fn() } },
}));
jest.mock("@/lib/utils/requireUser", () => ({ requireUser: jest.fn() }));
jest.mock("@/server/actions/shared-actions", () => ({ orgCheck: jest.fn() }));
jest.mock("@/server/actions/site-diary-actions", () => ({
	getBisCaseAvailableMaterials: jest.fn(),
}));
const siteId = "c39cb04c-8ce5-477d-acd0-99586a82d850";
beforeEach(() => {
	jest.resetAllMocks();
	jest.mocked(requireUser).mockResolvedValue({ id: "member" } as never);
	jest.mocked(orgCheck).mockResolvedValue({ organizationId: "fima" } as never);
	jest.mocked(prisma.site.findUnique).mockResolvedValue({
		siteDiaryRecordsMap: { otherSettings: { fimaCollaboration: true } },
	} as never);
});
it("returns the canonical live BIS stock quantities for an authorized FIMA project", async () => {
	const rows = [
		{
			id: "123",
			label: "Material",
			measurementUnit: "gab.",
			deliveredQuantity: 10,
			usedQuantity: 4,
			availableQuantity: 6,
		},
	];
	jest.mocked(getBisCaseAvailableMaterials).mockResolvedValue(rows);
	await expect(getFimaWarehouseAvailability(siteId)).resolves.toEqual(rows);
	expect(orgCheck).toHaveBeenCalledWith("member", siteId);
	expect(getBisCaseAvailableMaterials).toHaveBeenCalledWith(siteId);
});
it("denies a member of another organization before requesting BIS", async () => {
	jest.mocked(orgCheck).mockResolvedValue(false);
	await expect(getFimaWarehouseAvailability(siteId)).rejects.toThrow(
		"Nav piekļuves",
	);
	expect(getBisCaseAvailableMaterials).not.toHaveBeenCalled();
});
it("does not expose the FIMA view for an unconfigured project", async () => {
	jest
		.mocked(prisma.site.findUnique)
		.mockResolvedValue({ siteDiaryRecordsMap: {} } as never);
	await expect(getFimaWarehouseAvailability(siteId)).rejects.toThrow(
		"nav pieejams",
	);
	expect(getBisCaseAvailableMaterials).not.toHaveBeenCalled();
});
