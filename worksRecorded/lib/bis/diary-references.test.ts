import { performedWorkReferences } from "./diary-references";

const references = {
	scope: "user:case:round",
	drawings: [{ id: "123", label: "BK-1" }],
	estimates: [{ id: "456", label: "1.1 Betonēšana" }],
};

test("sends page IDs as attributes and a single estimate as a relationship", () => {
	expect(
		performedWorkReferences(references, {
			projectDocumentIds: ["123", "123"],
			estimatePositionId: "456",
		}),
	).toEqual({
		attributes: { project_document_ids: [123] },
		relationships: {
			estimate_positions: { data: [{ type: "estimate_position", id: 456 }] },
		},
	});
});

test("rejects references belonging to another case or round", () => {
	expect(() =>
		performedWorkReferences(references, { projectDocumentIds: ["999"] }),
	).toThrow("Rasējums");
	expect(() =>
		performedWorkReferences(references, { estimatePositionId: "999" }),
	).toThrow("Tāmes");
	expect(() =>
		performedWorkReferences(references, { projectDocumentIds: ["1/../999"] }),
	).toThrow("identifikators");
});

test("keeps both optional references absent when no selection is made", () => {
	expect(performedWorkReferences(references, {})).toEqual({
		attributes: {},
		relationships: {},
	});
});
