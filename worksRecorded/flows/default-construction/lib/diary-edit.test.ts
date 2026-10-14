import { diaryEditRow, mergeDiaryEditChanges } from "./diary-edit";

it("patches confirmed records without replacing untouched rows or duplicating newly created IDs", () => {
	const unchanged = { id: "a", Comments: "Untouched", Photos: ["photo-a"] };
	const current = [
		unchanged,
		{ id: "b", Comments: "Old", Photos: ["photo-b"] },
	];
	const changes = {
		rows: [
			{ id: "b", Comments: "New", Photos: ["photo-b"] },
			{ id: "c", Comments: "Created", Photos: [] },
		],
		createdIds: ["c"],
	} as never;
	const updated = mergeDiaryEditChanges(current, changes);
	expect(updated[0]).toBe(unchanged);
	expect(updated[1].Comments).toBe("New");
	expect(updated[1].Photos).toEqual(["photo-b"]);
	expect(mergeDiaryEditChanges(updated, changes)).toHaveLength(3);
});

it("serializes zero quantities and preserves photo/source fields and creator names", () => {
	const record = {
		id: "a",
		Date: new Date("2026-10-14"),
		createdAt: new Date("2026-10-14"),
		Amounts: 0,
		WorkersInvolved: 0,
		TimeInvolved: 0,
		Photos: ["photo"],
		originalUserComment: "Ralfs : Work",
		User: null,
		Worker: null,
	};
	expect(diaryEditRow(record as never)).toMatchObject({
		id: "a",
		Date: "2026-10-14T00:00:00.000Z",
		Amounts: "0",
		WorkersInvolved: "0",
		TimeInvolved: "0",
		Photos: ["photo"],
		createdBy: "Ralfs",
		Works: "",
		Location: "",
		Units: "",
	});
});
