import { runWithWhatsappSourceContext } from "@/server/ai-flows/agents/whatsapp-agent/whatsappSourceContext";
import { processDiaryIntake } from "./diary-intake";
import { withDiaryIntakePilot } from "./diary-intake-dispatch";
import { prepareDiaryReviewScope } from "./diary-review-queue";

jest.mock("./diary-intake", () => ({ processDiaryIntake: jest.fn() }));
jest.mock("./diary-review-queue", () => ({
  prepareDiaryReviewScope: jest.fn(),
}));
const scope = {
  siteId: "site",
  userId: "user",
  organizationId: "org",
  senderPhone: "37120000001",
  sourceMessageId: "message",
};
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(prepareDiaryReviewScope).mockResolvedValue(scope);
  jest.mocked(processDiaryIntake).mockResolvedValue("Jaunais aģents");
});
it("sends the original message immediately to the SDK pilot and never invokes the old agent", async () => {
  const legacy = jest.fn();
  expect(
    await runWithWhatsappSourceContext(
      { senderPhone: "37120000001", messageId: "message" },
      () =>
        withDiaryIntakePilot(legacy)(
          "Betonēti 12 m3",
          "site",
          "user",
          "https://example.com/audio",
        ),
    ),
  ).toBe("Jaunais aģents");
  expect(prepareDiaryReviewScope).toHaveBeenCalledWith(
    expect.objectContaining({
      senderPhone: "37120000001",
      sourceMessageId: "message",
      siteId: "site",
      userId: "user",
    }),
  );
  expect(processDiaryIntake).toHaveBeenCalledWith(
    scope,
    "Betonēti 12 m3",
    "https://example.com/audio",
    undefined,
  );
  expect(legacy).not.toHaveBeenCalled();
});
it("keeps non-pilot traffic on the unchanged old agent", async () => {
  jest.mocked(prepareDiaryReviewScope).mockResolvedValue(null);
  const legacy = jest.fn().mockResolvedValue("Vecais aģents");
  expect(await withDiaryIntakePilot(legacy)("Ziņa", "other", "user")).toBe(
    "Vecais aģents",
  );
  expect(processDiaryIntake).not.toHaveBeenCalled();
});
it("never falls back to the old agent after a pilot failure", async () => {
  jest.mocked(processDiaryIntake).mockRejectedValue(new Error("failed"));
  const legacy = jest.fn();
  await expect(
    withDiaryIntakePilot(legacy)("Ziņa", "site", "user"),
  ).rejects.toThrow("failed");
  expect(legacy).not.toHaveBeenCalled();
});
