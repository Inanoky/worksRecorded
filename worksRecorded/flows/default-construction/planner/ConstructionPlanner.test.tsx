import {
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import {
	loadConstructionDiaryPlans,
	loadConstructionWeek,
	saveConstructionPlanBatch,
} from "@/server/actions/construction-planner";
import { PlannerControls, useConstructionPlanner } from "./ConstructionPlanner";
import { DayPlanToggle, PlanColumnHead, PlanOnlyRow } from "./DayPlan";
import { comparePlans } from "./model";

jest.mock("@/server/actions/construction-planner", () => ({
	loadConstructionWeek: jest.fn(),
	loadConstructionDiaryPlans: jest.fn(),
	saveConstructionPlanBatch: jest.fn(),
	deleteConstructionPlan: jest.fn(),
}));
const siteId = "73bfa5f9-9e49-460e-876e-8d9eb58ba2cb";
const data = {
	start: "2026-09-14",
	today: "2026-09-16",
	options: {
		works: [{ work: "Walls", unit: "m2" }],
		locations: ["Floor"],
		units: ["m2"],
	},
	plans: [
		{
			id: "past",
			date: "2026-09-15",
			work: "Walls",
			location: "Floor",
			unit: "m2",
			quantity: 10,
			version: 1,
		},
	],
	actuals: [],
};
function Harness({
	enabled = true,
	revision = 0,
}: {
	enabled?: boolean;
	revision?: number;
}) {
	const planner = useConstructionPlanner(siteId, enabled, revision);
	if (!enabled) return <p>Other flow</p>;
	return (
		<>
			<PlannerControls
				planner={planner}
				onCatalogChanged={() => {}}
				onShow={() => {}}
			/>
			{["2026-09-15", "2026-09-16"].map((date) => (
				<article key={date} aria-label={date}>
					<DayPlanToggle
						date={date}
						checked={planner.showDay(date)}
						onChange={(value) => planner.setShowDay(date, value)}
					/>
					<table>
						<thead>
							<tr>
								<th>Laiks</th>
								{planner.showDay(date) ? (
									<PlanColumnHead field="Works" />
								) : null}
								<th>Darbi</th>
								{planner.showDay(date) ? (
									<PlanColumnHead field="Amounts" />
								) : null}
								<th>Daudzums</th>
								<th>Darbība</th>
								<th>Avots</th>
							</tr>
						</thead>
						<tbody>
							{planner.showDay(date)
								? planner.diaryRows
										.filter((row) => row.date === date)
										.map((row) => (
											<PlanOnlyRow
												key={row.key}
												row={row}
												fields={["Works", "Amounts"]}
												bisEnabled={false}
											/>
										))
								: null}
						</tbody>
					</table>
				</article>
			))}
		</>
	);
}
describe("construction planner interface", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		jest.mocked(loadConstructionWeek).mockResolvedValue(data);
		jest
			.mocked(loadConstructionDiaryPlans)
			.mockResolvedValue(comparePlans(data.plans, [], data.today));
		jest
			.mocked(saveConstructionPlanBatch)
			.mockResolvedValue({ ok: false, error: "Save failed" });
	});
	it("does not load planning data or expose it to disabled flows", () => {
		render(<Harness enabled={false} />);
		expect(loadConstructionWeek).not.toHaveBeenCalled();
		expect(
			screen.queryByRole("button", { name: "Plāns" }),
		).not.toBeInTheDocument();
		expect(loadConstructionWeek).not.toHaveBeenCalled();
		expect(loadConstructionDiaryPlans).not.toHaveBeenCalled();
	});
	it("prefetches once and toggles cached plans instantly without server requests", async () => {
		render(<Harness />);
		await waitFor(() =>
			expect(loadConstructionDiaryPlans).toHaveBeenCalledTimes(1),
		);
		await waitFor(() =>
			expect(screen.queryByText("Walls")).not.toBeInTheDocument(),
		);
		const toggle = screen.getByRole("checkbox", { name: "Rādīt plānu" });
		fireEvent.click(toggle);
		expect(screen.getByText("Walls")).toBeInTheDocument();
		fireEvent.click(toggle);
		expect(screen.queryByText("Walls")).not.toBeInTheDocument();
		fireEvent.click(
			screen.getByRole("checkbox", { name: "Rādīt plānu 2026-09-15" }),
		);
		expect(screen.getByText("Walls")).toBeInTheDocument();
		expect(loadConstructionDiaryPlans).toHaveBeenCalledTimes(1);
	});
	it("refreshes the expanded card after actual diary records change", async () => {
		const view = render(<Harness />);
		fireEvent.click(
			screen.getByRole("checkbox", { name: "Rādīt plānu 2026-09-15" }),
		);
		await screen.findByText("Walls");
		expect(
			screen.getByRole("row", { name: "Plāns nav sasniegts" }),
		).toHaveClass("bg-red-50");
		jest.mocked(loadConstructionDiaryPlans).mockResolvedValue(
			comparePlans(
				data.plans,
				[
					{
						id: "actual",
						date: "2026-09-15",
						work: "Walls",
						location: "Floor",
						unit: "m2",
						quantity: 12,
						comments: "",
					},
				],
				data.today,
			),
		);
		view.rerender(<Harness revision={1} />);
		await waitFor(() =>
			expect(screen.getByRole("row", { name: "Plāns pārsniegts" })).toHaveClass(
				"bg-green-50",
			),
		);
		expect(loadConstructionDiaryPlans).toHaveBeenCalledTimes(2);
	});
	it("shows paired columns and unmatched plans when enabled", async () => {
		render(<Harness />);
		const card = screen.getByRole("article", { name: "2026-09-15" });
		const table = within(card).getByRole("table");
		fireEvent.click(screen.getByRole("checkbox", { name: "Rādīt plānu" }));
		await within(card).findByText("Walls");
		expect(
			within(card).getByRole("columnheader", { name: "Daudzums (plāns)" }),
		).toBeInTheDocument();
		const row = within(table).getByText("Walls").closest("tr");
		expect(row).toHaveClass("bg-red-50");
		if (!row) throw new Error("Missing comparison row");
		expect(within(row).getByText("Plāns nav sasniegts")).toBeInTheDocument();
		fireEvent.click(screen.getByRole("checkbox", { name: "Rādīt plānu" }));
		expect(table).toBeInTheDocument();
		expect(
			within(card).queryByRole("columnheader", { name: "Plānotie darbi" }),
		).not.toBeInTheDocument();
	});
	it("expands only the selected card and supports local overrides of the global checkbox", async () => {
		render(<Harness />);
		const first = screen.getByRole("article", { name: "2026-09-15" });
		const second = screen.getByRole("article", { name: "2026-09-16" });
		fireEvent.click(within(first).getByRole("checkbox"));
		await within(first).findByText("Walls");
		expect(
			within(second).queryByRole("columnheader", { name: "Plānotie darbi" }),
		).not.toBeInTheDocument();
		fireEvent.click(screen.getByRole("checkbox", { name: "Rādīt plānu" }));
		expect(
			within(second).getByRole("columnheader", { name: "Plānotie darbi" }),
		).toBeInTheDocument();
		fireEvent.click(within(first).getByRole("checkbox"));
		expect(
			within(first).queryByRole("columnheader", { name: "Plānotie darbi" }),
		).not.toBeInTheDocument();
		expect(
			within(second).getByRole("columnheader", { name: "Plānotie darbi" }),
		).toBeInTheDocument();
		fireEvent.click(screen.getByRole("checkbox", { name: "Rādīt plānu" }));
		expect(
			screen.queryByRole("columnheader", { name: "Plānotie darbi" }),
		).not.toBeInTheDocument();
	});
	it("locks past rows and retains the form on a failed save", async () => {
		render(<Harness />);
		fireEvent.click(screen.getByRole("button", { name: "Plāns" }));
		await screen.findByText("Bloķēts");
		expect(
			screen.queryByRole("button", { name: "Rediģēt" }),
		).not.toBeInTheDocument();
		fireEvent.change(screen.getByLabelText("Datums", { exact: true }), {
			target: { value: "2026-09-17" },
		});
		fireEvent.change(screen.getByLabelText("Darbs", { exact: true }), {
			target: { value: "Walls" },
		});
		expect(screen.getByLabelText("Mērvienība", { exact: true })).toHaveValue(
			"m2",
		);
		fireEvent.change(screen.getByLabelText("Lokācija", { exact: true }), {
			target: { value: "New floor" },
		});
		fireEvent.change(
			screen.getByLabelText("Daudzums (plāns)", { exact: true }),
			{ target: { value: "12,5" } },
		);
		fireEvent.click(screen.getByRole("button", { name: "Saglabāt" }));
		expect(await screen.findByRole("alert")).toHaveTextContent("Save failed");
		expect(saveConstructionPlanBatch).toHaveBeenCalledWith({
			siteId,
			week: "2026-09-14",
			deleted: [],
			changes: [
				{
					date: "2026-09-17",
					work: "Walls",
					location: "New floor",
					unit: "m2",
					quantity: 12.5,
				},
			],
		});
		expect(screen.getByLabelText("Lokācija", { exact: true })).toHaveValue(
			"New floor",
		);
		expect(
			screen.getByRole("button", { name: "Nākamā nedēļa" }),
		).toBeDisabled();
		fireEvent.click(screen.getByRole("button", { name: "Atcelt izmaiņas" }));
		await waitFor(() =>
			expect(screen.getByRole("button", { name: "Aizvērt" })).toBeEnabled(),
		);
	});
	it("stages multiple additions, edits and deletes locally until one Save", async () => {
		const future = { ...data.plans[0], id: "existing", date: "2026-09-17" };
		jest
			.mocked(loadConstructionWeek)
			.mockResolvedValue({ ...data, plans: [future] });
		render(<Harness />);
		fireEvent.click(screen.getByRole("button", { name: "Plāns" }));
		await screen.findByRole("button", { name: "Rediģēt" });
		fireEvent.click(screen.getByRole("button", { name: "Rediģēt" }));
		fireEvent.change(
			screen.getByLabelText("Daudzums (plāns)", { exact: true }),
			{ target: { value: "20" } },
		);
		fireEvent.click(screen.getByRole("button", { name: "Piemērot izmaiņas" }));
		expect(screen.getByText(/20 m2/)).toBeInTheDocument();
		fireEvent.change(screen.getByLabelText("Darbs", { exact: true }), {
			target: { value: "New work" },
		});
		fireEvent.change(screen.getByLabelText("Lokācija", { exact: true }), {
			target: { value: "Roof" },
		});
		fireEvent.change(screen.getByLabelText("Mērvienība", { exact: true }), {
			target: { value: "gab" },
		});
		fireEvent.change(
			screen.getByLabelText("Daudzums (plāns)", { exact: true }),
			{ target: { value: "5" } },
		);
		fireEvent.click(screen.getByRole("button", { name: "Pievienot plānam" }));
		expect(screen.getByText(/5 gab/)).toBeInTheDocument();
		const workInput = screen.getByLabelText("Darbs", { exact: true });
		const list = document.getElementById(workInput.getAttribute("list") ?? "");
		expect(list?.querySelector('option[value="New work"]')).toBeTruthy();
		fireEvent.click(screen.getAllByRole("button", { name: "Dzēst" })[0]);
		expect(screen.queryByText(/20 m2/)).not.toBeInTheDocument();
		expect(saveConstructionPlanBatch).not.toHaveBeenCalled();
		expect(loadConstructionWeek).toHaveBeenCalledTimes(1);
		fireEvent.click(screen.getByRole("button", { name: "Saglabāt" }));
		await screen.findByText("Save failed");
		expect(saveConstructionPlanBatch).toHaveBeenCalledTimes(1);
		expect(saveConstructionPlanBatch).toHaveBeenCalledWith({
			siteId,
			week: "2026-09-14",
			deleted: [{ id: "existing", version: 1 }],
			changes: [
				{
					date: "2026-09-17",
					work: "New work",
					location: "Roof",
					unit: "gab",
					quantity: 5,
				},
			],
		});
		expect(screen.getByText(/5 gab/)).toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "Atcelt izmaiņas" }));
		expect(screen.queryByText(/5 gab/)).not.toBeInTheDocument();
		expect(screen.getByText(/10 m2/)).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Aizvērt" })).toBeEnabled();
		expect(loadConstructionWeek).toHaveBeenCalledTimes(1);
	});
	it("saves a staged batch and clears pending state on success", async () => {
		jest.mocked(saveConstructionPlanBatch).mockResolvedValue({ ok: true });
		jest.mocked(loadConstructionWeek).mockResolvedValue({
			...data,
			plans: [{ ...data.plans[0], date: "2026-09-17" }],
		});
		render(<Harness />);
		fireEvent.click(screen.getByRole("button", { name: "Plāns" }));
		fireEvent.click(await screen.findByRole("button", { name: "Dzēst" }));
		expect(saveConstructionPlanBatch).not.toHaveBeenCalled();
		jest.mocked(loadConstructionWeek).mockResolvedValue({ ...data, plans: [] });
		fireEvent.click(screen.getByRole("button", { name: "Saglabāt" }));
		await waitFor(() =>
			expect(screen.getByRole("button", { name: "Aizvērt" })).toBeEnabled(),
		);
		expect(screen.getByText("Šai nedēļai nav plāna.")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Saglabāt" })).toBeDisabled();
		expect(loadConstructionWeek).toHaveBeenCalledTimes(2);
	});
});
