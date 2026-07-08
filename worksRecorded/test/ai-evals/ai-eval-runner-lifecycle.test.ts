import { runWithLangSmithTraceFlush } from "./ai-eval-runner-lifecycle";

describe("AI eval runner lifecycle", () => {
  it("flushes pending traces after a successful run", async () => {
    const flush = jest.fn().mockResolvedValue(undefined);

    await expect(
      runWithLangSmithTraceFlush(async () => "complete", flush),
    ).resolves.toBe("complete");
    expect(flush).toHaveBeenCalledTimes(1);
  });

  it("flushes pending traces and preserves the error after a failed run", async () => {
    const flush = jest.fn().mockResolvedValue(undefined);
    const error = new Error("eval failed");

    await expect(
      runWithLangSmithTraceFlush(async () => {
        throw error;
      }, flush),
    ).rejects.toBe(error);
    expect(flush).toHaveBeenCalledTimes(1);
  });
});
