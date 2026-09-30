import { LIMENI_ORGANIZATION_ID } from "@/flows/default-construction/lib/diary-photos";
import { prisma } from "@/lib/utils/db";
import { requireUser } from "@/lib/utils/requireUser";
import { orgCheck } from "@/server/actions/shared-actions";
import { deleteDiaryPhoto } from "./delete-diary-photo";

jest.mock("@/lib/utils/db", () => ({
	prisma: { photos: { findUnique: jest.fn() }, $transaction: jest.fn() },
}));
jest.mock("@/lib/utils/requireUser", () => ({ requireUser: jest.fn() }));
jest.mock("@/server/actions/shared-actions", () => ({ orgCheck: jest.fn() }));
const remove = jest.fn();
const execute = jest.fn();
const drawings = jest.fn();
const photo = {
	siteId: "site",
	organizationId: LIMENI_ORGANIZATION_ID,
	mediaPurpose: "site_diary",
};
beforeEach(() => {
	jest.resetAllMocks();
	jest.mocked(requireUser).mockResolvedValue({ id: "user" } as never);
	jest.mocked(orgCheck).mockResolvedValue({
		id: "site",
		organizationId: LIMENI_ORGANIZATION_ID,
	} as never);
	jest.mocked(prisma.photos.findUnique).mockResolvedValue(photo as never);
	jest
		.mocked(prisma.$transaction)
		.mockImplementation(async (run) =>
			run({
				photos: { delete: remove },
				$executeRaw: execute,
				$queryRaw: drawings,
			} as never),
		);
	drawings.mockResolvedValue([]);
	remove.mockResolvedValue({
		URL: "https://host/original",
		fileUrl: "https://host/stored",
	});
	execute.mockResolvedValue(2);
});

it("atomically removes both photo URLs from Limeni diary records in the same project only", async () => {
	expect(await deleteDiaryPhoto("photo")).toEqual({
		siteId: "site",
		deletedUrls: ["https://host/original", "https://host/stored"],
	});
	expect(orgCheck).toHaveBeenCalledWith("user", "site");
	expect(remove).toHaveBeenCalledWith({
		where: { id: "photo", ...photo },
		select: { URL: true, fileUrl: true },
	});
	expect(execute).toHaveBeenCalledTimes(2);
	for (const [index, url] of [
		"https://host/original",
		"https://host/stored",
	].entries()) {
		const [sql, ...values] = execute.mock.calls[index];
		expect(sql.join("?")).toContain('array_remove("Photos", ?)');
		expect(sql.join("?")).toContain('"siteId" = ? AND "organizationId" = ?');
		expect(values).toEqual([url, "site", LIMENI_ORGANIZATION_ID, url]);
	}
});
it("deduplicates URLs and ignores empty values", async () => {
	remove.mockResolvedValue({
		URL: "https://host/same",
		fileUrl: "https://host/same",
	});
	await deleteDiaryPhoto("photo");
	expect(execute).toHaveBeenCalledTimes(1);
	execute.mockClear();
	remove.mockResolvedValue({ URL: null, fileUrl: "" });
	await deleteDiaryPhoto("photo");
	expect(execute).not.toHaveBeenCalled();
});
it("does not change other organizations' diary records", async () => {
	jest
		.mocked(orgCheck)
		.mockResolvedValue({ id: "site", organizationId: "other" } as never);
	jest
		.mocked(prisma.photos.findUnique)
		.mockResolvedValue({ ...photo, organizationId: "other" } as never);
	await deleteDiaryPhoto("photo");
	expect(remove).toHaveBeenCalled();
	expect(execute).not.toHaveBeenCalled();
});
it("allows legacy photos with no organization only after checking project access", async () => {
	jest
		.mocked(prisma.photos.findUnique)
		.mockResolvedValue({ ...photo, organizationId: null } as never);
	await deleteDiaryPhoto("photo");
	expect(execute).toHaveBeenCalledTimes(2);
});
it.each(["missing", "denied", "organization", "invoice"])(
	"blocks deletion before any mutation: %s",
	async (reason) => {
		if (reason === "missing")
			jest.mocked(prisma.photos.findUnique).mockResolvedValue(null);
		if (reason === "denied")
			jest.mocked(orgCheck).mockResolvedValue(false as never);
		if (reason === "organization")
			jest
				.mocked(prisma.photos.findUnique)
				.mockResolvedValue({ ...photo, organizationId: "other" } as never);
		if (reason === "invoice")
			jest.mocked(prisma.photos.findUnique).mockResolvedValue({
				...photo,
				mediaPurpose: "warehouse_invoice",
			} as never);
		await expect(deleteDiaryPhoto("photo")).rejects.toThrow();
		expect(prisma.$transaction).not.toHaveBeenCalled();
	},
);
it("rejects the transaction if unlinking fails so the database rolls back deletion", async () => {
	execute.mockRejectedValue(new Error("database failed"));
	await expect(deleteDiaryPhoto("photo")).rejects.toThrow("database failed");
	expect(prisma.$transaction).toHaveBeenCalledTimes(1);
});
it("does not unlink when deletion fails or the photo changed project", async () => {
	remove.mockRejectedValue(new Error("Record not found"));
	await expect(deleteDiaryPhoto("photo")).rejects.toThrow("Record not found");
	expect(execute).not.toHaveBeenCalled();
});

it("rolls back photo deletion if drawing cleanup fails", async () => {
	drawings.mockRejectedValue(new Error("drawing unavailable"));
	await expect(deleteDiaryPhoto("photo")).rejects.toThrow(
		"drawing unavailable",
	);
	expect(prisma.$transaction).toHaveBeenCalledTimes(1);
});
