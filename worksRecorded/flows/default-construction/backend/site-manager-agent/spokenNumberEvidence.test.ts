import { normalizeLatvianNumberEvidence } from "./spokenNumberEvidence";

it.each([
	["desmit gabali, nevis pieci", "10 gabali, nevis 5"],
	["divdesmit četri metri", "24 metri"],
	["sešdesmit trīs milimetri", "63 milimetri"],
	["divi simti trīsdesmit divi kubikmetri", "232 kubikmetri"],
	["tūkstotis metru", "1000 metru"],
	["divi tūkstoši trīs simti piecpadsmit metri", "2315 metri"],
	["vienu stundu un divus strādniekus", "1 stundu un 2 strādniekus"],
	["nulle darbinieku", "0 darbinieku"],
	["divi trīs metri", "divi trīs metri"],
	["sešdesmit desmit metri", "sešdesmit desmit metri"],
	["desmitajā stāvā, AK1-6", "desmitajā stāvā, AK1-6"],
	["OD220, 22,09 m un 3,33 m3/m", "OD220, 22,09 m un 3,33 m3/m"],
])(
	"normalizes spoken integer evidence without changing other source text: %s",
	(source, expected) => {
		expect(normalizeLatvianNumberEvidence(source)).toBe(expected);
	},
);
