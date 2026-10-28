import { fireEvent, render, screen } from "@testing-library/react";
import { createSpendingDemo } from "../lib/spending-demo";
import { DefaultConstructionSpendingPreview } from "./DefaultConstructionSpendingPreview";

jest.mock("recharts", () =>
	Object.fromEntries(
		[
			"Area",
			"AreaChart",
			"Bar",
			"BarChart",
			"CartesianGrid",
			"Line",
			"LineChart",
			"ResponsiveContainer",
			"Tooltip",
			"XAxis",
			"YAxis",
		].map((name) => [name, () => null]),
	),
);
jest.mock("./SpendingProjection", () => ({ SpendingProjection: () => null }));
jest.mock("./WorkCompletion", () => ({ WorkCompletion: () => null }));

it("extends the full-period range as real sources update while preserving manual date filters", () => {
	const demo = createSpendingDemo();
	const current = {
		...demo.current,
		sources: demo.current.sources.slice(0, 2),
	};
	const props = {
		...demo,
		current,
		proposed: current,
		reassignments: [],
		siteName: "Project",
		projectData: true,
	};
	const view = render(<DefaultConstructionSpendingPreview {...props} />);
	expect(screen.getByLabelText("Līdz")).toHaveValue("2026-09-07");
	const updated = {
		...current,
		sources: [
			...current.sources,
			{ ...current.sources[0], id: "later-record", date: "2026-10-26" },
		],
	};
	view.rerender(
		<DefaultConstructionSpendingPreview
			{...props}
			current={updated}
			proposed={updated}
		/>,
	);
	expect(screen.getByLabelText("Līdz")).toHaveValue("2026-10-26");
	fireEvent.change(screen.getByLabelText("Līdz"), {
		target: { value: "2026-09-30" },
	});
	const newest = {
		...updated,
		sources: [
			...updated.sources,
			{ ...current.sources[0], id: "newest-record", date: "2026-11-10" },
		],
	};
	view.rerender(
		<DefaultConstructionSpendingPreview
			{...props}
			current={newest}
			proposed={newest}
		/>,
	);
	expect(screen.getByLabelText("Līdz")).toHaveValue("2026-09-30");
	fireEvent.click(screen.getByRole("button", { name: "Viss periods" }));
	expect(screen.getByLabelText("Līdz")).toHaveValue("2026-11-10");
	expect(screen.queryByText(/PA1.6 materiālu pārdale/)).not.toBeInTheDocument();
	expect(
		screen.getByText("Projekta dati · atjaunojas fonā"),
	).toBeInTheDocument();
});
