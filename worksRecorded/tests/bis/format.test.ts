import { describe, expect, test } from "bun:test";
import { formatBisCaseLabel, normalizeBisCase } from "@/lib/bis/format";
import { readBisSiteSettings, writeBisSiteSettings } from "@/lib/bis/site-settings";

describe("BIS helpers", () => {
  test("formats case labels consistently", () => {
    expect(formatBisCaseLabel({ caseNumber: "BIS-1", constructionName: "Office", stageName: "Works" })).toBe("BIS-1 • Office • Works");
  });

  test("normalizes BIS case payloads", () => {
    expect(normalizeBisCase({ id: 12, attributes: { case_number: "BIS-12", construction_name: "Tower", stage_name: "Draft" } })).toEqual({
      id: "12",
      caseNumber: "BIS-12",
      constructionName: "Tower",
      stageName: "Draft",
      label: "BIS-12 • Tower • Draft",
    });
  });

  test("persists BIS site settings inside siteDiaryRecordsMap", () => {
    const next = writeBisSiteSettings({ some: "value" }, { selectedCaseId: "321", selectedCaseLabel: "BIS-321 • Demo" });
    expect(readBisSiteSettings(next)).toEqual({ selectedCaseId: "321", selectedCaseLabel: "BIS-321 • Demo" });
  });
});
