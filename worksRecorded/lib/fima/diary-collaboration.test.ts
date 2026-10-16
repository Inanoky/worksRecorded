import {
	appendFimaEvent,
	type FimaEvent,
	fimaMaterialSchema,
	parseBisRecordMaterials,
	readFimaCollaboration,
	withFimaDiaryColumns,
} from "./diary-collaboration";

const event: FimaEvent = {
	id: "request-1",
	kind: "comment",
	actorId: "member-1",
	actorName: "Anna Bērziņa",
	at: "2026-10-15T10:00:00Z",
	text: "Pārbaudīt balstus",
};
it("does not alter other organizations' configuration", () => {
	const config = {
		WorkersInvolved: { customSettings: { displayinSiteList: "yes" } },
	};
	expect(withFimaDiaryColumns(config, "BIS-1")).toBe(config);
});
it("fits FIMA columns and hides labour metrics without changing saved configuration", () => {
	const config = {
		otherSettings: { fimaCollaboration: true },
		TimeInvolved: { customSettings: { displayinSiteList: "yes" } },
		WorkersInvolved: { customSettings: { displayinSiteList: "yes" } },
	};
	const result = withFimaDiaryColumns(config, "BIS-BL-123");
	expect(result.otherSettings).toMatchObject({
		fitDiaryTableToWidth: true,
		hideCreatedAtInSiteList: true,
		bisCaseNumber: "BIS-BL-123",
	});
	expect(result.TimeInvolved.customSettings?.displayinSiteList).toBe("no");
	expect(result.WorkersInvolved.customSettings?.displayinSiteList).toBe("no");
	expect(result.FimaMaterials.DisplayName).toBe("Materiāli");
	expect(config.TimeInvolved.customSettings.displayinSiteList).toBe("yes");
});
it("retains every member's comment and an earlier status event", () => {
	const first = appendFimaEvent(readFimaCollaboration(null), event, {});
	const status = appendFimaEvent(
		first,
		{ ...event, id: "request-2", kind: "status", text: "Rīcība: Labot" },
		{ status: "needs_changes" },
		1,
	);
	const second = appendFimaEvent(
		status,
		{
			...event,
			id: "request-3",
			actorId: "member-2",
			actorName: "Jānis Ozols",
		},
		{},
	);
	expect(second.history.map((item) => item.actorName)).toEqual([
		"Anna Bērziņa",
		"Anna Bērziņa",
		"Jānis Ozols",
	]);
	expect(second.status).toBe("needs_changes");
	expect(first.history).toHaveLength(1);
});
it("rejects stale status/material edits and deduplicates retried comments", () => {
	const state = appendFimaEvent(readFimaCollaboration(null), event, {});
	expect(appendFimaEvent(state, event, {})).toBe(state);
	expect(() =>
		appendFimaEvent(state, { ...event, id: "other" }, { materials: [] }, 0),
	).toThrow("Ieraksts ir mainīts");
});
it("rejects invalid draft quantities but preserves actual BIS zero quantities", () => {
	expect(
		fimaMaterialSchema.safeParse({
			id: "m",
			label: "Materiāls",
			unit: "gab.",
			quantity: 0,
		}).success,
	).toBe(false);
	expect(
		parseBisRecordMaterials(
			[
				{
					id: "join",
					attributes: { construction_material_id: 123, quantity: "0.0" },
				},
			],
			{
				used_construction_materials: [
					{ id: "join", name: "Oriģinālais nosaukums — 0 gab." },
				],
			},
		),
	).toEqual([
		{
			id: "123",
			label: "Oriģinālais nosaukums — 0 gab.",
			unit: "",
			quantity: 0,
		},
	]);
	expect(() =>
		parseBisRecordMaterials(
			[
				{
					id: "missing",
					attributes: { construction_material_id: 1, quantity: "3" },
				},
			],
			{},
		),
	).toThrow();
});
