import {
  applyDefaultConstructionQuantityProfile,
  enableDefaultConstructionQuantityProfile,
  formatDefaultConstructionQuantityRowsForExcel,
  getDefaultConstructionQuantityComparison,
  normalizeActualQuantityForStorage,
} from "@/flows/default-construction/lib/quantity-plan-actual";

describe("default construction quantity plan/fact profile", () => {
  const baseConfig = {
    Comments_Custom_1: {
      Type: "noRender",
      DisplayName: "Comments custom 1",
      customSettings: { displayinSiteList: "no" },
    },
    Amounts: {
      Type: "float",
      DisplayName: "Amounts",
      customSettings: { displayinSiteList: "yes" },
    },
    otherSettings: { Type: "noRender" },
  };

  it("does not alter unprofiled configurations", () => {
    expect(applyDefaultConstructionQuantityProfile(baseConfig)).toBe(
      baseConfig,
    );
  });

  it("exposes the custom field as planned quantity only when enabled", () => {
    const config = applyDefaultConstructionQuantityProfile(
      enableDefaultConstructionQuantityProfile(baseConfig),
    );

    expect(config.Comments_Custom_1).toMatchObject({
      Type: "float",
      DisplayName: "Daudzums (fakts)",
      customSettings: {
        semanticRole: "actualQuantity",
        displayinSiteList: "yes",
      },
    });
    expect(config.Amounts.DisplayName).toBe("Daudzums (plāns)");
  });

  it.each([
    ["10", 12, "over-plan"],
    ["10,5", 8, "under-plan"],
    ["10", 10, "on-plan"],
    ["", 10, "unknown"],
    ["10", null, "unknown"],
  ] as const)("compares plan %s with fact %s", (plan, fact, status) => {
    const config = enableDefaultConstructionQuantityProfile(baseConfig);
    expect(
      getDefaultConstructionQuantityComparison(
        { Amounts: plan, Comments_Custom_1: fact },
        config,
      ),
    ).toMatchObject({ status });
  });

  it("normalizes decimal commas and rejects invalid actual quantities", () => {
    expect(normalizeActualQuantityForStorage("12,5")).toBe("12.5");
    expect(normalizeActualQuantityForStorage(0)).toBe("0");
    expect(normalizeActualQuantityForStorage("")).toBeNull();
    expect(() => normalizeActualQuantityForStorage("abc")).toThrow();
    expect(() => normalizeActualQuantityForStorage(-1)).toThrow();
  });

  it("exports semantic plan and fact columns without leaking the storage field", () => {
    const config = enableDefaultConstructionQuantityProfile(baseConfig);
    const [row] = formatDefaultConstructionQuantityRowsForExcel(
      [{ Comments_Custom_1: "10", Amounts: 8, Works: "Darbs" }],
      config,
      "lv",
    );

    expect(row).toMatchObject({
      "Daudzums (plāns)": 8,
      "Daudzums (fakts)": 10,
      "Plāna statuss": "Virs plāna",
      Works: "Darbs",
    });
    expect(row).not.toHaveProperty("Comments_Custom_1");
    expect(row).not.toHaveProperty("Amounts");
  });
});
