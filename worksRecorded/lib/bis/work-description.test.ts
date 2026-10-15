import { getBisWorkDescription } from "./work-description";

describe("configured BIS work description", () => {
	it("uses the BIS work column without adding KUCE source notes", () => {
		expect(
			getBisWorkDescription(
				{
					Works: "Montaż podwieszeń",
					Works_Custom_1: "Konsoles montāža balstā 8-155",
					Comments: "KUCE source path and crew notes",
				},
				{ otherSettings: { bisWorkDescriptionField: "Works_Custom_1" } },
			),
		).toBe("Konsoles montāža balstā 8-155");
	});
	it("leaves an unprepared BIS description empty instead of using source notes", () => {
		expect(
			getBisWorkDescription(
				{ Works_Custom_1: null, Comments: "KUCE source notes" },
				{ otherSettings: { bisWorkDescriptionField: "Works_Custom_1" } },
			),
		).toBe("");
	});
	it("preserves the existing source for projects without a configured BIS work field", () => {
		expect(
			getBisWorkDescription({ Comments: "Existing work description" }, {}),
		).toBe("Existing work description");
	});
});
