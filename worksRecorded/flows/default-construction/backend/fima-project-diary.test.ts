const findFirst = jest.fn();
const loadPage = jest.fn();
const buildConfig = jest.fn();
jest.mock("@/lib/utils/db", () => ({ prisma: { site: { findFirst } } }));
jest.mock("./fima-diary-page", () => ({
	loadFimaDiaryPage: (...args: unknown[]) => loadPage(...args),
}));
jest.mock("@/flows/default-construction/lib/diary-config", () => ({
	buildDefaultConstructionDiaryConfig: (...args: unknown[]) =>
		buildConfig(...args),
}));

import { loadFimaProjectDiary } from "./fima-project-diary";

beforeEach(() => jest.resetAllMocks());

it("loads an authorized FIMA project's configuration and first 75 records together", async () => {
	const site = { siteDiaryRecordsMap: {}, organizationId: "org" };
	const config = { otherSettings: { fimaCollaboration: true } };
	const page = {
		rows: [{ id: "record" }],
		page: 1,
		pageSize: 75,
		totalCount: 165,
		totalPages: 3,
	};
	findFirst.mockResolvedValue(site);
	buildConfig.mockReturnValue(config);
	loadPage.mockResolvedValue(page);
	await expect(loadFimaProjectDiary("org", "project")).resolves.toEqual({
		siteId: "project",
		config,
		page,
	});
	expect(findFirst).toHaveBeenCalledWith(
		expect.objectContaining({
			where: {
				id: "project",
				organizationId: "org",
				siteDiaryRecordsMap: {
					path: ["otherSettings", "fimaCollaboration"],
					equals: true,
				},
			},
		}),
	);
	expect(loadPage).toHaveBeenCalledWith("org", {
		projectId: "project",
		projectView: true,
		page: 1,
	});
});

it("does not load records for another organization or a project without FIMA enabled", async () => {
	findFirst.mockResolvedValue(null);
	await expect(
		loadFimaProjectDiary("other-org", "project"),
	).resolves.toBeNull();
	expect(loadPage).not.toHaveBeenCalled();
	expect(buildConfig).not.toHaveBeenCalled();
});

it("propagates a failed initial load instead of leaving a client spinner waiting forever", async () => {
	findFirst.mockResolvedValue({ siteDiaryRecordsMap: {} });
	loadPage.mockRejectedValue(new Error("Database unavailable"));
	await expect(loadFimaProjectDiary("org", "project")).rejects.toThrow(
		"Database unavailable",
	);
});
