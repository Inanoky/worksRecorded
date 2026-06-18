import {
  resolveZtcAdditionalWorkUnit,
} from "@/components/sitediary/ZTC/ztc-rate-units";

describe("resolveZtcAdditionalWorkUnit", () => {
  it("uses the configured Darba likmes unit over the reported unit", () => {
    expect(
      resolveZtcAdditionalWorkUnit({
        configuredUnit: "tn",
        reportedUnit: "kg",
      }),
    ).toBe("tn");
  });

  it("keeps backward-compatible st when an old rate has no configured unit", () => {
    expect(resolveZtcAdditionalWorkUnit({ reportedUnit: null })).toBe("st");
  });
});
