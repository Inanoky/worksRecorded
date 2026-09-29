export function drawingLogText(value: unknown, limit = 300) {
  if (typeof value !== "string") return null;
  return value
    .replace(/data:[^\s"']+/gi, "[image data]")
    .replace(/https?:\/\/[^\s"']+/gi, "[url]")
    .replace(/Bearer\s+\S+|sk-[\w-]+/gi, "[redacted]")
    .slice(0, limit);
}

export function summarizeDrawingExtraction(value: unknown) {
  const row = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return {
    projectName: drawingLogText(row.projectName),
    projectNameType: row.projectName === null ? "null" : typeof row.projectName,
    elementName: drawingLogText(row.elementName),
    totalAreaM2: typeof row.totalAreaM2 === "number" ? row.totalAreaM2 : drawingLogText(row.totalAreaM2, 40),
    isConstructionDrawing: row.isConstructionDrawing === true,
    hasReadableProjectName: row.hasReadableProjectName === true,
    hasReadableElementName: row.hasReadableElementName === true,
    hasReadableWorkList: row.hasReadableWorkList === true,
    qualityOk: row.qualityOk === true,
    workCount: Array.isArray(row.workList) ? row.workList.length : null,
    workItemCount: Array.isArray(row.workItems) ? row.workItems.length : null,
    issue: drawingLogText(row.issue, 600),
  };
}

export function drawingRejectionReasons(value: unknown) {
  const row = summarizeDrawingExtraction(value);
  return [
    !row.isConstructionDrawing && "not_construction_drawing",
    !row.qualityOk && "quality_not_ok",
    !row.hasReadableProjectName && "project_not_readable",
    !row.hasReadableElementName && "element_not_readable",
    !row.hasReadableWorkList && "work_list_not_readable",
    !row.projectName && "missing_project_name",
    !row.elementName && "missing_element_name",
    row.totalAreaM2 == null && "missing_total_area",
    !row.workCount && "empty_work_list",
  ].filter((reason): reason is string => typeof reason === "string");
}
