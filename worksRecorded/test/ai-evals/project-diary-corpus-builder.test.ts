import {
	buildProjectDiaryCorpus,
	type DiaryProjectSnapshot,
	diaryFingerprint,
} from "./project-diary-corpus-builder";

const snapshot = (): DiaryProjectSnapshot => ({
	siteId: "private-site",
	siteName: "Projekt A",
	organizationName: "Org A",
	orgLanguage: "lv",
	config: {
		Works: {
			Type: "dropdown",
			DropDownOptions: { privateOption: "Betonēšana" },
		},
		otherSettings: {
			Type: "noRender",
			userId: "PRIVATE_USER",
			defaultConstructionForma2WorkSync: {
				documentId: "private-document",
				entries: [
					{
						positionId: "private-position",
						work: "Betonēšana",
						ownedByForma2: true,
					},
				],
			},
		},
	},
	forma2: {
		document: {
			id: "private-document",
			positions: [
				{
					id: "private-position",
					code: "1.1",
					name: "Betonēšana",
					categoryName: "Betona darbi",
					categoryCode: "1",
					kind: "work",
					parentId: null,
					sourceRow: 1,
					unit: "m3",
				},
			],
		},
		allocations: [{ sourceId: "private-row", positionId: "private-position" }],
	},
	batches: [
		{
			id: "private-batch",
			originalText:
				"Test User : Plan 2 iebetonēti 12 m3 betona, 2 strādnieki, 3 h.",
			createdAt: "2026-10-15T21:30:00Z",
			receivedAt: null,
			status: "active",
		},
	],
	records: [
		{
			id: "private-row",
			Date: "2026-10-16T00:00:00Z",
			Works: "Betonēšana",
			Location: "Plan 2",
			Comments: "Betonēšana",
			Amounts: 12,
			Units: "m3",
			WorkersInvolved: 2,
			TimeInvolved: 3,
			saveBatchId: "private-batch",
			archivedAt: null,
		},
	],
	corrections: [],
});
const selection = {
	key: "project-a",
	siteFingerprint: diaryFingerprint("private-site"),
	cases: [
		{
			batchFingerprint: diaryFingerprint("private-batch"),
			id: "project-a-concrete",
			tags: [],
			intent: "Betonēšanas pārbaude",
		},
	],
};

it("keeps exact source text except the documented author prefix and uses Riga's received date", () => {
	const corpus = buildProjectDiaryCorpus(snapshot(), selection);
	expect(corpus.cases[0].sourceText).toBe(
		"Plan 2 iebetonēti 12 m3 betona, 2 strādnieki, 3 h.",
	);
	expect(corpus.cases[0].receivedDateISO).toBe("2026-10-16");
	expect(corpus.cases[0].expectedRecords[0]).toMatchObject({
		amount: 12,
		workers: 2,
		hours: 3,
		checkLocation: true,
	});
	expect(corpus.cases[0].sourceTextFingerprint).not.toBe(
		corpus.cases[0].inputFingerprint,
	);
	const serialized = JSON.stringify(corpus);
	for (const secret of [
		"private-site",
		"private-document",
		"private-position",
		"private-row",
		"PRIVATE_USER",
		"Test User :",
	])
		expect(serialized).not.toContain(secret);
});

it("rejects a snapshot from another site and scopes identical production position IDs separately", () => {
	expect(() =>
		buildProjectDiaryCorpus({ ...snapshot(), siteId: "wrong-site" }, selection),
	).toThrow("site fingerprint");
	const a = buildProjectDiaryCorpus(snapshot(), selection);
	const b = buildProjectDiaryCorpus(snapshot(), {
		...selection,
		key: "project-b",
	});
	expect(a.project.positions[0].id).not.toBe(b.project.positions[0].id);
});

it("preserves questionable current values in review candidates without making them scored expectations", () => {
	const data = snapshot();
	data.batches.push({
		...data.batches[0],
		id: "unspoken-hours",
		originalText: "Test User : Betonēšana.",
	});
	data.records.push({
		...data.records[0],
		id: "legacy-defaults",
		saveBatchId: "unspoken-hours",
		Amounts: 0,
		TimeInvolved: 10,
	});
	const corpus = buildProjectDiaryCorpus(data, selection);
	expect(corpus.cases).toHaveLength(1);
	expect(corpus.referenceCandidates[0].issues).toEqual(
		expect.arrayContaining([
			"legacy-zero-quantity",
			"duration-not-stated-in-message",
		]),
	);
	expect(corpus.referenceCandidates[0].expectedRecords[0].hours).toBe(10);
});
