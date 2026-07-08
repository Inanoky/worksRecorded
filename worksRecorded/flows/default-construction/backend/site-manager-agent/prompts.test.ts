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
import { getUserFirstNameById } from "@/server/actions/whatsapp-actions";
import { systemPromptFunction } from "./prompts";

describe("site-manager BIS routing prompt", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getConfig as jest.Mock).mockResolvedValue(null);
    (getUserFirstNameById as jest.Mock).mockResolvedValue("Deivids");
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
});
