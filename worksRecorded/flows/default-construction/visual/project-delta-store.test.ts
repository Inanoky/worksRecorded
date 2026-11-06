import { getDashboardBisStatus } from "@/lib/bis/dashboard-status";
import {
	getConfig,
	getLimeniDiarySnapshot,
} from "@/server/actions/site-diary-actions";
import { getDefaultConstructionForma2Results } from "../backend/forma2-analytics-actions";
import { loadLimeniProjectDelta, projectPartHash } from "./project-delta-store";
import { loadLimeniProjectAssets } from "./project-snapshot-store";

jest.mock("@/lib/bis/dashboard-status", () => ({
	getDashboardBisStatus: jest.fn(async () => ({ enabled: true })),
}));
jest.mock("@/server/actions/shared-actions", () => ({
	getOrganizationLanguageByUserId: async () => "lv",
}));
jest.mock("@/server/actions/site-diary-actions", () => ({
	getConfig: jest.fn(async () => ({})),
	getLimeniDiarySnapshot: jest.fn(async () => ({
		rows: [{ id: "edited" }],
		mediaPhotos: [],
	})),
}));
jest.mock("../backend/forma2-analytics-actions", () => ({
	getDefaultConstructionForma2Results: jest.fn(async () => ({
		resultRows: [],
	})),
}));
jest.mock("./project-snapshot-store", () => ({
	loadLimeniProjectAssets: jest.fn(async () => ({
		index: { drawings: [] },
		drawings: [],
	})),
}));
const sources = {
	code: "code",
	site: "site",
	documents: "doc",
	diary: "diary",
	media: "media",
	plans: "plans",
	contacts: "contacts",
	sends: "sends",
	sendItems: "items",
	users: "users",
	workers: "workers",
	day: "day",
	language: "lang",
	bis: "bis",
	analytics: "analytics",
	materials: "materials",
};
const known = {
	index: "i",
	diary: "d",
	settings: "s",
	config: "c",
	forma2: "f",
	"diary-media": "m",
};
const manifest = {
	organizationId: "org",
	revision: "new",
	sourceVersions: sources,
	diaryRowVersions: { edited: "new", keep: "same" },
};
beforeEach(() => jest.clearAllMocks());
it("loads only edited diary IDs and recomputes dependent views without loading settings or photos", async () => {
	const result = await loadLimeniProjectDelta(
		"user",
		"site",
		manifest,
		known,
		{ edited: "old", keep: "same", deleted: "old" },
		{ ...sources, diary: "old" },
	);
	expect(getLimeniDiarySnapshot).toHaveBeenCalledWith("site", {
		ids: ["edited"],
		media: false,
	});
	expect(result.diaryRows?.order).toEqual(["edited", "keep"]);
	expect(result.diaryRows?.changed).toEqual([{ id: "edited" }]);
	expect(getConfig).not.toHaveBeenCalled();
	expect(getDashboardBisStatus).not.toHaveBeenCalled();
	expect(loadLimeniProjectAssets).toHaveBeenCalledTimes(1);
	expect(getDefaultConstructionForma2Results).toHaveBeenCalledTimes(1);
});
it("sends deletions from the inventory without loading all journal rows", async () => {
	const result = await loadLimeniProjectDelta(
		"user",
		"site",
		{ ...manifest, diaryRowVersions: { keep: "same" } },
		known,
		{ keep: "same", deleted: "old" },
		sources,
	);
	expect(result.diaryRows?.order).toEqual(["keep"]);
	expect(result.diaryRows?.changed).toEqual([]);
	expect(getLimeniDiarySnapshot).not.toHaveBeenCalled();
	expect(loadLimeniProjectAssets).not.toHaveBeenCalled();
});
it("a photo change fetches media without rebuilding the diary, drawings or Forma 2", async () => {
	const result = await loadLimeniProjectDelta(
		"user",
		"site",
		manifest,
		known,
		manifest.diaryRowVersions,
		{ ...sources, media: "old" },
	);
	expect(getLimeniDiarySnapshot).toHaveBeenCalledWith("site", {
		ids: [],
		media: true,
	});
	expect(result.diaryRows?.mediaPhotos).toEqual([]);
	expect(loadLimeniProjectAssets).not.toHaveBeenCalled();
	expect(getDefaultConstructionForma2Results).not.toHaveBeenCalled();
});
it("does not resend derived sections whose computed content is unchanged", async () => {
	const result = await loadLimeniProjectDelta(
		"user",
		"site",
		manifest,
		{
			...known,
			index: projectPartHash({ drawings: [] }),
			forma2: projectPartHash({
				data: { resultRows: [] },
				organizationLanguage: "lv",
			}),
		},
		manifest.diaryRowVersions,
		{ ...sources, documents: "old" },
	);
	expect(result.changes).toEqual({});
	expect(result.drawings).toEqual([]);
});
