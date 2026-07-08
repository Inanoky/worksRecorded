import {
  getUserAddressName,
  shouldSampleUserAddress,
  toLatvianVocative,
  vocativeOverrides,
} from "./nameAddressing";

describe("site-manager user name addressing", () => {
  it.each([
    ["Deivids", "Deivid"],
    ["Kaspars", "Kaspar"],
    ["Jānis", "Jāni"],
    ["Mārtiņš", "Mārtiņ"],
    ["Markus", "Marku"],
    ["Gatis", "Gati"],
  ])("converts Latvian masculine name %s to vocative %s", (name, expected) => {
    expect(getUserAddressName(name, "lv")).toBe(expected);
  });

  it.each(["Anna", "Ilze", "Kristīne", "Inese", "Dace", "Ivo", "Noa"])("leaves women's and non-declining name %s unchanged", (name) => {
    expect(getUserAddressName(name, "lv")).toBe(name);
  });

  it("keeps unsupported final-s and final-š names unchanged", () => {
    expect(toLatvianVocative("James")).toBe("James");
    expect(toLatvianVocative("Tomaš")).toBe("Tomaš");
  });

  it("exposes explicit overrides for safely extending known names", () => {
    expect(vocativeOverrides.Deivids).toBe("Deivid");
    expect(vocativeOverrides.Kaspars).toBe("Kaspar");
  });

  it("uses the canonical trimmed name outside Latvian", () => {
    expect(getUserAddressName("  Deivids  ", "en")).toBe("Deivids");
    expect(getUserAddressName("  Deivids  ", "ru")).toBe("Deivids");
  });

  it("returns null when no usable name exists", () => {
    expect(getUserAddressName(null, "lv")).toBeNull();
    expect(getUserAddressName("   ", "lv")).toBeNull();
  });

  it("selects a stable approximate one-in-three sample from message IDs", () => {
    const ids = Array.from({ length: 300 }, (_, index) => `wamid.${index}`);
    const selected = ids.filter(shouldSampleUserAddress);

    expect(selected.length).toBeGreaterThanOrEqual(80);
    expect(selected.length).toBeLessThanOrEqual(120);
    expect(ids.map(shouldSampleUserAddress)).toEqual(ids.map(shouldSampleUserAddress));
    expect(shouldSampleUserAddress(null)).toBe(false);
  });
});
