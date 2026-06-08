import {
  getPhoneDigits,
  normalizeInternationalPhoneForWhatsApp,
  requireInternationalPhoneForWhatsApp,
} from "./international-phone";

describe("international phone normalization", () => {
  it("strips formatting before validating", () => {
    expect(getPhoneDigits("+371 (24) 885-690")).toBe("37124885690");
  });

  it("accepts international numbers with optional plus and formatting", () => {
    expect(normalizeInternationalPhoneForWhatsApp("37124885690")).toBe("37124885690");
    expect(normalizeInternationalPhoneForWhatsApp("+371 24885690")).toBe("37124885690");
    expect(normalizeInternationalPhoneForWhatsApp("+370 61234567")).toBe("37061234567");
    expect(normalizeInternationalPhoneForWhatsApp("+372 51234567")).toBe("37251234567");
    expect(normalizeInternationalPhoneForWhatsApp("+44 7700 900123")).toBe("447700900123");
  });

  it("rejects local-only and invalid country-code numbers", () => {
    expect(normalizeInternationalPhoneForWhatsApp("24885690")).toBeNull();
    expect(normalizeInternationalPhoneForWhatsApp("+012345678")).toBeNull();
    expect(normalizeInternationalPhoneForWhatsApp("")).toBeNull();
  });

  it("rejects numbers outside international length limits", () => {
    expect(normalizeInternationalPhoneForWhatsApp("12345678")).toBeNull();
    expect(normalizeInternationalPhoneForWhatsApp("1234567890123456")).toBeNull();
  });

  it("throws a validation message when required phone is invalid", () => {
    expect(() =>
      requireInternationalPhoneForWhatsApp("24885690", "Custom phone validation message"),
    ).toThrow("Custom phone validation message");
  });
});
