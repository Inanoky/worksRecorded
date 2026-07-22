import {
  ZTC_OPENAI_MODEL,
  ZTC_OPENAI_REASONING_EFFORT,
  ZTC_TRANSCRIPTION_MODEL,
} from "./openai-config";

describe("ZTC OpenAI configuration", () => {
  it("uses GPT-5.6 Terra with medium reasoning for generative calls", () => {
    expect(ZTC_OPENAI_MODEL).toBe("gpt-5.6-terra");
    expect(ZTC_OPENAI_REASONING_EFFORT).toBe("medium");
  });

  it("keeps speech recognition on a transcription-capable model", () => {
    expect(ZTC_TRANSCRIPTION_MODEL).toBe("gpt-4o-transcribe");
  });
});
