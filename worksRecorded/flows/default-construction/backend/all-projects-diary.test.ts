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

describe("all projects diary", () => {
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
