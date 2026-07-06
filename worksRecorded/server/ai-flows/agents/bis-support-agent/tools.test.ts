const queryRawMock = jest.fn();

jest.mock("@/lib/utils/db", () => ({
  prisma: { $queryRaw: queryRawMock },
}));

import {
  getBisConnectionStatus,
  readBisMaterialRecords,
  readSiteDiaryBisStatuses,
} from "./tools";

describe("BIS support local read functions", () => {
  const scope = { siteId: "site-1", userId: "user-1" };

  beforeEach(() => jest.clearAllMocks());

  it.each([
    [false, null, "not-connected"],
    [true, null, "case-not-selected"],
    [true, "case-1", "ready"],
  ])("maps token=%s and case=%s to %s", async (hasBisToken, bisCaseId, status) => {
    queryRawMock.mockResolvedValue([{
      siteId: "site-1",
      siteName: "Project One",
      bisCaseId,
      bisCaseNumber: bisCaseId ? "BIS-123" : null,
      bisCaseName: bisCaseId ? "Project One BIS" : null,
      bisCaseStage: null,
      bisConstructionRoundId: null,
      bisConstructionRoundName: null,
      bisConstructionRoundNumber: null,
      bisConstructionRoundStatus: null,
      hasBisToken,
    }]);

    const result = await getBisConnectionStatus(scope);

    expect(result.status).toBe(status);
    expect("liveBisVerified" in result && result.liveBisVerified).toBe(false);
    expect(queryRawMock).toHaveBeenCalledTimes(1);
    expect(queryRawMock.mock.calls[0].slice(1)).toEqual(["user-1", "site-1"]);
  });

  it("returns no-active-site when the trusted site is missing", async () => {
    queryRawMock.mockResolvedValue([]);
    await expect(getBisConnectionStatus(scope)).resolves.toEqual({ status: "no-active-site" });
  });

  it("uses an eval-only ready override without querying or changing the database", async () => {
    const result = await getBisConnectionStatus(scope, {
      connectionOverride: {
        status: "ready",
        siteName: "Simulated Site",
        caseNumber: "SIM-001",
        caseName: "Simulated BIS Case",
      },
    });

    expect(result).toEqual(expect.objectContaining({
      status: "ready",
      source: "ai-eval-override",
      liveBisVerified: false,
      siteName: "Simulated Site",
      bisCase: expect.objectContaining({ number: "SIM-001", name: "Simulated BIS Case" }),
    }));
    expect(queryRawMock).not.toHaveBeenCalled();
  });

  it("scopes material reads to the trusted site", async () => {
    queryRawMock.mockResolvedValue([{ id: "material-1", name: "Concrete" }]);

    const result = await readBisMaterialRecords(scope, { search: "Concrete", limit: 5 });

    expect(result.records).toEqual([{ id: "material-1", name: "Concrete" }]);
    expect(queryRawMock.mock.calls[0].slice(1)).toEqual([
      "site-1", "Concrete", "%Concrete%", "%Concrete%", "%Concrete%", "%Concrete%", 5,
    ]);
  });

  it("scopes diary status reads to the trusted site", async () => {
    queryRawMock.mockResolvedValue([{ id: "diary-1", bisStatus: "submitted" }]);

    const result = await readSiteDiaryBisStatuses(scope, {
      submission: "sent",
      search: "walls",
      limit: 3,
    });

    expect(result.count).toBe(1);
    expect(queryRawMock.mock.calls[0].slice(1)).toEqual([
      "site-1", "sent", "sent", "sent", "walls", "%walls%", "%walls%", "%walls%", 3,
    ]);
  });
});
