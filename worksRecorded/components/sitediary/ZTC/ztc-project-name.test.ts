import {
  findCanonicalZtcProjectName,
  getZtcProjectNameKey,
} from "@/components/sitediary/ZTC/ztc-project-name";

describe("ZTC project name canonicalization", () => {
  it("uses the same identity key for casing-only variants", () => {
    expect(getZtcProjectNameKey("Zemgales prospekts 11 (ZP)")).toBe(
      getZtcProjectNameKey("Zemgales Prospekts 11 (ZP)"),
    );
  });

  it("normalizes whitespace around parentheses", () => {
    expect(getZtcProjectNameKey("Zemgales Prospekts 11( ZP )")).toBe(
      getZtcProjectNameKey("Zemgales Prospekts 11 (ZP)"),
    );
  });

  it("returns the configured display spelling for a normalized match", () => {
    expect(
      findCanonicalZtcProjectName("Zemgales prospekts 11 (ZP)", [
        "Zemgales Prospekts 11 (ZP)",
      ]),
    ).toBe("Zemgales Prospekts 11 (ZP)");
  });
});
