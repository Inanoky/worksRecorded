jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock(
	"@/flows/default-construction/backend/construction-project-access",
	() => ({ requireConstructionProjectAccess: jest.fn() }),
);
jest.mock("@/lib/utils/requireUser", () => ({ requireUser: jest.fn() }));
jest.mock("@/lib/utils/db", () => ({
	prisma: {
		bISmaterialRecords: { createMany: jest.fn(), findUnique: jest.fn() },
	},
}));

import { requireConstructionProjectAccess } from "@/flows/default-construction/backend/construction-project-access";
import { prisma } from "@/lib/utils/db";
import { requireUser } from "@/lib/utils/requireUser";
import { createManualWarehouseMaterial } from "./manual-warehouse-material";

const input = {
	id: "11111111-1111-4111-8111-111111111111",
	siteId: "22222222-2222-4222-8222-222222222222",
	name: "Betons",
	quantity: 10,
	measurementUnit: "m³",
	cost: 150,
	materialDate: "2026-11-12",
	invoiceDate: null,
	invoiceNr: "",
	supplierName: "",
};

beforeEach(() => {
	jest.clearAllMocks();
	jest.mocked(requireUser).mockResolvedValue({ id: "user" } as any);
	jest
		.mocked(requireConstructionProjectAccess)
		.mockResolvedValue({
			organizationId: "org",
			bisCaseId: null,
			organizationLanguage: "lv",
			diaryConfig: {},
		});
	jest
		.mocked(prisma.bISmaterialRecords.createMany)
		.mockResolvedValue({ count: 1 });
});

test("assigns ownership on the server and does not submit to BIS", async () => {
	await createManualWarehouseMaterial(input);
	expect(prisma.bISmaterialRecords.createMany).toHaveBeenCalledWith({
		skipDuplicates: true,
		data: [
			expect.objectContaining({
				id: input.id,
				orgId: "org",
				userId: "user",
				siteId: input.siteId,
				quantity: 10,
				cost: 150,
			}),
		],
	});
});

test("blocks unauthorized writes", async () => {
	jest
		.mocked(requireConstructionProjectAccess)
		.mockRejectedValue(new Error("Access denied"));
	await expect(createManualWarehouseMaterial(input)).rejects.toThrow(
		"Access denied",
	);
	expect(prisma.bISmaterialRecords.createMany).not.toHaveBeenCalled();
});

test("a retry reuses the row while a conflicting ID cannot overwrite it", async () => {
	jest
		.mocked(prisma.bISmaterialRecords.createMany)
		.mockResolvedValue({ count: 0 });
	jest.mocked(prisma.bISmaterialRecords.findUnique).mockResolvedValue({
		...input,
		invoiceNr: null,
		supplierName: null,
		orgId: "org",
		userId: "user",
		materialDate: new Date("2026-11-12T00:00:00Z"),
	} as any);
	expect(await createManualWarehouseMaterial(input)).toEqual({ id: input.id });
	await expect(
		createManualWarehouseMaterial({ ...input, name: "Other" }),
	).rejects.toThrow("citiem datiem");
});
