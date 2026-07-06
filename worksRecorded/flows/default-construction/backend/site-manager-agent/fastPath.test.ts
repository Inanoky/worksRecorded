import {
  detectReplyLanguage,
  formatDeterministicSaveReply,
  formatSavedDiaryRecords,
  isSiteDiaryFastPathCandidate,
  isSaveOnlyToolRound,
  parseSaveToolOutcome,
} from "./fastPath";

describe("site-manager fast path", () => {
  it.each([
    "Šodien apmestas sienas 2 stāvā, 4h",
    "Completed floor installation today, 3 workers",
    "Сегодня установлены двери, 4 часа",
    "Ūdens trubas un radiatori, divpadsmit stundas",
  ])("accepts a self-contained work report: %s", (message) => {
    expect(isSiteDiaryFastPathCandidate(message)).toBe(true);
  });

  it.each([
    "Kā ievadīt BISā ierakstus?",
    "Pievieno BIS sistēmā, ka šodien iztīrījām telpu",
    "Sveiki!",
    "Project",
    "Vai šodien tika pabeigti darbi?",
    "Un kā es to varu pieslēgt?",
  ])("rejects messages requiring the legacy agent: %s", (message) => {
    expect(isSiteDiaryFastPathCandidate(message)).toBe(false);
  });

  it("formats localized success and failure replies", () => {
    expect(formatDeterministicSaveReply("Deivids", "lv", { ok: true, count: 1 }))
      .toBe("Deivids, WorksRecorded saglabāju 1 darbu ierakstu.");
    expect(formatDeterministicSaveReply("Anna", "en", { ok: true, count: 2 }))
      .toBe("Anna, saved 2 work records in WorksRecorded.");
    expect(formatDeterministicSaveReply(null, "ru", { ok: false, count: 0, message: "DB" }))
      .toContain("не удалось сохранить запись: DB");
  });

  it("formats persisted record details without internal fields", () => {
    const reply = formatDeterministicSaveReply("Deivids", "lv", {
      ok: true,
      count: 1,
      records: [{
        Date: "2026-07-06T00:00:00.000Z",
        Works: "Finishing",
        Location: "2. stāvs",
        Comments: "Apmestas sienas.",
        Units: "m2",
        Amounts: 0,
        WorkersInvolved: 2,
        TimeInvolved: 4,
      }],
    });

    expect(reply).toContain("Finishing — 2. stāvs");
    expect(reply).toContain("Apmestas sienas.");
    expect(reply).toContain("Datums: 06.07.2026");
    expect(reply).toContain("Apjoms: 0 m2");
    expect(reply).toContain("Darbinieki: 2");
    expect(reply).toContain("Stundas: 4");
    expect(reply).not.toContain("Record IDs");
  });

  it("formats multiple records as bullet points and caps output at ten", () => {
    const records = Array.from({ length: 12 }, (_, index) => ({
      Works: `Work ${index + 1}`,
    }));
    const formatted = formatSavedDiaryRecords(records, "en");

    expect(formatted).toContain("• Work 1");
    expect(formatted).toContain("• Work 10");
    expect(formatted).not.toContain("• Work 11");
    expect(formatted).not.toContain("1. Work 1");
    expect(formatted).toContain("and 2 more");
  });

  it("truncates long comments", () => {
    const formatted = formatSavedDiaryRecords([{ Comments: "a".repeat(400) }], "en");
    expect(formatted).toContain("…");
    expect(formatted.length).toBeLessThan(350);
  });

  it("parses internal save-tool results without exposing record IDs", () => {
    expect(parseSaveToolOutcome("Saved 2 site diary record(s) successfully. Record IDs: a, b."))
      .toEqual({ ok: true, count: 2 });
    expect(parseSaveToolOutcome("Failed to save site diary entry. Reason: unavailable"))
      .toEqual({ ok: false, count: 0, message: "unavailable" });
  });

  it("ends only save-only tool rounds deterministically", () => {
    expect(isSaveOnlyToolRound(["save_to_database"])).toBe(true);
    expect(isSaveOnlyToolRound(["save_to_database", "get_bis_connection_status"])).toBe(false);
    expect(isSaveOnlyToolRound(["get_bis_connection_status"])).toBe(false);
  });

  it.each([
    ["Šodien tika pabeigti darbi", "lv"],
    ["Today the walls were finished", "en"],
    ["Сегодня завершены стены", "ru"],
  ] as const)("detects %s as %s", (message, language) => {
    expect(detectReplyLanguage(message)).toBe(language);
  });
});
