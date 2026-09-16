import { formatDeterministicSaveReply, parseSaveToolOutcome } from "./fastPath";
import {
	buildDiaryFallbackNote,
	canSaveDiaryFallbackNote,
} from "./noteFallback";

it("preserves the original text and leaves inferred fields empty", () => {
	const source = " strādājam no 7.00 - 18.00\nBez papildu informācijas. ";
	expect(buildDiaryFallbackNote(source, "16-09-2026")).toEqual({
		Date: "2026-09-16T00:00:00.000Z",
		Works: "Piezīmes",
		Comments: source,
		Location: null,
		Amounts: null,
		Units: null,
		WorkersInvolved: null,
		TimeInvolved: null,
	});
});

it.each(["31-02-2026", "invalid", "2026-02-30"])(
	"rejects an invalid trusted date %s",
	(date) => {
		expect(buildDiaryFallbackNote("Report", date)).toBeNull();
	},
);

it.each([
	"Vai darbi ir pabeigti?",
	"change",
	"Salabo",
	"Izmaini daudzumu iepriekšējā ierakstā uz 10",
	"hello",
	"BIS status",
	"",
])("does not turn a non-report into a note: %s", (source) => {
	expect(canSaveDiaryFallbackNote({ source, confirmedReport: true })).toBe(
		false,
	);
});

it("does not persist shadow reports or ambiguous reply/correction context", () => {
	const args = { source: "strādājam no 7.00 - 18.00", confirmedReport: true };
	expect(canSaveDiaryFallbackNote(args)).toBe(true);
	expect(canSaveDiaryFallbackNote({ ...args, confirmedReport: false })).toBe(
		true,
	);
	for (const options of [
		{ persist: false },
		{ hasReplyContext: true },
		{ hasPendingCorrection: true },
	]) {
		expect(canSaveDiaryFallbackNote({ ...args, ...options })).toBe(false);
	}
	expect(
		canSaveDiaryFallbackNote({
			source: "arbitrary text",
			confirmedReport: false,
		}),
	).toBe(false);
});

it.each(["lv", "en", "ru"] as const)(
	"confirms a saved note in %s without exposing technical reasons",
	(language) => {
		const outcome = parseSaveToolOutcome(
			"Saved 1 site diary record(s) successfully. Saved as a note.",
		);
		expect(outcome).toEqual({ ok: true, count: 1, savedAsNote: true });
		const reply = formatDeterministicSaveReply(language, {
			...outcome,
			records: [{ Comments: "strādājam no 7.00 - 18.00" }],
		});
		expect(reply).toContain(
			language === "lv"
				? "Saglabāts kā piezīme."
				: language === "en"
					? "Saved as a note."
					: "Сохранено как заметка.",
		);
		expect(reply).toContain("strādājam no 7.00 - 18.00");
		const failure = formatDeterministicSaveReply(language, {
			ok: false,
			count: 0,
			savedAsNote: true,
			message:
				"Checker-guided repair was still rejected: private internal reason",
		});
		expect(failure).not.toMatch(/Checker|private|Saved as|Saglabāts|Сохранено/);
	},
);
