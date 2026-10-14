import { attachZtcAdditionalWorkContext } from "./ztc-additional-work-context";
import { canRepairZtcDrawingContext } from "./ztc-drawing-context-repair";

const session = {
	Location: "AM piebūve",
	Works_Custom_1: null,
	Comments_Custom_2: null,
};

it("does not attach a historical drawing to standalone additional work", () => {
	expect(
		canRepairZtcDrawingContext({ ...session, Location: "Papilddarbi" }),
	).toBe(false);
});

it("preserves manually assigned additional-work scope", () => {
	expect(
		canRepairZtcDrawingContext({ ...session, Works_Custom_1: "Papilddarbi" }),
	).toBe(false);
});

it.each([
	"standalone",
	"fresh_drawing",
	"active_drawing",
	"paused_drawing",
] as const)(
	"does not overwrite explicit additional-work metadata: %s",
	(origin) => {
		const metadata = attachZtcAdditionalWorkContext(null, {
			origin,
			parentSessionId: null,
			parentWork: null,
			parentProject: null,
			parentElement: null,
		});
		expect(
			canRepairZtcDrawingContext({ ...session, Comments_Custom_2: metadata }),
		).toBe(false);
	},
);

it("still allows a regular drawing session's missing metadata to be repaired", () => {
	expect(canRepairZtcDrawingContext(session)).toBe(true);
});
