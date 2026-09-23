import { getClientDiaryMediaDays } from "./diary-media-days";

const photos = [
	{ Date: "2026-09-20T12:00:00", Comment: "Concrete", Location: "Floor 1" },
	{ Date: "2026-09-20T13:00:00", Comment: "Walls", Location: "Floor 2" },
	{ Date: "2026-09-21T12:00:00", Comment: "Concrete", Location: "Floor 1" },
];
const filters = { work: "__ALL__", location: "__ALL__", keyword: "" };

it("groups photos locally without creating duplicate record days", () => {
	const result = getClientDiaryMediaDays(
		photos,
		["2026-09-20T00:00:00"],
		filters,
	);
	expect(
		result.map((day) => [day.key, day.photoCount, day.hasDiaryRecords]),
	).toEqual([
		["2026-09-21", 1, false],
		["2026-09-20", 2, true],
	]);
});

it("filters media-only days by location, keyword and inclusive date range", () => {
	const result = getClientDiaryMediaDays(photos, [], {
		...filters,
		location: "Floor 1",
		keyword: "concrete",
		dateFrom: new Date("2026-09-20T00:00:00"),
		dateTo: new Date("2026-09-20T00:00:00"),
	});
	expect(result).toHaveLength(1);
	expect(result[0]).toMatchObject({
		key: "2026-09-20",
		photoCount: 1,
		hasDiaryRecords: false,
	});
});

it("does not attribute standalone photos to a selected work", () => {
	expect(
		getClientDiaryMediaDays(photos, [], { ...filters, work: "Concrete" }),
	).toEqual([]);
});

it("ignores photos without a usable date", () => {
	expect(
		getClientDiaryMediaDays(
			[
				{ Date: null, Comment: "Unknown", Location: null },
				{ Date: "bad date", Comment: null, Location: null },
			],
			[],
			filters,
		),
	).toEqual([]);
});
