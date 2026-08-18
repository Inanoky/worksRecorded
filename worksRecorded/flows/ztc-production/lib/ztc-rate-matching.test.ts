import {
  canonicalizeZtcMatchedWorkName,
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

  it("prefers an exact latojums cross-section", () => {
    const result = findZtcDefaultRateForTask(
      "R3/T3 - latojums 25x45",
      [
        { task: "latojums 45x45", rate: "0.9", unit: "m2" },
        { task: "latojums 28x45", rate: "0.8", unit: "m2" },
        { task: "latojums 25x45", rate: "0.7", unit: "m2" },
      ],
      { category: "works" },
    );

    expect(result?.entry.task).toBe("latojums 25x45");
  });

  it("uses the nearest compatible latojums cross-section when no exact rate exists", () => {
    const result = findZtcDefaultRateForTask(
      "R3/T3 - latojums 25x45",
      [
        { task: "latojums 45x45", rate: "0.9", unit: "m2" },
        { task: "latojums 28x45", rate: "0.8", unit: "m2" },
      ],
      { category: "works" },
    );

    expect(result?.entry.task).toBe("latojums 28x45");
  });

  it("allows 45x45 as a fallback when it is the only compatible latojums rate", () => {
    const result = findZtcDefaultRateForTask(
      "R3/T3 - latojums 25 × 45 mm",
      [{ task: "latojums 45x45", rate: "0.9", unit: "m2" }],
      { category: "works" },
    );

    expect(result?.entry.task).toBe("latojums 45x45");
  });

  it("uses a generic same-work rate before an incompatible cross-section", () => {
    const result = findZtcDefaultRateForTask(
      "R3/T3 - latojums 25x45",
      [
        { task: "latojums", rate: "0.6", unit: "m2" },
        { task: "latojums 28x70", rate: "0.8", unit: "m2" },
      ],
      { category: "works" },
    );

    expect(result?.entry.task).toBe("latojums");
  });

  it("rejects an incompatible dimension-specific rate when no generic rate exists", () => {
    const result = findZtcDefaultRateForTask(
      "R3/T3 - latojums 25x45",
      [{ task: "latojums 28x70", rate: "0.8", unit: "m2" }],
      { category: "works" },
    );

    expect(result).toBeNull();
  });

  it("keeps cross-section strictness out of additional-detail matching", () => {
    const result = findZtcDefaultRateForTask(
      "papildus dēlis 25x45",
      [{ task: "dēlis", rate: "1.2", unit: "gab" }],
      { category: "additionalDetails" },
    );

    expect(result?.entry.task).toBe("dēlis");
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

  it("prefers an exact apdares dēlis dimension, falls back to generic, and rejects unrelated work", () => {
    const genericRate = {
      task: "apdares dēļis ar piezāģēšanu",
      rate: "7.5",
      unit: "m2" as const,
    };
    const dimensionRate = {
      task: "apdares dēļis ar piezāģēšanu 21x145",
      rate: "8.5",
      unit: "m2" as const,
    };

    expect(
      findZtcDefaultRateForTask(
        "R3/T3 - apdares dēļis 21x145 ar piezāģēšanu",
        [genericRate],
        { category: "works" },
      )?.entry,
    ).toEqual(genericRate);

    expect(
      findZtcDefaultRateForTask(
        "R3/T3 - apdares dēļis 21x145 ar piezāģēšanu",
        [genericRate, dimensionRate],
        { category: "works" },
      )?.entry,
    ).toEqual(dimensionRate);

    expect(
      findZtcDefaultRateForTask(
        "R3/T3 - apdares dēļis 30x180 ar piezāģēšanu",
        [genericRate, dimensionRate],
        { category: "works" },
      )?.entry,
    ).toEqual(genericRate);

    expect(
      findZtcDefaultRateForTask(
        "R3/T3 - apdares dēļis 21x145 ar piezāģēšanu",
        [{ task: "Karkasa montāža", rate: "3.0", unit: "m2" }],
        { category: "works" },
      ),
    ).toBeNull();
  });

  it("ignores numeric dimensions and units while matching rates", () => {
    expect(ztcRateMatchTokens("TL - Koka karkass 95 mm")).toEqual(
      expect.arrayContaining(["tl", "karkas", "karkass"]),
    );
    expect(ztcRateMatchTokens("TL - Koka karkass 95 mm")).not.toEqual(
      expect.arrayContaining(["95", "mm"]),
    );
  });

  it("matches Blue GKF OCR text to the configured GKFI task", () => {
    const result = findZtcDefaultRateForTask(
      "R1/T1 - Blue GKF 12.5",
      [
        {
          task: "Ģipškartona plāksne GKFI12.5",
          rate: "2.1",
          unit: "m2",
          laborNorm: "0.14",
        },
      ],
      { category: "works" },
    );

    expect(result?.entry.task).toBe("Ģipškartona plāksne GKFI12.5");
    expect(result?.entry.rate).toBe("2.1");
  });

  it("matches Blue GKL OCR text to the configured GKFI task", () => {
    const result = findZtcDefaultRateForTask(
      "R1/T1 - Blue GKL 12.5",
      [
        {
          task: "Ģipškartona plāksne GKFI12.5",
          rate: "2.1",
          unit: "m2",
          laborNorm: "0.14",
        },
      ],
      { category: "works" },
    );

    expect(result?.entry.task).toBe("Ģipškartona plāksne GKFI12.5");
    expect(result?.entry.rate).toBe("2.1");
  });

  it("does not map similar board names when their thicknesses differ", () => {
    const result = findZtcDefaultRateForTask(
      "R1/T1 - Blue GKF 15",
      [{ task: "Ģipškartona plāksne GKFI12.5", rate: "2.1", unit: "m2" }],
      { category: "works" },
    );

    expect(result).toBeNull();
  });

  it("does not map Blue GKL when its thickness differs", () => {
    const result = findZtcDefaultRateForTask(
      "R1/T1 - Blue GKL 15",
      [{ task: "Ģipškartona plāksne GKFI12.5", rate: "2.1", unit: "m2" }],
      { category: "works" },
    );

    expect(result).toBeNull();
  });

  it("maps the known Paroc Ultra 245 drawing variant to the configured Paroc rate", () => {
    const result = findZtcDefaultRateForTask(
      "L0 - Paroc Ultra minerālvates siltumizolācija / 245mm",
      [
        {
          task: "Paroc Ultra minerālvates siltumizolācija 150 mm",
          rate: "0.9",
          unit: "m2",
          laborNorm: "0.06",
        },
      ],
      { category: "works" },
    );

    expect(result?.entry.task).toBe(
      "Paroc Ultra minerālvates siltumizolācija 150 mm",
    );
    expect(result?.entry.rate).toBe("0.9");
  });

  it("maps the known 9.5 KTS drawing variant to the configured GKFI task", () => {
    const result = findZtcDefaultRateForTask(
      "R1/T1 - Ģipškartona plāksne 9.5 KTS",
      [
        {
          task: "Ģipškartona plāksne GKFI12.5",
          rate: "2.1",
          unit: "m2",
          laborNorm: "0.14",
        },
      ],
      { category: "works" },
    );

    expect(result?.entry.task).toBe("Ģipškartona plāksne GKFI12.5");
    expect(result?.entry.rate).toBe("2.1");
  });
});

describe("canonicalizeZtcMatchedWorkName", () => {
  it("keeps the drawing code and displays the configured task name", () => {
    expect(
      canonicalizeZtcMatchedWorkName(
        "R1/T1 - Blue GKFI 12.5",
        "Ģipškartona plāksne GKFI12.5",
      ),
    ).toBe("R1/T1 - Ģipškartona plāksne GKFI12.5");
  });

  it("preserves TL for timber-frame workflow rules", () => {
    expect(canonicalizeZtcMatchedWorkName("TL - Timber frame", "Koka karkass"))
      .toBe("TL - Koka karkass");
  });
});
