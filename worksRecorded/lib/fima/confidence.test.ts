import { readFimaConfidence } from "./confidence";
import { readFimaCollaboration } from "./diary-collaboration";

const approvedReference = {
	key: "668708/123",
	updatedAt: "2026-10-22T08:00:00Z",
};
const review = (value: Record<string, unknown>) => ({
	fimaCompletionReview20261022: { review: { outcome: "UPDATE", ...value } },
});

it.each(["TOR_EXACT", "OLA_EXACT"])(
	"rates a verified exact approved %s work match at 100%%",
	(tier) => {
		expect(
			readFimaConfidence(review({ tier, reference: approvedReference }))?.level,
		).toBe(100);
	},
);

it("rates an attached approved counterpart at 100%, without using a badge as approval evidence", () => {
	expect(
		readFimaConfidence({
			kuceImport: { bisLinks: [{ id: "123", status: "approved" }] },
		})?.level,
	).toBe(100);
	expect(
		readFimaConfidence({ fimaCollaboration: { status: "approved" } }),
	).toBeUndefined();
	expect(
		readFimaConfidence({
			kuceImport: { bisLinks: [{ id: "123", status: "approving" }] },
		}),
	).toBeUndefined();
});

it("rates a verified close example at 90%, and requires an approved-source verification record", () => {
	expect(
		readFimaConfidence(
			review({
				tier: "DRAWING_VALIDATED_EQUIVALENT",
				reference: approvedReference,
			}),
		)?.level,
	).toBe(90);
	expect(
		readFimaConfidence(
			review({ tier: "TOR_EXACT", reference: { key: "668708/123" } }),
		),
	).toBeUndefined();
});

it("rates drawing-based work at 80% only with checked locations and drawing evidence", () => {
	expect(
		readFimaConfidence(
			review({
				tier: "DRAWING_ONLY",
				locationComplete: true,
				drawingEvidence: [{ mast: "4-13" }],
			}),
		)?.level,
	).toBe(80);
	expect(
		readFimaConfidence(
			review({
				tier: "DRAWING_ONLY",
				locationComplete: false,
				drawingEvidence: [{ mast: "4-13" }],
			}),
		),
	).toBeUndefined();
	expect(
		readFimaConfidence(
			review({
				locationComplete: true,
				description: "DRAWING_LOCATION_AND_LITERAL_OPERATION_DRAFT",
			}),
		)?.level,
	).toBe(80);
});

it("rates unsupported existing proposals at 50% and leaves empty or held work unrated", () => {
	expect(
		readFimaConfidence(review({ description: "EXISTING_PRESERVED" }))?.level,
	).toBe(50);
	for (const outcome of ["PROTECTED", "HIDDEN_SOURCE_HELD"])
		expect(
			readFimaConfidence(
				review({ outcome, description: "EXISTING_PRESERVED" }),
			),
		).toBeUndefined();
	expect(
		readFimaConfidence(
			review({ description: "PENDING", materials: "UNRESOLVED" }),
		),
	).toBeUndefined();
	expect(readFimaConfidence(null)).toBeUndefined();
});

it("derives confidence without mutating comments, status, materials or concurrency version", () => {
	const metadata = {
		...review({ tier: "TOR_EXACT", reference: approvedReference }),
		fimaCollaboration: {
			version: 4,
			status: "do_not_create",
			materials: [],
			history: [{ kind: "comment", text: "Cilvēka komentārs" }],
		},
	};
	const before = JSON.stringify(metadata);
	const state = readFimaCollaboration(metadata);
	expect(state.confidence?.level).toBe(100);
	expect(state).toMatchObject(metadata.fimaCollaboration);
	expect(JSON.stringify(metadata)).toBe(before);
});
