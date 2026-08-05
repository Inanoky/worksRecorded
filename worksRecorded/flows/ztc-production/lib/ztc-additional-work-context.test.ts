import {
  attachZtcAdditionalWorkContext,
  isZtcAdditionalWorkAttachedToDrawing,
  readZtcAdditionalWorkContext,
  resolveZtcAdditionalWorkOrigin,
  shouldAttachZtcAdditionalWorkToElement,
  type ZtcAdditionalWorkContext,
} from "@/flows/ztc-production/lib/ztc-additional-work-context";

describe("resolveZtcAdditionalWorkOrigin", () => {
  it.each([
    [null, "standalone"],
    [
      { hasDrawingContext: false, hasStartedWork: false, isPaused: false },
      "standalone",
    ],
    [
      { hasDrawingContext: true, hasStartedWork: false, isPaused: false },
      "fresh_drawing",
    ],
    [
      { hasDrawingContext: true, hasStartedWork: true, isPaused: false },
      "active_drawing",
    ],
    [
      { hasDrawingContext: true, hasStartedWork: true, isPaused: true },
      "paused_drawing",
    ],
  ] as const)("resolves %p to %s", (state, expected) => {
    expect(resolveZtcAdditionalWorkOrigin(state)).toBe(expected);
  });
});

describe("shouldAttachZtcAdditionalWorkToElement", () => {
  const context: ZtcAdditionalWorkContext = {
    origin: "fresh_drawing",
    parentSessionId: null,
    parentWork: null,
    parentProject: "Project RD",
    parentElement: "2S-08",
  };

  it("requires the Darba likmes element checkbox", () => {
    expect(
      shouldAttachZtcAdditionalWorkToElement({
        context,
        relatesToElement: false,
        elementName: "2S-08",
      }),
    ).toBe(false);
    expect(
      shouldAttachZtcAdditionalWorkToElement({
        context,
        relatesToElement: true,
        elementName: "2S-08",
      }),
    ).toBe(true);
  });

  it("does not attach standalone or elementless work", () => {
    expect(
      shouldAttachZtcAdditionalWorkToElement({
        context: { ...context, origin: "standalone" },
        relatesToElement: true,
        elementName: "2S-08",
      }),
    ).toBe(false);
    expect(
      shouldAttachZtcAdditionalWorkToElement({
        context,
        relatesToElement: true,
        elementName: null,
      }),
    ).toBe(false);
  });
});

describe("ZTC additional work metadata", () => {
  const context: ZtcAdditionalWorkContext = {
    origin: "active_drawing",
    parentSessionId: "parent-1",
    parentWork: "TL - Koka karkass",
    parentProject: "Project RD",
    parentElement: "2S-08",
  };

  it("preserves drawing metadata and stores the transition context", () => {
    const metadata = attachZtcAdditionalWorkContext(
      JSON.stringify({
        type: "ztc_drawing_context",
        version: 1,
        projectName: "Project RD",
        elements: [],
      }),
      context,
    );

    expect(JSON.parse(metadata)).toMatchObject({
      type: "ztc_drawing_context",
      projectName: "Project RD",
      additionalWorkContext: context,
    });
    expect(readZtcAdditionalWorkContext(metadata)).toEqual(context);
    expect(isZtcAdditionalWorkAttachedToDrawing(context)).toBe(true);
  });

  it("stores standalone context without creating drawing metadata", () => {
    const standalone = { ...context, origin: "paused_drawing" as const };
    const metadata = attachZtcAdditionalWorkContext(null, standalone);

    expect(JSON.parse(metadata)).toMatchObject({
      type: "ztc_additional_work_context",
      additionalWorkContext: standalone,
    });
    expect(readZtcAdditionalWorkContext(metadata)).toEqual(standalone);
    expect(isZtcAdditionalWorkAttachedToDrawing(standalone)).toBe(false);
  });
});
