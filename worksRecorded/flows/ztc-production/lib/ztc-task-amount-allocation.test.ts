import {
  allocateZtcTaskAmountByTime,
  getZtcTaskIdentityKey,
} from "@/flows/ztc-production/lib/ztc-task-amount-allocation";

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
