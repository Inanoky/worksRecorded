import {
  getRandomSiteManagerProcessingAcknowledgement,
  siteManagerProcessingAcknowledgements,
} from "@/flows/default-construction/backend/site-manager-acknowledgements";

describe("site manager acknowledgements", () => {
  const originalRandom = Math.random;

  afterEach(() => {
    Math.random = originalRandom;
    jest.resetModules();
  });

  it("returns every acknowledgement once before reusing messages", async () => {
    Math.random = jest.fn(() => 0);
    jest.resetModules();
    const mod = await import("@/flows/default-construction/backend/site-manager-acknowledgements");

    const firstCycle = Array.from(
      { length: mod.siteManagerProcessingAcknowledgements.length },
      () => mod.getRandomSiteManagerProcessingAcknowledgement()
    );

    expect(new Set(firstCycle)).toEqual(new Set(mod.siteManagerProcessingAcknowledgements));
  });

  it("does not repeat the previous acknowledgement when a new shuffle starts", async () => {
    Math.random = jest.fn(() => 0);
    jest.resetModules();
    const mod = await import("@/flows/default-construction/backend/site-manager-acknowledgements");

    const firstCycle = Array.from(
      { length: mod.siteManagerProcessingAcknowledgements.length },
      () => mod.getRandomSiteManagerProcessingAcknowledgement()
    );
    const next = mod.getRandomSiteManagerProcessingAcknowledgement();

    expect(next).not.toBe(firstCycle[firstCycle.length - 1]);
  });

  it("keeps exported messages in the picker output", () => {
    const picked = getRandomSiteManagerProcessingAcknowledgement();

    expect(siteManagerProcessingAcknowledgements).toContain(picked);
  });
});
