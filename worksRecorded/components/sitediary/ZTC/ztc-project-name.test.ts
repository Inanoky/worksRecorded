import { normalizeZtcProjectName } from "@/components/sitediary/ZTC/ztc-project-name";

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
});
