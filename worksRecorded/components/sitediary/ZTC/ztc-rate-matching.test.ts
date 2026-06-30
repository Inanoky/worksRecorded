import {
  findZtcDefaultRateForTask,
  ztcRateMatchTokens,
} from "@/components/sitediary/ZTC/ztc-rate-matching";

describe("findZtcDefaultRateForTask", () => {
  it("matches TL timber-frame drawing work to configured koka karkas rate", () => {
    const result = findZtcDefaultRateForTask(
      "TL - Koka karkass 95 mm",
      [{ task: "koka karkas", rate: "3.0", unit: "m2" }],
      { category: "works" },
    );

    expect(result?.entry).toEqual({ task: "koka karkas", rate: "3.0", unit: "m2" });
    expect(result?.score).toBeGreaterThanOrEqual(0.8);
  });

  it("ignores numeric dimensions and units while matching rates", () => {
    expect(ztcRateMatchTokens("TL - Koka karkass 95 mm")).toEqual(
      expect.arrayContaining(["tl", "karkas", "karkass"]),
    );
    expect(ztcRateMatchTokens("TL - Koka karkass 95 mm")).not.toEqual(
      expect.arrayContaining(["95", "mm"]),
    );
  });
});
