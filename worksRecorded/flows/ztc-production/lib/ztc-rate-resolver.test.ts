import {
  buildZtcConfiguredWorkFilterOptions,
  buildZtcRecordedWorkFilterOptions,
  getZtcProjectWorkRates,
  resolveZtcRateTaskForRow,
  ztcRowMatchesConfiguredWorkFilter,
} from "@/flows/ztc-production/lib/ztc-rate-resolver";

describe("getZtcProjectWorkRates", () => {
  it("removes an inherited task excluded by a specific project", () => {
    const rates = getZtcProjectWorkRates(
      [
        {
          projectName: "Visi projekti",
          works: [
            { task: "CNC projekts", rate: "15", unit: "st" },
            { task: "paneļu labošana", rate: "15", unit: "st" },
          ],
        },
        {
          projectName: "test projekts",
          excludedTasks: { works: ["CNC projekts"] },
          works: [],
        },
      ],
      "test projekts",
    );

    expect(rates.map((entry) => entry.task)).toEqual(["paneļu labošana"]);
  });

  it("does not allow coefficient rows to be excluded", () => {
    const rates = getZtcProjectWorkRates(
      [
        {
          projectName: "Visi projekti",
          works: [{ task: "1 koeficients", rate: "1", unit: "m2" }],
        },
        {
          projectName: "test projekts",
          excludedTasks: { works: ["1 koeficients"] },
          works: [],
        },
      ],
      "test projekts",
    );

    expect(rates.map((entry) => entry.task)).toEqual(["1 koeficients"]);
  });
});

describe("buildZtcRecordedWorkFilterOptions", () => {
  it("returns rate-group names only for groups represented by database records", () => {
    const options = buildZtcRecordedWorkFilterOptions({
      rows: [
        { Location: "Project RD", Works: "L2/B2 - latojums 45x45" },
        { Location: "Project RD", Works: "R1/T1 - difuzijas membrana" },
        { Location: "Project RD", Works: "unmatched prefixed work" },
        { Location: "Project RD", Works: "  " },
      ],
      defaultRates: [
        {
          projectName: "Project RD",
          works: [
            { task: "latojums 45x45", rate: "1.2", unit: "m2" },
            { task: "difuzijas membrana", rate: "0.9", unit: "m2" },
            { task: "configured but unused", rate: "1", unit: "m2" },
          ],
        },
      ],
    });

    expect(options).toEqual(["difuzijas membrana", "latojums 45x45"]);
    expect(options).not.toContain("L2/B2 - latojums 45x45");
    expect(options).not.toContain("configured but unused");
    expect(options).not.toContain("unmatched prefixed work");
  });
});

describe("resolveZtcRateTaskForRow", () => {
  it("normalizes commas in both stored and canonical work names", () => {
    const resolved = resolveZtcRateTaskForRow(
      {
        Location: "zemgales prospekts 11 (zp)",
        Works: "R1/T1 - Blue GKFI 12,5",
      },
      [
        {
          projectName: "zemgales prospekts 11 (zp)",
          works: [
            {
              task: "R1/T1 - Blue GKFI 12,5",
              rate: "2.1",
              unit: "m2",
            },
          ],
        },
      ],
    );

    expect(resolved?.extractedTask).toBe("R1/T1 - Blue GKFI 12.5");
    expect(resolved?.canonicalTask).toBe("R1/T1 - Blue GKFI 12.5");
    expect(resolved?.differs).toBe(false);
  });

  it("resolves a drawing cross-section to the nearest compatible rate task", () => {
    const resolved = resolveZtcRateTaskForRow(
      {
        Location: "dz. ēka. auto nojume (rd)",
        Works: "R3/T3 - latojums 25x45",
      },
      [
        {
          projectName: "dz. ēka. auto nojume (rd)",
          works: [
            { task: "latojums 45x45", rate: "0.9", unit: "m2" },
            { task: "latojums 28x45", rate: "0.8", unit: "m2" },
          ],
        },
      ],
    );

    expect(resolved?.canonicalTask).toBe("latojums 28x45");
    expect(resolved?.extractedTask).toBe("R3/T3 - latojums 25x45");
    expect(resolved?.entry.rate).toBe("0.8");
  });
});

describe("buildZtcConfiguredWorkFilterOptions", () => {
  const defaultRates = [
    {
      projectName: "Visi projekti",
      works: [
        { task: "1 koeficients", rate: "1", unit: "m2" as const },
        { task: "latojums 28x45", rate: "0.8", unit: "m2" as const },
        { task: "OSB 22 mm ar spundi", rate: "1.2", unit: "m2" as const },
      ],
      additionalDetails: [
        { task: "cilpu iestrāde", rate: "3", unit: "gab" as const },
      ],
      additionalWorks: [
        { task: "CNC projekts", rate: "15", unit: "st" as const },
      ],
    },
    {
      projectName: "Project RD",
      excludedTasks: { works: ["OSB 22 mm ar spundi"] },
      works: [],
      additionalDetails: [],
      additionalWorks: [],
    },
  ];

  it("combines effective configured tasks with only unmatched project rows", () => {
    const options = buildZtcConfiguredWorkFilterOptions({
      defaultRates,
      projectName: "Project RD",
      rows: [
        { Location: "Project RD", Works: "R3/T3 - latojums 25x45" },
        { Location: "Project RD", Works: "uncategorized cleanup" },
        {
          Location: "Project RD",
          Works: "cilpu iestrāde",
          Works_Custom_1: "Papilddetāļas",
        },
      ],
      additionalOptions: ["Papilddetāļas"],
    });

    expect(options).toEqual([
      "cilpu iestrāde",
      "CNC projekts",
      "latojums 28x45",
      "Papilddetāļas",
      "uncategorized cleanup",
    ]);
    expect(options).not.toContain("1 koeficients");
    expect(options).not.toContain("OSB 22 mm ar spundi");
    expect(options).not.toContain("R3/T3 - latojums 25x45");
  });
});

describe("ztcRowMatchesConfiguredWorkFilter", () => {
  it("matches a recorded drawing variant through its configured canonical task", () => {
    expect(
      ztcRowMatchesConfiguredWorkFilter(
        { Location: "Project RD", Works: "R3/T3 - latojums 25x45" },
        "latojums 28x45",
        [
          {
            projectName: "Project RD",
            works: [
              { task: "latojums 28x45", rate: "0.8", unit: "m2" },
            ],
          },
        ],
      ),
    ).toBe(true);
  });

  it("still matches an uncategorized historical work exactly", () => {
    expect(
      ztcRowMatchesConfiguredWorkFilter(
        { Location: "Project RD", Works: "uncategorized cleanup" },
        "uncategorized cleanup",
        [],
      ),
    ).toBe(true);
  });
});
