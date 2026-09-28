import { render, screen } from "@testing-library/react";
import type { VisualDrawing } from "./model";
import { VisualAnalysisProgress } from "./VisualAnalysisProgress";

const drawing = (
	processed: number,
	status: VisualDrawing["state"]["status"] = "paused",
): VisualDrawing => ({
	id: "drawing",
	name: "plan.pdf",
	createdAt: "2026-09-28",
	state: {
		version: 1,
		location: "1. stāvs",
		pageCount: 1,
		error: null,
		attempts: [],
		evidence: Array.from({ length: 8 }, (_, i) => ({
			id: `photo-${i}`,
			work: "XPS",
			recordId: `record-${i}`,
			photoUrl: `https://example.com/${i}.jpg`,
			location: "1. stāvs",
			description: "Pabeigts",
			date: null,
			amount: 10,
			unit: "m2",
		})),
		marks: [],
		unlocated: [],
		processed,
		status,
		lockedAt: null,
	},
});

it("shows remaining photos and real per-image progress without simulating completion", () => {
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
	expect(
		screen.getByText(/Visi nepabeigtie attēli tiek analizēti vienlaikus/),
	).toBeInTheDocument();
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

it("distinguishes failed images from completed and still-running images", () => {
	const current = drawing(6, "running");
	current.state.lockedAt = Date.now();
	current.state.imageProgress = current.state.evidence.map((item, i) => ({
		evidenceId: item.id,
		status: i < 6 ? "complete" : i === 6 ? "failed" : "running",
		error: i === 6 ? "Analīze pārsniedza laika limitu." : null,
	}));
	render(
		<VisualAnalysisProgress
			phase="analyzing"
			drawing={current}
			uploadProgress={100}
			interrupted={false}
		/>,
	);
	expect(screen.getByRole("status")).toHaveTextContent(
		"Analizēti 6 no 8 · Atlikušie attēli: 1 · Kļūdas: 1",
	);
	expect(screen.getByRole("progressbar")).toHaveAttribute("value", "7");
	expect(screen.getByText("Analīze pārsniedza laika limitu.")).toBeVisible();
	expect(screen.getByText("Analizē…")).toBeVisible();
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
