import {
	attachZtcAdditionalWorkContext,
	isZtcAdditionalWorkAttachedToDrawing,
	readZtcAdditionalWorkContext,
	resolveZtcAdditionalWorkOrigin,
	shouldAttachZtcAdditionalWorkToElement,
} from "@/flows/ztc-production/lib/ztc-additional-work-context";
import { selectLatestReusableZtcDrawingContext } from "@/flows/ztc-production/lib/ztc-drawing-context-selection";

const projectName = "Project RD";
const elementName = "2S-08";

type ScenarioRecord = {
	id: string;
	Location: string;
	Location_Custom_1: string;
	Works_Custom_1: string;
	Comments_Custom_2: string;
	Works?: string;
	pausedAt?: string;
};

function drawingMetadata() {
	return JSON.stringify({
		type: "ztc_drawing_context",
		version: 1,
		projectName,
		elements: [
			{
				elementName,
				totalAreaM2: 12.4,
				works: [{ name: "R3/T3 - latojums 25x45", amountM2: 12.4 }],
			},
		],
	});
}

function drawingRecord(
	overrides: Partial<ScenarioRecord> = {},
): ScenarioRecord {
	return {
		id: "drawing-1",
		Location: projectName,
		Location_Custom_1: elementName,
		Works_Custom_1: "R3/T3 - latojums 25x45",
		Comments_Custom_2: drawingMetadata(),
		...overrides,
	};
}

describe("ZTC production workflow scenarios", () => {
	it("attaches Papilddarbi immediately after a drawing and applies the element checkbox", () => {
		const origin = resolveZtcAdditionalWorkOrigin({
			hasDrawingContext: true,
			hasStartedWork: false,
			isPaused: false,
		});
		const context = {
			origin,
			parentSessionId: null,
			parentWork: null,
			parentProject: projectName,
			parentElement: elementName,
		};

		expect(isZtcAdditionalWorkAttachedToDrawing(context)).toBe(true);
		expect(
			shouldAttachZtcAdditionalWorkToElement({
				context,
				relatesToElement: false,
				elementName,
			}),
		).toBe(false);
		expect(
			shouldAttachZtcAdditionalWorkToElement({
				context,
				relatesToElement: true,
				elementName,
			}),
		).toBe(true);
	});

	it("keeps the drawing reusable after attached Papilddarbi", () => {
		const attachedAdditional = drawingRecord({
			id: "fresh-additional",
			Works_Custom_1: "Papilddarbi",
			Comments_Custom_2: attachZtcAdditionalWorkContext(drawingMetadata(), {
				origin: "fresh_drawing",
				parentSessionId: null,
				parentWork: null,
				parentProject: projectName,
				parentElement: elementName,
			}),
		});

		expect(selectLatestReusableZtcDrawingContext([attachedAdditional])).toBe(
			attachedAdditional,
		);
		expect(
			readZtcAdditionalWorkContext(attachedAdditional.Comments_Custom_2),
		).toMatchObject({ origin: "fresh_drawing", parentProject: projectName });
	});

	it("treats Papilddarbi after a completed drawing work as standalone", () => {
		const origin = resolveZtcAdditionalWorkOrigin(null);
		const context = {
			origin,
			parentSessionId: null,
			parentWork: null,
			parentProject: null,
			parentElement: null,
		};
		const drawing = drawingRecord();
		const standaloneAdditional = {
			id: "standalone-after-finish",
			Location: "Papilddarbi",
			Location_Custom_1: null,
			Works_Custom_1: null,
			Comments_Custom_2: attachZtcAdditionalWorkContext(null, context),
		};

		expect(isZtcAdditionalWorkAttachedToDrawing(context)).toBe(false);
		expect(standaloneAdditional.Location_Custom_1).toBeNull();
		expect(
			selectLatestReusableZtcDrawingContext([standaloneAdditional, drawing]),
		).toBe(drawing);
	});

	it("attaches an interruption to the active drawing and returns to its parent", () => {
		const parent = drawingRecord({
			id: "active-parent",
			Works: "R3/T3 - latojums 25x45",
		});
		const origin = resolveZtcAdditionalWorkOrigin({
			hasDrawingContext: true,
			hasStartedWork: true,
			isPaused: false,
		});
		const context = {
			origin,
			parentSessionId: parent.id,
			parentWork: parent.Works ?? null,
			parentProject: projectName,
			parentElement: elementName,
		};
		const interruption = drawingRecord({
			id: "active-interruption",
			Works_Custom_1: "Papilddarbi",
			Comments_Custom_2: attachZtcAdditionalWorkContext(
				drawingMetadata(),
				context,
			),
		});

		expect(origin).toBe("active_drawing");
		expect(isZtcAdditionalWorkAttachedToDrawing(context)).toBe(true);
		expect(selectLatestReusableZtcDrawingContext([interruption, parent])).toBe(
			parent,
		);
	});

	it("keeps paused drawing work paused while Papilddarbi stays standalone", () => {
		const parent = drawingRecord({
			id: "paused-parent",
			Works: "R3/T3 - latojums 25x45",
			pausedAt: "2026-08-05T09:00:00.000Z",
		});
		const origin = resolveZtcAdditionalWorkOrigin({
			hasDrawingContext: true,
			hasStartedWork: true,
			isPaused: true,
		});
		const context = {
			origin,
			parentSessionId: parent.id,
			parentWork: parent.Works ?? null,
			parentProject: projectName,
			parentElement: elementName,
		};
		const standaloneAdditional = {
			id: "paused-additional",
			Location: "Papilddarbi",
			Works_Custom_1: null,
			Comments_Custom_2: attachZtcAdditionalWorkContext(null, context),
		};

		expect(origin).toBe("paused_drawing");
		expect(isZtcAdditionalWorkAttachedToDrawing(context)).toBe(false);
		expect(
			readZtcAdditionalWorkContext(standaloneAdditional.Comments_Custom_2),
		).toMatchObject({
			origin: "paused_drawing",
			parentSessionId: parent.id,
		});
		expect(
			selectLatestReusableZtcDrawingContext([standaloneAdditional, parent]),
		).toBe(parent);
		expect(parent.pausedAt).toBe("2026-08-05T09:00:00.000Z");
	});

	it("does not attach malformed additional-work metadata to a drawing", () => {
		expect(readZtcAdditionalWorkContext("{invalid")).toBeNull();
		expect(isZtcAdditionalWorkAttachedToDrawing(null)).toBe(false);
		expect(
			shouldAttachZtcAdditionalWorkToElement({
				context: null,
				relatesToElement: true,
				elementName,
			}),
		).toBe(false);
	});
});
