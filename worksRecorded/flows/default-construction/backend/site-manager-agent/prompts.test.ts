jest.mock("@/server/actions/site-diary-actions", () => ({
  getConfig: jest.fn(),
}));

jest.mock("@/server/actions/whatsapp-actions", () => ({
  getUserFirstNameById: jest.fn(),
}));

jest.mock("@/server/actions/shared-actions", () => ({
  getOrganizationLanguageByUserId: jest.fn(),
}));

import { getConfig } from "@/server/actions/site-diary-actions";
import { getOrganizationLanguageByUserId } from "@/server/actions/shared-actions";
import { getUserFirstNameById } from "@/server/actions/whatsapp-actions";
import {
  systemPromptFunction,
  systemPromptSaveToDatabaseFunction,
} from "./prompts";

describe("site-manager BIS routing prompt", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getConfig as jest.Mock).mockResolvedValue(null);
    (getUserFirstNameById as jest.Mock).mockResolvedValue("Deivids");
    (getOrganizationLanguageByUserId as jest.Mock).mockResolvedValue("Latvian");
  });

  it("provides canonical and Latvian greeting-only address names", async () => {
    const prompt = await systemPromptFunction("site-1", "user-1");

    expect(prompt).toContain("The user's first name is Deivids");
    expect(prompt).toContain("In Latvian greetings use the vocative form Deivid");
    expect(prompt).toContain("Do not repeat the user's name in ordinary answers or save confirmations");
  });

  it("routes BIS questions and contextual follow-ups to direct read tools", async () => {
    const prompt = await systemPromptFunction("site-1", "user-1");

    expect(prompt).toContain("only a BIS connection, setup, eligibility, or submission question");
    expect(prompt).toContain('contextual follow-up such as "how do I connect it?"');
    expect(prompt).toContain("call get_bis_connection_status");
    expect(prompt).toContain("without saving a diary record");
    expect(prompt).toContain("read_bis_material_records");
    expect(prompt).toContain("read_site_diary_bis_statuses");
  });

  it("requires mixed work-and-BIS messages to save work and delegate guidance separately", async () => {
    const prompt = await systemPromptFunction("site-1", "user-1");

    expect(prompt).toContain("always call save_to_database for that work");
    expect(prompt).toContain("reply in 1-2 sentences");
    expect(prompt).toContain("First confirm what was saved in WorksRecorded");
    expect(prompt).toContain("Pievieno BIS sistēmā, ka šodien iztīrījām telpu");
    expect(prompt).toContain('Say "saved work records are eligible", not "all messages are eligible"');
  });

  it("preserves direct BIS routing for NoSorting site configurations", async () => {
    (getConfig as jest.Mock).mockResolvedValue({ AIpromptToUse: { Client: "NoSorting" } });

    const prompt = await systemPromptFunction("site-1", "user-1");

    expect(prompt).toContain("Do not save BIS questions");
    expect(prompt).toContain("get_bis_connection_status");
    expect(prompt).toContain("read_bis_material_records");
    expect(prompt).toContain("Confirm the save first");
    expect(prompt).toContain("1-2 sentences");
  });

  it("keeps construction context numbers out of structured amounts", async () => {
    const prompt = await systemPromptSaveToDatabaseFunction("user-1", undefined);

    expect(prompt).toContain("Amounts/Daudzums and Units/Mrv are for completed work quantity only");
    expect(prompt).toContain('"10 sienas" → Amounts: 10, Units: "pcs"');
    expect(prompt).toContain("Do not use apartment numbers, floor numbers, layer counts, worker counts, hours");
    expect(prompt).toContain("Prefer \"45 m2\" completed scope over \"22 mm\" OSB thickness");
    expect(prompt).toContain('"OSB 22 mm, ieklāti 45 m2" → Amounts: 45, Units: "m2"');
    expect(prompt).toContain('"reģipsis 2 kārtās" → Amounts: null, Units: null');
    expect(prompt).toContain('"Dz 6 45m2 vate, osb" → Amounts: 45, Units: "m2"');
    expect(prompt).toContain('"Dz 6, 2 cilvēki, 3h" → Workers: 2, Hours: 3, Amounts: null, Units: null');
    expect(prompt).toContain('"Dz5f durvju aile demontāža" → Amounts: null, Units: null');
  });

  it("counts multi-role worker evidence without inferring a lone operator", async () => {
    const prompt = await systemPromptSaveToDatabaseFunction("user-1", undefined);

    expect(prompt).toContain("Count explicitly listed human roles as Workers");
    expect(prompt).toContain("ekskavatora operators, strādāja arī palīgstrādnieks");
    expect(prompt).toContain("Bobcat operatoru, 9,5 stundas");
    expect(prompt).toContain("should keep Workers null");
  });

  it("keeps start-time conjoined machinery sub-actions in one structured row", async () => {
    const prompt = await systemPromptSaveToDatabaseFunction("user-1", undefined);

    expect(prompt).toContain('"No plkst. 15.00" states a start time, not a duration');
    expect(prompt).toContain("one actor or one machine is performing conjoined in-progress sub-actions");
    expect(prompt).toContain("should be one note/work row with both actions in Comments");
  });
});
