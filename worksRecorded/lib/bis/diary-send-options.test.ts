import { mergeBisDiaryLinks } from "./diary-send-options";

test("updates BIS statuses without overwriting diary edits", () => {
	const baseline = [{ id: "one", BISId: "100", bisStatus: "sent" }];
	const current = [
		{ ...baseline[0], Works: "Edited work", Comments: "Unsaved comment" },
	];
	expect(
		mergeBisDiaryLinks(current, baseline, [
			{ ...baseline[0], bisStatus: "approved" },
		]),
	).toEqual([{ ...current[0], bisStatus: "approved" }]);
});

test("preserves a newer submission and status when an older sync finishes", () => {
	const baseline = [
		{ id: "one", BISId: null, bisStatus: null },
		{ id: "two", BISId: "200", bisStatus: "draft" },
	];
	const current = [
		{ id: "one", BISId: "100", bisStatus: "sent" },
		{ id: "two", BISId: "200", bisStatus: "approved" },
	];
	expect(mergeBisDiaryLinks(current, baseline, baseline)).toEqual(current);
});

test("clears deleted BIS links while retaining every diary record and its data", () => {
	const baseline = [{ id: "one", BISId: "100", bisStatus: "draft" }];
	const current = [
		{ ...baseline[0], Amounts: 50 },
		{ id: "two", Amounts: 30 },
		{ Amounts: 10 },
	];
	expect(
		mergeBisDiaryLinks(current, baseline, [
			{ id: "one", BISId: null, bisStatus: null },
		]),
	).toEqual([
		{ ...current[0], BISId: null, bisStatus: null },
		current[1],
		current[2],
	]);
});
