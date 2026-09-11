jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/lib/utils/requireUser", () => ({
  requireUser: jest.fn(async () => ({ id: "user" })),
}));
jest.mock("@/server/actions/shared-actions", () => ({ orgCheck: jest.fn() }));
jest.mock("@/lib/utils/db", () => ({
  prisma: {
    $transaction: jest.fn(),
    $executeRaw: jest.fn(),
    site: { findUniqueOrThrow: jest.fn(), findFirst: jest.fn() },
    sitediaryrecords: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

import { BEGIN_ORGANIZATION_ID, BEGIN_STORAGE_MARKER } from "@/lib/begin-hours";
import { prisma } from "@/lib/utils/db";
import { importBeginHours } from "./begin-hours-actions";
import { orgCheck } from "./shared-actions";

const snapshot = JSON.stringify({
  source: "https://app.begin.ee/en/new-timesheets",
  company: "Test",
  targetOrganizationId: BEGIN_ORGANIZATION_ID,
  from: "2026-08-31",
  through: "2026-08-31",
  capturedOn: "2026-09-10",
  workers: ["Worker"],
  objects: ["Object"],
  columns: [
    "workerIndex",
    "date",
    "start",
    "end",
    "durationMinutes",
    "objectIndex",
    "status",
    "comment",
  ],
  rows: [[0, "31.08.2026", "07:00", "15:00", 480, 0, "approved", ""]],
});
const args = { siteId: "site", snapshot, objects: ["Object"] };
beforeEach(() => {
  (prisma.site.findFirst as jest.Mock).mockResolvedValue({ id: "site" });
  jest.clearAllMocks();
  (orgCheck as jest.Mock).mockResolvedValue({
    id: "site",
    organizationId: BEGIN_ORGANIZATION_ID,
  });
  (prisma.$transaction as jest.Mock).mockImplementation((callback) =>
    callback(prisma),
  );
  (prisma.site.findUniqueOrThrow as jest.Mock).mockResolvedValue({
    siteDiaryRecordsMap: { Comments_Custom_2: { Type: "noRender" } },
  });
  (prisma.sitediaryrecords.findFirst as jest.Mock).mockResolvedValue(null);
  (prisma.sitediaryrecords.findMany as jest.Mock).mockResolvedValue([]);
});
test("preview does not write; commit keeps storage outside ordinary diary rows", async () => {
  const preview = await importBeginHours(args);
  expect(preview.minutes).toBe(480);
  expect(prisma.sitediaryrecords.create).not.toHaveBeenCalled();
  await importBeginHours({ ...args, expectedRevision: preview.revision });
  const data = (prisma.sitediaryrecords.create as jest.Mock).mock.calls[0][0]
    .data;
  expect(data.archiveReason).toBe(BEGIN_STORAGE_MARKER);
  expect(data.archivedAt).toBeInstanceOf(Date);
  expect(data.Amounts).toBeUndefined();
  expect(JSON.parse(data.Comments_Custom_2).entries).toHaveLength(1);
});
test("repeat import is idempotent and corrections preserve history", async () => {
  const preview = await importBeginHours(args);
  await importBeginHours({ ...args, expectedRevision: preview.revision });
  const stored = (prisma.sitediaryrecords.create as jest.Mock).mock.calls[0][0]
    .data;
  (prisma.sitediaryrecords.findMany as jest.Mock).mockResolvedValue([stored]);
  const repeat = await importBeginHours(args);
  expect(repeat.changedDays).toBe(0);
  await importBeginHours({ ...args, expectedRevision: repeat.revision });
  expect(prisma.sitediaryrecords.update).not.toHaveBeenCalled();
  const changed = JSON.parse(snapshot);
  changed.rows[0][4] = 420;
  await importBeginHours({
    ...args,
    snapshot: JSON.stringify(changed),
    expectedRevision: repeat.revision,
  });
  const updated = JSON.parse(
    (prisma.sitediaryrecords.update as jest.Mock).mock.calls[0][0].data
      .Comments_Custom_2,
  );
  expect(updated.entries[0].minutes).toBe(420);
  expect(updated.history[0].entries[0].minutes).toBe(480);
});
test("blocks missing access and other organizations", async () => {
  (orgCheck as jest.Mock).mockResolvedValue(false);
  await expect(importBeginHours(args)).rejects.toThrow("piekļuves");
  (orgCheck as jest.Mock).mockResolvedValue({ organizationId: "other" });
  await expect(importBeginHours(args)).rejects.toThrow("organizācijai");
  expect(prisma.$transaction).not.toHaveBeenCalled();
});
test("blocks an occupied field and stale preview", async () => {
  (prisma.sitediaryrecords.findFirst as jest.Mock).mockResolvedValue({
    id: "existing",
  });
  await expect(importBeginHours(args)).rejects.toThrow("jau tiek izmantots");
  (prisma.sitediaryrecords.findFirst as jest.Mock).mockResolvedValue(null);
  await expect(
    importBeginHours({ ...args, expectedRevision: "old" }),
  ).rejects.toThrow("mainījušies");
  expect(prisma.sitediaryrecords.create).not.toHaveBeenCalled();
});
