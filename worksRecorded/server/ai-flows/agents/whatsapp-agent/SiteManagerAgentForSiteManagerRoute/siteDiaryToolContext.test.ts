import {
  getSiteDiaryToolContext,
  runWithSiteDiaryToolContext,
} from "./siteDiaryToolContext";

describe("site diary tool context", () => {
  it("keeps trusted values across asynchronous tool execution", async () => {
    expect(getSiteDiaryToolContext()).toBeUndefined();

    await runWithSiteDiaryToolContext(
      {
        userId: "user-1",
        siteId: "site-1",
        originalUserComment: "Original message",
      },
      async () => {
        await Promise.resolve();
        expect(getSiteDiaryToolContext()).toEqual({
          userId: "user-1",
          siteId: "site-1",
          originalUserComment: "Original message",
        });
      },
    );

    expect(getSiteDiaryToolContext()).toBeUndefined();
  });

  it("isolates trusted values across concurrent asynchronous runs", async () => {
    let releaseFirst!: () => void;
    const firstCanFinish = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });

    const first = runWithSiteDiaryToolContext(
      {
        userId: "user-1",
        siteId: "site-1",
        originalUserComment: "First message",
      },
      async () => {
        await firstCanFinish;
        return getSiteDiaryToolContext();
      },
    );

    const second = runWithSiteDiaryToolContext(
      {
        userId: "user-2",
        siteId: "site-2",
        originalUserComment: "Second message",
      },
      async () => {
        await Promise.resolve();
        const context = getSiteDiaryToolContext();
        releaseFirst();
        return context;
      },
    );

    await expect(Promise.all([first, second])).resolves.toEqual([
      {
        userId: "user-1",
        siteId: "site-1",
        originalUserComment: "First message",
      },
      {
        userId: "user-2",
        siteId: "site-2",
        originalUserComment: "Second message",
      },
    ]);
    expect(getSiteDiaryToolContext()).toBeUndefined();
  });

  it("clears trusted values after an asynchronous failure", async () => {
    await expect(
      runWithSiteDiaryToolContext(
        {
          userId: "user-1",
          siteId: "site-1",
          originalUserComment: "Original message",
        },
        async () => {
          expect(getSiteDiaryToolContext()?.siteId).toBe("site-1");
          throw new Error("tool failed");
        },
      ),
    ).rejects.toThrow("tool failed");

    expect(getSiteDiaryToolContext()).toBeUndefined();
  });
});
