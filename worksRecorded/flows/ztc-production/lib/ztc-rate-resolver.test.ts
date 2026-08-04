import { resolveZtcRateTaskForRow } from "@/flows/ztc-production/lib/ztc-rate-resolver";

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
