import {
  consumeWhatsappAudioSourceContext,
  getWhatsappSourceContext,
  runWithWhatsappSourceContext,
} from "@/server/ai-flows/agents/whatsapp-agent/whatsappSourceContext";
import { reviewPilotConfig } from "@/test/fixtures/diary-review";
import {
  diaryReviewPilotAllowsSender,
  diaryReviewPilotAllowsUser,
  diaryReviewSourceMetadata,
  getDiaryReviewPilot,
  normalizeDiaryReviewPhone,
} from "./diary-review-pilot";

it.each(["+37120000001", "37120000001", "whatsapp:+37120000001"])(
  "recognizes the same E164 sender in %s",
  (phone) => {
    expect(
      diaryReviewPilotAllowsSender(
        getDiaryReviewPilot(reviewPilotConfig()),
        "user",
        phone,
      ),
    ).toBe(true);
  },
);

it.each([null, "", "bsuid.37120000001", "371200000010000001", "+37120000000"])(
  "does not permit an unknown or different sender: %s",
  (phone) => {
    expect(
      diaryReviewPilotAllowsSender(
        getDiaryReviewPilot(reviewPilotConfig()),
        "user",
        phone,
      ),
    ).toBe(false);
  },
);

it("requires both project enrollment and the enrolled user", () => {
  expect(getDiaryReviewPilot({})).toBeNull();
  expect(diaryReviewPilotAllowsSender(null, "user", "37120000001")).toBe(false);
  expect(
    diaryReviewPilotAllowsSender(
      getDiaryReviewPilot(reviewPilotConfig()),
      "other-user",
      "37120000001",
    ),
  ).toBe(false);
  expect(
    diaryReviewPilotAllowsUser(
      getDiaryReviewPilot(reviewPilotConfig()),
      "other-user",
    ),
  ).toBe(false);
});

it("does not treat malformed numeric identities as phone numbers", () => {
  expect(normalizeDiaryReviewPhone("phone37120000001")).toBeNull();
});

it("removes caller-supplied sender provenance unless trusted WhatsApp context supplies it", () => {
  const forged = {
    isEval: true,
    diaryReviewSource: { senderPhone: "37120000001" },
  };
  expect(diaryReviewSourceMetadata(forged)).toEqual({ isEval: true });
  expect(
    diaryReviewSourceMetadata(forged, {
      senderPhone: "37120000001",
      sourceMessageId: "wamid.trusted",
    }),
  ).toEqual({
    isEval: true,
    diaryReviewSource: {
      channel: "whatsapp",
      senderPhone: "37120000001",
      messageId: "wamid.trusted",
    },
  });
});

it("preserves the webhook sender through nested audio and image contexts without leaking between messages", async () => {
  await runWithWhatsappSourceContext(
    { senderPhone: "37120000001", messageId: "original" },
    async () => {
      await runWithWhatsappSourceContext(
        {
          messageType: "audio",
          originalAudioUrl: "https://example.test/audio",
        },
        async () => {
          consumeWhatsappAudioSourceContext();
          expect(getWhatsappSourceContext().senderPhone).toBe("37120000001");
        },
      );
      expect(getWhatsappSourceContext().messageType).toBeUndefined();
    },
  );
  expect(getWhatsappSourceContext().senderPhone).toBeUndefined();
});
