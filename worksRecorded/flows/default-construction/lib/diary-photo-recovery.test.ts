import {
	recoverDiaryPhotoLinks,
	type RecoveryPhoto,
	type RecoveryRecord,
} from "./diary-photo-recovery";
import {
	hasInlineDiaryPhotos,
	LIMENI_ORGANIZATION_ID,
	normalizeDiaryPhotoUrls,
} from "./diary-photos";

const filename = "00000552-PHOTO-2026-03-21-14-36-51.jpg";
const photo: RecoveryPhoto = {
	id: "p",
	organizationId: "org",
	siteId: "site",
	userId: "user",
	Date: "2026-03-21T12:00:00Z",
	URL: "https://utfs.io/f/photo",
	fileUrl: null,
	Comment: `Imports ${filename}`,
	mediaPurpose: "site_diary",
};
const record: RecoveryRecord = {
	id: "r",
	organizationId: "org",
	siteId: "site",
	userId: "user",
	Date: photo.Date,
	Photos: [],
	originalUserComment: `Concrete finished <attached: ${filename}>`,
	saveBatchId: null,
};

it("restores explicit filenames, preserves other links, and supports legacy null arrays", () => {
	expect(
		recoverDiaryPhotoLinks([photo], [{ ...record, Photos: null }]).links,
	).toHaveLength(1);
	expect(
		recoverDiaryPhotoLinks(
			[photo],
			[{ ...record, Photos: ["https://utfs.io/f/other"] }],
		).links,
	).toHaveLength(1);
	expect(
		recoverDiaryPhotoLinks([photo], [{ ...record, Photos: [photo.URL!] }])
			.links,
	).toHaveLength(0);
});
it("never guesses from same-day proximity or crosses sites and organizations", () => {
	for (const changes of [
		{ siteId: "other" },
		{ organizationId: "other" },
		{ originalUserComment: "Concrete finished" },
	]) {
		expect(
			recoverDiaryPhotoLinks([photo], [{ ...record, ...changes }]).links,
		).toHaveLength(0);
	}
});
it("excludes invoices and malformed URLs", () => {
	expect(
		recoverDiaryPhotoLinks(
			[{ ...photo, mediaPurpose: "warehouse_invoice" }],
			[record],
		).links,
	).toHaveLength(0);
	expect(
		normalizeDiaryPhotoUrls([
			"javascript:alert(1)",
			"data:image/png,x",
			photo.URL,
			photo.URL,
		]),
	).toEqual([photo.URL]);
});
it("allows exact caption matches only with the same sender, site and day", () => {
	const caption = "Anna : Completed concrete floor 45 m2 today";
	const p = { ...photo, Comment: caption };
	const r = { ...record, originalUserComment: caption };
	expect(recoverDiaryPhotoLinks([p], [r]).links).toHaveLength(1);
	expect(
		recoverDiaryPhotoLinks([p], [{ ...r, userId: "other" }]).links,
	).toHaveLength(0);
	expect(
		recoverDiaryPhotoLinks([p], [{ ...r, Date: "2026-03-20" }]).links,
	).toHaveLength(0);
	expect(
		recoverDiaryPhotoLinks([p], [r, { ...r, id: "r2" }]).unresolved[0].reason,
	).toBe("ambiguous-report");
});
it("enables inline display only for Limeni", () => {
	expect(hasInlineDiaryPhotos(LIMENI_ORGANIZATION_ID)).toBe(true);
	expect(hasInlineDiaryPhotos("another-org")).toBe(false);
	expect(hasInlineDiaryPhotos()).toBe(false);
});
