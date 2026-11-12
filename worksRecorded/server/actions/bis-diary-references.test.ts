jest.mock("@/lib/bis/client", () => ({ bisClient: jest.fn() }));

import { bisClient } from "@/lib/bis/client";
import { getBisDiaryReferences, validateBisDiaryReferences } from "./bis-diary-references";

const list = jest.fn();
let userId: string;
let round: string;
let caseId: string;

beforeEach(() => {
  jest.clearAllMocks(); userId = crypto.randomUUID(); round = "42"; caseId = "999";
  jest.mocked(bisClient).mockImplementation(async () => ({ userId, base: "https://bis.gov.lv", site: { bisConstructionRoundId: round }, bisCaseId: caseId, list }) as any);
  list.mockImplementation(async (path: string) => path === "project" ? [{ id: "123", attributes: { name: "Plāns", drawing_design: "BK", revision: "1" } }] : [
    { id: "100", attributes: { type: "group", description: "Grupa" } },
    { id: "101", attributes: { type: "element", position_number: "1.1", description: "Global" } },
    { id: "102", attributes: { type: "element", position_number: "1.2", description: "Current", related_case_construction_round_ids: [42] } },
    { id: "103", attributes: { type: "element", description: "Other", case_construction_round_id: 43 } },
  ]);
});

test("reuses preloaded lists but authenticates every request", async () => {
  const first = await getBisDiaryReferences("site");
  expect(first.estimates.map((item) => item.id)).toEqual(["101", "102"]);
  expect(first.drawings[0]).toMatchObject({ id: "123", label: "BK · Plāns · rev. 1" });
  expect(await getBisDiaryReferences("site")).toBe(first);
  expect(list).toHaveBeenCalledTimes(2);
  expect(bisClient).toHaveBeenCalledTimes(2);
  await getBisDiaryReferences("site", true);
  expect(list).toHaveBeenCalledTimes(4);
});

test("isolates cached lists by account, case, site and round", async () => {
  await getBisDiaryReferences("site");
  userId = "another"; await getBisDiaryReferences("site");
  caseId = "888"; await getBisDiaryReferences("site");
  round = "43"; await getBisDiaryReferences("site");
  await getBisDiaryReferences("other-site");
  expect(list).toHaveBeenCalledTimes(10);
});

test("does not cache failures or accept an estimate from another round", async () => {
  list.mockRejectedValueOnce(new Error("BIS unavailable"));
  await expect(getBisDiaryReferences("site")).rejects.toThrow("unavailable");
  const next = await getBisDiaryReferences("site");
  expect(next.drawings).toHaveLength(1);
  await expect(validateBisDiaryReferences("site", { estimatePositionId: "103" })).rejects.toThrow("Tāmes pozīcija");
});
