import type { Prisma } from "@prisma/client";
import { LIMENI_ORGANIZATION_ID } from "@/flows/default-construction/lib/diary-photos";
import {
	ensureDiaryPhotoAttachments,
	ensureDiaryPhotoAttachmentsById,
} from "./diary-photo-attachments";

const source = {
	id: "source",
	siteId: "site",
	organizationId: LIMENI_ORGANIZATION_ID,
	Date: new Date("2026-09-15T12:00:00Z"),
	Photos: ["https://host/photo"],
	Location: "floor",
	Comments: "work",
	userId: "user",
	workerId: null,
};
const photos = {
	findUnique: jest.fn(),
	findFirst: jest.fn(),
	updateMany: jest.fn(),
	upsert: jest.fn(),
};
const records = { findFirst: jest.fn() };
const tx = {
	photos,
	sitediaryrecords: records,
} as unknown as Prisma.TransactionClient;

beforeEach(() => {
	jest.resetAllMocks();
	photos.findUnique.mockResolvedValue(null);
	photos.findFirst.mockResolvedValue(null);
});

it.each([
	{ id: "same-day-copy" },
	{ id: "new-day-copy", Date: new Date("2026-09-29T12:00:00Z") },
	{ id: "new-project-copy", siteId: "target-site" },
])(
	"creates independent ownership for $id with the same stored image",
	async (changes) => {
		const copy = { ...source, ...changes };
		await ensureDiaryPhotoAttachments(tx, source);
		await ensureDiaryPhotoAttachments(tx, copy);
		expect(photos.upsert).toHaveBeenCalledTimes(2);
		for (const [index, record] of [source, copy].entries()) {
			expect(photos.upsert.mock.calls[index][0]).toMatchObject({
				where: {
					diaryRecordId_fileUrl: {
						diaryRecordId: record.id,
						fileUrl: source.Photos[0],
					},
				},
				create: {
					diaryRecordId: record.id,
					Date: record.Date,
					siteId: record.siteId,
					URL: source.Photos[0],
					fileUrl: source.Photos[0],
				},
			});
		}
	},
);

it("adopts a legacy row only when it is still unowned, in the same site and on the original date", async () => {
	photos.findFirst.mockResolvedValue({ id: "legacy" });
	photos.updateMany.mockResolvedValue({ count: 1 });
	await ensureDiaryPhotoAttachments(tx, source);
	expect(photos.findFirst).toHaveBeenCalledWith(
		expect.objectContaining({
			where: expect.objectContaining({
				siteId: source.siteId,
				diaryRecordId: null,
				Date: source.Date,
			}),
		}),
	);
	expect(photos.updateMany).toHaveBeenCalledWith({
		where: { id: "legacy", siteId: source.siteId, diaryRecordId: null },
		data: {
			diaryRecordId: source.id,
			organizationId: source.organizationId,
			fileUrl: source.Photos[0],
		},
	});
	expect(photos.upsert).not.toHaveBeenCalled();
});

it("creates an independent row if another record adopts the legacy row first", async () => {
	photos.findFirst.mockResolvedValue({ id: "legacy" });
	photos.updateMany.mockResolvedValue({ count: 0 });
	await ensureDiaryPhotoAttachments(tx, source);
	expect(photos.upsert).toHaveBeenCalledTimes(1);
});

it("is idempotent and does not add attachments for other organizations", async () => {
	photos.findUnique.mockResolvedValue({ id: "attached" });
	await ensureDiaryPhotoAttachments(tx, {
		...source,
		Photos: [...source.Photos, ...source.Photos],
	});
	expect(photos.findUnique).toHaveBeenCalledTimes(1);
	expect(photos.upsert).not.toHaveBeenCalled();
	photos.findUnique.mockClear();
	await ensureDiaryPhotoAttachments(tx, { ...source, organizationId: "other" });
	expect(photos.findUnique).not.toHaveBeenCalled();
});

it("rechecks the active record in the authorized site and organization", async () => {
	records.findFirst.mockResolvedValue(null);
	await expect(
		ensureDiaryPhotoAttachmentsById(
			tx,
			source.id,
			source.siteId,
			source.organizationId,
		),
	).rejects.toThrow("not found");
	expect(records.findFirst).toHaveBeenCalledWith(
		expect.objectContaining({
			where: {
				id: source.id,
				siteId: source.siteId,
				organizationId: source.organizationId,
				archivedAt: null,
			},
		}),
	);
	expect(photos.upsert).not.toHaveBeenCalled();
});
