import {
  findZtcDefaultRateForTask,
  ztcRateMatchTokens,
} from "@/flows/ztc-production/lib/ztc-rate-matching";

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

  it("matches a shorter configured material name to a longer drawing work", () => {
    const result = findZtcDefaultRateForTask(
      "R2/T2 - Gipškartona plāksne GKF 15 mm",
      [{ task: "gipškartons", rate: "2.5", unit: "m2" }],
      { category: "works" },
    );

    expect(result?.entry).toEqual({ task: "gipškartons", rate: "2.5", unit: "m2" });
  });

  it("prefers the more specific covered rate when several rates match", () => {
    const result = findZtcDefaultRateForTask(
      "R2/T2 - Gipškartona plāksne GKF 15 mm",
      [
        { task: "plāksne", rate: "1.0", unit: "m2" },
        { task: "gipškartona plāksne", rate: "2.5", unit: "m2" },
      ],
      { category: "works" },
    );

    expect(result?.entry).toEqual({ task: "gipškartona plāksne", rate: "2.5", unit: "m2" });
  });

  it("prefers a rate with the matching dimension over the same material with another dimension", () => {
    const result = findZtcDefaultRateForTask(
      "L0 - Paroc Ultra minerālvates siltumizolācija / 245mm",
      [
        {
          task: "Paroc Ultra minerālvates siltumizolācija 150 mm",
          rate: "0.95",
          unit: "m2",
        },
        {
          task: "Paroc Ultra minerālvates siltumizolācija 245 mm",
          rate: "1.8",
          unit: "m2",
        },
      ],
      { category: "works" },
    );

    expect(result?.entry).toEqual({
      task: "Paroc Ultra minerālvates siltumizolācija 245 mm",
      rate: "1.8",
      unit: "m2",
    });
  });

  it("still matches a dimensioned drawing work to a generic configured material", () => {
    const result = findZtcDefaultRateForTask(
      "L0 - Paroc Ultra minerālvates siltumizolācija / 245mm",
      [{ task: "Paroc Ultra minerālvates siltumizolācija", rate: "0.95", unit: "m2" }],
      { category: "works" },
    );

    expect(result?.entry).toEqual({
      task: "Paroc Ultra minerālvates siltumizolācija",
      rate: "0.95",
      unit: "m2",
    });
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
