const clone = globalThis.structuredClone;
beforeAll(() => {
	globalThis.structuredClone = (value) => JSON.parse(JSON.stringify(value));
});
afterAll(() => {
	globalThis.structuredClone = clone;
});
const site = jest.fn();
const query = jest.fn();
const records = jest.fn();
const page = jest.fn();
const transaction = jest.fn();
const db = { site: { findFirst: site }, $queryRaw: query };
jest.mock("@/lib/utils/db", () => ({
	prisma: {
		$transaction: (...args: unknown[]) => transaction(...args),
		site: { findFirst: (...args: unknown[]) => site(...args) },
		$queryRaw: (...args: unknown[]) => query(...args),
	},
}));
jest.mock("./fima-acts", () => ({
	loadFimaActRecords: (...args: unknown[]) => records(...args),
}));
jest.mock("./fima-diary-page", () => ({
	loadFimaDiaryPage: (...args: unknown[]) => page(...args),
}));

import {
	getFimaDiaryRevision,
	loadFimaDiaryDelta,
	readFimaDiaryManifest,
} from "./fima-diary-workspace";

const project = {
	organizationId: "org",
	bisCaseId: "668714",
	bisCaseNumber: "case",
	siteDiaryRecordsMap: {
		otherSettings: {
			fimaCollaboration: true,
			fimaActRegister: { internal: "private" },
		},
	},
};
beforeEach(() => {
	jest.clearAllMocks();
	site.mockResolvedValue(project);
	query.mockResolvedValue([
		{ id: "a", version: "one", examples: [] },
		{ id: "b", version: "two", examples: [] },
	]);
	records.mockResolvedValue([]);
	page.mockResolvedValue({ rows: [{ id: "a" }, { id: "b" }] });
	transaction.mockImplementation((callback) => callback(db));
});
it("scopes FIMA reads to the signed-in organization and removes Act settings from the diary payload", async () => {
	const first = await loadFimaDiaryDelta("org", "project");
	expect(site).toHaveBeenCalledWith(
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
	expect(page).toHaveBeenCalledWith(
		"org",
		{ projectId: "project", projectView: true },
		{ snapshot: true, ids: ["a", "b"], db },
	);
	expect(first.config?.otherSettings).not.toHaveProperty("fimaActRegister");
	expect(transaction).toHaveBeenCalledWith(expect.any(Function), {
		isolationLevel: "RepeatableRead",
		timeout: 60000,
	});
});
it("checks the manifest without loading row data and returns no repeated rows/config", async () => {
	const initial = await loadFimaDiaryDelta("org", "project");
	page.mockClear();
	const next = await loadFimaDiaryDelta("org", "project", {
		versions: initial.versions,
		configVersion: initial.configVersion,
	});
	expect(next).toMatchObject({
		rows: [],
		versions: {},
		removed: [],
		revision: initial.revision,
	});
	expect(next.config).toBeUndefined();
	expect(await getFimaDiaryRevision("org", "project")).toBe(initial.revision);
	expect(page).not.toHaveBeenCalled();
});
it("loads only changed/new IDs and reports archived/deleted records", async () => {
	const first = await loadFimaDiaryDelta("org", "project");
	query.mockResolvedValue([
		{ id: "a", version: "edited", examples: [] },
		{ id: "c", version: "new", examples: [] },
	]);
	page.mockResolvedValue({ rows: [{ id: "a" }, { id: "c" }] });
	const next = await loadFimaDiaryDelta("org", "project", {
		versions: first.versions,
		configVersion: first.configVersion,
	});
	expect(next.removed).toEqual(["b"]);
	expect(Object.keys(next.versions)).toEqual(["a", "c"]);
	expect(page).toHaveBeenLastCalledWith("org", expect.anything(), {
		snapshot: true,
		ids: ["a", "c"],
		db,
	});
});
it("refreshes only rows whose KUCE example source changed", async () => {
	query.mockResolvedValue([
		{ id: "a", version: "one", examples: [{ id: "123" }] },
		{ id: "b", version: "two", examples: [] },
	]);
	records.mockResolvedValue([
		{
			id: "source",
			siteId: "other-project",
			fimaNumber: 1,
			BISId: "123",
			Works: "Original",
		},
	]);
	const first = await readFimaDiaryManifest(db as never, "org", "project");
	records.mockResolvedValue([
		{
			id: "source",
			siteId: "other-project",
			fimaNumber: 1,
			BISId: "123",
			Works: "Corrected",
		},
	]);
	const next = await readFimaDiaryManifest(db as never, "org", "project");
	expect(next.versions.a).not.toBe(first.versions.a);
	expect(next.versions.b).toBe(first.versions.b);
});
it("rejects another organization or a disabled FIMA project before any diary reads", async () => {
	site.mockResolvedValue(null);
	await expect(loadFimaDiaryDelta("other", "project")).rejects.toThrow(
		"Nav piekļuves",
	);
	expect(query).not.toHaveBeenCalled();
	expect(page).not.toHaveBeenCalled();
});
