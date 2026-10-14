import { parseZtcSessionCommand } from "./ztc-session-commands";

describe("ZTC pause/resume commands", () => {
	it.each([
		"Turpinu",
		"Turpinu.",
		" TURPINU!!! ",
		"“Turpinu”",
		"Turpinu…",
		"Turpīnu",
		"Trupinu",
		"Trupinu.",
		"Turpniu",
		"Turpin",
		"Turpinnu",
		"Turpinuu",
		"Turpini",
	])("recognizes resume %s", (text) => {
		expect(parseZtcSessionCommand(text)).toBe("resume");
	});
	it.each([
		"Pauze",
		"Pauze!",
		"(Pauze.)",
		" PAUZE? ",
		"Pāuze",
		"Puaze",
		"Pazue.",
		"Pauz",
		"Pauzee",
		"Pause",
	])("recognizes pause %s", (text) => {
		expect(parseZtcSessionCommand(text)).toBe("pause");
	});
	it.each([
		"",
		".",
		"pau",
		"tur",
		"trupn",
		"pauzzeee",
		"Turpinu darbu pie ventilatora",
		"Turpinu. Darbs pabeigts",
		"Nepauze",
		"Neturpinu",
		"Ne turpinu",
		"Pauze 10 min",
		"Atcelt",
		"Pabeigts",
		"tur.pinu",
		"Pauze\nTurpinu",
	])(
		"does not turn work descriptions, negations or unrelated messages into commands: %s",
		(text) => {
			expect(parseZtcSessionCommand(text)).toBeNull();
		},
	);
});
