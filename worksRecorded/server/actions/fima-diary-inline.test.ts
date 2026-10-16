import { prisma } from "@/lib/utils/db";
import { requireUser } from "@/lib/utils/requireUser";
import { orgCheck } from "@/server/actions/shared-actions";
import { updateFimaDiaryField } from "./fima-diary-inline";

jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/lib/utils/db", () => ({
	prisma: {
		site: { findUnique: jest.fn() },
		sitediaryrecords: { updateMany: jest.fn() },
	},
}));
jest.mock("@/lib/utils/requireUser", () => ({ requireUser: jest.fn() }));
jest.mock("@/server/actions/shared-actions", () => ({ orgCheck: jest.fn() }));
const scope = {
	siteId: "c39cb04c-8ce5-477d-acd0-99586a82d850",
	recordId: "record",
};
beforeEach(() => {
	jest.resetAllMocks();
	jest.mocked(requireUser).mockResolvedValue({ id: "member" } as never);
	jest.mocked(orgCheck).mockResolvedValue({ organizationId: "fima" } as never);
	jest.mocked(prisma.site.findUnique).mockResolvedValue({
		organizationId: "fima",
		siteDiaryRecordsMap: { otherSettings: { fimaCollaboration: true } },
	} as never);
	jest
		.mocked(prisma.sitediaryrecords.updateMany)
		.mockResolvedValue({ count: 1 });
});
it("only updates the selected field in the authorized organization and project", async () => {
	await updateFimaDiaryField({
		...scope,
		field: "Works",
		value: "New",
		expectedValue: "Old",
	});
	expect(prisma.sitediaryrecords.updateMany).toHaveBeenCalledWith({
		where: {
			id: "record",
			siteId: scope.siteId,
			organizationId: "fima",
			archivedAt: null,
			Works: "Old",
		},
		data: { Works: "New" },
	});
});
it("denies access before performing a mutation", async () => {
	jest.mocked(orgCheck).mockResolvedValue(false);
	await expect(
		updateFimaDiaryField({
			...scope,
			field: "Works",
			value: "New",
			expectedValue: "Old",
		}),
	).rejects.toThrow("Nav piekļuves");
	expect(prisma.sitediaryrecords.updateMany).not.toHaveBeenCalled();
});
it("does not allow editing another flow or materials through the inline endpoint", async () => {
	jest.mocked(prisma.site.findUnique).mockResolvedValue({
		organizationId: "other",
		siteDiaryRecordsMap: {},
	} as never);
	await expect(
		updateFimaDiaryField({
			...scope,
			field: "Works",
			value: "New",
			expectedValue: "Old",
		}),
	).rejects.toThrow("nav pieejama");
	await expect(
		updateFimaDiaryField({
			...scope,
			field: "materials",
			value: "New",
			expectedValue: "Old",
		} as never),
	).rejects.toThrow();
	expect(prisma.sitediaryrecords.updateMany).not.toHaveBeenCalled();
});
it("detects another member's update rather than overwriting it", async () => {
	jest
		.mocked(prisma.sitediaryrecords.updateMany)
		.mockResolvedValue({ count: 0 });
	await expect(
		updateFimaDiaryField({
			...scope,
			field: "Location",
			value: "21-9",
			expectedValue: "21-7",
		}),
	).rejects.toThrow("Ieraksts ir mainīts");
});
it("parses decimal commas and preserves an explicit zero quantity", async () => {
	await expect(
		updateFimaDiaryField({
			...scope,
			field: "Amounts",
			value: "1,25",
			expectedValue: "0",
		}),
	).resolves.toEqual({ field: "Amounts", value: 1.25 });
	expect(prisma.sitediaryrecords.updateMany).toHaveBeenCalledWith(
		expect.objectContaining({
			where: expect.objectContaining({ Amounts: 0 }),
			data: { Amounts: 1.25 },
		}),
	);
});
it("rejects impossible dates and invalid quantities", async () => {
	await expect(
		updateFimaDiaryField({
			...scope,
			field: "Date",
			value: "2026-02-30",
			expectedValue: "2026-09-01T00:00:00.000Z",
		}),
	).rejects.toThrow("derīgu datumu");
	await expect(
		updateFimaDiaryField({
			...scope,
			field: "Amounts",
			value: "-1",
			expectedValue: "0",
		}),
	).rejects.toThrow("derīgu apjomu");
	expect(prisma.sitediaryrecords.updateMany).not.toHaveBeenCalled();
});
