import { drawingLogText, drawingRejectionReasons, summarizeDrawingExtraction } from "./ztc-drawing-diagnostics";
import { validateZtcDrawingProjectCode } from "./ztc-drawing-project-code";

const drawing = { projectName: "AM extra text", elementName: "1R1", totalAreaM2: 12.86, isConstructionDrawing: true, hasReadableProjectName: true, hasReadableElementName: true, hasReadableWorkList: true, qualityOk: true, workList: ["TL - Koka karkass"], workItems: [], issue: null };

it("retains the raw project result separately from the validator rejection", () => {
  const raw = summarizeDrawingExtraction(drawing);
  const validated = validateZtcDrawingProjectCode(drawing);
  expect(raw.projectName).toBe("AM extra text");
  expect(raw.qualityOk).toBe(true);
  expect(summarizeDrawingExtraction(validated).projectName).toBeNull();
  expect(drawingRejectionReasons(validated)).toEqual(["quality_not_ok", "project_not_readable", "missing_project_name"]);
});

it("reports no rejection for a readable two-letter drawing", () => {
  expect(drawingRejectionReasons({ ...drawing, projectName: "AM" })).toEqual([]);
});

it("preserves the model issue and logs only selected bounded fields", () => {
  const summary = summarizeDrawingExtraction({ ...drawing, issue: "Blurry corner", projectName: "A".repeat(1000), image: "private-image" });
  expect(summary.issue).toBe("Blurry corner");
  expect(summary.projectName).toHaveLength(300);
  expect(summary).not.toHaveProperty("image");
});

it("handles malformed results and strips image data, URLs and credentials", () => {
  expect(summarizeDrawingExtraction(null).projectName).toBeNull();
  expect(drawingLogText("https://host/path?token=secret Bearer secret sk-secret data:image/jpeg;base64,secret")).not.toContain("secret");
});
