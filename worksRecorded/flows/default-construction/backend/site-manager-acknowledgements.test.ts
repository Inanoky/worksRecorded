import {
  getRandomSiteManagerProcessingAcknowledgement,
  getSiteManagerPhotoSaveSummary,
  getSiteManagerPhotoSavingAcknowledgement,
  siteManagerProcessingAcknowledgements,
} from "@/flows/default-construction/backend/site-manager-acknowledgements";

describe("site manager acknowledgements", () => {
  const originalRandom = Math.random;
  const languages = ["en", "lv"] as const;

  afterEach(() => {
    Math.random = originalRandom;
    jest.resetModules();
  });

  it.each(languages)(
    "returns every %s acknowledgement once before reusing messages",
    async (language) => {
      Math.random = jest.fn(() => 0);
      jest.resetModules();
      const mod = await import(
        "@/flows/default-construction/backend/site-manager-acknowledgements"
      );
      const messages = mod.siteManagerProcessingAcknowledgements[language];

      const firstCycle = Array.from({ length: messages.length }, () =>
        mod.getRandomSiteManagerProcessingAcknowledgement(language),
      );

      expect(new Set(firstCycle)).toEqual(new Set(messages));
    },
  );

  it.each(languages)(
    "does not repeat the previous %s acknowledgement when a new shuffle starts",
    async (language) => {
      Math.random = jest.fn(() => 0);
      jest.resetModules();
      const mod = await import(
        "@/flows/default-construction/backend/site-manager-acknowledgements"
      );
      const messages = mod.siteManagerProcessingAcknowledgements[language];

      const firstCycle = Array.from({ length: messages.length }, () =>
        mod.getRandomSiteManagerProcessingAcknowledgement(language),
      );
      const next = mod.getRandomSiteManagerProcessingAcknowledgement(language);

      expect(next).not.toBe(firstCycle[firstCycle.length - 1]);
    },
  );

  it.each(languages)("uses the requested %s language", (language) => {
    const picked = getRandomSiteManagerProcessingAcknowledgement(language);

    expect(siteManagerProcessingAcknowledgements[language]).toContain(picked);
  });

  it("falls back to English for missing or unsupported languages", () => {
    expect(siteManagerProcessingAcknowledgements.en).toContain(
      getRandomSiteManagerProcessingAcknowledgement(),
    );
    expect(siteManagerProcessingAcknowledgements.en).toContain(
      getRandomSiteManagerProcessingAcknowledgement("de"),
    );
  });

  it("localizes the photo-saving acknowledgement", () => {
    expect(getSiteManagerPhotoSavingAcknowledgement("lv")).toContain(
      "Saglabāju attēlus",
    );
    expect(getSiteManagerPhotoSavingAcknowledgement("en")).toContain(
      "Saving pictures",
    );
  });

  it("localizes the final saved-photo count", () => {
    expect(getSiteManagerPhotoSaveSummary(8, 8, "lv")).toBe(
      "✅ Saglabāti 8/8 attēli.",
    );
    expect(getSiteManagerPhotoSaveSummary(7, 8, "en")).toBe(
      "✅ 7/8 pictures saved.",
    );
  });
});
