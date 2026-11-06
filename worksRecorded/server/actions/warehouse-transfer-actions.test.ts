jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/lib/utils/requireUser", () => ({ requireUser: jest.fn() }));
jest.mock("@/server/actions/shared-actions", () => ({ orgCheck: jest.fn() }));

const siteFindMany = jest.fn();
const materialFindMany = jest.fn();
const materialUpdateMany = jest.fn();
const transaction = jest.fn();

jest.mock("@/lib/utils/db", () => ({
  prisma: {
    site: { findMany: (...args: unknown[]) => siteFindMany(...args) },
    bISmaterialRecords: {
      findMany: (...args: unknown[]) => materialFindMany(...args),
      updateMany: (...args: unknown[]) => materialUpdateMany(...args),
    },
    $transaction: (...args: unknown[]) => transaction(...args),
  },
}));

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/utils/requireUser";
import { orgCheck } from "@/server/actions/shared-actions";
import {
  getWarehouseTransferTargets,
  moveWarehouseRecordsToProject,
} from "./warehouse-transfer-actions";

describe("warehouse project transfers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .mocked(requireUser)
      .mockResolvedValue({ id: "user-1" } as Awaited<
        ReturnType<typeof requireUser>
      >);
    jest.mocked(orgCheck).mockImplementation(async (_userId, siteId) => ({
      id: siteId,
      name: siteId,
      organizationId: siteId === "other-org" ? "org-2" : "org-1",
    }));
    transaction.mockImplementation((callback) =>
      callback({
        bISmaterialRecords: {
          findMany: materialFindMany,
          updateMany: materialUpdateMany,
        },
      })
    );
  });

  it("lists only other projects in the same organization", async () => {
    siteFindMany.mockResolvedValue([{ id: "target", name: "Target" }]);

    await expect(getWarehouseTransferTargets("source")).resolves.toEqual([
      { id: "target", name: "Target" },
    ]);
    expect(siteFindMany).toHaveBeenCalledWith({
      where: { organizationId: "org-1", id: { not: "source" } },
      orderBy: [{ name: "asc" }, { createdAt: "desc" }],
      select: { id: true, name: true },
    });
  });

  it("moves selected unsent records atomically", async () => {
    materialFindMany.mockResolvedValue([
      { id: "row-1", BISId: null },
      { id: "row-2", BISId: null },
    ]);
    materialUpdateMany.mockResolvedValue({ count: 2 });

    await expect(
      moveWarehouseRecordsToProject({
        sourceSiteId: "source",
        targetSiteId: "target",
        recordIds: ["row-1", "row-2", "row-1"],
      })
    ).resolves.toEqual({
      count: 2,
      movedIds: ["row-1", "row-2"],
      targetSiteId: "target",
    });
    expect(materialUpdateMany).toHaveBeenCalledWith({
      where: {
        id: { in: ["row-1", "row-2"] },
        siteId: "source",
        BISId: null,
      },
      data: { siteId: "target", orgId: "org-1" },
    });
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard/sites/source/BIS");
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard/sites/target/BIS");
  });

  it("rejects records already sent to BIS", async () => {
    materialFindMany.mockResolvedValue([{ id: "row-1", BISId: "bis-1" }]);

    await expect(
      moveWarehouseRecordsToProject({
        sourceSiteId: "source",
        targetSiteId: "target",
        recordIds: ["row-1"],
      })
    ).rejects.toThrow("Records already sent to BIS cannot be moved");
    expect(materialUpdateMany).not.toHaveBeenCalled();
  });

  it("rejects a destination from another organization", async () => {
    await expect(
      moveWarehouseRecordsToProject({
        sourceSiteId: "source",
        targetSiteId: "other-org",
        recordIds: ["row-1"],
      })
    ).rejects.toThrow("same organization");
    expect(transaction).not.toHaveBeenCalled();
  });
});
