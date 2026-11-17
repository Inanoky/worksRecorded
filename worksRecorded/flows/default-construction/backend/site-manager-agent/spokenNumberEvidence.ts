const groups: Array<[number, string[]]> = [
	[0, ["nulle", "nulles"]],
	[1, ["viens", "viena", "vienu", "vienas", "vienā"]],
	[2, ["divi", "divas", "divus", "divām"]],
	[3, ["trīs", "tris"]],
	[4, ["četri", "četras", "četrus", "cetri"]],
	[5, ["pieci", "piecas", "piecus"]],
	[6, ["seši", "sešas", "sešus", "sesi"]],
	[7, ["septiņi", "septiņas", "septiņus", "septini"]],
	[8, ["astoņi", "astoņas", "astoņus", "astoni"]],
	[9, ["deviņi", "deviņas", "deviņus", "devini"]],
	[10, ["desmit"]],
	[11, ["vienpadsmit"]],
	[12, ["divpadsmit"]],
	[13, ["trīspadsmit", "trispadsmit"]],
	[14, ["četrpadsmit", "cetrpadsmit"]],
	[15, ["piecpadsmit"]],
	[16, ["sešpadsmit", "sespadsmit"]],
	[17, ["septiņpadsmit", "septinpadsmit"]],
	[18, ["astoņpadsmit", "astonpadsmit"]],
	[19, ["deviņpadsmit", "devinpadsmit"]],
	[20, ["divdesmit"]],
	[30, ["trīsdesmit", "trisdesmit"]],
	[40, ["četrdesmit", "cetrdesmit"]],
	[50, ["piecdesmit"]],
	[60, ["sešdesmit", "sesdesmit"]],
	[70, ["septiņdesmit", "septindesmit"]],
	[80, ["astoņdesmit", "astondesmit"]],
	[90, ["deviņdesmit", "devindesmit"]],
	[100, ["simts", "simt", "simti", "simtus"]],
	[1000, ["tūkstotis", "tūkstoši", "tūkstoš", "tūkstošus"]],
];

const values = new Map(
	groups.flatMap(([value, words]) =>
		words.map((word) => [word, value] as const),
	),
);
const word = `(?:${[...values.keys()].sort((a, b) => b.length - a.length).join("|")})`;
const phrase = new RegExp(
	String.raw`(?<![\p{L}\p{N}_])${word}(?:\s+${word})*(?![\p{L}\p{N}_])`,
	"giu",
);

function belowThousand(parts: number[]): number | null {
	if (!parts.length) return 0;
	let hundreds = 0;
	let rest = parts;
	if (parts[0] === 100) {
		hundreds = 100;
		rest = parts.slice(1);
	} else if (parts[0] > 0 && parts[0] < 10 && parts[1] === 100) {
		hundreds = parts[0] * 100;
		rest = parts.slice(2);
	}
	if (!rest.length) return hundreds;
	if (
		rest.length === 1 &&
		rest[0] >= 0 &&
		rest[0] < 100 &&
		(!hundreds || rest[0] > 0)
	)
		return hundreds + rest[0];
	if (
		rest.length === 2 &&
		rest[0] >= 20 &&
		rest[0] < 100 &&
		rest[0] % 10 === 0 &&
		rest[1] > 0 &&
		rest[1] < 10
	)
		return hundreds + rest[0] + rest[1];
	return null;
}

function cardinal(parts: number[]) {
	const scale = parts.indexOf(1000);
	if (scale < 0) return belowThousand(parts);
	if (parts.lastIndexOf(1000) !== scale) return null;
	const thousands = scale === 0 ? 1 : belowThousand(parts.slice(0, scale));
	const rest = belowThousand(parts.slice(scale + 1));
	if (thousands === null || thousands <= 0 || rest === null) return null;
	return thousands * 1000 + rest;
}

export function normalizeLatvianNumberEvidence(source: string) {
	return source.replace(phrase, (match) => {
		const parts = match
			.toLocaleLowerCase("lv")
			.split(/\s+/u)
			.map((part) => values.get(part));
		if (parts.some((part) => part === undefined)) return match;
		const value = cardinal(parts as number[]);
		return value === null ? match : String(value);
	});
}
