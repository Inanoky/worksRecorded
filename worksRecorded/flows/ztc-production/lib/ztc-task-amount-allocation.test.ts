import {
  allocateZtcTaskAmountByTime,
  getZtcTaskIdentityKey,
  isZtcAreaAllocationEligible,
  rebalanceZtcCompletedTaskAmounts,
} from "@/flows/ztc-production/lib/ztc-task-amount-allocation";

const mockFindUnique = jest.fn();
const mockFindMany = jest.fn();
const mockUpdate = jest.fn();
const mockManualEdit = jest.fn();
jest.mock("@/lib/utils/db", () => ({ prisma: { ztcRecords: {
  findUnique: (...args: unknown[]) => mockFindUnique(...args),
  findMany: (...args: unknown[]) => mockFindMany(...args),
} } }));
jest.mock("@/flows/ztc-production/lib/ztc-record-audit", () => ({
  auditZtcMutation: (_step: string, run: (tx: unknown) => unknown) => run({
    ztcRecords: { updateMany: mockUpdate },
    ztcRecordAudit: { findFirst: mockManualEdit },
  }),
}));

describe("production quantity guards", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockManualEdit.mockResolvedValue(null);
    mockUpdate.mockResolvedValue({ count: 1 });
  });
  function setupAreaRecords() {
    const Works = "L3/B3 - latas 45x45 mm";
    mockFindUnique.mockResolvedValue({ siteId: "site", organizationId: "org", Location: "AM piebūve",
      Location_Custom_1: "1W1", Works, Units: "m2", Date_Custom_2: new Date() });
    const metadata = JSON.stringify({ type: "ztc_drawing_context", elements: [
      { elementName: "1W1", totalAreaM2: 13.86, works: [{ name: Works, amountM2: 13.86 }] },
    ] });
    mockFindMany.mockResolvedValue([
      { id: "yesterday", Works, Units: "m2", Amounts: 13.86, TimeInvolved: 0.26, Comments_Custom_2: metadata },
      { id: "today", Works, Units: "m2", Amounts: 13.86, TimeInvolved: 0.20, Comments_Custom_2: metadata },
    ]);
  }
  it("keeps valid cross-day area allocation and recalculation idempotent", async () => {
    setupAreaRecords();
    await rebalanceZtcCompletedTaskAmounts({ recordId: "today" });
    expect(mockUpdate.mock.calls.map(([args]) => args.data.Amounts)).toEqual([7.83, 6.03]);
    mockUpdate.mockClear();
    await rebalanceZtcCompletedTaskAmounts({ recordId: "today" });
    expect(mockUpdate.mock.calls.map(([args]) => args.data.Amounts)).toEqual([7.83, 6.03]);
  });
  it("leaves manually corrected quantities unchanged", async () => {
    setupAreaRecords();
    mockManualEdit.mockResolvedValue({ id: 1n });
    expect(await rebalanceZtcCompletedTaskAmounts({ recordId: "today" }))
      .toEqual({ updated: 0, totalAmount: 13.86 });
    expect(mockUpdate).not.toHaveBeenCalled();
  });
  it("aborts an allocation if a row changed after it was read", async () => {
    setupAreaRecords();
    mockUpdate.mockResolvedValueOnce({ count: 0 });
    await expect(rebalanceZtcCompletedTaskAmounts({ recordId: "today" }))
      .rejects.toThrow("changed concurrently");
  });
  it.each(["gab", "st", "m", "t.m."])("never allocates drawing area into %s", async (Units) => {
    mockFindUnique.mockResolvedValue({
      siteId: "site", organizationId: "org", Location: "AM piebūve",
      Location_Custom_1: "1W1", Works: "vēja saites iestrāde",
      Works_Custom_1: "Papilddarbi", Units, Date_Custom_2: new Date(),
    });
    expect(await rebalanceZtcCompletedTaskAmounts({ recordId: "wind-brace", fallbackTotalAmount: 1 }))
      .toEqual({ updated: 0, totalAmount: null });
    expect(mockFindMany).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });
  it("also excludes area-based additional work", () => {
    expect(isZtcAreaAllocationEligible({ Units: "m2", Works_Custom_1: "Papilddarbi" })).toBe(false);
  });
  it("does not use panel area when the drawing has no corresponding task", async () => {
    mockFindUnique.mockResolvedValue({
      siteId: "site", organizationId: "org", Location: "AM piebūve",
      Location_Custom_1: "1W1", Works: "Unknown work", Units: "m2", Date_Custom_2: new Date(),
    });
    mockFindMany.mockResolvedValue([{
      id: "record", Works: "Unknown work", Units: "m2", Amounts: 1,
      Comments_Custom_2: JSON.stringify({ type: "ztc_drawing_context", elements: [
        { elementName: "1W1", totalAreaM2: 13.86, works: [{ name: "TL - Koka karkass", amountM2: 13.86 }] },
      ] }),
    }]);
    expect(await rebalanceZtcCompletedTaskAmounts({ recordId: "record", fallbackTotalAmount: 1 }))
      .toEqual({ updated: 0, totalAmount: null });
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});

