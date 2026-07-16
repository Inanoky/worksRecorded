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
});
