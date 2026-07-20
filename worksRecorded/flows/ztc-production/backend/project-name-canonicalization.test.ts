const mockSiteFindUnique = jest.fn();
const mockZtcRecordsFindMany = jest.fn();

jest.mock("@/lib/utils/db", () => ({
  prisma: {
    site: {
      findUnique: (...args: unknown[]) => mockSiteFindUnique(...args),
    },
    ztcRecords: {
      findMany: (...args: unknown[]) => mockZtcRecordsFindMany(...args),
    },
  },
}));

import { canonicalizeZtcExtractedProjectName } from "./project-name-canonicalization";

describe("canonicalizeZtcExtractedProjectName", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSiteFindUnique.mockResolvedValue({ siteDiaryRecordsMap: null });
    mockZtcRecordsFindMany.mockResolvedValue([]);
  });

  it("prefers a manual project from the site rate configuration", async () => {
    mockSiteFindUnique.mockResolvedValue({
      siteDiaryRecordsMap: {
        otherSettings: {
          ztcDefaultTaskRates: {
            projects: [
              {
                projectName: "dz. ēka. auto nojume (rd)",
                manual: true,
              },
            ],
          },
        },
      },
    });
    mockZtcRecordsFindMany.mockResolvedValue([
      { Location: "dzīka auto nojume (rd)" },
    ]);

    await expect(
      canonicalizeZtcExtractedProjectName({
        siteId: "site-1",
        extractedProjectName: "dzīka auto nojume (rd)",
      }),
    ).resolves.toBe("dz. ēka. auto nojume (rd)");
  });

  it("uses the first existing project when there is no manual match", async () => {
    mockZtcRecordsFindMany.mockResolvedValue([
      { Location: "dz. ēka. auto nojume (rd)" },
    ]);

    await expect(
      canonicalizeZtcExtractedProjectName({
        siteId: "site-1",
        extractedProjectName: "dzīka auto nojume (rd)",
      }),
    ).resolves.toBe("dz. ēka. auto nojume (rd)");

    expect(mockZtcRecordsFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { createdAt: "asc" } }),
    );
  });
});
