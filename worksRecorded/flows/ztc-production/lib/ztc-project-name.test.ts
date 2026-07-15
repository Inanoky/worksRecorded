import { normalizeZtcProjectName } from "@/flows/ztc-production/lib/ztc-project-name";

describe("normalizeZtcProjectName", () => {
  it("lowercases incoming project names", () => {
    expect(normalizeZtcProjectName("Zemgales Prospekts 11 (ZP)")).toBe(
      "zemgales prospekts 11 (zp)",
    );
  });

  it("normalizes whitespace around parentheses", () => {
    expect(normalizeZtcProjectName("Zemgales Prospekts 11( ZP )")).toBe(
      "zemgales prospekts 11 (zp)",
    );
  });

  it("replaces every comma with a dot", () => {
    expect(normalizeZtcProjectName("Rīga, centrs, 2 (RC)")).toBe(
      "rīga. centrs. 2 (rc)",
    );
  });
});
