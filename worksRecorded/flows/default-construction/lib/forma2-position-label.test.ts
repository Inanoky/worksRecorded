import { formatForma2PositionLabel } from "./forma2-position-label";

it.each([
	["18", "18. Concrete"],
	["18.", "18. Concrete"],
	["1.2", "1.2. Concrete"],
	["", "Concrete"],
	["A-1", "A-1 Concrete"],
])("formats estimate number %s", (code, expected) => {
	expect(formatForma2PositionLabel({ code, name: "Concrete" })).toBe(expected);
});
