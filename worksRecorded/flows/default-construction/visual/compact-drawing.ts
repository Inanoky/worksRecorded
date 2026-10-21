import type { VisualDrawing } from "./model";

export function compactVisualDrawing(drawing: VisualDrawing): VisualDrawing {
	return {
		...drawing,
		state: {
			...drawing.state,
			attempts: drawing.state.attempts.map((attempt) => ({
				...attempt,
				rawOutput: null,
			})),
		},
	};
}
