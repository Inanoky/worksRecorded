import { render, screen } from "@testing-library/react";
import { createSpendingDemo } from "../lib/spending-demo";
import { DefaultConstructionSpending } from "./DefaultConstructionSpending";
import { useLimeniProjectData } from "./LimeniProjectData";

jest.mock("./LimeniProjectData", () => ({ useLimeniProjectData: jest.fn() }));
jest.mock("./DefaultConstructionSpendingPreview", () => ({
	DefaultConstructionSpendingPreview: ({
		current,
		siteName,
		projectData,
	}: {
		current: { sources: { actualCost: number | null }[] };
		siteName: string;
		projectData: boolean;
	}) => (
		<div data-testid="financial-data">
			{siteName} ·{" "}
			{current.sources
				.reduce((sum, source) => sum + (source.actualCost ?? 0), 0)
				.toFixed(2)}{" "}
			· {String(projectData)}
		</div>
	),
}));

const project = () => ({
	version: "one",
	config: {},
	diary: { rows: [] },
	forma2: {
		data: {
			siteName: "Real project",
			clientCosts: createSpendingDemo().current,
		},
	},
});
const useSnapshot = (
	snapshot: ReturnType<typeof project> | null,
	failed = false,
	denied = false,
) =>
	jest.mocked(useLimeniProjectData).mockReturnValue({
		enabled: true,
		snapshot,
		failed,
		denied,
	} as unknown as ReturnType<typeof useLimeniProjectData>);

it("recalculates from background project updates without loading generated fallback data", () => {
	const snapshot = project();
	useSnapshot(snapshot);
	const view = render(<DefaultConstructionSpending />);
	const before = screen.getByTestId("financial-data").textContent;
	const updated = {
		...snapshot,
		version: "two",
		forma2: {
			data: {
				...snapshot.forma2.data,
				clientCosts: {
					...snapshot.forma2.data.clientCosts,
					sources: [
						...snapshot.forma2.data.clientCosts.sources,
						{
							...snapshot.forma2.data.clientCosts.sources[0],
							id: "new-cost",
							actualCost: 100,
						},
					],
				},
			},
		},
	};
	useSnapshot(updated);
	view.rerender(<DefaultConstructionSpending />);
	expect(screen.getByTestId("financial-data")).toHaveTextContent(
		"Real project",
	);
	expect(screen.getByTestId("financial-data").textContent).not.toBe(before);
});

it("shows a loading or error state without inventing financial data", () => {
	useSnapshot(null);
	const view = render(<DefaultConstructionSpending />);
	expect(screen.queryByTestId("financial-data")).toBeNull();
	useSnapshot(null, true);
	view.rerender(<DefaultConstructionSpending />);
	expect(screen.getByRole("alert")).toHaveTextContent("Neizdevās ielādēt");
	expect(screen.queryByTestId("financial-data")).toBeNull();
});

it("identifies stale cached data and hides financial data after access denial", () => {
	useSnapshot(project(), true);
	const view = render(<DefaultConstructionSpending />);
	expect(screen.getByRole("status")).toHaveTextContent(
		"pēdējie saglabātie projekta dati",
	);
	expect(screen.getByTestId("financial-data")).toBeInTheDocument();
	useSnapshot(project(), false, true);
	view.rerender(<DefaultConstructionSpending />);
	expect(screen.queryByTestId("financial-data")).toBeNull();
});
