import { attachZtcAdditionalWorkContext } from "@/flows/ztc-production/lib/ztc-additional-work-context";
import { selectLatestReusableZtcDrawingContext } from "@/flows/ztc-production/lib/ztc-drawing-context-selection";
import { ZTC_DRAWING_CONTEXT_SUPERSEDED_PREFIX } from "@/flows/ztc-production/lib/ztc-session-markers";

function drawingMetadata() {
  return JSON.stringify({
    type: "ztc_drawing_context",
    projectName: "Project RD",
    elements: [],
  });
}

describe("selectLatestReusableZtcDrawingContext", () => {
  it("stops at a superseded context instead of falling through to an older drawing", () => {
    const olderDrawing = {
      id: "older-zp",
      Location: "Project ZP",
      Comments_Custom_2: drawingMetadata(),
    };

    expect(
      selectLatestReusableZtcDrawingContext([
        {
          id: "superseded-rd",
          Location: "Project RD",
          Comments_Custom_1: `${ZTC_DRAWING_CONTEXT_SUPERSEDED_PREFIX} timestamp`,
          Comments_Custom_2: drawingMetadata(),
        },
        olderDrawing,
      ]),
    ).toBeNull();
  });

  it("reuses drawing metadata carried by fresh attached additional work", () => {
    const freshAdditional = {
      id: "fresh-additional",
      Location: "Project RD",
      Works_Custom_1: "Papilddarbi",
      Comments_Custom_2: attachZtcAdditionalWorkContext(drawingMetadata(), {
        origin: "fresh_drawing",
        parentSessionId: null,
        parentWork: null,
        parentProject: "Project RD",
        parentElement: "2S-08",
      }),
    };

    expect(selectLatestReusableZtcDrawingContext([freshAdditional])).toBe(
      freshAdditional,
    );
  });

  it("skips an active interruption record and returns its drawing parent", () => {
    const parent = {
      id: "drawing-parent",
      Location: "Project RD",
      Comments_Custom_2: drawingMetadata(),
    };
    const activeAdditional = {
      id: "active-additional",
      Location: "Project RD",
      Works_Custom_1: "Papilddarbi",
      Comments_Custom_2: attachZtcAdditionalWorkContext(drawingMetadata(), {
        origin: "active_drawing",
        parentSessionId: parent.id,
        parentWork: "R2/T2 - membrane",
        parentProject: "Project RD",
        parentElement: "2S-08",
      }),
    };

    expect(
      selectLatestReusableZtcDrawingContext([activeAdditional, parent]),
    ).toBe(parent);
  });

  it("skips standalone additional work without invalidating the saved drawing", () => {
    const drawing = {
      id: "saved-drawing",
      Location: "Project RD",
      Comments_Custom_2: drawingMetadata(),
    };
    const standaloneAdditional = {
      id: "standalone-additional",
      Location: "Papilddarbi",
      Works_Custom_1: null,
      Comments_Custom_2: attachZtcAdditionalWorkContext(null, {
        origin: "standalone",
        parentSessionId: null,
        parentWork: null,
        parentProject: "Project RD",
        parentElement: "2S-08",
      }),
    };

    expect(
      selectLatestReusableZtcDrawingContext([standaloneAdditional, drawing]),
    ).toBe(drawing);
  });
});
