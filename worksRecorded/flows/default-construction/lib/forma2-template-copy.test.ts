import { reviewSnapshot } from "@/test/fixtures/diary-review";
import { prepareForma2TemplateCopy } from "./forma2-template-copy";

const clone = globalThis.structuredClone;
beforeAll(() => {
  globalThis.structuredClone = <T>(value: T) =>
    JSON.parse(JSON.stringify(value)) as T;
});
afterAll(() => {
  globalThis.structuredClone = clone;
});
function args() {
  return {
    sourceSiteId: "source",
    sourceRoot: {
      defaultConstructionForma2: {
        version: 1,
        document: {
          id: "source-doc",
          positions: reviewSnapshot().positions,
          fileName: "tame.xlsx",
          sheetName: "Tāme",
          importedAt: "old",
        },
        allocations: [
          {
            sourceId: "customer-record",
            sourceType: "work",
            positionId: "concrete",
            method: "manual",
          },
        ],
        materialRules: [],
      },
    },
    targetRoot: { unrelated: { preserved: true } },
    targetConfig: {
      otherSettings: { untouched: true },
      Works: { DropDownOptions: { one: "Existing work" } },
    },
    documentId: "new-doc",
    copiedAt: "2026-11-16",
    pilotPhone: "+37120000001",
    pilotUserId: "owner",
  };
}

it("copies estimate positions without copying source customer allocations or changing the source", () => {
  const input = args();
  const original = JSON.stringify(input.sourceRoot);
  const plan = prepareForma2TemplateCopy(input);
  expect(plan.positions).toBe(1);
  expect(plan.root.unrelated).toEqual({ preserved: true });
  expect(plan.root.defaultConstructionForma2).toMatchObject({
    document: { id: "new-doc" },
    allocations: [],
    materialRules: [],
  });
  expect(JSON.stringify(input.sourceRoot)).toBe(original);
  expect(plan.config.otherSettings.constructionDiaryReviewPilot).toEqual({
    enabled: true,
    allowedSenderPhones: ["37120000001"],
    allowedUserIds: ["owner"],
  });
  expect(plan.config.otherSettings.untouched).toBe(true);
  expect(Object.values(plan.config.Works.DropDownOptions)).toContain(
    "Existing work",
  );
});

it("refuses to overwrite an existing target estimate", () => {
  const input = args();
  expect(() =>
    prepareForma2TemplateCopy({ ...input, targetRoot: input.sourceRoot }),
  ).toThrow("jau ir Forma2");
});

it("does not enroll a pilot without a valid phone", () => {
  expect(() =>
    prepareForma2TemplateCopy({ ...args(), pilotPhone: "bsuid.123" }),
  ).toThrow("Nederīgs");
});
