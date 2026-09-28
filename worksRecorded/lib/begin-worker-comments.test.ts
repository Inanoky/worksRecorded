import { BEGIN_STORAGE_MARKER, type BeginDay } from "./begin-hours";
import { getBeginWorkerComments } from "./begin-worker-comments";

const day: BeginDay = {
	kind: BEGIN_STORAGE_MARKER,
	version: 1,
	date: "2026-09-25",
	importedAt: "2026-09-28T07:00:00Z",
	importedBy: "test",
	sourceCompany: "Test",
	capturedOn: "2026-09-28",
	rateCents: 1250,
	objects: ["Site"],
	history: [],
	entries: [
		{
			worker: "Jaunzems Ralfs",
			date: "2026-09-25",
			start: "08:00",
			end: "15:09",
			minutes: 429,
			object: "Site",
			status: "approved",
			comment: "XPS Plēve",
		},
		{
			worker: "Rzajevs Igors",
			date: "2026-09-25",
			start: "08:00",
			end: "13:32",
			minutes: 332,
			object: "Site",
			status: "approved",
			comment: "Putoplasta likšana,plēves klāšana",
		},
	],
};

it.each(["Ralfs", "Jaunzems Ralfs", " RALFS  JAUNZEMS "])(
	"matches %s to the correct imported comment",
	(name) => {
		expect(getBeginWorkerComments(day, day.importedAt, name)).toEqual([
			"XPS Plēve",
		]);
	},
);

it("supports omitted diacritics but not guessed spellings", () => {
	const source = {
		...day,
		entries: [{ ...day.entries[0], worker: "Ļevickis Rikardo" }],
	};
	expect(
		getBeginWorkerComments(source, day.importedAt, "Levickis Rikardo"),
	).toEqual(["XPS Plēve"]);
	expect(
		getBeginWorkerComments(source, day.importedAt, "Levicks Rikardo"),
	).toEqual([]);
});

it("avoids ambiguous first names and other dates", () => {
	expect(
		getBeginWorkerComments(
			{
				...day,
				entries: [...day.entries, { ...day.entries[0], worker: "Cits Ralfs" }],
			},
			day.importedAt,
			"Ralfs",
		),
	).toEqual([]);
	expect(
		getBeginWorkerComments(
			{ ...day, entries: [{ ...day.entries[0], date: "2026-09-24" }] },
			day.importedAt,
			"Ralfs",
		),
	).toEqual([]);
});

it("does not mix newer import comments into the saved explanation", () => {
	const newer = { ...day, importedAt: "2026-09-29T07:00:00Z" };
	expect(getBeginWorkerComments(newer, day.importedAt, "Ralfs")).toEqual([]);
	expect(
		getBeginWorkerComments(
			{ ...newer, history: [day] },
			day.importedAt,
			"Ralfs",
		),
	).toEqual(["XPS Plēve"]);
});

it("preserves full multiline comments and omits blanks and duplicates", () => {
	const entry = { ...day.entries[0], comment: "XPS\nPlēve" };
	const source = {
		...day,
		entries: [
			entry,
			entry,
			{ ...entry, comment: " " },
			{ ...entry, comment: "Vēl viens ieraksts" },
		],
	};
	expect(getBeginWorkerComments(source, day.importedAt, "Ralfs")).toEqual([
		"XPS\nPlēve",
		"Vēl viens ieraksts",
	]);
	expect(getBeginWorkerComments(day, day.importedAt, "Artis")).toEqual([]);
	expect(getBeginWorkerComments(undefined, day.importedAt, "Ralfs")).toEqual(
		[],
	);
});
