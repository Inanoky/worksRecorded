import { getFimaBisStatus } from "./bis-status";
import { readFimaDiaryFilters } from "./diary-filters";

it.each([
	[null, "works_recorded"],
	["", "works_recorded"],
	["APPROVED", "approved"],
	["approving", "pending"],
	["pending_approval", "pending"],
	["submitted_to_approve", "pending"],
	["draft", "draft"],
	["opened_for_update", "draft"],
] as const)("groups %s with the displayed %s status", (value, expected) => {
	expect(getFimaBisStatus(value)).toBe(expected);
});
it("keeps the actual BIS status separate from the internal review badge", () => {
	expect(
		readFimaDiaryFilters({
			review: "coordinate_with_fima",
			bisStatus: "pending",
		}),
	).toEqual({ review: "coordinate_with_fima", bisStatus: "pending" });
	expect(readFimaDiaryFilters({ bisStatus: "invalid" })).toEqual({});
});
