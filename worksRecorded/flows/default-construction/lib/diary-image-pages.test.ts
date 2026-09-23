import {
	getDiaryImagePageRange,
	getDiaryPagePhotoUrls,
} from "./diary-image-pages";

it.each([
	[1, 30, 0, 60],
	[2, 30, 0, 60],
	[3, 30, 60, 30],
	[5, 30, 120, 30],
	[1, 10, 0, 20],
	[2, 10, 0, 20],
	[3, 10, 20, 10],
])("selects page %i at size %i", (page, size, skip, take) => {
	expect(getDiaryImagePageRange(page, size)).toEqual({ skip, take });
});

const groups = Array.from({ length: 35 }, (_, index) => ({
	key: `day-${index}`,
	rows: [{ Photos: [`https://utfs.io/f/${index}`] }],
}));

it("limits initial diary downloads to the first twenty visible day cards", () => {
	const urls = getDiaryPagePhotoUrls(groups, [], 1);
	expect(urls).toHaveLength(20);
	expect(urls).toContain("https://utfs.io/f/19");
	expect(urls).not.toContain("https://utfs.io/f/20");
	expect(getDiaryPagePhotoUrls(groups, [], 2)).toEqual(urls);
});

it("uses only the selected later diary page and handles partial final pages", () => {
	const urls = getDiaryPagePhotoUrls(groups, [], 3);
	expect(urls).toHaveLength(10);
	expect(urls).toContain("https://utfs.io/f/20");
	expect(urls).not.toContain("https://utfs.io/f/30");
	expect(getDiaryPagePhotoUrls(groups, [], 4)).toHaveLength(5);
});

it("includes unlinked daily gallery photos only for visible days and deduplicates links", () => {
	const media = (date: string | null, url: string) => ({
		Date: date,
		URL: url,
		Comment: null,
		Location: null,
	});
	const urls = getDiaryPagePhotoUrls(
		[{ key: "2026-09-23", rows: [{ Photos: ["https://utfs.io/f/shared"] }] }],
		[
			media("2026-09-23T12:00:00", "https://utfs.io/f/shared"),
			media("2026-09-23T12:00:00", "https://utfs.io/f/gallery"),
			media("2026-08-01T12:00:00", "https://utfs.io/f/old"),
			media(null, "https://utfs.io/f/undated"),
		],
		1,
	);
	expect(urls).toEqual([
		"https://utfs.io/f/gallery",
		"https://utfs.io/f/shared",
	]);
});
