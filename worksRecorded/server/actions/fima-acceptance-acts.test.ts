const requireToken = jest.fn();
const siteFindUnique = jest.fn();
const execute = jest.fn();
const fetchCoverage = jest.fn();
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/lib/utils/db", () => ({
	prisma: { site: { findUnique: siteFindUnique }, $executeRaw: execute },
}));
jest.mock("@/lib/bis/acceptance-act-coverage", () => ({
	fetchFimaAcceptanceActCoverage: fetchCoverage,
}));
jest.mock("@/server/actions/BIS/service", () => ({
	requireBisAccessTokenForSite: requireToken,
	getBisBaseUrl: () => "https://bis.gov.lv",
}));
jest.mock("@/server/actions/BIS/TestBisEnv/relay", () => ({
	bisFetch: jest.fn(),
}));

import { refreshFimaAcceptanceActs } from "./fima-acceptance-acts";

const siteId = "d65ac3f1-e84f-4948-8a08-aaecfd19e97b";
beforeEach(() => {
	jest.clearAllMocks();
	requireToken.mockResolvedValue({
		accessToken: "test-token",
		bisCaseId: "668714",
	});
	siteFindUnique.mockResolvedValue({
		organizationId: "fima",
		bisCaseId: "668714",
		siteDiaryRecordsMap: { otherSettings: { fimaCollaboration: true } },
	});
	fetchCoverage.mockResolvedValue({
		version: 1,
		caseId: "668714",
		fetchedAt: "2026-10-27T10:00:00Z",
		collections: [],
		acts: [],
	});
	execute.mockResolvedValue(1);
});

it("authenticates project access and replaces only the scoped project index after a complete successful scan", async () => {
	expect(await refreshFimaAcceptanceActs(siteId)).toEqual({
		checkedAt: "2026-10-27T10:00:00Z",
		actCount: 0,
	});
	expect(requireToken).toHaveBeenCalledWith(siteId);
	expect(fetchCoverage).toHaveBeenCalledWith("668714", expect.any(Function));
	const [parts, ...parameters] = execute.mock.calls[0];
	expect(parts.join("")).toContain("jsonb_set");
	expect(parts.join("")).toContain("IS NOT DISTINCT FROM");
	expect(parameters).toEqual(
		expect.arrayContaining([siteId, "fima", "668714"]),
	);
});

it("does not read BIS or change an index when project authorization fails", async () => {
	requireToken.mockRejectedValue(new Error("Access denied"));
	await expect(refreshFimaAcceptanceActs(siteId)).rejects.toThrow(
		"Access denied",
	);
	expect(fetchCoverage).not.toHaveBeenCalled();
	expect(execute).not.toHaveBeenCalled();
});

it("preserves the previous index after a failed BIS scan", async () => {
	fetchCoverage.mockRejectedValue(new Error("Incomplete BIS data"));
	await expect(refreshFimaAcceptanceActs(siteId)).rejects.toThrow(
		"Incomplete BIS data",
	);
	expect(execute).not.toHaveBeenCalled();
});

it("rejects a changed BIS case before scanning and a concurrent index refresh before replacement", async () => {
	siteFindUnique.mockResolvedValueOnce({
		organizationId: "fima",
		bisCaseId: "668708",
		siteDiaryRecordsMap: { otherSettings: { fimaCollaboration: true } },
	});
	await expect(refreshFimaAcceptanceActs(siteId)).rejects.toThrow(
		"nav pieejama",
	);
	expect(execute).not.toHaveBeenCalled();
	execute.mockResolvedValueOnce(0);
	await expect(refreshFimaAcceptanceActs(siteId)).rejects.toThrow(
		"Projekts ir mainīts",
	);
});
