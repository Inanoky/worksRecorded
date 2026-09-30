import { diaryPhotoUploadInput } from "./diary-photo-upload-input";

const siteId = "b07a1080-0d74-4991-80ea-20f378420542";
const legacyRecordId =
	"14d918ca2be80811479dad626cf0016d923a139b0e550f81525628b8fe00bb44";

it.each(["5b32703d-f25b-4e8b-bc39-ba0fa9c35bba", legacyRecordId])(
	"accepts persisted diary record IDs: %s",
	(recordId) => {
		expect(diaryPhotoUploadInput.parse({ siteId, recordId })).toEqual({
			siteId,
			recordId,
		});
	},
);
it.each(["", "   ", "a".repeat(201), null, 123])(
	"rejects empty, oversized and non-string record IDs: %s",
	(recordId) => {
		expect(diaryPhotoUploadInput.safeParse({ siteId, recordId }).success).toBe(
			false,
		);
	},
);
it("still requires a valid project UUID", () => {
	expect(
		diaryPhotoUploadInput.safeParse({
			siteId: "invalid",
			recordId: legacyRecordId,
		}).success,
	).toBe(false);
});
