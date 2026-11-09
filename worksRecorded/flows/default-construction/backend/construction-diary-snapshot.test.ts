const mockQueryRaw = jest.fn();

jest.mock("@/lib/utils/db", () => ({
	prisma: {
		$queryRaw: (...args: unknown[]) => mockQueryRaw(...args),
	},
}));

import { readConstructionDiaryBootstrap } from "./construction-diary-snapshot";

beforeEach(() => {
	jest.clearAllMocks();
});

it("loads the latest diary days and photos in one database query", async () => {
	mockQueryRaw.mockResolvedValue([
		{
			rows: [
				{
					id: "record",
					createdAt: "2026-11-09T09:00:00.000Z",
					Date: "2026-11-09T00:00:00.000Z",
					Date_Custom_1: null,
					Date_Custom_2: null,
					Location: "B68",
					Works: "Concrete",
					Photos: [],
					User: { firstName: "Test", lastName: "User" },
					Worker: null,
				},
			],
			mediaPhotos: [
				{
					Date: "2026-11-09T00:00:00.000Z",
					Comment: "Photo",
					Location: "B68",
					URL: "https://example.com/photo.jpg",
					fileUrl: null,
				},
			],
		},
	]);

	const snapshot = await readConstructionDiaryBootstrap("site", "org", 3);

	expect(mockQueryRaw).toHaveBeenCalledTimes(1);
	expect(snapshot.rows).toHaveLength(1);
	expect(snapshot.rows[0]).toMatchObject({
		id: "record",
		Location: "B68",
		Works: "Concrete",
		createdBy: "Test User",
	});
	expect(snapshot.rows[0]?.Date).toEqual(new Date("2026-11-09T00:00:00.000Z"));
	expect(snapshot.mediaPhotos).toEqual([
		{
			Date: new Date("2026-11-09T00:00:00.000Z"),
			Comment: "Photo",
			Location: "B68",
			URL: "https://example.com/photo.jpg",
			fileUrl: null,
		},
	]);
});

it("returns an empty snapshot when the query finds no diary days", async () => {
	mockQueryRaw.mockResolvedValue([{ rows: [], mediaPhotos: [] }]);

	await expect(readConstructionDiaryBootstrap("site", "org")).resolves.toEqual({
		rows: [],
		mediaPhotos: [],
	});
	expect(mockQueryRaw).toHaveBeenCalledTimes(1);
});
