import { prisma } from "@/lib/utils/db";
import { appendVisualSection } from "./section-store";
import {
	readVisualSections,
	sectionKey,
	VISUAL_SECTIONS_KEY,
} from "./sections";
import { requireVisualAccess } from "./store";

jest.mock("./store", () => ({ requireVisualAccess: jest.fn() }));
jest.mock("@/lib/utils/db", () => ({
	prisma: {
		$transaction: jest.fn(),
		site: { findFirst: jest.fn(), updateMany: jest.fn() },
	},
}));
beforeEach(() => {
	jest.resetAllMocks();
	jest
		.mocked(requireVisualAccess)
		.mockResolvedValue({ organizationId: "limeni" } as never);
	jest.mocked(prisma.site.findFirst).mockResolvedValue({
		siteDiaryRecordsMap: {
			Works: { existing: "keep" },
			otherSettings: {
				untouched: true,
				[VISUAL_SECTIONS_KEY]: ["A korpuss"],
			},
		},
	} as never);
	jest.mocked(prisma.site.updateMany).mockResolvedValue({ count: 1 });
	jest
		.mocked(prisma.$transaction)
		.mockImplementation((async (fn: (tx: typeof prisma) => unknown) =>
			fn(prisma)) as never);
});
it("adds a project-wide plain-text section without changing other settings", async () => {
	expect(await appendVisualSection("user", "site", "  B korpuss  ")).toEqual([
		"A korpuss",
		"B korpuss",
	]);
	expect(prisma.site.updateMany).toHaveBeenCalledWith(
		expect.objectContaining({
			where: expect.objectContaining({ id: "site", organizationId: "limeni" }),
			data: {
				siteDiaryRecordsMap: {
					Works: { existing: "keep" },
					otherSettings: {
						untouched: true,
						[VISUAL_SECTIONS_KEY]: ["A korpuss", "B korpuss"],
					},
				},
			},
		}),
	);
});
it("deduplicates names, validates lengths and preserves concurrency protection", async () => {
	expect(await appendVisualSection("user", "site", "a  korpuss")).toEqual([
		"A korpuss",
	]);
	expect(prisma.site.updateMany).not.toHaveBeenCalled();
	await expect(appendVisualSection("user", "site", " ")).rejects.toThrow();
	await expect(
		appendVisualSection("user", "site", "a".repeat(121)),
	).rejects.toThrow();
	jest.mocked(prisma.site.updateMany).mockResolvedValue({ count: 0 });
	await expect(appendVisualSection("user", "site", "B")).rejects.toThrow(
		"citā logā",
	);
});
it("checks Limeni access before any project read/write", async () => {
	jest.mocked(requireVisualAccess).mockRejectedValue(new Error("Forbidden"));
	await expect(appendVisualSection("user", "site", "A")).rejects.toThrow(
		"Forbidden",
	);
	expect(prisma.site.findFirst).not.toHaveBeenCalled();
});
it("reads legacy empty options and keeps text normalized only for matching", () => {
	expect(readVisualSections({})).toEqual([]);
	expect(sectionKey(" A   Korpuss ")).toBe("a korpuss");
});
