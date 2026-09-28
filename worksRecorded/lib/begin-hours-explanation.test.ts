import {
	formatBeginExplanationNumber,
	presentBeginExplanation,
} from "./begin-hours-explanation";

it("separates a legacy crew breakdown, calculation and allocation caveats", () => {
	const text =
		"Stundu aprēķins (lietotāja precizējums, 25.09.2026.): Begin Estrich NR.2 brigāde — Jaunzems Ralfs 7 h 47 min (467 min), Levickis Rikardo 7 h 07 min (427 min), Razjevs Igors 6 h 04 min (364 min). Kopā: 467 + 427 + 364 = 1258 min = 20 h 58 min cilvēkstundas. Plēves ieklāšanas un papilddarbu atsevišķs ilgums nav norādīts. Tas ir uzskaites sadalījums, nevis apliecinājums, ka plēve neaizņēma laiku. Strādnieki: 3; Stundas: 1258 / 60 / 3 = 6.9888889 h vidēji vienam strādniekam. 3 × 6.9888889 = 20.9666667 cilvēkstundas.";
	const result = presentBeginExplanation(text);
	expect(result.team).toBe("Begin Estrich NR.2 brigāde");
	expect(result.workers).toEqual([
		{ name: "Jaunzems Ralfs", duration: "7 h 47 min" },
		{ name: "Levickis Rikardo", duration: "7 h 07 min" },
		{ name: "Razjevs Igors", duration: "6 h 04 min" },
	]);
	expect(result.calculations.join(" ")).toContain("6,99");
	expect(result.notes.join(" ")).toContain("nevis apliecinājums");
	expect(result.notes.join(" ")).not.toContain("6.9888889");
	expect(text).toContain("6.9888889");
});

it("keeps unrecognised explanations and dates without guessing workers", () => {
	const result = presentBeginExplanation(
		"28.09.2026. Strādāja Ralfs, laiks nav zināms. Piešķirtas 0 stundas.",
	);
	expect(result.team).toBeNull();
	expect(result.workers).toEqual([]);
	expect(result.notes.join(" ")).toContain("28.09.2026.");
	expect(result.notes.join(" ")).toContain("Piešķirtas 0 stundas.");
});

it("does not drop a partially recognised crew list", () => {
	const text = "Estrich brigāde — Ralfs 7 h 47 min (467 min), Igors nav laika.";
	expect(presentBeginExplanation(text).notes).toEqual([text]);
});

it("formats zero, null and fractional hours distinctly", () => {
	expect(formatBeginExplanationNumber(0)).toBe("0");
	expect(formatBeginExplanationNumber(null)).toBe("—");
	expect(formatBeginExplanationNumber(1258 / 60 / 3)).toBe("6,99");
});

it("presents the plus-separated crew with the missing-time warning still visible", () => {
	const result = presentBeginExplanation(
		"Stundu uzskaite 28.09.2026.: Begin Estrich NR.2 brigāde — Ralfs 7 h 09 min (429 min) + Igors 5 h 32 min (332 min) = 761 min = 12 h 41 min zināmās cilvēkstundas. Rikardo beigu laiks nav ievadīts; viņa ilgums paliek null un netiek aplēsts. Visas zināmās stundas piešķirtas XPS pēc lietotāja noteikuma; plēvei nav atsevišķa ilguma. Strādnieki laukā 2 ir tikai darbinieki ar zināmu ilgumu; Stundas = 761 / 60 / 2 = 6,3416667 h. Brigādē ir 3 cilvēki, kopējais ilgums vēl nav pilnīgs.",
	);
	expect(result.team).toBe("Begin Estrich NR.2 brigāde");
	expect(result.workers).toEqual([
		{ name: "Ralfs", duration: "7 h 09 min" },
		{ name: "Igors", duration: "5 h 32 min" },
	]);
	expect(result.calculations.join(" ")).toContain("761 min");
	expect(result.calculations.join(" ")).toContain("6,34 h");
	expect(result.notes.join(" ")).toContain("Rikardo beigu laiks nav ievadīts");
	expect(result.notes.join(" ")).toContain("kopējais ilgums vēl nav pilnīgs");
	expect(result.notes.join(" ")).not.toContain("761 / 60");
});

it("presents colon durations with the crew total separate from the assigned zero", () => {
	const result = presentBeginExplanation(
		"Stundu sadalījums (aplēse, 25.09.2026.): Begin Estrich NR.2 brigāde — Ralfs 7:47, Rikardo 7:07, Igors 6:04; kopā 20:58 cilvēkstundas. Papilddarbu atsevišķs ilgums WhatsApp nav norādīts; piešķirtas 0 stundas saskaņā ar lietotāja noteikumu.",
	);
	expect(result.workers.map((worker) => worker.duration)).toEqual([
		"7 h 47 min",
		"7 h 07 min",
		"6 h 04 min",
	]);
	expect(result.calculations).toEqual(["Kopā: 20:58 cilvēkstundas"]);
	expect(result.notes.join(" ")).toContain("piešķirtas 0 stundas");
});

it.each(["Begin Šmerļa ieraksti", "Begin Estrich NR.2, Šmerļa"])(
	"presents minutes under %s even after an introductory sentence",
	(label) => {
		const result = presentBeginExplanation(
			`Ralfa WhatsApp ziņojums identificē XPS kā brigādes pamatdarbu. ${label}: Jaunzems Ralfs 477 min + Ļevickis Rikardo 401 min = 878 min = 14 h 38 min cilvēkstundas. Igora 375 min Begin ierakstam nav objekta, tāpēc tas nav pieskaitīts. Strādnieki = 2; Stundas = 878 / 60 / 2 = 7,3166667 h; 2 × 7,3166667 = 14,6333333 cilvēkstundas.`,
		);
		expect(result.team).toBe(label);
		expect(result.workers).toEqual([
			{ name: "Jaunzems Ralfs", duration: "7 h 57 min" },
			{ name: "Ļevickis Rikardo", duration: "6 h 41 min" },
		]);
		expect(result.notes.join(" ")).toContain("nav objekta");
		expect(result.notes.join(" ")).not.toContain("7,32");
	},
);

it("shows named crew members with unknown duration without assigning times", () => {
	const result = presentBeginExplanation(
		"Arta brigāde, Begin nodaļa Estrich NR.1 — Artis, Dagnis, Lauris. WhatsApp papilddarbiem atsevišķs ilgums nav norādīts; piešķirtas 0 stundas pēc lietotāja noteikuma. Tā ir sadalījuma vienošanās, nevis izmērīts nulles darba ilgums.",
	);
	expect(result.workers).toEqual(
		["Artis", "Dagnis", "Lauris"].map((name) => ({
			name,
			duration: "Nav norādīts",
		})),
	);
	expect(result.notes.join(" ")).toContain(
		"nevis izmērīts nulles darba ilgums",
	);
});

it("keeps invalid durations visible instead of guessing", () => {
	const text = "Begin brigāde — Artis 7:80, Lauris 6:20.";
	expect(presentBeginExplanation(text).workers).toEqual([]);
	expect(presentBeginExplanation(text).notes).toEqual([text]);
});
