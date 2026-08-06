import { hasSiteDiaryDisplayableMedia } from "@/components/sitediary/siteDiaryMediaDisplay";

describe("hasSiteDiaryDisplayableMedia", () => {
  it("hides media affordance when a day has no displayable photos or audio", () => {
    expect(
      hasSiteDiaryDisplayableMedia({
        photoCount: undefined,
        rows: [{ originalAudioUrl: null }, { originalAudioUrl: "" }],
      }),
    ).toBe(false);
  });

  it("shows media affordance when a day has filtered progress photos", () => {
    expect(
      hasSiteDiaryDisplayableMedia({
        photoCount: 1,
        rows: [],
      }),
    ).toBe(true);
  });

  it("shows media affordance when a day has persisted audio", () => {
    expect(
      hasSiteDiaryDisplayableMedia({
        photoCount: 0,
        rows: [{ originalAudioUrl: " https://ut.test/voice.ogg " }],
      }),
    ).toBe(true);
  });
});
