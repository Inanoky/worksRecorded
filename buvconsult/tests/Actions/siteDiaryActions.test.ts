import {
  saveSiteDiaryRecords,
  saveSiteDiaryRecordsFromWeb,
  updateSiteDiaryRecord,
  getFilledDays,
  getSiteDiaryRecords,
  deleteSiteDiaryRecord,
  saveSettingsToDB,
  getSiteDiarySchema,
  deleteSchemaBySiteId,
} from "@/app/actions/siteDiaryActions";

jest.mock("@/app/utils/db", () => ({
  prisma: {
    sitediaryrecords: {
      createMany: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
    },
    sitediarysettings: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    user: { findUnique: jest.fn() },
  },
}));
jest.mock("@/app/utils/requireUser", () => ({
  requireUser: jest.fn(),
}));
jest.mock("@/components/AI/SiteDiary/agent", () => ({
  parseExcelToTree: jest.fn(),
}));

import { prisma } from "@/app/utils/db";
import { requireUser } from "@/app/utils/requireUser";
import { parseExcelToTree } from "@/componentsFrontend/AI/SiteDiary/agent";

describe("saveSiteDiaryRecords", () => {
  beforeEach(() => jest.clearAllMocks());

  it("should exit early if no rows to insert", async () => {
    const res = await saveSiteDiaryRecords({ rows: [], userId: "u1", siteId: "s1" });
    expect(res).toEqual({ ok: false, message: "No records to insert" });
    expect(prisma.sitediaryrecords.createMany).not.toHaveBeenCalled();
  });

  it("should insert rows into DB", async () => {
    (prisma.sitediaryrecords.createMany as jest.Mock).mockResolvedValue({ count: 1 });

    const rows = [{ date: "2025-01-01", location: "A", works: "B", comments: "", units: "", amounts: "10", workers: "2", hours: "3" }];
    const res = await saveSiteDiaryRecords({ rows, userId: "u1", siteId: "s1" });

    expect(prisma.sitediaryrecords.createMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.any(Array) })
    );
    expect(res).toEqual({ ok: true, count: 1 });
  });
});

describe("saveSiteDiaryRecordsFromWeb", () => {
  it("should call requireUser and insert", async () => {
    (requireUser as jest.Mock).mockResolvedValue({ id: "u1" });
    (prisma.sitediaryrecords.createMany as jest.Mock).mockResolvedValue({ count: 2 });

    const rows = [{ date: "2025-01-01", location: "Loc", works: "Work" }];
    const res = await saveSiteDiaryRecordsFromWeb({ rows, siteId: "s1" });

    expect(requireUser).toHaveBeenCalled();
    expect(prisma.sitediaryrecords.createMany).toHaveBeenCalled();
    expect(res).toEqual({ ok: true, count: 1 });
  });
});

describe("updateSiteDiaryRecord", () => {
  it("should update and return record", async () => {
    (prisma.sitediaryrecords.update as jest.Mock).mockResolvedValue({ id: "r1", Location: "A" });
    const res = await updateSiteDiaryRecord({ id: "r1", Location: "A" });
    expect(res.ok).toBe(true);
    expect(res.record).toEqual({ id: "r1", Location: "A" });
  });
});

describe("getFilledDays", () => {
  it("should return unique days", async () => {
    (prisma.sitediaryrecords.findMany as jest.Mock).mockResolvedValue([
      { Date: new Date("2025-05-01") },
      { Date: new Date("2025-05-01") },
      { Date: new Date("2025-05-02") },
    ]);
    const res = await getFilledDays({ siteId: "s1", year: 2025, month: 4 });
    expect(res).toEqual([1, 2]);
  });
});

describe("getSiteDiaryRecords", () => {
  it("should map DB rows to frontend rows", async () => {
    (prisma.sitediaryrecords.findMany as jest.Mock).mockResolvedValue([
      { id: "r1", Date: new Date("2025-05-01"), Location: "A", Works: "B", Units: "m2", Amounts: 5, WorkersInvolved: 2, TimeInvolved: 4, Comments: "ok" },
    ]);
    const res = await getSiteDiaryRecords({ siteId: "s1", date: "2025-05-01" });
    expect(res[0]).toMatchObject({
      id: "r1",
      location: "A",
      works: "B",
      amounts: "5",
      workers: "2",
      hours: "4",
    });
  });
});

describe("deleteSiteDiaryRecord", () => {
  it("should delete and return success", async () => {
    (prisma.sitediaryrecords.delete as jest.Mock).mockResolvedValue({});
    const res = await deleteSiteDiaryRecord({ id: "r1" });
    expect(prisma.sitediaryrecords.delete).toHaveBeenCalledWith({ where: { id: "r1" } });
    expect(res).toEqual({ success: true });
  });
});

describe("saveSettingsToDB", () => {
  it("should parse Excel and upsert", async () => {
    (parseExcelToTree as jest.Mock).mockResolvedValue([{ name: "Task" }]);
    (prisma.sitediarysettings.upsert as jest.Mock).mockResolvedValue({});

    const fd = new FormData();
    fd.append("siteId", "s1");
    fd.append("fileUrls", JSON.stringify(["url.xlsx"]));

    const res = await saveSettingsToDB(fd);
    expect(prisma.sitediarysettings.upsert).toHaveBeenCalled();
    expect(res).toEqual({ success: true, siteId: "s1", fileUrl: "url.xlsx", schemaSaved: true });
  });
});

describe("getSiteDiarySchema", () => {
  it("should return parsed schema", async () => {
    (prisma.sitediarysettings.findUnique as jest.Mock).mockResolvedValue({ schema: JSON.stringify([{ name: "Task" }]) });
    const res = await getSiteDiarySchema({ siteId: "s1" });
    expect(res).toEqual([{ name: "Task" }]);
  });
});

describe("deleteSchemaBySiteId", () => {
  it("should delete schema and return success", async () => {
    (prisma.sitediarysettings.delete as jest.Mock).mockResolvedValue({});
    const fd = new FormData();
    fd.append("siteId", "s1");
    const res = await deleteSchemaBySiteId(fd);
    expect(prisma.sitediarysettings.delete).toHaveBeenCalledWith({ where: { siteId: "s1" } });
    expect(res).toEqual({ success: true, siteId: "s1" });
  });
});