describe("allocateZtcTaskAmountByTime", () => {
  it("splits the task quantity proportionally to each worker's time", () => {
    expect(
      allocateZtcTaskAmountByTime(12, [
        { id: "worker-a", workerId: "a", hours: 1 },
        { id: "worker-b", workerId: "b", hours: 3 },
      ]),
    ).toEqual([
      { id: "worker-a", amount: 3 },
      { id: "worker-b", amount: 9 },
    ]);
  });

  it("preserves the exact total after rounding", () => {
    const result = allocateZtcTaskAmountByTime(10, [
      { id: "worker-a", workerId: "a", hours: 1 },
      { id: "worker-b", workerId: "b", hours: 1 },
      { id: "worker-c", workerId: "c", hours: 1 },
    ]);

    expect(result).toEqual([
      { id: "worker-a", amount: 3.33 },
      { id: "worker-b", amount: 3.33 },
      { id: "worker-c", amount: 3.34 },
    ]);
    expect(result.reduce((sum, row) => sum + row.amount, 0)).toBe(10);
  });

  it("uses an equal split when all recorded times are zero", () => {
    expect(
      allocateZtcTaskAmountByTime(8, [
        { id: "worker-a", workerId: "a", hours: 0 },
        { id: "worker-b", workerId: "b", hours: null },
      ]),
    ).toEqual([
      { id: "worker-a", amount: 4 },
      { id: "worker-b", amount: 4 },
    ]);
  });

  it("splits repeated rows for the same worker proportionally to time", () => {
    expect(
      allocateZtcTaskAmountByTime(21.57, [
        { id: "day-one", workerId: "same-worker", hours: 1.65 },
        { id: "day-two", workerId: "same-worker", hours: 1.53 },
      ]),
    ).toEqual([
      { id: "day-one", amount: 11.19 },
      { id: "day-two", amount: 10.38 },
    ]);
  });
});

describe("getZtcTaskIdentityKey", () => {
  it("uses the drawing row code instead of OCR-sensitive description text", () => {
    expect(getZtcTaskIdentityKey("R2/T2 - Gipškartona plāksne GKF 15 mm")).toBe(
      getZtcTaskIdentityKey("R2 / T2 - Gipskartona plaksne GKF15mm"),
    );
  });

  it("keeps different drawing row codes in different task buckets", () => {
    expect(getZtcTaskIdentityKey("R2/T2 - Gipškartona plāksne GKF 15 mm")).not.toBe(
      getZtcTaskIdentityKey("R3/T3 - Gipškartona plāksne GKF 15 mm"),
    );
  });

  it("normalizes standalone timber-frame OCR prefixes to TL", () => {
    expect(getZtcTaskIdentityKey("T1 - Koka karkass 245 mm")).toBe(
      getZtcTaskIdentityKey("TL - Koka karkass 245 mm"),
    );
  });
});
