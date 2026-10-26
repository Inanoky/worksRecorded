const siteFindManyMock = jest.fn();
const recordsFindManyMock = jest.fn();
const recordsCountMock = jest.fn();

jest.mock("@/lib/utils/db", () => ({
  prisma: {
    site: { findMany: siteFindManyMock },
    sitediaryrecords: {
      findMany: recordsFindManyMock,
      count: recordsCountMock,
    },
  },
}));

import {
  ALL_PROJECTS_DIARY_PAGE_SIZE,
  buildAllProjectsDiaryWhere,
  loadAllProjectsDiary,
  loadAllProjectsDiaryExportRecords,
} from "./all-projects-diary";
import { SB_STOMME_ORGANIZATION_ID } from "../sb-stomme-inline-plan/model";
import { LIMENI_ORGANIZATION_ID } from "../lib/diary-photos";

describe("all projects diary", () => {
  it("keeps record-number lookup in the same organization, project and export filters", async () => {
    const filters = {
      projectId: "site-1",
      keyword: " FIMA-003383 ",
      materials: "missing",
    } as const;
    const where = buildAllProjectsDiaryWhere("org", filters);
    expect(where.OR).toContainEqual({ fimaNumber: 3383 });
    expect(where).toMatchObject({
      archivedAt: null,
      Site: { organizationId: "org" },
      siteId: "site-1",
      AND: expect.any(Array),
    });
    await loadAllProjectsDiaryExportRecords("org", filters);
    expect(recordsFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ where }),
    );
    expect(recordsFindManyMock.mock.calls[0][0]).not.toHaveProperty("take");
  });

  it("preloads linked photos from the first two filtered pages only for Limeni", async () => {
    const photo = "https://utfs.io/f/current";
    const laterPhoto = "https://utfs.io/f/later-page";
    recordsFindManyMock.mockResolvedValueOnce([{ id: "record", Photos: [photo], Site: null }]);
    recordsFindManyMock.mockResolvedValueOnce([{ Photos: [photo, photo] }, { Photos: [laterPhoto, "invalid"] }]);
    const filters = { page: 2, projectId: "site-1", keyword: "floor" };
    const result = await loadAllProjectsDiary(LIMENI_ORGANIZATION_ID, filters);
    expect(result.records[0].Photos).toEqual([photo]);
    expect(result.photoUrls).toEqual([photo, laterPhoto]);
    expect(recordsFindManyMock).toHaveBeenNthCalledWith(2, {
      where: buildAllProjectsDiaryWhere(LIMENI_ORGANIZATION_ID, filters),
      orderBy: recordsFindManyMock.mock.calls[0][0].orderBy,
      skip: 0,
      take: 60,
      select: { Photos: true },
    });
  });

  it("does not load an image manifest for other organizations", async () => {
    const result = await loadAllProjectsDiary("other-org");
    expect(result.photoUrls).toEqual([]);
    expect(recordsFindManyMock).toHaveBeenCalledTimes(1);
  });

  it("paginates Limeni in batches of 30 and limits the initial photo batch", async () => {
    recordsCountMock.mockResolvedValue(138);
    const result = await loadAllProjectsDiary(LIMENI_ORGANIZATION_ID, { page: 2 });
    expect(recordsFindManyMock).toHaveBeenNthCalledWith(1, expect.objectContaining({ skip: 30, take: 30 }));
    expect(result).toMatchObject({ page: 2, pageSize: 30, totalCount: 138, totalPages: 5 });
    expect(recordsFindManyMock.mock.calls[1][0]).toMatchObject({ skip: 0, take: 60 });
  });

  it("loads only the selected later page's photo URLs", async () => {
    await loadAllProjectsDiary(LIMENI_ORGANIZATION_ID, { page: 4 });
    expect(recordsFindManyMock.mock.calls[1][0]).toMatchObject({ skip: 90, take: 30, select: { Photos: true } });
    expect(recordsFindManyMock.mock.calls[1][0].orderBy).toEqual(recordsFindManyMock.mock.calls[0][0].orderBy);
  });

  it("exposes inline plans only to SB STOMME and leaves actuals unchanged", async () => {
    const row = {
      id: "row",
      Works: "Actual walls",
      Amounts: 8,
      Works_Custom_1: "Planned walls",
      Comments_Custom_2: "10",
      Works_Custom_2: "Rain",
      Site: { name: "Site", siteDiaryRecordsMap: null },
    };
    recordsFindManyMock.mockResolvedValue([row]);
    const sb = await loadAllProjectsDiaryExportRecords(
      SB_STOMME_ORGANIZATION_ID,
    );
    expect(sb[0]).toMatchObject({
      Works: "Actual walls",
      Amounts: 8,
      sbPlan: {
        plannedWork: "Planned walls",
        plannedAmount: "10",
        weather: "Rain",
      },
    });
    const other = await loadAllProjectsDiaryExportRecords("other");
    expect(other[0].sbPlan).toBeNull();
    expect(other[0]).not.toHaveProperty("Works_Custom_1");
  });
  beforeEach(() => {
    jest.clearAllMocks();
    siteFindManyMock.mockResolvedValue([
      { id: "site-1", name: "Site 1", siteDiaryRecordsMap: null },
    ]);
    recordsFindManyMock.mockResolvedValue([]);
    recordsCountMock.mockResolvedValue(51);
  });

  it("scopes records to the organization and applies portfolio filters", () => {
    expect(
      buildAllProjectsDiaryWhere("org-1", {
        projectId: "site-1",
        keyword: "estrich",
        dateFrom: "2026-08-01",
        dateTo: "2026-08-31",
      }),
    ).toEqual(
      expect.objectContaining({
        archivedAt: null,
        Site: { organizationId: "org-1" },
        siteId: "site-1",
        Date: {
          gte: new Date("2026-08-01T00:00:00.000Z"),
          lt: new Date("2026-09-01T00:00:00.000Z"),
        },
        OR: expect.arrayContaining([
          { Works: { contains: "estrich", mode: "insensitive" } },
          { Site: { name: { contains: "estrich", mode: "insensitive" } } },
        ]),
      }),
    );
  });

  it("returns a newest-first paginated organization view", async () => {
    const result = await loadAllProjectsDiary("org-1", { page: 2 });

    expect(siteFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { organizationId: "org-1" } }),
    );
    expect(recordsFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: ALL_PROJECTS_DIARY_PAGE_SIZE,
        take: ALL_PROJECTS_DIARY_PAGE_SIZE,
        orderBy: [
          { Date: { sort: "desc", nulls: "last" } },
          { createdAt: "desc" },
          { id: "desc" },
        ],
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({ page: 2, totalCount: 51, totalPages: 2 }),
    );
  });

  it("adds each record's configured actual cost without exposing site config", async () => {
    recordsFindManyMock.mockResolvedValueOnce([
      {
        id: "record-1",
        siteId: "site-1",
        Works: "Masonry",
        Units: "m2",
        Amounts: 10,
        WorkersInvolved: 2,
        TimeInvolved: 3,
        Site: {
          name: "Site 1",
          siteDiaryRecordsMap: {
            Works: { DropDownOptions: { masonry: "Masonry" } },
            otherSettings: {
              defaultConstructionProductivity: {
                version: 4,
                works: [
                  {
                    work: "Masonry",
                    unit: "m2",
                    laborNormHoursPerUnit: 0.5,
                    hourlyCost: 20,
                    costCalculationMode: "output",
                  },
                ],
              },
            },
          },
        },
      },
    ]);

    const result = await loadAllProjectsDiary("org-1");

    expect(result.records).toEqual([
      expect.objectContaining({
        id: "record-1",
        Site: { name: "Site 1" },
        actualCost: 100,
      }),
    ]);
    expect(result.records[0]?.Site).not.toHaveProperty("siteDiaryRecordsMap");
  });

  it("adds semantic plan/fact values for profiled projects", async () => {
    const siteDiaryRecordsMap = {
      otherSettings: {
        defaultConstructionQuantityPlanActual: { enabled: true },
      },
    };
    siteFindManyMock.mockResolvedValueOnce([
      { id: "site-1", name: "Site 1", siteDiaryRecordsMap },
    ]);
    recordsFindManyMock.mockResolvedValueOnce([
      {
        id: "record-1",
        siteId: "site-1",
        Comments_Custom_1: "120",
        Amounts: 100,
        Site: { name: "Site 1", siteDiaryRecordsMap },
      },
    ]);

    const result = await loadAllProjectsDiary("org-1");

    expect(result.quantityPlanFactEnabled).toBe(true);
    expect(result.records[0]).toMatchObject({
      plannedAmount: 100,
      actualAmount: 120,
      quantityComparisonStatus: "over-plan",
      quantityPlanFactEnabled: true,
    });
  });

  it("exports every matching record without pagination", async () => {
    await loadAllProjectsDiaryExportRecords("org-1", {
      projectId: "site-1",
      keyword: "estrich",
    });

    expect(recordsFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          Site: { organizationId: "org-1" },
          siteId: "site-1",
        }),
        orderBy: [
          { Date: { sort: "desc", nulls: "last" } },
          { createdAt: "desc" },
          { id: "desc" },
        ],
      }),
    );
    const query = recordsFindManyMock.mock.calls.at(-1)?.[0];
    expect(query).not.toHaveProperty("skip");
    expect(query).not.toHaveProperty("take");
  });
});


