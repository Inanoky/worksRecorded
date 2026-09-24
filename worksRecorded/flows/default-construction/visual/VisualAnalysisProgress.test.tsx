import { render, screen } from "@testing-library/react";
import type { VisualDrawing } from "./model";
import { VisualAnalysisProgress } from "./VisualAnalysisProgress";

const drawing = (processed: number, status = "paused") =>
	({
		state: {
			evidence: Array.from({ length: 8 }),
			processed,
			status,
			lockedAt: null,
		},
	}) as VisualDrawing;

it("shows remaining photos and real batch progress without simulating per-photo completion", () => {
	const { rerender } = render(
		<VisualAnalysisProgress
			phase="analyzing"
			drawing={drawing(0)}
			uploadProgress={100}
			interrupted={false}
		/>,
	);
	expect(screen.getByRole("status")).toHaveTextContent(
		"Analizēti 0 no 8 · Atlikušie attēli: 8",
	);
	expect(screen.getByRole("progressbar")).toHaveAttribute("value", "0");
	expect(screen.getByText(/Pašlaik apstrādā līdz 6/)).toBeInTheDocument();
	rerender(
		<VisualAnalysisProgress
			phase="analyzing"
			drawing={drawing(6)}
			uploadProgress={100}
			interrupted={false}
		/>,
	);
	expect(screen.getByRole("status")).toHaveTextContent("Atlikušie attēli: 2");
	expect(screen.getByRole("progressbar")).toHaveAttribute("value", "6");
	expect(screen.getByText(/Pašlaik apstrādā līdz 2/)).toBeInTheDocument();
	rerender(
		<VisualAnalysisProgress
			phase="idle"
			drawing={drawing(8, "complete")}
			uploadProgress={100}
			interrupted={false}
		/>,
	);
	expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
});

it("separates PDF upload from analysis of a previously selected drawing", () => {
	render(
		<VisualAnalysisProgress
			phase="upload"
			drawing={drawing(6)}
			uploadProgress={42}
			interrupted={false}
		/>,
	);
	expect(screen.getByRole("status")).toHaveTextContent("Augšupielādē PDF");
	expect(screen.queryByText(/Atlikušie/)).not.toBeInTheDocument();
	expect(screen.getByRole("progressbar")).toHaveAttribute("value", "42");
});

it("keeps remaining counts visible after failure with no active spinner", () => {
	render(
		<VisualAnalysisProgress
			phase="idle"
			drawing={drawing(6, "failed")}
			uploadProgress={100}
			interrupted={true}
		/>,
	);
	expect(screen.getByRole("status")).toHaveTextContent("Analīze pārtraukta");
	expect(screen.getByRole("status")).toHaveTextContent("Atlikušie attēli: 2");
	expect(screen.getByText(/Turpināt analīzi/)).toBeInTheDocument();
});
