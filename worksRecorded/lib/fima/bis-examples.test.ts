import {
	migrateFimaExampleComments,
	parseFimaExampleComment,
	readFimaBisExamples,
} from "./bis-examples";
import { readFimaCollaboration } from "./diary-collaboration";
import { summarizeFimaCollaboration } from "./diary-list-summary";

const first =
	"BIS ieraksts Nr.360 (Olaine stacija, lieta BIS-BL-668714-524) — https://bis.gov.lv/bisp/lv/portal/logbooks/performed_works/7540711";
const second =
	"BIS ieraksts Nr.1806 (Torņakalns–Olaine, lieta BIS-BL-668708-558) — https://bis.gov.lv/bisp/lv/portal/logbooks/performed_works/7209025";
const event = {
	id: "examples",
	kind: "comment",
	actorId: "member",
	actorName: "Anna",
	at: "2026-10-16T14:00:00Z",
	text: `Paraugs:\n${first}\n${second}`,
};

it("retains separate records and their original case labels, deduplicating repeated URLs", () => {
	const parsed = parseFimaExampleComment(
		`Paraugs:\r\n${first}\r\n${second}\r\n${first}`,
	);
	expect(parsed?.entries).toHaveLength(2);
	expect(parsed?.entries[0]).toEqual({
		id: "7540711",
		label: first.split(" — ")[0],
		url: first.split(" — ")[1],
	});
	expect(parsed?.entries[1].label).toContain("BIS-BL-668708-558");
});

it("preserves comparison-only and no-example information", () => {
	expect(
		parseFimaExampleComment(
			`Nav tieša parauga. Salīdzināšanai izmantots:\n${first}`,
		),
	).toMatchObject({
		note: "Nav tieša parauga. Salīdzināšanai izmantots:",
		entries: [{ id: "7540711" }],
	});
	expect(parseFimaExampleComment("Nav parauga.")).toEqual({
		entries: [],
		note: "Nav parauga.",
	});
});

it("does not migrate ordinary comments, incomplete examples or non-BIS links", () => {
	for (const text of [
		"Pārbaudīt balstu",
		`Paraugs:\n${first}\nPārbaudīt daudzumu`,
		`Paraugs:\n${first.replace("bis.gov.lv", "bis.gov.lv.example.com")}`,
		"Paraugs:",
	])
		expect(parseFimaExampleComment(text)).toBeNull();
	expect(
		readFimaBisExamples({
			entries: [{ label: "Unsafe", url: "javascript:alert(1)" }],
		}),
	).toBeUndefined();
});

it("moves only example comments, archives their authorship and remains idempotent", () => {
	const ordinary = { ...event, id: "ordinary", text: "Pārbaudīt balstu" };
	const metadata = {
		kuceImport: { source: "preserve" },
		fimaCollaboration: {
			version: 4,
			materials: [{ id: "material" }],
			history: [event, ordinary],
		},
	};
	const result = migrateFimaExampleComments(metadata);
	expect(result.moved).toBe(1);
	expect(result.metadata).toMatchObject({
		kuceImport: metadata.kuceImport,
		fimaExampleCommentArchive: [event],
		fimaCollaboration: {
			version: 5,
			materials: metadata.fimaCollaboration.materials,
			history: [ordinary],
			examples: { entries: [{ id: "7540711" }, { id: "7209025" }] },
		},
	});
	expect(metadata.fimaCollaboration.history).toEqual([event, ordinary]);
	expect(migrateFimaExampleComments(result.metadata)).toEqual({
		metadata: result.metadata,
		moved: 0,
	});
});

it("keeps every legacy example when list history is reduced to the latest ordinary comment", () => {
	const state = readFimaCollaboration({
		fimaCollaboration: {
			history: [event, { ...event, id: "new", text: "Pārbaudīt daudzumu" }],
		},
	});
	const summary = summarizeFimaCollaboration(state);
	expect(summary.history).toHaveLength(1);
	expect(summary.history[0].text).toBe("Pārbaudīt daudzumu");
	expect(summary.examples?.entries).toHaveLength(2);
});