it("preserves FIMA collaboration and each record's real project and BIS scope without exposing import metadata", async () => {
  const siteDiaryRecordsMap = { otherSettings: { fimaCollaboration: true } };
  siteFindManyMock.mockResolvedValue([{ id: "site-fima", name: "Olaine", siteDiaryRecordsMap }]);
  recordsFindManyMock.mockResolvedValue([{ id: "record", siteId: "site-fima", Works_Custom_1: "BIS work", Works_Custom_2: "19:00–05:00", BISId: "123", bisStatus: "approved", evalMetadata: { kuceImport: { privateSource: "source" }, fimaCollaboration: { version: 2, status: "needs_changes", materials: [], history: [] } }, Site: { name: "Olaine", siteDiaryRecordsMap, bisCaseId: "668714", bisCaseNumber: "BIS-BL-123" } }]);
  const data = await loadAllProjectsDiary("fima");
  expect(data.fimaCollaborationEnabled).toBe(true);
  expect(data.records[0]).toMatchObject({ siteId: "site-fima", BISId: "123", bisStatus: "approved", bisCaseId: "668714", bisCaseNumber: "BIS-BL-123", Works_Custom_1: "BIS work", Works_Custom_2: "19:00–05:00", fimaCollaboration: { version: 2, status: "needs_changes" } });
  expect(data.records[0]).not.toHaveProperty("evalMetadata");
  expect(data.records[0].Site).not.toHaveProperty("siteDiaryRecordsMap");
});
